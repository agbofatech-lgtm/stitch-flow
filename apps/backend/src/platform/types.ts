export type IdentityStatus = 'active' | 'inactive';
export type TenantStatus = 'active' | 'suspended';
export type WorkspaceStatus = 'active';
export type MembershipStatus = 'active' | 'suspended' | 'removed';
export type PlatformRole = 'TENANT_OWNER' | 'STAFF';

export type Identity = {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  status: IdentityStatus;
  createdAt: string;
  updatedAt: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
};

export type TenantWorkspace = {
  id: string;
  tenantId: string;
  name: string;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
};

export type Membership = {
  id: string;
  identityId: string;
  tenantId: string;
  role: PlatformRole;
  status: MembershipStatus;
  joinedAt: string;
};

/** Platform-owned isolation fixture. Not a shop Customer. */
export type TenantScopedRecord = {
  id: string;
  tenantId: string;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type PublicIdentity = Omit<Identity, 'passwordHash'>;

export type TrustedPlatformContext = {
  identity: PublicIdentity;
  tenant: Tenant;
  workspace: TenantWorkspace;
  membership: Membership;
};

export type AccessTokenPayload = {
  sub: string;
  typ: 'access';
};
