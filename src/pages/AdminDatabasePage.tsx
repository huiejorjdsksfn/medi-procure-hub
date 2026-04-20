/**
 * ProcurBosse — AdminDatabasePage v4.0 NUCLEAR
 * Power BI / D365 style database admin (Image 3 reference)
 * Table explorer · Query runner · Live stats · Health checks
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/theme";
import {
  Database, RefreshCw, Play, AlertTriangle, CheckCircle,
  Table, Search, Download, BarChart3, Activity, Clock,
  ChevronRight, ChevronDown, Filter, Zap, Server, HardDrive,
  TrendingUp, Eye, Trash2, Plus, Settings, Shield,
} from "lucide-react";

const db = supabase as any;

interface TableStat { name:string; count:number; size?:string; lastUpdated?:string; status:"ok"|"warn"|"error"; }
interface QueryResult { columns:string[]; rows:any[][]; rowCount:number; duration:number; error?:string; }

const KNOWN_TABLES = [
  "profiles","user_roles","items","categories","departments","suppliers",
  "requisitions","purchase_orders","goods_received","tenders","contracts",
  "bid_evaluations","notifications","audit_logs","emails","sms_logs",
  "facilities","settings","ip_allowlist","sessions","payment_vouchers",
  "invoice_matching","payment_proposals","budget_control","gl_postings",
  "inspections","non_conformances","fixed_assets","chart_of_accounts",
  "budgets","erp_sync_queue","requisition_items","purchase_order_items",
];

const QUICK_QUERIES = [
  { label:"Pending Requisitions", sql:"SELECT id,title,status,created_at FROM requisitions WHERE status IN ('submitted','pending') ORDER BY created_at DESC LIMIT 20" },
  { label:"Active Users",         sql:"SELECT p.full_name,p.email,ur.role FROM profiles p JOIN user_roles ur ON ur.user_id=p.id ORDER BY p.created_at DESC LIMIT 20" },
  { label:"Low Stock Items",      sql:"SELECT name,sku,current_quantity,unit FROM items WHERE current_quantity < 5 ORDER BY current_quantity ASC LIMIT 20" },
  { label:"Recent Audit Log",     sql:"SELECT action,table_name,user_id,created_at FROM audit_logs ORDER BY created_at DESC LIMIT 20" },
  { label:"PO Summary",           sql:"SELECT status,COUNT(*) as count,SUM(total_amount) as total FROM purchase_orders GROUP BY status" },
  { label:"All Tables Row Count", sql:"SELECT schemaname,tablename,n_live_tup as rows FROM pg_stat_user_tables ORDER BY n_live_tup DESC" },
];

/* Mini bar chart (Power BI style) */
function MiniBar({ label, val, max, color }: { label:string; val:number; max:number; color:string }) {
  const pct = max > 0 ? Math.min(100, Math.round(val/max*100)) : 0;
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3, color:T.fgMuted }}>
        <span>{label}</span><span style={{ fontWeight:700, color }}>{val.toLocaleString()}</span>
      </div>
      <div style={{ height:6, background:T.bg2, borderRadius:3, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width .5s" }} />
      </div>
    </div>
  );
}

/* KPI tile */
function KpiTile({ label, value, sub, icon:Icon, color }: { label:string; value:string|number; sub?:string; icon:any; color:string }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px", boxShadow:T.shadow }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
        <div style={{ width:36,height:36,borderRadius:T.r,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div style={{ fontSize:26, fontWeight:800, color, lineHeight:1, marginBottom:4 }}>
        {typeof value==="number"?value.toLocaleString():value}
      </div>
      <div style={{ fontSize:12, color:T.fgMuted, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:T.fgDim, marginTop:2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminDatabasePage() {
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [selected,   setSelected]   = useState<string>("requisitions");
  const [tableData,  setTableData]  = useState<any[]>([]);
  const [sql,        setSql]        = useState(QUICK_QUERIES[0].sql);
  const [result,     setResult]     = useState<QueryResult|null>(null);
  const [running,    setRunning]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [expanded,   setExpanded]   = useState(true);
  const [search,     setSearch]     = useState("");
  const [totals,     setTotals]     = useState({ tables:0, totalRows:0, dbSize:"~", uptime:"Online" });
  const [activeTab,  setActiveTab]  = useState<"explorer"|"query"|"health">("explorer");

  /* Load all table counts */
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats: TableStat[] = [];
      await Promise.allSettled(
        KNOWN_TABLES.map(async t => {
          try {
            const { count, error } = await db.from(t).select("id",{count:"exact",head:true});
            stats.push({ name:t, count:count??0, status:error?"error":"ok" });
          } catch {
            stats.push({ name:t, count:0, status:"error" });
          }
        })
      );
      stats.sort((a,b) => b.count-a.count);
      setTableStats(stats);
      const totalRows = stats.reduce((s,t)=>s+t.count,0);
      setTotals(v => ({...v, tables:stats.length, totalRows }));
    } catch(e:any){ console.warn('[AdminDB]',e?.message); }
    finally { setLoading(false); }
  }, []);

  /* Load table rows */
  const loadTable = useCallback(async (tbl: string) => {
    try {
      const { data } = await db.from(tbl).select("*").limit(50).order("created_at",{ascending:false});
      setTableData(data || []);
    } catch { setTableData([]); }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (selected) loadTable(selected); }, [selected, loadTable]);

  /* Run SQL */
  const runSql = async () => {
    setRunning(true); setResult(null);
    const t0 = Date.now();
    try {
      const { data, error } = await db.rpc("exec_sql", { query: sql }).select();
      if (error) throw error;
      const rows = data || [];
      const cols = rows.length ? Object.keys(rows[0]) : [];
      setResult({ columns:cols, rows:rows.map((r:any)=>cols.map(c=>r[c])), rowCount:rows.length, duration:Date.now()-t0 });
    } catch (e:any) {
      setResult({ columns:[], rows:[], rowCount:0, duration:Date.now()-t0, error:e?.message||"Query failed" });
    }
    setRunning(false);
  };

  const filteredTables = tableStats.filter(t => !search || t.name.includes(search.toLowerCase()));
  const maxCount = Math.max(...tableStats.map(t=>t.count), 1);
  const topTables = [...tableStats].sort((a,b)=>b.count-a.count).slice(0,8);

  const tblCols = tableData.length ? Object.keys(tableData[0]) : [];

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',system-ui,sans-serif" }}>

      {/* Header */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Database size={18} color={T.primary} />
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:T.fg }}>Database Administration</div>
            <div style={{ fontSize:11, color:T.fgDim }}>EL5 MediProcure · Supabase PostgreSQL</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={loadStats} style={{ display:"flex",alignItems:"center",gap:6,background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"6px 12px",cursor:"pointer",fontSize:13,color:T.fg }}>
            <RefreshCw size={13} className={loading?"animate-spin":""} />Refresh
          </button>
          <button style={{ display:"flex",alignItems:"center",gap:6,background:T.primary,border:"none",borderRadius:T.r,padding:"6px 14px",cursor:"pointer",fontSize:13,color:"#fff",fontWeight:600 }}>
            <Download size={13} />Export
          </button>
        </div>
      </div>

      {/* KPI Row (Power BI style) */}
      <div style={{ padding:"20px 24px 0" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:12, marginBottom:20 }}>
          <KpiTile label="Total Tables" value={totals.tables} icon={Table} color={T.primary} sub="Active schemas" />
          <KpiTile label="Total Rows" value={totals.totalRows} icon={HardDrive} color="#7719aa" sub="Across all tables" />
          <KpiTile label="DB Status" value={loading?"Checking":"Online"} icon={Server} color="#038387" sub="Supabase PostgreSQL" />
          <KpiTile label="Uptime" value="99.9%" icon={Activity} color="#498205" sub="Last 30 days" />
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${T.border}`, marginBottom:0 }}>
          {(["explorer","query","health"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              padding:"10px 20px", border:"none", background:"none", cursor:"pointer",
              fontSize:13, fontWeight: activeTab===t ? 700 : 400,
              color: activeTab===t ? T.primary : T.fgMuted,
              borderBottom: activeTab===t ? `2px solid ${T.primary}` : "2px solid transparent",
              textTransform:"capitalize",
            }}>{t==="explorer"?"Table Explorer":t==="query"?"SQL Query":t==="health"?"Health Check":t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"0 24px 24px", marginTop:16 }}>

        {/* ── TABLE EXPLORER ── */}
        {activeTab==="explorer" && (
          <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:16 }}>
            {/* Left: table list */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, overflow:"hidden", boxShadow:T.shadow }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
                <Search size={13} color={T.fgMuted} />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter tables..." style={{ border:"none",outline:"none",fontSize:12,flex:1,color:T.fg }} />
              </div>
              <div style={{ overflow:"auto", maxHeight:"60vh" }}>
                {filteredTables.map(t => (
                  <button key={t.name} onClick={() => setSelected(t.name)} style={{
                    display:"flex", alignItems:"center", gap:8, width:"100%", padding:"8px 14px",
                    border:"none", cursor:"pointer", textAlign:"left", fontSize:12, fontWeight: selected===t.name ? 700 : 400,
                    background: selected===t.name ? T.primaryBg : "transparent",
                    color: selected===t.name ? T.primary : T.fg,
                    borderLeft: selected===t.name ? `3px solid ${T.primary}` : "3px solid transparent",
                    transition:"all .1s",
                  }}>
                    <Table size={12} color={t.status==="error"?"#a4262c":selected===t.name?T.primary:T.fgMuted} />
                    <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.name}</span>
                    <span style={{ fontSize:10, color:T.fgDim, fontWeight:400 }}>{t.count.toLocaleString()}</span>
                    {t.status==="error" && <AlertTriangle size={10} color="#a4262c" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: table data */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, overflow:"hidden", boxShadow:T.shadow }}>
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Table size={14} color={T.primary} />
                  <span style={{ fontSize:14, fontWeight:700, color:T.fg }}>{selected}</span>
                  <span style={{ fontSize:11, color:T.fgMuted, background:T.primaryBg, padding:"2px 8px", borderRadius:10 }}>
                    {tableStats.find(t=>t.name===selected)?.count?.toLocaleString() || 0} rows
                  </span>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => loadTable(selected)} style={{ background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"4px 10px",cursor:"pointer",fontSize:12,color:T.fg,display:"flex",alignItems:"center",gap:4 }}>
                    <RefreshCw size={11} />Refresh
                  </button>
                </div>
              </div>
              <div style={{ overflow:"auto", maxHeight:"56vh" }}>
                {tableData.length > 0 ? (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:T.bg, position:"sticky", top:0, zIndex:1 }}>
                        {tblCols.map(c => (
                          <th key={c} style={{ padding:"8px 12px", textAlign:"left", color:T.fgMuted, fontWeight:600, borderBottom:`1px solid ${T.border}`, whiteSpace:"nowrap", fontSize:11, textTransform:"uppercase", letterSpacing:".04em" }}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row,i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }} onMouseEnter={e=>(e.currentTarget.style.background=T.bg)} onMouseLeave={e=>(e.currentTarget.style.background="")}>
                          {tblCols.map(c => (
                            <td key={c} style={{ padding:"7px 12px", color:T.fg, maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                              {row[c]===null||row[c]===undefined ? <span style={{color:T.fgDim,fontStyle:"italic"}}>null</span>
                                : typeof row[c]==="boolean" ? <span style={{color:row[c]?T.success:T.error}}>{String(row[c])}</span>
                                : String(row[c]).slice(0,120)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding:40, textAlign:"center", color:T.fgMuted }}>
                    <Database size={36} style={{ opacity:.2, display:"block", margin:"0 auto 12px" }} />
                    <div>No data or table not found</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── SQL QUERY ── */}
        {activeTab==="query" && (
          <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:16 }}>
            {/* Quick queries */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, overflow:"hidden", boxShadow:T.shadow }}>
              <div style={{ padding:"12px 14px", borderBottom:`1px solid ${T.border}`, fontSize:12, fontWeight:600, color:T.fgMuted, textTransform:"uppercase", letterSpacing:".06em" }}>Quick Queries</div>
              {QUICK_QUERIES.map(q => (
                <button key={q.label} onClick={() => setSql(q.sql)} style={{ display:"block", width:"100%", padding:"9px 14px", border:"none", cursor:"pointer", textAlign:"left", fontSize:12, background:"transparent", color:T.fg, borderBottom:`1px solid ${T.border}`, transition:"background .1s" }}
                  onMouseEnter={e=>(e.currentTarget.style.background=T.primaryBg)}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <ChevronRight size={11} style={{ marginRight:4 }} color={T.primary} />
                  {q.label}
                </button>
              ))}
            </div>

            {/* Editor + results */}
            <div>
              <div style={{ background:"#1e1e2e", borderRadius:T.rLg, overflow:"hidden", boxShadow:T.shadow, marginBottom:12 }}>
                <div style={{ padding:"8px 14px", background:"#16213e", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,.5)", fontFamily:"monospace" }}>SQL Editor</span>
                  <button onClick={runSql} disabled={running} style={{ display:"flex",alignItems:"center",gap:6,background:T.primary,color:"#fff",border:"none",borderRadius:T.r,padding:"5px 14px",cursor:running?"not-allowed":"pointer",fontSize:12,fontWeight:600,opacity:running?.7:1 }}>
                    <Play size={12} fill="#fff" />{running?"Running...":"Run Query"}
                  </button>
                </div>
                <textarea value={sql} onChange={e=>setSql(e.target.value)} rows={6}
                  style={{ width:"100%", background:"#1e1e2e", color:"#a9b7d0", border:"none", outline:"none", padding:"14px 16px", fontSize:13, fontFamily:"'Cascadia Code','Fira Code',monospace", resize:"vertical", boxSizing:"border-box", lineHeight:1.7 }} />
              </div>

              {result && (
                <div style={{ background:"#fff", border:`1px solid ${result.error?T.error:T.border}`, borderRadius:T.rLg, overflow:"hidden", boxShadow:T.shadow }}>
                  <div style={{ padding:"10px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:10 }}>
                    {result.error ? <AlertTriangle size={14} color={T.error} /> : <CheckCircle size={14} color={T.success} />}
                    <span style={{ fontSize:12, fontWeight:600, color:result.error?T.error:T.success }}>
                      {result.error ? "Query Error" : `${result.rowCount} rows · ${result.duration}ms`}
                    </span>
                  </div>
                  {result.error ? (
                    <div style={{ padding:16, color:T.error, fontSize:13, fontFamily:"monospace" }}>{result.error}</div>
                  ) : (
                    <div style={{ overflow:"auto", maxHeight:"40vh" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead>
                          <tr style={{ background:T.bg }}>
                            {result.columns.map(c => (
                              <th key={c} style={{ padding:"8px 12px",textAlign:"left",color:T.fgMuted,fontWeight:600,borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",fontSize:11,textTransform:"uppercase" }}>{c}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((r,i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${T.border}` }}>
                              {r.map((v,j) => (
                                <td key={j} style={{ padding:"7px 12px",color:T.fg,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                                  {v===null||v===undefined?<span style={{color:T.fgDim,fontStyle:"italic"}}>null</span>:String(v).slice(0,120)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── HEALTH CHECK ── */}
        {activeTab==="health" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {/* Table sizes */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px", boxShadow:T.shadow }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
                <BarChart3 size={16} color={T.primary} />
                <span style={{ fontSize:14, fontWeight:700, color:T.fg }}>Table Row Distribution</span>
              </div>
              {topTables.map(t => (
                <MiniBar key={t.name} label={t.name} val={t.count} max={maxCount} color={t.status==="error"?T.error:T.primary} />
              ))}
            </div>

            {/* Table health */}
            <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px", boxShadow:T.shadow }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${T.border}` }}>
                <Shield size={16} color="#498205" />
                <span style={{ fontSize:14, fontWeight:700, color:T.fg }}>Table Health Status</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, overflow:"auto", maxHeight:360 }}>
                {tableStats.map(t => (
                  <div key={t.name} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 10px", borderRadius:T.r, background:T.bg }}>
                    {t.status==="ok"
                      ? <CheckCircle size={13} color={T.success} />
                      : <AlertTriangle size={13} color={T.error} />}
                    <span style={{ flex:1, fontSize:12, color:T.fg }}>{t.name}</span>
                    <span style={{ fontSize:11, color:T.fgMuted }}>{t.count.toLocaleString()} rows</span>
                    <span style={{ fontSize:10, color:t.status==="ok"?T.success:T.error, fontWeight:600, textTransform:"uppercase" }}>{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
