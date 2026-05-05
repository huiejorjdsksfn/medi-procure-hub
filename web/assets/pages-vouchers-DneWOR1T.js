import { r as reactExports, j as jsxRuntimeExports, Y as DollarSign, l as Download, R as RefreshCw, i as Plus, d as Search, a3 as Printer, p as CircleCheckBig, an as CircleX, X, q as Save, E as Eye, w as Trash2 } from "./react-vendor-CySSbiQ5.js";
import { u as useAuth, s as supabase, t as toast, l as logAudit } from "./pages-admin-tba3xNhl.js";
import { n as notifyProcurement } from "./pages-comms-BGWC3gfj.js";
import { u as utils, w as writeFileSync } from "./xlsx-vendor-BSOddODG.js";
const embuLogo = "/assets/embu-county-logo-CHeN79J6.jpg";
const genNo$4 = () => {
  const d = /* @__PURE__ */ new Date();
  return `PV/EL5H/${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}/${Math.floor(1e3 + Math.random() * 9e3)}`;
};
const fmtKES$4 = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-KE", { dateStyle: "long" }) : "—";
const S_CFG = {
  draft: { bg: "#f3f4f6", color: "#6b7280", label: "Draft" },
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  approved: { bg: "#dcfce7", color: "#15803d", label: "Approved" },
  paid: { bg: "#dbeafe", color: "#1d4ed8", label: "Paid" },
  rejected: { bg: "#fee2e2", color: "#dc2626", label: "Rejected" }
};
const sc = (s) => S_CFG[s] || S_CFG.draft;
const EXPENSE_ACCOUNTS = ["5100 - Medical Supplies Expense", "5200 - Pharmaceutical Expense", "5300 - Salaries & Wages", "5400 - Equipment Maintenance", "5500 - Utilities", "5600 - Administrative Expenses", "5700 - Depreciation Expense", "1100 - Cash", "2100 - Accounts Payable", "6100 - Lab Supplies", "6200 - Cleaning & Sanitation"];
const METHODS = ["EFT/Bank Transfer", "RTGS", "Cheque", "Cash", "Mobile Money (M-Pesa)", "Standing Order"];
const LBL = ({ children }) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }, children });
const INP = (v, cb, p = "", t = "text", extra) => /* @__PURE__ */ jsxRuntimeExports.jsx(
  "input",
  {
    type: t,
    value: v,
    onChange: (e) => cb(e.target.value),
    placeholder: p,
    ...extra,
    style: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 8, outline: "none", background: "#fff", boxSizing: "border-box" }
  }
);
const emptyLine = () => ({ description: "", qty: "1", unit_price: "", amount: "", account: "" });
function PaymentVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const [rows, setRows] = reactExports.useState([]);
  const [suppliers, setSuppliers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [stFilter, setStFilter] = reactExports.useState("all");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [print, setPrint] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ payee_name: "", payee_type: "supplier", supplier_id: "", payment_method: "EFT/Bank Transfer", voucher_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], bank_name: "", account_number: "", reference: "", description: "", expense_account: EXPENSE_ACCOUNTS[0], line_items: [emptyLine()] });
  const load = reactExports.useCallback(async () => {
    setLoading(true);
    const [{ data: v }, { data: s }] = await Promise.all([
      supabase.from("payment_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name,bank_name,account_number").order("name")
    ]);
    setRows(v || []);
    setSuppliers(s || []);
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    load();
  }, [load]);
  reactExports.useEffect(() => {
    const ch = supabase.channel("pv-rt").on("postgres_changes", { event: "*", schema: "public", table: "payment_vouchers" }, load).subscribe();
    return () => supabase.removeChannel(ch);
  }, [load]);
  const lineTotal = (lines) => lines.reduce((s, l) => s + Number(l.qty || 1) * Number(l.unit_price || l.amount || 0), 0);
  const save = async () => {
    if (!form.payee_name) {
      toast({ title: "Payee name required", variant: "destructive" });
      return;
    }
    const validLines = form.line_items.filter((l) => l.description.trim());
    if (!validLines.length) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    setSaving(true);
    const total = lineTotal(validLines);
    const sup = suppliers.find((s) => s.id === form.supplier_id);
    const payload = { voucher_number: genNo$4(), payee_name: form.payee_name || (sup?.name || ""), payee_type: form.payee_type, supplier_id: form.supplier_id || null, payment_method: form.payment_method, voucher_date: form.voucher_date, bank_name: form.bank_name || (sup?.bank_name || ""), account_number: form.account_number || (sup?.account_number || ""), reference: form.reference, description: form.description, expense_account: form.expense_account, line_items: validLines, total_amount: total, status: "pending", prepared_by: user?.id, prepared_by_name: profile?.full_name };
    const { data, error } = await supabase.from("payment_vouchers").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }
    logAudit(user?.id, profile?.full_name, "create", "payment_vouchers", data?.id, {});
    await notifyProcurement({ title: "New Payment Voucher", message: `${payload.voucher_number} — ${form.payee_name} — ${fmtKES$4(total)}`, type: "voucher", module: "PaymentVouchers", senderId: user?.id });
    toast({ title: "Payment voucher created ✓" });
    setShowNew(false);
    setForm({ payee_name: "", payee_type: "supplier", supplier_id: "", payment_method: "EFT/Bank Transfer", voucher_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0], bank_name: "", account_number: "", reference: "", description: "", expense_account: EXPENSE_ACCOUNTS[0], line_items: [emptyLine()] });
    load();
    setSaving(false);
  };
  const approve = async (v) => {
    await supabase.from("payment_vouchers").update({ status: "approved", approved_by: user?.id, approved_by_name: profile?.full_name, approved_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", v.id);
    toast({ title: "Approved ✓" });
    load();
  };
  const reject_ = async (v) => {
    await supabase.from("payment_vouchers").update({ status: "rejected" }).eq("id", v.id);
    toast({ title: "Rejected" });
    load();
  };
  const markPaid = async (v) => {
    await supabase.from("payment_vouchers").update({ status: "paid", paid_at: (/* @__PURE__ */ new Date()).toISOString(), paid_by: profile?.full_name }).eq("id", v.id);
    toast({ title: "Marked as paid ✓" });
    load();
  };
  const updLine = (i, k, v) => {
    setForm((p) => {
      const items = [...p.line_items];
      items[i] = { ...items[i], [k]: v };
      if (k === "qty" || k === "unit_price") items[i].amount = String(Number(items[i].qty || 1) * Number(items[i].unit_price || 0));
      return { ...p, line_items: items };
    });
  };
  const exportXLSX = () => {
    const ws = utils.json_to_sheet(filtered.map((r) => ({ No: r.voucher_number, Payee: r.payee_name, Method: r.payment_method, Total: r.total_amount, Date: r.voucher_date, Status: r.status, "Prepared By": r.prepared_by_name, "Approved By": r.approved_by_name || "—" })));
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, "PaymentVouchers");
    writeFileSync(wb, `PaymentVouchers_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
  };
  const filtered = rows.filter((r) => (stFilter === "all" || r.status === stFilter) && (!search || [r.voucher_number, r.payee_name, r.payment_method, r.reference].some((v) => (v || "").toLowerCase().includes(search.toLowerCase()))));
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "16px 20px", maxWidth: 1400, margin: "0 auto", fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }),
    (() => {
      const totalAmt = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const paidAmt = rows.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const pendAmt = rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const fmtKES2 = (n) => n >= 1e6 ? `KES ${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `KES ${(n / 1e3).toFixed(2)}K` : `KES ${n.toFixed(0)}`;
      return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }, children: [
        { label: "Total Value", val: fmtKES2(totalAmt), bg: "#c0392b" },
        { label: "Paid Amount", val: fmtKES2(paidAmt), bg: "#0e6655" },
        { label: "Pending Amount", val: fmtKES2(pendAmt), bg: "#7d6608" },
        { label: "Record Count", val: rows.length, bg: "#6c3483" },
        { label: "Pending Approval", val: rows.filter((r) => r.status === "pending").length, bg: "#1a252f" }
      ].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 10, padding: "12px 16px", color: "#fff", textAlign: "center", background: k.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 18, fontWeight: 900, lineHeight: 1 }, children: k.val }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 5, opacity: 0.9, letterSpacing: "0.04em" }, children: k.label })
      ] }, k.label)) });
    })(),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg,#0f766e,#0d9488)", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { style: { width: 21, height: 21, color: "#fff" } }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 22, fontWeight: 900, color: "#111827", margin: 0 }, children: "Payment Vouchers" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 13, color: "#6b7280", margin: 0 }, children: [
            "Expenditure authorization · ",
            rows.length,
            " vouchers"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportXLSX, style: { display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 13, height: 13 } }),
          " Export"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: load, style: { display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#f3f4f6", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13 } }),
          " Refresh"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), style: { display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 2px 8px rgba(15,118,110,0.3)" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 14, height: 14 } }),
          " New Voucher"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }, children: [{ id: "all", label: "All" }, { id: "pending", label: "Pending Approval" }, { id: "approved", label: "Approved" }, { id: "paid", label: "Paid" }, { id: "rejected", label: "Rejected" }].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setStFilter(f.id), style: { padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${stFilter === f.id ? "#0f766e" : "#e5e7eb"}`, background: stFilter === f.id ? "#0f766e" : "#fff", color: stFilter === f.id ? "#fff" : "#374151", fontSize: 12, fontWeight: 700, cursor: "pointer" }, children: [
      f.label,
      " (",
      rows.filter((r) => f.id === "all" || r.status === f.id).length,
      ")"
    ] }, f.id)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#9ca3af" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Search voucher number, payee, reference...",
          style: { width: "100%", padding: "10px 12px 10px 34px", fontSize: 13, border: "1.5px solid #e5e7eb", borderRadius: 9, outline: "none", background: "#fff", boxSizing: "border-box" }
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "linear-gradient(135deg,#0a2558,#1a3a6b)" }, children: ["Voucher No", "Payee", "Method", "Total Amount", "Date", "Prepared By", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }, children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [...Array(8)].map((_, j) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "14px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 12, background: "#f3f4f6", borderRadius: 4, animation: "pulse 1.5s infinite" } }) }, j)) }, i)) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 8, style: { padding: "60px", textAlign: "center", color: "#9ca3af", fontSize: 14 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { style: { width: 40, height: 40, color: "#e5e7eb", margin: "0 auto 12px" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: "No payment vouchers yet" })
      ] }) }) : filtered.map((r) => {
        const cfg = sc(r.status);
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            style: { borderBottom: "1px solid #f9fafb", cursor: "pointer" },
            onMouseEnter: (e) => e.currentTarget.style.background = "#fafafa",
            onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px", fontSize: 13, fontWeight: 800, color: "#0f766e", fontFamily: "monospace" }, onClick: () => setDetail(r), children: r.voucher_number }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px", fontSize: 13, fontWeight: 600, color: "#111827" }, onClick: () => setDetail(r), children: r.payee_name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px", fontSize: 12, color: "#374151" }, onClick: () => setDetail(r), children: r.payment_method }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px", fontSize: 13, fontWeight: 700, color: "#111827" }, onClick: () => setDetail(r), children: fmtKES$4(r.total_amount) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px", fontSize: 12, color: "#374151" }, onClick: () => setDetail(r), children: r.voucher_date ? new Date(r.voucher_date).toLocaleDateString("en-KE") : "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px", fontSize: 12, color: "#374151" }, onClick: () => setDetail(r), children: r.prepared_by_name || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px" }, onClick: () => setDetail(r), children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: cfg.bg, color: cfg.color }, children: cfg.label }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "12px 14px" }, onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setPrint(r), style: { padding: "4px 8px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 5, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { style: { width: 11, height: 11, color: "#6b7280" } }) }),
                canApprove && r.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approve(r), style: { padding: "4px 8px", background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 5, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { style: { width: 11, height: 11, color: "#15803d" } }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => reject_(r), style: { padding: "4px 8px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 5, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleX, { style: { width: 11, height: 11, color: "#dc2626" } }) })
                ] }),
                canApprove && r.status === "approved" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => markPaid(r), style: { padding: "4px 9px", background: "#dbeafe", border: "1px solid #bfdbfe", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#1d4ed8" }, children: "Mark Paid" })
              ] }) })
            ]
          },
          r.id
        );
      }) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 14, width: "min(780px,100%)", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 18px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", borderRadius: "14px 14px 0 0", display: "flex", gap: 10, alignItems: "center", position: "sticky", top: 0, zIndex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { style: { width: 16, height: 16, color: "#fff" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 15, fontWeight: 800, color: "#fff", flex: 1 }, children: "New Payment Voucher" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 20, display: "flex", flexDirection: "column", gap: 14 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 9, padding: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 12 }, children: "PAYEE DETAILS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Payee Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.payee_type, onChange: (e) => {
                setForm((p) => ({ ...p, payee_type: e.target.value, supplier_id: "" }));
              }, style: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 8, outline: "none" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "supplier", children: "Supplier / Vendor" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "staff", children: "Staff Member" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "other", children: "Other" })
              ] })
            ] }),
            form.payee_type === "supplier" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Select Supplier" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.supplier_id, onChange: (e) => {
                const s = suppliers.find((x) => x.id === e.target.value);
                setForm((p) => ({ ...p, supplier_id: e.target.value, payee_name: s?.name || "", bank_name: s?.bank_name || "", account_number: s?.account_number || "" }));
              }, style: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 8, outline: "none" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select supplier..." }),
                suppliers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.name }, s.id))
              ] })
            ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Payee Name *" }),
              INP(form.payee_name, (v) => setForm((p) => ({ ...p, payee_name: v })), "Full name")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Voucher Date" }),
              INP(form.voucher_date, (v) => setForm((p) => ({ ...p, voucher_date: v })), "", "date")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Payment Method" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.payment_method, onChange: (e) => setForm((p) => ({ ...p, payment_method: e.target.value })), style: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 8, outline: "none" }, children: METHODS.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, children: m }, m)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Reference No." }),
              INP(form.reference, (v) => setForm((p) => ({ ...p, reference: v })), "LPO/Contract/Invoice ref")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Bank Name" }),
              INP(form.bank_name, (v) => setForm((p) => ({ ...p, bank_name: v })), "Bank name")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Account Number" }),
              INP(form.account_number, (v) => setForm((p) => ({ ...p, account_number: v })), "Account number")
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Expense Account" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.expense_account, onChange: (e) => setForm((p) => ({ ...p, expense_account: e.target.value })), style: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 8, outline: "none" }, children: EXPENSE_ACCOUNTS.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: a, children: a }, a)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 3" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(LBL, { children: "Description / Purpose" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  value: form.description,
                  onChange: (e) => setForm((p) => ({ ...p, description: e.target.value })),
                  rows: 2,
                  placeholder: "Payment description and purpose...",
                  style: { width: "100%", padding: "9px 12px", fontSize: 14, border: "1.5px solid #e5e7eb", borderRadius: 8, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 800, color: "#374151", marginBottom: 8 }, children: "LINE ITEMS" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { border: "1.5px solid #e5e7eb", borderRadius: 9, overflow: "hidden" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f9fafb" }, children: ["Description *", "Qty", "Unit Price (KES)", "Amount (KES)", "Account", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "8px 10px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }, children: h }, h)) }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: form.line_items.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 6px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: l.description, onChange: (e) => updLine(i, "description", e.target.value), placeholder: "Item description...", style: { width: 220, padding: "6px 8px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 5, outline: "none" } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 6px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: l.qty, onChange: (e) => updLine(i, "qty", e.target.value), min: 0, style: { width: 60, padding: "6px 8px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 5, outline: "none" } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 6px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: l.unit_price, onChange: (e) => updLine(i, "unit_price", e.target.value), min: 0, placeholder: "0.00", style: { width: 110, padding: "6px 8px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 5, outline: "none" } }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 6px", fontWeight: 700, color: "#111827", fontSize: 13, minWidth: 100 }, children: (Number(l.qty || 1) * Number(l.unit_price || 0)).toLocaleString("en-KE", { minimumFractionDigits: 2 }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 6px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: l.account, onChange: (e) => updLine(i, "account", e.target.value), style: { padding: "6px 8px", fontSize: 11, border: "1px solid #e5e7eb", borderRadius: 5, outline: "none", maxWidth: 180 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select..." }),
                  EXPENSE_ACCOUNTS.map((a) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: a, children: a }, a))
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 6px" }, children: form.line_items.length > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setForm((p) => ({ ...p, line_items: p.line_items.filter((_, j) => j !== i) })), style: { background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 5, cursor: "pointer", padding: "4px 6px", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 10, height: 10, color: "#dc2626" } }) }) })
              ] }, i)) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setForm((p) => ({ ...p, line_items: [...p.line_items, emptyLine()] })), style: { display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#1d4ed8" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 11, height: 11 } }),
                " Add Line"
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "right" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#6b7280" }, children: "TOTAL AMOUNT" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 900, color: "#111827" }, children: fmtKES$4(lineTotal(form.line_items)) })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8, borderTop: "1px solid #f3f4f6" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), style: { padding: "9px 18px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, style: { display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", background: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800 }, children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12, animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 12, height: 12 } }),
            " ",
            saving ? "Saving..." : "Submit Voucher"
          ] })
        ] })
      ] })
    ] }) }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 400, display: "flex", justifyContent: "flex-end" }, onClick: () => setDetail(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "min(480px,100%)", background: "#fff", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }, onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 16px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { style: { width: 14, height: 14, color: "#fff" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 800, color: "#fff", flex: 1 }, children: detail.voucher_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setPrint(detail);
          setDetail(null);
        }, style: { display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700, color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { style: { width: 9, height: 9 } }),
          " Print"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 5, padding: "4px 6px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 12, height: 12 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 18, display: "flex", flexDirection: "column", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, background: sc(detail.status).bg, color: sc(detail.status).color, display: "inline-block" }, children: sc(detail.status).label }),
        [["Payee", detail.payee_name], ["Payment Method", detail.payment_method], ["Bank", detail.bank_name || "—"], ["Account", detail.account_number || "—"], ["Reference", detail.reference || "—"], ["Expense Account", detail.expense_account || "—"], ["Voucher Date", fmtDate(detail.voucher_date)], ["Total Amount", fmtKES$4(detail.total_amount)], ["Prepared By", detail.prepared_by_name || "—"], ["Approved By", detail.approved_by_name || "—"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f9fafb" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#9ca3af", fontWeight: 600 }, children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", textAlign: "right", maxWidth: "60%" }, children: v })
        ] }, l)),
        detail.description && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 5 }, children: "Description" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 14, color: "#374151", lineHeight: 1.7, margin: 0 }, children: detail.description })
        ] }),
        detail.line_items?.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: 8 }, children: "Line Items" }),
          detail.line_items.map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px dashed #f3f4f6", fontSize: 13 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#374151" }, children: l.description }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 700, color: "#111827" }, children: fmtKES$4(Number(l.qty || 1) * Number(l.unit_price || l.amount || 0)) })
          ] }, i))
        ] }),
        canApprove && detail.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            approve(detail);
            setDetail(null);
          }, style: { flex: 1, padding: "10px", background: "#15803d", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { style: { width: 14, height: 14 } }),
            " Approve"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            reject_(detail);
            setDetail(null);
          }, style: { flex: 1, padding: "10px", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }, children: "Reject" })
        ] }),
        canApprove && detail.status === "approved" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          markPaid(detail);
          setDetail(null);
        }, style: { width: "100%", padding: "10px", background: "linear-gradient(135deg,#0f766e,#0d9488)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800 }, children: "Mark as Paid" })
      ] })
    ] }) }),
    print && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, width: "min(760px,100%)", maxHeight: "90vh", overflowY: "auto" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700 }, children: "Payment Voucher" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => window.print(), style: { padding: "6px 14px", background: "#15803d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { style: { width: 11, height: 11 } }),
            " Print"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setPrint(null), style: { background: "#f3f4f6", border: "none", borderRadius: 6, padding: "6px 10px", cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 24, fontFamily: "serif", fontSize: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16, marginBottom: 10, paddingBottom: 10, borderBottom: "2px solid #111" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: embuLogo, alt: "logo", style: { width: 65, height: 65, objectFit: "contain" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 14, fontWeight: 900, textTransform: "uppercase" }, children: "Embu County Government" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 700 }, children: "Embu Level 5 Hospital" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10 }, children: "P.O. Box 1 – 60100, Embu, Kenya" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginLeft: "auto", textAlign: "right" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 16, fontWeight: 900, textTransform: "uppercase" }, children: "PAYMENT VOUCHER" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, fontWeight: 700, marginTop: 3 }, children: [
              "Voucher No: ",
              print.voucher_number
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10 }, children: [
              "Date: ",
              fmtDate(print.voucher_date)
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginBottom: 10, fontSize: 11 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: [["Pay to", print.payee_name], ["Payment Method", print.payment_method], ["Bank / Branch", print.bank_name || "—"], ["Account No.", print.account_number || "—"], ["Reference", print.reference || "—"], ["Expense Account", print.expense_account || "—"], ["Description", print.description || "—"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { padding: "4px 8px", border: "1px solid #999", fontWeight: 700, width: 160 }, children: [
            l,
            ":"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "4px 8px", border: "1px solid #999" }, children: v })
        ] }, l)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 11 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f3f4f6" }, children: ["#", "Description", "Qty", "Unit Price", "Amount (KES)", "Account"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "6px 8px", border: "1px solid #999", textAlign: "left", fontWeight: 700 }, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
            (print.line_items || []).map((l, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", border: "1px solid #ccc", textAlign: "center" }, children: i + 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", border: "1px solid #ccc" }, children: l.description }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", border: "1px solid #ccc", textAlign: "right" }, children: l.qty || 1 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", border: "1px solid #ccc", textAlign: "right" }, children: Number(l.unit_price || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", border: "1px solid #ccc", textAlign: "right", fontWeight: 700 }, children: (Number(l.qty || 1) * Number(l.unit_price || 0)).toLocaleString("en-KE", { minimumFractionDigits: 2 }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "5px 8px", border: "1px solid #ccc", fontSize: 9 }, children: l.account || "—" })
            ] }, i)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { fontWeight: 900, background: "#f3f4f6" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 4, style: { padding: "6px 8px", border: "1px solid #999", textAlign: "right" }, children: "TOTAL:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "6px 8px", border: "1px solid #999", textAlign: "right" }, children: fmtKES$4(print.total_amount || 0) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { border: "1px solid #999" } })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 8, padding: "8px", border: "1px solid #999", fontWeight: 700 }, children: [
          "Amount in Words: ",
          print.total_amount ? `${fmtKES$4(print.total_amount)} only` : "—"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 24 }, children: [["Prepared by", print.prepared_by_name || ""], ["Approved by", print.approved_by_name || ""], ["Received by", ""]].map(([l, n]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center" }, children: [
          n && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, marginBottom: 4 }, children: n }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 48, borderBottom: "1px solid #000", marginBottom: 4 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700 }, children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#6b7280" }, children: "Name / Signature / Date" })
        ] }, l)) })
      ] })
    ] }) })
  ] });
}
const fmtKES$3 = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const genNo$3 = () => `RV-EL5H-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Math.floor(1e3 + Math.random() * 9e3))}`;
const SC$3 = { confirmed: "#15803d", pending: "#d97706", cancelled: "#dc2626" };
function ReceiptVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer");
  const [rows, setRows] = reactExports.useState([]);
  const [depts, setDepts] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ received_from: "", amount: "", payment_method: "Cash", receipt_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), reference: "", description: "", income_account: "", bank_name: "", bank_reference: "", department_id: "", status: "confirmed" });
  const [saving, setSaving] = reactExports.useState(false);
  const [hospitalName, setHospitalName] = reactExports.useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = reactExports.useState(null);
  const load = async () => {
    setLoading(true);
    const [{ data: rv }, { data: d }, { data: s }] = await Promise.all([
      supabase.from("receipt_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("id,name").order("name"),
      supabase.from("system_settings").select("key,value").in("key", ["hospital_name", "system_logo_url"])
    ]);
    setRows(rv || []);
    setDepts(d || []);
    const m = {};
    (s || []).forEach((x) => {
      if (x.key) m[x.key] = x.value;
    });
    if (m.hospital_name) setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.received_from || !form.amount) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, receipt_number: genNo$3(), amount: Number(form.amount), department_id: form.department_id || null, created_by: user?.id, created_by_name: profile?.full_name };
    const { data, error } = await supabase.from("receipt_vouchers").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      logAudit(user?.id, profile?.full_name, "create", "receipt_vouchers", data?.id, { received_from: form.received_from });
      toast({ title: "Receipt Voucher created ✓" });
      setShowNew(false);
      load();
    }
    setSaving(false);
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete this receipt voucher?")) return;
    await supabase.from("receipt_vouchers").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const printVoucher = (v) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const logo = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain">` : "";
    w.document.write(`<html><head><title>Receipt Voucher</title>
    <style>
      body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
      .lh{background:#0a2558;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
      .lh-info h2{margin:0;font-size:16px;font-weight:900} .lh-info small{opacity:0.6;font-size:10px}
      .body{padding:20px}
      .title-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #e5e7eb}
      .badge{padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;background:#dcfce7;color:#15803d}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      td{padding:8px 12px;vertical-align:top} td:first-child{font-weight:700;color:#6b7280;width:35%;font-size:10px;text-transform:uppercase}
      tr{border-bottom:1px solid #f3f4f6} .amount-row td{font-size:16px;font-weight:900;color:#0a2558}
      .sig{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb}
      .sig-item{text-align:center} .sig-line{border-bottom:1px solid #374151;margin-bottom:4px;height:40px}
      .footer{margin-top:30px;padding-top:10px;border-top:1px solid #e5e7eb;text-align:center;font-size:9px;color:#9ca3af}
      @media print{@page{margin:1cm}body{margin:0}}
    </style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>OFFICIAL RECEIPT VOUCHER</small></div><div style="margin-left:auto;font-size:11px;opacity:0.7">${v.receipt_number}</div></div>
    <div class="body">
      <div class="title-row"><div><h3 style="margin:0;font-size:14px;font-weight:900;color:#0a2558">RECEIPT VOUCHER</h3><p style="margin:4px 0 0;color:#6b7280;font-size:11px">${v.receipt_number}</p></div><span class="badge">${v.status}</span></div>
      <table>
        <tr><td>Received From</td><td style="font-weight:700;font-size:13px">${v.received_from}</td></tr>
        <tr class="amount-row"><td>Amount Received</td><td>${fmtKES$3(v.amount)}</td></tr>
        <tr><td>Payment Method</td><td>${v.payment_method || "—"}</td></tr>
        <tr><td>Receipt Date</td><td>${new Date(v.receipt_date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
        ${v.reference ? `<tr><td>Reference No.</td><td>${v.reference}</td></tr>` : ""}
        ${v.bank_name ? `<tr><td>Bank</td><td>${v.bank_name}</td></tr>` : ""}
        ${v.bank_reference ? `<tr><td>Bank Reference</td><td>${v.bank_reference}</td></tr>` : ""}
        ${v.income_account ? `<tr><td>Income Account</td><td>${v.income_account}</td></tr>` : ""}
        ${v.description ? `<tr><td>Description</td><td>${v.description}</td></tr>` : ""}
        <tr><td>Created By</td><td>${v.created_by_name || "—"}</td></tr>
      </table>
      <div class="sig">
        <div class="sig-item"><div class="sig-line"></div><p>Received By</p><p style="font-size:9px;color:#9ca3af">${v.received_from}</p></div>
        <div class="sig-item"><div class="sig-line"></div><p>Issued By</p><p style="font-size:9px;color:#9ca3af">${v.created_by_name || ""} · Finance</p></div>
      </div>
      <div class="footer">${hospitalName} · ${v.receipt_number} · Printed ${(/* @__PURE__ */ new Date()).toLocaleString("en-KE")}</div>
    </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Receipt Vouchers");
    writeFileSync(wb, `receipt_vouchers_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const filtered = search ? rows.filter((r) => Object.values(r).some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAmt = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
  const F = ({ label, k, type = "text", req = false }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: [
      label,
      req && " *"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value: form[k] || "",
        onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
        className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400"
      }
    )
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", style: { fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-5 py-3 flex items-center justify-between", style: { background: "linear-gradient(90deg,#065f46,#047857)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-black text-white", children: "Receipt Vouchers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-white/50", children: [
          rows.length,
          " records · Total: ",
          fmtKES$3(totalAmt)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", style: { background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
          "Export"
        ] }),
        canCreate && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), className: "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold", style: { background: "rgba(255,255,255,0.92)", color: "#065f46" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
          "New Receipt"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Search vouchers…",
          className: "w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f0fdf4" }, children: ["Receipt No.", "Received From", "Amount", "Method", "Date", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase tracking-wide", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "px-4 py-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-gray-300 mx-auto" }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "px-4 py-8 text-center text-gray-400 text-xs", children: "No receipt vouchers yet" }) }) : filtered.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold", style: { color: "#065f46" }, children: r.receipt_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium text-gray-800", children: r.received_from }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold text-gray-800", children: fmtKES$3(r.amount) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-600", children: r.payment_method }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500", children: new Date(r.receipt_date).toLocaleDateString("en-KE") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full text-[9px] font-bold", style: { background: `${SC$3[r.status] || "#9ca3af"}20`, color: SC$3[r.status] || "#9ca3af" }, children: r.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(r), className: "p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3 h-3 text-blue-600" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => printVoucher(r), className: "p-1.5 rounded-lg bg-green-50 hover:bg-green-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-3 h-3 text-green-600" }) }),
          hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), className: "p-1.5 rounded-lg bg-red-50 hover:bg-red-100", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3 text-red-500" }) })
        ] }) })
      ] }, r.id)) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: () => setShowNew(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 overflow-y-auto max-h-[90vh]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-black text-gray-800", children: "New Receipt Voucher" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Received From", k: "received_from", req: true }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Amount (KES)", k: "amount", type: "number", req: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Payment Method" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: form.payment_method,
                onChange: (e) => setForm((p) => ({ ...p, payment_method: e.target.value })),
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none",
                children: ["Cash", "Cheque", "EFT", "MPESA", "Bank Transfer"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: m }, m))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Receipt Date", k: "receipt_date", type: "date", req: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Reference No.", k: "reference" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Bank Name", k: "bank_name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Bank Reference", k: "bank_reference" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Income Account", k: "income_account" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Department" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: form.department_id,
                onChange: (e) => setForm((p) => ({ ...p, department_id: e.target.value })),
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
                  depts.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Description" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "textarea",
              {
                value: form.description,
                onChange: (e) => setForm((p) => ({ ...p, description: e.target.value })),
                rows: 2,
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), className: "px-4 py-2 rounded-xl border text-sm", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, className: "flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold", style: { background: "#065f46" }, children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-3.5 h-3.5" }),
            saving ? "Saving…" : "Create Receipt"
          ] })
        ] })
      ] })
    ] }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50", onClick: () => setDetail(null) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("h3", { className: "font-black text-gray-800", children: [
            "Receipt Voucher — ",
            detail.receipt_number
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => printVoucher(detail), className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold", style: { background: "#065f46", color: "#fff" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-3 h-3" }),
              "Print"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-2", children: [["Received From", detail.received_from], ["Amount", fmtKES$3(detail.amount)], ["Method", detail.payment_method], ["Date", new Date(detail.receipt_date).toLocaleDateString("en-KE")], ["Reference", detail.reference], ["Bank", detail.bank_name], ["Income Account", detail.income_account], ["Description", detail.description], ["Status", detail.status], ["Created By", detail.created_by_name]].filter(([, v]) => v).map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between py-1.5 border-b border-gray-50", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-gray-500", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-medium text-gray-800", children: v })
        ] }, l)) })
      ] })
    ] })
  ] });
}
const fmtKES$2 = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const genNo$2 = () => `JV-EL5H-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Math.floor(1e3 + Math.random() * 9e3))}`;
const SC$2 = { draft: "#6b7280", approved: "#15803d", posted: "#0369a1", rejected: "#dc2626" };
function JournalVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const [rows, setRows] = reactExports.useState([]);
  const [coa, setCoa] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [form, setForm] = reactExports.useState({ journal_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), reference: "", period: "", narration: "" });
  const [entries, setEntries] = reactExports.useState([
    { account_code: "", account_name: "", debit: "", credit: "", description: "" },
    { account_code: "", account_name: "", debit: "", credit: "", description: "" }
  ]);
  const [saving, setSaving] = reactExports.useState(false);
  const [hospitalName, setHospitalName] = reactExports.useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = reactExports.useState(null);
  const load = async () => {
    setLoading(true);
    const [{ data: jv }, { data: c }, { data: s }] = await Promise.all([
      supabase.from("journal_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("chart_of_accounts").select("account_code,account_name").eq("is_active", true).order("account_code"),
      supabase.from("system_settings").select("key,value").in("key", ["hospital_name", "system_logo_url"])
    ]);
    setRows(jv || []);
    setCoa(c || []);
    const m = {};
    (s || []).forEach((x) => {
      if (x.key) m[x.key] = x.value;
    });
    if (m.hospital_name) setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const totalDebit = entries.reduce((s, e) => s + Number(e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const save = async () => {
    if (!form.narration) {
      toast({ title: "Narration required", variant: "destructive" });
      return;
    }
    if (!isBalanced) {
      toast({ title: "Journal is not balanced — debits must equal credits", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      journal_number: genNo$2(),
      entries: entries.filter((e) => e.account_code || e.debit || e.credit),
      total_debit: totalDebit,
      total_credit: totalCredit,
      is_balanced: isBalanced,
      status: "draft",
      created_by: user?.id,
      created_by_name: profile?.full_name
    };
    const { data, error } = await supabase.from("journal_vouchers").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      logAudit(user?.id, profile?.full_name, "create", "journal_vouchers", data?.id, { number: payload.journal_number });
      toast({ title: "Journal Voucher created ✓" });
      setShowNew(false);
      load();
    }
    setSaving(false);
  };
  const approve = async (id) => {
    await supabase.from("journal_vouchers").update({ status: "approved", approved_by: user?.id, approved_by_name: profile?.full_name }).eq("id", id);
    toast({ title: "Journal approved ✓" });
    load();
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete this journal voucher?")) return;
    await supabase.from("journal_vouchers").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Journal Vouchers");
    writeFileSync(wb, `journal_vouchers_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const printVoucher = (v) => {
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    const logo = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain">` : "";
    const entriesHtml = (v.entries || []).map((e, i) => `<tr><td>${i + 1}</td><td>${e.account_code || ""}</td><td>${e.account_name || ""}</td><td>${e.description || ""}</td><td style="text-align:right">${e.debit ? fmtKES$2(Number(e.debit)) : ""}</td><td style="text-align:right">${e.credit ? fmtKES$2(Number(e.credit)) : ""}</td></tr>`).join("");
    w.document.write(`<html><head><title>Journal Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#1e3a5f;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px;margin-top:12px}
    th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
    td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
    tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#e0f2fe;font-weight:800;font-size:12px}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>JOURNAL VOUCHER — ${v.journal_number}</small></div></div>
    <div class="body">
      <table style="margin-bottom:16px;font-size:11px">
        <tr><td style="font-weight:700;color:#666;width:30%">Journal No.</td><td>${v.journal_number}</td><td style="font-weight:700;color:#666;width:30%">Date</td><td>${new Date(v.journal_date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
        <tr><td style="font-weight:700;color:#666">Reference</td><td>${v.reference || "—"}</td><td style="font-weight:700;color:#666">Period</td><td>${v.period || "—"}</td></tr>
        <tr><td style="font-weight:700;color:#666">Narration</td><td colspan="3">${v.narration}</td></tr>
        <tr><td style="font-weight:700;color:#666">Status</td><td>${v.status}</td><td style="font-weight:700;color:#666">Prepared By</td><td>${v.created_by_name || "—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Account Code</th><th>Account Name</th><th>Description</th><th>Debit (KES)</th><th>Credit (KES)</th></tr></thead>
      <tbody>${entriesHtml}
      <tr class="total-row"><td colspan="4" style="text-align:right">TOTALS</td><td style="text-align:right">${fmtKES$2(v.total_debit)}</td><td style="text-align:right">${fmtKES$2(v.total_credit)}</td></tr>
      </tbody></table>
      <p style="margin-top:8px;font-size:10px;color:${v.is_balanced ? "#15803d" : "#dc2626"};font-weight:700">${v.is_balanced ? "✓ BALANCED" : "⚠ NOT BALANCED"}</p>
    </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };
  const updateEntry = (i, k, val) => {
    setEntries((p) => {
      const n = [...p];
      n[i] = { ...n[i], [k]: val };
      if (k === "account_code") {
        const a = coa.find((c) => c.account_code === val);
        if (a) n[i].account_name = a.account_name;
      }
      return n;
    });
  };
  const filtered = search ? rows.filter((r) => Object.values(r).some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) : rows;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", style: { fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-5 py-3 flex items-center justify-between", style: { background: "linear-gradient(90deg,#1e1b4b,#312e81)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-black text-white", children: "Journal Vouchers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-white/50", children: [
          rows.length,
          " entries"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", style: { background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
          "Export"
        ] }),
        canApprove && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), className: "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold", style: { background: "rgba(255,255,255,0.92)", color: "#312e81" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
          "New Journal"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "input",
        {
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Search journals…",
          className: "w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#eef2ff" }, children: ["Journal No.", "Date", "Reference", "Narration", "Debit", "Credit", "Balanced", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, className: "px-4 py-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-gray-300 mx-auto" }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, className: "px-4 py-8 text-center text-gray-400", children: "No journal vouchers" }) }) : filtered.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold", style: { color: "#312e81" }, children: r.journal_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: new Date(r.journal_date).toLocaleDateString("en-KE") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500", children: r.reference || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-700 max-w-[160px] truncate", children: r.narration }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-semibold", children: fmtKES$2(r.total_debit) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-semibold", children: fmtKES$2(r.total_credit) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold", style: { color: r.is_balanced ? "#15803d" : "#dc2626" }, children: r.is_balanced ? "✓ Yes" : "✗ No" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full text-[9px] font-bold", style: { background: `${SC$2[r.status] || "#9ca3af"}20`, color: SC$2[r.status] || "#9ca3af" }, children: r.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(r), className: "p-1.5 rounded-lg bg-blue-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3 h-3 text-blue-600" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => printVoucher(r), className: "p-1.5 rounded-lg bg-green-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-3 h-3 text-green-600" }) }),
          canApprove && r.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approve(r.id), className: "p-1.5 rounded-lg bg-emerald-50", title: "Approve", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-3 h-3 text-emerald-600" }) }),
          hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), className: "p-1.5 rounded-lg bg-red-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3 text-red-500" }) })
        ] }) })
      ] }, r.id)) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: () => setShowNew(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-5 overflow-y-auto max-h-[90vh] space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-black text-gray-800", children: "New Journal Voucher" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-3 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Date *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: form.journal_date, onChange: (e) => setForm((p) => ({ ...p, journal_date: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Reference" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.reference, onChange: (e) => setForm((p) => ({ ...p, reference: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Period" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.period, onChange: (e) => setForm((p) => ({ ...p, period: e.target.value })), placeholder: "e.g. Jan 2026", className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "col-span-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Narration *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.narration, onChange: (e) => setForm((p) => ({ ...p, narration: e.target.value })), rows: 2, className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gray-700 uppercase tracking-wide", children: "Journal Entries" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                onClick: () => setEntries((p) => [...p, { account_code: "", account_name: "", debit: "", credit: "", description: "" }]),
                className: "flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3 h-3" }),
                  "Add Line"
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", style: { borderCollapse: "collapse" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#eef2ff" }, children: ["Account Code", "Account Name", "Description", "Debit", "Credit", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-left font-bold text-gray-600 text-[10px]", children: h }, h)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              entries.map((e, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { className: "px-1 py-1", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "input",
                    {
                      list: `coa-${i}`,
                      value: e.account_code,
                      onChange: (ev) => updateEntry(i, "account_code", ev.target.value),
                      className: "w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("datalist", { id: `coa-${i}`, children: coa.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c.account_code, children: c.account_name }, c.account_code)) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: e.account_name, onChange: (ev) => updateEntry(i, "account_name", ev.target.value), className: "w-32 px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: e.description, onChange: (ev) => updateEntry(i, "description", ev.target.value), className: "w-28 px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: e.debit, onChange: (ev) => updateEntry(i, "debit", ev.target.value), className: "w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none text-right" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: e.credit, onChange: (ev) => updateEntry(i, "credit", ev.target.value), className: "w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none text-right" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEntries((p) => p.filter((_, j) => j !== i)), className: "text-red-400 hover:text-red-600", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3 h-3" }) }) })
              ] }, i)),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#f0fdf4", fontWeight: 800 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "px-2 py-2 text-right text-xs font-bold text-gray-700", children: "TOTALS" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-xs font-bold text-right", style: { color: "#1a3a6b" }, children: fmtKES$2(totalDebit) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-xs font-bold text-right", style: { color: "#1a3a6b" }, children: fmtKES$2(totalCredit) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-xs font-bold", style: { color: isBalanced ? "#15803d" : "#dc2626" }, children: isBalanced ? "✓ Balanced" : "✗ Unbalanced" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), className: "px-4 py-2 rounded-xl border text-sm", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: save,
              disabled: saving || !isBalanced,
              className: "flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-50",
              style: { background: "#312e81" },
              children: [
                saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-3.5 h-3.5" }),
                saving ? "Saving…" : "Create Journal"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}
const fmtKES$1 = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const genNo$1 = () => `PV-EL5H-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Math.floor(1e3 + Math.random() * 9e3))}`;
const SC$1 = { pending: "#d97706", approved: "#15803d", rejected: "#dc2626", paid: "#0369a1" };
function PurchaseVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer");
  const canApprove = hasRole("admin") || hasRole("procurement_manager");
  const [rows, setRows] = reactExports.useState([]);
  const [suppliers, setSuppliers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ supplier_id: "", supplier_name: "", invoice_number: "", voucher_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), due_date: "", po_reference: "", description: "", expense_account: "", tax_rate: "16" });
  const [items, setItems] = reactExports.useState([{ description: "", qty: "1", rate: "", amount: "" }]);
  const [hospitalName, setHospitalName] = reactExports.useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = reactExports.useState(null);
  const load = async () => {
    setLoading(true);
    const [{ data: pv }, { data: s }, { data: sys }] = await Promise.all([
      supabase.from("purchase_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").order("name"),
      supabase.from("system_settings").select("key,value").in("key", ["hospital_name", "system_logo_url"])
    ]);
    setRows(pv || []);
    setSuppliers(s || []);
    const m = {};
    (sys || []).forEach((x) => {
      if (x.key) m[x.key] = x.value;
    });
    if (m.hospital_name) setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const updateItem = (i, k, v) => {
    setItems((p) => {
      const n = [...p];
      n[i] = { ...n[i], [k]: v };
      if (k === "qty" || k === "rate") n[i].amount = String(Number(n[i].qty || 0) * Number(n[i].rate || 0));
      return n;
    });
  };
  const subtotal = items.reduce((s, it) => s + Number(it.amount || 0), 0);
  const taxAmt = subtotal * Number(form.tax_rate || 0) / 100;
  const total = subtotal + taxAmt;
  const save = async () => {
    if (!form.supplier_name || items.length === 0) {
      toast({ title: "Fill required fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      voucher_number: genNo$1(),
      supplier_id: form.supplier_id || null,
      subtotal,
      tax_amount: taxAmt,
      amount: total,
      line_items: items,
      status: "pending",
      created_by: user?.id,
      created_by_name: profile?.full_name
    };
    const { data, error } = await supabase.from("purchase_vouchers").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      logAudit(user?.id, profile?.full_name, "create", "purchase_vouchers", data?.id, { number: payload.voucher_number });
      toast({ title: "Purchase Voucher created ✓" });
      setShowNew(false);
      load();
    }
    setSaving(false);
  };
  const approve = async (id) => {
    await supabase.from("purchase_vouchers").update({ status: "approved", approved_by: user?.id, approved_by_name: profile?.full_name }).eq("id", id);
    toast({ title: "Approved ✓" });
    load();
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete?")) return;
    await supabase.from("purchase_vouchers").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Purchase Vouchers");
    writeFileSync(wb, `purchase_vouchers_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const printVoucher = (v) => {
    const w = window.open("", "_blank", "width=1000,height=700");
    if (!w) return;
    const logo = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain">` : "";
    const itemsHtml = (v.line_items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${it.description}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtKES$1(Number(it.rate || 0))}</td><td style="text-align:right">${fmtKES$1(Number(it.amount || 0))}</td></tr>`).join("");
    w.document.write(`<html><head><title>Purchase Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#1e3a5f;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-size:9px;text-transform:uppercase;font-weight:700}
    td{padding:5px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#e0f2fe;font-weight:800}.meta td:first-child{font-weight:700;color:#6b7280;width:30%}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>PURCHASE VOUCHER — ${v.voucher_number}</small></div></div>
    <div class="body">
      <table class="meta" style="margin-bottom:16px;font-size:11px">
        <tr><td>Supplier</td><td style="font-weight:700;font-size:13px">${v.supplier_name}</td><td style="font-weight:700;color:#6b7280">Date</td><td>${new Date(v.voucher_date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
        <tr><td>Invoice No.</td><td>${v.invoice_number || "—"}</td><td style="font-weight:700;color:#6b7280">PO Reference</td><td>${v.po_reference || "—"}</td></tr>
        <tr><td>Due Date</td><td>${v.due_date ? new Date(v.due_date).toLocaleDateString("en-KE") : "—"}</td><td style="font-weight:700;color:#6b7280">Status</td><td>${v.status}</td></tr>
        <tr><td>Expense Account</td><td colspan="3">${v.expense_account || "—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${itemsHtml}
        <tr><td colspan="4" style="text-align:right;font-weight:700">Subtotal</td><td>${fmtKES$1(v.subtotal)}</td></tr>
        <tr><td colspan="4" style="text-align:right;font-weight:700">VAT ${v.tax_rate || 16}%</td><td>${fmtKES$1(v.tax_amount)}</td></tr>
        <tr class="total-row"><td colspan="4" style="text-align:right;font-size:13px">TOTAL</td><td style="font-size:13px">${fmtKES$1(v.amount)}</td></tr>
      </tbody></table>
    </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };
  const filtered = search ? rows.filter((r) => Object.values(r).some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAmt = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", style: { fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-5 py-3 flex items-center justify-between", style: { background: "linear-gradient(90deg,#7c2d12,#b45309)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-black text-white", children: "Purchase Vouchers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-white/50", children: [
          rows.length,
          " records · Total: ",
          fmtKES$1(totalAmt)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", style: { background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
          "Export"
        ] }),
        canCreate && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), className: "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold", style: { background: "rgba(255,255,255,0.92)", color: "#7c2d12" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
          "New Voucher"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search…", className: "w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#fff7ed" }, children: ["Voucher No.", "Supplier", "Invoice No.", "Date", "Amount", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-gray-300 mx-auto" }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center text-gray-400 text-xs", children: "No purchase vouchers" }) }) : filtered.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold", style: { color: "#7c2d12" }, children: r.voucher_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: r.supplier_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500", children: r.invoice_number || "—" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: new Date(r.voucher_date).toLocaleDateString("en-KE") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold", children: fmtKES$1(r.amount) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full text-[9px] font-bold", style: { background: `${SC$1[r.status] || "#9ca3af"}20`, color: SC$1[r.status] || "#9ca3af" }, children: r.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(r), className: "p-1.5 rounded-lg bg-blue-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3 h-3 text-blue-600" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => printVoucher(r), className: "p-1.5 rounded-lg bg-green-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-3 h-3 text-green-600" }) }),
          canApprove && r.status === "pending" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approve(r.id), className: "p-1.5 rounded-lg bg-emerald-50", title: "Approve", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-3 h-3 text-emerald-600" }) }),
          hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), className: "p-1.5 rounded-lg bg-red-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3 text-red-500" }) })
        ] }) })
      ] }, r.id)) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: () => setShowNew(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 overflow-y-auto max-h-[90vh] space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-black text-gray-800", children: "New Purchase Voucher" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Supplier *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: form.supplier_id,
                onChange: (e) => {
                  const s = suppliers.find((x) => x.id === e.target.value);
                  setForm((p) => ({ ...p, supplier_id: e.target.value, supplier_name: s?.name || "" }));
                },
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
                  suppliers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.name }, s.id))
                ]
              }
            )
          ] }),
          [["Invoice No.", "invoice_number"], ["Date", "voucher_date", "date"], ["Due Date", "due_date", "date"], ["PO Reference", "po_reference"], ["Expense Account", "expense_account"], ["Tax Rate (%)", "tax_rate", "number"]].map(([l, k, t]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t || "text", value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
          ] }, k))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gray-700 uppercase", children: "Line Items" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setItems((p) => [...p, { description: "", qty: "1", rate: "", amount: "" }]), className: "flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3 h-3" }),
              "Add"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", style: { borderCollapse: "collapse" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#fff7ed" }, children: ["Description", "Qty", "Rate", "Amount", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-left font-bold text-gray-600 text-[10px]", children: h }, h)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              items.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: it.description, onChange: (e) => updateItem(i, "description", e.target.value), className: "w-full px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: it.qty, onChange: (e) => updateItem(i, "qty", e.target.value), className: "w-14 px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: it.rate, onChange: (e) => updateItem(i, "rate", e.target.value), className: "w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1 font-semibold text-right", children: fmtKES$1(Number(it.amount || 0)) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setItems((p) => p.filter((_, j) => j !== i)), className: "text-red-400", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3 h-3" }) }) })
              ] }, i)),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#fff7ed" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "px-2 py-2 text-right text-xs font-bold", children: "Subtotal" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right text-xs font-bold", children: fmtKES$1(subtotal) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#fff7ed" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 3, className: "px-2 py-2 text-right text-xs font-bold", children: [
                  "VAT ",
                  form.tax_rate || 16,
                  "%"
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right text-xs font-bold", children: fmtKES$1(taxAmt) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#fde68a", fontWeight: 900 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "px-2 py-2 text-right text-sm font-black", children: "TOTAL" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-2 text-right text-sm font-black", children: fmtKES$1(total) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), className: "px-4 py-2 rounded-xl border text-sm", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, className: "flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold", style: { background: "#7c2d12" }, children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-3.5 h-3.5" }),
            saving ? "Saving…" : "Create Voucher"
          ] })
        ] })
      ] })
    ] })
  ] });
}
const fmtKES = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const genNo = () => `SV-EL5H-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Math.floor(1e3 + Math.random() * 9e3))}`;
const SC = { confirmed: "#15803d", pending: "#d97706", cancelled: "#dc2626" };
function SalesVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer");
  const [rows, setRows] = reactExports.useState([]);
  const [depts, setDepts] = reactExports.useState([]);
  const [items, setItems] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ customer_name: "", customer_type: "walk_in", patient_number: "", payment_method: "Cash", voucher_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), due_date: "", description: "", income_account: "", department_id: "", tax_rate: "16" });
  const [lineItems, setLineItems] = reactExports.useState([{ item_id: "", item_name: "", qty: "1", rate: "", amount: "" }]);
  const [hospitalName, setHospitalName] = reactExports.useState("Embu Level 5 Hospital");
  const [logoUrl, setLogoUrl] = reactExports.useState(null);
  const load = async () => {
    setLoading(true);
    const [{ data: sv }, { data: d }, { data: it }, { data: s }] = await Promise.all([
      supabase.from("sales_vouchers").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("id,name").order("name"),
      supabase.from("items").select("id,name,unit_price").where ? supabase.from("items").select("id,name,unit_price").order("name") : supabase.from("items").select("id,name,unit_price").order("name"),
      supabase.from("system_settings").select("key,value").in("key", ["hospital_name", "system_logo_url"])
    ]);
    setRows(sv || []);
    setDepts(d || []);
    setItems(it || []);
    const m = {};
    (s || []).forEach((x) => {
      if (x.key) m[x.key] = x.value;
    });
    if (m.hospital_name) setHospitalName(m.hospital_name);
    if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const updateLine = (i, k, v) => {
    setLineItems((p) => {
      const n = [...p];
      n[i] = { ...n[i], [k]: v };
      if (k === "item_id") {
        const it = items.find((x) => x.id === v);
        if (it) {
          n[i].item_name = it.name;
          n[i].rate = String(it.unit_price || 0);
        }
      }
      if (k === "qty" || k === "rate") n[i].amount = String(Number(n[i].qty || 0) * Number(n[i].rate || 0));
      return n;
    });
  };
  const subtotal = lineItems.reduce((s, it) => s + Number(it.amount || 0), 0);
  const taxAmt = subtotal * Number(form.tax_rate || 0) / 100;
  const total = subtotal + taxAmt;
  const save = async () => {
    if (!form.customer_name) {
      toast({ title: "Customer name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      voucher_number: genNo(),
      subtotal,
      tax_amount: taxAmt,
      amount: total,
      department_id: form.department_id || null,
      line_items: lineItems,
      status: "confirmed",
      created_by: user?.id,
      created_by_name: profile?.full_name
    };
    const { data, error } = await supabase.from("sales_vouchers").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      logAudit(user?.id, profile?.full_name, "create", "sales_vouchers", data?.id, { number: payload.voucher_number });
      toast({ title: "Sales Voucher created ✓" });
      setShowNew(false);
      load();
    }
    setSaving(false);
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete?")) return;
    await supabase.from("sales_vouchers").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Sales Vouchers");
    writeFileSync(wb, `sales_vouchers_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const printVoucher = (v) => {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const logo = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain">` : "";
    const lh = (v.line_items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${it.item_name || it.description || ""}</td><td style="text-align:right">${it.qty}</td><td style="text-align:right">${fmtKES(Number(it.rate || 0))}</td><td style="text-align:right">${fmtKES(Number(it.amount || 0))}</td></tr>`).join("");
    w.document.write(`<html><head><title>Sales Voucher</title>
    <style>body{font-family:'Segoe UI',Arial;margin:0;padding:0;font-size:11px}
    .lh{background:#065f46;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
    .lh-info h2{margin:0;font-size:16px;font-weight:900}.body{padding:20px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#065f46;color:#fff;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
    td{padding:5px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even) td{background:#f9fafb}
    .total-row td{background:#d1fae5;font-weight:800}.meta td:first-child{font-weight:700;color:#6b7280;width:30%}
    @media print{@page{margin:1cm}}</style></head><body>
    <div class="lh">${logo}<div class="lh-info"><h2>${hospitalName}</h2><small>SALES VOUCHER — ${v.voucher_number}</small></div></div>
    <div class="body">
      <table class="meta" style="margin-bottom:16px;font-size:11px">
        <tr><td>Customer</td><td style="font-weight:700;font-size:13px">${v.customer_name}</td><td style="font-weight:700;color:#6b7280">Type</td><td>${v.customer_type}</td></tr>
        ${v.patient_number ? `<tr><td>Patient No.</td><td>${v.patient_number}</td><td></td><td></td></tr>` : ""}
        <tr><td>Date</td><td>${new Date(v.voucher_date).toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</td><td style="font-weight:700;color:#6b7280">Payment</td><td>${v.payment_method}</td></tr>
        <tr><td>Status</td><td>${v.status}</td><td style="font-weight:700;color:#6b7280">Created By</td><td>${v.created_by_name || "—"}</td></tr>
      </table>
      <table><thead><tr><th>#</th><th>Item / Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${lh}
        <tr><td colspan="4" style="text-align:right;font-weight:700">Subtotal</td><td>${fmtKES(v.subtotal)}</td></tr>
        <tr><td colspan="4" style="text-align:right;font-weight:700">VAT ${v.tax_rate || 16}%</td><td>${fmtKES(v.tax_amount)}</td></tr>
        <tr class="total-row"><td colspan="4" style="text-align:right;font-size:13px">TOTAL</td><td style="font-size:13px">${fmtKES(v.amount)}</td></tr>
      </tbody></table>
    </div></body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };
  const filtered = search ? rows.filter((r) => Object.values(r).some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAmt = filtered.reduce((s, r) => s + Number(r.amount || 0), 0);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", style: { fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-5 py-3 flex items-center justify-between", style: { background: "linear-gradient(90deg,#065f46,#0d9488)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-black text-white", children: "Sales Vouchers" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-white/50", children: [
          rows.length,
          " records · Total: ",
          fmtKES(totalAmt)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", style: { background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
          "Export"
        ] }),
        canCreate && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), className: "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold", style: { background: "rgba(255,255,255,0.92)", color: "#065f46" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
          "New Sale"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative max-w-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search…", className: "w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#ecfdf5" }, children: ["Voucher No.", "Customer", "Type", "Date", "Amount", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left font-bold text-gray-600 text-[10px] uppercase", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-gray-300 mx-auto" }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, className: "py-8 text-center text-gray-400 text-xs", children: "No sales vouchers" }) }) : filtered.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold", style: { color: "#065f46" }, children: r.voucher_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-medium", children: r.customer_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500 capitalize", children: r.customer_type }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: new Date(r.voucher_date).toLocaleDateString("en-KE") }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-bold", children: fmtKES(r.amount) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full text-[9px] font-bold", style: { background: `${SC[r.status] || "#9ca3af"}20`, color: SC[r.status] || "#9ca3af" }, children: r.status }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(r), className: "p-1.5 rounded-lg bg-blue-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3 h-3 text-blue-600" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => printVoucher(r), className: "p-1.5 rounded-lg bg-green-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { className: "w-3 h-3 text-green-600" }) }),
          hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), className: "p-1.5 rounded-lg bg-red-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3 text-red-500" }) })
        ] }) })
      ] }, r.id)) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: () => setShowNew(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-5 overflow-y-auto max-h-[90vh] space-y-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-black text-gray-800", children: "New Sales Voucher" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          [["Customer Name *", "customer_name"], ["Patient No.", "patient_number"], ["Date", "voucher_date", "date"], ["Due Date", "due_date", "date"], ["Income Account", "income_account"]].map(([l, k, t]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t || "text", value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
          ] }, k)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Customer Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: form.customer_type,
                onChange: (e) => setForm((p) => ({ ...p, customer_type: e.target.value })),
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none",
                children: ["walk_in", "inpatient", "outpatient", "insurance", "government", "corporate"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t, className: "capitalize", children: t.replace(/_/g, " ") }, t))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Payment Method" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                value: form.payment_method,
                onChange: (e) => setForm((p) => ({ ...p, payment_method: e.target.value })),
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none",
                children: ["Cash", "MPESA", "Insurance", "Cheque", "EFT", "Credit"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: m }, m))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Tax Rate (%)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: form.tax_rate, onChange: (e) => setForm((p) => ({ ...p, tax_rate: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Department" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                value: form.department_id,
                onChange: (e) => setForm((p) => ({ ...p, department_id: e.target.value })),
                className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
                  depts.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
                ]
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-xs font-bold text-gray-700 uppercase", children: "Line Items" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setLineItems((p) => [...p, { item_id: "", item_name: "", qty: "1", rate: "", amount: "" }]), className: "flex items-center gap-1 text-xs font-semibold text-teal-700", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3 h-3" }),
              "Add"
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", style: { borderCollapse: "collapse" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#ecfdf5" }, children: ["Item", "Qty", "Rate", "Amount", ""].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-2 py-2 text-left font-bold text-gray-600 text-[10px]", children: h }, h)) }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
              lineItems.map((it, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: it.item_id, onChange: (e) => updateLine(i, "item_id", e.target.value), className: "w-full px-2 py-1 rounded border border-gray-200 text-xs outline-none", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Item —" }),
                  items.map((it2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: it2.id, children: it2.name }, it2.id))
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: it.qty, onChange: (e) => updateLine(i, "qty", e.target.value), className: "w-14 px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1", children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: it.rate, onChange: (e) => updateLine(i, "rate", e.target.value), className: "w-24 px-2 py-1 rounded border border-gray-200 text-xs outline-none" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-1 py-1 font-semibold", children: fmtKES(Number(it.amount || 0)) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setLineItems((p) => p.filter((_, j) => j !== i)), className: "text-red-400", children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-3 h-3" }) }) })
              ] }, i)),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#d1fae5", fontWeight: 900 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 3, className: "px-2 py-1.5 text-right text-sm font-black", children: "TOTAL" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-2 py-1.5 text-sm font-black", children: fmtKES(total) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", {})
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), className: "px-4 py-2 rounded-xl border text-sm", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, className: "flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold", style: { background: "#065f46" }, children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-3.5 h-3.5" }),
            saving ? "Saving…" : "Create Sale"
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  JournalVouchersPage as J,
  PaymentVouchersPage as P,
  ReceiptVouchersPage as R,
  SalesVouchersPage as S,
  PurchaseVouchersPage as a,
  embuLogo as e
};
