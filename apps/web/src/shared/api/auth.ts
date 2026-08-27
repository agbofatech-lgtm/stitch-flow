import { apiPost, storeAuthTokens, clearAuthTokens, getRefreshToken } from '../utils/api';

/**
 * Auth API client (Phase 3). Mirrors apps/backend auth routes.
 * A login UI is future work; this module provides the complete client-side
 * authentication flow for it and for programmatic use.
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
  tier?: 'free' | 'pro' | 'enterprise';
}): Promise<AuthResult> {
  const result = await apiPost<AuthResult>('/auth/register', { tier: 'free', ...data });
  storeAuthTokens(result.accessToken, result.refreshToken);
  return result;
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const result = await apiPost<AuthResult>('/auth/login', { email, password });
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
