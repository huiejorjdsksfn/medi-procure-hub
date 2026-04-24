/**
 * ProcurBosse - Reports & BI v6.0 (Power BI Dashboard Style)
 * Left sidebar report types, KPI tiles, tabular data, Excel/Print export
 * EL5 MediProcure, Embu Level 5 Hospital
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Printer, FileSpreadsheet, Search, X, Calendar,
  BarChart3, TrendingUp, Package, ShoppingCart, DollarSign, FileText,
  Truck, Shield, Activity, BookOpen, Gavel, ClipboardList, ChevronRight,
  Filter, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";

const db = supabase as any;
const fmtKES = (n:number) => n>=1_000_000?`KES ${(n/1_000_000).toFixed(2)}M`:n>=1_000?`KES ${(n/1_000).toFixed(2)}K`:`KES ${Number(n||0).toFixed(2)}`;

const REPORT_TYPES = [
  { id:"requisitions",      label:"Requisitions",        table:"requisitions",      icon:ClipboardList,  color:"#0078d4", group:"Procurement" },
  { id:"purchase_orders",   label:"Purchase Orders",     table:"purchase_orders",   icon:ShoppingCart,   color:"#106ebe", group:"Procurement" },
  { id:"goods_received",    label:"Goods Received",      table:"goods_received",    icon:Package,        color:"#005a9e", group:"Procurement" },
  { id:"suppliers",         label:"Suppliers",           table:"suppliers",         icon:Truck,          color:"#004578", group:"Procurement" },
  { id:"tenders",           label:"Tenders",             table:"tenders",           icon:Gavel,          color:"#00188f", group:"Procurement" },
  { id:"contracts",         label:"Contracts",           table:"contracts",         icon:FileText,       color:"#0078d4", group:"Procurement" },
  { id:"items",             label:"Inventory Items",     table:"items",             icon:Package,        color:"#038387", group:"Inventory" },
  { id:"payment_vouchers",  label:"Payment Vouchers",    table:"payment_vouchers",  icon:DollarSign,     color:"#d83b01", group:"Finance" },
  { id:"receipt_vouchers",  label:"Receipt Vouchers",    table:"receipt_vouchers",  icon:FileText,       color:"#a4262c", group:"Finance" },
  { id:"journal_vouchers",  label:"Journal Vouchers",    table:"journal_vouchers",  icon:BookOpen,       color:"#7719aa", group:"Finance" },
  { id:"budgets",           label:"Budgets",             table:"budgets",           icon:DollarSign,     color:"#8764b8", group:"Finance" },
  { id:"inspections",       label:"QC Inspections",      table:"inspections",       icon:Shield,         color:"#498205", group:"Quality" },
  { id:"non_conformance",   label:"Non-Conformance",     table:"non_conformance",   icon:Shield,         color:"#3f7305", group:"Quality" },
  { id:"audit_log",         label:"Audit Log",           table:"audit_log",         icon:Activity,       color:"#5c2d91", group:"System" },
];

const GROUPS = ["Procurement","Inventory","Finance","Quality","System"];

export default function ReportsPage() {
  const {profile} = useAuth();
  const settings = useSystemSettings();
  const hospitalName = settings.hospital_name || "Embu Level 5 Hospital";
  const sysName = settings.system_name || "EL5 MediProcure";

  const [activeRpt, setActiveRpt] = useState(REPORT_TYPES[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0,10));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState({total:0,pending:0,approved:0,value:0});
  const [summaries, setSummaries] = useState<{label:string;value:number|string;color:string;icon:any}[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = db.from(activeRpt.table).select("*");
      if (startDate && activeRpt.table !== "items") q = q.gte("created_at", startDate+"T00:00:00");
      if (endDate && activeRpt.table !== "items") q = q.lte("created_at", endDate+"T23:59:59");
      q = q.order("created_at", {ascending:false}).limit(500);
      const {data,error} = await q;
      if (error) throw error;
      const filtered = search ? (data||[]).filter((r:any) =>
        Object.values(r).some(v => String(v||"").toLowerCase().includes(search.toLowerCase()))
      ) : (data||[]);
      setRows(filtered);

      const total = filtered.length;
      const pending = filtered.filter((r:any)=>r.status==="pending"||r.status==="submitted"||r.status==="draft").length;
      const approved = filtered.filter((r:any)=>r.status==="approved"||r.status==="active"||r.status==="completed").length;
      const value = filtered.reduce((a:number,r:any)=>{
        const v = r.total_amount||r.amount||r.estimated_amount||r.total_value||r.quantity||0;
        return a + Number(v||0);
      },0);
      setKpi({total,pending,approved,value});

      setSummaries([
        {label:"Total Records",  value:total,         color:activeRpt.color, icon:BarChart3},
        {label:"Pending / Draft",value:pending,        color:T.warning,       icon:ClipboardList},
        {label:"Approved / Active",value:approved,    color:T.success,       icon:TrendingUp},
        {label:"Total Value",    value:fmtKES(value), color:T.finance,       icon:DollarSign},
      ]);
    } catch(e:any) {
      toast({title:"Error loading report",description:e.message,variant:"destructive"});
    }
    setLoading(false);
  },[activeRpt,startDate,endDate,search]);

  useEffect(()=>{load();},[load]);

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,activeRpt.label);
    XLSX.writeFile(wb,`${sysName}-${activeRpt.id}-${startDate}-${endDate}.xlsx`);
  };

  const printReport = () => {
    const cols = rows.length ? Object.keys(rows[0]).filter(k=>!k.includes("_id")&&k!=="id") : [];
    const w = window.open("","_blank");
    if(!w)return;
    w.document.write(`<html><head><title>${activeRpt.label} Report</title><style>
      body{font-family:'Segoe UI',sans-serif;margin:24px;color:#1a1a2e}
      h1{font-size:20px;margin-bottom:4px}
      .sub{font-size:13px;color:#666;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th{background:#0078d4;color:#fff;padding:8px 10px;text-align:left;font-weight:600}
      td{padding:7px 10px;border-bottom:1px solid #e8ecf1}
      tr:nth-child(even)td{background:#f8f9fb}
      .kpi{display:flex;gap:24px;margin-bottom:20px;padding:16px;background:#f3f5f8;border-radius:8px}
      .kv{text-align:center}.kn{font-size:22px;font-weight:800;color:#0078d4}.kl{font-size:11px;color:#666}
    </style></head><body>
    <h1>${hospitalName} - ${activeRpt.label} Report</h1>
    <div class="sub">${sysName} - Period: ${startDate} to ${endDate} - Generated: ${new Date().toLocaleString("en-KE")}</div>
    <div class="kpi">
      <div class="kv"><div class="kn">${kpi.total}</div><div class="kl">Total Records</div></div>
      <div class="kv"><div class="kn">${kpi.pending}</div><div class="kl">Pending</div></div>
      <div class="kv"><div class="kn">${kpi.approved}</div><div class="kl">Approved</div></div>
      <div class="kv"><div class="kn">${fmtKES(kpi.value)}</div><div class="kl">Total Value</div></div>
    </div>
    <table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <div style="margin-top:20px;font-size:10px;color:#999;text-align:center">
      ${hospitalName} - ${sysName} ProcurBosse v6.0 - Embu County Government
    </div></body></html>`);
    w.document.close();
    w.print();
  };

  const cols = rows.length ? Object.keys(rows[0]).filter(k=>k!=="id"&&!["__v"].includes(k)).slice(0,10) : [];

  return (
    <div style={{background:T.bg,minHeight:"100%",display:"flex",flexDirection:"column",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"}}>

      {/* Page header */}
      <div style={{background:"#fff",borderBottom:"1px solid "+T.border,padding:"12px 20px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 1px 3px rgba(0,0,0,.05)",flexShrink:0}}>
        <div style={{width:38,height:38,borderRadius:T.r,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <BarChart3 size={19} color={T.primary}/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:17,fontWeight:700,color:T.fg}}>Reports & Business Intelligence</h1>
          <div style={{fontSize:11,color:T.fgMuted}}>{hospitalName} - {sysName}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={exportXLSX} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#107c10",border:"none",borderRadius:T.r,cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600}}>
            <FileSpreadsheet size={13}/> Export Excel
          </button>
          <button onClick={printReport} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:T.primary,border:"none",borderRadius:T.r,cursor:"pointer",color:"#fff",fontSize:12,fontWeight:600}}>
            <Printer size={13}/> Print
          </button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* Left sidebar - report types */}
        <div style={{width:220,background:"#fff",borderRight:"1px solid "+T.border,overflowY:"auto",flexShrink:0}}>
          <div style={{padding:"10px 14px",fontSize:10,fontWeight:700,color:T.fgMuted,textTransform:"uppercase",letterSpacing:".06em",borderBottom:"1px solid "+T.border}}>
            Report Types
          </div>
          {GROUPS.map(grp=>{
            const grpTypes = REPORT_TYPES.filter(r=>r.group===grp);
            return(
              <div key={grp}>
                <div style={{padding:"8px 14px 4px",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:".05em"}}>{grp}</div>
                {grpTypes.map(rt=>{
                  const Icon=rt.icon;
                  const active=activeRpt.id===rt.id;
                  return(
                    <button key={rt.id} onClick={()=>setActiveRpt(rt)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"8px 14px",background:active?rt.color+"14":"transparent",
                        border:"none",borderLeft:active?"3px solid "+rt.color:"3px solid transparent",cursor:"pointer",
                        color:active?rt.color:T.fgMuted,fontSize:12,fontWeight:active?600:400,transition:"all .12s",textAlign:"left"}}
                      onMouseEnter={e=>{if(!active)(e.currentTarget as any).style.background=T.bg;}}
                      onMouseLeave={e=>{if(!active)(e.currentTarget as any).style.background="transparent";}}>
                      <Icon size={13}/>{rt.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Filters bar */}
          <div style={{background:"#fff",borderBottom:"1px solid "+T.border,padding:"10px 16px",display:"flex",gap:10,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,background:T.bg,border:"1px solid "+T.border,borderRadius:T.r,padding:"5px 10px"}}>
              <Calendar size={12} color={T.fgMuted}/>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{border:"none",background:"transparent",fontSize:12,color:T.fg,outline:"none"}}/>
              <span style={{color:T.fgDim,fontSize:11}}>to</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{border:"none",background:"transparent",fontSize:12,color:T.fg,outline:"none"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,background:T.bg,border:"1px solid "+T.border,borderRadius:T.r,padding:"5px 10px",flex:1,minWidth:180}}>
              <Search size={12} color={T.fgMuted}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..." style={{border:"none",background:"transparent",fontSize:12,color:T.fg,outline:"none",width:"100%"}}/>
              {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"transparent",cursor:"pointer",padding:0}}><X size={12} color={T.fgMuted}/></button>}
            </div>
            <button onClick={load} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:T.primaryBg,border:"1px solid "+T.primary+"33",borderRadius:T.r,cursor:"pointer",color:T.primary,fontSize:12,fontWeight:600}}>
              <RefreshCw size={12} style={loading?{animation:"spin 1s linear infinite"}:{}}/> Load
            </button>
          </div>

          {/* KPI summary tiles */}
          <div style={{padding:"12px 16px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,flexShrink:0,borderBottom:"1px solid "+T.border,background:"#fff"}}>
            {summaries.map((s,i)=>{
              const Icon=s.icon;
              return(
                <div key={i} style={{background:T.bg,borderRadius:T.rLg,padding:"12px 14px",border:"1px solid "+T.border,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:34,height:34,borderRadius:T.rMd,background:s.color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon size={16} color={s.color}/>
                  </div>
                  <div>
                    <div style={{fontSize:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
                    <div style={{fontSize:10,color:T.fgMuted,marginTop:2}}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div style={{flex:1,overflowY:"auto",padding:"0 0 16px"}}>
            {loading?(
              <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:T.fgMuted,fontSize:13}}>
                <RefreshCw size={18} style={{animation:"spin 1s linear infinite",marginRight:8}}/> Loading {activeRpt.label}...
              </div>
            ):rows.length===0?(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:200,color:T.fgMuted}}>
                <BarChart3 size={32} color={T.border} style={{marginBottom:12}}/>
                <div style={{fontSize:13,fontWeight:600}}>No records found</div>
                <div style={{fontSize:11,color:T.fgDim,marginTop:4}}>Try adjusting your date range or search filter</div>
              </div>
            ):(
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:activeRpt.color,position:"sticky",top:0,zIndex:1}}>
                      <th style={{padding:"9px 14px",textAlign:"left",fontWeight:700,color:"#fff",fontSize:11,whiteSpace:"nowrap"}}>#</th>
                      {cols.map(c=>(
                        <th key={c} style={{padding:"9px 14px",textAlign:"left",fontWeight:700,color:"#fff",fontSize:11,whiteSpace:"nowrap"}}>
                          {c.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row,i)=>(
                      <tr key={i} style={{background:i%2===0?"#fff":"#f8f9fb",borderBottom:"1px solid "+T.border}}>
                        <td style={{padding:"7px 14px",color:T.fgMuted,fontWeight:600}}>{i+1}</td>
                        {cols.map(c=>{
                          const v=row[c];
                          const isStatus=c==="status";
                          const statusColor=isStatus?(v==="approved"||v==="active"||v==="completed"?T.success:v==="pending"||v==="submitted"?T.warning:v==="rejected"||v==="cancelled"?T.error:T.fgMuted):"";
                          return(
                            <td key={c} style={{padding:"7px 14px",color:isStatus?statusColor:T.fg,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {isStatus&&v?(
                                <span style={{padding:"2px 8px",borderRadius:4,background:statusColor+"14",color:statusColor,fontSize:10,fontWeight:700}}>
                                  {String(v).toUpperCase()}
                                </span>
                              ):c.includes("date")||c.includes("_at")?
                                (v?new Date(v).toLocaleDateString("en-KE"):"-")
                              :c.includes("amount")||c.includes("value")||c.includes("price")||c.includes("cost")?
                                (v?fmtKES(Number(v)):"-")
                              : String(v??"")||"-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div style={{background:"#fff",borderTop:"1px solid "+T.border,padding:"6px 16px",display:"flex",alignItems:"center",gap:12,fontSize:11,color:T.fgMuted,flexShrink:0}}>
            <span>{activeRpt.label} - <strong>{rows.length}</strong> records</span>
            <span>Period: {startDate} to {endDate}</span>
            <div style={{flex:1}}/>
            <span style={{color:T.fgDim}}>{hospitalName} - {sysName} ProcurBosse v6.0</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
