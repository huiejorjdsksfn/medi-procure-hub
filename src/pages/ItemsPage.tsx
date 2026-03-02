import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Download, Edit, Package, Pill, Microscope, Wrench, Stethoscope, Box } from "lucide-react";
import { exportToPDF } from "@/lib/export";
import { logAudit } from "@/lib/audit";

const ITEM_TYPES = [
  { value: "all", label: "All Types", icon: Box },
  { value: "pharmaceutical", label: "Pharmaceuticals", icon: Pill },
  { value: "consumable", label: "Consumables", icon: Package },
  { value: "equipment", label: "Equipment", icon: Wrench },
  { value: "surgical", label: "Surgical", icon: Stethoscope },
  { value: "laboratory", label: "Laboratory", icon: Microscope },
  { value: "general", label: "General", icon: Box },
];

const ItemsPage = () => {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", barcode: "", sku: "", category_id: "", department_id: "",
    supplier_id: "", unit_of_measure: "piece", unit_price: "", quantity_in_stock: "",
    reorder_level: "10", location: "", expiry_date: "", batch_number: "", item_type: "consumable",
    status: "active",
  });

  useEffect(() => { fetchItems(); fetchCategories(); fetchDepartments(); fetchSuppliers(); }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel("items-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "items" }, () => {
        fetchItems();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*, item_categories(name), suppliers(name)").order("name");
    setItems(data || []);
  };
  const fetchCategories = async () => { const { data } = await supabase.from("item_categories").select("*").order("name"); setCategories(data || []); };
  const fetchDepartments = async () => { const { data } = await (supabase as any).from("departments").select("*").order("name"); setDepartments(data || []); };
  const fetchSuppliers = async () => { const { data } = await supabase.from("suppliers").select("*").order("name"); setSuppliers(data || []); };

  const resetForm = () => {
    setForm({ name: "", description: "", barcode: "", sku: "", category_id: "", department_id: "", supplier_id: "", unit_of_measure: "piece", unit_price: "", quantity_in_stock: "", reorder_level: "10", location: "", expiry_date: "", batch_number: "", item_type: "consumable", status: "active" });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form, unit_price: parseFloat(form.unit_price) || 0, quantity_in_stock: parseInt(form.quantity_in_stock) || 0,
      reorder_level: parseInt(form.reorder_level) || 10, category_id: form.category_id || null,
      department_id: form.department_id || null, supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null, added_by: user?.id,
    };
    if (editingItem) {
      const { error } = await supabase.from("items").update(payload).eq("id", editingItem.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Item updated" });
      logAudit(user?.id, profile?.full_name, "update", "items", editingItem.id, { name: form.name });
    } else {
      const { data, error } = await supabase.from("items").insert(payload).select().single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Item added" });
      logAudit(user?.id, profile?.full_name, "create", "items", data?.id, { name: form.name });
    }
    setDialogOpen(false); resetForm();
  };

  const editItem = (item: any) => {
    setEditingItem(item);
    setForm({
      name: item.name || "", description: item.description || "", barcode: item.barcode || "",
      sku: item.sku || "", category_id: item.category_id || "", department_id: item.department_id || "",
      supplier_id: item.supplier_id || "", unit_of_measure: item.unit_of_measure || "piece",
      unit_price: String(item.unit_price || ""), quantity_in_stock: String(item.quantity_in_stock || ""),
      reorder_level: String(item.reorder_level || "10"), location: item.location || "",
      expiry_date: item.expiry_date || "", batch_number: item.batch_number || "",
      item_type: item.item_type || "consumable", status: item.status || "active",
    });
    setDialogOpen(true);
  };

  const filtered = items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.barcode || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || item.category_id === filterCategory;
    const matchType = activeTab === "all" || item.item_type === activeTab;
    return matchSearch && matchCat && matchType;
  });

  // KPI counts
  const totalValue = items.reduce((s, i) => s + (i.quantity_in_stock || 0) * (i.unit_price || 0), 0);
  const lowStockCount = items.filter(i => (i.quantity_in_stock || 0) <= (i.reorder_level || 10)).length;
  const typeCounts = ITEM_TYPES.slice(1).map(t => ({ ...t, count: items.filter(i => i.item_type === t.value).length }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => exportToPDF(filtered, "Items & Inventory", ["name","sku","item_type","quantity_in_stock","unit_price","status"])}><Download className="w-4 h-4 mr-1" /> Download PDF</Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Item</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Supplier</Label>
                  <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Item Type</Label>
                  <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ITEM_TYPES.slice(1).map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Unit of Measure</Label>
                  <Select value={form.unit_of_measure} onValueChange={(v) => setForm({ ...form, unit_of_measure: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["piece","box","pack","bottle","roll","kg","liter","set","pair","vial","ampoule","ream"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Unit Price (KSH)</Label><Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Quantity in Stock</Label><Input type="number" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} /></div>
                <div className="space-y-2"><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></div>
                <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Store Room A" /></div>
                <div className="space-y-2"><Label>Batch Number</Label><Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
                <div className="space-y-2"><Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="md:col-span-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
                  <Button type="submit">{editingItem ? "Update" : "Add"} Item</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground">Total Items</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-destructive">{lowStockCount}</p><p className="text-xs text-muted-foreground">Low Stock Alerts</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">KSH {(totalValue / 1000000).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Inventory Value</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{categories.length}</p><p className="text-xs text-muted-foreground">Categories</p></CardContent></Card>
      </div>

      {/* Tab navigation by item type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {ITEM_TYPES.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.value !== "all" && <span className="text-xs ml-1 opacity-60">({items.filter(i => i.item_type === t.value).length})</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items, SKU, barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Categories</SelectItem>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
            <TableHead>Supplier</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Price (KSH)</TableHead><TableHead>Location</TableHead><TableHead>Status</TableHead><TableHead className="w-16">Edit</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{item.sku || "—"}</TableCell>
                <TableCell className="text-sm">{item.item_categories?.name || "—"}</TableCell>
                <TableCell className="text-sm">{item.suppliers?.name ? (item.suppliers.name.length > 15 ? item.suppliers.name.substring(0,15)+"…" : item.suppliers.name) : "—"}</TableCell>
                <TableCell className="capitalize text-xs">{item.item_type}</TableCell>
                <TableCell className={`text-right font-medium ${(item.quantity_in_stock || 0) <= (item.reorder_level || 10) ? "text-destructive" : "text-emerald-600"}`}>{item.quantity_in_stock}</TableCell>
                <TableCell className="text-right">{Number(item.unit_price).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.location || "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full ${item.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{item.status}</span></TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => editItem(item)}><Edit className="w-4 h-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {items.length} item(s)</p>
    </div>
  );
};

export default ItemsPage;
