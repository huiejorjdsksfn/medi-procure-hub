/**
 * EL5 MediProcure v11.3 — AuthContext
 * Hardened role loading with session token support:
 *   1. Token-first → instant roles on refresh from localStorage token
 *   2. Cache-second → authCache localStorage fallback
 *   3. DB-always → background Supabase refresh for freshness
 *   4. Admin roles never blank during refresh gaps
 *   5. Session token issued on every successful sign-in
 *   6. Token revoked on sign-out
 */
import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase, authCache, fetchUserData } from "@/integrations/supabase/client";
import { pageCache } from "@/lib/pageCache";
import {
  getLocalToken, issueToken, refreshToken,
  revokeToken, startTokenRefresh, stopTokenRefresh,
} from "@/lib/sessionToken";
import {
  setRoleCookie, getRoleCookie, clearRoleCookie, updateCookieRoles,
} from "@/lib/sessionCookie";

export type ProcurementRole =
  | "superadmin" | "admin" | "webmaster" | "database_admin"
  | "procurement_manager" | "procurement_officer"
  | "inventory_manager" | "warehouse_officer"
  | "requisitioner" | "accountant"
  | "finance_officer" | "finance_manager";

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
  "procurement_manager","finance_manager","procurement_officer",
  "accountant","finance_officer",
  "inventory_manager","warehouse_officer","requisitioner",
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [roles,    setRoles]    = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const initialized = useRef(false);

  /**
   * Apply profile + roles — never blank out admin roles during a refresh gap.
   */
  const apply = useCallback((
    d: { profile: any; roles: string[] },
    source: "token" | "cache" | "db"
  ) => {
    setProfile(d.profile || null);
    const incoming = d.roles ?? [];
    setRoles(prev => {
      // Guard: don't erase admin roles during background refresh (token/cache sources)
      if (
        incoming.length === 0 &&
        source !== "db" &&
        prev.some(r => ADMIN_TIER.includes(r as ProcurementRole))
      ) return prev;
      return incoming;
    });
  }, []);

  /** Hard DB refresh — bypasses both token and cache */
  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession()).data.session;
    if (!s?.user) return;
    authCache.clear();
    const fresh = await fetchUserData(s.user.id);
    apply(fresh, "db");
    // Also refresh the session token with new roles
    refreshToken().catch(() => {});
  }, [apply]);

  // ── Primary boot ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const safety = setTimeout(() => { if (mounted) setLoading(false); }, 5000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const uid = session.user.id;

        // ── Priority 0: Role Cookie (fastest — no network, no parse) ──
        const roleCookie = getRoleCookie();
        if (roleCookie && roleCookie.userId === uid && roleCookie.roles.length > 0) {
          apply({ profile: { full_name: roleCookie.fullName, email: roleCookie.email }, roles: roleCookie.roles }, "token");
          clearTimeout(safety);
          if (mounted) setLoading(false);
          // Background: DB refresh + token refresh
          fetchUserData(uid).then(fresh => {
            if (mounted) {
              apply(fresh, "db");
              // Keep cookie in sync with latest DB roles
              updateCookieRoles(fresh.roles ?? roleCookie.roles, fresh.roles?.[0] ?? roleCookie.primaryRole);
            }
          });
          refreshToken().catch(() => {});
        }
        // ── Priority 1: Local session token (fastest, no network) ──
        else {
          const localToken = getLocalToken();
        if (localToken && localToken.user_id === uid && localToken.roles.length > 0) {
          apply({ profile: localToken.profile, roles: localToken.roles }, "token");
          clearTimeout(safety);
          if (mounted) setLoading(false);
          // Background: DB refresh + token refresh
          fetchUserData(uid).then(fresh => { if (mounted) apply(fresh, "db"); });
          refreshToken().catch(() => {});
        }
        // ── Priority 2: authCache ──────────────────────────────────
        else {
          const cached = authCache.get(uid);
          if (cached && cached.roles.length > 0) {
            apply({ profile: cached.profile, roles: cached.roles }, "cache");
            clearTimeout(safety);
            if (mounted) setLoading(false);
            // Background DB refresh
            fetchUserData(uid).then(fresh => {
              if (mounted) apply(fresh, "db");
            });
          }
          // ── Priority 3: Cold DB load ──────────────────────────────
          else {
            const fresh = await fetchUserData(uid);
            if (mounted) {
              apply(fresh, "db");
              clearTimeout(safety);
              setLoading(false);
            }
            // Issue a fresh session token after cold load
            issueToken().catch(() => {});
          }
        }
        } // end Priority 0 else
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

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (!session?.user) return;
        const uid = session.user.id;
        const localToken = getLocalToken();

        if (localToken && localToken.user_id === uid && localToken.roles.length > 0 && initialized.current) {
          apply({ profile: localToken.profile, roles: localToken.roles }, "token");
          setLoading(false);
          fetchUserData(uid).then(fresh => { if (mounted) apply(fresh, "db"); });
        } else {
          const cached = authCache.get(uid);
          if (cached && initialized.current) {
            apply({ profile: cached.profile, roles: cached.roles }, "cache");
            setLoading(false);
            fetchUserData(uid).then(fresh => { if (mounted) apply(fresh, "db"); });
          } else {
            const fresh = await fetchUserData(uid);
            if (mounted) { apply(fresh, "db"); setLoading(false); }
          }

          // Issue fresh token on sign-in + write cookie
          if (event === "SIGNED_IN") {
            issueToken().catch(() => {});
            startTokenRefresh();
            // Write role cookie for instant boot next page load
            fetchUserData(session.user.id).then(fresh => {
              if (fresh.roles?.length) {
                const pr = PRIORITY.find(r => fresh.roles.includes(r)) ?? "requisitioner";
                setRoleCookie(session.user.id, session.user.email ?? "", fresh.profile?.full_name ?? "", fresh.roles, pr);
              }
            }).catch(() => {});
          }
        }
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
        authCache.clear();
        pageCache.clearAll();
        stopTokenRefresh();
        clearRoleCookie();
        if (mounted) setLoading(false);
      }
    });

    // Start background token refresh if token exists
    if (getLocalToken()) startTokenRefresh();

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, [apply]);

  // ── Realtime role-change watcher ──────────────────────────────
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
              [...oldSet].some(r => !newSet.has(r));

            if (changed) {
              // Roles changed → revoke token and force re-login for fresh JWT
              await revokeToken();
              pageCache.clearAll();
              try { await supabase.auth.signOut(); } catch {}
              setSession(null); setUser(null); setProfile(null); setRoles([]);
              if (typeof window !== "undefined") {
                window.location.assign("/#/login?reason=role_changed");
              }
            } else {
              apply(fresh, "db");
            }
          } catch {}
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, roles, apply]);

  // ── Derived state ─────────────────────────────────────────────
  const signOut = async () => {
    stopTokenRefresh();
    await revokeToken();
    authCache.clear();
    pageCache.clearAll();
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
