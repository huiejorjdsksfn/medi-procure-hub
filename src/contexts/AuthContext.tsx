import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin" | "database_admin" | "requisitioner"
  | "procurement_officer" | "procurement_manager"
  | "warehouse_officer" | "inventory_manager"
  | "accountant";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  roles: string[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: ProcurementRole) => boolean;
  primaryRole: ProcurementRole;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null,
  roles: [], loading: true,
  signOut: async () => {},
  hasRole: () => false,
  primaryRole: "requisitioner",
  refreshRoles: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const ROLE_PRIORITY: ProcurementRole[] = [
  "admin","database_admin","procurement_manager",
  "procurement_officer","accountant","inventory_manager",
  "warehouse_officer","requisitioner",
];

// ── LocalStorage cache keys ──────────────────────────────────────────────────
const CACHE_KEY   = "el5_auth_v3";
const CACHE_TTL   = 20 * 60 * 1000; // 20 min

function readCache(userId: string): { profile: any; roles: string[] } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (c.userId !== userId) return null;
    if (Date.now() - c.ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
    return { profile: c.profile, roles: c.roles };
  } catch { return null; }
}

function writeCache(userId: string, profile: any, roles: string[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, profile, roles, ts: Date.now() }));
  } catch { /* storage quota */ }
}

function clearCache() { localStorage.removeItem(CACHE_KEY); }

// ── Fetch profile + roles in parallel ────────────────────────────────────────
async function fetchUserData(userId: string): Promise<{ profile: any; roles: string[] }> {
  const cached = readCache(userId);
  if (cached) return cached;

  const [pRes, rRes] = await Promise.allSettled([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const profile = pRes.status === "fulfilled" ? pRes.value.data : null;
  const roles   = rRes.status === "fulfilled"
    ? (rRes.value.data as any[] || []).map((r: any) => r.role)
    : [];

  writeCache(userId, profile, roles);
  return { profile, roles };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [roles,    setRoles]    = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);

  const applyUserData = useCallback((data: { profile: any; roles: string[] }) => {
    setProfile(data.profile);
    setRoles(data.roles);
  }, []);

  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession()).data.session;
    if (!s?.user) return;
    clearCache();
    const data = await fetchUserData(s.user.id);
    applyUserData(data);
  }, [applyUserData]);

  useEffect(() => {
    let mounted = true;
    // Hard safety timeout — loading never hangs beyond 5s
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const data = await fetchUserData(session.user.id);
        if (mounted) applyUserData(data);
      }

      clearTimeout(safety);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use cache first (instant), then refresh in background
        const cached = readCache(session.user.id);
        if (cached) {
          applyUserData(cached);
          setLoading(false);
          // Silently refresh in background
          fetchUserData(session.user.id).then(d => { if (mounted) applyUserData(d); });
        } else {
          const data = await fetchUserData(session.user.id);
          if (mounted) { applyUserData(data); setLoading(false); }
        }
      } else {
        setProfile(null);
        setRoles([]);
        clearCache();
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; clearTimeout(safety); subscription.unsubscribe(); };
  }, [applyUserData]);

  const signOut = async () => {
    clearCache();
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
  };

  const hasRole = (r: ProcurementRole) => roles.includes(r);
  const primaryRole = (ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner") as ProcurementRole;

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles, loading,
      signOut, hasRole, primaryRole, refreshRoles,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
