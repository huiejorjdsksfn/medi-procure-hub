/**
 * ProcurBosse — Login Page v9.1 NUCLEAR CLEAN
 * Based on v5 working base + blue gradient design
 * - Card always opacity:1 (never hidden)
 * - No password reset, no version text
 * - Background image loads async, dark gradient always shows
 * - Zero runtime crashes possible
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
  const emailRef = useRef<HTMLInputElement>(null);

  // Entrance animation (transform only — card always opacity:1)
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-focus
  useEffect(() => { emailRef.current?.focus(); }, []);

  // Redirect if already logged in
  useEffect(() => {
    let live = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (live && data.session) nav("/dashboard", { replace: true }); })
      .catch(() => {});
    return () => { live = false; };
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!email.trim() || !password) { setErr("Enter your email and password."); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      nav("/dashboard", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const,
    padding: "12px 14px 12px 38px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: 10, color: "#fff", fontSize: 14,
    outline: "none", fontFamily: "inherit",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, overflow: "hidden",
      fontFamily: "'Segoe UI', 'Inter', system-ui, sans-serif",
      background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 35%, #1a237e 65%, #0a1172 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {/* Decorative blobs */}
      {[
        { w:320, h:320, t:-80, l:-80 },
        { w:240, h:240, b:-60, r:-60 },
        { w:160, h:160, t:"40%", r:"8%" },
      ].map((b, i) => (
        <div key={i} style={{
          position: "absolute",
          width: b.w, height: b.h, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          top: (b as any).t, left: (b as any).l,
          bottom: (b as any).b, right: (b as any).r,
          pointerEvents: "none",
        }}/>
      ))}

      {/* Login Card — ALWAYS opacity:1 */}
      <div style={{
        background: "rgba(255,255,255,0.13)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: 16, width: "100%", maxWidth: 420,
        padding: "40px 36px 32px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        opacity: 1,
        transform: entered ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
        transition: "transform 0.38s cubic-bezier(.22,.68,0,1.15)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center" as const, marginBottom: 24 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 16,
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.2)",
            marginBottom: 12,
          }}>
            <img
              src={embuLogo} alt="Embu County"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: "contain" as const }}
            />
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const }}>
            Your logo
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "6px 0 0", letterSpacing: "-0.02em" }}>
            Login
          </h1>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
            EL5 MediProcure · Embu Level 5 Hospital
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          {/* Email */}
          <div style={{ position: "relative" as const, marginBottom: 14 }}>
            <span style={{
              position: "absolute" as const, left: 12, top: "50%",
              transform: "translateY(-50%)", fontSize: 15, opacity: 0.55, pointerEvents: "none" as const,
            }}>✉</span>
            <input
              ref={emailRef}
              type="email" value={email} autoComplete="username"
              onChange={e => { setEmail(e.target.value); setErr(""); }}
              placeholder="Email address"
              style={inp}
              onFocus={e => (e.target.style.background = "rgba(255,255,255,0.2)")}
              onBlur={e => (e.target.style.background = "rgba(255,255,255,0.12)")}
            />
          </div>

          {/* Password */}
          <div style={{ position: "relative" as const, marginBottom: err ? 10 : 18 }}>
            <span style={{
              position: "absolute" as const, left: 12, top: "50%",
              transform: "translateY(-50%)", fontSize: 15, opacity: 0.55, pointerEvents: "none" as const,
            }}>🔒</span>
            <input
              type={showPass ? "text" : "password"} value={password}
              autoComplete="current-password"
              onChange={e => { setPassword(e.target.value); setErr(""); }}
              placeholder="Password"
              style={{ ...inp, paddingRight: 40 }}
              onFocus={e => (e.target.style.background = "rgba(255,255,255,0.2)")}
              onBlur={e => (e.target.style.background = "rgba(255,255,255,0.12)")}
            />
            <button
              type="button" tabIndex={-1}
              onClick={() => setShowPass(p => !p)}
              style={{
                position: "absolute" as const, right: 10, top: "50%",
                transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,0.6)", fontSize: 16, padding: 2,
              }}
            >
              {showPass ? "🙈" : "👁"}
            </button>
          </div>

          {/* Error message */}
          {err && (
            <div style={{
              background: "rgba(220,38,38,0.2)",
              border: "1px solid rgba(220,38,38,0.4)",
              borderRadius: 8, padding: "8px 12px", marginBottom: 14,
              fontSize: 12, color: "#fca5a5",
            }}>{err}</div>
          )}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            style={{
              width: "100%", padding: "13px 0",
              background: loading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.95)",
              color: loading ? "rgba(255,255,255,0.7)" : "#1565c0",
              fontWeight: 900, fontSize: 15, border: "none",
              borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit", letterSpacing: "0.04em",
              boxShadow: loading ? "none" : "0 4px 20px rgba(0,0,0,0.2)",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center" as const, marginTop: 18, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          Contact IT department for access issues
        </div>
      </div>

      {/* Bottom dots */}
      <div style={{
        position: "absolute" as const, bottom: 16, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 6,
      }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: "50%",
            background: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)",
          }}/>
        ))}
      </div>
      <style>{`input::placeholder{color:rgba(255,255,255,0.5)!important}`}</style>
    </div>
  );
}
