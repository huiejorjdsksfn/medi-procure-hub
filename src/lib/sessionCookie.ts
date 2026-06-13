/**
 * EL5 MediProcure — SessionCookieManager v1.0
 * Secure HTTP-like cookie layer for instant role resolution on page load.
 * Works alongside sessionToken (localStorage) and sessionEngine (IndexedDB).
 *
 * Priority chain:
 *   Cookie → localStorage token → IndexedDB session → Supabase DB
 *
 * Cookie format: el5_role_cookie=base64(JSON) ; SameSite=Strict ; max-age=28800
 * Stores: userId, primaryRole, roles[], email, fullName, issuedAt, expiresAt
 */

const COOKIE_NAME  = "el5_role_v1";
const COOKIE_TTL_S = 8 * 60 * 60;   // 8 hours (matches sessionEngine TTL)
const COOKIE_REFRESH_THRESHOLD = 60 * 60 * 1000; // Refresh if <1hr left

export interface RoleCookie {
  userId:      string;
  email:       string;
  fullName:    string;
  primaryRole: string;
  roles:       string[];
  issuedAt:    number;   // Unix ms
  expiresAt:   number;   // Unix ms
}

// ── Encode / Decode ──────────────────────────────────────────────
function encode(data: RoleCookie): string {
  try { return btoa(encodeURIComponent(JSON.stringify(data))); } catch { return ""; }
}

function decode(raw: string): RoleCookie | null {
  try { return JSON.parse(decodeURIComponent(atob(raw))); } catch { return null; }
}

// ── Cookie I/O ───────────────────────────────────────────────────
function writeCookie(value: string, maxAgeSeconds: number): void {
  const secure   = location.protocol === "https:" ? "; Secure" : "";
  const sameSite = "; SameSite=Strict";
  const path     = "; Path=/";
  const maxAge   = `; Max-Age=${maxAgeSeconds}`;
  document.cookie = `${COOKIE_NAME}=${value}${maxAge}${path}${sameSite}${secure}`;
}

function readCookie(): string | null {
  const prefix = `${COOKIE_NAME}=`;
  const found  = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

function deleteCookie(): void {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Strict`;
}

// ── Public API ───────────────────────────────────────────────────

/** Write a fresh role cookie after login or role refresh */
export function setRoleCookie(
  userId: string,
  email: string,
  fullName: string,
  roles: string[],
  primaryRole: string
): RoleCookie {
  const now = Date.now();
  const cookie: RoleCookie = {
    userId, email, fullName, primaryRole, roles,
    issuedAt:  now,
    expiresAt: now + COOKIE_TTL_S * 1000,
  };
  writeCookie(encode(cookie), COOKIE_TTL_S);
  return cookie;
}

/** Read + validate the role cookie. Returns null if missing/expired/corrupt */
export function getRoleCookie(): RoleCookie | null {
  const raw = readCookie();
  if (!raw) return null;
  const cookie = decode(raw);
  if (!cookie) { deleteCookie(); return null; }
  if (Date.now() > cookie.expiresAt) { deleteCookie(); return null; }
  return cookie;
}

/** Refresh cookie TTL (extend by COOKIE_TTL_S from now) */
export function refreshRoleCookie(): void {
  const cookie = getRoleCookie();
  if (!cookie) return;
  const remaining = cookie.expiresAt - Date.now();
  if (remaining < COOKIE_REFRESH_THRESHOLD) {
    setRoleCookie(cookie.userId, cookie.email, cookie.fullName, cookie.roles, cookie.primaryRole);
  }
}

/** Clear cookie on sign-out */
export function clearRoleCookie(): void {
  deleteCookie();
}

/** Returns true if a valid, non-expired cookie exists for this userId */
export function hasCookieForUser(userId: string): boolean {
  const cookie = getRoleCookie();
  return !!(cookie && cookie.userId === userId && Date.now() < cookie.expiresAt);
}

/** Update roles in the existing cookie (e.g. after role change) */
export function updateCookieRoles(roles: string[], primaryRole: string): void {
  const cookie = getRoleCookie();
  if (!cookie) return;
  setRoleCookie(cookie.userId, cookie.email, cookie.fullName, roles, primaryRole);
}

// ── Role Matrix ──────────────────────────────────────────────────
// Maps each role to: defaultRoute + allowed top-level route prefixes
export const ROLE_MATRIX: Record<string, {
  defaultRoute: string;
  label: string;
  allowedPrefixes: string[];
  deniedPrefixes: string[];
}> = {
  superadmin: {
    label: "Super Administrator",
    defaultRoute: "/dashboard",
    allowedPrefixes: ["/"],          // all
    deniedPrefixes: [],
  },
  admin: {
    label: "Administrator",
    defaultRoute: "/dashboard",
    allowedPrefixes: ["/"],
    deniedPrefixes: [],
  },
  webmaster: {
    label: "Webmaster",
    defaultRoute: "/dashboard",
    allowedPrefixes: ["/"],
    deniedPrefixes: [],
  },
  database_admin: {
    label: "Database Admin",
    defaultRoute: "/admin/database",
    allowedPrefixes: ["/dashboard","/admin","/audit-log","/reports","/profile","/notifications"],
    deniedPrefixes: ["/finance-workspace","/accountant","/vouchers","/requisitions"],
  },
  procurement_manager: {
    label: "Procurement Manager",
    defaultRoute: "/dashboard",
    allowedPrefixes: ["/dashboard","/requisitions","/purchase-orders","/suppliers","/goods-received",
      "/tenders","/bid-evaluations","/contracts","/procurement-planning",
      "/vouchers","/financials","/reports","/items","/categories","/departments",
      "/scanner","/quality","/audit-log","/documents","/inbox","/email",
      "/notifications","/profile","/accountant","/finance-workspace","/whatsapp"],
    deniedPrefixes: ["/admin","/users","/settings","/webmaster","/gui-editor","/backup","/odbc"],
  },
  finance_manager: {
    label: "Finance Manager",
    defaultRoute: "/finance-dashboard",
    allowedPrefixes: ["/dashboard","/finance-dashboard","/finance-workspace","/financials","/vouchers",
      "/reports","/audit-log","/profile","/notifications","/documents","/inbox"],
    deniedPrefixes: ["/admin","/users","/settings","/webmaster","/requisitions",
      "/purchase-orders","/tenders","/bid-evaluations","/contracts","/procurement-planning"],
  },
  finance_officer: {
    label: "Finance Officer",
    defaultRoute: "/finance-dashboard",
    allowedPrefixes: ["/dashboard","/finance-dashboard","/finance-workspace","/financials","/vouchers",
      "/reports","/profile","/notifications","/documents","/inbox"],
    deniedPrefixes: ["/admin","/users","/settings","/webmaster","/audit-log",
      "/requisitions","/purchase-orders","/tenders","/bid-evaluations",
      "/contracts","/procurement-planning"],
  },
  accountant: {
    label: "Accountant",
    defaultRoute: "/accountant-workspace",
    allowedPrefixes: ["/dashboard","/accountant","/accountant-workspace","/finance-workspace",
      "/financials","/vouchers","/purchase-orders","/goods-received",
      "/reports","/profile","/notifications","/documents","/inbox","/audit-log"],
    deniedPrefixes: ["/admin","/users","/settings","/webmaster"],
  },
  procurement_officer: {
    label: "Procurement Officer",
    defaultRoute: "/requisitions",
    allowedPrefixes: ["/dashboard","/requisitions","/purchase-orders","/suppliers",
      "/goods-received","/tenders","/vouchers","/items","/categories",
      "/departments","/scanner","/reports","/documents","/inbox","/profile","/notifications"],
    deniedPrefixes: ["/admin","/users","/settings","/webmaster","/finance-workspace",
      "/financials","/accountant","/audit-log"],
  },
  inventory_manager: {
    label: "Inventory Manager",
    defaultRoute: "/items",
    allowedPrefixes: ["/dashboard","/items","/categories","/departments",
      "/goods-received","/scanner","/reports","/documents","/inbox","/profile","/notifications"],
    deniedPrefixes: ["/admin","/finance-workspace","/financials","/vouchers",
      "/accountant","/purchase-orders","/suppliers","/tenders"],
  },
  warehouse_officer: {
    label: "Warehouse Officer",
    defaultRoute: "/goods-received",
    allowedPrefixes: ["/dashboard","/goods-received","/items","/scanner",
      "/documents","/inbox","/profile","/notifications"],
    deniedPrefixes: ["/admin","/finance-workspace","/financials","/vouchers",
      "/accountant","/purchase-orders","/suppliers","/tenders","/requisitions"],
  },
  requisitioner: {
    label: "Requisitioner",
    defaultRoute: "/requisitions",
    allowedPrefixes: ["/dashboard","/requisitions","/items","/scanner",
      "/documents","/inbox","/profile","/notifications"],
    deniedPrefixes: ["/admin","/finance-workspace","/financials","/vouchers",
      "/accountant","/purchase-orders","/suppliers","/tenders","/bid-evaluations"],
  },
};

/** Check if a role is allowed on a given path */
export function isRouteAllowed(role: string, path: string): boolean {
  // Admin tier always allowed
  if (["superadmin","admin","webmaster"].includes(role)) return true;
  const matrix = ROLE_MATRIX[role];
  if (!matrix) return false;
  // Deny list takes priority
  if (matrix.deniedPrefixes.some(p => path.startsWith(p))) return false;
  // Check allow list
  return matrix.allowedPrefixes.some(p => path === p || path.startsWith(p + "/") || p === "/");
}

/** Get the default landing route for a role */
export function getDefaultRoute(role: string): string {
  return ROLE_MATRIX[role]?.defaultRoute ?? "/dashboard";
}
