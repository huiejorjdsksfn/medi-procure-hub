import type React from "react";
/**
 * EL5 MediProcure — Quality Control Dashboard v10
 * Classic ERP Financial Management System UI
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

const db = supabase as any;

interface Inspection {
  id: string; item_name?: string; supplier_name?: string; supplier_id?: string; status: string;
  inspection_date?: string; inspector_name?: string; result?: string;
  batch_number?: string; quantity_inspected?: number; quantity_rejected?: number;
  notes?: string; created_at: string;
}
interface NCR {
  id: string; nc_number?: string; title?: string; description?: string; status: string;
  severity?: string; category?: string; department?: string; reported_by?: string;
  assigned_to?: string; due_date?: string; created_at: string; resolved_at?: string;
  related_supplier_name?: string;
  root_cause?: string; corrective_action?: string; preventive_action?: string;
  effectiveness_verified?: boolean; verification_date?: string; verification_notes?: string; verified_by_name?: string;
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

type QCTab = "dashboard"|"inspections"|"ncr"|"suppliers"|"metrics";

export default function QualityDashboardPage() {
  const [tab, setTab] = useState<QCTab>("dashboard");
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewNCR, setShowNewNCR] = useState(false);
  const [showNewInsp, setShowNewInsp] = useState(false);
  const [ncrForm, setNcrForm] = useState({ title:"", severity:"medium", department:"", notes:"", due_date:"" });
  const [inspForm, setInspForm] = useState({ item_name:"", supplier_name:"", batch_number:"", quantity_inspected:"", result:"pass", notes:"" });

  // ── CAPA (Corrective & Preventive Action) workflow ──────────────────────
  // non_conformances always had root_cause/corrective_action/preventive_action
  // columns; nothing in the UI ever wrote to them — "Resolve" just flipped
  // status with no CAPA captured at all. Replacing that with a real CAPA
  // form, plus an AI-assisted root-cause suggestion and a follow-up
  // effectiveness-verification step so a CAPA can actually be closed out.
  const [capaTarget, setCapaTarget] = useState<NCR|null>(null);
  const [capaForm, setCapaForm] = useState({ root_cause:"", corrective_action:"", preventive_action:"" });
  const [capaSaving, setCapaSaving] = useState(false);
  const [capaAiLoading, setCapaAiLoading] = useState(false);

  const [verifyTarget, setVerifyTarget] = useState<NCR|null>(null);
  const [verifyForm, setVerifyForm] = useState({ verification_date:new Date().toISOString().slice(0,10), verification_notes:"" });
  const [verifySaving, setVerifySaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [insRes, ncrRes] = await Promise.allSettled([
        db.from("inspections").select("*").order("created_at",{ascending:false}).limit(100),
        db.from("non_conformances").select("*").order("created_at",{ascending:false}).limit(100),
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
    const { error } = await db.from("non_conformances").insert({
      nc_number:num, title:ncrForm.title, severity:ncrForm.severity,
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
    const { error } = await db.from("inspections").insert({
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

  function openCapa(ncr: NCR) {
    setCapaTarget(ncr);
    setCapaForm({
      root_cause: ncr.root_cause || "",
      corrective_action: ncr.corrective_action || "",
      preventive_action: ncr.preventive_action || "",
    });
  }

  async function aiSuggestCapa() {
    if (!capaTarget) return;
    setCapaAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-agent", {
        body: { action:"analyze_ncr", ncr: {
          title: capaTarget.title, description: capaTarget.description || capaTarget.title,
          severity: capaTarget.severity, category: capaTarget.category, department: capaTarget.department,
        } },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "AI analysis failed");
      const s = data.suggestion;
      setCapaForm({
        root_cause: `[${s.rootCauseCategory}] ${s.rootCause}`,
        corrective_action: s.correctiveAction,
        preventive_action: s.preventiveAction,
      });
      toast({ title:"✓ AI suggestion applied", description:"Review and edit before saving." });
    } catch(e:any) {
      toast({ title:"AI suggestion failed", description:e.message, variant:"destructive" });
    }
    setCapaAiLoading(false);
  }

  async function saveCapa() {
    if (!capaTarget) return;
    if (!capaForm.root_cause.trim() || !capaForm.corrective_action.trim()) {
      toast({ title:"Root cause and corrective action are required", variant:"destructive" });
      return;
    }
    setCapaSaving(true);
    const { error } = await db.from("non_conformances").update({
      root_cause: capaForm.root_cause, corrective_action: capaForm.corrective_action,
      preventive_action: capaForm.preventive_action,
      status:"resolved", resolved_at:new Date().toISOString(),
    }).eq("id", capaTarget.id);
    setCapaSaving(false);
    if (error) { toast({ title:"Error: "+error.message, variant:"destructive" }); return; }
    toast({ title:"✓ NCR resolved with CAPA recorded" });
    setCapaTarget(null);
    fetchAll();
  }

  async function saveVerification() {
    if (!verifyTarget) return;
    setVerifySaving(true);
    const { error } = await db.from("non_conformances").update({
      effectiveness_verified: true,
      verification_date: verifyForm.verification_date,
      verification_notes: verifyForm.verification_notes,
    }).eq("id", verifyTarget.id);
    setVerifySaving(false);
    if (error) { toast({ title:"Error: "+error.message, variant:"destructive" }); return; }
    toast({ title:"✓ Corrective action effectiveness verified" });
    setVerifyTarget(null);
    fetchAll();
  }

  const passRate = inspections.length ? Math.round(inspections.filter(i=>i.result==="pass"||i.status==="passed").length/inspections.length*100) : 0;
  const openNCRs = ncrs.filter(n=>n.status==="open").length;
  const criticalNCRs = ncrs.filter(n=>n.severity==="critical"&&n.status==="open").length;
  const pendingVerification = ncrs.filter(n=>n.status==="resolved"&&!n.effectiveness_verified).length;

  // Supplier Quality Scorecard: aggregate inspection outcomes per supplier.
  // Weighted score = pass rate minus a penalty for rejected-quantity ratio,
  // so a supplier with a few large rejected batches still scores worse than
  // raw pass/fail count alone would show.
  const supplierScores = (() => {
    const map = new Map<string, { supplier:string; total:number; passed:number; failed:number; qtyInspected:number; qtyRejected:number; ncrCount:number }>();
    for (const ins of inspections) {
      const key = ins.supplier_name || "Unknown Supplier";
      if (!map.has(key)) map.set(key, { supplier:key, total:0, passed:0, failed:0, qtyInspected:0, qtyRejected:0, ncrCount:0 });
      const s = map.get(key)!;
      s.total++;
      if (ins.result==="pass"||ins.status==="passed") s.passed++; else if (ins.result==="fail"||ins.status==="failed") s.failed++;
      s.qtyInspected += ins.quantity_inspected||0;
      s.qtyRejected += ins.quantity_rejected||0;
    }
    for (const n of ncrs) {
      if (!n.related_supplier_name) continue;
      if (!map.has(n.related_supplier_name)) map.set(n.related_supplier_name, { supplier:n.related_supplier_name, total:0, passed:0, failed:0, qtyInspected:0, qtyRejected:0, ncrCount:0 });
      map.get(n.related_supplier_name)!.ncrCount++;
    }
    return Array.from(map.values()).map(s => {
      const passPct = s.total ? (s.passed/s.total*100) : 0;
      const rejectPenalty = s.qtyInspected ? (s.qtyRejected/s.qtyInspected*100) : 0;
      const score = Math.max(0, Math.round(passPct - rejectPenalty*0.5 - s.ncrCount*3));
      const grade = score>=90?"Excellent":score>=75?"Good":score>=55?"Needs Improvement":"Poor";
      return { ...s, passPct:Math.round(passPct), score, grade };
    }).sort((a,b)=>b.total-a.total);
  })();

  // 6-month trend for the Metrics tab chart — real time-series instead of
  // static bars, bucketed by inspection/NCR created_at month.
  const trendData = (() => {
    const months: { key:string; label:string; passRate:number; ncrCount:number; inspCount:number }[] = [];
    const now = new Date();
    for (let i=5;i>=0;i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ key:`${d.getFullYear()}-${d.getMonth()}`, label:d.toLocaleDateString("en-KE",{month:"short"}), passRate:0, ncrCount:0, inspCount:0 });
    }
    const byKey = new Map(months.map(m=>[m.key,m]));
    for (const ins of inspections) {
      const d = new Date(ins.inspection_date || ins.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = byKey.get(key);
      if (m) { m.inspCount++; if (ins.result==="pass"||ins.status==="passed") (m as any)._pass = ((m as any)._pass||0)+1; }
    }
    for (const n of ncrs) {
      const d = new Date(n.created_at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = byKey.get(key);
      if (m) m.ncrCount++;
    }
    return months.map(m => ({ ...m, passRate: m.inspCount ? Math.round(((m as any)._pass||0)/m.inspCount*100) : 0 }));
  })();

  const kpiData = [
    { label:"INSPECTIONS", value:inspections.length },
    { label:"PASS RATE", value:`${passRate}%` },
    { label:"OPEN NCRs", value:openNCRs },
    { label:"CRITICAL", value:criticalNCRs },
    { label:"PENDING VERIFY", value:pendingVerification },
    { label:"RESOLVED", value:ncrs.filter(n=>n.status==="resolved").length },
  ];

  const inp: React.CSSProperties = { ...erpStyles.inp, width:"100%", boxSizing:"border-box" };

  const TABS: {id:QCTab;label:string}[] = [
    {id:"dashboard",label:"📊 Dashboard"},
    {id:"inspections",label:"🔍 Inspections"},
    {id:"ncr",label:"⚠️ NCR"},
    {id:"suppliers",label:"🏆 Suppliers"},
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
          <button onClick={()=>exportRowsToCSV(tab==="ncr"?ncrs:tab==="suppliers"?supplierScores:inspections, tab==="ncr"?"ncr_reports":tab==="suppliers"?"supplier_quality_scorecard":"inspections")} style={erpStyles.btn(false)}>- Export</button>
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
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11, fontWeight:700, color:"#2255cc" }}>{n.nc_number||`NCR/${new Date(n.created_at||Date.now()).getFullYear()}-AUTO`}</td>
                      <td style={erpStyles.gridTd}>{n.title||"—"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={n.severity||"medium"}/></td>
                      <td style={erpStyles.gridTd}>{n.department||"—"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={n.status}/></td>
                      <td style={erpStyles.gridTd}>{n.assigned_to||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, color:n.due_date&&new Date(n.due_date)<new Date()?"#cc0000":"#555" }}>{fmtDate(n.due_date||"")}</td>
                      <td style={{ ...erpStyles.gridTd, color:"#555" }}>{fmtDate(n.created_at)}</td>
                      <td style={erpStyles.gridTd}>
                        {(n.status==="open"||n.status==="in_progress") && <button onClick={()=>openCapa(n)} style={{ ...erpStyles.btn(true), fontSize:10, padding:"2px 6px" }}>✓ Resolve (CAPA)</button>}
                        {n.status==="resolved" && !n.effectiveness_verified && (
                          <button onClick={()=>setVerifyTarget(n)} style={{ ...erpStyles.btn(false), fontSize:10, padding:"2px 6px", color:"#cc6600", borderColor:"#cc6600" }}>🔎 Verify Effectiveness</button>
                        )}
                        {n.status==="resolved" && n.effectiveness_verified && (
                          <span style={{ fontSize:10, fontWeight:700, color:"#007700" }}>✓ Verified {fmtDate(n.verification_date||"")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && ncrs.length===0 && <tr><td colSpan={9} style={{ padding:30, textAlign:"center", color:"#888" }}>No NCRs</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suppliers Tab — Quality Scorecard */}
        {tab==="suppliers" && (
          <div>
            <div style={{ marginBottom:8, display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:11, color:"#888" }}>Score = pass rate − rejected-qty penalty − 3pts per linked NCR. Ranked by inspection volume.</span>
              <button onClick={fetchAll} style={{ ...erpStyles.btn(false), marginLeft:"auto" }}>↻ Refresh</button>
            </div>
            <div style={{ background:"#fff", border:"1px solid #ccc" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["Supplier","Inspections","Pass Rate","Qty Inspected","Qty Rejected","Linked NCRs","Quality Score","Grade"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {supplierScores.map((s,i)=>{
                    const gradeCol = s.grade==="Excellent"?"#007700":s.grade==="Good"?"#2255cc":s.grade==="Needs Improvement"?"#cc6600":"#cc0000";
                    return (
                      <tr key={s.supplier} style={{ background:i%2===0?"#fff":"#f7f7f7" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                        <td style={{ ...erpStyles.gridTd, fontWeight:700 }}>{s.supplier}</td>
                        <td style={erpStyles.gridTd}>{s.total}</td>
                        <td style={erpStyles.gridTd}>{s.passPct}%</td>
                        <td style={erpStyles.gridTd}>{fmt(s.qtyInspected)}</td>
                        <td style={{ ...erpStyles.gridTd, color:s.qtyRejected?"#cc0000":"#007700" }}>{fmt(s.qtyRejected)}</td>
                        <td style={{ ...erpStyles.gridTd, color:s.ncrCount?"#cc0000":"#555" }}>{s.ncrCount}</td>
                        <td style={{ ...erpStyles.gridTd, fontWeight:800, color:gradeCol }}>{s.score}</td>
                        <td style={erpStyles.gridTd}>
                          <span style={{ padding:"1px 8px", borderRadius:10, fontSize:10, fontWeight:700, background:gradeCol+"18", color:gradeCol, border:`1px solid ${gradeCol}44` }}>{s.grade}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {supplierScores.length===0 && <tr><td colSpan={8} style={{ padding:30, textAlign:"center", color:"#888" }}>No supplier data yet — record some inspections first</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Metrics Tab */}
        {tab==="metrics" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {/* 6-Month Trend */}
            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12, gridColumn:"span 2" }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>📈 6-Month Trend — Pass Rate vs NCR Volume</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData} margin={{ top:6, right:20, left:-10, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee"/>
                  <XAxis dataKey="label" tick={{ fontSize:11 }}/>
                  <YAxis yAxisId="left" tick={{ fontSize:10 }} domain={[0,100]} unit="%"/>
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize:10 }} allowDecimals={false}/>
                  <Tooltip contentStyle={{ fontSize:11, fontFamily:ERP.fontFamily }}/>
                  <Line yAxisId="left" type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#007700" strokeWidth={2} dot={{ r:3 }}/>
                  <Line yAxisId="right" type="monotone" dataKey="ncrCount" name="NCRs Filed" stroke="#cc0000" strokeWidth={2} dot={{ r:3 }}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

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

            {/* CAPA Effectiveness Loop */}
            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12, gridColumn:"span 2" }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>🔁 CAPA Effectiveness Loop</div>
              <div style={{ display:"flex", gap:24 }}>
                {[
                  { label:"Resolved w/ CAPA", val:ncrs.filter(n=>n.status==="resolved"&&n.root_cause).length, col:"#2255cc" },
                  { label:"Pending Verification", val:pendingVerification, col:"#cc6600" },
                  { label:"Effectiveness Verified", val:ncrs.filter(n=>n.effectiveness_verified).length, col:"#007700" },
                ].map(r=>(
                  <div key={r.label}>
                    <div style={{ fontSize:24, fontWeight:800, color:r.col }}>{r.val}</div>
                    <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase" }}>{r.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CAPA Modal */}
      {capaTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:16 }} onClick={()=>setCapaTarget(null)}>
          <div style={{ background:"#fff", border:"1px solid #999", width:"min(560px,94vw)", maxHeight:"90vh", overflowY:"auto", fontFamily:ERP.fontFamily }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:ERP.titleBar, color:"#fff", padding:"8px 14px", fontWeight:700, fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>✓ Resolve NCR — {capaTarget.nc_number || capaTarget.title}</span>
              <span style={{ cursor:"pointer" }} onClick={()=>setCapaTarget(null)}>×</span>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ fontSize:12, color:"#555", marginBottom:12 }}>{capaTarget.title}</div>

              <button onClick={aiSuggestCapa} disabled={capaAiLoading}
                style={{ ...erpStyles.btn(false), marginBottom:14, background:"linear-gradient(180deg,#7c3aed,#5b21b6)", color:"#fff", border:"1px solid #5b21b6" }}>
                {capaAiLoading ? "🤖 Analyzing…" : "✨ AI Suggest Root Cause & CAPA"}
              </button>

              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Root Cause *</label>
              <textarea value={capaForm.root_cause} onChange={e=>setCapaForm(p=>({...p,root_cause:e.target.value}))} rows={2}
                style={{ ...erpStyles.inp, width:"100%", boxSizing:"border-box", marginBottom:10, resize:"vertical", fontFamily:ERP.fontFamily }}/>

              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Corrective Action (immediate fix) *</label>
              <textarea value={capaForm.corrective_action} onChange={e=>setCapaForm(p=>({...p,corrective_action:e.target.value}))} rows={2}
                style={{ ...erpStyles.inp, width:"100%", boxSizing:"border-box", marginBottom:10, resize:"vertical", fontFamily:ERP.fontFamily }}/>

              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Preventive Action (stop recurrence)</label>
              <textarea value={capaForm.preventive_action} onChange={e=>setCapaForm(p=>({...p,preventive_action:e.target.value}))} rows={2}
                style={{ ...erpStyles.inp, width:"100%", boxSizing:"border-box", marginBottom:14, resize:"vertical", fontFamily:ERP.fontFamily }}/>

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveCapa} disabled={capaSaving} style={erpStyles.btn(true)}>{capaSaving?"Saving…":"💾 Resolve with CAPA"}</button>
                <button onClick={()=>setCapaTarget(null)} style={erpStyles.btn(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Effectiveness Verification Modal */}
      {verifyTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:16 }} onClick={()=>setVerifyTarget(null)}>
          <div style={{ background:"#fff", border:"1px solid #999", width:"min(460px,94vw)", fontFamily:ERP.fontFamily }} onClick={e=>e.stopPropagation()}>
            <div style={{ background:ERP.titleBar, color:"#fff", padding:"8px 14px", fontWeight:700, fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span>🔎 Verify CAPA Effectiveness</span>
              <span style={{ cursor:"pointer" }} onClick={()=>setVerifyTarget(null)}>×</span>
            </div>
            <div style={{ padding:16 }}>
              <div style={{ fontSize:12, color:"#555", marginBottom:4 }}>{verifyTarget.nc_number || verifyTarget.title}</div>
              <div style={{ fontSize:11, color:"#888", marginBottom:12, fontStyle:"italic" }}>Corrective action taken: {verifyTarget.corrective_action || "—"}</div>

              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Verification Date</label>
              <input type="date" value={verifyForm.verification_date} onChange={e=>setVerifyForm(p=>({...p,verification_date:e.target.value}))}
                style={{ ...erpStyles.inp, width:"100%", boxSizing:"border-box", marginBottom:10 }}/>

              <label style={{ fontSize:10, fontWeight:700, color:"#555", display:"block", marginBottom:3 }}>Verification Notes — did the corrective action actually work?</label>
              <textarea value={verifyForm.verification_notes} onChange={e=>setVerifyForm(p=>({...p,verification_notes:e.target.value}))} rows={3}
                style={{ ...erpStyles.inp, width:"100%", boxSizing:"border-box", marginBottom:14, resize:"vertical", fontFamily:ERP.fontFamily }}/>

              <div style={{ display:"flex", gap:8 }}>
                <button onClick={saveVerification} disabled={verifySaving} style={erpStyles.btn(true)}>{verifySaving?"Saving…":"✓ Confirm Verified"}</button>
                <button onClick={()=>setVerifyTarget(null)} style={erpStyles.btn(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"#e0e0e0", borderTop:"1px solid #aaa", padding:"2px 10px", fontSize:11, color:"#555", display:"flex", gap:16 }}>
        <span>Inspections: {inspections.length}</span>
        <span>|</span>
        <span>Pass Rate: {passRate}%</span>
        <span>|</span>
        <span>Open NCRs: {openNCRs}</span>
        <span style={{ marginLeft:"auto" }}>Quality Dashboard</span>
      </div>
    </div>
  );
}

