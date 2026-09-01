import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs';
import { dirname, isAbsolute, resolve } from 'path';
import { createPlatformStore, type PlatformStore } from './store';
import { defaultPlatformConfiguration } from './configuration';
import type { Identity, Membership, Tenant, TenantScopedRecord, TenantWorkspace } from './types';
import type {
  CommercialAudit,
  PlanDefinition,
  PriceDefinition,
  ProcessedBillingEvent,
  SaasPayment,
  Subscription,
} from './commercial/types';
import { PlatformError } from './errors';

export const STORE_VERSION = 1;

type Snapshot = {
  version: number;
  identities: Identity[];
  tenants: Tenant[];
  workspaces: TenantWorkspace[];
  memberships: Membership[];
  records: TenantScopedRecord[];
  plans: PlanDefinition[];
  prices: PriceDefinition[];
  subscriptions: Subscription[];
  payments: SaasPayment[];
  billingEvents: ProcessedBillingEvent[];
  commercialAudit: CommercialAudit[];
  platformOperators: string[];
  configuration: PlatformStore['configuration'];
  billingWatermark: Array<[string, string]>;
};

function mapBy<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  return new Map(rows.map((row) => [key(row), row]));
}

function assertArray(value: unknown, field: string): void {
  if (!Array.isArray(value)) {
    throw new PlatformError(500, 'STORE_CORRUPT', `Store snapshot field is not an array: ${field}`);
  }
}

export function serializeStore(store: PlatformStore): Snapshot {
  return {
    version: STORE_VERSION,
    identities: [...store.identities.values()],
    tenants: [...store.tenants.values()],
    workspaces: [...store.workspaces.values()],
    memberships: [...store.memberships.values()],
    records: [...store.records.values()],
    plans: [...store.plans.values()],
    prices: [...store.prices.values()],
    subscriptions: [...store.subscriptions.values()],
    payments: [...store.payments.values()],
    billingEvents: [...store.billingEvents.values()],
    commercialAudit: store.commercialAudit,
    platformOperators: [...store.platformOperators],
    configuration: store.configuration,
    billingWatermark: [...store.billingWatermark.entries()],
  };
}

export function hydrateStore(snapshot: Snapshot): PlatformStore {
  if (!snapshot || snapshot.version !== STORE_VERSION) {
    throw new PlatformError(500, 'STORE_CORRUPT', 'Store snapshot version is unsupported');
  }
  assertArray(snapshot.identities, 'identities');
  assertArray(snapshot.tenants, 'tenants');
  assertArray(snapshot.workspaces, 'workspaces');
  assertArray(snapshot.memberships, 'memberships');
  const store = createPlatformStore();
  for (const identity of snapshot.identities) {
    store.identities.set(identity.id, identity);
    store.identitiesByEmail.set(identity.email, identity.id);
  }
  for (const tenant of snapshot.tenants || []) store.tenants.set(tenant.id, tenant);
  for (const ws of snapshot.workspaces || []) store.workspaces.set(ws.id, ws);
  for (const m of snapshot.memberships || []) store.memberships.set(m.id, m);
  for (const r of snapshot.records || []) store.records.set(r.id, r);
  store.plans = mapBy(snapshot.plans || [], (p) => p.code);
  store.prices = mapBy(snapshot.prices || [], (p) => p.id);
  store.subscriptions = mapBy(snapshot.subscriptions || [], (p) => p.id);
  store.payments = mapBy(snapshot.payments || [], (p) => p.id);
  for (const e of snapshot.billingEvents || []) store.billingEvents.set(e.eventId, e);
  store.commercialAudit = snapshot.commercialAudit || [];
  store.platformOperators = new Set(snapshot.platformOperators || []);
  store.configuration = snapshot.configuration || defaultPlatformConfiguration();
  store.billingWatermark = new Map(snapshot.billingWatermark || []);
  return store;
}

export function writeStore(filePath: string, store: PlatformStore): void {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, JSON.stringify(serializeStore(store), null, 2), { encoding: 'utf8', mode: 0o600 });
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, JSON.stringify(serializeStore(store), null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
  }
}

export function readStore(filePath: string): PlatformStore | null {
  if (!existsSync(filePath)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    throw new PlatformError(500, 'STORE_CORRUPT', 'Store snapshot is not valid JSON');
  }
  return hydrateStore(raw as Snapshot);
}

export function resolveDataPath(filePath: string | undefined): string | undefined {
  if (!filePath || filePath.trim() === '') return undefined;
  const trimmed = filePath.trim();
  return isAbsolute(trimmed) ? trimmed : resolve(process.cwd(), trimmed);
}

export function loadOrCreateStore(filePath: string | undefined): {
  store: PlatformStore;
  persist: () => void;
  driver: 'memory' | 'file';
} {
  const resolved = resolveDataPath(filePath);
  if (!resolved) {
    return { store: createPlatformStore(), persist: () => undefined, driver: 'memory' };
  }
  const loaded = readStore(resolved);
  const store = loaded ?? createPlatformStore();
  store.configuration['persistence.driver'] = {
    ...store.configuration['persistence.driver'],
    key: 'persistence.driver',
    value: 'file',
    classification: 'TRANSITIONAL_DEFAULT',
    description:
      'Transitional durable JSON file. Postgres exists in-repo but is NOT VERIFIED / not applied.',
  };
  return {
    store,
    persist: () => writeStore(resolved, store),
    driver: 'file',
  };
}
