import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase, db } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon, Save, User, Building2, Database, Shield, Copy, Terminal,
  Package, Truck, Layers, Trash2, Edit, Plus, FileText, FolderTree, ChevronRight, ChevronDown, File, Folder,
} from "lucide-react";
import { logAudit } from "@/lib/audit";

// ===== PROJECT FILE TREE =====
const PROJECT_TREE = [
  { name: "src/", type: "folder", children: [
    { name: "main.tsx", type: "file" }, { name: "App.tsx", type: "file" }, { name: "App.css", type: "file" }, { name: "index.css", type: "file" },
    { name: "assets/", type: "folder", children: [
      { name: "embu-county-logo.jpg", type: "file" }, { name: "logo.png", type: "file" }, { name: "procurement-bg.jpg", type: "file" },
    ]},
    { name: "components/", type: "folder", children: [
      { name: "AppLayout.tsx", type: "file" }, { name: "NavLink.tsx", type: "file" }, { name: "ProtectedRoute.tsx", type: "file" },
      { name: "ui/ (shadcn — 40+ components)", type: "folder", children: [] },
    ]},
    { name: "contexts/", type: "folder", children: [{ name: "AuthContext.tsx", type: "file" }] },
    { name: "hooks/", type: "folder", children: [{ name: "use-mobile.tsx", type: "file" }, { name: "use-toast.ts", type: "file" }] },
    { name: "integrations/supabase/", type: "folder", children: [{ name: "client.ts", type: "file" }, { name: "types.ts", type: "file" }] },
    { name: "lib/", type: "folder", children: [{ name: "audit.ts", type: "file" }, { name: "export.ts", type: "file" }, { name: "utils.ts", type: "file" }] },
    { name: "pages/", type: "folder", children: [
      { name: "LoginPage.tsx", type: "file" }, { name: "ItemsPage.tsx", type: "file" }, { name: "CategoriesPage.tsx", type: "file" },
      { name: "RequisitionsPage.tsx", type: "file" }, { name: "PurchaseOrdersPage.tsx", type: "file" }, { name: "SuppliersPage.tsx", type: "file" },
      { name: "GoodsReceivedPage.tsx", type: "file" }, { name: "DepartmentsPage.tsx", type: "file" }, { name: "ReportsPage.tsx", type: "file" },
      { name: "UsersPage.tsx", type: "file" }, { name: "SettingsPage.tsx", type: "file" }, { name: "AuditLogPage.tsx", type: "file" },
      { name: "ContractsPage.tsx", type: "file" }, { name: "NotFound.tsx", type: "file" },
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
  { name: "profiles", cols: "id, full_name, department, phone_number, is_active, avatar_url", rls: "Yes" },
  { name: "user_roles", cols: "id, user_id, role, created_at", rls: "Yes" },
  { name: "items", cols: "id, name, sku, item_type, category_id, supplier_id, unit_price, quantity_in_stock, reorder_level, status", rls: "Yes" },
  { name: "item_categories", cols: "id, name, description, parent_id", rls: "Yes" },
  { name: "suppliers", cols: "id, name, contact_person, phone, email, address, tax_id, rating, status", rls: "Yes" },
  { name: "departments", cols: "id, name, code, head_name", rls: "Yes" },
  { name: "requisitions", cols: "id, requisition_number, department_id, requested_by, status, priority, total_amount", rls: "Yes" },
  { name: "requisition_items", cols: "id, requisition_id, item_id, item_name, quantity, unit_price, total_price", rls: "Yes" },
  { name: "purchase_orders", cols: "id, po_number, requisition_id, supplier_id, total_amount, status, delivery_date", rls: "Yes" },
  { name: "goods_received", cols: "id, grn_number, po_id, received_by, inspection_status, notes", rls: "Yes" },
  { name: "contracts", cols: "id, contract_number, title, supplier_id, start_date, end_date, status, total_value, performance_score, milestones", rls: "Yes" },
  { name: "audit_log", cols: "id, user_id, user_name, action, module, record_id, details, ip_address", rls: "Yes" },
];

const TreeNode = ({ node, depth = 0 }: { node: any; depth?: number }) => {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";
  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-0.5 px-1 rounded text-xs cursor-pointer hover:bg-muted/50 ${isFolder ? "font-medium" : "text-muted-foreground"}`}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={() => isFolder && setOpen(!open)}
      >
        {isFolder ? (open ? <ChevronDown className="w-3 h-3 text-primary" /> : <ChevronRight className="w-3 h-3" />) : <File className="w-3 h-3 text-muted-foreground/60" />}
        {isFolder ? <Folder className="w-3 h-3 text-primary" /> : null}
        <span>{node.name}</span>
      </div>
      {isFolder && open && node.children?.map((child: any, i: number) => (
        <TreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

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

  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [editDialog, setEditDialog] = useState<{ type: string; data: any } | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    if (isAdmin) { fetchItems(); fetchSuppliers(); fetchCategories(); fetchDepartments(); }
  }, [isAdmin]);

  const fetchItems = async () => { const { data } = await supabase.from("items").select("id, name, sku, item_type, quantity_in_stock, unit_price, status").order("name"); setItems(data || []); };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("id, name, status, phone, email").order("name"); setSuppliers(data || []); };
  const fetchCategories = async () => { const { data } = await supabase.from("item_categories").select("id, name, description").order("name"); setCategories(data || []); };
  const fetchDepartments = async () => { const { data } = await (supabase as any).from("departments").select("id, name, code, head_name").order("name"); setDepartments(data || []); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user?.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
    setSaving(false);
  };

  const generateODBCString = () => {
    if (!odbc.server || !odbc.database) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    const str = `Driver={${odbc.driver}};Server=${odbc.server},${odbc.port};Database=${odbc.database};Uid=${odbc.username};Pwd=${odbc.password};Encrypt=yes;TrustServerCertificate=yes;`;
    setConnString(str); toast({ title: "Connection string generated" });
  };

  const copyConnString = () => { navigator.clipboard.writeText(connString); toast({ title: "Copied" }); };

  const deleteItem = async (id: string) => {
    await supabase.from("items").update({ status: "inactive" } as any).eq("id", id);
    logAudit(user?.id, profile?.full_name, "deactivate", "items", id);
    toast({ title: "Item deactivated" }); fetchItems();
  };
  const deleteSupplier = async (id: string) => {
    await supabase.from("suppliers").update({ status: "inactive" }).eq("id", id);
    logAudit(user?.id, profile?.full_name, "deactivate", "suppliers", id);
    toast({ title: "Supplier deactivated" }); fetchSuppliers();
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

  const odbcCode = `const odbc = require('odbc');

async function connect() {
  try {
    const connection = await odbc.connect(\`${connString || 'DSN=mydsn;UID=user;PWD=pass'}\`);
    const result = await connection.query('SELECT * FROM mytable');
    console.log(result);
    await connection.close();
  } catch (err) {
    console.error(err);
  }
}

connect();`;

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><SettingsIcon className="w-6 h-6" /> Administration & Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto bg-muted/50 border border-border">
          <TabsTrigger value="profile" className="gap-1.5"><User className="w-3.5 h-3.5" /> Profile</TabsTrigger>
          {isAdmin && <>
            <TabsTrigger value="system" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> System</TabsTrigger>
            <TabsTrigger value="items" className="gap-1.5"><Package className="w-3.5 h-3.5" /> Items</TabsTrigger>
            <TabsTrigger value="suppliers" className="gap-1.5"><Truck className="w-3.5 h-3.5" /> Suppliers</TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5"><Layers className="w-3.5 h-3.5" /> Categories</TabsTrigger>
            <TabsTrigger value="departments" className="gap-1.5"><Building2 className="w-3.5 h-3.5" /> Depts</TabsTrigger>
            <TabsTrigger value="odbc" className="gap-1.5"><Database className="w-3.5 h-3.5" /> ODBC</TabsTrigger>
            <TabsTrigger value="database" className="gap-1.5"><Database className="w-3.5 h-3.5" /> Database</TabsTrigger>
            <TabsTrigger value="codebase" className="gap-1.5"><FolderTree className="w-3.5 h-3.5" /> Codebase</TabsTrigger>
            <TabsTrigger value="info" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Info</TabsTrigger>
          </>}
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-border">
            <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> My Profile</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone_number} onChange={e => setForm({...form, phone_number: e.target.value})} placeholder="+254 7XX" /></div>
                  <div className="space-y-2"><Label>Department</Label><Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled className="bg-muted" /></div>
                </div>
                <Button type="submit" disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="system">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> System Configuration</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Hospital Name", key: "hospital_name" }, { label: "Tax Rate (%)", key: "tax_rate", type: "number" },
                      { label: "Currency", key: "currency" }, { label: "Approval Threshold", key: "approval_threshold", type: "number" },
                      { label: "Audit Retention (days)", key: "audit_retention_days", type: "number" }, { label: "Fiscal Year Start", key: "fiscal_year_start" },
                      { label: "Requisition Prefix", key: "requisition_prefix" }, { label: "PO Prefix", key: "po_prefix" }, { label: "GRN Prefix", key: "grn_prefix" },
                    ].map(f => (
                      <div key={f.key} className="space-y-2">
                        <Label>{f.label}</Label>
                        <Input type={f.type || "text"} value={(sysSettings as any)[f.key]} onChange={e => setSysSettings({...sysSettings, [f.key]: e.target.value})} />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-border pt-4">
                    <div><Label>Auto PO Numbering</Label><p className="text-xs text-muted-foreground">Automatically generate PO numbers</p></div>
                    <Switch checked={sysSettings.auto_po_numbering} onCheckedChange={v => setSysSettings({...sysSettings, auto_po_numbering: v})} />
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div><Label>Email Notifications</Label><p className="text-xs text-muted-foreground">Send email on approvals</p></div>
                    <Switch checked={sysSettings.email_notifications} onCheckedChange={v => setSysSettings({...sysSettings, email_notifications: v})} />
                  </div>
                  <Button variant="outline" onClick={() => toast({ title: "System settings saved (local)" })}><Save className="w-4 h-4 mr-1" /> Save System Settings</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Items Management ({items.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="border border-border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">{item.name}</TableCell>
                            <TableCell className="font-mono text-xs">{item.sku || "—"}</TableCell>
                            <TableCell className="capitalize text-xs">{item.item_type}</TableCell>
                            <TableCell className="text-right">{item.quantity_in_stock}</TableCell>
                            <TableCell className="text-right">{Number(item.unit_price).toLocaleString()}</TableCell>
                            <TableCell><span className={`text-xs px-1.5 py-0.5 rounded ${item.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.status}</span></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditDialog({ type: "item", data: item }); setEditForm({ name: item.name, sku: item.sku, unit_price: item.unit_price, quantity_in_stock: item.quantity_in_stock, status: item.status }); }}><Edit className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Deactivate {item.name}?</AlertDialogTitle><AlertDialogDescription>This item will be deactivated.</AlertDialogDescription></AlertDialogHeader>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="suppliers">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Suppliers Management ({suppliers.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="border border-border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="w-24">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {suppliers.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium text-sm">{s.name}</TableCell>
                            <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                            <TableCell className="text-sm">{s.email || "—"}</TableCell>
                            <TableCell><span className={`text-xs px-1.5 py-0.5 rounded ${s.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{s.status}</span></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditDialog({ type: "supplier", data: s }); setEditForm({ name: s.name, phone: s.phone, email: s.email, status: s.status }); }}><Edit className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Deactivate {s.name}?</AlertDialogTitle></AlertDialogHeader>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="categories">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" /> Categories ({categories.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="border border-border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="w-24">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {categories.map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{c.description || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditDialog({ type: "category", data: c }); setEditForm({ name: c.name, description: c.description || "" }); }}><Edit className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete {c.name}?</AlertDialogTitle></AlertDialogHeader>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departments">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Departments ({departments.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="border border-border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50">
                        <TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Head</TableHead><TableHead className="w-24">Actions</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {departments.map((d: any) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.name}</TableCell>
                            <TableCell className="font-mono text-sm">{d.code || "—"}</TableCell>
                            <TableCell>{d.head_name || "—"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setEditDialog({ type: "department", data: d }); setEditForm({ name: d.name, code: d.code || "", head_name: d.head_name || "" }); }}><Edit className="w-3 h-3" /></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-destructive"><Trash2 className="w-3 h-3" /></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete {d.name}?</AlertDialogTitle></AlertDialogHeader>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="odbc">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> External SQL Server (ODBC)</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Configure connection to external SQL Server for data synchronization.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Server Host</Label><Input value={odbc.server} onChange={e => setOdbc({...odbc, server: e.target.value})} placeholder="192.168.1.100" /></div>
                    <div className="space-y-2"><Label>Port</Label><Input value={odbc.port} onChange={e => setOdbc({...odbc, port: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Database Name</Label><Input value={odbc.database} onChange={e => setOdbc({...odbc, database: e.target.value})} placeholder="HospitalDB" /></div>
                    <div className="space-y-2"><Label>ODBC Driver</Label><Input value={odbc.driver} onChange={e => setOdbc({...odbc, driver: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Username</Label><Input value={odbc.username} onChange={e => setOdbc({...odbc, username: e.target.value})} /></div>
                    <div className="space-y-2"><Label>Password</Label><Input type="password" value={odbc.password} onChange={e => setOdbc({...odbc, password: e.target.value})} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={generateODBCString} variant="outline"><Database className="w-4 h-4 mr-1" /> Generate Connection String</Button>
                    {connString && <Button onClick={copyConnString} variant="outline" size="sm"><Copy className="w-4 h-4 mr-1" /> Copy</Button>}
                  </div>
                  {connString && (
                    <div className="space-y-2">
                      <div className="bg-muted p-3 rounded-lg font-mono text-xs break-all border border-border">{connString}</div>
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1"><Terminal className="w-3 h-3" /> Node.js ODBC Usage</Label>
                        <Textarea value={odbcCode} readOnly className="font-mono text-xs h-48 bg-muted" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* DATABASE SCHEMA TAB */}
            <TabsContent value="database">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> Database Schema — Supabase PostgreSQL</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">Project ID: <span className="font-mono text-xs">yvjfehnzbzjliizjvuhq</span> | {DB_TABLES.length} tables | RLS enabled on all</p>
                  <div className="border border-border rounded-lg overflow-auto max-h-[500px]">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50">
                        <TableHead>Table</TableHead><TableHead>Columns</TableHead><TableHead className="w-16">RLS</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {DB_TABLES.map(t => (
                          <TableRow key={t.name}>
                            <TableCell className="font-mono font-medium text-sm text-primary">{t.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">{t.cols}</TableCell>
                            <TableCell><span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">✓</span></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">{DB_TABLES.length}</p><p className="text-xs text-muted-foreground">Tables</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">6</p><p className="text-xs text-muted-foreground">User Roles</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">1</p><p className="text-xs text-muted-foreground">Edge Functions</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">10+</p><p className="text-xs text-muted-foreground">Migrations</p></CardContent></Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* CODEBASE TAB */}
            <TabsContent value="codebase">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><FolderTree className="w-5 h-5" /> Project Codebase — MediProcure ERP v2.0</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">React + TypeScript + Vite + Tailwind CSS + Supabase</p>
                  <div className="border border-border rounded-lg p-3 max-h-[500px] overflow-auto bg-muted/20 font-mono">
                    {PROJECT_TREE.map((node, i) => <TreeNode key={i} node={node} />)}
                  </div>
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">14</p><p className="text-xs text-muted-foreground">Page Components</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">40+</p><p className="text-xs text-muted-foreground">UI Components</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">3</p><p className="text-xs text-muted-foreground">Utility Libraries</p></CardContent></Card>
                    <Card><CardContent className="p-3"><p className="text-lg font-bold">1</p><p className="text-xs text-muted-foreground">Auth Context</p></CardContent></Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card className="border-border">
                <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> System Information</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Hospital:</span> Embu Level 5 Hospital</p>
                  <p><span className="text-muted-foreground">System:</span> MediProcure ERP Suite v2.0</p>
                  <p><span className="text-muted-foreground">Address:</span> P.O. Box 33 - 60100, Embu, Kenya</p>
                  <p><span className="text-muted-foreground">Phone:</span> +254 68 31055/56</p>
                  <p><span className="text-muted-foreground">Email:</span> pghembu@gmail.com</p>
                  <p><span className="text-muted-foreground">ISO:</span> 9001:2015 Certified</p>
                  <p><span className="text-muted-foreground">Modules:</span> Inventory, Purchasing, Contracts, GRN, Analytics, Users, Audit</p>
                  <p><span className="text-muted-foreground">Roles:</span> Admin, Requisitioner, Procurement Officer, Procurement Manager, Warehouse Officer, Inventory Manager</p>
                  <p><span className="text-muted-foreground">Database:</span> Supabase PostgreSQL ({DB_TABLES.length} tables)</p>
                  <p><span className="text-muted-foreground">Edge Functions:</span> notify-requisition</p>
                  <p><span className="text-muted-foreground">External:</span> ODBC/SQL Server integration ready</p>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Edit dialog */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editDialog?.type}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {Object.entries(editForm).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label className="capitalize">{key.replace(/_/g, " ")}</Label>
                <Input value={String(value || "")} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
              <Button onClick={saveEditItem}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsPage;
