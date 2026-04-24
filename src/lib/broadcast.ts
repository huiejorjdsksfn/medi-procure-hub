/**
 * EL5 MediProcure - Live System Broadcast
 * Sends real-time admin messages to all connected users
 * Uses Supabase Realtime channel broadcasts + notifications table
 */
import { supabase } from "@/integrations/supabase/client";

export type BroadcastType = "info" | "warning" | "success" | "error" | "maintenance" | "announcement";

export interface BroadcastPayload {
  title: string;
  message: string;
  type: BroadcastType;
  actionUrl?: string;
  expiresIn?: number; // seconds, default 30
  senderId?: string;
  senderName?: string;
}

/**
 * Send a live broadcast to all connected users via Supabase Realtime
 */
export async function broadcastToAll(payload: BroadcastPayload): Promise<void> {
  const channel = (supabase as any).channel("system-broadcast");
  await channel.send({
    type: "broadcast",
    event: "system_alert",
    payload: {
      ...payload,
      timestamp: new Date().toISOString(),
      expiresIn: payload.expiresIn ?? 30,
    },
  });
  await (supabase as any).removeChannel(channel);
}

/**
 * Persist broadcast to notifications table for all users
 */
export async function persistBroadcast(
  payload: BroadcastPayload,
  senderId?: string
): Promise<void> {
  // Get all user IDs
  const { data: users } = await (supabase as any)
    .from("profiles")
    .select("id")
    .limit(500);
  if (!users?.length) return;

  const rows = users.map((u: any) => ({
    user_id: u.id,
    title: payload.title,
    message: payload.message,
    type: payload.type === "maintenance" ? "warning" : payload.type,
    module: "system",
    action_url: payload.actionUrl || null,
    is_read: false,
    status: "delivered",
    sender_id: senderId || null,
    subject: payload.title,
  }));

  // Insert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    await (supabase as any).from("notifications").insert(rows.slice(i, i + 50));
  }
}

/**
 * Send a complete broadcast - realtime + persisted to notifications
 */
export async function sendSystemBroadcast(
  payload: BroadcastPayload,
  options: { persist?: boolean; realtime?: boolean } = { persist: true, realtime: true }
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (options.realtime !== false) tasks.push(broadcastToAll(payload));
  if (options.persist !== false)  tasks.push(persistBroadcast(payload, payload.senderId));
  await Promise.allSettled(tasks);
}

/**
 * Hook: subscribe to system broadcasts in real time
 */
export function subscribeToBroadcasts(
  callback: (payload: BroadcastPayload & { timestamp: string }) => void
) {
  const channel = (supabase as any)
    .channel("system-broadcast")
    .on("broadcast", { event: "system_alert" }, ({ payload }: any) => {
      callback(payload);
    })
    .subscribe();
  return () => (supabase as any).removeChannel(channel);
}
