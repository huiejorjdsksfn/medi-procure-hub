/**
 * EL5 MediProcure v10.0 — Supabase Client
 * Optimised: persistent session, parallel fetching, role cache, 15s timeouts
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const URL  = import.meta.env.VITE_SUPABASE_URL  || "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// Custom fetch with 15s timeout
const timedFetch: typeof fetch = (url, options) => {
  const ctrl = new AbortController();
  const id   = setTimeout(() => ctrl.abort(), 15000);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

export const supabase = createClient<Database>(URL, ANON, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  global: {
    headers: { "x-client": "procurbosse-v10" },
    fetch:   timedFetch,
  },
  realtime: { params: { eventsPerSecond: 8 } },
  db: { schema: "public" },
});

// Untyped alias for tables not yet in generated types
export const db = supabase as ReturnType<typeof createClient>;

// ── Auth cache (20-min TTL) ───────────────────────────────────────
const CACHE_KEY = "el5_auth_v10";
const CACHE_TTL = 10 * 60 * 1000; // 10 min — shorter window so role changes propagate faster

export interface AuthCache { userId: string; profile: any; roles: string[]; ts: number; }

export const authCache = {
  get(uid: string): AuthCache | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c: AuthCache = JSON.parse(raw);
      if (c.userId !== uid || Date.now() - c.ts > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY); return null;
      }
      return c;
    } catch { return null; }
  },
  set(uid: string, profile: any, roles: string[]) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: uid, profile, roles, ts: Date.now() })); }
    catch { /* quota */ }
  },
  clear() { localStorage.removeItem(CACHE_KEY); },
};

// ── Parallel profile + roles fetch ───────────────────────────────
export async function fetchUserData(uid: string): Promise<{ profile: any; roles: string[] }> {
  const [pRes, rRes] = await Promise.allSettled([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", uid),
  ]);

  const profile = pRes.status === "fulfilled" ? pRes.value.data : null;
  const rawRoles = rRes.status === "fulfilled" ? (rRes.value.data as any[] || []).map((r: any) => r.role) : [];

  // RESILIENCE: if DB returned 0 roles for a known user, fall back to cache
  // so transient RLS hiccups don't clear the UI
  let roles = rawRoles;
  if (roles.length === 0) {
    const cached = authCache.get(uid);
    if (cached && cached.roles.length > 0) {
      console.warn("[Auth] DB returned 0 roles — using cache fallback");
      roles = cached.roles;
    }
  }

  // Always write to cache so page refreshes restore roles instantly from localStorage
  if (roles.length > 0) authCache.set(uid, profile, roles);
  return { profile, roles };
}