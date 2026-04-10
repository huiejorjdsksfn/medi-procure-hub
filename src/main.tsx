import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { liveDbEngine } from './engines/db/LiveDatabaseEngine';

// ── Start LiveDatabaseEngine on app init (60s auto-cycle) ────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    // Delay first run by 3s to let auth settle
    setTimeout(() => liveDbEngine.start(60_000), 3000);
  });

  // Pause engine when tab is hidden (save battery/requests)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) liveDbEngine.stop();
    else if (!liveDbEngine.isRunning()) liveDbEngine.start(60_000);
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[PWA] Service worker support detected');
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
