import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Download, Printer, Search, Filter, X, Eye, FileSpreadsheet, ChevronDown, BarChart3 } from "lucide-react";
import * as XLSX from "xlsx";

const REPORTS = [
  { id:"items", label:"Items Catalogue", table:"items", cols:["name","description","unit_of_measure","unit_price","quantity_in_stock","reorder_level","item_type","status","barcode","sku","location","expiry_date","manufacturer"] },
  { id:"low_stock", label:"Low Stock Items", table:"items", cols:["name","quantity_in_stock","reorder_level","unit_price","item_type","location","status"] },
  { id:"requisitions", label:"Requisitions", table:"requisitions", cols:["requisition_number","status","priority","total_amount","requested_by_name","approved_by_name","submitted_at","notes"] },
  { id:"purchase_orders", label:"Purchase Orders", table:"purchase_orders", cols:["po_number","status","total_amount","delivery_date","created_by_name","approved_by_name","notes"] },
  { id:"goods_received", label:"Goods Received (GRN)", table:"goods_received", cols:["grn_number","total_value","inspection_status","received_by_name","received_at","notes"] },
  { id:"suppliers", label:"Suppliers", table:"suppliers", cols:["name","contact_person","email","phone","address","tax_id","kra_pin","category","rating","status","bank_name","bank_account"] },
  { id:"payment_vouchers", label:"Payment Vouchers", table:"payment_vouchers", cols:["voucher_number","payee_name","amount","payment_method","voucher_date","status","bank_name","account_number","description","created_by_name","approved_by_name"] },
  { id:"receipt_vouchers", label:"Receipt Vouchers", table:"receipt_vouchers", cols:["receipt_number","received_from","amount","payment_method","receipt_date","description","created_by_name"] },
  { id:"purchase_vouchers", label:"Purchase Vouchers", table:"purchase_vouchers", cols:["voucher_number","supplier_name","invoice_number","amount","voucher_date","status","created_by_name","approved_by_name"] },
  { id:"budgets", label:"Budgets", table:"budgets", cols:["budget_code","budget_name","department_name","financial_year","allocated_amount","spent_amount","committed_amount","category","status"] },
  { id:"contracts", label:"Contracts", table:"contracts", cols:["contract_number","title","start_date","end_date","total_value","status","payment_terms","performance_score","created_by_name"] },
  { id:"tenders", label:"Tenders", table:"tenders", cols:["tender_number","title","tender_type","category","estimated_value","opening_date","closing_date","status","awarded_to_name","awarded_amount"] },
  { id:"inspections", label:"Inspections", table:"inspections", cols:["inspection_number","item_name","supplier_name","quantity_inspected","quantity_accepted","quantity_rejected","result","inspection_date","inspector_name"] },
  { id:"non_conformance", label:"Non-Conformance Reports", table:"non_conformance", cols:["ncr_number","item_name","supplier_name","severity","status","issue_description","root_cause","raised_by_name","resolved_by_name"] },
  { id:"audit_log", label:"Audit Trail", table:"audit_log", cols:["action","module","user_name","record_id","ip_address","created_at"] },
  { id:"stock_movements", label:"Stock Movements", table:"stock_movements", cols:["movement_number","item_name","movement_type","quantity","unit_cost","total_value","from_location","to_location","reference","created_by_name","created_at"] },
  { id:"fixed_assets", label:"Fixed Assets", table:"fixed_assets", cols:["asset_number","description","category","department_name","acquisition_date","acquisition_cost","net_book_value","status","serial_number","manufacturer","warranty_expiry"] },
];

const MONEY_COLS = ["total_amount","amount","unit_price","total_value","allocated_amount","spent_amount","committed_amount","estimated_value","awarded_amount","bid_amount","acquisition_cost","net_book_value","unit_cost","subtotal","tax_amount"];
const fmtVal = (col: string, val: any) => {
  if (val === null || val === undefined) return "";
  if (MONEY_COLS.includes(col)) return `KES ${Number(val||0).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (col.endsWith("_at") || col.endsWith("_date")) { const d=new Date(val); return isNaN(d.getTime())?val:d.toLocaleDateString("en-KE"); }
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};
const colLabel = (col: string) => col.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

export default function ReportsPage() {
  const { profile, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");
  const printRef = useRef<HTMLDivElement>(null);
  const [reportId, setReportId] = useState("items");
  const [reportMode, setReportMode] = useState<"summary"|"detailed">("detailed");
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [letterheadHtml, setLetterheadHtml] = useState<string|null>(null);
  const [reportSearch, setReportSearch] = useState("");
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);

  const currentReport = REPORTS.find(r=>r.id===reportId)||REPORTS[0];

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value")
      .in("key",["system_name","hospital_name","letterhead_html"])
      .then(({data}:any)=>{
        if(!data) return;
        const m:Record<string,string>={};
        data.forEach((r:any)=>{ if(r.key&&r.value) m[r.key]=r.value; });
        if(m.system_name) setSysName(m.system_name);
        if(m.hospital_name) setHospitalName(m.hospital_name);
        if(m.letterhead_html) setLetterheadHtml(m.letterhead_html);
      });
  },[]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any).from(currentReport.table).select("*");
      const dateCol = currentReport.table==="audit_log"?"created_at":currentReport.table.includes("voucher")?"voucher_date":currentReport.table==="receipt_vouchers"?"receipt_date":"created_at";
      if(["audit_log","payment_vouchers","receipt_vouchers","purchase_vouchers","sales_vouchers","journal_vouchers","requisitions","purchase_orders"].includes(currentReport.table)){
        q = q.gte(dateCol,dateFrom).lte(dateCol,dateTo+"T23:59:59");
      }
      if(reportId==="low_stock") q = q.filter("quantity_in_stock","lte","reorder_level");
      q = q.order("created_at",{ascending:false}).limit(2000);
      const { data: rows, error } = await q;
      if(error) throw error;
      setData(rows||[]);
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); setData([]); }
    setLoading(false);
  },[currentReport,dateFrom,dateTo,reportId]);

  useEffect(()=>{ loadReport(); },[loadReport]);

  const filtered = data.filter(row=>{
    if(search) {
      const s=search.toLowerCase();
      return currentReport.cols.some(c=>String(row[c]||"").toLowerCase().includes(s));
    }
    if(statusFilter!=="all" && row.status) return row.status===statusFilter;
    return true;
  });

  // KPI summaries
  const moneyCol = currentReport.cols.find(c=>MONEY_COLS.includes(c))||"";
  const totalAmt = filtered.reduce((s,r)=>s+Number(r[moneyCol]||0),0);
  const statusCounts: Record<string,number> = {};
  filtered.forEach(r=>{ if(r.status) statusCounts[r.status]=(statusCounts[r.status]||0)+1; });
  const statuses = Object.keys(statusCounts);

  // Summary mode: group by key
  const summaryRows = reportMode==="summary" ? (() => {
    const groupKey = currentReport.cols.find(c=>["status","item_type","movement_type","category","result","severity","payment_method"].includes(c));
    if(!groupKey) return filtered;
    const groups: Record<string,any[]> = {};
    filtered.forEach(r=>{ const k=r[groupKey]||"Unknown"; (groups[k]=groups[k]||[]).push(r); });
    return Object.entries(groups).map(([k,rows])=>({
      [groupKey]:k, count:rows.length,
      ...(moneyCol?{[moneyCol]:rows.reduce((s,r)=>s+Number(r[moneyCol]||0),0)}:{}),
    }));
  })() : filtered;

  const displayCols = reportMode==="summary"
    ? (()=>{ const groupKey=currentReport.cols.find(c=>["status","item_type","movement_type","category","result","severity","payment_method"].includes(c))||currentReport.cols[0]; return [groupKey,"count",...(moneyCol?[moneyCol]:[])]; })()
    : currentReport.cols;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const headerRow = [sysName, hospitalName, `Report: ${currentReport.label}`, `Period: ${dateFrom} to ${dateTo}`, `Generated: ${new Date().toLocaleString("en-KE")}`, "", `Mode: ${reportMode.toUpperCase()} | Records: ${filtered.length}`];
    const ws = XLSX.utils.aoa_to_sheet([headerRow.map((_,i)=>i===0?_:""), [], displayCols.map(colLabel), ...summaryRows.map(row=>displayCols.map(c=>fmtVal(c,row[c])))]);
    ws["!cols"] = displayCols.map(()=>({wch:22}));
    XLSX.utils.book_append_sheet(wb, ws, currentReport.label.slice(0,31));
    XLSX.writeFile(wb, `${currentReport.label.replace(/\s/g,"_")}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${currentReport.label} exported to Excel`});
  };

  const handlePrint = () => {
    const content = printRef.current;
    if(!content) return;
    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    win.document.write(`
      <html><head><title>${currentReport.label} — ${hospitalName}</title>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:20px;font-size:12px;}
        .letterhead{border-bottom:3px solid #1a3a6b;margin-bottom:16px;padding-bottom:12px;}
        .lh-title{font-size:18px;font-weight:900;color:#1a3a6b;}
        .lh-sub{font-size:10px;color:#555;}
        .report-title{font-size:14px;font-weight:bold;color:#1a3a6b;margin:10px 0 4px;}
        .meta{font-size:10px;color:#888;margin-bottom:14px;}
        table{width:100%;border-collapse:collapse;font-size:10px;}
        th{background:#1a3a6b;color:#fff;padding:5px 7px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;}
        td{padding:4px 7px;border-bottom:1px solid #e5e7eb;}
        tr:nth-child(even){background:#f9fafb;}
        .footer{margin-top:16px;font-size:9px;color:#aaa;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px;}
        @media print{@page{margin:1.5cm;}}
      </style></head><body>
      <div class="letterhead">
        ${letterheadHtml||`<div class="lh-title">${hospitalName}</div><div class="lh-sub">${sysName} — Official Document</div>`}
      </div>
      <div class="report-title">${currentReport.label} — ${reportMode==="summary"?"Summary":"Detailed"} Report</div>
      <div class="meta">Period: ${dateFrom} to ${dateTo} &nbsp;|&nbsp; Records: ${summaryRows.length} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString("en-KE")} &nbsp;|&nbsp; By: ${profile?.full_name||"System"}</div>
      <table>
        <thead><tr>${displayCols.map(c=>`<th>${colLabel(c)}</th>`).join("")}</tr></thead>
        <tbody>${summaryRows.map(row=>`<tr>${displayCols.map(c=>`<td>${fmtVal(c,row[c])}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
      <div class="footer">${hospitalName} — ${sysName} · Confidential · ${new Date().getFullYear()}</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(()=>win.print(),400);
  };

  const filteredReports = REPORTS.filter(r=>r.label.toLowerCase().includes(reportSearch.toLowerCase()));

  return (
    <div className="p-4 space-y-3" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Title bar (Image 2 style) */}
      <div className="flex items-center justify-between rounded-xl px-4 py-3"
        style={{background:"linear-gradient(90deg,#1a3a6b,#1d4a87)",boxShadow:"0 4px 16px rgba(26,58,107,0.3)"}}>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-white" />
          <div>
            <h1 className="text-base font-black text-white">Reports & Analytics</h1>
            <p className="text-[10px] text-white/60">{hospitalName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadReport} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 text-white hover:bg-white/30 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} />
            Refresh
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-blue-800 hover:bg-blue-50 transition-all">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500 text-white hover:bg-green-600 transition-all">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* KPI Summary tiles (Image 2 style) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="rounded-xl p-3 flex flex-col" style={{background:"#c0392b",color:"#fff"}}>
          <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">Total Records</div>
          <div className="text-2xl font-black">{filtered.length.toLocaleString()}</div>
          <div className="text-[10px] opacity-70">{currentReport.label}</div>
        </div>
        {moneyCol && (
          <div className="rounded-xl p-3 flex flex-col" style={{background:"#7f8c2b",color:"#fff"}}>
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">Total Amount</div>
            <div className="text-lg font-black">{totalAmt>=1000000?`${(totalAmt/1000000).toFixed(1)}M`:totalAmt>=1000?`${(totalAmt/1000).toFixed(0)}K`:totalAmt.toFixed(0)}</div>
            <div className="text-[10px] opacity-70">KES</div>
          </div>
        )}
        {statuses.slice(0,3).map((s,i)=>(
          <div key={s} className="rounded-xl p-3 flex flex-col" style={{background:i===0?"#1d8a7a":i===1?"#6c3491":"#1a4a7a",color:"#fff"}}>
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">{s}</div>
            <div className="text-2xl font-black">{statusCounts[s]}</div>
            <div className="text-[10px] opacity-70">records</div>
          </div>
        ))}
        {statuses.length===0 && (
          <div className="rounded-xl p-3 flex flex-col" style={{background:"#162440",color:"#fff"}}>
            <div className="text-[9px] font-bold uppercase tracking-widest opacity-80">Report Mode</div>
            <div className="text-lg font-black capitalize">{reportMode}</div>
            <div className="text-[10px] opacity-70">view</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl p-3 flex flex-wrap items-center gap-3" style={{background:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        {/* Report Selector with search */}
        <div className="relative">
          <button onClick={()=>setReportDropdownOpen(v=>!v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 min-w-[200px]"
            style={{border:"1.5px solid #d1d5db"}}>
            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
            <span className="flex-1 text-left truncate">{currentReport.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </button>
          {reportDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 rounded-xl z-50 overflow-hidden w-72"
              style={{background:"#fff",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:"1px solid #e5e7eb"}}>
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={reportSearch} onChange={e=>setReportSearch(e.target.value)}
                    placeholder="Search reports…"
                    className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 outline-none" />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto py-1">
                {filteredReports.map(r=>(
                  <button key={r.id} onClick={()=>{ setReportId(r.id); setReportDropdownOpen(false); setReportSearch(""); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-blue-50 transition-colors text-left"
                    style={{fontWeight:r.id===reportId?"700":"400",color:r.id===reportId?"#1a3a6b":"#374151",background:r.id===reportId?"#dbeafe":"transparent"}}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500 font-semibold">From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          <label className="text-[10px] text-gray-500 font-semibold">To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
        </div>

        {/* Mode */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {(["detailed","summary"] as const).map(m=>(
            <button key={m} onClick={()=>setReportMode(m)}
              className="px-3 py-1.5 text-xs font-semibold capitalize transition-all"
              style={{background:reportMode===m?"#1a3a6b":"#fff",color:reportMode===m?"#fff":"#374151"}}>
              {m}
            </button>
          ))}
        </div>

        {/* Status filter */}
        {statuses.length > 0 && (
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs outline-none">
            <option value="all">All Status</option>
            {statuses.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search in results…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
          {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400" /></button>}
        </div>

        <div className="text-[10px] text-gray-400 ml-auto">{summaryRows.length.toLocaleString()} records</div>
      </div>

      {/* Table (Image 2 style) */}
      <div ref={printRef} className="rounded-xl overflow-hidden" style={{background:"#fff",boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
        {/* Report header (shows on print with letterhead) */}
        <div className="hidden print:block p-4 border-b border-gray-200">
          {letterheadHtml ? (
            <div dangerouslySetInnerHTML={{__html:letterheadHtml}} />
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-black text-blue-900">{hospitalName}</div>
                <div className="text-xs text-gray-500">{sysName} — Official Document</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{currentReport.label}</div>
                <div className="text-xs text-gray-400">{new Date().toLocaleDateString("en-KE",{year:"numeric",month:"long",day:"numeric"})}</div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-400 mb-3" />
            <p className="text-sm text-gray-400">Loading {currentReport.label}…</p>
          </div>
        ) : summaryRows.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">No records found</p>
            <p className="text-xs text-gray-300 mt-1">Try adjusting the date range or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{background:"#1a3a6b"}}>
                  <th className="text-left px-3 py-2 text-white/70 font-semibold w-8">#</th>
                  {displayCols.map(c=>(
                    <th key={c} className="text-left px-3 py-2 text-white font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">{colLabel(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row,i)=>(
                  <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 text-gray-400 font-medium">{i+1}</td>
                    {displayCols.map(c=>{
                      const v = fmtVal(c,row[c]);
                      const isStatus = c==="status"||c==="result";
                      const statusColor = v==="pending"||v==="open"?"#f59e0b":v==="approved"||v==="pass"||v==="active"?"#10b981":v==="rejected"||v==="failed"?"#ef4444":"#6b7280";
                      return (
                        <td key={c} className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                          {isStatus && v ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{background:`${statusColor}18`,color:statusColor}}>
                              {v}
                            </span>
                          ) : v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              {moneyCol && reportMode==="detailed" && (
                <tfoot>
                  <tr style={{background:"#f8fafc",borderTop:"2px solid #1a3a6b"}}>
                    <td className="px-3 py-2" />
                    {displayCols.map(c=>(
                      <td key={c} className="px-3 py-2 font-black text-blue-900 text-xs">
                        {c===moneyCol ? `KES ${summaryRows.reduce((s,r)=>s+Number(r[c]||0),0).toLocaleString("en-KE",{minimumFractionDigits:2})}` :
                         c===displayCols[0] ? "TOTAL" : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {/* Footer */}
        {summaryRows.length > 0 && (
          <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100" style={{background:"#f8fafc"}}>
            <span className="text-[10px] text-gray-400">{hospitalName} — {sysName} · Confidential</span>
            <span className="text-[10px] text-gray-400">Generated: {new Date().toLocaleString("en-KE")} by {profile?.full_name||"System"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
