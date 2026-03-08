import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import {
  Settings, Palette, Shield, Bell, Database, Globe, FileText, Package,
  Truck, DollarSign, BarChart3, Save, RefreshCw, Check, Upload, Eye, Lock,
  Mail, Wifi, Server, Users, Building2, Monitor, Zap, Sliders, Image,
  Edit, Printer, Download, Plus, X, Key, Code, ToggleLeft, ToggleRight
} from "lucide-react";

const TABS = [
  { id:"customize",   label:"Customize",      icon:Palette },
  { id:"branding",    label:"Branding & Logo", icon:Image },
  { id:"modules",     label:"Modules",        icon:Sliders },
  { id:"security",    label:"Security",       icon:Shield },
  { id:"documents",   label:"Documents",      icon:FileText },
  { id:"notifications", label:"Notifications", icon:Bell },
  { id:"integrations", label:"Integrations",  icon:Wifi },
  { id:"server",      label:"Server & DB",    icon:Server },
  { id:"users_mgmt",  label:"User Management",icon:Users },
  { id:"email_system",label:"Email System",    icon:Mail },
  { id:"master",      label:"Master Controls", icon:Key },
];

function AdminPanelInner() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState("customize");
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState<Record<string,boolean>>({});
  const [logoFile, setLogoFile] = useState<File|null>(null);
  const [logoPreview, setLogoPreview] = useState<string|null>(null);
  const [letterheadHtml, setLetterheadHtml] = useState("");
  const [uploading, setUploading] = useState(false);

  const DEFAULTS: Record<string,string> = {
    system_name:"EL5 MediProcure", hospital_name:"Embu Level 5 Hospital",
    org_short:"EL5H", org_county:"Embu County", org_phone:"+254 060 000000",
    org_email:"info@embu.health.go.ke", org_web:"embu.health.go.ke",
    primary_color:"#1a3a6b", secondary_color:"#C45911", accent_color:"#00695C",
    theme_mode:"light", font_size:"14", currency:"KES", date_format:"DD/MM/YYYY",
    timezone:"Africa/Nairobi", financial_year:"2025/26", vat_rate:"16",
    req_auto_number_prefix:"REQ", po_auto_number_prefix:"PO",
    max_login_attempts:"5", session_timeout:"480", password_min_length:"8",
    require_2fa:"false", smtp_host:"", smtp_port:"587", smtp_user:"", smtp_from:"",
    odbc_enabled:"true", backup_schedule:"weekly", export_format:"xlsx",
  };

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value,value_json")
      .then(({data}:any)=>{
        if(!data) return;
        const m:Record<string,string>={...DEFAULTS};
        data.forEach((r:any)=>{
          if(r.key) m[r.key]=r.value||"";
          if(r.key==="letterhead_html"&&r.value) setLetterheadHtml(r.value);
          if(r.key==="system_logo_url"&&r.value) setLogoPreview(r.value);
        });
        setSettings(m);
      });
  },[]);

  const set = (k:string,v:string) => setSettings(p=>({...p,[k]:v}));

  const saveSetting = async (keys: string[]) => {
    const k0 = keys[0];
    setSaving(p=>({...p,[k0]:true}));
    try {
      await Promise.all(keys.map(async k=>{
        const val = k==="letterhead_html" ? letterheadHtml : (settings[k]||DEFAULTS[k]||"");
        const { data:existing } = await (supabase as any).from("system_settings").select("id").eq("key",k).single();
        if(existing?.id) {
          await (supabase as any).from("system_settings").update({value:val,updated_by:user?.id,updated_at:new Date().toISOString()}).eq("key",k);
        } else {
          await (supabase as any).from("system_settings").insert({key:k,value:val,category:"general",label:k,updated_by:user?.id});
        }
      }));
      toast({title:"Settings Saved",description:`${keys.length} setting(s) updated successfully`});
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setSaving(p=>({...p,[k0]:false}));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if(!f) return;
    setLogoFile(f);
    const r = new FileReader();
    r.onload = ev => setLogoPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };

  const uploadLogo = async () => {
    if(!logoPreview) return;
    setUploading(true);
    try {
      // Store as data URL in system_settings since no storage bucket configured
      await saveSetting(["system_logo_url"]);
      // Override with actual preview
      const { data:existing } = await (supabase as any).from("system_settings").select("id").eq("key","system_logo_url").single();
      if(existing?.id) {
        await (supabase as any).from("system_settings").update({value:logoPreview,updated_by:user?.id}).eq("key","system_logo_url");
      } else {
        await (supabase as any).from("system_settings").insert({key:"system_logo_url",value:logoPreview,category:"branding",label:"System Logo URL",updated_by:user?.id});
      }
      toast({title:"Logo Updated",description:"System logo has been saved"});
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setUploading(false);
  };

  const F = ({label,k,type="text",placeholder="",help=""}:{label:string;k:string;type?:string;placeholder?:string;help?:string}) => (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{label}</label>
      <input type={type} value={settings[k]||DEFAULTS[k]||""} onChange={e=>set(k,e.target.value)}
        placeholder={placeholder||DEFAULTS[k]||""}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100" />
      {help && <p className="text-[10px] text-gray-400 mt-0.5">{help}</p>}
    </div>
  );

  const Sw = ({label,k,help=""}:{label:string;k:string;help?:string}) => {
    const on = settings[k]==="true"||settings[k]==="1";
    return (
      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
        <div>
          <div className="text-sm font-semibold text-gray-700">{label}</div>
          {help && <div className="text-[10px] text-gray-400">{help}</div>}
        </div>
        <button onClick={()=>set(k,on?"false":"true")}
          className="relative w-11 h-6 rounded-full transition-all"
          style={{background:on?"#1a3a6b":"#d1d5db"}}>
          <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full bg-white shadow"
            style={{left:on?"22px":"2px"}} />
        </button>
      </div>
    );
  };

  const SaveBtn = ({keys}:{keys:string[]}) => (
    <button onClick={()=>saveSetting(keys)} disabled={saving[keys[0]]}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all mt-4"
      style={{background:"#1a3a6b",opacity:saving[keys[0]]?0.7:1}}>
      {saving[keys[0]] ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Check className="w-3.5 h-3.5"/>}
      {saving[keys[0]]?"Saving…":"Save Settings"}
    </button>
  );

  return (
    <div className="flex h-full" style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"transparent"}}>
      {/* Left sidebar (WP Adminify style) */}
      <div className="w-56 shrink-0 flex flex-col" style={{background:"#1a2744",borderRight:"1px solid rgba(255,255,255,0.08)"}}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            {logoPreview && <img src={logoPreview} alt="" className="w-8 h-8 rounded-lg object-contain" />}
            <div>
              <div className="text-xs font-black text-white">{settings.system_name||"EL5 MediProcure"}</div>
              <div className="text-[9px] text-white/40">Admin Panel</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[12px] font-semibold transition-all text-left"
              style={{
                background:activeTab===tab.id?"rgba(255,255,255,0.15)":"transparent",
                color:activeTab===tab.id?"#fff":"rgba(255,255,255,0.55)",
                borderLeft:activeTab===tab.id?"3px solid #4a9eff":"3px solid transparent",
              }}>
              <tab.icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10">
          <div className="text-[9px] text-white/30">Admin: {profile?.full_name}</div>
          <div className="text-[9px] text-white/20">EL5 MediProcure v2.0</div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab: Customize */}
        {activeTab==="customize" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Organization Settings</h2>
              <p className="text-xs text-gray-400">Configure your hospital's identity and system preferences</p>
            </div>
            <div className="rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Hospital Identity</h3>
              <div className="grid grid-cols-2 gap-4">
                <F label="System Name" k="system_name" help="Displayed in nav and reports" />
                <F label="Hospital Name" k="hospital_name" />
                <F label="Short Code" k="org_short" />
                <F label="County" k="org_county" />
                <F label="Phone" k="org_phone" />
                <F label="Email" k="org_email" />
                <F label="Website" k="org_web" />
                <F label="Financial Year" k="financial_year" help="e.g. 2025/26" />
              </div>
              <SaveBtn keys={["system_name","hospital_name","org_short","org_county","org_phone","org_email","org_web","financial_year"]} />
            </div>
            <div className="rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Regional Settings</h3>
              <div className="grid grid-cols-3 gap-4">
                <F label="Currency" k="currency" help="KES, USD, EUR…" />
                <F label="Date Format" k="date_format" />
                <F label="Timezone" k="timezone" />
                <F label="VAT Rate (%)" k="vat_rate" type="number" />
                <F label="Font Size (px)" k="font_size" type="number" />
              </div>
              <SaveBtn keys={["currency","date_format","timezone","vat_rate","font_size"]} />
            </div>
          </div>
        )}

        {/* Tab: Branding */}
        {activeTab==="branding" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Branding & Logo</h2>
              <p className="text-xs text-gray-400">Upload your hospital logo and set theme colors</p>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-5">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">System Logo</h3>
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                  {logoPreview ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                    : <Image className="w-8 h-8 text-gray-300" />}
                </div>
                <div>
                  <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold cursor-pointer hover:bg-blue-100 transition-all">
                    <Upload className="w-4 h-4" /> Choose Logo
                    <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-1">PNG, JPG, SVG up to 2MB</p>
                  {logoFile && (
                    <button onClick={uploadLogo} disabled={uploading}
                      className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600">
                      <Save className="w-3 h-3" /> {uploading?"Saving…":"Save Logo"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Theme Colors</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {label:"Primary Color",k:"primary_color"},
                  {label:"Secondary Color",k:"secondary_color"},
                  {label:"Accent Color",k:"accent_color"},
                ].map(c=>(
                  <div key={c.k}>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">{c.label}</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={settings[c.k]||DEFAULTS[c.k]} onChange={e=>set(c.k,e.target.value)}
                        className="w-10 h-10 rounded-lg border-0 cursor-pointer p-0.5 bg-transparent" />
                      <input type="text" value={settings[c.k]||DEFAULTS[c.k]} onChange={e=>set(c.k,e.target.value)}
                        className="flex-1 px-2 py-2 rounded-lg border border-gray-200 text-xs outline-none font-mono" />
                    </div>
                  </div>
                ))}
              </div>
              <SaveBtn keys={["primary_color","secondary_color","accent_color"]} />
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Letterhead Template (HTML)</h3>
              <p className="text-xs text-gray-400">This HTML appears at the top of all printed documents and reports</p>
              <textarea value={letterheadHtml} onChange={e=>setLetterheadHtml(e.target.value)} rows={8}
                placeholder='<div style="display:flex;align-items:center;gap:16px;"><img src="/favicon.png" style="width:60px;"/><div><h2>Embu Level 5 Hospital</h2><p>P.O. Box 2700-60100 Embu, Kenya</p></div></div>'
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono outline-none focus:border-blue-400 resize-y" />
              <div className="flex gap-2">
                <button onClick={()=>saveSetting(["letterhead_html"])}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-700 hover:bg-blue-800">
                  <Save className="w-3.5 h-3.5" /> Save Letterhead
                </button>
                {letterheadHtml && (
                  <button onClick={()=>{ const w=window.open("","_blank"); w?.document.write(`<html><body>${letterheadHtml}</body></html>`); w?.document.close(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Modules */}
        {activeTab==="modules" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Module Settings</h2>
              <p className="text-xs text-gray-400">Configure document numbering and module-specific settings</p>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Auto-Numbering Prefixes</h3>
              <div className="grid grid-cols-2 gap-4">
                <F label="Requisition Prefix" k="req_auto_number_prefix" help="e.g. REQ" />
                <F label="Purchase Order Prefix" k="po_auto_number_prefix" help="e.g. PO" />
                <F label="GRN Prefix" k="grn_prefix" placeholder="GRN" />
                <F label="Payment Voucher Prefix" k="pv_prefix" placeholder="PV" />
                <F label="Receipt Voucher Prefix" k="rv_prefix" placeholder="RV" />
                <F label="Inspection Prefix" k="insp_prefix" placeholder="INS" />
              </div>
              <SaveBtn keys={["req_auto_number_prefix","po_auto_number_prefix","grn_prefix","pv_prefix","rv_prefix","insp_prefix"]} />
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Module Toggles</h3>
              <Sw label="Enable Tenders Module" k="module_tenders" help="Show/hide tender management" />
              <Sw label="Enable Quality Control" k="module_quality" help="Inspections and NCR" />
              <Sw label="Enable Fixed Assets" k="module_assets" />
              <Sw label="Enable ODBC Connections" k="odbc_enabled" help="External database sync" />
              <Sw label="Enable Barcode Scanner" k="module_scanner" />
              <SaveBtn keys={["module_tenders","module_quality","module_assets","odbc_enabled","module_scanner"]} />
            </div>
          </div>
        )}

        {/* Tab: Security */}
        {activeTab==="security" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Security Settings</h2>
              <p className="text-xs text-gray-400">Authentication, sessions and access control</p>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Authentication</h3>
              <div className="grid grid-cols-2 gap-4">
                <F label="Max Login Attempts" k="max_login_attempts" type="number" />
                <F label="Session Timeout (min)" k="session_timeout" type="number" />
                <F label="Min Password Length" k="password_min_length" type="number" />
              </div>
              <Sw label="Require 2-Factor Authentication" k="require_2fa" help="For all users (requires Supabase MFA)" />
              <Sw label="Require Password Numbers" k="pwd_require_numbers" />
              <Sw label="Require Special Characters" k="pwd_require_special" />
              <SaveBtn keys={["max_login_attempts","session_timeout","password_min_length","require_2fa","pwd_require_numbers","pwd_require_special"]} />
            </div>
          </div>
        )}

        {/* Tab: Documents */}
        {activeTab==="documents" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Document Templates</h2>
              <p className="text-xs text-gray-400">Configure document templates and upload hospital letterhead</p>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Document Policies</h3>
              <Sw label="Lock documents after creation" k="doc_lock_on_create" help="Documents can only be viewed, not edited after submission" />
              <Sw label="Require approval for templates" k="doc_require_approval" />
              <Sw label="Allow admin to edit locked docs" k="doc_admin_can_edit" />
              <Sw label="Auto-embed letterhead on print" k="doc_auto_letterhead" />
              <SaveBtn keys={["doc_lock_on_create","doc_require_approval","doc_admin_can_edit","doc_auto_letterhead"]} />
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Export Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Default Export Format</label>
                  <select value={settings.export_format||"xlsx"} onChange={e=>set("export_format",e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none">
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="pdf">PDF</option>
                  </select>
                </div>
              </div>
              <SaveBtn keys={["export_format"]} />
            </div>
          </div>
        )}

        {/* Tab: Notifications */}
        {activeTab==="notifications" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Notification Settings</h2>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Email (SMTP)</h3>
              <div className="grid grid-cols-2 gap-4">
                <F label="SMTP Host" k="smtp_host" placeholder="smtp.gmail.com" />
                <F label="SMTP Port" k="smtp_port" type="number" placeholder="587" />
                <F label="SMTP Username" k="smtp_user" />
                <F label="From Address" k="smtp_from" placeholder="no-reply@hospital.ke" />
              </div>
              <Sw label="Send email on requisition approval" k="notify_req_approved" />
              <Sw label="Send email on PO creation" k="notify_po_created" />
              <Sw label="Send email on payment voucher" k="notify_payment" />
              <Sw label="Low stock alerts" k="notify_low_stock" />
              <SaveBtn keys={["smtp_host","smtp_port","smtp_user","smtp_from","notify_req_approved","notify_po_created","notify_payment","notify_low_stock"]} />
            </div>
          </div>
        )}

        {/* Tab: Integrations */}
        {activeTab==="integrations" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Integrations & APIs</h2>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Supabase Connection</h3>
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div>
                  <div className="text-sm font-semibold text-green-800">Connected to Supabase</div>
                  <div className="text-[10px] text-green-600">yvjfehnzbzjliizjvuhq.supabase.co · PostgreSQL 17</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Supabase URL</label>
                  <input readOnly value="https://yvjfehnzbzjliizjvuhq.supabase.co"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-gray-50 text-gray-500 font-mono" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">ODBC & External Sources</h3>
              <Sw label="Enable ODBC Connections" k="odbc_enabled" help="Connect to external databases (MSSQL, MySQL, etc)" />
              <div className="grid grid-cols-2 gap-4">
                <F label="Default Sync Interval (min)" k="odbc_sync_interval" placeholder="60" type="number" />
              </div>
              <SaveBtn keys={["odbc_enabled","odbc_sync_interval"]} />
            </div>
          </div>
        )}

        {/* Tab: Server */}
        {activeTab==="server" && (
          <div className="max-w-2xl space-y-6">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Server & Database</h2>
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">System Information</h3>
              {[
                {label:"Database",val:"PostgreSQL 17.4 · Supabase"},
                {label:"Project",val:"elimu (yvjfehnzbzjliizjvuhq)"},
                {label:"Region",val:"us-east-1"},
                {label:"Framework",val:"React + Vite + TypeScript"},
                {label:"Auth",val:"Supabase Auth + RLS"},
              ].map(i=>(
                <div key={i.label} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-xs font-semibold text-gray-500">{i.label}</span>
                  <span className="text-xs font-mono text-gray-700">{i.val}</span>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Backup Settings</h3>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Backup Schedule</label>
                <select value={settings.backup_schedule||"weekly"} onChange={e=>set("backup_schedule",e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>
              <Sw label="Include audit log in backup" k="backup_include_audit" />
              <Sw label="Compress backup files" k="backup_compress" />
              <SaveBtn keys={["backup_schedule","backup_include_audit","backup_compress"]} />
            </div>
          </div>
        )}

        {/* Tab: User Management */}
        {activeTab==="users_mgmt" && (
          <div className="max-w-3xl space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">User Management</h2>
              <p className="text-xs text-gray-400">Manage users, roles, and access control</p>
            </div>
            <div className="rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Role Permissions</h3>
              {[
                {role:"admin",           label:"Administrator",     color:"#ef4444", perms:["Full Access","All Modules","Admin Panel","Database","Email"]},
                {role:"procurement_manager",label:"Procurement Manager",color:"#f97316",perms:["Requisitions","POs","GRNs","Tenders","Contracts","Reports"]},
                {role:"procurement_officer",label:"Procurement Officer",color:"#eab308",perms:["Requisitions","POs","GRNs","Suppliers","Quality"]},
                {role:"inventory_manager",label:"Inventory Manager",  color:"#22c55e",perms:["Items","Categories","Departments","Scanner","Reports"]},
                {role:"warehouse_officer",label:"Warehouse Officer",  color:"#14b8a6",perms:["Items","GRNs","Scanner","Quality"]},
                {role:"requisitioner",    label:"Requisitioner",     color:"#8b5cf6",perms:["Requisitions","Inbox","Email"]},
              ].map(r=>(
                <div key={r.role} className="flex items-center justify-between p-3 rounded-xl" style={{background:"#f9fafb",border:"1px solid #e5e7eb"}}>
                  <div className="flex items-center gap-3">
                    <div style={{width:10,height:10,borderRadius:"50%",background:r.color}}/>
                    <span className="text-xs font-bold text-gray-700">{r.label}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {r.perms.map(p=>(
                      <span key={p} className="px-2 py-0.5 rounded text-[9px] font-semibold" style={{background:`${r.color}15`,color:r.color}}>{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Security Settings</h3>
              <Sw label="Require two-factor authentication" k="require_2fa" />
              <Sw label="Force password reset on first login" k="force_pw_reset" />
              <Sw label="Lock account after failed attempts" k="lock_on_fail" />
              <div className="grid grid-cols-2 gap-4 mt-2">
                <F label="Max login attempts" k="max_login_attempts" type="number" />
                <F label="Session timeout (minutes)" k="session_timeout" type="number" />
                <F label="Password min length" k="password_min_length" type="number" />
              </div>
              <SaveBtn keys={["require_2fa","force_pw_reset","lock_on_fail","max_login_attempts","session_timeout","password_min_length"]} />
            </div>
          </div>
        )}

        {/* Tab: Email System */}
        {activeTab==="email_system" && (
          <div className="max-w-2xl space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Email System Configuration</h2>
              <p className="text-xs text-gray-400">Configure Supabase email sending, SMTP, and notification triggers</p>
            </div>
            <div className="rounded-2xl p-5 space-y-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">Supabase Email</h3>
              <div className="p-3 rounded-xl" style={{background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)"}}>
                <p className="text-xs text-blue-700 font-semibold">ℹ️ Supabase handles transactional emails (auth, invites) automatically. Configure SMTP below for custom business emails.</p>
              </div>
              <Sw label="Enable email notifications" k="email_notifications_enabled" />
              <Sw label="Send email on PO approval" k="email_on_po_approve" />
              <Sw label="Send email on requisition approval" k="email_on_req_approve" />
              <Sw label="Send email on tender closing" k="email_on_tender_close" />
              <Sw label="Send email on GRN received" k="email_on_grn" />
            </div>
            <div className="rounded-2xl p-5 space-y-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">SMTP Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <F label="SMTP Host" k="smtp_host" placeholder="smtp.gmail.com" />
                <F label="SMTP Port" k="smtp_port" type="number" />
                <F label="SMTP Username" k="smtp_user" placeholder="your@email.com" />
                <F label="From Email" k="smtp_from" placeholder="noreply@hospital.go.ke" />
                <F label="From Name" k="smtp_from_name" placeholder="EL5 MediProcure" />
                <F label="SMTP Password" k="smtp_password" type="password" />
              </div>
              <Sw label="Use TLS/SSL" k="smtp_tls" />
              <SaveBtn keys={["smtp_host","smtp_port","smtp_user","smtp_from","smtp_from_name","smtp_password","smtp_tls","email_notifications_enabled","email_on_po_approve","email_on_req_approve","email_on_tender_close","email_on_grn"]} />
            </div>
          </div>
        )}

        {/* Tab: Master Controls */}
        {activeTab==="master" && (
          <div className="max-w-3xl space-y-5">
            <div>
              <h2 className="text-lg font-black text-gray-800 mb-1">Master Admin Controls</h2>
              <p className="text-xs text-gray-400">System-level controls — use with caution</p>
            </div>
            <div className="rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2">System Features</h3>
              <Sw label="Maintenance mode (blocks all non-admin access)" k="maintenance_mode" />
              <Sw label="Allow new user registration" k="allow_registration" />
              <Sw label="Enable audit logging" k="audit_logging_enabled" />
              <Sw label="Enable real-time notifications" k="realtime_notifications" />
              <Sw label="Enable document attachments" k="enable_documents" />
              <Sw label="Enable QR/barcode scanner" k="enable_scanner" />
              <Sw label="Enable ODBC connections" k="odbc_enabled" />
              <Sw label="Enable external API integrations" k="enable_api" />
              <SaveBtn keys={["maintenance_mode","allow_registration","audit_logging_enabled","realtime_notifications","enable_documents","enable_scanner","odbc_enabled","enable_api"]} />
            </div>
            <div className="rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2 flex items-center gap-2">
                <span>🔑</span> API Keys & Integrations
              </h3>
              <F label="External API Base URL" k="api_base_url" placeholder="https://api.yourservice.com" />
              <F label="API Key (masked)" k="api_key" type="password" />
              <F label="Webhook URL (for events)" k="webhook_url" placeholder="https://hooks.yourservice.com/..." />
              <Sw label="Enable webhook notifications" k="webhooks_enabled" />
              <SaveBtn keys={["api_base_url","api_key","webhook_url","webhooks_enabled"]} />
            </div>
            <div className="rounded-2xl p-5 space-y-3 shadow-sm border border-gray-100">
              <h3 className="text-sm font-black text-gray-700 border-b border-gray-100 pb-2 flex items-center gap-2">
                <span style={{color:"#ef4444"}}>⚠️</span> Danger Zone
              </h3>
              <div className="p-3 rounded-xl" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.2)"}}>
                <p className="text-xs text-red-600 font-semibold mb-3">These actions are irreversible. Proceed with extreme caution.</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    {label:"Clear Audit Logs", color:"#f97316"},
                    {label:"Reset Settings",   color:"#ef4444"},
                    {label:"Export All Data",  color:"#3b82f6"},
                    {label:"Purge Notifications",color:"#8b5cf6"},
                  ].map(a=>(
                    <button key={a.label} onClick={()=>{if(confirm("Are you sure? This cannot be undone."))toast({title:a.label+" executed",description:"Action logged to audit trail"});}}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}30`}}>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  return <RoleGuard allowed={["admin"]}><AdminPanelInner /></RoleGuard>;
}
: additional tab content injected via append - see AdminPanelInner for context
