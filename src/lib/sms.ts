/**
 * ProcurBosse — sms.ts v4.0 (Fully Activated)
 * Client-side SMS: calls send-sms edge function
 * Twilio primary · Africa's Talking fallback
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

export interface SmsOptions {
  to:           string | string[];
  message:      string;
  channel?:     "sms" | "whatsapp";
  module?:      string;
  recordId?:    string;
  sentBy?:      string;
  sentByName?:  string;
  recipientName?: string;
  department?:  string;
}

export interface SmsResult {
  ok:      boolean;
  sent:    number;
  failed:  number;
  total:   number;
  results: Array<{to:string; ok:boolean; provider:string; sid?:string; error?:string}>;
  error?:  string;
}

export const TWILIO = {
  SMS_NUMBER:   "+16812972643",
  WA_NUMBER:    "+14155238886",
  JOIN_CODE:    "join bad-machine",
  MSG_SVC_SID:  "MGd547d8e3273fda2d21afdd6856acb245",
  SERVICE_NAME: "EL5H",
  WA_LINK:      "https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine",
  VOICE_WEBHOOK:"https://demo.twilio.com/welcome/voice/",
};

export async function sendSms(opts: SmsOptions): Promise<SmsResult> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {
        to:             opts.to,
        message:        opts.message,
        channel:        opts.channel || "sms",
        module:         opts.module,
        record_id:      opts.recordId,
        sent_by:        opts.sentBy,
        recipient_name: opts.recipientName,
        department:     opts.department,
      },
    });
    if (error) throw error;
    return data as SmsResult;
  } catch (e: any) {
    return { ok:false, sent:0, failed:1, total:1, results:[], error:e.message };
  }
}

export async function sendWhatsApp(opts: Omit<SmsOptions,"channel">): Promise<SmsResult> {
  return sendSms({ ...opts, channel:"whatsapp" });
}

/** Convenience: send a simple SMS to one number */
export async function quickSms(to: string, message: string, module?: string): Promise<boolean> {
  const r = await sendSms({ to, message, module });
  return r.ok;
}

/** Send WhatsApp join instructions via SMS */
export async function sendWhatsAppJoinInstructions(to: string, recipientName?: string): Promise<boolean> {
  const msg = `EL5 MediProcure WhatsApp Setup:\n\n1. Open WhatsApp\n2. Message: ${TWILIO.WA_NUMBER}\n3. Send: ${TWILIO.JOIN_CODE}\n\nOr visit: ${TWILIO.WA_LINK}`;
  const r = await sendSms({ to, message:msg, recipientName, module:"whatsapp_setup" });
  return r.ok;
}

/** Trigger WhatsApp session renewal for all active conversations */
export async function renewWhatsAppSessions(): Promise<{renewed:number;checked:number}> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {},
      headers: { "x-action":"renew_sessions" },
    });
    if (error) throw error;
    return data || { renewed:0, checked:0 };
  } catch {
    return { renewed:0, checked:0 };
  }
}
