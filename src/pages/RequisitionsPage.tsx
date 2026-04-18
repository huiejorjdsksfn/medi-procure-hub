import { PrintButton } from "@/components/PrintButton";
/**
 * ProcurBosse  -- Requisitions v7.0 (Microsoft Dynamics 365 Style)
 * [OK] D365 command bar * Grid view * Status filters * Full CRUD
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Plus, Search, RefreshCw, Filter, Download, Eye,
  CheckCircle, XCircle, Clock, ClipboardList, ChevronRight,
  Edit3, Trash2, Send, FileText, Building2, Calendar,
  DollarSign, AlertTriangle, Loader2, X
} from "lucide-react";

import * as XLSX from "xlsx";

const db = supabase as any;

const STATUS_COLORS: Record<string, [string, string]> = {
  draft:     [T.fgDim,   "#f0f1f3"],
  pending:   [T.warning, T.warningBg],
  submitted: [T.primary, T.primaryBg],
  approved:  [T.success, T.successBg],
  rejected:  [T.error,   T.errorBg],
  cancelled: [T.error,   T.errorBg],
  completed: [T.success, T.successBg],
};

function StatusPill({ status }: { status: string }) {
  const [c, b] = STATUS_COLORS[status?.toLowerCase()] || [T.fgDim, "#f0f1f3"];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: c, background: b }}>{status}</span>;
}

const S = {
  page:  { background: T.bg, minHeight: "100vh", fontFamily: "'Segoe UI','Inter',system-ui,sans-serif" } as React.CSSProperties,
  hdr:   { background: T.primary, padding: "0 24px", display: "flex", alignItems: "stretch", minHeight: 44, boxShadow: "0 2px 6px rgba(0,0,120,.25)" } as React.CSSProperties,
  bc:    { background: "#fff", padding: "7px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.fgMuted } as React.CSSProperties,
  cmd:   { background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 4 } as React.CSSProperties,
  body:  { padding: "16px 24px" } as React.CSSProperties,
  card:  { background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rLg, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" } as React.CSSProperties,
  th:    { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}`, background: T.bg, whiteSpace: "nowrap" as const },
  td:    { padding: "9px 12px", fontSize: 12, color: T.fg, borderBottom: `1px solid ${T.border}18` },
  inp:   { border: `1px solid ${T.border}`, borderRadius: T.r, padding: "6px 11px", fontSize: 12, outline: "none", background: "#fff", color: T.fg, fontFamily: "inherit" } as React.CSSProperties,
};

function RBtn({ icon: Icon, label, onClick, col = T.primary, disabled = false }: any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      padding: "5px 10px", border: "none", background: "transparent",
      cursor: disabled ? "not-allowed" : "pointer", color: disabled ? "#9aaab8" : col,
      borderRadius: T.r, fontSize: 10, fontWeight: 600, opacity: disabled ? .5 : 1,
    }}
      onMouseEnter={e => !disabled && ((e.currentTarget as any).style.background = "#f0f6ff")}
      onMouseLeave={e => ((e.currentTarget as any).style.background = "transparent")}
    >
      <Icon size={18} />{label}
    </button>
  );
}

interface Req {
  id: string; title: string; status: string; department?: string;
  total_amount?: number; created_at: string; requisition_number?: string;
  description?: string; requested_by?: string; urgency?: string;
}

export default function RequisitionsPage() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [rows, setRows]         = useState<Req[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [showNew, setShowNew]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ title: "", department: "", description: "", urgency: "normal", total_amount: "" });

  const load = useCallback(async () => {
    setLoading(true);
    let q = db.from("requisitions").select("*").order("created_at", { ascending: false });
    if (statusF !== "all") q = q.eq("status", statusF);
    const { data } = await q.limit(200);
    setRows(data || []);
    setLoading(false);
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.department?.toLowerCase().includes(search.toLowerCase()) || r.requisition_number?.toLowerCase().includes(search.toLowerCase())
  );

  const saveNew = async () => {
    if (!form.title) return toast({ title: "Title required", variant: "destructive" });
    setSaving(true);
    const { error } = await db.from("requisitions").insert({
      title: form.title, department: form.department, description: form.description,
      urgency: form.urgency, total_amount: form.total_amount ? Number(form.total_amount) : null,
      status: "draft", requested_by: user?.id, created_at: new Date().toISOString(),
      requisition_number: `REQ-${Date.now().toString().slice(-6)}`,
    });
    if (error) toast({ title: "[X] Error", description: error.message, variant: "destructive" });
    else { toast({ title: "[OK] Requisition created" }); setShowNew(false); setForm({ title: "", department: "", description: "", urgency: "normal", total_amount: "" }); load(); }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await db.from("requisitions").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    toast({ title: `[OK] Status -> ${status}` });
    load();
  };

  const STATUSES = ["all", "draft", "pending", "submitted", "approved", "rejected", "completed"];

  return (
    <div style={S.page}>
      {/* Blue ribbon header */}
      <div style={S.hdr}>
        <button onClick={() => nav("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", padding: "0 16px", color: "#fff", fontSize: 13, fontWeight: 700, height: "100%" }}>
          <ClipboardList size={15} /> Requisitions
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={S.bc}>
        <span style={{ cursor: "pointer" }} onClick={() => nav("/dashboard")}>Home</span>
        <ChevronRight size={12} />
        <span style={{ color: T.fg, fontWeight: 600 }}>Requisitions</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.fgDim }}>{filtered.length} records</span>
      </div>

      {/* Command bar */}
      <div style={S.cmd}>
        <RBtn icon={Plus}       label="New"     onClick={() => setShowNew(true)} col={T.primary} />
        <RBtn icon={RefreshCw}  label="Refresh" onClick={load} />
        <RBtn icon={Download}   label="Export"  onClick={() => {
          const data = filtered.map(r => ({
            "Req No.": r.requisition_number || "",
            "Title": r.title,
            "Department": r.department || "",
            "Status": r.status,
            "Amount (KES)": r.total_amount || 0,
            "Date": new Date(r.created_at).toLocaleDateString("en-KE"),
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Requisitions");
          XLSX.writeFile(wb, `requisitions_${new Date().toISOString().slice(0,10)}.xlsx`);
        }} />
        <PrintButton page="RequisitionsPage" />
        <div style={{ width: 1, height: 28, background: T.border, margin: "0 4px" }} />
        <RBtn icon={CheckCircle} label="Approve" onClick={async () => { for (const id of selected) await updateStatus(id, "approved"); setSelected([]); }} col={T.success} disabled={!selected.length} />
        <RBtn icon={XCircle}     label="Reject"  onClick={async () => { for (const id of selected) await updateStatus(id, "rejected"); setSelected([]); }} col={T.error}   disabled={!selected.length} />
        <RBtn icon={Send}        label="Submit"  onClick={async () => { for (const id of selected) await updateStatus(id, "submitted"); setSelected([]); }} col={T.warning} disabled={!selected.length} />
      </div>

      <div style={S.body}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" as const }}>
          <div style={{ position: "relative" as const, display: "flex", alignItems: "center" }}>
            <Search size={13} style={{ position: "absolute" as const, left: 9, color: T.fgMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search requisitions..." style={{ ...S.inp, paddingLeft: 28, width: 240 }} />
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusF(s)} style={{
                padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: statusF === s ? T.primary : "#fff",
                color: statusF === s ? "#fff" : T.fgMuted,
                border: `1px solid ${statusF === s ? T.primary : T.border}`,
              }}>{s === "all" ? "All" : s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={S.card}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 32 }}>
                    <input type="checkbox" onChange={e => setSelected(e.target.checked ? filtered.map(r => r.id) : [])} checked={selected.length === filtered.length && filtered.length > 0} />
                  </th>
                  {["REQ #", "Title", "Department", "Status", "Urgency", "Amount (KES)", "Date", "Actions"].map(h => <th key={h} style={S.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", padding: 30 }}>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: T.primary }} />
                  </td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id} style={{ background: selected.includes(r.id) ? T.primaryBg : i % 2 === 0 ? "#fff" : "#fafbfc", cursor: "pointer" }}
                    onMouseEnter={e => { if (!selected.includes(r.id)) (e.currentTarget as any).style.background = "#f5f7fa"; }}
                    onMouseLeave={e => { if (!selected.includes(r.id)) (e.currentTarget as any).style.background = i % 2 === 0 ? "#fff" : "#fafbfc"; }}
                  >
                    <td style={S.td} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(r.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, r.id] : prev.filter(x => x !== r.id))} />
                    </td>
                    <td style={S.td}><code style={{ fontSize: 10, background: T.bg, padding: "1px 5px", borderRadius: 3 }}>{r.requisition_number || r.id.slice(0, 8)}</code></td>
                    <td style={S.td}><span style={{ fontWeight: 600 }}>{r.title?.slice(0, 40) || " --"}</span></td>
                    <td style={S.td}>{r.department || " --"}</td>
                    <td style={S.td}><StatusPill status={r.status} /></td>
                    <td style={S.td}>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: r.urgency === "high" ? "#fde7e9" : r.urgency === "urgent" ? "#fdf1ed" : T.bg, color: r.urgency === "high" ? T.error : r.urgency === "urgent" ? T.accent : T.fgMuted, fontWeight: 600 }}>
                        {r.urgency || "normal"}
                      </span>
                    </td>
                    <td style={S.td}>{r.total_amount ? Number(r.total_amount).toLocaleString() : " --"}</td>
                    <td style={{ ...S.td, fontSize: 11, color: T.fgMuted }}>{new Date(r.created_at).toLocaleDateString("en-KE")}</td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {r.status === "draft" && <button onClick={() => updateStatus(r.id, "submitted")} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, border: `1px solid ${T.primary}`, borderRadius: T.r, background: "#fff", color: T.primary, cursor: "pointer" }}>Submit</button>}
                        {r.status === "submitted" && <button onClick={() => updateStatus(r.id, "approved")} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, border: `1px solid ${T.success}`, borderRadius: T.r, background: "#fff", color: T.success, cursor: "pointer" }}>Approve</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", padding: 30, color: T.fgMuted }}>No requisitions found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Req Modal */}
      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: T.rXl, width: 520, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" }}>
            <div style={{ background: T.primary, padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <ClipboardList size={16} color="#fff" />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>New Requisition</span>
              <button onClick={() => setShowNew(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { key: "title", label: "Title *", ph: "e.g. Medical Supplies Q2" },
                { key: "department", label: "Department", ph: "e.g. Pharmacy" },
                { key: "total_amount", label: "Estimated Amount (KES)", ph: "0.00", type: "number" },
                { key: "description", label: "Description", ph: "Details of the requisition...", multiline: true },
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
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 5 }}>Urgency</label>
                <select value={form.urgency} onChange={e => setForm(p => ({ ...p, urgency: e.target.value }))} style={{ ...S.inp, width: "100%" }}>
                  {["low", "normal", "high", "urgent"].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                <button onClick={() => setShowNew(false)} style={{ padding: "8px 16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.r, fontSize: 13, cursor: "pointer", color: T.fgMuted }}>Cancel</button>
                <button onClick={saveNew} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: T.primary, color: "#fff", border: "none", borderRadius: T.r, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
                  Create Requisition
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
