/**
 * useStampOverrides — live-synced custom stamp designs
 *
 * Reads `stamp_cfg_<status>` rows from system_settings (written by the Stamp
 * Design Studio, src/pages/StampDesignPage.tsx) and keeps every
 * <DocumentStamp/> instance across the app in sync via Supabase Realtime —
 * without this, customizing a stamp in the Studio had zero visible effect
 * anywhere else, since DocumentStamp only ever read its own hardcoded CFG.
 *
 * Mirrors the singleton/ref-counted channel pattern in useSystemSettings.ts:
 * DocumentStamp is rendered many times at once on some pages (the Stamps
 * gallery renders ~20 instances simultaneously, the Studio's "Preview All"
 * modal does too), so a naive per-instance `.channel().on().subscribe()`
 * would crash exactly the way the sys_settings_v6 bug did — see
 * useSystemSettings.ts for the full writeup of why.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StampOverride {
  ink?:        string;
  label?:      string;
  topArc?:     string;
  botArc?:     string;
  star?:       boolean;
  /** Outer ring + institution-name arc text colour (defaults to brand blue) */
  ringColor?:  string;
  /** Centre label + date block colour (defaults to brand red) */
  labelColor?: string;
  /** Base64 data URL (or external URL) of an admin-uploaded stamp image.
   *  When set, this image is drawn in place of the generated vector stamp,
   *  both on screen and in print. */
  imageUrl?:   string;
}

export type StampOverrides = Record<string, StampOverride>;

const KEY_PREFIX = "stamp_cfg_";

/* ── Module-level cache shared across all hook instances ── */
let _cache: StampOverrides | null = null;
const _listeners = new Set<(o: StampOverrides) => void>();

function notify(o: StampOverrides) {
  _cache = o;
  _listeners.forEach(fn => fn(o));
}

function parseRow(value: string | null | undefined): StampOverride | null {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

/* ── Module-level realtime channel singleton (see file header) ── */
let _channel: any = null;
let _channelRefCount = 0;

function acquireChannel() {
  _channelRefCount += 1;
  if (_channel) return;

  _channel = (supabase as any)
    .channel("stamp_cfg_sync_v1")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "system_settings" },
      (payload: any) => {
        const key: string | undefined = payload.new?.key ?? payload.old?.key;
        if (!key || !key.startsWith(KEY_PREFIX)) return;
        const status = key.slice(KEY_PREFIX.length);
        const base = _cache || {};

        if (payload.eventType === "DELETE" || !payload.new?.value) {
          if (!(status in base)) return;
          const next = { ...base };
          delete next[status];
          notify(next);
        } else {
          const parsed = parseRow(payload.new.value);
          if (parsed) notify({ ...base, [status]: parsed });
        }
      }
    )
    .subscribe();
}

function releaseChannel() {
  _channelRefCount = Math.max(0, _channelRefCount - 1);
  if (_channelRefCount === 0 && _channel) {
    (supabase as any).removeChannel(_channel);
    _channel = null;
  }
}

/* ── Hook ── */
export function useStampOverrides(): StampOverrides {
  const [overrides, setOverrides] = useState<StampOverrides>(_cache || {});

  useEffect(() => {
    const handler = (o: StampOverrides) => setOverrides(o);
    _listeners.add(handler);

    if (!_cache) {
      (supabase as any)
        .from("system_settings")
        .select("key,value")
        .like("key", `${KEY_PREFIX}%`)
        .then(({ data }: any) => {
          const map: StampOverrides = {};
          (data || []).forEach((row: any) => {
            const status = String(row.key).slice(KEY_PREFIX.length);
            const parsed = parseRow(row.value);
            if (parsed) map[status] = parsed;
          });
          notify(map);
        });
    }

    /* Realtime — ONE channel per tab, shared across every hook instance */
    acquireChannel();

    return () => { _listeners.delete(handler); releaseChannel(); };
  }, []);

  return overrides;
}
