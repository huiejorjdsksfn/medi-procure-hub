import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Activity, Wifi, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [fadeIn, setFadeIn]       = useState(false);
  const [emailErr, setEmailErr]   = useState("");
  const [passErr, setPassErr]     = useState("");
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setFadeIn(true), 60); }, []);

  const validate = () => {
    let ok = true;
    if (!email.trim()) { setEmailErr("Email is required"); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setEmailErr("Enter a valid email"); ok = false; }
    else setEmailErr("");
    if (!password) { setPassErr("Password is required"); ok = false; }
    else if (password.length < 6) { setPassErr("Password too short"); ok = false; }
    else setPassErr("");
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast({ title: "Welcome back!", description: "Redirecting to dashboard…" });
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err.message || "Invalid credentials";
      if (msg.toLowerCase().includes("email")) setEmailErr("Email not found");
      else if (msg.toLowerCase().includes("password")) setPassErr("Incorrect password");
      else toast({ title: "Login failed", description: msg, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleForgot = () => {
    toast({
      title: "Password Reset",
      description: "Contact your system administrator at ICT, Embu Level 5 Hospital.",
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: "linear-gradient(145deg, #0a2e6e 0%, #1143a8 20%, #1565c0 40%, #1e88e5 60%, #29b6f6 80%, #4dd0e1 100%)",
      }}
    >
      {/* Decorative bubbles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { w:520, h:520, t:-100, l:-100, dur:"4s", del:"0s" },
          { w:380, h:380, t:"auto", b:-80, r:-80, dur:"6s", del:"2s" },
          { w:220, h:220, t:"38%", r:"16%", dur:"5s", del:"1.2s" },
          { w:140, h:140, t:"70%", l:"8%", dur:"7s", del:"0.5s" },
        ].map((b, i) => (
          <div key={i} className="absolute rounded-full animate-pulse"
            style={{
              width: b.w, height: b.h,
              background: "radial-gradient(circle, rgba(255,255,255,0.09), transparent 70%)",
              top: (b as any).t ?? "auto", bottom: (b as any).b ?? "auto",
              left: (b as any).l ?? "auto", right: (b as any).r ?? "auto",
              animationDuration: b.dur, animationDelay: b.del,
            }}
          />
        ))}
      </div>

      {/* Card container */}
      <div
        className="relative w-full flex flex-col items-center px-4"
        style={{
          maxWidth: 400,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? "translateY(0)" : "translateY(18px)",
          transition: "opacity 0.45s ease, transform 0.45s ease",
        }}
      >
        {/* ─── Main card ──────────────────────────────────────────── */}
        <div
          className="w-full rounded-3xl overflow-hidden"
          style={{
            background: "rgba(232, 244, 255, 0.97)",
            backdropFilter: "blur(28px)",
            boxShadow: "0 30px 80px rgba(10,46,110,0.38), 0 0 0 1px rgba(255,255,255,0.45), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {/* Header */}
          <div
            className="flex flex-col items-center pt-10 pb-7 px-8"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 100%)" }}
          >
            <div className="flex items-center gap-3.5 mb-3.5">
              {/* Logo mark */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(145deg, #1143a8, #29b6f6)",
                  boxShadow: "0 10px 28px rgba(17,67,168,0.5), 0 2px 6px rgba(41,182,246,0.3)",
                }}
              >
                <img
                  src="/favicon.png" alt="MediProcure"
                  className="w-10 h-10 object-contain drop-shadow-sm"
                  style={{ filter: "brightness(0) invert(1)" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div className="leading-none">
                <p className="text-[10px] font-black tracking-[0.25em] uppercase mb-0.5" style={{ color: "#64b5f6" }}>enterprise</p>
                <p className="text-[22px] font-black tracking-tight" style={{ color: "#0a2e6e" }}>MediProcure</p>
              </div>
            </div>
            <p className="text-[13px] font-medium" style={{ color: "#3a6faa" }}>
              Login to Enterprise MediProcure
            </p>
          </div>

          <div style={{ height: 1, background: "rgba(17,67,168,0.1)", margin: "0 28px" }} />

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-9 pt-7 pb-6">
            {/* Username field */}
            <div className="mb-5">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: "#5a90c0" }}>
                <Mail className="w-3 h-3" /> USERNAME
              </label>
              <div className="relative">
                <input
                  type="email" value={email}
                  onChange={e => { setEmail(e.target.value); if (emailErr) setEmailErr(""); }}
                  required autoFocus
                  className="w-full px-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${emailErr ? "#ef4444" : "#bdd5f0"}`,
                    color: "#0a2e6e",
                    boxShadow: emailErr ? "0 0 0 3px rgba(239,68,68,0.1)" : "0 2px 8px rgba(17,67,168,0.07)",
                  }}
                  onFocus={e => { if (!emailErr) { e.target.style.borderColor = "#1565c0"; e.target.style.boxShadow = "0 0 0 3px rgba(21,101,192,0.14)"; } }}
                  onBlur={e => { if (!emailErr) { e.target.style.borderColor = "#bdd5f0"; e.target.style.boxShadow = "0 2px 8px rgba(17,67,168,0.07)"; } }}
                />
                {emailErr && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-500">
                    <AlertCircle className="w-3 h-3" /> {emailErr}
                  </div>
                )}
              </div>
            </div>

            {/* Password field */}
            <div className="mb-6">
              <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] mb-2" style={{ color: "#5a90c0" }}>
                <Lock className="w-3 h-3" /> PASSWORD
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => { setPassword(e.target.value); if (passErr) setPassErr(""); }}
                  required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: "#fff",
                    border: `1.5px solid ${passErr ? "#ef4444" : "#bdd5f0"}`,
                    color: "#0a2e6e",
                    boxShadow: passErr ? "0 0 0 3px rgba(239,68,68,0.1)" : "0 2px 8px rgba(17,67,168,0.07)",
                  }}
                  onFocus={e => { if (!passErr) { e.target.style.borderColor = "#1565c0"; e.target.style.boxShadow = "0 0 0 3px rgba(21,101,192,0.14)"; } }}
                  onBlur={e => { if (!passErr) { e.target.style.borderColor = "#bdd5f0"; e.target.style.boxShadow = "0 2px 8px rgba(17,67,168,0.07)"; } }}
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  style={{ color: "#5a90c0" }}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {passErr && (
                  <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-500">
                    <AlertCircle className="w-3 h-3" /> {passErr}
                  </div>
                )}
              </div>
            </div>

            {/* Login button */}
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold tracking-widest text-white transition-all active:scale-[0.98] select-none"
              style={{
                background: loading
                  ? "#90bfe8"
                  : "linear-gradient(135deg, #1143a8 0%, #1565c0 40%, #29b6f6 100%)",
                boxShadow: loading ? "none" : "0 8px 28px rgba(17,67,168,0.4), 0 2px 8px rgba(41,182,246,0.25)",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.1em",
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : "Login"}
            </button>
          </form>

          {/* Footer */}
          <div className="flex justify-center pb-7 -mt-1">
            <button
              type="button"
              onClick={handleForgot}
              className="text-xs font-medium transition-all hover:underline active:opacity-70"
              style={{ color: "#64b5f6" }}
            >
              Forgot your password?
            </button>
          </div>
        </div>

        {/* Below card */}
        <div className="mt-5 flex items-center gap-2">
          <Activity className="w-3 h-3 text-green-400" />
          <p className="text-[11px] text-white/55">Embu Level 5 Hospital · MediProcure ERP v2.0</p>
        </div>
      </div>
    </div>
  );
}
