/**
 * EL5 MediProcure — make-call Edge Function v7.0 KENYA-OPTIMIZED
 * 
 * Voice calls via Twilio with TTS (Text-to-Speech)
 * Uses Alice voice (en-GB) for clear pronunciation
 * 
 * Configuration Required in Supabase Edge Functions → Secrets:
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * - TWILIO_FROM_NUMBER: Your Twilio phone number (+16812972643)
 * 
 * For Kenya calls, ensure the number is verified in Twilio console
 * or upgrade to a paid Twilio account.
 * 
 * EL5 MediProcure · Embu Level 5 Hospital · Kenya
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const HOSPITAL = "Embu Level 5 Hospital";
const VERIFIED_CALLER = "+254116647894"; // Verified Kenyan number for outbound calls

// Lazy credentials loader
function getCreds() {
  const TWILIO_ACCT = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
  const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
  const FROM = Deno.env.get("TWILIO_FROM_NUMBER") || "+16812972643";
  const BASE = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCT}`;
  return { TWILIO_ACCT, TWILIO_TOKEN, FROM, BASE };
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
function escXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] || c));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    const body = await req.json().catch(() => ({}));
    const { to, message, callerName, module: mod, action } = body;
    const creds = getCreds();
    const AUTH = "Basic " + btoa(`${creds.TWILIO_ACCT}:${creds.TWILIO_TOKEN}`);

    // Status check
    if (action === "status") {
      if (!creds.TWILIO_ACCT || !creds.TWILIO_TOKEN) {
        return respond({ ok: false, error: "Twilio credentials not configured", configured: false });
      }
      try {
        const r = await fetch(`${creds.BASE}/Calls.json?PageSize=5`, { headers: { Authorization: AUTH }, signal: AbortSignal.timeout(10000) });
        const d = await r.json();
        return respond({ ok: true, configured: true, total_calls: d.calls?.length ?? 0, from: creds.FROM, acct: creds.TWILIO_ACCT.slice(0,12)+"...", verified_caller: VERIFIED_CALLER });
      } catch (e: any) {
        return respond({ ok: false, error: e.message });
      }
    }

    if (!creds.TWILIO_ACCT || !creds.TWILIO_TOKEN) {
      return respond({ ok: false, error: "Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Supabase Edge Functions secrets." });
    }

    const callTo = formatKenyanPhone(String(to || ""));
    if (!callTo || !isE164(callTo)) {
      return respond({ ok: false, error: "Invalid Kenya phone number. Use +2547XX format (E.164). Example: +254720425195" }, 400);
    }

    const speechText = message || `Hello, this is a call from ${HOSPITAL} Procurement System. Please contact us at your earliest convenience. Thank you.`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">${escXml(speechText)}</Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-GB">To repeat this message, press 1. To end the call, press any other key.</Say>
  <Gather numDigits="1" action="/dev/null">
    <Say voice="alice">Waiting for your response.</Say>
  </Gather>
  <Say voice="alice" language="en-GB">Thank you for your response. Goodbye from ${escXml(HOSPITAL)}.</Say>
</Response>`;

    console.log(`[make-call v7] Calling ${callTo} from ${creds.FROM}`);
    const r = await fetch(`${creds.BASE}/Calls.json`, {
      method: "POST",
      headers: { Authorization: AUTH, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: callTo, From: creds.FROM, Twiml: twiml }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    const ok = r.ok && !!data.sid;
    console.log(`[make-call v7] ok=${ok} sid=${data.sid} err=${data.message}`);

    // Log to DB
    await sb.from("sms_log").insert({
      to_number: callTo, from_number: creds.FROM,
      message: `[VOICE CALL] ${speechText.slice(0, 200)}`,
      status: ok ? "sent" : "failed",
      twilio_sid: data.sid || null,
      module: mod || "voice_call",
      provider: "twilio_voice",
      error_msg: ok ? null : data.message,
      sent_at: new Date().toISOString(),
    });

    return respond({ ok, sid: data.sid, status: data.status, to: callTo, from: creds.FROM, error: data.message, kenya_note: "For Kenya calls, ensure numbers are verified in Twilio console." });
  } catch (e: any) {
    console.error("[make-call v7] Fatal:", e.message);
    return respond({ ok: false, error: e.message }, 500);
  }
});
