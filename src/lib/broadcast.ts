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
 * Module-level reference to the long-lived listener channel created by
 * `subscribeToBroadcasts` (SystemBroadcastBanner mounts this once, globally,
 * inside AppLayout). The sender and listener must share the exact topic name
 * "system-broadcast" — that's how Supabase Realtime broadcast delivers a
 * message to listening clients — but `supabase.channel()` returns that SAME
 * shared channel object to the sender too, since it's already registered for
 * this topic. Without this tracking, `broadcastToAll` would unconditionally
 * `removeChannel()` the banner's own listener after every send, silently
 * killing the admin's broadcast reception until their next page reload.
 */
let _listenerChannel: any = null;

/**
 * Send a live broadcast to all connected users via Supabase Realtime
 */
export async function broadcastToAll(payload: BroadcastPayload): Promise<void> {
  const ownedTemporaryChannel = !_listenerChannel;
  const channel = _listenerChannel || (supabase as any).channel("system-broadcast");
  await channel.send({
    type: "broadcast",
    event: "system_alert",
    payload: {
      ...payload,
      timestamp: new Date().toISOString(),
      expiresIn: payload.expiresIn ?? 30,
    },
  });
  // Only tear down the channel if we created it just for this send — if a
  // listener (e.g. SystemBroadcastBanner) already owns it, leave it alone.
  if (ownedTemporaryChannel) await (supabase as any).removeChannel(channel);
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
  _listenerChannel = channel;
  return () => {
    if (_listenerChannel === channel) _listenerChannel = null;
    (supabase as any).removeChannel(channel);
  };
}
