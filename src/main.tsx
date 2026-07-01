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
import { netEngine } from './lib/networkEngine';

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

// ── Warm up connections to Supabase before the first request needs them ───────
if (typeof window !== 'undefined') {
  const SUPA_URL = (supabase as any).supabaseUrl || 'https://yvjfehnzbzjliizjvuhq.supabase.co';
  netEngine.preconnect(SUPA_URL);
  netEngine.preconnect(SUPA_URL.replace('.supabase.co', '.functions.supabase.co'));
}

// ── Offline/Online cache sync ─────────────────────────────────────────────────
async function replayOfflineQueue(trigger: string) {
  console.info(`[ERP] ${trigger} — replaying offline queue...`);
  const result = await OfflineEngine.replayQueue(supabase);
  if (result.replayed > 0) {
    console.info(`[ERP] Replayed ${result.replayed} offline mutations`);
    // Clear stale list caches so pages refetch fresh data
    await ERPCache.delPrefix('requisitions');
    await ERPCache.delPrefix('purchase_orders');
    await ERPCache.delPrefix('kpis');
  }
  return result;
}

if (typeof window !== 'undefined') {
  OfflineEngine.registerListeners(
    // Back online: replay queued mutations + invalidate stale cache
    () => replayOfflineQueue('Back online'),
    // Gone offline: log it
    () => { console.info('[ERP] Went offline — cache engine active'); }
  );
}

// Service Worker v6.0 uses Background Sync to wake the app even if the tab
// was closed when connectivity returned; it can't hold Supabase credentials
// itself so it posts a message asking the (now-open, authenticated) app to
// do the actual replay.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'REPLAY_OFFLINE_QUEUE') {
      replayOfflineQueue('Background Sync woke the app').catch(() => {});
    }
  });
  window.addEventListener('load', () => {
    console.log('[PWA] Service worker support detected');
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
