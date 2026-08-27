import { db } from './database';
import type { PersistedAppData } from '../shared/lib/seedData';

/**
 * Write-through bridge (Phase 3.5 integration).
 *
 * The existing UI state (AppContext) persists via localStorage. This bridge
 * mirrors every saved snapshot into IndexedDB so the durable offline store
 * stays current without touching any UI component. Mirroring is
 * fire-and-forget and debounced; it never queues sync mutations (REST flows
 * own their server writes), so there is no double-posting risk.
 */
let pending: { workspaceId: string; data: PersistedAppData } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  if (!pending) return;
  const { workspaceId, data } = pending;
  pending = null;

  const stamp = (rows: Array<Record<string, unknown>> | undefined) =>
    (rows || [])
      .filter((row) => typeof row.id === 'string')
      .map((row) => ({ ...row, id: row.id as string, workspaceId, deletedAt: (row as any).deletedAt ?? null }));

  try {
    await db.transaction(
      'rw',
      [db.customers, db.orders, db.invoices, db.payments, db.fabrics, db.materialUsages, db.measurementProfiles],
      async () => {
        await db.customers.bulkPut(stamp(data.customers as never));
        await db.orders.bulkPut(stamp(data.orders as never));
        await db.invoices.bulkPut(stamp(data.invoices as never));
        await db.payments.bulkPut(stamp(data.payments as never));
        await db.fabrics.bulkPut(stamp(data.fabricRecords as never));
        await db.materialUsages.bulkPut(stamp(data.materialUsages as never));
        await db.measurementProfiles.bulkPut(stamp(data.measurementProfiles as never));
      }
    );
  } catch {
    // mirroring must never break the UI save path
  }
}

export function mirrorSnapshotToIndexedDb(data: PersistedAppData) {
  const workspaceId = data.currentWorkspaceId || 'default-workspace';
  pending = { workspaceId, data };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, 250);
}

/** Test hook: force the debounced mirror to flush immediately. */
export async function flushMirrorForTests() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  await flush();
}
