import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { liveDbEngine } from './engines/db/LiveDatabaseEngine';
import { ERPCache } from './lib/erp-cache/index';
import { OfflineEngine } from './lib/erp-cache/offlineEngine';
import { supabase } from './integrations/supabase/client';
import { ERPEngine } from './engines/index';
import { WorkflowEngine } from './engines/workflow/WorkflowEngine';
import { PrintEngine } from './engines/print/PrintEngine';
import { ValidationEngine } from './engines/validation/ValidationEngine';
import { default as createFormEngine } from './engines/forms/FormEngine';
import { useRealIP as _useRealIP } from './hooks/useRealIP';

// Expose all engines globally for debugging + prevent tree-shaking
(window as any).__EL5 = {
  Engine: ERPEngine,
  Workflow: WorkflowEngine,
  Print: PrintEngine,
  Validate: ValidationEngine,
  Form: createFormEngine,
  realIP: _useRealIP,
};

// ── Start LiveDatabaseEngine ──────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => liveDbEngine.start(60_000), 3000);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) liveDbEngine.stop();
    else if (!liveDbEngine.isRunning()) liveDbEngine.start(60_000);
  });
}

// ── Offline/Online cache sync ─────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  OfflineEngine.registerListeners(
    // Back online: replay queued mutations + invalidate stale cache
    async () => {
      console.info('[ERP] Back online — replaying offline queue...');
      const result = await OfflineEngine.replayQueue(supabase);
      if (result.replayed > 0) {
        console.info(`[ERP] Replayed ${result.replayed} offline mutations`);
        // Clear stale list caches so pages refetch fresh data
        await ERPCache.delPrefix('requisitions');
        await ERPCache.delPrefix('purchase_orders');
        await ERPCache.delPrefix('kpis');
      }
    },
    // Gone offline: log it
    () => { console.info('[ERP] Went offline — cache engine active'); }
  );
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
