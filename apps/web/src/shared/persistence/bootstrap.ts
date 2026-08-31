import { MemoryStore } from './memoryStore';
import { IndexedDbStore, canUseIndexedDb } from './indexedDbStore';
import { createRepositories, type Repositories } from './repository';
import { ConnectivityMonitor, probeT1Health } from './connectivity';
import { SyncEngine, blockedBusinessApiTransport } from './syncEngine';
import { migrateLocalSchema } from './schema';
import type { LocalStore } from './store';

export type DataAuthorityRuntime = {
  store: LocalStore;
  repositories: Repositories;
  connectivity: ConnectivityMonitor;
  syncEngine: SyncEngine;
  driver: 'indexeddb' | 'memory';
};

let runtime: DataAuthorityRuntime | undefined;

export async function startDataAuthorityRuntime(): Promise<DataAuthorityRuntime> {
  if (runtime) return runtime;

  const driver = canUseIndexedDb() ? 'indexeddb' : 'memory';
  const store = driver === 'indexeddb' ? new IndexedDbStore() : new MemoryStore();
  await migrateLocalSchema(store);

  const apiBase =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
      ? String(import.meta.env.VITE_API_BASE_URL)
      : 'http://localhost:5000';

  const connectivity = new ConnectivityMonitor(() => probeT1Health(apiBase));
  await connectivity.refresh();

  runtime = {
    store,
    repositories: createRepositories(store),
    connectivity,
    syncEngine: new SyncEngine(store, connectivity, blockedBusinessApiTransport),
    driver,
  };

  return runtime;
}

export function getDataAuthorityRuntime() {
  return runtime;
}
