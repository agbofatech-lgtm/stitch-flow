/**
 * Phase 14 — Design Intelligence client service.
 * Offline-first: network errors degrade gracefully to cached data.
 * Preserves measurement provenance — never mutates Phase 13 data.
 */
import { db } from '../../db/database';
import type { LocalRow } from '../../db/database';
import * as api from '../../shared/api/design';

type ApiInspiration = api.InspirationReference;
type ApiFabricProfile = api.FabricProfile;
type ApiDesignSpec = api.DesignSpecification;

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

async function cacheInspirations(workspaceId: string, items: ApiInspiration[]): Promise<void> {
  try {
    await db.inspirationsV14.bulkPut(items.map((i) => ({ ...i, workspaceId }) as LocalRow));
  } catch { /* cache failure must never break UI */ }
}

async function cacheFabricProfiles(workspaceId: string, items: ApiFabricProfile[]): Promise<void> {
  try {
    await db.fabricProfilesV14.bulkPut(items.map((f) => ({ ...f, workspaceId }) as LocalRow));
  } catch { /* cache failure must never break UI */ }
}

async function cacheDesignSpecs(workspaceId: string, items: ApiDesignSpec[]): Promise<void> {
  try {
    await db.designSpecsV14.bulkPut(items.map((s) => ({ ...s, workspaceId }) as LocalRow));
  } catch { /* cache failure must never break UI */ }
}

// ---------------------------------------------------------------------------
// Inspiration
// ---------------------------------------------------------------------------

export async function listInspirations(
  customerId: string,
  workspaceId: string,
): Promise<ApiInspiration[]> {
  try {
    const list = await api.listInspirations(customerId);
    await cacheInspirations(workspaceId, list);
    return list;
  } catch {
    const rows = await db.inspirationsV14.toArray();
    return rows
      .filter((r) => r['customerId'] === customerId && r['workspaceId'] === workspaceId)
      .map((r) => r as unknown as ApiInspiration);
  }
}

export async function createInspiration(
  customerId: string,
  workspaceId: string,
  data: Omit<ApiInspiration, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt'>,
): Promise<ApiInspiration> {
  const result = await api.createInspiration(customerId, data);
  await cacheInspirations(workspaceId, [result]);
  return result;
}

export async function updateInspiration(
  customerId: string,
  id: string,
  workspaceId: string,
  data: Partial<Omit<ApiInspiration, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt'>>,
): Promise<ApiInspiration> {
  const result = await api.updateInspiration(customerId, id, data);
  await cacheInspirations(workspaceId, [result]);
  return result;
}

export async function deleteInspiration(
  customerId: string,
  id: string,
  workspaceId: string,
): Promise<void> {
  await api.deleteInspiration(customerId, id);
  try { await db.inspirationsV14.delete(id); } catch { /* */ }
  void workspaceId;
}

// ---------------------------------------------------------------------------
// Fabric Profiles
// ---------------------------------------------------------------------------

export async function listFabricProfiles(workspaceId: string): Promise<ApiFabricProfile[]> {
  try {
    const list = await api.listFabricProfiles();
    await cacheFabricProfiles(workspaceId, list);
    return list;
  } catch {
    const rows = await db.fabricProfilesV14.toArray();
    return rows
      .filter((r) => r['workspaceId'] === workspaceId)
      .map((r) => r as unknown as ApiFabricProfile);
  }
}

export async function createFabricProfile(
  workspaceId: string,
  data: Omit<ApiFabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>,
): Promise<ApiFabricProfile> {
  const result = await api.createFabricProfile(data);
  await cacheFabricProfiles(workspaceId, [result]);
  return result;
}

export async function updateFabricProfile(
  id: string,
  workspaceId: string,
  data: Partial<Omit<ApiFabricProfile, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>>,
): Promise<ApiFabricProfile> {
  const result = await api.updateFabricProfile(id, data);
  await cacheFabricProfiles(workspaceId, [result]);
  return result;
}

export async function deleteFabricProfile(id: string): Promise<void> {
  await api.deleteFabricProfile(id);
  try { await db.fabricProfilesV14.delete(id); } catch { /* */ }
}

// ---------------------------------------------------------------------------
// Design Specifications
// ---------------------------------------------------------------------------

export async function listDesignSpecs(
  customerId: string,
  workspaceId: string,
): Promise<ApiDesignSpec[]> {
  try {
    const list = await api.listDesignSpecs(customerId);
    await cacheDesignSpecs(workspaceId, list);
    return list;
  } catch {
    const rows = await db.designSpecsV14.toArray();
    return rows
      .filter((r) => r['customerId'] === customerId && r['workspaceId'] === workspaceId)
      .map((r) => r as unknown as ApiDesignSpec);
  }
}

export async function createDesignSpec(
  customerId: string,
  workspaceId: string,
  data: Partial<Omit<ApiDesignSpec, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt' | 'readiness'>>,
): Promise<ApiDesignSpec> {
  const result = await api.createDesignSpec(customerId, data);
  await cacheDesignSpecs(workspaceId, [result]);
  return result;
}

export async function getDesignSpec(
  customerId: string,
  id: string,
  workspaceId: string,
): Promise<ApiDesignSpec | null> {
  try {
    const spec = await api.getDesignSpec(customerId, id);
    await cacheDesignSpecs(workspaceId, [spec]);
    return spec;
  } catch {
    const row = await db.designSpecsV14.get(id);
    return row ? (row as unknown as ApiDesignSpec) : null;
  }
}

export async function updateDesignSpec(
  customerId: string,
  id: string,
  workspaceId: string,
  data: Partial<Omit<ApiDesignSpec, 'id' | 'workspaceId' | 'customerId' | 'createdAt' | 'updatedAt' | 'readiness'>>,
): Promise<ApiDesignSpec> {
  const result = await api.updateDesignSpec(customerId, id, data);
  await cacheDesignSpecs(workspaceId, [result]);
  return result;
}

export { api };
