import { useState } from "react";
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
    ],
  },
];

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
    </div>
  );
};

export default AppLayout;
