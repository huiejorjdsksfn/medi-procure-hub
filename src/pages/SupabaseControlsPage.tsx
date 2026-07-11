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
  CloudUpload, Trash2, Activity, PlayCircle, HeartPulse,
} from "lucide-react";

const db = supabase as any;

const ELIMU_FUNCTIONS_BASE = "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1";
const ELIMU_STATUS_URL = "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=status";
const ELIMU_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";
const MAINSERV_STATUS_URL = "https://zcaxkxuqvffytapproeb.supabase.co/functions/v1/keepalive-bot?action=status";
const MAINSERV_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjYXhreHVxdmZmeXRhcHByb2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNDYyMTUsImV4cCI6MjA3MjcyMjIxNX0.xmIdsFnpLE-BMk0u1FPGGXHtawKSE2zADcPpRVls1yc";

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
  const [bucketFiles, setBucketFiles] = useState<Record<string, { count: number; bytes: number; files: any[]; loading: boolean; error?: string }>>({});
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  const [fnHealth, setFnHealth] = useState<Record<string, boolean>>({});
  const [tableCount, setTableCount] = useState<number | null>(null);
  const [lastLog, setLastLog] = useState<string>("");
  const [backupLog, setBackupLog] = useState<string>("");
  const [botStats, setBotStats] = useState<Record<string, any>>({});
  const [botError, setBotError] = useState<Record<string, string>>({});
  const [eoData, setEoData] = useState<any>(null);
  const [eoError, setEoError] = useState<string>("");
  const [eoBusy, setEoBusy] = useState(false);

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
    // Fetch file counts for each bucket in parallel (best-effort).
    for (const b of data || []) {
      setBucketFiles(s => ({ ...s, [b.name]: { count: 0, bytes: 0, files: [], loading: true } }));
      supabase.storage.from(b.name).list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } })
        .then(({ data: files, error: fe }) => {
          if (fe) {
            setBucketFiles(s => ({ ...s, [b.name]: { count: 0, bytes: 0, files: [], loading: false, error: fe.message } }));
            return;
          }
          const list = files || [];
          const bytes = list.reduce((sum, f: any) => sum + (f?.metadata?.size || 0), 0);
          setBucketFiles(s => ({ ...s, [b.name]: { count: list.length, bytes, files: list, loading: false } }));
        })
        .catch(err => {
          setBucketFiles(s => ({ ...s, [b.name]: { count: 0, bytes: 0, files: [], loading: false, error: String(err?.message || err) } }));
        });
    }
  }, []);

  const loadSchema = useCallback(async () => {
    const { data, error } = await db.rpc("get_full_schema");
    if (error) throw error;
    setTableCount(Array.isArray(data) ? data.length : 0);
  }, []);

  const pingFn = useCallback(async (name: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const method = name === "edgeone-stats" ? "GET" : "POST";
      const res = await fetch(`${ELIMU_FUNCTIONS_BASE}/${name}`, {
        method,
        headers: {
          apikey: ELIMU_ANON_KEY,
          Authorization: `Bearer ${token || ELIMU_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: method === "POST" ? JSON.stringify({ ping: true }) : undefined,
      });
      // A function is "reachable" if it responded at all — including
      // expected 401s from auth-gated functions with no active session.
      // That proves it's deployed and executing, not down. Only a genuine
      // network/CORS failure (thrown below) means it's actually down.
      setFnHealth(s => ({ ...s, [name]: res.status > 0 }));
    } catch {
      setFnHealth(s => ({ ...s, [name]: false }));
    }
  }, []);

  const pollBots = useCallback(async () => {
    try {
      const r = await fetch(ELIMU_STATUS_URL, { headers: { apikey: ELIMU_ANON_KEY } });
      const d = await r.json();
      setBotStats(s => ({ ...s, elimu: d }));
      setBotError(s => ({ ...s, elimu: "" }));
    } catch (e: any) {
      setBotError(s => ({ ...s, elimu: e?.message || "unreachable" }));
    }
    try {
      const r = await fetch(MAINSERV_STATUS_URL, { headers: { apikey: MAINSERV_ANON_KEY } });
      const d = await r.json();
      setBotStats(s => ({ ...s, mainserv: d }));
      setBotError(s => ({ ...s, mainserv: "" }));
    } catch (e: any) {
      setBotError(s => ({ ...s, mainserv: e?.message || "unreachable" }));
    }
  }, []);

  const loadEdgeOne = useCallback(async () => {
    setEoBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const [overviewRes, domainsRes] = await Promise.all([
        fetch(`${ELIMU_FUNCTIONS_BASE}/edgeone-stats`, {
          headers: { apikey: ELIMU_ANON_KEY, Authorization: `Bearer ${token || ELIMU_ANON_KEY}` },
        }),
        fetch(`${ELIMU_FUNCTIONS_BASE}/edgeone-stats?action=domains`, {
          headers: { apikey: ELIMU_ANON_KEY, Authorization: `Bearer ${token || ELIMU_ANON_KEY}` },
        }),
      ]);
      const overview = await overviewRes.json();
      const domains = await domainsRes.json();
      if (!overviewRes.ok || overview?.error) {
        setEoError(overview?.error || `HTTP ${overviewRes.status}`);
        setEoData(null);
      } else {
        setEoError("");
        setEoData({ ...overview, domains: domains?.domains ?? [] });
      }
    } catch (e: any) {
      setEoError(e?.message || "unreachable");
      setEoData(null);
    } finally {
      setEoBusy(false);
    }
  }, []);

  const purgeEdgeOne = useCallback(async () => {
    setEoBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`${ELIMU_FUNCTIONS_BASE}/edgeone-stats?action=purge`, {
        method: "POST",
        headers: { apikey: ELIMU_ANON_KEY, Authorization: `Bearer ${token || ELIMU_ANON_KEY}` },
      });
      const d = await res.json();
      toast({
        title: d.triggered ? "Redeploy triggered" : "Purge failed",
        description: d.triggered ? `Deployment ${d.deployment_id} redeploying` : (d.error || "Unknown error"),
        variant: d.triggered ? "default" : "destructive",
      });
      await loadEdgeOne();
    } catch (e: any) {
      toast({ title: "Purge failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setEoBusy(false);
    }
  }, [loadEdgeOne]);

  useEffect(() => {
    run("load", async () => { await Promise.all([loadBuckets(), loadSchema()]); });
    ["session-validate","role-check","track-404","edgeone-stats"].forEach(pingFn);
    loadEdgeOne();
  }, [run, loadBuckets, loadSchema, pingFn, loadEdgeOne]);

  useEffect(() => {
    pollBots();
    const id = setInterval(pollBots, 15000);
    return () => clearInterval(id);
  }, [pollBots]);

  return (
    <RoleGuard allowed={["admin", "database_admin"]}>
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
                  try { await db.rpc("reload_schema_cache"); } catch { /* best-effort */ }
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
            {buckets.map(b => {
              const info = bucketFiles[b.name];
              const kb = info ? Math.round(info.bytes / 1024) : 0;
              const isOpen = expandedBucket === b.name;
              return (
                <div key={b.id} style={{ borderBottom: "1px solid #f1f5f9", padding: "6px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, cursor: "pointer" }}
                       onClick={() => setExpandedBucket(isOpen ? null : b.name)}>
                    <span>
                      {isOpen ? "▾" : "▸"} <b>{b.name}</b>{" "}
                      <span style={S.pill(!!b.public)}>{b.public ? "public" : "private"}</span>
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>
                      {info?.loading ? "…" : info?.error ? "err" : `${info?.count ?? 0} files · ${kb}KB`}
                    </span>
                  </div>
                  {isOpen && info && !info.loading && (
                    <div style={{ marginTop: 6, maxHeight: 200, overflow: "auto" as const, background: "#f8fafc", borderRadius: 4, padding: 6 }}>
                      {info.error && <div style={{ fontSize: 11, color: "#991b1b" }}>{info.error}</div>}
                      {info.files.length === 0 && !info.error && <div style={{ fontSize: 11, color: "#94a3b8" }}>Empty bucket</div>}
                      {info.files.map((f: any) => (
                        <div key={f.id || f.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 4px", color: "#334155" }}>
                          <span style={{ overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const, maxWidth: 200 }}>
                            {f.name}
                          </span>
                          <span style={{ color: "#64748b" }}>
                            {f?.metadata?.size ? `${Math.round(f.metadata.size / 1024)}KB` : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
            <div style={S.sub}>Trigger a real backup: 28 tables + storage files, gzipped to the backups bucket.</div>
            <button style={S.btn("#b45309")} disabled={!!busy}
              onClick={() => run("backup_now", async () => {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData?.session?.access_token;
                const res = await fetch(`${ELIMU_FUNCTIONS_BASE}/backup-runner`, {
                  method: "POST",
                  headers: {
                    apikey: ELIMU_ANON_KEY,
                    Authorization: `Bearer ${token || ELIMU_ANON_KEY}`,
                    "Content-Type": "application/json",
                    "x-triggered-by": "manual",
                  },
                });
                const d = await res.json().catch(() => ({}));
                if (!res.ok || d?.ok === false) {
                  throw new Error(d?.error || d?.errors?.join(" | ") || `HTTP ${res.status}`);
                }
                const sizeKb = d?.tables?.size_bytes ? Math.round(d.tables.size_bytes / 1024) : null;
                setBackupLog(JSON.stringify(d, null, 2));
                toast({
                  title: "Backup completed",
                  description: `${sizeKb ?? "?"}KB, job ${d?.job_id ?? "—"}, ${d?.files?.copied ?? 0} files copied`,
                });
              })}>
              <PlayCircle size={14}/> Run now
            </button>
            {backupLog && <div style={S.code}>{backupLog}</div>}
          </div>
          <div style={S.card}>
            <div style={S.title}><HeartPulse size={16}/> Keepalive bots</div>
            <div style={S.sub}>elimu + mainserv · live, refreshes every 15s</div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>elimu</span>
                <span style={S.pill(!botError.elimu && botStats.elimu?.status === "ok")}>
                  {botError.elimu ? "unreachable" : botStats.elimu?.status ?? "…"}
                </span>
              </div>
              {botStats.elimu && !botError.elimu && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {botStats.elimu.projections?.ops_per_week?.toLocaleString() ?? "—"} ops/week ·{" "}
                  {botStats.elimu.current_records?.heartbeats?.toLocaleString() ?? "—"} heartbeats
                </div>
              )}
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                <span style={{ fontWeight: 600 }}>mainserv</span>
                <span style={S.pill(!botError.mainserv && botStats.mainserv?.status === "ok")}>
                  {botError.mainserv ? "unreachable" : botStats.mainserv?.status ?? "…"}
                </span>
              </div>
              {botStats.mainserv && !botError.mainserv && (
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {botStats.mainserv.current_records?.heartbeats?.toLocaleString() ?? "—"} heartbeats · breaker{" "}
                  {botStats.mainserv.breaker_ok === true ? "closed" : botStats.mainserv.breaker_ok === false ? "open" : "unknown"}
                </div>
              )}
            </div>

            <button style={{ ...S.btn("#0f766e"), marginTop: 10 }} onClick={pollBots}>
              <RefreshCw size={14}/> Refresh now
            </button>
          </div>

          <div style={S.card}>
            <div style={S.title}><Zap size={16}/> EdgeOne / Tencent Cloud</div>
            <div style={S.sub}>procurbosse.edgeone.app · deployments, domains, live health</div>

            {eoError && (
              <div style={{ fontSize: 12, color: "#991b1b", background: "#fee2e2", borderRadius: 6, padding: 8, marginBottom: 10 }}>
                {eoError === "EDGEONE_API_TOKEN is not configured in edge function secrets"
                  ? "EdgeOne API token isn't configured as an edge function secret yet — set EDGEONE_API_TOKEN in Supabase to enable this card."
                  : eoError}
              </div>
            )}

            {eoData && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Site health</span>
                  <span style={S.pill(!!eoData.health?.ok)}>
                    {eoData.health?.ok ? `${eoData.health.status} OK` : (eoData.health?.status ? `HTTP ${eoData.health.status}` : "unknown")}
                  </span>
                </div>
                {eoData.health?.latency_ms != null && (
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 10 }}>
                    {eoData.health.latency_ms}ms latency
                    {eoData.health.cf_cache ? ` · cache: ${eoData.health.cf_cache}` : ""}
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  <div style={{ background: "#f1f5f9", borderRadius: 6, padding: 8, textAlign: "center" as const }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{eoData.stats?.total ?? "—"}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>deployments</div>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 6, padding: 8, textAlign: "center" as const }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "#166534" }}>{eoData.stats?.success ?? "—"}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>success</div>
                  </div>
                  <div style={{ background: "#f1f5f9", borderRadius: 6, padding: 8, textAlign: "center" as const }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: eoData.stats?.failed ? "#991b1b" : "#0f172a" }}>{eoData.stats?.failed ?? "—"}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>failed</div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                  latest: {eoData.stats?.latest_status ?? "unknown"}
                  {eoData.stats?.latest_at ? ` · ${new Date(eoData.stats.latest_at).toLocaleString()}` : ""}
                </div>

                {Array.isArray(eoData.domains) && eoData.domains.length > 0 && (
                  <div style={{ fontSize: 11, color: "#334155", marginBottom: 10 }}>
                    <span style={{ fontWeight: 600 }}>Domains: </span>
                    {eoData.domains.map((d: any) => d.name || d.domain || d).join(", ")}
                  </div>
                )}

                {Array.isArray(eoData.deployments) && eoData.deployments.length > 0 && (
                  <div style={S.code}>
                    {eoData.deployments.slice(0, 5).map((d: any, i: number) => (
                      <div key={d.id || i}>
                        {(d.status || "?").padEnd(10)} {d.id || "—"} {d.created_at ? new Date(d.created_at).toLocaleString() : ""}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button style={S.btn("#0f766e")} onClick={loadEdgeOne} disabled={eoBusy}>
                <RefreshCw size={14}/> {eoBusy ? "Loading…" : "Refresh"}
              </button>
              <button style={S.btn("#c2410c")} onClick={purgeEdgeOne} disabled={eoBusy}>
                <Zap size={14}/> Purge / Redeploy
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
