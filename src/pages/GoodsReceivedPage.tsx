
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Plus, RefreshCw, Search, Eye, Printer, X, Save, CheckCircle, Trash2 } from "lucide-react";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  pending:    {bg:"#fef3c7",color:"#92400e",label:"Pending"},
  received:   {bg:"#dcfce7",color:"#15803d",label:"Received"},
  partial:    {bg:"#dbeafe",color:"#1d4ed8",label:"Partial"},
  rejected:   {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
  inspecting: {bg:"#e0f2fe",color:"#0369a1",label:"Inspecting"},
};

interface GrnItem { item_name:string; description:string; unit_of_measure:string; quantity_ordered:string; quantity_received:string; unit_price:string; }
const EMPTY_ITEM: GrnItem = {item_name:"",description:"",unit_of_measure:"pcs",quantity_ordered:"",quantity_received:"",unit_price:""};

export default function GoodsReceivedPage() {
  const { user, profile, roles } = useAuth();
  const canReceive = roles.includes("admin")||roles.includes("procurement_manager")||roles.includes("warehouse_officer")||roles.includes("inventory_manager");
  const [grns, setGrns]           = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [stFilter, setStFilter]   = useState("all");
  const [viewGrn, setViewGrn]     = useState<any>(null);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({grn_number:"",po_reference:"",supplier_id:"",supplier_name:"",received_date:new Date().toISOString().slice(0,10),delivery_note_number:"",carrier_name:"",remarks:"",status:"received"});
  const [grnItems, setGrnItems]   = useState<GrnItem[]>([{...EMPTY_ITEM}]);
  const hospitalName = "Embu Level 5 Hospital";
  const sysName      = "EL5 MediProcure";

  const load = async()=>{
    setLoading(true);
    const [{data:g},{data:s}] = await Promise.all([
      (supabase as any).from("goods_received").select("*,goods_received_items(*)").order("created_at",{ascending:false}),
      (supabase as any).from("suppliers").select("id,name").order("name"),
    ]);
    setGrns(g||[]); setSuppliers(s||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  const genGrn = ()=>`GRN/EL5H/${new Date().getFullYear()}/${String(Math.floor(1000+Math.random()*9000))}`;

  const printGrn = (g:any) => {
    const win = window.open("","_blank","width=900,height=700");
    if(!win) return;
    const rcvDate = g.received_date ? new Date(g.received_date).toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"}) : new Date(g.created_at||Date.now()).toLocaleDateString("en-KE",{day:"2-digit",month:"long",year:"numeric"});
    const items: any[] = g.goods_received_items || [];
    const totalAmt = items.reduce((s:number,i:any)=>s+((i.quantity_received||i.quantity||0)*(i.unit_price||0)),0);
    const padded = [...items,...Array(Math.max(0,8-items.length)).fill(null)];
    const rowsHtml = padded.map((it:any)=>`<tr style="height:26px"><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px">${it?it.item_name||it.description||"":""}</td><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px">${it?it.description||"":""}</td><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:center">${it?it.unit_of_measure||"":""}</td><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:center">${it?it.quantity_ordered||"":""}</td><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:center">${it?it.quantity_received||"":""}</td><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:right">${it&&it.unit_price?Number(it.unit_price).toLocaleString("en-KE",{minimumFractionDigits:2}):""}</td><td style="border:1px solid #1a3a6b;padding:4px 6px;font-size:11px;text-align:right">${it&&it.unit_price&&(it.quantity_received||it.quantity)?Number((it.quantity_received||it.quantity||0)*(it.unit_price||0)).toLocaleString("en-KE",{minimumFractionDigits:2}):""}</td></tr>`).join("");
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>GRN — ${g.grn_number}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Times New Roman',serif;font-size:12px;padding:30px 40px}@media print{body{padding:10mm}@page{size:A4;margin:10mm}}h1{font-size:22px;font-weight:900;text-align:center;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}.div{border:none;border-top:3px solid #1a3a6b;margin:8px 0 18px}.two{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:18px}.sl{font-size:12px;font-weight:700;text-decoration:underline;text-transform:uppercase;margin-bottom:8px}.il{font-size:11.5px;margin-bottom:6px}.lb{font-weight:700}.iv{border-bottom:1px solid #999;display:inline-block;min-width:180px;margin-left:4px}table{width:100%;border-collapse:collapse;margin-bottom:10px}.tt{background:#1a3a6b;color:#fff;text-align:center;font-size:12px;font-weight:700;text-transform:uppercase;padding:7px;border:1px solid #1a3a6b}.th{background:#1a3a6b;color:#fff;font-size:10px;font-weight:700;text-transform:uppercase;padding:5px 6px;border:1px solid #1a3a6b}.tot{width:280px;margin-left:auto;border-collapse:collapse}.tot td{border:1px solid #1a3a6b;padding:5px 10px;font-size:11.5px}.lbl{background:#eef2ff;font-weight:700;text-transform:uppercase}.val{text-align:right;font-weight:700}.wl{border-bottom:1px solid #000;display:block;margin-bottom:8px;min-height:18px}.sg{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:24px}.sb{text-align:center}.sln{border-top:1px solid #000;margin-top:36px;margin-bottom:4px}.slb{font-size:10px;font-weight:700;text-transform:uppercase}.sdt{font-size:9px;color:#555;margin-top:3px}.ft{margin-top:24px;border-top:1px solid #ccc;padding-top:6px;font-size:9px;color:#555;display:flex;justify-content:space-between}.st{font-size:10px;border:1px solid #ccc;padding:10px;margin-bottom:16px;line-height:1.6}</style></head><body>
    <h1>Goods Received Note</h1><p style="text-align:center;font-size:11px;color:#444;margin-bottom:6px">${hospitalName} · ${sysName} · Embu County Government</p><hr class="div"/>
    <div style="margin-bottom:18px"><p><strong>GRN NUMBER:</strong> ${g.grn_number||"—"}</p><p><strong>DATE:</strong> ${rcvDate}</p><p><strong>PO REFERENCE:</strong> ${g.po_reference||"—"}</p></div>
    <div class="two"><div><div class="sl">Delivery Information:</div><div class="il"><span class="lb">DELIVERY NOTE NUMBER:</span><span class="iv">${g.delivery_note_number||""}</span></div><div class="il"><span class="lb">DELIVERY DATE:</span><span class="iv">${rcvDate}</span></div><div class="il"><span class="lb">CARRIER/DRIVER NAME:</span><span class="iv">${g.carrier_name||""}</span></div></div>
    <div><div class="sl">Supplier Information:</div><div class="il"><span class="lb">SUPPLIER NAME:</span><span class="iv">${g.supplier_name||""}</span></div><div class="il"><span class="lb">SUPPLIER ADDRESS:</span><span class="iv">&nbsp;</span></div><div class="il"><span class="lb">CONTACT INFO:</span><span class="iv">&nbsp;</span></div></div></div>
    <div style="margin-bottom:16px"><div class="sl" style="margin-bottom:8px">Received By:</div><div class="il"><span class="lb">NAME:</span><span class="iv">${g.created_by_name||""}</span>&nbsp;&nbsp;<span class="lb">DEPT:</span><span class="iv">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div></div>
    <table><tr><td colspan="7" class="tt">RECEIVED ITEMS</td></tr><tr><th class="th" style="width:18%">ITEM</th><th class="th" style="width:24%">DESCRIPTION</th><th class="th" style="width:9%;text-align:center">UOM</th><th class="th" style="width:10%;text-align:center">QTY<br>ORDERED</th><th class="th" style="width:10%;text-align:center">QTY<br>RECEIVED</th><th class="th" style="width:14%;text-align:right">UNIT PRICE</th><th class="th" style="width:15%;text-align:right">TOTAL PRICE</th></tr>${rowsHtml}</table>
    <table class="tot"><tr><td class="lbl">TOTAL ITEMS</td><td class="val">${items.length||"—"}</td></tr><tr><td class="lbl">TOTAL AMOUNT</td><td class="val">KES ${totalAmt>0?totalAmt.toLocaleString("en-KE",{minimumFractionDigits:2}):"—"}</td></tr></table>
    <div style="margin-bottom:16px"><div class="sl">Received Condition:</div><span class="wl">&nbsp;</span><span class="wl">&nbsp;</span></div>
    <div style="margin-bottom:16px"><div class="sl">Comments / Remarks:</div><span class="wl">${g.remarks||"&nbsp;"}</span><span class="wl">&nbsp;</span><span class="wl">&nbsp;</span></div>
    <div class="st"><strong>Confirmation Statement:</strong><br>I hereby confirm that the goods listed above have been received, verified and inspected. By signing below, I confirm receipt and acceptance on behalf of ${hospitalName}.</div>
    <div class="sg">${["Received By","Inspected By","Approved By"].map(s=>`<div class="sb"><div class="sln"></div><div class="slb">${s}</div><div class="sdt">Name: ___________________</div><div class="sdt">Date: ___________________</div></div>`).join("")}</div>
    <div class="ft"><span>${hospitalName} · ${sysName}</span><span>Printed: ${new Date().toLocaleString("en-KE")} · OFFICIAL DOCUMENT</span></div>
    </body></html>`);
    win.document.close(); win.focus(); setTimeout(()=>win.print(),500);
  };

  const updateItem = (idx:number, field:keyof GrnItem, val:string) =>
    setGrnItems(prev=>prev.map((it,i)=>i===idx?{...it,[field]:val}:it));

  const resetForm = () => {
    setForm({grn_number:"",po_reference:"",supplier_id:"",supplier_name:"",received_date:new Date().toISOString().slice(0,10),delivery_note_number:"",carrier_name:"",remarks:"",status:"received"});
    setGrnItems([{...EMPTY_ITEM}]);
  };

  const save = async()=>{
    if(!form.supplier_name&&!form.supplier_id){toast({title:"Supplier required",variant:"destructive"});return;}
    setSaving(true);
    const num = form.grn_number||genGrn();
    const supp = suppliers.find(s=>s.id===form.supplier_id);
    const{data,error}=await(supabase as any).from("goods_received").insert({
      ...form, grn_number:num, supplier_name:supp?.name||form.supplier_name,
      created_by:user?.id, created_by_name:profile?.full_name
    }).select().single();
    if(error){toast({title:"Error",description:error.message,variant:"destructive"});setSaving(false);return;}
    const validItems = grnItems.filter(it=>it.item_name.trim());
    if(validItems.length>0){
      await(supabase as any).from("goods_received_items").insert(
        validItems.map(it=>({grn_id:data.id,item_name:it.item_name,description:it.description,unit_of_measure:it.unit_of_measure,quantity_ordered:Number(it.quantity_ordered||0),quantity_received:Number(it.quantity_received||0),unit_price:Number(it.unit_price||0),total_price:Number(it.quantity_received||0)*Number(it.unit_price||0)}))
      );
    }
    logAudit(user?.id,profile?.full_name,"create","goods_received",data?.id,{grn:num});
    toast({title:"GRN created ✓",description:num});
    setShowForm(false); resetForm(); setSaving(false); load();
  };

  const filtered = grns.filter(g=>{
    if(stFilter!=="all"&&g.status!==stFilter) return false;
    if(search){const q=search.toLowerCase();return(g.grn_number||"").toLowerCase().includes(q)||(g.supplier_name||"").toLowerCase().includes(q)||(g.po_reference||"").toLowerCase().includes(q);}
    return true;
  });

  const inp: React.CSSProperties = {width:"100%",padding:"7px 10px",border:"1.5px solid #e5e7eb",borderRadius:7,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const tinp: React.CSSProperties = {padding:"5px 7px",border:"1.5px solid #e5e7eb",borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:"inherit",width:"100%"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"calc(100vh - 60px)"}}>
      <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
      <div style={{background:"linear-gradient(90deg,#065f46,#047857)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,boxShadow:"0 4px 16px rgba(6,95,70,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Package style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Goods Received Notes</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length} of {grns.length} records</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={load} disabled={loading} style={{padding:"6px 12px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",lineHeight:0}}>
            <RefreshCw style={{width:13,height:13,...(loading?{animation:"spin 1s linear infinite"}:{})}}/>
          </button>
          {canReceive&&<button onClick={()=>{resetForm();setShowForm(true);}} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#065f46",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            <Plus style={{width:13,height:13}}/>New GRN
          </button>}
        </div>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
        {[{id:"all",label:`All (${grns.length})`},...Object.entries(STATUS_CFG).map(([k,v])=>({id:k,label:`${v.label} (${grns.filter(g=>g.status===k).length})`}))].map(f=>(
          <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?"#047857":"#e5e7eb"}`,background:stFilter===f.id?"#047857":"#fff",color:stFilter===f.id?"#fff":"#374151",fontSize:11,fontWeight:700,cursor:"pointer"}}>{f.label}</button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search GRN, supplier, PO..." style={{padding:"6px 12px 6px 26px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",width:220}}/>
        </div>
      </div>
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"linear-gradient(90deg,#065f46,#047857)"}}>
            {["GRN Number","PO Reference","Supplier","Received Date","Items","Status","Actions"].map(h=>(
              <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?(<tr><td colSpan={7} style={{padding:24,textAlign:"center"}}><RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/></td></tr>):
            filtered.length===0?(<tr><td colSpan={7} style={{padding:40,textAlign:"center",color:"#9ca3af"}}>No goods received records yet</td></tr>):
            filtered.map((g,i)=>{
              const s=STATUS_CFG[g.status]||{bg:"#f3f4f6",color:"#6b7280",label:g.status};
              const ic=(g.goods_received_items||[]).length;
              return(<tr key={g.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0fdf4"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#f9fafb"}>
                <td style={{padding:"10px 14px",fontWeight:800,color:"#047857",fontFamily:"monospace",cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.grn_number}</td>
                <td style={{padding:"10px 14px",color:"#374151",cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.po_reference||"—"}</td>
                <td style={{padding:"10px 14px",fontWeight:600,color:"#1f2937",cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.supplier_name||"—"}</td>
                <td style={{padding:"10px 14px",color:"#6b7280",cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.received_date?new Date(g.received_date).toLocaleDateString("en-KE"):g.created_at?new Date(g.created_at).toLocaleDateString("en-KE"):"—"}</td>
                <td style={{padding:"10px 14px",textAlign:"center",color:ic>0?"#065f46":"#9ca3af",fontWeight:ic>0?700:400}}>{ic>0?ic:"—"}</td>
                <td style={{padding:"10px 14px",cursor:"pointer"}} onClick={()=>setViewGrn(g)}><span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span></td>
                <td style={{padding:"10px 14px"}}><div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setViewGrn(g)} title="View" style={{padding:"4px 8px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer",lineHeight:0}}><Eye style={{width:12,height:12,color:"#15803d"}}/></button>
                  <button onClick={()=>printGrn(g)} title="Print GRN" style={{padding:"4px 8px",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:6,cursor:"pointer",lineHeight:0}}><Printer style={{width:12,height:12,color:"#0369a1"}}/></button>
                </div></td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
      {viewGrn&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex",justifyContent:"flex-end"}} onClick={()=>setViewGrn(null)}>
          <div style={{width:"min(500px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:"linear-gradient(90deg,#065f46,#047857)",display:"flex",alignItems:"center",gap:8}}>
              <Package style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>{viewGrn.grn_number}</span>
              <button onClick={()=>printGrn(viewGrn)} style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",color:"#fff",fontSize:11,fontWeight:700}}><Printer style={{width:11,height:11}}/>Print GRN</button>
              <button onClick={()=>setViewGrn(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              {[["PO Reference",viewGrn.po_reference],["Supplier",viewGrn.supplier_name],["Received Date",viewGrn.received_date?new Date(viewGrn.received_date).toLocaleDateString("en-KE"):"—"],["Delivery Note",viewGrn.delivery_note_number||"—"],["Carrier/Driver",viewGrn.carrier_name||"—"],["Status",viewGrn.status],["Created By",viewGrn.created_by_name||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{v||"—"}</span>
                </div>
              ))}
              {viewGrn.remarks&&<div style={{padding:12,background:"#f9fafb",borderRadius:8,fontSize:12,color:"#374151"}}>{viewGrn.remarks}</div>}
              {(viewGrn.goods_received_items||[]).length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",marginBottom:8}}>Received Items ({viewGrn.goods_received_items.length})</div>
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{background:"#065f46"}}>{["Item","UOM","Qty Ord.","Qty Rcvd","Unit Price"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                      <tbody>{viewGrn.goods_received_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}}>
                          <td style={{padding:"7px 10px",fontWeight:600,color:"#1f2937"}}>{it.item_name||it.description||"—"}</td>
                          <td style={{padding:"7px 10px",color:"#6b7280"}}>{it.unit_of_measure||"—"}</td>
                          <td style={{padding:"7px 10px",textAlign:"center",color:"#374151"}}>{it.quantity_ordered||0}</td>
                          <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:"#047857"}}>{it.quantity_received||0}</td>
                          <td style={{padding:"7px 10px",textAlign:"right",color:"#374151"}}>KES {Number(it.unit_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:50,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 16px",overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(760px,100%)",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",marginBottom:20}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(90deg,#065f46,#047857)",borderRadius:"16px 16px 0 0",display:"flex",alignItems:"center"}}>
              <Package style={{width:16,height:16,color:"#fff",marginRight:8}}/>
              <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>New Goods Received Note</span>
              <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:0}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:18}}>
              <div style={{fontSize:11,fontWeight:800,color:"#065f46",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #d1fae5"}}>Header Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Supplier</label>
                  <select value={form.supplier_id} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value,supplier_name:suppliers.find(s=>s.id===e.target.value)?.name||p.supplier_name}))} style={inp}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Supplier Name (manual)</label><input value={form.supplier_name} onChange={e=>setForm(p=>({...p,supplier_name:e.target.value}))} placeholder="Or type supplier name..." style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>PO Reference</label><input value={form.po_reference} onChange={e=>setForm(p=>({...p,po_reference:e.target.value}))} placeholder="PO/EL5H/..." style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Received Date *</label><input type="date" value={form.received_date} onChange={e=>setForm(p=>({...p,received_date:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Delivery Note No.</label><input value={form.delivery_note_number} onChange={e=>setForm(p=>({...p,delivery_note_number:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Carrier / Driver Name</label><input value={form.carrier_name} onChange={e=>setForm(p=>({...p,carrier_name:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>
                    {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select></div>
                <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Remarks / Received Condition</label><input value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} style={inp}/></div>
              </div>
              <div style={{fontSize:11,fontWeight:800,color:"#065f46",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #d1fae5",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>Received Items</span>
                <button onClick={()=>setGrnItems(p=>[...p,{...EMPTY_ITEM}])} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:"#065f46",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700}}><Plus style={{width:11,height:11}}/>Add Row</button>
              </div>
              <div style={{overflowX:"auto",marginBottom:14}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:640}}>
                  <thead><tr style={{background:"#065f46"}}>
                    {["#","Item Name *","Description","UOM","Qty Ordered","Qty Received","Unit Price (KES)",""].map((h,i)=>(
                      <th key={i} style={{padding:"7px 8px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {grnItems.map((it,idx)=>(
                      <tr key={idx} style={{borderBottom:"1px solid #f3f4f6",background:idx%2===0?"#fff":"#f9fafb"}}>
                        <td style={{padding:"4px 6px",textAlign:"center",color:"#9ca3af",fontSize:10,width:24,fontWeight:700}}>{idx+1}</td>
                        <td style={{padding:"3px 4px"}}><input value={it.item_name} onChange={e=>updateItem(idx,"item_name",e.target.value)} placeholder="Item name" style={{...tinp,width:140}}/></td>
                        <td style={{padding:"3px 4px"}}><input value={it.description} onChange={e=>updateItem(idx,"description",e.target.value)} placeholder="Description" style={{...tinp,width:130}}/></td>
                        <td style={{padding:"3px 4px"}}>
                          <select value={it.unit_of_measure} onChange={e=>updateItem(idx,"unit_of_measure",e.target.value)} style={{...tinp,width:70}}>
                            {["pcs","box","kg","litres","tablets","vials","ampoules","sachets","rolls","sets","strips","bottles","cartridges"].map(u=><option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"3px 4px"}}><input type="number" min={0} value={it.quantity_ordered} onChange={e=>updateItem(idx,"quantity_ordered",e.target.value)} placeholder="0" style={{...tinp,width:65,textAlign:"center"}}/></td>
                        <td style={{padding:"3px 4px"}}><input type="number" min={0} value={it.quantity_received} onChange={e=>updateItem(idx,"quantity_received",e.target.value)} placeholder="0" style={{...tinp,width:65,textAlign:"center"}}/></td>
                        <td style={{padding:"3px 4px"}}><input type="number" min={0} step="0.01" value={it.unit_price} onChange={e=>updateItem(idx,"unit_price",e.target.value)} placeholder="0.00" style={{...tinp,width:90,textAlign:"right"}}/></td>
                        <td style={{padding:"3px 6px",textAlign:"center"}}>
                          {grnItems.length>1&&<button onClick={()=>setGrnItems(p=>p.filter((_,i)=>i!==idx))} style={{padding:"3px 5px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer",lineHeight:0}}><Trash2 style={{width:11,height:11,color:"#dc2626"}}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{background:"#f0fdf4",borderTop:"2px solid #d1fae5"}}>
                    <td colSpan={4} style={{padding:"7px 8px",textAlign:"right",fontSize:11,fontWeight:800,color:"#065f46"}}>TOTALS →</td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,color:"#065f46"}}>{grnItems.reduce((s,it)=>s+Number(it.quantity_ordered||0),0)||0}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,color:"#047857"}}>{grnItems.reduce((s,it)=>s+Number(it.quantity_received||0),0)||0}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:"#065f46"}}>KES {grnItems.reduce((s,it)=>s+(Number(it.quantity_received||0)*Number(it.unit_price||0)),0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
                    <td/>
                  </tr></tfoot>
                </table>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 18px",borderTop:"1px solid #e5e7eb"}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:"#065f46",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<CheckCircle style={{width:13,height:13}}/>}
                {saving?"Saving...":"Create GRN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
