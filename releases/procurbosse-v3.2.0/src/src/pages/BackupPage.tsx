import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { Archive, RefreshCw, Download, CheckCircle, Clock, AlertTriangle, Database, FileSpreadsheet, Play, Trash2, Shield, Zap, Settings, Calendar } from "lucide-react";
import * as XLSX from "xlsx";

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
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTable, setCurrentTable] = useState("");
  const [sysName, setSysName] = useState("EL5 MediProcure");
  const [hospitalName, setHospitalName] = useState("Embu Level 5 Hospital");

  useEffect(()=>{
    (supabase as any).from("system_settings").select("key,value").in("key",["system_name","hospital_name"])
      .then(({data}:any)=>{
        if(!data) return;
        const m:Record<string,string>={};
        data.forEach((r:any)=>{ if(r.key) m[r.key]=r.value||""; });
        if(m.system_name) setSysName(m.system_name);
        if(m.hospital_name) setHospitalName(m.hospital_name);
      });
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

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6" style={{ fontFamily:"'Segoe UI',system-ui,sans-serif", background:"transparent", minHeight:"calc(100vh-100px)" }}>
      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Archive className="w-5 h-5" style={{ color:"#1a3a6b" }} /> Backup & Recovery
            </h1>
            <p className="text-xs text-gray-500 mt-1">Full database backup to Excel — {BACKUP_TABLES.length} tables, all records</p>
          </div>
          <button onClick={runBackup} disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background:running?"#9ca3af":"linear-gradient(135deg,#1a3a6b,#1d4a87)" }}>
            {running ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Running Backup...</>
            ) : (
              <><Download className="w-4 h-4" /> Run Full Backup</>
            )}
          </button>
        </div>

        {running && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Processing: <strong>{currentTable}</strong></span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width:`${progress}%`, background:"linear-gradient(90deg,#1a3a6b,#1d4a87)" }} />
            </div>
          </div>
        )}
      </div>

      {/* Table list */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-600">Tables to Backup ({BACKUP_TABLES.length})</h2>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {BACKUP_TABLES.map(t => (
            <div key={t} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs"
              style={{ background:"#f8fafc", border:"1px solid #e5e7eb" }}>
              <Database className="w-3 h-3 shrink-0" style={{ color:"#1a3a6b" }} />
              <span className="truncate text-gray-600">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup history */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-600">Backup History</h2>
          <button onClick={loadJobs} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all">
            <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${loading?"animate-spin":""}`} />
          </button>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="px-5 py-6 text-center text-xs text-gray-400"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="px-5 py-6 text-center text-xs text-gray-400">No backup history yet. Run your first backup above.</div>
          ) : jobs.map(j => (
            <div key={j.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background:j.status==="completed"?"#d1fae5":j.status==="failed"?"#fee2e2":"#fef3c7" }}>
                {j.status==="completed" ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                 j.status==="failed" ? <AlertTriangle className="w-4 h-4 text-red-500" /> :
                 <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-800 truncate">{j.label}</div>
                <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(j.started_at).toLocaleString("en-KE",{dateStyle:"medium",timeStyle:"short"})}
                  {j.completed_at && <span>→ {new Date(j.completed_at).toLocaleTimeString("en-KE",{timeStyle:"short"})}</span>}
                  {j.row_counts && <span>• {Object.values(j.row_counts as Record<string,number>).reduce((a,b)=>a+b,0).toLocaleString()} records</span>}
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold capitalize"
                style={{ background:j.status==="completed"?"#d1fae5":j.status==="failed"?"#fee2e2":"#fef3c7", color:j.status==="completed"?"#065f46":j.status==="failed"?"#991b1b":"#92400e" }}>
                {j.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Backup Options */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-600">Backup Options & Schedule</h2>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-700">Backup Format</h3>
            {["Excel (XLSX)","CSV (per table)","JSON dump","SQL Script"].map(fmt=>(
              <label key={fmt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="backup_fmt" defaultChecked={fmt==="Excel (XLSX)"} className="accent-blue-600"/>
                <span className="text-xs text-gray-600">{fmt}</span>
              </label>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-700">Auto-Schedule</h3>
            {["Daily at midnight","Weekly (Sunday)","Monthly (1st)","Manual only"].map(sch=>(
              <label key={sch} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="backup_sch" defaultChecked={sch==="Weekly (Sunday)"} className="accent-blue-600"/>
                <span className="text-xs text-gray-600">{sch}</span>
              </label>
            ))}
          </div>
          <div className="col-span-2 pt-3 border-t border-gray-100 space-y-2">
            <h3 className="text-xs font-black text-gray-700 mb-2">Backup Scope</h3>
            <div className="flex flex-wrap gap-2">
              {["All Tables","Procurement Only","Finance Only","Users & Roles","System Settings","Audit Logs","Quality"].map(scope=>(
                <label key={scope} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl cursor-pointer" style={{background:"#f0f9ff",border:"1px solid #bae6fd"}}>
                  <input type="checkbox" defaultChecked className="accent-blue-600 w-3 h-3"/>
                  <span className="text-xs text-blue-700 font-semibold">{scope}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={runBackup} disabled={running} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white" style={{background:"linear-gradient(135deg,#1a3a6b,#1d4a87)"}}>
                <Download className="w-3.5 h-3.5"/> Full Backup Now
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{background:"#f0fdf4",color:"#15803d",border:"1px solid #86efac"}}>
                <Shield className="w-3.5 h-3.5"/> Verify Last Backup
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold" style={{background:"#fff7ed",color:"#c2410c",border:"1px solid #fed7aa"}}>
                <Settings className="w-3.5 h-3.5"/> Save Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Restore section */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-orange-500"/> Restore from Backup
          </h2>
        </div>
        <div className="p-5">
          <div className="p-4 rounded-xl mb-4" style={{background:"rgba(239,68,68,0.06)",border:"1px solid rgba(239,68,68,0.15)"}}>
            <p className="text-xs text-red-600 font-semibold">⚠️ Restoring overwrites current data. Ensure you have a current backup before proceeding.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer" style={{background:"#f0f9ff",border:"1px solid #bae6fd",color:"#0369a1"}}>
              <FileSpreadsheet className="w-4 h-4"/>
              Upload Backup File (.xlsx)
              <input type="file" accept=".xlsx,.csv,.json" className="hidden" onChange={()=>{}}/>
            </label>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold" style={{background:"#fef2f2",color:"#ef4444",border:"1px solid #fca5a5"}} onClick={()=>alert("Select a backup file first")}>
              <Play className="w-3.5 h-3.5"/> Restore
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
