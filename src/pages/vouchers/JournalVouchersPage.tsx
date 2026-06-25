import type React from "react";
/**
 * EL5 MediProcure — Journal Vouchers v12 — Windows XP/ERP theme, all buttons wired
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";
import { DocumentStamp } from "@/components/DocumentStamp";

const db = supabase as any;
interface JournalEntry {
  id: string; reference?: string; description?: string; gl_account?: string;
  debit?: number; credit?: number; status?: string; created_at: string;
  posted_by?: string; posted_by_name?: string; fiscal_year?: string; period?: string; narration?: string;
}

function fmtK(n?:number|null){const v=n||0;if(v>=1_000_000)return`KES ${(v/1_000_000).toFixed(2)}M`;if(v>=1_000)return`KES ${(v/1_000).toFixed(2)}K`;return`KES ${v.toLocaleString("en-KE",{minimumFractionDigits:2})}`;}
function fmtDate(s?:string|null){return s?new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}):"—";}
function StatusChip({status}:{status:string}){
  const m:Record<string,{bg:string;color:string;border:string}>={
    posted:{bg:"#d4edda",color:"#155724",border:"#c3e6cb"},
    draft:{bg:"#e9ecef",color:"#495057",border:"#ced4da"},
    reversed:{bg:"#f8d7da",color:"#721c24",border:"#f5c6cb"},
    pending:{bg:"#fff3cd",color:"#856404",border:"#ffc107"},
  };
  const s=m[status?.toLowerCase()]||{bg:"#e9ecef",color:"#495057",border:"#ced4da"};
  return <span style={{display:"inline-block",padding:"1px 6px",borderRadius:2,fontSize:10,fontWeight:700,background:s.bg,color:s.color,border:`1px solid ${s.border}`,textTransform:"uppercase" as const,fontFamily:ERP.fontFamily}}>{status}</span>;
}

const COA_OPTS = ["1001 - Cash & Cash Equivalents","1010 - KCB Operating Account","1011 - Co-op Bank Account","2000 - Accounts Payable","2100 - Salaries Payable","3000 - MOH Grant Revenue","3100 - NHIF Revenue","4000 - Salaries & Wages","4100 - Medical Supplies Expense","4200 - Utilities Expense","4300 - Maintenance & Repairs","5000 - Retained Earnings"];

export default function JournalVouchersPage() {
  const {user, profile} = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({reference:"",description:"",gl_account:"4000 - Salaries & Wages",debit:"",credit:"",narration:"",fiscal_year:new Date().getFullYear().toString()});

  const fetch = useCallback(async()=>{
    setLoading(true);
    const {data} = await db.from("gl_entries").select("*").order("created_at",{ascending:false}).limit(300);
    setEntries(data||[]);
    setLoading(false);
  },[]);
  useEffect(()=>{fetch();},[fetch]);

  async function postEntry(){
    if(!form.description){toast({title:"Description required",variant:"destructive"});return;}
    if(!form.debit&&!form.credit){toast({title:"Debit or credit amount required",variant:"destructive"});return;}
    setSaving(true);
    const ref=form.reference||`JV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const {error}=await db.from("gl_entries").insert({
      reference:ref,description:form.description,gl_account:form.gl_account,
      debit:form.debit?parseFloat(form.debit):null,
      credit:form.credit?parseFloat(form.credit):null,
      narration:form.narration,fiscal_year:form.fiscal_year,
      status:"posted",posted_by:user?.id||null,posted_by_name:profile?.full_name||user?.email,
      created_at:new Date().toISOString(),
    });
    setSaving(false);
    if(error){toast({title:"Error: "+error.message,variant:"destructive"});return;}
    toast({title:`✓ Journal entry ${ref} posted`});
    setShowNew(false);
    setForm({reference:"",description:"",gl_account:"4000 - Salaries & Wages",debit:"",credit:"",narration:"",fiscal_year:new Date().getFullYear().toString()});
    fetch();
  }

  async function reverseEntry(id:string){
    if(!window.confirm("Reverse this journal entry?"))return;
    const {error}=await db.from("gl_entries").update({status:"reversed",updated_at:new Date().toISOString()}).eq("id",id);
    if(!error){toast({title:"✓ Entry reversed"});fetch();}
    else toast({title:"Error: "+error.message,variant:"destructive"});
  }

  async function bulkPost(){
    if(!selected.length){toast({title:"Select entries first",variant:"destructive"});return;}
    for(const id of selected) await db.from("gl_entries").update({status:"posted"}).eq("id",id);
    toast({title:`✓ ${selected.length} entries posted`});
    setSelected([]);fetch();
  }

  function exportCSV(){
    const rows=["Reference,Description,GL Account,Debit,Credit,Status,Date,Posted By",
      ...filtered.map(e=>`${e.reference||""},${e.description||""},${e.gl_account||""},${e.debit||""},${e.credit||""},${e.status||""},${fmtDate(e.created_at)},${e.posted_by_name||""}`)
    ];
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="journal_entries.csv";a.click();
    URL.revokeObjectURL(url);toast({title:"✓ Exported"});
  }

  function printJournal(){
    const rows=filtered.map(e=>`<tr><td>${e.reference||"JV-"+e.id.slice(-6)}</td><td>${e.description||""}</td><td>${e.gl_account||""}</td><td style="text-align:right">${e.debit?fmtK(e.debit):""}</td><td style="text-align:right">${e.credit?fmtK(e.credit):""}</td><td>${e.status||""}</td><td>${fmtDate(e.created_at)}</td></tr>`).join("");
    const w=window.open("","_blank","width=1000,height=700");
    if(!w)return;
    w.document.write(`<!DOCTYPE html><html><head><title>Journal Entries</title><style>body{font-family:Tahoma,sans-serif;padding:20px;font-size:10px}.hdr{background:linear-gradient(135deg,#1a3580,#2a5fc3);color:#fff;padding:10px 16px;margin:-20px -20px 16px;display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse}th{background:#dbd9c9;padding:4px 8px;border:1px solid #ccc;text-align:left}td{padding:3px 8px;border:1px solid #ccc}tr:nth-child(even){background:#f5f4ea}</style></head><body><div class="hdr"><strong>EL5 MediProcure — Journal Entries</strong><div>Total: ${filtered.length} entries · ${new Date().toLocaleDateString()}</div></div><table><thead><tr><th>Reference</th><th>Description</th><th>GL Account</th><th>Debit</th><th>Credit</th><th>Status</th><th>Date</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    w.document.close();setTimeout(()=>w.print(),400);
  }

  const filtered=entries.filter(e=>{
    const q=search.toLowerCase();
    const ms=!search||[e.reference,e.description,e.gl_account].some(f=>f?.toLowerCase().includes(q));
    const mst=statusFilter==="ALL"||e.status===statusFilter.toLowerCase();
    return ms&&mst;
  });

  const totalDebit=filtered.reduce((s,e)=>s+(e.debit||0),0);
  const totalCredit=filtered.reduce((s,e)=>s+(e.credit||0),0);
  const inp:React.CSSProperties={padding:"2px 5px",border:`1px solid ${ERP.btnBorder||"#a29d7f"}`,borderRadius:2,fontSize:11,fontFamily:ERP.fontFamily,background:"#fff",outline:"none",width:"100%",boxSizing:"border-box" as const};

  return (
    <div style={{background:"#f0f0f0",minHeight:"100vh",fontFamily:ERP.fontFamily,fontSize:11}}>
      <div style={{background:ERP.titleBar,color:"#fff",padding:"5px 10px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${ERP.titleBarBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>📓</span>
          <div><div>EL5 MediProcure — Journal Vouchers</div><div style={{fontSize:10,fontWeight:400,opacity:.85}}>General Ledger Entries · Double-Entry Bookkeeping</div></div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {["–","□","✕"].map((c,i)=><button key={i} onClick={i===2?()=>navigate("/accountant"):undefined} style={{width:21,height:21,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,cursor:"pointer",fontSize:11,color:"#333",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{c}</button>)}
        </div>
      </div>
      <div style={{...erpStyles.toolbar,padding:"5px 10px",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:26,height:26,background:"linear-gradient(135deg,#1a3580,#2a5fc3)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:13}}>🏥</span></div>
          <span style={{fontWeight:700,color:"#00008b"}}>Journal Entries</span>
        </div>
        <button onClick={fetch} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button onClick={()=>setShowNew(v=>!v)} style={erpStyles.btn(true)}>+ New Entry</button>
          {selected.length>0&&<button onClick={bulkPost} style={erpStyles.btn(true)}>✓ Post {selected.length}</button>}
          <button onClick={printJournal} style={erpStyles.btn(false)}>🖨 Print</button>
          <button onClick={exportCSV} style={erpStyles.btn(false)}>📤 Export</button>
          <button onClick={()=>navigate("/accountant")} style={erpStyles.btn(false)}>◀ Workspace</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:"flex",borderBottom:"1px solid #aaa"}}>
        {[
          {label:"TOTAL ENTRIES",val:entries.length,col:"#1a1a1a"},
          {label:"TOTAL DEBITS",val:fmtK(totalDebit),col:"#155724"},
          {label:"TOTAL CREDITS",val:fmtK(totalCredit),col:"#004085"},
          {label:"BALANCE",val:fmtK(Math.abs(totalDebit-totalCredit)),col:Math.abs(totalDebit-totalCredit)<1?"#155724":"#856404"},
        ].map((k,i)=>(
          <div key={i} style={{flex:1,padding:"10px 16px",borderRight:i<3?"1px solid #aaa":"none",background:i%2===0?"#fff":"#f5f4ea"}}>
            <div style={{display:"flex",alignItems:"baseline",gap:4}}>
              <span style={{color:"#8b0000",fontWeight:700,fontSize:11}}>–</span>
              <span style={{fontWeight:800,fontSize:16,color:k.col}}>{k.val}</span>
            </div>
            <div style={{fontSize:9,color:"#666",fontWeight:700,textTransform:"uppercase" as const,letterSpacing:"0.06em",marginTop:1}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* New Entry Form */}
      {showNew&&(
        <div style={{background:"#f5f4ea",borderBottom:"1px solid #ccc",padding:"10px 14px"}}>
          <div style={{fontWeight:700,fontSize:11,color:"#00008b",marginBottom:8}}>📓 Post Journal Entry</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Reference</label><input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} placeholder="JV-00001" style={inp}/></div>
            <div style={{gridColumn:"span 2"}}><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Description *</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Debit (KES)</label><input type="number" value={form.debit} onChange={e=>setForm(p=>({...p,debit:e.target.value,credit:e.target.value?"":p.credit}))} style={inp}/></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Credit (KES)</label><input type="number" value={form.credit} onChange={e=>setForm(p=>({...p,credit:e.target.value,debit:e.target.value?"":p.debit}))} style={inp}/></div>
            <div style={{gridColumn:"span 3"}}><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>GL Account</label>
            <select value={form.gl_account} onChange={e=>setForm(p=>({...p,gl_account:e.target.value}))} style={inp}>
              {COA_OPTS.map(a=><option key={a}>{a}</option>)}
            </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Fiscal Year</label><input value={form.fiscal_year} onChange={e=>setForm(p=>({...p,fiscal_year:e.target.value}))} style={inp}/></div>
            <div style={{gridColumn:"span 2"}}><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Narration</label><input value={form.narration} onChange={e=>setForm(p=>({...p,narration:e.target.value}))} placeholder="Additional notes…" style={inp}/></div>
          </div>
          <div style={{marginTop:8,display:"flex",gap:6}}>
            <button onClick={postEntry} disabled={saving} style={erpStyles.btn(true)}>{saving?"⏳ Posting…":"💾 Post Entry"}</button>
            <button onClick={()=>setShowNew(false)} style={erpStyles.btn(false)}>Cancel</button>
          </div>
        </div>
      )}
      {/* Filter + Grid */}
      <div style={{margin:"6px 8px"}}>
        <div style={{background:"#f5f4ea",border:"1px solid #ccc",padding:"4px 8px",marginBottom:4,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search entries…" style={{...inp,width:200,boxSizing:"border-box" as const}}/>
          <span style={{color:"#555"}}>Status:</span>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inp,width:"auto",boxSizing:"border-box" as const}}>
            {["ALL","DRAFT","POSTED","REVERSED"].map(s=><option key={s}>{s}</option>)}
          </select>
          <span style={{marginLeft:"auto",fontSize:10,color:"#888"}}>{filtered.length} entries</span>
          <button onClick={exportCSV} style={erpStyles.btn(true)}>Extract →</button>
        </div>
        <div style={{background:"#fff",border:"1px solid #ccc",maxHeight:"calc(100vh - 240px)",overflow:"auto"}}>
          {loading?<div style={{padding:30,textAlign:"center",color:"#888"}}>Loading…</div>:(
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:ERP.fontFamily,fontSize:11}}>
              <thead><tr>
                <th style={{...erpStyles.gridTh,width:30}}><input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={e=>setSelected(e.target.checked?filtered.map(e=>e.id):[])}/></th>
                {["Reference","Description","GL Account","Debit","Credit","Status","Date","Posted By",""].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((e,i)=>(
                  <tr key={e.id} style={{background:i%2===0?"#fff":"#f7f7f7"}} onMouseEnter={x=>(x.currentTarget.style.background="#dce9ff")} onMouseLeave={x=>(x.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                    <td style={{...erpStyles.gridTd,textAlign:"center"}}><input type="checkbox" checked={selected.includes(e.id)} onChange={x=>setSelected(s=>x.target.checked?[...s,e.id]:s.filter(v=>v!==e.id))}/></td>
                    <td style={{...erpStyles.gridTd,fontFamily:"monospace",fontWeight:700,color:"#00008b"}}>{e.reference||`JV/${new Date(e.created_at||Date.now()).getFullYear()}-AUTO`}</td>
                    <td style={erpStyles.gridTd}>{e.description||"—"}</td>
                    <td style={{...erpStyles.gridTd,fontSize:10,color:"#555"}}>{e.gl_account||"—"}</td>
                    <td style={{...erpStyles.gridTd,fontWeight:700,color:e.debit?"#155724":"#888"}}>{e.debit?fmtK(e.debit):"—"}</td>
                    <td style={{...erpStyles.gridTd,fontWeight:700,color:e.credit?"#004085":"#888"}}>{e.credit?fmtK(e.credit):"—"}</td>
                    <td style={erpStyles.gridTd}><StatusChip status={e.status||"posted"}/></td>
                    <td style={{...erpStyles.gridTd,color:"#555"}}>{fmtDate(e.created_at)}</td>
                    <td style={{...erpStyles.gridTd,color:"#555"}}>{e.posted_by_name||"—"}</td>
                    <td style={erpStyles.gridTd}>
                      {e.status==="posted"&&<button onClick={()=>reverseEntry(e.id)} style={{...erpStyles.btn(false),fontSize:10,padding:"2px 7px",color:"#721c24"}}>Reverse</button>}
                    </td>
                  </tr>
                ))}
                {filtered.length===0&&<tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#888"}}>No journal entries found</td></tr>}
              </tbody>
              <tfoot>
                <tr style={{background:"#f5f4ea",fontWeight:700}}>
                  <td colSpan={4} style={{...erpStyles.gridTd,textAlign:"right",color:"#555"}}>TOTALS:</td>
                  <td style={{...erpStyles.gridTd,color:"#155724"}}>{fmtK(totalDebit)}</td>
                  <td style={{...erpStyles.gridTd,color:"#004085"}}>{fmtK(totalCredit)}</td>
                  <td colSpan={4} style={{...erpStyles.gridTd,color:Math.abs(totalDebit-totalCredit)<1?"#155724":"#856404"}}>
                    Balance: {fmtK(Math.abs(totalDebit-totalCredit))} {Math.abs(totalDebit-totalCredit)<1?"✓ Balanced":"⚠ Unbalanced"}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>


      {/* Journal Entry Detail Slide-Over */}
      {detail && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",justifyContent:"flex-end"}}
          onClick={()=>setDetail(null)}>
          <div style={{width:"min(460px,100%)",background:"#fff",height:"100%",overflowY:"auto",boxShadow:"-4px 0 24px rgba(0,0,0,.18)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 16px",background:"linear-gradient(135deg,#3b0764,#7c3aed)",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:13,fontWeight:800,color:"#fff",flex:1}}>Journal Entry — {detail.reference||`JV/${new Date(detail.created_at||Date.now()).getFullYear()}-AUTO`}</span>
              <button onClick={()=>setDetail(null)} style={{background:"rgba(255,255,255,.15)",border:"none",borderRadius:5,padding:"4px 7px",cursor:"pointer",color:"#fff",lineHeight:1}}>✕</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px 4px"}}>
              <StatusChip status={detail.status||"posted"}/>
              <DocumentStamp status={detail.status||"posted"} date={detail.created_at} size={100} rotate={-12}/>
            </div>
            <div style={{padding:"4px 16px 16px"}}>
              {[["Reference",detail.reference||"—"],["Description",detail.description||detail.narrative||"—"],["Account",detail.account_name||detail.gl_account||"—"],["Debit",detail.debit!=null?`KES ${Number(detail.debit).toLocaleString()}`:"—"],["Credit",detail.credit!=null?`KES ${Number(detail.credit).toLocaleString()}`:"—"],["Cost Centre",detail.cost_centre||"—"],["Posted By",detail.posted_by_name||detail.created_by_name||"—"],["Date",detail.created_at?new Date(detail.created_at).toLocaleDateString("en-KE"):"—"]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <span style={{fontSize:12,color:"#6b7280",fontWeight:600}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#111827",textAlign:"right",maxWidth:240,overflow:"hidden",textOverflow:"ellipsis"}}>{v}</span>
                </div>
              ))}
              {detail.status!=="posted" && <button onClick={()=>{(async()=>{await(supabase as any).from("gl_entries").update({status:"posted"}).eq("id",detail.id);setDetail(null);fetchEntries();})();}} style={{marginTop:14,width:"100%",padding:"9px",background:"#ede9fe",border:"1px solid #ddd6fe",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,color:"#7c3aed"}}>✓ Post Journal Entry</button>}
            </div>
          </div>
        </div>
      )}

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#e0e0e0",borderTop:"1px solid #aaa",padding:"2px 10px",fontSize:10,color:"#555",display:"flex",gap:14}}>
        <span>Entries: {filtered.length}</span><span>|</span>
        <span>Debits: {fmtK(totalDebit)}</span><span>|</span>
        <span>Credits: {fmtK(totalCredit)}</span><span>|</span>
        <span style={{color:Math.abs(totalDebit-totalCredit)<1?"#155724":"#856404"}}>{Math.abs(totalDebit-totalCredit)<1?"✓ Balanced":"⚠ Unbalanced"}</span>
        <span style={{marginLeft:"auto"}}>EL5 MediProcure v12 · Journal Vouchers</span>
      </div>
    </div>
  );
}
