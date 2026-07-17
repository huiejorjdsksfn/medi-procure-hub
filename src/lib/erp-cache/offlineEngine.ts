/**
 * Offline Engine — Service Worker + Background Sync
 * Queues mutations when offline, replays when back online
 * v1.1: saveQueue() used to silently drop a queued mutation on quota
 * pressure — the worst possible failure mode here, since this queue is
 * the only record of an admin's edit/delete made while offline. Now
 * evicts space from every read-cache engine (ERPCache, cacheBuckets)
 * before the queue write itself is allowed to fail, and surfaces a
 * loud, listenable event if it still can't be saved so the UI has a
 * chance to warn the user instead of losing the change silently.
 * EL5 MediProcure — Embu Level 5 Hospital
 */
import ERPCache from "./index";
import { circuitBreaker } from "@/lib/networkEngine";
import { cacheBuckets } from "@/lib/cacheBuckets";

export type MutationType = "INSERT"|"UPDATE"|"DELETE"|"UPSERT";

interface PendingMutation {
  id:        string;
  table:     string;
  type:      MutationType;
  payload:   any;
  timestamp: number;
  retries:   number;
}

const QUEUE_KEY = "el5_offline_queue";

function loadQueue(): PendingMutation[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||"[]"); } catch { return []; }
}
function saveQueue(q: PendingMutation[]) {
  const str = JSON.stringify(q);
  try { localStorage.setItem(QUEUE_KEY, str); return; } catch { /* quota pressure — fall through to recovery */ }

  // A queued mutation is the only record of a change made while offline —
  // unlike a read cache, losing it is real data loss, not just an extra
  // network round trip later. Free space from every read-cache engine
  // before accepting failure.
  cacheBuckets.emergencyEvict(30);
  try { localStorage.setItem(QUEUE_KEY, str); return; } catch { /* still full */ }

  try {
    Object.keys(localStorage).filter(k => k.startsWith("el5c:")).slice(0, 30).forEach(k => localStorage.removeItem(k));
  } catch { /* best effort */ }
  try { localStorage.setItem(QUEUE_KEY, str); return; } catch { /* genuinely out of room */ }

  // Out of options — this mutation cannot be persisted. Surface it loudly
  // instead of the previous silent catch{} so a listener (e.g. AppLayout)
  // can warn the user their change may not be saved, rather than it
  // vanishing without a trace.
  console.error("[OfflineEngine] Could not persist mutation queue — storage full even after eviction. Data may be lost:", q.length, "pending mutations");
  try {
    window.dispatchEvent(new CustomEvent("el5:offline-queue-save-failed", { detail: { pendingCount: q.length } }));
  } catch { /* non-DOM environment */ }
}

export const OfflineEngine = {
  isOnline(): boolean { return navigator.onLine; },

  /** Queue a DB mutation for retry when back online */
  enqueue(table: string, type: MutationType, payload: any): string {
    const id = crypto.randomUUID();
    const q  = loadQueue();
    q.push({ id, table, type, payload, timestamp: Date.now(), retries: 0 });
    saveQueue(q);
    // Ask the Service Worker's Background Sync to wake the app and replay
    // this even if the tab gets closed before connectivity returns.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg: any) => reg.sync?.register("el5-offline-mutations"))
        .catch(() => { /* Background Sync unsupported — foreground online listener still covers it */ });
    }
    return id;
  },

  /** Get all pending mutations */
  getQueue(): PendingMutation[] { return loadQueue(); },
  getQueueCount(): number { return loadQueue().length; },

  /** Clear successfully replayed mutation */
  dequeue(id: string): void {
    saveQueue(loadQueue().filter(m => m.id !== id));
  },

  /** Replay queue against Supabase when back online */
  async replayQueue(supabase: any): Promise<{ replayed: number; failed: number; skipped: number }> {
    const q = loadQueue();
    if (!q.length) return { replayed: 0, failed: 0, skipped: 0 };
    let replayed = 0, failed = 0, skipped = 0;
    for (const mut of q) {
      // If this table's circuit breaker is open (repeated recent failures),
      // don't burn another attempt on it right now — leave it queued.
      const breakerKey = `offline-replay:${mut.table}`;
      if (!circuitBreaker.canRequest(breakerKey)) { skipped++; continue; }
      try {
        let res: any;
        if      (mut.type === "INSERT") res = await supabase.from(mut.table).insert(mut.payload);
        else if (mut.type === "UPDATE") res = await supabase.from(mut.table).update(mut.payload.data).eq("id", mut.payload.id);
        else if (mut.type === "DELETE") res = await supabase.from(mut.table).delete().eq("id", mut.payload.id);
        else if (mut.type === "UPSERT") res = await supabase.from(mut.table).upsert(mut.payload);
        if (!res?.error) { this.dequeue(mut.id); replayed++; circuitBreaker.recordSuccess(breakerKey); }
        else { mut.retries++; failed++; circuitBreaker.recordFailure(breakerKey); }
      } catch { mut.retries++; failed++; circuitBreaker.recordFailure(breakerKey); }
    }
    // Update retries in queue
    saveQueue(loadQueue().map(m => { const updated = q.find(x=>x.id===m.id); return updated||m; }));
    return { replayed, failed, skipped };
  },

  /** Register online/offline listeners */
  registerListeners(onOnline?: ()=>void, onOffline?: ()=>void): ()=>void {
    const h1 = () => onOnline?.();
    const h2 = () => onOffline?.();
    window.addEventListener("online",  h1);
    window.addEventListener("offline", h2);
    return () => { window.removeEventListener("online",h1); window.removeEventListener("offline",h2); };
  },
};

export default OfflineEngine;
