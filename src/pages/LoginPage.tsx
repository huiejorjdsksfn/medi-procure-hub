import { useState } from "react";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!email || !password) {
      toast({ title: "Please enter your email and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/dashboard");
    } catch {
      toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" });
=======
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import procurementBg from "@/assets/procurement-bg.jpg";
import embuLogo from "@/assets/embu-county-logo.jpg";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/requisitions");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
>>>>>>> origin/main
    } finally {
      setLoading(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">MediProcure ERP</h1>
          <p className="text-blue-200 text-sm mt-1">Embu Level 5 Hospital</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-1">Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the system</p>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-700">Email Address</Label>
              <Input
                className="mt-1.5"
                type="email"
                placeholder="user@embuhosp.go.ke"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>
            <div>
              <Label className="text-slate-700">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Signing in..." : <><LogIn className="w-4 h-4 mr-2" />Sign In</>}
            </Button>
          </div>

          <p className="text-xs text-center text-slate-400 mt-4">
            Authorized users only. All access is monitored and audited.
          </p>
        </div>

        <p className="text-center text-blue-300 text-xs mt-6">
          © {new Date().getFullYear()} Embu Level 5 Hospital · IT Department
        </p>
      </div>
    </div>
  );
}
=======
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background wallpaper */}
      <div className="absolute inset-0 z-0">
        <img src={procurementBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(215,30%,14%)]/90 via-[hsl(215,30%,14%)]/80 to-[hsl(174,50%,40%)]/30" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 mb-2">
            <img src={embuLogo} alt="Embu County" className="w-14 h-14 rounded-full border-2 border-white/30 shadow-lg" />
            <img src={logo} alt="MediProcure" className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MediProcure ERP</h1>
        </div>
        <Card className="border-white/10 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <h2 className="text-xl font-semibold text-center text-foreground">Sign In</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hospital.org" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
>>>>>>> origin/main
