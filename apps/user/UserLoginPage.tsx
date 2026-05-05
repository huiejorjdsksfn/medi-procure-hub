/**
 * UserLoginPage — Standard staff login
 * Blue theme, works for all non-admin roles
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Stethoscope } from "lucide-react";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const navigate = useNavigate();
  const { signIn, session } = useAuth();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);
  useEffect(() => { if (session) navigate("/dashboard"); }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        toast({ title: "Sign in failed", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 10,
    background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(59,130,246,0.25)",
    color: "#dbeafe", fontSize: 15, outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #0c1445 100%)",
      fontFamily: "'Inter', sans-serif", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "all 0.5s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%",
            background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 0 32px rgba(59,130,246,0.45)",
          }}>
            <Stethoscope size={32} color="white" />
          </div>
          <h1 style={{ color: "#dbeafe", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            ProcurBosse
          </h1>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            EL5 MediProcure · Embu Level 5 Hospital
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(59,130,246,0.2)", borderRadius: 16,
          padding: 32, boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}>
          {!forgotMode ? (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={{ color: "#bfdbfe", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Email Address
                </label>
                <input style={inp} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@embu.go.ke" disabled={loading}
                  onFocus={e => e.target.style.borderColor = "#3b82f6"}
                  onBlur={e => e.target.style.borderColor = "rgba(59,130,246,0.25)"} />
              </div>
              <div>
                <label style={{ color: "#bfdbfe", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...inp, paddingRight: 44 }}
                    type={showPass ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" disabled={loading}
                    onFocus={e => e.target.style.borderColor = "#3b82f6"}
                    onBlur={e => e.target.style.borderColor = "rgba(59,130,246,0.25)"} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#60a5fa" }}>
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                style={{
                  width: "100%", padding: "13px 0", marginTop: 4,
                  background: loading ? "rgba(59,130,246,0.3)" : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
                  border: "none", borderRadius: 10, color: "white",
                  fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                }}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <button type="button" onClick={() => setForgotMode(true)}
                style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 13, cursor: "pointer", textAlign: "center" }}>
                Forgot password?
              </button>
            </form>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ color: "#dbeafe", fontSize: 18, fontWeight: 700 }}>Reset Password</h2>
              <p style={{ color: "#9ca3af", fontSize: 13 }}>Enter your email to receive a reset link.</p>
              <input style={inp} type="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@embu.go.ke" />
              <button
                style={{ width: "100%", padding: "12px 0", background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", border: "none", borderRadius: 10, color: "white", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
                onClick={async () => {
                  const { supabase } = await import("@/integrations/supabase/client");
                  await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
                  toast({ title: "Reset link sent", description: "Check your email inbox." });
                  setForgotMode(false);
                }}>
                Send Reset Link
              </button>
              <button type="button" onClick={() => setForgotMode(false)}
                style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 13, cursor: "pointer" }}>
                ← Back to login
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: "#4b5563", fontSize: 12, marginTop: 24 }}>
          Embu County Government · Health Department
        </p>
      </div>
    </div>
  );
}
