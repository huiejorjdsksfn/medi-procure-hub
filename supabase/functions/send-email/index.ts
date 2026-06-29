/**
 * EL5 MediProcure — send-email v8.0 KENYA-OPTIMIZED
 * Primary: Resend API (https://resend.com) - best for transactional emails
 * Fallback 1: SMTP2GO API (https://api.smtp2go.com) - good deliverability
 * Fallback 2: Supabase built-in email (development only)
 * 
 * Configuration Required in Supabase Edge Functions → Secrets:
 * - RESEND_API_KEY: Your Resend API key (re_xxxxx)
 * - SMTP2GO_API_KEY: Your SMTP2GO API key (optional, for fallback)
 * 
 * EL5 MediProcure · Embu Level 5 Hospital · Kenya
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// Credentials from env secrets
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
}

async function getSmtpSettings(): Promise<SmtpSettings> {
  try {
    const { data } = await sb.from("system_settings")
      .select("key,value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_email", "smtp_from_name", "smtp_enabled"]);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.key) cfg[r.key] = r.value || ""; });
    return {
      host: cfg.smtp_host || "",
      port: cfg.smtp_port || "587",
      user: cfg.smtp_user || "",
      pass: cfg.smtp_pass || "",
      from_email: cfg.smtp_from_email || "hpdeskg9@gmail.com",
      from_name: cfg.smtp_from_name || "EL5 MediProcure",
      enabled: cfg.smtp_enabled === "true",
    };
  } catch {
    return { host: "", port: "587", user: "", pass: "", from_email: "hpdeskg9@gmail.com", from_name: "EL5 MediProcure", enabled: false };
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
    <div style="color:rgba(255,255,255,.65);font-size:11px;margin-top:5px;letter-spacing:.06em">ProcurBosse v10 · Embu Level 5 Hospital · Embu County Government</div>
  </div>
  <div style="padding:32px 36px">
    <h2 style="margin:0 0 20px;color:#0e2a4a;font-size:19px;font-weight:700;border-bottom:2px solid #e0f2fe;padding-bottom:12px">${subject}</h2>
    <div style="color:#374151;font-size:14px;line-height:1.85">${safe}</div>
    ${actionUrl ? `<div style="text-align:center;margin-top:32px"><a href="${actionUrl}" style="display:inline-block;padding:13px 30px;background:linear-gradient(135deg,#0e7490,#0c6380);color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:14px;letter-spacing:.02em">${actionLabel || "View Details"}</a></div>` : ""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 36px;text-align:center">
    <div style="color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} Embu County Government · Embu Level 5 Hospital</div>
    <div style="color:#d1d5db;font-size:10px;margin-top:4px">EL5 MediProcure v11.5 · ProcurBosse · Health Procurement ERP · Kenya</div>
  </div>
</div></body></html>`;
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
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  
  // GET status check - use URL params or return usage info
  if (req.method === "GET") {
    const smtpSettings = await getSmtpSettings();
    return new Response(JSON.stringify({
      ok: true,
      version: "8.0",
      hospital: "EL5 MediProcure",
      resend_key_set: !!RESEND_KEY,
      smtp2go_key_set: !!SMTP2GO_KEY,
      smtp_enabled: smtpSettings.enabled,
      from: smtpSettings.from_email,
      from_name: smtpSettings.from_name,
      providers: {
        resend: { configured: !!RESEND_KEY, api: "https://api.resend.com" },
        smtp2go: { configured: !!SMTP2GO_KEY, api: "https://api.smtp2go.com" },
      },
      usage: "POST with { to, subject, body } body fields",
      kenya_note: "Emails work globally. For Kenya, consider Resend for best deliverability.",
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
        version: "8.0",
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

    // Try Resend first (primary)
    if (RESEND_KEY) {
      result = await sendViaResend(to, subject, htmlContent, textContent, fromEmail, fromName);
      provider = "resend";
    }

    // Fallback to SMTP2GO via env secret
    if (!result.ok && SMTP2GO_KEY) {
      result = await sendViaSmtp2Go(to, subject, htmlContent, textContent, fromEmail, fromName, SMTP2GO_KEY);
      provider = "smtp2go-env";
    }

    // Fallback to SMTP2GO via system_settings
    if (!result.ok && smtpSettings.enabled && smtpSettings.pass) {
      result = await sendViaSmtp2Go(to, subject, htmlContent, textContent, fromEmail, fromName, smtpSettings.pass);
      provider = "smtp2go-db";
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
