import { useEffect, useState } from 'react';
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

function AppContent() {
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
