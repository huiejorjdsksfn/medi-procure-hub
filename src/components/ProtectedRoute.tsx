/**
 * ProcurBosse — ProtectedRoute v4.0 NUCLEAR
 * Shows spinner max 4s then redirects if no session
 * NEVER hangs — always resolves
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, initialized } = useAuth();
  const [forceShow, setForceShow] = useState(false);

  // After 4s force show whatever we have
  useEffect(() => {
    const t = setTimeout(() => setForceShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Still initializing and not forced
  if (!initialized && !forceShow) {
    return (
      <div style={{
        minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:16,
        background:"linear-gradient(135deg,#1565c0 0%,#0d47a1 35%,#1a237e 100%)",
        fontFamily:"'Segoe UI',system-ui,sans-serif",
      }}>
        <div style={{
          width:80,height:80,borderRadius:20,
          background:"rgba(255,255,255,0.15)",
          border:"2px solid rgba(255,255,255,0.3)",
          display:"flex",alignItems:"center",justifyContent:"center",
          animation:"pb-pulse 1.6s ease-in-out infinite",
        }}>
          <img src="/icons/icon-48.png" alt="" style={{width:44,height:44,objectFit:"contain"}}
               onError={e=>{(e.target as HTMLImageElement).style.display="none";}} />
        </div>
        <div style={{color:"#fff",fontSize:16,fontWeight:700}}>EL5 MediProcure</div>
        <div style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>Loading session...</div>
        <div style={{
          width:40,height:40,borderRadius:"50%",
          border:"3px solid rgba(255,255,255,0.2)",
          borderTopColor:"#fff",
          animation:"pb-spin .8s linear infinite",
        }}/>
        <style>{`
          @keyframes pb-spin{to{transform:rotate(360deg)}}
          @keyframes pb-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
        `}</style>
      </div>
    );
  }

  // No session → login
  if (!session) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
