import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, RefreshCw } from "lucide-react";
import procurementBg from "@/assets/procurement-bg.jpg";
import embuLogo from "@/assets/embu-county-logo.jpg";

export default function LoginPage() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  // If already logged in, skip login
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
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
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // - Colours -
  const BLUE    = "#0e2a4a";
  const TEAL    = "#0e7490";
  const TEAL_LT = "#e0f2fe";
  const ORANGE  = "#C45911";

  // - Styles -
  const s: Record<string, React.CSSProperties> = {
    root: {
      position: "fixed", inset: 0,
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
      overflow: "hidden",
    },
    bg: {
      position: "absolute", inset: 0,
      backgroundImage: `url(${procurementBg})`,
      backgroundSize: "cover", backgroundPosition: "center 40%",
      filter: "brightness(0.82) saturate(1.15)",
    },
    overlay: {
      position: "absolute", inset: 0,
      background: "linear-gradient(135deg,rgba(0,18,45,0.55) 0%,rgba(0,0,0,0.15) 50%,rgba(0,25,55,0.60) 100%)",
    },
    center: {
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    },
    card: {
      background: "rgba(255,255,255,0.975)",
      borderRadius: 8,
      width: "100%", maxWidth: 390,
      padding: "40px 36px 32px",
      boxShadow: "0 24px 64px rgba(0,0,0,0.40), 0 4px 18px rgba(0,0,0,0.18)",
      opacity: mounted ? 1 : 0,
      transform: mounted ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
      transition: "opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)",
    },
    logo: { display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 6 },
    logoImg: { height: 42, width: 42, borderRadius: 8, objectFit: "contain" as const, border: `2px solid ${TEAL_LT}`, padding: 3, background: "#f0f9ff" },
    sysName: { fontSize: 22, fontWeight: 900, color: BLUE, letterSpacing: "-0.03em", lineHeight: 1.1 },
    subName: { fontSize: 9.5, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase" as const },
    badge: {
      display: "inline-block",
      background: `${TEAL}14`, border: `1px solid ${TEAL}28`, color: TEAL,
      fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
      padding: "2px 10px", borderRadius: 20, textTransform: "uppercase" as const,
    },
    heading: {
      textAlign: "center" as const, fontSize: 11, fontWeight: 800,
      color: TEAL, letterSpacing: "0.2em", textTransform: "uppercase" as const,
      marginTop: 20, marginBottom: 22,
    },
    label: { display: "block", fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 5 },
    inputWrap: { position: "relative" as const, marginBottom: 14 },
    inputIcon: {
      position: "absolute" as const, left: 11, top: "50%",
      transform: "translateY(-50%)", color: "#9ca3af",
      display: "flex", alignItems: "center",
    },
    input: {
      width: "100%", boxSizing: "border-box" as const,
      padding: "10px 38px 10px 34px",
      fontSize: 13, color: BLUE, background: "#f8fafc",
      border: "1.5px solid #e5e7eb", borderRadius: 6,
      outline: "none", transition: "border-color 0.15s",
    },
    eyeBtn: {
      position: "absolute" as const, right: 10, top: "50%",
      transform: "translateY(-50%)",
      background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 2,
    },
    btn: {
      width: "100%", padding: "11px 0",
      background: `linear-gradient(135deg, ${TEAL} 0%, #0c6380 100%)`,
      color: "#fff", fontWeight: 800, fontSize: 13.5, letterSpacing: "0.04em",
      border: "none", borderRadius: 6, cursor: "pointer",
      boxShadow: `0 4px 14px ${TEAL}40`,
      transition: "opacity 0.15s, transform 0.15s",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      marginTop: 6,
    },
    forgotLink: {
      display: "block", textAlign: "center" as const, marginTop: 14,
      fontSize: 12, color: TEAL, fontWeight: 600,
      background: "none", border: "none", cursor: "pointer",
      textDecoration: "underline",
    },
    footerBar: {
      position: "absolute" as const, bottom: 0, left: 0, right: 0,
      background: "rgba(5,12,28,0.88)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 10, padding: "9px 20px",
      opacity: mounted ? 1 : 0, transition: "opacity 0.8s 0.35s",
    },
    footerDot: { width: 6, height: 6, borderRadius: "50%", background: `${ORANGE}cc` },
    footerText: { fontSize: 10.5, color: "rgba(255,255,255,0.7)", fontWeight: 500 },
  };

  return (
    <div style={s.root}>
      <div style={s.bg} />
      <div style={s.overlay} />

      <div style={s.center}>
        <div style={s.card}>

          {/* - Logo - */}
          <div style={s.logo}>
            <img
              src={embuLogo} alt="EL5H"
              style={s.logoImg}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div>
              <div style={s.sysName}>EL5 MediProcure</div>
              <div style={s.subName}>ProcurBosse - Embu Level 5</div>
            </div>
          </div>

          {/* - Mode heading - */}
          <div style={s.heading}>SIGN IN</div>

          {(() => null)()}
          {(
            /* - Sign in form - */
            <form onSubmit={handleSignIn} autoComplete="on">
              {/* Email */}
              <div style={s.inputWrap}>
                <label style={s.label}>Email Address</label>
                <div style={s.inputIcon}><Mail size={15} /></div>
                <input
                  type="email" value={email} autoFocus
                  autoComplete="username"
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  style={s.input}
                  onFocus={e => (e.target.style.borderColor = TEAL)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
              </div>

              {/* Password */}
              <div style={s.inputWrap}>
                <label style={s.label}>Password</label>
                <div style={s.inputIcon}><Lock size={15} /></div>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  autoComplete="current-password"
                  onChange={e => setPassword(e.target.value)}
                  placeholder="-"
                  style={s.input}
                  onFocus={e => (e.target.style.borderColor = TEAL)}
                  onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
                />
                <button type="button" onClick={() => setShowPass(p => !p)} style={s.eyeBtn} tabIndex={-1}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              <button type="submit" disabled={loading}
                style={{ ...s.btn, opacity: loading ? 0.75 : 1 }}
                onMouseEnter={e => { if (!loading) (e.currentTarget.style.opacity = "0.9"); }}
                onMouseLeave={e => { (e.currentTarget.style.opacity = loading ? "0.75" : "1"); }}
              >
                {loading && <RefreshCw size={15} style={{ animation: "spin 0.8s linear infinite" }} />}
                {loading ? "Signing in-" : "Sign In"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* - Footer bar - */}
      <div style={s.footerBar}>
        <div style={s.footerDot} />
        <span style={s.footerText}>EL5 MediProcure · Health Procurement System</span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
