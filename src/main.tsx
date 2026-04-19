/**
 * ProcurBosse — Main Entry Point v21.4 NUCLEAR
 * LiveDatabaseEngine wrapped in try/catch — never crashes the app
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Safely start LiveDatabaseEngine - wrapped so it NEVER crashes app boot
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      try {
        import('./engines/db/LiveDatabaseEngine').then(({ liveDbEngine }) => {
          try { liveDbEngine.start(60_000); } catch (e) { console.warn('[LiveDB] start failed:', e); }
        }).catch(e => console.warn('[LiveDB] import failed:', e));
      } catch (e) { console.warn('[LiveDB] engine error:', e); }
    }, 5000); // 5s delay — let auth fully settle first
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      try {
        import('./engines/db/LiveDatabaseEngine').then(({ liveDbEngine }) => {
          if (!liveDbEngine.isRunning()) liveDbEngine.start(60_000);
        }).catch(() => {});
      } catch {}
    }
  });
}

// Mount React app - this must NEVER fail
const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  console.error('[CRITICAL] #root element not found');
}
