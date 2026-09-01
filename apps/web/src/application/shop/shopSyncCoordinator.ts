import { getDataAuthorityRuntime } from '../../shared/persistence/bootstrap';
import { shopSyncTransport, pullShopChanges, getShopSyncSession } from './shopSyncTransport';

const CURSOR_ENTITY = 'workspace' as const;
const CURSOR_ID = 'sac5-shop-cursor';

export async function runShopSyncCycle() {
  const runtime = getDataAuthorityRuntime();
  if (!runtime) return { pushed: false, pulled: false, reason: 'no-runtime' };
  if (!getShopSyncSession()?.accessToken) {
    return { pushed: false, pulled: false, reason: 'blocked_auth' };
  }

  runtime.syncEngine.setTransport(shopSyncTransport);

  const ops = await runtime.store.listOperations();
  for (const op of ops) {
    if (op.status === 'blocked_auth') {
      await runtime.store.putOperation({ ...op, status: 'pending' });
    }
  }

  await runtime.syncEngine.processQueue();

  const cursorRow = await runtime.store.getRecord(CURSOR_ENTITY, CURSOR_ID);
  const cursor = String((cursorRow?.payload as { cursor?: string } | undefined)?.cursor || '0');
  const pulled = await pullShopChanges(cursor);
  const changes = pulled.changes || [];
  for (const change of changes) {
    const entityType = String(change.entityType || '');
    const entityId = String(change.entityId || '');
    if (!entityId) continue;
    const mapped =
      entityType === 'customer'
        ? 'customer'
        : entityType === 'trusted_artifact'
          ? 'trustedArtifact'
          : 'order';
    const existing = await runtime.store.getRecord(mapped, entityId);
    if (existing && (existing.metadata.syncStatus === 'pending' || existing.metadata.syncStatus === 'syncing')) {
      continue;
    }
    if (existing && existing.metadata.version > Number(change.version || 0)) {
      await runtime.store.putRecord({
        ...existing,
        metadata: { ...existing.metadata, syncStatus: 'conflict' },
      });
      continue;
    }
    await runtime.store.putRecord({
      entity: mapped,
      payload: (change.payload as Record<string, unknown>) || {},
      metadata: {
        localId: entityId,
        remoteId: entityId,
        version: Number(change.version || 1),
        createdAt: String(change.occurredAt || new Date().toISOString()),
        updatedAt: String(change.occurredAt || new Date().toISOString()),
        syncStatus: change.operationType === 'delete' ? 'deleted' : 'synced',
        tombstone: change.operationType === 'delete' ? true : undefined,
        lastSyncedAt: new Date().toISOString(),
      },
    });
  }
  await runtime.store.putRecord({
    entity: CURSOR_ENTITY,
    payload: { cursor: String(pulled.nextCursor || cursor) },
    metadata: {
      localId: CURSOR_ID,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    },
  });
  return { pushed: true, pulled: true, changeCount: changes.length, nextCursor: pulled.nextCursor };
}
