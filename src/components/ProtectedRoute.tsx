import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex" as const, alignItems: "center" as const,
        justifyContent: "center" as const, flexDirection: "column" as const, gap: 16,
        background: "linear-gradient(145deg,#0a2e6e,#0a2558)",
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"0.04em" }}>
          EL5 MediProcure
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>Embu Level 5 Hospital</div>
        <div style={{
          width:32, height:32, borderRadius:"50%",
          border:"3px solid rgba(255,255,255,0.2)",
          borderTopColor:"#C45911",
          animation:"spin 0.8s linear infinite",
        }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
