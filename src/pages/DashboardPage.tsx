import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingCart, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Mail, Settings, Users, FileText,
  Calendar, FileCheck, BookMarked, Search, Database,
  Home, TrendingUp, AlertCircle, BookOpen, Layers, PiggyBank,
  Activity, Globe, Archive, Receipt, Scale, Building2
} from "lucide-react";

/* Role-based quick actions */
const QUICK_ACTIONS: Record<string,{label:string;path:string;icon:any;color:string;desc:string}[]> = {
  admin: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList,  color:"#0078d4", desc:"Create purchase requisition"},
    {label:"Purchase Orders",    path:"/purchase-orders",      icon:ShoppingCart,   color:"#C45911", desc:"Manage & approve POs"},
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,        color:"#107c10", desc:"Record goods received"},
    {label:"Payment Voucher",    path:"/vouchers/payment",     icon:DollarSign,     color:"#5C2D91", desc:"Process payment vouchers"},
    {label:"New Tender",         path:"/tenders",              icon:Gavel,          color:"#1F6090", desc:"Launch a new tender"},
    {label:"Suppliers",          path:"/suppliers",            icon:Truck,          color:"#374151", desc:"Manage supplier list"},
    {label:"Inventory",          path:"/items",                icon:Package,        color:"#00695C", desc:"View stock levels"},
    {label:"Reports",            path:"/reports",              icon:BarChart3,      color:"#9333ea", desc:"Analytics & reports"},
    {label:"Finance Dashboard",  path:"/financials/dashboard", icon:TrendingUp,     color:"#0369a1", desc:"Financial overview"},
    {label:"Quality Control",    path:"/quality/dashboard",    icon:Shield,         color:"#059669", desc:"QC inspections"},
    {label:"Email",              path:"/email",                icon:Mail,           color:"#c0185a", desc:"System messaging"},
    {label:"Admin Panel",        path:"/admin/panel",          icon:Settings,       color:"#374151", desc:"System administration"},
    {label:"User Management",    path:"/users",                icon:Users,          color:"#4b4b9b", desc:"Manage user accounts"},
    {label:"Documents",          path:"/documents",            icon:FileText,       color:"#92400e", desc:"Templates & documents"},
    {label:"Database Admin",     path:"/admin/database",       icon:Database,       color:"#1e3a5f", desc:"DB administration"},
    {label:"Barcode Scanner",    path:"/scanner",              icon:Search,         color:"#0e7490", desc:"Scan & lookup items"},
    {label:"Audit Log",          path:"/audit-log",            icon:Activity,       color:"#78350f", desc:"System activity trail"},
    {label:"Contracts",          path:"/contracts",            icon:FileCheck,      color:"#1a3a6b", desc:"Contract management"},
    {label:"Procurement Plan",   path:"/procurement-planning", icon:Calendar,       color:"#065f46", desc:"Annual planning"},
    {label:"Bid Evaluations",    path:"/bid-evaluations",      icon:Scale,          color:"#581c87", desc:"Evaluate supplier bids"},
    {label:"Budgets",            path:"/financials/budgets",   icon:PiggyBank,      color:"#b45309", desc:"Budget management"},
    {label:"Fixed Assets",       path:"/financials/fixed-assets",icon:Building2,    color:"#1e40af", desc:"Asset register"},
    {label:"Backup",             path:"/backup",               icon:Archive,        color:"#374151", desc:"Data backup & restore"},
    {label:"Settings",           path:"/settings",             icon:Settings,       color:"#6b7280", desc:"System configuration"},
  ],
  procurement_manager: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList,  color:"#0078d4", desc:"Create purchase requisition"},
    {label:"Approve POs",        path:"/purchase-orders",      icon:ShoppingCart,   color:"#C45911", desc:"Review & approve POs"},
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,        color:"#107c10", desc:"Record goods received"},
    {label:"Payment Voucher",    path:"/vouchers/payment",     icon:DollarSign,     color:"#5C2D91", desc:"Process payments"},
    {label:"New Tender",         path:"/tenders",              icon:Gavel,          color:"#1F6090", desc:"Launch a new tender"},
    {label:"Suppliers",          path:"/suppliers",            icon:Truck,          color:"#374151", desc:"Manage suppliers"},
    {label:"Contracts",          path:"/contracts",            icon:FileCheck,      color:"#1a3a6b", desc:"Contract management"},
    {label:"Reports",            path:"/reports",              icon:BarChart3,      color:"#9333ea", desc:"Analytics & reports"},
    {label:"Procurement Plan",   path:"/procurement-planning", icon:Calendar,       color:"#065f46", desc:"Annual planning"},
    {label:"Bid Evaluations",    path:"/bid-evaluations",      icon:Scale,          color:"#581c87", desc:"Evaluate bids"},
    {label:"Finance Dashboard",  path:"/financials/dashboard", icon:TrendingUp,     color:"#0369a1", desc:"Financial overview"},
    {label:"Quality Control",    path:"/quality/dashboard",    icon:Shield,         color:"#059669", desc:"QC dashboard"},
    {label:"Email",              path:"/email",                icon:Mail,           color:"#c0185a", desc:"System messaging"},
    {label:"Documents",          path:"/documents",            icon:FileText,       color:"#92400e", desc:"Templates & documents"},
    {label:"Inventory",          path:"/items",                icon:Package,        color:"#00695C", desc:"Stock levels"},
    {label:"Budgets",            path:"/financials/budgets",   icon:PiggyBank,      color:"#b45309", desc:"Budget management"},
  ],
  procurement_officer: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList,  color:"#0078d4", desc:"Create requisition"},
    {label:"Purchase Orders",    path:"/purchase-orders",      icon:ShoppingCart,   color:"#C45911", desc:"View purchase orders"},
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,        color:"#107c10", desc:"Record goods received"},
    {label:"Payment Voucher",    path:"/vouchers/payment",     icon:DollarSign,     color:"#5C2D91", desc:"Process payments"},
    {label:"Tenders",            path:"/tenders",              icon:Gavel,          color:"#1F6090", desc:"View tenders"},
    {label:"Suppliers",          path:"/suppliers",            icon:Truck,          color:"#374151", desc:"Supplier directory"},
    {label:"Documents",          path:"/documents",            icon:FileText,       color:"#92400e", desc:"Templates"},
    {label:"Email",              path:"/email",                icon:Mail,           color:"#c0185a", desc:"System messaging"},
    {label:"Reports",            path:"/reports",              icon:BarChart3,      color:"#9333ea", desc:"Reports"},
    {label:"Inventory",          path:"/items",                icon:Package,        color:"#00695C", desc:"Stock levels"},
  ],
  inventory_manager: [
    {label:"Items",              path:"/items",                icon:Package,        color:"#107c10", desc:"Manage inventory"},
    {label:"Barcode Scanner",    path:"/scanner",              icon:Search,         color:"#0e7490", desc:"Scan & lookup items"},
    {label:"Categories",         path:"/categories",           icon:Layers,         color:"#374151", desc:"Item categories"},
    {label:"Departments",        path:"/departments",          icon:Building2,      color:"#1a3a6b", desc:"Departments"},
    {label:"Quality Control",    path:"/quality/dashboard",    icon:Shield,         color:"#059669", desc:"QC dashboard"},
    {label:"Requisitions",       path:"/requisitions",         icon:ClipboardList,  color:"#0078d4", desc:"View requisitions"},
    {label:"Email",              path:"/email",                icon:Mail,           color:"#c0185a", desc:"System messaging"},
    {label:"Documents",          path:"/documents",            icon:FileText,       color:"#92400e", desc:"Documents"},
  ],
  warehouse_officer: [
    {label:"Receive Goods",      path:"/goods-received",       icon:Package,        color:"#107c10", desc:"Record goods received"},
    {label:"Items",              path:"/items",                icon:Layers,         color:"#374151", desc:"View stock"},
    {label:"Barcode Scanner",    path:"/scanner",              icon:Search,         color:"#0e7490", desc:"Scan items"},
    {label:"Quality Control",    path:"/quality/dashboard",    icon:Shield,         color:"#059669", desc:"QC dashboard"},
    {label:"Inspections",        path:"/quality/inspections",  icon:ClipboardList,  color:"#0078d4", desc:"Inspections"},
    {label:"Email",              path:"/email",                icon:Mail,           color:"#c0185a", desc:"Messaging"},
  ],
  requisitioner: [
    {label:"New Requisition",    path:"/requisitions",         icon:ClipboardList,  color:"#0078d4", desc:"Submit a requisition"},
    {label:"My Requisitions",    path:"/requisitions",         icon:FileText,       color:"#C45911", desc:"Track your requests"},
    {label:"Email",              path:"/email",                icon:Mail,           color:"#c0185a", desc:"System messaging"},
    {label:"Documents",          path:"/documents",            icon:FileText,       color:"#92400e", desc:"Download templates"},
  ],
};

/* Search across all pages */
const ALL_SEARCH_PAGES = [
  {label:"Requisitions",      path:"/requisitions",         icon:ClipboardList},
  {label:"Purchase Orders",   path:"/purchase-orders",      icon:ShoppingCart},
  {label:"Goods Received",    path:"/goods-received",       icon:Package},
  {label:"Suppliers",         path:"/suppliers",            icon:Truck},
  {label:"Tenders",           path:"/tenders",              icon:Gavel},
  {label:"Contracts",         path:"/contracts",            icon:FileCheck},
  {label:"Items",             path:"/items",                icon:Package},
  {label:"Reports",           path:"/reports",              icon:BarChart3},
  {label:"Documents",         path:"/documents",            icon:FileText},
  {label:"Email",             path:"/email",                icon:Mail},
  {label:"Users",             path:"/users",                icon:Users},
  {label:"Admin Panel",       path:"/admin/panel",          icon:Settings},
  {label:"Database Admin",    path:"/admin/database",       icon:Database},
  {label:"Settings",          path:"/settings",             icon:Settings},
  {label:"Scanner",           path:"/scanner",              icon:Search},
  {label:"Audit Log",         path:"/audit-log",            icon:Activity},
  {label:"Finance Dashboard", path:"/financials/dashboard", icon:TrendingUp},
  {label:"Budgets",           path:"/financials/budgets",   icon:PiggyBank},
  {label:"Fixed Assets",      path:"/financials/fixed-assets",icon:Building2},
  {label:"Chart of Accounts", path:"/financials/chart-of-accounts",icon:BookOpen},
  {label:"Quality Dashboard", path:"/quality/dashboard",   icon:Shield},
  {label:"Inspections",       path:"/quality/inspections",  icon:ClipboardList},
  {label:"Backup",            path:"/backup",               icon:Archive},
  {label:"Webmaster",         path:"/webmaster",            icon:Globe},
  {label:"Payment Vouchers",  path:"/vouchers/payment",     icon:DollarSign},
  {label:"Receipt Vouchers",  path:"/vouchers/receipt",     icon:Receipt},
  {label:"Journal Vouchers",  path:"/vouchers/journal",     icon:BookMarked},
  {label:"Procurement Plan",  path:"/procurement-planning", icon:Calendar},
  {label:"Bid Evaluations",   path:"/bid-evaluations",      icon:Scale},
  {label:"Categories",        path:"/categories",           icon:Layers},
  {label:"Departments",       path:"/departments",          icon:Building2},
  {label:"Profile",           path:"/profile",              icon:Users},
];

export default function DashboardPage() {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();

  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl,      setLogoUrl]      = useState<string|null>(null);
  const [search,       setSearch]       = useState("");
  const [showSearch,   setShowSearch]   = useState(false);
  const [stats,        setStats]        = useState({reqs:0,pos:0,suppliers:0,pending:0});

  const primaryRole = (
    roles.includes("admin")               ? "admin" :
    roles.includes("procurement_manager") ? "procurement_manager" :
    roles.includes("procurement_officer") ? "procurement_officer" :
    roles.includes("inventory_manager")   ? "inventory_manager" :
    roles.includes("warehouse_officer")   ? "warehouse_officer" : "requisitioner"
  );

  const actions = QUICK_ACTIONS[primaryRole] || QUICK_ACTIONS.requisitioner;
  const searchResults = search.length>=2
    ? ALL_SEARCH_PAGES.filter(p=>p.label.toLowerCase().includes(search.toLowerCase())).slice(0,8)
    : [];

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
    // Load quick stats
    Promise.all([
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
      (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
      (supabase as any).from("suppliers").select("id",{count:"exact",head:true}),
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}).eq("status","pending"),
    ]).then(([r,p,s,pend])=>{
      setStats({reqs:r.count||0,pos:p.count||0,suppliers:s.count||0,pending:pend.count||0});
    });
  },[]);

  const greetingHour = new Date().getHours();
  const greeting = greetingHour<12?"Good Morning":greetingHour<17?"Good Afternoon":"Good Evening";

  return (
    <div style={{minHeight:"calc(100vh - 82px)",fontFamily:"'Inter','Segoe UI',sans-serif"}}>

      {/* ══ HERO with procurement wallpaper ══ */}
      <div style={{
        position:"relative",
        backgroundImage:"url('/src/assets/procurement-bg.jpg')",
        backgroundSize:"cover",backgroundPosition:"center",backgroundAttachment:"fixed",
        padding:"28px 20px 32px",
      }}>
        {/* Overlay */}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(10,37,88,0.92) 0%,rgba(26,58,107,0.85) 50%,rgba(29,74,135,0.80) 100%)"}}/>

        <div style={{position:"relative",zIndex:1,maxWidth:1400,margin:"0 auto"}}>
          {/* Header row */}
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22,flexWrap:"wrap" as const}}>
            {logoUrl
              ?<img src={logoUrl} alt="" style={{height:52,width:52,objectFit:"contain",borderRadius:10,background:"rgba(255,255,255,0.12)",padding:4,border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}}/>
              :<img src="/src/assets/embu-county-logo.jpg" alt="" style={{height:52,width:52,objectFit:"contain",borderRadius:10,background:"rgba(255,255,255,0.12)",padding:4,border:"1px solid rgba(255,255,255,0.2)",flexShrink:0}} onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>
            }
            <div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:600,textTransform:"uppercase" as const,letterSpacing:"0.08em"}}>{greeting}</div>
              <h1 style={{fontSize:"clamp(18px,3vw,26px)",fontWeight:900,color:"#fff",margin:"2px 0",lineHeight:1.2}}>
                {profile?.full_name?.split(" ")[0]||"Welcome"}
              </h1>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.5)"}}>{hospitalName} · {sysName}</div>
            </div>

            {/* Mini stats pills */}
            <div style={{marginLeft:"auto",display:"flex",gap:8,flexWrap:"wrap" as const}}>
              {[
                {label:"Requisitions",val:stats.reqs,color:"#60a5fa"},
                {label:"Purchase Orders",val:stats.pos,color:"#86efac"},
                {label:"Pending",val:stats.pending,color:"#fcd34d"},
                {label:"Suppliers",val:stats.suppliers,color:"#c4b5fd"},
              ].map(s=>(
                <div key={s.label} style={{
                  background:"rgba(255,255,255,0.1)",backdropFilter:"blur(8px)",
                  border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,
                  padding:"6px 14px",textAlign:"center" as const,
                }}>
                  <div style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.val}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.5)",marginTop:2,whiteSpace:"nowrap" as const}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SEARCH BAR ── */}
          <div style={{maxWidth:560,position:"relative"}}>
            <div style={{
              display:"flex",alignItems:"center",gap:10,
              background:"rgba(255,255,255,0.12)",backdropFilter:"blur(10px)",
              border:"1px solid rgba(255,255,255,0.22)",borderRadius:10,
              padding:"10px 16px",transition:"all 0.2s",
            }}>
              <Search style={{width:15,height:15,color:"rgba(255,255,255,0.55)",flexShrink:0}}/>
              <input
                value={search}
                onChange={e=>{setSearch(e.target.value);setShowSearch(true);}}
                onFocus={()=>setShowSearch(true)}
                onBlur={()=>setTimeout(()=>setShowSearch(false),180)}
                placeholder="Search pages, modules, actions…"
                style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:13,fontFamily:"'Inter',sans-serif"}}
              />
              {search&&<button onClick={()=>setSearch("")} style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.4)",lineHeight:0,padding:0}}>✕</button>}
            </div>

            {/* Search results dropdown */}
            {showSearch&&searchResults.length>0&&(
              <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#fff",borderRadius:10,boxShadow:"0 12px 40px rgba(0,0,0,0.25)",border:"1px solid #e5e7eb",overflow:"hidden",zIndex:100}}>
                {searchResults.map(r=>(
                  <button key={r.path} onClick={()=>{navigate(r.path);setSearch("");setShowSearch(false);}}
                    style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,textAlign:"left" as const,color:"#374151"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f8fafc"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <r.icon style={{width:14,height:14,color:"#9ca3af",flexShrink:0}}/>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ QUICK ACTIONS ══ */}
      <div style={{padding:"20px",maxWidth:1400,margin:"0 auto"}}>
        <div style={{marginBottom:14,display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:3,height:18,borderRadius:2,background:"#1a3a6b"}}/>
          <span style={{fontSize:13,fontWeight:800,color:"#111827"}}>Quick Actions</span>
          <span style={{fontSize:10,color:"#9ca3af",fontWeight:600,background:"#f3f4f6",padding:"2px 8px",borderRadius:4}}>{actions.length} available</span>
        </div>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
          gap:10,
        }}>
          {actions.map(action=>(
            <button key={action.path+action.label}
              onClick={()=>navigate(action.path)}
              style={{
                position:"relative",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:8,padding:"16px 10px",background:"#fff",border:"1px solid #e5e7eb",
                borderRadius:12,cursor:"pointer",transition:"all 0.18s",boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                "--qa-color":action.color,textAlign:"center" as const,
              } as any}>
              {/* Top accent line */}
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:action.color,borderRadius:"12px 12px 0 0"}}/>
              {/* Icon */}
              <div style={{width:38,height:38,borderRadius:10,background:`${action.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <action.icon style={{width:18,height:18,color:action.color}}/>
              </div>
              {/* Label */}
              <div style={{fontSize:11,fontWeight:700,color:"#374151",lineHeight:1.3}}>{action.label}</div>
              {/* Hover overlay */}
              <div style={{position:"absolute",inset:0,borderRadius:12,border:`2px solid ${action.color}`,opacity:0,transition:"opacity 0.18s"}} className="qa-hover-border"/>
            </button>
          ))}
        </div>
      </div>

      {/* Hover effect via global style */}
      <style>{`
        button:hover .qa-hover-border { opacity: 0.4 !important; }
        button:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important; }
      `}</style>
    </div>
  );
}
