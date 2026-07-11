/**
 * Admin diagnostics screen for runtime crashes captured by ErrorBoundary
 * and the global window.onerror / unhandledrejection handlers. Shows the
 * most recent 100 reports with the user, path, message, and stack; admins
 * can mark a report resolved, delete it, or copy the stack for triage.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import RoleGuard from "@/components/RoleGuard";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import { RefreshCw, Trash2, CheckCircle, AlertTriangle, Copy } from "lucide-react";

const db = supabase as any;

interface CrashRow {
  id: string;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  path: string | null;
  page_name: string | null;
  message: string;
  stack: string | null;
  component_stack: string | null;
  user_agent: string | null;
  resolved: boolean;
}

const S = {
  wrap:  { padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif" } as const,
  h:     { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "6px 0 4px" } as const,
  sub:   { fontSize: 12, color: "#64748b", marginBottom: 16 } as const,
  bar:   { display: "flex", gap: 10, marginBottom: 14, alignItems: "center" } as const,
  btn:   (bg = "#2563eb"): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: bg, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }),
  card:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, marginBottom: 10, boxShadow: "0 1px 2px rgba(0,0,0,.04)" } as const,
  pill:  (ok: boolean): React.CSSProperties => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: ok ? "#dcfce7" : "#fee2e2", color: ok ? "#166534" : "#991b1b" }),
  meta:  { fontSize: 11, color: "#64748b", display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 6 },
  msg:   { fontSize: 13, color: "#0f172a", fontWeight: 600, marginBottom: 8 } as const,
  stack: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#334155", background: "#f1f5f9", padding: 8, borderRadius: 6, whiteSpace: "pre-wrap" as const, maxHeight: 180, overflow: "auto" as const },
};

export default function CrashReportsPage() {
  const [rows, setRows] = useState<CrashRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = db.from("crash_reports").select("*").order("created_at", { ascending: false }).limit(100);
    const { data, error } = await q;
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = db.channel("crash_reports_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "crash_reports" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const markResolved = async (id: string) => {
    const { error } = await db.from("crash_reports").update({ resolved: true }).eq("id", id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    toast({ title: "Marked resolved" });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete this crash report?")) return;
    const { error } = await db.from("crash_reports").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    load();
  };

  const copyStack = (r: CrashRow) => {
    navigator.clipboard.writeText(`${r.message}\n\n${r.stack || ""}\n\n${r.component_stack || ""}`);
    toast({ title: "Copied", description: "Stack trace on clipboard" });
  };

  const visible = rows.filter(r => showResolved || !r.resolved);
  const openCount = rows.filter(r => !r.resolved).length;

  return (
    <RoleGuard allowed={["admin", "database_admin"]}>
      <div style={S.wrap}>
        <AdminBreadcrumb />
        <h1 style={S.h}>Crash Diagnostics</h1>
        <div style={S.sub}>{openCount} open · {rows.length} total (most recent 100)</div>

        <div style={S.bar}>
          <button style={S.btn()} onClick={load} disabled={loading}>
            <RefreshCw size={13}/> {loading ? "Loading…" : "Refresh"}
          </button>
          <label style={{ fontSize: 12, color: "#334155", display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)}/>
            Show resolved
          </label>
        </div>

        {visible.length === 0 && !loading && (
          <div style={{ ...S.card, textAlign: "center" as const, color: "#64748b" }}>
            <CheckCircle size={22} style={{ color: "#16a34a" }}/>
            <div style={{ marginTop: 6, fontSize: 13 }}>No crashes to review. All clear.</div>
          </div>
        )}

        {visible.map(r => (
          <div key={r.id} style={S.card}>
            <div style={S.meta}>
              <span style={S.pill(r.resolved)}>{r.resolved ? "resolved" : "open"}</span>
              <span>🕒 {new Date(r.created_at).toLocaleString("en-KE")}</span>
              {r.page_name && <span>📄 {r.page_name}</span>}
              {r.path && <span>🔗 {r.path}</span>}
              {r.user_email && <span>👤 {r.user_email}</span>}
            </div>
            <div style={S.msg}>
              <AlertTriangle size={14} style={{ color: "#dc2626", verticalAlign: "middle", marginRight: 6 }}/>
              {r.message}
            </div>
            {(r.stack || r.component_stack) && (
              <div style={S.stack}>
                {r.stack}
                {r.component_stack && `\n\nComponent stack:${r.component_stack}`}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {!r.resolved && (
                <button style={S.btn("#059669")} onClick={() => markResolved(r.id)}>
                  <CheckCircle size={13}/> Mark resolved
                </button>
              )}
              <button style={S.btn("#475569")} onClick={() => copyStack(r)}>
                <Copy size={13}/> Copy stack
              </button>
              <button style={S.btn("#dc2626")} onClick={() => del(r.id)}>
                <Trash2 size={13}/> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </RoleGuard>
  );
}