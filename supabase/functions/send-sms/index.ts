/**
 * ProcurBosse send-sms v10.0 — FIXED
 * SMS:    REDACTED_TWILIO_MESSAGING_SID (Messaging Service)
 * Verify: REDACTED_TWILIO_VERIFY_SID (Verify Service — OTP only)
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Credentials ────────────────────────────────────────────────────
const ACCT     = Deno.env.get("TWILIO_ACCOUNT_SID")           || "REDACTED_TWILIO_ACCOUNT_SID";
const AUTH     = Deno.env.get("TWILIO_AUTH_TOKEN")            || "REDACTED_TWILIO_AUTH_TOKEN";
const FROM_SMS = Deno.env.get("TWILIO_PHONE_NUMBER")          || "+16812972643";
const FROM_WA  = "+14155238886";
const MG_SID   = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || "REDACTED_TWILIO_MESSAGING_SID"; // SMS Messaging Service
const WA_CODE  = "join bad-machine";
const HOSPITAL = "EL5 MediProcure";

// ── E.164 normaliser ───────────────────────────────────────────────
function e164(raw: string): string {
  const n = String(raw || "").replace(/[\s\-\(\)\.]/g, "");
  if (!n || n.length < 7) return "";
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// ── Core Twilio send ───────────────────────────────────────────────
async function twilioSend(
  to: string, body: string, channel: "sms" | "whatsapp" = "sms"
): Promise<{ ok: boolean; sid?: string; status?: string; error?: string; provider: string }> {
  if (!AUTH) return { ok: false, error: "TWILIO_AUTH_TOKEN not set", provider: "twilio" };

  const params: Record<string, string> = { Body: body };

  if (channel === "whatsapp") {
    params.From = `whatsapp:${FROM_WA}`;
    params.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    // Use Messaging Service SID (MGd547...) — correct for SMS bulk sending
    params.MessagingServiceSid = MG_SID;
    params.To = to;
  }

  try {
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${ACCT}:${AUTH}`),
          "Content-Type":  "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      }
    );
    const d = await resp.json();
    if (!resp.ok) {
      console.error(`Twilio error to ${to}: ${d.code} — ${d.message}`);
      return { ok: false, error: `${d.code}: ${d.message}`, provider: "twilio" };
    }
    console.log(`SMS sent to ${to} SID:${d.sid}`);
    return { ok: true, sid: d.sid, status: d.status, provider: "twilio" };
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "twilio" };
  }
}

// ── Africa's Talking fallback ──────────────────────────────────────
async function atSend(to: string, body: string): Promise<{ ok: boolean; error?: string; provider: string }> {
  const key  = Deno.env.get("AT_API_KEY") || "";
  const user = Deno.env.get("AT_USERNAME") || "";
  if (!key || !user) return { ok: false, error: "AT not configured", provider: "africas_talking" };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { "apiKey": key, "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json" },
      body: new URLSearchParams({ username: user, to, message: body }).toString(),
    });
    const d = await r.json();
    const m = d?.SMSMessageData?.Recipients?.[0];
    return { ok: m?.statusCode === 101, error: m?.status, provider: "africas_talking" };
  } catch (e: any) { return { ok: false, error: e.message, provider: "africas_talking" }; }
}

// ── Log (non-blocking) ─────────────────────────────────────────────
async function logMsg(to: string, body: string, res: any, meta: any, ch: string) {
  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone: to, recipient_name: meta.name || null,
      message_body: body, message_type: ch, direction: "outbound",
      department: meta.dept || null,
      status: res.ok ? "sent" : "failed",
      twilio_sid: res.sid || null, error_code: res.error || null,
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_log").insert({
      to_number: to, from_number: FROM_SMS, message: body,
      status: res.ok ? "sent" : "failed",
      twilio_sid: res.sid || null,
      module: meta.module || "system", error_msg: res.error || null,
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number: to, contact_name: meta.name || null,
      last_message: body.slice(0, 100),
      last_message_at: new Date().toISOString(), status: "open",
    }, { onConflict: "phone_number" }),
  ]);
}

// ── Inbound webhook ────────────────────────────────────────────────
async function inbound(p: URLSearchParams): Promise<string> {
  const from  = p.get("From") || "";
  const body  = p.get("Body") || "";
  const sid   = p.get("MessageSid") || "";
  const ch    = from.startsWith("whatsapp:") ? "whatsapp" : "sms";
  const phone = from.replace("whatsapp:", "");
  const lower = body.toLowerCase().trim();

  await Promise.allSettled([
    sb.from("reception_messages").insert({
      recipient_phone: phone, message_body: body, message_type: ch,
      direction: "inbound", status: "received", twilio_sid: sid,
      sent_at: new Date().toISOString(),
    }),
    sb.from("sms_conversations").upsert({
      phone_number: phone, last_message: body.slice(0, 100),
      last_message_at: new Date().toISOString(), status: "open", unread_count: 1,
    }, { onConflict: "phone_number" }),
  ]);

  let reply = "";
  if (lower === "help" || lower === "menu") {
    reply = `EL5 MediProcure:\n• STATUS REQ-ID\n• STOP — unsubscribe\n• START — re-subscribe`;
  } else if (lower === "stop") {
    reply = "Unsubscribed from EL5 alerts.";
    await sb.from("sms_conversations").update({ status: "closed" }).eq("phone_number", phone);
  } else if (lower === "start") {
    reply = "Welcome to EL5 MediProcure notifications!";
  } else {
    reply = `Received at EL5 Hospital. We'll respond shortly. Reply HELP for options.`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Response>${reply ? `<Message>${reply}</Message>` : ""}</Response>`;
}

// ── WhatsApp renewal ───────────────────────────────────────────────
async function renew(): Promise<{ renewed: number; checked: number }> {
  const { data } = await sb.from("sms_conversations").select("phone_number,last_message_at").not("phone_number", "is", null);
  let renewed = 0;
  for (const c of (data || [])) {
    const h = (Date.now() - new Date(c.last_message_at || 0).getTime()) / 3600000;
    if (h > 22 && h < 72) {
      await twilioSend(c.phone_number, `[EL5 MediProcure] Notifications active. Reply HELP.`, "whatsapp");
      renewed++;
      await new Promise(r => setTimeout(r, 700));
    }
  }
  return { renewed, checked: (data || []).length };
}

// ── MAIN ──────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    return new Response(JSON.stringify({
      ok: true, version: "10.0",
      acct: ACCT.slice(0, 10) + "...",
      auth_set: !!AUTH,
      sms_from: FROM_SMS, wa_from: FROM_WA,
      mg_sid: MG_SID.slice(0, 10) + "...", wa_join: WA_CODE,
      note: "MGd547 = Messaging Service for SMS. VA692606 = Verify Service for OTP.",
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  if (req.method === "POST" && url.searchParams.get("webhook") === "inbound") {
    const fd = await req.formData();
    const p = new URLSearchParams(); fd.forEach((v, k) => p.set(k, v.toString()));
    return new Response(await inbound(p), { headers: { ...CORS, "Content-Type": "text/xml" } });
  }

  if (req.method === "POST" && url.searchParams.get("action") === "renew") {
    const r = await renew();
    return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const b   = await req.json();
    const { to, message, channel = "sms", module: mod, sent_by, recipient_name: name, department: dept } = b;

    if (!to || !message) return new Response(
      JSON.stringify({ ok: false, error: "to and message required" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );

    const fullMsg = `[${HOSPITAL}] ${message}`.slice(0, 1600);
    const nums = (Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim()))
      .filter(Boolean).map(e164).filter(n => n.length > 7);

    if (!nums.length) return new Response(
      JSON.stringify({ ok: false, error: "No valid phone numbers" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );

    const results: any[] = [];
    for (const num of nums) {
      let res: any;
      if (channel === "whatsapp") {
        res = await twilioSend(num, fullMsg, "whatsapp");
        if (!res.ok) {
          const sms = await twilioSend(num, `${fullMsg}\n[WhatsApp: send "${WA_CODE}" to ${FROM_WA}]`, "sms");
          res = { ...sms, provider: sms.ok ? "sms_fallback" : "failed" };
        }
      } else {
        res = await twilioSend(num, fullMsg, "sms");
        if (!res.ok) { res = await atSend(num, fullMsg); }
      }
      await logMsg(num, fullMsg, res, { name, dept, module: mod, sent_by }, channel);
      results.push({ to: num, ok: res.ok, sid: res.sid, provider: res.provider, error: res.error });
    }

    const sent = results.filter(r => r.ok).length;
    return new Response(JSON.stringify({
      ok: sent > 0, sent, failed: results.length - sent, total: results.length,
      mg_sid: MG_SID, sms_from: FROM_SMS, wa_from: FROM_WA, wa_join: WA_CODE, results,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
