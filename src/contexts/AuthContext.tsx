/**
 * ProcurBosse  -- AuthContext v4.0
 * Persistent session engine  -- no logout/access-denied on refresh
 * Dual-store: IndexedDB primary + localStorage fallback
 * Background token refresh + role cache
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { sessionEngine } from "@/lib/sessionEngine";

export type ProcurementRole =
  | "admin" | "superadmin" | "webmaster"
  | "database_admin"
  | "procurement_manager" | "procurement_officer"
  | "inventory_manager" | "warehouse_officer"
  | "requisitioner" | "accountant";

const ALL_ROLES: ProcurementRole[] = [
  "admin","superadmin","webmaster","database_admin",
  "procurement_manager","procurement_officer",
  "inventory_manager","warehouse_officer",
  "requisitioner","accountant",
];

const ROLE_PRIORITY: ProcurementRole[] = [
  "superadmin","webmaster","admin","database_admin",
  "procurement_manager","procurement_officer",
  "accountant","inventory_manager","warehouse_officer","requisitioner",
];

interface AuthContextType {
  session:      Session | null;
  user:         User | null;
  profile:      any | null;
  roles:        string[];
  loading:      boolean;
  initialized:  boolean;
  signOut:      () => Promise<void>;
  hasRole:      (...roles: ProcurementRole[]) => boolean;
  hasAnyRole:   (roles: ProcurementRole[]) => boolean;
  primaryRole:  ProcurementRole;
  refreshRoles: () => Promise<void>;
  updateProfile:(data: Partial<any>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null, user: null, profile: null,
  roles: [], loading: true, initialized: false,
  signOut: async () => {},
  hasRole: () => false,
  hasAnyRole: () => false,
  primaryRole: "requisitioner",
  refreshRoles: async () => {},
  updateProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,     setSession]     = useState<Session | null>(null);
  const [user,        setUser]        = useState<User | null>(null);
  const [profile,     setProfile]     = useState<any>(null);
  const [roles,       setRoles]       = useState<string[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [initialized, setInitialized] = useState(false);

  /* Apply profile + roles to state */
  const applyUserData = useCallback((data: { profile: any; roles: string[] }) => {
    setProfile(data.profile);
    setRoles(data.roles.length ? data.roles : ["requisitioner"]); // Never empty roles
  }, []);

  /* Refresh roles from DB (clears cache) */
  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession()).data.session;
    if (!s?.user) return;
    const data = await sessionEngine.updateRoles(s.user.id);
    applyUserData(data);
  }, [applyUserData]);

  /* Update profile locally and in DB */
  const updateProfile = useCallback(async (data: Partial<any>) => {
    const curr = (await supabase.auth.getSession()).data.session?.user;
    if (!curr) return;
    await (supabase as any).from("profiles").update(data).eq("id", curr.id);
    setProfile((p: any) => ({ ...p, ...data }));
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      /* -- Step 1: Try stored session for instant render (no flash) -- */
      const stored = await sessionEngine.read();
      if (stored && mounted) {
        applyUserData({ profile: stored.profile, roles: stored.roles });
        setInitialized(true);
      }

      /* -- Step 2: Verify with Supabase (authoritative) -- */
      const safety = setTimeout(() => { if (mounted) setLoading(false); }, 6000);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          /* Use cached roles instantly, refresh in background */
          const cached = sessionEngine.readRolesCache();
          if (cached && mounted) {
            applyUserData(cached);
            setLoading(false);
            setInitialized(true);
            /* Silently refresh roles */
            sessionEngine.updateRoles(session.user.id)
              .then(d => { if (mounted) applyUserData(d); })
              .catch(() => {});
          } else {
            const fresh = await sessionEngine.buildFromAuth(
              session.user.id,
              session.user.email || "",
              session.access_token
            );
            await sessionEngine.save(fresh);
            if (mounted) {
              applyUserData({ profile: fresh.profile, roles: fresh.roles });
              setLoading(false);
              setInitialized(true);
            }
          }
          sessionEngine.startRefresh(session.user.id);
        } else {
          if (mounted) {
            setLoading(false);
            setInitialized(true);
            /* Clear stale stored session */
            if (stored) await sessionEngine.clear();
          }
        }
      } catch {
        /* Network failure  -- use stored session if available */
        if (stored && mounted) {
          setLoading(false);
          setInitialized(true);
        }
      } finally {
        clearTimeout(safety);
        if (mounted) setLoading(false);
      }
    };

    init();

    /* -- Auth state change listener -- */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        const cached = sessionEngine.readRolesCache();
        if (cached) {
          applyUserData(cached);
          setLoading(false);
          setInitialized(true);
          sessionEngine.updateRoles(session.user.id)
            .then(d => { if (mounted) applyUserData(d); });
        } else {
          const fresh = await sessionEngine.buildFromAuth(
            session.user.id, session.user.email || "", session.access_token
          );
          await sessionEngine.save(fresh);
          if (mounted) applyUserData({ profile: fresh.profile, roles: fresh.roles });
        }
        sessionEngine.startRefresh(session.user.id);
        setLoading(false);
        setInitialized(true);
      } else if (event === "SIGNED_OUT") {
        await sessionEngine.clear();
        setProfile(null);
        setRoles([]);
        setInitialized(true);
        setLoading(false);
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        /* Silent token refresh  -- don't disturb UI */
        const stored = await sessionEngine.read();
        if (stored) {
          await sessionEngine.save({ ...stored, token: session.access_token, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applyUserData]);

  const signOut = async () => {
    await sessionEngine.clear();
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
  };

  const hasRole   = (...r: ProcurementRole[]) => r.some(role => roles.includes(role));
  const hasAnyRole = (r: ProcurementRole[]) => r.some(role => roles.includes(role));
  const primaryRole = (ROLE_PRIORITY.find(r => roles.includes(r)) || "requisitioner") as ProcurementRole;

  return (
    <AuthContext.Provider value={{
      session, user, profile, roles, loading, initialized,
      signOut, hasRole, hasAnyRole, primaryRole, refreshRoles, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
