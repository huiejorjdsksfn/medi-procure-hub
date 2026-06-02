/**
 * EL5 MediProcure v10.0 — SMS client
 * REDACTED_TWILIO_MESSAGING_SID = Messaging Service (SMS)
 * REDACTED_TWILIO_VERIFY_SID = Verify Service (OTP only)
 */
import { supabase } from "@/integrations/supabase/client";
import { TWILIO_SMS, TWILIO_WA, TWILIO_MG, WA_CODE } from "@/lib/version";

export const TWILIO = {
  SMS_NUMBER:  TWILIO_SMS,
  WA_NUMBER:   TWILIO_WA,
  MG_SID:      TWILIO_MG,
  WA_CODE,
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
  try {
    const { data, error } = await (supabase as any).functions.invoke("send-sms", {
      body: {
        to:             opts.to,
        message:        opts.message,
        channel:        opts.channel || "sms",
        module:         opts.module,
        recipient_name: opts.recipientName,
        department:     opts.department,
        sent_by:        opts.sentBy,
      },
    });
    if (error) throw error;
    return data as SmsResult;
  } catch (e: any) {
    return { ok:false, sent:0, failed:1, total:1, results:[], error:e.message };
  }
}

export async function sendOTP(phone: string, channel: "sms"|"whatsapp" = "sms"): Promise<{ok:boolean;error?:string}> {
  try {
    const { data, error } = await (supabase as any).functions.invoke("verify-role", {
      body: { action:"send", phone, channel },
    });
    if (error) throw error;
    return { ok: data?.ok ?? false, error: data?.error };
  } catch (e:any) { return { ok:false, error:e.message }; }
}

export async function checkOTP(phone: string, code: string, userId?: string, role?: string): Promise<{ok:boolean;valid:boolean;error?:string}> {
  try {
    const { data, error } = await (supabase as any).functions.invoke("verify-role", {
      body: { action:"check", phone, code, user_id:userId, role },
    });
    if (error) throw error;
    return { ok: data?.ok??false, valid: data?.valid??false, error: data?.error };
  } catch (e:any) { return { ok:false, valid:false, error:e.message }; }
}

export const quickSms = async (to:string, msg:string, module?:string) =>
  (await sendSms({to,message:msg,module})).ok;
