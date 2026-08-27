export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Client auth token handling (Phase 3).
 *
 * Access + refresh tokens are kept in localStorage so the offline-first app
 * can resume authenticated sync after a restart. JWTs contain identity/scope
 * claims only (no secrets); the refresh token is revocable and rotated
 * server-side on every use.
 *
 * Offline behavior: when unauthenticated or offline these helpers simply
 * fail, and every caller already degrades gracefully to local data.
 */
const ACCESS_TOKEN_KEY = 'stitchflow.auth.accessToken';
const REFRESH_TOKEN_KEY = 'stitchflow.auth.refreshToken';

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeAuthTokens(accessToken: string, refreshToken: string) {
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // storage unavailable (private mode etc.) — session-only auth
  }
}

export function clearAuthTokens() {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Attempts a refresh-token rotation. Serialized so concurrent 401s trigger a
 * single refresh. On failure the queue of local work is NOT discarded — the
 * caller simply stays in offline/unauthenticated mode.
 */
export async function refreshAuthTokens(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  return tryRefreshTokens(fetchImpl);
}

async function tryRefreshTokens(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const res = await fetchImpl(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.accessToken && data.refreshToken) {
          storeAuthTokens(data.accessToken, data.refreshToken);
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

async function request(url: string, init: RequestInit, retryOn401 = true): Promise<Response> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: { ...(init.headers as Record<string, string>), ...getAuthHeaders() },
  });

  if (res.status === 401 && retryOn401 && getRefreshToken()) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return request(url, init, false);
    }
  }

  return res;
}

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await request(url, {});
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPost<T = unknown>(url: string, data: unknown): Promise<T> {
  const res = await request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPut<T = unknown>(url: string, data: unknown): Promise<T> {
  const res = await request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await request(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({} as T));
}

export async function parseJson<T>(response: Response): Promise<T> {
  return response.json();
}
