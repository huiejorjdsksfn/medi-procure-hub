import { r as reactExports, j as jsxRuntimeExports, e as ChevronDown, d as Search, X, R as RefreshCw } from "./react-vendor-CySSbiQ5.js";
import { u as useAuth, s as supabase, t as toast } from "./pages-admin-tba3xNhl.js";
import { u as utils, w as writeFileSync } from "./xlsx-vendor-BSOddODG.js";
const fmtKES = (n) => n >= 1e6 ? `KES ${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `KES ${(n / 1e3).toFixed(2)}K` : `KES ${Number(n || 0).toFixed(2)}`;
const REPORT_TYPES = [
  { id: "requisitions", label: "Requisitions", table: "requisitions" },
  { id: "purchase_orders", label: "Purchase Orders", table: "purchase_orders" },
  { id: "goods_received", label: "Goods Received Notes", table: "goods_received" },
  { id: "suppliers", label: "Suppliers", table: "suppliers" },
  { id: "items", label: "Inventory Items", table: "items" },
  { id: "payment_vouchers", label: "Payment Vouchers", table: "payment_vouchers" },
  { id: "receipt_vouchers", label: "Receipt Vouchers", table: "receipt_vouchers" },
  { id: "journal_vouchers", label: "Journal Vouchers", table: "journal_vouchers" },
  { id: "purchase_vouchers", label: "Purchase Vouchers", table: "purchase_vouchers" },
  { id: "contracts", label: "Contracts", table: "contracts" },
  { id: "tenders", label: "Tenders", table: "tenders" },
  { id: "bid_evaluations", label: "Bid Evaluations", table: "bid_evaluations" },
  { id: "procurement_plans", label: "Procurement Plan", table: "procurement_plans" },
  { id: "budgets", label: "Budgets", table: "budgets" },
  { id: "inspections", label: "QC Inspections", table: "inspections" },
  { id: "non_conformance", label: "Non-Conformance", table: "non_conformance" },
  { id: "audit_log", label: "Audit Log", table: "audit_log" }
];
const TX_TYPE_FILTER = ["ALL", "Purchase", "Receipt", "Payment", "Issue", "Transfer"];
function ReportsPage() {
  useAuth();
  const [reportType, setReportType] = reactExports.useState(REPORT_TYPES[0]);
  const [startDate, setStartDate] = reactExports.useState(new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = reactExports.useState((/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
  const [search, setSearch] = reactExports.useState("");
  const [txFilter, setTxFilter] = reactExports.useState("ALL");
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const [kpi, setKpi] = reactExports.useState({ purchase: 0, received: 0, profit: 0, qty: 0, invAmt: 0 });
  const [hospitalName, setHospitalName] = reactExports.useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = reactExports.useState("EL5 MediProcure");
  const [logoUrl, setLogoUrl] = reactExports.useState(null);
  const [stockList, setStockList] = reactExports.useState([]);
  const [stockSearch, setStockSearch] = reactExports.useState("");
  const [showDropdown, setShowDropdown] = reactExports.useState(false);
  reactExports.useEffect(() => {
    supabase.from("system_settings").select("key,value").in("key", ["system_name", "hospital_name", "system_logo_url"]).then(({ data }) => {
      if (!data) return;
      const m = {};
      data.forEach((r) => {
        if (r.key) m[r.key] = r.value;
      });
      if (m.system_name) setSysName(m.system_name);
      if (m.hospital_name) setHospitalName(m.hospital_name);
      if (m.system_logo_url) setLogoUrl(m.system_logo_url);
    });
    supabase.from("items").select("id,name,quantity_in_stock,unit_price").order("name").then(({ data }) => setStockList(data || []));
  }, []);
  const loadReport = reactExports.useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase.from(reportType.table).select("*");
      if (startDate) q = q.gte("created_at", startDate);
      if (endDate) q = q.lte("created_at", endDate + "T23:59:59");
      q = q.order("created_at", { ascending: false }).limit(500);
      const { data, error } = await q;
      if (error) throw error;
      const d = data || [];
      setRows(d);
      const purchaseAmt = d.reduce((s, r) => s + Number(r.total_amount || r.amount || r.subtotal || 0), 0);
      const totalQty = d.reduce((s, r) => s + Number(r.quantity || r.quantity_in_stock || 0), 0);
      setKpi({
        purchase: purchaseAmt,
        received: purchaseAmt * 0.85,
        profit: purchaseAmt * 0.15,
        qty: totalQty || d.length,
        invAmt: d.reduce((s, r) => s + Number(r.total_value || r.net_book_value || 0), 0) || purchaseAmt
      });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, [reportType, startDate, endDate]);
  reactExports.useEffect(() => {
    loadReport();
  }, [loadReport]);
  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    return Object.values(r).some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()));
  });
  const filteredStock = stockSearch ? stockList.filter((s) => s.name.toLowerCase().includes(stockSearch.toLowerCase())) : stockList;
  const columns = filteredRows.length > 0 ? Object.keys(filteredRows[0]).filter((k) => !["id", "updated_at"].includes(k)).slice(0, 8) : [];
  const exportExcel = () => {
    const wb = utils.book_new();
    const header = [[hospitalName], [`${reportType.label} Report`], [`Period: ${startDate} to ${endDate}`], [`Generated: ${(/* @__PURE__ */ new Date()).toLocaleString("en-KE")}`], []];
    const ws = utils.aoa_to_sheet([...header, columns, ...filteredRows.map((r) => columns.map((c) => r[c] ?? ""))]);
    ws["!cols"] = columns.map(() => ({ wch: 18 }));
    utils.book_append_sheet(wb, ws, reportType.label.slice(0, 30));
    writeFileSync(wb, `${reportType.id}_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported", description: `${filteredRows.length} records` });
  };
  const printReport = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px">` : "";
    const cols = columns;
    const rowsHtml = filteredRows.map((r) => `<tr>${cols.map((c) => `<td>${r[c] ?? ""}</td>`).join("")}</tr>`).join("");
    win.document.write(`<html><head><title>${reportType.label}</title>
    <style>
      body{font-family:'Segoe UI',Arial;margin:0;padding:16px;font-size:11px}
      .lh{background:#0a2558;color:#fff;padding:12px 16px;margin:-16px -16px 16px;display:flex;align-items:center;gap:10px}
      .lh-info h2{margin:0;font-size:16px} .lh-info small{opacity:0.6;font-size:10px}
      .kpi-row{display:flex;gap:10px;margin-bottom:14px}
      .kpi{flex:1;padding:10px 14px;border-radius:6px;color:#fff;text-align:center}
      .kpi .val{font-size:18px;font-weight:900} .kpi .lbl{font-size:9px;opacity:0.85;font-weight:700;margin-top:2px}
      table{width:100%;border-collapse:collapse;font-size:10px}
      thead tr{background:#0a2558;color:#fff}
      th{padding:6px 8px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase}
      td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
      tr:nth-child(even) td{background:#f9fafb}
      .footer{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#9ca3af;text-align:center}
      @media print{@page{margin:1.2cm}body{margin:0}}
    </style></head><body>
    <div class="lh">${logoHtml}<div class="lh-info"><h2>${hospitalName}</h2><small>${reportType.label} Report · ${startDate} to ${endDate}</small></div></div>
    <div class="kpi-row">
      <div class="kpi" style="background:#c0392b"><div class="val">${fmtKES(kpi.purchase)}</div><div class="lbl">Total Value</div></div>
      <div class="kpi" style="background:#7d6608"><div class="val">${fmtKES(kpi.received)}</div><div class="lbl">Received</div></div>
      <div class="kpi" style="background:#0e6655"><div class="val">${fmtKES(kpi.profit)}</div><div class="lbl">Balance</div></div>
      <div class="kpi" style="background:#6c3483"><div class="val">${kpi.qty.toLocaleString()}</div><div class="lbl">Quantity</div></div>
      <div class="kpi" style="background:#1a252f"><div class="val">${fmtKES(kpi.invAmt)}</div><div class="lbl">Inventory</div></div>
    </div>
    <table><thead><tr>${cols.map((c) => `<th>${c.replace(/_/g, " ")}</th>`).join("")}</tr></thead>
    <tbody>${rowsHtml}</tbody></table>
    <div class="footer">${hospitalName} · ${sysName} · Printed ${(/* @__PURE__ */ new Date()).toLocaleString("en-KE")}</div>
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#e8eaf0", minHeight: "calc(100vh-80px)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#d4d0c8", borderBottom: "2px solid #999", padding: "6px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between flex-wrap gap-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        logoUrl && /* @__PURE__ */ jsxRuntimeExports.jsx("img", { src: logoUrl, style: { height: 36, objectFit: "contain" }, alt: "" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 18, fontWeight: 900, color: "#1a1a2e", margin: 0, lineHeight: 1 }, children: hospitalName }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 11, color: "#555", margin: 0 }, children: [
            "Reports & Data Extraction — ",
            reportType.label
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#ececec", border: "1px solid #aaa", borderRadius: 4, padding: "6px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { border: "1px solid #aaa", padding: "2px 4px", borderRadius: 3 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#555", fontWeight: 700 }, children: "Date Range" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, color: "#333", fontWeight: 600 }, children: "Start Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { border: "2px inset #aaa", background: "rgba(255,255,255,0.92)", padding: "2px 6px", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              value: startDate,
              onChange: (e) => setStartDate(e.target.value),
              style: { border: "none", background: "transparent", fontSize: 11, outline: "none", color: "#1a1a2e" }
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, color: "#333", fontWeight: 600 }, children: "End Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { border: "2px inset #aaa", background: "rgba(255,255,255,0.92)", padding: "2px 6px", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "date",
              value: endDate,
              onChange: (e) => setEndDate(e.target.value),
              style: { border: "none", background: "transparent", fontSize: 11, outline: "none", color: "#1a1a2e" }
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: loadReport,
            style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "3px 14px", fontSize: 12, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e" },
            children: "Refresh"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => setShowDropdown((v) => !v),
              className: "flex items-center gap-2",
              style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "4px 12px", fontSize: 12, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e", minWidth: 160 },
              children: [
                reportType.label,
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronDown, { className: "w-3.5 h-3.5 ml-auto" })
              ]
            }
          ),
          showDropdown && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "absolute top-full left-0 z-50 w-56 max-h-64 overflow-y-auto",
              style: { background: "rgba(255,255,255,0.92)", border: "1px solid #aaa", boxShadow: "2px 2px 6px rgba(0,0,0,0.2)" },
              children: REPORT_TYPES.map((rt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  onClick: () => {
                    setReportType(rt);
                    setShowDropdown(false);
                  },
                  className: "block w-full text-left px-3 py-1.5 text-xs hover:bg-blue-600 hover:text-white transition-colors",
                  style: { color: reportType.id === rt.id ? "#1d4ed8" : "#1a1a2e", fontWeight: reportType.id === rt.id ? 700 : 400 },
                  children: rt.label
                },
                rt.id
              ))
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: printReport,
            style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "4px 14px", fontSize: 12, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e" },
            children: "🖨 Print"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: exportExcel,
            style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "4px 14px", fontSize: 12, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e" },
            children: "💾 Save"
          }
        )
      ] })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#d4d0c8", borderBottom: "2px solid #999", padding: "8px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-5 gap-2", children: [
      { label: "Total Value", value: fmtKES(kpi.purchase), bg: "#c0392b" },
      { label: "Received Amt.", value: fmtKES(kpi.received), bg: "#7d6608" },
      { label: "Balance", value: fmtKES(kpi.profit), bg: "#0e6655" },
      { label: "Record Count", value: filteredRows.length.toLocaleString(), bg: "#6c3483" },
      { label: "Inventory Amt.", value: fmtKES(kpi.invAmt), bg: "#1a252f" }
    ].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "rounded-md p-3 text-white text-center",
        style: { background: k.bg, border: `3px outset ${k.bg}` },
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 900, lineHeight: 1 }, children: k.value }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, fontWeight: 700, marginTop: 4, opacity: 0.9, letterSpacing: "0.05em" }, children: k.label })
        ]
      },
      k.label
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-0", style: { height: "calc(100vh - 230px)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 200, background: "#d4d0c8", borderRight: "2px solid #999", display: "flex", flexDirection: "column", flexShrink: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#d4d0c8", borderBottom: "1px solid #aaa", padding: "6px 8px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "#1a1a2e" }, children: "Available Stocks" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "4px 6px", borderBottom: "1px solid #aaa", background: "#d4d0c8" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#555", marginBottom: 2 }, children: "Search" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { border: "2px inset #aaa", background: "rgba(255,255,255,0.92)", padding: "1px 4px", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: stockSearch,
              onChange: (e) => setStockSearch(e.target.value),
              placeholder: "",
              style: { border: "none", background: "transparent", fontSize: 10, outline: "none", flex: 1, color: "#1a1a2e" }
            }
          ) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "overflow-auto flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: "#4472C4", color: "#fff" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "3px 6px", textAlign: "left", fontWeight: 700, borderRight: "1px solid #6698d4" }, children: "Product Name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "3px 6px", textAlign: "right", fontWeight: 700 }, children: "Stock" })
          ] }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredStock.slice(0, 50).map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { background: i % 2 === 0 ? "#dce6f1" : "#c9d9ef" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "2px 6px", borderRight: "1px solid #b8cce4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }, children: s.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "2px 6px", textAlign: "right", fontWeight: 600 }, children: s.quantity_in_stock || 0 })
          ] }, s.id)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "4px 6px", borderTop: "1px solid #aaa", background: "#d4d0c8", display: "flex", gap: 4 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setStockSearch(""),
              style: { flex: 1, background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", fontSize: 10, fontWeight: 700, padding: "2px 0", borderRadius: 2, cursor: "pointer" },
              children: "Refresh"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              style: { flex: 1, background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", fontSize: 10, fontWeight: 700, padding: "2px 0", borderRadius: 2, cursor: "pointer" },
              children: "Extract"
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", background: "#d4d0c8" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#d4d0c8", border: "2px inset #aaa", margin: "6px 8px 4px", padding: "6px 10px", borderRadius: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, fontWeight: 700, color: "#1a1a2e", marginBottom: 6 }, children: [
            reportType.label,
            " — Add / Extract"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-wrap gap-3 items-end", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#333" }, children: "Search" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { border: "2px inset #aaa", background: "rgba(255,255,255,0.92)", padding: "2px 6px", borderRadius: 2, display: "flex", alignItems: "center", gap: 4 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "w-3 h-3", style: { color: "#888" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "input",
                  {
                    value: search,
                    onChange: (e) => setSearch(e.target.value),
                    placeholder: "Filter records…",
                    style: { border: "none", background: "transparent", fontSize: 10, outline: "none", width: 140, color: "#1a1a2e" }
                  }
                ),
                search && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setSearch(""), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-2.5 h-2.5", style: { color: "#888" } }) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 10, fontWeight: 700, color: "#333" }, children: "Type" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { border: "2px inset #aaa", background: "rgba(255,255,255,0.92)", borderRadius: 2 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "select",
                {
                  value: txFilter,
                  onChange: (e) => setTxFilter(e.target.value),
                  style: { border: "none", background: "transparent", fontSize: 10, padding: "2px 6px", outline: "none", color: "#1a1a2e" },
                  children: TX_TYPE_FILTER.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: t }, t))
                }
              ) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-auto flex gap-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                onClick: loadReport,
                disabled: loading,
                style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "3px 14px", fontSize: 11, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e" },
                children: loading ? "Loading…" : "Extract"
              }
            ) })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "2px 12px 4px", display: "flex", gap: 16, alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "#1a1a2e" }, children: "Show Records:" }),
          ["ALL", "Latest 100", "This Month"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "flex items-center gap-1 cursor-pointer", style: { fontSize: 11 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "txview", value: v, defaultChecked: v === "ALL", style: { accentColor: "#1a3a6b" } }),
            v
          ] }, v)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: "auto", fontSize: 10, color: "#666" }, children: [
            filteredRows.length,
            " records"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, margin: "0 8px 8px", border: "2px inset #aaa", background: "rgba(255,255,255,0.92)", overflow: "auto" }, children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-center h-32", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-5 h-5 animate-spin", style: { color: "#888" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "#888", marginLeft: 8 }, children: "Loading…" })
        ] }) : filteredRows.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center h-32", style: { fontSize: 11, color: "#888" }, children: "No data. Select a report and click Extract." }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 10, minWidth: "max-content" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#4472C4", color: "#fff", position: "sticky", top: 0 }, children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "5px 8px", textAlign: "left", fontWeight: 700, fontSize: 10, whiteSpace: "nowrap", borderRight: "1px solid #6698d4", textTransform: "capitalize" }, children: c.replace(/_/g, " ") }, c)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: filteredRows.slice(0, 200).map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: i % 2 === 0 ? "#dce6f1" : "#c9d9ef", borderBottom: "1px solid #b8cce4" }, children: columns.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "3px 8px", borderRight: "1px solid #b8cce4", whiteSpace: "nowrap", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", color: "#1a1a2e" }, children: row[c] === null || row[c] === void 0 ? "" : typeof row[c] === "string" && row[c].match(/^\d{4}-\d{2}-\d{2}/) ? new Date(row[c]).toLocaleDateString("en-KE") : typeof row[c] === "number" ? row[c].toLocaleString() : String(row[c]).slice(0, 60) }, c)) }, i)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "2px solid #999", background: "#d4d0c8", padding: "4px 8px", display: "flex", gap: 8, alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: printReport,
              style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "3px 16px", fontSize: 11, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 },
              children: "🖨 Print Report"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: exportExcel,
              style: { background: "linear-gradient(180deg,#f0f0f0,#d4d0c8)", border: "2px outset #aaa", padding: "3px 16px", fontSize: 11, fontWeight: 700, borderRadius: 3, cursor: "pointer", color: "#1a1a2e", display: "flex", alignItems: "center", gap: 6 },
              children: "📊 Export Excel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 10, color: "#666", marginLeft: 8 }, children: [
            filteredRows.length,
            " records · ",
            startDate,
            " to ",
            endDate
          ] })
        ] })
      ] })
    ] })
  ] });
}
const TABS = [
  { id: "workspace", label: "Workspace", icon: "-", color: "#059669" },
  { id: "invoice_matching", label: "Invoice Match", icon: "-", color: "#f97316" },
  { id: "payments", label: "Payments", icon: "-", color: "#3b82f6" },
  { id: "budget", label: "Budget Control", icon: "-", color: "#8b5cf6" },
  { id: "erp_sync", label: "ERP Sync", icon: "-", color: "#06b6d4" },
  { id: "journal", label: "Journal/Ledger", icon: "-", color: "#ec4899" },
  { id: "quotations", label: "Quotations", icon: "-", color: "#eab308" },
  { id: "reports", label: "Reports", icon: "-", color: "#6366f1" }
];
const STATUS_COLORS = {
  pending: "#f97316",
  approved: "#22c55e",
  matched: "#22c55e",
  rejected: "#ef4444",
  processing: "#3b82f6",
  completed: "#22c55e",
  failed: "#ef4444",
  draft: "#6b7280",
  sent: "#3b82f6",
  paid: "#22c55e",
  cancelled: "#ef4444",
  over_budget: "#ef4444",
  warning: "#f97316"
};
function statusBadge(status) {
  const color = STATUS_COLORS[status] || "#6b7280";
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}33`, textTransform: "uppercase", letterSpacing: "0.04em" }, children: status });
}
function fmt(n) {
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(s) {
  return new Date(s).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
}
function AccountantWorkspacePage() {
  const [tab, setTab] = reactExports.useState("workspace");
  const [kpis, setKpis] = reactExports.useState([]);
  const [syncQueue, setSyncQueue] = reactExports.useState([]);
  const [invoiceMatches, setInvoiceMatches] = reactExports.useState([]);
  const [budgetAlerts, setBudgetAlerts] = reactExports.useState([]);
  const [quotations, setQuotations] = reactExports.useState([]);
  const [glEntries, setGlEntries] = reactExports.useState([]);
  const [payments, setPayments] = reactExports.useState([]);
  const [supplierList, setSupplierList] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [syncing, setSyncing] = reactExports.useState(false);
  const [showNewQuotation, setShowNewQuotation] = reactExports.useState(false);
  const [newQuote, setNewQuote] = reactExports.useState({ supplier_id: "", notes: "", valid_until: "", total_amount: "" });
  const [localToast, setLocalToast] = reactExports.useState("");
  const [reportType, setReportType] = reactExports.useState("invoice_summary");
  const [exportLoading, setExportLoading] = reactExports.useState(false);
  const showToast = (msg) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(""), 3500);
  };
  const fetchAll = reactExports.useCallback(async () => {
    setLoading(true);
    try {
      const [
        { count: pendingInvoices },
        { count: pendingSync },
        { count: activeAlerts },
        { data: payData },
        { data: syncs },
        { data: invoices },
        { data: alerts },
        { data: quotes },
        { data: gl },
        { data: suppliers },
        { data: payVouchers }
      ] = await Promise.all([
        supabase.from("invoice_matching").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("erp_sync_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("budget_alerts").select("*", { count: "exact", head: true }).eq("override_approved", false),
        supabase.from("payment_vouchers").select("total_amount").eq("status", "approved").limit(100),
        supabase.from("erp_sync_queue").select("*").order("created_at", { ascending: false }).limit(25),
        supabase.from("invoice_matching").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("budget_alerts").select("*").order("created_at", { ascending: false }).limit(25),
        supabase.from("quotations").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("gl_entries").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("suppliers").select("id, name").eq("status", "active").limit(100),
        supabase.from("payment_vouchers").select("*").order("created_at", { ascending: false }).limit(40)
      ]);
      const totalApproved = (payData || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      setKpis([
        { label: "Pending Invoice Matches", value: pendingInvoices ?? 0, sub: "Awaiting 3-way match", color: "#f97316", icon: "-" },
        { label: "ERP Sync Queue", value: pendingSync ?? 0, sub: "Pending to Dynamics 365", color: "#3b82f6", icon: "-", trend: (pendingSync ?? 0) > 5 ? "- High" : "- Normal" },
        { label: "Budget Alerts", value: activeAlerts ?? 0, sub: "Over-budget requests pending", color: "#ef4444", icon: "-" },
        { label: "Approved Payments", value: fmt(totalApproved), sub: "This period", color: "#22c55e", icon: "-" }
      ]);
      setSyncQueue(syncs || []);
      setInvoiceMatches(invoices || []);
      setBudgetAlerts((alerts || []).map((a) => ({ ...a, message: a.alert_type || a.message || "", severity: a.status || "warning" })));
      setQuotations(quotes || []);
      setGlEntries(gl || []);
      setPayments(payVouchers || []);
      setSupplierList(suppliers || []);
    } catch (e) {
      console.error("AccountantWorkspace fetch error:", e);
    }
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    fetchAll();
  }, [fetchAll]);
  reactExports.useEffect(() => {
    const ch = supabase.channel("accountant_realtime_v58").on("postgres_changes", { event: "*", schema: "public", table: "erp_sync_queue" }, fetchAll).on("postgres_changes", { event: "*", schema: "public", table: "budget_alerts" }, fetchAll).on("postgres_changes", { event: "*", schema: "public", table: "invoice_matching" }, fetchAll).on("postgres_changes", { event: "*", schema: "public", table: "quotations" }, fetchAll).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);
  async function triggerManualSync() {
    setSyncing(true);
    const { error } = await supabase.from("erp_sync_queue").insert({
      sync_type: "manual_sync",
      direction: "push",
      status: "pending",
      is_manual: true,
      payload: { triggered_by: "accountant_workspace_v58", timestamp: (/* @__PURE__ */ new Date()).toISOString() }
    });
    setSyncing(false);
    if (!error) {
      showToast("- Manual sync queued to Dynamics 365!");
      fetchAll();
    } else showToast("- Sync failed: " + error.message);
  }
  async function approveInvoiceMatch(id) {
    const { error } = await supabase.from("invoice_matching").update({ status: "matched" }).eq("id", id);
    if (!error) {
      showToast("- Invoice match approved!");
      fetchAll();
    } else showToast("- " + error.message);
  }
  async function rejectInvoiceMatch(id) {
    const { error } = await supabase.from("invoice_matching").update({ status: "rejected" }).eq("id", id);
    if (!error) {
      showToast("- Invoice match rejected.");
      fetchAll();
    } else showToast("- " + error.message);
  }
  async function approveBudgetOverride(id) {
    const { error } = await supabase.from("budget_alerts").update({ override_approved: true, status: "approved" }).eq("id", id);
    if (!error) {
      showToast("- Budget override approved!");
      fetchAll();
    } else showToast("- " + error.message);
  }
  async function createQuotation() {
    if (!newQuote.total_amount) {
      showToast("- Enter a total amount.");
      return;
    }
    const qNum = `QT-${(/* @__PURE__ */ new Date()).getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { error } = await supabase.from("quotations").insert({
      quotation_number: qNum,
      supplier_id: newQuote.supplier_id || null,
      notes: newQuote.notes,
      valid_until: newQuote.valid_until || null,
      total_amount: parseFloat(newQuote.total_amount) || 0,
      status: "draft"
    });
    if (!error) {
      showToast(`- Quotation ${qNum} created!`);
      setShowNewQuotation(false);
      setNewQuote({ supplier_id: "", notes: "", valid_until: "", total_amount: "" });
      fetchAll();
    } else showToast("- " + error.message);
  }
  async function sendQuotation(id) {
    const { error } = await supabase.from("quotations").update({ status: "sent" }).eq("id", id);
    if (!error) {
      showToast("- Quotation sent to supplier!");
      fetchAll();
    } else showToast("- " + error.message);
  }
  async function approvePayment(id) {
    const { error } = await supabase.from("payment_vouchers").update({ status: "approved" }).eq("id", id);
    if (!error) {
      showToast("- Payment approved!");
      fetchAll();
    } else showToast("- " + error.message);
  }
  async function exportReport() {
    setExportLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    let rows = [];
    let filename = "";
    if (reportType === "invoice_summary") {
      rows = ["PO Number,GRN Number,Invoice Number,Status,Amount,Created", ...invoiceMatches.map((i) => `${i.po_number || ""},${i.grn_number || ""},${i.invoice_number || ""},${i.status},${i.amount || 0},${fmtDate(i.created_at)}`)];
      filename = "invoice_summary.csv";
    } else if (reportType === "payment_register") {
      rows = ["Voucher,Payee,Amount,Status,Method,Date", ...payments.map((p) => `${p.voucher_number || ""},${p.payee || ""},${p.total_amount || 0},${p.status},${p.payment_method || ""},${fmtDate(p.created_at)}`)];
      filename = "payment_register.csv";
    } else if (reportType === "budget_alerts") {
      rows = ["Alert Type,Status,Budget Code,Override Approved,Date", ...budgetAlerts.map((b) => `${b.message || ""},${b.severity || ""},${b.budget_code || ""},${b.override_approved ? "Yes" : "No"},${fmtDate(b.created_at)}`)];
      filename = "budget_alerts.csv";
    } else {
      rows = ["Account,Debit,Credit,Description,Reference,Date", ...glEntries.map((g) => `${g.gl_account || ""},${g.debit || 0},${g.credit || 0},${g.description || ""},${g.reference || ""},${fmtDate(g.created_at)}`)];
      filename = "gl_entries.csv";
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setExportLoading(false);
    showToast("- Report exported!");
  }
  const card = { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" };
  const tblHead = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", background: "#f8fafc", textAlign: "left" };
  const tblCell = { fontSize: 13, color: "#374151", padding: "11px 14px", borderBottom: "1px solid #f8fafc" };
  const inputS = { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#374151" };
  const btnPrimary = { padding: "9px 18px", background: "linear-gradient(135deg,#059669,#047857)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" };
  const btnSm = (color) => ({ padding: "5px 12px", background: `${color}12`, color, border: `1px solid ${color}30`, borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1400, margin: "0 auto" }, children: [
    localToast && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", top: 20, right: 20, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", animation: "slideIn 0.2s ease" }, children: localToast }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#059669,#047857)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }, children: "Accountant Workspace" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "EL5 MediProcure v5.8 - Finance & Procurement Bridge - Dynamics 365 ERP" })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "6px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#059669" }, children: "- ERP Connected" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: triggerManualSync, disabled: syncing, style: { ...btnPrimary, display: "flex", alignItems: "center", gap: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { display: "inline-block", animation: syncing ? "spin 1s linear infinite" : "none" }, children: "-" }),
          syncing ? "Syncing-" : "Sync to D365"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: fetchAll, style: { padding: "9px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }, children: "- Refresh" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 24 }, children: kpis.map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { ...card, borderLeft: `4px solid ${k.color}`, padding: "18px 20px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }, children: k.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }, children: loading ? "-" : k.value }),
        k.sub && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 4 }, children: k.sub }),
        k.trend && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: k.color, marginTop: 4, fontWeight: 600 }, children: k.trend })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 26 }, children: k.icon })
    ] }) }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", paddingBottom: 4, borderBottom: "2px solid #f1f5f9", flexWrap: "nowrap" }, children: TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setTab(t.id), style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 16px",
      borderRadius: "8px 8px 0 0",
      background: tab === t.id ? t.color : "transparent",
      color: tab === t.id ? "#fff" : "#6b7280",
      border: tab === t.id ? `1.5px solid ${t.color}` : "1.5px solid transparent",
      borderBottom: tab === t.id ? "none" : void 0,
      fontSize: 12.5,
      fontWeight: tab === t.id ? 700 : 500,
      cursor: "pointer",
      whiteSpace: "nowrap",
      boxShadow: tab === t.id ? `0 4px 12px ${t.color}30` : "none",
      transition: "all 0.15s"
    }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: t.icon }),
      t.label
    ] }, t.id)) }),
    tab === "workspace" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }, children: "- ERP Connection Status" }),
        [
          { label: "Dynamics 365 Connection", status: "Connected", color: "#22c55e" },
          { label: "GL Account Sync", status: "Active", color: "#22c55e" },
          { label: "Vendor Master Sync", status: "Active", color: "#22c55e" },
          { label: "Payment Status Pull", status: "Active", color: "#22c55e" },
          { label: "Invoice Push", status: "Enabled", color: "#3b82f6" },
          { label: "PO Sync", status: "Enabled", color: "#3b82f6" }
        ].map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 5 ? "1px solid #f8fafc" : void 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, color: "#374151" }, children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: row.color, background: `${row.color}12`, padding: "2px 10px", borderRadius: 12, border: `1px solid ${row.color}25` }, children: row.status })
        ] }, i))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a" }, children: "- Approval Tasks" }),
        loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#9ca3af", fontSize: 13 }, children: "Loading-" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          invoiceMatches.filter((i) => i.status === "pending").slice(0, 4).map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 13, fontWeight: 600, color: "#374151" }, children: [
                "Invoice #",
                inv.invoice_number || inv.id.slice(-6)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af" }, children: "3-way match pending" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approveInvoiceMatch(inv.id), style: btnSm("#22c55e"), children: "- Match" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => rejectInvoiceMatch(inv.id), style: btnSm("#ef4444"), children: "-" })
            ] })
          ] }, inv.id)),
          budgetAlerts.filter((b) => !b.override_approved).slice(0, 3).map((alert) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#374151" }, children: alert.message || alert.alert_type || "Budget Alert" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af" }, children: "Budget override request" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approveBudgetOverride(alert.id), style: btnSm("#8b5cf6"), children: "Approve Override" })
          ] }, alert.id)),
          invoiceMatches.filter((i) => i.status === "pending").length === 0 && budgetAlerts.filter((b) => !b.override_approved).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "20px 0", color: "#9ca3af", fontSize: 13 }, children: "- No pending tasks" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a" }, children: "- Quick Actions" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }, children: [
          { label: "New Quotation", icon: "-", action: () => {
            setTab("quotations");
            setShowNewQuotation(true);
          }, color: "#eab308" },
          { label: "Sync to ERP", icon: "-", action: triggerManualSync, color: "#06b6d4" },
          { label: "Export Report", icon: "-", action: () => setTab("reports"), color: "#6366f1" },
          { label: "Budget Review", icon: "-", action: () => setTab("budget"), color: "#8b5cf6" },
          { label: "Payment Run", icon: "-", action: () => setTab("payments"), color: "#3b82f6" },
          { label: "GL Entries", icon: "-", action: () => setTab("journal"), color: "#ec4899" }
        ].map((a, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: a.action,
            style: { padding: "12px", background: `${a.color}08`, border: `1.5px solid ${a.color}22`, borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "#374151", transition: "all 0.15s" },
            onMouseEnter: (e) => {
              e.currentTarget.style.background = `${a.color}18`;
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = `${a.color}08`;
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 18 }, children: a.icon }),
              a.label
            ]
          },
          i
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#0f172a" }, children: "- Recent ERP Syncs" }),
        syncQueue.slice(0, 6).map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f8fafc" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "#374151" }, children: s.sync_type || s.entity_type || "sync" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af" }, children: [
              fmtDate(s.created_at),
              " - ",
              s.direction
            ] })
          ] }),
          statusBadge(s.status)
        ] }, s.id)),
        syncQueue.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#9ca3af", fontSize: 13, textAlign: "center", padding: "12px 0" }, children: "No sync records" })
      ] })
    ] }),
    tab === "invoice_matching" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 17, color: "#0f172a" }, children: "- Three-Way Invoice Matching" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "Match Purchase Orders - Goods Received Notes - Supplier Invoices" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 10 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { style: { ...inputS, width: "auto" }, defaultValue: "all", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pending", children: "Pending" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "matched", children: "Matched" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "rejected", children: "Rejected" })
        ] }) })
      ] }),
      loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af" }, children: "Loading invoice matches-" }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { overflowX: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["PO Number", "GRN Number", "Invoice Number", "Supplier", "Amount", "Status", "GL Verified", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: tblHead, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: invoiceMatches.map((inv) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              style: { transition: "background 0.15s" },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
              onMouseLeave: (e) => e.currentTarget.style.background = "",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600 }, children: inv.po_number || "-" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: inv.grn_number || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: inv.invoice_number || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: inv.supplier || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600, color: "#059669" }, children: fmt(inv.amount || 0) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: statusBadge(inv.status) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 16 }, children: "-" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: inv.status === "pending" ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approveInvoiceMatch(inv.id), style: btnSm("#22c55e"), children: "- Approve" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => rejectInvoiceMatch(inv.id), style: btnSm("#ef4444"), children: "- Reject" })
                ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#9ca3af" }, children: "-" }) })
              ]
            },
            inv.id
          )) })
        ] }),
        invoiceMatches.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }, children: "No invoice matches found" })
      ] })
    ] }),
    tab === "payments" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 17, color: "#0f172a" }, children: "- Payment Management" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "Create - Approve - Export Payment Proposals" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { style: { ...btnPrimary, background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }, children: "+ New Payment Run" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            setReportType("payment_register");
            exportReport();
          }, style: { ...btnPrimary, background: "linear-gradient(135deg,#6366f1,#4f46e5)" }, children: "- Export" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { overflowX: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Voucher #", "Payee", "Amount", "Method", "Status", "Due Date", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: tblHead, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: payments.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
              onMouseLeave: (e) => e.currentTarget.style.background = "",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600, color: "#3b82f6" }, children: p.voucher_number || p.id.slice(-8) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: p.payee || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 700, color: "#059669" }, children: fmt(p.total_amount || 0) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { textTransform: "capitalize" }, children: p.payment_method || "bank" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: statusBadge(p.status) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: p.due_date ? fmtDate(p.due_date) : "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: p.status === "pending" || p.status === "draft" ? /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approvePayment(p.id), style: btnSm("#22c55e"), children: "- Approve" }) : /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#9ca3af" }, children: "-" }) })
              ]
            },
            p.id
          )) })
        ] }),
        payments.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }, children: "No payment vouchers found" })
      ] })
    ] }),
    tab === "budget" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gap: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 17, color: "#0f172a", marginBottom: 4 }, children: "- Budget Control & Monitoring" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 20 }, children: "Monitor budget consumption - Approve over-budget requests - Vote head tracking" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { overflowX: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Alert Type", "Budget Code", "Consumed %", "Status", "Override Approved", "Date", "Action"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: tblHead, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: budgetAlerts.map((b) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
              onMouseLeave: (e) => e.currentTarget.style.background = "",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: b.message || b.alert_type || "Budget Alert" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "monospace", fontWeight: 600 }, children: b.budget_code || "-" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: "100%", width: `${Math.min(b.consumed_pct || 0, 100)}%`, background: (b.consumed_pct || 0) > 90 ? "#ef4444" : (b.consumed_pct || 0) > 75 ? "#f97316" : "#22c55e", borderRadius: 3, transition: "width 0.5s" } }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 12, fontWeight: 700 }, children: [
                    b.consumed_pct || 0,
                    "%"
                  ] })
                ] }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: statusBadge(b.severity || b.status || "warning") }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 16 }, children: b.override_approved ? "-" : "-" }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: fmtDate(b.created_at) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: !b.override_approved && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => approveBudgetOverride(b.id), style: btnSm("#8b5cf6"), children: "Approve Override" }) })
              ]
            },
            b.id
          )) })
        ] }),
        budgetAlerts.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }, children: "- No budget alerts" })
      ] })
    ] }) }),
    tab === "erp_sync" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gap: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 17, color: "#0f172a" }, children: "- ERP Synchronisation Module" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "Bidirectional data flow - Dynamics 365 - Azure Logic Apps middleware" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: triggerManualSync, disabled: syncing, style: btnPrimary, children: syncing ? "- Syncing-" : "- Manual Sync" }),
          [
            { label: "Push POs", type: "purchase_orders_push" },
            { label: "Push Receipts", type: "grn_push" },
            { label: "Pull Vendors", type: "vendor_master_pull" },
            { label: "Pull GL", type: "gl_accounts_pull" }
          ].map((btn) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: async () => {
            await supabase.from("erp_sync_queue").insert({ sync_type: btn.type, direction: btn.type.includes("pull") ? "pull" : "push", status: "pending", is_manual: true, payload: {} });
            showToast(`- ${btn.label} queued!`);
            fetchAll();
          }, style: { ...btnPrimary, background: "linear-gradient(135deg,#0e7490,#0c6380)", fontSize: 12, padding: "8px 14px" }, children: btn.label }, btn.type))
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }, children: [
        { label: "Push to D365", desc: "POs - GRNs - Invoices - Journal Entries", icon: "-", color: "#3b82f6" },
        { label: "Pull from D365", desc: "Vendor Master - GL Accounts - Payment Status", icon: "-", color: "#22c55e" }
      ].map((dir, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "16px", background: `${dir.color}08`, border: `1.5px solid ${dir.color}20`, borderRadius: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 22, marginBottom: 6 }, children: dir.icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, color: "#0f172a", fontSize: 14 }, children: dir.label }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 4 }, children: dir.desc })
      ] }, i)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Type", "Direction", "Status", "Manual", "GL Verified", "Timestamp"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: tblHead, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: syncQueue.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
            onMouseLeave: (e) => e.currentTarget.style.background = "",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600 }, children: s.sync_type || s.entity_type || "sync" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: tblCell, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 16 }, children: s.direction === "push" ? "-" : "-" }),
                " ",
                s.direction
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: statusBadge(s.status) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14 }, children: s.is_manual ? "-" : "-" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14 }, children: s.gl_verified ? "-" : "-" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: fmtDate(s.created_at) })
            ]
          },
          s.id
        )) })
      ] }),
      syncQueue.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }, children: "No sync records yet" })
    ] }) }),
    tab === "journal" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 17, color: "#0f172a", marginBottom: 4 }, children: "- Journal & GL Ledger View" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginBottom: 20 }, children: "Drill-down into ERP postings - GL account entries - Debit/Credit ledger" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { overflowX: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["GL Account", "Description", "Reference", "Debit (KES)", "Credit (KES)", "Net", "Status", "Date"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: tblHead, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: glEntries.map((g) => {
            const net = (g.debit || 0) - (g.credit || 0);
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "tr",
              {
                onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
                onMouseLeave: (e) => e.currentTarget.style.background = "",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "monospace", fontWeight: 700, color: "#3b82f6" }, children: g.gl_account || "-" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: g.description || "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "monospace", fontSize: 12 }, children: g.reference || "-" }) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tblCell, color: "#059669", fontWeight: 600 }, children: g.debit ? fmt(g.debit) : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tblCell, color: "#ef4444", fontWeight: 600 }, children: g.credit ? fmt(g.credit) : "-" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tblCell, fontWeight: 700, color: net >= 0 ? "#059669" : "#ef4444" }, children: fmt(Math.abs(net)) }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: statusBadge(g.status || "posted") }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: fmtDate(g.created_at) })
                ]
              },
              g.id
            );
          }) })
        ] }),
        glEntries.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }, children: "No GL entries found" })
      ] })
    ] }),
    tab === "quotations" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gap: 20 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 17, color: "#0f172a" }, children: "- Quotation Creator" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "Create - Send - Manage supplier quotation requests" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNewQuotation((v) => !v), style: btnPrimary, children: showNewQuotation ? "- Cancel" : "+ New Quotation" })
      ] }),
      showNewQuotation && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f8fafc", borderRadius: 12, padding: "20px", marginBottom: 20, border: "1.5px solid #e2e8f0" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 16 }, children: "- New Quotation" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }, children: "Supplier" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: newQuote.supplier_id, onChange: (e) => setNewQuote((q) => ({ ...q, supplier_id: e.target.value })), style: inputS, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "- Select Supplier -" }),
              supplierList.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.name }, s.id))
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }, children: "Total Amount (KES)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: newQuote.total_amount, onChange: (e) => setNewQuote((q) => ({ ...q, total_amount: e.target.value })), style: inputS, placeholder: "0.00" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }, children: "Valid Until" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: newQuote.valid_until, onChange: (e) => setNewQuote((q) => ({ ...q, valid_until: e.target.value })), style: inputS })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 3" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }, children: "Notes / Terms" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: newQuote.notes, onChange: (e) => setNewQuote((q) => ({ ...q, notes: e.target.value })), style: { ...inputS, height: 72, resize: "vertical" }, placeholder: "Quotation terms, scope, delivery notes-" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNewQuotation(false), style: { padding: "9px 18px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#374151" }, children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: createQuotation, style: btnPrimary, children: "- Create Quotation" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { overflowX: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: ["Quotation #", "Supplier", "Amount", "Valid Until", "Status", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: tblHead, children: h }, h)) }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: quotations.map((q) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "tr",
            {
              onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc",
              onMouseLeave: (e) => e.currentTarget.style.background = "",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 700, color: "#eab308" }, children: q.quotation_number }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: q.supplier_name || supplierList.find((s) => s.id === q.supplier_id)?.name || "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontWeight: 600, color: "#059669" }, children: fmt(q.total_amount || 0) }) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: q.valid_until ? fmtDate(q.valid_until) : "-" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: statusBadge(q.status) }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: tblCell, children: q.status === "draft" && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => sendQuotation(q.id), style: btnSm("#3b82f6"), children: "- Send" }) })
              ]
            },
            q.id
          )) })
        ] }),
        quotations.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "40px", color: "#9ca3af", fontSize: 14 }, children: "No quotations yet. Create one above." })
      ] })
    ] }) }),
    tab === "reports" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 16 }, children: "- Report Types" }),
        [
          { value: "invoice_summary", label: "Invoice Summary", icon: "-", color: "#f97316" },
          { value: "payment_register", label: "Payment Register", icon: "-", color: "#3b82f6" },
          { value: "budget_alerts", label: "Budget Alerts Report", icon: "-", color: "#8b5cf6" },
          { value: "gl_entries", label: "GL Entries Report", icon: "-", color: "#ec4899" },
          { value: "erp_sync_log", label: "ERP Sync Log", icon: "-", color: "#06b6d4" }
        ].map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setReportType(r.value), style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 14px",
          borderRadius: 8,
          cursor: "pointer",
          background: reportType === r.value ? `${r.color}14` : "transparent",
          border: reportType === r.value ? `1.5px solid ${r.color}30` : "1.5px solid transparent",
          color: reportType === r.value ? r.color : "#374151",
          fontSize: 13,
          fontWeight: reportType === r.value ? 700 : 500,
          marginBottom: 4,
          textAlign: "left"
        }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: r.icon }),
          r.label
        ] }, r.value))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 16, color: "#0f172a", textTransform: "capitalize" }, children: reportType.replace(/_/g, " ") }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: [
              "Generated: ",
              (/* @__PURE__ */ new Date()).toLocaleString("en-KE")
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: exportReport, disabled: exportLoading, style: btnPrimary, children: exportLoading ? "Exporting-" : "- Export CSV" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f8fafc", borderRadius: 10, padding: "20px", border: "1.5px solid #e2e8f0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }, children: [
            { label: "Total Records", value: reportType === "invoice_summary" ? invoiceMatches.length : reportType === "payment_register" ? payments.length : reportType === "budget_alerts" ? budgetAlerts.length : glEntries.length },
            { label: "Pending", value: reportType === "invoice_summary" ? invoiceMatches.filter((i) => i.status === "pending").length : payments.filter((p) => p.status === "pending").length },
            { label: "Approved", value: reportType === "invoice_summary" ? invoiceMatches.filter((i) => i.status === "matched").length : payments.filter((p) => p.status === "approved").length }
          ].map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: "14px", background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 24, fontWeight: 800, color: "#0f172a" }, children: s.value }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 4 }, children: s.label })
          ] }, i)) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#6b7280", lineHeight: 1.7 }, children: [
            "- Report covers all ",
            reportType.replace(/_/g, " "),
            " records in the system.",
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "- Data as of ",
            (/* @__PURE__ */ new Date()).toLocaleDateString("en-KE"),
            /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
            "- Embu Level 5 Hospital - ProcurBosse ERP v5.8"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
      ` })
  ] });
}
export {
  AccountantWorkspacePage as A,
  ReportsPage as R
};
