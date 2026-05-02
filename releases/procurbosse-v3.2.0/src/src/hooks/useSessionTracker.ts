/**
 * useSessionTracker  -- ProcurBosse v8.0
 * Automatically maintains a live session heartbeat for each authenticated user
 * and provides a logAction() helper for recording user actions.
 *
 * Usage: Call useSessionTracker() once in AppLayout or AuthContext.
 *        Use logAction() anywhere to record user actions.
 *
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 */
import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

// Generate a stable session token for this browser tab
const SESSION_TOKEN_KEY = "pb_session_token";
function getOrCreateToken(): string {
  let token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  }
  return token;
}

// Map route paths to module names
function pathToModule(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0] || "dashboard";
  const MAP: Record<string, string> = {
    dashboard: "dashboard",
    requisitions: "requisitions",
    "purchase-orders": "purchase_orders",
    inventory: "inventory",
    suppliers: "suppliers",
    tenders: "tenders",
    contracts: "contracts",
    vouchers: "vouchers",
    reports: "reports",
    admin: "admin",
    settings: "settings",
    users: "users",
    documents: "documents",
    notifications: "notifications",
    sms: "sms",
    email: "email",
    telephony: "telephony",
    webmaster: "webmaster",
    "audit-log": "audit",
    "goods-received": "goods_received",
    "procurement-planning": "procurement_planning",
    accountant: "accountant",
  };
  return MAP[first] || first;
}

export interface ActionPayload {
  action_type?: string;
  action: string;
  module?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

// Global action logger  -- can be used without hook
let _sessionId: string | null = null;
let _userId: string | null = null;

export async function logAction(payload: ActionPayload): Promise<void> {
  if (!_userId) return;
  try {
    await db.from("user_action_log").insert({
      user_id: _userId,
      session_id: _sessionId,
      action_type: payload.action_type || "click",
      module: payload.module || "unknown",
      action: payload.action,
      entity_type: payload.entity_type || null,
      entity_id: payload.entity_id || null,
      metadata: payload.metadata || {},
    });
  } catch {
    // Silently fail  -- logging must never break the app
  }
}

export function useSessionTracker() {
  const { user } = useAuth();
  const location = useLocation();
  const sessionId = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = useRef<string>(getOrCreateToken());
  const lastPage = useRef<string>("");

  // Upsert session via RPC
  const upsertSession = useCallback(
    async (page: string, mod: string) => {
      if (!user?.id) return;
      try {
        const { data, error } = await db.rpc("upsert_session", {
          p_token: token.current,
          p_page: page,
          p_module: mod,
          p_ip: null,
          p_user_agent: navigator.userAgent,
        });
        if (!error && data) {
          sessionId.current = data;
          _sessionId = data;
        }
      } catch {
        // Silent  -- RPC may not exist yet if migration hasn't run
      }
    },
    [user?.id]
  );

  // Log page view when route changes
  useEffect(() => {
    if (!user?.id) return;
    _userId = user.id;
    const page = location.pathname;
    const mod = pathToModule(page);

    if (page !== lastPage.current) {
      lastPage.current = page;
      upsertSession(page, mod);
      // Log page_view action
      logAction({
        action_type: "page_view",
        action: `Visited ${page}`,
        module: mod,
      });
    }
  }, [location.pathname, user?.id, upsertSession]);

  // Heartbeat every 60s to keep session alive
  useEffect(() => {
    if (!user?.id) return;
    _userId = user.id;

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      upsertSession(lastPage.current || location.pathname, pathToModule(location.pathname));
    }, 60_000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user?.id, upsertSession, location.pathname]);

  // Mark session disconnected on page close
  useEffect(() => {
    const handleUnload = () => {
      if (!user?.id) return;
      // Use sendBeacon for reliability on page close
      const payload = JSON.stringify({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
      });
      // Best-effort REST update via beacon
      navigator.sendBeacon?.(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?session_token=eq.${token.current}`,
        new Blob([payload], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [user?.id]);

  return { logAction, sessionId: sessionId.current };
}
