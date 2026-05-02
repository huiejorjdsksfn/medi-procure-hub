import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RELEASES, CURRENT_VERSION, getTotalStats } from "@/lib/version";
import { Activity, Package, CheckCircle, AlertCircle, ChevronDown, ChevronUp, ExternalLink, Tag } from "lucide-react";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  stable:     { bg: "#d1fae5", color: "#065f46", label: "Stable" },
  lts:        { bg: "#dbeafe", color: "#1e40af", label: "LTS" },
  beta:       { bg: "#fef3c7", color: "#92400e", label: "Beta" },
  deprecated: { bg: "#f3f4f6", color: "#6b7280", label: "Deprecated" },
};

export default function ChangelogPage() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<string>(CURRENT_VERSION);
  const [filter, setFilter] = useState<"all" | "stable" | "lts">("all");
  const stats = getTotalStats();

  const sorted = [...RELEASES].reverse();
  const filtered = filter === "all" ? sorted : sorted.filter(r => r.status === filter || (filter === "lts" && r.status === "stable"));

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Activity style={{ width: 18, height: 18, color: "#0369a1" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Changelog</h1>
          <span style={{ padding: "3px 10px", borderRadius: 99, background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 700 }}>
            v{CURRENT_VERSION} Current
          </span>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          EL5 MediProcure — ProcurBosse Release History · Embu Level 5 Hospital
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Releases", value: stats.totalReleases, color: "#0369a1" },
          { label: "Pages Added", value: stats.totalPages, color: "#10b981" },
          { label: "Bugs Fixed", value: stats.totalBugsFixed, color: "#7c3aed" },
          { label: "DB Migrations", value: stats.totalMigrations, color: "#d97706" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 10, padding: "14px 16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.07)", textAlign: "center" }}>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: "0 0 2px" }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {(["all","stable","lts"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: filter === f ? "#0369a1" : "#fff",
            color: filter === f ? "#fff" : "#374151",
            border: `1px solid ${filter === f ? "#0369a1" : "#e5e7eb"}`,
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Release entries */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(r => {
          const s = STATUS_STYLE[r.status] || STATUS_STYLE.stable;
          const isOpen = expanded === r.version;
          const isCurrent = r.version === CURRENT_VERSION;

          return (
            <div key={r.version} style={{
              background: "#fff", borderRadius: 12, overflow: "hidden",
              boxShadow: isCurrent ? "0 0 0 2px #0369a1" : "0 1px 3px rgba(0,0,0,0.08)",
              border: "1px solid #f0f0f0"
            }}>
              {/* Row header */}
              <button onClick={() => setExpanded(isOpen ? "" : r.version)}
                style={{ width: "100%", padding: "14px 20px", background: "none", border: "none",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: isCurrent ? "#0369a1" : "#f3f4f6",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Tag style={{ width: 14, height: 14, color: isCurrent ? "#fff" : "#6b7280" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>v{r.version}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: s.bg, color: s.color }}>{s.label}</span>
                    {isCurrent && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#0369a1", color: "#fff" }}>CURRENT</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>{r.date} · {r.codename} · {r.highlights?.length || 0} changes</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "right", fontSize: 11, color: "#9ca3af" }}>
                    <div>{r.pagesAdded > 0 && `+${r.pagesAdded} pages`}</div>
                    <div>{r.bugsFixed > 0 && `${r.bugsFixed} fixes`}</div>
                  </div>
                  {isOpen ? <ChevronUp style={{ width: 16, height: 16, color: "#9ca3af" }} /> : <ChevronDown style={{ width: 16, height: 16, color: "#9ca3af" }} />}
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div style={{ padding: "0 20px 20px", borderTop: "1px solid #f3f4f6" }}>
                  {/* Highlights */}
                  {r.highlights && r.highlights.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Changes ({r.highlights.length})
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {r.highlights.map((h: string, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "#374151" }}>
                            <CheckCircle style={{ width: 14, height: 14, color: "#10b981", flexShrink: 0, marginTop: 2 }} />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modules */}
                  {r.modules && r.modules.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Modules</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.modules.map((m: string) => (
                          <span key={m} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, background: "#f3f4f6", color: "#374151", fontWeight: 600 }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Engines */}
                  {r.engines && r.engines.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#374151", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>Engines</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {r.engines.map((e: string) => (
                          <span key={e} style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, background: "#ede9fe", color: "#5b21b6", fontWeight: 600 }}>{e}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: "flex", gap: 20, marginTop: 14, padding: "10px 0", borderTop: "1px solid #f3f4f6", fontSize: 12, color: "#9ca3af" }}>
                    <span>📦 {r.dbMigrations} migration{r.dbMigrations !== 1 ? "s" : ""}</span>
                    <span>🐛 {r.bugsFixed} bug{r.bugsFixed !== 1 ? "s" : ""} fixed</span>
                    <span>📄 {r.pagesAdded} page{r.pagesAdded !== 1 ? "s" : ""} added</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
