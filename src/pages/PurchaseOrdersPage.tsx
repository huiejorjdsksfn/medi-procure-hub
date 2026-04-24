import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, ShoppingCart, Send, Trash2, Edit3, Save
} from "lucide-react";
import * as XLSX from "xlsx";
import { notifyProcurement } from "@/lib/notify";
import { executePOAction, type POAction } from "@/lib/procurement/poWorkflow";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printLPO } from "@/lib/printDocument";
import { useSuppliers, useDepartments } from "@/hooks/useDropdownData";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  draft:    {bg:"#f3f4f6",color:"#6b7280",  label:"Draft"},
  pending:  {bg:"#fef3c7",color:"#92400e",  label:"Pending"},
  approved: {bg:"#dcfce7",color:"#15803d",  label:"Approved"},
  sent:     {bg:"#dbeafe",color:"#1d4ed8",  label:"Sent"},
  partial:  {bg:"#e0f2fe",color:"#0369a1",  label:"Partial"},
  received: {bg:"#d1fae5",color:"#065f46",  label:"Received"},
  cancelled:{bg:"#fee2e2",color:"#dc2626",  label:"Cancelled"},
};

const PAYMENT_TERMS = ["Net 30","Net 60","Net 90","On Delivery","Advance Payment","50% Advance"];
const EMPTY_ITEM = { description:"", quantity:1, unit:"pcs", unit_price:0 };

const inp: React.CSSProperties = {
  width:"100%", padding:"8px 12px", border:"1.5px solid #e5e7eb",
  borderRadius:8, fontSize:13, outline:"none", boxSizing:"border-box",
  color:"#111827", background:"#f8fafc",
};
const lbl: React.CSSProperties = {
  display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase",
  letterSpacing:"0.05em", color:"#6b7280", marginBottom:4,
};

function genPONumber() {
  const d = new Date();
  return `PO-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(Math.floor(Math.random()*9000)+1000)}`;
}

export default function PurchaseOrdersPage() {
  const { user, profile, roles } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const { suppliers } = useSuppliers();
  const { departments } = useDepartments();

  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const canCreate  = !roles.includes("warehouse_officer");

  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPO, setViewPO]       = useState<any>(null);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState<Record<string,string>>({});

  // Form state
  const EMPTY_FORM = {
    po_number: genPONumber(),
    supplier_id: "", supplier_name: "",
    delivery_date: "",
    payment_terms: "Net 30",
    department: "",
    notes: "",
    items: [{ ...EMPTY_ITEM }],
    status: "draft",
  };
  const [form, setForm] = useState<any>(EMPTY_FORM);

  const computedTotal = form.items.reduce(
    (s: number, it: any) => s + (Number(it.quantity)||0) * (Number(it.unit_price)||0), 0
  );

  /* - Load - */
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("purchase_orders")
      .select("*,suppliers(name,email,phone)")
      .order("created_at",{ascending:false});
    setOrders(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ load(); },[load]);

  useEffect(()=>{
    const ch=(supabase as any).channel("pos-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"purchase_orders"},()=>load())
      .subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[load]);

  /* - Validation - */
  const validate = () => {
    const e: Record<string,string> = {};
    if (!form.po_number.trim())      e.po_number    = "PO Number is required";
    if (!form.supplier_id && !form.supplier_name.trim())
                                     e.supplier     = "Supplier is required";
    if (!form.delivery_date)         e.delivery_date = "Delivery date is required";
    if (form.delivery_date && new Date(form.delivery_date) < new Date(new Date().toDateString()))
                                     e.delivery_date = "Delivery date must be today or in the future";
    const validItems = form.items.filter((it:any) => it.description.trim());
    if (!validItems.length)          e.items        = "At least one item with a description is required";
    form.items.forEach((it:any, i:number) => {
      if (it.description.trim() && Number(it.quantity) <= 0)
        e[`qty_${i}`] = `Item ${i+1}: quantity must be > 0`;
      if (it.description.trim() && Number(it.unit_price) < 0)
        e[`price_${i}`] = `Item ${i+1}: price cannot be negative`;
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* - Save - */
  const save = async () => {
    if (!validate()) {
      toast({title:"Please fix validation errors",variant:"destructive"});
      return;
    }
    setSaving(true);
    try {
      const supplier = suppliers.find(s => s.id === form.supplier_id);
      const validItems = form.items.filter((it:any) => it.description.trim());
      const payload = {
        po_number:     form.po_number.trim(),
        supplier_id:   form.supplier_id || null,
        supplier_name: supplier?.name || form.supplier_name || "",
        delivery_date: form.delivery_date,
        payment_terms: form.payment_terms,
        department:    form.department,
        notes:         form.notes,
        total_amount:  computedTotal,
        status:        form.status,
        line_items:    validItems,
        created_by:    user?.id,
      };

      let savedId = editing?.id;
      if (editing) {
        const { error } = await (supabase as any).from("purchase_orders")
          .update({...payload, updated_at: new Date().toISOString()})
          .eq("id", editing.id);
        if (error) throw error;
        toast({title:"Purchase Order updated -"});
        logAudit(user?.id,profile?.full_name,"update","purchase_orders",editing.id,{po_number:payload.po_number});
      } else {
        const { data, error } = await (supabase as any).from("purchase_orders")
          .insert(payload).select("id").single();
        if (error) throw error;
        savedId = data?.id;
        toast({title:"Purchase Order created -",description:`PO ${payload.po_number} saved as ${payload.status}`});
        logAudit(user?.id,profile?.full_name,"create","purchase_orders",savedId,{po_number:payload.po_number});
        await notifyProcurement({
          title:"New PO Created",
          message:`${profile?.full_name||"Staff"} created PO ${payload.po_number} - KES ${computedTotal.toLocaleString()}`,
          type:"procurement", module:"PO", actionUrl:"/purchase-orders",
        });
      }
      closeForm();
      load();
    } catch(e:any) {
      toast({title:"Save failed",description:e.message,variant:"destructive"});
    }
    setSaving(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({...EMPTY_FORM, po_number: genPONumber()});
    setErrors({});
    setShowForm(true);
  };
  const openEdit = (po: any) => {
    setEditing(po);
    setForm({
      po_number:    po.po_number || "",
      supplier_id:  po.supplier_id || "",
      supplier_name:po.supplier_name || "",
      delivery_date:po.delivery_date || "",
      payment_terms:po.payment_terms || "Net 30",
      department:   po.department || "",
      notes:        po.notes || "",
      items:        po.line_items?.length ? po.line_items : [{ ...EMPTY_ITEM }],
      status:       po.status || "draft",
    });
    setErrors({});
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setErrors({}); };

  /* - Approve / Cancel - */
  const handlePOAction = async (id: string, action: POAction) => {
    if (action === 'cancel' && !confirm("Cancel this Purchase Order?")) return;
    const result = await executePOAction(id, action, user?.id || '', profile?.full_name || '');
    if (result.success) {
      toast({ title: `PO ${action}${action.endsWith('e') ? 'd' : 'ed'} -` });
    } else {
      toast({ title: "Action failed", description: result.error, variant: "destructive" });
    }
    load();
  };

  const approve = (id: string) => handlePOAction(id, 'approve');
  const cancelPO = (id: string) => handlePOAction(id, 'cancel');

  /* - Print - */
  const handlePrintLPO = (po:any) => {
    printLPO(po, {
      hospitalName:   getSetting("hospital_name","Embu Level 5 Hospital"),
      sysName:        getSetting("system_name","EL5 MediProcure"),
      docFooter:      getSetting("doc_footer","Embu Level 5 Hospital - Embu County Government"),
      currencySymbol: getSetting("currency_symbol","KES"),
      logoUrl:         getSetting("logo_url") || getSetting("system_logo_url") || "",
      hospitalAddress: getSetting("hospital_address","Embu Town, Embu County, Kenya"),
      hospitalPhone:   getSetting("hospital_phone","+254 060 000000"),
      hospitalEmail:   getSetting("hospital_email","info@embu.health.go.ke"),
      printFont:      getSetting("print_font","Times New Roman"),
      printFontSize:  getSetting("print_font_size","11"),
      showStamp:      getSetting("show_stamp","true") === "true",
    });
  };

  /* - Export - */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const header = [[getSetting("hospital_name","Embu Level 5 Hospital")],
      [getSetting("system_name","EL5 MediProcure")+" - Purchase Orders"],
      [`Exported: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows = filtered.map(po=>({
      "PO Number":po.po_number,"Supplier":po.suppliers?.name||po.supplier_name||"",
      "Status":po.status,"Total Amount":po.total_amount||0,
      "Delivery Date":po.delivery_date||"","Payment Terms":po.payment_terms||"",
      "Department":po.department||"","Notes":po.notes||"",
      "Created":po.created_at?new Date(po.created_at).toLocaleDateString("en-KE"):"",
    }));
    const ws = XLSX.utils.aoa_to_sheet([...header,Object.keys(rows[0]||{}),...rows.map(r=>Object.values(r))]);
    ws["!cols"] = Object.keys(rows[0]||{}).map(()=>({wch:18}));
    XLSX.utils.book_append_sheet(wb,ws,"Purchase Orders");
    XLSX.writeFile(wb,`PurchaseOrders_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  };

  /* - Filter - */
  const filtered = orders.filter(po=>{
    if(statusFilter!=="all"&&po.status!==statusFilter) return false;
    if(search){const q=search.toLowerCase();return (po.po_number||"").toLowerCase().includes(q)||(po.suppliers?.name||po.supplier_name||"").toLowerCase().includes(q)||(po.department||"").toLowerCase().includes(q);}
    return true;
  });

  const fmtK = (n:number) => n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;

  const setItem = (i:number, key:string, val:any) =>
    setForm((p:any)=>({...p,items:p.items.map((it:any,idx:number)=>idx===i?{...it,[key]:val}:it)}));
  const addItem = () => setForm((p:any)=>({...p,items:[...p.items,{...EMPTY_ITEM}]}));
  const removeItem = (i:number) => setForm((p:any)=>({...p,items:p.items.filter((_:any,idx:number)=>idx!==i)}));

  const ErrMsg = ({field}:{field:string}) => errors[field]
    ? <div style={{color:"#dc2626",fontSize:10,marginTop:3}}>{errors[field]}</div>
    : null;

  return (
    <div style={{padding:16,display:"flex",flexDirection:"column",background:"#f8fafc",minHeight:"100%",gap:10,fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>

      {/* - KPI TILES - */}
      {(()=>{
        const totalVal = orders.reduce((s,r)=>s+Number(r.total_amount||0),0);
        const recVal   = orders.filter(r=>r.status==="received").reduce((s,r)=>s+Number(r.total_amount||0),0);
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Value",    val:fmtK(totalVal),bg:"#c0392b",path:null},
              {label:"Received Amt.",  val:fmtK(recVal),  bg:"#7d6608",path:null},
              {label:"Balance",        val:fmtK(totalVal-recVal),bg:"#0e6655",path:null},
              {label:"Total Orders",   val:orders.length, bg:"#6c3483",path:null},
              {label:"Pending / Draft",val:orders.filter(r=>["draft","pending"].includes(r.status||"")).length,bg:"#1a252f",path:null},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:18,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* - HEADER - */}
      <div style={{borderRadius:12,background:"linear-gradient(90deg,#92400e,#C45911,#d97706)",boxShadow:"0 4px 16px rgba(196,89,17,0.3)",padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <ShoppingCart style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Purchase Orders</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length} of {orders.length} orders - Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={load} disabled={loading}
            style={{padding:6,borderRadius:6,background:"#e2e8f0",color:"#fff",border:"none",cursor:"pointer"}}>
            <RefreshCw style={{width:14,height:14,animation:loading?"spin 1s linear infinite":"none"}}/>
          </button>
          <button onClick={exportExcel}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:8,background:"rgba(52,211,153,0.9)",color:"#fff",border:"none",cursor:"pointer",fontSize:12,fontWeight:600}}>
            <FileSpreadsheet style={{width:14,height:14}}/>Export
          </button>
          {canCreate&&(
            <button onClick={openCreate}
              style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:8,background:"#fff",color:"#92400e",border:"none",cursor:"pointer",fontSize:12,fontWeight:700}}>
              <Plus style={{width:14,height:14}}/>New PO
            </button>
          )}
        </div>
      </div>

      {/* - FILTERS - */}
      <div style={{display:"flex",flexWrap:"wrap" as const,gap:8,alignItems:"center"}}>
        {["all","draft","pending","approved","sent","partial","received","cancelled"].map(s=>(
          <button key={s} onClick={()=>setStatusFilter(s)}
            style={{padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:600,textTransform:"capitalize",border:"none",cursor:"pointer",background:statusFilter===s?"#C45911":"#f3f4f6",color:statusFilter===s?"#fff":"#6b7280"}}>
            {s==="all"?"All":STATUS_CFG[s]?.label||s}
            {s!=="all"&&<span style={{marginLeft:4,opacity:0.7}}>({orders.filter(o=>o.status===s).length})</span>}
          </button>
        ))}
        <div style={{position:"relative",marginLeft:"auto"}}>
          <Search style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search POs, suppliers-"
            style={{paddingLeft:32,paddingRight:32,paddingTop:6,paddingBottom:6,borderRadius:20,border:"1.5px solid #e5e7eb",fontSize:12,outline:"none"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}><X style={{width:12,height:12,color:"#9ca3af"}}/></button>}
        </div>
      </div>

      {/* - TABLE - */}
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#92400e"}}>
                {["#","PO Number","Supplier","Department","Status","Total","Delivery","Actions"].map(h=>(
                  <th key={h} style={{textAlign:"left",padding:"10px 12px",color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(4).fill(0).map((_,i)=>(
                <tr key={i}><td colSpan={8} style={{padding:"12px 16px"}}><div style={{height:12,background:"#f3f4f6",borderRadius:6,animation:"pulse 1.5s infinite"}}/></td></tr>
              )) : filtered.length===0 ? (
                <tr><td colSpan={8} style={{padding:"40px 16px",textAlign:"center",color:"#9ca3af",fontSize:13}}>
                  {orders.length===0?"No purchase orders yet - create your first one":"No orders match your filter"}
                </td></tr>
              ) : filtered.map((po,i)=>{
                const s = STATUS_CFG[po.status]||{bg:"#f3f4f6",color:"#6b7280",label:po.status};
                return(
                  <tr key={po.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fff7ed"}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#fafafa"}>
                    <td style={{padding:"10px 12px",color:"#9ca3af",fontSize:11}}>{i+1}</td>
                    <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,fontWeight:700,color:"#c2410c"}}>{po.po_number||"-"}</td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1f2937"}}>{po.suppliers?.name||po.supplier_name||"-"}</td>
                    <td style={{padding:"10px 12px",color:"#6b7280",fontSize:11}}>{po.department||"-"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label||po.status}</span>
                    </td>
                    <td style={{padding:"10px 12px",fontWeight:600,color:"#1f2937",whiteSpace:"nowrap"}}>KES {Number(po.total_amount||0).toLocaleString()}</td>
                    <td style={{padding:"10px 12px",color:"#6b7280",fontSize:11,whiteSpace:"nowrap"}}>{po.delivery_date||"-"}</td>
                    <td style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>setViewPO(po)} title="View" style={{padding:5,borderRadius:6,background:"#fff7ed",color:"#ea580c",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12}}/></button>
                        {canCreate&&["draft","pending"].includes(po.status)&&(
                          <button onClick={()=>openEdit(po)} title="Edit" style={{padding:5,borderRadius:6,background:"#eff6ff",color:"#3b82f6",border:"none",cursor:"pointer"}}><Edit3 style={{width:12,height:12}}/></button>
                        )}
                        <button onClick={()=>printLPO(po)} title="Print LPO" style={{padding:5,borderRadius:6,background:"#f3f4f6",color:"#374151",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12}}/></button>
                        {canApprove&&po.status==="pending"&&(
                          <button onClick={()=>approve(po.id)} title="Approve" style={{padding:5,borderRadius:6,background:"#dcfce7",color:"#15803d",border:"none",cursor:"pointer"}}><CheckCircle style={{width:12,height:12}}/></button>
                        )}
                        {canApprove&&["draft","pending"].includes(po.status)&&(
                          <button onClick={()=>cancelPO(po.id)} title="Cancel" style={{padding:5,borderRadius:6,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer"}}><XCircle style={{width:12,height:12}}/></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{padding:"8px 16px",background:"#f8fafc",borderTop:"1px solid #e5e7eb",fontSize:11,color:"#6b7280"}}>
          {filtered.length} orders - Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}
        </div>
      </div>

      {/* -
          CREATE / EDIT MODAL
      - */}
      {showForm&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:40,paddingBottom:20}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)"}} onClick={closeForm}/>
          <div style={{position:"relative",borderRadius:16,boxShadow:"0 24px 72px rgba(0,0,0,0.35)",width:"min(760px,98%)",maxHeight:"calc(100vh-60px)",display:"flex",flexDirection:"column",background:"#f8fafc",minHeight:"100%",overflow:"hidden"}}>

            {/* Modal header */}
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#92400e,#C45911)",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <ShoppingCart style={{width:18,height:18,color:"#fff"}}/>
                <div>
                  <h3 style={{fontSize:14,fontWeight:900,color:"#fff",margin:0}}>{editing?"Edit Purchase Order":"New Purchase Order"}</h3>
                  <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{editing?`Editing ${editing.po_number}`:"Fill in all required fields marked with *"}</p>
                </div>
              </div>
              <button onClick={closeForm} style={{padding:6,borderRadius:7,background:"#e2e8f0",color:"#fff",border:"none",cursor:"pointer",lineHeight:0}}>
                <X style={{width:16,height:16}}/>
              </button>
            </div>

            {/* Form body */}
            <div style={{overflowY:"auto",flex:1,padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

                {/* PO Number */}
                <div>
                  <label style={lbl}>PO Number *</label>
                  <input value={form.po_number} onChange={e=>setForm((p:any)=>({...p,po_number:e.target.value}))} style={{...inp,borderColor:errors.po_number?"#dc2626":"#e5e7eb"}}/>
                  <ErrMsg field="po_number"/>
                </div>

                {/* Status */}
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status} onChange={e=>setForm((p:any)=>({...p,status:e.target.value}))} style={inp}>
                    {Object.entries(STATUS_CFG).map(([v,cfg])=><option key={v} value={v}>{cfg.label}</option>)}
                  </select>
                </div>

                {/* Supplier */}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Supplier *</label>
                  <select value={form.supplier_name||form.supplier_id||"-"}
                    onChange={e=>{
                      const s = suppliers.find(x=>x.id===e.target.value);
                      setForm((p:any)=>({...p,supplier_id:e.target.value,supplier_name:s?.name||""}));
                    }}
                    style={{...inp,borderColor:errors.supplier?"#dc2626":"#e5e7eb"}}>
                    <option value="">- Select a supplier -</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name} {s.category?`(${s.category})`:""}</option>)}
                  </select>
                  {!form.supplier_id&&(
                    <div style={{marginTop:6}}>
                      <input value={form.supplier_name} onChange={e=>setForm((p:any)=>({...p,supplier_name:e.target.value}))}
                        placeholder="Or type supplier name manually-"
                        style={{...inp,fontSize:11,padding:"6px 10px",borderColor:errors.supplier?"#dc2626":"#e5e7eb"}}/>
                    </div>
                  )}
                  <ErrMsg field="supplier"/>
                </div>

                {/* Delivery Date */}
                <div>
                  <label style={lbl}>Delivery Date *</label>
                  <input type="date" value={form.delivery_date}
                    onChange={e=>setForm((p:any)=>({...p,delivery_date:e.target.value}))}
                    min={new Date().toISOString().slice(0,10)}
                    style={{...inp,borderColor:errors.delivery_date?"#dc2626":"#e5e7eb"}}/>
                  <ErrMsg field="delivery_date"/>
                </div>

                {/* Payment Terms */}
                <div>
                  <label style={lbl}>Payment Terms</label>
                  <select value={form.payment_terms} onChange={e=>setForm((p:any)=>({...p,payment_terms:e.target.value}))} style={inp}>
                    {PAYMENT_TERMS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label style={lbl}>Requesting Department</label>
                  <select value={form.department} onChange={e=>setForm((p:any)=>({...p,department:e.target.value}))} style={inp}>
                    <option value="">- Select department -</option>
                    {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={lbl}>Notes / Special Instructions</label>
                  <textarea value={form.notes} onChange={e=>setForm((p:any)=>({...p,notes:e.target.value}))} rows={2}
                    placeholder="Delivery instructions, quality requirements-"
                    style={{...inp,resize:"none"}}/>
                </div>
              </div>

              {/* - LINE ITEMS - */}
              <div style={{marginTop:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <label style={{...lbl,marginBottom:0}}>Line Items *</label>
                  <button onClick={addItem}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:6,background:"#fff7ed",color:"#c2410c",border:"1px solid #fed7aa",cursor:"pointer",fontSize:11,fontWeight:600}}>
                    <Plus style={{width:12,height:12}}/>Add Item
                  </button>
                </div>
                {errors.items&&<div style={{color:"#dc2626",fontSize:10,marginBottom:6}}>{errors.items}</div>}
                <div style={{border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
                  <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{background:"#92400e"}}>
                        {["#","Description *","Qty","Unit","Unit Price (KES)","Total",""].map(h=>(
                          <th key={h} style={{padding:"7px 10px",textAlign:"left",color:"rgba(255,255,255,0.85)",fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                          <td style={{padding:"6px 10px",color:"#9ca3af",width:28}}>{i+1}</td>
                          <td style={{padding:"4px 6px"}}>
                            <input value={it.description} onChange={e=>setItem(i,"description",e.target.value)}
                              placeholder="Item description-"
                              style={{width:"100%",border:errors[`qty_${i}`]?"1px solid #dc2626":"1px solid #e5e7eb",borderRadius:4,padding:"4px 8px",fontSize:11,outline:"none",minWidth:140,color:"#111827"}}/>
                          </td>
                          <td style={{padding:"4px 6px",width:70}}>
                            <input type="number" min="0.01" step="0.01" value={it.quantity}
                              onChange={e=>setItem(i,"quantity",e.target.value)}
                              style={{width:"100%",border:errors[`qty_${i}`]?"1px solid #dc2626":"1px solid #e5e7eb",borderRadius:4,padding:"4px 6px",fontSize:11,outline:"none",textAlign:"right",color:"#111827"}}/>
                            {errors[`qty_${i}`]&&<div style={{color:"#dc2626",fontSize:9}}>{errors[`qty_${i}`]}</div>}
                          </td>
                          <td style={{padding:"4px 6px",width:70}}>
                            <select value={it.unit} onChange={e=>setItem(i,"unit",e.target.value)}
                              style={{width:"100%",border:"1px solid #e5e7eb",borderRadius:4,padding:"4px 4px",fontSize:11,outline:"none",color:"#111827",background:"#fff"}}>
                              {["pcs","kg","litres","boxes","cartons","units","rolls","pairs","sets","months"].map(u=><option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"4px 6px",width:110}}>
                            <input type="number" min="0" step="0.01" value={it.unit_price}
                              onChange={e=>setItem(i,"unit_price",e.target.value)}
                              style={{width:"100%",border:errors[`price_${i}`]?"1px solid #dc2626":"1px solid #e5e7eb",borderRadius:4,padding:"4px 6px",fontSize:11,outline:"none",textAlign:"right",color:"#111827"}}/>
                          </td>
                          <td style={{padding:"6px 10px",fontWeight:700,color:"#92400e",whiteSpace:"nowrap",width:90}}>
                            KES {((Number(it.quantity)||0)*(Number(it.unit_price)||0)).toLocaleString()}
                          </td>
                          <td style={{padding:"4px 6px",width:32}}>
                            {form.items.length>1&&(
                              <button onClick={()=>removeItem(i)} style={{padding:4,borderRadius:4,background:"#fee2e2",color:"#dc2626",border:"none",cursor:"pointer",lineHeight:0}}>
                                <Trash2 style={{width:11,height:11}}/>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{background:"#fff7ed"}}>
                        <td colSpan={5} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#92400e",fontSize:12}}>TOTAL</td>
                        <td style={{padding:"8px 10px",fontWeight:900,color:"#92400e",fontSize:13,whiteSpace:"nowrap"}}>KES {computedTotal.toLocaleString()}</td>
                        <td/>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{padding:"12px 20px",borderTop:"1px solid #e5e7eb",display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexShrink:0,background:"#fafafa"}}>
              <div style={{fontSize:11,color:"#6b7280"}}>
                Total: <strong style={{color:"#92400e",fontSize:14}}>KES {computedTotal.toLocaleString()}</strong>
                {" "}- {form.items.filter((it:any)=>it.description.trim()).length} item(s)
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={closeForm} style={{padding:"8px 16px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontSize:13,color:"#374151"}}>
                  Cancel
                </button>
                <button onClick={()=>{setForm((p:any)=>({...p,status:"draft"}));save();}} disabled={saving}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:8,color:"#92400e",border:"1.5px solid #C45911",background:"#fff7ed",cursor:"pointer",fontSize:12,fontWeight:600,opacity:saving?0.7:1}}>
                  <Save style={{width:13,height:13}}/>Save Draft
                </button>
                <button onClick={()=>{setForm((p:any)=>({...p,status:"pending"}));save();}} disabled={saving}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",borderRadius:8,color:"#fff",border:"none",background:"linear-gradient(90deg,#92400e,#C45911)",cursor:"pointer",fontSize:12,fontWeight:700,opacity:saving?0.7:1}}>
                  {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Send style={{width:13,height:13}}/>}
                  {saving?"Saving-":"Submit for Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -
          VIEW MODAL
      - */}
      {viewPO&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)"}} onClick={()=>setViewPO(null)}/>
          <div style={{position:"relative",borderRadius:16,boxShadow:"0 24px 72px rgba(0,0,0,0.35)",width:"min(620px,98%)",maxHeight:"90vh",display:"flex",flexDirection:"column",background:"#f8fafc",minHeight:"100%",overflow:"hidden"}}>
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#92400e,#C45911)"}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>{viewPO.po_number}</h3>
                <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{viewPO.suppliers?.name||viewPO.supplier_name||"-"}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                {canCreate&&["draft","pending"].includes(viewPO.status)&&(
                  <button onClick={()=>{setViewPO(null);openEdit(viewPO);}} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,color:"#fff",fontSize:11,border:"1px solid rgba(255,255,255,0.3)",cursor:"pointer",background:"#e2e8f0"}}>
                    <Edit3 style={{width:12,height:12}}/>Edit
                  </button>
                )}
                <button onClick={()=>printLPO(viewPO)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:7,color:"#fff",fontSize:11,border:"1px solid rgba(255,255,255,0.3)",cursor:"pointer",background:"#e2e8f0"}}>
                  <Printer style={{width:12,height:12}}/>Print LPO
                </button>
                <button onClick={()=>setViewPO(null)} style={{padding:6,borderRadius:7,background:"#e2e8f0",color:"#fff",border:"none",cursor:"pointer",lineHeight:0}}>
                  <X style={{width:16,height:16}}/>
                </button>
              </div>
            </div>
            <div style={{overflowY:"auto",padding:20,flex:1}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                {[
                  {l:"Supplier",v:viewPO.suppliers?.name||viewPO.supplier_name},
                  {l:"Status",v:(STATUS_CFG[viewPO.status]?.label||viewPO.status)},
                  {l:"Total",v:`KES ${Number(viewPO.total_amount||0).toLocaleString()}`},
                  {l:"Delivery Date",v:viewPO.delivery_date},
                  {l:"Payment Terms",v:viewPO.payment_terms},
                  {l:"Department",v:viewPO.department||"-"},
                  {l:"Date Created",v:viewPO.created_at?new Date(viewPO.created_at).toLocaleDateString("en-KE"):"-"},
                  {l:"Supplier Phone",v:viewPO.suppliers?.phone||"-"},
                ].map(r=>(
                  <div key={r.l}>
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#9ca3af"}}>{r.l}</div>
                    <div style={{fontSize:13,color:"#1f2937",fontWeight:500,marginTop:2}}>{r.v||"-"}</div>
                  </div>
                ))}
              </div>

              {/* Line items */}
              {viewPO.line_items?.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:"#9ca3af",marginBottom:8}}>Line Items</div>
                  <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",border:"1px solid #e5e7eb",borderRadius:8,overflow:"hidden"}}>
                    <thead>
                      <tr style={{background:"#92400e"}}>
                        {["Description","Qty","Unit","Unit Price","Total"].map(h=>(
                          <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:9}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewPO.line_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                          <td style={{padding:"5px 10px"}}>{it.description}</td>
                          <td style={{padding:"5px 10px",textAlign:"right"}}>{it.quantity}</td>
                          <td style={{padding:"5px 10px",color:"#6b7280"}}>{it.unit}</td>
                          <td style={{padding:"5px 10px",textAlign:"right"}}>KES {Number(it.unit_price||0).toLocaleString()}</td>
                          <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,color:"#92400e"}}>KES {((Number(it.quantity)||0)*(Number(it.unit_price)||0)).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr style={{background:"#fff7ed"}}>
                        <td colSpan={4} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#92400e"}}>TOTAL</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:900,color:"#92400e"}}>KES {Number(viewPO.total_amount||0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {viewPO.notes&&(
                <div style={{padding:12,borderRadius:10,background:"#f8fafc",border:"1px solid #e5e7eb"}}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:"#9ca3af",margin:"0 0 4px"}}>Notes</p>
                  <p style={{fontSize:13,color:"#374151",margin:0}}>{viewPO.notes}</p>
                </div>
              )}

              {canApprove&&viewPO.status==="pending"&&(
                <button onClick={()=>{approve(viewPO.id);setViewPO(null);}}
                  style={{width:"100%",marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 0",borderRadius:10,color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer",background:"#15803d"}}>
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
