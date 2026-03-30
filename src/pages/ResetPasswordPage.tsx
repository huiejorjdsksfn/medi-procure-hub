import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type Stage = "request" | "sent" | "update" | "done" | "error";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [strength, setStrength] = useState(0);

  // Detect if user arrived via reset link (hash contains access_token)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      setStage("update");
    }
  }, []);

  function calcStrength(p: string) {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    setStrength(s);
  }

  async function handleRequest() {
    setErrMsg("");
    if (!email.trim()) { setErrMsg("Enter your email address."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setErrMsg(error.message); return; }
    setStage("sent");
  }

  async function handleUpdate() {
    setErrMsg("");
    if (password.length < 8) { setErrMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setErrMsg("Passwords do not match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setErrMsg(error.message); return; }
    setStage("done");
    setTimeout(() => { window.location.href = "/login"; }, 3000);
  }

  const strengthColors = ["#ef4444","#f97316","#eab308","#22c55e"];
  const strengthLabels = ["Weak","Fair","Good","Strong"];

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "24px",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "20px",
    padding: "48px 40px",
    width: "100%",
    maxWidth: "440px",
    boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
  };

  const logoStyle: React.CSSProperties = {
    textAlign: "center" as const,
    marginBottom: "32px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
    boxSizing: "border-box" as const,
  };

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px",
    background: loading
      ? "rgba(59,130,246,0.4)"
      : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    border: "none",
    borderRadius: "10px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    marginTop: "8px",
    transition: "opacity 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block" as const,
    color: "rgba(255,255,255,0.7)",
    fontSize: "13px",
    marginBottom: "6px",
    fontWeight: 500,
  };

  const fieldWrap: React.CSSProperties = { marginBottom: "16px" };

  const errStyle: React.CSSProperties = {
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#fca5a5",
    fontSize: "13px",
    marginBottom: "16px",
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Logo */}
        <div style={logoStyle}>
          <div style={{
            width: 56, height: 56, borderRadius: "14px",
            background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
            display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
          }}>
            {stage === "done"
              ? <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            }
          </div>
          <div style={{ color: "#fff", fontSize: "20px", fontWeight: 700 }}>
            {stage === "request" && "Reset Password"}
            {stage === "sent" && "Check Your Email"}
            {stage === "update" && "Set New Password"}
            {stage === "done" && "Password Updated!"}
            {stage === "error" && "Something Went Wrong"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", marginTop: 6 }}>
            ProcurBosse · EL5 MediProcure
          </div>
        </div>

        {/* REQUEST STAGE */}
        {stage === "request" && (
          <>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
              Enter the email address associated with your account. We'll send a secure reset link.
            </p>
            {errMsg && <div style={errStyle}>{errMsg}</div>}
            <div style={fieldWrap}>
              <label style={labelStyle}>Email Address</label>
              <input
                style={inputStyle}
                type="email"
                placeholder="you@embu.go.ke"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRequest()}
              />
            </div>
            <button style={btnStyle} onClick={handleRequest} disabled={loading}>
              {loading ? "Sending Reset Link…" : "Send Reset Link →"}
            </button>
            <div style={{ textAlign: "center" as const, marginTop: 20 }}>
              <a href="/login" style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", textDecoration: "none" as const }}>
                ← Back to Login
              </a>
            </div>
          </>
        )}

        {/* SENT STAGE */}
        {stage === "sent" && (
          <>
            <div style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "12px",
              padding: "20px",
              textAlign: "center" as const,
              marginBottom: "24px",
            }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📧</div>
              <div style={{ color: "#86efac", fontWeight: 600, marginBottom: 6 }}>Email Sent!</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", lineHeight: 1.6 }}>
                A reset link was sent to <strong style={{ color: "#fff" }}>{email}</strong>.<br/>
                Check your inbox and click the link to continue.
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", textAlign: "center" as const, marginBottom: 16 }}>
              Didn't receive it? Check spam, or{" "}
              <span
                style={{ color: "#60a5fa", cursor: "pointer" as const }}
                onClick={() => setStage("request")}
              >
                try again
              </span>
            </div>
            <a href="/login" style={{ ...btnStyle, display: "block" as const, textAlign: "center" as const, textDecoration: "none" as const }}>
              Back to Login
            </a>
          </>
        )}

        {/* UPDATE STAGE */}
        {stage === "update" && (
          <>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "14px", marginBottom: "20px", lineHeight: 1.6 }}>
              Create a strong new password for your account.
            </p>
            {errMsg && <div style={errStyle}>{errMsg}</div>}
            <div style={fieldWrap}>
              <label style={labelStyle}>New Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Min 8 characters"
                value={password}
                onChange={e => { setPassword(e.target.value); calcStrength(e.target.value); }}
              />
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex" as const, gap: 4 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{
                        height: 3, flex: 1, borderRadius: 2,
                        background: i < strength ? strengthColors[strength - 1] : "rgba(255,255,255,0.1)",
                        transition: "background 0.3s",
                      }}/>
                    ))}
                  </div>
                  <div style={{ color: strength > 0 ? strengthColors[strength-1] : "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: 4 }}>
                    {strength > 0 ? strengthLabels[strength-1] : ""}
                  </div>
                </div>
              )}
            </div>
            <div style={fieldWrap}>
              <label style={labelStyle}>Confirm Password</label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? "rgba(239,68,68,0.5)" : undefined,
                }}
                type="password"
                placeholder="Repeat new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleUpdate()}
              />
              {confirm && confirm !== password && (
                <div style={{ color: "#fca5a5", fontSize: "11px", marginTop: 4 }}>Passwords don't match</div>
              )}
            </div>
            <div style={{ marginBottom: 16 }}>
              {["8+ characters","Uppercase letter","Number","Special character (!@#$)"].map((req,i) => {
                const checks = [password.length>=8,/[A-Z]/.test(password),/[0-9]/.test(password),/[^A-Za-z0-9]/.test(password)];
                return (
                  <div key={i} style={{ display: "flex" as const, alignItems: "center" as const, gap: 6, marginBottom: 4 }}>
                    <span style={{ color: checks[i] ? "#22c55e" : "rgba(255,255,255,0.25)", fontSize: "12px" }}>
                      {checks[i] ? "✓" : "○"}
                    </span>
                    <span style={{ color: checks[i] ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", fontSize: "12px" }}>
                      {req}
                    </span>
                  </div>
                );
              })}
            </div>
            <button style={btnStyle} onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating Password…" : "Update Password →"}
            </button>
          </>
        )}

        {/* DONE STAGE */}
        {stage === "done" && (
          <>
            <div style={{
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center" as const,
              marginBottom: "24px",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
              <div style={{ color: "#86efac", fontWeight: 600, fontSize: "16px", marginBottom: 6 }}>
                Password Updated Successfully!
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px" }}>
                Redirecting you to login in 3 seconds…
              </div>
            </div>
            <a href="/login" style={{ ...btnStyle, display: "block" as const, textAlign: "center" as const, textDecoration: "none" as const }}>
              Go to Login Now
            </a>
          </>
        )}
      </div>
    </div>
  );
}
