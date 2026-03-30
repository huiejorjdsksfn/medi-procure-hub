import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, Scale, RefreshCw, Star, Edit, X, Save, Trophy, TrendingUp, Award } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE")}`;
const totalScore = (t:number,f:number) => Math.round((t*0.7 + f*0.3)*100)/100;

const S_CFG:Record<string,{bg:string;color:string;label:string}> = {
  evaluated:   {bg:"#dbeafe",color:"#1d4ed8",label:"Evaluated"},
  recommended: {bg:"#dcfce7",color:"#15803d",label:"Recommended"},
  awarded:     {bg:"#fef3c7",color:"#92400e",label:"Awarded"},
  rejected:    {bg:"#fee2e2",color:"#dc2626",label:"Rejected"},
};
const sc = (s:string) => S_CFG[s]||{bg:"#f3f4f6",color:"#6b7280",label:s||"Draft"};

const INP = (v:any,cb:any,p="",t="text",min?:any,max?:any) => (
  <input type={t} value={v} onChange={e=>cb(e.target.value)} placeholder={p} min={min} max={max}
    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",background:"#fff"}}
    onFocus={e=>(e.target as HTMLInputElement).style.borderColor="#1a3a6b"}
    onBlur={e=>(e.target as HTMLInputElement).style.borderColor="#e5e7eb"}/>
);
const SEL = (v:any,cb:any,opts:{value:string;label:string}[],p="Select...") => (
  <select value={v} onChange={e=>cb(e.target.value)}
    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",background:"#fff"}}>
    <option value="">{p}</option>
    {opts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);
const LBL = ({children}:{children:any}) => <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:5,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{children}</div>;

export default function BidEvaluationsPage() {
  const { user, profile, hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const canEvaluate = hasRole("admin")||hasRole("procurement_manager")||hasRole("procurement_officer");

  const [rows,      setRows]      = useState<any[]>([]);
  const [tenders,   setTenders]   = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [tFilter,   setTFilter]   = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState<any>(null);
  const [saving,    setSaving]    = useState(false);
  const [detail,    setDetail]    = useState<any>(null);
  const [form,setForm] = useState({tender_id:"",supplier_id:"",bid_amount:"",technical_score:"",financial_score:"",recommendation:"",notes:""});

  const load = async () => {
    setLoading(true);
    const [e,t,s] = await Promise.all([
      (supabase as any).from("bid_evaluations").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("tenders").select("id,tender_number,title").order("tender_number"),
      (supabase as any).from("suppliers").select("id,name").order("name"),
    ]);
    setRows(e.data||[]); setTenders(t.data||[]); setSuppliers(s.data||[]); setLoading(false);
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{
    const ch=(supabase as any).channel("bid-eval-rt").on("postgres_changes",{event:"*",schema:"public",table:"bid_evaluations"},load).subscribe();
    return ()=>(supabase as any).removeChannel(ch);
  },[]);

  const openNew = (v?:any) => {
    if(v){ setEditing(v); setForm({tender_id:v.tender_id||"",supplier_id:v.supplier_id||"",bid_amount:String(v.bid_amount||""),technical_score:String(v.technical_score||""),financial_score:String(v.financial_score||""),recommendation:v.recommendation||"",notes:v.notes||""}); }
    else { setEditing(null); setForm({tender_id:"",supplier_id:"",bid_amount:"",technical_score:"",financial_score:"",recommendation:"",notes:""}); }
    setShowModal(true);
  };
  const save = async () => {
    if(!form.tender_id||!form.supplier_id){ toast({title:"Select tender and supplier",variant:"destructive"}); return; }
    setSaving(true);
    const t=tenders.find(x=>x.id===form.tender_id), s=suppliers.find(x=>x.id===form.supplier_id);
    const ts=Number(form.technical_score||0), fs=Number(form.financial_score||0);
    const payload = {tender_id:form.tender_id,tender_number:t?.tender_number,supplier_id:form.supplier_id,supplier_name:s?.name,
      bid_amount:Number(form.bid_amount||0),technical_score:ts,financial_score:fs,total_score:totalScore(ts,fs),
      recommendation:form.recommendation,notes:form.notes,evaluated_by:user?.id,evaluated_by_name:profile?.full_name,
      evaluated_at:new Date().toISOString(),status:"evaluated"};
    if(editing){
      const{error}=await(supabase as any).from("bid_evaluations").update(payload).eq("id",editing.id);
      if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});setSaving(false);return;}
      toast({title:"Evaluation updated ✓"});
    } else {
      const{data,error}=await(supabase as any).from("bid_evaluations").insert(payload).select().single();
      if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});setSaving(false);return;}
      logAudit(user?.id,profile?.full_name,"create","bid_evaluations",data?.id,{});
      toast({title:"Bid evaluated ✓"});
    }
    setShowModal(false); setEditing(null); load(); setSaving(false);
  };
  const recommend = async (v:any) => {
    await(supabase as any).from("bid_evaluations").update({status:"recommended"}).eq("id",v.id);
    toast({title:"Recommended for award ✓"}); load();
  };

  const tOpts = tenders.map(t=>({value:t.id,label:`${t.tender_number} — ${t.title?.slice(0,30)}`}));
  const sOpts = suppliers.map(s=>({value:s.id,label:s.name}));
  const tFilterOpts = [{value:"all",label:"All Tenders"},...[...new Set(rows.map(r=>r.tender_id))].map(id=>({value:id,label:rows.find(r=>r.tender_id===id)?.tender_number||id}))];
  const filtered = rows.filter(r=>(tFilter==="all"||r.tender_id===tFilter)&&(!search||[r.supplier_name,r.tender_number].some(v=>(v||"").toLowerCase().includes(search.toLowerCase()))));

  const ts=Number(form.technical_score||0), fs=Number(form.financial_score||0);
  const previewScore = form.technical_score&&form.financial_score ? totalScore(ts,fs) : null;

  // Stats
  const avg = rows.length ? (rows.reduce((s,r)=>s+Number(r.total_score||0),0)/rows.length).toFixed(1) : "—";
  const recommended = rows.filter(r=>r.status==="recommended").length;
  const highest = rows.length ? Math.max(...rows.map(r=>Number(r.total_score||0))).toFixed(1) : "—";

  return (
      <div style={{padding:"20px 24px",maxWidth:1400,margin:"0 auto"}}>
      {/* KPI TILES */}
      <div style={{display:"grid" as const,gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
        {[
          {label:"Total Evaluations",val:rows.length,bg:"#c0392b"},
          {label:"Recommended",val:recommended,bg:"#0e6655"},
          {label:"Avg Score",val:avg,bg:"#7d6608"},
          {label:"Highest Score",val:highest,bg:"#6c3483"},
          {label:"Showing",val:filtered.length,bg:"#1a252f"},
        ].map(k=>(
          <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center" as const,background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
            <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
          </div>
        ))}
      </div>
      {/* Header */}
      <div style={{display:"flex" as const,alignItems:"flex-start" as const,justifyContent:"space-between" as const,marginBottom:20,flexWrap:"wrap" as const,gap:12}}>
        <div>
          <div style={{display:"flex" as const,alignItems:"center" as const,gap:10}}>
            <div style={{width:42,height:42,borderRadius:10,background:"linear-gradient(135deg,#c0185a,#e91e8c)",display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const}}>
              <Scale style={{width:20,height:20,color:"#fff"}}/>
            </div>
            <div>
              <h1 style={{fontSize:22,fontWeight:900,color:"#111827",margin:0}}>Bid Evaluations</h1>
              <p style={{fontSize:13,color:"#6b7280",margin:0}}>Tender scoring · 70% technical / 30% financial</p>
            </div>
          </div>
        </div>
        <div style={{display:"flex" as const,gap:8}}>
          <button onClick={load} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"9px 14px",background:"#f3f4f6",border:"1.5px solid #e5e7eb",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:600}}>
            <RefreshCw style={{width:13,height:13}}/> Refresh
          </button>
          {canEvaluate&&<button onClick={()=>openNew()} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"9px 18px",background:"linear-gradient(135deg,#c0185a,#e91e8c)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:800,boxShadow:"0 2px 8px rgba(192,24,90,0.3)"}}>
            <Plus style={{width:14,height:14}}/> Evaluate Bid
          </button>}
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,padding:"12px 16px",marginBottom:16,display:"flex" as const,gap:10,flexWrap:"wrap" as const,alignItems:"center" as const}}>
        <div style={{position:"relative" as const,flex:1,minWidth:200}}>
          <Search style={{position:"absolute" as const,left:10,top:"50%",transform:"translateY(-50%)",width:13,height:13,color:"#9ca3af"}}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search supplier, tender..."
            style={{width:"100%",padding:"8px 10px 8px 30px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none"}}/>
        </div>
        <select value={tFilter} onChange={e=>setTFilter(e.target.value)} style={{padding:"8px 12px",fontSize:13,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",minWidth:200}}>
          {tFilterOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{background:"#fff",border:"1.5px solid #e5e7eb",borderRadius:12,overflow:"hidden" as const,boxShadow:"0 2px 8px rgba(0,0,0,0.04)"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)"}}>
              {["Tender Ref","Supplier","Bid Amount","Technical","Financial","Total Score","Status","Actions"].map(h=>(
                <th key={h} style={{padding:"11px 14px",textAlign:"left" as const,fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.8)",textTransform:"uppercase" as const,letterSpacing:"0.06em",whiteSpace:"nowrap" as const}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?[1,2,3].map(i=>(
              <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                {[1,2,3,4,5,6,7,8].map(j=><td key={j} style={{padding:"14px"}}><div style={{height:12,background:"#f3f4f6",borderRadius:4,animation:"pulse 1.5s infinite"}}/></td>)}
              </tr>
            )):filtered.length===0?(
              <tr><td colSpan={8} style={{padding:"60px",textAlign:"center" as const,color:"#9ca3af",fontSize:14}}>
                <Scale style={{width:40,height:40,color:"#e5e7eb",margin:"0 auto 12px"}}/>
                <div style={{fontWeight:600}}>No evaluations yet</div>
                <div style={{fontSize:12,marginTop:4}}>Evaluate bids from tenders above</div>
              </td></tr>
            ):filtered.map(r=>{
              const cfg=sc(r.status); const score=Number(r.total_score||0);
              return (
                <tr key={r.id} style={{borderBottom:"1px solid #f9fafb",cursor:"pointer" as const}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#fafafa"}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="#fff"}
                  onClick={()=>setDetail(r)}>
                  <td style={{padding:"13px 14px",fontSize:13,fontWeight:800,color:"#c0185a",fontFamily:"monospace"}}>{r.tender_number}</td>
                  <td style={{padding:"13px 14px",fontSize:13,fontWeight:600,color:"#111827"}}>{r.supplier_name}</td>
                  <td style={{padding:"13px 14px",fontSize:13,color:"#374151"}}>{fmtKES(r.bid_amount)}</td>
                  <td style={{padding:"13px 14px"}}>
                    <div style={{display:"flex" as const,alignItems:"center" as const,gap:6}}>
                      <div style={{width:48,height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden" as const}}>
                        <div style={{width:`${r.technical_score||0}%`,height:"100%",background:"#3b82f6",borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:"#1d4ed8"}}>{r.technical_score||0}</span>
                    </div>
                  </td>
                  <td style={{padding:"13px 14px"}}>
                    <div style={{display:"flex" as const,alignItems:"center" as const,gap:6}}>
                      <div style={{width:48,height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden" as const}}>
                        <div style={{width:`${r.financial_score||0}%`,height:"100%",background:"#10b981",borderRadius:3}}/>
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:"#059669"}}>{r.financial_score||0}</span>
                    </div>
                  </td>
                  <td style={{padding:"13px 14px"}}>
                    <span style={{fontSize:20,fontWeight:900,color:score>=70?"#15803d":score>=50?"#d97706":"#dc2626"}}>{score.toFixed(1)}</span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>/100</span>
                  </td>
                  <td style={{padding:"13px 14px"}}><span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:cfg.bg,color:cfg.color}}>{cfg.label}</span></td>
                  <td style={{padding:"13px 14px"}} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex" as const,gap:5}}>
                      {canEvaluate&&<button onClick={()=>openNew(r)} style={{padding:"5px 10px",background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer" as const,fontSize:11,fontWeight:700,color:"#1d4ed8"}}>Edit</button>}
                      {canEvaluate&&r.status==="evaluated"&&<button onClick={()=>recommend(r)} style={{display:"flex" as const,alignItems:"center" as const,gap:4,padding:"5px 10px",background:"#dcfce7",border:"1px solid #bbf7d0",borderRadius:6,cursor:"pointer" as const,fontSize:11,fontWeight:700,color:"#15803d"}}>
                        <Star style={{width:10,height:10}}/> Recommend
                      </button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.55)",zIndex:500,display:"flex" as const,alignItems:"center" as const,justifyContent:"center" as const,padding:16}}>
          <div style={{background:"#fff",borderRadius:14,width:"min(600px,100%)",maxHeight:"90vh",overflowY:"auto" as const,boxShadow:"0 24px 64px rgba(0,0,0,0.25)"}}>
            <div style={{padding:"14px 18px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:"14px 14px 0 0",display:"flex" as const,alignItems:"center" as const,gap:10}}>
              <Scale style={{width:16,height:16,color:"#fff"}}/>
              <span style={{fontSize:15,fontWeight:800,color:"#fff",flex:1}}>{editing?"Edit":"New"} Bid Evaluation</span>
              <button onClick={()=>{setShowModal(false);setEditing(null);}} style={{background:"#e2e8f0",border:"none",borderRadius:6,padding:"4px 7px",cursor:"pointer" as const,color:"#fff",lineHeight:0}}><X style={{width:13,height:13}}/></button>
            </div>
            <div style={{padding:20,display:"flex" as const,flexDirection:"column" as const,gap:14}}>
              <div style={{display:"grid" as const,gridTemplateColumns:"1fr 1fr",gap:14}}>
                <div style={{gridColumn:"span 2"}}><LBL>Tender *</LBL>{SEL(form.tender_id,v=>setForm(p=>({...p,tender_id:v})),tOpts,"Select tender...")}</div>
                <div style={{gridColumn:"span 2"}}><LBL>Supplier *</LBL>{SEL(form.supplier_id,v=>setForm(p=>({...p,supplier_id:v})),sOpts,"Select supplier...")}</div>
                <div><LBL>Bid Amount (KES)</LBL>{INP(form.bid_amount,v=>setForm(p=>({...p,bid_amount:v})),"0","number",0)}</div>
                <div/>
                <div>
                  <LBL>Technical Score (0-100) — 70% weight</LBL>
                  {INP(form.technical_score,v=>setForm(p=>({...p,technical_score:v})),"0-100","number",0,100)}
                  {form.technical_score&&<div style={{marginTop:4,height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden" as const}}><div style={{width:`${Math.min(100,Number(form.technical_score))}%`,height:"100%",background:"#3b82f6",transition:"width 0.3s",borderRadius:3}}/></div>}
                </div>
                <div>
                  <LBL>Financial Score (0-100) — 30% weight</LBL>
                  {INP(form.financial_score,v=>setForm(p=>({...p,financial_score:v})),"0-100","number",0,100)}
                  {form.financial_score&&<div style={{marginTop:4,height:6,background:"#e5e7eb",borderRadius:3,overflow:"hidden" as const}}><div style={{width:`${Math.min(100,Number(form.financial_score))}%`,height:"100%",background:"#10b981",transition:"width 0.3s",borderRadius:3}}/></div>}
                </div>
                {previewScore!==null&&(
                  <div style={{gridColumn:"span 2",padding:"14px",background:"linear-gradient(135deg,#1a3a6b14,#0078d414)",border:"2px solid #1a3a6b30",borderRadius:10,textAlign:"center" as const}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#6b7280",textTransform:"uppercase" as const,letterSpacing:"0.06em",marginBottom:4}}>Weighted Total Score</div>
                    <div style={{fontSize:40,fontWeight:900,color:previewScore>=70?"#15803d":previewScore>=50?"#d97706":"#dc2626"}}>{previewScore.toFixed(2)}</div>
                    <div style={{fontSize:12,color:"#9ca3af"}}>out of 100 · {previewScore>=70?"Meets threshold":"Below 70% threshold"}</div>
                  </div>
                )}
                <div style={{gridColumn:"span 2"}}><LBL>Recommendation</LBL>
                  <textarea value={form.recommendation} onChange={e=>setForm(p=>({...p,recommendation:e.target.value}))} rows={2} placeholder="Evaluator's recommendation..."
                    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",resize:"vertical" as const,fontFamily:"inherit"}}/>
                </div>
                <div style={{gridColumn:"span 2"}}><LBL>Notes</LBL>
                  <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Additional notes..."
                    style={{width:"100%",padding:"9px 12px",fontSize:14,border:"1.5px solid #e5e7eb",borderRadius:8,outline:"none",resize:"vertical" as const,fontFamily:"inherit"}}/>
                </div>
              </div>
              <div style={{display:"flex" as const,gap:8,justifyContent:"flex-end" as const,paddingTop:6,borderTop:"1px solid #f3f4f6"}}>
                <button onClick={()=>{setShowModal(false);setEditing(null);}} style={{padding:"9px 18px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:600}}>Cancel</button>
                <button onClick={save} disabled={saving} style={{display:"flex" as const,alignItems:"center" as const,gap:6,padding:"9px 20px",background:"linear-gradient(135deg,#c0185a,#e91e8c)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer" as const,fontSize:13,fontWeight:800}}>
                  {saving?<RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>:<Save style={{width:12,height:12}}/>} {saving?"Saving...":editing?"Update":"Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {detail&&(
        <div style={{position:"fixed" as const,inset:0,background:"rgba(0,0,0,0.4)",zIndex:400,display:"flex" as const,justifyContent:"flex-end" as const}} onClick={()=>setDetail(null)}>
          <div style={{width:"min(420px,100%)",background:"#fff",height:"100%",overflowY:"auto" as const,boxShadow:"-4px 0 24px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 16px",background:"linear-gradient(135deg,#0a2558,#1a3a6b)",display:"flex" as const,alignItems:"center" as const,gap:8}}>
              <Scale style={{width:14,height:14,color:"#fff"}}/><span style={{fontSize:14,fontWeight:800,color:"#fff",flex:1}}>Evaluation Detail</span>
              <button onClick={()=>setDetail(null)} style={{background:"#e2e8f0",border:"none",borderRadius:5,padding:"4px 6px",cursor:"pointer" as const,color:"#fff",lineHeight:0}}><X style={{width:12,height:12}}/></button>
            </div>
            <div style={{padding:18,display:"flex" as const,flexDirection:"column" as const,gap:12}}>
              <div style={{textAlign:"center" as const,padding:"20px",background:"linear-gradient(135deg,#f0f9ff,#eff6ff)",borderRadius:12}}>
                <div style={{fontSize:14,fontWeight:700,color:"#9ca3af",marginBottom:4}}>TOTAL SCORE</div>
                <div style={{fontSize:56,fontWeight:900,color:Number(detail.total_score||0)>=70?"#15803d":Number(detail.total_score||0)>=50?"#d97706":"#dc2626"}}>{Number(detail.total_score||0).toFixed(1)}</div>
                <div style={{fontSize:12,color:"#9ca3af"}}>/100</div>
              </div>
              {[["Tender",detail.tender_number],["Supplier",detail.supplier_name],["Bid Amount",fmtKES(detail.bid_amount)],["Technical Score",`${detail.technical_score||0}/100 (70% weight)`],["Financial Score",`${detail.financial_score||0}/100 (30% weight)`],["Status",detail.status],["Evaluated By",detail.evaluated_by_name],["Evaluated At",detail.evaluated_at?new Date(detail.evaluated_at).toLocaleString("en-KE"):"—"],["Recommendation",detail.recommendation||"—"],["Notes",detail.notes||"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex" as const,flexDirection:"column" as const,gap:2}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#9ca3af",textTransform:"uppercase" as const,letterSpacing:"0.06em"}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
  );
}
