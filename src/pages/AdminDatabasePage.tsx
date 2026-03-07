import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Search, X, Plus, Edit, Trash2, ChevronRight, ChevronDown, Database, Filter, Download, Upload, Save, Eye, Play, AlertTriangle, CheckCircle, TableIcon, Code, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";

const TABLES = [
  { name:"profiles", label:"Profiles / Users", editable:["full_name","department","is_active","phone_number","email"], icon:"👤" },
  { name:"user_roles", label:"User Roles", editable:["role"], icon:"🔑" },
  { name:"items", label:"Items", editable:["name","description","unit_price","quantity_in_stock","reorder_level","status","item_type"], icon:"📦" },
  { name:"item_categories", label:"Item Categories", editable:["name","description"], icon:"🗂" },
  { name:"suppliers", label:"Suppliers", editable:["name","contact_person","email","phone","address","status","category","rating"], icon:"🚛" },
  { name:"departments", label:"Departments", editable:["name","code","head_name"], icon:"🏢" },
  { name:"requisitions", label:"Requisitions", editable:["status","notes","rejection_reason"], icon:"📋" },
  { name:"purchase_orders", label:"Purchase Orders", editable:["status","notes","rejection_reason"], icon:"🛒" },
  { name:"goods_received", label:"Goods Received", editable:["inspection_status","notes"], icon:"📥" },
  { name:"payment_vouchers", label:"Payment Vouchers", editable:["status","description","rejection_reason"], icon:"💳" },
  { name:"receipt_vouchers", label:"Receipt Vouchers", editable:["status","description"], icon:"🧾" },
  { name:"journal_vouchers", label:"Journal Vouchers", editable:["status","narration"], icon:"📒" },
  { name:"purchase_vouchers", label:"Purchase Vouchers", editable:["status","description"], icon:"🧾" },
  { name:"contracts", label:"Contracts", editable:["status","payment_terms","performance_score"], icon:"📄" },
  { name:"tenders", label:"Tenders", editable:["status"], icon:"⚖️" },
  { name:"bid_evaluations", label:"Bid Evaluations", editable:["status","recommendation"], icon:"🎯" },
  { name:"inspections", label:"Inspections", editable:["result","notes"], icon:"🔬" },
  { name:"non_conformance", label:"Non-Conformance", editable:["status","corrective_action","preventive_action"], icon:"⚠️" },
  { name:"budgets", label:"Budgets", editable:["status","allocated_amount"], icon:"💰" },
  { name:"fixed_assets", label:"Fixed Assets", editable:["status","location"], icon:"🏗" },
  { name:"chart_of_accounts", label:"Chart of Accounts", editable:["account_name","balance","is_active"], icon:"📊" },
  { name:"bank_accounts", label:"Bank Accounts", editable:["account_name","balance","status"], icon:"🏦" },
  { name:"procurement_plans", label:"Procurement Plans", editable:["status","notes"], icon:"📅" },
  { name:"stock_movements", label:"Stock Movements", editable:["notes"], icon:"🔄" },
  { name:"gl_entries", label:"GL Entries", editable:["description"], icon:"📉" },
  { name:"system_settings", label:"System Settings", editable:["value","value_json"], icon:"⚙️" },
  { name:"documents", label:"Documents", editable:["name","category","is_locked"], icon:"📁" },
  { name:"notifications", label:"Notifications", editable:["subject","body"], icon:"🔔" },
  { name:"inbox_items", label:"Inbox Items", editable:["status","reply_body"], icon:"📧" },
  { name:"backup_jobs", label:"Backup Jobs", editable:["status"], icon:"💾" },
  { name:"odbc_connections", label:"ODBC Connections", editable:["name","status","description"], icon:"🔌" },
  { name:"audit_log", label:"Audit Log", editable:[], icon:"📝" },
];

const GROUPS = [
  { label:"Users & Auth", items:["profiles","user_roles"] },
  { label:"Inventory", items:["items","item_categories","departments","stock_movements"] },
  { label:"Procurement", items:["requisitions","purchase_orders","goods_received","suppliers","contracts","tenders","bid_evaluations","procurement_plans"] },
  { label:"Finance", items:["payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers","budgets","chart_of_accounts","bank_accounts","gl_entries"] },
  { label:"Quality", items:["inspections","non_conformance"] },
  { label:"Fixed Assets", items:["fixed_assets"] },
  { label:"System", items:["system_settings","documents","notifications","inbox_items","backup_jobs","odbc_connections","audit_log"] },
];

const colLabel = (c: string) => c.replace(/_/g," ").replace(/\b\w/g,x=>x.toUpperCase());
const fmtCell = (v: any) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "object") { const s=JSON.stringify(v); return s.length>70?s.slice(0,70)+"…":s; }
  const s = String(v);
  return s.length > 90 ? s.slice(0,90)+"…" : s;
};

function AdminDatabaseInner() {
  const { user } = useAuth();
  const [activeTable, setActiveTable] = useState(TABLES[0]);
  const [rows, setRows] = useState<any[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editRow, setEditRow] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [sqlMode, setSqlMode] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<any[]>([]);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [rowCounts, setRowCounts] = useState<Record<string,number>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string,boolean>>({});
  const [viewMode, setViewMode] = useState<"table"|"sql">("table");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const loadTable = useCallback(async (tbl = activeTable) => {
    setLoading(true); setCols([]); setPage(1); setSelectedRows(new Set());
    try {
      const { data, error } = await (supabase as any).from(tbl.name).select("*").order("created_at",{ascending:false}).limit(500);
      if (error) throw error;
      if (data && data.length > 0) setCols(Object.keys(data[0]));
      setRows(data || []);
    } catch(e:any) { toast({ title:"Error", description:e.message, variant:"destructive" }); setRows([]); }
    setLoading(false);
  },[activeTable]);

  useEffect(()=>{ loadTable(activeTable); },[activeTable]);

  useEffect(()=>{
    const fetchCounts = async () => {
      const counts: Record<string,number> = {};
      await Promise.all(TABLES.map(async t => {
        try {
          const { count } = await (supabase as any).from(t.name).select("id",{count:"exact",head:true});
          counts[t.name] = count || 0;
        } catch { counts[t.name] = 0; }
      }));
      setRowCounts(counts);
    };
    fetchCounts();
  },[]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return cols.some(c => String(r[c]||"").toLowerCase().includes(s));
  });

  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const startEdit = (row: any) => {
    setEditRow(row);
    const d: any = {};
    activeTable.editable.forEach(k => { d[k] = row[k]; });
    setEditData(d);
  };

  const saveEdit = async () => {
    if (!editRow) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from(activeTable.name).update(editData).eq("id", editRow.id);
      if (error) throw error;
      toast({ title:"Saved", description:`Row updated in ${activeTable.label}` });
      setEditRow(null);
      loadTable();
    } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
    setSaving(false);
  };

  const deleteRow = async (row: any) => {
    if (!confirm(`Delete this record from ${activeTable.label}? This cannot be undone.`)) return;
    try {
      const { error } = await (supabase as any).from(activeTable.name).delete().eq("id", row.id);
      if (error) throw error;
      toast({ title:"Deleted", description:"Record removed" });
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
  };

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filtered);
    XLSX.utils.book_append_sheet(wb, ws, activeTable.label.slice(0,31));
    XLSX.writeFile(wb, `${activeTable.name}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({ title:"Exported", description:`${activeTable.label} exported to Excel` });
  };

  const runSql = async () => {
    if (!sqlQuery.trim()) return;
    setSqlRunning(true); setSqlResult([]);
    toast({ title:"SQL Mode", description:"Direct SQL execution is handled by Supabase RPC. Use the table editor for data changes.", variant:"destructive" });
    setSqlRunning(false);
  };

  const filteredTables = TABLES.filter(t=>t.label.toLowerCase().includes(tableSearch.toLowerCase())||t.name.toLowerCase().includes(tableSearch.toLowerCase()));

  const toggleGroup = (g: string) => setCollapsedGroups(p=>({...p,[g]:!p[g]}));

  return (
    <div className="flex h-[calc(100vh-120px)]" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* LEFT SIDEBAR (DBHawk style) */}
      <div className="flex flex-col w-56 shrink-0 border-r border-gray-200" style={{background:"#1e2433"}}>
        {/* Connection header */}
        <div className="p-3 border-b border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[10px] text-green-400 font-semibold">Connected</span>
          </div>
          <div className="text-[10px] text-white/50 truncate">yvjfehnzbzjliizjvuhq.supabase.co</div>
          <div className="text-[9px] text-white/30 mt-0.5">PostgreSQL 17 · elimu</div>
        </div>
        {/* Search */}
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/40" />
            <input value={tableSearch} onChange={e=>setTableSearch(e.target.value)}
              placeholder="Search tables…"
              className="w-full pl-6 pr-2 py-1.5 rounded text-[11px] outline-none"
              style={{background:"rgba(255,255,255,0.08)",color:"#fff",border:"1px solid rgba(255,255,255,0.1)"}} />
          </div>
        </div>
        {/* DB Objects tree */}
        <div className="flex-1 overflow-y-auto py-1">
          {tableSearch ? (
            <div>
              <div className="px-3 py-1.5 text-[9px] font-bold text-white/30 uppercase tracking-wider">Tables</div>
              {filteredTables.map(t=>(
                <button key={t.name} onClick={()=>setActiveTable(t)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] transition-all text-left"
                  style={{background:activeTable.name===t.name?"rgba(255,255,255,0.15)":"transparent",color:activeTable.name===t.name?"#fff":"rgba(255,255,255,0.6)"}}>
                  <span className="text-[10px]">{t.icon}</span>
                  <span className="flex-1 truncate">{t.label}</span>
                  {rowCounts[t.name]!==undefined && <span className="text-[9px] text-white/30">{rowCounts[t.name]}</span>}
                </button>
              ))}
            </div>
          ) : (
            GROUPS.map(g=>(
              <div key={g.label}>
                <button onClick={()=>toggleGroup(g.label)}
                  className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider hover:text-white/60 transition-colors">
                  {collapsedGroups[g.label] ? <ChevronRight className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
                  {g.label}
                </button>
                {!collapsedGroups[g.label] && g.items.map(name=>{
                  const t = TABLES.find(x=>x.name===name);
                  if(!t) return null;
                  return (
                    <button key={name} onClick={()=>setActiveTable(t)}
                      className="flex items-center gap-2 w-full pl-7 pr-3 py-1.5 text-[11px] transition-all text-left"
                      style={{background:activeTable.name===name?"rgba(255,255,255,0.15)":"transparent",color:activeTable.name===name?"#fff":"rgba(255,255,255,0.55)"}}>
                      <span className="text-[10px]">{t.icon}</span>
                      <span className="flex-1 truncate">{t.label}</span>
                      {rowCounts[t.name]!==undefined && <span className="text-[9px] text-white/25">{rowCounts[t.name]}</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0" style={{background:"#f8fafc"}}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200" style={{background:"#fff"}}>
          <div className="flex items-center gap-1.5 mr-2">
            <span className="text-base">{activeTable.icon}</span>
            <div>
              <div className="text-sm font-black text-gray-800">{activeTable.label}</div>
              <div className="text-[9px] text-gray-400">{rowCounts[activeTable.name]||0} rows · {activeTable.editable.length>0?"Editable":"Read-only"}</div>
            </div>
          </div>
          {/* View mode tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button onClick={()=>setViewMode("table")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold"
              style={{background:viewMode==="table"?"#1a3a6b":"#fff",color:viewMode==="table"?"#fff":"#374151"}}>
              <TableIcon className="w-3 h-3"/> Data
            </button>
            <button onClick={()=>setViewMode("sql")}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold"
              style={{background:viewMode==="sql"?"#1a3a6b":"#fff",color:viewMode==="sql"?"#fff":"#374151"}}>
              <Code className="w-3 h-3"/> SQL
            </button>
          </div>
          <button onClick={()=>loadTable()} disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
            <RefreshCw className={`w-3 h-3 ${loading?"animate-spin":""}`} /> Refresh
          </button>
          <button onClick={exportXLSX}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-all">
            <Download className="w-3 h-3" /> Export
          </button>
          <div className="flex-1" />
          {/* Search */}
          <div className="relative w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter rows…"
              className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
            {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
          </div>
          <span className="text-[10px] text-gray-400">{filtered.length} / {rows.length}</span>
        </div>

        {viewMode==="sql" ? (
          <div className="flex flex-col p-4 gap-3 flex-1">
            <div className="rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="px-3 py-2 bg-gray-800 text-white text-[10px] font-bold flex items-center gap-2">
                <Code className="w-3 h-3" /> SQL Query Editor
                <span className="ml-2 text-yellow-400 text-[9px]">⚠ Read queries only — use table editor for changes</span>
              </div>
              <textarea value={sqlQuery} onChange={e=>setSqlQuery(e.target.value)}
                placeholder={`-- Query the ${activeTable.name} table\nSELECT * FROM ${activeTable.name} LIMIT 50;`}
                className="flex-1 p-3 font-mono text-xs outline-none resize-none min-h-[120px]"
                style={{background:"#1e2433",color:"#e2e8f0"}}
              />
              <div className="flex items-center gap-2 p-2 bg-gray-100 border-t border-gray-200">
                <button onClick={runSql} disabled={sqlRunning}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">
                  <Play className="w-3 h-3" /> Run Query
                </button>
                <button onClick={()=>setSqlQuery("")} className="text-xs text-gray-500 hover:text-gray-700">Clear</button>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <strong>Note:</strong> Direct SQL execution requires Supabase service key. Use the table data view to view and edit records safely.
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-400" />
              </div>
            ) : paged.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Database className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm">No records found</p>
              </div>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead style={{position:"sticky",top:0,zIndex:10}}>
                  <tr style={{background:"#1e2433"}}>
                    <th className="text-left px-3 py-2 text-white/50 font-medium w-8 text-[9px]">#</th>
                    <th className="text-left px-3 py-2 text-white/50 font-medium w-20 text-[9px]">ACTIONS</th>
                    {cols.map(c=>(
                      <th key={c} className="text-left px-3 py-2 text-white/80 font-semibold text-[10px] whitespace-nowrap uppercase tracking-wider">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row,i)=>(
                    <tr key={row.id||i} className="border-b border-gray-100 hover:bg-blue-50/40 transition-colors group">
                      <td className="px-3 py-1.5 text-gray-400 font-medium text-[10px]">{(page-1)*PAGE_SIZE+i+1}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {activeTable.editable.length>0 && (
                            <button onClick={()=>startEdit(row)}
                              className="p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors" title="Edit">
                              <Edit className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={()=>deleteRow(row)}
                            className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors" title="Delete">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      {cols.map(c=>(
                        <td key={c} className="px-3 py-1.5 text-gray-700 max-w-[180px]">
                          <span className="block truncate" title={String(row[c]||"")}>{fmtCell(row[c])}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination */}
        {viewMode==="table" && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white text-xs">
            <span className="text-gray-500">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="px-2 py-1 rounded border text-gray-600 disabled:opacity-40 hover:bg-gray-50">‹ Prev</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                const pg = page<=3?i+1:page+i-2;
                if(pg<1||pg>totalPages) return null;
                return <button key={pg} onClick={()=>setPage(pg)}
                  className="px-2.5 py-1 rounded border transition-all"
                  style={{background:page===pg?"#1a3a6b":"#fff",color:page===pg?"#fff":"#374151"}}>{pg}</button>;
              })}
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-2 py-1 rounded border text-gray-600 disabled:opacity-40 hover:bg-gray-50">Next ›</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={()=>setEditRow(null)} />
          <div className="relative rounded-2xl overflow-hidden w-full max-w-lg" style={{background:"#fff",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between" style={{background:"#1a3a6b"}}>
              <div>
                <div className="text-sm font-black text-white">Edit Record</div>
                <div className="text-[10px] text-white/60">{activeTable.label}</div>
              </div>
              <button onClick={()=>setEditRow(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* ID preview */}
              <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2 font-mono truncate">ID: {editRow.id}</div>
              {activeTable.editable.map(k=>(
                <div key={k}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{colLabel(k)}</label>
                  {typeof editData[k]==="boolean" ? (
                    <select value={String(editData[k])} onChange={e=>setEditData((p:any)=>({...p,[k]:e.target.value==="true"}))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400">
                      <option value="true">Yes / Active</option>
                      <option value="false">No / Inactive</option>
                    </select>
                  ) : (
                    <textarea value={editData[k]||""} onChange={e=>setEditData((p:any)=>({...p,[k]:e.target.value}))}
                      rows={String(editData[k]||"").length>80?3:1}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={()=>setEditRow(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all"
                style={{background:"#1a3a6b",opacity:saving?0.7:1}}>
                <Save className="w-3.5 h-3.5" />
                {saving?"Saving…":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDatabasePage() {
  return <RoleGuard allowed={["admin"]}><AdminDatabaseInner /></RoleGuard>;
}
