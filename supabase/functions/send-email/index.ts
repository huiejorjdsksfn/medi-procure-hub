/**
 * EL5 MediProcure — send-email v9.0 GMAIL-SMTP
 * Primary: Real Gmail SMTP via denomailer (smtp.gmail.com:587, STARTTLS) — uses
 *          smtp_host/smtp_user/smtp_pass from system_settings (hpdeskg9@gmail.com
 *          + a Google App Password set in Settings → SMTP).
 * Fallback 1: Resend API (https://resend.com) — if RESEND_API_KEY env secret is set
 * Fallback 2: SMTP2GO API (https://api.smtp2go.com) — if SMTP2GO_API_KEY env secret is set
 *
 * Configuration:
 * - Primary: set smtp_host/smtp_port/smtp_user/smtp_pass/smtp_enabled in system_settings
 *   (Settings → SMTP in the app). smtp_pass must be a Gmail App Password, not your
 *   regular Google account password — generate one at myaccount.google.com/apppasswords
 * - Optional fallbacks via Supabase Edge Functions → Secrets: RESEND_API_KEY, SMTP2GO_API_KEY
 *
 * EL5 MediProcure · Embu Level 5 Hospital · Kenya
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Optional fallback credentials from env secrets
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const SMTP2GO_KEY = Deno.env.get("SMTP2GO_API_KEY") || "";

interface SmtpSettings {
  host: string;
  port: string;
  user: string;
  pass: string;
  from_email: string;
  from_name: string;
  enabled: boolean;
  security: string;
}

async function getSmtpSettings(): Promise<SmtpSettings> {
  try {
    const { data } = await sb.from("system_settings")
      .select("key,value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name", "smtp_enabled", "smtp_security"]);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.key) cfg[r.key] = r.value || ""; });
    return {
      host: cfg.smtp_host || "smtp.gmail.com",
      port: cfg.smtp_port || "587",
      user: cfg.smtp_user || "",
      pass: cfg.smtp_pass || "",
      from_email: cfg.smtp_from_email || "hpdeskg9@gmail.com",
      from_name: cfg.smtp_from_name || "EL5 MediProcure",
      enabled: cfg.smtp_enabled === "true",
      security: cfg.smtp_security || "STARTTLS",
    };
  } catch {
    return { host: "smtp.gmail.com", port: "587", user: "", pass: "", from_email: "hpdeskg9@gmail.com", from_name: "EL5 MediProcure", enabled: false, security: "STARTTLS" };
  }
}

function buildHtml(subject: string, body: string, actionUrl?: string, actionLabel?: string): string {
  const safe = (body || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${subject}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.13)">
  <div style="background:linear-gradient(135deg,#0e2a4a 0%,#0e7490 100%);padding:28px 32px;text-align:center">
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-.02em">🏥 EL5 MediProcure</div>
    <div style="color:rgba(255,255,255,.65);font-size:11px;margin-top:5px;letter-spacing:.06em">ProcurBosse v12 · Embu Level 5 Hospital · Embu County Government</div>
  </div>
  <div style="padding:32px 36px">
    <h2 style="margin:0 0 20px;color:#0e2a4a;font-size:19px;font-weight:700;border-bottom:2px solid #e0f2fe;padding-bottom:12px">${subject}</h2>
    <div style="color:#374151;font-size:14px;line-height:1.85">${safe}</div>
    ${actionUrl ? `<div style="text-align:center;margin-top:32px"><a href="${actionUrl}" style="display:inline-block;padding:13px 30px;background:linear-gradient(135deg,#0e7490,#0c6380);color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:14px;letter-spacing:.02em">${actionLabel || "View Details"}</a></div>` : ""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;text-align:center">
    <div style="color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} Embu County Government · Embu Level 5 Hospital</div>
    <div style="color:#d1d5db;font-size:10px;margin-top:4px">EL5 MediProcure v12 · ProcurBosse · Health Procurement ERP · Kenya</div>
  </div>
</div></body></html>`;
}

// ── Primary: real Gmail SMTP via denomailer ─────────────────────────────────
async function sendViaGmailSmtp(
  to: string | string[], subject: string, html: string, text: string,
  fromEmail: string, fromName: string, smtp: SmtpSettings
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!smtp.host || !smtp.user || !smtp.pass) {
    return { ok: false, error: "Gmail SMTP not configured. Set smtp_host/smtp_user/smtp_pass (Google App Password) in Settings → SMTP." };
  }
  const port = Number(smtp.port) || 587;
  const toArr = Array.isArray(to) ? to : [to];
  let client: SMTPClient | null = null;
  try {
    client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port,
        tls: port === 465,           // implicit TLS only on 465; 587 upgrades via STARTTLS automatically
        auth: { username: smtp.user, password: smtp.pass },
      },
    });
    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: toArr,
      subject,
      content: text,
      html,
    });
    return { ok: true, id: `gmail-${Date.now()}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Gmail SMTP send failed" };
  } finally {
    try { await client?.close(); } catch { /* already closed */ }
  }
}

async function sendViaResend(to: string | string[], subject: string, html: string, text: string, fromEmail: string, fromName: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!RESEND_KEY) return { ok: false, error: "RESEND_API_KEY not configured. Set RESEND_API_KEY in Supabase Edge Functions secrets." };
  const toArr = Array.isArray(to) ? to : [to];
  const payload: any = {
    from: `${fromName} <${fromEmail}>`,
    to: toArr,
    subject,
    html,
    text,
  };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.message || d.error || "Resend failed" };
    return { ok: true, id: d.id };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

async function sendViaSmtp2Go(to: string | string[], subject: string, html: string, text: string, fromEmail: string, fromName: string, apiKey: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const toArr = Array.isArray(to) ? to : [to];
  const payload = {
    api_key: apiKey,
    to: toArr,
    sender: `${fromName} <${fromEmail}>`,
    subject,
    html_body: html,
    text_body: text,
  };
  try {
    const r = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    if (!d.data || d.data.succeeded === 0) {
      return { ok: false, error: d.error || "SMTP2GO failed" };
    }
    return { ok: true, id: d.data.email_id };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

async function logEmail(to: string, subject: string, status: string, provider: string, id?: string, err?: string) {
  try {
    const { error } = await sb.from("email_logs").insert({
      to_email: to,
      subject,
      status,
      provider,
      message_id: id || null,
      error_message: err || null,
      sent_at: new Date().toISOString(),
    } as any);

    if (error && error.message?.includes("does not exist")) {
      await sb.from("notification_logs").insert({
        to_email: to,
        subject,
        status,
        provider,
        message_id: id || null,
        error_message: err || null,
        sent_at: new Date().toISOString(),
      } as any).catch(() => {});
    }
  } catch { /* logging is best-effort */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);

  // GET status check
  if (req.method === "GET") {
    const smtpSettings = await getSmtpSettings();
    return new Response(JSON.stringify({
      ok: true,
      version: "9.0",
      hospital: "EL5 MediProcure",
      gmail_smtp_configured: !!(smtpSettings.host && smtpSettings.user && smtpSettings.pass && smtpSettings.enabled),
      resend_key_set: !!RESEND_KEY,
      smtp2go_key_set: !!SMTP2GO_KEY,
      smtp_enabled: smtpSettings.enabled,
      smtp_host: smtpSettings.host,
      from: smtpSettings.from_email,
      from_name: smtpSettings.from_name,
      providers: {
        gmail_smtp: { configured: !!(smtpSettings.host && smtpSettings.user && smtpSettings.pass), host: smtpSettings.host },
        resend: { configured: !!RESEND_KEY, api: "https://api.resend.com" },
        smtp2go: { configured: !!SMTP2GO_KEY, api: "https://api.smtp2go.com" },
      },
      usage: "POST with { to, subject, body } body fields",
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const b = await req.json();
    const { to, subject, body, html, action_url, action_label, reply_to, template, template_vars } = b;

    // Status check via POST with action=status
    if (b.action === "status") {
      const smtpSettings = await getSmtpSettings();
      return new Response(JSON.stringify({
        ok: true,
        version: "9.0",
        gmail_smtp_configured: !!(smtpSettings.host && smtpSettings.user && smtpSettings.pass && smtpSettings.enabled),
        resend_key_set: !!RESEND_KEY,
        smtp2go_key_set: !!SMTP2GO_KEY,
        smtp_enabled: smtpSettings.enabled,
        from: smtpSettings.from_email,
        from_name: smtpSettings.from_name,
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (!to || !subject) {
      return new Response(JSON.stringify({ ok: false, error: "to and subject required" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const smtpSettings = await getSmtpSettings();
    const fromEmail = smtpSettings.from_email || "hpdeskg9@gmail.com";
    const fromName = smtpSettings.from_name || "EL5 MediProcure";

    let finalBody = body || "";
    let htmlContent = html || buildHtml(subject, finalBody, action_url, action_label);
    const textContent = finalBody.replace(/<[^>]+>/g, "") || subject;

    // Template system
    if (template && template_vars) {
      const { data } = await sb.from("email_templates").select("*").eq("key", template).maybeSingle();
      if (data?.html_content) {
        let t = data.html_content;
        for (const [k, v] of Object.entries(template_vars || {})) {
          t = t.replaceAll(`{{${k}}}`, String(v));
        }
        htmlContent = t;
      }
    }

    let result: { ok: boolean; id?: string; error?: string } = { ok: false, error: "No email provider available" };
    let provider = "none";

    // 1. Try Gmail SMTP first — this is the system's configured primary provider
    if (smtpSettings.enabled && smtpSettings.host && smtpSettings.user && smtpSettings.pass) {
      result = await sendViaGmailSmtp(to, subject, htmlContent, textContent, fromEmail, fromName, smtpSettings);
      provider = "gmail-smtp";
    }

    // 2. Fallback to Resend if Gmail SMTP isn't configured or failed
    if (!result.ok && RESEND_KEY) {
      result = await sendViaResend(to, subject, htmlContent, textContent, fromEmail, fromName);
      provider = "resend";
    }

    // 3. Fallback to SMTP2GO via env secret
    if (!result.ok && SMTP2GO_KEY) {
      result = await sendViaSmtp2Go(to, subject, htmlContent, textContent, fromEmail, fromName, SMTP2GO_KEY);
      provider = "smtp2go-env";
    }

    await logEmail(Array.isArray(to) ? to[0] : to, subject, result.ok ? "sent" : "failed", provider, result.id, result.error);

    return new Response(JSON.stringify({
      ...result,
      provider,
      from: fromEmail,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
