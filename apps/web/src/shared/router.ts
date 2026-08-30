/**
 * Minimal path router helpers for the authentication gate (Phase 8 fix).
 *
 * The app remains state-driven for its business views; these helpers only
 * give the SPA the three URL families the auth gate needs:
 *   /login        public
 *   /developer…   protected (maps to the Developer view)
 *   everything else (incl. /) protected
 * Navigation uses the History API so deep links and redirects work under the
 * PWA navigateFallback and the preview proxy.
 */

export function currentPath(): string {
  try {
    return window.location.pathname || '/';
  } catch {
    return '/';
  }
}

export function navigate(path: string, opts?: { replace?: boolean }): void {
  try {
    if (opts?.replace) window.history.replaceState({}, '', path);
    else window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch {
    // navigation must never crash the app
  }
}

export function isLoginPath(p: string): boolean {
  return p === '/login' || p.startsWith('/login/');
}

/* Phase 9: public authentication family (no session required). */
export function isRegisterPath(p: string): boolean {
  return p === '/register' || p.startsWith('/register/');
}

export function isForgotPasswordPath(p: string): boolean {
  return p === '/forgot-password' || p.startsWith('/forgot-password/');
}

export function isResetPasswordPath(p: string): boolean {
  return p === '/reset-password' || p.startsWith('/reset-password/');
}

/** Any of the public auth pages — reachable without a session. */
export function isPublicAuthPath(p: string): boolean {
  return isLoginPath(p) || isRegisterPath(p) || isForgotPasswordPath(p) || isResetPasswordPath(p);
}

export function isDeveloperPath(p: string): boolean {
  return p === '/developer' || p.startsWith('/developer/');
}

/**
 * Phase 10 — Developer Control Center path family. The route gate treats it
 * like every other protected route; the platform ROLE check is enforced
 * server-side on every API call (the UI hint is cosmetic only).
 */
export function isPlatformPath(p: string): boolean {
  return p === '/platform' || p.startsWith('/platform/');
}

/* Intended-route memory so post-login lands where the user was headed. */
const NEXT_KEY = 'stitchflow.auth.next';

export function setNextPath(p: string): void {
  try {
    window.sessionStorage.setItem(NEXT_KEY, p);
  } catch {
    // storage unavailable — land on '/'
  }
}

/** Phase 12 — the public landing experience (unauthenticated entry). */
export function isLandingPath(p: string): boolean {
  return p === '/' || p === '/index.html';
}

export function takeNextPath(): string | null {
  try {
    const v = window.sessionStorage.getItem(NEXT_KEY);
    window.sessionStorage.removeItem(NEXT_KEY);
    return v;
  } catch {
    return null;
  }
}

/** Phase 18 Stage 5 — controlled design-system showcase (component
 *  laboratory). Public + static: renders no production data, mounts no
 *  authenticated API calls. This is the ONLY screen-level Stage 5 surface. */
export function isDesignSystemPath(p: string): boolean {
  return p === '/design-system' || p.startsWith('/design-system/');
}
