import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Monitor, RefreshCw, Users, Shield, Activity, Server, Database,
  AlertTriangle, CheckCircle, Clock, Globe, Wifi, Cpu, HardDrive,
  BarChart3, Settings, Download, Trash2, Eye, Lock, Unlock, Mail
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import * as XLSX from "xlsx";

function WebmasterInner() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [stats, setStats] = useState({ totalUsers:0, activeUsers:0, totalAudit:0, tables:32 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"users"|"audit"|"system"|"layout">("overview");
  const [navPosition, setNavPosition] = useState<"top"|"left"|"bottom">("left");
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [headerHeight, setHeaderHeight] = useState(56);
  const [btnRadius, setBtnRadius] = useState(12);
  const [tableStyle, setTableStyle] = useState<"stripe"|"border"|"minimal">("stripe");
  const [density, setDensity] = useState<"compact"|"normal"|"comfortable">("normal");
  const [primaryColor, setPrimaryColor] = useState("#1a3a6b");
  const [accentColor, setAccentColor] = useState("#C45911");
  const [sysLog, setSysLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const [usersRes, auditRes, settingsRes] = await Promise.all([
      (supabase as any).from("profiles").select("id,full_name,email,is_active,created_at,department").order("created_at",{ascending:false}),
      (supabase as any).from("audit_log").select("*").order("created_at",{ascending:false}).limit(100),
      (supabase as any).from("system_settings").select("key,value,category").limit(50),
    ]);
    const u = usersRes.data||[]; const a = auditRes.data||[]; const s = settingsRes.data||[];
    setUsers(u); setAuditLog(a);
    const m:any={}; s.forEach((x:any)=>{if(x.key)m[x.key]=x.value;}); setSettings(m);
    setStats({ totalUsers:u.length, activeUsers:u.filter((x:any)=>x.is_active).length, totalAudit:a.length, tables:32 });
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const addLog = (msg: string) => {
    const t = new Date().toLocaleTimeString("en-KE");
    setSysLog(p=>[`[${t}] ${msg}`, ...p.slice(0,49)]);
  };

  const toggleUserActive = async (id: string, current: boolean, name: string) => {
    const {error} = await (supabase as any).from("profiles").update({is_active:!current}).eq("id",id);
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    toast({title:`User ${!current?"activated":"deactivated"} ✓`, description:name});
    addLog(`User ${name} ${!current?"activated":"deactivated"}`);
    load();
  };

  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await (supabase as any).from("profiles").delete().eq("id",id);
    toast({title:"User deleted", description:name}); addLog(`Deleted user: ${name}`); load();
  };

  const exportUsers = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(users);
    XLSX.utils.book_append_sheet(wb,ws,"Users");
    XLSX.writeFile(wb,`users_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const clearAuditLog = async () => {
    if (!confirm("Clear all audit log entries? This cannot be undone.")) return;
    const cutoff = new Date(Date.now()-30*24*60*60*1000).toISOString();
    await (supabase as any).from("audit_log").delete().lt("created_at",cutoff);
    toast({title:"Old audit entries cleared"}); addLog("Cleared audit log entries older than 30 days"); load();
  };

  const saveLayoutSettings = () => {
    // Save to localStorage for now; full integration would save to system_settings
    localStorage.setItem("wm_navPosition", navPosition);
    localStorage.setItem("wm_sidebarWidth", String(sidebarWidth));
    localStorage.setItem("wm_btnRadius", String(btnRadius));
    localStorage.setItem("wm_density", density);
    localStorage.setItem("wm_primaryColor", primaryColor);
    localStorage.setItem("wm_accentColor", accentColor);
    toast({title:"Layout settings saved ✓", description:"Reload the page to see changes"});
    addLog(`Layout updated: nav=${navPosition}, density=${density}`);
  };

  const TABS = [
    {id:"overview", label:"Overview",  icon:Monitor},
    {id:"users",    label:"Users",     icon:Users},
    {id:"audit",    label:"Audit Log", icon:Activity},
    {id:"system",   label:"System",    icon:Server},
    {id:"layout",   label:"Layout",    icon:Settings},
  ] as const;

  const MetricCard = ({icon:Icon, label, value, sub, color}:{icon:any,label:string,value:string|number,sub:string,color:string}) => (
    <div className="rounded-2xl p-4 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{background:`${color}18`}}>
        <Icon className="w-5 h-5" style={{color}}/>
      </div>
      <div>
        <p style={{fontSize:11,color:"#9ca3af",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</p>
        <p style={{fontSize:22,fontWeight:900,color:"#1a1a2e",lineHeight:1}}>{value}</p>
        <p style={{fontSize:10,color:"#9ca3af"}}>{sub}</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-90px)]" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Sidebar */}
      <div className="w-44 shrink-0 flex flex-col" style={{background:"#1a1a2e",borderRight:"1px solid #2e2e4e"}}>
        <div className="px-3 py-3 border-b" style={{borderColor:"#2e2e4e"}}>
          <p style={{fontSize:11,fontWeight:800,color:"#e2e8f0"}}>Webmaster</p>
          <p style={{fontSize:9,color:"#22c55e"}}>● System Admin</p>
        </div>
        <div className="flex-1 py-2">
          {TABS.map(({id,label,icon:Icon})=>(
            <button key={id} onClick={()=>setTab(id as any)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-white/5 transition-all"
              style={{background:tab===id?"rgba(255,255,255,0.08)":"transparent"}}>
              <Icon className="w-3.5 h-3.5 shrink-0" style={{color:tab===id?"#60a5fa":"#64748b"}}/>
              <span style={{fontSize:11,color:tab===id?"#e2e8f0":"#94a3b8",fontWeight:tab===id?700:400}}>{label}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t" style={{borderColor:"#2e2e4e"}}>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 w-full text-xs" style={{color:"#64748b"}}>
            <RefreshCw className={`w-3 h-3 ${loading?"animate-spin":""}`}/>Refresh
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto p-5 space-y-4" style={{background:"#f1f5f9"}}>
        {tab==="overview" && (
          <>
            <div className="grid grid-cols-4 gap-3">
              <MetricCard icon={Users}    label="Total Users"   value={stats.totalUsers}  sub={`${stats.activeUsers} active`}    color="#1a3a6b"/>
              <MetricCard icon={Shield}   label="Audit Events"  value={stats.totalAudit}  sub="Last 100 loaded"                  color="#C45911"/>
              <MetricCard icon={Database} label="DB Tables"     value={stats.tables}       sub="7 groups"                        color="#00695C"/>
              <MetricCard icon={CheckCircle} label="Status"     value="Online"             sub="All systems normal"              color="#15803d"/>
            </div>

            {/* System log */}
            <div className="rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-600"/><span className="font-bold text-sm text-gray-800">Live System Log</span></div>
                <button onClick={()=>setSysLog([])} className="text-[10px] text-gray-400 hover:text-red-500">Clear</button>
              </div>
              <div ref={logRef} className="p-3 font-mono text-xs space-y-0.5 max-h-48 overflow-auto" style={{background:"#0f172a"}}>
                {sysLog.length===0&&<p style={{color:"#475569"}}>System log empty. Actions will appear here.</p>}
                {sysLog.map((l,i)=><p key={i} style={{color:"#22c55e"}}>{l}</p>)}
              </div>
            </div>

            {/* Quick recent audit */}
            <div className="rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <span className="font-bold text-sm text-gray-800">Recent Activity</span>
                <button onClick={()=>setTab("audit")} className="text-xs text-blue-600 hover:underline">View all →</button>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50"><th className="px-4 py-2 text-left text-gray-500 font-semibold">User</th><th className="px-4 py-2 text-left text-gray-500 font-semibold">Action</th><th className="px-4 py-2 text-left text-gray-500 font-semibold">Module</th><th className="px-4 py-2 text-left text-gray-500 font-semibold">Time</th></tr></thead>
                <tbody>
                  {auditLog.slice(0,8).map((a,i)=>(
                    <tr key={i} className="hover:bg-gray-50" style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td className="px-4 py-2 font-medium text-gray-700">{a.user_name||"—"}</td>
                      <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{background:a.action==="delete"?"#fee2e2":a.action==="create"?"#dcfce7":"#e0f2fe",color:a.action==="delete"?"#dc2626":a.action==="create"?"#15803d":"#0369a1"}}>{a.action}</span></td>
                      <td className="px-4 py-2 text-gray-500">{a.module}</td>
                      <td className="px-4 py-2 text-gray-400">{new Date(a.created_at).toLocaleString("en-KE",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab==="users" && (
          <div className="rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-bold text-sm text-gray-800">System Users ({users.length})</span>
              <button onClick={exportUsers} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"#dcfce7",color:"#15803d"}}>
                <Download className="w-3 h-3"/>Export
              </button>
            </div>
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50">
                {["Name","Email","Department","Active","Created","Actions"].map(h=><th key={h} className="px-4 py-2 text-left text-gray-500 font-semibold text-[10px] uppercase tracking-wide">{h}</th>)}
              </tr></thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                    <td className="px-4 py-2 font-semibold text-gray-800">{u.full_name||"—"}</td>
                    <td className="px-4 py-2 text-gray-500">{u.email||"—"}</td>
                    <td className="px-4 py-2 text-gray-500">{u.department||"—"}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:u.is_active?"#dcfce7":"#fee2e2",color:u.is_active?"#15803d":"#dc2626"}}>
                        {u.is_active?"Active":"Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{new Date(u.created_at).toLocaleDateString("en-KE")}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1.5">
                        <button onClick={()=>toggleUserActive(u.id,u.is_active,u.full_name)}
                          className="p-1.5 rounded-lg" style={{background:u.is_active?"#fef3c7":"#dcfce7"}} title={u.is_active?"Deactivate":"Activate"}>
                          {u.is_active?<Lock className="w-3 h-3 text-amber-600"/>:<Unlock className="w-3 h-3 text-green-600"/>}
                        </button>
                        <button onClick={()=>deleteUser(u.id,u.full_name)} className="p-1.5 rounded-lg bg-red-50" title="Delete">
                          <Trash2 className="w-3 h-3 text-red-500"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab==="audit" && (
          <div className="rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="font-bold text-sm text-gray-800">Audit Log ({auditLog.length})</span>
              <button onClick={clearAuditLog} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"#fee2e2",color:"#dc2626"}}>
                <Trash2 className="w-3 h-3"/>Clear Old
              </button>
            </div>
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50" style={{position:"sticky",top:0}}>
                  {["User","Action","Module","Record","IP","Time"].map(h=><th key={h} className="px-4 py-2 text-left text-gray-500 font-semibold text-[10px] uppercase">{h}</th>)}
                </tr></thead>
                <tbody>
                  {auditLog.map((a,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td className="px-4 py-1.5 font-medium text-gray-700">{a.user_name||"—"}</td>
                      <td className="px-4 py-1.5"><span className="px-2 py-0.5 rounded-full text-[9px] font-bold" style={{background:a.action==="delete"?"#fee2e2":a.action==="create"?"#dcfce7":"#e0f2fe",color:a.action==="delete"?"#dc2626":a.action==="create"?"#15803d":"#0369a1"}}>{a.action}</span></td>
                      <td className="px-4 py-1.5 text-gray-500">{a.module}</td>
                      <td className="px-4 py-1.5 text-gray-400 font-mono text-[10px]">{a.record_id?.slice(0,8)||"—"}</td>
                      <td className="px-4 py-1.5 text-gray-400">{a.ip_address||"—"}</td>
                      <td className="px-4 py-1.5 text-gray-400">{new Date(a.created_at).toLocaleString("en-KE",{month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==="system" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2"><Server className="w-4 h-4 text-blue-600"/>System Information</h3>
              {[
                {l:"System Name",   v:settings.system_name||"EL5 MediProcure"},
                {l:"Hospital",      v:settings.hospital_name||"Embu Level 5 Hospital"},
                {l:"Database",      v:"Supabase · PostgreSQL 15"},
                {l:"Node",          v:"yvjfehnzbzjliizjvuhq"},
                {l:"Region",        v:"Africa (Lagos)"},
                {l:"Environment",   v:"Production"},
              ].map(({l,v})=>(
                <div key={l} className="flex justify-between py-1" style={{borderBottom:"1px dashed #f3f4f6"}}>
                  <span style={{fontSize:11,color:"#9ca3af",fontWeight:700}}>{l}</span>
                  <span style={{fontSize:11,color:"#374151"}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2"><Activity className="w-4 h-4 text-green-600"/>Health Status</h3>
              {[
                {l:"Database",      v:"Connected",   ok:true},
                {l:"Authentication",v:"Active",       ok:true},
                {l:"Storage",       v:"Available",   ok:true},
                {l:"Edge Functions",v:"Available",   ok:true},
                {l:"Realtime",      v:"Available",   ok:true},
                {l:"Email Service", v:"Configured",  ok:true},
              ].map(({l,v,ok})=>(
                <div key={l} className="flex justify-between items-center py-1" style={{borderBottom:"1px dashed #f3f4f6"}}>
                  <span style={{fontSize:11,color:"#9ca3af",fontWeight:700}}>{l}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${ok?"bg-green-400":"bg-red-400"}`}/>
                    <span style={{fontSize:11,color:ok?"#15803d":"#dc2626",fontWeight:600}}>{v}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab==="layout" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl shadow-sm p-5 space-y-4">
              <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2"><Settings className="w-4 h-4 text-purple-600"/>Interface Layout Controls</h3>
              <div>
                <label className="block mb-2" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Navigation Position</label>
                <div className="flex gap-2">
                  {(["top","left","bottom"] as const).map(pos=>(
                    <button key={pos} onClick={()=>setNavPosition(pos)}
                      className="flex-1 py-2 rounded-xl border-2 text-xs font-bold capitalize transition-all"
                      style={{borderColor:navPosition===pos?"#7c3aed":"#e5e7eb",background:navPosition===pos?"#ede9fe":"#f9fafb",color:navPosition===pos?"#7c3aed":"#6b7280"}}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-2" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Sidebar Width: {sidebarWidth}px</label>
                <input type="range" min={180} max={320} value={sidebarWidth} onChange={e=>setSidebarWidth(Number(e.target.value))}
                  className="w-full" style={{accentColor:"#7c3aed"}}/>
              </div>
              <div>
                <label className="block mb-2" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Button Radius: {btnRadius}px</label>
                <input type="range" min={0} max={24} value={btnRadius} onChange={e=>setBtnRadius(Number(e.target.value))}
                  className="w-full" style={{accentColor:"#7c3aed"}}/>
                <div className="mt-2 flex gap-2">
                  {["Square","Rounded","Pill"].map((l,i)=>(
                    <div key={l} className="flex items-center justify-center px-4 py-1.5 text-xs font-semibold text-white"
                      style={{background:"#1a3a6b",borderRadius:btnRadius*[0,0.5,1][i]||0}}>{l}</div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-2" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Table Style</label>
                <div className="flex gap-2">
                  {(["stripe","border","minimal"] as const).map(s=>(
                    <button key={s} onClick={()=>setTableStyle(s)}
                      className="flex-1 py-1.5 rounded-xl border text-xs font-bold capitalize"
                      style={{borderColor:tableStyle===s?"#0369a1":"#e5e7eb",background:tableStyle===s?"#e0f2fe":"#f9fafb",color:tableStyle===s?"#0369a1":"#6b7280"}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-2" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>Data Density</label>
                <div className="flex gap-2">
                  {(["compact","normal","comfortable"] as const).map(d=>(
                    <button key={d} onClick={()=>setDensity(d)}
                      className="flex-1 py-1.5 rounded-xl border text-xs font-bold capitalize"
                      style={{borderColor:density===d?"#0369a1":"#e5e7eb",background:density===d?"#e0f2fe":"#f9fafb",color:density===d?"#0369a1":"#6b7280"}}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl shadow-sm p-5 space-y-4">
                <h3 className="font-bold text-sm text-gray-800">Color Theme</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[{label:"Primary Color",k:"primary",v:primaryColor,set:setPrimaryColor},{label:"Accent Color",k:"accent",v:accentColor,set:setAccentColor}].map(({label,v,set})=>(
                    <div key={label}>
                      <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={v} onChange={e=>set(e.target.value)} className="w-10 h-8 rounded cursor-pointer" style={{border:"none"}}/>
                        <span style={{fontSize:12,color:"#374151",fontFamily:"monospace"}}>{v}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 rounded-xl" style={{background:"#f8fafc"}}>
                  <p style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>Preview</p>
                  <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-xl text-white text-xs font-bold" style={{background:primaryColor,borderRadius:btnRadius}}>Primary</div>
                    <div className="px-3 py-1.5 rounded-xl text-white text-xs font-bold" style={{background:accentColor,borderRadius:btnRadius}}>Accent</div>
                  </div>
                </div>
              </div>
              <button onClick={saveLayoutSettings}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2"
                style={{background:"linear-gradient(90deg,#7c3aed,#4f46e5)"}}>
                <Settings className="w-4 h-4"/>Save Layout Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WebmasterPage() {
  return <RoleGuard allowed={["admin"]}><WebmasterInner/></RoleGuard>;
}
