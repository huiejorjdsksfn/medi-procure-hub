import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import {
  ShoppingCart, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Mail, Settings, Users, FileText,
  Calendar, FileCheck, Search, Database, TrendingUp,
  Activity, Archive, Receipt, Scale, Building2, PiggyBank,
  Layers, Globe, BookMarked, Cpu, Eye, Lock, Server
} from "lucide-react";

const QUICK: Record<string,{label:string;path:string;icon:any;color:string;desc:string}[]> = {
  admin:[
    {label:"Requisitions",     path:"/requisitions",           icon:ClipboardList, color:"#0078d4", desc:"Manage requisitions"},
    {label:"Purchase Orders",  path:"/purchase-orders",        icon:ShoppingCart,  color:"#C45911", desc:"Review & approve POs"},
    {label:"Receive Goods",    path:"/goods-received",         icon:Package,       color:"#107c10", desc:"Record GRNs"},
    {label:"Payment Vouchers", path:"/vouchers/payment",       icon:DollarSign,    color:"#5C2D91", desc:"Process payments"},
    {label:"New Tender",       path:"/tenders",                icon:Gavel,         color:"#1F6090", desc:"Launch tender"},
    {label:"Suppliers",        path:"/suppliers",              icon:Truck,         color:"#374151", desc:"Supplier directory"},
    {label:"Inventory",        path:"/items",                  icon:Package,       color:"#00695C", desc:"Stock levels"},
    {label:"Reports",          path:"/reports",                icon:BarChart3,     color:"#9333ea", desc:"Analytics"},
    {label:"Finance",          path:"/financials/dashboard",   icon:TrendingUp,    color:"#0369a1", desc:"Financial overview"},
    {label:"Quality Control",  path:"/quality/dashboard",      icon:Shield,        color:"#059669", desc:"QC inspections"},
    {label:"Email",            path:"/email",                  icon:Mail,          color:"#c0185a", desc:"Messaging"},
    {label:"Contracts",        path:"/contracts",              icon:FileCheck,     color:"#1a3a6b", desc:"Contract management"},
    {label:"Bid Evaluations",  path:"/bid-evaluations",        icon:Scale,         color:"#581c87", desc:"Evaluate bids"},
    {label:"Proc. Planning",   path:"/procurement-planning",   icon:Calendar,      color:"#065f46", desc:"Annual planning"},
    {label:"Documents",        path:"/documents",              icon:FileText,      color:"#92400e", desc:"Templates & docs"},
    {label:"Scanner",          path:"/scanner",                icon:Search,        color:"#0e7490", desc:"Barcode scanner"},
    {label:"Audit Log",        path:"/audit-log",              icon:Activity,      color:"#78350f", desc:"Activity trail"},
    {label:"User Management",  path:"/users",                  icon:Users,         color:"#4b4b9b", desc:"Manage users"},
    {label:"Database",         path:"/admin/database",         icon:Database,      color:"#1e3a5f", desc:"DB admin"},
    {label:"Budgets",          path:"/financials/budgets",     icon:PiggyBank,     color:"#b45309", desc:"Budget management"},
    {label:"Fixed Assets",     path:"/financials/fixed-assets",icon:Building2,     color:"#1e40af", desc:"Asset register"},
    {label:"Settings",         path:"/settings",               icon:Settings,      color:"#6b7280", desc:"System config"},
    {label:"Backup",           path:"/backup",                 icon:Archive,       color:"#374151", desc:"Backup & restore"},
    {label:"Admin Panel",      path:"/admin/panel",            icon:Settings,      color:"#0a2558", desc:"Administration"},
  ],
  procurement_manager:[
    {label:"Requisitions",     path:"/requisitions",           icon:ClipboardList, color:"#0078d4", desc:"Create requisition"},
    {label:"Purchase Orders",  path:"/purchase-orders",        icon:ShoppingCart,  color:"#C45911", desc:"Approve POs"},
    {label:"Receive Goods",    path:"/goods-received",         icon:Package,       color:"#107c10", desc:"Record GRNs"},
    {label:"Payment Vouchers", path:"/vouchers/payment",       icon:DollarSign,    color:"#5C2D91", desc:"Process payments"},
    {label:"New Tender",       path:"/tenders",                icon:Gavel,         color:"#1F6090", desc:"Launch tender"},
    {label:"Suppliers",        path:"/suppliers",              icon:Truck,         color:"#374151", desc:"Suppliers"},
    {label:"Contracts",        path:"/contracts",              icon:FileCheck,     color:"#1a3a6b", desc:"Contracts"},
    {label:"Reports",          path:"/reports",                icon:BarChart3,     color:"#9333ea", desc:"Reports"},
    {label:"Proc. Planning",   path:"/procurement-planning",   icon:Calendar,      color:"#065f46", desc:"Planning"},
    {label:"Bid Evaluations",  path:"/bid-evaluations",        icon:Scale,         color:"#581c87", desc:"Bids"},
    {label:"Finance",          path:"/financials/dashboard",   icon:TrendingUp,    color:"#0369a1", desc:"Financials"},
    {label:"Quality Control",  path:"/quality/dashboard",      icon:Shield,        color:"#059669", desc:"QC"},
    {label:"Email",            path:"/email",                  icon:Mail,          color:"#c0185a", desc:"Email"},
    {label:"Documents",        path:"/documents",              icon:FileText,      color:"#92400e", desc:"Documents"},
    {label:"Inventory",        path:"/items",                  icon:Package,       color:"#00695C", desc:"Stock"},
    {label:"Budgets",          path:"/financials/budgets",     icon:PiggyBank,     color:"#b45309", desc:"Budgets"},
  ],
  procurement_officer:[
    {label:"Requisitions",     path:"/requisitions",           icon:ClipboardList, color:"#0078d4", desc:"Requisitions"},
    {label:"Purchase Orders",  path:"/purchase-orders",        icon:ShoppingCart,  color:"#C45911", desc:"POs"},
    {label:"Receive Goods",    path:"/goods-received",         icon:Package,       color:"#107c10", desc:"GRNs"},
    {label:"Payment Vouchers", path:"/vouchers/payment",       icon:DollarSign,    color:"#5C2D91", desc:"Payments"},
    {label:"Tenders",          path:"/tenders",                icon:Gavel,         color:"#1F6090", desc:"Tenders"},
    {label:"Suppliers",        path:"/suppliers",              icon:Truck,         color:"#374151", desc:"Suppliers"},
    {label:"Documents",        path:"/documents",              icon:FileText,      color:"#92400e", desc:"Documents"},
    {label:"Email",            path:"/email",                  icon:Mail,          color:"#c0185a", desc:"Email"},
    {label:"Reports",          path:"/reports",                icon:BarChart3,     color:"#9333ea", desc:"Reports"},
    {label:"Inventory",        path:"/items",                  icon:Package,       color:"#00695C", desc:"Inventory"},
  ],
  inventory_manager:[
    {label:"Items / Stock",    path:"/items",                  icon:Package,       color:"#107c10", desc:"Inventory"},
    {label:"Scanner",          path:"/scanner",                icon:Search,        color:"#0e7490", desc:"Scanner"},
    {label:"Categories",       path:"/categories",             icon:Layers,        color:"#374151", desc:"Categories"},
    {label:"Departments",      path:"/departments",            icon:Building2,     color:"#1a3a6b", desc:"Departments"},
    {label:"Quality Control",  path:"/quality/dashboard",      icon:Shield,        color:"#059669", desc:"QC"},
    {label:"Requisitions",     path:"/requisitions",           icon:ClipboardList, color:"#0078d4", desc:"Requisitions"},
    {label:"Email",            path:"/email",                  icon:Mail,          color:"#c0185a", desc:"Email"},
    {label:"Documents",        path:"/documents",              icon:FileText,      color:"#92400e", desc:"Docs"},
  ],
  warehouse_officer:[
    {label:"Receive Goods",    path:"/goods-received",         icon:Package,       color:"#107c10", desc:"GRNs"},
    {label:"Items / Stock",    path:"/items",                  icon:Package,       color:"#00695C", desc:"Inventory"},
    {label:"Scanner",          path:"/scanner",                icon:Search,        color:"#0e7490", desc:"Scanner"},
    {label:"Quality Control",  path:"/quality/dashboard",      icon:Shield,        color:"#059669", desc:"QC"},
    {label:"Requisitions",     path:"/requisitions",           icon:ClipboardList, color:"#0078d4", desc:"Requisitions"},
    {label:"Email",            path:"/email",                  icon:Mail,          color:"#c0185a", desc:"Email"},
  ],
  requisitioner:[
    {label:"New Requisition",  path:"/requisitions",           icon:ClipboardList, color:"#0078d4", desc:"Create requisition"},
    {label:"Email",            path:"/email",                  icon:Mail,          color:"#c0185a", desc:"Email"},
    {label:"Documents",        path:"/documents",              icon:FileText,      color:"#92400e", desc:"Documents"},
  ],
};

const DATE_OPT: Intl.DateTimeFormatOptions = {weekday:"long",year:"numeric",month:"long",day:"numeric"};

export default function DashboardPage() {
  const { profile, roles } = useAuth();
  const navigate  = useNavigate();
  const primaryRole = roles[0] || "requisitioner";
  const actions   = QUICK[primaryRole] || QUICK.requisitioner;

  const [stats, setStats]   = useState({reqs:0,pos:0,grns:0,tenders:0});
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [search, setSearch] = useState("");
  const today = new Date().toLocaleDateString("en-KE", DATE_OPT);

  useEffect(()=>{
    Promise.all([
      (supabase as any).from("requisitions").select("id",{count:"exact",head:true}),
      (supabase as any).from("purchase_orders").select("id",{count:"exact",head:true}),
      (supabase as any).from("goods_received").select("id",{count:"exact",head:true}),
      (supabase as any).from("tenders").select("id",{count:"exact",head:true}),
    ]).then(([r,p,g,t])=>{
      setStats({reqs:r.count||0,pos:p.count||0,grns:g.count||0,tenders:t.count||0});
    });
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{
        data?.forEach((r:any)=>{
          if(r.key==="system_name")   setSysName(r.value||"EL5 MediProcure");
          if(r.key==="hospital_name") setHospitalName(r.value||"Embu Level 5 Hospital");
        });
      });
  },[]);

  const filtered = search.length > 1
    ? actions.filter(a=>a.label.toLowerCase().includes(search.toLowerCase())||a.desc.toLowerCase().includes(search.toLowerCase()))
    : actions;

  return (
    <div style={{display:"flex",flexDirection:"column",minHeight:"100%",background:"#f0f2f5"}}>

      {/* ── HERO BANNER ── */}
      <div style={{
        position:"relative", overflow:"hidden",
        backgroundImage:`linear-gradient(135deg,rgba(6,14,35,0.88) 0%,rgba(10,37,88,0.80) 50%,rgba(6,14,35,0.75) 100%),url(${procBg})`,
        backgroundSize:"cover", backgroundPosition:"center 30%",
        padding:"28px 24px 32px",
      }}>
        {/* Decorative lines */}
        <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,backgroundImage:"repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)",pointerEvents:"none"}}/>

        <div style={{position:"relative",zIndex:1,display:"flex",flexWrap:"wrap" as const,alignItems:"flex-start",justifyContent:"space-between",gap:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <img src={logoImg} alt="" style={{width:36,height:36,borderRadius:8,objectFit:"contain",background:"rgba(255,255,255,0.12)",padding:4}}/>
              <div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase" as const}}>{sysName}</div>
                <div style={{fontSize:9.5,color:"rgba(255,255,255,0.38)"}}>{hospitalName}</div>
              </div>
            </div>
            <h1 style={{fontSize:22,fontWeight:800,color:"#fff",margin:0,lineHeight:1.2}}>
              Welcome back, {profile?.full_name?.split(" ")[0] || "Staff"}
            </h1>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:4}}>{today}</div>
          </div>

          {/* Quick stat pills */}
          <div style={{display:"flex",flexWrap:"wrap" as const,gap:8}}>
            {[
              {label:"Requisitions", val:stats.reqs,   color:"#60a5fa", path:"/requisitions"},
              {label:"POs",          val:stats.pos,    color:"#fb923c", path:"/purchase-orders"},
              {label:"GRNs",         val:stats.grns,   color:"#4ade80", path:"/goods-received"},
              {label:"Tenders",      val:stats.tenders,color:"#f472b6", path:"/tenders"},
            ].map(s=>(
              <button key={s.path} onClick={()=>navigate(s.path)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.12)",border:`1px solid rgba(255,255,255,0.15)`,borderRadius:99,cursor:"pointer",backdropFilter:"blur(4px)",transition:"all 0.15s"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.2)"}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.12)"}>
                <span style={{fontSize:15,fontWeight:800,color:s.color}}>{s.val}</span>
                <span style={{fontSize:10,color:"rgba(255,255,255,0.65)",fontWeight:600}}>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div style={{position:"relative",marginTop:20,maxWidth:480}}>
          <Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"rgba(255,255,255,0.5)",pointerEvents:"none"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search quick actions…"
            style={{width:"100%",paddingLeft:36,paddingRight:12,height:40,background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:10,outline:"none",fontSize:13,color:"#fff",fontFamily:"inherit",backdropFilter:"blur(4px)"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.5)",lineHeight:0}}>✕</button>}
        </div>
      </div>

      {/* ── QUICK ACTIONS GRID ── */}
      <div style={{padding:"20px 20px 28px",flex:1}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <h2 style={{fontSize:14,fontWeight:700,color:"#111827",margin:0}}>Quick Actions</h2>
            <div style={{fontSize:11,color:"#9ca3af",marginTop:2}}>
              {filtered.length} {search?"result":"module"}{filtered.length!==1?"s":""}{search?` for "${search}"`:""}
            </div>
          </div>
        </div>

        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"40px 20px",color:"#9ca3af"}}>
            <Search style={{width:32,height:32,margin:"0 auto 10px",color:"#e5e7eb"}}/>
            <div style={{fontSize:13,fontWeight:600,color:"#6b7280"}}>No actions match "{search}"</div>
          </div>
        ):(
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",
            gap:10,
          }}>
            {filtered.map(action=>(
              <button key={action.path} onClick={()=>navigate(action.path)}
                style={{
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                  gap:8,padding:"16px 10px",
                  background:"#fff",border:"1px solid #e5e7eb",borderRadius:10,cursor:"pointer",
                  transition:"all 0.15s",textAlign:"center" as const,
                  boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
                }}
                onMouseEnter={e=>{
                  const el=e.currentTarget as HTMLElement;
                  el.style.transform="translateY(-2px)";
                  el.style.boxShadow=`0 6px 20px ${action.color}22`;
                  el.style.borderColor=`${action.color}50`;
                }}
                onMouseLeave={e=>{
                  const el=e.currentTarget as HTMLElement;
                  el.style.transform="none";
                  el.style.boxShadow="0 1px 4px rgba(0,0,0,0.05)";
                  el.style.borderColor="#e5e7eb";
                }}>
                <div style={{width:40,height:40,borderRadius:10,background:`${action.color}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <action.icon style={{width:18,height:18,color:action.color}}/>
                </div>
                <div>
                  <div style={{fontSize:11.5,fontWeight:700,color:"#111827",lineHeight:1.3}}>{action.label}</div>
                  <div style={{fontSize:9.5,color:"#9ca3af",marginTop:2,lineHeight:1.3}}>{action.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <div style={{padding:"10px 20px",background:"#fff",borderTop:"1px solid #e5e7eb",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap" as const,gap:6}}>
        <span style={{fontSize:10,color:"#9ca3af",fontWeight:600}}>{sysName} · {hospitalName}</span>
        <span style={{fontSize:9,color:"#d1d5db"}}>Embu County Government · Procurement Management System</span>
      </div>
    </div>
  );
}
