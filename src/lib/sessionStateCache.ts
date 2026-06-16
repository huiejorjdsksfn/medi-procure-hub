/**
 * EL5 MediProcure — Session State Cache v1.0
 * Tracks the last VALID path per user so RoleGuard can silently
 * redirect instead of showing "Access Restricted" errors.
 * Uses sessionStorage (per-tab) + localStorage (cross-tab).
 * EL5 MediProcure · Embu Level 5 Hospital
 */

const VP_PREFIX = "el5_vp_";   // valid path
const VS_PREFIX = "el5_vs_";   // valid state (page data snapshot)

/* ── Save current valid path ─────────────────────────────────────── */
export function saveValidPath(userId: string, pathname: string): void {
  if (!pathname || pathname === "/" || pathname === "/login") return;
  try {
    const key = VP_PREFIX + userId;
    sessionStorage.setItem(key, pathname);
    localStorage.setItem(key, pathname);  // cross-tab fallback
  } catch (_e) { /* ignore quota errors */ }
}

/* ── Get last valid path ─────────────────────────────────────────── */
export function getValidPath(userId: string): string {
  try {
    return (
      sessionStorage.getItem(VP_PREFIX + userId) ||
      localStorage.getItem(VP_PREFIX + userId) ||
      "/dashboard"
    );
  } catch (_e) { return "/dashboard"; }
}

/* ── Save page state snapshot (for instant restore) ─────────────── */
export function savePageState<T>(userId: string, page: string, state: T): void {
  try {
    sessionStorage.setItem(
      VS_PREFIX + userId + "_" + page,
      JSON.stringify({ state, ts: Date.now() })
    );
  } catch (_e) { /* ignore */ }
}

/* ── Get page state (returns null if stale > 30 min) ────────────── */
export function getPageState<T>(userId: string, page: string, maxAgeMs = 30 * 60_000): T | null {
  try {
    const raw = sessionStorage.getItem(VS_PREFIX + userId + "_" + page);
    if (!raw) return null;
    const { state, ts } = JSON.parse(raw);
    if (Date.now() - ts > maxAgeMs) return null;
    return state as T;
  } catch (_e) { return null; }
}

/* ── Clear all session state for user (on sign-out) ─────────────── */
export function clearSessionState(userId: string): void {
  try {
    [...Object.keys(sessionStorage), ...Object.keys(localStorage)]
      .filter(k => k.startsWith(VP_PREFIX + userId) || k.startsWith(VS_PREFIX + userId))
      .forEach(k => { try { sessionStorage.removeItem(k); localStorage.removeItem(k); } catch (_e) { /* ignore */ } });
  } catch (_e) { /* ignore */ }
}

/* ── Role home paths — where to land on first login per role ─────── */
const ROLE_HOME: Record<string, string> = {
  superadmin:           "/dashboard",
  admin:                "/dashboard",
  webmaster:            "/dashboard",
  database_admin:       "/admin/database",
  procurement_manager:  "/requisitions",
  procurement_officer:  "/requisitions",
  finance_manager:      "/finance-dashboard",
  finance_officer:      "/finance-dashboard",
  accountant:           "/finance-dashboard",
  inventory_manager:    "/inventory",
  warehouse_officer:    "/inventory",
  requisitioner:        "/requisitions",
};

export function getRoleHome(roles: string[]): string {
  for (const role of roles) {
    if (ROLE_HOME[role]) return ROLE_HOME[role];
  }
  return "/dashboard";
}

/* ── Save last active tab per user+page ──────────────────────────── */
const TAB_PREFIX = "el5_tab_";
export function saveLastTab(userId: string, page: string, tabId: string): void {
  try { sessionStorage.setItem(`${TAB_PREFIX}${userId}_${page}`, tabId); } catch (_e) { /* ignore */ }
}
export function getLastTab(userId: string, page: string, defaultTab: string): string {
  try { return sessionStorage.getItem(`${TAB_PREFIX}${userId}_${page}`) || defaultTab; } catch (_e) { return defaultTab; }
}

/* ── Save per-page search terms ──────────────────────────────────── */
const SRCH_PREFIX = "el5_srch_";
export function saveSearch(userId: string, page: string, search: string): void {
  try { sessionStorage.setItem(`${SRCH_PREFIX}${userId}_${page}`, search); } catch (_e) { /* ignore */ }
}
export function getSearch(userId: string, page: string): string {
  try { return sessionStorage.getItem(`${SRCH_PREFIX}${userId}_${page}`) || ""; } catch (_e) { return ""; }
}

/* ── Track navigation history for smart back-navigation ─────────── */
const HIST_KEY = "el5_navhist_";
export function pushNavHistory(userId: string, path: string): void {
  try {
    const hist: string[] = JSON.parse(localStorage.getItem(`${HIST_KEY}${userId}`) || "[]");
    if (hist[hist.length - 1] === path) return;
    hist.push(path);
    if (hist.length > 20) hist.shift();
    localStorage.setItem(`${HIST_KEY}${userId}`, JSON.stringify(hist));
  } catch (_e) { /* ignore */ }
}
export function popNavHistory(userId: string): string | null {
  try {
    const hist: string[] = JSON.parse(localStorage.getItem(`${HIST_KEY}${userId}`) || "[]");
    if (hist.length <= 1) return null;
    hist.pop();
    localStorage.setItem(`${HIST_KEY}${userId}`, JSON.stringify(hist));
    return hist[hist.length - 1] || "/dashboard";
  } catch (_e) { return null; }
}
