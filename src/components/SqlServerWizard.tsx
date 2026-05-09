/**
 * SQL Server Connection Wizard v1.0
 * 4-step wizard: Server -> Auth -> Database -> Test & Save
 * Live test calls the `mssql-test` edge function (TCP+TDS PreLogin probe,
 * with optional on-prem ODBC bridge for full auth verification).
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import {
  X, Server, Lock, Database, CheckCircle, XCircle, Loader2, ChevronRight,
  ChevronLeft, Save, Wifi, Eye, EyeOff, Shield, Activity,
} from "lucide-react";

const db = supabase as any;

type Step = 0 | 1 | 2 | 3;

interface FormState {
  name: string;
  host: string;
  port: string;
  instance: string;
  auth_mode: "sql" | "windows" | "azure_ad";
  username: string;
  password: string;
  database: string;
  encrypt: boolean;
  trust_cert: boolean;
  timeout: string;
  description: string;
}

const INITIAL: FormState = {
  name: "", host: "", port: "1433", instance: "", auth_mode: "sql",
  username: "", password: "", database: "", encrypt: true, trust_cert: false,
  timeout: "30", description: "",
};

const STEPS = [
  { id: 0, label: "Server",   icon: Server,   desc: "Hostname & port" },
  { id: 1, label: "Auth",     icon: Lock,     desc: "Sign-in method" },
  { id: 2, label: "Database", icon: Database, desc: "Catalog & options" },
  { id: 3, label: "Test",     icon: Wifi,     desc: "Verify & save" },
] as const;

const inp: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.r,
  fontSize: 13, color: T.fg, outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: T.fgMuted, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: ".05em" };
const btn = (bg: string, ghost = false): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px",
  background: ghost ? "transparent" : bg, color: ghost ? bg : "#fff",
  border: ghost ? `1px solid ${bg}` : "none", borderRadius: T.r,
  fontSize: 13, fontWeight: 700, cursor: "pointer",
});

export default function SqlServerWizard({
  onClose, onSaved, initial,
}: { onClose: () => void; onSaved?: () => void; initial?: Partial<FormState> & { id?: string } }) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>({ ...INITIAL, ...(initial || {}) });
  const [showPass, setShowPass] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  const canNext = (): boolean => {
    if (step === 0) return !!form.name.trim() && !!form.host.trim() && !!form.port.trim();
    if (step === 1) return form.auth_mode === "windows" || (!!form.username.trim() && !!form.password);
    if (step === 2) return !!form.database.trim();
    return true;
  };

  const runTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("mssql-test", {
        body: {
          host: form.host, port: form.port,
          database: form.database, username: form.username,
          password: form.password, auth_mode: form.auth_mode,
          encrypt: form.encrypt,
        },
      });
      if (error) throw error;
      setTestResult(data);
      if (data?.ok) toast({ title: "Connection OK", description: data.message });
      else toast({ title: "Connection failed", description: data?.message || "Unreachable", variant: "destructive" });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || String(e) });
      toast({ title: "Test error", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: form.name, type: "mssql",
        host: form.host, port: parseInt(form.port, 10) || 1433,
        database_name: form.database, username: form.username,
        password: form.password || null, description: form.description,
        timeout: parseInt(form.timeout, 10) || 30,
        status: testResult?.ok ? "active" : "inactive",
        last_sync: testResult?.ok ? new Date().toISOString() : null,
        error_message: testResult?.ok ? null : (testResult?.message || null),
        config: {
          instance: form.instance,
          auth_mode: form.auth_mode,
          encrypt: form.encrypt,
          trust_cert: form.trust_cert,
          driver: "ODBC Driver 18 for SQL Server",
        },
        connection_string: `Driver={ODBC Driver 18 for SQL Server};Server=${form.host}${form.instance ? "\\" + form.instance : ""},${form.port};Database=${form.database};${form.auth_mode === "windows" ? "Trusted_Connection=yes;" : `Uid=${form.username};Pwd=***;`}Encrypt=${form.encrypt ? "yes" : "no"};TrustServerCertificate=${form.trust_cert ? "yes" : "no"};`,
        created_by: user?.id || null,
      };
      if (initial?.id) {
        const upd: any = { ...payload }; if (!upd.password) delete upd.password;
        await db.from("external_connections").update(upd).eq("id", initial.id);
      } else {
        payload.created_at = new Date().toISOString();
        await db.from("external_connections").insert(payload);
      }
      toast({ title: "Saved", description: `SQL Server connection "${form.name}" stored.` });
      onSaved?.(); onClose();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(8,15,30,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 720, background: T.card, borderRadius: T.rLg,
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)", overflow: "hidden",
        fontFamily: "'Inter','Segoe UI',sans-serif", display: "flex", flexDirection: "column", maxHeight: "92vh",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 12,
          background: `linear-gradient(135deg, ${T.primary}10, transparent)`,
        }}>
          <Server size={20} color={T.primary} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.fg }}>SQL Server Connection Wizard</div>
            <div style={{ fontSize: 11, color: T.fgDim }}>ODBC Driver 18 — TCP/IP — Live verification</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.fgDim }}>
            <X size={18} />
          </button>
        </div>

        {/* Stepper */}
        <div style={{ display: "flex", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.bg }}>
          {STEPS.map((s, i) => {
            const active = step === s.id; const done = step > s.id;
            return (
              <div key={s.id} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  color: active ? T.primary : done ? T.success : T.fgDim,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: active ? `${T.primary}22` : done ? `${T.success}22` : T.bg2,
                    border: `2px solid ${active ? T.primary : done ? T.success : T.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {done ? <CheckCircle size={14} /> : <s.icon size={14} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: T.fgDim }}>{s.desc}</div>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? T.success : T.border, margin: "0 12px" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          {step === 0 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Connection Name *</label>
                <input style={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="EL5H Production SQL" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Server / Hostname *</label>
                  <input style={inp} value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="sql.embu.go.ke or 10.0.0.15" />
                </div>
                <div>
                  <label style={lbl}>Port *</label>
                  <input style={inp} value={form.port} onChange={(e) => set("port", e.target.value.replace(/\D/g, ""))} placeholder="1433" />
                </div>
                <div>
                  <label style={lbl}>Instance</label>
                  <input style={inp} value={form.instance} onChange={(e) => set("instance", e.target.value)} placeholder="MSSQLSERVER" />
                </div>
              </div>
              <div>
                <label style={lbl}>Description</label>
                <input style={inp} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional notes" />
              </div>
              <div style={{ padding: 12, background: `${T.info}10`, border: `1px solid ${T.info}33`, borderRadius: T.r, fontSize: 11, color: T.fgMuted, display: "flex", gap: 8 }}>
                <Shield size={14} color={T.info} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>The wizard will perform a TCP + TDS PreLogin probe to verify reachability without sending credentials. Full ODBC auth runs only if an on-prem bridge agent is configured.</span>
              </div>
            </div>
          )}
          {step === 1 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Authentication Mode</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  {[
                    { v: "sql", l: "SQL Login", d: "Username + password" },
                    { v: "windows", l: "Windows", d: "Integrated (bridge)" },
                    { v: "azure_ad", l: "Azure AD", d: "Token / MFA" },
                  ].map((o) => (
                    <button key={o.v} onClick={() => set("auth_mode", o.v as any)}
                      style={{
                        padding: 12, textAlign: "left", cursor: "pointer",
                        background: form.auth_mode === o.v ? `${T.primary}15` : "#fff",
                        border: `2px solid ${form.auth_mode === o.v ? T.primary : T.border}`,
                        borderRadius: T.r,
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.fg }}>{o.l}</div>
                      <div style={{ fontSize: 10, color: T.fgDim, marginTop: 2 }}>{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>
              {form.auth_mode !== "windows" && (
                <>
                  <div>
                    <label style={lbl}>Username *</label>
                    <input style={inp} value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="sa or domain\\user" autoComplete="off" />
                  </div>
                  <div>
                    <label style={lbl}>Password *</label>
                    <div style={{ position: "relative" }}>
                      <input style={{ ...inp, paddingRight: 38 }} type={showPass ? "text" : "password"}
                        value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPass((p) => !p)}
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.fgDim }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {form.auth_mode === "windows" && (
                <div style={{ padding: 14, background: T.bg2, borderRadius: T.r, fontSize: 12, color: T.fgMuted }}>
                  Windows Integrated authentication requires the on-prem ODBC bridge agent running under a domain account. No credentials are stored in the cloud.
                </div>
              )}
            </div>
          )}
          {step === 2 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={lbl}>Database (Catalog) *</label>
                <input style={inp} value={form.database} onChange={(e) => set("database", e.target.value)} placeholder="EL5H_PROD" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>Login Timeout (s)</label>
                  <input style={inp} value={form.timeout} onChange={(e) => set("timeout", e.target.value.replace(/\D/g, ""))} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 22 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.fg, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.encrypt} onChange={(e) => set("encrypt", e.target.checked)} />
                    Encrypt
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.fg, cursor: "pointer" }}>
                    <input type="checkbox" checked={form.trust_cert} onChange={(e) => set("trust_cert", e.target.checked)} />
                    Trust Server Cert
                  </label>
                </div>
              </div>
              <div style={{ padding: 12, background: T.bg, border: `1px solid ${T.border}`, borderRadius: T.r, fontSize: 11, fontFamily: "'Consolas',monospace", color: T.fgMuted, wordBreak: "break-all" }}>
                <div style={{ fontSize: 10, color: T.fgDim, marginBottom: 4, fontFamily: "inherit" }}>ODBC connection string preview:</div>
                Driver={'{ODBC Driver 18 for SQL Server}'};Server={form.host}{form.instance && `\\${form.instance}`},{form.port};Database={form.database};{form.auth_mode === "windows" ? "Trusted_Connection=yes;" : `Uid=${form.username || "<user>"};Pwd=***;`}Encrypt={form.encrypt ? "yes" : "no"};TrustServerCertificate={form.trust_cert ? "yes" : "no"};
              </div>
            </div>
          )}
          {step === 3 && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={runTest} disabled={testing} style={btn(T.primary)}>
                  {testing ? <Loader2 size={14} className="spin" /> : <Activity size={14} />}
                  {testing ? "Probing..." : "Run Live Test"}
                </button>
                <span style={{ fontSize: 11, color: T.fgDim }}>
                  TCP connect + TDS PreLogin to {form.host}:{form.port}
                </span>
              </div>
              {testResult && (
                <div style={{
                  padding: 14, borderRadius: T.r,
                  background: testResult.ok ? `${T.success}10` : `${T.error}10`,
                  border: `1px solid ${testResult.ok ? T.success : T.error}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: testResult.ok ? T.success : T.error }}>
                    {testResult.ok ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {testResult.message}
                  </div>
                  {testResult.stage_tcp && (
                    <div style={{ marginTop: 10, fontSize: 11, color: T.fgMuted, display: "grid", gap: 4 }}>
                      <div>TCP latency: <strong>{testResult.stage_tcp.latency_ms} ms</strong></div>
                      <div>Server responded: <strong>{String(testResult.stage_tcp.server_responded || false)}</strong></div>
                      {testResult.stage_tcp.error && <div>Error: <strong>{testResult.stage_tcp.error}</strong></div>}
                    </div>
                  )}
                  {testResult.stage_bridge && (
                    <div style={{ marginTop: 8, fontSize: 11, color: T.fgMuted }}>
                      ODBC bridge: <strong>{testResult.stage_bridge.ok ? "auth OK" : `failed (${testResult.stage_bridge.error})`}</strong>
                    </div>
                  )}
                </div>
              )}
              <div style={{ padding: 12, background: T.bg2, borderRadius: T.r, fontSize: 11, color: T.fgMuted }}>
                You can save the configuration even if the test fails — it will be marked <strong>Inactive</strong> and can be re-tested from the Connections list.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8, background: T.bg }}>
          <button onClick={onClose} style={btn(T.fgMuted, true)}>Cancel</button>
          <div style={{ flex: 1 }} />
          {step > 0 && (
            <button onClick={() => setStep((s) => (s - 1) as Step)} style={btn(T.fgMuted, true)}>
              <ChevronLeft size={14} /> Back
            </button>
          )}
          {step < 3 && (
            <button onClick={() => canNext() && setStep((s) => (s + 1) as Step)}
              disabled={!canNext()}
              style={{ ...btn(T.primary), opacity: canNext() ? 1 : 0.45 }}>
              Next <ChevronRight size={14} />
            </button>
          )}
          {step === 3 && (
            <button onClick={save} disabled={saving || !form.name || !form.host} style={btn(T.success)}>
              {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          )}
        </div>

        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}