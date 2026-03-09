import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Lock, Mail, RefreshCw, ShoppingCart } from "lucide-react";
import procurementBg from "@/assets/procurement-bg.jpg";
import embuLogo from "@/assets/embu-county-logo.jpg";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [mounted,  setMounted]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!email.trim() || !password) { toast({title:"Fill in all fields",variant:"destructive"}); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if(error) throw error;
      navigate("/dashboard");
    } catch(err: any) {
      toast({ title:"Login failed", description:err.message, variant:"destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* ── LEFT: Procurement wallpaper ── */}
      <div style={{
        flex:1, position:"relative", overflow:"hidden",
        backgroundImage:`url(${procurementBg})`,
        backgroundSize:"cover", backgroundPosition:"center",
        display:"flex", flexDirection:"column",
      }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(135deg,rgba(10,37,88,0.9) 0%,rgba(26,58,107,0.85) 50%,rgba(0,105,92,0.75) 100%)" }}/>

        <div style={{ position:"relative", zIndex:1, flex:1, display:"flex", flexDirection:"column", padding:"36px 40px" }}>
          {/* Logo + name */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"auto" }}>
            <img src={embuLogo} alt="Embu County" style={{ height:52, width:52, borderRadius:12, objectFit:"contain", background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.25)", padding:4 }} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            <div>
              <div style={{ fontSize:18, fontWeight:900, color:"#fff", letterSpacing:"-0.02em" }}>EL5 MediProcure</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>Embu Level 5 Hospital</div>
            </div>
          </div>

          {/* Center content */}
          <div style={{ marginBottom:"auto", marginTop:40 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"6px 14px", marginBottom:20 }}>
              <ShoppingCart style={{ width:13, height:13, color:"#60a5fa" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>Procurement Management System</span>
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:"#fff", lineHeight:1.15, letterSpacing:"-0.03em", marginBottom:16 }}>
              Smarter Hospital<br/><span style={{ color:"#60a5fa" }}>Procurement.</span>
            </div>
            <p style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.7, maxWidth:360 }}>
              Manage requisitions, purchase orders, supplier contracts, inventory and financial vouchers — all in one integrated platform built for Embu County health facilities.
            </p>

            {/* Feature tags */}
            <div style={{ display:"flex", flexWrap:"wrap" as const, gap:8, marginTop:24 }}>
              {["Requisitions","Purchase Orders","Tenders","Inventory","Vouchers","Reports","Quality Control","E-Signatures"].map(f=>(
                <span key={f} style={{ fontSize:10, fontWeight:600, padding:"4px 10px", borderRadius:6, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.75)" }}>{f}</span>
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>
            © 2025 Embu County Government · Embu Level 5 Hospital · Health Procurement Division
          </div>
        </div>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div style={{
        width:"100%", maxWidth:420,
        display:"flex", flexDirection:"column", justifyContent:"center",
        padding:"40px 36px", background:"#fff",
        opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(20px)",
        transition:"all 0.5s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:24, fontWeight:900, color:"#111827", letterSpacing:"-0.02em", marginBottom:6 }}>Sign In</div>
          <div style={{ fontSize:13, color:"#6b7280" }}>Access your EL5 MediProcure account</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:6, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>Email Address</label>
            <div style={{ position:"relative" }}>
              <Mail style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"#9ca3af" }}/>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoFocus
                placeholder="your@email.go.ke" required
                style={{ width:"100%", paddingLeft:38, paddingRight:14, paddingTop:11, paddingBottom:11, fontSize:13, border:"1.5px solid #e5e7eb", borderRadius:9, outline:"none", background:"#f9fafb", transition:"border-color 0.15s" }}
                onFocus={e=>(e.target as HTMLElement).style.borderColor="#1a3a6b"}
                onBlur={e=>(e.target as HTMLElement).style.borderColor="#e5e7eb"}/>
            </div>
          </div>

          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#374151", display:"block", marginBottom:6, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>Password</label>
            <div style={{ position:"relative" }}>
              <Lock style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:14, height:14, color:"#9ca3af" }}/>
              <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ width:"100%", paddingLeft:38, paddingRight:44, paddingTop:11, paddingBottom:11, fontSize:13, border:"1.5px solid #e5e7eb", borderRadius:9, outline:"none", background:"#f9fafb", transition:"border-color 0.15s" }}
                onFocus={e=>(e.target as HTMLElement).style.borderColor="#1a3a6b"}
                onBlur={e=>(e.target as HTMLElement).style.borderColor="#e5e7eb"}/>
              <button type="button" onClick={()=>setShowPass(v=>!v)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", cursor:"pointer", color:"#9ca3af", lineHeight:0 }}>
                {showPass?<EyeOff style={{width:14,height:14}}/>:<Eye style={{width:14,height:14}}/>}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ padding:"13px", background:"linear-gradient(135deg,#0a2558,#1a3a6b)", color:"#fff", border:"none", borderRadius:9, cursor:loading?"not-allowed":"pointer", fontSize:14, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 4px 16px rgba(26,58,107,0.35)", opacity:loading?0.8:1, transition:"all 0.15s", marginTop:4 }}>
            {loading ? <><RefreshCw style={{width:15,height:15}} className="animate-spin"/> Signing in…</> : "Sign In to EL5 MediProcure"}
          </button>
        </form>

        <div style={{ marginTop:20, padding:"12px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#92400e", marginBottom:3 }}>Need Access?</div>
          <div style={{ fontSize:11, color:"#78350f" }}>Contact the ICT department at Embu Level 5 Hospital for account creation and password reset.</div>
        </div>

        <div style={{ marginTop:"auto", paddingTop:32, fontSize:10, color:"#d1d5db", textAlign:"center" as const }}>
          Embu Level 5 Hospital · Embu County Government
        </div>
      </div>

      {/* Responsive: hide left panel on small screens */}
      <style>{`
        @media (max-width: 640px) { 
          div[style*="procurement-bg"] { display: none; }
          div[style*="max-width: 420px"] { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
