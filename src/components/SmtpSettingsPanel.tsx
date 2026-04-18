/**
 * EL5 MediProcure  -- SMTP Settings Panel
 * Supabase SMTP + Resend integration * Twilio messaging config
 * ProcurBosse * Embu Level 5 Hospital
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SmtpConfig {
  smtp_provider: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_email: string;
  smtp_from_name: string;
  smtp_enabled: string;
  resend_api_key: string;
  email_test_address: string;
  supabase_smtp_active: string;
  twilio_account_sid: string;
  twilio_auth_token: string;
  twilio_phone_number: string;
  twilio_messaging_service_sid: string;
  twilio_whatsapp_number: string;
}

const DEFAULT: SmtpConfig = {
  smtp_provider: "supabase",
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_secure: "true",
  smtp_user: "resend",
  smtp_pass: "",
  smtp_from_email: "noreply@embu.go.ke",
  smtp_from_name: "EL5 MediProcure  -- ProcurBosse",
  smtp_enabled: "true",
  resend_api_key: "",
  email_test_address: "tecnojin03@gmail.com",
  supabase_smtp_active: "true",
  twilio_account_sid: "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a",
  twilio_auth_token: "d73601fbefe26e01b06e22c53a798ea6",
  twilio_phone_number: "+16812972643",
  twilio_messaging_service_sid: "MGd547d8e3273fda2d21afdd6856acb245",
  twilio_whatsapp_number: "+14155238886",
};

const SECTION_TITLE: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#0f172a", marginBottom: 14, marginTop: 20, paddingBottom: 8, borderBottom: "2px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 };
const LABEL: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase" };
const INP: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#374151", background: "#fafafa", outline: "none", boxSizing: "border-box" };
const BTN = (bg: string, disabled = false): React.CSSProperties => ({ padding: "9px 18px", background: disabled ? "#9ca3af" : bg, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" });

export default function SmtpSettingsPanel() {
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [smsTest, setSmsTest] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"email" | "twilio" | "supabase">("email");

  const showToast = (msg: string, ok = true) => {
    setToastMsg(msg); setToastOk(ok);
    setTimeout(() => setToastMsg(""), 4000);
  };

  useEffect(() => {
    async function load() {
      // Load from system_settings (preferred) and system_config (fallback)
      const [{ data: ss }, { data: sc }] = await Promise.all([
        (supabase as any).from("system_settings").select("key,value"),
        (supabase as any).from("system_config").select("key,value").eq("category", "email"),
      ]);
      const map: Record<string, string> = {};
      (ss || []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      (sc || []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      setConfig(prev => ({ ...prev, ...map }));
      setLoading(false);
    }
    load();
  }, []);

  const set = (k: keyof SmtpConfig, v: string) => setConfig(c => ({ ...c, [k]: v }));

  async function save() {
    setSaving(true);
    const entries = Object.entries(config);
    for (const [key, value] of entries) {
      await (supabase as any).from("system_settings").upsert({ key, value }, { onConflict: "key" });
    }
    setSaving(false);
    showToast("[OK] Configuration saved successfully!");
  }

  async function testEmail() {
    setTesting(true); setTestResult(null);
    try {
      const { data, error } = await (supabase as any).functions.invoke("send-email", {
        body: {
          to: config.email_test_address,
          subject: "[OK] EL5 MediProcure  -- SMTP Test",
          body: `SMTP test from ProcurBosse\n\nProvider: ${config.smtp_provider}\nHost: ${config.smtp_host}\nFrom: ${config.smtp_from_email}\n\nThis confirms your email configuration is working correctly.\n\nEmbu Level 5 Hospital * ProcurBosse ERP`,
          hospitalName: "EL5 MediProcure",
        },
      });
      setTestResult({ ok: !error, msg: error ? error.message : "Test email sent! Check your inbox." });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e.message });
    }
    setTesting(false);
  }

  async function testSms() {
    setSmsTest(true);
    try {
      const { error } = await (supabase as any).functions.invoke("send-sms", {
        body: {
          to: config.twilio_phone_number,
          message: `[OK] EL5 MediProcure SMS test from ProcurBosse. Twilio SID: ${config.twilio_messaging_service_sid}. Hospital: Embu Level 5.`,
          hospitalName: "EL5 MediProcure",
        },
      });
      showToast(error ? `[X] SMS test failed: ${error.message}` : "[OK] SMS test sent!", !error);
    } catch (e: any) {
      showToast(`[X] ${e.message}`, false);
    }
    setSmsTest(false);
  }

  async function activateSupabaseSMTP() {
    setSaving(true);
    await (supabase as any).from("system_settings").upsert([
      { key: "supabase_smtp_active", value: "true" },
      { key: "smtp_enabled", value: "true" },
      { key: "smtp_provider", value: "supabase" },
      { key: "smtp_host", value: "smtp.resend.com" },
      { key: "smtp_port", value: "465" },
      { key: "smtp_from_email", value: config.smtp_from_email },
      { key: "smtp_from_name", value: config.smtp_from_name },
    ], { onConflict: "key" });
    setConfig(c => ({ ...c, supabase_smtp_active: "true", smtp_enabled: "true", smtp_provider: "supabase" }));
    setSaving(false);
    showToast("[OK] Supabase SMTP activated via Resend!");
  }

  const tabs: { id: "email"|"twilio"|"supabase"; label: string; icon: string }[] = [
    { id: "email", label: "Email / SMTP", icon: "" },
    { id: "twilio", label: "Twilio / SMS / WhatsApp", icon: "" },
    { id: "supabase", label: "Supabase SMTP Config", icon: "" },
  ];

  if (loading) return <div style={{ padding: 24, color: "#9ca3af", fontSize: 14 }}>Loading configuration...</div>;

  return (
    <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: "4px 0" }}>
      {toastMsg && (
        <div style={{ padding: "12px 18px", borderRadius: 10, background: toastOk ? "#f0fdf4" : "#fef2f2", border: `1px solid ${toastOk?"#bbf7d0":"#fecaca"}`, color: toastOk ? "#059669" : "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
          {toastMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: "8px 16px", borderRadius: "8px 8px 0 0",
            background: activeTab === t.id ? "#0369a1" : "transparent",
            color: activeTab === t.id ? "#fff" : "#6b7280",
            border: activeTab === t.id ? "1.5px solid #0369a1" : "1.5px solid transparent",
            fontSize: 12.5, fontWeight: activeTab === t.id ? 700 : 500, cursor: "pointer",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* -- EMAIL TAB -- */}
      {activeTab === "email" && (
        <div>
          <div style={SECTION_TITLE}> Email / SMTP Configuration</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={LABEL}>Provider</label>
              <select value={config.smtp_provider} onChange={e => set("smtp_provider", e.target.value)} style={INP}>
                <option value="supabase">Supabase (Resend)</option>
                <option value="resend">Resend Direct</option>
                <option value="smtp">Custom SMTP</option>
                <option value="sendgrid">SendGrid</option>
              </select>
            </div>
            <div>
              <label style={LABEL}>SMTP Host</label>
              <input value={config.smtp_host} onChange={e => set("smtp_host", e.target.value)} style={INP} placeholder="smtp.resend.com" />
            </div>
            <div>
              <label style={LABEL}>SMTP Port</label>
              <input value={config.smtp_port} onChange={e => set("smtp_port", e.target.value)} style={INP} placeholder="465" />
            </div>
            <div>
              <label style={LABEL}>SMTP User</label>
              <input value={config.smtp_user} onChange={e => set("smtp_user", e.target.value)} style={INP} placeholder="resend" />
            </div>
            <div>
              <label style={LABEL}>SMTP Password / API Key</label>
              <input type="password" value={config.smtp_pass} onChange={e => set("smtp_pass", e.target.value)} style={INP} placeholder="re_xxxx... or your SMTP password" />
            </div>
            <div>
              <label style={LABEL}>Resend API Key</label>
              <input type="password" value={config.resend_api_key} onChange={e => set("resend_api_key", e.target.value)} style={INP} placeholder="re_xxxxxxxxxxxxxxxx" />
            </div>
            <div>
              <label style={LABEL}>From Email</label>
              <input value={config.smtp_from_email} onChange={e => set("smtp_from_email", e.target.value)} style={INP} placeholder="noreply@embu.go.ke" />
            </div>
            <div>
              <label style={LABEL}>From Name</label>
              <input value={config.smtp_from_name} onChange={e => set("smtp_from_name", e.target.value)} style={INP} placeholder="EL5 MediProcure" />
            </div>
            <div>
              <label style={LABEL}>Test Email Address</label>
              <input value={config.email_test_address} onChange={e => set("email_test_address", e.target.value)} style={INP} placeholder="admin@embu.go.ke" />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <div style={{ padding: "6px 14px", borderRadius: 8, background: config.smtp_enabled === "true" ? "#f0fdf4" : "#fef9c3", border: `1px solid ${config.smtp_enabled === "true" ? "#bbf7d0" : "#fde68a"}`, fontSize: 12, fontWeight: 700, color: config.smtp_enabled === "true" ? "#059669" : "#d97706" }}>
                {config.smtp_enabled === "true" ? " SMTP Enabled" : " SMTP Disabled"}
              </div>
              <button onClick={() => set("smtp_enabled", config.smtp_enabled === "true" ? "false" : "true")} style={{ padding: "8px 14px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                Toggle
              </button>
            </div>
          </div>

          {testResult && (
            <div style={{ padding: "12px 16px", borderRadius: 10, background: testResult.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${testResult.ok?"#bbf7d0":"#fecaca"}`, color: testResult.ok ? "#059669" : "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 16 }}>
              {testResult.msg}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={save} disabled={saving} style={BTN("linear-gradient(135deg,#0369a1,#0284c7)", saving)}>
              {saving ? "Saving..." : " Save Email Config"}
            </button>
            <button onClick={testEmail} disabled={testing} style={BTN("linear-gradient(135deg,#059669,#047857)", testing)}>
              {testing ? "Sending..." : " Send Test Email"}
            </button>
          </div>
        </div>
      )}

      {/* -- TWILIO TAB -- */}
      {activeTab === "twilio" && (
        <div>
          <div style={SECTION_TITLE}> Twilio SMS / Voice / WhatsApp</div>
          <div style={{ background: "linear-gradient(135deg,#0369a1,#0284c7)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}> EL5H Messaging Service  -- Active Configuration</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "SMS Number", value: "+16812972643" },
                { label: "WhatsApp Number", value: "+14155238886" },
                { label: "Messaging SID", value: "MGd547d8e3273fda2d21afdd6856acb245" },
                { label: "Service Name", value: "EL5H" },
                { label: "Voice Webhook", value: "https://demo.twilio.com/welcome/voice/" },
                { label: "WhatsApp Join", value: "join bad-machine" },
              ].map((r, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: "monospace", wordBreak: "break-all" }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Account SID", "twilio_account_sid", "ACxxxx...", "password"],
              ["Auth Token", "twilio_auth_token", "your_auth_token", "password"],
              ["Phone Number", "twilio_phone_number", "+16812972643", "text"],
              ["Messaging Service SID", "twilio_messaging_service_sid", "MGd547d8e3273fda2d21afdd6856acb245", "text"],
              ["WhatsApp Number", "twilio_whatsapp_number", "+14155238886", "text"],
            ].map(([label, key, placeholder, type]) => (
              <div key={key}>
                <label style={LABEL}>{label}</label>
                <input type={type} value={(config as any)[key]} onChange={e => set(key as keyof SmtpConfig, e.target.value)} style={INP} placeholder={placeholder} />
              </div>
            ))}
          </div>

          {/* WhatsApp link */}
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px", marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 8 }}> WhatsApp Sandbox Setup</div>
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.7 }}>
              Send <strong>join bad-machine</strong> to <strong>+14155238886</strong> on WhatsApp to activate the sandbox.
            </div>
            <a href="https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine&type=phone_number&app_absent=0"
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: 10, padding: "8px 16px", background: "#25D366", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
               Open WhatsApp Sandbox  Next
            </a>
            <a href="https://demo.twilio.com/welcome/voice/"
              target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: 10, marginLeft: 10, padding: "8px 16px", background: "#0369a1", color: "#fff", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
               Voice Webhook  Next
            </a>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            <button onClick={save} disabled={saving} style={BTN("linear-gradient(135deg,#0369a1,#0284c7)", saving)}>
              {saving ? "Saving..." : " Save Twilio Config"}
            </button>
            <button onClick={testSms} disabled={smsTest} style={BTN("linear-gradient(135deg,#7c3aed,#6d28d9)", smsTest)}>
              {smsTest ? "Sending..." : " Test SMS"}
            </button>
          </div>
        </div>
      )}

      {/* -- SUPABASE SMTP TAB -- */}
      {activeTab === "supabase" && (
        <div>
          <div style={SECTION_TITLE}> Supabase SMTP Configuration</div>

          <div style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)", borderRadius: 14, padding: "20px 24px", marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Supabase EL5 MediProcure ERP</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>EL5 MediProcure * Embu Level 5 Hospital</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Project URL", value: "https://system-db" },
                { label: "SMTP Provider", value: "Resend (via Supabase)" },
                { label: "SMTP Host", value: "smtp.resend.com" },
                { label: "SMTP Port", value: "465 (SSL)" },
                { label: "Edge Function", value: "send-email (v4)" },
                { label: "Status", value: config.supabase_smtp_active === "true" ? " Active" : " Inactive" },
              ].map((r, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 20px", marginBottom: 16, border: "1.5px solid #e2e8f0" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 12 }}> Supabase Dashboard  -- Email Settings</div>
            <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.9 }}>
              <strong>1.</strong> Go to: <a href="https://supabase.com/dashboardhnzbzjliizjvuhq/settings/auth" target="_blank" rel="noopener noreferrer" style={{ color: "#0369a1" }}>Supabase Dashboard  Next Auth Settings</a><br/>
              <strong>2.</strong> Enable "Custom SMTP" under Email section<br/>
              <strong>3.</strong> SMTP Host: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>smtp.resend.com</code><br/>
              <strong>4.</strong> Port: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>465</code> * User: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>resend</code><br/>
              <strong>5.</strong> Password: Your Resend API key (re_xxxx...)<br/>
              <strong>6.</strong> Sender: <code style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>EL5 MediProcure &lt;noreply@embu.go.ke&gt;</code>
            </div>
          </div>

          <div style={{ background: config.supabase_smtp_active === "true" ? "#f0fdf4" : "#fef2f2", borderRadius: 10, padding: "14px 18px", marginBottom: 20, border: `1px solid ${config.supabase_smtp_active === "true" ? "#bbf7d0" : "#fecaca"}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: config.supabase_smtp_active === "true" ? "#059669" : "#dc2626", marginBottom: 4 }}>
              {config.supabase_smtp_active === "true" ? " Supabase SMTP is ACTIVE" : " Supabase SMTP is INACTIVE"}
            </div>
            <div style={{ fontSize: 12, color: "#374151" }}>
              {config.supabase_smtp_active === "true"
                ? "All password reset emails, notifications and system emails route through Supabase + Resend."
                : "Click 'Activate Supabase SMTP' to enable email routing through Resend."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={activateSupabaseSMTP} disabled={saving} style={BTN("linear-gradient(135deg,#059669,#047857)", saving)}>
              {saving ? "Activating..." : " Activate Supabase SMTP"}
            </button>
            <button onClick={testEmail} disabled={testing} style={BTN("linear-gradient(135deg,#0369a1,#0284c7)", testing)}>
              {testing ? "Testing..." : " Test via Supabase SMTP"}
            </button>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
              style={{ ...BTN("#6366f1"), textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
               Edge Functions Dashboard  Next
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
