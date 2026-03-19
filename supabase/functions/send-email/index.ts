/**
 * ProcurBosse — send-email Edge Function v2.0
 * Reads SMTP config from system_settings table (set by Admin/Settings page)
 * Falls back to Resend API if SMTP not configured
 * Saves all sent emails to email_sent table
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function getSmtpConfig(): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("system_settings")
    .select("key,value")
    .in("key", ["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled","resend_api_key"]);
  const cfg: Record<string, string> = {};
  (data || []).forEach((r: any) => { cfg[r.key] = r.value || ""; });
  return cfg;
}

function buildHtml(subject: string, body: string, fromName = "EL5 MediProcure"): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
body{font-family:'Segoe UI',Arial,sans-serif;color:#374151;background:#f9fafb;margin:0;padding:0}
.wrap{max-width:620px;margin:30px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08)}
.hdr{background:linear-gradient(135deg,#0a2558,#1a3a6b);padding:22px 28px}
.hdr h1{color:#fff;font-size:18px;margin:0;font-weight:800}
.hdr p{color:rgba(255,255,255,0.65);font-size:11px;margin:4px 0 0}
.body{padding:28px}
.body pre{white-space:pre-wrap;font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.8;margin:0}
.footer{padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
</style></head>
<body><div class="wrap">
<div class="hdr"><h1>${fromName}</h1><p>Embu Level 5 Hospital · Embu County Government</p></div>
<div class="body"><pre>${body.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre></div>
<div class="footer">This is an official communication from EL5 MediProcure. Do not reply if unintended.</div>
</div></body></html>`;
}

async function saveSentEmail(payload: any, status: string, sentVia: string, error?: string) {
  try {
    await supabase.from("email_sent").insert({
      from_address:  payload.from_email || "",
      to_address:    Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
      cc_address:    payload.cc || null,
      subject:       payload.subject,
      body_text:     payload.body,
      status,
      sent_via:      sentVia,
      error_message: error || null,
      sent_at:       new Date().toISOString(),
    });
  } catch(_) { /* non-fatal */ }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { to, subject, body, cc, bcc, html, priority } = payload;

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ ok: false, error: "to, subject, body are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const cfg = await getSmtpConfig();
    const toList = Array.isArray(to) ? to : to.split(",").map((s: string) => s.trim()).filter(Boolean);
    const htmlBody = html || buildHtml(subject, body, cfg.smtp_from_name || "EL5 MediProcure");

    // ── Try SMTP first if configured ──────────────────────────
    const smtpEnabled = cfg.smtp_enabled === "true" && cfg.smtp_host && cfg.smtp_user && cfg.smtp_pass;

    if (smtpEnabled) {
      try {
        const transporter = nodemailer.createTransport({
          host:   cfg.smtp_host,
          port:   parseInt(cfg.smtp_port || "587"),
          secure: cfg.smtp_tls === "true" && parseInt(cfg.smtp_port || "587") === 465,
          auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
          tls:  { rejectUnauthorized: false },
          connectionTimeout: 15000,
        });

        const result = await transporter.sendMail({
          from:    `"${cfg.smtp_from_name || "EL5 MediProcure"}" <${cfg.smtp_from_email || cfg.smtp_user}>`,
          to:      toList.join(", "),
          cc:      cc || undefined,
          bcc:     bcc || undefined,
          subject,
          text:    body,
          html:    htmlBody,
          priority: priority === "urgent" || priority === "high" ? "high" : "normal",
        });

        await saveSentEmail({ ...payload, from_email: cfg.smtp_from_email || cfg.smtp_user }, "sent", "smtp");
        return new Response(JSON.stringify({ ok: true, provider: "smtp", messageId: result.messageId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (smtpErr: any) {
        console.error("SMTP failed:", smtpErr.message);
        await saveSentEmail(payload, "failed", "smtp", smtpErr.message);
        // Fall through to Resend
      }
    }

    // ── Try Resend API ──────────────────────────────────────
    const resendKey = cfg.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    `${cfg.smtp_from_name || "EL5 MediProcure"} <onboarding@resend.dev>`,
          to:      toList,
          cc:      cc ? cc.split(",").map((s: string) => s.trim()) : undefined,
          subject,
          text:    body,
          html:    htmlBody,
        }),
      });
      const resendData = await resendResp.json();
      if (resendResp.ok) {
        await saveSentEmail(payload, "sent", "resend");
        return new Response(JSON.stringify({ ok: true, provider: "resend", id: resendData.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      await saveSentEmail(payload, "failed", "resend", resendData.message || "Resend error");
    }

    // ── Internal fallback — save to notifications table ────
    await supabase.from("notifications").insert({
      title:    `Email (unsent): ${subject}`,
      message:  body.slice(0, 500),
      type:     "email_queued",
      status:   "pending",
      metadata: { to: toList, subject, body },
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      ok: false,
      provider: "none",
      error: "No email provider configured. Message saved internally. Configure SMTP or Resend in Settings → Email."
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
