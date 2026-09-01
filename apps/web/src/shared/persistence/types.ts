export const T2_SCHEMA_VERSION = 1;
export const T2_DB_NAME = 'stitchflow-t2';

export type SyncStatus =
  | 'synced'
  | 'pending'
  | 'syncing'
  | 'conflict'
  | 'failed'
  | 'deleted'
  | 'blocked_auth'
  | 'quarantined';

export type ConnectivityState = 'online' | 'offline' | 'syncing' | 'degraded' | 'failed';

export type EntityName =
  | 'customer'
  | 'measurement'
  | 'garment'
  | 'design'
  | 'order'
  | 'production'
  | 'material'
  | 'inventory'
  | 'invoice'
  | 'payment'
  | 'user'
  | 'workspace'
  | 'trustedArtifact';

export type SyncMetadata = {
  localId: string;
  remoteId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
  tombstone?: boolean;
};

export type StoredRecord<T = Record<string, unknown>> = {
  entity: EntityName;
  payload: T;
  metadata: SyncMetadata;
};

export type OperationType = 'create' | 'update' | 'delete';

export type SyncOperation = {
  operationId: string;
  entity: EntityName;
  entityLocalId: string;
  operationType: OperationType;
  payload: unknown;
  expectedVersion: number;
  createdAt: string;
  attemptCount: number;
  status: 'pending' | 'syncing' | 'acked' | 'failed' | 'conflict' | 'blocked_auth' | 'quarantined';
  lastError?: string;
};

export type ConflictPolicy =
  | 'detect-only'
  | 'server-authoritative'
  | 'manual'
  | 'domain-deferred'
  | 'domain-merge';

export type CacheClass = 'local-first' | 'cacheable' | 'remote-only' | 'derived' | 'ephemeral';
