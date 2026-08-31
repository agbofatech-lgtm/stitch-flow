import { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { SplashScreen } from './components/SplashScreen';
import { StudioShell } from './studio/StudioShell';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1800);
    return () => window.clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return <StudioShell />;
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
