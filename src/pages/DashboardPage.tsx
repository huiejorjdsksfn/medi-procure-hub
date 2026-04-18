/**
 * ProcurBosse — Dashboard v10.0 NUCLEAR
 * D365/CRM style (Image 4) — colored module tiles + ERP wheel by role
 * No analytics charts, optional KPI tiles from admin
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { logAction } from "@/hooks/useSessionTracker";
import logoImg from "@/assets/logo.png";
import embuLogo from "@/assets/embu-county-logo.jpg";

const db = supabase as any;

// ── Module tiles (D365 CRM style - Image 4) ───────────────────────
const ALL_MODULES = [
  { id:"procurement",  label:"Procurement",       color:"#0078d4", icon:"🛒",  path:"/requisitions",     roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner"] },
  { id:"finance",      label:"Finance",            color:"#7719aa", icon:"💳",  path:"/financials/dashboard", roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"inventory",    label:"Inventory",          color:"#038387", icon:"📦",  path:"/items",            roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"] },
  { id:"quality",      label:"Quality Control",    color:"#498205", icon:"✅",  path:"/quality/dashboard",roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","inventory_manager"] },
  { id:"suppliers",    label:"Suppliers",          color:"#c45911", icon:"🏢",  path:"/suppliers",        roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer"] },
  { id:"tenders",      label:"Tenders",            color:"#8764b8", icon:"📄",  path:"/tenders",          roles:["admin","superadmin","webmaster","procurement_manager"] },
  { id:"reports",      label:"Reports & BI",       color:"#5c2d91", icon:"📊",  path:"/reports",          roles:["admin","superadmin","webmaster","procurement_manager","accountant","inventory_manager"] },
  { id:"comms",        label:"Communications",     color:"#0369a1", icon:"📱",  path:"/sms",              roles:["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner"] },
  { id:"users",        label:"User Management",    color:"#059669", icon:"👥",  path:"/users",            roles:["admin","superadmin","webmaster","database_admin"] },
  { id:"settings",     label:"Settings",           color:"#374151", icon:"⚙️",  path:"/settings",         roles:["admin","superadmin","webmaster"] },
  { id:"audit",        label:"Audit Log",          color:"#92400e", icon:"📋",  path:"/audit-log",        roles:["admin","superadmin","webmaster","procurement_manager","accountant"] },
  { id:"database",     label:"Database Admin",     color:"#1e40af", icon:"🗄️",  path:"/admin/db-test",   roles:["admin","superadmin","webmaster","database_admin"] },
];

// KPI tiles
interface KPI { reqs:number; pos:number; pvs:number; lowStock:number; suppliers:number; }

export default function DashboardPage() {
  const { user, profile, roles, primaryRole, signOut } = useAuth();
  const { get } = useSystemSettings();
  const nav = useNavigate();
  const [kpi, setKpi] = useState<KPI>({ reqs:0, pos:0, pvs:0, lowStock:0, suppliers:0 });
  const [kpiLoaded, setKpiLoaded] = useState(false);
  const [time, setTime] = useState(new Date());
  const hospitalName = get("hospital_name", "Embu Level 5 Hospital");

  // Clock
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // Load KPIs
  const loadKpi = useCallback(async () => {
    try {
      const [r,p,pv,ls,s] = await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
      ]);
      const v = (x:any) => x.status==="fulfilled"?x.value?.count??0:0;
      setKpi({ reqs:v(r), pos:v(p), pvs:v(pv), lowStock:v(ls), suppliers:v(s) });
      setKpiLoaded(true);
    } catch {}
  }, []);

  useEffect(() => { loadKpi(); const t = setInterval(loadKpi,60000); return ()=>clearInterval(t); }, [loadKpi]);

  // Filter modules by role
  const visibleMods = ALL_MODULES.filter(m => 
    roles.some(r => ["superadmin","webmaster","admin"].includes(r)) || m.roles.some(r => roles.includes(r))
  );

  const goTo = (path:string, label:string) => { logAction("navigate", label); nav(path); };
  const greeting = () => { const h=time.getHours(); return h<12?"Good morning":h<17?"Good afternoon":"Good evening"; };
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";

  const KpiTile = ({ label,val,color,icon,path }:{label:string;val:number;color:string;icon:string;path:string}) => (
    <button onClick={()=>nav(path)} style={{
      background:"#fff", border:"1px solid #e5e9ef", borderRadius:8, padding:"14px 16px",
      cursor:"pointer", textAlign:"left", flex:1, minWidth:130,
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)", transition:"all 0.15s",
    }}
      onMouseOver={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 4px 12px rgba(0,0,0,0.12)";(e.currentTarget as HTMLElement).style.transform="translateY(-1px)";}}
      onMouseOut={e=>{(e.currentTarget as HTMLElement).style.boxShadow="0 1px 4px rgba(0,0,0,0.06)";(e.currentTarget as HTMLElement).style.transform="none";}}>
      <div style={{ fontSize:10, color:"#6b7280", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:28, fontWeight:900, color, lineHeight:1 }}>{kpiLoaded?val:"…"}</div>
      <div style={{ fontSize:18, marginTop:6 }}>{icon}</div>
    </button>
  );

  const ModTile = ({ mod }:{mod:typeof ALL_MODULES[0]}) => (
    <button onClick={()=>goTo(mod.path,mod.label)} style={{
      background: mod.color, borderRadius:10, padding:"22px 16px",
      cursor:"pointer", border:"none", color:"#fff", textAlign:"left",
      boxShadow:`0 4px 16px ${mod.color}44`,
      transition:"all 0.18s", position:"relative", overflow:"hidden",
      minHeight:100,
    }}
      onMouseOver={e=>{(e.currentTarget as HTMLElement).style.transform="translateY(-3px)";(e.currentTarget as HTMLElement).style.boxShadow=`0 8px 24px ${mod.color}66`;}}
      onMouseOut={e=>{(e.currentTarget as HTMLElement).style.transform="none";(e.currentTarget as HTMLElement).style.boxShadow=`0 4px 16px ${mod.color}44`;}}>
      <div style={{ position:"absolute", right:-10, bottom:-10, fontSize:48, opacity:0.15, lineHeight:1 }}>{mod.icon}</div>
      <div style={{ fontSize:22, marginBottom:8 }}>{mod.icon}</div>
      <div style={{ fontSize:13, fontWeight:800, lineHeight:1.2 }}>{mod.label}</div>
    </button>
  );

  return (
    <div style={{ background:"#f0f2f5", minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      {/* Top ribbon - D365 style */}
      <div style={{ background:"#0078d4", padding:"0 24px", display:"flex", alignItems:"center", height:52, gap:16, boxShadow:"0 2px 8px rgba(0,120,212,0.4)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src={logoImg} alt="" onError={e=>{(e.target as HTMLImageElement).style.display="none"}} style={{ width:28, height:28, borderRadius:6, objectFit:"contain" }}/>
          <div style={{ fontSize:15, fontWeight:900, color:"#fff", letterSpacing:"-0.01em" }}>EL5 MediProcure</div>
        </div>
        <div style={{ height:20, width:1, background:"rgba(255,255,255,0.3)", margin:"0 4px" }}/>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>ProcurBosse ERP</div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", fontFamily:"monospace" }}>
            {time.toLocaleString("en-KE",{weekday:"short",hour:"2-digit",minute:"2-digit",second:"2-digit"})}
          </div>
          <button onClick={()=>nav("/notifications")} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:6, color:"#fff", padding:"5px 10px", cursor:"pointer", fontSize:13 }}>🔔</button>
          <button onClick={()=>nav("/email")} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:6, color:"#fff", padding:"5px 10px", cursor:"pointer", fontSize:13 }}>✉</button>
          <button onClick={()=>nav("/profile")} style={{ background:"rgba(255,255,255,0.15)", border:"none", borderRadius:6, color:"#fff", padding:"5px 10px", cursor:"pointer", fontSize:13 }}>👤 {displayName.split(" ")[0]}</button>
          <button onClick={()=>{signOut();nav("/login");}} style={{ background:"rgba(255,0,0,0.2)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, color:"#fff", padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ padding:"24px 28px" }}>
        {/* Header row */}
        <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11, color:"#6b7280", fontWeight:600, letterSpacing:"0.07em", textTransform:"uppercase" as const, marginBottom:4 }}>
              {primaryRole.replace(/_/g," ")} · {hospitalName}
            </div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#1a1a2e", margin:0, lineHeight:1 }}>
              {greeting()}, {displayName.split(" ")[0]} 👋
            </h1>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <img src={embuLogo} alt="" onError={e=>{(e.target as HTMLImageElement).style.display="none"}} style={{ height:40, borderRadius:6, objectFit:"contain" }}/>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" as const }}>
          <KpiTile label="Pending Reqs"    val={kpi.reqs}      color="#f59e0b" icon="📋" path="/requisitions"/>
          <KpiTile label="Open POs"        val={kpi.pos}       color="#0078d4" icon="🛒" path="/purchase-orders"/>
          <KpiTile label="Vouchers Due"    val={kpi.pvs}       color="#7719aa" icon="💳" path="/vouchers/payment"/>
          <KpiTile label="Low Stock"       val={kpi.lowStock}  color="#dc2626" icon="⚠️" path="/items"/>
          <KpiTile label="Active Suppliers" val={kpi.suppliers} color="#059669" icon="🏢" path="/suppliers"/>
        </div>

        {/* Module tiles — D365 CRM style (Image 4) */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#6b7280", letterSpacing:"0.07em", textTransform:"uppercase" as const, marginBottom:12 }}>Your Modules</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:12 }}>
            {visibleMods.map(m => <ModTile key={m.id} mod={m}/>)}
          </div>
        </div>

        {/* Quick access row */}
        <div style={{ marginTop:24, background:"#fff", borderRadius:10, border:"1px solid #e5e9ef", padding:"16px 20px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:12 }}>Quick Access</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const }}>
            {[
              {label:"New Requisition",  path:"/requisitions",        color:"#0078d4"},
              {label:"Purchase Orders",  path:"/purchase-orders",     color:"#7719aa"},
              {label:"Goods Received",   path:"/goods-received",      color:"#038387"},
              {label:"Send SMS",         path:"/sms",                 color:"#0369a1"},
              {label:"Print Engine",     path:"/print-engine",        color:"#5c2d91"},
              {label:"Audit Log",        path:"/audit-log",           color:"#92400e"},
            ].filter(item => {
              // Show based on role
              const roleMap: Record<string,string[]> = {
                "/requisitions":    ["admin","superadmin","webmaster","procurement_manager","procurement_officer","requisitioner","warehouse_officer","inventory_manager"],
                "/purchase-orders": ["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant"],
                "/goods-received":  ["admin","superadmin","webmaster","procurement_manager","procurement_officer","warehouse_officer","inventory_manager","accountant"],
                "/sms":             ["admin","superadmin","webmaster","procurement_manager","procurement_officer","accountant","inventory_manager","warehouse_officer","requisitioner"],
                "/print-engine":    ["admin","superadmin","webmaster","procurement_manager","accountant","inventory_manager"],
                "/audit-log":       ["admin","superadmin","webmaster","procurement_manager","accountant"],
              };
              const allowed = roleMap[item.path] || [];
              return roles.some(r=>["superadmin","webmaster","admin"].includes(r)) || allowed.some(r=>roles.includes(r));
            }).map(item=>(
              <button key={item.path} onClick={()=>nav(item.path)} style={{
                background:item.color, color:"#fff", border:"none", borderRadius:8,
                padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
              }}>{item.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
