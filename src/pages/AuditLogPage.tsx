import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Activity, Search, X, RefreshCw, Download, Filter, FileSpreadsheet, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";

const ACTION_STYLE: Record<string,{bg:string;color:string}> = {
  create:   {bg:"#dcfce7",color:"#15803d"},
  update:   {bg:"#dbeafe",color:"#1d4ed8"},
  delete:   {bg:"#fee2e2",color:"#dc2626"},
  approve:  {bg:"#d1fae5",color:"#065f46"},
  reject:   {bg:"#fef2f2",color:"#b91c1c"},
  login:    {bg:"#e0f2fe",color:"#0369a1"},
  logout:   {bg:"#f3f4f6",color:"#6b7280"},
  export:   {bg:"#fef3c7",color:"#92400e"},
  import:   {bg:"#fef3c7",color:"#92400e"},
  default:  {bg:"#f3f4f6",color:"#6b7280"},
};

export default function AuditLogPage() {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [dateFrom, setDateFrom] = useState(new Date(new Date().setDate(new Date().getDate()-30)).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10));
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any).from("audit_log").select("*")
        .gte("created_at", dateFrom).lte("created_at", dateTo+"T23:59:59")
        .order("created_at", { ascending: false }).limit(1000);
      const { data } = await q;
      setLogs(data || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => { if (hasRole("admin")) fetchLogs(); }, [fetchLogs]);

  if (!hasRole("admin")) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-400">Admin access required</p>
    </div>
  );

  const modules = [...new Set(logs.map(l => l.module).filter(Boolean))];
  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))];

  const filtered = logs.filter(l => {
    const matchSearch = !search || (l.user_name||"").toLowerCase().includes(search.toLowerCase()) || (l.record_id||"").toLowerCase().includes(search.toLowerCase()) || (l.module||"").toLowerCase().includes(search.toLowerCase());
    const matchModule = filterModule === "all" || l.module === filterModule;
    const matchAction = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchModule && matchAction;
  });

  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = filtered.map(l => ({
      "Date/Time": l.created_at ? new Date(l.created_at).toLocaleString("en-KE") : "",
      "User": l.user_name || "",
      "Action": l.action || "",
      "Module": l.module || "",
      "Record ID": l.record_id || "",
      "IP Address": l.ip_address || "",
      "Details": l.details ? JSON.stringify(l.details) : "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{wch:22},{wch:20},{wch:12},{wch:15},{wch:14},{wch:15},{wch:40}];
    XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
    XLSX.writeFile(wb, `Audit_Trail_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported", description:`${filtered.length} audit records exported`});
  };

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="flex items-center justify-between rounded-2xl px-5 py-3"
        style={{background:"linear-gradient(90deg,#374151,#4b5563)",boxShadow:"0 4px 16px rgba(55,65,81,0.3)"}}>
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-white" />
          <div>
            <h1 className="text-base font-black text-white">Audit Trail</h1>
            <p className="text-[10px] text-white/50">{filtered.length.toLocaleString()} records matching filters</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLogs} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-semibold hover:bg-white/25">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} /> Refresh
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase">From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          <label className="text-[10px] font-bold text-gray-500 uppercase">To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
        </div>
        <select value={filterModule} onChange={e=>{setFilterModule(e.target.value);setPage(1);}}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none">
          <option value="all">All Modules</option>
          {modules.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filterAction} onChange={e=>{setFilterAction(e.target.value);setPage(1);}}
          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs outline-none">
          <option value="all">All Actions</option>
          {actions.map(a=><option key={a} value={a}>{a}</option>)}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search user, module, record…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center"><RefreshCw className="w-7 h-7 animate-spin mx-auto text-gray-300 mb-2"/><p className="text-xs text-gray-400">Loading audit trail…</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{background:"#374151"}}>
                  {["#","Date & Time","User","Action","Module","Record ID","IP Address","Details"].map(h=>(
                    <th key={h} className="text-left px-3 py-2.5 text-white/80 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">No audit records found</td></tr>
                ) : paged.map((l,i)=>{
                  const style = ACTION_STYLE[l.action] || ACTION_STYLE.default;
                  return (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-gray-400">{(page-1)*PAGE_SIZE+i+1}</td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                        {l.created_at ? new Date(l.created_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">{l.user_name||"System"}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
                          style={{background:style.bg,color:style.color}}>{l.action||"—"}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 capitalize">{l.module||"—"}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{l.record_id?l.record_id.slice(0,10)+"…":"—"}</td>
                      <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{l.ip_address||"—"}</td>
                      <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate">
                        {l.details ? JSON.stringify(l.details).slice(0,60)+(JSON.stringify(l.details).length>60?"…":"") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs">
            <span className="text-gray-400">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                className="px-2.5 py-1 rounded border text-gray-600 disabled:opacity-40 hover:bg-white">‹</button>
              <span className="px-2.5 py-1 rounded border bg-white font-medium text-gray-700">{page}/{totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                className="px-2.5 py-1 rounded border text-gray-600 disabled:opacity-40 hover:bg-white">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
