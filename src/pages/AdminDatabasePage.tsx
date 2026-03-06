import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Database, Search, RefreshCw, Edit, Trash2, Plus, Download,
  ChevronRight, Table2, Eye, AlertTriangle, CheckCircle, X
} from "lucide-react";

const TABLES = [
  { name: "profiles", label: "User Profiles", color: "blue" },
  { name: "suppliers", label: "Suppliers", color: "teal" },
  { name: "items", label: "Items Catalogue", color: "green" },
  { name: "item_categories", label: "Item Categories", color: "indigo" },
  { name: "departments", label: "Departments", color: "purple" },
  { name: "requisitions", label: "Requisitions", color: "amber" },
  { name: "purchase_orders", label: "Purchase Orders", color: "orange" },
  { name: "goods_received", label: "Goods Received", color: "cyan" },
  { name: "contracts", label: "Contracts", color: "blue" },
  { name: "payment_vouchers", label: "Payment Vouchers", color: "red" },
  { name: "receipt_vouchers", label: "Receipt Vouchers", color: "green" },
  { name: "journal_vouchers", label: "Journal Vouchers", color: "indigo" },
  { name: "purchase_vouchers", label: "Purchase Vouchers", color: "orange" },
  { name: "sales_vouchers", label: "Sales Vouchers", color: "emerald" },
  { name: "tenders", label: "Tenders", color: "violet" },
  { name: "bid_evaluations", label: "Bid Evaluations", color: "pink" },
  { name: "inspections", label: "Quality Inspections", color: "teal" },
  { name: "non_conformance", label: "Non-Conformance", color: "red" },
  { name: "chart_of_accounts", label: "Chart of Accounts", color: "slate" },
  { name: "bank_accounts", label: "Bank Accounts", color: "green" },
  { name: "budgets", label: "Budgets", color: "purple" },
  { name: "fixed_assets", label: "Fixed Assets", color: "orange" },
  { name: "procurement_plans", label: "Procurement Plans", color: "blue" },
  { name: "audit_log", label: "Audit Log", color: "slate" },
  { name: "user_roles", label: "User Roles", color: "red" },
];

const SKIP_EDIT_COLS = ["id", "created_at", "updated_at", "created_by", "approved_by", "inspector_id", "raised_by", "resolved_by"];
const READONLY_TABLES = ["audit_log"];

export default function AdminDatabasePage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");

  const [activeTable, setActiveTable] = useState("suppliers");
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const [editRow, setEditRow] = useState<any | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [showInsert, setShowInsert] = useState(false);
  const [insertData, setInsertData] = useState<Record<string, any>>({});

  const tableInfo = TABLES.find(t => t.name === activeTable);
  const isReadonly = READONLY_TABLES.includes(activeTable);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error, count } = await (supabase as any)
        .from(activeTable)
        .select("*", { count: "exact" })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRows(data || []);
      setTotalCount(count || 0);
      if (data && data.length > 0) {
        setColumns(Object.keys(data[0]));
      } else {
        setColumns([]);
      }
    } catch (err: any) {
      toast({ title: `Error loading ${activeTable}`, description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [activeTable, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const ch = (supabase as any).channel(`admin-rt-${activeTable}`)
      .on("postgres_changes", { event: "*", schema: "public", table: activeTable }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeTable, fetchData]);

  const handleEdit = (row: any) => {
    setEditRow(row);
    setEditData({ ...row });
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    const updatePayload = { ...editData };
    SKIP_EDIT_COLS.forEach(col => delete updatePayload[col]);
    delete updatePayload.id;

    const { error } = await (supabase as any).from(activeTable).update(updatePayload).eq("id", editRow.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" }); return;
    }
    logAudit(user?.id, profile?.full_name, "admin_update", activeTable, editRow.id, updatePayload);
    toast({ title: "Record updated successfully" });
    setEditRow(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await (supabase as any).from(activeTable).delete().eq("id", confirmDelete.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return;
    }
    logAudit(user?.id, profile?.full_name, "admin_delete", activeTable, confirmDelete.id, {});
    toast({ title: "Record deleted" });
    setConfirmDelete(null);
    fetchData();
  };

  const handleInsert = async () => {
    const { error } = await (supabase as any).from(activeTable).insert(insertData);
    if (error) {
      toast({ title: "Insert failed", description: error.message, variant: "destructive" }); return;
    }
    logAudit(user?.id, profile?.full_name, "admin_insert", activeTable, undefined, insertData);
    toast({ title: "Record inserted" });
    setShowInsert(false);
    setInsertData({});
    fetchData();
  };

  const handleExport = () => {
    const csv = [columns.join(","), ...rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${activeTable}_export.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRows = rows.filter(row =>
    search === "" || Object.values(row).some(v => String(v ?? "").toLowerCase().includes(search.toLowerCase()))
  );

  const formatCellValue = (value: any, col: string): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "✓" : "✗";
    if (typeof value === "object") return JSON.stringify(value).substring(0, 60) + "...";
    if (col.includes("amount") || col.includes("cost") || col.includes("value") || col.includes("balance") || col.includes("price"))
      return typeof value === "number" ? `KES ${value.toLocaleString()}` : value;
    if (col.includes("_at") || col.includes("_date") || col === "date")
      return value ? new Date(value).toLocaleDateString("en-KE") : "—";
    return String(value).substring(0, 80);
  };

  const getStatusColor = (val: string) => {
    const map: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      approved: "bg-green-100 text-green-700",
      confirmed: "bg-green-100 text-green-700",
      paid: "bg-blue-100 text-blue-700",
      posted: "bg-blue-100 text-blue-700",
      pending: "bg-amber-100 text-amber-700",
      draft: "bg-slate-100 text-slate-700",
      rejected: "bg-red-100 text-red-700",
      cancelled: "bg-red-100 text-red-700",
      open: "bg-orange-100 text-orange-700",
      closed: "bg-slate-100 text-slate-700",
      published: "bg-blue-100 text-blue-700",
      resolved: "bg-green-100 text-green-700",
      pass: "bg-green-100 text-green-700",
      fail: "bg-red-100 text-red-700",
    };
    return map[val?.toLowerCase()] ?? "bg-slate-100 text-slate-600";
  };

  const isStatusCol = (col: string) => col === "status" || col === "result";
  const editableColumns = columns.filter(c => !SKIP_EDIT_COLS.includes(c) && c !== "id");

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
        <p className="text-slate-500 mt-2">Only administrators can access the database admin panel.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Sidebar — Table List */}
      <div className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <Database className="w-4 h-4 text-blue-600" />Database Admin
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{TABLES.length} tables</p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {TABLES.map(t => (
            <button key={t.name} onClick={() => { setActiveTable(t.name); setPage(0); setSearch(""); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors
                ${activeTable === t.name ? "bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600" : "text-slate-600 hover:bg-slate-50"}`}>
              <Table2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
              {activeTable === t.name && <ChevronRight className="w-3 h-3 ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
          <div>
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
              <Table2 className="w-4 h-4 text-blue-600" />{tableInfo?.label}
              <Badge variant="outline" className="text-xs ml-1">{totalCount} records</Badge>
            </h2>
          </div>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input placeholder="Search..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchData}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />Refresh
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleExport}>
              <Download className="w-3.5 h-3.5 mr-1.5" />Export CSV
            </Button>
            {!isReadonly && (
              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShowInsert(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Insert Row
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : columns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm">
              <Eye className="w-8 h-8 mb-2 opacity-40" />No data in this table yet
            </div>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
                      {col.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                  {!isReadonly && <th className="px-3 py-2.5 text-center font-semibold text-slate-600 border-b border-slate-200 sticky right-0 bg-slate-100">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => (
                  <tr key={row.id || i} className="hover:bg-blue-50/40 transition-colors border-b border-slate-100 group">
                    {columns.map(col => (
                      <td key={col} className="px-3 py-2 text-slate-700 max-w-[200px] truncate">
                        {isStatusCol(col) ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row[col])}`}>
                            {row[col] || "—"}
                          </span>
                        ) : (
                          <span title={String(row[col] ?? "")}>{formatCellValue(row[col], col)}</span>
                        )}
                      </td>
                    ))}
                    {!isReadonly && (
                      <td className="px-3 py-2 sticky right-0 bg-white group-hover:bg-blue-50/40">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(row)} className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setConfirmDelete(row)} className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="bg-white border-t border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} records</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={(page + 1) * PAGE_SIZE >= totalCount} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      {editRow && (
        <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />Edit {tableInfo?.label} Record
              </DialogTitle>
            </DialogHeader>
            <div className="text-xs text-slate-500 mb-3 font-mono bg-slate-50 px-3 py-1.5 rounded">ID: {editRow.id}</div>
            <div className="grid grid-cols-2 gap-3">
              {editableColumns.map(col => (
                <div key={col} className={col.includes("description") || col.includes("notes") || col.includes("narration") || col.includes("justification") ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">
                    {col.replace(/_/g, " ")}
                  </label>
                  {col.includes("description") || col.includes("notes") || col.includes("narration") || col.includes("justification") ? (
                    <textarea
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                      value={editData[col] ?? ""}
                      onChange={e => setEditData(d => ({ ...d, [col]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      className="text-sm h-8"
                      value={editData[col] ?? ""}
                      onChange={e => setEditData(d => ({ ...d, [col]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveEdit}>
                <CheckCircle className="w-4 h-4 mr-2" />Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Insert Dialog */}
      {showInsert && (
        <Dialog open={showInsert} onOpenChange={() => setShowInsert(false)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />Insert into {tableInfo?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              {editableColumns.map(col => (
                <div key={col} className={col.includes("description") || col.includes("notes") ? "col-span-2" : ""}>
                  <label className="block text-xs font-medium text-slate-600 mb-1 capitalize">
                    {col.replace(/_/g, " ")}
                  </label>
                  <Input
                    className="text-sm h-8"
                    placeholder={col}
                    value={insertData[col] ?? ""}
                    onChange={e => setInsertData(d => ({ ...d, [col]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowInsert(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleInsert}>
                <Plus className="w-4 h-4 mr-2" />Insert Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />Confirm Delete
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this record from <strong>{tableInfo?.label}</strong>?
              This action cannot be undone.
            </p>
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs font-mono text-red-700 mt-2">
              ID: {confirmDelete.id}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />Delete Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
