/**
 * ProcurBosse v21.0 -- Print Engine & Report Configurator
 * 14 report types, column picker, date filters, templates, preview, print, Excel
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * BUILD-SAFE: zero non-ASCII chars
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import { Printer, FileText, Settings, RefreshCw, Download, Eye, ChevronRight, X, Save, BarChart3, FileSpreadsheet, Filter, Search, Play } from "lucide-react";
import * as XLSX from "xlsx";

const db = supabase as any;

const REPORT_TYPES = [
  {id:"requisitions",     label:"Requisitions",         table:"requisitions",     color:"#0078d4"},
  {id:"purchase_orders",  label:"Purchase Orders",       table:"purchase_orders",  color:"#7719aa"},
  {id:"goods_received",   label:"Goods Received Notes",  table:"goods_received",   color:"#038387"},
  {id:"payment_vouchers", label:"Payment Vouchers",      table:"payment_vouchers", color:"#d97706"},
  {id:"receipt_vouchers", label:"Receipt Vouchers",      table:"receipt_vouchers", color:"#059669"},
  {id:"journal_vouchers", label:"Journal Vouchers",      table:"journal_vouchers", color:"#6b21a8"},
  {id:"suppliers",        label:"Suppliers",             table:"suppliers",        color:"#0369a1"},
  {id:"items",            label:"Inventory Items",       table:"items",            color:"#047857"},
  {id:"contracts",        label:"Contracts",             table:"contracts",        color:"#b45309"},
  {id:"tenders",          label:"Tenders",               table:"tenders",          color:"#dc2626"},
  {id:"budgets",          label:"Budgets",               table:"budgets",          color:"#7c3aed"},
  {id:"audit_log",        label:"Audit Log",             table:"audit_log",        color:"#374151"},
  {id:"profiles",         label:"Users",                 table:"profiles",         color:"#065f46"},
  {id:"notifications",    label:"Notifications",         table:"notifications",    color:"#b91c1c"},
];

const COLS: Record<string,{key:string;label:string;def:boolean}[]> = {
  requisitions:[{key:"requisition_number",label:"Req No.",def:true},{key:"title",label:"Title",def:true},{key:"department",label:"Dept",def:true},{key:"status",label:"Status",def:true},{key:"total_amount",label:"Amount",def:true},{key:"created_at",label:"Date",def:true},{key:"priority",label:"Priority",def:false}],
  purchase_orders:[{key:"po_number",label:"PO No.",def:true},{key:"status",label:"Status",def:true},{key:"total_amount",label:"Amount",def:true},{key:"created_at",label:"Date",def:true},{key:"expected_delivery",label:"Expected Del.",def:false}],
  items:[{key:"name",label:"Name",def:true},{key:"sku",label:"SKU",def:true},{key:"category",label:"Category",def:true},{key:"current_quantity",label:"Qty",def:true},{key:"minimum_quantity",label:"Min Qty",def:true},{key:"unit_price",label:"Price",def:true},{key:"location",label:"Location",def:false},{key:"status",label:"Status",def:false}],
  suppliers:[{key:"name",label:"Name",def:true},{key:"email",label:"Email",def:true},{key:"phone",label:"Phone",def:true},{key:"status",label:"Status",def:true},{key:"category",label:"Category",def:false},{key:"created_at",label:"Reg. Date",def:false}],
  audit_log:[{key:"created_at",label:"Timestamp",def:true},{key:"action",label:"Action",def:true},{key:"entity_type",label:"Entity",def:true},{key:"description",label:"Description",def:true},{key:"severity",label:"Severity",def:false}],
};
const DEFAULT_COLS=[{key:"id",label:"ID",def:false},{key:"status",label:"Status",def:true},{key:"created_at",label:"Created At",def:true},{key:"updated_at",label:"Updated At",def:false}];

const fmtV=(v:any,key:string):string=>{
  if(v===null||v===undefined)return"-";
  if(key.includes("amount")||key.includes("price")||key.includes("budget"))return`KES ${Number(v).toLocaleString()}`;
  if(key.includes("_at")||key.includes("date")||key.includes("delivery"))return new Date(v).toLocaleDateString("en-KE");
  return String(v);
};

const S = {
  page:{background:T.bg,minHeight:"100%",fontFamily:"'Segoe UI','Inter',system-ui,sans-serif"} as React.CSSProperties,
  hdr:{background:"#1e1e2e",padding:"0 24px",display:"flex",alignItems:"stretch",minHeight:44,boxShadow:"0 2px 6px rgba(0,0,0,.4)"} as React.CSSProperties,
  bc:{background:"#fff",padding:"7px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.fgMuted} as React.CSSProperties,
  card:{background:"#fff",border:`1px solid ${T.border}`,borderRadius:T.rLg,boxShadow:"0 1px 4px rgba(0,0,0,.06)",overflow:"hidden"} as React.CSSProperties,
  inp:{border:`1px solid ${T.border}`,borderRadius:T.r,padding:"7px 11px",fontSize:13,outline:"none",background:"#fff",color:T.fg,fontFamily:"inherit",width:"100%",boxSizing:"border-box"as const} as React.CSSProperties,
  th:{padding:"8px 12px",textAlign:"left"as const,fontSize:10,fontWeight:700,color:T.fgDim,borderBottom:`1px solid ${T.border}`,background:T.bg,whiteSpace:"nowrap"as const},
  td:{padding:"7px 12px",fontSize:11,color:T.fg,borderBottom:`1px solid ${T.border}18`},
};

export default function PrintEnginePage() {
  const nav=useNavigate();
  const {profile}=useAuth();
  const {get:getSetting}=useSystemSettings();
  const hospital=getSetting("hospital_name","Embu Level 5 Hospital");

  const [rt,setRt]          = useState(REPORT_TYPES[0]);
  const [cols,setCols]       = useState<string[]>([]);
  const [rows,setRows]       = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [startDate,setStart] = useState(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  const [endDate,setEnd]     = useState(new Date().toISOString().slice(0,10));
  const [search,setSearch]   = useState("");
  const [statusF,setStatusF] = useState("all");
  const [pageSize,setPS]     = useState(100);
  const [tab,setTab]         = useState<"config"|"preview">("config");
  const [templates,setTmpls] = useState<any[]>([]);
  const [tmplName,setTN]     = useState("");
  const [savingT,setSavingT] = useState(false);

  const allCols=COLS[rt.id]||DEFAULT_COLS;

  useEffect(()=>{setCols((COLS[rt.id]||DEFAULT_COLS).filter(c=>c.def).map(c=>c.key));setRows([]);setTab("config");},[rt]);

  const run=useCallback(async()=>{
    setLoading(true);
    try{
      let q=db.from(rt.table).select("*");
      if(startDate)q=q.gte("created_at",startDate+"T00:00:00");
      if(endDate)q=q.lte("created_at",endDate+"T23:59:59");
      if(statusF!=="all")q=q.eq("status",statusF);
      q=q.order("created_at",{ascending:false}).limit(pageSize);
      const{data,error}=await q;
      if(error)throw error;
      setRows(data||[]);setTab("preview");
      toast({title:`Report loaded: ${data?.length||0} records`});
    }catch(e:any){toast({title:"Error",description:e.message,variant:"destructive"});}
    finally{setLoading(false);}
  },[rt,startDate,endDate,statusF,pageSize]);

  const filtered=rows.filter(r=>{
    if(!search.trim())return true;
    const q=search.toLowerCase();
    return Object.values(r).some(v=>String(v||"").toLowerCase().includes(q));
  });

  const printReport=()=>{
    const w=window.open("","_blank","width=1100,height=700");if(!w)return;
    const thead=cols.map(k=>`<th>${allCols.find(c=>c.key===k)?.label||k}</th>`).join("");
    const tbody=filtered.map(r=>`<tr>${cols.map(k=>`<td>${fmtV(r[k],k)}</td>`).join("")}</tr>`).join("");
    w.document.write(`<!DOCTYPE html><html><head><title>${rt.label} Report</title><style>body{font-family:Segoe UI,Arial;margin:30px;font-size:11px;}h2{color:#1e1e2e;}table{width:100%;border-collapse:collapse;margin-top:14px;}th{background:#1e1e2e;color:#fff;padding:7px 10px;text-align:left;font-size:10px;}td{padding:6px 10px;border-bottom:1px solid #eee;}tr:nth-child(even) td{background:#f8f9fb;}.meta{color:#666;font-size:10px;}.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #1e1e2e;padding-bottom:10px;margin-bottom:14px;}@media print{button{display:none}}</style></head><body><div class="hdr"><div><h2>${rt.label} Report</h2><div class="meta">${hospital} | EL5 MediProcure v21.0</div></div><div class="meta" style="text-align:right">Generated: ${new Date().toLocaleString("en-KE")}<br/>By: ${profile?.full_name||"System"}<br/>Period: ${startDate} to ${endDate}<br/>Records: ${filtered.length}</div></div><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table><br/><button onclick="window.print()">Print</button></body></html>`);
    w.document.close();setTimeout(()=>w.print(),400);
  };

  const exportExcel=()=>{
    const data=filtered.map(r=>{const o:any={};cols.forEach(k=>{o[allCols.find(c=>c.key===k)?.label||k]=fmtV(r[k],k);});return o;});
    const ws=XLSX.utils.json_to_sheet(data);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,rt.label);
    XLSX.writeFile(wb,`${rt.id}_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported to Excel"});
  };

  const saveTmpl=async()=>{
    if(!tmplName.trim())return;setSavingT(true);
    await db.from("system_settings").upsert({key:`print_tmpl_${tmplName.toLowerCase().replace(/\s+/g,"_")}`,value:JSON.stringify({name:tmplName,reportType:rt.id,cols,startDate,endDate,statusF,pageSize}),category:"print_templates"},{onConflict:"key"});
    toast({title:`Template "${tmplName}" saved`});setTN("");setSavingT(false);
  };

  useEffect(()=>{
    db.from("system_settings").select("*").eq("category","print_templates").then(({data}:any)=>{
      if(data)setTmpls(data.map((d:any)=>({key:d.key,...JSON.parse(d.value||"{}")})));
    });
  },[savingT]);

  const loadTmpl=(t:any)=>{
    const r=REPORT_TYPES.find(x=>x.id===t.reportType);if(r)setRt(r);
    if(t.cols)setCols(t.cols);if(t.startDate)setStart(t.startDate);if(t.endDate)setEnd(t.endDate);
    if(t.statusF)setStatusF(t.statusF);if(t.pageSize)setPS(t.pageSize);
    toast({title:`Template "${t.name}" loaded`});
  };

  return(
    <div style={S.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={S.hdr}>
        <div style={{display:"flex",alignItems:"center",gap:10,flex:1}}>
          <Printer size={20} color="#fff"/>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#fff"}}>Print Engine & Report Configurator</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.5)"}}>Admin Report Printing | EL5 MediProcure</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 8px"}}>
          <button onClick={()=>nav("/reports")} style={{background:"rgba(255,255,255,.12)",border:"none",borderRadius:6,padding:"5px 12px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}><BarChart3 size={13}/>Reports</button>
          <button onClick={()=>nav("/dashboard")} style={{background:"rgba(255,255,255,.08)",border:"none",borderRadius:6,padding:"5px 12px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Dashboard</button>
        </div>
      </div>
      <div style={S.bc}>
        <span style={{cursor:"pointer",color:T.primary}} onClick={()=>nav("/dashboard")}>Home</span>
        <ChevronRight size={12}/><span>Reports</span><ChevronRight size={12}/><span style={{fontWeight:600}}>Print Engine</span>
      </div>
      <div style={{display:"flex",gap:16,padding:"16px 24px",alignItems:"flex-start"}}>
        {/* Sidebar */}
        <div style={{width:200,flexShrink:0}}>
          <div style={S.card}>
            <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:12,color:T.fg}}>Report Types</div>
            <div style={{padding:"6px 0"}}>
              {REPORT_TYPES.map(r=>(
                <button key={r.id} onClick={()=>setRt(r)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 14px",background:rt.id===r.id?r.color+"15":"transparent",border:"none",cursor:"pointer",color:rt.id===r.id?r.color:T.fg,fontSize:12,fontWeight:rt.id===r.id?700:400,fontFamily:"inherit",borderLeft:`3px solid ${rt.id===r.id?r.color:"transparent"}`,textAlign:"left"as const}}
                  onMouseEnter={e=>rt.id!==r.id&&((e.currentTarget as HTMLElement).style.background=T.bg)}
                  onMouseLeave={e=>rt.id!==r.id&&((e.currentTarget as HTMLElement).style.background="transparent")}>
                  <FileText size={13} color={r.color}/>{r.label}
                </button>
              ))}
            </div>
          </div>
          {templates.length>0&&(
            <div style={{...S.card,marginTop:12}}>
              <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:12}}>Saved Templates</div>
              <div style={{padding:"6px 0"}}>
                {templates.map(t=>(
                  <button key={t.key} onClick={()=>loadTmpl(t)} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"7px 14px",background:"transparent",border:"none",cursor:"pointer",color:T.primary,fontSize:11,fontFamily:"inherit",textAlign:"left"as const}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                    <FileText size={11}/>{t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Main */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",gap:0,borderBottom:`2px solid ${T.border}`,marginBottom:16}}>
            {[{id:"config",label:"Configure Report",icon:Settings},{id:"preview",label:`Preview (${filtered.length})`,icon:Eye}].map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id as any)} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 18px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:tab===t.id?700:400,color:tab===t.id?rt.color:T.fgMuted,borderBottom:`2px solid ${tab===t.id?rt.color:"transparent"}`,marginBottom:-2,transition:"all .12s"}}>
                <t.icon size={14}/>{t.label}
              </button>
            ))}
          </div>
          {tab==="config"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:7}}><Filter size={14} color={rt.color}/>Filters</div>
                <div style={{padding:16}}>
                  <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>Date From</label><input type="date" value={startDate} onChange={e=>setStart(e.target.value)} style={S.inp}/></div>
                  <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>Date To</label><input type="date" value={endDate} onChange={e=>setEnd(e.target.value)} style={S.inp}/></div>
                  <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>Status</label>
                    <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={S.inp}>
                      {["all","pending","approved","rejected","active","closed","draft"].map(s=><option key={s} value={s}>{s==="all"?"All Statuses":s}</option>)}
                    </select>
                  </div>
                  <div><label style={{display:"block",fontSize:11,fontWeight:700,color:T.fgMuted,marginBottom:5}}>Max Records</label>
                    <select value={pageSize} onChange={e=>setPS(Number(e.target.value))} style={S.inp}>
                      {[25,50,100,250,500,9999].map(s=><option key={s} value={s}>{s===9999?"All":s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={S.card}>
                <div style={{padding:"12px 16px",borderBottom:`1px solid ${T.border}`,fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:7}}><Settings size={14} color={rt.color}/>Columns</div>
                <div style={{padding:"14px 16px"}}>
                  {allCols.map(c=>(
                    <label key={c.key} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 8px",borderRadius:T.r,cursor:"pointer",marginBottom:2,background:cols.includes(c.key)?rt.color+"0a":"transparent"}}>
                      <input type="checkbox" checked={cols.includes(c.key)} onChange={()=>setCols(p=>p.includes(c.key)?p.filter(k=>k!==c.key):[...p,c.key])}/>
                      <span style={{fontSize:12,color:T.fg}}>{c.label}</span>
                      <code style={{marginLeft:"auto",fontSize:9,color:T.fgDim,background:T.bg,padding:"1px 5px",borderRadius:3}}>{c.key}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div style={{...S.card,gridColumn:"1 / -1"}}>
                <div style={{padding:"14px 16px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"as const}}>
                  <button onClick={run} disabled={loading} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",background:loading?T.fgDim:rt.color,color:"#fff",border:"none",borderRadius:T.r,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                    {loading?<RefreshCw size={15} style={{animation:"spin 1s linear infinite"}}/>:<Play size={15}/>}{loading?"Running...":"Run Report"}
                  </button>
                  {rows.length>0&&<>
                    <button onClick={printReport} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 16px",background:"#1e1e2e",color:"#fff",border:"none",borderRadius:T.r,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Printer size={15}/>Print</button>
                    <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 16px",background:T.success,color:"#fff",border:"none",borderRadius:T.r,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><FileSpreadsheet size={15}/>Export Excel</button>
                  </>}
                  <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:7}}>
                    <input value={tmplName} onChange={e=>setTN(e.target.value)} placeholder="Template name..." style={{...S.inp,width:160}}/>
                    <button onClick={saveTmpl} disabled={savingT||!tmplName.trim()} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:T.r,fontSize:12,cursor:tmplName.trim()?"pointer":"not-allowed",fontFamily:"inherit",color:T.fg}}><Save size={12}/>Save Template</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {tab==="preview"&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:7,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"6px 11px",background:"#fff",flex:1,maxWidth:320}}>
                  <Search size={13} color={T.fgDim}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter results..." style={{border:"none",outline:"none",fontSize:12,fontFamily:"inherit",color:T.fg,width:"100%"}}/>
                </div>
                <span style={{fontSize:12,color:T.fgMuted}}>{filtered.length} records</span>
                <div style={{marginLeft:"auto",display:"flex",gap:8}}>
                  <button onClick={printReport} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"#1e1e2e",color:"#fff",border:"none",borderRadius:T.r,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><Printer size={13}/>Print</button>
                  <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:T.success,color:"#fff",border:"none",borderRadius:T.r,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><FileSpreadsheet size={13}/>Excel</button>
                </div>
              </div>
              <div style={S.card}>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead><tr>{cols.map(k=><th key={k} style={S.th}>{allCols.find(c=>c.key===k)?.label||k}</th>)}</tr></thead>
                    <tbody>
                      {filtered.length===0?<tr><td colSpan={cols.length} style={{...S.td,textAlign:"center"as const,padding:30,color:T.fgDim}}>No records found. Run a report first.</td></tr>
                      :filtered.map((r,i)=>(
                        <tr key={r.id||i} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=""}>
                          {cols.map(k=><td key={k} style={S.td}>{fmtV(r[k],k)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
