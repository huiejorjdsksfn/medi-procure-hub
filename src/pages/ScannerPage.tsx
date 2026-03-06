import { useState } from "react";
import { ScanBarcode, Search, Package, MapPin, DollarSign, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const sampleItems = {
  "BAR-001": { name: "Paracetamol 500mg Tabs", code: "PHARM-001", qty: 240, unit: "Pack", location: "Pharmacy Store A", value: "KES 4,800", alert: false },
  "BAR-002": { name: "Surgical Gloves Size L", code: "SURG-012", qty: 12, unit: "Box", location: "Main Store", value: "KES 3,600", alert: true },
  "BAR-003": { name: "IV Cannula 20G", code: "MED-034", qty: 85, unit: "Piece", location: "Theatre Store", value: "KES 2,550", alert: false },
};

export default function ScannerPage() {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<typeof sampleItems[keyof typeof sampleItems] | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleScan = () => {
    const item = sampleItems[barcode as keyof typeof sampleItems];
    if (item) {
      setResult(item);
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Barcode Scanner</h1>
        <p className="text-sm text-slate-500 mt-0.5">Scan or enter a barcode to look up inventory items</p>
      </div>

      {/* Scanner Input */}
      <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
        <ScanBarcode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-600 font-medium mb-4">Scan item barcode or enter manually</p>
        <div className="flex gap-2 max-w-sm mx-auto">
          <Input
            placeholder="e.g. BAR-001, BAR-002, BAR-003"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleScan()}
            className="flex-1"
          />
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleScan}>
            <Search className="w-4 h-4 mr-2" />Search
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-3">Try: BAR-001, BAR-002, or BAR-003 as demo barcodes</p>
      </div>

      {/* Result */}
      {result && (
        <div className={`bg-white rounded-xl border-2 p-5 shadow-sm ${result.alert ? "border-amber-300" : "border-green-300"}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              <h2 className="font-semibold text-slate-800">{result.name}</h2>
            </div>
            {result.alert && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                <AlertTriangle className="w-3 h-3 mr-1" />Low Stock
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Item Code", value: result.code, icon: Package },
              { label: "Location", value: result.location, icon: MapPin },
              { label: "Quantity on Hand", value: `${result.qty} ${result.unit}`, icon: RefreshCw },
              { label: "Stock Value", value: result.value, icon: DollarSign },
            ].map((f) => (
              <div key={f.label} className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <f.icon className="w-3.5 h-3.5 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">{f.label}</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{f.value}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">Stock Adjustment</Button>
            <Button variant="outline" size="sm">Transfer Stock</Button>
            <Button variant="outline" size="sm">View History</Button>
          </div>
        </div>
      )}

      {notFound && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="font-medium text-red-700">Item not found</p>
          <p className="text-sm text-red-500 mt-0.5">No inventory item matches barcode: <strong>{barcode}</strong></p>
        </div>
      )}
    </div>
  );
}
