import type { LocalStore } from './store';
import type { SyncOperation } from './types';
import { ConnectivityMonitor } from './connectivity';
import { compareVersions, ENTITY_CONFLICT_POLICY, mustNotSilentOverwrite } from './conflict';

export class RemoteAuthorizationBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteAuthorizationBlockedError';
  }
}

export type RemoteTransport = {
  push(op: SyncOperation): Promise<{ remoteId?: string; remoteVersion: number }>;
};

export const blockedBusinessApiTransport: RemoteTransport = {
  async push() {
    throw new RemoteAuthorizationBlockedError(
      'T1 unauthenticated business CRUD is not mounted. Sync remains queued. Do not expose /customers|/orders from T2.'
    );
  },
};

export class SyncEngine {
  constructor(
    private readonly store: LocalStore,
    private readonly connectivity: ConnectivityMonitor,
    private readonly transport: RemoteTransport = blockedBusinessApiTransport
  ) {}

  async processQueue() {
    const operations = (await this.store.listOperations()).filter(
      (op) => op.status === 'pending' || op.status === 'failed'
    );

    this.connectivity.setState('syncing');

    for (const op of operations) {
      const existing = await this.store.getOperation(op.operationId);
      if (!existing || existing.status === 'acked') continue;

      const next: SyncOperation = {
        ...existing,
        status: 'syncing',
        attemptCount: existing.attemptCount + 1,
      };
      await this.store.putOperation(next);

      try {
        const ack = await this.transport.push(next);
        const record = await this.store.getRecord(next.entity, next.entityLocalId);
        if (record) {
          const comparison = compareVersions(record.metadata.version, ack.remoteVersion);
          const policy = ENTITY_CONFLICT_POLICY[next.entity];
          if (comparison.result === 'conflict' && mustNotSilentOverwrite(policy)) {
            await this.store.putRecord({
              ...record,
              metadata: { ...record.metadata, syncStatus: 'conflict' },
            });
            await this.store.putOperation({
              ...next,
              status: 'conflict',
              lastError: 'version conflict — not overwritten',
            });
            continue;
          }
          await this.store.putRecord({
            ...record,
            metadata: {
              ...record.metadata,
              remoteId: ack.remoteId,
              syncStatus: record.metadata.tombstone ? 'deleted' : 'synced',
              lastSyncedAt: new Date().toISOString(),
            },
          });
        }
        await this.store.putOperation({ ...next, status: 'acked' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.store.putOperation({
          ...next,
          status: 'failed',
          lastError: message,
        });
        const record = await this.store.getRecord(next.entity, next.entityLocalId);
        if (record && record.metadata.syncStatus !== 'conflict') {
          await this.store.putRecord({
            ...record,
            metadata: { ...record.metadata, syncStatus: 'failed' },
          });
        }
      }
    }

    await this.connectivity.refresh();
  }
}
