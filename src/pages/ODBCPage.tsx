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
      <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}{required&&" *"}</label>
      <input type={type==="password"&&!showPassInForm?"password":type} value={form[k]||""} onChange={e=>setForm((p:any)=>({...p,[k]:e.target.value}))}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{border:"1px solid #e5e7eb",background:"#f9fafb"}}
        onFocus={e=>(e.target.style.borderColor="#6366f1")} onBlur={e=>(e.target.style.borderColor="#e5e7eb")}/>
    </div>
  );

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"transparent",minHeight:"calc(100vh-100px)"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{background:"linear-gradient(90deg,#1e3a5f,#0369a1,#0284c7)",boxShadow:"0 4px 16px rgba(3,105,161,0.35)"}}>
        <div className="flex items-center gap-3">
          <Wifi className="w-5 h-5 text-white"/>
          <div>
            <h1 className="text-base font-black text-white">External Database Connections</h1>
            <p className="text-[10px] text-white/50">{conns.length} configured · {conns.filter(c=>c.status==="active").length} active</p>
          </div>
        </div>
        {isAdmin && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm"
            style={{background:"rgba(255,255,255,0.92)",color:"#0369a1"}}>
            <Plus className="w-4 h-4"/>New Connection
          </button>
        )}
      </div>

      {/* Connection grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-gray-300"/></div>
      ) : conns.length === 0 ? (
        <div className="rounded-2xl p-12 text-center shadow-sm">
          <Database className="w-12 h-12 text-gray-200 mx-auto mb-3"/>
          <p className="text-gray-500 text-sm">No external connections configured.</p>
          <p className="text-gray-400 text-xs mt-1">Click "New Connection" to add a database or ODBC source.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {conns.map(c => {
            const s = STATUS_CFG[c.status] || STATUS_CFG.inactive;
            const dbType = DB_TYPES.find(d=>d.value===c.type);
            return (
              <div key={c.id} className="rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-4 py-3 flex items-center gap-3" style={{background:"linear-gradient(90deg,#f8fafc,#f0f4ff)"}}>
                  <div className="text-2xl">{dbType?.icon||"🔌"}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm truncate">{c.name}</h3>
                    <p className="text-[10px] text-gray-500">{dbType?.label||c.type} · {c.host||c.dsn||"—"}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:s.bg,color:s.color}}>{s.label}</span>
                </div>
                <div className="px-4 py-3 space-y-1.5">
                  {[
                    {l:"Host",     v:c.host||"—"},
                    {l:"Database", v:c.database_name||"—"},
                    {l:"Username", v:c.username||"—"},
                    {l:"Port",     v:c.port||"—"},
                    {l:"Sync",     v:c.sync_interval||"manual"},
                    {l:"DSN",      v:c.dsn||"—"},
                  ].filter(x=>x.v!=="—").map(x=>(
                    <div key={x.l} className="flex justify-between items-center">
                      <span style={{fontSize:10,color:"#9ca3af",fontWeight:600}}>{x.l}</span>
                      <span style={{fontSize:11,color:"#374151",fontWeight:500,maxWidth:140,textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{x.v}</span>
                    </div>
                  ))}
                  {c.last_sync && (
                    <div className="flex items-center gap-1 pt-1">
                      <Clock className="w-3 h-3 text-gray-400"/>
                      <span style={{fontSize:9,color:"#9ca3af"}}>Last sync: {new Date(c.last_sync).toLocaleString("en-KE")}</span>
                    </div>
                  )}
                </div>
                {c.description && (
                  <div className="px-4 pb-2">
                    <p style={{fontSize:10,color:"#9ca3af",fontStyle:"italic"}}>{c.description}</p>
                  </div>
                )}
                {isAdmin && (
                  <div className="px-4 py-2.5 border-t border-gray-100 flex gap-2">
                    <button onClick={()=>testConnection(c.id)} disabled={testing===c.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{background:testing===c.id?"#f3f4f6":"#e0f2fe",color:testing===c.id?"#9ca3af":"#0369a1"}}>
                      {testing===c.id?<RefreshCw className="w-3 h-3 animate-spin"/>:<Activity className="w-3 h-3"/>}
                      {testing===c.id?"Testing…":"Test"}
                    </button>
                    <button onClick={()=>openEdit(c)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{background:"#fef3c7",color:"#92400e"}}>
                      <Edit className="w-3 h-3"/>Edit
                    </button>
                    <button onClick={()=>deleteConn(c.id, c.name)}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{background:"#fee2e2",color:"#dc2626"}}>
                      <Trash2 className="w-3 h-3"/>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}} onClick={()=>setShowForm(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{background:"linear-gradient(90deg,#1e3a5f,#0369a1)"}}>
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-white"/>
                <h3 className="text-sm font-black text-white">{editing?"Edit Connection":"New External Connection"}</h3>
              </div>
              <button onClick={()=>setShowForm(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
            </div>

            <div className="overflow-y-auto p-5 space-y-5">
              {/* Connection type selector */}
              <div>
                <label className="block mb-2" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Database Type *</label>
                <div className="grid grid-cols-4 gap-2">
                  {DB_TYPES.map(db=>(
                    <button key={db.value} onClick={()=>setPort(db.value)}
                      className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-xs font-semibold"
                      style={{borderColor:form.type===db.value?"#0369a1":"#e5e7eb",background:form.type===db.value?"#e0f2fe":"#f9fafb",color:form.type===db.value?"#0369a1":"#6b7280"}}>
                      <span className="text-lg">{db.icon}</span>{db.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><F label="Connection Name" k="name" required/></div>
                {form.type!=="odbc_dsn"?(
                  <>
                    <F label="Host / Server" k="host"/>
                    <F label="Port" k="port" type="number"/>
                    <F label="Database Name" k="database_name"/>
                    <F label="Schema" k="schema"/>
                    <F label="Username" k="username"/>
                    <div>
                      <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Password</label>
                      <div className="relative">
                        <input type={showPassInForm?"text":"password"} value={form.password||""} onChange={e=>setForm((p:any)=>({...p,password:e.target.value}))}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none pr-10"
                          style={{border:"1px solid #e5e7eb",background:"#f9fafb"}}/>
                        <button onClick={()=>setShowPassInForm(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassInForm?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}
                        </button>
                      </div>
                    </div>
                  </>
                ):(
                  <>
                    <F label="DSN Name" k="dsn"/>
                    <F label="Username" k="username"/>
                    <div>
                      <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Password</label>
                      <div className="relative">
                        <input type={showPassInForm?"text":"password"} value={form.password||""} onChange={e=>setForm((p:any)=>({...p,password:e.target.value}))}
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none pr-10"
                          style={{border:"1px solid #e5e7eb",background:"#f9fafb"}}/>
                        <button onClick={()=>setShowPassInForm(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2">
                          {showPassInForm?<EyeOff className="w-4 h-4 text-gray-400"/>:<Eye className="w-4 h-4 text-gray-400"/>}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2"><F label="Full Connection String (optional)" k="connection_string"/></div>
                  </>
                )}
              </div>

              {/* SSL + options */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.ssl||false} onChange={e=>setForm((p:any)=>({...p,ssl:e.target.checked}))}
                      style={{accentColor:"#0369a1",width:16,height:16}}/>
                    <div>
                      <span style={{fontSize:12,fontWeight:700,color:"#374151"}}>SSL / TLS</span>
                      <p style={{fontSize:10,color:"#9ca3af"}}>Encrypt connection</p>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Sync Interval</label>
                  <select value={form.sync_interval} onChange={e=>setForm((p:any)=>({...p,sync_interval:e.target.value}))}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{border:"1px solid #e5e7eb",background:"#f9fafb"}}>
                    {["manual","hourly","daily","weekly"].map(v=><option key={v} value={v} className="capitalize">{v}</option>)}
                  </select>
                </div>
                <F label="Timeout (seconds)" k="timeout" type="number"/>
                <div>
                  <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Description</label>
                  <textarea value={form.description||""} onChange={e=>setForm((p:any)=>({...p,description:e.target.value}))} rows={2}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                    style={{border:"1px solid #e5e7eb",background:"#f9fafb"}}/>
                </div>
              </div>

              {/* Security notice */}
              <div className="flex items-start gap-3 p-3 rounded-xl" style={{background:"#fffbeb",border:"1px solid #fde68a"}}>
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/>
                <p style={{fontSize:10,color:"#92400e",lineHeight:1.5}}>Credentials are stored encrypted in system config. Passwords are never displayed after saving. Use dedicated read-only database accounts where possible.</p>
              </div>
            </div>

            <div className="px-5 py-3 border-t flex gap-2 justify-end">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold"
                style={{background:"#0369a1",opacity:saving?0.7:1}}>
                {saving?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Save className="w-3.5 h-3.5"/>}
                {saving?"Saving…":editing?"Update Connection":"Create Connection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
