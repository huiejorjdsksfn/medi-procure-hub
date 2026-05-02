import { useAuth } from "@/contexts/AuthContext";
import { Shield, Lock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

// All system roles
export const ALL_ROLES = [
  "admin","database_admin","procurement_manager","procurement_officer",
  "accountant","inventory_manager","warehouse_officer","requisitioner","reception"
] as const;

export type SystemRole = typeof ALL_ROLES[number];

interface RoleGuardProps {
  allowed: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** If true, admin always passes even if not in allowed list */
  adminBypass?: boolean;
}

// Banner shown at top of pages where user has limited access
export function RoleBanner({ message, type = "info" }: { message: string; type?: "info" | "warning" | "readonly" }) {
  const colors = {
    info:     { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    warning:  { bg: "#fffbeb", border: "#fde68a", text: "#d97706" },
    readonly: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" },
  };
  const c = colors[type];
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
      fontSize:12, borderBottom:`1px solid ${c.border}`, background:c.bg, color:c.text }}>
      <Shield style={{ width:14, height:14, flexShrink:0 }}/>
      <span>{message}</span>
    </div>
  );
}

// Full page block for truly restricted pages
export function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const navigate = useNavigate();
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center",
      minHeight:"calc(100vh - 120px)", background:"#f9fafb" }}>
      <div style={{ textAlign:"center", maxWidth:360, padding:"0 24px" }}>
        <div style={{ width:64, height:64, borderRadius:16, background:"#fee2e2",
          display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
          <Lock style={{ width:28, height:28, color:"#ef4444" }}/>
        </div>
        <h2 style={{ fontSize:18, fontWeight:700, color:"#111827", margin:"0 0 8px" }}>Access Restricted</h2>
        <p style={{ fontSize:13, color:"#6b7280", margin:"0 0 4px" }}>You do not have permission to view this page.</p>
        <p style={{ fontSize:11, color:"#9ca3af", margin:"0 0 24px" }}>
          Required roles: {requiredRoles.join(", ")}
        </p>
        <button onClick={() => navigate("/dashboard")} style={{
          display:"inline-flex", alignItems:"center", gap:8,
          padding:"10px 20px", background:"#2563eb", color:"#fff",
          fontSize:13, fontWeight:600, borderRadius:8, border:"none", cursor:"pointer",
        }}>
          <ChevronRight style={{ width:14, height:14 }}/>Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// HOC that wraps page content with role check
export default function RoleGuard({ allowed, children, fallback, adminBypass = true }: RoleGuardProps) {
  const { roles } = useAuth();
  const hasAccess = (adminBypass && roles.includes("admin")) || allowed.some(r => roles.includes(r));
  if (!hasAccess) {
    return fallback ? <>{fallback}</> : <AccessDenied requiredRoles={allowed}/>;
  }
  return <>{children}</>;
}
