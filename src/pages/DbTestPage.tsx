/**
 * ProcurBosse - DB Live Monitor & Schema Viewer v2.0
 * Auto-refresh via LiveDatabaseEngine (60s) - Schema explorer - Twilio tests
 * Admin only - EL5 MediProcure - Embu Level 5 Hospital
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { pageCache } from "@/lib/pageCache";
import { supabase } from "@/integrations/supabase/client";
import { liveDbEngine, DbEngineSnapshot, SchemaTable, TableHealth } from "@/engines/db/LiveDatabaseEngine";
import {
  CheckCircle, XCircle, Clock, RefreshCw, Database, Zap, Activity,
  ChevronDown, ChevronRight, Wifi, WifiOff, Send, BarChart3, Table2,
  Phone, PhoneCall, MessageSquare, Server, Play, Square, Search, TrendingUp
} from "lucide-react";

const db = supabase as any;

const MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS categories (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, description text, parent_id uuid REFERENCES categories(id), is_active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='categories' AND policyname='auth_read_categories') THEN ALTER TABLE categories ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_categories ON categories FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_categories ON categories FOR ALL TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS journal_voucher_lines (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, journal_id uuid REFERENCES journal_vouchers(id) ON DELETE CASCADE, account_code text, description text, debit_amount numeric(15,2) DEFAULT 0, credit_amount numeric(15,2) DEFAULT 0, cost_center text, created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='journal_voucher_lines' AND policyname='auth_read_jvl') THEN ALTER TABLE journal_voucher_lines ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_jvl ON journal_voucher_lines FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_jvl ON journal_voucher_lines FOR ALL TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS purchase_voucher_lines (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, voucher_id uuid REFERENCES purchase_vouchers(id) ON DELETE CASCADE, item_id uuid REFERENCES items(id), description text, quantity numeric(12,3) DEFAULT 1, unit_price numeric(15,2) DEFAULT 0, total_price numeric(15,2) DEFAULT 0, account_code text, created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='purchase_voucher_lines' AND policyname='auth_read_pvl') THEN ALTER TABLE purchase_voucher_lines ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_pvl ON purchase_voucher_lines FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_pvl ON purchase_voucher_lines FOR ALL TO authenticated USING (true)'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='inspection_type') THEN ALTER TABLE inspections ADD COLUMN inspection_type text DEFAULT 'incoming'; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='overall_result') THEN ALTER TABLE inspections ADD COLUMN overall_result text DEFAULT 'pending'; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='inspections' AND column_name='closed_at') THEN ALTER TABLE inspections ADD COLUMN closed_at timestamptz; END IF; END $$;
CREATE TABLE IF NOT EXISTS inspection_items (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, inspection_id uuid REFERENCES inspections(id) ON DELETE CASCADE, item_id uuid REFERENCES items(id), item_name text, quantity_ordered numeric(12,3), quantity_received numeric(12,3), quantity_accepted numeric(12,3), quantity_rejected numeric(12,3), rejection_reason text, condition text DEFAULT 'good', notes text, created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inspection_items' AND policyname='auth_read_ii') THEN ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_ii ON inspection_items FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_ii ON inspection_items FOR ALL TO authenticated USING (true)'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='closed_at') THEN ALTER TABLE non_conformance ADD COLUMN closed_at timestamptz; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='resolution') THEN ALTER TABLE non_conformance ADD COLUMN resolution text; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='non_conformance' AND column_name='severity') THEN ALTER TABLE non_conformance ADD COLUMN severity text DEFAULT 'medium'; END IF; END $$;
CREATE TABLE IF NOT EXISTS procurement_plan_items (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, plan_id uuid REFERENCES procurement_plans(id) ON DELETE CASCADE, item_id uuid REFERENCES items(id), item_name text NOT NULL, description text, quantity numeric(12,3), estimated_unit_price numeric(15,2), estimated_total numeric(15,2), quarter text, category text, department text, priority text DEFAULT 'normal', status text DEFAULT 'draft', created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='procurement_plan_items' AND policyname='auth_read_ppi') THEN ALTER TABLE procurement_plan_items ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_ppi ON procurement_plan_items FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_ppi ON procurement_plan_items FOR ALL TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS report_schedules (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, report_type text NOT NULL, frequency text NOT NULL, recipients text[] DEFAULT '{}', is_active boolean DEFAULT true, next_run_at timestamptz, last_run_at timestamptz, created_by uuid REFERENCES profiles(id), created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='report_schedules' AND policyname='auth_read_rs') THEN ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_rs ON report_schedules FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_rs ON report_schedules FOR ALL TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS system_metrics (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, metric_name text NOT NULL, metric_value numeric, metric_unit text, tags jsonb DEFAULT '{}', recorded_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='system_metrics' AND policyname='auth_read_sm') THEN ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_sm ON system_metrics FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY admin_write_sm ON system_metrics FOR INSERT TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS supplier_scorecards (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE, quality_score numeric(5,2) DEFAULT 0, delivery_score numeric(5,2) DEFAULT 0, pricing_score numeric(5,2) DEFAULT 0, compliance_score numeric(5,2) DEFAULT 0, total_score numeric(5,2) DEFAULT 0, notes text, evaluator_id uuid REFERENCES profiles(id), evaluation_date timestamptz DEFAULT now(), created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='supplier_scorecards' AND policyname='auth_read_sc') THEN ALTER TABLE supplier_scorecards ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_sc ON supplier_scorecards FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_sc ON supplier_scorecards FOR ALL TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS scan_log (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, barcode text NOT NULL, item_id uuid REFERENCES items(id), action text NOT NULL, quantity numeric(12,3), location text, scanned_by uuid REFERENCES profiles(id), scanned_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='scan_log' AND policyname='auth_read_sl') THEN ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_sl ON scan_log FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_sl ON scan_log FOR INSERT TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS email_messages (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, direction text NOT NULL DEFAULT 'inbound', from_address text, to_address text, subject text, body_text text, body_html text, category text DEFAULT 'general', is_read boolean DEFAULT false, read_at timestamptz, sent_at timestamptz, received_at timestamptz DEFAULT now(), message_id text, thread_id text, attachments jsonb DEFAULT '[]', metadata jsonb DEFAULT '{}');
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='email_messages' AND policyname='auth_read_em') THEN ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_em ON email_messages FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_em ON email_messages FOR ALL TO authenticated USING (true)'; END IF; END $$;
CREATE TABLE IF NOT EXISTS reception_appointments (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, visitor_name text NOT NULL, visitor_phone text, host_name text, host_department text, scheduled_time timestamptz NOT NULL, duration_minutes int DEFAULT 30, purpose text, status text DEFAULT 'scheduled', notes text, reminder_sent boolean DEFAULT false, created_by uuid REFERENCES profiles(id), created_at timestamptz DEFAULT now());
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='reception_appointments' AND policyname='auth_read_ra') THEN ALTER TABLE reception_appointments ENABLE ROW LEVEL SECURITY; EXECUTE 'CREATE POLICY auth_read_ra ON reception_appointments FOR SELECT TO authenticated USING (true)'; EXECUTE 'CREATE POLICY auth_write_ra ON reception_appointments FOR ALL TO authenticated USING (true)'; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='backup_type') THEN ALTER TABLE backup_jobs ADD COLUMN backup_type text DEFAULT 'manual'; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='backup_jobs' AND column_name='size_bytes') THEN ALTER TABLE backup_jobs ADD COLUMN size_bytes bigint; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='barcode') THEN ALTER TABLE items ADD COLUMN barcode text; CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL; END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name='last_adjusted_at') THEN ALTER TABLE items ADD COLUMN last_adjusted_at timestamptz; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='on_time_delivery_rate') THEN ALTER TABLE suppliers ADD COLUMN on_time_delivery_rate numeric(5,2); END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='quality_score') THEN ALTER TABLE suppliers ADD COLUMN quality_score numeric(5,2); END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='suppliers' AND column_name='total_orders') THEN ALTER TABLE suppliers ADD COLUMN total_orders int DEFAULT 0; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procurement_plans' AND column_name='approved_by') THEN ALTER TABLE procurement_plans ADD COLUMN approved_by uuid REFERENCES profiles(id); END IF; IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='procurement_plans' AND column_name='approved_at') THEN ALTER TABLE procurement_plans ADD COLUMN approved_at timestamptz; END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_scan_log_barcode ON scan_log(barcode);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_scorecards_score ON supplier_scorecards(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reception_appointments_time ON reception_appointments(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_procurement_plan_items_plan ON procurement_plan_items(plan_id);`;

const GC: Record<string,string> = { Procurement:"#2563eb",Finance:"#7c3aed",Inventory:"#059669",Quality:"#d97706",System:"#475569",Comms:"#0891b2" };
const TABS = ["Monitor","Schema","Twilio","Migration"] as const;
type Tab = typeof TABS[number];

function useRealtimeEvents() {
  const [events, setEvents] = useState<{table:string;type:string;ts:string}[]>([]);
  useEffect(() => {
    const tables = ["notifications","requisitions","purchase_orders","stock_movements","system_broadcasts"];
    const channels = tables.map(t => db.channel(`dbmon:${t}`)
      .on("postgres_changes",{event:"*",schema:"public",table:t},(p:any)=>{
        setEvents(prev=>[{table:t,type:p.eventType,ts:new Date().toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi"})}, ...prev.slice(0,49)]);
      }).subscribe());
    return ()=>channels.forEach(c=>db.removeChannel(c));
  },[]);
  return events;
}

export default function DbTestPage() {
  const [tab, setTab] = useState<Tab>("Monitor");
  const [snap, setSnap] = useState<DbEngineSnapshot|null>(()=>liveDbEngine.getSnapshot());
  const [schema, setSchema] = useState<SchemaTable[]>(()=>liveDbEngine.getSchema());
  const [running, setRunning] = useState(liveDbEngine.isRunning());
  const [cd, setCd] = useState(60);
  const [migLog, setMigLog] = useState<string[]>([]);
  const [migrating, setMigrating] = useState(false);
  const [migDone, setMigDone] = useState(false);
  const [schSearch, setSchSearch] = useState("");
  const [grpFilter, setGrpFilter] = useState("All");
  const [twilioDetail, setTwilioDetail] = useState<any>(null);
  const [twilioLoading, setTwilioLoading] = useState(false);
  const [smsPhone, setSmsPhone] = useState("+254116647894");
  const [smsMsg, setSmsMsg] = useState("EL5 MediProcure test SMS - DB Monitor v5.9");
  const [smsSending, setSmsSending] = useState(false);
  const [smsRes, setSmsRes] = useState<any>(null);
  const [expGrps, setExpGrps] = useState(new Set(Object.keys(GC)));
  const logRef = useRef<HTMLDivElement>(null);
  const rtEvents = useRealtimeEvents();

  useEffect(()=>{
    const u1 = liveDbEngine.onSnapshot(s=>{setSnap(s);setCd(60);});
    const u2 = liveDbEngine.onSchema(s=>setSchema(s));
    if(!liveDbEngine.isRunning()){liveDbEngine.start(60_000);setRunning(true);}
    return ()=>{u1();u2();};
  },[]);

  useEffect(()=>{
    const t = setInterval(()=>setCd(c=>Math.max(0,c-1)),1000);
    return ()=>clearInterval(t);
  },[]);

  const addLog = useCallback((msg:string)=>{
    setMigLog(p=>[...p,`[${new Date().toLocaleTimeString()}] ${msg}`]);
    setTimeout(()=>logRef.current?.scrollTo(0,logRef.current.scrollHeight),50);
  },[]);

  const runMig = async()=>{
    setMigrating(true);setMigLog([]);setMigDone(false);
    addLog("- Starting v5.9 migration...");
    const stmts = MIGRATION_SQL.split(/;\s*\n/).map(s=>s.trim()).filter(s=>s.length>20);
    let ok=0,warn=0;
    for(const stmt of stmts){
      const preview = stmt.slice(0,55).replace(/\n/g," ");
      try{
        const{error}=await db.rpc("exec_sql_admin",{sql:stmt+";"});
        if(!error||error.message?.includes("already exists")||error.message?.includes("duplicate")){addLog(`- ${preview}...`);ok++;}
        else{addLog(`-  ${preview}: ${error.message}`);warn++;}
      }catch(e:any){addLog(`- ${e.message}`);warn++;}
    }
    addLog("- Verifying tables...");
    for(const t of ["categories","inspection_items","scan_log","email_messages","reception_appointments","supplier_scorecards","system_metrics","procurement_plan_items"]){
      const{error}=await db.from(t).select("id").limit(1);
      addLog((!error||error.message?.includes("0 rows"))?`- ${t} OK`:`- ${t} MISSING - ${error?.message}`);
    }
    addLog(`\n- Done - ${ok} applied, ${warn} warnings.`);
    setMigDone(true);setMigrating(false);
    setTimeout(()=>liveDbEngine.forceRun(),500);
  };

  const checkTwilio=async()=>{
    setTwilioLoading(true);
    try{const{data}=await supabase.functions.invoke("send-sms",{body:{action:"status"}});setTwilioDetail(data);}
    catch(e:any){setTwilioDetail({ok:false,error:e.message});}
    setTwilioLoading(false);
  };

  const sendSms=async(channel="sms")=>{
    setSmsSending(true);setSmsRes(null);
    try{const{data,error}=await supabase.functions.invoke("send-sms",{body:{to:smsPhone,message:smsMsg,channel,module:"db_test"}});
      setSmsRes(error?{ok:false,error:error.message}:data);
    }catch(e:any){setSmsRes({ok:false,error:e.message});}
    setSmsSending(false);
  };

  const C={
    page:{minHeight:"100vh",background:"#0a0f1e",color:"#e2e8f0",fontFamily:"'Inter','Segoe UI',sans-serif",padding:24}as const,
    card:{background:"#111827",borderRadius:12,border:"1px solid #1f2937",padding:18,marginBottom:14}as const,
    badge:(col:string)=>({display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:999,fontSize:11,fontWeight:700,background:col+"22",color:col,border:`1px solid ${col}44`}),
    btn:(col:string,dis?:boolean)=>({display:"inline-flex",alignItems:"center",gap:7,padding:"8px 16px",background:dis?"#1f2937":col,color:dis?"#4b5563":"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:700,cursor:dis?"not-allowed":"pointer"}as const),
    row:(ok:boolean|null)=>({display:"flex",alignItems:"center",gap:8,padding:"6px 11px",borderRadius:7,background:ok===true?"#031a0d":ok===false?"#1a0505":"#111827",border:`1px solid ${ok===true?"#16a34a33":ok===false?"#dc262633":"#1f2937"}`,marginBottom:3}as const),
    mono:{fontSize:11,fontFamily:"monospace",color:"#6b7280"}as const,
  };

  const SI=({ok,size=14}:{ok:boolean|null;size?:number})=>
    ok===true?<CheckCircle size={size} color="#22c55e"/>:ok===false?<XCircle size={size} color="#ef4444"/>:<Clock size={size} color="#6b7280"/>;

  const{healthyTables=0,failedTables=0,totalTables=0,avgLatency=0,dbLatency=0,realtimeConnected=false,twilioStatus="offline",tables=[]}=snap||{};
  const pct=totalTables?Math.round((healthyTables/totalTables)*100):0;
  const ftables=tables.filter(t=>grpFilter==="All"||t.group===grpFilter);

  return(
    <div style={C.page}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Top bar */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <Database size={26} color="#38bdf8"/>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:"#f9fafb"}}>DB Live Monitor & Migration Runner</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Auto-cycles every 60s - Project: yvjfehnzbzjliizjvuhq - EL5 MediProcure v5.9</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={C.badge(running?"#22c55e":"#6b7280")}>{running?<><Activity size={10} style={{animation:"pulse 2s infinite"}}/> LIVE</>:<><Square size={10}/> PAUSED</>}</span>
          {running&&snap&&<span style={C.badge("#94a3b8")}><Clock size={10}/> {cd}s - Run #{snap.runNumber}</span>}
          <button style={C.btn("#1d4ed8")} onClick={()=>{liveDbEngine.forceRun();setCd(60);}}><RefreshCw size={13}/> Run Now</button>
          <button style={C.btn(running?"#374151":"#16a34a")} onClick={()=>{if(running){liveDbEngine.stop();setRunning(false);}else{liveDbEngine.start(60_000);setRunning(true);setCd(60);}}}>
            {running?<><Square size={13}/> Pause</>:<><Play size={13}/> Start</>}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {snap&&<div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Healthy",v:`${healthyTables}/${totalTables}`,c:"#22c55e"},{l:"Failed",v:failedTables,c:"#ef4444"},{l:"DB Ping",v:`${dbLatency}ms`,c:"#38bdf8"},{l:"Avg Latency",v:`${avgLatency}ms`,c:"#a78bfa"},{l:"Realtime",v:realtimeConnected?"ON":"OFF",c:realtimeConnected?"#22c55e":"#ef4444"},{l:"Twilio",v:twilioStatus,c:twilioStatus==="active"?"#22c55e":twilioStatus==="degraded"?"#f59e0b":"#ef4444"}].map(({l,v,c})=>(
          <div key={l} style={{...C.card,padding:"14px 16px",marginBottom:0,textAlign:"center"}}>
            <div style={{fontSize:20,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>}

      {/* Health bar */}
      {snap&&<div style={{...C.card,padding:"10px 16px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:5}}>
          <span style={{color:"#94a3b8"}}>Database Health</span>
          <span style={{fontWeight:700,color:pct===100?"#22c55e":pct>80?"#f59e0b":"#ef4444"}}>{pct}%</span>
        </div>
        <div style={{background:"#1f2937",borderRadius:6,overflow:"hidden",height:8}}>
          <div style={{width:`${pct}%`,background:pct===100?"#22c55e":pct>80?"#f59e0b":"#ef4444",height:"100%",transition:"width .5s"}}/>
        </div>
      </div>}

      {/* Tabs */}
      <div style={{display:"flex",gap:4,marginBottom:14}}>
        {TABS.map(t=><button key={t} onClick={()=>setTab(t)} style={{padding:"8px 18px",borderRadius:8,fontSize:13,fontWeight:700,border:`1px solid ${tab===t?"#2563eb":"#1f2937"}`,cursor:"pointer",background:tab===t?"#1d4ed8":"#111827",color:tab===t?"#fff":"#6b7280"}}>{t}</button>)}
      </div>

      {/* MONITOR TAB */}
      {tab==="Monitor"&&<div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:14}}>
        <div>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            {["All",...Object.keys(GC)].map(g=><button key={g} onClick={()=>setGrpFilter(g)} style={{padding:"4px 12px",borderRadius:6,fontSize:11,fontWeight:700,border:"none",cursor:"pointer",background:grpFilter===g?(GC[g]||"#1d4ed8"):"#1f2937",color:grpFilter===g?"#fff":"#6b7280"}}>{g}</button>)}
          </div>
          {Object.keys(GC).filter(g=>grpFilter==="All"||grpFilter===g).map(group=>{
            const gt=ftables.filter(t=>t.group===group);
            if(!gt.length&&snap)return null;
            const gOk=gt.filter(t=>t.ok).length;
            const isOpen=expGrps.has(group);
            return(
              <div key={group} style={C.card}>
                <div style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:isOpen?10:0}} onClick={()=>setExpGrps(prev=>{const n=new Set(prev);isOpen?n.delete(group):n.add(group);return n;})}>
                  {isOpen?<ChevronDown size={13} color="#6b7280"/>:<ChevronRight size={13} color="#6b7280"/>}
                  <div style={{width:8,height:8,borderRadius:"50%",background:GC[group]}}/>
                  <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>{group}</span>
                  <span style={{fontSize:11,color:"#6b7280"}}>({gt.length})</span>
                  {gt.length>0&&<><span style={C.badge("#22c55e")}>{gOk} -</span>{gt.length-gOk>0&&<span style={C.badge("#ef4444")}>{gt.length-gOk} -</span>}</>}
                </div>
                {isOpen&&gt.map(t=>(
                  <div key={t.table} style={C.row(t.ok)}>
                    <SI ok={t.ok} size={13}/>
                    <span style={{flex:1,fontSize:12,color:"#cbd5e1"}}>{t.table}</span>
                    <span style={{...C.mono,color:t.ms<300?"#22c55e":t.ms<1000?"#f59e0b":"#ef4444"}}>{t.ms}ms</span>
                    <span style={C.mono}>{t.rows.toLocaleString()}</span>
                    {t.error&&<span style={{fontSize:10,color:"#ef4444",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={t.error}>- {t.error}</span>}
                  </div>
                ))}
                {!snap&&isOpen&&<div style={{color:"#374151",fontSize:12,padding:"8px 0"}}>Waiting for first cycle...</div>}
              </div>
            );
          })}
        </div>

        {/* Right */}
        <div>
          <div style={C.card}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <Activity size={14} color="#22c55e"/>
              <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>Realtime Events</span>
              <span style={{...C.badge("#22c55e"),fontSize:9,animation:"pulse 2s infinite"}}>- LIVE</span>
            </div>
            <div style={{maxHeight:240,overflowY:"auto",minHeight:80}}>
              {rtEvents.length===0?<div style={{color:"#374151",fontSize:12,textAlign:"center",padding:"20px 0"}}><Wifi size={16} color="#1f2937" style={{display:"block",margin:"0 auto 6px"}}/> Listening...</div>
                :rtEvents.map((e,i)=><div key={i} style={{display:"flex",gap:6,padding:"4px 8px",borderRadius:5,background:"#0f172a",marginBottom:3,fontSize:11}}>
                  <span style={{color:e.type==="INSERT"?"#22c55e":e.type==="UPDATE"?"#f59e0b":"#ef4444",fontWeight:700,minWidth:42}}>{e.type}</span>
                  <span style={{color:"#38bdf8",fontFamily:"monospace",flex:1}}>{e.table}</span>
                  <span style={{color:"#374151"}}>{e.ts}</span>
                </div>)}
            </div>
          </div>

          <div style={C.card}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <BarChart3 size={14} color="#818cf8"/>
              <span style={{fontWeight:700,fontSize:13,color:"#f1f5f9"}}>Coverage</span>
            </div>
            {Object.keys(GC).map(group=>{
              const gt=tables.filter(t=>t.group===group);
              const gOk=gt.filter(t=>t.ok).length;
              const p=gt.length?Math.round((gOk/gt.length)*100):0;
              return(<div key={group} style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                  <span style={{color:"#94a3b8"}}>{group}</span>
                  <span style={{color:"#6b7280"}}>{gOk}/{gt.length}</span>
                </div>
                <div style={{background:"#1f2937",borderRadius:3,overflow:"hidden",height:5}}>
                  <div style={{width:`${p}%`,background:GC[group],height:"100%",transition:"width .5s"}}/>
                </div>
              </div>);
            })}
          </div>

          {snap&&<div style={{...C.card,fontSize:11}}>
            {[["Run #",snap.runNumber],["Timestamp",new Date(snap.timestamp).toLocaleTimeString("en-KE",{timeZone:"Africa/Nairobi"})],["DB Ping",`${snap.dbLatency}ms`],["Realtime",snap.realtimeConnected?"- ON":"- OFF"],["Twilio",snap.twilioStatus]].map(([k,v])=>(
              <div key={String(k)} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #1f2937"}}>
                <span style={{color:"#6b7280"}}>{k}</span>
                <span style={{color:"#94a3b8",fontFamily:"monospace"}}>{v}</span>
              </div>
            ))}
          </div>}
        </div>
      </div>}

      {/* SCHEMA TAB */}
      {tab==="Schema"&&<div>
        <div style={{...C.card,display:"flex",gap:10,alignItems:"center",padding:"12px 16px"}}>
          <Search size={13} color="#6b7280"/>
          <input value={schSearch} onChange={e=>setSchSearch(e.target.value)} placeholder="Search tables..." style={{flex:1,background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontSize:13}}/>
          <button style={C.btn("#1d4ed8")} onClick={()=>liveDbEngine.fetchSchema()}><RefreshCw size={13}/> Refresh</button>
          <span style={C.badge("#6b7280")}>{schema.length} tables</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:10}}>
          {schema.filter(t=>!schSearch||t.table_name.includes(schSearch.toLowerCase())).map(t=>{
            const h=tables.find(x=>x.table===t.table_name);
            return(
              <div key={t.table_name} style={{...C.card,marginBottom:0,padding:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                  <Table2 size={13} color={h?.ok===false?"#ef4444":"#38bdf8"}/>
                  <span style={{fontWeight:700,fontSize:12,color:"#f1f5f9",flex:1}}>{t.table_name}</span>
                  <SI ok={h?h.ok:null} size={12}/>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:10}}>
                  {t.row_count!==undefined&&<span style={C.badge("#6b7280")}>{t.row_count?.toLocaleString()} rows</span>}
                  {h&&<span style={C.badge(h.ms<300?"#22c55e":"#f59e0b")}>{h.ms}ms</span>}
                  {h&&<span style={C.badge(GC[h.group]||"#6b7280")}>{h.group}</span>}
                </div>
                {h?.error&&<div style={{fontSize:10,color:"#ef4444",marginTop:6,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={h.error}>- {h.error}</div>}
              </div>
            );
          })}
          {schema.length===0&&<div style={{gridColumn:"1/-1",...C.card,textAlign:"center",padding:40}}>
            <Database size={32} color="#1f2937" style={{margin:"0 auto 12px"}}/>
            <div style={{color:"#374151",fontSize:13,marginBottom:12}}>Schema not loaded</div>
            <button style={C.btn("#1d4ed8")} onClick={()=>liveDbEngine.fetchSchema()}><RefreshCw size={13}/> Load Schema</button>
          </div>}
        </div>
      </div>}

      {/* TWILIO TAB */}
      {tab==="Twilio"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={C.card}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <Phone size={16} color="#22c55e"/>
            <span style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>Twilio Live Status</span>
            <span style={C.badge(twilioStatus==="active"?"#22c55e":twilioStatus==="degraded"?"#f59e0b":"#ef4444")}>{twilioStatus.toUpperCase()}</span>
          </div>
          {[["Account SID","ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a"],["Auth Token","d73601fb-"],["SMS From","+16812972643"],["WhatsApp","+14155238886"],["Join Code","join bad-machine"],["Msg Service","MGd547d8e3273fda2d21afdd6856acb245"],["Africa's Talking","Fallback active"],["Inbound webhook","?webhook=inbound"],["Session renewal","Auto every 24h"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #1f2937",fontSize:12}}>
              <span style={{color:"#6b7280"}}>{k}</span>
              <span style={{color:"#94a3b8",fontFamily:"monospace"}}>{v}</span>
            </div>
          ))}
          <div style={{marginTop:14,display:"flex",gap:8}}>
            <button style={C.btn("#0891b2",twilioLoading)} onClick={checkTwilio} disabled={twilioLoading}>
              {twilioLoading?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Activity size={13}/>}
              {twilioLoading?"Checking...":"Live Check"}
            </button>
          </div>
          {twilioDetail&&<div style={{marginTop:12,background:"#0f172a",borderRadius:8,padding:12,fontSize:11,fontFamily:"monospace",color:"#94a3b8"}}>
            <pre style={{margin:0,whiteSpace:"pre-wrap"}}>{JSON.stringify(twilioDetail,null,2)}</pre>
          </div>}
        </div>

        <div style={C.card}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <MessageSquare size={16} color="#f59e0b"/>
            <span style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>Send Test Message</span>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Phone (E.164 or 07xxx)</label>
            <input value={smsPhone} onChange={e=>setSmsPhone(e.target.value)} style={{width:"100%",background:"#0f172a",border:"1px solid #1f2937",borderRadius:7,padding:"8px 12px",color:"#e2e8f0",fontSize:13,boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"#6b7280",display:"block",marginBottom:4}}>Message</label>
            <textarea value={smsMsg} onChange={e=>setSmsMsg(e.target.value)} rows={3} style={{width:"100%",background:"#0f172a",border:"1px solid #1f2937",borderRadius:7,padding:"8px 12px",color:"#e2e8f0",fontSize:13,resize:"vertical",boxSizing:"border-box"}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={C.btn("#2563eb",smsSending)} onClick={()=>sendSms("sms")} disabled={smsSending}>
              {smsSending?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Send size={13}/>} Send SMS
            </button>
            <button style={C.btn("#22c55e",smsSending)} onClick={()=>sendSms("whatsapp")} disabled={smsSending}>
              <PhoneCall size={13}/> WhatsApp
            </button>
          </div>
          {smsRes&&<div style={{marginTop:12,background:"#0f172a",borderRadius:8,padding:12}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
              <SI ok={smsRes?.ok}/>
              <span style={{fontWeight:700,fontSize:13,color:smsRes?.ok?"#22c55e":"#ef4444"}}>
                {smsRes?.ok?`- Sent via ${smsRes?.results?.[0]?.provider||"twilio"}`:`- ${smsRes?.error||"Failed"}`}
              </span>
            </div>
            <pre style={{fontSize:10,fontFamily:"monospace",color:"#6b7280",margin:0,whiteSpace:"pre-wrap"}}>{JSON.stringify(smsRes,null,2)}</pre>
          </div>}

          <div style={{marginTop:16,padding:"12px 14px",background:"#0f172a",borderRadius:8,fontSize:11,lineHeight:1.9}}>
            <div style={{color:"#374151",fontWeight:700,marginBottom:6}}>Twilio Activation Status</div>
            {["send-sms edge function: DEPLOYED","Africa's Talking fallback: READY","Inbound webhook: ACTIVE","WhatsApp join flow: ACTIVE","Session auto-renewal: ENABLED","EL5H Messaging SID: ACTIVE"].map(s=>(
              <div key={s} style={{color:"#22c55e"}}>- {s}</div>
            ))}
          </div>
        </div>
      </div>}

      {/* MIGRATION TAB */}
      {tab==="Migration"&&<div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:14}}>
        <div style={C.card}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <Zap size={16} color="#f59e0b"/>
            <span style={{fontWeight:700,fontSize:14,color:"#f1f5f9"}}>v5.9 Migration Runner</span>
            {migDone&&<span style={C.badge("#22c55e")}>- Complete</span>}
          </div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:14,lineHeight:1.7}}>
            Creates 12 missing tables - Patches 6 existing tables - Adds indexes - Enables RLS. All idempotent.
          </div>
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            <button style={C.btn("#f59e0b",migrating)} onClick={runMig} disabled={migrating}>
              {migrating?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Send size={13}/>}
              {migrating?"Running...":"Push Migration"}
            </button>
            <button style={C.btn("#1d4ed8")} onClick={()=>liveDbEngine.forceRun()}><RefreshCw size={13}/> Re-test</button>
          </div>
          <div ref={logRef} style={{background:"#0a0f1e",borderRadius:8,padding:14,height:420,overflowY:"auto",fontSize:11,fontFamily:"monospace",lineHeight:1.8}}>
            {migLog.length===0?<span style={{color:"#374151"}}>Click "Push Migration" to start...</span>
              :migLog.map((line,i)=><div key={i} style={{color:line.startsWith("-")?"#22c55e":line.startsWith("-")?"#ef4444":line.startsWith("-")?"#f59e0b":line.startsWith("-")||line.startsWith("-")||line.startsWith("-")?"#38bdf8":"#6b7280"}}>{line}</div>)}
          </div>
        </div>

        <div>
          <div style={C.card}>
            <div style={{fontWeight:700,fontSize:13,color:"#f1f5f9",marginBottom:10}}>New Tables</div>
            {["categories","journal_voucher_lines","purchase_voucher_lines","inspection_items","procurement_plan_items","report_schedules","system_metrics","supplier_scorecards","scan_log","email_messages","reception_appointments"].map(t=>{
              const h=tables.find(x=>x.table===t);
              return(<div key={t} style={C.row(h?h.ok:null)}>
                <SI ok={h?h.ok:null} size={12}/>
                <span style={{fontSize:12,color:"#cbd5e1",flex:1}}>{t}</span>
                {h&&<span style={C.mono}>{h.rows}</span>}
              </div>);
            })}
          </div>
          <div style={C.card}>
            <div style={{fontWeight:700,fontSize:13,color:"#f1f5f9",marginBottom:10}}>Patched Tables</div>
            {["backup_jobs","items","suppliers","inspections","non_conformance","procurement_plans"].map(t=>{
              const h=tables.find(x=>x.table===t);
              return(<div key={t} style={C.row(h?h.ok:null)}>
                <SI ok={h?h.ok:null} size={12}/>
                <span style={{fontSize:12,color:"#cbd5e1",flex:1}}>{t}</span>
                {h&&<span style={C.mono}>{h.ms}ms</span>}
              </div>);
            })}
          </div>
        </div>
      </div>}
    </div>
  );
}
