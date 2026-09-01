import { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { SplashScreen } from './components/SplashScreen';
import { StudioShell } from './studio/StudioShell';
import { WorkflowProvider } from './workflow/WorkflowContext';

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return (
      <SplashScreen
        isReady
        minDuration={700}
        maxDuration={1600}
        onComplete={() => setShowSplash(false)}
      />
    );
  }

  return (
    <WorkflowProvider>
      <StudioShell />
    </WorkflowProvider>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
