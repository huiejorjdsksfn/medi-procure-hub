/**
 * ProcurBosse - AppLayout v8.0 Microsoft Dynamics 365 Style
 * White top bar - Blue ribbon tabs - Sub-command bar - Live badge counts
 * v7.1: Full mobile/tablet responsiveness — 3-bar hamburger, drawer nav,
 *       ribbon hidden on phone (drawer covers all), compact topbar
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth, EXECUTIVE_TIER, EXECUTIVE_ALLOWED_PATHS } from "@/contexts/AuthContext";
import { isRouteAllowed, getDefaultRoute } from "@/lib/sessionCookie";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";
import FacilitySwitcher from "@/components/FacilitySwitcher";
import SystemBroadcastBanner from "@/components/SystemBroadcastBanner";
import NotificationPopup from "@/components/NotificationPopup";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import SystemHealthWidget from "@/components/SystemHealthWidget";
import { toast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";
import {
  Package, FileText, ShoppingCart, Truck, BarChart3, Settings, LogOut,
  ChevronDown, Building2, Shield, FileCheck, Database, Gavel, DollarSign,
  ClipboardList, BookOpen, PiggyBank, Layers, Receipt, BookMarked, Calendar,
  Scale, Search, Mail, Activity, UserCircle, TrendingUp, Eye, Lock,
  Phone, MessageSquare, MessageCircle, Bot, Bell, Globe, Wrench, Home, Server,
  BarChart2, Code2, Radio, Users, RefreshCw, PenLine, UserPlus,
  CheckCircle, Printer, AlertTriangle, Menu, X as XIcon, Palette
} from "lucide-react";

const db = supabase as any;

/* - Live badge counts (realtime) - */
function useLiveCounts() {
  const [c, setC] = useState<Record<string,number>>({});
  const load = useCallback(async () => {
    try {
      const [r,p,pv,n,ls,g] = await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
      ]);
      const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
      setC({requisitions:v(r),purchase_orders:v(p),payment_vouchers:v(pv),notifications:v(n),low_stock:v(ls),goods_received:v(g)});
    } catch {}
  },[]);
  useEffect(()=>{
    load();
    const iv=setInterval(load,30_000);
    const ch=db.channel("nav:live")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},load)
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},load)
      .subscribe();
    return()=>{clearInterval(iv);db.removeChannel(ch);};
  },[load]);
  return c;
}

const Badge = ({n,col}:{n:number;col:string}) =>
  n>0 ? <span style={{minWidth:17,height:17,borderRadius:10,background:col,color:"#fff",fontSize:10,fontWeight:700,lineHeight:"17px",textAlign:"center",padding:"0 4px",display:"inline-block",flexShrink:0}}>{n>99?"99+":n}</span> : null;

/* - Module / nav definitions - */
const MODS = [
  {id:"procurement",label:"Procurement",col:T.procurement,
   roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"],
   items:[
     {l:"Tracking & Approval",p:"/tracking-approval",I:CheckCircle},
     {l:"Requisitions",   p:"/requisitions",        I:ClipboardList, b:"requisitions"},
     {l:"Purchase Orders",p:"/purchase-orders",     I:ShoppingCart,  b:"purchase_orders"},
     {l:"Goods Received", p:"/goods-received",      I:Package,       b:"goods_received"},
     {l:"Suppliers",      p:"/suppliers",           I:Truck},
     {l:"Contracts",      p:"/contracts",           I:FileCheck},
     {l:"Tenders",        p:"/tenders",             I:Gavel},
     {l:"Bid Evaluations",p:"/bid-evaluations",     I:Scale},
     {l:"Proc. Planning", p:"/procurement-planning",I:Calendar},
   ]},
  {id:"finance",label:"Finance",col:T.finance,
   roles:["admin","superadmin","webmaster","procurement_manager","accountant","finance_officer","finance_manager"],
   items:[
     // Finance Desktop is the consolidated multi-window "sub-apps" hub —
     // Payments, Receipts, Journals, Purchase/Sales Vouchers, Budgets,
     // GL/Trial Balance, Fixed Assets, Bank Reconciliation, and Reports
     // all live inside it as draggable windows, so it's listed first as
     // the primary way in instead of clicking through many separate pages.
     {l:"Finance Desktop",    p:"/finance-dashboard",           I:DollarSign},
     {l:"Invoice Matching",   p:"/invoice-matching",            I:Receipt},
     {l:"Chart of Accounts",  p:"/financials/chart-of-accounts", I:BookOpen},
     {l:"Fixed Assets",       p:"/financials/fixed-assets",      I:Building2},
     {l:"Accountant Workspace",p:"/accountant-workspace",        I:BarChart2},
   ]},
  {id:"inventory",label:"Inventory",col:T.inventory,
   roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
   items:[
     {l:"Items / Stock", p:"/items",       I:Package, b:"low_stock"},
     {l:"Categories",    p:"/categories",  I:Layers},
     {l:"Departments",   p:"/departments", I:Building2},
     {l:"Scanner",       p:"/scanner",     I:Search},
   ]},
  {id:"quality",label:"Quality",col:T.quality,
   roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"],
   items:[
     {l:"QC Dashboard",   p:"/quality/dashboard",       I:Shield},
     {l:"Inspections",    p:"/quality/inspections",     I:Eye},
     {l:"Non-Conformance",p:"/quality/non-conformance", I:Activity},
   ]},
  {id:"reports",label:"Reports & BI",col:T.reports,roles:[],
   items:[
     {l:"Analytics",  p:"/reports",       I:BarChart3},
     {l:"System Utilization",p:"/reports/system-utilization",I:Activity},
     {l:"Print Engine",p:"/reports/print-engine",I:Printer},
     {l:"Documents",  p:"/documents",      I:FileText},
     {l:"Document Studio",p:"/documents/editor",I:PenLine},
     {l:"Stamp Studio",   p:"/admin/stamp-design",I:Palette},
   ]},
  {id:"comms",label:"Communications",col:T.comms,roles:[],
   items:[
     {l:"Email",     p:"/email",     I:Mail},
     // {l:"SMS",       p:"/sms",       I:MessageSquare}, // temporarily removed — will restore
     // {l:"WhatsApp",  p:"/whatsapp",   I:MessageCircle}, // removed per request — only Reception + Email remain
     // {l:"AI Agent",  p:"/ai-agent",   I:Bot}, // removed per request — only Reception + Email remain
     // {l:"Telephony", p:"/telephony", I:Phone}, // temporarily removed (Calls) — will restore
     {l:"Reception", p:"/reception", I:Users},
   ]},
  {id:"admin",label:"Administration",col:T.system,
   roles:["admin","superadmin","webmaster","database_admin"],
   items:[
     {l:"Admin Panel",        p:"/admin/panel",           I:Settings},
     {l:"Users",              p:"/users",                 I:Users},
     {l:"Security Center",    p:"/admin/users-ip-audit",  I:Globe},
     {l:"Audit Log",          p:"/audit-log",             I:Activity},
     {l:"Settings",           p:"/settings",              I:Wrench},
     {l:"GUI Editor",         p:"/gui-editor",            I:Code2},
     {l:"Database",           p:"/admin/database",        I:Database},
     {l:"Connectivity",       p:"/admin/connectivity",    I:Radio},
     {l:"Supabase Live Controls", p:"/admin/supabase-controls", I:Activity},
     {l:"Webmaster / Superadmin", p:"/webmaster",         I:Globe},
   ]},
];

export default function AppLayout({children}:{children:React.ReactNode}) {
  const loc  = useLocation();
  const nav  = useNavigate();
  const {user,profile,roles,signOut,primaryRole} = useAuth();
  const s    = useSystemSettings();
  const cnt  = useLiveCounts();

  const [activeMod, setActiveMod] = useState<string|null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [deviceWidth, setDeviceWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    const handler = () => setDeviceWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const isPhone  = deviceWidth <= 767;
  const isTablet = deviceWidth > 767 && deviceWidth <= 1023;
  const isMobile = isPhone || isTablet;

  const isAdmin   = roles?.some(r=>["admin","superadmin","webmaster"].includes(r));
  const isDbAdmin = roles?.some(r=>["database_admin"].includes(r)) || isAdmin;
  const rolesReady = roles && roles.length > 0;
  const sysName   = s.get("system_name",   "EL5 MediProcure");
  const hospName  = s.get("hospital_name", "Embu Level 5 Hospital");

  const isExecutiveOnly = roles.length>0 && roles.every(r=>EXECUTIVE_TIER.includes(r as any));

  const canSee = useCallback((modRoles:string[])=>{
    if(isExecutiveOnly) return true; // module-level gating skipped; filterItems does the real restriction below
    if(!modRoles.length) return true;
    if(!rolesReady) return true;
    if(isAdmin) return true;
    return modRoles.some(r=>roles?.includes(r));
  },[roles,isAdmin,rolesReady,isExecutiveOnly]);

  const filterItems = useCallback((items:{p:string;[k:string]:any}[])=>{
    // CEO/CFO with no other role: stats/trends only, everywhere —
    // matches ExecutiveGuard's route-level block so the nav doesn't
    // dangle links to pages the user would just get redirected away
    // from anyway.
    if(isExecutiveOnly) return items.filter(item => EXECUTIVE_ALLOWED_PATHS.some(p=>item.p===p||item.p.startsWith(p+"/")));
    if(!rolesReady) return items;
    if(isAdmin) return items;
    return items.filter(item => isRouteAllowed(primaryRole, item.p));
  },[isAdmin,primaryRole,rolesReady,isExecutiveOnly]);

  useEffect(()=>{
    const found = MODS.find(m=>m.items.some(i=>i.p!=="/dashboard"&&loc.pathname.startsWith(i.p)));
    setActiveMod(found?.id||null);
  },[loc.pathname]);

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false); }, [loc.pathname]);

  // A queued offline mutation couldn't be saved even after the cache
  // engines freed space — the change may not survive a refresh. Warn
  // loudly instead of letting it vanish silently (see offlineEngine.ts).
  useEffect(() => {
    const onQueueSaveFailed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast({
        title: "⚠ Couldn't save your change locally",
        description: "Device storage is full. Please stay on this page and check your connection — the change may not be saved if you navigate away.",
        variant: "destructive",
      });
      console.error("[AppLayout] offline queue save failed:", detail);
    };
    window.addEventListener("el5:offline-queue-save-failed", onQueueSaveFailed);
    return () => window.removeEventListener("el5:offline-queue-save-failed", onQueueSaveFailed);
  }, []);

  const activeModDef = MODS.find(m=>m.id===activeMod);
  const totalAlerts = (cnt.requisitions||0)+(cnt.purchase_orders||0)+(cnt.payment_vouchers||0);

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"var(--color-page-bg,#f3f5f8)",fontFamily:"var(--font-family,'Segoe UI','Inter',system-ui,sans-serif)",fontSize:"var(--font-size-base,13px)",color:"var(--color-text,#1a1a2e)",overflow:"hidden"}}
         data-device={isPhone?"phone":isTablet?"tablet":"desktop"}>
      <style>{`
        @keyframes livePulse{0%,100%{opacity:1}50%{opacity:.3}}
        /* Phone: hide ribbon & subnav — all nav in drawer */
        [data-device="phone"] .ribbon-tabs  { display:none!important; }
        [data-device="phone"] .sub-nav-bar  { display:none!important; }
        /* Tablet: keep ribbon but make scrollable */
        [data-device="tablet"] .ribbon-tabs { overflow-x:auto!important; -webkit-overflow-scrolling:touch!important; }
        [data-device="tablet"] .sub-nav-bar { overflow-x:auto!important; -webkit-overflow-scrolling:touch!important; }
        /* Page content: fill remaining height */
        .app-page-content { flex:1; overflow-y:auto; overflow-x:hidden; }
        /* Overlay backdrop */
        .mob-nav-backdrop { position:fixed;inset:0;background:rgba(0,0,0,0.48);z-index:8998;touch-action:none; }
      `}</style>
      <SystemBroadcastBanner/>

      {/* ── TOP BAR ─────────────────────────────────────────────────── */}
      <div style={{height:isPhone?50:52,background:`linear-gradient(180deg, ${T.primary}, ${T.primaryDark})`,display:"flex",alignItems:"center",
                   padding:isPhone?"0 10px":"0 18px",gap:isPhone?7:12,flexShrink:0,
                   boxShadow:"0 2px 10px rgba(8,10,35,.28)"}}>

        {/* Hamburger — phone + tablet */}
        {isMobile && (
          <button onClick={() => setMobileNavOpen(o => !o)}
            aria-label="Open navigation menu"
            style={{background:mobileNavOpen?"rgba(255,255,255,.2)":"transparent",border:"none",
                    cursor:"pointer",padding:"6px",display:"flex",flexDirection:"column",
                    alignItems:"center",justifyContent:"center",gap:4,flexShrink:0,
                    borderRadius:8,minWidth:36,minHeight:36,transition:"background .15s"}}>
            <span style={{display:"block",width:18,height:2,background:"#fff",borderRadius:1,
                          transform:mobileNavOpen?"rotate(45deg) translate(4px,4px)":"none",
                          transition:"transform .2s"}}/>
            <span style={{display:"block",width:18,height:2,background:"#fff",borderRadius:1,
                          opacity:mobileNavOpen?0:1,transition:"opacity .2s"}}/>
            <span style={{display:"block",width:18,height:2,background:"#fff",borderRadius:1,
                          transform:mobileNavOpen?"rotate(-45deg) translate(4px,-4px)":"none",
                          transition:"transform .2s"}}/>
          </button>
        )}

        <div style={{width:isPhone?26:30,height:isPhone?26:30,borderRadius:9,background:"rgba(255,255,255,.16)",
                     border:"1px solid rgba(255,255,255,.22)",display:"flex",alignItems:"center",justifyContent:"center",
                     flexShrink:0}}>
          <img src={logoImg} alt="" className="topbar-logo"
               style={{width:isPhone?16:19,height:isPhone?16:19,objectFit:"contain"}}/>
        </div>

        <div style={{lineHeight:1.15,minWidth:0,flex:isPhone?"1":"none",overflow:"hidden"}}>
          <div style={{fontSize:isPhone?11:13,fontWeight:700,color:"#fff",letterSpacing:"-.005em",
                       whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {isPhone ? (sysName.length>16 ? sysName.replace("EL5 ","") : sysName) : sysName}
          </div>
          {!isPhone && <div style={{fontSize:9,color:"rgba(255,255,255,.55)",letterSpacing:".04em",marginTop:1}}>{hospName}</div>}
        </div>

        {!isPhone && <div style={{marginLeft:8}}><FacilitySwitcher/></div>}
        {!isPhone && <div style={{marginLeft:14,flex:1,maxWidth:440}}><GlobalSearchBar /></div>}
        {isPhone && <div style={{flex:1}}/>}
        {!isPhone && <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <SystemHealthWidget />

          {totalAlerts>0 && (
            <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 11px",borderRadius:99,background:"rgba(255,255,255,.14)",
                         border:"1px solid rgba(255,255,255,.22)",fontSize:11,
                         fontWeight:700,color:"#fff",flexShrink:0,whiteSpace:"nowrap"}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:"#fbbf24",flexShrink:0}}/>
              {totalAlerts} pending
            </div>
          )}

          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10.5,color:"rgba(255,255,255,.6)",fontWeight:600}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",
                          display:"inline-block",animation:"livePulse 2s infinite"}}/>Live
          </div>
        </div>}
        {isPhone && totalAlerts>0 && (
          <div style={{padding:"3px 8px",borderRadius:99,background:"rgba(255,255,255,.15)",
                       border:"1px solid rgba(255,255,255,.22)",fontSize:9,
                       fontWeight:700,color:"#fff",flexShrink:0,whiteSpace:"nowrap"}}>
            {totalAlerts} ⚠
          </div>
        )}

        {/* ── User cluster: notifications · role · avatar · sign out ── */}
        <div style={{display:"flex",alignItems:"center",gap:isPhone?4:6,flexShrink:0,
                     paddingLeft:isPhone?0:8,marginLeft:isPhone?0:2,
                     borderLeft:isPhone?"none":"1px solid rgba(255,255,255,.14)"}}>
          <div style={{position:"relative"}}>
            <button onClick={()=>setNotifOpen(p=>!p)}
              style={{padding:"6px",background:notifOpen?"rgba(255,255,255,.18)":"transparent",
                      border:"none",cursor:"pointer",color:"rgba(255,255,255,.9)",borderRadius:8,
                      display:"flex",alignItems:"center",position:"relative",minWidth:32,minHeight:32,transition:"background .12s"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.18)")}
              onMouseLeave={e=>(e.currentTarget.style.background=notifOpen?"rgba(255,255,255,.18)":"transparent")}>
              <Bell size={15}/>
              {(cnt.notifications||0)>0 && (
                <span style={{position:"absolute",top:5,right:6,width:7,height:7,
                              borderRadius:"50%",background:"#f87171",border:`1.5px solid ${T.primaryDark}`}}/>
              )}
            </button>
            {notifOpen && (
              <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:300}}>
                <NotificationPopup onClose={()=>setNotifOpen(false)}/>
              </div>
            )}
          </div>

          {!isPhone && (
            <div style={{padding:"4px 11px",borderRadius:99,background:"rgba(255,255,255,.1)",
                         fontSize:10.5,fontWeight:600,color:"rgba(255,255,255,.85)",whiteSpace:"nowrap"}}>
              {primaryRole?.replace(/_/g," ")||"Staff"}
            </div>
          )}

          <button onClick={()=>nav("/profile")}
            style={{background:"transparent",border:"none",cursor:"pointer",padding:1,borderRadius:"50%",flexShrink:0,
                    display:"flex",boxShadow:"0 0 0 1.5px rgba(255,255,255,.3)",transition:"box-shadow .12s"}}
            onMouseEnter={e=>(e.currentTarget.style.boxShadow="0 0 0 1.5px rgba(255,255,255,.6)")}
            onMouseLeave={e=>(e.currentTarget.style.boxShadow="0 0 0 1.5px rgba(255,255,255,.3)")}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{width:isPhone?24:27,height:isPhone?24:27,borderRadius:"50%",objectFit:"cover"}}/>
              : <div style={{width:isPhone?24:27,height:isPhone?24:27,borderRadius:"50%",background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <UserCircle size={isPhone?14:16} color="#fff"/>
                </div>}
          </button>

          <button onClick={()=>{signOut();nav("/login");}} title="Sign out"
            style={{padding:"6px",background:"transparent",border:"none",cursor:"pointer",
                    color:"rgba(255,255,255,.75)",borderRadius:8,display:"flex",alignItems:"center",
                    minWidth:32,minHeight:32,transition:"background .12s"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.14)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <LogOut size={14}/>
          </button>
        </div>
      </div>

      {/* ── D365 RIBBON (module tabs) — hidden on phone ───────────── */}
      <div className="ribbon-tabs"
           style={{background:"#fff",borderBottom:`1px solid ${T.border}`,display:"flex",
                   alignItems:"stretch",padding:"0 10px",flexShrink:0,
                   boxShadow:"0 1px 3px rgba(0,0,0,.05)",overflowX:"auto",
                   WebkitOverflowScrolling:"touch" as any}}>
        <button onClick={()=>{setActiveMod(null);nav("/dashboard");}}
          style={{display:"flex",alignItems:"center",gap:6,padding:"11px 16px",
                  color:loc.pathname==="/dashboard"?T.primary:T.fgMuted,
                  fontWeight:loc.pathname==="/dashboard"?700:500,fontSize:13,cursor:"pointer",
                  background:loc.pathname==="/dashboard"?`${T.primary}0d`:"transparent",
                  border:"none",borderRadius:"8px 8px 0 0",
                  borderBottom:`2.5px solid ${loc.pathname==="/dashboard"?T.primary:"transparent"}`,
                  whiteSpace:"nowrap",transition:"all .18s cubic-bezier(.4,0,.2,1)",flexShrink:0}}
          onMouseEnter={e=>{(e.currentTarget as any).style.color=T.primary}}
          onMouseLeave={e=>{(e.currentTarget as any).style.color=loc.pathname==="/dashboard"?T.primary:T.fgMuted}}>
          <Home size={13}/>Home
        </button>
        {MODS.filter(m=>canSee(m.roles)).map(mod=>{
          const isAct=activeMod===mod.id;
          const modCnt=(mod.items as any[]).reduce<number>((a,i)=>a+(cnt[(i as any).b as string]||0),0);
          return(
            <button key={mod.id} onClick={()=>{
                // Previously this only toggled the sub-nav open/closed, so
                // clicking a ribbon tab (e.g. "Finance") didn't take you
                // anywhere — you had to click again on a sub-item for the
                // page to actually open. Now the tab both expands the
                // sub-nav AND navigates straight to the module's first
                // (permission-filtered) page, matching how the Home tab
                // already behaves.
                if (isAct) { setActiveMod(null); return; }
                setActiveMod(mod.id);
                const first = filterItems(mod.items as any[])[0];
                if (first) nav(first.p);
              }}
              style={{display:"flex",alignItems:"center",gap:6,padding:"11px 16px",
                      color:isAct?mod.col:T.fgMuted,fontWeight:isAct?700:500,
                      fontSize:isTablet?12:13,cursor:"pointer",background:isAct?`${mod.col}0d`:"transparent",
                      border:"none",borderRadius:"8px 8px 0 0",borderBottom:`2.5px solid ${isAct?mod.col:"transparent"}`,
                      whiteSpace:"nowrap",transition:"all .18s cubic-bezier(.4,0,.2,1)",flexShrink:0}}
              onMouseEnter={e=>{(e.currentTarget as any).style.color=mod.col;(e.currentTarget as any).style.background=`${mod.col}0d`;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.color=isAct?mod.col:T.fgMuted;(e.currentTarget as any).style.background=isAct?`${mod.col}0d`:"transparent";}}>
              {mod.label}
              {(modCnt as number)>0&&<Badge n={modCnt as number} col={mod.col}/>}
              <ChevronDown size={11} style={{transform:isAct?"rotate(180deg)":"none",transition:"transform .2s"}}/>
            </button>
          );
        })}
      </div>

      {/* ── SUB-NAV COMMAND BAR — hidden on phone ─────────────────── */}
      {activeModDef && (
        <div className="sub-nav-bar"
             style={{background:"#fff",borderBottom:`1px solid ${T.border}`,
                     boxShadow:"0 2px 8px rgba(16,24,40,.05)",
                     display:"flex",alignItems:"center",padding:"7px 14px",gap:6,
                     overflowX:"auto",flexShrink:0,WebkitOverflowScrolling:"touch" as any}}>
          <span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,fontWeight:700,color:"#fff",
                        background:activeModDef.col,padding:"3px 10px",borderRadius:99,
                        whiteSpace:"nowrap",marginRight:4,flexShrink:0,letterSpacing:".01em"}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"rgba(255,255,255,.85)",flexShrink:0}}/>
            {activeModDef.label}
          </span>
          {filterItems(activeModDef.items).map(item=>{
            const isAct=loc.pathname===item.p||(item.p!=="/dashboard"&&loc.pathname.startsWith(item.p));
            const n=cnt[(item as any).b as string]||0;
            return(
              <button key={item.p} onClick={()=>nav(item.p)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",
                        borderRadius:99,
                        background:isAct?`${activeModDef.col}16`:"transparent",
                        border:`1px solid ${isAct?`${activeModDef.col}33`:"transparent"}`,
                        color:isAct?activeModDef.col:T.fgMuted,
                        fontSize:isTablet?11:12,fontWeight:isAct?700:500,
                        cursor:"pointer",whiteSpace:"nowrap",transition:"all .12s"}}
                onMouseEnter={e=>{ if(!isAct){(e.currentTarget as any).style.background=T.bg;(e.currentTarget as any).style.color=activeModDef.col;} }}
                onMouseLeave={e=>{(e.currentTarget as any).style.background=isAct?`${activeModDef.col}16`:"transparent";(e.currentTarget as any).style.color=isAct?activeModDef.col:T.fgMuted;}}>
                <item.I size={12}/>{item.l}{n>0&&<Badge n={n} col={activeModDef.col}/>}
              </button>
            );
          })}
        </div>
      )}

      {/* ── MOBILE / TABLET NAV OVERLAY ───────────────────────────── */}
      {mobileNavOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div className="mob-nav-backdrop" onClick={() => setMobileNavOpen(false)}/>

          {/* Drawer */}
          <div style={{position:"fixed",left:0,top:0,bottom:0,
                       width:isPhone?"min(290px,88vw)":"min(320px,75vw)",
                       background:T.primary,overflowY:"auto",zIndex:8999,
                       boxShadow:"4px 0 24px rgba(0,0,0,0.45)",
                       display:"flex",flexDirection:"column"}}>
            {/* Drawer header */}
            <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.15)",
                         display:"flex",justifyContent:"space-between",alignItems:"center",
                         flexShrink:0}}>
              <div>
                <div style={{color:"#fff",fontWeight:700,fontSize:14}}>{sysName}</div>
                <div style={{color:"rgba(255,255,255,.5)",fontSize:10}}>{primaryRole?.replace(/_/g," ")||"Staff"}</div>
              </div>
              <button onClick={() => setMobileNavOpen(false)}
                style={{background:"rgba(255,255,255,.15)",border:"none",color:"#fff",
                        fontSize:16,cursor:"pointer",padding:"4px 8px",borderRadius:4,
                        display:"flex",alignItems:"center",justifyContent:"center",minWidth:30,minHeight:30}}>
                <XIcon size={16}/>
              </button>
            </div>

            {/* Facility switcher in drawer */}
            <div style={{padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
              <FacilitySwitcher/>
            </div>

            {/* Home */}
            <button onClick={() => { nav("/dashboard"); setMobileNavOpen(false); }}
              style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",
                      color:loc.pathname==="/dashboard"?"#fff":"rgba(255,255,255,.8)",
                      background:loc.pathname==="/dashboard"?"rgba(255,255,255,.18)":"transparent",
                      border:"none",cursor:"pointer",width:"100%",textAlign:"left",
                      fontSize:13,fontWeight:loc.pathname==="/dashboard"?700:400,
                      borderBottom:"1px solid rgba(255,255,255,0.1)"}}>
              <Home size={15}/> Home
            </button>

            {/* Modules */}
            {MODS.filter(m => canSee(m.roles)).map(mod => (
              <div key={mod.id}>
                <button onClick={() => {
                    // Same fix as the desktop ribbon tabs: tapping a module
                    // now navigates to its first page as well as expanding
                    // the accordion, instead of requiring a second tap on a
                    // sub-item before anything actually opens.
                    const willOpen = activeMod !== mod.id;
                    setActiveMod(a => a === mod.id ? null : mod.id);
                    if (willOpen) {
                      const first = filterItems(mod.items as any[])[0];
                      if (first) { nav(first.p); setMobileNavOpen(false); }
                    }
                  }}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",
                          color:"#fff",background:"transparent",border:"none",cursor:"pointer",
                          width:"100%",textAlign:"left",fontSize:13,
                          borderBottom:"1px solid rgba(255,255,255,0.08)",fontWeight:600}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:mod.col,
                                flexShrink:0,display:"inline-block"}}/>
                  <span style={{flex:1}}>{mod.label}</span>
                  <ChevronDown size={11}
                    style={{transform:activeMod===mod.id?"rotate(180deg)":"none",
                            transition:"transform .2s",flexShrink:0}}/>
                </button>
                {activeMod === mod.id && (
                  <div style={{background:"rgba(0,0,0,.15)"}}>
                    {filterItems(mod.items).map(item => {
                      const isAct = loc.pathname===item.p||(item.p!=="/dashboard"&&loc.pathname.startsWith(item.p));
                      const n = cnt[(item as any).b as string]||0;
                      return (
                        <button key={item.p}
                          onClick={() => { nav(item.p); setMobileNavOpen(false); }}
                          style={{display:"flex",alignItems:"center",gap:10,
                                  padding:"9px 16px 9px 34px",
                                  color:isAct?"#fff":"rgba(255,255,255,.75)",
                                  background:isAct?"rgba(255,255,255,.12)":"transparent",
                                  border:"none",cursor:"pointer",width:"100%",
                                  textAlign:"left",fontSize:12,
                                  borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                          <item.I size={12}/>
                          <span style={{flex:1}}>{item.l}</span>
                          {n>0&&<Badge n={n} col={mod.col}/>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── PAGE CONTENT ─────────────────────────────────────────────── */}
      <div className="app-page-content" style={{flex:1,overflowY:"auto",overflowX:"hidden",background:T.bg}}>
        {children}
      </div>
    </div>
  );
}
