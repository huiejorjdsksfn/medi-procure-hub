/**
 * InvoiceMatchingPage — ProcurBosse v12
 * 3-way match (PO ↔ GRN ↔ Invoice) accounts-payable review screen,
 * inspired by Coupa's split-pane AP verification layout. Staff pick a
 * purchase order, the matching goods-received note(s) load automatically,
 * they enter the supplier invoice details, and the three panes sit side
 * by side so a mismatch is visible at a glance rather than requiring
 * three separate page visits.
 *
 * Backend: public.invoice_matching_queue (see schema-snapshot.json).
 * Note: a near-duplicate table, invoice_matching, also exists in the
 * schema but has never been used by any code — this page intentionally
 * writes to invoice_matching_queue only, to avoid adding a third source
 * of truth to a table pair that already looks like unresolved split-brain
 * (the same pattern fixed earlier for audit_log/audit_logs).
 */
import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { T } from "@/lib/theme";
import {
  Search, CheckCircle2, XCircle, AlertTriangle, FileText, Truck,
  Receipt, ArrowRight, RefreshCw, Filter, X, Clock,
} from "lucide-react";

const db = supabase as any;

interface POItem { id: string; item_name: string; quantity: number; unit_price: number; total_price: number; unit_of_measure?: string; }
interface GrnRow { id: string; grn_number: string; received_date?: string; total_value: number; status: string; }
interface QueueRow {
  id: string; po_id: string; po_number: string; grn_id: string | null; grn_number: string | null;
  supplier_id: string | null; supplier_name: string; invoice_number: string; invoice_date: string;
  invoice_amount: number; po_amount: number; grn_amount: number; variance: number; variance_pct: number;
  match_status: string; rejection_reason: string | null; notes: string | null; created_at: string;
  approved_by_name: string | null; matched_by_name: string | null;
}

const VARIANCE_OK_PCT = 2; // within 2% is considered a clean match

const money = (n: number | null | undefined) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "Pending Review", color: T.warning, bg: T.warningBg },
  matched:  { label: "Matched",        color: T.success, bg: T.successBg },
  variance: { label: "Variance Flagged", color: T.error, bg: T.errorBg },
  approved: { label: "Approved",       color: T.success, bg: T.successBg },
  rejected: { label: "Rejected",       color: T.error,   bg: T.errorBg },
};

export default function InvoiceMatchingPage() {
  const { user, profile } = useAuth() as any;
  const [tab, setTab] = useState<"new" | "queue">("queue");

  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMatch, setSelectedMatch] = useState<QueueRow | null>(null);

  const [poSearch, setPoSearch] = useState("");
  const [poResults, setPoResults] = useState<any[]>([]);
  const [poSearching, setPoSearching] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [poItems, setPoItems] = useState<POItem[]>([]);
  const [grns, setGrns] = useState<GrnRow[]>([]);
  const [selectedGrn, setSelectedGrn] = useState<GrnRow | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingPoDetail, setLoadingPoDetail] = useState(false);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      let q = db.from("invoice_matching_queue").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("match_status", statusFilter);
      const { data } = await q;
      setQueue(data || []);
    } finally {
      setQueueLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { if (tab === "queue") loadQueue(); }, [tab, loadQueue]);

  const searchPOs = useCallback(async () => {
    setPoSearching(true);
    try {
      let q = db.from("purchase_orders").select("id,po_number,supplier_id,supplier_name,total_amount,status,po_date,department").order("po_date", { ascending: false }).limit(25);
      if (poSearch.trim()) q = q.or(`po_number.ilike.%${poSearch.trim()}%,supplier_name.ilike.%${poSearch.trim()}%`);
      const { data } = await q;
      setPoResults(data || []);
    } finally {
      setPoSearching(false);
    }
  }, [poSearch]);

  useEffect(() => { if (tab === "new" && !selectedPO) searchPOs(); }, [tab, selectedPO, searchPOs]);

  const pickPO = async (po: any) => {
    setSelectedPO(po);
    setLoadingPoDetail(true);
    setSelectedGrn(null);
    setInvoiceAmount("");
    try {
      const [{ data: items }, { data: grnRows }] = await Promise.all([
        db.from("purchase_order_items").select("id,item_name,quantity,unit_price,total_price,unit_of_measure").eq("po_id", po.id),
        db.from("goods_received").select("id,grn_number,received_date,total_value,status").eq("po_id", po.id).order("received_date", { ascending: false }),
      ]);
      setPoItems(items || []);
      setGrns(grnRows || []);
      if ((grnRows || []).length === 1) setSelectedGrn(grnRows[0]);
    } finally {
      setLoadingPoDetail(false);
    }
  };

  const resetNewMatch = () => {
    setSelectedPO(null); setPoItems([]); setGrns([]); setSelectedGrn(null);
    setInvoiceNumber(""); setInvoiceAmount(""); setNotes("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
  };

  const poAmount = Number(selectedPO?.total_amount || 0);
  const grnAmount = Number(selectedGrn?.total_value || 0);
  const invAmount = Number(invoiceAmount || 0);

  const variance = useMemo(() => {
    if (!invAmount) return null;
    const base = poAmount || grnAmount || 1;
    const diff = invAmount - base;
    const pct = (diff / base) * 100;
    return { diff, pct, clean: Math.abs(pct) <= VARIANCE_OK_PCT };
  }, [invAmount, poAmount, grnAmount]);

  const saveMatch = async (decision: "matched" | "variance" | "rejected") => {
    if (!selectedPO || !invoiceNumber.trim() || !invAmount) {
      return;
    }
    setSaving(true);
    try {
      const row = {
        po_id: selectedPO.id, po_number: selectedPO.po_number,
        grn_id: selectedGrn?.id || null, grn_number: selectedGrn?.grn_number || null,
        supplier_id: selectedPO.supplier_id || null, supplier_name: selectedPO.supplier_name,
        invoice_number: invoiceNumber.trim(), invoice_date: invoiceDate, invoice_amount: invAmount,
        po_amount: poAmount, grn_amount: grnAmount,
        variance: variance?.diff ?? 0, variance_pct: variance?.pct ?? 0,
        match_status: decision,
        matched_by: user?.id || null, matched_by_name: profile?.full_name || null,
        matched_at: new Date().toISOString(),
        notes: notes.trim() || null,
        created_by: user?.id || null,
        cost_centre: selectedPO.department || null,
      };
      const { error } = await db.from("invoice_matching_queue").insert(row);
      if (error) throw error;
      resetNewMatch();
      setTab("queue");
      loadQueue();
    } catch (e) {
      console.error("saveMatch failed", e);
    } finally {
      setSaving(false);
    }
  };

  const approveOrReject = async (row: QueueRow, decision: "approved" | "rejected", reason?: string) => {
    await db.from("invoice_matching_queue").update({
      match_status: decision,
      approved_by: user?.id || null, approved_by_name: profile?.full_name || null,
      approved_at: new Date().toISOString(),
      rejection_reason: decision === "rejected" ? (reason || "Not specified") : null,
    }).eq("id", row.id);
    setSelectedMatch(null);
    loadQueue();
  };

  return (
    <div style={{ minHeight: "100%", background: T.bg, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg,${T.primary},#0a2558)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Receipt size={19} color="#fff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: T.fg }}>Invoice Matching</h1>
          <div style={{ fontSize: 11.5, color: T.fgMuted }}>3-way match — Purchase Order · Goods Received · Supplier Invoice</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={() => setTab("queue")} style={tabBtn(tab === "queue")}>Matching Queue</button>
          <button onClick={() => { setTab("new"); resetNewMatch(); }} style={tabBtn(tab === "new")}>+ New Match</button>
        </div>
      </div>

      {tab === "queue" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
            <Filter size={13} color={T.fgMuted} />
            {["all", "pending", "matched", "variance", "approved", "rejected"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                  border: `1px solid ${statusFilter === s ? T.primary : T.border}`,
                  background: statusFilter === s ? T.primaryBg : T.card, color: statusFilter === s ? T.primary : T.fgMuted }}>
                {s === "all" ? "All" : STATUS_CFG[s]?.label || s}
              </button>
            ))}
            <button onClick={loadQueue} style={{ marginLeft: "auto", ...iconBtn }}><RefreshCw size={13} style={{ animation: queueLoading ? "spin 1s linear infinite" : "none" }} /></button>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            {queueLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: T.fgMuted, fontSize: 13 }}>Loading…</div>
            ) : queue.length === 0 ? (
              <div style={{ padding: 50, textAlign: "center", color: T.fgMuted }}>
                <Receipt size={26} style={{ opacity: .35, marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>No invoice matches yet.</div>
                <button onClick={() => setTab("new")} style={{ ...iconBtn, marginTop: 12, padding: "7px 16px", width: "auto" }}>Start a new match</button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: T.bg2 }}>
                    {["PO #", "Supplier", "Invoice #", "PO Amt", "GRN Amt", "Invoice Amt", "Variance", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10.5, color: T.fgMuted, fontWeight: 700, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queue.map(r => {
                    const sc = STATUS_CFG[r.match_status] || STATUS_CFG.pending;
                    return (
                      <tr key={r.id} style={{ borderTop: `1px solid ${T.border}`, cursor: "pointer" }} onClick={() => setSelectedMatch(r)}>
                        <td style={{ padding: "9px 12px", fontWeight: 700 }}>{r.po_number}</td>
                        <td style={{ padding: "9px 12px", color: T.fgMuted }}>{r.supplier_name}</td>
                        <td style={{ padding: "9px 12px" }}>{r.invoice_number}</td>
                        <td style={{ padding: "9px 12px" }}>{money(r.po_amount)}</td>
                        <td style={{ padding: "9px 12px" }}>{money(r.grn_amount)}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 700 }}>{money(r.invoice_amount)}</td>
                        <td style={{ padding: "9px 12px", color: Math.abs(r.variance_pct || 0) > VARIANCE_OK_PCT ? T.error : T.success, fontWeight: 700 }}>
                          {r.variance_pct != null ? `${r.variance_pct > 0 ? "+" : ""}${r.variance_pct.toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ padding: "2px 9px", borderRadius: 10, fontSize: 10.5, fontWeight: 700, background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", color: T.fgDim }}><ArrowRight size={13} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === "new" && !selectedPO && (
        <div>
          <div style={{ position: "relative", marginBottom: 14, maxWidth: 420 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.fgDim }} />
            <input value={poSearch} onChange={e => setPoSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && searchPOs()}
              placeholder="Search by PO number or supplier…"
              style={{ width: "100%", padding: "8px 12px 8px 30px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ fontSize: 11.5, color: T.fgMuted, marginBottom: 10 }}>Step 1 — choose the purchase order to match against</div>
          <div style={{ display: "grid", gap: 8 }}>
            {poSearching ? (
              <div style={{ color: T.fgMuted, fontSize: 13, padding: 20 }}>Searching…</div>
            ) : poResults.length === 0 ? (
              <div style={{ color: T.fgMuted, fontSize: 13, padding: 20 }}>No purchase orders found.</div>
            ) : poResults.map(po => (
              <button key={po.id} onClick={() => pickPO(po)}
                style={{ textAlign: "left", background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
                <FileText size={15} color={T.primary} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{po.po_number}</div>
                  <div style={{ fontSize: 11.5, color: T.fgMuted }}>{po.supplier_name || "No supplier"} · {po.department || "—"}</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{money(po.total_amount)}</div>
                <ArrowRight size={14} color={T.fgDim} />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === "new" && selectedPO && (
        <div>
          <button onClick={resetNewMatch} style={{ ...iconBtn, width: "auto", padding: "5px 12px", marginBottom: 14 }}>
            <X size={12} /> Choose a different PO
          </button>

          {loadingPoDetail ? (
            <div style={{ padding: 40, textAlign: "center", color: T.fgMuted }}>Loading PO details…</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div style={paneStyle}>
                  <div style={paneHeader(T.primary)}><FileText size={14} /> Purchase Order</div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedPO.po_number}</div>
                    <div style={{ fontSize: 11.5, color: T.fgMuted, marginBottom: 10 }}>{selectedPO.supplier_name || "No supplier on file"}</div>
                    {poItems.slice(0, 6).map(it => (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ color: T.fgMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>{it.item_name}</span>
                        <span>{money(it.total_price)}</span>
                      </div>
                    ))}
                    {poItems.length > 6 && <div style={{ fontSize: 10.5, color: T.fgDim, marginTop: 4 }}>+{poItems.length - 6} more line items</div>}
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: `2px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
                      <span>Total</span><span>{money(poAmount)}</span>
                    </div>
                  </div>
                </div>

                <div style={paneStyle}>
                  <div style={paneHeader("#0ea5e9")}><Truck size={14} /> Goods Received</div>
                  <div style={{ padding: 14 }}>
                    {grns.length === 0 ? (
                      <div style={{ color: T.fgDim, fontSize: 12, textAlign: "center", padding: "20px 0" }}>
                        <AlertTriangle size={20} style={{ opacity: .4, marginBottom: 6 }} /><br />
                        No GRN recorded yet for this PO
                      </div>
                    ) : (
                      <>
                        {grns.length > 1 && (
                          <div style={{ marginBottom: 8, fontSize: 11, color: T.fgMuted }}>{grns.length} deliveries — select one:</div>
                        )}
                        <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                          {grns.map(g => (
                            <button key={g.id} onClick={() => setSelectedGrn(g)}
                              style={{ textAlign: "left", padding: "7px 10px", borderRadius: 6, cursor: "pointer", fontSize: 11.5,
                                border: `1.5px solid ${selectedGrn?.id === g.id ? "#0ea5e9" : T.border}`,
                                background: selectedGrn?.id === g.id ? "#0ea5e910" : "transparent" }}>
                              <div style={{ fontWeight: 700 }}>{g.grn_number}</div>
                              <div style={{ color: T.fgMuted, fontSize: 10.5 }}>{g.received_date ? new Date(g.received_date).toLocaleDateString("en-KE") : "—"} · {g.status}</div>
                            </button>
                          ))}
                        </div>
                        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `2px solid ${T.border}`, display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15 }}>
                          <span>Received Value</span><span>{money(grnAmount)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div style={paneStyle}>
                  <div style={paneHeader("#7c3aed")}><Receipt size={14} /> Supplier Invoice</div>
                  <div style={{ padding: 14 }}>
                    <label style={lblStyle}>Invoice Number</label>
                    <input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-00123" style={inpStyle} />
                    <label style={lblStyle}>Invoice Date</label>
                    <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} style={inpStyle} />
                    <label style={lblStyle}>Invoice Amount (KES)</label>
                    <input type="number" value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} placeholder="0.00" style={{ ...inpStyle, fontWeight: 700, fontSize: 15 }} />
                  </div>
                </div>
              </div>

              {variance && (
                <div style={{
                  padding: "12px 16px", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 10,
                  background: variance.clean ? T.successBg : T.errorBg,
                  border: `1px solid ${variance.clean ? T.success : T.error}`,
                }}>
                  {variance.clean ? <CheckCircle2 size={16} color={T.success} /> : <AlertTriangle size={16} color={T.error} />}
                  <div style={{ fontSize: 12.5, color: variance.clean ? T.success : T.error, fontWeight: 600 }}>
                    {variance.clean
                      ? `Invoice matches within tolerance (${variance.pct >= 0 ? "+" : ""}${variance.pct.toFixed(1)}% vs PO/GRN).`
                      : `Variance of ${money(Math.abs(variance.diff))} (${variance.pct >= 0 ? "+" : ""}${variance.pct.toFixed(1)}%) — exceeds the ${VARIANCE_OK_PCT}% tolerance.`}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)…"
                  style={{ flex: 1, minHeight: 40, padding: 8, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12, resize: "vertical" }} />
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <button disabled={saving || !invoiceNumber.trim() || !invAmount}
                    onClick={() => saveMatch(variance?.clean ? "matched" : "variance")}
                    style={{ ...actionBtn, background: variance?.clean === false ? T.error : T.success, opacity: (!invoiceNumber.trim() || !invAmount) ? .5 : 1 }}>
                    <CheckCircle2 size={14} /> {variance?.clean === false ? "Record with Variance" : "Confirm Match"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {selectedMatch && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedMatch(null); }}>
          <div style={{ background: T.card, borderRadius: 12, width: 460, maxWidth: "90vw", padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{selectedMatch.po_number} — {selectedMatch.invoice_number}</div>
                <div style={{ fontSize: 11.5, color: T.fgMuted }}>{selectedMatch.supplier_name}</div>
              </div>
              <button onClick={() => setSelectedMatch(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14, fontSize: 12 }}>
              <div><div style={{ color: T.fgMuted }}>PO Amount</div><div style={{ fontWeight: 700 }}>{money(selectedMatch.po_amount)}</div></div>
              <div><div style={{ color: T.fgMuted }}>GRN Amount</div><div style={{ fontWeight: 700 }}>{money(selectedMatch.grn_amount)}</div></div>
              <div><div style={{ color: T.fgMuted }}>Invoice</div><div style={{ fontWeight: 700 }}>{money(selectedMatch.invoice_amount)}</div></div>
            </div>
            {selectedMatch.notes && <div style={{ fontSize: 12, color: T.fgMuted, marginBottom: 14, background: T.bg2, padding: 10, borderRadius: 6 }}>{selectedMatch.notes}</div>}
            {(selectedMatch.match_status === "pending" || selectedMatch.match_status === "variance") ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => approveOrReject(selectedMatch, "approved")} style={{ ...actionBtn, background: T.success, flex: 1 }}>
                  <CheckCircle2 size={14} /> Approve for Payment
                </button>
                <button onClick={() => { const reason = window.prompt("Reason for rejection?") || undefined; approveOrReject(selectedMatch, "rejected", reason); }}
                  style={{ ...actionBtn, background: T.error, flex: 1 }}>
                  <XCircle size={14} /> Reject
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 11.5, color: T.fgMuted, display: "flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} />
                {selectedMatch.match_status === "approved" ? `Approved by ${selectedMatch.approved_by_name || "—"}` : `Rejected: ${selectedMatch.rejection_reason || "—"}`}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 16px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${active ? T.primary : T.border}`,
  background: active ? T.primary : T.card, color: active ? "#fff" : T.fgMuted,
});
const iconBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: 30, height: 30,
  border: `1px solid ${T.border}`, borderRadius: 6, background: T.card, cursor: "pointer", color: T.fgMuted, fontSize: 12,
};
const paneStyle: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" };
const paneHeader = (color: string): React.CSSProperties => ({
  display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: `${color}12`, color, fontWeight: 700, fontSize: 12.5, borderBottom: `1px solid ${T.border}`,
});
const lblStyle: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 700, color: T.fgMuted, marginTop: 8, marginBottom: 3, textTransform: "uppercase" };
const inpStyle: React.CSSProperties = { width: "100%", padding: "7px 9px", border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 12.5, outline: "none", boxSizing: "border-box" };
const actionBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
