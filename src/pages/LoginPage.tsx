/**
 * ProcurBosse — LoginPage v11.0 NUCLEAR ACTIVATED
 * Blue gradient · Embu branding · Always renders · No password reset
 * FIXED: auto-redirect after login → /dashboard
 * FIXED: no NetworkGuard blocking · no IP restriction
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import embuLogo from "@/assets/embu-county-logo.jpg";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [err,      setErr]      = useState("");
  const [mounted,  setMounted]  = useState(false);
  const nav = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  // Entrance animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    emailRef.current?.focus();
    return () => cancelAnimationFrame(id);
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data }) => {
      if (live && data.session) nav("/dashboard", { replace: true });
    }).catch(() => {});
    return () => { live = false; };
  }, [nav]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErr("");

    if (!email.trim()) { setErr("Please enter your email address."); return; }
    if (!password)     { setErr("Please enter your password."); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (data.session) {
        nav("/dashboard", { replace: true });
      }
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.toLowerCase().includes("invalid login") || msg.toLowerCase().includes("credentials")) {
        setErr("Incorrect email or password. Please try again.");
      } else if (msg.toLowerCase().includes("email not confirmed")) {
        setErr("Email not confirmed. Contact your administrator.");
      } else if (msg.toLowerCase().includes("too many")) {
        setErr("Too many attempts. Please wait a few minutes.");
      } else {
        setErr(msg || "Sign in failed. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const,
    padding: "13px 14px 13px 42px",
    background: "rgba(255,255,255,0.10)",
    border: "1.5px solid rgba(255,255,255,0.22)",
    borderRadius: 10, color: "#fff", fontSize: 14,
    outline: "none", fontFamily: "inherit",
    transition: "border-color .15s, background .15s",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
      background: "linear-gradient(135deg,#1565c0 0%,#0d47a1 35%,#1a237e 65%,#0a1172 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Decorative blobs */}
      {[
        {w:400,h:400,top:-120,left:-120},
        {w:300,h:300,bottom:-80,right:-80},
        {w:200,h:200,top:"35%",right:"5%"},
        {w:140,h:140,bottom:"12%",left:"7%"},
      ].map((b,i)=>(
        <div key={i} style={{
          position:"absolute",width:b.w,height:b.h,borderRadius:"50%",
          background:"rgba(255,255,255,0.04)",
          top:(b as any).top,left:(b as any).left,
          bottom:(b as any).bottom,right:(b as any).right,
          pointerEvents:"none",
        }}/>
      ))}

      {/* Card */}
      <div style={{
        background:"rgba(255,255,255,0.10)",
        backdropFilter:"blur(24px)",
        WebkitBackdropFilter:"blur(24px)",
        border:"1.5px solid rgba(255,255,255,0.18)",
        borderRadius:20,width:"100%",maxWidth:420,
        padding:"44px 40px 36px",margin:"16px",
        boxShadow:"0 32px 80px rgba(0,0,0,0.40),0 4px 20px rgba(0,0,0,0.15)",
        transform:mounted?"translateY(0)":"translateY(28px)",
        opacity:mounted?1:0,
        transition:"transform 0.5s cubic-bezier(.22,.68,0,1.2),opacity 0.4s ease",
        position:"relative",zIndex:1,
      }}>

        {/* Branding */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{
            width:76,height:76,borderRadius:18,
            background:"rgba(255,255,255,0.95)",
            display:"flex",alignItems:"center",justifyContent:"center",
            margin:"0 auto 16px",
            boxShadow:"0 4px 20px rgba(0,0,0,0.25)",
          }}>
            <img
              src={embuLogo} alt="Embu County"
              style={{width:58,height:58,objectFit:"contain",borderRadius:12}}
              onError={e=>{
                const el = e.target as HTMLImageElement;
                el.style.display="none";
                el.parentElement!.innerHTML = '<div style="font-size:28px;font-weight:900;color:#0d47a1">EL5</div>';
              }}
            />
          </div>
          <div style={{color:"#fff",fontSize:22,fontWeight:800,letterSpacing:".01em",marginBottom:4}}>
            EL5 MediProcure
          </div>
          <div style={{color:"rgba(255,255,255,0.60)",fontSize:12,fontWeight:500}}>
            Embu Level 5 Hospital · Procurement ERP
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="on" noValidate>

          {/* Email */}
          <div style={{position:"relative",marginBottom:14}}>
            <span style={{
              position:"absolute",left:14,top:"50%",
              transform:"translateY(-50%)",
              color:"rgba(255,255,255,0.50)",
              pointerEvents:"none",fontSize:15,lineHeight:1,
            }}>✉</span>
            <input
              ref={emailRef}
              type="email"
              autoComplete="username"
              placeholder="Email address"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              disabled={loading}
              style={inp}
              onFocus={e=>{e.target.style.borderColor="rgba(255,255,255,0.55)";e.target.style.background="rgba(255,255,255,0.15)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.22)";e.target.style.background="rgba(255,255,255,0.10)";}}
            />
          </div>

          {/* Password */}
          <div style={{position:"relative",marginBottom:err?14:20}}>
            <span style={{
              position:"absolute",left:14,top:"50%",
              transform:"translateY(-50%)",
              color:"rgba(255,255,255,0.50)",
              pointerEvents:"none",fontSize:14,lineHeight:1,
            }}>🔒</span>
            <input
              type={showPass?"text":"password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={e=>setPassword(e.target.value)}
              disabled={loading}
              style={{...inp,paddingRight:46}}
              onFocus={e=>{e.target.style.borderColor="rgba(255,255,255,0.55)";e.target.style.background="rgba(255,255,255,0.15)";}}
              onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.22)";e.target.style.background="rgba(255,255,255,0.10)";}}
            />
            <button
              type="button"
              onClick={()=>setShowPass(p=>!p)}
              style={{
                position:"absolute",right:12,top:"50%",
                transform:"translateY(-50%)",
                background:"none",border:"none",
                cursor:"pointer",padding:"4px",
                color:"rgba(255,255,255,0.50)",
                fontSize:13,lineHeight:1,
              }}
              tabIndex={-1}
            >{showPass?"🙈":"👁"}</button>
          </div>

          {/* Error */}
          {err&&(
            <div style={{
              background:"rgba(220,38,38,0.20)",
              border:"1px solid rgba(220,38,38,0.40)",
              borderRadius:8,padding:"10px 14px",
              marginBottom:16,color:"#fca5a5",
              fontSize:13,lineHeight:1.5,
            }}>{err}</div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width:"100%",padding:"14px",
              background:loading?"rgba(255,255,255,0.18)":"#fff",
              color:loading?"rgba(255,255,255,0.55)":"#0d47a1",
              border:"none",borderRadius:10,
              fontSize:15,fontWeight:800,
              cursor:loading?"not-allowed":"pointer",
              transition:"all .15s",
              boxShadow:loading?"none":"0 4px 20px rgba(0,0,0,0.20)",
              letterSpacing:".01em",
              display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            }}
          >
            {loading
              ? <>
                  <span style={{
                    width:16,height:16,
                    border:"2px solid rgba(255,255,255,0.35)",
                    borderTopColor:"#fff",borderRadius:"50%",
                    animation:"pb-spin .7s linear infinite",
                    display:"inline-block",flexShrink:0,
                  }}/>
                  Signing in...
                </>
              : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign:"center",marginTop:24,
          color:"rgba(255,255,255,0.35)",fontSize:11,
          borderTop:"1px solid rgba(255,255,255,0.10)",paddingTop:16,
          lineHeight:1.8,
        }}>
          <div style={{fontWeight:600,color:"rgba(255,255,255,0.50)",marginBottom:2}}>
            ProcurBosse v22.4 · EL5 MediProcure
          </div>
          <div>Embu County Government · Kenya</div>
        </div>
      </div>

      <style>{`
        @keyframes pb-spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(255,255,255,0.38); }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 100px rgba(13,71,161,0.88) inset !important;
          -webkit-text-fill-color: #fff !important;
          caret-color: #fff;
        }
      `}</style>
    </div>
  );
}
