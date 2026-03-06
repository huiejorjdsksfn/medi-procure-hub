import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, RefreshCw, Search, ChevronRight, AlertTriangle,
  Package, ShoppingCart, Truck, FileText, DollarSign,
  CheckCircle, Shield, Gavel, ClipboardList, TrendingUp,
  Building2, BookMarked, Receipt, PiggyBank, Calendar,
  Users, Database, Activity, ArrowUp, ArrowDown, Eye
} from "lucide-react";

const thisMonth = new Date().toISOString().slice(0, 7);

const fmt = (n: number) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
const fmtSh = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `KES ${(n / 1_000).toFixed(0)}K`
  : `KES ${n}`;

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<any>({});
  const [recentReqs, setRecentReqs] = useState<any[]>([]);
  const [recentPOs, setRecentPOs] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [searchActivity, setSearchActivity] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, pos, items, supp, pv, rv, ncr, insp, tenders, budgets, grn, log, contracts, plans] =
        await Promise.all([
          (supabase as any).from("requisitions").select("id,requisition_number,status,total_amount,priority,created_at").order("created_at", { ascending: false }),
          (supabase as any).from("purchase_orders").select("id,po_number,status,total_amount,created_at").order("created_at", { ascending: false }),
          (supabase as any).from("items").select("id,name,quantity_in_stock,reorder_level,status,unit_price"),
          (supabase as any).from("suppliers").select("id,name,status,rating"),
          (supabase as any).from("payment_vouchers").select("id,voucher_number,payee_name,amount,status,voucher_date,created_at").order("created_at", { ascending: false }),
          (supabase as any).from("receipt_vouchers").select("id,receipt_number,received_from,amount,receipt_date,created_at").order("created_at", { ascending: false }),
          (supabase as any).from("non_conformance").select("id,ncr_number,status,severity,supplier_name,created_at"),
          (supabase as any).from("inspections").select("id,inspection_number,result,supplier_name,item_name,inspection_date"),
          (supabase as any).from("tenders").select("id,tender_number,title,status,estimated_value,closing_date"),
          (supabase as any).from("budgets").select("id,budget_name,allocated_amount,spent_amount,status,financial_year"),
          (supabase as any).from("goods_received").select("id,grn_number,created_at").order("created_at", { ascending: false }),
          (supabase as any).from("audit_log").select("id,action,module,user_name,entity_type,details,created_at").order("created_at", { ascending: false }).limit(50),
          (supabase as any).from("contracts").select("id,status"),
          (supabase as any).from("procurement_plans").select("id,status,estimated_total_cost"),
        ]);

      const pvR = pv.data || []; const rvR = rv.data || [];
      const reqR = reqs.data || []; const posR = pos.data || [];
      const itemR = items.data || []; const ncrR = ncr.data || [];
      const inspR = insp.data || []; const budR = budgets.data || [];
      const tendR = tenders.data || [];

      const pvMTD = pvR.filter((v: any) => v.voucher_date?.startsWith(thisMonth));
      const rvMTD = rvR.filter((v: any) => v.receipt_date?.startsWith(thisMonth));
      const lowStockItems = itemR.filter((i: any) => Number(i.quantity_in_stock) <= Number(i.reorder_level || 10));

      setKpi({
        // Reqs
        pendingReqs: reqR.filter((r: any) => r.status === "pending").length,
        approvedReqs: reqR.filter((r: any) => r.status === "approved").length,
        rejectedReqs: reqR.filter((r: any) => r.status === "rejected").length,
        totalReqs: reqR.length,
        // POs
        draftPOs: posR.filter((p: any) => p.status === "draft").length,
        approvedPOs: posR.filter((p: any) => p.status === "approved").length,
        issuedPOs: posR.filter((p: any) => p.status === "issued").length,
        totalPOsAmt: posR.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0),
        // Payments
        pendingPayments: pvR.filter((v: any) => v.status === "pending").length,
        pendingPayAmt: pvR.filter((v: any) => ["pending","approved"].includes(v.status)).reduce((s: number, v: any) => s + Number(v.amount || 0), 0),
        paidMTD: pvMTD.filter((v: any) => v.status === "paid").reduce((s: number, v: any) => s + Number(v.amount || 0), 0),
        receivedMTD: rvMTD.reduce((s: number, v: any) => s + Number(v.amount || 0), 0),
        totalReceipts: rvR.length,
        // Inventory
        lowStock: lowStockItems.length,
        totalItems: itemR.length,
        activeSuppliers: (supp.data || []).filter((s: any) => s.status === "active").length,
        // Quality
        openNCRs: ncrR.filter((n: any) => n.status === "open").length,
        criticalNCRs: ncrR.filter((n: any) => n.severity === "critical").length,
        pendingInspections: inspR.filter((i: any) => i.result === "pending").length,
        passRate: inspR.length > 0 ? Math.round(inspR.filter((i: any) => i.result === "pass").length / inspR.length * 100) : 100,
        // Tenders
        openTenders: tendR.filter((t: any) => t.status === "published").length,
        closingTenders: tendR.filter((t: any) => t.status === "published" && t.closing_date && new Date(t.closing_date) <= new Date(Date.now() + 7 * 86400000)).length,
        // Budget
        activeBudgets: budR.filter((b: any) => b.status === "active").length,
        totalBudget: budR.reduce((s: number, b: any) => s + Number(b.allocated_amount || 0), 0),
        spentBudget: budR.reduce((s: number, b: any) => s + Number(b.spent_amount || 0), 0),
        // GRN
        grnCount: (grn.data || []).length,
        activeContracts: (contracts.data || []).filter((c: any) => c.status === "active").length,
        // Plans
        approvedPlans: (plans.data || []).filter((p: any) => p.status === "approved").length,
        planBudget: (plans.data || []).reduce((s: number, p: any) => s + Number(p.estimated_total_cost || 0), 0),
      });

      setRecentReqs(reqR.slice(0, 8));
      setRecentPOs(posR.slice(0, 8));
      setRecentPayments(pvR.slice(0, 8));
      setRecentActivity(log.data || []);

      // Build pending tasks
      const tasks: any[] = [];
      if (reqR.filter((r: any) => r.status === "pending").length > 0)
        tasks.push({ type: "REQUISITION", label: "Pending Requisitions to Approve", count: reqR.filter((r: any) => r.status === "pending").length, path: "/requisitions", status: "Pending Approval", priority: "high" });
      if (pvR.filter((v: any) => v.status === "pending").length > 0)
        tasks.push({ type: "PAYMENT", label: "Payment Vouchers Awaiting Approval", count: pvR.filter((v: any) => v.status === "pending").length, path: "/vouchers/payment", status: "Pending Approval", priority: "high" });
      if (lowStockItems.length > 0)
        tasks.push({ type: "INVENTORY", label: "Items Below Reorder Level", count: lowStockItems.length, path: "/items", status: "Reorder Required", priority: "medium" });
      if (ncrR.filter((n: any) => n.status === "open").length > 0)
        tasks.push({ type: "QUALITY", label: "Open Non-Conformance Reports", count: ncrR.filter((n: any) => n.status === "open").length, path: "/quality/non-conformance", status: "Action Required", priority: "high" });
      if (inspR.filter((i: any) => i.result === "pending").length > 0)
        tasks.push({ type: "INSPECTION", label: "Inspections Pending Results", count: inspR.filter((i: any) => i.result === "pending").length, path: "/quality/inspections", status: "Pending", priority: "medium" });
      if (tendR.filter((t: any) => t.status === "published" && t.closing_date && new Date(t.closing_date) <= new Date(Date.now() + 7 * 86400000)).length > 0)
        tasks.push({ type: "TENDER", label: "Tenders Closing This Week", count: tendR.filter((t: any) => t.status === "published" && t.closing_date && new Date(t.closing_date) <= new Date(Date.now() + 7 * 86400000)).length, path: "/tenders", status: "Closing Soon", priority: "medium" });
      setPendingItems(tasks);

      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tables = ["requisitions","purchase_orders","items","suppliers","payment_vouchers","receipt_vouchers","non_conformance","inspections","tenders","audit_log","budgets","goods_received"];
    const chs = tables.map(t =>
      (supabase as any).channel(`crm-${t}`).on("postgres_changes", { event: "*", schema: "public", table: t }, () => load()).subscribe()
    );
    return () => { chs.forEach(c => supabase.removeChannel(c)); };
  }, [load]);

  const budgetPct = kpi.totalBudget ? Math.round(kpi.spentBudget / kpi.totalBudget * 100) : 0;

  const filteredActivity = recentActivity.filter(a =>
    !searchActivity || a.action?.toLowerCase().includes(searchActivity.toLowerCase()) ||
    a.module?.toLowerCase().includes(searchActivity.toLowerCase()) ||
    a.user_name?.toLowerCase().includes(searchActivity.toLowerCase()) ||
    a.entity_type?.toLowerCase().includes(searchActivity.toLowerCase())
  );

  const statusBadge = (s: string) => {
    const map: any = {
      pending: "bg-amber-100 text-amber-800 border-amber-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      draft: "bg-gray-100 text-gray-700 border-gray-200",
      issued: "bg-blue-100 text-blue-800 border-blue-200",
      paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
      confirmed: "bg-teal-100 text-teal-800 border-teal-200",
      open: "bg-red-100 text-red-700 border-red-200",
      active: "bg-green-100 text-green-800 border-green-200",
      published: "bg-blue-100 text-blue-800 border-blue-200",
    };
    return `text-[10px] font-semibold px-1.5 py-0.5 rounded border capitalize ${map[s] || "bg-gray-100 text-gray-600 border-gray-200"}`;
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ fontFamily: "Segoe UI, system-ui, sans-serif", background: "#f0f0f0" }}>

      {/* ── What's New / KPI Headline Row ─────────────────────────────── */}
      <div className="shrink-0" style={{ background: "#fff", borderBottom: "1px solid #d9d9d9" }}>
        <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-gray-800">
              Embu Level 5 Hospital · MediProcure ERP
            </h1>
            <span className="text-gray-300">|</span>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Updated {lastRefresh.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</span>
            <Button size="sm" variant="outline" onClick={load} disabled={loading} className="h-7 text-xs">
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
          </div>
        </div>

        {/* Big 4 KPI summary cards */}
        <div className="grid grid-cols-4 divide-x divide-gray-200">
          {[
            { label: "RECEIPTS THIS MONTH", val: fmtSh(kpi.receivedMTD || 0), sub: `${kpi.totalReceipts || 0} total receipts`, color: "#107c10", trend: "up" },
            { label: "OUTSTANDING PAYABLES", val: fmtSh(kpi.pendingPayAmt || 0), sub: `${kpi.pendingPayments || 0} vouchers pending`, color: kpi.pendingPayments > 0 ? "#a4262c" : "#107c10", trend: kpi.pendingPayments > 0 ? "down" : "up" },
            { label: "PAYMENTS MADE MTD", val: fmtSh(kpi.paidMTD || 0), sub: `Budget: ${budgetPct}% utilized`, color: "#0078d4", trend: "up" },
            { label: "ACTIVE SUPPLIERS", val: kpi.activeSuppliers || 0, sub: `${kpi.totalItems || 0} items catalogued`, color: "#8764b8", trend: "up" },
          ].map(k => (
            <div key={k.label} className="px-5 py-3 hover:bg-gray-50 cursor-pointer group transition-colors" onClick={() => navigate("/financials/dashboard")}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{k.label}</span>
                {k.trend === "up"
                  ? <ArrowUp className="w-3 h-3 text-green-500 opacity-0 group-hover:opacity-100" />
                  : <ArrowDown className="w-3 h-3 text-red-500 opacity-0 group-hover:opacity-100" />}
              </div>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.val}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-gray-400">{k.sub}</p>
                <button className="text-[10px] text-blue-600 hover:underline opacity-0 group-hover:opacity-100">› See more</button>
              </div>
              <div className="h-[2px] w-12 mt-1.5 rounded" style={{ backgroundColor: k.color }} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Main 3-column layout ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-[280px_1fr_280px] gap-0 min-h-0 overflow-hidden">

        {/* ── LEFT: Activity tiles / Pipeline ──────────────────────────── */}
        <div className="flex flex-col min-h-0 overflow-y-auto border-r border-gray-200 bg-white">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between z-10">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-600">PENDING TASKS</span>
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{pendingItems.length}</span>
          </div>

          {/* Quick KPI tiles - 2 per row */}
          <div className="grid grid-cols-2 gap-px bg-gray-200 border-b border-gray-200">
            {[
              { label: "Pending Reqs", val: kpi.pendingReqs || 0, path: "/requisitions", color: "#ca5010", urgent: kpi.pendingReqs > 0 },
              { label: "Draft POs", val: kpi.draftPOs || 0, path: "/purchase-orders", color: "#0078d4" },
              { label: "Low Stock", val: kpi.lowStock || 0, path: "/items", color: "#a4262c", urgent: kpi.lowStock > 0 },
              { label: "Open NCRs", val: kpi.openNCRs || 0, path: "/quality/non-conformance", color: "#a4262c", urgent: kpi.openNCRs > 0 },
              { label: "Open Tenders", val: kpi.openTenders || 0, path: "/tenders", color: "#00695C" },
              { label: "Active Budgets", val: kpi.activeBudgets || 0, path: "/financials/budgets", color: "#5C2D91" },
            ].map(t => (
              <button key={t.label} onClick={() => navigate(t.path)}
                className={`bg-white px-3 py-3 text-left hover:bg-gray-50 transition-colors group ${t.urgent ? "bg-red-50" : ""}`}>
                <p className="text-[22px] font-bold leading-none" style={{ color: t.urgent && t.val > 0 ? t.color : t.color }}>{t.val}</p>
                <p className="text-[9px] uppercase tracking-wide text-gray-500 mt-1 leading-tight">{t.label}</p>
                <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
              </button>
            ))}
          </div>

          {/* Pending tasks list */}
          <div className="flex-1 overflow-y-auto">
            {pendingItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                <p className="text-sm font-medium text-gray-600">All clear!</p>
                <p className="text-xs text-gray-400">No pending tasks.</p>
              </div>
            ) : (
              pendingItems.map((t, i) => (
                <button key={i} onClick={() => navigate(t.path)}
                  className="w-full flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left group">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${t.priority === "high" ? "bg-red-500" : "bg-amber-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 leading-snug">{t.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] uppercase tracking-wide text-gray-400 font-semibold">{t.type}</span>
                      <span className={statusBadge(t.priority === "high" ? "pending" : "draft")}>{t.status}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${t.priority === "high" ? "text-red-600" : "text-amber-600"}`}>{t.count}</span>
                </button>
              ))
            )}
          </div>

          {/* Quick START section */}
          <div className="border-t border-gray-200 shrink-0">
            <div className="px-4 py-2 border-b border-gray-100">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">QUICK START</span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-2">
              {[
                { label: "Requisition", path: "/requisitions", icon: ClipboardList, color: "#1a1a2e" },
                { label: "Payment", path: "/vouchers/payment", icon: DollarSign, color: "#C45911" },
                { label: "Receipt", path: "/vouchers/receipt", icon: Receipt, color: "#107c10" },
                { label: "Purchase Inv", path: "/vouchers/purchase", icon: FileText, color: "#1F6090" },
                { label: "Sales Inv", path: "/vouchers/sales", icon: TrendingUp, color: "#375623" },
                { label: "Inspection", path: "/quality/inspections", icon: Shield, color: "#00695C" },
                { label: "Tender", path: "/tenders", icon: Gavel, color: "#5C2D91" },
                { label: "Journal", path: "/vouchers/journal", icon: BookMarked, color: "#8764b8" },
                { label: "Plan Item", path: "/procurement-planning", icon: Calendar, color: "#038387" },
              ].map(s => (
                <button key={s.label} onClick={() => navigate(s.path)}
                  className="flex flex-col items-center gap-1 p-2 rounded hover:bg-gray-100 transition-colors group text-center">
                  <div className="w-7 h-7 rounded flex items-center justify-center group-hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: `${s.color}20` }}>
                    <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                  <span className="text-[9px] font-medium text-gray-600 leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CENTER: Main data tables ──────────────────────────────────── */}
        <div className="flex flex-col min-h-0 overflow-hidden bg-white">
          {/* Tab row */}
          {(() => {
            const [tab, setTab] = useState("reqs");
            const tabs = [
              { id: "reqs", label: "Requisitions", count: kpi.totalReqs || 0 },
              { id: "pos", label: "Purchase Orders", count: kpi.issuedPOs || 0 },
              { id: "payments", label: "Payment Vouchers", count: kpi.totalReceipts || 0 },
              { id: "activity", label: "All Activity", count: recentActivity.length },
            ];

            const tableData: any = {
              reqs: {
                headers: ["Req Number", "Status", "Priority", "Amount", "Date"],
                rows: recentReqs.map(r => ({
                  id: r.id, path: "/requisitions",
                  cols: [
                    <span key="n" className="font-mono text-xs font-bold text-blue-600">{r.requisition_number}</span>,
                    <span key="s" className={statusBadge(r.status)}>{r.status}</span>,
                    <span key="p" className={`text-[10px] font-semibold capitalize ${r.priority === "urgent" ? "text-red-600" : r.priority === "high" ? "text-orange-600" : "text-gray-600"}`}>{r.priority || "normal"}</span>,
                    <span key="a" className="text-xs font-semibold">{r.total_amount ? fmt(Number(r.total_amount)) : "—"}</span>,
                    <span key="d" className="text-[10px] text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE") : "—"}</span>,
                  ]
                })),
                action: { label: "New Requisition", path: "/requisitions" },
              },
              pos: {
                headers: ["PO Number", "Status", "Total Amount", "Date"],
                rows: recentPOs.map(p => ({
                  id: p.id, path: "/purchase-orders",
                  cols: [
                    <span key="n" className="font-mono text-xs font-bold text-blue-600">{p.po_number}</span>,
                    <span key="s" className={statusBadge(p.status)}>{p.status}</span>,
                    <span key="a" className="text-xs font-semibold">{p.total_amount ? fmt(Number(p.total_amount)) : "—"}</span>,
                    <span key="d" className="text-[10px] text-gray-500">{p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : "—"}</span>,
                  ]
                })),
                action: { label: "New Purchase Order", path: "/purchase-orders" },
              },
              payments: {
                headers: ["Voucher No.", "Payee", "Amount", "Status", "Date"],
                rows: recentPayments.map(v => ({
                  id: v.id, path: "/vouchers/payment",
                  cols: [
                    <span key="n" className="font-mono text-xs font-bold text-orange-600">{v.voucher_number}</span>,
                    <span key="p" className="text-xs text-gray-700 truncate max-w-[120px]">{v.payee_name}</span>,
                    <span key="a" className="text-xs font-bold">{fmt(Number(v.amount || 0))}</span>,
                    <span key="s" className={statusBadge(v.status)}>{v.status}</span>,
                    <span key="d" className="text-[10px] text-gray-500">{v.voucher_date}</span>,
                  ]
                })),
                action: { label: "New Payment Voucher", path: "/vouchers/payment" },
              },
              activity: {
                headers: ["Action", "Module / Entity", "Performed By", "Time"],
                rows: filteredActivity.slice(0, 20).map(a => ({
                  id: a.id, path: "/audit-log",
                  cols: [
                    <span key="a" className="text-xs font-medium text-gray-800 capitalize">{a.action?.replace(/_/g, " ")}</span>,
                    <div key="m" className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase text-gray-400">{a.module}</span>
                      <span className="text-xs text-gray-600">{a.entity_type}</span>
                    </div>,
                    <div key="u" className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ backgroundColor: "#0078d4" }}>
                        {(a.user_name || "S")[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700">{a.user_name || "System"}</span>
                    </div>,
                    <span key="t" className="text-[10px] text-gray-400">
                      {a.created_at ? new Date(a.created_at).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>,
                  ]
                })),
                action: { label: "View Full Audit Trail", path: "/audit-log" },
              },
            };

            const current = tableData[tab];

            return (
              <>
                {/* Tab bar + search + add button */}
                <div className="border-b border-gray-200 shrink-0">
                  <div className="flex items-center px-4 pt-2 gap-0">
                    {tabs.map(t => (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all -mb-px ${tab === t.id ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                        {t.label}
                        <span className={`text-[9px] px-1 py-0.5 rounded-full font-bold ${tab === t.id ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
                      </button>
                    ))}
                    <div className="flex-1" />
                    <button onClick={() => navigate(current.action.path)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors border border-blue-200 mb-1">
                      <Plus className="w-3 h-3" />{current.action.label}
                    </button>
                  </div>
                  {tab === "activity" && (
                    <div className="px-4 pb-2 flex items-center gap-2">
                      <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                        <Input className="pl-7 h-7 text-xs" placeholder="Search records..." value={searchActivity} onChange={e => setSearchActivity(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0">
                      <tr style={{ background: "#f8f8f8", borderBottom: "1px solid #e0e0e0" }}>
                        {current.headers.map((h: string) => (
                          <th key={h} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">{h}</th>
                        ))}
                        <th className="px-4 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.rows.length === 0 ? (
                        <tr><td colSpan={current.headers.length + 1} className="py-16 text-center text-gray-400 text-sm">No records found. <button className="text-blue-600 hover:underline" onClick={() => navigate(current.action.path)}>Create the first one →</button></td></tr>
                      ) : current.rows.map((row: any, i: number) => (
                        <tr key={i} onClick={() => navigate(row.path)}
                          className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors group">
                          {row.cols.map((c: any, j: number) => <td key={j} className="px-4 py-2.5">{c}</td>)}
                          <td className="px-4 py-2.5"><Eye className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between bg-gray-50 shrink-0">
                  <span className="text-[10px] text-gray-400">{current.rows.length} records shown</span>
                  <button onClick={() => navigate(current.action.path)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </>
            );
          })()}
        </div>

        {/* ── RIGHT: KPI breakdown + Quick facts ───────────────────────── */}
        <div className="flex flex-col min-h-0 overflow-y-auto border-l border-gray-200 bg-white">

          {/* Procurement KPIs */}
          <div className="border-b border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">ONGOING PROCUREMENT</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-gray-200">
              {[
                { label: "REQUISITIONS", val: kpi.pendingReqs || 0, sub: "Pending", path: "/requisitions", color: "#ca5010" },
                { label: "PURCHASE ORDERS", val: kpi.approvedPOs || 0, sub: "Approved", path: "/purchase-orders", color: "#0078d4" },
                { label: "ISSUED POs", val: kpi.issuedPOs || 0, sub: "To suppliers", path: "/purchase-orders", color: "#107c10" },
                { label: "GOODS RECEIVED", val: kpi.grnCount || 0, sub: "GRN total", path: "/goods-received", color: "#8764b8" },
                { label: "OPEN TENDERS", val: kpi.openTenders || 0, sub: "Published", path: "/tenders", color: "#00695C" },
                { label: "CONTRACTS", val: kpi.activeContracts || 0, sub: "Active", path: "/contracts", color: "#1F6090" },
              ].map(t => (
                <button key={t.label} onClick={() => navigate(t.path)}
                  className="bg-white px-3 py-3 text-left hover:bg-gray-50 transition-colors group flex flex-col">
                  <p className="text-[20px] font-bold leading-none" style={{ color: t.color }}>{t.val}</p>
                  <p className="text-[8px] font-bold uppercase tracking-wide text-gray-500 mt-1 leading-tight">{t.label}</p>
                  <p className="text-[9px] text-gray-400">{t.sub}</p>
                  <ChevronRight className="w-3 h-3 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity self-end mt-auto" />
                </button>
              ))}
            </div>
          </div>

          {/* Payments section */}
          <div className="border-b border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">PAYMENTS</span>
              <button onClick={() => navigate("/vouchers/payment")} className="text-[10px] text-blue-600 hover:underline">Manage</button>
            </div>
            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {[
                { label: "UNPROCESSED", val: kpi.pendingPayments || 0, color: "#a4262c" },
                { label: "APPROVED", val: kpi.approvedPOs || 0, color: "#ca5010" },
                { label: "PAID MTD", val: "→", color: "#107c10", path: "/vouchers/payment" },
              ].map(t => (
                <button key={t.label} onClick={() => navigate("/vouchers/payment")}
                  className="bg-white px-2 py-3 text-left hover:bg-gray-50 transition-colors group">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-gray-500 leading-tight mb-1">{t.label}</p>
                  <p className="text-[22px] font-bold leading-none" style={{ color: t.color }}>{t.val}</p>
                  <ChevronRight className="w-3 h-3 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="border-b border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">QUALITY CONTROL</span>
              <button onClick={() => navigate("/quality/dashboard")} className="text-[10px] text-blue-600 hover:underline">Dashboard</button>
            </div>
            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {[
                { label: "OPEN NCRs", val: kpi.openNCRs || 0, color: kpi.openNCRs > 0 ? "#a4262c" : "#107c10" },
                { label: "PENDING INSP.", val: kpi.pendingInspections || 0, color: kpi.pendingInspections > 0 ? "#ca5010" : "#107c10" },
                { label: "PASS RATE", val: `${kpi.passRate || 100}%`, color: kpi.passRate >= 80 ? "#107c10" : "#ca5010" },
              ].map(t => (
                <button key={t.label} onClick={() => navigate("/quality/dashboard")}
                  className="bg-white px-2 py-3 text-left hover:bg-gray-50 transition-colors group">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-gray-500 leading-tight mb-1">{t.label}</p>
                  <p className="text-[22px] font-bold leading-none" style={{ color: t.color }}>{t.val}</p>
                  <ChevronRight className="w-3 h-3 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Budget utilization */}
          <div className="border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">BUDGET UTILIZATION</span>
              <button onClick={() => navigate("/financials/budgets")} className="text-[10px] text-blue-600 hover:underline">Manage</button>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-xl font-bold" style={{ color: budgetPct > 90 ? "#a4262c" : budgetPct > 70 ? "#ca5010" : "#107c10" }}>{budgetPct}%</span>
              <span className="text-xs text-gray-500">utilized</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(budgetPct, 100)}%`, backgroundColor: budgetPct > 90 ? "#a4262c" : budgetPct > 70 ? "#ca5010" : "#0078d4" }} />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>Spent: {fmtSh(kpi.spentBudget || 0)}</span>
              <span>Total: {fmtSh(kpi.totalBudget || 0)}</span>
            </div>
          </div>

          {/* Incoming docs / Procurement plan */}
          <div className="flex-1 border-b border-gray-200">
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">PROCUREMENT PLAN</span>
              <button onClick={() => navigate("/procurement-planning")} className="text-[10px] text-blue-600 hover:underline">View Plan</button>
            </div>
            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {[
                { label: "APPROVED ITEMS", val: kpi.approvedPlans || 0, color: "#107c10" },
                { label: "PLAN BUDGET", val: fmtSh(kpi.planBudget || 0), color: "#0078d4" },
                { label: "SUPPLIERS", val: kpi.activeSuppliers || 0, color: "#8764b8" },
              ].map(t => (
                <button key={t.label} onClick={() => navigate("/procurement-planning")}
                  className="bg-white px-2 py-3 text-left hover:bg-gray-50 transition-colors group">
                  <p className="text-[8px] font-bold uppercase tracking-wide text-gray-500 leading-tight mb-1">{t.label}</p>
                  <p className="text-base font-bold leading-none" style={{ color: t.color }}>{t.val}</p>
                  <ChevronRight className="w-3 h-3 text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          {/* Navigation shortcuts */}
          <div className="shrink-0 p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">NAVIGATE TO</p>
            <div className="space-y-1">
              {[
                { label: "Financial Dashboard", path: "/financials/dashboard", color: "#1F6090" },
                { label: "Chart of Accounts", path: "/financials/chart-of-accounts", color: "#1F6090" },
                { label: "Fixed Assets Register", path: "/financials/fixed-assets", color: "#C45911" },
                { label: "Tender Evaluations", path: "/bid-evaluations", color: "#00695C" },
                ...(isAdmin ? [{ label: "Database Admin", path: "/admin/database", color: "#333" }] : []),
              ].map(l => (
                <button key={l.label} onClick={() => navigate(l.path)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left hover:bg-gray-100 transition-colors group">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-gray-700 group-hover:text-blue-600 transition-colors">{l.label}</span>
                  <ChevronRight className="w-3 h-3 text-gray-300 ml-auto opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
