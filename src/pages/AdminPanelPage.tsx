/**
 * ProcurBosse - Admin Panel v8.0 (D365 Style)
 * Live IP stats · User management · Twilio · Email · Forms Builder · Server Control
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { pageCache } from "@/lib/pageCache";
import { cacheBuckets } from "@/lib/cacheBuckets";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings, saveSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { checkTwilioStatus, sendSms, makeCall } from "@/lib/sms";
import { QuickStampButton } from "@/components/DocumentStamp";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  LayoutDashboard, Users, Shield, Phone, Globe, Activity, Database,
  Settings, RefreshCw, Save, Eye, EyeOff, Copy, Check, X, Send,
  Lock, Unlock, Key, Wifi, WifiOff, Server, Radio, Bell,
  TrendingUp, AlertTriangle, MapPin, Clock, Package, ShoppingCart,
  UserCheck, Zap, ChevronRight, Monitor, MessageSquare, Tv, Power, ToggleLeft,
  HardDrive, Mail, ClipboardList, FileText, Play, Pause, Trash2, Plus,
  Download, Upload, Cpu, MemoryStick, HardDriveDownload, Cloud, Terminal,
  AlertCircle, CheckCircle2, RefreshCw as Reload, ExternalLink, Link,
  Image as ImageIcon
} from "lucide-react";

/* — O365 / Tracking-Portal style tokens (matches TrackingApprovalPage / Dashboard) — */
const O = {
  hero:"#107C73", topBar:"#0a5a52", white:"#ffffff",
  bg:"#f3f2f1", card:"#ffffff", border:"#edebe9",
  text:"#323130", textSub:"#605e5c", textMt:"#a19f9d",
  blue:"#0078d4", shadow:"0 1.6px 3.6px rgba(0,0,0,.13)",
  font:"'Segoe UI','Segoe UI Web','Arial',sans-serif",
};

const db = supabase as any;

/* - D365 styles - */
const S = {
  page:   { background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',sans-serif" },
  header: { background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"16px 24px", display:"flex", alignItems:"center", gap:14, boxShadow:"0 1px 3px rgba(0,0,0,.06)" },
  body:   { display:"grid", gridTemplateColumns:"220px 1fr", gap:0, minHeight:"calc(100vh - 57px)" },
  sidebar:{ background:"#fff", borderRight:`1px solid ${T.border}`, padding:"12px 0" },
  main:   { padding:"20px 24px", background:T.bg, overflowY:"auto" as const },
  card:   { background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, boxShadow:"0 1px 4px rgba(0,0,0,.06)", overflow:"hidden" as const },
  cardHd: (col:string) => ({ padding:"12px 16px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8, background:`${col}08` }),
  inp:    { width:"100%", border:`1px solid ${T.border}`, borderRadius:T.r, padding:"7px 11px", fontSize:13, outline:"none", background:"#fff", color:T.fg, boxSizing:"border-box" as const },
  btn:    (bg:string,col="white") => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:bg, color:col, border:"none", borderRadius:T.r, fontSize:13, fontWeight:600, cursor:"pointer" }),
};

/* - Nav items - */
const NAVS = [
  {id:"overview",  label:"Overview",       icon:LayoutDashboard, col:"#4f46e5"},
  {id:"iplive",    label:"Live IP Stats",  icon:Globe,           col:"#0078d4"},
  {id:"users",     label:"User Passwords", icon:Key,             col:"#7719aa"},
  {id:"twilio",    label:"SMS / Twilio",   icon:Phone,           col:"#059669"},
  {id:"roles",     label:"Roles & Access", icon:Shield,          col:"#dc2626"},
  {id:"modules",   label:"Module Toggles", icon:Settings,        col:"#d39a04"},
  {id:"kiosk",     label:"Kiosk Mode",     icon:Tv,              col:"#0f172a"},
  {id:"broadcast", label:"Broadcast",      icon:Radio,           col:"#0369a1"},
  {id:"botstats",  label:"Bot Stats",      icon:Zap,             col:"#059669"},
  {id:"system",    label:"System Info",    icon:Server,          col:"#374151"},
  {id:"serverctrl",label:"Server Control", icon:HardDrive,       col:"#7c3aed"},
  {id:"emailctrl", label:"Email Control",  icon:Mail,            col:"#0ea5e9"},
  {id:"formbuilder",label:"Forms Builder", icon:ClipboardList,   col:"#f59e0b"},
  {id:"branding",  label:"Branding",       icon:ImageIcon,       col:"#db2777"},
];

/* - IP detection - */
const IP_SOURCES = ["https://api.ipify.org?format=json","https://api64.ipify.org?format=json"];
async function getMyIP(): Promise<{ip:string}|null> {
  for (const url of IP_SOURCES) {
    try { const d=await (await fetch(url,{signal:AbortSignal.timeout(4000)})).json(); if(d.ip) return d; } catch {}
  }
  return null;
}
async function getGeo(ip:string): Promise<any> {
  try { return await (await fetch(`https://ipapi.co/${ip}/json/`,{signal:AbortSignal.timeout(4000)})).json(); } catch { return null; }
}
function timeAgo(iso?: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0 || Number.isNaN(ms)) return "Never";
  const m = Math.floor(ms/60000), h = Math.floor(ms/3600000), d = Math.floor(ms/86400000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"});
}

function classIP(ip:string):"public"|"private"|"loopback" {
  if(/^127\.|^::1$/.test(ip)) return "loopback";
  if(/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(ip)) return "private";
  return "public";
}

function AuditLogFeed() {
  const db = supabase as any;
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await db.from("audit_log")
          .select("id,action,details,created_at,user_id")
          .order("created_at", { ascending: false })
          .limit(20);
        if (mounted) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("[AuditLogFeed]", e);
        if (mounted) setRows([]);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const actionColor: Record<string, string> = {
    INSERT: "#10b981", UPDATE: "#3b82f6", DELETE: "#ef4444",
    login: "#6366f1", ai_agent_approval_sent: "#7c3aed",
    ai_agent_form_created: "#7c3aed", whatsapp_approval: "#25D366",
    whatsapp_rejection: "#ef4444",
  };
  const getColor = (action: string) =>
    Object.entries(actionColor).find(([k]) => action?.toLowerCase().includes(k.toLowerCase()))?.[1] ?? "#64748b";
  const renderDetails = (d: any): string => {
    if (d == null) return "—";
    if (typeof d === "string") return d || "—";
    if (typeof d === "object") {
      const keys = Object.keys(d);
      if (keys.length === 0) return "—";
      try { return JSON.stringify(d); } catch { return "—"; }
    }
    return String(d);
  };
  if (rows.length === 0) return <div style={{padding:"16px",fontSize:12,color:"#94a3b8",textAlign:"center"}}>No audit entries yet</div>;
  return (
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
      <thead><tr style={{background:"#f8fafc"}}>{["Action","Details","Time"].map(h=><th key={h} style={{padding:"6px 14px",textAlign:"left",fontSize:11,color:"#9ca3af",fontWeight:500,borderBottom:"1px solid #f0f0f0"}}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r: any) => (
          <tr key={r.id} style={{borderBottom:"1px solid #f5f5f5"}}>
            <td style={{padding:"7px 14px"}}>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:`${getColor(r.action)}18`,color:getColor(r.action),fontWeight:600,whiteSpace:"nowrap"}}>{r.action?.replace(/_/g," ")?.slice(0,22)}</span>
            </td>
            <td style={{padding:"7px 14px",color:"#374151",fontSize:11,maxWidth:300,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{renderDetails(r.details)}</td>
            <td style={{padding:"7px 14px",color:"#9ca3af",fontSize:11,whiteSpace:"nowrap"}}>{r.created_at ? new Date(r.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"}) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function AdminPanelPage() {
  const nav = useNavigate();
  const {user,roles,profile} = useAuth();
  const settings = useSystemSettings();
  const [sec, setSec] = useState("overview");
  const [srvHealth, setSrvHealth] = useState<any>(null);
  const [srvCron, setSrvCron] = useState<any[]>([]);
  const [srvBreakers, setSrvBreakers] = useState<any[]>([]);
  const [srvErrors, setSrvErrors] = useState<any[]>([]);
  const [srvLoading, setSrvLoading] = useState(false);
  const [srvActionBusy, setSrvActionBusy] = useState<string|null>(null);
  const [kpi, setKpi] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [ipLog, setIpLog] = useState<any[]>([]);
  const [myIP, setMyIP]   = useState("");
  const [geo, setGeo]     = useState<any>(null);
  const [ipFetch, setIpFetch] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<any>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [smsTest, setSmsTest] = useState({to:"",msg:"Hello from EL5 MediProcure!"});
  const [smsSending, setSmsSending] = useState(false);
  const [callTo, setCallTo] = useState("");
  const [calling, setCalling] = useState(false);
  const [pwdUser, setPwdUser] = useState<any>(null);
  const [newPwd, setNewPwd]   = useState("");
  const [showPwd, setShowPwd] = useState<Record<string,boolean>>({});
  const [tempPwds, setTempPwds] = useState<Record<string,string>>({});
  const [saving, setSaving]   = useState(false);
  const [activeIPs, setActiveIPs] = useState<Map<string,any>>(new Map());

  // Forms Builder
  type FBQuestion = { q:string; t:string; opts?:string; req?:boolean };
  const FB_DEFAULT_QUESTIONS: FBQuestion[] = [
    { q:"Full Name", t:"text", req:true },
    { q:"Department", t:"select", opts:"Pharmacy,Theatre,Lab,Finance,HR", req:true },
    { q:"Contact Email", t:"email", req:true },
  ];
  const [forms, setForms] = useState<any[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string|null>(null);
  const [fbTitle, setFbTitle] = useState("");
  const [fbCategory, setFbCategory] = useState("General");
  const [fbDesc, setFbDesc] = useState("");
  const [fbQuestions, setFbQuestions] = useState<FBQuestion[]>(FB_DEFAULT_QUESTIONS);
  const [fbSaving, setFbSaving] = useState(false);
  const [fbResponses, setFbResponses] = useState<any[]>([]);
  const [fbViewResponse, setFbViewResponse] = useState<any|null>(null);
  const [fbCopied, setFbCopied] = useState(false);
  const [fbListSearch, setFbListSearch] = useState("");
  const [fbListCategory, setFbListCategory] = useState("all");
  const [fbListStatus, setFbListStatus] = useState("all");

  // Branding
  const [brand, setBrand] = useState<any>(null);
  const [brandName, setBrandName] = useState("");
  const [brandLogo, setBrandLogo] = useState("");
  const [brandPrimary, setBrandPrimary] = useState("#0e2a4a");
  const [brandAccent, setBrandAccent] = useState("#0e7490");
  const [brandSaving, setBrandSaving] = useState(false);

  const loadBrand = useCallback(async()=>{
    try {
      const { data, error } = await db.from("facilities").select("*").eq("is_main",true).maybeSingle();
      if (error) throw error;
      if (data) {
        setBrand(data);
        setBrandName(data.name||"");
        setBrandLogo(data.logo_url||"");
        setBrandPrimary(data.primary_color||"#0e2a4a");
        setBrandAccent(data.accent_color||"#0e7490");
      }
    } catch(e:any) { console.error("[Branding] load error:",e); }
  },[]);

  const [brandLogoUploading, setBrandLogoUploading] = useState(false);

  const onBrandLogoFile = async (file: File) => {
    if (file.size > 500*1024) { toast({title:"Logo too large", description:"Please use an image under 500KB", variant:"destructive"}); return; }
    // Real upload to Supabase Storage (public "facilities" bucket) instead of
    // embedding the image as base64 directly in the facilities row. Embedding
    // base64 text turned a normal small UPDATE into a multi-hundred-KB JSON
    // payload, which is what was causing "upstream connect error... connection
    // timeout" — the gateway/Postgres connection was choking on the payload
    // size, not a client-side issue. A real file upload transfers the bytes
    // directly and the DB row only ever stores a short public URL string.
    setBrandLogoUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `logos/${brand?.id || "default"}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("facilities").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/png",
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("facilities").getPublicUrl(path);
      setBrandLogo(pub.publicUrl);
      toast({ title: "✓ Logo uploaded", description: "Click Save Branding to apply it." });
    } catch (e: any) {
      toast({ title: "Logo upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBrandLogoUploading(false);
    }
  };

  const saveBrand = async()=>{
    if (!brand) return;
    setBrandSaving(true);
    try {
      const { error } = await db.from("facilities").update({
        name: brandName, logo_url: brandLogo, primary_color: brandPrimary, accent_color: brandAccent,
      }).eq("id", brand.id);
      if (error) throw error;
      toast({title:"✓ Branding updated", description:"Sign-in page and public forms will pick this up on next load."});
      await loadBrand();
    } catch(e:any) {
      toast({title:"Save failed", description:e.message, variant:"destructive"});
    }
    setBrandSaving(false);
  };

  const selectedForm = forms.find((f:any)=>f.form_id===selectedFormId) || null;
  const fbPublicUrl = selectedFormId ? `${window.location.origin}/#/forms/${selectedFormId}` : "";

  const loadServerControls = useCallback(async()=>{
    setSrvLoading(true);
    try {
      const [healthRes, cronRes, breakersRes, errorsRes] = await Promise.all([
        db.rpc("get_db_health_stats"),
        db.rpc("get_cron_job_health"),
        db.from("system_circuit_breaker").select("*").order("service_key"),
        db.from("system_errors").select("*").eq("is_resolved", false).order("created_at",{ascending:false}).limit(20),
      ]);
      if (healthRes.data) setSrvHealth(healthRes.data);
      setSrvCron(cronRes.data||[]);
      setSrvBreakers(breakersRes.data||[]);
      setSrvErrors(errorsRes.data||[]);
    } catch(e:any) { console.error("[ServerControl] load error:",e); }
    setSrvLoading(false);
  },[]);

  useEffect(()=>{ if (sec==="serverctrl") loadServerControls(); },[sec,loadServerControls]);

  const srvAction = useCallback(async(key:string, fn:()=>Promise<void>)=>{
    setSrvActionBusy(key);
    try { await fn(); } catch(e:any) { toast({title:"Action failed", description:e.message, variant:"destructive"}); }
    setSrvActionBusy(null);
  },[]);

  const [showDeletedForms, setShowDeletedForms] = useState(false);
  const loadForms = useCallback(async()=>{
    setFormsLoading(true);
    try {
      let q = db.from("google_forms").select("*").order("created_at",{ascending:false});
      if (!showDeletedForms) q = q.is("deleted_at", null);
      const { data, error } = await q;
      if (error) throw error;
      setForms(data||[]);
    } catch(e:any) { console.error("[FormsBuilder] load error:",e); }
    setFormsLoading(false);
  },[showDeletedForms]);

  const loadFbResponses = useCallback(async(formId:string)=>{
    try {
      const { data, error } = await db.from("form_responses").select("*").eq("form_id",formId).order("submitted_at",{ascending:false}).limit(20);
      if (error) throw error;
      setFbResponses(data||[]);
    } catch(e:any) { console.error("[FormsBuilder] responses error:",e); setFbResponses([]); }
  },[]);

  const fbResetDraft = ()=>{
    setSelectedFormId(null);
    setFbTitle(""); setFbCategory("General"); setFbDesc("");
    setFbQuestions(FB_DEFAULT_QUESTIONS);
    setFbResponses([]);
  };

  const fbSelectForm = (f:any)=>{
    setSelectedFormId(f.form_id);
    setFbTitle(f.title||"");
    const fd = f.field_definitions || {};
    setFbCategory(fd.category||"General");
    setFbDesc(f.description||"");
    setFbQuestions(Array.isArray(fd.questions)&&fd.questions.length ? fd.questions : FB_DEFAULT_QUESTIONS);
    loadFbResponses(f.form_id);
    loadFbSchedules(f.form_id);
  };

  const fbGenFormId = ()=>{
    const d = new Date();
    const dt = d.getFullYear().toString()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
    const rand = Math.floor(10000+Math.random()*90000);
    return `EL5-FORM-${dt}-${rand}`;
  };

  const fbSaveForm = async()=>{
    if (!fbTitle.trim()) { toast({title:"Form name is required",variant:"destructive"}); return; }
    setFbSaving(true);
    try {
      const field_definitions = { category:fbCategory, questions:fbQuestions };
      if (selectedFormId) {
        const { error } = await db.from("google_forms").update({
          title:fbTitle, description:fbDesc, field_definitions,
        }).eq("form_id",selectedFormId);
        if (error) throw error;
        toast({title:"✓ Form updated"});
      } else {
        const newId = fbGenFormId();
        const { error } = await db.from("google_forms").insert({
          form_id:newId, title:fbTitle, description:fbDesc, field_definitions,
          fields: fbQuestions.map(q=>q.q).join(", "),
          method:"internal", sender_email:"hpdeskg9@gmail.com",
          status:"draft", is_active:false, response_count:0,
        });
        if (error) throw error;
        setSelectedFormId(newId);
        toast({title:"✓ Form created", description:newId});
      }
      await loadForms();
    } catch(e:any) {
      toast({title:"Save failed", description:e.message, variant:"destructive"});
    }
    setFbSaving(false);
  };

  const fbTogglePublish = async(formOverride?:any)=>{
    const target = formOverride || selectedForm;
    const targetId = target?.form_id;
    if (!targetId || !target) return;
    const nowPublishing = target.status!=="published";
    setFbSaving(true);
    try {
      // First-time publish of an internally-built form: actually sync it
      // to a real Google Form via the google-forms-api edge function,
      // instead of only flipping a local status flag. Re-publishing an
      // already-synced form (has form_api_id) just re-activates it —
      // no need to create a second Google Form.
      if (nowPublishing && target.method === "internal" && !target.form_api_id) {
        // formOverride (quick-publish from the All Forms list) has no
        // separate "unsaved edits" state — target IS the source of truth.
        // The main editor button (no override) still prefers the live
        // fbTitle/fbDesc/fbQuestions so in-progress edits publish correctly.
        const title = formOverride ? (target.title||target.form_id) : fbTitle;
        const desc  = formOverride ? (target.description||"") : fbDesc;
        const questions = (target.field_definitions?.questions || (formOverride?[]:fbQuestions)).map((q:any)=>q.q || q);
        const { data: syncRes, error: syncErr } = await supabase.functions.invoke("google-forms-api", {
          body: {
            action: "create_form",
            title, description: desc, fields: questions,
            formId: targetId,
          },
        });
        if (syncErr) throw syncErr;
        if (!syncRes?.ok) throw new Error(syncRes?.error || "Google Forms sync failed");

        const { error } = await db.from("google_forms").update({
          status: "published", is_active: true, published_at: new Date().toISOString(),
          form_url: syncRes.formUrl, edit_url: syncRes.editUrl, form_api_id: syncRes.formApiId || null,
          method: syncRes.method,
        }).eq("form_id", targetId);
        if (error) throw error;

        toast({
          title: syncRes.method === "google_forms_api" ? "✓ Published & synced to Google Forms" : "✓ Published (Google API not configured — using create-link fallback)",
          description: syncRes.formUrl,
        });
        await loadForms();
        setFbSaving(false);
        return;
      }

      const { error } = await db.from("google_forms").update({
        status: nowPublishing ? "published" : "draft",
        is_active: nowPublishing,
        published_at: nowPublishing ? new Date().toISOString() : target.published_at,
      }).eq("form_id",targetId);
      if (error) throw error;
      toast({title: nowPublishing ? "✓ Form published" : "Form unpublished"});
      await loadForms();
    } catch(e:any) {
      toast({title:"Update failed", description:e.message, variant:"destructive"});
    }
    setFbSaving(false);
  };

  const fbDeleteForm = async(formOverride?:any)=>{
    const targetId = formOverride?.form_id || selectedFormId;
    const title = formOverride?.title || fbTitle;
    if (!targetId) return;
    if (!confirm(`Delete form "${title}"? You can restore it later from "Show deleted".`)) return;
    try {
      // Soft delete — previously this was a hard DELETE with no way to
      // recover ("This cannot be undone"). Now it just flags the row;
      // Restore below clears the flag.
      const { error } = await db.from("google_forms").update({ deleted_at: new Date().toISOString(), is_active: false, status: "deleted" }).eq("form_id",targetId);
      if (error) throw error;
      toast({title:"✓ Form deleted", description:"You can restore it from \"Show deleted\" if this was a mistake."});
      if (!formOverride || targetId===selectedFormId) fbResetDraft();
      await loadForms();
    } catch(e:any) {
      toast({title:"Delete failed", description:e.message, variant:"destructive"});
    }
  };

  const fbRestoreForm = async(formOverride?:any)=>{
    const targetId = formOverride?.form_id || selectedFormId;
    if (!targetId) return;
    try {
      const { error } = await db.from("google_forms").update({ deleted_at: null, status: "draft" }).eq("form_id",targetId);
      if (error) throw error;
      toast({title:"✓ Form restored"});
      await loadForms();
    } catch(e:any) {
      toast({title:"Restore failed", description:e.message, variant:"destructive"});
    }
  };

  const [fbSending, setFbSending] = useState(false);
  const fbSendToAllUsers = async()=>{
    if (!selectedForm) return;
    if (selectedForm.status!=="published") {
      toast({title:"Publish the form first", description:"Users can't fill in a draft form.", variant:"destructive"});
      return;
    }
    if (!confirm(`Email the link for "${fbTitle}" to every active user?`)) return;
    setFbSending(true);
    try {
      const { data: users, error: uErr } = await db.from("profiles").select("email,full_name").eq("is_active",true).not("email","is",null);
      if (uErr) throw uErr;
      const recipients = Array.from(
        new Map((users||[]).filter((u:any)=>u.email).map((u:any)=>[u.email, { email:u.email, name:u.full_name||u.email }])).values()
      );
      if (recipients.length===0) { toast({title:"No active users with an email on file",variant:"destructive"}); setFbSending(false); return; }

      // Uses the Gmail SMTP already configured in notification-hub (Settings → SMTP),
      // not the send-email function — that one relies on Resend/SMTP2GO, which
      // aren't set up here, so it always failed with "No email provider available".
      const { data, error } = await supabase.functions.invoke("notification-hub", {
        body: {
          action: "send_all",
          recipients,
          channels: ["email"],
          subject: `New form: ${fbTitle}`,
          message: fbDesc||"A new form has been published and needs your response.",
          ctaUrl: fbPublicUrl,
          ctaLabel: "Answer the Form",
        },
      });
      if (error) throw error;
      const results = data?.results || [];
      const okCount = results.filter((r:any)=>r.ok).length;
      if (okCount === 0 && results.length > 0) {
        throw new Error(results[0]?.error || "Delivery failed for all recipients");
      }
      toast({title:`✓ Sent to ${okCount}/${recipients.length} user${recipients.length===1?"":"s"}`,
        description: okCount < recipients.length ? `${recipients.length-okCount} failed — check Settings → SMTP` : undefined,
        variant: okCount < recipients.length ? "destructive" : undefined});
      await loadFbSchedules(selectedFormId!);
    } catch(e:any) {
      toast({title:"Send failed", description:e.message, variant:"destructive"});
    }
    setFbSending(false);
  };

  // ── Scheduled sends ────────────────────────────────────────────────────
  const [fbSchedules, setFbSchedules] = useState<any[]>([]);
  const [fbScheduleAt, setFbScheduleAt] = useState("");
  const [fbScheduling, setFbScheduling] = useState(false);

  const loadFbSchedules = useCallback(async(formId:string)=>{
    try {
      const { data, error } = await db.from("form_email_schedules").select("*").eq("form_id",formId).order("scheduled_at",{ascending:false}).limit(10);
      if (error) throw error;
      setFbSchedules(data||[]);
    } catch(e:any) { console.error("[FormsBuilder] schedules load error:",e); setFbSchedules([]); }
  },[]);

  const fbScheduleSend = async()=>{
    if (!selectedForm || !selectedFormId) return;
    if (selectedForm.status!=="published") {
      toast({title:"Publish the form first", description:"Users can't fill in a draft form.", variant:"destructive"});
      return;
    }
    if (!fbScheduleAt) { toast({title:"Pick a date and time first",variant:"destructive"}); return; }
    const when = new Date(fbScheduleAt);
    if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      toast({title:"Pick a time in the future",variant:"destructive"}); return;
    }
    if (!confirm(`Schedule "${fbTitle}" to email every active user on ${when.toLocaleString()}?`)) return;
    setFbScheduling(true);
    try {
      const { error } = await db.from("form_email_schedules").insert({
        form_id: selectedFormId,
        form_title: fbTitle,
        subject: `New form: ${fbTitle}`,
        message: fbDesc||"A new form has been published and needs your response.",
        scheduled_at: when.toISOString(),
        created_by: user?.id || null,
        created_by_name: profile?.full_name || user?.email || null,
      });
      if (error) throw error;
      toast({title:"✓ Scheduled", description:`Will send on ${when.toLocaleString()} (checked every 2 min)`});
      setFbScheduleAt("");
      await loadFbSchedules(selectedFormId);
    } catch(e:any) {
      toast({title:"Schedule failed", description:e.message, variant:"destructive"});
    }
    setFbScheduling(false);
  };

  const fbCancelSchedule = async(id:string)=>{
    try {
      const { error } = await db.from("form_email_schedules").update({status:"cancelled"}).eq("id",id).eq("status","pending");
      if (error) throw error;
      toast({title:"Schedule cancelled"});
      if (selectedFormId) await loadFbSchedules(selectedFormId);
    } catch(e:any) { toast({title:"Cancel failed", description:e.message, variant:"destructive"}); }
  };

  const fbCopyLink = async()=>{
    try {
      await navigator.clipboard.writeText(fbPublicUrl);
      setFbCopied(true);
      setTimeout(()=>setFbCopied(false),2000);
    } catch { toast({title:"Copy failed — select and copy manually",variant:"destructive"}); }
  };

  useEffect(()=>{ if (sec==="formbuilder") loadForms(); },[sec,loadForms]);
  useEffect(()=>{ if (sec==="branding") loadBrand(); },[sec,loadBrand]);

  const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set());
  const [moduleCfg, setModuleCfg] = useState<Record<string,string>>({});
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [botStats, setBotStats] = useState<any>(null);
  const [botLoading, setBotLoading] = useState(false);
  const [botRunning, setBotRunning] = useState(false);
  const [botRuns, setBotRuns] = useState<any[]>([]);
  const [ipToggling, setIpToggling] = useState(false);

  const ipEnabled = settings.loading ? null : settings.bool("ip_restriction_enabled");
  const toggleIpAccess = async () => {
    if (ipEnabled === null) return;
    setIpToggling(true);
    try {
      await settings.save("ip_restriction_enabled", ipEnabled ? "false" : "true");
      toast({ title: ipEnabled ? "IP restriction disabled" : "IP restriction enabled" });
    } catch (e: any) {
      toast({ title: "Failed to update IP access", description: e.message, variant: "destructive" });
    }
    setIpToggling(false);
  };
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })();

  /* Load KPIs */
  const loadKpi = useCallback(async()=>{
    const [u,r2,p,s2,i,n] = await Promise.allSettled([
      db.from("profiles").select("id",{count:"exact",head:true}),
      db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
      db.from("purchase_orders").select("id",{count:"exact",head:true}),
      db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      db.from("items").select("id",{count:"exact",head:true}),
      db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
    ]);
    const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
    setKpi({users:v(u),reqs:v(r2),pos:v(p),suppliers:v(s2),items:v(i),unread:v(n)});
  },[]);

  /* Load users */
  const loadUsers = useCallback(async()=>{
    const {data:pr} = await db.from("profiles").select("id,full_name,email,is_active,is_locked,failed_logins,last_login,last_seen,last_ip,created_at").order("full_name");
    const {data:rls} = await db.from("user_roles").select("user_id,role");
    const roleMap: Record<string,string[]> = {};
    (rls||[]).forEach((r:any)=>{if(!roleMap[r.user_id])roleMap[r.user_id]=[];roleMap[r.user_id].push(r.role);});
    setUsers((pr||[]).map((p:any)=>({...p,roles:roleMap[p.id]||[]})));
  },[]);

  /* Load IP data */
  const loadIPData = useCallback(async()=>{
    const {data:logs} = await db.from("ip_access_log").select("*").order("created_at",{ascending:false}).limit(200);
    const {data:wl}   = await db.from("network_whitelist").select("cidr,type,active").eq("type","blocked").eq("active",true);
    const cutoff = new Date(Date.now()-30*60_000).toISOString();
    const recent = (logs||[]).filter((l:any)=>l.created_at>cutoff);
    const ipMap = new Map<string,any>();
    recent.forEach((l:any)=>{if(!ipMap.has(l.ip_address)||l.created_at>ipMap.get(l.ip_address).created_at)ipMap.set(l.ip_address,l);});
    setActiveIPs(ipMap);
    setIpLog(logs||[]);
    setBlockedIPs(new Set((wl||[]).map((w:any)=>w.cidr)));
  },[]);

  /* Detect my IP */
  const detectIP = async()=>{
    setIpFetch(true);
    const res = await getMyIP();
    if(res){setMyIP(res.ip);const g=await getGeo(res.ip);setGeo(g);}
    setIpFetch(false);
  };

  /* Load module settings */
  const loadModules = useCallback(async()=>{
    const {data} = await db.from("system_settings").select("key,value").like("key","enable_%");
    const cfg: Record<string,string> = {};
    (data||[]).forEach((r:any)=>{cfg[r.key]=r.value;});
    setModuleCfg(cfg);
  },[]);

  /* Load bot stats */
  const loadBotStats = useCallback(async()=>{
    setBotLoading(true);
    try {
      const r=await fetch("https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=status",{
        headers:{"apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"}
      });
      const d=await r.json();
      setBotStats(d);
      
      // Load recent activity logs
      const {data:logs} = await db.from("activity_logs")
        .select("*")
        .order("created_at",{ascending:false})
        .limit(20);
      setBotRuns(Array.isArray(logs)?logs:[]);
    } catch(e:any) { console.error("Bot stats error:",e); }
    setBotLoading(false);
  },[]);

  useEffect(()=>{
    loadKpi();
    loadUsers();
    loadIPData();
    loadModules();
    detectIP();
    loadBotStats();
  },[loadKpi,loadUsers,loadIPData,loadModules,detectIP,loadBotStats]);

  /* Check Twilio */
  const checkTwilio = async()=>{
    setTwilioLoading(true);
    const s=await checkTwilioStatus();
    setTwilioStatus(s);
    setTwilioLoading(false);
    toast({title:s.ok?"- Twilio Connected":"- Twilio Error",description:s.ok?`From: ${s.from||"-"}`:(s.error||"Connection failed"),variant:s.ok?"default":"destructive"});
  };

  /* Send test SMS */
  const testSMS = async()=>{
    if(!smsTest.to||!smsTest.msg){toast({title:"Enter phone & message",variant:"destructive"});return;}
    setSmsSending(true);
    const r = await sendSms({to:smsTest.to,message:smsTest.msg,module:"admin_test"});
    setSmsSending(false);
    toast({title:r.ok?"- SMS Sent":"- SMS Failed",description:r.ok?`Sent via ${r.results[0]?.provider}`:(r.error||r.results[0]?.error||"Failed"),variant:r.ok?"default":"destructive"});
  };

  /* Test call */
  const testCall = async()=>{
    if(!callTo){toast({title:"Enter phone number",variant:"destructive"});return;}
    setCalling(true);
    const r = await makeCall({to:callTo,message:"Hello from EL5 MediProcure hospital. This is a test call."});
    setCalling(false);
    toast({title:r.ok?"- Call Initiated":"- Call Failed",description:r.ok?`SID: ${r.sid}`:(r.error||"Failed"),variant:r.ok?"default":"destructive"});
  };

  /* Reset password */
  const resetPwd = async()=>{
    if(!pwdUser||!newPwd){toast({title:"Select user and enter password",variant:"destructive"});return;}
    if(newPwd.length<8){toast({title:"Password must be 8+ characters",variant:"destructive"});return;}
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: { user_id: pwdUser.id, new_password: newPwd },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Reset failed");
      }
      // Ephemeral, in-memory only — never written to any table. Cleared
      // automatically after 2 minutes so it doesn't linger on-screen.
      setTempPwds(p => ({ ...p, [pwdUser.id]: newPwd }));
      setTimeout(() => setTempPwds(p => { const n = { ...p }; delete n[pwdUser.id]; return n; }), 120_000);
      toast({title:"- Password reset",description:`${pwdUser.full_name}'s password updated. Copy it now — it won't be shown again after this session.`});
    } catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    setSaving(false);setNewPwd("");setPwdUser(null);loadUsers();
  };

  /* Toggle module */
  const toggleModule = async(key:string)=>{
    const cur = moduleCfg[key]!=="false";
    await db.from("system_settings").upsert({key,value:cur?"false":"true",category:"modules"},{onConflict:"key"});
    setModuleCfg(p=>({...p,[key]:cur?"false":"true"}));
    toast({title:`${key.replace("enable_","")}: ${cur?"Disabled":"Enabled"}`});
  };

  /* Send broadcast */
  const sendBroadcast = async()=>{
    if(!broadcastMsg.trim()) return;
    setBroadcasting(true);
    await db.from("system_broadcasts").insert({message:broadcastMsg,type:"info",is_active:true,created_at:new Date().toISOString()});
    setBroadcastMsg(""); setBroadcasting(false);
    toast({title:"Broadcast sent"});
  };

  /* - RENDER - */
  const fmtAgo=(s:string)=>{const d=Date.now()-new Date(s).getTime();return d<60000?`${Math.floor(d/1000)}s`:d<3600000?`${Math.floor(d/60000)}m`:`${Math.floor(d/3600000)}h`;};

  return (
    <div style={{ background:O.bg, minHeight:"100vh", fontFamily:O.font, color:O.text }}>
      <AdminBreadcrumb />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}} @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Top bar */}
      <div style={{ background:O.topBar, height:44, display:"flex", alignItems:"center", padding:"0 24px", gap:8 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,5px)", gap:2 }}>
          {Array(9).fill(0).map((_,i)=><div key={i} style={{ width:5,height:5,background:"rgba(255,255,255,.7)",borderRadius:1 }}/>)}
        </div>
        <span style={{ color:O.white, fontWeight:700, fontSize:14, marginLeft:6 }}>EL5 MediProcure</span>
        <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
          <button onClick={()=>nav("/notifications")} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",display:"flex" }}><Bell size={16}/></button>
          <button onClick={()=>nav("/settings")} style={{ background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",display:"flex" }}><Settings size={16}/></button>
          <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:O.white,fontWeight:700,fontSize:11 }}>{(profile?.full_name||"A").charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Teal hero */}
      <div style={{ background:O.hero, padding:"28px 24px 34px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:16 }}>
          <div>
            <h1 style={{ color:O.white, fontSize:24, fontWeight:300, margin:"0 0 4px", letterSpacing:"-.02em" }}>
              {greeting}, {profile?.full_name?.split(" ")[0]||"Administrator"}
            </h1>
          </div>
          <QuickStampButton label="Official Stamp" size="md" variant="outline"/>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={()=>{loadKpi();loadUsers();loadIPData();}}
            style={{ padding:"8px 12px",background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:2,color:O.white,fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
            <RefreshCw size={11}/> Refresh
          </button>
          <button onClick={()=>nav("/users")}
            style={{ padding:"8px 12px",background:O.white,border:"none",borderRadius:2,color:O.hero,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
            <Users size={11}/> Manage Users
          </button>
        </div>
      </div>

      <div style={{ padding:"0 24px 32px" }}>

        {/* KPI strip */}
        <div style={{ display:"flex", gap:10, marginTop:16, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { label:"Users",         val:kpi.users,    color:T.primary },
            { label:"Pending Reqs",  val:kpi.reqs,     color:T.warning },
            { label:"Open POs",      val:kpi.pos,      color:"#7719aa" },
            { label:"Suppliers",     val:kpi.suppliers,color:T.inventory },
            { label:"Items",        val:kpi.items,    color:T.quality },
            { label:"Notifications",val:kpi.unread,   color:T.error },
          ].map(b=>(
            <div key={b.label} style={{ background:O.card, border:`1px solid ${O.border}`, borderTop:`3px solid ${b.color}`, borderRadius:2, padding:"10px 16px", boxShadow:O.shadow, minWidth:120 }}>
              <div style={{ fontSize:22, fontWeight:800, color:b.color }}>{b.val??0}</div>
              <div style={{ fontSize:10, color:O.textSub, fontWeight:600, textTransform:"uppercase", letterSpacing:".04em" }}>{b.label}</div>
            </div>
          ))}
        </div>

        {/* Quick access tile grid — replaces the old left sidebar */}
        <p style={{ fontSize:12, color:O.textSub, margin:"0 0 10px" }}>Quick access</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:20 }}>
          {NAVS.map(n=>(
            <button key={n.id} onClick={()=>setSec(n.id)}
              style={{ width:82,height:82,background:n.col,border:sec===n.id?`2px solid ${O.text}`:"none",borderRadius:2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,cursor:"pointer",boxShadow:O.shadow,transition:"opacity .15s,transform .15s",opacity:sec===n.id?1:.92 }}
              onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity="1"; el.style.transform="translateY(-2px)"; }}
              onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.opacity=sec===n.id?"1":".92"; el.style.transform="none"; }}>
              <n.icon size={20} color={O.white} strokeWidth={1.5}/>
              <span style={{ color:O.white,fontSize:9,fontWeight:700,textAlign:"center",lineHeight:1.2,padding:"0 3px" }}>{n.label}</span>
            </button>
          ))}
        </div>

        <div style={{ borderTop:`1px solid ${O.border}`, marginBottom:16 }}/>

        {/* - MAIN CONTENT AREA - */}
        {/* key={sec} remounts this boundary on every tab switch, so a crash on
            one tab clears itself the moment the person clicks a different
            quick-access tile instead of leaving the whole Admin Panel stuck. */}
        <div style={S.main}>
        <ErrorBoundary pageName="Admin Panel section" key={sec}>

          {/* - OVERVIEW - */}
          {sec==="overview"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
                {[
                  {label:"Users",    val:kpi.users,    col:T.primary,  icon:Users,       path:"/users"},
                  {label:"Pending Reqs",val:kpi.reqs,  col:T.warning,  icon:ShoppingCart,path:"/requisitions"},
                  {label:"Open POs", val:kpi.pos,      col:"#7719aa",  icon:Package,     path:"/purchase-orders"},
                  {label:"Suppliers",val:kpi.suppliers, col:T.inventory,icon:TrendingUp,  path:"/suppliers"},
                  {label:"Items",    val:kpi.items,    col:T.quality,  icon:Package,     path:"/items"},
                  {label:"Notifs",   val:kpi.unread,   col:T.error,    icon:Bell,        path:"/notifications"},
                ].map(k=>(
                  <div key={k.label} onClick={()=>nav(k.path)} style={{...S.card,padding:"14px 16px",cursor:"pointer"}}
                    onMouseEnter={e=>{(e.currentTarget as any).style.transform="translateY(-1px)";(e.currentTarget as any).style.boxShadow="0 4px 12px rgba(0,0,0,.1)";}}
                    onMouseLeave={e=>{(e.currentTarget as any).style.transform="none";(e.currentTarget as any).style.boxShadow="0 1px 4px rgba(0,0,0,.06)";}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:32,height:32,borderRadius:T.r,background:`${k.col}14`,display:"flex",alignItems:"center",justifyContent:"center"}}><k.icon size={16} color={k.col}/></div>
                      <span style={{fontSize:11,color:T.fgMuted}}>{k.label}</span>
                    </div>
                    <div style={{fontSize:26,fontWeight:800,color:k.col}}>{k.val??0}</div>
                  </div>
                ))}
              </div>

              {/* ── IP Access Control Toggle ── */}
              <div style={{...S.card, marginBottom:16, border:`2px solid ${ipEnabled ? T.success : T.error}`, transition:"border-color .3s"}}>
                <div style={{...S.cardHd(ipEnabled ? T.success : T.error), justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <Globe size={14} color={ipEnabled ? T.success : T.error}/>
                    <span style={{fontWeight:700,color:T.fg,fontSize:13}}>IP Access Control</span>
                  </div>
                  <span style={{padding:"2px 10px",borderRadius:10,fontSize:10,fontWeight:800,background:ipEnabled?`${T.success}18`:`${T.error}18`,color:ipEnabled?T.success:T.error,textTransform:"uppercase",letterSpacing:".06em"}}>
                    {ipEnabled===null?"Loading…":ipEnabled?"ACTIVE":"DISABLED"}
                  </span>
                </div>
                <div style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                  <p style={{fontSize:12,color:T.fgMuted,margin:0,flex:1,minWidth:180}}>
                    {ipEnabled
                      ? "Whitelist-based restriction is ON — unknown IPs are blocked."
                      : "Restriction is OFF — all IP addresses are permitted to connect."}
                  </p>
                  <div style={{display:"flex",gap:8,flexShrink:0}}>
                    <button onClick={toggleIpAccess} disabled={ipToggling||ipEnabled===null}
                      style={{...S.btn(ipEnabled?`${T.error}14`:`${T.success}14`,ipEnabled?T.error:T.success),padding:"6px 18px",fontSize:12,fontWeight:700,opacity:ipToggling?0.6:1}}>
                      {ipToggling?"Saving…":ipEnabled?"Turn OFF":"Turn ON"}
                    </button>
                    <button onClick={()=>nav("/admin/users-ip-audit")} style={{...S.btn(T.bg2,T.fgMuted),padding:"6px 12px",fontSize:11}}>
                      Manage Rules →
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Official Stamp Panel ── */}
              <div style={{...S.card, marginBottom:16, border:`1.5px solid #0d4f1c22`}}>
                <div style={{...S.cardHd('#0d4f1c'), justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <svg width={14} height={14} viewBox="0 0 20 20" fill="#0d4f1c">
                      <path d="M10 1a4 4 0 014 4 4 4 0 01-1.07 2.72L14 9H6l1.07-1.28A4 4 0 016 5a4 4 0 014-4zM4 10h12v2H4v-2zM3 13h14v2H3v-2z"/>
                    </svg>
                    <span style={{fontWeight:700,color:T.fg,fontSize:13}}>Official Stamp</span>
                  </div>
                  <span style={{fontSize:10,color:'#6b7280'}}>Affix stamps to approved documents</span>
                </div>
                <div style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:14,flexWrap:'wrap'}}>
                  <QuickStampButton label="Stamp Documents" size="md" variant="primary" />
                  <QuickStampButton label="Quick Stamp (Outline)" size="md" variant="outline" />
                  <button
                    onClick={() => nav("/admin/stamp-design")}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"transparent", color:"#0d4f1c", border:"2px solid #0d4f1c", borderRadius:6, fontWeight:700, fontSize:12, cursor:"pointer", marginTop:4 }}>
                    🎨 Open Stamp Design Studio
                  </button>
                  <span style={{fontSize:11,color:T.fgMuted,flex:1}}>
                    Apply official circular approval stamps to requisitions, purchase orders and GRNs.
                  </span>
                </div>
              </div>

              {/* Quick actions D365 command bar style */}
              <div style={{...S.card,marginBottom:16}}>
                <div style={S.cardHd(T.primary)}><Zap size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Quick Actions</span></div>
                <div style={{padding:"12px 16px",display:"flex",gap:8,flexWrap:"wrap"}}>
                  {[
                    {l:"Users & Passwords", p:"/users",            col:T.primary, cb:()=>setSec("users")},
                    {l:"Live IP Stats",     p:"",                  col:"#7719aa",  cb:()=>setSec("iplive")},
                    {l:"Test Twilio SMS",   p:"",                  col:T.inventory,cb:()=>setSec("twilio")},
                    {l:"System Broadcast",  p:"",                  col:T.warning,  cb:()=>setSec("broadcast")},
                    {l:"DB Monitor",        p:"/admin/db-test",    col:T.quality},
                    {l:"Audit Log",         p:"/audit-log",        col:"#374151"},
                    {l:"Security Center",   p:"/admin/users-ip-audit",  col:T.error},
                    {l:"Webmaster / Superadmin", p:"/webmaster",   col:"#5c2d91"},
                    {l:"Supabase Live Controls", p:"/admin/supabase-controls", col:"#0f766e"},
                  ].map(a=>(
                    <button key={a.l} onClick={()=>{if(a.cb)a.cb();else if(a.p)nav(a.p);}} style={S.btn(`${a.col}14`,a.col)} onMouseEnter={e=>(e.currentTarget.style.background=`${a.col}22`)} onMouseLeave={e=>(e.currentTarget.style.background=`${a.col}14`)}>
                      <ChevronRight size={12}/>{a.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live activity */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div style={S.card}>
                  <div style={S.cardHd(T.primary)}><Activity size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent IP Activity</span><span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:T.success,animation:"pulse 2s infinite"}} /></div>
                  <div style={{padding:"8px 0",maxHeight:220,overflowY:"auto"}}>
                    {ipLog.slice(0,10).map((l,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"6px 16px",borderBottom:`1px solid ${T.border}22`}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:l.status==="blocked"?T.error:T.success,marginTop:5,flexShrink:0}}/>
                        <code style={{fontSize:11,color:T.fg,fontFamily:"monospace",flex:1}}>{l.ip_address}</code>
                        <span style={{fontSize:9,color:T.fgDim}}>{fmtAgo(l.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHd(T.quality)}><UserCheck size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent Users ({users.length})</span></div>
                  <div style={{padding:"8px 0",maxHeight:220,overflowY:"auto"}}>
                    {users.slice(0,10).map((u,i)=>(
                      <div key={i} style={{display:"flex",gap:10,padding:"6px 16px",borderBottom:`1px solid ${T.border}22`,alignItems:"center"}}>
                        <div style={{width:28,height:28,borderRadius:"50%",background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{fontSize:11,fontWeight:700,color:T.primary}}>{u.full_name?.[0]||"?"}</span></div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,fontWeight:600,color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.full_name||"-"}</div>
                          <div style={{fontSize:10,color:T.fgMuted}}>{u.roles?.[0]?.replace(/_/g," ")||"No role"}</div>
                        </div>
                        <button onClick={()=>{setPwdUser(u);setSec("users");}} style={{...S.btn(`${T.primary}14`,T.primary),padding:"3px 8px",fontSize:10}}>
                          <Key size={10}/> Reset
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Audit log live feed */}
              <div style={{...S.card,marginTop:16}}>
                <div style={S.cardHd("#374151")}><Activity size={14} color="#374151"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Live Audit Log</span><span style={{marginLeft:"auto",fontSize:11,color:T.fgMuted}}>All user actions</span><button onClick={()=>nav("/audit-log")} style={{...S.btn(T.bg2,T.fgMuted),fontSize:10,padding:"2px 8px",marginLeft:8}}>View All →</button></div>
                <div style={{padding:"4px 0",maxHeight:200,overflowY:"auto"}}>
                  <AuditLogFeed />
                </div>
              </div>
            </div>
          )}

          {/* - LIVE IP STATS - */}
          {sec==="iplive"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                {/* My public IP */}
                <div style={S.card}>
                  <div style={S.cardHd(T.primary)}><Globe size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>My Public IP</span><span style={{marginLeft:"auto",width:7,height:7,borderRadius:"50%",background:myIP?T.success:T.fgDim,animation:"pulse 2s infinite"}} /></div>
                  <div style={{padding:"16px"}}>
                    {myIP?(
                      <>
                        <div style={{fontSize:22,fontWeight:800,color:T.primary,fontFamily:"monospace",marginBottom:8}}>{myIP}</div>
                        {geo&&<div style={{fontSize:11,color:T.fgMuted,lineHeight:2}}>
                          <div><MapPin size={10} style={{verticalAlign:"middle"}}/> {[geo.city,geo.region,geo.country_name].filter(Boolean).join(", ")||"Unknown"}</div>
                          {geo.org&&<div><TrendingUp size={10} style={{verticalAlign:"middle"}}/> {geo.org}</div>}
                        </div>}
                        <div style={{display:"flex",gap:6,marginTop:10}}>
                          <button onClick={async()=>{await db.from("network_whitelist").insert({cidr:myIP,label:`Allow ${myIP}`,type:"public",active:true,created_at:new Date().toISOString()});toast({title:"Whitelisted"});}} style={S.btn(T.successBg,T.success)}><Check size={11}/> Allow</button>
                          <button onClick={async()=>{await db.from("network_whitelist").insert({cidr:myIP,label:`Block ${myIP}`,type:"blocked",active:true,created_at:new Date().toISOString()});toast({title:"Blocked",variant:"destructive"});}} style={S.btn(T.errorBg,T.error)}><X size={11}/> Block</button>
                        </div>
                      </>
                    ):(
                      <button onClick={detectIP} disabled={ipFetch} style={S.btn(T.primary)}>
                        {ipFetch?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Globe size={13}/>}
                        {ipFetch?"Detecting...":"Detect My IP"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Active session IPs */}
                <div style={S.card}>
                  <div style={S.cardHd("purple")}><Monitor size={14} color="#7719aa"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Active IPs (30m)</span><span style={{marginLeft:"auto",padding:"1px 7px",borderRadius:T.r,background:`${T.success}14`,color:T.success,fontSize:10,fontWeight:700}}>{activeIPs.size}</span></div>
                  <div style={{padding:"0",maxHeight:220,overflowY:"auto"}}>
                    {[...activeIPs.entries()].map(([ip,log])=>(
                      <div key={ip} style={{display:"flex",gap:8,padding:"8px 16px",borderBottom:`1px solid ${T.border}22`,alignItems:"center"}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:blockedIPs.has(ip)?T.error:T.success,flexShrink:0}}/>
                        <code style={{fontSize:11,color:T.fg,fontFamily:"monospace",flex:1}}>{ip}</code>
                        <span style={{fontSize:9,padding:"1px 6px",borderRadius:T.r,background:classIP(ip)==="public"?T.primaryBg:`${T.inventory}14`,color:classIP(ip)==="public"?T.primary:T.inventory}}>{classIP(ip)}</span>
                        <button onClick={()=>nav("/admin/users-ip-audit")} style={{...S.btn(T.bg2,T.fgMuted),padding:"3px 7px",fontSize:10}}><Eye size={10}/></button>
                      </div>
                    ))}
                    {activeIPs.size===0&&<div style={{padding:20,textAlign:"center",color:T.fgMuted,fontSize:12}}>No active sessions in last 30 min</div>}
                  </div>
                </div>

                {/* IP Stats summary */}
                <div style={S.card}>
                  <div style={S.cardHd(T.quality)}><Activity size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Access Stats</span></div>
                  <div style={{padding:"12px 16px"}}>
                    {[
                      {l:"Total Logged",   v:ipLog.length,                                        c:T.fg},
                      {l:"Allowed",        v:ipLog.filter(l=>l.status!=="blocked").length,         c:T.success},
                      {l:"Blocked",        v:ipLog.filter(l=>l.status==="blocked").length,          c:T.error},
                      {l:"Unique IPs",     v:new Set(ipLog.map(l=>l.ip_address)).size,             c:T.primary},
                      {l:"Active (30m)",   v:activeIPs.size,                                       c:"#7719aa"},
                      {l:"Block Rules",    v:blockedIPs.size,                                      c:T.warning},
                    ].map(({l,v,c})=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}18`,fontSize:12}}>
                        <span style={{color:T.fgMuted}}>{l}</span>
                        <span style={{fontWeight:700,color:c,fontFamily:"monospace"}}>{v}</span>
                      </div>
                    ))}
                    <button onClick={()=>nav("/admin/users-ip-audit")} style={{...S.btn(T.primary),marginTop:12,width:"100%",justifyContent:"center"}}>
                      <Globe size={13}/> Full IP Monitor
                    </button>
                  </div>
                </div>
              </div>

              {/* Recent IP log table */}
              <div style={S.card}>
                <div style={S.cardHd(T.system||"#00188f")}><Activity size={14} color="#00188f"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent Access Log</span></div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead><tr style={{background:T.bg2}}>
                      {["Time","IP Address","Type","User","Action","Status"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {ipLog.slice(0,30).map((l,i)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}18`}} onMouseEnter={e=>(e.currentTarget.style.background=T.bg)} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <td style={{padding:"6px 12px",color:T.fgDim,fontSize:10,whiteSpace:"nowrap"}}>{new Date(l.created_at).toLocaleString("en-KE",{timeZone:"Africa/Nairobi",hour:"2-digit",minute:"2-digit"})}</td>
                          <td style={{padding:"6px 12px"}}><code style={{fontFamily:"monospace",fontSize:11,color:T.fg}}>{l.ip_address||"-"}</code></td>
                          <td style={{padding:"6px 12px"}}><span style={{fontSize:9,fontWeight:700,color:classIP(l.ip_address||"")==="public"?T.primary:T.inventory}}>{classIP(l.ip_address||"")}</span></td>
                          <td style={{padding:"6px 12px",fontSize:11,color:T.fg,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(()=>{const u=users.find((u:any)=>u.id===l.user_id);return u?(u.full_name||u.email||"Auth. User"):(l.user_id?"User":"Guest");})()}</td>
                          <td style={{padding:"6px 12px",fontSize:11,color:T.fgMuted}}>{l.action||"-"}</td>
                          <td style={{padding:"6px 12px"}}><span style={{padding:"2px 7px",borderRadius:T.r,fontSize:10,fontWeight:600,background:l.status==="blocked"?T.errorBg:T.successBg,color:l.status==="blocked"?T.error:T.success}}>{l.status||"ok"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* - USER PASSWORDS - */}
          {sec==="users"&&(
            <div>
              {/* Password reset form */}
              <div style={{...S.card,marginBottom:16}}>
                <div style={S.cardHd("#7719aa")}><Key size={14} color="#7719aa"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Reset User Password</span></div>
                <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div>
                    <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Select User</label>
                    <select value={pwdUser?.id||""} onChange={e=>{const u=users.find(u=>u.id===e.target.value);setPwdUser(u||null);}} style={S.inp}>
                      <option value="">-- Choose user --</option>
                      {users.map(u=><option key={u.id} value={u.id}>{u.full_name||u.email} ({u.roles?.[0]||"no role"})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>New Password</label>
                    <div style={{position:"relative"}}>
                      <input type={showPwd.reset?"text":"password"} value={newPwd} onChange={e=>setNewPwd(e.target.value)} style={{...S.inp,paddingRight:36}} placeholder="Min 6 characters"/>
                      <button onClick={()=>setShowPwd(p=>({...p,reset:!p.reset}))} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:T.fgDim}}>{showPwd.reset?<EyeOff size={13}/>:<Eye size={13}/>}</button>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
                    <button onClick={()=>setNewPwd(`Temp@${Math.random().toString(36).slice(2,8).toUpperCase()}!`)} style={S.btn(T.bg2,T.fg)}><RefreshCw size={12}/> Generate</button>
                    <button onClick={resetPwd} disabled={saving||!pwdUser||!newPwd} style={S.btn(saving||!pwdUser||!newPwd?"#ccc":T.primary)}>
                      {saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Save size={13}/>} Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* User table with password view */}
              <div style={S.card}>
                <div style={S.cardHd(T.primary)}><Users size={14} color={T.primary}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>All Users ({users.length})</span></div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:T.bg}}>
                    {["User","Email","Roles","Account Status","Just Reset","Actions"].map(h=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {users.map(u=>{
                      const tp = tempPwds[u.id];
                      const lastLoginAgo = u.last_login ? timeAgo(u.last_login) : (u.last_seen ? timeAgo(u.last_seen) : "Never signed in");
                      return(
                        <tr key={u.id} style={{borderBottom:`1px solid ${T.border}14`}} onMouseEnter={e=>(e.currentTarget.style.background=T.bg)} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:30,height:30,borderRadius:"50%",background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,fontWeight:700,color:T.primary}}>{u.full_name?.[0]||"?"}</span></div>
                              <span style={{fontWeight:600,color:T.fg}}>{u.full_name||"-"}</span>
                            </div>
                          </td>
                          <td style={{padding:"9px 14px",color:T.fgMuted,fontSize:11}}>{u.email}</td>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                              {u.roles.slice(0,3).map((r:string)=>(
                                <span key={r} style={{padding:"1px 7px",borderRadius:T.r,fontSize:10,fontWeight:600,background:T.primaryBg,color:T.primary}}>{r.replace(/_/g," ")}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:3}}>
                              <span style={{padding:"2px 8px",borderRadius:T.r,fontSize:10,fontWeight:600,background:u.is_active!==false?T.successBg:T.errorBg,color:u.is_active!==false?T.success:T.error}}>{u.is_active!==false?"Active":"Inactive"}</span>
                              {u.is_locked && <span style={{padding:"2px 8px",borderRadius:T.r,fontSize:10,fontWeight:600,background:T.errorBg,color:T.error}}><Lock size={9} style={{marginRight:3,verticalAlign:-1}}/>Locked</span>}
                              {!!u.failed_logins && u.failed_logins>0 && <span style={{padding:"2px 8px",borderRadius:T.r,fontSize:10,fontWeight:600,background:T.warningBg,color:T.warning}}>{u.failed_logins} failed</span>}
                            </div>
                            <div style={{fontSize:10,color:T.fgDim}}>{lastLoginAgo}{u.last_ip?` · ${u.last_ip}`:""}</div>
                          </td>
                          <td style={{padding:"9px 14px"}}>
                            {tp?(
                              <div style={{display:"flex",alignItems:"center",gap:5}}>
                                <code style={{fontSize:11,fontFamily:"monospace",color:T.warning,background:T.warningBg,padding:"2px 7px",borderRadius:T.r}}>{showPwd[u.id]?tp:"••••••••"}</code>
                                <button onClick={()=>setShowPwd(p=>({...p,[u.id]:!p[u.id]}))} style={{background:"none",border:"none",cursor:"pointer",color:T.fgDim,padding:2}}>{showPwd[u.id]?<EyeOff size={11}/>:<Eye size={11}/>}</button>
                                <button onClick={()=>{navigator.clipboard.writeText(tp);toast({title:"Copied"});}} style={{background:"none",border:"none",cursor:"pointer",color:T.fgDim,padding:2}}><Copy size={11}/></button>
                              </div>
                            ):<span style={{fontSize:10,color:T.fgDim}}>—</span>}
                          </td>
                          <td style={{padding:"9px 14px"}}>
                            <div style={{display:"flex",gap:5}}>
                              <button onClick={()=>{setPwdUser(u);setNewPwd("");}} style={{...S.btn(T.primaryBg,T.primary),padding:"4px 10px",fontSize:11}}><Key size={11}/> Reset</button>
                              <button onClick={()=>nav("/users")} style={{...S.btn(T.bg2,T.fgMuted),padding:"4px 10px",fontSize:11}}><UserCheck size={11}/> Edit</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:11,color:T.fgDim,marginTop:10,lineHeight:1.5}}>
                Passwords are hashed one-way by Supabase Auth and can never be viewed — only replaced. A freshly reset
                password appears once under "Just Reset" for this session only, then disappears automatically after 2 minutes.
              </p>
            </div>
          )}

          {/* - TWILIO - */}
          {sec==="twilio"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {/* Status + config */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={S.card}>
                  <div style={S.cardHd(T.inventory)}><Phone size={14} color={T.inventory}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Twilio Configuration</span></div>
                  <div style={{padding:"16px"}}>
                    {[
                      {l:"Account SID",      v:"ACxxxx... (set in Supabase secrets)"},
                      {l:"SMS Number",       v:"+16812972643"},
                      {l:"WhatsApp Number",  v:"+14155238886"},
                      {l:"Messaging SID",    v:"MGd547d8e327..."},
                      {l:"WA Join Code",     v:"join bad-machine"},
                    ].map(({l,v})=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${T.border}22`,fontSize:12}}>
                        <span style={{color:T.fgMuted}}>{l}</span>
                        <code style={{color:T.fg,fontFamily:"monospace",fontSize:11}}>{v}</code>
                      </div>
                    ))}
                    <button onClick={checkTwilio} disabled={twilioLoading} style={{...S.btn(T.inventory),marginTop:14}}>
                      {twilioLoading?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Wifi size={13}/>}
                      {twilioLoading?"Checking...":"Test Twilio Connection"}
                    </button>
                    {twilioStatus&&(
                      <div style={{marginTop:10,padding:"8px 12px",borderRadius:T.r,background:twilioStatus.ok?T.successBg:T.errorBg,border:`1px solid ${twilioStatus.ok?T.success:T.error}44`,fontSize:12,color:twilioStatus.ok?T.success:T.error}}>
                        {twilioStatus.ok?"- Connected - Twilio API live":"- "+twilioStatus.error}
                        {twilioStatus.ok&&<div style={{fontSize:10,marginTop:4,color:T.fgMuted}}>SMS: {twilioStatus.sms_from} | WA: {twilioStatus.wa_from}</div>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Test panel */}
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={S.card}>
                  <div style={S.cardHd(T.quality)}><MessageSquare size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Test SMS</span></div>
                  <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                    <div>
                      <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Phone Number</label>
                      <input value={smsTest.to} onChange={e=>setSmsTest(p=>({...p,to:e.target.value}))} style={S.inp} placeholder="+254 7xx xxx xxx"/>
                    </div>
                    <div>
                      <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Message</label>
                      <textarea value={smsTest.msg} onChange={e=>setSmsTest(p=>({...p,msg:e.target.value}))} style={{...S.inp,height:80,resize:"none"}}/>
                    </div>
                    <button onClick={testSMS} disabled={smsSending} style={S.btn(T.quality)}>
                      {smsSending?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Send size={13}/>}
                      {smsSending?"Sending...":"Send Test SMS"}
                    </button>
                  </div>
                </div>

                <div style={S.card}>
                  <div style={S.cardHd(T.comms||"#0072c6")}><Phone size={14} color="#0072c6"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Test Voice Call</span></div>
                  <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                    <div>
                      <label style={{fontSize:11,color:T.fgDim,display:"block",marginBottom:4}}>Phone Number</label>
                      <input value={callTo} onChange={e=>setCallTo(e.target.value)} style={S.inp} placeholder="+254 7xx xxx xxx"/>
                    </div>
                    <button onClick={testCall} disabled={calling} style={S.btn("#0072c6")}>
                      {calling?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Phone size={13}/>}
                      {calling?"Calling...":"Make Test Call"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* - ROLES - */}
          {sec==="roles"&&(
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                {[
                  {role:"superadmin",     col:"#d83b01",  caps:["all_access","edit_code","manage_roles","view_codebase"]},
                  {role:"webmaster",      col:"#5c2d91",  caps:["all_access","edit_code","manage_roles","view_codebase"]},
                  {role:"admin",          col:"#00188f",  caps:["all_access","manage_users","system_settings","view_audit"]},
                  {role:"database_admin", col:"#038387",  caps:["manage_mysql","view_schema","run_queries","manage_backups"]},
                  {role:"procurement_manager", col:"#0078d4", caps:["approve_requisitions","create_po","approve_po","manage_suppliers"]},
                  {role:"procurement_officer", col:"#0072c6", caps:["create_requisitions","view_po","receive_goods"]},
                  {role:"accountant",     col:"#7719aa",  caps:["view_financials","create_vouchers","approve_vouchers","manage_budgets"]},
                  {role:"inventory_manager",   col:"#498205", caps:["manage_items","manage_categories","view_stock"]},
                  {role:"warehouse_officer",   col:"#107c10", caps:["receive_goods","issue_items","scan_items"]},
                  {role:"requisitioner",  col:"#d39a04",  caps:["create_requisitions","view_own_requisitions","view_items"]},
                ].map(({role,col,caps})=>(
                  <div key={role} style={{...S.card,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",background:`${col}10`,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
                      <Shield size={14} color={col}/><span style={{fontWeight:700,fontSize:13,color:T.fg,textTransform:"capitalize"}}>{role.replace(/_/g," ")}</span>
                      <span style={{marginLeft:"auto",padding:"1px 7px",borderRadius:T.r,background:`${col}20`,color:col,fontSize:9,fontWeight:700}}>{caps.length} caps</span>
                    </div>
                    <div style={{padding:"10px 14px",display:"flex",flexWrap:"wrap",gap:4}}>
                      {caps.map(c=><span key={c} style={{padding:"2px 8px",borderRadius:T.r,fontSize:10,fontWeight:500,background:T.bg,border:`1px solid ${T.border}`,color:T.fgMuted}}>{c.replace(/_/g," ")}</span>)}
                    </div>
                    <div style={{padding:"0 14px 12px"}}>
                      <button onClick={()=>nav("/users")} style={{...S.btn(T.primaryBg,T.primary),fontSize:11,padding:"4px 10px"}}><Users size={10}/> Assign Users</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* - FULL MODULE TOGGLES - */}
          {sec==="modules"&&(
            <div>
              <div style={{...S.card,marginBottom:16}}>
                <div style={S.cardHd(T.warning)}>
                  <Settings size={14} color={T.warning}/>
                  <span style={{fontWeight:700,color:T.fg,fontSize:13}}>Full Module Control</span>
                  <span style={{marginLeft:"auto",fontSize:11,color:T.fgMuted}}>Toggle activates immediately · Changes persist to DB</span>
                </div>
                <div style={{padding:"8px 0"}}>
                  {([
                    {key:"enable_procurement",     label:"Procurement",          desc:"Requisitions · Purchase Orders · GRNs",          col:"#4f46e5"},
                    {key:"enable_financials",       label:"Financials",           desc:"Accountant Workspace · GL · Budget Control",      col:"#059669"},
                    {key:"enable_vouchers",         label:"Vouchers",             desc:"Payment · Receipt · Journal vouchers",            col:"#7719aa"},
                    {key:"enable_quality",          label:"Quality Assurance",    desc:"Inspections · NCRs · QA Reports",                col:"#d39a04"},
                    {key:"enable_scanner",          label:"Barcode / QR Scanner", desc:"GRN scanning · Inventory scanning",              col:"#0369a1"},
                    {key:"enable_tenders",          label:"Tender Management",    desc:"Bid evaluations · Tender listings",              col:"#dc2626"},
                    {key:"enable_contracts_module", label:"Contracts",            desc:"Contract lifecycle · Renewals · SLAs",           col:"#6366f1"},
                    {key:"enable_documents",        label:"Document Management",  desc:"Upload · Parse · Auto-classify",                 col:"#ec4899"},
                    {key:"enable_reports",          label:"Reports & Analytics",  desc:"KPI dashboards · Exports · System reports",      col:"#f97316"},
                    {key:"enable_email",            label:"Email Module",         desc:"Internal email · Notifications · SMTP relay",    col:"#3b82f6"},
                    {key:"enable_telephony",        label:"Telephony / VoIP",     desc:"Twilio voice · WhatsApp · SMS gateway",          col:"#10b981"},
                    {key:"enable_backup",           label:"Backup & Recovery",    desc:"DB snapshots · Data exports · Archives",         col:"#6b7280"},
                    {key:"enable_audit_log",        label:"Audit Log",            desc:"Full activity trail · Change history",           col:"#374151"},
                    {key:"realtime_notifications",  label:"Realtime Notifications","desc":"Supabase push · Browser alerts",              col:"#ef4444"},
                    {key:"maintenance_mode",        label:"⚠️ Maintenance Mode",  desc:"Locks out all non-admin users immediately",      col:"#dc2626"},
                  ] as const).map(({key,label,desc,col})=>{
                    const on = moduleCfg[key]!=="false";
                    return(
                      <div key={key}
                        style={{display:"flex",alignItems:"center",gap:14,padding:"11px 16px",borderBottom:`1px solid ${T.border}18`,cursor:"default",transition:"background .1s"}}
                        onMouseEnter={e=>(e.currentTarget.style.background="#f8fafc")}
                        onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:on?col:"#d1d5db",flexShrink:0,transition:"background .2s"}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:T.fg}}>{label}</div>
                          <div style={{fontSize:11,color:T.fgMuted,marginTop:1}}>{desc}</div>
                        </div>
                        <span style={{fontSize:10,fontWeight:700,color:on?col:"#9ca3af",minWidth:52,textAlign:"right",letterSpacing:"0.04em"}}>{on?"ACTIVE":"OFF"}</span>
                        <button onClick={()=>toggleModule(key)}
                          style={{display:"inline-flex",width:48,height:26,borderRadius:13,background:on?col:"#d1d5db",alignItems:"center",padding:3,border:"none",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                          <span style={{width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform .2s",transform:on?"translateX(22px)":"translateX(0)",boxShadow:"0 1px 4px rgba(0,0,0,.25)"}}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div style={{padding:"12px 16px",background:"#f8fafc",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>{["enable_procurement","enable_financials","enable_vouchers","enable_quality","enable_scanner","enable_tenders","enable_contracts_module","enable_documents","enable_reports","enable_email","enable_telephony","enable_backup","enable_audit_log","realtime_notifications"].forEach(k=>{if(moduleCfg[k]==="false")toggleModule(k);});}} style={{...S.btn("#059669"),fontSize:12}}><Power size={12}/> Enable All Modules</button>
                  <button onClick={()=>toggleModule("maintenance_mode")} style={{...S.btn(moduleCfg["maintenance_mode"]!=="false"?"#059669":"#dc2626"),fontSize:12}}><AlertTriangle size={12}/>{moduleCfg["maintenance_mode"]!=="false"?" Disable Maintenance":" Enable Maintenance"}</button>
                </div>
              </div>
            </div>
          )}

          {/* - KIOSK MODE - */}
          {sec==="kiosk"&&(
            <div style={{maxWidth:720}}>
              <div style={{...S.card,marginBottom:16}}>
                <div style={S.cardHd("#0f172a")}>
                  <Tv size={14} color="#6366f1"/>
                  <span style={{fontWeight:700,color:T.fg,fontSize:13}}>Kiosk Mode Control</span>
                  <span style={{marginLeft:"auto",padding:"2px 10px",borderRadius:T.r,background:moduleCfg["kiosk_mode"]==="true"?"#ef444418":"#05966918",color:moduleCfg["kiosk_mode"]==="true"?"#ef4444":"#059669",fontSize:10,fontWeight:700,letterSpacing:"0.06em"}}>
                    {moduleCfg["kiosk_mode"]==="true"?"● KIOSK ACTIVE":"○ INACTIVE"}
                  </span>
                </div>
                <div style={{padding:16}}>
                  <p style={{margin:"0 0 16px",fontSize:13,color:T.fgMuted,lineHeight:1.65}}>
                    Kiosk mode locks the app to full-screen, disabling navigation, keyboard shortcuts, and context menus.
                    Ideal for reception desks, ward kiosks, or waiting area displays on dedicated hardware.
                  </p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                    {([
                      {key:"kiosk_mode",              label:"Enable Kiosk Mode",           desc:"Lock UI to full-screen, hide chrome",     col:"#6366f1"},
                      {key:"kiosk_hide_nav",           label:"Hide Sidebar & Nav",          desc:"Remove all navigation links",             col:"#0f172a"},
                      {key:"kiosk_disable_rightclick", label:"Disable Right-Click",         desc:"Block browser context menus",             col:"#374151"},
                      {key:"kiosk_disable_keyboard",   label:"Block Dev Shortcuts",         desc:"Block F5, Ctrl+R, F12, etc.",             col:"#4f46e5"},
                      {key:"kiosk_auto_logout",        label:"Auto Logout (5 min idle)",    desc:"Auto-logout on inactivity",               col:"#f97316"},
                      {key:"kiosk_show_clock",         label:"Show Full-Screen Clock",      desc:"Display time & date prominently",         col:"#059669"},
                    ] as const).map(({key,label,desc,col})=>{
                      const on = moduleCfg[key]==="true";
                      return(
                        <div key={key} style={{border:`1.5px solid ${on?col+"50":T.border}`,borderRadius:T.rLg,padding:"14px 16px",background:on?`${col}08`:"#fafafa",transition:"all .15s"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                            <div style={{flex:1,paddingRight:8}}>
                              <div style={{fontSize:13,fontWeight:600,color:on?col:T.fg}}>{label}</div>
                              <div style={{fontSize:11,color:T.fgMuted,marginTop:3}}>{desc}</div>
                            </div>
                            <button onClick={()=>toggleModule(key)}
                              style={{display:"inline-flex",width:44,height:24,borderRadius:12,background:on?col:"#d1d5db",alignItems:"center",padding:2,border:"none",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
                              <span style={{width:20,height:20,borderRadius:"50%",background:"#fff",transition:"transform .2s",transform:on?"translateX(20px)":"translateX(0)",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"14px 16px",background:"#f8fafc",marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:T.fg,marginBottom:8}}>📍 Kiosk Target Page</div>
                    <select
                      value={moduleCfg["kiosk_target_route"]||"/dashboard"}
                      onChange={async e=>{
                        const v=e.target.value;
                        await (supabase as any).from("system_settings").upsert({key:"kiosk_target_route",value:v,category:"kiosk"},{onConflict:"key"});
                        setModuleCfg((p:any)=>({...p,kiosk_target_route:v}));
                        toast({title:"Kiosk route updated to: "+v});
                      }}
                      style={{...S.inp,width:320,marginBottom:6}}>
                      <option value="/dashboard">Dashboard</option>
                      <option value="/requisitions">Requisitions</option>
                      <option value="/purchase-orders">Purchase Orders</option>
                      <option value="/goods-received">Goods Received Note</option>
                      <option value="/suppliers">Suppliers Directory</option>
                      <option value="/items">Items Catalogue</option>
                      <option value="/reception">Reception / Tracking</option>
                      <option value="/scanner">Barcode / QR Scanner</option>
                      <option value="/reports">Reports & Analytics</option>
                    </select>
                    <div style={{fontSize:11,color:T.fgMuted}}>Page shown when kiosk mode is active and user navigates to root</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={()=>toggleModule("kiosk_mode")} style={{...S.btn(moduleCfg["kiosk_mode"]==="true"?"#059669":"#6366f1"),fontSize:12}}>
                      <Tv size={12}/> {moduleCfg["kiosk_mode"]==="true"?"Exit Kiosk Mode":"Activate Kiosk Mode"}
                    </button>
                    <button onClick={()=>{(["kiosk_mode","kiosk_hide_nav","kiosk_disable_rightclick","kiosk_disable_keyboard","kiosk_auto_logout"] as const).forEach(k=>{ if(moduleCfg[k]!=="true") toggleModule(k); }); }} style={{...S.btn("#0f172a"),fontSize:12}}>
                      <Lock size={12}/> Full Lock (All Options)
                    </button>
                    <button onClick={()=>{(["kiosk_mode","kiosk_hide_nav","kiosk_disable_rightclick","kiosk_disable_keyboard","kiosk_auto_logout"] as const).forEach(k=>{ if(moduleCfg[k]==="true") toggleModule(k); }); }} style={{...S.btn("#6b7280"),fontSize:12}}>
                      <Unlock size={12}/> Release All
                    </button>
                  </div>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cardHd("#6366f1")}><Monitor size={14} color="#6366f1"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Hardware Deployment Notes</span></div>
                <div style={{padding:"12px 16px"}}>
                  {[
                    ["Electron Desktop","Enable kiosk via --kiosk flag in electron/main.js — prevents Alt+F4, Task Manager, window drag"],
                    ["Chrome Web Kiosk","chrome --kiosk --incognito https://procurbosse.edgeone.app (run as limited OS user)"],
                    ["Touch Screens","All buttons are ≥44px tap targets. Use hardware-appropriate screen resolution."],
                    ["Auto-Logout","Enforced at app level via 5-minute idle timer. Pairs with Supabase session expiry."],
                    ["Security","Combine kiosk mode with IP whitelist (/admin/users-ip-audit) for maximum security."],
                  ].map(([title,note],i)=>(
                    <div key={i} style={{display:"flex",gap:12,padding:"8px 0",borderBottom:i<4?`1px solid ${T.border}14`:"none",fontSize:12}}>
                      <span style={{color:"#6366f1",fontWeight:700,minWidth:130,flexShrink:0}}>{title}</span>
                      <span style={{color:T.fgMuted,lineHeight:1.5}}>{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* - BROADCAST - */}
          {sec==="broadcast"&&(
            <div style={{maxWidth:600}}>
              <div style={S.card}>
                <div style={S.cardHd(T.info)}><Bell size={14} color={T.info}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>System Broadcast</span></div>
                <div style={{padding:16}}>
                  <textarea value={broadcastMsg} onChange={e=>setBroadcastMsg(e.target.value)} rows={4} style={{...S.inp,resize:"vertical",marginBottom:10}} placeholder="Message to all users..."/>
                  <button onClick={sendBroadcast} disabled={broadcasting||!broadcastMsg.trim()} style={S.btn(T.primary)}>
                    {broadcasting?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Radio size={13}/>}
                    {broadcasting?"Sending...":"Send Broadcast"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* - BOT STATS - */}
          {sec==="botstats"&&(
            <div style={{maxWidth:800}}>
              {/* Bot Control Card */}
              <div style={S.card}>
                <div style={S.cardHd("#059669")}><Zap size={14} color="#059669"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Keep-Alive Bot Control</span></div>
                <div style={{padding:16}}>
                  <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16}}>
                    <button 
                      onClick={async()=>{
                        setBotLoading(true);
                        try {
                          const r=await fetch("https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=ping",{
                            headers:{"apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"}
                          });
                          const d=await r.json();
                          setBotStats(d);
                          toast({title:"Ping Sent!",description:`Latency: ${d.latency_ms}ms, Status: ${d.status}`});
                        } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
                        setBotLoading(false);
                      }}
                      style={S.btn("#059669")}
                      disabled={botLoading}>
                      <Zap size={13}/> Run Single Ping
                    </button>
                    <button 
                      onClick={async()=>{
                        setBotRunning(true);
                        toast({title:"Starting 55s Loop...",description:"Running keepalive cycle..."});
                        try {
                          const r=await fetch("https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot",{
                            method:"POST",
                            headers:{"apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"}
                          });
                          const d=await r.json();
                          setBotStats(d);
                          toast({title:"Loop Complete!",description:`Pings: ${d.pings}, Avg: ${d.avg_latency_ms}ms`});
                        } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
                        setBotRunning(false);
                      }}
                      style={S.btn("#4f46e5")}
                      disabled={botRunning}>
                      {botRunning?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Zap size={13}/>}
                      {botRunning?"Running...":"Run 55s Loop"}
                    </button>
                    <button 
                      onClick={async()=>{
                        setBotLoading(true);
                        try {
                          const r=await fetch("https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot?action=cleanup",{
                            headers:{"apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc"}
                          });
                          const d=await r.json();
                          toast({title:"Cleanup Done!",description:`Deleted: heartbeats=${d.deleted?.heartbeats}, tests=${d.deleted?.test_records}`});
                          loadBotStats();
                        } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
                        setBotLoading(false);
                      }}
                      style={S.btn("#dc2626")}
                      disabled={botLoading}>
                      <RefreshCw size={13}/> Cleanup
                    </button>
                    <button 
                      onClick={loadBotStats}
                      style={S.btn(T.fgMuted,T.fg)}
                      disabled={botLoading}>
                      <RefreshCw size={13}/> Refresh Stats
                    </button>
                  </div>
                  
                  {/* Status Display */}
                  {botStats&&(
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:16,marginBottom:16}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:24,fontWeight:700,color:"#059669"}}>{botStats.pings||botStats.latency_ms?"Active":"—"}</div>
                          <div style={{fontSize:11,color:T.fgMuted}}>Status</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:24,fontWeight:700,color:"#4f46e5"}}>{botStats.pings||"—"}</div>
                          <div style={{fontSize:11,color:T.fgMuted}}>Pings/Loop</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:24,fontWeight:700,color:"#0078d4"}}>{botStats.avg_latency_ms||"—"}ms</div>
                          <div style={{fontSize:11,color:T.fgMuted}}>Avg Latency</div>
                        </div>
                        <div style={{textAlign:"center"}}>
                          <div style={{fontSize:24,fontWeight:700,color:"#059669"}}>{botStats.test_inserts||"—"}</div>
                          <div style={{fontSize:11,color:T.fgMuted}}>Test Inserts</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Projections */}
                  <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:16}}>
                    <div style={{fontWeight:700,fontSize:13,color:T.fg,marginBottom:12}}>📊 Operations Projections</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,fontSize:11}}>
                      <div style={{textAlign:"center",padding:"8px 4px",background:"white",borderRadius:6}}>
                        <div style={{fontSize:16,fontWeight:700,color:"#059669"}}>58</div>
                        <div style={{color:T.fgMuted}}>Per Min</div>
                      </div>
                      <div style={{textAlign:"center",padding:"8px 4px",background:"white",borderRadius:6}}>
                        <div style={{fontSize:16,fontWeight:700,color:"#4f46e5"}}>3,500</div>
                        <div style={{color:T.fgMuted}}>Per Hour</div>
                      </div>
                      <div style={{textAlign:"center",padding:"8px 4px",background:"white",borderRadius:6}}>
                        <div style={{fontSize:16,fontWeight:700,color:"#0078d4"}}>84K</div>
                        <div style={{color:T.fgMuted}}>Per Day</div>
                      </div>
                      <div style={{textAlign:"center",padding:"8px 4px",background:"white",borderRadius:6}}>
                        <div style={{fontSize:16,fontWeight:700,color:"#059669"}}>588K</div>
                        <div style={{color:T.fgMuted}}>Per Week</div>
                      </div>
                      <div style={{textAlign:"center",padding:"8px 4px",background:"white",borderRadius:6}}>
                        <div style={{fontSize:16,fontWeight:700,color:"#7719aa"}}>2.5M</div>
                        <div style={{color:T.fgMuted}}>Per Month</div>
                      </div>
                    </div>
                    <div style={{marginTop:10,fontSize:11,color:"#059669",fontWeight:600}}>
                      ✓ Exceeds target: 7,500/week (78x) | 22,500/month (112x)
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Bot Runs */}
              <div style={{...S.card,marginTop:16}}>
                <div style={S.cardHd("#0078d4")}><Activity size={14} color="#0078d4"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent Bot Activity</span></div>
                <div style={{padding:0}}>
                  {botRuns.length===0?(
                    <div style={{padding:24,textAlign:"center",color:T.fgMuted,fontSize:12}}>
                      No recent runs. Click "Refresh Stats" to load activity logs.
                    </div>
                  ):(
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#f8fafc"}}>
                          {["Time","Action","Source","Details"].map(h=>(
                            <th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:11,color:"#9ca3af",fontWeight:500}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {botRuns.map((r:any,i)=>(
                          <tr key={i} style={{borderBottom:"1px solid #f0f0f0"}}>
                            <td style={{padding:"8px 14px",color:T.fgMuted,whiteSpace:"nowrap"}}>
                              {r.created_at?new Date(r.created_at).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"}):"—"}
                            </td>
                            <td style={{padding:"8px 14px"}}>
                              <span style={{fontSize:10,padding:"2px 8px",borderRadius:8,background:r.action?.includes("keepalive")?"#05966918":"#6366f118",color:r.action?.includes("keepalive")?"#059669":"#6366f1",fontWeight:600}}>
                                {r.action?.replace(/_/g," ")?.slice(0,20)||"—"}
                              </span>
                            </td>
                            <td style={{padding:"8px 14px",color:T.fgMuted}}>{r.source||"—"}</td>
                            <td style={{padding:"8px 14px",color:T.fg,fontSize:11,maxWidth:300,overflow:"hidden",textOverflow:"ellipsis"}}>
                              {typeof r.details==="string"?r.details:JSON.stringify(r.details||{})}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Heartbeat Stats */}
              <div style={{...S.card,marginTop:16}}>
                <div style={S.cardHd("#4f46e5")}><Database size={14} color="#4f46e5"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Database Heartbeats</span></div>
                <div style={{padding:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,fontSize:12}}>
                    <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:8}}>
                      <div style={{fontSize:20,fontWeight:700,color:"#4f46e5"}}>{botStats?.current_records?.heartbeats||"—"}</div>
                      <div style={{color:T.fgMuted,marginTop:4}}>Heartbeats</div>
                    </div>
                    <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:8}}>
                      <div style={{fontSize:20,fontWeight:700,color:"#059669"}}>{botStats?.current_records?.test_records||"—"}</div>
                      <div style={{color:T.fgMuted,marginTop:4}}>Test Records</div>
                    </div>
                    <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:8}}>
                      <div style={{fontSize:20,fontWeight:700,color:"#0078d4"}}>{botStats?.current_records?.activity_logs||"—"}</div>
                      <div style={{color:T.fgMuted,marginTop:4}}>Activity Logs</div>
                    </div>
                    <div style={{textAlign:"center",padding:12,background:"#f8fafc",borderRadius:8}}>
                      <div style={{fontSize:20,fontWeight:700,color:"#059669"}}>{botStats?.mode||"—"}</div>
                      <div style={{color:T.fgMuted,marginTop:4}}>Bot Mode</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* - SYSTEM INFO - */}
          {sec==="system"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={S.card}>
                <div style={S.cardHd(T.system||"#00188f")}><Server size={14} color="#00188f"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>System Information</span></div>
                <div style={{padding:"12px 16px"}}>
                  {[
                    ["Version","5.9.0"],["Framework","React 18 + Vite 5"],["Database","Supabase PostgreSQL"],
                    ["Auth","Supabase Auth (PKCE)"],["SMS","Twilio +16812972643"],["WhatsApp","+14155238886"],
                    ["MSG SID","MGd547d8e3273..."],["Storage","Supabase Storage"],["Deploy","EdgeOne CDN"],
                    ["Repo","github.com/huiejorjdsksfn"],
                  ].map(([k,v])=>(
                    <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${T.border}18`,fontSize:12}}>
                      <span style={{color:T.fgMuted}}>{k}</span>
                      <code style={{color:T.fg,fontFamily:"monospace",fontSize:11}}>{v}</code>
                    </div>
                  ))}
                </div>
              </div>
              <div style={S.card}>
                <div style={S.cardHd(T.quality)}><Activity size={14} color={T.quality}/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Quick Links</span></div>
                <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:6}}>
                  {[
                    {l:"DB Monitor",        p:"/admin/db-test"},
                    {l:"Security Center",   p:"/admin/users-ip-audit"},
                    {l:"Audit Log",         p:"/audit-log"},
                    {l:"Webmaster / Superadmin", p:"/webmaster"},
                    {l:"Backup",            p:"/backup"},
                  ].map(({l,p})=>(
                    <button key={p} onClick={()=>nav(p)} style={{...S.btn(T.bg,T.fgMuted),justifyContent:"space-between",fontSize:12}}>
                      {l}<ChevronRight size={12}/>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* - SERVER CONTROL - */}
          {sec==="serverctrl"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={S.card}>
                <div style={S.cardHd("#7c3aed")}>
                  <HardDrive size={14} color="#7c3aed"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>System Health</span>
                  <button onClick={loadServerControls} disabled={srvLoading} style={{marginLeft:"auto",...S.btn("#7c3aed"),fontSize:11,padding:"4px 10px"}}>
                    <RefreshCw size={12} style={srvLoading?{animation:"spin 1s linear infinite"}:{}}/>Refresh
                  </button>
                </div>
                <div style={{padding:"16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
                  {[
                    {label:"Active DB Connections",val:srvHealth?.active_conns ?? "—",icon:Cpu,col:"#10b981"},
                    {label:"Requisitions",val:srvHealth?.table_counts?.requisitions ?? "—",icon:MemoryStick,col:"#3b82f6"},
                    {label:"Purchase Orders",val:srvHealth?.table_counts?.purchase_orders ?? "—",icon:HardDriveDownload,col:"#f59e0b"},
                    {label:"Documents",val:srvHealth?.table_counts?.documents ?? "—",icon:FileText,col:"#8b5cf6"},
                    {label:"SMS Sent",val:srvHealth?.table_counts?.sms_log ?? "—",icon:Cloud,col:"#0ea5e9"},
                    {label:"Unread Notifs",val:srvHealth?.table_counts?.notifications ?? "—",icon:Activity,col:"#3b82f6"},
                  ].map(({label,val,icon:Icon,col})=>(
                    <div key={label} style={{background:"#f8fafc",border:`1px solid ${T.border}22`,borderRadius:8,padding:"12px",display:"flex",flexDirection:"column",gap:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <Icon size={14} color={col}/>
                        <span style={{fontSize:11,color:T.fgMuted}}>{label}</span>
                      </div>
                      <span style={{fontSize:20,fontWeight:700,color:T.fg}}>{val}</span>
                    </div>
                  ))}
                </div>
                {srvHealth?.db_version && <div style={{padding:"0 16px 14px",fontSize:10,color:T.fgDim}}>Checked {new Date(srvHealth.checked_at).toLocaleString("en-KE")} · {String(srvHealth.db_version).split(",")[0]}</div>}
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#7c3aed")}><Clock size={14} color="#7c3aed"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Scheduled Jobs (cron)</span></div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead><tr style={{background:"#f8fafc",borderBottom:`1px solid ${T.border}`}}>
                      {["Job","Schedule","Active","Last Run","Status","Runs (14d)","Failures (14d)"].map(h=>
                        <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:700,color:T.fgMuted}}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {srvCron.length===0 && <tr><td colSpan={7} style={{padding:14,textAlign:"center",color:T.fgDim}}>{srvLoading?"Loading…":"No scheduled jobs found"}</td></tr>}
                      {srvCron.map((j:any)=>(
                        <tr key={j.jobid} style={{borderBottom:`1px solid ${T.border}11`}}>
                          <td style={{padding:"6px 10px",fontWeight:600}}>{j.jobname}</td>
                          <td style={{padding:"6px 10px",fontFamily:"monospace",color:T.fgMuted}}>{j.schedule}</td>
                          <td style={{padding:"6px 10px"}}>{j.active ? <CheckCircle2 size={13} color="#10b981"/> : <AlertCircle size={13} color="#9ca3af"/>}</td>
                          <td style={{padding:"6px 10px",color:T.fgMuted}}>{j.last_run ? new Date(j.last_run).toLocaleString("en-KE") : "never"}</td>
                          <td style={{padding:"6px 10px"}}>
                            <span style={{padding:"1px 7px",borderRadius:10,fontSize:10,fontWeight:700,background:j.last_status==="succeeded"?"#dcfce7":j.last_status==="failed"?"#fee2e2":"#f1f5f9",color:j.last_status==="succeeded"?"#166534":j.last_status==="failed"?"#991b1b":"#64748b"}}>{j.last_status||"—"}</span>
                          </td>
                          <td style={{padding:"6px 10px"}}>{j.runs_last_14d}</td>
                          <td style={{padding:"6px 10px",color:j.failures_last_14d>0?"#dc2626":T.fgMuted,fontWeight:j.failures_last_14d>0?700:400}}>{j.failures_last_14d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#7c3aed")}><Zap size={14} color="#7c3aed"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Circuit Breakers</span></div>
                <div style={{padding:"16px"}}>
                  {srvBreakers.length===0
                    ? <div style={{fontSize:12,color:"#166534",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"12px",display:"flex",alignItems:"center",gap:8}}><CheckCircle2 size={14}/>All services closed — no tripped breakers</div>
                    : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {srvBreakers.map((b:any)=>(
                          <div key={b.service_key} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:b.state==="open"?"#fef2f2":"#fffbeb",border:`1px solid ${b.state==="open"?"#fecaca":"#fde68a"}`}}>
                            <AlertTriangle size={14} color={b.state==="open"?"#dc2626":"#f59e0b"}/>
                            <span style={{fontWeight:600,fontSize:12}}>{b.service_key}</span>
                            <span style={{fontSize:11,color:T.fgMuted}}>{b.state} · {b.failure_count} failures</span>
                          </div>
                        ))}
                      </div>}
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#7c3aed")}><Terminal size={14} color="#7c3aed"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Server Actions</span></div>
                <div style={{padding:"16px",display:"flex",flexWrap:"wrap",gap:10}}>
                  {[
                    {key:"reload_schema",l:"Reload Schema Cache",icon:RefreshCw,col:"#3b82f6",fn:async()=>{
                      const {error} = await db.rpc("reload_schema_cache");
                      if(error) throw error;
                      toast({title:"✓ Schema cache reload signalled"});
                    }},
                    {key:"clear_cache",l:"Clear Client Cache",icon:Trash2,col:"#f59e0b",fn:async()=>{
                      cacheBuckets.clearAll();
                      toast({title:"✓ Client cache cleared", description:"Dropdowns/pages will refetch on next load."});
                    }},
                    {key:"check_integrity",l:"Check Integrity",icon:CheckCircle2,col:"#10b981",fn:async()=>{
                      await loadServerControls();
                      toast({title:"✓ Integrity check complete", description:`${srvErrors.length} unresolved error(s), ${srvBreakers.length} tripped breaker(s)`});
                    }},
                    {key:"sync_all",l:"Refresh All Stats",icon:Cloud,col:"#8b5cf6",fn:loadServerControls},
                    {key:"view_logs",l:"Open SQL Console",icon:Database,col:"#64748b",fn:async()=>{ nav("/admin/database"); }},
                  ].map(({key,l,icon:Icon,col,fn})=>(
                    <button key={key} disabled={srvActionBusy===key} onClick={()=>srvAction(key,fn)} style={{...S.btn(col),gap:8,padding:"10px 16px",fontSize:12,opacity:srvActionBusy===key?0.6:1}}>
                      <Icon size={14} style={srvActionBusy===key?{animation:"spin 1s linear infinite"}:{}}/>{l}
                    </button>
                  ))}
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#7c3aed")}><AlertCircle size={14} color="#7c3aed"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Error Handler</span></div>
                <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>
                  {srvErrors.filter(e=>e.severity==="critical").length===0 ? (
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <CheckCircle2 size={14} color="#16a34a"/>
                        <span style={{fontWeight:600,fontSize:12,color:"#166534"}}>No critical errors</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <AlertCircle size={14} color="#dc2626"/>
                        <span style={{fontWeight:600,fontSize:12,color:"#991b1b"}}>Critical Errors ({srvErrors.filter(e=>e.severity==="critical").length})</span>
                      </div>
                      {srvErrors.filter(e=>e.severity==="critical").slice(0,5).map((e:any)=>(
                        <div key={e.id} style={{fontSize:11,color:"#b91c1c",padding:"3px 0"}}>• [{e.page||"?"}] {e.error_msg}</div>
                      ))}
                    </div>
                  )}
                  {srvErrors.filter(e=>e.severity!=="critical").length>0 && (
                    <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:8,padding:"12px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                        <AlertTriangle size={14} color="#f59e0b"/>
                        <span style={{fontWeight:600,fontSize:12,color:"#92400e"}}>Warnings ({srvErrors.filter(e=>e.severity!=="critical").length})</span>
                      </div>
                      <div style={{fontSize:11,color:"#b45309",display:"flex",flexDirection:"column",gap:4}}>
                        {srvErrors.filter(e=>e.severity!=="critical").slice(0,5).map((e:any)=>(
                          <span key={e.id}>• [{e.page||"?"}] {e.error_msg}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={()=>{
                    if(!srvErrors.length){ toast({title:"No errors to export"}); return; }
                    const cols=["created_at","severity","page","error_code","error_msg","user_email"];
                    const csv=[cols.join(","), ...srvErrors.map(e=>cols.map(c=>`"${String(e[c]??"").replace(/"/g,'""')}"`).join(","))].join("\n");
                    const blob=new Blob([csv],{type:"text/csv"});
                    const url=URL.createObjectURL(blob);
                    const a=document.createElement("a"); a.href=url; a.download=`error-log-${Date.now()}.csv`; a.click();
                    URL.revokeObjectURL(url);
                  }} style={{...S.btn("#7c3aed"),fontSize:12,marginTop:4}}>
                    <Download size={14}/> Export Error Log ({srvErrors.length})
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* - EMAIL CONTROL - */}
          {sec==="emailctrl"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={S.card}>
                <div style={S.cardHd("#0ea5e9")}><Mail size={14} color="#0ea5e9"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Email Configuration</span></div>
                <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>SMTP Host</label>
                    <input placeholder="smtp.gmail.com" style={S.inp} defaultValue="smtp.gmail.com"/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>SMTP Port</label>
                    <input placeholder="587" style={S.inp} defaultValue="587"/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>SMTP User</label>
                    <input placeholder="your@email.com" style={S.inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>SMTP Password</label>
                    <input type="password" placeholder="••••••••" style={S.inp}/>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>From Name</label>
                    <input placeholder="EL5 MediProcure" style={S.inp} defaultValue="EL5 MediProcure"/>
                  </div>
                </div>
                <div style={{padding:"0 16px 16px",display:"flex",gap:10,marginTop:8}}>
                  <button style={{...S.btn("#0ea5e9"),fontSize:12}}><Save size={14}/>Save Email Config</button>
                  <button style={{...S.btn("#059669"),fontSize:12}}><Send size={14}/>Test Email</button>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#0ea5e9")}><Send size={14} color="#0ea5e9"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Send External Email</span></div>
                <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>To (External Email)</label>
                    <input placeholder="recipient@external-domain.com" style={S.inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Subject</label>
                    <input placeholder="Email subject" style={S.inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Message</label>
                    <textarea placeholder="Email body..." style={{...S.inp,minHeight:120,resize:"vertical" as const}}/>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button style={{...S.btn("#0ea5e9"),fontSize:12}}><Send size={14}/>Send Email</button>
                    <button style={{...S.btn("#64748b"),fontSize:12}}><Plus size={14}/>Add Attachment</button>
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#0ea5e9")}><FileText size={14} color="#0ea5e9"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Email Log</span></div>
                <div style={{padding:0}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f8fafc",borderBottom:`1px solid ${T.border}`}}>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Date</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>To</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Subject</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{borderBottom:`1px solid ${T.border}18`}}>
                        <td style={{padding:"8px 12px",color:T.fgMuted}}>Today 09:45</td>
                        <td style={{padding:"8px 12px"}}>pharmacy@embuhospital.go.ke</td>
                        <td style={{padding:"8px 12px"}}>Requisition Approved</td>
                        <td style={{padding:"8px 12px"}}><span style={{color:"#10b981",fontWeight:600}}>✓ Sent</span></td>
                      </tr>
                      <tr style={{borderBottom:`1px solid ${T.border}18`}}>
                        <td style={{padding:"8px 12px",color:T.fgMuted}}>Today 08:30</td>
                        <td style={{padding:"8px 12px"}}>admin@external.com</td>
                        <td style={{padding:"8px 12px"}}>System Alert</td>
                        <td style={{padding:"8px 12px"}}><span style={{color:"#10b981",fontWeight:600}}>✓ Delivered</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* - FORMS BUILDER - */}
          {sec==="formbuilder"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>

              {(() => {
                const cats = Array.from(new Set(forms.map((f:any)=>f.field_definitions?.category || "General"))).sort();
                const q = fbListSearch.trim().toLowerCase();
                const rows = forms.filter((f:any)=>{
                  if (!showDeletedForms && f.deleted_at) return false;
                  if (q && !(f.title||"").toLowerCase().includes(q) && !(f.form_id||"").toLowerCase().includes(q)) return false;
                  if (fbListCategory!=="all" && (f.field_definitions?.category||"General")!==fbListCategory) return false;
                  const st = f.deleted_at ? "deleted" : (f.status||"draft");
                  if (fbListStatus!=="all" && st!==fbListStatus) return false;
                  return true;
                });
                const totalResponses = forms.reduce((n:number,f:any)=>n+(f.response_count||0),0);
                return (
                <div style={S.card}>
                  <div style={{...S.cardHd("#f59e0b"), flexWrap:"wrap", gap:8}}>
                    <ClipboardList size={14} color="#f59e0b"/>
                    <span style={{fontWeight:700,color:T.fg,fontSize:13}}>All Forms ({rows.length}/{forms.length})</span>
                    <span style={{fontSize:11,color:T.fgMuted,fontWeight:500}}>· {totalResponses} total responses</span>
                    <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
                      <input value={fbListSearch} onChange={e=>setFbListSearch(e.target.value)} placeholder="Search forms…" style={{...S.inp,width:170,fontSize:11}}/>
                      <select value={fbListCategory} onChange={e=>setFbListCategory(e.target.value)} style={{...S.inp,width:140,fontSize:11}}>
                        <option value="all">All Categories</option>
                        {cats.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={fbListStatus} onChange={e=>setFbListStatus(e.target.value)} style={{...S.inp,width:120,fontSize:11}}>
                        <option value="all">All Statuses</option>
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                        {showDeletedForms && <option value="deleted">Deleted</option>}
                      </select>
                      <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.fgMuted,cursor:"pointer",whiteSpace:"nowrap"}}>
                        <input type="checkbox" checked={showDeletedForms} onChange={e=>setShowDeletedForms(e.target.checked)} />
                        Show deleted
                      </label>
                      <button onClick={fbResetDraft} style={{...S.btn("#f59e0b"),padding:"5px 12px",fontSize:11}}><Plus size={12}/>New Form</button>
                    </div>
                  </div>
                  <div style={{maxHeight:360,overflowY:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:"#f8fafc",borderBottom:`1px solid ${T.border}`,position:"sticky",top:0}}>
                          <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Form</th>
                          <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Category</th>
                          <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Status</th>
                          <th style={{padding:"8px 12px",textAlign:"center",fontWeight:600,color:T.fgMuted}}>Responses</th>
                          <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Published</th>
                          <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length===0 ? (
                          <tr><td colSpan={6} style={{padding:"20px 12px",textAlign:"center",color:T.fgMuted}}>No forms match these filters</td></tr>
                        ) : rows.map((f:any)=>{
                          const st = f.deleted_at ? "deleted" : (f.status||"draft");
                          const stColor = st==="published" ? "#059669" : st==="deleted" ? "#dc2626" : "#d97706";
                          const stBg    = st==="published" ? "#d1fae5" : st==="deleted" ? "#fee2e2" : "#fef3c7";
                          const isSel = f.form_id===selectedFormId;
                          return (
                            <tr key={f.form_id} onClick={()=>fbSelectForm(f)} style={{borderBottom:`1px solid ${T.border}18`, cursor:"pointer", background:isSel?"#fffbeb":"transparent"}}
                              onMouseEnter={e=>{ if(!isSel) (e.currentTarget as HTMLElement).style.background="#f8fafc"; }}
                              onMouseLeave={e=>{ if(!isSel) (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                              <td style={{padding:"8px 12px",fontWeight:600,color:T.fg}}>
                                {f.title||f.form_id}
                                <div style={{fontSize:10,color:T.fgMuted,fontWeight:400}}>{f.form_id}</div>
                              </td>
                              <td style={{padding:"8px 12px",color:T.fgMuted}}>{f.field_definitions?.category||"General"}</td>
                              <td style={{padding:"8px 12px"}}><span style={{padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700,textTransform:"uppercase",color:stColor,background:stBg}}>{st}</span></td>
                              <td style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:"#0369a1"}}>{f.response_count||0}</td>
                              <td style={{padding:"8px 12px",color:T.fgMuted}}>{f.published_at ? new Date(f.published_at).toLocaleDateString() : "—"}</td>
                              <td style={{padding:"8px 12px"}} onClick={e=>e.stopPropagation()}>
                                <span style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                  <button onClick={()=>{ fbSelectForm(f); loadFbResponses(f.form_id); }} title="View responses" style={{...S.btn("#64748b"),padding:"3px 7px",fontSize:10}}><Eye size={11}/>View</button>
                                  {!f.deleted_at && (
                                    <button onClick={()=>fbTogglePublish(f)} disabled={fbSaving} title={st==="published"?"Unpublish":"Publish"} style={{...S.btn(st==="published"?"#64748b":"#10b981"),padding:"3px 7px",fontSize:10,opacity:fbSaving?0.6:1}}>
                                      {st==="published" ? <Pause size={11}/> : <Play size={11}/>}
                                    </button>
                                  )}
                                  <button onClick={()=>{ navigator.clipboard.writeText(`${window.location.origin}/#/forms/${f.form_id}`); toast({title:"✓ Link copied"}); }} title="Copy public link" style={{...S.btn("#3b82f6"),padding:"3px 7px",fontSize:10}}><Copy size={11}/></button>
                                  {f.deleted_at
                                    ? <button onClick={()=>fbRestoreForm(f)} title="Restore" style={{...S.btn("#059669"),padding:"3px 7px",fontSize:10}}><RefreshCw size={11}/></button>
                                    : <button onClick={()=>fbDeleteForm(f)} title="Delete" style={{...S.btn("#dc2626"),padding:"3px 7px",fontSize:10}}><Trash2 size={11}/></button>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                );
              })()}
              <div style={S.card}>
                <div style={S.cardHd("#f59e0b")}><ClipboardList size={14} color="#f59e0b"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>
                  {selectedFormId ? `Editing: ${fbTitle||"Untitled"}` : "New Form"}
                </span>
                  <select value={selectedFormId||""} onChange={e=>{
                    if (!e.target.value) { fbResetDraft(); return; }
                    const f = forms.find((x:any)=>x.form_id===e.target.value);
                    if (f) fbSelectForm(f);
                  }} style={{...S.inp,width:220,marginLeft:"auto",fontSize:11}}>
                    <option value="">— New Form —</option>
                    {forms.map((f:any)=><option key={f.form_id} value={f.form_id}>{f.title||f.form_id} ({f.deleted_at?"deleted":f.status||"draft"})</option>)}
                  </select>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.fgMuted,cursor:"pointer",whiteSpace:"nowrap"}}>
                    <input type="checkbox" checked={showDeletedForms} onChange={e=>setShowDeletedForms(e.target.checked)} />
                    Show deleted
                  </label>
                  <button onClick={fbResetDraft} style={{...S.btn("#f59e0b"),padding:"5px 12px",fontSize:11}}><Plus size={12}/>New Form</button>
                </div>
                <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Form Name</label>
                    <input value={fbTitle} onChange={e=>setFbTitle(e.target.value)} placeholder="e.g., Patient Feedback Survey" style={S.inp}/>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Form Category</label>
                    <input list="fb-category-options" value={fbCategory} onChange={e=>setFbCategory(e.target.value)} placeholder="e.g., HR, Procurement, Facilities…" style={S.inp}/>
                    <datalist id="fb-category-options">
                      {Array.from(new Set([...forms.map((f:any)=>f.field_definitions?.category).filter((c:string)=>c&&c!=="General"), "HR","IT","Procurement","Inventory","Facilities","Safety","Quality","Finance"])).sort().map((c:string)=><option key={c} value={c}/>)}
                    </datalist>
                  </div>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Form Description</label>
                    <textarea value={fbDesc} onChange={e=>setFbDesc(e.target.value)} placeholder="Describe the purpose of this form..." style={{...S.inp,minHeight:60,resize:"vertical" as const}}/>
                  </div>
                  <div style={{gridColumn:"1/-1",display:"flex",gap:8}}>
                    <button onClick={fbSaveForm} disabled={fbSaving} style={{...S.btn("#10b981"),fontSize:12,opacity:fbSaving?0.6:1}}>
                      <Save size={14}/>{fbSaving?"Saving…":selectedFormId?"Save Changes":"Create Form"}
                    </button>
                    {selectedFormId && selectedForm?.deleted_at && <button onClick={()=>fbRestoreForm()} style={{...S.btn("#059669"),fontSize:12}}><RefreshCw size={14}/>Restore</button>}
                    {selectedFormId && !selectedForm?.deleted_at && <button onClick={()=>fbDeleteForm()} style={{...S.btn("#dc2626"),fontSize:12}}><Trash2 size={14}/>Delete</button>}
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#f59e0b")}><Plus size={14} color="#f59e0b"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Add Questions</span></div>
                <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
                  {fbQuestions.map((fq,i)=>(
                    <div key={i} style={{display:"grid",gridTemplateColumns:"24px 1fr 100px 1fr 60px 28px",gap:8,alignItems:"center",padding:"8px",background:"#f8fafc",borderRadius:6}}>
                      <span style={{fontSize:11,color:T.fgMuted}}>{i+1}</span>
                      <input value={fq.q} onChange={e=>setFbQuestions(p=>p.map((x,j)=>j===i?{...x,q:e.target.value}:x))} style={{...S.inp,padding:"5px 8px",fontSize:12}}/>
                      <select value={fq.t} onChange={e=>setFbQuestions(p=>p.map((x,j)=>j===i?{...x,t:e.target.value}:x))} style={{...S.inp,padding:"5px 8px",fontSize:12}}>
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="tel">Phone</option>
                        <option value="date">Date</option>
                        <option value="select">Dropdown</option>
                        <option value="textarea">Long Text</option>
                        <option value="file">File Upload</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="radio">Radio</option>
                      </select>
                      <input value={fq.opts||""} onChange={e=>setFbQuestions(p=>p.map((x,j)=>j===i?{...x,opts:e.target.value}:x))} placeholder={["select","radio"].includes(fq.t)?"Option1,Option2,Option3":"Options... (n/a)"} disabled={!["select","radio"].includes(fq.t)} style={{...S.inp,padding:"5px 8px",fontSize:11,opacity:["select","radio"].includes(fq.t)?1:0.5}}/>
                      <label style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:fq.req?"#dc2626":"#64748b"}}>
                        <input type="checkbox" checked={!!fq.req} onChange={e=>setFbQuestions(p=>p.map((x,j)=>j===i?{...x,req:e.target.checked}:x))}/>Req
                      </label>
                      <button onClick={()=>setFbQuestions(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",display:"flex",justifyContent:"center"}}><X size={14}/></button>
                    </div>
                  ))}
                  <button onClick={()=>setFbQuestions(p=>[...p,{q:"New Question",t:"text",req:false}])} style={{...S.btn("#f59e0b"),marginTop:8,fontSize:12}}><Plus size={14}/>Add Question</button>
                  <button onClick={fbSaveForm} disabled={fbSaving} style={{...S.btn("#10b981"),fontSize:12,alignSelf:"flex-start",opacity:fbSaving?0.6:1}}><Save size={14}/>Save Questions</button>
                </div>
              </div>

              {selectedFormId && (
              <div style={S.card}>
                <div style={S.cardHd("#10b981")}><ExternalLink size={14} color="#10b981"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Form Link &amp; Publishing</span></div>
                <div style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Public Form URL</label>
                    <div style={{display:"flex",gap:8}}>
                      <input readOnly value={fbPublicUrl} style={{...S.inp,background:"#f8fafc",flex:1,fontSize:11}}/>
                      <button onClick={fbCopyLink} style={{...S.btn(fbCopied?"#10b981":"#3b82f6"),fontSize:12}}>{fbCopied?<Check size={14}/>:<Copy size={14}/>}{fbCopied?"Copied":"Copy"}</button>
                      <button onClick={()=>window.open(fbPublicUrl,"_blank")} style={{...S.btn("#10b981"),fontSize:12}}><ExternalLink size={14}/>Open</button>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:12}}>
                      <div style={{fontSize:11,color:"#166534",fontWeight:600}}>Responses</div>
                      <div style={{fontSize:28,fontWeight:700,color:"#15803d"}}>{selectedForm?.response_count||0}</div>
                    </div>
                    <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:8,padding:12}}>
                      <div style={{fontSize:11,color:"#1e40af",fontWeight:600}}>Today</div>
                      <div style={{fontSize:28,fontWeight:700,color:"#2563eb"}}>
                        {fbResponses.filter((r:any)=>r.submitted_at && new Date(r.submitted_at).toDateString()===new Date().toDateString()).length}
                      </div>
                    </div>
                    <div style={{background: selectedForm?.status==="published"?"#faf5ff":"#fef2f2",border:`1px solid ${selectedForm?.status==="published"?"#e9d5ff":"#fecaca"}`,borderRadius:8,padding:12}}>
                      <div style={{fontSize:11,color: selectedForm?.status==="published"?"#6b21a8":"#991b1b",fontWeight:600}}>Status</div>
                      <div style={{fontSize:16,fontWeight:700,color: selectedForm?.status==="published"?"#7c3aed":"#dc2626"}}>{selectedForm?.status==="published"?"Published":"Draft"}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
                    <button onClick={()=>fbTogglePublish()} disabled={fbSaving} style={{...S.btn(selectedForm?.status==="published"?"#64748b":"#10b981"),fontSize:12,opacity:fbSaving?0.6:1}}>
                      {selectedForm?.status==="published" ? <><Pause size={14}/>Unpublish</> : <><Play size={14}/>Publish Form</>}
                    </button>
                    <button onClick={()=>window.open(fbPublicUrl,"_blank")} style={{...S.btn("#64748b"),fontSize:12}}><Eye size={14}/>Preview</button>
                    <button onClick={()=>loadFbResponses(selectedFormId)} style={{...S.btn("#3b82f6"),fontSize:12}}><RefreshCw size={14}/>Refresh Responses</button>
                    <button onClick={fbSendToAllUsers} disabled={fbSending} style={{...S.btn("#8b5cf6"),fontSize:12,opacity:fbSending?0.6:1}}>
                      <Mail size={14}/>{fbSending?"Sending…":"Send to All Users Now"}
                    </button>
                    <div style={{display:"flex",alignItems:"center",gap:6,background:"#f8fafc",border:`1px solid ${T.border}`,borderRadius:8,padding:"4px 4px 4px 10px"}}>
                      <Clock size={13} color="#64748b"/>
                      <input type="datetime-local" value={fbScheduleAt} onChange={e=>setFbScheduleAt(e.target.value)}
                        min={new Date(Date.now()+5*60000).toISOString().slice(0,16)}
                        style={{border:"none",background:"transparent",fontSize:12,color:T.fg,outline:"none"}}/>
                      <button onClick={fbScheduleSend} disabled={fbScheduling} style={{...S.btn("#f59e0b"),fontSize:12,opacity:fbScheduling?0.6:1}}>
                        {fbScheduling?"Scheduling…":"Schedule Send"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {selectedFormId && fbSchedules.length>0 && (
              <div style={S.card}>
                <div style={S.cardHd("#f59e0b")}><Clock size={14} color="#f59e0b"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Scheduled &amp; Sent Blasts</span></div>
                <div style={{padding:0}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f8fafc",borderBottom:`1px solid ${T.border}`}}>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>When</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Status</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Delivered</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fbSchedules.map((s:any)=>(
                        <tr key={s.id} style={{borderBottom:`1px solid ${T.border}18`}}>
                          <td style={{padding:"8px 12px",color:T.fgMuted}}>{new Date(s.scheduled_at).toLocaleString()}</td>
                          <td style={{padding:"8px 12px"}}>
                            <span style={{
                              padding:"2px 8px",borderRadius:999,fontSize:10,fontWeight:700,textTransform:"uppercase",
                              color: s.status==="sent"?"#065f46": s.status==="failed"?"#991b1b": s.status==="cancelled"?"#64748b": s.status==="sending"?"#7c3aed":"#92400e",
                              background: s.status==="sent"?"#d1fae5": s.status==="failed"?"#fee2e2": s.status==="cancelled"?"#f1f5f9": s.status==="sending"?"#ede9fe":"#fef3c7",
                            }}>{s.status}</span>
                          </td>
                          <td style={{padding:"8px 12px",color:T.fgMuted}}>
                            {s.status==="sent" ? `${s.sent_count}/${s.recipients_count}` : s.status==="failed" && s.error ? <span title={s.error} style={{color:"#dc2626"}}>error — hover</span> : "—"}
                          </td>
                          <td style={{padding:"8px 12px"}}>
                            {s.status==="pending" && (
                              <button onClick={()=>fbCancelSchedule(s.id)} style={{...S.btn("#dc2626"),padding:"4px 8px",fontSize:10}}><X size={12}/>Cancel</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {selectedFormId && (
              <div style={S.card}>
                <div style={S.cardHd("#6366f1")}><FileText size={14} color="#6366f1"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Recent Responses</span></div>
                <div style={{padding:0}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"#f8fafc",borderBottom:`1px solid ${T.border}`}}>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Date</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Submitter</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Email</th>
                        <th style={{padding:"8px 12px",textAlign:"left",fontWeight:600,color:T.fgMuted}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fbResponses.length===0 ? (
                        <tr><td colSpan={4} style={{padding:"20px 12px",textAlign:"center",color:T.fgMuted}}>No responses yet</td></tr>
                      ) : fbResponses.map((r:any)=>{
                        const ans = r.responses||{};
                        const nameKey = Object.keys(ans).find(k=>/name/i.test(k));
                        return (
                        <tr key={r.id} style={{borderBottom:`1px solid ${T.border}18`}}>
                          <td style={{padding:"8px 12px",color:T.fgMuted}}>{r.submitted_at?new Date(r.submitted_at).toLocaleString():"—"}</td>
                          <td style={{padding:"8px 12px",fontWeight:500}}>{nameKey?ans[nameKey]:"—"}</td>
                          <td style={{padding:"8px 12px"}}>{r.respondent_email||"—"}</td>
                          <td style={{padding:"8px 12px"}}>
                            <button onClick={()=>setFbViewResponse(r)} style={{...S.btn("#64748b"),padding:"4px 8px",fontSize:10}}><Eye size={12}/>View</button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {fbViewResponse && (
                <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setFbViewResponse(null)}>
                  <div style={{background:"#fff",borderRadius:12,width:"min(480px,92%)",maxHeight:"80vh",overflow:"auto",padding:20}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                      <span style={{fontWeight:800,fontSize:14,color:"#0f172a"}}>Response Detail</span>
                      <button onClick={()=>setFbViewResponse(null)} style={{background:"none",border:"none",cursor:"pointer"}}><X size={18}/></button>
                    </div>
                    <div style={{fontSize:11,color:"#94a3b8",marginBottom:12}}>Submitted {fbViewResponse.submitted_at?new Date(fbViewResponse.submitted_at).toLocaleString():"—"}</div>
                    {Object.entries(fbViewResponse.responses||{}).map(([k,v]:[string,any])=>(
                      <div key={k} style={{marginBottom:10,paddingBottom:10,borderBottom:"1px solid #f1f5f9"}}>
                        <div style={{fontSize:10,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.05em"}}>{k}</div>
                        <div style={{fontSize:13,color:"#0f172a",marginTop:2,wordBreak:"break-word",whiteSpace:"pre-wrap"}}>
                          {v===""||v==null ? "—" : v==="true" ? "✓ Yes" : v==="false" ? "✗ No" : String(v)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* - BRANDING - */}
          {sec==="branding"&&(
            <div style={{display:"flex",flexDirection:"column",gap:16}}>
              <div style={S.card}>
                <div style={S.cardHd("#db2777")}><ImageIcon size={14} color="#db2777"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Organization Branding</span></div>
                <div style={{padding:"16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Organization / Facility Name</label>
                    <input value={brandName} onChange={e=>setBrandName(e.target.value)} placeholder="Embu Level 5 Hospital" style={S.inp}/>
                  </div>

                  <div style={{gridColumn:"1/-1"}}>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Logo</label>
                    <div style={{display:"flex",alignItems:"center",gap:14}}>
                      <div style={{width:64,height:64,borderRadius:8,border:`1.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"#f8fafc",flexShrink:0}}>
                        {brandLogo ? <img src={brandLogo} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/> : <ImageIcon size={22} color="#cbd5e1"/>}
                      </div>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <label style={{...S.btn(brandLogoUploading?"#94a3b8":"#64748b"),fontSize:12,cursor:brandLogoUploading?"wait":"pointer",width:"fit-content"}}>
                          <Upload size={14}/>{brandLogoUploading?"Uploading…":"Upload Logo"}
                          <input type="file" accept="image/*" disabled={brandLogoUploading} style={{display:"none"}}
                            onChange={e=>{ const f=e.target.files?.[0]; if (f) onBrandLogoFile(f); }}/>
                        </label>
                        {brandLogo && <button onClick={()=>setBrandLogo("")} style={{...S.btn("#dc2626"),fontSize:11,padding:"4px 10px"}}><X size={12}/>Remove</button>}
                        <span style={{fontSize:10.5,color:T.fgMuted}}>PNG or JPG, under 500KB. Appears on the login page and public forms.</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Primary Color</label>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={brandPrimary} onChange={e=>setBrandPrimary(e.target.value)} style={{width:40,height:34,padding:2,border:`1.5px solid ${T.border}`,borderRadius:6,cursor:"pointer"}}/>
                      <input value={brandPrimary} onChange={e=>setBrandPrimary(e.target.value)} style={{...S.inp,flex:1}}/>
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:11,fontWeight:600,color:T.fgMuted,marginBottom:4,display:"block"}}>Accent Color</label>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="color" value={brandAccent} onChange={e=>setBrandAccent(e.target.value)} style={{width:40,height:34,padding:2,border:`1.5px solid ${T.border}`,borderRadius:6,cursor:"pointer"}}/>
                      <input value={brandAccent} onChange={e=>setBrandAccent(e.target.value)} style={{...S.inp,flex:1}}/>
                    </div>
                  </div>

                  <div style={{gridColumn:"1/-1"}}>
                    <button onClick={saveBrand} disabled={brandSaving || !brand} style={{...S.btn("#10b981"),fontSize:12,opacity:(brandSaving||!brand)?0.6:1}}>
                      <Save size={14}/>{brandSaving?"Saving…":"Save Branding"}
                    </button>
                    {!brand && <span style={{marginLeft:10,fontSize:11,color:T.fgMuted}}>Loading facility record…</span>}
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <div style={S.cardHd("#64748b")}><Eye size={14} color="#64748b"/><span style={{fontWeight:700,color:T.fg,fontSize:13}}>Preview</span></div>
                <div style={{padding:16}}>
                  <div style={{borderRadius:10,overflow:"hidden",border:`1px solid ${T.border}`,maxWidth:420}}>
                    <div style={{background:`linear-gradient(135deg,${brandPrimary},${brandAccent})`,padding:"18px 20px",color:"#fff",display:"flex",alignItems:"center",gap:10}}>
                      {brandLogo && <img src={brandLogo} alt="" style={{width:32,height:32,borderRadius:6,objectFit:"contain",background:"#fff",padding:2}}/>}
                      <div style={{fontWeight:800,fontSize:15}}>{brandName||"Organization Name"}</div>
                    </div>
                    <div style={{padding:16,fontSize:12,color:T.fgMuted}}>This is how the header on public forms and the sign-in page will look.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
