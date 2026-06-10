import type React from "react";
/**
 * EL5 MediProcure — Create User v10
 * Classic ERP style
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";
import { invalidateDropdownCache } from "@/hooks/useCachedDropdown";

const ROLES = [
  "superadmin","webmaster","admin","database_admin",
  "procurement_manager","procurement_officer","inventory_manager",
  "warehouse_officer","requisitioner","accountant",
];

const DEPARTMENTS = [
  "Finance & Accounts","Procurement","Pharmacy","Nursing","Medical",
  "Laboratory","Radiology","ICT","Administration","Records","Maintenance",
];

export default function AdminCreateUserPage() {
  const [email, setEmail] = useState("");
  const [password, setPwd] = useState("");
  const [fullName, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDept] = useState("");
  const [roles, setRoles] = useState<string[]>(["requisitioner"]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<any>(null);

  const gen = () => {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    setPwd(Array.from({length:12},()=>c[Math.floor(Math.random()*c.length)]).join(""));
  };

  const toggleRole = (r: string) => setRoles(rs => rs.includes(r) ? rs.filter(x=>x!==r) : [...rs,r]);

  const submit = async () => {
    if(!email||!password){ toast({title:"Email & password required",variant:"destructive"}); return; }
    if(password.length<8){ toast({title:"Password must be 8+ chars",variant:"destructive"}); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).functions.invoke("admin-create-user",{
      body:{ email:email.trim().toLowerCase(), password, full_name:fullName, phone, department, roles },
    });
    setBusy(false);
    if(error||data?.error){
      toast({title:"Failed",description:error?.message||data?.error||"Unknown error",variant:"destructive"}); return;
    }
    invalidateDropdownCache("profiles");
    invalidateDropdownCache("user_roles");
    setDone({email,password,roles});
    toast({title:"✓ User created",description:`${email} · roles: ${roles.join(", ")}`});
    setEmail(""); setPwd(""); setName(""); setPhone(""); setDept(""); setRoles(["requisitioner"]);
  };

  const inp: React.CSSProperties = { ...erpStyles.inp, width:"100%", boxSizing:"border-box" };

  return (
    <div style={{ background:"#f0f0f0", minHeight:"100vh", fontFamily:ERP.fontFamily, fontSize:12 }}>
      {/* Title */}
      <div style={{ background:ERP.titleBar, color:"#fff", padding:"5px 10px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>👤</span>
          <div>
            <div>EL5 MediProcure — Create System User</div>
            <div style={{ fontSize:10, fontWeight:400, opacity:.85 }}>Embu Level 5 Hospital · User Management</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {["0","1","r"].map(c=><div key={c} style={{ width:16,height:14,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#333",fontWeight:700 }}>{c}</div>)}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background:"#f5f5f5", borderBottom:"1px solid #ccc", padding:"2px 8px", display:"flex", gap:16, fontSize:12 }}>
        {["File","View","Help"].map(m=>(
          <span key={m} style={{ cursor:"pointer", padding:"2px 4px" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><u>{m[0]}</u>{m.slice(1)}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, padding:"5px 10px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:28,height:28,background:"linear-gradient(135deg,#1a3580,#2a4fa3)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:14 }}>🏥</span>
          </div>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a3580" }}>System Administration</span>
        </div>
        <span style={{ marginLeft:"auto", fontSize:11, color:"#666" }}>Creates an auth account, profile row, and assigns roles instantly.</span>
      </div>

      {/* Form */}
      <div style={{ margin:12, maxWidth:860 }}>
        <div style={{ background:"#fff", border:"1px solid #ccc" }}>
          <div style={{ background:ERP.sidebarHeader, color:"#fff", padding:"5px 10px", fontSize:11, fontWeight:700 }}>
            👤 New User Registration — EL5 MediProcure System
          </div>
          <div style={{ padding:16 }}>

            {/* Basic Info */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid #e0e0e0", paddingBottom:4, marginBottom:10 }}>Basic Information</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Email Address *</label>
                  <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="user@el5hospital.go.ke"/>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Full Name</label>
                  <input value={fullName} onChange={e=>setName(e.target.value)} style={inp} placeholder="e.g. John Mwangi"/>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Phone Number</label>
                  <input value={phone} onChange={e=>setPhone(e.target.value)} style={inp} placeholder="+254 722 000 000"/>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Department</label>
                  <select value={department} onChange={e=>setDept(e.target.value)} style={inp}>
                    <option value="">— Select Department —</option>
                    {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Password * (min 8 chars)</label>
                  <div style={{ display:"flex", gap:4 }}>
                    <input value={password} onChange={e=>setPwd(e.target.value)} style={inp} placeholder="Enter password"/>
                    <button type="button" onClick={gen} style={{ ...erpStyles.btn(false), whiteSpace:"nowrap" }}>Generate</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Role Assignment */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#555", textTransform:"uppercase", letterSpacing:"0.05em", borderBottom:"1px solid #e0e0e0", paddingBottom:4, marginBottom:10 }}>Role Assignment (select one or more)</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {ROLES.map(r=>{
                  const on = roles.includes(r);
                  return (
                    <button key={r} type="button" onClick={()=>toggleRole(r)} style={{
                      ...erpStyles.btn(on),
                      background: on ? ERP.tabActive : ERP.tabInactive,
                      color: on ? "#fff" : "#333",
                      border: `1px solid ${on ? ERP.tabActiveBorder : ERP.toolbarBorder}`,
                      borderRadius: 2,
                      padding: "3px 10px",
                    }}>
                      {on ? "✓ " : ""}{r.replace(/_/g," ")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ borderTop:"1px solid #e0e0e0", paddingTop:12, display:"flex", gap:8 }}>
              <button onClick={submit} disabled={busy} style={{ ...erpStyles.btn(true), opacity:busy?0.5:1 }}>
                {busy ? "⏳ Creating..." : "💾 Create User Account"}
              </button>
              <button onClick={()=>{ setEmail(""); setPwd(""); setName(""); setPhone(""); setDept(""); setRoles(["requisitioner"]); }} style={erpStyles.btn(false)}>
                Clear Form
              </button>
            </div>

            {done && (
              <div style={{ marginTop:12, padding:"8px 12px", background:"#e8f5e9", border:"1px solid #4caf50", fontSize:12, color:"#1b5e20" }}>
                ✓ User created successfully: <strong>{done.email}</strong> — Roles: {done.roles.join(", ")}. User can sign in immediately.
              </div>
            )}
          </div>
        </div>

        {/* Activity Stats panel */}
        <div style={{ marginTop:8, background:"#fff", border:"1px solid #ccc" }}>
          <div style={{ background:ERP.sidebarHeader, color:"#fff", padding:"5px 10px", fontSize:11, fontWeight:700 }}>
            📊 User Activity Stats
          </div>
          <div style={{ padding:12 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {[
                {label:"Active Sessions",val:"—",col:"#007700"},
                {label:"Total Users",val:"—",col:"#2255cc"},
                {label:"Admins",val:"—",col:"#cc6600"},
                {label:"Recent Logins (24h)",val:"—",col:"#1a1a1a"},
              ].map(s=>(
                <div key={s.label} style={{ padding:"8px 10px", background:"#f9f9f9", border:"1px solid #e0e0e0" }}>
                  <div style={{ fontWeight:800, fontSize:18, color:s.col }}>{s.val}</div>
                  <div style={{ fontSize:10, color:"#666", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

