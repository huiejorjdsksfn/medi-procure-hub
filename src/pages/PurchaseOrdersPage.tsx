import { PrintButton } from "@/components/PrintButton";
/**
 * ProcurBosse  -- Purchase Orders v7.0 (Microsoft Dynamics 365 Style)
 * [OK] D365 command bar * PO grid * Status workflow * Financial totals
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Plus, Search, RefreshCw, ShoppingCart, ChevronRight,
  CheckCircle, XCircle, Clock, DollarSign, Loader2, X,
  Download, FileText, Send, Eye
} from "lucide-react";

import * as XLSX from "xlsx";

const db = supabase as any;

const S = {
  page: { background: T.bg, minHeight: "100vh", fontFamily: "'Segoe UI','Inter',system-ui,sans-serif" } as React.CSSProperties,
  hdr:  { background: T.finance, padding: "0 24px", display: "flex", alignItems: "stretch", minHeight: 44, boxShadow: "0 2px 6px rgba(80,0,120,.3)" } as React.CSSProperties,
  bc:   { background: "#fff", padding: "7px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.fgMuted } as React.CSSProperties,
  cmd:  { background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 4 } as React.CSSProperties,
  body: { padding: "16px 24px" } as React.CSSProperties,
  card: { background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rLg, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" } as React.CSSProperties,
  th:   { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}`, background: T.bg },
  td:   { padding: "9px 12px", fontSize: 12, color: T.fg, borderBottom: `1px solid ${T.border}18` },
  inp:  { border: `1px solid ${T.border}`, borderRadius: T.r, padding: "6px 10px", fontSize: 12, outline: "none", background: "#fff", color: T.fg, fontFamily: "inherit" } as React.CSSProperties,
};

function RBtn({ icon: Icon, label, onClick, col = T.finance, disabled = false }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "5px 10px", border: "none", background: "transparent", cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "#9aaab8" : col, borderRadius: T.r, fontSize: 10, fontWeight: 600, opacity: disabled ? .5 : 1 }}
      onMouseEnter={e => !disabled && ((e.currentTarget as any).style.background = "#f5f0ff")}
      onMouseLeave={e => ((e.currentTarget as any).style.background = "transparent")}
    ><Icon size={18} />{label}</button>
  );
}

const STATUS_COLORS: Record<string, [string, string]> = {
  draft:     [T.fgDim,   "#f0f1f3"],
  pending:   [T.warning, T.warningBg],
  approved:  [T.success, T.successBg],
  sent:      [T.primary, T.primaryBg],
  received:  [T.success, T.successBg],
  cancelled: [T.error,   T.errorBg],
  paid:      ["#6b21a8", "#f3e8ff"],
};

function StatusPill({ status }: { status: string }) {
  const [c, b] = STATUS_COLORS[status?.toLowerCase()] || [T.fgDim, "#f0f1f3"];
  return <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: c, background: b }}>{status}</span>;
}

interface PO {
  id: string; po_number?: string; status: string; total_amount?: number;
  supplier_id?: string; created_at: string; delivery_date?: string;
  notes?: string; suppliers?: { name: string };
}

export default function PurchaseOrdersPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [rows, setRows]         = useState<PO[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [showNew, setShowNew]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [form, setForm]         = useState({ po_number: "", supplier_id: "", total_amount: "", delivery_date: "", notes: "" });

  const load = useCallback(async () => {
    try {

    setLoading(true);
    let q = db.from("purchase_orders").select("*,suppliers(name)").order("created_at", { ascending: false });
    if (statusF !== "all") q = q.eq("status", statusF);
    const { data } = await q.limit(200);
    setRows(data || []);
    const { data: sup } = await db.from("suppliers").select("id,name").eq("status", "active").order("name");
    setSuppliers(sup || []);
    } catch(e: any) {
      console.warn("[ProcurBosse] Load error:", e?.message);
    } finally {
      setLoading(false);
    }
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    !search || r.po_number?.toLowerCase().includes(search.toLowerCase()) || r.suppliers?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalValue = filtered.reduce((s, r) => s + (r.total_amount || 0), 0);

  const saveNew = async () => {
    setSaving(true);
    const poNum = form.po_number || `PO-${Date.now().toString().slice(-6)}`;
    const { error } = await db.from("purchase_orders").insert({
      po_number: poNum, supplier_id: form.supplier_id || null, total_amount: Number(form.total_amount) || null,
      delivery_date: form.delivery_date || null, notes: form.notes, status: "draft",
      created_by: user?.id, created_at: new Date().toISOString(),
    });
    if (error) toast({ title: "[X] Error", description: error.message, variant: "destructive" });
    else { toast({ title: "[OK] Purchase Order created" }); setShowNew(false); load(); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await db.from("purchase_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: `[OK] PO -> ${status}` });
    load();
  };

  const STATUSES = ["all", "draft", "pending", "approved", "sent", "received", "paid", "cancelled"];

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <button onClick={() => nav("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", padding: "0 16px", color: "#fff", fontSize: 13, fontWeight: 700, height: "100%" }}>
          <ShoppingCart size={15} /> Purchase Orders
        </button>
      </div>
      <div style={S.bc}>
        <span style={{ cursor: "pointer" }} onClick={() => nav("/dashboard")}>Home</span>
        <ChevronRight size={12} />
        <span style={{ color: T.fg, fontWeight: 600 }}>Purchase Orders</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.fgDim }}>
          {filtered.length} records * KES {totalValue.toLocaleString()} total
        </span>
      </div>
      <div style={S.cmd}>
        <RBtn icon={Plus}       label="New PO"  onClick={() => setShowNew(true)} />
        <RBtn icon={RefreshCw}  label="Refresh" onClick={load} />
        <RBtn icon={Download}   label="Export"  onClick={() => {
          const data = filtered.map(r => ({
            "PO No.": r.po_number || "",
            "Supplier": r.suppliers?.name || "",
            "Status": r.status,
            "Amount (KES)": r.total_amount || 0,
            "Delivery Date": r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("en-KE") : "",
            "Created": new Date(r.created_at).toLocaleDateString("en-KE"),
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");
          XLSX.writeFile(wb, `purchase_orders_${new Date().toISOString().slice(0,10)}.xlsx`);
        }} />
        <PrintButton page="PurchaseOrdersPage" />
        <div style={{ width: 1, height: 28, background: T.border, margin: "0 4px" }} />
        <RBtn icon={CheckCircle} label="Approve" onClick={async () => { for (const id of selected) await updateStatus(id, "approved"); setSelected([]); }} col={T.success} disabled={!selected.length} />
        <RBtn icon={Send}        label="Send"    onClick={async () => { for (const id of selected) await updateStatus(id, "sent"); setSelected([]); }}    col={T.primary} disabled={!selected.length} />
        <RBtn icon={XCircle}     label="Cancel"  onClick={async () => { for (const id of selected) await updateStatus(id, "cancelled"); setSelected([]); }} col={T.error}   disabled={!selected.length} />
      </div>
      <div style={S.body}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" as const }}>
          <div style={{ position: "relative" as const, display: "flex", alignItems: "center" }}>
            <Search size={13} style={{ position: "absolute" as const, left: 9, color: T.fgMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search POs..." style={{ ...S.inp, paddingLeft: 28, width: 220 }} />
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusF(s)} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", background: statusF === s ? T.finance : "#fff", color: statusF === s ? "#fff" : T.fgMuted, border: `1px solid ${statusF === s ? T.finance : T.border}` }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={S.card}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...S.th, width: 32 }}>
                  <input type="checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(r => r.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} />
                </th>
                {["PO Number", "Supplier", "Status", "Total (KES)", "Delivery Date", "Created", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 30 }}><Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: T.finance }} /></td></tr>
                  : filtered.map((r, i) => (
                    <tr key={r.id} style={{ background: selected.includes(r.id) ? "#f3e8ff" : i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={S.td}><input type="checkbox" checked={selected.includes(r.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} /></td>
                      <td style={S.td}><code style={{ fontSize: 10, background: T.bg, padding: "1px 5px", borderRadius: 3 }}>{r.po_number || r.id.slice(0, 8)}</code></td>
                      <td style={S.td}>{r.suppliers?.name || " --"}</td>
                      <td style={S.td}><StatusPill status={r.status} /></td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{r.total_amount ? Number(r.total_amount).toLocaleString() : " --"}</td>
                      <td style={S.td}>{r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("en-KE") : " --"}</td>
                      <td style={{ ...S.td, fontSize: 11, color: T.fgMuted }}>{new Date(r.created_at).toLocaleDateString("en-KE")}</td>
                      <td style={S.td}>
                        <div style={{ display: "flex", gap: 4 }}>
                          {r.status === "draft"    && <button onClick={() => updateStatus(r.id, "approved")} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, border: `1px solid ${T.success}`, borderRadius: T.r, background: "#fff", color: T.success, cursor: "pointer" }}>Approve</button>}
                          {r.status === "approved" && <button onClick={() => updateStatus(r.id, "sent")}     style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, border: `1px solid ${T.primary}`, borderRadius: T.r, background: "#fff", color: T.primary, cursor: "pointer" }}>Send</button>}
                          {r.status === "sent"     && <button onClick={() => updateStatus(r.id, "received")} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, border: `1px solid ${T.inventory}`, borderRadius: T.r, background: "#fff", color: T.inventory, cursor: "pointer" }}>Received</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 30, color: T.fgMuted }}>No purchase orders found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: T.rXl, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" }}>
            <div style={{ background: T.finance, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <ShoppingCart size={16} color="#fff" />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>New Purchase Order</span>
              <button onClick={() => setShowNew(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "po_number",   label: "PO Number (auto if blank)", ph: "PO-XXXXXX" },
                { key: "total_amount",label: "Total Amount (KES)",         ph: "0.00", type: "number" },
                { key: "delivery_date",label:"Delivery Date",              ph: "", type: "date" },
                { key: "notes",        label: "Notes",                     ph: "Additional details...", multiline: true },
              ].map(({ key, label, ph, type, multiline }) => (
                <div key={key}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 5 }}>{label}</label>
                  {multiline
                    ? <textarea value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} rows={3} style={{ ...S.inp, width: "100%", resize: "vertical", boxSizing: "border-box" as const }} />
                    : <input type={type || "text"} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ ...S.inp, width: "100%", boxSizing: "border-box" as const }} />
                  }
                </div>
              ))}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 5 }}>Supplier</label>
                <select value={form.supplier_id} onChange={e => setForm(p => ({ ...p, supplier_id: e.target.value }))} style={{ ...S.inp, width: "100%" }}>
                  <option value=""> -- Select Supplier  --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowNew(false)} style={{ padding: "8px 16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.r, fontSize: 13, cursor: "pointer", color: T.fgMuted }}>Cancel</button>
                <button onClick={saveNew} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: T.finance, color: "#fff", border: "none", borderRadius: T.r, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />} Create PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
