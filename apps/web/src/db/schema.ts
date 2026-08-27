/**
 * Canonical client database schema (Phase 3.5).
 *
 * Single Dexie/IndexedDB database for the whole app. Domain rows reuse the
 * canonical StitchFlow types (see src/shared/types) and add a small local
 * envelope: every workspace-owned row carries `workspaceId`, and soft
 * deletion is represented by `deletedAt` (tombstone) — rows are never
 * physically removed by sync, preventing deleted records from resurrecting.
 */

export const DB_NAME = 'stitchflow';

/** Queue lifecycle states (§16). */
export type SyncQueueStatus = 'pending' | 'processing' | 'synced' | 'failed';

export type SyncQueueRecord = {
  /** Auto-increment local id. */
  id?: number;
  /** Client-generated idempotency key — NEVER regenerated on retry (§14). */
  clientMutationId: string;
  workspaceId: string;
  /** Server entity name, e.g. 'customers', 'payments', 'order_material_usages'. */
  entity: string;
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  status: SyncQueueStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt: string | null;
  nextRetryAt: string | null;
  processingStartedAt: string | null;
  lastError: string | null;
  occurredAt: string;
};

export type SyncMetaRecord = {
  /** `workspace:<id>` — one metadata row per workspace. */
  key: string;
  workspaceId: string;
  /** Monotonic server cursor (sync_changes.seq as string). */
  currentCursor: string;
  lastSuccessfulSync: string | null;
  lastAttemptedSync: string | null;
  lastSyncError: string | null;
  schemaVersion: number;
};

export type LocalEnvelope = {
  workspaceId: string;
  deletedAt?: string | null;
  /** Local bookkeeping for LWW-eligible state entities. */
  localUpdatedAt?: string;
};

/** Local settings row (workspace-scoped key/value, mirrors app_settings). */
export type LocalSettingRecord = LocalEnvelope & {
  key: string;
  value: unknown;
};

/**
 * Dexie version history. NEVER edit an existing version — add a new one.
 * v1: initial offline foundation.
 * v2: adds [workspaceId+status] queue index + payments clientMutationId index
 *     (kept as a real, tested upgrade path).
 */
export const SCHEMA_V1: Record<string, string> = {
  customers: 'id, workspaceId, [workspaceId+id], fullName',
  orders: 'id, workspaceId, [workspaceId+id], customerId, status',
  measurementProfiles: 'id, workspaceId, [workspaceId+id], customerId',
  invoices: 'id, workspaceId, [workspaceId+id], customerId, orderId',
  payments: 'id, workspaceId, [workspaceId+id], invoiceId',
  fabrics: 'id, workspaceId, [workspaceId+id]',
  materialUsages: 'id, workspaceId, [workspaceId+id], orderId, fabricRecordId',
  productionStages: 'id, workspaceId, [workspaceId+id], orderId',
  settings: '[workspaceId+key], workspaceId',
  syncMeta: 'key, workspaceId',
  syncQueue: '++id, clientMutationId, workspaceId, status, nextRetryAt',
};

export const SCHEMA_V2: Record<string, string> = {
  ...SCHEMA_V1,
  payments: 'id, workspaceId, [workspaceId+id], invoiceId, clientMutationId',
  syncQueue:
    '++id, clientMutationId, workspaceId, status, nextRetryAt, [workspaceId+status]',
};

export const CURRENT_SCHEMA_VERSION = 2;

/** Server entity name -> local table name (delta application map). */
export const ENTITY_TABLE_MAP: Record<string, string> = {
  customers: 'customers',
  orders: 'orders',
  measurement_profiles: 'measurementProfiles',
  invoices: 'invoices',
  payments: 'payments',
  fabric_records: 'fabrics',
  order_material_usages: 'materialUsages',
  order_production_stages: 'productionStages',
  app_settings: 'settings',
};

/** Entities that must use their dedicated transactional event endpoints (§24). */
export const EVENT_LANE_ENTITIES = new Set(['payments', 'order_material_usages']);
