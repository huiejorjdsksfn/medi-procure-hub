/**
 * EL5 MediProcure — send-sms v14.1
 * v14.1: Anti-replay guard — rejects requests carrying a nonce that was
 * already seen (x-el5-nonce / x-el5-ts headers). Absent headers = older
 * caller, still allowed through for backward compatibility.
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,x-client-info,apikey,content-type,x-action,x-el5-nonce,x-el5-ts",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

const REPLAY_SKEW_MS = 5 * 60 * 1000;
async function checkReplay(req: Request): Promise<{ ok: boolean; error?: string }> {
  const nonce = req.headers.get("x-el5-nonce");
  const ts = req.headers.get("x-el5-ts");
  if (!nonce || !ts) return { ok: true };
  const tsNum = parseInt(ts, 10);
  if (!tsNum || Math.abs(Date.now() - tsNum) > REPLAY_SKEW_MS) return { ok: false, error: "Request timestamp expired or invalid" };
  const { error } = await sb.from("security_nonces").insert({ nonce });
  if (error) return { ok: false, error: "Duplicate request (replay detected)" };
  return { ok: true };
}

async function loadCreds() {
  let ACCT    = Deno.env.get("TWILIO_ACCOUNT_SID")          || "";
  let AUTH    = Deno.env.get("TWILIO_AUTH_TOKEN")           || "";
  let FROM    = Deno.env.get("TWILIO_FROM_NUMBER")          || Deno.env.get("TWILIO_PHONE_NUMBER") || "";
  let MSID    = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")|| "";
  let FROM_WA = Deno.env.get("TWILIO_WHATSAPP_FROM")        || "";
  let AT_KEY  = Deno.env.get("AT_API_KEY")                  || "";
  let AT_USER = Deno.env.get("AT_USERNAME")                 || "";
  if (!ACCT || !AUTH) {
    try {
      const { data: rows } = await sb.from("system_settings").select("key,value")
        .in("key", ["twilio_account_sid","twilio_auth_token","twilio_from_number","twilio_messaging_service_sid","twilio_whatsapp_from","at_api_key","at_username"]);
      const cfg: Record<string,string> = {};
      for (const r of rows ?? []) cfg[r.key] = r.value;
      if (!ACCT) ACCT = cfg["twilio_account_sid"] || "";
      if (!AUTH) AUTH = cfg["twilio_auth_token"] || "";
      if (!FROM) FROM = cfg["twilio_from_number"] || "";
      if (!MSID) MSID = cfg["twilio_messaging_service_sid"] || "";
      if (!FROM_WA) FROM_WA = cfg["twilio_whatsapp_from"] || "";
      if (!AT_KEY) AT_KEY = cfg["at_api_key"] || "";
      if (!AT_USER) AT_USER = cfg["at_username"] || "";
    } catch (e) { console.warn("[creds] fallback failed:", e); }
  }
  if (!FROM_WA) FROM_WA = "whatsapp:+14155238886";
  if (!FROM) FROM = "+16812972643";
  if (FROM === "+18777804236") FROM = "+16812972643";
  return { ACCT, AUTH, FROM, MSID, FROM_WA, AT_KEY, AT_USER };
}

function twilioBase(creds: Awaited<ReturnType<typeof loadCreds>>) {
  return { url: `https://api.twilio.com/2010-04-01/Accounts/${creds.ACCT}`, auth: "Basic " + btoa(`${creds.ACCT}:${creds.AUTH}`) };
}

function formatKenyanPhone(raw: string): string {
  if (!raw) return "";
  let n = String(raw).replace(/[^\d+]/g, "").trim();
  if (n.length < 9) return "";
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("254")) {
    if (n.length === 12) return "+" + n;
    if (n.length > 12) n = n.slice(0, 12);
    if (n.length < 12) n = "254" + n.slice(3).padStart(9, "0").slice(0, 9);
    return "+" + n;
  }
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 9 && (n[0] === "7" || n[0] === "1")) return "+254" + n;
  if (n.length === 8 && (n[0] === "7" || n[0] === "1")) return "+254" + "7" + n;
  if (n.length >= 10) return "+" + n;
  if (n.length >= 9) return "+254" + n.slice(-9);
  return "";
}
function isE164(num: string) { return /^\+[1-9]\d{1,14}$/.test(num); }

async function twilioSend(to: string, body: string, ch: "sms" | "whatsapp", creds: Awaited<ReturnType<typeof loadCreds>>) {
  const { ACCT, AUTH, MSID, FROM_WA, FROM } = creds;
  if (!ACCT || !AUTH) return { ok: false, error: "Twilio credentials not configured", provider: "twilio" };
  const p: Record<string,string> = { Body: body };
  if (ch === "whatsapp") {
    p.From = FROM_WA.startsWith("whatsapp:") ? FROM_WA : `whatsapp:${FROM_WA}`;
    p.To = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  } else {
    if (MSID) p.MessagingServiceSid = MSID; else p.From = FROM;
    p.To = to;
  }
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`, {
      method: "POST", headers: { Authorization: "Basic " + btoa(`${ACCT}:${AUTH}`), "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(p).toString(), signal: AbortSignal.timeout(20000),
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = d.message || d.Message || JSON.stringify(d);
      if (d.code === 21606 || d.code === 21612 || msg.includes("not verified")) return { ok: false, error: `TRIAL_LIMIT: ${msg}. Upgrade account or verify recipient.`, provider: "twilio_trial" };
      return { ok: false, error: `[${d.code}] ${msg}`, provider: "twilio" };
    }
    return { ok: true, sid: d.sid, provider: ch === "whatsapp" ? "twilio_wa" : "twilio_sms" };
  } catch (e: any) { return { ok: false, error: `Network error: ${e.message}`, provider: "twilio" }; }
}

async function atSend(to: string, body: string, creds: Awaited<ReturnType<typeof loadCreds>>) {
  const { AT_KEY, AT_USER } = creds;
  if (!AT_KEY || !AT_USER) return { ok: false, error: "Africa's Talking not configured", provider: "africas_talking" };
  try {
    const r = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST", headers: { apiKey: AT_KEY, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ username: AT_USER, to, message: body }).toString(), signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    const m = d?.SMSMessageData?.Recipients?.[0];
    return { ok: m?.statusCode === 101, error: m?.status, provider: "africas_talking" };
  } catch (e: any) { return { ok: false, error: e.message, provider: "africas_talking" }; }
}

async function logSms(to: string, body: string, res: any, meta: any, ch: string, from: string) {
  const entry = {
    to_number: to, from_number: from, message: body.slice(0, 500), status: res.ok ? "sent" : "failed",
    twilio_sid: res.sid || null, error_msg: res.error || null, provider: res.provider || "twilio",
    module: meta.module || "system", sent_at: new Date().toISOString(), recipient_name: meta.name || null, department: meta.dept || null,
  };
  await Promise.allSettled([
    sb.from("sms_log").insert(entry),
    sb.from("reception_messages").insert({ recipient_phone: to, message_body: body, message_type: ch, direction: "outbound", status: res.ok ? "sent" : "failed", sent_at: new Date().toISOString() }),
    sb.from("sms_conversations").upsert({ phone_number: to, last_message: body.slice(0, 100), last_message_at: new Date().toISOString(), status: "open" }, { onConflict: "phone_number" }),
  ]);
}

const HOSP = "EL5 MediProcure";
const WA_JOIN = "join bad-machine";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "POST") {
    const replay = await checkReplay(req);
    if (!replay.ok) return json({ ok: false, error: replay.error }, 409);
  }
  const creds = await loadCreds();
  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("action") === "status") {
    return json({ ok: !!creds.ACCT && !!creds.AUTH, version: "14.1", acct_set: !!creds.ACCT, auth_set: !!creds.AUTH, sms_from: creds.FROM, wa_from: creds.FROM_WA, mg_sid: creds.MSID });
  }
  try {
    const b = await req.json().catch(() => ({}));
    const { action, to, message, channel = "sms", module: mod, recipient_name: name, department: dept } = b;

    if (action === "status") {
      if (!creds.ACCT || !creds.AUTH) {
        return json({ ok: false, account_status: "credentials_missing", friendly_name: null, phone_numbers: [], sms_number: null, wa_number: null, msg_svc_sid: null, templates_available: 0, api_sid: null, region: "us1", acct_set: false, auth_set: false, error: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set in Supabase secrets", hint: "Go to Supabase dashboard → Project Settings → Edge Functions → Secrets" });
      }
      let acctData: any = {}; let phoneNumbers: any[] = [];
      try {
        const { url: base, auth } = twilioBase(creds);
        const [acctRes, numsRes] = await Promise.allSettled([
          fetch(`${base}.json`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(10000) }).then(r => r.json()),
          fetch(`${base}/IncomingPhoneNumbers.json?PageSize=10`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(10000) }).then(r => r.json()),
        ]);
        if (acctRes.status === "fulfilled") acctData = acctRes.value;
        if (numsRes.status === "fulfilled") phoneNumbers = (numsRes.value.incoming_phone_numbers || []).map((p: any) => ({ number: p.phone_number, friendly: p.friendly_name, sid: p.sid, sms: p.capabilities?.sms, voice: p.capabilities?.voice }));
      } catch (e) { console.warn("[status] Twilio fetch error:", e); }
      const { count: tmplCount } = await sb.from("sms_templates").select("*", { count: "exact", head: true }).eq("is_active", true);
      const isOk = acctData.status === "active" || acctData.status === "suspended";
      return json({ ok: isOk, version: "14.1", account_status: acctData.status || (isOk ? "active" : "unverified"), friendly_name: acctData.friendly_name || "EL5 MediProcure", phone_numbers: phoneNumbers, sms_number: creds.FROM, wa_number: "whatsapp:" + (creds.FROM_WA.replace("whatsapp:", "")), msg_svc_sid: creds.MSID || null, templates_available: (tmplCount || 0) + 19, api_sid: creds.ACCT.slice(0, 8) + "…", region: "us1", acct_set: !!creds.ACCT, auth_set: !!creds.AUTH, twilio_error: acctData.code ? `[${acctData.code}] ${acctData.message}` : null, wa_join: WA_JOIN, at_set: !!creds.AT_KEY });
    }

    if (action === "fetch_messages") {
      if (!creds.ACCT || !creds.AUTH) return json({ ok: false, error: "Credentials not set", messages: [] });
      try {
        const { url: base, auth } = twilioBase(creds);
        const r = await fetch(`${base}/Messages.json?PageSize=${b.limit || 50}`, { headers: { Authorization: auth }, signal: AbortSignal.timeout(15000) });
        const d = await r.json();
        if (!r.ok) return json({ ok: false, error: `[${d.code}] ${d.message}`, messages: [] });
        const messages = (d.messages || []).map((m: any) => ({ sid: m.sid, from: m.from, to: m.to, body: m.body, status: m.status, direction: m.direction, date_created: m.date_created, date_sent: m.date_sent, price: m.price, price_unit: m.price_unit }));
        return json({ ok: true, total: messages.length, messages });
      } catch (e: any) { return json({ ok: false, error: e.message, messages: [] }); }
    }

    if (action === "call") {
      if (!creds.ACCT || !creds.AUTH) return json({ ok: false, error: "Credentials not set" });
      const callTo = formatKenyanPhone(to || "");
      if (!callTo || !isE164(callTo)) return json({ ok: false, error: "Invalid phone number for call" });
      const script = message || "Hello, this is Embu Level 5 Hospital. Please contact the Procurement office at your earliest convenience. Thank you.";
      const safe = script.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&/g, "&amp;");
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${safe}</Say><Pause length="1"/><Say voice="alice" language="en-GB">${safe}</Say></Response>`;
      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.ACCT}/Calls.json`, { method: "POST", headers: { Authorization: "Basic " + btoa(`${creds.ACCT}:${creds.AUTH}`), "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: callTo, From: creds.FROM, Twiml: twiml }).toString(), signal: AbortSignal.timeout(20000) });
        const d = await r.json();
        if (!r.ok) return json({ ok: false, error: `[${d.code}] ${d.message}`, to: callTo });
        await sb.from("sms_log").insert({ to_number: callTo, from_number: creds.FROM, message: `[VOICE CALL] ${script.slice(0, 200)}`, status: "sent", twilio_sid: d.sid, provider: "twilio_voice", module: mod || "system", sent_at: new Date().toISOString() });
        return json({ ok: true, sid: d.sid, status: d.status, to: callTo });
      } catch (e: any) { return json({ ok: false, error: e.message, to: callTo }); }
    }

    if (action === "templates") {
      const { data: tmpl } = await sb.from("sms_templates").select("*").eq("is_active", true).order("category");
      return json({ ok: true, templates: tmpl || [] });
    }

    if (action === "save_template") {
      const { name: tName, content, category, vars } = b;
      if (!tName || !content) return json({ ok: false, error: "name and content required" }, 400);
      const { data, error } = await sb.from("sms_templates").insert({ name: tName, content, category: category || "custom", variables: vars || [], is_active: true }).select().single();
      if (error) return json({ ok: false, error: error.message }, 500);
      return json({ ok: true, template: data });
    }

    if (!to || !message) return json({ ok: false, error: "to and message required — or provide an action" }, 400);
    const fullMsg = `[${HOSP}] ${message}`.slice(0, 1600);
    const rawNums = Array.isArray(to) ? to : String(to).split(",").map((s: string) => s.trim());
    const formattedNums = rawNums.map(formatKenyanPhone).filter(n => n && isE164(n));
    if (!formattedNums.length) return json({ ok: false, error: "No valid E.164 numbers. Use +2547XX or 07XX format.", tried: rawNums }, 400);
    const results: any[] = [];
    for (const num of formattedNums) {
      let res: any;
      if (channel === "whatsapp") {
        res = await twilioSend(num, fullMsg, "whatsapp", creds);
        if (!res.ok) {
          const fallbackMsg = `${fullMsg}\n[WhatsApp: send "${WA_JOIN}" to +14155238886]`;
          res = await twilioSend(num, fallbackMsg, "sms", creds);
          if (res.ok) res.provider = "sms_fallback";
        }
      } else {
        res = await twilioSend(num, fullMsg, "sms", creds);
        if (!res.ok && creds.AT_KEY) res = await atSend(num, fullMsg, creds);
      }
      await logSms(num, fullMsg, res, { name, dept, module: mod }, channel, creds.FROM);
      results.push({ to: num, ok: res.ok, sid: res.sid, provider: res.provider, error: res.error });
    }
    const sent = results.filter(r => r.ok).length;
    return json({ ok: sent > 0, sent, failed: results.length - sent, total: results.length, formatted_numbers: formattedNums, sms_from: creds.FROM, wa_join: WA_JOIN, results });
  } catch (e: any) {
    console.error("[send-sms v14.1] Fatal:", e);
    return json({ ok: false, error: e.message || "Internal server error" }, 500);
  }
});
