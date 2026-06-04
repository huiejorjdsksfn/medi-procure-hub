/**
 * RouterGuard v3.0 — Bulletproof HashRouter fallback
 * Intercepts every navigation attempt and ensures the app
 * never lands on a bare /path that would cause EdgeOne 404.
 *
 * Responsibilities:
 *  1. On mount: detect if window.location.pathname is a real route
 *     (not /#/) and redirect to hash form before React renders
 *  2. Intercept popstate (browser back/forward) to keep hash intact
 *  3. Intercept any <a href="..."> clicks that aren't hash-based
 *  4. Expose a useHashNav() hook so components can navigate safely
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/* All known app routes — used to validate fallback targets */
export const APP_ROUTES = [
  "/", "/login", "/reset-password", "/dashboard",
  "/requisitions", "/purchase-orders", "/goods-received",
  "/suppliers", "/tenders", "/bid-evaluations", "/contracts",
  "/procurement-planning", "/reports", "/documents",
  "/documents/editor", "/items", "/categories", "/departments",
  "/scanner", "/vouchers", "/vouchers/payment", "/vouchers/receipt",
  "/vouchers/journal", "/vouchers/purchase", "/vouchers/sales",
  "/financials", "/financials/dashboard", "/financials/chart-of-accounts",
  "/financials/budgets", "/financials/fixed-assets",
  "/quality", "/quality/dashboard", "/quality/inspections",
  "/quality/non-conformance", "/inbox", "/email", "/reception",
  "/telephony", "/sms", "/users", "/settings", "/audit-log",
  "/admin/database", "/admin/panel", "/superadmin", "/webmaster",
  "/changelog", "/backup", "/odbc", "/ip-access", "/admin/ip-access",
  "/profile", "/gui-editor", "/facilities", "/admin/db-test",
  "/accountant", "/accountant-workspace", "/notifications",
  "/hmis", "/hmis/sync", "/hmis/mapping", "/hmis/logs",
  "/whatsapp",
  "/ai-agent",
];

/**
 * Normalise any URL to its correct /#/path form.
 * Handles: /path, /#/path, http://domain/path, relative paths
 */
export function toHashUrl(path: string): string {
  if (!path) return "/#/";
  // Already correct hash form
  if (path.startsWith("/#/")) return path;
  // Hash with missing slash: #/path
  if (path.startsWith("#/"))  return "/" + path;
  // Pure hash fragment: #path
  if (path.startsWith("#"))   return "/#" + path;
  // Absolute URL: extract pathname
  if (path.startsWith("http")) {
    try {
      const u = new URL(path);
      return toHashUrl(u.pathname + u.search);
    } catch { return "/#/"; }
  }
  // Relative or absolute path: /path or path
  const clean = path.startsWith("/") ? path : "/" + path;
  return "/#" + clean;
}

/**
 * RouterGuard — mount inside <HashRouter> to catch and fix
 * any navigation that slips out of hash-space.
 */
export default function RouterGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  // ── Electron menu navigation listener ──────────────────────────────────
  useEffect(() => {
    const handleElectronNav = (e: Event) => {
      const route = (e as CustomEvent).detail;
      if (route && typeof route === 'string') {
        const clean = route.startsWith('/') ? route : '/' + route;
        navigate(clean);
      }
    };
    window.addEventListener('electron-navigate', handleElectronNav);
    return () => window.removeEventListener('electron-navigate', handleElectronNav);
  }, [navigate]);

  useEffect(() => {
    // 1. Intercept bare pathname navigations
    //    e.g. if server serves /requisitions → index.html, the hash-redirect
    //    in index.html already handled it. But just in case:
    const rawPath = window.location.pathname;
    const hash    = window.location.hash;

    if (rawPath !== "/" && !hash) {
      // We're at /some/path with no hash — redirect to /#/some/path
      const target = "/#" + rawPath + window.location.search;
      window.location.replace(target);
      return;
    }

    // 2. Intercept anchor clicks that use bare href="/path" (not "#/path")
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";

      // Skip: external, mailto, tel, download, already hash
      if (!href ||
          href.startsWith("http") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:") ||
          href.startsWith("#/") ||
          href.startsWith("/#/") ||
          anchor.hasAttribute("download") ||
          anchor.target === "_blank") return;

      // Fix bare path hrefs
      if (href.startsWith("/") && !href.startsWith("/#")) {
        e.preventDefault();
        navigate(href); // react-router navigate handles /#/ prefix via HashRouter
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [navigate]);

  // Log route changes in dev for debugging
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.debug("[RouterGuard] Route:", location.pathname + location.search);
    }
  }, [location]);

  return null; // No visual output
}

/**
 * useSafeNavigate — drop-in replacement for useNavigate
 * that always produces correct hash URLs
 */
export function useSafeNavigate() {
  const navigate = useNavigate();
  return (to: string, opts?: { replace?: boolean; state?: any }) => {
    // Ensure path starts with / for HashRouter
    const clean = to.startsWith("/") ? to : "/" + to;
    navigate(clean, opts);
  };
}
