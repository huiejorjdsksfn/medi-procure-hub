/**
 * ProcurBosse — send-whatsapp Edge Function v5.8.3
 * Twilio WhatsApp Business API
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { to, message, templateName, templateParams } = await req.json();
    if (!to || !message) {
      return new Response(JSON.stringify({ error: "to and message required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const TWILIO_SID   = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const WHATSAPP_FROM = Deno.env.get("TWILIO_WHATSAPP_NUMBER") ?? "whatsapp:+14155238886";

    const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:+${to.replace(/[^0-9]/g, "")}`;

    const body = new URLSearchParams({
      From: WHATSAPP_FROM,
      To: toNumber,
      Body: message,
    });

    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const result = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: result.message || "Twilio error", code: result.code }),
        { status: resp.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Log to DB
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    await sb.from("communication_logs").insert({
      channel: "whatsapp",
      recipient: to,
      message,
      status: "sent",
      provider_sid: result.sid,
    }).throwOnError().catch(() => {});

    return new Response(JSON.stringify({ success: true, sid: result.sid, status: result.status }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
