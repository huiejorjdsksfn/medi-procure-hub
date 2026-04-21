/**
 * ProcurBosse — Login v13 D365 Style
 * Microsoft Dynamics 365 inspired login
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function LoginPage() {
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [err,     setErr]     = useState("");
  const [ready,   setReady]   = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReady(true);
    ref.current?.focus();
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) nav("/dashboard", { replace: true });
    }).catch(() => {});
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    if (!email.trim()) { setErr("Email address is required."); return; }
    if (!pass) { setErr("Password is required."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password: pass,
      });
      if (error) throw error;
      if (data.session) nav("/dashboard", { replace: true });
    } catch (e: any) {
      const m = (e?.message || "").toLowerCase();
      if (m.includes("invalid") || m.includes("credentials")) setErr("Incorrect email or password.");
      else if (m.includes("confirmed")) setErr("Account not confirmed. Contact your administrator.");
      else setErr(e?.message || "Sign in failed. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex",
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      background:"#f3f5f8",
    }}>
      {/* LEFT PANEL — D365 blue branding */}
      <div style={{
        width:"45%", minHeight:"100vh",
        background:"linear-gradient(160deg,#0078d4 0%,#005a9e 50%,#003f6e 100%)",
        display:"flex", flexDirection:"column",
        justifyContent:"space-between", padding:"48px 52px",
        position:"relative", overflow:"hidden",
      }}>
        {/* Background circles */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none"}}>
          <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"rgba(255,255,255,0.05)",top:-120,right:-120}}/>
          <div style={{position:"absolute",width:300,height:300,borderRadius:"50%",background:"rgba(255,255,255,0.04)",bottom:-80,left:-60}}/>
          <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"rgba(255,255,255,0.04)",top:"40%",right:"5%"}}/>
        </div>

        {/* Top logo */}
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:56}}>
            <div style={{
              width:44,height:44,borderRadius:10,
              background:"rgba(255,255,255,0.15)",
              border:"1.5px solid rgba(255,255,255,0.3)",
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity=".9"/>
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <div>
              <div style={{color:"#fff",fontSize:15,fontWeight:700,letterSpacing:".02em"}}>EL5 MediProcure</div>
              <div style={{color:"rgba(255,255,255,0.55)",fontSize:11}}>Embu County Government</div>
            </div>
          </div>

          <div style={{color:"#fff",fontSize:36,fontWeight:200,lineHeight:1.2,letterSpacing:"-.01em",marginBottom:20}}>
            Procurement<br/><strong style={{fontWeight:700}}>ERP System</strong>
          </div>
          <div style={{color:"rgba(255,255,255,0.65)",fontSize:13,lineHeight:1.7,maxWidth:340}}>
            Manage procurement, inventory, finance and supply chain for Embu Level 5 Hospital.
          </div>
        </div>

        {/* Module pills */}
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:32}}>
            {["Procurement","Finance","Inventory","Quality","Communications","Reports"].map(m=>(
              <div key={m} style={{
                background:"rgba(255,255,255,0.12)",
                border:"1px solid rgba(255,255,255,0.2)",
                borderRadius:20,padding:"4px 12px",
                color:"rgba(255,255,255,0.85)",fontSize:11,fontWeight:500,
              }}>{m}</div>
            ))}
          </div>
          <div style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>
            ProcurBosse v22.8 · Embu Level 5 Hospital
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — login form */}
      <div style={{
        flex:1, display:"flex", alignItems:"center", justifyContent:"center",
        padding:"48px 40px",
      }}>
        <div style={{width:"100%",maxWidth:420}}>
          {/* Header */}
          <div style={{marginBottom:40}}>
            <div style={{fontSize:26,fontWeight:700,color:"#1a1a2e",marginBottom:8,letterSpacing:"-.02em"}}>
              Sign in
            </div>
            <div style={{fontSize:14,color:"#6b7280"}}>
              Sign in with your hospital email account
            </div>
          </div>

          <form onSubmit={submit} noValidate autoComplete="on">
            {/* Email field */}
            <div style={{marginBottom:20}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#374151",marginBottom:6}}>
                Email address
              </label>
              <input
                ref={ref}
                type="email"
                autoComplete="username"
                placeholder="you@embu.health.go.ke"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                disabled={busy}
                style={{
                  width:"100%",boxSizing:"border-box" as const,
                  border:"1.5px solid #d1d5db",borderRadius:8,
                  padding:"11px 14px",fontSize:14,
                  color:"#1a1a2e",background:busy?"#f9fafb":"#fff",
                  outline:"none",fontFamily:"inherit",
                  transition:"border-color .15s",
                }}
                onFocus={e=>e.target.style.borderColor="#0078d4"}
                onBlur={e=>e.target.style.borderColor="#d1d5db"}
              />
            </div>

            {/* Password field */}
            <div style={{marginBottom:err?16:28}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,color:"#374151",marginBottom:6}}>
                Password
              </label>
              <div style={{position:"relative"}}>
                <input
                  type={showPw?"text":"password"}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={pass}
                  onChange={e=>setPass(e.target.value)}
                  disabled={busy}
                  style={{
                    width:"100%",boxSizing:"border-box" as const,
                    border:"1.5px solid #d1d5db",borderRadius:8,
                    padding:"11px 44px 11px 14px",fontSize:14,
                    color:"#1a1a2e",background:busy?"#f9fafb":"#fff",
                    outline:"none",fontFamily:"inherit",
                    transition:"border-color .15s",
                  }}
                  onFocus={e=>e.target.style.borderColor="#0078d4"}
                  onBlur={e=>e.target.style.borderColor="#d1d5db"}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={()=>setShowPw(p=>!p)}
                  style={{
                    position:"absolute",right:12,top:"50%",
                    transform:"translateY(-50%)",
                    background:"none",border:"none",cursor:"pointer",
                    color:"#9ca3af",padding:4,fontSize:15,lineHeight:1,
                  }}
                >{showPw?"🙈":"👁"}</button>
              </div>
            </div>

            {/* Error message */}
            {err && (
              <div style={{
                background:"#fef2f2",border:"1px solid #fecaca",
                borderRadius:8,padding:"10px 14px",
                marginBottom:20,color:"#dc2626",fontSize:13,
                display:"flex",alignItems:"center",gap:8,
              }}>
                <span style={{flexShrink:0}}>⚠</span>
                <span>{err}</span>
              </div>
            )}

            {/* Sign in button */}
            <button
              type="submit"
              disabled={busy}
              style={{
                width:"100%",padding:"12px",
                background:busy?"#93c5fd":"#0078d4",
                color:"#fff",border:"none",borderRadius:8,
                fontSize:15,fontWeight:600,
                cursor:busy?"not-allowed":"pointer",
                transition:"background .15s",
                display:"flex",alignItems:"center",
                justifyContent:"center",gap:8,
                letterSpacing:".01em",
                boxShadow:"0 2px 8px rgba(0,120,212,0.3)",
              }}
              onMouseEnter={e=>{ if(!busy)(e.currentTarget as HTMLElement).style.background="#106ebe"; }}
              onMouseLeave={e=>{ if(!busy)(e.currentTarget as HTMLElement).style.background="#0078d4"; }}
            >
              {busy
                ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/> Signing in...</>
                : <>Sign in</>
              }
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop:40,paddingTop:24,
            borderTop:"1px solid #e5e7eb",
            textAlign:"center",color:"#9ca3af",fontSize:12,
          }}>
            Embu Level 5 Hospital · Embu County Government, Kenya
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder{color:#9ca3af}
      `}</style>
    </div>
  );
}
