/**
 * EL5 MediProcure — Dashboard v3.0 (2026 ERP redesign)
 * Full rebuild: the Windows-XP desktop/taskbar/title-bar chrome is gone.
 * The ERP Wheel is now the actual hero of the page — full-bleed graded
 * background photo, frosted-glass panels, no retro window frame. Same
 * KPI data, activity feed, role-based tile/nav filtering, and redirect
 * logic as v2.0.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRoute } from "@/lib/sessionCookie";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useDashboardKPI } from "@/hooks/queries/useDashboardKPI";
import ERPWheel, { DEFAULT_SEGMENTS as ERP_WHEEL_SEGMENTS } from "@/components/ERPWheel";
import { T } from "@/lib/theme";
import { RefreshCw, LogOut, Clock } from "lucide-react";

let DESK_BG_URL = "";
try { DESK_BG_URL = new URL("../assets/procurement-bg.jpg", import.meta.url).href; } catch (_e) { /* ignore */ }

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

// Glass-panel primitive — frosted card that sits on top of the photo,
// used for every content block on the page (KPI tiles, activity,
// quick actions) instead of the old beige Windows-panel look.
const glass = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: "rgba(255,255,255,0.90)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  border: "1px solid rgba(255,255,255,0.5)",
  borderRadius: T.rXl,
  boxShadow: "0 8px 32px rgba(8,15,45,0.28)",
  ...extra,
});

export default function DashboardPage() {
  const { user, profile, roles, primaryRole, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile(768);
  const [time, setTime] = useState(new Date());
  const { kpi, activity, loading, refetch: fetchKPI } = useDashboardKPI();

  const isAdmin   = roles.some(r=>["superadmin","admin","webmaster"].includes(r));
  const isFinance = roles.some(r=>["finance_manager","finance_officer","accountant"].includes(r));
  const isProc    = roles.some(r=>["procurement_manager","procurement_officer"].includes(r));

  useEffect(()=>{const t=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(t);},[]);

  // Redirect finance/specialist users to their role-specific desktop
  useEffect(()=>{
    if (!primaryRole || roles.length === 0) return;
    const dest = getDefaultRoute(primaryRole);
    if (dest !== "/dashboard") navigate(dest, {replace:true});
  },[primaryRole, roles.length, navigate]);

  const TILES: Tile[] = [
    {icon:"📋",label:"Requisitions",value:kpi.requisitions,sub:"Total submitted",color:"#7c3aed",path:"/requisitions",roles:["admin","procurement_manager","procurement_officer","requisitioner"]},
    {icon:"🛒",label:"Purchase Orders",value:kpi.pendingPOs,sub:`${fmtK(kpi.totalPOValue)} value`,color:T.primary,path:"/purchase-orders",roles:["admin","procurement_manager","procurement_officer","accountant","finance_manager","finance_officer"]},
    {icon:"📦",label:"Goods Received",value:kpi.grnCount,sub:"GRN records",color:"#059669",path:"/goods-received",roles:["admin","procurement_manager","procurement_officer","warehouse_officer","inventory_manager"]},
    {icon:"🏢",label:"Suppliers",value:kpi.suppliers,sub:"Registered vendors",color:T.accent,path:"/suppliers",roles:["admin","procurement_manager","procurement_officer"]},
    {icon:"💳",label:"Payment Vouchers",value:kpi.vouchers,sub:`${fmtK(kpi.payments)} pending`,color:T.error,path:"/vouchers/payment",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"🧾",label:"Receipt Vouchers",value:kpi.receipts,sub:"Total receipts",color:"#0e7490",path:"/vouchers/receipt",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"📊",label:"Budget",value:`${kpi.budgetTotal>0?((kpi.budgetSpent/kpi.budgetTotal)*100).toFixed(0):0}%`,sub:`${fmtK(kpi.budgetSpent)} of ${fmtK(kpi.budgetTotal)}`,color:T.primary,path:"/financials/budgets",roles:["admin","procurement_manager","accountant","finance_manager","finance_officer"]},
    {icon:"📦",label:"Inventory Items",value:kpi.inventory,sub:"Stock records",color:"#059669",path:"/items",roles:["admin","procurement_manager","inventory_manager","warehouse_officer"]},
    {icon:"📄",label:"Contracts",value:kpi.contracts,sub:"Active contracts",color:T.primary,path:"/contracts",roles:["admin","procurement_manager"]},
    {icon:"🏆",label:"Tenders",value:kpi.tenders,sub:"Total tenders",color:T.accent,path:"/tenders",roles:["admin","procurement_manager","procurement_officer"]},
    {icon:"📈",label:"Reports",value:"→",sub:"Analytics & BI",color:"#7c3aed",path:"/reports",roles:[]},
    {icon:"📁",label:"Documents",value:"→",sub:"File manager",color:"#0e7490",path:"/documents",roles:[]},
  ];

  const visibleTiles = TILES.filter(t=>!t.roles.length||t.roles.some(r=>roles.includes(r)));

  return (
    <div style={{minHeight:"100vh",width:"100%",position:"relative",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",overflow:"hidden auto"}}>

      {/* ══ Full-bleed graded background photo ══ */}
      <div style={{position:"fixed",inset:0,zIndex:0}}>
        {DESK_BG_URL ? (
          <div style={{position:"absolute",inset:0,backgroundImage:`url(${DESK_BG_URL})`,backgroundSize:"cover",backgroundPosition:"center",transform:"scale(1.04)"}}/>
        ) : (
          <div style={{position:"absolute",inset:0,background:`linear-gradient(160deg, ${T.primaryDark} 0%, #1a2452 60%, #0b1030 100%)`}}/>
        )}
        {/* Colour grade tied to the live theme, not a fixed navy */}
        <div style={{position:"absolute",inset:0,background:`linear-gradient(165deg, ${T.primaryDark}e6 0%, rgba(10,14,38,0.72) 45%, rgba(6,9,26,0.88) 100%)`}}/>
        {/* Vignette for depth + text legibility at the edges */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 38%, transparent 0%, transparent 40%, rgba(4,6,20,0.55) 100%)"}}/>
      </div>

      {/* ══ Top bar ══ */}
      <div style={{position:"relative",zIndex:2,display:"flex",alignItems:"center",gap:14,padding:isMobile?"16px 16px 0":"22px 32px 0",flexWrap:"wrap"}}>
        <div style={{width:40,height:40,borderRadius:T.rLg,background:"rgba(255,255,255,0.14)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,border:"1px solid rgba(255,255,255,0.25)"}}>
          <span style={{fontSize:19}}>🏥</span>
        </div>
        <div style={{minWidth:0}}>
          <div style={{color:"#fff",fontWeight:700,fontSize:15,letterSpacing:"-.01em"}}>EL5 MediProcure</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:11}}>Embu Level 5 Hospital · ProcurBosse v11.0</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:99,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",color:"rgba(255,255,255,0.85)",fontSize:11.5}}>
            <Clock size={12}/>{time.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"})}
          </div>
          <button onClick={fetchKPI} title="Refresh"
            style={{width:32,height:32,borderRadius:99,background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.2)",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <RefreshCw size={14} style={loading?{animation:"spin 1s linear infinite"}:{}}/>
          </button>
          <button onClick={signOut} title="Sign out"
            style={{display:"flex",alignItems:"center",gap:6,padding:"7px 13px",borderRadius:99,background:"rgba(220,38,38,0.22)",border:"1px solid rgba(248,113,113,0.4)",cursor:"pointer",color:"#fecaca",fontSize:12,fontWeight:600}}>
            <LogOut size={13}/>{!isMobile&&"Sign out"}
          </button>
        </div>
      </div>

      {/* ══ Hero: greeting + ERP Wheel ══ */}
      <div style={{position:"relative",zIndex:2,display:"flex",flexDirection:"column",alignItems:"center",padding:isMobile?"20px 12px 0":"20px 20px 0",textAlign:"center"}}>
        <div style={{color:"#fff",fontSize:isMobile?22:28,fontWeight:700,letterSpacing:"-.02em",marginBottom:4}}>
          Welcome back, {profile?.full_name?.split(" ")[0]||"User"}
        </div>
        <div style={{color:"rgba(255,255,255,0.65)",fontSize:12.5,marginBottom:isMobile?12:20}}>
          {new Date().toLocaleDateString("en-KE",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})} · Role: {primaryRole?.replace(/_/g," ")}
        </div>

        <ERPWheel size={isMobile?290:460} title="ProcurBosse" subtitle="EL5 MediProcure" roles={roles}
          segments={ERP_WHEEL_SEGMENTS.map(s =>
            s.id === "requisitions" ? { ...s, badge: kpi.requisitions } :
            s.id === "procurement"  ? { ...s, badge: kpi.pendingPOs } :
            s
          )} />
      </div>

      {/* ══ Below the fold: KPI grid + activity/quick-actions, on frosted glass ══ */}
      <div style={{position:"relative",zIndex:2,maxWidth:1200,margin:"22px auto 0",padding:isMobile?"0 12px 24px":"0 32px 40px"}}>

        <div style={glass({ padding:isMobile?14:18, marginBottom:14 })}>
          <div style={{fontSize:11,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>
            {loading?"Loading…":`${visibleTiles.length} modules visible`}
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(auto-fill,minmax(175px,1fr))",gap:isMobile?8:10}}>
            {visibleTiles.map(tile=>(
              <button key={tile.path} onClick={()=>navigate(tile.path)}
                style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"12px 14px",
                  cursor:"pointer",textAlign:"left",fontFamily:"inherit",boxShadow:T.shadow,transition:"all .15s",
                  borderLeft:`3px solid ${tile.color}`}}
                onMouseEnter={e=>{ const el=e.currentTarget as HTMLElement; el.style.boxShadow=T.shadowMd; el.style.transform="translateY(-2px)"; }}
                onMouseLeave={e=>{ const el=e.currentTarget as HTMLElement; el.style.boxShadow=T.shadow; el.style.transform="none"; }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <span style={{fontSize:20}}>{tile.icon}</span>
                </div>
                <div style={{fontSize:9.5,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>{tile.label}</div>
                <div style={{fontSize:19,fontWeight:800,color:tile.color,lineHeight:1,marginBottom:3}}>{loading?"…":tile.value}</div>
                <div style={{fontSize:10.5,color:T.fgDim}}>{tile.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
          {/* Recent activity */}
          <div style={glass({ padding:"14px 16px" })}>
            <div style={{fontWeight:700,fontSize:12.5,color:T.fg,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>Recent Activity</div>
            {activity.length===0
              ? <div style={{fontSize:12,color:T.fgDim,padding:"10px 0"}}>No recent activity</div>
              : activity.map((a,i)=>(
                <div key={i} style={{display:"flex",gap:9,padding:"7px 0",borderBottom:i<activity.length-1?`1px solid ${T.border}`:"none"}}>
                  <span style={{fontSize:14,flexShrink:0}}>📝</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:T.fg,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.action||a.description||"System event"}</div>
                    <div style={{fontSize:10.5,color:T.fgDim}}>{a.created_at?new Date(a.created_at).toLocaleString("en-KE"):"—"}</div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Quick actions */}
          <div style={glass({ padding:"14px 16px" })}>
            <div style={{fontWeight:700,fontSize:12.5,color:T.fg,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>Quick Actions</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[
                ...(isFinance?[{icon:"💰",label:"Open Finance Desktop",path:"/finance-dashboard"},{icon:"💳",label:"New Payment Voucher",path:"/vouchers/payment"},{icon:"🧾",label:"New Receipt Voucher",path:"/vouchers/receipt"}]:[]),
                ...(isProc||isAdmin?[{icon:"📋",label:"New Requisition",path:"/requisitions"},{icon:"🛒",label:"Purchase Orders",path:"/purchase-orders"}]:[]),
                {icon:"📊",label:"View Reports",path:"/reports"},
                {icon:"📁",label:"Documents",path:"/documents"},
                {icon:"📬",label:"Inbox",path:"/inbox"},
                ...(isAdmin?[{icon:"👥",label:"Manage Users",path:"/users"}]:[]),
              ].map((a,i)=>(
                <button key={i} onClick={()=>navigate(a.path)}
                  style={{display:"flex",alignItems:"center",gap:9,padding:"9px 12px",background:T.bg,
                    border:`1px solid ${T.border}`,borderRadius:T.rMd,cursor:"pointer",fontSize:12.5,color:T.fg,
                    textAlign:"left",fontFamily:"inherit"}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.primaryBg}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.bg}>
                  <span style={{fontSize:14}}>{a.icon}</span>
                  <span style={{flex:1}}>{a.label}</span>
                  <span style={{fontSize:11,color:T.fgDim}}>→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
