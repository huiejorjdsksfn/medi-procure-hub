import type React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePurchaseOrders } from "@/hooks/useDropdownData";

/* ═══════════════════════════════════════════════════════════════
   Windows XP Luna Blue design system
   ═══════════════════════════════════════════════════════════════ */
const XP = {
  /* Titlebar */
  titleBar:     "linear-gradient(180deg,#4a90e2 0%,#2464c3 8%,#245ebd 92%,#1a4fa8 100%)",
  titleShadow:  "0 2px 8px rgba(0,0,80,0.5)",
  /* Window */
  winBg:        "#ece9d8",
  winBorder:    "2px solid #0054e3",
  winShadow:    "4px 4px 14px rgba(0,0,0,0.45)",
  /* Buttons */
  btnFace:      "linear-gradient(180deg,#f5f4ea,#dbd9c9)",
  btnHover:     "linear-gradient(180deg,#fdf9e7,#ede9c9)",
  btnActive:    "linear-gradient(180deg,#c8c4b0,#dbd9c9)",
  btnBorder:    "#a29d7f",
  btnGreen:     "linear-gradient(180deg,#5db85c,#3ea03d)",
  btnBlue:      "linear-gradient(180deg,#5b9ae0,#2e6fca)",
  btnRed:       "linear-gradient(180deg,#e05b5b,#c02e2e)",
  /* Tab strip */
  tabActive:    "#ece9d8",
  tabInactive:  "linear-gradient(180deg,#d0cdc0,#bab7a8)",
  tabBorder:    "#a29d7f",
  /* Grid */
  gridHeader:   "linear-gradient(180deg,#dbd9c9,#cbc9b5)",
  gridHover:    "#dce9ff",
  gridSelect:   "#316ac5",
  gridSelectTxt:"#ffffff",
  gridBorder:   "#c0bca8",
  gridRow:      "#ffffff",
  gridRowAlt:   "#f5f4ea",
  gridHeight:   22,
  /* Sidebar */
  sidebarBg:    "linear-gradient(180deg,#6fa3d9 0%,#4a7fc4 100%)",
  /* Status bar */
  statusBg:     "#ece9d8",
  statusBorder: "#a29d7f",
  /* Sunken / raised border tricks */
  raised:  "inset -1px -1px #404040, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf",
  sunken:  "inset 1px 1px #404040, inset -1px -1px #fff, inset 2px 2px #808080, inset -2px -2px #dfdfdf",
  /* Font */
  font: "'Tahoma','Segoe UI','Arial',sans-serif",
};

/* ── formatters ──────────────────────────────────────────────────────── */
const fmtKES = (n?: number | null) => {
  const v = n || 0;
  if (v >= 1_000_000) return `KES ${(v/1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `KES ${(v/1_000).toFixed(2)}K`;
  return `KES ${v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
};
const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-KE", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtDT = (s?: string | null) =>
  s ? new Date(s).toLocaleString("en-KE", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "—";
const db = supabase as any;

/* ── status pill ─────────────────────────────────────────────────────── */
function Pill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending:  ["#ffff80","#804000"], approved: ["#80ff80","#004000"],
    paid:     ["#80c0ff","#000080"], draft:    ["#d4d0c8","#404040"],
    rejected: ["#ff8080","#800000"], posted:   ["#e080ff","#400060"],
    reversed: ["#ffb080","#603000"], active:   ["#80ff80","#004000"],
    void:     ["#e0e0e0","#606060"], reconciled:["#80ff80","#004000"],
  };
  const [bg, col] = map[status?.toLowerCase()] || ["#e0e0e0","#404040"];
  return (
    <span style={{
      display:"inline-block", padding:"1px 6px", fontSize:10,
      background:bg, color:col, border:"1px solid "+col, borderRadius:2, fontWeight:700,
    }}>{status}</span>
  );
}

/* ── XP Button ───────────────────────────────────────────────────────── */
function XBtn({
  children, onClick, disabled, variant="normal", title, style
}: {
  children?: React.ReactNode; onClick?: () => void; disabled?: boolean;
  variant?: "normal"|"green"|"blue"|"red"; title?: string; style?: React.CSSProperties;
}) {
  const [dn, setDn] = useState(false);
  const bg = disabled ? XP.btnFace
    : dn ? XP.btnActive
    : variant === "green" ? XP.btnGreen
    : variant === "blue"  ? XP.btnBlue
    : variant === "red"   ? XP.btnRed
    : XP.btnFace;
  return (
    <button title={title} onMouseDown={() => setDn(true)} onMouseUp={() => setDn(false)}
      onMouseLeave={() => setDn(false)} onClick={onClick} disabled={disabled}
      style={{
        background:bg, border:"none", cursor:disabled?"default":"pointer",
        padding:"3px 10px", fontSize:11, fontFamily:XP.font,
        color: disabled ? "#808080" : (variant==="green"||variant==="blue"||variant==="red") ? "#fff" : "#000",
        boxShadow: dn ? XP.sunken : XP.raised,
        display:"flex", alignItems:"center", gap:4,
        whiteSpace:"nowrap", minHeight:24, userSelect:"none", ...style,
      }}
    >{children}</button>
  );
}

/* ── XP input ────────────────────────────────────────────────────────── */
const xpInp: React.CSSProperties = {
  boxShadow: "inset 1px 1px #404040, inset -1px -1px #dfdfdf, inset 2px 2px #808080",
  border: "none", padding: "2px 4px", fontSize: 11,
  fontFamily: XP.font, background: "#fff",
};

/* ── COA for GL ──────────────────────────────────────────────────────── */
const COA_ACCOUNTS = [
  "1001 Cash & Cash Equivalents","1002 Petty Cash","1010 KCB Operating Account",
  "1011 Co-op Bank Account","1020 Accounts Receivable","1030 NHIF Receivable",
  "1040 MOH Grant Receivable","1050 Inventory / Stock Value","1060 Pharmaceuticals Stock",
  "1070 Medical Supplies Stock","1500 Property, Plant & Equipment","1510 Medical Equipment",
  "2000 Accounts Payable","2010 Accrued Expenses","2020 Salaries Payable",
  "2100 Short-term Loans","2500 Long-term Loans","3000 County Government Equity",
  "3100 Retained Surplus","4000 Patient Revenue","4010 NHIF Reimbursements",
  "4020 MOH Grants","4030 County Allocation","5000 Salaries & Wages",
  "5010 Medical Supplies","5020 Pharmaceuticals","5030 Utilities",
  "5040 Maintenance & Repairs","5050 Administrative Expenses","5060 Depreciation",
];

/* ═══════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════ */
type Tab = "overview"|"payments"|"receipts"|"journals"|"budgets"|"gl"|"assets"|"reconcile"|"reports";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id:"overview",   label:"Overview",         icon:"🏠" },
  { id:"payments",   label:"Payment Vouchers", icon:"💸" },
  { id:"receipts",   label:"Receipt Vouchers", icon:"📥" },
  { id:"journals",   label:"Journal Vouchers", icon:"📖" },
  { id:"budgets",    label:"Budget Control",   icon:"📊" },
  { id:"gl",         label:"GL Accounts",      icon:"🧾" },
  { id:"assets",     label:"Fixed Assets",     icon:"🏗" },
  { id:"reconcile",  label:"Bank Reconcile",   icon:"🏦" },
  { id:"reports",    label:"Reports",          icon:"📄" },
];

interface KPI { total_payments: number; total_receipts: number; total_budget: number; total_spent: number; pending_count: number; approved_count: number; }

export default function FinancialDashboardPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [kpi, setKpi] = useState<KPI>({ total_payments:0, total_receipts:0, total_budget:0, total_spent:0, pending_count:0, approved_count:0 });
  const [payments, setPayments]  = useState<any[]>([]);
  const [receipts, setReceipts]  = useState<any[]>([]);
  const [journals, setJournals]  = useState<any[]>([]);
  const [budgets, setBudgets]    = useState<any[]>([]);
  const [assets, setAssets]      = useState<any[]>([]);
  const [glEntries, setGlEntries] = useState<any[]>([]);
  const [bankStmts, setBankStmts] = useState<any[]>([]);
  const [busy, setBusy]   = useState(false);
  const [search, setSearch] = useState("");
  const [selRow, setSelRow] = useState<string|null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [modalType, setModalType] = useState<"payment"|"receipt"|"journal"|"budget"|"asset"|null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const { purchaseOrders: fdPOs } = usePurchaseOrders();

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [pvR, rvR, jvR, bgR, atR, glR, bsR] = await Promise.allSettled([
        db.from("payment_vouchers").select("*").order("created_at",{ascending:false}).limit(200),
        db.from("receipt_vouchers").select("*").order("created_at",{ascending:false}).limit(200),
        db.from("journal_vouchers").select("*").order("created_at",{ascending:false}).limit(200),
        db.from("budgets").select("*").order("created_at",{ascending:false}).limit(100),
        db.from("fixed_assets").select("*").order("created_at",{ascending:false}).limit(100),
        db.from("gl_journal").select("*").order("created_at",{ascending:false}).limit(200),
        db.from("bank_statements").select("*").order("transaction_date",{ascending:false}).limit(200),
      ]);
      const pvs = pvR.status==="fulfilled" ? (pvR.value.data||[]) : [];
      const rvs = rvR.status==="fulfilled" ? (rvR.value.data||[]) : [];
      const jvs = jvR.status==="fulfilled" ? (jvR.value.data||[]) : [];
      const bgs = bgR.status==="fulfilled" ? (bgR.value.data||[]) : [];
      const ats = atR.status==="fulfilled" ? (atR.value.data||[]) : [];
      const gls = glR.status==="fulfilled" ? (glR.value.data||[]) : [];
      const bss = bsR.status==="fulfilled" ? (bsR.value.data||[]) : [];
      setPayments(pvs); setReceipts(rvs); setJournals(jvs);
      setBudgets(bgs); setAssets(ats); setGlEntries(gls); setBankStmts(bss);
      setKpi({
        total_payments: pvs.reduce((a:number,r:any)=>a+(r.total_amount||0),0),
        total_receipts: rvs.reduce((a:number,r:any)=>a+(r.amount||r.total_amount||0),0),
        total_budget:   bgs.reduce((a:number,r:any)=>a+(r.total_budget||0),0),
        total_spent:    bgs.reduce((a:number,r:any)=>a+(r.spent||0),0),
        pending_count:  pvs.filter((r:any)=>r.status==="pending").length + rvs.filter((r:any)=>r.status==="pending").length,
        approved_count: pvs.filter((r:any)=>r.status==="approved").length,
      });
    } catch(e) { console.error(e); }
    setBusy(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── quick filter helper ─────────────────────────────────────────── */
  function applyFilter(rows: any[], searchFields: string[]) {
    return rows.filter(r => {
      const s = search.toLowerCase();
      const matchSearch = !s || searchFields.some(f => String(r[f]||"").toLowerCase().includes(s));
      const matchStatus = filterStatus==="ALL" || (r.status||"").toLowerCase()===filterStatus.toLowerCase();
      const matchFrom   = !dateFrom || (r.created_at||r.transaction_date||"") >= dateFrom;
      const matchTo     = !dateTo   || (r.created_at||r.transaction_date||"") <= dateTo+"T23:59:59";
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }

  /* ── open modal for new/edit ─────────────────────────────────────── */
  function openModal(type: typeof modalType, existing?: any) {
    setModalType(type);
    setModalData(existing || {});
    setModalOpen(true);
  }

  /* ── save modal ─────────────────────────────────────────────────── */
  async function saveModal() {
    if (!modalType || !modalData) return;
    const tables: Record<string, string> = {
      payment:"payment_vouchers", receipt:"receipt_vouchers",
      journal:"journal_vouchers", budget:"budgets", asset:"fixed_assets",
    };
    const tbl = tables[modalType];
    if (!tbl) return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      if (modalData.id) {
        const { error } = await db.from(tbl).update({ ...modalData, updated_at: now }).eq("id", modalData.id);
        if (error) throw error;
        toast({ title: "✓ Record updated" });
      } else {
        const { error } = await db.from(tbl).insert({ ...modalData, created_at: now, updated_at: now, status: modalData.status||"draft" });
        if (error) throw error;
        toast({ title: "✓ Record created" });
      }
      setModalOpen(false);
      setModalData(null);
      load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
    setBusy(false);
  }

  /* ── approve payment ─────────────────────────────────────────────── */
  async function approveRow(tbl: string, id: string) {
    const { error } = await db.from(tbl).update({ status:"approved", approved_at: new Date().toISOString() }).eq("id",id);
    if (error) toast({ title: "Error", description: error.message, variant:"destructive" });
    else { toast({ title: "✓ Approved" }); load(); }
  }

  /* ── print ───────────────────────────────────────────────────────── */
  function printActive() {
    window.print();
  }

  /* ── export CSV ──────────────────────────────────────────────────── */
  function exportCSV(rows: any[], filename: string) {
    if (!rows.length) return;
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(r[k]||"").replace(/"/g,'""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = filename + "_" + new Date().toISOString().slice(0,10) + ".csv";
    a.click();
  }

  /* ═══════════════════════════ TOOLBAR ════════════════════════════ */
  function Toolbar({ onNew, onExport, rows, exportName }: any) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", background:XP.winBg, borderBottom:"1px solid "+XP.gridBorder, flexWrap:"wrap" }}>
        <XBtn variant="green" onClick={onNew} style={{ fontSize:11 }}>➕ New</XBtn>
        <XBtn onClick={load} style={{ fontSize:11 }}>🔄 Refresh</XBtn>
        <XBtn onClick={printActive} style={{ fontSize:11 }}>🖨 Print</XBtn>
        <XBtn onClick={() => exportCSV(rows, exportName)} style={{ fontSize:11 }}>📤 Export CSV</XBtn>
        <div style={{ marginLeft:8, display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:11, color:"#555" }}>Status:</span>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
            style={{ ...xpInp, padding:"1px 4px", fontSize:11 }}>
            {["ALL","draft","pending","approved","paid","rejected","posted","void","reversed"].map(s=>(
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:11, color:"#555" }}>From:</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{ ...xpInp, fontSize:11, width:120 }}/>
          <span style={{ fontSize:11, color:"#555" }}>To:</span>
          <input type="date" value={dateTo}   onChange={e=>setDateTo(e.target.value)}   style={{ ...xpInp, fontSize:11, width:120 }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:4, marginLeft:"auto" }}>
          <span style={{ fontSize:11, color:"#555" }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
            style={{ ...xpInp, width:160, fontSize:11 }}/>
        </div>
        {busy && <span style={{ fontSize:11, color:"#808080", marginLeft:8 }}>⏳ Loading…</span>}
      </div>
    );
  }

  /* ═══════════════════════════ GRID ═══════════════════════════════ */
  function Grid({ columns, rows, onSelect, rowKey="id", actions }: {
    columns: { key:string; label:string; width?:number; fmt?:(v:any,row:any)=>React.ReactNode }[];
    rows: any[]; onSelect?: (row:any)=>void; rowKey?:string;
    actions?: (row:any)=>React.ReactNode;
  }) {
    return (
      <div style={{ overflowX:"auto", overflowY:"auto", maxHeight:420, fontSize:11, fontFamily:XP.font }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed" }}>
          <thead>
            <tr>
              {columns.map(c => (
                <th key={c.key} style={{
                  background:XP.gridHeader, boxShadow:XP.raised,
                  padding:"3px 6px", textAlign:"left", fontWeight:700, whiteSpace:"nowrap",
                  borderRight:"1px solid "+XP.gridBorder, fontSize:10,
                  width:c.width||120, position:"sticky", top:0, zIndex:1,
                }}>{c.label}</th>
              ))}
              {actions && <th style={{ background:XP.gridHeader, boxShadow:XP.raised, padding:"3px 6px", width:130, position:"sticky",top:0,zIndex:1, fontSize:10 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={columns.length + (actions?1:0)} style={{ padding:16, textAlign:"center", color:"#808080", fontSize:11 }}>No records found</td></tr>
            )}
            {rows.map((row, i) => {
              const isSelected = selRow === row[rowKey];
              return (
                <tr key={row[rowKey]||i}
                  onClick={() => { setSelRow(row[rowKey]); onSelect?.(row); }}
                  style={{
                    background: isSelected ? XP.gridSelect : i%2===0 ? XP.gridRow : XP.gridRowAlt,
                    color: isSelected ? XP.gridSelectTxt : "#000",
                    cursor:"pointer", height:XP.gridHeight,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = XP.gridHover; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i%2===0 ? XP.gridRow : XP.gridRowAlt; }}
                >
                  {columns.map(c => (
                    <td key={c.key} style={{ padding:"2px 6px", borderRight:"1px solid "+XP.gridBorder, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {c.fmt ? c.fmt(row[c.key], row) : String(row[c.key]||"—")}
                    </td>
                  ))}
                  {actions && (
                    <td style={{ padding:"1px 4px", borderRight:"1px solid "+XP.gridBorder }} onClick={e=>e.stopPropagation()}>
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  /* ═══════════════════════════ OVERVIEW ═══════════════════════════ */
  function OverviewTab() {
    const budgetPct = kpi.total_budget > 0 ? Math.min(100, (kpi.total_spent / kpi.total_budget) * 100) : 0;
    const cards = [
      { label:"Total Payments",   val:fmtKES(kpi.total_payments), icon:"💸", col:"#cc2200", sub:`${payments.filter(r=>r.status==="paid").length} paid` },
      { label:"Total Receipts",   val:fmtKES(kpi.total_receipts), icon:"📥", col:"#007700", sub:`${receipts.filter(r=>r.status==="approved").length} approved` },
      { label:"Budget Allocated", val:fmtKES(kpi.total_budget),   icon:"📊", col:"#0055cc", sub:`${budgets.length} budget lines` },
      { label:"Budget Spent",     val:fmtKES(kpi.total_spent),    icon:"💹", col:"#cc8800", sub:`${budgetPct.toFixed(1)}% utilisation` },
      { label:"Pending Vouchers", val:kpi.pending_count,          icon:"⏳", col:"#cc6600", sub:"awaiting approval" },
      { label:"Approved Today",   val:kpi.approved_count,         icon:"✅", col:"#006600", sub:"approved vouchers" },
    ];
    return (
      <div style={{ padding:12 }}>
        {/* KPI cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
          {cards.map(c => (
            <div key={c.label} style={{
              background:"#fff", border:"1px solid "+XP.gridBorder, padding:"10px 12px",
              borderLeft:"4px solid "+c.col, boxShadow:XP.raised,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:20 }}>{c.icon}</span>
                <div>
                  <div style={{ fontWeight:800, fontSize:18, color:c.col }}>{c.val}</div>
                  <div style={{ fontSize:10, color:"#666" }}>{c.label}</div>
                  <div style={{ fontSize:10, color:"#999" }}>{c.sub}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Budget progress */}
        <div style={{ background:"#fff", border:"1px solid "+XP.gridBorder, padding:12, marginBottom:8, boxShadow:XP.raised }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:8, borderBottom:"1px solid "+XP.gridBorder, paddingBottom:4 }}>
            📊 Budget Utilisation Summary
          </div>
          {budgets.slice(0,8).map(b => {
            const pct = b.total_budget > 0 ? Math.min(100,(b.spent||0)/b.total_budget*100) : 0;
            const color = pct > 90 ? "#cc2200" : pct > 75 ? "#cc8800" : "#006600";
            return (
              <div key={b.id} style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:2 }}>
                  <span>{b.budget_name||b.department||"Budget"} ({b.fiscal_year||"FY"})</span>
                  <span style={{ color }}>{fmtKES(b.spent)} / {fmtKES(b.total_budget)} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ background:XP.gridRowAlt, height:12, border:"1px solid "+XP.gridBorder }}>
                  <div style={{ width:pct+"%", background:color, height:"100%", transition:"width .3s" }}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent payments mini-table */}
        <div style={{ background:"#fff", border:"1px solid "+XP.gridBorder, padding:12, boxShadow:XP.raised }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:8, borderBottom:"1px solid "+XP.gridBorder, paddingBottom:4 }}>
            💸 Recent Payment Vouchers
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr>{["Voucher No","Payee","Amount","Status","Date"].map(h=>(
                <th key={h} style={{ background:XP.gridHeader, padding:"2px 6px", textAlign:"left", boxShadow:XP.raised, borderRight:"1px solid "+XP.gridBorder, fontSize:10 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {payments.slice(0,8).map((p,i)=>(
                <tr key={p.id} style={{ background:i%2===0?XP.gridRow:XP.gridRowAlt }}>
                  <td style={{ padding:"2px 6px", borderRight:"1px solid "+XP.gridBorder }}>{p.voucher_number||"—"}</td>
                  <td style={{ padding:"2px 6px", borderRight:"1px solid "+XP.gridBorder }}>{p.payee||"—"}</td>
                  <td style={{ padding:"2px 6px", borderRight:"1px solid "+XP.gridBorder, color:"#cc2200", fontWeight:700 }}>{fmtKES(p.total_amount)}</td>
                  <td style={{ padding:"2px 6px", borderRight:"1px solid "+XP.gridBorder }}><Pill status={p.status}/></td>
                  <td style={{ padding:"2px 6px" }}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════ PAYMENTS ═══════════════════════════ */
  function PaymentsTab() {
    const rows = applyFilter(payments, ["voucher_number","payee","description","invoice_reference","vote_head","payment_method"]);
    const total = rows.reduce((a,r)=>a+(r.total_amount||0),0);
    return (
      <div>
        <Toolbar onNew={()=>openModal("payment")} onExport={()=>exportCSV(rows,"payment_vouchers")} rows={rows} exportName="payment_vouchers"/>
        <div style={{ background:"#e8f4fd", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>📋 <strong>{rows.length}</strong> records</span>
          <span>💰 Total: <strong style={{ color:"#cc2200" }}>{fmtKES(total)}</strong></span>
          <span>⏳ Pending: <strong>{rows.filter(r=>r.status==="pending").length}</strong></span>
          <span>✅ Approved: <strong>{rows.filter(r=>r.status==="approved").length}</strong></span>
          <span>💸 Paid: <strong>{rows.filter(r=>r.status==="paid").length}</strong></span>
        </div>
        <Grid
          columns={[
            { key:"voucher_number", label:"Voucher No",   width:110 },
            { key:"payee",          label:"Payee",         width:160 },
            { key:"payment_method", label:"Method",        width:90 },
            { key:"vote_head",      label:"Vote Head",     width:100 },
            { key:"gl_account",     label:"GL Account",    width:110 },
            { key:"total_amount",   label:"Amount (KES)",  width:110, fmt:(v)=><span style={{ color:"#cc2200", fontWeight:700 }}>{fmtKES(v)}</span> },
            { key:"status",         label:"Status",        width:80,  fmt:(v)=><Pill status={v}/> },
            { key:"due_date",       label:"Due Date",      width:90,  fmt:(v)=>fmtDate(v) },
            { key:"created_at",     label:"Created",       width:110, fmt:(v)=>fmtDT(v) },
            { key:"description",    label:"Description",   width:200 },
          ]}
          rows={rows}
          actions={(row) => (
            <div style={{ display:"flex", gap:2 }}>
              <XBtn style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>openModal("payment",row)}>✏ Edit</XBtn>
              {row.status==="pending" && (
                <XBtn variant="green" style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>approveRow("payment_vouchers",row.id)}>✓ Approve</XBtn>
              )}
            </div>
          )}
        />
      </div>
    );
  }

  /* ═══════════════════════════ RECEIPTS ═══════════════════════════ */
  function ReceiptsTab() {
    const rows = applyFilter(receipts, ["receipt_number","payer","received_from","description","payment_method"]);
    const total = rows.reduce((a,r)=>a+(r.amount||r.total_amount||0),0);
    return (
      <div>
        <Toolbar onNew={()=>openModal("receipt")} rows={rows} exportName="receipt_vouchers"/>
        <div style={{ background:"#e8f9ee", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>📋 <strong>{rows.length}</strong> records</span>
          <span>💰 Total Received: <strong style={{ color:"#007700" }}>{fmtKES(total)}</strong></span>
        </div>
        <Grid
          columns={[
            { key:"receipt_number",  label:"Receipt No",     width:110 },
            { key:"received_from",   label:"Received From",  width:160 },
            { key:"payment_method",  label:"Method",         width:90  },
            { key:"amount",          label:"Amount (KES)",   width:110, fmt:(v)=><span style={{ color:"#007700", fontWeight:700 }}>{fmtKES(v)}</span> },
            { key:"gl_account",      label:"GL Account",     width:110 },
            { key:"status",          label:"Status",         width:80,  fmt:(v)=><Pill status={v}/> },
            { key:"department",      label:"Department",     width:120 },
            { key:"created_at",      label:"Date",           width:110, fmt:(v)=>fmtDT(v) },
          ]}
          rows={rows}
          actions={(row) => (
            <div style={{ display:"flex", gap:2 }}>
              <XBtn style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>openModal("receipt",row)}>✏ Edit</XBtn>
              {row.status==="pending" && (
                <XBtn variant="green" style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>approveRow("receipt_vouchers",row.id)}>✓ Approve</XBtn>
              )}
            </div>
          )}
        />
      </div>
    );
  }

  /* ═══════════════════════════ JOURNALS ═══════════════════════════ */
  function JournalsTab() {
    const rows = applyFilter(journals, ["journal_number","narration","reference","gl_debit_account","gl_credit_account"]);
    const totalDebit  = rows.reduce((a,r)=>a+(r.debit_amount||0),0);
    const totalCredit = rows.reduce((a,r)=>a+(r.credit_amount||0),0);
    return (
      <div>
        <Toolbar onNew={()=>openModal("journal")} rows={rows} exportName="journal_vouchers"/>
        <div style={{ background:"#f5eafa", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>📋 <strong>{rows.length}</strong> entries</span>
          <span>Dr: <strong style={{ color:"#5b2ca0" }}>{fmtKES(totalDebit)}</strong></span>
          <span>Cr: <strong style={{ color:"#1a7a1a" }}>{fmtKES(totalCredit)}</strong></span>
          {Math.abs(totalDebit-totalCredit) < 0.01
            ? <span style={{ color:"#007700" }}>✓ Balanced</span>
            : <span style={{ color:"#cc2200" }}>⚠ Unbalanced by {fmtKES(Math.abs(totalDebit-totalCredit))}</span>}
        </div>
        <Grid
          columns={[
            { key:"journal_number",   label:"Journal No",  width:110 },
            { key:"narration",        label:"Narration",   width:200 },
            { key:"reference",        label:"Reference",   width:100 },
            { key:"gl_debit_account", label:"Dr Account",  width:130 },
            { key:"gl_credit_account",label:"Cr Account",  width:130 },
            { key:"debit_amount",     label:"Debit",       width:100, fmt:(v)=><span style={{ color:"#5b2ca0" }}>{fmtKES(v)}</span> },
            { key:"credit_amount",    label:"Credit",      width:100, fmt:(v)=><span style={{ color:"#1a7a1a" }}>{fmtKES(v)}</span> },
            { key:"status",           label:"Status",      width:80,  fmt:(v)=><Pill status={v}/> },
            { key:"created_at",       label:"Date",        width:110, fmt:(v)=>fmtDT(v) },
          ]}
          rows={rows}
          actions={(row) => (
            <div style={{ display:"flex", gap:2 }}>
              <XBtn style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>openModal("journal",row)}>✏ Edit</XBtn>
              {row.status==="draft" && (
                <XBtn variant="blue" style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>approveRow("journal_vouchers",row.id)}>📤 Post</XBtn>
              )}
            </div>
          )}
        />
      </div>
    );
  }

  /* ═══════════════════════════ BUDGETS ════════════════════════════ */
  function BudgetsTab() {
    const rows = applyFilter(budgets, ["budget_name","department","fiscal_year","vote_head","status"]);
    return (
      <div>
        <Toolbar onNew={()=>openModal("budget")} rows={rows} exportName="budgets"/>
        <div style={{ background:"#eaf4fe", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>📊 <strong>{rows.length}</strong> budget lines</span>
          <span>Total Allocated: <strong style={{ color:"#0055cc" }}>{fmtKES(rows.reduce((a,r)=>a+(r.total_budget||0),0))}</strong></span>
          <span>Total Spent: <strong style={{ color:"#cc8800" }}>{fmtKES(rows.reduce((a,r)=>a+(r.spent||0),0))}</strong></span>
        </div>
        <Grid
          columns={[
            { key:"budget_name",  label:"Budget Name",   width:160 },
            { key:"fiscal_year",  label:"FY",            width:70  },
            { key:"department",   label:"Department",    width:130 },
            { key:"vote_head",    label:"Vote Head",     width:110 },
            { key:"total_budget", label:"Allocated",     width:110, fmt:(v)=><span style={{ color:"#0055cc", fontWeight:700 }}>{fmtKES(v)}</span> },
            { key:"spent",        label:"Spent",         width:110, fmt:(v)=><span style={{ color:"#cc8800", fontWeight:700 }}>{fmtKES(v)}</span> },
            { key:"remaining",    label:"Remaining",     width:110, fmt:(_,row)=>{
              const rem = (row.total_budget||0)-(row.spent||0);
              return <span style={{ color:rem<0?"#cc2200":"#007700", fontWeight:700 }}>{fmtKES(rem)}</span>;
            }},
            { key:"status",       label:"Status",        width:80,  fmt:(v)=><Pill status={v}/> },
            { key:"",             label:"% Used",        width:80,  fmt:(_,row)=>{
              const pct = row.total_budget>0?Math.min(100,(row.spent||0)/row.total_budget*100):0;
              const c = pct>90?"#cc2200":pct>75?"#cc8800":"#007700";
              return <span style={{ color:c, fontWeight:700 }}>{pct.toFixed(0)}%</span>;
            }},
          ]}
          rows={rows}
          actions={(row) => (
            <XBtn style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>openModal("budget",row)}>✏ Edit</XBtn>
          )}
        />
      </div>
    );
  }

  /* ═══════════════════════════ GL ACCOUNTS ════════════════════════ */
  function GLTab() {
    const rows = applyFilter(glEntries, ["reference","description","gl_account","created_by"]);
    const totalDr = rows.reduce((a,r)=>a+(r.debit||0),0);
    const totalCr = rows.reduce((a,r)=>a+(r.credit||0),0);
    return (
      <div>
        <Toolbar rows={rows} exportName="gl_journal" onNew={()=>{}}/>
        <div style={{ background:"#fff8e1", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>🧾 <strong>{rows.length}</strong> GL entries</span>
          <span>Total Debits: <strong style={{ color:"#5b2ca0" }}>{fmtKES(totalDr)}</strong></span>
          <span>Total Credits: <strong style={{ color:"#007700" }}>{fmtKES(totalCr)}</strong></span>
          {Math.abs(totalDr-totalCr)<0.01
            ? <span style={{ color:"#007700" }}>✓ Trial balance OK</span>
            : <span style={{ color:"#cc2200" }}>⚠ Balance diff: {fmtKES(Math.abs(totalDr-totalCr))}</span>}
        </div>
        <Grid
          columns={[
            { key:"reference",  label:"Reference",  width:110 },
            { key:"description",label:"Description",width:200 },
            { key:"gl_account", label:"GL Account", width:130 },
            { key:"debit",      label:"Debit",      width:110, fmt:(v)=><span style={{ color:"#5b2ca0" }}>{v?fmtKES(v):"—"}</span> },
            { key:"credit",     label:"Credit",     width:110, fmt:(v)=><span style={{ color:"#007700" }}>{v?fmtKES(v):"—"}</span> },
            { key:"status",     label:"Status",     width:80,  fmt:(v)=><Pill status={v}/> },
            { key:"created_at", label:"Date",       width:110, fmt:(v)=>fmtDT(v) },
          ]}
          rows={rows}
        />
      </div>
    );
  }

  /* ═══════════════════════════ FIXED ASSETS ═══════════════════════ */
  function AssetsTab() {
    const rows = applyFilter(assets, ["asset_name","asset_code","category","location","supplier_name"]);
    return (
      <div>
        <Toolbar onNew={()=>openModal("asset")} rows={rows} exportName="fixed_assets"/>
        <div style={{ background:"#e8f4fd", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>🏗 <strong>{rows.length}</strong> assets</span>
          <span>Total Cost: <strong style={{ color:"#0055cc" }}>{fmtKES(rows.reduce((a,r)=>a+(r.purchase_price||r.cost||0),0))}</strong></span>
          <span>NBV: <strong style={{ color:"#007700" }}>{fmtKES(rows.reduce((a,r)=>a+(r.net_book_value||r.purchase_price||0),0))}</strong></span>
        </div>
        <Grid
          columns={[
            { key:"asset_code",     label:"Code",          width:90  },
            { key:"asset_name",     label:"Asset Name",    width:180 },
            { key:"category",       label:"Category",      width:110 },
            { key:"location",       label:"Location",      width:110 },
            { key:"purchase_price", label:"Cost",          width:110, fmt:(v)=>fmtKES(v) },
            { key:"depreciation_rate", label:"Depr %",     width:70  },
            { key:"net_book_value", label:"NBV",           width:110, fmt:(v)=>fmtKES(v) },
            { key:"status",         label:"Status",        width:80,  fmt:(v)=><Pill status={v||"active"}/> },
            { key:"purchase_date",  label:"Purchase Date", width:110, fmt:(v)=>fmtDate(v) },
          ]}
          rows={rows}
          actions={(row) => (
            <XBtn style={{ fontSize:10, padding:"1px 5px" }} onClick={()=>openModal("asset",row)}>✏ Edit</XBtn>
          )}
        />
      </div>
    );
  }

  /* ═══════════════════════════ BANK RECONCILE ═════════════════════ */
  function ReconcileTab() {
    const rows = applyFilter(bankStmts, ["description","reference","bank_name","transaction_type"]);
    const credits = rows.filter(r=>r.credit||r.amount>0).reduce((a,r)=>a+(r.credit||r.amount||0),0);
    const debits  = rows.filter(r=>r.debit).reduce((a,r)=>a+(r.debit||0),0);
    return (
      <div>
        <Toolbar rows={rows} exportName="bank_statements" onNew={()=>{}}/>
        <div style={{ background:"#eafaf1", padding:"4px 8px", fontSize:11, display:"flex", gap:16, borderBottom:"1px solid "+XP.gridBorder }}>
          <span>🏦 <strong>{rows.length}</strong> transactions</span>
          <span>Credits: <strong style={{ color:"#007700" }}>{fmtKES(credits)}</strong></span>
          <span>Debits: <strong style={{ color:"#cc2200" }}>{fmtKES(debits)}</strong></span>
          <span>Net: <strong style={{ color:(credits-debits)>=0?"#007700":"#cc2200" }}>{fmtKES(credits-debits)}</strong></span>
        </div>
        <Grid
          columns={[
            { key:"transaction_date", label:"Date",        width:100, fmt:(v)=>fmtDate(v) },
            { key:"description",      label:"Description", width:200 },
            { key:"reference",        label:"Reference",   width:110 },
            { key:"bank_name",        label:"Bank",        width:120 },
            { key:"transaction_type", label:"Type",        width:80  },
            { key:"credit",           label:"Credit",      width:110, fmt:(v)=>v?<span style={{ color:"#007700",fontWeight:700 }}>{fmtKES(v)}</span>:"—" },
            { key:"debit",            label:"Debit",       width:110, fmt:(v)=>v?<span style={{ color:"#cc2200",fontWeight:700 }}>{fmtKES(v)}</span>:"—" },
            { key:"balance",          label:"Balance",     width:110, fmt:(v)=>fmtKES(v) },
            { key:"reconciled",       label:"Reconciled",  width:80,  fmt:(v)=><Pill status={v?"reconciled":"pending"}/> },
          ]}
          rows={rows}
        />
      </div>
    );
  }

  /* ═══════════════════════════ REPORTS ════════════════════════════ */
  function ReportsTab() {
    const thisMonth = new Date().toISOString().slice(0,7);
    const monthPay  = payments.filter(r=>r.created_at?.startsWith(thisMonth));
    const monthRec  = receipts.filter(r=>r.created_at?.startsWith(thisMonth));
    return (
      <div style={{ padding:12 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>

          {/* Income statement */}
          <div style={{ background:"#fff", border:"1px solid "+XP.gridBorder, padding:12, boxShadow:XP.raised }}>
            <div style={{ fontWeight:700, fontSize:12, borderBottom:"1px solid "+XP.gridBorder, paddingBottom:4, marginBottom:8 }}>
              📄 Income Statement — This Month ({thisMonth})
            </div>
            <table style={{ width:"100%", fontSize:11, borderCollapse:"collapse" }}>
              <tbody>
                <tr><td style={{ padding:"2px 0", color:"#007700", fontWeight:700 }}>INCOME</td><td/></tr>
                <tr><td style={{ padding:"2px 4px 2px 12px" }}>Patient Revenue</td><td style={{ textAlign:"right" }}>{fmtKES(monthRec.reduce((a,r)=>a+(r.amount||0),0))}</td></tr>
                <tr style={{ borderTop:"1px solid "+XP.gridBorder }}><td style={{ fontWeight:700 }}>Total Income</td><td style={{ textAlign:"right", fontWeight:700, color:"#007700" }}>{fmtKES(monthRec.reduce((a,r)=>a+(r.amount||0),0))}</td></tr>
                <tr><td colSpan={2} style={{ height:8 }}/></tr>
                <tr><td style={{ padding:"2px 0", color:"#cc2200", fontWeight:700 }}>EXPENDITURE</td><td/></tr>
                <tr><td style={{ padding:"2px 4px 2px 12px" }}>Payment Vouchers</td><td style={{ textAlign:"right", color:"#cc2200" }}>{fmtKES(monthPay.reduce((a,r)=>a+(r.total_amount||0),0))}</td></tr>
                <tr style={{ borderTop:"1px solid "+XP.gridBorder }}><td style={{ fontWeight:700 }}>Total Expenditure</td><td style={{ textAlign:"right", fontWeight:700, color:"#cc2200" }}>{fmtKES(monthPay.reduce((a,r)=>a+(r.total_amount||0),0))}</td></tr>
                <tr style={{ borderTop:"2px solid "+XP.gridBorder }}><td style={{ fontWeight:700 }}>Net Surplus/(Deficit)</td>
                  <td style={{ textAlign:"right", fontWeight:800, color:(monthRec.reduce((a,r)=>a+(r.amount||0),0)-monthPay.reduce((a,r)=>a+(r.total_amount||0),0))>=0?"#007700":"#cc2200" }}>
                    {fmtKES(monthRec.reduce((a,r)=>a+(r.amount||0),0)-monthPay.reduce((a,r)=>a+(r.total_amount||0),0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Budget summary */}
          <div style={{ background:"#fff", border:"1px solid "+XP.gridBorder, padding:12, boxShadow:XP.raised }}>
            <div style={{ fontWeight:700, fontSize:12, borderBottom:"1px solid "+XP.gridBorder, paddingBottom:4, marginBottom:8 }}>
              📊 Budget Performance Summary
            </div>
            <table style={{ width:"100%", fontSize:11, borderCollapse:"collapse" }}>
              <thead><tr>
                {["Department","Allocated","Spent","Variance"].map(h=>(
                  <th key={h} style={{ padding:"2px 4px", background:XP.gridHeader, textAlign:"left", fontWeight:700, fontSize:10, borderRight:"1px solid "+XP.gridBorder }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {budgets.slice(0,8).map((b,i)=>{
                  const rem = (b.total_budget||0)-(b.spent||0);
                  return (
                    <tr key={b.id} style={{ background:i%2===0?XP.gridRow:XP.gridRowAlt }}>
                      <td style={{ padding:"2px 4px", borderRight:"1px solid "+XP.gridBorder }}>{b.department||b.budget_name}</td>
                      <td style={{ padding:"2px 4px", borderRight:"1px solid "+XP.gridBorder }}>{fmtKES(b.total_budget)}</td>
                      <td style={{ padding:"2px 4px", borderRight:"1px solid "+XP.gridBorder, color:"#cc8800" }}>{fmtKES(b.spent)}</td>
                      <td style={{ padding:"2px 4px", color:rem>=0?"#007700":"#cc2200", fontWeight:700 }}>{fmtKES(rem)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Voucher status summary */}
          <div style={{ background:"#fff", border:"1px solid "+XP.gridBorder, padding:12, boxShadow:XP.raised, gridColumn:"span 2" }}>
            <div style={{ fontWeight:700, fontSize:12, borderBottom:"1px solid "+XP.gridBorder, paddingBottom:4, marginBottom:8 }}>
              📋 Voucher Status Summary
            </div>
            <div style={{ display:"flex", gap:16 }}>
              {["draft","pending","approved","paid","rejected"].map(s => {
                const pvCount = payments.filter(r=>r.status===s).length;
                const rvCount = receipts.filter(r=>r.status===s).length;
                const jvCount = journals.filter(r=>r.status===s).length;
                return (
                  <div key={s} style={{ flex:1, background:XP.gridRowAlt, padding:"8px", border:"1px solid "+XP.gridBorder, textAlign:"center" }}>
                    <Pill status={s}/>
                    <div style={{ marginTop:4, fontSize:11 }}>PV: <strong>{pvCount}</strong></div>
                    <div style={{ fontSize:11 }}>RV: <strong>{rvCount}</strong></div>
                    <div style={{ fontSize:11 }}>JV: <strong>{jvCount}</strong></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════ MODAL ══════════════════════════════ */
  function Modal() {
    if (!modalOpen || !modalType) return null;
    const titles: Record<string, string> = {
      payment:"💸 Payment Voucher", receipt:"📥 Receipt Voucher",
      journal:"📖 Journal Voucher", budget:"📊 Budget Line", asset:"🏗 Fixed Asset",
    };
    const fields: Record<string, {key:string;label:string;type?:string;options?:string[]}[]> = {
      payment: [
        { key:"voucher_number",  label:"Voucher No"       },
        { key:"payee",           label:"Payee"            },
        { key:"total_amount",    label:"Amount (KES)",    type:"number" },
        { key:"payment_method",  label:"Payment Method",  options:["EFT","Cheque","Cash","RTGS","M-Pesa"] },
        { key:"vote_head",       label:"Vote Head"        },
        { key:"gl_account",      label:"GL Account",      options:COA_ACCOUNTS },
        { key:"invoice_reference",label:"Invoice Ref"    },
        { key:"po_reference",    label:"PO Reference"     },
        { key:"bank_name",       label:"Bank Name"        },
        { key:"payee_account",   label:"Payee Account No" },
        { key:"due_date",        label:"Due Date",        type:"date" },
        { key:"description",     label:"Description"      },
        { key:"status",          label:"Status",          options:["draft","pending","approved","paid","rejected"] },
      ],
      receipt: [
        { key:"receipt_number",  label:"Receipt No"       },
        { key:"received_from",   label:"Received From"    },
        { key:"amount",          label:"Amount (KES)",    type:"number" },
        { key:"payment_method",  label:"Method",          options:["Cash","Cheque","EFT","M-Pesa"] },
        { key:"gl_account",      label:"GL Account",      options:COA_ACCOUNTS },
        { key:"department",      label:"Department"       },
        { key:"description",     label:"Description"      },
        { key:"status",          label:"Status",          options:["draft","pending","approved","void"] },
      ],
      journal: [
        { key:"journal_number",      label:"Journal No"       },
        { key:"narration",           label:"Narration"        },
        { key:"reference",           label:"Reference"        },
        { key:"gl_debit_account",    label:"Dr GL Account",   options:COA_ACCOUNTS },
        { key:"gl_credit_account",   label:"Cr GL Account",   options:COA_ACCOUNTS },
        { key:"debit_amount",        label:"Debit (KES)",     type:"number" },
        { key:"credit_amount",       label:"Credit (KES)",    type:"number" },
        { key:"status",              label:"Status",          options:["draft","posted","reversed"] },
      ],
      budget: [
        { key:"budget_name",  label:"Budget Name"  },
        { key:"fiscal_year",  label:"Fiscal Year"  },
        { key:"department",   label:"Department"   },
        { key:"vote_head",    label:"Vote Head"    },
        { key:"total_budget", label:"Total Budget (KES)", type:"number" },
        { key:"spent",        label:"Spent (KES)", type:"number" },
        { key:"status",       label:"Status",      options:["active","closed","suspended"] },
      ],
      asset: [
        { key:"asset_code",       label:"Asset Code"     },
        { key:"asset_name",       label:"Asset Name"     },
        { key:"category",         label:"Category",      options:["Medical Equipment","Furniture","Vehicles","IT Equipment","Buildings","Other"] },
        { key:"location",         label:"Location"       },
        { key:"purchase_price",   label:"Cost (KES)",    type:"number" },
        { key:"depreciation_rate",label:"Depr Rate (%)", type:"number" },
        { key:"net_book_value",   label:"NBV (KES)",     type:"number" },
        { key:"purchase_date",    label:"Purchase Date", type:"date" },
        { key:"status",           label:"Status",        options:["active","disposed","maintenance","transferred"] },
      ],
    };
    const flds = fields[modalType] || [];
    return (
      <div style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000,
        display:"flex", alignItems:"center", justifyContent:"center",
      }} onClick={()=>setModalOpen(false)}>
        <div style={{
          background:XP.winBg, border:XP.winBorder, boxShadow:XP.winShadow,
          minWidth:500, maxWidth:700, maxHeight:"85vh", overflow:"auto", fontFamily:XP.font, fontSize:11,
        }} onClick={e=>e.stopPropagation()}>
          {/* Titlebar */}
          <div style={{ background:XP.titleBar, padding:"4px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>{titles[modalType]||"Edit Record"}</span>
            <XBtn onClick={()=>setModalOpen(false)} style={{ minHeight:18, padding:"0 6px", fontSize:12 }}>✕</XBtn>
          </div>
          <div style={{ padding:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {flds.map(f => (
                <div key={f.key} style={{ gridColumn: f.key==="description"||f.key==="narration"?"span 2":"" }}>
                  <label style={{ fontSize:10, fontWeight:700, display:"block", marginBottom:2 }}>{f.label}</label>
                  {f.key==="po_reference" ? (
                    <select value={modalData?.[f.key]||""} onChange={e=>{
                      const poNum = e.target.value;
                      const matched = fdPOs.find((po:any)=>po.po_number===poNum);
                      setModalData((p:any)=>({
                        ...p,
                        po_reference: poNum,
                        payee: matched && !p?.payee ? (matched.supplier_name||p?.payee) : p?.payee,
                        total_amount: matched && !p?.total_amount ? (matched.total_amount||p?.total_amount) : p?.total_amount,
                      }));
                    }} style={{ ...xpInp, width:"100%", boxSizing:"border-box" }}>
                      <option value="">— None —</option>
                      {fdPOs.map((po:any)=><option key={po.id} value={po.po_number}>{po.po_number} — {po.supplier_name||"Supplier"}</option>)}
                    </select>
                  ) : f.options ? (
                    <select value={modalData?.[f.key]||""} onChange={e=>setModalData((p:any)=>({...p,[f.key]:e.target.value}))}
                      style={{ ...xpInp, width:"100%", boxSizing:"border-box" }}>
                      <option value="">—</option>
                      {f.options.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type||"text"} value={modalData?.[f.key]||""}
                      onChange={e=>setModalData((p:any)=>({...p,[f.key]:f.type==="number"?parseFloat(e.target.value)||0:e.target.value}))}
                      style={{ ...xpInp, width:"100%", boxSizing:"border-box" }}/>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, display:"flex", gap:6, justifyContent:"flex-end", borderTop:"1px solid "+XP.gridBorder, paddingTop:10 }}>
              <XBtn variant="green" onClick={saveModal} disabled={busy}>
                {busy?"⏳ Saving…":"💾 Save Record"}
              </XBtn>
              <XBtn onClick={()=>setModalOpen(false)}>Cancel</XBtn>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════ RENDER ═════════════════════════════ */
  const tabContent: Record<Tab, React.ReactNode> = {
    overview:  <OverviewTab/>,
    payments:  <PaymentsTab/>,
    receipts:  <ReceiptsTab/>,
    journals:  <JournalsTab/>,
    budgets:   <BudgetsTab/>,
    gl:        <GLTab/>,
    assets:    <AssetsTab/>,
    reconcile: <ReconcileTab/>,
    reports:   <ReportsTab/>,
  };

  return (
    <div style={{ background:XP.winBg, minHeight:"100vh", fontFamily:XP.font, fontSize:11 }}>
      {/* Titlebar */}
      <div style={{ background:XP.titleBar, padding:"5px 10px", display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:XP.titleShadow }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:26, height:26, background:"linear-gradient(135deg,#4a90e2,#1a50c0)", borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:14 }}>💹</span>
          </div>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:12, textShadow:"1px 1px 2px rgba(0,0,0,0.5)" }}>
              Finance & Accounts — EL5 MediProcure
            </div>
            <div style={{ color:"rgba(255,255,255,0.8)", fontSize:10 }}>
              Embu Level 5 Hospital · Financial Management System
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          <XBtn onClick={load} title="Refresh all data" style={{ fontSize:11 }}>🔄 Refresh</XBtn>
          {["_","□","✕"].map(c=>(
            <div key={c} style={{ width:18,height:16,background:XP.btnFace,boxShadow:XP.raised,borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,fontWeight:700 }}>{c}</div>
          ))}
        </div>
      </div>

      {/* Menu bar */}
      <div style={{ background:XP.winBg, borderBottom:"1px solid "+XP.gridBorder, padding:"2px 8px", display:"flex", gap:14, fontSize:11 }}>
        {["File","Edit","View","Actions","Reports","Help"].map(m=>(
          <span key={m} style={{ cursor:"pointer", padding:"2px 4px" }}
            onMouseEnter={e=>(e.currentTarget.style.background="#316ac5",e.currentTarget.style.color="#fff")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent",e.currentTarget.style.color="inherit")}>
            <u>{m[0]}</u>{m.slice(1)}
          </span>
        ))}
      </div>

      {/* Tab strip */}
      <div style={{ display:"flex", borderBottom:"2px solid "+XP.tabBorder, background:XP.tabInactive, paddingTop:2, paddingLeft:4, gap:1 }}>
        {TABS.map(t=>{
          const active = tab === t.id;
          return (
            <div key={t.id} onClick={()=>setTab(t.id)} style={{
              padding:"4px 12px", cursor:"pointer", fontSize:11, fontWeight:active?700:400,
              background:active?XP.tabActive:XP.tabInactive,
              border:"1px solid "+XP.tabBorder, borderBottom:active?"2px solid "+XP.winBg:"1px solid "+XP.tabBorder,
              marginBottom:active?"-2px":0,
              display:"flex", alignItems:"center", gap:4,
              position:"relative", zIndex:active?2:1,
              color:active?"#000":"#444",
            }}>
              <span>{t.icon}</span>{t.label}
            </div>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{ background:"#fff", minHeight:"calc(100vh - 120px)" }}>
        {tabContent[tab]}
      </div>

      {/* Status bar */}
      <div style={{ background:XP.statusBg, borderTop:"1px solid "+XP.statusBorder, padding:"2px 8px", display:"flex", gap:12, fontSize:10, color:"#666", position:"sticky", bottom:0 }}>
        <span>📊 Finance & Accounts Module v13</span>
        <span>|</span>
        <span>💸 Payments: {payments.length}</span>
        <span>📥 Receipts: {receipts.length}</span>
        <span>📖 Journals: {journals.length}</span>
        <span>📊 Budgets: {budgets.length}</span>
        <span>🏗 Assets: {assets.length}</span>
        <span style={{ marginLeft:"auto" }}>{new Date().toLocaleString("en-KE")}</span>
      </div>

      {/* Modal */}
      <Modal/>
    </div>
  );
}
