import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SystemBroadcastBanner from "@/components/SystemBroadcastBanner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import logoImg from "@/assets/logo.png";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Home, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Mail, Activity, Menu, X, UserCircle, ChevronRight,
  Globe, Archive, TrendingUp, LayoutDashboard, Sliders, Eye, Cpu,
  Bell
} from "lucide-react";

const ROLE_LABELS: Record<string,string> = {
  admin:"Administrator", procurement_manager:"Proc. Manager",
  procurement_officer:"Proc. Officer", inventory_manager:"Inventory Mgr",
  warehouse_officer:"Warehouse", requisitioner:"Requisitioner",
};

const MODULES = [
  { id:"home", label:"Dashboard", icon:LayoutDashboard, color:"#0078d4", path:"/dashboard", roles:[] as string[], sub:[] as {label:string;path:string;icon:any;roles:string[]}[] },
  { id:"procurement", label:"Procurement", icon:ShoppingCart, color:"#0078d4", path:"/requisitions",
    roles:["admin","procurement_manager","procurement_officer","requisitioner"],
    sub:[
      {label:"Requisitions",    path:"/requisitions",         icon:ClipboardList, roles:[]},
      {label:"Purchase Orders", path:"/purchase-orders",      icon:ShoppingCart,  roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Goods Received",  path:"/goods-received",       icon:Package,       roles:["admin","procurement_manager","procurement_officer","warehouse_officer"]},
      {label:"Suppliers",       path:"/suppliers",            icon:Truck,         roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Contracts",       path:"/contracts",            icon:FileCheck,     roles:["admin","procurement_manager"]},
      {label:"Tenders",         path:"/tenders",              icon:Gavel,         roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Bid Evaluations", path:"/bid-evaluations",      icon:Scale,         roles:["admin","procurement_manager"]},
      {label:"Proc. Planning",  path:"/procurement-planning", icon:Calendar,      roles:["admin","procurement_manager"]},
    ]},
  { id:"vouchers", label:"Vouchers", icon:FileText, color:"#C45911", path:"/vouchers/payment",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Payment Vouchers",  path:"/vouchers/payment",  icon:DollarSign, roles:[]},
      {label:"Receipt Vouchers",  path:"/vouchers/receipt",  icon:Receipt,    roles:["admin","procurement_manager"]},
      {label:"Journal Vouchers",  path:"/vouchers/journal",  icon:BookMarked, roles:["admin","procurement_manager"]},
      {label:"Purchase Vouchers", path:"/vouchers/purchase", icon:FileText,   roles:["admin","procurement_manager"]},
      {label:"Sales Vouchers",    path:"/vouchers/sales",    icon:FileText,   roles:["admin","procurement_manager"]},
    ]},
  { id:"financials", label:"Financials", icon:TrendingUp, color:"#107c10", path:"/financials/dashboard",
    roles:["admin","procurement_manager"],
    sub:[
      {label:"Finance Dashboard",  path:"/financials/dashboard",        icon:TrendingUp, roles:[]},
      {label:"Chart of Accounts",  path:"/financials/chart-of-accounts",icon:BookOpen,   roles:[]},
      {label:"Budgets",            path:"/financials/budgets",          icon:PiggyBank,  roles:[]},
      {label:"Fixed Assets",       path:"/financials/fixed-assets",     icon:Building2,  roles:[]},
    ]},
  { id:"inventory", label:"Inventory", icon:Package, color:"#5c2d91", path:"/items",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"Items / Stock", path:"/items",       icon:Package,   roles:[]},
      {label:"Categories",    path:"/categories",  icon:Layers,    roles:["admin","inventory_manager"]},
      {label:"Departments",   path:"/departments", icon:Building2, roles:["admin","inventory_manager"]},
      {label:"Scanner",       path:"/scanner",     icon:Search,    roles:[]},
    ]},
  { id:"quality", label:"Quality", icon:Shield, color:"#498205", path:"/quality/dashboard",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"QC Dashboard",    path:"/quality/dashboard",       icon:Shield, roles:[]},
      {label:"Inspections",     path:"/quality/inspections",     icon:Eye,    roles:[]},
      {label:"Non-Conformance", path:"/quality/non-conformance", icon:Shield, roles:[]},
    ]},
  { id:"reports", label:"Reports & BI", icon:BarChart3, color:"#8764b8", path:"/reports",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Analytics",   path:"/reports",    icon:BarChart3, roles:[]},
      {label:"Audit Log",   path:"/audit-log",  icon:Activity,  roles:["admin","procurement_manager"]},
      {label:"Documents",   path:"/documents",  icon:FileText,  roles:[]},
    ]},
  { id:"admin", label:"Administration", icon:Settings, color:"#ca5010", path:"/admin/panel",
    roles:["admin"],
    sub:[
      {label:"Admin Panel",  path:"/admin/panel",    icon:Sliders,  roles:["admin"]},
      {label:"Users",        path:"/users",          icon:Users,    roles:["admin"]},
      {label:"Database",     path:"/admin/database", icon:Database, roles:["admin"]},
      {label:"Settings",     path:"/settings",       icon:Settings, roles:["admin"]},
      {label:"Backup",       path:"/backup",         icon:Archive,  roles:["admin"]},
      {label:"Webmaster",    path:"/webmaster",      icon:Globe,    roles:["admin"]},
      {label:"ODBC",         path:"/odbc",           icon:Cpu,      roles:["admin"]},
    ]},
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const { get: getSetting, bool: getBool } = useSystemSettings();
  const location  = useLocation();
  const navigate  = useNavigate();
  const userMenuRef   = useRef<HTMLDivElement>(null);
  const flyoutRef     = useRef<HTMLDivElement>(null);
  const flyoutTimeout = useRef<ReturnType<typeof setTimeout>|null>(null);

  const [flyout,       setFlyout]       = useState<string|null>(null);
  const [pinned,       setPinned]       = useState<string|null>(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);

  const sysName      = getSetting("system_name", "EL5 MediProcure");
  const hospitalName = getSetting("hospital_name", "Embu Level 5 Hospital");
  const logoUrl      = getSetting("logo_url") || null;

  const primaryRole = roles[0] || "requisitioner";
  const isAdmin     = roles.includes("admin");
  const isDashboard = location.pathname === "/dashboard" || location.pathname === "/";

  // Active module from URL
  const activeModule = MODULES.find(m =>
    location.pathname === m.path || m.sub.some(s => location.pathname.startsWith(s.path))
  );
  const activeSub = activeModule?.sub.find(s => location.pathname.startsWith(s.path));

  useEffect(()=>{
    const h = ()=>{ setIsMobile(window.innerWidth < 900); };
    window.addEventListener("resize", h); h();
    return ()=>window.removeEventListener("resize", h);
  },[]);

  useEffect(()=>{ setMobileOpen(false); setUserMenuOpen(false); },[location.pathname]);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(userMenuRef.current&&!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  // Close flyout on outside click
  useEffect(()=>{
    const h=(e:MouseEvent)=>{
      const t = e.target as Node;
      const rail = document.getElementById("crm-rail");
      const fly  = document.getElementById("crm-flyout");
      if(rail&&fly&&!rail.contains(t)&&!fly.contains(t)){ setPinned(null); setFlyout(null); }
    };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  const moduleEnabled = (id: string) => {
    const map: Record<string,string> = {
      procurement:"enable_procurement", vouchers:"enable_vouchers",
      financials:"enable_financials", inventory:"true", quality:"enable_quality",
      reports:"true", admin:"true",
    };
    const k = map[id];
    if(!k||k==="true") return true;
    return getBool(k, true);
  };

  const canSee = (m: typeof MODULES[0]) => {
    if(!moduleEnabled(m.id)) return false;
    return !m.roles.length || m.roles.some(r=>roles.includes(r));
  };

  const visibleMods = MODULES.filter(canSee);
  const activeFlyoutMod = MODULES.find(m => m.id === (flyout||pinned));
  const flyoutLinks = activeFlyoutMod?.sub.filter(s=>!s.roles.length||s.roles.some(r=>roles.includes(r))) || [];

  // Search
  const allPages = MODULES.flatMap(m=>[
    {label:m.label, path:m.path, icon:m.icon, color:m.color},
    ...m.sub.map(s=>({label:`${m.label} › ${s.label}`, path:s.path, icon:s.icon, color:m.color}))
  ]);
  const searchResults = searchQuery.length>1
    ? allPages.filter(p=>p.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,8)
    : [];

  const openFlyout = (id: string) => {
    if(flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
    setFlyout(id);
  };
  const startCloseFlyout = () => {
    if(pinned) return;
    flyoutTimeout.current = setTimeout(()=>setFlyout(null), 200);
  };
  const cancelCloseFlyout = () => {
    if(flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
  };

  const RAIL_W = 48;
  const FLYOUT_W = 230;

  // ── Mobile sidebar (full) ────────────────────────────────────
  const MobileSidebar = () => (
    <div style={{position:"fixed",inset:0,zIndex:600,display:"flex"}}>
      <div style={{width:260,background:"#1f1f1f",display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
        {/* Header */}
        <div style={{padding:"14px 16px",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:10}}>
          <img src={logoUrl||logoImg} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"rgba(255,255,255,0.1)",padding:3}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:800,color:"#fff"}}>{sysName}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{hospitalName}</div>
          </div>
          <button onClick={()=>setMobileOpen(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,padding:5,cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
        </div>
        {/* Nav */}
        <nav style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          {visibleMods.map(m=>{
            const isCur = location.pathname===m.path||m.sub.some(s=>location.pathname.startsWith(s.path));
            const fs = m.sub.filter(s=>!s.roles.length||s.roles.some(r=>roles.includes(r)));
            return (
              <div key={m.id}>
                <button onClick={()=>fs.length?navigate(fs[0].path):navigate(m.path)}
                  style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 16px",border:"none",
                    borderLeft:isCur?`3px solid ${m.color}`:"3px solid transparent",
                    background:isCur?"rgba(255,255,255,0.1)":"transparent",cursor:"pointer",textAlign:"left" as const}}>
                  <m.icon style={{width:15,height:15,color:isCur?m.color:"rgba(255,255,255,0.6)",flexShrink:0}}/>
                  <span style={{fontSize:13,fontWeight:isCur?700:400,color:isCur?"#fff":"rgba(255,255,255,0.75)"}}>{m.label}</span>
                </button>
                {isCur&&fs.map(s=>{
                  const sa=location.pathname.startsWith(s.path);
                  return <Link key={s.path} to={s.path} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 16px 8px 40px",textDecoration:"none",background:sa?"rgba(255,255,255,0.07)":"transparent",borderLeft:sa?`3px solid ${m.color}`:"3px solid transparent"}}>
                    <s.icon style={{width:12,height:12,color:sa?m.color:"rgba(255,255,255,0.45)",flexShrink:0}}/>
                    <span style={{fontSize:12,color:sa?"#fff":"rgba(255,255,255,0.6)"}}>{s.label}</span>
                  </Link>;
                })}
              </div>
            );
          })}
        </nav>
        {/* User */}
        <div style={{padding:"12px 16px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#0078d4,#106ebe)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>{profile?.full_name?.[0]?.toUpperCase()||"U"}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{profile?.full_name||"User"}</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>{ROLE_LABELS[primaryRole]||"Staff"}</div>
          </div>
          <button onClick={()=>{signOut();navigate("/login");}} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:5,padding:5,cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}>
            <LogOut style={{width:12,height:12}}/>
          </button>
        </div>
      </div>
      <div onClick={()=>setMobileOpen(false)} style={{flex:1,background:"rgba(0,0,0,0.55)"}}/>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"#f5f5f5",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* ── MOBILE DRAWER ── */}
      {isMobile&&mobileOpen&&!isDashboard&&<MobileSidebar/>}

      {/* ── D365-STYLE LEFT ICON RAIL ── */}
      {!isMobile&&!isDashboard&&(
        <>
          {/* Rail */}
          <div id="crm-rail" style={{
            width: RAIL_W, flexShrink:0, height:"100vh", zIndex:200,
            background:"#1f1f1f", display:"flex", flexDirection:"column",
            alignItems:"center", paddingTop:4, gap:2,
            boxShadow:"2px 0 8px rgba(0,0,0,0.22)",
          }}>
            {/* Logo icon at top */}
            <div style={{width:36,height:36,borderRadius:8,overflow:"hidden",marginBottom:8,flexShrink:0}}>
              <img src={logoUrl||logoImg} alt="" style={{width:"100%",height:"100%",objectFit:"contain",background:"rgba(255,255,255,0.08)",padding:4}}/>
            </div>

            {/* Module icons */}
            {visibleMods.filter(m=>m.id!=="home").map(m=>{
              const isCur = activeModule?.id===m.id;
              const isOpen = (flyout||pinned)===m.id;
              return (
                <button key={m.id}
                  title={m.label}
                  onClick={()=>{ if(m.sub.filter(s=>!s.roles.length||s.roles.some(r=>roles.includes(r))).length===0){ navigate(m.path); return; } if(pinned===m.id){setPinned(null);setFlyout(null);}else{setPinned(m.id);setFlyout(m.id);} }}
                  onMouseEnter={()=>openFlyout(m.id)}
                  onMouseLeave={startCloseFlyout}
                  style={{
                    width:40, height:40, borderRadius:6, border:"none",
                    background: isOpen?"rgba(255,255,255,0.18)": isCur?"rgba(0,120,212,0.22)":"transparent",
                    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                    position:"relative", flexShrink:0,
                    transition:"background 0.15s",
                  }}>
                  {/* Active bar */}
                  {isCur&&<div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3,borderRadius:"0 2px 2px 0",background:m.color}}/>}
                  <m.icon style={{width:17,height:17,color:isCur?m.color:isOpen?"#fff":"rgba(255,255,255,0.55)"}}/>
                </button>
              );
            })}

            {/* Dashboard icon always visible */}
            <div style={{flex:1}}/>
            <button title="Dashboard" onClick={()=>navigate("/dashboard")}
              style={{width:40,height:40,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Home style={{width:16,height:16,color:"rgba(255,255,255,0.5)"}}/>
            </button>
            {/* Settings shortcut for admin */}
            {isAdmin&&<button title="Settings" onClick={()=>navigate("/settings")}
              style={{width:40,height:40,borderRadius:6,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:4}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Settings style={{width:16,height:16,color:"rgba(255,255,255,0.5)"}}/>
            </button>}
          </div>

          {/* Flyout panel */}
          {(flyout||pinned)&&activeFlyoutMod&&(
            <div id="crm-flyout"
              onMouseEnter={cancelCloseFlyout}
              onMouseLeave={startCloseFlyout}
              style={{
                position:"fixed", left:RAIL_W, top:0, bottom:0,
                width:FLYOUT_W, zIndex:190,
                background:"#292929",
                boxShadow:"4px 0 18px rgba(0,0,0,0.35)",
                display:"flex", flexDirection:"column",
                overflow:"hidden",
                animation:"flySlide 0.15s ease-out",
              }}>
              <style>{`@keyframes flySlide{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}`}</style>
              {/* Flyout header */}
              <div style={{padding:"18px 16px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:10}}>
                <activeFlyoutMod.icon style={{width:16,height:16,color:activeFlyoutMod.color,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:700,color:"#fff",letterSpacing:"0.01em"}}>{activeFlyoutMod.label}</div>
                </div>
                {pinned&&<button onClick={()=>{setPinned(null);setFlyout(null);}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:4,padding:4,cursor:"pointer",color:"rgba(255,255,255,0.5)",lineHeight:0}}><X style={{width:11,height:11}}/></button>}
              </div>
              {/* Links */}
              <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}}>
                {flyoutLinks.map(s=>{
                  const sa = location.pathname.startsWith(s.path);
                  return (
                    <Link key={s.path} to={s.path}
                      onClick={()=>{ if(!pinned){setFlyout(null);} }}
                      style={{
                        display:"flex", alignItems:"center", gap:10,
                        padding:"9px 16px", textDecoration:"none",
                        background:sa?"rgba(0,120,212,0.22)":"transparent",
                        borderLeft:sa?`3px solid ${activeFlyoutMod.color}`:"3px solid transparent",
                        transition:"background 0.1s",
                      }}
                      onMouseEnter={e=>{ if(!sa)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)"; }}
                      onMouseLeave={e=>{ if(!sa)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                      <s.icon style={{width:13,height:13,color:sa?activeFlyoutMod.color:"rgba(255,255,255,0.5)",flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:sa?600:400,color:sa?"#fff":"rgba(255,255,255,0.75)"}}>{s.label}</span>
                      {sa&&<ChevronRight style={{width:10,height:10,color:"rgba(255,255,255,0.3)",marginLeft:"auto"}}/>}
                    </Link>
                  );
                })}
              </nav>
              {/* Pin hint */}
              <div style={{padding:"8px 16px",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:9.5,color:"rgba(255,255,255,0.2)"}}>
                {pinned?"Click X to close panel":"Click module icon to pin this panel"}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MAIN AREA ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>
        <SystemBroadcastBanner/>

        {/* ── D365-STYLE TOP BAR ── */}
        <header style={{
          height:48, flexShrink:0,
          background:"#fff",
          borderBottom:"1px solid #e0e0e0",
          display:"flex", alignItems:"center",
          padding:"0 0 0 12px", gap:0,
          boxShadow:"0 1px 4px rgba(0,0,0,0.08)",
          zIndex:100, position:"relative",
        }}>
          {/* Mobile menu toggle */}
          {isMobile&&!isDashboard&&(
            <button onClick={()=>setMobileOpen(v=>!v)} style={{background:"transparent",border:"none",borderRadius:4,padding:8,cursor:"pointer",color:"#444",lineHeight:0,marginRight:4}}>
              <Menu style={{width:16,height:16}}/>
            </button>
          )}

          {/* Logo + System Name (D365 style) */}
          <div style={{display:"flex",alignItems:"center",gap:8,paddingRight:12,borderRight:"1px solid #e0e0e0",height:"100%",marginRight:0}}>
            <img src={logoUrl||logoImg} alt="" style={{width:22,height:22,borderRadius:4,objectFit:"contain"}}/>
            <span style={{fontSize:12.5,fontWeight:700,color:"#1f1f1f",whiteSpace:"nowrap" as const,letterSpacing:"0.01em"}}>{sysName}</span>
          </div>

          {/* Module / Section name (D365 breadcrumb style) */}
          {!isDashboard&&activeModule&&(
            <div style={{display:"flex",alignItems:"center",height:"100%"}}>
              <div style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"0 16px", height:"100%",
                borderRight:"1px solid #e0e0e0",
                borderBottom:`2px solid ${activeModule.color}`,
                background:"#fafafa",
              }}>
                <activeModule.icon style={{width:13,height:13,color:activeModule.color}}/>
                <span style={{fontSize:12,fontWeight:600,color:"#1f1f1f"}}>{activeModule.label}</span>
                {activeSub&&<>
                  <span style={{color:"#ccc",fontSize:11}}>/</span>
                  <span style={{fontSize:12,color:"#444"}}>{activeSub.label}</span>
                </>}
              </div>
            </div>
          )}
          {isDashboard&&(
            <div style={{display:"flex",alignItems:"center",height:"100%"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"0 16px",height:"100%",borderRight:"1px solid #e0e0e0",borderBottom:"2px solid #0078d4",background:"#fafafa"}}>
                <LayoutDashboard style={{width:13,height:13,color:"#0078d4"}}/>
                <span style={{fontSize:12,fontWeight:600,color:"#1f1f1f"}}>Dashboard</span>
              </div>
            </div>
          )}

          {/* Hospital name sub-label */}
          {!isMobile&&(
            <div style={{padding:"0 14px",fontSize:10.5,color:"#888",display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e"}}/>
              {hospitalName}
            </div>
          )}

          {/* Right side actions */}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:0,paddingRight:8}}>

            {/* Search */}
            <div style={{position:"relative",marginRight:4}}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 10px",borderRadius:4,background:searchOpen?"#f5f5f5":"transparent",border:searchOpen?"1px solid #e0e0e0":"1px solid transparent",cursor:"text"}}
                onClick={()=>setSearchOpen(true)}>
                <Search style={{width:13,height:13,color:"#888"}}/>
                {searchOpen
                  ? <input autoFocus value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);}}
                      onBlur={()=>setTimeout(()=>{setSearchOpen(false);setSearchQuery("");},160)}
                      placeholder="Search modules…"
                      style={{width:160,border:"none",outline:"none",fontSize:12,background:"transparent",color:"#1f1f1f"}}/>
                  : <span style={{fontSize:12,color:"#888"}}>Search</span>
                }
              </div>
              {searchOpen&&searchResults.length>0&&(
                <div style={{position:"absolute",top:"calc(100% + 4px)",right:0,width:260,background:"#fff",borderRadius:6,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",border:"1px solid #e0e0e0",overflow:"hidden",zIndex:300}}>
                  {searchResults.map(r=>(
                    <button key={r.path} onMouseDown={()=>{navigate(r.path);setSearchQuery("");setSearchOpen(false);}}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f5f5f5"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <div style={{width:26,height:26,borderRadius:5,background:`${r.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <r.icon style={{width:13,height:13,color:r.color}}/>
                      </div>
                      <span style={{fontSize:12,color:"#1f1f1f"}}>{r.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mail button */}
            <button onClick={()=>navigate("/email")} title="Mail"
              style={{width:36,height:36,borderRadius:4,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0f0f0"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Mail style={{width:16,height:16,color:"#444"}}/>
            </button>

            {/* Divider */}
            <div style={{width:1,height:22,background:"#e0e0e0",margin:"0 6px"}}/>

            {/* User menu (D365 style) */}
            <div style={{position:"relative"}} ref={userMenuRef}>
              <button onClick={()=>setUserMenuOpen(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:4,border:"none",background:"transparent",cursor:"pointer"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0f0f0"}
                onMouseLeave={e=>{ if(!userMenuOpen)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
                <div style={{width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#0078d4,#106ebe)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>
                  {profile?.full_name?.[0]?.toUpperCase()||"U"}
                </div>
                {!isMobile&&<div style={{textAlign:"left" as const,lineHeight:1.2}}>
                  <div style={{fontSize:11.5,fontWeight:600,color:"#1f1f1f",maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.full_name?.split(" ")[0]||"User"}</div>
                  <div style={{fontSize:9,color:"#888"}}>{ROLE_LABELS[primaryRole]||"Staff"}</div>
                </div>}
                <ChevronDown style={{width:10,height:10,color:"#888"}}/>
              </button>

              {userMenuOpen&&(
                <div style={{position:"absolute",right:0,top:"calc(100% + 4px)",minWidth:220,background:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,0.15)",border:"1px solid #e0e0e0",borderRadius:6,overflow:"hidden",zIndex:400}}>
                  {/* User info header */}
                  <div style={{padding:"14px 16px",background:"#f5f5f5",borderBottom:"1px solid #e0e0e0"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:"linear-gradient(135deg,#0078d4,#106ebe)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{profile?.full_name?.[0]?.toUpperCase()||"U"}</div>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:"#1f1f1f"}}>{profile?.full_name||"User"}</div>
                        <div style={{fontSize:10,color:"#888"}}>{profile?.email||user?.email}</div>
                      </div>
                    </div>
                  </div>
                  {[
                    {label:"My Profile",    path:"/profile",     icon:UserCircle},
                    {label:"Mail & Inbox",  path:"/email",       icon:Mail},
                    ...(isAdmin?[
                      {label:"Admin Panel", path:"/admin/panel", icon:Sliders},
                      {label:"Users",       path:"/users",       icon:Users},
                      {label:"Settings",    path:"/settings",    icon:Settings},
                    ]:[]),
                  ].map(item=>(
                    <button key={item.path} onClick={()=>{navigate(item.path);setUserMenuOpen(false);}}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:13,color:"#1f1f1f"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f5f5f5"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <item.icon style={{width:14,height:14,color:"#666"}}/>{item.label}
                    </button>
                  ))}
                  <div style={{borderTop:"1px solid #e0e0e0"}}>
                    <button onClick={()=>{signOut();navigate("/login");}}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 16px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:13,color:"#d13438"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fdf4f4"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <LogOut style={{width:14,height:14}}/> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{flex:1,overflowY:"auto",overflowX:"hidden",background:"#f5f5f5"}}>
          {children}
        </main>
      </div>
    </div>
  );
}
