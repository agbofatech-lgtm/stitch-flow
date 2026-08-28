import { apiPost, storeAuthTokens, clearAuthTokens, getRefreshToken } from '../utils/api';

/**
 * Auth API client. Mirrors apps/backend auth routes.
 *
 * Phase 9 — commercial identity:
 *  - login accepts a single identifier (email OR phone number);
 *  - registration accepts an optional phone number (normalized server-side);
 *  - account recovery (forgot/reset) is available without a session.
 */
export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
};

export type AuthWorkspace = { id: string; name: string };

export type AuthResult = {
  user: AuthUser;
  workspace?: AuthWorkspace;
  accessToken: string;
  refreshToken: string;
};

export async function register(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  tier?: 'free' | 'pro' | 'enterprise';
}): Promise<AuthResult> {
  const result = await apiPost<AuthResult>('/auth/register', { tier: 'free', ...data });
  storeAuthTokens(result.accessToken, result.refreshToken);
  return result;
}

/** Sign in with an email address OR a phone number (single identifier field). */
export async function login(identifier: string, password: string): Promise<AuthResult> {
  const result = await apiPost<AuthResult>('/auth/login', { identifier, password });
  storeAuthTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await apiPost('/auth/logout', { refreshToken });
    } catch {
      // revocation is best-effort from the client; tokens are cleared anyway
    }
  }
  clearAuthTokens();
}

/** Request a password-reset link. Response never reveals account existence. */
export async function forgotPassword(identifier: string): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>('/auth/forgot-password', { identifier });
}

/** Complete recovery with the single-use token from the reset link. */
export async function resetPassword(token: string, password: string): Promise<{ success: boolean; message?: string }> {
  return apiPost<{ success: boolean; message?: string }>('/auth/reset-password', { token, password });
}

/**
 * Customer-facing error text for auth flows. Maps transport/HTTP failures to
 * calm, non-technical copy; never surfaces stack traces or internal codes.
 */
export function authErrorText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  if (/HTTP 401/.test(msg)) return 'Invalid email or password.';
  if (/HTTP 403/.test(msg)) return 'This account is not active. Contact StitchFlow support if this seems wrong.';
  if (/HTTP 404/.test(msg)) return 'Email already in use.';
  if (/HTTP 409/.test(msg)) return 'An account with these details already exists. Try signing in instead.';
  if (/HTTP 429/.test(msg)) return 'Too many attempts. Please wait a few minutes and try again.';
  if (/HTTP 4\d\d/.test(msg)) return 'Please check the details you entered and try again.';
  if (/HTTP 5\d\d/.test(msg)) return 'StitchFlow is having a temporary problem. Please try again shortly.';
  if (!/HTTP \d/.test(msg)) return 'Cannot reach StitchFlow right now. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}
