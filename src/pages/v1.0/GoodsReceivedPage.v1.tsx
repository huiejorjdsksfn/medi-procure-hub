
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Package, Plus, RefreshCw, Search, Eye, Printer, X, Save, CheckCircle, Trash2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printGRN } from "@/lib/printDocument";

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
  const { get: getSetting } = useSystemSettings();
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
    printGRN(g, {
      hospitalName:   getSetting('hospital_name','Embu Level 5 Hospital'),
      sysName:        getSetting('system_name','EL5 MediProcure'),
      docFooter:      getSetting('doc_footer','Embu Level 5 Hospital · Embu County Government'),
      currencySymbol: getSetting('currency_symbol','KES'),
      printFont:      getSetting('print_font','Times New Roman'),
      printFontSize:  getSetting('print_font_size','11'),
      showStamp:      getSetting('show_stamp','true') === 'true',
    });
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

  const inp: React.CSSProperties = {width:"100%",padding:"7px 10px",border:"1.5px solid #e5e7eb",borderRadius:7,fontSize:12,outline:"none",boxSizing:"border-box" as const,fontFamily:"inherit"};
  const tinp: React.CSSProperties = {padding:"5px 7px",border:"1.5px solid #e5e7eb",borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box" as const,fontFamily:"inherit",width:"100%"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui",minHeight:"calc(100vh - 60px)"}}>
      <style>{"@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}"}</style>
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const totalVal=grns.reduce((s:number,g:any)=>s+Number(g.total_amount||0),0);
        const rcvCount=grns.filter(g=>g.status==="received").length;
        const pendCount=grns.filter(g=>g.status==="pending").length;
        const thisMonth=grns.filter(g=>g.created_at&&new Date(g.created_at).getMonth()===new Date().getMonth()).length;
        return(
          <div style={{display:"grid" as const,gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:12}}>
            {[
              {label:"Total GRN Value",val:fmtK(totalVal),bg:"#c0392b"},
              {label:"Total GRNs",val:grns.length,bg:"#7d6608"},
              {label:"Received",val:rcvCount,bg:"#0e6655"},
              {label:"Pending",val:pendCount,bg:"#6c3483"},
              {label:"This Month",val:thisMonth,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center" as const,background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div style={{background:"linear-gradient(90deg,#065f46,#047857)",borderRadius:14,padding:"12px 20px",display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const,marginBottom:14,boxShadow:"0 4px 16px rgba(6,95,70,0.3)"}}>
        <div style={{display:"flex" as const,alignItems:"center" as const,gap:10}}>
          <Package style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Goods Received Notes</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length} of {grns.length} records</p>
          </div>
        </div>
        <div style={{display:"flex" as const,gap:8}}>
          <button onClick={load} disabled={loading} style={{padding:"6px 12px",background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,lineHeight:0}}>
            <RefreshCw style={{width:13,height:13,...(loading?{animation:"spin 1s linear infinite"}:{})}}/>
          </button>
          {canReceive&&<button onClick={()=>{resetForm();setShowForm(true);}} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"7px 14px",background:"rgba(255,255,255,0.92)",color:"#065f46",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:12,fontWeight:700}}>
            <Plus style={{width:13,height:13}}/>New GRN
          </button>}
        </div>
      </div>
      <div style={{display:"flex" as const,gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center" as const}}>
        {[{id:"all",label:`All (${grns.length})`},...Object.entries(STATUS_CFG).map(([k,v])=>({id:k,label:`${v.label} (${grns.filter(g=>g.status===k).length})`}))].map(f=>(
          <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?"#047857":"#e5e7eb"}`,background:stFilter===f.id?"#047857":"#fff",color:stFilter===f.id?"#fff":"#374151",fontSize:11,fontWeight:700,cursor:"pointer" as const}}>{f.label}</button>
        ))}
        <div style={{position:"relative" as const,marginLeft:"auto"}}>
          <Search style={{position:"absolute" as const,left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search GRN, supplier, PO..." style={{padding:"6px 12px 6px 26px",border:"1.5px solid #e5e7eb",borderRadius:20,fontSize:12,outline:"none",width:220}}/>
        </div>
      </div>
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden" as const,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"linear-gradient(90deg,#065f46,#047857)"}}>
            {["GRN Number","PO Reference","Supplier","Received Date","Items","Status","Actions"].map(h=>(
              <th key={h} style={{padding:"10px 14px",textAlign:"left" as const,fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap" as const}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?(<tr><td colSpan={7} style={{padding:24,textAlign:"center" as const}}><RefreshCw style={{width:16,height:16,color:"#d1d5db",animation:"spin 1s linear infinite",display:"block" as const,margin:"0 auto"}}/></td></tr>):
            filtered.length===0?(<tr><td colSpan={7} style={{padding:40,textAlign:"center" as const,color:"#9ca3af"}}>No goods received records yet</td></tr>):
            filtered.map((g,i)=>{
              const s=STATUS_CFG[g.status]||{bg:"#f3f4f6",color:"#6b7280",label:g.status};
              const ic=(g.goods_received_items||[]).length;
              return(<tr key={g.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0fdf4"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#f9fafb"}>
                <td style={{padding:"10px 14px",fontWeight:800,color:"#047857",fontFamily:"monospace",cursor:"pointer" as const}} onClick={()=>setViewGrn(g)}>{g.grn_number}</td>
                <td style={{padding:"10px 14px",color:"#374151",cursor:"pointer" as const}} onClick={()=>setViewGrn(g)}>{g.po_reference||"—"}</td>
                <td style={{padding:"10px 14px",fontWeight:600,color:"#1f2937",cursor:"pointer" as const}} onClick={()=>setViewGrn(g)}>{g.supplier_name||"—"}</td>
                <td style={{padding:"10px 14px",color:"#6b7280",cursor:"pointer" as const}} onClick={()=>setViewGrn(g)}>{g.received_date?new Date(g.received_date).toLocaleDateString("en-KE"):g.created_at?new Date(g.created_at).toLocaleDateString("en-KE"):"—"}</td>
                <td style={{padding:"10px 14px",textAlign:"center" as const,color:ic>0?"#065f46":"#9ca3af",fontWeight:ic>0?700:400}}>{ic>0?ic:"—"}</td>
                <td style={{padding:"10px 14px",cursor:"pointer" as const}} onClick={()=>setViewGrn(g)}><span style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span></td>
                <td style={{padding:"10px 14px"}}><div style={{display:"flex" as const,gap:4}}>
                  <button onClick={()=>setViewGrn(g)} title="View" style={{padding:"4px 8px",background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer" as const,lineHeight:0}}><Eye style={{width:12,height:12,color:"#15803d"}}/></button>
                  <button onClick={()=>printGrn(g)} title="Print GRN" style={{padding:"4px 8px",background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:6,cursor:"pointer" as const,lineHeight:0}}><Printer style={{width:12,height:12,color:"#0369a1"}}/></button>
                </div></td>
              </tr>);
            })}
          </tbody>
        </table>
      </div>
      {viewGrn&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.5)",zIndex:50,display:"flex" as const,justifyContent:"flex-end" as const}} onClick={()=>setViewGrn(null)}>
          <div style={{width:"min(500px,100%)",background:"#fff",height:"100%",overflowY:"auto" as const,boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:"linear-gradient(90deg,#065f46,#047857)",display:"flex" as const,alignItems:"center" as const,gap:8}}>
              <Package style={{width:14,height:14,color:"#fff"}}/>
              <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>{viewGrn.grn_number}</span>
              <button onClick={()=>printGrn(viewGrn)} style={{display:"flex" as const,alignItems:"center" as const,gap:5,background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer" as const,color:"#fff",fontSize:11,fontWeight:700}}><Printer style={{width:11,height:11}}/>Print GRN</button>
              <button onClick={()=>setViewGrn(null)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer" as const,color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:16,display:"flex" as const,flexDirection:"column" as const,gap:10}}>
              {[["PO Reference",viewGrn.po_reference],["Supplier",viewGrn.supplier_name],["Received Date",viewGrn.received_date?new Date(viewGrn.received_date).toLocaleDateString("en-KE"):"—"],["Delivery Note",viewGrn.delivery_note_number||"—"],["Carrier/Driver",viewGrn.carrier_name||"—"],["Status",viewGrn.status],["Created By",viewGrn.created_by_name||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex" as const,justifyContent:"space-between" as const,padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,color:"#9ca3af",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>{v||"—"}</span>
                </div>
              ))}
              {viewGrn.remarks&&<div style={{padding:12,background:"#f9fafb",borderRadius:8,fontSize:12,color:"#374151"}}>{viewGrn.remarks}</div>}
              {(viewGrn.goods_received_items||[]).length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:"#9ca3af",textTransform:"uppercase",marginBottom:8}}>Received Items ({viewGrn.goods_received_items.length})</div>
                  <div style={{background:"#fff",border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden" as const}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{background:"#065f46"}}>{["Item","UOM","Qty Ord.","Qty Rcvd","Unit Price"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left" as const,color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                      <tbody>{viewGrn.goods_received_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#f9fafb"}}>
                          <td style={{padding:"7px 10px",fontWeight:600,color:"#1f2937"}}>{it.item_name||it.description||"—"}</td>
                          <td style={{padding:"7px 10px",color:"#6b7280"}}>{it.unit_of_measure||"—"}</td>
                          <td style={{padding:"7px 10px",textAlign:"center" as const,color:"#374151"}}>{it.quantity_ordered||0}</td>
                          <td style={{padding:"7px 10px",textAlign:"center" as const,fontWeight:700,color:"#047857"}}>{it.quantity_received||0}</td>
                          <td style={{padding:"7px 10px",textAlign:"right" as const,color:"#374151"}}>KES {Number(it.unit_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
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
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.55)",zIndex:50,display:"flex" as const,alignItems:"flex-start" as const,justifyContent:"center" as const,padding:"20px 16px",overflowY:"auto" as const}}>
          <div style={{background:"#fff",borderRadius:16,width:"min(760px,100%)",boxShadow:"0 24px 64px rgba(0,0,0,0.2)",marginBottom:20}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(90deg,#065f46,#047857)",borderRadius:"16px 16px 0 0",display:"flex" as const,alignItems:"center" as const}}>
              <Package style={{width:16,height:16,color:"#fff",marginRight:8}}/>
              <span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>New Goods Received Note</span>
              <button onClick={()=>setShowForm(false)} style={{background:"rgba(255,255,255,0.15)",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer" as const,color:"#fff",lineHeight:0}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:18}}>
              <div style={{fontSize:11,fontWeight:800,color:"#065f46",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #d1fae5"}}>Header Information</div>
              <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Supplier</label>
                  <select value={form.supplier_id} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value,supplier_name:suppliers.find(s=>s.id===e.target.value)?.name||p.supplier_name}))} style={inp}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Supplier Name (manual)</label><input value={form.supplier_name} onChange={e=>setForm(p=>({...p,supplier_name:e.target.value}))} placeholder="Or type supplier name..." style={inp}/></div>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>PO Reference</label><input value={form.po_reference} onChange={e=>setForm(p=>({...p,po_reference:e.target.value}))} placeholder="PO/EL5H/..." style={inp}/></div>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Received Date *</label><input type="date" value={form.received_date} onChange={e=>setForm(p=>({...p,received_date:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Delivery Note No.</label><input value={form.delivery_note_number} onChange={e=>setForm(p=>({...p,delivery_note_number:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Carrier / Driver Name</label><input value={form.carrier_name} onChange={e=>setForm(p=>({...p,carrier_name:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>
                    {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select></div>
                <div style={{gridColumn:"span 2"}}><label style={{display:"block" as const,fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",marginBottom:4}}>Remarks / Received Condition</label><input value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} style={inp}/></div>
              </div>
              <div style={{fontSize:11,fontWeight:800,color:"#065f46",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,paddingBottom:6,borderBottom:"2px solid #d1fae5",display:"flex" as const,alignItems:"center" as const,justifyContent:"space-between" as const}}>
                <span>Received Items</span>
                <button onClick={()=>setGrnItems(p=>[...p,{...EMPTY_ITEM}])} style={{display:"flex" as const,alignItems:"center" as const,gap:4,padding:"4px 10px",background:"#065f46",color:"#fff",border:"none",borderRadius:6,cursor:"pointer" as const,fontSize:11,fontWeight:700}}><Plus style={{width:11,height:11}}/>Add Row</button>
              </div>
              <div style={{overflowX:"auto" as const,marginBottom:14}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:640}}>
                  <thead><tr style={{background:"#065f46"}}>
                    {["#","Item Name *","Description","UOM","Qty Ordered","Qty Received","Unit Price (KES)",""].map((h,i)=>(
                      <th key={i} style={{padding:"7px 8px",textAlign:"left" as const,color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap" as const}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {grnItems.map((it,idx)=>(
                      <tr key={idx} style={{borderBottom:"1px solid #f3f4f6",background:idx%2===0?"#fff":"#f9fafb"}}>
                        <td style={{padding:"4px 6px",textAlign:"center" as const,color:"#9ca3af",fontSize:10,width:24,fontWeight:700}}>{idx+1}</td>
                        <td style={{padding:"3px 4px"}}><input value={it.item_name} onChange={e=>updateItem(idx,"item_name",e.target.value)} placeholder="Item name" style={{...tinp,width:140}}/></td>
                        <td style={{padding:"3px 4px"}}><input value={it.description} onChange={e=>updateItem(idx,"description",e.target.value)} placeholder="Description" style={{...tinp,width:130}}/></td>
                        <td style={{padding:"3px 4px"}}>
                          <select value={it.unit_of_measure} onChange={e=>updateItem(idx,"unit_of_measure",e.target.value)} style={{...tinp,width:70}}>
                            {["pcs","box","kg","litres","tablets","vials","ampoules","sachets","rolls","sets","strips","bottles","cartridges"].map(u=><option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td style={{padding:"3px 4px"}}><input type="number" min={0} value={it.quantity_ordered} onChange={e=>updateItem(idx,"quantity_ordered",e.target.value)} placeholder="0" style={{...tinp,width:65,textAlign:"center" as const}}/></td>
                        <td style={{padding:"3px 4px"}}><input type="number" min={0} value={it.quantity_received} onChange={e=>updateItem(idx,"quantity_received",e.target.value)} placeholder="0" style={{...tinp,width:65,textAlign:"center" as const}}/></td>
                        <td style={{padding:"3px 4px"}}><input type="number" min={0} step="0.01" value={it.unit_price} onChange={e=>updateItem(idx,"unit_price",e.target.value)} placeholder="0.00" style={{...tinp,width:90,textAlign:"right" as const}}/></td>
                        <td style={{padding:"3px 6px",textAlign:"center" as const}}>
                          {grnItems.length>1&&<button onClick={()=>setGrnItems(p=>p.filter((_,i)=>i!==idx))} style={{padding:"3px 5px",background:"#fee2e2",border:"1px solid #fecaca",borderRadius:5,cursor:"pointer" as const,lineHeight:0}}><Trash2 style={{width:11,height:11,color:"#dc2626"}}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{background:"#f0fdf4",borderTop:"2px solid #d1fae5"}}>
                    <td colSpan={4} style={{padding:"7px 8px",textAlign:"right" as const,fontSize:11,fontWeight:800,color:"#065f46"}}>TOTALS →</td>
                    <td style={{padding:"7px 8px",textAlign:"center" as const,fontWeight:800,color:"#065f46"}}>{grnItems.reduce((s,it)=>s+Number(it.quantity_ordered||0),0)||0}</td>
                    <td style={{padding:"7px 8px",textAlign:"center" as const,fontWeight:800,color:"#047857"}}>{grnItems.reduce((s,it)=>s+Number(it.quantity_received||0),0)||0}</td>
                    <td style={{padding:"7px 8px",textAlign:"right" as const,fontWeight:800,color:"#065f46"}}>KES {grnItems.reduce((s,it)=>s+(Number(it.quantity_received||0)*Number(it.unit_price||0)),0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
                    <td/>
                  </tr></tfoot>
                </table>
              </div>
            </div>
            <div style={{display:"flex" as const,gap:8,justifyContent:"flex-end" as const,padding:"12px 18px",borderTop:"1px solid #e5e7eb"}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer" as const,fontSize:13}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"8px 20px",background:"#065f46",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
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
