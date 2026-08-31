import type { LocalStore } from './store';
import { T2_SCHEMA_VERSION } from './types';

export const SCHEMA_MIGRATIONS = [
  {
    version: 1,
    purpose: 'Initial T2 stores: records, operations, meta. No legacy localStorage mutation.',
  },
];

export async function migrateLocalSchema(store: LocalStore) {
  const current = await store.getSchemaVersion();
  if (current > T2_SCHEMA_VERSION) {
    throw new Error(`Local schema ${current} is newer than supported ${T2_SCHEMA_VERSION}`);
  }
  if (current < T2_SCHEMA_VERSION) {
    await store.setSchemaVersion(T2_SCHEMA_VERSION);
  }
  return T2_SCHEMA_VERSION;
}
