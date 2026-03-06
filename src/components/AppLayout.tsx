import { useState } from "react";
<<<<<<< HEAD
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, Package, FileText, ShoppingCart, Truck, ClipboardList,
  Users, Settings, LogOut, Menu, X, BarChart3, Shield, ChevronDown, ChevronRight,
  Layers, Building2, ScanBarcode, FileSearch, Boxes, ArrowLeftRight,
  RotateCcw, RefreshCw, Warehouse, TrendingUp, Receipt, BookOpen, Landmark,
  PiggyBank, CreditCard, Scale, Building, Gavel, BadgeCheck, AlertCircle,
  ClipboardCheck, Factory, Globe, BarChart2, LineChart, Activity, Wallet,
  BookMarked, ArrowUpDown, Database, FilePlus2, FileCheck, FileX, FileMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  roles?: string[];
  badge?: string;
}

const NAV_STRUCTURE: NavItem[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Procurement",
    icon: ShoppingCart,
    children: [
      { label: "Requisitions", path: "/requisitions", icon: FileText },
      { label: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
      { label: "Goods Received", path: "/goods-received", icon: ClipboardList },
      { label: "Suppliers", path: "/suppliers", icon: Truck },
      { label: "Tenders", path: "/tenders", icon: Gavel },
      { label: "Bid Evaluations", path: "/bid-evaluations", icon: FileSearch },
      { label: "Contracts", path: "/contracts", icon: BookMarked },
      { label: "Sourcing", path: "/sourcing", icon: Factory },
      { label: "Proc. Planning", path: "/procurement-planning", icon: ClipboardCheck },
      { label: "Reports", path: "/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    children: [
      { label: "Items", path: "/items", icon: Package },
      { label: "Categories", path: "/categories", icon: Layers },
      { label: "Departments", path: "/departments", icon: Building2 },
      { label: "Stock Movements", path: "/stock-movements", icon: ArrowUpDown },
      { label: "Stock Adjustments", path: "/stock-adjustments", icon: RotateCcw },
      { label: "Transfers", path: "/stock-transfers", icon: ArrowLeftRight },
      { label: "Cycle Counts", path: "/cycle-counts", icon: RefreshCw },
      { label: "Reorder Levels", path: "/reorder-levels", icon: TrendingUp },
      { label: "Warehouses", path: "/warehouses", icon: Warehouse },
      { label: "Valuation", path: "/inventory-valuation", icon: Scale },
      { label: "Barcode Scanner", path: "/scanner", icon: ScanBarcode },
    ],
  },
  {
    label: "Vouchers",
    icon: Receipt,
    children: [
      { label: "Payment Vouchers", path: "/vouchers/payment", icon: FileMinus },
      { label: "Receipt Vouchers", path: "/vouchers/receipt", icon: FilePlus2 },
      { label: "Journal Vouchers", path: "/vouchers/journal", icon: BookOpen },
      { label: "Purchase Vouchers", path: "/vouchers/purchase", icon: FileCheck },
      { label: "Sales Vouchers", path: "/vouchers/sales", icon: FileX },
    ],
  },
  {
    label: "Financials",
    icon: Landmark,
    children: [
      { label: "Dashboard", path: "/financials/dashboard", icon: LayoutDashboard },
      { label: "Chart of Accounts", path: "/financials/chart-of-accounts", icon: Layers },
      { label: "General Ledger", path: "/financials/ledger", icon: BookOpen },
      { label: "Trial Balance", path: "/financials/trial-balance", icon: Scale },
      { label: "Budgets", path: "/financials/budgets", icon: PiggyBank },
      { label: "Bank Accounts", path: "/financials/bank-accounts", icon: Building },
      { label: "Bank Reconciliation", path: "/financials/bank-reconciliation", icon: CreditCard },
      { label: "Fixed Assets", path: "/financials/fixed-assets", icon: Database },
    ],
  },
  {
    label: "Quality",
    icon: BadgeCheck,
    children: [
      { label: "Dashboard", path: "/quality/dashboard", icon: LayoutDashboard },
      { label: "Inspections", path: "/quality/inspections", icon: ClipboardCheck },
      { label: "Non-Conformance", path: "/quality/non-conformance", icon: AlertCircle },
    ],
  },
  {
    label: "Analytics",
    icon: BarChart2,
    children: [
      { label: "Analytics Hub", path: "/analytics", icon: Activity },
      { label: "Executive Dashboard", path: "/analytics/executive", icon: LineChart },
    ],
  },
  {
    label: "Vendor Portal",
    icon: Globe,
    children: [
      { label: "Vendor Dashboard", path: "/vendor-portal", icon: Globe },
      { label: "Registration", path: "/vendor-registration", icon: FileText },
    ],
  },
  {
    label: "Administration",
    icon: Shield,
    children: [
      { label: "Users", path: "/users", icon: Users },
      { label: "Audit Log", path: "/audit-log", icon: FileSearch },
      { label: "Settings", path: "/settings", icon: Settings },
=======
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth, ProcurementRole } from "@/contexts/AuthContext";
import {
  Package, FileText, ShoppingCart, Truck, Users,
  BarChart3, Settings, LogOut, ChevronDown, ChevronRight,
  ClipboardList, Layers, Building2, Menu, X, Bell,
  UserCircle, Shield, FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import logo from "@/assets/logo.png";
import procurementBg from "@/assets/procurement-bg.jpg";
import { LucideIcon } from "lucide-react";

interface NavItem { path: string; label: string; icon: LucideIcon; roles: ProcurementRole[]; }
interface NavGroup { label: string; items: NavItem[]; roles: ProcurementRole[]; icon: LucideIcon; }

const navGroups: NavGroup[] = [
  {
    label: "INVENTORY",
    icon: Package,
    roles: ["admin", "inventory_manager", "warehouse_officer", "procurement_officer", "procurement_manager"],
    items: [
      { path: "/items", label: "Items", icon: Package, roles: [] },
      { path: "/categories", label: "Categories", icon: Layers, roles: ["admin", "inventory_manager"] },
      { path: "/departments", label: "Departments", icon: Building2, roles: ["admin", "inventory_manager"] },
    ],
  },
  {
    label: "PURCHASING",
    icon: ShoppingCart,
    roles: [],
    items: [
      { path: "/requisitions", label: "Requisitions", icon: FileText, roles: [] },
      { path: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, roles: ["admin", "procurement_officer", "procurement_manager"] },
      { path: "/suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "procurement_officer", "procurement_manager"] },
      { path: "/contracts", label: "Contracts", icon: FileCheck, roles: ["admin", "procurement_officer", "procurement_manager"] },
    ],
  },
  {
    label: "RECEIVING",
    icon: ClipboardList,
    roles: ["admin", "warehouse_officer", "procurement_officer", "procurement_manager"],
    items: [
      { path: "/goods-received", label: "Goods Received", icon: ClipboardList, roles: [] },
    ],
  },
  {
    label: "ANALYTICS",
    icon: BarChart3,
    roles: ["admin", "procurement_manager", "inventory_manager"],
    items: [
      { path: "/reports", label: "Reports", icon: BarChart3, roles: [] },
    ],
  },
  {
    label: "ADMIN",
    icon: Shield,
    roles: ["admin"],
    items: [
      { path: "/users", label: "Users", icon: Users, roles: ["admin"] },
      { path: "/audit-log", label: "Audit Trail", icon: ClipboardList, roles: ["admin"] },
      { path: "/settings", label: "Settings", icon: Settings, roles: ["admin"] },
>>>>>>> origin/main
    ],
  },
];

<<<<<<< HEAD
const SidebarNavItem = ({
  item,
  depth = 0,
  onNavigate,
}: {
  item: NavItem;
  depth?: number;
  onNavigate?: () => void;
}) => {
  const location = useLocation();
  const [open, setOpen] = useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => c.path && location.pathname.startsWith(c.path));
  });

  const isActive = item.path
    ? location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path))
    : false;

  if (item.path) {
    return (
      <NavLink
        to={item.path}
        onClick={onNavigate}
        className={({ isActive: navActive }) =>
          cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 group",
            depth > 0 && "ml-3 text-xs py-1.5",
            navActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )
        }
      >
        <item.icon className={cn("shrink-0", depth === 0 ? "w-4 h-4" : "w-3.5 h-3.5")} />
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150",
          "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          open && "bg-sidebar-accent/50"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {open ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
        )}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 border-l border-sidebar-border ml-5 pl-2">
          {item.children?.map((child, i) => (
            <SidebarNavItem key={i} item={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const Sidebar = () => (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300",
        "border-r border-sidebar-border",
        "w-64 bg-sidebar-background",
        isMobile && !sidebarOpen && "-translate-x-full"
      )}
    >
      {/* Logo/Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <span className="text-sidebar-primary-foreground font-bold text-sm">M</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-sidebar-foreground truncate">MediProcure ERP</p>
          <p className="text-[10px] text-sidebar-foreground/60 truncate">Embu Level 5 Hospital</p>
        </div>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-0.5">
          {NAV_STRUCTURE.map((item, i) => (
            <SidebarNavItem
              key={i}
              item={item}
              onNavigate={() => isMobile && setSidebarOpen(false)}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-sidebar-primary">
              {(profile?.full_name || "U").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">
              {profile?.department || "System User"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start gap-2 h-8 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          !isMobile && "ml-64"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Live</span>
            <span className="text-border">|</span>
            <span>{new Date().toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </div>
      </main>
=======
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator", requisitioner: "Requisitioner",
  procurement_officer: "Procurement Officer", procurement_manager: "Procurement Manager",
  warehouse_officer: "Warehouse Officer", inventory_manager: "Inventory Manager",
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(navGroups.map(g => g.label)));
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, roles, signOut, primaryRole } = useAuth();

  const canSeeGroup = (group: NavGroup) => group.roles.length === 0 || group.roles.some(r => roles.includes(r));
  const canSeeItem = (item: NavItem) => item.roles.length === 0 || item.roles.some(r => roles.includes(r));

  const toggleGroup = (label: string) => {
    const next = new Set(expandedGroups);
    if (next.has(label)) next.delete(label); else next.add(label);
    setExpandedGroups(next);
  };

  const visibleGroups = navGroups.filter(canSeeGroup).map(group => ({
    ...group, items: group.items.filter(canSeeItem),
  })).filter(g => g.items.length > 0);

  const renderSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <img src={logo} alt="MediProcure" className="w-8 h-8 flex-shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-base font-bold text-sidebar-foreground tracking-tight block">MediProcure</span>
            <span className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">ERP Suite v2.0</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 pt-3">
        {visibleGroups.map((group) => (
          <Collapsible key={group.label} open={expandedGroups.has(group.label)} onOpenChange={() => toggleGroup(group.label)}>
            {!collapsed ? (
              <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-sidebar-foreground/60 uppercase tracking-wider hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50 rounded-md transition-colors">
                <span className="flex items-center gap-2">
                  <group.icon className="w-3.5 h-3.5" />
                  {group.label}
                </span>
                {expandedGroups.has(group.label) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </CollapsibleTrigger>
            ) : <div className="h-px bg-sidebar-border mx-2 my-1" />}
            <CollapsibleContent>
              <div className="space-y-0.5 ml-2 border-l border-sidebar-border/40 pl-2 mt-0.5">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-all ${isActive ? "bg-primary/10 text-primary font-medium shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
                      <item.icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-primary" />
              <p className="text-[11px] text-primary font-medium capitalize">{ROLE_LABELS[primaryRole] || primaryRole}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10">
          <LogOut className="w-4 h-4 mr-2" />{!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex relative">
      {/* Background wallpaper for main content */}
      <div className="absolute inset-0 z-0">
        <img src={procurementBg} alt="" className="w-full h-full object-cover opacity-[0.03]" />
      </div>

      <aside className={`hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 relative z-10 ${collapsed ? "w-16" : "w-56"}`}>
        {renderSidebar()}
        <button onClick={() => setCollapsed(!collapsed)} className="absolute top-4 -right-3 bg-card border border-border rounded-full p-1 shadow-sm hover:bg-muted transition-colors z-10">
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <X className="w-3 h-3" />}
        </button>
      </aside>
      {mobileOpen && <div className="md:hidden fixed inset-0 bg-foreground/50 z-40" onClick={() => setMobileOpen(false)} />}
      <aside className={`md:hidden fixed top-0 left-0 h-full w-60 bg-sidebar z-50 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {renderSidebar()}
      </aside>
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative z-10">
        <header className="h-12 bg-card/95 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 no-print">
          <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="relative"><Bell className="w-4 h-4" /><span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-destructive rounded-full" /></Button>
            <span className="text-xs text-muted-foreground hidden lg:block">
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <UserCircle className="w-5 h-5" />
                  <span className="hidden sm:block text-sm font-medium truncate max-w-[120px]">{profile?.full_name || "User"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="font-medium text-sm">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ROLE_LABELS[primaryRole]}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}><Settings className="w-4 h-4 mr-2" /> Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive"><LogOut className="w-4 h-4 mr-2" /> Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-background/80">{children}</main>
      </div>
>>>>>>> origin/main
    </div>
  );
};

export default AppLayout;
