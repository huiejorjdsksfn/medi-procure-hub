/**
 * ProcurBosse — Main Entry v22.5 NUCLEAR
 * Clean boot — no dynamic imports at startup
 * Service worker cache buster
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Register / update service worker to clear old caches
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        // Force update check
        reg.update();
        // Listen for SW telling us to reload
        navigator.serviceWorker.addEventListener('message', ev => {
          if (ev.data?.type === 'SW_UPDATED') {
            console.log('[App] SW updated — fresh content loaded');
          }
        });
      })
      .catch(e => console.warn('[SW] register failed:', e));
  });
}

// Start LiveDatabaseEngine after app is stable (5s delay)
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      import('./engines/db/LiveDatabaseEngine')
        .then(({ liveDbEngine }) => {
          try { liveDbEngine.start(60_000); } catch {}
        })
        .catch(() => {});
    } catch {}
  }, 5000);
});

// Mount React — this is the ONLY critical path
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  // If root is missing, inject it and try again
  const el = document.createElement('div');
  el.id = 'root';
  document.body.appendChild(el);
  createRoot(el).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
