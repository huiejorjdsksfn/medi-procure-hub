/**
 * NetworkGuard v2.0 — IP restriction with Image 3 Access Denied UI
 * Clean white card, Embu logo, countdown, "Log Out Now" button
 */
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";

interface DeniedState {
  ip: string;
  network: string;
  reason: string;
}

// ─── Access Denied overlay (Image 3 design) ─────────────────────────────────
function AccessDeniedOverlay({ denied, onLogout }: { denied: DeniedState; onLogout: () => void }) {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { onLogout(); clearInterval(iv); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "rgba(10,14,26,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Card — matches Image 3 */}
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px",
        maxWidth: 420, width: "90%", textAlign: "center",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.15)",
      }}>
        {/* Red circle with ban icon */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "#fee2e2",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ fontSize: 36, lineHeight: 1 }}>🚫</div>
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: 24, fontWeight: 900, color: "#dc2626", marginBottom: 8 }}>
          Access Denied
        </div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
          Your IP address is not authorized to access this system.
        </div>

        {/* Info box */}
        <div style={{
          background: "#f8fafc", borderRadius: 12, padding: "14px 18px",
          border: "1px solid #e5e7eb", marginBottom: 22, textAlign: "left",
        }}>
          {[
            { label: "Your IP",  value: denied.ip },
            { label: "Network",  value: denied.network },
            { label: "Reason",   value: denied.reason, red: true },
          ].map(row => (
            <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"5px 0", borderBottom:"1px solid #f0f0f0", gap:16 }}>
              <span style={{ fontSize:13, color:"#6b7280", fontWeight:500, flexShrink:0 }}>{row.label}</span>
              <span style={{ fontSize:13, color:row.red?"#dc2626":"#374151", fontWeight:row.red?700:600, textAlign:"right" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div style={{ fontSize:13, color:"#6b7280", marginBottom:18 }}>
          You will be automatically logged out in <strong style={{ color:"#dc2626" }}>{countdown}</strong> second{countdown!==1?"s":""}.
        </div>

        {/* Log Out Now button */}
        <button onClick={onLogout}
          style={{
            width:"100%", padding:"13px 0", borderRadius:50, border:"none",
            background: "linear-gradient(135deg,#dc2626,#b91c1c)",
            color: "#fff", fontWeight:800, fontSize:15, cursor:"pointer",
            boxShadow: "0 4px 18px rgba(220,38,38,0.4)",
            marginBottom:16,
          }}>
          Log Out Now
        </button>

        {/* Footer */}
        <div style={{ fontSize:11, color:"#9ca3af", lineHeight:1.6 }}>
          Contact the IT Department to whitelist your IP address.<br/>
          <span style={{ fontWeight:600 }}>Embu Level 5 Hospital · EL5 MediProcure</span>
        </div>

        {/* Logo watermark */}
        <div style={{ marginTop:14, display:"flex", justifyContent:"center" }}>
          <img src={logoImg} alt="EL5H" style={{ width:28, height:28, borderRadius:"50%", objectFit:"contain", opacity:0.4 }} />
        </div>
      </div>
    </div>
  );
}

export default function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const checkedRef = useRef<string | null>(null);
  const [denied, setDenied] = useState<DeniedState | null>(null);

  useEffect(() => {
    if (!user || checkedRef.current === user.id) return;
    checkedRef.current = user.id;

    (async () => {
      try {
        const { data: setting } = await (supabase as any)
          .from("system_settings").select("value")
          .eq("key","ip_restriction_enabled").maybeSingle();
        if (setting?.value !== "true") return;

        // Get IP
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 4000);
        let ip = "unknown";
        try {
          const r = await fetch("https://api.ipify.org?format=json",{signal:ctrl.signal});
          ip = (await r.json()).ip || "unknown";
        } catch { /* fail open */ }
        clearTimeout(t);

        // Check private
        const isPrivate = (s: string) => {
          const parts = s.split(".").map(Number);
          if (parts.length!==4) return false;
          if (parts[0]===10) return true;
          if (parts[0]===172&&parts[1]>=16&&parts[1]<=31) return true;
          if (parts[0]===192&&parts[1]===168) return true;
          if (parts[0]===127) return true;
          return false;
        };
        const network = ip==="unknown"?"unknown":isPrivate(ip)?"private":"public";

        const { data: allowPriv } = await (supabase as any)
          .from("system_settings").select("value")
          .eq("key","allow_all_private").maybeSingle();
        if (allowPriv?.value!=="false"&&network==="private") return;

        // Check whitelist
        const { data: whitelist } = await (supabase as any)
          .from("network_whitelist").select("cidr,label,active").eq("active",true);
        const entries = whitelist || [];
        if (!entries.length) return; // no rules

        const ipNum = (s: string) => s.split(".").reduce((a:number,b:string)=>(a<<8)|+b,0)>>>0;
        const inCidr = (ip: string, cidr: string) => {
          const [net,bits]=cidr.split("/");
          if(!bits) return ip===net;
          const mask=bits==="0"?0:(~0<<(32-+bits))>>>0;
          return (ipNum(ip)&mask)===(ipNum(net)&mask);
        };

        const matched = entries.some((e:any) => { try{return inCidr(ip,e.cidr);}catch{return false;} });
        if (!matched) {
          const reason = `IP ${ip} not in whitelist (${entries.length} active rule${entries.length!==1?"s":""} checked)`;
          // Log the denied access
          try {
            await (supabase as any).from("ip_access_log").insert({
              ip_address:ip, network, allowed:false,
              reason, user_id:user.id, user_email:user.email,
              path:window.location.pathname, created_at:new Date().toISOString(),
            });
          } catch {}
          setDenied({ ip, network, reason });
        }
      } catch (e) {
        console.warn("[NetworkGuard] fail-open:", e);
      }
    })();
  }, [user]);

  async function handleLogout() {
    setDenied(null);
    await supabase.auth.signOut();
    window.location.href = "/login?reason=ip_denied";
  }

  return (
    <>
      {children}
      {denied && <AccessDeniedOverlay denied={denied} onLogout={handleLogout} />}
    </>
  );
}
