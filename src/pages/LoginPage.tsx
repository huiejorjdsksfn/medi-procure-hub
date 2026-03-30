import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, RefreshCw } from "lucide-react";
import procurementBg from "@/assets/procurement-bg.jpg";
import embuLogo from "@/assets/embu-county-logo.jpg";

export default function LoginPage() {
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [showPass,   setShowPass]   = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Enter your email address first", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + "/reset-password",
    });
    setLoading(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      setForgotSent(true);
    }
  };

  const TEAL   = "#0e7490";
  const TEAL_D = "#0c6380";

  /* ---- Styles (extracted to avoid JSX depth issues) ---- */
  const rootStyle: React.CSSProperties = {
    position: "fixed" as const, inset: 0,
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    overflow: "hidden" as const,
  };
  const bgStyle: React.CSSProperties = {
    position: "absolute" as const, inset: 0,
    backgroundImage: `url(${procurementBg})`,
    backgroundSize: "cover",
    backgroundPosition: "center 40%",
    filter: "brightness(0.88) saturate(1.1)",
  };
  const overlayStyle: React.CSSProperties = {
    position: "absolute" as const, inset: 0,
    background: "linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.18) 60%, rgba(0,0,0,0.55) 100%)",
  };
  const centerWrapStyle: React.CSSProperties = {
    position: "absolute" as const, inset: 0,
    display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
    padding: "20px",
  };
  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.97)",
    borderRadius: 4,
    width: "100%", maxWidth: 380,
    padding: "40px 36px 32px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.12)",
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0) scale(1)" : "translateY(12px) scale(0.98)",
    transition: "opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)",
  };
  const footerBarStyle: React.CSSProperties = {
    position: "absolute" as const, bottom: 0, left: 0, right: 0,
    background: "rgba(10,20,40,0.82)",
    backdropFilter: "blur(6px)",
    display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
    gap: 10, padding: "10px 20px",
    opacity: mounted ? 1 : 0,
    transition: "opacity 0.8s 0.3s",
  };

  return (
    <div style={rootStyle}>

      {/* Background photo */}
      <div style={bgStyle} />

      {/* Gradient overlay */}
      <div style={overlayStyle} />

      {/* Centered login card */}
      <div style={centerWrapStyle}>
        <div style={cardStyle}>

          {/* Logo */}
          <div style={{ display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 10, marginBottom: 6 }}>
            <img
              src={embuLogo}
              alt="EL5H"
              style={{ height: 36, width: 36, borderRadius: 6, objectFit: "contain" as const, background: "#f0f9ff", border: "1.5px solid #e0f2fe", padding: 3 }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#0e2a4a", letterSpacing: "-0.03em", lineHeight: 1 }}>
                EL5 MediProcure
              </div>
              <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                Embu Level 5 Hospital
              </div>
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: "center" as const, fontSize: 13, fontWeight: 700, color: TEAL, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 26, marginTop: 12 }}>
            {forgotMode ? "RESET PASSWORD" : "SIGN IN"}
          </div>

          {/* Form area */}
          {forgotSent ? (
            <div style={{ textAlign: "center" as const, padding: "16px 0" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>&#x2709;</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#0e2a4a", marginBottom: 6 }}>Check your email</div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                A password reset link has been sent to<br/>
                <strong style={{ color: "#374151" }}>{email}</strong>
              </div>
              <button
                onClick={() => { setForgotMode(false); setForgotSent(false); }}
                style={{ marginTop: 18, fontSize: 12, fontWeight: 700, color: TEAL, background: "none", border: "none", cursor: "pointer" as const, textDecoration: "underline" as const }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={forgotMode ? handleForgot : handleSubmit} style={{ display: "flex" as const, flexDirection: "column" as const, gap: 0 }}>

              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="USERNAME"
                required
                autoFocus
                style={{ width: "100%", padding: "10px 12px", fontSize: 12, fontWeight: 500, letterSpacing: "0.04em", border: "1px solid #d1d5db", borderBottom: "none", borderRadius: "3px 3px 0 0", outline: "none", background: "#fff", color: "#374151", transition: "border-color 0.15s", boxSizing: "border-box" as const }}
                onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.borderBottomColor = "#d1d5db"; e.target.style.background = "#f0fdff"; }}
                onBlur={e => { e.target.style.borderColor = "#d1d5db"; e.target.style.background = "#fff"; }}
              />

              {!forgotMode && (
                <div style={{ position: "relative" as const }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="PASSWORD"
                    required={!forgotMode}
                    style={{ width: "100%", padding: "10px 36px 10px 12px", fontSize: 12, fontWeight: 500, letterSpacing: showPass ? "0.04em" : "0.16em", border: "1px solid #d1d5db", borderRadius: "0 0 3px 3px", outline: "none", background: "#fff", color: "#374151", transition: "border-color 0.15s, background 0.15s", boxSizing: "border-box" as const }}
                    onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.background = "#f0fdff"; }}
                    onBlur={e => { e.target.style.borderColor = "#d1d5db"; e.target.style.background = "#fff"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ position: "absolute" as const, right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer" as const, color: "#9ca3af", lineHeight: 0, padding: 2 }}
                  >
                    {showPass ? <EyeOff style={{ width: 13, height: 13 }} /> : <Eye style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              )}

              <div style={{ display: "flex" as const, alignItems: "center" as const, justifyContent: "space-between" as const, marginTop: 12 }}>
                {!forgotMode ? (
                  <button type="button" onClick={() => setForgotMode(true)} style={{ fontSize: 11, fontWeight: 600, color: TEAL, background: "none", border: "none", cursor: "pointer" as const, padding: 0, letterSpacing: "0.01em" }}>
                    Forgot password
                  </button>
                ) : (
                  <button type="button" onClick={() => setForgotMode(false)} style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" as const, padding: 0 }}>
                    &larr; Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ fontSize: 12, fontWeight: 800, color: loading ? "#9ca3af" : TEAL, background: "none", border: "none", cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.12em", textTransform: "uppercase" as const, padding: 0, display: "flex" as const, alignItems: "center" as const, gap: 6, transition: "color 0.15s" }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.color = TEAL_D; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = loading ? "#9ca3af" : TEAL; }}
                >
                  {loading && <RefreshCw style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />}
                  {loading ? (forgotMode ? "Sending..." : "Signing in...") : (forgotMode ? "SEND RESET" : "SUBMIT")}
                </button>
              </div>

            </form>
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 24, paddingTop: 14 }}>
            <div style={{ fontSize: 10, color: "#c4c9d4", textAlign: "center" as const, lineHeight: 1.6 }}>
              For account creation or access issues,<br/>
              contact ICT - Embu Level 5 Hospital
            </div>
          </div>

        </div>
      </div>

      {/* Footer bar */}
      <div style={footerBarStyle}>
        <img
          src={embuLogo}
          alt="Embu"
          style={{ height: 22, width: 22, borderRadius: 3, objectFit: "contain" as const, opacity: 0.85 }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>
          Embu County Government
        </span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>.</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.03em" }}>
          Health Procurement Division - v2.1
        </span>
      </div>

    </div>
  );
}
