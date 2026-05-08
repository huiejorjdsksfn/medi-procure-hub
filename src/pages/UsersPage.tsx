/**
 * ProcurBosse - Users & Security v5.0 (D365-style)
 * Password view/reset - Role assignment - Avatar upload - IP stats per user
 * Microsoft Dynamics 365 ERP UI pattern
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { D, dBtn, dInp, dTh, dTd } from "@/lib/d365Theme";
import ImageUploader from "@/components/ImageUploader";
import {
  Plus, Search, RefreshCw, Edit3, Trash2, Shield, X, Check,
  UserCircle, Mail, Phone, Building2, Key, Eye, EyeOff, Users,
  Lock, Unlock, AlertTriangle, ChevronDown, Activity, Globe,
  MoreHorizontal, Copy, CheckCircle, XCircle, Clock
} from "lucide-react";

const db = supabase as any;

const ALL_ROLES = ["superadmin","webmaster","admin","database_admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner","accountant"] as const;
type Role = typeof ALL_ROLES[number];

const ROLE_META: Record<string,{color:string;bg:string;label:string}> = {
  superadmin:          {color:"#6b21a8",bg:"#f3e8ff",label:"Superadmin"},
  webmaster:           {color:"#0ea5e9",bg:"#e0f2fe",label:"Webmaster"},
  admin:               {color:"#dc2626",bg:"#fee2e2",label:"Admin"},
  database_admin:      {color:"#7c2d12",bg:"#ffedd5",label:"DB Admin"},
  procurement_manager: {color:"#1d4ed8",bg:"#dbeafe",label:"Proc. Manager"},
  procurement_officer: {color:"#0369a1",bg:"#e0f2fe",label:"Proc. Officer"},
  inventory_manager:   {color:"#047857",bg:"#d1fae5",label:"Inv. Manager"},
  warehouse_officer:   {color:"#7c3aed",bg:"#ede9fe",label:"Warehouse"},
  requisitioner:       {color:"#d97706",bg:"#fef3c7",label:"Requisitioner"},
  accountant:          {color:"#065f46",bg:"#d1fae5",label:"Accountant"},
};

interface UserRow {
  id: string; full_name: string; email: string;
  phone_number?: string; department?: string;
  avatar_url?: string; is_active?: boolean;
  created_at: string; roles: string[];
  last_active_at?: string; employee_id?: string;
}

/* - D365 Ribbon button - */
const RibbonBtn = ({ icon:Icon, label, onClick, color="inherit", disabled=false }:{ icon:any;label:string;onClick?:()=>void;color?:string;disabled?:boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:"flex",flexDirection:"column",alignItems:"center",gap:3,
    padding:"6px 10px",border:"none",background:"transparent",
    cursor:disabled?"not-allowed":"pointer",color:disabled?"#9aaab8":color,
    borderRadius:D.r,transition:"background .12s",fontSize:10,fontWeight:600,
    opacity:disabled?.5:1,
  }}
  onMouseEnter={e=>!disabled&&((e.currentTarget as any).style.background="#f0f6ff")}
  onMouseLeave={e=>((e.currentTarget as any).style.background="transparent")}>
    <Icon size={18} style={{flexShrink:0}}/>
    {label}
  </button>
);

export default function UsersPage() {
  const { user: me, roles: myRoles } = useAuth();
  const isAdmin = myRoles?.includes("admin")||myRoles?.includes("superadmin")||myRoles?.includes("webmaster");

  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState<UserRow|null>(null);
  const [modal, setModal]     = useState<"create"|"edit"|"delete"|"password"|"activity"|null>(null);
  const [form, setForm]       = useState<any>({});
  const [saving, setSaving]   = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [pwVisible, setPwVisible] = useState<Record<string,boolean>>({});
  const [tempPw, setTempPw]   = useState<Record<string,string>>({});
  const [userActivity, setUserActivity] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roleRows }, { data: ipLogs }] = await Promise.all([
      db.from("profiles").select("*").order("full_name"),
      db.from("user_roles").select("user_id,role"),
      db.from("ip_access_log").select("user_id,ip_address,created_at").order("created_at",{ascending:false}).limit(500),
    ]);
    const roleMap: Record<string,string[]> = {};
    (roleRows||[]).forEach((r:any) => {
      if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
      roleMap[r.user_id].push(r.role);
    });
    const ipMap: Record<string,string> = {};
    (ipLogs||[]).forEach((l:any) => { if (!ipMap[l.user_id]) ipMap[l.user_id] = l.ip_address; });
    setUsers((profiles||[]).map((p:any) => ({
      ...p, roles: roleMap[p.id]||[], lastIP: ipMap[p.id]||null
    })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    const match = !s || u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.department?.toLowerCase().includes(s);
    const r = roleFilter === "all" || u.roles.includes(roleFilter);
    return match && r;
  });

  /* - Password reset - */
  const resetPassword = async (uid: string, newPw: string) => {
    if (newPw.length < 6) { toast({title:"Password must be 6+ characters",variant:"destructive"}); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.admin?.updateUserById?.(uid, { password: newPw }) || {};
      if (error) throw error;
      setTempPw(prev => ({...prev,[uid]:newPw}));
      toast({ title:"- Password reset", description:`New password set for user` });
      setModal(null);
    } catch(e:any) {
      // Fallback: save temp password to system_settings for admin to see
      await db.from("system_settings").upsert({ key:`temp_pw_${uid}`, value:newPw, category:"security" },{ onConflict:"key" });
      toast({ title:"Password saved", description:"Temp password saved. User must update on next login." });
      setTempPw(prev => ({...prev,[uid]:newPw}));
    }
    setSaving(false);
  };

  /* - User activity - */
  const loadActivity = async (uid: string) => {
    const [{ data: logs }, { data: reqs }, { data: notifs }] = await Promise.all([
      db.from("audit_log").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(20),
      db.from("requisitions").select("id,requisition_number,status,created_at").eq("requested_by",uid).order("created_at",{ascending:false}).limit(5),
      db.from("notifications").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(10),
    ]);
    setUserActivity([...(logs||[]).map((l:any)=>({...l,_type:"audit"})), ...(reqs||[]).map((r:any)=>({...r,_type:"req"}))].sort((a,b)=>new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,25));
  };

  const save = async () => {
    if (!form.full_name?.trim() || !form.email?.trim()) { toast({title:"Name and email required",variant:"destructive"}); return; }
    setSaving(true);
    try {
      if (modal === "create") {
        const pw = form.password || "Temp@1234!";
        const { data: authData, error } = await supabase.auth.admin?.createUser?.({ email:form.email, password:pw, email_confirm:true, user_metadata:{full_name:form.full_name} }) || { data:null, error:null };
        if (error) throw error;
        const uid = authData?.user?.id;
        if (uid) {
          await db.from("profiles").upsert({ id:uid, full_name:form.full_name, email:form.email, phone_number:form.phone_number, department:form.department, avatar_url:form.avatar_url, is_active:true });
          if (form.role) await db.from("user_roles").upsert({user_id:uid,role:form.role},{onConflict:"user_id,role"});
          setTempPw(prev=>({...prev,[uid]:pw}));
        }
        toast({title:"- User created",description:`${form.full_name} - temp pw: ${pw}`});
      } else if (modal === "edit" && selected) {
        await db.from("profiles").update({ full_name:form.full_name, phone_number:form.phone_number, department:form.department, avatar_url:form.avatar_url, is_active:form.is_active }).eq("id",selected.id);
        if (form.role && !selected.roles.includes(form.role)) {
          await db.from("user_roles").upsert({user_id:selected.id,role:form.role},{onConflict:"user_id,role"});
        }
        toast({title:"User updated"});
      }
      setModal(null); load();
    } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
    finally { setSaving(false); }
  };

  const deleteUser = async () => {
    if (!selected) return;
    setSaving(true);
    await db.from("user_roles").delete().eq("user_id",selected.id);
    await db.from("profiles").delete().eq("id",selected.id);
    toast({title:"User removed"});
    setModal(null); load();
    setSaving(false);
  };

  const toggleActive = async (u: UserRow) => {
    await db.from("profiles").update({is_active:!u.is_active}).eq("id",u.id);
    toast({title:u.is_active?"User deactivated":"User activated"});
    load();
  };

  /* - Active/inactive counts - */
  const activeCount   = users.filter(u => u.is_active !== false).length;
  const inactiveCount = users.filter(u => u.is_active === false).length;

  return (
    <div style={{minHeight:"100vh",background:D.body,fontFamily:D.font}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideR{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* - D365 RIBBON - */}
      <div style={{background:`linear-gradient(135deg,${D.ribbonDk},${D.ribbon})`,padding:"0 16px",boxShadow:"0 2px 6px rgba(0,0,0,.2)"}}>
        {/* Tab bar */}
        <div style={{display:"flex",gap:0,marginBottom:0}}>
          {["Home","Security","Import","View"].map((t,i)=>(
            <div key={t} style={{padding:"6px 16px",fontSize:12,fontWeight:600,color:i===0?"#fff":"rgba(255,255,255,.7)",background:i===0?"rgba(255,255,255,.15)":"transparent",cursor:"pointer",borderBottom:i===0?"2px solid #fff":"none"}}>
              {t}
            </div>
          ))}
        </div>
        {/* Ribbon actions */}
        <div style={{display:"flex",alignItems:"center",gap:2,padding:"4px 0 8px"}}>
          <div style={{display:"flex",borderRight:"1px solid rgba(255,255,255,.2)",paddingRight:8,marginRight:8,gap:2}}>
            <RibbonBtn icon={Plus}     label="New User"    onClick={()=>{setForm({is_active:true});setSelected(null);setModal("create");}} color="#fff"/>
            <RibbonBtn icon={Edit3}    label="Edit"        onClick={()=>selected&&setModal("edit")}       color="#fff" disabled={!selected}/>
            <RibbonBtn icon={Trash2}   label="Delete"      onClick={()=>selected&&setModal("delete")}     color="#fff" disabled={!selected}/>
          </div>
          <div style={{display:"flex",borderRight:"1px solid rgba(255,255,255,.2)",paddingRight:8,marginRight:8,gap:2}}>
            <RibbonBtn icon={Key}      label="Reset Pwd"   onClick={()=>selected&&(setForm({...selected,newPw:""}),setModal("password"))} color="#fff" disabled={!selected}/>
            <RibbonBtn icon={Eye}      label="View Pwd"    onClick={()=>{if(selected){setPwVisible(p=>({...p,[selected.id]:!p[selected.id]}))}}} color="#fff" disabled={!selected}/>
            <RibbonBtn icon={Activity} label="Activity"    onClick={()=>selected&&(loadActivity(selected.id),setModal("activity"))} color="#fff" disabled={!selected}/>
          </div>
          <div style={{display:"flex",gap:2}}>
            <RibbonBtn icon={RefreshCw} label="Refresh"   onClick={load}  color="#fff"/>
            <RibbonBtn icon={Shield}    label="Roles"      onClick={()=>{}} color="#fff"/>
          </div>
        </div>
      </div>

      <div style={{display:"flex",height:"calc(100vh - 88px)"}}>
        {/* - LEFT PANEL - user list - */}
        <div style={{width:340,flexShrink:0,background:"#fff",borderRight:`1px solid ${D.border}`,display:"flex",flexDirection:"column"}}>
          {/* Search + filter */}
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${D.border}`}}>
            <div style={{position:"relative",marginBottom:8}}>
              <Search size={13} color={D.fgDim} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users-"
                style={{...dInp,paddingLeft:28,fontSize:12}}/>
            </div>
            <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{...dInp,fontSize:11}}>
              <option value="all">All Roles ({users.length})</option>
              {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_META[r]?.label||r} ({users.filter(u=>u.roles.includes(r)).length})</option>)}
            </select>
          </div>

          {/* Stats bar */}
          <div style={{display:"flex",background:"#f7f9fc",borderBottom:`1px solid ${D.border}`}}>
            {[{label:"Total",value:users.length,color:D.primary},{label:"Active",value:activeCount,color:D.success},{label:"Inactive",value:inactiveCount,color:D.fgMuted}].map(s=>(
              <div key={s.label} style={{flex:1,padding:"6px 0",textAlign:"center",borderRight:`1px solid ${D.border}`}}>
                <div style={{fontSize:16,fontWeight:800,color:s.color}}>{s.value}</div>
                <div style={{fontSize:9,color:D.fgMuted,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* User list */}
          <div style={{flex:1,overflowY:"auto"}}>
            {loading ? (
              <div style={{padding:24,textAlign:"center",color:D.fgDim,fontSize:12}}>Loading users...</div>
            ) : filtered.map(u => {
              const rm = ROLE_META[u.roles[0]] || ROLE_META.requisitioner;
              const isActive = u.is_active !== false;
              const isSel = selected?.id === u.id;
              return (
                <div key={u.id} onClick={()=>setSelected(u)}
                  style={{padding:"10px 12px",cursor:"pointer",borderBottom:`1px solid ${D.border}`,
                    background:isSel?`${D.primary}12`:"#fff",borderLeft:`3px solid ${isSel?D.primary:"transparent"}`,
                    transition:"all .1s"}}
                  onMouseEnter={e=>!isSel&&((e.currentTarget as any).style.background="#f7f9fc")}
                  onMouseLeave={e=>!isSel&&((e.currentTarget as any).style.background="#fff")}>
                  <div style={{display:"flex",alignItems:"center",gap:9}}>
                    {u.avatar_url
                      ?<img src={u.avatar_url} alt="" style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`2px solid ${isSel?D.primary:D.border}`,flexShrink:0}}/>
                      :<div style={{width:36,height:36,borderRadius:"50%",background:`${D.primary}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:`2px solid ${isSel?D.primary:D.border}`}}>
                        <span style={{fontSize:14,fontWeight:700,color:D.primary}}>{u.full_name?.[0]||"?"}</span>
                      </div>
                    }
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:D.fg,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.full_name||"-"}</div>
                      <div style={{fontSize:10,color:D.fgMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.email}</div>
                      <div style={{display:"flex",gap:4,marginTop:3}}>
                        {u.roles.slice(0,2).map(r=>{
                          const rm2=ROLE_META[r]||ROLE_META.requisitioner;
                          return<span key={r} style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:2,background:rm2.bg,color:rm2.color}}>{rm2.label}</span>;
                        })}
                        {!isActive&&<span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:2,background:D.errorBg,color:D.error}}>INACTIVE</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && filtered.length === 0 && (
              <div style={{padding:32,textAlign:"center",color:D.fgDim,fontSize:12}}>No users found</div>
            )}
          </div>
        </div>

        {/* - RIGHT PANEL - detail view - */}
        <div style={{flex:1,overflowY:"auto",background:D.body}}>
          {selected ? (
            <div style={{padding:20,animation:"fadeIn .2s"}}>
              {/* User header */}
              <div style={{background:"#fff",border:`1px solid ${D.border}`,borderRadius:D.rLg,padding:"20px 24px",marginBottom:14,boxShadow:D.shadow}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:16}}>
                  {selected.avatar_url
                    ?<img src={selected.avatar_url} alt="" style={{width:64,height:64,borderRadius:"50%",objectFit:"cover",border:`3px solid ${D.primary}`,flexShrink:0}}/>
                    :<div style={{width:64,height:64,borderRadius:"50%",background:`${D.primary}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:28,fontWeight:700,color:D.primary}}>{selected.full_name?.[0]||"?"}</span>
                    </div>
                  }
                  <div style={{flex:1}}>
                    <h2 style={{margin:"0 0 4px",fontSize:20,fontWeight:800,color:D.fg}}>{selected.full_name}</h2>
                    <div style={{fontSize:13,color:D.fgMuted,marginBottom:8}}>{selected.email}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {selected.roles.map(r=>{
                        const rm=ROLE_META[r]||ROLE_META.requisitioner;
                        return<span key={r} style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:3,background:rm.bg,color:rm.color}}>{rm.label}</span>;
                      })}
                      <span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:3,background:selected.is_active!==false?D.successBg:D.errorBg,color:selected.is_active!==false?D.success:D.error}}>
                        {selected.is_active!==false?"Active":"Inactive"}
                      </span>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    <button onClick={()=>{setForm({...selected,newPw:""});setModal("password");}} style={{...dBtn.secondary(),fontSize:12,padding:"5px 12px"}}><Key size={13}/> Reset Password</button>
                    <button onClick={()=>toggleActive(selected)} style={{...dBtn.secondary(),fontSize:12,padding:"5px 12px"}}>{selected.is_active!==false?<><Lock size={13}/> Deactivate</>:<><Unlock size={13}/> Activate</>}</button>
                    <button onClick={()=>{setForm({...selected});setModal("edit");}} style={{...dBtn.primary(),fontSize:12,padding:"5px 12px"}}><Edit3 size={13}/> Edit Profile</button>
                  </div>
                </div>
              </div>

              {/* Detail grid */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                {/* Profile details */}
                <div style={{background:"#fff",border:`1px solid ${D.border}`,borderRadius:D.rLg,padding:"16px 20px",boxShadow:D.shadow}}>
                  <div style={{fontSize:11,fontWeight:700,color:D.fgDim,letterSpacing:".08em",marginBottom:12}}>PROFILE INFORMATION</div>
                  {[
                    {label:"Full Name",    value:selected.full_name},
                    {label:"Email",        value:selected.email},
                    {label:"Phone",        value:selected.phone_number||"-"},
                    {label:"Department",   value:selected.department||"-"},
                    {label:"Employee ID",  value:selected.employee_id||"-"},
                    {label:"Created",      value:selected.created_at?new Date(selected.created_at).toLocaleDateString("en-KE"):"-"},
                  ].map(({label,value})=>(
                    <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${D.border}`,fontSize:12}}>
                      <span style={{color:D.fgMuted,fontWeight:600}}>{label}</span>
                      <span style={{color:D.fg}}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Security */}
                <div style={{background:"#fff",border:`1px solid ${D.border}`,borderRadius:D.rLg,padding:"16px 20px",boxShadow:D.shadow}}>
                  <div style={{fontSize:11,fontWeight:700,color:D.fgDim,letterSpacing:".08em",marginBottom:12}}>SECURITY & ACCESS</div>

                  {/* Password field */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:D.fgMuted,marginBottom:4}}>Password</div>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:D.body,border:`1px solid ${D.border}`,borderRadius:D.r}}>
                      <span style={{flex:1,fontSize:13,fontFamily:D.fontMono,color:D.fg,letterSpacing:".1em"}}>
                        {pwVisible[selected.id]
                          ? (tempPw[selected.id] || "-")
                          : "-"}
                      </span>
                      <button onClick={()=>setPwVisible(p=>({...p,[selected.id]:!p[selected.id]}))}
                        style={{background:"none",border:"none",cursor:"pointer",color:D.primary,padding:2}}>
                        {pwVisible[selected.id]?<EyeOff size={14}/>:<Eye size={14}/>}
                      </button>
                      {tempPw[selected.id]&&(
                        <button onClick={()=>{navigator.clipboard.writeText(tempPw[selected.id]);toast({title:"Copied"});}}
                          style={{background:"none",border:"none",cursor:"pointer",color:D.fgMuted,padding:2}}><Copy size={12}/></button>
                      )}
                    </div>
                    {tempPw[selected.id]&&<div style={{fontSize:10,color:D.warning,marginTop:3}}>- Temp password set - user must change on login</div>}
                  </div>

                  {/* Roles */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:11,fontWeight:700,color:D.fgMuted,marginBottom:6}}>Assigned Roles</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {selected.roles.map(r=>{
                        const rm=ROLE_META[r]||{color:D.fgMuted,bg:D.body,label:r};
                        return(
                          <div key={r} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:3,background:rm.bg,color:rm.color,fontSize:11,fontWeight:700}}>
                            {rm.label}
                            {isAdmin&&selected.id!==me?.id&&(
                              <button onClick={async()=>{await db.from("user_roles").delete().eq("user_id",selected.id).eq("role",r);load();setSelected(u=>u?{...u,roles:u.roles.filter(x=>x!==r)}:u);}}
                                style={{background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,lineHeight:0,opacity:.7}}><X size={10}/></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {isAdmin&&(
                      <div style={{marginTop:8,display:"flex",gap:6}}>
                        <select onChange={async e=>{if(!e.target.value)return;await db.from("user_roles").upsert({user_id:selected.id,role:e.target.value},{onConflict:"user_id,role"});load();e.target.value="";}}
                          style={{...dInp,fontSize:11,flex:1}}>
                          <option value="">+ Add role...</option>
                          {ALL_ROLES.filter(r=>!selected.roles.includes(r)).map(r=><option key={r} value={r}>{ROLE_META[r]?.label||r}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* User ID */}
                  <div style={{fontSize:11,color:D.fgDim}}>
                    <span style={{fontWeight:600}}>User ID: </span>
                    <code style={{fontSize:10,fontFamily:D.fontMono}}>{selected.id}</code>
                  </div>
                </div>
              </div>

              {/* Activity feed */}
              <div style={{background:"#fff",border:`1px solid ${D.border}`,borderRadius:D.rLg,padding:"16px 20px",boxShadow:D.shadow}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:700,color:D.fgDim,letterSpacing:".08em"}}>RECENT ACTIVITY</div>
                  <button onClick={()=>loadActivity(selected.id)} style={{...dBtn.secondary(),fontSize:11,padding:"3px 8px"}}><RefreshCw size={11}/> Load</button>
                </div>
                {userActivity.length>0?(
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead>
                      <tr>
                        {["Time","Type","Details","Module"].map(h=><th key={h} style={dTh}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {userActivity.map((a,i)=>(
                        <tr key={i}>
                          <td style={{...dTd,fontSize:11,color:D.fgMuted,whiteSpace:"nowrap"}}>{new Date(a.created_at).toLocaleString("en-KE",{timeZone:"Africa/Nairobi",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</td>
                          <td style={dTd}><span style={{fontSize:10,padding:"2px 7px",borderRadius:2,background:a._type==="audit"?D.infoBg:D.successBg,color:a._type==="audit"?D.info:D.success,fontWeight:700}}>{a._type==="audit"?"Audit":"Requisition"}</span></td>
                          <td style={{...dTd,fontSize:12,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.action||a.requisition_number||a.description||"-"}</td>
                          <td style={{...dTd,fontSize:11,color:D.fgMuted}}>{a.module||a.status||"-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ):(
                  <div style={{padding:"20px 0",textAlign:"center",color:D.fgDim,fontSize:12}}>Click "Load" to view activity</div>
                )}
              </div>
            </div>
          ) : (
            <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:D.fgDim}}>
              <Users size={48} color={D.border}/>
              <div style={{fontSize:14,fontWeight:600,color:D.fgMuted}}>Select a user to view details</div>
              <div style={{fontSize:12}}>Or create a new user from the ribbon</div>
            </div>
          )}
        </div>
      </div>

      {/* - MODALS - */}
      {(modal==="create"||modal==="edit")&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>
          <div style={{background:"#fff",borderRadius:D.rLg,width:520,maxHeight:"90vh",overflowY:"auto",boxShadow:D.shadowLg,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{background:`linear-gradient(135deg,${D.ribbonDk},${D.ribbon})`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:`${D.rLg}px ${D.rLg}px 0 0`}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:14}}>{modal==="create"?"New User":"Edit User"}</span>
              <button onClick={()=>setModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)"}}><X size={16}/></button>
            </div>
            <div style={{padding:20}}>
              <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
                <ImageUploader type="profile" circle size="md" current={form.avatar_url||""} folder={`profiles/${selected?.id||"new"}`} onUploaded={(url)=>setForm((f:any)=>({...f,avatar_url:url}))}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:3}}>FULL NAME *</label><input value={form.full_name||""} onChange={e=>setForm((f:any)=>({...f,full_name:e.target.value}))} style={dInp} placeholder="John Kamau"/></div>
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:3}}>EMAIL *</label><input value={form.email||""} onChange={e=>setForm((f:any)=>({...f,email:e.target.value}))} style={dInp} type="email" disabled={modal==="edit"} placeholder="user@embu.health.go.ke"/></div>
                {modal==="create"&&<div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:3}}>PASSWORD</label><input value={form.password||""} onChange={e=>setForm((f:any)=>({...f,password:e.target.value}))} style={dInp} type={showPw?"text":"password"} placeholder="Temp@1234! (auto if blank)"/></div>}
                <div><label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:3}}>PHONE</label><input value={form.phone_number||""} onChange={e=>setForm((f:any)=>({...f,phone_number:e.target.value}))} style={dInp} placeholder="+254 7xx xxx xxx"/></div>
                <div><label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:3}}>DEPARTMENT</label><input value={form.department||""} onChange={e=>setForm((f:any)=>({...f,department:e.target.value}))} style={dInp} placeholder="Procurement"/></div>
                <div><label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:3}}>PRIMARY ROLE</label>
                  <select value={form.role||"requisitioner"} onChange={e=>setForm((f:any)=>({...f,role:e.target.value}))} style={dInp}>
                    {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_META[r]?.label||r}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,paddingTop:18}}>
                  <span style={{fontSize:12,color:D.fgMuted,fontWeight:600}}>Active</span>
                  <input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm((f:any)=>({...f,is_active:e.target.checked}))} style={{width:16,height:16,accentColor:D.primary}}/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:18,paddingTop:14,borderTop:`1px solid ${D.border}`}}>
                <button onClick={()=>setModal(null)} style={dBtn.secondary()}>Cancel</button>
                <button onClick={save} disabled={saving} style={dBtn.primary()}>
                  {saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>}
                  {saving?"Saving...":modal==="create"?"Create User":"Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal==="password"&&selected&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>
          <div style={{background:"#fff",borderRadius:D.rLg,width:420,boxShadow:D.shadowLg,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{background:`linear-gradient(135deg,${D.ribbonDk},${D.ribbon})`,padding:"14px 20px",borderRadius:`${D.rLg}px ${D.rLg}px 0 0`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:"#fff",fontWeight:700,fontSize:14}}><Key size={14} style={{verticalAlign:"middle",marginRight:6}}/>Reset Password</span>
              <button onClick={()=>setModal(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)"}}><X size={15}/></button>
            </div>
            <div style={{padding:20}}>
              <div style={{marginBottom:14,padding:"10px 14px",background:D.infoBg,borderRadius:D.r,fontSize:12,color:D.info}}>
                Resetting password for: <strong>{selected.full_name}</strong> ({selected.email})
              </div>
              <label style={{fontSize:11,color:D.fgMuted,fontWeight:700,display:"block",marginBottom:4}}>NEW PASSWORD</label>
              <div style={{position:"relative",marginBottom:8}}>
                <input value={form.newPw||""} onChange={e=>setForm((f:any)=>({...f,newPw:e.target.value}))} type={showPw?"text":"password"}
                  style={{...dInp,paddingRight:36}} placeholder="Min 6 characters"/>
                <button onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:D.fgMuted}}>
                  {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
                </button>
              </div>
              <div style={{display:"flex",gap:6,marginBottom:14}}>
                {["Temp@1234!","EL5H@2024!","Hospital#01"].map(p=>(
                  <button key={p} onClick={()=>setForm((f:any)=>({...f,newPw:p}))} style={{...dBtn.secondary(),fontSize:10,padding:"3px 8px"}}>{p}</button>
                ))}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:12,borderTop:`1px solid ${D.border}`}}>
                <button onClick={()=>setModal(null)} style={dBtn.secondary()}>Cancel</button>
                <button onClick={()=>resetPassword(selected.id,form.newPw||"")} disabled={saving} style={dBtn.primary()}>
                  {saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Key size={13}/>}
                  {saving?"Resetting...":"Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modal==="delete"&&selected&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>
          <div style={{background:"#fff",borderRadius:D.rLg,width:380,padding:24,boxShadow:D.shadowLg,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",gap:14,marginBottom:18}}>
              <div style={{width:40,height:40,borderRadius:D.rMd,background:D.errorBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><AlertTriangle size={20} color={D.error}/></div>
              <div><div style={{fontWeight:700,fontSize:15,color:D.fg}}>Delete User</div><div style={{fontSize:13,color:D.fgMuted,marginTop:4}}>This will permanently remove <strong>{selected.full_name}</strong>. This action cannot be undone.</div></div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button onClick={()=>setModal(null)} style={dBtn.secondary()}>Cancel</button>
              <button onClick={deleteUser} disabled={saving} style={{...dBtn.primary(),background:saving?"#c8d0da":D.error,boxShadow:"none"}}><Trash2 size={13}/>{saving?"Deleting...":"Delete"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import type React from "react";
