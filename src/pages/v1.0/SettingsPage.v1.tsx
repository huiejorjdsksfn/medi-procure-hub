import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Settings, Save, RefreshCw, Bell, Mail, Shield,
  Building2, Users, Palette, Eye, EyeOff,
  Server, Printer, Cpu, Zap, DollarSign, ShoppingCart
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import { saveSettings } from "@/hooks/useSystemSettings";
import { sendSystemBroadcast } from "@/lib/broadcast";

const SECTIONS = [
  { id:"hospital",      label:"Hospital Info",      icon:Building2,   color:"#0078d4" },
  { id:"email",         label:"Email & SMTP",        icon:Mail,        color:"#107c10" },
  { id:"notifications", label:"Notifications",       icon:Bell,        color:"#f59e0b" },
  { id:"security",      label:"Security & Access",   icon:Shield,      color:"#dc2626" },
  { id:"appearance",    label:"Appearance & UI",     icon:Palette,     color:"#8b5cf6" },
  { id:"system",        label:"System Config",       icon:Server,      color:"#374151" },
  { id:"procurement",   label:"Procurement Rules",   icon:ShoppingCart,color:"#C45911" },
  { id:"finance",       label:"Finance & Budget",    icon:DollarSign,  color:"#0369a1" },
  { id:"printing",      label:"Print & Documents",   icon:Printer,     color:"#92400e" },
  { id:"modules",       label:"Module Toggles",      icon:Cpu,         color:"#059669" },
  { id:"users",         label:"User Roles",          icon:Users,       color:"#5b21b6" },
  { id:"advanced",      label:"Advanced & API",      icon:Zap,         color:"#dc2626" },
];

function Toggle({ on, onChange }: { on:boolean; onChange:(v:boolean)=>void }) {
  return (
      <button onClick={()=>onChange(!on)} style={{background:"transparent",border:"none",cursor:"pointer" as const,padding:0,lineHeight:0,flexShrink:0}}>
      <div style={{width:48,height:26,borderRadius:13,background:on?"#0a2558":"#d1d5db",display:"flex" as const,alignItems:"center" as const,padding:"3px",transition:"background 0.2s"}}>
        <div style={{width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 4px rgba(0,0,0,0.2)",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)"}}/>
      </div>
    </button>
  );
}

function FR({ label, sub, children, ac }: { label:string; sub?:string; children:React.ReactNode; ac?:string }) {
  return (
    <div style={{display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const,padding:"13px 0",borderBottom:"1px solid #f3f4f6",gap:16}}>
      <div style={{flex:1}}>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:6}}>
          {ac&&<div style={{width:3,height:14,borderRadius:2,background:ac,flexShrink:0}}/>}
          <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{label}</div>
        </div>
        {sub&&<div style={{fontSize:12,color:"#9ca3af",marginTop:2}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

function Card({ title, sub, color, icon:Icon, children, onSave, saving }: any) {
  return (
    <div style={{background:"#fff",borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:24,overflow:"hidden" as const,border:"1px solid #e5e7eb"}}>
      <div style={{padding:"14px 20px",background:`linear-gradient(135deg,${color}14,${color}08)`,borderBottom:`2px solid ${color}30`,display:"flex" as const,alignItems:"center" as const,gap:12}}>
        <div style={{width:38,height:38,borderRadius:10,background:color,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
          <Icon style={{width:18,height:18,color:"#fff"}}/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>{title}</div>
          {sub&&<div style={{fontSize:12,color:"#6b7280",marginTop:1}}>{sub}</div>}
        </div>
        <button onClick={onSave} disabled={saving} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"8px 16px",background:color,color:"#fff",border:"none",borderRadius:8,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:700,opacity:saving?0.8:1}}>
          {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>} Save
        </button>
      </div>
      <div style={{padding:"4px 20px 16px"}}>{children}</div>
    </div>
  );
}

function Inp({ value, onChange, type="text", placeholder="" }: any) {
  return (
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",width:"100%",maxWidth:320,background:"#fafafa",fontFamily:"inherit"}}
      onFocus={e=>(e.target as any).style.borderColor="#1a3a6b"}
      onBlur={e=>(e.target as any).style.borderColor="#e5e7eb"}/>
  );
}

function Sel({ value, onChange, opts }: { value:string; onChange:(v:string)=>void; opts:{v:string;l:string}[] }) {
  return (
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",minWidth:200,background:"#fafafa",cursor:"pointer" as const,fontFamily:"inherit"}}>
      {opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function TA({ value, onChange, rows=3, placeholder="" }: any) {
  return (
    <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{padding:"9px 12px",fontSize:13,border:"1px solid #e5e7eb",borderRadius:7,outline:"none",width:"100%",maxWidth:420,resize:"none" as const,background:"#fafafa",fontFamily:"inherit"}}
      onFocus={e=>(e.target as any).style.borderColor="#1a3a6b"}
      onBlur={e=>(e.target as any).style.borderColor="#e5e7eb"}/>
  );
}

const ALL_KEYS = [
  "hospital_name","system_name","hospital_address","hospital_phone","hospital_email","hospital_website","hospital_pin","hospital_county","hospital_type","system_logo_url","hospital_motto","hospital_reg_no","hospital_bed_capacity","hospital_director",
  "smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_name","smtp_from_email","smtp_security","smtp_enabled","email_reply_to","email_signature",
  "email_notifications","email_po_approval","email_req_approved","email_grn","email_tender","push_notifications","sms_notifications","realtime_notifications","notify_on_login","notify_on_grn","notify_on_payment","notify_on_contract","notify_budget_alert",
  "two_factor","enforce_strong_password","audit_log","require_approval_grn","maintenance_mode","session_timeout","max_login_attempts","password_min_length","ip_whitelist","allow_registration","lock_inactive_users","require_email_verify","login_banner",
  "primary_color","secondary_color","accent_color","font_size","ui_density","dark_mode","sidebar_style","show_breadcrumb","show_live_indicator",
  "currency","currency_symbol","vat_rate","fiscal_year","date_format","time_zone","req_prefix","po_prefix","grn_prefix","pv_prefix","debug_mode","log_level","default_language",
  "req_approval_threshold","po_approval_threshold","enable_multi_approval","tender_min_value","allow_direct_purchase","direct_purchase_limit","enable_bid_evaluation","grn_auto_approve","req_auto_number","po_auto_number","grn_auto_number",
  "budget_warning_threshold","enable_budget_control","default_payment_terms","payment_cycle","withholding_tax_rate","enable_withholding","fiscal_year_start","bank_name","bank_account_no","bank_branch",
  "show_logo_print","show_watermark","print_copies","doc_footer","letterhead_html","print_font","print_font_size","paper_size","show_stamp",
  "enable_scanner","enable_documents","enable_odbc","enable_api","enable_quality","enable_fixed_assets","enable_vouchers","enable_financials","enable_tenders","enable_contracts_module",
  "api_key","webhook_url","backup_schedule","backup_retention","export_format","enable_sse","rate_limit","cors_origins","jwt_expiry",
];

function SettingsInner() {
  const { user, profile } = useAuth();
  const [S, setS]       = useState<Record<string,string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [sec, setSec]   = useState("hospital");
  const [showPass, setShowPass] = useState(false);
  const [dirty, setDirty] = useState(false);

  const set = (k:string,v:string) => { setS(p=>({...p,[k]:v})); setDirty(true); };

  const load = useCallback(async()=>{
    const [sRes, uRes] = await Promise.all([
      (supabase as any).from("system_settings").select("key,value").limit(300),
      (supabase as any).from("profiles").select("*,user_roles(role)").order("full_name").limit(300),
    ]);
    const m:Record<string,string>={};
    (sRes.data||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value||""; });
    setS(m); setUsers(uRes.data||[]); setDirty(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const save = async(keys:string[]) => {
    setSaving(true);
    const kvPairs: Record<string,string> = {};
    keys.forEach(k => { kvPairs[k] = S[k] ?? ""; });
    const { ok, error } = await saveSettings(kvPairs, sec);
    if (!ok) {
      toast({title:"Save failed", description: error, variant:"destructive"});
      setSaving(false);
      return;
    }
    // Broadcast to all connected users if key settings changed
    const broadcastKeys = ["hospital_name","system_name","primary_color","maintenance_mode","logo_url"];
    if(keys.some(k => broadcastKeys.includes(k))){
      await sendSystemBroadcast({
        title:"System Settings Updated",
        message:`Settings updated by ${profile?.full_name||"Admin"}. Changes are now live across all sessions.`,
        type:"info",
      }).catch(()=>{});
    }
    await (supabase as any).from("audit_log").insert({user_id:user?.id,action:"settings_updated",table_name:"system_settings",details:JSON.stringify({section:sec,count:keys.length,by:profile?.full_name})}).catch(()=>{});
    toast({title:`✓ ${keys.length} settings saved — live everywhere`});
    setDirty(false); setSaving(false);
  };

  const s  = (k:string, fb="") => S[k]??fb;
  const b  = (k:string)        => s(k)==="true";

  const updateUserRole = async(uid:string,role:string)=>{
    const{data:ex}=await (supabase as any).from("user_roles").select("id").eq("user_id",uid).maybeSingle();
    if(ex?.id) await (supabase as any).from("user_roles").update({role}).eq("id",ex.id);
    else       await (supabase as any).from("user_roles").insert({user_id:uid,role});
    toast({title:"Role updated ✓"}); load();
  };

  const toggleActive = async(u:any)=>{
    await (supabase as any).from("profiles").update({is_active:!u.is_active}).eq("id",u.id);
    toast({title:`User ${!u.is_active?"activated":"deactivated"} ✓`}); load();
  };

  return (
    <div style={{minHeight:"100%",background:"#f0f2f5",fontSize:14,fontFamily:"'Inter','Segoe UI',sans-serif"}}>
      {/* Top bar */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",padding:"14px 20px",display:"flex" as const,alignItems:"center" as const,gap:12,position:"sticky" as const,top:0,zIndex:100}}>
        <Settings style={{width:18,height:18,color:"#fff"}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:800,color:"#fff"}}>System Settings</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>All changes save globally to the database</div>
        </div>
        <div style={{display:"flex" as const,gap:8,alignItems:"center" as const}}>
          {dirty&&<span style={{fontSize:11,color:"#fbbf24",fontWeight:700,background:"rgba(251,191,36,0.15)",padding:"3px 10px",borderRadius:20}}>● Unsaved changes</span>}
          <button onClick={load} style={{padding:"8px 10px",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:7,cursor:"pointer" as const,color:"rgba(255,255,255,0.7)",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13}}/>
          </button>
          <button onClick={()=>save(ALL_KEYS)} disabled={saving} style={{display:"flex" as const,alignItems:"center" as const,gap:7,padding:"9px 20px",background:"#C45911",color:"#fff",border:"none",borderRadius:8,cursor:saving?"not-allowed":"pointer",fontSize:13,fontWeight:800}}>
            {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Save style={{width:13,height:13}}/>} Save All Settings
          </button>
        </div>
      </div>

      <div style={{display:"flex" as const,minHeight:"calc(100vh - 82px)"}}>
        {/* Sidebar */}
        <div style={{width:220,background:"#fff",borderRight:"1px solid #e5e7eb",padding:"12px 0",flexShrink:0,position:"sticky" as const,top:82,height:"calc(100vh - 82px)",overflowY:"auto" as const}}>
          {SECTIONS.map(x=>(
            <button key={x.id} onClick={()=>setSec(x.id)} style={{display:"flex" as const,alignItems:"center" as const,gap:10,width:"100%",padding:"11px 16px",border:"none",background:sec===x.id?`${x.color}12`:"transparent",cursor:"pointer" as const,textAlign:"left" as const,borderLeft:sec===x.id?`3px solid ${x.color}`:"3px solid transparent",transition:"all 0.1s"}}>
              <x.icon style={{width:15,height:15,color:sec===x.id?x.color:"#9ca3af",flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:sec===x.id?700:500,color:sec===x.id?x.color:"#374151"}}>{x.label}</span>
            </button>
          ))}
          <div style={{margin:"14px 12px 0",padding:"10px",background:"#f0f9ff",borderRadius:8,border:"1px solid #bae6fd"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#0369a1"}}>💡 Tip</div>
            <div style={{fontSize:11,color:"#0369a1",marginTop:2,lineHeight:1.4}}>"Save All Settings" updates every config value globally in one click.</div>
          </div>
        </div>

        {/* Main content */}
        <div style={{flex:1,padding:"24px",overflowY:"auto" as const}}>

          {sec==="hospital"&&(
            <Card title="Hospital Information" sub="Identity used across all documents and modules" color="#0078d4" icon={Building2} onSave={()=>save(["hospital_name","system_name","hospital_address","hospital_phone","hospital_email","hospital_website","hospital_pin","hospital_county","hospital_type","system_logo_url","hospital_motto","hospital_reg_no","hospital_bed_capacity","hospital_director"])} saving={saving}>
              {[{k:"hospital_name",l:"Hospital Name",s:"Official name"},{k:"system_name",l:"System Name",s:"Nav bar name"},{k:"hospital_director",l:"Director / CEO",s:"Current director"},{k:"hospital_address",l:"Physical Address"},{k:"hospital_phone",l:"Phone Number"},{k:"hospital_email",l:"Email",s:"Official email"},{k:"hospital_website",l:"Website URL"},{k:"hospital_pin",l:"KRA PIN"},{k:"hospital_reg_no",l:"Registration No."},{k:"hospital_county",l:"County"},{k:"hospital_bed_capacity",l:"Bed Capacity"},{k:"hospital_motto",l:"Motto / Tagline"},{k:"system_logo_url",l:"Logo URL / Path",s:"/src/assets/embu-county-logo.jpg"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#0078d4"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)}/></FR>
              ))}
              <FR label="Hospital Type" ac="#0078d4">
                <Sel value={s("hospital_type","level5")} onChange={v=>set("hospital_type",v)} opts={[{v:"level5",l:"Level 5 — County Referral"},{v:"level6",l:"National Referral"},{v:"level4",l:"Sub-County Hospital"},{v:"level3",l:"Health Centre"},{v:"private",l:"Private Hospital"}]}/>
              </FR>
            </Card>
          )}

          {sec==="email"&&(
            <Card title="Email & SMTP Configuration" sub="Configure the mail server for outgoing emails" color="#107c10" icon={Mail} onSave={()=>save(["smtp_host","smtp_port","smtp_user","smtp_password","smtp_from_name","smtp_from_email","smtp_security","smtp_enabled","email_reply_to","email_signature"])} saving={saving}>
              <FR label="Enable Email Sending" sub="Turn on/off all outgoing system emails" ac="#107c10"><Toggle on={b("smtp_enabled")} onChange={v=>set("smtp_enabled",String(v))}/></FR>
              {[{k:"smtp_host",l:"SMTP Host",s:"e.g. smtp.gmail.com"},{k:"smtp_port",l:"SMTP Port",s:"587 TLS / 465 SSL"},{k:"smtp_user",l:"SMTP Username"},{k:"smtp_from_name",l:"From Name"},{k:"smtp_from_email",l:"From Email",s:"Sender address"},{k:"email_reply_to",l:"Reply-To Email"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#107c10"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)}/></FR>
              ))}
              <FR label="SMTP Password" sub="Stored securely" ac="#107c10">
                <div style={{display:"flex" as const,gap:6,alignItems:"center" as const}}>
                  <Inp value={s("smtp_password")} onChange={(v:string)=>set("smtp_password",v)} type={showPass?"text":"password"}/>
                  <button onClick={()=>setShowPass(p=>!p)} style={{padding:9,background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer" as const,lineHeight:0}}>
                    {showPass?<EyeOff style={{width:14,height:14,color:"#6b7280"}}/>:<Eye style={{width:14,height:14,color:"#6b7280"}}/>}
                  </button>
                </div>
              </FR>
              <FR label="SMTP Security" ac="#107c10"><Sel value={s("smtp_security","tls")} onChange={v=>set("smtp_security",v)} opts={[{v:"tls",l:"TLS (STARTTLS)"},{v:"ssl",l:"SSL"},{v:"none",l:"None"}]}/></FR>
              <FR label="Email Signature" sub="Appended to outgoing emails" ac="#107c10"><TA value={s("email_signature")} onChange={(v:string)=>set("email_signature",v)} placeholder="Best regards,&#10;Procurement Dept"/></FR>
            </Card>
          )}

          {sec==="notifications"&&(
            <Card title="Notification Settings" sub="Control which events trigger notifications and via which channels" color="#f59e0b" icon={Bell} onSave={()=>save(["email_notifications","email_po_approval","email_req_approved","email_grn","email_tender","push_notifications","sms_notifications","realtime_notifications","notify_on_login","notify_on_grn","notify_on_payment","notify_on_contract","notify_budget_alert"])} saving={saving}>
              {[{k:"email_notifications",l:"Email Notifications",s:"Send emails for system events"},{k:"email_po_approval",l:"PO Approval Emails",s:"Email when POs need approval"},{k:"email_req_approved",l:"Requisition Approved Emails",s:"Notify when requisitions approved"},{k:"email_grn",l:"GRN Notification Emails"},{k:"email_tender",l:"Tender Emails"},{k:"push_notifications",l:"Browser Push Notifications"},{k:"sms_notifications",l:"SMS Notifications",s:"Via configured SMS gateway"},{k:"realtime_notifications",l:"Real-time In-App Alerts",s:"Live notification bell"},{k:"notify_on_login",l:"Login Alerts"},{k:"notify_on_grn",l:"GRN Real-time Alerts"},{k:"notify_on_payment",l:"Payment Notifications"},{k:"notify_on_contract",l:"Contract Notifications"},{k:"notify_budget_alert",l:"Budget Threshold Alerts",s:"Alert near budget limit"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#f59e0b"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
            </Card>
          )}

          {sec==="security"&&(
            <Card title="Security & Access Control" sub="Authentication, sessions, and access policies" color="#dc2626" icon={Shield} onSave={()=>save(["two_factor","enforce_strong_password","audit_log","require_approval_grn","maintenance_mode","session_timeout","max_login_attempts","password_min_length","ip_whitelist","allow_registration","lock_inactive_users","require_email_verify","login_banner"])} saving={saving}>
              {[{k:"two_factor",l:"Two-Factor Authentication",s:"Require 2FA for admin users"},{k:"enforce_strong_password",l:"Enforce Strong Password",s:"Min 8 chars, numbers and symbols"},{k:"audit_log",l:"Enable Audit Logging",s:"Record all user actions"},{k:"require_approval_grn",l:"Require GRN Approval",s:"GRNs must be approved before processing"},{k:"maintenance_mode",l:"Maintenance Mode",s:"Block non-admin access"},{k:"allow_registration",l:"Allow Self-Registration"},{k:"lock_inactive_users",l:"Lock Inactive Accounts",s:"Auto-disable after 90 days"},{k:"require_email_verify",l:"Email Verification Required"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#dc2626"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
              {[{k:"session_timeout",l:"Session Timeout (min)"},{k:"max_login_attempts",l:"Max Login Attempts"},{k:"password_min_length",l:"Min Password Length"}].map(f=>(
                <FR key={f.k} label={f.l} ac="#dc2626"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)} type="number"/></FR>
              ))}
              <FR label="IP Whitelist" sub="Comma-separated allowed IPs (empty = all)" ac="#dc2626"><Inp value={s("ip_whitelist")} onChange={(v:string)=>set("ip_whitelist",v)} placeholder="192.168.1.1,10.0.0.0/24"/></FR>
              <FR label="Login Banner" sub="Message on login page" ac="#dc2626"><TA value={s("login_banner")} onChange={(v:string)=>set("login_banner",v)} placeholder="Authorised users only."/></FR>
            </Card>
          )}

          {sec==="appearance"&&(
            <Card title="Appearance & UI" sub="Colours, fonts, layout density and branding" color="#8b5cf6" icon={Palette} onSave={()=>save(["primary_color","secondary_color","accent_color","font_size","ui_density","dark_mode","sidebar_style","show_breadcrumb","show_live_indicator"])} saving={saving}>
              {[{k:"primary_color",l:"Primary Color",s:"Nav and buttons"},{k:"secondary_color",l:"Secondary Color"},{k:"accent_color",l:"Accent Color",s:"Orange highlight"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#8b5cf6">
                  <div style={{display:"flex" as const,gap:8,alignItems:"center" as const}}>
                    <input type="color" value={s(f.k,"#1a3a6b")} onChange={e=>set(f.k,e.target.value)} style={{width:44,height:36,border:"1px solid #e5e7eb",borderRadius:6,cursor:"pointer" as const,padding:2}}/>
                    <Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)} placeholder="#1a3a6b"/>
                  </div>
                </FR>
              ))}
              <FR label="Font Size" ac="#8b5cf6"><Sel value={s("font_size","medium")} onChange={v=>set("font_size",v)} opts={[{v:"small",l:"Small (12px)"},{v:"medium",l:"Medium (14px)"},{v:"large",l:"Large (16px)"},{v:"xlarge",l:"X-Large (18px)"}]}/></FR>
              <FR label="UI Density" ac="#8b5cf6"><Sel value={s("ui_density","normal")} onChange={v=>set("ui_density",v)} opts={[{v:"compact",l:"Compact"},{v:"normal",l:"Normal"},{v:"comfortable",l:"Comfortable"}]}/></FR>
              <FR label="Sidebar Style" ac="#8b5cf6"><Sel value={s("sidebar_style","dark")} onChange={v=>set("sidebar_style",v)} opts={[{v:"dark",l:"Dark Navy"},{v:"light",l:"Light"},{v:"colored",l:"Colored"}]}/></FR>
              {[{k:"dark_mode",l:"Dark Mode"},{k:"show_breadcrumb",l:"Show Breadcrumb"},{k:"show_live_indicator",l:"Live Dot Indicator"}].map(f=>(
                <FR key={f.k} label={f.l} ac="#8b5cf6"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
            </Card>
          )}

          {sec==="system"&&(
            <Card title="System Configuration" sub="Locale, numbering, time zone, and operational settings" color="#374151" icon={Server} onSave={()=>save(["currency","currency_symbol","vat_rate","fiscal_year","date_format","time_zone","req_prefix","po_prefix","grn_prefix","pv_prefix","debug_mode","log_level","default_language"])} saving={saving}>
              <FR label="Currency" ac="#374151"><Sel value={s("currency","KES")} onChange={v=>set("currency",v)} opts={[{v:"KES",l:"KES — Kenyan Shilling"},{v:"USD",l:"USD"},{v:"EUR",l:"EUR"},{v:"GBP",l:"GBP"}]}/></FR>
              <FR label="Currency Symbol" ac="#374151"><Inp value={s("currency_symbol","KES")} onChange={(v:string)=>set("currency_symbol",v)}/></FR>
              <FR label="VAT Rate (%)" ac="#374151"><Inp value={s("vat_rate","16")} onChange={(v:string)=>set("vat_rate",v)} type="number"/></FR>
              <FR label="Fiscal Year" sub="Format: YYYY/YYYY" ac="#374151"><Inp value={s("fiscal_year")} onChange={(v:string)=>set("fiscal_year",v)} placeholder="2025/2026"/></FR>
              <FR label="Date Format" ac="#374151"><Sel value={s("date_format","DD/MM/YYYY")} onChange={v=>set("date_format",v)} opts={[{v:"DD/MM/YYYY",l:"DD/MM/YYYY"},{v:"MM/DD/YYYY",l:"MM/DD/YYYY"},{v:"YYYY-MM-DD",l:"YYYY-MM-DD"}]}/></FR>
              <FR label="Time Zone" ac="#374151"><Sel value={s("time_zone","Africa/Nairobi")} onChange={v=>set("time_zone",v)} opts={[{v:"Africa/Nairobi",l:"Africa/Nairobi (EAT)"},{v:"UTC",l:"UTC"},{v:"Africa/Lagos",l:"Africa/Lagos"},{v:"Africa/Cairo",l:"Africa/Cairo"}]}/></FR>
              <FR label="Language" ac="#374151"><Sel value={s("default_language","en")} onChange={v=>set("default_language",v)} opts={[{v:"en",l:"English"},{v:"sw",l:"Swahili"},{v:"fr",l:"French"}]}/></FR>
              <div style={{fontWeight:700,fontSize:13,color:"#374151",borderTop:"1px solid #f3f4f6",padding:"16px 0 4px"}}>Document Number Prefixes</div>
              {[{k:"req_prefix",l:"Requisition Prefix",pl:"REQ-"},{k:"po_prefix",l:"Purchase Order Prefix",pl:"PO-"},{k:"grn_prefix",l:"GRN Prefix",pl:"GRN-"},{k:"pv_prefix",l:"Payment Voucher Prefix",pl:"PV-"}].map(f=>(
                <FR key={f.k} label={f.l} ac="#374151"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)} placeholder={f.pl}/></FR>
              ))}
              <FR label="Debug Mode" sub="Verbose errors (disable in production)" ac="#374151"><Toggle on={b("debug_mode")} onChange={v=>set("debug_mode",String(v))}/></FR>
              <FR label="Log Level" ac="#374151"><Sel value={s("log_level","info")} onChange={v=>set("log_level",v)} opts={[{v:"error",l:"Error only"},{v:"warn",l:"Warnings"},{v:"info",l:"Info"},{v:"debug",l:"Debug (verbose)"}]}/></FR>
            </Card>
          )}

          {sec==="procurement"&&(
            <Card title="Procurement Rules & Thresholds" sub="Approval workflows, limits, and automatic numbering" color="#C45911" icon={ShoppingCart} onSave={()=>save(["req_approval_threshold","po_approval_threshold","enable_multi_approval","tender_min_value","allow_direct_purchase","direct_purchase_limit","enable_bid_evaluation","grn_auto_approve","req_auto_number","po_auto_number","grn_auto_number"])} saving={saving}>
              {[{k:"req_approval_threshold",l:"Requisition Approval Threshold (KES)",s:"Above this requires manager approval"},{k:"po_approval_threshold",l:"PO Approval Threshold (KES)",s:"Above this needs director approval"},{k:"tender_min_value",l:"Minimum Tender Value (KES)",s:"Orders above this must go to tender"},{k:"direct_purchase_limit",l:"Direct Purchase Limit (KES)"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#C45911"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)} type="number"/></FR>
              ))}
              {[{k:"enable_multi_approval",l:"Multi-Level Approval",s:"Sequential approval chain"},{k:"allow_direct_purchase",l:"Allow Direct Purchase"},{k:"enable_bid_evaluation",l:"Bid Evaluation Module"},{k:"grn_auto_approve",l:"Auto-Approve Low-Value GRNs"},{k:"req_auto_number",l:"Auto-Number Requisitions"},{k:"po_auto_number",l:"Auto-Number POs"},{k:"grn_auto_number",l:"Auto-Number GRNs"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#C45911"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
            </Card>
          )}

          {sec==="finance"&&(
            <Card title="Finance & Budget Settings" sub="Budget controls, payment terms, and banking details" color="#0369a1" icon={DollarSign} onSave={()=>save(["budget_warning_threshold","enable_budget_control","default_payment_terms","payment_cycle","withholding_tax_rate","enable_withholding","fiscal_year_start","bank_name","bank_account_no","bank_branch"])} saving={saving}>
              {[{k:"budget_warning_threshold",l:"Budget Warning Threshold (%)",s:"Alert when this % spent"},{k:"withholding_tax_rate",l:"Withholding Tax Rate (%)"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#0369a1"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)} type="number"/></FR>
              ))}
              {[{k:"enable_budget_control",l:"Enable Budget Control",s:"Block purchases over budget"},{k:"enable_withholding",l:"Enable Withholding Tax"},{k:"bank_reconciliation",l:"Bank Reconciliation Module"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#0369a1"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
              <FR label="Default Payment Terms" ac="#0369a1"><Sel value={s("default_payment_terms","30days")} onChange={v=>set("default_payment_terms",v)} opts={[{v:"immediate",l:"Immediate"},{v:"7days",l:"Net 7"},{v:"14days",l:"Net 14"},{v:"30days",l:"Net 30"},{v:"60days",l:"Net 60"}]}/></FR>
              <FR label="Fiscal Year Start" ac="#0369a1"><Sel value={s("fiscal_year_start","july")} onChange={v=>set("fiscal_year_start",v)} opts={[{v:"january",l:"January"},{v:"april",l:"April"},{v:"july",l:"July (Kenya Govt.)"},{v:"october",l:"October"}]}/></FR>
              {[{k:"bank_name",l:"Bank Name"},{k:"bank_account_no",l:"Account Number"},{k:"bank_branch",l:"Bank Branch"}].map(f=>(
                <FR key={f.k} label={f.l} ac="#0369a1"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)}/></FR>
              ))}
            </Card>
          )}

          {sec==="printing"&&(
            <Card title="Print & Document Settings" sub="Letterheads, watermarks, and print layout" color="#92400e" icon={Printer} onSave={()=>save(["show_logo_print","show_watermark","print_copies","doc_footer","letterhead_html","print_font","print_font_size","paper_size","show_stamp"])} saving={saving}>
              {[{k:"show_logo_print",l:"Show Logo on Printed Docs"},{k:"show_watermark",l:"Show Document Watermark"},{k:"show_stamp",l:"Show Official Stamp"}].map(f=>(
                <FR key={f.k} label={f.l} ac="#92400e"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
              <FR label="Copies per Print" ac="#92400e"><Inp value={s("print_copies","1")} onChange={(v:string)=>set("print_copies",v)} type="number"/></FR>
              <FR label="Paper Size" ac="#92400e"><Sel value={s("paper_size","A4")} onChange={v=>set("paper_size",v)} opts={[{v:"A4",l:"A4 (210×297mm)"},{v:"Letter",l:"Letter (8.5×11in)"},{v:"A3",l:"A3 (297×420mm)"}]}/></FR>
              <FR label="Print Font" ac="#92400e"><Sel value={s("print_font","Times New Roman")} onChange={v=>set("print_font",v)} opts={[{v:"Times New Roman",l:"Times New Roman"},{v:"Arial",l:"Arial"},{v:"Calibri",l:"Calibri"}]}/></FR>
              <FR label="Print Font Size (pt)" ac="#92400e"><Inp value={s("print_font_size","11")} onChange={(v:string)=>set("print_font_size",v)} type="number"/></FR>
              <FR label="Document Footer" sub="Text at bottom of all documents" ac="#92400e"><TA value={s("doc_footer")} onChange={(v:string)=>set("doc_footer",v)} placeholder="Official document of Embu Level 5 Hospital."/></FR>
              <FR label="Letterhead HTML" sub="Custom HTML for document headers" ac="#92400e"><TA value={s("letterhead_html")} onChange={(v:string)=>set("letterhead_html",v)} rows={4} placeholder="<div>Custom letterhead HTML...</div>"/></FR>
            </Card>
          )}

          {sec==="modules"&&(
            <Card title="Module Toggles" sub="Enable or disable system modules for all users" color="#059669" icon={Cpu} onSave={()=>save(["enable_scanner","enable_documents","enable_odbc","enable_api","enable_quality","enable_fixed_assets","enable_vouchers","enable_financials","enable_tenders","enable_contracts_module"])} saving={saving}>
              {[{k:"enable_scanner",l:"Barcode / QR Scanner",s:"Item scanning for inventory"},{k:"enable_documents",l:"Documents & Templates",s:"Document management and printing"},{k:"enable_quality",l:"Quality Control Module",s:"Inspections and non-conformance"},{k:"enable_fixed_assets",l:"Fixed Assets Register"},{k:"enable_vouchers",l:"Vouchers Module",s:"Payment, receipt, journal vouchers"},{k:"enable_financials",l:"Financials / Accounts",s:"Chart of accounts, budgets, GL"},{k:"enable_tenders",l:"Tender Management"},{k:"enable_contracts_module",l:"Contract Management"},{k:"enable_odbc",l:"ODBC Connections",s:"External database connectivity"},{k:"enable_api",l:"REST API Access",s:"Third-party integration"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#059669"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
            </Card>
          )}

          {sec==="users"&&(
            <div style={{background:"#fff",borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",marginBottom:24,overflow:"hidden" as const,border:"1px solid #e5e7eb"}}>
              <div style={{padding:"14px 20px",background:"linear-gradient(135deg,#5b21b614,#5b21b608)",borderBottom:"2px solid #5b21b630",display:"flex" as const,alignItems:"center" as const,gap:12}}>
                <div style={{width:38,height:38,borderRadius:10,background:"#5b21b6",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}><Users style={{width:18,height:18,color:"#fff"}}/></div>
                <div style={{flex:1}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#111827"}}>User Roles & Access</div>
                  <div style={{fontSize:12,color:"#6b7280"}}>{users.length} users — click role dropdown to update instantly</div>
                </div>
              </div>
              <div style={{overflowX:"auto" as const}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                  <thead><tr style={{background:"#f9fafb"}}>
                    {["Name","Email","Department","Role","Status","Action"].map(h=>(
                      <th key={h} style={{padding:"11px 16px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"#6b7280",borderBottom:"1px solid #f3f4f6",textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {users.map((u,i)=>(
                      <tr key={u.id} style={{borderBottom:"1px solid #f9fafb",background:i%2===0?"#fff":"#fafafa"}}>
                        <td style={{padding:"11px 16px",fontWeight:600,color:"#111827"}}>{u.full_name||"—"}</td>
                        <td style={{padding:"11px 16px",color:"#6b7280",fontSize:12}}>{u.email}</td>
                        <td style={{padding:"11px 16px",color:"#6b7280",fontSize:12}}>{u.department||"—"}</td>
                        <td style={{padding:"11px 16px"}}>
                          <select value={u.user_roles?.[0]?.role||"requisitioner"} onChange={e=>updateUserRole(u.id,e.target.value)}
                            style={{padding:"6px 10px",fontSize:12,border:"1px solid #e5e7eb",borderRadius:6,outline:"none",fontFamily:"inherit",cursor:"pointer" as const,fontWeight:600,color:"#1a3a6b",background:"#eff6ff"}}>
                            {["admin","procurement_manager","procurement_officer","finance_officer","inventory_manager","warehouse_officer","requisitioner","quality_officer","viewer"].map(r=>(
                              <option key={r} value={r}>{r.replace(/_/g," ")}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{padding:"11px 16px"}}>
                          <span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:u.is_active!==false?"#dcfce7":"#fee2e2",color:u.is_active!==false?"#15803d":"#dc2626"}}>
                            {u.is_active!==false?"Active":"Inactive"}
                          </span>
                        </td>
                        <td style={{padding:"11px 16px"}}>
                          <button onClick={()=>toggleActive(u)} style={{padding:"5px 12px",fontSize:11,fontWeight:700,borderRadius:6,border:"1px solid #e5e7eb",cursor:"pointer" as const,background:u.is_active!==false?"#fee2e2":"#dcfce7",color:u.is_active!==false?"#dc2626":"#15803d"}}>
                            {u.is_active!==false?"Deactivate":"Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {sec==="advanced"&&(
            <Card title="Advanced & API Configuration" sub="Webhooks, API keys, CORS, backup, and developer settings" color="#dc2626" icon={Zap} onSave={()=>save(["api_key","webhook_url","backup_schedule","backup_retention","export_format","enable_sse","rate_limit","cors_origins","jwt_expiry","odbc_enabled"])} saving={saving}>
              {[{k:"api_key",l:"API Key",s:"Secret key for REST API"},{k:"webhook_url",l:"Webhook URL",s:"POST endpoint for system events"},{k:"cors_origins",l:"CORS Origins",s:"Comma-separated allowed origins"},{k:"jwt_expiry",l:"JWT Expiry (hours)"},{k:"rate_limit",l:"Rate Limit (req/min)"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#dc2626"><Inp value={s(f.k)} onChange={(v:string)=>set(f.k,v)}/></FR>
              ))}
              {[{k:"odbc_enabled",l:"ODBC / External DB"},{k:"enable_sse",l:"Server-Sent Events (SSE)",s:"Real-time event streaming"}].map(f=>(
                <FR key={f.k} label={f.l} sub={f.s} ac="#dc2626"><Toggle on={b(f.k)} onChange={v=>set(f.k,String(v))}/></FR>
              ))}
              <FR label="Backup Schedule" ac="#dc2626"><Sel value={s("backup_schedule","daily")} onChange={v=>set("backup_schedule",v)} opts={[{v:"hourly",l:"Hourly"},{v:"daily",l:"Daily"},{v:"weekly",l:"Weekly"},{v:"monthly",l:"Monthly"}]}/></FR>
              <FR label="Backup Retention (days)" ac="#dc2626"><Inp value={s("backup_retention","30")} onChange={(v:string)=>set("backup_retention",v)} type="number"/></FR>
              <FR label="Export Format" ac="#dc2626"><Sel value={s("export_format","xlsx")} onChange={v=>set("export_format",v)} opts={[{v:"xlsx",l:"Excel (.xlsx)"},{v:"csv",l:"CSV"},{v:"pdf",l:"PDF"},{v:"json",l:"JSON"}]}/></FR>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <RoleGuard allowed={["admin"]}><SettingsInner/></RoleGuard>;
}
