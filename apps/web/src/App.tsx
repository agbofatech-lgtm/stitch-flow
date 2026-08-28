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
import { SplashScreen } from './components/SplashScreen';
import { Login } from './components/Login';
import {
  getAccessToken,
  AUTH_CHANGED_EVENT,
  AUTH_FAILURE_EVENT,
} from '@shared/utils/api';
import {
  currentPath,
  navigate,
  isLoginPath,
  isDeveloperPath,
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

  // Route gate: public /login; everything else requires a session.
  useEffect(() => {
    if (isLoginPath(route)) {
      if (authed) navigate('/', { replace: true });
      return;
    }
    if (!authed) {
      if (route !== '/') setNextPath(route);
      navigate('/login', { replace: true });
      return;
    }
    // Authenticated deep links into the developer console — applied once per
    // route change, never in reaction to in-app view changes (see ref note).
    if (deepLinkedRoute.current !== route) {
      deepLinkedRoute.current = route;
      if (isDeveloperPath(route)) setView('developer');
    }
  }, [route, authed, setView]);

  // Keep the URL meaningful for the gated routes while views are state-driven.
  useEffect(() => {
    if (!authed) return;
    const p = currentPath();
    if (currentView === 'developer' && !isDeveloperPath(p)) navigate('/developer');
    else if (currentView !== 'developer' && isDeveloperPath(p)) navigate('/');
  }, [currentView, authed]);

  if (!authed) {
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
      default:
        return <Dashboard />;
    }
  };

  return <Layout>{renderView()}</Layout>;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
