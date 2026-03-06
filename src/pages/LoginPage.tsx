import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, Activity } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Sign In Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "Segoe UI, system-ui, sans-serif" }}>
      {/* Left panel - brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0f2744 0%, #1a3a5c 40%, #0e6b8a 100%)" }}>
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <img src="/favicon.png" alt="MediProcure" className="w-10 h-10" />
            <div>
              <p className="text-white font-bold text-lg leading-none">MediProcure</p>
              <p className="text-blue-300 text-xs">Enterprise Resource Planning</p>
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Procurement<br />
            <span style={{ color: "#38bdf8" }}>Simplified.</span>
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
            End-to-end procurement, financial management, and quality control for Embu Level 5 Hospital.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { label: "Modules", val: "8" },
            { label: "Tables", val: "30" },
            { label: "Realtime", val: "Live" },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-lg px-4 py-3 backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">{s.val}</p>
              <p className="text-blue-300 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-gray-50" style={{ minWidth: 0 }}>
        <div className="mx-auto w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <img src="/favicon.png" alt="MediProcure" className="w-10 h-10" />
            <div>
              <p className="font-bold text-gray-800 text-lg leading-none">MediProcure</p>
              <p className="text-gray-500 text-xs">Embu Level 5 Hospital</p>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm">Welcome back. Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-sm font-semibold text-gray-700 mb-1.5 block">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="email" type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@embu.go.ke"
                  required
                  className="pl-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="password" type={showPassword ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 pr-10 h-11 bg-white border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}
              className="w-full h-11 text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: "#0f2744", hover: undefined }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : "Sign In"}
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Activity className="w-3.5 h-3.5 text-green-500" />
              <span>System operational · Embu Level 5 Hospital</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
