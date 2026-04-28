/**
 * ERPEngine v1.0 — Central ERP orchestrator
 * Coordinates: Cache + Sync + Validation + Workflow + Notifications
 * EL5 MediProcure / ProcurBosse
 */
import { ERPCache } from "@/lib/erp-cache";
import SyncEngine from "@/engines/sync/SyncEngine";
import NotificationEngine from "@/engines/notification/NotificationEngine";
import { WorkflowEngine } from "@/engines/workflow/WorkflowEngine";
import { ValidationEngine } from "@/engines/validation/ValidationEngine";

export const ERPEngine = {
  /** Initialize all engines on app start */
  async init(userId?:string) {
    // Start background sync (every 5 min)
    if(!SyncEngine.isRunning()) SyncEngine.start(5*60_000);
    // Subscribe to notifications if user is logged in
    if(userId) {
      NotificationEngine.subscribe(userId, (notif) => {
        console.info("[ERP Notif]", notif.title);
      });
    }
    console.info("[ERPEngine] Initialized ✓");
  },

  async destroy() {
    SyncEngine.stop();
    NotificationEngine.unsubscribe();
  },

  cache: ERPCache,
  sync: SyncEngine,
  notify: NotificationEngine,
  workflow: WorkflowEngine,
  validate: ValidationEngine,

  /** Health check */
  status() {
    return {
      online: navigator.onLine,
      syncRunning: SyncEngine.isRunning(),
      cacheSize: "N/A",
      version: "9.5",
    };
  },
};
export default ERPEngine;
