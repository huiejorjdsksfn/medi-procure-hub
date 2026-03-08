import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Home, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Globe, Mail, Archive, Wifi, Activity, ChevronRight,
  Menu, X, UserCircle, AlertTriangle, Bell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ── ROLE CONFIG ── */
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer",
  inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer",
  requisitioner: "Requisitioner",
};

const MODULES = [
  { id:"home",       label:"DASHBOARD",   icon:Home,        color:"#008B8B", path:"/dashboard", sub:[] },
  {
    id:"procurement", label:"PROCUREMENT", icon:ShoppingCart, color:"#0078d4", path:"/requisitions",
    sub:[
      { label:"Requisitions",      path:"/requisitions",         icon:ClipboardList },
      { label:"Purchase Orders",   path:"/purchase-orders",      icon:ShoppingCart },
      { label:"Goods Received",    path:"/goods-received",       icon:Package },
      { label:"Suppliers",         path:"/suppliers",            icon:Truck },
      { label:"Contracts",         path:"/contracts",            icon:FileCheck },
      { label:"Tenders",           path:"/tenders",              icon:Gavel },
      { label:"Bid Evaluations",   path:"/bid-evaluations",      icon:Scale },
      { label:"Procurement Plan",  path:"/procurement-planning", icon:Calendar },
    ],
  },
  {
    id:"vouchers", label:"VOUCHERS", icon:FileText, color:"#C45911", path:"/vouchers/payment",
    sub:[
      { label:"Payment Vouchers",  path:"/vouchers/payment",  icon:DollarSign },
      { label:"Receipt Vouchers",  path:"/vouchers/receipt",  icon:Receipt },
      { label:"Journal Vouchers",  path:"/vouchers/journal",  icon:BookMarked },
      { label:"Purchase Vouchers", path:"/vouchers/purchase", icon:FileText },
      { label:"Sales Vouchers",    path:"/vouchers/sales",    icon:FileText },
    ],
  },
  {
    id:"financials", label:"FINANCIALS", icon:BarChart3, color:"#1F6090", path:"/financials/dashboard",
    sub:[
      { label:"Finance Dashboard",  path:"/financials/dashboard",       icon:BarChart3 },
      { label:"Chart of Accounts",  path:"/financials/chart-of-accounts", icon:BookOpen },
      { label:"Budgets",            path:"/financials/budgets",          icon:PiggyBank },
      { label:"Fixed Assets",       path:"/financials/fixed-assets",     icon:Building2 },
    ],
  },
  {
    id:"inventory", label:"INVENTORY", icon:Package, color:"#375623", path:"/items",
    sub:[
      { label:"Items",       path:"/items",       icon:Package },
      { label:"Categories",  path:"/categories",  icon:Layers },
      { label:"Departments", path:"/departments", icon:Building2 },
      { label:"Scanner",     path:"/scanner",     icon:Search },
    ],
  },
  {
    id:"quality", label:"QUALITY", icon:Shield, color:"#00695C", path:"/quality/dashboard",
    sub:[
      { label:"QC Dashboard",     path:"/quality/dashboard",        icon:Shield },
      { label:"Inspections",      path:"/quality/inspections",      icon:ClipboardList },
      { label:"Non-Conformance",  path:"/quality/non-conformance",  icon:AlertTriangle },
    ],
  },
  {
    id:"reports", label:"REPORTS", icon:BarChart3, color:"#5C2D91", path:"/reports",
    sub:[
      { label:"Reports",    path:"/reports",    icon:BarChart3 },
      { label:"Documents",  path:"/documents",  icon:FileCheck },
      { label:"Audit Log",  path:"/audit-log",  icon:Activity },
    ],
  },
  {
    id:"admin", label:"ADMIN", icon:Database, color:"#333", path:"/admin/panel",
    sub:[
      { label:"Admin Panel",    path:"/admin/panel",    icon:Settings },
      { label:"Users",          path:"/users",           icon:Users },
      { label:"Database Admin", path:"/admin/database",  icon:Database },
      { label:"Webmaster",      path:"/webmaster",       icon:Globe },
      { label:"Settings",       path:"/settings",        icon:Settings },
      { label:"Backup",         path:"/backup",          icon:Archive },
      { label:"ODBC",           path:"/odbc",            icon:Wifi },
    ],
  },
];

const PAGE_HEADERS: Record<string, { module: string; label: string }> = {
  "/dashboard":                   { module:"DASHBOARD",   label:"Home" },
  "/requisitions":                { module:"PROCUREMENT", label:"Requisitions" },
  "/purchase-orders":             { module:"PROCUREMENT", label:"Purchase Orders" },
  "/goods-received":              { module:"PROCUREMENT", label:"Goods Received" },
  "/suppliers":                   { module:"PROCUREMENT", label:"Suppliers" },
  "/contracts":                   { module:"PROCUREMENT", label:"Contracts" },
  "/tenders":                     { module:"PROCUREMENT", label:"Tenders" },
  "/bid-evaluations":             { module:"PROCUREMENT", label:"Bid Evaluations" },
  "/procurement-planning":        { module:"PROCUREMENT", label:"Procurement Plan" },
  "/vouchers/payment":            { module:"VOUCHERS",    label:"Payment Vouchers" },
  "/vouchers/receipt":            { module:"VOUCHERS",    label:"Receipt Vouchers" },
  "/vouchers/journal":            { module:"VOUCHERS",    label:"Journal Vouchers" },
  "/vouchers/purchase":           { module:"VOUCHERS",    label:"Purchase Vouchers" },
  "/vouchers/sales":              { module:"VOUCHERS",    label:"Sales Vouchers" },
  "/vouchers":                    { module:"VOUCHERS",    label:"Vouchers" },
  "/financials/dashboard":        { module:"FINANCIALS",  label:"Finance Dashboard" },
  "/financials/chart-of-accounts":{ module:"FINANCIALS",  label:"Chart of Accounts" },
  "/financials/budgets":          { module:"FINANCIALS",  label:"Budgets" },
  "/financials/fixed-assets":     { module:"FINANCIALS",  label:"Fixed Assets" },
  "/items":                       { module:"INVENTORY",   label:"Items" },
  "/categories":                  { module:"INVENTORY",   label:"Categories" },
  "/departments":                 { module:"INVENTORY",   label:"Departments" },
  "/scanner":                     { module:"INVENTORY",   label:"Scanner" },
  "/quality/dashboard":           { module:"QUALITY",     label:"Quality Dashboard" },
  "/quality/inspections":         { module:"QUALITY",     label:"Inspections" },
  "/quality/non-conformance":     { module:"QUALITY",     label:"Non-Conformance" },
  "/reports":                     { module:"REPORTS",     label:"Reports" },
  "/documents":                   { module:"REPORTS",     label:"Documents" },
  "/audit-log":                   { module:"REPORTS",     label:"Audit Log" },
  "/inbox":                       { module:"INBOX",       label:"Inbox" },
  "/email":                       { module:"INBOX",       label:"Email" },
  "/users":                       { module:"ADMIN",       label:"Users" },
  "/admin/database":              { module:"ADMIN",       label:"Database Admin" },
  "/admin/panel":                 { module:"ADMIN",       label:"Admin Panel" },
  "/webmaster":                   { module:"ADMIN",       label:"Webmaster" },
  "/settings":                    { module:"ADMIN",       label:"Settings" },
  "/backup":                      { module:"ADMIN",       label:"Backup" },
  "/odbc":                        { module:"ADMIN",       label:"ODBC" },
  "/profile":                     { module:"PROFILE",     label:"My Profile" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeMenu,   setActiveMenu]   = useState<string | null>(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef  = useRef<HTMLDivElement>(null);
  const menuTimers   = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const primaryRole = (
    roles.includes("admin")                ? "admin" :
    roles.includes("procurement_manager")  ? "procurement_manager" :
    roles.includes("procurement_officer")  ? "procurement_officer" :
    roles.includes("inventory_manager")    ? "inventory_manager" :
    roles.includes("warehouse_officer")    ? "warehouse_officer" : "requisitioner"
  );
  const isAdmin = roles.includes("admin");

  /* ── load settings ── */
  useEffect(() => {
    (supabase as any).from("system_settings")
      .select("key,value").in("key", ["system_name","hospital_name","system_logo_url"])
      .then(({ data }: any) => {
        if (!data) return;
        const m: Record<string,string> = {};
        data.forEach((r: any) => { if (r.key) m[r.key] = r.value; });
        if (m.system_name)     setSysName(m.system_name);
        if (m.hospital_name)   setHospitalName(m.hospital_name);
        if (m.system_logo_url) setLogoUrl(m.system_logo_url);
      });
  }, []);

  /* ── unread inbox badge ── */
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count } = await (supabase as any).from("inbox_items")
        .select("id", { count:"exact", head:true })
        .eq("to_user_id", user.id).eq("status","unread");
      setUnreadCount(count || 0);
    };
    fetch();
    const ch = (supabase as any).channel("inbox-badge")
      .on("postgres_changes",{ event:"*", schema:"public", table:"inbox_items" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  /* ── close user menu on outside click ── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pathHeader = PAGE_HEADERS[location.pathname] || { module:"MEDIPROCURE", label:"" };

  const enterMenu = (id: string) => {
    if (menuTimers.current[id]) clearTimeout(menuTimers.current[id]);
    setActiveMenu(id);
  };
  const leaveMenu = (id: string) => {
    menuTimers.current[id] = setTimeout(() =>
      setActiveMenu(prev => prev === id ? null : prev), 160);
  };

  const isSubActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div style={{
      display:"flex", flexDirection:"column", minHeight:"100vh",
      background:"#f0f2f5", fontFamily:"'Segoe UI',system-ui,sans-serif",
    }}>

      {/* ══ TOP NAVBAR ══ */}
      <header style={{
        display:"flex", alignItems:"center", height:56, padding:"0 12px", gap:6,
        position:"sticky", top:0, zIndex:100, flexShrink:0,
        background:"linear-gradient(90deg,#0a2558 0%,#1a3a6b 50%,#1d4a87 100%)",
        boxShadow:"0 2px 12px rgba(0,0,0,0.35)",
      }}>

        {/* Logo + name */}
        <Link to="/dashboard" style={{
          display:"flex", alignItems:"center", gap:9, marginRight:10,
          textDecoration:"none", flexShrink:0,
        }}>
          <div style={{
            width:34, height:34, borderRadius:8, overflow:"hidden",
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)",
            flexShrink:0,
          }}>
            {logoUrl
              ? <img src={logoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} />
              : <img src="/src/assets/embu-county-logo.jpg" alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}
                  onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
            }
          </div>
          <div style={{display:"flex",flexDirection:"column",lineHeight:1}}>
            <span style={{fontSize:13,fontWeight:900,color:"#fff",letterSpacing:"-0.01em"}}>{sysName}</span>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>{hospitalName}</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav style={{display:"flex",alignItems:"center",gap:2,flex:1,overflow:"hidden"}}>
          {MODULES.map(mod => {
            const isActive = mod.sub.length === 0
              ? location.pathname === mod.path
              : mod.sub.some(s => isSubActive(s.path));
            const isOpen = activeMenu === mod.id;
            const hasSub = mod.sub.length > 0;

            return (
              <div key={mod.id} style={{position:"relative",flexShrink:0}}
                onMouseEnter={() => hasSub && enterMenu(mod.id)}
                onMouseLeave={() => hasSub && leaveMenu(mod.id)}>
                <button
                  onClick={() => hasSub ? setActiveMenu(isOpen ? null : mod.id) : navigate(mod.path)}
                  style={{
                    display:"flex", alignItems:"center", gap:5,
                    padding:"6px 10px", borderRadius:6, border:"none",
                    fontSize:10.5, fontWeight:800, letterSpacing:"0.06em",
                    cursor:"pointer", whiteSpace:"nowrap",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.62)",
                    background: isActive ? `${mod.color}bb` : isOpen ? "rgba(255,255,255,0.08)" : "transparent",
                    borderBottom: isActive ? `2px solid ${mod.color}` : "2px solid transparent",
                    transition:"all 0.12s",
                  }}>
                  <mod.icon style={{width:13,height:13,flexShrink:0}} />
                  {mod.label}
                  {hasSub && <ChevronDown style={{width:10,height:10,opacity:0.5}} />}
                </button>

                {/* Dropdown */}
                {hasSub && isOpen && (
                  <div style={{
                    position:"absolute", top:"100%", left:0, marginTop:2,
                    minWidth:210, background:"#fff",
                    boxShadow:"0 8px 32px rgba(0,0,0,0.22)",
                    border:"1px solid #e5e7eb", borderRadius:10,
                    overflow:"hidden", zIndex:200,
                  }}>
                    <div style={{
                      padding:"6px 12px 4px",
                      background:`linear-gradient(90deg,${mod.color}22,${mod.color}08)`,
                      borderBottom:`2px solid ${mod.color}33`,
                    }}>
                      <span style={{fontSize:9,fontWeight:800,color:mod.color,letterSpacing:"0.08em",textTransform:"uppercase" as const}}>
                        {mod.label}
                      </span>
                    </div>
                    {mod.sub.map(s => {
                      const active = isSubActive(s.path);
                      return (
                        <Link key={s.path} to={s.path} onClick={() => setActiveMenu(null)}
                          style={{
                            display:"flex", alignItems:"center", gap:9,
                            padding:"9px 14px", textDecoration:"none", fontSize:12,
                            fontWeight: active ? 700 : 500,
                            color: active ? "#fff" : "#374151",
                            background: active ? mod.color : "transparent",
                            transition:"all 0.1s",
                          }}
                          onMouseEnter={e => { if(!active){ (e.currentTarget as HTMLElement).style.background=`${mod.color}15`; (e.currentTarget as HTMLElement).style.color=mod.color; } }}
                          onMouseLeave={e => { if(!active){ (e.currentTarget as HTMLElement).style.background="transparent"; (e.currentTarget as HTMLElement).style.color="#374151"; } }}>
                          <s.icon style={{width:13,height:13,flexShrink:0}} />
                          {s.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right controls */}
        <div style={{display:"flex",alignItems:"center",gap:4,marginLeft:"auto",flexShrink:0}}>

          {/* Inbox */}
          <button onClick={() => navigate("/inbox")}
            style={{position:"relative",padding:7,borderRadius:7,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.65)"}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <Mail style={{width:16,height:16}} />
            {unreadCount > 0 && (
              <span style={{
                position:"absolute", top:-1, right:-1,
                width:15, height:15, borderRadius:"50%",
                background:"#ef4444", color:"#fff",
                fontSize:8, fontWeight:800,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
          </button>

          {/* User menu */}
          <div style={{position:"relative"}} ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(v => !v)}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"5px 8px", borderRadius:7, border:"none",
                background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.85)",
              }}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
              onMouseLeave={e=>{ if(!userMenuOpen)(e.currentTarget as HTMLElement).style.background="transparent"; }}>
              <div style={{
                width:26, height:26, borderRadius:"50%",
                background:"rgba(255,255,255,0.2)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:11, fontWeight:800, color:"#fff",
              }}>
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div style={{textAlign:"left",lineHeight:1}}>
                <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{profile?.full_name?.split(" ")[0] || "User"}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>{ROLE_LABELS[primaryRole] || "User"}</div>
              </div>
              <ChevronDown style={{width:11,height:11,color:"rgba(255,255,255,0.4)"}} />
            </button>

            {userMenuOpen && (
              <div style={{
                position:"absolute", right:0, top:"100%", marginTop:4,
                minWidth:220, background:"#fff",
                boxShadow:"0 8px 32px rgba(0,0,0,0.22)",
                border:"1px solid #e5e7eb", borderRadius:10,
                overflow:"hidden", zIndex:200,
              }}>
                <div style={{padding:"10px 14px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{profile?.full_name}</div>
                  <div style={{fontSize:10,color:"#6b7280",marginTop:1}}>{profile?.email || user?.email}</div>
                  <span style={{
                    display:"inline-block",marginTop:5,fontSize:9,
                    padding:"2px 8px",borderRadius:4,fontWeight:700,
                    background:"#1a3a6b18",color:"#1a3a6b",
                  }}>{ROLE_LABELS[primaryRole]}</span>
                </div>
                <div style={{padding:"4px 0"}}>
                  {[
                    {label:"My Profile",  path:"/profile",     icon:UserCircle, show:true},
                    {label:"Settings",    path:"/settings",    icon:Settings,   show:isAdmin},
                    {label:"Admin Panel", path:"/admin/panel", icon:Database,   show:isAdmin},
                  ].filter(i=>i.show).map(item => (
                    <button key={item.path} onClick={() => { navigate(item.path); setUserMenuOpen(false); }}
                      style={{
                        display:"flex", alignItems:"center", gap:9,
                        width:"100%", padding:"9px 14px", border:"none",
                        background:"transparent", cursor:"pointer",
                        fontSize:12, color:"#374151", textAlign:"left" as const,
                      }}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <item.icon style={{width:14,height:14,color:"#9ca3af"}} />
                      {item.label}
                    </button>
                  ))}
                  <div style={{margin:"2px 12px",borderTop:"1px solid #f3f4f6"}} />
                  <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                    style={{
                      display:"flex", alignItems:"center", gap:9,
                      width:"100%", padding:"9px 14px", border:"none",
                      background:"transparent", cursor:"pointer",
                      fontSize:12, color:"#dc2626", textAlign:"left" as const,
                    }}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fef2f2"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <LogOut style={{width:14,height:14}} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setMobileOpen(v=>!v)}
            style={{display:"none",padding:7,borderRadius:7,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)"}}
            className="lg:!flex">
            {mobileOpen ? <X style={{width:18,height:18}} /> : <Menu style={{width:18,height:18}} />}
          </button>
        </div>
      </header>

      {/* ══ MOBILE DRAWER ══ */}
      {mobileOpen && (
        <div style={{position:"fixed",inset:0,zIndex:99}} onClick={() => setMobileOpen(false)}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)"}} />
          <div style={{
            position:"absolute", top:56, left:0, bottom:0, width:280,
            background:"#0a2558", overflowY:"auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{padding:"8px 0"}}>
              {MODULES.map(mod => (
                <div key={mod.id}>
                  <button onClick={() => { navigate(mod.path); setMobileOpen(false); }}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      width:"100%", padding:"10px 16px", border:"none",
                      background:"transparent", cursor:"pointer",
                      fontSize:11, fontWeight:800, letterSpacing:"0.06em",
                      color:"rgba(255,255,255,0.8)", textAlign:"left" as const,
                    }}>
                    <mod.icon style={{width:15,height:15,color:mod.color,flexShrink:0}} />
                    {mod.label}
                  </button>
                  {mod.sub.map(s => (
                    <Link key={s.path} to={s.path} onClick={() => setMobileOpen(false)}
                      style={{
                        display:"flex", alignItems:"center", gap:9,
                        padding:"7px 16px 7px 42px", textDecoration:"none",
                        fontSize:11, color:"rgba(255,255,255,0.5)",
                      }}>
                      <s.icon style={{width:12,height:12}} />
                      {s.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ BREADCRUMB ══ */}
      <div style={{
        display:"flex", alignItems:"center", gap:5,
        padding:"6px 14px", flexShrink:0,
        background:"#fff", borderBottom:"1px solid #e5e7eb",
      }}>
        <span style={{fontSize:10,color:"#9ca3af",fontWeight:500}}>{hospitalName}</span>
        <ChevronRight style={{width:11,height:11,color:"#d1d5db"}} />
        <span style={{fontSize:10,fontWeight:700,color:"#1a3a6b"}}>{pathHeader.module}</span>
        {pathHeader.label && (
          <>
            <ChevronRight style={{width:11,height:11,color:"#d1d5db"}} />
            <span style={{fontSize:10,color:"#6b7280"}}>{pathHeader.label}</span>
          </>
        )}
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <main style={{flex:1, overflow:"auto", background:"#f0f2f5"}}>
        {children}
      </main>

      {/* ══ FOOTER ══ */}
      <footer style={{
        padding:"6px 14px", textAlign:"center",
        fontSize:9, color:"#9ca3af",
        background:"#fff", borderTop:"1px solid #e5e7eb",
        flexShrink:0,
      }}>
        {hospitalName} · {sysName} © {new Date().getFullYear()} — All Rights Reserved
      </footer>
    </div>
  );
}
