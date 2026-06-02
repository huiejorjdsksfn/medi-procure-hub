/**
 * Admin dashboard for recent 404 events.
 * Visible to admin / database_admin / webmaster (enforced by RoleGuard + RLS).
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trash2, RefreshCw, AlertCircle } from "lucide-react";

type Row = {
  id: string;
  path: string;
  referrer: string | null;
  user_id: string | null;
  user_role: string | null;
  user_agent: string | null;
  source: string;
  ip: string | null;
  created_at: string;
};

export default function NotFoundLogPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("not_found_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows((data as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearAll = async () => {
    if (!confirm("Delete ALL 404 log entries?")) return;
    const { error } = await (supabase as any)
      .from("not_found_log").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    toast({ title: "404 log cleared" });
    load();
  };

  const filtered = rows.filter(r =>
    !filter ||
    r.path.toLowerCase().includes(filter.toLowerCase()) ||
    (r.user_role || "").toLowerCase().includes(filter.toLowerCase()) ||
    (r.ip || "").includes(filter)
  );

  // Top paths summary
  const topPaths = Object.entries(
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.path] = (acc[r.path] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ padding: 24, fontFamily: "var(--font-family)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={20} /> 404 Tracker
          </h1>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            Last 500 missing-route events (client + server). Use this to spot broken links and stale deploys.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={btn("#0078d4")}><RefreshCw size={14} /> Refresh</button>
          <button onClick={clearAll} style={btn("#a4262c")}><Trash2 size={14} /> Clear all</button>
        </div>
      </div>

      {topPaths.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
            Top missing paths
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
            {topPaths.map(([p, n]) => (
              <div key={p} style={{ padding: 10, border: "1px solid var(--color-border)", borderRadius: 6, background: "#fff7f7" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{n} hit{n === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by path, role, or IP…"
        style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--color-border)", borderRadius: 6, marginBottom: 12, fontSize: 13 }}
      />

      <div style={{ ...card, padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f3f5f8", textAlign: "left" }}>
              {["When", "Path", "Source", "Role", "User", "IP", "Referrer"].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)" }}>No 404s recorded 🎉</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                <td style={td}>{new Date(r.created_at).toLocaleString()}</td>
                <td style={{ ...td, fontFamily: "monospace", fontWeight: 600 }}>{r.path}</td>
                <td style={td}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: r.source === "server" ? "#dcfce7" : "#dbeafe",
                    color: r.source === "server" ? "#166534" : "#1e40af" }}>{r.source}</span>
                </td>
                <td style={td}>{r.user_role || "—"}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{r.user_id ? r.user_id.slice(0, 8) + "…" : "anon"}</td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>{r.ip || "—"}</td>
                <td style={{ ...td, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.referrer || ""}>{r.referrer || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 14px", background: bg, color: "#fff",
  border: "none", borderRadius: 6, cursor: "pointer",
  fontSize: 12, fontWeight: 700,
});
const card: React.CSSProperties = {
  background: "var(--color-card-bg)", border: "1px solid var(--color-border)",
  borderRadius: 8, padding: 14, marginBottom: 14,
};
const th: React.CSSProperties = { padding: "10px 12px", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-text-muted)" };
const td: React.CSSProperties = { padding: "8px 12px", verticalAlign: "top" };