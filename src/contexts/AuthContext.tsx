/**
 * ProcurBosse — AuthContext v6.0 NUCLEAR REBUILD
 * Fastest possible auth: check localStorage cache FIRST, then Supabase
 * Never shows loading screen to logged-in users
 * Always redirects to /login for logged-out users within 500ms
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin" | "superadmin" | "webmaster" | "database_admin"
  | "procurement_manager" | "procurement_officer"
  | "inventory_manager" | "warehouse_officer"
  | "requisitioner" | "accountant";

const ROLE_PRIORITY: ProcurementRole[] = [
  "superadmin","webmaster","admin","database_admin",
  "procurement_manager","procurement_officer",
  "accountant","inventory_manager","warehouse_officer","requisitioner",
];

// Cache keys
const CACHE_KEY   = "pb_auth_v6";
const CACHE_TTL   = 25 * 60 * 1000; // 25 min

interface CachedAuth { userId: string; roles: string[]; profile: any; ts: number; }

const cache = {
  read(uid: string): CachedAuth | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c: CachedAuth = JSON.parse(raw);
      if (c.userId !== uid) return null;
      if (Date.now() - c.ts > CACHE_TTL) { localStorage.removeItem(CACHE_KEY); return null; }
      return c;
    } catch { return null; }
  },
  write(uid: string, roles: string[], profile: any) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ userId:uid, roles, profile, ts:Date.now() })); } catch {}
  },
  clear() { try { localStorage.removeItem(CACHE_KEY); } catch {} },
};

async function fetchProfile(uid: string): Promise<{ profile: any; roles: string[] }> {
  try {
    const [pRes, rRes] = await Promise.allSettled([
      (supabase as any).from("profiles").select("*").eq("id", uid).maybeSingle(),
      (supabase as any).from("user_roles").select("role").eq("user_id", uid),
    ]);
    const profile = pRes.status === "fulfilled" ? pRes.value?.data : null;
    const roles   = rRes.status === "fulfilled"
      ? ((rRes.value?.data as any[]) || []).map((r: any) => r.role)
      : [];
    return { profile, roles: roles.length ? roles : ["requisitioner"] };
  } catch { return { profile: null, roles: ["requisitioner"] }; }
}

interface AuthCtx {
  session:      Session | null;
  user:         User | null;
  profile:      any;
  roles:        string[];
  loading:      boolean;
  initialized:  boolean;
  primaryRole:  ProcurementRole;
  hasRole:      (...r: ProcurementRole[]) => boolean;
  hasAnyRole:   (r: ProcurementRole[]) => boolean;
  signOut:      () => Promise<void>;
  refreshRoles: () => Promise<void>;
  updateProfile:(d: any) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session:null, user:null, profile:null, roles:[], loading:true, initialized:false,
  primaryRole:"requisitioner",
  hasRole:()=>false, hasAnyRole:()=>false,
  signOut:async()=>{}, refreshRoles:async()=>{}, updateProfile:async()=>{},
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,     setSession]     = useState<Session|null>(null);
  const [user,        setUser]        = useState<User|null>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [roles,       setRoles]       = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [initialized, setInitialized] = useState(false);

  const setDone = useCallback((s: Session|null, p: any, r: string[]) => {
    setSession(s);
    setUser(s?.user ?? null);
    setProfile(p);
    setRoles(r.length ? r : ["requisitioner"]);
    setLoading(false);
    setInitialized(true);
  }, []);

  const primaryRole: ProcurementRole = (() => {
    for (const r of ROLE_PRIORITY) { if (roles.includes(r)) return r; }
    return "requisitioner";
  })();

  const hasRole    = useCallback((...r: ProcurementRole[]) => r.some(x => roles.includes(x)), [roles]);
  const hasAnyRole = useCallback((r: ProcurementRole[]) => r.some(x => roles.includes(x)), [roles]);

  const signOut = useCallback(async () => {
    cache.clear();
    await supabase.auth.signOut().catch(() => {});
    setDone(null, null, []);
  }, [setDone]);

  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession().catch(() => ({ data: { session: null } }))).data.session;
    if (!s?.user) return;
    const d = await fetchProfile(s.user.id);
    setProfile(d.profile);
    setRoles(d.roles);
    cache.write(s.user.id, d.roles, d.profile);
  }, []);

  const updateProfile = useCallback(async (data: any) => {
    const uid = (await supabase.auth.getSession().catch(() => ({ data:{session:null} }))).data.session?.user?.id;
    if (!uid) return;
    try { await (supabase as any).from("profiles").update(data).eq("id", uid); } catch {}
    setProfile((p: any) => ({ ...p, ...data }));
  }, []);

  useEffect(() => {
    let live = true;

    // HARD TIMEOUT: 2 seconds max — always initialize
    const timeout = setTimeout(() => {
      if (live && !initialized) {
        console.warn("[Auth] 2s timeout — forcing done");
        setLoading(false);
        setInitialized(true);
      }
    }, 2000);

    const boot = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (!live) { clearTimeout(timeout); return; }

        if (s?.user) {
          // Check localStorage cache first — instant render for returning users
          const cached = cache.read(s.user.id);
          if (cached) {
            clearTimeout(timeout);
            setDone(s, cached.profile, cached.roles);
            // Silently refresh in background
            fetchProfile(s.user.id).then(d => {
              if (live) { setProfile(d.profile); setRoles(d.roles); cache.write(s.user.id, d.roles, d.profile); }
            }).catch(() => {});
          } else {
            const d = await fetchProfile(s.user.id);
            if (live) {
              cache.write(s.user.id, d.roles, d.profile);
              clearTimeout(timeout);
              setDone(s, d.profile, d.roles);
            }
          }
        } else {
          // Not logged in — done immediately
          clearTimeout(timeout);
          setDone(null, null, []);
        }
      } catch (e) {
        console.warn("[Auth] boot error:", e);
        if (live) { clearTimeout(timeout); setLoading(false); setInitialized(true); }
      }
    };

    boot();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!live) return;

      if (event === "SIGNED_IN" && s?.user) {
        const cached = cache.read(s.user.id);
        if (cached) {
          setDone(s, cached.profile, cached.roles);
          fetchProfile(s.user.id).then(d => {
            if (live) { setProfile(d.profile); setRoles(d.roles); cache.write(s.user.id, d.roles, d.profile); }
          }).catch(() => {});
        } else {
          const d = await fetchProfile(s.user.id).catch(() => ({ profile: null, roles: [] as string[] }));
          if (live) { cache.write(s.user.id, d.roles, d.profile); setDone(s, d.profile, d.roles); }
        }
      } else if (event === "SIGNED_OUT") {
        cache.clear();
        if (live) setDone(null, null, []);
      } else if (event === "TOKEN_REFRESHED" && s?.user) {
        setSession(s);
      }
    });

    return () => { live = false; clearTimeout(timeout); subscription.unsubscribe(); };
  }, []); // eslint-disable-line

  return (
    <Ctx.Provider value={{ session, user, profile, roles, loading, initialized, primaryRole, hasRole, hasAnyRole, signOut, refreshRoles, updateProfile }}>
      {children}
    </Ctx.Provider>
  );
}
