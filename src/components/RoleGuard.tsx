import { useAuth, ProcurementRole } from "@/contexts/AuthContext";
import { Shield, Lock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RoleGuardProps {
  allowed: (ProcurementRole | string)[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const navigate = useNavigate();
  return (
    <div style={{
      height: "100%", minHeight: 400, display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f9fafb",
      fontFamily: "'Segoe UI',system-ui,sans-serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 340, padding: "0 24px" }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, background: "#fee2e2",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 16px",
        }}>
          <Lock style={{ width: 28, height: 28, color: "#dc2626" }}/>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
          Access Restricted
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px", lineHeight: 1.6 }}>
          You do not have permission to view this page.
        </p>
        <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 24px" }}>
          Required role: {requiredRoles.map(r => r.replace(/_/g," ")).join(", ")}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "10px 20px", background: "#0078d4", color: "#fff",
            border: "none", borderRadius: 8, cursor: "pointer",
            fontSize: 13, fontWeight: 600,
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#106ebe")}
          onMouseLeave={e => (e.currentTarget.style.background = "#0078d4")}
        >
          <ChevronRight style={{ width: 14, height: 14 }}/>
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export function RoleBanner({ message, type = "info" }: { message: string; type?: "info"|"warning"|"readonly" }) {
  const cfg = {
    info:     { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
    warning:  { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    readonly: { bg: "#f9fafb", border: "#e5e7eb", text: "#6b7280" },
  }[type];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 16px", fontSize: 12, borderBottom: `1px solid ${cfg.border}`,
      background: cfg.bg, color: cfg.text,
    }}>
      <Shield style={{ width: 14, height: 14, flexShrink: 0 }}/>
      <span>{message}</span>
    </div>
  );
}

export default function RoleGuard({ allowed, children, fallback }: RoleGuardProps) {
  const { roles } = useAuth();
  const hasAccess = allowed.some(r => roles.includes(r as ProcurementRole));
  if (!hasAccess) return fallback ? <>{fallback}</> : <AccessDenied requiredRoles={allowed as string[]}/>;
  return <>{children}</>;
}
