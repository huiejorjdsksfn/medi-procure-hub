/**
 * EL5 MediProcure — RoleGuard v5.0
 * SILENT MODE: Never shows "Access Restricted" to regular users.
 * On denial → silently redirects to last valid path (or role home).
 * Records every denied attempt to audit_logs for admin visibility.
 * Admin-tier (superadmin/admin/webmaster) bypass all guards.
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useAuth, ProcurementRole, ADMIN_TIER } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Lock, ChevronRight, RefreshCw } from "lucide-react";
import { T } from "@/lib/theme";
import type React from "react";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  saveValidPath, getValidPath, getRoleHome, pushNavHistory,
} from "@/lib/sessionStateCache";

const db = supabase as any;

interface RoleGuardProps {
  allowed: (ProcurementRole | string)[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, show a subtle read-only banner instead of blocking */
  readOnly?: boolean;
  /** If true, admin sees the classic AccessDenied screen (for testing) */
  debugMode?: boolean;
}

/* ── Audit log helper — fire and forget ─────────────────────────── */
async function logDenied(
  userId: string | undefined,
  userEmail: string | undefined,
  path: string,
  required: string[],
  userRoles: string[],
): Promise<void> {
  try {
    await db.from("audit_log").insert({
      user_id: userId || null,
      user_email: userEmail || null,
      action: "access_denied",
      module: "auth",
      resource_type: "page",
      resource_id: path,
      details: { required_roles: required, user_roles: userRoles, silent_redirect: true },
      ip_address: null,
      created_at: new Date().toISOString(),
    });
  } catch (_e) { /* never block render */ }
}

/* ── Spinner ─────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <RefreshCw size={20} color={T.fgDim} style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── AccessDenied screen — only shown to admins in debugMode ─────── */
export function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: 400, display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 360, padding: "0 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: T.errorBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Lock style={{ width: 28, height: 28, color: T.error }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: T.fg, margin: "0 0 8px" }}>Access Restricted</h2>
        <p style={{ fontSize: 13, color: T.fgMuted, margin: "0 0 6px", lineHeight: 1.6 }}>You don't have permission to view this page.</p>
        <p style={{ fontSize: 11, color: T.fgDim, margin: "0 0 24px" }}>Required: {requiredRoles.map(r => r.replace(/_/g, " ")).join(", ")}</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button onClick={() => navigate(-1)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: T.bg2, border: `1px solid ${T.border}`, borderRadius: T.r, cursor: "pointer", fontSize: 13, fontWeight: 600, color: T.fgMuted }}>← Back</button>
          <button onClick={() => navigate("/dashboard")} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 18px", background: T.primary, color: "#fff", border: "none", borderRadius: T.r, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <ChevronRight size={14} /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Role banner (read-only notice) ─────────────────────────────── */
export function RoleBanner({ message, type = "info" }: { message: string; type?: "info" | "warning" | "readonly" }) {
  const cfg = {
    info:     { bg: `${T.info}12`,    border: `${T.info}33`,    text: T.info },
    warning:  { bg: `${T.warning}12`, border: `${T.warning}33`, text: T.warning },
    readonly: { bg: T.bg2,            border: T.border,          text: T.fgMuted },
  }[type];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12, borderBottom: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.text }}>
      <Shield style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

/* ── Main RoleGuard ──────────────────────────────────────────────── */
export default function RoleGuard({ allowed, children, fallback, readOnly, debugMode }: RoleGuardProps) {
  const { roles, loading, initialized, isAdminTier, user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const deniedRef = useRef(false);

  const isAdmin   = isAdminTier || ADMIN_TIER.some(r => roles.includes(r));
  const hasAccess = isAdmin || allowed.some(r => roles.includes(r as ProcurementRole));
  const userId    = user?.id;
  const userEmail = user?.email || profile?.email;

  /* Save this path as valid whenever access is granted */
  useEffect(() => {
    if (hasAccess && initialized && userId) {
      saveValidPath(userId, location.pathname);
      pushNavHistory(userId, location.pathname);
    }
  }, [hasAccess, initialized, userId, location.pathname]);

  /* Silent redirect on denial */
  useEffect(() => {
    if (!initialized || loading || hasAccess || deniedRef.current) return;
    deniedRef.current = true;

    // Log to audit_logs (fire and forget)
    logDenied(userId, userEmail, location.pathname, allowed as string[], roles);

    // Redirect to last valid path or role home — silently
    const dest = userId
      ? getValidPath(userId)
      : getRoleHome(roles);

    // Small delay so React finishes render before redirect
    const t = setTimeout(() => {
      navigate(dest, { replace: true });
    }, 80);
    return () => clearTimeout(t);
  }, [initialized, loading, hasAccess, userId, userEmail, location.pathname, allowed, roles, navigate]);

  /* Cold load — show spinner, never flash "access denied" */
  if (loading && !initialized) return <Spinner />;

  /* Access granted */
  if (hasAccess) {
    if (readOnly) {
      return (
        <>
          <RoleBanner message="Read-only access. Contact admin for editing rights." type="readonly" />
          {children}
        </>
      );
    }
    return <>{children}</>;
  }

  /* Access denied — admin debug mode shows screen; others get null while redirect fires */
  if (fallback) return <>{fallback}</>;
  if (debugMode && isAdmin) return <AccessDenied requiredRoles={allowed as string[]} />;
  return null;  // redirect fires in useEffect above
}
