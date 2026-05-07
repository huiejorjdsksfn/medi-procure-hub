/**
 * EL5 MediProcure — make-call Edge Function v10.0 NUCLEAR FIX
 * Auth: Account SID + Auth Token (DIRECT)
 * FROM: +16812972643 (hardcoded — verified on account AC9ce73d...)
 * Actions: call, end_call, verify_number, status
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const VERIFIED_FROM = "+16812972643";
const HOSPITAL = "EL5 MediProcure — Embu Level 5 Hospital";

function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+")) return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  if (n.length === 9 && /^\d+$/.test(n)) return "+254" + n;
  return n;
}
function escXml(s: string): string {
  return String(s).replace(/[<>&"\']/g, (c:string) =>
    ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':'&quot;',"\'":`&apos;`}[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await sb.from("system_settings").select("key,value")
      .in("key", ["twilio_account_sid", "twilio_auth_token"]);
    const cfg: Record<string,string> = {};
    for (const r of rows ?? []) cfg[r.key] = r.value;

    const ACCT  = Deno.env.get("TWILIO_ACCOUNT_SID") || cfg["twilio_account_sid"] || "";
    const TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")  || cfg["twilio_auth_token"]  || "";
    const auth  = "Basic " + btoa(`${ACCT}:${TOKEN}`);

    const body = await req.json().catch(() => ({}));
    const { action = "call" } = body;
    console.log(`[CALL v10] action=${action} ACCT=${ACCT.slice(0,12)}... TOKEN=${!!TOKEN}`);

    // STATUS ─────────────────────────────────────────────────────────────────
    if (action === "status") {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}.json`,
        { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      const nr = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ACCT}/IncomingPhoneNumbers.json?PageSize=20`,
        { headers: { Authorization: auth }, signal: AbortSignal.timeout(8000) });
      const nd = await nr.json();
      const phones = (nd.incoming_phone_numbers ?? []).map((p: any) => p.phone_number);
      return respond({ ok: r.ok && d.status==="active", account_status:d.status,
        friendly_name:d.friendly_name, from:VERIFIED_FROM,
        acct:ACCT.slice(0,12)+"...", token_set:!!TOKEN,
        phone_numbers_on_account: phones });
    }

    // VERIFY NUMBER ──────────────────────────────────────────────────────────
    if (action === "verify_number") {
      const num = e164(String(body.number||""));
      if (!num) return respond({ ok:false, error:"number required" }, 400);
      const r = await fetch(
        `https://lookups.twilio.com/v1/PhoneNumbers/${encodeURIComponent(num)}?Type=carrier`,
        { headers: { Authorization: auth }, signal: AbortSignal.timeout(10000) });
      const d = await r.json();
      return respond({ ok:r.ok, number:num, valid:r.ok, country_code:d.country_code??null,
        national_format:d.national_format??null, carrier:d.carrier??null,
        phone_type:d.carrier?.type??null, error:r.ok?undefined:d.message });
    }

    // END CALL ───────────────────────────────────────────────────────────────
    if (action === "end_call") {
      const { call_sid } = body;
      if (!call_sid) return respond({ ok:false, error:"call_sid required" }, 400);
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Calls/${call_sid}.json`, {
        method:"POST",
        headers:{ Authorization:auth, "Content-Type":"application/x-www-form-urlencoded" },
        body:new URLSearchParams({ Status:"completed" }),
        signal:AbortSignal.timeout(10000),
      });
      const d = await r.json();
      return respond({ ok:r.ok, status:d.status, call_sid, error:d.message });
    }

    // OUTBOUND CALL ──────────────────────────────────────────────────────────
    if (action === "call") {
      const { to, auto_end = false,
        message = `Hello. This is an automated notification from MediProcure at Embu Level 5 Hospital. Please check the procurement system for details. Thank you.` } = body;
      if (!to) return respond({ ok:false, error:"to is required" }, 400);

      const number = e164(String(to));
      if (!ACCT||!TOKEN) return respond({ ok:false, error:"Credentials not configured" });

      const twiml = auto_end
        ? `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${escXml(message)}</Say><Hangup/></Response>`
        : `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${escXml(message)}</Say><Pause length="1"/><Say voice="alice" language="en-GB">Thank you. Goodbye from Embu Level Five Hospital.</Say></Response>`;

      console.log(`[CALL v10] calling ${number} from ${VERIFIED_FROM} auto_end=${auto_end}`);

      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Calls.json`, {
        method:"POST",
        headers:{ Authorization:auth, "Content-Type":"application/x-www-form-urlencoded" },
        body:new URLSearchParams({ To:number, From:VERIFIED_FROM, Twiml:twiml }),
        signal:AbortSignal.timeout(15000),
      });
      const d = await r.json();
      console.log(`[CALL v10] ok=${r.ok} sid=${d.sid} status=${d.status} code=${d.code} err=${d.message}`);

      if (r.ok && d.sid) {
        await sb.from("sms_log").insert({
          to_number:number, from_number:VERIFIED_FROM,
          message:message.slice(0,200), status:d.status||"queued",
          twilio_sid:d.sid, provider:"twilio_voice",
          module:body.module||"voice_call", sent_at:new Date().toISOString(),
        }).catch(()=>{});
      }
      return respond({ ok:r.ok, sid:d.sid, status:d.status,
        to:number, from:VERIFIED_FROM, auto_end, code:d.code, error:d.message });
    }

    return respond({ ok:false, error:`Unknown action: ${action}` }, 400);
  } catch(e:any) {
    console.error("[CALL v10] Fatal:", e.message);
    return respond({ ok:false, error:e.message }, 500);
  }
});
