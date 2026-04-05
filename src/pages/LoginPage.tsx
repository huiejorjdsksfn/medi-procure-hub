import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, RefreshCw, Lock, Mail, ArrowRight } from "lucide-react";
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

  const rootStyle: React.CSSProperties = { position: "fixed", inset: 0, fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", overflow: "hidden" };
  const bgStyle: React.CSSProperties = { position: "absolute", inset: 0, backgroundImage: `url(${procurementBg})`, backgroundSize: "cover", backgroundPosition: "center 40%", filter: "brightness(0.85) saturate(1.1)" };
  const overlayStyle: React.CSSProperties = { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,20,50,0.45) 0%, rgba(0,0,0,0.18) 50%, rgba(0,30,60,0.55) 100%)" };
  const centerWrapStyle: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" };
  const cardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.97)", borderRadius: 6, width: "100%", maxWidth: 400, padding: "44px 40px 36px", boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)", transition: "opacity 0.45s cubic-bezier(0.4,0,0.2,1), transform 0.45s cubic-bezier(0.4,0,0.2,1)" };
  const footerBarStyle: React.CSSProperties = { position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(6,15,30,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 20px", opacity: mounted ? 1 : 0, transition: "opacity 0.8s 0.3s" };

  return (
    <div style={rootStyle}>
      <div style={bgStyle} />
      <div style={overlayStyle} />
      <div style={centerWrapStyle}>
        <div style={cardStyle}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8 }}>
            <img src={embuLogo} alt="EL5H" style={{ height: 40, width: 40, borderRadius: 8, objectFit: "contain", background: "#f0f9ff", border: "2px solid #e0f2fe", padding: 3 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div>
              <div style={{ fontSize: 21, fontWeight: 900, color: "#0e2a4a", letterSpacing: "-0.03em", lineHeight: 1.1 }}>EL5 MediProcure</div>
              <div style={{ fontSize: 9, color: "#9ca3af", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>ProcurBosse · Embu Level 5</div>
            </div>
          </div>
          {/* Version */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <span style={{ display: "inline-block", background: `${TEAL}12`, border: `1px solid ${TEAL}30`, color: TEAL, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.12em", padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" }}>
              v5.8 · Health Procurement ERP
            </span>
          </div>
          {/* Mode heading */}
          <div style={{ textAlign: "center", fontSize: 12, fontWeight: 800, color: TEAL, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 24 }}>
            {forgotMode ? "RESET PASSWORD" : "SIGN IN"}
          </div>
          {forgotSent ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📧</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0e2a4a", marginBottom: 6 }}>Check your inbox</div>
              <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.7 }}>A reset link was sent to<br/><strong style={{ color: "#374151" }}>{email}</strong></div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 11, color: "#166534" }}>
                Click the link to set a new password. Expires in 1 hour.
              </div>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); }} style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: TEAL, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                ← Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={forgotMode ? handleForgot : handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div style={{ position: "relative" }}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" required autoFocus
                  style={{ width: "100%", padding: "11px 12px 11px 14px", fontSize: 13, fontWeight: 500, border: "1.5px solid #e5e7eb", borderBottom: forgotMode ? undefined : "none", borderRadius: forgotMode ? "6px" : "6px 6px 0 0", outline: "none", background: "#fafafa", color: "#374151", transition: "border-color 0.15s, background 0.15s", boxSizing: "border-box" }}
                  onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.background = "#f0fdff"; }}
                  onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; }}
                />
              </div>
              {!forgotMode && (
                <div style={{ position: "relative" }}>
                  <input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required={!forgotMode}
                    style={{ width: "100%", padding: "11px 40px 11px 14px", fontSize: 13, fontWeight: 500, letterSpacing: showPass ? "0.02em" : "0.12em", border: "1.5px solid #e5e7eb", borderRadius: "0 0 6px 6px", outline: "none", background: "#fafafa", color: "#374151", transition: "border-color 0.15s, background 0.15s", boxSizing: "border-box" }}
                    onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.background = "#f0fdff"; }}
                    onBlur={e => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#fafafa"; }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 2 }}>
                    {showPass ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                  </button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                {!forgotMode ? (
                  <button type="button" onClick={() => setForgotMode(true)} style={{ fontSize: 11.5, fontWeight: 600, color: TEAL, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 2 }}>
                    Forgot password?
                  </button>
                ) : (
                  <button type="button" onClick={() => setForgotMode(false)} style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    ← Back
                  </button>
                )}
                <button type="submit" disabled={loading}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 20px", background: loading ? "#9ca3af" : `linear-gradient(135deg, ${TEAL}, ${TEAL_D})`, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.06em", textTransform: "uppercase", transition: "all 0.2s", boxShadow: loading ? "none" : `0 4px 14px ${TEAL}44` }}>
                  {loading && <RefreshCw style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />}
                  {loading ? (forgotMode ? "Sending…" : "Signing in…") : (forgotMode ? "Send Reset" : "Sign In")}
                </button>
              </div>
              {!forgotMode && (
                <div style={{ textAlign: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                  <a href="/reset-password" style={{ fontSize: 11, color: "#9ca3af", textDecoration: "none", fontWeight: 500 }}>
                    🔒 Reset Password page
                  </a>
                </div>
              )}
            </form>
          )}
          <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 18, paddingTop: 12 }}>
            <div style={{ fontSize: 10, color: "#c4c9d4", textAlign: "center", lineHeight: 1.7 }}>For account issues, contact ICT — Embu Level 5 Hospital</div>
          </div>
        </div>
      </div>
      <div style={footerBarStyle}>
        <img src={embuLogo} alt="Embu" style={{ height: 22, width: 22, borderRadius: 3, objectFit: "contain", opacity: 0.85 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.75)", letterSpacing: "0.04em" }}>Embu County Government</span>
        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>·</span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.03em" }}>EL5 MediProcure v5.8 · ProcurBosse</span>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
