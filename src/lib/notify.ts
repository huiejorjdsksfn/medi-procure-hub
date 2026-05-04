import { supabase } from "@/integrations/supabase/client";

export type NotifType = "info"|"success"|"warning"|"error"|"email"|"procurement"|"voucher"|"grn"|"tender"|"quality"|"inventory"|"system";

export interface NotifyPayload {
  userId?: string;        // target user (null = all admins)
  title: string;
  message: string;
  type?: NotifType;
  module?: string;
  actionUrl?: string;
  senderId?: string;
}

/** Insert a notification record into the notifications table */
export async function sendNotification(payload: NotifyPayload): Promise<void> {
  try {
    const row: any = {
      title: payload.title,
      message: payload.message,
      type: payload.type || "info",
      module: payload.module || "system",
      action_url: payload.actionUrl || null,
      is_read: false,
      sender_id: payload.senderId || null,
      status: "delivered",
    };
    if (payload.userId) row.user_id = payload.userId;

    const { error } = await (supabase as any).from("notifications").insert(row);
    if (error) console.error("Notification insert failed:", error.message);
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
