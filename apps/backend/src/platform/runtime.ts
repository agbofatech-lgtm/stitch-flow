import { newId, nowIso, slugify, type PlatformStore } from './store';
import { hashPassword, verifyPassword } from './passwords';
import { signAccessToken } from './tokens';
import { PlatformError } from './errors';
import { createCommercialService } from './commercial/service';
import { MUTABLE_CONTROL_KEYS } from './configuration';
import type {
  Identity,
  Membership,
  PublicIdentity,
  Tenant,
  TenantScopedRecord,
  TenantWorkspace,
  TrustedPlatformContext,
} from './types';

export { PlatformError };

function publicIdentity(identity: Identity): PublicIdentity {
  const { passwordHash: _pw, ...rest } = identity;
  return rest;
}

export function createPlatformRuntime(store: PlatformStore) {
  async function register(input: {
    email: string;
    password: string;
    displayName: string;
    tenantName?: string;
  }): Promise<{ identity: PublicIdentity; tenant: Tenant; workspace: TenantWorkspace; accessToken: string }> {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    if (!email || !email.includes('@')) {
      throw new PlatformError(400, 'INVALID_EMAIL', 'A valid email is required');
    }
    if (!displayName) {
      throw new PlatformError(400, 'INVALID_NAME', 'Display name is required');
    }
    if (!input.password || input.password.length < 8) {
      throw new PlatformError(400, 'INVALID_PASSWORD', 'Password must be at least 8 characters');
    }
    if (store.identitiesByEmail.has(email)) {
      throw new PlatformError(409, 'EMAIL_IN_USE', 'Email already exists');
    }

    const ts = nowIso();
    const identity: Identity = {
      id: newId(),
      email,
      displayName,
      passwordHash: await hashPassword(input.password),
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    const tenant: Tenant = {
      id: newId(),
      name: (input.tenantName || `${displayName}'s workspace`).trim(),
      slug: slugify(input.tenantName || displayName),
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    const workspace: TenantWorkspace = {
      id: newId(),
      tenantId: tenant.id,
      name: 'Default Workspace',
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
    };
    if (workspace.id === tenant.id) {
      throw new PlatformError(500, 'ID_COLLISION', 'Tenant and workspace ids must differ');
    }
    const membership: Membership = {
      id: newId(),
      identityId: identity.id,
      tenantId: tenant.id,
      role: 'TENANT_OWNER',
      status: 'active',
      joinedAt: ts,
    };

    store.identities.set(identity.id, identity);
    store.identitiesByEmail.set(email, identity.id);
    store.tenants.set(tenant.id, tenant);
    store.workspaces.set(workspace.id, workspace);
    store.memberships.set(membership.id, membership);

    return {
      identity: publicIdentity(identity),
      tenant,
      workspace,
      accessToken: signAccessToken(identity.id),
    };
  }

  async function login(input: { email: string; password: string }): Promise<{
    identity: PublicIdentity;
    accessToken: string;
  }> {
    const email = input.email.trim().toLowerCase();
    const id = store.identitiesByEmail.get(email);
    if (!id) {
      throw new PlatformError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    const identity = store.identities.get(id);
    if (!identity) {
      throw new PlatformError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    if (identity.status !== 'active') {
      throw new PlatformError(403, 'IDENTITY_INACTIVE', 'Identity is not active');
    }
    const match = await verifyPassword(input.password, identity.passwordHash);
    if (!match) {
      throw new PlatformError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }
    return { identity: publicIdentity(identity), accessToken: signAccessToken(identity.id) };
  }

  function getIdentity(identityId: string): Identity {
    const identity = store.identities.get(identityId);
    if (!identity) {
      throw new PlatformError(401, 'INVALID_TOKEN', 'Identity not found');
    }
    if (identity.status !== 'active') {
      throw new PlatformError(403, 'IDENTITY_INACTIVE', 'Identity is not active');
    }
    return identity;
  }

  function membershipsFor(identityId: string): Membership[] {
    return [...store.memberships.values()].filter(
      (m) => m.identityId === identityId && m.status !== 'removed'
    );
  }

  function defaultWorkspace(tenantId: string): TenantWorkspace {
    const ws = [...store.workspaces.values()].find((w) => w.tenantId === tenantId);
    if (!ws) {
      throw new PlatformError(500, 'WORKSPACE_MISSING', 'Tenant has no workspace');
    }
    return ws;
  }

  function resolveContext(identityId: string, requestedTenantId?: string): TrustedPlatformContext {
    const identity = getIdentity(identityId);
    const active = membershipsFor(identityId).filter((m) => m.status === 'active');
    if (active.length === 0) {
      const any = membershipsFor(identityId);
      if (any.some((m) => m.status === 'suspended')) {
        throw new PlatformError(403, 'MEMBERSHIP_SUSPENDED', 'Membership is suspended');
      }
      throw new PlatformError(403, 'MEMBERSHIP_MISSING', 'No tenant membership');
    }

    let membership = active[0];
    if (requestedTenantId) {
      const match = active.find((m) => m.tenantId === requestedTenantId);
      if (!match) {
        throw new PlatformError(403, 'TENANT_ISOLATION', 'Not a member of the requested tenant');
      }
      membership = match;
    } else if (active.length > 1) {
      throw new PlatformError(400, 'TENANT_REQUIRED', 'X-Tenant-Id is required when multiple memberships exist');
    }

    const tenant = store.tenants.get(membership.tenantId);
    if (!tenant) {
      throw new PlatformError(403, 'TENANT_MISSING', 'Tenant not found');
    }
    if (tenant.status !== 'active') {
      throw new PlatformError(403, 'TENANT_SUSPENDED', 'Tenant is not active');
    }

    return {
      identity: publicIdentity(identity),
      tenant,
      workspace: defaultWorkspace(tenant.id),
      membership,
    };
  }

  function assertTenantRecord(ctx: TrustedPlatformContext, recordId: string): TenantScopedRecord {
    const record = store.records.get(recordId);
    if (!record || record.tenantId !== ctx.tenant.id) {
      throw new PlatformError(403, 'TENANT_ISOLATION', 'Record is not visible in this tenant');
    }
    return record;
  }

  function createRecord(
    ctx: TrustedPlatformContext,
    input: { kind: string; payload?: Record<string, unknown> }
  ): TenantScopedRecord {
    const record: TenantScopedRecord = {
      id: newId(),
      tenantId: ctx.tenant.id,
      kind: input.kind || 'note',
      payload: input.payload || {},
      createdAt: nowIso(),
    };
    store.records.set(record.id, record);
    return record;
  }

  const commercial = createCommercialService(store);

  function grantPlatformOperator(identityId: string): void {
    if (!store.identities.has(identityId)) {
      throw new PlatformError(404, 'IDENTITY_MISSING', 'Identity not found');
    }
    store.platformOperators.add(identityId);
  }

  function isPlatformOperator(identityId: string): boolean {
    return store.platformOperators.has(identityId);
  }

  function listTenantsForControl() {
    return [...store.tenants.values()].map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      workspaceCount: [...store.workspaces.values()].filter((w) => w.tenantId === tenant.id).length,
      hasSubscription: [...store.subscriptions.values()].some((s) => s.tenantId === tenant.id),
    }));
  }

  function getConfiguration() {
    return store.configuration;
  }

  function patchConfiguration(patch: Record<string, unknown>, actorId: string) {
    for (const [key, value] of Object.entries(patch)) {
      if (!MUTABLE_CONTROL_KEYS.has(key)) {
        throw new PlatformError(403, 'CONFIG_IMMUTABLE', `Configuration key is not mutable: ${key}`);
      }
      if (key === 'disabledCapabilities' && !Array.isArray(value)) {
        throw new PlatformError(400, 'INVALID_CONFIG', 'disabledCapabilities must be an array');
      }
      const current = store.configuration[key];
      if (!current) {
        throw new PlatformError(404, 'CONFIG_MISSING', key);
      }
      const prev = JSON.stringify(current.value);
      current.value = value;
      store.commercialAudit.push({
        id: newId(),
        tenantId: '',
        actorId,
        eventId: null,
        source: 'control-center',
        previousState: prev,
        newState: JSON.stringify(value),
        timestamp: nowIso(),
      });
    }
    return store.configuration;
  }

  return {
    store,
    register,
    login,
    getIdentity,
    publicIdentity,
    resolveContext,
    assertTenantRecord,
    createRecord,
    commercial,
    grantPlatformOperator,
    isPlatformOperator,
    listTenantsForControl,
    getConfiguration,
    patchConfiguration,
  };
}

export type PlatformRuntime = ReturnType<typeof createPlatformRuntime>;
