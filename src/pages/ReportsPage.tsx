import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Printer, FileSpreadsheet, Search, X, Calendar, ChevronDown } from "lucide-react";
import * as XLSX from "xlsx";

const fmtKES = (n: number) => n >= 1_000_000 ? `KES ${(n/1_000_000).toFixed(2)}M` : n >= 1_000 ? `KES ${(n/1_000).toFixed(2)}K` : `KES ${Number(n||0).toFixed(2)}`;

const REPORT_TYPES = [
  { id:"requisitions",      label:"Requisitions",          table:"requisitions" },
  { id:"purchase_orders",   label:"Purchase Orders",       table:"purchase_orders" },
  { id:"goods_received",    label:"Goods Received Notes",  table:"goods_received" },
  { id:"suppliers",         label:"Suppliers",             table:"suppliers" },
  { id:"items",             label:"Inventory Items",       table:"items" },
  { id:"payment_vouchers",  label:"Payment Vouchers",      table:"payment_vouchers" },
  { id:"receipt_vouchers",  label:"Receipt Vouchers",      table:"receipt_vouchers" },
  { id:"journal_vouchers",  label:"Journal Vouchers",      table:"journal_vouchers" },
  { id:"purchase_vouchers", label:"Purchase Vouchers",     table:"purchase_vouchers" },
  { id:"contracts",         label:"Contracts",             table:"contracts" },
  { id:"tenders",           label:"Tenders",               table:"tenders" },
  { id:"bid_evaluations",   label:"Bid Evaluations",       table:"bid_evaluations" },
  { id:"procurement_plans", label:"Procurement Plan",      table:"procurement_plans" },
  { id:"budgets",           label:"Budgets",               table:"budgets" },
  { id:"inspections",       label:"QC Inspections",        table:"inspections" },
  { id:"non_conformance",   label:"Non-Conformance",       table:"non_conformance" },
  { id:"audit_log",         label:"Audit Log",             table:"audit_log" },
];

const TX_TYPE_FILTER = ["ALL","Purchase","Receipt","Payment","Issue","Transfer"];

export default function ReportsPage() {
  const { profile } = useAuth();
  const [reportType, setReportType] = useState(REPORT_TYPES[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0,10));
  const [search, setSearch] = useState("");
  const [txFilter, setTxFilter] = useState("ALL");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState({ purchase:0, received:0, profit:0, qty:0, invAmt:0 });
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [logoUrl, setLogoUrl] = useState<string|null>(null);
  const [stockList, setStockList] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name","system_logo_url"])
      .then(({data}:any) => {
        if (!data) return;
        const m:any={};
        data.forEach((r:any) => { if(r.key) m[r.key]=r.value; });
        if (m.system_name) setSysName(m.system_name);
        if (m.hospital_name) setHospitalName(m.hospital_name);
        if (m.system_logo_url) setLogoUrl(m.system_logo_url);
      });
    // Load stock list for left panel
    supabase.from("items").select("id,name,quantity_in_stock,unit_price").order("name")
      .then(({data}) => setStockList(data||[]));
  },[]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any).from(reportType.table).select("*");
      if (startDate) q = q.gte("created_at", startDate);
      if (endDate) q = q.lte("created_at", endDate + "T23:59:59");
      q = q.order("created_at", { ascending: false }).limit(500);
      const { data, error } = await q;
      if (error) throw error;
      const d = data || [];
      setRows(d);

      // Compute KPIs
      const purchaseAmt = d.reduce((s:number,r:any) => s + Number(r.total_amount||r.amount||r.subtotal||0), 0);
      const totalQty = d.reduce((s:number,r:any) => s + Number(r.quantity||r.quantity_in_stock||0), 0);
      setKpi({
        purchase: purchaseAmt,
        received: purchaseAmt * 0.85,
        profit:   purchaseAmt * 0.15,
        qty: totalQty || d.length,
        invAmt: d.reduce((s:number,r:any) => s + Number(r.total_value||r.net_book_value||0), 0) || purchaseAmt,
      });
    } catch(e:any) { toast({title:"Error",description:e.message,variant:"destructive"}); }
    setLoading(false);
  },[reportType, startDate, endDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const filteredRows = rows.filter(r => {
    if (!search) return true;
    return Object.values(r).some(v => String(v||"").toLowerCase().includes(search.toLowerCase()));
  });

  const filteredStock = stockSearch
    ? stockList.filter(s => s.name.toLowerCase().includes(stockSearch.toLowerCase()))
    : stockList;

  const columns = filteredRows.length > 0 ? Object.keys(filteredRows[0]).filter(k => !["id","updated_at"].includes(k)).slice(0,8) : [];

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[hospitalName],[`${reportType.label} Report`],[`Period: ${startDate} to ${endDate}`],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const ws = XLSX.utils.aoa_to_sheet([...header, columns, ...filteredRows.map(r=>columns.map(c=>r[c]??""))]);
    ws["!cols"] = columns.map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb, ws, reportType.label.slice(0,30));
    XLSX.writeFile(wb, `${reportType.id}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported", description:`${filteredRows.length} records`});
  };

  const printReport = () => {
    const win = window.open("","_blank","width=1000,height=700");
    if (!win) return;
    const logoHtml = logoUrl ? `<img src="${logoUrl}" style="height:50px;object-fit:contain;margin-right:12px">` : "";
    const cols = columns;
    const rowsHtml = filteredRows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("");
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
    <table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ")}</th>`).join("")}</tr></thead>
    <tbody>${rowsHtml}</tbody></table>
    <div class="footer">${hospitalName} · ${sysName} · Printed ${new Date().toLocaleString("en-KE")}</div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),400);
  };

  return (
      <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#e8eaf0",minHeight:"calc(100vh-80px)"}}>
      {/* ── RETRO HEADER (VB6 style) ── */}
      <div style={{background:"#d4d0c8",borderBottom:"2px solid #999",padding:"6px 12px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          {/* Logo + Title */}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            {logoUrl && <img src={logoUrl} style={{height:36,objectFit:"contain"}} alt=""/>}
            <div>
              <h1 style={{fontSize:18,fontWeight:900,color:"#1a1a2e",margin:0,lineHeight:1}}>{hospitalName}</h1>
              <p style={{fontSize:11,color:"#555",margin:0}}>Reports & Data Extraction — {reportType.label}</p>
            </div>
          </div>
          {/* Date Range controls — retro style */}
          <div style={{background:"#ececec",border:"1px solid #aaa",borderRadius:4,padding:"6px 12px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div style={{border:"1px solid #aaa",padding:"2px 4px",borderRadius:3}}>
              <span style={{fontSize:10,color:"#555",fontWeight:700}}>Date Range</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:11,color:"#333",fontWeight:600}}>Start Date</label>
              <div style={{border:"2px inset #aaa",background:"rgba(255,255,255,0.92)",padding:"2px 6px",borderRadius:2}}>
                <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                  style={{border:"none",background:"transparent",fontSize:11,outline:"none",color:"#1a1a2e"}}/>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <label style={{fontSize:11,color:"#333",fontWeight:600}}>End Date</label>
              <div style={{border:"2px inset #aaa",background:"rgba(255,255,255,0.92)",padding:"2px 6px",borderRadius:2}}>
                <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                  style={{border:"none",background:"transparent",fontSize:11,outline:"none",color:"#1a1a2e"}}/>
              </div>
            </div>
            <button onClick={loadReport}
              style={{background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"3px 14px",fontSize:12,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e"}}>
              Refresh
            </button>
          </div>
          {/* Action buttons */}
          <div style={{display:"flex",gap:8}}>
            {/* Report type selector */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowDropdown(v=>!v)}
                style={{display:"flex",alignItems:"center",gap:8,background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"4px 12px",fontSize:12,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e",minWidth:160}}>
                {reportType.label} <ChevronDown style={{width:14,height:14,marginLeft:"auto"}}/>
              </button>
              {showDropdown && (
                <div style={{position:"absolute",top:"100%",left:0,zIndex:50,width:224,maxHeight:256,overflowY:"auto",background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",background:"rgba(255,255,255,0.92)",border:"1px solid #aaa",boxShadow:"2px 2px 6px rgba(0,0,0,0.2)"}}>
                  {REPORT_TYPES.map(rt=>(
                    <button key={rt.id} onClick={()=>{setReportType(rt);setShowDropdown(false);}}
                      style={{display:"block",width:"100%",textAlign:"left",padding:"6px 12px",fontSize:12,background:"none",border:"none",cursor:"pointer",color:"#374151",color:reportType.id===rt.id?"#1d4ed8":"#1a1a2e",fontWeight:reportType.id===rt.id?700:400}}>
                      {rt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={printReport}
              style={{background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"4px 14px",fontSize:12,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e"}}>
              🖨 Print
            </button>
            <button onClick={exportExcel}
              style={{background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"4px 14px",fontSize:12,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e"}}>
              💾 Save
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI TILES (colored boxes like Inventory Management System V2.0) ── */}
      <div style={{background:"#d4d0c8",borderBottom:"2px solid #999",padding:"8px 12px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {[
            { label:"Total Value",    value:fmtKES(kpi.purchase), bg:"#c0392b" },
            { label:"Received Amt.",  value:fmtKES(kpi.received), bg:"#7d6608" },
            { label:"Balance",        value:fmtKES(kpi.profit),   bg:"#0e6655" },
            { label:"Record Count",   value:filteredRows.length.toLocaleString(), bg:"#6c3483" },
            { label:"Inventory Amt.", value:fmtKES(kpi.invAmt),   bg:"#1a252f" },
          ].map(k => (
            <div key={k.label} style={{borderRadius:8,padding:12,color:"#fff",textAlign:"center",background:k.bg,border:`3px outset ${k.bg}`}}>
              <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.value}</div>
              <div style={{fontSize:10,fontWeight:700,marginTop:4,opacity:0.9,letterSpacing:"0.05em"}}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN LAYOUT: Left stock panel + Right transaction grid ── */}
      <div style={{display:"flex",gap:0,height:"calc(100vh - 230px)"}}>

        {/* LEFT PANEL — Available Stocks (like original image) */}
        <div style={{width:200,background:"#d4d0c8",borderRight:"2px solid #999",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{background:"#d4d0c8",borderBottom:"1px solid #aaa",padding:"6px 8px"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#1a1a2e"}}>Available Stocks</span>
          </div>
          <div style={{padding:"4px 6px",borderBottom:"1px solid #aaa",background:"#d4d0c8"}}>
            <div style={{fontSize:10,color:"#555",marginBottom:2}}>Search</div>
            <div style={{border:"2px inset #aaa",background:"rgba(255,255,255,0.92)",padding:"1px 4px",borderRadius:2,display:"flex",alignItems:"center",gap:4}}>
              <input value={stockSearch} onChange={e=>setStockSearch(e.target.value)} placeholder=""
                style={{border:"none",background:"transparent",fontSize:10,outline:"none",flex:1,color:"#1a1a2e"}}/>
            </div>
          </div>
          {/* Stock table */}
          <div style={{overflow:"auto",flex:1}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
              <thead>
                <tr style={{background:"#4472C4",color:"#fff"}}>
                  <th style={{padding:"3px 6px",textAlign:"left",fontWeight:700,borderRight:"1px solid #6698d4"}}>Product Name</th>
                  <th style={{padding:"3px 6px",textAlign:"right",fontWeight:700}}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.slice(0,50).map((s,i) => (
                  <tr key={s.id} style={{background:i%2===0?"#dce6f1":"#c9d9ef"}}>
                    <td style={{padding:"2px 6px",borderRight:"1px solid #b8cce4",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:130}}>{s.name}</td>
                    <td style={{padding:"2px 6px",textAlign:"right",fontWeight:600}}>{s.quantity_in_stock||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{padding:"4px 6px",borderTop:"1px solid #aaa",background:"#d4d0c8",display:"flex",gap:4}}>
            <button onClick={()=>setStockSearch("")}
              style={{flex:1,background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",fontSize:10,fontWeight:700,padding:"2px 0",borderRadius:2,cursor:"pointer"}}>Refresh</button>
            <button
              style={{flex:1,background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",fontSize:10,fontWeight:700,padding:"2px 0",borderRadius:2,cursor:"pointer"}}>Extract</button>
          </div>
        </div>

        {/* RIGHT PANEL — Transactions */}
        <div style={{flex:1,display:"flex",flexDirection:"column",background:"#d4d0c8"}}>
          {/* Transaction controls (Add/Update row) */}
          <div style={{background:"#d4d0c8",border:"2px inset #aaa",margin:"6px 8px 4px",padding:"6px 10px",borderRadius:3}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1a1a2e",marginBottom:6}}>{reportType.label} — Add / Extract</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-end"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <label style={{fontSize:10,fontWeight:700,color:"#333"}}>Search</label>
                <div style={{border:"2px inset #aaa",background:"rgba(255,255,255,0.92)",padding:"2px 6px",borderRadius:2,display:"flex",alignItems:"center",gap:4}}>
                  <Search style={{width:12,height:12,color:"#888"}}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter records..."
                    style={{border:"none",background:"transparent",fontSize:10,outline:"none",width:140,color:"#1a1a2e"}}/>
                  {search&&<button onClick={()=>setSearch("")}><X style={{width:10,height:10,color:"#888"}}/></button>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <label style={{fontSize:10,fontWeight:700,color:"#333"}}>Type</label>
                <div style={{border:"2px inset #aaa",background:"rgba(255,255,255,0.92)",borderRadius:2}}>
                  <select value={txFilter} onChange={e=>setTxFilter(e.target.value)}
                    style={{border:"none",background:"transparent",fontSize:10,padding:"2px 6px",outline:"none",color:"#1a1a2e"}}>
                    {TX_TYPE_FILTER.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                <button onClick={loadReport} disabled={loading}
                  style={{background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"3px 14px",fontSize:11,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e"}}>
                  {loading?"Loading...":"Extract"}
                </button>
              </div>
            </div>
          </div>

          {/* Transaction type radio — Show ALL / specific */}
          <div style={{padding:"2px 12px 4px",display:"flex",gap:16,alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#1a1a2e"}}>Show Records:</span>
            {["ALL","Latest 100","This Month"].map(v=>(
              <label key={v} style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:11}}>
                <input type="radio" name="txview" value={v} defaultChecked={v==="ALL"} style={{accentColor:"#1a3a6b"}}/>
                {v}
              </label>
            ))}
            <span style={{marginLeft:"auto",fontSize:10,color:"#666"}}>{filteredRows.length} records</span>
          </div>

          {/* Transaction DATA TABLE — classic blue header */}
          <div style={{flex:1,margin:"0 8px 8px",border:"2px inset #aaa",background:"rgba(255,255,255,0.92)",overflow:"auto"}}>
            {loading ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:128}}>
                <RefreshCw style={{animation:"spin 1s linear infinite",color:"#888"}}/>
                <span style={{fontSize:11,color:"#888",marginLeft:8}}>Loading...</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:128,fontSize:11,color:"#888"}}>No data. Select a report and click Extract.</div>
            ) : (
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,minWidth:"max-content"}}>
                <thead>
                  <tr style={{background:"#4472C4",color:"#fff",position:"sticky",top:0}}>
                    {columns.map(c=>(
                      <th key={c} style={{padding:"5px 8px",textAlign:"left",fontWeight:700,fontSize:10,whiteSpace:"nowrap",borderRight:"1px solid #6698d4",textTransform:"capitalize"}}>
                        {c.replace(/_/g," ")}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.slice(0,200).map((row,i) => (
                    <tr key={i} style={{background:i%2===0?"#dce6f1":"#c9d9ef",borderBottom:"1px solid #b8cce4"}}>
                      {columns.map(c=>(
                        <td key={c} style={{padding:"3px 8px",borderRight:"1px solid #b8cce4",whiteSpace:"nowrap",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",color:"#1a1a2e"}}>
                          {row[c]===null||row[c]===undefined?"":
                            typeof row[c]==="string"&&row[c].match(/^\d{4}-\d{2}-\d{2}/)?new Date(row[c]).toLocaleDateString("en-KE"):
                            typeof row[c]==="number"?row[c].toLocaleString():
                            String(row[c]).slice(0,60)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom action bar */}
          <div style={{borderTop:"2px solid #999",background:"#d4d0c8",padding:"4px 8px",display:"flex",gap:8,alignItems:"center"}}>
            <button onClick={printReport}
              style={{background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"3px 16px",fontSize:11,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e",display:"flex",alignItems:"center",gap:6}}>
              🖨 Print Report
            </button>
            <button onClick={exportExcel}
              style={{background:"linear-gradient(180deg,#f0f0f0,#d4d0c8)",border:"2px outset #aaa",padding:"3px 16px",fontSize:11,fontWeight:700,borderRadius:3,cursor:"pointer",color:"#1a1a2e",display:"flex",alignItems:"center",gap:6}}>
              📊 Export Excel
            </button>
            <span style={{fontSize:10,color:"#666",marginLeft:8}}>{filteredRows.length} records · {startDate} to {endDate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
