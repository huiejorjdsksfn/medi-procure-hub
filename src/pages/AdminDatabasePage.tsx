/**
 * ProcurBosse - Admin Database GUI v3.0
 * Full ERP database manager: white/black Times New Roman design
 * Real SQL editor, live realtime, all tables, triggers, edge functions
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Database, RefreshCw, Play, Save, Plus, Trash2, Edit3, X, Search,
  Download, Server, Table as TableIcon, Code2, Activity, Wifi,
  ChevronRight, ChevronDown, Filter, Copy, AlertTriangle,
  CheckCircle, Clock, Layers, FileText, Zap, BarChart3, Eye,
  ToggleLeft, ToggleRight, Settings
} from "lucide-react";
import * as XLSX from "xlsx";
import RoleGuard from "@/components/RoleGuard";

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

const CELL: React.CSSProperties = {
  border: `1px solid #e2e8f0`,
  padding: "6px 12px",
  fontSize: 12,
  fontFamily: S.font,
  color: "#0f172a",
  whiteSpace: "nowrap",
  maxWidth: 220,
  overflow: "hidden",
  textOverflow: "ellipsis",
  background: "transparent",
};

// - Main Component -
function DBInner() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"tables"|"sql"|"schema"|"triggers"|"realtime"|"stats">("tables");
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
  const [sqlRunning, setSqlRunning] = useState(false);
  const [sqlMs, setSqlMs] = useState<number|null>(null);
  const [schemaData, setSchemaData] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [realtimeLog, setRealtimeLog] = useState<any[]>([]);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [tableCounts, setTableCounts] = useState<Record<string,number>>({});
  const sqlRef = useRef<HTMLTextAreaElement>(null);
  const rtChannel = useRef<any>(null);

  // - Load table data -
  const loadTable = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      // Get columns
      const { data: cols } = await (supabase as any)
        .from("information_schema.columns")
        .select("column_name,data_type,is_nullable,column_default")
        .eq("table_schema","public")
        .eq("table_name", selectedTable)
        .order("ordinal_position");
      
      if (cols) {
        setAllColumns(cols);
        setTableColumns(cols.map((c: any) => c.column_name));
      }

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
    } catch (e: any) {
      toast({ title:"Load error: " + e.message, variant:"destructive" });
      setTableData([]);
    }
    setLoading(false);
  }, [selectedTable, page, pageSize, sortCol, sortAsc]);

  useEffect(() => { loadTable(); }, [loadTable]);

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
  async function runSQL() {
    if (!sql.trim()) return;
    setSqlRunning(true); setSqlError(null); setSqlResult([]);
    const t0 = Date.now();
    try {
      const { data, error } = await (supabase as any).rpc("exec_sql", { query: sql });
      if (error) throw error;
      const ms = Date.now() - t0;
      setSqlMs(ms);
      setSqlResult(Array.isArray(data) ? data : [{ result: data }]);
      // Log query
      await (supabase as any).from("query_log").insert({
        query_text: sql.slice(0,500),
        query_type: sql.trim().slice(0,6).toUpperCase(),
        rows_affected: Array.isArray(data) ? data.length : 0,
        execution_ms: ms,
        executed_by: user?.id
      });
      toast({ title: `- Query executed (${ms}ms, ${Array.isArray(data) ? data.length : 0} rows)` });
    } catch (e: any) {
      setSqlError(e.message);
      setSqlMs(Date.now() - t0);
      toast({ title:"SQL Error: " + e.message, variant:"destructive" });
    }
    setSqlRunning(false);
  }

  // - Load schema -
  async function loadSchema() {
    const { data } = await (supabase as any).rpc("exec_sql", {
      query: `SELECT table_name, column_name, data_type, is_nullable, column_default
              FROM information_schema.columns
              WHERE table_schema='public' AND table_name='${selectedTable}'
              ORDER BY ordinal_position`
    });
    if (data) setSchemaData(data);
  }

  // - Load triggers -
  async function loadTriggers() {
    const { data } = await (supabase as any).rpc("exec_sql", {
      query: `SELECT trigger_name, event_object_table, event_manipulation, action_timing,
                     action_statement
              FROM information_schema.triggers WHERE trigger_schema='public'
              ORDER BY event_object_table, trigger_name`
    });
    if (data) setTriggers(data);
  }

  // - Load stats -
  async function loadStats() {
    const { data } = await (supabase as any).rpc("exec_sql", {
      query: `SELECT table_name, column_count, policy_count, trigger_count FROM db_stats`
    });
    if (data) setStats(data);
  }

  // - Realtime -
  function toggleRealtime() {
    if (realtimeOn) {
      rtChannel.current?.unsubscribe();
      setRealtimeOn(false);
      toast({ title: "- Realtime disconnected" });
    } else {
      rtChannel.current = (supabase as any)
        .channel("db-changes-monitor")
        .on("postgres_changes", { event:"*", schema:"public", table:selectedTable }, (payload: any) => {
          setRealtimeLog(p => [{
            time: new Date().toLocaleTimeString("en-KE"),
            event: payload.eventType,
            table: payload.table,
            data: JSON.stringify(payload.new || payload.old || {}).slice(0,120)
          }, ...p.slice(0,49)]);
        })
        .subscribe();
      setRealtimeOn(true);
      toast({ title: "- Realtime connected to " + selectedTable });
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
    { id:"realtime", label:"Realtime",      icon:Activity },
    { id:"stats",    label:"DB Stats",      icon:BarChart3 },
  ];

  // Cleanup rtChannel on unmount
  React.useEffect(()=>{
    return ()=>{ if(rtChannel.current){ (supabase as any).removeChannel(rtChannel.current); rtChannel.current=null; } };
  },[]);

  return (
    <div style={{ height:"100%",display:"flex",flexDirection:"column",background:"#ffffff",fontFamily:S.font,color:S.fg,minHeight:"100%" }}>

      {/* - Header - */}
      <div style={{ background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",padding:"8px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,borderBottom:"2px solid #001a5c" }}>
        <Database style={{ width:20,height:20 }} />
        <div>
          <div style={{ fontSize:15,fontWeight:700,fontFamily:S.font }}>Database Administration</div>
          <div style={{ fontSize:10,opacity:0.7,fontFamily:S.font }}>EL5 MediProcure - Supabase - yvjfehnzbzjliizjvuhq</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:6,alignItems:"center" }}>
          <div style={{ background:realtimeOn?"#00cc44":"#666",width:8,height:8,borderRadius:"50%" }} />
          <span style={{ fontSize:11,fontFamily:S.font }}>{realtimeOn?"Realtime ON":"Realtime OFF"}</span>
          <button onClick={loadTable} style={{ background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",padding:"4px 10px",cursor:"pointer",fontFamily:S.font,fontSize:12,borderRadius:3 }}>
            <RefreshCw style={{ width:12,height:12 }} />
          </button>
        </div>
      </div>

      {/* - Tab bar - */}
      <div style={{ display:"flex",borderBottom:`1px solid rgba(255,255,255,0.07)`,background:"rgba(0,0,0,0.3)",flexShrink:0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id as any); if(t.id==="schema") loadSchema(); if(t.id==="triggers") loadTriggers(); if(t.id==="stats") loadStats(); }}
            style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 16px",border:"none",borderBottom:activeTab===t.id?`3px solid #3b82f6`:"3px solid transparent",background:activeTab===t.id?"#1e3a6b":"rgba(255,255,255,0.05)",cursor:"pointer",fontFamily:S.font,fontSize:13,fontWeight:activeTab===t.id?700:400,color:activeTab===t.id?"#ffffff":"rgba(255,255,255,0.6)" }}>
            <t.icon style={{ width:13,height:13 }} />
            {t.label}
          </button>
        ))}
      </div>

      {/* - Main content - */}
      <div style={{ flex:1,display:"flex",overflow:"hidden" }}>

        {/* Left sidebar - table tree */}
        {activeTab === "tables" && (
          <div style={{ width:220,borderRight:`1px solid ${S.border}`,overflowY:"auto",background:"rgba(0,0,0,0.3)",flexShrink:0 }}>
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
            <div style={{ padding:"6px 12px",display:"flex",alignItems:"center",gap:8,background:"rgba(0,0,0,0.3)",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>{selectedTable}</span>
              <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:S.font }}>({totalRows.toLocaleString()} rows)</span>
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
                      <th style={{ ...CELL,background:"rgba(30,58,138,0.8)",color:"#f1f5f9",fontWeight:700,width:60 }}>Actions</th>
                      {tableColumns.map(col => (
                        <th key={col} onClick={() => { setSortCol(col); setSortAsc(s=>sortCol===col?!s:true); }}
                          style={{ ...CELL,background:"rgba(30,58,138,0.8)",color:"#f1f5f9",fontWeight:700,cursor:"pointer",userSelect:"none" }}>
                          {col}{sortCol===col?(sortAsc?" -":" -"):""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map((row, ri) => (
                      <tr key={row.id||ri} style={{ background:ri%2===0?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)" }}
                        onMouseEnter={e=>(e.currentTarget.style.background="rgba(59,130,246,0.15)")}
                        onMouseLeave={e=>(e.currentTarget.style.background=ri%2===0?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.05)")}>
                        <td style={{ ...CELL,width:60,textAlign:"center" }}>
                          <div style={{ display:"flex",gap:3,justifyContent:"center" }}>
                            <button title="Edit" onClick={() => setEditingRow({...row})} style={{ background:"none",border:"none",cursor:"pointer",padding:2 }}>
                              <Edit3 style={{ width:12,height:12,color:"#003087" }} />
                            </button>
                            <button title="Delete" onClick={() => setDeleteConfirm(row.id)} style={{ background:"none",border:"none",cursor:"pointer",padding:2 }}>
                              <Trash2 style={{ width:12,height:12,color:"#cc0000" }} />
                            </button>
                            <button title="Copy ID" onClick={() => { navigator.clipboard.writeText(row.id||""); toast({title:"ID copied"}); }} style={{ background:"none",border:"none",cursor:"pointer",padding:2 }}>
                              <Copy style={{ width:11,height:11,color:"#666" }} />
                            </button>
                          </div>
                        </td>
                        {tableColumns.map(col => (
                          <td key={col} style={CELL} title={String(row[col]??"")} >
                            {editingRow?.id === row.id
                              ? <input value={editingRow[col]??""} onChange={e=>setEditingRow((p:any)=>({...p,[col]:e.target.value}))}
                                  style={{ border:`1px solid #003087`,padding:"1px 4px",fontSize:11,fontFamily:S.font,width:"100%",minWidth:80 }} />
                              : (() => {
                                  const v = row[col];
                                  if (v === null || v === undefined) return <span style={{ color:"#999" }}>null</span>;
                                  if (typeof v === "boolean") return <span style={{ color:v?"#006600":"#cc0000",fontWeight:700 }}>{v?"true":"false"}</span>;
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
            <div style={{ padding:"6px 12px",borderTop:`1px solid ${S.border}`,display:"flex",alignItems:"center",gap:10,background:"rgba(0,0,0,0.3)",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.07)",fontFamily:S.font,fontSize:11 }}>
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
                    {Object.keys(editingRow).map(k => (
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
                  <p style={{ fontSize:12,marginBottom:16 }}>Delete row ID: <code style={{ fontFamily:S.mono }}>{deleteConfirm.slice(0,20)}-</code>?<br/>This cannot be undone.</p>
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
          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
            <div style={{ padding:"6px 12px",display:"flex",alignItems:"center",gap:8,background:"rgba(0,0,0,0.3)",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>Real SQL Editor - PostgreSQL</span>
              {sqlMs !== null && <span style={{ fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:S.font }}>Executed in {sqlMs}ms</span>}
              <div style={{ marginLeft:"auto",display:"flex",gap:6 }}>
                <button onClick={()=>setSql("SELECT * FROM " + selectedTable + " LIMIT 50;")} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>
                  Select *
                </button>
                <button onClick={()=>setSql("SELECT COUNT(*) FROM " + selectedTable + ";")} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>
                  Count
                </button>
                <button onClick={()=>setSql(`SELECT table_name, column_count, policy_count, trigger_count FROM db_stats ORDER BY table_name;`)} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>
                  DB Stats
                </button>
                <button onClick={runSQL} disabled={sqlRunning} style={{ background:"#003087",color:"#fff",border:"none",padding:"4px 14px",cursor:"pointer",fontFamily:S.font,fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5 }}>
                  <Play style={{ width:12,height:12 }} />{sqlRunning?"Running-":"Run -"}
                </button>
              </div>
            </div>
            <div style={{ flex:"0 0 220px",borderBottom:`2px solid #003087`,position:"relative" }}>
              <textarea
                ref={sqlRef}
                value={sql}
                onChange={e=>setSql(e.target.value)}
                onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){ e.preventDefault(); runSQL(); } }}
                style={{ width:"100%",height:"100%",border:"none",padding:12,fontSize:13,fontFamily:S.mono,color:"#1e293b",background:"#f8fafc",resize:"none",outline:"none",boxSizing:"border-box",lineHeight:1.6 }}
                placeholder="-- Write SQL here (Ctrl+Enter to run)"
                spellCheck={false}
              />
              <div style={{ position:"absolute",bottom:4,right:8,fontSize:10,color:"#999",fontFamily:S.font }}>Ctrl+Enter to run</div>
            </div>
            <div style={{ flex:1,overflow:"auto",padding:0 }}>
              {sqlError && (
                <div style={{ padding:"8px 14px",background:"rgba(248,113,113,0.1)",borderBottom:`1px solid #cc0000`,fontFamily:S.mono,fontSize:12,color:"#cc0000" }}>
                  <AlertTriangle style={{ width:12,height:12,display:"inline",marginRight:6 }} />Error: {sqlError}
                </div>
              )}
              {sqlResult.length > 0 && (
                <div>
                  <div style={{ padding:"4px 12px",background:"rgba(74,222,128,0.1)",borderBottom:`1px solid ${S.border}`,fontFamily:S.font,fontSize:11,color:"#006600" }}>
                    <CheckCircle style={{ width:11,height:11,display:"inline",marginRight:6 }} />{sqlResult.length} row(s) returned in {sqlMs}ms
                  </div>
                  <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                    <thead style={{ position:"sticky",top:0 }}>
                      <tr>
                        {Object.keys(sqlResult[0]).map(k => (
                          <th key={k} style={{ ...CELL,background:"rgba(30,58,138,0.8)",color:"#f1f5f9",fontWeight:700,textAlign:"left" }}>{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sqlResult.map((r,i) => (
                        <tr key={i} style={{ background:i%2===0?"#ffffff":"#f8fafc" }}>
                          {Object.values(r).map((v:any,j) => (
                            <td key={j} style={CELL}>{v===null?<span style={{ color:"#999" }}>null</span>:String(v).slice(0,200)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                    <th key={h} style={{ ...CELL,background:"rgba(30,58,138,0.8)",color:"#f1f5f9",fontWeight:700,textAlign:"left" }}>{h}</th>
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
                    <th key={h} style={{ ...CELL,background:"rgba(30,58,138,0.8)",color:"#f1f5f9",fontWeight:700,textAlign:"left" }}>{h}</th>
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

        {/* - REALTIME tab - */}
        {activeTab === "realtime" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden" }}>
            <div style={{ padding:"8px 14px",borderBottom:`1px solid ${S.border}`,background:S.head,display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>Real-time Monitor - {selectedTable}</span>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:realtimeOn?"#00cc44":"#cc0000" }} />
                <span style={{ fontSize:11,fontFamily:S.font }}>{realtimeOn?"Connected":"Disconnected"}</span>
              </div>
              <button onClick={toggleRealtime} style={{ background:realtimeOn?"#cc0000":"#006600",color:"#fff",border:"none",padding:"4px 14px",cursor:"pointer",fontFamily:S.font,fontSize:11,fontWeight:700 }}>
                {realtimeOn?"Stop Listening":"Start Listening"}
              </button>
              <button onClick={()=>setRealtimeLog([])} style={{ border:`1px solid ${S.border}`,background:S.bg,padding:"4px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Clear Log</button>
            </div>
            <div style={{ flex:1,overflow:"auto",background:"#1e1e1e",padding:10 }}>
              {realtimeLog.length === 0 ? (
                <div style={{ color:"#4ade80",fontFamily:S.mono,fontSize:12,padding:10 }}>
                  {realtimeOn ? "- Listening for changes on " + selectedTable + "-" : "Click 'Start Listening' to monitor real-time changes"}
                </div>
              ) : realtimeLog.map((log,i) => (
                <div key={i} style={{ fontFamily:S.mono,fontSize:11,marginBottom:4,color:"#4ade80" }}>
                  <span style={{ color:"#60a5fa" }}>[{log.time}]</span>{" "}
                  <span style={{ color:log.event==="INSERT"?"#4ade80":log.event==="UPDATE"?"#fbbf24":"#f87171",fontWeight:700 }}>{log.event}</span>{" "}
                  <span style={{ color:"#c084fc" }}>{log.table}</span>{" "}
                  <span style={{ color:"#1e293b" }}>{log.data}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* - STATS tab - */}
        {activeTab === "stats" && (
          <div style={{ flex:1,overflow:"auto",padding:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <span style={{ fontWeight:700,fontSize:13,fontFamily:S.font,color:"#003087" }}>Database Statistics ({stats.length || "-"} tables)</span>
              <button onClick={loadStats} style={{ border:`1px solid ${S.border}`,padding:"3px 10px",cursor:"pointer",fontFamily:S.font,fontSize:11 }}>Refresh</button>
            </div>
            {stats.length > 0 ? (
              <table style={{ borderCollapse:"collapse",width:"100%",fontSize:12,fontFamily:S.font }}>
                <thead>
                  <tr>
                    {["Table","Columns","Policies","Triggers","Rows"].map(h=>(
                      <th key={h} style={{ ...CELL,background:"rgba(30,58,138,0.8)",color:"#f1f5f9",fontWeight:700,textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row,i) => (
                    <tr key={i} style={{ background:i%2===0?"#ffffff":"#f8fafc",cursor:"pointer" }} onClick={()=>{ setSelectedTable(row.table_name); setActiveTab("tables"); }}>
                      <td style={{ ...CELL,fontWeight:700,color:"#003087" }}>{row.table_name}</td>
                      <td style={{ ...CELL,textAlign:"center" }}>{row.column_count}</td>
                      <td style={{ ...CELL,textAlign:"center",color:row.policy_count>0?"#006600":"#cc0000",fontWeight:700 }}>{row.policy_count}</td>
                      <td style={{ ...CELL,textAlign:"center",color:row.trigger_count>0?"#cc6600":"#666" }}>{row.trigger_count}</td>
                      <td style={{ ...CELL,textAlign:"right" }}>{(tableCounts[row.table_name]||0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontFamily:S.font,fontSize:12,color:"#666",padding:20 }}>Click Refresh to load statistics-</div>
            )}
          </div>
        )}

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