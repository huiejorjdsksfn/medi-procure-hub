import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Plus, Trash2, Edit2, Save, X, FileText, Clock, CheckCircle, AlertTriangle, Download } from "lucide-react";

interface Plan {
  id?: string;
  title: string;
  department: string;
  category: string;
  estimated_amount: number;
  planned_date: string;
  status: string;
  priority: string;
  notes: string;
  created_at?: string;
}

const EMPTY: Plan = { title: "", department: "", category: "", estimated_amount: 0, planned_date: "", status: "draft", priority: "medium", notes: "" };
const STATUS_COLORS: Record<string, string> = { draft: "#9ca3af", planned: "#0369a1", approved: "#10b981", cancelled: "#ef4444", completed: "#7c3aed" };
const PRIORITY_COLORS: Record<string, string> = { low: "#6b7280", medium: "#f59e0b", high: "#ef4444", critical: "#7c2d12" };

export default function ProcurementPlanningPage() {
  const { roles } = useAuth();
  const canEdit = roles.some(r => ["admin","procurement_manager","procurement_officer"].includes(r));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Plan>(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("procurement_plans").select("*").order("planned_date", { ascending: true });
    setPlans(data || []);
    setLoading(false);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    if (editing) {
      await supabase.from("procurement_plans").update(form).eq("id", editing);
    } else {
      await supabase.from("procurement_plans").insert(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    setForm(EMPTY);
    load();
  }

  async function del(id: string) {
    if (!confirm("Delete this plan?")) return;
    await supabase.from("procurement_plans").delete().eq("id", id);
    load();
  }

  function startEdit(p: Plan) {
    setForm(p);
    setEditing(p.id || null);
    setShowForm(true);
  }

  const filtered = plans.filter(p =>
    (filterStatus === "all" || p.status === filterStatus) &&
    (p.title?.toLowerCase().includes(search.toLowerCase()) || p.department?.toLowerCase().includes(search.toLowerCase()))
  );

  const totalBudget = filtered.reduce((s, p) => s + (parseFloat(String(p.estimated_amount)) || 0), 0);

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Procurement Planning</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Annual procurement calendar and budget planning</p>
        </div>
        {canEdit && (
          <button onClick={() => { setForm(EMPTY); setEditing(null); setShowForm(true); }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px",
              background: "#0369a1", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Plus style={{ width: 15, height: 15 }} /> New Plan
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Plans", value: plans.length, color: "#0369a1" },
          { label: "Approved", value: plans.filter(p => p.status === "approved").length, color: "#10b981" },
          { label: "Pending", value: plans.filter(p => p.status === "draft" || p.status === "planned").length, color: "#f59e0b" },
          { label: "Est. Budget", value: `KES ${plans.reduce((s,p) => s + (parseFloat(String(p.estimated_amount))||0),0).toLocaleString()}`, color: "#7c3aed", wide: true },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: c.color, margin: "0 0 2px" }}>{c.value}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, fontWeight: 600 }}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search plans..."
          style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, flex: 1, minWidth: 160 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff" }}>
          <option value="all">All Status</option>
          {["draft","planned","approved","completed","cancelled"].map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 28, width: 520, maxWidth: "95vw", maxHeight: "90vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{editing ? "Edit Plan" : "New Procurement Plan"}</h2>
              <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X style={{ width: 18, height: 18, color: "#6b7280" }} />
              </button>
            </div>
            {[
              { label: "Title *", key: "title", type: "text" },
              { label: "Department", key: "department", type: "text" },
              { label: "Category", key: "category", type: "text" },
              { label: "Estimated Amount (KES)", key: "estimated_amount", type: "number" },
              { label: "Planned Date", key: "planned_date", type: "date" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? parseFloat(e.target.value)||0 : e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13 }}>
                  {["draft","planned","approved","completed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13 }}>
                  {["low","medium","high","critical"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 }}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 7, fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={save} disabled={saving} style={{
                flex: 1, padding: "10px", background: "#0369a1", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                {saving ? "Saving…" : "Save Plan"}
              </button>
              <button onClick={() => setShowForm(false)} style={{
                padding: "10px 20px", background: "#f3f4f6", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Plans table */}
      <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{filtered.length} plans · Est. KES {totalBudget.toLocaleString()}</span>
        </div>
        {loading ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>Loading…</div> :
          filtered.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>No procurement plans yet. {canEdit && "Click 'New Plan' to get started."}</div> :
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["Title","Department","Category","Est. Amount","Date","Priority","Status",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id || i} style={{ borderBottom: "1px solid #f9fafb" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td style={{ padding: "10px 14px", fontWeight: 600, color: "#111827" }}>{p.title}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7280" }}>{p.department || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#6b7280" }}>{p.category || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#111827", fontWeight: 600 }}>
                    KES {(parseFloat(String(p.estimated_amount))||0).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#6b7280" }}>{p.planned_date || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[p.priority] || "#6b7280" }}>
                      {(p.priority || "medium").toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                      background: STATUS_COLORS[p.status] + "22", color: STATUS_COLORS[p.status] || "#6b7280" }}>
                      {p.status || "draft"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {canEdit && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => startEdit(p)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>
                          <Edit2 style={{ width: 12, height: 12, color: "#6b7280" }} />
                        </button>
                        <button onClick={() => del(p.id!)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #fee2e2", background: "#fff", cursor: "pointer" }}>
                          <Trash2 style={{ width: 12, height: 12, color: "#ef4444" }} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    </div>
  );
}
