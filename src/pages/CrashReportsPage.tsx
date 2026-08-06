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
  severity: "critical" | "high" | "medium" | "low" | null;
  category: string | null;
  ai_summary: string | null;
}

const SEVERITY_COLOR: Record<string,string> = { critical:"#dc2626", high:"#ea580c", medium:"#d97706", low:"#65a30d" };

const S = {
  wrap:  { padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif" } as const,
  bar:   { display: "flex", gap: 10, marginBottom: 16, alignItems: "center" } as const,
  btn:   (bg = "#2563eb"): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", background: bg, color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "transform .1s, filter .1s" }),
  card:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 15, marginBottom: 10, boxShadow: "0 1px 3px rgba(16,24,40,.05)", transition: "box-shadow .15s" } as const,
  pill:  (ok: boolean): React.CSSProperties => ({ display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: ok ? "#dcfce7" : "#fee2e2", color: ok ? "#166534" : "#991b1b" }),
  meta:  { fontSize: 11, color: "#64748b", display: "flex", flexWrap: "wrap" as const, gap: 10, marginBottom: 6 },
  msg:   { fontSize: 13, color: "#0f172a", fontWeight: 600, marginBottom: 8 } as const,
  stack: { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#334155", background: "#f1f5f9", padding: 8, borderRadius: 6, whiteSpace: "pre-wrap" as const, maxHeight: 180, overflow: "auto" as const },
};
const btnHover = (e:React.MouseEvent<HTMLElement>)=>{ e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.filter="brightness(1.06)"; };
const btnLeave = (e:React.MouseEvent<HTMLElement>)=>{ e.currentTarget.style.transform="none"; e.currentTarget.style.filter="none"; };
const cardHover = (e:React.MouseEvent<HTMLElement>)=>{ e.currentTarget.style.boxShadow="0 6px 18px rgba(16,24,40,.09)"; };
const cardLeave = (e:React.MouseEvent<HTMLElement>)=>{ e.currentTarget.style.boxShadow="0 1px 3px rgba(16,24,40,.05)"; };

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
        <div style={{ background:"linear-gradient(120deg,#7c2d12,#991b1b 70%)", borderRadius:14, padding:"16px 22px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:18, boxShadow:"0 4px 16px rgba(153,27,27,.22)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:38,height:38,borderRadius:10,background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <AlertTriangle size={19} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>Crash Diagnostics</h1>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.7)" }}>{openCount} open · {rows.length} total (most recent 100)</div>
            </div>
          </div>
        </div>

        <div style={S.bar}>
          <button style={S.btn()} onClick={load} disabled={loading} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
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
          <div key={r.id} style={S.card} onMouseEnter={cardHover} onMouseLeave={cardLeave}>
            <div style={S.meta}>
              <span style={S.pill(r.resolved)}>{r.resolved ? "resolved" : "open"}</span>
              {r.severity && (
                <span style={{ display:"inline-block", padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700, background:(SEVERITY_COLOR[r.severity]||"#64748b")+"18", color:SEVERITY_COLOR[r.severity]||"#64748b", border:`1px solid ${SEVERITY_COLOR[r.severity]||"#64748b"}44` }}>
                  {r.severity.toUpperCase()}{r.category ? ` · ${r.category}` : ""}
                </span>
              )}
              <span>🕒 {new Date(r.created_at).toLocaleString("en-KE")}</span>
              {r.page_name && <span>📄 {r.page_name}</span>}
              {r.path && <span>🔗 {r.path}</span>}
              {r.user_email && <span>👤 {r.user_email}</span>}
            </div>
            <div style={S.msg}>
              <AlertTriangle size={14} style={{ color: "#dc2626", verticalAlign: "middle", marginRight: 6 }}/>
              {r.message}
            </div>
            {r.ai_summary && (
              <div style={{ fontSize:12, color:"#4338ca", background:"#eef2ff", border:"1px solid #c7d2fe", borderRadius:6, padding:"6px 10px", marginBottom:8, display:"flex", gap:6, alignItems:"flex-start" }}>
                <span>✨</span><span>{r.ai_summary}</span>
              </div>
            )}
            {(r.stack || r.component_stack) && (
              <div style={S.stack}>
                {r.stack}
                {r.component_stack && `\n\nComponent stack:${r.component_stack}`}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {!r.resolved && (
                <button style={S.btn("#059669")} onClick={() => markResolved(r.id)} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
                  <CheckCircle size={13}/> Mark resolved
                </button>
              )}
              <button style={S.btn("#475569")} onClick={() => copyStack(r)} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
                <Copy size={13}/> Copy stack
              </button>
              <button style={S.btn("#dc2626")} onClick={() => del(r.id)} onMouseEnter={btnHover} onMouseLeave={btnLeave}>
                <Trash2 size={13}/> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </RoleGuard>
  );
}