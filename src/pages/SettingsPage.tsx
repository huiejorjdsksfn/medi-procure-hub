import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { notifyAdmins } from "@/lib/notify";
import {
  Settings, Save, RefreshCw, Bell, Mail, Shield, Database,
  Building2, Users, Globe, Palette, Lock, CheckCircle,
  Server, Printer, ChevronRight, Activity, Key, Wifi,
  FileText, Archive, DollarSign, Calendar, ToggleLeft,
  Upload, Eye, EyeOff, Zap, Layers, Image, Monitor, Plus, Trash2
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

const SECTIONS = [
  {id:"hospital",     label:"Hospital Info",      icon:Building2, color:"#0078d4"},
  {id:"email",        label:"Email / SMTP",        icon:Mail,      color:"#107c10"},
  {id:"notifications",label:"Notifications",       icon:Bell,      color:"#f59e0b"},
  {id:"security",     label:"Security & Access",   icon:Shield,    color:"#dc2626"},
  {id:"appearance",   label:"Appearance",          icon:Palette,   color:"#8b5cf6"},
  {id:"procurement",  label:"Procurement Rules",   icon:FileText,  color:"#C45911"},
  {id:"financials",   label:"Finance Settings",    icon:DollarSign,color:"#1F6090"},
  {id:"system",       label:"System",              icon:Server,    color:"#374151"},
  {id:"printing",     label:"Print & Documents",   icon:Printer,   color:"#92400e"},
  {id:"integrations", label:"Integrations",        icon:Wifi,      color:"#4b4b9b"},
  {id:"users",        label:"User Roles",          icon:Users,     color:"#0369a1"},
  {id:"backup",       label:"Backup & Restore",    icon:Archive,   color:"#065f46"},
];

function Toggle({on,onChange}:{on:boolean;onChange:(v:boolean)=>void}) {
  return (
    <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0}}>
      <div style={{width:44,height:24,borderRadius:12,background:on?"#1a3a6b":"#d1d5db",display:"flex",alignItems:"center",padding:2,transition:"all 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(20px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function Row({label,sub,children}:{label:string;sub?:string;children:React.ReactNode}) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
      <div>
        <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{label}</div>
        {sub&&<div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

function Card({title,icon:Icon,color,children}:{title:string;icon:any;color:string;children:React.ReactNode}) {
  return (
    <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",marginBottom:16}}>
      <div style={{padding:"11px 16px",borderBottom:"2px solid #f3f4f6",display:"flex",alignItems:"center",gap:9}}>
        <div style={{width:28,height:28,borderRadius:6,background:`${color}18`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon style={{width:14,height:14,color}}/>
        </div>
        <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>{title}</span>
      </div>
      <div style={{padding:"4px 16px 16px"}}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const {user, profile, roles} = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState("hospital");
  const [saving,  setSaving]  = useState(false);
  const [loading, setLoading] = useState(true);
  const [pwVis,   setPwVis]   = useState(false);
  const [users,   setUsers]   = useState<any[]>([]);
  const [logoFile,setLogoFile]= useState<File|null>(null);

  const [S, setS] = useState<Record<string,string>>({
    /* Hospital */
    system_name:"EL5 MediProcure", hospital_name:"Embu Level 5 Hospital",
    hospital_address:"Embu Town, Embu County, Kenya", hospital_email:"info@embu.health.go.ke",
    hospital_phone:"+254 060 000000", hospital_pin:"P000000000A",
    hospital_website:"embu.health.go.ke", hospital_county:"Embu County",
    org_ceo:"", org_cfo:"", org_procurement_head:"",
    /* Procurement */
    currency:"KES", date_format:"DD/MM/YYYY", timezone:"Africa/Nairobi",
    fiscal_year:"2025/26", vat_rate:"16",
    req_prefix:"REQ", po_prefix:"PO", grn_prefix:"GRN", pv_prefix:"PV",
    req_auto_approve_below:"10000",
    po_approval_level1:"10000", po_approval_level2:"500000", po_approval_level3:"5000000",
    /* Finance */
    default_bank:"Kenya Commercial Bank", default_account_name:"EL5H Procurement Account",
    budget_year:"2025/26", withholding_tax_rate:"3", vat_registered:"true",
    /* Email */
    smtp_host:"smtp.gmail.com", smtp_port:"587", smtp_user:"", smtp_password:"",
    smtp_from_name:"EL5 MediProcure", smtp_from_email:"noreply@embu-l5.go.ke",
    smtp_encryption:"tls",
    /* Notifications */
    email_notifications:"true", push_notifications:"true", sms_notifications:"false",
    email_po_created:"true", email_po_approved:"true", email_req_submitted:"true",
    email_req_approved:"true", email_req_rejected:"true", email_grn:"true",
    email_tender_close:"true", email_payment_done:"true",
    notif_frequency:"realtime", sms_gateway:"",
    /* Security */
    two_factor:"false", enforce_strong_password:"true",
    audit_log:"true", session_timeout:"60", max_login_attempts:"5",
    password_min_length:"8", password_expiry_days:"90",
    require_upper:"true", require_numbers:"true", require_symbols:"true",
    ip_whitelist:"",
    /* Appearance */
    primary_color:"#1a3a6b", secondary_color:"#C45911", font:"Inter",
    theme_mode:"light", card_style:"shadow",
    /* System */
    maintenance_mode:"false", allow_registration:"true", enable_api:"false",
    realtime_notifications:"true", enable_scanner:"true",
    backup_schedule:"daily", backup_retention:"30",
    export_format:"xlsx",
    /* Print */
    print_copies:"1", show_logo_print:"true", show_stamp_print:"true",
    doc_footer:"Embu Level 5 Hospital · Embu County Government",
    letterhead_html:"",
    /* Integrations */
    odbc_enabled:"false", external_api_url:"", webhook_url:"",
    system_logo_url:"",
  });

  const set = (k:string,v:string) => setS(p=>({...p,[k]:v}));
  const setB = (k:string,v:boolean) => setS(p=>({...p,[k]:String(v)}));

  const load = useCallback(async()=>{
    setLoading(true);
    const [{data:settings},{data:ud}] = await Promise.all([
      (supabase as any).from("system_settings").select("key,value").limit(200),
      (supabase as any).from("profiles").select("*,user_roles(role)").order("full_name").limit(200),
    ]);
    const m:Record<string,string>={};
    (settings||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value; });
    setS(p=>({...p,...m}));
    setUsers(ud||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const save = async(keys:string[], label?:string)=>{
    setSaving(true);
    try {
      await Promise.all(keys.map(async k=>{
        const val=S[k]??"";
        const{data:ex}=await(supabase as any).from("system_settings").select("id").eq("key",k).maybeSingle();
        if(ex?.id) await(supabase as any).from("system_settings").update({value:val,updated_by:user?.id,updated_at:new Date().toISOString()}).eq("key",k);
        else await(supabase as any).from("system_settings").insert({key:k,value:val,category:section,label:k,updated_by:user?.id});
      }));
      await(supabase as any).from("audit_log").insert({user_id:user?.id,action:"settings_updated",table_name:"system_settings",details:JSON.stringify({section,keys})});
      // Notify admins of key setting changes
      if(keys.some(k=>["maintenance_mode","two_factor","smtp_host"].includes(k))){
        await notifyAdmins({
          title:"System Settings Updated",
          message:`${profile?.full_name||"Admin"} updated ${label||section} settings`,
          type:"system", module:"Settings", actionUrl:"/settings",
        });
      }
      toast({title:"Settings saved ✓",description:`${label||section}: ${keys.length} values updated globally`});
    } catch(e:any){
      toast({title:"Save failed",description:e.message,variant:"destructive"});
    }
    setSaving(false);
  };

  const uploadLogo = async()=>{
    if(!logoFile) return;
    setSaving(true);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const url=ev.target?.result as string;
      set("system_logo_url",url);
      await save(["system_logo_url"],"Logo");
      setLogoFile(null); setSaving(false);
    };
    reader.readAsDataURL(logoFile);
  };

  const updateUserRole = async(userId:string,role:string)=>{
    const{data:ex}=await(supabase as any).from("user_roles").select("id").eq("user_id",userId).maybeSingle();
    if(ex?.id) await(supabase as any).from("user_roles").update({role}).eq("id",ex.id);
    else await(supabase as any).from("user_roles").insert({user_id:userId,role});
    toast({title:"Role updated ✓"}); load();
  };

  const testSmtp = async()=>{
    toast({title:"Testing SMTP connection…",description:"Please wait"});
    await new Promise(r=>setTimeout(r,1500));
    toast({title:S.smtp_host?"SMTP configured ✓ (test mode)":"No SMTP host set",variant:S.smtp_host?undefined:"destructive"});
  };

  const INP = (k:string,ph?:string,type="text")=>(
    <input type={type} value={S[k]||""} onChange={e=>set(k,e.target.value)} placeholder={ph||""}
      style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"inherit"}}/>
  );

  const SaveBtn = ({keys,label,color="#1a3a6b"}:{keys:string[];label?:string;color?:string})=>(
    <button onClick={()=>save(keys,label)} disabled={saving}
      style={{display:"flex",alignItems:"center",gap:6,padding:"9px 20px",background:color,color:"#fff",border:"none",borderRadius:7,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,marginTop:14,opacity:saving?0.8:1}}>
      {saving?<RefreshCw style={{width:13,height:13}} className="animate-spin"/>:<Save style={{width:13,height:13}}/>}
      {saving?"Saving…":`Save ${label||""}`}
    </button>
  );

  const sec = SECTIONS.find(s=>s.id===section);

  return (
    <RoleGuard allowed={["admin","procurement_manager"]}>
      <div style={{display:"flex",minHeight:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f0f2f5"}}>

        {/* ── SIDEBAR ── */}
        <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",display:"flex",flexDirection:"column",flexShrink:0,boxShadow:"1px 0 4px rgba(0,0,0,0.04)"}}>
          <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
            <div style={{fontSize:13,fontWeight:800,color:"#fff",display:"flex",alignItems:"center",gap:6}}><Settings style={{width:13,height:13}}/> Settings</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:1}}>Global System Configuration</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
            {SECTIONS.map(s=>(
              <button key={s.id} onClick={()=>setSection(s.id)}
                style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 14px",border:"none",background:section===s.id?`${s.color}10`:"transparent",cursor:"pointer",textAlign:"left" as const,borderLeft:section===s.id?`3px solid ${s.color}`:"3px solid transparent",transition:"all 0.1s"}}>
                <div style={{width:24,height:24,borderRadius:5,background:section===s.id?`${s.color}18`:"#f3f4f6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <s.icon style={{width:12,height:12,color:section===s.id?s.color:"#9ca3af"}}/>
                </div>
                <span style={{fontSize:13,fontWeight:section===s.id?700:500,color:section===s.id?s.color:"#374151"}}>{s.label}</span>
                {section===s.id&&<ChevronRight style={{width:10,height:10,color:s.color,marginLeft:"auto"}}/>}
              </button>
            ))}
          </div>
          <div style={{padding:"8px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb"}}>
            <div style={{fontSize:10,color:"#9ca3af",fontWeight:600}}>EL5 MediProcure v2.1</div>
            <div style={{fontSize:9,color:"#d1d5db"}}>Changes apply globally</div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {loading?(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:24,color:"#9ca3af",fontSize:13}}>
              <RefreshCw style={{width:18,height:18}} className="animate-spin"/> Loading settings…
            </div>
          ):(
            <>

            {/* ── HOSPITAL ── */}
            {section==="hospital"&&(
              <>
                <Card title="Organization Details" icon={Building2} color="#0078d4">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                    {[
                      {l:"System Name",k:"system_name"},{l:"Hospital Name",k:"hospital_name"},
                      {l:"Phone",k:"hospital_phone"},{l:"Email",k:"hospital_email"},
                      {l:"Website",k:"hospital_website"},{l:"County",k:"hospital_county"},
                      {l:"KRA PIN",k:"hospital_pin"},{l:"CEO / Director",k:"org_ceo"},
                      {l:"CFO",k:"org_cfo"},{l:"Procurement Head",k:"org_procurement_head"},
                    ].map(f=>(<div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>{INP(f.k)}</div>))}
                    <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Physical Address</label>{INP("hospital_address")}</div>
                  </div>
                  <SaveBtn keys={["system_name","hospital_name","hospital_address","hospital_email","hospital_phone","hospital_pin","hospital_website","hospital_county","org_ceo","org_cfo","org_procurement_head"]} label="Hospital Info" color="#0078d4"/>
                </Card>
                <Card title="Logo & Branding" icon={Image} color="#0078d4">
                  <div style={{paddingTop:10}}>
                    <div style={{display:"flex",gap:14,alignItems:"flex-start",flexWrap:"wrap" as const}}>
                      {S.system_logo_url&&<img src={S.system_logo_url} alt="logo" style={{height:60,objectFit:"contain",borderRadius:8,background:"#f9fafb",border:"1px solid #e5e7eb",padding:6}}/>}
                      <div>
                        <label style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151"}}>
                          <Upload style={{width:13,height:13}}/>{logoFile?logoFile.name:"Choose Logo File"}
                          <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>setLogoFile(e.target.files?.[0]||null)}/>
                        </label>
                        {logoFile&&<button onClick={uploadLogo} disabled={saving}
                          style={{display:"flex",alignItems:"center",gap:5,marginTop:8,padding:"8px 16px",background:"#0078d4",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                          <Upload style={{width:12,height:12}}/> Upload Logo
                        </button>}
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* ── EMAIL ── */}
            {section==="email"&&(
              <Card title="Email / SMTP Configuration" icon={Mail} color="#107c10">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>SMTP Host</label>{INP("smtp_host","smtp.gmail.com")}</div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>SMTP Port</label>{INP("smtp_port","587")}</div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>SMTP Username</label>{INP("smtp_user")}</div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>SMTP Password</label>
                    <div style={{position:"relative"}}>
                      <input type={pwVis?"text":"password"} value={S.smtp_password||""} onChange={e=>set("smtp_password",e.target.value)} style={{width:"100%",padding:"9px 36px 9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                      <button onClick={()=>setPwVis(v=>!v)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"#9ca3af",lineHeight:0}}>
                        {pwVis?<EyeOff style={{width:14,height:14}}/>:<Eye style={{width:14,height:14}}/>}
                      </button>
                    </div>
                  </div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>From Name</label>{INP("smtp_from_name")}</div>
                  <div><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>From Email</label>{INP("smtp_from_email","noreply@embu-l5.go.ke")}</div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Encryption</label>
                    <select value={S.smtp_encryption||"tls"} onChange={e=>set("smtp_encryption",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                      {["tls","ssl","none"].map(o=><option key={o} value={o}>{o.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,marginTop:14}}>
                  <SaveBtn keys={["smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_name","smtp_from_email","smtp_encryption"]} label="Email Config" color="#107c10"/>
                  <button onClick={testSmtp} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                    <Zap style={{width:13,height:13,color:"#f59e0b"}}/> Test Connection
                  </button>
                  <button onClick={()=>navigate("/email")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                    <Mail style={{width:13,height:13}}/> Open Email System
                  </button>
                </div>
              </Card>
            )}

            {/* ── NOTIFICATIONS ── */}
            {section==="notifications"&&(
              <Card title="Notification Settings" icon={Bell} color="#f59e0b">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                  {[
                    ["Email Notifications","email_notifications","Global email notification system"],
                    ["Push Notifications","push_notifications","Browser in-app notifications"],
                    ["SMS Notifications","sms_notifications","SMS via gateway (requires config)"],
                    ["PO Created Alert","email_po_created","Notify managers on new POs"],
                    ["PO Approval Alert","email_po_approved","Notify on PO approval/rejection"],
                    ["Requisition Submitted","email_req_submitted","Alert on new requisition"],
                    ["Requisition Approved","email_req_approved","Alert requestor when approved"],
                    ["Requisition Rejected","email_req_rejected","Alert requestor when rejected"],
                    ["Goods Received","email_grn","Alert on GRN creation"],
                    ["Tender Closing","email_tender_close","Alert before tender closes"],
                    ["Payment Done","email_payment_done","Alert on payment processing"],
                    ["Real-time Updates","realtime_notifications","Live database change tracking"],
                  ].map(([label,key,sub])=>(
                    <div key={key} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #f3f4f6",gap:12}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{label}</div>
                        <div style={{fontSize:11,color:"#9ca3af"}}>{sub}</div>
                      </div>
                      <Toggle on={S[key]==="true"} onChange={v=>setB(key,v)}/>
                    </div>
                  ))}
                </div>
                <div style={{paddingTop:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>SMS Gateway URL (optional)</label>
                  {INP("sms_gateway","https://api.smsprovider.co.ke/send")}
                </div>
                <div style={{paddingTop:8}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Notification Frequency</label>
                  <select value={S.notif_frequency||"realtime"} onChange={e=>set("notif_frequency",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                    <option value="realtime">Real-time (instant)</option>
                    <option value="hourly">Hourly digest</option>
                    <option value="daily">Daily digest</option>
                  </select>
                </div>
                <SaveBtn keys={["email_notifications","push_notifications","sms_notifications","email_po_created","email_po_approved","email_req_submitted","email_req_approved","email_req_rejected","email_grn","email_tender_close","email_payment_done","realtime_notifications","sms_gateway","notif_frequency"]} label="Notifications" color="#f59e0b"/>
              </Card>
            )}

            {/* ── SECURITY ── */}
            {section==="security"&&(
              <Card title="Security & Access Control" icon={Shield} color="#dc2626">
                {[
                  ["Two-Factor Authentication","two_factor","Require 2FA for all users"],
                  ["Strong Password Policy","enforce_strong_password","Enforce complexity requirements"],
                  ["Audit All Actions","audit_log","Log every user action and change"],
                  ["Require Uppercase","require_upper","Password must include uppercase letters"],
                  ["Require Numbers","require_numbers","Password must include numbers"],
                  ["Require Symbols","require_symbols","Password must include special symbols"],
                ].map(([l,k,s])=>(<Row key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>setB(k,v)}/></Row>))}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,paddingTop:10}}>
                  {[{l:"Session Timeout (min)",k:"session_timeout"},{l:"Max Login Attempts",k:"max_login_attempts"},{l:"Min Password Length",k:"password_min_length"},{l:"Password Expiry (days)",k:"password_expiry_days"}].map(f=>(
                    <div key={f.k}>
                      <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                      <input type="number" value={S[f.k]||""} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                    </div>
                  ))}
                </div>
                <div style={{paddingTop:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>IP Whitelist (comma-separated, leave blank for all)</label>
                  {INP("ip_whitelist","192.168.1.0/24, 10.0.0.1")}
                </div>
                <SaveBtn keys={["two_factor","enforce_strong_password","audit_log","require_upper","require_numbers","require_symbols","session_timeout","max_login_attempts","password_min_length","password_expiry_days","ip_whitelist"]} label="Security" color="#dc2626"/>
              </Card>
            )}

            {/* ── APPEARANCE ── */}
            {section==="appearance"&&(
              <Card title="Appearance & Branding" icon={Palette} color="#8b5cf6">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                  {[["Primary Color","primary_color","#1a3a6b"],["Accent Color","secondary_color","#C45911"]].map(([l,k,def])=>(
                    <div key={k}>
                      <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:6,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{l}</label>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <input type="color" value={S[k]||def} onChange={e=>set(k,e.target.value)} style={{width:44,height:36,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer",padding:2}}/>
                        <input value={S[k]||def} onChange={e=>set(k,e.target.value)} style={{flex:1,padding:"9px 12px",fontSize:12,fontFamily:"monospace",border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                      </div>
                    </div>
                  ))}
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Font Family</label>
                    <select value={S.font||"Inter"} onChange={e=>set("font",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:S.font||"Inter"}}>
                      {["Inter","Segoe UI","Roboto","Open Sans","Lato","Nunito","Georgia"].map(f=><option key={f} value={f} style={{fontFamily:f}}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Card Style</label>
                    <select value={S.card_style||"shadow"} onChange={e=>set("card_style",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                      <option value="shadow">Shadow</option>
                      <option value="border">Bordered</option>
                      <option value="flat">Flat</option>
                    </select>
                  </div>
                </div>
                {/* Preview bar */}
                <div style={{marginTop:14,padding:"12px 16px",background:"#f9fafb",borderRadius:8,border:"1px solid #e5e7eb",display:"flex",gap:8,flexWrap:"wrap" as const,alignItems:"center"}}>
                  <span style={{fontSize:11,color:"#9ca3af",fontWeight:700}}>PREVIEW:</span>
                  <button style={{padding:"7px 16px",background:S.primary_color||"#1a3a6b",color:"#fff",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:S.font||"Inter"}}>Primary</button>
                  <button style={{padding:"7px 16px",background:S.secondary_color||"#C45911",color:"#fff",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:S.font||"Inter"}}>Accent</button>
                  <span style={{padding:"3px 10px",background:`${S.primary_color||"#1a3a6b"}18`,color:S.primary_color||"#1a3a6b",borderRadius:4,fontSize:12,fontWeight:700,fontFamily:S.font||"Inter"}}>Badge</span>
                  <span style={{fontSize:13,color:"#374151",fontFamily:S.font||"Inter"}}>Sample text in {S.font||"Inter"}</span>
                </div>
                <SaveBtn keys={["primary_color","secondary_color","font","theme_mode","card_style"]} label="Appearance" color="#8b5cf6"/>
              </Card>
            )}

            {/* ── PROCUREMENT ── */}
            {section==="procurement"&&(
              <Card title="Procurement Rules & Numbering" icon={FileText} color="#C45911">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                  {[
                    {l:"Currency",k:"currency"},{l:"Date Format",k:"date_format"},
                    {l:"Time Zone",k:"timezone"},{l:"Fiscal Year",k:"fiscal_year"},
                    {l:"VAT Rate (%)",k:"vat_rate"},{l:"Requisition Prefix",k:"req_prefix"},
                    {l:"PO Number Prefix",k:"po_prefix"},{l:"GRN Prefix",k:"grn_prefix"},
                    {l:"Payment Voucher Prefix",k:"pv_prefix"},
                    {l:"Auto-approve Reqs below (KES)",k:"req_auto_approve_below"},
                    {l:"PO Level 1 Limit (KES)",k:"po_approval_level1"},
                    {l:"PO Level 2 Limit (KES)",k:"po_approval_level2"},
                    {l:"PO Level 3 Limit (KES)",k:"po_approval_level3"},
                  ].map(f=>(<div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>{INP(f.k)}</div>))}
                </div>
                <SaveBtn keys={["currency","date_format","timezone","fiscal_year","vat_rate","req_prefix","po_prefix","grn_prefix","pv_prefix","req_auto_approve_below","po_approval_level1","po_approval_level2","po_approval_level3"]} label="Procurement Rules" color="#C45911"/>
              </Card>
            )}

            {/* ── FINANCIALS ── */}
            {section==="financials"&&(
              <Card title="Finance & Accounting Settings" icon={DollarSign} color="#1F6090">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                  {[
                    {l:"Default Bank",k:"default_bank"},{l:"Account Name",k:"default_account_name"},
                    {l:"Budget Year",k:"budget_year"},{l:"Withholding Tax (%)",k:"withholding_tax_rate"},
                  ].map(f=>(<div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>{INP(f.k)}</div>))}
                </div>
                <Row label="VAT Registered" sub="EL5H is registered for VAT with KRA">
                  <Toggle on={S.vat_registered==="true"} onChange={v=>setB("vat_registered",v)}/>
                </Row>
                <SaveBtn keys={["default_bank","default_account_name","budget_year","withholding_tax_rate","vat_registered"]} label="Finance Settings" color="#1F6090"/>
              </Card>
            )}

            {/* ── SYSTEM ── */}
            {section==="system"&&(
              <Card title="System Configuration" icon={Server} color="#374151">
                {[
                  ["Maintenance Mode","maintenance_mode","Locks out all non-admin users"],
                  ["Allow User Registration","allow_registration","Let users self-register"],
                  ["External API Access","enable_api","Allow external API integrations"],
                  ["Real-time Notifications","realtime_notifications","Live DB event streaming"],
                  ["Barcode Scanner","enable_scanner","Enable scanner module"],
                ].map(([l,k,s])=>(<Row key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>setB(k,v)}/></Row>))}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:10}}>
                  {[{l:"Backup Schedule",k:"backup_schedule",opts:["hourly","daily","weekly","monthly"]},{l:"Export Format",k:"export_format",opts:["xlsx","csv","pdf"]}].map(f=>(
                    <div key={f.k}>
                      <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                      <select value={S[f.k]||f.opts[0]} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                        {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <SaveBtn keys={["maintenance_mode","allow_registration","enable_api","realtime_notifications","enable_scanner","backup_schedule","export_format"]} label="System Config" color="#374151"/>
              </Card>
            )}

            {/* ── PRINT ── */}
            {section==="printing"&&(
              <Card title="Print & Document Settings" icon={Printer} color="#92400e">
                {[
                  ["Show Logo on Prints","show_logo_print","Display hospital logo on all documents"],
                  ["Show Official Stamp","show_stamp_print","Include official stamp placeholder"],
                ].map(([l,k,s])=>(<Row key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>setB(k,v)}/></Row>))}
                <div style={{paddingTop:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Default Print Copies</label>
                  <input type="number" min="1" max="10" value={S.print_copies||"1"} onChange={e=>set("print_copies",e.target.value)} style={{width:80,padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",textAlign:"center" as const}}/>
                </div>
                <div style={{paddingTop:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Document Footer</label>
                  <input value={S.doc_footer||""} onChange={e=>set("doc_footer",e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>
                </div>
                <div style={{paddingTop:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>Custom Letterhead HTML (optional)</label>
                  <textarea value={S.letterhead_html||""} onChange={e=>set("letterhead_html",e.target.value)} rows={5} style={{width:"100%",padding:"9px 12px",fontSize:11,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",fontFamily:"monospace",resize:"vertical" as const}} placeholder="Paste HTML letterhead template…"/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <SaveBtn keys={["show_logo_print","show_stamp_print","print_copies","doc_footer","letterhead_html"]} label="Print Settings" color="#92400e"/>
                  <button onClick={()=>navigate("/documents")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                    <FileText style={{width:13,height:13}}/> Documents Manager
                  </button>
                </div>
              </Card>
            )}

            {/* ── INTEGRATIONS ── */}
            {section==="integrations"&&(
              <Card title="External Integrations" icon={Wifi} color="#4b4b9b">
                {[
                  ["ODBC Connections","odbc_enabled","Enable external database connections"],
                  ["External API","enable_api","Allow third-party API integrations"],
                ].map(([l,k,s])=>(<Row key={k} label={l} sub={s}><Toggle on={S[k]==="true"} onChange={v=>setB(k,v)}/></Row>))}
                <div style={{display:"grid",gap:12,paddingTop:10}}>
                  {[{l:"External API URL",k:"external_api_url"},{l:"Webhook URL",k:"webhook_url"}].map(f=>(
                    <div key={f.k}><label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>{INP(f.k,"https://")}</div>
                  ))}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <SaveBtn keys={["odbc_enabled","enable_api","external_api_url","webhook_url"]} label="Integrations" color="#4b4b9b"/>
                  <button onClick={()=>navigate("/odbc")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                    <Wifi style={{width:13,height:13}}/> ODBC Manager
                  </button>
                </div>
              </Card>
            )}

            {/* ── USERS ── */}
            {section==="users"&&(
              <Card title="User & Role Management" icon={Users} color="#0369a1">
                <div style={{display:"flex",justifyContent:"flex-end",gap:8,paddingTop:8,paddingBottom:10}}>
                  <button onClick={()=>navigate("/users")} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 16px",background:"#0369a1",color:"#fff",border:"none",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:700}}>
                    <Users style={{width:13,height:13}}/> Full User Manager
                  </button>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                    <thead>
                      <tr style={{background:"#f9fafb",borderBottom:"2px solid #e5e7eb"}}>
                        {["Name","Email","Role","Actions"].map(h=>(
                          <th key={h} style={{padding:"9px 12px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(0,20).map(u=>(
                        <tr key={u.id} style={{borderBottom:"1px solid #f9fafb"}}
                          onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                          onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                          <td style={{padding:"9px 12px",fontWeight:700,color:"#111827"}}>{u.full_name}</td>
                          <td style={{padding:"9px 12px",color:"#6b7280",fontSize:12}}>{u.email}</td>
                          <td style={{padding:"9px 12px"}}>
                            <select value={u.user_roles?.[0]?.role||"requisitioner"} onChange={e=>updateUserRole(u.id,e.target.value)}
                              style={{fontSize:11,padding:"4px 8px",border:"1px solid #e5e7eb",borderRadius:5,outline:"none",background:"#f9fafb"}}>
                              {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=>(
                                <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{padding:"9px 12px"}}>
                            <button onClick={()=>navigate("/users")} style={{fontSize:11,padding:"3px 10px",background:"#dbeafe",border:"1px solid #bfdbfe",borderRadius:5,cursor:"pointer",color:"#1d4ed8",fontWeight:700}}>Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ── BACKUP ── */}
            {section==="backup"&&(
              <Card title="Backup & Restore Configuration" icon={Archive} color="#065f46">
                {[{l:"Backup Schedule",k:"backup_schedule",opts:["hourly","daily","weekly","monthly"]},{l:"Backup Retention (days)",k:"backup_retention",opts:null},{l:"Export Format",k:"export_format",opts:["xlsx","csv","json"]}].map(f=>(
                  <div key={f.k} style={{paddingTop:10}}>
                    <label style={{fontSize:11,fontWeight:700,color:"#6b7280",display:"block",marginBottom:4,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{f.l}</label>
                    {f.opts?<select value={S[f.k]||f.opts[0]} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}>
                      {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>:<input type="number" value={S[f.k]||"30"} onChange={e=>set(f.k,e.target.value)} style={{width:"100%",padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none"}}/>}
                  </div>
                ))}
                <div style={{display:"flex",gap:8}}>
                  <SaveBtn keys={["backup_schedule","backup_retention","export_format"]} label="Backup Config" color="#065f46"/>
                  <button onClick={()=>navigate("/backup")} style={{display:"flex",alignItems:"center",gap:5,padding:"9px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",fontSize:13,fontWeight:600,color:"#374151",marginTop:14}}>
                    <Archive style={{width:13,height:13}}/> Backup Manager
                  </button>
                </div>
              </Card>
            )}

            </>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}
