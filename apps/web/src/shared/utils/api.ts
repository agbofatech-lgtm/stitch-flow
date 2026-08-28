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

/** Dispatched whenever tokens are stored/cleared — the route gate listens. */
export const AUTH_CHANGED_EVENT = 'stitchflow:auth-changed';
/**
 * Dispatched when the server explicitly rejects a refresh-token rotation
 * (401/403): authentication is unrecoverable and the gate returns the user
 * to /login. Network failures do NOT dispatch this (offline-first).
 */
export const AUTH_FAILURE_EVENT = 'stitchflow:auth-unrecoverable';

function dispatchAuthEvent(name: string): void {
  try {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
  } catch {
    // non-browser context (tests) — ignore
  }
}

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
    dispatchAuthEvent(AUTH_CHANGED_EVENT);
  } catch {
    // storage unavailable (private mode etc.) — session-only auth
  }
}

export function clearAuthTokens() {
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    dispatchAuthEvent(AUTH_CHANGED_EVENT);
  } catch {
    // ignore
  }
}

/**
 * Reads the workspaceId claim from the stored access token (base64 decode,
 * client-side only; the server never trusts this and re-verifies membership
 * on every request). Used to scope local sync state after login.
 */
export function getAuthWorkspaceId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.workspaceId === 'string' ? payload.workspaceId : null;
  } catch {
    return null;
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

export async function tryRefreshTokens(fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const sentRefresh = getRefreshToken();
      if (!sentRefresh) return false;
      try {
        const res = await fetchImpl(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: sentRefresh }),
        });
        if (!res.ok) {
          // Refresh rotation race: another refresher (e.g. the developer
          // client's rotate-once-on-401) may have already swapped the tokens,
          // leaving this call with a stale refresh token. If storage now holds
          // a different refresh token, treat the race as won elsewhere and let
          // callers retry with the fresh tokens instead of signing out.
          const currentRefresh = getRefreshToken();
          if (currentRefresh && currentRefresh !== sentRefresh) return true;
          // Explicit server rejection of the refresh token means the session
          // is unrecoverable: clear credentials and let the route gate return
          // the user to /login. Offline/network failures keep tokens instead.
          if (res.status === 401 || res.status === 403) {
            clearAuthTokens();
            dispatchAuthEvent(AUTH_FAILURE_EVENT);
          }
          return false;
        }
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
