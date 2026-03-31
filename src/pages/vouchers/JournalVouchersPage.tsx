import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, RefreshCw, Printer, Download, X, Save, Eye, Trash2, CheckCircle, BookOpen } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { printJournalVoucher } from "@/lib/printDocument";

const fmtKES = (n:number) => `KES ${Number(n||0).toLocaleString("en-KE",{minimumFractionDigits:2})}`;
const genNo = () => `JV-EL5H-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}`;
const SC: Record<string,string> = {draft:"#6b7280",approved:"#15803d",posted:"#0369a1",rejected:"#dc2626"};

export default function JournalVouchersPage() {
  const { user, profile, hasRole } = useAuth();
  const canApprove = hasRole("admin")||hasRole("procurement_manager");
  const [rows, setRows] = useState<any[]>([]);
  const [coa, setCoa] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({journal_date:new Date().toISOString().slice(0,10),reference:"",period:"",narration:""});
  const [entries, setEntries] = useState<{account_code:string;account_name:string;debit:string;credit:string;description:string}[]>([
    {account_code:"",account_name:"",debit:"",credit:"",description:""},
    {account_code:"",account_name:"",debit:"",credit:"",description:""},
  ]);
  const [saving, setSaving] = useState(false);
  const { get: getSetting } = useSystemSettings();

  const load = async () => {
    setLoading(true);
    const [{data:jv},{data:c}] = await Promise.all([
      (supabase as any).from("journal_vouchers").select("*").order("created_at",{ascending:false}),
      (supabase as any).from("chart_of_accounts").select("account_code,account_name").eq("is_active",true).order("account_code"),
    ]);
    setRows(jv||[]); setCoa(c||[]);
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  /* ── Real-time subscription ─────────────────────────────── */
  useEffect(()=>{
    const ch=(supabase as any).channel("jv-rt").on("postgres_changes",{event:"*",schema:"public",table:"journal_vouchers"},()=>load()).subscribe();
    return ()=>{(supabase as any).removeChannel(ch);};
  },[]);

  const totalDebit = entries.reduce((s,e)=>s+Number(e.debit||0),0);
  const totalCredit = entries.reduce((s,e)=>s+Number(e.credit||0),0);
  const isBalanced = Math.abs(totalDebit-totalCredit)<0.01 && totalDebit>0;

  const save = async () => {
    if(!form.narration){toast({title:"Narration required",variant:"destructive"});return;}
    if(!isBalanced){toast({title:"Journal is not balanced — debits must equal credits",variant:"destructive"});return;}
    setSaving(true);
    const payload={...form,journal_number:genNo(),entries:entries.filter(e=>e.account_code||e.debit||e.credit),
      total_debit:totalDebit,total_credit:totalCredit,is_balanced:isBalanced,status:"draft",
      created_by:user?.id,created_by_name:profile?.full_name};
    const{data,error}=await(supabase as any).from("journal_vouchers").insert(payload).select().single();
    if(error){toast({title:"Save failed",description:error.message||"Database error — please try again",variant:"destructive"});}
    else{logAudit(user?.id,profile?.full_name,"create","journal_vouchers",data?.id,{number:payload.journal_number});toast({title:"Journal Voucher created ✓"});setShowNew(false);load();}
    setSaving(false);
  };

  const approve = async (id:string) => {
    await(supabase as any).from("journal_vouchers").update({status:"approved",approved_by:user?.id,approved_by_name:profile?.full_name}).eq("id",id);
    toast({title:"Journal approved ✓"}); load();
  };

  const deleteRow = async (id:string) => {
    if(!confirm("Delete this journal voucher?")) return;
    await(supabase as any).from("journal_vouchers").delete().eq("id",id);
    toast({title:"Deleted"}); load();
  };

  const exportExcel = () => {
    const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb,ws,"Journal Vouchers");
    XLSX.writeFile(wb,`journal_vouchers_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const printVoucher = (v:any) => {
    printJournalVoucher(v, {
      hospitalName:   getSetting('hospital_name','Embu Level 5 Hospital'),
      sysName:        getSetting('system_name','EL5 MediProcure'),
      docFooter:      getSetting('doc_footer','Embu Level 5 Hospital · Embu County Government'),
      currencySymbol: getSetting('currency_symbol','KES'),
      logoUrl:         getSetting('logo_url') || getSetting('system_logo_url') || '',
      hospitalAddress: getSetting('hospital_address','Embu Town, Embu County, Kenya'),
      hospitalPhone:   getSetting('hospital_phone','+254 060 000000'),
      hospitalEmail:   getSetting('hospital_email','info@embu.health.go.ke'),
      printFont:      getSetting('print_font','Times New Roman'),
      showStamp:      getSetting('show_stamp','true') === 'true',
    });
  };

  const updateEntry = (i:number, k:string, val:string) => {
    setEntries(p=>{const n=[...p]; n[i]={...n[i],[k]:val};
      if(k==="account_code"){const a=coa.find(c=>c.account_code===val); if(a)n[i].account_name=a.account_name;}
      return n;
    });
  };

  const filtered = search ? rows.filter(r=>Object.values(r).some(v=>String(v||"").toLowerCase().includes(search.toLowerCase()))) : rows;

  return (
    <div
      style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}
    >
    <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @media(max-width:768px){.vpage-header{flex-direction:column!important;align-items:flex-start!important}.vpage-filters{flex-wrap:wrap!important}.vpage-table{font-size:11px!important}}
        @media(max-width:480px){.vpage-btns{flex-wrap:wrap!important;gap:6px!important}}
      `}</style>
    <div style={{padding:16,display:"flex",flexDirection:"column",gap:16,fontFamily:"'Segoe UI',system-ui"}}>
      {/* KPI TILES */}
      {(()=>{
        const fmtK=(n:number)=>n>=1e6?`KES ${(n/1e6).toFixed(2)}M`:n>=1e3?`KES ${(n/1e3).toFixed(1)}K`:`KES ${n.toFixed(0)}`;
        const totalDebit=rows.reduce((s:number,r:any)=>s+Number(r.total_debit||0),0);
        const balanced=rows.filter((r:any)=>r.is_balanced).length;
        return(
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              {label:"Total Debits",val:fmtK(totalDebit),bg:"#c0392b"},
              {label:"Total Entries",val:rows.length,bg:"#7d6608"},
              {label:"Balanced",val:balanced,bg:"#0e6655"},
              {label:"Unbalanced",val:rows.length-balanced,bg:"#6c3483"},
              {label:"Showing",val:filtered.length,bg:"#1a252f"},
            ].map(k=>(
              <div key={k.label} style={{borderRadius:10,padding:"12px 16px",color:"#fff",textAlign:"center",background:k.bg,boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>
                <div style={{fontSize:20,fontWeight:900,lineHeight:1}}>{k.val}</div>
                <div style={{fontSize:10,fontWeight:700,marginTop:5,opacity:0.9,letterSpacing:"0.04em"}}>{k.label}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <div style={{borderRadius:16,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(90deg,#1e1b4b,#312e81)"}}>
        <div><h1 style={{fontSize:15,fontWeight:900,color:"#fff"}}>Journal Vouchers</h1>
          <p style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{rows.length} entries</p></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={exportExcel} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,fontSize:12,fontWeight:600,border:"none",cursor:"pointer",background:"#e2e8f0",color:"#fff"}}><Download style={{width:14,height:14}}/>Export</button>
          {canApprove&&<button onClick={()=>setShowNew(true)} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 16px",borderRadius:10,fontSize:12,fontWeight:700,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.92)",color:"#312e81"}}><Plus style={{width:14,height:14}}/>New Journal</button>}
        </div>
      </div>
      <div style={{position:"relative",maxWidth:384}}><Search style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"#9ca3af"}}/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search journals..."
          style={{width:"100%",paddingLeft:34,paddingRight:16,paddingTop:8,paddingBottom:8,borderRadius:10,border:"1.5px solid #e5e7eb",fontSize:14,outline:"none",boxSizing:"border-box"}}/></div>
      <div style={{borderRadius:16,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",overflow:"hidden"}}>
        <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
          <thead><tr style={{background:"#eef2ff"}}>
            {["Journal No.","Date","Reference","Narration","Debit","Credit","Balanced","Status","Actions"].map(h=>(
              <th key={h} style={{padding:"12px 16px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10,textTransform:"uppercase"}}>{h}</th>))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={9} style={{padding:"32px 16px",textAlign:"center"}}><RefreshCw style={{animation:"spin 1s linear infinite"}}/></td></tr>:
            filtered.length===0?<tr><td colSpan={9} style={{padding:"32px 16px",textAlign:"center",color:"#9ca3af"}}>No journal vouchers</td></tr>:
            filtered.map((r,i)=>(
              <tr key={r.id} style={{borderBottom:"1px solid #f3f4f6",background:i%2===0?"#fff":"#fafafa"}}>
                <td style={{padding:"10px 16px",fontWeight:700,color:"#312e81"}}>{r.journal_number}</td>
                <td style={{padding:"10px 16px"}}>{new Date(r.journal_date).toLocaleDateString("en-KE")}</td>
                <td style={{padding:"10px 16px",color:"#6b7280"}}>{r.reference||"—"}</td>
                <td style={{padding:"10px 16px",color:"#374151"}}>{r.narration}</td>
                <td style={{padding:"10px 16px",fontWeight:600}}>{fmtKES(r.total_debit)}</td>
                <td style={{padding:"10px 16px",fontWeight:600}}>{fmtKES(r.total_credit)}</td>
                <td style={{padding:"10px 16px"}}><span style={{fontSize:10,fontWeight:700,color:r.is_balanced?"#15803d":"#dc2626"}}>{r.is_balanced?"✓ Yes":"✗ No"}</span></td>
                <td style={{padding:"10px 16px"}}><span style={{padding:"2px 8px",borderRadius:20,fontSize:9,fontWeight:700,background:`${SC[r.status]||"#9ca3af"}20`,color:SC[r.status]||"#9ca3af"}}>{r.status}</span></td>
                <td style={{padding:"10px 16px"}}><div style={{display:"flex",gap:4}}>
                  <button onClick={()=>setDetail(r)} style={{padding:5,borderRadius:6,background:"#dbeafe",border:"none",cursor:"pointer"}}><Eye style={{width:12,height:12,color:"#2563eb"}}/></button>
                  <button onClick={()=>printVoucher(r)} style={{padding:5,borderRadius:6,background:"#dcfce7",border:"none",cursor:"pointer"}}><Printer style={{width:12,height:12,color:"#16a34a"}}/></button>
                  {canApprove&&r.status==="draft"&&<button onClick={()=>approve(r.id)} style={{padding:5,borderRadius:6,background:"#d1fae5",border:"none",cursor:"pointer"}} title="Approve"><CheckCircle style={{width:12,height:12,color:"#059669"}}/></button>}
                  {hasRole("admin")&&<button onClick={()=>deleteRow(r.id)} style={{padding:5,borderRadius:6,background:"#fee2e2",border:"none",cursor:"pointer"}}><Trash2 style={{width:12,height:12,color:"#ef4444"}}/></button>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* New Modal */}
      {showNew&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)"}} onClick={()=>setShowNew(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:16,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",width:"min(580px,100%)",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid #e5e7eb",flexShrink:0}}>
              <h3 style={{fontWeight:900,color:"#1f2937",margin:0}}>New Journal Voucher</h3>
              <button onClick={()=>setShowNew(false)} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#9ca3af"}}/></button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Date *</label>
                <input type="date" value={form.journal_date} onChange={e=>setForm(p=>({...p,journal_date:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Reference</label>
                <input value={form.reference} onChange={e=>setForm(p=>({...p,reference:e.target.value}))} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              <div><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Period</label>
                <input value={form.period} onChange={e=>setForm(p=>({...p,period:e.target.value}))} placeholder="e.g. Jan 2026" style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
              <div style={{gridColumn:"1/-1"}}><label style={{display:"block",marginBottom:4,fontSize:12,fontWeight:600,color:"#6b7280"}}>Narration *</label>
                <textarea value={form.narration} onChange={e=>setForm(p=>({...p,narration:e.target.value}))} rows={2} style={{width:"100%",padding:"8px 12px",border:"1.5px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>
            </div>
            {/* Entries table */}
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:700,color:"#374151",textTransform:"uppercase",letterSpacing:"0.05em"}}>Journal Entries</label>
                <button onClick={()=>setEntries(p=>[...p,{account_code:"",account_name:"",debit:"",credit:"",description:""}])}
                  style={{display:"flex",alignItems:"center",gap:4,fontSize:12,fontWeight:600,color:"#4f46e5",background:"none",border:"none",cursor:"pointer"}}>
                  <Plus style={{width:12,height:12}}/>Add Line
                </button>
              </div>
              <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#eef2ff"}}>
                  {["Account Code","Account Name","Description","Debit","Credit",""].map(h=><th key={h} style={{padding:"8px",textAlign:"left",fontWeight:700,color:"#4b5563",fontSize:10}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {entries.map((e,i)=>(
                    <tr key={i} style={{borderBottom:"1px solid #f3f4f6"}}>
                      <td style={{padding:"4px"}}>
                        <input list={`coa-${i}`} value={e.account_code} onChange={ev=>updateEntry(i,"account_code",ev.target.value)}
                          style={{width:96,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/>
                        <datalist id={`coa-${i}`}>{coa.map(c=><option key={c.account_code} value={c.account_code}>{c.account_name}</option>)}</datalist>
                      </td>
                      <td style={{padding:"4px"}}><input value={e.account_name} onChange={ev=>updateEntry(i,"account_name",ev.target.value)} style={{width:128,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/></td>
                      <td style={{padding:"4px"}}><input value={e.description} onChange={ev=>updateEntry(i,"description",ev.target.value)} style={{width:112,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none"}}/></td>
                      <td style={{padding:"4px"}}><input type="number" value={e.debit} onChange={ev=>updateEntry(i,"debit",ev.target.value)} style={{width:96,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none",textAlign:"right"}}/></td>
                      <td style={{padding:"4px"}}><input type="number" value={e.credit} onChange={ev=>updateEntry(i,"credit",ev.target.value)} style={{width:96,padding:"4px 8px",borderRadius:6,border:"1px solid #e5e7eb",fontSize:12,outline:"none",textAlign:"right"}}/></td>
                      <td style={{padding:"4px"}}><button onClick={()=>setEntries(p=>p.filter((_,j)=>j!==i))} style={{color:"#f87171",background:"none",border:"none",cursor:"pointer"}}><X style={{width:12,height:12}}/></button></td>
                    </tr>
                  ))}
                  <tr style={{background:"#f0fdf4",fontWeight:800}}>
                    <td colSpan={3} style={{padding:"8px",textAlign:"right",fontSize:12,fontWeight:700,color:"#374151"}}>TOTALS</td>
                    <td style={{padding:"8px",fontSize:12,fontWeight:700,textAlign:"right",color:"#1a3a6b"}}>{fmtKES(totalDebit)}</td>
                    <td style={{padding:"8px",fontSize:12,fontWeight:700,textAlign:"right",color:"#1a3a6b"}}>{fmtKES(totalCredit)}</td>
                    <td style={{padding:"8px",fontSize:12,fontWeight:700,color:isBalanced?"#15803d":"#dc2626"}}>{isBalanced?"✓ Balanced":"✗ Unbalanced"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",padding:"12px 20px",borderTop:"1px solid #e5e7eb",flexShrink:0}}>
              <button onClick={()=>setShowNew(false)} style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid #e5e7eb",background:"#fff",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={save} disabled={saving||!isBalanced}
                style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,border:"none",cursor:"pointer",background:"#312e81"}}>
                {saving?<RefreshCw style={{animation:"spin 1s linear infinite"}}/>:<Save style={{width:14,height:14}}/>}
                {saving?"Saving...":"Create Journal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  </div>
  );
}

