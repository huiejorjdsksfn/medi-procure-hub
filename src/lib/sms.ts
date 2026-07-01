/**
 * EL5 MediProcure v10.0 — SMS client
 * REDACTED_TWILIO_MESSAGING_SID = Messaging Service (SMS)
 * REDACTED_TWILIO_VERIFY_SID = Verify Service (OTP only)
 */
import { supabase } from "@/integrations/supabase/client";
import { TWILIO_SMS, TWILIO_WA, TWILIO_MG, WA_CODE } from "@/lib/version";
import { netEngine } from "@/lib/networkEngine";

export const TWILIO = {
  SMS_NUMBER:  TWILIO_SMS,
  WA_NUMBER:   TWILIO_WA,
  MG_SID:      TWILIO_MG,
  WA_CODE,
  JOIN_CODE:   WA_CODE,
  WA_LINK:     `https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine`,
};

export interface SmsOpts {
  to:            string | string[];
  message:       string;
  channel?:      "sms" | "whatsapp";
  module?:       string;
  recipientName?:string;
  department?:   string;
  sentBy?:       string;
}

export interface SmsResult {
  ok:     boolean;
  sent:   number;
  failed: number;
  total:  number;
  results:Array<{to:string;ok:boolean;provider:string;sid?:string;error?:string}>;
  error?: string;
}

export async function sendSms(opts: SmsOpts): Promise<SmsResult> {
  // Central send path used across approvals, WhatsApp workflows, and the AI
  // agent — one circuit breaker here protects the whole app if Twilio/the
  // edge function is down. retries:0 always, a network-layer retry here
  // could double-send a real SMS/WhatsApp message.
  const { data, error } = await netEngine.request(
    "twilio:send-sms",
    () => (supabase as any).functions.invoke("send-sms", {
      body: {
        to:             opts.to,
        message:        opts.message,
        channel:        opts.channel || "sms",
        module:         opts.module,
        recipient_name: opts.recipientName,
        department:     opts.department,
        sent_by:        opts.sentBy,
      },
    }),
    { priority: "critical", retries: 0, label: "send SMS/WhatsApp" }
  );
  if (error) return { ok:false, sent:0, failed:1, total:1, results:[], error: error.message || String(error) };
  return data as SmsResult;
}

export async function sendOTP(phone: string, channel: "sms"|"whatsapp" = "sms"): Promise<{ok:boolean;error?:string}> {
  const { data, error } = await netEngine.request(
    "twilio:verify-send",
    () => (supabase as any).functions.invoke("verify-role", { body: { action:"send", phone, channel } }),
    { priority: "critical", retries: 0, label: "send OTP" }
  );
  if (error) return { ok:false, error: error.message || String(error) };
  return { ok: data?.ok ?? false, error: data?.error };
}

export async function checkOTP(phone: string, code: string, userId?: string, role?: string): Promise<{ok:boolean;valid:boolean;error?:string}> {
  const { data, error } = await netEngine.request(
    "twilio:verify-check",
    () => (supabase as any).functions.invoke("verify-role", { body: { action:"check", phone, code, user_id:userId, role } }),
    { priority: "critical", retries: 0, label: "check OTP" }
  );
  if (error) return { ok:false, valid:false, error: error.message || String(error) };
  return { ok: data?.ok??false, valid: data?.valid??false, error: data?.error };
}

export const quickSms = async (to:string, msg:string, module?:string) =>
  (await sendSms({to,message:msg,module})).ok;

export const sendWhatsApp = (to: string, message: string, opts: Omit<SmsOpts,"to"|"message"|"channel"> = {}) =>
  sendSms({ ...opts, to, message, channel: "whatsapp" });

export async function checkTwilioStatus(): Promise<{ok:boolean; version?:string; sms_from?:string; wa_from?:string; from?:string; error?:string}> {
  const { data, error } = await netEngine.request(
    "twilio:status",
    async () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms?action=status`;
      const r = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "" } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { data: await r.json(), error: null };
    },
    { priority: "background", label: "Twilio status" } // status check only, safe to retry & low priority
  );
  if (error) return { ok:false, error: error.message || String(error) };
  return { ok: !!data?.ok, version: data?.version, sms_from: data?.sms_from, wa_from: data?.wa_from, from: data?.sms_from };
}

export async function makeCall(opts: { to: string; message: string }): Promise<{ok:boolean; sid?:string; error?:string}> {
  const { data, error } = await netEngine.request(
    "twilio:make-call",
    () => (supabase as any).functions.invoke("make-call", { body: opts }),
    { priority: "critical", retries: 0, label: "make call" } // never auto-redial
  );
  if (error) return { ok:false, error: error.message || String(error) };
  return { ok: !!data?.ok, sid: data?.sid };
}
