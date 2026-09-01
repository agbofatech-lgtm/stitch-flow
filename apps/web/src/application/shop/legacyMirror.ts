/**
 * SAC-2 additive projection: legacy AppContext records → T2 local mirror.
 * Never deletes localStorage. Never enqueues remote sync. Frozen records are not overwritten.
 */

import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import type { Repositories } from '../../shared/persistence/repository';
import { loadAppStorage } from '../../shared/lib/db';
import {
  DESIGN_KIND,
  FABRIC_KIND,
  LIVE_PROFILE_KIND,
  SHOP_ORDER_KIND,
} from './shopAuthority';

export type ShopMirrorSlice = {
  fabricRecords?: unknown;
  designInspirations?: unknown;
  measurementProfiles?: unknown;
  orders?: unknown;
};

export type ShopMirrorReport = {
  projected: number;
  skippedCorrupt: number;
  skippedFrozen: number;
  skippedNoRuntime: boolean;
};

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
}

function canonicalId(item: Record<string, unknown>): string | null {
  const id = item.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

export async function projectLegacyShopToT2(
  slice: ShopMirrorSlice,
  repositories?: Repositories
): Promise<ShopMirrorReport> {
  const repos = repositories || getDataAuthorityRuntime()?.repositories;
  if (!repos) {
    return { projected: 0, skippedCorrupt: 0, skippedFrozen: 0, skippedNoRuntime: true };
  }

  let projected = 0;
  let skippedCorrupt = 0;
  let skippedFrozen = 0;

  async function put(
    repo: Repositories[keyof Repositories],
    kind: string,
    items: unknown
  ) {
    for (const item of asRecordArray(items)) {
      const id = canonicalId(item);
      if (!id) {
        skippedCorrupt += 1;
        continue;
      }
      const existing = await repo.get(id);
      if (existing?.payload && (existing.payload as { frozen?: unknown }).frozen === true) {
        skippedFrozen += 1;
        continue;
      }
      await repo.putLocalCanonical({ kind, record: item }, id);
      projected += 1;
    }
  }

  await put(repos.material, FABRIC_KIND, slice.fabricRecords);
  await put(repos.design, DESIGN_KIND, slice.designInspirations);
  await put(repos.measurement, LIVE_PROFILE_KIND, slice.measurementProfiles);
  await put(repos.order, SHOP_ORDER_KIND, slice.orders);

  return { projected, skippedCorrupt, skippedFrozen, skippedNoRuntime: false };
}

export async function projectLegacyShopFromStorage(repositories?: Repositories) {
  try {
    const data = loadAppStorage();
    return projectLegacyShopToT2(
      {
        fabricRecords: data.fabricRecords,
        designInspirations: data.designInspirations,
        measurementProfiles: data.measurementProfiles,
        orders: data.orders,
      },
      repositories
    );
  } catch {
    return {
      projected: 0,
      skippedCorrupt: 1,
      skippedFrozen: 0,
      skippedNoRuntime: !repositories && !getDataAuthorityRuntime(),
    };
  }
}

export async function dualReadById(
  entity: 'material' | 'design' | 'measurement' | 'order',
  id: string,
  legacyItems: unknown
): Promise<{ source: 't2' | 'legacy' | 'missing'; payload: Record<string, unknown> | null }> {
  const runtime = getDataAuthorityRuntime();
  if (runtime) {
    const row = await runtime.repositories[entity].get(id);
    if (row && !row.metadata.tombstone) {
      return { source: 't2', payload: row.payload as Record<string, unknown> };
    }
  }
  const found = asRecordArray(legacyItems).find((item) => item.id === id) || null;
  if (found) return { source: 'legacy', payload: found };
  return { source: 'missing', payload: null };
}
