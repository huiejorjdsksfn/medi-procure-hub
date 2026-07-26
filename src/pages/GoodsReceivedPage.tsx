/**
 * ProcurBosse - Goods Received Notes v2.0 (2026 ERP redesign)
 * Same data / save logic — visual layer via shared erpKit on the T theme.
 */
import { useEffect, useState } from "react";
import { WorkflowEngine } from "@/engines/workflow/WorkflowEngine";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import PushToApprovalButton from "@/components/PushToApprovalButton";
import { logAudit } from "@/lib/audit";
import { Package, Plus, RefreshCw, Search, Eye, Printer, X, Save, CheckCircle, Trash2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printGRN } from "@/lib/printDocument";
import { triggerGrnEvent } from "@/lib/notify";
import { executeGRNAction, generateGRNNumber, type GRNAction } from "@/lib/procurement/grnWorkflow";
import { DocumentStamp } from "@/components/DocumentStamp";
import { T } from "@/lib/theme";
import { PageHeader, SearchBox, BtnPrimary, BtnGhost, KpiBand, Card, font, spinKeyframes } from "@/lib/erpKit";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  pending:    {bg:T.warningBg,color:T.warning,label:"Pending"},
  received:   {bg:T.successBg,color:T.success,label:"Received"},
  partial:    {bg:T.primaryBg,color:T.primary,label:"Partial"},
  rejected:   {bg:T.errorBg,  color:T.error,  label:"Rejected"},
  inspecting: {bg:T.primaryBg,color:T.primary,label:"Inspecting"},
};

interface GrnItem { item_name:string; description:string; unit_of_measure:string; quantity_ordered:string; quantity_received:string; unit_price:string; }
const EMPTY_ITEM: GrnItem = {item_name:"",description:"",unit_of_measure:"pcs",quantity_ordered:"",quantity_received:"",unit_price:""};

export default function GoodsReceivedPage() {
  const { user, profile, roles } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canReceive = roles.includes("admin")||roles.includes("procurement_manager")||roles.includes("warehouse_officer")||roles.includes("inventory_manager");
  const [grns, setGrns]           = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [manualPO, setManualPO]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [stFilter, setStFilter]   = useState("all");
  const [viewGrn, setViewGrn]     = useState<any>(null);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    grn_number:"", po_reference:"", supplier_id:"", supplier_name:"",
    received_date:new Date().toISOString().slice(0,10),
    delivery_note_number:"", invoice_number:"", waybill_number:"",
    carrier_name:"", received_by:"", store_location:"Main Store",
    remarks:"", status:"received"
  });
  const [grnItems, setGrnItems]   = useState<GrnItem[]>([{...EMPTY_ITEM}]);

  const load = async()=>{
    setLoading(true);
    try {
      const [{data:g,error:ge},{data:s},{data:po}] = await Promise.all([
        (supabase as any).from("goods_received").select("*,goods_received_items(*)").order("created_at",{ascending:false}),
        (supabase as any).from("suppliers").select("id,name").order("name"),
        (supabase as any).from("purchase_orders").select("id,po_number,supplier_id,supplier_name,status,line_items").order("created_at",{ascending:false}),
      ]);
      if(ge) throw ge;
      const rows=g||[]; setGrns(rows); setSuppliers(s||[]); setPurchaseOrders(po||[]);
      pageCache.set("goods_received",rows); pageCache.set("suppliers_lite",s||[]); pageCache.set("purchase_orders_lite",po||[]);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("goods_received");
      if(cached) setGrns(cached);
      console.error("[GoodsReceived]",e);
    } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);

  /* - Real-time subscription - */
  useEffect(()=>{
    const ch=(supabase as any).channel("grn-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"goods_received"},()=>load())
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},()=>load())
      .subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const printGrn = (g:any) => {
    (printGRN as any)(g, [], null, {
      hospitalName:   getSetting('hospital_name','Embu Level 5 Hospital'),
      sysName:        getSetting('system_name','EL5 MediProcure'),
      docFooter:      getSetting('doc_footer','Embu Level 5 Hospital - Embu County Government'),
      currencySymbol: getSetting('currency_symbol','KES'),
      logoUrl:         getSetting('logo_url') || getSetting('system_logo_url') || '',
      hospitalAddress: getSetting('hospital_address','Embu Town, Embu County, Kenya'),
      hospitalPhone:   getSetting('hospital_phone','+254 060 000000'),
      hospitalEmail:   getSetting('hospital_email','info@embu.health.go.ke'),
      printFont:      getSetting('print_font','Times New Roman'),
      printFontSize:  getSetting('print_font_size','11'),
      showStamp:      getSetting('show_stamp','true') === 'true',
    });
  };

  const updateItem = (idx:number, field:keyof GrnItem, val:string) =>
    setGrnItems(prev=>prev.map((it,i)=>i===idx?{...it,[field]:val}:it));

  const resetForm = () => {
    setForm({
    grn_number:"", po_reference:"", supplier_id:"", supplier_name:"",
    received_date:new Date().toISOString().slice(0,10),
    delivery_note_number:"", invoice_number:"", waybill_number:"",
    carrier_name:"", received_by:"", store_location:"Main Store",
    remarks:"", status:"received"
  });
    setGrnItems([{...EMPTY_ITEM}]);
    setManualPO(false);
  };

  const applyPO = (poId:string) => {
    const po = purchaseOrders.find(p=>p.id===poId);
    if(!po) return;
    setForm(p=>({...p, po_reference:po.po_number, supplier_id:po.supplier_id||"", supplier_name:po.supplier_name||p.supplier_name}));
    const lines = Array.isArray(po.line_items) ? po.line_items : [];
    if(lines.length){
      setGrnItems(lines.map((li:any)=>({
        item_name: li.item_name || li.description || "",
        description: li.description || "",
        unit_of_measure: li.unit || li.unit_of_measure || "pcs",
        quantity_ordered: String(li.quantity ?? ""),
        quantity_received: String(li.quantity ?? ""),
        unit_price: String(li.unit_price ?? ""),
      })));
    }
  };

  const save = async()=>{
    if(!form.supplier_name&&!form.supplier_id){toast({title:"Supplier is required",variant:"destructive"});return;}
    if(!form.received_date){toast({title:"Received date is required",variant:"destructive"});return;}
    const validItems2 = grnItems.filter((it:any)=>it.item_name?.trim());
    if(!validItems2.length){toast({title:"At least one item with a name is required",variant:"destructive"});return;}
    const badQty = validItems2.find((it:any)=>Number(it.quantity_received)<0);
    if(badQty){toast({title:`Quantity received cannot be negative for: ${badQty.item_name}`,variant:"destructive"});return;}
    setSaving(true);
    const num = form.grn_number||generateGRNNumber();
    const supp = suppliers.find(s=>s.id===form.supplier_id);
    const{data,error}=await(supabase as any).from("goods_received").insert({
      ...form, grn_number:num, supplier_name:supp?.name||form.supplier_name,
      // supplier_id is a uuid column — "" (the field's default/unselected
      // state) isn't a valid uuid and Postgres rejects it outright
      // ("invalid input syntax for type uuid: ''"), which happened any
      // time a GRN was saved by typing a supplier name instead of
      // picking one from the dropdown. Send null when nothing was
      // actually selected.
      supplier_id: form.supplier_id || null,
      created_by:user?.id, created_by_name:profile?.full_name
    }).select().single();
    if(error||!data){toast({title:"Save failed",description:error?.message||"Database error - please try again",variant:"destructive"});setSaving(false);return;}
    const validItems = grnItems.filter(it=>it.item_name.trim());
    if(validItems.length>0){
      await(supabase as any).from("goods_received_items").insert(
        validItems.map(it=>({grn_id:data.id,item_name:it.item_name,description:it.description,unit_of_measure:it.unit_of_measure,quantity_ordered:Number(it.quantity_ordered||0),quantity_received:Number(it.quantity_received||0),unit_price:Number(it.unit_price||0),total_price:Number(it.quantity_received||0)*Number(it.unit_price||0)}))
      );
    }
    logAudit(user?.id,profile?.full_name,"create","goods_received",data?.id,{grn:num});
    toast({title:"GRN created",description:num});
    if(data?.id) triggerGrnEvent(data.id).catch(()=>{});
    setShowForm(false); resetForm(); setSaving(false); load();
  };

  const filtered = grns.filter(g=>{
    if(stFilter!=="all"&&g.status!==stFilter) return false;
    if(search){const q=search.toLowerCase();return(g.grn_number||"").toLowerCase().includes(q)||(g.supplier_name||"").toLowerCase().includes(q)||(g.po_reference||"").toLowerCase().includes(q);}
    return true;
  });

  const inp: React.CSSProperties = {width:"100%",padding:"7px 10px",border:`1.5px solid ${T.border}`,borderRadius:T.rMd,fontSize:12,outline:"none",boxSizing:"border-box",fontFamily:font,background:T.bg,color:T.fg};
  const tinp: React.CSSProperties = {padding:"5px 7px",border:`1.5px solid ${T.border}`,borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box",fontFamily:font,width:"100%",background:T.bg,color:T.fg};

  const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
  const totalVal=grns.reduce((s:number,g:any)=>s+Number(g.total_amount||0),0);
  const rcvCount=grns.filter(g=>g.status==="received").length;
  const pendCount=grns.filter(g=>g.status==="pending").length;
  const thisMonth=grns.filter(g=>g.created_at&&new Date(g.created_at).getMonth()===new Date().getMonth()).length;

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:font}}>
      <PageHeader icon={Package} title="Goods Received Notes" subtitle={`${filtered.length} of ${grns.length} records`}>
        <BtnGhost onClick={load} icon={RefreshCw} loading={loading}>Refresh</BtnGhost>
        {canReceive&&<BtnPrimary onClick={()=>{resetForm();setShowForm(true);}} icon={Plus}>New GRN</BtnPrimary>}
      </PageHeader>

      <div style={{padding:"20px 20px 32px"}}>
        <KpiBand loading={loading} items={[
          {label:"Total GRN Value",val:fmtK(totalVal),color:"#a4262c",icon:Package},
          {label:"Total GRNs",val:grns.length,color:T.warning,icon:CheckCircle},
          {label:"Received",val:rcvCount,color:T.success,icon:CheckCircle},
          {label:"Pending",val:pendCount,color:"#6c3483",icon:RefreshCw},
          {label:"This Month",val:thisMonth,color:T.primary,icon:Package},
        ]}/>

        <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:14,alignItems:"center"}}>
          {[{id:"all",label:`All (${grns.length})`},...Object.entries(STATUS_CFG).map(([k,v])=>({id:k,label:`${v.label} (${grns.filter(g=>g.status===k).length})`}))].map(f=>(
            <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?T.success:T.border}`,background:stFilter===f.id?T.success:T.card,color:stFilter===f.id?"#fff":T.fgMuted,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:font}}>{f.label}</button>
          ))}
          <div style={{marginLeft:"auto"}}>
            <SearchBox value={search} onChange={setSearch} placeholder="Search GRN, supplier, PO…" width={220}/>
          </div>
        </div>

        <Card style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
            <table data-mobile-card="true" style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:560}}>
              <thead><tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                {["GRN Number","PO Reference","Supplier","Received Date","Items","Status","Actions"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading?(<tr><td colSpan={7} style={{padding:24,textAlign:"center"}}><RefreshCw style={{width:16,height:16,color:T.border,animation:"spin 1s linear infinite",display:"block",margin:"0 auto"}}/></td></tr>):
                filtered.length===0?(<tr><td colSpan={7} style={{padding:40,textAlign:"center",color:T.fgDim}}>No goods received records yet</td></tr>):
                filtered.map((g,i)=>{
                  const s=STATUS_CFG[g.status]||{bg:T.bg2,color:T.fgMuted,label:g.status};
                  const ic=(g.goods_received_items||[]).length;
                  return(<tr key={g.id} style={{borderBottom:`1px solid ${T.border}`,background:T.card}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                    <td style={{padding:"10px 14px",fontWeight:800,color:T.success,fontFamily:"monospace",cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.grn_number}</td>
                    <td style={{padding:"10px 14px",color:T.fgMuted,cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.po_reference||"-"}</td>
                    <td style={{padding:"10px 14px",fontWeight:600,color:T.fg,cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.supplier_name||"-"}</td>
                    <td style={{padding:"10px 14px",color:T.fgMuted,cursor:"pointer"}} onClick={()=>setViewGrn(g)}>{g.received_date?new Date(g.received_date).toLocaleDateString("en-KE"):g.created_at?new Date(g.created_at).toLocaleDateString("en-KE"):"-"}</td>
                    <td style={{padding:"10px 14px",textAlign:"center",color:ic>0?T.success:T.fgDim,fontWeight:ic>0?700:400}}>{ic>0?ic:"-"}</td>
                    <td style={{padding:"10px 14px",cursor:"pointer"}} onClick={()=>setViewGrn(g)}><span className="status-chip" style={{padding:"2px 9px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label}</span></td>
                    <td style={{padding:"10px 14px"}}><div style={{display:"flex",gap:4}}>
                      <button onClick={()=>setViewGrn(g)} title="View" style={{padding:"4px 8px",background:T.successBg,border:"none",borderRadius:6,cursor:"pointer",lineHeight:0}}><Eye style={{width:12,height:12,color:T.success}}/></button>
                      <button onClick={()=>printGrn(g)} title="Print GRN" style={{padding:"4px 8px",background:T.primaryBg,border:"none",borderRadius:6,cursor:"pointer",lineHeight:0}}><Printer style={{width:12,height:12,color:T.primary}}/></button>
                      <PushToApprovalButton
                        documentType="grn"
                        documentId={g.id}
                        documentNumber={g.grn_number||`GRN/${g.supplier_name||"Received"}`}
                        documentTitle={g.supplier_name||"Goods Received"}
                        department="Store"
                        amount={Number(g.total_value||0)}
                        currentStatus={g.status}
                        stamped={!!g.stamped}
                        stampedByName={g.stamped_by_name}
                        stampLabel={g.stamp_label}
                        size="sm"
                        onPushed={load}
                      />
                    </div></td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {viewGrn&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",zIndex:50,display:"flex",justifyContent:"flex-end"}} onClick={()=>setViewGrn(null)}>
          <div style={{width:"min(500px,100%)",background:T.card,height:"100%",overflowY:"auto",boxShadow:T.shadowLg}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:T.successBg,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:8}}>
              <Package style={{width:14,height:14,color:T.success}}/>
              <span style={{fontSize:13,fontWeight:800,color:T.fg,flex:1}}>{viewGrn.grn_number}</span>
              <button onClick={()=>printGrn(viewGrn)} style={{display:"flex",alignItems:"center",gap:5,background:T.card,border:`1px solid ${T.border}`,borderRadius:T.r,padding:"5px 10px",cursor:"pointer",color:T.fg,fontSize:11,fontWeight:700}}><Printer style={{width:11,height:11}}/>Print GRN</button>
              <button onClick={()=>setViewGrn(null)} style={{background:T.bg2,border:"none",borderRadius:T.r,padding:"4px 7px",cursor:"pointer",color:T.fgMuted,lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0"}}><DocumentStamp status={viewGrn.status} date={viewGrn.received_date||viewGrn.created_at} size={100} rotate={-10} /></div>
            <div style={{padding:16,display:"flex",flexDirection:"column",gap:10}}>
              {[["PO Reference",viewGrn.po_reference],["Supplier",viewGrn.supplier_name],["Received Date",viewGrn.received_date?new Date(viewGrn.received_date).toLocaleDateString("en-KE"):"-"],["Delivery Note",viewGrn.delivery_note_number||"-"],["Carrier/Driver",viewGrn.carrier_name||"-"],["Status",viewGrn.status],["Created By",viewGrn.created_by_name||"-"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12,color:T.fgDim,fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:T.fg}}>{v||"-"}</span>
                </div>
              ))}
              {viewGrn.remarks&&<div style={{padding:12,background:T.bg,borderRadius:T.rMd,fontSize:12,color:T.fgMuted}}>{viewGrn.remarks}</div>}
              {(viewGrn.goods_received_items||[]).length>0&&(
                <div>
                  <div style={{fontSize:10,fontWeight:800,color:T.fgDim,textTransform:"uppercase",marginBottom:8}}>Received Items ({viewGrn.goods_received_items.length})</div>
                  <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead><tr style={{background:T.success}}>{["Item","UOM","Qty Ord.","Qty Rcvd","Unit Price"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:9,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
                      <tbody>{viewGrn.goods_received_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:T.card}}>
                          <td style={{padding:"7px 10px",fontWeight:600,color:T.fg}}>{it.item_name||it.description||"-"}</td>
                          <td style={{padding:"7px 10px",color:T.fgMuted}}>{it.unit_of_measure||"-"}</td>
                          <td style={{padding:"7px 10px",textAlign:"center",color:T.fgMuted}}>{it.quantity_ordered||0}</td>
                          <td style={{padding:"7px 10px",textAlign:"center",fontWeight:700,color:T.success}}>{it.quantity_received||0}</td>
                          <td style={{padding:"7px 10px",textAlign:"right",color:T.fgMuted}}>KES {Number(it.unit_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
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
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:50,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"20px 16px",overflowY:"auto"}}>
          <div style={{background:T.card,borderRadius:T.rXl,width:"min(760px,100%)",boxShadow:T.shadowLg,marginBottom:20}}>
            <div style={{padding:"14px 18px",background:T.successBg,borderRadius:`${T.rXl}px ${T.rXl}px 0 0`,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center"}}>
              <Package style={{width:16,height:16,color:T.success,marginRight:8}}/>
              <span style={{fontSize:14,fontWeight:800,color:T.fg,flex:1}}>New Goods Received Note</span>
              <button onClick={()=>setShowForm(false)} style={{background:T.bg2,border:"none",borderRadius:T.r,padding:"4px 7px",cursor:"pointer",color:T.fgMuted,lineHeight:0}}><X style={{width:14,height:14}}/></button>
            </div>
            <div style={{padding:18}}>
              <div style={{fontSize:11,fontWeight:800,color:T.success,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,paddingBottom:6,borderBottom:`2px solid ${T.successBg}`}}>Header Information</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Supplier</label>
                  <select value={form.supplier_name||form.supplier_id||"-"} onChange={e=>setForm(p=>({...p,supplier_id:e.target.value,supplier_name:suppliers.find(s=>s.id===e.target.value)?.name||p.supplier_name}))} style={inp}>
                    <option value="">— Select Supplier —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Supplier Name (manual)</label><input value={form.supplier_name} onChange={e=>setForm(p=>({...p,supplier_name:e.target.value}))} placeholder="Or type supplier name..." style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>PO Reference</label>
                  {manualPO ? (
                    <div style={{display:"flex",gap:4}}>
                      <input value={form.po_reference} onChange={e=>setForm(p=>({...p,po_reference:e.target.value}))} placeholder="PO/EL5H/..." style={inp}/>
                      <button type="button" onClick={()=>setManualPO(false)} title="Pick from list" style={{border:`1px solid ${T.border}`,background:T.bg,borderRadius:6,padding:"0 8px",cursor:"pointer",fontSize:10,color:T.fgMuted}}>List</button>
                    </div>
                  ) : (
                    <select value={purchaseOrders.find(p=>p.po_number===form.po_reference)?.id||""} onChange={e=>{ if(e.target.value==="__manual__"){setManualPO(true);return;} applyPO(e.target.value); }} style={inp}>
                      <option value="">— Select PO —</option>
                      {purchaseOrders.map(p=><option key={p.id} value={p.id}>{p.po_number} — {p.supplier_name||"No supplier"}</option>)}
                      <option value="__manual__">Other / type manually…</option>
                    </select>
                  )}</div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Received Date *</label><input type="date" value={form.received_date} onChange={e=>setForm(p=>({...p,received_date:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Delivery Note No.</label><input value={form.delivery_note_number} onChange={e=>setForm(p=>({...p,delivery_note_number:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Carrier / Driver Name</label><input value={form.carrier_name} onChange={e=>setForm(p=>({...p,carrier_name:e.target.value}))} style={inp}/></div>
                <div><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Status</label>
                  <select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={inp}>
                    {Object.entries(STATUS_CFG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select></div>
                <div style={{gridColumn:"span 2"}}><label style={{display:"block",fontSize:10,fontWeight:700,color:T.fgDim,textTransform:"uppercase",marginBottom:4}}>Remarks / Received Condition</label><input value={form.remarks} onChange={e=>setForm(p=>({...p,remarks:e.target.value}))} style={inp}/></div>
              </div>
              <div style={{fontSize:11,fontWeight:800,color:T.success,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,paddingBottom:6,borderBottom:`2px solid ${T.successBg}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span>Received Items</span>
                <button onClick={()=>setGrnItems(p=>[...p,{...EMPTY_ITEM}])} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",background:T.success,color:"#fff",border:"none",borderRadius:T.r,cursor:"pointer",fontSize:11,fontWeight:700}}><Plus style={{width:11,height:11}}/>Add Row</button>
              </div>
              <div style={{overflowX:"auto",marginBottom:14}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:640}}>
                  <thead><tr style={{background:T.success}}>
                    {["#","Item Name *","Description","UOM","Qty Ordered","Qty Received","Unit Price (KES)",""].map((h,i)=>(
                      <th key={i} style={{padding:"7px 8px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:9,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {grnItems.map((it,idx)=>(
                      <tr key={idx} style={{borderBottom:`1px solid ${T.border}`,background:T.card}}>
                        <td style={{padding:"4px 6px",textAlign:"center",color:T.fgDim,fontSize:10,width:24,fontWeight:700}}>{idx+1}</td>
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
                          {grnItems.length>1&&<button onClick={()=>setGrnItems(p=>p.filter((_,i)=>i!==idx))} style={{padding:"3px 5px",background:T.errorBg,border:"none",borderRadius:5,cursor:"pointer",lineHeight:0}}><Trash2 style={{width:11,height:11,color:T.error}}/></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{background:T.successBg,borderTop:`2px solid ${T.success}33`}}>
                    <td colSpan={4} style={{padding:"7px 8px",textAlign:"right",fontSize:11,fontWeight:800,color:T.success}}>TOTALS</td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,color:T.success}}>{grnItems.reduce((s,it)=>s+Number(it.quantity_ordered||0),0)||0}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontWeight:800,color:T.success}}>{grnItems.reduce((s,it)=>s+Number(it.quantity_received||0),0)||0}</td>
                    <td style={{padding:"7px 8px",textAlign:"right",fontWeight:800,color:T.success}}>KES {grnItems.reduce((s,it)=>s+(Number(it.quantity_received||0)*Number(it.unit_price||0)),0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td>
                    <td/>
                  </tr></tfoot>
                </table>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 18px",borderTop:`1px solid ${T.border}`}}>
              <button onClick={()=>setShowForm(false)} style={{padding:"8px 16px",border:`1.5px solid ${T.border}`,background:T.card,borderRadius:T.rMd,cursor:"pointer",fontSize:13,color:T.fgMuted}}>Cancel</button>
              <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 20px",background:T.success,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontSize:13,fontWeight:700,opacity:saving?0.7:1}}>
                {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<CheckCircle style={{width:13,height:13}}/>}
                {saving?"Saving...":"Create GRN"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{spinKeyframes}</style>
    </div>
  );
}
