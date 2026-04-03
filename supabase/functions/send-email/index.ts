/**
 * ProcurBosse -- send-email Edge Function v4.0
 * Real SMTP delivery via smtp.deno.dev (Deno native SMTP client)
 * Fallback: Resend API -> internal queue
 * External SMTP: reads host/port/user/pass from system_settings
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

// ── Load SMTP config from DB + env fallbacks ─────────────────────────────────
async function getSmtpCfg(): Promise<Record<string, string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value")
      .in("key", [
        "smtp_host","smtp_port","smtp_user","smtp_pass",
        "smtp_from_name","smtp_from_email","smtp_tls",
        "smtp_enabled","resend_api_key","email_notifications_enabled"
      ]);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });
    // Env var fallbacks
    if (!cfg.smtp_host)     cfg.smtp_host     = Deno.env.get("SMTP_HOST")     ?? "";
    if (!cfg.smtp_port)     cfg.smtp_port     = Deno.env.get("SMTP_PORT")     ?? "587";
    if (!cfg.smtp_user)     cfg.smtp_user     = Deno.env.get("SMTP_USER")     ?? "";
    if (!cfg.smtp_pass)     cfg.smtp_pass     = Deno.env.get("SMTP_PASS")     ?? "";
    if (!cfg.smtp_from_name)  cfg.smtp_from_name  = "EL5 MediProcure";
    if (!cfg.smtp_from_email) cfg.smtp_from_email = cfg.smtp_user || "noreply@embu.go.ke";
    if (!cfg.resend_api_key)  cfg.resend_api_key  = Deno.env.get("RESEND_API_KEY") ?? "";
    return cfg;
  } catch { return {}; }
}

// ── Branded HTML email template ───────────────────────────────────────────────
function buildHtml(subject: string, body: string, fromName = "EL5 MediProcure", actionUrl?: string, actionLabel?: string): string {
  const escaped = (body || "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")
    .replace(/\n/g,"<br/>");

  const actionBtn = actionUrl ? `
    <div style="text-align:center;margin:24px 0 8px;">
      <a href="${actionUrl}" style="display:inline-block;padding:13px 36px;background:linear-gradient(135deg,#0a2558,#1a3a6b);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;letter-spacing:0.02em;">
        ${actionLabel || "Open in MediProcure"}
      </a>
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${subject}</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#374151}
.wrap{max-width:620px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);border:1px solid #e5e7eb}
.hdr{background:linear-gradient(135deg,#0a2558 0%,#1a3a6b 100%);padding:28px 36px}
.logo-row{display:flex;align-items:center;gap:14px;margin-bottom:10px}
.seal{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.18);border:2px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff;flex-shrink:0}
.brand h1{color:#fff;font-size:20px;margin:0;font-weight:800;letter-spacing:-0.02em}
.brand p{color:rgba(255,255,255,0.6);font-size:11px;margin:3px 0 0}
.dept-badge{display:inline-block;background:rgba(196,89,17,0.3);color:#fbbf24;font-size:10px;font-weight:700;padding:3px 12px;border-radius:20px;letter-spacing:0.06em;margin-top:2px}
.subj-bar{background:#f0f7ff;border-left:4px solid #0a2558;padding:14px 24px;font-size:14px;font-weight:700;color:#0a2558;line-height:1.3}
.body-wrap{padding:28px 36px;font-size:14px;line-height:1.8;color:#374151}
.divider{height:1px;background:#e5e7eb;margin:20px 0}
.meta-row{display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:#6b7280;padding:14px 36px;background:#f9fafb;border-top:1px solid #e5e7eb}
.meta-item strong{color:#374151;display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px}
.footer{padding:16px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center;line-height:1.7}
.confidential{background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;margin-left:6px}
@media(max-width:600px){.wrap{margin:12px;border-radius:8px}.hdr,.body-wrap,.meta-row,.footer{padding-left:20px;padding-right:20px}}
</style></head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="logo-row">
      <div class="seal">EL5</div>
      <div class="brand">
        <h1>${fromName}</h1>
        <p>Embu Level 5 Hospital &bull; Embu County Government</p>
      </div>
    </div>
    <span class="dept-badge">DEPARTMENT OF HEALTH &bull; PROCUREMENT DIVISION</span>
  </div>
  <div class="subj-bar">${subject}</div>
  <div class="body-wrap">
    ${escaped}
    ${actionBtn}
  </div>
  <div class="footer">
    This is an official automated communication from <strong>EL5 MediProcure</strong> Procurement System.<br/>
    Embu Level 5 Hospital &bull; P.O. Box 384-60100, Embu, Kenya &bull; Tel: +254 68 2030000<br/>
    <span class="confidential">CONFIDENTIAL</span> If received in error, please delete and notify the sender.
  </div>
</div>
</body></html>`;
}

// ── Real SMTP delivery using Deno TCP ─────────────────────────────────────────
async function sendViaSmtp(cfg: Record<string,string>, to: string[], subject: string, textBody: string, htmlBody: string): Promise<{ok:boolean;error?:string}> {
  try {
    const host    = cfg.smtp_host;
    const port    = parseInt(cfg.smtp_port || "587");
    const user    = cfg.smtp_user;
    const pass    = cfg.smtp_pass;
    const fromEmail = cfg.smtp_from_email || user;
    const fromName  = cfg.smtp_from_name  || "EL5 MediProcure";

    if (!host || !user || !pass) {
      return { ok: false, error: "SMTP not fully configured (host/user/pass required)" };
    }

    // Deno native TCP SMTP (STARTTLS on port 587)
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const encSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

    const mime = [
      `From: ${fromName} <${fromEmail}>`,
      `To: ${to.join(", ")}`,
      `Subject: ${encSubject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}@el5mediprocure.local>`,
      `X-Mailer: EL5-MediProcure-v4`,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      textBody,
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: base64`,
      "",
      btoa(unescape(encodeURIComponent(htmlBody))),
      "",
      `--${boundary}--`,
    ].join("\r\n");

    // Open TCP connection
    const conn = await Deno.connect({ hostname: host, port });

    const enc = new TextEncoder();
    const dec = new TextDecoder();

    async function readLine(): Promise<string> {
      const buf = new Uint8Array(1024);
      let line = "";
      while (true) {
        const n = await conn.read(buf);
        if (!n) break;
        line += dec.decode(buf.subarray(0, n));
        if (line.includes("\r\n")) break;
      }
      return line.trim();
    }

    async function send(cmd: string) {
      await conn.write(enc.encode(cmd + "\r\n"));
    }

    async function cmd(command: string, expect?: number): Promise<string> {
      await send(command);
      const reply = await readLine();
      if (expect && !reply.startsWith(String(expect))) {
        throw new Error(`SMTP error after '${command}': ${reply}`);
      }
      return reply;
    }

    // SMTP handshake
    await readLine(); // 220 greeting
    await cmd(`EHLO el5mediprocure.local`, 250);

    // STARTTLS if port 587 or 465
    if (port === 587 || port === 465) {
      try {
        await cmd("STARTTLS", 220);
        // Upgrade to TLS
        const tlsConn = await Deno.startTls(conn, { hostname: host });
        // Re-handshake over TLS
        await cmd("EHLO el5mediprocure.local");
        // AUTH LOGIN
        await cmd("AUTH LOGIN", 334);
        await cmd(btoa(user), 334);
        await cmd(btoa(pass), 235);
        // Send email
        await cmd(`MAIL FROM:<${fromEmail}>`, 250);
        for (const recipient of to) await cmd(`RCPT TO:<${recipient}>`, 250);
        await cmd("DATA", 354);
        await send(mime + "\r\n.");
        const dataReply = await readLine();
        await send("QUIT");
        tlsConn.close();
        return { ok: true };
      } catch (tlsErr: any) {
        // TLS failed, try plain AUTH
        conn.close();
        return { ok: false, error: `STARTTLS failed: ${tlsErr.message}` };
      }
    }

    // Plain (port 25 or already TLS on 465)
    await cmd("AUTH LOGIN", 334);
    await cmd(btoa(user), 334);
    await cmd(btoa(pass), 235);
    await cmd(`MAIL FROM:<${fromEmail}>`, 250);
    for (const recipient of to) await cmd(`RCPT TO:<${recipient}>`, 250);
    await cmd("DATA", 354);
    await send(mime + "\r\n.");
    await readLine();
    await send("QUIT");
    conn.close();
    return { ok: true };

  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Resend API delivery ───────────────────────────────────────────────────────
async function sendViaResend(cfg: Record<string,string>, to: string[], subject: string, text: string, html: string): Promise<{ok:boolean;id?:string;error?:string}> {
  const key = cfg.resend_api_key;
  if (!key) return { ok: false, error: "No Resend API key configured" };

  try {
    const fromEmail = cfg.smtp_from_email || "noreply@resend.dev";
    const fromName  = cfg.smtp_from_name  || "EL5 MediProcure";
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    `${fromName} <${fromEmail}>`,
        to, subject, text, html,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) return { ok: false, error: data.message || `Resend HTTP ${resp.status}` };
    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Audit log ─────────────────────────────────────────────────────────────────
async function logEmail(payload: any, status: string, via: string, err?: string) {
  try {
    await sb.from("email_sent").insert({
      from_address:  payload.from_email || "",
      to_address:    Array.isArray(payload.to) ? payload.to.join(",") : payload.to,
      cc_address:    payload.cc || null,
      subject:       payload.subject,
      body_text:     (payload.body || "").slice(0, 2000),
      status,
      sent_via:      via,
      error_message: err || null,
      sent_at:       new Date().toISOString(),
    });
  } catch (_) { /* non-fatal */ }
}

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const payload = await req.json();
    const { to, subject, body, cc, action_url, action_label } = payload;

    if (!to || !subject) {
      return new Response(JSON.stringify({ ok: false, error: "to and subject are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const cfg     = await getSmtpCfg();
    const toList  = Array.isArray(to) ? to : [to];
    const textBody = body || "";
    const htmlBody = buildHtml(subject, textBody, cfg.smtp_from_name, action_url, action_label);

    // ── 1. Try real SMTP ──────────────────────────────────────
    const smtpEnabled = cfg.smtp_enabled !== "false" && cfg.smtp_host && cfg.smtp_user && cfg.smtp_pass;
    if (smtpEnabled) {
      const smtpResult = await sendViaSmtp(cfg, toList, subject, textBody, htmlBody);
      if (smtpResult.ok) {
        await logEmail({ ...payload, from_email: cfg.smtp_from_email }, "sent", "smtp");
        return new Response(JSON.stringify({ ok: true, provider: "smtp", host: cfg.smtp_host }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }
      // Log SMTP failure, continue to fallback
      await logEmail(payload, "failed", "smtp", smtpResult.error);
      console.warn("SMTP failed:", smtpResult.error, "— trying Resend fallback");
    }

    // ── 2. Resend API fallback ────────────────────────────────
    if (cfg.resend_api_key) {
      const resendResult = await sendViaResend(cfg, toList, subject, textBody, htmlBody);
      if (resendResult.ok) {
        await logEmail(payload, "sent", "resend");
        return new Response(JSON.stringify({ ok: true, provider: "resend", id: resendResult.id }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      }
      await logEmail(payload, "failed", "resend", resendResult.error);
      console.warn("Resend failed:", resendResult.error);
    }

    // ── 3. Internal queue fallback ────────────────────────────
    try {
      await sb.from("notifications").insert({
        title:      `[QUEUED EMAIL] ${subject}`,
        message:    textBody.slice(0, 500),
        type:       "email",
        status:     "pending",
        created_at: new Date().toISOString(),
      });
    } catch (_) { /* non-fatal */ }
    await logEmail(payload, "queued", "internal");

    return new Response(JSON.stringify({
      ok: false,
      provider: "queued",
      error: "No active email provider. Message queued internally. Configure SMTP or Resend API key in Settings → Email.",
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("send-email fatal:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
