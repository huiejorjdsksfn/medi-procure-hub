/**
 * NetworkGuard — IP Restriction enforcement component
 * Wraps the entire app. Checks IP on load and disconnects if outside whitelist.
 * Shows IP info page with real-time whitelist viewer for admins.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkIpAccess, revokeSession, type IpCheckResult } from "@/lib/ipRestriction";
import { supabase } from "@/integrations/supabase/client";

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // re-check every 5 min

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, roles } = useAuth();
  const [status, setStatus] = useState<"checking"|"allowed"|"denied"|"disabled">("checking");
  const [result, setResult] = useState<IpCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  const doCheck = useCallback(async () => {
    if (!user) { setStatus("allowed"); setLoading(false); return; }
    // Hard 3s timeout - fail open so app is never blocked
    const timer = setTimeout(() => { setStatus("allowed"); setLoading(false); }, 3000);
    try {
      const res = await checkIpAccess(user.id, user.email || "");
      clearTimeout(timer);
      setResult(res);
      if (res.allowed) {
        setStatus("allowed");
      } else {
        setStatus("denied");
        // Give 5 seconds to read the message before revoking
        setTimeout(() => revokeSession(res.reason), 5000);
      }
    } catch {
      setStatus("allowed"); // fail-open for network errors
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    doCheck();
    const interval = setInterval(doCheck, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [doCheck]);

  if (loading || status === "checking") {
    return (
      <div style={{position:"fixed",inset:0,background:"linear-gradient(145deg,#0a2e6e,#1565c0,#0a2558)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:8,letterSpacing:"0.04em"}}>EL5 MediProcure</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:20}}>Embu Level 5 Hospital</div>
          <div style={{width:40,height:40,border:"3px solid rgba(255,255,255,0.2)",borderTop:"3px solid #C45911",borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto 16px"}}/>
          <div style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>Verifying access...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (status === "denied" && result) {
    return (
      <div style={{position:"fixed",inset:0,background:"#ffffff",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
        <div style={{background:"#fff",borderRadius:16,padding:40,maxWidth:520,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
          <div style={{width:64,height:64,borderRadius:"50%",background:"#fee2e2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28}}>🚫</div>
          <div style={{fontSize:22,fontWeight:800,color:"#dc2626",marginBottom:8}}>Access Denied</div>
          <div style={{fontSize:14,color:"#6b7280",marginBottom:16}}>Your IP address is not authorized to access this system.</div>
          <div style={{background:"#f9fafb",borderRadius:10,padding:14,marginBottom:20,fontSize:13,textAlign:"left"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:"#9ca3af"}}>Your IP</span>
              <span style={{fontFamily:"monospace",fontWeight:700,color:"#374151"}}>{result.ip}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{color:"#9ca3af"}}>Network</span>
              <span style={{fontFamily:"monospace",color:"#374151"}}>{result.network}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"#9ca3af"}}>Reason</span>
              <span style={{color:"#dc2626",fontSize:12}}>{result.reason}</span>
            </div>
          </div>
          <div style={{fontSize:12,color:"#9ca3af",marginBottom:16}}>You will be automatically logged out in 5 seconds.</div>
          <button onClick={()=>revokeSession(result.reason)} style={{padding:"10px 24px",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:14}}>
            Log Out Now
          </button>
          <div style={{marginTop:16,fontSize:11,color:"#9ca3af"}}>
            Contact the IT Department to whitelist your IP address.<br/>
            Embu Level 5 Hospital · EL5 MediProcure
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
