import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Bell,
  Shield, FileCheck, Database, Home, Gavel, DollarSign,
  ClipboardList, BookOpen, PiggyBank, Layers, Receipt,
  BookMarked, Calendar, Scale, Search, Globe,
  Mail, Archive, Wifi, Activity, ChevronRight, Menu, X, UserCircle, AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer",
  inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer",
  requisitioner: "Requisitioner",
};

const ROLE_MODULES: Record<string, string[]> = {
  admin: ["home","procurement","vouchers","financials","inventory","quality","reports","admin"],
  procurement_manager: ["home","procurement","vouchers","financials","inventory","quality","reports"],
  procurement_officer: ["home","procurement","vouchers","inventory","quality","reports"],
  inventory_manager: ["home","inventory","reports"],
  warehouse_officer: ["home","inventory","quality"],
  requisitioner: ["home","procurement"],
};

const ROLE_SUBPATHS: Record<string, string[]> = {
  admin: [],
  procurement_manager: [],
  procurement_officer: ["/requisitions","/purchase-orders","/goods-received","/suppliers","/contracts","/tenders","/bid-evaluations","/procurement-planning","/vouchers/payment","/vouchers/receipt","/vouchers/purchase","/items","/categories","/departments","/scanner","/quality/dashboard","/quality/inspections","/quality/non-conformance","/reports","/documents","/inbox","/email"],
  inventory_manager: ["/items","/categories","/departments","/scanner","/reports","/documents","/inbox","/email"],
  warehouse_officer: ["/items","/categories","/departments","/scanner","/quality/dashboard","/quality/inspections","/inbox","/email"],
  requisitioner: ["/requisitions","/inbox","/email"],
};

const MODULES = [
  { id:"home", label:"DASHBOARD", icon:Home, color:"#008B8B", path:"/dashboard", sub:[] },
  {
    id:"procurement", label:"PROCUREMENT", icon:ShoppingCart, color:"#1a3a6b", path:"/requisitions",
    sub:[
      { label:"Requisitions", path:"/requisitions", icon:ClipboardList },
      { label:"Purchase Orders", path:"/purchase-orders", icon:ShoppingCart },
      { label:"Goods Received", path:"/goods-received", icon:Package },
      { label:"Suppliers", path:"/suppliers", icon:Truck },
      { label:"Contracts", path:"/contracts", icon:FileCheck },
      { label:"Tenders", path:"/tenders", icon:Gavel },
      { label:"Bid Evaluations", path:"/bid-evaluations", icon:Scale },
      { label:"Procurement Plan", path:"/procurement-planning", icon:Calendar },
    ],
  },
  {
    id:"vouchers", label:"VOUCHERS", icon:FileText, color:"#C45911", path:"/vouchers/payment",
    sub:[
      { label:"Payment Vouchers", path:"/vouchers/payment", icon:DollarSign },
      { label:"Receipt Vouchers", path:"/vouchers/receipt", icon:Receipt },
      { label:"Journal Vouchers", path:"/vouchers/journal", icon:BookMarked },
      { label:"Purchase Vouchers", path:"/vouchers/purchase", icon:FileText },
      { label:"Store Issue Vouchers", path:"/vouchers", icon:Package },
      { label:"Sales Vouchers", path:"/vouchers/sales", icon:FileText },
    ],
  },
  {
    id:"financials", label:"FINANCIALS", icon:BarChart3, color:"#1F6090", path:"/financials/dashboard",
    sub:[
      { label:"Finance Dashboard", path:"/financials/dashboard", icon:BarChart3 },
      { label:"Chart of Accounts", path:"/financials/chart-of-accounts", icon:BookOpen },
      { label:"Budgets", path:"/financials/budgets", icon:PiggyBank },
      { label:"Fixed Assets", path:"/financials/fixed-assets", icon:Building2 },
    ],
  },
  {
    id:"inventory", label:"INVENTORY", icon:Package, color:"#375623", path:"/items",
    sub:[
      { label:"Items", path:"/items", icon:Package },
      { label:"Categories", path:"/categories", icon:Layers },
      { label:"Departments", path:"/departments", icon:Building2 },
      { label:"Scanner", path:"/scanner", icon:Search },
    ],
  },
  {
    id:"quality", label:"QUALITY", icon:Shield, color:"#00695C", path:"/quality/dashboard",
    sub:[
      { label:"QC Dashboard", path:"/quality/dashboard", icon:Shield },
      { label:"Inspections", path:"/quality/inspections", icon:ClipboardList },
      { label:"Non-Conformance", path:"/quality/non-conformance", icon:AlertTriangle },
    ],
  },
  {
    id:"reports", label:"REPORTS", icon:BarChart3, color:"#5C2D91", path:"/reports",
    sub:[
      { label:"Reports", path:"/reports", icon:BarChart3 },
      { label:"Documents", path:"/documents", icon:FileCheck },
    ],
  },
  {
    id:"admin", label:"ADMIN", icon:Database, color:"#333333", path:"/admin/panel",
    sub:[
      { label:"Admin Panel", path:"/admin/panel", icon:Settings },
      { label:"Users", path:"/users", icon:Users },
      { label:"Database Admin", path:"/admin/database", icon:Database },
      { label:"Webmaster", path:"/webmaster", icon:Globe },
      { label:"Audit Log", path:"/audit-log", icon:Activity },
      { label:"Settings", path:"/settings", icon:Settings },
      { label:"Backup", path:"/backup", icon:Archive },
      { label:"ODBC", path:"/odbc", icon:Wifi },
    ],
  },
];

const PAGE_HEADERS: Record<string, { module: string; label: string }> = {
  "/dashboard": { module:"DASHBOARD", label:"Home" },
  "/requisitions": { module:"PROCUREMENT", label:"Requisitions" },
  "/purchase-orders": { module:"PROCUREMENT", label:"Purchase Orders" },
  "/goods-received": { module:"PROCUREMENT", label:"Goods Received" },
  "/suppliers": { module:"PROCUREMENT", label:"Suppliers" },
  "/contracts": { module:"PROCUREMENT", label:"Contracts" },
  "/tenders": { module:"PROCUREMENT", label:"Tenders" },
  "/bid-evaluations": { module:"PROCUREMENT", label:"Bid Evaluations" },
  "/procurement-planning": { module:"PROCUREMENT", label:"Annual Procurement Plan" },
  "/vouchers": { module:"VOUCHERS", label:"Store Issue Vouchers" },
  "/vouchers/sales": { module:"VOUCHERS", label:"Sales Vouchers" },
  "/vouchers/payment": { module:"VOUCHERS", label:"Payment Vouchers" },
  "/vouchers/receipt": { module:"VOUCHERS", label:"Receipt Vouchers" },
  "/vouchers/journal": { module:"VOUCHERS", label:"Journal Vouchers" },
  "/vouchers/purchase": { module:"VOUCHERS", label:"Purchase Vouchers" },
  "/financials/dashboard": { module:"FINANCIALS", label:"Finance Dashboard" },
  "/financials/chart-of-accounts": { module:"FINANCIALS", label:"Chart of Accounts" },
  "/financials/budgets": { module:"FINANCIALS", label:"Budgets" },
  "/financials/fixed-assets": { module:"FINANCIALS", label:"Fixed Assets" },
  "/items": { module:"INVENTORY", label:"Items" },
  "/categories": { module:"INVENTORY", label:"Categories" },
  "/departments": { module:"INVENTORY", label:"Departments" },
  "/scanner": { module:"INVENTORY", label:"Barcode Scanner" },
  "/quality/dashboard": { module:"QUALITY", label:"Quality Dashboard" },
  "/quality/inspections": { module:"QUALITY", label:"Inspections" },
  "/quality/non-conformance": { module:"QUALITY", label:"Non-Conformance Reports" },
  "/reports": { module:"REPORTS", label:"Reports" },
  "/audit-log": { module:"REPORTS", label:"Audit Trail" },
  "/documents": { module:"REPORTS", label:"Documents" },
  "/inbox": { module:"DASHBOARD", label:"Inbox" },
  "/email": { module:"COMMUNICATIONS", label:"Email" },
  "/users": { module:"ADMIN", label:"User Management" },
  "/admin/database": { module:"ADMIN", label:"Database Administration" },
  "/admin/panel": { module:"ADMIN", label:"Admin Panel" },
  "/webmaster": { module:"ADMIN", label:"Webmaster" },
  "/settings": { module:"ADMIN", label:"System Settings" },
  "/backup": { module:"ADMIN", label:"Backup & Recovery" },
  "/odbc": { module:"ADMIN", label:"ODBC Connections" },
  "/profile": { module:"DASHBOARD", label:"My Profile" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const menuTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const primaryRole = (roles.includes("admin") ? "admin"
    : roles.includes("procurement_manager") ? "procurement_manager"
    : roles.includes("procurement_officer") ? "procurement_officer"
    : roles.includes("inventory_manager") ? "inventory_manager"
    : roles.includes("warehouse_officer") ? "warehouse_officer"
    : "requisitioner") as keyof typeof ROLE_MODULES;

  const isAdmin = roles.includes("admin");
  const allowedModules = ROLE_MODULES[primaryRole] || ["home"];
  const allowedSubPaths = ROLE_SUBPATHS[primaryRole] || [];
  const visibleModules = MODULES.filter(m => allowedModules.includes(m.id));

  useEffect(() => {
    (supabase as any).from("system_settings")
      .select("key,value").in("key", ["system_name","hospital_name","system_logo_url"])
      .then(({ data }: any) => {
        if (!data) return;
        const map: Record<string,string> = {};
        data.forEach((r: any) => { if (r.key && r.value) map[r.key] = r.value; });
        if (map.system_name) setSysName(map.system_name);
        else if (map.hospital_name) setSysName(map.hospital_name);
        if (map.system_logo_url) setLogoUrl(map.system_logo_url);
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { count } = await (supabase as any).from("inbox_items")
        .select("id", { count: "exact", head: true }).eq("to_user_id", user.id).eq("status", "unread");
      setUnreadCount(count || 0);
    };
    fetch();
    const ch = (supabase as any).channel("inbox-badge-layout")
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_items" }, fetch).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const pathHeader = PAGE_HEADERS[location.pathname] || { module:"MEDIPROCURE", label:"" };
  const isSubActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleMenuEnter = (id: string) => {
    if (menuTimeouts.current[id]) clearTimeout(menuTimeouts.current[id]);
    setActiveMenu(id);
  };
  const handleMenuLeave = (id: string) => {
    menuTimeouts.current[id] = setTimeout(() => setActiveMenu(prev => prev === id ? null : prev), 150);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#f0f2f5", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* TOP NAVBAR */}
      <header className="flex items-center h-14 px-3 gap-1 z-50 sticky top-0 shrink-0"
        style={{ background: "linear-gradient(90deg,#0a2558 0%,#1a3a6b 50%,#1d4a87 100%)", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
        
        <Link to="/dashboard" className="flex items-center gap-2.5 mr-3 shrink-0 select-none">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
            {logoUrl
              ? <img src={logoUrl} alt="" className="w-full h-full object-contain" />
              : <img src="/src/assets/embu-county-logo.jpg" alt="" className="w-full h-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            }
          </div>
          <div className="leading-none hidden sm:block">
            
            <div className="text-[13px] font-black text-white tracking-tight">{sysName}</div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto no-scrollbar">
          {visibleModules.map(mod => {
            const isActive = mod.sub.length === 0
              ? location.pathname === mod.path
              : mod.sub.some(s => isSubActive(s.path));
            const isOpen = activeMenu === mod.id;
            const filteredSubs = mod.sub.filter(s => isAdmin || allowedSubPaths.includes(s.path));
            return (
              <div key={mod.id} className="relative"
                onMouseEnter={() => filteredSubs.length > 0 && handleMenuEnter(mod.id)}
                onMouseLeave={() => filteredSubs.length > 0 && handleMenuLeave(mod.id)}>
                <button
                  onClick={() => { if (filteredSubs.length === 0) navigate(mod.path); else setActiveMenu(isOpen ? null : mod.id); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10.5px] font-bold tracking-widest transition-all whitespace-nowrap"
                  style={{
                    color: isActive ? "#fff" : "rgba(255,255,255,0.62)",
                    background: isActive ? `${mod.color}bb` : isOpen ? "rgba(255,255,255,0.08)" : "transparent",
                    borderBottom: isActive ? `2px solid ${mod.color}` : "2px solid transparent",
                  }}>
                  <mod.icon className="w-3.5 h-3.5 shrink-0" />
                  {mod.label}
                  {filteredSubs.length > 0 && <ChevronDown className="w-3 h-3 opacity-50" />}
                </button>
                {filteredSubs.length > 0 && isOpen && (
                  <div className="absolute top-full left-0 mt-0.5 rounded-xl overflow-hidden z-50"
                    style={{ minWidth: 200, background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", border: "1px solid #e5e7eb" }}>
                    <div className="py-1">
                      {filteredSubs.map(s => {
                        const active = isSubActive(s.path);
                        return (
                          <Link key={s.path} to={s.path} onClick={() => setActiveMenu(null)}
                            className="flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-all"
                            style={{ color: active ? "#fff" : "#374151", background: active ? mod.color : "transparent" }}
                            onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = `${mod.color}15`; (e.currentTarget as HTMLElement).style.color = mod.color; } }}
                            onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#374151"; } }}>
                            <s.icon className="w-3.5 h-3.5 shrink-0" />
                            {s.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 ml-auto">
          <button onClick={() => navigate("/inbox")}
            className="relative p-2 rounded-lg transition-all"
            style={{ color: "rgba(255,255,255,0.65)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <Mail className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "#ef4444", color: "#fff" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button onClick={() => navigate("/email")}
            title="Email"
            className="p-2 rounded-lg transition-all"
            style={{ color: "rgba(255,255,255,0.65)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
            </svg>
          </button>

          <div className="relative" ref={userMenuRef}>
            <button onClick={() => setUserMenuOpen(v => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all"
              style={{ color: "rgba(255,255,255,0.8)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { if (!userMenuOpen) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{ background: "rgba(255,255,255,0.2)" }}>
                {profile?.full_name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="hidden sm:block text-left leading-none">
                <div className="text-[11px] font-semibold text-white">{profile?.full_name?.split(" ")[0] || "User"}</div>
                <div className="text-[9px] text-white/50">{ROLE_LABELS[primaryRole]}</div>
              </div>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50"
                style={{ minWidth: 210, background: "#fff", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", border: "1px solid #e5e7eb" }}>
                <div className="p-3 border-b border-gray-100 bg-gray-50">
                  <div className="text-[12px] font-bold text-gray-800">{profile?.full_name}</div>
                  <div className="text-[10px] text-gray-500">{profile?.email || user?.email}</div>
                  <div className="mt-1 text-[9px] px-2 py-0.5 rounded-full inline-block font-semibold"
                    style={{ background: "#1a3a6b15", color: "#1a3a6b" }}>{ROLE_LABELS[primaryRole]}</div>
                </div>
                <div className="py-1">
                  <button onClick={() => { navigate("/profile"); setUserMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-all text-left">
                    <UserCircle className="w-4 h-4 text-gray-400" /> My Profile
                  </button>
                  {isAdmin && <>
                    <button onClick={() => { navigate("/settings"); setUserMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-all text-left">
                      <Settings className="w-4 h-4 text-gray-400" /> Settings
                    </button>
                    <button onClick={() => { navigate("/admin/panel"); setUserMenuOpen(false); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-all text-left">
                      <Database className="w-4 h-4 text-gray-400" /> Admin Panel
                    </button>
                  </>}
                  <div className="my-1 mx-2 border-t border-gray-100" />
                  <button onClick={() => { signOut(); setUserMenuOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-all text-left">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setMobileOpen(v => !v)}
            className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-14 left-0 bottom-0 w-72 overflow-y-auto"
            style={{ background: "#0a2558" }} onClick={e => e.stopPropagation()}>
            <div className="p-3 space-y-1">
              {visibleModules.map(mod => {
                const filteredSubs = mod.sub.filter(s => isAdmin || allowedSubPaths.includes(s.path));
                return (
                  <div key={mod.id}>
                    <button onClick={() => { if (filteredSubs.length === 0) { navigate(mod.path); setMobileOpen(false); } }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-[12px] font-bold tracking-wider text-white/80 hover:bg-white/10 transition-all">
                      <mod.icon className="w-4 h-4 shrink-0" style={{ color: mod.color }} />
                      {mod.label}
                    </button>
                    {filteredSubs.map(s => (
                      <Link key={s.path} to={s.path} onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 ml-6 px-3 py-1.5 rounded-lg text-[11px] text-white/55 hover:text-white hover:bg-white/10 transition-all">
                        <s.icon className="w-3.5 h-3.5 shrink-0" /> {s.label}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="px-4 py-1.5 flex items-center gap-1.5 shrink-0"
        style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <span className="text-[10px] text-gray-400 font-medium">EL5 MediProcure</span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-[10px] font-bold" style={{ color: "#1a3a6b" }}>{pathHeader.module}</span>
        {pathHeader.label && <>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-[10px] text-gray-600">{pathHeader.label}</span>
        </>}
      </div>

      <main className="flex-1 overflow-auto">{children}</main>

      <footer className="px-4 py-1.5 text-center text-[9px] text-gray-400"
        style={{ background: "#fff", borderTop: "1px solid #e5e7eb" }}>
        {hospitalName} © {new Date().getFullYear()} · All Rights Reserved
      </footer>
    </div>
  );
}
