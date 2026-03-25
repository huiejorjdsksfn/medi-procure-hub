/**
 * ProcurBosse — System Settings v5.0
 * Brand new clean build — tabbed settings linked to Supabase system_settings
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { sendSystemBroadcast } from "@/lib/broadcast";
import {
  Building2, Mail, Phone, Shield, Palette, Sliders,
  Printer, Server, Save, Eye, EyeOff, CheckCircle, AlertTriangle
} from "lucide-react";
import RoleGuard from "@/components/RoleGuard";
import logoImg from "@/assets/logo.png";

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id:"hospital",   label:"Hospital",    icon:Building2, color:"#0078d4" },
  { id:"email",      label:"Email/SMTP",  icon:Mail,      color:"#059669" },
  { id:"sms",        label:"SMS/Twilio",  icon:Phone,     color:"#7c3aed" },
  { id:"security",   label:"Security",    icon:Shield,    color:"#dc2626" },
  { id:"appearance", label:"Appearance",  icon:Palette,   color:"#8b5cf6" },
  { id:"modules",    label:"Modules",     icon:Sliders,   color:"#0369a1" },
  { id:"print",      label:"Print",       icon:Printer,   color:"#C45911" },
  { id:"system",     label:"System",      icon:Server,    color:"#374151" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────
function Tog({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const bg = on ? "#4f46e5" : "#e2e8f0";
  return (
    <button
      onClick={() => onChange(!on)}
      style={{ background:"none",border:"none",cursor:"pointer",padding:0,flexShrink:0,lineHeight:0 }}
    >
      <span style={{ display:"inline-flex",width:48,height:26,borderRadius:13,background:bg,alignItems:"center",padding:"3px",transition:"background 0.2s",border:`1px solid ${on?"#4f46e5":"#e2e8f0"}` }}>
        <span style={{ display:"block",width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform 0.2s",transform:on?"translateX(22px)":"translateX(0)",boxShadow:"0 1px 4px rgba(0,0,0,0.3)" }} />
      </span>
    </button>
  );
}

function FR({ label, sub, color, children }: { label: string; sub?: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0",borderBottom:"1px solid #f1f5f9",gap:16 }}>
      <div style={{ flex:1 }}>
        {color && <span style={{ display:"inline-block",width:3,height:14,borderRadius:2,background:color,marginRight:8,verticalAlign:"middle" }} />}
        <span style={{ fontSize:13.5,fontWeight:500,color:"#1e293b" }}>{label}</span>
        {sub && <div style={{ fontSize:11.5,color:"#64748b",marginTop:2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

function Card({ title, sub, color, icon: Icon, onSave, saving, children }: any) {
  return (
    <div style={{ background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:14,padding:"18px 22px",marginBottom:20 }}>
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:"1px solid #e2e8f0" }}>
        <div style={{ width:36,height:36,borderRadius:9,background:color,display:"flex",alignItems:"center",justifyContent:"center" }}>
          <Icon style={{ width:17,height:17,color:"#fff" }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14,fontWeight:700,color:"#1e293b" }}>{title}</div>
          {sub && <div style={{ fontSize:11,color:"#64748b" }}>{sub}</div>}
        </div>
        {onSave && (
          <button onClick={onSave} disabled={saving} style={{ padding:"6px 14px",borderRadius:7,border:"none",background:"rgba(79,70,229,0.8)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
            <Save style={{ width:12,height:12 }} />{saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Main inner component ───────────────────────────────────────────────────────
function SettingsInner() {
  const { user, profile } = useAuth();
  const { settings } = useSystemSettings();

  const [tab, setTab] = useState("hospital");
  const [s, setS] = useState<Record<string,string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [testRes, setTestRes] = useState<{ok:boolean; msg:string}|null>(null);
  const [testing, setTesting] = useState(false);

  // Sync settings
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      setS({ ...settings });
    }
  }, [settings]);

  const get = (k: string, def = "") => s[k] ?? def;
  const set = (k: string, v: string) => { setS(p => ({ ...p, [k]: v })); setDirty(true); };

  const inp: React.CSSProperties = {
    padding:"8px 11px", border:"1px solid #e2e8f0",
    borderRadius:7, fontSize:13, color:"#1e293b",
    background:"#e2e8f0", outline:"none", width:"100%",
  };

  async function save(keys: string[]) {
    setSaving(true);
    const subset: Record<string,string> = {};
    keys.forEach(k => { if (s[k] !== undefined) subset[k] = s[k]; });
    const res = await saveSettings(subset);
    if (res.ok) {
      toast({ title:`✅ ${keys.length} settings saved & propagated` });
      setDirty(false);
    } else {
      toast({ title:"Save failed: " + (res.error || "Check connection"), variant:"destructive" });
    }
    setSaving(false);
  }

  async function saveAll() {
    setSaving(true);
    const toSave = Object.fromEntries(
      Object.entries(s).filter(([, v]) => v !== undefined && v !== null)
    );
    const res = await saveSettings(toSave);
    if (res.ok) {
      await sendSystemBroadcast({ title:"Settings Updated", message:`Settings updated by ${profile?.full_name||user?.email||"Admin"}`, type:"info" });
      toast({ title:`✅ All settings saved and propagated` });
      setDirty(false);
    } else {
      toast({ title:"Save failed: " + (res.error || "Check connection"), variant:"destructive" });
    }
    setSaving(false);
  }

  async function testEmail() {
    setTesting(true);
    setTestRes(null);
    const toAddr = get("hospital_email") || user?.email || "";
    if (!toAddr) { setTestRes({ ok:false, msg:"Set hospital email first" }); setTesting(false); return; }
    try {
      const { error, data } = await supabase.functions.invoke("send-email", {
        body: { to:toAddr, subject:"ProcurBosse SMTP Test — " + new Date().toLocaleString("en-KE"), body:"Test email from EL5 MediProcure Settings. SMTP is configured correctly." }
      });
      if (error) setTestRes({ ok:false, msg:"Edge function: " + error.message });
      else if ((data as any)?.error) setTestRes({ ok:false, msg:"SMTP: " + (data as any).error });
      else setTestRes({ ok:true, msg:"✅ Test email sent to " + toAddr });
    } catch (e:any) { setTestRes({ ok:false, msg:"Failed: " + e.message }); }
    setTesting(false);
  }

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#070d1a 0%,#0d1b35 50%,#0a1225 100%)",color:"#1e293b",fontFamily:"var(--font-sans)" }}>

      {/* Header */}
      <div style={{ background:"rgba(79,70,229,0.12)",borderBottom:"1px solid rgba(79,70,229,0.25)",padding:"10px 20px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(10px)" }}>
        <img src={logoImg} alt="EL5H" style={{ width:32,height:32,borderRadius:8,objectFit:"contain",background:"#f1f5f9",padding:4 }} />
        <div>
          <div style={{ fontSize:15,fontWeight:800,color:"#1e293b" }}>System Settings</div>
          <div style={{ fontSize:10,color:"#64748b" }}>Changes propagate to all users via Supabase Realtime</div>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:8,alignItems:"center" }}>
          {dirty && (
            <span style={{ fontSize:11,color:"#fbbf24",background:"rgba(251,191,36,0.15)",padding:"3px 10px",borderRadius:20,fontWeight:700 }}>
              ● Unsaved
            </span>
          )}
          <button onClick={saveAll} disabled={saving} style={{ padding:"8px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#4f46e5,#7c3aed)",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
            <Save style={{ width:13,height:13 }} />{saving ? "Saving…" : "Save All"}
          </button>
        </div>
      </div>

      {/* Layout */}
      <div style={{ display:"grid",gridTemplateColumns:"188px 1fr",minHeight:"calc(100vh - 60px)" }}>

        {/* Sidebar */}
        <div style={{ background:"rgba(0,0,0,0.35)",borderRight:"1px solid #e2e8f0",paddingTop:8 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 14px",background:tab===t.id?"rgba(79,70,229,0.15)":"transparent",border:"none",borderLeft:tab===t.id?`3px solid ${t.color}`:"3px solid transparent",cursor:"pointer" }}
            >
              <t.icon style={{ width:15,height:15,color:tab===t.id?t.color:"#475569",flexShrink:0 }} />
              <span style={{ fontSize:12.5,fontWeight:tab===t.id?700:400,color:tab===t.id?"#f1f5f9":"#64748b" }}>{t.label}</span>
            </button>
          ))}
          <div style={{ margin:"12px",padding:"10px",background:"rgba(79,70,229,0.1)",borderRadius:8,border:"1px solid rgba(79,70,229,0.2)" }}>
            <div style={{ fontSize:10,fontWeight:700,color:"#818cf8",marginBottom:4 }}>💡 Realtime</div>
            <div style={{ fontSize:10,color:"#64748b",lineHeight:1.5 }}>Settings propagate instantly to all users via Supabase channels.</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:"20px 26px",overflowY:"auto",maxHeight:"calc(100vh - 60px)" }}>

          {tab === "hospital" && (
            <Card title="Hospital Information" sub="Used in all documents, letterheads and prints" color="#0078d4" icon={Building2}
              onSave={() => save(["hospital_name","county_name","department_name","system_name","hospital_address","po_box","hospital_phone","hospital_email","doc_footer","currency_symbol","vat_rate"])} saving={saving}>
              {[
                {k:"hospital_name",   l:"Hospital Name",    p:"Embu Level 5 Hospital"},
                {k:"county_name",     l:"County",           p:"Embu County Government"},
                {k:"department_name", l:"Department",       p:"Department of Health"},
                {k:"system_name",     l:"System Name",      p:"EL5 MediProcure"},
                {k:"hospital_address",l:"Physical Address", p:"Embu Town, Kenya"},
                {k:"po_box",          l:"P.O. Box",         p:"P.O. Box 591-60100, Embu"},
                {k:"hospital_phone",  l:"Phone",            p:"+254 060 000000"},
                {k:"hospital_email",  l:"Email Address",    p:"info@embu.health.go.ke"},
                {k:"doc_footer",      l:"Document Footer",  p:"Embu Level 5 Hospital · Embu County Government"},
                {k:"currency_symbol", l:"Currency Symbol",  p:"KES"},
                {k:"vat_rate",        l:"VAT Rate (%)",     p:"16"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#0078d4">
                  <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:280}} placeholder={f.p} />
                </FR>
              ))}
            </Card>
          )}

          {tab === "email" && (
            <Card title="Email & SMTP" sub="Configure SMTP for email delivery" color="#059669" icon={Mail}
              onSave={() => save(["smtp_host","smtp_port","smtp_user","smtp_pass","smtp_from_name","smtp_from_email","smtp_tls","smtp_enabled"])} saving={saving}>
              {[
                {k:"smtp_host",      l:"SMTP Host",    p:"smtp.gmail.com"},
                {k:"smtp_port",      l:"SMTP Port",    p:"587"},
                {k:"smtp_user",      l:"Username",     p:"noreply@embu.go.ke"},
                {k:"smtp_from_name", l:"From Name",    p:"EL5 MediProcure"},
                {k:"smtp_from_email",l:"From Email",   p:"noreply@embu.go.ke"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#059669">
                  <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p} />
                </FR>
              ))}
              <FR label="SMTP Password" color="#059669">
                <div style={{ position:"relative",width:260 }}>
                  <input type={showPw?"text":"password"} value={get("smtp_pass")} onChange={e=>set("smtp_pass",e.target.value)} style={{...inp,paddingRight:34}} placeholder="••••••••" />
                  <button onClick={() => setShowPw(p=>!p)} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer" }}>
                    {showPw ? <EyeOff style={{ width:14,height:14,color:"#64748b" }} /> : <Eye style={{ width:14,height:14,color:"#64748b" }} />}
                  </button>
                </div>
              </FR>
              <FR label="Use TLS" color="#059669">
                <Tog on={get("smtp_tls","true")!=="false"} onChange={v=>set("smtp_tls",v?"true":"false")} />
              </FR>
              <FR label="Enable SMTP" sub="Use SMTP for all email delivery" color="#059669">
                <Tog on={get("smtp_enabled")==="true"} onChange={v=>set("smtp_enabled",v?"true":"false")} />
              </FR>
              {testRes && (
                <div style={{ margin:"10px 0",padding:"8px 12px",borderRadius:8,background:testRes.ok?"rgba(5,150,105,0.15)":"rgba(220,38,38,0.15)",border:`1px solid ${testRes.ok?"#059669":"#dc2626"}`,display:"flex",alignItems:"center",gap:8 }}>
                  {testRes.ok ? <CheckCircle style={{ width:14,height:14,color:"#10b981" }} /> : <AlertTriangle style={{ width:14,height:14,color:"#ef4444" }} />}
                  <span style={{ fontSize:12,color:testRes.ok?"#10b981":"#ef4444" }}>{testRes.msg}</span>
                </div>
              )}
              <div style={{ marginTop:12 }}>
                <button onClick={testEmail} disabled={testing} style={{ padding:"6px 14px",borderRadius:7,border:"none",background:"rgba(5,150,105,0.6)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer" }}>
                  {testing ? "Testing…" : "Send Test Email"}
                </button>
              </div>
            </Card>
          )}

          {tab === "sms" && (
            <Card title="SMS / Twilio" sub="SMS notifications via Twilio API" color="#7c3aed" icon={Phone}
              onSave={() => save(["twilio_enabled","twilio_account_sid","twilio_auth_token","twilio_messaging_service_sid","twilio_phone_number","sms_hospital_name","sms_on_po_approve","sms_on_req_approve","sms_on_low_stock","sms_on_payment"])} saving={saving}>
              <FR label="Enable Twilio SMS" color="#7c3aed">
                <Tog on={get("twilio_enabled")==="true"} onChange={v=>set("twilio_enabled",v?"true":"false")} />
              </FR>
              {[
                {k:"twilio_account_sid",           l:"Account SID",            p:"ACxxxxxxxxxx"},
                {k:"twilio_auth_token",          l:"Auth Token",             p:"••••", pw:true},
                {k:"twilio_messaging_service_sid",l:"Messaging Service SID",  p:"MGd547d8e3273fda2d21afdd6856acb245"},
                {k:"twilio_phone_number",         l:"Twilio Phone (fallback)", p:"+12025551234"},
                {k:"sms_hospital_name",           l:"SMS From Name",          p:"EL5 MediProcure"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#7c3aed">
                  <input type={(f as any).pw?"password":"text"} value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:260}} placeholder={f.p} />
                </FR>
              ))}
              <div style={{ margin:"8px 0",padding:"8px 12px",background:"rgba(124,58,237,0.1)",borderRadius:8,fontSize:11,color:"#a78bfa" }}>
                Get credentials at <a href="https://www.twilio.com/console" target="_blank" rel="noreferrer" style={{ color:"#818cf8" }}>twilio.com/console</a>
              </div>
              {[
                {k:"sms_on_po_approve",  l:"SMS on PO Approval"},
                {k:"sms_on_req_approve", l:"SMS on Requisition Approval"},
                {k:"sms_on_low_stock",   l:"SMS on Low Stock Alert"},
                {k:"sms_on_payment",     l:"SMS on Payment"},
              ].map(f => (
                <FR key={f.k} label={f.l} color="#7c3aed">
                  <Tog on={get(f.k,"true")!=="false"} onChange={v=>set(f.k,v?"true":"false")} />
                </FR>
              ))}
            </Card>
          )}

          {tab === "security" && (
            <Card title="Security & Access Control" sub="IP restriction, sessions, authentication" color="#dc2626" icon={Shield}
              onSave={() => save(["ip_restriction_enabled","allow_all_private","log_all_ips","revoke_on_ip_change","session_timeout","max_login_attempts","audit_logins"])} saving={saving}>
              {[
                {k:"ip_restriction_enabled",l:"IP Restriction",      s:"Block unauthorized IPs"},
                {k:"allow_all_private",      l:"Allow All Private",   s:"Auto-allow 10.x, 192.168.x, 172.16.x"},
                {k:"log_all_ips",            l:"Log All Access",      s:"Record every IP check"},
                {k:"revoke_on_ip_change",    l:"Revoke on IP Change", s:"Force re-login if IP changes"},
                {k:"audit_logins",           l:"Audit Logins",        s:"Log every login attempt"},
              ].map(f => (
                <FR key={f.k} label={f.l} sub={f.s} color="#dc2626">
                  <Tog on={get(f.k)==="true"} onChange={v=>set(f.k,v?"true":"false")} />
                </FR>
              ))}
              <FR label="Session Timeout (min)" color="#dc2626">
                <input value={get("session_timeout","480")} onChange={e=>set("session_timeout",e.target.value)} style={{...inp,width:80}} type="number" />
              </FR>
              <FR label="Max Login Attempts" color="#dc2626">
                <input value={get("max_login_attempts","5")} onChange={e=>set("max_login_attempts",e.target.value)} style={{...inp,width:80}} type="number" />
              </FR>
            </Card>
          )}

          {tab === "appearance" && (
            <Card title="Appearance & UI" sub="Brand colours and theme" color="#8b5cf6" icon={Palette}
              onSave={() => save(["primary_color","accent_color","theme"])} saving={saving}>
              {[{k:"primary_color",l:"Primary Colour"},{k:"accent_color",l:"Accent Colour"}].map(f => (
                <FR key={f.k} label={f.l} color="#8b5cf6">
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <input type="color" value={get(f.k,"#1a3a6b")} onChange={e=>set(f.k,e.target.value)} style={{ width:40,height:32,borderRadius:6,cursor:"pointer",border:"1px solid rgba(255,255,255,0.2)",padding:2,background:"transparent" }} />
                    <input value={get(f.k)} onChange={e=>set(f.k,e.target.value)} style={{...inp,width:100}} placeholder="#1a3a6b" />
                  </div>
                </FR>
              ))}
              <FR label="Theme" color="#8b5cf6">
                <select value={get("theme","dark")} onChange={e=>set("theme",e.target.value)} style={{...inp,width:140}}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </FR>
            </Card>
          )}

          {tab === "modules" && (
            <Card title="Module Toggles" sub="Enable or disable ERP modules system-wide" color="#0369a1" icon={Sliders}
              onSave={() => save(["enable_procurement","enable_financials","enable_quality","enable_tenders","enable_documents","enable_scanner","enable_email","realtime_notifications","maintenance_mode"])} saving={saving}>
              {[
                {k:"enable_procurement",    l:"Procurement",          s:"Requisitions, POs, GRN, Suppliers"},
                {k:"enable_financials",     l:"Finance",              s:"Vouchers, Budgets, Chart of Accounts"},
                {k:"enable_quality",        l:"Quality Control",      s:"Inspections, Non-Conformance"},
                {k:"enable_tenders",        l:"Tenders",              s:"Tender management"},
                {k:"enable_documents",      l:"Documents",            s:"Document library & editor"},
                {k:"enable_scanner",        l:"QR Scanner",           s:"Barcode and QR scanning"},
                {k:"enable_email",          l:"Email System",         s:"Internal mail and notifications"},
                {k:"realtime_notifications",l:"Real-time Alerts",     s:"Live Supabase channel notifications"},
                {k:"maintenance_mode",      l:"Maintenance Mode",     s:"⚠ Blocks all non-admin access"},
              ].map(f => (
                <FR key={f.k} label={f.l} sub={f.s} color={f.k==="maintenance_mode"?"#dc2626":"#0369a1"}>
                  <Tog on={get(f.k,"true")!=="false"} onChange={v=>set(f.k,v?"true":"false")} />
                </FR>
              ))}
            </Card>
          )}

          {tab === "print" && (
            <Card title="Print & Documents" sub="Font, paper, letterhead and printer settings" color="#C45911" icon={Printer}
              onSave={() => save(["print_font","print_font_size","paper_size","show_logo_print","show_stamp","show_watermark","print_confidential","printer_type","printer_name"])} saving={saving}>
              <FR label="Print Font" color="#C45911">
                <select value={get("print_font","Times New Roman")} onChange={e=>set("print_font",e.target.value)} style={{...inp,width:200}}>
                  {["Times New Roman","Arial","Calibri","Georgia","Cambria","Palatino"].map(f=><option key={f}>{f}</option>)}
                </select>
              </FR>
              <FR label="Font Size (pt)" color="#C45911">
                <input value={get("print_font_size","11")} onChange={e=>set("print_font_size",e.target.value)} style={{...inp,width:70}} type="number" min="8" max="16" />
              </FR>
              <FR label="Paper Size" color="#C45911">
                <select value={get("paper_size","A4")} onChange={e=>set("paper_size",e.target.value)} style={{...inp,width:120}}>
                  {["A4","Letter","Legal","A5"].map(s=><option key={s}>{s}</option>)}
                </select>
              </FR>
              <FR label="Printer Type" sub="Select your printer model for optimal output" color="#C45911">
                <select value={get("printer_type","generic")} onChange={e=>set("printer_type",e.target.value)} style={{...inp,width:200}}>
                  <option value="generic">Generic / Auto-detect</option>
                  <option value="kyocera">Kyocera ECOSYS (Laser)</option>
                  <option value="hp_laserjet">HP LaserJet</option>
                  <option value="hp_deskjet">HP DeskJet (Inkjet)</option>
                  <option value="hp_color">HP Color LaserJet</option>
                  <option value="thermal_80mm">Thermal 80mm (Epson/Star)</option>
                  <option value="thermal_58mm">Thermal 58mm (Mobile)</option>
                  <option value="pdf">PDF Export</option>
                </select>
              </FR>
              <FR label="Printer Name" sub="e.g. KYOCERA ECOSYS M2040dn" color="#C45911">
                <input value={get("printer_name","")} onChange={e=>set("printer_name",e.target.value)} style={{...inp,width:260}} placeholder="Leave blank for default" />
              </FR>
              <FR label="Show Logo on Prints" color="#C45911">
                <Tog on={get("show_logo_print","true")!=="false"} onChange={v=>set("show_logo_print",v?"true":"false")} />
              </FR>
              <FR label="Show Official Stamp Box" color="#C45911">
                <Tog on={get("show_stamp","true")!=="false"} onChange={v=>set("show_stamp",v?"true":"false")} />
              </FR>
              <FR label="Show Watermark" color="#C45911">
                <Tog on={get("show_watermark")==="true"} onChange={v=>set("show_watermark",v?"true":"false")} />
              </FR>
              <FR label="Confidential Notice" sub="Adds 'Private and Confidential' to docs" color="#C45911">
                <Tog on={get("print_confidential","true")!=="false"} onChange={v=>set("print_confidential",v?"true":"false")} />
              </FR>
              <div style={{ marginTop:8,padding:"8px 12px",background:"rgba(196,89,17,0.08)",borderRadius:8,fontSize:11,color:"#C45911" }}>
                <strong>Supported:</strong> Kyocera ECOSYS · HP DeskJet · HP LaserJet · HP Color · Epson TM thermal · Star TSP thermal
              </div>
            </Card>
          )}

          {tab === "system" && (
            <Card title="System Configuration" sub="Timezone, date format, uploads" color="#374151" icon={Server}
              onSave={() => save(["date_format","timezone","max_upload_mb","default_user_role","allow_registration"])} saving={saving}>
              <FR label="System Version" color="#374151">
                <span style={{ fontFamily:"var(--font-mono)",fontWeight:700,color:"#818cf8" }}>v2.0.0 — ProcurBosse</span>
              </FR>
              <FR label="Date Format" color="#374151">
                <select value={get("date_format","DD/MM/YYYY")} onChange={e=>set("date_format",e.target.value)} style={{...inp,width:160}}>
                  {["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD"].map(f=><option key={f}>{f}</option>)}
                </select>
              </FR>
              <FR label="Timezone" color="#374151">
                <input value={get("timezone","Africa/Nairobi")} onChange={e=>set("timezone",e.target.value)} style={{...inp,width:200}} />
              </FR>
              <FR label="Max Upload (MB)" color="#374151">
                <input value={get("max_upload_mb","25")} onChange={e=>set("max_upload_mb",e.target.value)} style={{...inp,width:80}} type="number" />
              </FR>
              <FR label="Default User Role" color="#374151">
                <select value={get("default_user_role","requisitioner")} onChange={e=>set("default_user_role",e.target.value)} style={{...inp,width:220}}>
                  {["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"].map(r=><option key={r}>{r}</option>)}
                </select>
              </FR>
              <FR label="Allow Self-Registration" sub="Users can sign up without admin" color="#374151">
                <Tog on={get("allow_registration")==="true"} onChange={v=>set("allow_registration",v?"true":"false")} />
              </FR>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <RoleGuard allowed={["admin"]}>
      <SettingsInner />
    </RoleGuard>
  );
}
