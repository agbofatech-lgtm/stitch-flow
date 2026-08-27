import { db } from '../../db/database';
import { ENTITY_TABLE_MAP, type SyncQueueRecord } from '../../db/schema';
import { getSyncMeta, updateSyncMeta, getSyncDiagnostics } from '../../db/syncMeta';
import { isEventLaneEntity } from '../repositories/local/LocalRepository';
import {
  duePending,
  markProcessing,
  markSynced,
  markRetryable,
  markFailed,
  recoverStaleProcessing,
} from './syncQueue';
import {
  API_BASE,
  getAuthHeaders,
  getAccessToken,
  refreshAuthTokens,
} from '../../shared/utils/api';

/** Thrown when authentication cannot be recovered: sync pauses, queue survives (§35). */
export class SyncAuthError extends Error {
  constructor() {
    super('authentication expired — sync paused, queue preserved');
    this.name = 'SyncAuthError';
  }
}

/**
 * Fetch with 401 handling (§19): one coordinated refresh (serialized inside
 * refreshAuthTokens), then a single retry of the SAME request. Refresh
 * failure raises SyncAuthError; queued mutations are never discarded.
 */
async function authFetch(fetchImpl: FetchLike, input: string, init: RequestInit): Promise<Response> {
  const res = await fetchImpl(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...getAuthHeaders() },
  });
  if (res.status !== 401) return res;

  const refreshed = await refreshAuthTokens(fetchImpl);
  if (!refreshed) throw new SyncAuthError();

  return fetchImpl(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...getAuthHeaders() },
  });
}

/**
 * StitchFlow client sync engine (Phase 3.5).
 *
 * Speaks the EXISTING Phase 3 server protocol (read from the backend
 * source, not guessed):
 *   - POST /sync/mutations  { mutations: [...] } -> 207 { results }
 *   - POST /payments        (+clientMutationId)  -> 201 / 200 duplicate
 *   - POST /materials/usages(+clientMutationId)  -> 201 / 200 duplicate / 409
 *   - GET  /sync/changes?cursor&limit -> { changes, nextCursor, hasMore }
 *
 * Invariants:
 *   - single-flight: concurrent syncNow() calls share one run (§30, §43)
 *   - cursor NEVER advances before the delta batch commits locally (§11)
 *   - clientMutationId is stable across retries; server idempotency is
 *     authoritative (§14, §17)
 *   - financial/inventory mutations go to their transactional event
 *     endpoints; the server remains authoritative (§24–§27)
 */

export type SyncResult = {
  ok: boolean;
  pushed: number;
  duplicates: number;
  failed: number;
  pulled: number;
  cursor: string;
  error: string | null;
  skipped?: boolean;
};

const DELTA_LIMIT = 200;

type FetchLike = typeof fetch;

function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

async function postJson(fetchImpl: FetchLike, path: string, body: unknown) {
  return authFetch(fetchImpl, `${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** Routes one queue item to the correct server lane. Returns final state. */
async function submitQueueItem(
  fetchImpl: FetchLike,
  item: SyncQueueRecord
): Promise<'synced' | 'duplicate' | 'retry' | 'failed'> {
  if (isEventLaneEntity(item.entity)) {
    const path = item.entity === 'payments' ? '/payments' : '/materials/usages';
    const res = await postJson(fetchImpl, path, {
      ...item.payload,
      clientMutationId: item.clientMutationId,
    });
    if (res.status === 201) return 'synced';
    if (res.status === 200) return 'duplicate'; // server acknowledged prior success
    if (isRetryableStatus(res.status)) return 'retry';
    return 'failed'; // 400 overpay, 404 tenancy, 409 stock, 422 — server rule
  }

  const res = await postJson(fetchImpl, '/sync/mutations', {
    mutations: [
      {
        clientMutationId: item.clientMutationId,
        entity: item.entity,
        entityId: item.entityId,
        operation: item.operation,
        payload: item.payload,
        occurredAt: item.occurredAt,
      },
    ],
  });

  if (res.status === 207) {
    const body = await res.json();
    const result = body.results?.[0];
    if (result?.status === 'applied') return 'synced';
    if (result?.status === 'duplicate') return 'duplicate';
    return 'failed'; // rejected (e.g., USE_EVENT_ENDPOINT)
  }
  if (isRetryableStatus(res.status)) return 'retry';
  return 'failed';
}

/**
 * Applies one delta batch + the new cursor in ONE IndexedDB transaction.
 * If anything throws, Dexie aborts the transaction: no partial rows, cursor
 * unchanged (§11, §42).
 */
export async function applyDeltaBatch(
  workspaceId: string,
  changes: Array<{
    seq: string;
    entity: string;
    entityId: string;
    operation: string;
    payload: Record<string, unknown> | null;
  }>,
  nextCursor: string
) {
  const tables = [
    db.customers,
    db.orders,
    db.measurementProfiles,
    db.invoices,
    db.payments,
    db.fabrics,
    db.materialUsages,
    db.productionStages,
    db.settings,
    db.syncMeta,
  ];

  await db.transaction('rw', tables, async () => {
    for (const change of changes) {
      const tableName = ENTITY_TABLE_MAP[change.entity];
      if (!tableName) continue; // unknown entity: ignore, but cursor still advances past it
      const table = db.table(tableName);

      if (change.operation === 'delete') {
        // Tombstone (§22–§23): mark, never physically remove.
        const existing = await table.get(change.entityId);
        const deletedAt =
          (change.payload?.deletedAt as string | undefined) || new Date().toISOString();
        await table.put({
          ...(existing || {}),
          id: change.entityId,
          workspaceId,
          deletedAt,
        });
        continue;
      }

      const existing = await table.get(change.entityId);
      // Anti-resurrection rule: a tombstoned local record is only revived if
      // the server change explicitly clears deletedAt.
      if (existing?.deletedAt && !('deletedAt' in (change.payload || {}))) {
        continue;
      }

      await table.put({
        ...(existing || {}),
        ...(change.payload || {}),
        id: change.entityId,
        workspaceId,
        deletedAt: (change.payload?.deletedAt as string | null | undefined) ?? null,
      });
    }

    // Cursor write participates in the SAME transaction (§11).
    const meta = await db.syncMeta.get(`workspace:${workspaceId}`);
    await db.syncMeta.put({
      key: `workspace:${workspaceId}`,
      workspaceId,
      currentCursor: nextCursor,
      lastSuccessfulSync: meta?.lastSuccessfulSync ?? null,
      lastAttemptedSync: meta?.lastAttemptedSync ?? null,
      lastSyncError: null,
      schemaVersion: meta?.schemaVersion ?? 0,
    });
  });
}

/** Pull all deltas after the persisted cursor, batch by batch (§21). */
export async function pullDeltaChanges(
  workspaceId: string,
  fetchImpl: FetchLike = fetch
): Promise<{ pulled: number; cursor: string }> {
  let pulled = 0;
  let meta = await getSyncMeta(workspaceId);
  let hasMore = true;

  while (hasMore) {
    const res = await authFetch(
      fetchImpl,
      `${API_BASE}/sync/changes?cursor=${encodeURIComponent(meta.currentCursor)}&limit=${DELTA_LIMIT}`,
      {}
    );
    if (!res.ok) {
      throw new Error(`delta pull failed: HTTP ${res.status}`);
    }
    const body = await res.json();
    const changes = body.changes ?? [];

    if (changes.length > 0) {
      await applyDeltaBatch(workspaceId, changes, body.nextCursor);
      pulled += changes.length;
    }
    hasMore = Boolean(body.hasMore) && changes.length > 0;
    meta = await getSyncMeta(workspaceId);
  }

  return { pulled, cursor: meta.currentCursor };
}

/** Drain the local queue against the server (§15–§18, §24–§26). */
export async function processQueue(
  workspaceId: string,
  fetchImpl: FetchLike = fetch
): Promise<{ pushed: number; duplicates: number; failed: number }> {
  await recoverStaleProcessing(workspaceId);

  let pushed = 0;
  let duplicates = 0;
  let failed = 0;

  const items = await duePending(workspaceId);
  for (const item of items) {
    await markProcessing(item);
    try {
      const outcome = await submitQueueItem(fetchImpl, item);
      if (outcome === 'synced') {
        await markSynced(item);
        pushed += 1;
      } else if (outcome === 'duplicate') {
        await markSynced(item);
        duplicates += 1;
      } else if (outcome === 'retry') {
        await markRetryable(item, 'retryable server/network error');
      } else {
        await markFailed(item, 'permanently rejected by server');
        failed += 1;
      }
    } catch (err) {
      if (err instanceof SyncAuthError) {
        // return the item to pending untouched and pause the whole run
        await markRetryable(item, err.message);
        throw err;
      }
      // network failure / timeout: retryable, queue survives (§18, §29)
      await markRetryable(item, err instanceof Error ? err.message : 'network error');
    }
  }

  return { pushed, duplicates, failed };
}

let inFlight: Promise<SyncResult> | null = null;

/**
 * Single-flight synchronization entry point (§30–§31, §43).
 * Concurrent callers receive the SAME in-progress run.
 * Uses the Web Locks API when available for cross-tab coordination (§28).
 */
export function syncNow(
  workspaceId: string,
  fetchImpl: FetchLike = fetch
): Promise<SyncResult> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<SyncResult> => {
    const run = () => runSync(workspaceId, fetchImpl);
    try {
      const locks = (globalThis.navigator as any)?.locks;
      if (locks?.request) {
        return await locks.request('stitchflow-sync', run);
      }
      return await run();
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

async function runSync(workspaceId: string, fetchImpl: FetchLike): Promise<SyncResult> {
  await updateSyncMeta(workspaceId, { lastAttemptedSync: new Date().toISOString() });

  // Auth-aware (§19, §35): without a token, pause — queue stays intact.
  if (!getAccessToken()) {
    const meta = await getSyncMeta(workspaceId);
    return {
      ok: false,
      skipped: true,
      pushed: 0,
      duplicates: 0,
      failed: 0,
      pulled: 0,
      cursor: meta.currentCursor,
      error: 'not authenticated — sync paused, queue preserved',
    };
  }

  try {
    const pushStats = await processQueue(workspaceId, fetchImpl);
    const pullStats = await pullDeltaChanges(workspaceId, fetchImpl);

    await updateSyncMeta(workspaceId, {
      lastSuccessfulSync: new Date().toISOString(),
      lastSyncError: null,
    });

    return {
      ok: true,
      ...pushStats,
      pulled: pullStats.pulled,
      cursor: pullStats.cursor,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'sync failed';
    await updateSyncMeta(workspaceId, { lastSyncError: message });
    const meta = await getSyncMeta(workspaceId);
    return {
      ok: false,
      pushed: 0,
      duplicates: 0,
      failed: 0,
      pulled: 0,
      cursor: meta.currentCursor,
      error: message,
    };
  }
}

export { getSyncDiagnostics };
