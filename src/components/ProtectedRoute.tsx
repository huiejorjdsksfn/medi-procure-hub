/**
 * ProtectedRoute v3.0  -- Uses SessionEngine for instant render (no blank screen)
 * Shows loading spinner only on first cold load, never redirects mid-session
 */
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { T } from "@/lib/theme";

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading, initialized } = useAuth();

  /* Show loading only on very first cold load */
  if (loading && !initialized) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center",
        justifyContent:"center", flexDirection:"column", gap:16,
        background:T.bg, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:T.card, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <img src="/icons/icon-32.png" alt="" style={{ width:28, height:28, objectFit:"contain" }}/>
          </div>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:T.fg }}>EL5 MediProcure</div>
            <div style={{ fontSize:10, color:T.fgDim, marginTop:2 }}>Embu Level 5 Hospital</div>
          </div>
        </div>
        <div style={{
          width:32, height:32, borderRadius:"50%",
          border:`3px solid ${T.border}`,
          borderTopColor:T.primary,
          animation:"spin 0.8s linear infinite",
        }}/>
        <div style={{ fontSize:11, color:T.fgDim }}>Loading session...</div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  /* Once initialized  -- redirect if no session */
  if (initialized && !session) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
