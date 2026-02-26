import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";
import { Plus, Search, Download, Edit } from "lucide-react";
import { exportToExcel, exportToPDF } from "@/lib/export";

const ItemsPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", barcode: "", sku: "", category_id: "", department_id: "",
    supplier_id: "", unit_of_measure: "piece", unit_price: "", quantity_in_stock: "",
    reorder_level: "10", location: "", expiry_date: "", batch_number: "", item_type: "consumable",
    status: "active",
  });

  useEffect(() => {
    fetchItems(); fetchCategories(); fetchDepartments(); fetchSuppliers();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*, item_categories(name), suppliers(name)")
      .order("created_at", { ascending: false });
    setItems(data || []);
  };

  const fetchCategories = async () => {
    const { data } = await supabase.from("item_categories").select("*").order("name");
    setCategories(data || []);
  };

  const fetchDepartments = async () => {
    const { data } = await (supabase as any).from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers(data || []);
  };

  const resetForm = () => {
    setForm({
      name: "", description: "", barcode: "", sku: "", category_id: "", department_id: "",
      supplier_id: "", unit_of_measure: "piece", unit_price: "", quantity_in_stock: "",
      reorder_level: "10", location: "", expiry_date: "", batch_number: "", item_type: "consumable",
      status: "active",
    });
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      unit_price: parseFloat(form.unit_price) || 0,
      quantity_in_stock: parseInt(form.quantity_in_stock) || 0,
      reorder_level: parseInt(form.reorder_level) || 10,
      category_id: form.category_id || null,
      department_id: form.department_id || null,
      supplier_id: form.supplier_id || null,
      expiry_date: form.expiry_date || null,
      added_by: user?.id,
    };

    if (editingItem) {
      const { error } = await supabase.from("items").update(payload).eq("id", editingItem.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Item updated" });
    } else {
      const { error } = await supabase.from("items").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Item added" });
    }
    setDialogOpen(false);
    resetForm();
    fetchItems();
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
      (item.barcode || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.sku || "").toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || item.category_id === filterCategory;
    const matchDept = filterDept === "all" || item.department_id === filterDept;
    const matchType = filterType === "all" || item.item_type === filterType;
    return matchSearch && matchCat && matchDept && matchType;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Items & Inventory</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportToExcel(filtered, "items-inventory")}>
            <Download className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportToPDF(filtered, "Items & Inventory", ["name","barcode","item_type","quantity_in_stock","unit_price","status"])}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                <div className="space-y-2"><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter" /></div>
                <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measure</Label>
                  <Select value={form.unit_of_measure} onValueChange={(v) => setForm({ ...form, unit_of_measure: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["piece","box","pack","bottle","roll","kg","liter","set","pair","vial","ampoule"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Unit Price</Label><Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Quantity in Stock</Label><Input type="number" value={form.quantity_in_stock} onChange={(e) => setForm({ ...form, quantity_in_stock: e.target.value })} /></div>
                <div className="space-y-2"><Label>Reorder Level</Label><Input type="number" value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Item Type</Label>
                  <Select value={form.item_type} onValueChange={(v) => setForm({ ...form, item_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["consumable","equipment","pharmaceutical","surgical","laboratory","general"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Store Room A" /></div>
                <div className="space-y-2"><Label>Batch Number</Label><Input value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items, barcodes, SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {["consumable","equipment","pharmaceutical","surgical","laboratory","general"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead><TableHead>Barcode</TableHead><TableHead>Category</TableHead>
              <TableHead>Type</TableHead><TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead><TableHead>Status</TableHead>
              <TableHead>Updated</TableHead><TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No items found</TableCell></TableRow>
            ) : filtered.map((item) => (
              <TableRow key={item.id} className="data-table-row">
                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">{item.barcode || "—"}</TableCell>
                <TableCell>{item.item_categories?.name || "—"}</TableCell>
                <TableCell className="capitalize">{item.item_type}</TableCell>
                <TableCell className={`text-right font-medium ${(item.quantity_in_stock || 0) <= (item.reorder_level || 10) ? "text-red-500" : "text-emerald-600"}`}>
                  {item.quantity_in_stock}
                </TableCell>
                <TableCell className="text-right">{Number(item.unit_price).toFixed(2)}</TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-1 rounded-full ${item.status === "active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                    {item.status}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(item.updated_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => editItem(item)}><Edit className="w-4 h-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} item(s) shown</p>
    </div>
  );
};

export default ItemsPage;
