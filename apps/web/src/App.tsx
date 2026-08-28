import { useEffect, useRef, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Orders } from './components/Orders';
import { ProductionBoard } from './components/ProductionBoard';
import { Invoices } from './components/Invoices';
import { DesignStudio } from './components/DesignStudio';
import { Materials } from './components/Materials';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { ControlCenter } from './components/platform/ControlCenter';
import { PageTransition } from './components/ui/motion';
import { SplashScreen } from './components/SplashScreen';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { ForgotPassword } from './components/ForgotPassword';
import { ResetPassword } from './components/ResetPassword';
import {
  getAccessToken,
  AUTH_CHANGED_EVENT,
  AUTH_FAILURE_EVENT,
} from '@shared/utils/api';
import {
  currentPath,
  navigate,
  isRegisterPath,
  isForgotPasswordPath,
  isResetPasswordPath,
  isPublicAuthPath,
  isDeveloperPath,
  isPlatformPath,
  setNextPath,
} from '@shared/router';

/**
 * Authentication gate (Phase 8 fix):
 *  - `/login` is public.
 *  - `/` and every application route (incl. `/developer…`) require a stored
 *    access token; unauthenticated visits are redirected to `/login`
 *    (intended route preserved for post-login return).
 *  - Unrecoverable auth failures (server-rejected refresh rotation) clear
 *    credentials and return to `/login` via AUTH_FAILURE_EVENT.
 *  - The gate is the FIRST check only; API-level refresh/retry in
 *    `shared/utils/api` and `shared/api/developer` is untouched.
 */
function AppContent() {
  const { currentView, setView } = useApp();
  const [showSplash, setShowSplash] = useState(true);
  const [route, setRoute] = useState<string>(() => currentPath());
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getAccessToken()));
  // Deep-link handling must run only when the ROUTE changes. Keying it off
  // currentView as well would fight the URL-sync effect below (view change ->
  // stale '/developer' route -> forced back to developer view -> navigate
  // back -> loop), leaving the user unable to navigate away from Developer.
  const deepLinkedRoute = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

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

  // Route gate: public auth pages (/login, /register, /forgot-password,
  // /reset-password); everything else requires a session.
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

  if (!authed) {
    // Public authentication pages only — no application shell, no dashboard,
    // no authenticated API calls mount in this state (Phase 8 gate preserved).
    if (isRegisterPath(route)) return <Register />;
    if (isForgotPasswordPath(route)) return <ForgotPassword />;
    if (isResetPasswordPath(route)) return <ResetPassword />;
    return <Login />;
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'orders':
        return <Orders />;
      case 'production-board':
        return <ProductionBoard />;
      case 'invoices':
        return <Invoices />;
      case 'design-studio':
        return <DesignStudio />;
      case 'materials':
        return <Materials />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'developer':
        return <DeveloperDashboard />;
      case 'platform':
        return <ControlCenter />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout>
      <PageTransition viewKey={currentView}>{renderView()}</PageTransition>
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
