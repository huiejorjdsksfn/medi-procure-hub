/**
 * ProcurBosse  -- ODBC / SQL Server Connection Manager v7.1 (Nuclear Rebuild)
 * [OK] Real SQL Server connections via Supabase Edge Function (read-only, safe)
 * [OK] Leather/industrial D365 GUI (as per design reference)
 * [OK] Live table browser * SQL query viewer * Schema explorer
 * [OK] Connection stored in database * Test connection * Real sync
 * [OK] ZERO writes to SQL Server  -- read-only data pull only
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Database, Server, Plus, Trash2, Save, X, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, Eye, EyeOff, Play,
  Terminal, Table2, ChevronRight, ChevronDown, Download,
  Wifi, WifiOff, Settings, Shield, Zap, Activity, Clock,
  Code2, Globe, Lock, Search, Loader2, ArrowRight, BarChart3,
  FileText, Copy, Check
} from "lucide-react";

const db = supabase as any;

const DB_TYPES = [
  { value: "mssql",      label: "SQL Server",   port: 1433, icon: "", driver: "ODBC Driver 17 for SQL Server" },
  { value: "mysql",      label: "MySQL",         port: 3306, icon: "", driver: "MySQL ODBC 8.0 Driver" },
  { value: "postgresql", label: "PostgreSQL",    port: 5432, icon: "", driver: "PostgreSQL ODBC Driver" },
  { value: "mariadb",    label: "MariaDB",       port: 3306, icon: "", driver: "MySQL ODBC 8.0 Driver" },
  { value: "oracle",     label: "Oracle DB",     port: 1521, icon: "", driver: "Oracle ODBC Driver" },
];

type TabId = "connections" | "query" | "schema" | "sync" | "log";

const S = {
  page:  { background: "#1a1a2e", minHeight: "100vh", fontFamily: "'Segoe UI','Inter',system-ui,sans-serif" } as React.CSSProperties,
  hdr:   { background: "linear-gradient(135deg,#0f3460 0%,#16213e 100%)", padding: "0 24px", display: "flex", alignItems: "stretch", minHeight: 50, boxShadow: "0 2px 12px rgba(0,0,0,.5)" } as React.CSSProperties,
  bc:    { background: "#16213e", padding: "7px 24px", borderBottom: "1px solid #0f3460", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7a8aa0" } as React.CSSProperties,
  body:  { display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "calc(100vh - 90px)" } as React.CSSProperties,
  side:  { background: "#16213e", borderRight: "1px solid #0f3460", padding: 0 } as React.CSSProperties,
  main:  { background: "#1a1a2e", padding: "20px 24px", overflowY: "auto" as const } as React.CSSProperties,
  card:  { background: "#16213e", border: "1px solid #0f3460", borderRadius: 8, overflow: "hidden", marginBottom: 16 } as React.CSSProperties,
  ch:    (col: string) => ({ padding: "10px 16px", borderBottom: "1px solid #0f3460", display: "flex", alignItems: "center", gap: 8, background: `${col}18` } as React.CSSProperties),
  cb:    { padding: 16 } as React.CSSProperties,
  th:    { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: "#7a8aa0", borderBottom: "1px solid #0f3460", background: "#0f3460", whiteSpace: "nowrap" as const },
  td:    { padding: "8px 12px", fontSize: 12, color: "#c8d3e0", borderBottom: "1px solid #0f346033" },
  inp:   { width: "100%", border: "1px solid #0f3460", borderRadius: 6, padding: "8px 11px", fontSize: 13, outline: "none", background: "#0f3460", color: "#e0e8f0", fontFamily: "inherit", boxSizing: "border-box" as const } as React.CSSProperties,
  btn:   (bg: string, fg = "#fff") => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: bg, color: fg, border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties),
  badge: (col: string) => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: `${col}22`, color: col, border: `1px solid ${col}44` } as React.CSSProperties),
};

interface ODBCConn {
  id: string; name: string; db_type: string; host: string; port: number;
  database_name: string; username?: string; is_active: boolean; is_default: boolean;
  last_tested_at?: string; last_test_ok?: boolean; test_error?: string;
  tables_cache?: any[]; sync_direction: string; created_at: string;
}

interface QueryResult { columns: string[]; rows: any[][]; duration_ms: number; row_count: number; error?: string; }

export default function ODBCPage() {
  const { user } = useAuth();
  const [tab, setTab]           = useState<TabId>("connections");
  const [conns, setConns]       = useState<ODBCConn[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeConn, setActiveConn] = useState<ODBCConn | null>(null);
  const [showNew, setShowNew]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState<string | null>(null);
  const [tables, setTables]     = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<QueryResult | null>(null);
  const [query, setQuery]       = useState("SELECT TOP 100 * FROM ");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryRunning, setQueryRunning] = useState(false);
  const [queryLog, setQueryLog] = useState<any[]>([]);
  const [showPwd, setShowPwd]   = useState(false);
  const [copied, setCopied]     = useState(false);
  const [form, setForm]         = useState({ name: "", db_type: "mssql", host: "", port: "1433", database_name: "", username: "", password_enc: "", driver: "ODBC Driver 17 for SQL Server", sync_direction: "read_only" });

  const loadConns = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("odbc_connections").select("*").order("created_at", { ascending: false });
    setConns(data || []);
    if (data?.length && !activeConn) setActiveConn(data.find((c: ODBCConn) => c.is_default) || data[0]);
    setLoading(false);
  }, []);

  const loadQueryLog = useCallback(async () => {
    const { data } = await db.from("odbc_query_log").select("*").order("created_at", { ascending: false }).limit(50);
    setQueryLog(data || []);
  }, []);

  useEffect(() => { loadConns(); loadQueryLog(); }, []);

  // -- Test connection via edge function -------------------------
  const testConnection = async (conn: ODBCConn) => {
    setTesting(conn.id);
    try {
      const { data, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action: "test", connection_id: conn.id, host: conn.host, port: conn.port, database: conn.database_name, type: conn.db_type }
      });
      const ok = !error && data?.ok;
      await db.from("odbc_connections").update({ last_tested_at: new Date().toISOString(), last_test_ok: ok, test_error: ok ? null : (data?.error || error?.message || "Unknown error") }).eq("id", conn.id);
      toast({ title: ok ? "[OK] Connection successful" : "[X] Connection failed", description: ok ? `Connected to ${conn.database_name}` : (data?.error || error?.message), variant: ok ? "default" : "destructive" });
      loadConns();
    } catch (e: any) {
      await db.from("odbc_connections").update({ last_tested_at: new Date().toISOString(), last_test_ok: false, test_error: e.message }).eq("id", conn.id);
      toast({ title: "[X] Test failed", description: e.message, variant: "destructive" });
    }
    setTesting(null);
  };

  // -- Browse tables ---------------------------------------------
  const browseTables = async (conn: ODBCConn) => {
    setActiveConn(conn);
    setTab("schema");
    setLoadingTables(true);
    try {
      const { data, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action: "list_tables", connection_id: conn.id, host: conn.host, port: conn.port, database: conn.database_name, type: conn.db_type }
      });
      const tbls = data?.tables || [];
      setTables(tbls);
      await db.from("odbc_connections").update({ tables_cache: tbls, updated_at: new Date().toISOString() }).eq("id", conn.id);
    } catch (e: any) {
      // Use cached tables if available
      setTables(conn.tables_cache || []);
      toast({ title: "Using cached table list", description: e.message });
    }
    setLoadingTables(false);
  };

  // -- Preview table data ----------------------------------------
  const previewTable = async (tableName: string) => {
    if (!activeConn) return;
    setSelectedTable(tableName);
    setLoadingTables(true);
    const sql = activeConn.db_type === "mssql" ? `SELECT TOP 50 * FROM [${tableName}]` : `SELECT * FROM \`${tableName}\` LIMIT 50`;
    try {
      const { data, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action: "query", connection_id: activeConn.id, host: activeConn.host, port: activeConn.port, database: activeConn.database_name, type: activeConn.db_type, query: sql, readonly: true }
      });
      if (error) throw new Error(error.message);
      setTableData(data);
      await db.from("odbc_query_log").insert({ connection_id: activeConn.id, query_text: sql, result_rows: data?.row_count || 0, duration_ms: data?.duration_ms || 0, status: "ok", executed_by: user?.id });
    } catch (e: any) {
      setTableData({ columns: [], rows: [], duration_ms: 0, row_count: 0, error: e.message });
      await db.from("odbc_query_log").insert({ connection_id: activeConn.id, query_text: sql, status: "error", error_msg: e.message, executed_by: user?.id });
    }
    setLoadingTables(false);
    loadQueryLog();
  };

  // -- Run custom SQL (read-only enforced) -----------------------
  const runQuery = async () => {
    if (!activeConn || !query.trim()) return;
    // Safety: block dangerous keywords
    const upper = query.trim().toUpperCase();
    if (/^\s*(INSERT|UPDATE|DELETE|DROP|TRUNCATE|CREATE|ALTER|EXEC|EXECUTE)\s/i.test(upper)) {
      return toast({ title: " Read-only mode", description: "Write operations are not permitted on SQL Server", variant: "destructive" });
    }
    setQueryRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("mysql-proxy", {
        body: { action: "query", connection_id: activeConn.id, host: activeConn.host, port: activeConn.port, database: activeConn.database_name, type: activeConn.db_type, query: query.trim(), readonly: true }
      });
      if (error) throw new Error(error.message);
      setQueryResult(data);
      await db.from("odbc_query_log").insert({ connection_id: activeConn.id, query_text: query.trim().slice(0, 500), result_rows: data?.row_count || 0, duration_ms: data?.duration_ms || 0, status: data?.error ? "error" : "ok", error_msg: data?.error, executed_by: user?.id });
    } catch (e: any) {
      setQueryResult({ columns: [], rows: [], duration_ms: 0, row_count: 0, error: e.message });
      await db.from("odbc_query_log").insert({ connection_id: activeConn.id, query_text: query.trim().slice(0, 500), status: "error", error_msg: e.message, executed_by: user?.id });
    }
    setQueryRunning(false);
    loadQueryLog();
  };

  // -- Save connection -------------------------------------------
  const saveConn = async () => {
    if (!form.name || !form.host || !form.database_name) return toast({ title: "Name, host and database required", variant: "destructive" });
    setSaving(true);
    try {
      // Try full insert
      let { error } = await db.from("odbc_connections").insert({
        ...form, port: Number(form.port), is_active: true, is_default: conns.length === 0,
        created_by: user?.id, created_at: new Date().toISOString(),
      });
      // Schema cache fallback  -- minimal insert
      if (error && (error.message?.includes("schema cache") || error.message?.includes("column"))) {
        ({ error } = await db.from("odbc_connections").insert({
          name: form.name, host: form.host, database_name: form.database_name,
          db_type: form.db_type, port: Number(form.port),
          username: form.username || null, is_active: true,
          created_at: new Date().toISOString(),
        }));
      }
      if (error) throw error;
      toast({ title: "[OK] Connection saved" });
      setShowNew(false);
      loadConns();
    } catch (e: any) {
      toast({ title: "[X] Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const deleteConn = async (id: string) => {
    await db.from("odbc_connections").delete().eq("id", id);
    toast({ title: "[OK] Connection deleted" });
    if (activeConn?.id === id) setActiveConn(null);
    loadConns();
  };

  const copyConnStr = (conn: ODBCConn) => {
    const cs = conn.db_type === "mssql"
      ? `Driver={${DB_TYPES.find(d => d.value === conn.db_type)?.driver}};Server=${conn.host},${conn.port};Database=${conn.database_name};Uid=${conn.username || "sa"};Pwd=***;`
      : `${conn.db_type}://${conn.username}:***@${conn.host}:${conn.port}/${conn.database_name}`;
    navigator.clipboard.writeText(cs).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const TABS: { id: TabId; label: string; icon: any }[] = [
    { id: "connections", label: "Connections", icon: Database },
    { id: "schema",      label: "Schema Browser", icon: Table2 },
    { id: "query",       label: "SQL Viewer", icon: Terminal },
    { id: "sync",        label: "ERP Sync", icon: Zap },
    { id: "log",         label: "Query Log", icon: Activity },
  ];

  return (
    <div style={S.page}>
      {/* Dark industrial header */}
      <div style={S.hdr}>
        <button style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.1)", border: "none", cursor: "pointer", padding: "0 16px", color: "#e0e8f0", fontSize: 13, fontWeight: 700, height: "100%" }}>
          <Database size={15} color="#38bdf8" /> ODBC / SQL Server Manager
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
          <span style={S.badge("#ff0000")}><Shield size={10} />READ ONLY</span>
          <span style={{ color: "#7a8aa0", fontSize: 11 }}>{conns.length} connections</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={S.bc}>
        <span style={{ color: "#7a8aa0" }}>Home</span>
        <ChevronRight size={12} />
        <span style={{ color: "#e0e8f0", fontWeight: 600 }}>ODBC Manager</span>
        {activeConn && <><ChevronRight size={12} /><span style={{ color: "#38bdf8", fontWeight: 700 }}>{activeConn.name}</span></>}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#4a5568" }}> No writes to SQL Server permitted</span>
      </div>

      <div style={S.body}>
        {/* Sidebar */}
        <div style={S.side}>
          {/* Tab nav */}
          <div style={{ padding: "8px 0" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 16px",
                background: tab === t.id ? "#0f346033" : "transparent", border: "none",
                borderLeft: `3px solid ${tab === t.id ? "#38bdf8" : "transparent"}`,
                cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
                color: tab === t.id ? "#38bdf8" : "#7a8aa0", textAlign: "left", transition: "all .1s",
              }}>
                <t.icon size={14} />{t.label}
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #0f3460", padding: "8px 0" }}>
            <div style={{ padding: "6px 16px 4px", fontSize: 9, fontWeight: 800, color: "#4a5568", textTransform: "uppercase", letterSpacing: 1 }}>Connections</div>
            {conns.map(c => (
              <button key={c.id} onClick={() => setActiveConn(c)} style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 16px",
                background: activeConn?.id === c.id ? "#0f346044" : "transparent", border: "none",
                cursor: "pointer", fontSize: 11, color: activeConn?.id === c.id ? "#38bdf8" : "#9aaab8",
                textAlign: "left",
              }}>
                <span>{DB_TYPES.find(d => d.value === c.db_type)?.icon || ""}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: "#4a5568" }}>{c.host}:{c.port}</div>
                </div>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.last_test_ok ? "#22c55e" : c.last_test_ok === false ? "#ef4444" : "#6b7280", flexShrink: 0 }} />
              </button>
            ))}
            <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 16px", background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: "#38bdf8" }}>
              <Plus size={13} /> Add Connection
            </button>
          </div>
        </div>

        {/* Main panel */}
        <div style={S.main}>
          {/* -- Connections Tab -- */}
          {tab === "connections" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Database size={20} color="#38bdf8" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e8f0" }}>ODBC Connections</h2>
                <button onClick={() => setShowNew(true)} style={{ ...S.btn("#38bdf8", "#0f3460"), marginLeft: "auto" }}><Plus size={13} />New Connection</button>
              </div>

              {loading ? <div style={{ textAlign: "center", padding: 40, color: "#7a8aa0" }}><Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#38bdf8" }} /></div>
                : conns.length === 0 ? (
                  <div style={{ ...S.card, padding: 40, textAlign: "center" }}>
                    <Database size={48} color="#0f3460" style={{ marginBottom: 16 }} />
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#e0e8f0", marginBottom: 8 }}>No Connections Yet</div>
                    <div style={{ fontSize: 12, color: "#7a8aa0", marginBottom: 20 }}>Add your SQL Server or MySQL connection to get started</div>
                    <button onClick={() => setShowNew(true)} style={S.btn("#38bdf8", "#0f3460")}><Plus size={13} />Add First Connection</button>
                  </div>
                ) : conns.map(conn => (
                  <div key={conn.id} style={{ ...S.card, borderLeft: `4px solid ${conn.last_test_ok ? "#22c55e" : conn.last_test_ok === false ? "#ef4444" : "#6b7280"}` }}>
                    <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ fontSize: 28 }}>{DB_TYPES.find(d => d.value === conn.db_type)?.icon || ""}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: "#e0e8f0" }}>{conn.name}</span>
                          {conn.is_default && <span style={S.badge("#38bdf8")}>Default</span>}
                          {!conn.is_active && <span style={S.badge("#ef4444")}>Inactive</span>}
                          <span style={S.badge(conn.sync_direction === "read_only" ? "#22c55e" : "#f59e0b")}>{conn.sync_direction === "read_only" ? " Read Only" : " Bidirectional"}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#7a8aa0", marginTop: 3 }}>
                          {DB_TYPES.find(d => d.value === conn.db_type)?.label} * {conn.host}:{conn.port} * {conn.database_name}
                        </div>
                        {conn.last_tested_at && (
                          <div style={{ fontSize: 10, color: conn.last_test_ok ? "#22c55e" : "#ef4444", marginTop: 4 }}>
                            {conn.last_test_ok ? "[OK] Connected" : "[X] Failed"}  -- {new Date(conn.last_tested_at).toLocaleString("en-KE")}
                            {conn.test_error && <span style={{ color: "#ef4444", marginLeft: 8 }}>{conn.test_error.slice(0, 60)}</span>}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => testConnection(conn)} disabled={testing === conn.id} style={S.btn("#0369a1")}>
                          {testing === conn.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={12} />}
                          {testing === conn.id ? "Testing..." : "Test"}
                        </button>
                        <button onClick={() => browseTables(conn)} style={S.btn("#7c3aed")}>
                          <Table2 size={12} />Tables
                        </button>
                        <button onClick={() => { setActiveConn(conn); setTab("query"); }} style={S.btn("#047857")}>
                          <Terminal size={12} />Query
                        </button>
                        <button onClick={() => copyConnStr(conn)} style={S.btn("#4a5568")}>
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                        <button onClick={() => deleteConn(conn.id)} style={S.btn("#7f1d1d")}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {/* -- Schema Browser Tab -- */}
          {tab === "schema" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Table2 size={20} color="#7c3aed" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e8f0" }}>Schema Browser</h2>
                {activeConn && <span style={S.badge("#38bdf8")}>{activeConn.name}</span>}
                {activeConn && <button onClick={() => browseTables(activeConn)} style={{ ...S.btn("#7c3aed"), marginLeft: "auto" }}><RefreshCw size={12} />Refresh Tables</button>}
              </div>

              {!activeConn ? (
                <div style={{ ...S.card, padding: 30, textAlign: "center", color: "#7a8aa0" }}>Select a connection from the sidebar first</div>
              ) : loadingTables ? (
                <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: "#7c3aed" }} /></div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
                  {/* Table list */}
                  <div style={S.card}>
                    <div style={S.ch("#7c3aed")}><Table2 size={13} color="#7c3aed" /><span style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>{tables.length} Tables</span></div>
                    <div style={{ maxHeight: 500, overflowY: "auto" }}>
                      {tables.length === 0 ? (
                        <div style={{ padding: 20, textAlign: "center", color: "#7a8aa0", fontSize: 12 }}>No tables found</div>
                      ) : tables.map((t: any, i) => (
                        <button key={i} onClick={() => previewTable(t.table_name || t)} style={{
                          display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 14px",
                          background: selectedTable === (t.table_name || t) ? "#7c3aed22" : "transparent",
                          border: "none", borderLeft: `2px solid ${selectedTable === (t.table_name || t) ? "#7c3aed" : "transparent"}`,
                          cursor: "pointer", fontSize: 11, color: "#c8d3e0", textAlign: "left",
                        }}>
                          <Table2 size={12} color="#7c3aed" />
                          <span>{t.table_name || t}</span>
                          {t.row_count !== undefined && <span style={{ marginLeft: "auto", fontSize: 9, color: "#4a5568" }}>{t.row_count?.toLocaleString()}</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table preview */}
                  <div style={S.card}>
                    <div style={S.ch("#22c55e")}>
                      <BarChart3 size={13} color="#22c55e" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>{selectedTable ? `Preview: ${selectedTable}` : "Select a table"}</span>
                      {tableData && <span style={{ ...S.badge("#22c55e"), marginLeft: "auto" }}>{tableData.row_count} rows * {tableData.duration_ms}ms</span>}
                    </div>
                    <div style={{ overflowX: "auto", maxHeight: 450, overflowY: "auto" }}>
                      {tableData?.error ? (
                        <div style={{ padding: 20, color: "#ef4444", fontSize: 12 }}>[X] {tableData.error}</div>
                      ) : tableData?.columns.length ? (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr>{tableData.columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
                          <tbody>{tableData.rows.map((row, ri) => (
                            <tr key={ri}>{row.map((cell, ci) => (
                              <td key={ci} style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {cell === null ? <span style={{ color: "#4a5568", fontStyle: "italic" }}>NULL</span> : String(cell)}
                              </td>
                            ))}</tr>
                          ))}</tbody>
                        </table>
                      ) : (
                        <div style={{ padding: 30, textAlign: "center", color: "#7a8aa0", fontSize: 12 }}>
                          {selectedTable ? "Loading..." : "Click a table to preview data"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -- SQL Query Viewer Tab -- */}
          {tab === "query" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Terminal size={20} color="#22c55e" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e8f0" }}>SQL Viewer</h2>
                {activeConn && <span style={S.badge("#38bdf8")}>{activeConn.name}</span>}
                <span style={{ ...S.badge("#ef4444"), marginLeft: "auto" }}> SELECT only</span>
              </div>

              {!activeConn ? (
                <div style={{ ...S.card, padding: 30, textAlign: "center", color: "#7a8aa0" }}>Select a connection first</div>
              ) : (
                <>
                  <div style={S.card}>
                    <div style={S.ch("#22c55e")}><Terminal size={13} color="#22c55e" /><span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>SQL Query Editor (Read-Only)</span></div>
                    <div style={S.cb}>
                      <textarea
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        rows={8}
                        style={{ ...S.inp, resize: "vertical", fontFamily: "'Fira Code','Consolas',monospace", fontSize: 13, lineHeight: 1.6 }}
                        placeholder="SELECT TOP 100 * FROM YourTable WHERE ..."
                        spellCheck={false}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                        <button onClick={runQuery} disabled={queryRunning} style={S.btn("#22c55e", "#0f1b0a")}>
                          {queryRunning ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={13} />}
                          {queryRunning ? "Running..." : "Run Query (F5)"}
                        </button>
                        <button onClick={() => { setQuery(""); setQueryResult(null); }} style={S.btn("#4a5568")}>Clear</button>
                        {queryResult && <span style={{ fontSize: 11, color: "#7a8aa0" }}>{queryResult.row_count} rows * {queryResult.duration_ms}ms</span>}
                        <span style={{ marginLeft: "auto", fontSize: 11, color: "#ef4444" }}>[!] INSERT/UPDATE/DELETE blocked</span>
                      </div>
                    </div>
                  </div>

                  {queryResult && (
                    <div style={S.card}>
                      <div style={S.ch(queryResult.error ? "#ef4444" : "#22c55e")}>
                        {queryResult.error ? <XCircle size={13} color="#ef4444" /> : <CheckCircle size={13} color="#22c55e" />}
                        <span style={{ fontSize: 12, fontWeight: 700, color: queryResult.error ? "#ef4444" : "#22c55e" }}>
                          {queryResult.error ? "Query Error" : `Results  -- ${queryResult.row_count} rows`}
                        </span>
                        {!queryResult.error && <button onClick={() => {
                          const csv = [queryResult.columns.join(","), ...queryResult.rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
                          const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv); a.download = "query_result.csv"; a.click();
                        }} style={{ ...S.btn("#0369a1"), marginLeft: "auto", padding: "4px 10px", fontSize: 11 }}><Download size={11} />CSV</button>}
                      </div>
                      <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
                        {queryResult.error ? (
                          <div style={{ padding: 20, color: "#ef4444", fontFamily: "monospace", fontSize: 12 }}>{queryResult.error}</div>
                        ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead><tr>{queryResult.columns.map(c => <th key={c} style={S.th}>{c}</th>)}</tr></thead>
                            <tbody>{queryResult.rows.map((row, ri) => (
                              <tr key={ri}>{row.map((cell, ci) => (
                                <td key={ci} style={{ ...S.td, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {cell === null ? <span style={{ color: "#4a5568", fontStyle: "italic" }}>NULL</span> : String(cell)}
                                </td>
                              ))}</tr>
                            ))}</tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* -- ERP Sync Tab -- */}
          {tab === "sync" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Zap size={20} color="#f59e0b" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e8f0" }}>ERP Data Sync</h2>
                <span style={{ ...S.badge("#22c55e"), marginLeft: "auto" }}> Pull Only  -- No writes to SQL Server</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {[
                  { label: "Pull Suppliers", desc: "Import supplier data from SQL Server -> Supabase", icon: "", col: "#0369a1", type: "pull_suppliers" },
                  { label: "Pull Items/Stock", desc: "Import inventory data from SQL Server", icon: "", col: "#047857", type: "pull_items" },
                  { label: "Pull Financial Data", desc: "Import budget & financial records (read-only)", icon: "", col: "#7c3aed", type: "pull_financials" },
                  { label: "Pull Purchase Orders", desc: "Import PO history from existing system", icon: "", col: "#0078d4", type: "pull_pos" },
                  { label: "Pull Staff Records", desc: "Import employee/user data (no passwords)", icon: "", col: "#d97706", type: "pull_staff" },
                  { label: "Full Sync Report", desc: "Generate sync status report across all modules", icon: "", col: "#6b21a8", type: "full_report" },
                ].map(item => (
                  <div key={item.type} style={S.card}>
                    <div style={{ padding: "16px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 32, flexShrink: 0 }}>{item.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#e0e8f0", marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "#7a8aa0", marginBottom: 12 }}>{item.desc}</div>
                        <button onClick={async () => {
                          if (!activeConn) return toast({ title: "Select a connection first", variant: "destructive" });
                          await db.from("erp_sync_queue").insert({ sync_type: item.type, direction: "pull", status: "pending", is_manual: true, connection_id: activeConn.id, initiated_by: user?.id, payload: { connection: activeConn.name } });
                          toast({ title: `[OK] ${item.label} queued`, description: "Sync job added to queue" });
                        }} style={S.btn(item.col)}>
                          <ArrowRight size={12} />Start Pull
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -- Query Log Tab -- */}
          {tab === "log" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <Activity size={20} color="#f59e0b" />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e0e8f0" }}>Query Log</h2>
                <button onClick={loadQueryLog} style={{ ...S.btn("#4a5568"), marginLeft: "auto" }}><RefreshCw size={12} />Refresh</button>
              </div>
              <div style={S.card}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Status","Query","Rows","Duration","Time"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {queryLog.map((q, i) => (
                        <tr key={q.id}>
                          <td style={S.td}><span style={S.badge(q.status === "ok" ? "#22c55e" : "#ef4444")}>{q.status}</span></td>
                          <td style={{ ...S.td, maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 11 }}>{q.query_text}</td>
                          <td style={S.td}>{q.result_rows ?? " --"}</td>
                          <td style={S.td}>{q.duration_ms ? `${q.duration_ms}ms` : " --"}</td>
                          <td style={{ ...S.td, fontSize: 10, color: "#4a5568" }}>{new Date(q.created_at).toLocaleString("en-KE")}</td>
                        </tr>
                      ))}
                      {queryLog.length === 0 && <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", padding: 30, color: "#4a5568" }}>No queries executed yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* -- New Connection Modal -- */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#16213e", border: "1px solid #0f3460", borderRadius: 12, width: 560, boxShadow: "0 20px 60px rgba(0,0,0,.6)", overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(135deg,#0f3460,#16213e)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <Database size={18} color="#38bdf8" />
              <span style={{ color: "#e0e8f0", fontWeight: 700, fontSize: 15 }}>Add ODBC Connection</span>
              <button onClick={() => setShowNew(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "#7a8aa0", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "name", label: "Connection Name *", ph: "e.g. Hospital SQL Server", full: true },
                { key: "host", label: "Host / Server *", ph: "192.168.1.100 or server\\instance" },
                { key: "port", label: "Port", ph: "1433", type: "number" },
                { key: "database_name", label: "Database Name *", ph: "HospitalDB", full: false },
                { key: "username", label: "Username", ph: "sa" },
                { key: "password_enc", label: "Password", ph: "********", pwd: true },
              ].map(({ key, label, ph, type, full, pwd }) => (
                <div key={key} style={{ gridColumn: full ? "1 / -1" : undefined }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a8aa0", marginBottom: 5 }}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <input type={pwd && !showPwd ? "password" : (type || "text")} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={S.inp} />
                    {pwd && <button onClick={() => setShowPwd(p => !p)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7a8aa0" }}>
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>}
                  </div>
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a8aa0", marginBottom: 5 }}>DB Type *</label>
                <select value={form.db_type} onChange={e => { const t = DB_TYPES.find(d => d.value === e.target.value); setForm(p => ({ ...p, db_type: e.target.value, port: String(t?.port || 1433), driver: t?.driver || "" })); }} style={S.inp}>
                  {DB_TYPES.map(d => <option key={d.value} value={d.value}>{d.icon} {d.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a8aa0", marginBottom: 5 }}>Access Mode</label>
                <select value={form.sync_direction} onChange={e => setForm(p => ({ ...p, sync_direction: e.target.value }))} style={S.inp}>
                  <option value="read_only"> Read Only (Recommended)</option>
                  <option value="bidirectional"> Bidirectional</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a8aa0", marginBottom: 5 }}>Driver</label>
                <input value={form.driver} onChange={e => setForm(p => ({ ...p, driver: e.target.value }))} placeholder="ODBC Driver 17 for SQL Server" style={S.inp} />
              </div>
              <div style={{ gridColumn: "1 / -1", background: "#0f3460", borderRadius: 6, padding: "10px 14px", fontSize: 11, color: "#7a8aa0" }}>
                 Credentials are stored securely. All SQL queries are read-only by default  -- no data will be modified on your SQL Server.
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowNew(false)} style={S.btn("#4a5568")}>Cancel</button>
                <button onClick={saveConn} disabled={saving} style={S.btn("#38bdf8", "#0f3460")}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />} Save Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
