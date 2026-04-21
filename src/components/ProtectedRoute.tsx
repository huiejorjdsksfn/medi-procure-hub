/**
 * ProcurBosse — ProtectedRoute v5.0 NUCLEAR
 * NO loading screen — redirect to /login immediately if not authed
 * Logged in users go straight to dashboard with zero delay
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, initialized } = useAuth();

  // Not yet initialized — show nothing (splash already covered this)
  if (!initialized) return null;

  // No session → go to login
  if (!session) return <Navigate to="/login" replace />;

  // Has session → show page
  return <>{children}</>;
}
