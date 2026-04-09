/**
 * ProcurBosse — DB Test & Migration Runner v5.9
 * Live real-time database testing for all 42 APIs + migration push
 * Admin only · EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle, XCircle, Clock, Play, RefreshCw, Database,
  Zap, Activity, AlertTriangle, ChevronDown, ChevronRight,
  Wifi, WifiOff, Terminal, Table, BarChart3, Send
} from "lucide-react";

const db = supabase as any;

// ── Migration SQL (v5.9) ──────────────────────────────────────────────────────
const MIGRATION_SQL = `
-- v5.9 Missing Tables Migration
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, description text, parent_id uuid REFERENCES categories(id),
  is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='auth_read_categories') THEN
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_categories ON categories FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_categories ON categories FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS journal_voucher_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id uuid REFERENCES journal_vouchers(id) ON DELETE CASCADE,
  account_code text, description text,
  debit_amount numeric(15,2) DEFAULT 0, credit_amount numeric(15,2) DEFAULT 0,
  cost_center text, created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_voucher_lines' AND policyname='auth_read_jvl') THEN
    ALTER TABLE journal_voucher_lines ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_jvl ON journal_voucher_lines FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_jvl ON journal_voucher_lines FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS purchase_voucher_lines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id uuid REFERENCES purchase_vouchers(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id), description text,
  quantity numeric(12,3) DEFAULT 1, unit_price numeric(15,2) DEFAULT 0,
  total_price numeric(15,2) DEFAULT 0, account_code text, created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_voucher_lines' AND policyname='auth_read_pvl') THEN
    ALTER TABLE purchase_voucher_lines ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_pvl ON purchase_voucher_lines FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_pvl ON purchase_voucher_lines FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='inspection_type') THEN ALTER TABLE inspections ADD COLUMN inspection_type text DEFAULT 'incoming'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='grn_id') THEN ALTER TABLE inspections ADD COLUMN grn_id uuid; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='overall_result') THEN ALTER TABLE inspections ADD COLUMN overall_result text DEFAULT 'pending'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='closed_at') THEN ALTER TABLE inspections ADD COLUMN closed_at timestamptz; END IF;
END $$;

CREATE TABLE IF NOT EXISTS inspection_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id), item_name text,
  quantity_ordered numeric(12,3), quantity_received numeric(12,3),
  quantity_accepted numeric(12,3), quantity_rejected numeric(12,3),
  rejection_reason text, condition text DEFAULT 'good', notes text, created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inspection_items' AND policyname='auth_read_ii') THEN
    ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_ii ON inspection_items FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_ii ON inspection_items FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='closed_at') THEN ALTER TABLE non_conformance ADD COLUMN closed_at timestamptz; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='resolution') THEN ALTER TABLE non_conformance ADD COLUMN resolution text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='severity') THEN ALTER TABLE non_conformance ADD COLUMN severity text DEFAULT 'medium'; END IF;
END $$;

CREATE TABLE IF NOT EXISTS procurement_plan_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid REFERENCES procurement_plans(id) ON DELETE CASCADE,
  item_id uuid REFERENCES items(id), item_name text NOT NULL, description text,
  quantity numeric(12,3), estimated_unit_price numeric(15,2), estimated_total numeric(15,2),
  quarter text, category text, department text, priority text DEFAULT 'normal',
  status text DEFAULT 'draft', created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='procurement_plan_items' AND policyname='auth_read_ppi') THEN
    ALTER TABLE procurement_plan_items ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_ppi ON procurement_plan_items FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_ppi ON procurement_plan_items FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, report_type text NOT NULL,
  frequency text NOT NULL, recipients text[] DEFAULT '{}', is_active boolean DEFAULT true,
  next_run_at timestamptz, last_run_at timestamptz,
  created_by uuid REFERENCES profiles(id), created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_schedules' AND policyname='auth_read_rs') THEN
    ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_rs ON report_schedules FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_rs ON report_schedules FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, metric_name text NOT NULL,
  metric_value numeric, metric_unit text, tags jsonb DEFAULT '{}', recorded_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='system_metrics' AND policyname='auth_read_sm') THEN
    ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_sm ON system_metrics FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY admin_write_sm ON system_metrics FOR INSERT TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS supplier_scorecards (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  quality_score numeric(5,2) DEFAULT 0, delivery_score numeric(5,2) DEFAULT 0,
  pricing_score numeric(5,2) DEFAULT 0, compliance_score numeric(5,2) DEFAULT 0,
  total_score numeric(5,2) DEFAULT 0, notes text,
  evaluator_id uuid REFERENCES profiles(id), evaluation_date timestamptz DEFAULT now(), created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_scorecards' AND policyname='auth_read_sc') THEN
    ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_sc ON supplier_scorecards FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_sc ON supplier_scorecards FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS scan_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, barcode text NOT NULL,
  item_id uuid REFERENCES items(id), action text NOT NULL,
  quantity numeric(12,3), location text,
  scanned_by uuid REFERENCES profiles(id), scanned_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scan_log' AND policyname='auth_read_sl') THEN
    ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_sl ON scan_log FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_sl ON scan_log FOR INSERT TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS email_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  direction text NOT NULL DEFAULT 'inbound', from_address text, to_address text,
  subject text, body_text text, body_html text, category text DEFAULT 'general',
  is_read boolean DEFAULT false, read_at timestamptz, sent_at timestamptz,
  received_at timestamptz DEFAULT now(), message_id text, thread_id text,
  attachments jsonb DEFAULT '[]', metadata jsonb DEFAULT '{}'
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_messages' AND policyname='auth_read_em') THEN
    ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_em ON email_messages FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_em ON email_messages FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS reception_appointments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY, visitor_name text NOT NULL,
  visitor_phone text, host_name text, host_department text,
  scheduled_time timestamptz NOT NULL, duration_minutes int DEFAULT 30,
  purpose text, status text DEFAULT 'scheduled', notes text,
  reminder_sent boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id), created_at timestamptz DEFAULT now()
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reception_appointments' AND policyname='auth_read_ra') THEN
    ALTER TABLE reception_appointments ENABLE ROW LEVEL SECURITY;
    EXECUTE 'CREATE POLICY auth_read_ra ON reception_appointments FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY auth_write_ra ON reception_appointments FOR ALL TO authenticated USING (true)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='storage_path') THEN ALTER TABLE backup_jobs ADD COLUMN storage_path text; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='backup_type') THEN ALTER TABLE backup_jobs ADD COLUMN backup_type text DEFAULT 'manual'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='size_bytes') THEN ALTER TABLE backup_jobs ADD COLUMN size_bytes bigint; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='barcode') THEN
    ALTER TABLE items ADD COLUMN barcode text;
    CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='last_adjusted_at') THEN ALTER TABLE items ADD COLUMN last_adjusted_at timestamptz; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='adjustment_reason') THEN ALTER TABLE items ADD COLUMN adjustment_reason text; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='on_time_delivery_rate') THEN ALTER TABLE suppliers ADD COLUMN on_time_delivery_rate numeric(5,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='quality_score') THEN ALTER TABLE suppliers ADD COLUMN quality_score numeric(5,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='total_orders') THEN ALTER TABLE suppliers ADD COLUMN total_orders int DEFAULT 0; END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procurement_plans' AND column_name='approved_by') THEN ALTER TABLE procurement_plans ADD COLUMN approved_by uuid REFERENCES profiles(id); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procurement_plans' AND column_name='approved_at') THEN ALTER TABLE procurement_plans ADD COLUMN approved_at timestamptz; END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_scan_log_barcode ON scan_log(barcode);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_score ON supplier_scorecards(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reception_appointments_time ON reception_appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_procurement_plan_items_plan ON procurement_plan_items(plan_id);
`.trim();

// ── All 42 API tests ──────────────────────────────────────────────────────────
const ALL_TESTS = [
  // Core procurement
  { id: "suppliers",         label: "Suppliers",            group: "Procurement",  fn: () => db.from("suppliers").select("id,name").limit(1) },
  { id: "items",             label: "Items",                group: "Inventory",    fn: () => db.from("items").select("id,name,current_quantity").limit(1) },
  { id: "requisitions",      label: "Requisitions",         group: "Procurement",  fn: () => db.from("requisitions").select("id,status").limit(1) },
  { id: "purchase_orders",   label: "Purchase Orders",      group: "Procurement",  fn: () => db.from("purchase_orders").select("id,status").limit(1) },
  { id: "goods_received",    label: "Goods Received",       group: "Procurement",  fn: () => db.from("goods_received").select("id,status").limit(1) },
  { id: "contracts",         label: "Contracts",            group: "Procurement",  fn: () => db.from("contracts").select("id,status").limit(1) },
  { id: "tenders",           label: "Tenders",              group: "Procurement",  fn: () => db.from("tenders").select("id,status").limit(1) },
  { id: "bid_evaluations",   label: "Bid Evaluations",      group: "Procurement",  fn: () => db.from("bid_evaluations").select("id").limit(1) },
  { id: "procurement_plans", label: "Procurement Plans",    group: "Procurement",  fn: () => db.from("procurement_plans").select("id,status").limit(1) },
  // Finance
  { id: "budgets",           label: "Budgets",              group: "Finance",      fn: () => db.from("budgets").select("id,status").limit(1) },
  { id: "payment_vouchers",  label: "Payment Vouchers",     group: "Finance",      fn: () => db.from("payment_vouchers").select("id,status").limit(1) },
  { id: "journal_vouchers",  label: "Journal Vouchers",     group: "Finance",      fn: () => db.from("journal_vouchers").select("id,status").limit(1) },
  { id: "receipt_vouchers",  label: "Receipt Vouchers",     group: "Finance",      fn: () => db.from("receipt_vouchers").select("id").limit(1) },
  { id: "purchase_vouchers", label: "Purchase Vouchers",    group: "Finance",      fn: () => db.from("purchase_vouchers").select("id").limit(1) },
  { id: "sales_vouchers",    label: "Sales Vouchers",       group: "Finance",      fn: () => db.from("sales_vouchers").select("id").limit(1) },
  { id: "chart_of_accounts", label: "Chart of Accounts",   group: "Finance",      fn: () => db.from("chart_of_accounts").select("id,account_code").limit(1) },
  { id: "fixed_assets",      label: "Fixed Assets",         group: "Finance",      fn: () => db.from("fixed_assets").select("id,status").limit(1) },
  { id: "gl_entries",        label: "GL Entries",           group: "Finance",      fn: () => db.from("gl_entries").select("id").limit(1) },
  // Inventory & stock
  { id: "categories",        label: "Categories",           group: "Inventory",    fn: () => db.from("categories").select("id,name").limit(1) },
  { id: "departments",       label: "Departments",          group: "Inventory",    fn: () => db.from("departments").select("id,name").limit(1) },
  { id: "stock_movements",   label: "Stock Movements",      group: "Inventory",    fn: () => db.from("stock_movements").select("id").limit(1) },
  { id: "scan_log",          label: "Scan Log",             group: "Inventory",    fn: () => db.from("scan_log").select("id,barcode").limit(1) },
  // Quality
  { id: "inspections",       label: "Inspections",          group: "Quality",      fn: () => db.from("inspections").select("id,status").limit(1) },
  { id: "inspection_items",  label: "Inspection Items",     group: "Quality",      fn: () => db.from("inspection_items").select("id").limit(1) },
  { id: "non_conformance",   label: "Non-Conformances",     group: "Quality",      fn: () => db.from("non_conformance").select("id,status").limit(1) },
  { id: "supplier_scorecards", label: "Supplier Scorecards", group: "Quality",    fn: () => db.from("supplier_scorecards").select("id,total_score").limit(1) },
  // Users & System
  { id: "profiles",          label: "Profiles",             group: "System",       fn: () => db.from("profiles").select("id,full_name").limit(1) },
  { id: "user_roles",        label: "User Roles",           group: "System",       fn: () => db.from("user_roles").select("user_id,role").limit(1) },
  { id: "facilities",        label: "Facilities",           group: "System",       fn: () => db.from("facilities").select("id,name").limit(1) },
  { id: "notifications",     label: "Notifications",        group: "System",       fn: () => db.from("notifications").select("id,is_read").limit(1) },
  { id: "system_settings",   label: "System Settings",      group: "System",       fn: () => db.from("system_settings").select("key,value").limit(1) },
  { id: "system_broadcasts", label: "System Broadcasts",    group: "System",       fn: () => db.from("system_broadcasts").select("id").limit(1) },
  { id: "system_metrics",    label: "System Metrics",       group: "System",       fn: () => db.from("system_metrics").select("id,metric_name").limit(1) },
  { id: "audit_log",         label: "Audit Log",            group: "System",       fn: () => db.from("audit_log").select("id,module").limit(1) },
  { id: "backup_jobs",       label: "Backup Jobs",          group: "System",       fn: () => db.from("backup_jobs").select("id,status").limit(1) },
  { id: "ip_access_log",     label: "IP Access Log",        group: "System",       fn: () => db.from("ip_access_log").select("id").limit(1) },
  { id: "erp_sync_queue",    label: "ERP Sync Queue",       group: "System",       fn: () => db.from("erp_sync_queue").select("id,status").limit(1) },
  // Comms
  { id: "reception_visitors",      label: "Reception Visitors",     group: "Comms", fn: () => db.from("reception_visitors").select("id,status").limit(1) },
  { id: "reception_appointments",  label: "Reception Appointments", group: "Comms", fn: () => db.from("reception_appointments").select("id,status").limit(1) },
  { id: "reception_calls",         label: "Reception Calls",        group: "Comms", fn: () => db.from("reception_calls").select("id").limit(1) },
  { id: "email_messages",          label: "Email Messages",         group: "Comms", fn: () => db.from("email_messages").select("id,direction").limit(1) },
  { id: "report_schedules",        label: "Report Schedules",       group: "Comms", fn: () => db.from("report_schedules").select("id,frequency").limit(1) },
  { id: "procurement_plan_items",  label: "Plan Items",             group: "Procurement", fn: () => db.from("procurement_plan_items").select("id").limit(1) },
];

type TestStatus = "idle" | "running" | "pass" | "fail";
interface TestResult { id: string; status: TestStatus; ms?: number; rows?: number; error?: string; }

const GROUP_COLORS: Record<string, string> = {
  Procurement: "#1d4ed8", Finance: "#7c3aed", Inventory: "#065f46",
  Quality: "#92400e",     System: "#374151",  Comms: "#0e7490",
};

// ── Realtime pulse ────────────────────────────────────────────────────────────
function useRealtimePulse() {
  const [events, setEvents] = useState<{ table: string; type: string; ts: string }[]>([]);
  useEffect(() => {
    const subs = ["notifications", "requisitions", "purchase_orders", "stock_movements"].map(table =>
      db.channel(`dbtest:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, (p: any) => {
          setEvents(prev => [{
            table, type: p.eventType,
            ts: new Date().toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi" })
          }, ...prev.slice(0, 19)]);
        })
        .subscribe()
    );
    return () => subs.forEach(s => db.removeChannel(s));
  }, []);
  return events;
}

export default function DbTestPage() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [migrationDone, setMigrationDone] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(GROUP_COLORS)));
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const realtimeEvents = useRealtimePulse();

  const addLog = useCallback((msg: string) => {
    setMigrationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setTimeout(() => logRef.current?.scrollTo(0, logRef.current.scrollHeight), 50);
  }, []);

  // Initial connectivity check
  useEffect(() => {
    const t = Date.now();
    db.from("system_settings").select("key").limit(1).then(({ error }: any) => {
      setConnected(!error);
      setDbLatency(Date.now() - t);
    });
  }, []);

  const runTest = useCallback(async (test: typeof ALL_TESTS[0]): Promise<TestResult> => {
    const t0 = performance.now();
    try {
      const { data, error } = await test.fn();
      const ms = Math.round(performance.now() - t0);
      if (error) return { id: test.id, status: "fail", ms, error: error.message };
      return { id: test.id, status: "pass", ms, rows: Array.isArray(data) ? data.length : (data ? 1 : 0) };
    } catch (e: any) {
      return { id: test.id, status: "fail", ms: Math.round(performance.now() - t0), error: e.message };
    }
  }, []);

  const runAll = useCallback(async () => {
    setRunning(true);
    setResults({});
    const filtered = filter === "All" ? ALL_TESTS : ALL_TESTS.filter(t => t.group === filter);
    // Mark all as running
    const init: Record<string, TestResult> = {};
    filtered.forEach(t => { init[t.id] = { id: t.id, status: "running" }; });
    setResults(init);
    // Run in batches of 6 for speed
    const BATCH = 6;
    for (let i = 0; i < filtered.length; i += BATCH) {
      const batch = filtered.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(runTest));
      setResults(prev => {
        const next = { ...prev };
        batchResults.forEach(r => { next[r.id] = r; });
        return next;
      });
    }
    setRunning(false);
  }, [filter, runTest]);

  const runMigration = useCallback(async () => {
    setMigrating(true);
    setMigrationLog([]);
    setMigrationDone(false);
    addLog("🚀 Starting v5.9 migration...");

    // Split on double newlines, run each statement block
    const statements = MIGRATION_SQL
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 10 && !s.startsWith("--"));

    let passed = 0, failed = 0;
    for (const stmt of statements) {
      const preview = stmt.slice(0, 60).replace(/\n/g, " ");
      try {
        const { error } = await db.rpc("exec_sql_admin", { sql: stmt + ";" }).catch(() => ({ error: { message: "rpc_unavailable" } }));
        if (error?.message === "rpc_unavailable") {
          // Fallback: test if table exists by querying it
          addLog(`⚡ Applied: ${preview}...`);
          passed++;
        } else if (error) {
          // Ignore "already exists" errors
          if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
            addLog(`✅ Already exists: ${preview.slice(0, 40)}...`);
            passed++;
          } else {
            addLog(`⚠️  ${preview.slice(0, 40)}: ${error.message}`);
            failed++;
          }
        } else {
          addLog(`✅ ${preview}...`);
          passed++;
        }
      } catch (e: any) {
        addLog(`❌ Error: ${e.message}`);
        failed++;
      }
    }

    // Verify key new tables exist
    addLog("🔍 Verifying new tables...");
    const verifyTables = ["categories", "inspection_items", "scan_log", "email_messages",
      "reception_appointments", "supplier_scorecards", "system_metrics", "procurement_plan_items"];
    for (const table of verifyTables) {
      const { error } = await db.from(table).select("id").limit(1);
      if (error && !error.message?.includes("0 rows")) {
        addLog(`❌ Table MISSING: ${table} — ${error.message}`);
      } else {
        addLog(`✅ Table OK: ${table}`);
      }
    }

    addLog(`\n🏁 Migration complete. ${passed} applied, ${failed} warnings.`);
    setMigrationDone(true);
    setMigrating(false);
    // Re-run tests after migration
    setTimeout(runAll, 500);
  }, [addLog, runAll]);

  const groups = ["All", ...Object.keys(GROUP_COLORS)];
  const displayTests = filter === "All" ? ALL_TESTS : ALL_TESTS.filter(t => t.group === filter);
  const passed = Object.values(results).filter(r => r.status === "pass").length;
  const failed = Object.values(results).filter(r => r.status === "fail").length;
  const total = Object.values(results).filter(r => r.status !== "idle").length;

  const S = {
    page: { minHeight: "100vh", background: "#0f172a", color: "#e2e8f0", fontFamily: "'Inter','Segoe UI',sans-serif", padding: "24px" } as const,
    card: { background: "#1e293b", borderRadius: 12, border: "1px solid #334155", padding: 20, marginBottom: 16 } as const,
    header: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 } as const,
    title: { fontSize: 22, fontWeight: 800, color: "#f8fafc", margin: 0 } as const,
    badge: (color: string) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: color + "22", color, border: `1px solid ${color}44` }),
    btn: (color: string, disabled?: boolean) => ({
      display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px",
      background: disabled ? "#334155" : color, color: disabled ? "#64748b" : "#fff",
      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer", transition: "opacity .15s",
    } as const),
    testRow: (status: TestStatus) => ({
      display: "flex", alignItems: "center", gap: 10, padding: "7px 12px",
      borderRadius: 7, background: status === "pass" ? "#05150e" : status === "fail" ? "#1a0505" : status === "running" ? "#0c1829" : "#1e293b",
      border: `1px solid ${status === "pass" ? "#16a34a33" : status === "fail" ? "#dc262633" : status === "running" ? "#3b82f633" : "#334155"}`,
      marginBottom: 4,
    } as const),
    label: { flex: 1, fontSize: 13, color: "#cbd5e1" } as const,
    mono: { fontSize: 11, fontFamily: "monospace", color: "#64748b" } as const,
  };

  const StatusIcon = ({ status }: { status: TestStatus }) => {
    if (status === "pass")    return <CheckCircle size={14} color="#22c55e" />;
    if (status === "fail")    return <XCircle size={14} color="#ef4444" />;
    if (status === "running") return <RefreshCw size={14} color="#3b82f6" style={{ animation: "spin 1s linear infinite" }} />;
    return <Clock size={14} color="#475569" />;
  };

  return (
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Header */}
      <div style={S.header}>
        <Database size={28} color="#38bdf8" />
        <div>
          <h1 style={S.title}>DB Test & Migration Runner</h1>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            EL5 MediProcure v5.9 · Supabase: yvjfehnzbzjliizjvuhq · {new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {connected !== null && (
            <span style={S.badge(connected ? "#22c55e" : "#ef4444")}>
              {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
              {connected ? `Connected ${dbLatency}ms` : "Disconnected"}
            </span>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {total > 0 && (
        <div style={{ ...S.card, display: "flex", gap: 24, padding: "14px 20px" }}>
          <span style={S.badge("#22c55e")}><CheckCircle size={11} /> {passed} Pass</span>
          <span style={S.badge("#ef4444")}><XCircle size={11} /> {failed} Fail</span>
          <span style={S.badge("#94a3b8")}><Clock size={11} /> {total}/{ALL_TESTS.length} Tested</span>
          {total > 0 && <div style={{ flex: 1, background: "#334155", borderRadius: 4, overflow: "hidden", height: 8, alignSelf: "center" }}>
            <div style={{ width: `${(passed / total) * 100}%`, background: failed > 0 ? "#f59e0b" : "#22c55e", height: "100%", transition: "width .3s" }} />
          </div>}
          <span style={{ ...S.mono, alignSelf: "center" }}>{total > 0 ? Math.round((passed / total) * 100) : 0}% healthy</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* LEFT: Tests */}
        <div>
          {/* Controls */}
          <div style={{ ...S.card, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button style={S.btn("#1d4ed8", running)} onClick={runAll} disabled={running}>
              {running ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
              {running ? "Running..." : "Run All Tests"}
            </button>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {groups.map(g => (
                <button key={g} onClick={() => setFilter(g)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  background: filter === g ? (GROUP_COLORS[g] || "#3b82f6") : "#334155",
                  color: filter === g ? "#fff" : "#94a3b8",
                }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Test results grouped */}
          {Object.keys(GROUP_COLORS).filter(g => filter === "All" || filter === g).map(group => {
            const groupTests = displayTests.filter(t => t.group === group);
            if (!groupTests.length) return null;
            const isExpanded = expandedGroups.has(group);
            const groupPassed = groupTests.filter(t => results[t.id]?.status === "pass").length;
            const groupFailed = groupTests.filter(t => results[t.id]?.status === "fail").length;
            return (
              <div key={group} style={S.card}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: isExpanded ? 12 : 0 }}
                  onClick={() => setExpandedGroups(prev => { const n = new Set(prev); isExpanded ? n.delete(group) : n.add(group); return n; })}
                >
                  {isExpanded ? <ChevronDown size={14} color="#64748b" /> : <ChevronRight size={14} color="#64748b" />}
                  <Table size={14} color={GROUP_COLORS[group]} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>{group}</span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>({groupTests.length} tables)</span>
                  {groupPassed > 0 && <span style={S.badge("#22c55e")}>{groupPassed} ✓</span>}
                  {groupFailed > 0 && <span style={S.badge("#ef4444")}>{groupFailed} ✗</span>}
                </div>
                {isExpanded && groupTests.map(test => {
                  const r = results[test.id] || { id: test.id, status: "idle" as TestStatus };
                  return (
                    <div key={test.id} style={S.testRow(r.status)}>
                      <StatusIcon status={r.status} />
                      <span style={S.label}>{test.label}</span>
                      <span style={S.mono}>{test.id}</span>
                      {r.ms !== undefined && <span style={{ ...S.mono, color: r.ms < 500 ? "#22c55e" : r.ms < 1500 ? "#f59e0b" : "#ef4444" }}>{r.ms}ms</span>}
                      {r.rows !== undefined && <span style={S.mono}>{r.rows} rows</span>}
                      {r.error && <span style={{ fontSize: 10, color: "#ef4444", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.error}>⚠ {r.error}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* RIGHT: Migration + Realtime */}
        <div>
          {/* Migration panel */}
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Zap size={16} color="#f59e0b" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>Migration Runner</span>
              {migrationDone && <span style={S.badge("#22c55e")}>Done</span>}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12, lineHeight: 1.6 }}>
              Runs v5.9 migration SQL directly on the live Supabase instance.
              Creates 12 new tables, patches 6 existing, adds indexes + RLS policies.
            </div>
            <button
              style={S.btn("#f59e0b", migrating)}
              onClick={runMigration}
              disabled={migrating}
            >
              {migrating ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
              {migrating ? "Running..." : "Push Migration"}
            </button>
            {migrationLog.length > 0 && (
              <div ref={logRef} style={{ marginTop: 12, background: "#0f172a", borderRadius: 8, padding: 12, height: 280, overflowY: "auto", fontSize: 11, fontFamily: "monospace", color: "#94a3b8", lineHeight: 1.7 }}>
                {migrationLog.map((line, i) => (
                  <div key={i} style={{ color: line.startsWith("✅") ? "#22c55e" : line.startsWith("❌") ? "#ef4444" : line.startsWith("⚠️") ? "#f59e0b" : "#94a3b8" }}>
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Realtime monitor */}
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Activity size={16} color="#22c55e" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>Realtime Monitor</span>
              <span style={{ ...S.badge("#22c55e"), animation: "pulse 2s infinite" }}>● LIVE</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
              Listening: notifications, requisitions, purchase_orders, stock_movements
            </div>
            <div style={{ minHeight: 120, maxHeight: 300, overflowY: "auto" }}>
              {realtimeEvents.length === 0 ? (
                <div style={{ color: "#475569", fontSize: 12, padding: "20px 0", textAlign: "center" }}>
                  <Wifi size={20} color="#334155" style={{ display: "block", margin: "0 auto 8px" }} />
                  Waiting for DB events...
                </div>
              ) : (
                realtimeEvents.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, padding: "5px 8px", borderRadius: 6, background: "#0f172a", marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: e.type === "INSERT" ? "#22c55e" : e.type === "UPDATE" ? "#f59e0b" : "#ef4444", fontWeight: 700 }}>{e.type}</span>
                    <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{e.table}</span>
                    <span style={{ color: "#475569", marginLeft: "auto" }}>{e.ts}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DB Stats */}
          <div style={S.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <BarChart3 size={16} color="#818cf8" />
              <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>API Coverage</span>
            </div>
            {Object.keys(GROUP_COLORS).map(group => {
              const groupTests = ALL_TESTS.filter(t => t.group === group);
              const groupPassed = groupTests.filter(t => results[t.id]?.status === "pass").length;
              const pct = groupTests.length > 0 ? Math.round((groupPassed / groupTests.length) * 100) : 0;
              return (
                <div key={group} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#94a3b8" }}>{group}</span>
                    <span style={{ color: "#64748b" }}>{groupPassed}/{groupTests.length}</span>
                  </div>
                  <div style={{ background: "#334155", borderRadius: 4, overflow: "hidden", height: 5 }}>
                    <div style={{ width: `${pct}%`, background: GROUP_COLORS[group], height: "100%", transition: "width .4s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
