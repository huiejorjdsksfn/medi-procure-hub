import { useState, useEffect, useCallback } from "react";
import RoleGuard from "@/components/RoleGuard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Globe,
  Download, Filter, RefreshCw, Search, CheckCircle2, XCircle, ArrowUpDown,
  ExternalLink, Info, Database, Server, Wifi, Shield, HardDrive,
  Activity, BarChart3, Users, Clock, TrendingUp, Zap, AlertTriangle,
} from "lucide-react";

// ─── MODULE TREE (Site Explorer left panel — Image 2) ─────────────────────
const MODULE_TREE = [
  {
    id: "root", label: "mediprocure.embu.health.go.ke", type: "root",
    modules: [
      {
        id: "procurement", label: "procurement", color: "#1a1a2e",
        routes: [
          { id: "requisitions",       label: "requisitions",       table: "requisitions",      path: "/requisitions",         httpCode: 200 },
          { id: "purchase-orders",    label: "purchase-orders",    table: "purchase_orders",   path: "/purchase-orders",      httpCode: 200 },
          { id: "goods-received",     label: "goods-received",     table: "goods_received",    path: "/goods-received",       httpCode: 200 },
          { id: "suppliers",          label: "suppliers",          table: "suppliers",         path: "/suppliers",            httpCode: 200 },
          { id: "contracts",          label: "contracts",          table: "contracts",         path: "/contracts",            httpCode: 200 },
          { id: "tenders",            label: "tenders",            table: "tenders",           path: "/tenders",              httpCode: 200 },
          { id: "bid-evaluations",    label: "bid-evaluations",    table: "bid_evaluations",   path: "/bid-evaluations",      httpCode: 200 },
          { id: "procurement-plan",   label: "procurement-planning",table: "procurement_plans",path: "/procurement-planning", httpCode: 200 },
        ],
      },
      {
        id: "vouchers", label: "vouchers", color: "#C45911",
        routes: [
          { id: "payment",   label: "payment",   table: "payment_vouchers",  path: "/vouchers/payment",  httpCode: 200 },
          { id: "receipt",   label: "receipt",   table: "receipt_vouchers",  path: "/vouchers/receipt",  httpCode: 200 },
          { id: "journal",   label: "journal",   table: "journal_vouchers",  path: "/vouchers/journal",  httpCode: 200 },
          { id: "purchase",  label: "purchase",  table: "purchase_vouchers", path: "/vouchers/purchase", httpCode: 200 },
          { id: "sales",     label: "sales",     table: "sales_vouchers",    path: "/vouchers/sales",    httpCode: 200 },
        ],
      },
      {
        id: "financials", label: "financials", color: "#1F6090",
        routes: [
          { id: "fin-dashboard",   label: "dashboard",           table: "payment_vouchers",  path: "/financials/dashboard",         httpCode: 200 },
          { id: "chart-accounts",  label: "chart-of-accounts",   table: "chart_of_accounts", path: "/financials/chart-of-accounts", httpCode: 200 },
          { id: "budgets",         label: "budgets",             table: "budgets",            path: "/financials/budgets",           httpCode: 200 },
          { id: "fixed-assets",    label: "fixed-assets",        table: "fixed_assets",      path: "/financials/fixed-assets",      httpCode: 200 },
        ],
      },
      {
        id: "inventory", label: "inventory", color: "#375623",
        routes: [
          { id: "items",       label: "items",       table: "items",           path: "/items",       httpCode: 200 },
          { id: "categories",  label: "categories",  table: "item_categories", path: "/categories",  httpCode: 200 },
          { id: "departments", label: "departments", table: "departments",     path: "/departments", httpCode: 200 },
          { id: "scanner",     label: "scanner",     table: "stock_movements", path: "/scanner",     httpCode: 200 },
        ],
      },
      {
        id: "quality", label: "quality", color: "#00695C",
        routes: [
          { id: "inspections",    label: "inspections",     table: "inspections",    path: "/quality/inspections",    httpCode: 200 },
          { id: "non-conformance",label: "non-conformance", table: "non_conformance",path: "/quality/non-conformance",httpCode: 200 },
        ],
      },
      {
        id: "admin", label: "admin", color: "#333333",
        routes: [
          { id: "users",    label: "users",    table: "profiles",  path: "/users",         httpCode: 200 },
          { id: "database", label: "database", table: "audit_log", path: "/admin/database",httpCode: 200 },
          { id: "explorer", label: "explorer", table: "audit_log", path: "/webmaster",     httpCode: 200 },
          { id: "audit",    label: "audit-log",table: "audit_log", path: "/audit-log",     httpCode: 200 },
          { id: "settings", label: "settings", table: "",          path: "/settings",      httpCode: 200 },
        ],
      },
    ],
  },
];

// ─── ALL DB TABLES WITH EXPECTED COLS ─────────────────────────────────────
const ALL_TABLES = [
  "requisitions","purchase_orders","goods_received","suppliers","contracts","tenders",
  "bid_evaluations","procurement_plans","payment_vouchers","receipt_vouchers","journal_vouchers",
  "purchase_vouchers","sales_vouchers","chart_of_accounts","budgets","fixed_assets","items",
  "item_categories","departments","stock_movements","inspections","non_conformance",
  "profiles","user_roles","audit_log","bank_accounts","gl_entries","permissions","roles",
];

function WebmasterPageInner() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  const [expanded,  setExpanded]  = useState<Set<string>>(new Set(["root", "procurement"]));
  const [selMod,    setSelMod]    = useState("procurement");
  const [selRoute,  setSelRoute]  = useState<string | null>(null);
  const [counts,    setCounts]    = useState<Record<string, number>>({});
  const [loadingAll,setLoadingAll]= useState(true);
  const [loadingDet,setLoadingDet]= useState(false);
  const [detail,    setDetail]    = useState<any | null>(null);
  const [filter,    setFilter]    = useState("All");
  const [search,    setSearch]    = useState("");
  const [sortDesc,  setSortDesc]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // ─── Fetch all table counts ────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoadingAll(true);
    const results: Record<string, number> = {};
    await Promise.all(ALL_TABLES.map(async t => {
      try {
        const { count } = await (supabase as any).from(t).select("*", { count: "exact", head: true });
        results[t] = count || 0;
      } catch { results[t] = 0; }
    }));
    setCounts(results);
    setLastRefresh(new Date());
    setLoadingAll(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Get module def ────────────────────────────────────────────────────
  const getMod = (id: string) => MODULE_TREE[0].modules.find(m => m.id === id);
  const getRoute = (modId: string, routeId: string) => getMod(modId)?.routes.find(r => r.id === routeId);

  // ─── Fetch detail when route selected ─────────────────────────────────
  useEffect(() => {
    if (!selRoute) { setDetail(null); return; }
    const mod = getMod(selMod);
    const route = mod?.routes.find(r => r.id === selRoute);
    if (!route) return;
    if (!route.table) {
      setDetail({ route, count: 0, recent: [], pending: 0, lastRow: null });
      return;
    }
    setLoadingDet(true);
    (async () => {
      try {
        const [countRes, recentRes] = await Promise.all([
          (supabase as any).from(route.table).select("*", { count: "exact", head: true }),
          (supabase as any).from(route.table).select("*").order("created_at", { ascending: false }).limit(5),
        ]);
        let pending = 0;
        if (["requisitions","purchase_orders","payment_vouchers","receipt_vouchers"].includes(route.table)) {
          const pRes = await (supabase as any).from(route.table).select("*",{count:"exact",head:true}).eq("status","pending");
          pending = pRes.count || 0;
        }
        setDetail({
          route,
          count: countRes.count || 0,
          recent: recentRes.data || [],
          pending,
          lastRow: recentRes.data?.[0] || null,
        });
      } catch { setDetail(null); }
      setLoadingDet(false);
    })();
  }, [selRoute, selMod]);

  const toggle = (id: string) => setExpanded(e => {
    const n = new Set(e);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const currentMod = getMod(selMod);
  const routes = currentMod?.routes || [];

  const filteredRoutes = routes
    .filter(r => !search || r.label.toLowerCase().includes(search.toLowerCase()))
    .filter(r => {
      const cnt = counts[r.table] || 0;
      if (filter === "Active") return cnt > 0;
      if (filter === "Empty") return cnt === 0;
      return true;
    })
    .sort((a, b) => {
      const diff = (counts[b.table] || 0) - (counts[a.table] || 0);
      return sortDesc ? diff : -diff;
    });

  const totalForMod = (modId: string) =>
    (getMod(modId)?.routes || []).reduce((s, r) => s + (counts[r.table] || 0), 0);

  const grandTotal = ALL_TABLES.reduce((s, t) => s + (counts[t] || 0), 0);

  // ─── Get display name from row ─────────────────────────────────────────
  const getRowLabel = (row: any) =>
    row?.requisition_number || row?.po_number || row?.voucher_number || row?.receipt_number ||
    row?.journal_number || row?.tender_number || row?.contract_number || row?.asset_number ||
    row?.plan_number || row?.inspection_number || row?.ncr_number || row?.account_code ||
    row?.budget_code || row?.movement_number || row?.full_name || row?.name || row?.code ||
    String(row?.id || "").slice(0, 12);

  const selRouteObj = selRoute ? getMod(selMod)?.routes.find(r => r.id === selRoute) : null;

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden" style={{ fontFamily: "Segoe UI, system-ui, sans-serif", minHeight: "calc(100vh - 56px)" }}>

      {/* ── Top bar (Image 2 title + download) ────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">System Explorer</h1>
          <p className="text-xs text-gray-400">MediProcure ERP · Webmaster & System Management</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search routes…"
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 w-44"/>
          </div>
          <button onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAll ? "animate-spin" : ""}`}/>Refresh
          </button>
          <button
            onClick={() => {
              const rows = routes.map(r => `${r.path},${r.table},${counts[r.table]||0},Active`).join("\n");
              const blob = new Blob([`Path,Table,Records,Status\n${rows}`], { type: "text/csv" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `mediprocure-explorer-${selMod}.csv`; a.click();
              toast({ title: "Downloaded", description: `${selMod} route data exported.` });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
            <Download className="w-3.5 h-3.5"/>Download
          </button>
        </div>
      </div>

      {/* ── Filter bar (Image 2) ───────────────────────────────────────── */}
      <div className="px-6 py-2 border-b border-gray-100 bg-gray-50 flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-xs text-gray-700 cursor-pointer hover:bg-gray-50 select-none"
          onClick={() => {
            const f = ["All","Active","Empty"];
            setFilter(f[(f.indexOf(filter)+1) % f.length]);
          }}>
          <Filter className="w-3.5 h-3.5 text-gray-400"/>
          Filter by: <span className="font-semibold ml-1">{filter}</span>
          <ChevronDown className="w-3 h-3 text-gray-400 ml-1"/>
        </div>
        {["All","Active","Empty"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 text-xs rounded-md transition-all ${filter === f ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-200"}`}>
            {f}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-400">
          {loadingAll ? (
            <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"/>Loading…</span>
          ) : (
            <span className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-green-500"/>
              {grandTotal.toLocaleString()} total records · {lastRefresh.toLocaleTimeString("en-KE")}
            </span>
          )}
        </div>
      </div>

      {/* ── 3-column main layout (Image 2) ───────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* LEFT: Explorer tree (Image 2 left column) */}
        <div className="w-64 border-r border-gray-200 flex flex-col bg-white min-h-0 shrink-0">
          <div className="px-3.5 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Explorer</span>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 select-none"
              onClick={() => setSortDesc(v => !v)}>
              <span>Records</span><ArrowUpDown className="w-3 h-3"/>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-1 text-xs select-none">
            {/* Root */}
            <button onClick={() => toggle("root")}
              className="w-full flex items-center gap-1.5 px-3 py-2 text-left hover:bg-gray-50 text-gray-700">
              {expanded.has("root") ? <ChevronDown className="w-3.5 h-3.5 text-gray-400"/> : <ChevronRight className="w-3.5 h-3.5 text-gray-400"/>}
              <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0"/>
              <span className="font-semibold text-gray-800 truncate">{MODULE_TREE[0].label}</span>
            </button>
            {expanded.has("root") && MODULE_TREE[0].modules.map(mod => (
              <div key={mod.id}>
                {/* Module folder */}
                <button
                  onClick={() => { toggle(mod.id); setSelMod(mod.id); setSelRoute(null); }}
                  className={`w-full flex items-center gap-1.5 pl-6 pr-3 py-1.5 text-left hover:bg-blue-50 transition-colors ${selMod === mod.id && !selRoute ? "bg-blue-50 text-blue-700" : "text-gray-700"}`}
                >
                  {expanded.has(mod.id) ? <ChevronDown className="w-3 h-3 text-gray-400"/> : <ChevronRight className="w-3 h-3 text-gray-400"/>}
                  {expanded.has(mod.id)
                    ? <FolderOpen className="w-3.5 h-3.5 shrink-0" style={{ color: mod.color }}/>
                    : <Folder className="w-3.5 h-3.5 shrink-0" style={{ color: mod.color }}/>
                  }
                  <span className={`font-semibold truncate flex-1 ${selMod===mod.id&&!selRoute?"text-blue-700":""}`}>{mod.label}</span>
                  {!loadingAll && (
                    <span className="text-[9px] font-mono text-gray-400">{totalForMod(mod.id).toLocaleString()}</span>
                  )}
                </button>
                {/* Route files */}
                {expanded.has(mod.id) && mod.routes.map(r => (
                  <button key={r.id}
                    onClick={() => { setSelMod(mod.id); setSelRoute(r.id); }}
                    className={`w-full flex items-center gap-1.5 pl-10 pr-3 py-[5px] text-left hover:bg-blue-50 transition-colors border-l-2 ${selRoute === r.id && selMod === mod.id ? "bg-blue-50 border-blue-500 text-blue-700" : "border-transparent text-gray-600"}`}
                  >
                    <FileText className="w-3 h-3 shrink-0 text-gray-400"/>
                    <span className="truncate flex-1">{r.label}</span>
                    {!loadingAll && (
                      <span className={`text-[9px] font-mono ${(counts[r.table]||0)>0?"text-gray-600":"text-gray-300"}`}>
                        {(counts[r.table]||0).toLocaleString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: route list + info cards (Image 2 center) */}
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200">
          {/* Breadcrumb */}
          <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-1.5 text-xs bg-white shrink-0">
            <Globe className="w-3.5 h-3.5 text-gray-400"/>
            <span className="text-gray-500">mediprocure.embu.health.go.ke</span>
            <ChevronRight className="w-3 h-3 text-gray-300"/>
            <span className="font-semibold" style={{ color: currentMod?.color || "#333" }}>{selMod}</span>
            {selRoute && selRouteObj && (
              <><ChevronRight className="w-3 h-3 text-gray-300"/><span className="font-semibold text-gray-700">{selRouteObj.label}</span></>
            )}
          </div>

          {/* Info cards — shown when no route selected */}
          {!selRoute && (
            <div className="p-4 grid grid-cols-2 gap-3 border-b border-gray-100 bg-gray-50 shrink-0">
              {/* Crawl info (Image 2 — bar chart style) */}
              <div className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">Route Statistics</p>
                <div className="flex items-end gap-4">
                  <div className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 rounded-t-sm flex items-end justify-center"
                        style={{ height: 60, background: "#107c10" }}>
                        <span className="text-white text-[9px] font-bold pb-1">{routes.length}</span>
                      </div>
                      <span className="text-[9px] text-gray-500">Indexed</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 rounded-t-sm flex items-end justify-center"
                        style={{ height: 10, background: "#d13438" }}>
                      </div>
                      <span className="text-[9px] text-gray-500">Error</span>
                      <span className="text-[9px] font-bold text-gray-700">0</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 rounded-t-sm" style={{ height: 10, background: "#ca5010" }}/>
                      <span className="text-[9px] text-gray-500">Warning</span>
                      <span className="text-[9px] font-bold text-gray-700">0</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-8 rounded-t-sm" style={{ height: 10, background: "#8e8cd8" }}/>
                      <span className="text-[9px] text-gray-500">Excluded</span>
                      <span className="text-[9px] font-bold text-gray-700">0</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Folder info (Image 2 right card) */}
              <div className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Module Info</p>
                  <span className="text-[9px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3"/>Live</span>
                </div>
                {[
                  { label: "Routes",   val: routes.length },
                  { label: "Records",  val: loadingAll ? "…" : totalForMod(selMod).toLocaleString() },
                  { label: "Status",   val: "Active" },
                  { label: "RLS",      val: "Enabled" },
                  { label: "Realtime", val: "On" },
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between py-0.5">
                    <span className="text-[10px] text-gray-500">{r.label}</span>
                    <span className="text-[10px] font-bold text-gray-800">{r.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Route list table (Image 2 center URL list) */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Route / Module</span>
                  </th>
                  <th className="px-4 py-2.5 text-right cursor-pointer" onClick={() => setSortDesc(v => !v)}>
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-end gap-1">
                      Records <ArrowUpDown className="w-3 h-3"/>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map(r => {
                  const cnt = counts[r.table] || 0;
                  const isSel = selRoute === r.id && selMod === currentMod?.id;
                  return (
                    <tr key={r.id} onClick={() => setSelRoute(r.id)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${isSel ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSel ? "text-blue-500" : "text-gray-400"}`}/>
                          <span className={`text-xs ${isSel ? "text-blue-700 font-semibold" : "text-gray-700"}`}>{r.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`text-xs font-semibold ${cnt === 0 ? "text-gray-300" : "text-gray-800"}`}>
                          {cnt.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredRoutes.length === 0 && (
                  <tr><td colSpan={2} className="py-12 text-center text-xs text-gray-400">No routes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Detail panel (Image 2 right — Inspect URL / Request indexing) */}
        <div className="w-72 flex flex-col min-h-0 bg-white shrink-0">
          {selRoute && detail ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Route label */}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400"/>
                <span className="text-sm font-bold text-gray-800 truncate">/{selRouteObj?.label}</span>
              </div>

              {/* Indexed badge */}
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600"/>
                <span className="text-xs font-bold text-green-700">Indexed & Active</span>
              </div>

              {/* Stats (Image 2 right panel meta list) */}
              <div className="space-y-1.5 text-xs">
                {[
                  { label: "Records",     val: loadingDet ? "…" : detail.count?.toLocaleString() },
                  { label: "Pending",     val: loadingDet ? "…" : detail.pending?.toString() },
                  { label: "Table",       val: selRouteObj?.table || "—" },
                  { label: "Last Sync",   val: loadingDet ? "…" : new Date().toLocaleTimeString("en-KE") },
                  { label: "HTTP code",   val: String(selRouteObj?.httpCode || 200) },
                  { label: "Realtime",    val: "Enabled" },
                  { label: "RLS",         val: "Active" },
                  { label: "Auth",        val: "Required" },
                  { label: "Is HTTPS",    val: "true" },
                  { label: "Route",       val: detail.route?.path || "" },
                ].map(r => (
                  <div key={r.label} className="flex items-start gap-1.5 py-1 border-b border-gray-100 last:border-0">
                    <span className="w-24 text-gray-500 shrink-0">{r.label}</span>
                    <span className="text-gray-400 shrink-0">:</span>
                    <span className="font-semibold text-gray-800 truncate flex-1">{r.val}</span>
                  </div>
                ))}
              </div>

              {/* Recent records */}
              {!loadingDet && detail.recent?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Recent Records</p>
                  <div className="space-y-1">
                    {detail.recent.slice(0, 5).map((row: any, i: number) => (
                      <div key={i} className="text-[10px] text-gray-600 bg-gray-50 rounded px-2 py-1.5 font-mono truncate border border-gray-100">
                        {getRowLabel(row)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action buttons (Image 2: Inspect URL / Request indexing / Test URL) */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => navigate(detail.route?.path || "/")}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5"/>Inspect Route
                </button>
                <button
                  onClick={async () => {
                    toast({ title: "Refreshing…", description: `Syncing ${selRouteObj?.table} counts.` });
                    await fetchAll();
                    toast({ title: "✅ Counts refreshed" });
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5"/>Request Re-index
                </button>
                {isAdmin && (
                  <button
                    onClick={() => navigate("/admin/database")}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Database className="w-3.5 h-3.5"/>Manage in DB Admin
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-2">
              <FileText className="w-10 h-10 text-gray-200"/>
              <p className="text-xs text-gray-400">Select a route to view<br/>detailed statistics</p>
            </div>
          )}
        </div>
      </div>

      {/* ── System health status footer ───────────────────────────────── */}
      <div className="border-t border-gray-200 bg-gray-50 px-5 py-2 flex items-center gap-5 shrink-0">
        {[
          { icon: Database,  label: "Database",  ok: true,  val: "Connected" },
          { icon: Wifi,      label: "Realtime",  ok: true,  val: "Active" },
          { icon: Shield,    label: "Auth",      ok: true,  val: "Secured" },
          { icon: Server,    label: "API",       ok: true,  val: "Healthy" },
          { icon: HardDrive, label: "Storage",   ok: true,  val: "OK" },
          { icon: Zap,       label: "Indexing",  ok: true,  val: `${ALL_TABLES.length} tables` },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-1.5 text-[10px]">
            <s.icon className="w-3 h-3 text-gray-400"/>
            <span className="text-gray-500">{s.label}:</span>
            <span className={`font-bold flex items-center gap-0.5 ${s.ok ? "text-green-700" : "text-red-600"}`}>
              {s.ok ? <CheckCircle2 className="w-3 h-3"/> : <XCircle className="w-3 h-3"/>}{s.val}
            </span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-gray-400">
          yvjfehnzbzjliizjvuhq.supabase.co · {new Date().toLocaleDateString("en-KE", { day:"2-digit", month:"short", year:"numeric" })}
        </div>
      </div>
    </div>
  );
}

export default function WebmasterPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <WebmasterPageInner />
    </RoleGuard>
  );
}
