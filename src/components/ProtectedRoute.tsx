import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(145deg,#0a2e6e,#1565c0,#29b6f6)", fontFamily: "Segoe UI, system-ui, sans-serif" }}
      >
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)" }}
          >
            <img src="/favicon.png" alt="" className="w-9 h-9 object-contain drop-shadow"
              style={{ filter: "brightness(0) invert(1)" }}
              onError={e => ((e.target as HTMLElement).style.display = "none")}
            />
          </div>
          <div className="w-8 h-8 border-[3px] border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-white/70 text-sm font-medium">Loading MediProcure…</p>
          <p className="text-white/40 text-xs mt-1">Embu Level 5 Hospital</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
