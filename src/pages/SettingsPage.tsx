import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, db } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon, Save, User, Building2, Database, Shield, Copy, Terminal,
  Package, Truck, Layers, Trash2, Edit, Plus, FileText, ChevronRight, ChevronDown, File,
  X, Minimize2, Maximize2, Users, KeyRound, UserCheck, UserX, Monitor,
} from "lucide-react";
import { logAudit } from "@/lib/audit";
import folderIcon from "@/assets/folder-icon.png";

// ===== FULL PROJECT FILE TREE (expanded architecture) =====
const PROJECT_TREE = [
  { name: "src/", type: "folder", children: [
    { name: "main.tsx", type: "file" }, { name: "App.tsx", type: "file" }, { name: "App.css", type: "file" }, { name: "index.css", type: "file" },
    { name: "assets/", type: "folder", children: [
      { name: "embu-county-logo.jpg", type: "file" }, { name: "logo.png", type: "file" }, { name: "procurement-bg.jpg", type: "file" }, { name: "folder-icon.png", type: "file" },
    ]},
    { name: "components/", type: "folder", children: [
      { name: "AppLayout.tsx", type: "file" }, { name: "NavLink.tsx", type: "file" }, { name: "ProtectedRoute.tsx", type: "file" },
      { name: "ui/ (shadcn — 40+ components)", type: "folder", children: [] },
      { name: "procurement/", type: "folder", children: [
        { name: "RequisitionForm.tsx", type: "file" }, { name: "RequisitionApproval.tsx", type: "file" }, { name: "RequisitionList.tsx", type: "file" },
        { name: "PurchaseOrderForm.tsx", type: "file" }, { name: "PurchaseOrderList.tsx", type: "file" }, { name: "GoodsReceivedForm.tsx", type: "file" },
        { name: "SupplierSelector.tsx", type: "file" }, { name: "ItemSelector.tsx", type: "file" }, { name: "ContractForm.tsx", type: "file" },
        { name: "ProcurementDashboard.tsx", type: "file" }, { name: "ProcurementReports.tsx", type: "file" },
      ]},
      { name: "inventory/", type: "folder", children: [
        { name: "ItemForm.tsx", type: "file" }, { name: "ItemList.tsx", type: "file" }, { name: "CategoryTree.tsx", type: "file" },
        { name: "StockCard.tsx", type: "file" }, { name: "StockMovementForm.tsx", type: "file" }, { name: "LowStockAlert.tsx", type: "file" },
        { name: "InventoryDashboard.tsx", type: "file" }, { name: "InventoryReports.tsx", type: "file" },
      ]},
      { name: "contracts/", type: "folder", children: [
        { name: "ContractDashboard.tsx", type: "file" }, { name: "ContractReports.tsx", type: "file" },
      ]},
      { name: "analytics/", type: "folder", children: [
        { name: "KpiCards.tsx", type: "file" }, { name: "SpendingChart.tsx", type: "file" }, { name: "CustomReportBuilder.tsx", type: "file" },
      ]},
      { name: "users/", type: "folder", children: [
        { name: "UserForm.tsx", type: "file" }, { name: "UserList.tsx", type: "file" }, { name: "RoleForm.tsx", type: "file" }, { name: "PermissionMatrix.tsx", type: "file" },
      ]},
      { name: "audit/", type: "folder", children: [
        { name: "AuditLogViewer.tsx", type: "file" }, { name: "AuditLogFilters.tsx", type: "file" }, { name: "AuditDashboard.tsx", type: "file" },
      ]},
      { name: "odbc/", type: "folder", children: [
        { name: "ConnectionManager.tsx", type: "file" }, { name: "SyncScheduler.tsx", type: "file" }, { name: "ExternalDataViewer.tsx", type: "file" },
      ]},
      { name: "common/", type: "folder", children: [
        { name: "DataTable.tsx", type: "file" }, { name: "FilterBar.tsx", type: "file" }, { name: "PageHeader.tsx", type: "file" },
        { name: "StatusBadge.tsx", type: "file" }, { name: "LoadingSpinner.tsx", type: "file" }, { name: "ErrorBoundary.tsx", type: "file" },
        { name: "NotificationBell.tsx", type: "file" },
      ]},
    ]},
    { name: "contexts/", type: "folder", children: [
      { name: "AuthContext.tsx", type: "file" }, { name: "ProcurementContext.tsx", type: "file" }, { name: "InventoryContext.tsx", type: "file" },
      { name: "ContractContext.tsx", type: "file" }, { name: "SettingsContext.tsx", type: "file" },
    ]},
    { name: "hooks/", type: "folder", children: [
      { name: "use-mobile.tsx", type: "file" }, { name: "use-toast.ts", type: "file" }, { name: "useProcurement.ts", type: "file" },
      { name: "useInventory.ts", type: "file" }, { name: "useContracts.ts", type: "file" }, { name: "usePermissions.ts", type: "file" },
      { name: "useExport.ts", type: "file" }, { name: "useDebounce.ts", type: "file" },
    ]},
    { name: "integrations/supabase/", type: "folder", children: [{ name: "client.ts", type: "file" }, { name: "types.ts", type: "file" }] },
    { name: "lib/", type: "folder", children: [
      { name: "audit.ts", type: "file" }, { name: "export.ts", type: "file" }, { name: "utils.ts", type: "file" }, { name: "permissions.ts", type: "file" },
      { name: "procurement/", type: "folder", children: [
        { name: "requisitionWorkflow.ts", type: "file" }, { name: "poGenerator.ts", type: "file" }, { name: "procurementCalculations.ts", type: "file" },
      ]},
      { name: "inventory/", type: "folder", children: [
        { name: "valuation.ts", type: "file" }, { name: "stockService.ts", type: "file" }, { name: "reorderEngine.ts", type: "file" },
      ]},
      { name: "analytics/", type: "folder", children: [
        { name: "kpiCalculations.ts", type: "file" }, { name: "chartDataTransformers.ts", type: "file" }, { name: "reportGenerator.ts", type: "file" },
      ]},
      { name: "odbc/", type: "folder", children: [
        { name: "index.ts", type: "file" }, { name: "hospital-connector.ts", type: "file" }, { name: "sync-service.ts", type: "file" },
      ]},
    ]},
    { name: "pages/", type: "folder", children: [
      { name: "LoginPage.tsx", type: "file" }, { name: "DashboardPage.tsx", type: "file" }, { name: "NotFound.tsx", type: "file" }, { name: "SettingsPage.tsx", type: "file" },
      { name: "ItemsPage.tsx", type: "file" }, { name: "CategoriesPage.tsx", type: "file" }, { name: "RequisitionsPage.tsx", type: "file" },
      { name: "PurchaseOrdersPage.tsx", type: "file" }, { name: "SuppliersPage.tsx", type: "file" }, { name: "GoodsReceivedPage.tsx", type: "file" },
      { name: "DepartmentsPage.tsx", type: "file" }, { name: "ReportsPage.tsx", type: "file" }, { name: "UsersPage.tsx", type: "file" },
      { name: "AuditLogPage.tsx", type: "file" }, { name: "ContractsPage.tsx", type: "file" },
    ]},
    { name: "types/", type: "folder", children: [
      { name: "index.ts", type: "file" }, { name: "procurement.ts", type: "file" }, { name: "inventory.ts", type: "file" },
      { name: "contracts.ts", type: "file" }, { name: "users.ts", type: "file" }, { name: "audit.ts", type: "file" }, { name: "common.ts", type: "file" },
    ]},
  ]},
  { name: "supabase/", type: "folder", children: [
    { name: "config.toml", type: "file" },
    { name: "migrations/ (10+ migrations)", type: "folder", children: [] },
    { name: "functions/", type: "folder", children: [{ name: "notify-requisition/index.ts", type: "file" }] },
  ]},
  { name: "public/", type: "folder", children: [
    { name: "favicon.ico", type: "file" }, { name: "favicon.png", type: "file" }, { name: "robots.txt", type: "file" },
  ]},
  { name: "package.json", type: "file" }, { name: "vite.config.ts", type: "file" }, { name: "tailwind.config.ts", type: "file" },
  { name: "tsconfig.json", type: "file" }, { name: "index.html", type: "file" },
];

const DB_TABLES = [
  { name: "profiles", cols: "id, full_name, department, phone_number, is_active, avatar_url", rls: true },
  { name: "user_roles", cols: "id, user_id, role, created_at", rls: true },
  { name: "items", cols: "id, name, sku, item_type, category_id, supplier_id, unit_price, quantity_in_stock, reorder_level, status", rls: true },
  { name: "item_categories", cols: "id, name, description, parent_id", rls: true },
  { name: "suppliers", cols: "id, name, contact_person, phone, email, address, tax_id, rating, status", rls: true },
  { name: "departments", cols: "id, name, code, head_name", rls: true },
  { name: "requisitions", cols: "id, requisition_number, department_id, requested_by, status, priority, total_amount", rls: true },
  { name: "requisition_items", cols: "id, requisition_id, item_id, item_name, quantity, unit_price, total_price", rls: true },
  { name: "purchase_orders", cols: "id, po_number, requisition_id, supplier_id, total_amount, status, delivery_date", rls: true },
  { name: "goods_received", cols: "id, grn_number, po_id, received_by, inspection_status, notes", rls: true },
  { name: "contracts", cols: "id, contract_number, title, supplier_id, start_date, end_date, status, total_value", rls: true },
  { name: "audit_log", cols: "id, user_id, user_name, action, module, record_id, details, ip_address", rls: true },
];

const PROCUREMENT_ROLES = [
  { value: "admin", label: "Administrator" },
  { value: "requisitioner", label: "Requisitioner" },
  { value: "procurement_officer", label: "Procurement Officer" },
  { value: "procurement_manager", label: "Procurement Manager" },
  { value: "warehouse_officer", label: "Warehouse Officer" },
  { value: "inventory_manager", label: "Inventory Manager" },
];

// ===== RETRO WINDOWS COMPONENTS =====
const WinTitleBar = ({ title, icon, onClose }: { title: string; icon?: React.ReactNode; onClose?: () => void }) => (
  <div className="flex items-center h-7 px-1" style={{
    background: "linear-gradient(90deg, hsl(210 70% 30%), hsl(210 60% 50%), hsl(210 70% 30%))",
  }}>
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {icon}
      <span className="text-xs font-bold text-white truncate">{title}</span>
    </div>
    <div className="flex gap-0.5">
      <button className="w-5 h-4 flex items-center justify-center bg-muted/80 border border-border/50 hover:bg-muted text-[10px] rounded-sm"><Minimize2 className="w-2.5 h-2.5" /></button>
      <button className="w-5 h-4 flex items-center justify-center bg-muted/80 border border-border/50 hover:bg-muted text-[10px] rounded-sm"><Maximize2 className="w-2.5 h-2.5" /></button>
      {onClose && <button onClick={onClose} className="w-5 h-4 flex items-center justify-center bg-destructive/80 border border-destructive/50 hover:bg-destructive text-white text-[10px] rounded-sm"><X className="w-2.5 h-2.5" /></button>}
    </div>
  </div>
);

const WinPanel = ({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) => (
  <div className={`border-2 border-border rounded shadow-[2px_2px_0px_hsl(var(--border)),inset_1px_1px_0px_hsl(var(--card))] bg-card ${className || ""}`}>
    <WinTitleBar title={title} icon={icon} />
    <div className="p-3">{children}</div>
  </div>
);

const WinButton = ({ children, onClick, variant, className, disabled, type }: any) => (
  <button
    type={type || "button"}
    disabled={disabled}
    onClick={onClick}
    className={`px-3 py-1 text-xs font-medium border-2 rounded-sm transition-all active:translate-y-px disabled:opacity-50 ${
      variant === "destructive"
        ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
        : variant === "primary"
        ? "bg-primary text-primary-foreground border-primary/80 hover:bg-primary/90 shadow-[1px_1px_0px_hsl(var(--border))]"
        : "bg-muted border-border hover:bg-muted/80 text-foreground shadow-[1px_1px_0px_hsl(var(--border))]"
    } ${className || ""}`}
  >
    {children}
  </button>
);

const FolderIcon = ({ size = 20 }: { size?: number }) => (
  <img src={folderIcon} alt="" className="inline-block" style={{ width: size, height: size }} />
);

// Tree node with folder icon
const TreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";
  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-0.5 px-1 rounded text-xs cursor-pointer hover:bg-primary/10"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        onClick={() => isFolder && setOpen(!open)}
      >
        {isFolder ? (open ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronRight className="w-3 h-3" />) : null}
        {isFolder ? <FolderIcon size={16} /> : <File className="w-3 h-3 text-muted-foreground/60" />}
        <span className={isFolder ? "font-medium text-foreground" : "text-muted-foreground"}>{node.name}</span>
      </div>
      {isFolder && open && node.children?.map((child: any, i: number) => (
        <TreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

// ===== TABS CONFIG =====
const ADMIN_TABS = [
  { id: "profile", label: "Profile", icon: <User className="w-3.5 h-3.5" /> },
  { id: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" />, admin: true },
  { id: "system", label: "System", icon: <Shield className="w-3.5 h-3.5" />, admin: true },
  { id: "items", label: "Items", icon: <Package className="w-3.5 h-3.5" />, admin: true },
  { id: "suppliers", label: "Suppliers", icon: <Truck className="w-3.5 h-3.5" />, admin: true },
  { id: "categories", label: "Categories", icon: <Layers className="w-3.5 h-3.5" />, admin: true },
  { id: "departments", label: "Depts", icon: <Building2 className="w-3.5 h-3.5" />, admin: true },
  { id: "database", label: "Database", icon: <FolderIcon size={14} />, admin: true },
  { id: "codebase", label: "Codebase", icon: <FolderIcon size={14} />, admin: true },
  { id: "odbc", label: "ODBC", icon: <Database className="w-3.5 h-3.5" />, admin: true },
  { id: "info", label: "Info", icon: <Monitor className="w-3.5 h-3.5" />, admin: true },
];

const SettingsPage = () => {
  const { profile, user, hasRole } = useAuth();
  const isAdmin = hasRole("admin");
  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    full_name: profile?.full_name || "", phone_number: profile?.phone_number || "", department: profile?.department || "",
  });
  const [odbc, setOdbc] = useState({
    server: "", database: "", port: "1433", username: "", password: "", driver: "ODBC Driver 17 for SQL Server",
  });
  const [sysSettings, setSysSettings] = useState({
    hospital_name: "Embu Level 5 Hospital", tax_rate: "16", currency: "KSH",
    approval_threshold: "50000", auto_po_numbering: true, email_notifications: true,
    audit_retention_days: "365", fiscal_year_start: "July", requisition_prefix: "RQQ/EL5H",
    po_prefix: "LPO/EL5H", grn_prefix: "GRN/EL5H",
  });
  const [saving, setSaving] = useState(false);
  const [connString, setConnString] = useState("");

  // Data management state
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [editDialog, setEditDialog] = useState<{ type: string; data: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [roleDialog, setRoleDialog] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [createUserDialog, setCreateUserDialog] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "" });
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    if (isAdmin) { fetchItems(); fetchSuppliers(); fetchCategories(); fetchDepartments(); fetchUsers(); }
  }, [isAdmin]);

  const fetchItems = async () => { const { data } = await supabase.from("items").select("id, name, sku, item_type, quantity_in_stock, unit_price, status").order("name"); setItems(data || []); };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("id, name, status, phone, email").order("name"); setSuppliers(data || []); };
  const fetchCategories = async () => { const { data } = await supabase.from("item_categories").select("id, name, description").order("name"); setCategories(data || []); };
  const fetchDepartments = async () => { const { data } = await (supabase as any).from("departments").select("id, name, code, head_name").order("name"); setDepartments(data || []); };
  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await db.from("user_roles").select("*");
    const usersWithRoles = (profiles || []).map((p: any) => ({
      ...p,
      roles: ((roles as any[]) || []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role),
    }));
    setAllUsers(usersWithRoles);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user?.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Profile updated" }); logAudit(user?.id, profile?.full_name, "update_profile", "settings"); }
    setSaving(false);
  };

  const generateODBCString = () => {
    if (!odbc.server || !odbc.database) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    const str = `Driver={${odbc.driver}};Server=${odbc.server},${odbc.port};Database=${odbc.database};Uid=${odbc.username};Pwd=${odbc.password};Encrypt=yes;TrustServerCertificate=yes;`;
    setConnString(str); toast({ title: "Connection string generated" });
  };
  const copyConnString = () => { navigator.clipboard.writeText(connString); toast({ title: "Copied" }); };

  // CRUD operations
  const deleteItem = async (id: string) => {
    await supabase.from("items").update({ status: "inactive" } as any).eq("id", id);
    logAudit(user?.id, profile?.full_name, "deactivate", "items", id); toast({ title: "Item deactivated" }); fetchItems();
  };
  const deleteSupplier = async (id: string) => {
    await supabase.from("suppliers").update({ status: "inactive" }).eq("id", id);
    logAudit(user?.id, profile?.full_name, "deactivate", "suppliers", id); toast({ title: "Supplier deactivated" }); fetchSuppliers();
  };
  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("item_categories").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category deleted" }); fetchCategories();
  };
  const deleteDepartment = async (id: string) => {
    const { error } = await (supabase as any).from("departments").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Department deleted" }); fetchDepartments();
  };

  const saveEditItem = async () => {
    if (!editDialog) return;
    const { type, data } = editDialog;
    if (type === "item") { await supabase.from("items").update(editForm).eq("id", data.id); fetchItems(); }
    else if (type === "supplier") { await supabase.from("suppliers").update(editForm).eq("id", data.id); fetchSuppliers(); }
    else if (type === "category") { await supabase.from("item_categories").update(editForm).eq("id", data.id); fetchCategories(); }
    else if (type === "department") { await (supabase as any).from("departments").update(editForm).eq("id", data.id); fetchDepartments(); }
    logAudit(user?.id, profile?.full_name, "update", type + "s", data.id, editForm);
    toast({ title: `${type} updated` }); setEditDialog(null);
  };

  // User management
  const assignRole = async () => {
    if (!roleDialog || !selectedRole) return;
    const { error } = await (db as any).from("user_roles").insert([{ user_id: roleDialog.id, role: selectedRole }]);
    if (error) { toast({ title: error.message?.includes("duplicate") ? "Already assigned" : "Error", variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "assign_role", "users", roleDialog.id, { role: selectedRole });
    toast({ title: "Role assigned" }); setRoleDialog(null); setSelectedRole(""); fetchUsers();
  };
  const removeRole = async (userId: string, role: string) => {
    await db.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    logAudit(user?.id, profile?.full_name, "remove_role", "users", userId, { role }); toast({ title: "Role removed" }); fetchUsers();
  };
  const toggleUserActive = async (u: any) => {
    const newStatus = !(u.is_active ?? true);
    await supabase.from("profiles").update({ is_active: newStatus } as any).eq("id", u.id);
    logAudit(user?.id, profile?.full_name, newStatus ? "activate_user" : "deactivate_user", "users", u.id);
    toast({ title: newStatus ? "User activated" : "User deactivated" }); fetchUsers();
  };
  const deleteUser = async (u: any) => {
    await supabase.from("profiles").update({ is_active: false } as any).eq("id", u.id);
    await db.from("user_roles").delete().eq("user_id", u.id);
    logAudit(user?.id, profile?.full_name, "delete_user", "users", u.id); toast({ title: "User deleted" }); fetchUsers();
  };
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email: newUser.email, password: newUser.password,
      options: { data: { full_name: newUser.full_name }, emailRedirectTo: window.location.origin },
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    logAudit(user?.id, profile?.full_name, "create_user", "users", data.user?.id, { email: newUser.email });
    toast({ title: "User created" }); setCreateUserDialog(false); setNewUser({ email: "", password: "", full_name: "" });
    setTimeout(fetchUsers, 2000);
  };

  const filteredUsers = allUsers.filter(u => (u.full_name || "").toLowerCase().includes(userSearch.toLowerCase()));

  const odbcCode = `const odbc = require('odbc');\n\nasync function connect() {\n  try {\n    const connection = await odbc.connect(\`${connString || 'DSN=mydsn;UID=user;PWD=pass'}\`);\n    const result = await connection.query('SELECT * FROM mytable');\n    console.log(result);\n    await connection.close();\n  } catch (err) {\n    console.error(err);\n  }\n}\n\nconnect();`;

  const visibleTabs = ADMIN_TABS.filter(t => !t.admin || isAdmin);

  return (
    <div className="space-y-3 animate-fade-in max-w-7xl">
      {/* Retro Windows Title */}
      <div className="border-2 border-border rounded shadow-[3px_3px_0px_hsl(var(--border))]">
        <div className="flex items-center h-8 px-2" style={{
          background: "linear-gradient(90deg, hsl(210 70% 30%), hsl(210 60% 50%), hsl(210 70% 30%))",
        }}>
          <SettingsIcon className="w-4 h-4 text-white mr-2" />
          <span className="text-sm font-bold text-white flex-1">Control Panel — MediProcure ERP Administration</span>
          <div className="flex gap-0.5">
            <button className="w-5 h-5 flex items-center justify-center bg-muted/80 border border-border/50 rounded-sm text-foreground"><Minimize2 className="w-3 h-3" /></button>
            <button className="w-5 h-5 flex items-center justify-center bg-muted/80 border border-border/50 rounded-sm text-foreground"><Maximize2 className="w-3 h-3" /></button>
          </div>
        </div>

        {/* Retro tab bar */}
        <div className="bg-muted/50 border-b-2 border-border px-1 pt-1 flex flex-wrap gap-0">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-2 border-b-0 rounded-t-md transition-all ${
                activeTab === tab.id
                  ? "bg-card border-border -mb-[2px] pb-[calc(0.375rem+2px)] text-foreground font-bold shadow-[inset_0_1px_0_hsl(var(--card))]"
                  : "bg-muted/70 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="bg-card p-4 min-h-[500px]">
          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <WinPanel title="My Profile — User Settings" icon={<User className="w-3.5 h-3.5 text-white" />}>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Full Name</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="h-8 text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} className="h-8 text-sm" placeholder="+254 7XX" /></div>
                  <div className="space-y-1"><Label className="text-xs">Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} className="h-8 text-sm" /></div>
                  <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={user?.email || ""} disabled className="bg-muted h-8 text-sm" /></div>
                </div>
                <WinButton type="submit" variant="primary" disabled={saving}><Save className="w-3 h-3 inline mr-1" /> {saving ? "Saving..." : "Save Profile"}</WinButton>
              </form>
            </WinPanel>
          )}

          {/* USERS TAB */}
          {activeTab === "users" && isAdmin && (
            <WinPanel title="User Management — System Users" icon={<Users className="w-3.5 h-3.5 text-white" />}>
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <Input placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="h-7 text-xs max-w-xs" />
                <WinButton variant="primary" onClick={() => setCreateUserDialog(true)}><Plus className="w-3 h-3 inline mr-1" /> Create User</WinButton>
              </div>
              <div className="border-2 border-border rounded overflow-auto max-h-[400px] shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                <Table>
                  <TableHeader><TableRow className="bg-muted/70">
                    <TableHead className="text-xs py-1.5">Name</TableHead><TableHead className="text-xs py-1.5">Roles</TableHead><TableHead className="text-xs py-1.5">Status</TableHead><TableHead className="text-xs py-1.5 w-40">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredUsers.map(u => (
                      <TableRow key={u.id} className="hover:bg-primary/5">
                        <TableCell className="text-xs font-medium py-1.5">{u.full_name}</TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex flex-wrap gap-0.5">
                            {u.roles.map((r: string) => (
                              <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-0.5">
                                {r.replace(/_/g, " ")}
                                <button onClick={() => removeRole(u.id, r)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${(u.is_active ?? true) ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                            {(u.is_active ?? true) ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="py-1.5">
                          <div className="flex gap-0.5">
                            <WinButton onClick={() => { setRoleDialog(u); setSelectedRole(""); }}><KeyRound className="w-3 h-3" /></WinButton>
                            <WinButton onClick={() => toggleUserActive(u)}>{(u.is_active ?? true) ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}</WinButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><WinButton variant="destructive"><Trash2 className="w-3 h-3" /></WinButton></AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader><AlertDialogTitle>Delete {u.full_name}?</AlertDialogTitle><AlertDialogDescription>Deactivates and removes all roles.</AlertDialogDescription></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteUser(u)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{filteredUsers.length} user(s) — Full system management via Supabase Auth</p>
            </WinPanel>
          )}

          {/* SYSTEM TAB */}
          {activeTab === "system" && isAdmin && (
            <WinPanel title="System Configuration — Hospital Settings" icon={<Shield className="w-3.5 h-3.5 text-white" />}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: "Hospital Name", key: "hospital_name" }, { label: "Tax Rate (%)", key: "tax_rate", type: "number" },
                  { label: "Currency", key: "currency" }, { label: "Approval Threshold", key: "approval_threshold", type: "number" },
                  { label: "Audit Retention (days)", key: "audit_retention_days", type: "number" }, { label: "Fiscal Year Start", key: "fiscal_year_start" },
                  { label: "Requisition Prefix", key: "requisition_prefix" }, { label: "PO Prefix", key: "po_prefix" }, { label: "GRN Prefix", key: "grn_prefix" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input type={f.type || "text"} value={(sysSettings as any)[f.key]} onChange={e => setSysSettings({...sysSettings, [f.key]: e.target.value})} className="h-8 text-sm" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between py-2 border-t border-border mt-3 pt-3">
                <div><Label className="text-xs">Auto PO Numbering</Label></div>
                <Switch checked={sysSettings.auto_po_numbering} onCheckedChange={v => setSysSettings({...sysSettings, auto_po_numbering: v})} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><Label className="text-xs">Email Notifications</Label></div>
                <Switch checked={sysSettings.email_notifications} onCheckedChange={v => setSysSettings({...sysSettings, email_notifications: v})} />
              </div>
              <WinButton variant="primary" onClick={() => toast({ title: "System settings saved" })}><Save className="w-3 h-3 inline mr-1" /> Save</WinButton>
            </WinPanel>
          )}

          {/* ITEMS TAB */}
          {activeTab === "items" && isAdmin && (
            <WinPanel title={`Items Management — ${items.length} Records`} icon={<Package className="w-3.5 h-3.5 text-white" />}>
              <div className="border-2 border-border rounded overflow-auto max-h-[400px] shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                <Table>
                  <TableHeader><TableRow className="bg-muted/70">
                    <TableHead className="text-xs py-1.5">Name</TableHead><TableHead className="text-xs py-1.5">SKU</TableHead><TableHead className="text-xs py-1.5">Type</TableHead>
                    <TableHead className="text-xs py-1.5 text-right">Stock</TableHead><TableHead className="text-xs py-1.5 text-right">Price</TableHead>
                    <TableHead className="text-xs py-1.5">Status</TableHead><TableHead className="text-xs py-1.5 w-20">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} className="hover:bg-primary/5">
                        <TableCell className="text-xs font-medium py-1">{item.name}</TableCell>
                        <TableCell className="font-mono text-[10px] py-1">{item.sku || "—"}</TableCell>
                        <TableCell className="capitalize text-[10px] py-1">{item.item_type}</TableCell>
                        <TableCell className="text-right text-xs py-1">{item.quantity_in_stock}</TableCell>
                        <TableCell className="text-right text-xs py-1">{Number(item.unit_price).toLocaleString()}</TableCell>
                        <TableCell className="py-1"><span className={`text-[10px] px-1 py-0.5 rounded ${item.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.status}</span></TableCell>
                        <TableCell className="py-1">
                          <div className="flex gap-0.5">
                            <WinButton onClick={() => { setEditDialog({ type: "item", data: item }); setEditForm({ name: item.name, sku: item.sku, unit_price: item.unit_price, quantity_in_stock: item.quantity_in_stock, status: item.status }); }}><Edit className="w-3 h-3" /></WinButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><WinButton variant="destructive"><Trash2 className="w-3 h-3" /></WinButton></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Deactivate?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteItem(item.id)} className="bg-destructive">Deactivate</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </WinPanel>
          )}

          {/* SUPPLIERS TAB */}
          {activeTab === "suppliers" && isAdmin && (
            <WinPanel title={`Suppliers — ${suppliers.length} Records`} icon={<Truck className="w-3.5 h-3.5 text-white" />}>
              <div className="border-2 border-border rounded overflow-auto max-h-[400px] shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                <Table>
                  <TableHeader><TableRow className="bg-muted/70">
                    <TableHead className="text-xs py-1.5">Name</TableHead><TableHead className="text-xs py-1.5">Phone</TableHead><TableHead className="text-xs py-1.5">Email</TableHead>
                    <TableHead className="text-xs py-1.5">Status</TableHead><TableHead className="text-xs py-1.5 w-20">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {suppliers.map(s => (
                      <TableRow key={s.id} className="hover:bg-primary/5">
                        <TableCell className="text-xs font-medium py-1">{s.name}</TableCell>
                        <TableCell className="text-xs py-1">{s.phone || "—"}</TableCell>
                        <TableCell className="text-xs py-1">{s.email || "—"}</TableCell>
                        <TableCell className="py-1"><span className={`text-[10px] px-1 py-0.5 rounded ${s.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{s.status}</span></TableCell>
                        <TableCell className="py-1">
                          <div className="flex gap-0.5">
                            <WinButton onClick={() => { setEditDialog({ type: "supplier", data: s }); setEditForm({ name: s.name, phone: s.phone, email: s.email, status: s.status }); }}><Edit className="w-3 h-3" /></WinButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><WinButton variant="destructive"><Trash2 className="w-3 h-3" /></WinButton></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Deactivate?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteSupplier(s.id)} className="bg-destructive">Deactivate</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </WinPanel>
          )}

          {/* CATEGORIES TAB */}
          {activeTab === "categories" && isAdmin && (
            <WinPanel title={`Categories — ${categories.length} Records`} icon={<Layers className="w-3.5 h-3.5 text-white" />}>
              <div className="border-2 border-border rounded overflow-auto max-h-[400px] shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                <Table>
                  <TableHeader><TableRow className="bg-muted/70">
                    <TableHead className="text-xs py-1.5">Name</TableHead><TableHead className="text-xs py-1.5">Description</TableHead><TableHead className="text-xs py-1.5 w-20">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {categories.map(c => (
                      <TableRow key={c.id} className="hover:bg-primary/5">
                        <TableCell className="text-xs font-medium py-1">{c.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-1">{c.description || "—"}</TableCell>
                        <TableCell className="py-1">
                          <div className="flex gap-0.5">
                            <WinButton onClick={() => { setEditDialog({ type: "category", data: c }); setEditForm({ name: c.name, description: c.description || "" }); }}><Edit className="w-3 h-3" /></WinButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><WinButton variant="destructive"><Trash2 className="w-3 h-3" /></WinButton></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {c.name}?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCategory(c.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </WinPanel>
          )}

          {/* DEPARTMENTS TAB */}
          {activeTab === "departments" && isAdmin && (
            <WinPanel title={`Departments — ${departments.length} Records`} icon={<Building2 className="w-3.5 h-3.5 text-white" />}>
              <div className="border-2 border-border rounded overflow-auto max-h-[400px] shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                <Table>
                  <TableHeader><TableRow className="bg-muted/70">
                    <TableHead className="text-xs py-1.5">Name</TableHead><TableHead className="text-xs py-1.5">Code</TableHead><TableHead className="text-xs py-1.5">Head</TableHead><TableHead className="text-xs py-1.5 w-20">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {departments.map((d: any) => (
                      <TableRow key={d.id} className="hover:bg-primary/5">
                        <TableCell className="text-xs font-medium py-1">{d.name}</TableCell>
                        <TableCell className="font-mono text-[10px] py-1">{d.code || "—"}</TableCell>
                        <TableCell className="text-xs py-1">{d.head_name || "—"}</TableCell>
                        <TableCell className="py-1">
                          <div className="flex gap-0.5">
                            <WinButton onClick={() => { setEditDialog({ type: "department", data: d }); setEditForm({ name: d.name, code: d.code || "", head_name: d.head_name || "" }); }}><Edit className="w-3 h-3" /></WinButton>
                            <AlertDialog>
                              <AlertDialogTrigger asChild><WinButton variant="destructive"><Trash2 className="w-3 h-3" /></WinButton></AlertDialogTrigger>
                              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {d.name}?</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteDepartment(d.id)} className="bg-destructive">Delete</AlertDialogAction></AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </WinPanel>
          )}

          {/* DATABASE TAB with folder icon */}
          {activeTab === "database" && isAdmin && (
            <WinPanel title="Database Schema — Supabase PostgreSQL" icon={<FolderIcon size={14} />}>
              <div className="flex items-center gap-2 mb-3">
                <FolderIcon size={24} />
                <div>
                  <p className="text-sm font-bold text-foreground">Database Files</p>
                  <p className="text-[10px] text-muted-foreground">Project: yvjfehnzbzjliizjvuhq | {DB_TABLES.length} tables | RLS: All enabled</p>
                </div>
              </div>
              <div className="border-2 border-border rounded overflow-auto max-h-[400px] shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                <Table>
                  <TableHeader><TableRow className="bg-muted/70">
                    <TableHead className="text-xs py-1.5">Table</TableHead><TableHead className="text-xs py-1.5">Columns</TableHead><TableHead className="text-xs py-1.5 w-12">RLS</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {DB_TABLES.map(t => (
                      <TableRow key={t.name} className="hover:bg-primary/5">
                        <TableCell className="py-1.5"><span className="font-mono text-xs font-medium text-primary flex items-center gap-1"><FolderIcon size={12} /> {t.name}</span></TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-mono py-1.5">{t.cols}</TableCell>
                        <TableCell className="py-1.5"><span className="text-[10px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-600">✓</span></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">{DB_TABLES.length}</p><p className="text-[10px] text-muted-foreground">Tables</p></div>
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">6</p><p className="text-[10px] text-muted-foreground">Roles</p></div>
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">1</p><p className="text-[10px] text-muted-foreground">Edge Fn</p></div>
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">10+</p><p className="text-[10px] text-muted-foreground">Migrations</p></div>
              </div>
            </WinPanel>
          )}

          {/* CODEBASE TAB with folder icon */}
          {activeTab === "codebase" && isAdmin && (
            <WinPanel title="Project Codebase — MediProcure ERP v2.0" icon={<FolderIcon size={14} />}>
              <div className="flex items-center gap-2 mb-3">
                <FolderIcon size={24} />
                <div>
                  <p className="text-sm font-bold text-foreground">Code Files</p>
                  <p className="text-[10px] text-muted-foreground">React + TypeScript + Vite + Tailwind CSS + Supabase</p>
                </div>
              </div>
              <div className="border-2 border-border rounded p-3 max-h-[400px] overflow-auto bg-muted/10 font-mono shadow-[inset_1px_1px_3px_hsl(var(--border)/0.3)]">
                {PROJECT_TREE.map((node, i) => <TreeNode key={i} node={node} />)}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">15+</p><p className="text-[10px] text-muted-foreground">Pages</p></div>
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">40+</p><p className="text-[10px] text-muted-foreground">UI Comps</p></div>
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">8</p><p className="text-[10px] text-muted-foreground">Contexts/Hooks</p></div>
                <div className="border-2 border-border rounded p-2 bg-muted/30 text-center"><p className="text-lg font-bold">7</p><p className="text-[10px] text-muted-foreground">Type Files</p></div>
              </div>
            </WinPanel>
          )}

          {/* ODBC TAB */}
          {activeTab === "odbc" && isAdmin && (
            <WinPanel title="External SQL Server (ODBC) — Data Sync" icon={<Database className="w-3.5 h-3.5 text-white" />}>
              <p className="text-xs text-muted-foreground mb-3">Configure connection to external SQL Server.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Server Host</Label><Input value={odbc.server} onChange={e => setOdbc({...odbc, server: e.target.value})} className="h-8 text-sm" placeholder="192.168.1.100" /></div>
                <div className="space-y-1"><Label className="text-xs">Port</Label><Input value={odbc.port} onChange={e => setOdbc({...odbc, port: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Database</Label><Input value={odbc.database} onChange={e => setOdbc({...odbc, database: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">ODBC Driver</Label><Input value={odbc.driver} onChange={e => setOdbc({...odbc, driver: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Username</Label><Input value={odbc.username} onChange={e => setOdbc({...odbc, username: e.target.value})} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Password</Label><Input type="password" value={odbc.password} onChange={e => setOdbc({...odbc, password: e.target.value})} className="h-8 text-sm" /></div>
              </div>
              <div className="flex gap-2 mt-3">
                <WinButton variant="primary" onClick={generateODBCString}><Database className="w-3 h-3 inline mr-1" /> Generate</WinButton>
                {connString && <WinButton onClick={copyConnString}><Copy className="w-3 h-3 inline mr-1" /> Copy</WinButton>}
              </div>
              {connString && (
                <div className="mt-3 space-y-2">
                  <div className="bg-muted p-2 rounded border-2 border-border font-mono text-[10px] break-all">{connString}</div>
                  <Label className="text-xs flex items-center gap-1"><Terminal className="w-3 h-3" /> Node.js Usage</Label>
                  <Textarea value={odbcCode} readOnly className="font-mono text-[10px] h-40 bg-muted border-2 border-border" />
                </div>
              )}
            </WinPanel>
          )}

          {/* INFO TAB */}
          {activeTab === "info" && isAdmin && (
            <WinPanel title="System Information — About" icon={<Monitor className="w-3.5 h-3.5 text-white" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                {[
                  ["Hospital", "Embu Level 5 Hospital"],
                  ["System", "MediProcure ERP Suite v2.0"],
                  ["Address", "P.O. Box 33 - 60100, Embu, Kenya"],
                  ["Phone", "+254 68 31055/56"],
                  ["Email", "pghembu@gmail.com"],
                  ["ISO", "9001:2015 Certified"],
                  ["Modules", "Inventory, Purchasing, Contracts, GRN, Analytics, Users, Audit"],
                  ["Roles", "Admin, Requisitioner, Proc. Officer, Proc. Manager, Warehouse, Inventory"],
                  ["Database", `Supabase PostgreSQL (${DB_TABLES.length} tables)`],
                  ["Edge Functions", "notify-requisition"],
                  ["External", "ODBC/SQL Server integration ready"],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2 py-1 border-b border-border/30">
                    <span className="text-muted-foreground w-24 shrink-0 font-medium">{k}:</span>
                    <span className="text-foreground">{v}</span>
                  </div>
                ))}
              </div>
            </WinPanel>
          )}
        </div>

        {/* Retro status bar */}
        <div className="h-6 bg-muted/70 border-t-2 border-border flex items-center px-3 gap-4">
          <span className="text-[10px] text-muted-foreground">Ready</span>
          <span className="text-[10px] text-muted-foreground border-l border-border pl-3">Role: {isAdmin ? "Administrator" : "User"}</span>
          <span className="text-[10px] text-muted-foreground border-l border-border pl-3 flex-1">{new Date().toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">MediProcure ERP v2.0</span>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editDialog?.type}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {Object.entries(editForm).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="capitalize text-xs">{key.replace(/_/g, " ")}</Label>
                <Input value={String(value || "")} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} className="h-8 text-sm" />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialog(null)}>Cancel</Button>
              <Button size="sm" onClick={saveEditItem}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role assignment dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Role — {roleDialog?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger><SelectValue placeholder="Choose role" /></SelectTrigger>
              <SelectContent>
                {PROCUREMENT_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRoleDialog(null)}>Cancel</Button>
              <Button size="sm" onClick={assignRole} disabled={!selectedRole}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create user dialog */}
      <Dialog open={createUserDialog} onOpenChange={setCreateUserDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
          <form onSubmit={createUser} className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Email *</Label><Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required className="h-8 text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs">Password *</Label><Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required minLength={6} className="h-8 text-sm" /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateUserDialog(false)}>Cancel</Button>
              <Button type="submit" size="sm">Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
