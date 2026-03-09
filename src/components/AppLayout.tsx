import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Home, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Globe, Mail, Archive, Wifi, Activity, Bell,
  Menu, X, UserCircle, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer",
  inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer",
  requisitioner: "Requisitioner",
};

/* Each module declares which roles can see it.  Empty array = all roles */
const MODULES = [
  {
    id:"home", label:"HOME", icon:Home, color:"#1a3a6b", path:"/dashboard",
    roles:[], // everyone
    sub:[],
  },
  {
    id:"procurement", label:"PROCUREMENT", icon:ShoppingCart, color:"#0078d4", path:"/requisitions",
    roles:["admin","procurement_manager","procurement_officer","requisitioner"],
    sub:[
      { label:"Requisitions",     path:"/requisitions",         icon:ClipboardList, roles:[] },
      { label:"Purchase Orders",  path:"/purchase-orders",      icon:ShoppingCart,  roles:["admin","procurement_manager","procurement_officer"] },
      { label:"Goods Received",   path:"/goods-received",       icon:Package,       roles:["admin","procurement_manager","procurement_officer","warehouse_officer"] },
      { label:"Suppliers",        path:"/suppliers",            icon:Truck,         roles:["admin","procurement_manager","procurement_officer"] },
      { label:"Contracts",        path:"/contracts",            icon:FileCheck,     roles:["admin","procurement_manager"] },
      { label:"Tenders",          path:"/tenders",              icon:Gavel,         roles:["admin","procurement_manager","procurement_officer"] },
      { label:"Bid Evaluations",  path:"/bid-evaluations",      icon:Scale,         roles:["admin","procurement_manager"] },
      { label:"Procurement Plan", path:"/procurement-planning", icon:Calendar,      roles:["admin","procurement_manager"] },
    ],
  },
  {
    id:"vouchers", label:"VOUCHERS", icon:FileText, color:"#C45911", path:"/vouchers/payment",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      { label:"Payment Vouchers",  path:"/vouchers/payment",  icon:DollarSign, roles:["admin","procurement_manager","procurement_officer"] },
      { label:"Receipt Vouchers",  path:"/vouchers/receipt",  icon:Receipt,    roles:["admin","procurement_manager"] },
      { label:"Journal Vouchers",  path:"/vouchers/journal",  icon:BookMarked, roles:["admin","procurement_manager"] },
      { label:"Purchase Vouchers", path:"/vouchers/purchase", icon:FileText,   roles:["admin","procurement_manager"] },
      { label:"Sales Vouchers",    path:"/vouchers/sales",    icon:FileText,   roles:["admin","procurement_manager"] },
    ],
  },
  {
    id:"financials", label:"FINANCIALS", icon:BarChart3, color:"#1F6090", path:"/financials/dashboard",
    roles:["admin","procurement_manager"],
    sub:[
      { label:"Finance Dashboard",  path:"/financials/dashboard",        icon:BarChart3,  roles:["admin","procurement_manager"] },
      { label:"Chart of Accounts",  path:"/financials/chart-of-accounts",icon:BookOpen,   roles:["admin","procurement_manager"] },
      { label:"Budgets",            path:"/financials/budgets",           icon:PiggyBank,  roles:["admin","procurement_manager"] },
      { label:"Fixed Assets",       path:"/financials/fixed-assets",      icon:Building2,  roles:["admin","procurement_manager"] },
    ],
  },
  {
    id:"inventory", label:"INVENTORY", icon:Package, color:"#107c10", path:"/items",
    roles:["admin","procurement_manager","inventory_manager","warehouse_officer"],
    sub:[
      { label:"Items",       path:"/items",       icon:Package,   roles:["admin","inventory_manager","warehouse_officer","procurement_manager"] },
      { label:"Categories",  path:"/categories",  icon:Layers,    roles:["admin","inventory_manager","procurement_manager"] },
      { label:"Departments", path:"/departments", icon:Building2, roles:["admin","inventory_manager","procurement_manager"] },
      { label:"Scanner",     path:"/scanner",     icon:Search,    roles:["admin","inventory_manager","warehouse_officer"] },
    ],
  },
  {
    id:"quality", label:"QUALITY", icon:Shield, color:"#00695C", path:"/quality/dashboard",
    roles:["admin","procurement_manager","warehouse_officer"],
    sub:[
      { label:"QC Dashboard",    path:"/quality/dashboard",       icon:Shield,        roles:[] },
      { label:"Inspections",     path:"/quality/inspections",     icon:ClipboardList, roles:[] },
      { label:"Non-Conformance", path:"/quality/non-conformance", icon:AlertTriangle, roles:[] },
    ],
  },
  {
    id:"reports", label:"REPORTS", icon:BarChart3, color:"#5C2D91", path:"/reports",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      { label:"Reports",   path:"/reports",   icon:BarChart3, roles:["admin","procurement_manager","procurement_officer"] },
      { label:"Documents", path:"/documents", icon:FileCheck, roles:["admin","procurement_manager","procurement_officer"] },
      { label:"Audit Log", path:"/audit-log", icon:Activity,  roles:["admin","procurement_manager"] },
    ],
  },
  {
    id:"admin", label:"ADMIN", icon:Database, color:"#1a1a6b", path:"/admin/panel",
    roles:["admin"],
    sub:[
      { label:"Admin Panel",    path:"/admin/panel",   icon:Settings,  roles:["admin"] },
      { label:"Users",          path:"/users",          icon:Users,     roles:["admin"] },
      { label:"Database Admin", path:"/admin/database", icon:Database,  roles:["admin"] },
      { label:"Settings",       path:"/settings",       icon:Settings,  roles:["admin"] },
      { label:"Email",          path:"/email",          icon:Mail,      roles:["admin"] },
      { label:"Backup",         path:"/backup",         icon:Archive,   roles:["admin"] },
      { label:"Webmaster",      path:"/webmaster",      icon:Globe,     roles:["admin"] },
    ],
  },
];

const PAGE_HEADERS: Record<string, { module: string; label: string }> = {
  "/dashboard": {module:"HOME",label:"Dashboard"}, "/requisitions":{module:"PROCUREMENT",label:"Requisitions"},
  "/purchase-orders":{module:"PROCUREMENT",label:"Purchase Orders"}, "/goods-received":{module:"PROCUREMENT",label:"Goods Received"},
  "/suppliers":{module:"PROCUREMENT",label:"Suppliers"}, "/contracts":{module:"PROCUREMENT",label:"Contracts"},
  "/tenders":{module:"PROCUREMENT",label:"Tenders"}, "/bid-evaluations":{module:"PROCUREMENT",label:"Bid Evaluations"},
  "/procurement-planning":{module:"PROCUREMENT",label:"Procurement Plan"},
  "/vouchers/payment":{module:"VOUCHERS",label:"Payment Vouchers"}, "/vouchers/receipt":{module:"VOUCHERS",label:"Receipt Vouchers"},
  "/vouchers/journal":{module:"VOUCHERS",label:"Journal Vouchers"}, "/vouchers/purchase":{module:"VOUCHERS",label:"Purchase Vouchers"},
  "/vouchers/sales":{module:"VOUCHERS",label:"Sales Vouchers"},
  "/financials/dashboard":{module:"FINANCIALS",label:"Finance Dashboard"},
  "/financials/chart-of-accounts":{module:"FINANCIALS",label:"Chart of Accounts"},
  "/financials/budgets":{module:"FINANCIALS",label:"Budgets"}, "/financials/fixed-assets":{module:"FINANCIALS",label:"Fixed Assets"},
  "/items":{module:"INVENTORY",label:"Items"}, "/categories":{module:"INVENTORY",label:"Categories"},
  "/departments":{module:"INVENTORY",label:"Departments"}, "/scanner":{module:"INVENTORY",label:"Barcode Scanner"},
  "/quality/dashboard":{module:"QUALITY",label:"Quality Dashboard"}, "/quality/inspections":{module:"QUALITY",label:"Inspections"},
  "/quality/non-conformance":{module:"QUALITY",label:"Non-Conformance"},
  "/reports":{module:"REPORTS",label:"Reports"}, "/documents":{module:"REPORTS",label:"Documents"},
  "/audit-log":{module:"REPORTS",label:"Audit Log"}, "/email":{module:"COMMUNICATIONS",label:"Email"},
  "/inbox":{module:"COMMUNICATIONS",label:"Inbox"}, "/users":{module:"ADMIN",label:"Users"},
  "/admin/database":{module:"ADMIN",label:"Database Admin"}, "/admin/panel":{module:"ADMIN",label:"Admin Panel"},
  "/webmaster":{module:"ADMIN",label:"Webmaster"}, "/settings":{module:"ADMIN",label:"Settings"},
  "/backup":{module:"ADMIN",label:"Backup"}, "/profile":{module:"PROFILE",label:"My Profile"},
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, signOut, user } = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();

  const [activeMenu,   setActiveMenu]   = useState<string | null>(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuTimers  = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const primaryRole = (
    roles.includes("admin")               ? "admin" :
    roles.includes("procurement_manager") ? "procurement_manager" :
    roles.includes("procurement_officer") ? "procurement_officer" :
    roles.includes("inventory_manager")   ? "inventory_manager" :
    roles.includes("warehouse_officer")   ? "warehouse_officer" : "requisitioner"
  );
  const isAdmin = roles.includes("admin");

  /* Filter modules by role */
  const visibleModules = MODULES.filter(m =>
    m.roles.length === 0 || m.roles.some(r => roles.includes(r))
  ).map(m => ({
    ...m,
    sub: m.sub.filter(s => (s.roles?.length ?? 0) === 0 || (s.roles ?? []).some((r: string) => roles.includes(r))),
  }));

  useEffect(() => {
    (supabase as any).from("system_settings")
      .select("key,value").in("key", ["system_name","hospital_name","system_logo_url"])
      .then(({ data }: any) => {
        const m: Record<string,string> = {};
        (data||[]).forEach((r: any) => { if (r.key) m[r.key] = r.value; });
        if (m.system_name)     setSysName(m.system_name);
        if (m.hospital_name)   setHospitalName(m.hospital_name);
        if (m.system_logo_url) setLogoUrl(m.system_logo_url);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count } = await (supabase as any).from("inbox_items")
        .select("id", { count:"exact", head:true })
        .eq("to_user_id", user.id).eq("status","unread");
      setUnreadCount(count || 0);
    };
    fetch();
    const ch = (supabase as any).channel("inbox-badge-v2")
      .on("postgres_changes",{ event:"*", schema:"public", table:"inbox_items" }, fetch)
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pathHeader = PAGE_HEADERS[location.pathname] || { module:"MEDIPROCURE", label:"" };
  const enterMenu = (id: string) => { clearTimeout(menuTimers.current[id]); setActiveMenu(id); };
  const leaveMenu = (id: string) => { menuTimers.current[id] = setTimeout(() => setActiveMenu(p => p===id ? null : p), 180); };
  const isSubActive = (path: string) => location.pathname === path || location.pathname.startsWith(path+"/");

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:"#f4f6f9", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif" }}>

      {/* ══ TOP NAVBAR ══ */}
      <header style={{
        display:"flex", alignItems:"center", height:54, padding:"0 10px", gap:4,
        position:"sticky", top:0, zIndex:200, flexShrink:0,
        background:"linear-gradient(90deg,#0a2558 0%,#1a3a6b 55%,#1d4a87 100%)",
        boxShadow:"0 2px 16px rgba(0,0,0,0.28)",
      }}>
        {/* Logo */}
        <Link to="/dashboard" style={{ display:"flex", alignItems:"center", gap:8, marginRight:8, textDecoration:"none", flexShrink:0 }}>
          <div style={{ width:32, height:32, borderRadius:7, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.22)" }}>
            {logoUrl
              ? <img src={logoUrl} alt="" style={{width:"100%",height:"100%",objectFit:"contain"}}/>
              : <img src="/src/assets/embu-county-logo.jpg" alt="" style={{width:"100%",height:"100%",objectFit:"contain"}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            }
          </div>
          <div style={{ lineHeight:1 }}>
            <div style={{ fontSize:12, fontWeight:900, color:"#fff", letterSpacing:"-0.01em" }}>{sysName}</div>
            <div style={{ fontSize:8.5, color:"rgba(255,255,255,0.42)", marginTop:1 }}>{hospitalName}</div>
          </div>
        </Link>

        {/* Role-based navigation */}
        <nav style={{ display:"flex", alignItems:"stretch", gap:1, flex:1, overflow:"hidden", height:"100%" }}>
          {visibleModules.map(mod => {
            const isActive = mod.sub.length===0 ? location.pathname===mod.path : mod.sub.some(s=>isSubActive(s.path));
            const isOpen   = activeMenu===mod.id;
            const hasSub   = mod.sub.length > 0;
            return (
              <div key={mod.id} style={{position:"relative",display:"flex",alignItems:"stretch",flexShrink:0}}
                onMouseEnter={()=>hasSub&&enterMenu(mod.id)}
                onMouseLeave={()=>hasSub&&leaveMenu(mod.id)}>
                <button
                  onClick={()=>hasSub ? setActiveMenu(isOpen?null:mod.id) : navigate(mod.path)}
                  style={{
                    display:"flex", alignItems:"center", gap:5,
                    padding:"0 9px", border:"none", fontSize:10, fontWeight:800,
                    letterSpacing:"0.05em", cursor:"pointer", whiteSpace:"nowrap",
                    color: isActive ? "#fff" : "rgba(255,255,255,0.58)",
                    background: isActive ? `${mod.color}aa` : isOpen ? "rgba(255,255,255,0.08)" : "transparent",
                    borderBottom: isActive ? `2px solid ${mod.color === "#1a1a6b" ? "#60a5fa" : mod.color}` : "2px solid transparent",
                    transition:"all 0.12s",
                  }}>
                  <mod.icon style={{width:12,height:12,flexShrink:0}}/>
                  {mod.label}
                  {hasSub && <ChevronDown style={{width:9,height:9,opacity:0.5}}/>}
                </button>

                {/* Dropdown */}
                {hasSub && isOpen && (
                  <div style={{
                    position:"absolute", top:"100%", left:0, marginTop:2,
                    minWidth:200, background:"#fff",
                    boxShadow:"0 8px 28px rgba(0,0,0,0.18)",
                    border:"1px solid #e5e7eb", borderRadius:9,
                    overflow:"hidden", zIndex:300,
                  }}>
                    <div style={{padding:"5px 12px 4px",background:`linear-gradient(90deg,${mod.color}20,${mod.color}06)`,borderBottom:`2px solid ${mod.color}30`}}>
                      <span style={{fontSize:9,fontWeight:800,color:mod.color,letterSpacing:"0.08em",textTransform:"uppercase" as const}}>{mod.label}</span>
                    </div>
                    {mod.sub.map(s => {
                      const active = isSubActive(s.path);
                      return (
                        <Link key={s.path} to={s.path} onClick={()=>setActiveMenu(null)}
                          style={{
                            display:"flex", alignItems:"center", gap:8, padding:"8px 13px",
                            textDecoration:"none", fontSize:12, fontWeight:active?700:500,
                            color:active?"#fff":"#374151", background:active?mod.color:"transparent",
                            transition:"all 0.1s",
                          }}
                          onMouseEnter={e=>{if(!active){(e.currentTarget as HTMLElement).style.background=`${mod.color}12`;(e.currentTarget as HTMLElement).style.color=mod.color;}}}
                          onMouseLeave={e=>{if(!active){(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="#374151";}}}>
                          <s.icon style={{width:12,height:12,flexShrink:0}}/>{s.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right side */}
        <div style={{display:"flex",alignItems:"center",gap:2,marginLeft:"auto",flexShrink:0}}>
          {/* Email/Inbox */}
          <button onClick={()=>navigate("/email")} title="Email"
            style={{position:"relative",padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)"}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <Mail style={{width:15,height:15}}/>
            {unreadCount>0 && <span style={{position:"absolute",top:-1,right:-1,width:14,height:14,borderRadius:"50%",background:"#ef4444",color:"#fff",fontSize:8,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{unreadCount>9?"9+":unreadCount}</span>}
          </button>

          {/* Notifications */}
          <button onClick={()=>navigate("/inbox")} title="Notifications"
            style={{padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)"}}
            onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
            onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
            <Bell style={{width:15,height:15}}/>
          </button>

          {/* User menu */}
          <div style={{position:"relative"}} ref={userMenuRef}>
            <button onClick={()=>setUserMenuOpen(v=>!v)}
              style={{display:"flex",alignItems:"center",gap:6,padding:"4px 7px",borderRadius:6,border:"none",background:"rgba(255,255,255,0.08)",cursor:"pointer",color:"rgba(255,255,255,0.85)",transition:"all 0.12s"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.14)"}
              onMouseLeave={e=>{if(!userMenuOpen)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)";}}>
              <div style={{width:24,height:24,borderRadius:"50%",background:"rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>
                {profile?.full_name?.[0]?.toUpperCase()||"U"}
              </div>
              <div style={{textAlign:"left",lineHeight:1}}>
                <div style={{fontSize:11,fontWeight:700,color:"#fff"}}>{profile?.full_name?.split(" ")[0]||"User"}</div>
                <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{ROLE_LABELS[primaryRole]||"User"}</div>
              </div>
              <ChevronDown style={{width:10,height:10,color:"rgba(255,255,255,0.35)"}}/>
            </button>

            {userMenuOpen && (
              <div style={{position:"absolute",right:0,top:"100%",marginTop:5,minWidth:210,background:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden",zIndex:300}}>
                <div style={{padding:"10px 13px",background:"#f9fafb",borderBottom:"1px solid #e5e7eb"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{profile?.full_name}</div>
                  <div style={{fontSize:10,color:"#6b7280",marginTop:1}}>{profile?.email||user?.email}</div>
                  <span style={{display:"inline-block",marginTop:4,fontSize:9,padding:"2px 7px",borderRadius:4,fontWeight:700,background:"#1a3a6b15",color:"#1a3a6b"}}>{ROLE_LABELS[primaryRole]}</span>
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

          {/* Mobile toggle */}
          <button onClick={()=>setMobileOpen(v=>!v)} className="md:hidden"
            style={{padding:6,borderRadius:6,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.7)"}}>
            {mobileOpen?<X style={{width:16,height:16}}/>:<Menu style={{width:16,height:16}}/>}
          </button>
        </div>
      </header>

      {/* Breadcrumb bar */}
      <div style={{
        display:"flex", alignItems:"center", gap:6, padding:"5px 14px",
        background:"#fff", borderBottom:"1px solid #e5e7eb",
        fontSize:11, color:"#6b7280", flexShrink:0,
      }}>
        <span style={{color:"#9ca3af"}}>☰</span>
        <span style={{color:"#9ca3af"}}>{pathHeader.module}</span>
        {pathHeader.label && <><span style={{color:"#d1d5db"}}>›</span><span style={{fontWeight:600,color:"#374151"}}>{pathHeader.label}</span></>}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#22c55e"}}/>
          <span style={{fontSize:9,color:"#22c55e",fontWeight:700}}>LIVE</span>
          <span style={{fontSize:9,color:"#9ca3af",marginLeft:6}}>{new Date().toLocaleDateString("en-KE",{weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</span>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.5)"}} onClick={()=>setMobileOpen(false)}>
          <div onClick={e=>e.stopPropagation()} style={{width:280,height:"100%",background:"#fff",overflowY:"auto",padding:"12px 0"}}>
            {visibleModules.map(mod=>(
              <div key={mod.id}>
                <div style={{padding:"8px 14px",fontSize:10,fontWeight:800,color:mod.color,letterSpacing:"0.08em",textTransform:"uppercase" as const}}>{mod.label}</div>
                {(mod.sub.length===0?[{label:mod.label,path:mod.path,icon:mod.icon}]:mod.sub).map((s:any)=>(
                  <Link key={s.path} to={s.path} onClick={()=>setMobileOpen(false)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"9px 20px",textDecoration:"none",fontSize:12,color:isSubActive(s.path)?mod.color:"#374151",fontWeight:isSubActive(s.path)?700:400,background:isSubActive(s.path)?`${mod.color}10`:"transparent"}}>
                    <s.icon style={{width:13,height:13}}/>{s.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex:1, overflow:"auto", background:"#f4f6f9" }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        padding:"7px 16px", background:"#fff", borderTop:"1px solid #e5e7eb",
        display:"flex", alignItems:"center", justifyContent:"space-between",
        fontSize:10, color:"#9ca3af", flexShrink:0,
      }}>
        <span>{hospitalName} · {sysName} © {new Date().getFullYear()}</span>
        <span>Embu County Government · Powered by MediProcure ERP</span>
      </footer>
    </div>
  );
}
