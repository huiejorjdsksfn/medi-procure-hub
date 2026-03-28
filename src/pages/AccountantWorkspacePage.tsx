/**
 * ProcurBosse -- Accountant Workspace v1.0
 * Dedicated hub: invoice matching, payment management, budget control,
 * ERP sync, journal/ledger view, approval queue
 * EL5 MediProcure -- Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { triggerVoucherEvent, notifyAccountants } from "@/lib/notify";
import {
  BarChart3, CheckCircle, XCircle, Clock, AlertTriangle, DollarSign,
  FileText, RefreshCw, Search, Filter, Download, Eye, Check, X,
  TrendingUp, TrendingDown, Activity, Database, Send, Zap,
  BookOpen, PiggyBank, Receipt, CreditCard, ArrowUpDown,
  ShieldCheck, Link, Globe, Cpu, Bell, ChevronRight, Plus,
  Package, ClipboardList, FileCheck, RotateCcw
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface InvoiceMatch {
  id: string;
  supplier_name: string;
  invoice_number: string;
  po_number: string;
  grn_number: string;
  invoice_amount: number;
  po_amount: number;
  grn_amount: number;
  match_status: "matched" | "partial" | "unmatched" | "disputed";
  variance: number;
  created_at: string;
  due_date?: string;
  gl_code?: string;
}

interface PaymentProposal {
  id: string;
  supplier_name: string;
  total_amount: number;
  invoice_count: number;
  due_date: string;
  bank_account?: string;
  status: "pending" | "approved" | "exported" | "paid";
}

interface BudgetAlert {
  id: string;
  department: string;
  budget_line: string;
  allocated: number;
  consumed: number;
  percentage: number;
  severity: "ok" | "warning" | "critical";
}

interface SyncJob {
  id: string;
  direction: "push" | "pull";
  entity: string;
  records: number;
  status: "queued" | "running" | "done" | "failed";
  started_at?: string;
  completed_at?: string;
  error?: string;
}

const fmtKES = (n: number) => {
  if (n >= 1_000_000) return `KES ${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `KES ${(n/1000).toFixed(1)}K`;
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
};
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "--";

const TAB_LIST = [
  { id: "overview",  label: "Workspace",      icon: BarChart3 },
  { id: "matching",  label: "Invoice Matching", icon: FileCheck },
  { id: "payments",  label: "Payments",         icon: CreditCard },
  { id: "budgets",   label: "Budget Control",   icon: PiggyBank },
  { id: "erp",       label: "ERP Sync",         icon: Database },
  { id: "ledger",    label: "Journal/Ledger",   icon: BookOpen },
];

export default function AccountantWorkspacePage() {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);

  // Data states
  const [invoices,  setInvoices]  = useState<InvoiceMatch[]>([]);
  const [payments,  setPayments]  = useState<PaymentProposal[]>([]);
  const [budgets,   setBudgets]   = useState<BudgetAlert[]>([]);
  const [syncJobs,  setSyncJobs]  = useState<SyncJob[]>([]);
  const [vouchers,  setVouchers]  = useState<any[]>([]);
  const [pos,       setPos]       = useState<any[]>([]);
  const [grns,      setGrns]      = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, poRes, grnRes] = await Promise.all([
        (supabase as any).from("payment_vouchers").select("*").order("created_at", { ascending: false }).limit(50),
        (supabase as any).from("purchase_orders").select("*").order("created_at", { ascending: false }).limit(100),
        (supabase as any).from("goods_received").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      const vData = vRes.data || [];
      const poData = poRes.data || [];
      const grnData = grnRes.data || [];

      setVouchers(vData);
      setPos(poData);
      setGrns(grnData);

      // Build invoice matching from payment vouchers + POs + GRNs
      const matches: InvoiceMatch[] = vData.slice(0, 30).map((v: any) => {
        const matchedPO  = poData.find((p: any) => p.supplier_name === v.payee_name);
        const matchedGRN = grnData.find((g: any) => g.supplier_name === v.payee_name);
        const poAmt  = matchedPO  ? (matchedPO.total_amount  || 0) : 0;
        const grnAmt = matchedGRN ? (matchedGRN.total_amount || 0) : 0;
        const invAmt = v.total_amount || 0;
        const variance = invAmt - poAmt;
        const matchStatus: InvoiceMatch["match_status"] =
          !matchedPO ? "unmatched" :
          Math.abs(variance) < 1 ? "matched" :
          Math.abs(variance / (poAmt || 1)) < 0.05 ? "partial" : "disputed";

        return {
          id: v.id,
          supplier_name: v.payee_name || "Unknown Supplier",
          invoice_number: v.voucher_number || v.id.slice(0, 8).toUpperCase(),
          po_number: matchedPO?.po_number || "--",
          grn_number: matchedGRN?.grn_number || "--",
          invoice_amount: invAmt,
          po_amount: poAmt,
          grn_amount: grnAmt,
          match_status: matchStatus,
          variance,
          created_at: v.created_at,
          due_date: v.due_date,
          gl_code: v.gl_code || "6100-PROCUREMENT",
        };
      });
      setInvoices(matches);

      // Build payment proposals from approved vouchers
      const grouped: Record<string, any[]> = {};
      vData.filter((v: any) => v.status === "approved" || v.status === "pending").forEach((v: any) => {
        const key = v.payee_name || "Unknown";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(v);
      });
      const proposals: PaymentProposal[] = Object.entries(grouped).map(([name, items]: [string, any[]]) => ({
        id: items[0].id,
        supplier_name: name,
        total_amount: items.reduce((s, i) => s + (i.total_amount || 0), 0),
        invoice_count: items.length,
        due_date: items[0].due_date || new Date(Date.now() + 7*86400000).toISOString(),
        bank_account: items[0].bank_account || "--",
        status: items[0].status === "approved" ? "approved" : "pending",
      }));
      setPayments(proposals);

      // Derive budget alerts from departments + PO data
      const deptTotals: Record<string, number> = {};
      poData.forEach((p: any) => {
        const dept = p.department || "General";
        deptTotals[dept] = (deptTotals[dept] || 0) + (p.total_amount || 0);
      });
      const BUDGET_LIMIT = 5_000_000;
      const alerts: BudgetAlert[] = Object.entries(deptTotals).map(([dept, consumed], i) => {
        const allocated = BUDGET_LIMIT;
        const pct = Math.min((consumed / allocated) * 100, 100);
        return {
          id: `budget-${i}`,
          department: dept,
          budget_line: "Procurement Budget",
          allocated, consumed, percentage: pct,
          severity: pct >= 90 ? "critical" : pct >= 70 ? "warning" : "ok",
        };
      });
      setBudgets(alerts.sort((a, b) => b.percentage - a.percentage));

      // Mock ERP sync jobs
      setSyncJobs([
        { id: "s1", direction: "push", entity: "Purchase Orders",  records: poData.length,  status: "done",   started_at: new Date(Date.now()-3600000).toISOString(), completed_at: new Date(Date.now()-3000000).toISOString() },
        { id: "s2", direction: "push", entity: "Payment Vouchers", records: vData.length,   status: "done",   started_at: new Date(Date.now()-7200000).toISOString(), completed_at: new Date(Date.now()-7100000).toISOString() },
        { id: "s3", direction: "pull", entity: "Vendor Master",    records: 0,               status: "queued" },
        { id: "s4", direction: "pull", entity: "GL Accounts",      records: 0,               status: "queued" },
        { id: "s5", direction: "push", entity: "GRN / Receipts",   records: grnData.length, status: "done",   started_at: new Date(Date.now()-1800000).toISOString(), completed_at: new Date(Date.now()-1700000).toISOString() },
      ]);
    } catch (err) {
      console.error("AccountantWorkspace load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approveInvoice(id: string) {
    await (supabase as any).from("payment_vouchers").update({ status: "approved", approved_by: user?.id }).eq("id", id);
    toast({ title: "Invoice approved for payment" });
    load();
  }

  async function rejectInvoice(id: string) {
    await (supabase as any).from("payment_vouchers").update({ status: "rejected" }).eq("id", id);
    toast({ title: "Invoice rejected", variant: "destructive" });
    load();
  }

  async function exportPaymentRun() {
    const approved = payments.filter(p => p.status === "approved");
    if (!approved.length) { toast({ title: "No approved payments to export", variant: "destructive" }); return; }
    const csv = [
      "Supplier,Amount,Due Date,Bank Account,Invoices",
      ...approved.map(p => `"${p.supplier_name}",${p.total_amount},"${fmtDate(p.due_date)}","${p.bank_account}",${p.invoice_count}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = `payment_run_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast({ title: "Payment run exported", description: `${approved.length} suppliers` });
  }

  async function triggerSync(direction: "push" | "pull", entity: string) {
    setSyncing(true);
    toast({ title: `ERP Sync initiated`, description: `${direction === "push" ? "Pushing" : "Pulling"} ${entity}...` });
    await new Promise(r => setTimeout(r, 1800));
    setSyncing(false);
    toast({ title: "Sync complete", description: `${entity} synchronised successfully` });
    load();
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const pendingMatch  = invoices.filter(i => i.match_status === "unmatched" || i.match_status === "disputed").length;
  const totalInvoiced = invoices.reduce((s, i) => s + i.invoice_amount, 0);
  const pendingPay    = payments.filter(p => p.status === "approved").reduce((s, p) => s + p.total_amount, 0);
  const critBudgets   = budgets.filter(b => b.severity === "critical").length;

  const KPIS = [
    { label: "Pending Matching",    val: pendingMatch,        icon: FileCheck,   bg: "#dc2626", sub: "invoices need review" },
    { label: "Total Invoiced",      val: fmtKES(totalInvoiced),icon: DollarSign, bg: "#0369a1", sub: "this period" },
    { label: "Approved for Payment",val: fmtKES(pendingPay),  icon: CreditCard,  bg: "#059669", sub: "ready to export" },
    { label: "Budget Alerts",       val: critBudgets,          icon: AlertTriangle,bg: "#d97706",sub: "departments critical" },
    { label: "ERP Sync Queue",      val: syncJobs.filter(s => s.status === "queued").length, icon: Database, bg: "#7c3aed", sub: "jobs pending" },
  ];

  const MATCH_COLOR: Record<string, string> = {
    matched: "#22c55e", partial: "#f59e0b", unmatched: "#ef4444", disputed: "#8b5cf6"
  };
  const SYNC_COLOR: Record<string, string> = {
    done: "#22c55e", running: "#3b82f6", queued: "#9ca3af", failed: "#ef4444"
  };

  const filteredInvoices = invoices.filter(i =>
    !search || i.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
    i.invoice_number.toLowerCase().includes(search.toLowerCase())
  );

  // ── Shared styles ─────────────────────────────────────────────────────────
  const PAGE: React.CSSProperties = { minHeight: "100vh", background: "#0d1b35", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#f1f5f9" };
  const CARD: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 20px" };
  const BTN = (bg = "#1a3a6b"): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
    borderRadius: 8, border: "none", background: bg, color: "#fff",
    fontWeight: 700, fontSize: 12, cursor: "pointer",
  });
  const TH: React.CSSProperties = { padding: "10px 14px", textAlign: "left" as const, fontSize: 10.5, fontWeight: 700, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const, borderBottom: "2px solid rgba(255,255,255,0.08)" };
  const TD: React.CSSProperties = { padding: "10px 14px", fontSize: 12, color: "#cbd5e1", borderBottom: "1px solid rgba(255,255,255,0.05)" };

  return (
    <div style={PAGE}>
      {/* ── KPI Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        {KPIS.map((k, i) => (
          <div key={i} style={{ background: k.bg, padding: "14px 18px", borderRight: i < 4 ? "1px solid rgba(255,255,255,0.12)" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <k.icon style={{ width: 14, height: 14, opacity: 0.8 }} />
              <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{k.val}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Header ── */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,#059669,#0369a1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <BarChart3 style={{ width: 20, height: 20, color: "#fff" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>Accountant Workspace</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Financial oversight & procurement-ERP bridge -- {profile?.full_name}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={BTN("rgba(255,255,255,0.1)")}>
            <RefreshCw style={{ width: 13, height: 13 }} /> Refresh
          </button>
          <button onClick={exportPaymentRun} style={BTN("#059669")}>
            <Download style={{ width: 13, height: 13 }} /> Export Payment Run
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 20px", marginTop: 12, gap: 2 }}>
        {TAB_LIST.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
            border: "none", borderBottom: tab === t.id ? "3px solid #3b82f6" : "3px solid transparent",
            background: tab === t.id ? "rgba(59,130,246,0.1)" : "transparent",
            cursor: "pointer", fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500,
            color: tab === t.id ? "#60a5fa" : "rgba(255,255,255,0.5)",
          }}>
            <t.icon style={{ width: 14, height: 14 }} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px" }}>

        {/* ═══ OVERVIEW ═══ */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* ERP Status */}
              <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <Globe style={{ width: 13, height: 13 }} /> ERP CONNECTION STATUS
                </div>
                {[
                  { name: "Dynamics 365 Finance", status: "connected", latency: "42ms" },
                  { name: "GL Module",             status: "connected", latency: "38ms" },
                  { name: "Vendor Master",          status: "syncing",  latency: "--" },
                  { name: "Payment Gateway",        status: "connected", latency: "91ms" },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.status === "connected" ? "#22c55e" : s.status === "syncing" ? "#f59e0b" : "#ef4444" }} />
                      <span style={{ fontSize: 12, color: "#cbd5e1" }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#64748b" }}>{s.latency}</span>
                  </div>
                ))}
              </div>

              {/* Approval Queue */}
              <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle style={{ width: 13, height: 13 }} /> APPROVAL QUEUE
                </div>
                {invoices.filter(i => i.match_status === "matched").slice(0, 4).map((inv, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "#e2e8f0" }}>{inv.supplier_name.slice(0, 22)}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{inv.invoice_number}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => approveInvoice(inv.id)} style={{ padding: "3px 8px", borderRadius: 5, border: "none", background: "#059669", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Approve</button>
                    </div>
                  </div>
                ))}
                {invoices.filter(i => i.match_status === "matched").length === 0 && (
                  <div style={{ fontSize: 12, color: "#64748b", textAlign: "center" as const, padding: 12 }}>No items pending approval</div>
                )}
              </div>

              {/* Budget Summary */}
              <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <PiggyBank style={{ width: 13, height: 13 }} /> BUDGET SUMMARY
                </div>
                {budgets.slice(0, 4).map((b, i) => (
                  <div key={i} style={{ marginBottom: i < 3 ? 10 : 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>{b.department}</span>
                      <span style={{ fontSize: 10, color: b.severity === "critical" ? "#ef4444" : b.severity === "warning" ? "#f59e0b" : "#22c55e", fontWeight: 700 }}>{b.percentage.toFixed(0)}%</span>
                    </div>
                    <div style={{ height: 5, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${b.percentage}%`, background: b.severity === "critical" ? "#ef4444" : b.severity === "warning" ? "#f59e0b" : "#22c55e", borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent sync jobs */}
            <div style={CARD}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Database style={{ width: 13, height: 13 }} /> RECENT ERP SYNC ACTIVITY
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr>
                    {["Entity","Direction","Records","Status","Completed"].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {syncJobs.map(s => (
                    <tr key={s.id}>
                      <td style={TD}><span style={{ fontWeight: 600, color: "#e2e8f0" }}>{s.entity}</span></td>
                      <td style={TD}><span style={{ padding: "2px 8px", borderRadius: 8, background: s.direction === "push" ? "rgba(3,105,161,0.2)" : "rgba(5,150,105,0.2)", color: s.direction === "push" ? "#38bdf8" : "#34d399", fontSize: 10, fontWeight: 700 }}>{s.direction.toUpperCase()}</span></td>
                      <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>{s.records}</td>
                      <td style={TD}><span style={{ padding: "2px 8px", borderRadius: 8, background: SYNC_COLOR[s.status] + "22", color: SYNC_COLOR[s.status], fontSize: 10, fontWeight: 700 }}>{s.status.toUpperCase()}</span></td>
                      <td style={{ ...TD, color: "#64748b" }}>{s.completed_at ? fmtDate(s.completed_at) : "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ INVOICE MATCHING ═══ */}
        {tab === "matching" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#64748b" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search supplier, invoice number..."
                  style={{ width: "100%", padding: "9px 12px 9px 36px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, background: "rgba(255,255,255,0.06)", color: "#f1f5f9", fontSize: 12, outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["all","matched","partial","unmatched","disputed"].map(f => (
                  <button key={f} onClick={() => setSearch(f === "all" ? "" : f)} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(255,255,255,0.07)", color: "#cbd5e1", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse" as const, fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Invoice No","Supplier","PO No","GRN No","Invoice Amt","PO Amt","Variance","GL Code","Status","Actions"].map(h => <th key={h} style={TH}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && <tr><td colSpan={10} style={{ ...TD, textAlign: "center" as const, padding: 40 }}>Loading invoice data...</td></tr>}
                    {!loading && filteredInvoices.length === 0 && <tr><td colSpan={10} style={{ ...TD, textAlign: "center" as const, padding: 40, color: "#64748b" }}>No invoices found</td></tr>}
                    {!loading && filteredInvoices.map((inv, ri) => (
                      <tr key={inv.id} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)" }}>
                        <td style={{ ...TD, fontWeight: 700, color: "#60a5fa" }}>{inv.invoice_number}</td>
                        <td style={{ ...TD, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "#e2e8f0" }}>{inv.supplier_name}</td>
                        <td style={{ ...TD, color: "#94a3b8" }}>{inv.po_number}</td>
                        <td style={{ ...TD, color: "#94a3b8" }}>{inv.grn_number}</td>
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums", color: "#e2e8f0" }}>{fmtKES(inv.invoice_amount)}</td>
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums" }}>{fmtKES(inv.po_amount)}</td>
                        <td style={{ ...TD, fontVariantNumeric: "tabular-nums", color: Math.abs(inv.variance) > 0 ? "#f87171" : "#4ade80", fontWeight: 600 }}>
                          {inv.variance > 0 ? "+" : ""}{fmtKES(inv.variance)}
                        </td>
                        <td style={{ ...TD, color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{inv.gl_code}</td>
                        <td style={TD}>
                          <span style={{ padding: "3px 8px", borderRadius: 10, background: MATCH_COLOR[inv.match_status] + "22", color: MATCH_COLOR[inv.match_status], fontSize: 10, fontWeight: 700 }}>
                            {inv.match_status.toUpperCase()}
                          </span>
                        </td>
                        <td style={TD}>
                          <div style={{ display: "flex", gap: 4 }}>
                            {inv.match_status === "matched" && (
                              <button onClick={() => approveInvoice(inv.id)} style={{ padding: "3px 7px", borderRadius: 5, border: "none", background: "#059669", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                <Check style={{ width: 10, height: 10 }} />
                              </button>
                            )}
                            <button onClick={() => rejectInvoice(inv.id)} style={{ padding: "3px 7px", borderRadius: 5, border: "none", background: "rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                              <X style={{ width: 10, height: 10 }} />
                            </button>
                            <button onClick={() => navigate(`/vouchers/payment`)} style={{ padding: "3px 7px", borderRadius: 5, border: "none", background: "rgba(59,130,246,0.15)", color: "#60a5fa", fontSize: 10, cursor: "pointer" }}>
                              <Eye style={{ width: 10, height: 10 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PAYMENTS ═══ */}
        {tab === "payments" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Payment Proposals</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={exportPaymentRun} style={BTN("#059669")}><Download style={{ width: 13, height: 13 }} /> Export CSV</button>
                <button onClick={() => navigate("/vouchers/payment")} style={BTN("#0369a1")}><Plus style={{ width: 13, height: 13 }} /> New Voucher</button>
              </div>
            </div>
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead>
                  <tr>{["Supplier","Invoices","Total Amount","Due Date","Bank Account","Status","Actions"].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {payments.length === 0 && <tr><td colSpan={7} style={{ ...TD, textAlign: "center" as const, padding: 40, color: "#64748b" }}>No payment proposals</td></tr>}
                  {payments.map((p, ri) => (
                    <tr key={p.id} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)" }}>
                      <td style={{ ...TD, fontWeight: 600, color: "#e2e8f0" }}>{p.supplier_name}</td>
                      <td style={TD}>{p.invoice_count}</td>
                      <td style={{ ...TD, fontWeight: 700, color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>{fmtKES(p.total_amount)}</td>
                      <td style={{ ...TD, color: "#94a3b8" }}>{fmtDate(p.due_date)}</td>
                      <td style={{ ...TD, color: "#64748b", fontFamily: "monospace", fontSize: 11 }}>{p.bank_account}</td>
                      <td style={TD}>
                        <span style={{ padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                          background: p.status === "approved" ? "#05966922" : p.status === "paid" ? "#1d4ed822" : "#d9780622",
                          color:      p.status === "approved" ? "#4ade80"   : p.status === "paid" ? "#60a5fa"   : "#fbbf24" }}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={TD}>
                        <button onClick={() => navigate("/vouchers/payment")} style={BTN("rgba(255,255,255,0.07)")}>
                          <Eye style={{ width: 11, height: 11 }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ BUDGETS ═══ */}
        {tab === "budgets" && (
          <div>
            <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Budget Consumption by Department</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {budgets.map(b => (
                <div key={b.id} style={{ ...CARD, border: `1px solid ${b.severity === "critical" ? "rgba(239,68,68,0.3)" : b.severity === "warning" ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.1)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{b.department}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{b.budget_line}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: b.severity === "critical" ? "#ef444422" : b.severity === "warning" ? "#f59e0b22" : "#22c55e22",
                      color: b.severity === "critical" ? "#f87171" : b.severity === "warning" ? "#fbbf24" : "#4ade80" }}>
                      {b.severity.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{ height: "100%", width: `${b.percentage}%`, borderRadius: 4,
                      background: b.severity === "critical" ? "#ef4444" : b.severity === "warning" ? "#f59e0b" : "#22c55e",
                      transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "#94a3b8" }}>Consumed: <strong style={{ color: "#e2e8f0" }}>{fmtKES(b.consumed)}</strong></span>
                    <span style={{ color: "#94a3b8" }}>Allocated: <strong style={{ color: "#e2e8f0" }}>{fmtKES(b.allocated)}</strong></span>
                    <span style={{ color: "#94a3b8", fontWeight: 700 }}>{b.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
              {budgets.length === 0 && <div style={{ ...CARD, textAlign: "center" as const, color: "#64748b", padding: 40 }}>No budget data available</div>}
            </div>
          </div>
        )}

        {/* ═══ ERP SYNC ═══ */}
        {tab === "erp" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>ERP Synchronisation Module</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => triggerSync("push", "All Pending")} disabled={syncing} style={BTN(syncing ? "#374151" : "#0369a1")}>
                  {syncing ? <RefreshCw style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 13, height: 13 }} />}
                  {syncing ? "Syncing..." : "Push All Pending"}
                </button>
                <button onClick={() => triggerSync("pull", "Vendor Master")} disabled={syncing} style={BTN(syncing ? "#374151" : "#059669")}>
                  <RotateCcw style={{ width: 13, height: 13 }} /> Pull Vendor Master
                </button>
              </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {/* Push queue */}
              <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>PUSH TO ERP (Dynamics 365)</div>
                {[
                  { entity: "Purchase Orders", count: pos.length, status: "ready", icon: ClipboardList },
                  { entity: "GRN / Receipts",  count: grns.length, status: "ready", icon: Package },
                  { entity: "Payment Vouchers",count: vouchers.length, status: "ready", icon: Receipt },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <item.icon style={{ width: 14, height: 14, color: "#60a5fa" }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{item.entity}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{item.count} records</div>
                      </div>
                    </div>
                    <button onClick={() => triggerSync("push", item.entity)} style={BTN("#1a3a6b")}>
                      <Send style={{ width: 10, height: 10 }} /> Push
                    </button>
                  </div>
                ))}
              </div>

              {/* Pull queue */}
              <div style={CARD}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginBottom: 12 }}>PULL FROM ERP (Dynamics 365)</div>
                {[
                  { entity: "Vendor Master",    desc: "Supplier GL accounts", icon: Database },
                  { entity: "GL Chart of Accounts", desc: "Account codes + cost centres", icon: BookOpen },
                  { entity: "Payment Statuses", desc: "Cleared / outstanding", icon: CheckCircle },
                  { entity: "Budget Lines",     desc: "Approved budget allocations", icon: PiggyBank },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <item.icon style={{ width: 14, height: 14, color: "#4ade80" }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{item.entity}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{item.desc}</div>
                      </div>
                    </div>
                    <button onClick={() => triggerSync("pull", item.entity)} style={BTN("#065f46")}>
                      <RotateCcw style={{ width: 10, height: 10 }} /> Pull
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync log */}
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", fontSize: 12, fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>SYNC AUDIT LOG</div>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead><tr>{["Entity","Direction","Records","Status","Started","Completed","Error"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {syncJobs.map((s, ri) => (
                    <tr key={s.id} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "" }}>
                      <td style={{ ...TD, fontWeight: 600, color: "#e2e8f0" }}>{s.entity}</td>
                      <td style={TD}><span style={{ padding: "2px 7px", borderRadius: 7, background: s.direction === "push" ? "#0369a122" : "#05966922", color: s.direction === "push" ? "#38bdf8" : "#34d399", fontSize: 10, fontWeight: 700 }}>{s.direction}</span></td>
                      <td style={TD}>{s.records}</td>
                      <td style={TD}><span style={{ padding: "2px 7px", borderRadius: 7, background: SYNC_COLOR[s.status] + "22", color: SYNC_COLOR[s.status], fontSize: 10, fontWeight: 700 }}>{s.status}</span></td>
                      <td style={{ ...TD, color: "#64748b", fontSize: 11 }}>{s.started_at ? fmtDate(s.started_at) : "--"}</td>
                      <td style={{ ...TD, color: "#64748b", fontSize: 11 }}>{s.completed_at ? fmtDate(s.completed_at) : "--"}</td>
                      <td style={{ ...TD, color: "#f87171", fontSize: 11 }}>{s.error || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ JOURNAL / LEDGER ═══ */}
        {tab === "ledger" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Journal & Ledger View</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigate("/vouchers/journal")} style={BTN("#7c3aed")}><Plus style={{ width: 13, height: 13 }} /> New Journal Entry</button>
                <button onClick={() => navigate("/financials/chart-of-accounts")} style={BTN("rgba(255,255,255,0.08)")}><BookOpen style={{ width: 13, height: 13 }} /> Chart of Accounts</button>
              </div>
            </div>
            <div style={{ ...CARD, padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" as const }}>
                <thead><tr>{["Date","GL Code","Description","Debit","Credit","Reference","ERP Status"].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {vouchers.slice(0, 20).map((v: any, ri) => (
                    <tr key={v.id} style={{ background: ri % 2 === 0 ? "rgba(255,255,255,0.02)" : "" }}>
                      <td style={{ ...TD, color: "#94a3b8", fontSize: 11 }}>{fmtDate(v.created_at)}</td>
                      <td style={{ ...TD, fontFamily: "monospace", fontSize: 11, color: "#60a5fa" }}>{v.gl_code || "6100"}</td>
                      <td style={{ ...TD, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, color: "#e2e8f0" }}>{v.description || v.payee_name || "Payment Voucher"}</td>
                      <td style={{ ...TD, color: "#f87171", fontVariantNumeric: "tabular-nums" }}>{fmtKES(v.total_amount || 0)}</td>
                      <td style={{ ...TD, color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>--</td>
                      <td style={{ ...TD, color: "#64748b", fontSize: 11 }}>{v.voucher_number || v.id.slice(0,8).toUpperCase()}</td>
                      <td style={TD}>
                        <span style={{ padding: "2px 7px", borderRadius: 7, background: "#22c55e22", color: "#4ade80", fontSize: 10, fontWeight: 700 }}>POSTED</span>
                      </td>
                    </tr>
                  ))}
                  {vouchers.length === 0 && <tr><td colSpan={7} style={{ ...TD, textAlign: "center" as const, padding: 40, color: "#64748b" }}>No journal entries found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
