/**
 * ProcurBosse — Dashboard v8.0 NUCLEAR (Microsoft Dynamics 365 Style)
 * Coloured module tiles navigation (Image 4 reference)
 * KPI tiles optional — admin only
 * Role-filtered ERP wheel
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/theme";
import {
  ShoppingCart, Package, DollarSign, Truck, BarChart3,
  Users, FileText, Bell, Phone, MessageSquare, Settings,
  Database, Shield, Globe, Printer, ClipboardList, BookOpen,
  PiggyBank, Layers, Scale, Mail, Activity, Archive,
  Gavel, CheckSquare, Briefcase, RefreshCw, Home, Star,
} from "lucide-react";

const db = supabase as any;

/* Role-to-module mapping */
const ROLE_MODULES: Record<string, string[]> = {
  superadmin:          ["procurement","inventory","finance","quality","comms","reports","system","users","audit"],
  webmaster:           ["procurement","inventory","finance","quality","comms","reports","system","users","audit"],
  admin:               ["procurement","inventory","finance","quality","comms","reports","users","audit"],
  database_admin:      ["system","audit","reports"],
  procurement_manager: ["procurement","inventory","quality","comms","reports","audit"],
  procurement_officer: ["procurement","inventory","quality","comms"],
  inventory_manager:   ["inventory","quality","reports"],
  warehouse_officer:   ["inventory"],
  accountant:          ["finance","reports","audit"],
  requisitioner:       ["procurement"],
};

/* Module definitions — colour-coded D365 tiles */
const MODULES = [
  {
    id:"procurement", label:"Procurement", color:"#0078d4", icon:ShoppingCart,
    sub:[
      { label:"Requisitions",    path:"/requisitions",     icon:ClipboardList },
      { label:"Purchase Orders", path:"/purchase-orders",  icon:ShoppingCart  },
      { label:"Suppliers",       path:"/suppliers",        icon:Briefcase     },
      { label:"Tenders",         path:"/tenders",          icon:Gavel         },
      { label:"Bid Evaluations", path:"/bid-evaluations",  icon:Scale         },
      { label:"Planning",        path:"/procurement-planning", icon:BookOpen  },
      { label:"Contracts",       path:"/contracts",        icon:FileText      },
    ],
  },
  {
    id:"inventory", label:"Inventory", color:"#038387", icon:Package,
    sub:[
      { label:"Items",           path:"/items",            icon:Package       },
      { label:"Categories",      path:"/categories",       icon:Layers        },
      { label:"Goods Received",  path:"/goods-received",   icon:Truck         },
      { label:"Departments",     path:"/departments",      icon:Home          },
      { label:"Scanner",         path:"/scanner",          icon:Activity      },
    ],
  },
  {
    id:"finance", label:"Finance & Accounts", color:"#7719aa", icon:DollarSign,
    sub:[
      { label:"Financial Dashboard", path:"/financials",        icon:BarChart3  },
      { label:"Chart of Accounts",   path:"/chart-of-accounts", icon:BookOpen   },
      { label:"Budgets",             path:"/budgets",            icon:PiggyBank  },
      { label:"Fixed Assets",        path:"/fixed-assets",      icon:Archive    },
      { label:"Payment Vouchers",    path:"/vouchers/payment",   icon:DollarSign },
      { label:"Accountant Workspace",path:"/accountant",        icon:Briefcase  },
    ],
  },
  {
    id:"quality", label:"Quality Control", color:"#498205", icon:CheckSquare,
    sub:[
      { label:"QC Dashboard",    path:"/quality",              icon:Star        },
      { label:"Inspections",     path:"/quality/inspections",  icon:CheckSquare },
      { label:"Non-Conformance", path:"/quality/nc",           icon:Bell        },
    ],
  },
  {
    id:"comms", label:"Communications", color:"#0072c6", icon:Mail,
    sub:[
      { label:"Email / Inbox",   path:"/email",           icon:Mail           },
      { label:"SMS",             path:"/sms",             icon:MessageSquare  },
      { label:"Telephony",       path:"/telephony",       icon:Phone          },
      { label:"Notifications",   path:"/notifications",   icon:Bell           },
      { label:"Documents",       path:"/documents",       icon:FileText       },
    ],
  },
  {
    id:"reports", label:"Reports", color:"#5c2d91", icon:BarChart3,
    sub:[
      { label:"Reports",         path:"/reports",         icon:BarChart3      },
      { label:"Print Engine",    path:"/print-engine",    icon:Printer        },
    ],
  },
  {
    id:"users", label:"Users & Access", color:"#b4009e", icon:Users,
    sub:[
      { label:"Users",           path:"/users",           icon:Users          },
      { label:"IP Access",       path:"/ip-access",       icon:Shield         },
      { label:"Profile",         path:"/profile",         icon:Users          },
    ],
  },
  {
    id:"system", label:"System", color:"#00188f", icon:Settings,
    sub:[
      { label:"Settings",        path:"/settings",        icon:Settings       },
      { label:"Admin Panel",     path:"/admin-panel",     icon:Shield         },
      { label:"Database Admin",  path:"/admin/database",  icon:Database       },
      { label:"Backup",          path:"/backup",          icon:Archive        },
      { label:"Webmaster",       path:"/webmaster",       icon:Globe          },
      { label:"GUI Editor",      path:"/gui-editor",      icon:Activity       },
      { label:"ODBC",            path:"/odbc",            icon:Database       },
    ],
  },
  {
    id:"audit", label:"Audit", color:"#d83b01", icon:FileText,
    sub:[
      { label:"Audit Log",       path:"/audit-log",       icon:FileText       },
      { label:"Reception",       path:"/reception",       icon:Activity       },
      { label:"Facilities",      path:"/facilities",      icon:Home           },
    ],
  },
];

/* KPI Card (admin only) */
function KpiCard({ label, value, color, icon: Icon }: { label:string; value:number|string; color:string; icon:any }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, boxShadow:T.shadow }}>
      <div style={{ width:44, height:44, borderRadius:T.rMd, background:`${color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize:24, fontWeight:800, color, lineHeight:1 }}>{typeof value==="number"?value.toLocaleString():value}</div>
        <div style={{ fontSize:12, color:T.fgMuted, marginTop:3, fontWeight:500 }}>{label}</div>
      </div>
    </div>
  );
}

/* Module tile (D365 coloured tile) */
function ModuleTile({ mod, onClick }: { mod:typeof MODULES[0]; onClick:(m:typeof MODULES[0])=>void }) {
  const [hov, setHov] = useState(false);
  const Icon = mod.icon;
  return (
    <div
      onClick={() => onClick(mod)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? mod.color : `${mod.color}ee`,
        color:"#fff", borderRadius:T.rMd, padding:"22px 18px",
        cursor:"pointer", transition:"all .18s",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? `0 8px 28px ${mod.color}44` : "0 2px 8px rgba(0,0,0,0.12)",
        display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
        gap:10, minHeight:110, textAlign:"center",
        userSelect:"none",
      }}
    >
      <Icon size={28} strokeWidth={1.8} />
      <div style={{ fontSize:13, fontWeight:700, lineHeight:1.25 }}>{mod.label}</div>
      <div style={{ fontSize:10, opacity:.75 }}>{mod.sub.length} areas</div>
    </div>
  );
}

/* Sub-item row */
function SubItem({ item, onClick }: { item:{label:string;path:string;icon:any}; onClick:(p:string)=>void }) {
  const [hov, setHov] = useState(false);
  const Icon = item.icon;
  return (
    <div
      onClick={() => onClick(item.path)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 14px", borderRadius:T.r, cursor:"pointer",
        background: hov ? T.primaryBg : "transparent",
        transition:"background .12s",
      }}
    >
      <Icon size={15} color={hov ? T.primary : T.fgMuted} />
      <span style={{ fontSize:13, color: hov ? T.primary : T.fg, fontWeight: hov ? 600 : 400 }}>{item.label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { user, profile, primaryRole, hasRole } = useAuth();
  const nav = useNavigate();
  const [kpi, setKpi] = useState({ req:0, po:0, items:0, suppliers:0, notifications:0, lowstock:0 });
  const [selectedMod, setSelectedMod] = useState<typeof MODULES[0]|null>(null);
  const [time, setTime] = useState(new Date());

  const isAdmin = hasRole("admin","superadmin","webmaster");

  /* Allowed modules for role */
  const allowed = ROLE_MODULES[primaryRole] || ROLE_MODULES["requisitioner"];
  const visibleMods = MODULES.filter(m => allowed.includes(m.id));

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);

  /* Load KPIs if admin */
  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const [r,p,i,s,n,ls] = await Promise.allSettled([
          db.from("requisitions").select("id",{count:"exact",head:true}).in("status",["submitted","pending"]),
          db.from("purchase_orders").select("id",{count:"exact",head:true}).in("status",["pending","approved"]),
          db.from("items").select("id",{count:"exact",head:true}),
          db.from("suppliers").select("id",{count:"exact",head:true}).eq("status","active"),
          db.from("notifications").select("id",{count:"exact",head:true}).eq("is_read",false),
          db.from("items").select("id",{count:"exact",head:true}).lt("current_quantity",5),
        ]);
        const v=(x:any)=>x.status==="fulfilled"?x.value?.count??0:0;
        setKpi({ req:v(r), po:v(p), items:v(i), suppliers:v(s), notifications:v(n), lowstock:v(ls) });
      } catch {}
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, [isAdmin]);

  const displayName = profile?.full_name || profile?.display_name || user?.email?.split("@")[0] || "User";
  const roleLabel = primaryRole.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

  return (
    <div style={{ background:T.bg, minHeight:"100vh", fontFamily:"'Segoe UI','Inter',system-ui,sans-serif" }}>

      {/* D365-style page header */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${T.border}`, padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <Home size={18} color={T.primary} />
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:T.fg }}>Home Dashboard</div>
            <div style={{ fontSize:11, color:T.fgDim }}>
              {time.toLocaleDateString("en-KE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:600, color:T.fg }}>{displayName}</div>
            <div style={{ fontSize:11, color:T.primary, fontWeight:500 }}>{roleLabel}</div>
          </div>
          <button onClick={() => { db.from("requisitions").select("id",{count:"exact",head:true}); window.location.reload(); }}
            style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:T.r, padding:"5px 8px", cursor:"pointer", color:T.fgMuted, display:"flex", alignItems:"center" }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div style={{ padding:"24px 28px" }}>

        {/* KPI Row — admin only */}
        {isAdmin && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.fgMuted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:12 }}>
              Live Overview
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))", gap:12 }}>
              <KpiCard label="Pending Requisitions" value={kpi.req} color={T.primary} icon={ClipboardList} />
              <KpiCard label="Active Purchase Orders" value={kpi.po} color="#7719aa" icon={ShoppingCart} />
              <KpiCard label="Total Items" value={kpi.items} color="#038387" icon={Package} />
              <KpiCard label="Active Suppliers" value={kpi.suppliers} color="#498205" icon={Briefcase} />
              <KpiCard label="Unread Notifications" value={kpi.notifications} color="#d83b01" icon={Bell} />
              <KpiCard label="Low Stock Alerts" value={kpi.lowstock} color="#c19c00" icon={Star} />
            </div>
          </div>
        )}

        {/* Module tiles — main D365 nav */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12, fontWeight:600, color:T.fgMuted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:12 }}>
            My Modules — {roleLabel}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12 }}>
            {visibleMods.map(m => (
              <ModuleTile key={m.id} mod={m} onClick={setSelectedMod} />
            ))}
          </div>
        </div>

        {/* Selected module sub-panel */}
        {selectedMod && (
          <div style={{ background:"#fff", border:`1.5px solid ${selectedMod.color}33`, borderRadius:T.rLg, boxShadow:`0 2px 16px ${selectedMod.color}18`, overflow:"hidden" }}>
            <div style={{ background:`${selectedMod.color}`, padding:"12px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <selectedMod.icon size={18} color="#fff" />
                <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>{selectedMod.label}</span>
              </div>
              <button onClick={() => setSelectedMod(null)} style={{ background:"rgba(255,255,255,0.2)", border:"none", color:"#fff", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontSize:12, fontWeight:600 }}>
                Close ✕
              </button>
            </div>
            <div style={{ padding:"12px 8px", display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:4 }}>
              {selectedMod.sub.map(s => (
                <SubItem key={s.path} item={s} onClick={p => nav(p)} />
              ))}
            </div>
          </div>
        )}

        {/* Quick actions */}
        {!selectedMod && (
          <div style={{ marginTop:8 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.fgMuted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:12 }}>
              Quick Actions
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
              {[
                { label:"New Requisition", path:"/requisitions", color:T.primary },
                { label:"Check Inventory", path:"/items", color:"#038387" },
                { label:"View Notifications", path:"/notifications", color:"#d83b01" },
                ...(isAdmin ? [
                  { label:"User Management", path:"/users", color:"#b4009e" },
                  { label:"Audit Log", path:"/audit-log", color:"#5c2d91" },
                  { label:"System Settings", path:"/settings", color:"#00188f" },
                ] : []),
              ].map(a => (
                <button key={a.path} onClick={() => nav(a.path)} style={{
                  background:`${a.color}12`, color:a.color, border:`1px solid ${a.color}30`,
                  borderRadius:T.r, padding:"8px 16px", fontSize:13, fontWeight:600,
                  cursor:"pointer", transition:"all .12s",
                }}
                  onMouseEnter={e=>{(e.currentTarget as any).style.background=`${a.color}22`;}}
                  onMouseLeave={e=>{(e.currentTarget as any).style.background=`${a.color}12`;}}
                >{a.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
