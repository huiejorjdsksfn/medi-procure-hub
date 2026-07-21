/**
 * EL5 MediProcure v10.0 — Supabase Client
 * Optimised: persistent session, parallel fetching, role cache, 15s timeouts
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const URL  = import.meta.env.VITE_SUPABASE_URL  || "https://yvjfehnzbzjliizjvuhq.supabase.co";
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

// Custom fetch with a route-aware timeout. A flat 15s ceiling was being
// applied to EVERY request through this client — including calls to Claude's
// vision API via edge functions (theme-extract) and PATCHes carrying an
// embedded base64 logo image (branding save). Both routinely take longer
// than 15s, so they were being killed by our OWN AbortController before the
// server had a chance to respond — producing "Failed to send a request to
// the Edge Function" and "AbortError: signal is aborted without reason"
// respectively. Neither was a backend bug; both were us cutting ourselves off.
const DEFAULT_TIMEOUT_MS = 20000;   // plain reads/writes
const RETRY_TIMEOUT_MS = 35000;     // second attempt gets more slack
const SLOW_ROUTE_TIMEOUT_MS = 75000; // edge functions (AI calls) + storage uploads
const SLOW_ROUTE_PATTERN = /\/functions\/v1\/|\/storage\/v1\//;

function isAbortTimeout(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || /timed out/i.test(e.message));
}

async function fetchOnce(url: RequestInfo | URL, options: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const href = typeof url === "string" ? url : url.toString();
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(new Error(`Request timed out after ${timeoutMs / 1000}s: ${href}`)), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Supabase's connection pooler occasionally stalls for a few seconds on an
 * otherwise-healthy project (seen directly while debugging: a trivial
 * catalog query timed out once, then succeeded instantly on the very next
 * try). Previously a single 20s AbortController killed the request outright
 * with no recovery — "Save failed: Request timed out after 20s" on a normal
 * small PATCH that had nothing wrong with it. Now a timeout gets exactly one
 * retry with a longer window before it's treated as a real failure. GET
 * requests are always safe to retry; POST/PATCH/DELETE are retried too since
 * every write in this app either targets a row by primary key (safe to
 * repeat) or is guarded by a unique constraint / ON CONFLICT — a genuine
 * duplicate-submit risk is far smaller than the cost of failing writes on a
 * transient blip.
 */
async function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const href = typeof url === "string" ? url : url.toString();
  const timeoutMs = SLOW_ROUTE_PATTERN.test(href) ? SLOW_ROUTE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  try {
    return await fetchOnce(url, options, timeoutMs);
  } catch (e) {
    if (!isAbortTimeout(e)) throw e;
    console.warn(`[supabase] timed out once, retrying: ${href}`);
    return fetchOnce(url, options, SLOW_ROUTE_PATTERN.test(href) ? SLOW_ROUTE_TIMEOUT_MS : RETRY_TIMEOUT_MS);
  }
}

/**
 * Self-heal for PostgREST's "Could not find the 'X' column of 'Y' in the
 * schema cache" failure (PGRST204, or PGRST205 for a whole table). This has
 * repeatedly hit production for a specific, well-understood reason: a
 * migration adds a column, but PostgREST's own cached introspection of the
 * schema doesn't refresh until something tells it to (NOTIFY pgrst, 'reload
 * schema'). The column is genuinely there in Postgres the whole time — every
 * save just fails until the cache happens to refresh on its own.
 *
 * This intercepts every Supabase request at the network layer (one place,
 * covers every page in the app — none of the 40+ files calling
 * `supabase.from(...)` directly need to change). On a response that matches
 * this exact signature, it calls the `reload_schema_cache()` RPC (which just
 * issues that NOTIFY) and retries the identical request once. A genuinely
 * missing column fails the retry the same way it failed the first time, so
 * this never masks a real problem — it only recovers the transient one.
 */
let lastSchemaReload = 0;
async function looksLikeSchemaCacheMiss(res: Response): Promise<boolean> {
  if (res.status < 400) return false;
  try {
    const text = await res.clone().text();
    return /PGRST204|PGRST205|schema cache/i.test(text);
  } catch {
    return false;
  }
}
async function reloadSchemaCache(originalUrl: RequestInfo | URL, options?: RequestInit): Promise<void> {
  if (Date.now() - lastSchemaReload < 5000) return; // debounce a burst of failures
  lastSchemaReload = Date.now();
  try {
    const u = new URL(typeof originalUrl === "string" ? originalUrl : originalUrl.toString());
    await fetch(`${u.origin}/rest/v1/rpc/reload_schema_cache`, {
      method: "POST",
      headers: { ...(options?.headers as Record<string, string> | undefined), "Content-Type": "application/json" },
      body: "{}",
    });
    // Give PostgREST a moment to actually pick up the NOTIFY before retrying.
    await new Promise(r => setTimeout(r, 700));
  } catch {
    // Best-effort — if this fails, the retry below just reproduces the
    // original error, which is the safe fallback.
  }
}

const timedFetch: typeof fetch = async (url, options) => {
  const res = await fetchWithTimeout(url, options);
  if (await looksLikeSchemaCacheMiss(res)) {
    await reloadSchemaCache(url, options);
    return fetchWithTimeout(url, options);
  }
  return res;
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