import type React from "react";
/**
 * EL5 MediProcure — Finance Workspace v1.0
 * Windows XP Luna theme — 9 Tabs — All buttons fully functional
 * Role: finance_officer | finance_manager | accountant | admin
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ── XP Luna palette ───────────────────────────────────────────────────────────
const XP = {
  titleActive:   "linear-gradient(180deg,#4a90e2 0%,#2464c3 8%,#245ebd 92%,#1a4fa8 100%)",
  windowBg:      "#ece9d8",
  contentBg:     "#ffffff",
  taskbar:       "linear-gradient(180deg,#3169c9 0%,#2255b7 4%,#245ebd 96%,#1a50a8 100%)",
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
  font:          "'Tahoma','Segoe UI','Arial',sans-serif",
};

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtK(n?: number | null) {
  const v = n || 0;
  if (v >= 1_000_000) return `KES ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `KES ${(v / 1_000).toFixed(2)}K`;
  return `KES ${v.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}
function fmtFull(n?: number | null) {
  return `KES ${(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" });
}
const db = supabase as any;

// ── Types ─────────────────────────────────────────────────────────────────────
type FinTab = "overview" | "payments" | "receipts" | "journals" | "budgets" | "gl" | "assets" | "bank" | "reports";

interface Payment { id: string; voucher_number?: string; payee?: string; total_amount?: number; status: string; payment_method?: string; created_at: string; approved_by?: string; gl_account?: string; description?: string; invoice_reference?: string; po_reference?: string; vote_head?: string; due_date?: string; bank_name?: string; payee_account?: string; currency?: string; }
interface Receipt { id: string; receipt_number?: string; payer?: string; amount?: number; status: string; payment_method?: string; created_at: string; approved_by?: string; gl_account?: string; description?: string; reference_number?: string; }
interface GLEntry { id: string; reference?: string; description?: string; gl_account?: string; debit?: number; credit?: number; created_at: string; status?: string; }
interface Budget { id: string; budget_name?: string; fiscal_year?: string; total_budget?: number; spent?: number; remaining?: number; department?: string; status?: string; created_at: string; }
interface FixedAsset { id: string; asset_name?: string; asset_code?: string; category?: string; purchase_cost?: number; current_value?: number; depreciation_rate?: number; acquisition_date?: string; status?: string; location?: string; }
interface MenuAction { label: string; icon?: string; onClick: () => void; divider?: boolean; disabled?: boolean; }

// ── COA ───────────────────────────────────────────────────────────────────────
const COA = [
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
  { code: "4400", name: "Depreciation Expense", type: "exp" },
  { code: "5000", name: "Retained Earnings", type: "eq" },
];

const VOTE_HEADS = ["2210100","2210200","2210300","2211100","3110200","3110300","2710200","2640400"];
const PAY_METHODS = ["cheque","bank_transfer","cash","mpesa","rtgs","swift"];
const ASSET_CATS = ["Medical Equipment","Furniture & Fittings","IT Equipment","Motor Vehicles","Land & Buildings","Office Equipment","Laboratory Equipment"];

// ── XPButton ──────────────────────────────────────────────────────────────────
function XPButton({ onClick, children, disabled, primary, small, danger, title, warning }: {
  onClick?: () => void; children: React.ReactNode;
  disabled?: boolean; primary?: boolean; small?: boolean; danger?: boolean; warning?: boolean; title?: string;
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const bg = danger
    ? (active ? "#ffb0b0" : hover ? "#ffe0e0" : "#fff0f0")
    : warning
      ? (active ? "#ffe0b0" : hover ? "#fff3cd" : "#fff8e1")
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
        border: `1px solid ${danger ? "#cc0000" : warning ? "#cc8800" : XP.btnBorder}`,
        borderRadius: 3, padding: small ? "1px 8px" : "3px 14px",
        fontSize: small ? 10 : 11, fontFamily: XP.font,
        color: disabled ? "#888" : danger ? "#880000" : warning ? "#7a4f00" : "#1a1a1a",
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active ? "inset 1px 1px 2px rgba(0,0,0,0.2)" : "1px 1px 2px rgba(255,255,255,0.8) inset,-1px -1px 2px rgba(0,0,0,0.1) inset",
        display: "inline-flex", alignItems: "center", gap: 4,
        whiteSpace: "nowrap" as const, userSelect: "none" as const,
        opacity: disabled ? 0.6 : 1,
      }}
    >{children}</button>
  );
}

// ── XPTitleBar ────────────────────────────────────────────────────────────────
function XPTitleBar({ title, icon, onClose }: { title: string; icon?: string; onClose: () => void; }) {
  return (
    <div style={{ background: XP.titleActive, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 4px 3px 6px", userSelect: "none" as const, borderBottom: "1px solid rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: XP.font, textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}>{title}</span>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
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
      <span onClick={() => setOpen(o => !o)}
        style={{ padding: "2px 7px", cursor: "pointer", fontSize: 11, fontFamily: XP.font, userSelect: "none" as const, background: open ? XP.menuHover : "transparent", color: open ? XP.menuHoverText : "#1a1a1a", display: "inline-block" }}
        onMouseEnter={e => { e.currentTarget.style.background = XP.menuHover; e.currentTarget.style.color = XP.menuHoverText; }}
        onMouseLeave={e => { if (!open) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1a1a1a"; } }}
      >{label}</span>
      {open && (
        <div style={{ position: "absolute" as const, top: "100%", left: 0, minWidth: 180, zIndex: 9999, background: XP.menuBg, border: `1px solid ${XP.btnBorder}`, boxShadow: "3px 3px 8px rgba(0,0,0,0.35)" }}>
          {actions.map((a, i) =>
            a.divider
              ? <div key={i} style={{ height: 1, background: XP.btnBorder, margin: "2px 4px" }} />
              : <div key={i} onClick={() => { if (!a.disabled) { a.onClick(); setOpen(false); } }}
                  style={{ padding: "4px 16px 4px 24px", fontSize: 11, fontFamily: XP.font, cursor: a.disabled ? "not-allowed" : "pointer", color: a.disabled ? "#aaa" : "#1a1a1a", display: "flex", alignItems: "center", gap: 6 }}
                  onMouseEnter={e => { if (!a.disabled) { e.currentTarget.style.background = XP.menuHover; e.currentTarget.style.color = XP.menuHoverText; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = a.disabled ? "#aaa" : "#1a1a1a"; }}
                >{a.icon && <span>{a.icon}</span>}{a.label}</div>
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
    posted:   { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    active:   { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    received: { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    matched:  { bg: "#d4edda", color: "#155724", border: "#c3e6cb" },
    pending:  { bg: "#fff3cd", color: "#856404", border: "#ffc107" },
    draft:    { bg: "#e9ecef", color: "#495057", border: "#ced4da" },
    inactive: { bg: "#e9ecef", color: "#495057", border: "#ced4da" },
    rejected: { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
    disposed: { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
    over_budget: { bg: "#f8d7da", color: "#721c24", border: "#f5c6cb" },
  };
  const s = m[status?.toLowerCase()] ?? { bg: "#e9ecef", color: "#495057", border: "#ced4da" };
  return <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: 2, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontFamily: XP.font, textTransform: "uppercase" as const }}>{status}</span>;
}

// ── XPGrid ────────────────────────────────────────────────────────────────────
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
              <th key={c.key} style={{ background: XP.gridHeader, padding: "4px 7px", borderBottom: `2px solid ${XP.gridBorder}`, borderRight: `1px solid ${XP.gridBorder}`, textAlign: "left", fontSize: 11, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap" as const, position: "sticky" as const, top: 0, zIndex: 5, width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || i} onClick={() => onRowClick?.(row)}
              style={{ background: selectedId === row.id ? XP.gridSelect : i % 2 === 0 ? XP.gridRow : XP.gridRowAlt, color: selectedId === row.id ? XP.gridSelectTxt : "#1a1a1a", cursor: onRowClick ? "pointer" : "default" }}
              onMouseEnter={e => { if (selectedId !== row.id) e.currentTarget.style.background = XP.gridHover; }}
              onMouseLeave={e => { if (selectedId !== row.id) e.currentTarget.style.background = i % 2 === 0 ? XP.gridRow : XP.gridRowAlt; }}
            >
              {cols.map(c => (
                <td key={c.key} style={{ padding: "3px 7px", borderBottom: `1px solid ${XP.gridBorder}`, borderRight: `1px solid ${XP.gridBorder}`, verticalAlign: "middle" as const, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={cols.length} style={{ padding: 30, textAlign: "center", color: "#888" }}>{emptyMsg ?? "No records found"}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── KPICard ───────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ background: "linear-gradient(180deg,#f8f7ee,#ece9d8)", border: `1px solid ${XP.btnBorder}`, borderRadius: 4, padding: "8px 12px", minWidth: 130, boxShadow: "1px 1px 4px rgba(0,0,0,0.12)", flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 10, color: "#666", fontFamily: XP.font, fontWeight: 700, textTransform: "uppercase" as const }}>{label}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 900, fontFamily: XP.font, color: accent ?? "#00008b" }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: "#888", fontFamily: XP.font, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── BudgetBar ─────────────────────────────────────────────────────────────────
function BudgetBar({ label, total, spent, dept }: { label: string; total: number; spent: number; dept?: string }) {
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0;
  const color = pct >= 90 ? "#dc3545" : pct >= 70 ? "#fd7e14" : "#28a745";
  return (
    <div style={{ fontFamily: XP.font, marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 2, color: "#333" }}>
        <span style={{ fontWeight: 700 }}>{label}{dept ? ` · ${dept}` : ""}</span>
        <span style={{ color }}>{pct.toFixed(1)}% used · {fmtK(spent)} / {fmtK(total)}</span>
      </div>
      <div style={{ height: 10, background: "#ccc", borderRadius: 2, overflow: "hidden", border: "1px solid #aaa" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

// ── FormModal ─────────────────────────────────────────────────────────────────
function FormModal({ title, icon, onClose, children }: { title: string; icon: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 8000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: XP.windowBg, border: "2px solid #0054e3", borderRadius: 4, boxShadow: "6px 6px 20px rgba(0,0,0,0.6)", minWidth: 560, maxWidth: "90vw", maxHeight: "85vh", display: "flex", flexDirection: "column" as const }}>
        <XPTitleBar title={title} icon={icon} onClose={onClose} />
        <div style={{ overflowY: "auto" as const, padding: 14, flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// ── PaymentForm ───────────────────────────────────────────────────────────────
function PaymentForm({ onSave, onCancel, saving, initial }: { onSave: (f: any) => void; onCancel: () => void; saving: boolean; initial?: Partial<Payment> }) {
  const [f, setF] = useState({ payee: initial?.payee ?? "", total_amount: initial?.total_amount?.toString() ?? "", payment_method: initial?.payment_method ?? "cheque", gl_account: initial?.gl_account ?? "2000 - Accounts Payable", vote_head: initial?.vote_head ?? "", description: initial?.description ?? "", po_reference: initial?.po_reference ?? "", invoice_reference: initial?.invoice_reference ?? "", bank_name: initial?.bank_name ?? "", payee_account: initial?.payee_account ?? "", due_date: initial?.due_date ?? "", currency: initial?.currency ?? "KES" });
  const inp: React.CSSProperties = { padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" as const, boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)" };
  const lbl = (t: string) => <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>{t}</label>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>{lbl("Payee *")}<input value={f.payee} onChange={e => setF(p => ({ ...p, payee: e.target.value }))} placeholder="Payee name" style={inp} /></div>
        <div>{lbl("Amount (KES) *")}<input type="number" value={f.total_amount} onChange={e => setF(p => ({ ...p, total_amount: e.target.value }))} placeholder="0.00" style={inp} /></div>
        <div>{lbl("Method")}<select value={f.payment_method} onChange={e => setF(p => ({ ...p, payment_method: e.target.value }))} style={inp}>{PAY_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace("_", " ")}</option>)}</select></div>
        <div>{lbl("Currency")}<select value={f.currency} onChange={e => setF(p => ({ ...p, currency: e.target.value }))} style={inp}>{["KES","USD","EUR","GBP"].map(c => <option key={c}>{c}</option>)}</select></div>
        <div>{lbl("GL Account")}<select value={f.gl_account} onChange={e => setF(p => ({ ...p, gl_account: e.target.value }))} style={inp}>{COA.map(a => <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></div>
        <div>{lbl("Vote Head")}<select value={f.vote_head} onChange={e => setF(p => ({ ...p, vote_head: e.target.value }))} style={inp}><option value="">— Select —</option>{VOTE_HEADS.map(v => <option key={v}>{v}</option>)}</select></div>
        <div>{lbl("Bank Name")}<input value={f.bank_name} onChange={e => setF(p => ({ ...p, bank_name: e.target.value }))} style={inp} /></div>
        <div>{lbl("Account No.")}<input value={f.payee_account} onChange={e => setF(p => ({ ...p, payee_account: e.target.value }))} style={inp} /></div>
        <div>{lbl("Due Date")}<input type="date" value={f.due_date} onChange={e => setF(p => ({ ...p, due_date: e.target.value }))} style={inp} /></div>
        <div>{lbl("PO Reference")}<input value={f.po_reference} onChange={e => setF(p => ({ ...p, po_reference: e.target.value }))} style={inp} /></div>
        <div>{lbl("Invoice Reference")}<input value={f.invoice_reference} onChange={e => setF(p => ({ ...p, invoice_reference: e.target.value }))} style={inp} /></div>
        <div style={{ gridColumn: "span 3" }}>{lbl("Description / Purpose")}<input value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} placeholder="Purpose of payment..." style={inp} /></div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <XPButton onClick={() => onSave(f)} disabled={saving} primary>{saving ? "⏳ Saving…" : "💾 Save Voucher"}</XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

// ── ReceiptForm ───────────────────────────────────────────────────────────────
function ReceiptForm({ onSave, onCancel, saving, initial }: { onSave: (f: any) => void; onCancel: () => void; saving: boolean; initial?: Partial<Receipt> }) {
  const [f, setF] = useState({ payer: initial?.payer ?? "", amount: initial?.amount?.toString() ?? "", payment_method: initial?.payment_method ?? "cash", gl_account: initial?.gl_account ?? "3200 - Patient Fee Revenue", description: initial?.description ?? "", reference_number: initial?.reference_number ?? "" });
  const inp: React.CSSProperties = { padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const lbl = (t: string) => <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>{t}</label>;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>{lbl("Payer *")}<input value={f.payer} onChange={e => setF(p => ({ ...p, payer: e.target.value }))} placeholder="Name of payer" style={inp} /></div>
        <div>{lbl("Amount (KES) *")}<input type="number" value={f.amount} onChange={e => setF(p => ({ ...p, amount: e.target.value }))} style={inp} /></div>
        <div>{lbl("Method")}<select value={f.payment_method} onChange={e => setF(p => ({ ...p, payment_method: e.target.value }))} style={inp}>{PAY_METHODS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace("_"," ")}</option>)}</select></div>
        <div>{lbl("GL Account")}<select value={f.gl_account} onChange={e => setF(p => ({ ...p, gl_account: e.target.value }))} style={inp}>{COA.filter(a => a.type === "inc" || a.type === "ass").map(a => <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></div>
        <div>{lbl("Reference No.")}<input value={f.reference_number} onChange={e => setF(p => ({ ...p, reference_number: e.target.value }))} style={inp} /></div>
        <div style={{ gridColumn: "span 3" }}>{lbl("Description")}<input value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} style={inp} /></div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <XPButton onClick={() => onSave(f)} disabled={saving} primary>{saving ? "⏳ Saving…" : "💾 Save Receipt"}</XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

// ── JournalForm ───────────────────────────────────────────────────────────────
function JournalForm({ onSave, onCancel, saving }: { onSave: (f: any) => void; onCancel: () => void; saving: boolean }) {
  const [f, setF] = useState({ reference: "", description: "", gl_debit: "4000 - Salaries & Wages", gl_credit: "2100 - Salaries Payable", debit: "", credit: "" });
  const inp: React.CSSProperties = { padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const lbl = (t: string) => <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>{t}</label>;
  const bal = (parseFloat(f.debit) || 0) - (parseFloat(f.credit) || 0);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div>{lbl("Reference")}<input value={f.reference} onChange={e => setF(p => ({ ...p, reference: e.target.value }))} placeholder="JV-00001" style={inp} /></div>
        <div style={{ gridColumn: "span 2" }}>{lbl("Description *")}<input value={f.description} onChange={e => setF(p => ({ ...p, description: e.target.value }))} style={inp} /></div>
        <div style={{ gridColumn: "span 3" }}>{lbl("Debit Account")}<select value={f.gl_debit} onChange={e => setF(p => ({ ...p, gl_debit: e.target.value }))} style={inp}>{COA.map(a => <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></div>
        <div>{lbl("Debit Amount")}<input type="number" value={f.debit} onChange={e => setF(p => ({ ...p, debit: e.target.value }))} style={inp} /></div>
        <div style={{ gridColumn: "span 2" }}>{lbl("Credit Account")}<select value={f.gl_credit} onChange={e => setF(p => ({ ...p, gl_credit: e.target.value }))} style={inp}>{COA.map(a => <option key={a.code} value={`${a.code} - ${a.name}`}>{a.code} – {a.name}</option>)}</select></div>
        <div>{lbl("Credit Amount")}<input type="number" value={f.credit} onChange={e => setF(p => ({ ...p, credit: e.target.value }))} style={inp} /></div>
      </div>
      <div style={{ marginTop: 8, padding: "6px 10px", background: Math.abs(bal) < 0.01 ? "#d4edda" : "#fff3cd", border: `1px solid ${Math.abs(bal) < 0.01 ? "#c3e6cb" : "#ffc107"}`, borderRadius: 3, fontSize: 11, fontFamily: XP.font }}>
        {Math.abs(bal) < 0.01 ? "✓ Entry is balanced (Dr = Cr)" : `⚠ Imbalance: ${fmtFull(Math.abs(bal))} ${bal > 0 ? "excess debit" : "excess credit"}`}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <XPButton onClick={() => onSave(f)} disabled={saving || Math.abs(bal) >= 0.01} primary>{saving ? "⏳ Posting…" : "📓 Post Entry"}</XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

// ── AssetForm ─────────────────────────────────────────────────────────────────
function AssetForm({ onSave, onCancel, saving, initial }: { onSave: (f: any) => void; onCancel: () => void; saving: boolean; initial?: Partial<FixedAsset> }) {
  const [f, setF] = useState({ asset_name: initial?.asset_name ?? "", asset_code: initial?.asset_code ?? "", category: initial?.category ?? ASSET_CATS[0], purchase_cost: initial?.purchase_cost?.toString() ?? "", depreciation_rate: initial?.depreciation_rate?.toString() ?? "10", acquisition_date: initial?.acquisition_date ?? "", location: initial?.location ?? "", status: initial?.status ?? "active" });
  const inp: React.CSSProperties = { padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" as const };
  const lbl = (t: string) => <label style={{ fontSize: 10, fontWeight: 700, color: "#555", display: "block", marginBottom: 2 }}>{t}</label>;
  const cost = parseFloat(f.purchase_cost) || 0;
  const rate = parseFloat(f.depreciation_rate) || 0;
  const acq = f.acquisition_date ? new Date(f.acquisition_date) : null;
  const years = acq ? (Date.now() - acq.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
  const nbv = Math.max(0, cost - (cost * (rate / 100) * years));
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        <div style={{ gridColumn: "span 2" }}>{lbl("Asset Name *")}<input value={f.asset_name} onChange={e => setF(p => ({ ...p, asset_name: e.target.value }))} style={inp} /></div>
        <div>{lbl("Asset Code")}<input value={f.asset_code} onChange={e => setF(p => ({ ...p, asset_code: e.target.value }))} placeholder="EL5-XXX-001" style={inp} /></div>
        <div>{lbl("Category")}<select value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))} style={inp}>{ASSET_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
        <div>{lbl("Purchase Cost (KES)")}<input type="number" value={f.purchase_cost} onChange={e => setF(p => ({ ...p, purchase_cost: e.target.value }))} style={inp} /></div>
        <div>{lbl("Depreciation Rate (%/yr)")}<input type="number" value={f.depreciation_rate} onChange={e => setF(p => ({ ...p, depreciation_rate: e.target.value }))} style={inp} /></div>
        <div>{lbl("Acquisition Date")}<input type="date" value={f.acquisition_date} onChange={e => setF(p => ({ ...p, acquisition_date: e.target.value }))} style={inp} /></div>
        <div>{lbl("Location")}<input value={f.location} onChange={e => setF(p => ({ ...p, location: e.target.value }))} style={inp} /></div>
        <div>{lbl("Status")}<select value={f.status} onChange={e => setF(p => ({ ...p, status: e.target.value }))} style={inp}><option value="active">Active</option><option value="inactive">Inactive</option><option value="disposed">Disposed</option></select></div>
      </div>
      {cost > 0 && f.acquisition_date && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "#e9f4ff", border: "1px solid #b8daff", borderRadius: 3, fontSize: 11, fontFamily: XP.font }}>
          📊 NBV: <strong>{fmtFull(nbv)}</strong> · Accumulated depreciation: {fmtFull(cost - nbv)} · Years held: {years.toFixed(1)}
        </div>
      )}
      <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
        <XPButton onClick={() => onSave(f)} disabled={saving} primary>{saving ? "⏳ Saving…" : "💾 Save Asset"}</XPButton>
        <XPButton onClick={onCancel}>Cancel</XPButton>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FinanceWorkspacePage() {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const isManager = roles.includes("finance_manager") || roles.includes("admin") || roles.includes("procurement_manager");

  const [tab, setTab]         = useState<FinTab>("overview");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [glEntries, setGlEntries] = useState<GLEntry[]>([]);
  const [budgets,   setBudgets]   = useState<Budget[]>([]);
  const [assets,    setAssets]    = useState<FixedAsset[]>([]);
  const [loading,   setLoading]   = useState(true);

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFrom,     setDateFrom]     = useState("2025-01-01");
  const [dateTo,       setDateTo]       = useState(new Date().toISOString().split("T")[0]);

  const [selPayment, setSelPayment] = useState<Payment | null>(null);
  const [selReceipt, setSelReceipt] = useState<Receipt | null>(null);
  const [selAsset,   setSelAsset]   = useState<FixedAsset | null>(null);
  const [selChecked, setSelChecked] = useState<string[]>([]);

  const [showPayForm,  setShowPayForm]  = useState(false);
  const [showRcpForm,  setShowRcpForm]  = useState(false);
  const [showJnlForm,  setShowJnlForm]  = useState(false);
  const [showAstForm,  setShowAstForm]  = useState(false);
  const [editPay,      setEditPay]      = useState<Payment | null>(null);
  const [editRcp,      setEditRcp]      = useState<Receipt | null>(null);
  const [editAst,      setEditAst]      = useState<FixedAsset | null>(null);
  const [saving,       setSaving]       = useState(false);

  const [taskbarTime, setTaskbarTime] = useState(new Date());
  const [startOpen,   setStartOpen]   = useState(false);
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setInterval(() => setTaskbarTime(new Date()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!startOpen) return;
    const h = (e: MouseEvent) => { if (startRef.current && !startRef.current.contains(e.target as Node)) setStartOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [startOpen]);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [payR, rcpR, glR, budR, astR] = await Promise.allSettled([
        db.from("payment_vouchers").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("receipt_vouchers").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("gl_entries").select("*").order("created_at", { ascending: false }).limit(300),
        db.from("budgets").select("*").order("created_at", { ascending: false }).limit(100),
        db.from("fixed_assets").select("*").order("created_at", { ascending: false }).limit(200),
      ]);
      setPayments(payR.status === "fulfilled" ? payR.value.data ?? [] : []);
      setReceipts(rcpR.status === "fulfilled" ? rcpR.value.data ?? [] : []);
      setGlEntries(glR.status === "fulfilled" ? glR.value.data ?? [] : []);
      setBudgets(budR.status === "fulfilled" ? budR.value.data ?? [] : []);
      setAssets(astR.status === "fulfilled" ? astR.value.data ?? [] : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const ch = db.channel("fin_ws_v1")
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_vouchers" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "receipt_vouchers" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "gl_entries" }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const totalPaid     = payments.filter(v => ["paid","approved"].includes(v.status)).reduce((s, v) => s + (v.total_amount ?? 0), 0);
  const totalPending  = payments.filter(v => v.status === "pending").reduce((s, v) => s + (v.total_amount ?? 0), 0);
  const totalReceipts = receipts.filter(v => v.status !== "rejected").reduce((s, v) => s + (v.amount ?? 0), 0);
  const netBalance    = totalReceipts - totalPaid;
  const totalBudget   = budgets.reduce((s, b) => s + (b.total_budget ?? 0), 0);
  const totalSpent    = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const totalDr       = glEntries.reduce((s, g) => s + (g.debit ?? 0), 0);
  const totalCr       = glEntries.reduce((s, g) => s + (g.credit ?? 0), 0);
  const glBalanced    = Math.abs(totalDr - totalCr) < 1;

  // ── Filters ───────────────────────────────────────────────────────────────────
  const filtPay = payments.filter(v => {
    const q = search.toLowerCase();
    return (!search || [v.voucher_number, v.payee, v.description, v.gl_account].some(f => f?.toLowerCase().includes(q)))
      && (statusFilter === "ALL" || v.status === statusFilter.toLowerCase())
      && (!dateFrom || v.created_at >= dateFrom)
      && (!dateTo || v.created_at <= dateTo + "T23:59:59");
  });
  const filtRcp = receipts.filter(v => !search || [v.receipt_number, v.payer, v.description].some(f => f?.toLowerCase().includes(search.toLowerCase())));
  const filtGl  = glEntries.filter(v => !search || [v.reference, v.description, v.gl_account].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function updatePayStatus(id: string, status: string) {
    const { error } = await db.from("payment_vouchers").update({ status, approved_by: profile?.full_name ?? user?.email, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { toast({ title: `✓ Status → ${status}` }); fetchAll(); setSelPayment(null); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function updateRcpStatus(id: string, status: string) {
    const { error } = await db.from("receipt_vouchers").update({ status, approved_by: profile?.full_name ?? user?.email }).eq("id", id);
    if (!error) { toast({ title: `✓ Receipt status → ${status}` }); fetchAll(); setSelReceipt(null); }
    else toast({ title: "Error: " + error.message, variant: "destructive" });
  }

  async function savePayment(f: any) {
    if (!f.payee || !f.total_amount) { toast({ title: "Payee and amount required", variant: "destructive" }); return; }
    setSaving(true);
    if (editPay) {
      const { error } = await db.from("payment_vouchers").update({ payee: f.payee, total_amount: parseFloat(f.total_amount), payment_method: f.payment_method, gl_account: f.gl_account, vote_head: f.vote_head, description: f.description, po_reference: f.po_reference, invoice_reference: f.invoice_reference, bank_name: f.bank_name, payee_account: f.payee_account, due_date: f.due_date || null, currency: f.currency, updated_at: new Date().toISOString() }).eq("id", editPay.id);
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: "✓ Payment voucher updated" }); setEditPay(null); setShowPayForm(false);
    } else {
      const vNum = `PV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
      const { error } = await db.from("payment_vouchers").insert({ voucher_number: vNum, payee: f.payee, total_amount: parseFloat(f.total_amount), payment_method: f.payment_method, gl_account: f.gl_account, vote_head: f.vote_head, description: f.description, po_reference: f.po_reference, invoice_reference: f.invoice_reference, bank_name: f.bank_name, payee_account: f.payee_account, due_date: f.due_date || null, currency: f.currency, status: "draft" });
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: `✓ Voucher ${vNum} created` }); setShowPayForm(false);
    }
    fetchAll();
  }

  async function saveReceipt(f: any) {
    if (!f.payer || !f.amount) { toast({ title: "Payer and amount required", variant: "destructive" }); return; }
    setSaving(true);
    if (editRcp) {
      const { error } = await db.from("receipt_vouchers").update({ payer: f.payer, amount: parseFloat(f.amount), payment_method: f.payment_method, gl_account: f.gl_account, description: f.description, reference_number: f.reference_number, updated_at: new Date().toISOString() }).eq("id", editRcp.id);
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: "✓ Receipt updated" }); setEditRcp(null); setShowRcpForm(false);
    } else {
      const rNum = `RV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
      const { error } = await db.from("receipt_vouchers").insert({ receipt_number: rNum, payer: f.payer, amount: parseFloat(f.amount), payment_method: f.payment_method, gl_account: f.gl_account, description: f.description, reference_number: f.reference_number, status: "draft" });
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: `✓ Receipt ${rNum} created` }); setShowRcpForm(false);
    }
    fetchAll();
  }

  async function saveJournal(f: any) {
    if (!f.description) { toast({ title: "Description required", variant: "destructive" }); return; }
    setSaving(true);
    const ref = f.reference || `JV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const entries = [];
    if (f.debit) entries.push({ reference: ref, description: f.description, gl_account: f.gl_debit, debit: parseFloat(f.debit), credit: null, status: "posted" });
    if (f.credit) entries.push({ reference: ref, description: f.description, gl_account: f.gl_credit, debit: null, credit: parseFloat(f.credit), status: "posted" });
    for (const entry of entries) {
      const { error } = await db.from("gl_entries").insert(entry);
      if (error) { setSaving(false); toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
    }
    setSaving(false);
    toast({ title: `✓ Journal ${ref} posted (${entries.length} entries)` });
    setShowJnlForm(false); fetchAll();
  }

  async function saveAsset(f: any) {
    if (!f.asset_name) { toast({ title: "Asset name required", variant: "destructive" }); return; }
    setSaving(true);
    const cost = parseFloat(f.purchase_cost) || 0;
    const rate = parseFloat(f.depreciation_rate) || 0;
    const acq = f.acquisition_date ? new Date(f.acquisition_date) : null;
    const years = acq ? (Date.now() - acq.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
    const nbv = Math.max(0, cost - (cost * (rate / 100) * years));
    if (editAst) {
      const { error } = await db.from("fixed_assets").update({ asset_name: f.asset_name, asset_code: f.asset_code, category: f.category, purchase_cost: cost, current_value: parseFloat(nbv.toFixed(2)), depreciation_rate: rate, acquisition_date: f.acquisition_date || null, location: f.location, status: f.status }).eq("id", editAst.id);
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: "✓ Asset updated" }); setEditAst(null); setShowAstForm(false);
    } else {
      const { error } = await db.from("fixed_assets").insert({ asset_name: f.asset_name, asset_code: f.asset_code, category: f.category, purchase_cost: cost, current_value: parseFloat(nbv.toFixed(2)), depreciation_rate: rate, acquisition_date: f.acquisition_date || null, location: f.location, status: f.status });
      setSaving(false);
      if (error) { toast({ title: "Error: " + error.message, variant: "destructive" }); return; }
      toast({ title: "✓ Asset registered" }); setShowAstForm(false);
    }
    fetchAll();
  }

  async function bulkApprovePayments() {
    if (!selChecked.length) return;
    const approver = profile?.full_name ?? user?.email;
    for (const id of selChecked) await db.from("payment_vouchers").update({ status: "approved", approved_by: approver }).eq("id", id);
    toast({ title: `✓ ${selChecked.length} voucher(s) approved` }); setSelChecked([]); fetchAll();
  }

  async function deletePayment(id: string) {
    if (!window.confirm("Delete this voucher?")) return;
    await db.from("payment_vouchers").delete().eq("id", id);
    toast({ title: "✓ Voucher deleted" }); setSelPayment(null); fetchAll();
  }

  function exportCSV(data: any[], filename: string, headers: string[], getRow: (r: any) => string) {
    const rows = [headers.join(","), ...data.map(getRow)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url); toast({ title: `✓ Exported ${filename}` });
  }

  function printTable(title: string, headers: string[], rows: string[][]) {
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    const thead = headers.map(h => `<th>${h}</th>`).join("");
    const tbody = rows.map((r, i) => `<tr style="background:${i%2===0?"#fff":"#f5f4ea"}">${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Tahoma,Arial;font-size:10px;padding:20px}.hdr{background:linear-gradient(135deg,#1a3580,#2a5fc3);color:#fff;padding:10px 16px;margin:-20px -20px 14px;display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse}th{background:#dbd9c9;padding:4px 8px;border:1px solid #ccc;font-size:10px;text-align:left}td{padding:3px 8px;border:1px solid #ccc;font-size:10px}</style></head><body><div class="hdr"><strong>${title}</strong><span>${new Date().toLocaleDateString("en-KE")}</span></div><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  }

  // ── Tabs strip ────────────────────────────────────────────────────────────────
  const TABS: { id: FinTab; label: string; icon: string }[] = [
    { id: "overview",  label: "Overview",        icon: "🏠" },
    { id: "payments",  label: "Payment Vouchers",icon: "💳" },
    { id: "receipts",  label: "Receipt Vouchers",icon: "🧾" },
    { id: "journals",  label: "Journal Vouchers",icon: "📓" },
    { id: "budgets",   label: "Budget Control",  icon: "📊" },
    { id: "gl",        label: "GL Accounts",     icon: "📋" },
    { id: "assets",    label: "Fixed Assets",    icon: "🏗" },
    { id: "bank",      label: "Bank Reconcile",  icon: "🏦" },
    { id: "reports",   label: "Reports",         icon: "📈" },
  ];

  // ── Toolbar based on active tab ───────────────────────────────────────────────
  const toolbarContent = () => {
    if (tab === "payments") return (
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" as const }}>
        <XPButton onClick={() => { setEditPay(null); setShowPayForm(true); }} primary>+ New Voucher</XPButton>
        {selChecked.length > 0 && <><XPButton onClick={bulkApprovePayments} primary>✓ Approve ({selChecked.length})</XPButton><XPButton onClick={() => setSelChecked([])} small>Clear</XPButton></>}
        <XPButton onClick={() => exportCSV(filtPay, "payment_vouchers.csv", ["Voucher No","Payee","Amount","Method","Status","Date","Approved By"], r => `${r.voucher_number??""}, ${r.payee??""}, ${r.total_amount??0}, ${r.payment_method??""}, ${r.status}, ${fmtDate(r.created_at)}, ${r.approved_by??""}`)}>⬇ CSV</XPButton>
        <XPButton onClick={() => printTable("Payment Vouchers — EL5 MediProcure", ["Voucher No","Payee","Amount","Method","Status","Date"], filtPay.map(r => [r.voucher_number??"",r.payee??"",fmtFull(r.total_amount),r.payment_method??"",r.status,fmtDate(r.created_at)]))}>🖨 Print</XPButton>
        <div style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Filter records..." style={{ padding: "2px 6px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, width: 160 }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "2px 5px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font }}>
          {["ALL","DRAFT","PENDING","APPROVED","PAID","REJECTED"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    );
    if (tab === "receipts") return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <XPButton onClick={() => { setEditRcp(null); setShowRcpForm(true); }} primary>+ New Receipt</XPButton>
        <XPButton onClick={() => exportCSV(filtRcp, "receipt_vouchers.csv", ["Receipt No","Payer","Amount","Method","Status","Date"], r => `${r.receipt_number??""}, ${r.payer??""}, ${r.amount??0}, ${r.payment_method??""}, ${r.status}, ${fmtDate(r.created_at)}`)}>⬇ CSV</XPButton>
        <div style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Filter..." style={{ padding: "2px 6px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, width: 160 }} />
      </div>
    );
    if (tab === "journals") return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <XPButton onClick={() => setShowJnlForm(true)} primary>+ New Journal Entry</XPButton>
        <XPButton onClick={() => exportCSV(filtGl, "journal_entries.csv", ["Reference","Description","GL Account","Debit","Credit","Status","Date"], r => `${r.reference??""}, ${r.description??""}, ${r.gl_account??""}, ${r.debit??""}, ${r.credit??""}, ${r.status??""}, ${fmtDate(r.created_at)}`)}>⬇ CSV</XPButton>
        <div style={{ flex: 1 }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Filter..." style={{ padding: "2px 6px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 11, fontFamily: XP.font, width: 160 }} />
      </div>
    );
    if (tab === "assets") return (
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <XPButton onClick={() => { setEditAst(null); setShowAstForm(true); }} primary>+ Register Asset</XPButton>
        <XPButton onClick={() => exportCSV(assets, "fixed_assets.csv", ["Asset Name","Code","Category","Cost","NBV","Dep Rate","Location","Status"], r => `${r.asset_name??""}, ${r.asset_code??""}, ${r.category??""}, ${r.purchase_cost??0}, ${r.current_value??0}, ${r.depreciation_rate??0}%, ${r.location??""}, ${r.status??""}`)}>⬇ CSV</XPButton>
        <XPButton onClick={() => printTable("Fixed Assets Register — EL5 MediProcure", ["Asset Name","Code","Category","Cost","NBV","Dep Rate","Status"], assets.map(r => [r.asset_name??"",r.asset_code??"",r.category??"",fmtFull(r.purchase_cost),fmtFull(r.current_value),`${r.depreciation_rate??0}%`,r.status??""]))}>🖨 Print</XPButton>
      </div>
    );
    return <div style={{ flex: 1 }} />;
  };

  // ── Tab Panels ────────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div style={{ padding: 10, overflowY: "auto" as const, flex: 1 }}>
      {/* KPI Row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" as const }}>
        <KPICard icon="💳" label="Total Payments" value={fmtK(totalPaid)} sub={`${payments.filter(v=>["paid","approved"].includes(v.status)).length} vouchers`} accent="#155724" />
        <KPICard icon="🧾" label="Total Receipts" value={fmtK(totalReceipts)} sub={`${receipts.filter(v=>v.status!=="rejected").length} receipts`} accent="#004085" />
        <KPICard icon="⚖️" label="Net Balance" value={fmtK(netBalance)} sub="Receipts minus Payments" accent={netBalance >= 0 ? "#155724" : "#721c24"} />
        <KPICard icon="⏳" label="Pending Approvals" value={fmtK(totalPending)} sub={`${payments.filter(v=>v.status==="pending").length} pending`} accent="#856404" />
        <KPICard icon="📊" label="Budget Allocated" value={fmtK(totalBudget)} sub={`${budgets.length} budget lines`} />
        <KPICard icon="📋" label="GL Balance" value={glBalanced ? "✓ BALANCED" : "⚠ UNBALANCED"} sub={`Dr ${fmtK(totalDr)} / Cr ${fmtK(totalCr)}`} accent={glBalanced ? "#155724" : "#721c24"} />
      </div>
      {/* Budget Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ background: "linear-gradient(180deg,#f8f7ee,#ece9d8)", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: "8px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 11, fontFamily: XP.font, marginBottom: 8, borderBottom: `1px solid ${XP.btnBorder}`, paddingBottom: 4 }}>📊 Budget Utilisation</div>
          {budgets.length === 0
            ? <div style={{ fontSize: 11, color: "#888", fontFamily: XP.font }}>No budget lines configured</div>
            : budgets.slice(0, 6).map(b => <BudgetBar key={b.id} label={b.budget_name ?? "Budget"} total={b.total_budget ?? 0} spent={b.spent ?? 0} dept={b.department} />)
          }
        </div>
        <div style={{ background: "linear-gradient(180deg,#f8f7ee,#ece9d8)", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: "8px 12px" }}>
          <div style={{ fontWeight: 700, fontSize: 11, fontFamily: XP.font, marginBottom: 6, borderBottom: `1px solid ${XP.btnBorder}`, paddingBottom: 4 }}>💳 Recent Payments</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: XP.font, fontSize: 10 }}>
            <thead>
              <tr style={{ background: XP.gridHeader }}>
                {["Voucher No.","Payee","Amount","Status"].map(h => <th key={h} style={{ padding: "3px 6px", textAlign: "left", borderBottom: `1px solid ${XP.gridBorder}` }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {payments.slice(0, 8).map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? "#fff" : "#f5f4ea" }}>
                  <td style={{ padding: "2px 6px", color: "#00008b", fontWeight: 700, borderRight: `1px solid ${XP.gridBorder}` }}>{p.voucher_number ?? p.id.slice(-8)}</td>
                  <td style={{ padding: "2px 6px", borderRight: `1px solid ${XP.gridBorder}` }}>{p.payee ?? "—"}</td>
                  <td style={{ padding: "2px 6px", fontWeight: 700, borderRight: `1px solid ${XP.gridBorder}` }}>{fmtK(p.total_amount)}</td>
                  <td style={{ padding: "2px 6px" }}><StatusChip status={p.status} /></td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={4} style={{ padding: 12, textAlign: "center", color: "#888" }}>No payments yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPayments = () => (
    <div style={{ display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" }}>
      <XPGrid
        cols={[
          { key: "_chk", label: "", width: 28, render: (_: any, row: Payment) => <input type="checkbox" checked={selChecked.includes(row.id)} onClick={e => e.stopPropagation()} onChange={e => setSelChecked(s => e.target.checked ? [...s, row.id] : s.filter(x => x !== row.id))} /> },
          { key: "voucher_number", label: "Voucher No.", width: 148, render: (_: any, row: Payment) => <span style={{ color: "#00008b", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }} onClick={e => { e.stopPropagation(); setSelPayment(row); }}>{row.voucher_number ?? row.id.slice(-8)}</span> },
          { key: "payee", label: "Payee", width: 155 },
          { key: "payment_method", label: "Method", width: 80, render: (v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1).replace("_"," ") : "Cheque" },
          { key: "gl_account", label: "Expense Acct", width: 160, render: (v: string) => <span style={{ fontSize: 10, color: "#555" }}>{v ?? "—"}</span> },
          { key: "status", label: "Status", width: 70, render: (v: string) => <StatusChip status={v} /> },
          { key: "total_amount", label: "Amount", width: 100, render: (v: number) => <span style={{ fontWeight: 700 }}>{fmtK(v)}</span> },
          { key: "created_at", label: "Date", width: 78, render: (v: string) => <span style={{ color: "#555" }}>{fmtDate(v)}</span> },
          { key: "approved_by", label: "Approved By", width: 110, render: (v: string) => <span style={{ fontSize: 10, color: "#555" }}>{v ?? "—"}</span> },
          {
            key: "_act", label: "", width: 130,
            render: (_: any, row: Payment) => (
              <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                {row.status === "draft" && <XPButton onClick={() => updatePayStatus(row.id, "pending")} small primary>Submit</XPButton>}
                {row.status === "pending" && isManager && <><XPButton onClick={() => updatePayStatus(row.id, "approved")} small primary>✓</XPButton><XPButton onClick={() => updatePayStatus(row.id, "rejected")} small danger>✗</XPButton></>}
                {row.status === "approved" && <XPButton onClick={() => updatePayStatus(row.id, "paid")} small primary>💳 Paid</XPButton>}
                <XPButton onClick={() => { setEditPay(row); setShowPayForm(true); }} small title="Edit">✏️</XPButton>
                <XPButton onClick={() => deletePayment(row.id)} small danger title="Delete">🗑</XPButton>
              </div>
            )
          },
        ]}
        rows={filtPay}
        onRowClick={setSelPayment}
        selectedId={selPayment?.id}
        emptyMsg="No payment vouchers found"
      />
      {/* Detail side panel */}
      {selPayment && (
        <div style={{ position: "absolute" as const, right: 0, top: 0, bottom: 0, width: 270, background: XP.windowBg, borderLeft: `1px solid ${XP.gridBorder}`, display: "flex", flexDirection: "column" as const, zIndex: 10 }}>
          <div style={{ background: XP.sidebarBg, padding: "5px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#fff", fontWeight: 700, fontFamily: XP.font, fontSize: 11 }}>Voucher Details</span>
            <button onClick={() => setSelPayment(null)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" as const, padding: 8, fontFamily: XP.font, fontSize: 11 }}>
            {([["Voucher No.", selPayment.voucher_number ?? "—"],["Payee", selPayment.payee ?? "—"],["Amount", <span style={{ fontWeight: 800, color: "#155724", fontSize: 13 }}>{fmtFull(selPayment.total_amount)}</span>],["Method", selPayment.payment_method?.replace("_"," ") ?? "—"],["GL Account", selPayment.gl_account ?? "—"],["Vote Head", selPayment.vote_head ?? "—"],["PO Ref", selPayment.po_reference ?? "—"],["Invoice Ref", selPayment.invoice_reference ?? "—"],["Bank", `${selPayment.bank_name ?? ""} ${selPayment.payee_account ?? ""}`.trim() || "—"],["Due Date", fmtDate(selPayment.due_date)],["Status", <StatusChip status={selPayment.status} />],["Approved By", selPayment.approved_by ?? "—"],["Created", fmtDate(selPayment.created_at)]] as [string, React.ReactNode][]).map(([k,v]) => (
              <div key={k as string} style={{ display: "flex", gap: 6, padding: "3px 0", borderBottom: `1px solid ${XP.gridBorder}`, alignItems: "center" }}>
                <span style={{ color: "#555", width: 82, flexShrink: 0, fontSize: 10 }}>{k}</span>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{v}</span>
              </div>
            ))}
            {selPayment.description && <div style={{ marginTop: 6, padding: 6, background: "#fff", border: `1px solid ${XP.gridBorder}`, fontSize: 10 }}><div style={{ color: "#555", marginBottom: 2 }}>Description</div>{selPayment.description}</div>}
          </div>
          <div style={{ padding: 8, borderTop: `1px solid ${XP.gridBorder}`, display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
            {selPayment.status === "pending" && isManager && <><XPButton onClick={() => updatePayStatus(selPayment.id,"approved")} small primary>✓ Approve</XPButton><XPButton onClick={() => updatePayStatus(selPayment.id,"rejected")} small danger>✗ Reject</XPButton></>}
            {selPayment.status === "approved" && <XPButton onClick={() => updatePayStatus(selPayment.id,"paid")} small primary>💳 Paid</XPButton>}
            <XPButton onClick={() => { setEditPay(selPayment); setShowPayForm(true); }} small>✏️ Edit</XPButton>
            <XPButton onClick={() => setSelPayment(null)} small>Close</XPButton>
          </div>
        </div>
      )}
    </div>
  );

  const renderReceipts = () => (
    <div style={{ display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" }}>
      <XPGrid
        cols={[
          { key: "receipt_number", label: "Receipt No.", width: 148, render: (v: string, row: Receipt) => <span style={{ color: "#00008b", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }} onClick={e => { e.stopPropagation(); setSelReceipt(row); }}>{v ?? row.id.slice(-8)}</span> },
          { key: "payer", label: "Payer / Source", width: 155 },
          { key: "payment_method", label: "Method", width: 80, render: (v: string) => v ? v.charAt(0).toUpperCase() + v.slice(1).replace("_"," ") : "Cash" },
          { key: "gl_account", label: "GL Account", width: 160, render: (v: string) => <span style={{ fontSize: 10, color: "#555" }}>{v ?? "—"}</span> },
          { key: "status", label: "Status", width: 70, render: (v: string) => <StatusChip status={v} /> },
          { key: "amount", label: "Amount", width: 100, render: (v: number) => <span style={{ fontWeight: 700, color: "#155724" }}>{fmtK(v)}</span> },
          { key: "created_at", label: "Date", width: 78, render: (v: string) => fmtDate(v) },
          { key: "approved_by", label: "Approved By", width: 110, render: (v: string) => <span style={{ fontSize: 10, color: "#555" }}>{v ?? "—"}</span> },
          {
            key: "_act", label: "", width: 115,
            render: (_: any, row: Receipt) => (
              <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                {row.status === "draft" && <XPButton onClick={() => updateRcpStatus(row.id, "pending")} small primary>Submit</XPButton>}
                {row.status === "pending" && isManager && <><XPButton onClick={() => updateRcpStatus(row.id, "received")} small primary>✓</XPButton><XPButton onClick={() => updateRcpStatus(row.id, "rejected")} small danger>✗</XPButton></>}
                <XPButton onClick={() => { setEditRcp(row); setShowRcpForm(true); }} small>✏️</XPButton>
              </div>
            )
          },
        ]}
        rows={filtRcp}
        onRowClick={setSelReceipt}
        selectedId={selReceipt?.id}
        emptyMsg="No receipt vouchers found"
      />
    </div>
  );

  const renderJournals = () => {
    const drTotal = filtGl.reduce((s, g) => s + (g.debit ?? 0), 0);
    const crTotal = filtGl.reduce((s, g) => s + (g.credit ?? 0), 0);
    const balanced = Math.abs(drTotal - crTotal) < 1;
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" }}>
        <div style={{ padding: "5px 8px", background: balanced ? "#d4edda" : "#fff3cd", borderBottom: `1px solid ${XP.gridBorder}`, display: "flex", gap: 12, alignItems: "center", fontFamily: XP.font, fontSize: 11 }}>
          <span style={{ fontWeight: 700, color: balanced ? "#155724" : "#856404" }}>{balanced ? "✓ GL is BALANCED" : "⚠ GL is UNBALANCED"}</span>
          <span>Total Dr: <strong>{fmtFull(drTotal)}</strong></span>
          <span>Total Cr: <strong>{fmtFull(crTotal)}</strong></span>
          {!balanced && <span style={{ color: "#721c24", fontWeight: 700 }}>Difference: {fmtFull(Math.abs(drTotal - crTotal))}</span>}
          <span style={{ marginLeft: "auto", color: "#666" }}>{filtGl.length} entries</span>
        </div>
        <XPGrid
          cols={[
            { key: "reference", label: "Reference", width: 130, render: (v: string, row: GLEntry) => <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#00008b" }}>{v ?? "JV-"+row.id.slice(-6)}</span> },
            { key: "description", label: "Description" },
            { key: "gl_account", label: "GL Account", width: 155, render: (v: string) => <span style={{ fontSize: 10 }}>{v ?? "—"}</span> },
            { key: "debit", label: "Debit", width: 105, render: (v: number) => <span style={{ fontWeight: 700, color: v ? "#155724" : "#888" }}>{v ? fmtK(v) : "—"}</span> },
            { key: "credit", label: "Credit", width: 105, render: (v: number) => <span style={{ fontWeight: 700, color: v ? "#004085" : "#888" }}>{v ? fmtK(v) : "—"}</span> },
            { key: "status", label: "Status", width: 70, render: (v: string) => <StatusChip status={v ?? "posted"} /> },
            { key: "created_at", label: "Date", width: 80, render: (v: string) => fmtDate(v) },
          ]}
          rows={filtGl}
          emptyMsg="No journal entries found"
        />
      </div>
    );
  };

  const renderBudgets = () => (
    <div style={{ display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "5px 8px", background: "#f5f4ea", borderBottom: `1px solid ${XP.gridBorder}`, display: "flex", gap: 12, fontFamily: XP.font, fontSize: 11 }}>
        <span>Total Allocated: <strong style={{ color: "#00008b" }}>{fmtFull(totalBudget)}</strong></span>
        <span>Total Spent: <strong style={{ color: totalSpent/totalBudget > 0.9 ? "#dc3545" : "#155724" }}>{fmtFull(totalSpent)}</strong></span>
        <span>Remaining: <strong>{fmtFull(totalBudget - totalSpent)}</strong></span>
        <span style={{ marginLeft: "auto", color: "#666" }}>{budgets.length} lines</span>
      </div>
      <XPGrid
        cols={[
          { key: "budget_name", label: "Budget Name" },
          { key: "fiscal_year", label: "FY", width: 55 },
          { key: "department", label: "Department", width: 130 },
          { key: "total_budget", label: "Total Budget", width: 115, render: (v: number) => <span style={{ fontWeight: 700 }}>{fmtK(v)}</span> },
          { key: "spent", label: "Spent", width: 100, render: (v: number) => <span style={{ fontWeight: 700, color: "#721c24" }}>{fmtK(v)}</span> },
          { key: "remaining", label: "Remaining", width: 105, render: (v: number) => <span style={{ fontWeight: 700, color: "#155724" }}>{fmtK(v)}</span> },
          {
            key: "_util", label: "Utilisation", width: 130,
            render: (_: any, row: Budget) => {
              const pct = row.total_budget ? Math.min(((row.spent ?? 0) / row.total_budget) * 100, 100) : 0;
              const col = pct >= 90 ? "#dc3545" : pct >= 70 ? "#fd7e14" : "#28a745";
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ flex: 1, height: 8, background: "#ccc", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: col }} />
                  </div>
                  <span style={{ fontSize: 10, color: col, fontWeight: 700, minWidth: 34 }}>{pct.toFixed(0)}%</span>
                </div>
              );
            }
          },
          { key: "status", label: "Status", width: 75, render: (v: string) => <StatusChip status={v ?? "active"} /> },
        ]}
        rows={budgets}
        emptyMsg="No budget lines found"
      />
    </div>
  );

  const renderGL = () => {
    // Trial balance by COA
    const balMap: Record<string, { dr: number; cr: number }> = {};
    glEntries.forEach(g => {
      const key = g.gl_account ?? "Unknown";
      if (!balMap[key]) balMap[key] = { dr: 0, cr: 0 };
      balMap[key].dr += g.debit ?? 0;
      balMap[key].cr += g.credit ?? 0;
    });
    const trialRows = Object.entries(balMap).map(([acct, b]) => ({ id: acct, account: acct, dr: b.dr, cr: b.cr, balance: b.dr - b.cr }));
    const trDr = trialRows.reduce((s, r) => s + r.dr, 0);
    const trCr = trialRows.reduce((s, r) => s + r.cr, 0);
    return (
      <div style={{ display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" }}>
        <div style={{ padding: "5px 8px", background: Math.abs(trDr - trCr) < 1 ? "#d4edda" : "#fff3cd", borderBottom: `1px solid ${XP.gridBorder}`, display: "flex", gap: 12, fontFamily: XP.font, fontSize: 11 }}>
          <span style={{ fontWeight: 700 }}>Trial Balance</span>
          <span>Total Dr: <strong>{fmtFull(trDr)}</strong></span>
          <span>Total Cr: <strong>{fmtFull(trCr)}</strong></span>
          <span style={{ fontWeight: 700, color: Math.abs(trDr - trCr) < 1 ? "#155724" : "#721c24" }}>{Math.abs(trDr - trCr) < 1 ? "✓ BALANCED" : `⚠ Diff: ${fmtFull(Math.abs(trDr - trCr))}`}</span>
        </div>
        <XPGrid
          cols={[
            { key: "account", label: "GL Account" },
            { key: "dr", label: "Total Debit", width: 130, render: (v: number) => <span style={{ fontWeight: 700, color: "#155724" }}>{fmtK(v)}</span> },
            { key: "cr", label: "Total Credit", width: 130, render: (v: number) => <span style={{ fontWeight: 700, color: "#004085" }}>{fmtK(v)}</span> },
            { key: "balance", label: "Net Balance", width: 130, render: (v: number) => <span style={{ fontWeight: 700, color: v >= 0 ? "#155724" : "#721c24" }}>{v >= 0 ? "" : "-"}{fmtK(Math.abs(v))}</span> },
            { key: "_type", label: "Type", width: 70, render: (_: any, row: any) => { const a = COA.find(c => row.account?.includes(c.code)); return <span style={{ fontSize: 10, color: "#555", textTransform: "uppercase" as const }}>{a?.type ?? "—"}</span>; } },
          ]}
          rows={trialRows}
          emptyMsg="No GL entries — post journal entries to see the trial balance"
        />
      </div>
    );
  };

  const renderAssets = () => (
    <div style={{ display: "flex", flexDirection: "column" as const, flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "5px 8px", background: "#f5f4ea", borderBottom: `1px solid ${XP.gridBorder}`, display: "flex", gap: 12, fontFamily: XP.font, fontSize: 11 }}>
        <span>Total Cost: <strong>{fmtFull(assets.reduce((s,a)=>s+(a.purchase_cost??0),0))}</strong></span>
        <span>Total NBV: <strong style={{ color: "#00008b" }}>{fmtFull(assets.reduce((s,a)=>s+(a.current_value??0),0))}</strong></span>
        <span>Accumulated Dep: <strong style={{ color: "#721c24" }}>{fmtFull(assets.reduce((s,a)=>s+((a.purchase_cost??0)-(a.current_value??0)),0))}</strong></span>
        <span style={{ marginLeft: "auto", color: "#666" }}>{assets.length} assets</span>
      </div>
      <XPGrid
        cols={[
          { key: "asset_name", label: "Asset Name" },
          { key: "asset_code", label: "Code", width: 100 },
          { key: "category", label: "Category", width: 140 },
          { key: "purchase_cost", label: "Cost", width: 105, render: (v: number) => <span style={{ fontWeight: 700 }}>{fmtK(v)}</span> },
          { key: "current_value", label: "NBV", width: 105, render: (v: number) => <span style={{ fontWeight: 700, color: "#00008b" }}>{fmtK(v)}</span> },
          { key: "depreciation_rate", label: "Dep Rate", width: 75, render: (v: number) => <span style={{ fontSize: 10 }}>{v ?? 0}%/yr</span> },
          { key: "location", label: "Location", width: 110 },
          { key: "acquisition_date", label: "Acquired", width: 80, render: (v: string) => fmtDate(v) },
          { key: "status", label: "Status", width: 70, render: (v: string) => <StatusChip status={v ?? "active"} /> },
          {
            key: "_act", label: "", width: 70,
            render: (_: any, row: FixedAsset) => (
              <div style={{ display: "flex", gap: 2 }} onClick={e => e.stopPropagation()}>
                <XPButton onClick={() => { setEditAst(row); setShowAstForm(true); }} small>✏️</XPButton>
              </div>
            )
          },
        ]}
        rows={assets}
        emptyMsg="No fixed assets registered"
      />
    </div>
  );

  const renderBank = () => {
    const bankEntries = glEntries.filter(g => g.gl_account?.includes("1010") || g.gl_account?.includes("1011") || g.gl_account?.includes("1001"));
    const bankDr = bankEntries.reduce((s, g) => s + (g.debit ?? 0), 0);
    const bankCr = bankEntries.reduce((s, g) => s + (g.credit ?? 0), 0);
    const netBal = bankDr - bankCr;
    const paidVouchers = payments.filter(v => v.status === "paid");
    const totalOut = paidVouchers.reduce((s, v) => s + (v.total_amount ?? 0), 0);
    const rcpIn = receipts.filter(v => v.status === "received").reduce((s, v) => s + (v.amount ?? 0), 0);
    return (
      <div style={{ padding: 10, overflowY: "auto" as const, flex: 1 }}>
        {/* Summary cards */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <KPICard icon="⬇️" label="Total Credits (In)" value={fmtK(bankDr + rcpIn)} sub="GL debits + receipts" accent="#155724" />
          <KPICard icon="⬆️" label="Total Debits (Out)" value={fmtK(bankCr + totalOut)} sub="GL credits + payments" accent="#721c24" />
          <KPICard icon="⚖️" label="Net Bank Balance" value={fmtK(netBal + rcpIn - totalOut)} accent={netBal + rcpIn - totalOut >= 0 ? "#155724" : "#721c24"} />
          <KPICard icon="📄" label="Unreconciled" value={`${glEntries.filter(g=>!g.status?.includes("reconciled")).length}`} sub="GL entries pending" accent="#856404" />
        </div>
        {/* Bank ledger */}
        <div style={{ background: "linear-gradient(180deg,#f8f7ee,#ece9d8)", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: "8px 12px", marginBottom: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 11, fontFamily: XP.font, marginBottom: 6 }}>🏦 Bank Account Transactions (from GL)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: XP.font, fontSize: 11 }}>
            <thead><tr style={{ background: XP.gridHeader }}>{["Date","Reference","Description","GL Account","Dr (In)","Cr (Out)"].map(h => <th key={h} style={{ padding: "3px 7px", borderBottom: `2px solid ${XP.gridBorder}`, textAlign: "left" }}>{h}</th>)}</tr></thead>
            <tbody>
              {bankEntries.slice(0, 15).map((g, i) => (
                <tr key={g.id} style={{ background: i % 2 === 0 ? "#fff" : "#f5f4ea" }}>
                  <td style={{ padding: "3px 7px", borderRight: `1px solid ${XP.gridBorder}` }}>{fmtDate(g.created_at)}</td>
                  <td style={{ padding: "3px 7px", fontFamily: "monospace", fontWeight: 700, color: "#00008b", borderRight: `1px solid ${XP.gridBorder}` }}>{g.reference ?? "—"}</td>
                  <td style={{ padding: "3px 7px", borderRight: `1px solid ${XP.gridBorder}` }}>{g.description ?? "—"}</td>
                  <td style={{ padding: "3px 7px", fontSize: 10, color: "#555", borderRight: `1px solid ${XP.gridBorder}` }}>{g.gl_account ?? "—"}</td>
                  <td style={{ padding: "3px 7px", fontWeight: 700, color: "#155724", borderRight: `1px solid ${XP.gridBorder}` }}>{g.debit ? fmtK(g.debit) : "—"}</td>
                  <td style={{ padding: "3px 7px", fontWeight: 700, color: "#721c24" }}>{g.credit ? fmtK(g.credit) : "—"}</td>
                </tr>
              ))}
              {bankEntries.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "#888" }}>No bank account GL entries found — post journal entries for accounts 1001, 1010, 1011</td></tr>}
            </tbody>
          </table>
        </div>
        {/* Reconciliation summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#f8f7ee", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: 10, fontFamily: XP.font, fontSize: 11 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>💳 Payment Vouchers Reconciliation</div>
            {[["Total Vouchers", payments.length],["Paid / Cleared", payments.filter(v=>v.status==="paid").length],["Pending Approval", payments.filter(v=>v.status==="pending").length],["Draft", payments.filter(v=>v.status==="draft").length]].map(([k,v]) => (
              <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${XP.gridBorder}` }}>
                <span style={{ color: "#555" }}>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
          <div style={{ background: "#f8f7ee", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: 10, fontFamily: XP.font, fontSize: 11 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>🧾 Receipt Vouchers Reconciliation</div>
            {[["Total Receipts", receipts.length],["Received / Cleared", receipts.filter(v=>v.status==="received").length],["Pending", receipts.filter(v=>v.status==="pending").length],["Total Value", fmtK(rcpIn)]].map(([k,v]) => (
              <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: `1px solid ${XP.gridBorder}` }}>
                <span style={{ color: "#555" }}>{k}</span><strong>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderReports = () => {
    // Income statement
    const incomeAccts = glEntries.filter(g => g.gl_account?.match(/^3[0-9]{3}/)).reduce((acc, g) => { const key = g.gl_account!; acc[key] = (acc[key] || 0) + (g.credit ?? 0) - (g.debit ?? 0); return acc; }, {} as Record<string, number>);
    const expenseAccts = glEntries.filter(g => g.gl_account?.match(/^4[0-9]{3}/)).reduce((acc, g) => { const key = g.gl_account!; acc[key] = (acc[key] || 0) + (g.debit ?? 0) - (g.credit ?? 0); return acc; }, {} as Record<string, number>);
    const totalIncome = Object.values(incomeAccts).reduce((s, v) => s + v, 0);
    const totalExpense = Object.values(expenseAccts).reduce((s, v) => s + v, 0);
    const netIncome = totalIncome - totalExpense;
    // Voucher status matrix
    const statusMatrix = ["draft","pending","approved","paid","rejected"].map(st => ({
      status: st, count: payments.filter(v => v.status === st).length, amount: payments.filter(v => v.status === st).reduce((s, v) => s + (v.total_amount ?? 0), 0)
    }));
    return (
      <div style={{ padding: 10, overflowY: "auto" as const, flex: 1 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <XPButton primary onClick={() => printTable("Income Statement — EL5 MediProcure", ["Account","Amount (KES)"], [...Object.entries(incomeAccts).map(([k,v])=>[k,fmtFull(v)]),["TOTAL INCOME",fmtFull(totalIncome)],["",""],["TOTAL EXPENSES",fmtFull(totalExpense)],["NET INCOME / (LOSS)",fmtFull(netIncome)]]) }>🖨 Print Income Statement</XPButton>
          <XPButton onClick={() => exportCSV(payments, "voucher_status_report.csv", ["Status","Count","Total Amount"], r => r)} warning>⬇ Export Voucher Report</XPButton>
          <XPButton onClick={() => printTable("Budget Performance — EL5 MediProcure", ["Budget","FY","Dept","Allocated","Spent","Remaining","Util %"], budgets.map(b=>[b.budget_name??"",b.fiscal_year??"",b.department??"",fmtFull(b.total_budget),fmtFull(b.spent),fmtFull(b.remaining),`${b.total_budget?((b.spent??0)/b.total_budget*100).toFixed(1):0}%`]))}>🖨 Budget Performance</XPButton>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Income Statement */}
          <div style={{ background: "#f8f7ee", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: 10, fontFamily: XP.font, fontSize: 11 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, borderBottom: `1px solid ${XP.btnBorder}`, paddingBottom: 4 }}>📈 Income Statement</div>
            <div style={{ fontWeight: 700, color: "#155724", marginBottom: 4 }}>INCOME</div>
            {Object.entries(incomeAccts).length === 0
              ? <div style={{ color: "#888", padding: "4px 0" }}>No income entries posted</div>
              : Object.entries(incomeAccts).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: `1px dotted ${XP.gridBorder}` }}><span style={{ color: "#555" }}>{k}</span><strong>{fmtFull(v)}</strong></div>)
            }
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, borderTop: `2px solid ${XP.btnBorder}`, paddingTop: 4, fontWeight: 900 }}>
              <span>Total Income</span><span style={{ color: "#155724" }}>{fmtFull(totalIncome)}</span>
            </div>
            <div style={{ fontWeight: 700, color: "#721c24", margin: "8px 0 4px" }}>EXPENSES</div>
            {Object.entries(expenseAccts).length === 0
              ? <div style={{ color: "#888", padding: "4px 0" }}>No expense entries posted</div>
              : Object.entries(expenseAccts).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: `1px dotted ${XP.gridBorder}` }}><span style={{ color: "#555" }}>{k}</span><strong>{fmtFull(v)}</strong></div>)
            }
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, borderTop: `2px solid ${XP.btnBorder}`, paddingTop: 4, fontWeight: 900 }}>
              <span>Total Expenses</span><span style={{ color: "#721c24" }}>{fmtFull(totalExpense)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "6px 8px", background: netIncome >= 0 ? "#d4edda" : "#f8d7da", border: `1px solid ${netIncome >= 0 ? "#c3e6cb" : "#f5c6cb"}`, borderRadius: 3, fontWeight: 900, fontSize: 12 }}>
              <span>NET {netIncome >= 0 ? "SURPLUS" : "DEFICIT"}</span>
              <span style={{ color: netIncome >= 0 ? "#155724" : "#721c24" }}>{fmtFull(Math.abs(netIncome))}</span>
            </div>
          </div>
          {/* Voucher Status Matrix */}
          <div style={{ background: "#f8f7ee", border: `1px solid ${XP.btnBorder}`, borderRadius: 3, padding: 10, fontFamily: XP.font, fontSize: 11 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8, borderBottom: `1px solid ${XP.btnBorder}`, paddingBottom: 4 }}>📋 Voucher Status Matrix</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: XP.gridHeader }}>{["Status","Count","Total Amount","Share"].map(h => <th key={h} style={{ padding: "4px 7px", borderBottom: `2px solid ${XP.gridBorder}`, textAlign: "left" }}>{h}</th>)}</tr></thead>
              <tbody>
                {statusMatrix.map((row, i) => {
                  const pct = payments.length > 0 ? (row.count / payments.length * 100) : 0;
                  return (
                    <tr key={row.status} style={{ background: i % 2 === 0 ? "#fff" : "#f5f4ea" }}>
                      <td style={{ padding: "4px 7px", borderRight: `1px solid ${XP.gridBorder}` }}><StatusChip status={row.status} /></td>
                      <td style={{ padding: "4px 7px", fontWeight: 700, borderRight: `1px solid ${XP.gridBorder}` }}>{row.count}</td>
                      <td style={{ padding: "4px 7px", fontWeight: 700, borderRight: `1px solid ${XP.gridBorder}` }}>{fmtK(row.amount)}</td>
                      <td style={{ padding: "4px 7px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <div style={{ width: 60, height: 8, background: "#ccc", borderRadius: 2 }}><div style={{ width: `${pct}%`, height: "100%", background: "#316ac5" }} /></div>
                          <span style={{ fontSize: 10 }}>{pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: 12, fontWeight: 700, fontSize: 12, borderTop: `1px solid ${XP.btnBorder}`, paddingTop: 8 }}>📊 Budget Performance</div>
            {budgets.slice(0, 5).map(b => <BudgetBar key={b.id} label={b.budget_name ?? "Budget"} total={b.total_budget ?? 0} spent={b.spent ?? 0} dept={b.fiscal_year} />)}
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "calc(100vh - 48px)", background: "linear-gradient(160deg,#235bab 0%,#1a4a95 40%,#0e3880 100%)", fontFamily: XP.font }}>
      {/* Window */}
      <div style={{ flex: 1, margin: 6, display: "flex", flexDirection: "column" as const, background: XP.windowBg, border: "2px solid #0054e3", borderRadius: 6, boxShadow: "4px 4px 14px rgba(0,0,0,0.5)", overflow: "hidden", minHeight: 0 }}>
        {/* Title bar */}
        <div style={{ background: XP.titleActive, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 6px", userSelect: "none" as const, borderBottom: "1px solid rgba(0,0,0,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 14 }}>💰</span>
            <span style={{ color: "#fff", fontSize: 11, fontWeight: 700, textShadow: "1px 1px 2px rgba(0,0,0,0.6)" }}>EL5 MediProcure — Financial Management System [Finance Workspace]</span>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            <button onClick={() => navigate("/dashboard")} title="Minimize" style={{ width: 21, height: 21, background: "linear-gradient(180deg,#f0a830,#d07000)", border: "1px solid #8a4800", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 900 }}>–</button>
            <button title="Maximize" style={{ width: 21, height: 21, background: "linear-gradient(180deg,#60d060,#289028)", border: "1px solid #187018", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 10, fontWeight: 900 }}>□</button>
            <button onClick={() => navigate("/dashboard")} title="Close" style={{ width: 21, height: 21, background: "linear-gradient(180deg,#e85040,#b01818)", border: "1px solid #701010", borderRadius: 3, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 900 }}>✕</button>
          </div>
        </div>

        {/* Menu bar */}
        <div style={{ background: XP.windowBg, borderBottom: `1px solid ${XP.btnBorder}`, display: "flex", alignItems: "center", gap: 0, padding: "1px 4px" }}>
          <XPDropdownMenu label="File" actions={[
            { label: "New Payment Voucher", icon: "💳", onClick: () => { setTab("payments"); setShowPayForm(true); } },
            { label: "New Receipt Voucher", icon: "🧾", onClick: () => { setTab("receipts"); setShowRcpForm(true); } },
            { label: "New Journal Entry", icon: "📓", onClick: () => { setTab("journals"); setShowJnlForm(true); } },
            { label: "Register Asset", icon: "🏗", onClick: () => { setTab("assets"); setShowAstForm(true); } },
            { divider: true, label: "", onClick: () => {} },
            { label: "Exit to Dashboard", icon: "🏠", onClick: () => navigate("/dashboard") },
          ]} />
          <XPDropdownMenu label="View" actions={[
            { label: "Refresh All", icon: "🔄", onClick: fetchAll },
            { divider: true, label: "", onClick: () => {} },
            ...TABS.map(t => ({ label: `${t.icon} ${t.label}`, onClick: () => setTab(t.id) })),
          ]} />
          <XPDropdownMenu label="Reports" actions={[
            { label: "Income Statement", icon: "📈", onClick: () => setTab("reports") },
            { label: "Trial Balance", icon: "📋", onClick: () => setTab("gl") },
            { label: "Budget Performance", icon: "📊", onClick: () => setTab("budgets") },
            { label: "Voucher Status Matrix", icon: "📉", onClick: () => setTab("reports") },
          ]} />
          <XPDropdownMenu label="Tools" actions={[
            { label: "Export Payments CSV", icon: "⬇", onClick: () => exportCSV(payments, "payments.csv", ["VoucherNo","Payee","Amount","Method","Status","Date","ApprovedBy"], r => `${r.voucher_number??""}, ${r.payee??""}, ${r.total_amount??0}, ${r.payment_method??""}, ${r.status}, ${fmtDate(r.created_at)}, ${r.approved_by??""}`) },
            { label: "Export Journals CSV", icon: "⬇", onClick: () => exportCSV(glEntries, "journals.csv", ["Reference","Description","Account","Debit","Credit","Status"], r => `${r.reference??""}, ${r.description??""}, ${r.gl_account??""}, ${r.debit??""}, ${r.credit??""}, ${r.status??""}`) },
            { label: "Export Assets CSV", icon: "⬇", onClick: () => exportCSV(assets, "assets.csv", ["Name","Code","Category","Cost","NBV","DepRate","Status"], r => `${r.asset_name??""}, ${r.asset_code??""}, ${r.category??""}, ${r.purchase_cost??0}, ${r.current_value??0}, ${r.depreciation_rate??0}%, ${r.status??""}`) },
          ]} />
          <XPDropdownMenu label="Help" actions={[
            { label: "Finance Workspace v1.0", icon: "ℹ️", onClick: () => toast({ title: "EL5 MediProcure — Finance Workspace v1.0" }) },
            { label: "About EL5 MediProcure", icon: "🏥", onClick: () => toast({ title: "Embu Level 5 Hospital · EL5 MediProcure" }) },
          ]} />
        </div>

        {/* KPI summary strip */}
        <div style={{ background: "linear-gradient(180deg,#f5f4ea,#e8e5d8)", borderBottom: `2px solid ${XP.btnBorder}`, display: "flex", gap: 20, padding: "5px 12px", alignItems: "center", flexShrink: 0 }}>
          {[
            { label: "TOTAL PAYMENTS", val: fmtK(totalPaid), col: "#721c24" },
            { label: "TOTAL RECEIPTS", val: fmtK(totalReceipts), col: "#155724" },
            { label: "NET BALANCE", val: fmtK(netBalance), col: netBalance >= 0 ? "#155724" : "#721c24" },
            { label: "RECORD COUNT", val: `${payments.length + receipts.length + glEntries.length}` },
            { label: "BUDGET ALLOC.", val: fmtK(totalBudget), col: "#004085" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-start", minWidth: 100 }}>
              <span style={{ color: item.col ?? "#1a1a1a", fontSize: 16, fontWeight: 900 }}>{item.val}</span>
              <span style={{ fontSize: 9, color: "#666", fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{item.label}</span>
            </div>
          ))}
          <div style={{ marginLeft: "auto" }}>
            {loading && <span style={{ fontSize: 11, color: "#316ac5" }}>⏳ Loading…</span>}
          </div>
        </div>

        {/* Tab strip + toolbar */}
        <div style={{ background: "linear-gradient(180deg,#d0cdc0,#bab7a8)", borderBottom: `1px solid ${XP.btnBorder}`, display: "flex", flexDirection: "column" as const, flexShrink: 0 }}>
          {/* Tab buttons */}
          <div style={{ display: "flex", padding: "4px 4px 0", gap: 2, overflowX: "auto" as const }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setStatusFilter("ALL"); }}
                style={{
                  padding: "5px 12px", fontFamily: XP.font, fontSize: 11, cursor: "pointer",
                  border: `1px solid ${XP.btnBorder}`,
                  borderBottom: tab === t.id ? "none" : `1px solid ${XP.btnBorder}`,
                  background: tab === t.id ? XP.windowBg : "linear-gradient(180deg,#d0cdc0,#c0bca8)",
                  color: tab === t.id ? "#00008b" : "#1a1a1a",
                  fontWeight: tab === t.id ? 700 : 400,
                  borderRadius: "3px 3px 0 0",
                  marginBottom: tab === t.id ? -1 : 0,
                  zIndex: tab === t.id ? 1 : 0,
                  whiteSpace: "nowrap" as const,
                  boxShadow: tab === t.id ? "none" : "inset 0 -2px 4px rgba(0,0,0,0.05)",
                }}
              >{t.icon} {t.label}</button>
            ))}
          </div>
          {/* Toolbar */}
          <div style={{ background: XP.windowBg, borderTop: `1px solid ${XP.btnBorder}`, padding: "4px 8px", display: "flex", gap: 4, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 2, alignItems: "center", borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8, marginRight: 4 }}>
              <XPButton onClick={() => { setDateFrom("2025-01-01"); setDateTo(new Date().toISOString().split("T")[0]); fetchAll(); }} small title="Refresh">↻ Refresh</XPButton>
            </div>
            {/* Date pickers */}
            <label style={{ fontSize: 10, color: "#555" }}>Date:</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "1px 4px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 10, fontFamily: XP.font }} />
            <label style={{ fontSize: 10, color: "#555" }}>to</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "1px 4px", border: `1px solid ${XP.btnBorder}`, borderRadius: 2, fontSize: 10, fontFamily: XP.font }} />
            <div style={{ flex: 1 }} />
            {toolbarContent()}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" as const, position: "relative" as const }}>
          {tab === "overview"  && renderOverview()}
          {tab === "payments"  && renderPayments()}
          {tab === "receipts"  && renderReceipts()}
          {tab === "journals"  && renderJournals()}
          {tab === "budgets"   && renderBudgets()}
          {tab === "gl"        && renderGL()}
          {tab === "assets"    && renderAssets()}
          {tab === "bank"      && renderBank()}
          {tab === "reports"   && renderReports()}
        </div>

        {/* Status bar */}
        <div style={{ background: XP.statusBg, borderTop: `1px solid ${XP.btnBorder}`, display: "flex", gap: 10, padding: "2px 8px", fontSize: 10, fontFamily: XP.font, color: "#555", flexShrink: 0 }}>
          <span style={{ borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8 }}>👤 {profile?.full_name ?? user?.email}</span>
          <span style={{ borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8 }}>🔐 Role: {roles.join(", ")}</span>
          <span style={{ borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8 }}>💳 {payments.length} Payments</span>
          <span style={{ borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8 }}>🧾 {receipts.length} Receipts</span>
          <span style={{ borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8 }}>📓 {glEntries.length} GL Entries</span>
          <span style={{ borderRight: `1px solid ${XP.btnBorder}`, paddingRight: 8 }}>🏗 {assets.length} Assets</span>
          <span style={{ marginLeft: "auto" }}>EL5 MediProcure Finance v1.0</span>
        </div>
      </div>

      {/* XP Taskbar */}
      <div style={{ background: XP.taskbar, height: 36, display: "flex", alignItems: "center", padding: "0 4px", flexShrink: 0, gap: 3 }} ref={startRef}>
        <button onClick={() => setStartOpen(o => !o)} style={{ background: startOpen ? "linear-gradient(180deg,#3ea03d,#237022)" : "linear-gradient(180deg,#5cb85c,#3d9b3d)", border: "1px solid #1a7a1a", borderRadius: 3, color: "#fff", padding: "3px 12px 3px 8px", fontSize: 13, fontWeight: 900, fontFamily: XP.font, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, height: 28 }}>
          <span>⊞</span> start
        </button>
        {startOpen && (
          <div style={{ position: "absolute" as const, bottom: 36, left: 0, width: 200, background: "linear-gradient(180deg,#1a55c0,#1a3580)", borderRadius: "4px 4px 0 0", boxShadow: "3px 0 10px rgba(0,0,0,0.5)", zIndex: 9999, overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(90deg,#1a55c0,#3d7bdb)", padding: "10px 10px 8px", borderBottom: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💰</div>
              <div><div style={{ color: "#fff", fontWeight: 700, fontSize: 11, fontFamily: XP.font }}>{profile?.full_name ?? "Finance User"}</div><div style={{ color: "#aad0ff", fontSize: 9 }}>{roles[0] ?? "finance"}</div></div>
            </div>
            {TABS.map(t => (
              <div key={t.id} onClick={() => { setTab(t.id); setStartOpen(false); }}
                style={{ padding: "6px 12px", cursor: "pointer", color: "#fff", fontSize: 11, fontFamily: XP.font, display: "flex", alignItems: "center", gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = "#316ac5"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              ><span>{t.icon}</span>{t.label}</div>
            ))}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />
            <div onClick={() => navigate("/dashboard")} style={{ padding: "6px 12px", cursor: "pointer", color: "#fff", fontSize: 11, fontFamily: XP.font, display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.background = "#316ac5"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>🏠 Dashboard</div>
          </div>
        )}
        <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.2)", margin: "0 2px" }} />
        <button onClick={() => setTab("overview")} style={{ background: tab === "overview" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, color: "#fff", padding: "2px 10px", fontSize: 11, fontFamily: XP.font, cursor: "pointer", height: 24 }}>
          💰 Finance Workspace
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 2, padding: "2px 8px", color: "#fff", fontSize: 11, fontFamily: XP.font }}>
          {taskbarTime.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Modals */}
      {showPayForm && (
        <FormModal title={editPay ? "Edit Payment Voucher" : "New Payment Voucher"} icon="💳" onClose={() => { setShowPayForm(false); setEditPay(null); }}>
          <PaymentForm onSave={savePayment} onCancel={() => { setShowPayForm(false); setEditPay(null); }} saving={saving} initial={editPay ?? undefined} />
        </FormModal>
      )}
      {showRcpForm && (
        <FormModal title={editRcp ? "Edit Receipt Voucher" : "New Receipt Voucher"} icon="🧾" onClose={() => { setShowRcpForm(false); setEditRcp(null); }}>
          <ReceiptForm onSave={saveReceipt} onCancel={() => { setShowRcpForm(false); setEditRcp(null); }} saving={saving} initial={editRcp ?? undefined} />
        </FormModal>
      )}
      {showJnlForm && (
        <FormModal title="New Journal Entry" icon="📓" onClose={() => setShowJnlForm(false)}>
          <JournalForm onSave={saveJournal} onCancel={() => setShowJnlForm(false)} saving={saving} />
        </FormModal>
      )}
      {showAstForm && (
        <FormModal title={editAst ? "Edit Fixed Asset" : "Register Fixed Asset"} icon="🏗" onClose={() => { setShowAstForm(false); setEditAst(null); }}>
          <AssetForm onSave={saveAsset} onCancel={() => { setShowAstForm(false); setEditAst(null); }} saving={saving} initial={editAst ?? undefined} />
        </FormModal>
      )}
    </div>
  );
}
