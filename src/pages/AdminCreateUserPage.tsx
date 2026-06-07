/**
 * AdminCreateUserPage — admin-only UI to invoke admin-create-user edge function.
 * Creates auth user + profile + roles in a single call.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { UserPlus, RefreshCw, Check } from "lucide-react";
import { invalidateDropdownCache } from "@/hooks/useCachedDropdown";

const ROLES = [
  "superadmin","webmaster","admin","database_admin",
  "procurement_manager","procurement_officer","inventory_manager",
  "warehouse_officer","requisitioner","accountant",
];

export default function AdminCreateUserPage() {
  const [email, setEmail]     = useState("");
  const [password, setPwd]    = useState("");
  const [fullName, setName]   = useState("");
  const [phone, setPhone]     = useState("");
  const [department, setDept] = useState("");
  const [roles, setRoles]     = useState<string[]>(["requisitioner"]);
  const [busy, setBusy]       = useState(false);
  const [done, setDone]       = useState<any>(null);

  const gen = () => {
    const c = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    setPwd(Array.from({length:12},()=>c[Math.floor(Math.random()*c.length)]).join(""));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title:"Email & password required", variant:"destructive" }); return; }
    if (password.length < 8)  { toast({ title:"Password must be 8+ chars", variant:"destructive" }); return; }
    setBusy(true);
    const { data, error } = await (supabase as any).functions.invoke("admin-create-user", {
      body: { email: email.trim().toLowerCase(), password, full_name: fullName, phone, department, roles },
    });
    setBusy(false);
    if (error || data?.error) {
      toast({ title:"Failed", description: (error?.message || data?.error || "Unknown error"), variant:"destructive" });
      return;
    }
    invalidateDropdownCache("profiles");
    invalidateDropdownCache("user_roles");
    setDone({ email, password, roles });
    toast({ title:"User created", description:`${email} with roles: ${roles.join(", ")}` });
    setEmail(""); setPwd(""); setName(""); setPhone(""); setDept(""); setRoles(["requisitioner"]);
  };

  const toggleRole = (r: string) =>
    setRoles(rs => rs.includes(r) ? rs.filter(x=>x!==r) : [...rs, r]);

  const inp: React.CSSProperties = { width:"100%", padding:"9px 12px", border:`1px solid ${T.border}`, borderRadius:T.r, background:T.bg, color:"#111", fontSize:13, outline:"none", boxSizing:"border-box" };
  const lbl: React.CSSProperties = { display:"block", fontSize:11, fontWeight:700, color:T.fgMuted, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" };

  return (
    <div style={{ padding:24, background:T.bg, minHeight:"100vh" }}>
      <div style={{ maxWidth:720, margin:"0 auto" }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.fg, margin:"0 0 4px", display:"flex", alignItems:"center", gap:10 }}>
          <UserPlus size={22}/> Create User
        </h1>
        <p style={{ fontSize:12, color:T.fgMuted, margin:"0 0 18px" }}>
          Creates an auth account, profile row, and assigns roles instantly. New user can sign in immediately.
        </p>

        <form onSubmit={submit} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <label style={lbl}>Email *</label>
              <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
            </div>
            <div>
              <label style={lbl}>Full Name</label>
              <input style={inp} value={fullName} onChange={e=>setName(e.target.value)}/>
            </div>
            <div>
              <label style={lbl}>Password * (8+)</label>
              <div style={{ display:"flex", gap:6 }}>
                <input style={inp} value={password} onChange={e=>setPwd(e.target.value)} required minLength={8}/>
                <button type="button" onClick={gen} style={{ padding:"0 12px", background:T.bg2, border:`1px solid ${T.border}`, borderRadius:T.r, fontSize:12, fontWeight:700, color:T.fgMuted, cursor:"pointer" }}>Gen</button>
              </div>
            </div>
            <div>
              <label style={lbl}>Phone</label>
              <input style={inp} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+254…"/>
            </div>
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={lbl}>Department</label>
              <input style={inp} value={department} onChange={e=>setDept(e.target.value)}/>
            </div>
            <div style={{ gridColumn:"1 / -1" }}>
              <label style={lbl}>Roles (one or more) *</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {ROLES.map(r => {
                  const on = roles.includes(r);
                  return (
                    <button type="button" key={r} onClick={()=>toggleRole(r)} style={{
                      padding:"5px 11px", fontSize:11, fontWeight:700, borderRadius:99,
                      border:`1px solid ${on?T.primary:T.border}`,
                      background:on?T.primary:T.bg, color:on?"#fff":T.fgMuted, cursor:"pointer",
                    }}>{on && <Check size={10} style={{display:"inline",marginRight:4}}/>}{r}</button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ marginTop:18, display:"flex", justifyContent:"flex-end", gap:8 }}>
            <button type="submit" disabled={busy} style={{
              padding:"9px 20px", background:T.primary, color:"#fff", border:"none",
              borderRadius:T.r, fontSize:13, fontWeight:700, cursor:busy?"not-allowed":"pointer",
              opacity:busy?0.6:1, display:"inline-flex", alignItems:"center", gap:8,
            }}>
              {busy ? <RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/> : <UserPlus size={14}/>}
              {busy ? "Creating…" : "Create User"}
            </button>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </form>

        {done && (
          <div style={{ marginTop:16, background:"#d1fae5", border:"1px solid #10b981", borderRadius:T.r, padding:"12px 16px", color:"#064e3b", fontSize:13 }}>
            <b>✓ User created:</b> {done.email} — roles: {done.roles.join(", ")}.
            They can sign in now with the password you set.
          </div>
        )}
      </div>
    </div>
  );
}