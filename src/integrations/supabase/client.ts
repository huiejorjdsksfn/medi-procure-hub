/**
 * Supabase Client  -- EL5 MediProcure v5.8
 * Optimised: fast auth, persistent role cache, minimal round-trips
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || "https://yvjfehnzbzjliizjvuhq.supabase.co";

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-client': 'procurbosse-v5.8' },
    // Increase fetch timeout for slow connections
    fetch: (url, options) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000); // 15s timeout
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(id));
    },
  },
  realtime: {
    params: { eventsPerSecond: 8 },
  },
  db: { schema: 'public' },
});

// Untyped client for tables not yet in generated types
export const db = supabase as ReturnType<typeof createClient>;

// -- Role cache -------------------------------------------------------------
const ROLE_CACHE_KEY = 'el5_auth_v3';
const ROLE_CACHE_TTL = 20 * 60 * 1000;

interface AuthCache { userId: string; roles: string[]; profile: any; ts: number; }

export const roleCache = {
  get(userId: string): string[] | null {
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      if (!raw) return null;
      const c: AuthCache = JSON.parse(raw);
      if (c.userId !== userId) return null;
      if (Date.now() - c.ts > ROLE_CACHE_TTL) { localStorage.removeItem(ROLE_CACHE_KEY); return null; }
      return c.roles;
    } catch { return null; }
  },
  set(userId: string, roles: string[]) {
    try {
      const raw = localStorage.getItem(ROLE_CACHE_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({
        ...existing, userId, roles, ts: Date.now()
      }));
    } catch { }
  },
  clear() { localStorage.removeItem(ROLE_CACHE_KEY); },
};

// -- Parallel fetch: profile + roles ---------------------------------------
export async function fetchUserData(userId: string): Promise<{ profile: any; roles: string[] }> {
  const [pRes, rRes] = await Promise.allSettled([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
  ]);
  const profile = pRes.status === 'fulfilled' ? pRes.value.data : null;
  const roles   = rRes.status === 'fulfilled'
    ? (rRes.value.data as any[] || []).map((r: any) => r.role)
    : [];
  return { profile, roles };
}

// -- QueryClient default options --------------------------------------------
export const QUERY_DEFAULTS = {
  staleTime: 30_000,   // 30s  -- data considered fresh
  gcTime: 5 * 60_000,  // 5min  -- keep in memory
  retry: 1,
  refetchOnWindowFocus: false,
};
