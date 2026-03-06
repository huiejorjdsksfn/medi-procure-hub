import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    } finally {
      setLoading(false);
    }
  };

  return (
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
