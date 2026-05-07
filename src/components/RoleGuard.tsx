/**
 * ProcurBosse - RoleGuard v3.0
 * Superadmin / webmaster bypass - No access-denied flash on refresh
 * Graceful degradation while session loads
 */
import { useAuth, ProcurementRole } from "@/contexts/AuthContext";
import { Shield, Lock, ChevronRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { T } from "@/lib/theme";

interface RoleGuardProps {
  allowed: (ProcurementRole | string)[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/* Roles that bypass all guards */
const SUPERROLES = ["superadmin","webmaster","admin"] as const;

export function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight:400, display:"flex", alignItems:"center", justifyContent:"center",
      background:T.bg, fontFamily:"'Inter','Segoe UI',sans-serif",
    }}>
      <div style={{ textAlign:"center", maxWidth:360, padding:"0 24px" }}>
        <div style={{
          width:64, height:64, borderRadius:16, background:T.errorBg,
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px",
        }}>
          <Lock style={{ width:28, height:28, color:T.error }}/>
        </div>
        <h2 style={{ fontSize:18, fontWeight:800, color:T.fg, margin:"0 0 8px" }}>
          Access Restricted
        </h2>
        <p style={{ fontSize:13, color:T.fgMuted, margin:"0 0 6px", lineHeight:1.6 }}>
          You don't have permission to view this page.
        </p>
        <p style={{ fontSize:11, color:T.fgDim, margin:"0 0 24px" }}>
          Required: {requiredRoles.map(r=>r.replace(/_/g," ")).join(", ")}
        </p>
        <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
          <button onClick={() => navigate(-1)}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 18px",
              background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r,
              cursor:"pointer", fontSize:13, fontWeight:600, color:T.fgMuted }}>
            - Back
          </button>
          <button onClick={() => navigate("/dashboard")}
            style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"9px 18px",
              background:T.primary, color:"#fff", border:"none", borderRadius:T.r,
              cursor:"pointer", fontSize:13, fontWeight:600 }}>
            <ChevronRight size={14}/> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export function RoleBanner({ message, type="info" }: { message:string; type?:"info"|"warning"|"readonly" }) {
  const cfg = {
    info:     { bg:`${T.info}12`,    border:`${T.info}33`,    text:T.info },
    warning:  { bg:`${T.warning}12`, border:`${T.warning}33`, text:T.warning },
    readonly: { bg:T.bg2,            border:T.border,          text:T.fgMuted },
  }[type];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
      fontSize:12, borderBottom:`1px solid ${cfg.border}`, background:cfg.bg, color:cfg.text }}>
      <Shield style={{ width:14, height:14, flexShrink:0 }}/>
      <span>{message}</span>
    </div>
  );
}

export default function RoleGuard({ allowed, children, fallback }: RoleGuardProps) {
  const { roles, loading, initialized } = useAuth();

  /* While auth is loading - show spinner, never show access denied */
  if (loading && !initialized) {
    return (
      <div style={{ minHeight:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <RefreshCw size={20} color={T.fgDim} style={{ animation:"spin 1s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* Superadmin / webmaster / admin bypass */
  if (SUPERROLES.some(r => roles.includes(r))) return <>{children}</>;

  /* Normal role check */
  const hasAccess = allowed.some(r => roles.includes(r as ProcurementRole));
  if (hasAccess) return <>{children}</>;

  return fallback ? <>{fallback}</> : <AccessDenied requiredRoles={allowed as string[]}/>;
}

import type React from "react";
