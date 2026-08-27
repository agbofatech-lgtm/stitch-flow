import { db } from './database';
import { getSyncMeta, updateSyncMeta } from './syncMeta';
import { STORAGE_KEYS } from '../shared/lib/storageKeys';
import { deserializeFromStorage } from '../shared/lib/serializers';

/**
 * Legacy localStorage -> IndexedDB migration (§34).
 *
 * Safety properties:
 * - idempotent: runs once per workspace (guarded by a syncMeta flag row);
 * - non-destructive: localStorage is READ but never cleared here;
 * - never overwrites newer IndexedDB data (skips ids that already exist).
 */
const MIGRATION_FLAG_PREFIX = 'migration:localStorage:';

type LegacyCollection = {
  storageKey: string;
  table:
    | 'customers'
    | 'orders'
    | 'invoices'
    | 'payments'
    | 'fabrics'
    | 'materialUsages'
    | 'measurementProfiles';
};

const LEGACY_COLLECTIONS: LegacyCollection[] = [
  { storageKey: STORAGE_KEYS.customers, table: 'customers' },
  { storageKey: STORAGE_KEYS.orders, table: 'orders' },
  { storageKey: STORAGE_KEYS.invoices, table: 'invoices' },
  { storageKey: STORAGE_KEYS.payments, table: 'payments' },
  { storageKey: STORAGE_KEYS.fabricRecords, table: 'fabrics' },
  { storageKey: STORAGE_KEYS.materialUsages, table: 'materialUsages' },
  { storageKey: STORAGE_KEYS.measurementProfiles, table: 'measurementProfiles' },
];

function readLegacyArray(storageKey: string): Array<Record<string, unknown>> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = deserializeFromStorage<unknown>(raw);
    return Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>) : [];
  } catch {
    return [];
  }
}

export async function migrateLocalStorageToIndexedDb(workspaceId: string): Promise<{
  migrated: number;
  skippedExisting: number;
  alreadyMigrated: boolean;
}> {
  const flagKey = `${MIGRATION_FLAG_PREFIX}${workspaceId}`;
  const existingFlag = await db.syncMeta.get(flagKey);
  if (existingFlag) {
    return { migrated: 0, skippedExisting: 0, alreadyMigrated: true };
  }

  let migrated = 0;
  let skippedExisting = 0;

  await db.transaction(
    'rw',
    [
      db.customers,
      db.orders,
      db.invoices,
      db.payments,
      db.fabrics,
      db.materialUsages,
      db.measurementProfiles,
      db.syncMeta,
    ],
    async () => {
      for (const { storageKey, table } of LEGACY_COLLECTIONS) {
        const rows = readLegacyArray(storageKey);
        for (const row of rows) {
          const id = typeof row.id === 'string' ? row.id : null;
          if (!id) continue;
          const target = db.table(table);
          const already = await target.get(id);
          if (already) {
            skippedExisting += 1; // never overwrite newer IndexedDB data
            continue;
          }
          await target.put({ ...row, id, workspaceId, deletedAt: null });
          migrated += 1;
        }
      }

      await db.syncMeta.put({
        key: flagKey,
        workspaceId,
        currentCursor: '0',
        lastSuccessfulSync: null,
        lastAttemptedSync: null,
        lastSyncError: null,
        schemaVersion: 0,
      });
    }
  );

  // ensure the workspace meta row exists after first migration
  await getSyncMeta(workspaceId);
  await updateSyncMeta(workspaceId, {});

  return { migrated, skippedExisting, alreadyMigrated: false };
}
