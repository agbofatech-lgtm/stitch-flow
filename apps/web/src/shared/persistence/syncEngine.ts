import type { LocalStore } from './store';
import type { SyncOperation } from './types';
import { ConnectivityMonitor } from './connectivity';
import { compareVersions, ENTITY_CONFLICT_POLICY, mustNotSilentOverwrite } from './conflict';
import { mergeEntityPayloads } from '../../domain/conflict/merge';

export class RemoteAuthorizationBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteAuthorizationBlockedError';
  }
}

export type RemoteTransport = {
  push(op: SyncOperation): Promise<{
    remoteId?: string;
    remoteVersion: number;
    remotePayload?: Record<string, unknown>;
    status?: 'acknowledged' | 'conflict';
  }>;
};

export class SyncAuthBlockedError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = 'SyncAuthBlockedError';
  }
}

export class SyncScopeQuarantinedError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'SyncScopeQuarantinedError';
  }
}

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
    private transport: RemoteTransport = blockedBusinessApiTransport
  ) {}

  setTransport(transport: RemoteTransport) {
    this.transport = transport;
  }

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
            if (policy === 'domain-merge' && ack.remotePayload) {
              const merged = mergeEntityPayloads(
                next.entity,
                record.payload as Record<string, unknown>,
                ack.remotePayload
              );
              if (merged.status === 'merged') {
                await this.store.putRecord({
                  ...record,
                  payload: merged.value,
                  metadata: {
                    ...record.metadata,
                    remoteId: ack.remoteId,
                    syncStatus: 'synced',
                    lastSyncedAt: new Date().toISOString(),
                  },
                });
                await this.store.putOperation({ ...next, status: 'acked' });
                continue;
              }
              await this.store.putRecord({
                ...record,
                payload: merged.value,
                metadata: { ...record.metadata, syncStatus: 'conflict' },
              });
              await this.store.putOperation({
                ...next,
                status: 'conflict',
                lastError: `domain merge unresolved: ${merged.conflicts.map((c) => c.path).join(', ')}`,
              });
              continue;
            }
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
        const statusCode = (error as { status?: number }).status;
        const opStatus =
          statusCode === 401 || error instanceof SyncAuthBlockedError
            ? 'blocked_auth'
            : statusCode === 403 || error instanceof SyncScopeQuarantinedError
              ? 'quarantined'
              : statusCode === 409
                ? 'conflict'
                : 'failed';
        await this.store.putOperation({
          ...next,
          status: opStatus,
          lastError: message,
        });
        const record = await this.store.getRecord(next.entity, next.entityLocalId);
        if (record && record.metadata.syncStatus !== 'conflict') {
          await this.store.putRecord({
            ...record,
            metadata: {
              ...record.metadata,
              syncStatus: opStatus === 'conflict' ? 'conflict' : opStatus === 'blocked_auth' ? 'blocked_auth' : opStatus === 'quarantined' ? 'quarantined' : 'failed',
            },
          });
        }
        if (opStatus === 'blocked_auth') break;
      }
    }

    await this.connectivity.refresh();
  }
}
