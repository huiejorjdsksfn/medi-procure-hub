/**
 * EL5 MediProcure v5.8 - WhatsApp + Twilio Engine
 * Auto-renewal - Session management - Cross-platform delivery
 * ProcurBosse - Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";
import { sendSms, sendWhatsApp, TWILIO } from "@/lib/sms";

const db = supabase as any;

export { TWILIO as TWILIO_CONFIG };

export interface SendResult {
  ok: boolean;
  sid?: string;
  provider: string;
  error?: string;
  channel: "sms" | "whatsapp";
}

export interface SessionStatus {
  phone: string;
  active: boolean;
  lastMessage?: string;
  joinRequired: boolean;
}

/** Send via WhatsApp, fall back to SMS if session inactive */
export async function sendMessage(
  to: string, message: string,
  opts?: { channel?: "sms"|"whatsapp"; module?: string; recipientName?: string; department?: string }
): Promise<SendResult> {
  const channel = opts?.channel || "sms";
  const r = await sendSms({ to, message, channel, module: opts?.module, recipientName: opts?.recipientName, department: opts?.department });
  return {
    ok: r.ok,
    sid: r.results?.[0]?.sid,
    provider: r.results?.[0]?.provider || "twilio",
    error: r.results?.[0]?.error || r.error,
    channel,
  };
}

/** Send SMS with WhatsApp join instructions */
export async function sendJoinInstructions(to: string, name?: string): Promise<SendResult> {
  const msg = `EL5 MediProcure WhatsApp:\nSend "${TWILIO.JOIN_CODE}" to ${TWILIO.WA_NUMBER}\nOr: ${TWILIO.WA_LINK}`;
  const r = await sendSms({ to, message:msg, recipientName:name, module:"whatsapp_join" });
  return { ok:r.ok, sid:r.results?.[0]?.sid, provider:"twilio", channel:"sms" };
}

/** Get active WhatsApp sessions from sms_conversations */
export async function getActiveSessions(): Promise<SessionStatus[]> {
  const { data } = await db.from("sms_conversations")
    .select("phone_number,last_message_at,last_message,status")
    .eq("status","open")
    .order("last_message_at",{ascending:false})
    .limit(100);

  return (data||[]).map((c:any) => {
    const hoursSince = (Date.now() - new Date(c.last_message_at||0).getTime()) / 3600000;
    return {
      phone: c.phone_number,
      active: hoursSince < 72,
      lastMessage: c.last_message,
      joinRequired: hoursSince >= 72,
    };
  });
}

/** Trigger server-side session renewal */
export async function renewAllSessions(): Promise<{renewed:number;checked:number}> {
  try {
    const { data } = await supabase.functions.invoke("send-sms", {
      body: { action:"renew_sessions" },
    });
    return data || { renewed:0, checked:0 };
  } catch {
    return { renewed:0, checked:0 };
  }
}
