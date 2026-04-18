/**
 * ProcurBosse — send-sms Edge Function v11.0 (FULLY RECONFIGURED & FIXED)
 * ✅ Twilio SMS + WhatsApp + Africa's Talking fallback
 * ✅ DB-driven credentials with triple fallback chain
 * ✅ Correct E.164 normalisation (Kenya focus)
 * ✅ Full CORS, logging, inbound webhook, session renewal
 * Account: ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a · From: +16812972643
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Hardcoded fallback credentials (always available) ──────────────
const DEFAULTS = {
  ACCT:     "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a",
  AUTH:     "d73601fbefe26e01b06e22c53a798ea6",
  FROM_SMS: "+16812972643",
  FROM_WA:  "+14155238886",
  MSID:     "MGd547d8e3273fda2d21afdd6856acb245",
};

// ── Load credentials: DB → env → hardcoded ────────────────────────
async function loadCreds(): Promise<typeof DEFAULTS> {
  try {
    const { data } = await sb.from("twilio_config")
      .select("account_sid,auth_token,phone_number,wa_number,messaging_sid")
      .eq("env", "production")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.account_sid && data?.auth_token) {
      console.log("[Twilio] Using DB credentials");
      return {
        ACCT:     data.account_sid,
        AUTH:     data.auth_token,
        FROM_SMS: data.phone_number || DEFAULTS.FROM_SMS,
        FROM_WA:  data.wa_number    || DEFAULTS.FROM_WA,
        MSID:     data.messaging_sid || DEFAULTS.MSID,
      };
    }
  } catch (e) { console.warn("[Twilio] DB creds failed:", e); }
  const envAcct = Deno.env.get("TWILIO_ACCOUNT_SID");
  const envAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (envAcct && envAuth) {
    console.log("[Twilio] Using env credentials");
    return {
      ACCT:     envAcct,
      AUTH:     envAuth,
      FROM_SMS: Deno.env.get("TWILIO_PHONE_NUMBER")          || DEFAULTS.FROM_SMS,
      FROM_WA:  Deno.env.get("TWILIO_WA_NUMBER")             || DEFAULTS.FROM_WA,
      MSID:     Deno.env.get("TWILIO_MESSAGING_SERVICE_SID") || DEFAULTS.MSID,
    };
  }
  console.log("[Twilio] Using hardcoded fallback credentials");
  return DEFAULTS;
}

const HOSPITAL = "EL5 MediProcure";
const WA_CODE  = "join bad-machine";

// ── E.164 normaliser (Kenya focus) ────────────────────────────────
function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+"))                            return n;
  if (n.startsWith("07") || n.startsWith("01"))     return "+254" + n.slice(1);
  if (n.startsWith("254"))                          return "+" + n;
  if (n.length === 9 && /^\d+$/.test(n))           return "+254" + n;
  return "+" + n;
}

// ── Twilio API call ────────────────────────────────────────────────
async function twilioSend(
  to: string, body: string, channel: "sms" | "whatsapp",
  creds: typeof DEFAULTS
): Promise<{ ok: boolean; sid?: string; status?: string; error?: string; provider: string }> {
  const params: Record<string, string> = { Body: body };

  if (channel === "whatsapp") {
    params.From = `whatsapp:${creds.FROM_WA}`;
    params.To   = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    params.To   = to;
    // Use Messaging Service SID for better deliverability
    if (creds.MSID) {
      params.MessagingServiceSid = creds.MSID;
    } else {
      params.From = creds.FROM_SMS;
    }
  }

  const authHeader = "Basic " + btoa(`${creds.ACCT}:${creds.AUTH}`);
  const endpoint   = `https://api.twilio.com/2010-04-01/Accounts/${creds.ACCT}/Messages.json`;

  try {
    const resp = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type":  "application/x-www-form-urlencoded",
        "User-Agent":    "ProcurBosse/7.0 EL5MediProcure/Deno",
      },
      body: new URLSearchParams(params).toString(),
    });

    let data: any = {};
    try { data = await resp.json(); } catch { data = { message: "No JSON response" }; }

    if (!resp.ok) {
      const msg = data?.message || data?.more_info || `HTTP ${resp.status} ${resp.statusText}`;
      console.error(`[Twilio] ${channel} FAILED: ${msg} → to=${to} status=${resp.status}`);
      return { ok: false, error: msg, provider: channel === "whatsapp" ? "twilio_wa" : "twilio_sms" };
    }

    console.log(`[Twilio] ${channel} OK sid=${data.sid} to=${to} status=${data.status}`);
    return { ok: true, sid: data.sid, status: data.status, provider: channel === "whatsapp" ? "twilio_wa" : "twilio_sms" };
  } catch (e: any) {
    console.error(`[Twilio] Network error: ${e.message}`);
    return { ok: false, error: `Network: ${e.message}`, provider: "twilio_error" };
  }
}

// ── Africa's Talking fallback ──────────────────────────────────────
async function atFallback(to: string, body: string): Promise<{ ok: boolean; error?: string; provider: string }> {
  const apiKey   = Deno.env.get("AT_API_KEY")  || "";
  const username = Deno.env.get("AT_USERNAME") || "";
  if (!apiKey || !username) return { ok: false, error: "AT not configured", provider: "africas_talking" };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method:  "POST",
      headers: {
        "apiKey":       apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
      },
      body: new URLSearchParams({ username, to, message: body }).toString(),
    });
    const d = await r.json();
    const ok = r.ok && d?.SMSMessageData?.Recipients?.some((x: any) => x.statusCode === 101);
    console.log("[AT] fallback:", ok ? "OK" : "FAILED", JSON.stringify(d?.SMSMessageData));
    return { ok, provider: "africas_talking", error: ok ? undefined : JSON.stringify(d) };
  } catch (e: any) {
    return { ok: false, error: e.message, provider: "africas_talking" };
  }
}

// ── Log SMS to DB ──────────────────────────────────────────────────
async function logMsg(
  to: string, body: string, res: any,
  meta: { name?: string; dept?: string; module?: string; record_id?: string; sent_by?: string },
  channel: string, creds: typeof DEFAULTS
) {
  const ts = new Date().toISOString();
  await Promise.allSettled([
    sb.from("sms_log").insert({
      to_number:   to,
      from_number: channel === "whatsapp" ? creds.FROM_WA : creds.FROM_SMS,
      message:     body.slice(0, 500),
      status:      res.ok ? "sent" : "failed",
      twilio_sid:  res.sid,
      provider:    res.provider,
      module:      meta.module,
      record_id:   meta.record_id || null,
      sent_by:     meta.sent_by   || null,
      channel,
      error_msg:   res.error,
      sent_at:     ts,
    }),
    sb.from("sms_conversations").upsert({
      phone_number:    to,
      contact_name:    meta.name || null,
      last_message:    body.slice(0, 100),
      last_message_at: ts,
      status:          "open",
    }, { onConflict: "phone_number" }),
  ]);
}

// ── Inbound handler ────────────────────────────────────────────────
async function handleInbound(params: URLSearchParams): Promise<string> {
  const from  = params.get("From") || "";
  const body  = params.get("Body") || "";
  const sid   = params.get("MessageSid") || "";
  const phone = from.replace("whatsapp:", "");
  const lower = body.trim().toLowerCase();

  await Promise.allSettled([
    sb.from("sms_log").insert({ to_number: from, from_number: phone, message: body.slice(0, 500), status: "received", twilio_sid: sid, module: "inbound", sent_at: new Date().toISOString() }),
    sb.from("sms_conversations").upsert({ phone_number: phone, last_message: body.slice(0, 100), last_message_at: new Date().toISOString(), status: "open", unread_count: 1 }, { onConflict: "phone_number" }),
  ]);

  let reply = "";
  if (lower === "help" || lower === "menu") {
    reply = `EL5 MediProcure Menu:\n• STATUS REQ-ID\n• STOP — Unsubscribe\n• START — Re-subscribe\nHospital: +254 68 31055`;
  } else if (lower === "stop") {
    reply = "Unsubscribed from EL5 alerts. Reply START to re-subscribe.";
    await sb.from("sms_conversations").update({ status: "closed" }).eq("phone_number", phone);
  } else if (lower === "start") {
    reply = "Welcome back to EL5 MediProcure notifications!";
  } else if (lower.startsWith("status ")) {
    const id = body.trim().split(" ")[1];
    const { data: r } = await sb.from("requisitions").select("id,status,title").ilike("requisition_number", `%${id}%`).limit(1);
    reply = r?.[0] ? `REQ: ${r[0].title?.slice(0, 40) || id}\nStatus: ${r[0].status?.toUpperCase()}` : `Requisition "${id}" not found.`;
  } else {
    reply = `[EL5 MediProcure] Message received. We will respond shortly. Reply HELP for options.`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?><Response>${reply ? `<Message>${reply}</Message>` : ""}</Response>`;
}

// ── WhatsApp session renewal ───────────────────────────────────────
async function renewSessions(creds: typeof DEFAULTS): Promise<{ renewed: number; checked: number }> {
  const { data } = await sb.from("sms_conversations").select("phone_number,last_message_at").eq("status", "open").not("phone_number", "is", null).order("last_message_at", { ascending: false }).limit(100);
  let renewed = 0;
  for (const c of (data || [])) {
    const hoursAgo = (Date.now() - new Date(c.last_message_at || 0).getTime()) / 3600000;
    if (hoursAgo >= 22 && hoursAgo < 72) {
      await twilioSend(c.phone_number, `[${HOSPITAL}] Your EL5 MediProcure notifications are active. Reply HELP for options.`, "whatsapp", creds);
      renewed++;
      await new Promise(r => setTimeout(r, 800));
    }
  }
  return { renewed, checked: (data || []).length };
}

// ── MAIN ──────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = new URL(req.url);
  let body: any = {};

  if (req.method === "POST") {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try { body = await req.json(); } catch { body = {}; }
    } else if (ct.includes("form") || ct.includes("urlencoded")) {
      try {
        const text = await req.text();
        new URLSearchParams(text).forEach((v, k) => { body[k] = v; });
      } catch { body = {}; }
    }
  }

  const creds = await loadCreds();

  // ── Status check ──────────────────────────────────────────────
  if ((req.method === "GET" && url.searchParams.get("action") === "status") || body?.action === "status") {
    let twilioLive = false;
    let accountStatus = "unknown";
    try {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.ACCT}.json`, {
        headers: { "Authorization": "Basic " + btoa(`${creds.ACCT}:${creds.AUTH}`) },
        signal: AbortSignal.timeout(8000),
      });
      const d = await r.json();
      twilioLive    = r.ok && d.status === "active";
      accountStatus = d.status || `HTTP ${r.status}`;
      if (!r.ok) console.error("[Twilio] Status check failed:", d.message || d.code);
    } catch (e: any) { console.error("[Twilio] Status check error:", e.message); }

    return new Response(JSON.stringify({
      ok:              twilioLive,
      account_status:  accountStatus,
      account_sid:     creds.ACCT.slice(0, 10) + "...",
      auth_token_set:  !!creds.AUTH,
      twilio_live:     twilioLive,
      sms_from:        creds.FROM_SMS,
      wa_from:         creds.FROM_WA,
      msg_service_sid: creds.MSID,
      wa_join:         WA_CODE,
      hospital:        HOSPITAL,
      cred_source:     "db_or_env_or_fallback",
      timestamp:       new Date().toISOString(),
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // ── Inbound webhook ───────────────────────────────────────────
  if (req.method === "POST" && url.searchParams.get("webhook") === "inbound") {
    const p = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]));
    return new Response(await handleInbound(p), { headers: { ...CORS, "Content-Type": "text/xml" } });
  }

  // ── Session renewal ───────────────────────────────────────────
  if (body?.action === "renew_sessions") {
    const r = await renewSessions(creds);
    return new Response(JSON.stringify({ ok: true, ...r }), { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  // ── Outbound send ─────────────────────────────────────────────
  try {
    const { to, message, channel = "sms", module: mod, record_id, sent_by, recipient_name: name, department: dept } = body;
    if (!to || !message) {
      return new Response(JSON.stringify({ ok: false, error: "to and message are required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const prefix  = `[${HOSPITAL}] `;
    const fullMsg = (prefix + message).slice(0, 1600);
    const toList  = (Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim())).filter(Boolean);
    const numbers = toList.map(e164).filter(Boolean);
    const results: any[] = [];

    for (const num of numbers) {
      let res: any;
      if (channel === "whatsapp") {
        res = await twilioSend(num, fullMsg, "whatsapp", creds);
        if (!res.ok) {
          // Fallback: send WA join instructions via SMS
          const fallbackMsg = `${fullMsg}\n[Join WhatsApp: send "${WA_CODE}" to ${creds.FROM_WA}]`;
          res = await twilioSend(num, fallbackMsg, "sms", creds);
          res.provider = "sms_fallback_from_wa";
        }
      } else {
        res = await twilioSend(num, fullMsg, "sms", creds);
        if (!res.ok) res = await atFallback(num, fullMsg);
      }
      await logMsg(num, fullMsg, res, { name, dept, module: mod, record_id, sent_by }, channel, creds);
      results.push({ to: num, ok: res.ok, sid: res.sid, provider: res.provider, error: res.error });
      if (numbers.length > 1) await new Promise(r => setTimeout(r, 250));
    }

    const sent = results.filter(r => r.ok).length;
    return new Response(JSON.stringify({
      ok: sent > 0, sent, failed: results.length - sent, total: results.length,
      sms_number: creds.FROM_SMS, wa_number: creds.FROM_WA,
      msg_service_sid: creds.MSID, wa_join: WA_CODE, results,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[send-sms] Unhandled:", e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
