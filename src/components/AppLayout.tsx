import { useState } from "react";
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
    ],
  },
];

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
    </div>
  );
};

export default AppLayout;
