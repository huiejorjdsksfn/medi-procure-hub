import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Sign In Failed", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ fontFamily: "Segoe UI, system-ui, sans-serif", background: "linear-gradient(145deg,#1565c0 0%,#1e88e5 35%,#29b6f6 68%,#4dd0e1 100%)" }}
    >
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:"absolute", width:420, height:420, borderRadius:"50%", background:"rgba(255,255,255,0.06)", top:-80, left:-80 }} />
        <div style={{ position:"absolute", width:300, height:300, borderRadius:"50%", background:"rgba(255,255,255,0.05)", bottom:-60, right:-60 }} />
        <div style={{ position:"absolute", width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.04)", top:"40%", right:"15%" }} />
      </div>

      <div className="relative w-full flex flex-col items-center" style={{ maxWidth:380, padding:"0 16px" }}>
        {/* Card */}
        <div className="w-full rounded-2xl shadow-2xl overflow-hidden" style={{ background:"rgba(240,247,255,0.97)", backdropFilter:"blur(24px)", border:"1px solid rgba(255,255,255,0.5)" }}>

          {/* Header */}
          <div className="flex flex-col items-center pt-10 pb-7 px-8">
            <div className="flex items-center gap-3 mb-3">
              {/* Bird / logo mark */}
              <div className="relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg" style={{ background:"linear-gradient(135deg,#1565c0,#29b6f6)" }}>
                <img src="/favicon.png" alt="" className="w-9 h-9 object-contain" style={{ filter:"brightness(0) invert(1)" }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color:"#64b5f6" }}>enterprise</p>
                <p className="text-[22px] font-bold leading-none" style={{ color:"#0d2b5e" }}>MediProcure</p>
              </div>
            </div>
            <p className="text-sm mt-1" style={{ color:"#4a7dbf" }}>Login to MediProcure ERP</p>
          </div>

          {/* Divider */}
          <div style={{ height:1, background:"rgba(21,101,192,0.08)", margin:"0 28px" }} />

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-9 py-8 space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5" style={{ color:"#7a9fc2" }}>Username</label>
              <input
                type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoFocus
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{ background:"#fff", border:"1.5px solid #cde0f5", color:"#0d2b5e", boxShadow:"0 1px 4px rgba(21,101,192,0.07)" }}
                onFocus={e=>(e.target.style.borderColor="#1565c0")}
                onBlur={e=>(e.target.style.borderColor="#cde0f5")}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-[0.14em] uppercase mb-1.5" style={{ color:"#7a9fc2" }}>Password</label>
              <div className="relative">
                <input
                  type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} required
                  className="w-full px-4 py-3 pr-11 rounded-lg text-sm outline-none transition-all"
                  style={{ background:"#fff", border:"1.5px solid #cde0f5", color:"#0d2b5e", boxShadow:"0 1px 4px rgba(21,101,192,0.07)" }}
                  onFocus={e=>(e.target.style.borderColor="#1565c0")}
                  onBlur={e=>(e.target.style.borderColor="#cde0f5")}
                />
                <button type="button" onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color:"#7a9fc2" }}>
                  {showPass ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                </button>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold tracking-wide text-white transition-all disabled:opacity-60"
                style={{ background: loading ? "#90caf9" : "linear-gradient(135deg,#1565c0 0%,#29b6f6 100%)", boxShadow:"0 4px 18px rgba(21,101,192,0.38)", letterSpacing:"0.04em" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Signing in…
                  </span>
                ) : "Login"}
              </button>
            </div>
          </form>

          {/* Footer */}
          <div className="pb-8 flex justify-center">
            <button className="text-xs transition-colors" style={{ color:"#64b5f6" }}
              onMouseEnter={e=>((e.target as any).style.color="#1565c0")}
              onMouseLeave={e=>((e.target as any).style.color="#64b5f6")}>
              Forgot your password?
            </button>
          </div>
        </div>

        <p className="mt-5 text-[11px] text-center text-white/55">Embu Level 5 Hospital · MediProcure ERP · Kenya</p>
      </div>
    </div>
  );
};
export default LoginPage;
