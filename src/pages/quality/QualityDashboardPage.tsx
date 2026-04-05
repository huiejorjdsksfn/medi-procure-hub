import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { RefreshCw, Printer, Download, Save, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import logoImg from "@/assets/logo.png";

// ─── constants ────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const SEV_COL: Record<string,string> = {
  critical:"#dc2626", major:"#d97706", minor:"#2563eb"
};
const STATUS_BG: Record<string,string> = {
  open:"#fee2e2", under_review:"#fef3c7", closed:"#dcfce7",
  pass:"#dcfce7", fail:"#fee2e2", pending:"#f3f4f6", conditional:"#fef3c7"
};
const STATUS_COL: Record<string,string> = {
  open:"#dc2626", under_review:"#92400e", closed:"#15803d",
  pass:"#15803d", fail:"#dc2626", pending:"#6b7280", conditional:"#92400e"
};

// ─── row shapes ───────────────────────────────────────────────────────────────
type IQCRow = {
  id?: string;
  supplier_name: string;
  item_code: string;
  invoice_no: string;
  rej_qty: string;
  problem_description: string;
  severity: string;
  stage_of_issue: string;
  proposed_actions: string;
  corrective_action: string;
  scar_required: string;
  status: string;
};
type PendRow = { id?: string; date_of_rejection: string; reason_for_pendency: string; responsible: string };
type LQCRow  = { id?: string; line: string; defect_type: string; qty_rejected: string; rejection_rate: string; root_cause: string; corrective_action: string; status: string };

const emptyIQC  = (): IQCRow  => ({ supplier_name:"", item_code:"", invoice_no:"", rej_qty:"", problem_description:"", severity:"", stage_of_issue:"Incoming", proposed_actions:"", corrective_action:"", scar_required:"No", status:"" });
const emptyPend = (): PendRow => ({ date_of_rejection:"", reason_for_pendency:"", responsible:"" });
const emptyLQC  = (): LQCRow  => ({ line:"", defect_type:"", qty_rejected:"", rejection_rate:"", root_cause:"", corrective_action:"", status:"" });

// ─── shared cell styles ───────────────────────────────────────────────────────
const border = "1px solid #4472c4";

const tdBase: React.CSSProperties = {
  border, padding:"2px 3px", fontSize:9.5, textAlign:"center",
  verticalAlign:"middle", lineHeight:1.3, background:"#fff", color:"#1a1a2e",
};
const thBase: React.CSSProperties = {
  ...tdBase, background:"#bdd7ee", fontWeight:700,
};
const darkTh: React.CSSProperties = {
  ...thBase, background:"#2e75b6", color:"#fff",
};
const sectionHd: React.CSSProperties = {
  ...darkTh, fontSize:11, padding:"5px 8px", textAlign:"center",
};
const inpStyle: React.CSSProperties = {
  width:"100%", border:"none", outline:"none", background:"#f8fafc",
  fontSize:9.5, fontFamily:"inherit", padding:"2px 4px",
  textAlign:"center", color:"#1a1a2e", boxSizing:"border-box",
};
const selStyle: React.CSSProperties = {
  ...inpStyle, cursor:"pointer",
};

export default function QualityDashboardPage() {
  const { user, profile } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const sysName = getSetting("system_name","EL5 MediProcure");
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [month,  setMonth]  = useState(MONTHS[new Date().getMonth()]);
  const [year,   setYear]   = useState(String(new Date().getFullYear()));
  const [loading,setLoading] = useState(true);
  const [saving, setSaving]  = useState(false);
  // hospitalName now from useSystemSettings
  // sysName now from useSystemSettings
  const [lqcComments,  setLqcComments]  = useState("");

  const [iqcRows,  setIqcRows]  = useState<IQCRow[]>(Array.from({length:12}, emptyIQC));
  const [pendRows, setPendRows] = useState<PendRow[]>(Array.from({length:6},  emptyPend));
  const [lqcRows,  setLqcRows]  = useState<LQCRow[]>(Array.from({length:8},  emptyLQC));

  // ── load ────────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [inspRes, ncrRes, sysRes] = await Promise.all([
        (supabase as any).from("inspections").select("*").order("created_at",{ascending:false}).limit(12),
        (supabase as any).from("non_conformance").select("*").order("created_at",{ascending:false}).limit(6),
        (supabase as any).from("system_settings").select("key,value")
          .in("key",["hospital_name","system_name","system_logo_url"]),
      ]);

      // map inspections → IQC rows
      if (inspRes.data?.length) {
        setIqcRows(Array.from({length:12}, (_,i) => {
          const r = inspRes.data[i];
          if (!r) return emptyIQC();
          return {
            id: r.id,
            supplier_name:      r.supplier_name || "",
            item_code:          r.inspection_number || "",
            invoice_no:         r.grn_reference || "",
            rej_qty:            String(r.quantity_rejected || ""),
            problem_description:r.rejection_reason || "",
            severity:           r.quantity_rejected > 5 ? "major"
                                : r.quantity_rejected > 0 ? "minor" : "",
            stage_of_issue:     "Incoming",
            proposed_actions:   r.notes || "",
            corrective_action:  r.corrective_action || "",
            scar_required:      r.quantity_rejected > 0 ? "Yes" : "No",
            status:             r.result || "",
          };
        }));
      }

      // map NCRs → pending-return rows
      if (ncrRes.data?.length) {
        setPendRows(Array.from({length:6}, (_,i) => {
          const r = ncrRes.data[i];
          if (!r) return emptyPend();
          return {
            id:                  r.id,
            date_of_rejection:   r.ncr_date || "",
            reason_for_pendency: r.root_cause || r.description || "",
            responsible:         r.responsible_person || "",
          };
        }));
      }

      // system settings
      const m: Record<string,string> = {};
      (sysRes.data || []).forEach((r:any) => { if (r.key) m[r.key] = r.value || ""; });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // ── cell updaters ────────────────────────────────────────────────────────────
  const updIQC  = (i:number, f:keyof IQCRow,  v:string) => setIqcRows(r  => r.map((x,j)=>j===i?{...x,[f]:v}:x));
  const updPend = (i:number, f:keyof PendRow, v:string) => setPendRows(r => r.map((x,j)=>j===i?{...x,[f]:v}:x));
  const updLQC  = (i:number, f:keyof LQCRow,  v:string) => setLqcRows(r  => r.map((x,j)=>j===i?{...x,[f]:v}:x));

  // ── save ─────────────────────────────────────────────────────────────────────
  const saveAll = async () => {
    setSaving(true);
    let saved = 0;
    try {
      for (const row of iqcRows.filter(r => r.supplier_name || r.item_code)) {
        const payload = {
          inspection_number:  row.item_code || `IQC/${new Date().getFullYear()}/${Math.floor(100+Math.random()*900)}`,
          supplier_name:      row.supplier_name,
          item_name:          row.problem_description.slice(0,80) || "QC Item",
          grn_reference:      row.invoice_no,
          quantity_rejected:  Number(row.rej_qty || 0),
          quantity_inspected: Number(row.rej_qty || 0),
          quantity_accepted:  0,
          rejection_reason:   row.problem_description,
          corrective_action:  row.corrective_action || row.proposed_actions,
          notes:              row.proposed_actions,
          result:             row.status || "pending",
          inspection_date:    new Date().toISOString().slice(0,10),
          created_by:         user?.id,
          created_by_name:    profile?.full_name,
        };
        if (row.id) {
          await (supabase as any).from("inspections").update(payload).eq("id", row.id);
        } else {
          const { data } = await (supabase as any).from("inspections").insert(payload).select().single();
          if (data) row.id = data.id;
        }
        saved++;
      }

      for (const row of pendRows.filter(r => r.reason_for_pendency)) {
        const payload = {
          ncr_number:       `NCR/${new Date().getFullYear()}/${Math.floor(100+Math.random()*900)}`,
          title:            row.reason_for_pendency.slice(0,80) || "Material Pending Return",
          description:      row.reason_for_pendency,
          ncr_date:         row.date_of_rejection || new Date().toISOString().slice(0,10),
          responsible_person: row.responsible,
          root_cause:       row.reason_for_pendency,
          status:           "open",
          severity:         "minor",
          source:           "QC Dashboard",
          created_by:       user?.id,
          created_by_name:  profile?.full_name,
        };
        if (!row.id) {
          const { data } = await (supabase as any).from("non_conformance").insert(payload).select().single();
          if (data) row.id = data.id;
          saved++;
        }
      }

      logAudit(user?.id, profile?.full_name, "update", "quality_dashboard", undefined, { month, year, saved });
      toast({ title: `Dashboard saved ✓`, description: `${saved} records updated` });
    } catch(e:any) {
      toast({ title:"Error", description: e.message, variant:"destructive" });
    }
    setSaving(false);
  };

  // ── print ─────────────────────────────────────────────────────────────────────
  const doPrint = () => {
    const win = window.open("","_blank","width=1200,height=850");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Quality Dashboard — ${month} ${year}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:"Calibri",Arial,sans-serif;font-size:9pt;background:#fff;color:#1a1a2e;}
        table{border-collapse:collapse;width:100%;}
        td,th{border:1px solid #4472c4;padding:2px 4px;font-size:9pt;text-align:center;vertical-align:middle;}
        .bdd7ee{background:#bdd7ee!important;font-weight:700;}
        .blue{background:#2e75b6!important;color:#fff!important;font-weight:700;}
        input,select,textarea{border:none!important;outline:none;background:transparent;width:100%;font-size:9pt;font-family:inherit;text-align:center;}
        .no-print{display:none!important;}
        @media print{@page{size:A3 landscape;margin:6mm;}}
      </style>
    </head><body>${printRef.current?.innerHTML||""}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  // ── export excel ───────────────────────────────────────────────────────────────
  const doExport = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      iqcRows.map((r,i)=>({ "Sr.No":i+1, ...r }))
    ), "IQC");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      pendRows.map((r,i)=>({ "Sr.No":i+1, ...r }))
    ), "Pending Returns");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lqcRows), "LQC");
    XLSX.writeFile(wb, `Quality_Dashboard_${month}_${year}.xlsx`);
    toast({ title:"Excel exported ✓" });
  };

  // ── derived stats ────────────────────────────────────────────────────────────
  const totalRej    = iqcRows.reduce((s,r)=>s+Number(r.rej_qty||0), 0);
  const usedIQC     = iqcRows.filter(r=>r.supplier_name).length;
  const closedIQC   = iqcRows.filter(r=>r.status==="closed"||r.status==="pass").length;
  const openIQC     = iqcRows.filter(r=>r.status==="open"||r.status==="fail").length;
  const pendingMat  = pendRows.filter(r=>r.reason_for_pendency).length;
  const lqcUsed     = lqcRows.filter(r=>r.line).length;

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"70vh",flexDirection:"column",gap:12,fontFamily:"'Segoe UI',system-ui"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <RefreshCw style={{width:30,height:30,color:"#2e75b6",animation:"spin 1s linear infinite"}}/>
      <span style={{color:"#6b7280",fontSize:13}}>Loading Quality Dashboard...</span>
    </div>
  );

  return (
    <div style={{fontFamily:"'Segoe UI',Calibri,system-ui",background:"#f0f2f5",minHeight:"100%"}}>
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        /* qrow/qinp/qsel styles now inline */
      `}</style>

      {/* ══ TOP TOOLBAR ══ */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#2e75b6)",padding:"10px 18px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 2px 10px rgba(0,0,0,0.2)",flexShrink:0}}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:900,color:"#fff"}}>Quality Dashboard</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{hospitalName} · IQC &amp; LQC Tracking Form</div>
        </div>
        {/* Month / Year */}
        <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.12)",borderRadius:8,padding:"5px 12px",border:"1px solid rgba(255,255,255,0.2)"}}>
          <Calendar style={{width:12,height:12,color:"rgba(255,255,255,0.9)"}}/>
          <select value={month} onChange={e=>setMonth(e.target.value)}
            style={{background:"#f8fafc",border:"none",color:"#fff",fontSize:12,fontWeight:700,outline:"none",cursor:"pointer"}}>
            {MONTHS.map(m=><option key={m} value={m} style={{color:"#1a1a2e"}}>{m}</option>)}
          </select>
          <input value={year} onChange={e=>setYear(e.target.value)}
            style={{background:"#f8fafc",border:"none",color:"#fff",fontSize:12,fontWeight:700,outline:"none",width:46,textAlign:"center"}}
            maxLength={4}/>
        </div>
        <button onClick={load} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:7,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:600}}>
          <RefreshCw style={{width:12,height:12}}/>Refresh
        </button>
        <button onClick={doExport} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:7,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:600}}>
          <Download style={{width:12,height:12}}/>Excel
        </button>
        <button onClick={doPrint} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 13px",background:"rgba(255,255,255,0.14)",border:"1px solid rgba(255,255,255,0.22)",borderRadius:7,cursor:"pointer",color:"#fff",fontSize:11,fontWeight:600}}>
          <Printer style={{width:12,height:12}}/>Print
        </button>
        <button onClick={saveAll} disabled={saving} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 18px",background:"#C45911",border:"none",borderRadius:7,cursor:saving?"not-allowed":"pointer",color:"#fff",fontSize:12,fontWeight:800,opacity:saving?0.75:1}}>
          {saving
            ? <RefreshCw style={{width:12,height:12,animation:"spin 1s linear infinite"}}/>
            : <Save style={{width:12,height:12}}/>}
          {saving ? "Saving..." : "Save Dashboard"}
        </button>
      </div>

      {/* ══ KPI STRIP ══ */}
      <div style={{display:"flex",background:"#fff",borderBottom:"2px solid #2e75b6"}}>
        {[
          {label:"Total Rejected",    val:totalRej,   col:"#dc2626"},
          {label:"IQC Rows Used",     val:usedIQC,    col:"#2563eb"},
          {label:"Open Issues",       val:openIQC,    col:"#d97706"},
          {label:"Closed / Passed",   val:closedIQC,  col:"#15803d"},
          {label:"Pending Returns",   val:pendingMat, col:"#7c3aed"},
          {label:"LQC Lines Active",  val:lqcUsed,    col:"#0369a1"},
        ].map((k,i)=>(
          <div key={i} style={{flex:1,borderRight:"1px solid #e5e7eb",padding:"7px 10px",textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:900,color:k.col,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:8.5,color:"#6b7280",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",marginTop:2}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ══ PRINTABLE FORM AREA ══ */}
      <div style={{padding:"10px 12px",overflowX:"auto"}} ref={printRef}>
        <div style={{minWidth:900}}>

          {/* ── Title row ── */}
          <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
            <tbody>
              <tr>
                <td style={{...tdBase,width:130,padding:6,textAlign:"center"}}>
                  <img src={logoImg} alt="EL5H Logo" style={{width:60,height:60,objectFit:"contain",display:"block",margin:"0 auto 2px"}} />
                  <div style={{fontWeight:700,fontSize:9,color:"#2e75b6",marginTop:2}}>EL5H</div>
                </td>
                <td style={{...tdBase,textAlign:"center",padding:"6px 0"}}>
                  <div style={{fontSize:17,fontWeight:900,color:"#1a1a2e",letterSpacing:"0.02em"}}>Quality Dashboard</div>
                  <div style={{fontSize:9.5,color:"#6b7280",marginTop:2}}>{hospitalName}</div>
                </td>
                <td style={{...tdBase,width:200,padding:"6px 10px",textAlign:"left"}}>
                  <div style={{fontSize:9,color:"#6b7280",fontWeight:600}}>Month:</div>
                  <div style={{fontSize:13,fontWeight:900,color:"#2e75b6"}}>{month} {year}</div>
                  <div style={{fontSize:8.5,color:"#9ca3af",marginTop:2}}>Doc Ref: QD/EL5H/{year}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ══ IQC TABLE ══ */}
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:2,tableLayout:"fixed"}}>
            <thead>
              <tr>
                <th colSpan={12} style={sectionHd}>Incoming Quality Control (IQC)</th>
              </tr>
              {/* Header row 1 */}
              <tr>
                <th rowSpan={2} style={{...thBase,width:26}}>Sr.<br/>No.</th>
                <th rowSpan={2} style={{...thBase,width:"11%"}}>Supplier Name</th>
                <th colSpan={3} style={{...thBase}}>Issues Descriptions</th>
                <th rowSpan={2} style={{...thBase,width:"14%"}}>Problem Descriptions</th>
                <th rowSpan={2} style={{...thBase,width:58}}>Severity</th>
                <th rowSpan={2} style={{...thBase,width:64}}>Stage of<br/>Issue</th>
                <th rowSpan={2} style={{...thBase,width:"10%"}}>Proposed<br/>Actions</th>
                <th rowSpan={2} style={{...thBase,width:"10%"}}>Corrective<br/>Actions</th>
                <th rowSpan={2} style={{...thBase,width:54}}>SCAR<br/>Required</th>
                <th rowSpan={2} style={{...thBase,width:64}}>Status</th>
              </tr>
              {/* Header row 2 */}
              <tr>
                <th style={{...thBase,width:64}}>Item Code</th>
                <th style={{...thBase,width:64}}>Invoice No.</th>
                <th style={{...thBase,width:46}}>Rej (Qty)</th>
              </tr>
            </thead>
            <tbody>
              {iqcRows.map((row,i)=>(
                <tr key={i} onMouseEnter={e=>{Array.from((e.currentTarget as HTMLElement).querySelectorAll("td")).forEach((td:any)=>td.style.background="#f0f7ff")}} onMouseLeave={e=>{Array.from((e.currentTarget as HTMLElement).querySelectorAll("td")).forEach((td:any)=>td.style.background="")}}>
                  {/* Sr No */}
                  <td style={{...tdBase,background:"#dce6f1",fontWeight:700}}>{i+1}</td>
                  {/* Supplier */}
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"left",color:"#111827",boxSizing:"border-box" as const,paddingLeft:4}} value={row.supplier_name} placeholder="Supplier..."
                      onChange={e=>updIQC(i,"supplier_name",e.target.value)}/>
                  </td>
                  {/* Item Code */}
                  <td style={{...tdBase,padding:0}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} value={row.item_code} placeholder="Code"
                      onChange={e=>updIQC(i,"item_code",e.target.value)}/>
                  </td>
                  {/* Invoice No */}
                  <td style={{...tdBase,padding:0}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} value={row.invoice_no} placeholder="Inv#"
                      onChange={e=>updIQC(i,"invoice_no",e.target.value)}/>
                  </td>
                  {/* Rej Qty */}
                  <td style={{...tdBase,padding:0}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} type="number" min={0} value={row.rej_qty} placeholder="0"
                      onChange={e=>updIQC(i,"rej_qty",e.target.value)}
                      style={{color:Number(row.rej_qty||0)>0?"#dc2626":"inherit",fontWeight:Number(row.rej_qty||0)>0?700:400}}/>
                  </td>
                  {/* Problem Description */}
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box",textAlign:"left",paddingLeft:4}}} value={row.problem_description} placeholder="Describe issue..."
                      onChange={e=>updIQC(i,"problem_description",e.target.value)}/>
                  </td>
                  {/* Severity */}
                  <td style={{...tdBase,padding:0}}>
                    <select style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",textAlign:"center",cursor:"pointer",color:"#111827"}} value={row.severity}
                      onChange={e=>updIQC(i,"severity",e.target.value)}
                      style={{color:row.severity ? SEV_COL[row.severity]||"#1a1a2e" : "#9ca3af",
                              fontWeight:row.severity?700:400}}>
                      <option value="">—</option>
                      <option value="critical">Critical</option>
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  </td>
                  {/* Stage of Issue */}
                  <td style={{...tdBase,padding:0}}>
                    <select style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",textAlign:"center",cursor:"pointer",color:"#111827"}} value={row.stage_of_issue}
                      onChange={e=>updIQC(i,"stage_of_issue",e.target.value)}>
                      <option value="">—</option>
                      <option>Incoming</option>
                      <option>In-Process</option>
                      <option>Final</option>
                      <option>Dispatch</option>
                      <option>Customer</option>
                    </select>
                  </td>
                  {/* Proposed Actions */}
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box",textAlign:"left",paddingLeft:4}}} value={row.proposed_actions} placeholder="Action..."
                      onChange={e=>updIQC(i,"proposed_actions",e.target.value)}/>
                  </td>
                  {/* Corrective Actions */}
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box",textAlign:"left",paddingLeft:4}}} value={row.corrective_action} placeholder="Corrective..."
                      onChange={e=>updIQC(i,"corrective_action",e.target.value)}/>
                  </td>
                  {/* SCAR Required */}
                  <td style={{...tdBase,padding:0}}>
                    <select style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",textAlign:"center",cursor:"pointer",color:"#111827"}} value={row.scar_required}
                      onChange={e=>updIQC(i,"scar_required",e.target.value)}>
                      <option value="">—</option>
                      <option>Yes</option>
                      <option>No</option>
                      <option>Pending</option>
                    </select>
                  </td>
                  {/* Status */}
                  <td style={{...tdBase,padding:0,
                    background: row.status ? (STATUS_BG[row.status]||"#fff") : "#fff"}}>
                    <select style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",textAlign:"center",cursor:"pointer",color:"#111827"}} value={row.status}
                      onChange={e=>updIQC(i,"status",e.target.value)}
                      style={{color: row.status ? (STATUS_COL[row.status]||"#1a1a2e") : "#9ca3af",
                              fontWeight:row.status?700:400,
                              background:"#f8fafc"}}>
                      <option value="">—</option>
                      <option value="open">Open</option>
                      <option value="under_review">Under Review</option>
                      <option value="conditional">Conditional</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ══ PENDING RETURNS + PHOTO SECTION ══ */}
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:2,tableLayout:"fixed"}}>
            <tbody>
              <tr>
                {/* Left: NOT RETURNED table */}
                <td style={{width:"54%",padding:0,verticalAlign:"top",border}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead>
                      <tr>
                        <th colSpan={4} style={{...darkTh,fontSize:9.5,textAlign:"left",padding:"4px 8px"}}>
                          Sr. No. Of material NOT RETURNED to Supplier:
                          <span style={{color:"#ffd700",marginLeft:8,fontSize:12}}>{pendingMat}</span>
                        </th>
                      </tr>
                      <tr>
                        <th style={{...thBase,width:30}}>Sr.<br/>No.</th>
                        <th style={thBase}>Date of Rejection</th>
                        <th style={thBase}>Reason for Pendency</th>
                        <th style={thBase}>Responsible</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendRows.map((row,i)=>(
                        <tr key={i} onMouseEnter={e=>{Array.from((e.currentTarget as HTMLElement).querySelectorAll("td")).forEach((td:any)=>td.style.background="#f0f7ff")}} onMouseLeave={e=>{Array.from((e.currentTarget as HTMLElement).querySelectorAll("td")).forEach((td:any)=>td.style.background="")}}>
                          <td style={{...tdBase,background:"#dce6f1",fontWeight:700}}>{i+1}</td>
                          <td style={{...tdBase,padding:0}}>
                            <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} type="date" value={row.date_of_rejection}
                              onChange={e=>updPend(i,"date_of_rejection",e.target.value)}
                              style={{fontSize:9}}/>
                          </td>
                          <td style={{...tdBase,padding:0,textAlign:"left"}}>
                            <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} value={row.reason_for_pendency} placeholder="Reason..."
                              onChange={e=>updPend(i,"reason_for_pendency",e.target.value)}
                              style={{textAlign:"left",paddingLeft:4}}/>
                          </td>
                          <td style={{...tdBase,padding:0}}>
                            <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} value={row.responsible} placeholder="Name..."
                              onChange={e=>updPend(i,"responsible",e.target.value)}/>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>

                {/* Right: Photo area */}
                <td style={{width:"46%",padding:0,verticalAlign:"top",border}}>
                  <div style={{...darkTh,fontSize:9.5,textAlign:"center",padding:"4px 8px",
                    textDecoration:"underline",cursor:"pointer"}}>
                    Photo Of Material Not returned to Supplier
                  </div>
                  <div style={{background:"#f8fafc",minHeight:112,padding:8,
                    display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                    {pendRows.filter(r=>r.date_of_rejection||r.reason_for_pendency).map((r,i)=>(
                      <div key={i} style={{background:"#dce6f1",borderRadius:5,padding:5,
                        fontSize:8.5,color:"#374151",textAlign:"center",border:"1px solid #bdd7ee"}}>
                        <div style={{fontWeight:700,color:"#1d4ed8",marginBottom:2}}>#{i+1}</div>
                        <div style={{color:"#374151",lineHeight:1.3,marginBottom:2}}>
                          {r.reason_for_pendency?.slice(0,40)||"Pending material"}
                        </div>
                        {r.date_of_rejection&&<div style={{color:"#6b7280",fontSize:8}}>{r.date_of_rejection}</div>}
                        {r.responsible&&<div style={{color:"#2563eb",fontSize:8,fontWeight:600,marginTop:2}}>{r.responsible}</div>}
                      </div>
                    ))}
                    {pendRows.filter(r=>r.date_of_rejection||r.reason_for_pendency).length===0&&(
                      <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",
                        justifyContent:"center",height:80,color:"#d1d5db",fontSize:10,fontStyle:"italic" as const}}>
                        No pending returns recorded
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ══ LQC TABLE ══ */}
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:2,tableLayout:"fixed"}}>
            <thead>
              <tr>
                <th colSpan={7} style={sectionHd}>Line Quality Control (LQC)</th>
              </tr>
              <tr>
                <th style={{...thBase,width:"12%"}}>Production Line</th>
                <th style={{...thBase,width:"14%"}}>Defect Type</th>
                <th style={{...thBase,width:62}}>Qty Rejected</th>
                <th style={{...thBase,width:72}}>Rejection Rate %</th>
                <th style={{...thBase,width:"18%"}}>Root Cause</th>
                <th style={{...thBase}}>Corrective Action</th>
                <th style={{...thBase,width:70}}>Status</th>
              </tr>
            </thead>
            <tbody>
              {lqcRows.map((row,i)=>(
                <tr key={i} onMouseEnter={e=>{Array.from((e.currentTarget as HTMLElement).querySelectorAll("td")).forEach((td:any)=>td.style.background="#f0f7ff")}} onMouseLeave={e=>{Array.from((e.currentTarget as HTMLElement).querySelectorAll("td")).forEach((td:any)=>td.style.background="")}}>
                  <td style={{...tdBase,padding:0}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} value={row.line} placeholder="Line/Dept"
                      onChange={e=>updLQC(i,"line",e.target.value)}/>
                  </td>
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box",textAlign:"left",paddingLeft:4}}} value={row.defect_type} placeholder="Defect type..."
                      onChange={e=>updLQC(i,"defect_type",e.target.value)}/>
                  </td>
                  <td style={{...tdBase,padding:0}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} type="number" min={0} value={row.qty_rejected} placeholder="0"
                      onChange={e=>updLQC(i,"qty_rejected",e.target.value)}
                      style={{color:Number(row.qty_rejected||0)>0?"#dc2626":"inherit",
                              fontWeight:Number(row.qty_rejected||0)>0?700:400}}/>
                  </td>
                  <td style={{...tdBase,padding:0}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box"}} value={row.rejection_rate} placeholder="e.g. 2.5%"
                      onChange={e=>updLQC(i,"rejection_rate",e.target.value)}/>
                  </td>
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box",textAlign:"left",paddingLeft:4}}} value={row.root_cause} placeholder="Root cause..."
                      onChange={e=>updLQC(i,"root_cause",e.target.value)}/>
                  </td>
                  <td style={{...tdBase,padding:0,textAlign:"left"}}>
                    <input style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",padding:"2px 4px",textAlign:"center",color:"#111827",boxSizing:"border-box",textAlign:"left",paddingLeft:4}}} value={row.corrective_action} placeholder="Corrective action..."
                      onChange={e=>updLQC(i,"corrective_action",e.target.value)}/>
                  </td>
                  <td style={{...tdBase,padding:0,
                    background:row.status?(STATUS_BG[row.status]||"#fff"):"#fff"}}>
                    <select style={{width:"100%",border:"none",outline:"none",background:"#f8fafc",fontSize:"9.5px",fontFamily:"inherit",textAlign:"center",cursor:"pointer",color:"#111827"}} value={row.status}
                      onChange={e=>updLQC(i,"status",e.target.value)}
                      style={{color:row.status?(STATUS_COL[row.status]||"#1a1a2e"):"#9ca3af",
                              fontWeight:row.status?700:400,background:"#f8fafc"}}>
                      <option value="">—</option>
                      <option value="open">Open</option>
                      <option value="under_review">In Progress</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
              {/* LQC footer */}
              <tr>
                <td colSpan={3} style={{...tdBase,padding:5,textAlign:"left",background:"#f8fafc",verticalAlign:"top"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#374151",marginBottom:4}}>Line rejection summary Graph:</div>
                  <div style={{display:"flex",flexWrap:"wrap" as const,gap:4}}>
                    {lqcRows.filter(r=>r.line&&r.rejection_rate).map((r,i)=>(
                      <div key={i} style={{background:"#dbeafe",borderRadius:4,padding:"2px 7px",
                        fontSize:8.5,color:"#1d4ed8",fontWeight:700,border:"1px solid #bdd7ee"}}>
                        {r.line}: {r.rejection_rate}
                      </div>
                    ))}
                    {lqcRows.filter(r=>r.line).length===0&&(
                      <span style={{fontSize:8.5,color:"#9ca3af",fontStyle:"italic" as const}}>Enter LQC data above</span>
                    )}
                  </div>
                </td>
                <td colSpan={4} style={{...tdBase,padding:5,textAlign:"left",background:"#f8fafc",verticalAlign:"top"}}>
                  <div style={{fontSize:9,fontWeight:700,color:"#374151",marginBottom:4}}>Comments:</div>
                  <textarea value={lqcComments} onChange={e=>setLqcComments(e.target.value)}
                    placeholder="Quality comments, observations, action items..."
                    style={{width:"100%",border:"none",outline:"none",resize:"none",
                      fontSize:9.5,fontFamily:"inherit",color:"#374151",background:"#f8fafc",
                      minHeight:36,lineHeight:1.4}}/>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ══ SIGN-OFF ══ */}
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:2,tableLayout:"fixed"}}>
            <tbody>
              <tr>
                {[
                  {label:"Prepared By",   val:profile?.full_name||""},
                  {label:"QC Manager",    val:""},
                  {label:"Reviewed By",   val:""},
                  {label:"Approved By",   val:""},
                ].map((s,i)=>(
                  <td key={i} style={{...tdBase,padding:"6px 10px",textAlign:"left"}}>
                    <div style={{fontSize:8.5,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:"0.04em"}}>{s.label}</div>
                    <div style={{borderBottom:"1px solid #9ca3af",minHeight:20,marginTop:5,paddingBottom:2,
                      fontSize:10,fontStyle:s.val?"normal":"italic",color:s.val?"#1f2937":"#9ca3af"}}>
                      {s.val||""}
                    </div>
                    <div style={{fontSize:8,color:"#9ca3af",marginTop:3}}>Signature &amp; Date</div>
                  </td>
                ))}
              </tr>
              <tr>
                <td colSpan={4} style={{...tdBase,background:"#2e75b6",color:"#fff",fontSize:8.5,padding:"4px 10px",textAlign:"center"}}>
                  {hospitalName} · Quality Dashboard · {month} {year} · Generated by {sysName} · Doc Ref: QD/EL5H/{year}
                </td>
              </tr>
            </tbody>
          </table>

        </div>{/* minWidth wrapper */}
      </div>{/* padding wrapper */}

      {/* ══ QUICK NAV FOOTER ══ */}
      <div style={{display:"flex",gap:8,padding:"10px 12px",background:"#fff",borderTop:"2px solid #2e75b6",flexWrap:"wrap" as const}}>
        <button onClick={()=>navigate("/quality/inspections")}
          style={{flex:1,minWidth:140,padding:"9px",background:"linear-gradient(135deg,#0f766e,#134e4a)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
          + New IQC Inspection
        </button>
        <button onClick={()=>navigate("/quality/non-conformance")}
          style={{flex:1,minWidth:140,padding:"9px",background:"linear-gradient(135deg,#dc2626,#991b1b)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
          + Raise NCR / SCAR
        </button>
        <button onClick={()=>navigate("/quality/inspections")}
          style={{flex:1,minWidth:140,padding:"9px",background:"linear-gradient(135deg,#1d4ed8,#1e40af)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
          View All Inspections →
        </button>
        <button onClick={()=>navigate("/quality/non-conformance")}
          style={{flex:1,minWidth:140,padding:"9px",background:"linear-gradient(135deg,#7c3aed,#5b21b6)",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
          Manage Non-Conformances →
        </button>
      </div>

    </div>
  );
}
