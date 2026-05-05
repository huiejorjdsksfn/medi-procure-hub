import { u as useNavigate, r as reactExports, aj as TrendingUp, ak as TrendingDown, ab as PiggyBank, b as ChartColumn, t as Clock, a9 as BookOpen, j as jsxRuntimeExports, R as RefreshCw, h as TriangleAlert, f as Layers, Y as DollarSign, p as CircleCheckBig, l as Download, i as Plus, d as Search, al as SquarePen, w as Trash2, X, q as Save } from "./react-vendor-CySSbiQ5.js";
import { u as useAuth, s as supabase, t as toast, l as logAudit } from "./pages-admin-tba3xNhl.js";
import { u as utils, w as writeFileSync } from "./xlsx-vendor-BSOddODG.js";
const fmt = (n) => `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
function FinancialDashboardPage() {
  useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = reactExports.useState(true);
  const [stats, setStats] = reactExports.useState({
    totalRevenue: 0,
    totalExpenditure: 0,
    budgetAllocated: 0,
    budgetUtilised: 0,
    pendingPayments: 0,
    pendingReceipts: 0,
    journalCount: 0,
    overdraftAccounts: 0
  });
  const [recentVouchers, setRecentVouchers] = reactExports.useState([]);
  const [budgets, setBudgets] = reactExports.useState([]);
  reactExports.useEffect(() => {
    load();
  }, []);
  async function load() {
    setLoading(true);
    try {
      const [pvRes, rvRes, jvRes, bgRes] = await Promise.all([
        supabase.from("payment_vouchers").select("amount,status").limit(200),
        supabase.from("receipt_vouchers").select("amount,status").limit(200),
        supabase.from("journal_vouchers").select("id,status").limit(200),
        supabase.from("budgets").select("*").limit(50)
      ]);
      const pvs = pvRes.data || [];
      const rvs = rvRes.data || [];
      const jvs = jvRes.data || [];
      const bgs = bgRes.data || [];
      const totalExp = pvs.reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);
      const totalRev = rvs.reduce((s, v) => s + (parseFloat(v.amount) || 0), 0);
      const budAlloc = bgs.reduce((s, b) => s + parseFloat(b.allocated_amount || b.amount || 0), 0);
      const budUtil = bgs.reduce((s, b) => s + parseFloat(b.utilised_amount || b.used_amount || 0), 0);
      setStats({
        totalRevenue: totalRev,
        totalExpenditure: totalExp,
        budgetAllocated: budAlloc,
        budgetUtilised: budUtil,
        pendingPayments: pvs.filter((v) => v.status === "pending").length,
        pendingReceipts: rvs.filter((v) => v.status === "pending").length,
        journalCount: jvs.length,
        overdraftAccounts: bgs.filter((b) => parseFloat(b.utilised_amount || 0) > parseFloat(b.allocated_amount || b.amount || 0)).length
      });
      setBudgets(bgs.slice(0, 6));
      const recent = [
        ...pvs.slice(0, 3).map((v) => ({ ...v, type: "Payment", color: "#ef4444" })),
        ...rvs.slice(0, 3).map((v) => ({ ...v, type: "Receipt", color: "#10b981" }))
      ].sort(() => Math.random() - 0.5).slice(0, 6);
      setRecentVouchers(recent);
    } catch {
    }
    setLoading(false);
  }
  const CARDS = [
    { label: "Total Revenue", value: fmt(stats.totalRevenue), icon: TrendingUp, color: "#10b981", bg: "#d1fae5", trend: "+12.4%" },
    { label: "Total Expenditure", value: fmt(stats.totalExpenditure), icon: TrendingDown, color: "#ef4444", bg: "#fee2e2", trend: "+8.1%" },
    { label: "Budget Allocated", value: fmt(stats.budgetAllocated), icon: PiggyBank, color: "#0369a1", bg: "#e0f2fe", trend: null },
    {
      label: "Budget Utilised",
      value: fmt(stats.budgetUtilised),
      icon: ChartColumn,
      color: "#7c3aed",
      bg: "#ede9fe",
      trend: stats.budgetAllocated > 0 ? `${(stats.budgetUtilised / stats.budgetAllocated * 100).toFixed(1)}%` : "0%"
    },
    { label: "Pending Payments", value: stats.pendingPayments.toString(), icon: Clock, color: "#d97706", bg: "#fef3c7", trend: null },
    { label: "Journal Vouchers", value: stats.journalCount.toString(), icon: BookOpen, color: "#374151", bg: "#f3f4f6", trend: null }
  ];
  const MODULES = [
    { label: "Chart of Accounts", path: "/financials/chart-of-accounts", icon: BookOpen, color: "#374151", desc: "GL accounts & balances" },
    { label: "Budgets", path: "/financials/budgets", icon: PiggyBank, color: "#0369a1", desc: "Budget management" },
    { label: "Fixed Assets", path: "/financials/fixed-assets", icon: Layers, color: "#7c3aed", desc: "Asset register" },
    { label: "Payment Vouchers", path: "/vouchers/payment", icon: DollarSign, color: "#ef4444", desc: "Process payments" },
    { label: "Receipt Vouchers", path: "/vouchers/receipt", icon: CircleCheckBig, color: "#10b981", desc: "Record receipts" },
    { label: "Journal Vouchers", path: "/vouchers/journal", icon: BookOpen, color: "#374151", desc: "Journal entries" },
    { label: "Reports", path: "/reports", icon: ChartColumn, color: "#9333ea", desc: "Financial analytics" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 24, background: "#f8fafc", minHeight: "100vh" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }, children: "Financial Dashboard" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 13, color: "#6b7280", margin: "4px 0 0" }, children: "EL5 MediProcure — Finance & Accounts" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: load, style: {
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 13
      }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 14, height: 14, color: "#6b7280" } }),
        " Refresh"
      ] })
    ] }),
    stats.overdraftAccounts > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 16px",
      background: "#fef3c7",
      border: "1px solid #fde68a",
      borderRadius: 8,
      marginBottom: 20,
      fontSize: 13,
      color: "#92400e"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 16, height: 16, flexShrink: 0 } }),
      stats.overdraftAccounts,
      " budget line(s) over allocated limit — review required"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 28 }, children: CARDS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      border: "1px solid #f0f0f0"
    }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "#9ca3af", margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }, children: c.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }, children: loading ? "—" : c.value }),
        c.trend && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: c.color, margin: "4px 0 0", fontWeight: 600 }, children: c.trend })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(c.icon, { style: { width: 18, height: 18, color: c.color } }) })
    ] }) }, c.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }, children: "Budget Lines" }),
        loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#9ca3af", fontSize: 13 }, children: "Loading…" }) : budgets.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#9ca3af", fontSize: 13 }, children: "No budgets yet" }) : budgets.map((b, i) => {
          const alloc = parseFloat(b.allocated_amount || b.amount || 0);
          const used = parseFloat(b.utilised_amount || b.used_amount || 0);
          const pct = alloc > 0 ? Math.min(used / alloc * 100, 100) : 0;
          const over = used > alloc;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600, color: "#374151" }, children: b.name || b.department || `Budget ${i + 1}` }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { color: over ? "#ef4444" : "#6b7280" }, children: [
                pct.toFixed(1),
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 6, background: "#f3f4f6", borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 6, width: `${pct}%`, background: over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#10b981", borderRadius: 3, transition: "width 0.5s" } }) })
          ] }, i);
        }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => navigate("/financials/budgets"), style: { marginTop: 8, fontSize: 12, color: "#0369a1", background: "none", border: "none", cursor: "pointer", padding: 0 }, children: "View all budgets →" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }, children: "Recent Vouchers" }),
        loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#9ca3af", fontSize: 13 }, children: "Loading…" }) : recentVouchers.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#9ca3af", fontSize: 13 }, children: "No vouchers yet" }) : recentVouchers.map((v, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 0",
          borderBottom: i < recentVouchers.length - 1 ? "1px solid #f3f4f6" : "none"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 8, height: 8, borderRadius: "50%", background: v.color } }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 600, color: "#374151" }, children: v.type })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#6b7280" }, children: v.amount ? fmt(parseFloat(v.amount)) : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: {
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: 99,
            background: v.status === "approved" ? "#d1fae5" : v.status === "pending" ? "#fef3c7" : "#f3f4f6",
            color: v.status === "approved" ? "#065f46" : v.status === "pending" ? "#92400e" : "#374151"
          }, children: v.status || "draft" })
        ] }, i))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontSize: 14, fontWeight: 700, color: "#374151", margin: "0 0 12px" }, children: "Finance Modules" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }, children: MODULES.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        onClick: () => navigate(m.path),
        style: {
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 16,
          textAlign: "left",
          cursor: "pointer",
          transition: "box-shadow 0.15s",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
        },
        onMouseEnter: (e) => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)",
        onMouseLeave: (e) => e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
            width: 36,
            height: 36,
            borderRadius: 8,
            background: m.color + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 10
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(m.icon, { style: { width: 16, height: 16, color: m.color } }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 12, fontWeight: 700, color: "#111827", margin: "0 0 3px" }, children: m.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 11, color: "#9ca3af", margin: 0 }, children: m.desc })
        ]
      },
      m.path
    )) })
  ] });
}
const fmtKES$2 = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;
const TYPE_COLORS = { Asset: "#0369a1", Liability: "#dc2626", Equity: "#7c3aed", Revenue: "#15803d", Expense: "#d97706" };
function ChartOfAccountsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("procurement_manager");
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [typeFilter, setTypeFilter] = reactExports.useState("all");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ account_code: "", account_name: "", account_type: "Asset", category: "", parent_code: "", balance: "0", description: "", is_active: true });
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("chart_of_accounts").select("*").order("account_code");
    setRows(data || []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const openEdit = (r) => {
    setEditing(r);
    setForm({ account_code: r.account_code, account_name: r.account_name, account_type: r.account_type, category: r.category || "", parent_code: r.parent_code || "", balance: String(r.balance || 0), description: r.description || "", is_active: r.is_active !== false });
    setShowNew(true);
  };
  const save = async () => {
    if (!form.account_code || !form.account_name) {
      toast({ title: "Code and name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, balance: Number(form.balance) || 0 };
    if (editing) {
      const { error } = await supabase.from("chart_of_accounts").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account updated ✓" });
      }
    } else {
      const { error } = await supabase.from("chart_of_accounts").insert(payload);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created ✓" });
      }
    }
    setSaving(false);
    setShowNew(false);
    setEditing(null);
    load();
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete this account?")) return;
    await supabase.from("chart_of_accounts").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Chart of Accounts");
    writeFileSync(wb, `coa_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const filtered = rows.filter((r) => {
    const ms = !search || r.account_code.includes(search) || r.account_name.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === "all" || r.account_type === typeFilter;
    return ms && mt;
  });
  const TYPES = ["all", "Asset", "Liability", "Equity", "Revenue", "Expense"];
  const totalBalance = filtered.reduce((s, r) => s + Number(r.balance || 0), 0);
  const totalAssets = rows.filter((r) => r.account_type === "Asset").reduce((s, r) => s + Number(r.balance || 0), 0);
  const totalRevenue = rows.filter((r) => r.account_type === "Revenue").reduce((s, r) => s + Number(r.balance || 0), 0);
  const totalExpense = rows.filter((r) => r.account_type === "Expense").reduce((s, r) => s + Number(r.balance || 0), 0);
  const activeAccounts = rows.filter((r) => r.is_active !== false).length;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontFamily: "'Segoe UI',system-ui,sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: "'Segoe UI',system-ui" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }, children: [
        { label: "Total Balance", val: fmtKES$2(totalBalance), bg: "#c0392b" },
        { label: "Total Assets", val: fmtKES$2(totalAssets), bg: "#0e6655" },
        { label: "Total Revenue", val: fmtKES$2(totalRevenue), bg: "#7d6608" },
        { label: "Total Expenses", val: fmtKES$2(totalExpense), bg: "#6c3483" },
        { label: "Active Accounts", val: activeAccounts, bg: "#1a252f" }
      ].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 10, padding: "12px 16px", color: "#fff", textAlign: "center", background: k.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 18, fontWeight: 900, lineHeight: 1 }, children: k.val }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 5, opacity: 0.9, letterSpacing: "0.04em" }, children: k.label })
      ] }, k.label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg,#0f172a,#1e3a5f)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }, children: "Chart of Accounts" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }, children: [
            rows.length,
            " accounts · ",
            filtered.length,
            " shown"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 14, height: 14 } }),
            "Export"
          ] }),
          canManage && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setEditing(null);
            setForm({ account_code: "", account_name: "", account_type: "Asset", category: "", parent_code: "", balance: "0", description: "", is_active: true });
            setShowNew(true);
          }, style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", color: "#1e3a5f" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 14, height: 14 } }),
            "New Account"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search code or name...", style: { paddingLeft: 34, paddingRight: 16, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", width: 208 } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4 }, children: TYPES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setTypeFilter(t),
            style: { padding: "6px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600, textTransform: "capitalize", border: "none", cursor: "pointer", background: typeFilter === t ? TYPE_COLORS[t] || "#1a3a6b" : "#f3f4f6", color: typeFilter === t ? "#fff" : "#6b7280" },
            children: t
          },
          t
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", fontSize: 12, borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#0f172a" }, children: ["Code", "Account Name", "Type", "Category", "Parent", "Balance", "Active", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "left", fontWeight: 700, color: "rgba(255,255,255,0.8)", fontSize: 10, textTransform: "uppercase", padding: "10px 12px" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, style: { padding: "32px 0", textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, style: { padding: "32px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }, children: "No accounts found" }) }) : filtered.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", fontFamily: "monospace", fontWeight: 700, color: "#1e3a5f" }, children: r.account_code }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", fontWeight: 600, color: "#1f2937" }, children: r.account_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: `${TYPE_COLORS[r.account_type] || "#6b7280"}18`, color: TYPE_COLORS[r.account_type] || "#6b7280" }, children: r.account_type }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", color: "#6b7280" }, children: r.category || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", color: "#9ca3af", fontFamily: "monospace", fontSize: 10 }, children: r.parent_code || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", fontWeight: 700, color: Number(r.balance || 0) < 0 ? "#dc2626" : "#15803d" }, children: fmtKES$2(r.balance || 0) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, fontWeight: 700, color: r.is_active !== false ? "#15803d" : "#9ca3af" }, children: r.is_active !== false ? "Active" : "Inactive" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
            canManage && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openEdit(r), style: { padding: 5, borderRadius: 6, background: "#dbeafe", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { style: { width: 12, height: 12, color: "#2563eb" } }) }),
            hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), style: { padding: 5, borderRadius: 6, background: "#fee2e2", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 12, height: 12, color: "#ef4444" } }) })
          ] }) })
        ] }, r.id)) })
      ] }) }),
      showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "fixed", inset: 0, zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }, onClick: () => {
          setShowNew(false);
          setEditing(null);
        } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", width: "min(580px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontWeight: 900, color: "#1f2937", margin: 0 }, children: editing ? "Edit Account" : "New Account" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setShowNew(false);
              setEditing(null);
            }, style: { background: "none", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 20, height: 20, color: "#9ca3af" } }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflowY: "auto", padding: "16px 20px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
            [["Account Code *", "account_code", "", 1], ["Account Name *", "account_name", "", 2], ["Category", "category", "", 1], ["Parent Code", "parent_code", "", 1], ["Opening Balance", "balance", "number", 1]].map(([l, k, t, span]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: `span ${span}` }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: l }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t || "text", value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" } })
            ] }, k)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Account Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  value: form.account_type,
                  onChange: (e) => setForm((p) => ({ ...p, account_type: e.target.value })),
                  style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" },
                  children: ["Asset", "Liability", "Equity", "Revenue", "Expense"].map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: t }, t))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, paddingTop: 16 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", id: "isActive", checked: form.is_active, onChange: (e) => setForm((p) => ({ ...p, is_active: e.target.checked })), style: { accentColor: "#0369a1", width: 16, height: 16 } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: "isActive", style: { fontSize: 14, fontWeight: 600, color: "#374151", cursor: "pointer" }, children: "Active" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1/-1" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Description" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.description, onChange: (e) => setForm((p) => ({ ...p, description: e.target.value })), rows: 2, style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" } })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setShowNew(false);
              setEditing(null);
            }, style: { padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer" }, children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#1e3a5f" }, children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 14, height: 14 } }),
              saving ? "Saving..." : editing ? "Update" : "Create"
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const fmtKES$1 = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
const genCode = () => `BDG-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
const SC$1 = { active: "#15803d", draft: "#6b7280", closed: "#dc2626", exceeded: "#d97706" };
function BudgetsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("procurement_manager");
  const [rows, setRows] = reactExports.useState([]);
  const [depts, setDepts] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ budget_name: "", department_id: "", department_name: "", financial_year: "2025/26", allocated_amount: "", category: "", status: "active", notes: "" });
  const load = async () => {
    setLoading(true);
    const [{ data: b }, { data: d }] = await Promise.all([
      supabase.from("budgets").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("id,name").order("name")
    ]);
    setRows(b || []);
    setDepts(d || []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const openEdit = (b) => {
    setEditing(b);
    setForm({ budget_name: b.budget_name, department_id: b.department_id || "", department_name: b.department_name || "", financial_year: b.financial_year, allocated_amount: String(b.allocated_amount), category: b.category || "", status: b.status, notes: b.notes || "" });
    setShowNew(true);
  };
  const save = async () => {
    if (!form.budget_name || !form.allocated_amount) {
      toast({ title: "Budget name and amount required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const dept = depts.find((d) => d.id === form.department_id);
    const payload = { ...form, budget_code: editing ? editing.budget_code : genCode(), department_name: dept?.name || form.department_name, allocated_amount: Number(form.allocated_amount), department_id: form.department_id || null, created_by: user?.id, created_by_name: profile?.full_name };
    if (editing) {
      const { error } = await supabase.from("budgets").update(payload).eq("id", editing.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        logAudit(user?.id, profile?.full_name, "update", "budgets", editing.id, { name: form.budget_name });
        toast({ title: "Budget updated ✓" });
      }
    } else {
      const { data, error } = await supabase.from("budgets").insert(payload).select().single();
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        logAudit(user?.id, profile?.full_name, "create", "budgets", data?.id, { name: form.budget_name });
        toast({ title: "Budget created ✓" });
      }
    }
    setSaving(false);
    setShowNew(false);
    setEditing(null);
    load();
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete this budget?")) return;
    await supabase.from("budgets").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Budgets");
    writeFileSync(wb, `budgets_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const filtered = search ? rows.filter((r) => Object.values(r).some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()))) : rows;
  const totalAllocated = filtered.reduce((s, r) => s + Number(r.allocated_amount || 0), 0);
  const totalSpent = filtered.reduce((s, r) => s + Number(r.spent_amount || 0), 0);
  const activeCount = filtered.filter((r) => r.status === "active").length;
  const exceededCount = filtered.filter((r) => r.status === "exceeded" || (r.spent_amount || 0) > r.allocated_amount).length;
  const utilizationPct = totalAllocated > 0 ? Math.round(totalSpent / totalAllocated * 100) : 0;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontFamily: "'Segoe UI',system-ui,sans-serif" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:768px){.vpage-header{flex-direction:column!important;align-items:flex-start!important}}
      ` }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: "'Segoe UI',system-ui" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }, children: [
        { label: "Total Allocated", val: fmtKES$1(totalAllocated), bg: "#c0392b" },
        { label: "Total Spent", val: fmtKES$1(totalSpent), bg: "#7d6608" },
        { label: "Remaining Balance", val: fmtKES$1(Math.max(0, totalAllocated - totalSpent)), bg: "#0e6655" },
        { label: "Utilization %", val: `${utilizationPct}%`, bg: "#6c3483" },
        { label: "Active Budgets", val: activeCount, bg: "#1a252f" }
      ].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 10, padding: "12px 16px", color: "#fff", textAlign: "center", background: k.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 900, lineHeight: 1 }, children: k.val }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 5, opacity: 0.9, letterSpacing: "0.04em" }, children: k.label })
      ] }, k.label)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg,#1e1b4b,#3730a3)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }, children: "Budgets" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }, children: [
            rows.length,
            " records · ",
            exceededCount,
            " exceeded"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 14, height: 14 } }),
            "Export"
          ] }),
          canManage && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
            setEditing(null);
            setForm({ budget_name: "", department_id: "", department_name: "", financial_year: "2025/26", allocated_amount: "", category: "", status: "active", notes: "" });
            setShowNew(true);
          }, style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", color: "#3730a3" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 14, height: 14 } }),
            "New Budget"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", maxWidth: 384 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search budgets...", style: { width: "100%", paddingLeft: 34, paddingRight: 16, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: "1.5px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", fontSize: 12, borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#eef2ff" }, children: ["Code", "Budget Name", "Department", "FY", "Allocated", "Spent", "Committed", "% Used", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#4b5563", fontSize: 10, textTransform: "uppercase" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 10, style: { padding: "32px 0", textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 10, style: { padding: "32px 0", textAlign: "center", color: "#9ca3af", fontSize: 12 }, children: "No budgets yet. Create one to get started." }) }) : filtered.map((r, i) => {
          const pct = r.allocated_amount > 0 ? Math.round((r.spent_amount || 0) / r.allocated_amount * 100) : 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", fontFamily: "monospace", fontSize: 10, color: "#6b7280" }, children: r.budget_code }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", fontWeight: 600, color: "#1f2937" }, children: r.budget_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", color: "#6b7280" }, children: r.department_name || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", color: "#6b7280" }, children: r.financial_year }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", fontWeight: 700 }, children: fmtKES$1(r.allocated_amount) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", color: pct > 90 ? "#dc2626" : pct > 70 ? "#d97706" : "#374151" }, children: fmtKES$1(r.spent_amount || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px", color: "#6b7280" }, children: fmtKES$1(r.committed_amount || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 64, height: 6, borderRadius: 3, background: "#e5e7eb", overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: "100%", borderRadius: 3, width: `${Math.min(100, pct)}%`, background: pct > 90 ? "#dc2626" : pct > 70 ? "#d97706" : "#15803d" } }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: pct > 90 ? "#dc2626" : pct > 70 ? "#d97706" : "#374151", fontWeight: 700 }, children: [
                pct,
                "%"
              ] })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 8px", borderRadius: 20, fontSize: 9, fontWeight: 700, background: `${SC$1[r.status] || "#9ca3af"}20`, color: SC$1[r.status] || "#9ca3af" }, children: r.status }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              canManage && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openEdit(r), style: { padding: 5, borderRadius: 6, background: "#dbeafe", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { style: { width: 12, height: 12, color: "#2563eb" } }) }),
              hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), style: { padding: 5, borderRadius: 6, background: "#fee2e2", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 12, height: 12, color: "#ef4444" } }) })
            ] }) })
          ] }, r.id);
        }) })
      ] }) }),
      showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "fixed", inset: 0, zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }, onClick: () => {
          setShowNew(false);
          setEditing(null);
        } }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", width: "min(580px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { fontWeight: 900, color: "#1f2937", margin: 0 }, children: editing ? "Edit Budget" : "New Budget" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setShowNew(false);
              setEditing(null);
            }, style: { background: "none", border: "none", cursor: "pointer" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 20, height: 20, color: "#9ca3af" } }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflowY: "auto", padding: "16px 20px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
            [["Budget Name *", "budget_name", "", 2], ["Financial Year", "financial_year", "", 1], ["Allocated Amount (KES) *", "allocated_amount", "number", 1]].map(([l, k, t, span]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: `span ${span}` }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: l }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: t || "text", value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" } })
            ] }, k)),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Department" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  value: form.department_id,
                  onChange: (e) => setForm((p) => ({ ...p, department_id: e.target.value })),
                  style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
                    depts.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Category" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  value: form.category,
                  onChange: (e) => setForm((p) => ({ ...p, category: e.target.value })),
                  style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
                    ["Pharmaceuticals", "Medical Supplies", "Equipment", "Laboratory", "Construction", "ICT", "Staff Training", "Utilities", "Maintenance", "Other"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: c }, c))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Status" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  value: form.status,
                  onChange: (e) => setForm((p) => ({ ...p, status: e.target.value })),
                  style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" },
                  children: ["active", "draft", "closed"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, style: { textTransform: "capitalize" }, children: s }, s))
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1/-1" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Notes" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.notes, onChange: (e) => setForm((p) => ({ ...p, notes: e.target.value })), rows: 2, style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" } })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end", padding: "12px 20px", borderTop: "1px solid #e5e7eb", flexShrink: 0 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setShowNew(false);
              setEditing(null);
            }, style: { padding: "8px 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#fff", fontSize: 14, cursor: "pointer" }, children: "Cancel" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 10, color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#3730a3" }, children: [
              saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 14, height: 14 } }),
              saving ? "Saving..." : editing ? "Update Budget" : "Create Budget"
            ] })
          ] })
        ] })
      ] })
    ] })
  ] });
}
const fmtKES = (n) => `KES ${Number(n || 0).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;
const genNo = () => `AST/EL5H/${(/* @__PURE__ */ new Date()).getFullYear()}/${String(Math.floor(100 + Math.random() * 9900))}`;
const SC = { active: "#15803d", disposed: "#dc2626", under_maintenance: "#d97706", written_off: "#6b7280" };
const CATS = ["Medical Equipment", "ICT Equipment", "Furniture & Fittings", "Motor Vehicles", "Buildings", "Land", "Office Equipment", "Laboratory Equipment", "Theatre Equipment", "Radiology Equipment"];
function FixedAssetsPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("procurement_manager");
  const [rows, setRows] = reactExports.useState([]);
  const [depts, setDepts] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [catFilter, setCatFilter] = reactExports.useState("all");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [editing, setEditing] = reactExports.useState(null);
  const [detail, setDetail] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ asset_number: "", asset_name: "", category: "", department_id: "", purchase_date: "", purchase_cost: "", useful_life: "", residual_value: "", depreciation_method: "Straight Line", location: "", serial_number: "", supplier_name: "", warranty_expiry: "", condition: "good", status: "active", description: "" });
  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: d }] = await Promise.all([
      supabase.from("fixed_assets").select("*").order("created_at", { ascending: false }),
      supabase.from("departments").select("id,name").order("name")
    ]);
    setRows(a || []);
    setDepts(d || []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const openEdit = (a) => {
    setEditing(a);
    setForm({ asset_number: a.asset_number, asset_name: a.asset_name, category: a.category || "", department_id: a.department_id || "", purchase_date: a.purchase_date || "", purchase_cost: String(a.purchase_cost || 0), useful_life: String(a.useful_life || 0), residual_value: String(a.residual_value || 0), depreciation_method: a.depreciation_method || "Straight Line", location: a.location || "", serial_number: a.serial_number || "", supplier_name: a.supplier_name || "", warranty_expiry: a.warranty_expiry || "", condition: a.condition || "good", status: a.status || "active", description: a.description || "" });
    setShowNew(true);
  };
  const calcDepreciation = () => {
    const cost = Number(form.purchase_cost || 0);
    const residual = Number(form.residual_value || 0);
    const life = Number(form.useful_life || 1);
    const annual = (cost - residual) / Math.max(life, 1);
    const yearsSince = form.purchase_date ? (/* @__PURE__ */ new Date()).getFullYear() - new Date(form.purchase_date).getFullYear() : 0;
    const accumulated = Math.min(annual * yearsSince, cost - residual);
    return { annual, accumulated, nbv: cost - accumulated };
  };
  const save = async () => {
    if (!form.asset_name || !form.category) {
      toast({ title: "Asset name and category required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { annual, accumulated, nbv } = calcDepreciation();
    const dept = depts.find((d) => d.id === form.department_id);
    const payload = { ...form, asset_number: editing ? editing.asset_number : genNo(), department_id: form.department_id || null, department_name: dept?.name || "", purchase_cost: Number(form.purchase_cost || 0), useful_life: Number(form.useful_life || 0), residual_value: Number(form.residual_value || 0), annual_depreciation: annual, accumulated_depreciation: accumulated, net_book_value: nbv, created_by: user?.id, created_by_name: profile?.full_name };
    if (editing) {
      const { error } = await supabase.from("fixed_assets").update(payload).eq("id", editing.id);
      if (!error) {
        logAudit(user?.id, profile?.full_name, "update", "fixed_assets", editing.id, { name: form.asset_name });
        toast({ title: "Asset updated ✓" });
      } else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const { data, error } = await supabase.from("fixed_assets").insert(payload).select().single();
      if (!error) {
        logAudit(user?.id, profile?.full_name, "create", "fixed_assets", data?.id, { name: form.asset_name });
        toast({ title: "Asset registered ✓" });
      } else toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
    setShowNew(false);
    setEditing(null);
    load();
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete this asset?")) return;
    await supabase.from("fixed_assets").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "Fixed Assets");
    writeFileSync(wb, `fixed_assets_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const filtered = rows.filter((r) => {
    const ms = !search || (r.asset_name || "").toLowerCase().includes(search.toLowerCase()) || (r.asset_number || "").includes(search);
    const mc = catFilter === "all" || (r.category || "") === catFilter;
    return ms && mc;
  });
  const totalCost = filtered.reduce((s, r) => s + Number(r.purchase_cost || 0), 0);
  const totalNBV = filtered.reduce((s, r) => s + Number(r.net_book_value || 0), 0);
  const F = ({ label, k, type = "text", span = 1, req = false }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: `span ${span}` }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: [
      label,
      req && " *"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        type,
        value: form[k] || "",
        onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })),
        style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }
      }
    )
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 12, fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }, children: [
      { label: "Total Asset Cost", val: fmtKES(totalCost), bg: "#c0392b" },
      { label: "Net Book Value", val: fmtKES(totalNBV), bg: "#0e6655" },
      { label: "Total Depreciation", val: fmtKES(totalCost - totalNBV), bg: "#7d6608" },
      { label: "Asset Count", val: rows.length, bg: "#6c3483" },
      { label: "Active Assets", val: rows.filter((r) => r.status === "active").length, bg: "#1a252f" }
    ].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 10, padding: "12px 16px", color: "#fff", textAlign: "center", background: k.bg, boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 18, fontWeight: 900, lineHeight: 1 }, children: k.val }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 5, opacity: 0.9, letterSpacing: "0.04em" }, children: k.label })
    ] }, k.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderRadius: 12, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg,#1a3a6b,#0a2558)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }, children: "Fixed Assets Register" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }, children: [
          rows.length,
          " assets · Cost: ",
          fmtKES(totalCost),
          " · NBV: ",
          fmtKES(totalNBV)
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 14, height: 14 } }),
          "Export"
        ] }),
        canManage && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setEditing(null);
          setForm({ asset_number: "", asset_name: "", category: "", department_id: "", purchase_date: "", purchase_cost: "", useful_life: "", residual_value: "", depreciation_method: "Straight Line", location: "", serial_number: "", supplier_name: "", warranty_expiry: "", condition: "good", status: "active", description: "" });
          setShowNew(true);
        }, style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.92)", color: "#1a3a6b" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 14, height: 14 } }),
          "Register Asset"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#9ca3af" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search assets...", style: { paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", width: 220 } })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: catFilter, onChange: (e) => setCatFilter(e.target.value), style: { padding: "7px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", cursor: "pointer" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All Categories" }),
        CATS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: c }, c))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: load, style: { padding: "7px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, cursor: "pointer", background: "#f9fafb" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 } }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#0a2558" }, children: ["Asset No.", "Name", "Category", "Dept.", "Purchase Cost", "Net Book Value", "Condition", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { textAlign: "left", fontWeight: 700, color: "rgba(255,255,255,0.8)", fontSize: 10, textTransform: "uppercase", padding: "10px 12px", whiteSpace: "nowrap" }, children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, style: { padding: 40, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 18, height: 18, color: "#d1d5db", animation: "spin 1s linear infinite", display: "block", margin: "0 auto" } }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, style: { padding: 40, textAlign: "center", color: "#9ca3af" }, children: "No assets found" }) }) : filtered.map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "tr",
        {
          style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" },
          onMouseEnter: (e) => e.currentTarget.style.background = "#eff6ff",
          onMouseLeave: (e) => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa",
          onClick: () => setDetail(r),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#1a3a6b" }, children: r.asset_number }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 700, color: "#1f2937", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: r.asset_name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280" }, children: r.category || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280" }, children: r.department_name || "—" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 600, color: "#374151" }, children: fmtKES(r.purchase_cost || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 700, color: "#15803d" }, children: fmtKES(r.net_book_value || 0) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "capitalize", background: "#f3f4f6", color: "#374151" }, children: r.condition || "—" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "capitalize", background: `${SC[r.status] || "#9ca3af"}18`, color: SC[r.status] || "#9ca3af" }, children: (r.status || "").replace(/_/g, " ") }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
              canManage && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => openEdit(r), style: { padding: "4px 8px", background: "#dbeafe", border: "none", borderRadius: 6, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { style: { width: 12, height: 12, color: "#2563eb" } }) }),
              hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), style: { padding: "4px 8px", background: "#fee2e2", border: "none", borderRadius: 6, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 12, height: 12, color: "#dc2626" } }) })
            ] }) })
          ]
        },
        r.id
      )) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 16, width: "min(640px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 20px", background: "linear-gradient(90deg,#1a3a6b,#0a2558)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 800, color: "#fff", flex: 1 }, children: editing ? "Edit Asset" : "Register Fixed Asset" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setShowNew(false);
          setEditing(null);
        }, style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflowY: "auto", padding: 18 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Asset Name *", k: "asset_name", span: 2, req: true }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Category *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.category, onChange: (e) => setForm((p) => ({ ...p, category: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
            CATS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: c }, c))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Department" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.department_id, onChange: (e) => setForm((p) => ({ ...p, department_id: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select —" }),
            depts.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d.id, children: d.name }, d.id))
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Purchase Date", k: "purchase_date", type: "date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Purchase Cost (KES)", k: "purchase_cost", type: "number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Useful Life (years)", k: "useful_life", type: "number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Residual Value (KES)", k: "residual_value", type: "number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Depreciation Method" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.depreciation_method, onChange: (e) => setForm((p) => ({ ...p, depreciation_method: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }, children: ["Straight Line", "Reducing Balance", "Sum of Years"].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: m }, m)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Location", k: "location" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Serial Number", k: "serial_number" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Supplier Name", k: "supplier_name" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Warranty Expiry", k: "warranty_expiry", type: "date" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Condition" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.condition, onChange: (e) => setForm((p) => ({ ...p, condition: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }, children: ["excellent", "good", "fair", "poor"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { style: { textTransform: "capitalize" }, children: c }, c)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.status, onChange: (e) => setForm((p) => ({ ...p, status: e.target.value })), style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }, children: ["active", "under_maintenance", "disposed", "written_off"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s.replace(/_/g, " ") }, s)) })
        ] }),
        form.purchase_cost && form.useful_life && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1/-1", padding: 12, borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 4 }, children: "Depreciation Preview" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 12 }, children: [["Annual Dep.", fmtKES(calcDepreciation().annual)], ["Accumulated", fmtKES(calcDepreciation().accumulated)], ["Net Book Value", fmtKES(calcDepreciation().nbv)]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { color: "#6b7280", margin: "0 0 2px" }, children: l }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { style: { fontWeight: 700, color: "#1f2937", margin: 0 }, children: v })
          ] }, l)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "1/-1" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", marginBottom: 4, fontSize: 12, fontWeight: 600, color: "#6b7280" }, children: "Description" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.description, onChange: (e) => setForm((p) => ({ ...p, description: e.target.value })), rows: 2, style: { width: "100%", padding: "8px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" } })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
          setShowNew(false);
          setEditing(null);
        }, style: { padding: "8px 16px", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: "#1a3a6b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }, children: [
          saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13, animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
          saving ? "Saving..." : editing ? "Update Asset" : "Register Asset"
        ] })
      ] })
    ] }) }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 16, width: "min(540px,100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 20px", background: "linear-gradient(90deg,#1a3a6b,#0a2558)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 800, color: "#fff", flex: 1 }, children: detail.asset_name }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflowY: "auto", padding: 18 }, children: [["Asset No.", detail.asset_number], ["Category", detail.category], ["Department", detail.department_name], ["Location", detail.location], ["Serial No.", detail.serial_number], ["Purchase Cost", fmtKES(detail.purchase_cost || 0)], ["Net Book Value", fmtKES(detail.net_book_value || 0)], ["Annual Depreciation", fmtKES(detail.annual_depreciation || 0)], ["Useful Life", `${detail.useful_life || 0} years`], ["Residual Value", fmtKES(detail.residual_value || 0)], ["Supplier", detail.supplier_name], ["Warranty Expires", detail.warranty_expiry], ["Condition", detail.condition], ["Status", (detail.status || "").replace(/_/g, " ")], ["Registered By", detail.created_by_name]].filter(([_l, v]) => v).map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f3f4f6" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 600, color: "#9ca3af" }, children: l }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 700, color: "#1f2937", textAlign: "right", textTransform: "capitalize" }, children: v })
      ] }, l)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 18px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), style: { flex: 1, padding: "8px", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Close" }),
        canManage && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => {
          setDetail(null);
          openEdit(detail);
        }, style: { flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px", background: "#1a3a6b", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { style: { width: 13, height: 13 } }),
          "Edit Asset"
        ] })
      ] })
    ] }) })
  ] });
}
export {
  BudgetsPage as B,
  ChartOfAccountsPage as C,
  FinancialDashboardPage as F,
  FixedAssetsPage as a
};
