import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle, AlertTriangle, XCircle, ClipboardList, RefreshCw, TrendingUp, Eye } from "lucide-react";

export default function QualityDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, pending: 0, ncCount: 0, ncOpen: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [insp, nc] = await Promise.all([
        supabase.from("quality_inspections").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("non_conformances").select("*").limit(50),
      ]);
      const inspections = insp.data || [];
      const ncs = nc.data || [];
      setStats({
        total: inspections.length,
        passed: inspections.filter((i: any) => i.result === "pass" || i.status === "passed").length,
        failed: inspections.filter((i: any) => i.result === "fail" || i.status === "failed").length,
        pending: inspections.filter((i: any) => !i.result || i.status === "pending").length,
        ncCount: ncs.length,
        ncOpen: ncs.filter((n: any) => n.status === "open").length,
      });
      setRecent(inspections.slice(0, 8));
    } catch { /* silent */ }
    setLoading(false);
  }

  const CARDS = [
    { label: "Total Inspections", value: stats.total, icon: ClipboardList, color: "#0369a1", bg: "#e0f2fe" },
    { label: "Passed", value: stats.passed, icon: CheckCircle, color: "#10b981", bg: "#d1fae5" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "#ef4444", bg: "#fee2e2" },
    { label: "Pending", value: stats.pending, icon: AlertTriangle, color: "#f59e0b", bg: "#fef3c7" },
    { label: "Non-Conformances", value: stats.ncCount, icon: Shield, color: "#7c3aed", bg: "#ede9fe" },
    { label: "Open NCs", value: stats.ncOpen, icon: AlertTriangle, color: "#dc2626", bg: "#fef2f2" },
  ];

  const passRate = stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(1) : "0.0";

  const MODULES = [
    { label: "Inspections", path: "/quality/inspections", icon: ClipboardList, color: "#0369a1", desc: "QC inspection records" },
    { label: "Non-Conformance", path: "/quality/non-conformance", icon: Shield, color: "#dc2626", desc: "NC reports & CAPA" },
    { label: "Goods Received", path: "/goods-received", icon: CheckCircle, color: "#10b981", desc: "GRN quality check" },
    { label: "Reports", path: "/reports", icon: TrendingUp, color: "#9333ea", desc: "Quality analytics" },
  ];

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Quality Dashboard</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>Quality Control & Assurance — EL5 MediProcure</p>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      {/* Pass rate banner */}
      <div style={{ background: parseFloat(passRate) >= 90 ? "#d1fae5" : parseFloat(passRate) >= 70 ? "#fef3c7" : "#fee2e2",
        border: `1px solid ${parseFloat(passRate) >= 90 ? "#6ee7b7" : parseFloat(passRate) >= 70 ? "#fde68a" : "#fca5a5"}`,
        borderRadius: 10, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
        <TrendingUp style={{ width: 20, height: 20, color: parseFloat(passRate) >= 90 ? "#059669" : "#d97706" }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>
          Overall Pass Rate: {loading ? "—" : `${passRate}%`}
        </span>
        <span style={{ fontSize: 12, color: "#6b7280" }}>({stats.passed} passed / {stats.total} total)</span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 16, marginBottom: 28 }}>
        {CARDS.map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 12, padding: 18,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: "#111827", margin: 0 }}>{loading ? "—" : c.value}</p>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <c.icon style={{ width: 18, height: 18, color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Inspections */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Recent Inspections</h3>
          <button onClick={() => navigate("/quality/inspections")} style={{ fontSize: 12, color: "#0369a1", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
        </div>
        {loading ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</p> :
          recent.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No inspections recorded yet.</p> :
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #f3f4f6" }}>
                {["Reference","Item","Inspector","Date","Result"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((r: any, i: number) => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                  <td style={{ padding: "8px 10px", color: "#374151", fontWeight: 600 }}>{r.reference || r.inspection_number || `INS-${i+1}`}</td>
                  <td style={{ padding: "8px 10px", color: "#374151" }}>{r.item_name || r.item || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#6b7280" }}>{r.inspector_name || r.inspector || "—"}</td>
                  <td style={{ padding: "8px 10px", color: "#6b7280" }}>{r.inspection_date ? new Date(r.inspection_date).toLocaleDateString("en-KE") : r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE") : "—"}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: r.result === "pass" ? "#d1fae5" : r.result === "fail" ? "#fee2e2" : "#fef3c7",
                      color: r.result === "pass" ? "#065f46" : r.result === "fail" ? "#991b1b" : "#92400e" }}>
                      {(r.result || r.status || "pending").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>

      {/* Module tiles */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>Quality Modules</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 12 }}>
        {MODULES.map(m => (
          <button key={m.path} onClick={() => navigate(m.path)} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16,
            textAlign: "left", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: m.color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <m.icon style={{ width: 16, height: 16, color: m.color }} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{m.label}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
