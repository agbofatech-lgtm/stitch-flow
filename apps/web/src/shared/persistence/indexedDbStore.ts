import type { EntityName, StoredRecord, SyncOperation } from './types';
import { T2_DB_NAME, T2_SCHEMA_VERSION } from './types';
import type { LocalStore, LocalStoreSnapshot } from './store';

function recordKey(entity: EntityName, localId: string) {
  return `${entity}:${localId}`;
}

export function canUseIndexedDb() {
  return typeof indexedDB !== 'undefined';
}

export class IndexedDbStore implements LocalStore {
  constructor(private readonly dbName = T2_DB_NAME) {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, T2_SCHEMA_VERSION);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('records')) {
          db.createObjectStore('records', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('operations')) {
          db.createObjectStore('operations', { keyPath: 'operationId' });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  private async withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T> | void
  ): Promise<T> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = fn(store);
      tx.oncomplete = () => {
        db.close();
        resolve((req ? req.result : undefined) as T);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  async getSchemaVersion() {
    const row = await this.withStore<{ id: string; version: number } | undefined>(
      'meta',
      'readonly',
      (store) => store.get('schema')
    );
    return row?.version ?? T2_SCHEMA_VERSION;
  }

  async setSchemaVersion(version: number) {
    await this.withStore('meta', 'readwrite', (store) => store.put({ id: 'schema', version }));
  }

  async putRecord(record: StoredRecord) {
    await this.withStore('records', 'readwrite', (store) =>
      store.put({ key: recordKey(record.entity, record.metadata.localId), record })
    );
  }

  async getRecord(entity: EntityName, localId: string) {
    const row = await this.withStore<{ key: string; record: StoredRecord } | undefined>(
      'records',
      'readonly',
      (store) => store.get(recordKey(entity, localId))
    );
    return row?.record;
  }

  async listRecords(entity: EntityName) {
    const rows = await this.withStore<Array<{ key: string; record: StoredRecord }>>(
      'records',
      'readonly',
      (store) => store.getAll()
    );
    return (rows || []).map((row) => row.record).filter((record) => record.entity === entity);
  }

  async deleteRecordPhysical(entity: EntityName, localId: string) {
    await this.withStore('records', 'readwrite', (store) =>
      store.delete(recordKey(entity, localId))
    );
  }

  async putOperation(op: SyncOperation) {
    await this.withStore('operations', 'readwrite', (store) => store.put(op));
  }

  async getOperation(operationId: string) {
    return this.withStore<SyncOperation | undefined>('operations', 'readonly', (store) =>
      store.get(operationId)
    );
  }

  async listOperations() {
    const rows = await this.withStore<SyncOperation[]>('operations', 'readonly', (store) =>
      store.getAll()
    );
    return rows || [];
  }

  async dump(): Promise<LocalStoreSnapshot> {
    const recordsRows = await this.withStore<Array<{ record: StoredRecord }>>(
      'records',
      'readonly',
      (store) => store.getAll()
    );
    return {
      records: (recordsRows || []).map((row) => row.record),
      operations: await this.listOperations(),
      schemaVersion: await this.getSchemaVersion(),
    };
  }

  async restore(snapshot: LocalStoreSnapshot) {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['records', 'operations', 'meta'], 'readwrite');
      tx.objectStore('records').clear();
      tx.objectStore('operations').clear();
      for (const record of snapshot.records) {
        tx.objectStore('records').put({
          key: recordKey(record.entity, record.metadata.localId),
          record,
        });
      }
      for (const op of snapshot.operations) {
        tx.objectStore('operations').put(op);
      }
      tx.objectStore('meta').put({ id: 'schema', version: snapshot.schemaVersion });
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }
}
