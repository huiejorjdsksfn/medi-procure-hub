import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Tab = "workspace"|"invoice_matching"|"payments"|"budget"|"erp_sync"|"journal"|"quotations"|"reports";

interface KPI { label: string; value: string|number; sub?: string; color: string; icon: string; trend?: string; }
interface SyncItem { id: string; entity_type?: string; sync_type?: string; direction: string; status: string; created_at: string; is_manual?: boolean; gl_verified?: boolean; payload?: any; }
interface InvoiceMatch { id: string; po_number?: string; grn_number?: string; invoice_number?: string; status: string; amount?: number; supplier?: string; created_at: string; matched_amount?: number; variance?: number; }
interface BudgetAlert { id: string; message?: string; alert_type?: string; severity?: string; status?: string; budget_code?: string; consumed_pct?: number; created_at: string; override_approved?: boolean; }
interface Quotation { id: string; quotation_number: string; supplier_id?: string; supplier_name?: string; status: string; total_amount?: number; valid_until?: string; created_at: string; notes?: string; }
interface GLEntry { id: string; gl_account?: string; debit?: number; credit?: number; description?: string; reference?: string; created_at: string; status?: string; }
interface Payment { id: string; voucher_number?: string; payee?: string; total_amount?: number; status: string; payment_method?: string; created_at: string; due_date?: string; }

const TABS: { id: Tab; label: string; icon: string; color: string }[] = [
  { id: "workspace",        label: "Workspace",       icon: "-", color: "#059669" },
  { id: "invoice_matching", label: "Invoice Match",   icon: "-", color: "#f97316" },
  { id: "payments",         label: "Payments",        icon: "-", color: "#3b82f6" },
  { id: "budget",           label: "Budget Control",  icon: "-", color: "#8b5cf6" },
  { id: "erp_sync",         label: "ERP Sync",        icon: "-", color: "#06b6d4" },
  { id: "journal",          label: "Journal/Ledger",  icon: "-", color: "#ec4899" },
  { id: "quotations",       label: "Quotations",      icon: "-", color: "#eab308" },
  { id: "reports",          label: "Reports",         icon: "-", color: "#6366f1" },
];

const STATUS_COLORS: Record<string,string> = {
  pending: "#f97316", approved: "#22c55e", matched: "#22c55e",
  rejected: "#ef4444", processing: "#3b82f6", completed: "#22c55e",
  failed: "#ef4444", draft: "#6b7280", sent: "#3b82f6", paid: "#22c55e",
  cancelled: "#ef4444", over_budget: "#ef4444", warning: "#f97316",
};

function statusBadge(status: string) {
  const color = STATUS_COLORS[status] || "#6b7280";
  return (
    <span style={{ padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}33`, textTransform: "uppercase", letterSpacing: "0.04em" }}>
      {status}
    </span>
  );
}

function fmt(n: number) { return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }); }

export default function AccountantWorkspacePage() {
  const [tab, setTab] = useState<Tab>("workspace");
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [invoiceMatches, setInvoiceMatches] = useState<InvoiceMatch[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [newQuote, setNewQuote] = useState({ supplier_id: "", notes: "", valid_until: "", total_amount: "" });
  const [localToast, setLocalToast] = useState("");
  const [reportType, setReportType] = useState("invoice_summary");
  const [exportLoading, setExportLoading] = useState(false);

  const showToast = (msg: string) => { setLocalToast(msg); setTimeout(() => setLocalToast(""), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: pendingInvoices },
        { count: pendingSync },
        { count: activeAlerts },
        { data: payData },
        { data: syncs },
        { data: invoices },
        { data: alerts },
        { data: quotes },
        { data: gl },
        { data: suppliers },
        { data: payVouchers },
      ] = await Promise.all([
        supabase.from("invoice_matching").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("erp_sync_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("budget_alerts").select("*", { count: "exact", head: true }).eq("override_approved", false),
        supabase.from("payment_vouchers").select("total_amount").eq("status", "approved").limit(100),
        supabase.from("erp_sync_queue").select("*").order("created_at", { ascending: false }).limit(25),
        supabase.from("invoice_matching").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("budget_alerts").select("*").order("created_at", { ascending: false }).limit(25),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("gl_entries").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("suppliers").select("id, name").eq("status", "active").limit(100),
        supabase.from("payment_vouchers").select("*").order("created_at", { ascending: false }).limit(40),
      ]);

      const totalApproved = (payData || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);

      setKpis([
        { label: "Pending Invoice Matches", value: pendingInvoices ?? 0, sub: "Awaiting 3-way match", color: "#f97316", icon: "-" },
        { label: "ERP Sync Queue", value: pendingSync ?? 0, sub: "Pending to Dynamics 365", color: "#3b82f6", icon: "-", trend: (pendingSync ?? 0) > 5 ? "- High" : "- Normal" },
        { label: "Budget Alerts", value: activeAlerts ?? 0, sub: "Over-budget requests pending", color: "#ef4444", icon: "-" },
        { label: "Approved Payments", value: fmt(totalApproved), sub: "This period", color: "#22c55e", icon: "-" },
      ]);

      setSyncQueue(syncs || []);
      setInvoiceMatches(invoices || []);
      setBudgetAlerts((alerts || []).map((a: any) => ({ ...a, message: a.alert_type || a.message || "", severity: a.status || "warning" })));
      setQuotations(quotes || []);
      setGlEntries(gl || []);
      setPayments(payVouchers || []);
      setSupplierList(suppliers || []);
    } catch (e: any) {
      console.error("AccountantWorkspace fetch error:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = supabase.channel("accountant_realtime_v58")
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_sync_queue" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_alerts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_matching" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "quotations" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  async function triggerManualSync() {
    setSyncing(true);
    const { error } = await supabase.from("erp_sync_queue").insert({
      sync_type: "manual_sync", direction: "push", status: "pending", is_manual: true,
      payload: { triggered_by: "accountant_workspace_v58", timestamp: new Date().toISOString() },
    } as any);
    setSyncing(false);
    if (!error) { showToast("- Manual sync queued to Dynamics 365!"); fetchAll(); }
    else showToast("- Sync failed: " + error.message);
  }

  async function approveInvoiceMatch(id: string) {
    const { error } = await supabase.from("invoice_matching").update({ status: "matched" } as any).eq("id", id);
    if (!error) { showToast("- Invoice match approved!"); fetchAll(); }
    else showToast("- " + error.message);
  }

  async function rejectInvoiceMatch(id: string) {
    const { error } = await supabase.from("invoice_matching").update({ status: "rejected" } as any).eq("id", id);
    if (!error) { showToast("- Invoice match rejected."); fetchAll(); }
    else showToast("- " + error.message);
  }

  async function approveBudgetOverride(id: string) {
    const { error } = await supabase.from("budget_alerts").update({ override_approved: true, status: "approved" } as any).eq("id", id);
    if (!error) { showToast("- Budget override approved!"); fetchAll(); }
    else showToast("- " + error.message);
  }

  async function createQuotation() {
    if (!newQuote.total_amount) { showToast("- Enter a total amount."); return; }
    const qNum = `QT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { error } = await supabase.from("quotations").insert({
      quotation_number: qNum,
      supplier_id: newQuote.supplier_id || null,
      notes: newQuote.notes,
      valid_until: newQuote.valid_until || null,
      total_amount: parseFloat(newQuote.total_amount) || 0,
      status: "draft",
    } as any);
    if (!error) {
      showToast(`- Quotation ${qNum} created!`);
      setShowNewQuotation(false);
      setNewQuote({ supplier_id: "", notes: "", valid_until: "", total_amount: "" });
      fetchAll();
    } else showToast("- " + error.message);
  }

  async function sendQuotation(id: string) {
    const { error } = await supabase.from("quotations").update({ status: "sent" } as any).eq("id", id);
    if (!error) { showToast("- Quotation sent to supplier!"); fetchAll(); }
    else showToast("- " + error.message);
  }

  async function approvePayment(id: string) {
    const { error } = await supabase.from("payment_vouchers").update({ status: "approved" } as any).eq("id", id);
    if (!error) { showToast("- Payment approved!"); fetchAll(); }
    else showToast("- " + error.message);
  }

  async function exportReport() {
    setExportLoading(true);
    await new Promise(r => setTimeout(r, 800));
    // Build CSV based on report type
    let rows: string[] = [];
    let filename = "";
    if (reportType === "invoice_summary") {
      rows = ["PO Number,GRN Number,Invoice Number,Status,Amount,Created", ...invoiceMatches.map(i => `${i.po_number||""},${i.grn_number||""},${i.invoice_number||""},${i.status},${i.amount||0},${fmtDate(i.created_at)}`)];
      filename = "invoice_summary.csv";
    } else if (reportType === "payment_register") {
      rows = ["Voucher,Payee,Amount,Status,Method,Date", ...payments.map(p => `${p.voucher_number||""},${p.payee||""},${p.total_amount||0},${p.status},${p.payment_method||""},${fmtDate(p.created_at)}`)];
      filename = "payment_register.csv";
    } else if (reportType === "budget_alerts") {
      rows = ["Alert Type,Status,Budget Code,Override Approved,Date", ...budgetAlerts.map(b => `${b.message||""},${b.severity||""},${b.budget_code||""},${b.override_approved ? "Yes":"No"},${fmtDate(b.created_at)}`)];
      filename = "budget_alerts.csv";
    } else {
      rows = ["Account,Debit,Credit,Description,Reference,Date", ...glEntries.map(g => `${g.gl_account||""},${g.debit||0},${g.credit||0},${g.description||""},${g.reference||""},${fmtDate(g.created_at)}`)];
      filename = "gl_entries.csv";
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
    showToast("- Report exported!");
  }

  // - Styles -
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
  const tblHead: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", background: "#f8fafc", textAlign: "left" };
  const tblCell: React.CSSProperties = { fontSize: 13, color: "#374151", padding: "11px 14px", borderBottom: "1px solid #f8fafc" };
  const inputS: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#374151" };
  const btnPrimary: React.CSSProperties = { padding: "9px 18px", background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" };
  const btnSm = (color: string): React.CSSProperties => ({ padding: "5px 12px", background: `${color}12`, color, border: `1px solid ${color}30`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" });

  return (
    <div style={{ padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1400, margin: "0 auto" }}>

      {/* Toast */}
      {localToast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", animation: "slideIn 0.2s ease" }}>
          {localToast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#059669,#047857)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>-</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>Accountant Workspace</h1>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>EL5 MediProcure v5.8 - Finance & Procurement Bridge - Dynamics 365 ERP</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ padding: "6px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#059669" }}>
            - ERP Connected
          </div>
          <button onClick={triggerManualSync} disabled={syncing} style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none" }}>-</span>
            {syncing ? "Syncing-" : "Sync to D365"}
          </button>
          <button onClick={fetchAll} style={{ padding: "9px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
            - Refresh
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ ...card, borderLeft: `4px solid ${k.color}`, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>{loading ? "-" : k.value}</div>
                {k.sub && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{k.sub}</div>}
                {k.trend && <div style={{ fontSize: 11, color: k.color, marginTop: 4, fontWeight: 600 }}>{k.trend}</div>}
              </div>
              <div style={{ fontSize: 26 }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", paddingBottom: 4, borderBottom: "2px solid #f1f5f9", flexWrap: "nowrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: "8px 8px 0 0",
            background: tab === t.id ? t.color : "transparent",
            color: tab === t.id ? "#fff" : "#6b7280",
            border: tab === t.id ? `1.5px solid ${t.color}` : "1.5px solid transparent",
            borderBottom: tab === t.id ? "none" : undefined,
            fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500,
            cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: tab === t.id ? `0 4px 12px ${t.color}30` : "none",
            transition: "all 0.15s",
          }}>
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* - WORKSPACE TAB - */}
      {tab === "workspace" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* ERP Status */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              - ERP Connection Status
            </div>
            {[
              { label: "Dynamics 365 Connection", status: "Connected", color: "#22c55e" },
              { label: "GL Account Sync",          status: "Active",    color: "#22c55e" },
              { label: "Vendor Master Sync",        status: "Active",    color: "#22c55e" },
              { label: "Payment Status Pull",       status: "Active",    color: "#22c55e" },
              { label: "Invoice Push",              status: "Enabled",   color: "#3b82f6" },
              { label: "PO Sync",                   status: "Enabled",   color: "#3b82f6" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid #f8fafc" : undefined }}>
                <span style={{ fontSize: 13, color: "#374151" }}>{row.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: row.color, background: `${row.color}12`, padding: "2px 10px", borderRadius: 12, border: `1px solid ${row.color}25` }}>{row.status}</span>
              </div>
            ))}
          </div>

          {/* Pending Tasks */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a" }}>- Approval Tasks</div>
            {loading ? <div style={{ color: "#9ca3af", fontSize: 13 }}>Loading-</div> : (
              <>
                {invoiceMatches.filter(i => i.status === "pending").slice(0,4).map(inv => (
                  <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Invoice #{inv.invoice_number || inv.id.slice(-6)}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>3-way match pending</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => approveInvoiceMatch(inv.id)} style={btnSm("#22c55e")}>- Match</button>
                      <button onClick={() => rejectInvoiceMatch(inv.id)} style={btnSm("#ef4444")}>-</button>
                    </div>
                  </div>
                ))}
                {budgetAlerts.filter(b => !b.override_approved).slice(0,3).map(alert => (
                  <div key={alert.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{alert.message || alert.alert_type || "Budget Alert"}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Budget override request</div>
                    </div>
                    <button onClick={() => approveBudgetOverride(alert.id)} style={btnSm("#8b5cf6")}>Approve Override</button>
                  </div>
                ))}
                {invoiceMatches.filter(i => i.status === "pending").length === 0 && budgetAlerts.filter(b => !b.override_approved).length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 13 }}>- No pending tasks</div>
                )}
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a" }}>- Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "New Quotation",   icon: "-", action: () => { setTab("quotations"); setShowNewQuotation(true); }, color: "#eab308" },
                { label: "Sync to ERP",     icon: "-", action: triggerManualSync,   color: "#06b6d4" },
                { label: "Export Report",   icon: "-", action: () => setTab("reports"), color: "#6366f1" },
                { label: "Budget Review",   icon: "-", action: () => setTab("budget"), color: "#8b5cf6" },
                { label: "Payment Run",     icon: "-", action: () => setTab("payments"), color: "#3b82f6" },
                { label: "GL Entries",      icon: "-", action: () => setTab("journal"), color: "#ec4899" },
              ].map((a, i) => (
                <button key={i} onClick={a.action} style={{ padding: "12px", background: `${a.color}08`, border: `1.5px solid ${a.color}22`, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#374151", transition: "all 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}18`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${a.color}08`; }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Sync */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a" }}>- Recent ERP Syncs</div>
            {syncQueue.slice(0,6).map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f8fafc" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{s.sync_type || s.entity_type || "sync"}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{fmtDate(s.created_at)} - {s.direction}</div>
                </div>
                {statusBadge(s.status)}
              </div>
            ))}
            {syncQueue.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "12px 0" }}>No sync records</div>}
          </div>
        </div>
      )}

      {/* - INVOICE MATCHING TAB - */}
      {tab === "invoice_matching" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>- Three-Way Invoice Matching</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Match Purchase Orders - Goods Received Notes - Supplier Invoices</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <select style={{ ...inputS, width: "auto" }} defaultValue="all">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="matched">Matched</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
          {loading ? <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>Loading invoice matches-</div> : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["PO Number","GRN Number","Invoice Number","Supplier","Amount","Status","GL Verified","Actions"].map(h => (
                      <th key={h} style={tblHead}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceMatches.map(inv => (
                    <tr key={inv.id} style={{ transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={tblCell}><span style={{ fontWeight: 600 }}>{inv.po_number || "-"}</span></td>
                      <td style={tblCell}>{inv.grn_number || "-"}</td>
                      <td style={tblCell}>{inv.invoice_number || "-"}</td>
                      <td style={tblCell}>{inv.supplier || "-"}</td>
                      <td style={tblCell}><span style={{ fontWeight: 600, color: "#059669" }}>{fmt(inv.amount || 0)}</span></td>
                      <td style={tblCell}>{statusBadge(inv.status)}</td>
                      <td style={tblCell}><span style={{ fontSize: 16 }}>-</span></td>
                      <td style={tblCell}>
                        {inv.status === "pending" ? (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => approveInvoiceMatch(inv.id)} style={btnSm("#22c55e")}>- Approve</button>
                            <button onClick={() => rejectInvoiceMatch(inv.id)} style={btnSm("#ef4444")}>- Reject</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoiceMatches.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }}>No invoice matches found</div>}
            </div>
          )}
        </div>
      )}

      {/* - PAYMENTS TAB - */}
      {tab === "payments" && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>- Payment Management</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Create - Approve - Export Payment Proposals</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btnPrimary, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>+ New Payment Run</button>
              <button onClick={() => { setReportType("payment_register"); exportReport(); }} style={{ ...btnPrimary, background: "linear-gradient(135deg,#6366f1,#4f46e5)" }}>- Export</button>
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Voucher #","Payee","Amount","Method","Status","Due Date","Actions"].map(h => (
                    <th key={h} style={tblHead}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={tblCell}><span style={{ fontWeight: 600, color: "#3b82f6" }}>{p.voucher_number || p.id.slice(-8)}</span></td>
                    <td style={tblCell}>{p.payee || "-"}</td>
                    <td style={tblCell}><span style={{ fontWeight: 700, color: "#059669" }}>{fmt(p.total_amount || 0)}</span></td>
                    <td style={tblCell}><span style={{ textTransform: "capitalize" }}>{p.payment_method || "bank"}</span></td>
                    <td style={tblCell}>{statusBadge(p.status)}</td>
                    <td style={tblCell}>{p.due_date ? fmtDate(p.due_date) : "-"}</td>
                    <td style={tblCell}>
                      {p.status === "pending" || p.status === "draft" ? (
                        <button onClick={() => approvePayment(p.id)} style={btnSm("#22c55e")}>- Approve</button>
                      ) : <span style={{ fontSize: 12, color: "#9ca3af" }}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {payments.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }}>No payment vouchers found</div>}
          </div>
        </div>
      )}

      {/* - BUDGET CONTROL TAB - */}
      {tab === "budget" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", marginBottom: 4 }}>- Budget Control & Monitoring</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>Monitor budget consumption - Approve over-budget requests - Vote head tracking</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Alert Type","Budget Code","Consumed %","Status","Override Approved","Date","Action"].map(h => (
                      <th key={h} style={tblHead}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {budgetAlerts.map(b => (
                    <tr key={b.id}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={tblCell}>{b.message || b.alert_type || "Budget Alert"}</td>
                      <td style={tblCell}><span style={{ fontFamily: "monospace", fontWeight: 600 }}>{b.budget_code || "-"}</span></td>
                      <td style={tblCell}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(b.consumed_pct || 0, 100)}%`, background: (b.consumed_pct || 0) > 90 ? "#ef4444" : (b.consumed_pct || 0) > 75 ? "#f97316" : "#22c55e", borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{b.consumed_pct || 0}%</span>
                        </div>
                      </td>
                      <td style={tblCell}>{statusBadge(b.severity || b.status || "warning")}</td>
                      <td style={tblCell}><span style={{ fontSize: 16 }}>{b.override_approved ? "-" : "-"}</span></td>
                      <td style={tblCell}>{fmtDate(b.created_at)}</td>
                      <td style={tblCell}>
                        {!b.override_approved && (
                          <button onClick={() => approveBudgetOverride(b.id)} style={btnSm("#8b5cf6")}>Approve Override</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {budgetAlerts.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }}>- No budget alerts</div>}
            </div>
          </div>
        </div>
      )}

      {/* - ERP SYNC TAB - */}
      {tab === "erp_sync" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>- ERP Synchronisation Module</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Bidirectional data flow - Dynamics 365 - Azure Logic Apps middleware</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={triggerManualSync} disabled={syncing} style={btnPrimary}>
                  {syncing ? "- Syncing-" : "- Manual Sync"}
                </button>
                {[
                  { label: "Push POs",      type: "purchase_orders_push" },
                  { label: "Push Receipts", type: "grn_push" },
                  { label: "Pull Vendors",  type: "vendor_master_pull" },
                  { label: "Pull GL",       type: "gl_accounts_pull" },
                ].map(btn => (
                  <button key={btn.type} onClick={async () => {
                    await supabase.from("erp_sync_queue").insert({ sync_type: btn.type, direction: btn.type.includes("pull") ? "pull" : "push", status: "pending", is_manual: true, payload: {} } as any);
                    showToast(`- ${btn.label} queued!`); fetchAll();
                  }} style={{ ...btnPrimary, background: "linear-gradient(135deg,#0e7490,#0c6380)", fontSize: 12, padding: "8px 14px" }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sync direction indicators */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Push to D365", desc: "POs - GRNs - Invoices - Journal Entries", icon: "-", color: "#3b82f6" },
                { label: "Pull from D365", desc: "Vendor Master - GL Accounts - Payment Status", icon: "-", color: "#22c55e" },
              ].map((dir, i) => (
                <div key={i} style={{ padding: "16px", background: `${dir.color}08`, border: `1.5px solid ${dir.color}20`, borderRadius: 10 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{dir.icon}</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{dir.label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{dir.desc}</div>
                </div>
              ))}
            </div>

            {/* Sync queue table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Type","Direction","Status","Manual","GL Verified","Timestamp"].map(h => (
                    <th key={h} style={tblHead}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syncQueue.map(s => (
                  <tr key={s.id}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                    <td style={tblCell}><span style={{ fontWeight: 600 }}>{s.sync_type || s.entity_type || "sync"}</span></td>
                    <td style={tblCell}><span style={{ fontSize: 16 }}>{s.direction === "push" ? "-" : "-"}</span> {s.direction}</td>
                    <td style={tblCell}>{statusBadge(s.status)}</td>
                    <td style={tblCell}><span style={{ fontSize: 14 }}>{s.is_manual ? "-" : "-"}</span></td>
                    <td style={tblCell}><span style={{ fontSize: 14 }}>{s.gl_verified ? "-" : "-"}</span></td>
                    <td style={tblCell}>{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {syncQueue.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }}>No sync records yet</div>}
          </div>
        </div>
      )}

      {/* - JOURNAL/LEDGER TAB - */}
      {tab === "journal" && (
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", marginBottom: 4 }}>- Journal & GL Ledger View</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 20 }}>Drill-down into ERP postings - GL account entries - Debit/Credit ledger</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["GL Account","Description","Reference","Debit (KES)","Credit (KES)","Net","Status","Date"].map(h => (
                    <th key={h} style={tblHead}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {glEntries.map(g => {
                  const net = (g.debit || 0) - (g.credit || 0);
                  return (
                    <tr key={g.id}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={tblCell}><span style={{ fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }}>{g.gl_account || "-"}</span></td>
                      <td style={tblCell}>{g.description || "-"}</td>
                      <td style={tblCell}><span style={{ fontFamily: "monospace", fontSize: 12 }}>{g.reference || "-"}</span></td>
                      <td style={{ ...tblCell, color: "#059669", fontWeight: 600 }}>{g.debit ? fmt(g.debit) : "-"}</td>
                      <td style={{ ...tblCell, color: "#ef4444", fontWeight: 600 }}>{g.credit ? fmt(g.credit) : "-"}</td>
                      <td style={{ ...tblCell, fontWeight: 700, color: net >= 0 ? "#059669" : "#ef4444" }}>{fmt(Math.abs(net))}</td>
                      <td style={tblCell}>{statusBadge(g.status || "posted")}</td>
                      <td style={tblCell}>{fmtDate(g.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {glEntries.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }}>No GL entries found</div>}
          </div>
        </div>
      )}

      {/* - QUOTATIONS TAB - */}
      {tab === "quotations" && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>- Quotation Creator</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Create - Send - Manage supplier quotation requests</div>
              </div>
              <button onClick={() => setShowNewQuotation(v => !v)} style={btnPrimary}>
                {showNewQuotation ? "- Cancel" : "+ New Quotation"}
              </button>
            </div>

            {/* New Quotation Form */}
            {showNewQuotation && (
              <div style={{ background: "#f8fafc", borderRadius: 12, padding: "20px", marginBottom: 20, border: "1.5px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 16 }}>- New Quotation</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Supplier</label>
                    <select value={newQuote.supplier_id} onChange={e => setNewQuote(q => ({ ...q, supplier_id: e.target.value }))} style={inputS}>
                      <option value="">- Select Supplier -</option>
                      {supplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Total Amount (KES)</label>
                    <input type="number" value={newQuote.total_amount} onChange={e => setNewQuote(q => ({ ...q, total_amount: e.target.value }))} style={inputS} placeholder="0.00" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Valid Until</label>
                    <input type="date" value={newQuote.valid_until} onChange={e => setNewQuote(q => ({ ...q, valid_until: e.target.value }))} style={inputS} />
                  </div>
                  <div style={{ gridColumn: "span 3" }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Notes / Terms</label>
                    <textarea value={newQuote.notes} onChange={e => setNewQuote(q => ({ ...q, notes: e.target.value }))} style={{ ...inputS, height: 72, resize: "vertical" }} placeholder="Quotation terms, scope, delivery notes-" />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <button onClick={() => setShowNewQuotation(false)} style={{ padding: "9px 18px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
                  <button onClick={createQuotation} style={btnPrimary}>- Create Quotation</button>
                </div>
              </div>
            )}

            {/* Quotations Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Quotation #","Supplier","Amount","Valid Until","Status","Actions"].map(h => (
                      <th key={h} style={tblHead}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ""}>
                      <td style={tblCell}><span style={{ fontWeight: 700, color: "#eab308" }}>{q.quotation_number}</span></td>
                      <td style={tblCell}>{q.supplier_name || supplierList.find(s => s.id === q.supplier_id)?.name || "-"}</td>
                      <td style={tblCell}><span style={{ fontWeight: 600, color: "#059669" }}>{fmt(q.total_amount || 0)}</span></td>
                      <td style={tblCell}>{q.valid_until ? fmtDate(q.valid_until) : "-"}</td>
                      <td style={tblCell}>{statusBadge(q.status)}</td>
                      <td style={tblCell}>
                        {q.status === "draft" && (
                          <button onClick={() => sendQuotation(q.id)} style={btnSm("#3b82f6")}>- Send</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {quotations.length === 0 && <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }}>No quotations yet. Create one above.</div>}
            </div>
          </div>
        </div>
      )}

      {/* - REPORTS TAB - */}
      {tab === "reports" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 16 }}>- Report Types</div>
            {[
              { value: "invoice_summary", label: "Invoice Summary", icon: "-", color: "#f97316" },
              { value: "payment_register", label: "Payment Register", icon: "-", color: "#3b82f6" },
              { value: "budget_alerts", label: "Budget Alerts Report", icon: "-", color: "#8b5cf6" },
              { value: "gl_entries", label: "GL Entries Report", icon: "-", color: "#ec4899" },
              { value: "erp_sync_log", label: "ERP Sync Log", icon: "-", color: "#06b6d4" },
            ].map(r => (
              <button key={r.value} onClick={() => setReportType(r.value)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                background: reportType === r.value ? `${r.color}14` : "transparent",
                border: reportType === r.value ? `1.5px solid ${r.color}30` : "1.5px solid transparent",
                color: reportType === r.value ? r.color : "#374151",
                fontSize: 13, fontWeight: reportType === r.value ? 700 : 500,
                marginBottom: 4, textAlign: "left",
              }}>
                <span>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", textTransform: "capitalize" }}>{reportType.replace(/_/g, " ")}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Generated: {new Date().toLocaleString("en-KE")}</div>
              </div>
              <button onClick={exportReport} disabled={exportLoading} style={btnPrimary}>
                {exportLoading ? "Exporting-" : "- Export CSV"}
              </button>
            </div>
            {/* Report preview */}
            <div style={{ background: "#f8fafc", borderRadius: 10, padding: "20px", border: "1.5px solid #e2e8f0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
                {[
                  { label: "Total Records", value: reportType === "invoice_summary" ? invoiceMatches.length : reportType === "payment_register" ? payments.length : reportType === "budget_alerts" ? budgetAlerts.length : glEntries.length },
                  { label: "Pending", value: reportType === "invoice_summary" ? invoiceMatches.filter(i => i.status === "pending").length : payments.filter(p => p.status === "pending").length },
                  { label: "Approved", value: reportType === "invoice_summary" ? invoiceMatches.filter(i => i.status === "matched").length : payments.filter(p => p.status === "approved").length },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center", padding: "14px", background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>
                - Report covers all {reportType.replace(/_/g," ")} records in the system.<br/>
                - Data as of {new Date().toLocaleDateString("en-KE")}<br/>
                - Embu Level 5 Hospital - ProcurBosse ERP v5.8
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
