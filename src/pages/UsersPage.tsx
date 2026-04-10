/**
 * ProcurBosse — Users Page v4.0 (Admin Full Control)
 * Create/edit/delete users · Role assignment · Avatar upload · Realtime
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import ImageUploader from "@/components/ImageUploader";
import {
  Plus, Search, RefreshCw, Edit3, Trash2, Shield, X, Check,
  UserCircle, Mail, Phone, Building2, Key, Eye, EyeOff, Users,
  ChevronDown, Lock, Unlock, AlertTriangle
} from "lucide-react";

const db = supabase as any;

const ALL_ROLES = ["admin","database_admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner","accountant"] as const;
const ROLE_COLORS: Record<string,string> = {
  admin:"#ef4444", database_admin:"#dc2626", procurement_manager:"#1d4ed8",
  procurement_officer:"#0891b2", inventory_manager:"#059669", warehouse_officer:"#7c3aed",
  requisitioner:"#d97706", accountant:"#065f46",
};

interface UserRow {
  id: string; full_name: string; email: string; phone_number?: string;
  department?: string; role?: string; avatar_url?: string;
  is_active?: boolean; created_at: string; roles: string[];
}

const CS: React.CSSProperties = {
  background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px",
};

export default function UsersPage() {
  const { user: me, roles: myRoles } = useAuth();
  const isAdmin = myRoles?.includes("admin") || myRoles?.includes("database_admin");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [modal, setModal] = useState<"create"|"edit"|"delete"|null>(null);
  const [selected, setSelected] = useState<UserRow|null>(null);
  const [form, setForm] = useState<Partial<UserRow & {password:string}>>({});
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profiles } = await db.from("profiles").select("*").order("full_name");
      const { data: roleRows } = await db.from("user_roles").select("user_id,role");
      const roleMap: Record<string,string[]> = {};
      (roleRows||[]).forEach((r:any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      setUsers((profiles||[]).map((p:any) => ({
        ...p, roles: roleMap[p.id]||[], role: (roleMap[p.id]||[])[0]||"requisitioner"
      })));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const ch = db.channel("users:rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"profiles"}, load)
      .on("postgres_changes",{event:"*",schema:"public",table:"user_roles"}, load)
      .subscribe();
    return () => db.removeChannel(ch);
  }, [load]);

  const openCreate = () => { setForm({is_active:true}); setSelected(null); setModal("create"); };
  const openEdit = (u: UserRow) => { setForm({...u}); setSelected(u); setModal("edit"); };
  const openDelete = (u: UserRow) => { setSelected(u); setModal("delete"); };

  const save = async () => {
    if (!form.full_name?.trim() || !form.email?.trim()) {
      toast({title:"Required",description:"Name and email are required",variant:"destructive"}); return;
    }
    setSaving(true);
    try {
      if (modal === "create") {
        // Create auth user via admin API (requires service role — fallback to invite)
        const { data: authData, error: authErr } = await supabase.auth.admin?.createUser?.({
          email: form.email!, password: form.password||"Temp@1234",
          email_confirm: true,
          user_metadata: { full_name: form.full_name }
        }) || {};
        if (authErr) throw authErr;
        const uid = authData?.user?.id;
        if (uid) {
          await db.from("profiles").upsert({
            id: uid, full_name: form.full_name, email: form.email,
            phone_number: form.phone_number, department: form.department,
            avatar_url: form.avatar_url, is_active: form.is_active !== false,
          });
          if (form.role) {
            await db.from("user_roles").upsert({user_id:uid, role:form.role},{onConflict:"user_id,role"});
          }
        }
        toast({title:"User created",description:`${form.full_name} added successfully`});
      } else if (modal === "edit" && selected) {
        await db.from("profiles").update({
          full_name: form.full_name, phone_number: form.phone_number,
          department: form.department, avatar_url: form.avatar_url,
          is_active: form.is_active,
        }).eq("id", selected.id);
        // Update roles
        const currentRoles = selected.roles || [];
        const newRole = form.role as string;
        if (newRole && !currentRoles.includes(newRole)) {
          await db.from("user_roles").upsert({user_id:selected.id, role:newRole},{onConflict:"user_id,role"});
        }
        toast({title:"Updated",description:`${form.full_name} updated`});
      }
      setModal(null); load();
    } catch(e:any) {
      toast({title:"Error",description:e.message,variant:"destructive"});
    } finally { setSaving(false); }
  };

  const deleteUser = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await db.from("user_roles").delete().eq("user_id", selected.id);
      await db.from("profiles").delete().eq("id", selected.id);
      toast({title:"Deleted",description:`${selected.full_name} removed`});
      setModal(null); load();
    } catch(e:any) {
      toast({title:"Error",description:e.message,variant:"destructive"});
    } finally { setSaving(false); }
  };

  const toggleRole = async (uid: string, role: string, has: boolean) => {
    if (has) await db.from("user_roles").delete().eq("user_id",uid).eq("role",role);
    else await db.from("user_roles").upsert({user_id:uid,role},{onConflict:"user_id,role"});
    load();
  };

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    const match = !s || u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s);
    const r = roleFilter === "all" || u.roles.includes(roleFilter);
    return match && r;
  });

  const inp: React.CSSProperties = {
    width:"100%", background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r,
    padding:"9px 12px", color:T.fg, fontSize:13, outline:"none", boxSizing:"border-box"
  };

  return (
    <div style={{padding:20, minHeight:"100vh", background:T.bg}}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <Users size={22} color={T.primary}/>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:T.fg}}>Users & Access Control</h1>
          <div style={{fontSize:11,color:T.fgDim,marginTop:2}}>{filtered.length} of {users.length} users · Real-time sync</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={load} style={{...btnStyle(T.bg2),border:`1px solid ${T.border}`}}>
            <RefreshCw size={13}/> Refresh
          </button>
          {isAdmin && (
            <button onClick={openCreate} style={btnStyle(T.primary)}>
              <Plus size={13}/> Add User
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{...CS, display:"flex", gap:10, alignItems:"center", marginBottom:14}}>
        <div style={{position:"relative",flex:1}}>
          <Search size={13} color={T.fgDim} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email..."
            style={{...inp, paddingLeft:30}}/>
        </div>
        <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)}
          style={{...inp, width:180}}>
          <option value="all">All Roles</option>
          {ALL_ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
        </select>
      </div>

      {/* Users table */}
      <div style={CS}>
        {loading ? (
          <div style={{padding:40,textAlign:"center",color:T.fgDim}}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{padding:40,textAlign:"center",color:T.fgDim}}>No users found</div>
        ) : (
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${T.border}`}}>
                {["User","Email","Department","Roles","Status","Actions"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:11,fontWeight:700,color:T.fgDim,whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u=>(
                <tr key={u.id} style={{borderBottom:`1px solid ${T.border}22`,transition:"background .1s"}}
                  onMouseEnter={e=>(e.currentTarget.style.background=T.bg2)}
                  onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover"}}/>
                        : <div style={{width:32,height:32,borderRadius:"50%",background:T.primary,display:"flex",alignItems:"center",justifyContent:"center"}}><UserCircle size={16} color="#fff"/></div>
                      }
                      <div>
                        <div style={{fontSize:13,fontWeight:600,color:T.fg}}>{u.full_name||"—"}</div>
                        <div style={{fontSize:10,color:T.fgDim}}>{u.id.slice(0,8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",fontSize:12,color:T.fgMuted}}>{u.email}</td>
                  <td style={{padding:"10px 12px",fontSize:12,color:T.fgMuted}}>{u.department||"—"}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {u.roles.slice(0,3).map(r=>(
                        <span key={r} style={{
                          padding:"2px 7px",borderRadius:99,fontSize:10,fontWeight:700,
                          background:`${ROLE_COLORS[r]||T.fgDim}22`,
                          color:ROLE_COLORS[r]||T.fgMuted,
                          border:`1px solid ${ROLE_COLORS[r]||T.fgDim}44`,
                        }}>{r.replace(/_/g," ")}</span>
                      ))}
                      {u.roles.length > 3 && <span style={{fontSize:10,color:T.fgDim}}>+{u.roles.length-3}</span>}
                    </div>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:99,fontSize:10,fontWeight:700,
                      background:u.is_active!==false?`${T.success}18`:`${T.error}18`,
                      color:u.is_active!==false?T.success:T.error}}>
                      {u.is_active!==false?"Active":"Inactive"}
                    </span>
                  </td>
                  <td style={{padding:"10px 12px"}}>
                    {isAdmin && u.id !== me?.id && (
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>openEdit(u)} style={{...iconBtnS,color:T.info}} title="Edit"><Edit3 size={14}/></button>
                        <button onClick={()=>openDelete(u)} style={{...iconBtnS,color:T.error}} title="Delete"><Trash2 size={14}/></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {(modal==="create"||modal==="edit") && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rXl,padding:28,width:"100%",maxWidth:520,animation:"fadeIn .2s",maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{margin:0,fontSize:16,fontWeight:800,color:T.fg}}>{modal==="create"?"Add New User":"Edit User"}</h2>
              <button onClick={()=>setModal(null)} style={{...iconBtnS}}><X size={16}/></button>
            </div>

            {/* Avatar upload */}
            <div style={{display:"flex",justifyContent:"center",marginBottom:18}}>
              <ImageUploader type="profile" circle current={form.avatar_url||""}
                folder={`profiles/${selected?.id||"new"}`} size="md"
                onUploaded={(url)=>setForm(f=>({...f,avatar_url:url}))}/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Full Name *</label>
                <input value={form.full_name||""} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} style={inp} placeholder="e.g. John Kamau"/>
              </div>
              <div style={{gridColumn:"1/-1"}}>
                <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Email *</label>
                <input value={form.email||""} onChange={e=>setForm(f=>({...f,email:e.target.value}))} style={inp} type="email" disabled={modal==="edit"} placeholder="user@example.com"/>
              </div>
              {modal==="create" && (
                <div style={{gridColumn:"1/-1"}}>
                  <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Password</label>
                  <div style={{position:"relative"}}>
                    <input value={form.password||""} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={{...inp,paddingRight:36}} type={showPw?"text":"password"} placeholder="Min 6 characters"/>
                    <button onClick={()=>setShowPw(p=>!p)} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:T.fgDim}}>
                      {showPw?<EyeOff size={14}/>:<Eye size={14}/>}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Phone</label>
                <input value={form.phone_number||""} onChange={e=>setForm(f=>({...f,phone_number:e.target.value}))} style={inp} placeholder="+254 7xx xxx xxx"/>
              </div>
              <div>
                <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Department</label>
                <input value={form.department||""} onChange={e=>setForm(f=>({...f,department:e.target.value}))} style={inp} placeholder="e.g. Procurement"/>
              </div>
              <div>
                <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Primary Role</label>
                <select value={form.role||"requisitioner"} onChange={e=>setForm(f=>({...f,role:e.target.value}))} style={inp}>
                  {ALL_ROLES.map(r=><option key={r} value={r}>{r.replace(/_/g," ")}</option>)}
                </select>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <label style={{fontSize:11,color:T.fgDim}}>Active</label>
                <input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))} style={{width:16,height:16,accentColor:T.primary}}/>
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button onClick={()=>setModal(null)} style={btnStyle(T.bg2,T.border)}>Cancel</button>
              <button onClick={save} disabled={saving} style={btnStyle(T.primary)}>
                {saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>}
                {saving?"Saving...":modal==="create"?"Create User":"Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal==="delete" && selected && (
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setModal(null)}>
          <div style={{background:T.card,border:`1px solid ${T.error}44`,borderRadius:T.rXl,padding:28,maxWidth:400,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",gap:12,marginBottom:16}}>
              <AlertTriangle size={24} color={T.error}/>
              <div>
                <div style={{fontWeight:800,color:T.fg,marginBottom:4}}>Delete User</div>
                <div style={{fontSize:13,color:T.fgMuted}}>Remove <strong style={{color:T.fg}}>{selected.full_name}</strong>? This cannot be undone.</div>
              </div>
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>setModal(null)} style={btnStyle(T.bg2,T.border)}>Cancel</button>
              <button onClick={deleteUser} disabled={saving} style={btnStyle(T.error)}><Trash2 size={13}/> Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

const btnStyle=(bg:string,border?:string):React.CSSProperties=>({
  display:"inline-flex",alignItems:"center",gap:7,padding:"8px 16px",
  background:bg, color:border?"#94a3b8":"#fff",
  border:`1px solid ${border||"transparent"}`, borderRadius:T.r,
  fontSize:13,fontWeight:700,cursor:"pointer",
});
const iconBtnS:React.CSSProperties={background:"transparent",border:"none",cursor:"pointer",padding:5,borderRadius:6,display:"flex",alignItems:"center",color:T.fgMuted};
import type React from "react";
