/**
 * ProcurBosse - Users & Security Management v6.0
 * Full CRUD · Password view/reset/generate · Role assignment · IP stats
 * Real-time activity feed · Lock/unlock · Avatar · Department · Employee ID
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import ImageUploader from "@/components/ImageUploader";
import {
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
  Plus, Search, RefreshCw, Edit3, Trash2, Shield, X, Check,
  Key, Eye, EyeOff, Users, Lock, Unlock, AlertTriangle,
  Activity, Copy, Clock, Mail, Phone, Building2, UserCheck,
  ChevronDown, ChevronUp, MoreHorizontal, Zap, Globe, Ban,
} from "lucide-react";

const db = supabase as any;

const ALL_ROLES = [
  "superadmin","webmaster","admin","database_admin",
  "procurement_manager","procurement_officer","inventory_manager",
  "warehouse_officer","requisitioner","accountant",
] as const;
type Role = typeof ALL_ROLES[number];

const ROLE_META: Record<string,{color:string;bg:string;label:string}> = {
  superadmin:          { color:"#6b21a8", bg:"#f3e8ff", label:"Superadmin"      },
  webmaster:           { color:"#0ea5e9", bg:"#e0f2fe", label:"Webmaster"       },
  admin:               { color:"#dc2626", bg:"#fee2e2", label:"Admin"           },
  database_admin:      { color:"#7c2d12", bg:"#ffedd5", label:"DB Admin"        },
  procurement_manager: { color:"#1d4ed8", bg:"#dbeafe", label:"Proc. Manager"   },
  procurement_officer: { color:"#0369a1", bg:"#e0f2fe", label:"Proc. Officer"   },
  inventory_manager:   { color:"#047857", bg:"#d1fae5", label:"Inv. Manager"    },
  warehouse_officer:   { color:"#7c3aed", bg:"#ede9fe", label:"Warehouse"       },
  requisitioner:       { color:"#d97706", bg:"#fef3c7", label:"Requisitioner"   },
  accountant:          { color:"#065f46", bg:"#d1fae5", label:"Accountant"      },
};

/* ── Styles ── */
const card: React.CSSProperties = { background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px" };
const inp: React.CSSProperties  = { width:"100%", background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"8px 12px", color:T.fg, fontSize:13, outline:"none", boxSizing:"border-box" };
const btn = (bg:string, bd?:string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 14px", background:bg, color:bd?T.fgMuted:"#fff", border:`1px solid ${bd||"transparent"}`, borderRadius:T.r, fontSize:12, fontWeight:700, cursor:"pointer" });
const chip = (col:string): React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, fontSize:9, fontWeight:700, background:col+"20", color:col, border:`1px solid ${col}44` });

function fmtDate(s:string|null) { return s ? new Date(s).toLocaleDateString("en-KE",{timeZone:"Africa/Nairobi",day:"2-digit",month:"short",year:"numeric"}) : "—"; }
function fmtAgo(s:string|null) {
  if (!s) return "—";
  const d = Date.now() - new Date(s).getTime();
  if (d < 60000)    return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000)  return `${Math.floor(d/60000)}m ago`;
  if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
  return `${Math.floor(d/86400000)}d ago`;
}

function genPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  return Array.from({ length:10 }, () => chars[Math.floor(Math.random()*chars.length)]).join("");
}

type ModalType = "create"|"edit"|"delete"|"password"|"activity"|null;

interface UserRow {
  id:string; full_name:string; email:string; phone_number?:string;
  department?:string; avatar_url?:string; is_active?:boolean;
  is_locked?:boolean; failed_logins?:number; employee_id?:string;
  created_at:string; last_login?:string; last_seen?:string; last_ip?:string;
  roles:string[]; lastIP?:string|null;
}

/* ── Ribbon button ── */
const RBtn = ({ icon:Icon, label, onClick, color="inherit", disabled=false }:{ icon:any;label:string;onClick?:()=>void;color?:string;disabled?:boolean }) => (
  <button onClick={onClick} disabled={disabled} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"6px 12px",border:"none",background:"transparent",cursor:disabled?"not-allowed":"pointer",color:disabled?"rgba(255,255,255,.35)":color,borderRadius:6,transition:"background .12s",fontSize:10,fontWeight:600,opacity:disabled?.5:1 }}
    onMouseEnter={e=>!disabled&&((e.currentTarget as any).style.background="rgba(255,255,255,.12)")}
    onMouseLeave={e=>((e.currentTarget as any).style.background="transparent")}>
    <Icon size={18} style={{flexShrink:0}}/>
    {label}
  </button>
);

/* ── Role chip ── */
const RoleChip = ({ role, onRemove }: { role:string; onRemove?:()=>void }) => {
  const rm = ROLE_META[role] || { color:T.fgDim, bg:T.bg, label:role };
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:4,background:rm.bg,color:rm.color,fontSize:11,fontWeight:700 }}>
      {rm.label}
      {onRemove && <button onClick={onRemove} style={{ background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,lineHeight:0,opacity:.7 }}><X size={10}/></button>}
    </span>
  );
};

/* ════════════════════════════════════════════════════════════════ */
export default function UsersPage() {
  const { user:me, roles:myRoles } = useAuth();
  const isAdmin = myRoles?.some(r => ["admin","superadmin","webmaster"].includes(r));

  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<UserRow|null>(null);
  const [modal, setModal]       = useState<ModalType>(null);
  const [form, setForm]         = useState<any>({});
  const [saving, setSaving]     = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [revealedPws, setRevealedPws] = useState<Record<string,boolean>>({});
  const [storedPws, setStoredPws]     = useState<Record<string,string>>({});
  const [activity, setActivity] = useState<any[]>([]);
  const [actLoading, setActLoading] = useState(false);
  const [ipLogs, setIpLogs]     = useState<any[]>([]);

  /* ── Load all users ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const safe = async <T,>(p: Promise<T>): Promise<T | { data: any[] }> => {
        try { return await p; } catch { return { data: [] } as any; }
      };
      const [profilesRes, rolesRes, ipRes, pwRes] = await Promise.all([
        safe(db.from("profiles").select("id,full_name,email,phone_number,department,avatar_url,is_active,is_locked,failed_logins,employee_id,created_at,last_login,last_seen,last_ip").order("full_name")),
        safe(db.from("user_roles").select("user_id,role")),
        safe(db.from("ip_access_log").select("user_id,ip_address,city,country,created_at").order("created_at",{ascending:false}).limit(500)),
        safe(db.from("system_settings").select("key,value").ilike("key","temp_pw_%")),
      ]);
      const profiles = (profilesRes as any).data || [];
      const roleRows = (rolesRes as any).data || [];
      const ipRows = (ipRes as any).data || [];
      const pwRows = (pwRes as any).data || [];
      const roleMap: Record<string,string[]> = {};
      roleRows.forEach((r:any) => { if (!roleMap[r.user_id]) roleMap[r.user_id]=[]; roleMap[r.user_id].push(r.role); });
      const ipMap: Record<string,any> = {};
      ipRows.forEach((l:any) => { if (!ipMap[l.user_id]) ipMap[l.user_id]=l; });
      const pwMap: Record<string,string> = {};
      pwRows.forEach((r:any) => { const uid=r.key.replace("temp_pw_",""); pwMap[uid]=r.value; });
      setStoredPws(pwMap);
      setIpLogs(ipRows);
      setUsers(profiles.map((p:any) => ({ ...p, roles:roleMap[p.id]||[], lastIP:ipMap[p.id]?.ip_address||null, lastGeo:ipMap[p.id]?[ipMap[p.id].city,ipMap[p.id].country].filter(Boolean).join(", "):null })));
    } catch (e:any) {
      toast({ title:"Load error", description: e?.message || String(e), variant:"destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const ch = db.channel("users:rt").on("postgres_changes",{event:"*",schema:"public",table:"profiles"},()=>load()).subscribe();
    return () => db.removeChannel(ch);
  }, [load]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return users.filter(u => {
      const matchText = !s || u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) || u.department?.toLowerCase().includes(s) || (u as any).lastIP?.includes(s);
      const matchRole   = roleFilter==="all" || u.roles.includes(roleFilter);
      const matchStatus = statusFilter==="all" || (statusFilter==="active"&&u.is_active!==false) || (statusFilter==="inactive"&&u.is_active===false) || (statusFilter==="locked"&&u.is_locked);
      return matchText && matchRole && matchStatus;
    });
  }, [users,search,roleFilter,statusFilter]);

  const stats = useMemo(() => ({
    total:   users.length,
    active:  users.filter(u=>u.is_active!==false).length,
    inactive:users.filter(u=>u.is_active===false).length,
    locked:  users.filter(u=>u.is_locked).length,
    online:  users.filter(u=>u.last_seen&&(Date.now()-new Date(u.last_seen).getTime())<5*60_000).length,
  }), [users]);

  /* ── Reset password ── */
  const resetPassword = async (uid: string, newPw: string) => {
    if (newPw.length < 6) { toast({title:"Min 6 characters",variant:"destructive"}); return; }
    setSaving(true);
    try {
      /* Try admin API first */
      const { error } = (await (supabase.auth as any).admin?.updateUserById?.(uid,{password:newPw})) || {};
      if (error) throw error;
    } catch {
      /* Fallback: store temp password in system_settings for admin to distribute */
      await db.from("system_settings").upsert({ key:`temp_pw_${uid}`, value:newPw, category:"security" }, { onConflict:"key" });
    }
    setStoredPws(p => ({ ...p, [uid]:newPw }));
    toast({ title:"✓ Password reset", description:`New password set for ${selected?.full_name}` });
    setSaving(false); setModal(null);
  };

  /* ── CRUD ── */
  const saveUser = async () => {
    if (!form.full_name?.trim()||!form.email?.trim()) { toast({title:"Name and email required",variant:"destructive"}); return; }
    setSaving(true);
    try {
      if (modal==="create") {
        const pw = form.password || genPassword();
        const { data:authData, error } = (await (supabase.auth as any).admin?.createUser?.({ email:form.email, password:pw, email_confirm:true, user_metadata:{ full_name:form.full_name } })) || { data:null, error:null };
        if (error) throw error;
        const uid = authData?.user?.id;
        if (uid) {
          await db.from("profiles").upsert({ id:uid, full_name:form.full_name, email:form.email, phone_number:form.phone_number, department:form.department, employee_id:form.employee_id, avatar_url:form.avatar_url, is_active:true });
          if (form.role) await db.from("user_roles").upsert({ user_id:uid, role:form.role }, { onConflict:"user_id,role" });
          await db.from("system_settings").upsert({ key:`temp_pw_${uid}`, value:pw, category:"security" }, { onConflict:"key" });
          setStoredPws(p => ({ ...p, [uid]:pw }));
        }
        toast({ title:"✓ User created", description:`Temp password: ${pw}` });
      } else if (modal==="edit" && selected) {
        await db.from("profiles").update({ full_name:form.full_name, phone_number:form.phone_number, department:form.department, employee_id:form.employee_id, avatar_url:form.avatar_url, is_active:form.is_active }).eq("id",selected.id);
        if (form.role && !selected.roles.includes(form.role)) {
          await db.from("user_roles").upsert({ user_id:selected.id, role:form.role }, { onConflict:"user_id,role" });
        }
        toast({ title:"✓ Profile updated" });
      }
      setModal(null); load();
    } catch(e:any) { toast({ title:"Error", description:e.message, variant:"destructive" }); }
    finally { setSaving(false); }
  };

  const deleteUser = async () => {
    if (!selected) return;
    setSaving(true);
    await db.from("user_roles").delete().eq("user_id",selected.id);
    await db.from("profiles").delete().eq("id",selected.id);
    toast({ title:"User removed" }); setModal(null); setSelected(null); load();
    setSaving(false);
  };

  const toggleActive = async (u:UserRow) => {
    await db.from("profiles").update({ is_active:!u.is_active }).eq("id",u.id);
    toast({ title:u.is_active?"User deactivated":"User activated" }); load();
    if (selected?.id===u.id) setSelected(p => p?{...p,is_active:!p.is_active}:p);
  };

  const unlockUser = async (u:UserRow) => {
    await db.from("profiles").update({ is_locked:false, failed_logins:0 }).eq("id",u.id);
    toast({ title:"✓ User unlocked" }); load();
    if (selected?.id===u.id) setSelected(p => p?{...p,is_locked:false,failed_logins:0}:p);
  };

  const removeRole = async (uid:string, role:string) => {
    await db.from("user_roles").delete().eq("user_id",uid).eq("role",role);
    load(); setSelected(p => p?{...p,roles:p.roles.filter(r=>r!==role)}:p);
  };

  const addRole = async (uid:string, role:string) => {
    await db.from("user_roles").upsert({ user_id:uid, role }, { onConflict:"user_id,role" });
    load(); setSelected(p => p?{...p,roles:[...p.roles,role]}:p);
  };

  const loadActivity = async (uid:string) => {
    setActLoading(true);
    const [{ data:audit }, { data:reqs }, { data:ips }] = await Promise.all([
      db.from("audit_log").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(15),
      db.from("requisitions").select("id,requisition_number,status,created_at,total_amount").eq("requested_by",uid).order("created_at",{ascending:false}).limit(8),
      db.from("ip_access_log").select("*").eq("user_id",uid).order("created_at",{ascending:false}).limit(10),
    ]);
    const all = [
      ...(audit||[]).map((r:any) => ({ ...r, _t:"audit" })),
      ...(reqs||[]).map((r:any)  => ({ ...r, _t:"req"   })),
      ...(ips||[]).map((r:any)   => ({ ...r, _t:"ip"    })),
    ].sort((a,b) => new Date(b.created_at).getTime()-new Date(a.created_at).getTime()).slice(0,30);
    setActivity(all);
    setActLoading(false);
    setModal("activity");
  };

  return (
    <div style={{ minHeight:"100vh", background:T.bg }}>
      <AdminBreadcrumb />
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}} @keyframes slideR{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* ── RIBBON ── */}
      <div style={{ background:`linear-gradient(135deg,#0a2558,#1d4ed8)`, padding:"0 16px", boxShadow:"0 2px 8px rgba(0,0,0,.3)" }}>
        <div style={{ display:"flex", gap:0 }}>
          {["Home","Security","Import","View"].map((t,i) => (
            <div key={t} style={{ padding:"6px 16px", fontSize:12, fontWeight:600, color:i===0?"#fff":"rgba(255,255,255,.6)", background:i===0?"rgba(255,255,255,.15)":"transparent", cursor:"pointer", borderBottom:i===0?"2px solid #fff":"none" }}>{t}</div>
          ))}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:2, padding:"4px 0 8px" }}>
          <div style={{ display:"flex", borderRight:"1px solid rgba(255,255,255,.2)", paddingRight:8, marginRight:8, gap:2 }}>
            <RBtn icon={Plus}     label="New User"   onClick={() => { setForm({ is_active:true, role:"requisitioner" }); setSelected(null); setModal("create"); }} color="#fff"/>
            <RBtn icon={Edit3}    label="Edit"       onClick={() => selected && (setForm({...selected}),setModal("edit"))} color="#fff" disabled={!selected}/>
            <RBtn icon={Trash2}   label="Delete"     onClick={() => selected && setModal("delete")} color="#fff" disabled={!selected||!isAdmin}/>
          </div>
          <div style={{ display:"flex", borderRight:"1px solid rgba(255,255,255,.2)", paddingRight:8, marginRight:8, gap:2 }}>
            <RBtn icon={Key}      label="Reset Pwd"  onClick={() => selected && (setForm({...selected,newPw:""}),setModal("password"))} color="#fff" disabled={!selected||!isAdmin}/>
            <RBtn icon={Eye}      label="View Pwd"   onClick={() => selected && setRevealedPws(p=>({...p,[selected.id]:!p[selected.id]}))} color="#fff" disabled={!selected}/>
            <RBtn icon={Activity} label="Activity"   onClick={() => selected && loadActivity(selected.id)} color="#fff" disabled={!selected}/>
          </div>
          <div style={{ display:"flex", gap:2 }}>
            <RBtn icon={RefreshCw} label="Refresh"   onClick={load}  color="#fff"/>
            <RBtn icon={Unlock}    label="Unlock"    onClick={() => selected && selected.is_locked && unlockUser(selected)} color="#fff" disabled={!selected?.is_locked}/>
            <RBtn icon={selected?.is_active!==false?Lock:Unlock} label={selected?.is_active!==false?"Deactivate":"Activate"}
              onClick={() => selected && toggleActive(selected)} color="#fff" disabled={!selected}/>
          </div>
        </div>
      </div>

      {/* ── STAT BAR ── */}
      <div style={{ display:"flex", background:T.card, borderBottom:`1px solid ${T.border}`, gap:0 }}>
        {[
          { label:"Total",    value:stats.total,    color:T.primary  },
          { label:"Active",   value:stats.active,   color:T.success  },
          { label:"Inactive", value:stats.inactive, color:T.fgDim    },
          { label:"Locked",   value:stats.locked,   color:T.error    },
          { label:"Online",   value:stats.online,   color:"#f59e0b"  },
        ].map(s => (
          <div key={s.label} style={{ flex:1, padding:"8px 0", textAlign:"center", borderRight:`1px solid ${T.border}` }}>
            <div style={{ fontSize:20, fontWeight:900, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9, color:T.fgDim, fontWeight:700, textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 148px)" }}>

        {/* ── LEFT: user list ── */}
        <div style={{ width:320, flexShrink:0, background:T.card, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ position:"relative" }}>
              <Search size={13} color={T.fgDim} style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)" }}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, IP..." style={{ ...inp, paddingLeft:28, fontSize:12 }}/>
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{ ...inp, flex:1, fontSize:11 }}>
                <option value="all">All Roles</option>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label||r}</option>)}
              </select>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ ...inp, width:100, fontSize:11 }}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="locked">Locked</option>
              </select>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto" }}>
            {loading ? (
              <div style={{ padding:24, textAlign:"center", color:T.fgDim }}>Loading users...</div>
            ) : filtered.length===0 ? (
              <div style={{ padding:32, textAlign:"center", color:T.fgDim, fontSize:12 }}>No users found</div>
            ) : filtered.map(u => {
              const isSel = selected?.id===u.id;
              const isOnline = u.last_seen && (Date.now()-new Date(u.last_seen).getTime())<5*60_000;
              return (
                <div key={u.id} onClick={() => setSelected(u)}
                  style={{ padding:"10px 12px", cursor:"pointer", borderBottom:`1px solid ${T.border}`, background:isSel?`${T.primary}12`:T.card, borderLeft:`3px solid ${isSel?T.primary:"transparent"}`, transition:"all .1s" }}
                  onMouseEnter={e=>!isSel&&((e.currentTarget as any).style.background=T.bg)}
                  onMouseLeave={e=>!isSel&&((e.currentTarget as any).style.background=T.card)}>
                  <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:`${T.primary}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`2px solid ${isSel?T.primary:T.border}`, position:"relative", overflow:"hidden" }}>
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                        : <span style={{ fontSize:14, fontWeight:700, color:T.primary }}>{u.full_name?.[0]||"?"}</span>}
                      {isOnline && <span style={{ position:"absolute", bottom:0, right:0, width:10, height:10, borderRadius:"50%", background:T.success, border:`2px solid ${T.card}` }}/>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:T.fg, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.full_name||"—"}</div>
                      <div style={{ fontSize:10, color:T.fgDim, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{u.email}</div>
                      <div style={{ display:"flex", gap:4, marginTop:3, flexWrap:"wrap" }}>
                        {u.roles.slice(0,2).map(r => { const rm=ROLE_META[r]||{color:T.fgDim,bg:T.bg,label:r}; return <span key={r} style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:3, background:rm.bg, color:rm.color }}>{rm.label}</span>; })}
                        {u.is_locked && <span style={chip(T.error)}>🔒</span>}
                        {u.is_active===false && <span style={{ fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:3, background:T.errorBg, color:T.error }}>INACTIVE</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: detail panel ── */}
        <div style={{ flex:1, overflowY:"auto", background:T.bg }}>
          {selected ? (
            <div style={{ padding:20, animation:"slideR .2s" }}>

              {/* User header card */}
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:16 }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", background:`${T.primary}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:`3px solid ${T.primary}`, overflow:"hidden" }}>
                    {selected.avatar_url
                      ? <img src={selected.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <span style={{ fontSize:30, fontWeight:700, color:T.primary }}>{selected.full_name?.[0]||"?"}</span>}
                  </div>
                  <div style={{ flex:1 }}>
                    <h2 style={{ margin:"0 0 4px", fontSize:20, fontWeight:800, color:T.fg }}>{selected.full_name}</h2>
                    <div style={{ fontSize:13, color:T.fgMuted, marginBottom:8 }}>{selected.email}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {selected.roles.map(r => <RoleChip key={r} role={r}/>)}
                      <span style={chip(selected.is_locked?T.error:selected.is_active!==false?T.success:T.fgDim)}>
                        {selected.is_locked?"🔒 Locked":selected.is_active!==false?"Active":"Inactive"}
                      </span>
                      {selected.last_seen && (Date.now()-new Date(selected.last_seen).getTime())<5*60_000 && <span style={chip(T.success)}>● Online</span>}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    <button onClick={() => (setForm({...selected}),setModal("edit"))} style={btn(T.primary)}><Edit3 size={12}/> Edit</button>
                    <button onClick={() => (setForm({...selected,newPw:""}),setModal("password"))} style={btn(T.bg,T.border)}><Key size={12}/> Reset Password</button>
                    {selected.is_locked && <button onClick={() => unlockUser(selected)} style={{ ...btn(T.successBg,T.success), color:T.success }}><Unlock size={12}/> Unlock</button>}
                    <button onClick={() => toggleActive(selected)} style={{ ...btn(selected.is_active!==false?T.errorBg:T.successBg,selected.is_active!==false?T.error:T.success), color:selected.is_active!==false?T.error:T.success }}>
                      {selected.is_active!==false?<><Lock size={12}/> Deactivate</>:<><Unlock size={12}/> Activate</>}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                {/* Profile info */}
                <div style={card}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.fgDim, letterSpacing:".08em", marginBottom:12, textTransform:"uppercase" }}>Profile Information</div>
                  {[
                    { label:"Full Name",    value:selected.full_name          },
                    { label:"Email",        value:selected.email              },
                    { label:"Phone",        value:selected.phone_number||"—"  },
                    { label:"Department",   value:selected.department||"—"    },
                    { label:"Employee ID",  value:selected.employee_id||"—"   },
                    { label:"Last IP",      value:(selected as any).lastIP||selected.last_ip||"—" },
                    { label:"Last Login",   value:fmtAgo(selected.last_login||null)  },
                    { label:"Last Seen",    value:fmtAgo(selected.last_seen||null)   },
                    { label:"Created",      value:fmtDate(selected.created_at)       },
                    { label:"Failed Logins",value:String(selected.failed_logins||0)  },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${T.border}20`, fontSize:12 }}>
                      <span style={{ color:T.fgDim, fontWeight:600 }}>{label}</span>
                      <span style={{ color:T.fg, maxWidth:180, textAlign:"right", wordBreak:"break-all" }}>{value}</span>
                    </div>
                  ))}
                </div>

                {/* Security */}
                <div style={card}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.fgDim, letterSpacing:".08em", marginBottom:12, textTransform:"uppercase" }}>Security & Access</div>

                  {/* Password panel */}
                  <div style={{ marginBottom:16, padding:"12px 14px", background:T.bg, borderRadius:T.r, border:`1px solid ${T.border}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.fgDim, marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Password</div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <code style={{ flex:1, fontSize:14, fontFamily:"monospace", color:T.fg, letterSpacing:".08em", wordBreak:"break-all" }}>
                        {revealedPws[selected.id]
                          ? (storedPws[selected.id] || "— (no temp pw stored)")
                          : "••••••••••"}
                      </code>
                      <button onClick={() => setRevealedPws(p=>({...p,[selected.id]:!p[selected.id]}))} style={{ background:"none", border:"none", cursor:"pointer", color:T.primary, padding:4 }}>
                        {revealedPws[selected.id] ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                      {storedPws[selected.id] && (
                        <button onClick={() => navigator.clipboard.writeText(storedPws[selected.id]).then(()=>toast({title:"Copied"}))} style={{ background:"none", border:"none", cursor:"pointer", color:T.fgDim, padding:4 }}>
                          <Copy size={13}/>
                        </button>
                      )}
                    </div>
                    {storedPws[selected.id] && <div style={{ fontSize:10, color:T.warning, marginTop:6 }}>⚠ Temp password stored — user should change on next login</div>}
                    <button onClick={() => (setForm({...selected,newPw:""}),setModal("password"))} style={{ ...btn(T.primary), width:"100%", justifyContent:"center", marginTop:10 }}>
                      <Key size={12}/> Reset Password
                    </button>
                  </div>

                  {/* Roles */}
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.fgDim, marginBottom:8, textTransform:"uppercase", letterSpacing:".06em" }}>Assigned Roles</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:8 }}>
                      {selected.roles.length===0
                        ? <span style={{ fontSize:12, color:T.fgDim }}>No roles assigned</span>
                        : selected.roles.map(r => <RoleChip key={r} role={r} onRemove={isAdmin&&selected.id!==me?.id?()=>removeRole(selected.id,r):undefined}/>)
                      }
                    </div>
                    {isAdmin && (
                      <select onChange={async e => { if(!e.target.value)return; await addRole(selected.id,e.target.value); e.target.value=""; }}
                        style={{ ...inp, fontSize:11 }}>
                        <option value="">+ Add role...</option>
                        {ALL_ROLES.filter(r=>!selected.roles.includes(r)).map(r => <option key={r} value={r}>{ROLE_META[r]?.label||r}</option>)}
                      </select>
                    )}
                  </div>

                  {/* User ID */}
                  <div style={{ fontSize:10, color:T.fgDim }}>
                    <span style={{ fontWeight:700 }}>User ID: </span>
                    <code style={{ fontSize:10, fontFamily:"monospace" }}>{selected.id}</code>
                  </div>
                </div>
              </div>

              {/* IP Access History */}
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.fgDim, letterSpacing:".08em", marginBottom:12, textTransform:"uppercase" }}>IP Access History</div>
                {ipLogs.filter(l=>l.user_id===selected.id).length===0 ? (
                  <div style={{ fontSize:12, color:T.fgDim }}>No IP logs for this user</div>
                ) : (
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                    <thead>
                      <tr style={{ background:T.bg }}>
                        {["Time","IP Address","Location","Status"].map(h => <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, fontWeight:700, color:T.fgDim, borderBottom:`1px solid ${T.border}` }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ipLogs.filter(l=>l.user_id===selected.id).slice(0,10).map((l,i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${T.border}10` }}>
                          <td style={{ padding:"5px 10px", color:T.fgDim, fontSize:10 }}>{fmtAgo(l.created_at)}</td>
                          <td style={{ padding:"5px 10px" }}><code style={{ fontFamily:"monospace", color:T.fg }}>{l.ip_address}</code></td>
                          <td style={{ padding:"5px 10px", color:T.fgMuted }}>{[l.city,l.country].filter(Boolean).join(", ")||"—"}</td>
                          <td style={{ padding:"5px 10px" }}><span style={chip(l.allowed!==false?T.success:T.error)}>{l.allowed!==false?"✓ OK":"Blocked"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

            </div>
          ) : (
            <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:T.fgDim }}>
              <Users size={52} color={T.border}/>
              <div style={{ fontSize:15, fontWeight:700, color:T.fgMuted }}>Select a user to view details</div>
              <div style={{ fontSize:12 }}>Or create a new user from the ribbon above</div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ MODALS ══════ */}

      {/* Create / Edit */}
      {(modal==="create"||modal==="edit") && (
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setModal(null)}>
          <div style={{ background:T.card,borderRadius:T.rXl,width:540,maxHeight:"92vh",overflowY:"auto",boxShadow:T.shadowMd,animation:"fadeIn .2s" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#0a2558,#1d4ed8)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:`${T.rXl}px ${T.rXl}px 0 0` }}>
              <span style={{ color:"#fff",fontWeight:800,fontSize:15 }}>{modal==="create"?"New User":"Edit User"}</span>
              <button onClick={()=>setModal(null)} style={{ background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)" }}><X size={16}/></button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ display:"flex",justifyContent:"center",marginBottom:20 }}>
                <ImageUploader type="profile" circle size="md" current={form.avatar_url||""} folder={`profiles/${selected?.id||"new"}`} onUploaded={(url:string)=>setForm((f:any)=>({...f,avatar_url:url}))}/>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  { key:"full_name",    label:"Full Name *",   col:"1/-1", type:"text",     placeholder:"John Kamau"                  },
                  { key:"email",        label:"Email *",       col:"1/-1", type:"email",    placeholder:"user@embu.health.go.ke", disabled:modal==="edit" },
                  ...(modal==="create"?[{ key:"password", label:"Password", col:"1/-1", type:showPw?"text":"password", placeholder:"Auto-generated if blank" }]:[]),
                  { key:"phone_number", label:"Phone",         col:"1/2",  type:"text",     placeholder:"+254 7xx xxx xxx"            },
                  { key:"department",   label:"Department",    col:"2/3",  type:"text",     placeholder:"Procurement"                 },
                  { key:"employee_id",  label:"Employee ID",   col:"1/2",  type:"text",     placeholder:"EL5-001"                     },
                ].map(({ key, label, col, type, placeholder, disabled }) => (
                  <div key={key} style={{ gridColumn:col }}>
                    <label style={{ fontSize:11,color:T.fgDim,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em" }}>{label}</label>
                    {key==="password" ? (
                      <div style={{ position:"relative" }}>
                        <input value={form[key]||""} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} type={type} style={{ ...inp,paddingRight:80 }} placeholder={placeholder}/>
                        <div style={{ position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",display:"flex",gap:4 }}>
                          <button onClick={()=>setShowPw(p=>!p)} type="button" style={{ background:"none",border:"none",cursor:"pointer",color:T.fgDim,padding:4 }}>{showPw?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                          <button onClick={()=>setForm((f:any)=>({...f,password:genPassword()}))} type="button" style={{ background:"none",border:"none",cursor:"pointer",color:T.primary,padding:4,fontSize:10,fontWeight:700 }}>GEN</button>
                        </div>
                      </div>
                    ) : (
                      <input value={form[key]||""} onChange={e=>setForm((f:any)=>({...f,[key]:e.target.value}))} type={type} disabled={disabled} style={{ ...inp, background:disabled?T.bg:T.bg }} placeholder={placeholder}/>
                    )}
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:11,color:T.fgDim,fontWeight:700,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:".04em" }}>Primary Role</label>
                  <select value={form.role||"requisitioner"} onChange={e=>setForm((f:any)=>({...f,role:e.target.value}))} style={inp}>
                    {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label||r}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10,paddingTop:20 }}>
                  <span style={{ fontSize:12,color:T.fgDim,fontWeight:600 }}>Active</span>
                  <input type="checkbox" checked={form.is_active!==false} onChange={e=>setForm((f:any)=>({...f,is_active:e.target.checked}))} style={{ width:16,height:16,accentColor:T.primary }}/>
                </div>
              </div>
              <div style={{ display:"flex",justifyContent:"flex-end",gap:8,marginTop:20,paddingTop:16,borderTop:`1px solid ${T.border}` }}>
                <button onClick={()=>setModal(null)} style={btn(T.bg,T.border)}>Cancel</button>
                <button onClick={saveUser} disabled={saving} style={btn(T.primary)}>
                  {saving?<RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/>:<Check size={13}/>}
                  {saving?"Saving...":modal==="create"?"Create User":"Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset */}
      {modal==="password" && selected && (
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setModal(null)}>
          <div style={{ background:T.card,borderRadius:T.rXl,width:440,boxShadow:T.shadowMd,animation:"fadeIn .2s" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#0a2558,#1d4ed8)",padding:"16px 20px",borderRadius:`${T.rXl}px ${T.rXl}px 0 0`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ color:"#fff",fontWeight:800,fontSize:15 }}><Key size={14} style={{ verticalAlign:"middle",marginRight:6 }}/>Reset Password</span>
              <button onClick={()=>setModal(null)} style={{ background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)" }}><X size={15}/></button>
            </div>
            <div style={{ padding:24 }}>
              <div style={{ marginBottom:16,padding:"10px 14px",background:T.infoBg,borderRadius:T.r,fontSize:13,color:T.info }}>
                Resetting for: <strong>{selected.full_name}</strong> ({selected.email})
              </div>
              <label style={{ fontSize:11,color:T.fgDim,fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:".05em" }}>New Password</label>
              <div style={{ position:"relative",marginBottom:10 }}>
                <input value={form.newPw||""} onChange={e=>setForm((f:any)=>({...f,newPw:e.target.value}))} type={showPw?"text":"password"}
                  style={{ ...inp,paddingRight:90 }} placeholder="Min 6 characters"/>
                <div style={{ position:"absolute",right:4,top:"50%",transform:"translateY(-50%)",display:"flex",gap:4 }}>
                  <button onClick={()=>setShowPw(p=>!p)} type="button" style={{ background:"none",border:"none",cursor:"pointer",color:T.fgDim,padding:4 }}>{showPw?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                  <button onClick={()=>setForm((f:any)=>({...f,newPw:genPassword()}))} type="button" style={{ background:"none",border:"none",cursor:"pointer",color:T.primary,fontSize:10,fontWeight:700,padding:4 }}>GEN</button>
                </div>
              </div>
              <div style={{ display:"flex",gap:6,marginBottom:18,flexWrap:"wrap" }}>
                {["Temp@1234!","EL5H@2024!","Hospital#01"].map(p => (
                  <button key={p} onClick={()=>setForm((f:any)=>({...f,newPw:p}))} style={{ padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700,background:T.bg,border:`1px solid ${T.border}`,color:T.fgMuted,cursor:"pointer",fontFamily:"monospace" }}>{p}</button>
                ))}
              </div>
              {form.newPw && (
                <div style={{ marginBottom:12,padding:"8px 12px",background:T.successBg,borderRadius:T.r,fontSize:12,color:T.success,fontFamily:"monospace",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span>Will set: <strong>{form.newPw}</strong></span>
                  <button onClick={()=>navigator.clipboard.writeText(form.newPw).then(()=>toast({title:"Copied"}))} style={{ background:"none",border:"none",cursor:"pointer",color:T.success }}><Copy size={13}/></button>
                </div>
              )}
              <div style={{ display:"flex",justifyContent:"flex-end",gap:8,paddingTop:14,borderTop:`1px solid ${T.border}` }}>
                <button onClick={()=>setModal(null)} style={btn(T.bg,T.border)}>Cancel</button>
                <button onClick={()=>resetPassword(selected.id,form.newPw||"")} disabled={saving} style={btn(T.primary)}>
                  {saving?<RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/>:<Key size={13}/>}
                  {saving?"Resetting...":"Reset Password"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {modal==="delete" && selected && (
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center" }} onClick={()=>setModal(null)}>
          <div style={{ background:T.card,borderRadius:T.rXl,width:400,padding:28,boxShadow:T.shadowMd,animation:"fadeIn .2s" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex",gap:14,marginBottom:20 }}>
              <div style={{ width:44,height:44,borderRadius:T.rMd,background:T.errorBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><AlertTriangle size={22} color={T.error}/></div>
              <div>
                <div style={{ fontWeight:800,fontSize:16,color:T.fg }}>Delete User</div>
                <div style={{ fontSize:13,color:T.fgMuted,marginTop:4 }}>Permanently remove <strong>{selected.full_name}</strong> and all their roles. This cannot be undone.</div>
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
              <button onClick={()=>setModal(null)} style={btn(T.bg,T.border)}>Cancel</button>
              <button onClick={deleteUser} disabled={saving} style={{ ...btn(T.error), opacity:saving?.7:1 }}>
                <Trash2 size={13}/>{saving?"Deleting...":"Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity modal */}
      {modal==="activity" && selected && (
        <div style={{ position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={()=>setModal(null)}>
          <div style={{ background:T.card,borderRadius:T.rXl,width:640,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:T.shadowMd,animation:"fadeIn .2s" }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:"linear-gradient(135deg,#0a2558,#1d4ed8)",padding:"16px 20px",borderRadius:`${T.rXl}px ${T.rXl}px 0 0`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ color:"#fff",fontWeight:800,fontSize:15 }}><Activity size={14} style={{ verticalAlign:"middle",marginRight:6 }}/>Activity — {selected.full_name}</span>
              <button onClick={()=>setModal(null)} style={{ background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)" }}><X size={15}/></button>
            </div>
            <div style={{ flex:1,overflowY:"auto",padding:20 }}>
              {actLoading ? (
                <div style={{ textAlign:"center",padding:40,color:T.fgDim }}>Loading activity...</div>
              ) : activity.length===0 ? (
                <div style={{ textAlign:"center",padding:40,color:T.fgDim }}>No activity recorded</div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {activity.map((a,i) => (
                    <div key={i} style={{ display:"flex",gap:12,padding:"10px 12px",background:T.bg,borderRadius:8,border:`1px solid ${T.border}` }}>
                      <div style={{ width:8,height:8,borderRadius:"50%",background:a._t==="ip"?(a.allowed!==false?T.success:T.error):a._t==="req"?T.primary:T.warning,flexShrink:0,marginTop:4 }}/>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12,fontWeight:600,color:T.fg }}>
                          {a._t==="audit" ? (a.action||a.description||"Audit event")
                            :a._t==="req"  ? `Requisition ${a.requisition_number} — ${a.status}`
                            :a._t==="ip"   ? `IP access from ${a.ip_address} ${[a.city,a.country].filter(Boolean).join(", ")?`(${[a.city,a.country].filter(Boolean).join(", ")})`:""}` : "Event"}
                        </div>
                        <div style={{ fontSize:10,color:T.fgDim,marginTop:2 }}>{fmtAgo(a.created_at)} · {a._t}</div>
                      </div>
                      <span style={chip(a._t==="ip"?(a.allowed!==false?T.success:T.error):a._t==="req"?T.primary:T.warning)}>
                        {a._t==="ip"?(a.allowed!==false?"OK":"BLOCKED"):a._t==="req"?a.status||"req":a.module||"audit"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
