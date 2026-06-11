import type React from "react";
/**
 * EL5 MediProcure — Budgets v12 — ERP theme, all buttons wired
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

const db = supabase as any;
interface Budget {
  id:string;budget_name?:string;fiscal_year?:string;total_budget?:number;
  spent?:number;remaining?:number;department?:string;status?:string;
  created_at:string;description?:string;vote_head?:string;
}

function fmtK(n?:number|null){const v=n||0;if(v>=1_000_000)return`KES ${(v/1_000_000).toFixed(2)}M`;if(v>=1_000)return`KES ${(v/1_000).toFixed(2)}K`;return`KES ${v.toLocaleString("en-KE",{minimumFractionDigits:2})}`;}
function fmtDate(s?:string|null){return s?new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";}

const DEPARTMENTS=["Finance & Accounts","Procurement","Pharmacy","Nursing","Medical","Laboratory","Radiology","ICT","Administration","Maintenance"];

export default function BudgetsPage() {
  const navigate=useNavigate();
  const [budgets,setBudgets]=useState<Budget[]>([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [deptFilter,setDeptFilter]=useState("ALL");
  const [showNew,setShowNew]=useState(false);
  const [saving,setSaving]=useState(false);
  const [editBudget,setEditBudget]=useState<Budget|null>(null);
  const [form,setForm]=useState({budget_name:"",fiscal_year:new Date().getFullYear().toString(),total_budget:"",department:"Finance & Accounts",description:"",vote_head:""});

  const fetch=useCallback(async()=>{
    setLoading(true);
    const {data}=await db.from("budgets").select("*").order("created_at",{ascending:false}).limit(200);
    setBudgets(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{fetch();},[fetch]);

  async function save(){
    if(!form.budget_name||!form.total_budget){toast({title:"Name and amount required",variant:"destructive"});return;}
    setSaving(true);
    const total=parseFloat(form.total_budget);
    if(editBudget){
      const {error}=await db.from("budgets").update({budget_name:form.budget_name,fiscal_year:form.fiscal_year,total_budget:total,department:form.department,description:form.description,vote_head:form.vote_head,remaining:total-(editBudget.spent||0),updated_at:new Date().toISOString()}).eq("id",editBudget.id);
      setSaving(false);
      if(error){toast({title:"Error: "+error.message,variant:"destructive"});return;}
      toast({title:"✓ Budget updated"});
      setEditBudget(null);setShowNew(false);
    } else {
      const {error}=await db.from("budgets").insert({budget_name:form.budget_name,fiscal_year:form.fiscal_year,total_budget:total,spent:0,remaining:total,department:form.department,description:form.description,vote_head:form.vote_head,status:"active"});
      setSaving(false);
      if(error){toast({title:"Error: "+error.message,variant:"destructive"});return;}
      toast({title:`✓ Budget "${form.budget_name}" created`});
      setShowNew(false);
    }
    setForm({budget_name:"",fiscal_year:new Date().getFullYear().toString(),total_budget:"",department:"Finance & Accounts",description:"",vote_head:""});
    fetch();
  }

  async function toggleStatus(id:string,current:string){
    const ns=current==="active"?"frozen":"active";
    const {error}=await db.from("budgets").update({status:ns}).eq("id",id);
    if(!error){toast({title:`✓ Budget ${ns}`});fetch();}
    else toast({title:"Error: "+error.message,variant:"destructive"});
  }

  async function deleteBudget(id:string){
    if(!window.confirm("Delete this budget?"))return;
    const {error}=await db.from("budgets").delete().eq("id",id);
    if(!error){toast({title:"✓ Budget deleted"});fetch();}
  }

  function exportCSV(){
    const rows=["Name,Fiscal Year,Department,Vote Head,Total Budget,Spent,Remaining,Utilisation%,Status",
      ...filtered.map(b=>`${b.budget_name||""},${b.fiscal_year||""},${b.department||""},${b.vote_head||""},${b.total_budget||0},${b.spent||0},${b.remaining||0},${b.total_budget?Math.round(((b.spent||0)/b.total_budget)*100):0}%,${b.status||""}`)
    ];
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="budgets.csv";a.click();
    URL.revokeObjectURL(url);toast({title:"✓ Exported"});
  }

  const filtered=budgets.filter(b=>{
    const q=search.toLowerCase();
    const ms=!search||[b.budget_name,b.department,b.vote_head,b.fiscal_year].some(f=>f?.toLowerCase().includes(q));
    const md=deptFilter==="ALL"||b.department===deptFilter;
    return ms&&md;
  });

  const totalBudget=filtered.reduce((s,b)=>s+(b.total_budget||0),0);
  const totalSpent=filtered.reduce((s,b)=>s+(b.spent||0),0);
  const totalRemaining=filtered.reduce((s,b)=>s+(b.remaining||0),0);
  const inp:React.CSSProperties={padding:"2px 5px",border:`1px solid ${ERP.btnBorder||"#a29d7f"}`,borderRadius:2,fontSize:11,fontFamily:ERP.fontFamily,background:"#fff",outline:"none",width:"100%",boxSizing:"border-box" as const};

  return (
    <div style={{background:"#f0f0f0",minHeight:"100vh",fontFamily:ERP.fontFamily,fontSize:11}}>
      <div style={{background:ERP.titleBar,color:"#fff",padding:"5px 10px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${ERP.titleBarBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>💰</span>
          <div><div>EL5 MediProcure — Budgets</div><div style={{fontSize:10,fontWeight:400,opacity:.85}}>Embu Level 5 Hospital · Budget Allocation & Control</div></div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {["–","□","✕"].map((c,i)=><button key={i} onClick={i===2?()=>navigate("/accountant"):undefined} style={{width:21,height:21,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,cursor:"pointer",fontSize:11,color:"#333",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{c}</button>)}
        </div>
      </div>

      <div style={{...erpStyles.toolbar,padding:"5px 10px",gap:8}}>
        <button onClick={fetch} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button onClick={()=>{setEditBudget(null);setShowNew(v=>!v);}} style={erpStyles.btn(true)}>+ New Budget</button>
          <button onClick={exportCSV} style={erpStyles.btn(false)}>📤 Export</button>
          <button onClick={()=>navigate("/accountant")} style={erpStyles.btn(false)}>◀ Workspace</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:"flex",borderBottom:"1px solid #aaa"}}>
        {[
          {label:"TOTAL BUDGET",val:fmtK(totalBudget),col:"#004085"},
          {label:"SPENT",val:fmtK(totalSpent),col:"#856404"},
          {label:"REMAINING",val:fmtK(totalRemaining),col:"#155724"},
          {label:"UTILISATION",val:totalBudget?`${Math.round(totalSpent/totalBudget*100)}%`:"0%",col:totalBudget&&totalSpent/totalBudget>0.9?"#721c24":totalBudget&&totalSpent/totalBudget>0.7?"#856404":"#155724"},
          {label:"BUDGETS",val:filtered.length,col:"#1a1a1a"},
        ].map((k,i)=>(
          <div key={i} style={{flex:1,padding:"10px 16px",borderRight:i<4?"1px solid #aaa":"none",background:i%2===0?"#fff":"#f5f4ea"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{color:"#8b0000",fontWeight:700,fontSize:11}}>–</span>
              <span style={{fontWeight:800,fontSize:16,color:k.col}}>{k.val}</span>
            </div>
            <div style={{fontSize:9,color:"#666",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.06em",marginTop:1}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* New/Edit Form */}
      {showNew&&(
        <div style={{background:"#f5f4ea",borderBottom:"1px solid #ccc",padding:"10px 14px"}}>
          <div style={{fontWeight:700,fontSize:11,color:"#004085",marginBottom:8}}>💰 {editBudget?"Edit":"New"} Budget</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            <div style={{gridColumn:"span 2"}}><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Budget Name *</label><input value={form.budget_name} onChange={e=>setForm(p=>({...p,budget_name:e.target.value}))} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Fiscal Year</label><input value={form.fiscal_year} onChange={e=>setForm(p=>({...p,fiscal_year:e.target.value}))} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Total Budget (KES) *</label><input type="number" value={form.total_budget} onChange={e=>setForm(p=>({...p,total_budget:e.target.value}))} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Department</label>
            <select value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))} style={inp}>
              {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
            </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Vote Head</label><input value={form.vote_head} onChange={e=>setForm(p=>({...p,vote_head:e.target.value}))} placeholder="e.g. 2210100" style={inp}/></div>
            <div style={{gridColumn:"span 2"}}><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Description</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={inp}/></div>
          </div>
          <div style={{marginTop:8,display:"flex",gap:6}}>
            <button onClick={save} disabled={saving} style={erpStyles.btn(true)}>{saving?"⏳ Saving…":"💾 Save Budget"}</button>
            <button onClick={()=>{setShowNew(false);setEditBudget(null);}} style={erpStyles.btn(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter + Grid */}
      <div style={{margin:"6px 8px"}}>
        <div style={{background:"#f5f4ea",border:"1px solid #ccc",padding:"4px 8px",marginBottom:4,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search budgets…" style={{...inp,width:200,boxSizing:"border-box" as const}}/>
          <span style={{color:"#555"}}>Department:</span>
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{...inp,width:"auto",boxSizing:"border-box" as const}}>
            <option>ALL</option>
            {DEPARTMENTS.map(d=><option key={d}>{d}</option>)}
          </select>
          <span style={{marginLeft:"auto",fontSize:10,color:"#888"}}>{filtered.length} budgets</span>
          <button onClick={exportCSV} style={erpStyles.btn(true)}>Extract →</button>
        </div>
        <div style={{background:"#fff",border:"1px solid #ccc",maxHeight:"calc(100vh - 240px)",overflow:"auto"}}>
          {loading?<div style={{padding:30,textAlign:"center",color:"#888"}}>Loading…</div>:(
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:ERP.fontFamily,fontSize:11}}>
              <thead><tr>
                {["Budget Name","Dept.","FY","Vote Head","Total Budget","Spent","Remaining","Utilisation","Status",""].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((b,i)=>{
                  const pct=b.total_budget?Math.min(100,Math.round(((b.spent||0)/b.total_budget)*100)):0;
                  const col=pct>=90?"#dc3545":pct>=70?"#fd7e14":"#28a745";
                  return(
                    <tr key={b.id} style={{background:i%2===0?"#fff":"#f7f7f7"}} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                      <td style={{...erpStyles.gridTd,fontWeight:700,color:"#00008b"}}>{b.budget_name||"—"}</td>
                      <td style={erpStyles.gridTd}>{b.department||"—"}</td>
                      <td style={erpStyles.gridTd}>{b.fiscal_year||"—"}</td>
                      <td style={{...erpStyles.gridTd,fontFamily:"monospace",fontSize:10}}>{b.vote_head||"—"}</td>
                      <td style={{...erpStyles.gridTd,fontWeight:700}}>{fmtK(b.total_budget)}</td>
                      <td style={{...erpStyles.gridTd,color:"#856404"}}>{fmtK(b.spent)}</td>
                      <td style={{...erpStyles.gridTd,fontWeight:700,color:"#155724"}}>{fmtK(b.remaining)}</td>
                      <td style={erpStyles.gridTd}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <div style={{flex:1,height:9,background:"#e9ecef",border:"1px solid #ccc",borderRadius:2}}>
                            <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:2}}/>
                          </div>
                          <span style={{fontSize:9,color:col,fontWeight:700,minWidth:28}}>{pct}%</span>
                        </div>
                      </td>
                      <td style={erpStyles.gridTd}>
                        <span style={{display:"inline-block",padding:"1px 6px",borderRadius:2,fontSize:10,fontWeight:700,background:b.status==="active"?"#d4edda":b.status==="frozen"?"#cce5ff":"#e9ecef",color:b.status==="active"?"#155724":b.status==="frozen"?"#004085":"#495057",border:`1px solid ${b.status==="active"?"#c3e6cb":b.status==="frozen"?"#b8daff":"#ced4da"}`,textTransform:"uppercase" as const}}>{b.status||"active"}</span>
                      </td>
                      <td style={erpStyles.gridTd}>
                        <div style={{display:"flex",gap:3}}>
                          <button onClick={()=>{setEditBudget(b);setForm({budget_name:b.budget_name||"",fiscal_year:b.fiscal_year||"",total_budget:String(b.total_budget||0),department:b.department||"",description:b.description||"",vote_head:b.vote_head||""});setShowNew(true);}} style={{...erpStyles.btn(false),fontSize:10,padding:"2px 7px"}}>✏️ Edit</button>
                          <button onClick={()=>toggleStatus(b.id,b.status||"active")} style={{...erpStyles.btn(false),fontSize:10,padding:"2px 7px",color:(b.status||"active")==="active"?"#856404":"#155724"}}>{(b.status||"active")==="active"?"❄ Freeze":"▶ Activate"}</button>
                          <button onClick={()=>deleteBudget(b.id)} style={{...erpStyles.btn(false),fontSize:10,padding:"2px 7px",color:"#721c24"}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length===0&&<tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#888"}}>No budget records. Click '+ New Budget' to create one.</td></tr>}
              </tbody>
              <tfoot>
                <tr style={{background:"#f5f4ea",fontWeight:700}}>
                  <td colSpan={4} style={{...erpStyles.gridTd,textAlign:"right",color:"#555",fontSize:10}}>TOTALS:</td>
                  <td style={{...erpStyles.gridTd,fontWeight:800}}>{fmtK(totalBudget)}</td>
                  <td style={{...erpStyles.gridTd,color:"#856404",fontWeight:800}}>{fmtK(totalSpent)}</td>
                  <td style={{...erpStyles.gridTd,color:"#155724",fontWeight:800}}>{fmtK(totalRemaining)}</td>
                  <td colSpan={3} style={{...erpStyles.gridTd,color:totalBudget&&totalSpent/totalBudget>0.9?"#721c24":"#1a1a1a"}}>{totalBudget?`${Math.round(totalSpent/totalBudget*100)}% utilised`:""}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#e0e0e0",borderTop:"1px solid #aaa",padding:"2px 10px",fontSize:10,color:"#555",display:"flex",gap:14}}>
        <span>Budgets: {filtered.length}</span><span>|</span>
        <span>Total: {fmtK(totalBudget)}</span><span>|</span>
        <span>Remaining: {fmtK(totalRemaining)}</span>
        <span style={{marginLeft:"auto"}}>EL5 MediProcure v12 · Budgets</span>
      </div>
    </div>
  );
}
