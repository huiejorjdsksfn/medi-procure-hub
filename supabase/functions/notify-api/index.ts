/**
 * ProcurBosse v9.0 -- Notify API Edge Function (failover-hardened)
 * Multi-channel notifications: in-app, SMS, email, WhatsApp
 * v9.0: SMS sends now go through retry + a persisted circuit breaker
 * (supabase/functions/_shared/failover.ts). If Twilio SMS exhausts its
 * retries, and the caller supplied `emails` alongside `to`, the same
 * message is failed over to the send-email Edge Function so the
 * notification still reaches the recipient through a second channel.
 * EL5 MediProcure | Embu Level 5 Hospital
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { guardedCall, logFailoverEvent } from "../_shared/failover.ts";

const cors = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type" };
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function sendEmailFallback(sb: any, to: string, subject: string, message: string) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
    body: JSON.stringify({ to, subject, html: `<p>${message}</p>`, text: message }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || data?.ok === false) throw new Error(data?.error || `send-email responded ${resp.status}`);
  return data;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const body = await req.json().catch(() => ({}));
  const { to, channel, title, body: message, module, recordId, priority = "normal", emails } = body;
  const toArr = Array.isArray(to) ? to : [to];
  const emailArr = Array.isArray(emails) ? emails : (emails ? [emails] : []);
  const results: any = { in_app: 0, sms: 0, email_fallback: 0, errors: [] };

  // In-app notification (retried — a transient DB blip shouldn't silently drop it)
  if (channel === "in_app" || channel === "all") {
    try {
      const inserts = toArr.map((uid: string) => ({ user_id: uid, title, message, type: module || "system", entity_id: recordId || null, is_read: false, priority }));
      await guardedCall(
        supabase,
        "notify-api:in-app-insert",
        async () => {
          const { error } = await supabase.from("notifications").insert(inserts);
          if (error) throw new Error(error.message);
        },
        { retry: { attempts: 2, baseDelayMs: 200, timeoutMs: 6000 }, breaker: { failureThreshold: 6, cooldownMs: 15000 } },
      );
      results.in_app = inserts.length;
    } catch (e: any) {
      results.errors.push(`in_app: ${e.message}`);
    }
  }

  // SMS via Twilio — retried with backoff, guarded by a persisted circuit
  // breaker so a dead Twilio account fails fast instead of stalling every
  // notification call for the duration of a full retry cycle.
  if ((channel === "sms" || channel === "all") && toArr.length > 0) {
    const TWILIO_SID   = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";
    const TWILIO_FROM  = Deno.env.get("TWILIO_PHONE_NUMBER") ?? "";
    if (TWILIO_SID && TWILIO_TOKEN) {
      const phones = toArr.filter((t: string) => typeof t === "string" && t.startsWith("+"));
      for (let i = 0; i < phones.length; i++) {
        const phone = phones[i];
        try {
          await guardedCall(
            supabase,
            "notify-api:sms",
            async () => {
              const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
                method: "POST",
                headers: { "Authorization": `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ From: TWILIO_FROM, To: phone, Body: `${title}: ${message}` }),
              });
              if (!resp.ok) {
                const errBody = await resp.text().catch(() => "");
                throw new Error(`Twilio ${resp.status}: ${errBody.slice(0, 200)}`);
              }
            },
            { retry: { attempts: 3, baseDelayMs: 300, maxDelayMs: 4000, timeoutMs: 12000 }, breaker: { failureThreshold: 4, cooldownMs: 30000 } },
          );
          results.sms++;
        } catch (e: any) {
          results.errors.push(`sms(${phone}): ${e.message}`);
          // Failover to email channel if the caller gave us an address for this recipient
          const fallbackEmail = emailArr[i];
          if (fallbackEmail) {
            try {
              await sendEmailFallback(supabase, fallbackEmail, title || "Notification", message || "");
              results.email_fallback++;
              await logFailoverEvent(supabase, "notify-api:sms", "provider_fallback", `sms failed for ${phone}, delivered via email to ${fallbackEmail}`);
            } catch (emailErr: any) {
              results.errors.push(`email_fallback(${fallbackEmail}): ${emailErr.message}`);
            }
          }
        }
      }
    }
  }

  return new Response(JSON.stringify(results), { headers: { ...cors, "Content-Type":"application/json" } });
});
