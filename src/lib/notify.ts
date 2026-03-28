/**
 * ProcurBosse -- notify.ts v3.0
 * Unified notification dispatcher: in-app + SMS + external email
 * EL5 MediProcure -- Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";

export type NotifType =
  | "info" | "success" | "warning" | "error"
  | "email" | "procurement" | "voucher" | "grn"
  | "tender" | "quality" | "inventory" | "system"
  | "finance" | "budget" | "erp_sync";

export interface NotifyPayload {
  userId?:    string;       // recipient user ID (null = broadcast)
  title:      string;
  message:    string;
  type?:      NotifType;
  module?:    string;
  actionUrl?: string;
  senderId?:  string;
  alsoInbox?: boolean;      // also insert into inbox_items
  subject?:   string;       // email subject override
  sendEmail?: boolean;      // fire external email via edge function
  toEmail?:   string;       // explicit email address
  sendSms?:   boolean;      // fire SMS via edge function
  toPhone?:   string;       // explicit phone number
  smsMessage?: string;      // SMS-specific message (shorter than email)
  actionUrlFull?: string;   // full URL for email links
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const { data } = await (supabase as any).from("profiles")
      .select("email").eq("id", userId).maybeSingle();
    return data?.email || null;
  } catch { return null; }
}

async function getUserPhone(userId: string): Promise<string | null> {
  try {
    const { data } = await (supabase as any).from("profiles")
      .select("phone_number,sms_enabled").eq("id", userId).maybeSingle();
    if (data?.sms_enabled === false) return null;
    return data?.phone_number || null;
  } catch { return null; }
}

async function getSettingBool(key: string, defaultVal = false): Promise<boolean> {
  try {
    const { data } = await (supabase as any).from("system_settings")
      .select("value").eq("key", key).maybeSingle();
    if (!data?.value) return defaultVal;
    return data.value === "true";
  } catch { return defaultVal; }
}

// ── Edge function callers ─────────────────────────────────────────────────────

async function callSendEmail(to: string, subject: string, body: string, actionUrl?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: {
        to, subject, body,
        action_url: actionUrl
          ? (actionUrl.startsWith("http") ? actionUrl : `${window.location.origin}${actionUrl}`)
          : undefined,
      },
    });
    if (error) { console.warn("[notify] send-email error:", error.message); return false; }
    return data?.ok === true;
  } catch (e: any) { console.warn("[notify] send-email exception:", e.message); return false; }
}

async function callSendSms(to: string, message: string, module = "system"): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { to, message, module },
    });
    if (error) { console.warn("[notify] send-sms error:", error.message); return false; }
    return data?.ok === true;
  } catch (e: any) { console.warn("[notify] send-sms exception:", e.message); return false; }
}

// ── Core sendNotification ─────────────────────────────────────────────────────

export async function sendNotification(payload: NotifyPayload): Promise<void> {
  try {
    // 1. In-app notification row
    const notifRow: any = {
      title:      payload.title,
      message:    payload.message,
      type:       payload.type    || "info",
      module:     payload.module  || "system",
      action_url: payload.actionUrl || null,
      is_read:    false,
      status:     "delivered",
      sender_id:  payload.senderId || null,
      subject:    payload.subject  || payload.title,
      created_at: new Date().toISOString(),
    };
    if (payload.userId) notifRow.recipient_id = payload.userId;

    const { data: notif } = await (supabase as any)
      .from("notifications").insert(notifRow).select("id").single();

    // 2. Inbox item
    if (payload.alsoInbox && payload.userId) {
      await (supabase as any).from("inbox_items").insert({
        type:            payload.type || "info",
        subject:         payload.subject || payload.title,
        body:            payload.message,
        from_user_id:    payload.senderId || null,
        to_user_id:      payload.userId,
        priority:        "normal",
        status:          "unread",
        notification_id: notif?.id || null,
        module:          payload.module || "system",
        record_type:     payload.module || "system",
      }).catch(() => { /* non-fatal */ });
    }

    // 3. External email (SMTP via edge function)
    const emailEnabled = payload.sendEmail || !!payload.toEmail;
    if (emailEnabled) {
      const globalEmailOn = await getSettingBool("email_notifications_enabled", true);
      if (globalEmailOn) {
        const toEmail = payload.toEmail
          || (payload.userId ? await getUserEmail(payload.userId) : null);
        if (toEmail) {
          const body = `${payload.message}\n\n—\nEL5 MediProcure · Embu Level 5 Hospital`;
          await callSendEmail(
            toEmail,
            payload.subject || payload.title,
            body,
            payload.actionUrlFull || payload.actionUrl
          );
        }
      }
    }

    // 4. SMS
    const smsEnabled = payload.sendSms || !!payload.toPhone;
    if (smsEnabled) {
      const globalSmsOn = await getSettingBool("sms_notifications_enabled", false);
      if (globalSmsOn) {
        const toPhone = payload.toPhone
          || (payload.userId ? await getUserPhone(payload.userId) : null);
        if (toPhone) {
          const smsMsg = payload.smsMessage || `${payload.title}: ${payload.message}`.slice(0, 140);
          await callSendSms(toPhone, smsMsg, payload.module || "system");
        }
      }
    }

  } catch (e: any) {
    console.error("[notify] sendNotification error:", e.message);
  }
}

// ── Bulk helpers ──────────────────────────────────────────────────────────────

export async function notifyAdmins(payload: Omit<NotifyPayload, "userId">): Promise<void> {
  try {
    const { data } = await (supabase as any)
      .from("user_roles").select("user_id").eq("role", "admin").limit(20);
    if (!data?.length) return;
    await Promise.all(data.map((a: any) => sendNotification({ ...payload, userId: a.user_id })));
  } catch (e: any) { console.warn("[notify] notifyAdmins:", e.message); }
}

export async function notifyProcurement(payload: Omit<NotifyPayload, "userId">): Promise<void> {
  try {
    const { data } = await (supabase as any)
      .from("user_roles").select("user_id,role")
      .in("role", ["admin","procurement_manager"]).limit(30);
    if (!data?.length) return;
    const unique = [...new Set(data.map((r: any) => r.user_id))] as string[];
    await Promise.all(unique.map(uid => sendNotification({ ...payload, userId: uid })));
  } catch (e: any) { console.warn("[notify] notifyProcurement:", e.message); }
}

export async function notifyAccountants(payload: Omit<NotifyPayload, "userId">): Promise<void> {
  try {
    const { data } = await (supabase as any)
      .from("user_roles").select("user_id")
      .in("role", ["admin","accountant"]).limit(20);
    if (!data?.length) return;
    const unique = [...new Set(data.map((r: any) => r.user_id))] as string[];
    await Promise.all(unique.map(uid => sendNotification({ ...payload, userId: uid })));
  } catch (e: any) { console.warn("[notify] notifyAccountants:", e.message); }
}

export async function notifyRole(roles: string[], payload: Omit<NotifyPayload, "userId">): Promise<void> {
  try {
    const { data } = await (supabase as any)
      .from("user_roles").select("user_id").in("role", roles).limit(30);
    if (!data?.length) return;
    const unique = [...new Set(data.map((r: any) => r.user_id))] as string[];
    await Promise.all(unique.map(uid => sendNotification({ ...payload, userId: uid })));
  } catch (e: any) { console.warn("[notify] notifyRole:", e.message); }
}

// ── External email shorthand ──────────────────────────────────────────────────

export async function sendExternalEmail(
  toEmail: string,
  subject: string,
  body: string,
  options?: { module?: string; actionUrl?: string }
): Promise<boolean> {
  const enabled = await getSettingBool("email_notifications_enabled", true);
  if (!enabled) { console.warn("[notify] Email notifications disabled in settings"); return false; }
  return callSendEmail(toEmail, subject, body, options?.actionUrl);
}

// ── SMS shorthand ─────────────────────────────────────────────────────────────

export async function sendSmsTo(
  toPhone: string,
  message: string,
  module = "system"
): Promise<boolean> {
  const enabled = await getSettingBool("sms_notifications_enabled", false);
  if (!enabled) { console.warn("[notify] SMS notifications disabled in settings"); return false; }
  return callSendSms(toPhone, message, module);
}

// ── Trigger notify-requisition edge function ──────────────────────────────────

export async function triggerRequisitionEvent(
  event: "submitted" | "approved" | "rejected" | "ordered" | "received",
  requisitionId: string,
  options?: { approvedBy?: string; rejectedReason?: string }
): Promise<void> {
  try {
    await supabase.functions.invoke("notify-requisition", {
      body: {
        event,
        requisition_id: requisitionId,
        approved_by:    options?.approvedBy,
        rejected_reason: options?.rejectedReason,
      },
    });
  } catch (e: any) { console.warn("[notify] triggerRequisitionEvent:", e.message); }
}

export async function triggerVoucherEvent(
  event: "voucher_approved" | "voucher_paid",
  voucherId: string
): Promise<void> {
  try {
    await supabase.functions.invoke("notify-requisition", {
      body: { event, voucher_id: voucherId },
    });
  } catch (e: any) { console.warn("[notify] triggerVoucherEvent:", e.message); }
}

export async function triggerGrnEvent(grnId: string): Promise<void> {
  try {
    await supabase.functions.invoke("notify-requisition", {
      body: { event: "grn_created", grn_id: grnId },
    });
  } catch (e: any) { console.warn("[notify] triggerGrnEvent:", e.message); }
}
