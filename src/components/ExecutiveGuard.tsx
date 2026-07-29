/**
 * ExecutiveGuard — enforces the CEO/CFO "stats and trends only" tier.
 * A user whose ONLY role(s) are ceo/cfo (no operational or admin role
 * also assigned) is confined to EXECUTIVE_ALLOWED_PATHS regardless of
 * which URL they navigate to directly — this is a route-level block,
 * not just a hidden nav item, so typing a URL in by hand doesn't bypass
 * it. Anyone who also holds an operational/admin role is unaffected.
 * EL5 MediProcure — Embu Level 5 Hospital
 */
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, EXECUTIVE_TIER, EXECUTIVE_ALLOWED_PATHS } from "@/contexts/AuthContext";

export default function ExecutiveGuard({ children }: { children: React.ReactNode }) {
  const { roles, initialized } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExecutiveOnly = roles.length > 0 && roles.every(r => EXECUTIVE_TIER.includes(r as any));
  const pathAllowed = EXECUTIVE_ALLOWED_PATHS.some(p => location.pathname === p || location.pathname.startsWith(p + "/"));

  useEffect(() => {
    if (!initialized || !isExecutiveOnly || pathAllowed) return;
    const t = setTimeout(() => navigate("/dashboard", { replace: true }), 60);
    return () => clearTimeout(t);
  }, [initialized, isExecutiveOnly, pathAllowed, location.pathname, navigate]);

  if (isExecutiveOnly && !pathAllowed) return null; // redirect firing above
  return <>{children}</>;
}
