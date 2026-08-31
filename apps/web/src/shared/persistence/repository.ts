import type { LocalStore } from './store';
import type { EntityName, StoredRecord, SyncMetadata, SyncOperation } from './types';

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class EntityRepository {
  constructor(
    private readonly store: LocalStore,
    readonly entity: EntityName
  ) {}

  async listActive() {
    const rows = await this.store.listRecords(this.entity);
    return rows.filter((row) => !row.metadata.tombstone && row.metadata.syncStatus !== 'deleted');
  }

  async get(localId: string) {
    return this.store.getRecord(this.entity, localId);
  }

  async create(payload: Record<string, unknown>, operationId = newId()) {
    const existingOp = await this.store.getOperation(operationId);
    if (existingOp) {
      return this.store.getRecord(this.entity, existingOp.entityLocalId);
    }

    const localId = newId();
    const timestamp = nowIso();
    const metadata: SyncMetadata = {
      localId,
      version: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      syncStatus: 'pending',
    };
    const record: StoredRecord = { entity: this.entity, payload, metadata };
    await this.store.putRecord(record);
    await this.enqueue({
      operationId,
      entity: this.entity,
      entityLocalId: localId,
      operationType: 'create',
      payload,
      expectedVersion: 1,
      createdAt: timestamp,
      attemptCount: 0,
      status: 'pending',
    });
    return record;
  }

  async update(localId: string, payload: Record<string, unknown>, operationId = newId()) {
    const existingOp = await this.store.getOperation(operationId);
    if (existingOp) {
      return this.store.getRecord(this.entity, localId);
    }

    const current = await this.store.getRecord(this.entity, localId);
    if (!current) throw new Error(`${this.entity} ${localId} not found`);
    if (current.metadata.tombstone) throw new Error(`${this.entity} ${localId} is deleted`);

    const timestamp = nowIso();
    const next: StoredRecord = {
      entity: this.entity,
      payload,
      metadata: {
        ...current.metadata,
        version: current.metadata.version + 1,
        updatedAt: timestamp,
        syncStatus: 'pending',
      },
    };
    await this.store.putRecord(next);
    await this.enqueue({
      operationId,
      entity: this.entity,
      entityLocalId: localId,
      operationType: 'update',
      payload,
      expectedVersion: current.metadata.version,
      createdAt: timestamp,
      attemptCount: 0,
      status: 'pending',
    });
    return next;
  }

  async remove(localId: string, operationId = newId()) {
    const existingOp = await this.store.getOperation(operationId);
    if (existingOp) {
      return this.store.getRecord(this.entity, localId);
    }

    const current = await this.store.getRecord(this.entity, localId);
    if (!current) throw new Error(`${this.entity} ${localId} not found`);

    const timestamp = nowIso();
    const next: StoredRecord = {
      ...current,
      metadata: {
        ...current.metadata,
        version: current.metadata.version + 1,
        updatedAt: timestamp,
        syncStatus: 'deleted',
        tombstone: true,
      },
    };
    await this.store.putRecord(next);
    await this.enqueue({
      operationId,
      entity: this.entity,
      entityLocalId: localId,
      operationType: 'delete',
      payload: { localId },
      expectedVersion: current.metadata.version,
      createdAt: timestamp,
      attemptCount: 0,
      status: 'pending',
    });
    return next;
  }

  private enqueue(op: SyncOperation) {
    return this.store.putOperation(op);
  }
}

export function createRepositories(store: LocalStore) {
  return {
    customer: new EntityRepository(store, 'customer'),
    measurement: new EntityRepository(store, 'measurement'),
    garment: new EntityRepository(store, 'garment'),
    design: new EntityRepository(store, 'design'),
    order: new EntityRepository(store, 'order'),
    production: new EntityRepository(store, 'production'),
    material: new EntityRepository(store, 'material'),
    inventory: new EntityRepository(store, 'inventory'),
    invoice: new EntityRepository(store, 'invoice'),
    payment: new EntityRepository(store, 'payment'),
    user: new EntityRepository(store, 'user'),
    workspace: new EntityRepository(store, 'workspace'),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
