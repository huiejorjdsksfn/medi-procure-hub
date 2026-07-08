/**
 * EL5 MediProcure — make-call Edge Function v6.1 PRODUCTION
 * v6.1: Anti-replay guard (x-el5-nonce / x-el5-ts headers, optional).
 * Account SID: (TWILIO_ACCOUNT_SID env var)
 * Auth Token : (stored in TWILIO_AUTH_TOKEN secret)
 * Calls FROM : +16812972643
 * TTS Voice  : Twilio Alice (en-GB)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-el5-nonce, x-el5-ts",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const TWILIO_ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const FROM         = "+16812972643";
const BASE         = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCT}`;
const HOSPITAL     = "Embu Level 5 Hospital";

const REPLAY_SKEW_MS = 5 * 60 * 1000;
async function checkReplay(req: Request, sb: any): Promise<{ ok: boolean; error?: string }> {
  const nonce = req.headers.get("x-el5-nonce");
  const ts = req.headers.get("x-el5-ts");
  if (!nonce || !ts) return { ok: true };
  const tsNum = parseInt(ts, 10);
  if (!tsNum || Math.abs(Date.now() - tsNum) > REPLAY_SKEW_MS) return { ok: false, error: "Request timestamp expired or invalid" };
  const { error } = await sb.from("security_nonces").insert({ nonce });
  if (error) return { ok: false, error: "Duplicate request (replay detected) — call already placed" };
  return { ok: true };
}

function e164(raw: string): string {
  const n = String(raw || "").replace(/[\s\-().]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+")) return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  if (n.length === 9 && /^\d+$/.test(n)) return "+254" + n;
  return n;
}
function escXml(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c] || c));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  if (req.method === "POST") {
    const replay = await checkReplay(req, sb);
    if (!replay.ok) return respond({ ok: false, error: replay.error }, 409);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const AUTH = "Basic " + btoa(`${TWILIO_ACCT}:${TWILIO_TOKEN}`);
    const { to, message, callerName, module: mod, action } = body;

    if (action === "status") {
      const r = await fetch(`${BASE}/Calls.json?PageSize=5`, { headers: { Authorization: AUTH }, signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      return respond({ ok: r.ok, total_calls: d.calls?.length ?? 0, from: FROM, acct: TWILIO_ACCT.slice(0,12)+"..." });
    }

    const callTo = e164(String(to || ""));
    if (!callTo) return respond({ ok: false, error: "Missing or invalid 'to' number" }, 400);

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

    console.log(`[make-call v6.1] Calling ${callTo} from ${FROM}`);
    const r = await fetch(`${BASE}/Calls.json`, {
      method: "POST",
      headers: { Authorization: AUTH, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: callTo, From: FROM, Twiml: twiml }).toString(),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json();
    const ok = r.ok && !!data.sid;
    console.log(`[make-call v6.1] ok=${ok} sid=${data.sid} err=${data.message}`);

    await sb.from("sms_log").insert({
      to_number: callTo, from_number: FROM,
      message: `[VOICE CALL] ${speechText.slice(0, 200)}`,
      status: ok ? "sent" : "failed",
      twilio_sid: data.sid || null,
      module: mod || "voice_call",
      provider: "twilio_voice",
      error_msg: ok ? null : data.message,
      sent_at: new Date().toISOString(),
    });

    return respond({ ok, sid: data.sid, status: data.status, to: callTo, from: FROM, error: data.message });
  } catch (e: any) {
    console.error("[make-call v6.1] Fatal:", e.message);
    return respond({ ok: false, error: e.message }, 500);
  }
});
