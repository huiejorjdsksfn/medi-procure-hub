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
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printPurchaseOrder } from "@/lib/printDocument";

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
  const { get: getSetting } = useSystemSettings();
  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPO, setViewPO] = useState<any>(null);

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
    printPurchaseOrder(po, {
      hospitalName:   getSetting('hospital_name','Embu Level 5 Hospital'),
      sysName:        getSetting('system_name','EL5 MediProcure'),
      docFooter:      getSetting('doc_footer','Embu Level 5 Hospital · Embu County Government'),
      currencySymbol: getSetting('currency_symbol','KES'),
      printFont:      getSetting('print_font','Times New Roman'),
      printFontSize:  getSetting('print_font_size','11'),
      showStamp:      getSetting('show_stamp','true') === 'true',
    });
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[getSetting('hospital_name','Embu Level 5 Hospital')],[getSetting('system_name','EL5 MediProcure')+" — Purchase Orders"],[`Exported: ${new Date().toLocaleString("en-KE")}`],[]];
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
      <div style={{padding:16,display:"flex" as const,flexDirection:"column" as const,gap:10,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      {/* KPI TILES */}
      {(()=>{
        const totalVal = orders.reduce((s,r)=>s+Number(r.total_amount||0),0);
        const recVal   = orders.filter(r=>r.status==="received").reduce((s,r)=>s+Number(r.total_amount||0),0);
        const bal      = totalVal - recVal;
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        return(
          <div style={{display:"grid" as const,gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Value",val:fmtK(totalVal),bg:"#c0392b"},
              {label:"Received Amt.",val:fmtK(recVal),bg:"#7d6608"},
              {label:"Balance",val:fmtK(bal),bg:"#0e6655"},
              {label:"Record Count",val:orders.length,bg:"#6c3483"},
              {label:"Pending / Draft",val:orders.filter(r=>["draft","pending"].includes(r.status||"")).length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center" as const,background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:18,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      {/* Header */}
      <div style={{borderRadius:12,background:"linear-gradient(90deg,#92400e,#C45911,#d97706)",boxShadow:"0 4px 16px rgba(196,89,17,0.3)",padding:"10px 16px",display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const}}>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:12}}>
          <ShoppingCart style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Purchase Orders</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length} of {orders.length} orders · Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}</p>
          </div>
        </div>
        <div style={{display:"flex" as const,flexWrap:"wrap",gap:8}}>
          <button onClick={load} disabled={loading} style={{padding:6,borderRadius:6,background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",cursor:"pointer" as const}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={exportExcel} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"6px 12px",borderRadius:8,background:"rgba(52,211,153,0.9)",color:"#fff",border:"none",cursor:"pointer" as const,fontSize:12,fontWeight:600}}>
            <FileSpreadsheet style={{width:14,height:14}}/>Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{display:"flex" as const,flexWrap:"wrap",gap:8,alignItems:"center" as const}}>
        {["all","draft","pending","approved","sent","received","cancelled"].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            style={{padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:600,textTransform:"capitalize",border:"none",cursor:"pointer" as const,background:statusFilter===s?"#C45911":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
            {s}{s!=="all"&&<span style={{marginLeft:4,opacity:0.7}}>({orders.filter(o=>o.status===s).length})</span>}
          </button>
        ))}
        <div style={{position:"relative" as const,marginLeft:"auto"}}>
          <Search style={{position:"absolute" as const,left:10,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search POs..."
            style={{paddingLeft:32,paddingRight:32,paddingTop:6,paddingBottom:6,borderRadius:20,border:"1.5px solid #e5e7eb",fontSize:12,outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute" as const,right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer" as const}}><X style={{width:12,height:12,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* Table */}
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden" as const}}>
        <div style={{overflowX:"auto" as const}}>
          <table style={{width:"100%",fontSize:12}}>
            <thead>
              <tr style={{background:"#92400e"}}>
                {["#","PO Number","Supplier","Status","Total Amount","Delivery Date","Created","Actions"].map(h=>(
                  <th key={h} style={{textAlign:"left" as const,padding:"10px 12px",color:"rgba(255,255,255,0.8)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                Array(5).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={8} style={{animation:"pulse 1.5s infinite"}}><div style={{height:12,background:"#e5e7eb",borderRadius:6,width:"100%"}}/></td></tr>
                ))
              ):filtered.length===0?(
                <tr><td colSpan={8} style={{padding:"40px 16px",textAlign:"center" as const,color:"#9ca3af"}}>No purchase orders found</td></tr>
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
                    <td style={{padding:"10px 12px",color:"#9ca3af",fontSize:10,whiteSpace:"nowrap" as const}}>{po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):"—"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex" as const,gap:4}}>
                        <button onClick={()=>setViewPO(po)} style={{padding:5,borderRadius:6,background:"#fff7ed",color:"#ea580c",border:"none",cursor:"pointer" as const}}><Eye style={{width:12,height:12}}/></button>
                        <button onClick={()=>printLPO(po)} style={{padding:"5px",borderRadius:6,background:"#f3f4f6",color:"#374151",border:"none",cursor:"pointer" as const}}><Printer style={{width:12,height:12}}/></button>
                        {canApprove&&po.status==="pending"&&(
                          <button onClick={()=>approve(po.id)} style={{padding:"5px",borderRadius:6,background:"#dcfce7",color:"#15803d",border:"none",cursor:"pointer" as const}}><CheckCircle style={{width:12,height:12}}/></button>
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
        <div style={{position:"fixed" as const,inset:0,zIndex:1000,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
          <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.5)",zIndex:999}} onClick={()=>setViewPO(null)}/>
          <div style={{position:"relative" as const,background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh"}}>
            <div style={{padding:"12px 20px",display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const,background:"#92400e"}}>
              <div><h3 style={{fontSize:14,fontWeight:900,color:"#fff"}}>{viewPO.po_number}</h3><p style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Purchase Order</p></div>
              <div style={{display:"flex" as const,gap:8}}>
                <button onClick={()=>printLPO(viewPO)} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"4px 10px",borderRadius:8,color:"#fff",fontSize:12,border:"none",cursor:"pointer" as const}}><Printer style={{width:12,height:12}}/>Print LPO</button>
                <button onClick={()=>setViewPO(null)} style={{padding:"5px",borderRadius:6,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",cursor:"pointer" as const}}><X style={{width:16,height:16}}/></button>
              </div>
            </div>
            <div style={{overflowY:"auto" as const,padding:20}}>
              <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
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
                  style={{width:"100%",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,gap:8,padding:"10px 0",borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,marginBottom:12,border:"none",cursor:"pointer" as const,background:"#15803d"}}>
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
