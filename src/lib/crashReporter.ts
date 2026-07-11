/**
 * Crash reporter — persists runtime errors caught by ErrorBoundary or the
 * global window.onerror listener to public.crash_reports so admins can
 * triage recent incidents from /admin/crash-reports. All writes are
 * best-effort; a failure to log a crash must never itself crash the app.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CrashPayload {
  message: string;
  stack?: string;
  component_stack?: string;
  page_name?: string;
}

const LS_KEY = "el5_crash_log";
const MAX_LOCAL = 20;

function pushLocal(entry: any) {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    arr.push(entry);
    while (arr.length > MAX_LOCAL) arr.shift();
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    /* ignore quota */
  }
}

export function getLocalCrashes(): any[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearLocalCrashes() {
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

export async function reportCrash(p: CrashPayload): Promise<void> {
  const now = new Date().toISOString();
  const path = typeof window !== "undefined" ? window.location.hash || window.location.pathname : "";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const correlation_id = (() => {
    try { return sessionStorage.getItem("el5_correlation_id") || ""; } catch { return ""; }
  })();
  const session_id = (() => {
    try { return sessionStorage.getItem("el5_session_id") || ""; } catch { return ""; }
  })();

  let user_id: string | null = null;
  let user_email: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user_id = data?.user?.id ?? null;
    user_email = data?.user?.email ?? null;
  } catch { /* signed out */ }

  const row = {
    user_id,
    user_email,
    path,
    page_name: p.page_name || null,
    message: (p.message || "unknown").slice(0, 2000),
    stack: p.stack ? p.stack.slice(0, 8000) : null,
    component_stack: p.component_stack ? p.component_stack.slice(0, 4000) : null,
    user_agent: ua,
    correlation_id: correlation_id || null,
    session_id: session_id || null,
  };

  pushLocal({ ts: now, ...row });

  try {
    await (supabase as any).from("crash_reports").insert(row);
  } catch (e) {
    // Silently swallow — the local log is our fallback.
    console.warn("[crashReporter] Supabase insert failed", e);
  }
}

let installed = false;
export function installGlobalCrashHandlers() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (ev) => {
    if (!ev?.message) return;
    reportCrash({
      message: ev.message,
      stack: ev.error?.stack,
      page_name: "window.onerror",
    });
  });
  window.addEventListener("unhandledrejection", (ev: any) => {
    const reason = ev?.reason;
    reportCrash({
      message: typeof reason === "string" ? reason : (reason?.message || "Unhandled promise rejection"),
      stack: reason?.stack,
      page_name: "unhandledrejection",
    });
  });
}