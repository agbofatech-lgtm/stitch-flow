import crypto from 'crypto';
import { db, type LocalRow } from '../../../db/database';
import { EVENT_LANE_ENTITIES, type SyncQueueRecord } from '../../../db/schema';

/**
 * Local-first repository base (§12–§13).
 *
 * Business writes go LOCAL FIRST: IndexedDB write + durable queue entry in a
 * single Dexie transaction, then return success to the caller. No network is
 * required. The sync engine later drains the queue against the Phase 3
 * server protocol using the SAME clientMutationId on every retry (§14).
 */
export function newClientMutationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

export function buildQueueRecord(input: {
  workspaceId: string;
  entity: string;
  entityId: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  clientMutationId?: string;
}): SyncQueueRecord {
  const ts = nowIso();
  return {
    clientMutationId: input.clientMutationId ?? newClientMutationId(),
    workspaceId: input.workspaceId,
    entity: input.entity,
    entityId: input.entityId,
    operation: input.operation,
    payload: input.payload,
    status: 'pending',
    retryCount: 0,
    createdAt: ts,
    updatedAt: ts,
    lastAttemptAt: null,
    nextRetryAt: null,
    processingStartedAt: null,
    lastError: null,
    occurredAt: ts,
  };
}

export class LocalRepository<T extends LocalRow = LocalRow> {
  constructor(
    /** Dexie table name, e.g. 'customers'. */
    public readonly tableName: string,
    /** Server entity name, e.g. 'customers' / 'payments'. */
    public readonly entity: string
  ) {}

  protected get table() {
    return db.table<T, string>(this.tableName);
  }

  /** Local write + queued mutation, atomically (offline-first rule §13). */
  async create(
    workspaceId: string,
    record: Omit<T, 'workspaceId'> & { id?: string },
    options: { clientMutationId?: string; queue?: boolean } = {}
  ): Promise<T> {
    const id = record.id || newClientMutationId();
    const row = {
      ...record,
      id,
      workspaceId,
      deletedAt: null,
      localUpdatedAt: nowIso(),
    } as unknown as T;

    await db.transaction('rw', [this.table, db.syncQueue], async () => {
      await this.table.put(row);
      if (options.queue !== false) {
        await db.syncQueue.add(
          buildQueueRecord({
            workspaceId,
            entity: this.entity,
            entityId: id,
            operation: 'insert',
            payload: row as unknown as Record<string, unknown>,
            clientMutationId: options.clientMutationId,
          })
        );
      }
    });

    return row;
  }

  async get(workspaceId: string, id: string): Promise<T | undefined> {
    const row = await this.table.get(id);
    if (!row) return undefined;
    // repository-level workspace boundary (§44) — not just UI filtering
    if (row.workspaceId !== workspaceId) return undefined;
    if (row.deletedAt) return undefined;
    return row;
  }

  async list(workspaceId: string): Promise<T[]> {
    const rows = await this.table.where('workspaceId').equals(workspaceId).toArray();
    return rows.filter((row) => !row.deletedAt);
  }

  async update(
    workspaceId: string,
    id: string,
    updates: Partial<T>,
    options: { clientMutationId?: string; queue?: boolean } = {}
  ): Promise<T | undefined> {
    let next: T | undefined;
    await db.transaction('rw', [this.table, db.syncQueue], async () => {
      const existing = await this.table.get(id);
      if (!existing || existing.workspaceId !== workspaceId || existing.deletedAt) {
        return;
      }
      next = { ...existing, ...updates, id, workspaceId, localUpdatedAt: nowIso() };
      await this.table.put(next);
      if (options.queue !== false) {
        await db.syncQueue.add(
          buildQueueRecord({
            workspaceId,
            entity: this.entity,
            entityId: id,
            operation: 'update',
            payload: next as unknown as Record<string, unknown>,
            clientMutationId: options.clientMutationId,
          })
        );
      }
    });
    return next;
  }

  /** Soft delete: local tombstone + queued DELETE mutation (§22–§23). */
  async softDelete(
    workspaceId: string,
    id: string,
    options: { clientMutationId?: string; queue?: boolean } = {}
  ): Promise<boolean> {
    let deleted = false;
    await db.transaction('rw', [this.table, db.syncQueue], async () => {
      const existing = await this.table.get(id);
      if (!existing || existing.workspaceId !== workspaceId || existing.deletedAt) {
        return;
      }
      const ts = nowIso();
      await this.table.put({ ...existing, deletedAt: ts, localUpdatedAt: ts });
      deleted = true;
      if (options.queue !== false) {
        await db.syncQueue.add(
          buildQueueRecord({
            workspaceId,
            entity: this.entity,
            entityId: id,
            operation: 'delete',
            payload: { id, deletedAt: ts },
            clientMutationId: options.clientMutationId,
          })
        );
      }
    });
    return deleted;
  }

  async search(workspaceId: string, predicate: (row: T) => boolean): Promise<T[]> {
    const rows = await this.list(workspaceId);
    return rows.filter(predicate);
  }
}

/**
 * Canonical local repositories. Financial/inventory repositories are still
 * LocalRepository instances for local reads/writes, but their queued
 * mutations are routed by the sync engine to the transactional EVENT
 * endpoints (never the generic state lane) — see EVENT_LANE_ENTITIES.
 */
export const customerLocalRepository = new LocalRepository('customers', 'customers');
export const orderLocalRepository = new LocalRepository('orders', 'orders');
export const measurementLocalRepository = new LocalRepository(
  'measurementProfiles',
  'measurement_profiles'
);
export const invoiceLocalRepository = new LocalRepository('invoices', 'invoices');
export const paymentLocalRepository = new LocalRepository('payments', 'payments');
export const materialLocalRepository = new LocalRepository('fabrics', 'fabric_records');
export const materialUsageLocalRepository = new LocalRepository(
  'materialUsages',
  'order_material_usages'
);
export const productionStageLocalRepository = new LocalRepository(
  'productionStages',
  'order_production_stages'
);

export function isEventLaneEntity(entity: string) {
  return EVENT_LANE_ENTITIES.has(entity);
}
