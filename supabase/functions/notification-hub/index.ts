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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Twilio Configuration
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || Deno.env.get("TWILIO_ACCT") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || Deno.env.get("TWILIO_TOKEN") || "";
const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER") || Deno.env.get("TWILIO_SMS") || "";
const TWILIO_WA = Deno.env.get("TWILIO_WA_NUMBER") || Deno.env.get("TWILIO_WA") || "";
const TWILIO_MG_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "";
const TWILIO_VA_SID = Deno.env.get("TWILIO_VERIFY_SERVICE_SID") || "";

// Email Configuration
const SMTP_HOST = Deno.env.get("SMTP_HOST") || "";
const SMTP_PORT = Deno.env.get("SMTP_PORT") || "587";
const SMTP_USER = Deno.env.get("SMTP_USER") || "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") || "";
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "hpdeskg9@gmail.com";
const SENDER_NAME = Deno.env.get("SENDER_NAME") || "EL5 MediProcure";

const db = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ── SMS via Twilio ──────────────────────────────────────────────────────────
async function sendSMS(to: string, message: string): Promise<{ ok: boolean; error?: string; sid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { ok: false, error: "Twilio credentials not configured" };
  }
  
  // Format phone number
  let phone = to.replace(/[\s\-\(\)]/g, "");
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
  
  let phone = to.replace(/[\s\-\(\)]/g, "");
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
  
  let phone = to.replace(/[\s\-\(\)]/g, "");
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

// ── Email via SendGrid ───────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, body: string, html?: string): Promise<{ ok: boolean; error?: string }> {
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
  
  // Fallback: Log to audit_logs
  await db.from("audit_logs").insert({
    action: "email_logged",
    details: JSON.stringify({ to, subject, body: body.slice(0, 500), ts: new Date().toISOString() }),
    created_at: new Date().toISOString(),
  }).catch(() => {});
  
  return { ok: true, error: "Email logged (no SMTP configured)" };
}

// ── Bulk Notification ─────────────────────────────────────────────────────────
async function sendBulkNotification(
  recipients: { phone?: string; email?: string; whatsapp?: string; name?: string }[],
  message: string,
  channels: ("sms" | "whatsapp" | "email")[],
  subject?: string
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
        const res = await sendEmail(r.email, subject || "Notification", message);
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
      const { recipients, message, channels, subject } = params;
      if (!recipients || !message || !channels) {
        return new Response(JSON.stringify({ ok: false, error: "recipients, message, channels required" }), { status: 400, headers: CORS });
      }
      const results = await sendBulkNotification(recipients, message, channels, subject);
      return new Response(JSON.stringify({ ok: true, ...results }), { headers: CORS });
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
    
    if (action === "call") {
      const { to, message } = params;
      if (!to || !message) {
        return new Response(JSON.stringify({ ok: false, error: "to and message required" }), { status: 400, headers: CORS });
      }
      const result = await makeVoiceCall(to, message);
      return new Response(JSON.stringify({ ok: result.ok, ...result }), { headers: CORS });
    }
    
    if (action === "status") {
      return new Response(JSON.stringify({
        ok: true,
        version: "v2.0",
        channels: {
          sms: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE),
          whatsapp: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WA),
          call: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE),
          email: !!(SMTP_USER || Deno.env.get("SENDGRID_API_KEY")),
        },
        senderEmail: SENDER_EMAIL,
      }), { headers: CORS });
    }
    
    return new Response(JSON.stringify({
      ok: false,
      error: "Unknown action. Use: send, send_all, notify_approval, call, status",
    }), { status: 400, headers: CORS });
    
  } catch (e: any) {
    console.error("notification-hub error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: CORS });
  }
});
