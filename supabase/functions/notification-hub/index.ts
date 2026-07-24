/**
 * EL5 MediProcure — notification-hub Edge Function v2.0
 * Unified notification API: Email, SMS, WhatsApp, Voice Call
 * Routes to appropriate service based on user preferences and availability
 * 
 * Actions:
 * - send: Send notification via preferred channel
 * - send_all: Send to multiple recipients via multiple channels
 * - notify_approval: Notify stakeholders of approval actions
 * - call: Make voice call
 * - status: Check API health
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Twilio Configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || Deno.env.get("TWILIO_ACCT") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || Deno.env.get("TWILIO_TOKEN") || "";
const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_SMS") || "";
const TWILIO_WA = Deno.env.get("TWILIO_WA_NUMBER") || Deno.env.get("TWILIO_WA") || "";
const TWILIO_MG_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
const TWILIO_VA_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") || "";

// Email Configuration — env vars are a fallback; the real source of truth is
// system_settings (smtp_host/smtp_user/smtp_pass), set via Settings → SMTP.
const SMTP_HOST_ENV = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT_ENV = Deno.env.get("SMTP_PORT") || "587"; // Gmail TLS
const SMTP_USER_ENV = Deno.env.get("SMTP_USER") || "hpdeskg9@gmail.com";
const SMTP_PASS_ENV = Deno.env.get("SMTP_PASS") || "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "hpdeskg9@gmail.com";
const SENDER_NAME = Deno.env.get("SENDER_NAME") || "EL5 MediProcure";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

let _smtpCache: { host: string; port: string; user: string; pass: string; enabled: boolean } | null = null;
async function getDbSmtp() {
  if (_smtpCache) return _smtpCache;
  try {
    const { data } = await db.from("system_settings").select("key,value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_enabled"]);
    const m: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.key) m[r.key] = r.value || ""; });
    _smtpCache = {
      host: m.smtp_host || SMTP_HOST_ENV,
      port: m.smtp_port || SMTP_PORT_ENV,
      user: m.smtp_user || SMTP_USER_ENV,
      pass: m.smtp_pass || SMTP_PASS_ENV,
      enabled: m.smtp_enabled === "true",
    };
  } catch {
    _smtpCache = { host: SMTP_HOST_ENV, port: SMTP_PORT_ENV, user: SMTP_USER_ENV, pass: SMTP_PASS_ENV, enabled: false };
  }
  return _smtpCache;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ── Branded HTML email template ──────────────────────────────────────────────
// Pulls the hospital's live logo/colors from `facilities` (same source
// FormsGatewayPage/PublicFormPage already use) so every email — immediate
// "Send to All Users" or a scheduled blast — looks like it came from the
// actual hospital instead of a bare text message.
let _brandCache: { name: string; logo_url: string | null; primary: string; accent: string; ts: number } | null = null;
async function getBrand() {
  if (_brandCache && Date.now() - _brandCache.ts < 5 * 60 * 1000) return _brandCache;
  let brand = { name: "EL5 MediProcure · Embu Level 5 Hospital", logo_url: null as string | null, primary: "#0a2558", accent: "#C45911" };
  try {
    const { data } = await db.from("facilities").select("name,logo_url,primary_color,accent_color").eq("is_main", true).maybeSingle();
    if (data) brand = {
      name: data.name || brand.name,
      logo_url: data.logo_url || null,
      primary: data.primary_color || brand.primary,
      accent: data.accent_color || brand.accent,
    };
  } catch { /* keep default brand */ }
  _brandCache = { ...brand, ts: Date.now() };
  return _brandCache;
}

function escapeHtml(s: string): string {
  return (s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

async function buildBrandedEmailHtml(opts: { recipientName?: string; heading: string; bodyText: string; ctaLabel?: string; ctaUrl?: string }): Promise<string> {
  const brand = await getBrand();
  const greeting = opts.recipientName ? `Hi ${escapeHtml(opts.recipientName)},` : "Hello,";
  const bodyHtml = escapeHtml(opts.bodyText).replace(/\n/g, "<br/>");
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,${brand.primary},${brand.accent});padding:22px 24px;color:#fff;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          ${brand.logo_url ? `<td style="padding-right:12px;"><img src="${brand.logo_url}" alt="" width="40" height="40" style="border-radius:9px;display:block;background:#fff;"/></td>` : ""}
          <td>
            <div style="font-size:11px;opacity:0.85;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${escapeHtml(brand.name)}</div>
            <div style="font-size:18px;font-weight:800;margin-top:2px;">${escapeHtml(opts.heading)}</div>
          </td>
        </tr></table>
      </div>
      <div style="padding:26px 24px;color:#1e293b;font-size:14px;line-height:1.6;">
        <p style="margin:0 0 14px;">${greeting}</p>
        <p style="margin:0 0 20px;">${bodyHtml}</p>
        ${opts.ctaUrl ? `<a href="${opts.ctaUrl}" style="display:inline-block;background:${brand.primary};color:#fff;text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 22px;border-radius:8px;">${escapeHtml(opts.ctaLabel || "Open")}</a>` : ""}
      </div>
      <div style="padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;">
        This is an automated message from ${escapeHtml(brand.name)}. Please do not reply directly to this email.
      </div>
    </div>
  </div>
</body></html>`;
}

// ── SMS via Twilio ──────────────────────────────────────────────────────────
async function sendSMS(to: string, message: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  
  // Format phone number
  let phone = to.replace(/[\s\-()]/g, "");
  if (!phone.startsWith("+")) {
    phone = phone.startsWith("0") ? "+254" + phone.slice(1) : "+" + phone;
  }
  
  try {
    const body = new URLSearchParams({
      To: phone,
      Body: message.slice(0, 1600),
      From: TWILIO_PHONE,
    });
    
    if (TWILIO_MG_SID) {
      body.set("MessagingServiceSid", TWILIO_MG_SID);
      body.delete("From");
    }
    
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.message || "SMS send failed" };
    
    return { ok: true, sid: d.sid };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── WhatsApp via Twilio ─────────────────────────────────────────────────────
async function sendWhatsApp(to: string, message: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  
  let phone = to.replace(/[\s\-()]/g, "");
  if (!phone.startsWith("+")) {
    phone = phone.startsWith("0") ? "+254" + phone.slice(1) : "+" + phone;
  }
  
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${phone}`,
        From: `whatsapp:${TWILIO_WA}`,
        Body: message.slice(0, 4096),
      }).toString(),
    });
    
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.message || "WhatsApp send failed" };
    
    return { ok: true, sid: d.sid };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Voice Call via Twilio ────────────────────────────────────────────────────
async function makeVoiceCall(to: string, message: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  
  let phone = to.replace(/[\s\-()]/g, "");
  if (!phone.startsWith("+")) {
    phone = phone.startsWith("0") ? "+254" + phone.slice(1) : "+" + phone;
  }
  
  // Generate TwiML for the call
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Amy">${message}</Say>
  <Pause length="1"/>
  <Say voice="Polly.Amy">Press 1 to approve, press 9 to reject.</Say>
</Response>`;
  
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: TWILIO_PHONE,
        Twiml: twiml,
      }).toString(),
    });
    
    const d = await r.json();
    if (!r.ok) return { ok: false, error: d.message || "Call failed" };
    
    return { ok: true, sid: d.sid };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Email via Gmail SMTP (primary) → SendGrid (fallback) → audit log ─────────
async function sendEmail(to: string, subject: string, body: string, html?: string): Promise<{ ok: boolean; error?: string }> {
  const smtp = await getDbSmtp();

  // 1. Real Gmail SMTP — the system's configured primary provider
  if (smtp.enabled && smtp.host && smtp.user && smtp.pass) {
    let client: SMTPClient | null = null;
    try {
      const port = Number(smtp.port) || 587;
      client = new SMTPClient({
        connection: {
          hostname: smtp.host,
          port,
          tls: port === 465,
          auth: { username: smtp.user, password: smtp.pass },
        },
      });
      await client.send({
        from: `${SENDER_NAME} <${smtp.user}>`,
        to: [to],
        subject,
        content: body.slice(0, 10000),
        html: html || undefined,
      });
      return { ok: true };
    } catch (e: any) {
      // fall through to SendGrid / audit-log fallback below
      console.error("[notification-hub] Gmail SMTP send failed:", e?.message);
    } finally {
      try { await client?.close(); } catch { /* already closed */ }
    }
  }

  // 2. SendGrid fallback, if configured
  const SENDGRID_KEY = Deno.env.get("SENDGRID_API_KEY") || "";

  if (SENDGRID_KEY) {
    try {
      const r = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SENDGRID_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: SENDER_EMAIL, name: SENDER_NAME },
          subject,
          content: [
            { type: "text/plain", value: body.slice(0, 10000) },
            ...(html ? [{ type: "text/html", value: html }] : []),
          ],
        }),
      });
      
      if (r.ok) return { ok: true };
      const err = await r.text();
      return { ok: false, error: `SendGrid: ${err.slice(0, 200)}` };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }
  
  // No working provider — log it for visibility, but report the honest
  // failure instead of a false "ok:true" (this previously made bulk-send
  // UIs like "email this form to every active user" claim success while
  // no email was ever delivered).
  await db.from("audit_logs").insert({
    action: "email_logged",
    details: JSON.stringify({ to, subject, body: body.slice(0, 500), ts: new Date().toISOString() }),
    created_at: new Date().toISOString(),
  }).catch(() => {});

  return { ok: false, error: "No email provider configured — set a real Gmail/SMTP password in Settings → Email/SMTP (Enable SMTP must also be on)." };
}

// ── Bulk Notification ─────────────────────────────────────────────────────────
async function sendBulkNotification(
  recipients: { phone?: string; email?: string; whatsapp?: string; name?: string }[],
  message: string,
  channels: ("sms" | "whatsapp" | "email")[],
  subject?: string,
  ctaUrl?: string,
  ctaLabel?: string
): Promise<{ results: { recipient: string; channel: string; ok: boolean; error?: string }[] }> {
  const results: { recipient: string; channel: string; ok: boolean; error?: string }[] = [];

  for (const r of recipients) {
    const name = r.name || r.email || r.phone || "User";

    for (const ch of channels) {
      if (ch === "sms" && r.phone) {
        const res = await sendSMS(r.phone, `Hi ${name}, ${message}`);
        results.push({ recipient: r.phone, channel: "sms", ...res });
      } else if (ch === "whatsapp" && r.whatsapp) {
        const res = await sendWhatsApp(r.whatsapp, `🏥 EL5 MediProcure\n\nHi ${name},\n\n${message}`);
        results.push({ recipient: r.whatsapp, channel: "whatsapp", ...res });
      } else if (ch === "email" && r.email) {
        const html = await buildBrandedEmailHtml({
          recipientName: r.name, heading: subject || "Notification", bodyText: message,
          ctaUrl, ctaLabel,
        });
        const res = await sendEmail(r.email, subject || "Notification", message, html);
        results.push({ recipient: r.email, channel: "email", ...res });
      }
    }
  }

  return { results };
}

// ── Approval Workflow Notification ──────────────────────────────────────────
async function notifyApprovalAction(
  requisitionId: string,
  requisitionNumber: string,
  action: "approved" | "rejected" | "forwarded" | "returned",
  actorName: string,
  actorEmail: string,
  recipientPhones: string[],
  recipientEmails: string[],
  comment?: string
): Promise<{ ok: boolean; results: any[] }> {
  const actionText = {
    approved: "APPROVED",
    rejected: "REJECTED",
    forwarded: "FORWARDED",
    returned: "RETURNED",
  }[action];
  
  const message = `${actionText}\n\nRequisition: ${requisitionNumber}\nAction by: ${actorName}\n${comment ? `Comment: ${comment}` : ""}\n\nLogin: https://procurbosse.edgeone.app\n\n— EL5 MediProcure ERP`;
  
  const results: any[] = [];
  
  for (const phone of recipientPhones) {
    const res = await sendSMS(phone, message);
    results.push({ type: "sms", to: phone, ...res });
  }
  
  for (const email of recipientEmails) {
    const res = await sendEmail(
      email,
      `${actionText} - ${requisitionNumber}`,
      message,
      `<html><body><h2>${actionText}</h2><p><strong>Requisition:</strong> ${requisitionNumber}</p><p><strong>Action by:</strong> ${actorName}</p>${comment ? `<p><strong>Comment:</strong> ${comment}</p>` : ""}<p><a href="https://procurbosse.edgeone.app">Login to EL5 MediProcure</a></p></body></html>`
    );
    results.push({ type: "email", to: email, ...res });
  }
  
  await db.from("audit_logs").insert({
    action: `requisition_${action}`,
    details: JSON.stringify({
      requisitionId, requisitionNumber, action, actorName, actorEmail,
      recipients: { phones: recipientPhones.length, emails: recipientEmails.length },
      comment, ts: new Date().toISOString(),
    }),
    created_at: new Date().toISOString(),
  }).catch(() => {});
  
  return { ok: true, results };
}

// ── Document Signature Request Notification ──────────────────────────────────
async function notifySignatureRequest(
  signeeId: string, documentId: string, documentName: string,
  signeeName: string, signeeEmail: string, signeeUserId: string | null,
  signToken: string, requestedByName: string, dueDate?: string
): Promise<{ ok: boolean; error?: string }> {
  const signUrl = `https://procurbosse.edgeone.app/#/sign/${signToken}`;
  const dueTxt = dueDate ? ` by ${new Date(dueDate).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}` : "";
  const textBody = `Hi ${signeeName},\n\n${requestedByName} has requested your signature on "${documentName}"${dueTxt}.\n\nOpen and sign here:\n${signUrl}\n\n— EL5 MediProcure ERP`;
  const html = `<html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f4f8;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.12)">
      <div style="background:linear-gradient(135deg,#0e2a4a 0%,#0e7490 100%);padding:26px 30px;text-align:center">
        <div style="color:#fff;font-size:20px;font-weight:800">🏥 EL5 MediProcure</div>
        <div style="color:rgba(255,255,255,.65);font-size:11px;margin-top:4px">Signature Requested</div>
      </div>
      <div style="padding:28px 32px">
        <p style="color:#374151;font-size:14px">Hi <strong>${signeeName}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.6"><strong>${requestedByName}</strong> has requested your signature on:</p>
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:12px 16px;margin:14px 0;font-weight:700;color:#0e2a4a">${documentName}</div>
        ${dueTxt ? `<p style="color:#dc2626;font-size:13px;font-weight:600">Please sign${dueTxt}.</p>` : ""}
        <div style="text-align:center;margin:26px 0">
          <a href="${signUrl}" style="background:#0e7490;color:#fff;padding:12px 28px;border-radius:7px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">✍ Review &amp; Sign</a>
        </div>
        <p style="color:#9ca3af;font-size:11px">If the button doesn't work, copy this link: ${signUrl}</p>
      </div>
    </div>
  </body></html>`;

  const emailRes = await sendEmail(signeeEmail, `Signature requested: ${documentName}`, textBody, html);

  // In-app notification for internal users (service role bypasses RLS)
  if (signeeUserId) {
    try {
      const { data: notif } = await db.from("notifications").insert({
        user_id: signeeUserId, title: "Signature requested",
        message: `${requestedByName} requested your signature on "${documentName}"`,
        type: "signature_request", category: "documents", priority: "high",
        action_url: `/#/sign/${signToken}`, action_label: "Review & Sign",
        icon: "✍", record_id: documentId, record_type: "document",
        created_at: new Date().toISOString(),
      }).select().single();
      if (notif?.id) {
        await db.from("notification_recipients").insert({
          notification_id: notif.id, recipient_id: signeeUserId,
          recipient_email: signeeEmail, recipient_name: signeeName,
          created_at: new Date().toISOString(),
        });
      }
    } catch (e) { console.error("[notification-hub] in-app notify failed:", e); }
  }

  try {
    const { data: cur } = await db.from("document_signees").select("notify_count").eq("id", signeeId).single();
    await db.from("document_signees").update({
      notified_at: new Date().toISOString(),
      notify_count: (cur?.notify_count || 0) + 1,
    }).eq("id", signeeId);
  } catch { /* best-effort */ }

  return emailRes;
}

// ── Main Handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  
  try {
    const body = await req.json();
    const { action, ...params } = body;
    
    if (action === "send") {
      const { channel, to, subject, message, html } = params;
      
      if (!channel || !message) {
        return new Response(JSON.stringify({ ok: false, error: "channel and message required" }), { status: 400, headers: CORS });
      }
      
      let result: { ok: boolean; error?: string; sid?: string } = { ok: false, error: "Unknown channel" };
      
      switch (channel) {
        case "sms": result = await sendSMS(to, message); break;
        case "whatsapp": result = await sendWhatsApp(to, message); break;
        case "call": result = await makeVoiceCall(to, message); break;
        case "email": result = await sendEmail(to, subject || "Notification", message, html); break;
        default: return new Response(JSON.stringify({ ok: false, error: `Unknown channel: ${channel}` }), { status: 400, headers: CORS });
      }
      
      return new Response(JSON.stringify({ ok: result.ok, ...result, channel }), { headers: CORS });
    }
    
    if (action === "send_all") {
      const { recipients, message, channels, subject, ctaUrl, ctaLabel } = params;
      if (!recipients || !message || !channels) {
        return new Response(JSON.stringify({ ok: false, error: "recipients, message, channels required" }), { status: 400, headers: CORS });
      }
      const results = await sendBulkNotification(recipients, message, channels, subject, ctaUrl, ctaLabel);
      return new Response(JSON.stringify({ ok: true, ...results }), { headers: CORS });
    }

    // Cron-invoked (every 2 minutes — see 20260720210000_form_email_scheduler.sql).
    // Finds due, pending rows in form_email_schedules, sends the branded
    // email to every active user with an email on file, and marks the
    // schedule sent/failed. Idempotent per row via the status column, so
    // overlapping cron ticks can't double-send the same schedule.
    if (action === "process_scheduled_form_emails") {
      const nowIso = new Date().toISOString();
      const { data: due, error: dueErr } = await db
        .from("form_email_schedules")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", nowIso)
        .limit(10);
      if (dueErr) return new Response(JSON.stringify({ ok: false, error: dueErr.message }), { status: 500, headers: CORS });
      if (!due || due.length === 0) return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: CORS });

      const processed: { id: string; ok: boolean; sent: number; failed: number }[] = [];
      for (const sched of due) {
        // Claim the row first (status → sending) so a second overlapping
        // cron tick skips it instead of sending it twice.
        const { data: claimed } = await db.from("form_email_schedules")
          .update({ status: "sending" }).eq("id", sched.id).eq("status", "pending").select("id").maybeSingle();
        if (!claimed) continue; // another tick already grabbed it

        try {
          const { data: users } = await db.from("profiles").select("id,email,full_name").eq("is_active", true);
          const activeUsers = users || [];
          const ctaUrl = `https://procurbosse.edgeone.app/#/forms/${sched.form_id}`;

          // Reliable channel first: in-app notifications need no external
          // provider at all, so this always succeeds regardless of SMTP/
          // Twilio/Resend configuration state. Runs with service-role
          // access here (this is the cron path, not a client call), so no
          // RLS consideration either.
          const notifRows = activeUsers.map((u: any) => ({
            user_id: u.id, title: sched.subject || "New form", message: sched.message,
            type: "form_published", category: "forms", priority: "normal", icon: "📋",
            action_url: ctaUrl, action_label: "Answer the Form",
            record_id: sched.form_id, record_type: "google_forms",
            created_at: new Date().toISOString(),
          }));
          if (notifRows.length) await db.from("notifications").insert(notifRows);

          // Best-effort email on top of the reliable channel above.
          const recipients = Array.from(
            new Map(activeUsers.filter((u: any) => u.email).map((u: any) => [u.email, { email: u.email, name: u.full_name || u.email }])).values()
          );
          const { results } = recipients.length
            ? await sendBulkNotification(recipients as any, sched.message, ["email"], sched.subject, ctaUrl, "Answer the Form")
            : { results: [] as { ok: boolean }[] };
          const okCount = results.filter((r) => r.ok).length;
          await db.from("form_email_schedules").update({
            status: "sent", sent_at: new Date().toISOString(),
            recipients_count: activeUsers.length, sent_count: okCount, failed_count: recipients.length - okCount,
          }).eq("id", sched.id);
          processed.push({ id: sched.id, ok: true, sent: okCount, failed: recipients.length - okCount });
        } catch (e: any) {
          await db.from("form_email_schedules").update({ status: "failed", error: e?.message || "Unknown error" }).eq("id", sched.id);
          processed.push({ id: sched.id, ok: false, sent: 0, failed: 0 });
        }
      }
      return new Response(JSON.stringify({ ok: true, processed: processed.length, details: processed }), { headers: CORS });
    }
    
    if (action === "notify_approval") {
      const { requisitionId, requisitionNumber, action: reqAction, actorName, actorEmail, recipientPhones, recipientEmails, comment } = params;
      if (!requisitionId || !reqAction || !actorName) {
        return new Response(JSON.stringify({ ok: false, error: "requisitionId, action, actorName required" }), { status: 400, headers: CORS });
      }
      const result = await notifyApprovalAction(
        requisitionId, requisitionNumber || requisitionId,
        reqAction, actorName, actorEmail || "",
        recipientPhones || [], recipientEmails || [], comment
      );
      return new Response(JSON.stringify(result), { headers: CORS });
    }
    
    if (action === "notify_signature_request") {
      const { signeeId, documentId, documentName, signeeName, signeeEmail, signeeUserId, signToken, requestedByName, dueDate } = params;
      if (!signeeId || !documentId || !signeeEmail || !signToken) {
        return new Response(JSON.stringify({ ok: false, error: "signeeId, documentId, signeeEmail, signToken required" }), { status: 400, headers: CORS });
      }
      const result = await notifySignatureRequest(
        signeeId, documentId, documentName || "Document", signeeName || signeeEmail,
        signeeEmail, signeeUserId || null, signToken, requestedByName || "A colleague", dueDate
      );
      return new Response(JSON.stringify(result), { headers: CORS });
    }

    if (action === "call") {
      const { to, message } = params;
      if (!to || !message) {
        return new Response(JSON.stringify({ ok: false, error: "to and message required" }), { status: 400, headers: CORS });
      }
      const result = await makeVoiceCall(to, message);
      return new Response(JSON.stringify({ ok: result.ok, ...result }), { headers: CORS });
    }
    
    if (action === "status") {
      const smtp = await getDbSmtp();
      return new Response(JSON.stringify({
        ok: true,
        version: "v2.0",
        channels: {
          sms: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE),
          whatsapp: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WA),
          call: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE),
          email: !!((smtp.enabled && smtp.host && smtp.user && smtp.pass) || Deno.env.get("SENDGRID_API_KEY")),
        },
        senderEmail: SENDER_EMAIL,
      }), { headers: CORS });
    }
    
    return new Response(JSON.stringify({
      ok: false,
      error: "Unknown action. Use: send, send_all, notify_approval, notify_signature_request, call, status, process_scheduled_form_emails",
    }), { status: 400, headers: CORS });
    
  } catch (e: any) {
    console.error("notification-hub error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
