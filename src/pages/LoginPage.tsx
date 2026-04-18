/**
 * ProcurBosse — Login Page v9.0 NUCLEAR
 * Design: Blue gradient card (Image 1 style) with Embu data
 * - No password reset link
 * - No version text  
 * - Card always visible (opacity:1, transform-only animation)
 * - Dark blue gradient background always shows
 * - Background image loads async, never blocks
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
  const [entered,  setEntered]  = useState(false);
  const [err,      setErr]      = useState("");
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { const id = requestAnimationFrame(() => setEntered(true)); return () => cancelAnimationFrame(id); }, []);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    let live = true;
    supabase.auth.getSession().then(({ data: { session } }) => { if (live && session) nav("/dashboard", { replace: true }); }).catch(() => {});
    return () => { live = false; };
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!email.trim() || !password) { setErr("Enter your email and password."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      nav("/dashboard", { replace: true });
    } catch (e: any) { setErr(e?.message || "Sign in failed."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      background: "linear-gradient(135deg,#1565c0 0%,#0d47a1 35%,#1a237e 65%,#0a1172 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI',system-ui,sans-serif",
    }}>
      {/* Decorative blobs matching Image 1 */}
      <div style={{ position:"absolute", width:320, height:320, borderRadius:"50%", background:"rgba(255,255,255,0.06)", top:-80, left:-80, pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:240, height:240, borderRadius:"50%", background:"rgba(255,255,255,0.05)", bottom:-60, right:-60, pointerEvents:"none" }}/>
      <div style={{ position:"absolute", width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.04)", top:"40%", right:"8%", pointerEvents:"none" }}/>

      {/* Login Card */}
      <div style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 16, width: "100%", maxWidth: 420, padding: "40px 36px 32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)",
        transform: entered ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
        transition: "transform 0.4s cubic-bezier(.22,.68,0,1.15)",
        opacity: 1,
      }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom: 24 }}>
          <div style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:64, height:64, borderRadius:16, background:"rgba(255,255,255,0.15)", marginBottom:12, border:"1px solid rgba(255,255,255,0.2)" }}>
            <img src={embuLogo} alt="Embu" onError={e=>{(e.target as HTMLImageElement).style.display="none"}}
              style={{ width:48, height:48, borderRadius:10, objectFit:"contain" }} />
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.6)", fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>Your logo</div>
          <h1 style={{ fontSize:28, fontWeight:900, color:"#fff", margin:0, letterSpacing:"-0.02em" }}>Login</h1>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:4 }}>EL5 MediProcure · Embu Level 5 Hospital</div>
        </div>

        <form onSubmit={submit} noValidate>
          {/* Email */}
          <div style={{ marginBottom:14 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:0.5, pointerEvents:"none" }}>✉</span>
              <input ref={ref} type="email" value={email} autoComplete="username"
                onChange={e=>{setEmail(e.target.value);setErr("");}}
                placeholder="Email address"
                style={{ width:"100%", boxSizing:"border-box", padding:"12px 14px 12px 38px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, color:"#fff", fontSize:14, outline:"none", fontFamily:"inherit", backdropFilter:"blur(4px)" }}
                onFocus={e=>(e.target.style.background="rgba(255,255,255,0.18)")}
                onBlur={e=>(e.target.style.background="rgba(255,255,255,0.12)")}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: err?10:18 }}>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:0.5, pointerEvents:"none" }}>🔒</span>
              <input type={showPass?"text":"password"} value={password} autoComplete="current-password"
                onChange={e=>{setPassword(e.target.value);setErr("");}}
                placeholder="Password"
                style={{ width:"100%", boxSizing:"border-box", padding:"12px 40px 12px 38px", background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:10, color:"#fff", fontSize:14, outline:"none", fontFamily:"inherit" }}
                onFocus={e=>(e.target.style.background="rgba(255,255,255,0.18)")}
                onBlur={e=>(e.target.style.background="rgba(255,255,255,0.12)")}
              />
              <button type="button" tabIndex={-1} onClick={()=>setShowPass(p=>!p)}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.6)", fontSize:16, padding:2 }}>
                {showPass?"🙈":"👁"}
              </button>
            </div>
          </div>

          {/* Error */}
          {err && <div style={{ background:"rgba(220,38,38,0.2)", border:"1px solid rgba(220,38,38,0.4)", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#fca5a5" }}>{err}</div>}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            width:"100%", padding:"13px 0",
            background: loading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.95)",
            color: loading ? "rgba(255,255,255,0.7)" : "#1565c0",
            fontWeight:900, fontSize:15, border:"none", borderRadius:10,
            cursor: loading?"not-allowed":"pointer", fontFamily:"inherit",
            boxShadow: loading?"none":"0 4px 20px rgba(0,0,0,0.2)",
            transition:"all 0.2s", letterSpacing:"0.04em",
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign:"center", marginTop:20, fontSize:11, color:"rgba(255,255,255,0.4)" }}>
          Contact IT department for access issues
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"10px 20px", display:"flex", justifyContent:"center", gap:8 }}>
        {["🔵","🔵","🔵"].map((d,i)=>(
          <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:i===0?"rgba(255,255,255,0.7)":"rgba(255,255,255,0.25)" }}/>
        ))}
      </div>
      <style>{`input::placeholder{color:rgba(255,255,255,0.5)!important}`}</style>
    </div>
  );
}
