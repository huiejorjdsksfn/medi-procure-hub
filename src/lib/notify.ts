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
  alsoInbox?: boolean;   // if true, also inserts an inbox_item
  subject?: string;      // for inbox subject
}

/** Insert a notification + optionally an inbox_item */
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
    };
    if (payload.userId) notifRow.user_id = payload.userId;

    const { data: notif, error } = await (supabase as any)
      .from("notifications").insert(notifRow).select("id").single();
    if (error) console.error("Notification insert:", error.message);

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
  } catch (e) {
    console.error("notifyAdmins error:", e);
  }
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
  } catch (e) {
    console.error("notifyProcurement error:", e);
  }
}
