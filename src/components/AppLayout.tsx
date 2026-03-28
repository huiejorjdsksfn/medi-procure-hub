import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import SystemBroadcastBanner from "@/components/SystemBroadcastBanner";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import logoImg from "@/assets/logo.png";
import FacilitySwitcher from "@/components/FacilitySwitcher";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Mail, Activity, Menu, X, UserCircle, ChevronRight,
  Globe, Archive, TrendingUp, LayoutDashboard, Sliders, Eye,
  Cpu, Home, AlertTriangle, Wrench, Code2, Bug, CreditCard
} from "lucide-react";

/* ─── Module colour palette (D365 tile colours) ─── */
const MOD_COLORS = {
  procurement:    "#0078d4",
  vouchers:       "#C45911",
  financials:     "#107c10",
  inventory:      "#5c2d91",
  quality:        "#498205",
  reports:        "#8764b8",
  admin:          "#ca5010",
  database_admin: "#8b0000",
  accountant:     "#059669",
};

const ROLE_LABELS: Record<string,string> = {
  admin:"Administrator", database_admin:"DB Administrator",
  procurement_manager:"Proc. Manager", procurement_officer:"Proc. Officer",
  inventory_manager:"Inventory Mgr", warehouse_officer:"Warehouse",
  requisitioner:"Requisitioner", accountant:"Accountant",
};

/* ─── Module + sub-item definitions ─── */
const MODULES = [
  { id:"procurement", label:"Procurement", icon:ShoppingCart, color:MOD_COLORS.procurement,
    path:"/requisitions",
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
  { id:"vouchers", label:"Vouchers", icon:FileText, color:MOD_COLORS.vouchers,
    path:"/vouchers/payment",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Payment Vouchers",  path:"/vouchers/payment",  icon:DollarSign, roles:[]},
      {label:"Receipt Vouchers",  path:"/vouchers/receipt",  icon:Receipt,    roles:["admin","procurement_manager"]},
      {label:"Journal Vouchers",  path:"/vouchers/journal",  icon:BookMarked, roles:["admin","procurement_manager"]},
      {label:"Purchase Vouchers", path:"/vouchers/purchase", icon:FileText,   roles:["admin","procurement_manager"]},
      {label:"Sales Vouchers",    path:"/vouchers/sales",    icon:FileText,   roles:["admin","procurement_manager"]},
    ]},
  { id:"financials", label:"Financials", icon:TrendingUp, color:MOD_COLORS.financials,
    path:"/financials/dashboard",
    roles:["admin","procurement_manager"],
    sub:[
      {label:"Finance Dashboard",  path:"/financials/dashboard",        icon:TrendingUp, roles:[]},
      {label:"Chart of Accounts",  path:"/financials/chart-of-accounts",icon:BookOpen,   roles:[]},
      {label:"Budgets",            path:"/financials/budgets",          icon:PiggyBank,  roles:[]},
      {label:"Fixed Assets",       path:"/financials/fixed-assets",     icon:Building2,  roles:[]},
    ]},
  { id:"inventory", label:"Inventory", icon:Package, color:MOD_COLORS.inventory,
    path:"/items",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"Items / Stock", path:"/items",       icon:Package,   roles:[]},
      {label:"Categories",    path:"/categories",  icon:Layers,    roles:["admin","inventory_manager"]},
      {label:"Departments",   path:"/departments", icon:Building2, roles:["admin","inventory_manager"]},
      {label:"Scanner",       path:"/scanner",     icon:Search,    roles:[]},
    ]},
  { id:"quality", label:"Quality", icon:Shield, color:MOD_COLORS.quality,
    path:"/quality/dashboard",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"QC Dashboard",    path:"/quality/dashboard",       icon:Shield, roles:[]},
      {label:"Inspections",     path:"/quality/inspections",     icon:Eye,    roles:[]},
      {label:"Non-Conformance", path:"/quality/non-conformance", icon:Shield, roles:[]},
    ]},
  { id:"accountant", label:"Accountant", icon:DollarSign, color:MOD_COLORS.accountant,
    path:"/accountant",
    roles:["admin","accountant","procurement_manager"],
    sub:[
      {label:"Workspace",       path:"/accountant",                    icon:BarChart3,     roles:[]},
      {label:"Invoice Matching",path:"/accountant",                    icon:FileCheck,     roles:[]},
      {label:"Payments",        path:"/vouchers/payment",              icon:CreditCard,    roles:[]},
      {label:"Budget Control",  path:"/financials/budgets",            icon:PiggyBank,     roles:[]},
      {label:"ERP Sync",        path:"/accountant",                    icon:Database,      roles:[]},
      {label:"Journal/Ledger",  path:"/vouchers/journal",              icon:BookOpen,      roles:[]},
      {label:"Chart of Accounts",path:"/financials/chart-of-accounts",icon:BookOpen,      roles:[]},
      {label:"Fixed Assets",    path:"/financials/fixed-assets",       icon:Building2,     roles:[]},
    ]},
  { id:"reports", label:"Reports & BI", icon:BarChart3, color:MOD_COLORS.reports,
    path:"/reports",
    roles:["admin","procurement_manager","procurement_officer","accountant"],
    sub:[
      {label:"Analytics",   path:"/reports",    icon:BarChart3, roles:[]},
      {label:"Audit Log",   path:"/audit-log",  icon:Activity,  roles:["admin","procurement_manager","accountant"]},
      {label:"Documents",   path:"/documents",  icon:FileText,  roles:[]},
    ]},
  { id:"admin", label:"Administration", icon:Settings, color:MOD_COLORS.admin,
    path:"/admin/panel",
    roles:["admin"],
    sub:[
      {label:"Admin Panel",  path:"/admin/panel",    icon:Sliders,  roles:["admin"]},
      {label:"Users",        path:"/users",          icon:Users,    roles:["admin"]},
      {label:"Settings",     path:"/settings",       icon:Settings, roles:["admin"]},
      {label:"Webmaster",    path:"/webmaster",      icon:Globe,    roles:["admin"]},
      {label:"GUI Editor",   path:"/gui-editor",     icon:Palette,  roles:["admin"]},
      {label:"Facilities",   path:"/facilities",     icon:Building2,roles:["admin","procurement_manager"]},
      {label:"Backup",       path:"/backup",         icon:Archive,  roles:["admin"]},
      {label:"ODBC",         path:"/odbc",           icon:Cpu,      roles:["admin"]},
      {label:"IP Access",    path:"/admin/ip-access", icon:Shield,   roles:["admin"]},
    ]},
  { id:"reception", label:"Reception", icon:Building2, color:"#0369a1",
    path:"/reception",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"],
    sub:[
      {label:"Visitor Log",    path:"/reception", icon:Users,         roles:[]},
      {label:"Call Log",        path:"/reception", icon:Phone,         roles:[]},
      {label:"Send SMS",        path:"/reception", icon:MessageSquare, roles:[]},
    ]},
  { id:"database_admin", label:"DB Admin", icon:Database, color:MOD_COLORS.database_admin,
    path:"/admin/database",
    roles:["admin","database_admin"],
    sub:[
      {label:"Database Browser", path:"/admin/database", icon:Database,  roles:["admin","database_admin"]},
      {label:"Error Tracker",    path:"/admin/database", icon:Bug,       roles:["admin","database_admin"]},
      {label:"Fix Scripts",      path:"/admin/database", icon:Wrench,    roles:["admin","database_admin"]},
      {label:"SQL Editor",       path:"/admin/database", icon:Code2,     roles:["admin","database_admin"]},
    ]},
];

/* ─── Sub-items grid for the D365 tile area ─── */
const TILE_ICONS: Record<string, any> = {
  ClipboardList, ShoppingCart, Package, Truck, FileCheck, Gavel, Scale, Calendar,
  DollarSign, Receipt, BookMarked, FileText, TrendingUp, BookOpen, PiggyBank, Building2,
  Layers, Search, Shield, Eye, BarChart3, Activity, Sliders, Users, Settings, Globe,
  Archive, Cpu, Database, Code2, Wrench, Bug,
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const { get: getSetting, bool: getBool } = useSystemSettings();
  const location  = useLocation();
  const navigate  = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [activeModule, setActiveModule] = useState<string|null>(null);
  const [tileDropOpen, setTileDropOpen] = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);

  const sysName      = getSetting("system_name", "EL5 MediProcure");
  const hospitalName = getSetting("hospital_name", "Embu Level 5 Hospital");
  const logoUrl      = getSetting("logo_url") || null;
  const primaryRole  = roles[0] || "requisitioner";
  const isAdmin      = roles.includes("admin") || roles.includes("database_admin");
  const isDashboard  = location.pathname === "/dashboard" || location.pathname === "/";

  const moduleEnabled = (id: string) => {
    const map: Record<string,string> = {
      procurement:"enable_procurement", vouchers:"enable_vouchers",
      financials:"enable_financials", inventory:"true", quality:"enable_quality",
      reports:"true", admin:"true", database_admin:"true",
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

  // Detect active module from URL
  useEffect(()=>{
    const cur = MODULES.find(m =>
      location.pathname === m.path || m.sub.some(s=>location.pathname.startsWith(s.path))
    );
    if(cur) setActiveModule(cur.id);
  },[location.pathname]);

  useEffect(()=>{ setMobileOpen(false); setUserMenuOpen(false); setTileDropOpen(false); },[location.pathname]);

  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(userMenuRef.current&&!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    const h = ()=>setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", h); h();
    return ()=>window.removeEventListener("resize", h);
  },[]);

  const activeMod = MODULES.find(m=>m.id===activeModule);
  const visLinks  = activeMod?.sub.filter(s=>!s.roles.length||s.roles.some(r=>roles.includes(r)))||[];

  // Search
  const allPages = MODULES.flatMap(m=>[
    {label:m.label,path:m.path,icon:m.icon,color:m.color},
    ...m.sub.map(s=>({label:`${m.label} › ${s.label}`,path:s.path,icon:s.icon,color:m.color}))
  ]);
  const searchResults = searchQuery.length>1
    ? allPages.filter(p=>p.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,8)
    : [];

  const hov = (e:React.MouseEvent, on:boolean, col="#f0f0f0") =>
    { (e.currentTarget as HTMLElement).style.background = on ? col : "transparent"; };

  /* ── TILE COLOUR PALETTE (D365 style vibrant) ── */
  const TILE_PALETTE = [
    "#0078d4","#2a7de1","#4f6bed","#5c2d91","#8764b8",
    "#00695C","#107c10","#498205","#c27bad","#ca5010",
    "#C45911","#8b0000","#d13438","#e81123",
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",overflow:"hidden",background:"#f8fafc",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>

      {/* ════════════════════════════════════════════
          TOP BAR — D365 style (black, app branding)
      ════════════════════════════════════════════ */}
      <div style={{
        height:40, flexShrink:0, zIndex:300,
        background:"#1f1f1f",
        display:"flex", alignItems:"center",
        padding:"0 0 0 10px", gap:0,
        boxShadow:"0 2px 6px rgba(0,0,0,0.35)",
      }}>
        {/* Mobile toggle */}
        {isMobile&&!isDashboard&&(
          <button onClick={()=>setMobileOpen(v=>!v)} style={{background:"transparent",border:"none",padding:8,cursor:"pointer",color:"rgba(255,255,255,0.7)",lineHeight:0,marginRight:4}}>
            <Menu style={{width:16,height:16}}/>
          </button>
        )}

        {/* Logo + App name */}
        <div style={{display:"flex",alignItems:"center",gap:8,paddingRight:14,borderRight:"1px solid rgba(255,255,255,0.12)",height:"100%"}}>
          <img src={logoUrl||logoImg} alt="" style={{width:22,height:22,borderRadius:3,objectFit:"contain" as const,flexShrink:0}}/>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#fff",lineHeight:1,letterSpacing:"0.01em"}}>{sysName}</div>
            {!isMobile&&<div style={{fontSize:8.5,color:"rgba(255,255,255,0.45)",letterSpacing:"0.04em"}}>{hospitalName}</div>}
          </div>
        </div>

        {/* Active module label + down arrow (D365 breadcrumb click) */}
        {!isDashboard&&activeMod&&!isMobile&&(
          <button onClick={()=>setTileDropOpen(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:6,height:"100%",padding:"0 14px",background:"transparent",border:"none",cursor:"pointer",borderRight:"1px solid rgba(255,255,255,0.12)"}}
            onMouseEnter={e=>hov(e,true,"rgba(255,255,255,0.08)")}
            onMouseLeave={e=>hov(e,false)}>
            <activeMod.icon style={{width:13,height:13,color:"rgba(255,255,255,0.7)"}}/>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.85)"}}>{activeMod.label}</span>
            <ChevronDown style={{width:10,height:10,color:"rgba(255,255,255,0.45)"}}/>
          </button>
        )}

        {/* Spacer */}
        <div style={{flex:1}}/>

        {/* Search */}
        <div style={{position:"relative",marginRight:6}}>
          <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:3,background:searchOpen?"rgba(255,255,255,0.14)":"rgba(255,255,255,0.08)",cursor:"text"}}
            onClick={()=>setSearchOpen(true)}>
            <Search style={{width:12,height:12,color:"rgba(255,255,255,0.5)"}}/>
            {searchOpen
              ? <input autoFocus value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  onBlur={()=>setTimeout(()=>{setSearchOpen(false);setSearchQuery("");},180)}
                  placeholder="Search…"
                  style={{width:140,border:"none",outline:"none",fontSize:11.5,background:"transparent",color:"#fff"}}/>
              : <span style={{fontSize:11.5,color:"rgba(255,255,255,0.45)"}}>Search</span>
            }
          </div>
          {searchOpen&&searchResults.length>0&&(
            <div style={{position:"absolute",top:"calc(100%+4px)",right:0,width:260,background:"#fff",borderRadius:4,boxShadow:"0 8px 28px rgba(0,0,0,0.2)",border:"1px solid #e0e0e0",overflow:"hidden",zIndex:500}}>
              {searchResults.map(r=>(
                <button key={r.path} onMouseDown={()=>{navigate(r.path);setSearchQuery("");setSearchOpen(false);}}
                  style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const}}
                  onMouseEnter={e=>hov(e,true,"#f5f5f5")}
                  onMouseLeave={e=>hov(e,false)}>
                  <div style={{width:24,height:24,borderRadius:4,background:`${r.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <r.icon style={{width:12,height:12,color:r.color}}/>
                  </div>
                  <span style={{fontSize:12,color:"#1f1f1f"}}>{r.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Facility Switcher */}
        <FacilitySwitcher/>
        {/* Mail */}
        <button onClick={()=>navigate("/email")} title="Mail"
          style={{width:36,height:36,borderRadius:3,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
          onMouseEnter={e=>hov(e,true,"rgba(255,255,255,0.1)")}
          onMouseLeave={e=>hov(e,false)}>
          <Mail style={{width:15,height:15,color:"rgba(255,255,255,0.65)"}}/>
        </button>

        {/* Home */}
        <button onClick={()=>navigate("/dashboard")} title="Dashboard"
          style={{width:36,height:36,borderRadius:3,border:"none",background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}
          onMouseEnter={e=>hov(e,true,"rgba(255,255,255,0.1)")}
          onMouseLeave={e=>hov(e,false)}>
          <Home style={{width:15,height:15,color:"rgba(255,255,255,0.65)"}}/>
        </button>

        {/* User avatar */}
        <div style={{position:"relative",paddingRight:6}} ref={userMenuRef}>
          <button onClick={()=>setUserMenuOpen(v=>!v)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:3,border:"none",background:"transparent",cursor:"pointer"}}
            onMouseEnter={e=>hov(e,true,"rgba(255,255,255,0.1)")}
            onMouseLeave={e=>{ if(!userMenuOpen)hov(e,false); }}>
            <div style={{width:26,height:26,borderRadius:"50%",background:"linear-gradient(135deg,#0078d4,#106ebe)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>
              {profile?.full_name?.[0]?.toUpperCase()||"U"}
            </div>
            {!isMobile&&<span style={{fontSize:11.5,color:"rgba(255,255,255,0.8)",fontWeight:600,maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.full_name?.split(" ")[0]||"User"}</span>}
            <ChevronDown style={{width:10,height:10,color:"rgba(255,255,255,0.4)"}}/>
          </button>
          {userMenuOpen&&(
            <div style={{position:"absolute",right:4,top:"calc(100%+3px)",minWidth:220,background:"#fff",boxShadow:"0 10px 30px rgba(0,0,0,0.2)",border:"1px solid #e0e0e0",borderRadius:4,overflow:"hidden",zIndex:600}}>
              <div style={{padding:"12px 14px",background:"#0078d4"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>{profile?.full_name?.[0]?.toUpperCase()||"U"}</div>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:700,color:"#fff"}}>{profile?.full_name||"User"}</div>
                    <div style={{fontSize:9.5,color:"rgba(255,255,255,0.7)"}}>{ROLE_LABELS[primaryRole]||"Staff"}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.5)"}}>{profile?.email||user?.email}</div>
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
                  style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:12.5,color:"#1f1f1f"}}
                  onMouseEnter={e=>hov(e,true,"#f5f5f5")}
                  onMouseLeave={e=>hov(e,false)}>
                  <item.icon style={{width:13,height:13,color:"#555"}}/>{item.label}
                </button>
              ))}
              <div style={{borderTop:"1px solid #e0e0e0"}}>
                <button onClick={()=>{signOut();navigate("/login");}}
                  style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:12.5,color:"#d13438"}}
                  onMouseEnter={e=>hov(e,true,"#fdf4f4")}
                  onMouseLeave={e=>hov(e,false)}>
                  <LogOut style={{width:13,height:13}}/> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          MODULE NAV BAR — D365 coloured tab strip
      ════════════════════════════════════════════ */}
      {!isDashboard&&(
        <div style={{
          height:44, flexShrink:0, zIndex:200,
          background:"var(--color-nav-bg, #ffffff)",
          borderBottom:"1px solid var(--color-border, #e2e8f0)",
          display:"flex", alignItems:"stretch",
          overflowX:"auto" as const, overflowY:"hidden" as const,
        }}>
          {visibleMods.map((m, idx)=>{
            const isAct = activeModule===m.id;
            const col   = m.color;
            return (
              <button key={m.id}
                onClick={()=>{ setActiveModule(m.id); setTileDropOpen(true); navigate(m.sub[0]?.path||m.path); }}
                style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"0 18px", border:"none",
                  cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" as const,
                  background: isAct ? col : "var(--color-nav-bg, #ffffff)",
                  borderBottom: isAct ? `3px solid ${col}` : "3px solid transparent",
                  transition:"all 0.14s",
                  position:"relative",
                }}
                onMouseEnter={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background=`${col}12`; }}
                onMouseLeave={e=>{ if(!isAct)(e.currentTarget as HTMLElement).style.background="#ffffff"; }}>
                <m.icon style={{width:14,height:14,color:isAct?"#fff":col,flexShrink:0}}/>
                <span style={{fontSize:12,fontWeight:isAct?700:500,color:isAct?"#ffffff":"var(--color-nav-text, #1e293b)",letterSpacing:"0.01em"}}>{m.label}</span>
              </button>
            );
          })}
          {/* Home shortcut at far right */}
          <button onClick={()=>navigate("/dashboard")}
            style={{display:"flex",alignItems:"center",gap:6,padding:"0 14px",border:"none",background:"transparent",cursor:"pointer",marginLeft:"auto",flexShrink:0}}
            onMouseEnter={e=>hov(e,true,"#f1f5f9")}
            onMouseLeave={e=>hov(e,false)}>
            <Home style={{width:13,height:13,color:"#475569"}}/>
            <span style={{fontSize:11.5,color:"#475569"}}>Dashboard</span>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TILE DROP-DOWN — D365 coloured icon tiles
      ════════════════════════════════════════════ */}
      {!isDashboard&&tileDropOpen&&activeMod&&visLinks.length>0&&(
        <div style={{
          flexShrink:0, zIndex:150,
          background:"#fff",
          borderBottom:"2px solid #e0e0e0",
          padding:"12px 16px",
          display:"flex", flexWrap:"wrap" as const, gap:8,
          boxShadow:"0 4px 12px rgba(0,0,0,0.08)",
        }}>
          {visLinks.map((s, idx)=>{
            const isActive = location.pathname.startsWith(s.path);
            const tileCol  = TILE_PALETTE[idx % TILE_PALETTE.length];
            return (
              <button key={s.path}
                onClick={()=>navigate(s.path)}
                style={{
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  width:96, height:80,
                  background: isActive ? activeMod.color : tileCol,
                  border:"none", borderRadius:4, cursor:"pointer",
                  gap:6, padding:"8px 4px",
                  boxShadow: isActive?"0 0 0 3px rgba(255,255,255,0.6) inset":"none",
                  transition:"filter 0.15s, transform 0.15s",
                  outline: isActive?`2px solid ${activeMod.color}`:"none",
                }}
                onMouseEnter={e=>{ (e.currentTarget as HTMLElement).style.filter="brightness(0.88)"; (e.currentTarget as HTMLElement).style.transform="translateY(-1px)"; }}
                onMouseLeave={e=>{ (e.currentTarget as HTMLElement).style.filter="brightness(1)"; (e.currentTarget as HTMLElement).style.transform="translateY(0)"; }}>
                <s.icon style={{width:22,height:22,color:"#fff"}}/>
                <span style={{fontSize:10,fontWeight:600,color:"#fff",textAlign:"center" as const,lineHeight:1.2}}>{s.label}</span>
              </button>
            );
          })}
          {/* Close tiles */}
          <button onClick={()=>setTileDropOpen(false)}
            style={{display:"flex",alignItems:"center",justifyContent:"center",width:32,height:32,background:"#f0f0f0",border:"1px solid #e0e0e0",borderRadius:4,cursor:"pointer",marginLeft:"auto",alignSelf:"flex-end" as const}}
            onMouseEnter={e=>hov(e,true,"#f1f5f9")}
            onMouseLeave={e=>hov(e,false)}>
            <X style={{width:14,height:14,color:"#666"}}/>
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════
          SYSTEM BANNER
      ════════════════════════════════════════════ */}
      <SystemBroadcastBanner/>

      {/* ════════════════════════════════════════════
          MOBILE DRAWER
      ════════════════════════════════════════════ */}
      {isMobile&&mobileOpen&&!isDashboard&&(
        <div style={{position:"fixed",inset:0,zIndex:600,display:"flex"}}>
          <div style={{width:270,background:"#1f1f1f",display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
            <div style={{padding:"12px 14px",borderBottom:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:10}}>
              <img src={logoUrl||logoImg} alt="" style={{width:26,height:26,borderRadius:4}}/>
              <div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{sysName}</div></div>
              <button onClick={()=>setMobileOpen(false)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:4,padding:5,cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <nav style={{flex:1,overflowY:"auto" as const,padding:"8px 0"}}>
              {visibleMods.map(m=>{
                const isCur = activeModule===m.id;
                const fs = m.sub.filter(s=>!s.roles.length||s.roles.some(r=>roles.includes(r)));
                return (
                  <div key={m.id}>
                    <button onClick={()=>{ setActiveModule(m.id); navigate(fs[0]?.path||m.path); setMobileOpen(false); }}
                      style={{display:"flex",alignItems:"center",gap:11,width:"100%",padding:"10px 14px",border:"none",
                        borderLeft:isCur?`3px solid ${m.color}`:"3px solid transparent",
                        background:isCur?`${m.color}22`:"transparent",cursor:"pointer",textAlign:"left" as const}}>
                      <m.icon style={{width:15,height:15,color:isCur?m.color:"rgba(255,255,255,0.55)",flexShrink:0}}/>
                      <span style={{fontSize:13,fontWeight:isCur?700:400,color:isCur?"#fff":"rgba(255,255,255,0.75)"}}>{m.label}</span>
                    </button>
                    {isCur&&fs.map(s=>{
                      const sa=location.pathname.startsWith(s.path);
                      return <Link key={s.path} to={s.path} onClick={()=>setMobileOpen(false)} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px 8px 38px",textDecoration:"none",background:sa?`${m.color}18`:"transparent",borderLeft:sa?`3px solid ${m.color}`:"3px solid transparent"}}>
                        <s.icon style={{width:12,height:12,color:sa?m.color:"rgba(255,255,255,0.4)",flexShrink:0}}/>
                        <span style={{fontSize:12,color:sa?"#fff":"rgba(255,255,255,0.6)"}}>{s.label}</span>
                      </Link>;
                    })}
                  </div>
                );
              })}
            </nav>
            <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:"#0078d4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff"}}>{profile?.full_name?.[0]?.toUpperCase()||"U"}</div>
              <div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:"#fff"}}>{profile?.full_name||"User"}</div></div>
              <button onClick={()=>{signOut();navigate("/login");}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:4,padding:5,cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}><LogOut style={{width:12,height:12}}/></button>
            </div>
          </div>
          <div onClick={()=>setMobileOpen(false)} style={{flex:1,background:"rgba(0,0,0,0.5)"}}/>
        </div>
      )}

      {/* ════════════════════════════════════════════
          PAGE CONTENT
      ════════════════════════════════════════════ */}
      <main style={{flex:1,overflowY:"auto" as const,overflowX:"hidden" as const,background:"#f8fafc"}}>
        {children}
      </main>
    </div>
  );
}
