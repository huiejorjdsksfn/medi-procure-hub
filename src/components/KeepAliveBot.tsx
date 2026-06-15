/**
 * EL5 MediProcure — KeepAliveBot (Frontend) v2.0
 *
 * Runs entirely in the browser and:
 *  1. Pings the Supabase keepalive-bot Edge Function every 4 minutes
 *  2. Pings the hosted site (self) every 8 minutes so Netlify/Vercel/Render
 *     free-tier dyno never goes cold
 *  3. Triggers a Background Sync tag when the service worker is available
 *  4. Registers background sync on every successful activity
 *  5. Shows no UI — pure side-effect component
 *
 * Mount once in App.tsx inside <AuthProvider>:
 *   <KeepAliveBot />
 *
 * ProcurBosse · Embu Level 5 Hospital
 */

import { useEffect, useRef } from "react";

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL   = "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON_KEY       =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";
const BACKEND_PING_MS  = 4 * 60 * 1000;   // 4 minutes
const SITE_PING_MS     = 8 * 60 * 1000;   // 8 minutes
const JITTER_MS        = 30_000;           // ±30 s jitter so pings don't stack

// ── Helpers ──────────────────────────────────────────────────────────────────
function jitter(base: number) {
  return base + Math.random() * JITTER_MS - JITTER_MS / 2;
}

async function pingBackend(): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/keepalive-bot?action=ping`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey":        ANON_KEY,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch { /* silent — network may be offline */ }
}

async function pingSelf(): Promise<void> {
  try {
    // A HEAD request to the current origin is enough to keep CDN/dynos warm
    await fetch(window.location.origin + "/manifest.json", {
      method: "GET",
      cache:  "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch { /* silent */ }
}

async function triggerBgSync(): Promise<void> {
  try {
    if ("serviceWorker" in navigator && "SyncManager" in window) {
      const reg = await navigator.serviceWorker.ready;
      // @ts-ignore — SyncManager not yet fully typed in TS lib
      await reg.sync.register("el5-keepalive");
    }
  } catch { /* sync not supported on this browser */ }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function KeepAliveBot() {
  const backendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const siteTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Backend keepalive ──────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function schedulePing() {
      if (!mounted) return;
      await pingBackend();
      await triggerBgSync();
      backendTimer.current = setTimeout(schedulePing, jitter(BACKEND_PING_MS));
    }

    // Initial ping after 10s to avoid blocking first render
    backendTimer.current = setTimeout(schedulePing, 10_000);

    return () => {
      mounted = false;
      if (backendTimer.current) clearTimeout(backendTimer.current);
    };
  }, []);

  // ── Site (hosting) keepalive ───────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    async function scheduleSitePing() {
      if (!mounted) return;
      await pingSelf();
      siteTimer.current = setTimeout(scheduleSitePing, jitter(SITE_PING_MS));
    }

    // Stagger site ping after 30s
    siteTimer.current = setTimeout(scheduleSitePing, 30_000);

    return () => {
      mounted = false;
      if (siteTimer.current) clearTimeout(siteTimer.current);
    };
  }, []);

  // ── Visibility API: resume when tab becomes active ─────────────────────────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        // Immediately re-ping on tab focus (covers long-idle tabs)
        pingBackend().catch(() => {});
        pingSelf().catch(()   => {});
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null; // headless
}
