import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/notify";
import {
  Shield, Users, Search, Plus, Download, Trash2,
  UserCheck, UserX, RefreshCw, X, Eye, EyeOff,
  Edit3, Save, Key, Mail, Building2, Clock, CheckCircle
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import * as XLSX from "xlsx";

const ROLES = [
  {value:"admin",               label:"Administrator",        desc:"Full system access — all modules",                    color:"#dc2626", bg:"#fee2e2"},
  {value:"procurement_manager", label:"Procurement Manager",  desc:"Approve requisitions, POs, contracts",               color:"#1F6090", bg:"#e0f2fe"},
  {value:"procurement_officer", label:"Procurement Officer",  desc:"Create POs, manage suppliers & tenders",             color:"#C45911", bg:"#fff7ed"},
  {value:"inventory_manager",   label:"Inventory Manager",    desc:"Manage items, categories, stock movements",          color:"#059669", bg:"#f0fdf4"},
  {value:"warehouse_officer",   label:"Warehouse Officer",    desc:"Receive goods, update stock",                        color:"#374151", bg:"#f3f4f6"},
  {value:"requisitioner",       label:"Requisitioner",        desc:"Submit purchase requests",                           color:"#6b7280", bg:"#f9fafb"},
];

function RoleBadge({role}:{role:string}) {
  const r = ROLES.find(x=>x.value===role)||{color:"#6b7280",bg:"#f9fafb",label:role};
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:4,background:r.bg,color:r.color,textTransform:"capitalize" as const}}>{r.label||role}</span>;
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:12,width:"min(540px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)"}}>
        <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"12px 12px 0 0",display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14,fontWeight:700,color:"#fff",flex:1}}>{title}</span>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:6,padding:"4px 6px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>{children}</div>
      </div>
    </div>
  );
}

function UsersInner() {
  const {user, profile, roles:myRoles} = useAuth();
  const isAdmin = myRoles.includes("admin");

  const [users,       setUsers]       = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState("all");
  const [statusFilter,setStatusFilter]= useState("all");
  const [editUser,    setEditUser]    = useState<any|null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [viewUser,    setViewUser]    = useState<any|null>(null);
  const [saving,      setSaving]      = useState(false);
  const [pwVis,       setPwVis]       = useState(false);

  const [newU, setNewU] = useState({email:"",password:"",full_name:"",department:"",role:"requisitioner",phone:""});
  const [editRole, setEditRole] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editActive,setEditActive]=useState(true);
  const [editPhone, setEditPhone] = useState("");

  const load = useCallback(async()=>{
    setLoading(true);
    const {data:prof} = await(supabase as any).from("profiles").select("*").order("created_at",{ascending:false});
    const {data:roleRows} = await(supabase as any).from("user_roles").select("user_id,role");
    const roleMap:Record<string,string[]> = {};
    (roleRows||[]).forEach((r:any)=>{ if(!roleMap[r.user_id]) roleMap[r.user_id]=[]; roleMap[r.user_id].push(r.role); });
    setUsers((prof||[]).map((p:any)=>({...p,roles:roleMap[p.id]||[]})));
    setLoading(false);
  },[]);

  useEffect(()=>{ if(isAdmin) load(); },[load,isAdmin]);

  const createUser = async()=>{
    if(!newU.email||!newU.password||!newU.full_name){toast({title:"Fill all required fields",variant:"destructive"});return;}
    setSaving(true);
    try {
      // Create auth user
      const{data,error}=await(supabase as any).auth.admin?.createUser({email:newU.email,password:newU.password,email_confirm:true,user_metadata:{full_name:newU.full_name}});
      let userId = data?.user?.id;
      if(error||!userId){
        // Fallback: sign up
        const{data:sd,error:se}=await(supabase as any).auth.signUp({email:newU.email,password:newU.password,options:{data:{full_name:newU.full_name}}});
        if(se) throw se;
        userId=sd?.user?.id;
      }
      if(!userId) throw new Error("Could not create user");
      // Upsert profile
      await(supabase as any).from("profiles").upsert({id:userId,full_name:newU.full_name,email:newU.email,department:newU.department,phone:newU.phone,is_active:true});
      // Set role
      await(supabase as any).from("user_roles").upsert({user_id:userId,role:newU.role});
      // Notify new user
      await sendNotification({userId,title:"Welcome to EL5 MediProcure",message:`Your account has been created with role: ${newU.role}. Welcome aboard!`,type:"success",module:"System",actionUrl:"/dashboard"});
      logAudit(user?.id,profile?.full_name,"create_user","profiles",userId,{email:newU.email,role:newU.role});
      toast({title:"User created ✓",description:newU.email});
      setCreateModal(false);
      setNewU({email:"",password:"",full_name:"",department:"",role:"requisitioner",phone:""});
      load();
    } catch(e:any){
      toast({title:"Create failed",description:e.message,variant:"destructive"});
    }
    setSaving(false);
  };

  const saveEdit = async()=>{
    if(!editUser) return;
    setSaving(true);
    await(supabase as any).from("profiles").update({department:editDept,is_active:editActive,phone:editPhone}).eq("id",editUser.id);
    const{data:ex}=await(supabase as any).from("user_roles").select("id").eq("user_id",editUser.id).maybeSingle();
    if(ex?.id) await(supabase as any).from("user_roles").update({role:editRole}).eq("id",ex.id);
    else await(supabase as any).from("user_roles").insert({user_id:editUser.id,role:editRole});
    // Notify user of role change
    if(editRole!==editUser.roles?.[0]) {
      await sendNotification({userId:editUser.id,title:"Your role has been updated",message:`Your role has been changed to: ${editRole}. Please log in again if needed.`,type:"info",module:"System",actionUrl:"/profile"});
    }
    logAudit(user?.id,profile?.full_name,"update_user","profiles",editUser.id,{role:editRole,active:editActive});
    toast({title:"User updated ✓"});
    setEditUser(null); load(); setSaving(false);
  };

  const toggleActive = async(u:any)=>{
    await(supabase as any).from("profiles").update({is_active:!u.is_active}).eq("id",u.id);
    if(!u.is_active) await sendNotification({userId:u.id,title:"Account Activated",message:"Your account has been reactivated. You can now log in.",type:"success",module:"System"});
    toast({title:u.is_active?"User deactivated":"User activated ✓"});
    logAudit(user?.id,profile?.full_name,u.is_active?"deactivate_user":"activate_user","profiles",u.id,{});
    load();
  };

  const deleteUser = async(u:any)=>{
    if(!confirm(`Permanently delete ${u.full_name}?`)) return;
    await(supabase as any).from("user_roles").delete().eq("user_id",u.id);
    await(supabase as any).from("profiles").delete().eq("id",u.id);
    logAudit(user?.id,profile?.full_name,"delete_user","profiles",u.id,{email:u.email});
    toast({title:"User deleted"});
    load();
  };

  const exportXLSX = ()=>{
    const ws=XLSX.utils.json_to_sheet(users.map(u=>({Name:u.full_name,Email:u.email,Role:u.roles?.[0]||"—",Department:u.department||"—",Active:u.is_active!==false?"Yes":"No",Created:u.created_at?.slice(0,10)||"—"})));
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Users");
    XLSX.writeFile(wb,`users-${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported ✓"});
  };

  const filtered = users.filter(u=>{
    const txt=search.toLowerCase();
    const textOk=!search||[u.full_name,u.email,u.department].some(v=>String(v||"").toLowerCase().includes(txt));
    const roleOk=roleFilter==="all"||u.roles?.includes(roleFilter);
    const statusOk=statusFilter==="all"||(statusFilter==="active"&&u.is_active!==false)||(statusFilter==="inactive"&&u.is_active===false);
    return textOk&&roleOk&&statusOk;
  });

  if(!isAdmin) return <div style={{padding:32,textAlign:"center" as const,color:"#9ca3af",fontSize:14}}>Admin access required</div>;

  return (
    <div style={{minHeight:"calc(100vh - 82px)",background:"#f0f2f5",fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" as const}}>
        <Users style={{width:18,height:18,color:"#fff",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#fff"}}>User Management</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{users.length} users · {users.filter(u=>u.is_active!==false).length} active</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportXLSX} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>
            <Download style={{width:13,height:13}}/> Export
          </button>
          <button onClick={()=>setCreateModal(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"#C45911",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#fff"}}>
            <Plus style={{width:13,height:13}}/> New User
          </button>
          <button onClick={load} style={{padding:"8px 10px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13}}/>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",borderBottom:"1px solid #e5e7eb",padding:"10px 20px",display:"flex",gap:10,flexWrap:"wrap" as const,alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:220}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, email, department…"
            style={{width:"100%",paddingLeft:32,padding:"8px 12px 8px 32px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
        </div>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}
          style={{padding:"8px 12px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",background:"#f9fafb"}}>
          <option value="all">All Roles</option>
          {ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          style={{padding:"8px 12px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",background:"#f9fafb"}}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span style={{fontSize:12,color:"#9ca3af"}}>{filtered.length} of {users.length}</span>
      </div>

      {/* Table */}
      <div style={{background:"#fff",margin:16,borderRadius:10,border:"1px solid #e5e7eb",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                {["User","Email","Role","Department","Status","Created","Actions"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?[1,2,3,4].map(i=>(
                <tr key={i}>
                  {[1,2,3,4,5,6,7].map(j=>(
                    <td key={j} style={{padding:"11px 14px"}}><div style={{height:13,background:"#f3f4f6",borderRadius:4,width:j===7?80:j===3?70:120,animation:"pulse 1.5s infinite"}}/></td>
                  ))}
                </tr>
              )):filtered.map(u=>(
                <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                  <td style={{padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#1a3a6b,#0078d4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{(u.full_name||"?")[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>{u.full_name||"—"}</div>
                        {u.phone&&<div style={{fontSize:11,color:"#9ca3af"}}>{u.phone}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"10px 14px",color:"#6b7280",fontSize:12}}>{u.email}</td>
                  <td style={{padding:"10px 14px"}}><RoleBadge role={u.roles?.[0]||"—"}/></td>
                  <td style={{padding:"10px 14px",color:"#6b7280",fontSize:12}}>{u.department||"—"}</td>
                  <td style={{padding:"10px 14px"}}>
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:4,background:u.is_active!==false?"#dcfce7":"#fee2e2",color:u.is_active!==false?"#15803d":"#dc2626"}}>
                      {u.is_active!==false?"Active":"Inactive"}
                    </span>
                  </td>
                  <td style={{padding:"10px 14px",color:"#9ca3af",fontSize:11,whiteSpace:"nowrap" as const}}>{u.created_at?.slice(0,10)||"—"}</td>
                  <td style={{padding:"10px 14px"}}>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap" as const}}>
                      <button onClick={()=>{setViewUser(u);}} title="View" style={{padding:"4px 8px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",lineHeight:0,color:"#1d4ed8"}}>
                        <Eye style={{width:12,height:12}}/>
                      </button>
                      <button onClick={()=>{setEditUser(u);setEditRole(u.roles?.[0]||"requisitioner");setEditDept(u.department||"");setEditActive(u.is_active!==false);setEditPhone(u.phone||"");}} title="Edit"
                        style={{padding:"4px 8px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:5,cursor:"pointer",lineHeight:0,color:"#92400e"}}>
                        <Edit3 style={{width:12,height:12}}/>
                      </button>
                      <button onClick={()=>toggleActive(u)} title={u.is_active!==false?"Deactivate":"Activate"}
                        style={{padding:"4px 8px",background:u.is_active!==false?"#fee2e2":"#dcfce7",border:`1px solid ${u.is_active!==false?"#fecaca":"#bbf7d0"}`,borderRadius:5,cursor:"pointer",lineHeight:0,color:u.is_active!==false?"#dc2626":"#15803d"}}>
                        {u.is_active!==false?<UserX style={{width:12,height:12}}/>:<UserCheck style={{width:12,height:12}}/>}
                      </button>
                      {u.id!==user?.id&&<button onClick={()=>deleteUser(u)} title="Delete"
                        style={{padding:"4px 8px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer",lineHeight:0,color:"#dc2626"}}>
                        <Trash2 style={{width:12,height:12}}/>
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length===0&&!loading&&(
          <div style={{padding:"40px 20px",textAlign:"center" as const,color:"#9ca3af"}}>
            <Users style={{width:36,height:36,color:"#e5e7eb",margin:"0 auto 10px"}}/>
            <div style={{fontSize:14,fontWeight:600}}>No users found</div>
          </div>
        )}
      </div>

      {/* Role summary */}
      <div style={{margin:"0 16px 16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
        {ROLES.map(r=>{
          const cnt=users.filter(u=>u.roles?.includes(r.value)).length;
          return (
            <div key={r.value} style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,padding:"10px 14px",display:"flex",gap:10,alignItems:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
              <div style={{width:32,height:32,borderRadius:7,background:r.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Shield style={{width:14,height:14,color:r.color}}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:r.color,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{r.label}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{cnt} user{cnt!==1?"s":""}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CREATE MODAL ── */}
      {createModal&&(
        <Modal title="Create New User" onClose={()=>setCreateModal(false)}>
          <div style={{display:"flex",flexDirection:"column" as const,gap:12}}>
            {[{l:"Full Name *",k:"full_name"},{l:"Email Address *",k:"email",t:"email"},{l:"Password *",k:"password",t:"password"},{l:"Phone",k:"phone"},{l:"Department",k:"department"}].map(f=>(
              <div key={f.k}>
                <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                <div style={{position:"relative"}}>
                  <input type={f.k==="password"&&!pwVis?"password":(f.t||"text")} value={(newU as any)[f.k]||""} onChange={e=>setNewU(p=>({...p,[f.k]:e.target.value}))}
                    style={{width:"100%",padding:`9px 12px${f.k==="password"?" 9px 36px":""}`,fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                  {f.k==="password"&&<button type="button" onClick={()=>setPwVis(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0}}>
                    {pwVis?<EyeOff style={{width:14,height:14}}/>:<Eye style={{width:14,height:14}}/>}
                  </button>}
                </div>
              </div>
            ))}
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Role *</label>
              <select value={newU.role} onChange={e=>setNewU(p=>({...p,role:e.target.value}))} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                {ROLES.map(r=><option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
            <div style={{padding:"10px 14px",background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,fontSize:12,color:"#92400e"}}>
              ⚠ The user will receive a welcome notification. Ensure the email is valid.
            </div>
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={createUser} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,flex:1,justifyContent:"center",padding:"10px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Plus style={{width:13,height:13}}/>}
                {saving?"Creating…":"Create User"}
              </button>
              <button onClick={()=>setCreateModal(false)} style={{padding:"10px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#374151"}}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── EDIT MODAL ── */}
      {editUser&&(
        <Modal title={`Edit: ${editUser.full_name}`} onClose={()=>setEditUser(null)}>
          <div style={{display:"flex",flexDirection:"column" as const,gap:12}}>
            <div style={{padding:"10px 14px",background:"#f9fafb",borderRadius:8,display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#1a3a6b,#0078d4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:16,fontWeight:700,color:"#fff"}}>{(editUser.full_name||"?")[0].toUpperCase()}</span>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>{editUser.full_name}</div>
                <div style={{fontSize:12,color:"#9ca3af"}}>{editUser.email}</div>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Role</label>
              <select value={editRole} onChange={e=>setEditRole(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                {ROLES.map(r=><option key={r.value} value={r.value}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Department</label>
              <input value={editDept} onChange={e=>setEditDept(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Phone</label>
              <input value={editPhone} onChange={e=>setEditPhone(e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>Account Active</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>Inactive users cannot log in</div>
              </div>
              <button onClick={()=>setEditActive(v=>!v)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
                <div style={{width:44,height:24,borderRadius:12,background:editActive?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:2,transition:"all 0.2s"}}>
                  <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:editActive?"translateX(20px)":"translateX(0)"}}/>
                </div>
              </button>
            </div>
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={saveEdit} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,flex:1,justifyContent:"center",padding:"10px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>}
                Save Changes
              </button>
              <button onClick={()=>setEditUser(null)} style={{padding:"10px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#374151"}}>Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── VIEW MODAL ── */}
      {viewUser&&(
        <Modal title="User Profile" onClose={()=>setViewUser(null)}>
          <div style={{display:"flex",flexDirection:"column" as const,gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"linear-gradient(135deg,#1a3a6b,#0078d4)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <span style={{fontSize:22,fontWeight:700,color:"#fff"}}>{(viewUser.full_name||"?")[0].toUpperCase()}</span>
              </div>
              <div>
                <div style={{fontSize:17,fontWeight:800,color:"#111827"}}>{viewUser.full_name}</div>
                <div style={{fontSize:13,color:"#6b7280"}}>{viewUser.email}</div>
                <div style={{marginTop:5}}><RoleBadge role={viewUser.roles?.[0]||"—"}/></div>
              </div>
            </div>
            {[["Department",viewUser.department||"—"],["Phone",viewUser.phone||"—"],["Status",viewUser.is_active!==false?"Active":"Inactive"],["User ID",viewUser.id?.slice(0,16)+"…"],["Created",viewUser.created_at?.slice(0,10)||"—"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f9fafb",fontSize:13}}>
                <span style={{color:"#9ca3af",fontWeight:600}}>{k}</span>
                <span style={{color:"#374151",fontWeight:500,fontFamily:k==="User ID"?"monospace":"inherit"}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",gap:8,paddingTop:4}}>
              <button onClick={()=>{setViewUser(null);setEditUser(viewUser);setEditRole(viewUser.roles?.[0]||"requisitioner");setEditDept(viewUser.department||"");setEditActive(viewUser.is_active!==false);setEditPhone(viewUser.phone||"");}}
                style={{display:"flex",alignItems:"center",gap:6,flex:1,justifyContent:"center",padding:"9px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700,color:"#92400e"}}>
                <Edit3 style={{width:13,height:13}}/> Edit User
              </button>
              <button onClick={()=>setViewUser(null)} style={{padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,color:"#374151"}}>Close</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function UsersPage() {
  return <RoleGuard allowed={["admin"]}><UsersInner/></RoleGuard>;
}
