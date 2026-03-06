import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ProcurementRole } from "@/contexts/AuthContext";
import {
  Package, FileText, ShoppingCart, Truck, Users, BarChart3,
  Settings, LogOut, ChevronDown, Building2, Bell, UserCircle,
  Shield, FileCheck, Database, Home, Gavel, DollarSign,
  ClipboardList, BookOpen, PiggyBank, Layers, Receipt,
  BookMarked, Calendar, Scale, Plus, Search, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  procurement_manager: "Procurement Manager",
  procurement_officer: "Procurement Officer",
  inventory_manager: "Inventory Manager",
  warehouse_officer: "Warehouse Officer",
  requisitioner: "Requisitioner",
};

// ─── Module definitions ────────────────────────────────────────────────────
const MODULES = [
  {
    id: "home", label: "DASHBOARD", icon: Home,
    bg: "#008B8B", hoverBg: "#007A7A",
    path: "/dashboard",
    sub: [],
  },
  {
    id: "procurement", label: "PROCUREMENT", icon: ShoppingCart,
    bg: "#1a1a2e", hoverBg: "#16213e",
    path: "/requisitions",
    sub: [
      { label: "Requisitions", path: "/requisitions", icon: ClipboardList },
      { label: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
      { label: "Goods Received", path: "/goods-received", icon: Package },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Contracts", path: "/contracts", icon: FileCheck },
      { label: "Tenders", path: "/tenders", icon: Gavel },
      { label: "Bid Evaluations", path: "/bid-evaluations", icon: Scale },
      { label: "Procurement Plan", path: "/procurement-planning", icon: Calendar },
    ],
  },
  {
    id: "vouchers", label: "VOUCHERS", icon: FileText,
    bg: "#C45911", hoverBg: "#A84D0E",
    path: "/vouchers/payment",
    sub: [
      { label: "Payment Vouchers", path: "/vouchers/payment", icon: DollarSign },
      { label: "Receipt Vouchers", path: "/vouchers/receipt", icon: Receipt },
      { label: "Journal Vouchers", path: "/vouchers/journal", icon: BookMarked },
      { label: "Purchase Vouchers", path: "/vouchers/purchase", icon: FileText },
      { label: "Sales Vouchers", path: "/vouchers/sales", icon: BarChart3 },
      { label: "Store Issue (S11)", path: "/vouchers", icon: Package },
    ],
  },
  {
    id: "financials", label: "FINANCIALS", icon: BarChart3,
    bg: "#1F6090", hoverBg: "#195380",
    path: "/financials/dashboard",
    sub: [
      { label: "Finance Dashboard", path: "/financials/dashboard", icon: BarChart3 },
      { label: "Chart of Accounts", path: "/financials/chart-of-accounts", icon: BookOpen },
      { label: "Budgets", path: "/financials/budgets", icon: PiggyBank },
      { label: "Fixed Assets", path: "/financials/fixed-assets", icon: Building2 },
    ],
  },
  {
    id: "inventory", label: "INVENTORY", icon: Package,
    bg: "#375623", hoverBg: "#2D4A1C",
    path: "/items",
    sub: [
      { label: "Items", path: "/items", icon: Package },
      { label: "Categories", path: "/categories", icon: Layers },
      { label: "Departments", path: "/departments", icon: Building2 },
      { label: "Scanner", path: "/scanner", icon: Search },
    ],
  },
  {
    id: "quality", label: "QUALITY", icon: Shield,
    bg: "#00695C", hoverBg: "#005347",
    path: "/quality/dashboard",
    sub: [
      { label: "QC Dashboard", path: "/quality/dashboard", icon: Shield },
      { label: "Inspections", path: "/quality/inspections", icon: ClipboardList },
      { label: "Non-Conformance", path: "/quality/non-conformance", icon: Shield },
    ],
  },
  {
    id: "reports", label: "REPORTS", icon: BarChart3,
    bg: "#5C2D91", hoverBg: "#4E2680",
    path: "/reports",
    sub: [
      { label: "Reports", path: "/reports", icon: BarChart3 },
      { label: "Audit Trail", path: "/audit-log", icon: FileText },
    ],
  },
  {
    id: "admin", label: "ADMIN", icon: Database,
    bg: "#333333", hoverBg: "#222222",
    path: "/users",
    roles: ["admin"],
    sub: [
      { label: "Users", path: "/users", icon: Users },
      { label: "Database Admin", path: "/admin/database", icon: Database },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
];

// ─── Page headers per-path ─────────────────────────────────────────────────
const PAGE_HEADERS: Record<string, { module: string; label: string }> = {
  "/dashboard":                 { module: "DASHBOARD", label: "Home" },
  "/requisitions":              { module: "PROCUREMENT", label: "Requisitions" },
  "/purchase-orders":           { module: "PROCUREMENT", label: "Purchase Orders" },
  "/goods-received":            { module: "PROCUREMENT", label: "Goods Received" },
  "/suppliers":                 { module: "PROCUREMENT", label: "Suppliers" },
  "/contracts":                 { module: "PROCUREMENT", label: "Contracts" },
  "/tenders":                   { module: "PROCUREMENT", label: "Tenders" },
  "/bid-evaluations":           { module: "PROCUREMENT", label: "Bid Evaluations" },
  "/procurement-planning":      { module: "PROCUREMENT", label: "Annual Procurement Plan" },
  "/vouchers":                  { module: "VOUCHERS", label: "Store Issue Vouchers" },
  "/vouchers/payment":          { module: "VOUCHERS", label: "Payment Vouchers" },
  "/vouchers/receipt":          { module: "VOUCHERS", label: "Receipt Vouchers" },
  "/vouchers/journal":          { module: "VOUCHERS", label: "Journal Vouchers" },
  "/vouchers/purchase":         { module: "VOUCHERS", label: "Purchase Vouchers" },
  "/vouchers/sales":            { module: "VOUCHERS", label: "Sales Vouchers" },
  "/financials/dashboard":      { module: "FINANCIALS", label: "Finance Dashboard" },
  "/financials/chart-of-accounts":{ module: "FINANCIALS", label: "Chart of Accounts" },
  "/financials/budgets":        { module: "FINANCIALS", label: "Budgets" },
  "/financials/fixed-assets":   { module: "FINANCIALS", label: "Fixed Assets" },
  "/items":                     { module: "INVENTORY", label: "Items" },
  "/categories":                { module: "INVENTORY", label: "Categories" },
  "/departments":               { module: "INVENTORY", label: "Departments" },
  "/scanner":                   { module: "INVENTORY", label: "Barcode Scanner" },
  "/quality/dashboard":         { module: "QUALITY", label: "Quality Dashboard" },
  "/quality/inspections":       { module: "QUALITY", label: "Inspections" },
  "/quality/non-conformance":   { module: "QUALITY", label: "Non-Conformance Reports" },
  "/reports":                   { module: "REPORTS", label: "Reports" },
  "/audit-log":                 { module: "REPORTS", label: "Audit Trail" },
  "/users":                     { module: "ADMIN", label: "User Management" },
  "/admin/database":            { module: "ADMIN", label: "Database Administration" },
  "/settings":                  { module: "ADMIN", label: "Settings" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, primaryRole, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const currentPath = location.pathname;
  const pageInfo = PAGE_HEADERS[currentPath] || { module: "DASHBOARD", label: "Page" };
  const isAdmin = roles.includes("admin");

  const visibleModules = MODULES.filter(m =>
    !m.roles || m.roles.every(r => roles.includes(r)) || !m.roles.length
  );

  const currentModule = MODULES.find(m =>
    m.path === currentPath || m.sub.some(s => s.path === currentPath)
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "Segoe UI, system-ui, sans-serif" }}>

      {/* ── Top system bar ──────────────────────────────────────────────── */}
      <div className="h-10 flex items-center px-3 gap-0 shrink-0 z-50 relative"
        style={{ background: "linear-gradient(to bottom, #1e3a5f, #16304f)" }}>
        {/* App icon + name */}
        <div className="flex items-center gap-2 pr-4 border-r border-white/20 mr-2">
          <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
            <span className="text-white text-[9px] font-black">EL5</span>
          </div>
          <span className="text-white text-xs font-semibold tracking-wide">MediProcure</span>
          <ChevronDown className="w-3 h-3 text-white/60" />
        </div>

        {/* Module breadcrumb */}
        <div className="flex items-center gap-1 text-white/70 text-xs">
          <button className="hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors font-semibold"
            style={{ color: "#00b4d8" }} onClick={() => navigate("/dashboard")}>
            {pageInfo.module}
          </button>
          {pageInfo.label !== "Home" && <>
            <span className="text-white/40">›</span>
            <span className="text-white/90 px-1">{pageInfo.label}</span>
          </>}
        </div>

        <div className="flex-1" />

        {/* Create button */}
        <button onClick={() => navigate("/requisitions")}
          className="flex items-center gap-1.5 px-3 py-1 rounded border border-white/30 text-white text-xs font-medium hover:bg-white/10 transition-colors mr-3">
          <Plus className="w-3.5 h-3.5" />Create
        </button>

        {/* User info */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/10 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-white text-[11px] font-semibold leading-none">{profile?.full_name || "User"}</p>
                <p className="text-white/60 text-[10px] leading-none mt-0.5 capitalize">{ROLE_LABELS[primaryRole] || "Staff"}</p>
              </div>
              <div className="w-7 h-7 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold">
                {(profile?.full_name || "U")[0].toUpperCase()}
              </div>
              <div className="flex flex-col gap-0.5 text-white/60 text-xs">
                <Settings className="w-3.5 h-3.5" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mt-1">
            <div className="px-3 py-2 border-b">
              <p className="font-semibold text-sm">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{ROLE_LABELS[primaryRole]}</p>
              <p className="text-xs text-muted-foreground">Embu Level 5 Hospital</p>
            </div>
            <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="w-4 h-4 mr-2" />Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/users")} className={isAdmin ? "" : "hidden"}><Users className="w-4 h-4 mr-2" />Manage Users</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600"><LogOut className="w-4 h-4 mr-2" />Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Module tile navigation ───────────────────────────────────────── */}
      <div className="flex items-stretch shrink-0 z-40 relative overflow-x-auto"
        style={{ background: "#1a1a2e", borderBottom: "2px solid #000" }}>
        {visibleModules.map(mod => {
          const isActive = currentModule?.id === mod.id;
          return (
            <div key={mod.id} className="relative group"
              onMouseEnter={() => setActiveModule(mod.id)}
              onMouseLeave={() => setActiveModule(null)}>
              <button
                onClick={() => { navigate(mod.path); setActiveModule(null); }}
                className="flex flex-col items-start justify-between px-5 py-2.5 min-w-[110px] h-[62px] transition-all relative"
                style={{
                  backgroundColor: isActive ? mod.bg : activeModule === mod.id ? mod.hoverBg : mod.bg,
                  opacity: 1,
                }}>
                {/* Active indicator bar at bottom */}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/80" />}
                <div className="flex items-center gap-2">
                  <mod.icon className="w-4 h-4 text-white/80" />
                  {mod.sub.length > 0 && <ChevronDown className="w-3 h-3 text-white/50 ml-auto" />}
                </div>
                <span className="text-white text-[11px] font-bold tracking-wider leading-none">{mod.label}</span>
              </button>

              {/* Dropdown sub-menu */}
              {mod.sub.length > 0 && activeModule === mod.id && (
                <div className="absolute top-full left-0 w-52 bg-white shadow-2xl border border-gray-200 z-50 rounded-b"
                  style={{ marginTop: "0px" }}>
                  {mod.sub.map(s => (
                    <button key={s.path} onClick={() => { navigate(s.path); setActiveModule(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${currentPath === s.path ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}>
                      <s.icon className="w-4 h-4 text-gray-400 shrink-0" />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto bg-gray-50 min-h-0">
        {children}
      </main>
    </div>
  );
}
