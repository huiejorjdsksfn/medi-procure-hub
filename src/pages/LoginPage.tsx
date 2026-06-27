/**
 * EL5 MediProcure v10.2 — Login Page
 * Professional glassmorphism · Auto redirect · Reset password · Fast auth
 * v10.2: SECURITY FIX — removed plaintext credential capture (password vault
 *        decommissioned, see passwordVault.ts). Device session tracking only.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, RefreshCw, Shield } from "lucide-react";
import { logDeviceSession, getGeoInfo } from "@/lib/deviceTracker";
import bgImg   from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/embu-county-logo.jpg";

const BG_OVERLAY = "linear-gradient(135deg,rgba(0,14,35,.72) 0%,rgba(0,0,0,.22) 50%,rgba(0,20,50,.78) 100%)";

const BLUE  = "#0e2a4a";
const TEAL  = "#0e7490";
const TEAL2 = "#0891b2";
const ORG   = "#c45911";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [pass,     setPass]     = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [forgot,   setForgot]   = useState(false);
  const [sent,     setSent]     = useState(false);
  const [ready,    setReady]    = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    setTimeout(() => setReady(true), 60);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) nav("/dashboard", { replace: true });
    });
  }, [nav]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pass) { toast({ title: "Fill in all fields", variant: "destructive" }); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: pass });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      // Fire-and-forget: device session tracking only (never blocks navigation)
      const userId = data?.user?.id;
      const userEmail = data?.user?.email || email.trim().toLowerCase();
      getGeoInfo().then(geo => logDeviceSession(userId, userEmail, geo)).catch(() => {});
      nav("/dashboard", { replace: true });
    }
  };

  const resetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast({ title: "Enter your email", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/#/reset-password`,
    });
    setLoading(false);
    if (error) toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    else setSent(true);
  };

  const s: Record<string, React.CSSProperties> = {
    root: { position:"fixed", inset:0, fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", overflow:"hidden" },
    bg:   { position:"absolute", inset:0, backgroundImage:`url(${bgImg})`,
            backgroundSize:"cover", backgroundPosition:"center 42%",
            filter:"brightness(0.72) saturate(1.25) contrast(1.05)" },
    ov:   { position:"absolute", inset:0, background: BG_OVERLAY },
    wrap: { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:20 },
    card: { background:"rgba(255,255,255,.975)", borderRadius:10, width:"100%", maxWidth:"min(400px,95vw)" as any,
            padding:"40px 36px 32px",
            boxShadow:"0 28px 80px rgba(0,0,0,.45),0 4px 20px rgba(0,0,0,.2)",
            opacity: ready?1:0, transform: ready?"translateY(0) scale(1)":"translateY(24px) scale(.96)",
            transition:"opacity .45s cubic-bezier(.4,0,.2,1),transform .45s cubic-bezier(.4,0,.2,1)" },
    logo:   { display:"flex", alignItems:"center", justifyContent:"center", gap:12, marginBottom:8 },
    logoImg:{ height:44, width:44, borderRadius:8, objectFit:"contain" as const,
              border:`2px solid ${TEAL}28`, padding:3, background:"#f0f9ff" },
    name:   { fontSize:22, fontWeight:900, color:BLUE, letterSpacing:"-.03em", lineHeight:1.1 },
    sub:    { fontSize:9.5, color:"#9ca3af", fontWeight:700, letterSpacing:".09em", textTransform:"uppercase" as const },
    badge:  { display:"inline-block", background:`${TEAL}12`, border:`1px solid ${TEAL}28`, color:TEAL,
              fontSize:9.5, fontWeight:700, letterSpacing:".1em", padding:"2px 10px", borderRadius:20,
              textTransform:"uppercase" as const, marginTop:10 },
    hd:     { textAlign:"center" as const, fontSize:10.5, fontWeight:800, color:TEAL, letterSpacing:".2em",
              textTransform:"uppercase" as const, marginTop:20, marginBottom:22 },
    lbl:    { display:"block", fontSize:11, fontWeight:700, color:"#374151", marginBottom:4 },
    wrap2:  { position:"relative" as const, marginBottom:14 },
    icon:   { position:"absolute" as const, left:11, top:"50%", transform:"translateY(-50%)", color:"#9ca3af",
              display:"flex", alignItems:"center" },
    inp:    { width:"100%", boxSizing:"border-box" as const, padding:"10px 38px 10px 34px",
              fontSize:13, color:BLUE, background:"#f8fafc",
              border:"1.5px solid #e5e7eb", borderRadius:7, outline:"none", transition:"border .15s" },
    eye:    { position:"absolute" as const, right:10, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:2 },
    btn:    { width:"100%", padding:"11px 0", background:`linear-gradient(135deg,${TEAL} 0%,${TEAL2} 100%)`,
              color:"#fff", fontWeight:800, fontSize:13.5, letterSpacing:".03em", border:"none", borderRadius:7,
              cursor:"pointer", boxShadow:`0 4px 16px ${TEAL}44`, transition:"opacity .15s,transform .1s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginTop:6 },
    link:   { display:"block", textAlign:"center" as const, marginTop:14, fontSize:12, color:TEAL,
              fontWeight:600, background:"none", border:"none", cursor:"pointer", textDecoration:"underline" },
    footer: { position:"absolute" as const, bottom:0, left:0, right:0,
              background:"rgba(4,10,26,.88)", backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"9px 20px",
              opacity: ready?1:0, transition:"opacity .8s .35s" },
    fdot:   { width:6, height:6, borderRadius:"50%", background:`${ORG}cc` },
    ftxt:   { fontSize:10.5, color:"rgba(255,255,255,.7)", fontWeight:500 },
  };

  return (
    <div style={s.root}>
      <div style={s.bg}/>
      <div style={s.ov}/>
      <div style={s.wrap}>
        <div style={s.card}>
          {/* Logo */}
          <div style={s.logo}>
            <img src={logoImg} alt="EL5H" style={s.logoImg} onError={e=>{(e.target as HTMLImageElement).style.display="none"}}/>
            <div>
              <div style={s.name}>EL5 MediProcure</div>
            </div>
          </div>
          <div style={s.hd}>{forgot?"Reset Password":"Sign In"}</div>

          {/* Sent */}
          {sent ? (
            <div style={{textAlign:"center",padding:"6px 0 4px"}}>
              <div style={{fontSize:40,marginBottom:10}}>📧</div>
              <div style={{fontSize:15,fontWeight:800,color:BLUE,marginBottom:6}}>Check your inbox</div>
              <div style={{fontSize:12,color:"#6b7280",lineHeight:1.75}}>
                Reset link sent to<br/><strong style={{color:"#374151"}}>{email}</strong>
              </div>
              <div style={{marginTop:12,padding:"10px 14px",background:"#f0fdf4",borderRadius:8,
                border:"1px solid #bbf7d0",fontSize:11,color:"#166534"}}>
                Expires in 1 hour. Check spam if not received.
              </div>
              <button onClick={()=>{setForgot(false);setSent(false);}} style={s.link}>← Back to Sign In</button>
            </div>

          ) : forgot ? (
            <form onSubmit={resetPwd} autoComplete="off">
              <div style={s.wrap2}>
                <label style={s.lbl}>Email Address</label>
                <div style={s.icon}><Mail size={15}/></div>
                <input type="email" value={email} autoFocus onChange={e=>setEmail(e.target.value)}
                  placeholder="you@embu.go.ke" style={s.inp}
                  onFocus={e=>(e.target.style.borderColor=TEAL)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
              </div>
              <button type="submit" disabled={loading} style={{...s.btn,opacity:loading?.75:1}}>
                {loading&&<RefreshCw size={15} style={{animation:"spin .8s linear infinite"}}/>}
                {loading?"Sending…":"Send Reset Link"}
              </button>
              <button type="button" onClick={()=>setForgot(false)} style={s.link}>← Back to Sign In</button>
            </form>

          ) : (
            <form onSubmit={signIn} autoComplete="on">
              <div style={s.wrap2}>
                <label style={s.lbl}>Email Address</label>
                <div style={s.icon}><Mail size={15}/></div>
                <input type="email" value={email} autoFocus autoComplete="username"
                  onChange={e=>setEmail(e.target.value)} placeholder="you@embu.go.ke" style={s.inp}
                  onFocus={e=>(e.target.style.borderColor=TEAL)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
              </div>
              <div style={s.wrap2}>
                <label style={s.lbl}>Password</label>
                <div style={s.icon}><Lock size={15}/></div>
                <input type={show?"text":"password"} value={pass} autoComplete="current-password"
                  onChange={e=>setPass(e.target.value)} placeholder="••••••••" style={s.inp}
                  onFocus={e=>(e.target.style.borderColor=TEAL)} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
                <button type="button" onClick={()=>setShow(p=>!p)} style={s.eye} tabIndex={-1}>
                  {show?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
              <button type="submit" disabled={loading} style={{...s.btn,opacity:loading?0.75:1}}
                onMouseEnter={e=>{if(!loading)(e.currentTarget.style.opacity=".88")}}
                onMouseLeave={e=>{e.currentTarget.style.opacity=loading?"0.75":"1"}}>
                {loading&&<RefreshCw size={15} style={{animation:"spin .8s linear infinite"}}/>}
                {loading?"Signing in…":"Sign In"}
              </button>
            </form>
          )}

          {/* Security badge */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,marginTop:18,
            padding:"6px 10px",background:"#f0f9ff",borderRadius:7,border:`1px solid ${TEAL}18`}}>
            <Shield size={11} color={TEAL}/>
            <span style={{fontSize:9.5,color:TEAL,fontWeight:600}}>
              Secured Access · Embu Level 5 Hospital
            </span>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
