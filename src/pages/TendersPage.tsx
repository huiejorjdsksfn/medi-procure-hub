/**
 * ProcurBosse - Tenders v2.0 (2026 ERP redesign)
 * Same data / save / publish logic — visual layer via shared erpKit on
 * the central T theme.
 */
import { useEffect, useState, useCallback } from "react";
import { ERPCache } from "@/lib/erp-cache";
import { ValidationEngine } from "@/engines/validation/ValidationEngine";
import { WorkflowEngine } from "@/engines/workflow/WorkflowEngine";
import { pageCache } from "@/lib/pageCache";
import { PrintEngine } from "@/engines/print/PrintEngine";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import PushToApprovalButton from "@/components/PushToApprovalButton";
import { logAudit } from "@/lib/audit";
import { notifyProcurement } from "@/lib/notify";
import { Plus, Search, RefreshCw, Eye, CheckCircle, Gavel, X, Save, Download, Mail } from "lucide-react";
import * as XLSX from "@e965/xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { DocumentStamp } from "@/components/DocumentStamp";
import { genDocNumber } from "@/lib/docNumber";
import { T } from "@/lib/theme";
import { PageHeader, SearchBox, BtnPrimary, BtnGhost, KpiBand, Card, font, spinKeyframes } from "@/lib/erpKit";

const genNo = () => genDocNumber("TND");
const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE")}`;
const fmtDate = (d:string) => d ? new Date(d).toLocaleDateString("en-KE",{dateStyle:"medium"}) : "-";

const STATUS_CFG:Record<string,{bg:string;color:string;label:string}> = {
  draft:     {bg:T.bg2,      color:T.fgMuted, label:"Draft"},
  published: {bg:T.primaryBg,color:T.primary, label:"Published"},
  closed:    {bg:T.warningBg,color:T.warning, label:"Closed"},
  evaluated: {bg:"#ede9fe",  color:"#5b21b6",  label:"Evaluated"},
  awarded:   {bg:T.successBg,color:T.success, label:"Awarded"},
  cancelled: {bg:T.errorBg,  color:T.error,   label:"Cancelled"},
};
const sc = (s:string) => STATUS_CFG[s]||STATUS_CFG.draft;
const CATEGORIES = ["Pharmaceuticals","Medical Supplies","Equipment","Laboratory","Construction & Renovation","ICT","General Supplies","Services","Utilities","Food & Nutrition"];
const TYPES = ["Open Tender","Restricted Tender","Direct Procurement","Request for Quotation","Framework Agreement"];

const inpStyle: React.CSSProperties = {width:"100%",padding:"9px 12px",fontSize:14,border:`1.5px solid ${T.border}`,borderRadius:T.rMd,outline:"none",background:T.bg,color:T.fg,boxSizing:"border-box",fontFamily:font};
const INP = (v:any,cb:any,p="",t="text") => (
  <input type={t} value={v} onChange={e=>cb(e.target.value)} placeholder={p} style={inpStyle}/>
);
const LBL = ({c,children}:{c?:string;children:any}) => <div style={{fontSize:12,fontWeight:700,color:c||T.fgDim,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em"}}>{children}</div>;

export default function TendersPage() {
  const { user, profile, hasRole, isAdminTier} = useAuth();
  const isAdminRole = isAdminTier || hasRole("admin") || hasRole("superadmin") || hasRole("webmaster");
  const { get: getSetting } = useSystemSettings();
  const canManage = isAdminRole||hasRole("procurement_manager")||hasRole("procurement_officer");

  const [rows,     setRows]     = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [stFilter, setStFilter] = useState("all");
  const [showNew,  setShowNew]  = useState(false);
  const [detail,   setDetail]   = useState<any>(null);
  const [editing,  setEditing]  = useState<any>(null);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    title:"", description:"", category:"",
    tender_type:"Open Tender", estimated_value:"",
    opening_date:"", closing_date:"",
    evaluation_criteria:"", contact_person:"",
    contact_email:"", contact_phone:"",
    bid_bond_required:false, bid_bond_amount:"",
    performance_bond:false, currency:"KES",
    procurement_method:"Open Tender",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const{data,error}=await(supabase as any).from("tenders").select("*").order("created_at",{ascending:false});
      if(error) throw error;
      const rows=data||[]; setRows(rows);
      pageCache.set("tenders",rows);
    } catch(e:any) {
      const cached=pageCache.get<any[]>("tenders");
      if(cached){ setRows(cached); toast({title:"Showing cached data",description:"Live data temporarily unavailable",variant:"destructive"}); }
      console.error("[Tenders]",e);
    } finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    const ch=(supabase as any).channel("tenders-rt").on("postgres_changes",{event:"*",schema:"public",table:"tenders"},load).subscribe();
    const handlePrint = async (tender:any) => {
    await PrintEngine.report(
      `Tender: ${tender.title}`,
      `<table style="width:100%;border-collapse:collapse">
        <tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;background:#f5f5f5">Field</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd;background:#f5f5f5">Details</th></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Tender Number</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.tender_number||"-"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Title</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.title||"-"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Category</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.category||"-"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Status</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.status||"-"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Estimated Value</td><td style="padding:8px;border-bottom:1px solid #eee">KES ${(tender.estimated_value||0).toLocaleString()}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Opening Date</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.opening_date||"-"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Closing Date</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.closing_date||"-"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Procurement Method</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.procurement_method||"Open Tender"}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee">Reference Number</td><td style="padding:8px;border-bottom:1px solid #eee">${tender.reference_number||"-"}</td></tr>
        <tr><td style="padding:8px">Description</td><td style="padding:8px">${tender.description||"-"}</td></tr>
      </table>`
    );
  };

  return ()=>(supabase as any).removeChannel(ch);
  },[load]);

  const openNew = (v?:any) => {
    if(v){ setEditing(v); setForm({
      title:v.title||"", description:v.description||"", category:v.category||"",
      tender_type:v.tender_type||"Open Tender",
      estimated_value:String(v.estimated_value||""),
      opening_date:v.opening_date||"", closing_date:v.closing_date||"",
      evaluation_criteria:v.evaluation_criteria||"",
      contact_person:v.contact_person||"",
      contact_email:v.contact_email||"", contact_phone:v.contact_phone||"",
      bid_bond_required:v.bid_bond_required||false,
      bid_bond_amount:String(v.bid_bond_amount||""),
      performance_bond:v.performance_bond||false,
      currency:v.currency||"KES",
      procurement_method:v.procurement_method||"Open Tender",
    }); }
    else { setEditing(null); setForm({
      title:"", description:"", category:"",
      tender_type:"Open Tender", estimated_value:"",
      opening_date:"", closing_date:"",
      evaluation_criteria:"", contact_person:"",
      contact_email:"", contact_phone:"",
      bid_bond_required:false, bid_bond_amount:"",
      performance_bond:false, currency:"KES",
      procurement_method:"Open Tender",
    }); }
    setShowNew(true);
  };

  const save = async () => {
    if(!form.title.trim()){ toast({title:"Tender title is required",variant:"destructive"}); return; }
    if(!form.closing_date){ toast({title:"Closing date is required",variant:"destructive"}); return; }
    if(new Date(form.closing_date) < new Date(new Date().toDateString())){ toast({title:"Closing date must be today or in the future",variant:"destructive"}); return; }
    if(form.estimated_value&&isNaN(Number(form.estimated_value))){ toast({title:"Estimated value must be a number",variant:"destructive"}); return; }
    setSaving(true);
    const payload={...form,estimated_value:form.estimated_value?Number(form.estimated_value):null,opening_date:form.opening_date||null,closing_date:form.closing_date||null,bid_bond_amount:form.bid_bond_amount?Number(form.bid_bond_amount):null,created_by:user?.id,created_by_name:profile?.full_name};
    if(editing){
      await(supabase as any).from("tenders").update(payload).eq("id",editing.id);
      toast({title:"Tender updated"});
    } else {
      const{data,error}=await(supabase as any).from("tenders").insert({...payload,tender_number:genNo(),status:"draft"}).select().single();
      if(error){toast({title:"Save failed",description:error.message||"Database error - please try again",variant:"destructive"});setSaving(false);return;}
      logAudit(user?.id,profile?.full_name,"create","tenders",data?.id,{});
      await notifyProcurement({title:"New Tender Created",message:`${form.title} - Closing: ${fmtDate(form.closing_date)}`,type:"tender",module:"Tenders",senderId:user?.id});
      toast({title:"Tender created"});
    }
    setShowNew(false); setEditing(null); load(); setSaving(false);
  };

  const publish = async (t:any) => {
    await(supabase as any).from("tenders").update({status:"published"}).eq("id",t.id);
    await notifyProcurement({title:"Tender Published",message:`${t.tender_number}: ${t.title}`,type:"tender",module:"Tenders",senderId:user?.id});
    toast({title:"Published"}); load();
  };
  const close_ = async (t:any) => {
    await(supabase as any).from("tenders").update({status:"closed"}).eq("id",t.id);
    toast({title:"Tender closed"}); load();
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(filtered.map(r=>({Number:r.tender_number,Title:r.title,Category:r.category,Type:r.tender_type,Value:r.estimated_value,Opening:r.opening_date,Closing:r.closing_date,Status:r.status})));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Tenders");
    XLSX.writeFile(wb,`Tenders_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const filtered = rows.filter(r=>(stFilter==="all"||r.status===stFilter)&&(!search||[r.tender_number,r.title,r.category].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()))));

  // Summary counts
  const counts:Record<string,number> = {};
  rows.forEach(r=>{ counts[r.status]=(counts[r.status]||0)+1; });

  const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
  const totalVal=rows.reduce((s:number,r:any)=>s+Number(r.estimated_value||0),0);
  const published=rows.filter(r=>r.status==="published").length;
  const awarded=rows.filter(r=>r.status==="awarded").length;

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:font}}>
      <PageHeader icon={Gavel} title="Tenders" subtitle={`Public procurement · ${rows.length} total tenders`}>
        <BtnGhost onClick={exportXLSX} icon={Download}>Export</BtnGhost>
        <BtnGhost onClick={load} icon={RefreshCw} loading={loading}>Refresh</BtnGhost>
        {canManage&&<BtnPrimary onClick={()=>openNew()} icon={Plus}>New Tender</BtnPrimary>}
      </PageHeader>

      <div style={{padding:"20px 20px 32px",maxWidth:1400,margin:"0 auto"}}>
        <KpiBand loading={loading} items={[
          {label:"Total Est. Value",val:fmtK(totalVal),color:"#a4262c",icon:Gavel},
          {label:"Total Tenders",   val:rows.length,   color:T.warning,icon:Gavel},
          {label:"Published",       val:published,     color:T.success,icon:CheckCircle},
          {label:"Awarded",         val:awarded,        color:"#6c3483",icon:CheckCircle},
          {label:"Showing",         val:filtered.length,color:T.primary,icon:Eye},
        ]}/>

        {/* Status chips */}
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap" as const}}>
          {[{id:"all",label:"All",cnt:rows.length},
            ...Object.entries(STATUS_CFG).map(([id,c])=>({id,label:c.label,cnt:counts[id]||0}))].map(f=>(
            <button key={f.id} onClick={()=>setStFilter(f.id)} style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${stFilter===f.id?T.primary:T.border}`,background:stFilter===f.id?T.primary:T.card,color:stFilter===f.id?"#fff":T.fgMuted,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:font}}>
              {f.label} <span style={{opacity:0.7}}>({f.cnt})</span>
            </button>
          ))}
        </div>

        <div style={{marginBottom:14}}>
          <SearchBox value={search} onChange={setSearch} placeholder="Search tender number, title, category…" width={"100%" as any}/>
        </div>

        {/* Table */}
        <Card style={{overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
          <table data-mobile-card="true" style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:T.bg,borderBottom:`1px solid ${T.border}`}}>
                {["Tender No","Title","Category","Type","Est. Value","Opening","Closing","Status","Actions"].map(h=>(
                  <th key={h} style={{padding:"11px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.fgDim,textTransform:"uppercase",letterSpacing:"0.06em",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?[1,2,3,4].map(i=>(
                <tr key={i}>{[...Array(9)].map((_,j)=><td key={j} style={{padding:"14px"}}><div style={{height:12,background:T.bg2,borderRadius:4,animation:"pulse 1.5s infinite"}}/></td>)}</tr>
              )):filtered.length===0?(
                <tr><td colSpan={9} style={{padding:"60px",textAlign:"center",color:T.fgDim,fontSize:14}}>
                  <Gavel style={{width:40,height:40,color:T.border,margin:"0 auto 12px"}}/>
                  <div style={{fontWeight:600}}>No tenders found</div>
                </td></tr>
              ):filtered.map(r=>{
                const cfg=sc(r.status);
                const closing = r.closing_date ? new Date(r.closing_date) : null;
                const expired = closing && closing < new Date();
                return(
                  <tr key={r.id} style={{borderBottom:`1px solid ${T.border}`,cursor:"pointer",background:T.card}}
                    onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background=T.bg}
                    onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=T.card}>
                    <td style={{padding:"12px 14px",fontSize:13,fontWeight:800,color:T.primary,fontFamily:"monospace"}} onClick={()=>setDetail(r)}>{r.tender_number}</td>
                    <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:T.fg,maxWidth:200}} onClick={()=>setDetail(r)}>{r.title}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:T.fgMuted}} onClick={()=>setDetail(r)}>{r.category||"-"}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:T.fgMuted}} onClick={()=>setDetail(r)}>{r.tender_type||"-"}</td>
                    <td style={{padding:"12px 14px",fontSize:13,fontWeight:600,color:T.fgMuted}} onClick={()=>setDetail(r)}>{r.estimated_value?fmtKES(r.estimated_value):"-"}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:T.fgMuted}} onClick={()=>setDetail(r)}>{fmtDate(r.opening_date)}</td>
                    <td style={{padding:"12px 14px",fontSize:12,color:expired?T.error:T.fgMuted,fontWeight:expired?700:400}} onClick={()=>setDetail(r)}>{fmtDate(r.closing_date)}</td>
                    <td style={{padding:"12px 14px"}} onClick={()=>setDetail(r)}><span className="status-chip" style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span></td>
                    <td style={{padding:"12px 14px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap" as const}}>
                        <button onClick={()=>setDetail(r)} style={{padding:"4px 9px",background:T.bg2,border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600,color:T.fgMuted}}><Eye style={{width:10,height:10,display:"inline"}}/></button>
                        {canManage&&<button onClick={()=>openNew(r)} style={{padding:"4px 9px",background:T.primaryBg,border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700,color:T.primary}}>Edit</button>}
                        {canManage&&r.status==="draft"&&<button onClick={()=>publish(r)} style={{display:"flex",alignItems:"center",gap:3,padding:"4px 9px",background:T.successBg,border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700,color:T.success}}>
                          <CheckCircle style={{width:9,height:9}}/> Publish
                        </button>}
                        {canManage&&r.status==="published"&&<button onClick={()=>close_(r)} style={{padding:"4px 9px",background:T.warningBg,border:"none",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:700,color:T.warning}}>Close</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.card,borderRadius:T.rXl,width:"min(680px,100%)",maxHeight:"92vh",overflowY:"auto",boxShadow:T.shadowLg}}>
            <div style={{padding:"14px 18px",background:T.primaryBg,borderBottom:`1px solid ${T.border}`,display:"flex",gap:10,alignItems:"center",position:"sticky",top:0,zIndex:1}}>
              <Gavel style={{width:16,height:16,color:T.primary}}/><span style={{fontSize:15,fontWeight:800,color:T.fg,flex:1}}>{editing?"Edit":"New"} Tender</span>
              <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{background:T.bg2,border:"none",borderRadius:T.r,padding:"4px 7px",cursor:"pointer",color:T.fgMuted,lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{gridColumn:"span 2"}}><LBL>Title *</LBL>{INP(form.title,v=>setForm(p=>({...p,title:v})),"e.g. Supply of Pharmaceutical Drugs Q1 2025/26")}</div>
                <div><LBL>Category</LBL>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={inpStyle}>
                    <option value="">Select category...</option>
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><LBL>Tender Type</LBL>
                  <select value={form.tender_type} onChange={e=>setForm(p=>({...p,tender_type:e.target.value}))} style={inpStyle}>
                    {TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><LBL>Estimated Value (KES)</LBL>{INP(form.estimated_value,v=>setForm(p=>({...p,estimated_value:v})),"0","number")}</div>
                <div><LBL>Contact Person</LBL>{INP(form.contact_person,v=>setForm(p=>({...p,contact_person:v})),"Name")}</div>
                <div><LBL>Opening Date</LBL>{INP(form.opening_date,v=>setForm(p=>({...p,opening_date:v})),"","date")}</div>
                <div><LBL>Closing Date *</LBL>{INP(form.closing_date,v=>setForm(p=>({...p,closing_date:v})),"","date")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Description</LBL>
                  <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} placeholder="Scope of work, items required..."
                    style={{...inpStyle,resize:"vertical"}}/>
                </div>
                <div style={{gridColumn:"span 2"}}><LBL>Evaluation Criteria</LBL>
                  <textarea value={form.evaluation_criteria} onChange={e=>setForm(p=>({...p,evaluation_criteria:e.target.value}))} rows={2} placeholder="How bids will be evaluated..."
                    style={{...inpStyle,resize:"vertical"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:8,borderTop:`1px solid ${T.border}`}}>
                <button onClick={()=>{setShowNew(false);setEditing(null);}} style={{padding:"9px 18px",background:T.bg2,border:`1px solid ${T.border}`,borderRadius:T.rMd,cursor:"pointer",fontSize:13,fontWeight:600,color:T.fgMuted}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 22px",background:T.primary,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontSize:13,fontWeight:800}}>
                  {saving?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Save style={{width:12,height:12}}/>} {saving?"Saving...":editing?"Update":"Create Tender"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail */}
      {detail&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.4)",zIndex:400,display:"flex",justifyContent:"flex-end"}} onClick={()=>setDetail(null)}>
          <div style={{width:"min(460px,100%)",background:T.card,height:"100%",overflowY:"auto",boxShadow:T.shadowLg}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 16px",background:T.primaryBg,borderBottom:`1px solid ${T.border}`,display:"flex",gap:8,alignItems:"center"}}>
              <Gavel style={{width:14,height:14,color:T.primary}}/><span style={{fontSize:14,fontWeight:800,color:T.fg,flex:1}}>{detail.tender_number}</span>
              <button onClick={()=>setDetail(null)} style={{background:T.bg2,border:"none",borderRadius:T.r,padding:"4px 6px",cursor:"pointer",color:T.fgMuted,lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
              <div><div style={{fontSize:18,fontWeight:800,color:T.fg,lineHeight:1.3}}>{detail.title}</div>
                <span className="status-chip" style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:sc(detail.status).bg,color:sc(detail.status).color,marginTop:6,display:"inline-block"}}>{sc(detail.status).label}</span>
              <div style={{display:"flex",justifyContent:"flex-end"}}><DocumentStamp status={detail.status} date={detail.created_at} size={100} rotate={-12} /></div>
              </div>
              {[["Category",detail.category||"-"],["Type",detail.tender_type||"-"],["Estimated Value",detail.estimated_value?fmtKES(detail.estimated_value):"-"],["Opening Date",fmtDate(detail.opening_date)],["Closing Date",fmtDate(detail.closing_date)],["Contact",detail.contact_person||"-"],["Created By",detail.created_by_name||"-"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:12,color:T.fgDim,fontWeight:600}}>{l}</span>
                  <span style={{fontSize:13,fontWeight:700,color:T.fg,textAlign:"right",maxWidth:"60%"}}>{v}</span>
                </div>
              ))}
              {detail.description&&<div><div style={{fontSize:12,fontWeight:700,color:T.fgDim,marginBottom:5,textTransform:"uppercase"}}>Description</div>
                <p style={{fontSize:14,color:T.fgMuted,lineHeight:1.7,margin:0}}>{detail.description}</p>
              </div>}
              {detail.evaluation_criteria&&<div><div style={{fontSize:12,fontWeight:700,color:T.fgDim,marginBottom:5,textTransform:"uppercase"}}>Evaluation Criteria</div>
                <p style={{fontSize:14,color:T.fgMuted,lineHeight:1.7,margin:0}}>{detail.evaluation_criteria}</p>
              </div>}
              <div style={{marginBottom:8}}><PushToApprovalButton
                documentType="tender"
                documentId={detail.id}
                documentNumber={detail.tender_number||detail.reference||"TENDER"}
                documentTitle={detail.title||"Tender"}
                department={detail.department||"Procurement"}
                amount={Number(detail.estimated_value||0)}
                currentStatus={detail.status}
                size="sm"
                onPushed={()=>{setDetail(null);load();}}
              /></div>
              {canManage&&detail.status==="draft"&&<button onClick={()=>{publish(detail);setDetail(null);}} style={{width:"100%",padding:"11px",background:T.success,color:"#fff",border:"none",borderRadius:T.rMd,cursor:"pointer",fontSize:14,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <CheckCircle style={{width:14,height:14}}/> Publish Tender
              </button>}
            </div>
          </div>
        </div>
      )}
      <style>{`${spinKeyframes}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
