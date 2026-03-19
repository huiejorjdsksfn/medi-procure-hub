import { supabase } from "@/integrations/supabase/client";

export type NotifType = "info"|"success"|"warning"|"error"|"email"|"procurement"|"voucher"|"grn"|"tender"|"quality"|"inventory"|"system";

export interface NotifyPayload {
  userId?: string;
  title: string;
  message: string;
  type?: NotifType;
  module?: string;
  actionUrl?: string;
  senderId?: string;
  alsoInbox?: boolean;
  subject?: string;
  sendEmail?: boolean;   // also send real email via edge function
  toEmail?: string;      // external email to deliver to
}

/** Resolve email address from user profile */
async function getUserEmail(userId: string): Promise<string|null> {
  try {
    const {data} = await (supabase as any).from("profiles").select("email").eq("id",userId).maybeSingle();
    return data?.email || null;
  } catch { return null; }
}

/** Send email via Edge Function */
async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  try {
    const { error, data } = await supabase.functions.invoke("send-email", {
      body: {
        to, subject, body,
      }
    });
    // Log to email_logs
    await (supabase as any).from("email_logs").insert({
      to_email: to, subject,
      body, from_name: "EL5 MediProcure",
      from_email: "",
      status: !error && data?.success ? "sent" : "failed",
      module: "notify",
      sent_at: new Date().toISOString(),
      error_message: error?.message || data?.error || null,
    }).catch(()=>{});
    return !error && (data?.success !== false);
  } catch(e) { console.error("sendEmail error:", e); return false; }
}

/** Check if email notifications are enabled in settings */
async function emailEnabled(): Promise<boolean> {
  try {
    const {data} = await (supabase as any).from("system_settings").select("value").eq("key","email_notifications_enabled").maybeSingle();
    return data?.value === "true";
  } catch { return false; }
}

/** Insert a notification + optionally an inbox_item + optional real email */
export async function sendNotification(payload: NotifyPayload): Promise<void> {
  try {
    const notifRow: any = {
      title: payload.title,
      message: payload.message,
      type: payload.type || "info",
      module: payload.module || "system",
      action_url: payload.actionUrl || null,
      is_read: false,
      status: "delivered",
      sender_id: payload.senderId || null,
      subject: payload.subject || payload.title,
    };
    if (payload.userId) notifRow.user_id = payload.userId;

    const { data: notif, error } = await (supabase as any)
      .from("notifications").insert(notifRow).select("id").single();
    if (error) console.error("Notification insert:", error.message);

    // Inbox item
    if (payload.alsoInbox && payload.userId) {
      await (supabase as any).from("inbox_items").insert({
        type: payload.type || "info",
        subject: payload.subject || payload.title,
        body: payload.message,
        from_user_id: payload.senderId || null,
        to_user_id: payload.userId,
        priority: "normal",
        status: "unread",
        notification_id: notif?.id || null,
        module: payload.module || "system",
        record_type: payload.module || "system",
      });
    }

    // Real email delivery
    const shouldEmail = payload.sendEmail || payload.toEmail;
    if (shouldEmail) {
      const emailOk = await emailEnabled();
      if (emailOk) {
        const toEmail = payload.toEmail || (payload.userId ? await getUserEmail(payload.userId) : null);
        if (toEmail) {
          const body = `${payload.message}\n\n—\nEL5 MediProcure · Embu Level 5 Hospital\n${payload.actionUrl ? `View: ${window.location.origin}${payload.actionUrl}` : ""}`;
          await sendEmail(toEmail, payload.subject || payload.title, body);
        }
      }
    }
  } catch (e) {
    console.error("sendNotification error:", e);
  }
}

/** Send notification to all admin users */
export async function notifyAdmins(payload: Omit<NotifyPayload,"userId">): Promise<void> {
  try {
    const { data: admins } = await (supabase as any)
      .from("user_roles").select("user_id").eq("role","admin").limit(20);
    if (!admins?.length) return;
    await Promise.all(admins.map((a: any) => sendNotification({ ...payload, userId: a.user_id })));
  } catch (e) { console.error("notifyAdmins error:", e); }
}

/** Send notification to procurement managers + admins */
export async function notifyProcurement(payload: Omit<NotifyPayload,"userId">): Promise<void> {
  try {
    const { data: roles } = await (supabase as any)
      .from("user_roles").select("user_id,role")
      .in("role",["admin","procurement_manager"]).limit(30);
    if (!roles?.length) return;
    const unique = [...new Set(roles.map((r: any) => r.user_id))] as string[];
    await Promise.all(unique.map(uid => sendNotification({ ...payload, userId: uid })));
  } catch (e) { console.error("notifyProcurement error:", e); }
}

/** Send email notification to a specific external email + log it */
export async function sendExternalEmail(
  toEmail: string,
  subject: string,
  body: string,
  options?: { module?: string; senderId?: string }
): Promise<boolean> {
  const ok = await emailEnabled();
  if (!ok) {
    console.warn("Email notifications disabled in settings");
    return false;
  }
  return sendEmail(toEmail, subject, body);
}
