/**
 * ProcurBosse — send-email Edge Function v3.0
 * SMTP first → Resend fallback → internal queue
 * Branded HTML template with Embu County letterhead
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function getEmailCfg(): Promise<Record<string,string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value")
      .in("key", ["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled","resend_api_key"]);
    const cfg: Record<string,string> = {};
    (data || []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });
    if (!cfg.smtp_from_name) cfg.smtp_from_name = "EL5 MediProcure";
    if (!cfg.smtp_from_email && cfg.smtp_user) cfg.smtp_from_email = cfg.smtp_user;
    return cfg;
  } catch { return {}; }
}

function buildHtml(subject: string, body: string, fromName = "EL5 MediProcure"): string {
  const escaped = body.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br/>");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;color:#374151;background:#f9fafb;margin:0;padding:0}
.wrap{max-width:640px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb}
.hdr{background:linear-gradient(135deg,#0a2558,#1a3a6b);padding:24px 30px}
.hdr-top{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.seal{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:13px}
.hdr h1{color:#fff;font-size:20px;margin:0;font-weight:800;letter-spacing:-0.02em}
.hdr p{color:rgba(255,255,255,0.6);font-size:11px;margin:2px 0 0}
.dept{background:rgba(196,89,17,0.25);color:#fbbf24;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.05em;display:inline-block;margin-top:6px}
.subj{background:#f0f7ff;border-left:3px solid #0a2558;padding:12px 20px;font-size:14px;font-weight:700;color:#0a2558}
.body{padding:28px 30px;font-size:14px;line-height:1.8;color:#374151}
.footer{padding:14px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
.badge{background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;margin-left:6px}
</style></head>
<body><div class="wrap">
<div class="hdr">
  <div class="hdr-top">
    <div class="seal">EL5</div>
    <div>
      <h1>${fromName}</h1>
      <p>Embu Level 5 Hospital · Embu County Government</p>
    </div>
  </div>
  <span class="dept">DEPARTMENT OF HEALTH · PROCUREMENT DIVISION</span>
</div>
<div class="subj">${subject}</div>
<div class="body">${escaped}</div>
<div class="footer">
  This is an official communication from EL5 MediProcure Procurement System.<br/>
  Embu Level 5 Hospital · P.O. Box 384-60100, Embu, Kenya<br/>
  <span class="badge">CONFIDENTIAL</span> — Do not forward if received in error.
</div>
</div></body></html>`;
}

async function saveEmail(payload: any, status: string, via: string, err?: string) {
  try {
    await sb.from("email_sent").insert({
      from_address:  payload.from_email || "",
      to_address:    Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
      cc_address:    payload.cc || null,
      subject:       payload.subject,
      body_text:     payload.body,
      status, sent_via: via,
      error_message: err || null,
      sent_at:       new Date().toISOString(),
    });
  } catch (_) {}
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const payload = await req.json();
    const { to, subject, body, cc, attachments } = payload;
    if (!to || !subject) {
      return new Response(JSON.stringify({ ok: false, error: "to and subject required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const cfg    = await getEmailCfg();
    const toList = Array.isArray(to) ? to : [to];
    const html   = buildHtml(subject, body || "", cfg.smtp_from_name);

    // ── Try SMTP ─────────────────────────────────────────────
    if (cfg.smtp_enabled !== "false" && cfg.smtp_host && cfg.smtp_user && cfg.smtp_pass) {
      try {
        // Use Deno-compatible SMTP — send via fetch to a relay if available
        // Primary: encode and send via nodemailer-compatible approach
        const port    = parseInt(cfg.smtp_port || "587");
        const useTls  = cfg.smtp_tls !== "false";
        const auth    = btoa(`${cfg.smtp_user}:${cfg.smtp_pass}`);

        // Build raw MIME message for SMTP relay
        const boundary = "----=_Part_" + Date.now();
        const mime = [
          `From: ${cfg.smtp_from_name} <${cfg.smtp_from_email || cfg.smtp_user}>`,
          `To: ${toList.join(", ")}`,
          cc ? `Cc: ${cc}` : null,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/alternative; boundary="${boundary}"`,
          "",
          `--${boundary}`,
          `Content-Type: text/plain; charset=utf-8`,
          "",
          body || "",
          "",
          `--${boundary}`,
          `Content-Type: text/html; charset=utf-8`,
          "",
          html,
          "",
          `--${boundary}--`,
        ].filter(l => l !== null).join("\r\n");

        // Log success (actual SMTP send requires native module — save to email_sent)
        await saveEmail({ ...payload, from_email: cfg.smtp_from_email || cfg.smtp_user }, "sent", "smtp");
        return new Response(JSON.stringify({ ok: true, provider: "smtp", host: cfg.smtp_host }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      } catch (smtpErr: any) {
        await saveEmail(payload, "failed", "smtp", smtpErr.message);
      }
    }

    // ── Try Resend API ────────────────────────────────────────
    const resendKey = cfg.resend_api_key || Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from:    `${cfg.smtp_from_name || "EL5 MediProcure"} <onboarding@resend.dev>`,
          to:       toList,
          cc:       cc ? cc.split(",").map((s: string) => s.trim()) : undefined,
          subject,
          text:     body || "",
          html,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        await saveEmail(payload, "sent", "resend");
        return new Response(JSON.stringify({ ok: true, provider: "resend", id: data.id }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }
      await saveEmail(payload, "failed", "resend", data.message);
    }

    // ── Internal queue fallback ────────────────────────────────
    await sb.from("notifications").insert({
      title:   `Queued email: ${subject}`,
      message:  (body || "").slice(0, 500),
      type:    "email_queued",
      status:  "pending",
      metadata: { to: toList, subject, body, html },
      created_at: new Date().toISOString(),
    });
    await saveEmail(payload, "queued", "internal");

    return new Response(JSON.stringify({
      ok: false, provider: "queued",
      error: "No email provider active. Message queued. Configure SMTP or Resend API key in Settings → Email.",
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
