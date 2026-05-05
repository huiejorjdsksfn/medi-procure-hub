/**
 * DashboardPage v4.0 — ProcurBosse Pro
 * Full admin dashboard: ERP Wheel, live stats, activity feed,
 * print, offline DB indicator, all roles, quick actions grid
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ERPWheelButton from "@/components/ERPWheelButton";
import procBg from "@/assets/procurement-bg.jpg";
import logoImg from "@/assets/logo.png";
import {
  ShoppingCart, Package, Truck, Gavel, DollarSign, BarChart3,
  ClipboardList, Shield, Mail, Settings, Users, FileText,
  Calendar, FileCheck, Search, Database, TrendingUp,
  Activity, Archive, Receipt, Scale, Building2, PiggyBank,
  Layers, Globe, BookMarked, Cpu, Eye, Server,
  Printer, Wifi, WifiOff, RefreshCw, Bell, ChevronRight,
  Lock, UserCheck, Clock, CheckCircle, AlertCircle, Info,
  Zap, LayoutGrid, List
} from "lucide-react";

// ─── Per-role quick actions ────────────────────────────────────────────────
const QUICK: Record<string, { label: string; path: string; icon: any; color: string; desc: string }[]> = {
  admin: [
    { label:"Requisitions",     path:"/requisitions",            icon:ClipboardList, color:"#0078d4", desc:"Manage requisitions" },
    { label:"Purchase Orders",  path:"/purchase-orders",         icon:ShoppingCart,  color:"#C45911", desc:"Review & approve POs" },
    { label:"Receive Goods",    path:"/goods-received",          icon:Package,       color:"#107c10", desc:"Record GRNs" },
    { label:"Payment Vouchers", path:"/vouchers/payment",        icon:DollarSign,    color:"#5C2D91", desc:"Process payments" },
    { label:"New Tender",       path:"/tenders",                 icon:Gavel,         color:"#1F6090", desc:"Launch tender" },
    { label:"Suppliers",        path:"/suppliers",               icon:Truck,         color:"#374151", desc:"Supplier directory" },
    { label:"Inventory",        path:"/items",                   icon:Package,       color:"#00695C", desc:"Stock levels" },
    { label:"Reports",          path:"/reports",                 icon:BarChart3,     color:"#9333ea", desc:"Analytics" },
    { label:"Finance",          path:"/financials/dashboard",    icon:TrendingUp,    color:"#0369a1", desc:"Financial overview" },
    { label:"Quality Control",  path:"/quality/dashboard",       icon:Shield,        color:"#059669", desc:"QC inspections" },
    { label:"Email",            path:"/email",                   icon:Mail,          color:"#c0185a", desc:"Messaging" },
    { label:"Contracts",        path:"/contracts",               icon:FileCheck,     color:"#1a3a6b", desc:"Contract management" },
    { label:"Bid Evaluations",  path:"/bid-evaluations",         icon:Scale,         color:"#581c87", desc:"Evaluate bids" },
    { label:"Proc. Planning",   path:"/procurement-planning",    icon:Calendar,      color:"#065f46", desc:"Annual planning" },
    { label:"Documents",        path:"/documents",               icon:FileText,      color:"#92400e", desc:"Templates & docs" },
    { label:"Scanner",          path:"/scanner",                 icon:Search,        color:"#0e7490", desc:"Barcode scanner" },
    { label:"Audit Log",        path:"/audit-log",               icon:Activity,      color:"#78350f", desc:"Activity trail" },
    { label:"User Management",  path:"/users",                   icon:Users,         color:"#4b4b9b", desc:"Manage users" },
    { label:"Database",         path:"/admin/database",          icon:Database,      color:"#1e3a5f", desc:"DB admin" },
    { label:"Budgets",          path:"/financials/budgets",      icon:PiggyBank,     color:"#b45309", desc:"Budget management" },
    { label:"Fixed Assets",     path:"/financials/fixed-assets", icon:Building2,     color:"#1e40af", desc:"Asset register" },
    { label:"Settings",         path:"/settings",                icon:Settings,      color:"#6b7280", desc:"System config" },
    { label:"Backup",           path:"/backup",                  icon:Archive,       color:"#374151", desc:"Backup & restore" },
    { label:"Admin Panel",      path:"/admin/panel",             icon:Settings,      color:"#0a2558", desc:"Administration" },
    { label:"Print Engine",     path:"/print-engine",            icon:Printer,       color:"#166534", desc:"Print management" },
    { label:"Accountant WS",    path:"/accountant",              icon:BookMarked,    color:"#10b981", desc:"Accountant workspace" },
    { label:"Facilities",       path:"/facilities",              icon:Building2,     color:"#7c3aed", desc:"Facility management" },
    { label:"ODBC Setup",       path:"/odbc",                    icon:Cpu,           color:"#44403c", desc:"Offline DB setup" },
    { label:"SMS",              path:"/sms",                     icon:Bell,          color:"#0891b2", desc:"SMS notifications" },
    { label:"Reception",        path:"/reception",               icon:UserCheck,     color:"#d97706", desc:"Reception desk" },
  ],
  database_admin: [
    { label:"Database",         path:"/admin/database", icon:Database,  color:"#1e3a5f", desc:"DB admin" },
    { label:"Backup",           path:"/backup",         icon:Archive,   color:"#374151", desc:"Backup & restore" },
    { label:"ODBC Setup",       path:"/odbc",           icon:Cpu,       color:"#44403c", desc:"Offline DB setup" },
    { label:"DB Test",          path:"/db-test",        icon:Server,    color:"#0e7490", desc:"Database tests" },
    { label:"Audit Log",        path:"/audit-log",      icon:Activity,  color:"#78350f", desc:"Activity trail" },
    { label:"Email",            path:"/email",          icon:Mail,      color:"#c0185a", desc:"Email" },
  ],
  procurement_manager: [
    { label:"Requisitions",     path:"/requisitions",            icon:ClipboardList, color:"#0078d4", desc:"Create requisition" },
    { label:"Purchase Orders",  path:"/purchase-orders",         icon:ShoppingCart,  color:"#C45911", desc:"Approve POs" },
    { label:"Receive Goods",    path:"/goods-received",          icon:Package,       color:"#107c10", desc:"Record GRNs" },
    { label:"Payment Vouchers", path:"/vouchers/payment",        icon:DollarSign,    color:"#5C2D91", desc:"Process payments" },
    { label:"New Tender",       path:"/tenders",                 icon:Gavel,         color:"#1F6090", desc:"Launch tender" },
    { label:"Suppliers",        path:"/suppliers",               icon:Truck,         color:"#374151", desc:"Suppliers" },
    { label:"Contracts",        path:"/contracts",               icon:FileCheck,     color:"#1a3a6b", desc:"Contracts" },
    { label:"Reports",          path:"/reports",                 icon:BarChart3,     color:"#9333ea", desc:"Reports" },
    { label:"Proc. Planning",   path:"/procurement-planning",    icon:Calendar,      color:"#065f46", desc:"Planning" },
    { label:"Bid Evaluations",  path:"/bid-evaluations",         icon:Scale,         color:"#581c87", desc:"Bids" },
    { label:"Finance",          path:"/financials/dashboard",    icon:TrendingUp,    color:"#0369a1", desc:"Financials" },
    { label:"Quality Control",  path:"/quality/dashboard",       icon:Shield,        color:"#059669", desc:"QC" },
    { label:"Email",            path:"/email",                   icon:Mail,          color:"#c0185a", desc:"Email" },
    { label:"Documents",        path:"/documents",               icon:FileText,      color:"#92400e", desc:"Documents" },
    { label:"Inventory",        path:"/items",                   icon:Package,       color:"#00695C", desc:"Stock" },
    { label:"Budgets",          path:"/financials/budgets",      icon:PiggyBank,     color:"#b45309", desc:"Budgets" },
    { label:"Accountant WS",    path:"/accountant",              icon:BookMarked,    color:"#10b981", desc:"Finance workspace" },
  ],
  procurement_officer: [
    { label:"Requisitions",     path:"/requisitions",     icon:ClipboardList, color:"#0078d4", desc:"Requisitions" },
    { label:"Purchase Orders",  path:"/purchase-orders",  icon:ShoppingCart,  color:"#C45911", desc:"POs" },
    { label:"Receive Goods",    path:"/goods-received",   icon:Package,       color:"#107c10", desc:"GRNs" },
    { label:"Payment Vouchers", path:"/vouchers/payment", icon:DollarSign,    color:"#5C2D91", desc:"Payments" },
    { label:"Tenders",          path:"/tenders",          icon:Gavel,         color:"#1F6090", desc:"Tenders" },
    { label:"Suppliers",        path:"/suppliers",        icon:Truck,         color:"#374151", desc:"Suppliers" },
    { label:"Documents",        path:"/documents",        icon:FileText,      color:"#92400e", desc:"Documents" },
    { label:"Email",            path:"/email",            icon:Mail,          color:"#c0185a", desc:"Email" },
    { label:"Reports",          path:"/reports",          icon:BarChart3,     color:"#9333ea", desc:"Reports" },
    { label:"Inventory",        path:"/items",            icon:Package,       color:"#00695C", desc:"Inventory" },
  ],
  inventory_manager: [
    { label:"Items / Stock",    path:"/items",               icon:Package,       color:"#107c10", desc:"Inventory" },
    { label:"Scanner",          path:"/scanner",             icon:Search,        color:"#0e7490", desc:"Scanner" },
    { label:"Categories",       path:"/categories",          icon:Layers,        color:"#374151", desc:"Categories" },
    { label:"Departments",      path:"/departments",         icon:Building2,     color:"#1a3a6b", desc:"Departments" },
    { label:"Quality Control",  path:"/quality/dashboard",   icon:Shield,        color:"#059669", desc:"QC" },
    { label:"Requisitions",     path:"/requisitions",        icon:ClipboardList, color:"#0078d4", desc:"Requisitions" },
    { label:"Email",            path:"/email",               icon:Mail,          color:"#c0185a", desc:"Email" },
    { label:"Documents",        path:"/documents",           icon:FileText,      color:"#92400e", desc:"Docs" },
  ],
  warehouse_officer: [
    { label:"Receive Goods",    path:"/goods-received",      icon:Package,       color:"#107c10", desc:"GRNs" },
    { label:"Items / Stock",    path:"/items",               icon:Package,       color:"#00695C", desc:"Inventory" },
    { label:"Scanner",          path:"/scanner",             icon:Search,        color:"#0e7490", desc:"Scanner" },
    { label:"Quality Control",  path:"/quality/dashboard",   icon:Shield,        color:"#059669", desc:"QC" },
    { label:"Requisitions",     path:"/requisitions",        icon:ClipboardList, color:"#0078d4", desc:"Requisitions" },
    { label:"Email",            path:"/email",               icon:Mail,          color:"#c0185a", desc:"Email" },
  ],
  accountant: [
    { label:"Accountant WS",    path:"/accountant",              icon:BookMarked,    color:"#10b981", desc:"My workspace" },
    { label:"Payment Vouchers", path:"/vouchers/payment",        icon:DollarSign,    color:"#5C2D91", desc:"Payments" },
    { label:"Receipt Vouchers", path:"/vouchers/receipt",        icon:Receipt,       color:"#059669", desc:"Receipts" },
    { label:"Journal Vouchers", path:"/vouchers/journal",        icon:BookMarked,    color:"#0369a1", desc:"Journals" },
    { label:"Finance Dashboard",path:"/financials/dashboard",    icon:TrendingUp,    color:"#0078d4", desc:"Financial overview" },
    { label:"Chart of Accounts",path:"/financials/chart-of-accounts", icon:Layers,  color:"#1a3a6b", desc:"Accounts" },
    { label:"Budgets",          path:"/financials/budgets",      icon:PiggyBank,     color:"#b45309", desc:"Budgets" },
    { label:"Reports",          path:"/reports",                 icon:BarChart3,     color:"#9333ea", desc:"Reports" },
    { label:"Email",            path:"/email",                   icon:Mail,          color:"#c0185a", desc:"Email" },
    { label:"Documents",        path:"/documents",               icon:FileText,      color:"#92400e", desc:"Docs" },
  ],
  reception: [
    { label:"Reception Desk",   path:"/reception",    icon:UserCheck,     color:"#d97706", desc:"Reception" },
    { label:"Email",            path:"/email",        icon:Mail,          color:"#c0185a", desc:"Email" },
    { label:"Documents",        path:"/documents",    icon:FileText,      color:"#92400e", desc:"Docs" },
    { label:"Notifications",    path:"/notifications",icon:Bell,          color:"#0891b2", desc:"Notifications" },
  ],
  requisitioner: [
    { label:"New Requisition",  path:"/requisitions", icon:ClipboardList, color:"#0078d4", desc:"Create requisition" },
    { label:"Email",            path:"/email",        icon:Mail,          color:"#c0185a", desc:"Email" },
    { label:"Documents",        path:"/documents",    icon:FileText,      color:"#92400e", desc:"Documents" },
  ],
};

// ─── All roles activated ────────────────────────────────────────────────────
const ALL_ROLES = [
  { role:"admin",               label:"Administrator",    color:"#dc2626", icon:"🛡️" },
  { role:"database_admin",      label:"Database Admin",   color:"#1e3a5f", icon:"🗄️" },
  { role:"procurement_manager", label:"Proc. Manager",    color:"#0078d4", icon:"🛒" },
  { role:"procurement_officer", label:"Proc. Officer",    color:"#0891b2", icon:"📋" },
  { role:"inventory_manager",   label:"Inventory Mgr",   color:"#059669", icon:"📦" },
  { role:"warehouse_officer",   label:"Warehouse",        color:"#d97706", icon:"🏭" },
  { role:"accountant",          label:"Accountant",       color:"#7c3aed", icon:"💰" },
  { role:"reception",           label:"Receptionist",     color:"#c0185a", icon:"🎫" },
  { role:"requisitioner",       label:"Requisitioner",    color:"#374151", icon:"📝" },
];

// ─── Activity event type ────────────────────────────────────────────────────
interface ActivityEvent {
  id: string;
  type: "success" | "warning" | "info" | "error";
  title: string;
  desc: string;
  time: string;
  user: string;
  module: string;
}

const MOCK_ACTIVITY: ActivityEvent[] = [
  { id:"a1", type:"success", title:"Purchase Order Approved",  desc:"PO #2847 approved for KES 142,500",          time:"2 min ago", user:"Admin",     module:"Procurement" },
  { id:"a2", type:"info",    title:"New Requisition",          desc:"REQ-0094 submitted by Pharmacy dept",         time:"5 min ago", user:"Pharm",     module:"Requisitions" },
  { id:"a3", type:"success", title:"Goods Received",           desc:"GRN #0481 recorded — 24 items checked in",   time:"12 min ago",user:"Warehouse",  module:"Inventory" },
  { id:"a4", type:"warning", title:"Low Stock Alert",          desc:"Amoxicillin 500mg below reorder level",       time:"18 min ago",user:"System",     module:"Inventory" },
  { id:"a5", type:"success", title:"Payment Voucher Issued",   desc:"PV #1203 — KES 88,000 processed",            time:"23 min ago",user:"Accountant", module:"Finance" },
  { id:"a6", type:"info",    title:"New Supplier Registered",  desc:"MedPharm Supplies Ltd added",                 time:"31 min ago",user:"Admin",      module:"Suppliers" },
  { id:"a7", type:"error",   title:"Sync Error",               desc:"Offline DB sync failed — retrying",           time:"45 min ago",user:"System",     module:"Database" },
  { id:"a8", type:"success", title:"QC Inspection Passed",     path:"/quality/inspections", desc:"Batch INS-0077 approved by QC team", time:"1 hr ago",  user:"QC",        module:"Quality" },
  { id:"a9", type:"info",    title:"Tender Published",         desc:"TDR-2024-031 published — deadline set",       time:"2 hr ago",  user:"Proc.Mgr",  module:"Tenders" },
  { id:"a10",type:"success", title:"Contract Renewed",         desc:"Contract with Bidii Logistics extended 1yr",  time:"3 hr ago",  user:"Admin",      module:"Contracts" },
];

const DATE_OPT: Intl.DateTimeFormatOptions = { weekday: "long", year: "numeric", month: "long", day: "numeric" };

const ACTIVITY_ICONS = {
  success: <CheckCircle style={{ width: 13, height: 13 }}/>,
  warning: <AlertCircle style={{ width: 13, height: 13 }}/>,
  info:    <Info style={{ width: 13, height: 13 }}/>,
  error:   <AlertCircle style={{ width: 13, height: 13 }}/>,
};
const ACTIVITY_COLORS = { success:"#059669", warning:"#d97706", info:"#0078d4", error:"#dc2626" };
const ACTIVITY_BG    = { success:"#ecfdf5",  warning:"#fffbeb",  info:"#eff6ff",  error:"#fef2f2" };

export default function DashboardPage() {
  const { profile, roles, online, offlineMode, isAdmin } = useAuth();
  const navigate    = useNavigate();
  const printRef    = useRef<HTMLDivElement>(null);
  const primaryRole = roles[0] || "requisitioner";
  const actions     = QUICK[primaryRole] || QUICK.requisitioner;

  const [sysName,      setSysName]      = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [logoUrl,      setLogoUrl]      = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [viewMode,     setViewMode]     = useState<"grid"|"list">("grid");
  const [showWheel,    setShowWheel]    = useState(false);
  const [stats,        setStats]        = useState({ requisitions:0, pos:0, suppliers:0, items:0, users:0 });
  const [activity,     setActivity]     = useState<ActivityEvent[]>(MOCK_ACTIVITY);
  const [refreshing,   setRefreshing]   = useState(false);
  const today = new Date().toLocaleDateString("en-KE", DATE_OPT);

  useEffect(() => {
    (supabase as any).from("system_settings").select("key,value")
      .in("key", ["system_name", "hospital_name", "logo_url"])
      .then(({ data }: any) => {
        data?.forEach((r: any) => {
          if (r.key === "system_name")   setSysName(r.value || "EL5 MediProcure");
          if (r.key === "hospital_name") setHospitalName(r.value || "Embu Level 5 Hospital");
          if (r.key === "logo_url")      setLogoUrl(r.value || null);
        });
      });
  }, []);

  // Load real stats
  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const [req, po, sup, itm, usr] = await Promise.all([
        (supabase as any).from("requisitions").select("id", { count: "exact", head: true }),
        (supabase as any).from("purchase_orders").select("id", { count: "exact", head: true }),
        (supabase as any).from("suppliers").select("id", { count: "exact", head: true }),
        (supabase as any).from("items").select("id", { count: "exact", head: true }),
        (supabase as any).from("profiles").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        requisitions: req.count ?? 0,
        pos:          po.count  ?? 0,
        suppliers:    sup.count ?? 0,
        items:        itm.count ?? 0,
        users:        usr.count ?? 0,
      });
    } catch { /* offline - keep zeros */ }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadStats();
    setActivity([...MOCK_ACTIVITY].sort(() => Math.random() - 0.5).slice(0, 8));
    setTimeout(() => setRefreshing(false), 900);
  }

  function handlePrint() {
    window.print();
  }

  const filtered = search.length > 1
    ? actions.filter(a =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.desc.toLowerCase().includes(search.toLowerCase()))
    : actions;

  const STATS_CARDS = [
    { label: "Requisitions", value: stats.requisitions, icon: ClipboardList, color: "#0078d4", path: "/requisitions" },
    { label: "Purchase Orders", value: stats.pos, icon: ShoppingCart, color: "#C45911", path: "/purchase-orders" },
    { label: "Suppliers", value: stats.suppliers, icon: Truck, color: "#059669", path: "/suppliers" },
    { label: "Inventory Items", value: stats.items, icon: Package, color: "#7c3aed", path: "/items" },
    { label: "System Users", value: stats.users, icon: Users, color: "#0891b2", path: "/users" },
  ];

  return (
    <div ref={printRef} style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: "#f0f2f5" }}>

      {/* ── HERO BANNER ─────────────────────────────────────────────────── */}
      <div style={{
        position: "relative", overflow: "hidden",
        backgroundImage: `linear-gradient(135deg,rgba(6,14,35,0.91) 0%,rgba(10,37,88,0.83) 55%,rgba(6,14,35,0.78) 100%),url(${procBg})`,
        backgroundSize: "cover", backgroundPosition: "center 30%",
        padding: "28px 24px 26px",
      }}>
        {/* Grid lines */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 60px)",
          pointerEvents: "none",
        }}/>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Top row */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <img src={logoImg} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain", background: "rgba(255,255,255,0.12)", padding: 4 }}/>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{sysName} · Pro v4.0</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.32)" }}>{hospitalName}</div>
                </div>
                {/* Online indicator */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  background: (online && !offlineMode) ? "rgba(34,197,94,0.15)" : "rgba(251,146,60,0.15)",
                  border: `1px solid ${(online && !offlineMode) ? "rgba(34,197,94,0.3)" : "rgba(251,146,60,0.3)"}`,
                  borderRadius: 12, padding: "2px 8px", marginLeft: 4,
                }}>
                  {(online && !offlineMode)
                    ? <Wifi style={{ width: 9, height: 9, color: "#22c55e" }}/>
                    : <WifiOff style={{ width: 9, height: 9, color: "#fb923c" }}/>}
                  <span style={{ fontSize: 8.5, fontWeight: 700, color: (online && !offlineMode) ? "#22c55e" : "#fb923c" }}>
                    {offlineMode ? "OFFLINE" : online ? "ONLINE" : "NO NET"}
                  </span>
                </div>
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                Welcome back, {profile?.full_name?.split(" ")[0] || "Staff"}
              </h1>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.48)", marginTop: 3 }}>{today}</div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, alignItems: "center" }}>
              <button onClick={handleRefresh}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:7, cursor:"pointer", color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:600 }}>
                <RefreshCw style={{ width:11, height:11, ...(refreshing ? { animation:"spin 0.8s linear infinite" } : {}) }}/> Refresh
              </button>
              <button onClick={handlePrint}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:7, cursor:"pointer", color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:600 }}>
                <Printer style={{ width:11, height:11 }}/> Print
              </button>
              <button onClick={() => setShowWheel(v => !v)}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background: showWheel ? "rgba(96,165,250,0.25)" : "rgba(255,255,255,0.1)", border: showWheel ? "1px solid rgba(96,165,250,0.5)" : "1px solid rgba(255,255,255,0.18)", borderRadius:7, cursor:"pointer", color: showWheel ? "#93c5fd" : "rgba(255,255,255,0.8)", fontSize:11, fontWeight:600 }}>
                <Zap style={{ width:11, height:11 }}/> ERP Wheel
              </button>
              {isAdmin && (
                <button onClick={() => navigate("/settings")}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:7, cursor:"pointer", color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:600 }}>
                  <Settings style={{ width:11, height:11 }}/> Settings
                </button>
              )}
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", maxWidth: 480 }}>
            <Search style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", width:13, height:13, color:"rgba(255,255,255,0.45)", pointerEvents:"none" }}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search quick actions…"
              style={{ width:"100%", paddingLeft:34, paddingRight:12, height:38, background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:9, outline:"none", fontSize:12.5, color:"#fff", fontFamily:"inherit" }}/>
            {search && (
              <button onClick={() => setSearch("")}
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", lineHeight:0 }}>✕</button>
            )}
          </div>
        </div>
      </div>

      {/* ── ERP WHEEL (collapsible) ─────────────────────────────────────── */}
      {showWheel && (
        <div style={{ background:"#fff", borderBottom:"1px solid #e5e7eb", padding:"24px 20px", display:"flex", justifyContent:"center", overflowX:"auto" }}>
          <ERPWheelButton logoUrl={logoUrl} />
        </div>
      )}

      {/* ── STATS STRIP ─────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:10, padding:"14px 20px 0", overflowX:"auto", flexWrap:"nowrap" as const }}>
        {STATS_CARDS.map(s => (
          <button key={s.label} onClick={() => navigate(s.path)}
            style={{
              display:"flex", flexDirection:"column", gap:4,
              minWidth:130, padding:"11px 14px",
              background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, cursor:"pointer",
              textAlign:"left" as const, flexShrink:0,
              boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
              transition:"all 0.15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = s.color + "60"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e5e7eb"; (e.currentTarget as HTMLElement).style.transform = "none"; }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ width:28, height:28, borderRadius:7, background:`${s.color}14`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <s.icon style={{ width:13, height:13, color:s.color }}/>
              </div>
              <ChevronRight style={{ width:10, height:10, color:"#d1d5db" }}/>
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:"#111827", lineHeight:1 }}>
              {refreshing ? "…" : s.value.toLocaleString()}
            </div>
            <div style={{ fontSize:9.5, color:"#9ca3af", fontWeight:600, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
              {s.label}
            </div>
          </button>
        ))}

        {/* Offline DB indicator */}
        <button onClick={() => navigate("/odbc")}
          style={{
            display:"flex", flexDirection:"column", gap:4,
            minWidth:130, padding:"11px 14px",
            background: offlineMode ? "#fffbeb" : "#f8fafc",
            border:`1px solid ${offlineMode ? "#fde68a" : "#e5e7eb"}`,
            borderRadius:10, cursor:"pointer",
            textAlign:"left" as const, flexShrink:0,
            boxShadow:"0 1px 4px rgba(0,0,0,0.05)",
          }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ width:28, height:28, borderRadius:7, background: offlineMode ? "#fef3c7" : "#f0f9ff", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Database style={{ width:13, height:13, color: offlineMode ? "#d97706" : "#0ea5e9" }}/>
            </div>
            <div style={{ width:7, height:7, borderRadius:"50%", background: offlineMode ? "#f59e0b" : "#22c55e" }}/>
          </div>
          <div style={{ fontSize:12, fontWeight:800, color:"#111827", lineHeight:1.2 }}>
            {offlineMode ? "Offline" : "Online"}
          </div>
          <div style={{ fontSize:9.5, color:"#9ca3af", fontWeight:600, textTransform:"uppercase" as const, letterSpacing:"0.04em" }}>
            DB Status
          </div>
        </button>
      </div>

      {/* ── MAIN BODY ───────────────────────────────────────────────────── */}
      <div style={{ display:"flex", gap:16, padding:"14px 20px 28px", flex:1, flexWrap:"wrap" as const }}>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <div style={{ flex:"1 1 500px", minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <div>
              <h2 style={{ fontSize:13.5, fontWeight:700, color:"#111827", margin:0 }}>Quick Actions</h2>
              <div style={{ fontSize:10.5, color:"#9ca3af", marginTop:1 }}>
                {filtered.length} {search ? "result" : "module"}{filtered.length !== 1 ? "s" : ""}
                {search ? ` for "${search}"` : ""}
              </div>
            </div>
            <div style={{ display:"flex", gap:3 }}>
              <button onClick={() => setViewMode("grid")}
                style={{ padding:"4px 7px", borderRadius:5, border:"1px solid #e5e7eb", background: viewMode==="grid" ? "#0a2558" : "#fff", cursor:"pointer", lineHeight:0 }}>
                <LayoutGrid style={{ width:12, height:12, color: viewMode==="grid" ? "#fff" : "#6b7280" }}/>
              </button>
              <button onClick={() => setViewMode("list")}
                style={{ padding:"4px 7px", borderRadius:5, border:"1px solid #e5e7eb", background: viewMode==="list" ? "#0a2558" : "#fff", cursor:"pointer", lineHeight:0 }}>
                <List style={{ width:12, height:12, color: viewMode==="list" ? "#fff" : "#6b7280" }}/>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:"center" as const, padding:"36px 20px", color:"#9ca3af", background:"#fff", borderRadius:10, border:"1px solid #e5e7eb" }}>
              <Search style={{ width:28, height:28, margin:"0 auto 8px", color:"#e5e7eb" }}/>
              <div style={{ fontSize:12, fontWeight:600, color:"#6b7280" }}>No actions match "{search}"</div>
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(132px,1fr))", gap:9 }}>
              {filtered.map(action => (
                <button key={action.path} onClick={() => navigate(action.path)}
                  style={{
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    gap:7, padding:"14px 8px",
                    background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, cursor:"pointer",
                    transition:"all 0.15s", textAlign:"center" as const,
                    boxShadow:"0 1px 3px rgba(0,0,0,0.05)",
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "translateY(-2px)";
                    el.style.boxShadow = `0 5px 16px ${action.color}22`;
                    el.style.borderColor = `${action.color}50`;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.transform = "none";
                    el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                    el.style.borderColor = "#e5e7eb";
                  }}>
                  <div style={{ width:38, height:38, borderRadius:9, background:`${action.color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <action.icon style={{ width:17, height:17, color:action.color }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#111827", lineHeight:1.3 }}>{action.label}</div>
                    <div style={{ fontSize:9, color:"#9ca3af", marginTop:2, lineHeight:1.3 }}>{action.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {filtered.map(action => (
                <button key={action.path} onClick={() => navigate(action.path)}
                  style={{
                    display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
                    background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, cursor:"pointer",
                    textAlign:"left" as const, transition:"all 0.12s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:`${action.color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <action.icon style={{ width:14, height:14, color:action.color }}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#111827" }}>{action.label}</div>
                    <div style={{ fontSize:10, color:"#9ca3af" }}>{action.desc}</div>
                  </div>
                  <ChevronRight style={{ width:12, height:12, color:"#d1d5db", flexShrink:0 }}/>
                </button>
              ))}
            </div>
          )}

          {/* ── All Roles Activated panel (admin only) ── */}
          {isAdmin && (
            <div style={{ marginTop:16, background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden" }}>
              <div style={{ padding:"10px 14px", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:7 }}>
                <Lock style={{ width:12, height:12, color:"#059669" }}/>
                <span style={{ fontSize:12, fontWeight:700, color:"#111827" }}>All System Roles — Activated</span>
                <span style={{ marginLeft:"auto", fontSize:9, background:"#ecfdf5", color:"#059669", border:"1px solid #a7f3d0", borderRadius:9, padding:"1px 7px", fontWeight:700 }}>
                  {ALL_ROLES.length} ROLES
                </span>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap" as const, gap:6, padding:"10px 14px 12px" }}>
                {ALL_ROLES.map(r => {
                  const active = roles.includes(r.role);
                  return (
                    <div key={r.role} style={{
                      display:"flex", alignItems:"center", gap:5,
                      padding:"4px 10px",
                      background: active ? `${r.color}10` : "#f9fafb",
                      border:`1px solid ${active ? r.color + "40" : "#e5e7eb"}`,
                      borderRadius:12,
                    }}>
                      <span style={{ fontSize:10 }}>{r.icon}</span>
                      <span style={{ fontSize:10, fontWeight:700, color: active ? r.color : "#9ca3af" }}>{r.label}</span>
                      {active && <span style={{ fontSize:8, background:r.color, color:"#fff", borderRadius:4, padding:"1px 4px", fontWeight:800 }}>YOU</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Activity Feed ─────────────────────────────────────────────── */}
        <div style={{ flex:"0 0 300px", minWidth:260, maxWidth:340 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <h2 style={{ fontSize:13.5, fontWeight:700, color:"#111827", margin:0 }}>
              Activity Feed
            </h2>
            <button onClick={handleRefresh}
              style={{ display:"flex", alignItems:"center", gap:3, padding:"3px 8px", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:6, cursor:"pointer", fontSize:9.5, color:"#6b7280", fontWeight:600 }}>
              <RefreshCw style={{ width:9, height:9, ...(refreshing ? { animation:"spin 0.8s linear infinite" } : {}) }}/>
              Live
            </button>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {activity.map(evt => (
              <div key={evt.id} style={{
                display:"flex", gap:9, padding:"9px 11px",
                background:"#fff", border:`1px solid ${ACTIVITY_COLORS[evt.type]}22`,
                borderLeft:`3px solid ${ACTIVITY_COLORS[evt.type]}`,
                borderRadius:8,
                boxShadow:"0 1px 3px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width:22, height:22, borderRadius:"50%", flexShrink:0,
                  background:ACTIVITY_BG[evt.type],
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:ACTIVITY_COLORS[evt.type], marginTop:1,
                }}>
                  {ACTIVITY_ICONS[evt.type]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#111827", lineHeight:1.3 }}>{evt.title}</div>
                  <div style={{ fontSize:9.5, color:"#6b7280", marginTop:1, lineHeight:1.4 }}>{evt.desc}</div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                    <span style={{ fontSize:8.5, background:`${ACTIVITY_COLORS[evt.type]}14`, color:ACTIVITY_COLORS[evt.type], borderRadius:4, padding:"1px 5px", fontWeight:700 }}>{evt.module}</span>
                    <span style={{ fontSize:8.5, color:"#d1d5db" }}>·</span>
                    <span style={{ fontSize:8.5, color:"#9ca3af" }}>{evt.user}</span>
                    <span style={{ marginLeft:"auto", fontSize:8, color:"#d1d5db", display:"flex", alignItems:"center", gap:2 }}>
                      <Clock style={{ width:8, height:8 }}/> {evt.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={() => navigate("/audit-log")}
            style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:5,
              width:"100%", marginTop:10, padding:"9px",
              background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, cursor:"pointer",
              fontSize:11, fontWeight:600, color:"#6b7280",
              transition:"all 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; }}>
            <Activity style={{ width:11, height:11 }}/> View Full Audit Log
            <ChevronRight style={{ width:10, height:10 }}/>
          </button>

          {/* ── Offline DB Setup panel ── */}
          <div style={{ marginTop:12, background:"#fff", border:"1px solid #e5e7eb", borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"9px 12px", background: offlineMode ? "#fffbeb" : "#f0fdf4", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", gap:6 }}>
              <Database style={{ width:11, height:11, color: offlineMode ? "#d97706" : "#059669" }}/>
              <span style={{ fontSize:11, fontWeight:700, color:"#111827" }}>Offline Database</span>
              <span style={{
                marginLeft:"auto", fontSize:8.5, fontWeight:800,
                background: offlineMode ? "#fef3c7" : "#ecfdf5",
                color: offlineMode ? "#d97706" : "#059669",
                border:`1px solid ${offlineMode ? "#fde68a" : "#bbf7d0"}`,
                borderRadius:8, padding:"1px 7px",
              }}>
                {offlineMode ? "ACTIVE" : "STANDBY"}
              </span>
            </div>
            <div style={{ padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:"#6b7280", lineHeight:1.6 }}>
                Local IndexedDB cache active. Credentials, roles and settings are synced for offline access.
              </div>
              <div style={{ display:"flex", gap:6, marginTop:8 }}>
                <button onClick={() => navigate("/odbc")}
                  style={{ flex:1, padding:"6px", background:"#0a2558", border:"none", borderRadius:6, cursor:"pointer", fontSize:10, fontWeight:700, color:"#fff" }}>
                  ODBC Setup
                </button>
                <button onClick={() => navigate("/backup")}
                  style={{ flex:1, padding:"6px", background:"#f9fafb", border:"1px solid #e5e7eb", borderRadius:6, cursor:"pointer", fontSize:10, fontWeight:600, color:"#374151" }}>
                  Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div style={{
        padding:"8px 20px", background:"#fff", borderTop:"1px solid #e5e7eb",
        display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap" as const, gap:6,
      }}>
        <span style={{ fontSize:9.5, color:"#9ca3af", fontWeight:600 }}>{sysName} Pro v4.0 · {hospitalName}</span>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:8.5, color:"#d1d5db" }}>Embu County Government · Procurement Management System</span>
          <button onClick={handlePrint}
            style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 7px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:5, cursor:"pointer", fontSize:9, color:"#9ca3af" }}>
            <Printer style={{ width:9, height:9 }}/> Print View
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @media print {
          header, nav, [data-hide-print] { display:none !important; }
        }
      `}</style>
    </div>
  );
}
