import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SmtpConfig {
  smtp_provider: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: string;
  email_test_address: string;
  supabase_smtp_active: string;
}

const DEFAULT_CONFIG: SmtpConfig = {
  smtp_provider: "supabase",
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_secure: "true",
  smtp_user: "resend",
  smtp_from_email: "noreply@embu.go.ke",
  smtp_from_name: "ProcurBosse - EL5 MediProcure",
  smtp_enabled: "true",
  email_test_address: "admin@embu.go.ke",
  supabase_smtp_active: "true",
};

export default function SmtpSettingsPanel() {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState({ msg: "", ok: true });
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 4000);
  };

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .eq("category", "email");
      if (data) {
        const map = Object.fromEntries(data.map(r => [r.key, r.value]));
        setConfig(prev => ({ ...prev, ...map }));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function save() {
    setSaving(true);
    const entries = Object.entries(config);
    for (const [key, value] of entries) {
      await supabase.from("system_config")
        .upsert({ key, value, category: "email", type: "text" }, { onConflict: "key" });
    }
    setSaving(false);
    showToast("SMTP settings saved successfully ✓");
  }

  async function sendTestEmail() {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: config.email_test_address,
          subject: "ProcurBosse SMTP Test",
          text: "This is a test email from ProcurBosse EL5 MediProcure. If you received this, SMTP is working correctly.",
          priority: "normal",
          category: "system",
          metadata: { test: true, timestamp: new Date().toISOString() },
        },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      setTestResult({ ok: true, msg: `Test email sent to ${config.email_test_address} ✓` });
    } catch (err: unknown) {
      setTestResult({ ok: false, msg: `Failed: ${err instanceof Error ? err.message : String(err)}` });
    }
    setTesting(false);
  }

  const inputS: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px", color: "#fff", fontSize: "13px",
    outline: "none", boxSizing: "border-box",
  };
  const labelS: React.CSSProperties = {
    display: "block", color: "rgba(255,255,255,0.55)",
    fontSize: "12px", fontWeight: 500, marginBottom: 6,
  };
  const fieldWrap: React.CSSProperties = { marginBottom: 16 };
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px", padding: "20px",
    marginBottom: 20,
  };

  if (loading) return (
    <div style={{ padding: "40px", textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
      Loading SMTP configuration…
    </div>
  );

  const isActive = config.smtp_enabled === "true" && config.supabase_smtp_active === "true";

  return (
    <div style={{ color: "#e2e8f0", fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: 700 }}>
      {/* Toast */}
      {toast.msg && (
        <div style={{
          position: "fixed", top: 80, right: 24, zIndex: 9999,
          background: toast.ok ? "#1e3a5f" : "#3b0f0f",
          border: `1px solid ${toast.ok ? "#3b82f6" : "#ef4444"}`,
          borderRadius: "10px", padding: "12px 20px",
          color: "#fff", fontSize: "14px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>{toast.msg}</div>
      )}

      {/* Status Banner */}
      <div style={{
        ...card,
        borderLeft: `4px solid ${isActive ? "#22c55e" : "#ef4444"}`,
        background: isActive ? "rgba(34,197,94,0.06)" : "rgba(239,68,68,0.06)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ fontSize: "28px" }}>{isActive ? "✅" : "❌"}</div>
        <div>
          <div style={{ fontWeight: 700, color: isActive ? "#86efac" : "#fca5a5", fontSize: "15px" }}>
            SMTP {isActive ? "Active & Configured" : "Inactive"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: 2 }}>
            Provider: <strong style={{ color: "#fff" }}>{config.smtp_provider?.toUpperCase()}</strong>
            {" "} · Host: <strong style={{ color: "#fff" }}>{config.smtp_host}</strong>:{config.smtp_port}
            {" "} · From: <strong style={{ color: "#fff" }}>{config.smtp_from_email}</strong>
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: isActive ? "#22c55e" : "rgba(255,255,255,0.15)",
                position: "relative", transition: "background 0.2s", cursor: "pointer",
              }}
              onClick={() => setConfig(c => ({ ...c, smtp_enabled: c.smtp_enabled === "true" ? "false" : "true" }))}
            >
              <div style={{
                width: 20, height: 20, borderRadius: "50%", background: "#fff",
                position: "absolute", top: 2,
                left: isActive ? 22 : 2,
                transition: "left 0.2s",
              }}/>
            </div>
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              {isActive ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>
      </div>

      {/* Provider selector */}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 16, color: "#60a5fa" }}>📨 Email Provider</div>
        <div style={{ display: "flex", gap: 10 }}>
          {["supabase", "resend", "sendgrid", "mailgun", "custom"].map(p => (
            <button key={p} onClick={() => setConfig(c => ({ ...c, smtp_provider: p }))} style={{
              padding: "8px 16px",
              background: config.smtp_provider === p ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${config.smtp_provider === p ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 8, color: config.smtp_provider === p ? "#60a5fa" : "rgba(255,255,255,0.5)",
              cursor: "pointer", fontSize: "12px", fontWeight: config.smtp_provider === p ? 600 : 400,
              textTransform: "capitalize",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* SMTP Configuration */}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 16, color: "#60a5fa" }}>⚙️ SMTP Configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <div style={fieldWrap}>
            <label style={labelS}>SMTP Host</label>
            <input style={inputS} value={config.smtp_host}
              onChange={e => setConfig(c => ({ ...c, smtp_host: e.target.value }))} />
          </div>
          <div style={fieldWrap}>
            <label style={labelS}>Port</label>
            <input style={inputS} value={config.smtp_port}
              onChange={e => setConfig(c => ({ ...c, smtp_port: e.target.value }))} />
          </div>
          <div style={fieldWrap}>
            <label style={labelS}>SMTP Username / API Key Name</label>
            <input style={inputS} value={config.smtp_user}
              onChange={e => setConfig(c => ({ ...c, smtp_user: e.target.value }))} />
          </div>
          <div style={fieldWrap}>
            <label style={labelS}>Connection Security</label>
            <select style={{ ...inputS, color: "#fff" }} value={config.smtp_secure}
              onChange={e => setConfig(c => ({ ...c, smtp_secure: e.target.value }))}>
              <option value="true">SSL/TLS (recommended)</option>
              <option value="false">STARTTLS / Plain</option>
            </select>
          </div>
          <div style={fieldWrap}>
            <label style={labelS}>From Email</label>
            <input style={inputS} type="email" value={config.smtp_from_email}
              onChange={e => setConfig(c => ({ ...c, smtp_from_email: e.target.value }))} />
          </div>
          <div style={fieldWrap}>
            <label style={labelS}>From Name</label>
            <input style={inputS} value={config.smtp_from_name}
              onChange={e => setConfig(c => ({ ...c, smtp_from_name: e.target.value }))} />
          </div>
        </div>

        {/* Supabase Auth note */}
        <div style={{
          background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: 8, padding: "12px 16px", marginTop: 8,
        }}>
          <div style={{ fontWeight: 600, color: "#60a5fa", fontSize: "13px", marginBottom: 4 }}>
            📝 Supabase Auth SMTP Settings
          </div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "12px", lineHeight: 1.6 }}>
            To activate password reset emails, go to:<br/>
            <strong style={{ color: "#fff" }}>Supabase Dashboard → Project Settings → Authentication → SMTP Settings</strong><br/>
            Enable Custom SMTP, then enter the values above. Use your <strong style={{ color: "#f59e0b" }}>RESEND_API_KEY</strong> as the SMTP password.
          </div>
        </div>
      </div>

      {/* Test Email */}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 16, color: "#22c55e" }}>🧪 Test Email</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <label style={labelS}>Send test to</label>
            <input style={inputS} type="email" value={config.email_test_address}
              onChange={e => setConfig(c => ({ ...c, email_test_address: e.target.value }))} />
          </div>
          <button
            style={{
              padding: "10px 20px",
              background: testing ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg,#22c55e,#16a34a)",
              border: "none", borderRadius: 8, color: "#fff",
              cursor: testing ? "not-allowed" : "pointer",
              fontSize: "13px", fontWeight: 600, flexShrink: 0,
            }}
            disabled={testing}
            onClick={sendTestEmail}
          >
            {testing ? "Sending…" : "Send Test Email →"}
          </button>
        </div>
        {testResult && (
          <div style={{
            marginTop: 12,
            background: testResult.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${testResult.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            borderRadius: 8, padding: "10px 14px",
            color: testResult.ok ? "#86efac" : "#fca5a5",
            fontSize: "13px",
          }}>
            {testResult.ok ? "✅" : "❌"} {testResult.msg}
          </div>
        )}
      </div>

      {/* Email templates note */}
      <div style={card}>
        <div style={{ fontWeight: 600, marginBottom: 12, color: "#a78bfa" }}>📧 Email Templates</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { name: "Password Reset", status: "active", path: "Auth → Email Templates → Reset Password" },
            { name: "System Notifications", status: "active", path: "send-email Edge Function v4" },
            { name: "Requisition Alerts", status: "active", path: "notify-requisition Edge Function" },
            { name: "Accountant Alerts", status: "active", path: "send-email with category: finance" },
          ].map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500 }}>{t.name}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px" }}>{t.path}</div>
              </div>
              <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: "11px", fontWeight: 600, background: "rgba(34,197,94,0.15)", color: "#86efac", border: "1px solid rgba(34,197,94,0.3)" }}>
                {t.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Save button */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          style={{
            padding: "12px 28px",
            background: saving ? "rgba(59,130,246,0.4)" : "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            border: "none", borderRadius: 10,
            color: "#fff", fontSize: "14px", fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}
          disabled={saving}
          onClick={save}
        >
          {saving ? "Saving…" : "Save SMTP Settings →"}
        </button>
      </div>

      <style>{`select option { background: #1a2744; color: #fff; }`}</style>
    </div>
  );
}
