import type React from "react";
/**
 * EL5 MediProcure — Receipt Vouchers v12 — Windows XP theme, all buttons wired
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

const db = supabase as any;
interface Receipt {
  id: string; receipt_number?: string; received_from?: string;
  total_amount?: number; status: string; payment_method?: string;
  created_at: string; gl_account?: string; description?: string;
  reference?: string; received_by?: string; bank_name?: string;
}

function fmtK(n?: number|null) {
  const v = n||0;
  if(v>=1_000_000) return `KES ${(v/1_000_000).toFixed(2)}M`;
  if(v>=1_000) return `KES ${(v/1_000).toFixed(2)}K`;
  return `KES ${v.toLocaleString("en-KE",{minimumFractionDigits:2})}`;
}
function fmtDate(s?: string|null) { return s ? new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}) : "—"; }

function StatusChip({status}:{status:string}) {
  const m: Record<string,{bg:string;color:string;border:string}> = {
    posted:{bg:"#d4edda",color:"#155724",border:"#c3e6cb"},
    received:{bg:"#d4edda",color:"#155724",border:"#c3e6cb"},
    draft:{bg:"#e9ecef",color:"#495057",border:"#ced4da"},
    pending:{bg:"#fff3cd",color:"#856404",border:"#ffc107"},
    reversed:{bg:"#f8d7da",color:"#721c24",border:"#f5c6cb"},
  };
  const s = m[status?.toLowerCase()]||{bg:"#e9ecef",color:"#495057",border:"#ced4da"};
  return <span style={{display:"inline-block",padding:"1px 6px",borderRadius:2,fontSize:10,fontWeight:700,background:s.bg,color:s.color,border:`1px solid ${s.border}`,textTransform:"uppercase" as const,fontFamily:ERP.fontFamily}}>{status}</span>;
}

export default function ReceiptVouchersPage() {
  const {user, profile} = useAuth();
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({received_from:"",total_amount:"",payment_method:"bank_transfer",gl_account:"3000 - MOH Grant Revenue",description:"",reference:"",bank_name:""});

  const fetch = useCallback(async()=>{
    setLoading(true);
    const {data} = await db.from("receipt_vouchers").select("*").order("created_at",{ascending:false}).limit(200);
    setReceipts(data||[]);
    setLoading(false);
  },[]);

  useEffect(()=>{ fetch(); },[fetch]);

  async function create() {
    if(!form.received_from||!form.total_amount){toast({title:"Payer and amount required",variant:"destructive"});return;}
    setSaving(true);
    const rNum=`RV/EL5H/${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,"0")}/${String(Date.now()).slice(-4)}`;
    const amt = parseFloat(form.total_amount);
    const {error}=await db.from("receipt_vouchers").insert({
      receipt_number:rNum, received_from:form.received_from,
      total_amount:amt, amount:amt,
      payment_method:form.payment_method, gl_account:form.gl_account,
      description:form.description, reference:form.reference,
      bank_name:form.bank_name, status:"draft",
      received_by:profile?.full_name||user?.email,
    });
    setSaving(false);
    if(error){toast({title:"Save failed: "+error.message,variant:"destructive"});return;}
    toast({title:`✓ Receipt ${rNum} created`});
    setShowNew(false);
    setForm({received_from:"",total_amount:"",payment_method:"bank_transfer",gl_account:"3000 - MOH Grant Revenue",description:"",reference:"",bank_name:""});
    fetch();
  }

  async function updateStatus(id:string,status:string){
    const {error}=await db.from("receipt_vouchers").update({status,updated_at:new Date().toISOString()}).eq("id",id);
    if(!error){toast({title:`✓ Status → ${status}`});fetch();}
    else toast({title:"Error: "+error.message,variant:"destructive"});
  }

  async function bulkPost(){
    if(!selected.length){toast({title:"Select receipts first",variant:"destructive"});return;}
    for(const id of selected) await db.from("receipt_vouchers").update({status:"posted"}).eq("id",id);
    toast({title:`✓ ${selected.length} receipt(s) posted`});
    setSelected([]); fetch();
  }

  function printReceipt(r:Receipt){
    const w=window.open("","_blank","width=760,height=560");
    if(!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${r.receipt_number}</title>
    <style>body{font-family:Tahoma,sans-serif;padding:28px;font-size:11px}
    .hdr{background:linear-gradient(135deg,#155724,#1e7e34);color:#fff;padding:10px 16px;margin:-28px -28px 20px;display:flex;justify-content:space-between}
    h2{margin:0;font-size:14px}table{width:100%;border-collapse:collapse}
    td{padding:5px 9px;border:1px solid #ccc}.lbl{background:#f5f4ea;font-weight:700;width:28%;color:#555}
    .tot{font-size:18px;font-weight:900;color:#155724}
    .sig{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px}
    .sl{border-top:1px solid #555;padding-top:4px;font-size:9px;color:#666;margin-top:42px;text-align:center}
    </style></head><body>
    <div class="hdr"><div><h2>🏥 EL5 MediProcure</h2><div style="font-size:9px;opacity:.75">Embu Level 5 Hospital · Official Receipt</div></div>
    <div style="text-align:right"><div style="font-size:9px;opacity:.8">RECEIPT VOUCHER</div><div style="font-size:15px;font-weight:900">${r.receipt_number||""}</div></div></div>
    <table>
      <tr><td class="lbl">Received From</td><td><strong>${r.received_from||""}</strong></td><td class="lbl">Date</td><td>${fmtDate(r.created_at)}</td></tr>
      <tr><td class="lbl">Bank</td><td>${r.bank_name||"—"}</td><td class="lbl">Method</td><td style="text-transform:capitalize">${r.payment_method?.replace("_"," ")||""}</td></tr>
      <tr><td class="lbl">Reference</td><td>${r.reference||"—"}</td><td class="lbl">Status</td><td><strong style="text-transform:uppercase">${r.status}</strong></td></tr>
      <tr><td class="lbl">GL Account</td><td colspan="3">${r.gl_account||"—"}</td></tr>
      <tr><td class="lbl">Description</td><td colspan="3">${r.description||""}</td></tr>
      <tr><td class="lbl">AMOUNT RECEIVED</td><td colspan="3" class="tot">KES ${(r.total_amount||0).toLocaleString("en-KE",{minimumFractionDigits:2})}</td></tr>
    </table>
    <div class="sig"><div><div class="sl">Received By / Date</div></div><div><div class="sl">Finance Officer / Date</div></div></div>
    <div style="margin-top:20px;font-size:8px;color:#aaa;text-align:center">EL5 MediProcure v12 · ${new Date().toLocaleString()}</div>
    </body></html>`);
    w.document.close(); setTimeout(()=>w.print(),400);
  }

  function exportCSV(){
    const rows=["Receipt No,Received From,Amount,Method,GL Account,Status,Date,Received By",
      ...filtered.map(r=>`${r.receipt_number||""},${r.received_from||""},${r.total_amount||0},${r.payment_method||""},${r.gl_account||""},${r.status},${fmtDate(r.created_at)},${r.received_by||""}`)
    ];
    const blob=new Blob([rows.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="receipt_vouchers.csv";a.click();
    URL.revokeObjectURL(url);toast({title:"✓ Exported"});
  }

  const filtered = receipts.filter(r=>{
    const q=search.toLowerCase();
    const ms=!search||[r.receipt_number,r.received_from,r.description,r.reference].some(f=>f?.toLowerCase().includes(q));
    const mst=statusFilter==="ALL"||r.status===statusFilter.toLowerCase();
    return ms&&mst;
  });

  const totalPosted=receipts.filter(r=>r.status==="posted"||r.status==="received").reduce((s,r)=>s+(r.total_amount||0),0);

  const inp:React.CSSProperties={padding:"2px 5px",border:`1px solid ${ERP.btnBorder||"#a29d7f"}`,borderRadius:2,fontSize:11,fontFamily:ERP.fontFamily,background:"#fff",outline:"none",width:"100%",boxSizing:"border-box" as const};

  return (
    <div style={{background:"#f0f0f0",minHeight:"100vh",fontFamily:ERP.fontFamily,fontSize:11}}>
      {/* Title */}
      <div style={{background:ERP.titleBar,color:"#fff",padding:"5px 10px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${ERP.titleBarBorder}`}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:14}}>🧾</span>
          <div>
            <div>EL5 MediProcure — Receipt Vouchers</div>
            <div style={{fontSize:10,fontWeight:400,opacity:.85}}>Embu Level 5 Hospital · Income & Collections</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {["–","□","✕"].map((c,i)=>(
            <button key={i} onClick={i===2?()=>navigate("/accountant"):undefined} style={{width:21,height:21,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,cursor:"pointer",fontSize:11,color:"#333",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{c}</button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{...erpStyles.toolbar,padding:"5px 10px",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:26,height:26,background:"linear-gradient(135deg,#155724,#1e7e34)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{color:"#fff",fontSize:13}}>🏥</span></div>
          <span style={{fontWeight:700,color:"#155724"}}>Receipt Vouchers</span>
        </div>
        <button onClick={fetch} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{marginLeft:"auto",display:"flex",gap:4}}>
          <button onClick={()=>setShowNew(v=>!v)} style={erpStyles.btn(true)}>+ New Receipt</button>
          {selected.length>0 && <button onClick={bulkPost} style={erpStyles.btn(true)}>✓ Post {selected.length}</button>}
          <button onClick={exportCSV} style={erpStyles.btn(false)}>📤 Export</button>
          <button onClick={()=>navigate("/accountant")} style={erpStyles.btn(false)}>◀ Workspace</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{display:"flex",borderBottom:"1px solid #aaa"}}>
        {[
          {label:"TOTAL RECEIPTS",val:fmtK(totalPosted),col:"#155724"},
          {label:"PENDING",val:receipts.filter(r=>r.status==="pending"||r.status==="draft").length,col:"#856404"},
          {label:"POSTED",val:receipts.filter(r=>r.status==="posted"||r.status==="received").length,col:"#004085"},
          {label:"RECORD COUNT",val:filtered.length,col:"#1a1a1a"},
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

      {/* New Form */}
      {showNew && (
        <div style={{background:"#f5f4ea",borderBottom:`1px solid #ccc`,padding:"10px 14px"}}>
          <div style={{fontWeight:700,fontSize:11,color:"#155724",marginBottom:8}}>🧾 New Receipt Voucher</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            {[{l:"Received From *",k:"received_from"},{l:"Amount (KES) *",k:"total_amount",t:"number"},{l:"Reference",k:"reference"},{l:"Bank Name",k:"bank_name"},{l:"Description",k:"description"}].map(f=>(
              <div key={f.k}><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>{f.l}</label>
              <input type={f.t||"text"} value={(form as any)[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} style={inp}/></div>
            ))}
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>Method</label>
            <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))} style={inp}>
              {["bank_transfer","cheque","cash","mpesa","nhif","moh_grant"].map(m=><option key={m} value={m}>{m.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select></div>
            <div><label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:2}}>GL Account</label>
            <select value={form.gl_account} onChange={e=>setForm(p=>({...p,gl_account:e.target.value}))} style={inp}>
              {["3000 - MOH Grant Revenue","3100 - NHIF Revenue","3200 - Patient Fee Revenue","1010 - KCB Operating Account","1011 - Co-op Bank Account"].map(a=><option key={a}>{a}</option>)}
            </select></div>
          </div>
          <div style={{marginTop:8,display:"flex",gap:6}}>
            <button onClick={create} disabled={saving} style={erpStyles.btn(true)}>{saving?"⏳ Saving…":"💾 Create Receipt"}</button>
            <button onClick={()=>setShowNew(false)} style={erpStyles.btn(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filter + Grid */}
      <div style={{margin:"6px 8px"}}>
        <div style={{background:"#f5f4ea",border:"1px solid #ccc",padding:"4px 8px",marginBottom:4,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" as const}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search receipts…" style={{...inp,width:200,boxSizing:"border-box" as const}}/>
          <span style={{color:"#555"}}>Status:</span>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...inp,width:"auto",boxSizing:"border-box" as const}}>
            {["ALL","DRAFT","PENDING","POSTED","RECEIVED","REVERSED"].map(s=><option key={s}>{s}</option>)}
          </select>
          <span style={{marginLeft:"auto",fontSize:10,color:"#888"}}>{filtered.length} records</span>
          <button onClick={exportCSV} style={erpStyles.btn(true)}>Extract →</button>
        </div>
        <div style={{background:"#fff",border:"1px solid #ccc",maxHeight:"calc(100vh - 240px)",overflow:"auto"}}>
          {loading ? <div style={{padding:30,textAlign:"center",color:"#888"}}>Loading…</div> : (
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:ERP.fontFamily,fontSize:11}}>
              <thead><tr>
                <th style={{...erpStyles.gridTh,width:30}}><input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={e=>setSelected(e.target.checked?filtered.map(r=>r.id):[])}/></th>
                {["Receipt No.","Received From","Method","GL Account","Status","Amount","Date","Received By",""].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={r.id} style={{background:i%2===0?"#fff":"#f7f7f7"}} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                    <td style={{...erpStyles.gridTd,textAlign:"center"}}><input type="checkbox" checked={selected.includes(r.id)} onChange={e=>setSelected(s=>e.target.checked?[...s,r.id]:s.filter(x=>x!==r.id))}/></td>
                    <td style={{...erpStyles.gridTd,color:"#00008b",fontWeight:700}}>{r.receipt_number||`RV/EL5H/${r.id.slice(-6)}`}</td>
                    <td style={erpStyles.gridTd}>{r.received_from||"—"}</td>
                    <td style={erpStyles.gridTd}>{r.payment_method?.replace(/_/g," ")||"—"}</td>
                    <td style={{...erpStyles.gridTd,fontSize:10,color:"#555"}}>{r.gl_account||"—"}</td>
                    <td style={erpStyles.gridTd}><StatusChip status={r.status}/></td>
                    <td style={{...erpStyles.gridTd,fontWeight:700}}>{fmtK(r.total_amount)}</td>
                    <td style={{...erpStyles.gridTd,color:"#555"}}>{fmtDate(r.created_at)}</td>
                    <td style={{...erpStyles.gridTd,color:"#555"}}>{r.received_by||"—"}</td>
                    <td style={erpStyles.gridTd}>
                      <div style={{display:"flex",gap:3}}>
                        {r.status==="draft" && <button onClick={()=>updateStatus(r.id,"pending")} style={{...erpStyles.btn(true),fontSize:10,padding:"2px 7px"}}>Submit</button>}
                        {r.status==="pending" && <button onClick={()=>updateStatus(r.id,"posted")} style={{...erpStyles.btn(true),fontSize:10,padding:"2px 7px"}}>✓ Post</button>}
                        <button onClick={()=>printReceipt(r)} style={{...erpStyles.btn(false),fontSize:10,padding:"2px 7px"}}>🖨</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length===0 && <tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#888"}}>No receipt vouchers found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#e0e0e0",borderTop:"1px solid #aaa",padding:"2px 10px",fontSize:10,color:"#555",display:"flex",gap:14}}>
        <span>Records: {filtered.length}</span><span>|</span>
        <span>Posted: {receipts.filter(r=>r.status==="posted"||r.status==="received").length}</span><span>|</span>
        <span>Total: {fmtK(filtered.reduce((s,r)=>s+(r.total_amount||0),0))}</span>
        <span style={{marginLeft:"auto"}}>EL5 MediProcure v12 · Receipt Vouchers</span>
      </div>
    </div>
  );
}
