/**
 * Phase 8 — Developer API scope catalogue (§13).
 *
 * ENFORCEABLE scopes are backed by live /api/v1 endpoints in this phase.
 * RESERVED scopes are part of the canonical catalogue but NOT grantable
 * until their subsystem ships (webhooks/integrations checkpoints); creating
 * a key with a reserved scope is rejected so that a granted scope is always
 * an enforced scope. No wildcard scope exists.
 */
export const ENFORCEABLE_SCOPES = [
  'customers:read',
  'customers:write',
  'orders:read',
  'measurements:read',
  'inventory:read',
  'reports:read',
  'usage:read',
] as const;

export const RESERVED_SCOPES = [
  'orders:write',
  'inventory:write',
  'measurements:write',
  'webhooks:manage',
  'integrations:manage',
] as const;

export type EnforceableScope = (typeof ENFORCEABLE_SCOPES)[number];

export const API_KEY_PREFIX_HEADER = 'sf_live_';

export function isValidScopeList(scopes: unknown): scopes is string[] {
  if (!Array.isArray(scopes) || scopes.length === 0) return false;
  const seen = new Set<string>();
  for (const s of scopes) {
    if (typeof s !== 'string') return false;
    if (!(ENFORCEABLE_SCOPES as readonly string[]).includes(s)) return false;
    if (seen.has(s)) return false;
    seen.add(s);
  }
  return true;
}

export function isReservedScope(scope: unknown): boolean {
  return typeof scope === 'string' && (RESERVED_SCOPES as readonly string[]).includes(scope);
}
