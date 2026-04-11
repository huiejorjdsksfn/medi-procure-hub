/**
 * ProcurBosse — make-call Edge Function v1.0
 * Outbound voice calls via Twilio · TwiML generation
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const ACCT     = Deno.env.get("TWILIO_ACCOUNT_SID")  || "ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a";
const AUTH     = Deno.env.get("TWILIO_AUTH_TOKEN")    || "d73601fbefe26e01b06e22c53a798ea6";
const FROM     = Deno.env.get("TWILIO_PHONE_NUMBER")  || "+16812972643";
const APP_URL  = Deno.env.get("PROCURBOSSE_URL")      || "https://procurbosse.edgeone.app";

function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { action = "call" } = body;

    // ── Status check ──────────────────────────────────────────────
    if (action === "status") {
      return new Response(JSON.stringify({
        ok: true, from: FROM, account: ACCT.slice(0,10)+"...",
        auth_set: !!AUTH, capabilities: ["voice","sms","whatsapp"],
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── Outbound voice call ────────────────────────────────────────
    if (action === "call") {
      const { to, message = "Hello from EL5 MediProcure", caller_name = "EL5 Hospital" } = body;
      if (!to) return new Response(JSON.stringify({ ok: false, error: "to is required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

      const number = e164(to);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-GB">${message.replace(/[<>&"]/g, c => ({ "<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;" }[c] || c))}</Say>
  <Pause length="1"/>
  <Say voice="alice">Thank you. Goodbye.</Say>
</Response>`;

      const params = new URLSearchParams({
        To: number, From: FROM,
        Twiml: twiml,
        StatusCallback: `${APP_URL}/api/call-status`,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Calls.json`, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + btoa(`${ACCT}:${AUTH}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await res.json();
      if (!res.ok) return new Response(JSON.stringify({ ok: false, error: `${data.code}: ${data.message}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

      // Log to reception_calls
      await sb.from("reception_calls").insert({
        caller_phone: number, direction: "outbound",
        status: "initiated", twilio_call_sid: data.sid,
        called_at: new Date().toISOString(), notes: message,
      }).catch(() => {});

      return new Response(JSON.stringify({ ok: true, sid: data.sid, status: data.status, to: number }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // ── IVR / TwiML webhook ────────────────────────────────────────
    if (action === "twiml") {
      const { script = "welcome" } = body;
      const scripts: Record<string,string> = {
        welcome: `<Response><Say voice="alice" language="en-GB">Welcome to Embu Level 5 Hospital. Press 1 for Procurement, 2 for Finance, 3 for Reception, 0 to speak to an operator.</Say><Gather numDigits="1" action="${APP_URL}/api/ivr-route" method="POST"><Say voice="alice">Please make your selection now.</Say></Gather></Response>`,
        procurement: `<Response><Say voice="alice">You have reached the Procurement Department. Please leave your message after the tone.</Say><Record maxLength="30" playBeep="true"/></Response>`,
      };
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>${scripts[script] || scripts.welcome}`, { headers: { ...cors, "Content-Type": "text/xml" } });
    }

    return new Response(JSON.stringify({ ok: false, error: "Unknown action" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
