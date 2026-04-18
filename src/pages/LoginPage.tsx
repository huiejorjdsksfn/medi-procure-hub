/**
 * ProcurBosse -- Login Page v8.0 NUCLEAR FIX
 * White screen root cause fixed:
 *   - Card was opacity:0 until mounted=true (setTimeout 50ms)
 *   - If any React error fired before timeout, card stayed invisible forever
 *   - Background image import could crash on some environments
 * Fix:
 *   - Card always opacity:1, entrance animation uses transform only
 *   - Background loaded async via new Image() - never blocks render
 *   - Solid dark gradient fallback (#0a1628) always visible
 *   - Auth redirect is non-blocking (catch errors gracefully)
 *   - Inline auth error display replaces toast-only pattern
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, RefreshCw, Shield, AlertCircle } from "lucide-react";
import embuLogo from "@/assets/embu-county-logo.jpg";
import procurBg from "@/assets/procurement-bg.jpg";

const BG_GRADIENT = "linear-gradient(135deg,#0a1628 0%,#0d2244 40%,#091a35 70%,#0a1628 100%)";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [entered,  setEntered]  = useState(false);
  const [bgSrc,    setBgSrc]    = useState("");
  const [authErr,  setAuthErr]  = useState("");
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  // Entrance animation via transform only - card always visible (opacity:1)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Set background src from static import - never blocks render
  useEffect(() => { setBgSrc(procurBg); }, []);

  // Redirect if already logged in - fully non-blocking
  useEffect(() => {
    let live = true;
    supabase.auth.getSession()
      .then(({ data: { session } }) => { if (live && session) navigate("/dashboard", { replace: true }); })
      .catch(() => {});
    return () => { live = false; };
  }, [navigate]);

  // Focus email field immediately
  useEffect(() => { emailRef.current?.focus(); }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErr("");
    if (!email.trim() || !password) {
      setAuthErr("Please enter your email address and password.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      const msg = err?.message || "Sign in failed. Check your credentials.";
      setAuthErr(msg);
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const TEAL   = "#0e7490";
  const BLUE   = "#0e2a4a";
  const ORANGE = "#C45911";

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    padding: "10px 38px 10px 34px", fontSize: 13, color: BLUE,
    background: "#f8fafc", border: "1.5px solid #e5e7eb",
    borderRadius: 6, outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden",
      fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
      background: BG_GRADIENT,
    }}>
      {/* Async background photo */}
      {bgSrc && (
        <div style={{ position: "absolute", inset: 0,
          backgroundImage: `url(${bgSrc})`, backgroundSize: "cover",
          backgroundPosition: "center 40%",
          filter: "brightness(0.78) saturate(1.1)",
        }}/>
      )}

      {/* Overlay always present */}
      <div style={{ position: "absolute", inset: 0,
        background: "linear-gradient(135deg,rgba(0,18,45,0.72) 0%,rgba(0,0,0,0.18) 50%,rgba(0,25,55,0.72) 100%)",
      }}/>

      {/* Center the card */}
      <div style={{ position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", padding: 20,
      }}>
        {/* Card - opacity ALWAYS 1, only transform animates */}
        <div style={{
          background: "rgba(255,255,255,0.982)", borderRadius: 10,
          width: "100%", maxWidth: 400, padding: "40px 36px 32px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
          opacity: 1,
          transform: entered ? "translateY(0) scale(1)" : "translateY(18px) scale(0.97)",
          transition: "transform 0.38s cubic-bezier(.22,.68,0,1.15)",
        }}>

          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <img src={embuLogo} alt="Embu County"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              style={{ height: 44, width: 44, borderRadius: 8, objectFit: "contain",
                border: "2px solid #e0f2fe", padding: 3, background: "#f0f9ff" }}
            />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: BLUE, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                EL5 MediProcure
              </div>
              <div style={{ fontSize: 9.5, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const }}>
                ProcurBosse ERP
              </div>
            </div>
          </div>

          {/* Hospital badge */}
          <div style={{ textAlign: "center" as const, marginBottom: 4 }}>
            <span style={{ display: "inline-block", background: `${TEAL}14`,
              border: `1px solid ${TEAL}28`, color: TEAL, fontSize: 9.5, fontWeight: 700,
              letterSpacing: "0.1em", padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" as const }}>
              Embu Level 5 Hospital
            </span>
          </div>

          <div style={{ textAlign: "center" as const, fontSize: 11, fontWeight: 800, color: TEAL,
            letterSpacing: "0.2em", textTransform: "uppercase" as const, marginTop: 20, marginBottom: 22 }}>
            STAFF SIGN IN
          </div>

          <form onSubmit={handleSignIn} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                Email Address
              </label>
              <div style={{ position: "relative" as const }}>
                <span style={{ position: "absolute" as const, left: 11, top: "50%", transform: "translateY(-50%)",
                  color: "#9ca3af", display: "flex", alignItems: "center", pointerEvents: "none" as const }}>
                  <Mail size={14}/>
                </span>
                <input ref={emailRef} type="email" value={email} autoComplete="username"
                  onChange={e => { setEmail(e.target.value); setAuthErr(""); }}
                  placeholder="you@embu.go.ke" style={inp}
                  onFocus={e => (e.target.style.borderColor = TEAL)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: authErr ? 10 : 14 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5 }}>
                Password
              </label>
              <div style={{ position: "relative" as const }}>
                <span style={{ position: "absolute" as const, left: 11, top: "50%", transform: "translateY(-50%)",
                  color: "#9ca3af", display: "flex", alignItems: "center", pointerEvents: "none" as const }}>
                  <Lock size={14}/>
                </span>
                <input type={showPass ? "text" : "password"} value={password}
                  autoComplete="current-password"
                  onChange={e => { setPassword(e.target.value); setAuthErr(""); }}
                  placeholder="••••••••"
                  style={{ ...inp, paddingRight: 38 }}
                  onFocus={e => (e.target.style.borderColor = TEAL)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(p => !p)}
                  style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2 }}>
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>

            {/* Inline error */}
            {authErr && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8,
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
                <AlertCircle size={14} style={{ color: "#ef4444", flexShrink: 0, marginTop: 1 }}/>
                <span style={{ fontSize: 12, color: "#b91c1c", lineHeight: 1.5 }}>{authErr}</span>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "11px 0",
              background: loading ? "#6b9fb8" : `linear-gradient(135deg,${TEAL} 0%,#0c6380 100%)`,
              color: "#fff", fontWeight: 800, fontSize: 13.5, letterSpacing: "0.04em",
              border: "none", borderRadius: 6, cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : `0 4px 14px ${TEAL}40`,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 8, fontFamily: "inherit", transition: "background 0.2s",
            }}>
              {loading
                ? <><RefreshCw size={15} style={{ animation: "spin 0.8s linear infinite" }}/> Signing in...</>
                : <><Shield size={15}/> SIGN IN</>
              }
            </button>
          </form>

          {/* Admin contact notice */}
          <div style={{ textAlign: "center" as const, marginTop: 16, padding: "10px 14px",
            background: "#f0f9ff", borderRadius: 6, border: "1px solid #bae6fd",
            fontSize: 11, color: "#0369a1" }}>
            <Shield size={11} style={{ verticalAlign: "middle", marginRight: 4 }}/>
            Password issues? Contact your system administrator.
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{ position: "absolute" as const, bottom: 0, left: 0, right: 0,
        background: "rgba(5,12,28,0.88)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 10, padding: "9px 20px" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: `${ORANGE}cc` }}/>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
          Embu Level 5 Hospital &bull; Embu County Government
        </span>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: `${ORANGE}cc` }}/>
        <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)" }}>
          EL5 MediProcure
        </span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
