/**
 * ProcurBosse  -- AppLayout v7.0 Microsoft Dynamics 365 Style
 * White top bar * Blue ribbon tabs * Sub-command bar * Live badge counts
 * EL5 MediProcure * Embu Level 5 Hospital
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useSessionTracker } from "@/hooks/useSessionTracker";
import { T } from "@/lib/theme";
import SystemBroadcastBanner from "@/components/SystemBroadcastBanner";
import NotificationPopup from "@/components/NotificationPopup";
import logoImg from "@/assets/logo.png";
import {
  Package, FileText, ShoppingCart, Truck, BarChart3, Settings, LogOut,
  ChevronDown, Building2, Shield, FileCheck, Database, Gavel, DollarSign,
  ClipboardList, BookOpen, PiggyBank, Layers, Receipt, BookMarked, Calendar,
  Scale, Search, Mail, Activity, UserCircle, TrendingUp, Eye, Lock,
  Phone, MessageSquare, Bell, Globe, Wrench, Home, Server,
  BarChart2, Code2, Radio, Archive, Users, RefreshCw, Printer
} from "lucide-react";

const db = supabase as any;

/* -- Live badge counts (realtime) ----------------------------------- */
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

/* -- Module / nav definitions ---------------------------------------- */
const MODS = [
  {id:"procurement",label:"Procurement",col:T.procurement,
   roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"],
   items:[
     {l:"Home",           p:"/dashboard",           I:Home},
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
   roles:["admin","superadmin","webmaster","procurement_manager","accountant"],
   items:[
     {l:"Finance Overview",   p:"/financials/dashboard",         I:TrendingUp},
     {l:"Budgets",            p:"/financials/budgets",           I:PiggyBank},
     {l:"Chart of Accounts",  p:"/financials/chart-of-accounts", I:BookOpen},
     {l:"Fixed Assets",       p:"/financials/fixed-assets",      I:Building2},
     {l:"Payment Vouchers",   p:"/vouchers/payment",             I:DollarSign, b:"payment_vouchers"},
     {l:"Receipt Vouchers",   p:"/vouchers/receipt",             I:Receipt},
     {l:"Journal Vouchers",   p:"/vouchers/journal",             I:BookMarked},
     {l:"Purchase Vouchers",  p:"/vouchers/purchase",            I:FileText},
     {l:"Sales Vouchers",     p:"/vouchers/sales",               I:FileText},
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
  {id:"reports",label:"Reports & BI",col:T.reports,roles:["admin","superadmin","webmaster","procurement_manager","accountant","database_admin"],
   items:[
     {l:"Analytics",    p:"/reports",      I:BarChart3},
     {l:"Print Engine", p:"/print-engine", I:Printer},
     {l:"Documents",    p:"/documents",    I:FileText},
     {l:"Audit Log",    p:"/audit-log",    I:Activity},
   ]},
  {id:"comms",label:"Communications",col:T.comms,roles:["admin","superadmin","webmaster"],
   items:[
     {l:"Email",     p:"/email",     I:Mail},
     {l:"SMS",       p:"/sms",       I:MessageSquare},
     {l:"Telephony", p:"/telephony", I:Phone},
     {l:"Reception", p:"/reception", I:Users},
   ]},
  {id:"admin",label:"Administration",col:T.system,
   roles:["admin","superadmin","webmaster","database_admin"],
   items:[
     {l:"Admin Panel",  p:"/admin/panel",    I:Settings},
     {l:"Users",        p:"/users",          I:Users},
     {l:"Facilities",   p:"/facilities",     I:Building2},
     {l:"IP Access",    p:"/admin/ip-access",I:Lock},
     {l:"Database",     p:"/admin/database", I:Database},
     {l:"DB Monitor",   p:"/admin/db-test",  I:Activity},
     {l:"Backup",       p:"/backup",         I:Archive},
     {l:"ODBC/MySQL",   p:"/odbc",           I:Server},
     {l:"Webmaster",    p:"/webmaster",      I:Globe},
     {l:"GUI Editor",   p:"/gui-editor",     I:Code2},
     {l:"Settings",     p:"/settings",       I:Wrench},
     {l:"Superadmin",   p:"/superadmin",     I:Radio},
   ]},
];


/* -- Live module gating  -- reads system_modules table -------------------- */
function useEnabledModules() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    try {
      const { data } = await db.from("system_modules").select("module_id,is_enabled");
      if (data) {
        const enabledSet = new Set<string>(
          (data as any[]).filter(m => m.is_enabled !== false).map((m: any) => m.module_id)
        );
        setEnabled(enabledSet);
      }
    } catch { /* default all enabled if table missing */ }
  }, []);
  useEffect(() => {
    load();
    const ch = db.channel("modules:nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_modules" }, load)
      .subscribe();
    return () => db.removeChannel(ch);
  }, [load]);
  return enabled;
}

export default function AppLayout({children}:{children:React.ReactNode}) {
  const loc  = useLocation();
  const nav  = useNavigate();
  const {user,profile,roles,signOut,primaryRole} = useAuth();
  const s    = useSystemSettings();
  const cnt  = useLiveCounts();
  const enabledMods = useEnabledModules();
  useSessionTracker(); // v8.0 -- live session tracking + user action log

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); setSearchOpen(false); return; }
    try {
      // Inline global search across key tables
      const [r1,r2,r3,r4] = await Promise.allSettled([
        (supabase as any).from("requisitions").select("id,title,requisition_number,status").ilike("title",`%${q}%`).limit(3),
        (supabase as any).from("purchase_orders").select("id,po_number,status").ilike("po_number",`%${q}%`).limit(3),
        (supabase as any).from("suppliers").select("id,name,status").ilike("name",`%${q}%`).limit(3),
        (supabase as any).from("items").select("id,name,sku,category").ilike("name",`%${q}%`).limit(3),
      ]);
      const flat: {label:string;type:string;path:string}[] = [];
      if (r1.status==="fulfilled") (r1.value.data||[]).forEach((x:any)=>flat.push({label:x.title||x.requisition_number||"Req",type:"Requisition",path:"/requisitions"}));
      if (r2.status==="fulfilled") (r2.value.data||[]).forEach((x:any)=>flat.push({label:x.po_number||"PO",type:"Purchase Order",path:"/purchase-orders"}));
      if (r3.status==="fulfilled") (r3.value.data||[]).forEach((x:any)=>flat.push({label:x.name,type:"Supplier",path:"/suppliers"}));
      if (r4.status==="fulfilled") (r4.value.data||[]).forEach((x:any)=>flat.push({label:x.name,type:"Item",path:"/items"}));
      const results = flat;
      setSearchResults(results); setSearchOpen(results.length > 0);
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const [activeMod, setActiveMod] = useState<string|null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const isAdmin   = roles?.some(r=>["admin","superadmin","webmaster"].includes(r));
  const isDbAdmin = roles?.some(r=>["database_admin"].includes(r)) || isAdmin;
  const sysName   = s.system_name   || "EL5 MediProcure";
  const hospName  = s.hospital_name || "Embu Level 5 Hospital";

  const canSee = useCallback((modRoles:string[], moduleId?:string)=>{
    // Check if module is enabled in system_modules (admins always see all)
    if(moduleId && !isAdmin && enabledMods.size > 0 && !enabledMods.has(moduleId)) return false;
    if(!modRoles.length) return true;
    if(isAdmin) return true;
    return modRoles.some(r=>roles?.includes(r));
  },[roles,isAdmin,enabledMods]);

  // Auto-detect active module
  useEffect(()=>{
    const found = MODS.find(m=>m.items.some(i=>i.p!=="/dashboard"&&loc.pathname.startsWith(i.p)));
    setActiveMod(found?.id||null);
  },[loc.pathname]);

  const activeModDef = MODS.find(m=>m.id===activeMod);
  const totalAlerts = (cnt.requisitions||0)+(cnt.purchase_orders||0)+(cnt.payment_vouchers||0);

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:T.bg,fontFamily:"'Segoe UI','Inter',system-ui,sans-serif",color:T.fg,overflow:"hidden"}}>
      <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <SystemBroadcastBanner/>

      {/* === TOP BAR (D365 blue header) =========================== */}
      <div style={{height:44,background:T.primary,display:"flex",alignItems:"center",padding:"0 14px",gap:10,flexShrink:0,boxShadow:"0 2px 6px rgba(0,0,0,0.25)"}}>
        <img src={logoImg} alt="" style={{width:24,height:24,borderRadius:3,objectFit:"contain",background:"rgba(255,255,255,.12)",padding:2,flexShrink:0}}/>
        <div style={{lineHeight:1}}>
          <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{sysName}</div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.6)",letterSpacing:".05em"}}>{hospName}</div>
        </div>
        <div style={{marginLeft:10,display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"3px 10px",background:"rgba(255,255,255,.12)",borderRadius:99,fontSize:11,color:"rgba(255,255,255,.9)",fontWeight:600}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"livePulse 2s ease-in-out infinite"}}/>
            EL5 MediProcure
          </div>
          {/* Global search bar */}
          <div ref={searchRef} style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",background:"rgba(255,255,255,.15)",borderRadius:6,padding:"4px 10px",gap:6,width:220}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length>=2 && setSearchOpen(true)}
                placeholder="Search everything..."
                style={{background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:12,width:"100%",fontFamily:"inherit"}}
              />
              {searchQuery&&<button onClick={()=>{setSearchQuery("");setSearchResults([]);setSearchOpen(false);}} style={{background:"none",border:"none",color:"rgba(255,255,255,.6)",cursor:"pointer",padding:0,fontSize:14,lineHeight:1}}>x</button>}
            </div>
            {searchOpen&&searchResults.length>0&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,width:320,background:"#fff",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.18)",border:"1px solid #e0e0e0",zIndex:9999,maxHeight:360,overflowY:"auto"}}>
                <div style={{padding:"6px 10px",fontSize:10,fontWeight:700,color:"#888",borderBottom:"1px solid #f0f0f0",textTransform:"uppercase",letterSpacing:.5}}>{searchResults.length} results for "{searchQuery}"</div>
                {searchResults.map((r,i)=>(
                  <div key={i} onClick={()=>{nav(r.url);setSearchOpen(false);setSearchQuery("");}}
                    style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid #f5f5f5",display:"flex",alignItems:"center",gap:10}}
                    onMouseEnter={e=>(e.currentTarget.style.background="#f5f8ff")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    <div style={{width:28,height:28,borderRadius:6,background:"#e8f4fd",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#0078d4",flexShrink:0}}>{r.table.slice(0,2).toUpperCase()}</div>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</div>
                      <div style={{fontSize:11,color:"#888",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.subtitle} <span style={{color:"#bbb"}}>-- {r.table}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{flex:1}}/>
        {totalAlerts>0&&<div style={{padding:"2px 10px",borderRadius:T.r,background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.25)",fontSize:11,fontWeight:700,color:"#fff"}}>{totalAlerts} pending</div>}
        <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"rgba(255,255,255,.65)"}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"#00e676",display:"inline-block",animation:"livePulse 2s infinite"}}/>Live
        </div>
        <div style={{position:"relative"}}>
          <button onClick={()=>setNotifOpen(p=>!p)} style={{padding:"4px 6px",background:notifOpen?"rgba(255,255,255,.15)":"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.85)",borderRadius:T.r,display:"flex",alignItems:"center",position:"relative"}}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.15)")}
            onMouseLeave={e=>(e.currentTarget.style.background=notifOpen?"rgba(255,255,255,.15)":"transparent")}>
            <Bell size={15}/>
            {(cnt.notifications||0)>0&&<span style={{position:"absolute",top:1,right:1,width:7,height:7,borderRadius:"50%",background:"#ff5252"}}/>}
          </button>
          {notifOpen&&<div style={{position:"absolute",top:"calc(100% + 6px)",right:0,zIndex:300}}><NotificationPopup onClose={()=>setNotifOpen(false)}/></div>}
        </div>
        <div style={{padding:"2px 10px",borderRadius:T.r,background:"rgba(255,255,255,.12)",fontSize:10,fontWeight:600,color:"rgba(255,255,255,.9)"}}>{primaryRole?.replace(/_/g," ")||"Staff"}</div>
        <button onClick={()=>nav("/profile")} style={{background:"transparent",border:"none",cursor:"pointer",padding:0,borderRadius:"50%"}}>
          {profile?.avatar_url
            ?<img src={profile.avatar_url} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"cover"}}/>
            :<div style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,.18)",display:"flex",alignItems:"center",justifyContent:"center"}}><UserCircle size={16} color="#fff"/></div>}
        </button>
        <button onClick={()=>{signOut();nav("/login");}} title="Sign out" style={{padding:"4px 6px",background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.7)",borderRadius:T.r,display:"flex",alignItems:"center"}}
          onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.12)")}
          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
          <LogOut size={14}/>
        </button>
      </div>

      {/* === ADMIN QUICK BAR ===================================== */}
      {(isAdmin||isDbAdmin)&&(
        <div style={{background:T.accent,padding:"3px 14px",display:"flex",gap:5,alignItems:"center",flexShrink:0,overflowX:"auto"}}>
          <span style={{fontSize:10,fontWeight:800,color:"#fff",marginRight:3,whiteSpace:"nowrap"}}> ADMIN</span>
          {[{l:"Users",p:"/users"},{l:"IP Stats",p:"/admin/ip-access"},{l:"DB Monitor",p:"/admin/db-test"},{l:"Settings",p:"/settings"},{l:"Webmaster",p:"/webmaster"},{l:"Superadmin",p:"/superadmin"}].map(a=>(
            <button key={a.p} onClick={()=>nav(a.p)} style={{padding:"2px 10px",borderRadius:T.r,background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.28)",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}
              onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,.28)")}
              onMouseLeave={e=>(e.currentTarget.style.background="rgba(255,255,255,.18)")}>
              {a.l}
            </button>
          ))}
        </div>
      )}

      {/* === D365 RIBBON (module tabs) ============================ */}
      <div style={{background:"#fff",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"stretch",padding:"0 8px",flexShrink:0,boxShadow:"0 1px 3px rgba(0,0,0,.06)",overflowX:"auto"}}>
        <button onClick={()=>{setActiveMod(null);nav("/dashboard");}}
          style={{display:"flex",alignItems:"center",gap:5,padding:"10px 14px",borderBottom:`3px solid ${loc.pathname==="/dashboard"?T.primary:"transparent"}`,borderTop:"none",borderLeft:"none",borderRight:"none",color:loc.pathname==="/dashboard"?T.primary:T.fgMuted,fontWeight:loc.pathname==="/dashboard"?600:400,fontSize:13,cursor:"pointer",background:"transparent",whiteSpace:"nowrap",transition:"all .15s"}}
          onMouseEnter={e=>{(e.currentTarget as any).style.color=T.primary}}
          onMouseLeave={e=>{(e.currentTarget as any).style.color=loc.pathname==="/dashboard"?T.primary:T.fgMuted}}>
          <Home size={13}/>Home
        </button>
        {MODS.filter(m=>canSee(m.roles, m.id)).map(mod=>{
          const isAct=activeMod===mod.id;
          const modCnt=mod.items.reduce((a,i)=>a+(cnt[(i as any).b as string]||0),0);
          return(
            <button key={mod.id} onClick={()=>setActiveMod(isAct?null:mod.id)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"10px 14px",borderBottom:`3px solid ${isAct?mod.col:"transparent"}`,borderTop:"none",borderLeft:"none",borderRight:"none",color:isAct?mod.col:T.fgMuted,fontWeight:isAct?600:400,fontSize:13,cursor:"pointer",background:isAct?`${mod.col}08`:"transparent",whiteSpace:"nowrap",transition:"all .15s"}}
              onMouseEnter={e=>{(e.currentTarget as any).style.color=mod.col;(e.currentTarget as any).style.background=`${mod.col}08`;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.color=isAct?mod.col:T.fgMuted;(e.currentTarget as any).style.background=isAct?`${mod.col}08`:"transparent";}}>
              {mod.label}
              {modCnt>0&&<Badge n={modCnt} col={mod.col}/>}
              <ChevronDown size={11} style={{transform:isAct?"rotate(180deg)":"none",transition:"transform .2s"}}/>
            </button>
          );
        })}
      </div>

      {/* === SUB-NAV COMMAND BAR ================================== */}
      {activeModDef&&(
        <div style={{background:"#f8f9fa",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"4px 12px",gap:2,overflowX:"auto",flexShrink:0}}>
          {activeModDef.items.map(item=>{
            const isAct=loc.pathname===item.p||(item.p!=="/dashboard"&&loc.pathname.startsWith(item.p));
            const n=cnt[(item as any).b as string]||0;
            return(
              <button key={item.p} onClick={()=>nav(item.p)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:T.r,background:isAct?`${activeModDef.col}12`:"transparent",color:isAct?activeModDef.col:T.fgMuted,fontSize:12,fontWeight:isAct?600:400,cursor:"pointer",border:"none",whiteSpace:"nowrap",transition:"all .12s"}}
                onMouseEnter={e=>{(e.currentTarget as any).style.background=`${activeModDef.col}10`;(e.currentTarget as any).style.color=activeModDef.col;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.background=isAct?`${activeModDef.col}12`:"transparent";(e.currentTarget as any).style.color=isAct?activeModDef.col:T.fgMuted;}}>
                <item.I size={12}/>{item.l}{n>0&&<Badge n={n} col={activeModDef.col}/>}
              </button>
            );
          })}
        </div>
      )}

      {/* === PAGE CONTENT ======================================== */}
      <div style={{flex:1,overflowY:"auto",overflowX:"hidden",background:T.bg}}>
        {children}
      </div>
    </div>
  );
}

import type React from "react";
