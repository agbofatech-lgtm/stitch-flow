import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ToastProvider } from './components/ui/Toast';
import {
  AUTH_CHANGED_EVENT,
  AUTH_FAILURE_EVENT,
  getAccessToken,
} from './shared/utils/api';
import {
  currentPath,
  navigate,
  isPublicAuthPath,
  isRegisterPath,
  isForgotPasswordPath,
  isResetPasswordPath,
  isDeveloperPath,
  isPlatformPath,
  isLandingPath,
  setNextPath,
  isDesignSystemPath,
} from '@shared/router';

/** Phase 12 — public landing experience, code-split from the app bundle. */
const LandingPage = lazy(() => import('./public/LandingPage'));
// Phase 18 Stage 5 — design-system showcase (public, static, no data)
const DesignSystemShowcase = lazy(() => import('./design-system/showcase/DesignSystemShowcase'));
/** Public auth pages — split so the entry chunk stays lean. */
const Login = lazy(() => import('./components/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./components/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./components/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/ResetPassword').then((m) => ({ default: m.ResetPassword })));
/** The entire authenticated application (Phase 12 code-split). */
const AuthenticatedApp = lazy(() => import('./AuthenticatedApp'));

/**
 * Authentication gate (Phase 8 fix, Phase 12 public entry):
 *  - `/` renders the public landing when signed out; the application when
 *    signed in. `/login`, `/register`, `/forgot-password`, `/reset-password`
 *    are public.
 *  - Every application route (incl. `/developer…`) requires a stored access
 *    token; unauthenticated visits are redirected to `/login` (intended route
 *    preserved for post-login return).
 *  - Unrecoverable auth failures (server-rejected refresh rotation) clear
 *    credentials and return to `/login` via AUTH_FAILURE_EVENT.
 *  - The gate is the FIRST check only; API-level refresh/retry in
 *    `shared/utils/api` and `shared/api/developer` is untouched.
 */
function AppContent() {
  const { currentView, setView } = useApp();
  const [route, setRoute] = useState<string>(() => currentPath());
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getAccessToken()));
  // Deep-link handling must run only when the ROUTE changes. Keying it off
  // currentView as well would fight the URL-sync effect below (view change ->
  // stale '/developer' route -> forced back to developer view -> navigate
  // back -> loop), leaving the user unable to navigate away from Developer.
  const deepLinkedRoute = useRef<string | null>(null);

  useEffect(() => {
    const onPop = () => setRoute(currentPath());
    const onChanged = () => setAuthed(Boolean(getAccessToken()));
    const onFailure = () => {
      setAuthed(false);
      navigate('/login', { replace: true });
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener(AUTH_CHANGED_EVENT, onChanged);
    window.addEventListener(AUTH_FAILURE_EVENT, onFailure);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener(AUTH_CHANGED_EVENT, onChanged);
      window.removeEventListener(AUTH_FAILURE_EVENT, onFailure);
    };
  }, []);

  // Route gate: public pages (landing + auth); everything else requires a
  // session.
  //
  // IMPORTANT: the `authed` state can lag one render behind a just-completed
  // sign-in/sign-out (event → setState → render ordering). Token storage is
  // the source of truth, so both redirect branches re-check it before acting;
  // the AUTH_CHANGED re-render then re-runs this gate with fresh state.
  useEffect(() => {
    if (isPublicAuthPath(route)) {
      // Signed-in users never stay on the auth pages.
      if (authed && getAccessToken()) navigate('/', { replace: true });
      return;
    }
    if (!authed) {
      if (getAccessToken()) return; // sign-in in flight; AUTH_CHANGED re-runs the gate
      if (isLandingPath(route)) return; // Phase 12 — public entry renders the landing
      if (isDesignSystemPath(route)) return; // Phase 18 Stage 5 — public component laboratory
      if (route !== '/') setNextPath(route);
      navigate('/login', { replace: true });
      return;
    }
    // Authenticated deep links into the developer console — applied once per
    // route change, never in reaction to in-app view changes (see ref note).
    if (deepLinkedRoute.current !== route) {
      deepLinkedRoute.current = route;
      if (isDeveloperPath(route)) setView('developer');
      else if (isPlatformPath(route)) setView('platform');
    }
  }, [route, authed, setView]);

  // Keep the URL meaningful for the gated routes while views are state-driven.
  // React ONLY to genuine view transitions (user navigation). Reacting to
  // authed/route flips as well races the post-login intended-route navigate
  // (path '/developer' + view still 'dashboard' would bounce back to '/').
  const prevView = useRef(currentView);
  useEffect(() => {
    if (!authed) return;
    const viewChanged = prevView.current !== currentView;
    prevView.current = currentView;
    if (!viewChanged) return;
    const p = currentPath();
    if (currentView === 'developer' && !isDeveloperPath(p)) navigate('/developer');
    else if (currentView === 'platform' && !isPlatformPath(p)) navigate('/platform');
    else if (
      currentView !== 'developer' &&
      currentView !== 'platform' &&
      (isDeveloperPath(p) || isPlatformPath(p))
    )
      navigate('/');
  }, [currentView, authed]);

  // Phase 18 Stage 5 — the design-system laboratory renders identically for
  // signed-in and anonymous visitors: it is static, mounts no workflows,
  // and connects to no production data.
  if (isDesignSystemPath(route)) {
    return (
      <Suspense fallback={null}>
        <DesignSystemShowcase />
      </Suspense>
    );
  }

  if (!authed) {
    // Public experience: landing + authentication pages only — no application
    // shell, no dashboard, no authenticated API calls mount in this state
    // (Phase 8 gate preserved).
    if (isLandingPath(route)) {
      return (
        <Suspense fallback={null}>
          <LandingPage />
        </Suspense>
      );
    }
    if (isRegisterPath(route)) {
      return (
        <Suspense fallback={null}>
          <Register />
        </Suspense>
      );
    }
    if (isForgotPasswordPath(route)) {
      return (
        <Suspense fallback={null}>
          <ForgotPassword />
        </Suspense>
      );
    }
    if (isResetPasswordPath(route)) {
      return (
        <Suspense fallback={null}>
          <ResetPassword />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={null}>
        <Login />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <AuthenticatedApp />
    </Suspense>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProvider>
  );
}
