import { PrintButton } from "@/components/PrintButton";
/**
 * ProcurBosse  -- Suppliers v7.0 (Microsoft Dynamics 365 Style)
 * [OK] D365 ribbon * CRM-style entity list * Full CRUD * Status filters
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  Plus, Search, RefreshCw, Truck, ChevronRight,
  Edit3, Phone, Mail, Globe, MapPin, Star, CheckCircle,
  XCircle, Loader2, X, Building2, Download
} from "lucide-react";

import * as XLSX from "xlsx";

const db = supabase as any;

const S = {
  page: { background: T.bg, minHeight: "100vh", fontFamily: "'Segoe UI','Inter',system-ui,sans-serif" } as React.CSSProperties,
  hdr:  { background: "#e67e22", padding: "0 24px", display: "flex", alignItems: "stretch", minHeight: 44, boxShadow: "0 2px 6px rgba(120,60,0,.3)" } as React.CSSProperties,
  bc:   { background: "#fff", padding: "7px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.fgMuted } as React.CSSProperties,
  cmd:  { background: "#fff", borderBottom: `1px solid ${T.border}`, padding: "6px 24px", display: "flex", alignItems: "center", gap: 4 } as React.CSSProperties,
  body: { padding: "16px 24px" } as React.CSSProperties,
  card: { background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.rLg, boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden" } as React.CSSProperties,
  th:   { padding: "8px 12px", textAlign: "left" as const, fontSize: 10, fontWeight: 700, color: T.fgDim, borderBottom: `1px solid ${T.border}`, background: T.bg },
  td:   { padding: "10px 12px", fontSize: 12, color: T.fg, borderBottom: `1px solid ${T.border}18` },
  inp:  { border: `1px solid ${T.border}`, borderRadius: T.r, padding: "6px 10px", fontSize: 12, outline: "none", background: "#fff", color: T.fg, fontFamily: "inherit" } as React.CSSProperties,
};

function RBtn({ icon: Icon, label, onClick, col = "#e67e22" }: any) {
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "5px 10px", border: "none", background: "transparent", cursor: "pointer", color: col, borderRadius: T.r, fontSize: 10, fontWeight: 600 }}
      onMouseEnter={e => ((e.currentTarget as any).style.background = "#fff8f0")}
      onMouseLeave={e => ((e.currentTarget as any).style.background = "transparent")}
    ><Icon size={18} />{label}</button>
  );
}

interface Supplier {
  id: string; name: string; contact_person?: string; email?: string;
  phone?: string; address?: string; status?: string; category?: string;
  rating?: number; registration_number?: string; created_at: string;
  tax_pin?: string; website?: string;
}

export default function SuppliersPage() {
  const nav = useNavigate();
  const [rows, setRows]       = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [statusF, setStatusF] = useState("all");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name: "", contact_person: "", email: "", phone: "", address: "", category: "", registration_number: "", tax_pin: "" });

  const load = useCallback(async () => {
    setLoading(true);
    let q = db.from("suppliers").select("*").order("name");
    if (statusF !== "all") q = q.eq("status", statusF);
    const { data } = await q.limit(300);
    setRows(data || []);
    setLoading(false);
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter(r =>
    !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.email?.toLowerCase().includes(search.toLowerCase()) || r.contact_person?.toLowerCase().includes(search.toLowerCase())
  );

  const saveNew = async () => {
    if (!form.name) return toast({ title: "Supplier name required", variant: "destructive" });
    setSaving(true);
    const { error } = await db.from("suppliers").insert({ ...form, status: "active", created_at: new Date().toISOString() });
    if (error) toast({ title: "[X] Error", description: error.message, variant: "destructive" });
    else { toast({ title: "[OK] Supplier added" }); setShowNew(false); setForm({ name: "", contact_person: "", email: "", phone: "", address: "", category: "", registration_number: "", tax_pin: "" }); load(); }
    setSaving(false);
  };

  const toggleStatus = async (id: string, current?: string) => {
    const next = current === "active" ? "inactive" : "active";
    await db.from("suppliers").update({ status: next }).eq("id", id);
    toast({ title: `[OK] Supplier ${next}` });
    load();
  };

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => <Star key={i} size={10} fill={i < n ? "#f59e0b" : "none"} color="#f59e0b" />);

  return (
    <div style={S.page}>
      <div style={S.hdr}>
        <button onClick={() => nav("/dashboard")} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", padding: "0 16px", color: "#fff", fontSize: 13, fontWeight: 700, height: "100%" }}>
          <Truck size={15} /> Suppliers
        </button>
      </div>
      <div style={S.bc}>
        <span style={{ cursor: "pointer" }} onClick={() => nav("/dashboard")}>Home</span>
        <ChevronRight size={12} />
        <span style={{ color: T.fg, fontWeight: 600 }}>Suppliers</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: T.fgDim }}>{filtered.length} records</span>
      </div>
      <div style={S.cmd}>
        <RBtn icon={Plus} label="New Supplier" onClick={() => setShowNew(true)} />
        <RBtn icon={RefreshCw} label="Refresh" onClick={load} />
        <RBtn icon={Download} label="Export" onClick={() => {
          const data = filtered.map((r:any) => ({
            "Name": r.name,
            "Email": r.email || "",
            "Phone": r.phone || r.phone_number || "",
            "Category": r.category || "",
            "Status": r.status || "",
            "Address": r.address || "",
            "Registered": new Date(r.created_at).toLocaleDateString("en-KE"),
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
          XLSX.writeFile(wb, `suppliers_${new Date().toISOString().slice(0,10)}.xlsx`);
        }} />
      </div>
      <div style={S.body}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center" }}>
          <div style={{ position: "relative" as const, display: "flex", alignItems: "center" }}>
            <Search size={13} style={{ position: "absolute" as const, left: 9, color: T.fgMuted }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search suppliers..." style={{ ...S.inp, paddingLeft: 28, width: 240 }} />
          </div>
          {["all", "active", "inactive", "suspended"].map(s => (
            <button key={s} onClick={() => setStatusF(s)} style={{ padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: "pointer", background: statusF === s ? "#e67e22" : "#fff", color: statusF === s ? "#fff" : T.fgMuted, border: `1px solid ${statusF === s ? "#e67e22" : T.border}` }}>{s}</button>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                {["Supplier", "Contact", "Category", "Phone", "Email", "Rating", "Status", "Action"].map(h => <th key={h} style={S.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 30 }}><Loader2 size={20} style={{ animation: "spin 1s linear infinite", color: "#e67e22" }} /></td></tr>
                  : filtered.map((r, i) => (
                    <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                      <td style={S.td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: T.r, background: "#e67e2220", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Building2 size={15} color="#e67e22" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12 }}>{r.name}</div>
                            {r.registration_number && <div style={{ fontSize: 10, color: T.fgMuted }}>Reg: {r.registration_number}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>{r.contact_person || " --"}</td>
                      <td style={S.td}>{r.category ? <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "#fff8f0", color: "#e67e22", border: "1px solid #e67e2244" }}>{r.category}</span> : " --"}</td>
                      <td style={S.td}>{r.phone ? <a href={`tel:${r.phone}`} style={{ color: T.primary, textDecoration: "none", fontSize: 11 }}>{r.phone}</a> : " --"}</td>
                      <td style={S.td}>{r.email ? <a href={`mailto:${r.email}`} style={{ color: T.primary, textDecoration: "none", fontSize: 11 }}>{r.email}</a> : " --"}</td>
                      <td style={S.td}><div style={{ display: "flex", gap: 1 }}>{stars(r.rating || 0)}</div></td>
                      <td style={S.td}>
                        <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, color: r.status === "active" ? T.success : T.error, background: r.status === "active" ? T.successBg : T.errorBg }}>
                          {r.status || "active"}
                        </span>
                      </td>
                      <td style={S.td}>
                        <button onClick={() => toggleStatus(r.id, r.status)} style={{ padding: "3px 8px", fontSize: 10, fontWeight: 600, border: `1px solid ${T.border}`, borderRadius: T.r, background: "#fff", color: T.fgMuted, cursor: "pointer" }}>
                          {r.status === "active" ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ ...S.td, textAlign: "center", padding: 30, color: T.fgMuted }}>No suppliers found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showNew && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: T.rXl, width: 520, boxShadow: "0 20px 60px rgba(0,0,0,.2)", overflow: "hidden" }}>
            <div style={{ background: "#e67e22", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
              <Truck size={16} color="#fff" />
              <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Add New Supplier</span>
              <button onClick={() => setShowNew(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,.8)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                { key: "name", label: "Supplier Name *", ph: "e.g. Medipharm Kenya Ltd", full: true },
                { key: "contact_person", label: "Contact Person", ph: "Full name" },
                { key: "email", label: "Email", ph: "contact@supplier.co.ke", type: "email" },
                { key: "phone", label: "Phone", ph: "+254 7XX XXX XXX" },
                { key: "registration_number", label: "Registration No.", ph: "CPR-XXXXX" },
                { key: "tax_pin", label: "KRA PIN", ph: "P051XXXXXX" },
                { key: "category", label: "Category", ph: "Pharmaceuticals" },
                { key: "address", label: "Address", ph: "Nairobi, Kenya" },
              ].map(({ key, label, ph, type, full }) => (
                <div key={key} style={{ gridColumn: full ? "1 / -1" : undefined }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 5 }}>{label}</label>
                  <input type={type || "text"} value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ ...S.inp, width: "100%", boxSizing: "border-box" as const }} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => setShowNew(false)} style={{ padding: "8px 16px", background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.r, fontSize: 13, cursor: "pointer", color: T.fgMuted }}>Cancel</button>
                <button onClick={saveNew} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#e67e22", color: "#fff", border: "none", borderRadius: T.r, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} />}
                  Add Supplier
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
