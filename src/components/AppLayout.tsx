import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationPopup";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Home, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Mail, Activity, Menu, X, UserCircle, ChevronLeft,
  ChevronRight, Globe, Archive, Server, TrendingUp,
  LayoutDashboard, Sliders, Eye, Lock, Cpu
} from "lucide-react";

const ROLE_LABELS: Record<string,string> = {
  admin:"Administrator", procurement_manager:"Proc. Manager",
  procurement_officer:"Proc. Officer", inventory_manager:"Inventory Mgr",
  warehouse_officer:"Warehouse", requisitioner:"Requisitioner",
};

const MODULES = [
  { id:"home", label:"Dashboard", icon:LayoutDashboard, color:"#60a5fa", path:"/dashboard", roles:[] as string[], sub:[] as {label:string;path:string;icon:any;roles:string[]}[] },
  { id:"procurement", label:"Procurement", icon:ShoppingCart, color:"#38bdf8", path:"/requisitions",
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
  { id:"vouchers", label:"Vouchers", icon:FileText, color:"#fb923c", path:"/vouchers/payment",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Payment",  path:"/vouchers/payment",  icon:DollarSign, roles:[]},
      {label:"Receipt",  path:"/vouchers/receipt",  icon:Receipt,    roles:["admin","procurement_manager"]},
      {label:"Journal",  path:"/vouchers/journal",  icon:BookMarked, roles:["admin","procurement_manager"]},
      {label:"Purchase", path:"/vouchers/purchase", icon:FileText,   roles:["admin","procurement_manager"]},
      {label:"Sales",    path:"/vouchers/sales",    icon:FileText,   roles:["admin","procurement_manager"]},
    ]},
  { id:"financials", label:"Financials", icon:TrendingUp, color:"#34d399", path:"/financials/dashboard",
    roles:["admin","procurement_manager"],
    sub:[
      {label:"Finance Dashboard",  path:"/financials/dashboard",        icon:TrendingUp, roles:[]},
      {label:"Chart of Accounts",  path:"/financials/chart-of-accounts",icon:BookOpen,   roles:[]},
      {label:"Budgets",            path:"/financials/budgets",          icon:PiggyBank,  roles:[]},
      {label:"Fixed Assets",       path:"/financials/fixed-assets",     icon:Building2,  roles:[]},
    ]},
  { id:"inventory", label:"Inventory", icon:Package, color:"#a78bfa", path:"/items",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"Items / Stock", path:"/items",       icon:Package,   roles:[]},
      {label:"Categories",    path:"/categories",  icon:Layers,    roles:["admin","inventory_manager"]},
      {label:"Departments",   path:"/departments", icon:Building2, roles:["admin","inventory_manager"]},
      {label:"Scanner",       path:"/scanner",     icon:Search,    roles:[]},
    ]},
  { id:"quality", label:"Quality", icon:Shield, color:"#4ade80", path:"/quality/dashboard",
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"QC Dashboard",    path:"/quality/dashboard",       icon:Shield, roles:[]},
      {label:"Inspections",     path:"/quality/inspections",     icon:Eye,    roles:[]},
      {label:"Non-Conformance", path:"/quality/non-conformance", icon:Shield, roles:[]},
    ]},
  { id:"reports", label:"Reports & BI", icon:BarChart3, color:"#f472b6", path:"/reports",
    roles:["admin","procurement_manager","procurement_officer"],
    sub:[
      {label:"Analytics",   path:"/reports",    icon:BarChart3, roles:[]},
      {label:"Audit Log",   path:"/audit-log",  icon:Activity,  roles:["admin","procurement_manager"]},
      {label:"Documents",   path:"/documents",  icon:FileText,  roles:[]},
    ]},
  { id:"admin", label:"Administration", icon:Settings, color:"#fbbf24", path:"/admin/panel",
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
  const location  = useLocation();
  const navigate  = useNavigate();
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [activeMenu,   setActiveMenu]   = useState<string|null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile,     setIsMobile]     = useState(window.innerWidth < 900);
  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl,      setLogoUrl]      = useState<string|null>(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchOpen,   setSearchOpen]   = useState(false);

  const primaryRole = roles[0] || "requisitioner";
  const isAdmin = roles.includes("admin");

  useEffect(()=>{
    const handle = ()=>{
      const w = window.innerWidth;
      setIsMobile(w < 900);
      if (w < 1100 && w >= 900) setCollapsed(true);
      else if (w >= 1100) setCollapsed(false);
    };
    window.addEventListener("resize", handle);
    handle();
    return ()=>window.removeEventListener("resize", handle);
  },[]);

  useEffect(()=>{ setMobileOpen(false); setUserMenuOpen(false); },[location.pathname]);

  useEffect(()=>{
    const active = MODULES.find(m => m.path===location.pathname || m.sub.some(s=>location.pathname.startsWith(s.path)));
    if (active) setActiveMenu(active.id);
  },[location.pathname]);

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","logo_url"])
      .then(({data}:any)=>{
        data?.forEach((r:any)=>{
          if(r.key==="system_name")   setSysName(r.value||"EL5 MediProcure");
          if(r.key==="hospital_name") setHospitalName(r.value||"Embu Level 5 Hospital");
          if(r.key==="logo_url")      setLogoUrl(r.value||null);
        });
      });
  },[]);

  useEffect(()=>{
    const handler=(e:MouseEvent)=>{ if(userMenuRef.current&&!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false); };
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[]);

  const canSee = (m: typeof MODULES[0]) => !m.roles.length || m.roles.some(r=>roles.includes(r));

  const allPages = MODULES.flatMap(m=>[
    {label:m.label,path:m.path,icon:m.icon,color:m.color},
    ...m.sub.map(s=>({label:`${m.label} › ${s.label}`,path:s.path,icon:s.icon,color:m.color}))
  ]);
  const searchResults = searchQuery.length>1
    ? allPages.filter(p=>p.label.toLowerCase().includes(searchQuery.toLowerCase())).slice(0,6)
    : [];

  const SidebarContent = ({forMobile=false}:{forMobile?:boolean}) => (
    <div style={{
      display:"flex", flexDirection:"column", height:"100%",
      width: forMobile ? 260 : "100%",
      backgroundImage:`linear-gradient(180deg,rgba(6,14,35,0.93) 0%,rgba(10,22,54,0.89) 100%),url(${procBg})`,
      backgroundSize:"cover", backgroundPosition:"center top",
    }}>
      {/* Logo */}
      <div style={{padding:collapsed&&!forMobile?"12px 0":"14px 12px",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",gap:9,justifyContent:collapsed&&!forMobile?"center":"flex-start",flexShrink:0}}>
        <img src={logoImg} alt="" style={{width:28,height:28,borderRadius:6,objectFit:"contain",background:"rgba(255,255,255,0.1)",padding:3,flexShrink:0}}/>
        {(!collapsed||forMobile)&&(
          <div style={{minWidth:0}}>
            <div style={{fontSize:11.5,fontWeight:800,color:"#fff",letterSpacing:"0.02em",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{sysName}</div>
            <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{hospitalName}</div>
          </div>
        )}
        {forMobile&&<button onClick={()=>setMobileOpen(false)} style={{marginLeft:"auto",background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,padding:5,cursor:"pointer",color:"rgba(255,255,255,0.7)",lineHeight:0}}><X style={{width:13,height:13}}/></button>}
      </div>

      {/* Nav */}
      <nav style={{flex:1,overflowY:"auto",padding:"6px 0"}} className="sb-scroll">
        {MODULES.filter(canSee).map(m=>{
          const isActive = activeMenu===m.id;
          const isCurrent = location.pathname===m.path||m.sub.some(s=>location.pathname.startsWith(s.path));
          const filteredSub = m.sub.filter(s=>!s.roles.length||s.roles.some(r=>roles.includes(r)));
          return (
            <div key={m.id}>
              <button onClick={()=>{
                if(filteredSub.length&&!collapsed){ setActiveMenu(isActive?null:m.id); }
                else navigate(m.path);
              }}
                title={collapsed?m.label:undefined}
                style={{display:"flex",alignItems:"center",width:"100%",padding:collapsed&&!forMobile?"10px 0":"8px 12px",justifyContent:collapsed&&!forMobile?"center":"flex-start",gap:8,border:"none",cursor:"pointer",textAlign:"left" as const,borderLeft:isCurrent?`3px solid ${m.color}`:"3px solid transparent",background:isCurrent?"rgba(255,255,255,0.12)":"transparent",transition:"all 0.14s"}}
                onMouseEnter={e=>{if(!isCurrent)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)";}}
                onMouseLeave={e=>{if(!isCurrent)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                <m.icon style={{width:14,height:14,color:isCurrent?m.color:"rgba(255,255,255,0.6)",flexShrink:0}}/>
                {(!collapsed||forMobile)&&<>
                  <span style={{flex:1,fontSize:11.5,fontWeight:isCurrent?700:500,color:isCurrent?"#fff":"rgba(255,255,255,0.75)",lineHeight:1.2}}>{m.label}</span>
                  {filteredSub.length>0&&<ChevronRight style={{width:10,height:10,color:"rgba(255,255,255,0.35)",transform:isActive?"rotate(90deg)":"none",transition:"transform 0.18s"}}/>}
                </>}
              </button>
              {/* Sub-items */}
              {isActive&&(!collapsed||forMobile)&&filteredSub.map(s=>{
                const sa=location.pathname.startsWith(s.path);
                return(
                  <Link key={s.path} to={s.path} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px 7px 28px",textDecoration:"none",background:sa?"rgba(255,255,255,0.13)":"transparent",borderLeft:sa?`3px solid ${m.color}`:"3px solid transparent",transition:"all 0.1s"}}
                    onMouseEnter={e=>{if(!sa)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.06)";}}
                    onMouseLeave={e=>{if(!sa)(e.currentTarget as HTMLElement).style.background="transparent";}}>
                    <s.icon style={{width:11,height:11,color:sa?m.color:"rgba(255,255,255,0.45)",flexShrink:0}}/>
                    <span style={{fontSize:11,fontWeight:sa?600:400,color:sa?"#fff":"rgba(255,255,255,0.62)"}}>{s.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",flexShrink:0,padding:collapsed&&!forMobile?"10px 0":"9px 12px"}}>
        {(!collapsed||forMobile)?(
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#C45911,#e07830)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,fontWeight:800,color:"#fff"}}>{profile?.full_name?.[0]?.toUpperCase()||"U"}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.full_name||"User"}</div>
              <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",marginTop:1}}>{ROLE_LABELS[primaryRole]||"Staff"}</div>
            </div>
            <button onClick={()=>{signOut();navigate("/login");}} title="Sign out"
              style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:5,padding:"4px 5px",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0}}>
              <LogOut style={{width:11,height:11}}/>
            </button>
          </div>
        ):(
          <button onClick={()=>{signOut();navigate("/login");}} title="Sign out"
            style={{display:"flex",justifyContent:"center",width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:8,color:"rgba(255,255,255,0.5)",lineHeight:0}}>
            <LogOut style={{width:13,height:13}}/>
          </button>
        )}
      </div>
    </div>
  );

  const sidebarW = isMobile ? 0 : (collapsed ? 54 : 230);

  return (
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:"#f0f2f5",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* Desktop sidebar */}
      {!isMobile&&(
        <div style={{width:sidebarW,flexShrink:0,height:"100vh",transition:"width 0.2s cubic-bezier(0.4,0,0.2,1)",overflow:"hidden",boxShadow:"2px 0 14px rgba(0,0,0,0.18)",zIndex:100,position:"relative"}}>
          <SidebarContent/>
          {/* Collapse toggle */}
          <button onClick={()=>setCollapsed(v=>!v)} title={collapsed?"Expand":"Collapse"}
            style={{position:"absolute",bottom:58,right:collapsed?"50%":-10,transform:collapsed?"translateX(50%)":"none",width:20,height:20,borderRadius:"50%",background:"#1a3a6b",border:"2px solid #fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,0.3)",zIndex:10,transition:"all 0.2s"}}>
            {collapsed?<ChevronRight style={{width:9,height:9}}/>:<ChevronLeft style={{width:9,height:9}}/>}
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile&&mobileOpen&&(
        <div style={{position:"fixed",inset:0,zIndex:500,display:"flex"}}>
          <div><SidebarContent forMobile/></div>
          <div onClick={()=>setMobileOpen(false)} style={{flex:1,background:"rgba(0,0,0,0.5)"}}/>
        </div>
      )}

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0}}>

        {/* Topbar */}
        <header style={{height:50,flexShrink:0,background:"linear-gradient(135deg,#0a2558 0%,#1a3a6b 60%,#1d4a87 100%)",borderBottom:"1px solid rgba(255,255,255,0.08)",display:"flex",alignItems:"center",padding:"0 14px",gap:8,boxShadow:"0 2px 12px rgba(0,0,0,0.2)",zIndex:90,position:"relative"}}>
          {isMobile&&(
            <button onClick={()=>setMobileOpen(v=>!v)} style={{background:"rgba(255,255,255,0.1)",border:"none",borderRadius:6,padding:7,cursor:"pointer",color:"#fff",lineHeight:0,flexShrink:0}}>
              <Menu style={{width:15,height:15}}/>
            </button>
          )}
          {isMobile&&(
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <img src={logoImg} alt="" style={{width:22,height:22,borderRadius:4}}/>
              <span style={{fontSize:11,fontWeight:800,color:"#fff",whiteSpace:"nowrap" as const}}>{sysName}</span>
            </div>
          )}

          {/* Search */}
          <div style={{flex:1,maxWidth:isMobile?undefined:380,position:"relative"}}>
            <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"rgba(255,255,255,0.38)",pointerEvents:"none"}}/>
            <input value={searchQuery} onChange={e=>{setSearchQuery(e.target.value);setSearchOpen(true);}}
              onFocus={()=>setSearchOpen(true)} onBlur={()=>setTimeout(()=>setSearchOpen(false),180)}
              placeholder="Search modules & pages…"
              style={{width:"100%",paddingLeft:28,paddingRight:8,height:30,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.14)",borderRadius:6,outline:"none",fontSize:11.5,color:"#fff",fontFamily:"inherit"}}/>
            {searchOpen&&searchResults.length>0&&(
              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb",overflow:"hidden",zIndex:200}}>
                {searchResults.map(r=>(
                  <button key={r.path} onMouseDown={()=>{navigate(r.path);setSearchQuery("");setSearchOpen(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <div style={{width:24,height:24,borderRadius:5,background:`${r.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <r.icon style={{width:12,height:12,color:r.color}}/>
                    </div>
                    <span style={{fontSize:12,color:"#111827",fontWeight:500}}>{r.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{display:"flex",alignItems:"center",gap:3,marginLeft:"auto",flexShrink:0}}>
            <button onClick={()=>navigate("/email")} title="Mail & Inbox"
              style={{padding:"4px 8px",borderRadius:5,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.6)",lineHeight:0,display:"flex",alignItems:"center",gap:4}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.1)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
              <Mail style={{width:14,height:14}}/>
              <span style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.55)"}}>Mail</span>
            </button>

            <NotificationBell logoUrl={logoUrl} sysName={sysName} hospitalName={hospitalName}/>

            <div style={{width:1,height:18,background:"rgba(255,255,255,0.15)",margin:"0 3px"}}/>

            {/* User menu */}
            <div style={{position:"relative"}} ref={userMenuRef}>
              <button onClick={()=>setUserMenuOpen(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:5,padding:"3px 7px",borderRadius:5,border:"none",background:"rgba(255,255,255,0.08)",cursor:"pointer"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.14)"}
                onMouseLeave={e=>{if(!userMenuOpen)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)";}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:"linear-gradient(135deg,#C45911,#e07830)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#fff"}}>{profile?.full_name?.[0]?.toUpperCase()||"U"}</div>
                {!isMobile&&<div style={{textAlign:"left" as const,lineHeight:1}}>
                  <div style={{fontSize:10.5,fontWeight:700,color:"#fff",maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{profile?.full_name?.split(" ")[0]||"User"}</div>
                  <div style={{fontSize:8,color:"rgba(255,255,255,0.42)",marginTop:1}}>{ROLE_LABELS[primaryRole]||"Staff"}</div>
                </div>}
                <ChevronDown style={{width:9,height:9,color:"rgba(255,255,255,0.38)"}}/>
              </button>

              {userMenuOpen&&(
                <div style={{position:"absolute",right:0,top:"calc(100% + 5px)",minWidth:200,background:"#fff",boxShadow:"0 8px 28px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb",borderRadius:9,overflow:"hidden",zIndex:300}}>
                  <div style={{padding:"10px 14px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{profile?.full_name}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",marginTop:1}}>{profile?.email||user?.email}</div>
                  </div>
                  {[
                    {label:"My Profile",   path:"/profile",     icon:UserCircle},
                    {label:"Mail & Inbox",  path:"/email",       icon:Mail},
                    ...(isAdmin?[
                      {label:"Admin Panel",path:"/admin/panel", icon:Sliders},
                      {label:"Users",      path:"/users",       icon:Users},
                      {label:"Settings",   path:"/settings",    icon:Settings},
                    ]:[]),
                  ].map(item=>(
                    <button key={item.path} onClick={()=>{navigate(item.path);setUserMenuOpen(false);}}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:12,color:"#374151"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f9fafb"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <item.icon style={{width:13,height:13,color:"#6b7280"}}/>{item.label}
                    </button>
                  ))}
                  <div style={{borderTop:"1px solid #f3f4f6"}}>
                    <button onClick={()=>{signOut();navigate("/login");}}
                      style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 14px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left" as const,fontSize:12,color:"#dc2626"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fef2f2"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <LogOut style={{width:13,height:13}}/> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div style={{height:28,flexShrink:0,background:"#fff",borderBottom:"1px solid #e5e7eb",display:"flex",alignItems:"center",padding:"0 14px",gap:5,fontSize:10,color:"#9ca3af"}}>
          <Home style={{width:10,height:10}}/><span style={{color:"#e5e7eb"}}>/</span>
          {(()=>{
            const active = MODULES.find(m=>m.sub.some(s=>location.pathname.startsWith(s.path))||location.pathname===m.path);
            const sub = active?.sub.find(s=>location.pathname.startsWith(s.path));
            return <>
              {active&&<span style={{fontWeight:600,color:"#6b7280"}}>{active.label}</span>}
              {sub&&<><span style={{color:"#e5e7eb"}}>/</span><span style={{fontWeight:600,color:"#374151"}}>{sub.label}</span></>}
              {!active&&<span style={{fontWeight:600,color:"#374151"}}>Dashboard</span>}
            </>;
          })()}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:"#22c55e"}}/>
            <span style={{fontSize:9,color:"#9ca3af"}}>{hospitalName}</span>
          </div>
        </div>

        {/* Content */}
        <main style={{flex:1,overflowY:"auto",overflowX:"hidden",background:"#f0f2f5"}}>
          {children}
        </main>
      </div>

      <style>{`
        .sb-scroll{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,0.18) transparent;}
        .sb-scroll::-webkit-scrollbar{width:3px;}
        .sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:99px;}
        input[placeholder]{color:rgba(255,255,255,0.35)!important;}
        @media(max-width:899px){.desk-only{display:none!important;}}
      `}</style>
    </div>
  );
}
