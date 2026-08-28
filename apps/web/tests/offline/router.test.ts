/**
 * Phase 9 — auth router path predicates used by the gate (pure functions;
 * the sessionStorage next-path round-trip is verified in the real-browser
 * certification instead, since this suite runs in a node environment).
 */
import { describe, it, expect } from 'vitest';
import {
  isLoginPath,
  isRegisterPath,
  isForgotPasswordPath,
  isResetPasswordPath,
  isPublicAuthPath,
  isDeveloperPath,
} from '../../src/shared/router';

describe('public auth path family', () => {
  it('recognizes /login', () => {
    expect(isLoginPath('/login')).toBe(true);
    expect(isLoginPath('/login/')).toBe(true);
    expect(isLoginPath('/loginfoo')).toBe(false);
  });

  it('recognizes /register, /forgot-password, /reset-password', () => {
    expect(isRegisterPath('/register')).toBe(true);
    expect(isRegisterPath('/register/')).toBe(true);
    expect(isForgotPasswordPath('/forgot-password')).toBe(true);
    expect(isResetPasswordPath('/reset-password')).toBe(true);
    expect(isResetPasswordPath('/reset-password/x')).toBe(true);
  });

  it('isPublicAuthPath covers exactly the auth family', () => {
    for (const p of ['/login', '/register', '/forgot-password', '/reset-password']) {
      expect(isPublicAuthPath(p)).toBe(true);
    }
    for (const p of ['/', '/developer', '/settings', '/customers', '/reset', '/registers', '/loginx']) {
      expect(isPublicAuthPath(p)).toBe(false);
    }
  });

  it('developer path matches /developer and deep links but not lookalikes', () => {
    expect(isDeveloperPath('/developer')).toBe(true);
    expect(isDeveloperPath('/developer/keys/abc')).toBe(true);
    expect(isDeveloperPath('/developers')).toBe(false);
    expect(isDeveloperPath('/')).toBe(false);
  });
});
