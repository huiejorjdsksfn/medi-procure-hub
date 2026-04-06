/**
 * EL5 MediProcure v5.8 — Universal Realtime Hook
 * Zero-config Supabase realtime with auto-reconnect and debounce
 * Cross-platform: Web + Electron + PWA
 */
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type RealtimeTable = string;
type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface RealtimeConfig {
  tables: RealtimeTable[];
  events?: RealtimeEvent;
  debounceMs?: number;
  schema?: string;
}

/**
 * Subscribe to Supabase realtime changes for one or more tables.
 * Automatically debounces rapid changes, reconnects on network restore.
 * @example
 *   useRealtime({ tables: ["requisitions","purchase_orders"] }, fetchData);
 */
export function useRealtime(config: RealtimeConfig, callback: () => void): void {
  const cbRef  = useRef(callback);
  const timer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);

  cbRef.current = callback;

  const debounced = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { cbRef.current(); }, config.debounceMs ?? 300);
  }, [config.debounceMs]);

  useEffect(() => {
    const { tables, events = "*", schema = "public" } = config;
    const chName = `rt_${tables.join("_")}_${Date.now()}`;

    let ch = (supabase as any).channel(chName);
    for (const table of tables) {
      ch = ch.on("postgres_changes", { event: events, schema, table }, debounced);
    }
    ch.subscribe((status: string) => {
      if (status === "SUBSCRIBED") channelRef.current = ch;
    });

    // Reconnect on network restore
    const onOnline = () => { debounced(); };
    window.addEventListener("online", onOnline);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener("online", onOnline);
      (supabase as any).removeChannel(ch);
    };
  }, [config.tables.join(","), debounced]);
}

/**
 * Simple version for a single table
 */
export function useTableRealtime(table: string, callback: () => void, debounceMs = 300): void {
  useRealtime({ tables: [table], debounceMs }, callback);
}

/**
 * Presence hook — track online users
 */
export function usePresence(roomId: string, userId: string) {
  useEffect(() => {
    const ch = (supabase as any).channel(`presence:${roomId}`)
      .on("presence", { event: "sync" }, () => { /* handle presence sync */ })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await ch.track({ user_id: userId, online_at: new Date().toISOString() });
        }
      });
    return () => { (supabase as any).removeChannel(ch); };
  }, [roomId, userId]);
}
