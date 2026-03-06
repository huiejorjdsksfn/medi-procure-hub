import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// ── icon imports ──────────────────────────────────────────────────────────────
import {
  Plus, ChevronRight, RefreshCw, ArrowRight, AlertTriangle,
  TrendingUp, TrendingDown, Package, ShoppingCart, Users,
  FileText, Truck, Gavel, ClipboardList, DollarSign,
  CheckCircle, Shield, BarChart3, PiggyBank, Building2,
  Activity, BookMarked, Receipt, Calendar, Bell, Star
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
interface KPI { [key: string]: number | string }

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `KES ${(n/1_000).toFixed(0)}K`
  : `KES ${n.toLocaleString()}`;

const today = new Date().toISOString().split("T")[0];
const thisMonth = today.slice(0, 7);

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate = useNavigate();
  const [kpi, setKpi] = useState<KPI>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, pos, items, supp, pv, rv, ncr, insp, tenders, budgets, grn, contracts, log] =
        await Promise.all([
          (supabase as any).from("requisitions").select("status, created_at"),
          (supabase as any).from("purchase_orders").select("status, total_amount, created_at"),
          (supabase as any).from("items").select("quantity_in_stock, reorder_level, status"),
          (supabase as any).from("suppliers").select("status, rating"),
          (supabase as any).from("payment_vouchers").select("status, amount, voucher_date"),
          (supabase as any).from("receipt_vouchers").select("amount, receipt_date"),
          (supabase as any).from("non_conformance").select("status, severity"),
          (supabase as any).from("inspections").select("result"),
          (supabase as any).from("tenders").select("status"),
          (supabase as any).from("budgets").select("allocated_amount, spent_amount, status"),
          (supabase as any).from("goods_received").select("id, created_at"),
          (supabase as any).from("contracts").select("status"),
          (supabase as any).from("audit_log").select("action, module, user_name, entity_type, created_at").order("created_at", { ascending: false }).limit(10),
        ]);

      const pvRows  = pv.data  || [];
      const rvRows  = rv.data  || [];
      const itemR   = items.data || [];
      const reqR    = reqs.data  || [];
      const posR    = pos.data   || [];
      const ncrR    = ncr.data   || [];

      const pvMTD   = pvRows.filter((v: any) => v.voucher_date?.startsWith(thisMonth));
      const rvMTD   = rvRows.filter((v: any) => v.receipt_date?.startsWith(thisMonth));

      setKpi({
        // Procurement
        pendingReqs:   reqR.filter((r: any) => r.status === "pending").length,
        approvedReqs:  reqR.filter((r: any) => r.status === "approved").length,
        totalReqs:     reqR.length,
        pendingPOs:    posR.filter((p: any) => ["draft","pending"].includes(p.status)).length,
        approvedPOs:   posR.filter((p: any) => p.status === "approved").length,
        issuedPOs:     posR.filter((p: any) => p.status === "issued").length,
        totalPOs:      posR.length,
        grnCount:      (grn.data||[]).length,
        activeContracts:(contracts.data||[]).filter((c: any) => c.status === "active").length,
        // Tenders
        draftTenders:  (tenders.data||[]).filter((t: any) => t.status === "draft").length,
        openTenders:   (tenders.data||[]).filter((t: any) => t.status === "published").length,
        closedTenders: (tenders.data||[]).filter((t: any) => t.status === "closed").length,
        awardedTenders:(tenders.data||[]).filter((t: any) => t.status === "awarded").length,
        // Financials
        pendingPayments: pvRows.filter((v: any) => v.status === "pending").length,
        approvedPayments:pvRows.filter((v: any) => v.status === "approved").length,
        paidPayments:    pvRows.filter((v: any) => v.status === "paid").length,
        pendingPayAmt:   pvRows.filter((v: any) => ["pending","approved"].includes(v.status)).reduce((s: number, v: any) => s + Number(v.amount), 0),
        receiptsMTD:     rvMTD.reduce((s: number, v: any) => s + Number(v.amount), 0),
        paymentsMTD:     pvMTD.filter((v: any) => v.status === "paid").reduce((s: number, v: any) => s + Number(v.amount), 0),
        totalReceipts:   rvRows.length,
        totalPayments:   pvRows.length,
        // Budget
        totalBudget:     (budgets.data||[]).reduce((s: number, b: any) => s + Number(b.allocated_amount), 0),
        spentBudget:     (budgets.data||[]).reduce((s: number, b: any) => s + Number(b.spent_amount), 0),
        activeBudgets:   (budgets.data||[]).filter((b: any) => b.status === "active").length,
        // Inventory
        lowStock:   itemR.filter((i: any) => Number(i.quantity_in_stock) <= Number(i.reorder_level || 10)).length,
        totalItems: itemR.length,
        activeItems:itemR.filter((i: any) => i.status === "active").length,
        activeSuppliers:(supp.data||[]).filter((s: any) => s.status === "active").length,
        totalSuppliers: (supp.data||[]).length,
        // Quality
        openNCRs:     ncrR.filter((n: any) => n.status === "open").length,
        criticalNCRs: ncrR.filter((n: any) => n.severity === "critical").length,
        passedInsp:   (insp.data||[]).filter((i: any) => i.result === "pass").length,
        pendingInsp:  (insp.data||[]).filter((i: any) => i.result === "pending").length,
        totalInsp:    (insp.data||[]).length,
      });

      setActivity(log.data || []);

      // Build tasks list from pending items
      const taskList: any[] = [];
      if (reqR.filter((r: any) => r.status === "pending").length > 0)
        taskList.push({ label: "Pending Requisitions to Approve", count: reqR.filter((r: any) => r.status === "pending").length, path: "/requisitions", color: "amber" });
      if (pvRows.filter((v: any) => v.status === "pending").length > 0)
        taskList.push({ label: "Payment Vouchers Awaiting Approval", count: pvRows.filter((v: any) => v.status === "pending").length, path: "/vouchers/payment", color: "orange" });
      if (itemR.filter((i: any) => Number(i.quantity_in_stock) <= Number(i.reorder_level || 10)).length > 0)
        taskList.push({ label: "Items Below Reorder Level", count: itemR.filter((i: any) => Number(i.quantity_in_stock) <= Number(i.reorder_level || 10)).length, path: "/items", color: "red" });
      if (ncrR.filter((n: any) => n.status === "open").length > 0)
        taskList.push({ label: "Open Non-Conformance Reports", count: ncrR.filter((n: any) => n.status === "open").length, path: "/quality/non-conformance", color: "rose" });
      if ((insp.data||[]).filter((i: any) => i.result === "pending").length > 0)
        taskList.push({ label: "Inspections Pending Results", count: (insp.data||[]).filter((i: any) => i.result === "pending").length, path: "/quality/inspections", color: "blue" });
      setTasks(taskList);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tables = ["requisitions","purchase_orders","items","suppliers","payment_vouchers","receipt_vouchers","non_conformance","inspections","tenders","audit_log","budgets"];
    const chs = tables.map(t =>
      (supabase as any).channel(`bc-${t}`)
        .on("postgres_changes", { event: "*", schema: "public", table: t }, () => load())
        .subscribe()
    );
    return () => { chs.forEach(c => supabase.removeChannel(c)); };
  }, [load]);

  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");

  // ── Sub-nav tabs ─────────────────────────────────────────────────────────
  const tabs = [
    { id: "home", label: "Home" },
    { id: "finance", label: "Finance" },
    { id: "purchasing", label: "Purchasing" },
    { id: "inventory", label: "Inventory" },
    { id: "quality", label: "Quality" },
    { id: "approvals", label: "Approvals" },
    ...(isAdmin ? [{ id: "admin", label: "Setup & Admin" }] : []),
  ];

  // ── Quick links ──────────────────────────────────────────────────────────
  const quickLinks = [
    { label: "Suppliers", path: "/suppliers" },
    { label: "Items", path: "/items" },
    { label: "Purchase Orders", path: "/purchase-orders" },
    { label: "Bank Accounts", path: "/financials/dashboard" },
    { label: "Chart of Accounts", path: "/financials/chart-of-accounts" },
    { label: "Tenders", path: "/tenders" },
    { label: "Budgets", path: "/financials/budgets" },
  ];

  // ── Action panel ─────────────────────────────────────────────────────────
  const actions = {
    create: [
      { label: "New Requisition", path: "/requisitions" },
      { label: "New Purchase Order", path: "/purchase-orders" },
      { label: "Payment Voucher", path: "/vouchers/payment" },
      { label: "Receipt Voucher", path: "/vouchers/receipt" },
      { label: "Sales Invoice", path: "/vouchers/sales" },
      { label: "New Tender", path: "/tenders" },
    ],
    nav: [
      { label: "Goods Received", path: "/goods-received" },
      { label: "Suppliers", path: "/suppliers" },
      { label: "Inspections", path: "/quality/inspections" },
    ],
    reports: [
      { label: "Statement of Cash Flows", path: "/financials/dashboard" },
      { label: "Balance Sheet", path: "/financials/chart-of-accounts" },
      { label: "Income Statement", path: "/financials/dashboard" },
      { label: "Procurement Report", path: "/reports" },
    ],
  };

  // ── Tile sections ─────────────────────────────────────────────────────────
  const procurementTiles = [
    { label: "PENDING REQUISITIONS", val: kpi.pendingReqs, sub: "awaiting approval", path: "/requisitions", urgent: Number(kpi.pendingReqs) > 0 },
    { label: "PURCHASE ORDERS", val: kpi.pendingPOs, sub: "draft / pending", path: "/purchase-orders" },
    { label: "ISSUED POs", val: kpi.issuedPOs, sub: "to suppliers", path: "/purchase-orders" },
    { label: "GOODS RECEIVED", val: kpi.grnCount, sub: "total GRNs", path: "/goods-received" },
    { label: "OPEN TENDERS", val: kpi.openTenders, sub: "published", path: "/tenders" },
    { label: "ACTIVE CONTRACTS", val: kpi.activeContracts, sub: "running", path: "/contracts" },
  ];

  const financialTiles = [
    { label: "PENDING PAYMENTS", val: kpi.pendingPayments, sub: `${fmt(Number(kpi.pendingPayAmt))}`, path: "/vouchers/payment", urgent: Number(kpi.pendingPayments) > 0 },
    { label: "PAYMENTS MTD", val: kpi.paidPayments, sub: fmt(Number(kpi.paymentsMTD)), path: "/vouchers/payment" },
    { label: "RECEIPTS MTD", val: kpi.totalReceipts, sub: fmt(Number(kpi.receiptsMTD)), path: "/vouchers/receipt" },
    { label: "JOURNAL VOUCHERS", val: "→", sub: "view all", path: "/vouchers/journal" },
    { label: "ACTIVE BUDGETS", val: kpi.activeBudgets, sub: "financial year", path: "/financials/budgets" },
    { label: "FIXED ASSETS", val: "→", sub: "asset register", path: "/financials/fixed-assets" },
  ];

  const qualityTiles = [
    { label: "OPEN NCRs", val: kpi.openNCRs, sub: `${kpi.criticalNCRs} critical`, path: "/quality/non-conformance", urgent: Number(kpi.criticalNCRs) > 0 },
    { label: "PENDING INSPECTIONS", val: kpi.pendingInsp, sub: "awaiting result", path: "/quality/inspections", urgent: Number(kpi.pendingInsp) > 0 },
    { label: "PASSED THIS MONTH", val: kpi.passedInsp, sub: "inspections passed", path: "/quality/inspections" },
  ];

  const inventoryTiles = [
    { label: "LOW STOCK ITEMS", val: kpi.lowStock, sub: "below reorder level", path: "/items", urgent: Number(kpi.lowStock) > 0 },
    { label: "TOTAL ITEMS", val: kpi.activeItems, sub: "active in catalogue", path: "/items" },
    { label: "ACTIVE SUPPLIERS", val: kpi.activeSuppliers, sub: `of ${kpi.totalSuppliers} total`, path: "/suppliers" },
  ];

  const budgetPct = kpi.totalBudget ? Math.round(Number(kpi.spentBudget) / Number(kpi.totalBudget) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f3f2f1] font-sans">
      {/* ── Top navigation bar ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#e1dfdd] sticky top-0 z-30 shadow-sm">
        {/* Company row */}
        <div className="flex items-center gap-4 px-6 py-2 border-b border-[#e1dfdd]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0078d4] rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">EL5</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#323130] leading-none">Embu Level 5 Hospital</p>
              <p className="text-xs text-[#605e5c]">MediProcure ERP</p>
            </div>
          </div>
          <div className="w-px h-6 bg-[#e1dfdd] mx-2" />
          <nav className="flex items-center gap-0 flex-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px
                  ${activeTab === t.id
                    ? "border-[#0078d4] text-[#0078d4]"
                    : "border-transparent text-[#323130] hover:text-[#0078d4] hover:bg-[#f3f2f1]"}`}>
                {t.label}
              </button>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}
            className="text-[#605e5c] hover:bg-[#f3f2f1] ml-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Quick links row */}
        <div className="flex items-center gap-0 px-6 py-0.5 overflow-x-auto">
          {quickLinks.map(l => (
            <button key={l.label} onClick={() => navigate(l.path)}
              className="px-3 py-1.5 text-xs text-[#0078d4] hover:underline hover:bg-[#f3f2f1] rounded whitespace-nowrap transition-colors">
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="px-6 py-5 max-w-[1400px] mx-auto">

        {/* Hero row: headline + actions */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 mb-6">
          {/* Headline */}
          <div className="bg-white border border-[#e1dfdd] rounded p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#605e5c] mb-2">WELCOME</p>
            <h1 className="text-3xl font-bold text-[#323130] leading-tight mb-1">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},
            </h1>
            <h2 className="text-2xl font-light text-[#0078d4] mb-4">
              {profile?.full_name || "Administrator"}
            </h2>
            <p className="text-sm text-[#605e5c] mb-5">
              {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} &nbsp;·&nbsp; Embu Level 5 Hospital
            </p>
            {/* 3 big headline KPIs */}
            <div className="grid grid-cols-3 gap-4 border-t border-[#e1dfdd] pt-5">
              {[
                { label: "RECEIPTS THIS MONTH", val: fmt(Number(kpi.receiptsMTD || 0)), color: "#107c10", urgent: false },
                { label: "OVERDUE PAYMENTS", val: fmt(Number(kpi.pendingPayAmt || 0)), color: Number(kpi.pendingPayments) > 0 ? "#a4262c" : "#107c10", urgent: Number(kpi.pendingPayments) > 0 },
                { label: "BUDGET UTILIZATION", val: `${budgetPct}%`, color: budgetPct > 90 ? "#a4262c" : budgetPct > 70 ? "#ca5010" : "#107c10", urgent: budgetPct > 90 },
              ].map(k => (
                <div key={k.label} className="group cursor-pointer">
                  <p className="text-xs font-semibold text-[#605e5c] uppercase tracking-wide mb-1">{k.label}</p>
                  <p className={`text-3xl font-bold`} style={{ color: k.color }}>{k.val}</p>
                  <div className={`h-[3px] w-16 mt-2 rounded`} style={{ backgroundColor: k.color }} />
                  <button onClick={() => navigate("/financials/dashboard")}
                    className="text-xs text-[#0078d4] hover:underline mt-2 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />See more
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions panel */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#605e5c] mb-4">ACTIONS</p>
            <div className="grid grid-cols-2 gap-x-6">
              {/* Create actions */}
              <div className="space-y-1.5">
                {actions.create.map(a => (
                  <button key={a.label} onClick={() => navigate(a.path)}
                    className="flex items-center gap-2 text-sm text-[#0078d4] hover:underline w-full text-left group">
                    <Plus className="w-3.5 h-3.5 shrink-0 text-[#0078d4]" />
                    <span>{a.label}</span>
                  </button>
                ))}
                <div className="border-t border-[#e1dfdd] my-2" />
                {actions.nav.map(a => (
                  <button key={a.label} onClick={() => navigate(a.path)}
                    className="flex items-center gap-2 text-sm text-[#0078d4] hover:underline w-full text-left">
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
              {/* Report links */}
              <div className="space-y-1.5">
                {actions.reports.map(r => (
                  <button key={r.label} onClick={() => navigate(r.path)}
                    className="flex items-center gap-2 text-sm text-[#0078d4] hover:underline w-full text-left">
                    <FileText className="w-3.5 h-3.5 shrink-0 text-[#605e5c]" />
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Activities: big number KPIs ─────────────────────────────── */}
        <div className="bg-white border border-[#e1dfdd] rounded shadow-sm mb-5">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#e1dfdd]">
            <p className="text-sm font-bold text-[#323130] uppercase tracking-wide">Activities</p>
            <button onClick={load} className="text-xs text-[#0078d4] hover:underline flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#e1dfdd] px-0">
            {[
              { label: "PENDING REQUISITIONS", val: kpi.pendingReqs || 0, color: Number(kpi.pendingReqs) > 0 ? "#ca5010" : "#107c10", path: "/requisitions" },
              { label: "ACTIVE PURCHASE ORDERS", val: kpi.approvedPOs || 0, color: "#0078d4", path: "/purchase-orders" },
              { label: "PENDING APPROVALS", val: Number(kpi.pendingPayments || 0) + Number(kpi.pendingReqs || 0), color: Number(kpi.pendingPayments) + Number(kpi.pendingReqs) > 0 ? "#a4262c" : "#107c10", path: "/vouchers/payment" },
              { label: "LOW STOCK ALERTS", val: kpi.lowStock || 0, color: Number(kpi.lowStock) > 0 ? "#a4262c" : "#107c10", path: "/items" },
            ].map(k => (
              <div key={k.label} className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c] mb-2">{k.label}</p>
                <p className={`text-[42px] font-bold leading-none`} style={{ color: k.color }}>{k.val}</p>
                <div className="h-[3px] w-10 mt-3 rounded" style={{ backgroundColor: k.color }} />
                <button onClick={() => navigate(k.path)} className="text-xs text-[#0078d4] hover:underline mt-2 flex items-center gap-0.5">
                  <ChevronRight className="w-3 h-3" />See more
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tile grid rows ──────────────────────────────────────────── */}
        {/* Procurement tiles */}
        <TileSection label="PROCUREMENT" tiles={procurementTiles} navigate={navigate} />

        {/* Financials + Quality row */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5 mb-5">
          <TileSection label="FINANCIALS" tiles={financialTiles} navigate={navigate} inline />
          <TileSection label="QUALITY" tiles={qualityTiles} navigate={navigate} inline />
        </div>

        {/* Inventory + Tasks row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-5 mb-5">
          <TileSection label="INVENTORY" tiles={inventoryTiles} navigate={navigate} inline />

          {/* My Tasks */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e1dfdd]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#605e5c]">MY PENDING TASKS</p>
            </div>
            <div className="p-3">
              {tasks.length === 0 ? (
                <div className="py-6 text-center">
                  <CheckCircle className="w-8 h-8 text-[#107c10] mx-auto mb-2" />
                  <p className="text-sm text-[#605e5c]">All clear! No pending tasks.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t, i) => (
                    <button key={i} onClick={() => navigate(t.path)}
                      className={`w-full flex items-center justify-between p-3 rounded text-left hover:bg-[#f3f2f1] border border-[#e1dfdd] transition-colors`}>
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={`w-4 h-4 ${t.color === "red" || t.color === "rose" ? "text-red-500" : "text-amber-500"}`} />
                        <span className="text-sm text-[#323130]">{t.label}</span>
                      </div>
                      <span className={`text-lg font-bold ${t.color === "red" || t.color === "rose" ? "text-red-600" : "text-amber-600"}`}>{t.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick START create panel */}
          <div className="bg-white border border-[#e1dfdd] rounded shadow-sm">
            <div className="px-4 py-3 border-b border-[#e1dfdd]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#605e5c]">START</p>
            </div>
            <div className="p-3 grid grid-cols-3 gap-2">
              {[
                { label: "Requisition", path: "/requisitions", icon: ClipboardList },
                { label: "Payment", path: "/vouchers/payment", icon: DollarSign },
                { label: "Receipt", path: "/vouchers/receipt", icon: Receipt },
                { label: "Purchase Inv.", path: "/vouchers/purchase", icon: FileText },
                { label: "Sales Invoice", path: "/vouchers/sales", icon: TrendingUp },
                { label: "Inspection", path: "/quality/inspections", icon: Shield },
                { label: "Tender", path: "/tenders", icon: Gavel },
                { label: "Plan Item", path: "/procurement-planning", icon: Calendar },
                { label: "Journal", path: "/vouchers/journal", icon: BookMarked },
              ].map(s => (
                <button key={s.label} onClick={() => navigate(s.path)}
                  className="flex flex-col items-center gap-1.5 p-2 border border-[#e1dfdd] rounded hover:border-[#0078d4] hover:bg-[#f0f6ff] transition-all group">
                  <div className="w-8 h-8 bg-[#f0f6ff] group-hover:bg-[#0078d4] rounded flex items-center justify-center transition-colors">
                    <s.icon className="w-4 h-4 text-[#0078d4] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-[#323130] text-center leading-tight">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Live Activity Feed ─────────────────────────────────────── */}
        <div className="bg-white border border-[#e1dfdd] rounded shadow-sm mb-5">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#e1dfdd]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0078d4]" />
              <p className="text-sm font-bold text-[#323130] uppercase tracking-wide">Live Activity Feed</p>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <button onClick={() => navigate("/audit-log")} className="text-xs text-[#0078d4] hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-x divide-[#e1dfdd]">
            {activity.slice(0, 5).map((a, i) => (
              <div key={i} className="px-4 py-3 hover:bg-[#f3f2f1] transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-[#0078d4]" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#605e5c]">{a.entity_type || a.module}</span>
                </div>
                <p className="text-sm font-medium text-[#323130] capitalize">{a.action?.replace(/_/g, " ")}</p>
                <p className="text-xs text-[#605e5c] mt-0.5">{a.user_name || "System"}</p>
                <p className="text-[10px] text-[#a19f9d] mt-0.5">{a.created_at ? new Date(a.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) : ""}</p>
              </div>
            ))}
            {activity.length === 0 && (
              <div className="col-span-5 py-8 text-center text-sm text-[#605e5c]">No recent activity</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-[#a19f9d] pb-4">
          <span>Embu Level 5 Hospital · MediProcure ERP · Kenya</span>
          <span>Realtime sync active · {new Date().toLocaleTimeString("en-KE")}</span>
        </div>
      </div>
    </div>
  );
}

// ── Tile Section component ────────────────────────────────────────────────────
function TileSection({ label, tiles, navigate, inline = false }: {
  label: string; tiles: any[]; navigate: Function; inline?: boolean;
}) {
  return (
    <div className={`bg-white border border-[#e1dfdd] rounded shadow-sm ${inline ? "" : "mb-5"}`}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e1dfdd]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#605e5c]">{label}</p>
      </div>
      <div className={`grid ${tiles.length <= 3 ? "grid-cols-3" : tiles.length <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"} gap-0 divide-x divide-y divide-[#e1dfdd]`}>
        {tiles.map((t, i) => (
          <button key={i} onClick={() => navigate(t.path)}
            className={`p-3 text-left hover:bg-[#f3f2f1] transition-colors group relative overflow-hidden flex flex-col
              ${t.urgent ? "bg-[#fdf6f6]" : ""}`}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#605e5c] mb-2 leading-tight">{t.label}</p>
            <p className={`text-3xl font-bold leading-none ${t.urgent ? "text-[#a4262c]" : "text-[#0078d4]"}`}>
              {typeof t.val === "number" ? t.val : t.val || 0}
            </p>
            <p className="text-[10px] text-[#605e5c] mt-1 truncate">{t.sub}</p>
            <ChevronRight className={`w-3.5 h-3.5 mt-auto self-end opacity-0 group-hover:opacity-100 transition-opacity ${t.urgent ? "text-[#a4262c]" : "text-[#0078d4]"}`} />
            {t.urgent && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#a4262c]" />}
          </button>
        ))}
      </div>
    </div>
  );
}
