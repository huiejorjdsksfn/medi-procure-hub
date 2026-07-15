/**
 * EL5 MediProcure v11.5.0 — AuthContext (Hardened)
 *
 * ROOT CAUSE FIXES:
 *   BUG-1 "user data blanks after a few seconds":
 *     apply() now NEVER wipes valid roles from ANY source (not just admin).
 *     DB fetch returning [] is treated as "no data" not "user has no roles".
 *     fetchUserData wraps DB calls in a 8-second hard timeout with fallback.
 *
 *   BUG-2 "role changes on page refresh":
 *     TOKEN_REFRESHED no longer re-runs the full load chain.
 *     Cookie/token data is the authoritative fast-path; DB only supplements.
 *     Background DB refresh only *adds* roles, never replaces non-empty state
 *     with empty.
 *
 * Priority chain (fastest → slowest):
 *   1. Role cookie  (synchronous, <1 ms)
 *   2. localStorage token  (<1 ms)
 *   3. authCache    (<1 ms)
 *   4. Supabase DB  (network, 100–3000 ms)
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

// Safely fetch with a hard deadline — returns null on timeout/error
async function safeFetchUserData(
  uid: string,
  timeoutMs = 8000
): Promise<{ profile: any; roles: string[] } | null> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    fetchUserData(uid)
      .then(data => { clearTimeout(timer); resolve(data); })
      .catch(() => { clearTimeout(timer); resolve(null); });
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session,  setSession]  = useState<Session | null>(null);
  const [user,     setUser]     = useState<User | null>(null);
  const [profile,  setProfile]  = useState<any>(null);
  const [roles,    setRoles]    = useState<string[]>([]);
  const [loading,  setLoading]  = useState(true);
  const initialized = useRef(false);
  // Track whether we already have "solid" data so background fetches can't blank us
  const hasData = useRef(false);

  /**
   * apply() — core state setter.
   *
   * GOLDEN RULE: never replace a non-empty roles array with an empty one.
   * If the DB returns [] it likely means a transient error (RLS, timeout).
   * We keep what we have and let the next refresh cycle try again.
   */
  const apply = useCallback((
    d: { profile: any; roles: string[] },
    source: "cookie" | "token" | "cache" | "db"
  ) => {
    // Merge profile — never null out a loaded profile with nothing
    if (d.profile) setProfile(d.profile);

    const incoming = d.roles ?? [];

    setRoles(prev => {
      // Never wipe non-empty state with empty state from any source
      if (incoming.length === 0 && prev.length > 0) {
        console.warn(`[Auth] ${source} returned 0 roles — keeping existing [${prev.join(",")}]`);
        return prev;
      }
      return incoming;
    });

    if (incoming.length > 0) hasData.current = true;
  }, []);

  /** Hard DB refresh — bypasses token and cache, still respects golden rule */
  const refreshRoles = useCallback(async () => {
    const s = (await supabase.auth.getSession()).data.session;
    if (!s?.user) return;
    authCache.clear();
    const fresh = await safeFetchUserData(s.user.id);
    if (fresh) apply(fresh, "db");
    refreshToken().catch(() => {});
  }, [apply]);

  // ── Primary boot ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // Hard safety net: if nothing loaded in 6s, unblock the UI
    const safety = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[Auth] Safety timeout — unblocking UI");
        setLoading(false);
        initialized.current = true;
      }
    }, 6000);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const uid = session.user.id;

        // ── Priority 0: Role Cookie (synchronous, fastest) ────────
        const roleCookie = getRoleCookie();
        if (roleCookie && roleCookie.userId === uid && roleCookie.roles.length > 0) {
          apply({ profile: { full_name: roleCookie.fullName, email: roleCookie.email }, roles: roleCookie.roles }, "cookie");
          clearTimeout(safety);
          setLoading(false);
          initialized.current = true;

          // Background: DB refresh to keep data fresh (won't blank roles)
          if (mounted) {
            safeFetchUserData(uid).then(fresh => {
              if (mounted && fresh && fresh.roles.length > 0) {
                apply(fresh, "db");
                updateCookieRoles(fresh.roles, PRIORITY.find(r => fresh.roles.includes(r)) ?? "requisitioner");
              }
            });
            refreshToken().catch(() => {});
          }
          return;
        }

        // ── Priority 1: localStorage token ────────────────────────
        const localToken = getLocalToken();
        if (localToken && localToken.user_id === uid && localToken.roles.length > 0) {
          apply({ profile: localToken.profile, roles: localToken.roles }, "token");
          clearTimeout(safety);
          setLoading(false);
          initialized.current = true;

          if (mounted) {
            safeFetchUserData(uid).then(fresh => {
              if (mounted && fresh && fresh.roles.length > 0) apply(fresh, "db");
            });
            refreshToken().catch(() => {});
          }
          return;
        }

        // ── Priority 2: authCache ──────────────────────────────────
        const cached = authCache.get(uid);
        if (cached && cached.roles.length > 0) {
          apply({ profile: cached.profile, roles: cached.roles }, "cache");
          clearTimeout(safety);
          setLoading(false);
          initialized.current = true;

          if (mounted) {
            safeFetchUserData(uid).then(fresh => {
              if (mounted && fresh && fresh.roles.length > 0) apply(fresh, "db");
            });
          }
          return;
        }

        // ── Priority 3: Cold DB load ───────────────────────────────
        const fresh = await safeFetchUserData(uid);
        if (mounted) {
          if (fresh) apply(fresh, "db");
          clearTimeout(safety);
          setLoading(false);
          initialized.current = true;
          // Issue session token after cold load
          if (fresh && fresh.roles.length > 0) {
            issueToken().catch(() => {});
            const pr = PRIORITY.find(r => fresh.roles.includes(r)) ?? "requisitioner";
            setRoleCookie(uid, session.user.email ?? "", fresh.profile?.full_name ?? "", fresh.roles, pr);
          }
        }
      } else {
        // No session
        clearTimeout(safety);
        if (mounted) {
          setLoading(false);
          initialized.current = true;
        }
      }
    }).catch(() => {
      // getSession itself failed (offline etc.)
      clearTimeout(safety);
      if (mounted) {
        setLoading(false);
        initialized.current = true;
      }
    });

    // ── Auth state change listener ─────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN") {
        setSession(session);
        setUser(session?.user ?? null);
        if (!session?.user) return;
        const uid = session.user.id;

        // On sign-in: always do a fresh DB load for accurate initial state
        const fresh = await safeFetchUserData(uid);
        if (mounted && fresh) {
          apply(fresh, "db");
          setLoading(false);
          initialized.current = true;
        }

        // Issue token + write cookie for next boot
        issueToken().catch(() => {});
        startTokenRefresh();
        if (fresh && fresh.roles.length > 0) {
          const pr = PRIORITY.find(r => fresh.roles.includes(r)) ?? "requisitioner";
          setRoleCookie(uid, session.user.email ?? "", fresh.profile?.full_name ?? "", fresh.roles, pr);
        }

        // AUDIT FIX (Jul 2026): device/OS fingerprint + IP access logging previously only
        // fired from LoginPage (device) and WebmasterPage (IP) — missing session-restore
        // logins and causing weeks-stale audit data for non-admin roles. Fire from this
        // single global auth choke point instead. Fire-and-forget: never blocks auth.
        import("@/lib/deviceTracker").then(({ logDeviceSession, getGeoInfo }) => {
          getGeoInfo().then(geo => logDeviceSession(uid, session.user.email ?? undefined, geo)).catch(() => {});
        }).catch(() => {});
        import("@/lib/ipRestriction").then(({ checkIpAccess }) => {
          checkIpAccess(uid, session.user.email ?? undefined).catch(() => {});
        }).catch(() => {});

      } else if (event === "TOKEN_REFRESHED") {
        // BUG-2 FIX: TOKEN_REFRESHED must NOT re-run the full data load.
        // It just means the JWT was extended. Silently update session only.
        setSession(session);
        setUser(session?.user ?? null);
        // Roles and profile stay exactly as-is — no apply() call here.

      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        hasData.current = false;
        authCache.clear();
        pageCache.clearAll();
        stopTokenRefresh();
        clearRoleCookie();
        if (mounted) setLoading(false);
      }
    });

    // Start background token refresh if token exists from a previous session
    if (getLocalToken()) startTokenRefresh();

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Realtime role-change watcher (debounced, non-disruptive) ──
  useEffect(() => {
    if (!user?.id) return;

    let debounce: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase
      .channel(`role-watch-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        () => {
          // Debounce: wait 2s for multiple rapid DB events to settle
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(async () => {
            try {
              authCache.clear();
              const fresh = await safeFetchUserData(user.id);
              if (!fresh) return; // transient error — keep existing state

              const oldSet = new Set(roles);
              const newSet = new Set(fresh.roles || []);

              // Only act if roles genuinely changed AND new set is non-empty
              if (fresh.roles.length > 0 && (
                oldSet.size !== newSet.size ||
                [...oldSet].some(r => !newSet.has(r))
              )) {
                // Roles changed: apply new roles first, then force re-login
                // so the new JWT reflects the change
                apply(fresh, "db");
                updateCookieRoles(fresh.roles, fresh.roles[0]);
                await revokeToken();
                pageCache.clearAll();
                try { await supabase.auth.signOut(); } catch { /* ignore */ }
                if (typeof window !== "undefined") {
                  window.location.assign("/#/login?reason=role_changed");
                }
              } else if (fresh.roles.length > 0) {
                // Roles unchanged or just refreshed — apply silently
                apply(fresh, "db");
              }
              // If fresh.roles is empty — ignore (transient, don't clear state)
            } catch { /* silent */ }
          }, 2000);
        },
      )
      .subscribe();

    return () => {
      if (debounce) clearTimeout(debounce);
      supabase.removeChannel(channel);
    };
  }, [user?.id, roles, apply]);

  // ── Derived state ─────────────────────────────────────────────
  const signOut = async () => {
    stopTokenRefresh();
    await revokeToken();
    authCache.clear();
    pageCache.clearAll();
    clearRoleCookie();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    hasData.current = false;
  };

  const hasRole = (r: ProcurementRole | ProcurementRole[]) =>
    Array.isArray(r) ? r.some(x => roles.includes(x)) : roles.includes(r);

  const primaryRole = (PRIORITY.find(r => roles.includes(r)) || "requisitioner") as ProcurementRole;
  const isAdminTier = roles.some(r => ADMIN_TIER.includes(r as ProcurementRole));

  // Loading: true only while we have zero data AND haven't initialized yet
  const isLoading = loading && !initialized.current;

  return (
    <Ctx.Provider value={{
      session, user, profile, roles,
      loading: isLoading,
      initialized: initialized.current,
      signOut, hasRole, primaryRole, refreshRoles, isAdminTier,
    }}>
      {children}
    </Ctx.Provider>
  );
};
