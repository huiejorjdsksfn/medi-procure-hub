
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Phone, Building2, Key, Save, RefreshCw, Shield, Clock } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const ROLE_LABELS: Record<string,string> = {
  admin:"Administrator", procurement_manager:"Procurement Manager",
  procurement_officer:"Procurement Officer", inventory_manager:"Inventory Manager",
  warehouse_officer:"Warehouse Officer", requisitioner:"Requisitioner",
};

export default function ProfilePage() {
  const { user, profile, roles } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const [fullName, setFullName]     = useState(profile?.full_name||"");
  const [phone, setPhone]           = useState(profile?.phone_number||"");
  const [department, setDepartment] = useState(profile?.department||"");
  const [saving, setSaving]         = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent]   = useState(false);
  const [activityLog, setActivityLog] = useState<any[]>([]);

  useEffect(()=>{
    if(profile){ setFullName(profile.full_name||""); setPhone(profile.phone_number||""); setDepartment(profile.department||""); }
    if(user){
      (supabase as any).from("audit_log").select("action,module,created_at")
        .eq("user_id",user.id).order("created_at",{ascending:false}).limit(8)
        .then(({data}:any)=>setActivityLog(data||[]));
    }
  },[profile,user]);

  const saveProfile = async()=>{
    if(!user) return;
    setSaving(true);
    try{
      const{error}=await(supabase as any).from("profiles").update({full_name:fullName,phone_number:phone,department,updated_at:new Date().toISOString()}).eq("id",user.id);
      if(error) throw error;
      toast({title:"Profile updated ✓"});
    }catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setSaving(false);
  };

  const sendReset = async()=>{
    if(!user?.email) return;
    setResetSending(true);
    const{error}=await(supabase as any).auth.resetPasswordForEmail(user.email,{redirectTo:window.location.origin+"/reset-password"});
    if(error) toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});
    else{ setResetSent(true); toast({title:"Password reset email sent ✓"}); }
    setResetSending(false);
  };

  const inp: React.CSSProperties = {width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",maxWidth:900,margin:"0 auto"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        {/* Profile info */}
        <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
          <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"20px 20px 40px"}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:10}}>
              <User style={{width:28,height:28,color:"#fff"}}/>
            </div>
            <div style={{fontSize:16,fontWeight:900,color:"#fff"}}>{fullName||user?.email?.split("@")[0]||"—"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:2}}>{user?.email}</div>
          </div>
          <div style={{padding:"16px 20px",marginTop:-24}}>
            <div style={{background:"#fff",borderRadius:10,border:"1px solid #e5e7eb",padding:14,marginBottom:14}}>
              {roles.map(r=>(
                <span key={r} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:"#eff6ff",color:"#1d4ed8",fontSize:11,fontWeight:700,marginRight:6,marginBottom:4}}>
                  <Shield style={{width:10,height:10}}/>{ROLE_LABELS[r]||r}
                </span>
              ))}
            </div>
            {[["Full Name","text",fullName,setFullName],["Phone","tel",phone,setPhone],["Department","text",department,setDepartment]].map(([l,t,v,sv]:any)=>(
              <div key={l} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>{l}</label>
                <input type={t} value={v} onChange={e=>sv(e.target.value)} style={inp}/>
              </div>
            ))}
            <button onClick={saveProfile} disabled={saving}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:"#0a2558",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,width:"100%",justifyContent:"center",opacity:saving?0.7:1}}>
              {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}
              {saving?"Saving...":"Save Profile"}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {/* Account info */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#374151",marginBottom:12,display:"flex",alignItems:"center",gap:6}}><Mail style={{width:14,height:14,color:"#6b7280"}}/>Account Information</div>
            {[["Email",user?.email||"—"],["User ID",user?.id?.slice(0,16)+"..."||"—"],["Last Sign-In",user?.last_sign_in_at?new Date(user.last_sign_in_at).toLocaleDateString("en-KE"):"-"]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f9fafb"}}>
                <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>{v}</span>
              </div>
            ))}
          </div>
          {/* Password reset */}
          <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,padding:16,boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:12,fontWeight:800,color:"#374151",marginBottom:8,display:"flex",alignItems:"center",gap:6}}><Key style={{width:14,height:14,color:"#6b7280"}}/>Password</div>
            <p style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Send a password reset link to your email address.</p>
            <button onClick={sendReset} disabled={resetSending||resetSent}
              style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:resetSent?"#dcfce7":"#f9fafb",color:resetSent?"#15803d":"#374151",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,width:"100%",justifyContent:"center",opacity:resetSending?0.7:1}}>
              {resetSending?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Key style={{width:13,height:13}}/>}
              {resetSent?"Reset Email Sent ✓":resetSending?"Sending...":"Send Password Reset Email"}
            </button>
          </div>
          {/* Recent activity */}
          {activityLog.length>0&&(
            <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:16,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
              <div style={{padding:"10px 14px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",fontSize:11,fontWeight:800,color:"#374151",display:"flex",alignItems:"center",gap:6}}>
                <Clock style={{width:13,height:13,color:"#6b7280"}}/>Recent Activity
              </div>
              {activityLog.map((a,i)=>(
                <div key={i} style={{padding:"7px 14px",display:"flex",justifyContent:"space-between",borderBottom:"1px solid #f9fafb",fontSize:11}}>
                  <span style={{color:"#374151",fontWeight:600,textTransform:"capitalize"}}>{a.action} · <span style={{color:"#6b7280"}}>{a.module}</span></span>
                  <span style={{color:"#9ca3af"}}>{a.created_at?new Date(a.created_at).toLocaleDateString("en-KE"):""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
