import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { ERPCache } from './lib/erp-cache/index';
import { OfflineEngine } from './lib/erp-cache/offlineEngine';
import { supabase } from './integrations/supabase/client';
import { netEngine } from './lib/networkEngine';

// ── Mount React FIRST — nothing below this line blocks first paint. ───────────
// Previously this file eagerly imported ERPEngine, WorkflowEngine, PrintEngine,
// ValidationEngine, and FormEngine at the top purely to expose them on
// window.__EL5 for console debugging — meaning the browser had to download,
// parse, and execute every one of those (and their transitive deps) BEFORE
// React ever rendered anything. None of that is needed for first paint, so
// it's now deferred to an idle callback after the app is already on screen.
createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

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

// ── Deferred: debug-only engine globals (window.__EL5) ─────────────────────────
// Loaded once the browser is idle post-first-paint instead of blocking it.
function loadDebugEngines() {
  Promise.all([
    import('./engines/index'),
    import('./engines/workflow/WorkflowEngine'),
    import('./engines/print/PrintEngine'),
    import('./engines/validation/ValidationEngine'),
    import('./engines/forms/FormEngine'),
    import('./hooks/useRealIP'),
  ]).then(([erp, workflow, print, validation, formMod, ipMod]) => {
    (window as any).__EL5 = {
      Engine: (erp as any).ERPEngine,
      Workflow: (workflow as any).WorkflowEngine,
      Print: (print as any).PrintEngine,
      Validate: (validation as any).ValidationEngine,
      Form: (formMod as any).default,
      realIP: (ipMod as any).useRealIP,
    };
  }).catch((e) => console.warn('[ERP] Debug engine preload skipped:', e));
}

// ── Deferred: LiveDatabaseEngine health monitor ────────────────────────────────
// Not needed for the very first render — the app works fine before its first
// 60s heartbeat cycle. Deferring its (larger) module keeps it off the
// critical path too.
function startLiveDb() {
  import('./engines/db/LiveDatabaseEngine').then(({ liveDbEngine }) => {
    liveDbEngine.start(60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) liveDbEngine.stop();
      else if (!liveDbEngine.isRunning()) liveDbEngine.start(60_000);
    });
  });
}

if (typeof window !== 'undefined') {
  const runWhenIdle = (fn: () => void, timeout: number) => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(fn, { timeout });
    } else {
      setTimeout(fn, timeout);
    }
  };
  window.addEventListener('load', () => {
    runWhenIdle(loadDebugEngines, 3000);
    setTimeout(startLiveDb, 3000);
  });
}
