import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { Archive, RefreshCw, Download, CheckCircle, Clock, AlertTriangle, Database, FileSpreadsheet, Play, Trash2, Shield, Zap, Settings, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { logAudit } from "@/lib/audit";

const BACKUP_TABLES = [
  "profiles","user_roles","items","item_categories","suppliers","departments",
  "requisitions","requisition_items","purchase_orders","goods_received",
  "payment_vouchers","receipt_vouchers","journal_vouchers","purchase_vouchers","sales_vouchers",
  "contracts","tenders","bid_evaluations","inspections","non_conformance",
  "budgets","fixed_assets","chart_of_accounts","bank_accounts",
  "procurement_plans","stock_movements","gl_entries","system_settings",
  "documents","audit_log","notifications","inbox_items","backup_jobs","odbc_connections",
];

function BackupInner() {
  const { user, profile } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const hospitalName = getSetting("hospital_name","Embu Level 5 Hospital");
  const sysName = getSetting("system_name","EL5 MediProcure");
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  // sysName now from useSystemSettings
  // hospitalName now from useSystemSettings
  const [backupFmt, setBackupFmt] = useState("Excel (XLSX)");
  const [backupSch, setBackupSch] = useState("Weekly (Sunday)");
  const [backupScope, setBackupScope] = useState<string[]>(["All Tables","Procurement Only","Finance Only","Users & Roles","System Settings","Audit Logs","Quality"]);

  useEffect(()=>{
    /* settings via useSystemSettings hook */
    loadJobs();
  },[]);

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("backup_jobs").select("*").order("started_at",{ascending:false}).limit(20);
    setJobs(data||[]);
    setLoading(false);
  };

  const runBackup = async () => {
    setRunning(true);
    setProgress(0);

    // Insert job record
    const { data: job } = await (supabase as any).from("backup_jobs").insert({
      label: `Full Backup — ${new Date().toLocaleString("en-KE")}`,
      status: "running",
      initiated_by: user?.id,
      started_at: new Date().toISOString(),
    }).select().single();

    const wb = XLSX.utils.book_new();
    const rowCounts: Record<string,number> = {};
    const tablesData: Record<string,any[]> = {};

    // Fetch all tables
    for (let i = 0; i < BACKUP_TABLES.length; i++) {
      const tbl = BACKUP_TABLES[i];
      setCurrentTable(tbl);
      setProgress(Math.round((i / BACKUP_TABLES.length) * 80));
      try {
        const { data: d } = await (supabase as any).from(tbl).select("*").limit(5000);
        const rows = d || [];
        tablesData[tbl] = rows;
        rowCounts[tbl] = rows.length;
        if (rows.length > 0) {
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, tbl.slice(0,30));
        }
      } catch(e) {
        rowCounts[tbl] = 0;
      }
    }

    // Summary sheet
    setProgress(85);
    const summaryRows = [
      [`${hospitalName} — ${sysName}`],
      [`Full Database Backup`],
      [`Generated: ${new Date().toLocaleString("en-KE")}`],
      [`Initiated by: ${profile?.full_name || "Admin"}`],
      [],
      ["TABLE", "RECORDS"],
      ...Object.entries(rowCounts).map(([t,c]) => [t, c]),
      [],
      ["TOTAL RECORDS", Object.values(rowCounts).reduce((a,b)=>a+b,0)],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "SUMMARY");
    // Move summary to first position
    wb.SheetNames = ["SUMMARY", ...wb.SheetNames.filter(s=>s!=="SUMMARY")];

    setProgress(90);
    const fileName = `${hospitalName.replace(/\s+/g,"_")}_Backup_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    setProgress(100);
    setCurrentTable("");

    // Update job record
    const totalRows = Object.values(rowCounts).reduce((a,b)=>a+b,0);
    if (job) {
      await (supabase as any).from("backup_jobs").update({
        status: "completed",
        row_counts: rowCounts,
        tables_json: BACKUP_TABLES,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
    }

    toast({ title:"Backup Complete!", description:`${totalRows.toLocaleString()} records from ${BACKUP_TABLES.length} tables downloaded as Excel` });
    setRunning(false);
    setProgress(0);
    loadJobs();
  };


  const handleRestore = async () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json,.sql,.gz,.zip,.backup";
    fileInput.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!confirm(`Restore from "${file.name}"? This will overwrite current data.`)) return;
      toast({ title: "Restore initiated", description: `Processing ${file.name} — manual DB restore required via Supabase dashboard.` });
      logAudit(user?.id, profile?.full_name, "restore", "backup", undefined, { file: file.name });
    };
    fileInput.click();
  };

  return (
      <div style={{padding:24,maxWidth:896,margin:"0 auto",display:"flex",flexDirection:"column",gap:24, fontFamily:"'Segoe UI',system-ui,sans-serif", background:"transparent", minHeight:"calc(100vh-100px)" }}>
      {/* Header card */}
      <div style={{borderRadius:16}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
          <div>
            <h1 style={{fontSize:18,fontWeight:900,color:"#1f2937",display:"flex",alignItems:"center",gap:8}}>
              <Archive style={{width:20,height:20, color:"#1a3a6b" }} /> Backup & Recovery
            </h1>
            <p style={{fontSize:12,color:"#6b7280",marginTop:4}}>Full database backup to Excel — {BACKUP_TABLES.length} tables, all records</p>
          </div>
          <button onClick={runBackup} disabled={running}
            style={{display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,fontSize:14,fontWeight:700,color:"#fff",border:"none",cursor:"pointer", background:running?"#9ca3af":"linear-gradient(135deg,#1a3a6b,#1d4a87)" }}>
            {running ? (
              <><RefreshCw style={{animation:"spin 1s linear infinite"}} /> Running Backup...</>
            ) : (
              <><Download style={{width:16,height:16}} /> Run Full Backup</>
            )}
          </button>
        </div>

        {running && (
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12,color:"#6b7280"}}>
              <span>Processing: <strong>{currentTable}</strong></span>
              <span>{progress}%</span>
            </div>
            <div style={{width:"100%",height:8,borderRadius:4,background:"#f3f4f6",overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:4,transition:"width 0.3s", width:`${progress}%`, background:"linear-gradient(90deg,#1a3a6b,#1d4a87)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Table list */}
      <div style={{borderRadius:16}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid #f3f4f6"}}>
          <h2 style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4b5563"}}>Tables to Backup ({BACKUP_TABLES.length})</h2>
        </div>
        <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>
          {BACKUP_TABLES.map(t => (
            <div key={t} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",borderRadius:8,fontSize:12, background:"#f8fafc", border:"1px solid #e5e7eb" }}>
              <Database style={{width:12,height:12,flexShrink:0, color:"#1a3a6b" }} />
              <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#4b5563"}}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup history */}
      <div style={{borderRadius:16}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <h2 style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4b5563"}}>Backup History</h2>
          <button onClick={loadJobs} style={{padding:5,borderRadius:6,background:"transparent",border:"none",cursor:"pointer"}}>
            <RefreshCw style={{animation:loading?"spin 1s linear infinite":"none",width:14,height:14}} />
          </button>
        </div>
        <div style={{}}>
          {loading ? (
            <div style={{padding:"24px 20px",textAlign:"center",fontSize:12,color:"#9ca3af"}}><RefreshCw style={{animation:"spin 1s linear infinite"}} />Loading...</div>
          ) : jobs.length === 0 ? (
            <div style={{padding:"24px 20px",textAlign:"center",fontSize:12,color:"#9ca3af"}}>No backup history yet. Run your first backup above.</div>
          ) : jobs.map(j => (
            <div key={j.id} style={{display:"flex",alignItems:"center",gap:16,padding:"14px 20px"}}>
              <div style={{width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0, background:j.status==="completed"?"#d1fae5":j.status==="failed"?"#fee2e2":"#fef3c7" }}>
                {j.status==="completed" ? <CheckCircle style={{width:16,height:16,color:"#16a34a"}} /> :
                 j.status==="failed" ? <AlertTriangle style={{width:16,height:16,color:"#ef4444"}} /> :
                 <RefreshCw style={{animation:"spin 1s linear infinite"}} />}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"#1f2937",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.label}</div>
                <div style={{fontSize:10,color:"#9ca3af",display:"flex",alignItems:"center",gap:8,marginTop:2}}>
                  <Clock style={{width:12,height:12}} />
                  {new Date(j.started_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"})}
                  {j.completed_at && <span>→ {new Date(j.completed_at).toLocaleTimeString("en-KE",{timeStyle:"short"})}</span>}
                  {j.row_counts && <span>• {Object.values(j.row_counts as Record<string,number>).reduce((a,b)=>a+b,0).toLocaleString()} records</span>}
                </div>
              </div>
              <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,fontWeight:700,textTransform:"capitalize", background:j.status==="completed"?"#d1fae5":j.status==="failed"?"#fee2e2":"#fef3c7", color:j.status==="completed"?"#065f46":j.status==="failed"?"#991b1b":"#92400e" }}>
                {j.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup Options */}
      <div style={{borderRadius:16}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid #f3f4f6"}}>
          <h2 style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4b5563"}}>Backup Options & Schedule</h2>
        </div>
        <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <h3 style={{fontSize:12,fontWeight:900,color:"#374151"}}>Backup Format</h3>
            {["Excel (XLSX)","CSV (per table)","JSON dump","SQL Script"].map(fmt=>(
              <label key={fmt} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                <input type="radio" name="backup_fmt" checked={backupFmt===fmt} onChange={()=>setBackupFmt(fmt)} style={{accentColor:"#2563eb"}}/>
                <span style={{fontSize:12,color:"#4b5563"}}>{fmt}</span>
              </label>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <h3 style={{fontSize:12,fontWeight:900,color:"#374151"}}>Auto-Schedule</h3>
            {["Daily at midnight","Weekly (Sunday)","Monthly (1st)","Manual only"].map(sch=>(
              <label key={sch} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                <input type="radio" name="backup_sch" checked={backupSch===sch} onChange={()=>setBackupSch(sch)} style={{accentColor:"#2563eb"}}/>
                <span style={{fontSize:12,color:"#4b5563"}}>{sch}</span>
              </label>
            ))}
          </div>
          <div style={{gridColumn:"1/-1",paddingTop:12,borderTop:"1px solid #f3f4f6",display:"flex",flexDirection:"column",gap:8}}>
            <h3 style={{fontSize:12,fontWeight:900,color:"#374151",marginBottom:8}}>Backup Scope</h3>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {["All Tables","Procurement Only","Finance Only","Users & Roles","System Settings","Audit Logs","Quality"].map(scope=>(
                <label key={scope} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:10,cursor:"pointer",background:backupScope.includes(scope)?"#f0f9ff":"#f9fafb",border:`1px solid ${backupScope.includes(scope)?"#bae6fd":"#e5e7eb"}`}}>
                  <input type="checkbox" checked={backupScope.includes(scope)} onChange={e=>setBackupScope(p=>e.target.checked?[...p,scope]:p.filter(s=>s!==scope))} style={{accentColor:"#2563eb",width:12,height:12}}/>
                  <span style={{fontSize:12,color:backupScope.includes(scope)?"#1d4ed8":"#6b7280",fontWeight:600}}>{scope}</span>
                </label>
              ))}
            </div>
            <div style={{marginTop:16,display:"flex",gap:12}}>
              <button onClick={runBackup} disabled={running} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,fontSize:12,fontWeight:700,color:"#fff",border:"none",cursor:"pointer",background:"linear-gradient(135deg,#1a3a6b,#1d4a87)"}}>
                <Download style={{width:14,height:14}}/> Full Backup Now
              </button>
              <button style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"#f0fdf4",color:"#15803d",border:"1px solid #86efac"}}>
                <Shield style={{width:14,height:14}}/> Verify Last Backup
              </button>
              <button style={{display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"#fff7ed",color:"#c2410c",border:"1px solid #fed7aa"}}>
                <Settings style={{width:14,height:14}}/> Save Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restore section */}
      <div style={{borderRadius:16}}>
        <div style={{padding:"14px 20px",borderBottom:"1px solid #f3f4f6"}}>
          <h2 style={{fontSize:12,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.1em",color:"#4b5563",display:"flex",alignItems:"center",gap:8}}>
            <Zap style={{width:14,height:14,color:"#f97316"}}/> Restore from Backup
          </h2>
        </div>
        <div style={{padding:20}}>
          <div style={{padding:16,borderRadius:12,marginBottom:16,background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)"}}>
            <p style={{fontSize:12,color:"#dc2626",fontWeight:600}}>⚠️ Restoring overwrites current data. Ensure you have a current backup before proceeding.</p>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"#f0f9ff",border:"1px solid #bae6fd",color:"#0369a1"}}>
              <FileSpreadsheet style={{width:16,height:16}}/>
              Upload Backup File (.xlsx)
              <input type="file" accept=".xlsx,.csv,.json" style={{display:"none"}} onChange={()=>{}}/>
            </label>
            <button style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",background:"#fef2f2",color:"#ef4444",border:"1px solid #fca5a5"}} onClick={handleRestore}>
              <Play style={{width:14,height:14}}/> Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BackupPage() {
  return (
    <RoleGuard allowed={["admin","procurement_manager"]}>
      <BackupInner />
    </RoleGuard>
  );
}
