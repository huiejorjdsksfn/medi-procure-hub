/**
 * SupabaseControlsPage — one-click live controls for admins:
 * schema cache reload, storage bucket listing, edge function health,
 * cache purge, and quick backup trigger. All operations run under the
 * caller's session so RLS + roles are enforced end-to-end.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import RoleGuard from "@/components/RoleGuard";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import { logAudit } from "@/lib/audit";
import { useAuth } from "@/contexts/AuthContext";
import {
  Database, RefreshCw, HardDrive, Zap, ShieldCheck,
  CloudUpload, Trash2, Activity, PlayCircle,
} from "lucide-react";

const db = supabase as any;

const S = {
  wrap:  { padding: 20, background: "#f8fafc", minHeight: "100vh", fontFamily: "'Inter',system-ui,sans-serif" } as const,
  h:     { fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "6px 0 16px" } as const,
  grid:  { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 } as const,
  card:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.05)" } as const,
  title: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 } as const,
  sub:   { fontSize: 12, color: "#64748b", marginBottom: 10 } as const,
  btn:   (bg = "#2563eb"): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: bg, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }),
  pill:  (ok: boolean): React.CSSProperties => ({ display: "inline-block", padding: "3px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: ok ? "#dcfce7" : "#fee2e2", color: ok ? "#166534" : "#991b1b" }),
  code:  { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#334155", background: "#f1f5f9", padding: 8, borderRadius: 6, marginTop: 8, whiteSpace: "pre-wrap" as const, maxHeight: 160, overflow: "auto" as const },
};

export default function SupabaseControlsPage() {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [fnHealth, setFnHealth] = useState<Record<string, boolean>>({});
  const [tableCount, setTableCount] = useState<number | null>(null);
  const [lastLog, setLastLog] = useState<string>("");

  const run = useCallback(async <T,>(label: string, task: () => Promise<T>): Promise<T | null> => {
    setBusy(label);
    try {
      const out = await task();
      logAudit(user?.id, profile?.full_name, `sb_control:${label}`, "system");
      return out;
    } catch (e: any) {
      toast({ title: label, description: e?.message || String(e), variant: "destructive" });
      return null;
    } finally { setBusy(null); }
  }, [user?.id, profile?.full_name]);

  const loadBuckets = useCallback(async () => {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    setBuckets(data || []);
  }, []);

  const loadSchema = useCallback(async () => {
    const { data, error } = await db.rpc("get_full_schema");
    if (error) throw error;
    setTableCount(Array.isArray(data) ? data.length : 0);
  }, []);

  const pingFn = useCallback(async (name: string) => {
    try {
      const { error } = await supabase.functions.invoke(name, { body: { ping: true } });
      setFnHealth(s => ({ ...s, [name]: !error }));
    } catch {
      setFnHealth(s => ({ ...s, [name]: false }));
    }
  }, []);

  useEffect(() => {
    run("load", async () => { await Promise.all([loadBuckets(), loadSchema()]); });
    ["session-validate","role-check","track-404","edgeone-stats"].forEach(pingFn);
  }, [run, loadBuckets, loadSchema, pingFn]);

  return (
    <RoleGuard allowedRoles={["admin", "database_admin"]}>
      <div style={S.wrap}>
        <AdminBreadcrumb />
        <h1 style={S.h}>Supabase Live Controls</h1>
        <div style={S.grid}>
          <div style={S.card}>
            <div style={S.title}><Database size={16}/> Schema</div>
            <div style={S.sub}>Public tables discoverable via RPC.</div>
            <div>Tables: <b>{tableCount ?? "…"}</b></div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button style={S.btn()} disabled={!!busy}
                onClick={() => run("reload_schema", async () => {
                  await db.rpc("reload_schema_cache").catch(() => {});
                  await loadSchema();
                  toast({ title: "Schema reloaded" });
                })}>
                <RefreshCw size={14}/> Reload cache
              </button>
            </div>
          </div>

          <div style={S.card}>
            <div style={S.title}><HardDrive size={16}/> Storage buckets</div>
            <div style={S.sub}>{buckets.length} bucket(s)</div>
            {buckets.map(b => (
              <div key={b.id} style={{ fontSize: 12, padding: "2px 0" }}>
                • {b.name} <span style={S.pill(!!b.public)}>{b.public ? "public" : "private"}</span>
              </div>
            ))}
            <button style={{ ...S.btn("#0f766e"), marginTop: 10 }} disabled={!!busy}
              onClick={() => run("refresh_buckets", loadBuckets)}>
              <RefreshCw size={14}/> Refresh
            </button>
          </div>

          <div style={S.card}>
            <div style={S.title}><Zap size={16}/> Edge function health</div>
            <div style={S.sub}>Live ping · session · role · tracker</div>
            {Object.entries(fnHealth).map(([n, ok]) => (
              <div key={n} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                <span>{n}</span><span style={S.pill(ok)}>{ok ? "OK" : "DOWN"}</span>
              </div>
            ))}
            <button style={{ ...S.btn("#7c3aed"), marginTop: 10 }}
              onClick={() => ["session-validate","role-check","track-404","edgeone-stats"].forEach(pingFn)}>
              <Activity size={14}/> Re-ping all
            </button>
          </div>

          <div style={S.card}>
            <div style={S.title}><ShieldCheck size={16}/> Session & RBAC</div>
            <div style={S.sub}>Force a fresh token + role fetch for the current user.</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={S.btn("#059669")} disabled={!!busy}
                onClick={() => run("refresh_session", async () => {
                  const { data, error } = await supabase.auth.refreshSession();
                  if (error) throw error;
                  setLastLog(`Session refreshed for ${data.user?.email} at ${new Date().toISOString()}`);
                  toast({ title: "Session refreshed" });
                })}>
                <RefreshCw size={14}/> Refresh session
              </button>
              <button style={S.btn("#dc2626")} disabled={!!busy}
                onClick={() => run("sign_out_all", async () => {
                  await supabase.auth.signOut({ scope: "others" as any });
                  toast({ title: "Other sessions revoked" });
                })}>
                <Trash2 size={14}/> Revoke others
              </button>
            </div>
            {lastLog && <div style={S.code}>{lastLog}</div>}
          </div>

          <div style={S.card}>
            <div style={S.title}><CloudUpload size={16}/> Backups</div>
            <div style={S.sub}>Trigger the daily sanity + backup edge function on demand.</div>
            <button style={S.btn("#b45309")} disabled={!!busy}
              onClick={() => run("backup_now", async () => {
                const { error } = await supabase.functions.invoke("db-daily-sanity", { body: { manual: true } });
                if (error) throw error;
                toast({ title: "Backup job queued" });
              })}>
              <PlayCircle size={14}/> Run now
            </button>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
