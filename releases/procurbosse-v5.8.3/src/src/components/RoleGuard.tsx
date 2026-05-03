import { useAuth, ProcurementRole } from "@/contexts/AuthContext";
import { Shield, Lock, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface RoleGuardProps {
  allowed: ProcurementRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Banner shown at top of pages where user has limited access
export function RoleBanner({ message, type = "info" }: { message: string; type?: "info" | "warning" | "readonly" }) {
  const colors = {
    info:     { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: "text-blue-500" },
    warning:  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: "text-amber-500" },
    readonly: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-600", icon: "text-gray-400" },
  };
  const c = colors[type];
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 text-xs border-b ${c.bg} ${c.border} ${c.text}`}>
      <Shield className={`w-4 h-4 shrink-0 ${c.icon}`}/>
      <span>{message}</span>
    </div>
  );
}

// Full page block for truly restricted pages
export function AccessDenied({ requiredRoles }: { requiredRoles: string[] }) {
  const navigate = useNavigate();
  return (
    <div className="h-full flex items-center justify-center bg-gray-50" style={{ minHeight: "calc(100vh - 120px)" }}>
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-red-400"/>
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-500 mb-1">You do not have permission to view this page.</p>
        <p className="text-xs text-gray-400 mb-6">
          Required: {requiredRoles.join(", ")}
        </p>
        <button onClick={() => navigate("/dashboard")}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
          <ChevronRight className="w-4 h-4"/>Go to Dashboard
        </button>
      </div>
    </div>
  );
}

// HOC that wraps page content with role check
export default function RoleGuard({ allowed, children, fallback }: RoleGuardProps) {
  const { roles } = useAuth();
  const hasAccess = allowed.some(r => roles.includes(r));
  if (!hasAccess) {
    return fallback ? <>{fallback}</> : <AccessDenied requiredRoles={allowed}/>;
  }
  return <>{children}</>;
}
