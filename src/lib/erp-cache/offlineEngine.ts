/**
 * Offline Engine — Service Worker + Background Sync
 * Queues mutations when offline, replays when back online
 * EL5 MediProcure — Embu Level 5 Hospital
 */
import ERPCache from "./index";
import { circuitBreaker } from "@/lib/networkEngine";

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
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
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
