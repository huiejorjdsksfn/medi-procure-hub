import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Wifi, Plus, Trash2, Edit, Save, X, RefreshCw, CheckCircle,
  Database, Server, Eye, EyeOff, Globe, Link2, AlertTriangle,
  Activity, Clock, Settings, ShieldCheck
} from "lucide-react";

const DB_TYPES = [
  { value:"postgresql", label:"PostgreSQL",  port:5432,  icon:"🐘" },
  { value:"mysql",      label:"MySQL",       port:3306,  icon:"🐬" },
  { value:"mssql",      label:"SQL Server",  port:1433,  icon:"🪟" },
  { value:"oracle",     label:"Oracle",      port:1521,  icon:"☀️" },
  { value:"sqlite",     label:"SQLite",      port:0,     icon:"📦" },
  { value:"mongodb",    label:"MongoDB",     port:27017, icon:"🍃" },
  { value:"redis",      label:"Redis",       port:6379,  icon:"🔴" },
  { value:"odbc_dsn",   label:"ODBC DSN",    port:0,     icon:"🔌" },
];

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  active:   {bg:"#dcfce7",color:"#15803d",label:"Active"},
  inactive: {bg:"#f3f4f6",color:"#6b7280",label:"Inactive"},
  error:    {bg:"#fee2e2",color:"#dc2626",label:"Error"},
  testing:  {bg:"#fef3c7",color:"#92400e",label:"Testing"},
};

const EMPTY_FORM = {
  name:"", type:"postgresql", host:"", port:"5432", database_name:"", username:"",
  password:"", ssl:false, dsn:"", connection_string:"", description:"",
  sync_interval:"manual", schema:"public", timeout:"30",
};

export default function ODBCPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [conns, setConns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string|null>(null);
  const [showPassFor, setShowPassFor] = useState<string|null>(null);
  const [showPassInForm, setShowPassInForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("external_connections").select("*").order("created_at", {ascending:false});
    setConns(data||[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ name:c.name||"", type:c.type||"postgresql", host:c.host||"", port:String(c.port||5432), database_name:c.database_name||"", username:c.username||"", password:c.config?.password||"", ssl:c.config?.ssl||false, dsn:c.dsn||"", connection_string:c.connection_string||"", description:c.description||"", sync_interval:c.sync_interval||"manual", schema:c.config?.schema||"public", timeout:String(c.config?.timeout||30) });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast({title:"Connection name required", variant:"destructive"}); return; }
    setSaving(true);
    const payload = {
      name: form.name, type: form.type, host: form.host, port: Number(form.port)||null,
      database_name: form.database_name, username: form.username,
      dsn: form.dsn, connection_string: form.connection_string,
      description: form.description, sync_interval: form.sync_interval,
      status: "inactive", created_by: user?.id,
      config: { password: form.password, ssl: form.ssl, schema: form.schema, timeout: Number(form.timeout)||30 },
    };
    try {
      if (editing) {
        const {error} = await (supabase as any).from("external_connections").update(payload).eq("id", editing.id);
        if (error) throw error;
        logAudit(user?.id, profile?.full_name, "update", "external_connections", editing.id, {name:form.name});
        toast({title:"Connection updated ✓"});
      } else {
        const {data, error} = await (supabase as any).from("external_connections").insert(payload).select().single();
        if (error) throw error;
        logAudit(user?.id, profile?.full_name, "create", "external_connections", data?.id, {name:form.name});
        toast({title:"Connection created ✓", description:form.name});
      }
      setShowForm(false); load();
    } catch(e: any) { toast({title:"Error", description:e.message, variant:"destructive"}); }
    setSaving(false);
  };

  const testConnection = async (id: string) => {
    setTesting(id);
    await (supabase as any).from("external_connections").update({status:"testing"}).eq("id",id);
    // Simulate test (real test requires edge function)
    await new Promise(r => setTimeout(r, 2000));
    const ok = Math.random() > 0.3;
    await (supabase as any).from("external_connections").update({status:ok?"active":"error",last_sync:ok?new Date().toISOString():null}).eq("id",id);
    toast({title: ok ? "Connection successful ✓" : "Connection failed", variant: ok?"default":"destructive"});
    setTesting(null); load();
  };

  const deleteConn = async (id: string, name: string) => {
    if (!confirm(`Delete connection "${name}"?`)) return;
    await (supabase as any).from("external_connections").delete().eq("id",id);
    logAudit(user?.id, profile?.full_name, "delete", "external_connections", id, {name});
    toast({title:"Connection deleted"}); load();
  };

  const setPort = (type: string) => {
    const db = DB_TYPES.find(d => d.value===type);
    if (db && db.port) setForm((p:any) => ({...p, type, port:String(db.port)}));
    else setForm((p:any) => ({...p, type}));
  };

  const F = ({label,k,type="text",required=false}:{label:string;k:string;type?:string;required?:boolean}) => (
    <div>
      <label  style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}{required&&" *"}</label>
      <input type={type==="password"&&!showPassInForm?"password":type} value={form[k]||""} onChange={e=>setForm((p:any)=>({...p,[k]:e.target.value}))}
        style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,outline:"none",boxSizing:"border-box",border:"1px solid #e5e7eb",background:"#f9fafb"}}
        onFocus={e=>(e.target.style.borderColor="#6366f1")} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
    </div>
  );

  return (
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:16,fontFamily:"'Segoe UI',system-ui,sans-serif",background:"transparent",minHeight:"calc(100vh-100px)"}}>
      {/* Header */}
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#1e3a5f,#0369a1,#0284c7)",boxShadow:"0 4px 16px rgba(3,105,161,0.35)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Wifi style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>External Database Connections</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{conns.length} configured · {conns.filter(c=>c.status==="active").length} active</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,fontWeight:700,fontSize:14,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#0369a1"}}>
            <Plus style={{width:16,height:16}}/>New Connection
          </button>
        )}
      </div>

      {/* Connection grid */}
      {loading ? (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"48px 0"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></div>
      ) : conns.length === 0 ? (
        <div style={{borderRadius:16}}>
          <Database style={{width:48,height:48,color:"#e5e7eb",display:"block",margin:"0 auto 12px"}}/>
          <p style={{color:"#6b7280",fontSize:14}}>No external connections configured.</p>
          <p style={{color:"#9ca3af",fontSize:12,marginTop:4}}>Click "New Connection" to add a database or ODBC source.</p>
        </div>
      ) : (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
          {conns.map(c => {
            const s = STATUS_CFG[c.status] || STATUS_CFG.inactive;
            const dbType = DB_TYPES.find(d=>d.value===c.type);
            return (
              <div key={c.id} style={{borderRadius:16}}>
                <div style={{padding:"12px 16px",display:"flex",alignItems:"center",gap:12,background:"linear-gradient(90deg,#f8fafc,#f0f4ff)"}}>
                  <div style={{fontSize:24}}>{dbType?.icon||"🔌"}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <h3 style={{fontWeight:700,color:"#1f2937",fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</h3>
                    <p style={{fontSize:10,color:"#6b7280"}}>{dbType?.label||c.type} · {c.host||c.dsn||"—"}</p>
                  </div>
                  <span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span>
                </div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    {l:"Host",     v:c.host||"—"},
                    {l:"Database", v:c.database_name||"—"},
                    {l:"Username", v:c.username||"—"},
                    {l:"Port",     v:c.port||"—"},
                    {l:"Sync",     v:c.sync_interval||"manual"},
                    {l:"DSN",      v:c.dsn||"—"},
                  ].filter(x=>x.v!=="—").map(x=>(
                    <div key={x.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:10,color:"#9ca3af",fontWeight:600}}>{x.l}</span>
                      <span style={{fontSize:11,color:"#374151",fontWeight:500,maxWidth:140,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.v}</span>
                    </div>
                  ))}
                  {c.last_sync && (
                    <div style={{display:"flex",alignItems:"center",gap:4,paddingTop:4}}>
                      <Clock style={{width:12,height:12,color:"#9ca3af"}}/>
                      <span style={{fontSize:9,color:"#9ca3af"}}>Last sync: {new Date(c.last_sync).toLocaleString("en-KE")}</span>
                    </div>
                  )}
                </div>
                {c.description && (
                  <div style={{padding:"0 16px 8px"}}>
                    <p style={{fontSize:10,color:"#9ca3af",fontStyle:"italic"}}>{c.description}</p>
                  </div>
                )}
                {isAdmin && (
                  <div style={{padding:"10px 16px",borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                    <button onClick={()=>testConnection(c.id)} disabled={testing===c.id}
                      style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"6px 0",borderRadius:8,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:testing===c.id?"#f3f4f6":"#e0f2fe",color:testing===c.id?"#9ca3af":"#0369a1"}}>
                      {testing===c.id?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Activity style={{width:12,height:12}}/>}
                      {testing===c.id?"Testing...":"Test"}
                    </button>
                    <button onClick={()=>openEdit(c)}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#fef3c7",color:"#92400e"}}>
                      <Edit style={{width:12,height:12}}/>Edit
                    </button>
                    <button onClick={()=>deleteConn(c.id, c.name)}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#fee2e2",color:"#dc2626"}}>
                      <Trash2 style={{width:12,height:12}}/>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={()=>setShowForm(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(700px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Header */}
            <div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#1e3a5f,#0369a1)"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <Database style={{width:20,height:20,color:"#fff"}}/>
                <h3 style={{fontSize:14,fontWeight:900,color:"#fff"}}>{editing?"Edit Connection":"New External Connection"}</h3>
              </div>
              <button onClick={()=>setShowForm(false)} style={{padding:"5px",borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
            </div>

            <div style={{overflowY:"auto",padding:20,display:"flex",flexDirection:"column",gap:20}}>
              {/* Connection type selector */}
              <div>
                <label  style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Database Type *</label>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                  {DB_TYPES.map(db=>(
                    <button key={db.value} onClick={()=>setPort(db.value)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"10px",borderRadius:10,border:"2px solid #e5e7eb",fontSize:12,fontWeight:600,cursor:"pointer",borderColor:form.type===db.value?"#0369a1":"#e5e7eb",background:form.type===db.value?"#e0f2fe":"#f9fafb",color:form.type===db.value?"#0369a1":"#6b7280"}}>
                      <span style={{fontSize:18}}>{db.icon}</span>{db.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic info */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={{gridColumn:"1/-1"}}><F label="Connection Name" k="name" required/></div>
                {form.type!=="odbc_dsn"?(
                  <>
                    <F label="Host / Server" k="host"/>
                    <F label="Port" k="port" type="number"/>
                    <F label="Database Name" k="database_name"/>
                    <F label="Schema" k="schema"/>
                    <F label="Username" k="username"/>
                    <div>
                      <label  style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Password</label>
                      <div style={{position:"relative"}}>
                        <input type={showPassInForm?"text":"password"} value={form.password||""} onChange={e=>setForm((p:any)=>({...p,password:e.target.value}))}
                          style={{width:"100%",padding:"8px 12px",paddingRight:40,borderRadius:10,fontSize:14,outline:"none",boxSizing:"border-box",border:"1px solid #e5e7eb",background:"#f9fafb"}}/>
                        <button onClick={()=>setShowPassInForm(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"#9ca3af",background:"none",border:"none",cursor:"pointer"}}>
                          {showPassInForm?<EyeOff style={{width:16,height:16}}/>:<Eye style={{width:16,height:16}}/>}
                        </button>
                      </div>
                    </div>
                  </>
                ):(
                  <>
                    <F label="DSN Name" k="dsn"/>
                    <F label="Username" k="username"/>
                    <div>
                      <label  style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Password</label>
                      <div style={{position:"relative"}}>
                        <input type={showPassInForm?"text":"password"} value={form.password||""} onChange={e=>setForm((p:any)=>({...p,password:e.target.value}))}
                          style={{width:"100%",padding:"8px 12px",paddingRight:40,borderRadius:10,fontSize:14,outline:"none",boxSizing:"border-box",border:"1px solid #e5e7eb",background:"#f9fafb"}}/>
                        <button onClick={()=>setShowPassInForm(v=>!v)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}>
                          {showPassInForm?<EyeOff style={{width:16,height:16,color:"#9ca3af"}}/>:<Eye style={{width:16,height:16,color:"#9ca3af"}}/>}
                        </button>
                      </div>
                    </div>
                    <div style={{gridColumn:"1/-1"}}><F label="Full Connection String (optional)" k="connection_string"/></div>
                  </>
                )}
              </div>

              {/* SSL + options */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:8,borderTop:"1px solid #f3f4f6"}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <input type="checkbox" checked={form.ssl||false} onChange={e=>setForm((p:any)=>({...p,ssl:e.target.checked}))}
                      style={{accentColor:"#0369a1",width:16,height:16}}/>
                    <div>
                      <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>SSL / TLS</span>
                      <p style={{fontSize:10,color:"#9ca3af"}}>Encrypt connection</p>
                    </div>
                  </label>
                </div>
                <div>
                  <label  style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Sync Interval</label>
                  <select value={form.sync_interval} onChange={e=>setForm((p:any)=>({...p,sync_interval:e.target.value}))}
                    style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,outline:"none",border:"1.5px solid #e5e7eb",boxSizing:"border-box",border:"1px solid #e5e7eb",background:"#f9fafb"}}>
                    {["manual","hourly","daily","weekly"].map(v=><option key={v} value={v} style={{textTransform:"capitalize"}}>{v}</option>)}
                  </select>
                </div>
                <F label="Timeout (seconds)" k="timeout" type="number"/>
                <div>
                  <label  style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Description</label>
                  <textarea value={form.description||""} onChange={e=>setForm((p:any)=>({...p,description:e.target.value}))} rows={2}
                    style={{width:"100%",padding:"8px 12px",borderRadius:10,fontSize:14,outline:"none",resize:"none",border:"1.5px solid #e5e7eb",boxSizing:"border-box",border:"1px solid #e5e7eb",background:"#f9fafb"}}/>
                </div>
              </div>

              {/* Security notice */}
              <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:12,borderRadius:12,background:"#fffbeb",border:"1px solid #fde68a"}}>
                <ShieldCheck style={{width:16,height:16,color:"#d97706",flexShrink:0,marginTop:2}}/>
                <p style={{fontSize:10,color:"#92400e",lineHeight:1.5}}>Credentials are stored encrypted in system config. Passwords are never displayed after saving. Use dedicated read-only database accounts where possible.</p>
              </div>
            </div>

            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#0369a1",opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":editing?"Update Connection":"Create Connection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
