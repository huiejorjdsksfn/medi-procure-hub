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
import { Eye, EyeOff, Lock, User, RefreshCw, Shield } from "lucide-react";
import { logDeviceSession, getGeoInfo } from "@/lib/deviceTracker";
import bgImg   from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/embu-county-logo.jpg";

const BG_OVERLAY = "linear-gradient(135deg,rgba(0,14,35,.72) 0%,rgba(0,0,0,.22) 50%,rgba(0,20,50,.78) 100%)";

const BLUE  = "#0e2a4a";
const TEAL  = "#0e7490";
const TEAL2 = "#0891b2";
const ORG   = "#c45911";

/** Resolve a username to its account email via the get_email_by_username
 *  RPC (SECURITY DEFINER — safe to call unauthenticated). Returns null if
 *  no matching active user is found. */
async function resolveEmail(username: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_email_by_username", { p_username: username.trim() });
  if (error || !data) return null;
  return data as string;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [pass,     setPass]     = useState("");
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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
    if (!username.trim() || !pass) { toast({ title: "Fill in all fields", variant: "destructive" }); return; }
    setLoading(true);
    const email = await resolveEmail(username);
    if (!email) {
      setLoading(false);
      toast({ title: "Sign in failed", description: "No account found for that username", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
    } else {
      // Fire-and-forget: device session tracking only (never blocks navigation)
      const userId = data?.user?.id;
      const userEmail = data?.user?.email || email;
      getGeoInfo().then(geo => logDeviceSession(userId, userEmail, geo)).catch(() => {});
      nav("/dashboard", { replace: true });
    }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/#/dashboard` },
    });
    if (error) {
      setGoogleLoading(false);
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
    }
    // On success the browser redirects to Google, so no further local
    // state change is needed here — AuthContext's onAuthStateChange
    // picks up the session on return.
  };

  const resetPwd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) { toast({ title: "Enter your username", variant: "destructive" }); return; }
    setLoading(true);
    const email = await resolveEmail(username);
    if (!email) {
      setLoading(false);
      toast({ title: "Reset failed", description: "No account found for that username", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
                Reset link sent to the email on file for<br/><strong style={{color:"#374151"}}>{username}</strong>
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
                <label style={s.lbl}>Username</label>
                <div style={s.icon}><User size={15}/></div>
                <input type="text" value={username} autoFocus onChange={e=>setUsername(e.target.value)}
                  placeholder="j.mwangi" style={s.inp}
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
                <label style={s.lbl}>Username</label>
                <div style={s.icon}><User size={15}/></div>
                <input type="text" value={username} autoFocus autoComplete="username"
                  onChange={e=>setUsername(e.target.value)} placeholder="j.mwangi" style={s.inp}
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

              <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
                <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
                <span style={{fontSize:10.5,color:"#9ca3af",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:".05em"}}>or</span>
                <div style={{flex:1,height:1,background:"#e5e7eb"}}/>
              </div>

              <button type="button" onClick={signInWithGoogle} disabled={googleLoading}
                style={{width:"100%",padding:"10px 0",background:"#fff",color:"#374151",fontWeight:700,fontSize:13,
                  border:"1.5px solid #e5e7eb",borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",
                  justifyContent:"center",gap:9,opacity:googleLoading?0.6:1}}>
                {googleLoading ? (
                  <RefreshCw size={15} style={{animation:"spin .8s linear infinite"}}/>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.1 29.3 3 24 3 16 3 9 7.6 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 36.4 26.7 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9 40.4 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C40.9 36 44 30.6 44 24c0-1.4-.1-2.7-.4-3.5z"/></svg>
                )}
                {googleLoading ? "Redirecting…" : "Sign in with Google"}
              </button>
              <button type="button" onClick={()=>setForgot(true)} style={s.link}>Forgot password?</button>
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
