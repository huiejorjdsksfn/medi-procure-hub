/**
 * ProcurBosse v21.0 -- Dashboard
 * D365 colored module tiles + ERP Wheel + Live KPIs + IP display
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * BUILD-SAFE: zero non-ASCII chars
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import ImageUploader from "@/components/ImageUploader";
import { logAction } from "@/hooks/useSessionTracker";
import procurBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import embuLogo from "@/assets/embu-county-logo.jpg";
import {
  Bell, User, LogOut, Mail, Shield, RefreshCw,
  ShoppingCart, Package, DollarSign, FileText, Clock,
  AlertTriangle, Users, BarChart3, ChevronRight, X,
  Phone, MessageSquare, Printer, Search, CheckCircle,
  Globe, Plus, Save, Wifi
} from "lucide-react";

const db = supabase as any;

/* ---- SVG arc helpers ---- */
const P = (cx:number,cy:number,r:number,deg:number) => {
  const a=(deg-90)*Math.PI/180;
  return { x:cx+r*Math.cos(a), y:cy+r*Math.sin(a) };
};
const arc = (cx:number,cy:number,OR:number,IR:number,s:number,e:number,gap=4) => {
  const sa=s+gap/2,ea=e-gap/2;
  const o1=P(cx,cy,OR,sa),o2=P(cx,cy,OR,ea),i1=P(cx,cy,IR,ea),i2=P(cx,cy,IR,sa);
  const lg=ea-sa>180?1:0;
  return `M${o1.x},${o1.y} A${OR},${OR} 0 ${lg},1 ${o2.x},${o2.y} L${i1.x},${i1.y} A${IR},${IR} 0 ${lg},0 ${i2.x},${i2.y} Z`;
};
const CX=300,CY=300,OR=248,IR=98;

/* ---- Role->segment mapping ---- */
const ROLE_SEGS:Record<string,string[]> = {
  admin:["procurement","finance","inventory","quality","reports","admin","comms"],
  superadmin:["procurement","finance","inventory","quality","reports","admin","comms"],
  webmaster:["procurement","finance","inventory","quality","reports","admin","comms"],
  database_admin:["admin","reports"],
  procurement_manager:["procurement","finance","inventory","quality","reports","comms"],
  procurement_officer:["procurement","inventory","reports","comms"],
  accountant:["finance","procurement","reports"],
  inventory_manager:["inventory","procurement","quality","reports"],
  warehouse_officer:["inventory","comms"],
  requisitioner:["procurement","reports"],
};

/* ---- D365 module tiles ---- */
const D365_MODS = [
  {id:"procurement",label:"PROCUREMENT",sub:"Orders & Sourcing", color:"#0078d4",icon:ShoppingCart,path:"/requisitions"},
  {id:"finance",    label:"FINANCE",    sub:"Budgets & Payments",color:"#7719aa",icon:DollarSign,  path:"/financials/dashboard"},
  {id:"inventory",  label:"INVENTORY",  sub:"Stock & Items",     color:"#038387",icon:Package,     path:"/items"},
  {id:"quality",    label:"QUALITY",    sub:"QC & Compliance",   color:"#d97706",icon:CheckCircle, path:"/quality/dashboard"},
  {id:"reports",    label:"REPORTS",    sub:"Analytics & BI",    color:"#6b21a8",icon:BarChart3,   path:"/reports"},
  {id:"comms",      label:"COMMS",      sub:"SMS + Calls + Email",color:"#0369a1",icon:MessageSquare,path:"/sms"},
  {id:"users",      label:"USERS",      sub:"User Management",   color:"#059669",icon:Users,       path:"/users"},
  {id:"admin",      label:"ADMIN",      sub:"System Control",    color:"#b91c1c",icon:Shield,      path:"/admin/panel"},
];

/* ---- ERP wheel segments ---- */
type Seg={id:string;label:string;sub:string;g1:string;g2:string;g3:string;glow:string;start:number;end:number;links:{label:string;path:string}[]};
const ALL_SEGS:Seg[]=[
  {id:"procurement",label:"PROCUREMENT",sub:"Orders & Sourcing",g1:"#1a5fb5",g2:"#0d3d87",g3:"#5b9fd4",glow:"#3b82f680",start:0,end:60,
   links:[{label:"Requisitions",path:"/requisitions"},{label:"Purchase Orders",path:"/purchase-orders"},{label:"Goods Received",path:"/goods-received"},{label:"Suppliers",path:"/suppliers"},{label:"Tenders",path:"/tenders"},{label:"Contracts",path:"/contracts"},{label:"Bid Evals",path:"/bid-evaluations"},{label:"Planning",path:"/procurement-planning"}]},
  {id:"finance",label:"FINANCE",sub:"Budgets & Payments",g1:"#6d28d9",g2:"#4c1d95",g3:"#9b5ef5",glow:"#7c3aed80",start:60,end:120,
   links:[{label:"Finance Dashboard",path:"/financials/dashboard"},{label:"Budgets",path:"/financials/budgets"},{label:"Payment Vouchers",path:"/vouchers/payment"},{label:"Receipt Vouchers",path:"/vouchers/receipt"},{label:"Journal Vouchers",path:"/vouchers/journal"},{label:"Chart of Accounts",path:"/financials/chart-of-accounts"},{label:"Fixed Assets",path:"/financials/fixed-assets"},{label:"Accountant",path:"/accountant-workspace"}]},
  {id:"inventory",label:"INVENTORY",sub:"Stock & Items",g1:"#047857",g2:"#065f46",g3:"#10b981",glow:"#05986180",start:120,end:180,
   links:[{label:"Items / Stock",path:"/items"},{label:"Categories",path:"/categories"},{label:"Departments",path:"/departments"},{label:"Scanner",path:"/scanner"},{label:"GRN",path:"/goods-received"},{label:"Reception",path:"/reception"}]},
  {id:"quality",label:"QUALITY",sub:"QC & Compliance",g1:"#b45309",g2:"#78350f",g3:"#f59e0b",glow:"#d9770680",start:180,end:240,
   links:[{label:"QC Dashboard",path:"/quality/dashboard"},{label:"Inspections",path:"/quality/inspections"},{label:"Non-Conformance",path:"/quality/non-conformance"}]},
  {id:"reports",label:"REPORTS",sub:"Analytics & BI",g1:"#5b21b6",g2:"#3b0764",g3:"#8b5cf6",glow:"#8764b880",start:240,end:300,
   links:[{label:"Reports & BI",path:"/reports"},{label:"Print Engine",path:"/print-engine"},{label:"Audit Log",path:"/audit-log"},{label:"Documents",path:"/documents"},{label:"Notifications",path:"/notifications"}]},
  {id:"comms",label:"COMMS",sub:"SMS - Calls - Email",g1:"#0369a1",g2:"#0c4a6e",g3:"#0ea5e9",glow:"#0891b280",start:300,end:330,
   links:[{label:"SMS",path:"/sms"},{label:"Telephony",path:"/telephony"},{label:"Email",path:"/email"},{label:"Inbox",path:"/inbox"}]},
  {id:"admin",label:"ADMIN",sub:"System Control",g1:"#b91c1c",g2:"#7f1d1d",g3:"#ef4444",glow:"#ef444480",start:330,end:360,
   links:[{label:"Admin Panel",path:"/admin/panel"},{label:"Users",path:"/users"},{label:"Settings",path:"/settings"},{label:"Webmaster",path:"/webmaster"},{label:"IP Access",path:"/admin/ip-access"},{label:"Print Engine",path:"/print-engine"},{label:"DB Monitor",path:"/admin/db-test"},{label:"Backup",path:"/backup"}]},
];

/* ---- KPI tile component ---- */
function KpiTile({label,value,color,icon:Icon,onClick}:{label:string;value:number;color:string;icon:any;onClick?:()=>void}) {
  return(
    <div onClick={onClick} style={{background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"10px 12px",cursor:onClick?"pointer":"default",transition:"all .15s",borderLeft:`3px solid ${color}`}}
      onMouseEnter={e=>{if(onClick)(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)";}}
      onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.05)";}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
        <Icon size={13} color={color}/>
        <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.4)",letterSpacing:".06em",textTransform:"uppercase"as const}}>{label}</span>
      </div>
      <div style={{fontSize:24,fontWeight:800,color:"#fff",lineHeight:1}}>{value.toLocaleString()}</div>
    </div>
  );
}

/* ---- D365 module tile ---- */
function D365Tile({mod,onClick}:{mod:typeof D365_MODS[0];onClick:()=>void}) {
  const [hov,setHov]=useState(false);
  return(
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?"rgba(255,255,255,.15)":"rgba(255,255,255,.07)",border:`1px solid ${hov?mod.color+"88":"rgba(255,255,255,.12)"}`,borderRadius:4,padding:"12px 10px",cursor:"pointer",transition:"all .18s",display:"flex",flexDirection:"column"as const,alignItems:"center",gap:7,minWidth:88,boxShadow:hov?`0 4px 20px ${mod.color}44`:"none",borderBottom:`3px solid ${hov?mod.color:mod.color+"66"}`,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{width:38,height:38,borderRadius:7,background:hov?mod.color:`linear-gradient(135deg,${mod.color}bb,${mod.color}55)`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all .18s",boxShadow:hov?`0 4px 12px ${mod.color}66`:"none"}}>
        <mod.icon size={18} color="#fff"/>
      </div>
      <div style={{textAlign:"center"as const}}>
        <div style={{fontSize:9,fontWeight:800,color:"rgba(255,255,255,.9)",letterSpacing:".06em"}}>{mod.label}</div>
        <div style={{fontSize:7.5,color:"rgba(255,255,255,.35)",marginTop:2}}>{mod.sub}</div>
      </div>
    </button>
  );
}

/* ---- print dashboard ---- */
function printDashboard(profile:any,kpi:any,hospital:string) {
  const w=window.open("","_blank","width=900,height=700");
  if(!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>Dashboard Report</title><style>
    body{font-family:Segoe UI,Arial;margin:40px;color:#222;}
    h1{color:#0078d4;font-size:20px;}
    .hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0078d4;padding-bottom:12px;margin-bottom:20px;}
    .kpi{display:inline-block;padding:10px 16px;margin:4px;background:#f0f4f8;border-radius:6px;min-width:120px;border-left:3px solid #0078d4;}
    @media print{button{display:none}}
  </style></head><body>
  <div class="hdr"><div><h1>${hospital}</h1><div style="font-size:12px;color:#666">EL5 MediProcure v21.0</div></div>
  <div style="text-align:right;font-size:11px;color:#888">${new Date().toLocaleString("en-KE")}<br/>User: ${profile?.full_name||"System"}</div></div>
  <h2 style="font-size:14px;margin-bottom:12px">Live KPI Snapshot</h2>
  <div>
  <div class="kpi"><b>Pending Requisitions</b><br/><span style="font-size:22px;font-weight:800;color:#0078d4">${kpi.reqs}</span></div>
  <div class="kpi"><b>Open Purchase Orders</b><br/><span style="font-size:22px;font-weight:800;color:#0369a1">${kpi.pos}</span></div>
  <div class="kpi"><b>Vouchers Due</b><br/><span style="font-size:22px;font-weight:800;color:#7719aa">${kpi.pvs}</span></div>
  <div class="kpi"><b>Low Stock Items</b><br/><span style="font-size:22px;font-weight:800;color:#b91c1c">${kpi.lowStock}</span></div>
  <div class="kpi"><b>Active Suppliers</b><br/><span style="font-size:22px;font-weight:800;color:#047857">${kpi.suppliers}</span></div>
  <div class="kpi"><b>Pending GRN</b><br/><span style="font-size:22px;font-weight:800;color:#0891b2">${kpi.pendingGRN}</span></div>
  <div class="kpi"><b>Active Contracts</b><br/><span style="font-size:22px;font-weight:800;color:#d97706">${kpi.contracts}</span></div>
  <div class="kpi"><b>Staff Online</b><br/><span style="font-size:22px;font-weight:800;color:#059669">${kpi.sessions}</span></div>
  </div>
  <br/><button onclick="window.print()">Print</button></body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

/* ---- Main component ---- */
export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  const { get: getSetting } = useSystemSettings();
  const hospital = getSetting("hospital_name","Embu Level 5 Hospital");

  const [active,setActive]     = useState<string|null>(null);
  const [hov,setHov]           = useState<string|null>(null);
  const [kpi,setKpi]           = useState({reqs:0,pos:0,pvs:0,lowStock:0,suppliers:0,pendingGRN:0,contracts:0,unread:0,sessions:0});
  const [showUpload,setShowUpload] = useState(false);
  const [showRoleModal,setShowRoleModal] = useState(false);
  const [showD365,setShowD365] = useState(true);
  const [publicIP,setPublicIP] = useState("");
  const [searchQ,setSearchQ]   = useState("");
  const [searchRes,setSearchRes] = useState<{label:string;path:string;cat:string}[]>([]);
  const [searchOpen,setSearchOpen] = useState(false);

  const isAdmin = ["admin","superadmin","webmaster"].includes(profile?.role||"");
  const role    = profile?.role||"requisitioner";
  const allowed = ROLE_SEGS[role]||["procurement","reports"];
  const remapped= ALL_SEGS.filter(s=>allowed.includes(s.id));
  const activeSeg = remapped.find(s=>s.id===active)||null;

  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<17?"Good afternoon":"Good evening";
  const goTo = useCallback((p:string)=>{logAction("navigate",p);nav(p);},[nav]);

  /* ---- load KPI ---- */
  const loadKPI = useCallback(async()=>{
    try{
      const [r1,r2,r3,r5,r6,r7,r8,r9]=await Promise.all([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved","sent"]),
        db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("goods_received").select("id",{count:"exact",head:true}).in("status",["pending","partially_received"]),
        db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("user_sessions").select("id",{count:"exact",head:true}).eq("is_active",true),
      ]);
      const r4=await db.from("items").select("current_quantity,minimum_quantity");
      const lowStock=(r4.data||[]).filter((i:any)=>(i.current_quantity||0)<=(i.minimum_quantity||0)).length;
      setKpi({reqs:r1.count||0,pos:r2.count||0,pvs:r3.count||0,lowStock,suppliers:r5.count||0,pendingGRN:r6.count||0,contracts:r7.count||0,unread:r8.count||0,sessions:r9.count||0});
    }catch{/*silent*/}
  },[]);

  useEffect(()=>{
    loadKPI();
    const t=setInterval(loadKPI,30000);
    const ch=db.channel("dash_rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"user_sessions"},loadKPI)
      .subscribe();
    fetch("https://api.ipify.org?format=json").then(r=>r.json()).then(d=>setPublicIP(d.ip||"")).catch(()=>{});
    return()=>{clearInterval(t);db.removeChannel(ch);};
  },[loadKPI]);

  /* ---- search ---- */
  const ALL_PAGES=[
    {label:"Requisitions",path:"/requisitions",cat:"Procurement"},{label:"Purchase Orders",path:"/purchase-orders",cat:"Procurement"},
    {label:"Suppliers",path:"/suppliers",cat:"Procurement"},{label:"Goods Received",path:"/goods-received",cat:"Procurement"},
    {label:"Tenders",path:"/tenders",cat:"Procurement"},{label:"Contracts",path:"/contracts",cat:"Procurement"},
    {label:"Items / Stock",path:"/items",cat:"Inventory"},{label:"Categories",path:"/categories",cat:"Inventory"},
    {label:"Finance Dashboard",path:"/financials/dashboard",cat:"Finance"},{label:"Budgets",path:"/financials/budgets",cat:"Finance"},
    {label:"Payment Vouchers",path:"/vouchers/payment",cat:"Finance"},{label:"Reports",path:"/reports",cat:"Reports"},
    {label:"Print Engine",path:"/print-engine",cat:"Reports"},{label:"Audit Log",path:"/audit-log",cat:"Reports"},
    {label:"Users",path:"/users",cat:"Admin"},{label:"Admin Panel",path:"/admin/panel",cat:"Admin"},
    {label:"Settings",path:"/settings",cat:"Admin"},{label:"Webmaster",path:"/webmaster",cat:"Admin"},
    {label:"IP Access",path:"/admin/ip-access",cat:"Admin"},{label:"SMS",path:"/sms",cat:"Comms"},
    {label:"Telephony",path:"/telephony",cat:"Comms"},{label:"Email",path:"/email",cat:"Comms"},
    {label:"QC Dashboard",path:"/quality/dashboard",cat:"Quality"},
  ];
  useEffect(()=>{
    if(!searchQ.trim()){setSearchRes([]);return;}
    const q=searchQ.toLowerCase();
    setSearchRes(ALL_PAGES.filter(p=>p.label.toLowerCase().includes(q)||p.cat.toLowerCase().includes(q)).slice(0,8));
  },[searchQ]);

  return(
    <div style={{position:"fixed",inset:0,display:"flex",flexDirection:"column",overflow:"hidden",background:"#07111f",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .seg-g{cursor:pointer}
        .dbtn:hover{background:rgba(255,255,255,.12)!important;color:rgba(255,255,255,.9)!important}
        @media print{.no-print{display:none!important}}
      `}</style>
      {/* BG */}
      <div style={{position:"absolute",inset:0,backgroundImage:`url(${procurBg})`,backgroundSize:"cover",backgroundPosition:"center",opacity:.12,zIndex:0}}/>
      <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(4,13,30,.98) 0%,rgba(10,22,50,.95) 50%,rgba(4,13,30,.98) 100%)",zIndex:0}}/>

      {/* TOPBAR */}
      <div className="no-print" style={{position:"relative",zIndex:10,background:"linear-gradient(90deg,#001f54,#0078d4 60%,#005a9e)",borderBottom:"1px solid rgba(255,255,255,.1)",display:"flex",alignItems:"center",padding:"0 16px",height:48,gap:10,flexShrink:0}}>
        <img src={embuLogo} alt="" style={{width:28,height:28,borderRadius:"50%",objectFit:"contain",flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:800,color:"#fff"}}>EL5 MediProcure - ProcurBosse</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,.45)",marginTop:-1}}>{hospital} | v21.0</div>
        </div>
        {/* Search */}
        <div style={{position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.15)",borderRadius:6,padding:"5px 11px",width:210}}>
            <Search size={13} color="rgba(255,255,255,.5)"/>
            <input value={searchQ} onChange={e=>{setSearchQ(e.target.value);setSearchOpen(true);}} onFocus={()=>setSearchOpen(true)} onBlur={()=>setTimeout(()=>setSearchOpen(false),200)}
              placeholder="Search modules..." style={{background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:12,width:"100%"}}/>
            {searchQ&&<button onClick={()=>{setSearchQ("");setSearchRes([]);}} style={{background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",padding:0,display:"flex"}}><X size={11}/></button>}
          </div>
          {searchOpen&&searchRes.length>0&&(
            <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,right:0,background:"#0d1f3c",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,overflow:"hidden",zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
              {searchRes.map(r=>(
                <button key={r.path} onClick={()=>{goTo(r.path);setSearchQ("");setSearchOpen(false);}}
                  style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"8px 12px",background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",fontSize:12,textAlign:"left"as const,fontFamily:"inherit"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.08)"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                  <span>{r.label}</span>
                  <span style={{fontSize:9,color:"rgba(255,255,255,.3)",background:"rgba(255,255,255,.05)",padding:"1px 6px",borderRadius:4}}>{r.cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* IP badge */}
        {publicIP&&(
          <button onClick={()=>goTo("/admin/ip-access")} style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"rgba(255,255,255,.4)",background:"rgba(255,255,255,.05)",padding:"4px 9px",borderRadius:5,border:"none",cursor:"pointer",fontFamily:"monospace"}}>
            <Wifi size={10}/>{publicIP}
          </button>
        )}
        {/* Sessions */}
        {kpi.sessions>0&&(
          <div style={{display:"flex",alignItems:"center",gap:5,fontSize:9,color:"#22c55e",background:"rgba(34,197,94,.08)",padding:"4px 8px",borderRadius:5}}>
            <span style={{width:5,height:5,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse 2s ease-in-out infinite"}}/>
            {kpi.sessions} online
          </div>
        )}
        <button onClick={()=>goTo("/notifications")} className="dbtn" style={{position:"relative",padding:"5px 7px",borderRadius:7,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.5)",display:"flex",alignItems:"center",transition:"all .12s"}}>
          <Bell size={15}/>
          {kpi.unread>0&&<span style={{position:"absolute",top:2,right:2,width:7,height:7,borderRadius:"50%",background:"#ef4444",border:"1.5px solid #001f54"}}/>}
        </button>
        <button onClick={()=>goTo("/email")} className="dbtn" style={{padding:"5px 7px",borderRadius:7,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.5)",display:"flex",alignItems:"center"}}><Mail size={15}/></button>
        <button onClick={()=>setShowUpload(true)} style={{padding:2,borderRadius:"50%",background:"transparent",border:"1.5px solid rgba(255,255,255,.15)",cursor:"pointer",display:"flex"}}>
          {profile?.avatar_url?<img src={profile.avatar_url} alt="" style={{width:30,height:30,borderRadius:"50%",objectFit:"cover"}}/>
          :<div style={{width:30,height:30,borderRadius:"50%",background:"#1b5fcc",display:"flex",alignItems:"center",justifyContent:"center"}}><User size={14} color="#fff"/></div>}
        </button>
        <button onClick={()=>{signOut();nav("/login");}} className="dbtn" style={{padding:"5px 7px",borderRadius:7,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.4)",display:"flex",alignItems:"center"}}><LogOut size={14}/></button>
      </div>

      {/* D365 MODULE TILES */}
      {showD365&&(
        <div className="no-print" style={{position:"relative",zIndex:9,background:"rgba(0,0,0,.5)",borderBottom:"1px solid rgba(255,255,255,.07)",padding:"8px 16px",display:"flex",gap:6,alignItems:"center",flexShrink:0,overflowX:"auto"}}>
          <div style={{fontSize:8,fontWeight:700,color:"rgba(255,255,255,.2)",letterSpacing:".1em",whiteSpace:"nowrap"as const,marginRight:4}}>MODULES</div>
          {D365_MODS.filter(m=>allowed.includes(m.id)||(["users","admin"].includes(m.id)&&isAdmin)).map(m=>(
            <D365Tile key={m.id} mod={m} onClick={()=>goTo(m.path)}/>
          ))}
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
            <button onClick={()=>goTo("/print-engine")} style={{display:"flex",flexDirection:"column"as const,alignItems:"center",gap:3,padding:"9px 11px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:4,cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:8,fontWeight:700,fontFamily:"inherit",borderBottom:"3px solid rgba(255,255,255,.2)",minWidth:70,transition:"all .15s"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)"}
              onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.05)"}>
              <Printer size={16}/>PRINT ENGINE
            </button>
            <button onClick={()=>setShowD365(false)} style={{padding:"4px 6px",background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.2)",display:"flex",alignItems:"center"}}><X size={14}/></button>
          </div>
        </div>
      )}
      {!showD365&&(
        <button className="no-print" onClick={()=>setShowD365(true)} style={{position:"relative",zIndex:9,width:"100%",padding:4,background:"rgba(0,78,212,.15)",border:"none",borderBottom:"1px solid rgba(0,78,212,.2)",cursor:"pointer",color:"rgba(255,255,255,.3)",fontSize:9,fontWeight:700,letterSpacing:".1em",flexShrink:0,fontFamily:"inherit"}}>
          SHOW MODULE TILES
        </button>
      )}

      {/* MAIN */}
      <div style={{position:"relative",flex:1,display:"flex",overflow:"hidden",zIndex:1}}>
        {/* Left KPI sidebar */}
        <div className="no-print" style={{width:184,flexShrink:0,padding:"12px 10px",display:"flex",flexDirection:"column",gap:6,overflowY:"auto",background:"rgba(0,0,0,.32)",backdropFilter:"blur(14px)",borderRight:"1px solid rgba(255,255,255,.06)"}}>
          <div style={{fontSize:8,fontWeight:800,color:"rgba(255,255,255,.2)",letterSpacing:".12em",marginBottom:4}}>LIVE METRICS</div>
          <KpiTile label="Pending Reqs"      value={kpi.reqs}       color="#f59e0b" icon={Clock}        onClick={()=>goTo("/requisitions")}/>
          <KpiTile label="Open POs"          value={kpi.pos}        color="#60a5fa" icon={ShoppingCart}  onClick={()=>goTo("/purchase-orders")}/>
          <KpiTile label="Vouchers Due"      value={kpi.pvs}        color="#a78bfa" icon={DollarSign}    onClick={()=>goTo("/vouchers/payment")}/>
          <KpiTile label="Low Stock"         value={kpi.lowStock}   color="#f87171" icon={AlertTriangle} onClick={()=>goTo("/items")}/>
          <KpiTile label="Active Suppliers"  value={kpi.suppliers}  color="#34d399" icon={Users}         onClick={()=>goTo("/suppliers")}/>
          <KpiTile label="Pending GRN"       value={kpi.pendingGRN} color="#38bdf8" icon={Package}       onClick={()=>goTo("/goods-received")}/>
          <KpiTile label="Active Contracts"  value={kpi.contracts}  color="#fb923c" icon={FileText}      onClick={()=>goTo("/contracts")}/>
          <KpiTile label="Notifications"     value={kpi.unread}     color="#c084fc" icon={Bell}          onClick={()=>goTo("/notifications")}/>
          <div style={{marginTop:8}}>
            <div style={{fontSize:8,fontWeight:800,color:"rgba(255,255,255,.2)",letterSpacing:".12em",marginBottom:6}}>QUICK ACCESS</div>
            <div style={{display:"flex",gap:5}}>
              <button onClick={()=>goTo("/sms")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"7px",background:"rgba(34,197,94,.12)",border:"1px solid rgba(34,197,94,.25)",borderRadius:7,cursor:"pointer",color:"#22c55e",fontSize:10,fontWeight:700,fontFamily:"inherit"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(34,197,94,.22)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(34,197,94,.12)"}>
                <MessageSquare size={11}/>SMS
              </button>
              <button onClick={()=>goTo("/telephony")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"7px",background:"rgba(56,189,248,.12)",border:"1px solid rgba(56,189,248,.25)",borderRadius:7,cursor:"pointer",color:"#38bdf8",fontSize:10,fontWeight:700,fontFamily:"inherit"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(56,189,248,.22)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(56,189,248,.12)"}>
                <Phone size={11}/>Call
              </button>
            </div>
            <button onClick={()=>goTo("/reports")} style={{width:"100%",marginTop:5,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"7px",background:"rgba(139,92,246,.12)",border:"1px solid rgba(139,92,246,.25)",borderRadius:7,cursor:"pointer",color:"#8b5cf6",fontSize:10,fontWeight:700,fontFamily:"inherit"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(139,92,246,.22)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(139,92,246,.12)"}>
              <BarChart3 size={11}/>Reports & Analytics
            </button>
            <button onClick={()=>printDashboard(profile,kpi,hospital)} style={{width:"100%",marginTop:5,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"7px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:7,cursor:"pointer",color:"rgba(255,255,255,.5)",fontSize:10,fontWeight:700,fontFamily:"inherit"}}
              onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.06)"}>
              <Printer size={11}/>Print Report
            </button>
            {isAdmin&&(
              <button onClick={()=>setShowRoleModal(true)} style={{width:"100%",marginTop:5,display:"flex",alignItems:"center",justifyContent:"center",gap:6,padding:"7px",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,cursor:"pointer",color:"rgba(255,255,255,.4)",fontSize:10,fontWeight:700,fontFamily:"inherit"}}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.08)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.04)"}>
                <Plus size={11}/>New Role
              </button>
            )}
          </div>
          {kpi.sessions>0&&(
            <div style={{marginTop:4,padding:"8px 10px",background:"rgba(34,197,94,.08)",border:"1px solid rgba(34,197,94,.2)",borderRadius:8}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"#22c55e",display:"inline-block",animation:"pulse 2s ease-in-out infinite"}}/>
                <span style={{fontSize:10,fontWeight:700,color:"#22c55e"}}>{kpi.sessions} staff online</span>
              </div>
            </div>
          )}
          {publicIP&&(
            <button style={{marginTop:4,padding:"8px 10px",background:"rgba(0,120,212,.08)",border:"1px solid rgba(0,120,212,.2)",borderRadius:8,cursor:"pointer",textAlign:"left"as const,width:"100%",fontFamily:"inherit"}}
              onClick={()=>goTo("/admin/ip-access")}>
              <div style={{display:"flex",alignItems:"center",gap:5}}>
                <Globe size={11} color="#60a5fa"/>
                <span style={{fontSize:9,fontWeight:700,color:"#60a5fa"}}>Your IP</span>
              </div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.5)",marginTop:2,fontFamily:"monospace"}}>{publicIP}</div>
            </button>
          )}
        </div>

        {/* ERP Wheel */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
          {!active&&(
            <div style={{position:"absolute",top:14,left:"50%",transform:"translateX(-50%)",textAlign:"center"as const,pointerEvents:"none",animation:"fadeIn .5s",zIndex:5,width:400}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,.4)"}}>{greeting}, <span style={{color:"rgba(255,255,255,.85)",fontWeight:700}}>{profile?.full_name?.split(" ")[0]||"Staff"}</span></div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.2)",marginTop:3}}>Select a module -- {remapped.length} available</div>
            </div>
          )}
          <div style={{position:"absolute",bottom:14,left:14,display:"flex",alignItems:"center",gap:8,opacity:.3,pointerEvents:"none"}}>
            <img src={embuLogo} alt="" style={{width:26,height:26,borderRadius:"50%",objectFit:"contain"}}/>
            <div style={{fontSize:8,color:"rgba(255,255,255,.6)",lineHeight:1.3}}>
              <div style={{fontWeight:700}}>County Government of Embu</div>
              <div>Department of Health</div>
            </div>
          </div>
          <div style={{position:"absolute",bottom:12,right:14,fontSize:9,color:"rgba(255,255,255,.12)",fontWeight:700,letterSpacing:".08em",pointerEvents:"none"}}>EL5 MediProcure v21.0</div>
          <svg width={560} height={560} viewBox="0 0 600 600" style={{filter:"drop-shadow(0 16px 64px rgba(0,0,0,.8))",overflow:"visible",flexShrink:0}}>
            <defs>
              {remapped.map(s=>(
                <radialGradient key={s.id} id={`g-${s.id}`} cx="50%" cy="50%" r="55%" fx="30%" fy="30%">
                  <stop offset="0%" stopColor={s.g3}/><stop offset="50%" stopColor={s.g1}/><stop offset="100%" stopColor={s.g2}/>
                </radialGradient>
              ))}
              <radialGradient id="g-center" cx="40%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#fde68a"/><stop offset="45%" stopColor="#d97706"/><stop offset="100%" stopColor="#78350f"/>
              </radialGradient>
              <filter id="glow-seg" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="glow-c">
                <feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <circle cx={CX} cy={CY} r={OR+34} fill="none" stroke="rgba(255,255,255,.025)" strokeWidth={24}/>
            <circle cx={CX} cy={CY} r={OR+34} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={1}/>
            <circle cx={CX} cy={CY} r={OR+18} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={1} strokeDasharray="3 5"/>
            {Array.from({length:72}).map((_,i)=>{
              const deg=i*5,isMajor=i%3===0;
              const p1=P(CX,CY,OR+36,deg),p2=P(CX,CY,OR+36+(isMajor?7:3),deg);
              return<line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={`rgba(255,255,255,${isMajor?.22:.07})`} strokeWidth={isMajor?1.5:.8}/>;
            })}
            {remapped.map(s=>{
              const isAct=active===s.id,isH=hov===s.id;
              const scale=isAct?1.05:isH?1.025:1;
              const mid=(s.start+s.end)/2;
              const lp=P(CX,CY,(OR+IR)/2+12,mid),sp=P(CX,CY,(OR+IR)/2-18,mid);
              const words=s.label.split(" ");
              return(
                <g key={s.id} className="seg-g" onClick={()=>setActive(a=>a===s.id?null:s.id)} onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)}
                  style={{cursor:"pointer",transform:`scale(${scale})`,transformOrigin:`${CX}px ${CY}px`,transition:"transform .25s cubic-bezier(.4,0,.2,1)"}}>
                  {isAct&&<path d={arc(CX,CY,OR+10,IR-10,s.start,s.end,2)} fill={s.glow} filter="url(#glow-seg)"/>}
                  <path d={arc(CX,CY,OR,IR,s.start,s.end)} fill={isAct?s.g3:`url(#g-${s.id})`}
                    stroke={isAct?"rgba(255,255,255,.7)":isH?"rgba(255,255,255,.35)":"rgba(255,255,255,.08)"} strokeWidth={isAct?2.5:1}/>
                  <path d={arc(CX,CY,OR,OR-22,s.start,s.end,3)} fill="rgba(255,255,255,.07)"/>
                  <path d={arc(CX,CY,IR+22,IR,s.start,s.end,3)} fill="rgba(0,0,0,.15)"/>
                  {words.map((w,wi)=>(
                    <text key={wi} x={lp.x} y={lp.y+(wi-(words.length-1)/2)*13} textAnchor="middle" dominantBaseline="central"
                      fill={isAct?"#fff":"rgba(255,255,255,.92)"} fontSize={11} fontWeight={900} letterSpacing={1.8}
                      style={{pointerEvents:"none",userSelect:"none"as const,filter:isAct?"drop-shadow(0 0 6px rgba(255,255,255,.7))":"none"}}>{w}</text>
                  ))}
                  <text x={sp.x} y={sp.y} textAnchor="middle" dominantBaseline="central" fill={isAct?"rgba(255,255,255,.75)":"rgba(255,255,255,.28)"} fontSize={7.5} fontWeight={500} style={{pointerEvents:"none"}}>{s.sub}</text>
                </g>
              );
            })}
            <circle cx={CX} cy={CY} r={IR-2} fill="url(#g-center)" stroke="rgba(255,255,255,.22)" strokeWidth={2.5}/>
            <circle cx={CX} cy={CY} r={IR-2} fill="none" stroke="rgba(255,180,0,.35)" strokeWidth={1.5} strokeDasharray="4 5"/>
            <image href={logoImg} x={CX-24} y={CY-32} width={48} height={48} style={{opacity:.78}} filter="url(#glow-c)"/>
            <text x={CX} y={CY+24} textAnchor="middle" fill="rgba(253,230,138,.5)" fontSize={7} fontWeight={700} letterSpacing={2}>v21.0</text>
          </svg>
          {activeSeg&&(
            <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",width:210,background:"rgba(6,14,34,.96)",border:`1px solid ${activeSeg.g1}66`,borderRadius:14,overflow:"hidden",backdropFilter:"blur(20px)",animation:"slideIn .18s",zIndex:10,boxShadow:`0 8px 32px rgba(0,0,0,.6)`}}>
              <div style={{padding:"12px 14px 10px",background:`linear-gradient(135deg,${activeSeg.g2},${activeSeg.g1})`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontWeight:800,fontSize:13,color:"#fff"}}>{activeSeg.label}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,.6)",marginTop:1}}>{activeSeg.sub}</div>
                </div>
                <button onClick={()=>setActive(null)} style={{background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",color:"rgba(255,255,255,.8)",padding:"3px 5px",borderRadius:5,display:"flex"}}><X size={12}/></button>
              </div>
              <div style={{padding:8}}>
                {activeSeg.links.map(l=>(
                  <button key={l.path} onClick={()=>{goTo(l.path);setActive(null);}}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,background:"transparent",border:"none",cursor:"pointer",color:"rgba(255,255,255,.72)",fontSize:11,marginBottom:2,transition:"all .12s",textAlign:"left"as const,fontFamily:"inherit"}}
                    onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=activeSeg.g1+"44";(e.currentTarget as HTMLElement).style.color="#fff";}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background="transparent";(e.currentTarget as HTMLElement).style.color="rgba(255,255,255,.72)";}}>
                    <ChevronRight size={10} color={activeSeg.g3}/>{l.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Profile upload modal */}
      {showUpload&&(
        <div style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.72)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowUpload(false)}>
          <div style={{background:"#0c1a30",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:24,minWidth:280,animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontWeight:700,color:"#e2e8f0",fontSize:14}}>Update Profile Photo</span>
              <button onClick={()=>setShowUpload(false)} style={{background:"transparent",border:"none",cursor:"pointer",color:"#475569"}}><X size={16}/></button>
            </div>
            <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
              <ImageUploader type="profile" circle size="lg" current={profile?.avatar_url||""} folder={`profiles/${user?.id}`}
                onUploaded={async(url)=>{if(url&&user?.id)await db.from("profiles").update({avatar_url:url}).eq("id",user.id);setShowUpload(false);}}/>
            </div>
            <div style={{fontSize:10,color:"#475569",textAlign:"center"as const}}>Drag & drop or click - max 5MB</div>
          </div>
        </div>
      )}
      {showRoleModal&&isAdmin&&<RoleCreatorModal onClose={()=>setShowRoleModal(false)}/>}
    </div>
  );
}

function RoleCreatorModal({onClose}:{onClose:()=>void}) {
  const [roleName,setRoleName]=useState("");
  const [caps,setCaps]=useState<string[]>([]);
  const [saving,setSaving]=useState(false);
  const ALL_CAPS=["create_requisitions","approve_requisitions","create_po","approve_po","receive_goods","manage_suppliers","manage_contracts","manage_tenders","view_financials","create_vouchers","approve_vouchers","manage_budgets","manage_items","view_reports","manage_users","system_settings","view_audit","ip_monitoring","print_reports"];
  const toggle=(c:string)=>setCaps(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);
  const save=async()=>{
    if(!roleName.trim())return;
    setSaving(true);
    const key=roleName.toLowerCase().replace(/\s+/g,"_");
    await(supabase as any).from("system_settings").upsert({key:`custom_role_${key}`,value:JSON.stringify({name:key,label:roleName,capabilities:caps}),category:"roles"},{onConflict:"key"});
    setSaving(false);onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:400,background:"rgba(0,0,0,.75)",display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#0c1a30",border:"1px solid rgba(255,255,255,.12)",borderRadius:16,padding:24,width:480,maxHeight:"80vh",overflowY:"auto",animation:"fadeIn .2s"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontWeight:800,color:"#e2e8f0",fontSize:15}}>Create New Role</span>
          <button onClick={onClose} style={{background:"transparent",border:"none",cursor:"pointer",color:"#475569"}}><X size={16}/></button>
        </div>
        <input value={roleName} onChange={e=>setRoleName(e.target.value)} placeholder="Role name e.g. Pharmacist"
          style={{width:"100%",background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,padding:"9px 12px",color:"#e2e8f0",fontSize:13,outline:"none",marginBottom:14,boxSizing:"border-box"as const}}/>
        <div style={{fontSize:11,color:"rgba(255,255,255,.4)",marginBottom:8}}>Assign capabilities:</div>
        <div style={{display:"flex",flexWrap:"wrap"as const,gap:6,marginBottom:16}}>
          {ALL_CAPS.map(c=>(
            <button key={c} onClick={()=>toggle(c)} style={{padding:"4px 10px",borderRadius:6,fontSize:10,fontWeight:600,border:"none",cursor:"pointer",background:caps.includes(c)?"#1b5fcc":"rgba(255,255,255,.07)",color:caps.includes(c)?"#fff":"rgba(255,255,255,.5)",fontFamily:"inherit"}}>
              {c.replace(/_/g," ")}
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"8px 16px",background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.15)",borderRadius:8,color:"rgba(255,255,255,.5)",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
          <button onClick={save} disabled={saving||!roleName.trim()} style={{padding:"8px 16px",background:saving||!roleName?"#374151":"#1b5fcc",border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit"}}>
            {saving?<RefreshCw size={12} style={{animation:"spin 1s linear infinite"}}/>:<Save size={12}/>}
            {saving?"Saving...":"Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
