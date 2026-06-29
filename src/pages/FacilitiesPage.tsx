/**
 * EL5 MediProcure — Facilities Management
 * Multi-facility / ward / department / building registry
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useNavigate } from "react-router-dom";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import { T } from "@/lib/theme";

export default function FacilitiesPage() {
  const nav = useNavigate();
  return (
    <div style={{ background: T.bg, minHeight: "100vh", padding: "24px 20px" }}>
      <AdminBreadcrumb items={[{ label: "Facilities" }]} />

      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ fontSize: 36 }}>🏥</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: T.fg }}>
              Facilities Management
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.muted }}>
              Wards, departments, buildings and cost centres — Embu Level 5 Hospital
            </p>
          </div>
        </div>

        {/* Coming-soon card */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "40px 32px", textAlign: "center"
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🏗️</div>
          <h2 style={{ margin: "0 0 10px", fontSize: 18, fontWeight: 700, color: T.fg }}>
            Module Coming Soon
          </h2>
          <p style={{ color: T.muted, fontSize: 13, maxWidth: 480, margin: "0 auto 24px" }}>
            The Facilities module will provide a full registry of wards, theatres, labs,
            storage rooms, and administrative blocks — with capacity tracking, maintenance
            schedules, and cost-centre allocation linked to procurement.
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => nav("/departments")}
              style={{ padding: "9px 18px", background: T.primary, color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              🏛️ Manage Departments
            </button>
            <button
              onClick={() => nav("/settings")}
              style={{ padding: "9px 18px", background: "transparent", color: T.fg, border: `1px solid ${T.border}`, borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              ⚙️ System Settings
            </button>
          </div>
        </div>

        {/* Planned features */}
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12 }}>
          {[
            { icon: "🏢", title: "Building Registry",    desc: "Map all physical structures and floors" },
            { icon: "🛏️", title: "Ward Management",      desc: "Bed counts, occupancy, specialisations" },
            { icon: "🔬", title: "Lab & Theatre Rooms",  desc: "Equipment and capacity scheduling" },
            { icon: "💰", title: "Cost Centres",         desc: "Link facilities to financial reporting" },
            { icon: "🔧", title: "Maintenance Log",      desc: "Track repairs and scheduled servicing" },
            { icon: "📦", title: "Store Allocation",     desc: "Assign store rooms to departments" },
          ].map((f, i) => (
            <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "14px 16px" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.fg, marginBottom: 4 }}>{f.title}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
