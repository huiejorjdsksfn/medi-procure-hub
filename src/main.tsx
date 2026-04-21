/**
 * ProcurBosse — Main Entry v22.6
 * Fast boot: mount React immediately, redirect to /login
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Mount immediately — no delays
const rootEl = document.getElementById('root') || (() => {
  const el = document.createElement('div');
  el.id = 'root';
  document.body.appendChild(el);
  return el;
})();

createRoot(rootEl).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// SW cache buster — runs after app is mounted (non-blocking)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(r => r.update()).catch(() => {});
}

// LiveDatabaseEngine — deferred, never blocks boot
setTimeout(() => {
  import('./engines/db/LiveDatabaseEngine')
    .then(({ liveDbEngine }) => { try { liveDbEngine.start(60_000); } catch {} })
    .catch(() => {});
}, 6000);
