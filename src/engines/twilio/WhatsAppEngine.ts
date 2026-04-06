/**
 * EL5 MediProcure v5.8 — WhatsApp & Twilio Bad-Machine Engine
 * Auto-renews sandbox sessions, manages conversation state, cross-platform delivery
 * ProcurBosse · Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";
import { cacheEngine } from "@/engines/cache/CascadeCacheEngine";

const db = supabase as any;

export const TWILIO_CONFIG = {
  SMS_NUMBER:   "+16812972643",
  WA_NUMBER:    "+14155238886",
  JOIN_CODE:    "join bad-machine",
  MSG_SVC_SID:  "MG2fffc3a381c44a202c316dcc6400707d",
  SERVICE_NAME: "EL5H",
  WA_LINK:      "https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine&type=phone_number&app_absent=0",
  VOICE_WEBHOOK:"https://demo.twilio.com/welcome/voice/",
};

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
  lastMessageAt?: string;
  renewedAt?: string;
  expiresAt?: string;
}

/** Core send function — routes to Edge Function */
export async function sendMessage(
  phone: string,
  message: string,
  opts: { channel?: "sms"|"whatsapp"; name?: string; dept?: string; module?: string }
): Promise<SendResult> {
  const cached = cacheEngine.get<boolean>(`wa:session:${phone}`);
  
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: {
      to: phone,
      message,
      channel: opts.channel || "sms",
      recipient_name: opts.name,
      department: opts.dept,
      module: opts.module,
    },
  });

  if (error) return { ok: false, error: error.message, provider: "twilio", channel: opts.channel || "sms" };

  const result = data?.results?.[0];
  if (result?.ok && opts.channel === "whatsapp") {
    cacheEngine.set(`wa:session:${phone}`, true, { ttl: 21600 }); // 6hr cache
  }

  return {
    ok: data?.ok || false,
    sid: result?.sid,
    provider: result?.provider || "twilio",
    error: result?.error,
    channel: opts.channel || "sms",
  };
}

/** Renew all WhatsApp sessions via Edge Function */
export async function renewAllSessions(): Promise<{ renewed: number; checked: number }> {
  const { data, error } = await supabase.functions.invoke("send-sms", {
    body: {},
  });
  // Call with action param
  const resp = await fetch(`${(supabase as any).supabaseUrl}/functions/v1/send-sms?action=renew_sessions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${(supabase as any).supabaseKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  if (resp.ok) {
    const result = await resp.json();
    return { renewed: result.renewed || 0, checked: result.checked || 0 };
  }
  return { renewed: 0, checked: 0 };
}

/** Check if a phone has an active WhatsApp session */
export async function checkSession(phone: string): Promise<SessionStatus> {
  const cached = cacheEngine.get<SessionStatus>(`wa:status:${phone}`);
  if (cached) return cached;

  const { data } = await db.from("sms_conversations")
    .select("phone_number,last_message_at,status")
    .eq("phone_number", phone)
    .single();

  const lastMsgAt = data?.last_message_at;
  const hoursSince = lastMsgAt
    ? (Date.now() - new Date(lastMsgAt).getTime()) / 3600000
    : Infinity;

  const status: SessionStatus = {
    phone,
    active: !!data && hoursSince < 24,
    lastMessageAt: lastMsgAt,
    expiresAt: lastMsgAt ? new Date(new Date(lastMsgAt).getTime() + 24*3600000).toISOString() : undefined,
  };

  cacheEngine.set(`wa:status:${phone}`, status, { ttl: 300 });
  return status;
}

/** Get sandbox join link with pre-filled message */
export function getJoinLink(): string { return TWILIO_CONFIG.WA_LINK; }

/** Get WhatsApp deep link to start conversation */
export function getDirectLink(phone: string, message?: string): string {
  const clean = phone.replace(/[^\d+]/g, "");
  const encoded = message ? `&text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${clean.replace("+", "")}${encoded}`;
}

/** Send bulk WhatsApp with session check + fallback to SMS */
export async function sendBulkWithFallback(
  contacts: { phone: string; name?: string }[],
  message: string,
  opts: { dept?: string; module?: string } = {}
): Promise<{ sent: number; failed: number; smsTotal: number; waTotal: number }> {
  let sent = 0, failed = 0, smsTotal = 0, waTotal = 0;

  for (const contact of contacts) {
    const session = await checkSession(contact.phone);
    const channel = session.active ? "whatsapp" : "sms";
    
    const result = await sendMessage(contact.phone, message, {
      channel, name: contact.name, ...opts
    });

    if (result.ok) {
      sent++;
      if (channel === "whatsapp") waTotal++; else smsTotal++;
    } else {
      // Fallback: try SMS if WhatsApp failed
      if (channel === "whatsapp") {
        const fallback = await sendMessage(contact.phone, message, { channel: "sms", name: contact.name, ...opts });
        if (fallback.ok) { sent++; smsTotal++; } else failed++;
      } else {
        failed++;
      }
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 150));
  }

  return { sent, failed, smsTotal, waTotal };
}

/** Schedule periodic session renewal (run every 22 hours) */
export function setupSessionRenewal(): () => void {
  const run = async () => {
    const result = await renewAllSessions();
    console.log(`[WhatsApp Engine] Renewed ${result.renewed}/${result.checked} sessions`);
  };

  run(); // Run immediately
  const interval = setInterval(run, 22 * 3600 * 1000); // Every 22 hours
  return () => clearInterval(interval);
}

/** Format phone to E.164 */
export function formatPhone(raw: string): string {
  const n = raw.replace(/[\s\-\(\)\.]/g, "");
  if (n.startsWith("07") || n.startsWith("01")) return "+254" + n.slice(1);
  if (n.startsWith("254") && !n.startsWith("+")) return "+" + n;
  if (!n.startsWith("+")) return "+254" + n;
  return n;
}

/** Get Twilio service status */
export async function getServiceStatus(): Promise<{
  smsActive: boolean; waActive: boolean; msgSid: string; lastRenewal?: string;
}> {
  const { data } = await db.from("system_settings").select("key,value")
    .in("key", ["twilio_enabled","whatsapp_sandbox_active","whatsapp_last_renewal"]);
  
  const map: Record<string,string> = {};
  (data||[]).forEach((r:any) => { map[r.key] = r.value; });

  return {
    smsActive: map.twilio_enabled !== "false",
    waActive:  map.whatsapp_sandbox_active === "true",
    msgSid:    TWILIO_CONFIG.MSG_SVC_SID,
    lastRenewal: map.whatsapp_last_renewal,
  };
}
