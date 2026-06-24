/**
 * EL5 MediProcure — send-sms v15.0 KENYA-OPTIMIZED
 * Primary SMS: Africa's Talking (Kenya's #1 SMS gateway - https://africastalking.com)
 * Fallback SMS: Twilio (paid or verified numbers)
 * WhatsApp: Twilio WhatsApp Sandbox (whatsapp:+14155238886)
 * Voice Calls: Twilio with TTS (Alice en-GB voice)
 * 
 * Configuration Required in Supabase Edge Functions → Secrets:
 * - AT_API_KEY: Your Africa's Talking API key
 * - AT_USERNAME: Your Africa's Talking username (usually "sandbox" for dev)
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * - TWILIO_FROM_NUMBER: Your Twilio SMS number (+16812972643)
 * - TWILIO_WHATSAPP_FROM: whatsapp:+14155238886 (Twilio sandbox)
 * 
 * EL5 MediProcure · Embu Level 5 Hospital · Kenya
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-action",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const HOSP = "EL5 MediProcure";
const WA_JOIN = "join bad-machine";

// Lazy Supabase client init
let _sb: ReturnType<typeof createClient> | null = null;
function getSb() {
  if (_sb) return _sb;
  try {
    _sb = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    return _sb;
  } catch (e) { console.error("[send-sms] Supabase init failed:", e); throw e; }
}
const sb = new Proxy({} as ReturnType<typeof createClient>, { get(_t, prop) { return (getSb() as any)[prop]; } });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// Credentials loader
interface Creds {
  AT_KEY: string; AT_USER: string;
  TW_SID: string; TW_AUTH: string; TW_FROM: string; TW_WA: string;
}
async function loadCreds(): Promise<Creds> {
  const defaults = {
    AT_API_KEY: "", AT_USERNAME: "",
    TWILIO_ACCOUNT_SID: "", TWILIO_AUTH_TOKEN: "",
    TWILIO_FROM_NUMBER: "+16812972643", TWILIO_WHATSAPP_FROM: "whatsapp:+14155238886",
  };
  
  let env: Record<string, string> = {};
  for (const k of Object.keys(defaults)) {
    env[k] = Deno.env.get(k) || defaults[k as keyof typeof defaults] || "";
  }
  
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    try {
      const { data: rows } = await sb.from("system_settings").select("key,value")
        .in("key", ["at_api_key","at_username","twilio_account_sid","twilio_auth_token","twilio_from_number","twilio_whatsapp_from"]);
      for (const r of rows ?? []) if (r.key && r.value) env[r.key.toUpperCase().replace(/-/g, "_")] = r.value;
    } catch (e) { console.warn("[creds] DB fallback failed:", e); }
  }

  if (env.TWILIO_FROM_NUMBER === "+18777804236") env.TWILIO_FROM_NUMBER = "+16812972643";
  if (!env.TWILIO_WHATSAPP_FROM || env.TWILIO_WHATSAPP_FROM === "+18777804236") env.TWILIO_WHATSAPP_FROM = "whatsapp:+14155238886";

  return {
    AT_KEY: env.AT_API_KEY, AT_USER: env.AT_USERNAME,
    TW_SID: env.TWILIO_ACCOUNT_SID, TW_AUTH: env.TWILIO_AUTH_TOKEN,
    TW_FROM: env.TWILIO_FROM_NUMBER, TW_WA: env.TWILIO_WHATSAPP_FROM,
  };
}

// Africa's Talking SMS (Kenya #1 Provider)
async function sendViaAfricaTalking(to: string, body: string, apiKey: string, username: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!apiKey || !username) return { ok: false, error: "Africa's Talking not configured. Set AT_API_KEY and AT_USERNAME in Supabase secrets." };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: { apiKey, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ username, to, message: body }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    const m = d?.SMSMessageData?.Recipients?.[0];
    if (!r.ok || m?.statusCode !== 101) {
      return { ok: false, error: m?.status || d.errorDescription || "Africa's Talking failed" };
    }
    return { ok: true, sid: m.messageId || `AT-${Date.now()}` };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// Twilio SMS
async function sendViaTwilio(to: string, body: string, creds: Creds): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!creds.TW_SID || !creds.TW_AUTH) return { ok: false, error: "Twilio not configured" };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.TW_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${creds.TW_SID}:${creds.TW_AUTH}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: creds.TW_FROM, Body: body }).toString(),
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = d.message || d.Message || JSON.stringify(d);
      if (d.code === 21608 || d.code === 21606) return { ok: false, error: `TRIAL_LIMIT: ${msg}`, trial: true };
      return { ok: false, error: `[${d.code}] ${msg}` };
    }
    return { ok: true, sid: d.sid };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// Twilio WhatsApp
async function sendViaWhatsApp(to: string, body: string, creds: Creds): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!creds.TW_SID || !creds.TW_AUTH) return { ok: false, error: "Twilio not configured" };
  try {
    const waFrom = creds.TW_WA.startsWith("whatsapp:") ? creds.TW_WA : `whatsapp:${creds.TW_WA}`;
    const waTo = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.TW_SID}/Messages.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${creds.TW_SID}:${creds.TW_AUTH}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: waTo, From: waFrom, Body: body }).toString(),
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: `[${d.code}] ${d.message}` };
    return { ok: true, sid: d.sid };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// Twilio Voice Call
async function makeTwilioCall(to: string, message: string, creds: Creds): Promise<{ ok: boolean; sid?: string; error?: string }> {
  if (!creds.TW_SID || !creds.TW_AUTH) return { ok: false, error: "Twilio not configured" };
  const safe = String(message).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] || c));
  const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${safe}</Say><Pause length="1"/><Say voice="alice" language="en-GB">Thank you. Goodbye.</Say></Response>`;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.TW_SID}/Calls.json`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa(`${creds.TW_SID}:${creds.TW_AUTH}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: creds.TW_FROM, Twiml }).toString(),
      signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!r.ok) return { ok: false, error: `[${d.code}] ${d.message}` };
    return { ok: true, sid: d.sid };
  } catch (e: any) { return { ok: false, error: e.message }; }
}

// Kenya E.164 phone formatter
function formatKenyanPhone(raw: string): string {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "").trim();
  if (n.length < 9) return "";
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("254")) return n.length === 12 ? "+" + n : "+254" + n.slice(-9);
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 9 && /^7\d/.test(n)) return "+254" + n;
  if (n.length === 9 && /^1\d/.test(n)) return "+254" + n;
  if (n.length === 8 && /^7\d/.test(n)) return "+254" + n;
  if (n.length >= 9) return "+254" + n.slice(-9);
  return "";
}
function isE164(num: string) { return /^\+[1-9]\d{1,14}$/.test(num); }

// Logging
async function logSms(to: string, body: string, res: any, meta: any, from: string, provider: string) {
  const entry = {
    to_number: to, from_number: from, message: body.slice(0, 500),
    status: res.ok ? "sent" : "failed", twilio_sid: res.sid || null,
    error_msg: res.error || null, provider,
    module: meta?.module || "system", sent_at: new Date().toISOString(),
    recipient_name: meta?.name || null,
  };
  await Promise.allSettled([
    sb.from("sms_log").insert(entry).catch(() => {}),
    sb.from("reception_messages").insert({
      recipient_phone: to, message_body: body, message_type: "sms",
      direction: "outbound", status: res.ok ? "sent" : "failed",
      sent_at: new Date().toISOString(),
    }).catch(() => {}),
  ]);
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "";
    const b = await req.json().catch(() => ({}));
    const { to, message, channel = "sms", module: mod, name, dept } = b;
    const creds = await loadCreds();

    // STATUS
    if (action === "status") {
      return json({
        ok: true, version: "15.0", hospital: HOSP,
        providers: {
          africa_talking: { configured: !!(creds.AT_KEY && creds.AT_USER), username: creds.AT_USER },
          twilio: { configured: !!(creds.TW_SID && creds.TW_AUTH), from: creds.TW_FROM },
          whatsapp: { from: creds.TW_WA, join_code: WA_JOIN },
        },
        twilio_account_set: !!creds.TW_SID,
        twilio_auth_set: !!creds.TW_AUTH,
        sms_from: creds.TW_FROM,
        wa_from: creds.TW_WA,
        kenya_note: "Primary SMS: Africa's Talking. Twilio used for WhatsApp and voice calls.",
      });
    }

    // VOICE CALL
    if (action === "call") {
      if (!creds.TW_SID || !creds.TW_AUTH) return json({ ok: false, error: "Twilio not configured" });
      const callTo = formatKenyanPhone(to || "");
      if (!callTo || !isE164(callTo)) return json({ ok: false, error: "Invalid Kenya phone number. Use +2547XX format." });
      const script = message || `Hello, this is ${HOSP} at Embu Level 5 Hospital. Please contact the Procurement office at your earliest convenience. Thank you.`;
      const res = await makeTwilioCall(callTo, script, creds);
      await logSms(callTo, `[VOICE CALL] ${script.slice(0, 200)}`, res, { module: mod }, creds.TW_FROM, "twilio_voice");
      return json({ ...res, to: callTo, from: creds.TW_FROM });
    }

    // FETCH MESSAGES
    if (action === "fetch_messages") {
      if (!creds.TW_SID || !creds.TW_AUTH) return json({ ok: false, error: "Twilio not configured", messages: [] });
      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.TW_SID}/Messages.json?PageSize=50`, {
          headers: { Authorization: "Basic " + btoa(`${creds.TW_SID}:${creds.TW_AUTH}`) },
          signal: AbortSignal.timeout(15000),
        });
        const d = await r.json();
        if (!r.ok) return json({ ok: false, error: d.message, messages: [] });
        const messages = (d.messages || []).map((m: any) => ({
          sid: m.sid, from: m.from, to: m.to, body: m.body, status: m.status,
          direction: m.direction, date_created: m.date_created,
        }));
        return json({ ok: true, total: messages.length, messages });
      } catch (e: any) { return json({ ok: false, error: e.message, messages: [] }); }
    }

    // TEMPLATES
    if (action === "templates") {
      const { data: tmpl } = await sb.from("sms_templates").select("*").eq("is_active", true).order("category");
      return json({ ok: true, templates: tmpl || [] });
    }

    // SEND SMS/WHATSAPP
    if (!to || !message) return json({ ok: false, error: "to and message required" }, 400);

    const fullMsg = `[${HOSP}] ${message}`.slice(0, 1600);
    const rawNums = Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim());
    const formattedNums = rawNums.map(formatKenyanPhone).filter(n => n && isE164(n));

    if (!formattedNums.length) {
      return json({ ok: false, error: "No valid E.164 numbers. Use +2547XX format.", tried: rawNums }, 400);
    }

    const results: any[] = [];
    for (const num of formattedNums) {
      let res: any;
      let provider = "none";

      if (channel === "whatsapp") {
        res = await sendViaWhatsApp(num, fullMsg, creds);
        provider = "twilio_wa";
        if (!res.ok) {
          const fallback = await sendViaTwilio(num, fullMsg + `\n[WhatsApp: send "${WA_JOIN}" to +14155238886]`, creds);
          if (fallback.ok) { res = fallback; provider = "sms_fallback"; }
        }
      } else {
        // PRIMARY: Africa's Talking (works for all Kenya numbers)
        if (creds.AT_KEY && creds.AT_USER) {
          res = await sendViaAfricaTalking(num, fullMsg, creds.AT_KEY, creds.AT_USER);
          provider = "africas_talking";
        }
        // FALLBACK: Twilio
        if (!res?.ok && creds.TW_SID && creds.TW_AUTH) {
          const tw = await sendViaTwilio(num, fullMsg, creds);
          if (tw.ok) { res = tw; provider = "twilio_sms"; }
          else if (tw.trial) {
            res = { ok: false, error: tw.error + ". Use Africa's Talking for Kenya SMS.", trial: true };
          } else { res = tw; }
        }
        if (!res) res = { ok: false, error: "No SMS provider configured" };
      }

      await logSms(num, fullMsg, res, { module: mod, name, dept }, creds.TW_FROM, provider);
      results.push({ to: num, ok: res.ok, sid: res.sid, provider, error: res.error });
      await new Promise(r => setTimeout(r, 300));
    }

    const sent = results.filter(r => r.ok).length;
    return json({
      ok: sent > 0, sent, failed: results.length - sent, total: results.length,
      formatted_numbers: formattedNums,
      sms_from: creds.TW_FROM,
      wa_from: creds.TW_WA,
      wa_join: WA_JOIN,
      kenya_providers: { africa_talking: !!(creds.AT_KEY && creds.AT_USER), twilio: !!(creds.TW_SID && creds.TW_AUTH) },
      results,
    });

  } catch (e: any) {
    console.error("[send-sms v15] Fatal:", e);
    return json({ ok: false, error: e.message || "Internal server error" }, 500);
  }
});
