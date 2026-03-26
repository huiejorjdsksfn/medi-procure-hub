/**
 * ProcurBosse — send-sms Edge Function v4.0
 * Twilio SMS via Messaging Service SID MGd547d8e3273fda2d21afdd6856acb245
 * Reads credentials from system_settings (entered in Admin → Settings → SMS/Twilio)
 * Falls back to environment variables if not in DB
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

// ── Hardcoded Messaging Service SID ───────────────────────────
const MSG_SVC_SID = "MGd547d8e3273fda2d21afdd6856acb245";

async function getTwilioCfg(): Promise<Record<string, string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value")
      .in("key", [
        "twilio_account_sid","twilio_auth_token","twilio_phone_number",
        "twilio_messaging_service_sid","twilio_enabled","sms_hospital_name","sms_sender_id"
      ]);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });
    // Fallback to env vars
    if (!cfg.twilio_account_sid)  cfg.twilio_account_sid  = Deno.env.get("TWILIO_ACCOUNT_SID")  ?? "";
    if (!cfg.twilio_auth_token)   cfg.twilio_auth_token   = Deno.env.get("TWILIO_AUTH_TOKEN")   ?? "";
    if (!cfg.twilio_phone_number) cfg.twilio_phone_number = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
    // Always use hardcoded MSG SVC SID if not in DB
    if (!cfg.twilio_messaging_service_sid) cfg.twilio_messaging_service_sid = MSG_SVC_SID;
    if (!cfg.sms_hospital_name) cfg.sms_hospital_name = "EL5 MediProcure";
    return cfg;
  } catch { return { twilio_messaging_service_sid: MSG_SVC_SID, sms_hospital_name: "EL5 MediProcure" }; }
}

function fmtPhone(raw: string): string {
  let n = raw.replace(/[\s\-()+]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  if (!n.startsWith("+")) return "+" + n;
  return n;
}

async function twilioSend(cfg: Record<string,string>, to: string, body: string) {
  const sid   = cfg.twilio_account_sid;
  const token = cfg.twilio_auth_token;
  const msSid = cfg.twilio_messaging_service_sid || MSG_SVC_SID;
  const from  = cfg.twilio_phone_number;

  if (!sid || !token) return { ok: false, error: "Twilio Account SID / Auth Token not configured in Settings → SMS/Twilio" };

  const params: Record<string, string> = { To: to, Body: body };
  if (msSid)  params.MessagingServiceSid = msSid;
  else if (from) params.From = from;
  else return { ok: false, error: "No Messaging Service SID or From number configured" };

  const url  = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${sid}:${token}`),
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  const data = await resp.json();
  if (!resp.ok) return { ok: false, error: data.message || data.code || `HTTP ${resp.status}` };
  return { ok: true, sid: data.sid, status: data.status, cost: Math.abs(parseFloat(data.price || "0")) };
}

async function logSms(to: string, message: string, result: any, meta: any) {
  try {
    await sb.from("sms_log").insert({
      to_number:    to,
      from_number:  meta.from || MSG_SVC_SID,
      message,
      status:       result.ok ? "sent" : "failed",
      twilio_sid:   result.sid  || null,
      twilio_status:result.status || null,
      module:       meta.module || "system",
      record_id:    meta.record_id || null,
      sent_by:      meta.sent_by || null,
      sent_by_name: meta.sent_by_name || null,
      error_msg:    result.error || null,
      cost:         result.cost  || null,
      sent_at:      new Date().toISOString(),
    });
  } catch (_) { /* non-fatal */ }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json();
    const { to, message, module: mod, record_id, sent_by, sent_by_name } = body;
    if (!to || !message) {
      return new Response(JSON.stringify({ ok: false, error: "to and message are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const cfg = await getTwilioCfg();
    if (cfg.twilio_enabled === "false") {
      return new Response(JSON.stringify({ ok: false, error: "SMS disabled in Settings → SMS/Twilio" }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const hospitalName = cfg.sms_hospital_name || "EL5 MediProcure";
    const fullMsg = `[${hospitalName}] ${message}`.slice(0, 1600);
    const numbers = (Array.isArray(to) ? to : String(to).split(",").map(s => s.trim())).filter(Boolean);
    const results = [];

    for (const num of numbers) {
      const formatted = fmtPhone(num);
      const result    = await twilioSend(cfg, formatted, fullMsg);
      await logSms(formatted, fullMsg, result, { from: cfg.twilio_phone_number, module: mod, record_id, sent_by, sent_by_name });
      results.push({ to: formatted, ...result });
    }

    return new Response(JSON.stringify({
      ok:     results.every(r => r.ok),
      sent:   results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
      provider: "twilio",
      messaging_service_sid: cfg.twilio_messaging_service_sid,
      results,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
