/**
 * ProcurBosse -- send-email Edge Function v5.8
 * Supabase SMTP + Resend API fallback
 * EL5 MediProcure -- Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function getSmtpCfg(): Promise<Record<string, string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value")
      .in("key", ["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled","resend_api_key","email_notifications_enabled"]);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });
    if (!cfg.smtp_host)       cfg.smtp_host       = Deno.env.get("SMTP_HOST")       ?? "smtp.resend.com";
    if (!cfg.smtp_port)       cfg.smtp_port       = Deno.env.get("SMTP_PORT")       ?? "465";
    if (!cfg.smtp_user)       cfg.smtp_user       = Deno.env.get("SMTP_USER")       ?? "resend";
    if (!cfg.smtp_pass)       cfg.smtp_pass       = Deno.env.get("SMTP_PASS")       ?? "";
    if (!cfg.smtp_from_name)  cfg.smtp_from_name  = "EL5 MediProcure v5.8";
    if (!cfg.smtp_from_email) cfg.smtp_from_email = cfg.smtp_user || "noreply@embu.go.ke";
    if (!cfg.resend_api_key)  cfg.resend_api_key  = Deno.env.get("RESEND_API_KEY") ?? "";
    return cfg;
  } catch { return {}; }
}

function buildHtml(subject: string, body: string, fromName = "EL5 MediProcure v5.8", actionUrl?: string, actionLabel?: string): string {
  const escaped = (body || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")
    .replace(/\n/g,"<br/>");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12)">
  <div style="background:linear-gradient(135deg,#0e2a4a,#0e7490);padding:28px 32px;text-align:center">
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.02em">EL5 MediProcure</div>
    <div style="color:rgba(255,255,255,0.6);font-size:11px;margin-top:4px;letter-spacing:0.06em">ProcurBosse v5.8 · Embu Level 5 Hospital</div>
  </div>
  <div style="padding:32px">
    <h2 style="margin:0 0 20px;color:#0e2a4a;font-size:18px;font-weight:700">${subject}</h2>
    <div style="color:#374151;font-size:14px;line-height:1.8">${escaped}</div>
    ${actionUrl && actionLabel ? `<div style="text-align:center;margin-top:28px"><a href="${actionUrl}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#0e7490,#0c6380);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px">${actionLabel}</a></div>` : ""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center">
    <div style="color:#9ca3af;font-size:11px">© ${new Date().getFullYear()} Embu County Government · Embu Level 5 Hospital</div>
    <div style="color:#d1d5db;font-size:10px;margin-top:4px">EL5 MediProcure v5.8 · ProcurBosse · Health Procurement ERP</div>
  </div>
</div></body></html>`;
}

async function sendViaResend(cfg: Record<string,string>, to: string[], subject: string, html: string, text: string): Promise<boolean> {
  if (!cfg.resend_api_key) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${cfg.resend_api_key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${cfg.smtp_from_name} <${cfg.smtp_from_email}>`, to, subject, html, text }),
  });
  if (r.ok) return true;
  const err = await r.text();
  console.error("Resend error:", err);
  return false;
}

async function logEmailRecord(to: string, subject: string, status: string, error?: string) {
  try {
    await sb.from("email_logs").insert({ to_email: to, subject, status, error_message: error, sent_at: new Date().toISOString() } as any);
  } catch {}
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, subject, body, html, action_url, action_label } = await req.json();
    if (!to || !subject) return new Response(JSON.stringify({ error: "Missing to/subject" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const cfg = await getSmtpCfg();
    if (cfg.email_notifications_enabled === "false" || cfg.smtp_enabled === "false") {
      return new Response(JSON.stringify({ success: false, reason: "Email disabled" }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const recipients = Array.isArray(to) ? to : [to];
    const htmlContent = html || buildHtml(subject, body || "", cfg.smtp_from_name, action_url, action_label);
    const textContent = body || subject;

    // Try Resend (primary for Supabase hosted)
    const sent = await sendViaResend(cfg, recipients, subject, htmlContent, textContent);
    if (sent) {
      for (const r of recipients) await logEmailRecord(r, subject, "sent");
      return new Response(JSON.stringify({ success: true, method: "resend", recipients }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Log failure
    for (const r of recipients) await logEmailRecord(r, subject, "failed", "All delivery methods failed");
    return new Response(JSON.stringify({ success: false, error: "Email delivery failed" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("send-email error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
