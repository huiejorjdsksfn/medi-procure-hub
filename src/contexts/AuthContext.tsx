/**
 * EL5 MediProcure v10.1 — AuthContext
 * Hardened role loading:
 *   1. Cache-first → instant role render on refresh (no flicker to "no roles")
 *   2. Always background-refresh from DB after cache hit
 *   3. Admin roles (superadmin/admin/webmaster) never downgraded by partial load
 *   4. Realtime role-change listener forces re-auth if roles mutate
 */
import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, authCache, fetchUserData } from "@/integrations/supabase/client";

export type ProcurementRole =
  | "superadmin" | "admin" | "webmaster" | "database_admin"
  | "procurement_manager" | "procurement_officer"
  | "inventory_manager" | "warehouse_officer"
  | "requisitioner" | "accountant";

/** Admin-tier roles: bypass all guards */
export const ADMIN_TIER: ProcurementRole[] = ["superadmin", "admin", "webmaster"];

interface AuthCtx {
  session:      Session | null;
  user:         User | null;
  profile:      any | null;
  roles:        string[];
  loading:      boolean;
  initialized:  boolean;
  signOut:      () => Promise<void>;
  hasRole:      (r: ProcurementRole | ProcurementRole[]) => boolean;
  primaryRole:  ProcurementRole;
  refreshRoles: () => Promise<void>;
  isAdminTier:  boolean;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, profile: null, roles: [], loading: true, initialized: false,
  signOut: async () => {}, hasRole: () => false,
  primaryRole: "requisitioner", refreshRoles: async () => {}, isAdminTier: false,
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
  // Track whether we've done the initial cold load
  const initialized = useRef(false);

  /**
   * Apply fetched profile + roles.
   * HARDENING: Never downgrade from an admin-tier role to [] during a background
   * refresh gap. If we already have admin-tier roles and the new fetch returns [],
   * skip the update and retry from DB directly.
   */
  const apply = useCallback((d: { profile: any; roles: string[] }, source: "cache" | "db") => {
    setProfile(d.profile);

    // Never blank-out admin roles from a cache read if DB will follow
    const incoming = d.roles ?? [];
    setRoles(prev => {
      // If incoming is empty and prev has admin-tier, keep prev (cache may be stale-empty)
      if (incoming.length === 0 && source === "cache" && prev.some(r => ADMIN_TIER.includes(r as ProcurementRole))) {
        return prev;
      }
      return incoming;
    });
  }, []);

  /** Hard DB refresh, bypasses cache */
  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession()).data.session;
    if (!s?.user) return;
    authCache.clear();
    apply(await fetchUserData(s.user.id), "db");
  }, [apply]);

  // ── Primary boot sequence ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const uid = session.user.id;
        const cached = authCache.get(uid);

        if (cached) {
          // 1. Serve cache immediately → no role flash on refresh
          apply({ profile: cached.profile, roles: cached.roles }, "cache");
          clearTimeout(safety);
          if (mounted) setLoading(false);
          // 2. Always background-refresh from DB to pick up any role changes
          fetchUserData(uid).then(fresh => { if (mounted) apply(fresh, "db"); });
        } else {
          // Cold start — must wait for DB
          const fresh = await fetchUserData(uid);
          if (mounted) apply(fresh, "db");
          clearTimeout(safety);
          if (mounted) setLoading(false);
        }
      } else {
        clearTimeout(safety);
        if (mounted) setLoading(false);
      }

      initialized.current = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const uid = session.user.id;
        const cached = authCache.get(uid);

        if (cached && initialized.current) {
          // Already initialized — serve cache, refresh in background
          apply({ profile: cached.profile, roles: cached.roles }, "cache");
          setLoading(false);
          fetchUserData(uid).then(fresh => { if (mounted) apply(fresh, "db"); });
        } else {
          // First load or no cache — wait for DB
          const fresh = await fetchUserData(uid);
          if (mounted) { apply(fresh, "db"); setLoading(false); }
        }
      } else {
        // Sign-out
        setProfile(null);
        setRoles([]);
        authCache.clear();
        if (mounted) setLoading(false);
      }
    });

    return () => { mounted = false; clearTimeout(safety); subscription.unsubscribe(); };
  }, [apply]);

  // ── Realtime role-change watcher ─────────────────────────────────
  // If an admin changes this user's roles in the DB, force re-auth immediately.
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
              // Role mutation detected — force sign-out so a fresh JWT is issued
              try { await supabase.auth.signOut(); } catch {}
              setSession(null); setUser(null); setProfile(null); setRoles([]);
              if (typeof window !== "undefined") {
                window.location.assign("/#/login?reason=role_changed");
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

  // ── Derived state ─────────────────────────────────────────────────
  const signOut = async () => {
    authCache.clear();
    await supabase.auth.signOut();
    setSession(null); setUser(null); setProfile(null); setRoles([]);
  };

  const hasRole = (r: ProcurementRole | ProcurementRole[]) =>
    Array.isArray(r) ? r.some(x => roles.includes(x)) : roles.includes(r);

  const primaryRole = (PRIORITY.find(r => roles.includes(r)) || "requisitioner") as ProcurementRole;
  const isAdminTier = roles.some(r => ADMIN_TIER.includes(r as ProcurementRole));
  const isLoading   = loading && !initialized.current;

  return (
    <Ctx.Provider value={{
      session, user, profile, roles,
      loading: isLoading,
      initialized: !isLoading,
      signOut, hasRole, primaryRole, refreshRoles, isAdminTier,
    }}>
      {children}
    </Ctx.Provider>
  );
};
