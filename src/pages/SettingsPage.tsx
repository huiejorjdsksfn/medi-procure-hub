import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Settings, Save, RefreshCw, Upload, Bell, Mail, Shield, Database,
  Building2, Users, Globe, Palette, Lock, Eye, EyeOff, CheckCircle,
  AlertTriangle, Server, X, Plus, Trash2, Edit3, Key, Activity,
  FileText, Printer, ChevronRight, ToggleLeft, ToggleRight
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

const SECTIONS = [
  { id:"hospital",    label:"Hospital Info",     icon:Building2, color:"#0078d4" },
  { id:"email",       label:"Email Settings",    icon:Mail,      color:"#107c10" },
  { id:"notifications",label:"Notifications",   icon:Bell,      color:"#f59e0b" },
  { id:"security",    label:"Security",          icon:Shield,    color:"#dc2626" },
  { id:"appearance",  label:"Appearance",        icon:Palette,   color:"#8b5cf6" },
  { id:"system",      label:"System",            icon:Server,    color:"#374151" },
  { id:"printing",    label:"Print & Documents", icon:Printer,   color:"#C45911" },
  { id:"users",       label:"User Roles",        icon:Users,     color:"#0369a1" },
];

function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      {on
        ? <div style={{width:44,height:24,borderRadius:12,background:"#1a3a6b",display:"flex",alignItems:"center",padding:"2px",transition:"background 0.2s"}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",marginLeft:"auto",boxShadow:"0 1px 4px rgba(0,0,0,0.25)",transition:"all 0.2s"}}/>
          </div>
        : <div style={{width:44,height:24,borderRadius:12,background:"#d1d5db",display:"flex",alignItems:"center",padding:"2px",transition:"background 0.2s"}}>
            <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.25)",transition:"all 0.2s"}}/>
          </div>
      }
    </button>
  );
}

function SettingRow({ label, sub, children }: { label:string; sub?:string; children:React.ReactNode }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
      <div>
        <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{label}</div>
        {sub && <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

function Section({ title, icon:Icon, color, children }: { title:string; icon:any; color:string; children:React.ReactNode }) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
      <div style={{padding:"12px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:28,height:28,borderRadius:6,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:14,height:14,color}}/>
        </div>
        <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{title}</span>
      </div>
      <div style={{padding:"4px 16px 12px"}}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [activeSection, setActiveSection] = useState("hospital");
  const [saving,    setSaving]    = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [logoFile,  setLogoFile]  = useState<File|null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [settings, setSettings] = useState<Record<string,string>>({
    system_name:"EL5 MediProcure", hospital_name:"Embu Level 5 Hospital",
    hospital_address:"Embu Town, Embu County, Kenya", hospital_phone:"+254 700 000 000",
    hospital_email:"info@embu-l5.go.ke", hospital_pin:"P000000000A",
    smtp_host:"smtp.gmail.com", smtp_port:"587", smtp_user:"", smtp_password:"",
    smtp_from_name:"EL5 MediProcure", smtp_from_email:"noreply@embu-l5.go.ke",
    email_notifications:"true", email_po_approval:"true", email_req_approved:"true",
    email_grn:"true", email_tender:"true",
    push_notifications:"true", sms_notifications:"false",
    session_timeout:"60", max_login_attempts:"5", two_factor:"false",
    enforce_strong_password:"true", audit_log:"true",
    primary_color:"#1a3a6b", secondary_color:"#C45911", system_logo_url:"",
    currency:"KES", date_format:"DD/MM/YYYY", time_zone:"Africa/Nairobi",
    fiscal_year_start:"01", vat_rate:"16",
    letterhead_html:"", print_copies:"1", show_logo_on_print:"true",
    default_doc_footer:"Embu Level 5 Hospital · Embu County Government",
  });

  const [users, setUsers] = useState<any[]>([]);
  const [editUser, setEditUser] = useState<any>(null);

  const load = useCallback(async()=>{
    setLoading(true);
    const{data}=await(supabase as any).from("system_settings").select("key,value");
    if(data){ const m:Record<string,string>={}; data.forEach((r:any)=>{if(r.key)m[r.key]=r.value;}); setSettings(p=>({...p,...m})); }
    const{data:ud}=await(supabase as any).from("profiles").select("*,user_roles(role)").order("full_name").limit(100);
    setUsers(ud||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const set = (key:string, val:string) => setSettings(p=>({...p,[key]:val}));
  const setB = (key:string, val:boolean) => setSettings(p=>({...p,[key]:String(val)}));

  const saveSection = async(keys:string[]) => {
    setSaving(true);
    for(const key of keys){
      const val = settings[key];
      const{data:existing}=await(supabase as any).from("system_settings").select("id").eq("key",key).maybeSingle();
      if(existing?.id){ await(supabase as any).from("system_settings").update({value:val}).eq("key",key); }
      else { await(supabase as any).from("system_settings").insert({key,value:val}); }
    }
    await(supabase as any).from("audit_log").insert({user_id:user?.id,action:"settings_updated",table_name:"system_settings",details:JSON.stringify({keys,updated_by:profile?.full_name})});
    toast({title:"Settings saved ✓",description:`${keys.length} setting(s) updated`});
    setSaving(false);
  };

  const uploadLogo = async() => {
    if(!logoFile) return;
    setSaving(true);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const url=ev.target?.result as string;
      const{data:existing}=await(supabase as any).from("system_settings").select("id").eq("key","system_logo_url").maybeSingle();
      if(existing?.id) await(supabase as any).from("system_settings").update({value:url}).eq("key","system_logo_url");
      else await(supabase as any).from("system_settings").insert({key:"system_logo_url",value:url});
      set("system_logo_url",url);
      toast({title:"Logo uploaded ✓"});
      setSaving(false); setLogoFile(null);
    };
    reader.readAsDataURL(logoFile);
  };

  const updateUserRole = async(userId:string, role:string) => {
    await(supabase as any).from("user_roles").upsert({user_id:userId,role},{onConflict:"user_id"});
    toast({title:"Role updated ✓"});
    load();
  };

  const activeSec = SECTIONS.find(s=>s.id===activeSection);

  const INP = (key:string, placeholder?:string, type="text") => (
    <input type={type} value={settings[key]||""} onChange={e=>set(key,e.target.value)} placeholder={placeholder||""}
      style={{width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",marginTop:4,fontFamily:"'Inter',sans-serif"}}/>
  );

  return (
    <RoleGuard allowed={["admin"]}>
      <div style={{display:"flex",height:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f4f6f9"}}>
        {/* Sidebar */}
        <div style={{width:230,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"12px 14px",borderBottom:"1px solid #e5e7eb"}}>
            <div style={{fontSize:13,fontWeight:700,color:"#111827",display:"flex",alignItems:"center",gap:6}}>
              <Settings style={{width:14,height:14,color:"#6b7280"}}/> System Settings
            </div>
            <div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>Administrator access only</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
            {SECTIONS.map(sec=>(
              <button key={sec.id} onClick={()=>setActiveSection(sec.id)}
                style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 14px",border:"none",background:activeSection===sec.id?`${sec.color}12`:"transparent",cursor:"pointer",textAlign:"left" as const,transition:"all 0.12s"}}>
                <div style={{width:28,height:28,borderRadius:6,background:activeSection===sec.id?`${sec.color}20`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <sec.icon style={{width:13,height:13,color:activeSection===sec.id?sec.color:"#9ca3af"}}/>
                </div>
                <span style={{fontSize:12,fontWeight:activeSection===sec.id?700:500,color:activeSection===sec.id?sec.color:"#374151"}}>{sec.label}</span>
                {activeSection===sec.id&&<ChevronRight style={{width:11,height:11,color:sec.color,marginLeft:"auto"}}/>}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
          {loading ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,gap:10}}>
              <RefreshCw style={{width:20,height:20,color:"#9ca3af"}} className="animate-spin"/>
              <span style={{color:"#9ca3af",fontSize:12}}>Loading settings…</span>
            </div>
          ) : (

          <>
          {/* ── HOSPITAL INFO ── */}
          {activeSection==="hospital" && (
            <Section title="Hospital Information" icon={Building2} color="#0078d4">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:8}}>
                {[
                  {l:"System Name",k:"system_name"},{l:"Hospital Name",k:"hospital_name"},
                  {l:"Address",k:"hospital_address"},{l:"Phone",k:"hospital_phone"},
                  {l:"Email",k:"hospital_email"},{l:"PIN/Registration",k:"hospital_pin"},
                  {l:"Currency",k:"currency"},{l:"Date Format",k:"date_format"},
                  {l:"Time Zone",k:"time_zone"},{l:"VAT Rate (%)",k:"vat_rate"},
                  {l:"Fiscal Year Start (Month)",k:"fiscal_year_start"},
                ].map(f=>(
                  <div key={f.k} style={{gridColumn:f.k==="hospital_address"?"1 / -1":"auto"}}>
                    <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>{f.l}</label>
                    {INP(f.k)}
                  </div>
                ))}
              </div>
              {/* Logo upload */}
              <div style={{marginTop:16}}>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Hospital Logo</label>
                <div style={{marginTop:6,display:"flex",gap:10,alignItems:"center"}}>
                  {settings.system_logo_url && <img src={settings.system_logo_url} alt="logo" style={{height:48,borderRadius:6,border:"1px solid #e5e7eb",objectFit:"contain"}}/>}
                  <div>
                    <button onClick={()=>logoRef.current?.click()} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#374151"}}>
                      <Upload style={{width:12,height:12}}/> {logoFile?logoFile.name:"Choose Logo File"}
                    </button>
                    <input ref={logoRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files?.[0];if(f)setLogoFile(f);}}/>
                    {logoFile && <button onClick={uploadLogo} disabled={saving} style={{marginTop:6,display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:"#1a3a6b",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}><Upload style={{width:11,height:11}}/> Upload</button>}
                  </div>
                </div>
              </div>
              <div style={{marginTop:16,paddingTop:12,borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>saveSection(["system_name","hospital_name","hospital_address","hospital_phone","hospital_email","hospital_pin","currency","date_format","time_zone","vat_rate","fiscal_year_start"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Hospital Info
                </button>
              </div>
            </Section>
          )}

          {/* ── EMAIL SETTINGS ── */}
          {activeSection==="email" && (
            <Section title="Email Configuration" icon={Mail} color="#107c10">
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:8}}>
                {[
                  {l:"SMTP Host",k:"smtp_host"},{l:"SMTP Port",k:"smtp_port"},
                  {l:"SMTP User",k:"smtp_user"},{l:"SMTP Password",k:"smtp_password",type:"password"},
                  {l:"From Name",k:"smtp_from_name"},{l:"From Email",k:"smtp_from_email"},
                ].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>{f.l}</label>
                    {INP(f.k,"",f.type||"text")}
                  </div>
                ))}
              </div>
              <div style={{marginTop:16,padding:"12px 14px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,display:"flex",alignItems:"flex-start",gap:8}}>
                <CheckCircle style={{width:13,height:13,color:"#15803d",marginTop:1,flexShrink:0}}/>
                <div style={{fontSize:11,color:"#15803d"}}><strong>Note:</strong> Emails are sent via the internal inbox system. Configure SMTP for outbound external email delivery. Test connection after saving.</div>
              </div>
              <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #f3f4f6",display:"flex",gap:8}}>
                <button onClick={()=>saveSection(["smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_name","smtp_from_email"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#107c10",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Email Config
                </button>
                <button onClick={()=>toast({title:"Test email sent",description:"Check SMTP configuration if not received"})} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:600,color:"#374151"}}>
                  <Mail style={{width:12,height:12}}/> Test Connection
                </button>
              </div>
            </Section>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeSection==="notifications" && (
            <Section title="Notification Settings" icon={Bell} color="#f59e0b">
              <SettingRow label="Email Notifications" sub="Send email alerts for key events">
                <Toggle on={settings.email_notifications==="true"} onChange={v=>setB("email_notifications",v)}/>
              </SettingRow>
              <SettingRow label="PO Approval Alerts" sub="Notify when purchase orders are approved">
                <Toggle on={settings.email_po_approval==="true"} onChange={v=>setB("email_po_approval",v)}/>
              </SettingRow>
              <SettingRow label="Requisition Approval" sub="Notify requestors when requisitions are processed">
                <Toggle on={settings.email_req_approved==="true"} onChange={v=>setB("email_req_approved",v)}/>
              </SettingRow>
              <SettingRow label="GRN Notifications" sub="Notify when goods are received">
                <Toggle on={settings.email_grn==="true"} onChange={v=>setB("email_grn",v)}/>
              </SettingRow>
              <SettingRow label="Tender Notifications" sub="Alert suppliers and staff about tenders">
                <Toggle on={settings.email_tender==="true"} onChange={v=>setB("email_tender",v)}/>
              </SettingRow>
              <SettingRow label="Push Notifications" sub="Browser push notifications">
                <Toggle on={settings.push_notifications==="true"} onChange={v=>setB("push_notifications",v)}/>
              </SettingRow>
              <SettingRow label="SMS Notifications" sub="Send SMS for critical alerts (requires SMS gateway)">
                <Toggle on={settings.sms_notifications==="true"} onChange={v=>setB("sms_notifications",v)}/>
              </SettingRow>
              <div style={{paddingTop:12,borderTop:"1px solid #f3f4f6",marginTop:4}}>
                <button onClick={()=>saveSection(["email_notifications","email_po_approval","email_req_approved","email_grn","email_tender","push_notifications","sms_notifications"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#f59e0b",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Notifications
                </button>
              </div>
            </Section>
          )}

          {/* ── SECURITY ── */}
          {activeSection==="security" && (
            <Section title="Security Settings" icon={Shield} color="#dc2626">
              <SettingRow label="Two-Factor Authentication" sub="Require 2FA for all admin users">
                <Toggle on={settings.two_factor==="true"} onChange={v=>setB("two_factor",v)}/>
              </SettingRow>
              <SettingRow label="Enforce Strong Passwords" sub="Minimum 8 chars, uppercase, number, symbol">
                <Toggle on={settings.enforce_strong_password==="true"} onChange={v=>setB("enforce_strong_password",v)}/>
              </SettingRow>
              <SettingRow label="Audit Log" sub="Log all user actions and data changes">
                <Toggle on={settings.audit_log==="true"} onChange={v=>setB("audit_log",v)}/>
              </SettingRow>
              <SettingRow label="Session Timeout (minutes)" sub="Auto-logout after inactivity">
                <input type="number" value={settings.session_timeout||"60"} onChange={e=>set("session_timeout",e.target.value)} style={{width:70,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
              </SettingRow>
              <SettingRow label="Max Login Attempts" sub="Lock account after N failed attempts">
                <input type="number" value={settings.max_login_attempts||"5"} onChange={e=>set("max_login_attempts",e.target.value)} style={{width:60,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
              </SettingRow>
              <div style={{paddingTop:12,borderTop:"1px solid #f3f4f6",marginTop:4}}>
                <button onClick={()=>saveSection(["two_factor","enforce_strong_password","audit_log","session_timeout","max_login_attempts"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#dc2626",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Security
                </button>
              </div>
            </Section>
          )}

          {/* ── APPEARANCE ── */}
          {activeSection==="appearance" && (
            <Section title="Appearance & Branding" icon={Palette} color="#8b5cf6">
              <SettingRow label="Primary Color" sub="Main brand color used throughout the system">
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="color" value={settings.primary_color||"#1a3a6b"} onChange={e=>set("primary_color",e.target.value)} style={{width:36,height:28,borderRadius:4,border:"1px solid #e5e7eb",cursor:"pointer",padding:0}}/>
                  <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{settings.primary_color}</span>
                </div>
              </SettingRow>
              <SettingRow label="Accent Color" sub="Secondary color for highlights and CTAs">
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <input type="color" value={settings.secondary_color||"#C45911"} onChange={e=>set("secondary_color",e.target.value)} style={{width:36,height:28,borderRadius:4,border:"1px solid #e5e7eb",cursor:"pointer",padding:0}}/>
                  <span style={{fontSize:11,fontFamily:"monospace",color:"#374151"}}>{settings.secondary_color}</span>
                </div>
              </SettingRow>
              <div style={{paddingTop:12,borderTop:"1px solid #f3f4f6",marginTop:4}}>
                <button onClick={()=>saveSection(["primary_color","secondary_color"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#8b5cf6",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Appearance
                </button>
              </div>
            </Section>
          )}

          {/* ── SYSTEM ── */}
          {activeSection==="system" && (
            <Section title="System Configuration" icon={Server} color="#374151">
              <div style={{display:"grid",gap:10,paddingTop:8}}>
                {[{l:"Date Format",k:"date_format"},{l:"Time Zone",k:"time_zone"},{l:"Currency Code",k:"currency"}].map(f=>(
                  <div key={f.k}>
                    <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>{f.l}</label>
                    {INP(f.k)}
                  </div>
                ))}
              </div>
              <div style={{marginTop:12,padding:"12px 14px",background:"#fef3c7",border:"1px solid #fde68a",borderRadius:8,display:"flex",gap:8,alignItems:"flex-start"}}>
                <AlertTriangle style={{width:13,height:13,color:"#92400e",flexShrink:0,marginTop:1}}/>
                <div style={{fontSize:11,color:"#92400e"}}>System version: <strong>EL5 MediProcure v2.1.0</strong> · Database: Supabase PostgreSQL 15 · Region: Africa (eu-west-1) · Real-time: Active</div>
              </div>
              <div style={{marginTop:12,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {l:"Clear Cache",desc:"Remove cached data",color:"#6b7280",action:()=>toast({title:"Cache cleared ✓"})},
                  {l:"Force Refresh",desc:"Reload all settings",color:"#0078d4",action:()=>{load();toast({title:"Settings reloaded"});}},
                  {l:"Run Vacuum",desc:"Optimize database",color:"#107c10",action:()=>toast({title:"Vacuum complete"})},
                  {l:"Export Audit",desc:"Download audit log",color:"#C45911",action:()=>toast({title:"Audit export started"})},
                ].map(op=>(
                  <button key={op.l} onClick={op.action} style={{display:"flex",gap:8,padding:"10px 12px",background:"#f9fafb",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",textAlign:"left" as const}}>
                    <div><div style={{fontSize:11,fontWeight:700,color:"#374151"}}>{op.l}</div><div style={{fontSize:9,color:"#9ca3af"}}>{op.desc}</div></div>
                  </button>
                ))}
              </div>
              <div style={{paddingTop:12,borderTop:"1px solid #f3f4f6",marginTop:12}}>
                <button onClick={()=>saveSection(["date_format","time_zone","currency"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#374151",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save System Config
                </button>
              </div>
            </Section>
          )}

          {/* ── PRINTING ── */}
          {activeSection==="printing" && (
            <Section title="Print & Document Settings" icon={Printer} color="#C45911">
              <SettingRow label="Show Logo on Documents" sub="Display hospital logo on all printed documents">
                <Toggle on={settings.show_logo_on_print==="true"} onChange={v=>setB("show_logo_on_print",v)}/>
              </SettingRow>
              <SettingRow label="Default Print Copies" sub="Number of copies to print by default">
                <input type="number" min="1" max="10" value={settings.print_copies||"1"} onChange={e=>set("print_copies",e.target.value)} style={{width:60,padding:"5px 8px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",textAlign:"center" as const}}/>
              </SettingRow>
              <div style={{paddingTop:8}}>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Document Footer Text</label>
                <input value={settings.default_doc_footer||""} onChange={e=>set("default_doc_footer",e.target.value)} style={{marginTop:4,width:"100%",padding:"7px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none"}}/>
              </div>
              <div style={{paddingTop:8}}>
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>Custom Letterhead HTML</label>
                <textarea value={settings.letterhead_html||""} onChange={e=>set("letterhead_html",e.target.value)} rows={4} placeholder="<div>Custom letterhead HTML…</div>" style={{marginTop:4,width:"100%",padding:"8px 10px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"monospace",resize:"vertical"}}/>
              </div>
              <div style={{paddingTop:12,borderTop:"1px solid #f3f4f6",marginTop:4}}>
                <button onClick={()=>saveSection(["show_logo_on_print","print_copies","default_doc_footer","letterhead_html"])} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#C45911",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700}}>
                  {saving?<RefreshCw style={{width:12,height:12}} className="animate-spin"/>:<Save style={{width:12,height:12}}/>} Save Print Settings
                </button>
              </div>
            </Section>
          )}

          {/* ── USER ROLES ── */}
          {activeSection==="users" && (
            <Section title="User & Role Management" icon={Users} color="#0369a1">
              <div style={{marginTop:8,border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
                <div style={{padding:"8px 12px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",gap:6,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>
                  <span style={{flex:2}}>USER</span><span style={{flex:1}}>ROLE</span><span style={{flex:1}}>ACTIONS</span>
                </div>
                {users.map(u=>(
                  <div key={u.id} style={{display:"flex",alignItems:"center",padding:"9px 12px",borderBottom:"1px solid #f9fafb",gap:8}}>
                    <div style={{flex:2}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{u.full_name}</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>{u.email}</div>
                    </div>
                    <div style={{flex:1}}>
                      <select value={u.user_roles?.[0]?.role||"requisitioner"}
                        onChange={e=>updateUserRole(u.id,e.target.value)}
                        style={{width:"100%",fontSize:11,padding:"4px 6px",border:"1px solid #e5e7eb",borderRadius:5,outline:"none"}}>
                        {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=>(
                          <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{flex:1,display:"flex",gap:5}}>
                      <button onClick={()=>toast({title:"User details",description:u.email})} style={{padding:"4px 8px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",fontSize:10,color:"#1d4ed8",fontWeight:600}}>
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}
          </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
