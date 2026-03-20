/**
 * ProcurBosse — System Settings Page v3.0
 * Complete redesign — dark glass UI, full admin control
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { sendSystemBroadcast } from "@/lib/broadcast";
import {
  Settings, Save, RefreshCw, Bell, Mail, Shield,
  Building2, Users, Palette, Eye, EyeOff,
  Server, Printer, Cpu, Zap, DollarSign, ShoppingCart,
  Lock, Globe, Activity, CheckCircle, AlertTriangle,
  Phone, Database, Wifi, Key, Radio, FileText, Sliders,
  MessageSquare, ToggleLeft, ToggleRight
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";

const TABS = [
  { id:"hospital",   label:"Hospital",    icon:Building2,   color:"#0078d4" },
  { id:"email",      label:"Email/SMTP",  icon:Mail,        color:"#059669" },
  { id:"sms",        label:"SMS/Twilio",  icon:Phone,       color:"#7c3aed" },
  { id:"security",   label:"Security",    icon:Shield,      color:"#dc2626" },
  { id:"appearance", label:"Appearance",  icon:Palette,     color:"#8b5cf6" },
  { id:"modules",    label:"Modules",     icon:Sliders,     color:"#0369a1" },
  { id:"print",      label:"Print",       icon:Printer,     color:"#C45911" },
  { id:"system",     label:"System",      icon:Server,      color:"#374151" },
];

const ALL_KEYS = [
  "hospital_name","county_name","department_name","system_name","hospital_address",
  "po_box","hospital_phone","hospital_email","doc_footer","currency_symbol","vat_rate",
  "logo_url","seal_url","smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name",
  "smtp_from_email","smtp_tls","smtp_enabled","twilio_enabled","twilio_account_sid",
  "twilio_auth_token","twilio_phone_number","sms_hospital_name",
  "ip_restriction_enabled","allow_all_private","log_all_ips","revoke_on_ip_change",
  "force_network_check","allowed_ips","session_timeout","max_login_attempts","audit_logins",
  "primary_color","accent_color","theme","print_font","print_font_size","paper_size",
  "show_logo_print","show_stamp","show_watermark","print_confidential",
  "enable_procurement","enable_financials","enable_quality","enable_tenders",
  "enable_contracts_module","enable_documents","enable_scanner","enable_email",
  "realtime_notifications","maintenance_mode","date_format","timezone","max_upload_mb",
  "allow_registration","default_user_role",
];

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ background:"transparent",border:"none",cursor:"pointer",padding:0,lineHeight:0,flexShrink:0 }}>
      <div style={{ width:48,height:26,borderRadius:13,background:on?"#4f46e5":"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",padding:"3px",transition:"background 0.2s",border:`1px solid ${on?"#4f46e5":"rgba(255,255,255,0.15)"}` }}>
        <div style={{ width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)",boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }}/>
      </div>
    </button>
  );
}

function FR({ label, sub, children, ac }: { label:string; sub?:string; children:React.ReactNode; ac?:string }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:"1px solid rgba(255,255,255,0.06)",gap:16 }}>
      <div style={{ flex:1 }}>
        {ac && <div style={{ width:3,height:14,borderRadius:2,background:ac,display:"inline-block",marginRight:8,verticalAlign:"middle" }}/>}
        <span style={{ fontSize:13.5,fontWeight:600,color:"#f1f5f9" }}>{label}</span>
        {sub && <div style={{ fontSize:11.5,color:"#64748b",marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Card({ title, sub, color, icon: Icon, onSave, saving, children }: any) {
  return (
    <div style={{ background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:14,padding:"18px 22px",marginBottom:20,overflow:"hidden" }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ width:36,height:36,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon style={{ width:17,height:17,color:"#fff" }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14,fontWeight:700,color:"#f1f5f9" }}>{title}</div>
          {sub && <div style={{ fontSize:11,color:"#64748b" }}>{sub}</div>}
        </div>
        {onSave && (
          <button onClick={onSave} disabled={saving} style={{ padding:"6px 14px",borderRadius:7,border:"none",background:"rgba(79,70,229,0.8)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
            <Save style={{ width:12,height:12 }}/>{saving?"Saving…":"Save"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SettingsInner() {
  const { user, profile } = useAuth();
  const { settings: globalSettings } = useSystemSettings();
  const [tab, setTab] = useState("hospital");
  const [s, setS] = useState<Record<string,string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testResult, setTestResult] = useState<{ok:boolean;msg:string}|null>(null);
  const [testing, setTesting] = useState(false);

  const inp = { width:"100%", padding:"8px 11px", border:"1px solid rgba(255,255,255,0.12)", borderRadius:7, fontSize:13, color:"#f1f5f9", background:"rgba(255,255,255,0.06)", outline:"none" };
  const btn = (c: string) => ({ padding:"8px 18px",borderRadius:8,border:"none",background:c,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer" });

  useEffect(() => { setS({ ...globalSettings }); }, [globalSettings]);

  const get = (k: string, def = "") => s[k] ?? def;
  const set = (k: string, v: string) => { setS(p => ({ ...p, [k]: v })); setDirty(true); };

  async function save(keys: string[]) {
    setSaving(true);
    const subset: Record<string,string> = {};
    keys.forEach(k => { if (s[k] !== undefined) subset[k] = s[k]; });
    const res = await saveSettings(subset);
    if (res.ok) {
      await sendSystemBroadcast({ title:"Settings Updated", message:`System settings updated by ${profile?.full_name||user?.email}`, type:"info" });
      toast({ title:"✅ Settings saved & propagated to all users" });
      setDirty(false);
    } else {
      toast({ title:"Save failed: " + res.error, variant:"destructive" });
    }
    setSaving(false);
  }

  async function testEmail() {
    setTesting(true); setTestResult(null);
    try {
      const { error, data } = await supabase.functions.invoke("send-email", {
        body: { to: s["hospital_email"]||user?.email, subject:"ProcurBosse SMTP Test", body:"This is a test email from EL5 MediProcure settings page." }
      });
      setTestResult(error ? { ok:false, msg:error.message } : { ok:true, msg:"Test email sent! Check your inbox." });
    } catch(e:any) {
      setTestResult({ ok:false, msg:e.message });
    }
    setTesting(false);
  }

  return (
    <div style={{ minHeight:"100%", background:"linear-gradient(135deg,#0a0f1e 0%,#0d1b35 50%,#0a1628 100%)", color:"#f1f5f9" }}>
      {/* Header */}
      <div style={{ background:"rgba(79,70,229,0.1)",borderBottom:"1px solid rgba(79,70,229,0.2)",padding:"14px 22px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)" }}>
        <div style={{ width:38,height:38,borderRadius:10,background:"linear-gradient(135deg,#4f46e5,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Settings style={{ width:18,height:18,color:"#fff" }}/>
        </div>
        <div>
          <div style={{ fontSize:16,fontWeight:800,color:"#f1f5f9" }}>System Settings</div>
          <div style={{ fontSize:11,color:"#64748b" }}>All changes save globally to database</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"center" }}>
          {dirty && <span style={{ fontSize:11,color:"#fbbf24",background:"rgba(251,191,36,0.15)",padding:"3px 10px",borderRadius:20,fontWeight:700 }}>● Unsaved changes</span>}
          <button onClick={() => save(ALL_KEYS)} disabled={saving} style={{ ...btn("linear-gradient(135deg,#4f46e5,#7c3aed)"),display:"flex",alignItems:"center",gap:6 }}>
            <Save style={{ width:13,height:13 }}/>{saving?"Saving…":"Save All Settings"}
          </button>
        </div>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"190px 1fr",minHeight:"calc(100vh - 70px)" }}>
        {/* Sidebar */}
        <div style={{ background:"rgba(0,0,0,0.3)",borderRight:"1px solid rgba(255,255,255,0.05)",padding:"12px 0" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:tab===t.id?`rgba(79,70,229,0.15)`:"transparent",border:"none",cursor:"pointer",borderLeft:tab===t.id?`3px solid ${t.color}`:"3px solid transparent" }}>
              <t.icon style={{ width:15,height:15,color:tab===t.id?t.color:"#475569",flexShrink:0 }}/>
              <span style={{ fontSize:12.5,fontWeight:tab===t.id?700:400,color:tab===t.id?"#f1f5f9":"#64748b" }}>{t.label}</span>
            </button>
          ))}
          <div style={{ margin:"12px",padding:"10px",background:"rgba(79,70,229,0.1)",borderRadius:8,border:"1px solid rgba(79,70,229,0.2)" }}>
            <div style={{ fontSize:10,fontWeight:700,color:"#818cf8",marginBottom:4 }}>💡 Tip</div>
            <div style={{ fontSize:10,color:"#64748b",lineHeight:1.4 }}>Settings propagate to all users instantly via real-time sync.</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:"22px 28px",overflowY:"auto",maxHeight:"calc(100vh - 70px)" }}>

          {tab === "hospital" && (
            <Card title="Hospital Information" sub="Core organisation details used in all documents and prints" color="#0078d4" icon={Building2} onSave={() => save(["hospital_name","county_name","department_name","system_name","hospital_address","po_box","hospital_phone","hospital_email","doc_footer","currency_symbol","vat_rate","logo_url","seal_url"])} saving={saving}>
              {[
                { k:"hospital_name",    l:"Hospital Name",     p:"Embu Level 5 Hospital" },
                { k:"county_name",      l:"County Name",       p:"Embu County Government" },
                { k:"department_name",  l:"Department",        p:"Department of Health" },
                { k:"system_name",      l:"System Name",       p:"EL5 MediProcure" },
                { k:"hospital_address", l:"Physical Address",  p:"Embu Town, Kenya" },
                { k:"po_box",           l:"P.O. Box",          p:"P.O. Box 591-60100, Embu" },
                { k:"hospital_phone",   l:"Phone",             p:"+254 060 000000" },
                { k:"hospital_email",   l:"Email Address",     p:"info@embu.health.go.ke" },
                { k:"doc_footer",       l:"Document Footer",   p:"Embu Level 5 Hospital · Embu County Government" },
                { k:"currency_symbol",  l:"Currency Symbol",   p:"KES" },
                { k:"vat_rate",         l:"VAT Rate (%)",      p:"16" },
                { k:"logo_url",         l:"Logo URL",          p:"https://…/logo.png" },
                { k:"seal_url",         l:"Seal / Badge URL",  p:"https://…/seal.png" },
              ].map(f => (
                <FR key={f.k} label={f.l} ac="#0078d4">
                  <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:280}} placeholder={f.p}/>
                </FR>
              ))}
            </Card>
          )}

          {tab === "email" && (
            <Card title="Email & SMTP" sub="Configure SMTP for email delivery" color="#059669" icon={Mail} onSave={() => save(["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled"])} saving={saving}>
              <FR label="Email Mode" ac="#059669">
                <div style={{ display:"flex",gap:8 }}>
                  {[{ v:"smtp",l:"SMTP" },{ v:"internal",l:"Internal Only" }].map(opt => (
                    <button key={opt.v} onClick={() => set("email_mode",opt.v)} style={{ padding:"6px 14px",borderRadius:7,border:`1.5px solid ${get("email_mode","smtp")===opt.v?"#059669":"rgba(255,255,255,0.12)"}`,background:get("email_mode","smtp")===opt.v?"rgba(5,150,105,0.2)":"transparent",color:get("email_mode","smtp")===opt.v?"#10b981":"#94a3b8",fontSize:12,fontWeight:700,cursor:"pointer" }}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </FR>
              {[
                { k:"smtp_host",       l:"SMTP Host",     p:"smtp.gmail.com" },
                { k:"smtp_port",       l:"SMTP Port",     p:"587" },
                { k:"smtp_user",       l:"Username",      p:"noreply@embu.go.ke" },
                { k:"smtp_from_name",  l:"From Name",     p:"EL5 MediProcure" },
                { k:"smtp_from_email", l:"From Email",    p:"noreply@embu.go.ke" },
              ].map(f => (
                <FR key={f.k} label={f.l} ac="#059669">
                  <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p}/>
                </FR>
              ))}
              <FR label="SMTP Password" ac="#059669">
                <div style={{ position:"relative",width:260 }}>
                  <input type={showPass?"text":"password"} value={get("smtp_pass")} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,paddingRight:34}} placeholder="••••••••"/>
                  <button onClick={()=>setShowPass(p=>!p)} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer" }}>
                    {showPass?<EyeOff style={{ width:14,height:14,color:"#64748b" }}/>:<Eye style={{ width:14,height:14,color:"#64748b" }}/>}
                  </button>
                </div>
              </FR>
              <FR label="Use TLS" ac="#059669"><Toggle on={get("smtp_tls")!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")}/></FR>
              <FR label="Enable SMTP" sub="Use SMTP for all email delivery" ac="#059669"><Toggle on={get("smtp_enabled")==="true"} onChange={v=>set("smtp_enabled",v?"true":"false")}/></FR>
              {testResult && (
                <div style={{ margin:"10px 0",padding:"8px 12px",borderRadius:8,background:testResult.ok?"rgba(5,150,105,0.15)":"rgba(220,38,38,0.15)",border:`1px solid ${testResult.ok?"#059669":"#dc2626"}`,display:"flex",alignItems:"center",gap:8 }}>
                  {testResult.ok?<CheckCircle style={{ width:14,height:14,color:"#10b981" }}/>:<AlertTriangle style={{ width:14,height:14,color:"#ef4444" }}/>}
                  <span style={{ fontSize:12,color:testResult.ok?"#10b981":"#ef4444" }}>{testResult.msg}</span>
                </div>
              )}
              <div style={{ marginTop:12 }}>
                <button onClick={testEmail} disabled={testing} style={{ ...btn("rgba(5,150,105,0.6)"),fontSize:12 }}>{testing?"Testing…":"Send Test Email"}</button>
              </div>
            </Card>
          )}

          {tab === "sms" && (
            <Card title="SMS / Twilio" sub="SMS notifications for approvals, alerts, low stock" color="#7c3aed" icon={Phone} onSave={() => save(["twilio_enabled","twilio_account_sid","twilio_auth_token","twilio_phone_number","sms_hospital_name"])} saving={saving}>
              <FR label="Enable Twilio SMS" sub="Activate SMS delivery via Twilio" ac="#7c3aed"><Toggle on={get("twilio_enabled")==="true"} onChange={v=>set("twilio_enabled",v?"true":"false")}/></FR>
              {[
                { k:"twilio_account_sid",  l:"Account SID",    p:"ACxxxxxxxxxxxxxxxx" },
                { k:"twilio_auth_token",   l:"Auth Token",     p:"your_auth_token" },
                { k:"twilio_phone_number", l:"Twilio Phone",   p:"+12025551234" },
                { k:"sms_hospital_name",   l:"SMS From Name",  p:"EL5 MediProcure" },
              ].map(f => (
                <FR key={f.k} label={f.l} ac="#7c3aed">
                  <input type={f.k==="twilio_auth_token"?"password":"text"} value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p}/>
                </FR>
              ))}
              <div style={{ marginTop:10,padding:"10px 12px",background:"rgba(124,58,237,0.1)",borderRadius:8,border:"1px solid rgba(124,58,237,0.2)",fontSize:12,color:"#a78bfa" }}>
                Get credentials at <a href="https://www.twilio.com/console" target="_blank" rel="noreferrer" style={{ color:"#818cf8" }}>twilio.com/console</a>. 
                Store in system_settings for secure access by edge functions.
              </div>
              <FR label="SMS on PO Approval" ac="#7c3aed"><Toggle on={get("sms_on_po_approve")!=="false"} onChange={v=>set("sms_on_po_approve",v?"true":"false")}/></FR>
              <FR label="SMS on Req Approval" ac="#7c3aed"><Toggle on={get("sms_on_req_approve")!=="false"} onChange={v=>set("sms_on_req_approve",v?"true":"false")}/></FR>
              <FR label="SMS on Low Stock" ac="#7c3aed"><Toggle on={get("sms_on_low_stock")!=="false"} onChange={v=>set("sms_on_low_stock",v?"true":"false")}/></FR>
              <FR label="SMS on Payment" ac="#7c3aed"><Toggle on={get("sms_on_payment")!=="false"} onChange={v=>set("sms_on_payment",v?"true":"false")}/></FR>
            </Card>
          )}

          {tab === "security" && (
            <Card title="Security & Access Control" sub="IP restriction, sessions, authentication" color="#dc2626" icon={Shield} onSave={() => save(["ip_restriction_enabled","allow_all_private","log_all_ips","revoke_on_ip_change","force_network_check","allowed_ips","session_timeout","max_login_attempts","audit_logins"])} saving={saving}>
              {[
                { k:"ip_restriction_enabled", l:"IP Restriction Active",    s:"Block unauthorized IP addresses" },
                { k:"allow_all_private",       l:"Allow All Private IPs",   s:"Auto-allow 10.x, 192.168.x, 172.16.x" },
                { k:"log_all_ips",             l:"Log All Access Attempts", s:"Record every IP check in ip_access_log" },
                { k:"revoke_on_ip_change",     l:"Revoke on IP Change",     s:"Force re-login if IP changes" },
                { k:"force_network_check",     l:"Strict IP Check",         s:"Verify IP on every page navigation" },
                { k:"audit_logins",            l:"Audit All Logins",        s:"Log every login attempt" },
              ].map(f => (
                <FR key={f.k} label={f.l} sub={f.s} ac="#dc2626">
                  <Toggle on={get(f.k)==="true"} onChange={v=>set(f.k,v?"true":"false")}/>
                </FR>
              ))}
              <FR label="Session Timeout (min)" ac="#dc2626">
                <input value={get("session_timeout","480")} onChange={e=>set("session_timeout",e.target.value)} style={{...inp,width:80}} type="number"/>
              </FR>
              <FR label="Max Login Attempts" ac="#dc2626">
                <input value={get("max_login_attempts","5")} onChange={e=>set("max_login_attempts",e.target.value)} style={{...inp,width:80}} type="number"/>
              </FR>
              <FR label="Allowed IP CIDRs" sub="Comma-separated, e.g. 192.168.1.0/24" ac="#dc2626">
                <input value={get("allowed_ips")} onChange={e=>set("allowed_ips",e.target.value)} style={{...inp,width:300}} placeholder="192.168.1.0/24, 10.0.0.0/8"/>
              </FR>
            </Card>
          )}

          {tab === "appearance" && (
            <Card title="Appearance & UI" sub="Brand colors, theme" color="#8b5cf6" icon={Palette} onSave={() => save(["primary_color","accent_color","theme"])} saving={saving}>
              {[{ k:"primary_color",l:"Primary Color" },{ k:"accent_color",l:"Accent Color" }].map(f => (
                <FR key={f.k} label={f.l} ac="#8b5cf6">
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <input type="color" value={get(f.k,"#1a3a6b")} onChange={e=>set(f.k,e.target.value)} style={{ width:40,height:32,borderRadius:6,cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)",padding:2,background:"transparent" }}/>
                    <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:100}} placeholder="#1a3a6b"/>
                  </div>
                </FR>
              ))}
              <FR label="Theme" ac="#8b5cf6">
                <select value={get("theme","dark")} onChange={e=>set("theme",e.target.value)} style={{...inp,width:140}}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </FR>
            </Card>
          )}

          {tab === "modules" && (
            <Card title="Module Toggles" sub="Enable or disable ERP modules system-wide" color="#0369a1" icon={Sliders} onSave={() => save(["enable_procurement","enable_financials","enable_quality","enable_tenders","enable_contracts_module","enable_documents","enable_scanner","enable_email","realtime_notifications","maintenance_mode"])} saving={saving}>
              {[
                { k:"enable_procurement",       l:"Procurement",         s:"Requisitions, POs, GRN, Suppliers" },
                { k:"enable_financials",         l:"Finance",             s:"Vouchers, Budgets, Chart of Accounts" },
                { k:"enable_quality",            l:"Quality Control",     s:"Inspections, Non-Conformance" },
                { k:"enable_tenders",            l:"Tenders",             s:"Tender management" },
                { k:"enable_contracts_module",   l:"Contracts",           s:"Contract management" },
                { k:"enable_documents",          l:"Documents",           s:"Document library" },
                { k:"enable_scanner",            l:"QR Scanner",          s:"Barcode and QR scanning" },
                { k:"enable_email",              l:"Email System",        s:"Internal mail and notifications" },
                { k:"realtime_notifications",    l:"Real-time Alerts",    s:"Live Supabase channel notifications" },
                { k:"maintenance_mode",          l:"Maintenance Mode",    s:"Blocks all non-admin access" },
              ].map(f => (
                <FR key={f.k} label={f.l} sub={f.s} ac="#0369a1">
                  <Toggle on={get(f.k)!=="false"} onChange={v=>set(f.k,v?"true":"false")}/>
                </FR>
              ))}
            </Card>
          )}

          {tab === "print" && (
            <Card title="Print & Documents" sub="Font, paper size, letterhead options" color="#C45911" icon={Printer} onSave={() => save(["print_font","print_font_size","paper_size","show_logo_print","show_stamp","show_watermark","print_confidential"])} saving={saving}>
              <FR label="Print Font" ac="#C45911">
                <select value={get("print_font","Times New Roman")} onChange={e=>set("print_font",e.target.value)} style={{...inp,width:200}}>
                  {["Times New Roman","Arial","Calibri","Georgia","Cambria","Palatino"].map(f=><option key={f}>{f}</option>)}
                </select>
              </FR>
              <FR label="Font Size (pt)" ac="#C45911">
                <input value={get("print_font_size","11")} onChange={e=>set("print_font_size",e.target.value)} style={{...inp,width:70}} type="number" min="8" max="16"/>
              </FR>
              <FR label="Paper Size" ac="#C45911">
                <select value={get("paper_size","A4")} onChange={e=>set("paper_size",e.target.value)} style={{...inp,width:120}}>
                  {["A4","Letter","Legal","A5"].map(s=><option key={s}>{s}</option>)}
                </select>
              </FR>
              <FR label="Show Logo on Prints" ac="#C45911"><Toggle on={get("show_logo_print")!=="false"} onChange={v=>set("show_logo_print",v?"true":"false")}/></FR>
              <FR label="Show Official Stamp Box" ac="#C45911"><Toggle on={get("show_stamp")!=="false"} onChange={v=>set("show_stamp",v?"true":"false")}/></FR>
              <FR label="Show Watermark" ac="#C45911"><Toggle on={get("show_watermark")==="true"} onChange={v=>set("show_watermark",v?"true":"false")}/></FR>
              <FR label="Confidential Notice" sub="Adds 'Private and Confidential' to all docs" ac="#C45911"><Toggle on={get("print_confidential")!=="false"} onChange={v=>set("print_confidential",v?"true":"false")}/></FR>
            </Card>
          )}

          {tab === "system" && (
            <Card title="System Configuration" sub="Timezone, date format, uploads" color="#374151" icon={Server} onSave={() => save(["date_format","timezone","max_upload_mb","default_user_role","allow_registration"])} saving={saving}>
              <FR label="System Version" ac="#374151">
                <span style={{ fontFamily:"monospace",fontWeight:700,color:"#818cf8" }}>v2.0.0 — ProcurBosse</span>
              </FR>
              <FR label="Date Format" ac="#374151">
                <select value={get("date_format","DD/MM/YYYY")} onChange={e=>set("date_format",e.target.value)} style={{...inp,width:160}}>
                  {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(f=><option key={f}>{f}</option>)}
                </select>
              </FR>
              <FR label="Timezone" ac="#374151">
                <input value={get("timezone","Africa/Nairobi")} onChange={e=>set("timezone",e.target.value)} style={{...inp,width:200}}/>
              </FR>
              <FR label="Max Upload (MB)" ac="#374151">
                <input value={get("max_upload_mb","25")} onChange={e=>set("max_upload_mb",e.target.value)} style={{...inp,width:80}} type="number"/>
              </FR>
              <FR label="Default User Role" ac="#374151">
                <select value={get("default_user_role","requisitioner")} onChange={e=>set("default_user_role",e.target.value)} style={{...inp,width:220}}>
                  {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=><option key={r}>{r}</option>)}
                </select>
              </FR>
              <FR label="Allow Self-Registration" sub="Users can sign up without admin" ac="#374151">
                <Toggle on={get("allow_registration")==="true"} onChange={v=>set("allow_registration",v?"true":"false")}/>
              </FR>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <RoleGuard allowed={["admin"]}><SettingsInner /></RoleGuard>;
}
