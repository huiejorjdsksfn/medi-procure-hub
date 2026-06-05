/**
 * Admin Activity Stats - Turn B
 * Real-time user activity dashboard: logins, password resets, IP geo,
 * audit actions, failed attempts. Sourced from audit_log + password_reset_log
 * + ip_access_log + profiles. Hardened with per-query timeouts.
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeFetch } from "@/lib/safeFetch";
import { T } from "@/lib/theme";
import {
  Activity, Users as UsersIcon, KeyRound, ShieldAlert, Globe, RefreshCw, Printer
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const db = supabase as any;
const COLORS = ["#003087", "#107c10", "#d83b01", "#8764b8", "#0078d4", "#a4262c", "#498205"];

function dayKey(d: string | Date) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

export default function AdminActivityPage() {
  const [loading, setLoading] = useState(true);
  const [audit, setAudit] = useState<any[]>([]);
  const [resets, setResets] = useState<any[]>([]);
  const [ips, setIps] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    setErrors([]);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [a, r, i, p] = await Promise.all([
      safeFetch(() => db.from("audit_log").select("id,user_id,user_name,action,module,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000), { label: "audit_log" }),
      safeFetch(() => db.from("password_reset_log").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(500), { label: "password_reset_log" }),
      safeFetch(() => db.from("ip_access_log").select("id,user_id,ip_address,city,country,success,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(1000), { label: "ip_access_log" }),
      safeFetch(() => db.from("profiles").select("id,full_name,email,last_login,last_seen,failed_logins,is_locked,is_active"), { label: "profiles" }),
    ]);
    setAudit(a.data || []);
    setResets(r.data || []);
    setIps(i.data || []);
    setProfiles(p.data || []);
    const errs: string[] = [];
    [["audit_log", a], ["password_reset_log", r], ["ip_access_log", i], ["profiles", p]].forEach(([n, res]: any) => {
      if (res.error) errs.push(`${n}: ${res.error.message || res.error}`);
    });
    setErrors(errs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const kpis = useMemo(() => {
    const successfulLogins = ips.filter(x => x.success !== false).length;
    const failedLogins = ips.filter(x => x.success === false).length;
    const uniqueUsers = new Set(audit.map(a => a.user_id).filter(Boolean)).size;
    const lockedUsers = profiles.filter(p => p.is_locked).length;
    return { successfulLogins, failedLogins, uniqueUsers, lockedUsers, passwordResets: resets.length, auditActions: audit.length };
  }, [audit, resets, ips, profiles]);

  // Activity over time (last 14 days)
  const series = useMemo(() => {
    const days: string[] = [];
    for (let i = 13; i >= 0; i--) {
      days.push(dayKey(new Date(Date.now() - i * 86400_000)));
    }
    const auditByDay: Record<string, number> = {};
    const loginByDay: Record<string, number> = {};
    const failByDay: Record<string, number> = {};
    audit.forEach(a => { const k = dayKey(a.created_at); auditByDay[k] = (auditByDay[k] || 0) + 1; });
    ips.forEach(x => {
      const k = dayKey(x.created_at);
      if (x.success === false) failByDay[k] = (failByDay[k] || 0) + 1;
      else loginByDay[k] = (loginByDay[k] || 0) + 1;
    });
    return days.map(d => ({
      day: d.slice(5),
      Audit: auditByDay[d] || 0,
      Logins: loginByDay[d] || 0,
      Failures: failByDay[d] || 0,
    }));
  }, [audit, ips]);

  const topModules = useMemo(() => {
    const m: Record<string, number> = {};
    audit.forEach(a => { const k = a.module || "other"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 7);
  }, [audit]);

  const topUsers = useMemo(() => {
    const m: Record<string, number> = {};
    audit.forEach(a => { const k = a.user_name || "Unknown"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [audit]);

  const ipGeo = useMemo(() => {
    const m: Record<string, number> = {};
    ips.forEach(x => { const k = x.country || "Unknown"; m[k] = (m[k] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [ips]);

  const recentResets = useMemo(() => resets.slice(0, 15), [resets]);

  const printReport = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const rows = topUsers.map(u => `<tr><td>${u.name}</td><td style="text-align:right">${u.value}</td></tr>`).join("");
    w.document.write(`<html><head><title>Admin Activity Report</title>
      <style>body{font-family:'Segoe UI',sans-serif;margin:24px;color:#000}
      h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px;color:#000}
      th{background:#003087;color:#fff;text-align:left}
      .kpi{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}
      .b{border:1px solid #ccc;padding:10px;border-radius:4px}
      .n{font-size:20px;font-weight:800;color:#003087}</style></head><body>
      <h1>Embu Level 5 Hospital — Admin Activity Report (Last 30 days)</h1>
      <div class="kpi">
        <div class="b"><div class="n">${kpis.auditActions}</div>Audit Actions</div>
        <div class="b"><div class="n">${kpis.successfulLogins}</div>Successful Logins</div>
        <div class="b"><div class="n">${kpis.failedLogins}</div>Failed Logins</div>
        <div class="b"><div class="n">${kpis.passwordResets}</div>Password Resets</div>
        <div class="b"><div class="n">${kpis.lockedUsers}</div>Locked Users</div>
        <div class="b"><div class="n">${kpis.uniqueUsers}</div>Active Users</div>
      </div>
      <h2 style="font-size:14px">Top Users by Activity</h2>
      <table><thead><tr><th>User</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  };

  const Tile = ({ icon: I, label, value, color }: any) => (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 38, height: 38, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <I size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: T.fgMuted, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 18, background: T.bg, minHeight: "100%", color: "#000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Activity size={22} color={T.primary} />
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a" }}>Admin Activity Stats</h1>
        <span style={{ color: T.fgMuted, fontSize: 12 }}>· last 30 days</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button onClick={load} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: T.primaryBg, border: `1px solid ${T.primary}33`, borderRadius: 6, cursor: "pointer", color: T.primary, fontSize: 12, fontWeight: 600 }}>
            <RefreshCw size={13} style={loading ? { animation: "spin 1s linear infinite" } : {}} /> Refresh
          </button>
          <button onClick={printReport} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: T.primary, border: "none", borderRadius: 6, cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600 }}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#78350f" }}>
          Some sources failed (showing partial data): {errors.join(" · ")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, marginBottom: 16 }}>
        <Tile icon={Activity}    label="Audit Actions"      value={kpis.auditActions}      color="#003087" />
        <Tile icon={UsersIcon}   label="Active Users"        value={kpis.uniqueUsers}       color="#107c10" />
        <Tile icon={Globe}       label="Successful Logins"   value={kpis.successfulLogins}  color="#0078d4" />
        <Tile icon={ShieldAlert} label="Failed Logins"       value={kpis.failedLogins}      color="#d83b01" />
        <Tile icon={KeyRound}    label="Password Resets"     value={kpis.passwordResets}    color="#8764b8" />
        <Tile icon={ShieldAlert} label="Locked Users"        value={kpis.lockedUsers}       color="#a4262c" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Activity Trend (14 days)</div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#0f172a" }} />
              <YAxis tick={{ fontSize: 11, fill: "#0f172a" }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="Audit" stroke="#003087" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Logins" stroke="#107c10" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Failures" stroke="#d83b01" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Logins by Country</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={ipGeo} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {ipGeo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Top Modules</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topModules} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#0f172a" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#0f172a" }} width={110} />
              <Tooltip />
              <Bar dataKey="value" fill="#003087" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Top Active Users</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topUsers} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#0f172a" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#0f172a" }} width={130} />
              <Tooltip />
              <Bar dataKey="value" fill="#107c10" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Recent Password Resets</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: "#0f172a" }}>
          <thead><tr style={{ background: "#f1f5f9" }}>
            <th style={{ padding: "6px 10px", textAlign: "left", color: "#0f172a" }}>When</th>
            <th style={{ padding: "6px 10px", textAlign: "left", color: "#0f172a" }}>User</th>
            <th style={{ padding: "6px 10px", textAlign: "left", color: "#0f172a" }}>Method</th>
            <th style={{ padding: "6px 10px", textAlign: "left", color: "#0f172a" }}>IP</th>
          </tr></thead>
          <tbody>
            {recentResets.length === 0 && <tr><td colSpan={4} style={{ padding: 14, textAlign: "center", color: T.fgMuted }}>No password reset events</td></tr>}
            {recentResets.map((r: any) => (
              <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "6px 10px", color: "#0f172a" }}>{r.created_at ? new Date(r.created_at).toLocaleString("en-KE") : "—"}</td>
                <td style={{ padding: "6px 10px", color: "#0f172a" }}>{r.user_email || r.email || r.user_id || "—"}</td>
                <td style={{ padding: "6px 10px", color: "#0f172a" }}>{r.method || r.reset_type || "—"}</td>
                <td style={{ padding: "6px 10px", color: "#0f172a" }}>{r.ip_address || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}