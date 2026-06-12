/**
 * EL5 MediProcure — SessionBot v1.0
 *
 * A headless bot that runs inside the router and:
 *  1. Writes/refreshes a role cookie on every login/role change
 *  2. On every route change, checks if the current role is allowed on that path
 *  3. Redirects unauthorised access to the role's default page (no flash)
 *  4. Redirects finance_officer/finance_manager → /finance-workspace on login
 *  5. Refreshes the cookie TTL every 30 min while the user is active
 *  6. Handles the "wrong landing page" problem (e.g. finance user hitting /dashboard
 *     then getting stuck without finance nav items)
 */

import { useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  setRoleCookie, getRoleCookie, clearRoleCookie,
  refreshRoleCookie, isRouteAllowed, getDefaultRoute,
  ROLE_MATRIX,
} from "@/lib/sessionCookie";

// Public paths that never need role checks
const PUBLIC_PATHS = ["/login", "/reset-password"];

// Paths that are OK for every authenticated role
const UNIVERSAL_PATHS = [
  "/dashboard", "/profile", "/notifications", "/changelog",
  "/inbox", "/email", "/whatsapp", "/reception", "/ai-agent",
];

// How often to refresh cookie TTL (ms)
const COOKIE_REFRESH_INTERVAL = 30 * 60 * 1000;

export default function SessionBot() {
  const { user, profile, roles, primaryRole, loading, session } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const prevRoles = useRef<string[]>([]);
  const didInitialRedirect = useRef(false);

  // ── 1. Write/refresh cookie whenever roles or profile change ──
  useEffect(() => {
    if (!user || !session || loading || roles.length === 0) return;

    const prev = prevRoles.current;
    const rolesChanged =
      prev.length !== roles.length ||
      roles.some((r, i) => r !== prev[i]);

    if (rolesChanged || !getRoleCookie()?.userId) {
      setRoleCookie(
        user.id,
        user.email ?? "",
        profile?.full_name ?? user.email ?? "",
        roles,
        primaryRole,
      );
      prevRoles.current = [...roles];
    }
  }, [user, session, roles, primaryRole, profile, loading]);

  // ── 2. Clear cookie on logout ────────────────────────────────
  useEffect(() => {
    if (!session && !loading) {
      clearRoleCookie();
      prevRoles.current = [];
      didInitialRedirect.current = false;
    }
  }, [session, loading]);

  // ── 3. Initial redirect — land on role-default page once ─────
  useEffect(() => {
    if (loading || !session || roles.length === 0 || didInitialRedirect.current) return;
    if (PUBLIC_PATHS.some(p => location.pathname.startsWith(p))) return;

    didInitialRedirect.current = true;
    const currentPath = location.pathname;
    const defaultRoute = getDefaultRoute(primaryRole);

    // Only auto-redirect if the user is currently on /dashboard or /
    // and their role has a more specific home page
    if (
      (currentPath === "/" || currentPath === "/dashboard") &&
      defaultRoute !== "/dashboard"
    ) {
      navigate(defaultRoute, { replace: true });
    }
  }, [loading, session, roles, primaryRole, location.pathname, navigate]);

  // ── 4. Route guard — check every navigation ──────────────────
  const checkRoute = useCallback(() => {
    if (loading || !session || roles.length === 0) return;

    const path = location.pathname;

    // Skip public + universal paths
    if (PUBLIC_PATHS.some(p => path.startsWith(p))) return;
    if (UNIVERSAL_PATHS.some(p => path === p || path.startsWith(p + "/"))) return;

    // Admin tier bypasses all checks
    if (["superadmin","admin","webmaster"].includes(primaryRole)) return;

    // Check role matrix
    if (!isRouteAllowed(primaryRole, path)) {
      const allowed = getDefaultRoute(primaryRole);
      navigate(allowed, { replace: true });
    }
  }, [loading, session, roles, primaryRole, location.pathname, navigate]);

  useEffect(() => { checkRoute(); }, [checkRoute]);

  // ── 5. Cookie TTL refresh every 30 min while active ─────────
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(refreshRoleCookie, COOKIE_REFRESH_INTERVAL);
    // Also refresh on user activity
    const onActivity = () => refreshRoleCookie();
    window.addEventListener("click", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      clearInterval(interval);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [session]);

  // Pure side-effects — renders nothing
  return null;
}

// ── Role-based nav filter (used by AppLayout) ─────────────────
export function getVisibleNavItems(
  role: string,
  items: Array<{ path: string; [key: string]: any }>
): Array<{ path: string; [key: string]: any }> {
  if (["superadmin","admin","webmaster"].includes(role)) return items;
  return items.filter(item => isRouteAllowed(role, item.path));
}

// ── Role display info ─────────────────────────────────────────
export function getRoleLabel(role: string): string {
  return ROLE_MATRIX[role]?.label ?? role.replace(/_/g," ").replace(/\b\w/g, c => c.toUpperCase());
}

// ── Session cookie boot helper (call in AuthContext) ──────────
export function bootFromCookie(userId: string) {
  const cookie = getRoleCookie();
  if (!cookie || cookie.userId !== userId) return null;
  if (Date.now() > cookie.expiresAt) return null;
  return { roles: cookie.roles, profile: { full_name: cookie.fullName, email: cookie.email } };
}
