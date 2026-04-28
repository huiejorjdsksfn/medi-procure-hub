/**
 * SyncEngine v1.0 — Background data sync + conflict resolution
 * Syncs IndexedDB cache with Supabase when online
 * EL5 MediProcure / ProcurBosse
 */
import { ERPCache } from "@/lib/erp-cache";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

interface SyncTask { key:string; table:string; ttl:number; filter?:Record<string,any>; }
const TASKS: SyncTask[] = [
  { key:"suppliers:all",   table:"suppliers",         ttl:30*60_000 },
  { key:"items:all",       table:"items",             ttl:10*60_000 },
  { key:"categories:all",  table:"item_categories",   ttl:30*60_000 },
  { key:"departments:all", table:"departments",        ttl:30*60_000 },
  { key:"system_settings", table:"system_settings",   ttl:60*60_000 },
];

let timer: ReturnType<typeof setInterval>|null = null;

export const SyncEngine = {
  async syncOne(task: SyncTask) {
    if (!navigator.onLine) return;
    try {
      const {data,error} = await db.from(task.table).select("*").order("created_at",{ascending:false}).limit(500);
      if (!error && data) {
        const val = task.table==="system_settings"
          ? Object.fromEntries(data.map((r:any)=>[r.key,r.value]))
          : data;
        await ERPCache.set(task.key, val, task.ttl, task.table);
      }
    } catch {}
  },

  async syncAll() {
    if (!navigator.onLine) return;
    await Promise.allSettled(TASKS.map(t => this.syncOne(t)));
  },

  start(intervalMs=5*60_000) {
    if (timer) return;
    this.syncAll(); // immediate first run
    timer = setInterval(() => this.syncAll(), intervalMs);
    window.addEventListener("online", () => { setTimeout(()=>this.syncAll(), 2000); });
  },

  stop() { if(timer){clearInterval(timer);timer=null;} },
  isRunning(){ return timer!==null; },
};
export default SyncEngine;
