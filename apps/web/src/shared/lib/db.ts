import { STORAGE_KEYS, STORAGE_VERSION } from './storageKeys';
import { deserializeFromStorage, serializeForStorage } from './serializers';
import { createSeedData, type PersistedAppData } from './seedData';

/** Stage 13 (audit P1 — Outcome D): operational initialization seeds EMPTY
 *  collections. The Phase-≤12 demo dataset (Emma Thompson, Wedding-Gown
 *  orders, GHS 702/2,164 invoices/payments, starter inventory) must never
 *  enter business storage as if it were the studio's own records.
 *  `createSeedData()` remains the development/test fixture (Outcome B).
 *  Existing devices keep their stored data — the storage version is
 *  intentionally NOT bumped (nothing is ever destroyed by this change). */
export function createEmptySeedData(): PersistedAppData {
  const fixture = createSeedData(); // workspace scaffolding + demo-tool ids only
  return {
    ...fixture,
    customers: [],
    orders: [],
    invoices: [],
    payments: [],
    dueAlerts: [],
    fabricRecords: [],
    materialUsages: [],
    designInspirations: [],
    patternLibrary: [],
    measurementProfiles: [],
  };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const memoryStore = new Map<string, string>();

function getStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return {
    getItem(key: string) {
      return memoryStore.has(key) ? memoryStore.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memoryStore.set(key, value);
    },
    removeItem(key: string) {
      memoryStore.delete(key);
    },
  };
}

const FIELD_TO_STORAGE_KEY: Record<keyof PersistedAppData, string> = {
  currentWorkspaceId: STORAGE_KEYS.currentWorkspaceId,
  currentMemberId: STORAGE_KEYS.currentMemberId,
  tierSimulation: STORAGE_KEYS.tierSimulation,

  customers: STORAGE_KEYS.customers,
  orders: STORAGE_KEYS.orders,
  invoices: STORAGE_KEYS.invoices,
  payments: STORAGE_KEYS.payments,
  dueAlerts: STORAGE_KEYS.dueAlerts,

  designInspirations: STORAGE_KEYS.designInspirations,
  fabricRecords: STORAGE_KEYS.fabricRecords,
  materialUsages: STORAGE_KEYS.materialUsages,
  patternLibrary: STORAGE_KEYS.patternLibrary,
  measurementProfiles: STORAGE_KEYS.measurementProfiles,

  studioSession: STORAGE_KEYS.studioSession,
};

export type PersistedField = keyof PersistedAppData;

function readValue<T>(key: string, fallback: T): T {
  const storage = getStorage();
  const raw = storage.getItem(key);

  if (!raw) return fallback;

  try {
    return deserializeFromStorage<T>(raw);
  } catch (error) {
    console.error(`Failed to parse storage key "${key}"`, error);
    return fallback;
  }
}

function writeValue<T>(key: string, value: T): void {
  const storage = getStorage();
  storage.setItem(key, serializeForStorage(value));
}

function removeValue(key: string): void {
  const storage = getStorage();
  storage.removeItem(key);
}

export function seedAppStorage(
  seed: PersistedAppData = createSeedData(),
  overwrite = false
): PersistedAppData {
  const storage = getStorage();

  (Object.keys(FIELD_TO_STORAGE_KEY) as PersistedField[]).forEach((field) => {
    const key = FIELD_TO_STORAGE_KEY[field];

    if (overwrite || !storage.getItem(key)) {
      writeValue(key, seed[field]);
    }
  });

  storage.setItem(STORAGE_KEYS.version, STORAGE_VERSION);

  return loadAppStorage(seed);
}

export function initializeAppStorage(): PersistedAppData {
  const storage = getStorage();
  const version = storage.getItem(STORAGE_KEYS.version);
  const seed = createEmptySeedData();

  if (!version) {
    return seedAppStorage(seed, true);
  }

  if (version !== STORAGE_VERSION) {
    storage.setItem(STORAGE_KEYS.version, STORAGE_VERSION);
  }

  return loadAppStorage(seed);
}

export function loadAppStorage(
  fallback: PersistedAppData = createSeedData()
): PersistedAppData {
  return {
    currentWorkspaceId: readValue(
      STORAGE_KEYS.currentWorkspaceId,
      fallback.currentWorkspaceId
    ),
    currentMemberId: readValue(
      STORAGE_KEYS.currentMemberId,
      fallback.currentMemberId
    ),
    tierSimulation: readValue(
      STORAGE_KEYS.tierSimulation,
      fallback.tierSimulation
    ),

    customers: readValue(STORAGE_KEYS.customers, fallback.customers),
    orders: readValue(STORAGE_KEYS.orders, fallback.orders),
    invoices: readValue(STORAGE_KEYS.invoices, fallback.invoices),
    payments: readValue(STORAGE_KEYS.payments, fallback.payments),
    dueAlerts: readValue(STORAGE_KEYS.dueAlerts, fallback.dueAlerts),

    designInspirations: readValue(
      STORAGE_KEYS.designInspirations,
      fallback.designInspirations
    ),
    fabricRecords: readValue(
      STORAGE_KEYS.fabricRecords,
      fallback.fabricRecords
    ),
    materialUsages: readValue(
      STORAGE_KEYS.materialUsages,
      fallback.materialUsages
    ),
    patternLibrary: readValue(
      STORAGE_KEYS.patternLibrary,
      fallback.patternLibrary
    ),
    measurementProfiles: readValue(
      STORAGE_KEYS.measurementProfiles,
      fallback.measurementProfiles
    ),

    studioSession: readValue(
      STORAGE_KEYS.studioSession,
      fallback.studioSession
    ),
  };
}

export function saveAppStorage(data: PersistedAppData): PersistedAppData {
  // Phase 3.5: mirror every snapshot into IndexedDB (fire-and-forget).
  void import('../../db/appStateBridge')
    .then((bridge) => bridge.mirrorSnapshotToIndexedDb(data))
    .catch(() => undefined);

  (Object.keys(FIELD_TO_STORAGE_KEY) as PersistedField[]).forEach((field) => {
    writeValue(FIELD_TO_STORAGE_KEY[field], data[field]);
  });

  writeValue(STORAGE_KEYS.version, STORAGE_VERSION);

  return data;
}

export function loadStoredField<K extends PersistedField>(
  field: K,
  fallback?: PersistedAppData[K]
): PersistedAppData[K] {
  const seed = fallback !== undefined ? fallback : createSeedData()[field];
  return readValue(FIELD_TO_STORAGE_KEY[field], seed);
}

export function saveStoredField<K extends PersistedField>(
  field: K,
  value: PersistedAppData[K]
): PersistedAppData[K] {
  writeValue(FIELD_TO_STORAGE_KEY[field], value);
  return value;
}

export function removeStoredField(field: PersistedField): void {
  removeValue(FIELD_TO_STORAGE_KEY[field]);
}

export function resetAppStorage(): PersistedAppData {
  (Object.values(FIELD_TO_STORAGE_KEY) as string[]).forEach((key) => {
    removeValue(key);
  });

  removeValue(STORAGE_KEYS.version);

  return seedAppStorage(createSeedData(), true);
}
