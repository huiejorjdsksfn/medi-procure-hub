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
