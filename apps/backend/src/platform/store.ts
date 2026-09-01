import { randomUUID } from 'crypto';
import type {
  Identity,
  Membership,
  Tenant,
  TenantScopedRecord,
  TenantWorkspace,
} from './types';
import type {
  CommercialAudit,
  PlanDefinition,
  PriceDefinition,
  ProcessedBillingEvent,
  SaasPayment,
  Subscription,
} from './commercial/types';
import { defaultPlatformConfiguration, type PlatformConfiguration } from './configuration';

export type PlatformStore = {
  identities: Map<string, Identity>;
  identitiesByEmail: Map<string, string>;
  tenants: Map<string, Tenant>;
  workspaces: Map<string, TenantWorkspace>;
  memberships: Map<string, Membership>;
  records: Map<string, TenantScopedRecord>;
  plans: Map<string, PlanDefinition>;
  prices: Map<string, PriceDefinition>;
  subscriptions: Map<string, Subscription>;
  payments: Map<string, SaasPayment>;
  billingEvents: Map<string, ProcessedBillingEvent>;
  commercialAudit: CommercialAudit[];
  platformOperators: Set<string>;
  configuration: PlatformConfiguration;
  /** tenantId → last successfully processed billing event occurredAt */
  billingWatermark: Map<string, string>;
};

export function createPlatformStore(): PlatformStore {
  return {
    identities: new Map(),
    identitiesByEmail: new Map(),
    tenants: new Map(),
    workspaces: new Map(),
    memberships: new Map(),
    records: new Map(),
    plans: new Map(),
    prices: new Map(),
    subscriptions: new Map(),
    payments: new Map(),
    billingEvents: new Map(),
    commercialAudit: [],
    platformOperators: new Set(),
    configuration: defaultPlatformConfiguration(),
    billingWatermark: new Map(),
  };
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return randomUUID();
}

export function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return `${base || 'tenant'}-${newId().slice(0, 8)}`;
}
