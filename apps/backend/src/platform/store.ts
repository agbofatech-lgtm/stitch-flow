import { randomUUID } from 'crypto';
import type {
  Identity,
  Membership,
  Tenant,
  TenantScopedRecord,
  TenantWorkspace,
} from './types';

export type PlatformStore = {
  identities: Map<string, Identity>;
  identitiesByEmail: Map<string, string>;
  tenants: Map<string, Tenant>;
  workspaces: Map<string, TenantWorkspace>;
  memberships: Map<string, Membership>;
  records: Map<string, TenantScopedRecord>;
};

export function createPlatformStore(): PlatformStore {
  return {
    identities: new Map(),
    identitiesByEmail: new Map(),
    tenants: new Map(),
    workspaces: new Map(),
    memberships: new Map(),
    records: new Map(),
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
