/**
 * Phase 10 — Control Center frontend unit coverage (pure functions).
 *
 * The vitest suite runs in a NODE environment (no DOM/localStorage), so
 * token-derived helpers are exercised through their pure inputs; the
 * role-gated rendering, deep-link restore and 403 UX are proven in the
 * real-browser certification (real Chromium vs real backend).
 */
import { describe, it, expect } from 'vitest';
import { isPlatformPath } from '../../src/shared/router';
import { PLATFORM_ROLES, isPlatformRole } from '../../src/shared/utils/api';
import { PlatformApiError } from '../../src/shared/api/platform';

describe('platform path family', () => {
  it('matches /platform and sub-paths', () => {
    expect(isPlatformPath('/platform')).toBe(true);
    expect(isPlatformPath('/platform/customers')).toBe(true);
    expect(isPlatformPath('/platform/audit/xyz')).toBe(true);
  });

  it('does not match lookalikes or other protected families', () => {
    expect(isPlatformPath('/platforms')).toBe(false);
    expect(isPlatformPath('/')).toBe(false);
    expect(isPlatformPath('/developer')).toBe(false);
    expect(isPlatformPath('/login')).toBe(false);
  });
});

describe('platform role UX hint', () => {
  it('recognizes exactly the platform roles (plus documented legacy admin)', () => {
    for (const r of ['platform_owner', 'platform_admin', 'platform_support', 'platform_analyst', 'admin']) {
      expect(isPlatformRole(r)).toBe(true);
    }
    expect([...PLATFORM_ROLES]).toEqual([
      'platform_owner',
      'platform_admin',
      'platform_support',
      'platform_analyst',
      'admin',
    ]);
  });

  it('workspace roles never satisfy the hint (workspace owner ≠ platform admin)', () => {
    for (const r of ['user', 'owner', 'staff', 'assistant', '', null, undefined]) {
      expect(isPlatformRole(r as string | null | undefined)).toBe(false);
    }
  });
});

describe('PlatformApiError', () => {
  it('carries status, code and message for meaningful UX states', () => {
    const e = new PlatformApiError(403, 'FORBIDDEN', 'Platform role required');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
    expect(e.message).toBe('Platform role required');
  });
});
