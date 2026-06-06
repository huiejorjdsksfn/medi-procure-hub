/**
 * SessionTokenLib v1.0 — EL5 MediProcure / ProcurBosse
 *
 * Client-side wrapper for the session-token edge function.
 * Issues a persistent token that stores the user's roles + profile,
 * so AuthContext can boot instantly without waiting for Supabase DB.
 *
 * Flow:
 *   1. On login → issue()     → stores token in localStorage
 *   2. On page load → validate() → returns cached roles instantly
 *   3. AuthContext still fires a parallel Supabase DB fetch for freshness
 *   4. On sign-out → revoke()   → invalidates token server-side
 *   5. Background refresh every TOKEN_REFRESH_MINS minutes
 */

import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY           = "el5_session_token_v1";
const TOKEN_REFRESH_MINS  = 30;

export interface SessionToken {
  token:      string;
  user_id:    string;
  roles:      string[];
  profile:    Record<string, any>;
  issued_at:  string;
  expires_at: string;
}

export interface TokenValidateResult {
  valid:      boolean;
  expired?:   boolean;
  user_id?:   string;
  roles?:     string[];
  profile?:   Record<string, any>;
  expires_at?: string;
  error?:     string;
}

// ── Storage helpers ─────────────────────────────────────────────
function saveToken(t: SessionToken): void {
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch {}
}

function loadToken(): SessionToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionToken;
  } catch { return null; }
}

function clearToken(): void {
  try { localStorage.removeItem(TOKEN_KEY); } catch {}
}

// ── Edge function caller ────────────────────────────────────────
async function callEdge(body: Record<string, string>): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke("session-token", { body });
    if (error) throw error;
    return data;
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Issues a new session token for the logged-in user.
 * Call this after a successful Supabase sign-in.
 */
export async function issueToken(): Promise<SessionToken | null> {
  const result = await callEdge({ action: "issue" });
  if (!result?.ok || !result?.token) return null;
  const token: SessionToken = {
    token:      result.token,
    user_id:    result.user_id,
    roles:      result.roles || [],
    profile:    result.profile || {},
    issued_at:  result.issued_at || new Date().toISOString(),
    expires_at: result.expires_at,
  };
  saveToken(token);
  return token;
}

/**
 * Reads the stored token and validates it against the edge function.
 * Returns null if no token, expired, or revoked.
 * Also returns the stored token immediately (offline-first) while validation runs.
 */
export async function validateToken(): Promise<TokenValidateResult> {
  const stored = loadToken();
  if (!stored) return { valid: false };

  // Quick local expiry check — avoids a network call if obviously expired
  if (new Date(stored.expires_at) < new Date()) {
    clearToken();
    return { valid: false, expired: true };
  }

  // Remote validation
  const result = await callEdge({ action: "validate", token: stored.token });
  if (!result?.ok) return { valid: false, error: result?.error };
  if (!result?.valid) {
    clearToken();
    return { valid: false, expired: result?.expired };
  }

  return {
    valid:      true,
    user_id:    result.user_id,
    roles:      result.roles,
    profile:    result.profile,
    expires_at: result.expires_at,
  };
}

/**
 * Returns the locally-stored token without a network call.
 * Useful for instant role-check on page load.
 */
export function getLocalToken(): SessionToken | null {
  const t = loadToken();
  if (!t) return null;
  if (new Date(t.expires_at) < new Date()) { clearToken(); return null; }
  return t;
}

/**
 * Refreshes the token — re-fetches roles from DB and extends expiry 24h.
 * Call this in the background every TOKEN_REFRESH_MINS minutes.
 */
export async function refreshToken(): Promise<boolean> {
  const stored = loadToken();
  if (!stored) return false;
  const result = await callEdge({ action: "refresh", token: stored.token });
  if (!result?.ok) return false;
  // Update local storage with fresh roles/profile
  saveToken({
    ...stored,
    roles:      result.roles || stored.roles,
    profile:    result.profile || stored.profile,
    expires_at: result.expires_at,
  });
  return true;
}

/**
 * Revokes the current token server-side and clears local storage.
 * Call on sign-out.
 */
export async function revokeToken(): Promise<void> {
  const stored = loadToken();
  clearToken();
  if (stored) {
    await callEdge({ action: "revoke", token: stored.token }).catch(() => {});
  }
}

/**
 * Revokes ALL tokens for the current user (force sign-out all devices).
 */
export async function revokeAllTokens(): Promise<void> {
  clearToken();
  await callEdge({ action: "revoke_all" }).catch(() => {});
}

// ── Auto-refresh interval ───────────────────────────────────────
let _refreshInterval: ReturnType<typeof setInterval> | null = null;

export function startTokenRefresh(): void {
  if (_refreshInterval) return;
  _refreshInterval = setInterval(() => {
    refreshToken().catch(() => {});
  }, TOKEN_REFRESH_MINS * 60 * 1000);
}

export function stopTokenRefresh(): void {
  if (_refreshInterval) {
    clearInterval(_refreshInterval);
    _refreshInterval = null;
  }
}
