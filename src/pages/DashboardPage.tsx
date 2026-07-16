/**
 * EL5 MediProcure — Dashboard v2.0
 * Full Windows XP Luna Blue desktop with role-aware tiles and live data
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/sessionCookie";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDashboardKPI } from "@/hooks/queries/useDashboardKPI";
import ERPWheel from "@/components/ERPWheel";


// Procurement cycle background (graceful fallback to XP blue)
let DESK_BG_URL = "";
try { DESK_BG_URL = new URL("../assets/procurement-bg.jpg", import.meta.url).href; } catch (_e) { /* ignore */ }

const DESK_BG = DESK_BG_URL
  ? `url("${DESK_BG_URL}") center/cover no-repeat`
  : "linear-gradient(160deg,#245ebd 0%,#1a4595 40%,#0f317a 100%)";

const XP = {
  titleBar: "linear-gradient(180deg,#4490d9 0%,#2461bf 8%,#245ebd 92%,#1a50aa 100%)",
  desktop:  DESK_BG,
  taskbar:  "linear-gradient(180deg,#3a77cc 0%,#2256b5 4%,#2357b8 96%,#1a4ea6 100%)",
  windowBg: "#ece9d8",
  btnBorder:"#a29d7f",
  gridBorder:"#c0bca8",
  font:     "'Tahoma','Segoe UI','Arial',sans-serif",
};
const fmtK = (n?: number|null) => {
  const v = n||0;
  if (v >= 1e6) return `KES ${(v/1e6).toFixed(2)}M`;
  if (v >= 1e3) return `KES ${(v/1e3).toFixed(1)}K`;
  return `KES ${v.toLocaleString("en-KE",{minimumFractionDigits:2})}`;
};

interface Tile {
  icon: string; label: string; value: string|number; sub: string;
  color: string; path: string; roles: string[];
}

export default function DashboardPage() {
  const { user, profile, roles, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const isTablet = useIsMobile(1024) && !isMobile;
  const [time, setTime] = useState(new Date());
  const [startOpen, setStartOpen] = useState(false);
  const { kpi, activity, loading, refetch: fetchKPI } = useDashboardKPI();

  const isAdmin   = roles.some(r=>["superadmin","admin","webmaster"].includes(r));
  const isFinance = roles.some(r=>["finance_manager","finance_officer","accountant"].includes(r));
  const isProc    = roles.some(r=>["procurement_manager","procurement_officer"].includes(r));

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);



  // Redirect finance/specialist users to their role-specific desktop
  // Guard: only redirect AFTER roles are actually loaded (not the "requisitioner" default)
  useEffect(()=>{
    if (!primaryRole || roles.length === 0) return; // wait for real role data
    const dest = getDefaultRoute(primaryRole);
    if (dest !== "/dashboard") navigate(dest, {replace:true});
  },[primaryRole, roles.length, navigate]);

  const TILES: Tile[] = [
    {icon:"📋",label:"Requisitions",value:kpi.requisitions,sub:"Total submitted",color:"#7c3aed",path:"/requisitions",roles:["admin","procurement_manager","procurement_officer","requisitioner"]},
    {icon:"🛒",label:"Purchase Orders",value:kpi.pendingPOs,sub:`${fmtK(kpi.totalPOValue)} value`,color:"#0078d4",path:"/purchase-orders",roles:["admin","procurement_manager","procurement_officer","accountant","finance_manager","finance_officer"]},
    {icon:"📦",label:"Goods Received",value:kpi.grnCount,sub:"GRN records",color:"#059669",path:"/goods-received",roles:["admin","procurement_manager","procurement_officer","warehouse_officer","inventory_manager"]},
    {icon:"🏢",label:"Suppliers",value:kpi.suppliers,sub:"Registered vendors",color:"#d97706",path:"/suppliers",roles:["admin","procurement_manager","procurement_officer"]},
    {icon:"💳",label:"Payment Vouchers",value:kpi.vouchers,sub:`${fmtK(kpi.payments)} pending`,color:"#dc2626",path:"/vouchers/payment",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"🧾",label:"Receipt Vouchers",value:kpi.receipts,sub:"Total receipts",color:"#0e7490",path:"/vouchers/receipt",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"📊",label:"Budget",value:`${kpi.budgetTotal>0?((kpi.budgetSpent/kpi.budgetTotal)*100).toFixed(0):0}%`,sub:`${fmtK(kpi.budgetSpent)} of ${fmtK(kpi.budgetTotal)}`,color:"#4f46e5",path:"/financials/budgets",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"📦",label:"Inventory Items",value:kpi.inventory,sub:"Stock records",color:"#059669",path:"/items",roles:["admin","procurement_manager","inventory_manager","warehouse_officer"]},
    {icon:"📄",label:"Contracts",value:kpi.contracts,sub:"Active contracts",color:"#0078d4",path:"/contracts",roles:["admin","procurement_manager"]},
    {icon:"🏆",label:"Tenders",value:kpi.tenders,sub:"Total tenders",color:"#d97706",path:"/tenders",roles:["admin","procurement_manager","procurement_officer"]},
    {icon:"📈",label:"Reports",value:"→",sub:"Analytics & BI",color:"#7c3aed",path:"/reports",roles:[]},
    {icon:"📁",label:"Documents",value:"→",sub:"File manager",color:"#0e7490",path:"/documents",roles:[]},
  ];

  const visibleTiles = TILES.filter(t=>!t.roles.length||t.roles.some(r=>roles.includes(r)));

  const NAV_ITEMS = [
    {icon:"🏠",label:"Dashboard",path:"/dashboard",roles:[]},
    {icon:"📋",label:"Requisitions",path:"/requisitions",roles:["admin","procurement_manager","procurement_officer","requisitioner"]},
    {icon:"🛒",label:"Purchase Orders",path:"/purchase-orders",roles:["admin","procurement_manager","procurement_officer","accountant","finance_manager","finance_officer"]},
    {icon:"📦",label:"Goods Received",path:"/goods-received",roles:["admin","procurement_manager","procurement_officer","warehouse_officer","inventory_manager"]},
    {icon:"💰",label:"Finance Desktop",path:"/finance-dashboard",roles:["admin","finance_manager","finance_officer","accountant"]},
    {icon:"💳",label:"Vouchers",path:"/vouchers",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"📊",label:"Reports",path:"/reports",roles:[]},
    {icon:"👥",label:"Users",path:"/users",roles:["admin","superadmin","webmaster","database_admin"]},
    {icon:"⚙️",label:"Settings",path:"/settings",roles:["admin","superadmin","webmaster"]},
    {icon:"🔑",label:"Audit Log",path:"/audit-log",roles:["admin","procurement_manager","accountant","finance_manager"]},
    {icon:"🔐",label:"Tracker",path:"/admin/tracker",roles:["admin","superadmin","webmaster"]},
  ].filter(i=>!i.roles.length||i.roles.some(r=>roles.includes(r)));

  return (
    <div style={{width:"100vw",height:"100vh",background:XP.desktop,
      position:"fixed" as const,inset:0,overflow:"hidden",fontFamily:XP.font}}>

      {/* Dark overlay — keeps icons & text readable over the photo */}
      {DESK_BG_URL && (
        <div style={{position:"absolute" as const,inset:0,
          background:"linear-gradient(160deg,rgba(5,18,60,.55) 0%,rgba(8,28,80,.38) 50%,rgba(4,14,48,.62) 100%)",
          zIndex:0,pointerEvents:"none"}} />
      )}

      {/* Desktop icons (left column) — hidden on phone */}
      {!isMobile && (
      <div style={{position:"absolute" as const,top:12,left:10,display:"flex",flexDirection:"column" as const,gap:4,zIndex:10}}>
        {[
          {icon:"💰",label:"Finance Desktop",path:"/finance-dashboard",roles:["admin","finance_manager","finance_officer","accountant"]},
          {icon:"📋",label:"Requisitions",path:"/requisitions",roles:["admin","procurement_manager","procurement_officer","requisitioner","warehouse_officer"]},
          {icon:"🛒",label:"Purchase Orders",path:"/purchase-orders",roles:["admin","procurement_manager","procurement_officer","accountant","finance_manager","finance_officer"]},
          {icon:"📦",label:"Goods Received",path:"/goods-received",roles:["admin","procurement_manager","warehouse_officer","inventory_manager"]},
          {icon:"📊",label:"Reports",path:"/reports",roles:[]},
          {icon:"📁",label:"Documents",path:"/documents",roles:[]},
          {icon:"👥",label:"Users",path:"/users",roles:["admin","superadmin","webmaster","database_admin"]},
        ].filter(i=>!i.roles.length||i.roles.some(r=>roles.includes(r))).map(ic=>(
          <button key={ic.path} onDoubleClick={()=>navigate(ic.path)}
            style={{background:"transparent",border:"none",cursor:"pointer",
              display:"flex",flexDirection:"column" as const,alignItems:"center",
              gap:3,padding:"6px 8px",borderRadius:4,width:72,
              color:"#fff",fontFamily:XP.font,fontSize:10,
              textShadow:"1px 1px 3px rgba(0,0,0,.9)"}}
            onMouseEnter={e=>(e.currentTarget as any).style.background="rgba(255,255,255,.18)"}
            onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>
            <span style={{fontSize:26,filter:"drop-shadow(1px 1px 3px rgba(0,0,0,.6))"}}>{ic.icon}</span>
            <span style={{textAlign:"center",lineHeight:1.2,wordBreak:"break-word" as const}}>{ic.label}</span>
          </button>
        ))}
      </div>
      )}

      {/* Main window */}
      <div style={{position:"absolute" as const,
        top:isMobile?4:10,
        left:isMobile?4:90,
        right:isMobile?4:10,
        bottom:isMobile?44:46,
        background:XP.windowBg,border:"2px solid #0054e3",borderRadius:isMobile?4:6,
        boxShadow:"4px 4px 18px rgba(0,0,0,.6)",display:"flex",flexDirection:"column" as const,overflow:"hidden"}}>

        {/* Title bar */}
        <div style={{background:XP.titleBar,display:"flex",alignItems:"center",
          justifyContent:"space-between",padding:"3px 5px 3px 8px",flexShrink:0,userSelect:"none" as const}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:14}}>🏥</span>
            <span style={{color:"#fff",fontSize:11,fontWeight:700,textShadow:"1px 1px 2px rgba(0,0,0,.6)"}}>
              EL5 MediProcure — Dashboard · {profile?.full_name||user?.email} · {primaryRole?.replace(/_/g," ")}
            </span>
          </div>
          <div style={{display:"flex",gap:2}}>
            <button onClick={()=>navigate(-1)} title="Back" style={{width:21,height:21,background:"linear-gradient(180deg,#f0a830,#c87000)",border:"1px solid #7a4400",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:12}}>–</button>
            <button onClick={fetchKPI} title="Refresh" style={{width:21,height:21,background:"linear-gradient(180deg,#60d060,#289028)",border:"1px solid #1a7018",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:10}}>↻</button>
            <button onClick={signOut} title="Sign Out" style={{width:21,height:21,background:"linear-gradient(180deg,#e85040,#b01818)",border:"1px solid #701010",borderRadius:3,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:900}}>✕</button>
          </div>
        </div>

        {/* Menu bar */}
        <div style={{background:XP.windowBg,borderBottom:`1px solid ${XP.btnBorder}`,
          display:"flex",alignItems:"center",padding:"1px 4px",flexShrink:0}}>
          {[
            {label:"File",items:[{l:"↻ Refresh",fn:fetchKPI},{l:"🚪 Sign Out",fn:signOut}]},
            {label:"Go",items:NAV_ITEMS.map(n=>({l:`${n.icon} ${n.label}`,fn:()=>navigate(n.path)}))},
            {label:"View",items:[{l:"🏠 Dashboard",fn:()=>navigate("/dashboard")},{l:"📊 Reports",fn:()=>navigate("/reports")}]},
            {label:"Tools",items:[{l:"📁 Documents",fn:()=>navigate("/documents")},{l:"📬 Inbox",fn:()=>navigate("/inbox")},{l:"🔔 Notifications",fn:()=>navigate("/notifications")}]},
            {label:"Help",items:[{l:"ℹ️ About EL5 MediProcure",fn:()=>alert("EL5 MediProcure v11.0 — Embu Level 5 Hospital")}]},
          ].map(menu=><XPMenu key={menu.label} label={menu.label} items={menu.items}/>)}
        </div>

        {/* Toolbar */}
        <div style={{background:"linear-gradient(180deg,#f5f4ea,#e8e5d8)",
          borderBottom:`1px solid ${XP.btnBorder}`,padding:"3px 8px",
          display:"flex",gap:6,alignItems:"center",flexShrink:0,flexWrap:"wrap" as const}}>
          {[
            {icon:"🏠",label:"Home",fn:()=>navigate("/dashboard")},
            {icon:"↻",label:"Refresh",fn:fetchKPI},
            ...(isFinance?[{icon:"💰",label:"Finance Desktop",fn:()=>navigate("/finance-dashboard")}]:[]),
            ...(isProc||isAdmin?[{icon:"📋",label:"Requisitions",fn:()=>navigate("/requisitions")},{icon:"🛒",label:"PO",fn:()=>navigate("/purchase-orders")}]:[]),
            {icon:"📊",label:"Reports",fn:()=>navigate("/reports")},
            {icon:"📁",label:"Documents",fn:()=>navigate("/documents")},
            {icon:"📬",label:"Inbox",fn:()=>navigate("/inbox")},
          ].map(b=>(
            <XPToolBtn key={b.label} icon={b.icon} label={b.label} onClick={b.fn}/>
          ))}
          <div style={{flex:1}}/>
          <span style={{fontSize:10,fontFamily:XP.font,color:"#555"}}>
            {loading?"⏳ Loading…":`${visibleTiles.length} modules · ${new Date().toLocaleDateString("en-KE")}`}
          </span>
        </div>

        {/* Content */}
        <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
          {/* Left nav panel — hidden on phone; the global app nav (hamburger drawer)
              already covers navigation there, and this fixed 168px rail was eating
              roughly half the usable width on a narrow screen, leaving the KPI tiles
              and ERP wheel squeezed into ~150px. */}
          {!isMobile && (
          <div style={{width:168,background:"linear-gradient(180deg,#6f9fcf,#4a7fc4)",
            borderRight:`1px solid ${XP.gridBorder}`,overflowY:"auto" as const,flexShrink:0}}>
            <div style={{background:"rgba(0,0,0,.15)",padding:"6px 10px",fontSize:9,
              fontWeight:700,color:"rgba(255,255,255,.7)",letterSpacing:".06em",textTransform:"uppercase" as const}}>Navigation</div>
            {NAV_ITEMS.map(n=>(
              <button key={n.path} onClick={()=>navigate(n.path)}
                style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",
                  color:"#fff",fontSize:11,fontFamily:XP.font,background:"transparent",
                  border:"none",cursor:"pointer",width:"100%",textAlign:"left" as const,
                  borderBottom:"1px solid rgba(255,255,255,.08)"}}
                onMouseEnter={e=>(e.currentTarget as any).style.background="rgba(255,255,255,.18)"}
                onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>
                <span style={{fontSize:14}}>{n.icon}</span>
                <span>{n.label}</span>
              </button>
            ))}
            {/* User info panel */}
            <div style={{margin:"12px 8px",padding:8,background:"rgba(255,255,255,.12)",borderRadius:4}}>
              <div style={{color:"#fff",fontWeight:700,fontSize:11,marginBottom:3}}>{profile?.full_name||"User"}</div>
              <div style={{color:"rgba(255,255,255,.75)",fontSize:9}}>{primaryRole?.replace(/_/g," ")}</div>
              <div style={{color:"rgba(255,255,255,.65)",fontSize:9,marginTop:2}}>{user?.email}</div>
              <button onClick={signOut} style={{marginTop:8,background:"rgba(220,40,40,.7)",border:"1px solid rgba(255,255,255,.3)",borderRadius:3,color:"#fff",fontSize:10,padding:"3px 10px",cursor:"pointer",width:"100%",fontFamily:XP.font}}>Sign Out</button>
            </div>
          </div>
          )}

          {/* Main content */}
          <div style={{flex:1,overflowY:"auto" as const,padding:12}}>
            {/* Welcome banner */}
            <div style={{background:"linear-gradient(135deg,#1a3580,#2a5fc3)",borderRadius:4,padding:"10px 16px",marginBottom:12,
              display:"flex",justifyContent:"space-between",alignItems:"center",color:"#fff"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>Welcome back, {profile?.full_name?.split(" ")[0]||"User"}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.75)",marginTop:2}}>
                  {new Date().toLocaleDateString("en-KE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})} · Embu Level 5 Hospital
                </div>
              </div>
              <div style={{textAlign:"right" as const,fontSize:10,color:"rgba(255,255,255,.75)"}}>
                <div>EL5 MediProcure v11.0</div>
                <div style={{fontSize:9}}>Role: {primaryRole?.replace(/_/g," ")}</div>
              </div>
            </div>

            {/* KPI tiles grid */}
            {/* ERP Wheel — Dynamics-365 style radial launcher */}
            <div style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:4,padding:12,marginBottom:12,display:"flex",justifyContent:"center"}}>
              <ERPWheel size={isMobile?300:440} title="ProcurBosse" subtitle="EL5 MediProcure" roles={roles} />
            </div>

            <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(175px,1fr))",gap:isMobile?6:8,marginBottom:12}}>
              {visibleTiles.map(tile=>(
                <button key={tile.path} onClick={()=>navigate(tile.path)}
                  style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",
                    border:`1px solid ${XP.btnBorder}`,borderRadius:4,padding:"10px 12px",
                    cursor:"pointer",textAlign:"left" as const,fontFamily:XP.font,
                    boxShadow:"1px 1px 4px rgba(0,0,0,.1)",transition:"all .15s",
                    borderLeft:`3px solid ${tile.color}`}}
                  onMouseEnter={e=>{(e.currentTarget as any).style.background="linear-gradient(180deg,#fff,#f5f3e8)";(e.currentTarget as any).style.boxShadow="2px 2px 8px rgba(0,0,0,.18)";(e.currentTarget as any).style.transform="translateY(-1px)";}}
                  onMouseLeave={e=>{(e.currentTarget as any).style.background="linear-gradient(180deg,#f8f7ee,#ece9d8)";(e.currentTarget as any).style.boxShadow="1px 1px 4px rgba(0,0,0,.1)";(e.currentTarget as any).style.transform="none";}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                    <span style={{fontSize:22}}>{tile.icon}</span>
                    <span style={{fontSize:9,color:"#888",background:"#e8e5d0",padding:"1px 5px",borderRadius:2,border:`1px solid ${XP.btnBorder}`}}>→</span>
                  </div>
                  <div style={{fontSize:9,fontWeight:700,color:"#555",textTransform:"uppercase" as const,letterSpacing:".05em",marginBottom:4}}>{tile.label}</div>
                  <div style={{fontSize:20,fontWeight:900,color:tile.color,lineHeight:1,marginBottom:2}}>{loading?"…":tile.value}</div>
                  <div style={{fontSize:9,color:"#888"}}>{tile.sub}</div>
                </button>
              ))}
            </div>

            {/* Bottom row: Activity + Quick actions */}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              {/* Recent activity */}
              <div style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:4,padding:"8px 12px"}}>
                <div style={{fontWeight:700,fontSize:11,marginBottom:6,borderBottom:`1px solid ${XP.btnBorder}`,paddingBottom:4}}>🕐 Recent Activity</div>
                {activity.length===0
                  ? <div style={{fontSize:10,color:"#888",fontFamily:XP.font,padding:"8px 0"}}>No recent activity</div>
                  : activity.map((a,i)=>(
                    <div key={i} style={{display:"flex",gap:8,padding:"4px 0",borderBottom:`1px solid ${XP.gridBorder}`,alignItems:"flex-start"}}>
                      <span style={{fontSize:14,flexShrink:0}}>📝</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontFamily:XP.font,color:"#1a1a1a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{a.action||a.description||"System event"}</div>
                        <div style={{fontSize:9,color:"#888",fontFamily:XP.font}}>{a.created_at?new Date(a.created_at).toLocaleString("en-KE"):"—"}</div>
                      </div>
                    </div>
                  ))
                }
              </div>

              {/* Quick actions */}
              <div style={{background:"linear-gradient(180deg,#f8f7ee,#ece9d8)",border:`1px solid ${XP.btnBorder}`,borderRadius:4,padding:"8px 12px"}}>
                <div style={{fontWeight:700,fontSize:11,marginBottom:6,borderBottom:`1px solid ${XP.btnBorder}`,paddingBottom:4}}>⚡ Quick Actions</div>
                <div style={{display:"flex",flexDirection:"column" as const,gap:5}}>
                  {[
                    ...(isFinance?[{icon:"💰",label:"Open Finance Desktop",path:"/finance-dashboard",color:"#245ebd"},{icon:"💳",label:"New Payment Voucher",path:"/vouchers/payment",color:"#dc2626"},{icon:"🧾",label:"New Receipt Voucher",path:"/vouchers/receipt",color:"#0e7490"}]:[]),
                    ...(isProc||isAdmin?[{icon:"📋",label:"New Requisition",path:"/requisitions",color:"#7c3aed"},{icon:"🛒",label:"Purchase Orders",path:"/purchase-orders",color:"#0078d4"}]:[]),
                    {icon:"📊",label:"View Reports",path:"/reports",color:"#059669"},
                    {icon:"📁",label:"Documents",path:"/documents",color:"#d97706"},
                    {icon:"📬",label:"Inbox",path:"/inbox",color:"#4f46e5"},
                    ...(isAdmin?[{icon:"👥",label:"Manage Users",path:"/users",color:"#7c3aed"}]:[]),
                  ].map((a,i)=>(
                    <button key={i} onClick={()=>navigate(a.path)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",
                        background:"linear-gradient(180deg,#f5f4ea,#dbd9c9)",
                        border:`1px solid ${XP.btnBorder}`,borderRadius:3,cursor:"pointer",
                        fontFamily:XP.font,fontSize:11,color:"#1a1a1a",textAlign:"left" as const,
                        boxShadow:"1px 1px 2px rgba(255,255,255,.8) inset,-1px -1px 2px rgba(0,0,0,.08) inset"}}
                      onMouseEnter={e=>(e.currentTarget as any).style.background="linear-gradient(180deg,#fdfcea,#edead0)"}
                      onMouseLeave={e=>(e.currentTarget as any).style.background="linear-gradient(180deg,#f5f4ea,#dbd9c9)"}>
                      <span style={{fontSize:14}}>{a.icon}</span>
                      <span>{a.label}</span>
                      <span style={{marginLeft:"auto",fontSize:10,color:"#888"}}>→</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{background:XP.windowBg,borderTop:`1px solid ${XP.btnBorder}`,
          display:"flex",gap:10,padding:"2px 8px",fontSize:9,fontFamily:XP.font,
          color:"#555",flexShrink:0,flexWrap:"wrap" as const}}>
          <span style={{borderRight:`1px solid ${XP.btnBorder}`,paddingRight:8}}>👤 {profile?.full_name||user?.email}</span>
          <span style={{borderRight:`1px solid ${XP.btnBorder}`,paddingRight:8}}>🔐 {primaryRole?.replace(/_/g," ")}</span>
          <span style={{borderRight:`1px solid ${XP.btnBorder}`,paddingRight:8}}>🏥 Embu Level 5 Hospital</span>
          <span style={{borderRight:`1px solid ${XP.btnBorder}`,paddingRight:8}}>{loading?"⏳ Loading…":`${visibleTiles.length} modules visible`}</span>
          <span style={{marginLeft:"auto"}}>EL5 MediProcure v11.0</span>
        </div>
      </div>

      {/* XP Taskbar */}
      <div style={{position:"fixed" as const,bottom:0,left:0,right:0,height:36,
        background:XP.taskbar,display:"flex",alignItems:"center",
        padding:"0 4px",gap:3,zIndex:9999,boxShadow:"0 -1px 4px rgba(0,0,0,.4)"}}>
        {/* Start */}
        <button onClick={()=>setStartOpen(o=>!o)}
          style={{background:startOpen?"linear-gradient(180deg,#3ea03d,#237022)":"linear-gradient(180deg,#5cb85c,#3d9b3d)",
            border:"1px solid #1a7a1a",borderRadius:3,color:"#fff",
            padding:isMobile?"3px 8px":"3px 12px 3px 8px",fontSize:13,fontWeight:900,fontFamily:XP.font,
            cursor:"pointer",display:"flex",alignItems:"center",gap:5,height:28,flexShrink:0}}>
          <span>⊞</span>{!isMobile&&"start"}
        </button>
        {/* Start menu */}
        {startOpen&&(
          <div style={{position:"absolute" as const,bottom:36,left:0,width:220,
            background:"linear-gradient(180deg,#1a55c0,#1a3580)",
            borderRadius:"4px 4px 0 0",boxShadow:"3px 0 12px rgba(0,0,0,.6)",zIndex:10000}}>
            <div style={{background:"linear-gradient(90deg,#1a55c0,#3d7bdb)",padding:"10px",
              borderBottom:"1px solid rgba(255,255,255,.2)",display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.15)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏥</div>
              <div>
                <div style={{color:"#fff",fontWeight:700,fontSize:12}}>{profile?.full_name||"User"}</div>
                <div style={{color:"#aad0ff",fontSize:9}}>{primaryRole?.replace(/_/g," ")}</div>
              </div>
            </div>
            {NAV_ITEMS.map(n=>(
              <button key={n.path} onClick={()=>{navigate(n.path);setStartOpen(false);}}
                style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",
                  color:"#fff",fontSize:11,fontFamily:XP.font,background:"transparent",
                  border:"none",cursor:"pointer",width:"100%",textAlign:"left" as const,
                  borderBottom:"1px solid rgba(255,255,255,.06)"}}
                onMouseEnter={e=>(e.currentTarget as any).style.background="#316ac5"}
                onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
            <div style={{borderTop:"1px solid rgba(255,255,255,.2)",padding:"4px 0"}}>
              <button onClick={signOut} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",color:"#fff",fontSize:11,fontFamily:XP.font,background:"transparent",border:"none",cursor:"pointer",width:"100%",textAlign:"left" as const}} onMouseEnter={e=>(e.currentTarget as any).style.background="#c02020"} onMouseLeave={e=>(e.currentTarget as any).style.background="transparent"}>🔴 Sign Out</button>
            </div>
          </div>
        )}
        <div style={{width:1,height:24,background:"rgba(255,255,255,.2)",margin:"0 2px",flexShrink:0}}/>
        {!isMobile&&(
        <button onClick={()=>navigate("/dashboard")}
          style={{background:"rgba(0,0,0,.3)",border:"1px solid rgba(255,255,255,.3)",borderRadius:2,color:"#fff",padding:"2px 10px",fontSize:10,fontFamily:XP.font,cursor:"pointer",height:24,display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
          🏥 EL5 MediProcure
        </button>
        )}
        <div style={{flex:1,minWidth:4}}/>
        {loading&&<span style={{color:"rgba(255,255,255,.6)",fontSize:9,flexShrink:0}}>⏳</span>}
        <button onClick={fetchKPI} title="Refresh" style={{background:"rgba(0,0,0,.2)",border:"1px solid rgba(255,255,255,.2)",borderRadius:2,color:"#fff",padding:"2px 8px",fontSize:10,cursor:"pointer",height:24,flexShrink:0}}>↻</button>
        <div style={{background:"rgba(0,0,0,.25)",border:"1px solid rgba(255,255,255,.2)",borderRadius:2,padding:"2px 8px",color:"#fff",fontSize:10,fontFamily:XP.font,height:24,display:"flex",alignItems:"center",flexShrink:0}}>
          {time.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}
        </div>
      </div>
    </div>
  );
}

// ── Mini components ──────────────────────────────────────────────
function XPToolBtn({icon,label,onClick}:{icon:string;label:string;onClick:()=>void}) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",
        background:h?"linear-gradient(180deg,#fdfcea,#edead0)":"linear-gradient(180deg,#f5f4ea,#dbd9c9)",
        border:`1px solid ${XP.btnBorder}`,borderRadius:3,cursor:"pointer",
        fontFamily:XP.font,fontSize:11,color:"#1a1a1a",
        boxShadow:"1px 1px 2px rgba(255,255,255,.8) inset"}}>
      <span style={{fontSize:13}}>{icon}</span>{label}
    </button>
  );
}

function XPMenu({label,items}:{label:string;items:{l:string;fn:()=>void}[]}) {
  const [open,setOpen]=useState(false);
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);
  },[open]);
  return (
    <div ref={ref} style={{position:"relative" as const}}>
      <span onClick={()=>setOpen(o=>!o)} style={{padding:"2px 8px",cursor:"pointer",fontSize:11,fontFamily:XP.font,display:"inline-block",background:open?"#316ac5":"transparent",color:open?"#fff":"#1a1a1a"}}
        onMouseEnter={e=>{(e.currentTarget as any).style.background="#316ac5";(e.currentTarget as any).style.color="#fff";}}
        onMouseLeave={e=>{if(!open){(e.currentTarget as any).style.background="transparent";(e.currentTarget as any).style.color="#1a1a1a";}}}>
        {label}
      </span>
      {open&&(
        <div style={{position:"absolute" as const,top:"100%",left:0,minWidth:180,zIndex:9999,
          background:XP.windowBg,border:`1px solid ${XP.btnBorder}`,boxShadow:"3px 3px 8px rgba(0,0,0,.35)"}}>
          {items.map((it,i)=>(
            <div key={i} onClick={()=>{it.fn();setOpen(false);}}
              style={{padding:"4px 16px 4px 22px",fontSize:11,fontFamily:XP.font,cursor:"pointer",color:"#1a1a1a"}}
              onMouseEnter={e=>{(e.currentTarget as any).style.background="#316ac5";(e.currentTarget as any).style.color="#fff";}}
              onMouseLeave={e=>{(e.currentTarget as any).style.background="transparent";(e.currentTarget as any).style.color="#1a1a1a";}}>
              {it.l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
