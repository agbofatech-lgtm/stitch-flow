import { db } from './database';
import { CURRENT_SCHEMA_VERSION, type SyncMetaRecord } from './schema';

/**
 * Persistent per-workspace synchronization metadata (§10).
 * The cursor lives in IndexedDB and therefore survives tab close, browser
 * restart, device restart and offline periods.
 */
export function metaKey(workspaceId: string) {
  return `workspace:${workspaceId}`;
}

export async function getSyncMeta(workspaceId: string): Promise<SyncMetaRecord> {
  const existing = await db.syncMeta.get(metaKey(workspaceId));
  if (existing) return existing;

  const fresh: SyncMetaRecord = {
    key: metaKey(workspaceId),
    workspaceId,
    currentCursor: '0',
    lastSuccessfulSync: null,
    lastAttemptedSync: null,
    lastSyncError: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  await db.syncMeta.put(fresh);
  return fresh;
}

export async function updateSyncMeta(
  workspaceId: string,
  updates: Partial<Omit<SyncMetaRecord, 'key' | 'workspaceId'>>
) {
  const current = await getSyncMeta(workspaceId);
  await db.syncMeta.put({ ...current, ...updates });
}

/** Safe diagnostics for dev/admin use (§32) — never exposes tokens/secrets. */
export async function getSyncDiagnostics(workspaceId: string) {
  const meta = await getSyncMeta(workspaceId);
  const pendingMutations = await db.syncQueue
    .where('[workspaceId+status]')
    .equals([workspaceId, 'pending'])
    .count();
  const failedMutations = await db.syncQueue
    .where('[workspaceId+status]')
    .equals([workspaceId, 'failed'])
    .count();

  return {
    workspaceId,
    currentCursor: meta.currentCursor,
    lastSuccessfulSync: meta.lastSuccessfulSync,
    lastAttemptedSync: meta.lastAttemptedSync,
    lastSyncError: meta.lastSyncError,
    pendingMutations,
    failedMutations,
  };
}
