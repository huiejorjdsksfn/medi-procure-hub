import type React from "react";
/**
 * EL5 MediProcure — Accountant Workspace v12
 * Windows XP Luna theme — All buttons fully functional
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ── XP Luna palette ──────────────────────────────────────────────────────────
const XP = {
  titleActive:   "linear-gradient(180deg,#4a90e2 0%,#2464c3 8%,#245ebd 92%,#1a4fa8 100%)",
  titleInactive: "linear-gradient(180deg,#9db5d5 0%,#7a9cc3 100%)",
  windowBg:      "#ece9d8",
  windowBorder:  "#0054e3",
  windowShadow:  "4px 4px 14px rgba(0,0,0,0.5)",
  contentBg:     "#ffffff",
  taskbar:       "linear-gradient(180deg,#3169c9 0%,#2255b7 4%,#245ebd 96%,#1a50a8 100%)",
  taskbarBorder: "#1a409a",
  startBtn:      "linear-gradient(180deg,#5cb85c,#3d9b3d)",
  desktopBg:     "linear-gradient(160deg,#235bab 0%,#1a4a95 40%,#0e3880 100%)",
  sidebarBg:     "linear-gradient(180deg,#6f9fcf 0%,#4a7fc4 100%)",
  menuBg:        "#ece9d8",
  menuHover:     "#316ac5",
  menuHoverText: "#ffffff",
  btnFace:       "linear-gradient(180deg,#f5f4ea,#dbd9c9)",
  btnBorder:     "#a29d7f",
  btnHover:      "linear-gradient(180deg,#fdf9e7,#ede9c9)",
  btnActive:     "linear-gradient(180deg,#c8c4b0,#dbd9c9)",
  gridHeader:    "linear-gradient(180deg,#dbd9c9,#cbc9b5)",
  gridHover:     "#dce9ff",
  gridSelect:    "#316ac5",
  gridSelectTxt: "#ffffff",
  gridBorder:    "#c0bca8",
  gridRow:       "#ffffff",
  gridRowAlt:    "#f5f4ea",
  statusBg:      "#ece9d8",
  statusBorder:  "#a29d7f",
  font:          "'Tahoma','Segoe UI','Arial',sans-serif",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtK(n: number | null | undefined) {
  const v = n || 0;
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `KES ${(v / 1_000).toFixed(2)}K`;
  return `KES ${v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}
function fmtFull(n: number | null | undefined) {
  return `KES ${(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("en-KE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
const db = supabase as any;

// ── Types ─────────────────────────────────────────────────────────────────────
type WinTab = "vouchers" | "receipts" | "journals" | "reports" | "budgets";
interface Payment {
  id: string; voucher_number?: string; payee?: string; total_amount?: number;
  status: string; payment_method?: string; created_at: string; approved_by?: string;
  gl_account?: string; description?: string; invoice_reference?: string;
  po_reference?: string; vote_head?: string; due_date?: string;
  bank_name?: string; payee_account?: string; currency?: string;
}
interface GLEntry {
  id: string; reference?: string; description?: string; gl_account?: string;
  debit?: number; credit?: number; created_at: string; status?: string;
}
interface Budget {
  id: string; budget_name?: string; fiscal_year?: string; total_budget?: number;
  spent?: number; remaining?: number; department?: string; status?: string;
  created_at: string;
}
interface MenuAction { label: string; icon?: string; onClick: () => void; divider?: boolean; disabled?: boolean; }

// ── COA ───────────────────────────────────────────────────────────────────────
const COA = [
  { code: "1000", name: "Current Assets", type: "ass" },
  { code: "1001", name: "Cash & Cash Equivalents", type: "ass" },
  { code: "1002", name: "Petty Cash", type: "ass" },
  { code: "1010", name: "KCB Operating Account", type: "ass" },
  { code: "1011", name: "Co-op Bank Account", type: "ass" },
  { code: "1020", name: "Accounts Receivable", type: "ass" },
  { code: "1030", name: "NHIF Receivable", type: "ass" },
  { code: "1040", name: "MOH Grant Receivable", type: "ass" },
  { code: "1050", name: "Inventory / Stock Value", type: "ass" },
  { code: "1060", name: "Pharmaceuticals Stock", type: "ass" },
  { code: "1070", name: "Medical Supplies Stock", type: "ass" },
  { code: "1080", name: "Prepaid Expenses", type: "ass" },
  { code: "1500", name: "Property, Plant & Equipment", type: "ass" },
  { code: "1510", name: "Medical Equipment", type: "ass" },
  { code: "1900", name: "Accumulated Depreciation", type: "ass" },
  { code: "2000", name: "Accounts Payable", type: "lib" },
  { code: "2100", name: "Salaries Payable", type: "lib" },
  { code: "2200", name: "NHIF Payable", type: "lib" },
  { code: "2300", name: "NSSF Payable", type: "lib" },
  { code: "3000", name: "MOH Grant Revenue", type: "inc" },
  { code: "3100", name: "NHIF Revenue", type: "inc" },
  { code: "3200", name: "Patient Fee Revenue", type: "inc" },
  { code: "4000", name: "Salaries & Wages", type: "exp" },
  { code: "4100", name: "Medical Supplies Expense", type: "exp" },
  { code: "4200", name: "Utilities Expense", type: "exp" },
  { code: "4300", name: "Maintenance & Repairs", type: "exp" },
  { code: "5000", name: "Retained Earnings", type: "eq" },
];

const VOTE_HEADS = ["2210100", "2210200", "2210300", "2211100", "3110200", "3110300", "2710200", "2640400"];
const PAY_METHODS = ["cheque", "bank_transfer", "cash", "mpesa", "rtgs", "swift"];

// ── XPButton ──────────────────────────────────────────────────────────────────
function XPButton({
  onClick, children, disabled, primary, small, danger, title
}: {
  onClick?: () => void; children: React.ReactNode;
  disabled?: boolean; primary?: boolean; small?: boolean; danger?: boolean; title?: string;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const bg = danger
    ? (active ? "#ffb0b0" : hover ? "#ffe0e0" : "#fff0f0")
    : primary
      ? (active ? "linear-gradient(180deg,#b0c8e8,#88aad8)" : hover ? "linear-gradient(180deg,#d8ecff,#b0ccf0)" : "linear-gradient(180deg,#dce8fc,#aac4ee)")
      : (active ? XP.btnActive : hover ? XP.btnHover : XP.btnFace);
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}
      style={{
        background: disabled ? "#e0e0d0" : bg,
        border: `1px solid ${danger ? "#cc0000" : XP.btnBorder}`,
        borderRadius: 3, padding: small ? "1px 8px" : "3px 14px",
        fontSize: small ? 10 : 11, fontFamily: XP.font,
        color: disabled ? "#888" : danger ? "#880000" : "#1a1a1a",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active
          ? "inset 1px 1px 2px rgba(0,0,0,0.2)"
          : "1px 1px 2px rgba(255,255,255,0.8) inset,-1px -1px 2px rgba(0,0,0,0.1) inset",
        display: "inline-flex", alignItems: "center", gap: 4,
        whiteSpace: "nowrap" as const, userSelect: "none" as const,
        opacity: disabled ? 0.6 : 1,
      }}
    >{children}</button>
  );
}

// ── XPTitleBar ────────────────────────────────────────────────────────────────
function XPTitleBar({ title, icon, onMinimize, onMaximize, onClose }: {
  title: string; icon?: string;
  onMinimize: () => void; onMaximize: () => void; onClose: () => void;
}) {
  return (
    <div style={{
      background: XP.titleActive, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "3px 4px 3px 6px",
      userSelect: "none" as const, borderBottom: "1px solid rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: XP.font, textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}>
          {title}
        </span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        <button onClick={onMinimize} title="Minimize" style={{ width: 21, height: 21, background: "linear-gradient(180deg,#f0a830,#d07000)", border: "1px solid #8a4800", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>–</button>
        <button onClick={onMaximize} title="Maximize" style={{ width: 21, height: 21, background: "linear-gradient(180deg,#60d060,#289028)", border: "1px solid #187018", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>□</button>
        <button onClick={onClose} title="Close" style={{ width: 21, height: 21, background: "linear-gradient(180deg,#e85040,#b01818)", border: "1px solid #701010", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
      </div>
    </div>
  );
}

// ── XPDropdownMenu ────────────────────────────────────────────────────────────
function XPDropdownMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" as const }}>
      <span
        onClick={() => setOpen(o => !o)}
        style={{
          padding: "2px 7px", cursor: "pointer", fontSize: 11,
          fontFamily: XP.font, userSelect: "none" as const,
          background: open ? XP.menuHover : "transparent",
          color: open ? XP.menuHoverText : "#1a1a1a",
          display: "inline-block",
        }}
        onMouseEnter={e => { e.currentTarget.style.background = XP.menuHover; e.currentTarget.style.color = XP.menuHoverText; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1a1a1a"; } }}
      >
        {label}
      </span>
      {open && (
        <div style={{
          position: "absolute" as const, top: "100%", left: 0, minWidth: 180, zIndex: 9999,
          background: XP.menuBg, border: `1px solid ${XP.btnBorder}`,
          boxShadow: "3px 3px 8px rgba(0,0,0,0.35)",
        }}>
          {actions.map((a, i) =>
            a.divider ? (
              <div key={i} style={{ height: 1, background: XP.btnBorder, margin: "2px 4px" }} />
            ) : (
              <div key={i}
                onClick={() => { if (!a.disabled) { a.onClick(); setOpen(false); } }}
                style={{
                  padding: "4px 16px 4px 24px", fontSize: 11, fontFamily: XP.font,
                  cursor: a.disabled ? "not-allowed" : "pointer",
                  color: a.disabled ? "#aaa" : "#1a1a1a",
                  display: "flex", alignItems: "center", gap: 6,
                }}
                onMouseEnter={e => { if (!a.disabled) { e.currentTarget.style.background = XP.menuHover; e.currentTarget.style.color = XP.menuHoverText; } }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = a.disabled ? "#aaa" : "#1a1a1a"; }}
              >
                {a.icon && <span>{a.icon}</span>}
                {a.label}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── StatusChip ────────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: string }) {
  const m: Record<string, { bg: string; color: string; border: string }> = {
    paid:     { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    approved: { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    matched:  { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    active:   { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    posted:   { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    resolved: { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    pass:     { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    pending:  { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    draft:    { bg: "#e9ecef", color: "#495057", border: "#ced4da" },
    inactive: { bg: "#e9ecef", color: "#495057", border: "#ced4da" },
    rejected: { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
    failed:   { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
    sent:     { bg: "#cce5ff", color: "#004085", border: "#b8daff" },
    open:     { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    over_budget: { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
  };
  const s = m[status?.toLowerCase()] ?? { bg: "#e9ecef", color: "#495057", border: "#ced4da" };
  return (
    <span style={{
      display: "inline-block", padding: "1px 6px", borderRadius: 2,
      fontSize: 10, fontWeight: 700, background: s.bg, color: s.color,
      border: `1px solid ${s.border}`, fontFamily: XP.font,
      textTransform: "uppercase" as const, letterSpacing: "0.04em",
    }}>{status}</span>
  );
}

// ── XP Grid ───────────────────────────────────────────────────────────────────
function XPGrid({ cols, rows, onRowClick, selectedId, emptyMsg }: {
  cols: { key: string; label: string; width?: number | string; render?: (v: any, row: any) => React.ReactNode }[];
  rows: any[]; onRowClick?: (row: any) => void; selectedId?: string; emptyMsg?: string;
}) {
  return (
    <div style={{ overflow: "auto", flex: 1 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: XP.font, fontSize: 11 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={{
                background: XP.gridHeader, padding: "4px 7px",
                borderBottom: `2px solid ${XP.gridBorder}`,
                borderRight: `1px solid ${XP.gridBorder}`,
                textAlign: "left", fontSize: 11, fontWeight: 700, color: "#1a1a1a",
                whiteSpace: "nowrap" as const, position: "sticky" as const, top: 0, zIndex: 5,
                width: c.width,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)}
              style={{
                background: selectedId === row.id ? XP.gridSelect : i % 2 === 0 ? XP.gridRow : XP.gridRowAlt,
                color: selectedId === row.id ? XP.gridSelectTxt : "#1a1a1a",
                cursor: onRowClick ? "pointer" : "default",
              }}
              onMouseEnter={e => { if (selectedId !== row.id) e.currentTarget.style.background = XP.gridHover; }}
              onMouseLeave={e => { if (selectedId !== row.id) e.currentTarget.style.background = i % 2 === 0 ? XP.gridRow : XP.gridRowAlt; }}
            >
              {cols.map(c => (
                <td key={c.key} style={{
                  padding: "3px 7px", borderBottom: `1px solid ${XP.gridBorder}`,
                  borderRight: `1px solid ${XP.gridBorder}`,
                  verticalAlign: "middle" as const, maxWidth: 220,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
                }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} style={{ padding: 30, textAlign: "center", color: "#888" }}>
                {emptyMsg ?? "No records found"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── VoucherForm (New / Edit) ──────────────────────────────────────────────────
function VoucherForm({ onSave, onCancel, saving, initial }: {
  onSave: (f: any) => void; onCancel: () => void;
  saving: boolean; initial?: Partial<Payment>;
}) {
  const [f, setF] = useState({
    payee: initial?.payee ?? "",
    total_amount: initial?.total_amount?.toString() ?? "",
    payment_method: initial?.payment_method ?? "cheque",
    gl_account: initial?.gl_account ?? "2000 - Accounts Payable",
    vote_head: initial?.vote_head ?? "",
    description: initial?.description ?? "",
    po_reference: initial?.po_reference ?? "",
    invoice_reference: initial?.invoice_reference ?? "",
    bank_name: initial?.bank_name ?? "",
    payee_account: initial?.payee_account ?? "",
    due_date: initial?.due_date ?? "",
    currency: initial?.currency ?? "KES",
  });
  const inp: React.CSSProperties = {
    padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2,
    fontSize: 11, fontFamily: XP.font, background: "#fff", color: "#1a1a1a",
    outline: "none", width: "100%", boxSizing: "border-box" as const,
    boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
  };
  const label = (t: string) => (
    <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>{t}</label>
  );
  return (
    <div style={{ background: "#f5f4ea", borderBottom: `1px solid ${XP.gridBorder}`, padding: "8px 12px" }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: "#00008b", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        📝 {initial ? "Edit" : "New"} Payment Voucher
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>
          {label("Payee *")}
          <input value={f.payee} onChange={e => setF(p => ({ ...p, payee: e.target.value }))} placeholder="Payee name" style={inp} />
        </div>
        <div>
          {label("Amount (KES) *")}
          <input type="number" value={f.total_amount} onChange={e => setF(p => ({ ...p, total_amount: e.target.value }))} placeholder="0.00" style={inp} />
        </div>
        <div>
          {label("Method")}
          <select value={f.payment_method} onChange={e => setF(p => ({ ...p, payment_method: e.target.value }))} style={inp}>
            {PAY_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace("_", " ")}</option>)}
          </select>
        </div>
        <div>
          {label("Currency")}
          <select value={f.currency} onChange={e => setF(p => ({ ...p, currency: e.target.value }))} style={inp}>
            {["KES", "USD", "EUR", "GBP"].map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          {label("GL Account")}
          <select value={f.gl_account} onChange={e => setF(p => ({ ...p, gl_account: e.target.value }))} style={inp}>
            {COA.map(a => <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}
          </select>
        </div>
        <div>
          {label("Vote Head")}
          <select value={f.vote_head} onChange={e => setF(p => ({ ...p, vote_head: e.target.value }))} style={inp}>
            <option value="">— Select —</option>
            {VOTE_HEADS.map(v => <option key={v}>{v}</option>)}
          </select>
        </div>
        <div>
          {label("Bank Name")}
          <input value={f.bank_name} onChange={e => setF(p => ({ ...p, bank_name: e.target.value }))} style={inp} />
        </div>
        <div>
          {label("Account No.")}
          <input value={f.payee_account} onChange={e => setF(p => ({ ...p, payee_account: e.target.value }))} style={inp} />
        </div>
        <div>
          {label("Due Date")}
          <input type="date" value={f.due_date} onChange={e => setF(p => ({ ...p, due_date: e.target.value }))} style={inp} />
        </div>
        <div>
          {label("PO Reference")}
          <input value={f.po_reference} onChange={e => setF(p => ({ ...p, po_reference: e.target.value }))} style={inp} />
        </div>
        <div>
          {label("Invoice Reference")}
          <input value={f.invoice_reference} onChange={e => setF(p => ({ ...p, invoice_reference: e.target.value }))} style={inp} />
        </div>
        <div style={{ gridColumn: "span 3" }}>
          {label("Description / Purpose")}
          <input value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} placeholder="Purpose of payment..." style={inp} />
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <XPButton onClick={() => onSave(f)} disabled={saving} primary>
          {saving ? "⏳ Saving…" : "💾 Save Voucher"}
        </XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

// ── VoucherDetailPanel ────────────────────────────────────────────────────────
function VoucherDetailPanel({ voucher, onClose, onApprove, onReject, onMarkPaid, onPrint, onEdit }: {
  voucher: Payment; onClose: () => void;
  onApprove: (id: string) => void; onReject: (id: string) => void;
  onMarkPaid: (id: string) => void; onPrint: (v: Payment) => void;
  onEdit: (v: Payment) => void;
}) {
  return (
    <div style={{
      position: "absolute" as const, right: 0, top: 0, bottom: 0, width: 272,
      background: XP.windowBg, borderLeft: `1px solid ${XP.gridBorder}`,
      display: "flex", flexDirection: "column", zIndex: 10, fontFamily: XP.font, fontSize: 11,
    }}>
      <div style={{ background: XP.sidebarBg, padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ color: "#fff", fontWeight: 700 }}>Voucher Details</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto" as const, padding: 8 }}>
        {([
          ["Voucher No.", voucher.voucher_number ?? "—"],
          ["Payee", voucher.payee ?? "—"],
          ["Amount", <span style={{ fontWeight: 800, color: "#155724", fontSize: 13 }}>{fmtFull(voucher.total_amount)}</span>],
          ["Method", voucher.payment_method?.replace("_", " ") ?? "—"],
          ["GL Account", voucher.gl_account ?? "—"],
          ["Vote Head", voucher.vote_head ?? "—"],
          ["PO Reference", voucher.po_reference ?? "—"],
          ["Invoice Ref", voucher.invoice_reference ?? "—"],
          ["Bank", `${voucher.bank_name ?? ""} ${voucher.payee_account ?? ""}`.trim() || "—"],
          ["Due Date", fmtDate(voucher.due_date)],
          ["Status", <StatusChip status={voucher.status} />],
          ["Approved By", voucher.approved_by ?? "—"],
          ["Currency", voucher.currency ?? "KES"],
          ["Created", fmtDate(voucher.created_at)],
        ] as [string, React.ReactNode][]).map(([k, v]) => (
          <div key={k as string} style={{ display: "flex", gap: 6, padding: "3px 0", borderBottom: `1px solid ${XP.gridBorder}`, alignItems: "center" }}>
            <span style={{ color: "#555", width: 82, flexShrink: 0, fontSize: 10 }}>{k}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
          </div>
        ))}
        {voucher.description && (
          <div style={{ marginTop: 6, padding: 6, background: "#fff", border: `1px solid ${XP.gridBorder}` }}>
            <div style={{ fontSize: 9, color: "#555", marginBottom: 2 }}>Description</div>
            <div style={{ whiteSpace: "pre-wrap" as const }}>{voucher.description}</div>
          </div>
        )}
      </div>
      <div style={{ padding: 8, borderTop: `1px solid ${XP.gridBorder}`, display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
        <XPButton onClick={() => onPrint(voucher)} small>🖨 Print</XPButton>
        <XPButton onClick={() => onEdit(voucher)} small>✏️ Edit</XPButton>
        {voucher.status === "pending" && <>
          <XPButton onClick={() => onApprove(voucher.id)} small primary>✓ Approve</XPButton>
          <XPButton onClick={() => onReject(voucher.id)} small danger>✗ Reject</XPButton>
        </>}
        {voucher.status === "approved" && (
          <XPButton onClick={() => onMarkPaid(voucher.id)} small primary>💳 Mark Paid</XPButton>
        )}
        <XPButton onClick={onClose} small>Close</XPButton>
      </div>
    </div>
  );
}

// ── JournalEntryForm ──────────────────────────────────────────────────────────
function JournalEntryForm({ onSave, onCancel, saving }: {
  onSave: (f: any) => void; onCancel: () => void; saving: boolean;
}) {
  const [f, setF] = useState({ reference: "", description: "", gl_account: "4000 - Salaries & Wages", debit: "", credit: "" });
  const inp: React.CSSProperties = { padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" as const };
  return (
    <div style={{ background: "#f5f4ea", borderBottom: `1px solid ${XP.gridBorder}`, padding: "8px 12px" }}>
      <div style={{ fontWeight: 700, fontSize: 11, color: "#00008b", marginBottom: 8 }}>📓 New Journal Entry</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>Reference</label>
          <input value={f.reference} onChange={e => setF(p => ({ ...p, reference: e.target.value }))} placeholder="JV-00001" style={inp} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>Description</label>
          <input value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>Debit (KES)</label>
          <input type="number" value={f.debit} onChange={e => setF(p => ({ ...p, debit: e.target.value, credit: e.target.value ? "" : p.credit }))} style={inp} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>Credit (KES)</label>
          <input type="number" value={f.credit} onChange={e => setF(p => ({ ...p, credit: e.target.value, debit: e.target.value ? "" : p.debit }))} style={inp} />
        </div>
        <div style={{ gridColumn: "span 5" }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>GL Account</label>
          <select value={f.gl_account} onChange={e => setF(p => ({ ...p, gl_account: e.target.value }))} style={{ ...inp }}>
            {COA.map(a => <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <XPButton onClick={() => onSave(f)} disabled={saving} primary>{saving ? "⏳ Saving…" : "💾 Post Entry"}</XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AccountantWorkspacePage() {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<WinTab>("vouchers");
  const [vouchers, setVouchers] = useState<Payment[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntry[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("2025-01-01");
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [selectedVoucher, setSelectedVoucher] = useState<Payment | null>(null);
  const [selectedCOA, setSelectedCOA] = useState<string | null>(null);
  const [coaSearch, setCoaSearch] = useState("");
  const [showNewVoucher, setShowNewVoucher] = useState(false);
  const [editVoucher, setEditVoucher] = useState<Payment | null>(null);
  const [showNewJournal, setShowNewJournal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [taskbarTime, setTaskbarTime] = useState(new Date());
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setTaskbarTime(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Close start menu on outside click
  useEffect(() => {
    if (!startOpen) return;
    const h = (e: MouseEvent) => { if (startRef.current && !startRef.current.contains(e.target as Node)) setStartOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [startOpen]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pvR, glR, bR] = await Promise.allSettled([
        db.from("payment_vouchers").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("gl_entries").select("*").order("created_at", { ascending: false }).limit(200),
        db.from("budgets").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      setVouchers(pvR.status === "fulfilled" ? pvR.value.data ?? [] : []);
      setGlEntries(glR.status === "fulfilled" ? glR.value.data ?? [] : []);
      setBudgets(bR.status === "fulfilled" ? bR.value.data ?? [] : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch = db.channel("acc_ws_v12")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_vouchers" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  async function updateStatus(id: string, status: string) {
    const { error } = await db.from("payment_vouchers")
      .update({ status, approved_by: profile?.full_name ?? user?.email, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) { toast({ title: `✓ Status → ${status}` }); fetchAll(); setSelectedVoucher(null); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function saveVoucher(f: any) {
    if (!f.payee || !f.total_amount) { toast({ title: "Payee and amount required", variant: "destructive" }); return; }
    setSaving(true);
    if (editVoucher) {
      // UPDATE
      const { error } = await db.from("payment_vouchers").update({
        payee: f.payee, total_amount: parseFloat(f.total_amount),
        payment_method: f.payment_method, gl_account: f.gl_account,
        vote_head: f.vote_head, description: f.description,
        po_reference: f.po_reference, invoice_reference: f.invoice_reference,
        bank_name: f.bank_name, payee_account: f.payee_account,
        due_date: f.due_date || null, currency: f.currency,
        updated_at: new Date().toISOString(),
      }).eq("id", editVoucher.id);
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: `✓ Voucher updated` });
      setEditVoucher(null); setShowNewVoucher(false);
    } else {
      // INSERT
      const vNum = `PV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}/${String(Date.now()).slice(-4)}`;
      const { error } = await db.from("payment_vouchers").insert({
        voucher_number: vNum, payee: f.payee, total_amount: parseFloat(f.total_amount),
        payment_method: f.payment_method, gl_account: f.gl_account,
        vote_head: f.vote_head, description: f.description,
        po_reference: f.po_reference, invoice_reference: f.invoice_reference,
        bank_name: f.bank_name, payee_account: f.payee_account,
        due_date: f.due_date || null, currency: f.currency, status: "draft",
      });
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: `✓ Voucher ${vNum} created` });
      setShowNewVoucher(false);
    }
    fetchAll();
  }

  async function saveJournalEntry(f: any) {
    if (!f.description) { toast({ title: "Description required", variant: "destructive" }); return; }
    if (!f.debit && !f.credit) { toast({ title: "Debit or credit amount required", variant: "destructive" }); return; }
    setSaving(true);
    const ref = f.reference || `JV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const { error } = await db.from("gl_entries").insert({
      reference: ref, description: f.description, gl_account: f.gl_account,
      debit: f.debit ? parseFloat(f.debit) : null,
      credit: f.credit ? parseFloat(f.credit) : null,
      status: "posted", created_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
    toast({ title: `✓ Journal entry ${ref} posted` });
    setShowNewJournal(false); fetchAll();
  }

  async function bulkApprove() {
    if (!selected.length) { toast({ title: "Select vouchers first", variant: "destructive" }); return; }
    const approver = profile?.full_name ?? user?.email;
    for (const id of selected) {
      await db.from("payment_vouchers").update({ status: "approved", approved_by: approver }).eq("id", id);
    }
    toast({ title: `✓ ${selected.length} voucher(s) approved` });
    setSelected([]); fetchAll();
  }

  async function bulkReject() {
    if (!selected.length) { toast({ title: "Select vouchers first", variant: "destructive" }); return; }
    for (const id of selected) {
      await db.from("payment_vouchers").update({ status: "rejected" }).eq("id", id);
    }
    toast({ title: `✓ ${selected.length} voucher(s) rejected` });
    setSelected([]); fetchAll();
  }

  async function bulkDelete() {
    if (!selected.length) { toast({ title: "Select vouchers first", variant: "destructive" }); return; }
    if (!window.confirm(`Delete ${selected.length} selected voucher(s)?`)) return;
    for (const id of selected) {
      await db.from("payment_vouchers").delete().eq("id", id);
    }
    toast({ title: `✓ ${selected.length} voucher(s) deleted` });
    setSelected([]); fetchAll();
  }

  async function submitForApproval(id: string) {
    const { error } = await db.from("payment_vouchers").update({ status: "pending" }).eq("id", id);
    if (!error) { toast({ title: "✓ Submitted for approval" }); fetchAll(); setSelectedVoucher(null); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  function printVoucher(v: Payment) {
    const w = window.open("", "_blank", "width=820,height=640");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payment Voucher ${v.voucher_number}</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;padding:28px;color:#1a1a1a;font-size:11px}
    .hdr{background:linear-gradient(135deg,#1a3580,#2a5fc3);color:#fff;padding:12px 18px;margin:-28px -28px 22px;display:flex;justify-content:space-between;align-items:center}
    h2{margin:0;font-size:14px;font-weight:900}table{width:100%;border-collapse:collapse;margin-top:8px}
    td{padding:5px 9px;border:1px solid #ccc;font-size:11px}.lbl{background:#f5f4ea;font-weight:700;width:26%;color:#555}
    .tot{font-size:18px;font-weight:900;color:#155724}
    .sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px}
    .sig{border-top:1px solid #555;padding-top:4px;font-size:9px;color:#666;margin-top:42px;text-align:center}
    </style></head><body>
    <div class="hdr">
      <div><h2>🏥 EL5 MediProcure</h2><div style="font-size:9px;opacity:.75">Embu Level 5 Hospital · Financial Management System</div></div>
      <div style="text-align:right"><div style="font-size:9px;opacity:.8">PAYMENT VOUCHER</div><div style="font-size:15px;font-weight:900">${v.voucher_number ?? ""}</div></div>
    </div>
    <table>
      <tr><td class="lbl">Payee</td><td><strong>${v.payee ?? ""}</strong></td><td class="lbl">Date</td><td>${fmtDate(v.created_at)}</td></tr>
      <tr><td class="lbl">Bank / Account No.</td><td>${v.bank_name ?? ""} — ${v.payee_account ?? ""}</td><td class="lbl">Due Date</td><td>${fmtDate(v.due_date)}</td></tr>
      <tr><td class="lbl">Payment Method</td><td style="text-transform:capitalize">${v.payment_method?.replace("_", " ") ?? ""}</td><td class="lbl">Status</td><td><strong style="text-transform:uppercase">${v.status}</strong></td></tr>
      <tr><td class="lbl">GL Account</td><td>${v.gl_account ?? "—"}</td><td class="lbl">Vote Head</td><td>${v.vote_head ?? "—"}</td></tr>
      <tr><td class="lbl">PO Reference</td><td>${v.po_reference ?? "—"}</td><td class="lbl">Invoice Ref</td><td>${v.invoice_reference ?? "—"}</td></tr>
      <tr><td class="lbl">Description</td><td colspan="3">${v.description ?? ""}</td></tr>
      <tr><td class="lbl">TOTAL AMOUNT</td><td colspan="3" class="tot">${fmtFull(v.total_amount)}</td></tr>
    </table>
    <div class="sigs">
      <div><div class="sig">Prepared By / Date</div></div>
      <div><div class="sig">Approved By / Date</div></div>
      <div><div class="sig">Finance Officer / Date</div></div>
    </div>
    <div style="margin-top:20px;font-size:8px;color:#aaa;text-align:center">Embu County Government · Embu Level 5 Hospital · EL5 MediProcure v12</div>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  function printAllVouchers() {
    const pv = filteredVouchers;
    if (!pv.length) { toast({ title: "No vouchers to print", variant: "destructive" }); return; }
    const rows = pv.map(v =>
      `<tr><td>${v.voucher_number ?? ""}</td><td>${v.payee ?? ""}</td><td style="text-transform:capitalize">${v.payment_method?.replace("_", " ") ?? ""}</td><td>${v.gl_account ?? ""}</td><td><strong style="text-transform:uppercase">${v.status}</strong></td><td style="font-weight:700">${fmtFull(v.total_amount)}</td><td>${fmtDate(v.created_at)}</td><td>${v.approved_by ?? "—"}</td></tr>`
    ).join("");
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Payment Vouchers Report</title>
    <style>body{font-family:Tahoma,Arial;font-size:10px;padding:20px}
    .hdr{background:linear-gradient(135deg,#1a3580,#2a5fc3);color:#fff;padding:10px 16px;margin:-20px -20px 16px;display:flex;justify-content:space-between}
    table{width:100%;border-collapse:collapse}th{background:#dbd9c9;padding:4px 8px;border:1px solid #ccc;text-align:left;font-size:10px}
    td{padding:3px 8px;border:1px solid #ccc;font-size:10px}tr:nth-child(even){background:#f5f4ea}</style>
    </head><body><div class="hdr"><div><strong>EL5 MediProcure — Payment Vouchers Report</strong><br/><small>Embu Level 5 Hospital · ${new Date().toLocaleDateString()}</small></div><div>Total: ${pv.length} vouchers</div></div>
    <table><thead><tr><th>Voucher No.</th><th>Payee</th><th>Method</th><th>GL Account</th><th>Status</th><th>Amount</th><th>Date</th><th>Approved By</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div style="margin-top:12px;font-size:9px;color:#aaa;text-align:center">EL5 MediProcure v12 · ${new Date().toLocaleString()}</div>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  function exportCSV() {
    const rows = ["Voucher No,Payee,Amount,Method,GL Account,Vote Head,Status,Date,Approved By",
      ...filteredVouchers.map(v =>
        `${v.voucher_number ?? ""},${v.payee ?? ""},${v.total_amount ?? 0},${v.payment_method ?? ""},${v.gl_account ?? ""},${v.vote_head ?? ""},${v.status},${fmtDate(v.created_at)},${v.approved_by ?? ""}`
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `vouchers_${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url); toast({ title: "✓ Exported to CSV" });
  }

  function exportJournalsCSV() {
    const rows = ["Reference,Description,GL Account,Debit,Credit,Status,Date",
      ...glEntries.map(g =>
        `${g.reference ?? ""},${g.description ?? ""},${g.gl_account ?? ""},${g.debit ?? ""},${g.credit ?? ""},${g.status ?? ""},${fmtDate(g.created_at)}`
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "journal_entries.csv"; a.click();
    URL.revokeObjectURL(url); toast({ title: "✓ Journals exported" });
  }

  function exportBudgetsCSV() {
    const rows = ["Name,FY,Department,Total Budget,Spent,Remaining,Status",
      ...budgets.map(b =>
        `${b.budget_name ?? ""},${b.fiscal_year ?? ""},${b.department ?? ""},${b.total_budget ?? 0},${b.spent ?? 0},${b.remaining ?? 0},${b.status ?? ""}`
      )
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "budgets.csv"; a.click();
    URL.revokeObjectURL(url); toast({ title: "✓ Budgets exported" });
  }

  // ── Filters ───────────────────────────────────────────────────────────────────
  const filteredVouchers = vouchers.filter(v => {
    const q = search.toLowerCase();
    const ms = !search || [v.voucher_number, v.payee, v.description, v.gl_account, v.vote_head, v.invoice_reference].some(f => f?.toLowerCase().includes(q));
    const mst = statusFilter === "ALL" || v.status === statusFilter.toLowerCase();
    const mdf = !dateFrom || v.created_at >= dateFrom;
    const mdt = !dateTo || v.created_at <= dateTo + "T23:59:59";
    return ms && mst && mdf && mdt;
  });

  const filteredCOA = COA.filter(a =>
    !coaSearch || a.name.toLowerCase().includes(coaSearch.toLowerCase()) || a.code.includes(coaSearch)
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const totalPaid = vouchers.filter(v => v.status === "paid" || v.status === "approved").reduce((s, v) => s + (v.total_amount ?? 0), 0);
  const totalPending = vouchers.filter(v => v.status === "pending").reduce((s, v) => s + (v.total_amount ?? 0), 0);
  const totalCredit = glEntries.reduce((s, g) => s + (g.credit ?? 0), 0);
  const totalBudget = budgets.reduce((s, b) => s + (b.total_budget ?? 0), 0);

  // ── Grid column defs ──────────────────────────────────────────────────────────
  const VOUCHER_COLS = [
    {
      key: "_chk", label: "", width: 28,
      render: (_: any, row: Payment) => (
        <input type="checkbox" checked={selected.includes(row.id)}
          onClick={e => e.stopPropagation()}
          onChange={e => setSelected(s => e.target.checked ? [...s, row.id] : s.filter(x => x !== row.id))} />
      ),
    },
    {
      key: "voucher_number", label: "Voucher No.", width: 150,
      render: (_: any, row: Payment) => (
        <span style={{ color: "#00008b", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
          onClick={e => { e.stopPropagation(); setSelectedVoucher(row); }}>
          {row.voucher_number ?? `PV/EL5H/${new Date(row.created_at).getFullYear()}-${row.id.slice(-4)}`}
        </span>
      ),
    },
    { key: "payee", label: "Payee", width: 160 },
    {
      key: "payment_method", label: "Method", width: 85,
      render: (v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1).replace("_", " ") : "Cheque",
    },
    {
      key: "gl_account", label: "Expense Acct", width: 165,
      render: (v: string) => <span style={{ fontSize: 10, color: "#555" }}>{v ?? "—"}</span>,
    },
    {
      key: "status", label: "Status", width: 75,
      render: (v: string) => <StatusChip status={v} />,
    },
    {
      key: "total_amount", label: "Amount", width: 105,
      render: (v: number) => <span style={{ fontWeight: 700 }}>{fmtK(v)}</span>,
    },
    {
      key: "created_at", label: "Date", width: 80,
      render: (v: string) => <span style={{ color: "#555" }}>{fmtDate(v)}</span>,
    },
    {
      key: "approved_by", label: "Approved By", width: 110,
      render: (v: string) => <span style={{ color: "#555" }}>{v ?? "—"}</span>,
    },
    {
      key: "_actions", label: "", width: 110,
      render: (_: any, row: Payment) => (
        <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
          {row.status === "draft" && (
            <XPButton onClick={() => submitForApproval(row.id)} small primary title="Submit for approval">Submit</XPButton>
          )}
          {row.status === "pending" && <>
            <XPButton onClick={() => updateStatus(row.id, "approved")} small primary title="Approve">✓</XPButton>
            <XPButton onClick={() => updateStatus(row.id, "rejected")} small danger title="Reject">✗</XPButton>
          </>}
          {row.status === "approved" && (
            <XPButton onClick={() => updateStatus(row.id, "paid")} small primary title="Mark as paid">Paid</XPButton>
          )}
          <XPButton onClick={() => printVoucher(row)} small title="Print voucher">🖨</XPButton>
          <XPButton onClick={() => { setEditVoucher(row); setShowNewVoucher(true); }} small title="Edit">✏️</XPButton>
        </div>
      ),
    },
  ];

  const JOURNAL_COLS = [
    {
      key: "reference", label: "Reference", width: 130,
      render: (v: string, row: GLEntry) => (
        <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#00008b" }}>
          {v ?? "JV-" + row.id.slice(-6)}
        </span>
      ),
    },
    { key: "description", label: "Description" },
    { key: "gl_account", label: "GL Account", width: 145, render: (v: string) => <span style={{ fontSize: 10 }}>{v ?? "—"}</span> },
    {
      key: "debit", label: "Debit", width: 105,
      render: (v: number) => <span style={{ fontWeight: 700, color: v ? "#155724" : "#888" }}>{v ? fmtK(v) : "—"}</span>,
    },
    {
      key: "credit", label: "Credit", width: 105,
      render: (v: number) => <span style={{ fontWeight: 700, color: v ? "#004085" : "#888" }}>{v ? fmtK(v) : "—"}</span>,
    },
    { key: "status", label: "Status", width: 70, render: (v: string) => <StatusChip status={v ?? "posted"} /> },
    { key: "created_at", label: "Date", width: 80, render: (v: string) => <span style={{ color: "#555" }}>{fmtDate(v)}</span> },
  ];

  const BUDGET_COLS = [
    { key: "budget_name", label: "Budget Name" },
    { key: "fiscal_year", label: "FY", width: 55 },
    { key: "department", label: "Department", width: 130 },
    { key: "total_budget", label: "Total Budget", width: 115, render: (v: number) => <span style={{ fontWeight: 700 }}>{fmtK(v)}</span> },
    { key: "spent", label: "Spent", width: 100, render: (v: number) => <span style={{ color: "#721c24" }}>{fmtK(v)}</span> },
    { key: "remaining", label: "Remaining", width: 100, render: (v: number) => <span style={{ fontWeight: 700, color: "#155724" }}>{fmtK(v)}</span> },
    {
      key: "_util", label: "Utilisation", width: 130,
      render: (_: any, row: Budget) => {
        const pct = row.total_budget ? Math.min(100, Math.round(((row.spent ?? 0) / row.total_budget) * 100)) : 0;
        const col = pct >= 90 ? "#dc3545" : pct >= 70 ? "#fd7e14" : "#28a745";
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ flex: 1, height: 9, background: "#e9ecef", border: "1px solid #ccc", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 9, color: col, fontWeight: 700 }}>{pct}%</span>
          </div>
        );
      },
    },
    { key: "status", label: "Status", width: 80, render: (v: string) => <StatusChip status={v ?? "active"} /> },
  ];

  const KPI_ROW = [
    { label: "TOTAL PAYMENTS", value: fmtK(totalPaid), color: "#155724" },
    { label: "TOTAL RECEIPTS", value: fmtK(totalCredit), color: "#004085" },
    { label: "NET BALANCE", value: fmtK(totalCredit - totalPaid), color: totalCredit >= totalPaid ? "#155724" : "#721c24" },
    { label: "RECORD COUNT", value: filteredVouchers.length, color: "#1a1a1a" },
    { label: "BUDGET ALLOC.", value: fmtK(totalBudget), color: "#856404" },
  ];

  const inp: React.CSSProperties = {
    padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2,
    fontSize: 11, fontFamily: XP.font, background: "#fff", color: "#1a1a1a",
    outline: "none", boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)",
  };

  const TABS: { id: WinTab; icon: string; label: string }[] = [
    { id: "vouchers", icon: "💳", label: "- Payments" },
    { id: "receipts", icon: "🧾", label: "- Receipts" },
    { id: "journals", icon: "📓", label: "- Journals" },
    { id: "reports", icon: "📊", label: "- Reports" },
    { id: "budgets", icon: "💰", label: "- Budgets" },
  ];

  // ── Menu definitions ──────────────────────────────────────────────────────────
  const FILE_MENU: MenuAction[] = [
    { label: "New Payment Voucher", icon: "💳", onClick: () => { setTab("vouchers"); setEditVoucher(null); setShowNewVoucher(true); } },
    { label: "New Journal Entry", icon: "📓", onClick: () => { setTab("journals"); setShowNewJournal(true); } },
    { label: "", onClick: () => {}, divider: true },
    { label: "Print Current View", icon: "🖨", onClick: () => tab === "vouchers" ? printAllVouchers() : window.print() },
    { label: "Export to CSV", icon: "📤", onClick: () => tab === "vouchers" ? exportCSV() : tab === "journals" ? exportJournalsCSV() : exportBudgetsCSV() },
    { label: "", onClick: () => {}, divider: true },
    { label: "Close Window", icon: "✕", onClick: () => navigate("/dashboard") },
  ];

  const VIEW_MENU: MenuAction[] = [
    { label: "Refresh", icon: "↻", onClick: fetchAll },
    { label: "", onClick: () => {}, divider: true },
    { label: "Payments", icon: "💳", onClick: () => setTab("vouchers") },
    { label: "Receipts", icon: "🧾", onClick: () => setTab("receipts") },
    { label: "Journals", icon: "📓", onClick: () => setTab("journals") },
    { label: "Reports", icon: "📊", onClick: () => setTab("reports") },
    { label: "Budgets", icon: "💰", onClick: () => setTab("budgets") },
  ];

  const REPORTS_MENU: MenuAction[] = [
    { label: "Financial Dashboard", icon: "📊", onClick: () => navigate("/financials/dashboard") },
    { label: "Chart of Accounts", icon: "🏛️", onClick: () => navigate("/financials/chart-of-accounts") },
    { label: "Budget Analysis", icon: "💰", onClick: () => navigate("/financials/budgets") },
    { label: "Fixed Assets", icon: "🏢", onClick: () => navigate("/financials/fixed-assets") },
    { label: "", onClick: () => {}, divider: true },
    { label: "Audit Log", icon: "📋", onClick: () => navigate("/audit-log") },
  ];

  const TOOLS_MENU: MenuAction[] = [
    { label: "Bulk Approve Selected", icon: "✓", onClick: bulkApprove, disabled: !selected.length },
    { label: "Bulk Reject Selected", icon: "✗", onClick: bulkReject, disabled: !selected.length },
    { label: "Delete Selected", icon: "🗑", onClick: bulkDelete, disabled: !selected.length },
    { label: "", onClick: () => {}, divider: true },
    { label: "Select All", icon: "☑", onClick: () => setSelected(filteredVouchers.map(v => v.id)) },
    { label: "Deselect All", icon: "☐", onClick: () => setSelected([]) },
  ];

  const HELP_MENU: MenuAction[] = [
    { label: "EL5 MediProcure v12", icon: "ℹ️", onClick: () => toast({ title: "EL5 MediProcure v12", description: "Accountant Workspace — Embu Level 5 Hospital" }) },
    { label: "ProcurBosse Documentation", icon: "📖", onClick: () => navigate("/settings") },
  ];

  if (minimized) return (
    <div onClick={() => setMinimized(false)} style={{
      position: "fixed", bottom: 36, left: 240, background: XP.windowBg,
      border: `1px solid ${XP.windowBorder}`, padding: "4px 12px",
      fontFamily: XP.font, fontSize: 11, cursor: "pointer", zIndex: 100,
      boxShadow: "2px 2px 4px rgba(0,0,0,0.3)",
    }}>
      📊 EL5 MediProcure — Accountant Workspace
    </div>
  );

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: XP.desktopBg, fontFamily: XP.font, fontSize: 11,
      overflow: "hidden", position: "relative" as const,
    }}>
      {/* Desktop wallpaper overlay */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 110%,rgba(40,120,50,0.12) 0%,transparent 60%)" }} />

      {/* Desktop shortcut icons */}
      <div style={{ position: "absolute", top: 8, right: 8, display: "flex", flexDirection: "column", gap: 6, zIndex: 1 }}>
        {[
          { icon: "💳", label: "Vouchers", path: "/vouchers/payment" },
          { icon: "📊", label: "Financials", path: "/financials" },
          { icon: "💰", label: "Budgets", path: "/financials/budgets" },
          { icon: "🏛️", label: "Chart of Accts", path: "/financials/chart-of-accounts" },
          { icon: "📋", label: "Audit Log", path: "/audit-log" },
          { icon: "🏠", label: "Dashboard", path: "/dashboard" },
        ].map(i => (
          <div key={i.label} onClick={() => navigate(i.path)} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 58, cursor: "pointer", padding: 4, borderRadius: 3 }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <span style={{ fontSize: 22 }}>{i.icon}</span>
            <span style={{ color: "#fff", fontSize: 9, textAlign: "center", textShadow: "1px 1px 2px #000", marginTop: 2, lineHeight: 1.2 }}>{i.label}</span>
          </div>
        ))}
      </div>

      {/* ── Main Window ── */}
      <div style={{
        flex: 1, margin: maximized ? 0 : 8, marginBottom: maximized ? 36 : 44,
        display: "flex", flexDirection: "column",
        background: XP.windowBg,
        border: `2px solid ${XP.windowBorder}`,
        borderRadius: maximized ? 0 : "6px 6px 0 0",
        boxShadow: maximized ? "none" : XP.windowShadow,
        overflow: "hidden", zIndex: 2,
      }}>
        {/* XP Title bar */}
        <XPTitleBar
          title="EL5 MediProcure — Financial Management System  [Accountant Workspace]"
          icon="📊"
          onMinimize={() => setMinimized(true)}
          onMaximize={() => setMaximized(m => !m)}
          onClose={() => navigate("/dashboard")}
        />

        {/* Menu bar */}
        <div style={{ background: XP.menuBg, display: "flex", alignItems: "center", borderBottom: `1px solid ${XP.gridBorder}`, padding: "0 2px", height: 22 }}>
          <XPDropdownMenu label="File" actions={FILE_MENU} />
          <XPDropdownMenu label="View" actions={VIEW_MENU} />
          <XPDropdownMenu label="Reports" actions={REPORTS_MENU} />
          <XPDropdownMenu label="Tools" actions={TOOLS_MENU} />
          <XPDropdownMenu label="Help" actions={HELP_MENU} />
        </div>

        {/* Toolbar */}
        <div style={{ background: "linear-gradient(180deg,#f5f4ea,#e8e6d8)", borderBottom: `1px solid ${XP.gridBorder}`, padding: "3px 6px", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" as const }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginRight: 6 }}>
            <div style={{ width: 24, height: 24, background: "linear-gradient(135deg,#1a3580,#2a5fc3)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 13 }}>🏥</span>
            </div>
            <span style={{ fontWeight: 700, color: "#00008b", fontSize: 11 }}>Embu Level 5 Hospital</span>
          </div>
          <div style={{ width: 1, height: 18, background: XP.btnBorder, margin: "0 3px" }} />
          <span style={{ color: "#555" }}>Date:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inp, width: 110 }} />
          <span style={{ color: "#555" }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inp, width: 110 }} />
          <XPButton onClick={fetchAll} title="Refresh data">↻ Refresh</XPButton>
          <div style={{ width: 1, height: 18, background: XP.btnBorder, margin: "0 3px" }} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "3px 10px", fontFamily: XP.font, fontSize: 11, cursor: "pointer",
                background: tab === t.id ? "linear-gradient(180deg,#b8cce8,#8aaad0)" : XP.btnFace,
                border: `1px solid ${XP.btnBorder}`,
                borderBottom: tab === t.id ? "1px solid transparent" : `1px solid ${XP.btnBorder}`,
                borderRadius: "3px 3px 0 0",
                fontWeight: tab === t.id ? 700 : 400,
                color: tab === t.id ? "#00008b" : "#1a1a1a",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
            <div style={{ width: 1, height: 18, background: XP.btnBorder, margin: "0 3px", alignSelf: "center" }} />
            <XPButton onClick={printAllVouchers} title="Print current view">🖨 Print</XPButton>
            <XPButton onClick={() => tab === "journals" ? exportJournalsCSV() : tab === "budgets" ? exportBudgetsCSV() : exportCSV()} title="Export to CSV">📤 Export</XPButton>
          </div>
        </div>

        {/* KPI stat row */}
        <div style={{ display: "flex", borderBottom: `1px solid ${XP.gridBorder}`, background: "#f5f4ea" }}>
          {KPI_ROW.map((k, i) => (
            <div key={i} style={{ flex: 1, padding: "8px 14px", borderRight: i < KPI_ROW.length - 1 ? `1px solid ${XP.gridBorder}` : "none", background: i % 2 === 0 ? "#fff" : "#f5f4ea" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ color: "#8b0000", fontWeight: 700, fontSize: 11 }}>–</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: k.color, fontFamily: "Tahoma,sans-serif" }}>{k.value}</span>
              </div>
              <div style={{ fontSize: 9, color: "#666", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginTop: 1 }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Voucher / Journal Form */}
        {(showNewVoucher && tab === "vouchers") && (
          <VoucherForm
            onSave={saveVoucher} onCancel={() => { setShowNewVoucher(false); setEditVoucher(null); }}
            saving={saving} initial={editVoucher ?? undefined}
          />
        )}
        {(showNewJournal && tab === "journals") && (
          <JournalEntryForm onSave={saveJournalEntry} onCancel={() => setShowNewJournal(false)} saving={saving} />
        )}

        {/* Body: COA sidebar + content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" as const }}>
          {/* Chart of Accounts sidebar */}
          <div style={{ width: 198, background: "#f5f4ea", borderRight: `1px solid ${XP.gridBorder}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ background: XP.sidebarBg, padding: "4px 8px", fontSize: 11, fontWeight: 700, color: "#fff", borderBottom: "1px solid rgba(0,0,0,0.2)" }}>
              Chart of Accounts
            </div>
            <div style={{ padding: 4, borderBottom: `1px solid ${XP.gridBorder}` }}>
              <input value={coaSearch} onChange={e => setCoaSearch(e.target.value)} placeholder="Search accounts…" style={{ ...inp, width: "100%", boxSizing: "border-box" as const, fontSize: 10 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 6px", background: "#e8e6d8", fontSize: 9, fontWeight: 700, color: "#555", borderBottom: `1px solid ${XP.gridBorder}` }}>
              <span>Account Name</span><span>Type</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" as const }}>
              {filteredCOA.map(a => (
                <div key={a.code} onClick={() => setSelectedCOA(selectedCOA === a.code ? null : a.code)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 6px", cursor: "pointer", fontSize: 10, background: selectedCOA === a.code ? XP.gridSelect : "transparent", color: selectedCOA === a.code ? "#fff" : "#1a1a1a", borderBottom: `1px solid ${XP.gridBorder}` }}
                  onMouseEnter={e => { if (selectedCOA !== a.code) e.currentTarget.style.background = XP.gridHover; }}
                  onMouseLeave={e => { if (selectedCOA !== a.code) e.currentTarget.style.background = "transparent"; }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 138 }}>{a.name}</span>
                  <span style={{ fontSize: 8, background: "#e8e6d8", color: "#666", padding: "1px 3px", borderRadius: 2, flexShrink: 0, lineHeight: 1.4 }}>{a.type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: filter bar + grid */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Filter bar */}
            <div style={{ background: "#f5f4ea", border: `1px solid ${XP.gridBorder}`, margin: 4, padding: "4px 8px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
              <span style={{ fontWeight: 700, color: "#555" }}>
                {TABS.find(t => t.id === tab)?.icon} {tab.charAt(0).toUpperCase() + tab.slice(1)} — Filter & Extract
              </span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter records…" style={{ ...inp, width: 200 }} />
              {(tab === "vouchers" || tab === "receipts") && (
                <>
                  <span style={{ color: "#555" }}>Status:</span>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inp}>
                    {["ALL", "DRAFT", "PENDING", "APPROVED", "PAID", "REJECTED"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {(["All Records", "Latest 100", "This Month"] as const).map((v, i) => (
                  <label key={v} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, cursor: "pointer" }}>
                    <input type="radio" name="rng" defaultChecked={i === 0} /> {v}
                  </label>
                ))}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                {selected.length > 0 && (
                  <>
                    <XPButton onClick={bulkApprove} small primary title={`Approve ${selected.length} selected`}>✓ Approve {selected.length}</XPButton>
                    <XPButton onClick={bulkReject} small danger title={`Reject ${selected.length} selected`}>✗ Reject {selected.length}</XPButton>
                    <XPButton onClick={bulkDelete} small danger title="Delete selected">🗑 Del</XPButton>
                  </>
                )}
                {tab === "vouchers" && (
                  <XPButton onClick={() => { setEditVoucher(null); setShowNewVoucher(v => !v); }} primary small>+ New Voucher</XPButton>
                )}
                {tab === "journals" && (
                  <XPButton onClick={() => setShowNewJournal(v => !v)} primary small>+ New Entry</XPButton>
                )}
                <XPButton onClick={() => tab === "journals" ? exportJournalsCSV() : tab === "budgets" ? exportBudgetsCSV() : exportCSV()} small>Extract →</XPButton>
              </div>
            </div>

            {/* Data grid area */}
            <div style={{ flex: 1, overflow: "hidden", margin: "0 4px 4px", display: "flex", flexDirection: "column", position: "relative" as const }}>
              {loading ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, color: "#888" }}>
                  <div style={{ width: 32, height: 32, border: "3px solid #316ac5", borderTop: "3px solid transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span>Loading…</span>
                </div>
              ) : (
                <>
                  {tab === "vouchers" && (
                    <XPGrid cols={VOUCHER_COLS} rows={filteredVouchers}
                      onRowClick={v => setSelectedVoucher(prev => prev?.id === v.id ? null : v)}
                      selectedId={selectedVoucher?.id}
                      emptyMsg="No payment vouchers found. Click '+ New Voucher' to create one."
                    />
                  )}
                  {tab === "receipts" && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                      <span style={{ fontSize: 32 }}>🧾</span>
                      <span style={{ color: "#555", fontWeight: 700 }}>Receipt Vouchers</span>
                      <XPButton onClick={() => navigate("/vouchers/receipt")} primary>Open Receipt Vouchers →</XPButton>
                    </div>
                  )}
                  {tab === "journals" && (
                    <XPGrid cols={JOURNAL_COLS} rows={glEntries}
                      emptyMsg="No journal entries. Click '+ New Entry' to post one."
                    />
                  )}
                  {tab === "reports" && (
                    <div style={{ padding: 14, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                      {[
                        { icon: "📊", title: "Financial Dashboard", desc: "KPI overview & trends", path: "/financials/dashboard" },
                        { icon: "💳", title: "Payment Vouchers", desc: "All payment vouchers", path: "/vouchers/payment" },
                        { icon: "🧾", title: "Receipt Vouchers", desc: "Income & receipts", path: "/vouchers/receipt" },
                        { icon: "📓", title: "Journal Entries", desc: "GL journal postings", path: "/vouchers/journal" },
                        { icon: "💰", title: "Budgets", desc: "Allocation & utilisation", path: "/financials/budgets" },
                        { icon: "🏛️", title: "Chart of Accounts", desc: "Account structure", path: "/financials/chart-of-accounts" },
                        { icon: "📋", title: "Audit Log", desc: "Activity history", path: "/audit-log" },
                        { icon: "🏢", title: "Fixed Assets", desc: "Asset register", path: "/financials/fixed-assets" },
                        { icon: "📈", title: "Purchase Orders", desc: "PO financial summary", path: "/purchase-orders" },
                      ].map(r => (
                        <div key={r.title} onClick={() => navigate(r.path)} style={{ background: "#fff", border: `1px solid ${XP.gridBorder}`, padding: "10px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderRadius: 3, boxShadow: "1px 1px 3px rgba(0,0,0,0.1)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#dce9ff")}
                          onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                          <span style={{ fontSize: 22 }}>{r.icon}</span>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#00008b" }}>{r.title}</div>
                            <div style={{ fontSize: 9, color: "#888", marginTop: 1 }}>{r.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {tab === "budgets" && (
                    budgets.length > 0 ? (
                      <XPGrid cols={BUDGET_COLS} rows={budgets} emptyMsg="No budget records" />
                    ) : (
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
                        <span style={{ fontSize: 32 }}>💰</span>
                        <span style={{ color: "#555" }}>No budget records found</span>
                        <XPButton onClick={() => navigate("/financials/budgets")} primary>Open Budgets Module →</XPButton>
                      </div>
                    )
                  )}
                </>
              )}

              {/* Voucher detail side panel */}
              {selectedVoucher && tab === "vouchers" && (
                <VoucherDetailPanel
                  voucher={selectedVoucher}
                  onClose={() => setSelectedVoucher(null)}
                  onApprove={id => updateStatus(id, "approved")}
                  onReject={id => updateStatus(id, "rejected")}
                  onMarkPaid={id => updateStatus(id, "paid")}
                  onPrint={printVoucher}
                  onEdit={v => { setEditVoucher(v); setShowNewVoucher(true); setSelectedVoucher(null); }}
                />
              )}
            </div>
          </div>
        </div>

        {/* XP Status bar */}
        <div style={{ background: XP.statusBg, borderTop: `1px solid ${XP.statusBorder}`, padding: "2px 8px", display: "flex", gap: 14, fontSize: 10, color: "#555" }}>
          <span style={{ paddingRight: 10, borderRight: `1px solid ${XP.statusBorder}` }}>{filteredVouchers.length} object(s)</span>
          <span style={{ paddingRight: 10, borderRight: `1px solid ${XP.statusBorder}` }}>Approved: {vouchers.filter(v => v.status === "approved" || v.status === "paid").length}</span>
          <span style={{ paddingRight: 10, borderRight: `1px solid ${XP.statusBorder}` }}>Pending: {vouchers.filter(v => v.status === "pending").length}</span>
          {selected.length > 0 && <span style={{ color: "#00008b", fontWeight: 700, paddingRight: 10, borderRight: `1px solid ${XP.statusBorder}` }}>{selected.length} selected</span>}
          <span style={{ paddingRight: 10, borderRight: `1px solid ${XP.statusBorder}` }}>Total: {fmtK(filteredVouchers.reduce((s, v) => s + (v.total_amount ?? 0), 0))}</span>
          <span style={{ marginLeft: "auto", color: "#888" }}>
            {profile?.full_name ?? user?.email} · {roles.filter(r => ["accountant", "admin", "superadmin", "procurement_manager"].includes(r)).join(", ")}
          </span>
        </div>
      </div>

      {/* ── XP Taskbar ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 36, background: XP.taskbar, borderTop: `2px solid ${XP.taskbarBorder}`, display: "flex", alignItems: "center", padding: "0 4px", zIndex: 1000, boxShadow: "0 -1px 6px rgba(0,0,0,0.5)" }}>
        {/* Start button */}
        <div ref={startRef} style={{ position: "relative" as const }}>
          <button onClick={() => setStartOpen(o => !o)} style={{ background: startOpen ? "linear-gradient(180deg,#3d7a3d,#2d6a2d)" : XP.startBtn, border: "1px solid #1a5a1a", borderRadius: "0 12px 12px 0", color: "#fff", fontWeight: 900, fontSize: 13, padding: "3px 12px 3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "2px 0 4px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.3)", height: 28 }}>
            <span style={{ fontSize: 16 }}>🪟</span>
            <span style={{ fontFamily: "Franklin Gothic Medium,Tahoma", fontSize: 12 }}>start</span>
          </button>
          {startOpen && (
            <div style={{ position: "absolute" as const, bottom: 36, left: 0, width: 210, background: "#fff", border: `2px solid ${XP.windowBorder}`, boxShadow: "4px 0 10px rgba(0,0,0,0.4)", zIndex: 1001 }}>
              <div style={{ background: XP.titleActive, padding: "10px 12px", color: "#fff" }}>
                <div style={{ fontWeight: 900, fontSize: 13 }}>👤 {(profile?.full_name ?? user?.email?.split("@")[0])}</div>
                <div style={{ fontSize: 9, opacity: .75, marginTop: 2 }}>{roles.filter(r => ["accountant", "admin", "superadmin", "procurement_manager"].includes(r)).join(", ") || "Accountant"}</div>
              </div>
              {[
                { icon: "💳", label: "Payment Vouchers", path: "/vouchers/payment" },
                { icon: "🧾", label: "Receipt Vouchers", path: "/vouchers/receipt" },
                { icon: "📊", label: "Financial Dashboard", path: "/financials/dashboard" },
                { icon: "💰", label: "Budgets", path: "/financials/budgets" },
                { icon: "🏛️", label: "Chart of Accounts", path: "/financials/chart-of-accounts" },
                { icon: "📋", label: "Audit Log", path: "/audit-log" },
                { icon: "🏠", label: "Dashboard", path: "/dashboard" },
              ].map(item => (
                <div key={item.path} onClick={() => { navigate(item.path); setStartOpen(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", cursor: "pointer", fontSize: 11, borderBottom: `1px solid ${XP.gridBorder}`, color: "#1a1a1a" }}
                  onMouseEnter={e => { e.currentTarget.style.background = XP.menuHover; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#1a1a1a"; }}>
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                </div>
              ))}
              <div style={{ borderTop: `2px solid ${XP.gridBorder}`, padding: 4, display: "flex", gap: 4, justifyContent: "flex-end" }}>
                <XPButton onClick={() => { navigate("/dashboard"); setStartOpen(false); }} small>🏠 Home</XPButton>
                <XPButton onClick={() => setStartOpen(false)} small>Close</XPButton>
              </div>
            </div>
          )}
        </div>

        {/* Quick launch */}
        <div style={{ display: "flex", gap: 2, marginLeft: 4, padding: "0 4px", borderRight: "1px solid rgba(255,255,255,0.2)" }}>
          {[
            { icon: "🏠", title: "Dashboard", path: "/dashboard" },
            { icon: "💳", title: "Vouchers", path: "/vouchers/payment" },
            { icon: "📊", title: "Financials", path: "/financials" },
            { icon: "💰", title: "Budgets", path: "/financials/budgets" },
          ].map(i => (
            <div key={i.path} title={i.title} onClick={() => navigate(i.path)}
              style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: 3, fontSize: 14 }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              {i.icon}
            </div>
          ))}
        </div>

        {/* Active window button */}
        <button onClick={() => setMinimized(false)} style={{ background: "linear-gradient(180deg,#3d6eb5,#2a55a0)", border: "1px solid #1a4090", borderRadius: 3, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", cursor: "pointer", margin: "0 6px", display: "flex", alignItems: "center", gap: 4, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2)" }}>
          📊 Accountant Workspace
        </button>

        {/* Status indicators */}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(180deg,#1a55b5,#1245a0)", border: "1px solid #0a3080", padding: "2px 8px", borderRadius: 2, fontSize: 10, color: "#fff", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)" }}>
          {selected.length > 0 && <span style={{ background: "rgba(255,200,0,0.25)", padding: "0 5px", borderRadius: 2, color: "#ffe" }}>{selected.length} sel</span>}
          <span>🌐</span>
          <span>🔊</span>
          <span style={{ fontFamily: "Tahoma,sans-serif", fontWeight: 700 }}>
            {taskbarTime.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
