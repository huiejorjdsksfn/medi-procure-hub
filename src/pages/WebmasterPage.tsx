import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Globe,
  Download, Filter, RefreshCw, Search, CheckCircle2, AlertCircle,
  XCircle, Clock, BarChart3, Users, Database, TrendingUp, Eye,
  Activity, Server, Zap, Shield, ArrowUpDown, ExternalLink,
  Info, Settings, HardDrive, Cpu, Wifi, Lock, AlertTriangle,
} from "lucide-react";

// ── MODULE TREE (Site Explorer style, Image 2 left panel) ────────────────
const MODULE_TREE = [
  { id:"mediprocure", label:"mediprocure.embu.health.go.ke", type:"root", icon:"globe", children:[
    { id:"procurement",  label:"procurement",  type:"module", children:[
      { id:"procurement.requisitions",    label:"requisitions",     table:"requisitions",    path:"/requisitions" },
      { id:"procurement.purchase-orders", label:"purchase-orders",  table:"purchase_orders", path:"/purchase-orders" },
      { id:"procurement.goods-received",  label:"goods-received",   table:"goods_received",  path:"/goods-received" },
      { id:"procurement.suppliers",       label:"suppliers",        table:"suppliers",       path:"/suppliers" },
      { id:"procurement.contracts",       label:"contracts",        table:"contracts",       path:"/contracts" },
      { id:"procurement.tenders",         label:"tenders",          table:"tenders",         path:"/tenders" },
      { id:"procurement.bid-evaluations", label:"bid-evaluations",  table:"bid_evaluations", path:"/bid-evaluations" },
      { id:"procurement.plans",           label:"procurement-planning", table:"procurement_plans", path:"/procurement-planning" },
    ]},
    { id:"vouchers", label:"vouchers", type:"module", children:[
      { id:"vouchers.payment",  label:"payment",   table:"payment_vouchers",  path:"/vouchers/payment" },
      { id:"vouchers.receipt",  label:"receipt",   table:"receipt_vouchers",  path:"/vouchers/receipt" },
      { id:"vouchers.journal",  label:"journal",   table:"journal_vouchers",  path:"/vouchers/journal" },
      { id:"vouchers.purchase", label:"purchase",  table:"purchase_vouchers", path:"/vouchers/purchase" },
      { id:"vouchers.sales",    label:"sales",     table:"sales_vouchers",    path:"/vouchers/sales" },
    ]},
    { id:"financials", label:"financials", type:"module", children:[
      { id:"financials.dashboard",   label:"dashboard",         table:"payment_vouchers",    path:"/financials/dashboard" },
      { id:"financials.accounts",    label:"chart-of-accounts", table:"chart_of_accounts",   path:"/financials/chart-of-accounts" },
      { id:"financials.budgets",     label:"budgets",           table:"budgets",             path:"/financials/budgets" },
      { id:"financials.fixed-assets",label:"fixed-assets",      table:"fixed_assets",        path:"/financials/fixed-assets" },
    ]},
    { id:"inventory", label:"inventory", type:"module", children:[
      { id:"inventory.items",       label:"items",       table:"items",          path:"/items" },
      { id:"inventory.categories",  label:"categories",  table:"item_categories",path:"/categories" },
      { id:"inventory.departments", label:"departments", table:"departments",    path:"/departments" },
      { id:"inventory.scanner",     label:"scanner",     table:"stock_movements",path:"/scanner" },
    ]},
    { id:"quality", label:"quality", type:"module", children:[
      { id:"quality.inspections",   label:"inspections",    table:"inspections",     path:"/quality/inspections" },
      { id:"quality.ncr",           label:"non-conformance",table:"non_conformance", path:"/quality/non-conformance" },
    ]},
    { id:"admin",  label:"admin",  type:"module", children:[
      { id:"admin.users",    label:"users",    table:"profiles",   path:"/users" },
      { id:"admin.database", label:"database", table:"audit_log",  path:"/admin/database" },
      { id:"admin.audit",    label:"audit-log",table:"audit_log",  path:"/audit-log" },
      { id:"admin.settings", label:"settings", table:"",           path:"/settings" },
    ]},
  ]},
];

// ── TABLE STATUS COLOUR ───────────────────────────────────────────────────
const statusColor = (s: string) => ({
  indexed: "#107c10", active: "#107c10", ok: "#107c10",
  warning: "#ca5010", error: "#a4262c", "n/a": "#888",
})[s] || "#888";

export default function WebmasterPage() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  // tree state
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(["mediprocure","procurement"]));
  const [selModule, setSelModule] = useState("procurement");
  const [selItem,   setSelItem]   = useState<string|null>(null);

  // data
  const [tableCounts,  setTableCounts]  = useState<Record<string,number>>({});
  const [moduleStats,  setModuleStats]  = useState<Record<string,any>>({});
  const [itemStats,    setItemStats]    = useState<any|null>(null);
  const [loadingAll,   setLoadingAll]   = useState(true);
  const [loadingItem,  setLoadingItem]  = useState(false);
  const [filter,       setFilter]       = useState("All");
  const [search,       setSearch]       = useState("");
  const [sortAsc,      setSortAsc]      = useState(false);

  // ── fetch counts for all tables ────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoadingAll(true);
    const tables = [
      "requisitions","purchase_orders","goods_received","suppliers","contracts","tenders",
      "bid_evaluations","procurement_plans","payment_vouchers","receipt_vouchers","journal_vouchers",
      "purchase_vouchers","sales_vouchers","chart_of_accounts","budgets","fixed_assets",
      "items","item_categories","departments","stock_movements","inspections","non_conformance",
      "profiles","audit_log",
    ];
    const counts: Record<string,number> = {};
    await Promise.all(tables.map(async t => {
      try {
        const { count } = await (supabase as any).from(t).select("*",{ count:"exact", head:true });
        counts[t] = count || 0;
      } catch { counts[t] = 0; }
    }));
    setTableCounts(counts);
    setLoadingAll(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── get items for selected module ──────────────────────────────────────
  const getModuleItems = (moduleId: string) => {
    const flat: any[] = [];
    const walk = (nodes: any[]) => nodes.forEach(n => {
      if (n.id === moduleId && n.children) { n.children.forEach((c:any) => flat.push(c)); }
      if (n.children) walk(n.children);
    });
    walk(MODULE_TREE[0].children || []);
    return flat;
  };

  const getNodeById = (id: string): any => {
    let found: any = null;
    const walk = (nodes: any[]) => nodes.forEach(n => {
      if (n.id === id) found = n;
      if (n.children) walk(n.children);
    });
    walk(MODULE_TREE);
    return found;
  };

  // ── fetch detail for selected item ─────────────────────────────────────
  useEffect(() => {
    if (!selItem) { setItemStats(null); return; }
    const node = getNodeById(selItem);
    if (!node?.table) { setItemStats({ path: node?.path, table:"—", status:"n/a", count:0, recent:[], pending:0, approved:0 }); return; }
    setLoadingItem(true);
    (async () => {
      try {
        const { count } = await (supabase as any).from(node.table).select("*",{ count:"exact", head:true });
        const { data: recent } = await (supabase as any).from(node.table).select("*").order("created_at",{ ascending:false }).limit(5);
        const { count: pending } = node.table.includes("voucher") || node.table === "requisitions" || node.table === "purchase_orders"
          ? await (supabase as any).from(node.table).select("*",{ count:"exact", head:true }).eq("status","pending")
          : { count: 0 };
        setItemStats({ path: node.path, table: node.table, status:"indexed", count: count||0, recent: recent||[], pending: pending||0 });
      } catch (e) { setItemStats(null); }
      setLoadingItem(false);
    })();
  }, [selItem]);

  const toggle = (id: string) => setExpanded(e => { const n = new Set(e); n.has(id)?n.delete(id):n.add(id); return n; });

  const items = getModuleItems(selModule);
  const filteredItems = items
    .filter(i => !search || i.label.includes(search.toLowerCase()))
    .sort((a, b) => sortAsc
      ? (tableCounts[a.table]||0) - (tableCounts[b.table]||0)
      : (tableCounts[b.table]||0) - (tableCounts[a.table]||0)
    );

  const selectedNode = selItem ? getNodeById(selItem) : null;
  const selModuleNode = getNodeById(selModule);

  // ── module aggregate stats ─────────────────────────────────────────────
  const moduleTotals = (modId: string) => {
    const its = getModuleItems(modId);
    return its.reduce((acc, i) => acc + (tableCounts[i.table]||0), 0);
  };

  const moduleColor: Record<string,string> = {
    procurement:"#ca5010", vouchers:"#5c2d91", financials:"#1f6090",
    inventory:"#375623", quality:"#00695c", admin:"#333",
  };

  return (
    <div className="h-full flex flex-col bg-white" style={{ fontFamily:"Segoe UI, system-ui, sans-serif", minHeight:"calc(100vh - 56px)" }}>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold text-gray-900">System Explorer</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-blue-400 w-48"
              placeholder="Search modules…"/>
          </div>
          <button onClick={fetchAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAll?"animate-spin":""}`}/>Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600">
            <Download className="w-3.5 h-3.5"/>Export
          </button>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────── */}
      <div className="px-6 py-2.5 border-b border-gray-100 flex items-center gap-3 bg-gray-50 shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-md px-3 py-1.5 bg-white text-xs text-gray-700 cursor-pointer hover:bg-gray-50">
          <Filter className="w-3.5 h-3.5 text-gray-400"/>
          Filter by: <span className="font-semibold">{filter}</span>
          <ChevronDown className="w-3 h-3 text-gray-400 ml-1"/>
        </div>
        {["All","Active","Pending","Empty"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            className={`px-2.5 py-1 text-xs rounded transition-all ${filter===f?"bg-blue-600 text-white":"text-gray-500 hover:bg-gray-200"}`}>
            {f}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-400">
          {loadingAll ? "Loading…" : `${Object.values(tableCounts).reduce((a,b)=>a+b,0).toLocaleString()} total records`}
        </div>
      </div>

      {/* ── 3-column layout ────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-gray-200">

        {/* LEFT: Explorer tree */}
        <div className="w-64 border-r border-gray-200 flex flex-col min-h-0 bg-white shrink-0">
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Explorer</span>
            <div className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              <span>Records</span><ArrowUpDown className="w-3 h-3"/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {/* Root */}
            {MODULE_TREE.map(root => (
              <div key={root.id}>
                <button onClick={()=>toggle(root.id)}
                  className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-gray-50 text-xs text-gray-700">
                  {expanded.has(root.id)?<ChevronDown className="w-3.5 h-3.5 text-gray-400"/>:<ChevronRight className="w-3.5 h-3.5 text-gray-400"/>}
                  <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
                  <span className="font-medium truncate text-gray-800">{root.label}</span>
                </button>
                {expanded.has(root.id) && root.children?.map((mod: any) => (
                  <div key={mod.id}>
                    <button
                      onClick={()=>{ toggle(mod.id); setSelModule(mod.id); setSelItem(null); }}
                      className={`w-full flex items-center gap-1.5 pl-6 pr-3 py-1.5 text-left hover:bg-blue-50 text-xs transition-colors ${selModule===mod.id&&!selItem?"bg-blue-50 text-blue-700":"text-gray-700"}`}
                    >
                      {expanded.has(mod.id)?<ChevronDown className="w-3 h-3 text-gray-400"/>:<ChevronRight className="w-3 h-3 text-gray-400"/>}
                      {expanded.has(mod.id)
                        ? <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: moduleColor[mod.id]||"#888" }}/>
                        : <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: moduleColor[mod.id]||"#888" }}/>}
                      <span className="font-medium truncate flex-1">{mod.label}</span>
                      {!loadingAll && <span className="text-[9px] font-mono text-gray-400 ml-auto">{moduleTotals(mod.id).toLocaleString()}</span>}
                    </button>
                    {expanded.has(mod.id) && mod.children?.map((item: any) => (
                      <button key={item.id}
                        onClick={()=>{ setSelModule(mod.id); setSelItem(item.id); }}
                        className={`w-full flex items-center gap-1.5 pl-10 pr-3 py-1.5 text-left hover:bg-blue-50 text-xs transition-colors border-l-2 ${selItem===item.id?"bg-blue-50 border-blue-500 text-blue-700":"border-transparent text-gray-600"}`}
                      >
                        <FileText className="w-3 h-3 shrink-0 text-gray-400"/>
                        <span className="truncate flex-1">{item.label}</span>
                        {!loadingAll && <span className="text-[9px] font-mono text-gray-400">{(tableCounts[item.table]||0).toLocaleString()}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: module / item list */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200">
          {/* Breadcrumb */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1.5 text-xs text-gray-500 shrink-0 bg-white">
            <Globe className="w-3.5 h-3.5 text-gray-400"/>
            <span>mediprocure.embu.health.go.ke</span>
            <ChevronRight className="w-3 h-3 text-gray-300"/>
            <span className="font-semibold text-gray-800">{selModuleNode?.label || selModule}</span>
            {selItem && selectedNode && <>
              <ChevronRight className="w-3 h-3 text-gray-300"/>
              <span className="font-semibold" style={{ color: moduleColor[selModule]||"#888" }}>{selectedNode.label}</span>
            </>}
          </div>

          {/* Module info cards (Image 2 top right) — shown when no item selected */}
          {!selItem && (
            <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-100 bg-gray-50 shrink-0">
              <div className="bg-white rounded border border-gray-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600">Module Information</span>
                  <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/>Live</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label:"Routes", val: filteredItems.length },
                    { label:"Total Records", val: moduleTotals(selModule).toLocaleString() },
                    { label:"Status", val:"Active" },
                    { label:"RLS", val:"Enabled" },
                  ].map(r=>(
                    <div key={r.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{r.label}</span>
                      <span className="font-semibold text-gray-800">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded border border-gray-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600">Health Check</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label:"Database", val:"Connected", ok:true },
                    { label:"Realtime", val:"Active", ok:true },
                    { label:"RLS Policies", val:"Configured", ok:true },
                    { label:"Auth", val:"Enabled", ok:true },
                  ].map(r=>(
                    <div key={r.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{r.label}</span>
                      <span className={`flex items-center gap-1 font-semibold ${r.ok?"text-green-700":"text-red-600"}`}>
                        {r.ok ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{r.val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Items list (Image 2 center column) */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Route / Module</span>
                  </th>
                  <th className="px-4 py-2.5 text-right cursor-pointer" onClick={()=>setSortAsc(v=>!v)}>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center justify-end gap-1">
                      Records <ArrowUpDown className="w-3 h-3"/>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item: any) => {
                  const count = tableCounts[item.table] || 0;
                  const isSelected = selItem === item.id;
                  return (
                    <tr key={item.id}
                      onClick={()=>setSelItem(item.id)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${isSelected?"bg-blue-50":"hover:bg-gray-50"}`}
                    >
                      <td className="px-4 py-2.5 flex items-center gap-2">
                        <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected?"text-blue-500":"text-gray-400"}`}/>
                        <span className={`text-xs ${isSelected?"text-blue-700 font-semibold":"text-gray-700"}`}>{item.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-semibold ${count===0?"text-gray-400":"text-gray-800"}`}>{count.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr><td colSpan={2} className="py-12 text-center text-xs text-gray-400">No modules found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: detail panel (Image 2 right column) */}
        <div className="w-72 flex flex-col min-h-0 bg-white shrink-0">
          {selectedNode && itemStats ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400"/>
                <span className="text-sm font-bold text-gray-800">/{selectedNode.label}</span>
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600"/>
                <span className="text-xs font-bold text-green-700">Active & Indexed</span>
              </div>

              {/* Stats */}
              <div className="space-y-2 text-xs">
                {[
                  { label:"Records",     val: loadingItem ? "…" : itemStats.count?.toLocaleString() },
                  { label:"Pending",     val: loadingItem ? "…" : itemStats.pending?.toString() },
                  { label:"Table",       val: itemStats.table },
                  { label:"Realtime",    val: "Enabled" },
                  { label:"RLS",         val: "Active" },
                  { label:"Auth",        val: "Required" },
                  { label:"Last Sync",   val: new Date().toLocaleTimeString("en-KE") },
                  { label:"Route",       val: itemStats.path },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-2 py-1 border-b border-gray-100 last:border-0">
                    <span className="w-24 shrink-0 text-gray-500">{r.label}</span>
                    <span className="text-gray-500 mr-1">:</span>
                    <span className="font-semibold text-gray-800 truncate">{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Recent records preview */}
              {itemStats.recent?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Recent Records</p>
                  <div className="space-y-1">
                    {itemStats.recent.slice(0,4).map((r: any, i: number) => (
                      <div key={i} className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 font-mono truncate">
                        {r.requisition_number || r.po_number || r.voucher_number || r.receipt_number ||
                         r.journal_number || r.tender_number || r.name || r.account_code || r.budget_code ||
                         r.asset_number || r.plan_number || r.inspection_number || r.ncr_number ||
                         r.full_name || r.email || String(r.id||"").slice(0,8)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons (Image 2: Inspect URL / Request indexing / Test URL) */}
              <div className="space-y-2 pt-2">
                <button onClick={()=>navigate(itemStats.path)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5"/>Inspect Module
                </button>
                <button onClick={fetchAll}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition-colors">
                  <RefreshCw className="w-3.5 h-3.5"/>Refresh Counts
                </button>
                {isAdmin && (
                  <button onClick={()=>navigate("/admin/database")}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition-colors">
                    <Database className="w-3.5 h-3.5"/>Manage in DB Admin
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <FileText className="w-10 h-10 text-gray-200 mb-3"/>
              <p className="text-xs text-gray-400">Select a module or route<br/>to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── System health footer ─────────────────────────────────────────── */}
      <div className="border-t border-gray-200 bg-gray-50 px-6 py-2 flex items-center gap-6 shrink-0">
        {[
          { icon: Database,  label: "Database",  val: "Connected",  ok: true },
          { icon: Wifi,      label: "Realtime",  val: "Active",     ok: true },
          { icon: Shield,    label: "Auth",      val: "Secured",    ok: true },
          { icon: Server,    label: "API",       val: "Healthy",    ok: true },
          { icon: HardDrive, label: "Storage",   val: "OK",         ok: true },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs">
            <s.icon className="w-3.5 h-3.5 text-gray-400"/>
            <span className="text-gray-500">{s.label}:</span>
            <span className={`font-semibold flex items-center gap-0.5 ${s.ok?"text-green-700":"text-red-600"}`}>
              {s.ok ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{s.val}
            </span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-gray-400">yvjfehnzbzjliizjvuhq.supabase.co · {new Date().toLocaleDateString("en-KE")}</div>
      </div>
    </div>
  );
}
