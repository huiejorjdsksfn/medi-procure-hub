/**
 * EL5 MediProcure - Deployment Center
 * Admin-only hub for onboarding new company / facility deployments:
 *  - Live stats on deployments + external DB connections
 *  - List of in-progress / completed onboarding wizards
 *  - Entry point into CompanyOnboardingPage (the step wizard)
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import {
  Building2, Plus, RefreshCw, Database, CheckCircle2, Clock,
  AlertTriangle, ArrowRight, Trash2, Server, Cable,
} from "lucide-react";

const db = supabase as any;

const card: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg, boxShadow: "0 1px 4px rgba(0,0,0,.06)" };
const inp: React.CSSProperties = { width: "100%", border: `1px solid ${T.border}`, borderRadius: T.r, padding: "8px 12px", fontSize: 13, outline: "none", background: T.card, color: T.fg, boxSizing: "border-box" };
const btnS = (bg: string, border?: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px",
  background: bg, color: border ? T.fgMuted : "#fff", border: `1px solid ${border || "transparent"}`,
  borderRadius: T.r, fontSize: 13, fontWeight: 700, cursor: "pointer",
});

const STATUS_CFG: Record<string, { color: string; bg: string; label: string }> = {
  draft:        { color: T.fgMuted, bg: T.bg2,      label: "Draft" },
  db_connected: { color: T.info,    bg: `${T.info}14`, label: "DB Connected" },
  importing:    { color: T.warning, bg: T.warningBg, label: "Importing" },
  review:       { color: T.warning, bg: T.warningBg, label: "In Review" },
  completed:    { color: T.success, bg: T.successBg, label: "Completed" },
  failed:       { color: T.error,   bg: T.errorBg,   label: "Failed" },
};

export default function DeploymentsPage() {
  const nav = useNavigate();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, jRes, cRes] = await Promise.all([
        db.from("company_deployments").select("*").order("created_at", { ascending: false }),
        db.from("deployment_import_jobs").select("id,deployment_id,imported_rows,failed_rows,status"),
        db.from("external_connections").select("id,status,type,deployment_id"),
      ]);
      setDeployments(dRes.data || []);
      setJobs(jRes.data || []);
      setConnections(cRes.data || []);
    } catch (e: any) {
      toast({ title: "Failed to load deployments", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = {
    total: deployments.length,
    completed: deployments.filter(d => d.status === "completed").length,
    inProgress: deployments.filter(d => ["draft", "db_connected", "importing", "review"].includes(d.status)).length,
    failed: deployments.filter(d => d.status === "failed").length,
    rowsImported: jobs.reduce((s, j) => s + (j.imported_rows || 0), 0),
    activeConnections: connections.filter(c => c.status === "active").length,
  };

  const deleteDeployment = async (id: string, name: string) => {
    if (!confirm(`Delete onboarding record for "${name}"? This won't delete any data already imported.`)) return;
    try {
      await db.from("company_deployments").delete().eq("id", id);
      toast({ title: "Deployment record removed" });
      load();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const STAT_CARDS = [
    { label: "Total Deployments", val: stats.total, col: T.primary, icon: Building2 },
    { label: "Completed", val: stats.completed, col: T.success, icon: CheckCircle2 },
    { label: "In Progress", val: stats.inProgress, col: T.warning, icon: Clock },
    { label: "Failed", val: stats.failed, col: T.error, icon: AlertTriangle },
    { label: "Rows Imported", val: stats.rowsImported, col: "#7c3aed", icon: Database },
    { label: "Active DB Links", val: stats.activeConnections, col: "#0ea5e9", icon: Cable },
  ];

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Segoe UI','Inter',sans-serif" }}>
      <AdminBreadcrumb label="Deployment Center" />

      <div style={{ padding: "20px 24px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: T.fg }}>Deployment Center</h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: T.fgMuted }}>
              Onboard a new company or facility — set up their database link, import legacy data, and go live.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={load} style={btnS(T.bg2, T.border)}><RefreshCw size={13} /> Refresh</button>
            <button onClick={() => nav("/admin/deployments/new")} style={btnS(T.primary)}><Plus size={14} /> New Company Onboarding</button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 10, marginBottom: 22 }}>
          {STAT_CARDS.map(s => (
            <div key={s.label} style={{ ...card, padding: "14px 16px", borderTop: `3px solid ${s.col}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <s.icon size={15} color={s.col} />
                <span style={{ fontSize: 11, color: T.fgMuted, textTransform: "uppercase", letterSpacing: ".03em", fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.col }}>{loading ? "—" : s.val}</div>
            </div>
          ))}
        </div>

        {/* Deployment list */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Server size={14} color={T.primary} />
            <span style={{ fontWeight: 700, fontSize: 13, color: T.fg }}>Onboarding Pipeline</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.fgMuted, fontSize: 13 }}>Loading deployments…</div>
          ) : deployments.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.fgMuted }}>
              <Building2 size={28} style={{ opacity: .35, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No deployments yet.</div>
              <button onClick={() => nav("/admin/deployments/new")} style={{ ...btnS(T.primary), marginTop: 12 }}>
                <Plus size={14} /> Start onboarding a new company
              </button>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: T.bg2 }}>
                  {["Company", "Status", "Step", "Contact", "Created", ""].map(h => (
                    <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: T.fgMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deployments.map(d => {
                  const sc = STATUS_CFG[d.status] || STATUS_CFG.draft;
                  const jobCount = jobs.filter(j => j.deployment_id === d.id).length;
                  return (
                    <tr key={d.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ padding: "10px 16px", fontWeight: 600, color: T.fg }}>
                        {d.company_name}
                        {d.facility_code && <span style={{ marginLeft: 6, fontSize: 11, color: T.fgMuted }}>({d.facility_code})</span>}
                        {jobCount > 0 && <div style={{ fontSize: 11, color: T.fgMuted, fontWeight: 400 }}>{jobCount} import job{jobCount !== 1 ? "s" : ""}</div>}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{ padding: "2px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color, textTransform: "uppercase", letterSpacing: ".04em" }}>
                          {sc.label}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", color: T.fgMuted, fontSize: 12 }}>{(d.current_step || "—").replace(/_/g, " ")}</td>
                      <td style={{ padding: "10px 16px", color: T.fgMuted, fontSize: 12 }}>{d.contact_name || d.contact_email || "—"}</td>
                      <td style={{ padding: "10px 16px", color: T.fgMuted, fontSize: 12, whiteSpace: "nowrap" }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => nav(`/admin/deployments/${d.id}`)}
                          style={{ ...btnS(`${T.primary}14`, T.primary), padding: "5px 12px", fontSize: 12, marginRight: 6 }}>
                          {d.status === "completed" ? "View" : "Continue"} <ArrowRight size={12} />
                        </button>
                        <button onClick={() => deleteDeployment(d.id, d.company_name)}
                          style={{ ...btnS(T.errorBg, T.error), padding: "5px 8px", fontSize: 12 }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p style={{ fontSize: 11, color: T.fgMuted, marginTop: 14, lineHeight: 1.5 }}>
          Live SQL Server connections are tested via an on-prem ODBC bridge. Until a bridge agent is configured for a
          site, use the CSV / Excel upload step inside the wizard to bring in legacy data instead.
        </p>
      </div>
    </div>
  );
}
