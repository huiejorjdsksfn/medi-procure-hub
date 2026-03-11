import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Database, RefreshCw, Plus, Trash2, Edit3, Save, X, Search,
  ChevronRight, ChevronDown, Download, Play, Server,
  Table as TableIcon, SortAsc, SortDesc, Maximize2, Minimize2,
  CheckCircle, Activity, Wifi, Eye, EyeOff, BarChart3,
  Filter, Settings, AlertTriangle, Copy, Code2, Layers,
  ArrowUpDown, FileSpreadsheet, Upload, Clock
} from "lucide-react";
import * as XLSX from "xlsx";
import RoleGuard from "@/components/RoleGuard";

/* ═══════════════════════════════════════
   TABLE GROUPS / SCHEMA
═══════════════════════════════════════ */
const TABLE_GROUPS = [
  { id:"users",       label:"Users & Access",    color:"#4f46e5", tables:["profiles","user_roles","roles","permissions"] },
  { id:"procurement", label:"Procurement",        color:"#0078d4", tables:["requisitions","requisition_items","purchase_orders","goods_received","contracts","tenders","bid_evaluations","procurement_plans"] },
  { id:"inventory",   label:"Inventory",          color:"#107c10", tables:["items","item_categories","departments","suppliers","stock_movements"] },
  { id:"vouchers",    label:"Vouchers & Finance", color:"#C45911", tables:["payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers","sales_vouchers","budgets","chart_of_accounts","bank_accounts","gl_entries","fixed_assets"] },
  { id:"quality",     label:"Quality",            color:"#00695C", tables:["inspections","non_conformance"] },
  { id:"system",      label:"System",             color:"#5C2D91", tables:["audit_log","notifications","system_settings","system_config","documents","backup_jobs","inbox_items"] },
  { id:"connections", label:"Connections",        color:"#0369a1", tables:["odbc_connections","external_connections"] },
];
const ALL_TABLES = TABLE_GROUPS.flatMap(g => g.tables.map(t => ({ table: t, group: g })));

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500, 1000];
const MAX_ROWS_OPTIONS  = [100, 500, 1000, 5000, "All"];

/* ═══════════════════════════════════════
   CONTEXT MENU
═══════════════════════════════════════ */
function CtxMenu({ x, y, items, onClose }: { x:number; y:number; items:{label:string;icon?:any;color?:string;action:()=>void;divider?:boolean}[]; onClose:()=>void }) {
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:9999}}>
      <div onClick={e=>e.stopPropagation()} style={{
        position:"fixed", left:x, top:y, zIndex:10000,
        background:"#1e2233", border:"1px solid #3a3d52",
        borderRadius:4, boxShadow:"0 8px 24px rgba(0,0,0,0.6)",
        minWidth:210, padding:"3px 0",
      }}>
        {items.map((item,i) => item.divider
          ? <div key={i} style={{height:1,background:"#2e3248",margin:"3px 0"}}/>
          : <button key={i} onClick={()=>{item.action();onClose();}}
              style={{
                display:"flex",alignItems:"center",gap:8,
                width:"100%",padding:"6px 14px",border:"none",
                background:"transparent",cursor:"pointer",
                fontSize:12, color: item.color||"#c8cfe0", textAlign:"left" as const,
              }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2a3050"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              {item.icon && <item.icon style={{width:13,height:13,flexShrink:0}} />}
              {item.label}
            </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   SQL PANEL
═══════════════════════════════════════ */
function SqlPanel({ table, onClose }: { table:string; onClose:()=>void }) {
  const [sql, setSql]         = useState(`SELECT *\nFROM ${table}\nLIMIT 50;`);
  const [result, setResult]   = useState<any[]>([]);
  const [cols, setCols]       = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [execMs, setExecMs]   = useState<number|null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"result"|"messages">("result");

  const run = async () => {
    setRunning(true);
    const t0 = Date.now();
    try {
      // Extract table name from SQL for Supabase
      const match = sql.match(/FROM\s+([a-z_]+)/i);
      const tbl = match?.[1] || table;
      const limit = parseInt(sql.match(/LIMIT\s+(\d+)/i)?.[1] || "50");
      const { data, error } = await (supabase as any).from(tbl).select("*").limit(Math.min(limit, 1000));
      if (error) throw error;
      const d = data || [];
      setResult(d);
      setCols(d.length > 0 ? Object.keys(d[0]) : []);
      const ms = Date.now() - t0;
      setExecMs(ms);
      setMessages([`✅ Query executed successfully`, `Set 1, Execution Time: ${ms} Milliseconds`, `Rows returned: ${d.length}`]);
      setActiveTab("result");
    } catch (e: any) {
      setMessages([`❌ Error: ${e.message}`]);
      setActiveTab("messages");
      toast({ title:"SQL Error", description:e.message, variant:"destructive" });
    }
    setRunning(false);
  };

  const fmtVal = (v: any) => v === null ? <span style={{color:"#555e7a",fontStyle:"italic"}}>NULL</span> : String(v).slice(0,120);

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#141825",fontFamily:"monospace"}}>
      {/* SQL editor header */}
      <div style={{display:"flex",alignItems:"center",padding:"4px 8px",background:"#1a1e2e",borderBottom:"1px solid #2e3248",gap:6,flexShrink:0}}>
        <Code2 style={{width:13,height:13,color:"#60a5fa"}}/>
        <span style={{fontSize:11,fontWeight:700,color:"#cdd6f4"}}>SQL Editor — {table}</span>
        <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
          <button onClick={run} disabled={running} style={{
            display:"flex",alignItems:"center",gap:5,padding:"3px 12px",
            background:"#1a3a6b",color:"#fff",border:"none",borderRadius:4,
            cursor:"pointer",fontSize:11,fontWeight:700,
          }}>
            {running ? <RefreshCw style={{width:11,height:11,animation:"spin 1s linear infinite"}}/> : <Play style={{width:11,height:11}}/>}
            Run (F5)
          </button>
          <button onClick={()=>setSql(`SELECT * FROM ${table} LIMIT 50;`)} style={{padding:"3px 10px",background:"#2e3248",color:"#94a3b8",border:"none",borderRadius:4,cursor:"pointer",fontSize:11}}>Reset</button>
          <button onClick={onClose} style={{padding:"3px 8px",background:"transparent",color:"#64748b",border:"none",cursor:"pointer"}}><X style={{width:12,height:12}}/></button>
        </div>
      </div>
      {/* stop on error + toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"3px 10px",background:"#181d2c",borderBottom:"1px solid #2e3248",fontSize:10,color:"#64748b",flexShrink:0}}>
        <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",userSelect:"none"}}>
          <input type="checkbox" defaultChecked style={{accentColor:"#ef4444"}}/> Stop On Error
        </label>
        <span>Max Rows: 1000</span>
        <span>Rows Per Page: 50</span>
        {execMs !== null && <span style={{color:"#22c55e",marginLeft:"auto"}}>✓ {execMs}ms</span>}
      </div>
      {/* Editor */}
      <textarea value={sql} onChange={e=>setSql(e.target.value)}
        onKeyDown={e => { if(e.key==="F5"||((e.ctrlKey||e.metaKey)&&e.key==="Enter")){e.preventDefault();run();} }}
        spellCheck={false}
        style={{
          height:130, padding:"10px 14px", fontSize:12, lineHeight:1.7,
          fontFamily:"'Cascadia Code','Fira Code',monospace",
          background:"#10121c", color:"#cdd6f4",
          border:"none", borderBottom:"1px solid #2e3248",
          resize:"none", outline:"none", flexShrink:0,
        }}
      />
      {/* Results tabs */}
      <div style={{display:"flex",background:"#1a1e2e",borderBottom:"1px solid #2e3248",flexShrink:0}}>
        {(["result","messages"] as const).map(t=>(
          <button key={t} onClick={()=>setActiveTab(t)} style={{
            padding:"5px 14px",fontSize:11,fontWeight:600,border:"none",
            background:activeTab===t?"#141825":"transparent",
            color:activeTab===t?"#cdd6f4":"#64748b",cursor:"pointer",
            borderBottom:activeTab===t?"2px solid #60a5fa":"2px solid transparent",
            textTransform:"capitalize" as const,
          }}>{t==="result"?`Results (${result.length})`:"Messages"}</button>
        ))}
      </div>
      {/* Output */}
      <div style={{flex:1,overflow:"auto"}}>
        {activeTab==="messages"
          ? <div style={{padding:"12px 16px"}}>
              {messages.map((m,i)=>(
                <div key={i} style={{fontSize:11,color:m.startsWith("✅")?"#22c55e":m.startsWith("❌")?"#ef4444":"#94a3b8",lineHeight:2,fontFamily:"monospace"}}>{m}</div>
              ))}
            </div>
          : result.length===0
            ? <div style={{padding:"20px",color:"#475569",fontSize:12,textAlign:"center"}}>Run a query to see results</div>
            : <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",minWidth:"max-content"}}>
                <thead>
                  <tr style={{background:"#1a1e2e",position:"sticky",top:0}}>
                    {cols.map(c=>(
                      <th key={c} style={{padding:"5px 12px",textAlign:"left",color:"#94a3b8",fontWeight:700,fontSize:10,borderRight:"1px solid #2e3248",whiteSpace:"nowrap"}}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.map((row,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #1e2234",background:i%2===0?"#10121c":"#13162a"}}>
                      {cols.map(c=>(
                        <td key={c} style={{padding:"4px 12px",color:row[c]===null?"#3d4460":"#94a3b8",fontStyle:row[c]===null?"italic":"normal",whiteSpace:"nowrap",borderRight:"1px solid #1e2234",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis"}}>
                          {fmtVal(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   VISUALIZATION PANEL
═══════════════════════════════════════ */
function VisPanel({ rows, cols }: { rows:any[]; cols:string[] }) {
  const [xCol, setXCol]       = useState(cols[0]||"");
  const [yCol, setYCol]       = useState(cols[1]||"");
  const [grouped, setGrouped] = useState(true);
  const [activeTab, setActiveTab] = useState<"columns"|"settings"|"sql">("columns");

  const numCols = cols.filter(c => rows.some(r => typeof r[c]==="number" || !isNaN(Number(r[c]))));

  const chartData = useMemo(() => {
    if (!xCol || !yCol || rows.length===0) return [];
    const map: Record<string,number> = {};
    rows.forEach(r => {
      const k = String(r[xCol]||"").slice(0,12);
      map[k] = (map[k]||0) + Number(r[yCol]||0);
    });
    return Object.entries(map).slice(0,12).map(([k,v])=>({k,v}));
  }, [rows,xCol,yCol]);

  const maxV = Math.max(...chartData.map(d=>d.v),1);
  const colors = ["#f97316","#60a5fa","#a78bfa","#34d399","#fbbf24","#f87171","#38bdf8","#fb923c","#4ade80","#c084fc","#e879f9","#2dd4bf"];

  return (
    <div style={{display:"flex",height:"100%",background:"#141825",overflow:"hidden"}}>
      {/* Left config panel */}
      <div style={{width:280,background:"#1a1e2e",borderRight:"1px solid #2e3248",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{display:"flex",background:"#181d2c",borderBottom:"1px solid #2e3248"}}>
          {(["columns","settings","sql"] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} style={{
              flex:1,padding:"5px 0",fontSize:10,fontWeight:700,border:"none",
              background:activeTab===t?"#1a1e2e":"transparent",
              color:activeTab===t?"#cdd6f4":"#64748b",cursor:"pointer",
              textTransform:"capitalize" as const,
              borderBottom:activeTab===t?"2px solid #60a5fa":"2px solid transparent",
            }}>{t.toUpperCase()}</button>
          ))}
        </div>
        <div style={{flex:1,overflow:"auto",padding:"8px"}}>
          {activeTab==="columns" && (
            <div>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:6,letterSpacing:"0.06em"}}>ALL COLUMNS</div>
              {cols.map((c,i)=>(
                <button key={c} onClick={()=>{ if(!xCol)setXCol(c); else setYCol(c); }}
                  style={{
                    display:"block",width:"100%",padding:"5px 8px",marginBottom:2,
                    background:c===yCol?"#1a3a6b30":c===xCol?"#2e3248":"transparent",
                    border:c===yCol?"1px solid #1a3a6b":"1px solid transparent",
                    borderRadius:3,cursor:"pointer",textAlign:"left" as const,fontSize:11,
                    color:c===yCol?"#60a5fa":c===xCol?"#e2e8f0":"#94a3b8",
                  }}>
                  {c===yCol && <span style={{color:"#f97316",marginRight:6}}>●</span>}
                  {c}
                </button>
              ))}
              <div style={{marginTop:10,fontSize:10,fontWeight:700,color:"#64748b",letterSpacing:"0.06em"}}>KEY COLUMNS</div>
              {cols.filter(c=>c==="id"||c.endsWith("_id")||c.endsWith("_number")).slice(0,3).map(c=>(
                <button key={c} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"4px 8px",marginBottom:2,background:"transparent",border:"1px solid transparent",borderRadius:3,cursor:"pointer",textAlign:"left" as const,fontSize:11,color:"#64748b"}}>
                  {c}<X style={{width:10,height:10}}/>
                </button>
              ))}
            </div>
          )}
          {activeTab==="settings" && (
            <div style={{padding:4}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748b",marginBottom:8}}>CHART TYPE</div>
              {["Grouped","Stacked","Line","Pie"].map(t=>(
                <button key={t} onClick={()=>setGrouped(t==="Grouped")} style={{display:"block",width:"100%",padding:"5px 10px",marginBottom:3,background:grouped&&t==="Grouped"||!grouped&&t==="Stacked"?"#1a3a6b":"#2e3248",border:"none",borderRadius:3,cursor:"pointer",textAlign:"left" as const,fontSize:11,color:"#cdd6f4"}}>
                  {t}
                </button>
              ))}
            </div>
          )}
          {activeTab==="sql" && (
            <div style={{fontSize:10,fontFamily:"monospace",color:"#94a3b8",lineHeight:1.8,padding:4}}>
              SELECT {xCol||"..."}, {yCol||"..."}<br/>
              FROM {numCols[0]||"table"}<br/>
              GROUP BY {xCol||"..."}<br/>
              ORDER BY {yCol||"..."} DESC
            </div>
          )}
        </div>
        {/* Value/Group config */}
        <div style={{borderTop:"1px solid #2e3248",padding:"8px"}}>
          <div style={{marginBottom:6}}>
            <div style={{fontSize:9,fontWeight:700,color:"#64748b",marginBottom:4}}>VALUE COLUMNS</div>
            {numCols.slice(0,2).map(c=>(
              <div key={c} style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                <span style={{flex:1,fontSize:10,color:"#94a3b8"}}>{c}</span>
                <span style={{fontSize:9,color:"#64748b",width:30}}>sum</span>
                <span style={{fontSize:9,color:"#64748b",width:20}}>Y1</span>
                <X style={{width:10,height:10,color:"#ef4444",cursor:"pointer"}}/>
              </div>
            ))}
          </div>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:"#64748b",marginBottom:4}}>GROUP COLUMN</div>
            <div style={{height:28,background:"#2e3248",borderRadius:3,display:"flex",alignItems:"center",padding:"0 8px",fontSize:10,color:"#475569"}}>
              Drag and drop column
            </div>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",padding:"6px 12px",background:"#1a1e2e",borderBottom:"1px solid #2e3248",gap:8,flexShrink:0}}>
          <BarChart3 style={{width:13,height:13,color:"#60a5fa"}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#cdd6f4"}}>Chart</span>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:10,color:"#64748b"}}>Grouped</span>
            <ChevronDown style={{width:11,height:11,color:"#64748b"}}/>
          </div>
        </div>

        <div style={{flex:1,display:"flex",flexDirection:"column",padding:"16px 20px",overflow:"auto"}}>
          {/* Y axis selector */}
          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <select value={xCol} onChange={e=>setXCol(e.target.value)} style={{fontSize:10,background:"#2e3248",color:"#94a3b8",border:"1px solid #3a3d52",borderRadius:3,padding:"2px 6px"}}>
              {cols.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <select value={yCol} onChange={e=>setYCol(e.target.value)} style={{fontSize:10,background:"#2e3248",color:"#94a3b8",border:"1px solid #3a3d52",borderRadius:3,padding:"2px 6px"}}>
              {cols.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {chartData.length > 0 ? (
            <div style={{display:"flex",alignItems:"flex-end",gap:6,flex:1,paddingBottom:20,paddingLeft:30,position:"relative"}}>
              {/* Y axis */}
              <div style={{position:"absolute",left:0,top:0,bottom:20,display:"flex",flexDirection:"column",justifyContent:"space-between",fontSize:8,color:"#64748b",textAlign:"right" as const}}>
                {[100,80,60,40,20,0].map(v=><span key={v}>{v}</span>)}
              </div>
              {/* Bars */}
              {chartData.map((d,i)=>{
                const h = Math.max((d.v/maxV)*200, 2);
                return (
                  <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,minWidth:28}}>
                    <div title={`${d.k}: ${d.v}`} style={{
                      width:"100%",height:h,
                      background:colors[i%colors.length],
                      borderRadius:"2px 2px 0 0",
                      display:"flex",alignItems:"flex-start",justifyContent:"center",
                      cursor:"pointer",minHeight:3,
                      transition:"opacity 0.2s",
                    }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.opacity="0.75"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.opacity="1"}>
                      <span style={{fontSize:7,color:"rgba(255,255,255,0.7)",marginTop:2,transform:"rotate(-90deg)",whiteSpace:"nowrap",overflow:"hidden"}}></span>
                    </div>
                    <span style={{fontSize:7,color:"#64748b",textAlign:"center" as const,maxWidth:40,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.k}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#475569",gap:8}}>
              <BarChart3 style={{width:36,height:36,color:"#2e3248"}}/>
              <div style={{fontSize:11}}>Select X and Y columns to render chart</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN TABLE BROWSER
═══════════════════════════════════════ */
function TableBrowser() {
  const { user } = useAuth();

  // Layout state
  const [fullscreen, setFullscreen] = useState(false);
  const [bottomPanel, setBottomPanel] = useState<"sql"|"vis"|null>(null);

  // Sidebar
  const [expandedGroups, setExpandedGroups] = useState<Record<string,boolean>>(
    Object.fromEntries(TABLE_GROUPS.map(g=>[g.id, g.id==="procurement"||g.id==="inventory"||g.id==="users"]))
  );
  const [tblSearch, setTblSearch] = useState("");

  // Open tabs
  const [openTabs, setOpenTabs] = useState<string[]>(["items"]);
  const [activeTable, setActiveTable] = useState("items");

  // Table data
  const [rows, setRows]         = useState<any[]>([]);
  const [cols, setCols]         = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [page, setPage]         = useState(1);
  const [rowCount, setRowCount] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [maxRows,  setMaxRows]  = useState(1000);
  const [sortCol,  setSortCol]  = useState("");
  const [sortDir,  setSortDir]  = useState<"asc"|"desc">("asc");
  const [dataSearch, setDataSearch] = useState("");
  const [filterCol, setFilterCol]   = useState("");
  const [filterVal, setFilterVal]   = useState("");
  const [showFilter, setShowFilter] = useState(false);

  // Row editing
  const [editingId,   setEditingId]   = useState<string|null>(null);
  const [editValues,  setEditValues]  = useState<any>({});
  const [newRowMode,  setNewRowMode]  = useState(false);
  const [newRowVals,  setNewRowVals]  = useState<any>({});
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Real-time
  const [rtConnected, setRtConnected] = useState(false);
  const [rtEvents, setRtEvents] = useState<{t:string;e:string;time:string}[]>([]);
  const rtRef = useRef<any>(null);

  // Context menu
  const [ctx, setCtx] = useState<{x:number;y:number;row?:any}|null>(null);

  const group = useMemo(() => TABLE_GROUPS.find(g=>g.tables.includes(activeTable)), [activeTable]);

  /* ── load table ── */
  const loadTable = useCallback(async (tbl:string, pg=1, sc=sortCol, sd=sortDir) => {
    setLoading(true);
    setEditingId(null); setNewRowMode(false); setSelectedRows(new Set());
    try {
      const from = (pg-1)*pageSize;
      let q = (supabase as any).from(tbl).select("*",{count:"exact"});
      if (sc) q = q.order(sc, {ascending: sd==="asc"});
      if (filterCol && filterVal) q = q.ilike(filterCol, `%${filterVal}%`);
      q = q.range(from, from+pageSize-1);
      const { data, count, error } = await q;
      if (error) throw error;
      const d = data || [];
      setRows(d); setRowCount(count||0);
      setCols(d.length > 0 ? Object.keys(d[0]) : []);
    } catch(e:any) {
      toast({ title:"Load error", description:e.message, variant:"destructive" });
    }
    setLoading(false);
  }, [sortCol, sortDir, pageSize, filterCol, filterVal]);

  useEffect(() => {
    setPage(1); setSortCol(""); setDataSearch(""); setFilterCol(""); setFilterVal("");
    loadTable(activeTable, 1, "", "asc");
  }, [activeTable]);

  /* ── real-time subscription ── */
  useEffect(() => {
    if (rtRef.current) (supabase as any).removeChannel(rtRef.current);
    const ch = (supabase as any).channel(`rt-${activeTable}`)
      .on("postgres_changes", {event:"*", schema:"public", table:activeTable}, (payload:any) => {
        setRtEvents(prev=>[{t:activeTable,e:payload.eventType,time:new Date().toLocaleTimeString()},...prev.slice(0,19)]);
        loadTable(activeTable, page);
      })
      .subscribe((s:string)=>setRtConnected(s==="SUBSCRIBED"));
    rtRef.current = ch;
    return () => { if(rtRef.current)(supabase as any).removeChannel(rtRef.current); };
  }, [activeTable, page]);

  /* ── open table in tab ── */
  const openTab = (tbl:string) => {
    if (!openTabs.includes(tbl)) setOpenTabs(prev=>[...prev,tbl]);
    setActiveTable(tbl);
  };
  const closeTab = (tbl:string, e:React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter(t=>t!==tbl);
    setOpenTabs(remaining);
    if (activeTable===tbl) setActiveTable(remaining[remaining.length-1]||"items");
  };

  /* ── sort ── */
  const handleSort = (col:string) => {
    const nd = sortCol===col&&sortDir==="asc" ? "desc" : "asc";
    setSortCol(col); setSortDir(nd);
    loadTable(activeTable, page, col, nd);
  };

  /* ── CRUD ── */
  const updateRow = async () => {
    if (!editingId) return;
    const { error } = await (supabase as any).from(activeTable).update(editValues).eq("id", editingId);
    if (error) { toast({title:"Update failed",description:error.message,variant:"destructive"}); return; }
    toast({title:"Row updated ✓", description:`Table: ${activeTable}`});
    setEditingId(null); loadTable(activeTable, page);
  };
  const deleteRow = async (id:string) => {
    if (!confirm(`Delete row from ${activeTable}?`)) return;
    const { error } = await (supabase as any).from(activeTable).delete().eq("id", id);
    if (error) { toast({title:"Delete failed",description:error.message,variant:"destructive"}); return; }
    toast({title:"Deleted ✓"}); loadTable(activeTable, page);
  };
  const deleteSelected = async () => {
    if (!selectedRows.size) return;
    if (!confirm(`Delete ${selectedRows.size} selected rows?`)) return;
    const ids = Array.from(selectedRows);
    const { error } = await (supabase as any).from(activeTable).delete().in("id", ids);
    if (error) { toast({title:"Delete failed",description:error.message,variant:"destructive"}); return; }
    toast({title:`Deleted ${ids.length} rows`});
    setSelectedRows(new Set()); loadTable(activeTable, page);
  };
  const insertRow = async () => {
    const { error } = await (supabase as any).from(activeTable).insert(newRowVals);
    if (error) { toast({title:"Insert failed",description:error.message,variant:"destructive"}); return; }
    toast({title:"Row inserted ✓"}); setNewRowMode(false); setNewRowVals({}); loadTable(activeTable, page);
  };
  const truncateConfirm = () => {
    if (!confirm(`TRUNCATE ${activeTable}? This deletes ALL rows permanently!`)) return;
    toast({title:"Truncate simulated", description:"Direct TRUNCATE not available via client API"});
  };
  const dropConfirm = () => {
    if (!confirm(`DROP TABLE ${activeTable}? This is IRREVERSIBLE!`)) return;
    toast({title:"Drop simulated", description:"Direct DROP not available via client API"});
  };

  /* ── export ── */
  const exportXlsx = (allRows=false) => {
    const data = allRows ? rows : rows.filter(r=>!selectedRows.size||selectedRows.has(r.id));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, activeTable.slice(0,30));
    XLSX.writeFile(wb, `${activeTable}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported", description:`${data.length} rows`});
  };
  const copyInsertSQL = (row:any) => {
    const cols2 = Object.keys(row).filter(c=>c!=="id"&&c!=="created_at"&&c!=="updated_at");
    const sql = `INSERT INTO ${activeTable} (${cols2.join(", ")}) VALUES (${cols2.map(c=>`'${row[c]||""}'`).join(", ")});`;
    navigator.clipboard?.writeText(sql);
    toast({title:"Insert SQL copied"});
  };
  const copySelectSQL = (row:any) => {
    const sql = `SELECT * FROM ${activeTable} WHERE id = '${row.id}';`;
    navigator.clipboard?.writeText(sql);
    toast({title:"Select SQL copied"});
  };

  /* ── filtered rows ── */
  const filtered = dataSearch
    ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(dataSearch.toLowerCase())))
    : rows;

  const totalPages = Math.max(1, Math.ceil(rowCount/pageSize));
  const autoSkip = (col:string) => col==="id"||col==="created_at"||col==="updated_at";

  const fmtCell = (v:any, col:string) => {
    if (v===null||v===undefined) return <span style={{color:"#3d4460",fontStyle:"italic",fontSize:9}}>NULL</span>;
    const s = String(v);
    if (col==="id"||col.endsWith("_id")) return <span style={{color:"#60a5fa",fontSize:9}}>{s.slice(0,8)}…</span>;
    if (s.includes("T")&&s.includes(":")) { // datetime
      try { return <span style={{color:"#94a3b8"}}>{new Date(s).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</span>; } catch{}
    }
    if (s==="true"||s==="false") return <span style={{color:s==="true"?"#22c55e":"#ef4444",fontWeight:700,fontSize:10}}>{s}</span>;
    return <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"block",maxWidth:180}}>{s.slice(0,80)+(s.length>80?"…":"")}</span>;
  };

  const ctxMenuItems = (row:any) => [
    { label:"View Data in New Tab", icon:Eye, action:()=>openTab(activeTable) },
    { label:"Vacuum", icon:Activity, action:()=>toast({title:"Vacuum executed"}) },
    { label:"", divider:true, action:()=>{} },
    { label:"Select Statement", icon:Copy, action:()=>copySelectSQL(row) },
    { label:"Insert Statement", icon:Plus, action:()=>copyInsertSQL(row) },
    { label:"Delete Statement", icon:Trash2, color:"#ef4444", action:()=>{ navigator.clipboard?.writeText(`DELETE FROM ${activeTable} WHERE id = '${row.id}';`); toast({title:"Delete SQL copied"}); } },
    { label:"Update Statement", icon:Edit3, action:()=>{ const sql=`UPDATE ${activeTable} SET column = value WHERE id = '${row.id}';`; navigator.clipboard?.writeText(sql); toast({title:"Update SQL copied"}); } },
  ];

  return (
    <div style={{
      display:"flex", flexDirection:"column",
      height: fullscreen ? "100vh" : "calc(100vh - 57px)",
      position: fullscreen ? "fixed" : "relative",
      inset: fullscreen ? 0 : undefined,
      zIndex: fullscreen ? 9000 : undefined,
      background:"#141825", fontFamily:"'Segoe UI',system-ui,sans-serif",
    }}>

      {/* ══ TOP BAR ══ */}
      <div style={{display:"flex",alignItems:"center",padding:"0 12px",height:38,background:"#1a1e2e",borderBottom:"1px solid #2e3248",flexShrink:0,gap:8}}>
        <Database style={{width:14,height:14,color:"#60a5fa"}}/>
        <div style={{display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e"}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#cdd6f4"}}>Supabase EL5 MediProcure</span>
        </div>
        {rtConnected && (
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",background:"rgba(34,197,94,0.1)",borderRadius:4,border:"1px solid rgba(34,197,94,0.2)"}}>
            <Wifi style={{width:10,height:10,color:"#22c55e"}}/>
            <span style={{fontSize:9,fontWeight:700,color:"#22c55e"}}>REALTIME ON</span>
          </div>
        )}
        {rtEvents.length>0 && (
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",background:"rgba(96,165,250,0.1)",borderRadius:4}}>
            <Activity style={{width:9,height:9,color:"#60a5fa"}}/>
            <span style={{fontSize:9,color:"#60a5fa"}}>{rtEvents[0].e} · {rtEvents[0].t} · {rtEvents[0].time}</span>
          </div>
        )}
        <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setBottomPanel(p=>p==="sql"?null:"sql")} style={{
            padding:"3px 10px",fontSize:10,fontWeight:700,border:"1px solid",borderRadius:4,cursor:"pointer",
            background:bottomPanel==="sql"?"#1a3a6b":"transparent",
            borderColor:bottomPanel==="sql"?"#1a3a6b":"#2e3248",
            color:bottomPanel==="sql"?"#93c5fd":"#64748b",
          }}>
            <Code2 style={{width:11,height:11,display:"inline",marginRight:4}}/>SQL Editor
          </button>
          <button onClick={()=>setBottomPanel(p=>p==="vis"?null:"vis")} style={{
            padding:"3px 10px",fontSize:10,fontWeight:700,border:"1px solid",borderRadius:4,cursor:"pointer",
            background:bottomPanel==="vis"?"#5C2D91":"transparent",
            borderColor:bottomPanel==="vis"?"#5C2D91":"#2e3248",
            color:bottomPanel==="vis"?"#d8b4fe":"#64748b",
          }}>
            <BarChart3 style={{width:11,height:11,display:"inline",marginRight:4}}/>Visualization
          </button>
          <button onClick={()=>setFullscreen(f=>!f)} style={{padding:"3px 8px",background:"transparent",border:"1px solid #2e3248",borderRadius:4,cursor:"pointer",color:"#64748b"}}>
            {fullscreen ? <Minimize2 style={{width:11,height:11}}/> : <Maximize2 style={{width:11,height:11}}/>}
          </button>
        </div>
      </div>

      {/* ══ CONNECTION TAB ══ */}
      <div style={{background:"#181d2c",borderBottom:"1px solid #2e3248",padding:"0 8px",display:"flex",alignItems:"center",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",padding:"4px 12px 3px",background:"#1a1e2e",border:"1px solid #2e3248",borderBottom:"none",borderRadius:"4px 4px 0 0",marginTop:2,gap:5}}>
          <Server style={{width:11,height:11,color:"#22c55e"}}/>
          <span style={{fontSize:11,color:"#cdd6f4",fontWeight:600}}>PGSQL (postgres@EL5MediProcure)</span>
          <X style={{width:10,height:10,color:"#64748b",cursor:"pointer"}}/>
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* SIDEBAR */}
        <div style={{width:240,display:"flex",flexDirection:"column",background:"#1a1e2e",borderRight:"1px solid #2e3248",flexShrink:0,overflow:"hidden"}}>

          {/* DB Objects header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",borderBottom:"1px solid #2e3248",flexShrink:0}}>
            <span style={{fontSize:11,fontWeight:800,color:"#cdd6f4"}}>DB Objects</span>
            <Maximize2 style={{width:12,height:12,color:"#64748b",cursor:"pointer"}}/>
          </div>

          {/* Schema dropdown */}
          <div style={{padding:"6px 8px",borderBottom:"1px solid #2e3248",display:"flex",gap:4,flexShrink:0}}>
            <select style={{flex:1,fontSize:11,background:"#2e3248",color:"#94a3b8",border:"1px solid #3a3d52",borderRadius:3,padding:"3px 6px",outline:"none"}}>
              <option>public</option>
              <option>auth</option>
              <option>storage</option>
            </select>
            <button onClick={()=>loadTable(activeTable)} style={{padding:"3px 6px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#60a5fa"}}>
              <RefreshCw style={{width:11,height:11}}/>
            </button>
          </div>

          {/* Search */}
          <div style={{padding:"5px 8px",borderBottom:"1px solid #2e3248",flexShrink:0,position:"relative"}}>
            <Search style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",width:11,height:11,color:"#475569"}}/>
            <input value={tblSearch} onChange={e=>setTblSearch(e.target.value)}
              placeholder="Search objects…"
              style={{width:"100%",paddingLeft:24,paddingRight:6,paddingTop:4,paddingBottom:4,fontSize:11,background:"#141825",color:"#94a3b8",border:"1px solid #2e3248",borderRadius:3,outline:"none"}}/>
          </div>

          {/* Tree */}
          <div style={{flex:1,overflowY:"auto",padding:"4px 0"}}>
            {/* Tables group */}
            {TABLE_GROUPS.map(grp => {
              const tbls = tblSearch ? grp.tables.filter(t=>t.includes(tblSearch.toLowerCase())) : grp.tables;
              if (tblSearch && tbls.length===0) return null;
              const isOpen = expandedGroups[grp.id];
              return (
                <div key={grp.id}>
                  <button onClick={()=>setExpandedGroups(p=>({...p,[grp.id]:!p[grp.id]}))}
                    style={{display:"flex",alignItems:"center",gap:5,width:"100%",padding:"4px 10px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const}}>
                    {isOpen
                      ? <ChevronDown style={{width:11,height:11,color:"#64748b"}}/>
                      : <ChevronRight style={{width:11,height:11,color:"#64748b"}}/>}
                    <span style={{fontSize:10,fontWeight:700,color:grp.color}}>{grp.label}</span>
                    <span style={{marginLeft:"auto",fontSize:9,color:"#3d4460"}}>{tbls.length}</span>
                  </button>
                  {isOpen && tbls.map(t => {
                    const isActive = activeTable === t && openTabs.includes(t);
                    return (
                      <button key={t}
                        onClick={()=>openTab(t)}
                        onContextMenu={e=>{e.preventDefault();openTab(t);}}
                        style={{
                          display:"flex",alignItems:"center",gap:6,
                          width:"100%",padding:"4px 14px 4px 28px",
                          border:"none",cursor:"pointer",textAlign:"left" as const,
                          background: activeTable===t ? `${grp.color}28` : "transparent",
                        }}
                        onMouseEnter={e=>{if(activeTable!==t)(e.currentTarget as HTMLElement).style.background="#2a3050";}}
                        onMouseLeave={e=>{if(activeTable!==t)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                        <TableIcon style={{width:11,height:11,flexShrink:0,color:activeTable===t?grp.color:"#475569"}}/>
                        <span style={{fontSize:11,color:activeTable===t?"#e2e8f0":"#8b95b0",fontWeight:activeTable===t?700:400}}>{t}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Other DB objects */}
            {[
              {label:"Views",             icon:Eye,      color:"#0ea5e9"},
              {label:"Procedures",        icon:Play,     color:"#a78bfa"},
              {label:"Sequences",         icon:Layers,   color:"#f97316"},
              {label:"Trigger Functions", icon:Zap,      color:"#fbbf24"},
            ].map(obj=>(
              <button key={obj.label} style={{display:"flex",alignItems:"center",gap:5,width:"100%",padding:"4px 10px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const}}>
                <ChevronRight style={{width:11,height:11,color:"#3d4460"}}/>
                <obj.icon style={{width:11,height:11,color:obj.color}}/>
                <span style={{fontSize:10,fontWeight:700,color:"#4a5270"}}>{obj.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Open table tabs */}
          <div style={{display:"flex",alignItems:"center",background:"#181d2c",borderBottom:"1px solid #2e3248",flexShrink:0,overflowX:"auto",paddingLeft:4}}>
            {openTabs.map(tab => {
              const g2 = TABLE_GROUPS.find(g=>g.tables.includes(tab));
              const isAct = tab===activeTable;
              return (
                <div key={tab} onClick={()=>setActiveTable(tab)}
                  style={{
                    display:"flex",alignItems:"center",gap:5,
                    padding:"5px 12px 4px",cursor:"pointer",flexShrink:0,
                    background:isAct?"#141825":"transparent",
                    borderRight:"1px solid #2e3248",
                    borderBottom:isAct?"1px solid #141825":"none",
                    marginBottom:isAct?"-1px":0,
                  }}>
                  <TableIcon style={{width:11,height:11,color:isAct?(g2?.color||"#60a5fa"):"#475569"}}/>
                  <span style={{fontSize:11,color:isAct?"#cdd6f4":"#6b7a9a",fontWeight:isAct?700:400,whiteSpace:"nowrap"}}>
                    Table Data public.{tab}
                  </span>
                  <button onClick={e=>closeTab(tab,e)} style={{padding:"1px 2px",background:"transparent",border:"none",cursor:"pointer",color:"#475569",marginLeft:2}}>
                    <X style={{width:9,height:9}}/>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Table title */}
          <div style={{padding:"6px 12px",background:"#1a1e2e",borderBottom:"1px solid #2e3248",flexShrink:0}}>
            <span style={{fontSize:13,fontWeight:800,color:"#e2e8f0"}}>Table Data public.{activeTable}</span>
          </div>

          {/* ── TOOLBAR ── */}
          <div style={{display:"flex",alignItems:"center",gap:4,padding:"5px 8px",background:"#1a1e2e",borderBottom:"1px solid #2e3248",flexShrink:0,flexWrap:"wrap"}}>

            {/* Options */}
            <button style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#cdd6f4",fontSize:11,fontWeight:600}}>
              <Settings style={{width:11,height:11}}/> Options <ChevronDown style={{width:9,height:9}}/>
            </button>

            <div style={{width:1,height:18,background:"#2e3248"}}/>

            {/* Truncate */}
            <button onClick={truncateConfirm} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",fontSize:11}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2e3248"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <AlertTriangle style={{width:11,height:11,color:"#f97316"}}/> Truncate
            </button>

            {/* Drop */}
            <button onClick={dropConfirm} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",fontSize:11}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2e3248"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <X style={{width:11,height:11,color:"#ef4444"}}/> Drop
            </button>

            <div style={{width:1,height:18,background:"#2e3248"}}/>

            {/* Add Row */}
            <button onClick={()=>{setNewRowMode(true);setNewRowVals({});}} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"#15803d",border:"none",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700}}>
              <Plus style={{width:11,height:11}}/> Add Row
            </button>

            {/* Total Rows */}
            <button style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",fontSize:11}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2e3248"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <FileSpreadsheet style={{width:11,height:11,color:"#94a3b8"}}/> Total Rows: {rowCount.toLocaleString()}
            </button>

            {/* Filter */}
            <button onClick={()=>setShowFilter(f=>!f)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:showFilter?"#1a3a6b":"transparent",border:"none",borderRadius:3,cursor:"pointer",color:showFilter?"#93c5fd":"#94a3b8",fontSize:11}}
              onMouseEnter={e=>{if(!showFilter)(e.currentTarget as HTMLElement).style.background="#2e3248";}}
              onMouseLeave={e=>{if(!showFilter)(e.currentTarget as HTMLElement).style.background="transparent";}}>
              <Filter style={{width:11,height:11}}/> Filter
            </button>

            <div style={{width:1,height:18,background:"#2e3248"}}/>

            {/* Export */}
            <button onClick={()=>exportXlsx(false)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",fontSize:11}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2e3248"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Download style={{width:11,height:11}}/> Export <ChevronDown style={{width:9,height:9}}/>
            </button>

            {/* Export All */}
            <button onClick={()=>exportXlsx(true)} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",fontSize:11}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2e3248"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Download style={{width:11,height:11}}/> Export All Rows
            </button>

            {/* Import */}
            <button style={{display:"flex",alignItems:"center",gap:4,padding:"4px 9px",background:"transparent",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",fontSize:11}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#2e3248"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Upload style={{width:11,height:11}}/> Import Data
            </button>

            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
              {/* Max Rows */}
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>Max Rows:</span>
                <select value={maxRows} onChange={e=>setMaxRows(Number(e.target.value))} style={{fontSize:10,background:"#2e3248",color:"#cdd6f4",border:"1px solid #3a3d52",borderRadius:3,padding:"2px 4px",width:60}}>
                  {MAX_ROWS_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {/* Rows on page */}
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:10,color:"#64748b",whiteSpace:"nowrap"}}>Rows On Page:</span>
                <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);loadTable(activeTable,1);}} style={{fontSize:10,background:"#2e3248",color:"#cdd6f4",border:"1px solid #3a3d52",borderRadius:3,padding:"2px 4px",width:55}}>
                  {PAGE_SIZE_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              {/* Refresh */}
              <button onClick={()=>loadTable(activeTable,page)} disabled={loading} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#60a5fa",fontSize:11,fontWeight:700}}>
                <RefreshCw style={{width:11,height:11}}/> Refresh
              </button>
            </div>
          </div>

          {/* Filter bar */}
          {showFilter && (
            <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",background:"#13162a",borderBottom:"1px solid #2e3248",flexShrink:0}}>
              <Filter style={{width:11,height:11,color:"#60a5fa"}}/>
              <span style={{fontSize:10,color:"#64748b"}}>Filter:</span>
              <select value={filterCol} onChange={e=>setFilterCol(e.target.value)} style={{fontSize:10,background:"#2e3248",color:"#94a3b8",border:"1px solid #3a3d52",borderRadius:3,padding:"3px 6px"}}>
                <option value="">Column…</option>
                {cols.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{fontSize:10,color:"#64748b"}}>contains</span>
              <input value={filterVal} onChange={e=>setFilterVal(e.target.value)} placeholder="value…"
                style={{fontSize:10,background:"#2e3248",color:"#94a3b8",border:"1px solid #3a3d52",borderRadius:3,padding:"3px 8px",width:140,outline:"none"}}/>
              <button onClick={()=>loadTable(activeTable,1)} style={{padding:"3px 10px",background:"#1a3a6b",color:"#93c5fd",border:"none",borderRadius:3,cursor:"pointer",fontSize:10,fontWeight:700}}>Apply</button>
              <button onClick={()=>{setFilterCol("");setFilterVal("");setShowFilter(false);loadTable(activeTable,1,"","asc");}} style={{padding:"3px 8px",background:"#2e3248",color:"#64748b",border:"none",borderRadius:3,cursor:"pointer",fontSize:10}}>Clear</button>
              <div style={{marginLeft:"auto",position:"relative"}}>
                <Search style={{position:"absolute",left:7,top:"50%",transform:"translateY(-50%)",width:10,height:10,color:"#475569"}}/>
                <input value={dataSearch} onChange={e=>setDataSearch(e.target.value)} placeholder="Search visible rows…"
                  style={{fontSize:10,background:"#2e3248",color:"#94a3b8",border:"1px solid #3a3d52",borderRadius:3,padding:"3px 6px 3px 22px",width:160,outline:"none"}}/>
              </div>
            </div>
          )}

          {/* TABLE + panels */}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* Data table */}
            <div style={{flex:1,overflow:"auto",position:"relative"}}>
              {loading ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,gap:10}}>
                  <RefreshCw style={{width:20,height:20,color:"#475569",animation:"spin 1s linear infinite"}}/>
                  <span style={{color:"#475569",fontSize:12}}>Loading {activeTable}…</span>
                </div>
              ) : (
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:"max-content",fontSize:11}}>
                  <thead>
                    <tr style={{background:"#1e2438",position:"sticky",top:0,zIndex:5}}>
                      {/* Row number */}
                      <th style={{width:40,padding:"6px 8px",textAlign:"left" as const,color:"#3d4460",fontSize:10,fontWeight:700,borderRight:"1px solid #2e3248",position:"sticky",left:0,background:"#1e2438"}}>
                        <input type="checkbox"
                          onChange={e=>{ if(e.target.checked) setSelectedRows(new Set(filtered.map(r=>r.id))); else setSelectedRows(new Set()); }}
                          style={{accentColor:"#60a5fa"}}/>
                      </th>
                      {/* Actions */}
                      <th style={{width:72,padding:"6px 6px",textAlign:"left" as const,color:"#3d4460",fontSize:9,fontWeight:700,borderRight:"1px solid #2e3248",position:"sticky",left:40,background:"#1e2438"}}>
                        ACTIONS
                      </th>
                      {cols.map(col=>(
                        <th key={col} onClick={()=>handleSort(col)}
                          style={{
                            padding:"6px 12px",textAlign:"left" as const,cursor:"pointer",
                            color:sortCol===col?"#60a5fa":"#7a85a0",fontSize:10,fontWeight:700,
                            borderRight:"1px solid #1e2438",whiteSpace:"nowrap",minWidth:100,
                            userSelect:"none",
                          }}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#252a40"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                          <span style={{display:"flex",alignItems:"center",gap:4}}>
                            {col}
                            {sortCol===col
                              ? (sortDir==="asc"?<SortAsc style={{width:10,height:10}}/>:<SortDesc style={{width:10,height:10}}/>)
                              : <ArrowUpDown style={{width:9,height:9,opacity:0.3}}/>}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* New row input */}
                    {newRowMode && (
                      <tr style={{background:"#0d2a1a",borderBottom:"1px solid #2e3248"}}>
                        <td style={{padding:"4px 8px",borderRight:"1px solid #2e3248"}}></td>
                        <td style={{padding:"4px 6px",borderRight:"1px solid #2e3248",position:"sticky",left:40,background:"#0d2a1a"}}>
                          <div style={{display:"flex",gap:2}}>
                            <button onClick={insertRow} title="Save" style={{padding:"3px",background:"#22c55e",border:"none",borderRadius:3,cursor:"pointer"}}>
                              <CheckCircle style={{width:12,height:12,color:"#fff"}}/>
                            </button>
                            <button onClick={()=>setNewRowMode(false)} title="Cancel" style={{padding:"3px",background:"#475569",border:"none",borderRadius:3,cursor:"pointer"}}>
                              <X style={{width:12,height:12,color:"#fff"}}/>
                            </button>
                          </div>
                        </td>
                        {cols.map(col=>(
                          autoSkip(col)
                            ? <td key={col} style={{padding:"4px 12px",color:"#3d4460",fontStyle:"italic",fontSize:10}}>auto</td>
                            : <td key={col} style={{padding:"2px 4px"}}>
                                <input value={newRowVals[col]||""} onChange={e=>setNewRowVals((p:any)=>({...p,[col]:e.target.value}))}
                                  style={{width:"100%",padding:"3px 6px",background:"#0f2810",color:"#86efac",border:"1px solid #22c55e",borderRadius:2,fontSize:11,outline:"none",fontFamily:"inherit",minWidth:80}}/>
                              </td>
                        ))}
                      </tr>
                    )}

                    {filtered.length===0
                      ? <tr><td colSpan={cols.length+2} style={{padding:"30px",textAlign:"center",color:"#3d4460",fontSize:12}}>No data in table</td></tr>
                      : filtered.map((row,i)=>{
                          const isEditing = editingId===row.id;
                          const isSelected = selectedRows.has(row.id);
                          return (
                            <tr key={row.id||i}
                              onContextMenu={e=>{e.preventDefault();setCtx({x:e.clientX,y:e.clientY,row});}}
                              onDoubleClick={()=>{setEditingId(row.id);setEditValues({...row});}}
                              style={{
                                borderBottom:"1px solid #1a1f30",cursor:"pointer",
                                background:isEditing?"#0e2040":isSelected?"#1a1e38":i%2===0?"#10121c":"#12152a",
                              }}
                              onMouseEnter={e=>{ if(!isEditing&&!isSelected)(e.currentTarget as HTMLElement).style.background="#1e2440"; }}
                              onMouseLeave={e=>{ if(!isEditing&&!isSelected)(e.currentTarget as HTMLElement).style.background=i%2===0?"#10121c":"#12152a"; }}>

                              {/* Checkbox */}
                              <td style={{padding:"5px 8px",borderRight:"1px solid #1a1f30",position:"sticky",left:0,background:"inherit"}}>
                                <input type="checkbox" checked={isSelected}
                                  onChange={e=>{setSelectedRows(prev=>{const n=new Set(prev);if(e.target.checked)n.add(row.id);else n.delete(row.id);return n;});}}
                                  style={{accentColor:"#60a5fa"}}/>
                              </td>

                              {/* Action icons */}
                              <td style={{padding:"4px 6px",borderRight:"1px solid #1a1f30",position:"sticky",left:40,background:"inherit"}}>
                                {isEditing ? (
                                  <div style={{display:"flex",gap:2}}>
                                    <button onClick={updateRow} title="Save" style={{padding:"3px",background:"#1d4ed8",border:"none",borderRadius:3,cursor:"pointer"}}>
                                      <Save style={{width:12,height:12,color:"#fff"}}/>
                                    </button>
                                    <button onClick={()=>setEditingId(null)} title="Cancel" style={{padding:"3px",background:"#475569",border:"none",borderRadius:3,cursor:"pointer"}}>
                                      <X style={{width:12,height:12,color:"#fff"}}/>
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{display:"flex",gap:2}}>
                                    <button onClick={()=>deleteRow(row.id)} title="Delete" style={{padding:"3px",background:"none",border:"none",cursor:"pointer"}}
                                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#3f1515"}
                                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="none"}>
                                      <X style={{width:13,height:13,color:"#ef4444"}}/>
                                    </button>
                                    <button onClick={()=>{setEditingId(row.id);setEditValues({...row});}} title="Edit" style={{padding:"3px",background:"none",border:"none",cursor:"pointer"}}
                                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#133a13"}
                                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="none"}>
                                      <Edit3 style={{width:13,height:13,color:"#22c55e"}}/>
                                    </button>
                                    <button onClick={()=>{setNewRowMode(true);setNewRowVals({...row,id:undefined,created_at:undefined,updated_at:undefined});}} title="Clone row" style={{padding:"3px",background:"none",border:"none",cursor:"pointer"}}
                                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#0e3a1a"}
                                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="none"}>
                                      <Plus style={{width:13,height:13,color:"#22c55e"}}/>
                                    </button>
                                  </div>
                                )}
                              </td>

                              {/* Data cells */}
                              {cols.map(col=>(
                                <td key={col} style={{padding:"4px 12px",borderRight:"1px solid #1a1f30",maxWidth:200}}>
                                  {isEditing && !autoSkip(col)
                                    ? <input value={editValues[col]??""} onChange={e=>setEditValues((p:any)=>({...p,[col]:e.target.value}))}
                                        style={{width:"100%",padding:"2px 6px",background:"#0f172a",color:"#bfdbfe",border:"1px solid #1d4ed8",borderRadius:2,fontSize:11,outline:"none",fontFamily:"inherit",minWidth:80}}/>
                                    : fmtCell(row[col], col)
                                  }
                                </td>
                              ))}
                            </tr>
                          );
                        })
                    }
                  </tbody>
                </table>
              )}
            </div>

            {/* SQL or Visualization panel */}
            {bottomPanel && (
              <div style={{height:320,borderTop:"2px solid #2e3248",flexShrink:0}}>
                {bottomPanel==="sql"
                  ? <SqlPanel table={activeTable} onClose={()=>setBottomPanel(null)}/>
                  : <VisPanel rows={rows} cols={cols}/>
                }
              </div>
            )}
          </div>

          {/* ── STATUS BAR ── */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"4px 12px",background:"#1a1e2e",borderTop:"1px solid #2e3248",flexShrink:0,fontSize:10}}>
            {/* Pagination */}
            <div style={{display:"flex",alignItems:"center",gap:4}}>
              <button onClick={()=>{setPage(1);loadTable(activeTable,1);}} disabled={page===1} style={{padding:"2px 6px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",opacity:page===1?0.3:1}}>«</button>
              <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);loadTable(activeTable,p);}} disabled={page===1} style={{padding:"2px 6px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",opacity:page===1?0.3:1}}>‹</button>
              <span style={{padding:"2px 8px",background:"#2e3248",borderRadius:3,color:"#94a3b8"}}>Page {page}/{totalPages}</span>
              <button onClick={()=>{const p=Math.min(totalPages,page+1);setPage(p);loadTable(activeTable,p);}} disabled={page>=totalPages} style={{padding:"2px 6px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",opacity:page>=totalPages?0.3:1}}>›</button>
              <button onClick={()=>{setPage(totalPages);loadTable(activeTable,totalPages);}} disabled={page>=totalPages} style={{padding:"2px 6px",background:"#2e3248",border:"none",borderRadius:3,cursor:"pointer",color:"#94a3b8",opacity:page>=totalPages?0.3:1}}>»</button>
            </div>
            <span style={{color:"#475569"}}>Rows {(page-1)*pageSize+1}–{Math.min(page*pageSize,rowCount)} of <strong style={{color:"#64748b"}}>{rowCount.toLocaleString()}</strong></span>
            {sortCol && <span style={{color:"#3d4460"}}>Sorted: {sortCol} {sortDir}</span>}
            {selectedRows.size>0 && (
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{color:"#fbbf24"}}>{selectedRows.size} selected</span>
                <button onClick={deleteSelected} style={{padding:"1px 8px",background:"#7f1d1d",border:"none",borderRadius:3,cursor:"pointer",color:"#fca5a5",fontSize:9,fontWeight:700}}>
                  Delete Selected
                </button>
              </div>
            )}
            <span style={{color:"#2a3050"}}>· Double-click row to edit · Right-click for SQL menu</span>
            <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
              {rtConnected
                ? <><div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 4px #22c55e"}}/><span style={{color:"#22c55e"}}>Real-time Active</span></>
                : <><div style={{width:6,height:6,borderRadius:"50%",background:"#475569"}}/><span style={{color:"#475569"}}>Connecting…</span></>}
              <Clock style={{width:10,height:10,color:"#3d4460"}}/>
              <span style={{color:"#3d4460"}}>{new Date().toLocaleTimeString("en-KE")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {ctx && (
        <CtxMenu x={ctx.x} y={ctx.y}
          items={ctxMenuItems(ctx.row||{})}
          onClose={()=>setCtx(null)}/>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   Zap icon for tree
═══════════════════════════════════════ */
function Zap(props:any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }

/* ═══════════════════════════════════════
   EXPORT
═══════════════════════════════════════ */
export default function AdminDatabasePage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <TableBrowser/>
    </RoleGuard>
  );
}
