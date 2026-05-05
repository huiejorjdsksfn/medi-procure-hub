/**
 * AdminLoginPage — Branded admin-only login
 * Dark indigo theme, role restriction enforced post-login
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield, Lock } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { signIn, session, isAdmin } = useAuth();

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);
  useEffect(() => {
    if (session) {
      if (isAdmin) navigate("/dashboard");
      else {
        toast({ title: "Access Denied", description: "Admin credentials required.", variant: "destructive" });
      }
    }
  }, [session, isAdmin, navigate]);

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

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a3e 50%, #0f0f1a 100%)",
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 420, padding: "0 20px",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)",
        transition: "all 0.5s ease",
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", boxShadow: "0 0 30px rgba(99,102,241,0.4)",
          }}>
            <Shield size={30} color="white" />
          </div>
          <h1 style={{ color: "#e0e7ff", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>
            Admin Portal
          </h1>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            EL5 MediProcure · Embu Level 5 Hospital
          </p>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
            borderRadius: 20, padding: "4px 12px", marginTop: 12,
          }}>
            <Lock size={12} color="#818cf8" />
            <span style={{ color: "#818cf8", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Restricted Access
            </span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(99,102,241,0.2)", borderRadius: 16,
          padding: 32, boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ color: "#c7d2fe", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                Admin Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@embu.go.ke" disabled={loading}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(99,102,241,0.25)",
                  color: "#e0e7ff", fontSize: 14, outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#6366f1"}
                onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.25)"}
              />
            </div>
            <div>
              <label style={{ color: "#c7d2fe", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" disabled={loading}
                  style={{
                    width: "100%", padding: "12px 44px 12px 16px", borderRadius: 10,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(99,102,241,0.25)",
                    color: "#e0e7ff", fontSize: 14, outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "rgba(99,102,241,0.25)"}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", color: "#818cf8",
                    display: "flex", alignItems: "center",
                  }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px 0",
                background: loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none", borderRadius: 10, color: "white",
                fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 20px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
              }}>
              {loading ? "Authenticating..." : "Access Admin Portal"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", color: "#4b5563", fontSize: 12, marginTop: 24 }}>
          Embu County Government · ICT Division
        </p>
      </div>
    </div>
  );
}
