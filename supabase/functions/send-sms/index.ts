/**
 * ProcurBosse — send-sms Edge Function v2.0
 * Twilio SMS integration. Reads config from system_settings.
 * Logs every message to sms_log table.
 * 
 * Invoke: supabase.functions.invoke("send-sms", { body: { to, message, module } })
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

interface SmsPayload {
  to: string | string[];
  message: string;
  module?: string;
  record_id?: string;
  sent_by?: string;
  sent_by_name?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

async function getTwilioConfig(): Promise<Record<string, string>> {
  const { data } = await sb
    .from("system_settings")
    .select("key,value")
    .in("key", [
      "twilio_account_sid","twilio_auth_token","twilio_phone_number",
      "twilio_enabled","sms_hospital_name","sms_sender_id"
    ]);
  const cfg: Record<string, string> = {};
  (data || []).forEach((r: any) => { cfg[r.key] = r.value ?? ""; });
  return cfg;
}

async function sendViaTwilio(
  accountSid: string, authToken: string,
  from: string, to: string, body: string
): Promise<{ ok: boolean; sid?: string; error?: string; cost?: number }> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${accountSid}:${authToken}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  });
  const data = await resp.json();
  if (!resp.ok) {
    return { ok: false, error: data.message || `HTTP ${resp.status}` };
  }
  return { ok: true, sid: data.sid, cost: parseFloat(data.price || "0") * -1 };
}

async function logSms(
  to: string, from: string, message: string,
  status: string, twilio_sid?: string, error?: string,
  payload?: SmsPayload, cost?: number
) {
  try {
    await sb.from("sms_log").insert({
      to_number:    to,
      from_number:  from,
      message:      message.slice(0, 1600),
      status,
      twilio_sid:   twilio_sid || null,
      module:       payload?.module || "system",
      record_id:    payload?.record_id || null,
      sent_by:      payload?.sent_by || null,
      sent_by_name: payload?.sent_by_name || null,
      error_msg:    error || null,
      cost:         cost || null,
      sent_at:      new Date().toISOString(),
    });
  } catch (e) {
    console.warn("SMS log failed:", e);
  }
}

function formatNumber(raw: string): string {
  // Kenyan numbers: add +254 if starts with 07 or 01
  let n = raw.replace(/\s+/g, "").replace(/-/g, "");
  if (n.startsWith("07") || n.startsWith("01")) {
    n = "+254" + n.slice(1);
  } else if (n.startsWith("254") && !n.startsWith("+")) {
    n = "+" + n;
  }
  return n;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const payload: SmsPayload = await req.json();
    const { to, message } = payload;

    if (!to || !message) {
      return new Response(JSON.stringify({ ok: false, error: "to and message required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const cfg = await getTwilioConfig();

    if (cfg.twilio_enabled !== "true") {
      await logSms(Array.isArray(to) ? to.join(",") : to, cfg.twilio_phone_number || "", message, "disabled", undefined, "Twilio disabled in settings", payload);
      return new Response(JSON.stringify({
        ok: false,
        error: "SMS not enabled. Configure Twilio in Admin → Settings → SMS."
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { twilio_account_sid, twilio_auth_token, twilio_phone_number } = cfg;
    if (!twilio_account_sid || !twilio_auth_token || !twilio_phone_number) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Twilio not configured. Add credentials in Admin → Settings → SMS."
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Hospital name prefix
    const hospitalName = cfg.sms_hospital_name || "EL5 MediProcure";
    const fullMsg = `[${hospitalName}] ${message}`.slice(0, 1600);

    // Send to all recipients
    const recipients = Array.isArray(to) ? to : to.split(",").map((s: string) => s.trim()).filter(Boolean);
    const results: any[] = [];

    for (const recipient of recipients) {
      const formattedTo = formatNumber(recipient);
      const result = await sendViaTwilio(
        twilio_account_sid, twilio_auth_token,
        twilio_phone_number, formattedTo, fullMsg
      );
      await logSms(formattedTo, twilio_phone_number, fullMsg,
        result.ok ? "sent" : "failed", result.sid, result.error, payload, result.cost);
      results.push({ to: formattedTo, ...result });
    }

    const allOk = results.every(r => r.ok);
    return new Response(JSON.stringify({
      ok: allOk,
      provider: "twilio",
      results,
      sent: results.filter(r => r.ok).length,
      failed: results.filter(r => !r.ok).length,
    }), { headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
