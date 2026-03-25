import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 16,
        background: "linear-gradient(145deg,#0a2e6e,#1565c0,#0a2558)",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "#e2e8f0", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <img src="/favicon.png" alt=""
            style={{ width: 36, height: 36, objectFit: "contain", filter: "brightness(0) invert(1)" }}
            onError={e => ((e.target as HTMLElement).style.display = "none")}
          />
        </div>
        {/* Spinner */}
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid rgba(255,255,255,0.25)",
          borderTopColor: "#fff",
          animation: "spin 0.8s linear infinite",
        }}/>
        <div>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, fontWeight: 500, textAlign: "center", margin: 0 }}>
            Loading MediProcure…
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textAlign: "center", marginTop: 4 }}>
            Embu Level 5 Hospital
          </p>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
