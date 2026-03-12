import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, Clock, ClipboardList, ChevronDown, Send,
  AlertTriangle, Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement, sendNotification } from "@/lib/notify";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  draft:     {bg:"#f3f4f6",color:"#6b7280",label:"Draft"},
  submitted: {bg:"#dbeafe",color:"#1d4ed8",label:"Submitted"},
  pending:   {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  approved:  {bg:"#dcfce7",color:"#15803d",label:"Approved"},
  rejected:  {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
  ordered:   {bg:"#e0f2fe",color:"#0369a1",label:"Ordered"},
  received:  {bg:"#d1fae5",color:"#065f46",label:"Received"},
};

export default function RequisitionsPage() {
  const { user, profile, roles } = useAuth();
  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const canCreate = !roles.includes("warehouse_officer") && !roles.includes("inventory_manager");
  const [reqs, setReqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewReq, setViewReq] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({title:"",department:"",priority:"normal",notes:"",delivery_date:""});
  const [saving, setSaving] = useState(false);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("requisitions")
      .select("*,requisition_items(*)")
      .order("created_at",{ascending:false});
    setReqs(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const approve = async (id:string) => {
    const req = reqs.find(r=>r.id===id);
    await (supabase as any).from("requisitions").update({status:"approved",approved_by:user?.id,approved_at:new Date().toISOString()}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"approve","requisitions",id,{});
    toast({title:"Requisition Approved ✓"});
    // Notify the requester
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Approved ✓",message:`Your requisition "${req.title||req.requisition_number}" has been approved.`,type:"success",module:"Procurement",actionUrl:"/requisitions"});
    await notifyProcurement({title:"Requisition Approved",message:`${profile?.full_name||"Manager"} approved requisition ${req?.requisition_number||id.slice(0,8)}`,type:"procurement",module:"Procurement",actionUrl:"/requisitions"});
    load();
  };
  const reject = async (id:string) => {
    const req = reqs.find(r=>r.id===id);
    await (supabase as any).from("requisitions").update({status:"rejected"}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"reject","requisitions",id,{});
    toast({title:"Requisition Rejected",variant:"destructive"});
    if(req?.requested_by) await sendNotification({userId:req.requested_by,title:"Requisition Rejected",message:`Your requisition "${req.title||req.requisition_number}" was not approved.`,type:"warning",module:"Procurement",actionUrl:"/requisitions"});
    load();
  };

  const save = async () => {
    if(!form.title.trim()){toast({title:"Title required",variant:"destructive"});return;}
    setSaving(true);
    const prefix="RQQ/EL5H";
    const num=`${prefix}/${new Date().getFullYear()}/${String(reqs.length+1).padStart(4,"0")}`;
    const {data,error}=await (supabase as any).from("requisitions").insert({
      ...form, requisition_number:num, status:"draft",
      requested_by:user?.id, requester_name:profile?.full_name,
    }).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
    logAudit(user?.id,profile?.full_name,"create","requisitions",data?.id,{title:form.title});
    toast({title:"Requisition Created",description:num});
    await notifyProcurement({title:"New Requisition Submitted",message:`${profile?.full_name||"Staff"} submitted requisition ${num}`,type:"procurement",module:"Procurement",actionUrl:"/requisitions"});
    setShowForm(false);
    setForm({title:"",department:"",priority:"normal",notes:"",delivery_date:""});
    load();
    setSaving(false);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[hospitalName],[sysName+" — Requisitions Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows = filtered.map(r=>({
      "Req No.":r.requisition_number,"Title":r.title,"Department":r.department,
      "Priority":r.priority,"Status":r.status,"Requester":r.requester_name,
      "Amount":r.total_amount||0,"Date":r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"",
      "Approved By":r.approved_by||"","Notes":r.notes||"",
    }));
    const ws = XLSX.utils.aoa_to_sheet([...header,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    ws["!cols"] = Object.keys(rows[0]||{}).map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb,ws,"Requisitions");
    XLSX.writeFile(wb,`Requisitions_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  };

  const printReq = (r:any) => {
    const win=window.open("","_blank","width=900,height=700");
    if(!win) return;
    const reqDate = r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"}) : "—";
    const delivDate = r.delivery_date ? new Date(r.delivery_date).toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"}) : "—";
    const items = (r.requisition_items||[]);
    const totalAmt = items.reduce((s:number,i:any)=>s+((i.quantity||0)*(i.unit_price||0)),0) || (r.total_amount||0);
    // Pad to at least 8 rows
    const padded = [...items,...Array(Math.max(0,8-items.length)).fill(null)];
    const rowsHtml = padded.map((i:any,idx:number)=>`
      <tr style="height:28px">
        <td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;color:#000">${i?i.item_name||"":"" }</td>
        <td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;color:#000">${i?i.description||"":""}</td>
        <td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:center;color:#000">${i?i.unit_of_measure||"":"" }</td>
        <td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:center;color:#000">${i?i.quantity||"":""}</td>
        <td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:right;color:#000">${i&&i.unit_price?Number(i.unit_price).toLocaleString("en-KE",{minimumFractionDigits:2}):"" }</td>
        <td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:right;color:#000">${i&&i.quantity&&i.unit_price?Number((i.quantity||0)*(i.unit_price||0)).toLocaleString("en-KE",{minimumFractionDigits:2}):""}</td>
      </tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Requisition Form — ${r.requisition_number||"Draft"}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:'Times New Roman',Times,serif;font-size:12px;color:#000;background:#fff;padding:30px 40px}
      @media print{body{padding:10mm 15mm}@page{size:A4;margin:10mm 15mm}}
      h1{font-size:20px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;color:#000}
      .divider{border:none;border-top:3px solid #1a3a6b;margin:8px 0 18px}
      .meta-block{margin-bottom:18px}
      .meta-block p{font-size:12px;margin-bottom:3px;color:#000}
      .meta-block strong{font-weight:700}
      .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:18px}
      .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;color:#000;text-decoration:underline}
      .info-line{font-size:11.5px;color:#000;margin-bottom:5px;display:flex;gap:4px}
      .info-label{font-weight:700;min-width:180px;flex-shrink:0}
      .info-val{border-bottom:1px solid #999;flex:1;min-height:16px}
      table{width:100%;border-collapse:collapse;margin-bottom:10px}
      .tbl-title{background:#1a3a6b;color:#fff;text-align:center;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;padding:7px;border:1px solid #1a3a6b}
      .tbl-hdr{background:#1a3a6b;color:#fff;font-size:10.5px;font-weight:700;text-transform:uppercase;text-align:left;padding:5px 6px;border:1px solid #1a3a6b}
      .tbl-hdr-c{text-align:center}
      .tbl-hdr-r{text-align:right}
      .totals-tbl{width:auto;margin-left:auto;margin-bottom:20px}
      .totals-tbl td{border:1px solid #1a3a6b;padding:5px 10px;font-size:11.5px;color:#000}
      .totals-tbl .lbl{background:#eef2ff;font-weight:700;text-transform:uppercase;width:130px}
      .totals-tbl .val{text-align:right;font-weight:700;min-width:120px}
      .sig-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:28px}
      .sig-box{text-align:center}
      .sig-line{border-top:1px solid #000;margin-top:32px;margin-bottom:4px}
      .sig-lbl{font-size:10px;font-weight:700;text-transform:uppercase;color:#000}
      .sig-date{font-size:9px;color:#555;margin-top:2px}
      .remarks-box{border:1px solid #1a3a6b;min-height:60px;padding:8px;font-size:11.5px;color:#000;margin-bottom:20px}
      .footer{margin-top:24px;border-top:1px solid #ccc;padding-top:8px;font-size:9px;color:#555;display:flex;justify-content:space-between}
    </style></head><body>
    <h1>Requisition Form</h1>
    <hr class="divider"/>
    <!-- Identity -->
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:13px;font-weight:700;color:#000">${hospitalName}</div>
      <div style="font-size:10.5px;color:#444">Embu County Government &nbsp;·&nbsp; ${sysName}</div>
    </div>
    <!-- Ref numbers -->
    <div class="meta-block">
      <p><strong>REQUISITION NUMBER:</strong> ${r.requisition_number||"REQ/EL5H/—"}</p>
      <p><strong>DATE:</strong> ${reqDate}</p>
      <p><strong>PRIORITY:</strong> ${(r.priority||"Normal").toUpperCase()} &nbsp;&nbsp; <strong>STATUS:</strong> ${(r.status||"Draft").toUpperCase()}</p>
    </div>
    <!-- Two-column info -->
    <div class="two-col">
      <div>
        <div class="section-title">Requisition Information:</div>
        <div class="info-line"><span class="info-label">TITLE / PURPOSE:</span><span class="info-val">${r.title||""}</span></div>
        <div class="info-line"><span class="info-label">DEPARTMENT:</span><span class="info-val">${r.department||""}</span></div>
        <div class="info-line"><span class="info-label">REQUESTED BY:</span><span class="info-val">${r.requester_name||""}</span></div>
        <div class="info-line"><span class="info-label">DATE REQUIRED:</span><span class="info-val">${delivDate}</span></div>
      </div>
      <div>
        <div class="section-title">Approval Information:</div>
        <div class="info-line"><span class="info-label">APPROVED BY:</span><span class="info-val">${r.approved_by_name||""}</span></div>
        <div class="info-line"><span class="info-label">APPROVAL DATE:</span><span class="info-val">${r.approved_at?new Date(r.approved_at).toLocaleDateString("en-KE"):""}</span></div>
        <div class="info-line"><span class="info-label">PO REFERENCE:</span><span class="info-val">${r.po_reference||""}</span></div>
        <div class="info-line"><span class="info-label">NOTES / JUSTIFICATION:</span><span class="info-val">${r.notes||""}</span></div>
      </div>
    </div>
    <!-- Items table -->
    <table>
      <tr><td colspan="6" class="tbl-title">REQUISITIONED ITEMS</td></tr>
      <tr>
        <th class="tbl-hdr" style="width:20%">ITEM NAME</th>
        <th class="tbl-hdr" style="width:28%">DESCRIPTION / SPECIFICATION</th>
        <th class="tbl-hdr tbl-hdr-c" style="width:10%">UNIT OF<br/>MEASURE</th>
        <th class="tbl-hdr tbl-hdr-c" style="width:10%">QUANTITY<br/>REQUESTED</th>
        <th class="tbl-hdr tbl-hdr-r" style="width:16%">ESTIMATED<br/>UNIT PRICE (KES)</th>
        <th class="tbl-hdr tbl-hdr-r" style="width:16%">ESTIMATED<br/>TOTAL (KES)</th>
      </tr>
      ${rowsHtml}
    </table>
    <!-- Totals -->
    <table class="totals-tbl">
      <tr><td class="lbl">TOTAL ITEMS</td><td class="val">${items.length||"—"}</td></tr>
      <tr><td class="lbl">TOTAL AMOUNT</td><td class="val">KES ${totalAmt.toLocaleString("en-KE",{minimumFractionDigits:2})}</td></tr>
    </table>
    <!-- Received condition / notes -->
    <div class="section-title">JUSTIFICATION / SPECIAL NOTES:</div>
    <div class="remarks-box">${r.notes||"&nbsp;"}</div>
    <!-- Signatures -->
    <div class="sig-grid">
      ${["Requisitioned By","Verified By","Recommended By","Approved By"].map(s=>`
        <div class="sig-box">
          <div class="sig-line"></div>
          <div class="sig-lbl">${s}</div>
          <div class="sig-date">Name: ___________________</div>
          <div class="sig-date">Date: ___________________</div>
        </div>`).join("")}
    </div>
    <div class="footer">
      <span>${hospitalName} &nbsp;·&nbsp; ${sysName}</span>
      <span>Printed: ${new Date().toLocaleString("en-KE")} &nbsp;·&nbsp; CONFIDENTIAL</span>
    </div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),500);
  };

  const filtered = reqs.filter(r=>{
    if(statusFilter!=="all"&&r.status!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return (r.title||"").toLowerCase().includes(q)||(r.requisition_number||"").toLowerCase().includes(q)||(r.department||"").toLowerCase().includes(q)||(r.requester_name||"").toLowerCase().includes(q);}
    return true;
  });

  const stats = {all:reqs.length,pending:reqs.filter(r=>r.status==="pending"||r.status==="submitted").length,approved:reqs.filter(r=>r.status==="approved").length,rejected:reqs.filter(r=>r.status==="rejected").length};

  return (
    <><style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style><div style={{padding:16,display:"flex",flexDirection:"column",gap:12,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{borderRadius:16,background:"linear-gradient(90deg,#0a2558,#1a3a6b,#1d4a87)",boxShadow:"0 4px 16px rgba(26,58,107,0.35)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <ClipboardList style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Requisitions</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{filtered.length} of {reqs.length} records</p>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <button onClick={load} disabled={loading} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.18)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:"rgba(52,211,153,0.9)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
            <FileSpreadsheet style={{width:14,height:14}}/>Export
          </button>
          {canCreate && (
            <button onClick={()=>setShowForm(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:"#fff",color:"#1e3a8a",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>
              <Plus style={{width:14,height:14}}/>New Requisition
            </button>
          )}
        </div>
      </div>

      {/* Stat chips */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {Object.entries(stats).map(([k,v])=>(
          <button key={k} onClick={()=>setStatusFilter(k==="all"?"all":k)}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:statusFilter===(k==="all"?"all":k)?"#1a3a6b":"#f3f4f6",color:statusFilter===(k==="all"?"all":k)?"#fff":"#6b7280"}}>
            {k==="pending"&&<Clock style={{width:12,height:12}}/>}
            {k==="approved"&&<CheckCircle style={{width:12,height:12}}/>}
            {k==="rejected"&&<XCircle style={{width:12,height:12}}/>}
            <span style={{textTransform:"capitalize"}}>{k}</span>
            <span style={{padding:"1px 6px",borderRadius:20,fontSize:9,fontWeight:700,background:statusFilter===(k==="all"?"all":k)?"rgba(255,255,255,0.25)":"#e5e7eb"}}>
              {String(v)}
            </span>
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search requisitions..."
            style={{paddingLeft:32,paddingRight:32,paddingTop:6,paddingBottom:6,borderRadius:20,border:"1.5px solid #e5e7eb",fontSize:12,outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X style={{width:12,height:12,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* Table */}
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:12}}>
            <thead>
              <tr style={{background:"#0a2558"}}>
                {["#","Req Number","Title","Department","Priority","Status","Requester","Amount","Date","Actions"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",color:"rgba(255,255,255,0.8)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={10} style={{animation:"pulse 1.5s infinite"}}><div style={{height:12,background:"#e5e7eb",borderRadius:6,width:"100%"}}/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={10} style={{padding:"40px 16px",textAlign:"center",color:"#9ca3af"}}>No requisitions found</td></tr>
              ):filtered.map((r,i)=>{
                const s=STATUS_CFG[r.status]||{bg:"#f3f4f6",color:"#6b7280",label:r.status};
                const isPending = r.status==="submitted"||r.status==="pending";
                return (
                  <tr key={r.id} style={{borderBottom:"1px solid #f9fafb"}}>
                    <td style={{padding:"10px 12px",color:"#9ca3af"}}>{i+1}</td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#1e3a5f"}}>{r.requisition_number||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1f2937",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.title||"—"}</td>
                    <td style={{padding:"10px 12px",color:"#4b5563"}}>{r.department||"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{padding:"1px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize" as const,background:r.priority==="urgent"||r.priority==="high"?"#fee2e2":r.priority==="normal"?"#dbeafe":"#f3f4f6",color:r.priority==="urgent"||r.priority==="high"?"#b91c1c":r.priority==="normal"?"#1d4ed8":"#6b7280"}}>
                        {r.priority||"normal"}
                      </span>
                    </td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span>
                    </td>
                    <td style={{padding:"10px 12px",color:"#4b5563"}}>{r.requester_name||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1f2937"}}>{r.total_amount?`KES ${Number(r.total_amount).toLocaleString()}`:"—"}</td>
                    <td style={{padding:"10px 12px",color:"#9ca3af",fontSize:10,whiteSpace:"nowrap"}}>{r.created_at?new Date(r.created_at).toLocaleDateString("en-KE"):"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setViewReq(r)} style={{padding:"5px",borderRadius:6,background:"#dbeafe",color:"#1d4ed8",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12}}/></button>
                        <button onClick={()=>printReq(r)} style={{padding:"5px",borderRadius:6,background:"#f3f4f6",color:"#374151",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12}}/></button>
                        {canApprove&&isPending&&(
                          <>
                            <button onClick={()=>approve(r.id)} style={{padding:"5px",borderRadius:6,background:"#dcfce7",color:"#15803d",border:"none",cursor:"pointer"}}><CheckCircle style={{width:12,height:12}}/></button>
                            <button onClick={()=>reject(r.id)} style={{padding:"5px",borderRadius:6,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer"}}><XCircle style={{width:12,height:12}}/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 16px",background:"#f9fafb",borderTop:"1px solid #e5e7eb"}}>
          {filtered.length} requisition{filtered.length!==1?"s":""}
          {filtered.length>0&&` · Total: KES ${filtered.reduce((s,r)=>s+Number(r.total_amount||0),0).toLocaleString()}`}
        </div>
      </div>

      {/* Create form modal */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)"}} onClick={()=>setShowForm(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(520px,100%)",overflow:"hidden"}}>
            <div style={{padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0a2558"}}>
              <h3 style={{fontSize:14,fontWeight:900,color:"#fff",display:"flex",alignItems:"center",gap:8}}><ClipboardList style={{width:16,height:16}}/>New Requisition</h3>
              <button onClick={()=>setShowForm(false)} style={{padding:"5px",borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
            </div>
            <div style={{padding:20}}>
              {[{k:"title",l:"Title *",ph:"e.g. Medical Supplies Q1 2025"},{k:"department",l:"Department",ph:"e.g. Pharmacy"},{k:"notes",l:"Notes / Justification",ph:"Brief description..."}].map(f=>(
                <div key={f.k}>
                  <label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#6b7280",marginBottom:4}}>{f.l}</label>
                  {f.k==="notes"?(
                    <textarea value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} rows={3} placeholder={f.ph}
                      style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  ):(
                    <input value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                      style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                  )}
                </div>
              ))}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#6b7280",marginBottom:4}}>Priority</label>
                  <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))}
                    style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}>
                    {["low","normal","high","urgent"].map(v=><option key={v} value={v} style={{textTransform:"capitalize"}}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#6b7280",marginBottom:4}}>Delivery Date</label>
                  <input type="date" value={form.delivery_date} onChange={e=>setForm(p=>({...p,delivery_date:e.target.value}))}
                    style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                </div>
              </div>
            </div>
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#1a3a6b",opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:14,height:14,animation:"spin 1s linear infinite"}}/>:<Send style={{width:14,height:14}}/>}
                {saving?"Saving...":"Create Requisition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {viewReq&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)"}} onClick={()=>setViewReq(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(700px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#0a2558"}}>
              <div><h3 style={{fontSize:14,fontWeight:900,color:"#fff"}}>{viewReq.requisition_number}</h3><p style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{viewReq.title}</p></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>printReq(viewReq)} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,color:"#fff",fontSize:12,border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12}}/>Print</button>
                {canApprove&&(viewReq.status==="submitted"||viewReq.status==="pending")&&(
                  <>
                    <button onClick={()=>{approve(viewReq.id);setViewReq(null);}} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,color:"#fff",fontSize:12,border:"none",cursor:"pointer"}}><CheckCircle style={{width:12,height:12}}/>Approve</button>
                    <button onClick={()=>{reject(viewReq.id);setViewReq(null);}} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,color:"#fff",fontSize:12,border:"none",cursor:"pointer"}}><XCircle style={{width:12,height:12}}/>Reject</button>
                  </>
                )}
                <button onClick={()=>setViewReq(null)} style={{padding:"5px",borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                {[
                  {l:"Department",v:viewReq.department},{l:"Priority",v:viewReq.priority},
                  {l:"Status",v:viewReq.status},{l:"Requester",v:viewReq.requester_name},
                  {l:"Total",v:viewReq.total_amount?`KES ${Number(viewReq.total_amount).toLocaleString()}`:"—"},
                  {l:"Date",v:viewReq.created_at?new Date(viewReq.created_at).toLocaleDateString("en-KE"):"—"},
                ].map(r=>(
                  <div key={r.l}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#9ca3af"}}>{r.l}</div>
                    <div style={{fontSize:14,color:"#1f2937",fontWeight:500,marginTop:2}}>{r.v||"—"}</div>
                  </div>
                ))}
              </div>
              {viewReq.notes&&<div style={{marginBottom:16,padding:12,borderRadius:12,background:"#f9fafb"}}><p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",marginBottom:4}}>Notes</p><p style={{fontSize:14,color:"#374151"}}>{viewReq.notes}</p></div>}
              {(viewReq.requisition_items||[]).length>0&&(
                <div>
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",marginBottom:8}}>Line Items ({viewReq.requisition_items.length})</p>
                  <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                    <thead><tr style={{background:"#1a3a6b"}}>{["Item","Qty","UoM","Unit Price","Total"].map(h=><th key={h} style={{textAlign:"left",padding:"8px 12px",color:"rgba(255,255,255,0.85)",fontSize:10,textTransform:"uppercase",fontWeight:700}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {viewReq.requisition_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                          <td style={{padding:"8px 12px",fontWeight:500}}>{it.item_name||"—"}</td>
                          <td style={{padding:"8px 12px"}}>{it.quantity}</td>
                          <td style={{padding:"8px 12px",color:"#6b7280"}}>{it.unit_of_measure||"—"}</td>
                          <td style={{padding:"8px 12px"}}>KES {Number(it.unit_price||0).toLocaleString()}</td>
                          <td style={{padding:"8px 12px",fontWeight:600}}>KES {Number((it.quantity||0)*(it.unit_price||0)).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  </>
  );
}