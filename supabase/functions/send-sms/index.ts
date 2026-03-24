/**
 * ProcurBosse — send-sms Edge Function v3.0
 * Twilio Messaging Service SID: MGd547d8e3273fda2d21afdd6856acb245
 * Reads credentials from system_settings OR env vars
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ── Default Twilio credentials (from screenshot) ──────────────
const DEFAULT_TWILIO = {
  account_sid: Deno.env.get("TWILIO_ACCOUNT_SID") ?? "",
  auth_token:  Deno.env.get("TWILIO_AUTH_TOKEN") ?? "",
  messaging_service_sid: "MGd547d8e3273fda2d21afdd6856acb245",
  phone_number: Deno.env.get("TWILIO_PHONE_NUMBER") ?? "",
};

async function getTwilioConfig(): Promise<Record<string, string>> {
  const { data } = await sb.from("system_settings").select("key,value")
    .in("key", ["twilio_account_sid","twilio_auth_token","twilio_phone_number",
                "twilio_messaging_service_sid","twilio_enabled",
                "sms_hospital_name","sms_sender_id"]);
  const cfg: Record<string, string> = {};
  (data || []).forEach((r: any) => { cfg[r.key] = r.value ?? ""; });
  // Fall back to env vars / defaults
  if (!cfg.twilio_account_sid) cfg.twilio_account_sid = DEFAULT_TWILIO.account_sid;
  if (!cfg.twilio_auth_token)  cfg.twilio_auth_token  = DEFAULT_TWILIO.auth_token;
  if (!cfg.twilio_messaging_service_sid) cfg.twilio_messaging_service_sid = DEFAULT_TWILIO.messaging_service_sid;
  if (!cfg.twilio_phone_number) cfg.twilio_phone_number = DEFAULT_TWILIO.phone_number;
  return cfg;
}

async function sendViaTwilio(cfg: Record<string,string>, to: string, body: string) {
  const { twilio_account_sid: sid, twilio_auth_token: token,
          twilio_messaging_service_sid: msSid, twilio_phone_number: from } = cfg;
  
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const params: Record<string, string> = { To: to, Body: body };
  
  // Use Messaging Service SID if available (preferred), else From number
  if (msSid) params.MessagingServiceSid = msSid;
  else params.From = from;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${sid}:${token}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await resp.json();
  if (!resp.ok) return { ok: false, error: data.message || `HTTP ${resp.status}` };
  return { ok: true, sid: data.sid, cost: Math.abs(parseFloat(data.price || "0")) };
}

function fmtPhone(raw: string): string {
  let n = raw.replace(/[\s\-()]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) n = "+254" + n.slice(1);
  else if (n.startsWith("254") && !n.startsWith("+")) n = "+" + n;
  return n;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, message, module: mod, record_id, sent_by, sent_by_name } = await req.json();
    if (!to || !message) return new Response(JSON.stringify({ ok: false, error: "to and message required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const cfg = await getTwilioConfig();
    const hospitalName = cfg.sms_hospital_name || "EL5 MediProcure";
    const fullMsg = `[${hospitalName}] ${message}`.slice(0, 1600);
    const recipients = (Array.isArray(to) ? to : to.split(",").map((s:string) => s.trim())).filter(Boolean);
    const results: any[] = [];

    for (const r of recipients) {
      const formatted = fmtPhone(r);
      const result = cfg.twilio_enabled === "false"
        ? { ok: false, error: "SMS disabled in settings" }
        : await sendViaTwilio(cfg, formatted, fullMsg);

      try {
        await sb.from("sms_log").insert({
          to_number: formatted, from_number: cfg.twilio_phone_number || cfg.twilio_messaging_service_sid,
          message: fullMsg, status: result.ok ? "sent" : "failed",
          twilio_sid: (result as any).sid || null, module: mod || "system",
          record_id: record_id || null, sent_by: sent_by || null,
          sent_by_name: sent_by_name || null, error_msg: (result as any).error || null,
          cost: (result as any).cost || null, sent_at: new Date().toISOString(),
        });
      } catch(_) {}
      results.push({ to: formatted, ...result });
    }

    const allOk = results.every(r => r.ok);
    return new Response(JSON.stringify({ ok: allOk, provider: "twilio", results, sent: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
