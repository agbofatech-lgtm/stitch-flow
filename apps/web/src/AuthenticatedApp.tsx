/**
 * Authenticated application tree, lazy-loaded so the public experience and
 * auth pages never ship the dashboard/studio/platform bundles. Behavior is
 * byte-for-byte the previous authenticated branch of App.tsx.
 */
import { lazy, Suspense, useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { WorkspaceShell } from './shell/WorkspaceShell';
import { HomeView } from './modules/workspace/HomeView';
import { CustomersView } from './modules/customers/CustomersView';
/* Stage 13 performance: secondary/heavy surfaces load on demand. All split
   chunks remain PWA-precached by the existing sw glob — offline behavior is
   unchanged; only the initial authenticated payload shrinks. Core daily
   flows (Home/Customers/Production/Finance) stay eagerly loaded. */
const Orders = lazy(() => import('./components/Orders').then((m) => ({ default: m.Orders })));
const ProductionView = lazy(() => import('./modules/production/ProductionView').then((m) => ({ default: m.ProductionView }))); // Stage 10 (legacy components/ProductionBoard.tsx retained)
const FinanceView = lazy(() => import('./modules/finance/FinanceView').then((m) => ({ default: m.FinanceView }))); // Stage 10 (legacy components/Invoices.tsx retained; InvoiceModal reused)
const DesignStudio = lazy(() => import('./components/DesignStudio').then((m) => ({ default: m.DesignStudio })));
const Materials = lazy(() => import('./components/Materials').then((m) => ({ default: m.Materials })));
const Reports = lazy(() => import('./components/Reports').then((m) => ({ default: m.Reports })));
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })));
const DeveloperDashboard = lazy(() => import('./components/DeveloperDashboard').then((m) => ({ default: m.DeveloperDashboard })));
const ControlCenter = lazy(() => import('./components/platform/ControlCenter').then((m) => ({ default: m.ControlCenter })));
import { PageTransition } from './components/ui/motion';
import { SplashScreen } from './components/SplashScreen';

export default function AuthenticatedApp() {
  const { currentView } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <HomeView />;
      case 'customers':
        return <CustomersView />;
      case 'orders':
        return <Orders />;
      case 'production-board':
        return <ProductionView />;
      case 'invoices':
        return <FinanceView />;
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
        return <HomeView />;
    }
  };

  return (
    <WorkspaceShell>
      <PageTransition viewKey={currentView}>
        <Suspense fallback={<div className="mx-auto flex max-w-6xl flex-col gap-4 py-10" data-view-loading="true"><div className="h-8 w-48 animate-pulse rounded-lg bg-ds-subtle" /><div className="h-40 animate-pulse rounded-2xl bg-ds-subtle" /></div>}>
          {renderView()}
        </Suspense>
      </PageTransition>
    </WorkspaceShell>
  );
}
