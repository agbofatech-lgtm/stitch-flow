/**
 * SAC-5 transport: T2 outbox → authenticated /shop/sync only.
 * Does not call legacy /customers. Does not push SAC-2 AppContext projections.
 */

import type { RemoteTransport } from '../../shared/persistence/syncEngine';
import type { SyncOperation } from '../../shared/persistence/types';
import { SyncAuthBlockedError, SyncScopeQuarantinedError } from '../../shared/persistence/syncEngine';
import { shopRequest } from '../../shared/api/shopClient';

export type ShopSyncSession = {
  accessToken: string;
  workspaceId?: string;
};

let session: ShopSyncSession | null = null;

export function setShopSyncSession(next: ShopSyncSession | null) {
  session = next;
}

export function getShopSyncSession() {
  return session;
}

function mapEntity(op: SyncOperation): { entityType: string; operationType: string; payload: Record<string, unknown> } {
  const payload = (op.payload && typeof op.payload === 'object' ? op.payload : {}) as Record<string, unknown>;
  if (payload.kind === 'ShopOrder' || payload.kind === 'LiveMeasurementProfile') {
    const err = new SyncScopeQuarantinedError('SAC-2 projection is not a /shop canonical record');
    throw err;
  }
  if (op.entity === 'customer') {
    return { entityType: 'customer', operationType: op.operationType, payload };
  }
  if (op.entity === 'order') {
    if (payload.kind === 'measurement_snapshot') {
      return {
        entityType: 'measurement_snapshot',
        operationType: 'snapshot',
        payload: { snapshot: (payload.snapshot as Record<string, unknown>) || payload },
      };
    }
    if (payload.kind === 'production_transition') {
      return {
        entityType: 'production_transition',
        operationType: 'transition',
        payload: { stageCode: payload.stageCode, action: payload.action },
      };
    }
    return { entityType: 'order', operationType: op.operationType, payload };
  }
  if (op.entity === 'trustedArtifact') {
    return { entityType: 'trusted_artifact', operationType: op.operationType, payload };
  }
  const err = new SyncScopeQuarantinedError(`Entity ${op.entity} is outside SAC-5 shop sync cohort`);
  throw err;
}

export const shopSyncTransport: RemoteTransport = {
  async push(op) {
    if (!session?.accessToken) {
      throw new SyncAuthBlockedError('Shop sync session is not authenticated');
    }
    const mapped = mapEntity(op);
    try {
      const ack = await shopRequest('/shop/sync/operations', session.accessToken, {
        method: 'POST',
        workspaceId: session.workspaceId,
        body: JSON.stringify({
          operationId: op.operationId,
          entityType: mapped.entityType,
          entityId: op.entityLocalId,
          operationType: mapped.operationType,
          expectedVersion: op.expectedVersion,
          payload: mapped.payload,
          schemaVersion: 1,
        }),
      });
      if (ack.status === 'conflict') {
        const err = new Error('CONFLICT') as Error & { status: number };
        err.status = 409;
        throw err;
      }
      return {
        remoteId: String(ack.entityId || op.entityLocalId),
        remoteVersion: Number(ack.serverVersion || op.expectedVersion || 1),
        remotePayload: ack.result as Record<string, unknown> | undefined,
        status: 'acknowledged' as const,
      };
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) throw new SyncAuthBlockedError('Authentication required for shop sync');
      if (status === 403) throw new SyncScopeQuarantinedError('Shop scope rejected the operation');
      throw err;
    }
  },
};

export async function pullShopChanges(cursor: string) {
  if (!session?.accessToken) {
    throw new SyncAuthBlockedError('Shop sync session is not authenticated');
  }
  return shopRequest(`/shop/sync/changes?cursor=${encodeURIComponent(cursor)}`, session.accessToken, {
    method: 'GET',
    workspaceId: session.workspaceId,
  }) as Promise<{ nextCursor: string; changes: Array<Record<string, unknown>> }>;
}
