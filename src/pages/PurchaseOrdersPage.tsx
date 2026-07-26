/**
 * ProcurBosse - Purchase Orders v4.0 (2026 ERP redesign)
 * Same data / validation / workflow logic — visual layer via shared erpKit
 * on the central T theme.
 */
import { DocumentStamp } from "@/components/DocumentStamp";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ERPCache } from "@/lib/erp-cache";
import { ValidationEngine } from "@/engines/validation/ValidationEngine";
import { WorkflowEngine } from "@/engines/workflow/WorkflowEngine";
import { pageCache } from "@/lib/pageCache";
import { PrintEngine } from "@/engines/print/PrintEngine";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "@/hooks/use-toast";
import PushToApprovalButton from "@/components/PushToApprovalButton";
import { logAudit } from "@/lib/audit";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, ShoppingCart, Send, Trash2, Edit3, Save
} from "lucide-react";
import * as XLSX from "@e965/xlsx";
import { notifyProcurement } from "@/lib/notify";
import { executePOAction, type POAction } from "@/lib/procurement/poWorkflow";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printLPO } from "@/lib/printDocument";
import { useSuppliers, useDepartments } from "@/hooks/useDropdownData";
import { useConflictResolver } from "@/hooks/useConflictResolver";
import { ConflictResolutionBanner } from "@/components/ConflictResolutionBanner";
import DocumentAnalyzerButton from "@/components/DocumentAnalyzerButton";
import { genDocNumber } from "@/lib/docNumber";
import { T } from "@/lib/theme";
import { PageHeader, SearchBox, BtnPrimary, BtnGhost, KpiBand, Card,
  EmptyState, spinKeyframes, font } from "@/lib/erpKit";

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  draft:    {bg:T.bg2,      color:T.fgMuted,  label:"Draft"},
  pending:  {bg:T.warningBg,color:T.warning,  label:"Pending"},
  approved: {bg:T.successBg,color:T.success,  label:"Approved"},
  sent:     {bg:T.primaryBg,color:T.primary,  label:"Sent"},
  partial:  {bg:T.primaryBg,color:T.primary,  label:"Partial"},
  received: {bg:T.successBg,color:T.success,  label:"Received"},
  cancelled:{bg:T.errorBg,  color:T.error,    label:"Cancelled"},
};

const PAYMENT_TERMS = ["Net 30","Net 60","Net 90","On Delivery","Advance Payment","50% Advance"];
const EMPTY_ITEM = { description:"", quantity:1, unit:"pcs", unit_price:0 };

const inp: React.CSSProperties = {
  width:"100%", padding:"8px 12px", border:`1.5px solid ${T.border}`,
  borderRadius:T.rMd, fontSize:13, outline:"none", boxSizing:"border-box",
  color:T.fg, background:T.bg, fontFamily:font,
};
const lbl: React.CSSProperties = {
  display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase",
  letterSpacing:"0.05em", color:T.fgDim, marginBottom:4,
};

function genPONumber() {
  return genDocNumber("PO");
}

export default function PurchaseOrdersPage() {
  const { user, profile, roles } = useAuth();
  const isMobile = useIsMobile();
  const { get: getSetting } = useSystemSettings();
  const { suppliers, hasMore: suppliersHasMore, loadMore: loadMoreSuppliers } = useSuppliers();
  const { departments, hasMore: departmentsHasMore, loadMore: loadMoreDepartments } = useDepartments();

  const canApprove = roles.includes("admin") || roles.includes("procurement_manager");
  const canCreate  = !roles.includes("warehouse_officer");

  const [orders, setOrders]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewPO, setViewPO]       = useState<any>(null);
  const [searchParams, setSearchParams] = useSearchParams();
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

  const conflictResolver = useConflictResolver({
    table: "purchase_orders",
    id: showForm && editing?.id ? editing.id : null,
    local: form,
    setLocal: setForm,
    onResolved: choice => toast({ title: choice === "remote" ? "Remote purchase order applied" : choice === "merge" ? "Purchase order changes merged" : "Keeping your purchase order edits" }),
  });

  const updateFormField = useCallback((key: string, value: any) => {
    conflictResolver.markDirty(key);
    setForm((p: any) => ({ ...p, [key]: value }));
  }, [conflictResolver]);

  const computedTotal = form.items.reduce(
    (s: number, it: any) => s + (Number(it.quantity)||0) * (Number(it.unit_price)||0), 0
  );

  /* - Load - */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data,error } = await (supabase as any).from("purchase_orders")
        .select("*,suppliers(name,email,phone)")
        .order("created_at",{ascending:false});
      if(error) throw error;
      const rows=data||[]; setOrders(rows); pageCache.set("purchase_orders",rows);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("purchase_orders");
      if(cached) setOrders(cached);
      console.error("[PurchaseOrders]",e);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  // Deep-link: auto-open record from GlobalSearchBar (?focus=<id>)
  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId && orders.length > 0) {
      const match = orders.find(o => o.id === focusId);
      if (match) {
        setViewPO(match);
        searchParams.delete("focus");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [orders, searchParams, setSearchParams]);

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
  const save = async (statusOverride?: string) => {
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
        status:        statusOverride || form.status,
        line_items:    validItems,
        created_by:    user?.id,
      };

      let savedId = editing?.id;
      if (editing) {
        const { error } = await (supabase as any).from("purchase_orders")
          .update({...payload, updated_at: new Date().toISOString()})
          .eq("id", editing.id);
        if (error) throw error;
        conflictResolver.clearDirty();
        conflictResolver.setBaseline({ ...form, ...payload });
        toast({title:"Purchase Order updated"});
        logAudit(user?.id,profile?.full_name,"update","purchase_orders",editing.id,{po_number:payload.po_number});
      } else {
        const { data, error } = await (supabase as any).from("purchase_orders")
          .insert(payload).select("id").single();
        if (error) throw error;
        savedId = data?.id;
        toast({title:"Purchase Order created",description:`PO ${payload.po_number} saved as ${payload.status}`});
        conflictResolver.clearDirty();
        conflictResolver.setBaseline({ ...form, ...payload, id: savedId });
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
    conflictResolver.clearDirty();
    setErrors({});
    setShowForm(true);
  };
  const openEdit = (po: any) => {
    setEditing(po);
    const nextForm = {
      po_number:    po.po_number || "",
      supplier_id:  po.supplier_id || "",
      supplier_name:po.supplier_name || "",
      delivery_date:po.delivery_date || "",
      payment_terms:po.payment_terms || "Net 30",
      department:   po.department || "",
      notes:        po.notes || "",
      items:        po.line_items?.length ? po.line_items : [{ ...EMPTY_ITEM }],
      status:       po.status || "draft",
    };
    setForm(nextForm);
    conflictResolver.clearDirty();
    conflictResolver.setBaseline(nextForm);
    setErrors({});
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setErrors({}); conflictResolver.clearDirty(); };

  /* - Approve / Cancel - */
  const handlePOAction = async (id: string, action: POAction) => {
    if (action === 'cancel' && !confirm("Cancel this Purchase Order?")) return;
    const result = await executePOAction(id, action, user?.id || '', profile?.full_name || '');
    if (result.success) {
      toast({ title: `PO ${action}${action.endsWith('e') ? 'd' : 'ed'}` });
    } else {
      toast({ title: "Action failed", description: result.error, variant: "destructive" });
    }
    load();
  };

  const approve = (id: string) => handlePOAction(id, 'approve');
  const cancelPO = (id: string) => handlePOAction(id, 'cancel');

  /* - Print - */
  const handlePrintLPO = (po:any) => {
    (printLPO as any)(po, [], null, {
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

  const setItem = (i:number, key:string, val:any) => {
    conflictResolver.markDirty("items");
    setForm((p:any)=>({...p,items:p.items.map((it:any,idx:number)=>idx===i?{...it,[key]:val}:it)}));
  };
  const addItem = () => { conflictResolver.markDirty("items"); setForm((p:any)=>({...p,items:[...p.items,{...EMPTY_ITEM}]})); };
  const removeItem = (i:number) => { conflictResolver.markDirty("items"); setForm((p:any)=>({...p,items:p.items.filter((_:any,idx:number)=>idx!==i)})); };

  const ErrMsg = ({field}:{field:string}) => errors[field]
    ? <div style={{color:T.error,fontSize:10,marginTop:3}}>{errors[field]}</div>
    : null;

  const totalVal = orders.reduce((s,r)=>s+Number(r.total_amount||0),0);
  const recVal   = orders.filter(r=>r.status==="received").reduce((s,r)=>s+Number(r.total_amount||0),0);

  const modalOverlay: React.CSSProperties = {position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:40,paddingBottom:20};

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:font}}>

      <PageHeader icon={ShoppingCart} title="Purchase Orders" subtitle={`${filtered.length} of ${orders.length} orders · Total: KES ${filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}`}>
        <BtnGhost onClick={load} icon={RefreshCw} loading={loading}>Refresh</BtnGhost>
        <BtnGhost onClick={exportExcel} icon={FileSpreadsheet}>Export</BtnGhost>
        {canCreate&&<BtnPrimary onClick={openCreate} icon={Plus}>New PO</BtnPrimary>}
      </PageHeader>

      <div style={{padding:"20px 20px 32px"}}>

        {/* - KPI BAND - */}
        <KpiBand loading={loading} items={[
          {label:"Total Value",     val:fmtK(totalVal),                                                          color:"#a4262c", icon:ShoppingCart},
          {label:"Received Amt.",   val:fmtK(recVal),                                                            color:T.warning, icon:CheckCircle},
          {label:"Balance",         val:fmtK(totalVal-recVal),                                                   color:T.success, icon:Send},
          {label:"Total Orders",    val:orders.length,                                                           color:"#6c3483", icon:FileSpreadsheet},
          {label:"Pending / Draft", val:orders.filter(r=>["draft","pending"].includes(r.status||"")).length,     color:T.primary, icon:Edit3},
        ]}/>

        {/* - FILTERS - */}
        <div style={{display:"flex",flexWrap:"wrap" as const,gap:8,alignItems:"center",marginBottom:14}}>
          {["all","draft","pending","approved","sent","partial","received","cancelled"].map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,textTransform:"capitalize",border:"none",cursor:"pointer",background:statusFilter===s?T.primary:T.bg2,color:statusFilter===s?"#fff":T.fgMuted,fontFamily:font}}>
              {s==="all"?"All":STATUS_CFG[s]?.label||s}
              {s!=="all"&&<span style={{marginLeft:4,opacity:0.7}}>({orders.filter(o=>o.status===s).length})</span>}
            </button>
          ))}
          <div style={{marginLeft:"auto"}}>
            <SearchBox value={search} onChange={setSearch} placeholder="Search POs, suppliers…" width={220}/>
          </div>
        </div>

        {/* - TABLE - */}
        <Card style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch" as any}}>
            <table data-mobile-card="true" style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                  {["#","PO Number","Supplier","Department","Status","Total","Delivery","Actions"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"10px 12px",color:T.fgDim,fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(4).fill(0).map((_,i)=>(
                  <tr key={i}><td colSpan={8} style={{padding:"12px 16px"}}><div style={{height:12,background:T.bg2,borderRadius:6,animation:"pulse 1.5s infinite"}}/></td></tr>
                )) : filtered.length===0 ? (
                  <tr><td colSpan={8} style={{padding:"40px 16px",textAlign:"center",color:T.fgDim,fontSize:13}}>
                    {orders.length===0?"No purchase orders yet — create your first one":"No orders match your filter"}
                  </td></tr>
                ) : filtered.map((po,i)=>{
                  const s = STATUS_CFG[po.status]||{bg:T.bg2,color:T.fgMuted,label:po.status};
                  return(
                    <tr key={po.id} style={{borderBottom:`1px solid ${T.border}`,background:T.card}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                      <td style={{padding:"10px 12px",color:T.fgDim,fontSize:11}}>{i+1}</td>
                      <td style={{padding:"10px 12px",fontFamily:"monospace",fontSize:12,fontWeight:700,color:T.primary}}>{po.po_number||"-"}</td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:T.fg}}>{po.suppliers?.name||po.supplier_name||"-"}</td>
                      <td style={{padding:"10px 12px",color:T.fgMuted,fontSize:11}}>{po.department||"-"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <span className="status-chip" style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,background:s.bg,color:s.color}}>{s.label||po.status}</span>
                      </td>
                      <td style={{padding:"10px 12px",fontWeight:600,color:T.fg,whiteSpace:"nowrap"}}>KES {Number(po.total_amount||0).toLocaleString()}</td>
                      <td style={{padding:"10px 12px",color:T.fgMuted,fontSize:11,whiteSpace:"nowrap"}}>{po.delivery_date||"-"}</td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:isMobile?6:4,flexWrap:isMobile?"wrap":"nowrap"}}>
                          <button onClick={()=>setViewPO(po)} title="View" style={{padding:isMobile?7:5,borderRadius:6,background:T.primaryBg,color:T.primary,border:"none",cursor:"pointer"}}><Eye style={{width:isMobile?14:12,height:isMobile?14:12}}/></button>
                          {canCreate&&["draft","pending"].includes(po.status)&&(
                            <button onClick={()=>openEdit(po)} title="Edit" style={{padding:isMobile?7:5,borderRadius:6,background:T.primaryBg,color:T.primary,border:"none",cursor:"pointer"}}><Edit3 style={{width:isMobile?14:12,height:isMobile?14:12}}/></button>
                          )}
                          <button onClick={()=>(printLPO as any)(po, [], null)} title="Print LPO" style={{padding:isMobile?7:5,borderRadius:6,background:T.bg2,color:T.fgMuted,border:"none",cursor:"pointer"}}><Printer style={{width:isMobile?14:12,height:isMobile?14:12}}/></button>
                          {canApprove&&po.status==="pending"&&(
                            <button onClick={()=>approve(po.id)} title="Approve" style={{padding:isMobile?7:5,borderRadius:6,background:T.successBg,color:T.success,border:"none",cursor:"pointer"}}><CheckCircle style={{width:isMobile?14:12,height:isMobile?14:12}}/></button>
                          )}
                          {canApprove&&["draft","pending"].includes(po.status)&&(
                            <button onClick={()=>cancelPO(po.id)} title="Cancel" style={{padding:isMobile?7:5,borderRadius:6,background:T.errorBg,color:T.error,border:"none",cursor:"pointer"}}><XCircle style={{width:isMobile?14:12,height:isMobile?14:12}}/></button>
                          )}
                        <PushToApprovalButton
                          documentType="purchase_order"
                          documentId={po.id}
                          documentNumber={po.po_number||`PO/${po.supplier_name||"Supplier"}`}
                          documentTitle={po.suppliers?.name||po.supplier_name||"Purchase Order"}
                          department={po.department}
                          amount={Number(po.total_amount||0)}
                          currentStatus={po.status}
                          stamped={!!po.stamped}
                          stampedByName={po.stamped_by_name}
                          stampLabel={po.stamp_label}
                          size="sm"
                          onPushed={load}
                        />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{padding:"8px 16px",background:T.bg,borderTop:`1px solid ${T.border}`,fontSize:11,color:T.fgMuted}}>
            {filtered.length} orders · Total: KES {filtered.reduce((s,p)=>s+Number(p.total_amount||0),0).toLocaleString()}
          </div>
        </Card>
      </div>

      {/* - CREATE / EDIT MODAL - */}
      {showForm&&(
        <div style={modalOverlay}>
          <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)"}} onClick={closeForm}/>
          <div style={{position:"relative",borderRadius:T.rXl,boxShadow:T.shadowLg,width:"min(760px,98%)",maxHeight:"calc(100vh - 60px)",display:"flex",flexDirection:"column",background:T.card,minHeight:"100%",overflow:"hidden"}}>

            {/* Modal header */}
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:T.primaryBg,borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <ShoppingCart style={{width:18,height:18,color:T.primary}}/>
                <div>
                  <h3 style={{fontSize:14,fontWeight:900,color:T.fg,margin:0}}>{editing?"Edit Purchase Order":"New Purchase Order"}</h3>
                  <p style={{fontSize:10,color:T.fgMuted,margin:0}}>{editing?`Editing ${editing.po_number}`:"Fill in all required fields marked with *"}</p>
                </div>
              </div>
              <button onClick={closeForm} style={{padding:6,borderRadius:T.rMd,background:T.bg2,color:T.fgMuted,border:"none",cursor:"pointer",lineHeight:0}}>
                <X style={{width:16,height:16}}/>
              </button>
            </div>

            <ConflictResolutionBanner fields={conflictResolver.conflict} onResolve={conflictResolver.resolve} remoteLabel="purchase order" />

            {/* Form body */}
            <div style={{overflowY:"auto",flex:1,padding:20}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {!editing && (
                  <div style={{gridColumn:"1/-1",marginBottom:2,paddingBottom:12,borderBottom:`1px dashed ${T.border}`}}>
                    <DocumentAnalyzerButton target="purchase_order" onApply={(f)=>{
                      const matchedSupplier = f.supplier_name ? suppliers.find(s=>s.name.toLowerCase().includes(String(f.supplier_name).toLowerCase()) || String(f.supplier_name).toLowerCase().includes(s.name.toLowerCase())) : null;
                      const aiItems = Array.isArray(f.items) && f.items.length
                        ? f.items.map((it:any)=>({ description: it.name||"", quantity: Number(it.quantity)||1, unit: it.unit||"pcs", unit_price: Number(it.unit_price)||0 }))
                        : null;
                      setForm((p:any)=>({
                        ...p,
                        supplier_id: matchedSupplier ? matchedSupplier.id : p.supplier_id,
                        supplier_name: matchedSupplier ? matchedSupplier.name : (f.supplier_name ?? p.supplier_name),
                        delivery_date: f.delivery_date ?? p.delivery_date,
                        items: aiItems || p.items,
                        notes: [p.notes, f.po_number ? `AI-detected source PO/ref #: ${f.po_number}` : null, f.total_amount ? `AI-detected total: ${f.total_amount}` : null].filter(Boolean).join(" · "),
                      }));
                    }} />
                  </div>
                )}

                {/* PO Number — auto-generated, not user-editable */}
                <div>
                  <label style={lbl}>PO Number <span style={{fontWeight:400,color:T.fgDim}}>(auto-generated)</span></label>
                  <input value={form.po_number} readOnly style={{...inp,background:T.bg2,color:T.fgMuted,cursor:"not-allowed"}}/>
                  <ErrMsg field="po_number"/>
                </div>

                {/* Status */}
                <div>
                  <label style={lbl}>Status</label>
                  <select value={form.status} onChange={e=>updateFormField("status", e.target.value)} style={inp}>
                    {Object.entries(STATUS_CFG).map(([v,cfg])=><option key={v} value={v}>{cfg.label}</option>)}
                  </select>
                </div>

                {/* Supplier */}
                <div style={{gridColumn:"1/-1"}}>
                  <label style={lbl}>Supplier *</label>
                  <select value={form.supplier_name||form.supplier_id||"-"}
                    onChange={async e=>{
                      if (e.target.value === "__load_more_suppliers__") { await loadMoreSuppliers(); return; }
                      const s = suppliers.find(x=>x.id===e.target.value);
                      conflictResolver.markDirty("supplier_id");
                      conflictResolver.markDirty("supplier_name");
                      setForm((p:any)=>({...p,supplier_id:e.target.value,supplier_name:s?.name||""}));
                    }}
                    style={{...inp,borderColor:errors.supplier?T.error:T.border}}>
                    <option value="">— Select a supplier —</option>
                    {suppliers.map(s=><option key={s.id} value={s.id}>{s.name} {s.category?`(${s.category})`:""}</option>)}
                    {suppliersHasMore&&<option value="__load_more_suppliers__">Load more suppliers…</option>}
                  </select>
                  {!form.supplier_id&&(
                    <div style={{marginTop:6}}>
                      <input value={form.supplier_name} onChange={e=>updateFormField("supplier_name", e.target.value)}
                        placeholder="Or type supplier name manually…"
                        style={{...inp,fontSize:11,padding:"6px 10px",borderColor:errors.supplier?T.error:T.border}}/>
                    </div>
                  )}
                  <ErrMsg field="supplier"/>
                </div>

                {/* Delivery Date */}
                <div>
                  <label style={lbl}>Delivery Date *</label>
                  <input type="date" value={form.delivery_date}
                    onChange={e=>updateFormField("delivery_date", e.target.value)}
                    min={new Date().toISOString().slice(0,10)}
                    style={{...inp,borderColor:errors.delivery_date?T.error:T.border}}/>
                  <ErrMsg field="delivery_date"/>
                </div>

                {/* Payment Terms */}
                <div>
                  <label style={lbl}>Payment Terms</label>
                  <select value={form.payment_terms} onChange={e=>updateFormField("payment_terms", e.target.value)} style={inp}>
                    {PAYMENT_TERMS.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label style={lbl}>Requesting Department</label>
                  <select value={form.department} onChange={async e=>{ if (e.target.value === "__load_more_departments__") { await loadMoreDepartments(); return; } updateFormField("department", e.target.value); }} style={inp}>
                    <option value="">— Select department —</option>
                    {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
                    {departmentsHasMore&&<option value="__load_more_departments__">Load more departments…</option>}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label style={lbl}>Notes / Special Instructions</label>
                  <textarea value={form.notes} onChange={e=>updateFormField("notes", e.target.value)} rows={2}
                    placeholder="Delivery instructions, quality requirements…"
                    style={{...inp,resize:"none"}}/>
                </div>
              </div>

              {/* - LINE ITEMS - */}
              <div style={{marginTop:20}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <label style={{...lbl,marginBottom:0}}>Line Items *</label>
                  <button onClick={addItem}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:T.r,background:T.primaryBg,color:T.primary,border:`1px solid ${T.primary}33`,cursor:"pointer",fontSize:11,fontWeight:600}}>
                    <Plus style={{width:12,height:12}}/>Add Item
                  </button>
                </div>
                {errors.items&&<div style={{color:T.error,fontSize:10,marginBottom:6}}>{errors.items}</div>}
                <div style={{border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
                  <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
                    <thead>
                      <tr style={{background:T.bg}}>
                        {["#","Description *","Qty","Unit","Unit Price (KES)","Total",""].map(h=>(
                          <th key={h} style={{padding:"7px 10px",textAlign:"left",color:T.fgDim,fontWeight:700,fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em",whiteSpace:"nowrap"}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:T.card}}>
                          <td style={{padding:"6px 10px",color:T.fgDim,width:28}}>{i+1}</td>
                          <td style={{padding:"4px 6px"}}>
                            <input value={it.description} onChange={e=>setItem(i,"description",e.target.value)}
                              placeholder="Item description…"
                              style={{width:"100%",border:errors[`qty_${i}`]?`1px solid ${T.error}`:`1px solid ${T.border}`,borderRadius:4,padding:"4px 8px",fontSize:11,outline:"none",minWidth:140,color:T.fg,background:T.bg}}/>
                          </td>
                          <td style={{padding:"4px 6px",width:70}}>
                            <input type="number" min="0.01" step="0.01" value={it.quantity}
                              onChange={e=>setItem(i,"quantity",e.target.value)}
                              style={{width:"100%",border:errors[`qty_${i}`]?`1px solid ${T.error}`:`1px solid ${T.border}`,borderRadius:4,padding:"4px 6px",fontSize:11,outline:"none",textAlign:"right",color:T.fg,background:T.bg}}/>
                            {errors[`qty_${i}`]&&<div style={{color:T.error,fontSize:9}}>{errors[`qty_${i}`]}</div>}
                          </td>
                          <td style={{padding:"4px 6px",width:70}}>
                            <select value={it.unit} onChange={e=>setItem(i,"unit",e.target.value)}
                              style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:4,padding:"4px 4px",fontSize:11,outline:"none",color:T.fg,background:T.bg}}>
                              {["pcs","kg","litres","boxes","cartons","units","rolls","pairs","sets","months"].map(u=><option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td style={{padding:"4px 6px",width:110}}>
                            <input type="number" min="0" step="0.01" value={it.unit_price}
                              onChange={e=>setItem(i,"unit_price",e.target.value)}
                              style={{width:"100%",border:errors[`price_${i}`]?`1px solid ${T.error}`:`1px solid ${T.border}`,borderRadius:4,padding:"4px 6px",fontSize:11,outline:"none",textAlign:"right",color:T.fg,background:T.bg}}/>
                          </td>
                          <td style={{padding:"6px 10px",fontWeight:700,color:T.warning,whiteSpace:"nowrap",width:90}}>
                            KES {((Number(it.quantity)||0)*(Number(it.unit_price)||0)).toLocaleString()}
                          </td>
                          <td style={{padding:"4px 6px",width:32}}>
                            {form.items.length>1&&(
                              <button onClick={()=>removeItem(i)} style={{padding:4,borderRadius:4,background:T.errorBg,color:T.error,border:"none",cursor:"pointer",lineHeight:0}}>
                                <Trash2 style={{width:11,height:11}}/>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr style={{background:T.warningBg}}>
                        <td colSpan={5} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:T.warning,fontSize:12}}>TOTAL</td>
                        <td style={{padding:"8px 10px",fontWeight:900,color:T.warning,fontSize:13,whiteSpace:"nowrap"}}>KES {computedTotal.toLocaleString()}</td>
                        <td/>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{padding:"12px 20px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexShrink:0,background:T.bg}}>
              <div style={{fontSize:11,color:T.fgMuted}}>
                Total: <strong style={{color:T.warning,fontSize:14}}>KES {computedTotal.toLocaleString()}</strong>
                {" "}· {form.items.filter((it:any)=>it.description.trim()).length} item(s)
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={closeForm} style={{padding:"8px 16px",borderRadius:T.rMd,border:`1px solid ${T.border}`,background:T.card,cursor:"pointer",fontSize:13,color:T.fgMuted}}>
                  Cancel
                </button>
                <button onClick={()=>save("draft")} disabled={saving}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"8px 16px",borderRadius:T.rMd,color:T.warning,border:`1.5px solid ${T.warning}`,background:T.warningBg,cursor:"pointer",fontSize:12,fontWeight:600,opacity:saving?0.7:1}}>
                  <Save style={{width:13,height:13}}/>Save Draft
                </button>
                <button onClick={()=>save("pending")} disabled={saving}
                  style={{display:"flex",alignItems:"center",gap:7,padding:"8px 18px",borderRadius:T.rMd,color:"#fff",border:"none",background:T.warning,cursor:"pointer",fontSize:12,fontWeight:700,opacity:saving?0.7:1}}>
                  {saving?<RefreshCw style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>:<Send style={{width:13,height:13}}/>}
                  {saving?"Saving…":"Submit for Approval"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* - VIEW MODAL - */}
      {viewPO&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)"}} onClick={()=>setViewPO(null)}/>
          <div style={{position:"relative",borderRadius:T.rXl,boxShadow:T.shadowLg,width:"min(620px,98%)",maxHeight:"90vh",display:"flex",flexDirection:"column",background:T.card,minHeight:"100%",overflow:"hidden"}}>
            <div style={{padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:T.primaryBg,borderBottom:`1px solid ${T.border}`}}>
              <div>
                <h3 style={{fontSize:15,fontWeight:900,color:T.fg,margin:0}}>{viewPO.po_number}</h3>
                <p style={{fontSize:10,color:T.fgMuted,margin:0}}>{viewPO.suppliers?.name||viewPO.supplier_name||"-"}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                {canCreate&&["draft","pending"].includes(viewPO.status)&&(
                  <button onClick={()=>{setViewPO(null);openEdit(viewPO);}} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:T.r,color:T.fg,fontSize:11,border:`1px solid ${T.border}`,cursor:"pointer",background:T.card}}>
                    <Edit3 style={{width:12,height:12}}/>Edit
                  </button>
                )}
                <button onClick={()=>(printLPO as any)(viewPO, [], null)} style={{display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:T.r,color:T.fg,fontSize:11,border:`1px solid ${T.border}`,cursor:"pointer",background:T.card}}>
                  <Printer style={{width:12,height:12}}/>Print LPO
                </button>
                <button onClick={()=>setViewPO(null)} style={{padding:6,borderRadius:T.r,background:T.bg2,color:T.fgMuted,border:"none",cursor:"pointer",lineHeight:0}}>
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
                    <div style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:T.fgDim}}>{r.l}</div>
                    <div style={{fontSize:13,color:T.fg,fontWeight:500,marginTop:2}}>{r.v||"-"}</div>
                  </div>
                ))}
              </div>

              {/* Line items */}
              <div style={{display:"flex",justifyContent:"center",padding:"16px 0 8px"}}><DocumentStamp status={viewPO.status} date={viewPO.created_at} size={110} rotate={-12} /></div>
              {viewPO.line_items?.length>0&&(
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",color:T.fgDim,marginBottom:8}}>Line Items</div>
                  <table style={{width:"100%",fontSize:11,borderCollapse:"collapse",border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
                    <thead>
                      <tr style={{background:T.warning}}>
                        {["Description","Qty","Unit","Unit Price","Total"].map(h=>(
                          <th key={h} style={{padding:"6px 10px",textAlign:"left",color:"#fff",fontWeight:700,fontSize:9}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {viewPO.line_items.map((it:any,i:number)=>(
                        <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:T.card}}>
                          <td style={{padding:"5px 10px"}}>{it.description}</td>
                          <td style={{padding:"5px 10px",textAlign:"right"}}>{it.quantity}</td>
                          <td style={{padding:"5px 10px",color:T.fgMuted}}>{it.unit}</td>
                          <td style={{padding:"5px 10px",textAlign:"right"}}>KES {Number(it.unit_price||0).toLocaleString()}</td>
                          <td style={{padding:"5px 10px",textAlign:"right",fontWeight:700,color:T.warning}}>KES {((Number(it.quantity)||0)*(Number(it.unit_price)||0)).toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr style={{background:T.warningBg}}>
                        <td colSpan={4} style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:T.warning}}>TOTAL</td>
                        <td style={{padding:"8px 10px",textAlign:"right",fontWeight:900,color:T.warning}}>KES {Number(viewPO.total_amount||0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {viewPO.notes&&(
                <div style={{padding:12,borderRadius:T.rMd,background:T.bg,border:`1px solid ${T.border}`}}>
                  <p style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:T.fgDim,margin:"0 0 4px"}}>Notes</p>
                  <p style={{fontSize:13,color:T.fgMuted,margin:0}}>{viewPO.notes}</p>
                </div>
              )}

              {canApprove&&viewPO.status==="pending"&&(
                <button onClick={()=>{approve(viewPO.id);setViewPO(null);}}
                  style={{width:"100%",marginTop:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"11px 0",borderRadius:T.rMd,color:"#fff",fontWeight:700,fontSize:14,border:"none",cursor:"pointer",background:T.success}}>
                  <CheckCircle style={{width:16,height:16}}/>Approve Purchase Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`${spinKeyframes}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
