/**
 * ProcurBosse — make-call Edge Function v3.0 (FULLY RECONFIGURED)
 * ✅ DB-driven credentials with triple fallback
 * ✅ Outbound voice calls · TwiML IVR · Status callbacks
 * ✅ Full error reporting · E.164 normalisation
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const DEFAULTS = {
  ACCT: "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a",
  AUTH: "d73601fbefe26e01b06e22c53a798ea6",
  FROM: "+16812972643",
};

const APP_URL = Deno.env.get("PROCURBOSSE_URL") || "https://procurbosse.edgeone.app";

async function loadCreds() {
  try {
    const { data } = await sb.from("twilio_config")
      .select("account_sid,auth_token,phone_number")
      .eq("env", "production")
      .eq("is_active", true)
      .maybeSingle();
    if (data?.account_sid && data?.auth_token) {
      console.log("[Call] Using DB credentials");
      return { ACCT: data.account_sid, AUTH: data.auth_token, FROM: data.phone_number };
    }
  } catch (e) { console.warn("[Call] DB creds error:", e); }

  const envAcct = Deno.env.get("TWILIO_ACCOUNT_SID");
  const envAuth = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (envAcct && envAuth) return { ACCT: envAcct, AUTH: envAuth, FROM: Deno.env.get("TWILIO_PHONE_NUMBER") || DEFAULTS.FROM };
  return DEFAULTS;
}

function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+"))                        return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254"))                      return "+" + n;
  if (n.length === 9 && /^\d+$/.test(n))        return "+254" + n;
  return "+" + n;
}

function escXml(s: string): string {
  return s.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] || c));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    const { action = "call" } = body;
    const creds = await loadCreds();

    // ── Status check ──────────────────────────────────────────────
    if (action === "status") {
      let live = false;
      let accountStatus = "unknown";
      try {
        const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.ACCT}.json`, {
          headers: { "Authorization": "Basic " + btoa(`${creds.ACCT}:${creds.AUTH}`) },
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        live = r.ok && d.status === "active";
        accountStatus = d.status || `HTTP ${r.status}`;
        if (!r.ok) console.error("[Call] Status check failed:", d.message || d.code);
      } catch (e: any) { console.error("[Call] Status error:", e.message); }

      return new Response(JSON.stringify({
        ok: live, from: creds.FROM, account: creds.ACCT.slice(0, 10) + "...",
        account_status: accountStatus, auth_set: !!creds.AUTH,
        capabilities: ["voice", "sms", "whatsapp"], twilio_live: live,
        sms_from: creds.FROM, wa_from: "+14155238886",
        msg_service_sid: "MGd547d8e3273fda2d21afdd6856acb245",
        timestamp: new Date().toISOString(),
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // ── Outbound voice call ────────────────────────────────────────
    if (action === "call") {
      const { to, message = "Hello from EL5 MediProcure Hospital. This is an automated notification. Thank you.", caller_name = "EL5 Hospital" } = body;
      if (!to) return new Response(JSON.stringify({ ok: false, error: "to is required" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

      const number = e164(to);
      const twiml  = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice" language="en-GB">${escXml(message)}</Say><Pause length="1"/><Say voice="alice" language="en-GB">Thank you. Goodbye from Embu Level 5 Hospital.</Say></Response>`;

      const params = new URLSearchParams({
        To:             number,
        From:           creds.FROM,
        Twiml:          twiml,
        StatusCallback: `${APP_URL}/api/call-status`,
        StatusCallbackMethod: "POST",
      });

      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${creds.ACCT}/Calls.json`,
        {
          method:  "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${creds.ACCT}:${creds.AUTH}`),
            "Content-Type":  "application/x-www-form-urlencoded",
            "User-Agent":    "ProcurBosse/7.0 EL5MediProcure/Deno",
          },
          body: params.toString(),
          signal: AbortSignal.timeout(15000),
        }
      );

      let data: any = {};
      try { data = await resp.json(); } catch { data = {}; }

      if (!resp.ok) {
        const err = data?.message || data?.more_info || `HTTP ${resp.status}`;
        console.error("[Call] FAILED:", err, "to:", number);
        return new Response(JSON.stringify({ ok: false, error: err, to: number, status_code: resp.status }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" } });
      }

      console.log("[Call] OK sid:", data.sid, "to:", number, "status:", data.status);

      // Log to DB
      try {
        await sb.from("sms_log").insert({
          to_number:  number,
          from_number: creds.FROM,
          message:    message.slice(0, 200),
          status:     data.status || "queued",
          twilio_sid: data.sid,
          provider:   "twilio_voice",
          module:     body.module || "voice_call",
          channel:    "voice",
          sent_at:    new Date().toISOString(),
        });
      } catch (e) { console.warn("[Call] Log error:", e); }

      return new Response(JSON.stringify({
        ok: true, sid: data.sid, status: data.status, to: number, from: creds.FROM,
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: false, error: `Unknown action: ${action}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e: any) {
    console.error("[make-call] Unhandled:", e.message);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
