import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Tab = "workspace"|"invoice_matching"|"payments"|"budget"|"erp_sync"|"journal"|"quotations";

interface KPI { label: string; value: string|number; sub?: string; color: string; icon: string; trend?: string; }
interface SyncItem { id: string; entity_type: string; direction: string; status: string; created_at: string; is_manual: boolean; gl_verified: boolean; }
interface InvoiceMatch { id: string; po_number?: string; grn_number?: string; invoice_number?: string; status: string; amount: number; supplier?: string; created_at: string; }
interface BudgetAlert { id: string; message: string; severity: string; budget_code?: string; consumed_pct?: number; created_at: string; override_approved: boolean; }
interface Quotation { id: string; quotation_number: string; supplier_id?: string; status: string; total_amount: number; valid_until?: string; created_at: string; }

export default function AccountantWorkspacePage() {
  const [tab, setTab] = useState<Tab>("workspace");
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncItem[]>([]);
  const [invoiceMatches, setInvoiceMatches] = useState<InvoiceMatch[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [glEntries, setGlEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showNewQuotation, setShowNewQuotation] = useState(false);
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [newQuote, setNewQuote] = useState({ supplier_id: "", notes: "", valid_until: "" });
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [
      { count: pendingInvoices },
      { count: pendingSync },
      { count: activeAlerts },
      { data: payments },
      { data: syncs },
      { data: invoices },
      { data: alerts },
      { data: quotes },
      { data: gl },
      { data: suppliers },
    ] = await Promise.all([
      supabase.from("invoice_matching").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("erp_sync_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("budget_alerts").select("*", { count: "exact", head: true }).eq("override_approved", false),
      supabase.from("payment_vouchers").select("total_amount").eq("status", "approved").limit(100),
      supabase.from("erp_sync_queue").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("invoice_matching").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("budget_alerts").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("quotations").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("gl_entries").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("suppliers").select("id, name").eq("status", "active").limit(100),
    ]);

    const totalApproved = (payments || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);

    setKpis([
      { label: "Pending Invoice Matches", value: pendingInvoices ?? 0, sub: "Awaiting 3-way match", color: "#f97316", icon: "📋" },
      { label: "ERP Sync Queue", value: pendingSync ?? 0, sub: "Pending to Dynamics 365", color: "#3b82f6", icon: "🔄", trend: pendingSync! > 5 ? "↑ High" : "↓ Low" },
      { label: "Budget Alerts", value: activeAlerts ?? 0, sub: "Over-budget requests", color: "#ef4444", icon: "⚠️" },
      { label: "Approved Payments", value: `KES ${totalApproved.toLocaleString()}`, sub: "This period", color: "#22c55e", icon: "💰" },
    ]);

    setSyncQueue(syncs || []);
    setInvoiceMatches(invoices || []);
    setBudgetAlerts(alerts || []);
    setQuotations(quotes || []);
    setGlEntries(gl || []);
    setSupplierList(suppliers || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel("accountant_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "erp_sync_queue" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "budget_alerts" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "invoice_matching" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  async function triggerManualSync() {
    setSyncing(true);
    const { error } = await supabase.from("erp_sync_queue").insert({
      entity_type: "manual_sync",
      direction: "push",
      status: "pending",
      is_manual: true,
      payload: { triggered_by: "accountant_workspace", timestamp: new Date().toISOString() },
    });
    setSyncing(false);
    if (!error) showToast("Manual sync queued successfully!");
    else showToast("Error queuing sync: " + error.message);
  }

  async function approveInvoiceMatch(id: string) {
    await supabase.from("invoice_matching").update({ status: "approved" }).eq("id", id);
    showToast("Invoice match approved ✓");
    fetchAll();
  }

  async function approveOverBudget(id: string) {
    await supabase.from("budget_alerts").update({ override_approved: true }).eq("id", id);
    showToast("Over-budget request approved ✓");
    fetchAll();
  }

  async function createQuotation() {
    const { error } = await supabase.from("quotations").insert({
      supplier_id: newQuote.supplier_id || null,
      notes: newQuote.notes,
      valid_until: newQuote.valid_until || null,
      status: "draft",
    });
    if (!error) {
      showToast("Quotation created ✓");
      setShowNewQuotation(false);
      setNewQuote({ supplier_id: "", notes: "", valid_until: "" });
      fetchAll();
    } else showToast("Error: " + error.message);
  }

  const bg = "#0f1729";
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "16px",
  };
  const tabBtn = (t: Tab): React.CSSProperties => ({
    padding: "8px 16px",
    background: tab === t ? "linear-gradient(135deg,#3b82f6,#1d4ed8)" : "rgba(255,255,255,0.05)",
    border: tab === t ? "1px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: tab === t ? "#fff" : "rgba(255,255,255,0.6)",
    cursor: "pointer" as const,
    fontSize: "13px",
    fontWeight: tab === t ? 600 : 400,
    whiteSpace: "nowrap" as const,
  });

  const statusChip = (s: string) => {
    const map: Record<string,string> = {
      pending:"#f97316", approved:"#22c55e", rejected:"#ef4444",
      draft:"#6b7280", sent:"#3b82f6", received:"#8b5cf6",
      completed:"#22c55e", failed:"#ef4444", processing:"#f59e0b",
    };
    return (
      <span style={{
        padding: "2px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
        background: `${map[s] || "#6b7280"}22`,
        color: map[s] || "#6b7280",
        border: `1px solid ${map[s] || "#6b7280"}44`,
      }}>{s?.toUpperCase()}</span>
    );
  };

  const inputS: React.CSSProperties = {
    width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px",
    color: "#fff", fontSize: "13px", outline: "none", boxSizing: "border-box" as const,
  };
  const btnPrimary: React.CSSProperties = {
    padding: "9px 20px", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer" as const,
    fontSize: "13px", fontWeight: 600,
  };
  const btnSecondary: React.CSSProperties = {
    padding: "9px 20px", background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#e2e8f0",
    cursor: "pointer" as const, fontSize: "13px",
  };

  return (
    <div style={{ minHeight: "100%", background: bg, color: "#e2e8f0", fontFamily: "'Segoe UI',system-ui,sans-serif", padding: "28px" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed" as const, top: 80, right: 24, zIndex: 9999,
          background: "#1e3a5f", border: "1px solid #3b82f6", borderRadius: "10px",
          padding: "12px 20px", color: "#fff", fontSize: "14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          animation: "fadeIn 0.2s ease",
        }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex" as const, alignItems: "center" as const, gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "12px",
            background: "linear-gradient(135deg,#3b82f6,#7c3aed)",
            display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, fontSize: "22px",
          }}>💼</div>
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>Accountant Workspace</h1>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px" }}>
              Financial Oversight · ERP Integration · ProcurBosse EL5
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex" as const, gap: 8 }}>
            <button style={btnSecondary} onClick={fetchAll}>↻ Refresh</button>
            <button
              style={{ ...btnPrimary, opacity: syncing ? 0.6 : 1 }}
              onClick={triggerManualSync}
              disabled={syncing}
            >
              {syncing ? "Syncing…" : "⚡ Manual ERP Sync"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid" as const, gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 28 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{
            ...card,
            marginBottom: 0,
            borderLeft: `3px solid ${k.color}`,
            cursor: "pointer" as const,
          }}
            onClick={() => {
              if (i === 0) setTab("invoice_matching");
              if (i === 1) setTab("erp_sync");
              if (i === 2) setTab("budget");
              if (i === 3) setTab("payments");
            }}
          >
            <div style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: "24px", fontWeight: 700, color: "#fff" }}>{k.value}</div>
                {k.sub && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: 4 }}>{k.sub}</div>}
                {k.trend && <div style={{ color: k.color, fontSize: "11px", marginTop: 4 }}>{k.trend}</div>}
              </div>
              <div style={{ fontSize: "28px", opacity: 0.8 }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: "flex" as const, gap: 8, flexWrap: "wrap", marginBottom: 24, overflowX: "auto" as const, paddingBottom: 4 }}>
        {([
          ["workspace","🏠 Overview"],
          ["invoice_matching","📋 Invoice Matching"],
          ["payments","💳 Payments"],
          ["budget","📊 Budget Control"],
          ["erp_sync","🔄 ERP Sync"],
          ["journal","📒 Journal & Ledger"],
          ["quotations","📝 Quotations"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: "center" as const, padding: "60px", color: "rgba(255,255,255,0.4)" }}>
          Loading financial data…
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {!loading && tab === "workspace" && (
        <div style={{ display: "grid" as const, gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* ERP Status */}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 14, color: "#3b82f6" }}>🔗 ERP Connection Status</div>
            <div style={{ display: "flex" as const, flexDirection: "column" as const, gap: 10 }}>
              {[
                { name: "Dynamics 365 Finance", status: "connected", color: "#22c55e" },
                { name: "GL Account Sync", status: "active", color: "#22c55e" },
                { name: "Vendor Master Pull", status: "active", color: "#22c55e" },
                { name: "Payment Status Feed", status: "syncing", color: "#f59e0b" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const }}>
                  <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{s.name}</span>
                  <span style={{ display: "flex" as const, alignItems: "center" as const, gap: 6, color: s.color, fontSize: "12px", fontWeight: 600 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" as const }}/>
                    {s.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals */}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 14, color: "#f97316" }}>⏳ Pending Approval Tasks</div>
            {invoiceMatches.filter(m => m.status === "pending").slice(0,4).map((m, i) => (
              <div key={i} style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{m.invoice_number || "Invoice #" + m.id.slice(0,8)}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>KES {(m.amount||0).toLocaleString()}</div>
                </div>
                <button style={{ ...btnPrimary, padding: "5px 12px", fontSize: "11px" }} onClick={() => approveInvoiceMatch(m.id)}>
                  Approve
                </button>
              </div>
            ))}
            {invoiceMatches.filter(m => m.status === "pending").length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>No pending invoice matches ✓</div>
            )}
          </div>

          {/* Budget Alerts */}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 14, color: "#ef4444" }}>⚠️ Budget Alerts</div>
            {budgetAlerts.filter(a => !a.override_approved).slice(0,4).map((a, i) => (
              <div key={i} style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: "13px" }}>{a.message?.slice(0, 50) || "Budget exceeded"}</div>
                  {a.consumed_pct && (
                    <div style={{ color: "#fca5a5", fontSize: "11px" }}>{a.consumed_pct}% consumed</div>
                  )}
                </div>
                <button style={{ ...btnPrimary, padding: "5px 12px", fontSize: "11px", background: "linear-gradient(135deg,#ef4444,#b91c1c)" }} onClick={() => approveOverBudget(a.id)}>
                  Override
                </button>
              </div>
            ))}
            {budgetAlerts.filter(a => !a.override_approved).length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>No active budget alerts ✓</div>
            )}
          </div>

          {/* Recent Sync */}
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 14, color: "#3b82f6" }}>🔄 Recent ERP Sync Activity</div>
            {syncQueue.slice(0, 5).map((s, i) => (
              <div key={i} style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500 }}>{s.entity_type?.replace(/_/g," ")}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px" }}>
                    {s.direction?.toUpperCase()} · {s.is_manual ? "Manual" : "Auto"} · {s.gl_verified ? "✓ GL Verified" : "GL Pending"}
                  </div>
                </div>
                {statusChip(s.status)}
              </div>
            ))}
            {syncQueue.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px" }}>No sync activity yet</div>
            )}
          </div>
        </div>
      )}

      {/* ── INVOICE MATCHING TAB ── */}
      {!loading && tab === "invoice_matching" && (
        <div style={card}>
          <div style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>📋 Invoice Matching Queue</h2>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: 4 }}>
                Three-way matching: Purchase Orders ↔ Goods Received Notes ↔ Supplier Invoices
              </div>
            </div>
          </div>

          {/* Three-way match legend */}
          <div style={{ display: "flex" as const, gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            {[["PO","Purchase Order","#3b82f6"],["GRN","Goods Received Note","#22c55e"],["INV","Supplier Invoice","#f97316"]].map(([code,label,color]) => (
              <div key={code} style={{ display: "flex" as const, alignItems: "center" as const, gap: 6, background: `${color}18`, border: `1px solid ${color}33`, borderRadius: 8, padding: "6px 12px" }}>
                <span style={{ fontWeight: 700, color, fontSize: "12px" }}>{code}</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{label}</span>
              </div>
            ))}
            <div style={{ display: "flex" as const, alignItems: "center" as const, gap: 4, color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
              ↔ All three must match for approval
            </div>
          </div>

          {invoiceMatches.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "48px", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: "40px", marginBottom: 12 }}>✅</div>
              No invoices in matching queue
            </div>
          ) : (
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Invoice #","PO Ref","GRN Ref","Amount (KES)","Status","PO ✓","GRN ✓","INV ✓","Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left" as const, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceMatches.map((m, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 12px", color: "#60a5fa" }}>{m.invoice_number || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{m.po_number || "—"}</td>
                      <td style={{ padding: "10px 12px" }}>{m.grn_number || "—"}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        {(m.amount||0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{statusChip(m.status)}</td>
                      <td style={{ padding: "10px 12px", color: m.po_number ? "#22c55e" : "#ef4444" }}>{m.po_number ? "✓" : "✗"}</td>
                      <td style={{ padding: "10px 12px", color: m.grn_number ? "#22c55e" : "#ef4444" }}>{m.grn_number ? "✓" : "✗"}</td>
                      <td style={{ padding: "10px 12px", color: m.invoice_number ? "#22c55e" : "#ef4444" }}>{m.invoice_number ? "✓" : "✗"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {m.status === "pending" && (
                          <div style={{ display: "flex" as const, gap: 6 }}>
                            <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: "11px" }} onClick={() => approveInvoiceMatch(m.id)}>Approve</button>
                            <button style={{ ...btnSecondary, padding: "4px 10px", fontSize: "11px" }}
                              onClick={async () => {
                                await supabase.from("invoice_matching").update({ status: "rejected" }).eq("id", m.id);
                                showToast("Rejected"); fetchAll();
                              }}
                            >Reject</button>
                          </div>
                        )}
                        {m.status !== "pending" && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ERP SYNC TAB ── */}
      {!loading && tab === "erp_sync" && (
        <div>
          <div style={card}>
            <div style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>🔄 ERP Synchronisation Module</h2>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginTop: 4 }}>
                  Bidirectional sync with Microsoft Dynamics 365 Finance
                </div>
              </div>
              <button style={{ ...btnPrimary, opacity: syncing ? 0.6 : 1 }} onClick={triggerManualSync} disabled={syncing}>
                {syncing ? "Queuing…" : "⚡ Queue Manual Sync"}
              </button>
            </div>

            {/* Sync direction cards */}
            <div style={{ display: "grid" as const, gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 600, color: "#60a5fa", marginBottom: 10 }}>⬆️ PUSH to Dynamics 365</div>
                {["Purchase Orders","Goods Receipt Notes","Supplier Invoices","Payment Vouchers","Journal Entries"].map(e => (
                  <div key={e} style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", marginBottom: 6, display: "flex" as const, alignItems: "center" as const, gap: 6 }}>
                    <span style={{ color: "#22c55e" }}>→</span> {e}
                  </div>
                ))}
              </div>
              <div style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 600, color: "#a78bfa", marginBottom: 10 }}>⬇️ PULL from Dynamics 365</div>
                {["Vendor Master Data","GL Account Codes","Payment Statuses","Budget Balances","Exchange Rates"].map(e => (
                  <div key={e} style={{ color: "rgba(255,255,255,0.65)", fontSize: "13px", marginBottom: 6, display: "flex" as const, alignItems: "center" as const, gap: 6 }}>
                    <span style={{ color: "#a78bfa" }}>←</span> {e}
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Queue Table */}
            <div style={{ fontWeight: 600, marginBottom: 12, color: "rgba(255,255,255,0.7)" }}>Sync Queue ({syncQueue.length})</div>
            {syncQueue.length === 0 ? (
              <div style={{ textAlign: "center" as const, padding: "32px", color: "rgba(255,255,255,0.3)" }}>Queue is empty</div>
            ) : (
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      {["Entity","Direction","GL Verified","Type","Status","Queued At"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {syncQueue.map((s, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px 12px" }}>{s.entity_type?.replace(/_/g," ")}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ color: s.direction === "push" ? "#60a5fa" : "#a78bfa" }}>
                            {s.direction === "push" ? "⬆️ PUSH" : "⬇️ PULL"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", color: s.gl_verified ? "#22c55e" : "#f97316" }}>
                          {s.gl_verified ? "✓ Verified" : "Pending"}
                        </td>
                        <td style={{ padding: "8px 12px", color: s.is_manual ? "#f59e0b" : "rgba(255,255,255,0.5)" }}>
                          {s.is_manual ? "Manual" : "Auto"}
                        </td>
                        <td style={{ padding: "8px 12px" }}>{statusChip(s.status)}</td>
                        <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.45)" }}>
                          {new Date(s.created_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BUDGET CONTROL TAB ── */}
      {!loading && tab === "budget" && (
        <div style={card}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>📊 Budget Control</h2>
          {budgetAlerts.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "48px", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: "40px", marginBottom: 12 }}>✅</div>
              All budgets within approved limits
            </div>
          ) : (
            <div style={{ display: "flex" as const, flexDirection: "column" as const, gap: 12 }}>
              {budgetAlerts.map((a, i) => (
                <div key={i} style={{
                  background: a.override_approved ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                  border: `1px solid ${a.override_approved ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                  borderRadius: 12, padding: 16,
                  display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: 4 }}>
                      {a.override_approved ? "✅" : "⚠️"} {a.message || "Budget alert"}
                    </div>
                    {a.budget_code && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Code: {a.budget_code}</div>}
                    {a.consumed_pct && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ display: "flex" as const, justifyContent: "space-between" as const, marginBottom: 4 }}>
                          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>Consumption</span>
                          <span style={{ color: a.consumed_pct > 100 ? "#ef4444" : "#f97316", fontWeight: 600, fontSize: "12px" }}>{a.consumed_pct}%</span>
                        </div>
                        <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" as const }}>
                          <div style={{ height: "100%", width: `${Math.min(a.consumed_pct, 100)}%`, background: a.consumed_pct > 100 ? "#ef4444" : "#f97316", borderRadius: 3 }}/>
                        </div>
                      </div>
                    )}
                  </div>
                  {!a.override_approved && (
                    <button style={{ ...btnPrimary, background: "linear-gradient(135deg,#ef4444,#b91c1c)", whiteSpace: "nowrap" as const }} onClick={() => approveOverBudget(a.id)}>
                      Approve Override
                    </button>
                  )}
                  {a.override_approved && (
                    <span style={{ color: "#22c55e", fontSize: "13px", fontWeight: 600 }}>Override Approved ✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── JOURNAL & LEDGER TAB ── */}
      {!loading && tab === "journal" && (
        <div style={card}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>📒 Journal & Ledger View</h2>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginBottom: 20 }}>
            View-only access to ERP GL postings. Use ERP Sync to push entries to Dynamics 365.
          </div>
          {glEntries.length === 0 ? (
            <div style={{ textAlign: "center" as const, padding: "48px", color: "rgba(255,255,255,0.3)" }}>
              <div style={{ fontSize: "40px", marginBottom: 12 }}>📖</div>
              No GL entries found. Sync with ERP to populate ledger data.
            </div>
          ) : (
            <div style={{ overflowX: "auto" as const }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                    {["Date","Account Code","Description","Debit (KES)","Credit (KES)","Reference","Status"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {glEntries.map((e: any, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.5)" }}>
                        {e.created_at ? new Date(e.created_at).toLocaleDateString("en-KE") : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#60a5fa" }}>{e.account_code || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{e.description || "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#22c55e", fontFamily: "monospace" }}>
                        {e.debit_amount ? e.debit_amount.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", color: "#ef4444", fontFamily: "monospace" }}>
                        {e.credit_amount ? e.credit_amount.toLocaleString("en-KE", { minimumFractionDigits: 2 }) : "—"}
                      </td>
                      <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.45)" }}>{e.reference || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{statusChip(e.status || "posted")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── QUOTATIONS TAB ── */}
      {!loading && tab === "quotations" && (
        <div>
          <div style={{ display: "flex" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: "18px" }}>📝 Quotation Creator</h2>
            <button style={btnPrimary} onClick={() => setShowNewQuotation(true)}>+ New Quotation</button>
          </div>

          {/* New Quotation Modal */}
          {showNewQuotation && (
            <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const }}>
              <div style={{ background: "#1a2744", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 32, width: "100%", maxWidth: 480 }}>
                <h3 style={{ margin: "0 0 20px", color: "#fff" }}>Create New Quotation</h3>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block" as const, color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: 6 }}>Supplier</label>
                  <select style={{ ...inputS, color: "#fff" }} value={newQuote.supplier_id} onChange={e => setNewQuote(q => ({ ...q, supplier_id: e.target.value }))}>
                    <option value="">— Select Supplier —</option>
                    {supplierList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block" as const, color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: 6 }}>Valid Until</label>
                  <input style={inputS} type="date" value={newQuote.valid_until} onChange={e => setNewQuote(q => ({ ...q, valid_until: e.target.value }))} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block" as const, color: "rgba(255,255,255,0.6)", fontSize: "12px", marginBottom: 6 }}>Notes</label>
                  <textarea style={{ ...inputS, height: 80, resize: "vertical" as const }} value={newQuote.notes} onChange={e => setNewQuote(q => ({ ...q, notes: e.target.value }))} placeholder="Quotation notes…"/>
                </div>
                <div style={{ display: "flex" as const, gap: 10 }}>
                  <button style={btnPrimary} onClick={createQuotation}>Create Quotation</button>
                  <button style={btnSecondary} onClick={() => setShowNewQuotation(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          <div style={card}>
            {quotations.length === 0 ? (
              <div style={{ textAlign: "center" as const, padding: "48px", color: "rgba(255,255,255,0.3)" }}>
                <div style={{ fontSize: "40px", marginBottom: 12 }}>📝</div>
                No quotations yet. Create your first one.
              </div>
            ) : (
              <div style={{ overflowX: "auto" as const }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                      {["Quotation #","Status","Total (KES)","Valid Until","Created","Actions"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left" as const, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map((q, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px 12px", color: "#60a5fa", fontWeight: 600 }}>{q.quotation_number}</td>
                        <td style={{ padding: "8px 12px" }}>{statusChip(q.status)}</td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>
                          {(q.total_amount||0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.5)" }}>
                          {q.valid_until ? new Date(q.valid_until).toLocaleDateString("en-KE") : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", color: "rgba(255,255,255,0.4)" }}>
                          {new Date(q.created_at).toLocaleDateString("en-KE")}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex" as const, gap: 6 }}>
                            {q.status === "draft" && (
                              <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: "11px" }}
                                onClick={async () => {
                                  await supabase.from("quotations").update({ status: "sent" }).eq("id", q.id);
                                  showToast("Quotation sent ✓"); fetchAll();
                                }}
                              >Send</button>
                            )}
                            {q.status === "received" && (
                              <button style={{ ...btnPrimary, padding: "4px 10px", fontSize: "11px" }}
                                onClick={async () => {
                                  await supabase.from("quotations").update({ status: "accepted" }).eq("id", q.id);
                                  showToast("Quotation accepted ✓"); fetchAll();
                                }}
                              >Accept</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PAYMENTS TAB (brief) ── */}
      {!loading && tab === "payments" && (
        <div style={card}>
          <h2 style={{ margin: "0 0 20px", fontSize: "18px" }}>💳 Payment Management</h2>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", marginBottom: 20 }}>
            Create and export payment proposals. All approved payments are queued for ERP sync.
          </div>
          <div style={{ display: "flex" as const, gap: 12, marginBottom: 24 }}>
            <a href="/payment-vouchers" style={{ ...btnPrimary, textDecoration: "none" as const }}>View Payment Vouchers →</a>
            <button style={btnSecondary} onClick={triggerManualSync}>Export Payment Proposal</button>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
            Navigate to Payment Vouchers page for full payment creation and management.
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        select option { background: #1a2744; color: #fff; }
      `}</style>
    </div>
  );
}
