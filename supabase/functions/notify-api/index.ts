/**
 * ProcurBosse v8.0 -- Notify API Edge Function
 * Multi-channel notifications: in-app, SMS, email, WhatsApp
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const body = await req.json().catch(() => ({}));
  const { to, channel, title, body: message, module, recordId, priority = "normal" } = body;
  const toArr = Array.isArray(to) ? to : [to];
  const results: any = { in_app: 0, sms: 0, email: 0, errors: [] };

  // In-app notification
  if (channel === "in_app" || channel === "all") {
    const inserts = toArr.map((uid: string) => ({ user_id: uid, title, message, type: module || "system", entity_id: recordId || null, is_read: false, priority }));
    const { error } = await supabase.from("notifications").insert(inserts);
    if (error) results.errors.push(`in_app: ${error.message}`);
    else results.in_app = inserts.length;
  }

  // SMS via Twilio
  if ((channel === "sms" || channel === "all") && toArr.length > 0) {
    try {
      const TWILIO_SID   = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
      const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
      const TWILIO_FROM  = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
      if (TWILIO_SID && TWILIO_TOKEN) {
        for (const phone of toArr.filter((t: string) => t.startsWith("+"))) {
          const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
            method: "POST",
            headers: { "Authorization": `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: `${title}: ${message}` }),
          });
          if (resp.ok) results.sms++;
        }
      }
    } catch(e) { results.errors.push(`sms: ${e}`); }
  }

  return new Response(JSON.stringify(results), { headers: { ...cors, "Content-Type":"application/json" } });
});
