import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Camera, ScanBarcode, Search } from "lucide-react";

const ScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [foundItem, setFoundItem] = useState<any | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("scanner-container");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          setBarcode(decodedText);
          await lookupBarcode(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      toast({ title: "Camera Error", description: "Could not access camera. Please check permissions.", variant: "destructive" });
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
      .select("*, item_categories(name), departments(name)")
      .eq("barcode", code)
      .single();

    if (data) {
      setFoundItem(data);
      toast({ title: "Item found!", description: data.name });
    } else {
      setFoundItem(null);
      toast({ title: "Not found", description: `No item with barcode: ${code}`, variant: "destructive" });
    }
  };

  const handleManualSearch = async () => {
    if (!barcode.trim()) return;
    await lookupBarcode(barcode.trim());
  };

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground">Barcode Scanner</h1>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-primary" />
            Scan or Enter Barcode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode manually..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
            />
            <Button onClick={handleManualSearch} variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex gap-2">
            {!scanning ? (
              <Button onClick={startScanner} className="w-full">
                <Camera className="w-4 h-4 mr-2" /> Open Camera Scanner
              </Button>
            ) : (
              <Button onClick={stopScanner} variant="destructive" className="w-full">
                Stop Scanner
              </Button>
            )}
          </div>

          <div
            id="scanner-container"
            className={`rounded-lg overflow-hidden ${scanning ? "block" : "hidden"}`}
            style={{ width: "100%", minHeight: scanning ? 300 : 0 }}
          />
        </CardContent>
      </Card>

      {foundItem && (
        <Card className="border-border animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{foundItem.name}</span></div>
              <div><span className="text-muted-foreground">Barcode:</span> <span className="font-mono">{foundItem.barcode}</span></div>
              <div><span className="text-muted-foreground">Category:</span> <span>{foundItem.item_categories?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Department:</span> <span>{foundItem.departments?.name || "—"}</span></div>
              <div><span className="text-muted-foreground">Stock:</span> <span className={`font-bold ${foundItem.quantity_in_stock <= foundItem.reorder_level ? "text-destructive" : "text-success"}`}>{foundItem.quantity_in_stock}</span></div>
              <div><span className="text-muted-foreground">Unit Price:</span> <span>{Number(foundItem.unit_price).toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Type:</span> <span className="capitalize">{foundItem.item_type}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="capitalize">{foundItem.status}</span></div>
              {foundItem.batch_number && <div><span className="text-muted-foreground">Batch:</span> <span>{foundItem.batch_number}</span></div>}
              {foundItem.expiry_date && <div><span className="text-muted-foreground">Expiry:</span> <span>{foundItem.expiry_date}</span></div>}
              {foundItem.location && <div><span className="text-muted-foreground">Location:</span> <span>{foundItem.location}</span></div>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ScannerPage;
