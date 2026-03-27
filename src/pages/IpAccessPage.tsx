/**
 * IP Access Management Page
 * Admin view of all IP access logs, whitelist management, real-time enforcement
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { Shield, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Globe, Wifi, Eye, Lock, AlertTriangle, Save, Activity } from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

export default function IpAccessPage() {
  const { user } = useAuth();
  const { settings, get } = useSystemSettings();
  const [whitelist, setWhitelist] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"whitelist"|"logs"|"settings">("whitelist");
  const [form, setForm] = useState({ label:"", cidr:"", type:"private", notes:"", active:true });
  const [ipSettings, setIpSettings] = useState({
    ip_restriction_enabled: "false",
    allow_all_private: "true",
    log_all_ips: "true",
    revoke_on_ip_change: "false",
    force_network_check: "true",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [wl, lg] = await Promise.all([
      (supabase as any).from("network_whitelist").select("*").order("created_at"),
      (supabase as any).from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(200),
    ]);
    setWhitelist(wl.data || []);
    setLogs(lg.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setIpSettings({
      ip_restriction_enabled: get("ip_restriction_enabled","false"),
      allow_all_private: get("allow_all_private","true"),
      log_all_ips: get("log_all_ips","true"),
      revoke_on_ip_change: get("revoke_on_ip_change","false"),
      force_network_check: get("force_network_check","true"),
    });
  }, [settings, get]);

  async function addEntry() {
    if (!form.label || !form.cidr) { toast({title:"Label and CIDR required",variant:"destructive"}); return; }
    setSaving(true);
    await (supabase as any).from("network_whitelist").insert({...form, created_at:new Date().toISOString()});
    toast({title:"Entry added ✓"});
    setShowForm(false); setForm({label:"",cidr:"",type:"private",notes:"",active:true});
    await load();
    setSaving(false);
  }

  async function toggleEntry(id: string, active: boolean) {
    await (supabase as any).from("network_whitelist").update({active}).eq("id",id);
    setWhitelist(p => p.map(e => e.id===id?{...e,active}:e));
    toast({title:`Entry ${active?"enabled":"disabled"} ✓`});
  }

  async function removeEntry(id: string) {
    if (!confirm("Remove this whitelist entry?")) return;
    await (supabase as any).from("network_whitelist").delete().eq("id",id);
    await load();
    toast({title:"Entry removed ✓"});
  }

  async function saveIpSettings() {
    setSaving(true);
    const res = await saveSettings(ipSettings);
    if (res.ok) toast({title:"IP settings saved & applied ✓"});
    else toast({title:"Save failed",variant:"destructive"});
    setSaving(false);
  }

  const inp = {padding:"7px 10px",border:"1px solid #d1d5db",borderRadius:6,fontSize:13,width:"100%",color:"#111",outline:"none"};
  const btn = (c="#1a3a6b",p="7px 16px")=>({padding:p,borderRadius:7,border:"none",background:c,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"});
  const Toggle = ({on,onChange}:{on:boolean;onChange:(v:boolean)=>void})=>(
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:44,height:24,borderRadius:12,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:"2px",transition:"background 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );

  const allowed = logs.filter(l=>l.allowed).length;
  const denied = logs.filter(l=>!l.allowed).length;

  return (
    <RoleGuard allowed={["admin"]}>
      <div style={{padding:20,maxWidth:1200,margin:"0 auto"}}>
        {/* Header */}
        <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:14,padding:"18px 24px",marginBottom:20,color:"#fff",display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:48,height:48,borderRadius:12,background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center"}}><Shield style={{width:26,height:26,color:"#fff"}}/></div>
          <div>
            <div style={{fontSize:20,fontWeight:800}}>IP Access Control</div>
            <div style={{fontSize:12,opacity:.8}}>Network whitelist · IP logs · Real-time restriction enforcement</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{textAlign:"center",background:"rgba(0,255,0,0.15)",borderRadius:8,padding:"6px 12px"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#4ade80"}}>{allowed}</div>
              <div style={{fontSize:10,opacity:.8}}>Allowed</div>
            </div>
            <div style={{textAlign:"center",background:"rgba(255,0,0,0.15)",borderRadius:8,padding:"6px 12px"}}>
              <div style={{fontSize:18,fontWeight:800,color:"#f87171"}}>{denied}</div>
              <div style={{fontSize:10,opacity:.8}}>Denied</div>
            </div>
            <div style={{textAlign:"center",background:"#f1f5f9",borderRadius:8,padding:"6px 12px"}}>
              <div style={{fontSize:18,fontWeight:800}}>{whitelist.filter(e=>e.active).length}</div>
              <div style={{fontSize:10,opacity:.8}}>Rules</div>
            </div>
            <button onClick={load} style={btn("#e2e8f0")}><RefreshCw style={{width:14,height:14}}/></button>
          </div>
        </div>

        {/* Status bar */}
        <div style={{background:ipSettings.ip_restriction_enabled==="true"?"#dcfce7":"#fef3c7",borderRadius:10,padding:"10px 16px",marginBottom:16,display:"flex",alignItems:"center",gap:10,border:`1px solid ${ipSettings.ip_restriction_enabled==="true"?"#86efac":"#fcd34d"}`}}>
          {ipSettings.ip_restriction_enabled==="true"
            ? <CheckCircle style={{width:18,height:18,color:"#16a34a",flexShrink:0}}/>
            : <AlertTriangle style={{width:18,height:18,color:"#d97706",flexShrink:0}}/>
          }
          <span style={{fontSize:13,fontWeight:700,color:ipSettings.ip_restriction_enabled==="true"?"#15803d":"#92400e"}}>
            IP Restriction is {ipSettings.ip_restriction_enabled==="true"?"ACTIVE — unauthorized IPs will be blocked and logged":"DISABLED — all IPs are currently allowed"}
          </span>
          <button onClick={()=>{setIpSettings(p=>({...p,ip_restriction_enabled:p.ip_restriction_enabled==="true"?"false":"true"}));}} style={{...btn(ipSettings.ip_restriction_enabled==="true"?"#dc2626":"#16a34a","5px 14px"),marginLeft:"auto",fontSize:12}}>
            {ipSettings.ip_restriction_enabled==="true"?"Disable":"Enable"}
          </button>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:2,marginBottom:16,background:"#f1f5f9",borderRadius:10,padding:4}}>
          {(["whitelist","logs","settings"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"8px 4px",border:"none",borderRadius:7,background:tab===t?"#fff":"transparent",color:tab===t?"#1a3a6b":"#6b7280",fontWeight:tab===t?700:500,fontSize:13,cursor:"pointer",boxShadow:tab===t?"0 1px 4px rgba(0,0,0,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
              {t==="whitelist"?<Wifi style={{width:14,height:14}}/>:t==="logs"?<Activity style={{width:14,height:14}}/>:<Lock style={{width:14,height:14}}/>}
              {t==="whitelist"?"IP Whitelist":t==="logs"?"Access Logs":"Settings"}
            </button>
          ))}
        </div>

        {/* Whitelist Tab */}
        {tab==="whitelist" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:14,fontWeight:700,color:"#1a3a6b"}}>{whitelist.length} whitelist entries ({whitelist.filter(e=>e.active).length} active)</div>
              <button onClick={()=>setShowForm(true)} style={btn()}><Plus style={{width:14,height:14,display:"inline",marginRight:4}}/>Add IP Range</button>
            </div>
            {loading ? <div style={{textAlign:"center",padding:40,color:"#6b7280"}}>Loading...</div> : (
              <div style={{display:"grid",gap:8}}>
                {whitelist.map(e=>(
                  <div key={e.id} style={{background:"#fff",borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:14,border:`1px solid ${e.active?"#e5e7eb":"#f3f4f6"}`,opacity:e.active?1:0.6}}>
                    <div style={{width:36,height:36,borderRadius:8,background:e.type==="private"?"#e0f2fe":"#fef3c7",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {e.type==="private"?<Wifi style={{width:18,height:18,color:"#0369a1"}}/>:<Globe style={{width:18,height:18,color:"#d97706"}}/>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:"#111"}}>{e.label}</div>
                      <div style={{display:"flex",gap:12,fontSize:12,color:"#6b7280",marginTop:2}}>
                        <span style={{fontFamily:"monospace",fontWeight:600,color:"#1a3a6b"}}>{e.cidr}</span>
                        <span style={{padding:"1px 8px",borderRadius:10,background:e.type==="private"?"#e0f2fe":"#fef3c7",color:e.type==="private"?"#0369a1":"#d97706",fontSize:11,fontWeight:600}}>{e.type}</span>
                        {e.notes && <span>{e.notes}</span>}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <Toggle on={e.active} onChange={v=>toggleEntry(e.id,v)}/>
                      <button onClick={()=>removeEntry(e.id)} style={{...btn("#dc2626","5px 10px"),display:"flex",alignItems:"center"}}><Trash2 style={{width:13,height:13}}/></button>
                    </div>
                  </div>
                ))}
                {whitelist.length===0 && <div style={{textAlign:"center",padding:40,color:"#9ca3af"}}>No whitelist entries. Add IP ranges to restrict access.</div>}
              </div>
            )}
            {/* Add Form */}
            {showForm && (
              <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
                <div style={{background:"#fff",borderRadius:14,padding:24,width:"100%",maxWidth:480}}>
                  <div style={{fontSize:16,fontWeight:800,marginBottom:16,color:"#1a3a6b"}}>Add IP Range to Whitelist</div>
                  <div style={{display:"grid",gap:10}}>
                    {[{k:"label",l:"Label",p:"e.g. Hospital Main LAN"},{k:"cidr",l:"CIDR Range",p:"e.g. 192.168.1.0/24"},{k:"notes",l:"Notes (optional)",p:"Purpose or description"}].map(f=>(
                      <div key={f.k}>
                        <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:3,color:"#374151"}}>{f.l}</label>
                        <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{...inp}}/>
                      </div>
                    ))}
                    <div>
                      <label style={{fontSize:12,fontWeight:600,display:"block",marginBottom:3,color:"#374151"}}>Type</label>
                      <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{...inp}}>
                        <option value="private">Private (LAN)</option>
                        <option value="public">Public (Internet)</option>
                      </select>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Toggle on={form.active} onChange={v=>setForm(p=>({...p,active:v}))}/>
                      <span style={{fontSize:13,color:"#374151"}}>Active immediately</span>
                    </div>
                  </div>
                  <div style={{marginTop:14,padding:"10px 14px",background:"#f0f9ff",borderRadius:8,fontSize:12,color:"#0369a1"}}>
                    <strong>CIDR examples:</strong> 192.168.1.0/24 (single subnet) · 10.0.0.0/8 (entire Class A) · 203.0.113.5/32 (single IP)
                  </div>
                  <div style={{display:"flex",gap:8,marginTop:16}}>
                    <button onClick={addEntry} disabled={saving} style={btn()}>{saving?"Adding...":"Add Entry"}</button>
                    <button onClick={()=>setShowForm(false)} style={btn("#6b7280")}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {tab==="logs" && (
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#1a3a6b",marginBottom:12}}>Last {logs.length} access attempts</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#f8fafc"}}>
                    {["Time","IP Address","Network","Status","Reason","User","Path"].map(h=>(
                      <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,color:"#374151",borderBottom:"2px solid #e5e7eb"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l=>(
                    <tr key={l.id} style={{borderBottom:"1px solid #f0f0f0",background:l.allowed?"#fff":"#fff5f5"}}>
                      <td style={{padding:"6px 10px",color:"#6b7280",whiteSpace:"nowrap"}}>{new Date(l.created_at).toLocaleString("en-KE")}</td>
                      <td style={{padding:"6px 10px",fontFamily:"monospace",fontWeight:600,color:"#1a3a6b"}}>{l.ip_address}</td>
                      <td style={{padding:"6px 10px"}}>
                        <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:l.network==="private"?"#e0f2fe":l.network==="localhost"?"#f0fdf4":"#fef3c7",color:l.network==="private"?"#0369a1":l.network==="localhost"?"#15803d":"#d97706"}}>{l.network}</span>
                      </td>
                      <td style={{padding:"6px 10px"}}>
                        <span style={{padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700,background:l.allowed?"#dcfce7":"#fee2e2",color:l.allowed?"#15803d":"#dc2626"}}>{l.allowed?"✓ Allowed":"✗ Denied"}</span>
                      </td>
                      <td style={{padding:"6px 10px",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#374151"}}>{l.reason}</td>
                      <td style={{padding:"6px 10px",color:"#6b7280",fontSize:11}}>{l.user_email||"—"}</td>
                      <td style={{padding:"6px 10px",color:"#9ca3af",fontSize:11}}>{l.path||"—"}</td>
                    </tr>
                  ))}
                  {logs.length===0 && <tr><td colSpan={7} style={{textAlign:"center",padding:40,color:"#9ca3af"}}>No access logs yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab==="settings" && (
          <div style={{background:"#fff",borderRadius:12,border:"1px solid #e5e7eb",padding:"20px 24px"}}>
            <div style={{fontWeight:800,fontSize:15,color:"#1a3a6b",marginBottom:16}}>🔒 IP Restriction Settings</div>
            {[
              {k:"ip_restriction_enabled",l:"Enable IP Restriction",s:"Block users from unauthorized IP ranges"},
              {k:"allow_all_private",l:"Allow All Private Networks",s:"Auto-allow 10.x.x.x, 192.168.x.x, 172.16.x.x"},
              {k:"log_all_ips",l:"Log All Access Attempts",s:"Record every IP check in the access log"},
              {k:"revoke_on_ip_change",l:"Revoke Session on IP Change",s:"Force re-login if user's IP changes mid-session"},
              {k:"force_network_check",l:"Check IP on Every Page Load",s:"Strict mode: verify IP on every navigation"},
            ].map(f=>(
              <div key={f.k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111"}}>{f.l}</div>
                  <div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{f.s}</div>
                </div>
                <Toggle on={ipSettings[f.k as keyof typeof ipSettings]==="true"} onChange={v=>setIpSettings(p=>({...p,[f.k]:v?"true":"false"}))}/>
              </div>
            ))}
            <div style={{marginTop:16,display:"flex",gap:8}}>
              <button onClick={saveIpSettings} disabled={saving} style={btn()}><Save style={{width:13,height:13,display:"inline",marginRight:4}}/>{saving?"Saving...":"Save & Apply Settings"}</button>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
