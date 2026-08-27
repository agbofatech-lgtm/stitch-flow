import { db } from '../../db/database';
import type { SyncQueueRecord } from '../../db/schema';

/**
 * Durable sync queue manager (§15–§18).
 *
 * States: pending -> processing -> synced | failed
 * - retryable failures: bounded exponential backoff via nextRetryAt
 * - permanent failures: status 'failed' (never retried automatically)
 * - stale 'processing' rows (crash/tab-close) are recovered to 'pending';
 *   server idempotency (clientMutationId) makes the retry safe even if the
 *   original request actually succeeded (§17).
 */
export const MAX_RETRIES = 8;
export const STALE_PROCESSING_MS = 2 * 60 * 1000;

export function backoffMs(retryCount: number) {
  // 1s, 2s, 4s ... capped at 5 minutes
  return Math.min(1000 * 2 ** retryCount, 5 * 60 * 1000);
}

function nowIso() {
  return new Date().toISOString();
}

/** Rows eligible for submission right now (pending and past nextRetryAt). */
export async function duePending(workspaceId: string, now = new Date()): Promise<SyncQueueRecord[]> {
  const rows = await db.syncQueue
    .where('[workspaceId+status]')
    .equals([workspaceId, 'pending'])
    .toArray();
  return rows
    .filter((row) => !row.nextRetryAt || new Date(row.nextRetryAt) <= now)
    .sort((a, b) => (a.id! < b.id! ? -1 : 1)); // FIFO by insertion order
}

export async function markProcessing(item: SyncQueueRecord) {
  await db.syncQueue.update(item.id!, {
    status: 'processing',
    processingStartedAt: nowIso(),
    lastAttemptAt: nowIso(),
    updatedAt: nowIso(),
  });
}

export async function markSynced(item: SyncQueueRecord) {
  await db.syncQueue.update(item.id!, {
    status: 'synced',
    processingStartedAt: null,
    lastError: null,
    updatedAt: nowIso(),
  });
}

export async function markRetryable(item: SyncQueueRecord, error: string) {
  const retryCount = item.retryCount + 1;
  if (retryCount > MAX_RETRIES) {
    return markFailed(item, `retries exhausted: ${error}`);
  }
  await db.syncQueue.update(item.id!, {
    status: 'pending',
    retryCount,
    processingStartedAt: null,
    nextRetryAt: new Date(Date.now() + backoffMs(retryCount)).toISOString(),
    lastError: error,
    updatedAt: nowIso(),
  });
}

export async function markFailed(item: SyncQueueRecord, error: string) {
  await db.syncQueue.update(item.id!, {
    status: 'failed',
    processingStartedAt: null,
    lastError: error,
    updatedAt: nowIso(),
  });
}

/**
 * Crash recovery (§17): anything stuck in 'processing' longer than the
 * threshold returns to 'pending' WITHOUT changing its clientMutationId.
 */
export async function recoverStaleProcessing(
  workspaceId: string,
  staleMs = STALE_PROCESSING_MS,
  now = Date.now()
): Promise<number> {
  const rows = await db.syncQueue
    .where('[workspaceId+status]')
    .equals([workspaceId, 'processing'])
    .toArray();

  let recovered = 0;
  for (const row of rows) {
    const startedAt = row.processingStartedAt ? new Date(row.processingStartedAt).getTime() : 0;
    if (!startedAt || now - startedAt >= staleMs) {
      await db.syncQueue.update(row.id!, {
        status: 'pending',
        processingStartedAt: null,
        updatedAt: nowIso(),
      });
      recovered += 1;
    }
  }
  return recovered;
}

export async function queueCounts(workspaceId: string) {
  const count = (status: SyncQueueRecord['status']) =>
    db.syncQueue.where('[workspaceId+status]').equals([workspaceId, status]).count();
  return {
    pending: await count('pending'),
    processing: await count('processing'),
    synced: await count('synced'),
    failed: await count('failed'),
  };
}
