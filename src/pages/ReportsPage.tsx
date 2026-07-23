/**
 * ProcurBosse - Reports & BI v7.0 (2026 ERP redesign)
 * Elevated card system, refined sidebar nav, real status-breakdown +
 * monthly-trend charts, and letterhead PDF export (shared printDocument
 * template with actual logos, matching every other document in the app).
 * Same data-loading / export logic as v6.0's bot pass — visual layer +
 * chart mix reconciled on top of it.
 * EL5 MediProcure, Embu Level 5 Hospital
 */
import { useEffect, useState, useCallback } from "react";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, FileSpreadsheet, Search, X, Calendar,
  BarChart3, TrendingUp, Package, ShoppingCart, DollarSign, FileText,
  Truck, Shield, Activity, BookOpen, Gavel, ClipboardList, ChevronRight,
  Filter, Printer } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as XLSX from "@e965/xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { T } from "@/lib/theme";
import { printDataTable } from "@/lib/printDocument";

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
  const hospitalName = settings.get("hospital_name", "Embu Level 5 Hospital");
  const sysName     = settings.get("system_name",   "EL5 MediProcure");

  const [activeRpt, setActiveRpt] = useState(REPORT_TYPES[0]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0,10));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [kpi, setKpi] = useState({total:0,pending:0,approved:0,value:0});
  const [summaries, setSummaries] = useState<{label:string;value:number|string;color:string;icon:any}[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{name:string;value:number;color:string}[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{month:string;count:number;value:number}[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string,string>>({});
  const [itemNames, setItemNames] = useState<Record<string,string>>({});

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: items }] = await Promise.all([
        db.from("profiles").select("id,full_name").limit(2000),
        db.from("items").select("id,name").limit(2000),
      ]);
      setProfileNames(Object.fromEntries((profiles||[]).map((p:any)=>[p.id,p.full_name])));
      setItemNames(Object.fromEntries((items||[]).map((it:any)=>[it.id,it.name])));
    })();
  }, []);

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

      // ── Status breakdown (donut) — real distribution, not decorative ──
      const statusColors: Record<string,string> = {
        approved:T.success, active:T.success, completed:T.success,
        pending:T.warning, submitted:T.warning, draft:T.fgDim,
        rejected:T.error, cancelled:T.error, expired:T.error,
      };
      const byStatus = new Map<string,number>();
      filtered.forEach((r:any)=>{ const s=r.status||"unspecified"; byStatus.set(s,(byStatus.get(s)||0)+1); });
      setStatusBreakdown(Array.from(byStatus.entries())
        .sort((a,b)=>b[1]-a[1]).slice(0,8)
        .map(([name,value])=>({ name:name.replace(/_/g," "), value, color: statusColors[name]||activeRpt.color })));

      // ── Monthly trend (bar) — record count + value per month across the range ──
      const byMonth = new Map<string,{count:number;value:number}>();
      filtered.forEach((r:any)=>{
        const d = r.created_at ? new Date(r.created_at) : null;
        if (!d || isNaN(d.getTime())) return;
        const key = d.toLocaleDateString("en-KE",{month:"short",year:"2-digit"});
        const cur = byMonth.get(key) || {count:0,value:0};
        cur.count += 1;
        cur.value += Number(r.total_amount||r.amount||r.estimated_amount||r.total_value||0);
        byMonth.set(key,cur);
      });
      setMonthlyTrend(Array.from(byMonth.entries()).map(([month,v])=>({ month, ...v })).slice(-12));
    } catch(e:any) {
      toast({title:"Error loading report",description:e.message,variant:"destructive"});
    }
    setLoading(false);
  },[activeRpt,startDate,endDate,search]);

  useEffect(()=>{load();},[load]);

  // Turns "total_amount" into "Total Amount", "created_at" into "Created At", etc.
  const humanLabel = (k: string) => k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const exportXLSX = () => {
    if (!rows.length) { toast({ title:"Nothing to export", description:"This report has no rows for the current filters.", variant:"destructive" }); return; }

    const dataCols = Object.keys(rows[0]).filter(k => k !== "id" && !["__v"].includes(k)).slice(0, 12);
    const isAmountCol = (k: string) => /amount|value|price|total|cost/i.test(k);
    const isDateCol = (k: string) => /_at$|_date$/i.test(k);

    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];

    // Title block — real hospital branding, not a raw data dump
    aoa.push([sysName]);
    aoa.push([hospitalName]);
    aoa.push([`${activeRpt.label} Report`]);
    aoa.push([`Period: ${startDate} to ${endDate}   ·   Generated: ${new Date().toLocaleString()}   ·   ${rows.length} records`]);
    aoa.push([]);
    aoa.push(dataCols.map(humanLabel));

    const totals: Record<string, number> = {};
    rows.forEach(r => {
      aoa.push(dataCols.map(k => {
        let v = r[k];
        if (k === "requested_by" || k === "approved_by" || k === "created_by") v = profileNames[v] || v;
        if (k === "item_id") v = itemNames[v] || v;
        if (isAmountCol(k)) { totals[k] = (totals[k]||0) + (Number(v)||0); return Number(v)||0; }
        if (isDateCol(k) && v) return new Date(v).toLocaleString("en-KE", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
        return v ?? "";
      }));
    });

    // Totals row for any amount-like columns
    if (Object.keys(totals).length) {
      aoa.push(dataCols.map(k => isAmountCol(k) ? totals[k] : (k === dataCols[0] ? "TOTAL" : "")));
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const headerRowIdx = 5; // 0-indexed row of the actual column headers

    // Column widths sized to content, not Excel's cramped default
    ws["!cols"] = dataCols.map((k, i) => ({
      wch: Math.max(humanLabel(k).length, 12, k === dataCols[0] ? 22 : 14),
    }));

    // Merge the title/subtitle rows across all columns so they read as a real header block
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: dataCols.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: dataCols.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: dataCols.length - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: dataCols.length - 1 } },
    ];

    // Real number formatting — currency and dates render properly in Excel, not as raw numbers/ISO strings
    for (let r = headerRowIdx + 1; r < aoa.length; r++) {
      dataCols.forEach((k, c) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!ws[addr]) return;
        if (isAmountCol(k)) ws[addr].z = '"KES" #,##0.00';
      });
    }

    ws["!freeze"] = { xSplit: 0, ySplit: headerRowIdx + 1 };

    XLSX.utils.book_append_sheet(wb, ws, activeRpt.label.slice(0, 31));
    XLSX.writeFile(wb, `${sysName}-${(activeRpt.label||(activeRpt as any).name||activeRpt.id).replace(/\s+/g,"-")}-${startDate}-${endDate}.xlsx`);
  };

  const exportPrint = () => {
    if (!rows.length) { toast({ title:"Nothing to print", description:"This report has no rows for the current filters.", variant:"destructive" }); return; }
    const dataCols = Object.keys(rows[0]).filter(k => k !== "id" && !["__v"].includes(k)).slice(0, 8);
    const isAmountCol = (k: string) => /amount|value|price|total|cost/i.test(k);
    const fmtCell = (k: string, v: any) => {
      if (k === "requested_by" || k === "approved_by" || k === "created_by") v = profileNames[v] || v;
      if (k === "item_id") v = itemNames[v] || v;
      if (isAmountCol(k)) return fmtKES(Number(v) || 0);
      if (/_at$|_date$/i.test(k) && v) return new Date(v).toLocaleDateString();
      return String(v ?? "—");
    };
    // Real letterhead PDF — same printDocument template (Embu County + hospital
    // logos) used by requisitions/POs/vouchers, rather than a raw window.print().
    printDataTable({
      title: `${activeRpt.label.toUpperCase()} REPORT`,
      docNo: `${rows.length} RECORDS`,
      columns: dataCols.map(humanLabel),
      rows: rows.map(r => dataCols.map(k => fmtCell(k, r[k]))),
      filename: `${activeRpt.id}-report-${Date.now()}`,
      meta: `Period: ${startDate} to ${endDate} · Generated ${new Date().toLocaleString()} · ${rows.length} records`,
    }).catch(() => toast({ title:"Print failed", variant:"destructive" }));
  };

  const cols = rows.length ? Object.keys(rows[0]).filter(k=>k!=="id"&&!["__v"].includes(k)).slice(0,10) : [];

  return (
    <div style={{background:T.bg,minHeight:"100%",display:"flex",flexDirection:"column",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{background:T.card,borderBottom:"1px solid "+T.border,padding:"14px 22px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 1px 2px rgba(16,24,40,.04)",flexShrink:0}}>
        <div style={{width:42,height:42,borderRadius:T.rLg,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <BarChart3 size={20} color={T.primary}/>
        </div>
        <div>
          <h1 style={{margin:0,fontSize:18,fontWeight:700,color:T.fg,letterSpacing:"-.01em"}}>Reports &amp; Business Intelligence</h1>
          <div style={{fontSize:11.5,color:T.fgMuted, marginTop:1}}>{hospitalName} · {sysName}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          <button onClick={exportPrint} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 15px",background:T.card,border:`1px solid ${T.border}`,borderRadius:T.r,cursor:"pointer",color:T.fgMuted,fontSize:12.5,fontWeight:600}}>
            <Printer size={13}/> Print / PDF
          </button>
          <button onClick={exportXLSX} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 15px",background:T.success,border:"none",borderRadius:T.r,cursor:"pointer",color:"#fff",fontSize:12.5,fontWeight:600}}>
            <FileSpreadsheet size={13}/> Export Excel
          </button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

        {/* ── Left sidebar - report types ───────────────────────────── */}
        <div style={{width:224,background:T.card,borderRight:"1px solid "+T.border,overflowY:"auto",flexShrink:0,padding:"12px 10px"}}>
          <div style={{padding:"4px 8px 10px",fontSize:10.5,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:".06em"}}>
            Report Types
          </div>
          {GROUPS.map(grp=>{
            const grpTypes = REPORT_TYPES.filter(r=>r.group===grp);
            return(
              <div key={grp} style={{marginBottom:6}}>
                <div style={{padding:"6px 8px 4px",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:".05em"}}>{grp}</div>
                {grpTypes.map(rt=>{
                  const Icon=rt.icon;
                  const active=activeRpt.id===rt.id;
                  return(
                    <button key={rt.id} onClick={()=>setActiveRpt(rt)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:active?rt.color+"14":"transparent",
                        border:"none",borderRadius:T.rMd,cursor:"pointer",marginBottom:2,
                        color:active?rt.color:T.fgMuted,fontSize:12.5,fontWeight:active?700:500,transition:"all .12s",textAlign:"left"}}
                      onMouseEnter={e=>{if(!active)(e.currentTarget as any).style.background=T.bg;}}
                      onMouseLeave={e=>{if(!active)(e.currentTarget as any).style.background="transparent";}}>
                      <div style={{width:24,height:24,borderRadius:T.r,background:active?rt.color+"22":T.bg2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <Icon size={12.5} color={active?rt.color:T.fgDim}/>
                      </div>
                      {rt.label}
                      {active&&<ChevronRight size={13} style={{marginLeft:"auto"}}/>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* ── Main content ──────────────────────────────────────────── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

          {/* Filters bar */}
          <div style={{background:T.card,borderBottom:"1px solid "+T.border,padding:"12px 18px",display:"flex",gap:10,alignItems:"center",flexShrink:0,flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,background:T.bg,border:"1px solid "+T.border,borderRadius:T.r,padding:"6px 11px"}}>
              <Calendar size={13} color={T.fgMuted}/>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} style={{border:"none",background:"transparent",fontSize:12.5,color:T.fg,outline:"none"}}/>
              <span style={{color:T.fgDim,fontSize:11}}>to</span>
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} style={{border:"none",background:"transparent",fontSize:12.5,color:T.fg,outline:"none"}}/>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:7,background:T.bg,border:"1px solid "+T.border,borderRadius:T.r,padding:"6px 11px",flex:1,minWidth:180}}>
              <Search size={13} color={T.fgMuted}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search records..." style={{border:"none",background:"transparent",fontSize:12.5,color:T.fg,outline:"none",width:"100%"}}/>
              {search&&<button onClick={()=>setSearch("")} style={{border:"none",background:"transparent",cursor:"pointer",padding:0}}><X size={13} color={T.fgMuted}/></button>}
            </div>
            <button onClick={load} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:T.primaryBg,border:"1px solid "+T.primary+"33",borderRadius:T.r,cursor:"pointer",color:T.primary,fontSize:12.5,fontWeight:600}}>
              <RefreshCw size={13} style={loading?{animation:"spin 1s linear infinite"}:{}}/> Load
            </button>
          </div>

          {/* ── KPI band ──────────────────────────────────────────────── */}
          <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px,1fr))",gap:10,flexShrink:0,borderBottom:"1px solid "+T.border,background:T.card}}>
            {summaries.map((s,i)=>{
              const Icon=s.icon;
              return(
                <div key={i} style={{background:T.bg,borderRadius:T.rLg,padding:"12px 14px",border:"1px solid "+T.border,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:T.rMd,background:s.color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <Icon size={17} color={s.color}/>
                  </div>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:19,fontWeight:800,color:T.fg,lineHeight:1.1}}>{s.value}</div>
                    <div style={{fontSize:10.5,color:T.fgMuted,marginTop:2}}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Signature: real BI charts — status breakdown + monthly trend ── */}
          {!loading && rows.length > 0 && (
            <div style={{padding:"14px 18px",display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:12,flexShrink:0,borderBottom:"1px solid "+T.border,background:T.card,minHeight:0}}>
              <div style={{border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"14px 16px 6px",boxShadow:T.shadow,background:T.bg}}>
                <div style={{fontSize:12,fontWeight:700,color:T.fg,marginBottom:4}}>Status Breakdown</div>
                <ResponsiveContainer width="100%" height={172}>
                  <PieChart>
                    <Pie data={statusBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2} stroke="none">
                      {statusBreakdown.map((s,i)=><Cell key={i} fill={s.color}/>)}
                    </Pie>
                    <Tooltip formatter={(v:any,n:any)=>[v,n]} contentStyle={{fontSize:11,borderRadius:8,border:`1px solid ${T.border}`}}/>
                    <Legend wrapperStyle={{fontSize:10.5}} iconSize={8}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{border:`1px solid ${T.border}`,borderRadius:T.rLg,padding:"14px 16px 6px",boxShadow:T.shadow,background:T.bg}}>
                <div style={{fontSize:12,fontWeight:700,color:T.fg,marginBottom:4}}>Monthly Trend</div>
                <ResponsiveContainer width="100%" height={172}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.border}/>
                    <XAxis dataKey="month" tick={{fontSize:10.5}}/>
                    <YAxis tick={{fontSize:10.5}}/>
                    <Tooltip formatter={(v:any,n:any)=>n==="value"?[fmtKES(v),"Value"]:[v,"Records"]} contentStyle={{fontSize:11,borderRadius:8,border:`1px solid ${T.border}`}}/>
                    <Bar dataKey="count" fill={activeRpt.color} radius={[4,4,0,0]} name="Records"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

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
              <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any, margin:"14px 18px 0", border:`1px solid ${T.border}`, borderRadius:T.rLg, boxShadow:T.shadow}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12.5}}>
                  <thead>
                    <tr style={{background:T.bg,position:"sticky",top:0,zIndex:1}}>
                      <th style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:T.fgDim,fontSize:10.5,textTransform:"uppercase",letterSpacing:".03em",whiteSpace:"nowrap",borderBottom:`1px solid ${T.border}`}}>#</th>
                      {cols.map(c=>(
                        <th key={c} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:T.fgDim,fontSize:10.5,textTransform:"uppercase",letterSpacing:".03em",whiteSpace:"nowrap",borderBottom:`1px solid ${T.border}`}}>
                          {c.replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row,i)=>(
                      <tr key={i} style={{background:T.card,borderBottom:"1px solid "+T.border,transition:"background .1s"}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background=T.bg;}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background=T.card;}}>
                        <td style={{padding:"9px 14px",color:T.fgDim,fontWeight:600}}>{i+1}</td>
                        {cols.map(c=>{
                          const v=row[c];
                          const isStatus=c==="status";
                          const statusColor=isStatus?(v==="approved"||v==="active"||v==="completed"?T.success:v==="pending"||v==="submitted"?T.warning:v==="rejected"||v==="cancelled"?T.error:T.fgMuted):"";
                          const isUuid = typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
                          const resolvedName = isUuid ? (profileNames[v] || itemNames[v]) : null;
                          return(
                            <td key={c} style={{padding:"9px 14px",color:isStatus?statusColor:T.fg,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {isStatus&&v?(
                                <span style={{padding:"3px 9px",borderRadius:99,background:statusColor+"14",color:statusColor,fontSize:10.5,fontWeight:700}}>
                                  {String(v).toUpperCase()}
                                </span>
                              ):isUuid?(
                                resolvedName || <span style={{color:T.fgDim,fontStyle:"italic"}}>-</span>
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
          <div style={{background:T.card,borderTop:"1px solid "+T.border,padding:"8px 18px",display:"flex",alignItems:"center",gap:14,fontSize:11.5,color:T.fgMuted,flexShrink:0}}>
            <span>{activeRpt.label} · <strong style={{color:T.fg}}>{rows.length}</strong> records</span>
            <span>Period: {startDate} to {endDate}</span>
            <div style={{flex:1}}/>
            <span style={{color:T.fgDim}}>{hospitalName} · {sysName} ProcurBosse v7.0</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
