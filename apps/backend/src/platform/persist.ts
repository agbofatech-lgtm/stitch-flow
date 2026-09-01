import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
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
  const store = createPlatformStore();
  for (const identity of snapshot.identities || []) {
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
  writeFileSync(filePath, JSON.stringify(serializeStore(store), null, 2), 'utf8');
}

export function readStore(filePath: string): PlatformStore | null {
  if (!existsSync(filePath)) return null;
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Snapshot;
  if (!raw || raw.version !== STORE_VERSION) return null;
  return hydrateStore(raw);
}

export function loadOrCreateStore(filePath: string | undefined): {
  store: PlatformStore;
  persist: () => void;
  driver: 'memory' | 'file';
} {
  if (!filePath) {
    return { store: createPlatformStore(), persist: () => undefined, driver: 'memory' };
  }
  const loaded = readStore(filePath);
  const store = loaded ?? createPlatformStore();
  return {
    store,
    persist: () => writeStore(filePath, store),
    driver: 'file',
  };
}
