/**
 * ProcurBosse - Admin Database GUI v3.0
 * Full ERP database manager: white/black Times New Roman design
 * Real SQL editor, live realtime, all tables, triggers, edge functions
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { safeFetch } from "@/lib/safeFetch";
import {
  Database, RefreshCw, Play, Save, Plus, Trash2, Edit3, X, Search,
  Download, Server, Table as TableIcon, Code2, Activity, Wifi,
  ChevronRight, ChevronDown, AlertTriangle,
  CheckCircle, Clock, Layers, FileText, Zap, BarChart3, Eye, Printer,
  ToggleLeft, ToggleRight, Settings, HardDrive, Cpu
} from "lucide-react";
import * as XLSX from "@e965/xlsx";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, Cell, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import RoleGuard from "@/components/RoleGuard";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import { printDataTable } from "@/lib/printDocument";

// - Table groups with all 57 tables -
const TABLE_GROUPS = [
  { id:"procurement", label:"Procurement",         color:"#003087", tables:["requisitions","requisition_items","purchase_orders","purchase_order_items","goods_received","goods_received_items","grn_items","procurement_plans","bid_evaluations","tenders","contracts","suppliers"] },
  { id:"inventory",   label:"Inventory & Stock",   color:"#107c10", tables:["items","item_categories","departments","stock_movements"] },
  { id:"finance",     label:"Finance & Vouchers",  color:"#8B4513", tables:["payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers","sales_vouchers","budgets","chart_of_accounts","bank_accounts","gl_entries","fixed_assets"] },
  { id:"quality",     label:"Quality Control",     color:"#005C3C", tables:["inspections","non_conformance"] },
  { id:"users",       label:"Users & Access",      color:"#4B0082", tables:["profiles","user_roles","roles","permissions"] },
  { id:"email",       label:"Email",               color:"#B22222", tables:["email_inbox","email_sent","email_drafts","email_attachments"] },
  { id:"system",      label:"System & Settings",   color:"#333333", tables:["system_settings","system_config","system_broadcasts","system_errors","module_settings","notifications","notification_recipients","audit_log","backup_jobs","query_log","edge_function_logs"] },
  { id:"documents",   label:"Documents",           color:"#006B6B", tables:["documents","reports","inbox_items","admin_inbox"] },
  { id:"network",     label:"Network & DB",        color:"#1A237E", tables:["network_whitelist","ip_access_log","odbc_connections","external_connections"] },
  { id:"sms",         label:"SMS & Logs",          color:"#5D4037", tables:["sms_log","db_admin_log","db_fix_scripts"] },
];

// - Styles (Clean white Inter design - v5.8) -
const S = {
  font:  "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  bg:    "#ffffff",
  bg2:   "#f8fafc",
  fg:    "#0f172a",
  fg2:   "#475569",
  border:"#e2e8f0",
  head:  "#f1f5f9",
  blue:  "#2563eb",
  sel:   "rgba(37,99,235,0.08)",
  err:   "#dc2626",
  ok:    "#16a34a",
  warn:  "#d97706",
  mono:  "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
};

// SSMS ("SQL Server Management Studio") chrome theme — v6.0 redesign.
// Distinct from S above: this governs only the window chrome (menu bar,
// toolbar, Object Explorer header, document tabs, status bar), matching
// the classic SSMS light/blue theme. Table/grid/SQL-editor content below
// keeps using S so none of that logic changes.
const SSMS = {
  font:      "'Segoe UI', 'Inter', system-ui, sans-serif",
  titlebar:  "#f3f3f3",
  titleText: "#1e1e1e",
  menubar:   "#f3f3f3",
  toolbar:   "#eef2f6",
  toolbarBd: "#d6dce3",
  accent:    "#0067b8",
  accentDk:  "#004b87",
  tabActive: "#ffffff",
  tabInactive: "#e4e9ee",
  tabBorder: "#c9d2db",
  statusbar: "#0067b8",
  explorerHd:"#e4e9ee",
};

const CELL: React.CSSProperties = {
  border: `1px solid #e2e8f0`,
  padding: "7px 14px",
  fontSize: 12,
  fontFamily: S.font,
  color: "#0f172a",
  whiteSpace: "nowrap",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
  background: "transparent",
};
const THEAD_CELL: React.CSSProperties = { ...CELL, background:"#1e3a5f", color:"#f1f5f9", fontWeight:700, textAlign:"left", border:"1px solid #16304d" };

// - Live Monitor helper components (dbForge-style) -
function MonitorChartCard({ title, subtitle, stats, children, empty }: { title:string; subtitle?:string; stats?:{label:string;value:string}[]; children:React.ReactNode; empty?:boolean }) {
  return (
    <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:"10px 12px",background:"#fff",marginBottom:10,position:"relative" }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font }}>{title}</div>
      {subtitle && <div style={{ fontSize:9.5,color:"#94a3b8",fontFamily:S.font,marginBottom:4 }}>{subtitle}</div>}
      <div style={{ display:"flex",gap:16,alignItems:"center" }}>
        <div style={{ flex:1,minWidth:0 }}>{children}</div>
        {stats && stats.length>0 && (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px 20px",flexShrink:0,minWidth:190,borderLeft:`1px solid ${S.border}`,paddingLeft:16 }}>
            {stats.map(s => (
              <div key={s.label}>
                <div style={{ fontSize:17,fontWeight:800,color:"#0f172a",fontFamily:S.font,lineHeight:1.1 }}>{s.value}</div>
                <div style={{ fontSize:9,color:"#94a3b8",fontFamily:S.font,marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      {empty && (
        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(255,255,255,0.85)",fontSize:11,color:"#94a3b8",fontFamily:S.font,gap:6 }}>
          <RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }}/> Collecting first live sample…
        </div>
      )}
    </div>
  );
}

// Renders a real Postgres EXPLAIN plan tree as connected operator boxes —
// the direct equivalent of SSMS's graphical execution plan. Node Type +
// relative cost % per node, children laid out left-to-right beneath their
// parent with a connecting line, matching the reference SSMS layout
// (Nested Loops / Filter / Index Seek boxes joined by lines, cost % shown
// under each box).
function PlanNode({ node, totalCost }: { node: any; totalCost?: number }) {
  if (!node) return null;
  const rootCost = totalCost ?? (node["Total Cost"] || 1);
  const ownCost = Math.max(0, (node["Total Cost"] || 0) - (node.Plans || []).reduce((s:number,c:any)=>s+(c["Total Cost"]||0),0));
  const pct = rootCost > 0 ? Math.round((ownCost / rootCost) * 100) : 0;
  const label = node["Node Type"] || "?";
  const detail = node["Relation Name"] || node["Index Name"] || node["Alias"] || "";
  const isScan = /Scan/i.test(label);
  const isJoin = /Join|Loop/i.test(label);

  return (
    <div style={{ display:"inline-flex",flexDirection:"column",alignItems:"center",verticalAlign:"top",padding:"0 10px" }}>
      <div style={{
        border:`1.5px solid ${isJoin?"#0e7490":isScan?"#7c3aed":"#94a3b8"}`,
        borderRadius:6, padding:"7px 10px", minWidth:110, textAlign:"center",
        background: isJoin?"#ecfeff":isScan?"#f5f3ff":"#f8fafc",
      }}>
        <div style={{ fontSize:11,fontWeight:700,color:"#1e293b",fontFamily:S.font,whiteSpace:"nowrap" }}>{label}</div>
        {detail && <div style={{ fontSize:9.5,color:"#64748b",fontFamily:"monospace",marginTop:1 }}>{detail}</div>}
        <div style={{ fontSize:9,color:pct>50?"#dc2626":"#16a34a",fontWeight:700,marginTop:2 }}>Cost: {pct}%</div>
      </div>
      {node.Plans?.length > 0 && (
        <>
          <div style={{ width:1,height:14,background:"#cbd5e1" }}/>
          <div style={{ display:"flex",alignItems:"flex-start" }}>
            {node.Plans.map((child:any,i:number)=>(
              <PlanNode key={i} node={child} totalCost={rootCost}/>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function MonitorTable({ title, headers, rows, empty }: { title:string; headers:string[]; rows:(string|number)[][]; empty?:string }) {
  return (
    <div style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",marginBottom:10,overflow:"hidden" }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font,padding:"10px 12px",borderBottom:`1px solid ${S.border}`,background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <span>{title}</span>
        {rows.length > 0 && <span style={{ fontSize:9.5,color:"#94a3b8",fontWeight:600 }}>{rows.length} row{rows.length===1?"":"s"}</span>}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize:12,color:"#94a3b8",fontFamily:S.font,padding:20,textAlign:"center" }}>{empty || "No data"}</div>
      ) : (
        <div style={{ overflowX:"auto",maxHeight:520,overflowY:"auto" }}>
          <table style={{ borderCollapse:"collapse",width:"100%",fontSize:11.5,fontFamily:S.font }}>
            <thead style={{ position:"sticky",top:0,zIndex:1 }}><tr>
              {headers.map(h => <th key={h} style={THEAD_CELL}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((row,i) => (
                <tr key={i} style={{ background:i%2===0?"#fff":"#f8fafc" }}
                  onMouseEnter={e=>(e.currentTarget.style.background="#eef4fb")}
                  onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f8fafc")}>
                  {row.map((cell,j) => <td key={j} style={CELL}>{String(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PropRow({ k, v }: { k:string; v:any }) {
  return (
    <div style={{ display:"flex",justifyContent:"space-between",gap:8,padding:"4px 12px",fontSize:10.5,fontFamily:S.font,borderBottom:"1px solid #eef2f7" }}>
      <span style={{ color:"#64748b" }}>{k}</span>
      <span style={{ color:"#0f172a",fontWeight:600,textAlign:"right",wordBreak:"break-word" }}>{v ?? "—"}</span>
    </div>
  );
}

// - Main Component -
function DBInner() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"tables"|"sql"|"schema"|"triggers"|"monitor"|"mssql">("tables");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["procurement","inventory"]));
  const [selectedTable, setSelectedTable] = useState<string>("requisitions");
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [allColumns, setAllColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [rowFilter, setRowFilter] = useState("");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [newRow, setNewRow] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string|null>(null);
  const [sql, setSql] = useState(`-- ProcurBosse Real SQL Editor
-- Embu Level 5 Hospital - EL5 MediProcure
-- Write any SQL query here

SELECT 
  t.table_name,
  (SELECT COUNT(*) FROM information_schema.columns c 
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS columns,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.table_name) AS policies
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;`);
  const [sqlResult, setSqlResult] = useState<any[]>([]);
  const [sqlError, setSqlError] = useState<string|null>(null);
  const [sqlHistory, setSqlHistory] = useState<any[]>([]);
  const [showSqlHistory, setShowSqlHistory] = useState(false);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlMs, setSqlMs] = useState<number|null>(null);
  const [schemaData, setSchemaData] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [dbDash, setDbDash] = useState<any | null>(null);
  const [dbDashLoading, setDbDashLoading] = useState(false);
  const [dbDashHistory, setDbDashHistory] = useState<{ t: number; active: number; cache: number }[]>([]);
  const [monitorSubTab, setMonitorSubTab] = useState<"overview"|"dataio"|"databases"|"waitstats"|"topqueries"|"sessions"|"backups"|"site"|"loggers"|"realtime"|"dbstats">("overview");
  const [liveStats, setLiveStats] = useState<any | null>(null);
  const [liveStatsLoading, setLiveStatsLoading] = useState(false);
  const [liveHistory, setLiveHistory] = useState<{ time:string; active:number; idle:number; idleTx:number; cacheHit:number; commitRate:number; readRate:number; hitRate:number }[]>([]);
  const liveStatsPrev = useRef<{ t:number; xact_commit:number; blks_read:number; blks_hit:number } | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<any | null>(null);
  const [queryPlan, setQueryPlan] = useState<any | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [trcMetric, setTrcMetric] = useState<"duration"|"calls"|"mean"|"rows"|"io">("duration");
  const [trcStatistic, setTrcStatistic] = useState<"total"|"average">("total");
  const [trcPortrait, setTrcPortrait] = useState(false);
  const [planForceMsg, setPlanForceMsg] = useState<string | null>(null);
  const [planSamples, setPlanSamples] = useState<{t:number; v:number}[]>([]);

  // SQL Server Bridge — real config + live status, never mocked
  const [bridgeCfg, setBridgeCfg] = useState<any | null>(null);
  const [bridgeStatus, setBridgeStatus] = useState<any | null>(null);
  const [bridgeChecking, setBridgeChecking] = useState(false);
  const [bridgeForm, setBridgeForm] = useState({ url: "", secret: "" });
  const [bridgeSaving, setBridgeSaving] = useState(false);
  const [bridgeSchema, setBridgeSchema] = useState<any[] | null>(null);
  const [realtimeLog, setRealtimeLog] = useState<any[]>([]);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [watchTables, setWatchTables] = useState<string[]>([]);
  const [rtEventFilter, setRtEventFilter] = useState<Record<"INSERT"|"UPDATE"|"DELETE",boolean>>({ INSERT:true, UPDATE:true, DELETE:true });
  const [rtExpanded, setRtExpanded] = useState<number|null>(null);
  const [rtEventCount, setRtEventCount] = useState(0);
  const [sqlViewMode, setSqlViewMode] = useState<"table"|"json">("table");
  const [tableCounts, setTableCounts] = useState<Record<string,number>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [savedQueries, setSavedQueries] = useState<{name:string;sql:string}[]>([
    { name:"All Tables",         sql:"SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;" },
    { name:"Table Stats",        sql:"SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name=t.table_name) AS cols FROM information_schema.tables t WHERE table_schema='public' ORDER BY table_name;" },
    { name:"Active Sessions",    sql:"SELECT * FROM user_sessions WHERE is_active=true ORDER BY last_activity DESC LIMIT 50;" },
    { name:"Recent Audit",       sql:"SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;" },
    { name:"Unread Notifs",      sql:"SELECT * FROM notifications WHERE is_read=false ORDER BY created_at DESC LIMIT 50;" },
    { name:"Pending Reqs",       sql:"SELECT * FROM requisitions WHERE status IN ('pending','submitted') ORDER BY created_at DESC LIMIT 50;" },
    { name:"Low Stock Items",    sql:"SELECT * FROM items WHERE quantity_in_stock < 10 ORDER BY quantity_in_stock ASC LIMIT 50;" },
    { name:"Open POs",           sql:"SELECT * FROM purchase_orders WHERE status IN ('pending','approved','open') ORDER BY created_at DESC LIMIT 50;" },
  ]);
  const [queryName, setQueryName] = useState("");
  const [selectedSaved, setSelectedSaved] = useState<string>("");
  const [profileNames, setProfileNames] = useState<Record<string,string>>({});
  const [itemNames, setItemNames] = useState<Record<string,string>>({});
  const sqlRef = useRef<HTMLTextAreaElement>(null);
  const rtChannel = useRef<any>(null);

  // - Load id -> name lookups so the grid never has to show raw uuids -
  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: items }] = await Promise.all([
        (supabase as any).from("profiles").select("id,full_name").limit(2000),
        (supabase as any).from("items").select("id,name").limit(2000),
      ]);
      setProfileNames(Object.fromEntries((profiles||[]).map((p:any)=>[p.id,p.full_name])));
      setItemNames(Object.fromEntries((items||[]).map((it:any)=>[it.id,it.name])));
    })();
  }, []);
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const resolveName = useCallback((v:any) => {
    if (typeof v !== "string" || !UUID_RE.test(v)) return null;
    return profileNames[v] || itemNames[v] || null;
  }, [profileNames, itemNames]);

  // - Row search: filters the currently loaded page across every column.
  // Works entirely on data already in memory, so it keeps working even
  // if the connection drops mid-session. -
  const filteredTableData = useMemo(() => {
    const needle = rowFilter.trim().toLowerCase();
    if (!needle) return tableData;
    return tableData.filter(row =>
      Object.values(row).some(v => v !== null && v !== undefined && String(v).toLowerCase().includes(needle))
    );
  }, [tableData, rowFilter]);

  useEffect(() => { setRowFilter(""); }, [selectedTable]);

  // - Load table data -
  const loadTable = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      // Count
      const { count } = await (supabase as any).from(selectedTable)
        .select("*", { count:"exact", head:true });
      setTotalRows(count || 0);

      // Data
      let q = (supabase as any).from(selectedTable).select("*");
      if (sortCol) q = q.order(sortCol, { ascending: sortAsc });
      q = q.range(page * pageSize, (page + 1) * pageSize - 1);
      const { data, error } = await q;
      if (error) throw error;
      setTableData(data || []);
      // Derive columns from first row (information_schema isn't exposed via PostgREST)
      if (data && data.length > 0) {
        const cols = Object.keys(data[0]);
        setTableColumns(cols);
        setAllColumns(cols.map(c => ({ column_name: c, data_type: typeof (data[0] as any)[c] })));
      } else {
        // Empty table — try to fetch a single sample with limit 0 to get headers via OPTIONS, fallback to common cols
        setTableColumns(prev => prev.length ? prev : ["id","created_at","updated_at"]);
      }
    } catch (e: any) {
      toast({ title:"Load error: " + e.message, variant:"destructive" });
      setTableData([]);
      setTableColumns([]);
    }
    setLoading(false);
  }, [selectedTable, page, pageSize, sortCol, sortAsc]);

  useEffect(() => { loadTable(); }, [loadTable]);

  // Auto-refresh for table data
  // (must come after the `loadTable` declaration above — this effect's
  // dependency array references `loadTable`, and that array is evaluated
  // synchronously on every render, so declaring this effect earlier than
  // `const loadTable = useCallback(...)` throws "Cannot access 'loadTable'
  // before initialization" on the very first render.)
  useEffect(()=>{
    if(!autoRefresh) return;
    const id = setInterval(()=>loadTable(), 15000);
    return ()=>clearInterval(id);
  },[autoRefresh, loadTable]);

  // - Load table row counts -
  useEffect(() => {
    const allTables = TABLE_GROUPS.flatMap(g => g.tables);
    Promise.all(allTables.map(async t => {
      try {
        const { count } = await (supabase as any).from(t).select("*",{count:"exact",head:true});
        return [t, count || 0];
      } catch { return [t, 0]; }
    })).then(results => {
      setTableCounts(Object.fromEntries(results));
    });
  }, [selectedTable]);

  // - Run SQL -
  async function loadSqlHistory() {
    try {
      const { data } = await (supabase as any).from("query_log").select("*").order("executed_at",{ascending:false}).limit(50);
      setSqlHistory(data||[]);
    } catch { /* query_log table may not exist — safe to ignore */ }
  }

  async function runSQL() {
    if (!sql.trim()) return;
    setSqlRunning(true); setSqlError(null); setSqlResult([]);
    const t0 = Date.now();
    try {
      // Split on semicolons, strip comment-only lines and blanks, run sequentially.
      // (Filtering by `statement.startsWith("--")` would drop this page's own
      // default query entirely — it starts with three header comment lines
      // followed by a real SELECT, so the whole multi-line chunk "starts with"
      // a comment even though it isn't one. Strip comment-only lines instead.)
      const statements = sql
        .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)   // split on ; outside quotes
        .map(s => s
          .split("\n")
          .filter(line => !line.trim().startsWith("--") && !line.trim().startsWith("/*"))
          .join("\n")
          .trim()
        )
        .filter(s => s.length > 0);

      let lastData: any = [];
      let totalRows = 0;

      for (const stmt of statements) {
        const { data, error } = await (supabase as any).rpc("exec_sql", { query: stmt });
        if (error) throw error;
        // exec_sql returns { rows: [...], rowCount: N, ok?: true } for both
        // SELECT and write statements. Extract rows for display; fall back to
        // legacy array-shape responses for backward compatibility.
        if (data && typeof data === "object" && "rows" in data) {
          lastData = Array.isArray((data as any).rows) ? (data as any).rows : [];
          totalRows += Number((data as any).rowCount ?? lastData.length) || 0;
          if (!lastData.length && (data as any).ok) {
            lastData = [{ status: "ok", rows_affected: (data as any).rowCount }];
          }
        } else {
          lastData = Array.isArray(data) ? data : [{ result: data }];
          totalRows += lastData.length;
        }
      }

      const ms = Date.now() - t0;
      setSqlMs(ms);
      setSqlResult(lastData);
      // Log query (best-effort, don't throw if query_log missing)
      try {
        await (supabase as any).from("query_log").insert({
          query_text: sql.slice(0,500),
          query_type: sql.trim().slice(0,6).toUpperCase(),
          rows_affected: totalRows,
          execution_ms: ms,
          executed_by: user?.id
        });
      } catch { /* query_log table may not exist — safe to ignore */ }
      loadSqlHistory();
      toast({ title: `✓ Query executed (${ms}ms, ${totalRows} rows)` });
    } catch (e: any) {
      setSqlError(e.message);
      setSqlMs(Date.now() - t0);
      toast({ title: "SQL Error: " + e.message, variant: "destructive" });
    }
    setSqlRunning(false);
  }

  const unwrapRows = (data: any): any[] =>
    data && typeof data === "object" && "rows" in data
      ? ((data as any).rows ?? [])
      : Array.isArray(data) ? data : [];

  // - Load schema -
  async function loadSchema() {
    const { data } = await (supabase as any).rpc("exec_sql", {
      query: `SELECT table_name, column_name, data_type, is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema='public' AND table_name='${selectedTable}'
              ORDER BY ordinal_position`
    });
    setSchemaData(unwrapRows(data));
  }

  // - Load triggers -
  async function loadTriggers() {
    const { data } = await (supabase as any).rpc("exec_sql", {
      query: `SELECT trigger_name, event_object_table, event_manipulation, action_timing,
                     action_statement
              FROM information_schema.triggers WHERE trigger_schema='public'
              ORDER BY event_object_table, trigger_name`
    });
    setTriggers(unwrapRows(data));
  }

  // - Load stats -
  async function loadStats() {
    const { data } = await (supabase as any).rpc("exec_sql", {
      query: `SELECT table_name, column_count, policy_count, trigger_count FROM db_stats`
    });
    setStats(unwrapRows(data));
  }

  // - Load live server/database dashboard (real pg_stat_* data, no mocks) -
  const loadDbDashboard = useCallback(async () => {
    setDbDashLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_db_dashboard_stats");
      if (error) throw error;
      setDbDash(data);
      setDbDashHistory(prev => [
        ...prev.slice(-29),
        { t: Date.now(), active: data?.connections?.active ?? 0, cache: data?.performance?.cache_hit_ratio ?? 0 },
      ]);
    } catch (e: any) {
      toast({ title: "Couldn't load database dashboard", description: e.message, variant: "destructive" });
    } finally {
      setDbDashLoading(false);
    }
  }, []);

  // Keep it genuinely live while the tab is open — real Postgres stats change
  // every second, so a 5s poll (not a static snapshot) is what makes this a
  // dashboard rather than a one-time report.
  useEffect(() => {
    if (activeTab !== "monitor" || monitorSubTab !== "dbstats") return;
    loadDbDashboard();
    const id = setInterval(loadDbDashboard, 5000);
    return () => clearInterval(id);
  }, [activeTab, monitorSubTab, loadDbDashboard]);

  // - Live Monitor (dbForge-style) — real pg_stat_activity / pg_stat_database /
  //   pg_stat_statements / pg_locks / pg_stat_bgwriter data, polled every 5s.
  //   Rates (commits/sec, reads/sec, cache-hits/sec) are computed client-side
  //   from consecutive cumulative-counter samples — Postgres exposes running
  //   totals, not per-second rates, so the delta has to happen here.
  const loadLiveStats = useCallback(async () => {
    setLiveStatsLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_live_monitor_stats");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLiveStats(data);

      const now = Date.now();
      const tx = data?.transactions || {};
      const prev = liveStatsPrev.current;
      let commitRate = 0, readRate = 0, hitRate = 0;
      if (prev) {
        const dt = Math.max(1, (now - prev.t) / 1000);
        commitRate = Math.max(0, Math.round((tx.xact_commit - prev.xact_commit) / dt));
        readRate = Math.max(0, Math.round((tx.blks_read - prev.blks_read) / dt));
        hitRate = Math.max(0, Math.round((tx.blks_hit - prev.blks_hit) / dt));
      }
      liveStatsPrev.current = { t: now, xact_commit: tx.xact_commit||0, blks_read: tx.blks_read||0, blks_hit: tx.blks_hit||0 };

      setLiveHistory(prevH => [
        ...prevH.slice(-39),
        {
          time: new Date(now).toLocaleTimeString("en-KE", { hour12:false }),
          active: data?.connections?.active ?? 0,
          idle: data?.connections?.idle ?? 0,
          idleTx: data?.connections?.idle_in_transaction ?? 0,
          cacheHit: tx.cache_hit_ratio ?? 0,
          commitRate, readRate, hitRate,
        },
      ]);
    } catch (e:any) {
      toast({ title:"Couldn't load live monitor", description:e.message, variant:"destructive" });
    } finally {
      setLiveStatsLoading(false);
    }
  }, []);

  // Real Postgres execution plan (EXPLAIN, not ANALYZE — so inspecting the
  // plan never actually re-executes the query) for the "Top Resource
  // Consumers" query plan tree, the direct equivalent of SSMS's graphical
  // execution plan.
  const loadQueryPlan = useCallback(async (q: any) => {
    setSelectedQuery(q);
    setQueryPlan(null);
    setPlanLoading(true);
    setPlanSamples([]);
    setPlanForceMsg(null);
    try {
      const { data, error } = await (supabase as any).rpc("explain_query_plan", { p_query: q.query_snippet });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setQueryPlan(Array.isArray(data) ? data[0]?.Plan : data);
    } catch (e:any) {
      setQueryPlan({ error: e.message });
    } finally {
      setPlanLoading(false);
    }
  }, []);

  // Real metric-value resolver — every value here comes straight from
  // pg_stat_statements, no synthetic scaling.
  const trcValue = useCallback((q: any) => {
    if (trcMetric === "calls") return q.calls ?? 0;
    if (trcMetric === "rows") return q.rows ?? 0;
    if (trcMetric === "io") return (q.shared_blks_hit ?? 0) + (q.shared_blks_read ?? 0);
    return trcStatistic === "average" ? (q.mean_exec_ms ?? 0) : (q.total_exec_ms ?? 0);
  }, [trcMetric, trcStatistic]);

  // Collects a real sample of the selected query's cumulative stat every
  // time liveStats refreshes (5s poll) — an honest "since you opened this
  // page" trend, not a fabricated last-hour history Postgres doesn't keep.
  useEffect(() => {
    if (!selectedQuery || !liveStats?.top_queries) return;
    const fresh = liveStats.top_queries.find((q:any) => q.query_id === selectedQuery.query_id);
    if (!fresh) return;
    setPlanSamples(prev => [...prev.slice(-59), { t: Date.now(), v: trcValue(fresh) }]);
  }, [liveStats, selectedQuery, trcValue]);

  useEffect(() => {
    if (activeTab !== "monitor") return;
    loadLiveStats();
    const id = setInterval(loadLiveStats, 5000);
    return () => clearInterval(id);
  }, [activeTab, loadLiveStats]);

  // ── SQL Server Bridge — loads real config, pings the real bridge, never fakes status ──
  const loadBridgeConfig = useCallback(async () => {
    const { data } = await (supabase as any).from("sqlserver_bridge_config").select("*").limit(1).maybeSingle();
    setBridgeCfg(data);
    if (data) setBridgeForm({ url: data.bridge_url || "", secret: data.shared_secret || "" });
  }, []);

  const pingBridge = useCallback(async () => {
    setBridgeChecking(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("mssql-bridge", { body: { action: "ping" } });
      if (error) throw error;
      setBridgeStatus(data);
    } catch (e: any) {
      setBridgeStatus({ ok: false, connected: false, reason: e.message });
    } finally {
      setBridgeChecking(false);
    }
  }, []);

  const saveBridgeConfig = async (enable: boolean) => {
    setBridgeSaving(true);
    try {
      const { error } = await (supabase as any).from("sqlserver_bridge_config").update({
        bridge_url: bridgeForm.url.trim(),
        shared_secret: bridgeForm.secret.trim(),
        is_enabled: enable,
        updated_at: new Date().toISOString(),
      }).eq("id", bridgeCfg.id);
      if (error) throw error;
      toast({ title: enable ? "✓ Bridge enabled" : "Bridge disabled", description: enable ? "Pinging now…" : "No requests will be sent to the bridge while disabled." });
      await loadBridgeConfig();
      if (enable) await pingBridge();
      else setBridgeStatus(null);
    } catch (e: any) {
      toast({ title: "Couldn't save bridge config", description: e.message, variant: "destructive" });
    } finally {
      setBridgeSaving(false);
    }
  };

  const loadBridgeSchema = async () => {
    try {
      const { data, error } = await (supabase as any).functions.invoke("mssql-bridge", { body: { action: "schema" } });
      if (error) throw error;
      if (!data?.connected) { toast({ title: "Bridge not connected", description: data?.reason, variant: "destructive" }); return; }
      setBridgeSchema(data.data?.tables || []);
    } catch (e: any) {
      toast({ title: "Couldn't load SQL Server schema", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeTab !== "mssql") return;
    loadBridgeConfig().then(() => {});
  }, [activeTab, loadBridgeConfig]);

  useEffect(() => {
    if (activeTab !== "mssql" || !bridgeCfg?.is_enabled) return;
    pingBridge();
    const id = setInterval(pingBridge, 10000);
    return () => clearInterval(id);
  }, [activeTab, bridgeCfg?.is_enabled, pingBridge]);

  // - Realtime -
  function toggleRealtime() {
    if (realtimeOn) {
      rtChannel.current?.unsubscribe();
      setRealtimeOn(false);
      toast({ title: "- Realtime disconnected" });
    } else {
      const tables = watchTables.length ? watchTables : [selectedTable];
      let ch = (supabase as any).channel("db-changes-monitor-" + Date.now());
      for (const t of tables) {
        ch = ch.on("postgres_changes", { event:"*", schema:"public", table:t }, (payload: any) => {
          setRealtimeLog(p => [{
            time: new Date().toLocaleTimeString("en-KE"),
            event: payload.eventType,
            table: payload.table,
            row: payload.new || payload.old || {},
            data: JSON.stringify(payload.new || payload.old || {}).slice(0,120),
          }, ...p.slice(0,99)]);
          setRtEventCount(c => c + 1);
        });
      }
      rtChannel.current = ch.subscribe();
      setRealtimeOn(true);
      setRtEventCount(0);
      toast({ title: `- Realtime connected to ${tables.length} table${tables.length===1?"":"s"}` });
    }
  }

  // - Save row edit -
  async function saveEdit() {
    if (!editingRow) return;
    const { id, ...data } = editingRow;
    const { error } = await (supabase as any).from(selectedTable).update(data).eq("id", id);
    if (error) { toast({ title:"Update failed: "+error.message, variant:"destructive" }); return; }
    toast({ title:"- Row updated" });
    setEditingRow(null);
    loadTable();
  }

  async function saveNew() {
    if (!newRow) return;
    const { error } = await (supabase as any).from(selectedTable).insert(newRow);
    if (error) { toast({ title:"Insert failed: "+error.message, variant:"destructive" }); return; }
    toast({ title:"- Row inserted" });
    setNewRow(null);
    loadTable();
  }

  async function deleteRow(id: string) {
    const { error } = await (supabase as any).from(selectedTable).delete().eq("id", id);
    if (error) { toast({ title:"Delete failed: "+error.message, variant:"destructive" }); return; }
    toast({ title:"Row deleted" });
    setDeleteConfirm(null);
    loadTable();
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tableData), selectedTable);
    XLSX.writeFile(wb, `${selectedTable}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  // - Tab nav -
  const tabs = [
    { id:"tables",   label:"Tables",        icon:TableIcon },
    { id:"sql",      label:"SQL Editor",    icon:Code2 },
    { id:"schema",   label:"Schema",        icon:Layers },
    { id:"triggers", label:"Triggers",      icon:Zap },
    { id:"monitor",  label:"Live Monitor",  icon:Activity },
    { id:"mssql",    label:"SQL Server Bridge", icon:Server },
  ];

  // Cleanup rtChannel on unmount
  React.useEffect(()=>{
    return ()=>{ if(rtChannel.current){ (supabase as any).removeChannel(rtChannel.current); rtChannel.current=null; } };
  },[]);

  return (
    <div style={{ height:"100%",display:"flex",flexDirection:"column",background:"#ffffff",fontFamily:SSMS.font,color:SSMS.titleText,minHeight:"100%" }}>
      <AdminBreadcrumb />

      {/* ── Toolbar: page context, real actions (New Query/Refresh/Execute), realtime status, connection ── */}
      <div style={{ background:SSMS.toolbar,borderBottom:`1px solid ${SSMS.toolbarBd}`,padding:"6px 12px",display:"flex",alignItems:"center",gap:6,flexShrink:0,flexWrap:"wrap" }}>
        <Database style={{ width:14,height:14,color:SSMS.accent,flexShrink:0 }} />
        <span style={{ fontSize:12,fontWeight:600,color:SSMS.titleText,marginRight:6 }}>
          {selectedTable || "Database Administration"}
        </span>
        <div style={{ width:1,height:18,background:SSMS.toolbarBd,margin:"0 2px" }} />
        <button onClick={()=>{setActiveTab("sql");}} title="New Query"
          style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:"transparent",border:"1px solid transparent",borderRadius:3,cursor:"pointer",fontSize:11.5,color:SSMS.titleText }}
          onMouseEnter={e=>{e.currentTarget.style.background="#dbe6f2";e.currentTarget.style.borderColor=SSMS.toolbarBd;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
          <FileText style={{ width:13,height:13,color:SSMS.accent }} /> New Query
        </button>
        <div style={{ width:1,height:18,background:SSMS.toolbarBd,margin:"0 4px" }} />
        <button onClick={loadTable} title="Refresh"
          style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:"transparent",border:"1px solid transparent",borderRadius:3,cursor:"pointer",fontSize:11.5,color:SSMS.titleText }}
          onMouseEnter={e=>{e.currentTarget.style.background="#dbe6f2";e.currentTarget.style.borderColor=SSMS.toolbarBd;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
          <RefreshCw style={{ width:13,height:13,color:SSMS.accent }} /> Refresh
        </button>
        {activeTab==="sql" && (
          <>
            <div style={{ width:1,height:18,background:SSMS.toolbarBd,margin:"0 4px" }} />
            <button onClick={runSQL} disabled={sqlRunning} title="Execute (⌘↵)"
              style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 9px",background:"transparent",border:"1px solid transparent",borderRadius:3,cursor:sqlRunning?"not-allowed":"pointer",fontSize:11.5,color:sqlRunning?"#94a3b8":SSMS.titleText,fontWeight:600 }}>
              <Play style={{ width:13,height:13,color: sqlRunning?"#94a3b8":"#16a34a" }} /> {sqlRunning?"Executing…":"Execute"}
            </button>
          </>
        )}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <div style={{ background:realtimeOn?"#16a34a":"#94a3b8",width:7,height:7,borderRadius:"50%" }} />
            <span style={{ fontSize:10.5,color:"#475569" }}>{realtimeOn?"Realtime ON":"Realtime OFF"}</span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6,fontSize:10.5,color:"#64748b" }}>
            <Server style={{ width:11,height:11 }} />
            <span>yvjfehnzbzjliizjvuhq.supabase.co</span>
          </div>
        </div>
      </div>

      {/* ── Document tabs (SSMS style) ── */}
      <div style={{ display:"flex",borderBottom:`1px solid ${SSMS.tabBorder}`,background:SSMS.tabInactive,flexShrink:0,paddingTop:4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id as any); if(t.id==="schema") loadSchema(); if(t.id==="triggers") loadTriggers(); if(t.id==="stats") loadStats(); }}
            style={{
              display:"flex",alignItems:"center",gap:6,padding:"6px 16px",
              border:`1px solid ${activeTab===t.id?SSMS.tabBorder:"transparent"}`,
              borderBottom: activeTab===t.id ? `1px solid ${SSMS.tabActive}` : `1px solid transparent`,
              borderTopLeftRadius:3, borderTopRightRadius:3,
              background: activeTab===t.id ? SSMS.tabActive : "transparent",
              cursor:"pointer", fontFamily:SSMS.font, fontSize:12,
              fontWeight: activeTab===t.id ? 600 : 400,
              color: activeTab===t.id ? SSMS.titleText : "#475569",
              marginBottom:-1, position:"relative", top:1,
              boxShadow: activeTab===t.id ? "0 -1px 0 rgba(0,0,0,0.02)" : "none",
            }}>
            <t.icon style={{ width:12,height:12, color: activeTab===t.id ? SSMS.accent : "#94a3b8" }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* - Main content - */}
      <div style={{ flex:1,display:"flex",overflow:"hidden" }}>

        {/* Left sidebar - table tree, styled as SSMS Object Explorer */}
        {activeTab === "tables" && (
          <div style={{ width:230,borderRight:`1px solid ${SSMS.toolbarBd}`,overflowY:"auto",background:"#ffffff",flexShrink:0,display:"flex",flexDirection:"column" }}>
            <div style={{ background:SSMS.explorerHd,borderBottom:`1px solid ${SSMS.toolbarBd}`,padding:"5px 8px",display:"flex",alignItems:"center",gap:6 }}>
              <span style={{ fontSize:11,fontWeight:700,color:SSMS.titleText }}>Object Explorer</span>
              <div style={{ marginLeft:"auto",display:"flex",gap:4 }}>
                <button onClick={loadTable} title="Refresh" style={{ background:"none",border:"none",cursor:"pointer",padding:2,display:"flex" }}>
                  <RefreshCw style={{ width:11,height:11,color:"#64748b" }} />
                </button>
              </div>
            </div>
            <div style={{ padding:"5px 8px",borderBottom:`1px solid ${SSMS.toolbarBd}`,background:"#fafbfc",display:"flex",alignItems:"center",gap:5 }}>
              <Server style={{ width:11,height:11,color:SSMS.accent,flexShrink:0 }} />
              <span style={{ fontSize:10.5,color:"#475569",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>yvjfehnzbzjliizjvuhq (Supabase)</span>
            </div>
            <div style={{ padding:"6px 8px",borderBottom:`1px solid ${S.border}`,background:S.head }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search tables-"
                style={{ width:"100%",border:`1px solid ${S.border}`,padding:"3px 6px",fontSize:11,fontFamily:S.font,outline:"none",boxSizing:"border-box" }} />
            </div>
            {TABLE_GROUPS.map(grp => {
              const filtered = grp.tables.filter(t => t.toLowerCase().includes(search.toLowerCase()));
              if (filtered.length === 0) return null;
              const isOpen = openGroups.has(grp.id);
              return (
                <div key={grp.id}>
                  <button onClick={() => setOpenGroups(p => { const s=new Set(p); s.has(grp.id)?s.delete(grp.id):s.add(grp.id); return s; })}
                    style={{ width:"100%",display:"flex",alignItems:"center",gap:6,padding:"5px 8px",background:"transparent",border:"none",cursor:"pointer",borderBottom:`1px solid rgba(255,255,255,0.05)` }}>
                    {isOpen ? <ChevronDown style={{ width:11,height:11,color:grp.color }} /> : <ChevronRight style={{ width:11,height:11,color:grp.color }} />}
                    <span style={{ fontSize:11,fontWeight:700,color:grp.color,fontFamily:S.font }}>{grp.label}</span>
                    <span style={{ fontSize:9,color:"#888",marginLeft:"auto",fontFamily:S.font }}>({filtered.length})</span>
                  </button>
                  {isOpen && filtered.map(t => (
                    <button key={t} onClick={() => { setSelectedTable(t); setPage(0); setSearch(""); }}
                      style={{ width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px 4px 22px",background:selectedTable===t?"rgba(59,130,246,0.2)":"transparent",border:"none",borderBottom:`1px solid #e8e8e8`,cursor:"pointer" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                        <TableIcon style={{ width:10,height:10,color:grp.color,flexShrink:0 }} />
                        <span style={{ fontSize:11,fontFamily:S.font,color:S.fg,fontWeight:selectedTable===t?700:400 }}>{t}</span>
                      </div>
                      {tableCounts[t] !== undefined && (
                        <span style={{ fontSize:9,color:"#888",background:"#e0e0e0",borderRadius:8,padding:"0 4px",fontFamily:S.font }}>{tableCounts[t]}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* - TABLES tab - */}
        {activeTab === "tables" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
            {/* Toolbar */}
            <div style={{ padding:"6px 12px",display:"flex",alignItems:"center",gap:8,background:"#f8fafc",flexShrink:0,borderBottom:`1px solid ${S.border}` }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>{selectedTable}</span>
              <span style={{ fontSize:11,color:"#64748b",fontFamily:S.font }}>({totalRows.toLocaleString()} rows)</span>
              <div style={{ display:"flex",alignItems:"center",gap:4,border:`1px solid ${S.border}`,padding:"2px 6px",background:S.bg,marginLeft:8 }}>
                <Search style={{ width:11,height:11,color:"#94a3b8" }} />
                <input value={rowFilter} onChange={e=>setRowFilter(e.target.value)} placeholder="Filter rows on this page…"
                  style={{ border:"none",outline:"none",fontSize:11,fontFamily:S.font,width:160 }} />
                {rowFilter && <button onClick={()=>setRowFilter("")} style={{ background:"none",border:"none",cursor:"pointer",padding:0,display:"flex" }}><X style={{ width:10,height:10,color:"#94a3b8" }} /></button>}
              </div>
              {rowFilter.trim() && <span style={{ fontSize:10,color:"#64748b",fontFamily:S.font }}>{filteredTableData.length} match{filteredTableData.length===1?"":"es"}</span>}
              <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
                <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} style={{ border:`1px solid ${S.border}`,padding:"3px 6px",fontSize:11,fontFamily:S.font }}>
                  {[25,50,100,200,500].map(n=><option key={n}>{n}</option>)}
                </select>
                <button onClick={() => setNewRow(Object.fromEntries(tableColumns.filter(c=>c!=="id"&&c!=="created_at"&&c!=="updated_at").map(c=>[c,""])))}
                  style={{ border:`1px solid #003087`,background:"#003087",color:"#fff",padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:4 }}>
                  <Plus style={{ width:11,height:11 }} /> New Row
                </button>
                <button onClick={exportExcel} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:4 }}>
                  <Download style={{ width:11,height:11 }} /> Export
                </button>
                <button onClick={()=>{
                  if(!filteredTableData.length){ toast({title:"No rows to print"}); return; }
                  const cols = tableColumns.filter(c=>c!=="id");
                  printDataTable({
                    title:    `${selectedTable.toUpperCase()} — TABLE EXPORT`,
                    docNo:    selectedTable,
                    columns:  cols,
                    rows:     filteredTableData.map(row=>cols.map(c=>{
                      const v=row[c];
                      if(v===null||v===undefined) return "";
                      if(typeof v==="object") return "[JSON]";
                      return String(v).slice(0,80);
                    })),
                    filename: `${selectedTable}-export-${Date.now()}`,
                    meta:     `${filteredTableData.length} of ${totalRows.toLocaleString()} rows${rowFilter.trim()?` (filtered: "${rowFilter.trim()}")`:""} · Page ${page+1}`,
                  }).catch(()=>toast({title:"Print failed",variant:"destructive"}));
                }} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:4 }}>
                  <Printer style={{ width:11,height:11 }} /> Print
                </button>
                <button onClick={toggleRealtime} style={{ border:`1px solid ${realtimeOn?"#006600":"#b0b0b0"}`,background:realtimeOn?"#006600":S.bg,color:realtimeOn?"#fff":S.fg,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>
                  {realtimeOn?"Stop RT":"Live RT"}
                </button>
              </div>
            </div>

            {/* New row form */}
            {newRow && (
              <div style={{ padding:"8px 12px",background:"#fef3c7",borderBottom:`1px solid ${S.border}`,display:"flex",gap:8,flexWrap:"wrap" as const,alignItems:"center" }}>
                <span style={{ fontSize:11,fontWeight:700,fontFamily:S.font }}>New Row:</span>
                {Object.keys(newRow).slice(0,8).map(k => (
                  <div key={k} style={{ display:"flex",alignItems:"center",gap:3 }}>
                    <label style={{ fontSize:10,fontFamily:S.font,color:"#666" }}>{k}:</label>
                    <input value={newRow[k]} onChange={e=>setNewRow((p:any)=>({...p,[k]:e.target.value}))}
                      style={{ border:`1px solid ${S.border}`,padding:"2px 5px",fontSize:11,fontFamily:S.font,width:100 }} />
                  </div>
                ))}
                <button onClick={saveNew} style={{ background:"#003087",color:"#fff",border:"none",padding:"4px 12px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Insert</button>
                <button onClick={()=>setNewRow(null)} style={{ background:S.bg,border:`1px solid ${S.border}`,padding:"4px 12px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Cancel</button>
              </div>
            )}

            {/* Table */}
            <div style={{ flex:1,overflow:"auto" }}>
              {loading ? (
                <div style={{ padding:20,textAlign:"center",fontFamily:S.font }}>Loading {selectedTable}-</div>
              ) : (
                <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                  <thead style={{ position:"sticky",top:0,zIndex:10,background:S.head }}>
                    <tr>
                      <th style={{ ...CELL,background:"#1e3a5f",color:"#f1f5f9",fontWeight:700,width:60 }}>Actions</th>
                      {tableColumns.filter(col=>col!=="id").map(col => (
                        <th key={col} onClick={() => { setSortCol(col); setSortAsc(s=>sortCol===col?!s:true); }}
                          style={{ ...CELL,background:"#1e3a5f",color:"#f1f5f9",fontWeight:700,cursor:"pointer",userSelect:"none" }}>
                          {col}{sortCol===col?(sortAsc?" -":" -"):""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTableData.map((row, ri) => (
                      <tr key={row.id||ri} style={{ background:ri%2===0?"#ffffff":"#f8fafc" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="#e0e7ff")}
                        onMouseLeave={e=>(e.currentTarget.style.background=ri%2===0?"#ffffff":"#f8fafc")}>
                        <td style={{ ...CELL,width:60,textAlign:"center" }}>
                          <div style={{ display:"flex",gap:3,justifyContent:"center" }}>
                            <button title="Edit" onClick={() => setEditingRow({...row})} style={{ background:"none",border:"none",cursor:"pointer",padding:2 }}>
                              <Edit3 style={{ width:12,height:12,color:"#003087" }} />
                            </button>
                            <button title="Delete" onClick={() => setDeleteConfirm(row.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:2 }}>
                              <Trash2 style={{ width:12,height:12,color:"#cc0000" }} />
                            </button>
                          </div>
                        </td>
                        {tableColumns.filter(col=>col!=="id").map(col => (
                          <td key={col} style={CELL} title={resolveName(row[col]) || String(row[col]??"")} >
                            {editingRow?.id === row.id
                              ? <input value={editingRow[col]??""} onChange={e=>setEditingRow((p:any)=>({...p,[col]:e.target.value}))}
                                  style={{ border:`1px solid #003087`,padding:"1px 4px",fontSize:11,fontFamily:S.font,width:"100%",minWidth:80 }} />
                              : (() => {
                                  const v = row[col];
                                  if (v === null || v === undefined) return <span style={{ color:"#999" }}>null</span>;
                                  if (typeof v === "boolean") return <span style={{ color:v?"#006600":"#cc0000",fontWeight:700 }}>{v?"true":"false"}</span>;
                                  const name = resolveName(v);
                                  if (name) return <span style={{ color:"#003087",fontWeight:600 }}>{name}</span>;
                                  if (typeof v === "string" && UUID_RE.test(v)) return <span style={{ color:"#94a3b8",fontStyle:"italic" as const }}>linked record</span>;
                                  const sv = String(v);
                                  if (sv.includes("T") && sv.includes(":") && sv.length > 16) return sv.slice(0,16).replace("T"," ");
                                  if (typeof v === "object") return <span style={{ color:"#555",fontStyle:"italic" as const }}>[JSON]</span>;
                                  return sv.slice(0,100);
                                })()
                            }
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div style={{ padding:"6px 12px",borderTop:`1px solid ${S.border}`,display:"flex",alignItems:"center",gap:10,background:"#f8fafc",flexShrink:0,fontFamily:S.font,fontSize:11,color:"#0f172a" }}>
              <span>Page {page+1} of {Math.ceil(totalRows/pageSize)} ({totalRows.toLocaleString()} rows)</span>
              <div style={{ marginLeft:"auto",display:"flex",gap:4 }}>
                <button disabled={page===0} onClick={()=>setPage(0)} style={{ border:`1px solid ${S.border}`,padding:"2px 8px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>-</button>
                <button disabled={page===0} onClick={()=>setPage(p=>p-1)} style={{ border:`1px solid ${S.border}`,padding:"2px 8px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>-</button>
                <button disabled={(page+1)*pageSize>=totalRows} onClick={()=>setPage(p=>p+1)} style={{ border:`1px solid ${S.border}`,padding:"2px 8px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>-</button>
                <button disabled={(page+1)*pageSize>=totalRows} onClick={()=>setPage(Math.ceil(totalRows/pageSize)-1)} style={{ border:`1px solid ${S.border}`,padding:"2px 8px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>-</button>
              </div>
            </div>

            {/* Edit modal */}
            {editingRow && (
              <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <div style={{ background:"#1e293b",border:`2px solid #3b82f6`,padding:20,maxWidth:700,width:"90%",maxHeight:"80vh",overflowY:"auto",fontFamily:S.font }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:14 }}>
                    <span style={{ fontSize:14,fontWeight:700,color:"#60a5fa",fontFamily:S.font }}>Edit Row - {selectedTable}</span>
                    <button onClick={()=>setEditingRow(null)} style={{ background:"none",border:"none",cursor:"pointer" }}><X style={{ width:16,height:16 }} /></button>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                    {Object.keys(editingRow).filter(k=>k!=="id").map(k => (
                      <div key={k}>
                        <label style={{ fontSize:10,fontWeight:700,color:"#333",fontFamily:S.font,display:"block",marginBottom:2 }}>{k}</label>
                        <input value={editingRow[k]??""} onChange={e=>setEditingRow((p:any)=>({...p,[k]:e.target.value}))}
                          disabled={k==="id"||k==="created_at"}
                          style={{ width:"100%",border:`1px solid ${k==="id"?"#ccc":S.border}`,padding:"5px 8px",fontSize:12,fontFamily:S.font,background:k==="id"||k==="created_at"?"#f5f5f5":S.bg,boxSizing:"border-box" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14,display:"flex",gap:8,justifyContent:"flex-end" }}>
                    <button onClick={saveEdit} style={{ background:"#003087",color:"#fff",border:"none",padding:"7px 20px",cursor:"pointer",fontFamily:S.font,fontSize:12,fontWeight:700 }}>Save Changes</button>
                    <button onClick={()=>setEditingRow(null)} style={{ background:S.bg,border:`1px solid ${S.border}`,padding:"7px 16px",cursor:"pointer",fontFamily:S.font,fontSize:12 }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete confirm */}
            {deleteConfirm && (
              <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <div style={{ background:"#1e293b",border:`2px solid #ef4444`,padding:24,maxWidth:400,fontFamily:S.font }}>
                  <div style={{ fontSize:14,fontWeight:700,color:"#cc0000",marginBottom:12 }}>Confirm Delete</div>
                  <p style={{ fontSize:12,marginBottom:16 }}>Delete this row from <strong>{selectedTable}</strong>?<br/>This cannot be undone.</p>
                  <div style={{ display:"flex",gap:8,justifyContent:"flex-end" }}>
                    <button onClick={()=>deleteRow(deleteConfirm)} style={{ background:"#cc0000",color:"#fff",border:"none",padding:"6px 16px",cursor:"pointer",fontFamily:S.font,fontWeight:700 }}>Delete</button>
                    <button onClick={()=>setDeleteConfirm(null)} style={{ background:S.bg,border:`1px solid ${S.border}`,padding:"6px 14px",cursor:"pointer",fontFamily:S.font }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* - SQL EDITOR tab - */}
        {activeTab === "sql" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#fff" }}>
            <div style={{ padding:"9px 14px",display:"flex",alignItems:"center",gap:10,background:"#f8fafc",flexShrink:0,borderBottom:`1px solid ${S.border}`,boxShadow:"0 1px 2px rgba(0,0,0,.04)",flexWrap:"wrap" as const }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087",letterSpacing:.2 }}>SQL Editor PRO</span>
              {sqlMs !== null && <span style={{ fontSize:11,color:"#059669",fontFamily:S.font,background:"#ecfdf5",border:"1px solid #a7f3d0",padding:"2px 8px",borderRadius:12,fontWeight:700 }}>⏱ {sqlMs}ms</span>}
              {/* Saved queries */}
              <select value={selectedSaved} onChange={e=>{
                const q=savedQueries.find(q=>q.name===e.target.value);
                if(q){ setSql(q.sql); setSelectedSaved(e.target.value); } else setSelectedSaved("");
              }} style={{ border:`1px solid ${S.border}`,borderRadius:5,padding:"5px 8px",fontSize:11,fontFamily:S.font,background:"#fff",maxWidth:160,color:"#334155" }}>
                <option value="">— Saved Queries —</option>
                {savedQueries.map(q=><option key={q.name} value={q.name}>{q.name}</option>)}
              </select>
              {/* Save current */}
              <div style={{ display:"flex",gap:5,alignItems:"center" }}>
                <input value={queryName} onChange={e=>setQueryName(e.target.value)} placeholder="Save as…"
                  style={{ border:`1px solid ${S.border}`,borderRadius:5,padding:"5px 8px",fontSize:11,fontFamily:S.font,background:"#fff",width:110,color:"#334155" }} />
                <button onClick={()=>{ if(!queryName||!sql.trim()){toast({title:"Name & SQL required"});return;} setSavedQueries(p=>[...p.filter(q=>q.name!==queryName),{name:queryName,sql}]); setQueryName(""); toast({title:"Query saved"}); }}
                  title="Save query"
                  style={{ border:`1px solid ${S.border}`,borderRadius:5,background:"#fff",padding:"5px 8px",cursor:"pointer",fontFamily:S.font,fontSize:12,lineHeight:1 }}>💾</button>
              </div>
              <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"center" }}>
                {/* Auto-refresh */}
                <button onClick={()=>setAutoRefresh(p=>!p)} style={{ border:`1px solid ${autoRefresh?"#006600":S.border}`,borderRadius:6,background:autoRefresh?"#006600":"#fff",color:autoRefresh?"#fff":S.fg,padding:"5px 11px",cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:5,fontWeight:600 }}>
                  <div style={{ width:6,height:6,borderRadius:"50%",background:autoRefresh?"#4ade80":"#ccc" }} />{autoRefresh?"AUTO 15s":"Auto OFF"}
                </button>
                <div style={{ width:1,height:20,background:S.border }} />
                <button onClick={()=>{
                  if(!sqlResult.length){ toast({title:"Run a query first"}); return; }
                  const cols=Object.keys(sqlResult[0]||{});
                  printDataTable({
                    title:    "SQL QUERY RESULT",
                    docNo:    `ROWS-${sqlResult.length}`,
                    columns:  cols,
                    rows:     sqlResult.map(r=>cols.map(c=>r[c]==null?"":String(r[c]))),
                    filename: `sql-result-${Date.now()}`,
                    meta:     `Query: ${sql.trim().slice(0,300)}${sql.trim().length>300?"…":""}  ·  ${sqlResult.length} rows · ${sqlMs}ms`,
                  }).catch(()=>toast({title:"Print failed",variant:"destructive"}));
                }} style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",padding:"5px 11px",cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:5,color:"#334155",fontWeight:600 }}>
                  <Printer style={{width:11,height:11}}/> Print
                </button>
                <button onClick={()=>{
                  if(!sqlResult.length){ toast({title:"Run a query first"}); return; }
                  navigator.clipboard.writeText(JSON.stringify(sqlResult,null,2))
                    .then(()=>toast({title:`✓ Copied ${sqlResult.length} rows as JSON`}))
                    .catch(()=>toast({title:"Copy failed",variant:"destructive"}));
                }} style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",padding:"5px 11px",cursor:"pointer",fontFamily:S.font,fontSize:11,color:"#334155",fontWeight:600 }}>
                  📋 Copy
                </button>
                <button onClick={()=>{
                  if(!sqlResult.length){ toast({title:"Run a query first"}); return; }
                  const cols=Object.keys(sqlResult[0]||{});
                  const esc=(v:any)=>{ if(v==null) return ""; const s=typeof v==="object"?JSON.stringify(v):String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
                  const csv=[cols.join(","), ...sqlResult.map(r=>cols.map(c=>esc(r[c])).join(","))].join("\n");
                  const blob=new Blob([csv],{type:"text/csv"});
                  const url=URL.createObjectURL(blob);
                  const a=document.createElement("a"); a.href=url; a.download=`sql-result-${Date.now()}.csv`; a.click();
                  URL.revokeObjectURL(url);
                }} style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",padding:"5px 11px",cursor:"pointer",fontFamily:S.font,fontSize:11,color:"#334155",fontWeight:600 }}>
                  <Download style={{width:11,height:11,display:"inline",marginRight:3,verticalAlign:"-1px"}}/>CSV
                </button>
                <div style={{ width:1,height:20,background:S.border }} />
                <button onClick={()=>{ const next=!showSqlHistory; setShowSqlHistory(next); if(next && !sqlHistory.length) loadSqlHistory(); }}
                  style={{ border:`1px solid ${S.border}`,background:showSqlHistory?"#003087":"#fff",color:showSqlHistory?"#fff":"#334155",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:4 }}>
                  <Clock style={{width:11,height:11}}/>History
                </button>
                <button onClick={async()=>{
                  if(!sqlHistory.length) await loadSqlHistory();
                  const rows = sqlHistory.length ? sqlHistory : [];
                  if(!rows.length){ toast({title:"No job history to print"}); return; }
                  printDataTable({
                    title: "SQL JOB LOG",
                    docNo: `${rows.length} RUNS`,
                    columns: ["executed_at","query_type","query_text","rows_affected","execution_ms","error_message"],
                    rows: rows.map((r:any)=>[
                      r.executed_at ? new Date(r.executed_at).toLocaleString("en-KE") : "",
                      r.query_type||"", (r.query_text||"").slice(0,120),
                      r.rows_affected ?? "", r.execution_ms!=null?`${r.execution_ms}ms`:"", r.error_message||"",
                    ]),
                    filename: `sql-job-log-${Date.now()}`,
                    meta: `Query execution history · ${rows.length} run(s) shown`,
                  }).catch(()=>toast({title:"Print failed",variant:"destructive"}));
                }} style={{ border:`1px solid ${S.border}`,background:"#fff",color:"#334155",padding:"5px 10px",borderRadius:6,cursor:"pointer",fontFamily:S.font,fontSize:11,display:"flex",alignItems:"center",gap:4 }}>
                  <Printer style={{width:11,height:11}}/>Print Job Log
                </button>
                <div style={{ width:1,height:20,background:S.border }} />
                <div style={{ display:"flex",border:`1px solid ${S.border}`,borderRadius:6,overflow:"hidden" }}>
                  <button onClick={()=>setSqlViewMode("table")} style={{ border:"none",background:sqlViewMode==="table"?"#003087":"#fff",color:sqlViewMode==="table"?"#fff":"#334155",padding:"5px 10px",cursor:"pointer",fontFamily:S.font,fontSize:10,fontWeight:700 }}>TABLE</button>
                  <button onClick={()=>setSqlViewMode("json")} style={{ border:"none",background:sqlViewMode==="json"?"#003087":"#fff",color:sqlViewMode==="json"?"#fff":"#334155",padding:"5px 10px",cursor:"pointer",fontFamily:S.font,fontSize:10,fontWeight:700 }}>JSON</button>
                </div>
                <button onClick={runSQL} disabled={sqlRunning} style={{ background:sqlRunning?"#5b7db1":"#003087",color:"#fff",border:"none",borderRadius:6,padding:"6px 16px",cursor:sqlRunning?"not-allowed":"pointer",fontFamily:S.font,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5,boxShadow:"0 1px 3px rgba(0,48,135,.3)" }}>
                  <Play style={{ width:12,height:12 }} />{sqlRunning?"Running…":"Run ⌘↵"}
                </button>
              </div>
            </div>
            <div style={{ flex:"0 0 220px",borderBottom:`2px solid #003087`,position:"relative" }}>
              <textarea
                ref={sqlRef}
                value={sql}
                onChange={e=>setSql(e.target.value)}
                onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){ e.preventDefault(); runSQL(); } }}
                style={{ width:"100%",height:"100%",border:"none",padding:14,fontSize:13,fontFamily:S.mono,color:"#1e293b",background:"#fbfcfe",resize:"none",outline:"none",boxSizing:"border-box",lineHeight:1.7 }}
                placeholder="-- Write SQL here (Ctrl+Enter to run)"
                spellCheck={false}
              />
              <div style={{ position:"absolute",bottom:6,right:10,fontSize:10,color:"#94a3b8",fontFamily:S.font,background:"#fbfcfe",padding:"1px 5px" }}>Ctrl+Enter to run</div>
            </div>
            <div style={{ flex:1,overflow:"auto",padding:0 }}>
              {showSqlHistory && (
                <div style={{ margin:12,border:`1px solid ${S.border}`,borderRadius:6,overflow:"hidden" }}>
                  <div style={{ padding:"6px 12px",background:"#f0f4fa",borderBottom:`1px solid ${S.border}`,fontFamily:S.font,fontSize:11,fontWeight:700,color:"#003087" }}>
                    Job Log — last {sqlHistory.length} run{sqlHistory.length===1?"":"s"}
                  </div>
                  <div style={{ maxHeight:260,overflow:"auto" }}>
                    <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:S.font }}>
                      <thead><tr style={{ background:"#fafbfc",position:"sticky",top:0 }}>
                        {["Run at","Type","Query","Rows","Time","Status"].map(h=>
                          <th key={h} style={{ padding:"5px 10px",textAlign:"left",borderBottom:`1px solid ${S.border}`,color:"#64748b",fontWeight:700 }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {sqlHistory.length===0 && <tr><td colSpan={6} style={{ padding:14,textAlign:"center",color:"#94a3b8" }}>No runs logged yet</td></tr>}
                        {sqlHistory.map((r:any)=>(
                          <tr key={r.id} style={{ borderBottom:"1px solid #f1f5f9",cursor:"pointer" }} onClick={()=>setSql(r.query_text||"")} title="Click to reload this query">
                            <td style={{ padding:"5px 10px",color:"#64748b",whiteSpace:"nowrap" }}>{r.executed_at?new Date(r.executed_at).toLocaleString("en-KE"):""}</td>
                            <td style={{ padding:"5px 10px" }}><span style={{ padding:"1px 6px",borderRadius:4,fontSize:10,fontWeight:700,background:"#e0e7ff",color:"#3730a3" }}>{r.query_type}</span></td>
                            <td style={{ padding:"5px 10px",fontFamily:S.mono,color:"#334155",maxWidth:320,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.query_text}</td>
                            <td style={{ padding:"5px 10px" }}>{r.rows_affected ?? "—"}</td>
                            <td style={{ padding:"5px 10px" }}>{r.execution_ms!=null?`${r.execution_ms}ms`:"—"}</td>
                            <td style={{ padding:"5px 10px" }}>{r.error_message ? <span style={{color:"#dc2626"}}>Error</span> : <CheckCircle style={{width:11,height:11,color:"#16a34a"}}/>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {sqlError && (
                <div style={{ margin:12,padding:"10px 14px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:6,fontFamily:S.mono,fontSize:12,color:"#b91c1c" }}>
                  <AlertTriangle style={{ width:12,height:12,display:"inline",marginRight:6,verticalAlign:"-1px" }} />Error: {sqlError}
                </div>
              )}
              {sqlResult.length > 0 && (
                <div>
                  <div style={{ padding:"7px 14px",background:"#f0fdf4",borderBottom:`1px solid #bbf7d0`,fontFamily:S.font,fontSize:11,color:"#15803d",display:"flex",alignItems:"center",gap:6,fontWeight:600 }}>
                    <CheckCircle style={{ width:12,height:12,display:"inline" }} />
                    {sqlResult.length} row{sqlResult.length===1?"":"s"} returned in {sqlMs}ms
                    <span style={{ marginLeft:6,color:"#86a596",fontSize:10,fontWeight:500 }}>· {Object.keys(sqlResult[0]).length} columns</span>
                  </div>
                  {sqlViewMode === "json" ? (
                    <pre style={{ margin:0,padding:14,fontFamily:S.mono,fontSize:11.5,color:"#1e293b",background:"#fbfcfe",overflow:"auto" }}>
                      {JSON.stringify(sqlResult, null, 2)}
                    </pre>
                  ) : (
                  <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                    <thead style={{ position:"sticky",top:0 }}>
                      <tr>
                        <th style={{ ...THEAD_CELL,width:40,textAlign:"center" }}>#</th>
                        {Object.keys(sqlResult[0]).map(k => (
                          <th key={k} style={THEAD_CELL}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.map((r,i) => (
                        <tr key={i} style={{ background:i%2===0?"#ffffff":"#f8fafc" }}
                          onMouseEnter={e=>(e.currentTarget.style.background="#eef4fb")}
                          onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#ffffff":"#f8fafc")}>
                          <td style={{ ...CELL,color:"#94a3b8",fontSize:10,textAlign:"center",width:40 }}>{i+1}</td>
                          {Object.values(r).map((v:any,j) => (
                            <td key={j} style={CELL}>{v===null?<span style={{ color:"#94a3b8",fontStyle:"italic" }}>NULL</span>:typeof v==="boolean"?<span style={{ color:v?"#15803d":"#b91c1c",fontWeight:700 }}>{String(v)}</span>:String(v).slice(0,200)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* - SCHEMA tab - */}
        {activeTab === "schema" && (
          <div style={{ flex:1,overflow:"auto",padding:14 }}>
            <div style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087",marginBottom:10 }}>Schema: {selectedTable}</div>
            <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
              <thead>
                <tr>
                  {["Column","Data Type","Nullable","Default"].map(h=>(
                    <th key={h} style={THEAD_CELL}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allColumns.map((col,i) => (
                  <tr key={col.column_name} style={{ background:i%2===0?"#ffffff":"#f8fafc" }}>
                    <td style={{ ...CELL,fontWeight:700 }}>{col.column_name}</td>
                    <td style={{ ...CELL,fontFamily:S.mono }}>{col.data_type}</td>
                    <td style={{ ...CELL,color:col.is_nullable==="YES"?"#cc6600":"#006600",fontWeight:700 }}>{col.is_nullable}</td>
                    <td style={{ ...CELL,fontFamily:S.mono,color:"#555",fontSize:11 }}>{col.column_default?.slice(0,60) || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* - TRIGGERS tab - */}
        {activeTab === "triggers" && (
          <div style={{ flex:1,overflow:"auto",padding:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>Database Triggers ({triggers.length})</span>
              <button onClick={loadTriggers} style={{ border:`1px solid ${S.border}`,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Refresh</button>
            </div>
            <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
              <thead>
                <tr>
                  {["Trigger Name","Table","Event","Timing"].map(h=>(
                    <th key={h} style={THEAD_CELL}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {triggers.map((t,i) => (
                  <tr key={i} style={{ background:i%2===0?"#ffffff":"#f8fafc" }}>
                    <td style={{ ...CELL,fontFamily:S.mono,fontSize:11 }}>{t.trigger_name}</td>
                    <td style={{ ...CELL,fontWeight:700,color:"#003087" }}>{t.event_object_table}</td>
                    <td style={{ ...CELL,color:t.event_manipulation==="DELETE"?"#cc0000":t.event_manipulation==="INSERT"?"#006600":"#cc6600",fontWeight:700 }}>{t.event_manipulation}</td>
                    <td style={{ ...CELL }}>{t.action_timing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* - LIVE MONITOR tab (dbForge-style) - */}
        {activeTab === "monitor" && (
          <div style={{ flex:1,overflow:"auto",padding:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <span style={{ fontWeight:700,fontSize:14,fontFamily:S.font,color:"#003087",display:"flex",alignItems:"center",gap:6 }}>
                <Activity size={15}/> Live Monitor
                {liveStatsLoading && <RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }}/>}
              </span>
              <span style={{ fontSize:10,color:"#888",fontFamily:S.font }}>
                {liveStats?.generated_at ? `Live — updated ${new Date(liveStats.generated_at).toLocaleTimeString()}` : "Loading…"}
              </span>
            </div>

            {/* Sub-tab bar (Overview / Data IO / Databases / Wait Stats / Top Queries / Sessions / Backups) */}
            <div style={{ display:"flex",gap:2,borderBottom:`2px solid ${S.border}`,marginBottom:14,flexWrap:"wrap" as const }}>
              {[
                { id:"overview",   label:"Overview"   },
                { id:"dataio",     label:"Data IO"     },
                { id:"databases",  label:"Databases"   },
                { id:"waitstats",  label:"Wait Stats"  },
                { id:"topqueries", label:"Top Queries" },
                { id:"sessions",   label:"Sessions"    },
                { id:"backups",    label:"Backups"     },
                { id:"site",       label:"Site Stats"  },
                { id:"loggers",    label:"Loggers"     },
                { id:"realtime",   label:"Realtime"    },
                { id:"dbstats",    label:"Schema & Errors" },
              ].map(t => (
                <button key={t.id} onClick={()=>setMonitorSubTab(t.id as any)}
                  style={{ padding:"6px 12px",border:"none",borderBottom:monitorSubTab===t.id?`2px solid ${S.blue}`:"2px solid transparent",
                    marginBottom:-2,background:"transparent",cursor:"pointer",fontFamily:S.font,fontSize:12,whiteSpace:"nowrap",
                    fontWeight:monitorSubTab===t.id?700:500,color:monitorSubTab===t.id?"#003087":"#64748b" }}>
                  {t.label}
                </button>
              ))}
            </div>

            <div style={{ display:"flex",gap:14,alignItems:"flex-start" }}>
              {/* ── LEFT: charts / tables for the active sub-tab ── */}
              <div style={{ flex:1,minWidth:0 }}>

                {monitorSubTab==="overview" && (
                  <>
                    <MonitorChartCard title="CONNECTIONS ACTIVITY" subtitle="active / idle / idle-in-transaction, live — Postgres' equivalent to 'CPU Utilization'" empty={liveHistory.length<2}
                      stats={liveStats ? [
                        { label:"Total Connections", value:`${liveStats.connections?.total ?? 0}` },
                        { label:"Commit Rate/sec", value:`${liveHistory[liveHistory.length-1]?.commitRate ?? 0}` },
                        { label:"Waiting Tasks", value:`${liveStats.connections?.waiting ?? 0}` },
                        { label:"Lock Waits", value:`${liveStats.locks?.waiting ?? 0}` },
                        { label:"Active / Idle", value:`${liveStats.connections?.active ?? 0}/${liveStats.connections?.idle ?? 0}` },
                        { label:"Deadlocks", value:`${liveStats.transactions?.deadlocks ?? 0}` },
                      ] : undefined}>
                      <ResponsiveContainer width="100%" height={170}>
                        <AreaChart data={liveHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7"/>
                          <XAxis dataKey="time" tick={{ fontSize:9 }} interval="preserveStartEnd"/>
                          <YAxis tick={{ fontSize:9 }} allowDecimals={false}/>
                          <Tooltip contentStyle={{ fontSize:11 }}/>
                          <Legend wrapperStyle={{ fontSize:10 }}/>
                          <Area type="monotone" dataKey="active" name="Active" stroke="#dc2626" fill="#fecaca" fillOpacity={0.6}/>
                          <Area type="monotone" dataKey="idle" name="Idle" stroke="#0ea5e9" fill="#bae6fd" fillOpacity={0.5}/>
                          <Area type="monotone" dataKey="idleTx" name="Idle in TX" stroke="#ca8a04" fill="#fef08a" fillOpacity={0.5}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </MonitorChartCard>

                    <MonitorChartCard title="CACHE HIT RATIO, %" subtitle="buffer cache — Postgres' closest equivalent to 'Memory Utilization'" empty={liveHistory.length<2}
                      stats={liveStats ? [
                        { label:"Cache Hit %", value:`${liveStats.transactions?.cache_hit_ratio ?? 0}%` },
                        { label:"Blocks Hit", value:`${(liveStats.transactions?.blks_hit ?? 0).toLocaleString()}` },
                        { label:"Blocks Read", value:`${(liveStats.transactions?.blks_read ?? 0).toLocaleString()}` },
                        { label:"Rows Returned", value:`${(liveStats.transactions?.tup_returned ?? 0).toLocaleString()}` },
                        { label:"Temp Files", value:`${liveStats.transactions?.temp_files ?? 0}` },
                        { label:"Temp Bytes", value:`${Math.round((liveStats.transactions?.temp_bytes ?? 0)/1024)} KB` },
                      ] : undefined}>
                      <ResponsiveContainer width="100%" height={140}>
                        <LineChart data={liveHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7"/>
                          <XAxis dataKey="time" tick={{ fontSize:9 }} interval="preserveStartEnd"/>
                          <YAxis tick={{ fontSize:9 }} domain={[0,100]}/>
                          <Tooltip contentStyle={{ fontSize:11 }}/>
                          <Line type="monotone" dataKey="cacheHit" name="Cache hit %" stroke="#16a34a" strokeWidth={2} dot={false}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </MonitorChartCard>

                    <MonitorChartCard title="BUFFER I/O, blocks/sec" subtitle="disk reads vs. cache hits — Postgres' equivalent to 'Disk Activity'" empty={liveHistory.length<2}
                      stats={liveStats ? [
                        { label:"Disk Reads/sec", value:`${liveHistory[liveHistory.length-1]?.readRate ?? 0}` },
                        { label:"Cache Hits/sec", value:`${liveHistory[liveHistory.length-1]?.hitRate ?? 0}` },
                        { label:"Sequential Scans", value:`${(liveStats.scans?.seq_scan ?? 0).toLocaleString()}` },
                        { label:"Index Scans", value:`${(liveStats.scans?.idx_scan ?? 0).toLocaleString()}` },
                        { label:"Buffers by Backends", value:`${liveStats.bgwriter?.buffers_backend ?? 0}` },
                        { label:"Buffers Allocated", value:`${liveStats.bgwriter?.buffers_alloc ?? 0}` },
                      ] : undefined}>
                      <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={liveHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7"/>
                          <XAxis dataKey="time" tick={{ fontSize:9 }} interval="preserveStartEnd"/>
                          <YAxis tick={{ fontSize:9 }}/>
                          <Tooltip contentStyle={{ fontSize:11 }}/>
                          <Legend wrapperStyle={{ fontSize:10 }}/>
                          <Area type="monotone" dataKey="readRate" name="Disk reads/sec" stroke="#7c3aed" fill="#ddd6fe" fillOpacity={0.6}/>
                          <Area type="monotone" dataKey="hitRate" name="Cache hits/sec" stroke="#0891b2" fill="#a5f3fc" fillOpacity={0.5}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </MonitorChartCard>
                  </>
                )}

                {monitorSubTab==="dataio" && liveStats && (
                  <>
                  <MonitorTable
                    title="DATA I/O — real pg_stat_user_tables / pg_stat_bgwriter counters (cumulative since last stats reset)"
                    headers={["Metric","Value"]}
                    rows={[
                      ["Sequential scans", (liveStats.scans?.seq_scan ?? 0).toLocaleString()],
                      ["Sequential tuples read", (liveStats.scans?.seq_tup_read ?? 0).toLocaleString()],
                      ["Index scans", (liveStats.scans?.idx_scan ?? 0).toLocaleString()],
                      ["Index tuples fetched", (liveStats.scans?.idx_tup_fetch ?? 0).toLocaleString()],
                      ["Rows inserted", (liveStats.scans?.n_tup_ins ?? 0).toLocaleString()],
                      ["Rows updated", (liveStats.scans?.n_tup_upd ?? 0).toLocaleString()],
                      ["Rows deleted", (liveStats.scans?.n_tup_del ?? 0).toLocaleString()],
                      ["Buffers written by bgwriter (clean)", (liveStats.bgwriter?.buffers_clean ?? "—")],
                      ["Buffers written by backends", (liveStats.bgwriter?.buffers_backend ?? "—")],
                      ["Buffers allocated", (liveStats.bgwriter?.buffers_alloc ?? "—")],
                      ["Temp files / bytes", `${liveStats.transactions?.temp_files ?? 0} / ${liveStats.transactions?.temp_bytes ?? 0}`],
                    ]}
                  />
                  {liveStats.tables?.length > 0 && (
                    <div style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",marginTop:14,overflow:"hidden" }}>
                      <div style={{ fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font,padding:"10px 12px",borderBottom:`1px solid ${S.border}`,background:"#f8fafc" }}>
                        BUSIEST TABLES (live, by total activity — real pg_stat_user_tables)
                      </div>
                      <div style={{ overflowX:"auto",maxHeight:400,overflowY:"auto" }}>
                      <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                        <thead style={{ position:"sticky",top:0,zIndex:1 }}><tr>
                          {["Table","Size","Rows (est.)","Dead rows","Seq scans","Idx scans","Ins/Upd/Del"].map(h=>(
                            <th key={h} style={THEAD_CELL}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {liveStats.tables.map((t:any,i:number)=>(
                            <tr key={t.table_name} style={{ background:i%2===0?"#fff":"#f8fafc",cursor:"pointer" }}
                              onClick={()=>{ setSelectedTable(t.table_name); setActiveTab("tables"); }}
                              onMouseEnter={e=>(e.currentTarget.style.background="#eef4fb")}
                              onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f8fafc")}>
                              <td style={{ ...CELL,fontWeight:700,color:"#003087" }}>{t.table_name}</td>
                              <td style={{ ...CELL }}>{t.total_size}</td>
                              <td style={{ ...CELL,textAlign:"right" }}>{(t.row_estimate??0).toLocaleString()}</td>
                              <td style={{ ...CELL,textAlign:"right",color:(t.dead_rows??0)>0?"#ca8a04":"#666" }}>{(t.dead_rows??0).toLocaleString()}</td>
                              <td style={{ ...CELL,textAlign:"right",color:(t.seq_scan??0)>100000?"#dc2626":"#666" }}>{(t.seq_scan??0).toLocaleString()}</td>
                              <td style={{ ...CELL,textAlign:"right" }}>{(t.idx_scan??0).toLocaleString()}</td>
                              <td style={{ ...CELL,textAlign:"right" }}>{(t.n_tup_ins??0)}/{(t.n_tup_upd??0)}/{(t.n_tup_del??0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    </div>
                  )}
                  </>
                )}

                {monitorSubTab==="databases" && liveStats && (
                  <MonitorTable
                    title="DATABASES — live pg_database_size()"
                    headers={["Database","Size"]}
                    rows={(liveStats.databases||[]).map((d:any)=>[d.datname, d.size_pretty])}
                  />
                )}

                {monitorSubTab==="waitstats" && liveStats && (
                  <MonitorTable
                    title={`WAIT STATS — ${liveStats.locks?.waiting ?? 0} lock(s) waiting, ${liveStats.connections?.waiting ?? 0} session(s) blocked on a wait event`}
                    headers={["PID","User","Wait Type","Wait Event","Running for","Query"]}
                    rows={(liveStats.sessions||[]).filter((s:any)=>s.wait_event).map((s:any)=>[
                      s.pid, s.usename||"—", s.wait_event_type||"—", s.wait_event||"—",
                      `${s.running_seconds ?? 0}s`, s.query_snippet||"—",
                    ])}
                    empty="No sessions currently waiting — nothing blocked right now."
                  />
                )}

                {monitorSubTab==="topqueries" && liveStats && (
                  liveStats.top_queries?.length ? (
                    <div>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2 }}>
                        <div style={{ fontSize:13,fontWeight:700,color:"#1e293b",fontFamily:S.font }}>
                          Top {liveStats.top_queries.length} resource consumers for database "{liveStats.server?.current_database}"
                        </div>
                        <label style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,fontFamily:S.font,color:"#334155",cursor:"pointer" }}>
                          <input type="checkbox" checked={trcPortrait} onChange={e=>setTrcPortrait(e.target.checked)}/> Portrait View
                        </label>
                      </div>
                      <div style={{ fontSize:9.5,color:"#999",marginBottom:10,fontFamily:S.font }}>
                        Postgres' equivalent of SQL Server Query Store's "Top Resource Consumers" report — real pg_stat_statements data throughout, cumulative since the last stats reset (not literally "last hour", Postgres doesn't retain a rolling time-series the way Query Store does).
                      </div>

                      <div style={{ display:"flex",gap:10,marginBottom:12,alignItems:"center" }}>
                        <span style={{ fontSize:11,color:"#666",fontFamily:S.font }}>Metric:</span>
                        <select value={trcMetric} onChange={e=>setTrcMetric(e.target.value as any)}
                          style={{ fontSize:11,padding:"4px 8px",border:`1px solid ${S.border}`,borderRadius:5,fontFamily:S.font }}>
                          <option value="duration">Duration (ms)</option>
                          <option value="calls">Execution Count</option>
                          <option value="rows">Row Count</option>
                          <option value="io">Logical Reads (blocks)</option>
                        </select>
                        <span style={{ fontSize:11,color:"#666",fontFamily:S.font }}>Statistic:</span>
                        <select value={trcStatistic} onChange={e=>setTrcStatistic(e.target.value as any)} disabled={trcMetric!=="duration"}
                          style={{ fontSize:11,padding:"4px 8px",border:`1px solid ${S.border}`,borderRadius:5,fontFamily:S.font,opacity:trcMetric!=="duration"?0.5:1 }}>
                          <option value="total">Total</option>
                          <option value="average">Average</option>
                        </select>
                      </div>

                      <div style={{ display:"flex",flexDirection:trcPortrait?"column":"row",gap:12,marginBottom:14 }}>
                        {/* Bar chart — like the SSMS report's left panel */}
                        <div style={{ flex:1.4,border:`1px solid ${S.border}`,borderRadius:6,padding:"10px 12px",background:"#fff" }}>
                          <div style={{ fontSize:10,color:"#666",marginBottom:6,fontFamily:S.font }}>
                            {trcMetric==="duration" ? `Metric: Duration (ms) · Statistic: ${trcStatistic==="average"?"Average":"Total"}` :
                             trcMetric==="calls" ? "Metric: Execution Count" : trcMetric==="rows" ? "Metric: Row Count" : "Metric: Logical Reads (shared blocks hit + read)"}
                          </div>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={liveStats.top_queries.map((q:any,i:number)=>({ ...q, idx:i+1, val:trcValue(q) }))}
                              onClick={(e:any)=>{ const q = e?.activePayload?.[0]?.payload; if (q) loadQueryPlan(q); }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7"/>
                              <XAxis dataKey="idx" tick={{ fontSize:10 }} label={{ value:"query id", position:"insideBottom", offset:-2, fontSize:10 }}/>
                              <YAxis tick={{ fontSize:10 }} label={{ value:"total", angle:-90, position:"insideLeft", fontSize:10 }}/>
                              <Tooltip formatter={(v:any)=>[v,trcMetric==="duration"?"ms":trcMetric==="calls"?"calls":trcMetric==="rows"?"rows":"blocks"]} labelFormatter={(i:any)=>`Query id ${i}`}
                                contentStyle={{ fontSize:11 }}/>
                              <Bar dataKey="val" cursor="pointer">
                                {liveStats.top_queries.map((q:any,i:number)=>(
                                  <Cell key={i} fill={selectedQuery?.query_id===q.query_id?"#0e7490":"#60a5fa"}/>
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Plan summary — real scatter of samples collected while this query is
                            selected (5s polling), honestly scoped to "since selected", not a
                            fabricated hour of history Postgres doesn't retain */}
                        <div style={{ width:trcPortrait?"100%":260,flexShrink:0,border:`1px solid ${S.border}`,borderRadius:6,padding:"10px 12px",background:"#fff" }}>
                          <div style={{ fontSize:10,color:"#666",marginBottom:6,fontFamily:S.font }}>
                            Plan summary {selectedQuery ? `for query id ${selectedQuery.query_id}` : ""}
                          </div>
                          {!selectedQuery && <div style={{ fontSize:11,color:"#999",fontFamily:S.font,padding:"20px 0" }}>Click a bar to inspect its real execution plan.</div>}
                          {selectedQuery && (
                            <>
                              <ResponsiveContainer width="100%" height={150}>
                                <ScatterChart>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7"/>
                                  <XAxis dataKey="t" type="number" domain={["dataMin","dataMax"]} tick={{ fontSize:9 }}
                                    tickFormatter={(t:number)=>new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}/>
                                  <YAxis dataKey="v" tick={{ fontSize:9 }}/>
                                  <Tooltip labelFormatter={(t:any)=>new Date(t).toLocaleTimeString()} contentStyle={{ fontSize:11 }}/>
                                  <Scatter data={planSamples} fill="#16a34a"/>
                                </ScatterChart>
                              </ResponsiveContainer>
                              <div style={{ fontSize:9,color:"#999",fontFamily:S.font,marginTop:2 }}>
                                {planSamples.length<2 ? "Collecting live samples…" : `${planSamples.length} real samples since you selected this query`}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Plan id bar + Force/Unforce Plan — Postgres has no plan-forcing
                          mechanism (no equivalent to SQL Server Query Store's forced plans),
                          so these are honest about that instead of pretending to do something */}
                      {selectedQuery && (
                        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"7px 12px",background:"#f1f5f9",border:`1px solid ${S.border}`,borderRadius:6,marginBottom:10 }}>
                          <span style={{ fontSize:11,fontWeight:700,color:"#334155",fontFamily:S.font }}>
                            Query id {selectedQuery.query_id} [not forced]
                          </span>
                          <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
                            <button onClick={()=>setPlanForceMsg("Postgres has no built-in plan-forcing mechanism like SQL Server Query Store — the planner always re-picks a plan based on current statistics. (The pg_hint_plan extension can influence plan choice, but it isn't installed here and works differently.)")}
                              style={{ fontSize:10.5,padding:"4px 10px",border:`1px solid ${S.border}`,borderRadius:5,background:"#fff",cursor:"pointer",fontFamily:S.font }}>
                              Force Plan
                            </button>
                            <button onClick={()=>setPlanForceMsg("There's no forced plan to remove — see above.")}
                              style={{ fontSize:10.5,padding:"4px 10px",border:`1px solid ${S.border}`,borderRadius:5,background:"#fff",cursor:"pointer",fontFamily:S.font }}>
                              Unforce Plan
                            </button>
                          </div>
                        </div>
                      )}
                      {planForceMsg && (
                        <div style={{ fontSize:11,color:"#92400e",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"8px 12px",marginBottom:10,fontFamily:S.font }}>
                          {planForceMsg}
                        </div>
                      )}

                      {selectedQuery && (
                        <div style={{ fontSize:11,fontFamily:S.font,color:"#334155",marginBottom:8 }}>
                          Query cost: <b>{selectedQuery.calls}</b> calls · <b>{selectedQuery.total_exec_ms} ms</b> total · <b>{selectedQuery.mean_exec_ms} ms</b> mean · <b>{selectedQuery.rows}</b> rows
                        </div>
                      )}
                      {selectedQuery && (
                        <div style={{ fontFamily:"monospace",fontSize:11,color:"#334155",background:"#f8fafc",padding:"8px 10px",borderRadius:5,marginBottom:12,wordBreak:"break-all" }}>
                          {selectedQuery.query_snippet}
                        </div>
                      )}

                      {/* Real execution plan tree — Postgres' EXPLAIN output, the direct
                          equivalent of SSMS's graphical execution plan */}
                      {selectedQuery && (
                        <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:"12px 14px",background:"#fff" }}>
                          <div style={{ fontSize:10,color:"#666",marginBottom:10,fontFamily:S.font }}>
                            Execution plan (real EXPLAIN — not executed, cost estimates only)
                          </div>
                          {planLoading && <div style={{ fontSize:12,color:"#999",fontFamily:S.font }}>⟲ Running EXPLAIN…</div>}
                          {!planLoading && queryPlan?.error && (
                            <div style={{ fontSize:12,color:"#dc2626",fontFamily:S.font }}>Couldn't get plan: {queryPlan.error}</div>
                          )}
                          {!planLoading && queryPlan && !queryPlan.error && (
                            <div style={{ overflowX:"auto",paddingBottom:6 }}>
                              <PlanNode node={queryPlan}/>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize:12,color:"#666",fontFamily:S.font,padding:20,border:`1px solid ${S.border}`,borderRadius:6 }}>
                      pg_stat_statements has no recorded queries yet (or was just reset) — this fills in as the database is used.
                    </div>
                  )
                )}

                {monitorSubTab==="sessions" && liveStats && (
                  <MonitorTable
                    title={`SESSIONS — ${liveStats.connections?.total ?? 0} total (${liveStats.connections?.active ?? 0} active)`}
                    headers={["PID","User","App","Client IP","State","Running for","Query"]}
                    rows={(liveStats.sessions||[]).map((s:any)=>[
                      s.pid, s.usename||"—", s.application_name||"—", s.client_addr||"local",
                      s.state||"—", s.running_seconds!=null?`${s.running_seconds}s`:"—", s.query_snippet||"—",
                    ])}
                  />
                )}

                {monitorSubTab==="backups" && liveStats && (
                  liveStats.backups?.length ? (
                    <MonitorTable
                      title="BACKUPS — recent app-level backup jobs (backup_jobs table)"
                      headers={["Label","Type","Status","Size","Started","Completed"]}
                      rows={liveStats.backups.map((b:any)=>[
                        b.label||"—", b.backup_type||"—", b.status||"—",
                        b.size_bytes?`${Math.round(b.size_bytes/1024)} KB`:"—",
                        b.started_at?new Date(b.started_at).toLocaleString():"—",
                        b.completed_at?new Date(b.completed_at).toLocaleString():"—",
                      ])}
                    />
                  ) : (
                    <div style={{ fontSize:12,color:"#666",fontFamily:S.font,padding:20,border:`1px solid ${S.border}`,borderRadius:6 }}>
                      No backup jobs recorded yet. Supabase also runs its own managed PITR backups behind the scenes — this table only reflects backups triggered from within the app.
                    </div>
                  )
                )}

                {monitorSubTab==="site" && liveStats && (
                  <div>
                    <div style={{ fontSize:11,fontWeight:700,color:"#003087",marginBottom:10,fontFamily:S.font }}>
                      SITE ACTIVITY — real application-level metrics, not raw Postgres internals
                    </div>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10 }}>
                      {[
                        ["Requisitions today", liveStats.site?.requisitions_today, "#003087"],
                        ["Purchase orders today", liveStats.site?.purchase_orders_today, "#003087"],
                        ["New users today", liveStats.site?.new_users_today, "#16a34a"],
                        ["Active users (30 min)", liveStats.site?.active_users_last_30min, "#16a34a"],
                        ["Audit events today", liveStats.site?.audit_events_today, "#666"],
                        ["Audit events (1 hr)", liveStats.site?.audit_events_last_hour, "#666"],
                        ["Failed logins today", liveStats.site?.failed_logins_today, liveStats.site?.failed_logins_today>0?"#dc2626":"#16a34a"],
                        ["Blocked IPs today", liveStats.site?.blocked_ips_today, liveStats.site?.blocked_ips_today>0?"#dc2626":"#16a34a"],
                        ["404 hits today", liveStats.site?.not_found_hits_today, "#ca8a04"],
                        ["SMS sent today", liveStats.site?.sms_sent_today, "#16a34a"],
                        ["SMS failed today", liveStats.site?.sms_failed_today, liveStats.site?.sms_failed_today>0?"#dc2626":"#16a34a"],
                        ["Crash reports (unresolved)", liveStats.site?.crash_reports_unresolved, liveStats.site?.crash_reports_unresolved>0?"#dc2626":"#16a34a"],
                        ["Crash reports today", liveStats.site?.crash_reports_today, "#666"],
                      ].map(([label,val,color]:any)=>(
                        <div key={label} style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:"10px 12px",background:"#fff" }}>
                          <div style={{ fontSize:19,fontWeight:800,color }}>{(val??0).toLocaleString()}</div>
                          <div style={{ fontSize:10.5,color:"#666",marginTop:2,fontFamily:S.font }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {monitorSubTab==="loggers" && liveStats && (
                  <div>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                      <div style={{ fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font }}>
                        LIVE ACTIVITY FEED — merged from audit_log, ip_access_log, not_found_log, crash_reports, sms_log
                      </div>
                      <span style={{ fontSize:10,color:"#999",fontFamily:S.font }}>{liveStats.loggers?.length ?? 0} recent events</span>
                    </div>
                    <div style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",maxHeight:480,overflowY:"auto" }}>
                      {(liveStats.loggers ?? []).map((l:any,i:number)=>(
                        <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",padding:"8px 12px",
                          borderTop:i>0?`1px solid ${S.border}`:"none",fontSize:12,fontFamily:S.font }}>
                          <span style={{ flexShrink:0,width:76,fontSize:9.5,color:"#999",marginTop:2 }}>
                            {l.at ? new Date(l.at).toLocaleTimeString() : "—"}
                          </span>
                          <span style={{ flexShrink:0,padding:"1px 7px",borderRadius:4,fontSize:9,fontWeight:700,marginTop:1,
                            background: l.severity==="error"?"#fef2f2":l.severity==="warning"?"#fefce8":"#f0f9ff",
                            color: l.severity==="error"?"#dc2626":l.severity==="warning"?"#ca8a04":"#0369a1" }}>
                            {l.source}
                          </span>
                          <span style={{ flex:1,color:"#334155" }}>{l.summary || "—"}</span>
                        </div>
                      ))}
                      {(!liveStats.loggers || liveStats.loggers.length===0) && (
                        <div style={{ padding:20,fontSize:12,color:"#666",fontFamily:S.font }}>No recent activity across any logger.</div>
                      )}
                    </div>
                  </div>
                )}

        {monitorSubTab === "realtime" && (
          <div style={{ flex:1,display:"flex",overflow:"hidden" }}>
            {/* Watch-table picker sidebar */}
            <div style={{ width:200,borderRight:`1px solid ${S.border}`,overflow:"auto",background:S.head,flexShrink:0 }}>
              <div style={{ padding:"8px 10px",fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font,borderBottom:`1px solid ${S.border}` }}>
                Watch Tables ({watchTables.length || 1})
              </div>
              <div style={{ padding:"4px 6px" }}>
                {!watchTables.length && (
                  <div style={{ fontSize:10,color:"#94a3b8",fontFamily:S.font,padding:"4px 4px 8px" }}>
                    None picked — defaults to <b>{selectedTable}</b>
                  </div>
                )}
                {TABLE_GROUPS.flatMap(g=>g.tables).map(t => (
                  <label key={t} style={{ display:"flex",alignItems:"center",gap:6,padding:"3px 4px",cursor:"pointer",fontSize:11,fontFamily:S.font }}>
                    <input type="checkbox" checked={watchTables.includes(t)}
                      onChange={e=>setWatchTables(p => e.target.checked ? [...p,t] : p.filter(x=>x!==t))}
                      disabled={realtimeOn} />
                    <span style={{ color:watchTables.includes(t)?"#003087":"#475569",fontWeight:watchTables.includes(t)?700:400 }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
              <div style={{ padding:"8px 14px",borderBottom:`1px solid ${S.border}`,background:S.head,display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap" as const }}>
                <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>Real-time Monitor</span>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <div style={{ width:8,height:8,borderRadius:"50%",background:realtimeOn?"#00cc44":"#cc0000" }} />
                  <span style={{ fontSize:11,fontFamily:S.font }}>{realtimeOn?"Connected":"Disconnected"}</span>
                </div>
                {realtimeOn && <span style={{ fontSize:10,color:"#059669",fontFamily:S.font,background:"rgba(5,150,105,0.1)",padding:"1px 6px",borderRadius:4,fontWeight:700 }}>{rtEventCount} event{rtEventCount===1?"":"s"}</span>}
                <button onClick={toggleRealtime} style={{ background:realtimeOn?"#cc0000":"#006600",color:"#fff",border:"none",padding:"4px 14px",cursor:"pointer",fontFamily:S.font,fontSize:11,fontWeight:700 }}>
                  {realtimeOn?"Stop Listening":"Start Listening"}
                </button>
                <button onClick={()=>{setRealtimeLog([]);setRtEventCount(0);}} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"4px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Clear Log</button>
                <div style={{ marginLeft:"auto",display:"flex",gap:10 }}>
                  {(["INSERT","UPDATE","DELETE"] as const).map(ev=>(
                    <label key={ev} style={{ display:"flex",alignItems:"center",gap:4,fontSize:10,fontFamily:S.font,cursor:"pointer",color:ev==="INSERT"?"#4ade80":ev==="UPDATE"?"#fbbf24":"#f87171",fontWeight:700 }}>
                      <input type="checkbox" checked={rtEventFilter[ev]} onChange={e=>setRtEventFilter(p=>({...p,[ev]:e.target.checked}))} />{ev}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ flex:1,overflow:"auto",background:"#1e1e1e",padding:10 }}>
                {realtimeLog.length === 0 ? (
                  <div style={{ color:"#4ade80",fontFamily:S.mono,fontSize:12,padding:10 }}>
                    {realtimeOn ? `- Listening on ${(watchTables.length?watchTables:[selectedTable]).join(", ")} -` : "Pick tables on the left (optional) and click 'Start Listening'"}
                  </div>
                ) : realtimeLog.filter(log=>rtEventFilter[log.event as "INSERT"|"UPDATE"|"DELETE"]).map((log,i) => (
                  <div key={i} style={{ fontFamily:S.mono,fontSize:11,marginBottom:4 }}>
                    <div onClick={()=>setRtExpanded(p=>p===i?null:i)} style={{ cursor:"pointer" }}>
                      <span style={{ color:"#60a5fa" }}>[{log.time}]</span>{" "}
                      <span style={{ color:log.event==="INSERT"?"#4ade80":log.event==="UPDATE"?"#fbbf24":"#f87171",fontWeight:700 }}>{log.event}</span>{" "}
                      <span style={{ color:"#c084fc" }}>{log.table}</span>{" "}
                      <span style={{ color:"#94a3b8" }}>{log.data}{rtExpanded!==i && Object.keys(log.row||{}).length>0 ? " ▸" : ""}</span>
                    </div>
                    {rtExpanded===i && (
                      <pre style={{ color:"#e2e8f0",background:"#111827",padding:8,marginTop:4,marginLeft:16,borderRadius:4,overflow:"auto",fontSize:10 }}>
                        {JSON.stringify(log.row, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* - SCHEMA & ERRORS sub-tab (moved from the old standalone DB Stats page) - */}
        {monitorSubTab === "dbstats" && (
          <div style={{ flex:1,overflow:"auto",padding:14 }}>

            {/* ── Live Server Dashboard — real pg_stat_* data, polled every 5s ── */}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <span style={{ fontWeight:700,fontSize:14,fontFamily:S.font,color:"#003087",display:"flex",alignItems:"center",gap:6 }}>
                <Server size={15}/> Server Dashboard
                {dbDashLoading && <RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }}/>}
              </span>
              <span style={{ fontSize:10,color:"#888",fontFamily:S.font }}>
                {dbDash?.generated_at ? `Live — updated ${new Date(dbDash.generated_at).toLocaleTimeString()}` : "Loading…"}
              </span>
            </div>

            {dbDash && (
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10,marginBottom:16 }}>
                {/* Server card */}
                <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#003087",display:"flex",alignItems:"center",gap:5,marginBottom:8 }}><Server size={13}/> SERVER</div>
                  <div style={{ fontSize:11,fontFamily:S.font,color:"#333",lineHeight:1.9 }}>
                    <div>{dbDash.server?.version}</div>
                    <div>Uptime: {Math.floor((dbDash.server?.uptime_seconds||0)/86400)}d {Math.floor(((dbDash.server?.uptime_seconds||0)%86400)/3600)}h</div>
                    <div>Max connections: {dbDash.server?.max_connections}</div>
                  </div>
                </div>

                {/* Connections card */}
                <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#003087",display:"flex",alignItems:"center",gap:5,marginBottom:8 }}><Cpu size={13}/> CONNECTIONS</div>
                  <div style={{ fontSize:22,fontWeight:700,color:"#111" }}>{dbDash.connections?.total}<span style={{ fontSize:11,color:"#888",fontWeight:400 }}> / {dbDash.server?.max_connections}</span></div>
                  <div style={{ fontSize:10,color:"#666",marginTop:4 }}>
                    <span style={{ color:"#16a34a",fontWeight:700 }}>{dbDash.connections?.active}</span> active ·{" "}
                    <span style={{ color:"#888" }}>{dbDash.connections?.idle}</span> idle ·{" "}
                    <span style={{ color:"#ca8a04" }}>{dbDash.connections?.idle_in_transaction}</span> idle-in-tx
                  </div>
                </div>

                {/* Storage card */}
                <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#003087",display:"flex",alignItems:"center",gap:5,marginBottom:8 }}><HardDrive size={13}/> STORAGE</div>
                  <div style={{ fontSize:22,fontWeight:700,color:"#111" }}>{dbDash.storage?.database_size_pretty}</div>
                  <div style={{ fontSize:10,color:"#666",marginTop:4 }}>Total database size (live)</div>
                </div>

                {/* Performance card */}
                <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#003087",display:"flex",alignItems:"center",gap:5,marginBottom:8 }}><Zap size={13}/> CACHE HIT RATIO</div>
                  <div style={{ fontSize:22,fontWeight:700,color:(dbDash.performance?.cache_hit_ratio||0)>95?"#16a34a":"#ca8a04" }}>{dbDash.performance?.cache_hit_ratio ?? "-"}%</div>
                  <div style={{ fontSize:10,color:"#666",marginTop:4 }}>{dbDash.performance?.transactions_committed?.toLocaleString()} tx committed</div>
                </div>

                {/* Errors card */}
                <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#003087",display:"flex",alignItems:"center",gap:5,marginBottom:8 }}><AlertTriangle size={13}/> ERRORS</div>
                  <div style={{ fontSize:22,fontWeight:700,color:(dbDash.errors?.unresolved_count||0)>0?"#dc2626":"#16a34a" }}>{dbDash.errors?.unresolved_count ?? 0}</div>
                  <div style={{ fontSize:10,color:"#666",marginTop:4 }}>unresolved · {dbDash.errors?.last_24h_count ?? 0} in last 24h</div>
                </div>

                {/* Top Resource Consumers — links straight into Live Monitor's real
                    pg_stat_statements bar chart + EXPLAIN plan viewer */}
                <div onClick={()=>{ setActiveTab("monitor"); setMonitorSubTab("topqueries"); }}
                  style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff",cursor:"pointer" }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#003087",display:"flex",alignItems:"center",gap:5,marginBottom:8 }}><BarChart3 size={13}/> TOP RESOURCE CONSUMERS</div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#0e7490" }}>View query plans →</div>
                  <div style={{ fontSize:10,color:"#666",marginTop:4 }}>Real execution plans, Live Monitor tab</div>
                </div>
              </div>
            )}

            {/* Live connections/cache-hit trend — real samples from the 5s poll, not a mock chart */}
            {dbDashHistory.length > 1 && (
              <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:12,background:"#fff",marginBottom:16 }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#003087",marginBottom:8 }}>ACTIVE CONNECTIONS (live, last {dbDashHistory.length} samples)</div>
                <svg viewBox="0 0 600 80" style={{ width:"100%",height:80 }}>
                  {(() => {
                    const max = Math.max(1, ...dbDashHistory.map(h=>h.active));
                    const pts = dbDashHistory.map((h,i) => `${(i/(dbDashHistory.length-1))*600},${80-(h.active/max)*70-5}`).join(" ");
                    return <polyline points={pts} fill="none" stroke="#0e7490" strokeWidth="2"/>;
                  })()}
                </svg>
              </div>
            )}

            {/* Top tables by size — real pg_total_relation_size, matches "Storage" panels in reference dashboards */}
            {dbDash?.storage?.top_tables?.length > 0 && (
              <div style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",marginBottom:16,overflow:"hidden" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font,padding:"10px 12px",borderBottom:`1px solid ${S.border}`,background:"#f8fafc" }}>LARGEST TABLES (live)</div>
                <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                  <thead style={{ position:"sticky",top:0,zIndex:1 }}><tr>
                    {["Table","Total Size","Row Estimate"].map(h=>(
                      <th key={h} style={THEAD_CELL}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {dbDash.storage.top_tables.map((t:any,i:number)=>(
                      <tr key={t.table_name} style={{ background:i%2===0?"#fff":"#f8fafc",cursor:"pointer" }} onClick={()=>{ setSelectedTable(t.table_name); setActiveTab("tables"); }}
                        onMouseEnter={e=>(e.currentTarget.style.background="#eef4fb")}
                        onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f8fafc")}>
                        <td style={{ ...CELL,fontWeight:700,color:"#003087" }}>{t.table_name}</td>
                        <td style={{ ...CELL }}>{t.total_size}</td>
                        <td style={{ ...CELL,textAlign:"right" }}>{Math.round(t.row_estimate||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Recent errors — real rows from system_errors */}
            {dbDash?.errors?.recent?.length > 0 && (
              <div style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",marginBottom:16,overflow:"hidden" }}>
                <div style={{ fontSize:11,fontWeight:700,color:"#003087",fontFamily:S.font,padding:"10px 12px",borderBottom:`1px solid ${S.border}`,background:"#f8fafc" }}>RECENT ERRORS (live)</div>
                <div style={{ overflowX:"auto" }}>
                <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                  <thead style={{ position:"sticky",top:0,zIndex:1 }}><tr>
                    {["Time","Code","Message","Page","Severity","Resolved"].map(h=>(
                      <th key={h} style={THEAD_CELL}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {dbDash.errors.recent.map((e:any,i:number)=>(
                      <tr key={e.id} style={{ background:i%2===0?"#fff":"#f8fafc" }}
                        onMouseEnter={ev=>(ev.currentTarget.style.background="#eef4fb")}
                        onMouseLeave={ev=>(ev.currentTarget.style.background=i%2===0?"#fff":"#f8fafc")}>
                        <td style={{ ...CELL,whiteSpace:"nowrap" }}>{new Date(e.created_at).toLocaleString()}</td>
                        <td style={{ ...CELL }}>{e.error_code||"-"}</td>
                        <td style={{ ...CELL,maxWidth:320,overflow:"hidden",textOverflow:"ellipsis" }}>{e.error_msg}</td>
                        <td style={{ ...CELL }}>{e.page||"-"}</td>
                        <td style={{ ...CELL,color:e.severity==="critical"?"#dc2626":e.severity==="warning"?"#ca8a04":"#666" }}>{e.severity||"-"}</td>
                        <td style={{ ...CELL,color:e.is_resolved?"#16a34a":"#dc2626" }}>{e.is_resolved?"Yes":"No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            <div style={{ borderTop:`2px solid ${S.border}`,margin:"8px 0 16px",paddingTop:14 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>Table Schema Detail ({stats.length || "-"} tables)</span>
                <button onClick={loadStats} style={{ border:`1px solid ${S.border}`,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Refresh</button>
              </div>
            {stats.length > 0 ? (
              <div style={{ border:`1px solid ${S.border}`,borderRadius:6,background:"#fff",overflow:"hidden" }}>
              <div style={{ overflowX:"auto",maxHeight:520,overflowY:"auto" }}>
              <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                <thead style={{ position:"sticky",top:0,zIndex:1 }}>
                  <tr>
                    {["Table","Columns","Policies","Triggers","Rows"].map(h=>(
                      <th key={h} style={THEAD_CELL}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row,i) => (
                    <tr key={i} style={{ background:i%2===0?"#ffffff":"#f8fafc",cursor:"pointer" }} onClick={()=>{ setSelectedTable(row.table_name); setActiveTab("tables"); }}
                      onMouseEnter={e=>(e.currentTarget.style.background="#eef4fb")}
                      onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#ffffff":"#f8fafc")}>
                      <td style={{ ...CELL,fontWeight:700,color:"#003087" }}>{row.table_name}</td>
                      <td style={{ ...CELL,textAlign:"center" }}>{row.column_count}</td>
                      <td style={{ ...CELL,textAlign:"center",color:row.policy_count>0?"#006600":"#cc0000",fontWeight:700 }}>{row.policy_count}</td>
                      <td style={{ ...CELL,textAlign:"center",color:row.trigger_count>0?"#cc6600":"#666" }}>{row.trigger_count}</td>
                      <td style={{ ...CELL,textAlign:"right" }}>{(tableCounts[row.table_name]||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              </div>
            ) : (
              <div style={{ fontFamily:S.font,fontSize:12,color:"#666",padding:20 }}>Click Refresh to load statistics-</div>
            )}
            </div>
          </div>
        )}
              </div>

              {/* ── RIGHT: Server / Database Properties panel — Overview only, so
                    table-heavy sub-tabs (Sessions, Top Queries, Data IO, …) get
                    the full width they need instead of being squeezed by 240px
                    of context that's only relevant next to the charts ── */}
              {liveStats && monitorSubTab==="overview" && (
                <div style={{ width:240,flexShrink:0,border:`1px solid ${S.border}`,borderRadius:6,background:"#fafbfc",alignSelf:"flex-start",maxHeight:"calc(100vh - 260px)",overflowY:"auto" }}>
                  <div style={{ padding:"8px 12px",borderBottom:`1px solid ${S.border}`,fontSize:11,fontWeight:700,color:"#003087",position:"sticky",top:0,background:"#fafbfc" }}>Server Properties</div>
                  <PropRow k="Version" v={liveStats.server?.version}/>
                  <PropRow k="Database" v={liveStats.server?.current_database}/>
                  <PropRow k="Uptime" v={`${Math.floor((liveStats.server?.uptime_seconds||0)/86400)}d ${Math.floor(((liveStats.server?.uptime_seconds||0)%86400)/3600)}h`}/>
                  <PropRow k="Max Connections" v={liveStats.server?.max_connections}/>
                  <PropRow k="Shared Buffers" v={liveStats.server?.shared_buffers}/>
                  <PropRow k="Effective Cache Size" v={liveStats.server?.effective_cache_size}/>
                  <PropRow k="Work Mem" v={liveStats.server?.work_mem}/>
                  <PropRow k="Timezone" v={liveStats.server?.timezone}/>
                  <PropRow k="Encoding" v={liveStats.server?.server_encoding}/>
                  <PropRow k="Data Checksums" v={liveStats.server?.data_checksums}/>
                  <div style={{ padding:"8px 12px",borderBottom:`1px solid ${S.border}`,borderTop:`1px solid ${S.border}`,fontSize:11,fontWeight:700,color:"#003087",marginTop:6 }}>Database Size</div>
                  <PropRow k="Total Size" v={liveStats.storage?.database_size_pretty}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SQL SERVER BRIDGE tab — real config, real live status, never mocked ── */}
        {activeTab === "mssql" && (
          <div style={{ flex:1,overflow:"auto",padding:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <span style={{ fontWeight:700,fontSize:14,fontFamily:S.font,color:"#003087",display:"flex",alignItems:"center",gap:6 }}>
                <Server size={15}/> SQL Server Bridge
              </span>
              {bridgeStatus && (
                <span style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:700,
                  color: bridgeStatus.connected ? "#16a34a" : "#dc2626" }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",background: bridgeStatus.connected ? "#16a34a" : "#dc2626" }}/>
                  {bridgeStatus.connected ? `Connected${bridgeStatus.latency_ms?` (${bridgeStatus.latency_ms}ms)`:""}` : (bridgeStatus.reason || "Disconnected")}
                  {bridgeChecking && <RefreshCw size={11} style={{ animation:"spin 1s linear infinite" }}/>}
                </span>
              )}
            </div>

            <div style={{ border:`1px solid ${S.border}`,borderRadius:6,padding:16,background:"#fff",marginBottom:16 }}>
              <div style={{ fontSize:12,color:"#666",marginBottom:14,lineHeight:1.6 }}>
                Deno Edge Functions (what Supabase runs) can only make HTTP/HTTPS calls — they can't open the raw
                TCP connection SQL Server's TDS protocol needs. So this stays honestly disconnected until you run the
                real bridge service (<code style={{ background:"#f1f5f9",padding:"1px 5px",borderRadius:4 }}>tools/mssql-bridge-server</code> in
                the repo) on a machine that has real network access to your SQL Server, and point it here.
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:"#333",display:"block",marginBottom:4 }}>Bridge URL</label>
                  <input value={bridgeForm.url} onChange={e=>setBridgeForm(f=>({...f,url:e.target.value}))}
                    placeholder="https://your-tunnel-url.trycloudflare.com"
                    style={{ width:"100%",padding:"7px 10px",border:`1px solid ${S.border}`,borderRadius:5,fontSize:12,fontFamily:S.font }}/>
                </div>
                <div>
                  <label style={{ fontSize:11,fontWeight:700,color:"#333",display:"block",marginBottom:4 }}>Shared Secret</label>
                  <input type="password" value={bridgeForm.secret} onChange={e=>setBridgeForm(f=>({...f,secret:e.target.value}))}
                    placeholder="must match SQLSERVER_BRIDGE_SECRET on the bridge"
                    style={{ width:"100%",padding:"7px 10px",border:`1px solid ${S.border}`,borderRadius:5,fontSize:12,fontFamily:S.font }}/>
                </div>
              </div>

              <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                <button onClick={()=>saveBridgeConfig(true)} disabled={bridgeSaving || !bridgeForm.url || !bridgeForm.secret}
                  style={{ padding:"7px 14px",borderRadius:5,border:"none",background:"#003087",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:(bridgeSaving||!bridgeForm.url||!bridgeForm.secret)?0.5:1 }}>
                  {bridgeCfg?.is_enabled ? "Save & Reconnect" : "Save & Enable"}
                </button>
                {bridgeCfg?.is_enabled && (
                  <button onClick={()=>saveBridgeConfig(false)} disabled={bridgeSaving}
                    style={{ padding:"7px 14px",borderRadius:5,border:`1px solid ${S.border}`,background:"#fff",color:"#cc0000",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                    Disable
                  </button>
                )}
                <button onClick={pingBridge} disabled={!bridgeCfg?.is_enabled || bridgeChecking}
                  style={{ padding:"7px 14px",borderRadius:5,border:`1px solid ${S.border}`,background:"#fff",fontSize:12,cursor:"pointer",opacity:!bridgeCfg?.is_enabled?0.5:1 }}>
                  ⟲ Ping now
                </button>
                {bridgeCfg?.last_ping_at && (
                  <span style={{ fontSize:10,color:"#999" }}>last checked {new Date(bridgeCfg.last_ping_at).toLocaleTimeString()}</span>
                )}
              </div>
            </div>

            {bridgeStatus?.connected && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:"#003087" }}>LIVE SQL SERVER SCHEMA</div>
                  <button onClick={loadBridgeSchema} style={{ border:`1px solid ${S.border}`,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Load tables</button>
                </div>
                {bridgeSchema && (
                  <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                    <thead><tr>
                      {["Table","Columns"].map(h=>(
                        <th key={h} style={THEAD_CELL}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {bridgeSchema.map((t:any,i:number)=>(
                        <tr key={t.table_name} style={{ background:i%2===0?"#fff":"#f8fafc" }}>
                          <td style={{ ...CELL,fontWeight:700,color:"#003087" }}>{t.table_name}</td>
                          <td style={{ ...CELL }}>{t.column_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── SSMS status bar ── */}
      <div style={{ background:SSMS.statusbar,color:"#fff",padding:"3px 12px",display:"flex",alignItems:"center",gap:16,flexShrink:0,fontSize:10.5 }}>
        <span style={{ display:"flex",alignItems:"center",gap:5 }}>
          {sqlRunning
            ? <><RefreshCw style={{ width:10,height:10,animation:"spin 1s linear infinite" }} /> Executing query…</>
            : <><CheckCircle style={{ width:10,height:10 }} /> Ready</>}
        </span>
        {activeTab==="tables" && selectedTable && (
          <span>{selectedTable} — {totalRows.toLocaleString()} row{totalRows===1?"":"s"}</span>
        )}
        <span style={{ marginLeft:"auto" }}>yvjfehnzbzjliizjvuhq (Supabase Postgres)</span>
        <span>{realtimeOn ? "Realtime: ON" : "Realtime: OFF"}</span>
      </div>
    </div>
  );
}

export default function AdminDatabasePage() {
  return (
    <RoleGuard allowed={["admin","webmaster","database_admin"]}>
      <DBInner />
    </RoleGuard>
  );
}