/**
 * ProcurBosse v21.3 -- Profile Page (Full Upgrade)
 * Edit profile, change avatar, reset password, view activity, role display
 * BUILD-SAFE: zero non-ASCII chars
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import ImageUploader from "@/components/ImageUploader";
import { User, Mail, Phone, Building2, Key, Save, RefreshCw, Shield, Clock, ChevronRight, Activity, Globe, Edit3, Check, X } from "lucide-react";

const db = supabase as any;

const ROLE_META: Record<string,{label:string;color:string;bg:string}> = {
  superadmin:          {label:"Superadmin",         color:"#6b21a8",bg:"#f3e8ff"},
  webmaster:           {label:"Webmaster",           color:"#0ea5e9",bg:"#e0f2fe"},
  admin:               {label:"Administrator",       color:"#dc2626",bg:"#fee2e2"},
  database_admin:      {label:"DB Administrator",    color:"#7c2d12",bg:"#ffedd5"},
  procurement_manager: {label:"Procurement Manager", color:"#1d4ed8",bg:"#dbeafe"},
  procurement_officer: {label:"Procurement Officer", color:"#0369a1",bg:"#e0f2fe"},
  inventory_manager:   {label:"Inventory Manager",   color:"#047857",bg:"#d1fae5"},
  warehouse_officer:   {label:"Warehouse Officer",   color:"#7c3aed",bg:"#ede9fe"},
  requisitioner:       {label:"Requisitioner",       color:"#d97706",bg:"#fef3c7"},
  accountant:          {label:"Accountant",          color:"#065f46",bg:"#d1fae5"},
};

const S = {
  page:{background:T.bg,minHeight:"100%",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"} as React.CSSProperties,
  hdr:{background:T.primary,padding:"0 24px",display:"flex",alignItems:"stretch",minHeight:44,boxShadow:"0 2px 6px rgba(0,0,120,.25)"} as React.CSSProperties,
  bc:{background:"#fff",padding:"7px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.fgMuted} as React.CSSProperties,
  card:{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden",marginBottom:16} as React.CSSProperties,
  inp:{border:`1px solid ${T.border}`,borderRadius:T.r,padding:"9px 12px",fontSize:13,outline:"none",background:"#fff",color:T.fg,fontFamily:"inherit",width:"100%",boxSizing:"border-box"as const} as React.CSSProperties,
  ch:(col:string):React.CSSProperties=>({padding:"12px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8,background:col+"0a"}),
};
const btn=(bg:string,fg="white",bd?:string):React.CSSProperties=>({display:"inline-flex",alignItems:"center",gap:6,padding:"8px 16px",background:bg,color:fg,border:`1px solid ${bd||bg}`,borderRadius:T.r,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"});

export default function ProfilePage(){
  const nav=useNavigate();
  const{user,profile,signOut}=useAuth();
  const[fullName,setFullName]=useState(profile?.full_name||"");
  const[phone,setPhone]=useState(profile?.phone_number||"");
  const[dept,setDept]=useState(profile?.department||"");
  const[empId,setEmpId]=useState(profile?.employee_id||"");
  const[saving,setSaving]=useState(false);
  const[resetSending,setResetSending]=useState(false);
  const[resetSent,setResetSent]=useState(false);
  const[activityLog,setActivityLog]=useState<any[]>([]);
  const[sessions,setSessions]=useState<any[]>([]);
  const[editMode,setEditMode]=useState(false);
  const[myIP,setMyIP]=useState("");

  useEffect(()=>{
    if(profile){setFullName(profile.full_name||"");setPhone(profile.phone_number||"");setDept(profile.department||"");setEmpId(profile.employee_id||"");}
    if(user){
      db.from("audit_log").select("action,module,entity_type,created_at,description").eq("user_id",user.id).order("created_at",{ascending:false}).limit(12)
        .then(({data}:any)=>setActivityLog(data||[]));
      db.from("user_sessions").select("ip_address,started_at,last_seen_at,is_active").eq("user_id",user.id).order("started_at",{ascending:false}).limit(5)
        .then(({data}:any)=>setSessions(data||[]));
    }
    fetch("https://api.ipify.org?format=json").then(r=>r.json()).then(d=>setMyIP(d.ip||"")).catch(()=>{});
  },[profile,user]);

  const saveProfile=async()=>{
    if(!user||!fullName.trim()){toast({title:"Name required",variant:"destructive"});return;}
    setSaving(true);
    try{
      const{error}=await db.from("profiles").update({full_name:fullName,phone_number:phone,department:dept,employee_id:empId,updated_at:new Date().toISOString()}).eq("id",user.id);
      if(error)throw error;
      toast({title:"Profile updated successfully"});
      setEditMode(false);
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    setSaving(false);
  };

  const sendReset=async()=>{
    if(!user?.email)return;
    setResetSending(true);
    const{error}=await supabase.auth.resetPasswordForEmail(user.email,{redirectTo:window.location.origin+"/reset-password"});
    if(error)toast({title:"Failed to send",description:error.message,variant:"destructive"});
    else{setResetSent(true);toast({title:"Password reset email sent"});}
    setResetSending(false);
  };

  const rm=ROLE_META[profile?.role||""]||{label:profile?.role||"Staff",color:T.fgDim,bg:T.bg};

  return(
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <User size={20} color="#fff"/>
          <div><div style={{fontWeight:800,fontSize:15,color:"#fff"}}>My Profile</div><div style={{fontSize:9,color:"rgba(255,255,255,.5)"}}>Account settings & activity</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px"}}>
          <button onClick={()=>nav("/dashboard")} style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:6,padding:"5px 12px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Dashboard</button>
        </div>
      </div>
      <div style={S.bc}>
        <span style={{cursor:"pointer",color:T.primary}} onClick={()=>nav("/dashboard")}>Home</span>
        <ChevronRight size={12}/><span style={{fontWeight:600}}>My Profile</span>
      </div>

      <div style={{padding:"20px 24px",display:"grid",gridTemplateColumns:"320px 1fr",gap:20,alignItems:"start"}}>
        {/* LEFT: Profile Card */}
        <div>
          <div style={S.card}>
            <div style={{padding:"28px 24px",textAlign:"center"as const,borderBottom:`1px solid ${T.border}`,background:`linear-gradient(135deg,${T.primary}08,${T.primary}02)`}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
                <ImageUploader type="profile" circle size="lg" current={profile?.avatar_url||""} folder={`profiles/${user?.id}`}
                  onUploaded={async(url)=>{if(url&&user?.id){await db.from("profiles").update({avatar_url:url}).eq("id",user.id);toast({title:"Photo updated"});}}}/>
              </div>
              <div style={{fontWeight:800,fontSize:18,color:T.fg}}>{fullName||"Your Name"}</div>
              <div style={{fontSize:12,color:T.fgMuted,marginTop:4}}>{user?.email}</div>
              <div style={{marginTop:12,display:"flex",justifyContent:"center"}}>
                <span style={{padding:"4px 14px",borderRadius:99,fontSize:12,fontWeight:700,color:rm.color,background:rm.bg,border:`1px solid ${rm.color}33`}}>{rm.label}</span>
              </div>
              {myIP&&<div style={{marginTop:10,fontSize:10,color:T.fgDim,fontFamily:"monospace"}}><Globe size={10}/> {myIP}</div>}
            </div>
            <div style={{padding:"16px 20px"}}>
              <div style={{display:"flex",flexDirection:"column"as const,gap:10}}>
                {[{I:Phone,l:"Phone",v:phone},{I:Building2,l:"Department",v:dept},{I:Shield,l:"Employee ID",v:empId}].map(({I,l,v})=>(
                  v?<div key={l} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:T.fgMuted}}><I size={14} color={T.fgDim}/><span style={{fontWeight:600,color:T.fg,minWidth:90}}>{l}:</span>{v}</div>:null
                ))}
              </div>
              <div style={{marginTop:16,display:"flex",gap:8,flexDirection:"column"as const}}>
                <button onClick={sendReset} disabled={resetSending||resetSent} style={{...btn(resetSent?T.successBg:T.primaryBg,resetSent?T.success:T.primary,resetSent?T.success+"33":T.primary+"33"),width:"100%",justifyContent:"center"}}>
                  {resetSending?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:resetSent?<Check size={13}/>:<Key size={13}/>}
                  {resetSent?"Reset Email Sent":resetSending?"Sending...":"Send Password Reset"}
                </button>
                <button onClick={()=>{signOut();nav("/login");}} style={{...btn(T.errorBg,T.error,T.error+"33"),width:"100%",justifyContent:"center"}}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Edit + Activity */}
        <div>
          {/* Edit Form */}
          <div style={S.card}>
            <div style={S.ch(T.primary)}>
              <Edit3 size={15} color={T.primary}/>
              <span style={{fontWeight:700,fontSize:13}}>Profile Information</span>
              <button onClick={()=>setEditMode(!editMode)} style={{marginLeft:"auto",...btn(editMode?T.errorBg:T.primaryBg,editMode?T.error:T.primary,editMode?T.error+"33":T.primary+"33"),padding:"4px 12px",fontSize:11}}>
                {editMode?<><X size={12}/>Cancel</>:<><Edit3 size={12}/>Edit</>}
              </button>
            </div>
            <div style={{padding:"20px 24px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px"}}>
                {[{l:"Full Name *",v:fullName,sv:setFullName},{l:"Phone Number",v:phone,sv:setPhone},{l:"Department",v:dept,sv:setDept},{l:"Employee ID",v:empId,sv:setEmpId}].map(({l,v,sv})=>(
                  <div key={l} style={{marginBottom:14}}>
                    <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>{l}</label>
                    <input value={v} onChange={e=>sv(e.target.value)} disabled={!editMode}
                      style={{...S.inp,background:editMode?"#fff":T.bg,color:editMode?T.fg:T.fgMuted,cursor:editMode?"text":"default"}}/>
                  </div>
                ))}
              </div>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>Email Address (read-only)</label>
                <input value={user?.email||""} disabled style={{...S.inp,background:T.bg,color:T.fgMuted,cursor:"default"}}/>
              </div>
              {editMode&&(
                <div style={{display:"flex",gap:10}}>
                  <button onClick={saveProfile} disabled={saving} style={{...btn(saving?T.fgDim:T.primary),fontSize:13}}>
                    {saving?<RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/>:<Save size={14}/>}
                    {saving?"Saving...":"Save Profile"}
                  </button>
                  <button onClick={()=>setEditMode(false)} style={{...btn("#fff",T.fg,T.border),fontSize:13}}>Cancel</button>
                </div>
              )}
            </div>
          </div>

          {/* Sessions */}
          {sessions.length>0&&(
            <div style={S.card}>
              <div style={S.ch("#0369a1")}><Globe size={15} color="#0369a1"/><span style={{fontWeight:700,fontSize:13}}>My Sessions</span></div>
              <div style={{padding:"0 0 8px"}}>
                {sessions.map((s:any,i:number)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",borderBottom:`1px solid ${T.border}18`}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:s.is_active?"#22c55e":T.fgDim,flexShrink:0}}/>
                    <div style={{flex:1}}>
                      <div style={{fontFamily:"monospace",fontSize:11,fontWeight:600}}>{s.ip_address||"unknown"}</div>
                      <div style={{fontSize:10,color:T.fgMuted}}>Started: {s.started_at?new Date(s.started_at).toLocaleString("en-KE"):"-"}</div>
                    </div>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:99,fontWeight:700,color:s.is_active?"#22c55e":T.fgDim,background:s.is_active?"#dcfce7":T.bg}}>{s.is_active?"Active":"Ended"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Log */}
          <div style={S.card}>
            <div style={S.ch("#374151")}><Activity size={15} color="#374151"/><span style={{fontWeight:700,fontSize:13}}>Recent Activity</span></div>
            <div style={{padding:"0 0 8px"}}>
              {activityLog.length===0?<div style={{padding:20,textAlign:"center"as const,color:T.fgDim,fontSize:12}}>No recent activity</div>
              :activityLog.map((l:any,i:number)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 20px",borderBottom:`1px solid ${T.border}18`}}>
                  <div style={{width:32,height:32,borderRadius:8,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Activity size={14} color={T.primary}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.fg}}>{l.description||l.action}</div>
                    <div style={{fontSize:10,color:T.fgMuted}}>{l.entity_type||l.module} - {l.created_at?new Date(l.created_at).toLocaleString("en-KE"):"-"}</div>
                  </div>
                  <span style={{fontSize:9,padding:"2px 6px",borderRadius:4,background:T.bg,color:T.fgMuted,fontWeight:600}}>{l.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
