import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Download, Eye, Printer, Search, FileText } from "lucide-react";
import { logAudit } from "@/lib/audit";
import { notifyProcurement } from "@/lib/notify";
import logo from "@/assets/embu-county-logo.jpg";

interface VoucherItem {
  code_no: string;
  item_description: string;
  unit_of_issue: string;
  quantity_required: string;
  quantity_issued: string;
  value: string;
  remarks: string;
}

const EMPTY_ROW: VoucherItem = { code_no: "", item_description: "", unit_of_issue: "pcs", quantity_required: "", quantity_issued: "", value: "", remarks: "" };

const VouchersPage = () => {
  const { user, profile, hasRole } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [printPreview, setPrintPreview] = useState<any>(null);
  const [search, setSearch] = useState("");

  // Form state matching Form S 11
  const [form, setForm] = useState({
    ministry: "Medical Service",
    department: "Health",
    unit: "Hospital",
    issue_point: "Embu Level 5",
    point_of_use: "",
    voucher_number: "",
    copy_type: "ORIGINAL",
    account_no: "",
    requisitioning_officer: "",
    designation_req: "",
    issued_by: "",
    signature_issued: "",
    received_by: "",
    designation_recv: "",
  });

  const [items, setItems] = useState<VoucherItem[]>(
    Array.from({ length: 10 }, () => ({ ...EMPTY_ROW }))
  );

  // Local storage for submitted vouchers (since no DB table yet)
  const [vouchers, setVouchers] = useState<any[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("erp_vouchers");
    if (saved) setVouchers(JSON.parse(saved));
  }, []);

  const saveVouchers = (list: any[]) => {
    setVouchers(list);
    localStorage.setItem("erp_vouchers", JSON.stringify(list));
  };

  const generateVoucherNumber = () => {
    return `${Math.floor(5000000 + Math.random() * 5000000)}`;
  };

  const updateItem = (i: number, field: keyof VoucherItem, value: string) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    // Auto-calc value
    if (field === "quantity_issued" || field === "quantity_required") {
      const qty = parseFloat(updated[i].quantity_issued || updated[i].quantity_required) || 0;
      // value can be calculated if we had unit price - for now leave manual
    }
    setItems(updated);
  };

  const addRows = () => setItems([...items, ...Array.from({ length: 5 }, () => ({ ...EMPTY_ROW }))]);

  const handleSubmit = () => {
    const validItems = items.filter(i => i.item_description.trim());
    if (validItems.length === 0) {
      toast({ title: "Add at least one item", variant: "destructive" });
      return;
    }
    const voucher = {
      id: crypto.randomUUID(),
      ...form,
      voucher_number: form.voucher_number || generateVoucherNumber(),
      items: validItems,
      created_at: new Date().toISOString(),
      created_by: profile?.full_name,
      status: "issued",
    };
    saveVouchers([voucher, ...vouchers]);
    logAudit(user?.id, profile?.full_name, "create_voucher", "vouchers", voucher.id, { number: voucher.voucher_number });
    toast({ title: "Voucher created", description: `#${voucher.voucher_number}` });
    notifyProcurement({title:"New Voucher Created",message:`Voucher ${voucher.voucher_number} created by ${profile?.full_name||"Staff"}`,type:"voucher",module:"Vouchers",actionUrl:"/vouchers"});
    setDialogOpen(false);
    setForm({ ...form, point_of_use: "", voucher_number: "", account_no: "", requisitioning_officer: "", designation_req: "", issued_by: "", signature_issued: "", received_by: "", designation_recv: "" });
    setItems(Array.from({ length: 10 }, () => ({ ...EMPTY_ROW })));
  };

  const printVoucher = (v: any) => {
    setPrintPreview(v);
    setTimeout(() => window.print(), 500);
  };

  const filtered = vouchers.filter(v =>
    (v.voucher_number || "").includes(search) ||
    (v.point_of_use || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 space-y-4" style={{background:"transparent",minHeight:"calc(100vh-100px)"}}>
      {/* Print preview - hidden until print */}
      {printPreview && (
        <div className="print-only fixed inset-0 bg-white z-[9999] p-8 text-black text-sm" style={{ fontFamily: "serif" }}>
          <VoucherPrintLayout voucher={printPreview} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Counter Requisition & Issue Vouchers</h1>
          <p className="text-xs text-muted-foreground">Form S 11 — Republic of Kenya</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Voucher</Button></DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Counter Requisition and Issue Voucher (Form S 11)
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Header fields matching the form */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Copy Type</Label>
                  <Select value={form.copy_type} onValueChange={v => setForm({ ...form, copy_type: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORIGINAL">Original</SelectItem>
                      <SelectItem value="DUPLICATE">Duplicate</SelectItem>
                      <SelectItem value="TRIPLICATE">Triplicate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Voucher No.</Label>
                  <Input className="h-8" placeholder="Auto-generated" value={form.voucher_number} onChange={e => setForm({ ...form, voucher_number: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ministry</Label>
                  <Input className="h-8" value={form.ministry} onChange={e => setForm({ ...form, ministry: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Dept/Branch</Label>
                  <Input className="h-8" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input className="h-8" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To (Issue Point)</Label>
                  <Input className="h-8" value={form.issue_point} onChange={e => setForm({ ...form, issue_point: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Point of Use</Label>
                  <Input className="h-8" placeholder="e.g. Ishiara Sub County Hospital" value={form.point_of_use} onChange={e => setForm({ ...form, point_of_use: e.target.value })} />
                </div>
              </div>

              {/* Items table - matching the form columns */}
              <div className="border border-border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-20 text-xs">Code No.</TableHead>
                      <TableHead className="text-xs">Item Description</TableHead>
                      <TableHead className="w-20 text-xs">Unit of Issue</TableHead>
                      <TableHead className="w-24 text-xs">Qty Required</TableHead>
                      <TableHead className="w-24 text-xs">Qty Issued</TableHead>
                      <TableHead className="w-24 text-xs">Value</TableHead>
                      <TableHead className="w-32 text-xs">Remarks/Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell><Input className="h-7 text-xs" value={item.code_no} onChange={e => updateItem(i, "code_no", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-7 text-xs" value={item.item_description} onChange={e => updateItem(i, "item_description", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-7 text-xs" value={item.unit_of_issue} onChange={e => updateItem(i, "unit_of_issue", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-7 text-xs" type="number" value={item.quantity_required} onChange={e => updateItem(i, "quantity_required", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-7 text-xs" type="number" value={item.quantity_issued} onChange={e => updateItem(i, "quantity_issued", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-7 text-xs" type="number" value={item.value} onChange={e => updateItem(i, "value", e.target.value)} /></TableCell>
                        <TableCell><Input className="h-7 text-xs" value={item.remarks} onChange={e => updateItem(i, "remarks", e.target.value)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addRows}><Plus className="w-3 h-3 mr-1" /> Add Rows</Button>

              {/* Signature fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Account No.</Label>
                  <Input className="h-8" value={form.account_no} onChange={e => setForm({ ...form, account_no: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Requisitioning Officer</Label>
                  <Input className="h-8" value={form.requisitioning_officer} onChange={e => setForm({ ...form, requisitioning_officer: e.target.value })} />
                  <Label className="text-xs">Designation</Label>
                  <Input className="h-8" value={form.designation_req} onChange={e => setForm({ ...form, designation_req: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Issued by</Label>
                  <Input className="h-8" value={form.issued_by} onChange={e => setForm({ ...form, issued_by: e.target.value })} />
                  <Label className="text-xs">Signature</Label>
                  <Input className="h-8" value={form.signature_issued} onChange={e => setForm({ ...form, signature_issued: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Received by</Label>
                  <Input className="h-8" value={form.received_by} onChange={e => setForm({ ...form, received_by: e.target.value })} />
                  <Label className="text-xs">Designation</Label>
                  <Input className="h-8" value={form.designation_recv} onChange={e => setForm({ ...form, designation_recv: e.target.value })} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit}>Issue Voucher</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Voucher list */}
      <div className="no-print space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vouchers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <div className="border border-border rounded-lg overflow-auto bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Voucher No.</TableHead>
                <TableHead>Copy</TableHead>
                <TableHead>Point of Use</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No vouchers created yet</TableCell></TableRow>
              ) : filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono font-medium">{v.voucher_number}</TableCell>
                  <TableCell><span className="text-xs bg-muted px-2 py-0.5 rounded">{v.copy_type}</span></TableCell>
                  <TableCell className="text-sm">{v.point_of_use || "—"}</TableCell>
                  <TableCell>{(v.items || []).length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{v.created_by}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setPrintPreview(v)}><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => printVoucher(v)}><Printer className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Print preview dialog */}
      {printPreview && (
        <Dialog open={!!printPreview} onOpenChange={() => setPrintPreview(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Voucher Preview — #{printPreview.voucher_number}</DialogTitle></DialogHeader>
            <div className="border border-border rounded p-6 bg-white text-black" style={{ fontFamily: "serif" }}>
              <VoucherPrintLayout voucher={printPreview} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPrintPreview(null)}>Close</Button>
              <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Print layout matching Form S 11
const VoucherPrintLayout = ({ voucher }: { voucher: any }) => (
  <div className="text-black text-xs leading-relaxed" style={{ fontFamily: "serif" }}>
    <div className="flex justify-between items-start mb-1">
      <span className="text-[10px]">Form S 11</span>
      <div className="text-right">
        <span className="text-[10px] font-bold uppercase">{voucher.copy_type}</span>
        <p className="text-sm font-bold">{voucher.voucher_number}</p>
      </div>
    </div>

    <div className="text-center mb-3">
      <img src="/assets/embu-county-logo.jpg" alt="Coat of Arms" className="w-12 h-12 mx-auto mb-1 object-contain" />
      <p className="text-[10px] font-bold">REPUBLIC OF KENYA</p>
      <p className="text-sm font-bold tracking-wide">COUNTER REQUISITION AND ISSUE VOUCHER</p>
    </div>

    <div className="text-[11px] mb-2 space-y-0.5">
      <p>Ministry: <span className="border-b border-black font-semibold">{voucher.ministry}</span> Dept./Branch: <span className="border-b border-black font-semibold">{voucher.department}</span> Unit: <span className="border-b border-black font-semibold">{voucher.unit}</span></p>
      <p>To (issue point): <span className="border-b border-black font-semibold">{voucher.issue_point}</span></p>
      <p>Please issue the stores listed below to (point of use): <span className="border-b border-black font-semibold">{voucher.point_of_use}</span></p>
    </div>

    <table className="w-full border-collapse border border-black text-[10px] mb-3">
      <thead>
        <tr className="border border-black">
          <th className="border border-black p-1 text-left">Code No.</th>
          <th className="border border-black p-1 text-left">Item Description</th>
          <th className="border border-black p-1 text-center">Unit of Issue</th>
          <th className="border border-black p-1 text-center">Quantity Required</th>
          <th className="border border-black p-1 text-center">Quantity Issued</th>
          <th className="border border-black p-1 text-center">Value</th>
          <th className="border border-black p-1 text-left">Remarks Purpose</th>
        </tr>
      </thead>
      <tbody>
        {(voucher.items || []).map((item: any, i: number) => (
          <tr key={i} className="border border-black">
            <td className="border border-black p-1">{item.code_no}</td>
            <td className="border border-black p-1">{item.item_description}</td>
            <td className="border border-black p-1 text-center">{item.unit_of_issue}</td>
            <td className="border border-black p-1 text-center">{item.quantity_required}</td>
            <td className="border border-black p-1 text-center">{item.quantity_issued}</td>
            <td className="border border-black p-1 text-center">{item.value}</td>
            <td className="border border-black p-1">{item.remarks}</td>
          </tr>
        ))}
        {/* Empty rows to fill the form */}
        {Array.from({ length: Math.max(0, 8 - (voucher.items || []).length) }).map((_, i) => (
          <tr key={`e${i}`} className="border border-black">
            <td className="border border-black p-1">&nbsp;</td>
            <td className="border border-black p-1">&nbsp;</td>
            <td className="border border-black p-1">&nbsp;</td>
            <td className="border border-black p-1">&nbsp;</td>
            <td className="border border-black p-1">&nbsp;</td>
            <td className="border border-black p-1">&nbsp;</td>
            <td className="border border-black p-1">&nbsp;</td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="text-[10px] space-y-1.5 border-t border-black pt-2">
      <p>Account No.: <span className="border-b border-black">{voucher.account_no || "_______________"}</span></p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p>Requisitioning Officer: <span className="border-b border-black font-semibold">{voucher.requisitioning_officer}</span></p>
          <p>Designation: <span className="border-b border-black">{voucher.designation_req}</span></p>
          <p>Date: _____________ Signature: _____________</p>
        </div>
        <div>
          <p>Issued by: <span className="border-b border-black font-semibold">{voucher.issued_by}</span></p>
          <p>Signature: <span className="border-b border-black">{voucher.signature_issued}</span></p>
          <p>Date: _____________</p>
        </div>
        <div>
          <p>Received by: <span className="border-b border-black font-semibold">{voucher.received_by}</span></p>
          <p>Designation: <span className="border-b border-black">{voucher.designation_recv}</span></p>
          <p>Signature: _____________</p>
        </div>
      </div>
    </div>

    <p className="text-[8px] text-gray-500 mt-3">G.P.K. 5134—50m Bks.—3/2009</p>
  </div>
);

export default VouchersPage;
