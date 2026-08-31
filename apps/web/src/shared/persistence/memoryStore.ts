import type { EntityName, StoredRecord, SyncOperation } from './types';
import { T2_SCHEMA_VERSION } from './types';
import type { LocalStore, LocalStoreSnapshot } from './store';

function recordKey(entity: EntityName, localId: string) {
  return `${entity}:${localId}`;
}

export class MemoryStore implements LocalStore {
  private records = new Map<string, StoredRecord>();
  private operations = new Map<string, SyncOperation>();
  private schemaVersion = T2_SCHEMA_VERSION;

  async getSchemaVersion() {
    return this.schemaVersion;
  }

  async setSchemaVersion(version: number) {
    this.schemaVersion = version;
  }

  async putRecord(record: StoredRecord) {
    this.records.set(recordKey(record.entity, record.metadata.localId), structuredClone(record));
  }

  async getRecord(entity: EntityName, localId: string) {
    const value = this.records.get(recordKey(entity, localId));
    return value ? structuredClone(value) : undefined;
  }

  async listRecords(entity: EntityName) {
    return [...this.records.values()]
      .filter((row) => row.entity === entity)
      .map((row) => structuredClone(row));
  }

  async deleteRecordPhysical(entity: EntityName, localId: string) {
    this.records.delete(recordKey(entity, localId));
  }

  async putOperation(op: SyncOperation) {
    this.operations.set(op.operationId, structuredClone(op));
  }

  async getOperation(operationId: string) {
    const value = this.operations.get(operationId);
    return value ? structuredClone(value) : undefined;
  }

  async listOperations() {
    return [...this.operations.values()].map((row) => structuredClone(row));
  }

  async dump(): Promise<LocalStoreSnapshot> {
    return {
      records: await this.listRecordsAll(),
      operations: await this.listOperations(),
      schemaVersion: this.schemaVersion,
    };
  }

  async restore(snapshot: LocalStoreSnapshot) {
    this.records.clear();
    this.operations.clear();
    this.schemaVersion = snapshot.schemaVersion;
    for (const record of snapshot.records) {
      await this.putRecord(record);
    }
    for (const op of snapshot.operations) {
      await this.putOperation(op);
    }
  }

  private async listRecordsAll() {
    return [...this.records.values()].map((row) => structuredClone(row));
  }
}
