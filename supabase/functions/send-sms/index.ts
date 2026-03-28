/**
 * ProcurBosse -- send-sms Edge Function v5.0
 * Twilio SMS via Messaging Service SID (primary) or From number (fallback)
 * Africa's Talking fallback for Kenya local delivery
 * Reads all creds from system_settings then env vars
 * EL5 MediProcure -- Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const sb = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const DEFAULT_MSG_SVC_SID = "MGd547d8e3273fda2d21afdd6856acb245";

// ── Load SMS config ───────────────────────────────────────────────────────────
async function getSmsCfg(): Promise<Record<string, string>> {
  try {
    const { data } = await sb.from("system_settings").select("key,value")
      .in("key", [
        "twilio_account_sid","twilio_auth_token","twilio_phone_number",
        "twilio_messaging_service_sid","twilio_enabled",
        "at_api_key","at_username","at_sender_id","at_enabled",
        "sms_hospital_name","sms_sender_id","sms_provider"
      ]);
    const cfg: Record<string, string> = {};
    (data || []).forEach((r: any) => { if (r.value) cfg[r.key] = r.value; });

    // Env var fallbacks
    if (!cfg.twilio_account_sid)          cfg.twilio_account_sid          = Deno.env.get("TWILIO_ACCOUNT_SID")          ?? "";
    if (!cfg.twilio_auth_token)           cfg.twilio_auth_token           = Deno.env.get("TWILIO_AUTH_TOKEN")           ?? "";
    if (!cfg.twilio_phone_number)         cfg.twilio_phone_number         = Deno.env.get("TWILIO_PHONE_NUMBER")         ?? "";
    if (!cfg.twilio_messaging_service_sid) cfg.twilio_messaging_service_sid = Deno.env.get("TWILIO_MSG_SVC_SID") ?? DEFAULT_MSG_SVC_SID;
    if (!cfg.at_api_key)                  cfg.at_api_key                  = Deno.env.get("AT_API_KEY")                  ?? "";
    if (!cfg.at_username)                 cfg.at_username                 = Deno.env.get("AT_USERNAME")                 ?? "";
    if (!cfg.sms_hospital_name)           cfg.sms_hospital_name           = "EL5 MediProcure";
    if (!cfg.sms_provider)                cfg.sms_provider                = "twilio";

    return cfg;
  } catch {
    return {
      twilio_messaging_service_sid: DEFAULT_MSG_SVC_SID,
      sms_hospital_name: "EL5 MediProcure",
      sms_provider: "twilio",
    };
  }
}

// ── Format Kenyan phone numbers to E.164 ─────────────────────────────────────
function fmtPhone(raw: string): string {
  let n = raw.replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

// ── Twilio delivery ───────────────────────────────────────────────────────────
async function sendViaTwilio(cfg: Record<string,string>, to: string, body: string): Promise<{ok:boolean;sid?:string;status?:string;cost?:number;error?:string}> {
  const sid   = cfg.twilio_account_sid;
  const token = cfg.twilio_auth_token;
  const msSid = cfg.twilio_messaging_service_sid || DEFAULT_MSG_SVC_SID;
  const from  = cfg.twilio_phone_number;

  if (!sid || !token) return { ok: false, error: "Twilio SID/token not configured" };

  const params: Record<string, string> = { To: to, Body: body };
  if (msSid) params.MessagingServiceSid = msSid;
  else if (from) params.From = from;
  else return { ok: false, error: "No Twilio From number or Messaging Service SID" };

  try {
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${sid}:${token}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    const data = await resp.json();
    if (!resp.ok) return { ok: false, error: data.message || `Twilio HTTP ${resp.status} code:${data.code}` };
    return { ok: true, sid: data.sid, status: data.status, cost: Math.abs(parseFloat(data.price || "0")) };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Africa's Talking fallback (Kenya-native, cheaper local delivery) ──────────
async function sendViaAfricasTalking(cfg: Record<string,string>, to: string, body: string): Promise<{ok:boolean;messageId?:string;cost?:string;error?:string}> {
  const apiKey   = cfg.at_api_key;
  const username = cfg.at_username;
  if (!apiKey || !username) return { ok: false, error: "Africa's Talking credentials not configured" };

  const sender = cfg.at_sender_id || cfg.sms_sender_id || "";

  try {
    const params: Record<string, string> = {
      username,
      to,
      message: body,
      ...(sender ? { from: sender } : {}),
    };
    const resp = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "apiKey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: new URLSearchParams(params).toString(),
    });
    const data = await resp.json();
    const msg  = data?.SMSMessageData?.Recipients?.[0];
    if (!resp.ok || msg?.statusCode !== 101) {
      return { ok: false, error: msg?.status || data?.SMSMessageData?.Message || `AT HTTP ${resp.status}` };
    }
    return { ok: true, messageId: msg?.messageId, cost: msg?.cost };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Log to sms_log table ──────────────────────────────────────────────────────
async function logSms(to: string, message: string, result: any, meta: any) {
  try {
    await sb.from("sms_log").insert({
      to_number:     to,
      from_number:   meta.from || DEFAULT_MSG_SVC_SID,
      message,
      status:        result.ok ? "sent" : "failed",
      twilio_sid:    result.sid        || null,
      twilio_status: result.status     || null,
      module:        meta.module       || "system",
      record_id:     meta.record_id    || null,
      sent_by:       meta.sent_by      || null,
      sent_by_name:  meta.sent_by_name || null,
      error_msg:     result.error      || null,
      cost:          result.cost       || null,
      sent_at:       new Date().toISOString(),
    });
  } catch (_) { /* non-fatal */ }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const body = await req.json();
    const { to, message, module: mod, record_id, sent_by, sent_by_name } = body;

    if (!to || !message) {
      return new Response(JSON.stringify({ ok: false, error: "to and message are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const cfg = await getSmsCfg();

    // Check if SMS is disabled globally
    if (cfg.twilio_enabled === "false" && cfg.at_enabled === "false") {
      return new Response(JSON.stringify({ ok: false, error: "SMS disabled in Settings → SMS/Twilio" }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const hospitalName = cfg.sms_hospital_name || "EL5 MediProcure";
    // Prefix message with hospital tag (truncate total to 160 chars per segment)
    const prefix  = `[${hospitalName}] `;
    const fullMsg = (prefix + message).slice(0, 1600);

    // Parse recipient list
    const numbers = (Array.isArray(to) ? to : String(to).split(",").map(s => s.trim()))
      .filter(Boolean)
      .map(fmtPhone);

    const results: any[] = [];
    const provider = cfg.sms_provider || "twilio";

    for (const num of numbers) {
      let result: any;

      // Primary: Twilio
      if (provider === "twilio" || cfg.twilio_account_sid) {
        result = await sendViaTwilio(cfg, num, fullMsg);
        if (!result.ok && cfg.at_api_key) {
          // Fallback: Africa's Talking
          console.warn(`Twilio failed for ${num}: ${result.error} — trying AT fallback`);
          result = await sendViaAfricasTalking(cfg, num, fullMsg);
          result._provider = "africas_talking";
        } else {
          result._provider = "twilio";
        }
      } else if (cfg.at_api_key) {
        // Africa's Talking only
        result = await sendViaAfricasTalking(cfg, num, fullMsg);
        result._provider = "africas_talking";
      } else {
        result = { ok: false, error: "No SMS provider configured", _provider: "none" };
      }

      await logSms(num, fullMsg, result, {
        from: cfg.twilio_phone_number || cfg.at_sender_id,
        module: mod, record_id, sent_by, sent_by_name,
      });

      results.push({ to: num, provider: result._provider, ok: result.ok, sid: result.sid, error: result.error });
    }

    const allOk   = results.every(r => r.ok);
    const sentCnt = results.filter(r => r.ok).length;

    return new Response(JSON.stringify({
      ok: allOk,
      sent:    sentCnt,
      failed:  results.length - sentCnt,
      total:   results.length,
      messaging_service_sid: cfg.twilio_messaging_service_sid,
      results,
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("send-sms fatal:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
