/**
 * ProcurBosse — LoginPage v12.0 NUCLEAR
 * Shown immediately after splash — no waiting
 * Blue gradient · Embu logo · Email + Password
 * Signs in → /dashboard instantly
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import embuLogo from "@/assets/embu-county-logo.jpg";

export default function LoginPage() {
  const [email,   setEmail]   = useState("");
  const [pass,    setPass]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [err,     setErr]     = useState("");
  const [visible, setVisible] = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  // Fade in & focus
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    setTimeout(() => ref.current?.focus(), 80);
  }, []);

  // Already logged in → dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav("/dashboard", { replace: true });
    }).catch(() => {});
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr("");
    if (!email.trim()) { setErr("Enter your email address."); return; }
    if (!pass)         { setErr("Enter your password."); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });
      if (error) throw error;
      if (data.session) nav("/dashboard", { replace: true });
    } catch (e: any) {
      const m = (e?.message || "").toLowerCase();
      if (m.includes("invalid") || m.includes("credentials"))
        setErr("Incorrect email or password.");
      else if (m.includes("confirmed"))
        setErr("Email not confirmed. Contact your administrator.");
      else if (m.includes("many"))
        setErr("Too many attempts. Wait a few minutes.");
      else
        setErr(e?.message || "Sign in failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const inp: React.CSSProperties = {
    width:"100%", boxSizing:"border-box" as const,
    padding:"12px 14px 12px 40px",
    background:"rgba(255,255,255,0.09)",
    border:"1.5px solid rgba(255,255,255,0.20)",
    borderRadius:10, color:"#fff", fontSize:14,
    outline:"none", fontFamily:"inherit",
    transition:"border-color .12s,background .12s",
  };

  return (
    <div style={{
      position:"fixed", inset:0, overflow:"hidden",
      fontFamily:"'Segoe UI','Inter',system-ui,sans-serif",
      background:"linear-gradient(135deg,#1565c0 0%,#0d47a1 40%,#1a237e 70%,#0a1172 100%)",
      display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      {/* blobs */}
      {[{w:360,h:360,top:-90,left:-90},{w:260,h:260,bottom:-70,right:-70},{w:160,h:160,top:"36%",right:"5%"}].map((b,i)=>(
        <div key={i} style={{position:"absolute",width:b.w,height:b.h,borderRadius:"50%",background:"rgba(255,255,255,0.04)",...b,pointerEvents:"none"}}/>
      ))}

      {/* Card */}
      <div style={{
        background:"rgba(255,255,255,0.09)",
        backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)",
        border:"1.5px solid rgba(255,255,255,0.16)",
        borderRadius:20, width:"100%", maxWidth:400,
        padding:"40px 36px 32px", margin:"16px",
        boxShadow:"0 24px 64px rgba(0,0,0,0.35)",
        transform: visible ? "translateY(0)" : "translateY(20px)",
        opacity: visible ? 1 : 0,
        transition:"transform 0.35s ease,opacity 0.3s ease",
        position:"relative", zIndex:1,
      }}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{
            width:68,height:68,borderRadius:16,
            background:"rgba(255,255,255,0.92)",
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 14px",
            boxShadow:"0 4px 16px rgba(0,0,0,0.22)",
          }}>
            <img src={embuLogo} alt="Embu"
              style={{width:52,height:52,objectFit:"contain",borderRadius:10}}
              onError={e=>{
                const t = e.target as HTMLImageElement;
                t.style.display="none";
                t.parentElement!.innerHTML='<span style="font-size:11px;font-weight:900;color:#0d47a1">EL5</span>';
              }}
            />
          </div>
          <div style={{color:"#fff",fontSize:20,fontWeight:800,marginBottom:3}}>EL5 MediProcure</div>
          <div style={{color:"rgba(255,255,255,0.55)",fontSize:12}}>Embu Level 5 Hospital · Procurement ERP</div>
        </div>

        <form onSubmit={submit} noValidate autoComplete="on">
          {/* Email */}
          <div style={{position:"relative",marginBottom:12}}>
            <svg style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",opacity:.5}} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg>
            <input ref={ref} type="email" autoComplete="username" placeholder="Email address"
              value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}
              style={inp}
              onFocus={e=>{e.target.style.borderColor="rgba(255,255,255,0.5)";e.target.style.background="rgba(255,255,255,0.13)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.20)";e.target.style.background="rgba(255,255,255,0.09)";}}
            />
          </div>

          {/* Password */}
          <div style={{position:"relative",marginBottom:err?12:18}}>
            <svg style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",opacity:.5}} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            <input type={showPw?"text":"password"} autoComplete="current-password" placeholder="Password"
              value={pass} onChange={e=>setPass(e.target.value)} disabled={busy}
              style={{...inp,paddingRight:42}}
              onFocus={e=>{e.target.style.borderColor="rgba(255,255,255,0.5)";e.target.style.background="rgba(255,255,255,0.13)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.20)";e.target.style.background="rgba(255,255,255,0.09)";}}
            />
            <button type="button" tabIndex={-1} onClick={()=>setShowPw(p=>!p)}
              style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.45)",padding:4,fontSize:13,lineHeight:1}}>
              {showPw?"🙈":"👁"}
            </button>
          </div>

          {/* Error */}
          {err && (
            <div style={{background:"rgba(220,38,38,0.18)",border:"1px solid rgba(220,38,38,0.35)",borderRadius:8,padding:"9px 13px",marginBottom:14,color:"#fca5a5",fontSize:13,lineHeight:1.5}}>
              {err}
            </div>
          )}

          {/* Sign In button */}
          <button type="submit" disabled={busy} style={{
            width:"100%", padding:"13px",
            background: busy ? "rgba(255,255,255,0.15)" : "#fff",
            color: busy ? "rgba(255,255,255,0.5)" : "#0d47a1",
            border:"none", borderRadius:10,
            fontSize:15, fontWeight:800, letterSpacing:".01em",
            cursor: busy ? "not-allowed" : "pointer",
            transition:"all .15s",
            boxShadow: busy ? "none" : "0 4px 18px rgba(0,0,0,0.18)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
            {busy
              ? <><span style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"ls .7s linear infinite",display:"inline-block"}}/> Signing in...</>
              : "Sign In"
            }
          </button>
        </form>

        <div style={{textAlign:"center",marginTop:20,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.09)",color:"rgba(255,255,255,0.32)",fontSize:11,lineHeight:1.8}}>
          <div style={{fontWeight:600,color:"rgba(255,255,255,0.45)"}}>ProcurBosse v22.6 · EL5 MediProcure</div>
          <div>Embu County Government · Kenya</div>
        </div>
      </div>

      <style>{`
        @keyframes ls{to{transform:rotate(360deg)}}
        input::placeholder{color:rgba(255,255,255,0.35)}
        input:-webkit-autofill,input:-webkit-autofill:focus{
          -webkit-box-shadow:0 0 0 100px rgba(10,50,130,.9) inset!important;
          -webkit-text-fill-color:#fff!important;
          caret-color:#fff;
        }
      `}</style>
    </div>
  );
}
