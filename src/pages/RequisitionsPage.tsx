/**
 * ProcurBosse - Requisitions Page v4.0 (2026 ERP redesign)
 * Elevated card system via the shared erpKit, on the central T theme.
 * Includes the real line-items editor (item name/qty/unit/price, wired
 * to requisition_items, total_amount computed from actual items) added
 * concurrently — reconciled on top of the visual redesign.
 * EL5 MediProcure - Embu Level 5 Hospital
 */
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ValidationEngine } from "@/engines/validation/ValidationEngine";
import { WorkflowEngine } from "@/engines/workflow/WorkflowEngine";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { toast } from "@/hooks/use-toast";
import PushToApprovalButton from "@/components/PushToApprovalButton";
import { logAudit } from "@/lib/audit";
import { genDocNumber } from "@/lib/docNumber";
import {
  Plus, Search, X, RefreshCw, FileSpreadsheet, Printer, Eye,
  CheckCircle, XCircle, Clock, ClipboardList, Send, AlertTriangle,
  Download, Edit3, ChevronDown
} from "lucide-react";
import * as XLSX from "@e965/xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printRequisition } from "@/lib/printDocument";
import { useDepartments } from "@/hooks/useDropdownData";
import { useConflictResolver } from "@/hooks/useConflictResolver";
import { ConflictResolutionBanner } from "@/components/ConflictResolutionBanner";
import { DocumentStamp } from "@/components/DocumentStamp";
import DocumentAnalyzerButton from "@/components/DocumentAnalyzerButton";
import {
  executeRequisitionAction, getAvailableActions, STATUS_CONFIG,
  generateRequisitionNumber, type RequisitionAction
} from "@/lib/procurement/requisitionWorkflow";
import { T } from "@/lib/theme";
import { PageHeader, SearchBox, BtnPrimary, BtnGhost, KpiBand, Card,
  StatusPill, EmptyState, spinKeyframes, font } from "@/lib/erpKit";

// - Status config -
const STATUS_CFG: Record<string,{bg:string;color:string;border:string;label:string;dot:string}> = Object.fromEntries(
  Object.entries(STATUS_CONFIG).map(([k, v]) => [k, { ...v, border: v.bg }])
) as any;

// - Format helpers -
const fmtKES = (n:number) => {
  if(n>=1_000_000) return `KES ${(n/1_000_000).toFixed(1)}M`;
  if(n>=1000)      return `KES ${(n/1000).toFixed(0)}K`;
  return `KES ${n.toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
};
const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "-";

export default function RequisitionsPage() {
  const { user, profile, roles } = useAuth();
  const isMobile = useIsMobile();
  const canApprove = roles?.includes("admin")||roles?.includes("procurement_manager");
  const canCreate  = !roles?.includes("warehouse_officer");
  const { getSetting } = useSystemSettings();
  const { departments, hasMore: departmentsHasMore, loadMore: loadMoreDepartments } = useDepartments();
  const currencySymbol = getSetting("currency_symbol","KES");

  const [reqs,       setReqs]       = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [statusTab,  setStatusTab]  = useState("all");
  const [priority,   setPriority]   = useState("all");
  const [viewReq,    setViewReq]    = useState<any>(null);
  const [viewItems,  setViewItems]  = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm,   setShowForm]   = useState(false);
  const [editReq,    setEditReq]    = useState<any>(null);
  const [saving,     setSaving]     = useState(false);
  const [sortCol,    setSortCol]    = useState("created_at");
  const [sortAsc,    setSortAsc]    = useState(false);
  const [rejectId,   setRejectId]   = useState<string|null>(null);
  const [rejectReason,setRejectReason]=useState("");

  const EMPTY_FORM = {title:"",department:"",priority:"normal",notes:"",delivery_date:"",justification:"",cost_centre:"",fund_source:"County Fund"};
  const [form, setForm] = useState({...EMPTY_FORM});

  // Line items — item name/qty/unit/price, wired to requisition_items,
  // with total_amount/items_count computed from the real items on save.
  const EMPTY_ITEM = { item_name: "", quantity: "1", unit_of_measure: "pcs", unit_price: "0", description: "" };
  const [reqItems, setReqItems] = useState<any[]>([{ ...EMPTY_ITEM }]);

  const itemTotal = (it: any) => (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
  const itemsGrandTotal = reqItems.reduce((s, it) => s + itemTotal(it), 0);

  const updateItem = (idx: number, field: string, value: string) =>
    setReqItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  const addItemRow = () => setReqItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeItemRow = (idx: number) => setReqItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  const loadItemsForEdit = useCallback(async (requisitionId: string) => {
    const { data } = await (supabase as any).from("requisition_items").select("*").eq("requisition_id", requisitionId);
    if (data && data.length) {
      setReqItems(data.map((r: any) => ({
        id: r.id, item_name: r.item_name || "", quantity: String(r.quantity ?? 1),
        unit_of_measure: r.unit_of_measure || "pcs", unit_price: String(r.unit_price ?? 0),
        description: r.description || "",
      })));
    } else {
      setReqItems([{ ...EMPTY_ITEM }]);
    }
  }, []);

  const conflictResolver = useConflictResolver({
    table: "requisitions",
    id: showForm && editReq?.id ? editReq.id : null,
    local: form,
    setLocal: setForm,
    onResolved: choice => toast({ title: choice === "remote" ? "Remote requisition applied" : choice === "merge" ? "Requisition changes merged" : "Keeping your requisition edits" }),
  });

  const updateFormField = useCallback((key: string, value: any) => {
    conflictResolver.markDirty(key);
    setForm((p: any) => ({ ...p, [key]: value }));
  }, [conflictResolver]);

  const formCacheKey = user?.id ? `req_form_${user.id}_${editReq?.id || "new"}` : null;

  useEffect(() => {
    if (!showForm || !formCacheKey) return;
    try { localStorage.setItem(formCacheKey, JSON.stringify(form)); } catch {}
  }, [form, formCacheKey, showForm]);

  useEffect(() => {
    if (!user?.id || showForm) return;
    try {
      const key = `req_form_${user.id}_new`;
      const cached = localStorage.getItem(key);
      if (!cached) return;
      const cachedForm = JSON.parse(cached);
      if (cachedForm?.title || cachedForm?.department || cachedForm?.notes) {
        setEditReq(null);
        setForm({ ...EMPTY_FORM, ...cachedForm });
        conflictResolver.clearDirty();
        setShowForm(true);
        toast({ title: "Restored unsaved requisition", description: "Draft form data is kept until you save, cancel, or log out." });
      }
    } catch {
      console.error("[Requisitions] Failed to restore cached form");
    }
  }, [user?.id]);

  const load = useCallback(async ()=>{
    setLoading(true);
    try {
      const {data,error} = await (supabase as any).from("requisitions")
        .select("*,requisition_items(count)")
        .order(sortCol,{ascending:sortAsc});
      if(error) throw error;
      const rows=data||[]; setReqs(rows); pageCache.set("requisitions",rows);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("requisitions");
      if(cached) setReqs(cached);
      console.error("[Requisitions]",e);
    } finally { setLoading(false); }
  },[sortCol,sortAsc]);

  useEffect(()=>{load();},[load]);

  // Deep-link: auto-open record from GlobalSearchBar (?focus=<id>)
  useEffect(() => {
    const focusId = searchParams.get("focus");
    if (focusId && reqs.length > 0) {
      const match = reqs.find(r => r.id === focusId);
      if (match) {
        setViewReq(match);
        searchParams.delete("focus");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [reqs, searchParams, setSearchParams]);

  useEffect(() => {
    if (!viewReq?.id) { setViewItems([]); return; }
    (supabase as any).from("requisition_items").select("*").eq("requisition_id", viewReq.id)
      .then(({ data }: any) => setViewItems(data || []));
  }, [viewReq?.id]);

  // Real-time
  useEffect(()=>{
    const ch=(supabase as any).channel("reqs-v3").on("postgres_changes",{event:"*",schema:"public",table:"requisitions"},load).subscribe();
    return()=>(supabase as any).removeChannel(ch);
  },[load]);

  // - Actions -
  async function handleAction(id: string, action: RequisitionAction, reason?: string) {
    const result = await executeRequisitionAction(id, action, user?.id || '', profile?.full_name || '', { reason });
    if (result.success) {
      toast({ title: `Requisition ${action}${action.endsWith('e') ? 'd' : 'ed'}` });
    } else {
      toast({ title: `Action failed`, description: result.error, variant: 'destructive' });
    }
    load();
  }

  async function approve(id: string) { await handleAction(id, 'approve'); }

  async function rejectConfirm() {
    if (!rejectId) return;
    await handleAction(rejectId, 'reject', rejectReason || 'Rejected by manager');
    setRejectId(null); setRejectReason("");
  }

  async function submit(id: string) { await handleAction(id, 'submit'); }

  async function save(){
    if(!form.title.trim()){toast({title:"Requisition title is required",variant:"destructive"});return;}
    const cleanItems = reqItems.filter(it => it.item_name.trim());
    setSaving(true);
    const num = editReq?.requisition_number||genDocNumber("RQQ");
    const payload={...form,requisition_number:num,status:editReq?.status||"draft",requested_by:user?.id,requester_name:profile?.full_name,total_amount:itemsGrandTotal,items_count:cleanItems.length};
    let error:any; let reqId = editReq?.id;
    if(editReq){
      ({error}=await (supabase as any).from("requisitions").update({ ...payload, updated_at: new Date().toISOString() }).eq("id",editReq.id));
    } else {
      const { data, error: insErr } = await (supabase as any).from("requisitions").insert(payload).select("id").single();
      error = insErr; reqId = data?.id;
    }
    if(error){toast({title:"Save failed",description:error.message||"Database error",variant:"destructive"});setSaving(false);return;}

    if (reqId) {
      // Replace this requisition's line items wholesale — simplest reliable
      // approach for a per-requisition item list of this size, and avoids
      // needing to reconcile which rows were edited vs added vs removed.
      await (supabase as any).from("requisition_items").delete().eq("requisition_id", reqId);
      if (cleanItems.length) {
        await (supabase as any).from("requisition_items").insert(cleanItems.map(it => ({
          requisition_id: reqId,
          item_name: it.item_name.trim(),
          quantity: Number(it.quantity) || 0,
          unit_of_measure: it.unit_of_measure || "pcs",
          unit_price: Number(it.unit_price) || 0,
          total_price: itemTotal(it),
          description: it.description?.trim() || null,
        })));
      }
    }

    conflictResolver.clearDirty();
    conflictResolver.setBaseline({ ...form, ...payload });
    if (formCacheKey) { try { localStorage.removeItem(formCacheKey); } catch {} }
    toast({title:editReq?"Requisition updated":"Requisition created",description:num});
    setShowForm(false); setEditReq(null); setForm({...EMPTY_FORM}); setReqItems([{...EMPTY_ITEM}]); load();
    setSaving(false);
  }

  function exportExcel(){
    const wb=XLSX.utils.book_new();
    const header=[[getSetting("hospital_name","Embu Level 5 Hospital")],[getSetting("system_name","EL5 MediProcure")+" - Requisitions Register"],[`Generated: ${new Date().toLocaleString("en-KE")}`],[]];
    const rows=filtered.map(r=>({
      "Req No":r.requisition_number,"Title":r.title,"Department":r.department||"","Priority":r.priority,
      "Status":r.status,"Requester":r.requester_name||"","Date":fmtDate(r.created_at),
      "Delivery Date":fmtDate(r.delivery_date),"Total Amount":r.total_amount||0,"Notes":r.notes||"",
    }));
    const ws=XLSX.utils.aoa_to_sheet(header);
    XLSX.utils.sheet_add_json(ws,rows,{origin:"A5"});
    XLSX.utils.book_append_sheet(wb,ws,"Requisitions");
    XLSX.writeFile(wb,`Requisitions_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records`});
  }

  // - Filter & stats -
  const filtered = reqs.filter(r=>{
    if(statusTab!=="all"&&r.status!==statusTab) return false;
    if(priority!=="all"&&r.priority!==priority) return false;
    if(search){
      const q=search.toLowerCase();
      return (r.requisition_number||"").toLowerCase().includes(q)||(r.title||"").toLowerCase().includes(q)||(r.requester_name||"").toLowerCase().includes(q)||(r.department||"").toLowerCase().includes(q);
    }
    return true;
  }).sort((a,b)=>{
    const va=a[sortCol]||""; const vb=b[sortCol]||"";
    return sortAsc?va.localeCompare(vb):vb.localeCompare(va);
  });

  const COUNTS={all:reqs.length,draft:reqs.filter(r=>r.status==="draft").length,submitted:reqs.filter(r=>r.status==="submitted").length,pending:reqs.filter(r=>r.status==="pending").length,approved:reqs.filter(r=>r.status==="approved").length,rejected:reqs.filter(r=>r.status==="rejected").length,ordered:reqs.filter(r=>r.status==="ordered").length};
  const totalValue=reqs.reduce((s,r)=>s+Number(r.total_amount||0),0);
  const approvedValue=reqs.filter(r=>r.status==="approved").reduce((s,r)=>s+Number(r.total_amount||0),0);
  const pendingCount=COUNTS.submitted+COUNTS.pending;

  const toggleSort=(col:string)=>{if(sortCol===col)setSortAsc(a=>!a);else{setSortCol(col);setSortAsc(true);}};
  const SortInd=({col}:{col:string})=>sortCol===col?<span style={{fontSize:9,marginLeft:3}}>{sortAsc?"▲":"▼"}</span>:null;

  const modalOverlay: React.CSSProperties = {position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20};
  const modalBox: React.CSSProperties = {background:T.card,borderRadius:T.rXl,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",boxShadow:T.shadowLg};
  const inputStyle: React.CSSProperties = {width:"100%",padding:"8px 10px",border:`1.5px solid ${T.border}`,borderRadius:T.rMd,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:font,color:T.fg,background:T.bg};
  const closeFormAll = () => { setShowForm(false); setEditReq(null); setForm({...EMPTY_FORM}); setReqItems([{...EMPTY_ITEM}]); conflictResolver.clearDirty(); };

  // - Render -
  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:font}}>

      <PageHeader icon={ClipboardList} title="Requisitions" subtitle={`Purchase requisition management · ${reqs.length} records`}>
        <BtnGhost onClick={exportExcel} icon={Download}>Export</BtnGhost>
        <BtnGhost onClick={load} icon={RefreshCw} loading={loading}>Refresh</BtnGhost>
        {canCreate&&(
          <BtnPrimary icon={Plus} onClick={()=>{setEditReq(null);setForm({...EMPTY_FORM});setReqItems([{...EMPTY_ITEM}]);conflictResolver.clearDirty();setShowForm(true);}}>
            New Requisition
          </BtnPrimary>
        )}
      </PageHeader>

      <div style={{padding:"20px 20px 32px"}}>

        {/* - KPI BAND - */}
        <KpiBand loading={loading} items={[
          {label:"Total Value",      val:fmtKES(totalValue),           color:"#a4262c", icon:ClipboardList},
          {label:"Approved Value",   val:fmtKES(approvedValue),        color:T.success, icon:CheckCircle},
          {label:"Pending Approval", val:pendingCount,                 color:T.warning, icon:Clock, hot:pendingCount>0},
          {label:"Total Records",    val:reqs.length,                  color:"#6366f1", icon:FileSpreadsheet},
          {label:"Approved",         val:COUNTS.approved,              color:T.primary, icon:CheckCircle},
        ]}/>

        {/* - STATUS TABS + PRIORITY FILTER - */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:14}}>
          {Object.entries({all:"All",...Object.fromEntries(Object.entries(STATUS_CFG).map(([k,v])=>[k,v.label]))}).map(([key,label])=>{
            const cnt=COUNTS[key as keyof typeof COUNTS]??0;
            const isActive=statusTab===key;
            const cfg=STATUS_CFG[key];
            return (
              <button key={key} onClick={()=>setStatusTab(key)}
                style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${isActive?(cfg?.border||T.primary):T.border}`,background:isActive?(cfg?.bg||T.primaryBg):T.card,cursor:"pointer",fontSize:12,fontWeight:isActive?700:500,color:isActive?(cfg?.color||T.primary):T.fgMuted,transition:"all 0.15s",display:"flex",alignItems:"center",gap:5,fontFamily:font}}>
                {cfg?.dot&&isActive&&<span style={{width:6,height:6,borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>}
                {label} ({key==="all"?reqs.length:cnt})
              </button>
            );
          })}
          <select value={priority} onChange={e=>setPriority(e.target.value)} style={{marginLeft:"auto",padding:"6px 10px",borderRadius:T.r,border:`1px solid ${T.border}`,background:T.card,fontSize:12,color:T.fg,cursor:"pointer",fontFamily:font}}>
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* - SEARCH BAR - */}
        <div style={{marginBottom:14}}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search requisition number, title, requester, department…" width={isMobile?undefined as any:360}/>
        </div>

        {/* - TABLE - */}
        <Card style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table data-mobile-card="true" style={{width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:700}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.border}`,background:T.bg}}>
                  {[
                    {col:"requisition_number",label:"REQ NO",    w:150},
                    {col:"title",            label:"TITLE",      w:220},
                    {col:"department",       label:"DEPARTMENT", w:120},
                    {col:"priority",         label:"PRIORITY",   w:90},
                    {col:"requester_name",   label:"REQUESTER",  w:140},
                    {col:"created_at",       label:"DATE",       w:100},
                    {col:"delivery_date",    label:"DELIVERY",   w:100},
                    {col:"total_amount",     label:"AMOUNT",     w:110},
                    {col:"status",           label:"STATUS",     w:110},
                    {col:"",                 label:"ACTIONS",    w:90},
                  ].map(h=>(
                    <th key={h.col} onClick={()=>h.col&&toggleSort(h.col)}
                      style={{padding:"10px 14px",textAlign:"left",fontSize:10.5,fontWeight:700,color:T.fgDim,letterSpacing:"0.06em",whiteSpace:"nowrap",cursor:h.col?"pointer":"default",userSelect:"none",width:h.w,textTransform:"uppercase"}}>
                      {h.label}{h.col&&<SortInd col={h.col}/>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading&&(
                  <tr><td colSpan={10} style={{padding:40,textAlign:"center",color:T.fgDim,fontSize:13}}>Loading requisitions…</td></tr>
                )}
                {!loading&&filtered.length===0&&(
                  <tr><td colSpan={10} style={{padding:40,textAlign:"center"}}>
                    <ClipboardList style={{width:32,height:32,color:T.border,display:"block",margin:"0 auto 8px"}}/>
                    <div style={{fontSize:13,color:T.fgDim}}>No requisitions found{search?` for "${search}"`:""}.</div>
                    {canCreate&&!search&&<button onClick={()=>{setEditReq(null);setForm({...EMPTY_FORM});setReqItems([{...EMPTY_ITEM}]);conflictResolver.clearDirty();setShowForm(true);}} style={{marginTop:12,padding:"7px 16px",borderRadius:T.r,border:"none",background:T.success,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600}}>Create First Requisition</button>}
                  </td></tr>
                )}
                {!loading&&filtered.map((r,ri)=>{
                  const cfg=STATUS_CFG[r.status]||STATUS_CFG.draft;
                  const isPending=r.status==="submitted"||r.status==="pending";
                  const isDraft=r.status==="draft";
                  const prioColor={urgent:T.error,high:T.warning,normal:T.success,low:T.fgMuted}[r.priority as string]||T.fgMuted;

                  return (
                    <tr key={r.id} style={{borderBottom:`1px solid ${T.border}`,background:T.card,transition:"background 0.1s"}}
                      onMouseEnter={e=>(e.currentTarget.style.background=T.bg)}
                      onMouseLeave={e=>(e.currentTarget.style.background=T.card)}>

                      <td style={{padding:"10px 14px",fontWeight:700,color:T.primary,fontVariantNumeric:"tabular-nums",whiteSpace:"nowrap",fontSize:12}}>
                        {r.requisition_number||"-"}
                      </td>
                      <td style={{padding:"10px 14px",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        <div style={{fontWeight:600,color:T.fg,fontSize:12}}>{r.title||"Untitled"}</div>
                        {r.notes&&<div style={{fontSize:10.5,color:T.fgDim,marginTop:1,overflow:"hidden",textOverflow:"ellipsis"}}>{r.notes.slice(0,50)}</div>}
                      </td>
                      <td style={{padding:"10px 14px",color:T.fgMuted,fontSize:12,whiteSpace:"nowrap"}}>{r.department||"-"}</td>
                      <td style={{padding:"10px 14px"}}>
                        <span style={{padding:"2px 8px",borderRadius:12,background:`${prioColor}18`,color:prioColor,fontSize:10,fontWeight:700,textTransform:"capitalize"}}>{r.priority||"normal"}</span>
                      </td>
                      <td style={{padding:"10px 14px",color:T.fgMuted,fontSize:12,whiteSpace:"nowrap"}}>{r.requester_name||"-"}</td>
                      <td style={{padding:"10px 14px",color:T.fgDim,fontSize:11,whiteSpace:"nowrap"}}>{fmtDate(r.created_at)}</td>
                      <td style={{padding:"10px 14px",color:T.fgDim,fontSize:11,whiteSpace:"nowrap"}}>{r.delivery_date?fmtDate(r.delivery_date):"-"}</td>
                      <td style={{padding:"10px 14px",fontWeight:600,color:T.fg,fontSize:12,whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>
                        {r.total_amount?`${currencySymbol} ${Number(r.total_amount).toLocaleString("en-KE",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"-"}
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        <span className="status-chip" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:16,background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:600,border:`1px solid ${cfg.border}`}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:cfg.dot,flexShrink:0}}/>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{padding:"10px 14px"}}>
                        <div style={{display:"flex",gap:4,justifyContent:"center"}}>
                          <button title="View" onClick={()=>setViewReq(r)} style={{padding:5,borderRadius:6,border:"none",background:T.primaryBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Eye style={{width:13,height:13,color:T.primary}}/>
                          </button>
                          {(isDraft||r.requested_by===user?.id)&&(
                            <button title="Edit" onClick={()=>{const nextForm={title:r.title||"",department:r.department||"",priority:r.priority||"normal",notes:r.notes||"",delivery_date:r.delivery_date||"",justification:r.justification||"",cost_centre:r.cost_centre||"",fund_source:r.fund_source||"County Fund"};setEditReq(r);setForm(nextForm);loadItemsForEdit(r.id);conflictResolver.clearDirty();conflictResolver.setBaseline(nextForm);setShowForm(true);}} style={{padding:5,borderRadius:6,border:"none",background:T.successBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <Edit3 style={{width:13,height:13,color:T.success}}/>
                            </button>
                          )}
                          {isDraft&&(
                            <button title="Submit" onClick={()=>submit(r.id)} style={{padding:5,borderRadius:6,border:"none",background:T.primaryBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              <Send style={{width:13,height:13,color:T.primary}}/>
                            </button>
                          )}
                          {isPending&&canApprove&&(
                            <>
                              <button title="Approve" onClick={()=>approve(r.id)} style={{padding:5,borderRadius:6,border:"none",background:T.successBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <CheckCircle style={{width:13,height:13,color:T.success}}/>
                              </button>
                              <button title="Reject" onClick={()=>setRejectId(r.id)} style={{padding:5,borderRadius:6,border:"none",background:T.errorBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                                <XCircle style={{width:13,height:13,color:T.error}}/>
                              </button>
                            </>
                          )}
                          <button title="Print" onClick={()=>(printRequisition as any)(r, [], {hospitalName:getSetting("hospital_name","Embu Level 5 Hospital"),sysName:getSetting("system_name","EL5 MediProcure"),docFooter:getSetting("doc_footer",""),currencySymbol,logoUrl:getSetting("logo_url")||getSetting("system_logo_url")||"",printFont:getSetting("print_font","Times New Roman"),printFontSize:getSetting("print_font_size","11"),showStamp:getSetting("show_stamp","true")==="true"})} style={{padding:5,borderRadius:6,border:"none",background:T.warningBg,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            <Printer style={{width:13,height:13,color:T.warning}}/>
                          </button>

                          <PushToApprovalButton
                            documentType="requisition"
                            documentId={r.id}
                            documentNumber={r.requisition_number||`REQ/${r.department||"General"}`}
                            documentTitle={r.title}
                            department={r.department}
                            amount={Number(r.total_amount||0)}
                            currentStatus={r.status}
                            stamped={!!r.stamped}
                            stampedByName={r.stamped_by_name}
                            stampLabel={r.stamp_label}
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
          {/* Footer */}
          <div style={{padding:"8px 16px",borderTop:`1px solid ${T.border}`,background:T.bg,display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:11,color:T.fgMuted}}>
            <span>Showing {filtered.length} of {reqs.length} requisitions</span>
            <span>{reqs.length>0&&`Total value: ${fmtKES(totalValue)}`}</span>
          </div>
        </Card>
      </div>

      {/* - CREATE / EDIT MODAL - */}
      {showForm&&(
        <div style={modalOverlay}>
          <div style={modalBox}>
            <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:T.rMd,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ClipboardList style={{width:18,height:18,color:T.primary}}/>
              </div>
              <div>
                <div style={{fontSize:16,fontWeight:800,color:T.fg}}>{editReq?"Edit Requisition":"New Requisition"}</div>
                <div style={{fontSize:11,color:T.fgMuted}}>Embu Level 5 Hospital · {editReq?.requisition_number||"New"}</div>
              </div>
              <button onClick={closeFormAll} style={{marginLeft:"auto",padding:8,borderRadius:T.rMd,border:"none",background:T.bg2,cursor:"pointer",lineHeight:0}}>
                <X style={{width:16,height:16,color:T.fgMuted}}/>
              </button>
            </div>
            <ConflictResolutionBanner fields={conflictResolver.conflict} onResolve={conflictResolver.resolve} remoteLabel="requisition" />

            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {!editReq && (
                <div style={{gridColumn:"1/-1",marginBottom:2,paddingBottom:12,borderBottom:`1px dashed ${T.border}`}}>
                  <DocumentAnalyzerButton target="requisition" onApply={(f)=>{
                    setForm(p=>({
                      ...p,
                      title: f.title ?? p.title,
                      department: f.department ?? p.department,
                      justification: f.justification ?? p.justification,
                    }));
                    if (Array.isArray(f.items) && f.items.length) {
                      setReqItems(f.items.map((it:any)=>({
                        item_name: it.name || "",
                        quantity: String(it.quantity || 1),
                        unit_of_measure: it.unit || "pcs",
                        unit_price: String(it.unit_price || 0),
                        description: "",
                      })));
                    }
                  }} />
                </div>
              )}
              {[
                {k:"title",l:"Requisition Title *",p:"e.g. Medical Supplies - Pharmacy",span:2,req:true},
                {k:"department",l:"Department",p:"e.g. Pharmacy",span:1},
                {k:"priority",l:"Priority",p:"",span:1,type:"select",opts:["urgent","high","normal","low"]},
                {k:"delivery_date",l:"Required By Date",p:"",span:1,type:"date"},
                {k:"cost_centre",l:"Cost Centre",p:"e.g. PHARM-001",span:1},
                {k:"fund_source",l:"Fund Source",p:"County Fund",span:1,type:"select",opts:["County Fund","National Fund","Donor Fund","NHIF","Other"]},
                {k:"justification",l:"Justification",p:"Why is this needed?",span:2,type:"textarea"},
                {k:"notes",l:"Additional Notes",p:"Any other information…",span:2,type:"textarea"},
              ].map(field=>(
                <div key={field.k} style={{gridColumn:field.span===2?"span 2":"span 1"}}>
                  <label style={{display:"block",fontSize:11.5,fontWeight:600,color:T.fgDim,marginBottom:4}}>{field.l}</label>
                  {field.k==="department"?(
                    <select value={(form as any)[field.k]||""} onChange={async e=>{ if (e.target.value === "__load_more_departments__") { await loadMoreDepartments(); return; } updateFormField(field.k, e.target.value); }} style={inputStyle}>
                      <option value="">Select department…</option>
                      {departments.map(d=><option key={d.id} value={d.name}>{d.name}</option>)}
                      {departmentsHasMore&&<option value="__load_more_departments__">Load more departments…</option>}
                    </select>
                  ):field.type==="select"?(
                    <select value={(form as any)[field.k]||""} onChange={async e=>{ if (field.k === "department" && e.target.value === "__load_more_departments__") { await loadMoreDepartments(); return; } updateFormField(field.k, e.target.value); }} style={inputStyle}>
                      {field.opts?.map(o=><option key={o} value={o} style={{textTransform:"capitalize"}}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}
                    </select>
                  ):field.type==="textarea"?(
                    <textarea value={(form as any)[field.k]||""} onChange={async e=>{ if (field.k === "department" && e.target.value === "__load_more_departments__") { await loadMoreDepartments(); return; } updateFormField(field.k, e.target.value); }} placeholder={field.p} rows={2} style={{...inputStyle,resize:"vertical"}}/>
                  ):(
                    <input type={field.type||"text"} value={(form as any)[field.k]||""} onChange={async e=>{ if (field.k === "department" && e.target.value === "__load_more_departments__") { await loadMoreDepartments(); return; } updateFormField(field.k, e.target.value); }} placeholder={field.p} style={{...inputStyle,border:`1.5px solid ${field.req&&!(form as any)[field.k]?"#fca5a5":T.border}`}}/>
                  )}
                </div>
              ))}
            </div>

            {/* Line items */}
            <div style={{padding:"0 22px 18px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <label style={{fontSize:11.5,fontWeight:700,color:T.fgMuted}}>Items Requested</label>
                <button type="button" onClick={addItemRow} style={{display:"flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:T.r,border:`1px solid ${T.border}`,background:T.bg,cursor:"pointer",fontSize:11,fontWeight:600,color:T.fgMuted}}>
                  <Plus style={{width:11,height:11}}/> Add Item
                </button>
              </div>
              <div style={{border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"2fr 70px 90px 100px 90px 30px",gap:0,background:T.bg,padding:"6px 8px",fontSize:9.5,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:".03em"}}>
                  <span>Item</span><span>Qty</span><span>Unit</span><span>Unit Price</span><span>Total</span><span/>
                </div>
                {reqItems.map((it,idx)=>(
                  <div key={idx} style={{display:"grid",gridTemplateColumns:"2fr 70px 90px 100px 90px 30px",gap:6,padding:"6px 8px",alignItems:"center",borderTop:`1px solid ${T.border}`}}>
                    <input value={it.item_name} onChange={e=>updateItem(idx,"item_name",e.target.value)} placeholder="Item name…" style={{width:"100%",padding:"5px 7px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none",boxSizing:"border-box",background:T.bg,color:T.fg}}/>
                    <input type="number" min="0" value={it.quantity} onChange={e=>updateItem(idx,"quantity",e.target.value)} style={{width:"100%",padding:"5px 7px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none",boxSizing:"border-box",background:T.bg,color:T.fg}}/>
                    <select value={it.unit_of_measure} onChange={e=>updateItem(idx,"unit_of_measure",e.target.value)} style={{width:"100%",padding:"5px 4px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:11,outline:"none",boxSizing:"border-box",background:T.bg,color:T.fg}}>
                      {["pcs","boxes","cartons","litres","kg","packs","units"].map(u=><option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" min="0" step="0.01" value={it.unit_price} onChange={e=>updateItem(idx,"unit_price",e.target.value)} style={{width:"100%",padding:"5px 7px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:12,outline:"none",boxSizing:"border-box",background:T.bg,color:T.fg}}/>
                    <div style={{fontSize:12,fontWeight:700,color:T.fg,textAlign:"right",paddingRight:4}}>{itemTotal(it).toLocaleString("en-KE",{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
                    <button type="button" onClick={()=>removeItemRow(idx)} disabled={reqItems.length===1} style={{background:"none",border:"none",cursor:reqItems.length===1?"not-allowed":"pointer",padding:2,opacity:reqItems.length===1?0.3:1,display:"flex",justifyContent:"center"}}>
                      <X style={{width:13,height:13,color:T.error}}/>
                    </button>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"flex-end",padding:"8px 12px",background:T.bg,borderTop:`1px solid ${T.border}`,fontSize:13,fontWeight:800,color:T.fg}}>
                  {currencySymbol} {itemsGrandTotal.toLocaleString("en-KE",{minimumFractionDigits:2})}
                </div>
              </div>
            </div>

            <div style={{padding:"14px 22px",borderTop:`1px solid ${T.border}`,display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={closeFormAll} style={{padding:"9px 20px",borderRadius:T.rMd,border:`1px solid ${T.border}`,background:T.bg2,cursor:"pointer",fontSize:13,fontWeight:600,color:T.fgMuted}}>Cancel</button>
              <button onClick={()=>save()} disabled={saving} style={{padding:"9px 22px",borderRadius:T.rMd,border:"none",background:T.success,cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",opacity:saving?0.7:1}}>
                {saving?"Saving…":editReq?"Update Requisition":"Create Requisition"}
              </button>
              {!editReq&&(
                <button onClick={async()=>{await save();/* submit after save handled by status */}} disabled={saving} style={{padding:"9px 22px",borderRadius:T.rMd,border:"none",background:T.primary,cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",opacity:saving?0.7:1}}>
                  Save &amp; Submit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* - VIEW DETAIL MODAL - */}
      {viewReq&&(
        <div style={modalOverlay}>
          <div style={{...modalBox,maxWidth:700}}>
            <div style={{padding:"18px 22px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:T.rMd,background:T.primaryBg,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <ClipboardList style={{width:18,height:18,color:T.primary}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:15,fontWeight:800,color:T.fg}}>{viewReq.requisition_number}</div>
                <div style={{fontSize:11,color:T.fgMuted}}>{viewReq.title}</div>
              </div>
              <span className="status-chip" style={{padding:"4px 12px",borderRadius:16,background:STATUS_CFG[viewReq.status]?.bg||T.bg2,color:STATUS_CFG[viewReq.status]?.color||T.fgMuted,fontSize:12,fontWeight:700,border:`1px solid ${STATUS_CFG[viewReq.status]?.border||T.border}`}}>
                  <DocumentStamp status={viewReq.status} date={viewReq.created_at} size={100} rotate={-12} />
                {STATUS_CFG[viewReq.status]?.label||viewReq.status}
              </span>
              <button onClick={()=>setViewReq(null)} style={{padding:8,borderRadius:T.rMd,border:"none",background:T.bg2,cursor:"pointer",lineHeight:0}}>
                <X style={{width:16,height:16,color:T.fgMuted}}/>
              </button>
            </div>
            <div style={{padding:"18px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {[
                {l:"Requisition Number",v:viewReq.requisition_number},
                {l:"Status",v:STATUS_CFG[viewReq.status]?.label||viewReq.status},
                {l:"Title",v:viewReq.title},
                {l:"Department",v:viewReq.department||"-"},
                {l:"Priority",v:viewReq.priority||"normal"},
                {l:"Requester",v:viewReq.requester_name||"-"},
                {l:"Date Raised",v:fmtDate(viewReq.created_at)},
                {l:"Required By",v:viewReq.delivery_date?fmtDate(viewReq.delivery_date):"-"},
                {l:"Total Amount",v:viewReq.total_amount?`${currencySymbol} ${Number(viewReq.total_amount).toLocaleString("en-KE",{minimumFractionDigits:2})}`: "-"},
                {l:"Fund Source",v:viewReq.fund_source||"-"},
                {l:"Cost Centre",v:viewReq.cost_centre||"-"},
                {l:"Approved By",v:viewReq.approved_by_name||"-"},
                {l:"Justification",v:viewReq.justification||"-",span:2},
                {l:"Notes",v:viewReq.notes||"-",span:2},
                ...(viewReq.status==="rejected"?[{l:"Rejection Reason",v:viewReq.rejection_reason||"-",span:2,warn:true}]:[]),
              ].map((row:any,i:number)=>(
                <div key={i} style={{gridColumn:row.span===2?"span 2":"span 1",padding:"8px 12px",background:row.warn?T.errorBg:T.bg,borderRadius:T.rMd,border: `1px solid ${row.warn?"#fca5a5":T.border}`}}>
                  <div style={{fontSize:10,fontWeight:700,color:row.warn?T.error:T.fgDim,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:2}}>{row.l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:row.warn?T.error:T.fg}}>{row.v}</div>
                </div>
              ))}
            </div>
            {viewItems.length > 0 && (
              <div style={{padding:"0 22px 18px"}}>
                <div style={{fontSize:10,fontWeight:700,color:T.fgDim,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:6}}>Items Requested ({viewItems.length})</div>
                <div style={{border:`1px solid ${T.border}`,borderRadius:T.rMd,overflow:"hidden"}}>
                  <div style={{display:"grid",gridTemplateColumns:"2fr 60px 90px 90px",gap:0,background:T.bg,padding:"6px 10px",fontSize:9.5,fontWeight:700,color:T.fgDim,textTransform:"uppercase"}}>
                    <span>Item</span><span>Qty</span><span>Unit Price</span><span>Total</span>
                  </div>
                  {viewItems.map((it:any)=>(
                    <div key={it.id} style={{display:"grid",gridTemplateColumns:"2fr 60px 90px 90px",gap:0,padding:"6px 10px",fontSize:12,borderTop:`1px solid ${T.border}`}}>
                      <span style={{fontWeight:600,color:T.fg}}>{it.item_name}</span>
                      <span style={{color:T.fgMuted}}>{it.quantity} {it.unit_of_measure}</span>
                      <span style={{color:T.fgMuted}}>{currencySymbol} {Number(it.unit_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</span>
                      <span style={{fontWeight:700,color:T.fg}}>{currencySymbol} {Number(it.total_price||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{padding:"12px 22px",borderTop:`1px solid ${T.border}`,display:"flex",gap:8,justifyContent:"flex-end",flexWrap:"wrap" as const}}>
              {(viewReq.status==="submitted"||viewReq.status==="pending")&&canApprove&&(
                <>
                  <button onClick={()=>{approve(viewReq.id);setViewReq(null);}} style={{padding:"8px 18px",borderRadius:T.rMd,border:"none",background:T.success,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Approve</button>
                  <button onClick={()=>{setRejectId(viewReq.id);setViewReq(null);}} style={{padding:"8px 18px",borderRadius:T.rMd,border:"none",background:T.error,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Reject</button>
                </>
              )}
              {viewReq.status==="draft"&&(
                <button onClick={()=>{submit(viewReq.id);setViewReq(null);}} style={{padding:"8px 18px",borderRadius:T.rMd,border:"none",background:T.primary,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700}}>Submit for Approval</button>
              )}
              <button onClick={()=>(printRequisition as any)(viewReq, [], {hospitalName:getSetting("hospital_name","Embu Level 5 Hospital"),sysName:getSetting("system_name","EL5 MediProcure"),docFooter:getSetting("doc_footer",""),currencySymbol,logoUrl:getSetting("logo_url")||"",printFont:getSetting("print_font","Times New Roman"),printFontSize:getSetting("print_font_size","11"),showStamp:true})} style={{padding:"8px 18px",borderRadius:T.rMd,border:`1px solid ${T.border}`,background:T.bg2,cursor:"pointer",fontSize:12,fontWeight:600,color:T.fgMuted}}>Print</button>
              <button onClick={()=>setViewReq(null)} style={{padding:"8px 18px",borderRadius:T.rMd,border:`1px solid ${T.border}`,background:T.bg2,cursor:"pointer",fontSize:12,fontWeight:600,color:T.fgMuted}}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* - REJECT DIALOG - */}
      {rejectId&&(
        <div style={{...modalOverlay,zIndex:300}}>
          <div style={{background:T.card,borderRadius:T.rXl,padding:24,maxWidth:440,width:"90%",boxShadow:T.shadowLg}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <AlertTriangle style={{width:22,height:22,color:T.error}}/>
              <div style={{fontSize:15,fontWeight:800,color:T.fg}}>Reject Requisition</div>
            </div>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Enter reason for rejection (required)…" rows={3} style={{...inputStyle,resize:"vertical",marginBottom:14}}/>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>{setRejectId(null);setRejectReason("");}} style={{padding:"8px 18px",borderRadius:T.rMd,border:`1px solid ${T.border}`,background:T.bg2,cursor:"pointer",fontSize:13,fontWeight:600,color:T.fgMuted}}>Cancel</button>
              <button onClick={rejectConfirm} disabled={!rejectReason.trim()} style={{padding:"8px 18px",borderRadius:T.rMd,border:"none",background:T.error,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,opacity:!rejectReason.trim()?0.5:1}}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
      <style>{spinKeyframes}</style>
    </div>
  );
}
