/**
 * ProcurBosse — Dashboard v9.0 NUCLEAR ACTIVATED
 * Microsoft Dynamics 365 coloured module tiles
 * Always renders — Supabase errors never crash the page
 * Role-filtered ERP wheel · KPIs admin-only
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/theme";
import {
  ShoppingCart, Package, DollarSign, Truck, BarChart3,
  Users, FileText, Bell, Settings, Database, Shield,
  Globe, Printer, ClipboardList, BookOpen, PiggyBank,
  Layers, Scale, Mail, Activity, Archive, Gavel,
  CheckSquare, Briefcase, RefreshCw, Home, Star,
  MessageSquare, Phone, TrendingUp, ChevronRight,
} from "lucide-react";

const db = supabase as any;

/* ── Role → allowed module IDs ─────────────────────────────────── */
const ROLE_MODS: Record<string, string[]> = {
  superadmin:          ["procurement","inventory","finance","quality","comms","reports","users","system","audit"],
  webmaster:           ["procurement","inventory","finance","quality","comms","reports","users","system","audit"],
  admin:               ["procurement","inventory","finance","quality","comms","reports","users","system","audit"],
  database_admin:      ["system","audit","reports"],
  procurement_manager: ["procurement","inventory","quality","comms","reports","audit"],
  procurement_officer: ["procurement","inventory","quality","comms"],
  inventory_manager:   ["inventory","quality","reports"],
  warehouse_officer:   ["inventory"],
  accountant:          ["finance","reports","audit"],
  requisitioner:       ["procurement"],
};

/* ── Module definitions ─────────────────────────────────────────── */
const MODULES = [
  { id:"procurement", label:"Procurement",      color:"#0078d4", icon:ShoppingCart,
    items:[{l:"Requisitions",p:"/requisitions",i:ClipboardList},{l:"Purchase Orders",p:"/purchase-orders",i:ShoppingCart},{l:"Suppliers",p:"/suppliers",i:Briefcase},{l:"Goods Received",p:"/goods-received",i:Truck},{l:"Tenders",p:"/tenders",i:Gavel},{l:"Bid Evaluations",p:"/bid-evaluations",i:Scale},{l:"Contracts",p:"/contracts",i:FileText},{l:"Planning",p:"/procurement-planning",i:BookOpen}]},
  { id:"inventory",   label:"Inventory",         color:"#038387", icon:Package,
    items:[{l:"Items / Stock",p:"/items",i:Package},{l:"Categories",p:"/categories",i:Layers},{l:"Goods Received",p:"/goods-received",i:Truck},{l:"Departments",p:"/departments",i:Home},{l:"Scanner",p:"/scanner",i:Activity}]},
  { id:"finance",     label:"Finance & Accounts",color:"#7719aa", icon:DollarSign,
    items:[{l:"Dashboard",p:"/financials",i:BarChart3},{l:"Budgets",p:"/financials/budgets",i:PiggyBank},{l:"Chart of Accounts",p:"/financials/chart-of-accounts",i:BookOpen},{l:"Fixed Assets",p:"/financials/fixed-assets",i:Archive},{l:"Payment Vouchers",p:"/vouchers/payment",i:DollarSign},{l:"Accountant WS",p:"/accountant-workspace",i:Briefcase}]},
  { id:"quality",     label:"Quality Control",   color:"#498205", icon:CheckSquare,
    items:[{l:"QC Dashboard",p:"/quality",i:Star},{l:"Inspections",p:"/quality/inspections",i:CheckSquare},{l:"Non-Conformance",p:"/quality/non-conformance",i:Bell}]},
  { id:"comms",       label:"Communications",    color:"#0072c6", icon:Mail,
    items:[{l:"Email",p:"/email",i:Mail},{l:"SMS",p:"/sms",i:MessageSquare},{l:"Telephony",p:"/telephony",i:Phone},{l:"Notifications",p:"/notifications",i:Bell},{l:"Documents",p:"/documents",i:FileText}]},
  { id:"reports",     label:"Reports & BI",      color:"#5c2d91", icon:BarChart3,
    items:[{l:"Reports",p:"/reports",i:BarChart3},{l:"Print Engine",p:"/print-engine",i:Printer},{l:"Audit Log",p:"/audit-log",i:Activity}]},
  { id:"users",       label:"Users & Access",    color:"#b4009e", icon:Users,
    items:[{l:"Users",p:"/users",i:Users},{l:"IP Access",p:"/admin/ip-access",i:Shield},{l:"Profile",p:"/profile",i:Users},{l:"Facilities",p:"/facilities",i:Home}]},
  { id:"system",      label:"System",            color:"#00188f", icon:Settings,
    items:[{l:"Settings",p:"/settings",i:Settings},{l:"Admin Panel",p:"/admin/panel",i:Shield},{l:"Database",p:"/admin/database",i:Database},{l:"Backup",p:"/backup",i:Archive},{l:"Webmaster",p:"/webmaster",i:Globe},{l:"GUI Editor",p:"/gui-editor",i:Activity},{l:"ODBC",p:"/odbc",i:Database}]},
  { id:"audit",       label:"Audit",             color:"#d83b01", icon:FileText,
    items:[{l:"Audit Log",p:"/audit-log",i:FileText},{l:"Reception",p:"/reception",i:Activity},{l:"DB Monitor",p:"/admin/db-test",i:Database}]},
];

/* ── KPI tile ────────────────────────────────────────────────────── */
function KpiCard({label,value,color,icon:Icon}:{label:string;value:number|string;color:string;icon:any}) {
  return (
    <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"16px 20px",boxShadow:T.shadow,display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:44,height:44,borderRadius:T.rMd,background:`${color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <Icon size={22} color={color}/>
      </div>
      <div>
        <div style={{fontSize:26,fontWeight:800,color,lineHeight:1}}>{typeof value==="number"?value.toLocaleString():value}</div>
        <div style={{fontSize:12,color:T.fgMuted,marginTop:3,fontWeight:500}}>{label}</div>
      </div>
    </div>
  );
}

/* ── Module tile ─────────────────────────────────────────────────── */
function ModuleTile({mod,active,onClick}:{mod:typeof MODULES[0];active:boolean;onClick:()=>void}) {
  const [hov,setHov] = useState(false);
  const Icon = mod.icon;
  return (
    <div
      onClick={onClick}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{
        background: active ? mod.color : (hov ? mod.color : `${mod.color}dd`),
        color:"#fff",borderRadius:T.rMd,padding:"20px 16px",
        cursor:"pointer",transition:"all .18s",
        transform:hov&&!active?"translateY(-3px)":"none",
        boxShadow:hov||active?`0 8px 28px ${mod.color}44`:"0 2px 8px rgba(0,0,0,0.12)",
        display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",gap:10,minHeight:105,
        textAlign:"center",userSelect:"none",
        outline:active?`3px solid #fff`:"none",
        outlineOffset:active?"-3px":"0",
      }}
    >
      <Icon size={26} strokeWidth={1.8}/>
      <div style={{fontSize:12,fontWeight:700,lineHeight:1.3}}>{mod.label}</div>
      <div style={{fontSize:10,opacity:.75}}>{mod.items.length} areas</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, primaryRole, hasRole } = useAuth();
  const nav = useNavigate();
  const [kpi,  setKpi]  = useState({req:0,po:0,items:0,suppliers:0,notifs:0,lowstock:0});
  const [selMod, setSelMod] = useState<typeof MODULES[0]|null>(null);
  const [time,  setTime]  = useState(new Date());
  const [kpiLoading, setKpiLoading] = useState(false);

  const isAdmin = hasRole("admin","superadmin","webmaster");
  const allowed = ROLE_MODS[primaryRole] || ROLE_MODS["requisitioner"];
  const visibleMods = MODULES.filter(m => allowed.includes(m.id));

  // Clock
  useEffect(() => {
    const iv = setInterval(()=>setTime(new Date()),60000);
    return ()=>clearInterval(iv);
  },[]);

  // KPIs (admin only)
  const loadKpi = useCallback(async()=>{
    if(!isAdmin) return;
    setKpiLoading(true);
    try {
      const [r,p,i,s,n,ls] = await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("items").select("id",{count:"exact",head:true}),
        db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
      ]);
      const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
      setKpi({req:v(r),po:v(p),items:v(i),suppliers:v(s),notifs:v(n),lowstock:v(ls)});
    } catch {}
    finally { setKpiLoading(false); }
  },[isAdmin]);

  useEffect(()=>{ loadKpi(); },[loadKpi]);

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split("@")[0] || "User";
  const roleLabel   = primaryRole.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  return (
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"}}>

      {/* Page header */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,padding:"14px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 1px 4px rgba(0,0,0,.05)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <Home size={18} color={T.primary}/>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:T.fg}}>Home — Dashboard</div>
            <div style={{fontSize:11,color:T.fgDim}}>
              {time.toLocaleDateString("en-KE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:600,color:T.fg}}>{displayName}</div>
            <div style={{fontSize:11,color:T.primary,fontWeight:500}}>{roleLabel}</div>
          </div>
          <button onClick={loadKpi} title="Refresh" style={{background:"none",border:`1px solid ${T.border}`,borderRadius:T.r,padding:"5px 8px",cursor:"pointer",color:T.fgMuted,display:"flex",alignItems:"center"}}>
            <RefreshCw size={13} style={{animation:kpiLoading?"pb-spin .8s linear infinite":undefined}}/>
          </button>
        </div>
      </div>

      <div style={{padding:"24px 28px"}}>

        {/* KPI tiles — admin only */}
        {isAdmin&&(
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:T.fgMuted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>Live Overview</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:12}}>
              <KpiCard label="Pending Requisitions"  value={kpi.req}      color={T.primary}  icon={ClipboardList}/>
              <KpiCard label="Active Purchase Orders" value={kpi.po}       color="#7719aa"    icon={ShoppingCart}/>
              <KpiCard label="Total Stock Items"      value={kpi.items}    color="#038387"    icon={Package}/>
              <KpiCard label="Active Suppliers"       value={kpi.suppliers}color="#498205"    icon={Briefcase}/>
              <KpiCard label="Unread Notifications"   value={kpi.notifs}   color="#d83b01"    icon={Bell}/>
              <KpiCard label="Low Stock Alerts"       value={kpi.lowstock} color="#c19c00"    icon={Star}/>
            </div>
          </div>
        )}

        {/* Module tiles */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:11,fontWeight:700,color:T.fgMuted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>
            My Modules — {roleLabel}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
            {visibleMods.map(m=>(
              <ModuleTile key={m.id} mod={m} active={selMod?.id===m.id} onClick={()=>setSelMod(selMod?.id===m.id?null:m)}/>
            ))}
          </div>
        </div>

        {/* Expanded sub-links */}
        {selMod&&(
          <div style={{background:"#fff",border:`1.5px solid ${selMod.color}33`,borderRadius:T.rLg,boxShadow:`0 2px 16px ${selMod.color}18`,overflow:"hidden",marginBottom:16}}>
            <div style={{background:selMod.color,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <selMod.icon size={17} color="#fff"/>
                <span style={{color:"#fff",fontWeight:700,fontSize:15}}>{selMod.label}</span>
              </div>
              <button onClick={()=>setSelMod(null)} style={{background:"rgba(255,255,255,0.22)",border:"none",color:"#fff",borderRadius:6,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                ✕ Close
              </button>
            </div>
            <div style={{padding:"12px 8px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:2}}>
              {selMod.items.map(s=>{
                const Icon = s.i;
                return (
                  <button key={s.p} onClick={()=>nav(s.p)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:T.r,cursor:"pointer",background:"transparent",border:"none",textAlign:"left",transition:"background .12s"}}
                    onMouseEnter={e=>(e.currentTarget.style.background=T.primaryBg)}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <Icon size={14} color={selMod.color}/>
                    <span style={{fontSize:13,color:T.fg,fontWeight:500}}>{s.l}</span>
                    <ChevronRight size={11} color={T.fgDim} style={{marginLeft:"auto"}}/>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div>
          <div style={{fontSize:11,fontWeight:700,color:T.fgMuted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:12}}>Quick Actions</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {[
              {l:"New Requisition",    p:"/requisitions",   c:T.primary},
              {l:"Check Inventory",    p:"/items",          c:"#038387"},
              {l:"Notifications",      p:"/notifications",  c:"#d83b01"},
              {l:"Email",              p:"/email",          c:"#0072c6"},
              ...(isAdmin?[
                {l:"User Management",  p:"/users",          c:"#b4009e"},
                {l:"System Settings",  p:"/settings",       c:"#00188f"},
                {l:"Database Admin",   p:"/admin/database", c:"#7719aa"},
                {l:"Audit Log",        p:"/audit-log",      c:"#d83b01"},
              ]:[]),
            ].map(a=>(
              <button key={a.p} onClick={()=>nav(a.p)}
                style={{background:`${a.c}12`,color:a.c,border:`1px solid ${a.c}30`,borderRadius:T.r,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",transition:"all .12s"}}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=`${a.c}22`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=`${a.c}12`;}}>
                {a.l}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes pb-spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
