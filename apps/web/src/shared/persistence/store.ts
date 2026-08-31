import type { EntityName, StoredRecord, SyncOperation } from './types';

export type LocalStoreSnapshot = {
  records: StoredRecord[];
  operations: SyncOperation[];
  schemaVersion: number;
};

export interface LocalStore {
  getSchemaVersion(): Promise<number>;
  setSchemaVersion(version: number): Promise<void>;
  putRecord(record: StoredRecord): Promise<void>;
  getRecord(entity: EntityName, localId: string): Promise<StoredRecord | undefined>;
  listRecords(entity: EntityName): Promise<StoredRecord[]>;
  deleteRecordPhysical(entity: EntityName, localId: string): Promise<void>;
  putOperation(op: SyncOperation): Promise<void>;
  getOperation(operationId: string): Promise<SyncOperation | undefined>;
  listOperations(): Promise<SyncOperation[]>;
  dump(): Promise<LocalStoreSnapshot>;
  restore(snapshot: LocalStoreSnapshot): Promise<void>;
}
