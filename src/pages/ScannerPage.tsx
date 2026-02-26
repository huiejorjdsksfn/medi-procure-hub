import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Camera, ScanBarcode, Search, Plus, Package, CheckCircle, AlertTriangle } from "lucide-react";

const ScannerPage = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [foundItem, setFoundItem] = useState<any | null>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "", barcode: "", category_id: "", department_id: "",
    unit_of_measure: "piece", unit_price: "", quantity_in_stock: "1",
    reorder_level: "10", item_type: "consumable", batch_number: "", expiry_date: "",
  });
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
    return () => { stopScanner(); };
  }, []);

  const fetchCategories = async () => {
    const { data } = await supabase.from("item_categories").select("*").order("name");
    setCategories(data || []);
  };

  const fetchDepartments = async () => {
    const { data } = await (supabase as any).from("departments").select("*").order("name");
    setDepartments(data || []);
  };

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("scanner-container");
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 160 } },
        async (decodedText) => {
          setBarcode(decodedText);
          await lookupBarcode(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch {
      toast({ title: "Camera Error", description: "Could not access camera. Check permissions.", variant: "destructive" });
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const lookupBarcode = async (code: string) => {
    const { data } = await supabase
      .from("items")
      .select("*, item_categories(name)")
      .eq("barcode", code)
      .single();

    const timestamp = new Date().toLocaleTimeString();

    if (data) {
      setFoundItem(data);
      setScanHistory(prev => [{ code, found: true, name: data.name, time: timestamp }, ...prev.slice(0, 19)]);
      toast({ title: "✓ Item Found", description: `${data.name} — Stock: ${data.quantity_in_stock}` });
    } else {
      setFoundItem(null);
      setScanHistory(prev => [{ code, found: false, name: "Not found", time: timestamp }, ...prev.slice(0, 19)]);
      setAddForm(prev => ({ ...prev, barcode: code, name: "" }));
      setShowAddDialog(true);
      toast({ title: "Item not found", description: `Barcode ${code} — Add it now?`, variant: "destructive" });
    }
  };

  const handleManualSearch = async () => {
    if (!barcode.trim()) return;
    await lookupBarcode(barcode.trim());
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("items").insert({
      name: addForm.name,
      barcode: addForm.barcode,
      category_id: addForm.category_id || null,
      department_id: addForm.department_id || null,
      unit_of_measure: addForm.unit_of_measure,
      unit_price: parseFloat(addForm.unit_price) || 0,
      quantity_in_stock: parseInt(addForm.quantity_in_stock) || 0,
      reorder_level: parseInt(addForm.reorder_level) || 10,
      item_type: addForm.item_type,
      batch_number: addForm.batch_number || null,
      expiry_date: addForm.expiry_date || null,
      added_by: user?.id,
      status: "active",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Item added successfully!", description: `${addForm.name} saved to inventory.` });
    setShowAddDialog(false);
    setAddForm({ name: "", barcode: "", category_id: "", department_id: "", unit_of_measure: "piece", unit_price: "", quantity_in_stock: "1", reorder_level: "10", item_type: "consumable", batch_number: "", expiry_date: "" });
    // Re-lookup to show the item
    await lookupBarcode(addForm.barcode);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScanBarcode className="w-6 h-6 text-primary" /> Barcode Scanner
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Scan barcodes to look up or add items to inventory</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border">
            <CardContent className="p-4 space-y-4">
              {/* Manual input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Enter or scan barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                  className="font-mono text-lg h-12"
                />
                <Button onClick={handleManualSearch} size="lg" variant="outline" className="px-4">
                  <Search className="w-5 h-5" />
                </Button>
              </div>

              {/* Camera controls */}
              <div className="flex gap-2">
                {!scanning ? (
                  <Button onClick={startScanner} className="w-full h-12 text-base gap-2">
                    <Camera className="w-5 h-5" /> Open Camera Scanner
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="destructive" className="w-full h-12 text-base">
                    Stop Scanner
                  </Button>
                )}
              </div>

              {/* Camera preview */}
              <div
                id="scanner-container"
                className={`rounded-xl overflow-hidden border-2 border-dashed border-primary/30 ${scanning ? "block" : "hidden"}`}
                style={{ width: "100%", minHeight: scanning ? 320 : 0 }}
              />
            </CardContent>
          </Card>

          {/* Found item details */}
          {foundItem && (
            <Card className="border-emerald-500/30 bg-emerald-500/5 animate-fade-in">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="w-5 h-5" /> Item Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-muted-foreground block text-xs">Name</span><span className="font-medium">{foundItem.name}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Barcode</span><span className="font-mono">{foundItem.barcode}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Category</span><span>{foundItem.item_categories?.name || "—"}</span></div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Stock</span>
                    <span className={`font-bold text-lg ${(foundItem.quantity_in_stock || 0) <= (foundItem.reorder_level || 10) ? "text-red-500" : "text-emerald-600"}`}>
                      {foundItem.quantity_in_stock}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground block text-xs">Unit Price</span><span>KSH {Number(foundItem.unit_price).toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground block text-xs">Type</span><span className="capitalize">{foundItem.item_type}</span></div>
                  {foundItem.batch_number && <div><span className="text-muted-foreground block text-xs">Batch</span><span>{foundItem.batch_number}</span></div>}
                  {foundItem.expiry_date && <div><span className="text-muted-foreground block text-xs">Expiry</span><span>{foundItem.expiry_date}</span></div>}
                  {foundItem.location && <div><span className="text-muted-foreground block text-xs">Location</span><span>{foundItem.location}</span></div>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Scan history */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Scan History</CardTitle>
          </CardHeader>
          <CardContent>
            {scanHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No scans yet</p>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                {scanHistory.map((scan, i) => (
                  <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${scan.found ? "bg-emerald-500/5" : "bg-red-500/5"}`}>
                    <div className="min-w-0">
                      <p className="font-mono truncate">{scan.code}</p>
                      <p className={`text-[10px] ${scan.found ? "text-emerald-600" : "text-red-500"}`}>{scan.name}</p>
                    </div>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap ml-2">{scan.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add item dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add New Item from Scan
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddItem} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Item Name *</Label>
                <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} required placeholder="Enter item name" />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode</Label>
                <Input value={addForm.barcode} readOnly className="font-mono bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Label>Item Type</Label>
                <Select value={addForm.item_type} onValueChange={(v) => setAddForm({ ...addForm, item_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["consumable","equipment","pharmaceutical","surgical","laboratory","general"].map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={addForm.category_id} onValueChange={(v) => setAddForm({ ...addForm, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={addForm.department_id} onValueChange={(v) => setAddForm({ ...addForm, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" value={addForm.quantity_in_stock} onChange={(e) => setAddForm({ ...addForm, quantity_in_stock: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Price (KSH)</Label>
                <Input type="number" step="0.01" value={addForm.unit_price} onChange={(e) => setAddForm({ ...addForm, unit_price: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit of Measure</Label>
                <Select value={addForm.unit_of_measure} onValueChange={(v) => setAddForm({ ...addForm, unit_of_measure: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["piece","box","pack","bottle","roll","kg","liter","set","pair","vial","ampoule","tube"].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Batch Number</Label>
                <Input value={addForm.batch_number} onChange={(e) => setAddForm({ ...addForm, batch_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={addForm.expiry_date} onChange={(e) => setAddForm({ ...addForm, expiry_date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" className="gap-1.5"><Package className="w-4 h-4" /> Save Item</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScannerPage;
