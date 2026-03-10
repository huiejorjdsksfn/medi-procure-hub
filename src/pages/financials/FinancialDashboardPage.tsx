
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import * as XLSX from "xlsx";
import {
  RefreshCw, Printer, Save, Search, DollarSign, TrendingUp,
  TrendingDown, BookOpen, BarChart3, Filter, Download, Plus,
  ChevronDown, Activity, Wallet
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────────── */
const fmtAmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `KES ${(n / 1_000).toFixed(2)}K`
  : `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

const today = new Date().toISOString().split("T")[0];
const thisMonthStart = today.slice(0, 7) + "-01";

/* ── status badge colours ─────────────────────────────────── */
const SC: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#dcfce7", color: "#15803d" },
  paid:     { bg: "#dbeafe", color: "#1d4ed8" },
  draft:    { bg: "#f3f4f6", color: "#6b7280" },
  rejected: { bg: "#fee2e2", color: "#dc2626" },
  posted:   { bg: "#ede9fe", color: "#6d28d9" },
  reversed: { bg: "#ffedd5", color: "#c2410c" },
  confirmed:{ bg: "#dcfce7", color: "#15803d" },
  active:   { bg: "#dcfce7", color: "#15803d" },
  draft_jv: { bg: "#f3f4f6", color: "#6b7280" },
};

type RecordFilter = "ALL" | "LATEST100" | "THISMONTH";
type ActiveModule = "payment_vouchers" | "receipt_vouchers" | "journal_vouchers";

const MODULE_LABELS: Record<ActiveModule, string> = {
  payment_vouchers: "Payment Vouchers",
  receipt_vouchers: "Receipt Vouchers",
  journal_vouchers: "Journal Vouchers",
};

/* ═══════════════════════════════════════════════════════════ */
export default function FinancialDashboardPage() {
  const navigate = useNavigate();

  /* date range */
  const [startDate, setStartDate]       = useState("2025-12-31");
  const [endDate, setEndDate]           = useState(today);
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("ALL");
  const [typeFilter, setTypeFilter]     = useState("ALL");
  const [search, setSearch]             = useState("");
  const [activeModule, setActiveModule] = useState<ActiveModule>("payment_vouchers");
  const [showModuleMenu, setShowModuleMenu] = useState(false);

  /* data */
  const [payments,  setPayments]    = useState<any[]>([]);
  const [receipts,  setReceipts]    = useState<any[]>([]);
  const [journals,  setJournals]    = useState<any[]>([]);
  const [budgets,   setBudgets]     = useState<any[]>([]);
  const [coa,       setCoa]         = useState<any[]>([]);
  const [loading,   setLoading]     = useState(true);
  const [coaSearch, setCoaSearch]   = useState("");

  const refetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, j, b, c] = await Promise.all([
        (supabase as any).from("payment_vouchers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("receipt_vouchers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("journal_vouchers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("budgets").select("*").order("budget_name"),
        (supabase as any).from("chart_of_accounts").select("*").order("account_code"),
      ]);
      setPayments(p.data || []);
      setReceipts(r.data || []);
      setJournals(j.data || []);
      setBudgets(b.data || []);
      setCoa(c.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { refetchAll(); }, [refetchAll]);

  /* ── KPI computations ─────────────────────────────── */
  const totalPayments  = payments.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalReceipts  = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
  const netBalance     = totalReceipts - totalPayments;
  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated_amount || 0), 0);
  const pendingCount   = payments.filter(p => p.status === "pending").length
                       + receipts.filter(r => r.status === "pending").length;

  /* ── active table rows ───────────────────────────── */
  const activeRows: any[] =
    activeModule === "payment_vouchers" ? payments :
    activeModule === "receipt_vouchers" ? receipts : journals;

  const dateFiltered = activeRows.filter(r => {
    const d = (r.voucher_date || r.receipt_date || r.journal_date || r.created_at || "").slice(0, 10);
    if (recordFilter === "THISMONTH") return d >= thisMonthStart;
    if (recordFilter === "LATEST100") return true;
    const inRange = (!startDate || d >= startDate) && (!endDate || d <= endDate);
    return inRange;
  });

  const statusFiltered = typeFilter === "ALL" ? dateFiltered
    : dateFiltered.filter(r => r.status === typeFilter.toLowerCase());

  const filtered = search
    ? statusFiltered.filter(r => {
        const q = search.toLowerCase();
        return Object.values(r).some(v => String(v || "").toLowerCase().includes(q));
      })
    : statusFiltered;

  const displayed = recordFilter === "LATEST100" ? filtered.slice(0, 100) : filtered;

  /* ── COA sidebar ─────────────────────────────────── */
  const filteredCoa = coaSearch
    ? coa.filter(c => (c.account_name || "").toLowerCase().includes(coaSearch.toLowerCase()) || (c.account_code || "").includes(coaSearch))
    : coa.slice(0, 60);

  /* ── export ──────────────────────────────────────── */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(displayed);
    ws["!cols"] = Object.keys(displayed[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, MODULE_LABELS[activeModule]);
    XLSX.writeFile(wb, `${activeModule}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const printReport = () => {
    if (!displayed.length) return;
    const keys = ["voucher_number","receipt_number","journal_number","payee_name","received_from","description","payment_method","status","total_amount","amount","voucher_date","receipt_date","journal_date"].filter(k => displayed[0]?.[k] !== undefined);
    const w = window.open("", "_blank", "width=1000,height=700")!;
    w.document.write(`<html><head><title>${MODULE_LABELS[activeModule]}</title>
    <style>body{font-family:'Segoe UI',sans-serif;font-size:11px;margin:20px}
    .hdr{display:flex;align-items:center;gap:12px;border-bottom:2px solid #0a2558;padding-bottom:10px;margin-bottom:14px}
    h2{color:#0a2558;margin:0;font-size:14px}table{width:100%;border-collapse:collapse}
    th{background:#0a2558;color:#fff;padding:6px 10px;text-align:left;font-size:10px}
    td{padding:5px 10px;border-bottom:1px solid #e5e7eb;font-size:10px}
    tr:nth-child(even){background:#f9fafb}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="hdr"><img src="${logoImg}" style="width:52px;height:52px;object-fit:contain"/>
    <div><h2>Embu Level 5 Hospital</h2><div style="font-size:10px;color:#6b7280">Reports &amp; Data Extraction — ${MODULE_LABELS[activeModule]}</div>
    <div style="font-size:9px;color:#9ca3af">Date range: ${startDate} to ${endDate} · Printed: ${new Date().toLocaleString("en-KE")}</div></div></div>
    <table><thead><tr>${keys.map(k => `<th>${k.replace(/_/g, " ").toUpperCase()}</th>`).join("")}</tr></thead>
    <tbody>${displayed.map(r => `<tr>${keys.map(k => `<td>${r[k] ?? "—"}</td>`).join("")}</tr>`).join("")}</tbody>
    </table><div style="margin-top:12px;font-size:10px;color:#6b7280">${displayed.length} records · ${startDate} to ${endDate}</div>
    </body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  };

  /* ── column configs per module ───────────────────── */
  const COLS: Record<ActiveModule, string[]> = {
    payment_vouchers: ["Voucher No", "Payee", "Method", "Expense Account", "Status", "Total Amount", "Date", "Approved By"],
    receipt_vouchers: ["Receipt No", "Received From", "Method", "Amount", "Status", "Receipt Date", "Dept", "Created By"],
    journal_vouchers: ["Journal No", "Narration", "Reference", "Debit", "Credit", "Status", "Date", "Created By"],
  };

  const getCell = (row: any, col: string) => {
    switch (col) {
      case "Voucher No":   return <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#0f766e" }}>{row.voucher_number || "—"}</span>;
      case "Receipt No":   return <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1d4ed8" }}>{row.receipt_number || "—"}</span>;
      case "Journal No":   return <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#7c3aed" }}>{row.journal_number || "—"}</span>;
      case "Payee":        return row.payee_name || "—";
      case "Received From":return row.received_from || "—";
      case "Narration":    return <span style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{row.narration || "—"}</span>;
      case "Method":       return row.payment_method || row.payment_method || "—";
      case "Expense Account": return <span style={{ fontSize: 11, color: "#6b7280" }}>{row.expense_account || "—"}</span>;
      case "Status": {
        const s = SC[row.status] || { bg: "#f3f4f6", color: "#6b7280" };
        return <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, textTransform: "capitalize" }}>{row.status || "—"}</span>;
      }
      case "Total Amount": return <span style={{ fontWeight: 700, color: "#111827" }}>{row.total_amount != null ? fmtAmt(Number(row.total_amount)) : "—"}</span>;
      case "Amount":       return <span style={{ fontWeight: 700, color: "#111827" }}>{row.amount != null ? fmtAmt(Number(row.amount)) : "—"}</span>;
      case "Debit":        return <span style={{ fontWeight: 700, color: "#1d4ed8" }}>{row.total_debit != null ? fmtAmt(Number(row.total_debit)) : "—"}</span>;
      case "Credit":       return <span style={{ fontWeight: 700, color: "#15803d" }}>{row.total_credit != null ? fmtAmt(Number(row.total_credit)) : "—"}</span>;
      case "Date":         return row.voucher_date || row.journal_date ? new Date(row.voucher_date || row.journal_date).toLocaleDateString("en-KE") : "—";
      case "Receipt Date": return row.receipt_date ? new Date(row.receipt_date).toLocaleDateString("en-KE") : "—";
      case "Dept":         return row.department_name || "—";
      case "Reference":    return row.reference || "—";
      case "Approved By":  return row.approved_by_name || "—";
      case "Created By":   return row.created_by_name || row.prepared_by_name || "—";
      default:             return "—";
    }
  };

  /* ── all unique statuses in current table ──────── */
  const allStatuses = [...new Set(activeRows.map(r => r.status).filter(Boolean))];

  /* ── styles ──────────────────────────────────────── */
  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 5, padding: "5px 13px",
    border: "1.5px solid #c9cdd4", borderRadius: 4, cursor: "pointer",
    fontSize: 13, fontWeight: 600, background: "#f5f5f5", color: "#222",
    fontFamily: "'Segoe UI',system-ui",
  };

  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#e8e9eb", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fin-row:hover td { background: #d8eaf7 !important; }
        .coa-row:hover { background: #e8f4fd !important; cursor: pointer; }
        select option { background: #fff; color: #222; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; }
        .mod-btn { transition: background 0.15s; }
        .mod-btn:hover { background: rgba(255,255,255,0.2) !important; }
      `}</style>

      {/* ── TOP HEADER BAR ─────────────────────────────────── */}
      <div style={{ background: "#f0f0f0", borderBottom: "1px solid #c4c4c4", padding: "7px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 240 }}>
          <img src={logoImg} alt="logo" style={{ width: 46, height: 46, objectFit: "contain" }}/>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#111", lineHeight: 1.2 }}>Embu Level 5 Hospital</div>
            <div style={{ fontSize: 10.5, color: "#666" }}>Reports &amp; Data Extraction — {MODULE_LABELS[activeModule]}</div>
          </div>
        </div>

        {/* Date Range */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1.5px solid #c4c4c4", borderRadius: 4, padding: "4px 10px" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>Date Range</span>
          <span style={{ fontSize: 12, color: "#666" }}>Start Date</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ border: "1px solid #bbb", borderRadius: 3, padding: "3px 6px", fontSize: 12, outline: "none" }}/>
          <span style={{ fontSize: 12, color: "#666" }}>End Date</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ border: "1px solid #bbb", borderRadius: 3, padding: "3px 6px", fontSize: 12, outline: "none" }}/>
        </div>

        {/* Refresh */}
        <button onClick={refetchAll} disabled={loading} style={{ ...btnBase, minWidth: 80 }}>
          <RefreshCw style={{ width: 13, height: 13, ...(loading ? { animation: "spin 1s linear infinite" } : {}) }}/>
          Refresh
        </button>

        <div style={{ flex: 1 }}/>

        {/* Module Selector */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowModuleMenu(m => !m)}
            style={{ ...btnBase, minWidth: 180, justifyContent: "space-between", background: "#fff", border: "1.5px solid #adb5bd" }}>
            <span style={{ fontWeight: 700 }}>{MODULE_LABELS[activeModule]}</span>
            <ChevronDown style={{ width: 13, height: 13, color: "#666" }}/>
          </button>
          {showModuleMenu && (
            <div style={{ position: "absolute", top: "100%", right: 0, zIndex: 100, background: "#fff", border: "1.5px solid #adb5bd", borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: 200 }}>
              {(Object.keys(MODULE_LABELS) as ActiveModule[]).map(m => (
                <div key={m} onClick={() => { setActiveModule(m); setShowModuleMenu(false); setSearch(""); setTypeFilter("ALL"); }}
                  style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: activeModule === m ? 700 : 500, color: activeModule === m ? "#0f766e" : "#222", background: activeModule === m ? "#f0fdf4" : "#fff" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f5f5f5"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = activeModule === m ? "#f0fdf4" : "#fff"}>
                  {MODULE_LABELS[m]}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Print */}
        <button onClick={printReport} style={{ ...btnBase, background: "#fff" }}>
          <Printer style={{ width: 13, height: 13 }}/>Print
        </button>

        {/* Save / Export */}
        <button onClick={exportExcel} style={{ ...btnBase, background: "#fff" }}>
          <Save style={{ width: 13, height: 13 }}/>Save
        </button>
      </div>

      {/* ── KPI TILES ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0 }}>
        {/* Tile 1 – Total Payments */}
        <div style={{ background: "#c0392b", padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 82, borderRight: "2px solid rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 0.5 }}>{fmtAmt(totalPayments)}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Total Payments</div>
        </div>
        {/* Tile 2 – Total Receipts */}
        <div style={{ background: "#7d6608", padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 82, borderRight: "2px solid rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 0.5 }}>{fmtAmt(totalReceipts)}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Total Receipts</div>
        </div>
        {/* Tile 3 – Net Balance */}
        <div style={{ background: "#1a6b5a", padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 82, borderRight: "2px solid rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 0.5 }}>{fmtAmt(Math.abs(netBalance))}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Net Balance</div>
        </div>
        {/* Tile 4 – Record Count */}
        <div style={{ background: "#6c3483", padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 82, borderRight: "2px solid rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{displayed.length}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Record Count</div>
        </div>
        {/* Tile 5 – Budget Allocated */}
        <div style={{ background: "#1a1a2e", padding: "18px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 82 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 0.5 }}>{fmtAmt(totalAllocated)}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>Budget Allocated</div>
        </div>
      </div>

      {/* ── BODY (sidebar + main) ──────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, gap: 0 }}>
        {/* Left sidebar – Chart of Accounts */}
        <div style={{ width: 234, minWidth: 234, background: "#f5f5f5", borderRight: "1px solid #c4c4c4", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 12px", background: "#e8e9eb", borderBottom: "1px solid #c4c4c4" }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#222", marginBottom: 8 }}>Chart of Accounts</div>
            <input value={coaSearch} onChange={e => setCoaSearch(e.target.value)} placeholder="Search"
              style={{ width: "100%", padding: "5px 8px", border: "1px solid #bbb", borderRadius: 3, fontSize: 12, outline: "none", background: "#fff", boxSizing: "border-box" as const }}/>
          </div>
          {/* Header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "5px 10px", background: "#003399", borderBottom: "1px solid #0022aa" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>ACCOUNT NAME</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>TYPE</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredCoa.length === 0 ? (
              <div style={{ padding: "20px 12px", textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No accounts</div>
            ) : filteredCoa.map((c, i) => (
              <div key={c.id || i} className="coa-row"
                style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "5px 10px", borderBottom: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#f9f9f9" }}
                onClick={() => navigate("/financials/chart-of-accounts")}>
                <span style={{ fontSize: 11.5, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 6 }} title={c.account_name}>{c.account_name || "—"}</span>
                <span style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, whiteSpace: "nowrap" }}>{c.account_type?.slice(0, 3) || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MAIN CONTENT ──────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Sub-header panel */}
          <div style={{ background: "#f5f5f5", border: "1px solid #d4d4d4", margin: "10px 10px 0", borderRadius: 3 }}>
            <div style={{ padding: "7px 12px", borderBottom: "1px solid #d4d4d4", fontSize: 12, fontWeight: 800, color: "#333" }}>
              {MODULE_LABELS[activeModule]} — Add / Extract
            </div>
            <div style={{ padding: "7px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Search */}
              <span style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>Search</span>
              <div style={{ position: "relative" }}>
                <Search style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, color: "#999" }}/>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter records…"
                  style={{ paddingLeft: 26, paddingRight: 8, paddingTop: 5, paddingBottom: 5, border: "1.5px solid #bbb", borderRadius: 3, fontSize: 12, outline: "none", width: 200 }}/>
              </div>
              {/* Type filter */}
              <span style={{ fontSize: 12, fontWeight: 700, color: "#444" }}>Type</span>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                style={{ padding: "4px 8px", border: "1.5px solid #bbb", borderRadius: 3, fontSize: 12, outline: "none" }}>
                <option value="ALL">ALL</option>
                {allStatuses.map(s => <option key={s} value={s.toUpperCase()}>{s.toUpperCase()}</option>)}
              </select>

              <div style={{ flex: 1 }}/>

              {/* Extract button */}
              <button onClick={exportExcel}
                style={{ padding: "5px 16px", background: "#fff", border: "1.5px solid #c4c4c4", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#333" }}>
                Extract
              </button>
            </div>
            {/* Show Records radio */}
            <div style={{ padding: "6px 12px", borderTop: "1px solid #eee", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#444", marginRight: 4 }}>Show Records:</span>
              {([["ALL", "ALL"], ["LATEST100", "Latest 100"], ["THISMONTH", "This Month"]] as [RecordFilter, string][]).map(([val, label]) => (
                <label key={val} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, color: "#333" }}>
                  <input type="radio" name="recFilter" value={val} checked={recordFilter === val} onChange={() => setRecordFilter(val)} style={{ cursor: "pointer" }}/>
                  {label}
                </label>
              ))}
              <div style={{ flex: 1 }}/>
              <span style={{ fontSize: 12, color: "#666" }}>{displayed.length} records</span>
            </div>
          </div>

          {/* Data table */}
          <div style={{ flex: 1, overflow: "auto", margin: "0 10px", border: "1px solid #d4d4d4", borderTop: "none", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#003399", position: "sticky", top: 0, zIndex: 2 }}>
                  {COLS[activeModule].map(col => (
                    <th key={col} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", borderRight: "1px solid rgba(255,255,255,0.15)" }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={COLS[activeModule].length} style={{ padding: 40, textAlign: "center" }}>
                    <RefreshCw style={{ width: 18, height: 18, color: "#9ca3af", animation: "spin 1s linear infinite", display: "block", margin: "0 auto 8px" }}/>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Loading…</span>
                  </td></tr>
                ) : displayed.length === 0 ? (
                  <tr><td colSpan={COLS[activeModule].length} style={{ padding: 50, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                    No records found for the selected filters
                  </td></tr>
                ) : displayed.map((row, i) => (
                  <tr key={row.id || i} className="fin-row">
                    {COLS[activeModule].map(col => (
                      <td key={col} style={{ padding: "6px 12px", borderBottom: "1px solid #e8e8e8", color: "#1a1a1a", background: i % 2 === 0 ? "#fff" : "#f4f8fb", whiteSpace: "nowrap", borderRight: "1px solid #ececec" }}>
                        {getCell(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── BOTTOM ACTION BAR ─────────────────────── */}
          <div style={{ background: "#e8e9eb", borderTop: "2px solid #bbb", padding: "7px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={refetchAll} disabled={loading}
              style={{ ...btnBase, gap: 5, minWidth: 80 }}>
              <RefreshCw style={{ width: 13, height: 13, ...(loading ? { animation: "spin 1s linear infinite" } : {}) }}/>
              Refresh
            </button>
            <button onClick={exportExcel}
              style={{ ...btnBase, minWidth: 80 }}>
              <Download style={{ width: 13, height: 13 }}/>
              Extract
            </button>
            <div style={{ width: 1, height: 24, background: "#bbb", margin: "0 4px" }}/>
            <button onClick={printReport}
              style={{ ...btnBase, minWidth: 110 }}>
              <Printer style={{ width: 13, height: 13 }}/>
              Print Report
            </button>
            <button onClick={exportExcel}
              style={{ ...btnBase, minWidth: 120 }}>
              <BarChart3 style={{ width: 13, height: 13 }}/>
              Export Excel
            </button>
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 12, color: "#555" }}>
              {displayed.length} records · {startDate} to {endDate}
            </span>
          </div>
        </div>
      </div>

      {/* Click-away for module menu */}
      {showModuleMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setShowModuleMenu(false)}/>
      )}
    </div>
  );
}
