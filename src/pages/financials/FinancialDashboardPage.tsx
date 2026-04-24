
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRealtime } from "@/hooks/useRealtime";
import logoImg from "@/assets/logo.png";
import * as XLSX from "xlsx";
import { RefreshCw, Search } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

/* - helpers - */
const fmt = (n: number) =>
  n >= 1_000_000 ? `KES ${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `KES ${(n / 1_000).toFixed(2)}K`
  : `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

const today         = new Date().toISOString().split("T")[0];
const thisMonthStart = today.slice(0, 7) + "-01";

/* - Windows classic 3-D helpers - */
const raised  = "inset -1px -1px 0 #404040, inset 1px 1px 0 #ffffff, inset -2px -2px 0 #808080, inset 2px 2px 0 #dfdfdf";
const sunken  = "inset 1px 1px 0 #404040, inset -1px -1px 0 #ffffff, inset 2px 2px 0 #808080, inset -2px -2px 0 #dfdfdf";
const btnDown = "inset 1px 1px 0 #404040, inset -1px -1px 0 #ffffff, inset 2px 2px 0 #808080";
const WIN_BG  = "#d4d0c8";
const WIN_BLUE = "linear-gradient(to right, #000082, #1086d8)";
const TEAL_DESK = "#008080";

/* - status chip - */
const SC: Record<string, { bg: string; color: string }> = {
  pending:  { bg: "#ffff80", color: "#804000" },
  approved: { bg: "#80ff80", color: "#004000" },
  paid:     { bg: "#80c0ff", color: "#000080" },
  draft:    { bg: "#d4d0c8", color: "#404040" },
  rejected: { bg: "#ff8080", color: "#800000" },
  posted:   { bg: "#e080ff", color: "#400060" },
  reversed: { bg: "#ffb080", color: "#603000" },
  confirmed:{ bg: "#80ff80", color: "#004000" },
  active:   { bg: "#80ff80", color: "#004000" },
};

type RecordFilter = "ALL" | "LATEST100" | "THISMONTH";
type Mod = "payment_vouchers" | "receipt_vouchers" | "journal_vouchers";

const MODS: Record<Mod, string> = {
  payment_vouchers: "Payment Vouchers",
  receipt_vouchers: "Receipt Vouchers",
  journal_vouchers: "Journal Vouchers",
};

const COLS: Record<Mod, string[]> = {
  payment_vouchers: ["Voucher No","Payee","Method","Expense Acct","Status","Amount","Date","Approved By"],
  receipt_vouchers: ["Receipt No","Received From","Method","Amount","Status","Date","Dept","Created By"],
  journal_vouchers: ["Journal No","Narration","Reference","Debit","Credit","Status","Date","Created By"],
};

/* - Win button component - */
function WBtn({ onClick, children, disabled, active, style }: any) {
  const [dn, setDn] = useState(false);
  return (
    <button
      onMouseDown={() => setDn(true)}
      onMouseUp={() => setDn(false)}
      onMouseLeave={() => setDn(false)}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: WIN_BG, border: "none", cursor: disabled ? "default" : "pointer",
        padding: "3px 10px", fontSize: 11, fontFamily: "'Tahoma','MS Sans Serif',sans-serif",
        color: disabled ? "#808080" : "#000",
        boxShadow: dn || active ? btnDown : raised,
        display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
        minHeight: 23, userSelect: "none",
        ...style,
      }}
    >{children}</button>
  );
}

/* - Win input - */
const winInp: React.CSSProperties = {
  background: "#fff", border: "none", boxShadow: sunken,
  padding: "2px 4px", fontSize: 11, fontFamily: "'Tahoma','MS Sans Serif',sans-serif",
  outline: "none", color: "#000",
};

/* - Classic panel / groupbox - */
function GroupBox({ label, children, style }: any) {
  return (
    <fieldset style={{ border: "none", padding: "12px 8px 8px", margin: 0, position: "relative", boxShadow: sunken, ...style }}>
      <legend style={{ fontSize: 11, fontFamily: "'Tahoma','MS Sans Serif',sans-serif", padding: "0 4px", color: "#000", background: WIN_BG, marginLeft: 4 }}>
        {label}
      </legend>
      {children}
    </fieldset>
  );
}

/* - Title bar button - */
function TBarBtn({ label, symbol, onClick }: { label: string; symbol: string; onClick?: () => void }) {
  const [dn, setDn] = useState(false);
  return (
    <button onClick={onClick}
      onMouseDown={() => setDn(true)} onMouseUp={() => setDn(false)} onMouseLeave={() => setDn(false)}
      title={label} style={{
        width: 16, height: 14, fontSize: 9, fontWeight: 700, background: WIN_BG,
        border: "none", boxShadow: dn ? btnDown : raised, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
        fontFamily: "Marlett, 'Wingdings', monospace", color: "#000", lineHeight: 1,
      }}>{symbol}</button>
  );
}

/* - */
export default function FinancialDashboardPage() {
  const navigate = useNavigate();

  const [startDate,     setStartDate]     = useState("2025-12-31");
  const [endDate,       setEndDate]       = useState(today);
  const [recFilter,     setRecFilter]     = useState<RecordFilter>("ALL");
  const [typeFilter,    setTypeFilter]    = useState("ALL");
  const [search,        setSearch]        = useState("");
  const [activeMod,     setActiveMod]     = useState<Mod>("payment_vouchers");
  const [loading,       setLoading]       = useState(true);
  const [coaSearch,     setCoaSearch]     = useState("");
  const [selRow,        setSelRow]        = useState<number | null>(null);
  const [menuOpen,      setMenuOpen]      = useState<string | null>(null);

  const [payments,  setPayments]  = useState<any[]>([]);
  const [receipts,  setReceipts]  = useState<any[]>([]);
  const [journals,  setJournals]  = useState<any[]>([]);
  const [budgets,   setBudgets]   = useState<any[]>([]);
  const [coa,       setCoa]       = useState<any[]>([]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, j, b, c] = await Promise.all([
        (supabase as any).from("payment_vouchers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("receipt_vouchers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("journal_vouchers").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("budgets").select("*").order("budget_name"),
        (supabase as any).from("chart_of_accounts").select("*").order("account_code"),
      ]);
      setPayments(p.data || []); setReceipts(r.data || []); setJournals(j.data || []);
      setBudgets(b.data || []); setCoa(c.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useRealtime({ tables: ["payment_vouchers", "budgets", "gl_journal", "goods_received"] }, refetch);

  /* KPIs */
  const totalPay = payments.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const totalRec = receipts.reduce((s, r) => s + Number(r.amount || 0), 0);
  const netBal   = totalRec - totalPay;
  const totBudg  = budgets.reduce((s, b) => s + Number(b.allocated_amount || 0), 0);

  const activeRows: any[] = activeMod === "payment_vouchers" ? payments : activeMod === "receipt_vouchers" ? receipts : journals;

  const dateFilt = activeRows.filter(r => {
    const d = (r.voucher_date || r.receipt_date || r.journal_date || r.created_at || "").slice(0, 10);
    if (recFilter === "THISMONTH") return d >= thisMonthStart;
    if (recFilter === "LATEST100") return true;
    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
  });
  const statusFilt = typeFilter === "ALL" ? dateFilt : dateFilt.filter(r => r.status === typeFilter.toLowerCase());
  const filtered   = search ? statusFilt.filter(r => Object.values(r).some(v => String(v || "").toLowerCase().includes(search.toLowerCase()))) : statusFilt;
  const displayed  = recFilter === "LATEST100" ? filtered.slice(0, 100) : filtered;

  const filtCoa = coaSearch
    ? coa.filter(c => (c.account_name || "").toLowerCase().includes(coaSearch.toLowerCase()) || String(c.account_code || "").includes(coaSearch))
    : coa.slice(0, 80);

  const allStatuses = [...new Set(activeRows.map(r => r.status).filter(Boolean))];

  const exportExcel = () => {
    if (!displayed.length) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(displayed);
    ws["!cols"] = Object.keys(displayed[0] || {}).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, MODS[activeMod]);
    XLSX.writeFile(wb, `${activeMod}_${today}.xlsx`);
  };

  const printReport = () => {
    if (!displayed.length) return;
    const keys = COLS[activeMod].map(c => c.toLowerCase().replace(/ /g, "_"));
    const w = window.open("", "_blank", "width=1000,height=700")!;
    w.document.write(`<html><head><title>${MODS[activeMod]}</title>
    <style>body{font-family:Tahoma,Arial;font-size:11px;margin:20px}h2{color:#000080}table{width:100%;border-collapse:collapse}th{background:#000080;color:#fff;padding:4px 8px;text-align:left;font-size:10px}td{padding:3px 8px;border-bottom:1px solid #d4d0c8}tr:nth-child(even){background:#f0f0f0}@media print{@page{margin:1cm}}</style>
    </head><body><h2>Embu Level 5 Hospital - ${MODS[activeMod]}</h2>
    <p style="font-size:10px;color:#404040">Printed: ${new Date().toLocaleString("en-KE")} - ${displayed.length} records - ${startDate} to ${endDate}</p>
    <table><thead><tr>${COLS[activeMod].map(c => `<th>${c}</th>`).join("")}</tr></thead>
    <tbody>${displayed.map(r => `<tr>${COLS[activeMod].map(c => `<td>${getCell(r, c, true)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
  };

  const getCell = (row: any, col: string, plain = false): any => {
    const chip = (s: string) => {
      const m = SC[s] || { bg: WIN_BG, color: "#404040" };
      if (plain) return s;
      return <span style={{ background: m.bg, color: m.color, padding: "1px 6px", fontWeight: 700, fontSize: 10, border: "1px solid #808080", fontFamily: "'Tahoma',sans-serif" }}>{s}</span>;
    };
    switch (col) {
      case "Voucher No":    return plain ? row.voucher_number : <b style={{ color: "#000080", fontFamily: "monospace" }}>{row.voucher_number || "-"}</b>;
      case "Receipt No":    return plain ? row.receipt_number : <b style={{ color: "#000080", fontFamily: "monospace" }}>{row.receipt_number || "-"}</b>;
      case "Journal No":    return plain ? row.journal_number : <b style={{ color: "#400080", fontFamily: "monospace" }}>{row.journal_number || "-"}</b>;
      case "Payee":         return row.payee_name || "-";
      case "Received From": return row.received_from || "-";
      case "Narration":     return <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{row.narration || "-"}</span>;
      case "Method":        return row.payment_method || "-";
      case "Expense Acct":  return <span style={{ fontSize: 10, color: "#404040" }}>{row.expense_account || "-"}</span>;
      case "Status":        return chip(row.status || "-");
      case "Amount":
      case "Total Amount":  return plain ? row.total_amount || row.amount : <b>{fmt(Number(row.total_amount || row.amount || 0))}</b>;
      case "Debit":         return plain ? row.total_debit : <b style={{ color: "#000080" }}>{row.total_debit != null ? fmt(Number(row.total_debit)) : "-"}</b>;
      case "Credit":        return plain ? row.total_credit : <b style={{ color: "#006400" }}>{row.total_credit != null ? fmt(Number(row.total_credit)) : "-"}</b>;
      case "Date":          return (row.voucher_date || row.journal_date) ? new Date(row.voucher_date || row.journal_date).toLocaleDateString("en-KE") : "-";
      case "Dept":          return row.department_name || "-";
      case "Reference":     return row.reference || "-";
      case "Approved By":   return row.approved_by_name || "-";
      case "Created By":    return row.created_by_name || row.prepared_by_name || "-";
      default:              return "-";
    }
  };

  /* - menu items - */
  const MENUS: Record<string, { label: string; action?: () => void }[]> = {
    File: [
      { label: "New Voucher", action: () => navigate(`/vouchers/${activeMod.replace("_vouchers","").replace("journal","journal")}`) },
      { label: "Export Excel...", action: exportExcel },
      { label: "Print Report...", action: printReport },
      { label: "-" },
      { label: "Exit", action: () => navigate("/") },
    ],
    View: [
      { label: "Payment Vouchers", action: () => setActiveMod("payment_vouchers") },
      { label: "Receipt Vouchers", action: () => setActiveMod("receipt_vouchers") },
      { label: "Journal Vouchers", action: () => setActiveMod("journal_vouchers") },
      { label: "-" },
      { label: "Refresh F5", action: refetch },
    ],
    Reports: [
      { label: "All Reports", action: () => navigate("/reports") },
      { label: "Budget Overview", action: () => navigate("/financials/budgets") },
      { label: "Fixed Assets", action: () => navigate("/financials/fixed-assets") },
      { label: "Chart of Accounts", action: () => navigate("/financials/chart-of-accounts") },
    ],
    Help: [
      { label: "About EL5 Finance..." },
    ],
  };

  /* - KPI tiles def - */
  const KPIS = [
    { label: "Total Payments", value: fmt(totalPay), icon: "-", borderColor: "#800000" },
    { label: "Total Receipts", value: fmt(totalRec), icon: "-", borderColor: "#006400" },
    { label: "Net Balance",    value: fmt(Math.abs(netBal)), icon: netBal >= 0 ? "-" : "-", borderColor: "#000080" },
    { label: "Record Count",   value: String(displayed.length), icon: "-", borderColor: "#800080", big: true },
    { label: "Budget Alloc.",  value: fmt(totBudg), icon: "-", borderColor: "#804000" },
  ];

  return (
    <div style={{ fontFamily: "'Tahoma','MS Sans Serif',sans-serif", background: TEAL_DESK, minHeight: "100vh", display: "flex", flexDirection: "column", padding: 8 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes marquee { 0%{background-position:0 0} 100%{background-position:20px 0} }
        /* win-row styles now inline */
        .tb-btn:active { box-shadow: ${btnDown} !important; }
        input[type=date]::-webkit-calendar-picker-indicator { cursor: pointer; filter: invert(0); }
        ::-webkit-scrollbar { width: 14px; height: 14px; }
        ::-webkit-scrollbar-track { background: ${WIN_BG}; box-shadow: ${sunken}; }
        ::-webkit-scrollbar-thumb { background: ${WIN_BG}; box-shadow: ${raised}; }
        ::-webkit-scrollbar-button { background: ${WIN_BG}; box-shadow: ${raised}; display: block; height: 14px; width: 14px; }
        ::-webkit-scrollbar-corner { background: ${WIN_BG}; }
        select { background: #fff; font-family: 'Tahoma','MS Sans Serif',sans-serif; font-size: 11px; }
        th { font-family: 'Tahoma','MS Sans Serif',sans-serif; font-size: 11px; }
        td { font-family: 'Tahoma','MS Sans Serif',sans-serif; font-size: 11px; }
      `}</style>

      {/* - MAIN APPLICATION WINDOW - */}
      <div style={{ background: WIN_BG, boxShadow: raised, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>

        {/* - Title Bar - */}
        <div style={{ background: WIN_BLUE, padding: "3px 6px", display: "flex", alignItems: "center", gap: 4, userSelect: "none" }}>
          <img src={logoImg} alt="" style={{ width: 16, height: 16, objectFit: "contain", imageRendering: "pixelated" }}/>
          <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: 0.3 }}>
            EL5 MediProcure - Financial Management System &nbsp;[{MODS[activeMod]}]
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            <TBarBtn label="Minimize"  symbol="0" />
            <TBarBtn label="Maximize"  symbol="1" />
            <TBarBtn label="Close"     symbol="r" onClick={() => navigate("/")} />
          </div>
        </div>

        {/* - Menu Bar - */}
        <div style={{ background: WIN_BG, boxShadow: "0 1px 0 #808080", display: "flex", alignItems: "stretch", fontSize: 11, userSelect: "none", position: "relative", zIndex: 200 }}>
          {Object.keys(MENUS).map(key => (
            <div key={key} style={{ position: "relative" }}>
              <div
                onClick={() => setMenuOpen(menuOpen === key ? null : key)}
                style={{ padding: "3px 10px", cursor: "default", background: menuOpen === key ? "#000082" : "transparent", color: menuOpen === key ? "#fff" : "#000" }}
                
              >
                {key}
              </div>
              {menuOpen === key && (
                <div style={{ position: "absolute", top: "100%", left: 0, background: WIN_BG, boxShadow: raised, zIndex: 300, minWidth: 180, border: "1px solid #808080" }}>
                  {MENUS[key].map((item, i) =>
                    item.label.startsWith("-") ? (
                      <div key={i} style={{ height: 1, background: "#808080", margin: "2px 0" }}/>
                    ) : (
                      <div key={i} 
                        onClick={() => { item.action?.(); setMenuOpen(null); }}
                        style={{ padding: "3px 20px 3px 28px", cursor: "default", fontSize: 11, whiteSpace: "nowrap" }}>
                        {item.label}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* - Toolbar - */}
        <div style={{ background: WIN_BG, borderBottom: "1px solid #808080", padding: "3px 6px", display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
          {/* Logo + App name */}
          <img src={logoImg} alt="" style={{ width: 24, height: 24, objectFit: "contain", marginRight: 4 }}/>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#000", marginRight: 8 }}>Embu Level 5 Hospital</span>
          
          <div style={{ width: 1, height: 22, background: "#808080", margin: "0 4px" }}/>

          {/* Date Range */}
          <span style={{ fontSize: 11 }}>Date:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ ...winInp, width: 110 }}/>
          <span style={{ fontSize: 11 }}>to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ ...winInp, width: 110 }}/>

          <div style={{ width: 1, height: 22, background: "#808080", margin: "0 4px" }}/>

          <WBtn onClick={refetch} disabled={loading}>
            <RefreshCw style={{ width: 12, height: 12, animation: loading ? "spin 1s linear infinite" : "none" }}/>
            Refresh
          </WBtn>

          <div style={{ width: 1, height: 22, background: "#808080", margin: "0 4px" }}/>

          {/* Module tabs as toolbar buttons */}
          {(Object.keys(MODS) as Mod[]).map(m => (
            <WBtn key={m} onClick={() => { setActiveMod(m); setSearch(""); setTypeFilter("ALL"); }} active={activeMod === m}
              style={{ fontWeight: activeMod === m ? 700 : 400, background: activeMod === m ? "#d0e0f0" : WIN_BG }}>
              {m === "payment_vouchers" ? "- Payments" : m === "receipt_vouchers" ? "- Receipts" : "- Journals"}
            </WBtn>
          ))}

          <div style={{ flex: 1 }}/>
          <WBtn onClick={printReport}>- Print</WBtn>
          <WBtn onClick={exportExcel}>- Export</WBtn>
        </div>

        {/* - KPI Panel - */}
        <div style={{ padding: "6px 8px", background: WIN_BG, borderBottom: "1px solid #808080", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {KPIS.map(k => (
            <div key={k.label} style={{
              boxShadow: sunken, background: "#fff", padding: "6px 14px", minWidth: 160, flex: 1,
              borderLeft: `3px solid ${k.borderColor}`, display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{ fontSize: 22 }}>{k.icon}</span>
              <div>
                <div style={{ fontSize: k.big ? 26 : 18, fontWeight: 700, color: k.borderColor, lineHeight: 1.1, fontFamily: "'Courier New',monospace" }}>{k.value}</div>
                <div style={{ fontSize: 10, color: "#404040", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* - Body: Sidebar + Main - */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>

          {/* - LEFT SIDEBAR: Chart of Accounts - */}
          <div style={{ width: 230, minWidth: 230, boxShadow: sunken, background: "#fff", display: "flex", flexDirection: "column", margin: 6, marginRight: 0 }}>
            {/* Sidebar title bar */}
            <div style={{ background: "#000082", padding: "3px 6px", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>- Chart of Accounts</span>
            </div>
            {/* Search */}
            <div style={{ padding: "4px 6px", background: WIN_BG, borderBottom: "1px solid #808080" }}>
              <input value={coaSearch} onChange={e => setCoaSearch(e.target.value)} placeholder="Search accounts..."
                style={{ ...winInp, width: "100%", boxSizing: "border-box" }}/>
            </div>
            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 38px", background: WIN_BG, borderBottom: "1px solid #808080" }}>
              {["Account Name", "Type"].map(h => (
                <div key={h} style={{ padding: "2px 6px", fontSize: 10, fontWeight: 700, boxShadow: raised, margin: 1 }}>{h}</div>
              ))}
            </div>
            {/* Rows */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtCoa.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "#808080", fontSize: 11 }}>No accounts found</div>
              ) : filtCoa.map((c, i) => (
                <div key={c.id || i} 
                  onClick={() => navigate("/financials/chart-of-accounts")}
                  style={{ display: "grid", gridTemplateColumns: "1fr 38px", borderBottom: "1px solid #d4d0c8", background: i % 2 === 0 ? "#fff" : "#f0f0f0", cursor: "default" }}>
                  <span style={{ padding: "3px 6px", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.account_name}>{c.account_name || "-"}</span>
                  <span style={{ padding: "3px 4px", fontSize: 10, color: "#404040", textAlign: "center" }}>{(c.account_type || "").slice(0, 3)}</span>
                </div>
              ))}
            </div>
            {/* Sidebar status */}
            <div style={{ padding: "2px 6px", background: WIN_BG, borderTop: "1px solid #808080", fontSize: 10, color: "#404040" }}>
              {filtCoa.length} accounts - <span style={{ cursor: "pointer", color: "#000080", textDecoration: "underline" }} onClick={() => navigate("/financials/chart-of-accounts")}>View all -</span>
            </div>
          </div>

          {/* - MAIN PANEL - */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", margin: 6, minWidth: 0, overflow: "hidden" }}>

            {/* Filter / toolbar GroupBox */}
            <GroupBox label={`${MODS[activeMod]} - Filter & Extract`} style={{ background: WIN_BG, marginBottom: 6, padding: "16px 8px 8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11 }}>Search:</span>
                <div style={{ position: "relative" }}>
                  <Search style={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", width: 10, height: 10, color: "#808080" }}/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter records..."
                    style={{ ...winInp, paddingLeft: 18, width: 180 }}/>
                </div>
                <span style={{ fontSize: 11 }}>Status:</span>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                  style={{ ...winInp, boxShadow: sunken, padding: "2px 6px" }}>
                  <option value="ALL">ALL</option>
                  {allStatuses.map(s => <option key={s} value={s.toUpperCase()}>{s.toUpperCase()}</option>)}
                </select>
                <div style={{ display: "flex", gap: 2 }}>
                  {([["ALL", "All Records"], ["LATEST100", "Latest 100"], ["THISMONTH", "This Month"]] as [RecordFilter, string][]).map(([val, lbl]) => (
                    <label key={val} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, cursor: "default", padding: "1px 6px", background: recFilter === val ? "#d0e0ff" : "transparent", boxShadow: recFilter === val ? sunken : "none" }}>
                      <input type="radio" name="rf" value={val} checked={recFilter === val} onChange={() => setRecFilter(val)} style={{ accentColor: "#000080" }}/>
                      {lbl}
                    </label>
                  ))}
                </div>
                <div style={{ flex: 1 }}/>
                <WBtn onClick={exportExcel}>Extract -</WBtn>
              </div>
            </GroupBox>

            {/* Data ListView */}
            <div style={{ flex: 1, boxShadow: sunken, background: "#fff", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ overflowX: "auto", overflowY: "auto", flex: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {COLS[activeMod].map(col => (
                        <th key={col} style={{
                          padding: "3px 8px", textAlign: "left", whiteSpace: "nowrap",
                          boxShadow: raised, background: WIN_BG, position: "sticky", top: 0, zIndex: 2,
                          fontWeight: 700, fontSize: 11, cursor: "default", userSelect: "none",
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={COLS[activeMod].length} style={{ padding: 40, textAlign: "center" }}>
                        <RefreshCw style={{ width: 20, height: 20, animation: "spin 1s linear infinite", display: "block", margin: "0 auto 8px", color: "#808080" }}/>
                        <div style={{ fontSize: 11, color: "#808080" }}>Loading data...</div>
                      </td></tr>
                    ) : displayed.length === 0 ? (
                      <tr><td colSpan={COLS[activeMod].length} style={{ padding: 40, textAlign: "center", color: "#808080", fontSize: 11 }}>No records found</td></tr>
                    ) : displayed.map((row, i) => (
                      <tr key={row.id || i}
                        onClick={() => setSelRow(i)}
                        style={{ cursor:"default", background: selRow === i ? "#000082" : i%2===0 ? "#fff" : "#f8f8f0" }}>
                        {COLS[activeMod].map(col => (
                          <td key={col} style={{
                            padding: "2px 8px", borderBottom: "1px solid #d4d0c8", whiteSpace: "nowrap",
                            background: selRow === i ? "#000082" : i % 2 === 0 ? "#fff" : "#f8f8f0",
                            color: selRow === i ? "#fff" : "#000",
                          }}>
                            {getCell(row, col)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* - Status Bar - */}
        <div style={{ background: WIN_BG, borderTop: "1px solid #808080", padding: "2px 6px", display: "flex", alignItems: "center", gap: 2 }}>
          {[
            `${displayed.length} object${displayed.length !== 1 ? "s" : ""}`,
            `Module: ${MODS[activeMod]}`,
            `Date range: ${startDate} to ${endDate}`,
            loading ? "- Loading..." : "- Ready",
          ].map((s, i) => (
            <div key={i} style={{ boxShadow: sunken, padding: "1px 10px", fontSize: 10, color: "#000", marginRight: 2, whiteSpace: "nowrap" }}>{s}</div>
          ))}
          <div style={{ flex: 1 }}/>
          <div style={{ boxShadow: sunken, padding: "1px 10px", fontSize: 10, color: "#000" }}>
            {new Date().toLocaleDateString("en-KE", { weekday: "short", year: "numeric", month: "short", day: "numeric" })} &nbsp; {new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {/* Click-away for menus */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 190 }} onClick={() => setMenuOpen(null)}/>
      )}
    </div>
  );
}


