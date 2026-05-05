import { u as useNavigate, r as reactExports, j as jsxRuntimeExports, R as RefreshCw, am as Calendar, l as Download, a3 as Printer, q as Save, i as Plus, p as CircleCheckBig, an as CircleX, h as TriangleAlert, t as Clock, d as Search, E as Eye, w as Trash2, X } from "./react-vendor-CySSbiQ5.js";
import { u as useAuth, s as supabase, l as logAudit, t as toast } from "./pages-admin-tba3xNhl.js";
import { u as utils, w as writeFileSync } from "./xlsx-vendor-BSOddODG.js";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const SEV_COL = {
  critical: "#dc2626",
  major: "#d97706",
  minor: "#2563eb"
};
const STATUS_BG = {
  open: "#fee2e2",
  under_review: "#fef3c7",
  closed: "#dcfce7",
  pass: "#dcfce7",
  fail: "#fee2e2",
  pending: "#f3f4f6",
  conditional: "#fef3c7"
};
const STATUS_COL = {
  open: "#dc2626",
  under_review: "#92400e",
  closed: "#15803d",
  pass: "#15803d",
  fail: "#dc2626",
  pending: "#6b7280",
  conditional: "#92400e"
};
const emptyIQC = () => ({ supplier_name: "", item_code: "", invoice_no: "", rej_qty: "", problem_description: "", severity: "", stage_of_issue: "Incoming", proposed_actions: "", corrective_action: "", scar_required: "No", status: "" });
const emptyPend = () => ({ date_of_rejection: "", reason_for_pendency: "", responsible: "" });
const emptyLQC = () => ({ line: "", defect_type: "", qty_rejected: "", rejection_rate: "", root_cause: "", corrective_action: "", status: "" });
const border = "1px solid #4472c4";
const tdBase = {
  border,
  padding: "2px 3px",
  fontSize: 9.5,
  textAlign: "center",
  verticalAlign: "middle",
  lineHeight: 1.3,
  background: "#fff",
  color: "#1a1a2e"
};
const thBase = {
  ...tdBase,
  background: "#bdd7ee",
  fontWeight: 700
};
const darkTh = {
  ...thBase,
  background: "#2e75b6",
  color: "#fff"
};
const sectionHd = {
  ...darkTh,
  fontSize: 11,
  padding: "5px 8px",
  textAlign: "center"
};
function QualityDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const printRef = reactExports.useRef(null);
  const [month, setMonth] = reactExports.useState(MONTHS[(/* @__PURE__ */ new Date()).getMonth()]);
  const [year, setYear] = reactExports.useState(String((/* @__PURE__ */ new Date()).getFullYear()));
  const [loading, setLoading] = reactExports.useState(true);
  const [saving, setSaving] = reactExports.useState(false);
  const [hospitalName, setHospitalName] = reactExports.useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = reactExports.useState("EL5 MediProcure");
  const [lqcComments, setLqcComments] = reactExports.useState("");
  const [iqcRows, setIqcRows] = reactExports.useState(Array.from({ length: 12 }, emptyIQC));
  const [pendRows, setPendRows] = reactExports.useState(Array.from({ length: 6 }, emptyPend));
  const [lqcRows, setLqcRows] = reactExports.useState(Array.from({ length: 8 }, emptyLQC));
  const load = async () => {
    setLoading(true);
    try {
      const [inspRes, ncrRes, sysRes] = await Promise.all([
        supabase.from("inspections").select("*").order("created_at", { ascending: false }).limit(12),
        supabase.from("non_conformance").select("*").order("created_at", { ascending: false }).limit(6),
        supabase.from("system_settings").select("key,value").in("key", ["hospital_name", "system_name", "system_logo_url"])
      ]);
      if (inspRes.data?.length) {
        setIqcRows(Array.from({ length: 12 }, (_, i) => {
          const r = inspRes.data[i];
          if (!r) return emptyIQC();
          return {
            id: r.id,
            supplier_name: r.supplier_name || "",
            item_code: r.inspection_number || "",
            invoice_no: r.grn_reference || "",
            rej_qty: String(r.quantity_rejected || ""),
            problem_description: r.rejection_reason || "",
            severity: r.quantity_rejected > 5 ? "major" : r.quantity_rejected > 0 ? "minor" : "",
            stage_of_issue: "Incoming",
            proposed_actions: r.notes || "",
            corrective_action: r.corrective_action || "",
            scar_required: r.quantity_rejected > 0 ? "Yes" : "No",
            status: r.result || ""
          };
        }));
      }
      if (ncrRes.data?.length) {
        setPendRows(Array.from({ length: 6 }, (_, i) => {
          const r = ncrRes.data[i];
          if (!r) return emptyPend();
          return {
            id: r.id,
            date_of_rejection: r.ncr_date || "",
            reason_for_pendency: r.root_cause || r.description || "",
            responsible: r.responsible_person || ""
          };
        }));
      }
      const m = {};
      (sysRes.data || []).forEach((r) => {
        if (r.key) m[r.key] = r.value || "";
      });
      if (m.hospital_name) setHospitalName(m.hospital_name);
      if (m.system_name) setSysName(m.system_name);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const updIQC = (i, f, v) => setIqcRows((r) => r.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const updPend = (i, f, v) => setPendRows((r) => r.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const updLQC = (i, f, v) => setLqcRows((r) => r.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    try {
      for (const row of iqcRows.filter((r) => r.supplier_name || r.item_code)) {
        const payload = {
          inspection_number: row.item_code || `IQC/${(/* @__PURE__ */ new Date()).getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
          supplier_name: row.supplier_name,
          item_name: row.problem_description.slice(0, 80) || "QC Item",
          grn_reference: row.invoice_no,
          quantity_rejected: Number(row.rej_qty || 0),
          quantity_inspected: Number(row.rej_qty || 0),
          quantity_accepted: 0,
          rejection_reason: row.problem_description,
          corrective_action: row.corrective_action || row.proposed_actions,
          notes: row.proposed_actions,
          result: row.status || "pending",
          inspection_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          created_by: user?.id,
          created_by_name: profile?.full_name
        };
        if (row.id) {
          await supabase.from("inspections").update(payload).eq("id", row.id);
        } else {
          const { data } = await supabase.from("inspections").insert(payload).select().single();
          if (data) row.id = data.id;
        }
        saved++;
      }
      for (const row of pendRows.filter((r) => r.reason_for_pendency)) {
        const payload = {
          ncr_number: `NCR/${(/* @__PURE__ */ new Date()).getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
          title: row.reason_for_pendency.slice(0, 80) || "Material Pending Return",
          description: row.reason_for_pendency,
          ncr_date: row.date_of_rejection || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
          responsible_person: row.responsible,
          root_cause: row.reason_for_pendency,
          status: "open",
          severity: "minor",
          source: "QC Dashboard",
          created_by: user?.id,
          created_by_name: profile?.full_name
        };
        if (!row.id) {
          const { data } = await supabase.from("non_conformance").insert(payload).select().single();
          if (data) row.id = data.id;
          saved++;
        }
      }
      logAudit(user?.id, profile?.full_name, "update", "quality_dashboard", void 0, { month, year, saved });
      toast({ title: `Dashboard saved ✓`, description: `${saved} records updated` });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };
  const doPrint = () => {
    const win = window.open("", "_blank", "width=1200,height=850");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Quality Dashboard — ${month} ${year}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:"Calibri",Arial,sans-serif;font-size:9pt;background:#fff;color:#1a1a2e;}
        table{border-collapse:collapse;width:100%;}
        td,th{border:1px solid #4472c4;padding:2px 4px;font-size:9pt;text-align:center;vertical-align:middle;}
        .bdd7ee{background:#bdd7ee!important;font-weight:700;}
        .blue{background:#2e75b6!important;color:#fff!important;font-weight:700;}
        input,select,textarea{border:none!important;outline:none;background:transparent;width:100%;font-size:9pt;font-family:inherit;text-align:center;}
        .no-print{display:none!important;}
        @media print{@page{size:A3 landscape;margin:6mm;}}
      </style>
    </head><body>${printRef.current?.innerHTML || ""}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };
  const doExport = () => {
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.json_to_sheet(
      iqcRows.map((r, i) => ({ "Sr.No": i + 1, ...r }))
    ), "IQC");
    utils.book_append_sheet(wb, utils.json_to_sheet(
      pendRows.map((r, i) => ({ "Sr.No": i + 1, ...r }))
    ), "Pending Returns");
    utils.book_append_sheet(wb, utils.json_to_sheet(lqcRows), "LQC");
    writeFileSync(wb, `Quality_Dashboard_${month}_${year}.xlsx`);
    toast({ title: "Excel exported ✓" });
  };
  const totalRej = iqcRows.reduce((s, r) => s + Number(r.rej_qty || 0), 0);
  const usedIQC = iqcRows.filter((r) => r.supplier_name).length;
  const closedIQC = iqcRows.filter((r) => r.status === "closed" || r.status === "pass").length;
  const openIQC = iqcRows.filter((r) => r.status === "open" || r.status === "fail").length;
  const pendingMat = pendRows.filter((r) => r.reason_for_pendency).length;
  const lqcUsed = lqcRows.filter((r) => r.line).length;
  if (loading) return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", flexDirection: "column", gap: 12, fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 30, height: 30, color: "#2e75b6", animation: "spin 1s linear infinite" } }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#6b7280", fontSize: 13 }, children: "Loading Quality Dashboard..." })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontFamily: "'Segoe UI',Calibri,system-ui", background: "#f0f2f5", minHeight: "100%" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .qrow:hover td{background:#f0f7ff!important;}
        .qinp{width:100%;border:none;outline:none;background:transparent;font-size:9.5px;font-family:inherit;padding:2px 4px;text-align:center;color:#1a1a2e;box-sizing:border-box;}
        .qinp:focus{background:#fffde7!important;border-radius:2px;}
        .qsel{width:100%;border:none;outline:none;background:transparent;font-size:9.5px;font-family:inherit;text-align:center;cursor:pointer;color:#1a1a2e;}
        .qsel:focus{background:#fffde7!important;}
      ` }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "linear-gradient(135deg,#0a2558,#2e75b6)", padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 2px 10px rgba(0,0,0,0.2)", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 15, fontWeight: 900, color: "#fff" }, children: "Quality Dashboard" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)" }, children: [
          hospitalName,
          " · IQC & LQC Tracking Form"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 12px", border: "1px solid rgba(255,255,255,0.2)" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { style: { width: 12, height: 12, color: "rgba(255,255,255,0.7)" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "select",
          {
            value: month,
            onChange: (e) => setMonth(e.target.value),
            style: { background: "transparent", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" },
            children: MONTHS.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m, style: { color: "#1a1a2e" }, children: m }, m))
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            value: year,
            onChange: (e) => setYear(e.target.value),
            style: { background: "transparent", border: "none", color: "#fff", fontSize: 12, fontWeight: 700, outline: "none", width: 46, textAlign: "center" },
            maxLength: 4
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: load, style: { display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 7, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 600 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 } }),
        "Refresh"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doExport, style: { display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 7, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 600 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 12, height: 12 } }),
        "Excel"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: doPrint, style: { display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 7, cursor: "pointer", color: "#fff", fontSize: 11, fontWeight: 600 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Printer, { style: { width: 12, height: 12 } }),
        "Print"
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: saveAll, disabled: saving, style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "#C45911", border: "none", borderRadius: 7, cursor: saving ? "not-allowed" : "pointer", color: "#fff", fontSize: 12, fontWeight: 800, opacity: saving ? 0.75 : 1 }, children: [
        saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12, animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 12, height: 12 } }),
        saving ? "Saving..." : "Save Dashboard"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", background: "#fff", borderBottom: "2px solid #2e75b6" }, children: [
      { label: "Total Rejected", val: totalRej, col: "#dc2626" },
      { label: "IQC Rows Used", val: usedIQC, col: "#2563eb" },
      { label: "Open Issues", val: openIQC, col: "#d97706" },
      { label: "Closed / Passed", val: closedIQC, col: "#15803d" },
      { label: "Pending Returns", val: pendingMat, col: "#7c3aed" },
      { label: "LQC Lines Active", val: lqcUsed, col: "#0369a1" }
    ].map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, borderRight: "1px solid #e5e7eb", padding: "7px 10px", textAlign: "center" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 900, color: k.col, lineHeight: 1 }, children: k.val }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 8.5, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }, children: k.label })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "10px 12px", overflowX: "auto" }, ref: printRef, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { minWidth: 900 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { style: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { ...tdBase, width: 130, padding: 6, textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 8, color: "#9ca3af", fontStyle: "italic" }, children: "Hospital Logo" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 9, color: "#2e75b6", marginTop: 2 }, children: "EL5H" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { ...tdBase, textAlign: "center", padding: "6px 0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 17, fontWeight: 900, color: "#1a1a2e", letterSpacing: "0.02em" }, children: "Quality Dashboard" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9.5, color: "#6b7280", marginTop: 2 }, children: hospitalName })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { ...tdBase, width: 200, padding: "6px 10px", textAlign: "left" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#6b7280", fontWeight: 600 }, children: "Month:" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 13, fontWeight: 900, color: "#2e75b6" }, children: [
            month,
            " ",
            year
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 8.5, color: "#9ca3af", marginTop: 2 }, children: [
            "Doc Ref: QD/EL5H/",
            year
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginTop: 2, tableLayout: "fixed" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 12, style: sectionHd, children: "Incoming Quality Control (IQC)" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { rowSpan: 2, style: { ...thBase, width: 26 }, children: [
              "Sr.",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "No."
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, style: { ...thBase, width: "11%" }, children: "Supplier Name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 3, style: { ...thBase }, children: "Issues Descriptions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, style: { ...thBase, width: "14%" }, children: "Problem Descriptions" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, style: { ...thBase, width: 58 }, children: "Severity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { rowSpan: 2, style: { ...thBase, width: 64 }, children: [
              "Stage of",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "Issue"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { rowSpan: 2, style: { ...thBase, width: "10%" }, children: [
              "Proposed",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "Actions"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { rowSpan: 2, style: { ...thBase, width: "10%" }, children: [
              "Corrective",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "Actions"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { rowSpan: 2, style: { ...thBase, width: 54 }, children: [
              "SCAR",
              /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
              "Required"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { rowSpan: 2, style: { ...thBase, width: 64 }, children: "Status" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: 64 }, children: "Item Code" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: 64 }, children: "Invoice No." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: 46 }, children: "Rej (Qty)" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: iqcRows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "qrow", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, background: "#dce6f1", fontWeight: 700 }, children: i + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              value: row.supplier_name,
              placeholder: "Supplier...",
              onChange: (e) => updIQC(i, "supplier_name", e.target.value),
              style: { textAlign: "left", paddingLeft: 4 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              value: row.item_code,
              placeholder: "Code",
              onChange: (e) => updIQC(i, "item_code", e.target.value)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              value: row.invoice_no,
              placeholder: "Inv#",
              onChange: (e) => updIQC(i, "invoice_no", e.target.value)
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              type: "number",
              min: 0,
              value: row.rej_qty,
              placeholder: "0",
              onChange: (e) => updIQC(i, "rej_qty", e.target.value),
              style: { color: Number(row.rej_qty || 0) > 0 ? "#dc2626" : "inherit", fontWeight: Number(row.rej_qty || 0) > 0 ? 700 : 400 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              value: row.problem_description,
              placeholder: "Describe issue...",
              onChange: (e) => updIQC(i, "problem_description", e.target.value),
              style: { textAlign: "left", paddingLeft: 4 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "qsel",
              value: row.severity,
              onChange: (e) => updIQC(i, "severity", e.target.value),
              style: {
                color: row.severity ? SEV_COL[row.severity] || "#1a1a2e" : "#9ca3af",
                fontWeight: row.severity ? 700 : 400
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "critical", children: "Critical" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "major", children: "Major" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "minor", children: "Minor" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "qsel",
              value: row.stage_of_issue,
              onChange: (e) => updIQC(i, "stage_of_issue", e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Incoming" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "In-Process" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Final" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Dispatch" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Customer" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              value: row.proposed_actions,
              placeholder: "Action...",
              onChange: (e) => updIQC(i, "proposed_actions", e.target.value),
              style: { textAlign: "left", paddingLeft: 4 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              className: "qinp",
              value: row.corrective_action,
              placeholder: "Corrective...",
              onChange: (e) => updIQC(i, "corrective_action", e.target.value),
              style: { textAlign: "left", paddingLeft: 4 }
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "qsel",
              value: row.scar_required,
              onChange: (e) => updIQC(i, "scar_required", e.target.value),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Yes" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "No" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: "Pending" })
              ]
            }
          ) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: {
            ...tdBase,
            padding: 0,
            background: row.status ? STATUS_BG[row.status] || "#fff" : "#fff"
          }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "select",
            {
              className: "qsel",
              value: row.status,
              onChange: (e) => updIQC(i, "status", e.target.value),
              style: {
                color: row.status ? STATUS_COL[row.status] || "#1a1a2e" : "#9ca3af",
                fontWeight: row.status ? 700 : 400,
                background: "transparent"
              },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "—" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "open", children: "Open" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "under_review", children: "Under Review" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "conditional", children: "Conditional" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "pass", children: "Pass" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "fail", children: "Fail" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "closed", children: "Closed" })
              ]
            }
          ) })
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginTop: 2, tableLayout: "fixed" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { width: "54%", padding: 0, verticalAlign: "top", border }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { colSpan: 4, style: { ...darkTh, fontSize: 9.5, textAlign: "left", padding: "4px 8px" }, children: [
              "Sr. No. Of material NOT RETURNED to Supplier:",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#ffd700", marginLeft: 8, fontSize: 12 }, children: pendingMat })
            ] }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("th", { style: { ...thBase, width: 30 }, children: [
                "Sr.",
                /* @__PURE__ */ jsxRuntimeExports.jsx("br", {}),
                "No."
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: thBase, children: "Date of Rejection" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: thBase, children: "Reason for Pendency" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: thBase, children: "Responsible" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: pendRows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "qrow", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, background: "#dce6f1", fontWeight: 700 }, children: i + 1 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                type: "date",
                value: row.date_of_rejection,
                onChange: (e) => updPend(i, "date_of_rejection", e.target.value),
                style: { fontSize: 9 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.reason_for_pendency,
                placeholder: "Reason...",
                onChange: (e) => updPend(i, "reason_for_pendency", e.target.value),
                style: { textAlign: "left", paddingLeft: 4 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.responsible,
                placeholder: "Name...",
                onChange: (e) => updPend(i, "responsible", e.target.value)
              }
            ) })
          ] }, i)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { width: "46%", padding: 0, verticalAlign: "top", border }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
            ...darkTh,
            fontSize: 9.5,
            textAlign: "center",
            padding: "4px 8px",
            textDecoration: "underline",
            cursor: "pointer"
          }, children: "Photo Of Material Not returned to Supplier" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
            background: "#f8fafc",
            minHeight: 112,
            padding: 8,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 5
          }, children: [
            pendRows.filter((r) => r.date_of_rejection || r.reason_for_pendency).map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
              background: "#dce6f1",
              borderRadius: 5,
              padding: 5,
              fontSize: 8.5,
              color: "#374151",
              textAlign: "center",
              border: "1px solid #bdd7ee"
            }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontWeight: 700, color: "#1d4ed8", marginBottom: 2 }, children: [
                "#",
                i + 1
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#374151", lineHeight: 1.3, marginBottom: 2 }, children: r.reason_for_pendency?.slice(0, 40) || "Pending material" }),
              r.date_of_rejection && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#6b7280", fontSize: 8 }, children: r.date_of_rejection }),
              r.responsible && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { color: "#2563eb", fontSize: 8, fontWeight: 600, marginTop: 2 }, children: r.responsible })
            ] }, i)),
            pendRows.filter((r) => r.date_of_rejection || r.reason_for_pendency).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
              gridColumn: "1/-1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 80,
              color: "#d1d5db",
              fontSize: 10,
              fontStyle: "italic"
            }, children: "No pending returns recorded" })
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", marginTop: 2, tableLayout: "fixed" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("thead", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("th", { colSpan: 7, style: sectionHd, children: "Line Quality Control (LQC)" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: "12%" }, children: "Production Line" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: "14%" }, children: "Defect Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: 62 }, children: "Qty Rejected" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: 72 }, children: "Rejection Rate %" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: "18%" }, children: "Root Cause" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase }, children: "Corrective Action" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { ...thBase, width: 70 }, children: "Status" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          lqcRows.map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { className: "qrow", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.line,
                placeholder: "Line/Dept",
                onChange: (e) => updLQC(i, "line", e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.defect_type,
                placeholder: "Defect type...",
                onChange: (e) => updLQC(i, "defect_type", e.target.value),
                style: { textAlign: "left", paddingLeft: 4 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                type: "number",
                min: 0,
                value: row.qty_rejected,
                placeholder: "0",
                onChange: (e) => updLQC(i, "qty_rejected", e.target.value),
                style: {
                  color: Number(row.qty_rejected || 0) > 0 ? "#dc2626" : "inherit",
                  fontWeight: Number(row.qty_rejected || 0) > 0 ? 700 : 400
                }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.rejection_rate,
                placeholder: "e.g. 2.5%",
                onChange: (e) => updLQC(i, "rejection_rate", e.target.value)
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.root_cause,
                placeholder: "Root cause...",
                onChange: (e) => updLQC(i, "root_cause", e.target.value),
                style: { textAlign: "left", paddingLeft: 4 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { ...tdBase, padding: 0, textAlign: "left" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "input",
              {
                className: "qinp",
                value: row.corrective_action,
                placeholder: "Corrective action...",
                onChange: (e) => updLQC(i, "corrective_action", e.target.value),
                style: { textAlign: "left", paddingLeft: 4 }
              }
            ) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: {
              ...tdBase,
              padding: 0,
              background: row.status ? STATUS_BG[row.status] || "#fff" : "#fff"
            }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "select",
              {
                className: "qsel",
                value: row.status,
                onChange: (e) => updLQC(i, "status", e.target.value),
                style: {
                  color: row.status ? STATUS_COL[row.status] || "#1a1a2e" : "#9ca3af",
                  fontWeight: row.status ? 700 : 400,
                  background: "transparent"
                },
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "—" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "open", children: "Open" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "under_review", children: "In Progress" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "closed", children: "Closed" })
                ]
              }
            ) })
          ] }, i)),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 3, style: { ...tdBase, padding: 5, textAlign: "left", background: "#f8fafc", verticalAlign: "top" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, fontWeight: 700, color: "#374151", marginBottom: 4 }, children: "Line rejection summary Graph:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 4 }, children: [
                lqcRows.filter((r) => r.line && r.rejection_rate).map((r, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: {
                  background: "#dbeafe",
                  borderRadius: 4,
                  padding: "2px 7px",
                  fontSize: 8.5,
                  color: "#1d4ed8",
                  fontWeight: 700,
                  border: "1px solid #bdd7ee"
                }, children: [
                  r.line,
                  ": ",
                  r.rejection_rate
                ] }, i)),
                lqcRows.filter((r) => r.line).length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 8.5, color: "#9ca3af", fontStyle: "italic" }, children: "Enter LQC data above" })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 4, style: { ...tdBase, padding: 5, textAlign: "left", background: "#f8fafc", verticalAlign: "top" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, fontWeight: 700, color: "#374151", marginBottom: 4 }, children: "Comments:" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "textarea",
                {
                  value: lqcComments,
                  onChange: (e) => setLqcComments(e.target.value),
                  placeholder: "Quality comments, observations, action items...",
                  style: {
                    width: "100%",
                    border: "none",
                    outline: "none",
                    resize: "none",
                    fontSize: 9.5,
                    fontFamily: "inherit",
                    color: "#374151",
                    background: "transparent",
                    minHeight: 36,
                    lineHeight: 1.4
                  }
                }
              )
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("table", { style: { width: "100%", borderCollapse: "collapse", marginTop: 2, tableLayout: "fixed" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: [
          { label: "Prepared By", val: profile?.full_name || "" },
          { label: "QC Manager", val: "" },
          { label: "Reviewed By", val: "" },
          { label: "Approved By", val: "" }
        ].map((s, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { style: { ...tdBase, padding: "6px 10px", textAlign: "left" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 8.5, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.04em" }, children: s.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: {
            borderBottom: "1px solid #9ca3af",
            minHeight: 20,
            marginTop: 5,
            paddingBottom: 2,
            fontSize: 10,
            color: "#374151",
            fontStyle: s.val ? "normal" : "italic",
            color: s.val ? "#1f2937" : "#9ca3af"
          }, children: s.val || "" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 8, color: "#9ca3af", marginTop: 3 }, children: "Signature & Date" })
        ] }, i)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("td", { colSpan: 4, style: { ...tdBase, background: "#2e75b6", color: "#fff", fontSize: 8.5, padding: "4px 10px", textAlign: "center" }, children: [
          hospitalName,
          " · Quality Dashboard · ",
          month,
          " ",
          year,
          " · Generated by ",
          sysName,
          " · Doc Ref: QD/EL5H/",
          year
        ] }) })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, padding: "10px 12px", background: "#fff", borderTop: "2px solid #2e75b6", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => navigate("/quality/inspections"),
          style: { flex: 1, minWidth: 140, padding: "9px", background: "linear-gradient(135deg,#0f766e,#134e4a)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 },
          children: "+ New IQC Inspection"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => navigate("/quality/non-conformance"),
          style: { flex: 1, minWidth: 140, padding: "9px", background: "linear-gradient(135deg,#dc2626,#991b1b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 },
          children: "+ Raise NCR / SCAR"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => navigate("/quality/inspections"),
          style: { flex: 1, minWidth: 140, padding: "9px", background: "linear-gradient(135deg,#1d4ed8,#1e40af)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 },
          children: "View All Inspections →"
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => navigate("/quality/non-conformance"),
          style: { flex: 1, minWidth: 140, padding: "9px", background: "linear-gradient(135deg,#7c3aed,#5b21b6)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 },
          children: "Manage Non-Conformances →"
        }
      )
    ] })
  ] });
}
const genNo$1 = () => `QI/EL5H/${(/* @__PURE__ */ new Date()).getFullYear()}${String((/* @__PURE__ */ new Date()).getMonth() + 1).padStart(2, "0")}/${String(Math.floor(100 + Math.random() * 9900))}`;
const RC = {
  pass: { bg: "#dcfce7", color: "#15803d" },
  fail: { bg: "#fee2e2", color: "#dc2626" },
  conditional: { bg: "#fef3c7", color: "#92400e" },
  pending: { bg: "#f3f4f6", color: "#6b7280" }
};
function InspectionsPage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer") || hasRole("warehouse_officer");
  const [rows, setRows] = reactExports.useState([]);
  const [suppliers, setSuppliers] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [resultFilter, setResultFilter] = reactExports.useState("all");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ inspection_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), grn_reference: "", supplier_id: "", supplier_name: "", item_name: "", quantity_inspected: "", quantity_accepted: "", quantity_rejected: "", result: "pending", rejection_reason: "", inspector_name: profile?.full_name || "", corrective_action: "", notes: "" });
  const load = async () => {
    setLoading(true);
    const [{ data: i }, { data: s }] = await Promise.all([
      supabase.from("inspections").select("*").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id,name").order("name")
    ]);
    setRows(i || []);
    setSuppliers(s || []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  reactExports.useEffect(() => {
    const ch = supabase.channel("ins-rt").on("postgres_changes", { event: "*", schema: "public", table: "inspections" }, () => load()).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);
  const save = async () => {
    if (!form.item_name || !form.inspection_date) {
      toast({ title: "Item name and date required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const supp = suppliers.find((s) => s.id === form.supplier_id);
    const payload = {
      ...form,
      inspection_number: genNo$1(),
      supplier_id: form.supplier_id || null,
      supplier_name: supp?.name || form.supplier_name,
      quantity_inspected: Number(form.quantity_inspected || 0),
      quantity_accepted: Number(form.quantity_accepted || 0),
      quantity_rejected: Number(form.quantity_rejected || 0),
      created_by: user?.id,
      created_by_name: profile?.full_name
    };
    const { data, error } = await supabase.from("inspections").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      logAudit(user?.id, profile?.full_name, "create", "inspections", data?.id, { item: form.item_name });
      toast({ title: "Inspection recorded ✓" });
      setShowNew(false);
      load();
    }
    setSaving(false);
  };
  const del = async (id) => {
    if (!confirm("Delete?")) return;
    await supabase.from("inspections").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    utils.book_append_sheet(wb, utils.json_to_sheet(rows), "Inspections");
    writeFileSync(wb, `inspections_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const filtered = rows.filter((r) => {
    const ms = !search || (r.item_name || "").toLowerCase().includes(search.toLowerCase()) || (r.supplier_name || "").toLowerCase().includes(search.toLowerCase()) || (r.inspection_number || "").includes(search);
    return ms && (resultFilter === "all" || r.result === resultFilter);
  });
  const stats = { pass: rows.filter((r) => r.result === "pass").length, fail: rows.filter((r) => r.result === "fail").length, pending: rows.filter((r) => r.result === "pending").length, conditional: rows.filter((r) => r.result === "conditional").length };
  const inp = { width: "100%", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "16px 20px", fontFamily: "'Segoe UI',system-ui", minHeight: "calc(100vh - 60px)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}` }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "linear-gradient(90deg,#134e4a,#0f766e)", borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { fontSize: 15, fontWeight: 900, color: "#fff", margin: 0 }, children: "QC Inspections" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { style: { fontSize: 10, color: "rgba(255,255,255,0.5)", margin: 0 }, children: [
          rows.length,
          " total · ",
          stats.pass,
          " passed · ",
          stats.fail,
          " failed"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { style: { width: 13, height: 13 } }),
          "Export"
        ] }),
        canCreate && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(255,255,255,0.92)", color: "#134e4a", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { style: { width: 13, height: 13 } }),
          "New Inspection"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }, children: [{ label: "Passed", count: stats.pass, icon: CircleCheckBig, color: "#15803d" }, { label: "Failed", count: stats.fail, icon: CircleX, color: "#dc2626" }, { label: "Conditional", count: stats.conditional, icon: TriangleAlert, color: "#d97706" }, { label: "Pending", count: stats.pending, icon: Clock, color: "#6b7280" }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 34, height: 34, borderRadius: 9, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(s.icon, { style: { width: 16, height: 16, color: s.color } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 900, color: s.color }, children: s.count }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#6b7280", fontWeight: 600 }, children: s.label })
      ] })
    ] }, s.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }, children: [
      ["all", "pass", "fail", "conditional", "pending"].map((f) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setResultFilter(f),
          style: { padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${resultFilter === f ? "#0f766e" : "#e5e7eb"}`, background: resultFilter === f ? "#0f766e" : "#fff", color: resultFilter === f ? "#fff" : "#374151", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" },
          children: f === "all" ? "All Results" : f
        },
        f
      )),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", marginLeft: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, color: "#9ca3af" } }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search...", style: { padding: "6px 12px 6px 26px", border: "1.5px solid #e5e7eb", borderRadius: 20, fontSize: 12, outline: "none", width: 200 } })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "linear-gradient(90deg,#134e4a,#0f766e)" }, children: ["Inspection No.", "Item", "Supplier", "Date", "Qty Inspected", "Accepted", "Rejected", "Result", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }, children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, style: { padding: 24, textAlign: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 16, height: 16, color: "#d1d5db", animation: "spin 1s linear infinite", display: "block", margin: "0 auto" } }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 9, style: { padding: 40, textAlign: "center", color: "#9ca3af" }, children: "No inspections found" }) }) : filtered.map((r, i) => {
        const rc = RC[r.result] || RC.pending;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "tr",
          {
            style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#f9fafb" },
            onMouseEnter: (e) => e.currentTarget.style.background = "#f0fdf4",
            onMouseLeave: (e) => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f9fafb",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 700, color: "#0f766e", fontFamily: "monospace", fontSize: 11 }, children: r.inspection_number || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", fontWeight: 600, color: "#1f2937" }, children: r.item_name || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#374151" }, children: r.supplier_name || "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", color: "#6b7280" }, children: r.inspection_date ? new Date(r.inspection_date).toLocaleDateString("en-KE") : "—" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", textAlign: "center", color: "#374151" }, children: r.quantity_inspected || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", textAlign: "center", color: "#15803d", fontWeight: 700 }, children: r.quantity_accepted || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px", textAlign: "center", color: "#dc2626", fontWeight: 700 }, children: r.quantity_rejected || 0 }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 9px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "capitalize", background: rc.bg, color: rc.color }, children: r.result || "—" }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "9px 12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 4 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(r), style: { padding: "4px 8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { style: { width: 12, height: 12, color: "#15803d" } }) }),
                hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => del(r.id), style: { padding: "4px 8px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 12, height: 12, color: "#dc2626" } }) })
              ] }) })
            ]
          },
          r.id
        );
      }) })
    ] }) }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", justifyContent: "flex-end" }, onClick: () => setDetail(null), children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: "min(440px,100%)", background: "#fff", height: "100%", overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)" }, onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 16px", background: "linear-gradient(90deg,#134e4a,#0f766e)", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 800, color: "#fff", flex: 1 }, children: detail.inspection_number }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 5, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 12, height: 12 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 16, display: "flex", flexDirection: "column", gap: 10 }, children: [
        [["Item", detail.item_name], ["Supplier", detail.supplier_name || "—"], ["Date", detail.inspection_date ? new Date(detail.inspection_date).toLocaleDateString("en-KE") : "—"], ["Inspector", detail.inspector_name || "—"], ["Qty Inspected", String(detail.quantity_inspected || 0)], ["Qty Accepted", String(detail.quantity_accepted || 0)], ["Qty Rejected", String(detail.quantity_rejected || 0)], ["Result", detail.result], ["GRN Reference", detail.grn_reference || "—"]].map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f3f4f6" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#9ca3af", fontWeight: 600 }, children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", textTransform: "capitalize" }, children: v || "—" })
        ] }, l)),
        detail.rejection_reason && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 10, background: "#fef2f2", borderRadius: 8, fontSize: 12, color: "#dc2626" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Rejection Reason:" }),
          " ",
          detail.rejection_reason
        ] }),
        detail.corrective_action && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 10, background: "#f0fdf4", borderRadius: 8, fontSize: 12, color: "#15803d" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("b", { children: "Corrective Action:" }),
          " ",
          detail.corrective_action
        ] }),
        detail.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: 10, background: "#f9fafb", borderRadius: 8, fontSize: 12, color: "#374151" }, children: detail.notes })
      ] })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 16, width: "min(640px,100%)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 18px", background: "linear-gradient(90deg,#134e4a,#0f766e)", borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 800, color: "#fff", flex: 1 }, children: "New QC Inspection" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Inspection Date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "date", value: form.inspection_date, onChange: (e) => setForm((p) => ({ ...p, inspection_date: e.target.value })), style: inp })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Supplier" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: form.supplier_id, onChange: (e) => setForm((p) => ({ ...p, supplier_id: e.target.value, supplier_name: suppliers.find((s) => s.id === e.target.value)?.name || "" })), style: inp, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select supplier..." }),
            suppliers.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s.id, children: s.name }, s.id))
          ] })
        ] }),
        [["Item Name *", "item_name"], ["GRN Reference", "grn_reference"], ["Inspector Name", "inspector_name"]].map(([l, k]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), style: inp })
        ] }, k)),
        [["Qty Inspected", "quantity_inspected"], ["Qty Accepted", "quantity_accepted"], ["Qty Rejected", "quantity_rejected"]].map(([l, k]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", min: 0, value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), style: inp })
        ] }, k)),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Result" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.result, onChange: (e) => setForm((p) => ({ ...p, result: e.target.value })), style: inp, children: ["pending", "pass", "fail", "conditional"].map((v) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: v, style: { textTransform: "capitalize" }, children: v }, v)) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Rejection Reason" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: form.rejection_reason, onChange: (e) => setForm((p) => ({ ...p, rejection_reason: e.target.value })), style: inp })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Corrective Action" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.corrective_action, onChange: (e) => setForm((p) => ({ ...p, corrective_action: e.target.value })), rows: 2, style: { ...inp, resize: "vertical", fontFamily: "inherit" } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { gridColumn: "span 2" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { display: "block", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: 4 }, children: "Notes" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form.notes, onChange: (e) => setForm((p) => ({ ...p, notes: e.target.value })), rows: 2, style: { ...inp, resize: "vertical", fontFamily: "inherit" } })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 18px", borderTop: "1px solid #f3f4f6", display: "flex", gap: 8, justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), style: { padding: "8px 16px", border: "1.5px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", background: "#0f766e", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1 }, children: [
          saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13, animation: "spin 1s linear infinite" } }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { style: { width: 13, height: 13 } }),
          saving ? "Saving..." : "Submit Inspection"
        ] })
      ] })
    ] }) })
  ] });
}
const genNo = () => `NCR/EL5H/${(/* @__PURE__ */ new Date()).getFullYear()}/${String(Math.floor(100 + Math.random() * 900))}`;
const SC = {
  open: { bg: "#fee2e2", color: "#dc2626" },
  under_review: { bg: "#fef3c7", color: "#92400e" },
  closed: { bg: "#dcfce7", color: "#15803d" },
  escalated: { bg: "#f3e8ff", color: "#7c3aed" }
};
const SEV = { critical: "#dc2626", major: "#d97706", minor: "#6b7280" };
function NonConformancePage() {
  const { user, profile, hasRole } = useAuth();
  const canCreate = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer") || hasRole("warehouse_officer");
  const [rows, setRows] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [search, setSearch] = reactExports.useState("");
  const [statusFilter, setStatusFilter] = reactExports.useState("all");
  const [showNew, setShowNew] = reactExports.useState(false);
  const [detail, setDetail] = reactExports.useState(null);
  const [saving, setSaving] = reactExports.useState(false);
  const [form, setForm] = reactExports.useState({ ncr_date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), title: "", description: "", severity: "minor", source: "Inspection", supplier_name: "", item_name: "", grn_reference: "", root_cause: "", corrective_action: "", preventive_action: "", responsible_person: "", target_date: "", status: "open" });
  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("non_conformance").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };
  reactExports.useEffect(() => {
    load();
  }, []);
  const save = async () => {
    if (!form.title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, ncr_number: genNo(), created_by: user?.id, created_by_name: profile?.full_name };
    const { data, error } = await supabase.from("non_conformance").insert(payload).select().single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      logAudit(user?.id, profile?.full_name, "create", "non_conformance", data?.id, { title: form.title });
      toast({ title: "NCR created ✓" });
      setShowNew(false);
      load();
    }
    setSaving(false);
  };
  const updateStatus = async (id, status) => {
    await supabase.from("non_conformance").update({ status, closed_by: user?.id, closed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
    toast({ title: `Status updated to ${status}` });
    load();
  };
  const deleteRow = async (id) => {
    if (!confirm("Delete this NCR?")) return;
    await supabase.from("non_conformance").delete().eq("id", id);
    toast({ title: "Deleted" });
    load();
  };
  const exportExcel = () => {
    const wb = utils.book_new();
    const ws = utils.json_to_sheet(rows);
    utils.book_append_sheet(wb, ws, "NCRs");
    writeFileSync(wb, `ncr_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exported" });
  };
  const filtered = rows.filter((r) => {
    const ms = !search || (r.title || "").toLowerCase().includes(search.toLowerCase()) || (r.ncr_number || "").includes(search) || (r.supplier_name || "").toLowerCase().includes(search.toLowerCase());
    const ms2 = statusFilter === "all" || r.status === statusFilter;
    return ms && ms2;
  });
  const stats = { open: rows.filter((r) => r.status === "open").length, under_review: rows.filter((r) => r.status === "under_review").length, closed: rows.filter((r) => r.status === "closed").length, critical: rows.filter((r) => r.severity === "critical").length };
  const F = ({ label, k, type = "text" }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type, value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" })
  ] });
  const TA = ({ label, k }) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: form[k] || "", onChange: (e) => setForm((p) => ({ ...p, [k]: e.target.value })), rows: 2, className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none resize-none" })
  ] });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-4", style: { fontFamily: "'Segoe UI',system-ui" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl px-5 py-3 flex items-center justify-between", style: { background: "linear-gradient(90deg,#92400e,#d97706)" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-base font-black text-white", children: "Non-Conformance Reports" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-[10px] text-white/50", children: [
          rows.length,
          " total · ",
          stats.open,
          " open · ",
          stats.critical,
          " critical"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: exportExcel, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold", style: { background: "rgba(255,255,255,0.15)", color: "#fff" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-3.5 h-3.5" }),
          "Export"
        ] }),
        canCreate && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowNew(true), className: "flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold", style: { background: "rgba(255,255,255,0.92)", color: "#92400e" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-3.5 h-3.5" }),
          "New NCR"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-4 gap-3", children: [{ label: "Open", count: stats.open, color: "#dc2626" }, { label: "Under Review", count: stats.under_review, color: "#d97706" }, { label: "Closed", count: stats.closed, color: "#15803d" }, { label: "Critical", count: stats.critical, color: "#7c3aed" }].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "rounded-2xl p-3 shadow-sm", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xl font-black", style: { color: s.color }, children: s.count }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[10px] text-gray-500 font-semibold", children: s.label })
    ] }, s.label)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search NCRs…", className: "pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm outline-none w-52" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex gap-1", children: ["all", "open", "under_review", "closed", "escalated"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => setStatusFilter(s),
          className: "px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all",
          style: { background: statusFilter === s ? SC[s]?.bg || "#1a3a6b" : "#f3f4f6", color: statusFilter === s ? SC[s]?.color || "#fff" : "#6b7280" },
          children: s.replace(/_/g, " ")
        },
        s
      )) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "rounded-2xl shadow-sm overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { className: "w-full text-xs", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#92400e" }, children: ["NCR No.", "Date", "Title", "Supplier", "Item", "Severity", "Status", "Responsible", "Target", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { className: "px-4 py-3 text-left font-bold text-white/80 text-[10px] uppercase", children: h }, h)) }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 10, className: "py-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 animate-spin text-gray-300 mx-auto" }) }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 10, className: "py-8 text-center text-gray-400 text-xs", children: "No non-conformance reports" }) }) : filtered.map((r, i) => {
        const sc = SC[r.status] || SC.open;
        return /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { style: { borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fffbf0" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-mono text-[10px]", style: { color: "#92400e" }, children: r.ncr_number }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: new Date(r.ncr_date).toLocaleDateString("en-KE") }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 font-semibold text-gray-800 max-w-[160px] truncate", children: r.title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500", children: r.supplier_name || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500", children: r.item_name || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-bold capitalize", style: { color: SEV[r.severity] || "#6b7280" }, children: r.severity }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-0.5 rounded-full text-[9px] font-bold capitalize", style: sc, children: r.status?.replace(/_/g, " ") }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-500", children: r.responsible_person || "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5 text-gray-400", children: r.target_date ? new Date(r.target_date).toLocaleDateString("en-KE") : "—" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { className: "px-4 py-2.5", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(r), className: "p-1.5 rounded-lg bg-orange-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Eye, { className: "w-3 h-3 text-orange-600" }) }),
            r.status !== "closed" && canCreate && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => updateStatus(r.id, "closed"), className: "p-1.5 rounded-lg bg-green-50", title: "Close NCR", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheckBig, { className: "w-3 h-3 text-green-600" }) }),
            hasRole("admin") && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => deleteRow(r.id), className: "p-1.5 rounded-lg bg-red-50", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-3 h-3 text-red-500" }) })
          ] }) })
        ] }, r.id);
      }) })
    ] }) }),
    showNew && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: () => setShowNew(false) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 overflow-y-auto max-h-[92vh] space-y-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-black text-gray-800", children: "New Non-Conformance Report" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "NCR Title *", k: "title" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "NCR Date", k: "ncr_date", type: "date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Source" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.source, onChange: (e) => setForm((p) => ({ ...p, source: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none", children: ["Inspection", "Supplier", "Internal Audit", "Customer Complaint", "Process Review"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { children: s }, s)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Severity" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.severity, onChange: (e) => setForm((p) => ({ ...p, severity: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none", children: ["minor", "major", "critical"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { className: "capitalize", children: s }, s)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "block mb-1 text-xs font-semibold text-gray-500", children: "Status" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: form.status, onChange: (e) => setForm((p) => ({ ...p, status: e.target.value })), className: "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none", children: ["open", "under_review", "closed", "escalated"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s.replace(/_/g, " ") }, s)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Supplier Name", k: "supplier_name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Item Name", k: "item_name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "GRN Reference", k: "grn_reference" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Responsible Person", k: "responsible_person" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(F, { label: "Target Date", k: "target_date", type: "date" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TA, { label: "Description", k: "description" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TA, { label: "Root Cause", k: "root_cause" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TA, { label: "Corrective Action", k: "corrective_action" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TA, { label: "Preventive Action", k: "preventive_action" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 justify-end", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowNew(false), className: "px-4 py-2 rounded-xl border text-sm", children: "Cancel" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: save, disabled: saving, className: "flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold", style: { background: "#92400e" }, children: [
            saving ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5 animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Save, { className: "w-3.5 h-3.5" }),
            saving ? "Saving…" : "Create NCR"
          ] })
        ] })
      ] })
    ] }),
    detail && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute inset-0 bg-black/50", onClick: () => setDetail(null) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 overflow-y-auto max-h-[90vh]", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-black text-gray-800", children: detail.ncr_number }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDetail(null), children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { className: "w-5 h-5 text-gray-400" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "font-bold text-gray-700 mb-3", children: detail.title }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-1.5", children: [["Date", new Date(detail.ncr_date).toLocaleDateString("en-KE")], ["Severity", detail.severity], ["Status", detail.status?.replace(/_/g, " ")], ["Source", detail.source], ["Supplier", detail.supplier_name], ["Item", detail.item_name], ["GRN Ref.", detail.grn_reference], ["Description", detail.description], ["Root Cause", detail.root_cause], ["Corrective Action", detail.corrective_action], ["Preventive Action", detail.preventive_action], ["Responsible", detail.responsible_person], ["Target Date", detail.target_date ? new Date(detail.target_date).toLocaleDateString("en-KE") : ""], ["Raised By", detail.created_by_name]].filter(([, v]) => v).map(([l, v]) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "py-1.5", style: { borderBottom: "1px solid #f3f4f6" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-bold text-gray-400 uppercase", children: l }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-700 mt-0.5", children: v })
        ] }, l)) })
      ] })
    ] })
  ] });
}
export {
  InspectionsPage as I,
  NonConformancePage as N,
  QualityDashboardPage as Q
};
