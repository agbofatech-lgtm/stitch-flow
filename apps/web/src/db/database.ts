import Dexie, { type Table } from 'dexie';
import {
  DB_NAME,
  SCHEMA_V1,
  SCHEMA_V2,
  SCHEMA_V3,
  SCHEMA_V4,
  SCHEMA_V5,
  CURRENT_SCHEMA_VERSION,
  type SyncQueueRecord,
  type SyncMetaRecord,
  type LocalSettingRecord,
  type LocalEnvelope,
} from './schema';

export type LocalRow = LocalEnvelope & { id: string } & Record<string, unknown>;

/**
 * The single canonical client database (§8). Do not create competing
 * databases — import `db` from this module.
 */
export class StitchFlowDatabase extends Dexie {
  customers!: Table<LocalRow, string>;
  orders!: Table<LocalRow, string>;
  measurementProfiles!: Table<LocalRow, string>;
  invoices!: Table<LocalRow, string>;
  payments!: Table<LocalRow, string>;
  fabrics!: Table<LocalRow, string>;
  materialUsages!: Table<LocalRow, string>;
  productionStages!: Table<LocalRow, string>;
  settings!: Table<LocalSettingRecord, [string, string]>;
  syncMeta!: Table<SyncMetaRecord, string>;
  syncQueue!: Table<SyncQueueRecord, number>;
  // Phase 13 — canonical measurement tables (local cache + draft outbox)
  measurementProfilesV13!: Table<LocalRow, string>;
  measurementSetsV13!: Table<LocalRow, string>;
  measurementValuesV13!: Table<LocalRow, string>;
  measurementOutbox!: Table<SyncQueueRecord, number>;
  // Phase 14 — Design Intelligence (local cache + binary asset store)
  inspirationsV14!: Table<LocalRow, string>;
  fabricProfilesV14!: Table<LocalRow, string>;
  designSpecsV14!: Table<LocalRow, string>;
  /** Binary asset store — Blobs stored here, never in localStorage. */
  localAssetsV14!: Table<{ id: string; workspaceId: string; blob: Blob; mimeType: string; filename: string; thumbnailDataUrl?: string; createdAt: string }, string>;
  designOutbox!: Table<SyncQueueRecord, number>;
  // Phase 15 — Pattern & Cutting Intelligence (local cache + outbox)
  patternModelsV15!: Table<LocalRow, string>;
  cuttingLayoutsV15!: Table<LocalRow, string>;
  patternOutbox!: Table<SyncQueueRecord, number>;

  constructor(name = DB_NAME) {
    super(name);
    // Versioned, additive schema history (§35). Never edit old versions.
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2);
    this.version(3).stores(SCHEMA_V3);
    this.version(4).stores(SCHEMA_V4);
    this.version(5).stores(SCHEMA_V5);
  }
}

export const db = new StitchFlowDatabase();

export function assertSchemaVersion(instance: StitchFlowDatabase = db) {
  return instance.verno === CURRENT_SCHEMA_VERSION;
}

/** All workspace-owned domain tables (used by delta apply + tests). */
export const DOMAIN_TABLES = [
  'customers',
  'orders',
  'measurementProfiles',
  'invoices',
  'payments',
  'fabrics',
  'materialUsages',
  'productionStages',
  'settings',
] as const;
