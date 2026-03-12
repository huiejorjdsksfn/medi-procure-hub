import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { generateLPO_PDF } from "@/lib/export";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, ShoppingCart, Send, Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement, sendNotification } from "@/lib/notify";

const STATUS_CFG: Record<string,{bg:string;color:string}> = {
  draft:    {bg:"#f3f4f6",color:"#6b7280"},
  pending:  {bg:"#fef3c7",color:"#92400e"},
  approved: {bg:"#dcfce7",color:"#15803d"},
  sent:     {bg:"#dbeafe",color:"#1d4ed8"},
  partial:  {bg:"#e0f2fe",color:"#0369a1"},
  received: {bg:"#d1fae5",color:"#065f46"},
  cancelled:{bg:"#fee2e2",color:"#dc2626"},
};

export default function PurchaseOrdersPage() {
  const { user, profile, roles } = useAuth();
  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPO, setViewPO] = useState<any>(null);
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");
  const [sysName, setSysName] = useState("EL5 MediProcure");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{ if(!data) return; const m:any={}; data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value; }); if(m.system_name) setSysName(m.system_name); if(m.hospital_name) setHospitalName(m.hospital_name); });
  },[]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("purchase_orders")
      .select("*,suppliers(name)")
      .order("created_at",{ascending:false});
    setOrders(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  const approve = async (id:string) => {
    const po = orders.find(o=>o.id===id);
    await (supabase as any).from("purchase_orders").update({status:"approved",approved_by:user?.id,approved_at:new Date().toISOString()}).eq("id",id);
    logAudit(user?.id,profile?.full_name,"approve","purchase_orders",id,{});
    toast({title:"Purchase Order Approved ✓"});
    await notifyProcurement({title:"PO Approved ✓",message:`Purchase Order ${po?.po_number||id.slice(0,8)} approved by ${profile?.full_name||"Manager"}`,type:"procurement",module:"PO",actionUrl:"/purchase-orders"});
    load();
  };

  const printLPO = (po:any) => {
    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    win.document.write(`<html><head><title>${po.po_number}</title>
    <style>
      body{font-family:'Segoe UI',Arial;margin:0;padding:20px;font-size:12px;color:#1f2937}
      .header{background:#0a2558;color:#fff;padding:15px 20px;margin:-20px -20px 20px;display:flex;justify-content:space-between;align-items:center}
      .header h2{margin:0;font-size:16px}.header small{opacity:0.6;font-size:10px}
      .po-no{font-size:20px;font-weight:900;color:#1a3a6b;margin-bottom:5px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:15px}
      .field .lbl{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;margin-bottom:2px}
      .field .val{font-size:12px;color:#1f2937}
      table{width:100%;border-collapse:collapse;font-size:11px}
      thead tr{background:#1a3a6b;color:#fff}
      th{padding:7px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase}
      td{padding:6px 10px;border-bottom:1px solid #f3f4f6}
      .total-row{background:#f8fafc;font-weight:700}
      .sig-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:40px}
      .sig-box{border-top:1px solid #ccc;padding-top:6px;font-size:9px;color:#888}
      @media print{@page{margin:1.2cm}body{margin:0}}
    </style></head><body>
    <div class="header">
      <div><h2>${hospitalName}</h2><small>Official Local Purchase Order</small></div>
      <div style="text-align:right"><div style="font-size:16px;font-weight:900">${po.po_number}</div><small>Issue Date: ${po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):""}</small></div>
    </div>
    <div class="grid">
      <div class="field"><div class="lbl">Supplier</div><div class="val">${po.suppliers?.name||po.supplier_name||"—"}</div></div>
      <div class="field"><div class="lbl">Status</div><div class="val" style="text-transform:capitalize">${po.status||"—"}</div></div>
      <div class="field"><div class="lbl">Delivery Date</div><div class="val">${po.delivery_date||"—"}</div></div>
      <div class="field"><div class="lbl">Payment Terms</div><div class="val">${po.payment_terms||"30 Days"}</div></div>
    </div>
    <table>
      <thead><tr><th>#</th><th>Item Description</th><th>Qty</th><th>UoM</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>
        ${(po.items||[]).map((it:any,i:number)=>`<tr><td>${i+1}</td><td>${it.description||it.item_name||"—"}</td><td>${it.quantity||0}</td><td>${it.unit||"—"}</td><td style="text-align:right">KES ${Number(it.unit_price||0).toLocaleString()}</td><td style="text-align:right">KES ${Number((it.quantity||0)*(it.unit_price||0)).toLocaleString()}</td></tr>`).join("")||"<tr><td colspan='6' style='text-align:center;color:#9ca3af;padding:12px'>No line items</td></tr>"}
      </tbody>
      <tfoot><tr class="total-row"><td colspan="5" style="text-align:right;padding:8px 10px">TOTAL (KES)</td><td style="text-align:right;padding:8px 10px">KES ${Number(po.total_amount||0).toLocaleString()}</td></tr></tfoot>
    </table>
    ${po.notes?`<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px"><strong style="font-size:10px;color:#888">NOTES:</strong> ${po.notes}</div>`:""}
    <div class="sig-row">
      ${["Prepared By","Authorized By","Supplier Acknowledgement"].map(s=>`<div class="sig-box">${s}<br><br><br></div>`).join("")}
    </div>
    <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:9px;color:#aaa;text-align:center">${hospitalName} · ${sysName} · ${new Date().toLocaleDateString("en-KE")} · Official Document</div>
    </body></html>`);
    win.document.close();win.focus();setTimeout(()=>win.print(),400);
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[hospitalName],[sysName+" — Purchase Orders"],[`Exported: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows = filtered.map(po=>({
      "PO Number":po.po_number,"Supplier":po.suppliers?.name||po.supplier_name||"",
      "Status":po.status,"Total Amount":po.total_amount||0,
      "Delivery Date":po.delivery_date||"","Created":po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):"",
      "Notes":po.notes||"",
    }));
    const ws = XLSX.utils.aoa_to_sheet([...header,...[Object.keys(rows[0]||{})],...rows.map(r=>Object.values(r))]);
    XLSX.utils.book_append_sheet(wb,ws,"Purchase Orders");
    XLSX.writeFile(wb,`PurchaseOrders_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  };

  const filtered = orders.filter(po=>{
    if(statusFilter!=="all"&&po.status!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return (po.po_number||"").toLowerCase().includes(q)||(po.suppliers?.name||"").toLowerCase().includes(q);}
    return true;
  });

  return (
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:10,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {/* KPI TILES */}
      {(()=>{
        const totalVal = orders.reduce((s,r)=>s+Number(r.total_amount||0),0);
        const recVal   = orders.filter(r=>r.status==="received").reduce((s,r)=>s+Number(r.total_amount||0),0);
        const bal      = totalVal - recVal;
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Value",val:fmtK(totalVal),bg:"#c0392b"},
              {label:"Received Amt.",val:fmtK(recVal),bg:"#7d6608"},
              {label:"Balance",val:fmtK(bal),bg:"#0e6655"},
              {label:"Record Count",val:orders.length,bg:"#6c3483"},
              {label:"Pending / Draft",val:orders.filter(r=>["draft","pending"].includes(r.status||"")).length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:18,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {/* Header */}
      <div style={{borderRadius:12,background:"linear-gradient(90deg,#92400e,#C45911,#d97706)",boxShadow:"0 4px 16px rgba(196,89,17,0.3)",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <ShoppingCart style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Purchase Orders</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length} of {orders.length} orders · Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}</p>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          <button onClick={load} disabled={loading} style={{padding:6,borderRadius:6,background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",cursor:"pointer"}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:"rgba(52,211,153,0.9)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
            <FileSpreadsheet style={{width:14,height:14}}/>Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
        {["all","draft","pending","approved","sent","received","cancelled"].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            style={{padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:600,textTransform:"capitalize",border:"none",cursor:"pointer",background:statusFilter===s?"#C45911":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
            {s}{s!=="all"&&<span style={{marginLeft:4,opacity:0.7}}>({orders.filter(o=>o.status===s).length})</span>}
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search POs..."
            style={{paddingLeft:32,paddingRight:32,paddingTop:6,paddingBottom:6,borderRadius:20,border:"1.5px solid #e5e7eb",fontSize:12,outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X style={{width:12,height:12,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* Table */}
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:12}}>
            <thead>
              <tr style={{background:"#92400e"}}>
                {["#","PO Number","Supplier","Status","Total Amount","Delivery Date","Created","Actions"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",color:"rgba(255,255,255,0.8)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={8} style={{animation:"pulse 1.5s infinite"}}><div style={{height:12,background:"#e5e7eb",borderRadius:6,width:"100%"}}/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={8} style={{padding:"40px 16px",textAlign:"center",color:"#9ca3af"}}>No purchase orders found</td></tr>
              ):filtered.map((po,i)=>{
                const s=STATUS_CFG[po.status]||{bg:"#f3f4f6",color:"#6b7280"};
                return (
                  <tr key={po.id} style={{borderBottom:"1px solid #f9fafb"}}>
                    <td style={{padding:"10px 12px",color:"#9ca3af"}}>{i+1}</td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#c2410c"}}>{po.po_number||"—"}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1f2937"}}>{po.suppliers?.name||po.supplier_name||"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",background:s.bg,color:s.color}}>{po.status||"—"}</span>
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1f2937"}}>KES {Number(po.total_amount||0).toLocaleString()}</td>
                    <td style={{padding:"10px 12px",color:"#6b7280",fontSize:10}}>{po.delivery_date||"—"}</td>
                    <td style={{padding:"10px 12px",color:"#9ca3af",fontSize:10,whiteSpace:"nowrap"}}>{po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setViewPO(po)} style={{padding:5,borderRadius:6,background:"#fff7ed",color:"#ea580c",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12}}/></button>
                        <button onClick={()=>printLPO(po)} style={{padding:"5px",borderRadius:6,background:"#f3f4f6",color:"#374151",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12}}/></button>
                        {canApprove&&po.status==="pending"&&(
                          <button onClick={()=>approve(po.id)} style={{padding:"5px",borderRadius:6,background:"#dcfce7",color:"#15803d",border:"none",cursor:"pointer"}}><CheckCircle style={{width:12,height:12}}/></button>
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
          {filtered.length} orders · Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}
        </div>
      </div>

      {/* View Modal */}
      {viewPO&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}} onClick={()=>setViewPO(null)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh"}}>
            <div style={{padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"#92400e"}}>
              <div><h3 style={{fontSize:14,fontWeight:900,color:"#fff"}}>{viewPO.po_number}</h3><p style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Purchase Order</p></div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>printLPO(viewPO)} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,color:"#fff",fontSize:12,border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12}}/>Print LPO</button>
                <button onClick={()=>setViewPO(null)} style={{padding:"5px",borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer"}}><X style={{width:16,height:16}}/></button>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                {[
                  {l:"Supplier",v:viewPO.suppliers?.name||viewPO.supplier_name},{l:"Status",v:viewPO.status},
                  {l:"Total",v:`KES ${Number(viewPO.total_amount||0).toLocaleString()}`},{l:"Delivery Date",v:viewPO.delivery_date},
                  {l:"Payment Terms",v:viewPO.payment_terms},{l:"Date",v:viewPO.created_at?new Date(viewPO.created_at).toLocaleDateString("en-KE"):"—"},
                ].map(r=>(
                  <div key={r.l}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#9ca3af"}}>{r.l}</div>
                    <div style={{fontSize:14,color:"#1f2937",fontWeight:500,marginTop:2}}>{r.v||"—"}</div>
                  </div>
                ))}
              </div>
              {viewPO.notes&&<div style={{marginBottom:16,padding:12,borderRadius:12,background:"#f9fafb"}}><p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",marginBottom:4}}>Notes</p><p style={{fontSize:14,color:"#374151"}}>{viewPO.notes}</p></div>}
              {canApprove&&viewPO.status==="pending"&&(
                <button onClick={()=>{approve(viewPO.id);setViewPO(null);}}
                  style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"10px 0",borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,marginBottom:12,border:"none",cursor:"pointer",background:"#15803d"}}>
                  <CheckCircle style={{width:16,height:16}}/>Approve Purchase Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
