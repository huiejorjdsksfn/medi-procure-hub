/**
 * ProcurBosse — AppLayout v6.0 (Full Redesign)
 * Dark navy sidebar · Realtime live counts · Image upload in profile
 * Admin full-control banner · All nav buttons live & functional
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";
import FacilitySwitcher from "@/components/FacilitySwitcher";
import SystemBroadcastBanner from "@/components/SystemBroadcastBanner";
import NotificationPopup from "@/components/NotificationPopup";
import logoImg from "@/assets/logo.png";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Shield, FileCheck,
  Database, Gavel, DollarSign, ClipboardList, BookOpen,
  PiggyBank, Layers, Receipt, BookMarked, Calendar, Scale,
  Search, Mail, Activity, Menu, X, UserCircle, ChevronRight,
  Archive, TrendingUp, LayoutDashboard, Eye, AlertTriangle,
  CreditCard, Phone, MessageSquare, Bell, RefreshCw,
  Zap, Globe, Wrench, Terminal, Lock, Home, Server,
  BarChart2, Hash, Cpu, Code2, Radio
} from "lucide-react";

const db = supabase as any;

/* ── Live count hook — polls all key tables ─────────────────────────────── */
function useLiveCounts() {
  const [counts, setCounts] = useState<Record<string,number>>({});

  const fetch = useCallback(async () => {
    try {
      const [reqs, pos, pvs, notifs, lowStock, grn, contracts, tenders] = await Promise.allSettled([
        db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
        db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
        db.from("payment_vouchers").select("id",{count:"exact",head:true}).in("status",["pending","submitted"]),
        db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
        db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        db.from("goods_received").select("id",{count:"exact",head:true}).eq("status","pending"),
        db.from("contracts").select("id",{count:"exact",head:true}).eq("status","active"),
        db.from("tenders").select("id",{count:"exact",head:true}).eq("status","open"),
      ]);
      const v = (r: PromiseSettledResult<any>) =>
        r.status === "fulfilled" ? (r.value.count ?? 0) : 0;
      setCounts({
        requisitions:    v(reqs),
        purchase_orders: v(pos),
        payment_vouchers:v(pvs),
        notifications:   v(notifs),
        low_stock:       v(lowStock),
        goods_received:  v(grn),
        contracts:       v(contracts),
        tenders:         v(tenders),
      });
    } catch {}
  }, []);

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 30_000);
    // Realtime subscription for instant updates
    const ch = db.channel("layout:counts")
      .on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},fetch)
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},fetch)
      .on("postgres_changes",{event:"*",schema:"public",table:"notifications"},fetch)
      .on("postgres_changes",{event:"*",schema:"public",table:"payment_vouchers"},fetch)
      .subscribe();
    return () => { clearInterval(iv); db.removeChannel(ch); };
  }, [fetch]);

  return counts;
}

/* ── Module + nav definitions ───────────────────────────────────────────── */
const MODULES = [
  { id:"procurement", label:"Procurement", icon:ShoppingCart, color:T.procurement,
    roles:["admin","procurement_manager","procurement_officer","requisitioner","inventory_manager","warehouse_officer"],
    sub:[
      {label:"Dashboard",       path:"/dashboard",           icon:LayoutDashboard, count:""},
      {label:"Requisitions",    path:"/requisitions",        icon:ClipboardList,   count:"requisitions"},
      {label:"Purchase Orders", path:"/purchase-orders",     icon:ShoppingCart,    count:"purchase_orders", roles:["admin","procurement_manager","procurement_officer","accountant"]},
      {label:"Goods Received",  path:"/goods-received",      icon:Package,         count:"goods_received",  roles:["admin","procurement_manager","procurement_officer","warehouse_officer","inventory_manager","accountant"]},
      {label:"Suppliers",       path:"/suppliers",           icon:Truck,           count:""},
      {label:"Contracts",       path:"/contracts",           icon:FileCheck,       count:"contracts",       roles:["admin","procurement_manager"]},
      {label:"Tenders",         path:"/tenders",             icon:Gavel,           count:"tenders",         roles:["admin","procurement_manager","procurement_officer"]},
      {label:"Bid Evaluations", path:"/bid-evaluations",     icon:Scale,           count:"",                roles:["admin","procurement_manager"]},
      {label:"Proc. Planning",  path:"/procurement-planning",icon:Calendar,        count:"",                roles:["admin","procurement_manager"]},
    ]},
  { id:"vouchers", label:"Vouchers", icon:Receipt, color:T.vouchers,
    roles:["admin","procurement_manager","procurement_officer","accountant"],
    sub:[
      {label:"Payment Vouchers", path:"/vouchers/payment",  icon:DollarSign,  count:"payment_vouchers"},
      {label:"Receipt Vouchers", path:"/vouchers/receipt",  icon:Receipt,     count:"", roles:["admin","procurement_manager","accountant"]},
      {label:"Journal Vouchers", path:"/vouchers/journal",  icon:BookMarked,  count:"", roles:["admin","procurement_manager","accountant"]},
      {label:"Purchase Vouchers",path:"/vouchers/purchase", icon:FileText,    count:"", roles:["admin","procurement_manager","accountant"]},
      {label:"Sales Vouchers",   path:"/vouchers/sales",    icon:FileText,    count:"", roles:["admin","procurement_manager","accountant"]},
    ]},
  { id:"financials", label:"Financials", icon:TrendingUp, color:T.finance,
    roles:["admin","procurement_manager","accountant"],
    sub:[
      {label:"Finance Dashboard",  path:"/financials/dashboard",         icon:TrendingUp, count:""},
      {label:"Chart of Accounts",  path:"/financials/chart-of-accounts", icon:BookOpen,   count:""},
      {label:"Budgets",            path:"/financials/budgets",           icon:PiggyBank,  count:""},
      {label:"Fixed Assets",       path:"/financials/fixed-assets",      icon:Building2,  count:""},
      {label:"Accountant Workspace",path:"/accountant-workspace",        icon:BarChart2,  count:""},
    ]},
  { id:"inventory", label:"Inventory", icon:Package, color:T.inventory,
    roles:["admin","procurement_manager","procurement_officer","inventory_manager","warehouse_officer"],
    sub:[
      {label:"Items / Stock",  path:"/items",       icon:Package,   count:"low_stock"},
      {label:"Categories",     path:"/categories",  icon:Layers,    count:""},
      {label:"Departments",    path:"/departments", icon:Building2, count:""},
      {label:"Scanner",        path:"/scanner",     icon:Search,    count:""},
    ]},
  { id:"quality", label:"Quality", icon:Shield, color:T.quality,
    roles:["admin","procurement_manager","procurement_officer","inventory_manager"],
    sub:[
      {label:"QC Dashboard",    path:"/quality/dashboard",       icon:Shield,        count:""},
      {label:"Inspections",     path:"/quality/inspections",     icon:Eye,           count:""},
      {label:"Non-Conformance", path:"/quality/non-conformance", icon:AlertTriangle, count:""},
    ]},
  { id:"reports", label:"Reports & BI", icon:BarChart3, color:"#8764b8",
    roles:[],
    sub:[
      {label:"Analytics",   path:"/reports",     icon:BarChart3, count:""},
      {label:"Documents",   path:"/documents",   icon:FileText,  count:""},
      {label:"Audit Log",   path:"/audit-log",   icon:Activity,  count:"", roles:["admin","procurement_manager","accountant"]},
    ]},
  { id:"comms", label:"Comms & Reception", icon:Phone, color:T.comms,
    roles:[],
    sub:[
      {label:"Inbox",      path:"/inbox",      icon:Mail,         count:""},
      {label:"Email",      path:"/email",      icon:Mail,         count:""},
      {label:"SMS",        path:"/sms",        icon:MessageSquare,count:""},
      {label:"Telephony",  path:"/telephony",  icon:Phone,        count:""},
      {label:"Reception",  path:"/reception",  icon:Users,        count:""},
    ]},
  { id:"admin", label:"Administration", icon:Settings, color:"#ca5010",
    roles:["admin","database_admin"],
    sub:[
      {label:"Admin Panel",    path:"/admin/panel",    icon:Settings,      count:""},
      {label:"Users",          path:"/users",          icon:Users,         count:""},
      {label:"Facilities",     path:"/facilities",     icon:Building2,     count:""},
      {label:"Security / IP",  path:"/admin/ip-access",icon:Lock,          count:""},
      {label:"Database",       path:"/admin/database", icon:Database,      count:""},
      {label:"DB Live Monitor",path:"/admin/db-test",  icon:Activity,      count:""},
      {label:"Backup",         path:"/backup",         icon:Archive,       count:""},
      {label:"ODBC / ERP",     path:"/odbc",           icon:Server,        count:""},
      {label:"Webmaster",      path:"/webmaster",      icon:Globe,         count:""},
      {label:"GUI Editor",     path:"/gui-editor",     icon:Code2,         count:""},
      {label:"Settings",       path:"/settings",       icon:Wrench,        count:""},
    ]},
];

/* ── Badge ──────────────────────────────────────────────────────────────── */
const Badge = ({n, color}:{n:number; color:string}) =>
  n > 0 ? (
    <span style={{
      minWidth:18, height:18, borderRadius:9, background:color,
      color:"#fff", fontSize:10, fontWeight:800, lineHeight:"18px",
      textAlign:"center", padding:"0 5px", display:"inline-block",
    }}>{n > 99 ? "99+" : n}</span>
  ) : null;

/* ── Admin control bar ──────────────────────────────────────────────────── */
function AdminBar({onAction}:{onAction:(a:string)=>void}) {
  const actions = [
    {label:"Broadcast",  icon:Radio,    action:"broadcast",  color:"#f59e0b"},
    {label:"Lock System",icon:Lock,     action:"lock",       color:"#ef4444"},
    {label:"DB Monitor", icon:Activity, action:"db_monitor", color:"#22c55e"},
    {label:"All Users",  icon:Users,    action:"users",      color:"#38bdf8"},
    {label:"Settings",   icon:Wrench,   action:"settings",   color:"#a78bfa"},
    {label:"Webmaster",  icon:Globe,    action:"webmaster",  color:"#f97316"},
  ];
  return (
    <div style={{
      background:`linear-gradient(90deg,#1a0505,#2d0808)`,
      borderBottom:`1px solid #ef444433`,
      padding:"6px 16px", display:"flex", alignItems:"center", gap:8,
      flexShrink:0, overflowX:"auto",
    }}>
      <span style={{fontSize:10,fontWeight:800,color:"#ef4444",marginRight:4,whiteSpace:"nowrap",letterSpacing:.08}}>
        ⚡ ADMIN
      </span>
      {actions.map(a => (
        <button key={a.action}
          onClick={() => onAction(a.action)}
          style={{
            display:"flex", alignItems:"center", gap:5,
            padding:"4px 10px", borderRadius:6,
            background:`${a.color}18`, border:`1px solid ${a.color}44`,
            color:a.color, fontSize:11, fontWeight:700, cursor:"pointer",
            whiteSpace:"nowrap", flexShrink:0,
          }}
          onMouseEnter={e=>(e.currentTarget.style.background=`${a.color}30`)}
          onMouseLeave={e=>(e.currentTarget.style.background=`${a.color}18`)}
        >
          <a.icon size={11}/> {a.label}
        </button>
      ))}
    </div>
  );
}

/* ── Main Layout ─────────────────────────────────────────────────────────── */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const loc     = useLocation();
  const nav     = useNavigate();
  const { user, profile, roles, signOut, primaryRole } = useAuth();
  const settings= useSystemSettings();
  const counts  = useLiveCounts();
  const [open, setOpen]   = useState<string|null>(null);
  const [sidebar, setSidebar] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const isAdmin = roles?.includes("admin");
  const isDbAdmin = roles?.includes("database_admin");

  const sysName  = settings.system_name  || "EL5 MediProcure";
  const hospital = settings.hospital_name || "Embu Level 5 Hospital";

  // Auto-open active module
  useEffect(() => {
    const active = MODULES.find(m => m.sub.some(s => loc.pathname.startsWith(s.path)));
    if (active) setOpen(active.id);
  }, [loc.pathname]);

  const hasRole = useCallback((moduleRoles: string[]) => {
    if (!moduleRoles.length) return true;
    if (isAdmin) return true;
    return moduleRoles.some(r => roles?.includes(r));
  }, [roles, isAdmin]);

  const totalAlerts = (counts.requisitions||0) + (counts.purchase_orders||0) + (counts.payment_vouchers||0);

  const handleAdminAction = useCallback((action: string) => {
    switch(action) {
      case "broadcast":  nav("/webmaster"); break;
      case "lock":       nav("/settings"); break;
      case "db_monitor": nav("/admin/db-test"); break;
      case "users":      nav("/users"); break;
      case "settings":   nav("/settings"); break;
      case "webmaster":  nav("/webmaster"); break;
    }
  }, [nav]);

  return (
    <div style={{
      display:"flex", flexDirection:"column", height:"100vh",
      background:T.bg, color:T.fg,
      fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",
      overflow:"hidden",
    }}>
      <SystemBroadcastBanner />

      {/* Admin control bar */}
      {(isAdmin || isDbAdmin) && <AdminBar onAction={handleAdminAction} />}

      <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

        {/* ── SIDEBAR ────────────────────────────────────────────────────── */}
        <div style={{
          width: sidebar ? 240 : 60,
          flexShrink:0,
          background:`linear-gradient(180deg,${T.bg1} 0%,${T.bg2} 100%)`,
          borderRight:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column",
          overflow:"hidden",
          transition:"width .25s cubic-bezier(0.4,0,0.2,1)",
        }}>

          {/* Logo row */}
          <div style={{
            height:56, padding:"0 14px", display:"flex", alignItems:"center",
            gap:10, borderBottom:`1px solid ${T.border}`, flexShrink:0,
          }}>
            <img src={logoImg} alt="ProcurBosse"
              style={{width:32,height:32,borderRadius:8,objectFit:"contain",
                background:T.card, padding:3, flexShrink:0}} />
            {sidebar && (
              <div style={{overflow:"hidden", flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:T.fg,lineHeight:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sysName}</div>
                <div style={{fontSize:9,color:T.fgDim,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{hospital}</div>
              </div>
            )}
            <button onClick={() => setSidebar(s => !s)}
              style={{marginLeft:"auto",background:"transparent",border:"none",cursor:"pointer",color:T.fgDim,padding:4,borderRadius:6,display:"flex",flexShrink:0}}
              onMouseEnter={e=>(e.currentTarget.style.color=T.fg)}
              onMouseLeave={e=>(e.currentTarget.style.color=T.fgDim)}>
              {sidebar ? <X size={15}/> : <Menu size={15}/>}
            </button>
          </div>

          {/* Facility switcher */}
          {sidebar && (
            <div style={{padding:"8px 10px", borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
              <FacilitySwitcher />
            </div>
          )}

          {/* Nav */}
          <div style={{flex:1, overflowY:"auto", padding:"8px 6px"}}>
            {/* Dashboard quick link */}
            <NavItem
              icon={<Home size={15}/>} label="Dashboard" path="/dashboard"
              active={loc.pathname==="/dashboard"} sidebar={sidebar}
              color={T.primary}
            />

            {MODULES.map(mod => {
              if (!hasRole(mod.roles)) return null;
              const isOpen = open === mod.id;
              const modActive = mod.sub.some(s => loc.pathname.startsWith(s.path));
              const modCount = mod.sub.reduce((a, s) => a + (counts[s.count as string] || 0), 0);

              return (
                <div key={mod.id}>
                  {/* Module header */}
                  <button
                    onClick={() => setOpen(isOpen ? null : mod.id)}
                    style={{
                      width:"100%", display:"flex", alignItems:"center", gap:9,
                      padding: sidebar ? "8px 10px" : "8px 12px",
                      background: modActive ? `${mod.color}18` : "transparent",
                      border:"none", borderRadius:8, cursor:"pointer",
                      color: modActive ? mod.color : T.fgMuted,
                      marginBottom:2, transition:"all .15s",
                    }}
                    onMouseEnter={e=>{e.currentTarget.style.background=`${mod.color}15`;e.currentTarget.style.color=T.fg;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=modActive?`${mod.color}18`:"transparent";e.currentTarget.style.color=modActive?mod.color:T.fgMuted;}}
                  >
                    <mod.icon size={16} style={{flexShrink:0}}/>
                    {sidebar && <>
                      <span style={{flex:1,fontSize:12,fontWeight:modActive?700:500,textAlign:"left",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{mod.label}</span>
                      {modCount > 0 && <Badge n={modCount} color={mod.color}/>}
                      <ChevronDown size={12} style={{flexShrink:0,transform:isOpen?"rotate(180deg)":"none",transition:"transform .2s"}}/>
                    </>}
                    {!sidebar && modCount > 0 && (
                      <span style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:mod.color}}/>
                    )}
                  </button>

                  {/* Sub items */}
                  {isOpen && sidebar && mod.sub.map(s => {
                    if (!hasRole((s as any).roles || [])) return null;
                    const cnt = counts[s.count as string] || 0;
                    const isActive = loc.pathname === s.path;
                    return (
                      <Link key={s.path} to={s.path}
                        style={{
                          display:"flex", alignItems:"center", gap:8,
                          padding:"6px 10px 6px 32px",
                          background: isActive ? `${mod.color}22` : "transparent",
                          borderRadius:7, textDecoration:"none",
                          color: isActive ? mod.color : T.fgMuted,
                          fontSize:12, fontWeight: isActive ? 700 : 400,
                          marginBottom:1, transition:"all .12s",
                        }}
                        onMouseEnter={e=>{(e.currentTarget as any).style.background=`${mod.color}12`;(e.currentTarget as any).style.color=T.fg;}}
                        onMouseLeave={e=>{(e.currentTarget as any).style.background=isActive?`${mod.color}22`:"transparent";(e.currentTarget as any).style.color=isActive?mod.color:T.fgMuted;}}
                      >
                        <s.icon size={13} style={{flexShrink:0}}/>
                        <span style={{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.label}</span>
                        {cnt > 0 && <Badge n={cnt} color={isActive ? mod.color : T.warning}/>}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* User footer */}
          <div style={{
            borderTop:`1px solid ${T.border}`, padding:"10px 10px",
            display:"flex", alignItems:"center", gap:9, flexShrink:0,
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0}}/>
            ) : (
              <div style={{width:32,height:32,borderRadius:"50%",background:T.primary,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <UserCircle size={18} color="#fff"/>
              </div>
            )}
            {sidebar && (
              <div style={{flex:1,overflow:"hidden"}}>
                <div style={{fontSize:12,fontWeight:700,color:T.fg,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{profile?.full_name||user?.email?.split("@")[0]||"Staff"}</div>
                <div style={{fontSize:9,color:T.fgDim,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{primaryRole?.replace(/_/g," ")||"Staff"}</div>
              </div>
            )}
            {sidebar && (
              <div style={{display:"flex",gap:2}}>
                <button onClick={() => nav("/profile")} title="Profile"
                  style={{...iconBtn}}><UserCircle size={13}/></button>
                <button onClick={() => {signOut(); nav("/login");}} title="Sign Out"
                  style={{...iconBtn, color:T.error}}><LogOut size={13}/></button>
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>

          {/* Top bar */}
          <div style={{
            height:52, padding:"0 16px", display:"flex", alignItems:"center", gap:10,
            background:T.bg1, borderBottom:`1px solid ${T.border}`, flexShrink:0,
          }}>
            {/* Breadcrumb */}
            <div style={{flex:1, fontSize:12, color:T.fgMuted, display:"flex", alignItems:"center", gap:5}}>
              <Home size={12} color={T.fgDim}/>
              <ChevronRight size={10} color={T.fgDim}/>
              <span style={{color:T.fg, fontWeight:600, textTransform:"capitalize"}}>
                {loc.pathname.split("/").filter(Boolean).join(" › ") || "Dashboard"}
              </span>
            </div>

            {/* Live status indicator */}
            <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:T.success}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:T.success,animation:"pulse 2s infinite",display:"inline-block"}}/>
              Live
            </div>

            {/* Alert pills */}
            {totalAlerts > 0 && (
              <div style={{padding:"3px 10px",borderRadius:20,background:T.warningBg,border:`1px solid ${T.warning}44`,fontSize:10,fontWeight:700,color:T.warning}}>
                {totalAlerts} pending
              </div>
            )}

            {/* Action buttons */}
            <button onClick={() => nav("/reports")} title="Reports"
              style={topBtn}><BarChart3 size={14}/></button>
            <button onClick={() => nav("/settings")} title="Settings"
              style={{...topBtn, display: isAdmin ? "flex" : "none"}}><Settings size={14}/></button>
            <button onClick={() => nav("/admin/db-test")} title="DB Monitor"
              style={{...topBtn, display: (isAdmin||isDbAdmin) ? "flex" : "none"}}><Activity size={14}/></button>

            {/* Notifications */}
            <div style={{position:"relative"}}>
              <button onClick={() => setNotifOpen(p=>!p)} title="Notifications"
                style={{...topBtn, background: notifOpen ? `${T.primary}33` : "transparent", position:"relative"}}>
                <Bell size={14}/>
                {(counts.notifications||0) > 0 && (
                  <span style={{position:"absolute",top:4,right:4,width:7,height:7,borderRadius:"50%",background:T.error}}/>
                )}
              </button>
              {notifOpen && (
                <div style={{position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200}}>
                  <NotificationPopup onClose={() => setNotifOpen(false)}/>
                </div>
              )}
            </div>

            <button onClick={() => nav("/profile")} title="Profile" style={topBtn}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{width:22,height:22,borderRadius:"50%",objectFit:"cover"}}/>
                : <UserCircle size={16}/>
              }
            </button>
          </div>

          {/* Page content */}
          <div style={{flex:1, overflowY:"auto", overflowX:"hidden"}}>
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>
    </div>
  );
}

/* ── Helper sub-components ───────────────────────────────────────────────── */
function NavItem({icon, label, path, active, sidebar, color}: {
  icon: React.ReactNode; label: string; path: string;
  active: boolean; sidebar: boolean; color: string;
}) {
  return (
    <Link to={path} style={{
      display:"flex", alignItems:"center", gap:9,
      padding: sidebar ? "7px 10px" : "7px 12px",
      borderRadius:8, textDecoration:"none",
      background: active ? `${color}22` : "transparent",
      color: active ? color : T.fgMuted,
      fontSize:12, fontWeight: active ? 700 : 500,
      marginBottom:4, transition:"all .12s",
    }}
    onMouseEnter={e=>{(e.currentTarget as any).style.background=`${color}12`;(e.currentTarget as any).style.color=T.fg;}}
    onMouseLeave={e=>{(e.currentTarget as any).style.background=active?`${color}22`:"transparent";(e.currentTarget as any).style.color=active?color:T.fgMuted;}}
    >
      {icon}
      {sidebar && <span>{label}</span>}
    </Link>
  );
}

const iconBtn: React.CSSProperties = {
  background:"transparent", border:"none", cursor:"pointer",
  color:T.fgMuted, padding:5, borderRadius:6, display:"flex", alignItems:"center",
};
const topBtn: React.CSSProperties = {
  background:"transparent", border:"none", cursor:"pointer",
  color:T.fgMuted, padding:"6px 8px", borderRadius:7,
  display:"flex", alignItems:"center", transition:"all .15s",
};

import type React from "react";
