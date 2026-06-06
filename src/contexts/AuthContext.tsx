/**
 * EL5 MediProcure v10.0 — AuthContext
 * Cache-first · 5s safety timeout · Silent background refresh · Role-stable
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, authCache, fetchUserData } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "admin" | "superadmin" | "webmaster" | "database_admin"
  | "procurement_manager" | "procurement_officer"
  | "inventory_manager" | "warehouse_officer"
  | "requisitioner" | "accountant";

interface AuthCtx {
  session:     Session | null;
  user:        User | null;
  profile:     any | null;
  roles:       string[];
  loading:     boolean;
  initialized: boolean;
  signOut:     () => Promise<void>;
  hasRole:     (r: ProcurementRole | ProcurementRole[]) => boolean;
  primaryRole: ProcurementRole;
  refreshRoles:() => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, profile: null, roles: [], loading: true, initialized: false,
  signOut: async () => {}, hasRole: () => false,
  primaryRole: "requisitioner", refreshRoles: async () => {},
});

export const useAuth = () => useContext(Ctx);

const PRIORITY: ProcurementRole[] = [
  "superadmin","admin","webmaster","database_admin",
  "procurement_manager","procurement_officer","accountant",
  "inventory_manager","warehouse_officer","requisitioner",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [roles,    setRoles]    = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);

  const apply = useCallback((d: { profile: any; roles: string[] }) => {
    setProfile(d.profile); setRoles(d.roles);
  }, []);

  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession()).data.session;
    if (!s?.user) return;
    authCache.clear();
    apply(await fetchUserData(s.user.id));
  }, [apply]);

  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) {
        const cached = authCache.get(session.user.id);
        if (cached) { apply(cached); }
        else { apply(await fetchUserData(session.user.id)); }
      }
      clearTimeout(safety);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (!mounted) return;
      setSession(session); setUser(session?.user ?? null);
      if (session?.user) {
        const cached = authCache.get(session.user.id);
        if (cached) {
          apply(cached); setLoading(false);
          fetchUserData(session.user.id).then(d => { if (mounted) apply(d); });
        } else {
          apply(await fetchUserData(session.user.id));
          if (mounted) setLoading(false);
        }
      } else {
        setProfile(null); setRoles([]); authCache.clear();
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; clearTimeout(safety); subscription.unsubscribe(); };
  }, [apply]);

  // Session hardening: watch the current user's role rows in realtime.
  // If roles are added or removed for THIS user, force a re-auth so the JWT
  // and client cache reflect the new permissions immediately.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`role-watch-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        async () => {
          try {
            authCache.clear();
            const fresh = await fetchUserData(user.id);
            const oldSet = new Set(roles);
            const newSet = new Set(fresh.roles || []);
            const changed =
              oldSet.size !== newSet.size ||
              [...oldSet].some(r => !newSet.has(r)) ||
              [...newSet].some(r => !oldSet.has(r));
            if (changed) {
              // Force re-auth so a fresh JWT with updated claims is issued
              try { await supabase.auth.signOut(); } catch {}
              setSession(null); setUser(null); setProfile(null); setRoles([]);
              if (typeof window !== "undefined") {
                window.location.assign("/login?reason=role_changed");
              }
            } else {
              setRoles(fresh.roles || []);
              setProfile(fresh.profile || null);
            }
          } catch {}
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, roles]);

  const signOut = async () => {
    authCache.clear();
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
  };

  const hasRole = (r: ProcurementRole | ProcurementRole[]) =>
    Array.isArray(r) ? r.some(x => roles.includes(x)) : roles.includes(r);

  const primaryRole = (PRIORITY.find(r => roles.includes(r)) || "requisitioner") as ProcurementRole;

  return (
    <Ctx.Provider value={{ session, user, profile, roles, loading, initialized: !loading, signOut, hasRole, primaryRole, refreshRoles }}>
      {children}
    </Ctx.Provider>
  );
};
