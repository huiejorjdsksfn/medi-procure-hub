/**
 * ProcurBosse -- Reset Password Page v1.0
 * Handles the ?type=recovery link from Supabase email
 * EL5 MediProcure -- Embu Level 5 Hospital
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff, CheckCircle, RefreshCw, ShieldCheck } from "lucide-react";
import logoImg from "@/assets/logo.png";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword]     = useState("");
  const [confirm,  setConfirm]      = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [loading,  setLoading]      = useState(false);
  const [done,     setDone]         = useState(false);
  const [mounted,  setMounted]      = useState(false);
  const [sessionOk, setSessionOk]  = useState(false);
  const [checking,  setChecking]   = useState(true);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);

    // Supabase fires SIGNED_IN with type=recovery after clicking the email link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionOk(true);
      }
      setChecking(false);
    });

    // Also check current session in case already authed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setSessionOk(true); setChecking(false); }
      else setTimeout(() => setChecking(false), 3000);
    });

    return () => subscription.unsubscribe();
  }, []);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8)  s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "#ef4444", "#f59e0b", "#3b82f6", "#22c55e"][strength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters required.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      setDone(true);
      toast({ title: "Password updated!", description: "Redirecting to login..." });
      setTimeout(() => navigate("/login"), 3000);
    }
  }

  // ── Background gradient (dark navy like rest of app) ─────────────────────
  const bg: React.CSSProperties = {
    position: "fixed", inset: 0,
    background: "linear-gradient(135deg, #0a1628 0%, #0a2558 50%, #0d3a6b 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: 20,
  };

  if (checking) return (
    <div style={bg}>
      <div style={{ textAlign: "center", color: "#fff" }}>
        <RefreshCw style={{ width: 32, height: 32, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
        <div style={{ fontSize: 14, opacity: 0.7 }}>Verifying reset link...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!sessionOk) return (
    <div style={bg}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px",
        maxWidth: 400, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#x26A0;&#xFE0F;</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>Invalid Reset Link</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
          This password reset link is invalid or has expired.<br/>
          Please request a new one from the login page.
        </div>
        <button
          onClick={() => navigate("/login")}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg, #0a2558, #1a3a6b)",
            color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );

  if (done) return (
    <div style={bg}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "48px 36px",
        maxWidth: 400, width: "100%", textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        opacity: mounted ? 1 : 0, transition: "opacity 0.4s",
      }}>
        <CheckCircle style={{ width: 56, height: 56, color: "#22c55e", margin: "0 auto 16px" }} />
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginBottom: 8 }}>Password Updated!</div>
        <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.6 }}>
          Your password has been reset successfully.<br/>Redirecting to login...
        </div>
        <div style={{
          marginTop: 20, height: 4, background: "#e5e7eb", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", background: "#22c55e", borderRadius: 2,
            animation: "progress 3s linear forwards",
          }} />
        </div>
        <style>{`@keyframes progress { from { width: 0% } to { width: 100% } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={bg}>
      {/* Subtle blobs */}
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: "rgba(59,130,246,0.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(10,37,88,0.3)", pointerEvents: "none" }} />

      <div style={{
        background: "#fff", borderRadius: 20, padding: "40px 36px",
        maxWidth: 420, width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        transition: "opacity 0.45s, transform 0.45s",
        position: "relative",
      }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(135deg, #0a2558, #1a3a6b)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 8px 24px rgba(10,37,88,0.35)", marginBottom: 14,
          }}>
            <img src={logoImg} alt="EL5H" style={{ width: 54, height: 54, borderRadius: "50%", objectFit: "contain" as const }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
            EL5 MediProcure
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", marginTop: 6 }}>Set New Password</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, textAlign: "center" as const }}>
            Choose a strong password for your account
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* New password */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              New Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#9ca3af" }} />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                style={{
                  width: "100%", padding: "11px 40px 11px 36px",
                  border: "1.5px solid #e5e7eb", borderRadius: 10,
                  fontSize: 13, outline: "none", boxSizing: "border-box" as const,
                  background: "#fafafa", color: "#111",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = "#1a3a6b")}
                onBlur={e => (e.target.style.borderColor = "#e5e7eb")}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                {showPass ? <EyeOff style={{ width: 14, height: 14, color: "#9ca3af" }} /> : <Eye style={{ width: 14, height: 14, color: "#9ca3af" }} />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength ? strengthColor : "#e5e7eb",
                      transition: "background 0.2s",
                    }} />
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: strengthColor, fontWeight: 700 }}>{strengthLabel}</div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <ShieldCheck style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: confirm && confirm === password ? "#22c55e" : "#9ca3af" }} />
              <input
                type={showConf ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                required
                style={{
                  width: "100%", padding: "11px 40px 11px 36px",
                  border: `1.5px solid ${confirm && confirm !== password ? "#ef4444" : confirm && confirm === password ? "#22c55e" : "#e5e7eb"}`,
                  borderRadius: 10, fontSize: 13, outline: "none",
                  boxSizing: "border-box" as const, background: "#fafafa", color: "#111",
                  transition: "border-color 0.15s",
                }}
              />
              <button type="button" onClick={() => setShowConf(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                {showConf ? <EyeOff style={{ width: 14, height: 14, color: "#9ca3af" }} /> : <Eye style={{ width: 14, height: 14, color: "#9ca3af" }} />}
              </button>
            </div>
            {confirm && confirm !== password && (
              <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>Passwords do not match</div>
            )}
          </div>

          {/* Requirements */}
          <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", marginBottom: 20, border: "1px solid #e5e7eb" }}>
            {[
              { label: "At least 8 characters", ok: password.length >= 8 },
              { label: "One uppercase letter", ok: /[A-Z]/.test(password) },
              { label: "One number",            ok: /[0-9]/.test(password) },
              { label: "One special character", ok: /[^A-Za-z0-9]/.test(password) },
            ].map((req, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 3 ? 5 : 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: req.ok ? "#22c55e" : "#e5e7eb", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {req.ok && <span style={{ fontSize: 8, color: "#fff", fontWeight: 900 }}>&#10003;</span>}
                </div>
                <span style={{ fontSize: 11.5, color: req.ok ? "#374151" : "#9ca3af" }}>{req.label}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || password !== confirm || password.length < 8}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
              background: loading || password !== confirm || password.length < 8
                ? "#d1d5db"
                : "linear-gradient(135deg, #0a2558, #1a3a6b)",
              color: "#fff", fontWeight: 800, fontSize: 14,
              cursor: loading || password !== confirm || password.length < 8 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading && <RefreshCw style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            {loading ? "Updating..." : "Set New Password"}
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" as const }}>
          <button
            onClick={() => navigate("/login")}
            style={{ fontSize: 12, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
