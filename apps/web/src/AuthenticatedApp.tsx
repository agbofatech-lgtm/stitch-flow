/**
 * Authenticated application tree, lazy-loaded so the public experience and
 * auth pages never ship the dashboard/studio/platform bundles. Behavior is
 * byte-for-byte the previous authenticated branch of App.tsx.
 */
import { useEffect, useState } from 'react';
import { useApp } from './context/AppContext';
import { WorkspaceShell } from './shell/WorkspaceShell';
import { HomeView } from './modules/workspace/HomeView';
import { CustomersView } from './modules/customers/CustomersView';
import { Orders } from './components/Orders';
import { ProductionView } from './modules/production/ProductionView'; // Stage 10 (legacy components/ProductionBoard.tsx retained)
import { FinanceView } from './modules/finance/FinanceView'; // Stage 10 (legacy components/Invoices.tsx retained; InvoiceModal reused)
import { DesignStudio } from './components/DesignStudio';
import { Materials } from './components/Materials';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { DeveloperDashboard } from './components/DeveloperDashboard';
import { ControlCenter } from './components/platform/ControlCenter';
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
      <PageTransition viewKey={currentView}>{renderView()}</PageTransition>
    </WorkspaceShell>
  );
}
