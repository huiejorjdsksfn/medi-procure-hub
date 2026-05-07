/**
 * EL5 MediProcure — send-whatsapp Edge Function v10.0 NUCLEAR FIX
 * Direct Twilio WhatsApp API (no gateway, no Lovable connector)
 * FROM: whatsapp:+14155238886 (Twilio sandbox) or TWILIO_WA_NUMBER env
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERIFIED_FROM_WA = "whatsapp:+14155238886";
const HOSPITAL = "EL5 MediProcure";

function e164(raw: string): string {
  const n = String(raw).replace(/[\s\-\(\)\.]/g, "").trim();
  if (!n) return n;
  if (n.startsWith("+")) return n;
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  return n;
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
    const FROM  = Deno.env.get("TWILIO_WA_NUMBER")   || VERIFIED_FROM_WA;
    const auth  = "Basic " + btoa(`${ACCT}:${TOKEN}`);

    const body = await req.json().catch(() => ({}));
    const { to, message, template, templateData = {} } = body;

    if (!to || !message) return respond({ ok:false, error:"to and message are required" }, 400);
    if (!ACCT||!TOKEN) return respond({ ok:false, error:"Credentials not configured" });

    const num = e164(String(to));
    const toWA = num.startsWith("whatsapp:") ? num : `whatsapp:${num}`;
    const fromWA = FROM.startsWith("whatsapp:") ? FROM : `whatsapp:${FROM}`;
    const fullMsg = message.startsWith("[") ? message : `[${HOSPITAL}] ${message}`;

    const { data: logRow } = await sb.from("sms_log").insert({
      to_number: num, from_number: FROM.replace("whatsapp:",""),
      message: fullMsg, status: "queued",
      module: template||"whatsapp", provider: "twilio_wa",
      sent_at: new Date().toISOString(),
    }).select("id").maybeSingle();

    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCT}/Messages.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: toWA, From: fromWA, Body: fullMsg }),
      signal: AbortSignal.timeout(15000),
    });
    const d = await r.json();
    const ok = r.ok && !!d.sid;
    console.log(`[WA v10] to=${num} ok=${ok} sid=${d.sid} err=${d.message}`);

    if ((logRow as any)?.id) await sb.from("sms_log").update({
      status:ok?"sent":"failed", twilio_sid:d.sid??null,
      error_msg:ok?null:(d.message??`HTTP ${r.status}`),
    }).eq("id",(logRow as any).id);

    return respond({ ok, sid:d.sid, to:toWA, from:fromWA, body:fullMsg,
      status:d.status, code:d.code, error:d.message });

  } catch(e:any) {
    console.error("[WA v10] Fatal:", e.message);
    return respond({ ok:false, error:e.message }, 500);
  }
});
