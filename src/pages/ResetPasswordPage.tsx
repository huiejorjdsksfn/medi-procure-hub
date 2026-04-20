import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import embuLogo from "@/assets/embu-county-logo.jpg";

type Stage = "request" | "sent" | "update" | "done" | "error";

export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [strength, setStrength] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

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
    if (!email.trim()) { setErrMsg("Please enter your email address."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) { setErrMsg(error.message); return; }
      setStage("sent"); return;
    } catch(e:any) { setErrMsg(e?.message||"Request failed"); }
    finally { setLoading(false); }
  }

  async function handleUpdate() {
    setErrMsg("");
    if (password.length < 8) { setErrMsg("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setErrMsg("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setErrMsg(error.message); return; }
      setStage("done");
      setTimeout(() => { window.location.href = "/login"; }, 3500);
    } catch(e:any) { setErrMsg(e?.message||"Update failed"); }
    finally { setLoading(false); }
  }

  const strengthColors = ["#ef4444","#f97316","#eab308","#22c55e"];
  const strengthLabels = ["Weak","Fair","Good","Strong"];
  const strengthBgs   = ["#fef2f2","#fff7ed","#fefce8","#f0fdf4"];

  const TEAL = "#0e7490";

  const checks = [
    { label: "8+ characters",    ok: password.length >= 8 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(password) },
    { label: "Number",           ok: /[0-9]/.test(password) },
    { label: "Special char",     ok: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a1628 0%, #0e2a4a 40%, #0a1628 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: "24px", position: "relative", overflow: "hidden" }}>

      {/* Decorative blobs */}
      <div style={{ position: "absolute", top: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(14,116,144,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", left: "-8%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 20,
        padding: "52px 44px",
        width: "100%",
        maxWidth: 460,
        boxShadow: "0 40px 80px rgba(0,0,0,0.55)",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>

        {/* Logo & Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
            <img src={embuLogo} alt="EL5H" style={{ height: 48, width: 48, borderRadius: 12, objectFit: "contain", background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.15)", padding: 4 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1 }}>EL5 MediProcure</div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>ProcurBosse</div>
            </div>
          </div>

          {/* Stage icon */}
          <div style={{ width: 64, height: 64, borderRadius: 16, background: stage === "done" ? "linear-gradient(135deg,#22c55e,#16a34a)" : `linear-gradient(135deg,${TEAL},#1d4ed8)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 12px 32px ${stage === "done" ? "rgba(34,197,94,0.4)" : "rgba(14,116,144,0.4)"}` }}>
            {stage === "done"
              ? <svg width="30" height="30" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
              : stage === "sent"
              ? <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              : <svg width="28" height="28" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            }
          </div>

          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            {stage === "request" && "Reset Your Password"}
            {stage === "sent" && "Email Sent!"}
            {stage === "update" && "Set New Password"}
            {stage === "done" && "Password Updated!"}
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13 }}>
            {stage === "request" && "We'll send a secure reset link to your email"}
            {stage === "sent" && `Check ${email || "your inbox"} for the reset link`}
            {stage === "update" && "Create a strong new password for your account"}
            {stage === "done" && "You'll be redirected to login shortly"}
          </div>
        </div>

        {/* Error */}
        {errMsg && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#fca5a5", fontSize: 13, marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>[!]</span>
            <span>{errMsg}</span>
          </div>
        )}

        {/* REQUEST */}
        {stage === "request" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Email Address</label>
              <input
                style={{ width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.2s, background 0.2s" }}
                type="email" placeholder="you@embu.go.ke" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleRequest()}
                onFocus={e => { e.target.style.borderColor = TEAL; e.target.style.background = "rgba(14,116,144,0.1)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <button
              onClick={handleRequest} disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "rgba(14,116,144,0.4)" : `linear-gradient(135deg, ${TEAL}, #0c6380)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 24px rgba(14,116,144,0.4)", transition: "all 0.2s" }}>
              {loading ? "Sending Reset Link..." : "Send Reset Link ->"}
            </button>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <a href="/login" style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>Back to Login</a>
            </div>
          </>
        )}

        {/* SENT */}
        {stage === "sent" && (
          <>
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 14, padding: "24px", textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}></div>
              <div style={{ color: "#86efac", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Reset link sent!</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7 }}>
                We sent a secure link to<br/>
                <strong style={{ color: "#fff" }}>{email}</strong><br/>
                Click it to set your new password.
              </div>
            </div>
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center", marginBottom: 18, lineHeight: 1.6 }}>
              Didn't receive it? Check spam, or{" "}
              <span style={{ color: "#60a5fa", cursor: "pointer", textDecoration: "underline" }} onClick={() => setStage("request")}>try again</span>.
            </div>
            <a href="/login" style={{ display: "block", width: "100%", padding: "13px", background: `linear-gradient(135deg, ${TEAL}, #0c6380)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box", boxShadow: "0 8px 24px rgba(14,116,144,0.35)" }}>
              Back to Login
            </a>
          </>
        )}

        {/* UPDATE */}
        {stage === "update" && (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>New Password</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ width: "100%", padding: "13px 44px 13px 16px", background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", letterSpacing: showPass ? "0.02em" : "0.14em", transition: "border-color 0.2s" }}
                  type={showPass ? "text" : "password"} placeholder="Min 8 characters" value={password}
                  onChange={e => { setPassword(e.target.value); calcStrength(e.target.value); }}
                  onFocus={e => { e.target.style.borderColor = TEAL; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                  {showPass ? "" : ""}
                </button>
              </div>
              {password && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    {[0,1,2,3].map(i => (
                      <div key={i} style={{ height: 4, flex: 1, borderRadius: 3, background: i < strength ? strengthColors[strength-1] : "rgba(255,255,255,0.08)", transition: "background 0.3s" }} />
                    ))}
                  </div>
                  <div style={{ color: strength > 0 ? strengthColors[strength-1] : "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 600 }}>
                    {strength > 0 ? `Password strength: ${strengthLabels[strength-1]}` : ""}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: "0.04em", textTransform: "uppercase" }}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  style={{ width: "100%", padding: "13px 44px 13px 16px", background: "rgba(255,255,255,0.08)", border: `1.5px solid ${confirm && confirm !== password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`, borderRadius: 10, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", letterSpacing: showConfirm ? "0.02em" : "0.14em", transition: "border-color 0.2s" }}
                  type={showConfirm ? "text" : "password"} placeholder="Repeat new password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleUpdate()}
                  onFocus={e => { if (!confirm || confirm === password) e.target.style.borderColor = TEAL; }}
                  onBlur={e => { e.target.style.borderColor = confirm && confirm !== password ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"; }}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                  {showConfirm ? "" : ""}
                </button>
              </div>
              {confirm && confirm !== password && <div style={{ color: "#fca5a5", fontSize: 11, marginTop: 5 }}>Passwords don't match</div>}
              {confirm && confirm === password && password.length >= 8 && <div style={{ color: "#86efac", fontSize: 11, marginTop: 5 }}> Passwords match</div>}
            </div>

            {/* Requirements */}
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Password Requirements</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {checks.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", background: c.ok ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${c.ok ? "#22c55e" : "rgba(255,255,255,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: c.ok ? "#22c55e" : "rgba(255,255,255,0.2)" }}>
                      {c.ok ? "" : ""}
                    </span>
                    <span style={{ color: c.ok ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)", fontSize: 11 }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleUpdate} disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "rgba(14,116,144,0.4)" : `linear-gradient(135deg, ${TEAL}, #0c6380)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", boxShadow: loading ? "none" : "0 8px 24px rgba(14,116,144,0.4)", transition: "all 0.2s" }}>
              {loading ? "Updating Password..." : "Update Password ->"}
            </button>
          </>
        )}

        {/* DONE */}
        {stage === "done" && (
          <>
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 14, padding: "28px", textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}></div>
              <div style={{ color: "#86efac", fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Password Updated!</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 1.7 }}>
                Your password has been changed successfully.<br/>
                Redirecting you to login in a moment...
              </div>
            </div>
            <a href="/login" style={{ display: "block", width: "100%", padding: "14px", background: `linear-gradient(135deg, ${TEAL}, #0c6380)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", textAlign: "center", textDecoration: "none", boxSizing: "border-box", boxShadow: "0 8px 24px rgba(14,116,144,0.4)" }}>
              Go to Login Now
            </a>
          </>
        )}

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>Embu Level 5 Hospital * EL5 MediProcure</div>
          <div style={{ color: "rgba(255,255,255,0.15)", fontSize: 10, marginTop: 2 }}>Health Procurement ERP * ProcurBosse</div>
        </div>
      </div>
    </div>
  );
}
