/**
 * ProcurBosse  -- LiveDatabaseEngine v1.0
 * Auto-polls every 60s: tests all 42+ APIs, tracks schema, logs health metrics
 * Singleton  -- call liveDbEngine.start() once on app init
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface TableHealth {
  table: string;
  group: string;
  ok: boolean;
  ms: number;
  rows: number;
  error?: string;
  lastChecked: string;
}

export interface SchemaTable {
  table_name: string;
  row_count?: number;
  columns?: Array<{ column_name: string; data_type: string; is_nullable: string }>;
}

export interface DbEngineSnapshot {
  timestamp: string;
  totalTables: number;
  healthyTables: number;
  failedTables: number;
  avgLatency: number;
  tables: TableHealth[];
  dbLatency: number;
  realtimeConnected: boolean;
  twilioStatus: "active" | "degraded" | "offline";
  runNumber: number;
}

export type EngineListener = (snapshot: DbEngineSnapshot) => void;
export type SchemaListener = (schema: SchemaTable[]) => void;

const TABLE_TESTS: Array<{ table: string; group: string }> = [
  { table: "suppliers",              group: "Procurement" },
  { table: "requisitions",           group: "Procurement" },
  { table: "purchase_orders",        group: "Procurement" },
  { table: "goods_received",         group: "Procurement" },
  { table: "contracts",              group: "Procurement" },
  { table: "tenders",                group: "Procurement" },
  { table: "bid_evaluations",        group: "Procurement" },
  { table: "procurement_plans",      group: "Procurement" },
  { table: "procurement_plan_items", group: "Procurement" },
  { table: "items",                  group: "Inventory"   },
  { table: "categories",             group: "Inventory"   },
  { table: "departments",            group: "Inventory"   },
  { table: "stock_movements",        group: "Inventory"   },
  { table: "scan_log",               group: "Inventory"   },
  { table: "budgets",                group: "Finance"     },
  { table: "payment_vouchers",       group: "Finance"     },
  { table: "journal_vouchers",       group: "Finance"     },
  { table: "receipt_vouchers",       group: "Finance"     },
  { table: "purchase_vouchers",      group: "Finance"     },
  { table: "sales_vouchers",         group: "Finance"     },
  { table: "chart_of_accounts",      group: "Finance"     },
  { table: "fixed_assets",           group: "Finance"     },
  { table: "gl_entries",             group: "Finance"     },
  { table: "supplier_scorecards",    group: "Finance"     },
  { table: "inspections",            group: "Quality"     },
  { table: "inspection_items",       group: "Quality"     },
  { table: "non_conformance",        group: "Quality"     },
  { table: "profiles",               group: "System"      },
  { table: "user_roles",             group: "System"      },
  { table: "facilities",             group: "System"      },
  { table: "notifications",          group: "System"      },
  { table: "system_settings",        group: "System"      },
  { table: "system_broadcasts",      group: "System"      },
  { table: "system_metrics",         group: "System"      },
  { table: "audit_log",              group: "System"      },
  { table: "backup_jobs",            group: "System"      },
  { table: "erp_sync_queue",         group: "System"      },
  { table: "ip_access_log",          group: "System"      },
  { table: "reception_visitors",     group: "Comms"       },
  { table: "reception_appointments", group: "Comms"       },
  { table: "reception_calls",        group: "Comms"       },
  { table: "email_messages",         group: "Comms"       },
  { table: "report_schedules",       group: "Comms"       },
];

class LiveDatabaseEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private listeners    = new Set<EngineListener>();
  private schemaListeners = new Set<SchemaListener>();
  private lastSnapshot: DbEngineSnapshot | null = null;
  private schema: SchemaTable[] = [];
  private runNumber = 0;
  private realtimeChannel: any = null;
  private realtimeConnected = false;
  private running = false;
  private intervalMs = 60_000;

  start(intervalMs = 60_000) {
    if (this.running) return;
    this.running = true;
    this.intervalMs = intervalMs;
    this.initRealtime();
    this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), this.intervalMs);
    console.log(`[LiveDB]  started  -- ${intervalMs / 1000}s interval`);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.realtimeChannel) db.removeChannel(this.realtimeChannel);
    this.intervalId = null;
    this.realtimeChannel = null;
    this.running = false;
    console.log("[LiveDB]  stopped");
  }

  forceRun()   { return this.runCycle(); }
  isRunning()  { return this.running; }
  getSnapshot(){ return this.lastSnapshot; }
  getSchema()  { return this.schema; }

  onSnapshot(fn: EngineListener)  { this.listeners.add(fn);       return () => this.listeners.delete(fn); }
  onSchema(fn: SchemaListener)    { this.schemaListeners.add(fn); return () => this.schemaListeners.delete(fn); }

  private emit(s: DbEngineSnapshot) {
    this.lastSnapshot = s;
    this.listeners.forEach(fn => { try { fn(s); } catch {} });
  }
  private emitSchema(s: SchemaTable[]) {
    this.schema = s;
    this.schemaListeners.forEach(fn => { try { fn(s); } catch {} });
  }

  private initRealtime() {
    this.realtimeChannel = db.channel("livedb:health")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {})
      .on("postgres_changes", { event: "*", schema: "public", table: "requisitions" }, () => {})
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, () => {})
      .subscribe((status: string) => {
        this.realtimeConnected = status === "SUBSCRIBED";
      });
  }

  private async runCycle() {
    this.runNumber++;
    const cycleStart = performance.now();

    const pingT = performance.now();
    const { error: pingErr } = await db.from("system_settings").select("key").limit(1);
    const dbLatency = Math.round(performance.now() - pingT);

    const tables = await this.runAllTableTests();
    const twilioStatus = await this.checkTwilio();

    // Refresh schema every 5 cycles
    if (this.runNumber % 5 === 1) this.fetchSchema().catch(() => {});

    const healthy = tables.filter(t => t.ok).length;

    // Write metrics (non-blocking)
    this.writeMetrics(dbLatency, healthy, tables.length, twilioStatus);

    const snapshot: DbEngineSnapshot = {
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      healthyTables: healthy,
      failedTables: tables.length - healthy,
      avgLatency: Math.round(tables.reduce((a, t) => a + t.ms, 0) / tables.length),
      tables,
      dbLatency,
      realtimeConnected: this.realtimeConnected,
      twilioStatus,
      runNumber: this.runNumber,
    };

    this.emit(snapshot);
    console.log(`[LiveDB] #${this.runNumber}  -- ${healthy}/${tables.length} OK | ${dbLatency}ms ping | ${twilioStatus} Twilio | ${Math.round(performance.now() - cycleStart)}ms`);
  }

  private async runAllTableTests(): Promise<TableHealth[]> {
    const BATCH = 8;
    const results: TableHealth[] = [];
    for (let i = 0; i < TABLE_TESTS.length; i += BATCH) {
      const batch = TABLE_TESTS.slice(i, i + BATCH);
      const br = await Promise.all(batch.map(async ({ table, group }) => {
        const t0 = performance.now();
        try {
          const { count, error } = await db.from(table).select("id", { count: "exact", head: true });
          return { table, group, ok: !error, ms: Math.round(performance.now() - t0), rows: count ?? 0, error: error?.message, lastChecked: new Date().toISOString() } as TableHealth;
        } catch (e: any) {
          return { table, group, ok: false, ms: Math.round(performance.now() - t0), rows: 0, error: e.message, lastChecked: new Date().toISOString() } as TableHealth;
        }
      }));
      results.push(...br);
    }
    return results;
  }

  private async checkTwilio(): Promise<"active" | "degraded" | "offline"> {
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", { body: { action: "status" } });
      if (error) return "degraded";
      return (data as any)?.ok ? "active" : "degraded";
    } catch { return "offline"; }
  }

  async fetchSchema(): Promise<SchemaTable[]> {
    try {
      // Query information_schema for all public tables + row counts
      const { data: tableNames } = await db.from("information_schema.tables" as any)
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_type", "BASE TABLE")
        .order("table_name");

      if (!tableNames?.length) throw new Error("no schema data");

      // Get row counts in parallel (sample of known tables)
      const rowCounts = await Promise.all(
        TABLE_TESTS.map(async t => {
          try {
            const { count } = await db.from(t.table).select("id", { count: "exact", head: true });
            return { table: t.table, count: count ?? 0 };
          } catch { return { table: t.table, count: 0 }; }
        })
      );
      const countMap = Object.fromEntries(rowCounts.map(r => [r.table, r.count]));

      const schema: SchemaTable[] = (tableNames as any[]).map(r => ({
        table_name: r.table_name,
        row_count: countMap[r.table_name],
      }));

      this.emitSchema(schema);
      return schema;
    } catch {
      // Fallback: just known tables
      const schema = TABLE_TESTS.map(t => ({
        table_name: t.table,
        row_count: this.lastSnapshot?.tables.find(s => s.table === t.table)?.rows,
      }));
      this.emitSchema(schema);
      return schema;
    }
  }

  private async writeMetrics(latency: number, healthy: number, total: number, twilio: string) {
    try {
      await db.from("system_metrics").insert([
        { metric_name: "db_health_pct",   metric_value: Math.round((healthy / total) * 100), metric_unit: "%",    tags: { run: this.runNumber } },
        { metric_name: "db_latency_ms",   metric_value: latency,                              metric_unit: "ms",   tags: { run: this.runNumber } },
        { metric_name: "twilio_active",   metric_value: twilio === "active" ? 1 : 0,         metric_unit: "bool", tags: { run: this.runNumber } },
        { metric_name: "tables_healthy",  metric_value: healthy,                              metric_unit: "count",tags: { run: this.runNumber } },
      ]);
    } catch { /* silent */ }
  }
}

export const liveDbEngine = new LiveDatabaseEngine();
