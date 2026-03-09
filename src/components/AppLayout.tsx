import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationPopup";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Home, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Globe, Mail, Archive, Wifi, Activity, ChevronRight,
  Menu, X, UserCircle, AlertTriangle, ChevronLeft
} from "lucide-react";

/* ─────────────────────────── ROLE CONFIG ─────────────────────────── */
const ROLE_LABELS: Record<string,string> = {
  admin:"Administrator", procurement_manager:"Procurement Manager",
  procurement_officer:"Procurement Officer", inventory_manager:"Inventory Manager",
  warehouse_officer:"Warehouse Officer", requisitioner:"Requisitioner",
};

const MODULES = [
  { id:"home",       label:"Dashboard",   icon:Home,        color:"#1a3a6b", path:"/dashboard", roles:[], sub:[] },
  { id:"procurement",label:"Procurement", icon:ShoppingCart,color:"#0078d4", path:"/requisitions",
    roles:["admin","procurement_manager","procurement_officer","requisitioner"],
    sub:[
      {label:"Requisitions",     path:"/requisitions",         icon:ClipboardList, roles:[]},
      {label:"Purchase Orders",  path:"/purchase-orders",      icon:ShoppingCart,  roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Goods Received",   path:"/goods-received",       icon:Package,       roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
      {label:"Suppliers",        path:"/suppliers",            icon:Truck,         roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Contracts",        path:"/contracts",            icon:FileCheck,     roles:["admin","procurement_manager"]},
      {label:"Tenders",          path:"/tenders",              icon:Gavel,         roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Bid Evaluations",  path:"/bid-evaluations",      icon:Scale,         roles:["admin","procurement_manager"]},
      {label:"Procurement Plan", path:"/procurement-planning", icon:Calendar,      roles:["admin","procurement_manager"]},
    ]},
  { id:"vouchers",   label:"Vouchers",    icon:FileText,    color:"#C45911", path:"/vouchers/payment",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Payment Vouchers",  path:"/vouchers/payment",  icon:DollarSign, roles:[]},
      {label:"Receipt Vouchers",  path:"/vouchers/receipt",  icon:Receipt,    roles:["admin","procurement_manager"]},
      {label:"Journal Vouchers",  path:"/vouchers/journal",  icon:BookMarked, roles:["admin","procurement_manager"]},
      {label:"Purchase Vouchers", path:"/vouchers/purchase", icon:FileText,   roles:["admin","procurement_manager"]},
      {label:"Sales Vouchers",    path:"/vouchers/sales",    icon:FileText,   roles:["admin","procurement_manager"]},
    ]},
  { id:"financials", label:"Financials",  icon:BarChart3,   color:"#1F6090", path:"/financials/dashboard",
    roles:["admin","procurement_manager"],
    sub:[
      {label:"Finance Dashboard",   path:"/financials/dashboard",        icon:BarChart3,  roles:[]},
      {label:"Chart of Accounts",   path:"/financials/chart-of-accounts",icon:BookOpen,   roles:[]},
      {label:"Budgets",             path:"/financials/budgets",          icon:PiggyBank,  roles:[]},
      {label:"Fixed Assets",        path:"/financials/fixed-assets",     icon:Building2,  roles:[]},
    ]},
  { id:"inventory",  label:"Inventory",   icon:Package,     color:"#107c10", path:"/items",
    roles:["admin","procurement_manager","inventory_manager","warehouse_officer"],
    sub:[
      {label:"Items",       path:"/items",       icon:Package,   roles:[]},
      {label:"Categories",  path:"/categories",  icon:Layers,    roles:["admin","inventory_manager","procurement_manager"]},
      {label:"Departments", path:"/departments", icon:Building2, roles:["admin","inventory_manager","procurement_manager"]},
      {label:"Scanner",     path:"/scanner",     icon:Search,    roles:["admin","inventory_manager","warehouse_officer"]},
    ]},
  { id:"quality",    label:"Quality",     icon:Shield,      color:"#00695C", path:"/quality/dashboard",
    roles:["admin","procurement_manager","warehouse_officer"],
    sub:[
      {label:"QC Dashboard",    path:"/quality/dashboard",       icon:Shield,        roles:[]},
      {label:"Inspections",     path:"/quality/inspections",     icon:ClipboardList, roles:[]},
      {label:"Non-Conformance", path:"/quality/non-conformance", icon:AlertTriangle, roles:[]},
    ]},
  { id:"reports",    label:"Reports",     icon:BarChart3,   color:"#5C2D91", path:"/reports",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Reports",   path:"/reports",   icon:BarChart3, roles:[]},
      {label:"Documents", path:"/documents", icon:FileCheck, roles:[]},
      {label:"Audit Log", path:"/audit-log", icon:Activity,  roles:["admin","procurement_manager"]},
    ]},
  { id:"admin",      label:"Admin",       icon:Database,    color:"#374151", path:"/admin/panel",
    roles:["admin"],
    sub:[
      {label:"Admin Panel",    path:"/admin/panel",   icon:Settings,  roles:[]},
      {label:"Users",          path:"/users",          icon:Users,     roles:[]},
      {label:"Database Admin", path:"/admin/database", icon:Database,  roles:[]},
      {label:"Settings",       path:"/settings",       icon:Settings,  roles:[]},
      {label:"Email",          path:"/email",          icon:Mail,      roles:[]},
      {label:"Backup",         path:"/backup",         icon:Archive,   roles:[]},
      {label:"Webmaster",      path:"/webmaster",      icon:Globe,     roles:[]},
      {label:"Audit Log",      path:"/audit-log",      icon:Activity,  roles:[]},
    ]},
];

const PAGE_HEADERS: Record<string,{module:string;label:string}> = {
  "/dashboard":{module:"Home",label:"Dashboard"},
  "/requisitions":{module:"Procurement",label:"Requisitions"},
  "/purchase-orders":{module:"Procurement",label:"Purchase Orders"},
  "/goods-received":{module:"Procurement",label:"Goods Received"},
  "/suppliers":{module:"Procurement",label:"Suppliers"},
  "/contracts":{module:"Procurement",label:"Contracts"},
  "/tenders":{module:"Procurement",label:"Tenders"},
  "/bid-evaluations":{module:"Procurement",label:"Bid Evaluations"},
  "/procurement-planning":{module:"Procurement",label:"Procurement Plan"},
  "/vouchers/payment":{module:"Vouchers",label:"Payment Vouchers"},
  "/vouchers/receipt":{module:"Vouchers",label:"Receipt Vouchers"},
  "/vouchers/journal":{module:"Vouchers",label:"Journal Vouchers"},
  "/vouchers/purchase":{module:"Vouchers",label:"Purchase Vouchers"},
  "/vouchers/sales":{module:"Vouchers",label:"Sales Vouchers"},
  "/financials/dashboard":{module:"Financials",label:"Finance Dashboard"},
  "/financials/chart-of-accounts":{module:"Financials",label:"Chart of Accounts"},
  "/financials/budgets":{module:"Financials",label:"Budgets"},
  "/financials/fixed-assets":{module:"Financials",label:"Fixed Assets"},
  "/items":{module:"Inventory",label:"Items"},
  "/categories":{module:"Inventory",label:"Categories"},
  "/departments":{module:"Inventory",label:"Departments"},
  "/scanner":{module:"Inventory",label:"Barcode Scanner"},
  "/quality/dashboard":{module:"Quality",label:"QC Dashboard"},
  "/quality/inspections":{module:"Quality",label:"Inspections"},
  "/quality/non-conformance":{module:"Quality",label:"Non-Conformance"},
  "/reports":{module:"Reports",label:"Reports"},
  "/documents":{module:"Reports",label:"Documents"},
  "/audit-log":{module:"Reports",label:"Audit Log"},
  "/email":{module:"Communications",label:"Email"},
  "/inbox":{module:"Communications",label:"Inbox"},
  "/users":{module:"Admin",label:"Users"},
  "/admin/database":{module:"Admin",label:"Database Admin"},
  "/admin/panel":{module:"Admin",label:"Admin Panel"},
  "/webmaster":{module:"Admin",label:"Webmaster"},
  "/settings":{module:"Admin",label:"Settings"},
  "/backup":{module:"Admin",label:"Backup"},
  "/profile":{module:"Profile",label:"My Profile"},
};

/* ─────────────────────────── COMPONENT ─────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, signOut, user } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [activeMenu,   setActiveMenu]   = useState<string|null>(null);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl,      setLogoUrl]      = useState<string|null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuTimers  = useRef<Record<string,ReturnType<typeof setTimeout>>>({});

  const primaryRole = (
    roles.includes("admin")               ? "admin" :
    roles.includes("procurement_manager") ? "procurement_manager" :
    roles.includes("procurement_officer") ? "procurement_officer" :
    roles.includes("inventory_manager")   ? "inventory_manager" :
    roles.includes("warehouse_officer")   ? "warehouse_officer" : "requisitioner"
  );
  const isAdmin = roles.includes("admin");

  const visibleModules = MODULES
    .filter(m => m.roles.length===0 || m.roles.some(r=>roles.includes(r)))
    .map(m => ({
      ...m,
      sub: m.sub.filter(s => (s.roles?.length??0)===0 || (s.roles??[]).some((r:string)=>roles.includes(r)))
    }));

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value")
      .in("key",["system_name","hospital_name","system_logo_url"])
      .then(({data}:any)=>{
        const m:Record<string,string>={};
        (data||[]).forEach((r:any)=>{ if(r.key) m[r.key]=r.value; });
        if(m.system_name)     setSysName(m.system_name);
        if(m.hospital_name)   setHospitalName(m.hospital_name);
        if(m.system_logo_url) setLogoUrl(m.system_logo_url);
      });
  },[]);

  useEffect(()=>{
    if(!user) return;
    const fetch = async()=>{
      const{count}=await(supabase as any).from("inbox_items")
        .select("id",{count:"exact",head:true})
        .eq("to_user_id",user.id).eq("status","unread");
      setUnreadCount(count||0);
    };
    fetch();
    const ch=(supabase as any).channel("layout-inbox")
      .on("postgres_changes",{event:"*",schema:"public",table:"inbox_items"},fetch).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[user]);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      if(userMenuRef.current&&!userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  // Close mobile menu on route change
  useEffect(()=>{ setMobileOpen(false); setActiveMenu(null); },[location.pathname]);

  const pathHeader = PAGE_HEADERS[location.pathname]||{module:"",label:""};
  const isActive = (path:string) => location.pathname===path||location.pathname.startsWith(path+"/");
  const enterMenu = (id:string)=>{ clearTimeout(menuTimers.current[id]); setActiveMenu(id); };
  const leaveMenu = (id:string)=>{ menuTimers.current[id]=setTimeout(()=>setActiveMenu(p=>p===id?null:p),200); };

  /* ── DESKTOP DROPDOWN ── */
  const DropDown = ({mod}:{mod:typeof MODULES[0]}) => {
    const open = activeMenu===mod.id;
    return (
      <div style={{position:"relative",display:"flex",alignItems:"stretch",height:"100%"}}
        onMouseEnter={()=>enterMenu(mod.id)} onMouseLeave={()=>leaveMenu(mod.id)}>
        <button
          onClick={()=>mod.sub.length?setActiveMenu(open?null:mod.id):navigate(mod.path)}
          style={{
            display:"flex",alignItems:"center",gap:4,padding:"0 9px",border:"none",
            fontSize:10.5,fontWeight:700,letterSpacing:"0.04em",cursor:"pointer",
            whiteSpace:"nowrap",background:"transparent",
            color:mod.sub.some(s=>isActive(s.path))||(!mod.sub.length&&isActive(mod.path))
              ?"#fff":"rgba(255,255,255,0.6)",
            borderBottom:mod.sub.some(s=>isActive(s.path))||(!mod.sub.length&&isActive(mod.path))
              ?`2px solid ${mod.color}`:"2px solid transparent",
            transition:"all 0.12s",
          }}>
          <mod.icon style={{width:11,height:11,flexShrink:0}}/>
          {mod.label}
          {mod.sub.length>0&&<ChevronDown style={{width:8,height:8,opacity:0.5}}/>}
        </button>
        {mod.sub.length>0&&open&&(
          <div style={{position:"absolute",top:"100%",left:0,marginTop:1,minWidth:200,
            background:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,0.16)",
            border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden",zIndex:300}}>
            <div style={{padding:"5px 12px 4px",background:`linear-gradient(90deg,${mod.color}18,${mod.color}06)`,borderBottom:`2px solid ${mod.color}28`}}>
              <span style={{fontSize:9,fontWeight:800,color:mod.color,letterSpacing:"0.1em",textTransform:"uppercase" as const}}>{mod.label}</span>
            </div>
            {mod.sub.map(s=>(
              <Link key={s.path} to={s.path} onClick={()=>setActiveMenu(null)}
                style={{
                  display:"flex",alignItems:"center",gap:8,padding:"8px 13px",
                  textDecoration:"none",fontSize:12,fontWeight:isActive(s.path)?700:500,
                  color:isActive(s.path)?"#fff":"#374151",
                  background:isActive(s.path)?mod.color:"transparent",transition:"all 0.1s",
                }}
                onMouseEnter={e=>{if(!isActive(s.path)){(e.currentTarget as HTMLElement).style.background=`${mod.color}10`;(e.currentTarget as HTMLElement).style.color=mod.color;}}}
                onMouseLeave={e=>{if(!isActive(s.path)){(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="#374151";}}}>
                <s.icon style={{width:12,height:12,flexShrink:0}}/>{s.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:"#f0f2f5",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* ══ TOP NAVBAR ══ */}
      <header style={{
        display:"flex",alignItems:"center",height:"var(--nav-h,52px)",
        padding:"0 10px",gap:4,position:"sticky",top:0,zIndex:200,flexShrink:0,
        background:"linear-gradient(90deg,#0a2558 0%,#1a3a6b 55%,#1d4a87 100%)",
        boxShadow:"0 2px 16px rgba(0,0,0,0.28)",
      }}>

        {/* Logo */}
        <Link to="/dashboard" style={{display:"flex",alignItems:"center",gap:7,marginRight:4,textDecoration:"none",flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:6,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}}>
            {logoUrl
              ?<img src={logoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
              :<img src="/src/assets/embu-county-logo.jpg" alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            }
          </div>
          <div style={{lineHeight:1,display:"flex",flexDirection:"column"}}>
            <span style={{fontSize:11.5,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>{sysName}</span>
            <span style={{fontSize:8,color:"rgba(255,255,255,0.38)",marginTop:1}}>{hospitalName}</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="nav-desktop" style={{display:"flex",alignItems:"stretch",height:"100%",flex:1,overflow:"hidden",gap:0}}>
          {visibleModules.map(mod=><DropDown key={mod.id} mod={mod}/>)}
        </nav>

        {/* Right controls */}
        <div style={{display:"flex",alignItems:"center",gap:2,marginLeft:"auto",flexShrink:0}}>
          {/* Email */}
          <button onClick={()=>navigate("/email")} title="Email"
            style={{position:"relative",padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <Mail style={{width:14,height:14}}/>
            {unreadCount>0&&<span style={{position:"absolute",top:-2,right:-2,minWidth:14,height:14,borderRadius:8,background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 3px"}}>{unreadCount>9?"9+":unreadCount}</span>}
          </button>

          {/* Notifications */}
          <NotificationBell logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName}/>

          {/* User menu */}
          <div style={{position:"relative",marginLeft:2}} ref={userMenuRef}>
            <button onClick={()=>setUserMenuOpen(v=>!v)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"4px 7px",borderRadius:6,border:"none",background:"rgba(255,255,255,0.08)",cursor:"pointer",color:"rgba(255,255,255,0.85)",transition:"all 0.12s"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.14)"}
              onMouseLeave={e=>{if(!userMenuOpen)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)";}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff",flexShrink:0}}>
                {profile?.full_name?.[0]?.toUpperCase()||"U"}
              </div>
              <div style={{textAlign:"left",lineHeight:1}} className="hidden-sm">
                <div style={{fontSize:10.5,fontWeight:700,color:"#fff"}}>{profile?.full_name?.split(" ")[0]||"User"}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.38)",marginTop:1}}>{ROLE_LABELS[primaryRole]||"User"}</div>
              </div>
              <ChevronDown style={{width:9,height:9,color:"rgba(255,255,255,0.35)"}} className="hidden-sm"/>
            </button>

            {userMenuOpen&&(
              <div style={{position:"absolute",right:0,top:"100%",marginTop:5,minWidth:210,background:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden",zIndex:300}}>
                <div style={{padding:"10px 13px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{profile?.full_name}</div>
                  <div style={{fontSize:10,color:"#6b7280",marginTop:1}}>{profile?.email||user?.email}</div>
                  <span style={{display:"inline-block",marginTop:4,fontSize:9,padding:"2px 7px",borderRadius:4,fontWeight:700,background:"#1a3a6b12",color:"#1a3a6b"}}>{ROLE_LABELS[primaryRole]}</span>
                </div>
                <div style={{padding:"4px 0"}}>
                  {[
                    {label:"My Profile",   path:"/profile",      icon:UserCircle, show:true},
                    {label:"Email",        path:"/email",         icon:Mail,       show:true},
                    {label:"Settings",     path:"/settings",      icon:Settings,   show:isAdmin},
                    {label:"Admin Panel",  path:"/admin/panel",   icon:Database,   show:isAdmin},
                    {label:"Users",        path:"/users",         icon:Users,      show:isAdmin},
                  ].filter(i=>i.show).map(item=>(
                    <button key={item.path} onClick={()=>{navigate(item.path);setUserMenuOpen(false);}}
                      style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 13px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,color:"#374151",textAlign:"left" as const}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <item.icon style={{width:13,height:13,color:"#9ca3af"}}/>{item.label}
                    </button>
                  ))}
                  <div style={{margin:"3px 12px",borderTop:"1px solid #f3f4f6"}}/>
                  <button onClick={()=>{signOut();setUserMenuOpen(false);}}
                    style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 13px",border:"none",background:"transparent",cursor:"pointer",fontSize:12,color:"#dc2626",textAlign:"left" as const}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fef2f2"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <LogOut style={{width:13,height:13}}/>Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="nav-mobile-btn" onClick={()=>setMobileOpen(v=>!v)}
            style={{display:"none",padding:6,borderRadius:6,background:"rgba(255,255,255,0.1)",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.8)",lineHeight:0,marginLeft:4}}>
            {mobileOpen?<X style={{width:16,height:16}}/>:<Menu style={{width:16,height:16}}/>}
          </button>
        </div>
      </header>

      {/* ── BREADCRUMB ── */}
      <div style={{
        display:"flex",alignItems:"center",gap:6,padding:"5px 14px",
        background:"#fff",borderBottom:"1px solid #e5e7eb",fontSize:11,color:"#6b7280",flexShrink:0,
      }}>
        <Home style={{width:10,height:10,color:"#9ca3af",flexShrink:0}}/>
        {pathHeader.module&&<><span style={{color:"#d1d5db"}}>›</span><span style={{color:"#9ca3af"}}>{pathHeader.module}</span></>}
        {pathHeader.label&&<><span style={{color:"#d1d5db"}}>›</span><span style={{fontWeight:600,color:"#374151"}}>{pathHeader.label}</span></>}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6}}>
          <div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e"}}/>
          <span style={{fontSize:9,color:"#22c55e",fontWeight:700}}>LIVE</span>
          <span style={{fontSize:9,color:"#9ca3af",marginLeft:4}} className="hidden-sm">
            {new Date().toLocaleDateString("en-KE",{weekday:"short",day:"2-digit",month:"short"})}
          </span>
        </div>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:400}} onClick={()=>setMobileOpen(false)}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)"}}/>
          <div onClick={e=>e.stopPropagation()} style={{
            position:"absolute",top:0,left:0,bottom:0,width:280,
            background:"#fff",overflowY:"auto",
            boxShadow:"4px 0 20px rgba(0,0,0,0.18)",
            animation:"slideIn 0.22s ease-out",
          }}>
            {/* Drawer header */}
            <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:6,overflow:"hidden",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}}>
                {logoUrl
                  ?<img src={logoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
                  :<img src="/src/assets/embu-county-logo.jpg" alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
                }
              </div>
              <div style={{flex:1,lineHeight:1}}>
                <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>{sysName}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.45)"}}>{hospitalName}</div>
              </div>
              <button onClick={()=>setMobileOpen(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:5,cursor:"pointer",color:"#fff",lineHeight:0}}>
                <X style={{width:14,height:14}}/>
              </button>
            </div>

            {/* Drawer menu */}
            <div style={{padding:"8px 0"}}>
              {visibleModules.map(mod=>(
                <div key={mod.id}>
                  {mod.sub.length===0?(
                    <Link to={mod.path} style={{
                      display:"flex",alignItems:"center",gap:10,padding:"10px 16px",
                      textDecoration:"none",fontSize:13,fontWeight:isActive(mod.path)?700:500,
                      color:isActive(mod.path)?mod.color:"#374151",
                      background:isActive(mod.path)?`${mod.color}10`:"transparent",
                      borderLeft:isActive(mod.path)?`3px solid ${mod.color}`:"3px solid transparent",
                    }}>
                      <mod.icon style={{width:15,height:15,flexShrink:0,color:isActive(mod.path)?mod.color:"#9ca3af"}}/>{mod.label}
                    </Link>
                  ):(
                    <>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px 4px",fontSize:9,fontWeight:800,color:mod.color,letterSpacing:"0.1em",textTransform:"uppercase" as const}}>
                        <mod.icon style={{width:11,height:11}}/>{mod.label}
                      </div>
                      {mod.sub.map(s=>(
                        <Link key={s.path} to={s.path}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"9px 20px",textDecoration:"none",fontSize:12,color:isActive(s.path)?mod.color:"#6b7280",fontWeight:isActive(s.path)?700:400,background:isActive(s.path)?`${mod.color}08`:"transparent",borderLeft:isActive(s.path)?`3px solid ${mod.color}`:"3px solid transparent"}}>
                          <s.icon style={{width:13,height:13,flexShrink:0}}/>{s.label}
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Drawer footer */}
            <div style={{padding:"10px 14px",borderTop:"1px solid #f3f4f6",background:"#f9fafb",marginTop:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"#1a3a6b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>
                  {profile?.full_name?.[0]?.toUpperCase()||"U"}
                </div>
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{profile?.full_name}</div>
                  <div style={{fontSize:9,color:"#9ca3af"}}>{ROLE_LABELS[primaryRole]}</div>
                </div>
              </div>
              <button onClick={()=>{signOut();setMobileOpen(false);}} style={{display:"flex",alignItems:"center",gap:6,marginTop:10,width:"100%",padding:"8px 0",border:"none",background:"transparent",cursor:"pointer",fontSize:12,color:"#dc2626",fontWeight:600}}>
                <LogOut style={{width:13,height:13}}/>Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{flex:1,overflow:"auto",background:"#f0f2f5"}}>
        {children}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{
        padding:"6px 16px",background:"#fff",borderTop:"1px solid #e5e7eb",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        fontSize:9.5,color:"#9ca3af",flexShrink:0,
      }}>
        <span>{hospitalName} · {sysName} © {new Date().getFullYear()}</span>
        <span className="hidden-sm">Embu County Government · Powered by MediProcure ERP v2.1</span>
      </footer>
    </div>
  );
}
