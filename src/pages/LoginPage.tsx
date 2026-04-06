import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-card rounded-xl shadow-2xl border border-border p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-foreground tracking-tight">EL5 MediProcure</h1>
            <p className="text-xs text-muted-foreground">Embu Level 5 Hospital · Procurement ERP</p>
          </div>

          <div className="h-px bg-border" />

          {forgotSent ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-3xl">📧</div>
              <p className="text-sm font-semibold text-foreground">Check your inbox</p>
              <p className="text-xs text-muted-foreground">
                Reset link sent to <strong className="text-foreground">{email}</strong>
              </p>
              <button onClick={() => { setForgotMode(false); setForgotSent(false); }}
                className="text-xs font-medium text-primary hover:underline">
                ← Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={forgotMode ? handleForgot : handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@hospital.go.ke" required autoFocus
                    className="w-full px-3 py-2.5 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                {!forgotMode && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password</label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"} value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" required
                        className="w-full px-3 py-2.5 pr-10 text-sm border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading
                  ? (forgotMode ? "Sending…" : "Signing in…")
                  : (forgotMode ? "Send Reset Link" : "Sign In")}
              </button>

              <div className="text-center">
                {forgotMode ? (
                  <button type="button" onClick={() => setForgotMode(false)}
                    className="text-xs text-muted-foreground hover:text-foreground">
                    ← Back to Sign In
                  </button>
                ) : (
                  <button type="button" onClick={() => setForgotMode(true)}
                    className="text-xs text-muted-foreground hover:text-primary">
                    Forgot password?
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-muted-foreground mt-4">
          ProcurBosse v5.8 · Embu County Government
        </p>
      </div>
    </div>
  );
}
