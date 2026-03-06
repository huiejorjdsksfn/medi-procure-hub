import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Database, Search, RefreshCw, Edit, Trash2, Plus, Download,
  Table2, Eye, AlertTriangle, CheckCircle, X, Play, Terminal,
  Shield, Users, Key, BarChart3, Copy, ChevronLeft, ChevronRight,
  Settings, Lock, Unlock, Filter, ArrowUpDown, EyeOff, Save,
  FileText, Zap, AlertCircle
} from "lucide-react";

// ── All 30 tables ─────────────────────────────────────────────────────────
const TABLES = [
  { name: "profiles",           label: "User Profiles",        group: "Auth",        color: "#0078d4" },
  { name: "user_roles",         label: "User Roles",           group: "Auth",        color: "#0078d4" },
  { name: "roles",              label: "Roles",                group: "Auth",        color: "#0078d4" },
  { name: "permissions",        label: "Permissions",          group: "Auth",        color: "#0078d4" },
  { name: "departments",        label: "Departments",          group: "Setup",       color: "#107c10" },
  { name: "item_categories",    label: "Item Categories",      group: "Setup",       color: "#107c10" },
  { name: "suppliers",          label: "Suppliers",            group: "Procurement", color: "#ca5010" },
  { name: "items",              label: "Items Catalogue",      group: "Procurement", color: "#ca5010" },
  { name: "requisitions",       label: "Requisitions",         group: "Procurement", color: "#ca5010" },
  { name: "requisition_items",  label: "Requisition Items",    group: "Procurement", color: "#ca5010" },
  { name: "purchase_orders",    label: "Purchase Orders",      group: "Procurement", color: "#ca5010" },
  { name: "goods_received",     label: "Goods Received",       group: "Procurement", color: "#ca5010" },
  { name: "contracts",          label: "Contracts",            group: "Procurement", color: "#ca5010" },
  { name: "tenders",            label: "Tenders",              group: "Procurement", color: "#ca5010" },
  { name: "bid_evaluations",    label: "Bid Evaluations",      group: "Procurement", color: "#ca5010" },
  { name: "procurement_plans",  label: "Procurement Plans",    group: "Procurement", color: "#ca5010" },
  { name: "payment_vouchers",   label: "Payment Vouchers",     group: "Finance",     color: "#5c2d91" },
  { name: "receipt_vouchers",   label: "Receipt Vouchers",     group: "Finance",     color: "#5c2d91" },
  { name: "journal_vouchers",   label: "Journal Vouchers",     group: "Finance",     color: "#5c2d91" },
  { name: "purchase_vouchers",  label: "Purchase Vouchers",    group: "Finance",     color: "#5c2d91" },
  { name: "sales_vouchers",     label: "Sales Vouchers",       group: "Finance",     color: "#5c2d91" },
  { name: "chart_of_accounts",  label: "Chart of Accounts",    group: "Finance",     color: "#5c2d91" },
  { name: "bank_accounts",      label: "Bank Accounts",        group: "Finance",     color: "#5c2d91" },
  { name: "budgets",            label: "Budgets",              group: "Finance",     color: "#5c2d91" },
  { name: "fixed_assets",       label: "Fixed Assets",         group: "Finance",     color: "#5c2d91" },
  { name: "gl_entries",         label: "GL Entries",           group: "Finance",     color: "#5c2d91" },
  { name: "inspections",        label: "Inspections",          group: "Quality",     color: "#00695c" },
  { name: "non_conformance",    label: "Non-Conformance",      group: "Quality",     color: "#00695c" },
  { name: "stock_movements",    label: "Stock Movements",      group: "Inventory",   color: "#375623" },
  { name: "audit_log",          label: "Audit Log",            group: "System",      color: "#333333" },
];

const SYSTEM_TABLES = ["audit_log"];
const SKIP_COLS = ["id", "created_at", "updated_at", "created_by", "approved_by", "inspector_id", "raised_by", "resolved_by", "evaluated_by", "posted_by"];
const PAGE_SIZE = 25;
const GROUPS = ["All", "Auth", "Setup", "Procurement", "Finance", "Quality", "Inventory", "System"];

export default function AdminDatabasePage() {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("admin");

  // ── view state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"tables" | "sql" | "users" | "stats">("tables");
  const [activeTable, setActiveTable] = useState("suppliers");
  const [groupFilter, setGroupFilter] = useState("All");
  const [tableSearch, setTableSearch] = useState("");

  // ── table data ──────────────────────────────────────────────────────────
  const [rows, setRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [rowSearch, setRowSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [hiddenCols, setHiddenCols] = useState<string[]>(["id", "created_by", "approved_by", "inspector_id", "raised_by", "resolved_by", "evaluated_by", "posted_by"]);

  // ── dialogs ─────────────────────────────────────────────────────────────
  const [editRow, setEditRow] = useState<any | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [confirmDelete, setConfirmDelete] = useState<any | null>(null);
  const [showInsert, setShowInsert] = useState(false);
  const [insertData, setInsertData] = useState<Record<string, any>>({});
  const [viewRow, setViewRow] = useState<any | null>(null);

  // ── SQL runner ──────────────────────────────────────────────────────────
  const [sqlQuery, setSqlQuery] = useState("SELECT table_name, (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as columns\nFROM information_schema.tables t\nWHERE table_schema = 'public'\nORDER BY table_name;");
  const [sqlResult, setSqlResult] = useState<any[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlLoading, setSqlLoading] = useState(false);
  const [sqlHistory, setSqlHistory] = useState<string[]>([]);

  // ── users ────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([]);
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ── stats ────────────────────────────────────────────────────────────────
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});

  // ── redirect if not admin ─────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) { navigate("/dashboard"); }
  }, [isAdmin, navigate]);

  // ── load table data ───────────────────────────────────────────────────
  const fetchTable = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any).from(activeTable).select("*", { count: "exact" });
      if (sortCol) q = q.order(sortCol, { ascending: sortAsc });
      q = q.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      setRows(data || []);
      setTotalCount(count || 0);
      if (data && data.length > 0) setColumns(Object.keys(data[0]));
    } catch (e: any) {
      toast({ title: "Error loading table", description: e.message, variant: "destructive" });
      setRows([]); setColumns([]);
    }
    setLoading(false);
  }, [activeTable, page, sortCol, sortAsc]);

  useEffect(() => { fetchTable(); }, [fetchTable]);
  useEffect(() => { setPage(0); setRowSearch(""); }, [activeTable]);

  // ── load all table counts for stats ──────────────────────────────────
  const fetchStats = useCallback(async () => {
    const counts: Record<string, number> = {};
    await Promise.all(TABLES.map(async t => {
      try {
        const { count } = await (supabase as any).from(t.name).select("*", { count: "exact", head: true });
        counts[t.name] = count || 0;
      } catch { counts[t.name] = 0; }
    }));
    setTableCounts(counts);
  }, []);

  useEffect(() => { if (activeTab === "stats") fetchStats(); }, [activeTab, fetchStats]);

  // ── load users & roles ─────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const [p, ur] = await Promise.all([
        (supabase as any).from("profiles").select("*").order("full_name"),
        (supabase as any).from("user_roles").select("*"),
      ]);
      setUsers(p.data || []);
      setUserRoles(ur.data || []);
    } catch (e: any) {
      toast({ title: "Error loading users", description: e.message, variant: "destructive" });
    }
    setUsersLoading(false);
  }, []);

  useEffect(() => { if (activeTab === "users") fetchUsers(); }, [activeTab, fetchUsers]);

  // ── CRUD operations ────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      const { error } = await (supabase as any).from(activeTable).update(editData).eq("id", editRow.id);
      if (error) throw error;
      toast({ title: "✅ Row updated successfully" });
      setEditRow(null); fetchTable();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const handleInsert = async () => {
    try {
      const { error } = await (supabase as any).from(activeTable).insert([insertData]);
      if (error) throw error;
      toast({ title: "✅ Row inserted successfully" });
      setShowInsert(false); setInsertData({}); fetchTable();
    } catch (e: any) {
      toast({ title: "Insert failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (row: any) => {
    try {
      const { error } = await (supabase as any).from(activeTable).delete().eq("id", row.id);
      if (error) throw error;
      toast({ title: "✅ Row deleted" });
      setConfirmDelete(null); fetchTable();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  // ── SQL Runner ────────────────────────────────────────────────────────
  const runSQL = async () => {
    setSqlLoading(true); setSqlError(null); setSqlResult(null);
    try {
      const { data, error } = await (supabase as any).rpc("execute_sql", { sql_query: sqlQuery }).maybeSingle();
      if (error) throw error;
      setSqlResult(Array.isArray(data) ? data : [data]);
      setSqlHistory(h => [sqlQuery, ...h.slice(0, 9)]);
    } catch (e: any) {
      // fallback: try direct select approach for read queries
      try {
        const lower = sqlQuery.trim().toLowerCase();
        if (lower.startsWith("select")) {
          // parse table name for simple selects
          const match = sqlQuery.match(/from\s+(?:public\.)?(\w+)/i);
          if (match) {
            const tbl = match[1];
            const { data: d2, error: e2 } = await (supabase as any).from(tbl).select("*").limit(100);
            if (!e2) { setSqlResult(d2 || []); return; }
          }
        }
        setSqlError(e.message);
      } catch { setSqlError(e.message); }
    }
    setSqlLoading(false);
  };

  // ── user role management ──────────────────────────────────────────────
  const addRole = async (userId: string, role: string) => {
    try {
      await (supabase as any).from("user_roles").insert([{ user_id: userId, role }]);
      toast({ title: `✅ Role '${role}' assigned` });
      fetchUsers();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const removeRole = async (userId: string, role: string) => {
    try {
      await (supabase as any).from("user_roles").delete().eq("user_id", userId).eq("role", role);
      toast({ title: `✅ Role '${role}' removed` });
      fetchUsers();
    } catch (e: any) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const csv = [columns.join(","), ...rows.map(r => columns.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv]));
    a.download = `${activeTable}_${Date.now()}.csv`; a.click();
  };

  // ── display helpers ───────────────────────────────────────────────────
  const fmtCell = (v: any): string => {
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v).slice(0, 80) + (JSON.stringify(v).length > 80 ? "…" : "");
    const s = String(v);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  };

  const isSystem = SYSTEM_TABLES.includes(activeTable);
  const visibleCols = columns.filter(c => !hiddenCols.includes(c));
  const filteredRows = rows.filter(r =>
    !rowSearch || Object.values(r).some(v => String(v ?? "").toLowerCase().includes(rowSearch.toLowerCase()))
  );
  const filteredTables = TABLES.filter(t =>
    (groupFilter === "All" || t.group === groupFilter) &&
    (!tableSearch || t.label.toLowerCase().includes(tableSearch.toLowerCase()) || t.name.toLowerCase().includes(tableSearch.toLowerCase()))
  );
  const currentTableInfo = TABLES.find(t => t.name === activeTable);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const allRoles = ["admin", "procurement_manager", "procurement_officer", "inventory_manager", "warehouse_officer", "requisitioner"];

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: "Segoe UI, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gray-900 flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Database Administration</h1>
            <p className="text-[10px] text-gray-500">MediProcure · Supabase · {TABLES.length} tables</p>
          </div>
        </div>
        {/* Tab buttons */}
        <div className="flex items-center gap-1 ml-6">
          {[
            { id: "tables", label: "Tables", icon: Table2 },
            { id: "sql", label: "SQL Runner", icon: Terminal },
            { id: "users", label: "Users & Roles", icon: Users },
            { id: "stats", label: "Statistics", icon: BarChart3 },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${activeTab === t.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Connected · yvjfehnzbzjliizjvuhq
        </div>
      </div>

      {/* ── TABLES TAB ──────────────────────────────────────────────────── */}
      {activeTab === "tables" && (
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Sidebar */}
          <div className="w-56 bg-white border-r border-gray-200 flex flex-col min-h-0">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={tableSearch} onChange={e => setTableSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:border-blue-400"
                  placeholder="Find table..." />
              </div>
            </div>
            {/* Group filter */}
            <div className="flex flex-wrap gap-1 px-3 py-2 border-b border-gray-100">
              {GROUPS.map(g => (
                <button key={g} onClick={() => setGroupFilter(g)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide transition-all ${groupFilter === g ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {g}
                </button>
              ))}
            </div>
            {/* Table list */}
            <div className="flex-1 overflow-y-auto">
              {filteredTables.map(t => (
                <button key={t.name} onClick={() => setActiveTable(t.name)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-l-2 ${activeTable === t.name ? "bg-blue-50 border-blue-500 text-blue-700" : "border-transparent text-gray-700 hover:bg-gray-50"}`}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{t.label}</p>
                    <p className="text-[9px] text-gray-400 font-mono truncate">{t.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Main data area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentTableInfo?.color }} />
                <span className="text-sm font-bold text-gray-900">{currentTableInfo?.label}</span>
                <span className="font-mono text-xs text-gray-400">({activeTable})</span>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{totalCount.toLocaleString()} rows</span>
                {isSystem && <Badge variant="outline" className="text-[9px] text-amber-700 border-amber-200">Read-only</Badge>}
              </div>
              <div className="relative ml-2 flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={rowSearch} onChange={e => setRowSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:border-blue-400"
                  placeholder="Search rows..." />
              </div>
              <div className="flex items-center gap-1 ml-auto">
                {!isSystem && (
                  <Button size="sm" onClick={() => { setInsertData({}); setShowInsert(true); }}
                    className="h-7 text-xs bg-gray-900 hover:bg-gray-800 text-white gap-1">
                    <Plus className="w-3.5 h-3.5" />Insert Row
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={exportCSV} className="h-7 text-xs gap-1">
                  <Download className="w-3.5 h-3.5" />Export CSV
                </Button>
                <Button size="sm" variant="outline" onClick={fetchTable} className="h-7 text-xs gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
                {/* Column visibility toggle */}
                <div className="relative group">
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <EyeOff className="w-3.5 h-3.5" />Cols
                  </Button>
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-lg z-20 w-48 p-2 hidden group-hover:block">
                    {columns.map(c => (
                      <label key={c} className="flex items-center gap-2 px-1 py-0.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input type="checkbox" checked={!hiddenCols.includes(c)}
                          onChange={e => setHiddenCols(h => e.target.checked ? h.filter(x => x !== c) : [...h, c])}
                          className="w-3 h-3" />
                        <span className="text-xs font-mono text-gray-700">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: "#f8f8f8" }}>
                      {visibleCols.map(c => (
                        <th key={c} className="px-3 py-2 text-left border-b border-gray-200 cursor-pointer group hover:bg-gray-100 transition-colors"
                          onClick={() => { setSortCol(c); setSortAsc(sortCol === c ? !sortAsc : true); }}>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">{c}</span>
                            {sortCol === c && <ArrowUpDown className="w-3 h-3 text-blue-500" />}
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-left border-b border-gray-200 w-20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors group ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                        {visibleCols.map(c => (
                          <td key={c} className="px-3 py-2 text-xs text-gray-700 max-w-[200px]">
                            {c === "status" ? (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                                row[c] === "active" || row[c] === "approved" || row[c] === "paid" || row[c] === "pass" || row[c] === "confirmed" ? "bg-green-100 text-green-700" :
                                row[c] === "pending" ? "bg-amber-100 text-amber-700" :
                                row[c] === "rejected" || row[c] === "fail" || row[c] === "open" || row[c] === "cancelled" ? "bg-red-100 text-red-700" :
                                row[c] === "draft" ? "bg-gray-100 text-gray-600" :
                                "bg-blue-100 text-blue-700"}`}>{row[c]}</span>
                            ) : c.endsWith("_at") || c.endsWith("_date") ? (
                              <span className="text-gray-500 font-mono">{row[c] ? new Date(row[c]).toLocaleDateString("en-KE") : "—"}</span>
                            ) : c.endsWith("amount") || c.endsWith("cost") || c.endsWith("value") || c.endsWith("price") ? (
                              <span className="font-semibold text-gray-800">{row[c] ? `KES ${Number(row[c]).toLocaleString()}` : "—"}</span>
                            ) : (
                              <span title={String(row[c] ?? "")}>{fmtCell(row[c])}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewRow(row)}
                              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors" title="View full row">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {!isSystem && (
                              <>
                                <button onClick={() => { setEditRow(row); setEditData({ ...row }); }}
                                  className="p-1 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors" title="Edit row">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setConfirmDelete(row)}
                                  className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors" title="Delete row">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr><td colSpan={visibleCols.length + 1} className="py-16 text-center text-gray-400 text-sm">
                        {rowSearch ? "No rows match your search." : "This table is empty."}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} rows
                {rowSearch && ` (${filteredRows.length} matching)`}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0} className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">«</button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-3 py-1 text-xs text-gray-600">Page {page + 1} / {totalPages || 1}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">»</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SQL RUNNER TAB ──────────────────────────────────────────────── */}
      {activeTab === "sql" && (
        <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">
          <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-900">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-green-400 font-mono">SQL RUNNER</span>
                <span className="text-[10px] text-gray-500 ml-2">Run queries directly on Supabase</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={runSQL} disabled={sqlLoading || !sqlQuery.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors">
                  <Play className="w-3.5 h-3.5" />{sqlLoading ? "Running…" : "Run Query"}
                </button>
                <button onClick={() => setSqlQuery("")} className="flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-white text-xs transition-colors">
                  <X className="w-3.5 h-3.5" />Clear
                </button>
              </div>
            </div>
            <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)}
              onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") runSQL(); }}
              rows={6}
              className="w-full px-4 py-3 font-mono text-sm text-green-300 bg-gray-900 focus:outline-none resize-none"
              placeholder="-- Write your SQL here (Ctrl+Enter to run)&#10;SELECT * FROM suppliers LIMIT 10;" />
            <div className="px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-[10px] text-gray-500 font-mono">
              Ctrl+Enter to execute · Results shown below
            </div>
          </div>

          {/* SQL History */}
          {sqlHistory.length > 0 && (
            <div className="bg-white rounded border border-gray-200 shadow-sm p-3">
              <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">RECENT QUERIES</p>
              <div className="space-y-1">
                {sqlHistory.slice(0, 5).map((h, i) => (
                  <button key={i} onClick={() => setSqlQuery(h)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 border border-gray-100 font-mono text-xs text-gray-600 truncate">
                    {h.slice(0, 100)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick presets */}
          <div className="bg-white rounded border border-gray-200 shadow-sm p-3">
            <p className="text-[10px] font-bold uppercase text-gray-500 mb-2">QUICK QUERIES</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "All Tables + Row Counts", sql: "SELECT table_name, (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as col_count FROM information_schema.tables t WHERE table_schema = 'public' ORDER BY table_name;" },
                { label: "RLS Policies", sql: "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;" },
                { label: "All Suppliers", sql: "SELECT id, name, email, phone, status, rating FROM suppliers ORDER BY name;" },
                { label: "Pending Requisitions", sql: "SELECT requisition_number, status, priority, total_amount, created_at FROM requisitions WHERE status = 'pending' ORDER BY created_at DESC;" },
                { label: "Recent Audit Log", sql: "SELECT action, module, user_name, entity_type, created_at FROM audit_log ORDER BY created_at DESC LIMIT 20;" },
                { label: "Budget Utilization", sql: "SELECT budget_name, financial_year, allocated_amount, spent_amount, ROUND((spent_amount/NULLIF(allocated_amount,0))*100,1) as pct FROM budgets ORDER BY pct DESC;" },
                { label: "User Roles", sql: "SELECT p.full_name, p.email, ur.role FROM profiles p JOIN user_roles ur ON p.id = ur.user_id ORDER BY p.full_name;" },
                { label: "Low Stock Items", sql: "SELECT name, quantity_in_stock, reorder_level, unit_price FROM items WHERE quantity_in_stock <= reorder_level ORDER BY quantity_in_stock ASC;" },
              ].map(q => (
                <button key={q.label} onClick={() => setSqlQuery(q.sql)}
                  className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors text-gray-600">
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {sqlError && (
            <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-700 mb-1">Query Error</p>
                <p className="text-xs font-mono text-red-600">{sqlError}</p>
                <p className="text-[10px] text-red-400 mt-1">Note: Only SELECT queries on accessible tables are supported via the client SDK. For DDL, use Supabase Dashboard.</p>
              </div>
            </div>
          )}
          {sqlResult && (
            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden flex-1">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <span className="text-xs font-bold text-gray-700">{sqlResult.length} rows returned</span>
                <button onClick={() => { const csv = sqlResult.length && Object.keys(sqlResult[0]).join(",") + "\n" + sqlResult.map(r => Object.values(r).map(v => JSON.stringify(v ?? "")).join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv || ""])); a.download = "query_result.csv"; a.click(); }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <Download className="w-3 h-3" />Export
                </button>
              </div>
              <div className="overflow-auto max-h-80">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>{sqlResult.length > 0 && Object.keys(sqlResult[0]).map(k => <th key={k} className="px-3 py-2 text-left font-mono font-bold text-gray-500 border-b border-gray-200">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sqlResult.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 font-mono text-gray-700">{String(v ?? "null")}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── USERS & ROLES TAB ───────────────────────────────────────────── */}
      {activeTab === "users" && (
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">User Management & Role Assignment</h2>
                <p className="text-xs text-gray-500 mt-0.5">Manage system access and permissions for all staff</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchUsers} className="h-8 gap-1">
                <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`} />Refresh
              </Button>
            </div>

            {usersLoading ? (
              <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-gray-400" /></div>
            ) : (
              <div className="grid gap-3">
                {users.map(u => {
                  const uRoles = userRoles.filter(r => r.user_id === u.id).map(r => r.role);
                  return (
                    <div key={u.id} className="bg-white rounded border border-gray-200 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: "#0078d4" }}>
                            {(u.full_name || u.email || "U")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{u.full_name || "—"}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                            {u.job_title && <p className="text-[10px] text-gray-400">{u.job_title}</p>}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          {allRoles.map(role => {
                            const has = uRoles.includes(role);
                            return (
                              <button key={role} onClick={() => has ? removeRole(u.id, role) : addRole(u.id, role)}
                                className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border transition-all ${has ? "bg-blue-600 text-white border-blue-600 hover:bg-red-500 hover:border-red-500" : "bg-white text-gray-500 border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"}`}
                                title={has ? `Click to remove '${role}'` : `Click to add '${role}'`}>
                                {has ? "✓ " : "+ "}{role.replace(/_/g, " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {uRoles.length === 0 && (
                        <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />No roles assigned — user cannot access the system
                        </p>
                      )}
                    </div>
                  );
                })}
                {users.length === 0 && (
                  <div className="bg-white rounded border border-gray-200 p-12 text-center">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No user profiles found</p>
                    <p className="text-gray-400 text-xs mt-1">Users appear here once they log in and a profile is created</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATISTICS TAB ─────────────────────────────────────────────── */}
      {activeTab === "stats" && (
        <div className="flex-1 p-4 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900">Database Statistics — Row Counts per Table</h2>
              <Button size="sm" variant="outline" onClick={fetchStats} className="h-8 gap-1">
                <RefreshCw className="w-3.5 h-3.5" />Refresh
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {TABLES.map(t => {
                const count = tableCounts[t.name];
                return (
                  <button key={t.name} onClick={() => { setActiveTable(t.name); setActiveTab("tables"); }}
                    className="bg-white rounded border border-gray-200 p-3 text-left hover:border-blue-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{t.group}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 leading-none mb-1">
                      {count === undefined ? <span className="text-gray-300 text-lg">…</span> : count.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-gray-700 truncate">{t.label}</p>
                    <p className="text-[9px] font-mono text-gray-400 truncate">{t.name}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT DIALOG ─────────────────────────────────────────────────── */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Edit className="w-4 h-4" />
              Edit Row — <span className="font-mono text-blue-600">{activeTable}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 p-1">
              {editRow && columns.filter(c => !SKIP_COLS.includes(c)).map(c => (
                <div key={c} className={c === "description" || c === "notes" || c === "narration" || c === "entries" || c === "line_items" || c === "items_received" ? "col-span-2" : ""}>
                  <Label className="text-xs font-mono text-gray-600 mb-1 block">{c}</Label>
                  {c === "status" ? (
                    <select value={editData[c] || ""} onChange={e => setEditData(d => ({ ...d, [c]: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                      {["draft","pending","approved","rejected","active","inactive","issued","paid","confirmed","cancelled","open","under_review","resolved","pass","fail","conditional","published","closed","awarded"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (typeof editData[c] === "object" && editData[c] !== null) || c === "entries" || c === "line_items" || c === "items_received" ? (
                    <Textarea className="font-mono text-xs" rows={4} value={typeof editData[c] === "object" ? JSON.stringify(editData[c], null, 2) : editData[c]}
                      onChange={e => { try { setEditData(d => ({ ...d, [c]: JSON.parse(e.target.value) })); } catch { setEditData(d => ({ ...d, [c]: e.target.value })); } }} />
                  ) : c === "description" || c === "notes" || c === "narration" || c === "issue_description" || c === "recommendation" || c === "corrective_action" ? (
                    <Textarea className="text-sm" rows={3} value={editData[c] || ""} onChange={e => setEditData(d => ({ ...d, [c]: e.target.value }))} />
                  ) : (
                    <Input className="h-8 text-sm" value={editData[c] ?? ""} onChange={e => setEditData(d => ({ ...d, [c]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setEditRow(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
              <Save className="w-3.5 h-3.5" />Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── INSERT DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={showInsert} onOpenChange={v => { setShowInsert(v); if (!v) setInsertData({}); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Insert New Row — <span className="font-mono text-green-600">{activeTable}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3 p-1">
              {columns.filter(c => !["id", "created_at", "updated_at"].includes(c)).map(c => (
                <div key={c} className={c === "description" || c === "notes" || c === "narration" ? "col-span-2" : ""}>
                  <Label className="text-xs font-mono text-gray-600 mb-1 block">{c}</Label>
                  {c === "status" ? (
                    <select value={insertData[c] || "pending"} onChange={e => setInsertData(d => ({ ...d, [c]: e.target.value }))}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400">
                      {["draft","pending","approved","active","inactive","confirmed"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : c === "description" || c === "notes" || c === "narration" ? (
                    <Textarea className="text-sm" rows={2} value={insertData[c] || ""} onChange={e => setInsertData(d => ({ ...d, [c]: e.target.value }))} />
                  ) : (
                    <Input className="h-8 text-sm" value={insertData[c] ?? ""} onChange={e => setInsertData(d => ({ ...d, [c]: e.target.value }))}
                      placeholder={c.includes("amount") || c.includes("cost") ? "0.00" : c.includes("date") ? "YYYY-MM-DD" : ""} />
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => { setShowInsert(false); setInsertData({}); }}>Cancel</Button>
            <Button size="sm" onClick={handleInsert} className="bg-green-600 hover:bg-green-700 text-white gap-1">
              <Plus className="w-3.5 h-3.5" />Insert Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── VIEW ROW DIALOG ─────────────────────────────────────────────── */}
      <Dialog open={!!viewRow} onOpenChange={() => setViewRow(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4" />
              View Row — <span className="font-mono text-gray-600">{activeTable}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {viewRow && (
              <div className="space-y-1 font-mono text-xs p-1">
                {Object.entries(viewRow).map(([k, v]) => (
                  <div key={k} className="flex gap-3 py-1.5 border-b border-gray-100">
                    <span className="w-40 shrink-0 font-bold text-gray-500">{k}</span>
                    <span className="text-gray-800 break-all whitespace-pre-wrap">
                      {v === null ? <span className="text-gray-300 italic">null</span> :
                       typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(String(v ?? ""))}
                      className="ml-auto shrink-0 p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100" title="Copy">
                      <Copy className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-gray-100 pt-3">
            {!isSystem && viewRow && (
              <Button size="sm" onClick={() => { setEditRow(viewRow); setEditData({ ...viewRow }); setViewRow(null); }}
                variant="outline" className="gap-1">
                <Edit className="w-3.5 h-3.5" />Edit this row
              </Button>
            )}
            <Button size="sm" onClick={() => setViewRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM DELETE DIALOG ───────────────────────────────────────── */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-4 h-4" />Delete Row
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700 py-2">
            This will permanently delete this row from <strong className="font-mono">{activeTable}</strong>. This action cannot be undone.
          </p>
          <div className="bg-gray-50 rounded p-2 font-mono text-xs text-gray-600 max-h-24 overflow-auto">
            {confirmDelete && Object.entries(confirmDelete).slice(0, 5).map(([k, v]) => (
              <div key={k}><span className="text-gray-400">{k}:</span> {String(v ?? "null").slice(0, 60)}</div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button size="sm" onClick={() => handleDelete(confirmDelete)}
              className="bg-red-600 hover:bg-red-700 text-white gap-1">
              <Trash2 className="w-3.5 h-3.5" />Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
