import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Database, RefreshCw, Plus, Trash2, Edit, Save, X, Search,
  ChevronRight, ChevronDown, Filter, Download, Code,
  Table as TableIcon, SortAsc, SortDesc, Maximize2, Minimize2, CheckCircle
} from "lucide-react";
import * as XLSX from "xlsx";
import RoleGuard from "@/components/RoleGuard";

const TABLE_GROUPS = [
  { id:"users",       label:"Users & Access",      color:"#4f46e5", tables:["profiles","user_roles","roles","permissions"] },
  { id:"procurement", label:"Procurement",          color:"#1a3a6b", tables:["requisitions","requisition_items","purchase_orders","goods_received","contracts","tenders","bid_evaluations","procurement_plans"] },
  { id:"inventory",   label:"Inventory",            color:"#375623", tables:["items","item_categories","departments","suppliers","stock_movements"] },
  { id:"vouchers",    label:"Vouchers & Finance",   color:"#C45911", tables:["payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers","sales_vouchers","budgets","chart_of_accounts","bank_accounts","gl_entries","fixed_assets"] },
  { id:"quality",     label:"Quality",              color:"#00695C", tables:["inspections","non_conformance"] },
  { id:"system",      label:"System",               color:"#5C2D91", tables:["audit_log","notifications","notification_recipients","system_settings","system_config","documents","backup_jobs","inbox_items","admin_inbox"] },
  { id:"connections", label:"Connections",          color:"#0369a1", tables:["odbc_connections","external_connections"] },
];

const PAGE_SIZE = 50;

function SqlPanel({ table }: { table: string }) {
  const [sql, setSql] = useState(`SELECT * FROM ${table} LIMIT 100;`);
  const [result, setResult] = useState<any[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await (supabase as any).from(table).select("*").limit(20);
      if (error) throw error;
      const d = data || [];
      setResult(d);
      if (d.length > 0) setCols(Object.keys(d[0]));
    } catch (e: any) { toast({ title:"SQL Error", description:e.message, variant:"destructive" }); }
    setRunning(false);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b" style={{background:"#1e1e2e",borderColor:"#2e2e4e"}}>
        <span style={{fontSize:11,color:"#cdd6f4",fontWeight:700}}>SQL Editor</span>
        <button onClick={run} disabled={running} className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold" style={{background:"#1a3a6b",color:"#fff"}}>
          {running?<RefreshCw className="w-3 h-3 animate-spin"/>:"▶"} Run
        </button>
      </div>
      <textarea value={sql} onChange={e=>setSql(e.target.value)}
        className="h-32 p-3 text-xs font-mono resize-none outline-none"
        style={{background:"#181825",color:"#cdd6f4",borderBottom:"1px solid #2e2e4e"}} spellCheck={false}/>
      <div className="flex-1 overflow-auto">
        {result.length > 0 && (
          <table className="w-full text-xs" style={{minWidth:"max-content"}}>
            <thead><tr style={{background:"#1a1a2e"}}>
              {cols.map(c=><th key={c} className="px-3 py-1.5 text-left whitespace-nowrap" style={{color:"#94a3b8",fontWeight:700,fontSize:10}}>{c}</th>)}
            </tr></thead>
            <tbody>{result.map((r,i)=>(
              <tr key={i} style={{background:i%2===0?"#0f0f1a":"#131320",borderBottom:"1px solid #1e1e3a"}}>
                {cols.map(c=><td key={c} className="px-3 py-1.5 whitespace-nowrap" style={{color:r[c]===null?"#475569":"#94a3b8",fontStyle:r[c]===null?"italic":"normal"}}>{r[c]===null?"NULL":String(r[c]).slice(0,80)}</td>)}
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AdminDatabaseInner() {
  const { user, profile } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string,boolean>>({users:true,procurement:true,inventory:true});
  const [selectedTable, setSelectedTable] = useState("items");
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rowCount, setRowCount] = useState(0);
  const [tableSearch, setTableSearch] = useState("");
  const [dataSearch, setDataSearch] = useState("");
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [showNewRow, setShowNewRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<any>({});
  const [activeTab, setActiveTab] = useState<"data"|"sql"|"columns">("data");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("asc");
  const [fullscreen, setFullscreen] = useState(false);

  const group = TABLE_GROUPS.find(g=>g.tables.includes(selectedTable));

  const loadTable = useCallback(async(tbl:string,pg=1,sc=sortCol,sd=sortDir)=>{
    setLoading(true);
    try {
      const from=(pg-1)*PAGE_SIZE;
      let q=(supabase as any).from(tbl).select("*",{count:"exact"});
      if(sc) q=q.order(sc,{ascending:sd==="asc"});
      const {data,count,error}=await q.range(from,from+PAGE_SIZE-1);
      if(error) throw error;
      const d=data||[];
      setRows(d); setRowCount(count||0);
      if(d.length>0) setColumns(Object.keys(d[0]));
      else setColumns([]);
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setLoading(false);
  },[sortCol,sortDir]);

  useEffect(()=>{ setPage(1);setSortCol("");loadTable(selectedTable,1,"","asc");setEditingRow(null);setShowNewRow(false); },[selectedTable]);

  const handleSort=(col:string)=>{
    const nd=sortCol===col&&sortDir==="asc"?"desc":"asc";
    setSortCol(col);setSortDir(nd);loadTable(selectedTable,page,col,nd);
  };

  const updateRow=async()=>{
    if(!editingRow) return;
    const {error}=await (supabase as any).from(selectedTable).update(editValues).eq("id",editingRow.id);
    if(error){toast({title:"Update failed",description:error.message,variant:"destructive"});return;}
    toast({title:"Row updated ✓"}); setEditingRow(null); loadTable(selectedTable,page);
  };

  const deleteRow=async(id:string)=>{
    if(!confirm("Delete this row permanently?")) return;
    const{error}=await(supabase as any).from(selectedTable).delete().eq("id",id);
    if(error){toast({title:"Delete failed",description:error.message,variant:"destructive"});return;}
    toast({title:"Row deleted"}); loadTable(selectedTable,page);
  };

  const insertRow=async()=>{
    const{error}=await(supabase as any).from(selectedTable).insert(newRowValues);
    if(error){toast({title:"Insert failed",description:error.message,variant:"destructive"});return;}
    toast({title:"Row inserted ✓"}); setShowNewRow(false); setNewRowValues({}); loadTable(selectedTable,page);
  };

  const exportXlsx=()=>{
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,selectedTable.slice(0,30));
    XLSX.writeFile(wb,`${selectedTable}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${rows.length} rows`});
  };

  const filtered=dataSearch?rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(dataSearch.toLowerCase()))):rows;
  const totalPages=Math.ceil(rowCount/PAGE_SIZE)||1;

  const autoSkip=(col:string)=>col==="id"||col==="created_at"||col==="updated_at";

  return (
    <div className={`flex ${fullscreen?"fixed inset-0 z-50":"h-[calc(100vh-90px)]"}`}
      style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#13131f"}}>

      {/* SIDEBAR */}
      <div className="flex flex-col shrink-0 overflow-hidden" style={{width:260,background:"#1a1a2e",borderRight:"1px solid #2e2e4e"}}>
        <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{borderColor:"#2e2e4e",background:"#16213e"}}>
          <Database className="w-4 h-4" style={{color:"#60a5fa"}}/>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#e2e8f0"}}>Supabase · EL5</div>
            <div style={{fontSize:9,color:"#22c55e"}}>● Connected · PostgreSQL 15</div>
          </div>
          <div className="ml-auto w-2 h-2 rounded-full bg-green-400"/>
        </div>
        <div className="px-2 py-2 border-b" style={{borderColor:"#2e2e4e"}}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{color:"#64748b"}}/>
            <input placeholder="Search tables…" value={tableSearch} onChange={e=>setTableSearch(e.target.value)}
              className="w-full pl-6 pr-2 py-1.5 rounded text-xs outline-none"
              style={{background:"#0f0f1a",color:"#94a3b8",border:"1px solid #2e2e4e"}}/>
          </div>
        </div>
        <div className="px-3 py-1" style={{background:"#12122a"}}>
          <span style={{fontSize:9,fontWeight:700,color:"#475569",letterSpacing:"0.15em"}}>TABLES ({TABLE_GROUPS.flatMap(g=>g.tables).length})</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{scrollbarWidth:"thin"}}>
          {TABLE_GROUPS.map(grp=>{
            const isOpen=expandedGroups[grp.id];
            const tbls=tableSearch?grp.tables.filter(t=>t.includes(tableSearch)):grp.tables;
            if(tableSearch&&tbls.length===0) return null;
            return (
              <div key={grp.id}>
                <button onClick={()=>setExpandedGroups(p=>({...p,[grp.id]:!p[grp.id]}))}
                  className="flex items-center gap-1.5 w-full px-3 py-1.5 hover:bg-white/5 text-left">
                  {isOpen?<ChevronDown className="w-3 h-3" style={{color:"#64748b"}}/>:<ChevronRight className="w-3 h-3" style={{color:"#64748b"}}/>}
                  <span style={{fontSize:10,fontWeight:700,color:grp.color}}>{grp.label}</span>
                  <span style={{fontSize:9,color:"#475569",marginLeft:"auto"}}>{grp.tables.length}</span>
                </button>
                {isOpen&&tbls.map(t=>(
                  <button key={t} onClick={()=>setSelectedTable(t)}
                    className="flex items-center gap-2 w-full px-5 py-1 hover:bg-white/5 text-left"
                    style={{background:selectedTable===t?`${grp.color}22`:"transparent"}}>
                    <TableIcon className="w-3 h-3 shrink-0" style={{color:selectedTable===t?grp.color:"#475569"}}/>
                    <span style={{fontSize:11,color:selectedTable===t?"#e2e8f0":"#94a3b8",fontWeight:selectedTable===t?700:400}}>{t}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN PANEL */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center px-2 border-b" style={{background:"#1a1a2e",borderColor:"#2e2e4e",minHeight:38}}>
          <div className="flex items-center gap-1.5 px-3 py-1 mr-2 rounded-t"
            style={{background:"#13131f",border:"1px solid #2e2e4e",borderBottom:"1px solid #13131f"}}>
            <TableIcon className="w-3 h-3" style={{color:group?.color||"#60a5fa"}}/>
            <span style={{fontSize:11,color:"#e2e8f0",fontWeight:700}}>{selectedTable}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px]" style={{background:"#2e2e4e",color:"#64748b"}}>{rowCount}</span>
          </div>
          <div className="flex gap-0.5 ml-auto">
            {(["data","sql","columns"] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)}
                className="px-2.5 py-1 rounded text-xs font-semibold capitalize"
                style={{background:activeTab===tab?"#2e2e4e":"transparent",color:activeTab===tab?"#e2e8f0":"#64748b"}}>
                {tab==="data"?"Data":tab==="sql"?"Table SQL":"Columns"}
              </button>
            ))}
            <button onClick={()=>setFullscreen(f=>!f)} className="p-1 rounded hover:bg-white/10 ml-1" style={{color:"#64748b"}}>
              {fullscreen?<Minimize2 className="w-3.5 h-3.5"/>:<Maximize2 className="w-3.5 h-3.5"/>}
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b flex-wrap" style={{background:"#1a1a2e",borderColor:"#2e2e4e"}}>
          <button onClick={()=>loadTable(selectedTable,page)} disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{background:"#2e2e4e",color:"#94a3b8"}}>
            <RefreshCw className={`w-3 h-3 ${loading?"animate-spin":""}`}/> Refresh
          </button>
          <button onClick={()=>{setShowNewRow(true);setNewRowValues({});}}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold" style={{background:"#15803d",color:"#fff"}}>
            <Plus className="w-3 h-3"/> New row
          </button>
          <button onClick={exportXlsx}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{background:"#2e2e4e",color:"#94a3b8"}}>
            <Download className="w-3 h-3"/> Export
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{color:"#475569"}}/>
            <input placeholder="Filter rows…" value={dataSearch} onChange={e=>setDataSearch(e.target.value)}
              className="pl-6 pr-2 py-1 rounded text-xs outline-none w-44"
              style={{background:"#0f0f1a",color:"#94a3b8",border:"1px solid #2e2e4e"}}/>
          </div>
          <div className="ml-auto" style={{fontSize:10,color:"#475569"}}>
            {filtered.length}/{rowCount} rows · {sortCol&&`sorted: ${sortCol} ${sortDir}`}
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab==="sql"?(
            <SqlPanel table={selectedTable}/>
          ):activeTab==="columns"?(
            <div className="flex-1 overflow-auto p-4">
              <div className="rounded-xl overflow-hidden" style={{border:"1px solid #2e2e4e"}}>
                <div className="px-4 py-2.5 flex items-center gap-2" style={{background:"#1a1a2e"}}>
                  <TableIcon className="w-4 h-4" style={{color:group?.color||"#60a5fa"}}/>
                  <span style={{fontSize:12,fontWeight:800,color:"#e2e8f0"}}>{selectedTable}</span>
                  <span style={{fontSize:10,color:"#475569"}}>— {columns.length} columns · {rowCount} rows</span>
                </div>
                <table className="w-full text-xs">
                  <thead><tr style={{background:"#161630"}}>
                    {["#","Column Name","Type","Notes"].map(h=><th key={h} className="text-left px-4 py-2" style={{color:"#64748b",fontSize:10,fontWeight:700}}>{h}</th>)}
                  </tr></thead>
                  <tbody>{columns.map((col,i)=>(
                    <tr key={col} style={{background:i%2===0?"#0f0f1a":"#131320",borderBottom:"1px solid #1e1e3a"}}>
                      <td className="px-4 py-1.5" style={{color:"#475569"}}>{i+1}</td>
                      <td className="px-4 py-1.5 font-bold" style={{color:"#60a5fa"}}>{col}</td>
                      <td className="px-4 py-1.5" style={{color:"#94a3b8"}}>text / uuid / timestamp</td>
                      <td className="px-4 py-1.5" style={{color:"#475569"}}>{col==="id"?"Primary Key":col.endsWith("_at")?"Auto timestamp":col.endsWith("_id")?"Foreign Key":""}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ):(
            <div className="flex-1 overflow-auto">
              {loading?(
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="w-6 h-6 animate-spin" style={{color:"#475569"}}/>
                  <span className="ml-3 text-xs" style={{color:"#475569"}}>Loading…</span>
                </div>
              ):(
                <table className="w-full text-xs" style={{borderCollapse:"collapse",minWidth:"max-content"}}>
                  <thead>
                    <tr style={{background:"#161630",position:"sticky",top:0,zIndex:5}}>
                      <th className="px-3 py-2 text-left w-8" style={{color:"#475569",fontSize:10,borderRight:"1px solid #2e2e4e"}}>#</th>
                      {columns.map(col=>(
                        <th key={col} onClick={()=>handleSort(col)} className="px-3 py-2 text-left cursor-pointer hover:bg-white/5 whitespace-nowrap select-none"
                          style={{color:sortCol===col?"#60a5fa":"#94a3b8",fontSize:10,fontWeight:700,borderRight:"1px solid #1e1e3a",minWidth:90}}>
                          <span className="flex items-center gap-1">
                            {col}
                            {sortCol===col?(sortDir==="asc"?<SortAsc className="w-2.5 h-2.5"/>:<SortDesc className="w-2.5 h-2.5"/>):null}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 py-2 w-20 text-left" style={{color:"#475569",fontSize:10,position:"sticky",right:0,background:"#161630"}}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {showNewRow&&(
                      <tr style={{background:"#1a3d12"}}>
                        <td className="px-3 py-1.5" style={{color:"#22c55e",fontWeight:800}}>★</td>
                        {columns.map(col=>(
                          autoSkip(col)?(
                            <td key={col} className="px-2 py-1" style={{color:"#475569",fontStyle:"italic",fontSize:10}}>auto</td>
                          ):(
                            <td key={col} className="px-1 py-1">
                              <input value={newRowValues[col]||""} onChange={e=>setNewRowValues((p:any)=>({...p,[col]:e.target.value}))}
                                className="w-full px-2 py-0.5 rounded outline-none text-xs"
                                style={{background:"#0f2010",color:"#d1fae5",border:"1px solid #22c55e",minWidth:80}}/>
                            </td>
                          )
                        ))}
                        <td className="px-2 py-1" style={{position:"sticky",right:0,background:"#1a3d12"}}>
                          <div className="flex gap-1">
                            <button onClick={insertRow} className="p-1 rounded bg-green-500"><CheckCircle className="w-3 h-3 text-white"/></button>
                            <button onClick={()=>setShowNewRow(false)} className="p-1 rounded bg-gray-600"><X className="w-3 h-3 text-white"/></button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filtered.length===0?(
                      <tr><td colSpan={columns.length+2} className="px-4 py-8 text-center" style={{color:"#475569"}}>No data</td></tr>
                    ):filtered.map((row,i)=>{
                      const isEditing=editingRow?.id===row.id;
                      return (
                        <tr key={row.id||i}
                          style={{background:isEditing?"#1a3a6b30":i%2===0?"#0f0f1a":"#131320",borderBottom:"1px solid #1e1e3a"}}
                          onDoubleClick={()=>{setEditingRow(row);setEditValues({...row});}}>
                          <td className="px-3 py-1.5" style={{color:"#475569",borderRight:"1px solid #1e1e3a"}}>{(page-1)*PAGE_SIZE+i+1}</td>
                          {columns.map(col=>(
                            <td key={col} className="px-1.5 py-1" style={{borderRight:"1px solid #1e1e3a",maxWidth:200}}>
                              {isEditing&&!autoSkip(col)?(
                                <input value={editValues[col]??""} onChange={e=>setEditValues((p:any)=>({...p,[col]:e.target.value}))}
                                  className="w-full px-2 py-0.5 rounded outline-none text-xs"
                                  style={{background:"#0f172a",color:"#bfdbfe",border:"1px solid #1d4ed8",minWidth:80}}/>
                              ):(
                                <span style={{color:row[col]===null?"#475569":col==="id"?"#60a5fa":"#94a3b8",fontStyle:row[col]===null?"italic":"normal",whiteSpace:"nowrap"}}>
                                  {row[col]===null?"NULL":String(row[col]).slice(0,60)+(String(row[col]).length>60?"…":"")}
                                </span>
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-1" style={{position:"sticky",right:0,background:isEditing?"#1a3a6b40":i%2===0?"#0f0f1a":"#131320"}}>
                            <div className="flex gap-1">
                              {isEditing?(
                                <>
                                  <button onClick={updateRow} className="p-1 rounded bg-blue-600 hover:bg-blue-500" title="Save"><Save className="w-3 h-3 text-white"/></button>
                                  <button onClick={()=>setEditingRow(null)} className="p-1 rounded bg-gray-700" title="Cancel"><X className="w-3 h-3 text-white"/></button>
                                </>
                              ):(
                                <>
                                  <button onClick={()=>{setEditingRow(row);setEditValues({...row});}} className="p-1 rounded bg-blue-900/60 hover:bg-blue-700" title="Edit"><Edit className="w-3 h-3 text-blue-300"/></button>
                                  <button onClick={()=>deleteRow(row.id)} className="p-1 rounded bg-red-900/60 hover:bg-red-700" title="Delete"><Trash2 className="w-3 h-3 text-red-300"/></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-t shrink-0" style={{background:"#1a1a2e",borderColor:"#2e2e4e",fontSize:10}}>
          <div className="flex gap-1">
            <button onClick={()=>{const p=Math.max(1,page-1);setPage(p);loadTable(selectedTable,p);}} disabled={page===1}
              className="px-2 py-0.5 rounded disabled:opacity-30" style={{background:"#2e2e4e",color:"#94a3b8"}}>‹</button>
            <span className="px-2 py-0.5 rounded" style={{background:"#2e2e4e",color:"#94a3b8"}}>Page {page}/{totalPages}</span>
            <button onClick={()=>{const p=page+1;setPage(p);loadTable(selectedTable,p);}} disabled={page>=totalPages}
              className="px-2 py-0.5 rounded disabled:opacity-30" style={{background:"#2e2e4e",color:"#94a3b8"}}>›</button>
          </div>
          <span style={{color:"#475569"}}>Rows {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,rowCount)} of {rowCount}</span>
          <span style={{color:"#334155"}}>· Double-click to edit · Delete icon to remove</span>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400"/>
            <span style={{color:"#22c55e"}}>Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDatabasePage() {
  return <RoleGuard allowed={["admin"]}><AdminDatabaseInner/></RoleGuard>;
}
