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

export function isDeveloperPath(p: string): boolean {
  return p === '/developer' || p.startsWith('/developer/');
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

export function takeNextPath(): string | null {
  try {
    const v = window.sessionStorage.getItem(NEXT_KEY);
    window.sessionStorage.removeItem(NEXT_KEY);
    return v;
  } catch {
    return null;
  }
}
