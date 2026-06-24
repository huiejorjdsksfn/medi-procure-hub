import type React from "react";
/**
 * EL5 MediProcure — Quality Control Dashboard v10
 * Classic ERP Financial Management System UI
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

const db = supabase as any;

interface Inspection {
  id: string; item_name?: string; supplier_name?: string; status: string;
  inspection_date?: string; inspector_name?: string; result?: string;
  batch_number?: string; quantity_inspected?: number; quantity_rejected?: number;
  notes?: string; created_at: string;
}
interface NCR {
  id: string; ncr_number?: string; title?: string; status: string;
  severity?: string; department?: string; reported_by?: string;
  assigned_to?: string; due_date?: string; created_at: string; resolved_at?: string;
}

function fmt(n: number) { return (n||0).toLocaleString("en-KE"); }
function fmtDate(s: string) { if(!s) return "—"; return new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function StatusChip({ status }: { status: string }) { return <span style={erpStyles.statusChip(status)}>{status}</span>; }

function exportRowsToCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g,'""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type QCTab = "dashboard"|"inspections"|"ncr"|"metrics";

export default function QualityDashboardPage() {
  const [tab, setTab] = useState<QCTab>("dashboard");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewNCR, setShowNewNCR] = useState(false);
  const [showNewInsp, setShowNewInsp] = useState(false);
  const [ncrForm, setNcrForm] = useState({ title:"", severity:"medium", department:"", notes:"", due_date:"" });
  const [inspForm, setInspForm] = useState({ item_name:"", supplier_name:"", batch_number:"", quantity_inspected:"", result:"pass", notes:"" });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, ncrRes] = await Promise.allSettled([
        db.from("quality_inspections").select("*").order("created_at",{ascending:false}).limit(100),
        db.from("non_conformance_reports").select("*").order("created_at",{ascending:false}).limit(100),
      ]);
      setInspections(insRes.status==="fulfilled" ? (insRes.value.data||[]) : []);
      setNcrs(ncrRes.status==="fulfilled" ? (ncrRes.value.data||[]) : []);
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  async function createNCR() {
    if(!ncrForm.title){ toast({title:"Title required",variant:"destructive"}); return; }
    const num = `NCR-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const { error } = await db.from("non_conformance_reports").insert({
      ncr_number:num, title:ncrForm.title, severity:ncrForm.severity,
      department:ncrForm.department, notes:ncrForm.notes, due_date:ncrForm.due_date||null,
      status:"open",
    });
    if(error){ toast({title:"Error: "+error.message,variant:"destructive"}); return; }
    toast({title:`✓ NCR ${num} created`});
    setShowNewNCR(false);
    setNcrForm({title:"",severity:"medium",department:"",notes:"",due_date:""});
    fetchAll();
  }

  async function createInspection() {
    if(!inspForm.item_name){ toast({title:"Item name required",variant:"destructive"}); return; }
    const { error } = await db.from("quality_inspections").insert({
      item_name:inspForm.item_name, supplier_name:inspForm.supplier_name,
      batch_number:inspForm.batch_number, quantity_inspected:parseInt(inspForm.quantity_inspected)||0,
      result:inspForm.result, notes:inspForm.notes,
      inspection_date:new Date().toISOString().split("T")[0],
      status:inspForm.result==="pass"?"passed":"failed",
    });
    if(error){ toast({title:"Error: "+error.message,variant:"destructive"}); return; }
    toast({title:"✓ Inspection recorded"});
    setShowNewInsp(false);
    setInspForm({item_name:"",supplier_name:"",batch_number:"",quantity_inspected:"",result:"pass",notes:""});
    fetchAll();
  }

  async function resolveNCR(id: string) {
    const { error } = await db.from("non_conformance_reports").update({status:"resolved",resolved_at:new Date().toISOString()}).eq("id",id);
    if(!error){ toast({title:"✓ NCR resolved"}); fetchAll(); }
  }

  const passRate = inspections.length ? Math.round(inspections.filter(i=>i.result==="pass"||i.status==="passed").length/inspections.length*100) : 0;
  const openNCRs = ncrs.filter(n=>n.status==="open").length;
  const criticalNCRs = ncrs.filter(n=>n.severity==="critical"&&n.status==="open").length;

  const kpiData = [
    { label:"INSPECTIONS", value:inspections.length },
    { label:"PASS RATE", value:`${passRate}%` },
    { label:"OPEN NCRs", value:openNCRs },
    { label:"CRITICAL", value:criticalNCRs },
    { label:"RESOLVED", value:ncrs.filter(n=>n.status==="resolved").length },
  ];

  const inp: React.CSSProperties = { ...erpStyles.inp, width:"100%", boxSizing:"border-box" };

  const TABS: {id:QCTab;label:string}[] = [
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"inspections",label:"🔍 Inspections"},
    {id:"ncr",label:"⚠️ NCR"},
    {id:"metrics",label:"📈 Metrics"},
  ];

  return (
    <div style={{ background:"#f0f0f0", minHeight:"100vh", fontFamily:ERP.fontFamily, fontSize:12 }}>
      {/* Title */}
      <div style={{ background:ERP.titleBar, color:"#fff", padding:"5px 10px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>🔬</span>
          <div>
            <div>EL5 MediProcure — Quality Control Dashboard</div>
            <div style={{ fontSize:10, fontWeight:400, opacity:.85 }}>Embu Level 5 Hospital · QC &amp; Compliance</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:4 }}>
          {["0","1","r"].map(c=><div key={c} style={{ width:16,height:14,background:"linear-gradient(180deg,#f0f0f0,#dcdcdc)",border:"1px solid #888",borderRadius:2,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:10,color:"#333",fontWeight:700 }}>{c}</div>)}
        </div>
      </div>

      {/* Menu */}
      <div style={{ background:"#f5f5f5", borderBottom:"1px solid #ccc", padding:"2px 8px", display:"flex", gap:16, fontSize:12 }}>
        {["File","View","Reports","Help"].map(m=>(
          <span key={m} style={{ cursor:"pointer", padding:"2px 4px" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}><u>{m[0]}</u>{m.slice(1)}</span>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ ...erpStyles.toolbar, padding:"5px 10px", gap:8 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:28,height:28,background:"linear-gradient(135deg,#1a3580,#2a4fa3)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff", fontSize:14 }}>🏥</span>
          </div>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a3580" }}>Quality Control</span>
        </div>
        <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ ...erpStyles.btn(tab===t.id), background:tab===t.id?ERP.tabActive:ERP.tabInactive, color:tab===t.id?"#fff":"#333", border:`1px solid ${tab===t.id?ERP.tabActiveBorder:ERP.toolbarBorder}` }}>
              {t.label}
            </button>
          ))}
          <button onClick={()=>window.print()} style={erpStyles.btn(false)}>- Print</button>
          <button onClick={()=>exportRowsToCSV(tab==="ncr"?ncrs:inspections, tab==="ncr"?"ncr_reports":"inspections")} style={erpStyles.btn(false)}>- Export</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:"flex", borderBottom:"1px solid #aaa" }}>
        {kpiData.map((k,i)=>(
          <div key={i} style={{ flex:1, padding:"10px 16px", borderRight:i<kpiData.length-1?"1px solid #aaa":"none", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ color:"#c0392b", fontWeight:700, fontSize:11 }}>-</span>
              <span style={{ fontWeight:800, fontSize:22, color:"#1a1a1a" }}>{k.value}</span>
            </div>
            <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin:8 }}>

        {/* Dashboard Tab */}
        {tab==="dashboard" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {/* Pass Rate Card */}
            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12 }}>
              <div style={{ fontWeight:700, fontSize:12, borderBottom:"1px solid #ddd", paddingBottom:6, marginBottom:10, color:"#1a3580" }}>📊 Inspection Summary</div>
              {[
                {label:"Total Inspections",val:inspections.length,col:"#1a1a1a"},
                {label:"Passed",val:inspections.filter(i=>i.result==="pass"||i.status==="passed").length,col:"#007700"},
                {label:"Failed",val:inspections.filter(i=>i.result==="fail"||i.status==="failed").length,col:"#cc0000"},
                {label:"Pending Review",val:inspections.filter(i=>i.status==="pending").length,col:"#cc6600"},
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>
                  <span style={{ color:"#555" }}>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.col }}>{r.val}</span>
                </div>
              ))}
              {/* Bar */}
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, color:"#555", marginBottom:4 }}>Pass Rate: {passRate}%</div>
                <div style={{ height:12, background:"#f0f0f0", border:"1px solid #ccc", borderRadius:2 }}>
                  <div style={{ height:"100%", width:`${passRate}%`, background:passRate>=80?"#007700":passRate>=60?"#cc6600":"#cc0000", borderRadius:2, transition:"width .4s" }}/>
                </div>
              </div>
            </div>

            {/* NCR Summary */}
            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12 }}>
              <div style={{ fontWeight:700, fontSize:12, borderBottom:"1px solid #ddd", paddingBottom:6, marginBottom:10, color:"#1a3580" }}>⚠️ NCR Summary</div>
              {[
                {label:"Total NCRs",val:ncrs.length,col:"#1a1a1a"},
                {label:"Open",val:ncrs.filter(n=>n.status==="open").length,col:"#cc6600"},
                {label:"In Progress",val:ncrs.filter(n=>n.status==="in_progress").length,col:"#2255cc"},
                {label:"Resolved",val:ncrs.filter(n=>n.status==="resolved").length,col:"#007700"},
                {label:"Critical",val:criticalNCRs,col:"#cc0000"},
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>
                  <span style={{ color:"#555" }}>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.col }}>{r.val}</span>
                </div>
              ))}
            </div>

            {/* Recent Inspections */}
            <div style={{ background:"#fff", border:"1px solid #ccc", gridColumn:"span 2" }}>
              <div style={{ background:ERP.sidebarHeader, color:"#fff", padding:"5px 10px", fontSize:11, fontWeight:700 }}>🔍 Recent Inspections</div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Item","Supplier","Batch","Qty","Result","Date"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {inspections.slice(0,8).map((ins,i)=>(
                    <tr key={ins.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }}>
                      <td style={erpStyles.gridTd}>{ins.item_name||"—"}</td>
                      <td style={erpStyles.gridTd}>{ins.supplier_name||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{ins.batch_number||"—"}</td>
                      <td style={erpStyles.gridTd}>{ins.quantity_inspected||"—"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={ins.result||ins.status}/></td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(ins.inspection_date||ins.created_at)}</td>
                    </tr>
                  ))}
                  {inspections.length===0 && <tr><td colSpan={6} style={{ padding:20, textAlign:"center", color:"#888" }}>No inspections yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inspections Tab */}
        {tab==="inspections" && (
          <div>
            <div style={{ marginBottom:8, display:"flex", gap:8 }}>
              <button onClick={()=>setShowNewInsp(v=>!v)} style={erpStyles.btn(true)}>+ New Inspection</button>
              <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#888", alignSelf:"center" }}>{inspections.length} records</span>
            </div>

            {showNewInsp && (
              <div style={{ background:"#fff", border:"1px solid #ccc", padding:12, marginBottom:8 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>🔍 Record Inspection</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  {[
                    {label:"Item Name *",key:"item_name"},{label:"Supplier",key:"supplier_name"},
                    {label:"Batch No.",key:"batch_number"},{label:"Qty Inspected",key:"quantity_inspected",type:"number"},
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>{f.label}</label>
                      <input type={f.type||"text"} value={(inspForm as any)[f.key]} onChange={e=>setInspForm(p=>({...p,[f.key]:e.target.value}))} style={inp}/>
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Result</label>
                    <select value={inspForm.result} onChange={e=>setInspForm(p=>({...p,result:e.target.value}))} style={inp}>
                      {["pass","fail","conditional"].map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Notes</label>
                    <input value={inspForm.notes} onChange={e=>setInspForm(p=>({...p,notes:e.target.value}))} style={inp}/>
                  </div>
                </div>
                <div style={{ marginTop:8, display:"flex", gap:8 }}>
                  <button onClick={createInspection} style={erpStyles.btn(true)}>💾 Save Inspection</button>
                  <button onClick={()=>setShowNewInsp(false)} style={erpStyles.btn(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ background:"#fff", border:"1px solid #ccc" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Item Name","Supplier","Batch","Qty Inspected","Qty Rejected","Result","Status","Date","Inspector"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={9} style={{ padding:30, textAlign:"center" }}>Loading...</td></tr> :
                  inspections.map((ins,i)=>(
                    <tr key={ins.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                      <td style={erpStyles.gridTd}>{ins.item_name||"—"}</td>
                      <td style={erpStyles.gridTd}>{ins.supplier_name||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{ins.batch_number||"—"}</td>
                      <td style={erpStyles.gridTd}>{ins.quantity_inspected||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, color:ins.quantity_rejected?"#cc0000":"#007700" }}>{ins.quantity_rejected||"0"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={ins.result||"pending"}/></td>
                      <td style={erpStyles.gridTd}><StatusChip status={ins.status}/></td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(ins.inspection_date||ins.created_at)}</td>
                      <td style={erpStyles.gridTd}>{ins.inspector_name||"—"}</td>
                    </tr>
                  ))}
                  {!loading && inspections.length===0 && <tr><td colSpan={9} style={{ padding:30, textAlign:"center", color:"#888" }}>No inspections</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NCR Tab */}
        {tab==="ncr" && (
          <div>
            <div style={{ marginBottom:8, display:"flex", gap:8 }}>
              <button onClick={()=>setShowNewNCR(v=>!v)} style={erpStyles.btn(true)}>+ New NCR</button>
              <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#888", alignSelf:"center" }}>{ncrs.length} total · {openNCRs} open</span>
            </div>

            {showNewNCR && (
              <div style={{ background:"#fff", border:"1px solid #ccc", padding:12, marginBottom:8 }}>
                <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>⚠️ New Non-Conformance Report</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                  <div style={{ gridColumn:"span 2" }}>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Title *</label>
                    <input value={ncrForm.title} onChange={e=>setNcrForm(p=>({...p,title:e.target.value}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Severity</label>
                    <select value={ncrForm.severity} onChange={e=>setNcrForm(p=>({...p,severity:e.target.value}))} style={inp}>
                      {["low","medium","high","critical"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Department</label>
                    <input value={ncrForm.department} onChange={e=>setNcrForm(p=>({...p,department:e.target.value}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Due Date</label>
                    <input type="date" value={ncrForm.due_date} onChange={e=>setNcrForm(p=>({...p,due_date:e.target.value}))} style={inp}/>
                  </div>
                  <div>
                    <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Notes</label>
                    <input value={ncrForm.notes} onChange={e=>setNcrForm(p=>({...p,notes:e.target.value}))} style={inp}/>
                  </div>
                </div>
                <div style={{ marginTop:8, display:"flex", gap:8 }}>
                  <button onClick={createNCR} style={erpStyles.btn(true)}>💾 Create NCR</button>
                  <button onClick={()=>setShowNewNCR(false)} style={erpStyles.btn(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div style={{ background:"#fff", border:"1px solid #ccc" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["NCR No.","Title","Severity","Department","Status","Assigned To","Due Date","Created","Actions"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={9} style={{ padding:30, textAlign:"center" }}>Loading...</td></tr> :
                  ncrs.map((n,i)=>(
                    <tr key={n.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#2255cc" }}>{n.ncr_number||`NCR/${new Date(n.created_at||Date.now()).getFullYear()}-AUTO`}</td>
                      <td style={erpStyles.gridTd}>{n.title||"—"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={n.severity||"medium"}/></td>
                      <td style={erpStyles.gridTd}>{n.department||"—"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={n.status}/></td>
                      <td style={erpStyles.gridTd}>{n.assigned_to||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, color:n.due_date&&new Date(n.due_date)<new Date()?"#cc0000":"#555" }}>{fmtDate(n.due_date||"")}</td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(n.created_at)}</td>
                      <td style={erpStyles.gridTd}>
                        {n.status==="open" && <button onClick={()=>resolveNCR(n.id)} style={{ ...erpStyles.btn(true), fontSize:10, padding:"2px 6px" }}>✓ Resolve</button>}
                      </td>
                    </tr>
                  ))}
                  {!loading && ncrs.length===0 && <tr><td colSpan={9} style={{ padding:30, textAlign:"center", color:"#888" }}>No NCRs</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {tab==="metrics" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {/* Severity Distribution */}
            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>📊 NCR by Severity</div>
              {["critical","high","medium","low"].map(sev=>{
                const count = ncrs.filter(n=>n.severity===sev).length;
                const pct = ncrs.length ? Math.round(count/ncrs.length*100) : 0;
                const col = sev==="critical"?"#cc0000":sev==="high"?"#cc6600":sev==="medium"?"#2255cc":"#007700";
                return (
                  <div key={sev} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:3 }}>
                      <span style={{ fontWeight:600, color:"#333", textTransform:"capitalize" }}>{sev}</span>
                      <span style={{ color:col, fontWeight:700 }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height:10, background:"#f0f0f0", border:"1px solid #ccc", borderRadius:2 }}>
                      <div style={{ height:"100%", width:`${pct}%`, background:col, borderRadius:2 }}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Inspection Performance */}
            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>🔍 Inspection Performance</div>
              {[
                {label:"Total Inspections",val:inspections.length,col:"#1a1a1a"},
                {label:"Pass Rate",val:`${passRate}%`,col:passRate>=80?"#007700":passRate>=60?"#cc6600":"#cc0000"},
                {label:"Fail Rate",val:`${100-passRate}%`,col:"#cc0000"},
                {label:"Avg Qty/Inspection",val:inspections.length?Math.round(inspections.reduce((s,i)=>s+(i.quantity_inspected||0),0)/inspections.length):0,col:"#1a1a1a"},
                {label:"Total Qty Inspected",val:fmt(inspections.reduce((s,i)=>s+(i.quantity_inspected||0),0)),col:"#2255cc"},
                {label:"Total Qty Rejected",val:fmt(inspections.reduce((s,i)=>s+(i.quantity_rejected||0),0)),col:"#cc0000"},
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>
                  <span style={{ color:"#555" }}>{r.label}</span>
                  <span style={{ fontWeight:700, color:r.col }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#e0e0e0", borderTop:"1px solid #aaa", padding:"2px 10px", fontSize:11, color:"#555", display:"flex", gap:16 }}>
        <span>Inspections: {inspections.length}</span>
        <span>|</span>
        <span>Pass Rate: {passRate}%</span>
        <span>|</span>
        <span>Open NCRs: {openNCRs}</span>
        <span style={{ marginLeft:"auto" }}>EL5 MediProcure v10 · Quality Dashboard</span>
      </div>
    </div>
  );
}

