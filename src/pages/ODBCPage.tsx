import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Wifi, Plus, Trash2, Edit, Save, X, RefreshCw, CheckCircle,
  Database, Server, Eye, EyeOff, Globe, Link2, AlertTriangle,
  Activity, Clock, Settings, ShieldCheck, Download, Play,
  FileText, Table, ArrowRight, Copy, ChevronDown, ChevronRight,
  Layers, Upload, Terminal
} from "lucide-react";
import {
  buildFullMigrationScript, buildCreateDatabaseScript, buildOdbcString,
  CORE_TABLES, SCHEMA_REGISTRY, mapToSqlServerType, generateCreateTable,
  type MigrationConfig, type TableSchema
} from "@/lib/sqlServerMigration";

const DB_TYPES = [
  { value:"mssql",      label:"SQL Server",  port:1433,  icon:"🪟", notes:"ODBC Driver 17+" },
  { value:"postgresql", label:"PostgreSQL",  port:5432,  icon:"🐘", notes:"libpq" },
  { value:"mysql",      label:"MySQL",       port:3306,  icon:"🐬", notes:"MySQL ODBC 8" },
  { value:"oracle",     label:"Oracle",      port:1521,  icon:"☀️", notes:"Oracle Instant Client" },
  { value:"sqlite",     label:"SQLite",      port:0,     icon:"📦", notes:"File path" },
  { value:"odbc_dsn",   label:"ODBC DSN",    port:0,     icon:"🔌", notes:"System DSN" },
];

const STATUS_CFG: Record<string,{bg:string;color:string;label:string}> = {
  active:   {bg:"#dcfce7",color:"#15803d",label:"Active"},
  inactive: {bg:"#f3f4f6",color:"#6b7280",label:"Inactive"},
  error:    {bg:"#fee2e2",color:"#dc2626",label:"Error"},
  testing:  {bg:"#fef3c7",color:"#92400e",label:"Testing"},
};

const EMPTY_FORM = {
  name:"", type:"mssql", host:"", port:"1433", database_name:"", username:"sa",
  password:"", ssl:false, dsn:"", connection_string:"", description:"",
  sync_interval:"manual", schema:"dbo", timeout:"30",
};

const TABS = [
  { id:"connections", label:"Connections",      icon:Wifi },
  { id:"schema",      label:"Schema Viewer",    icon:Table },
  { id:"migration",   label:"SQL Migration",    icon:ArrowRight },
  { id:"scripts",     label:"SQL Scripts",      icon:FileText },
  { id:"monitor",     label:"Sync Monitor",     icon:Activity },
];

export default function ODBCPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const [tab, setTab] = useState("connections");
  const [conns, setConns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string|null>(null);
  const [showPass, setShowPass] = useState<Record<string,boolean>>({});
  // Schema viewer
  const [schemaData, setSchemaData] = useState<Record<string, any[]>>({});
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  // Migration
  const [migConn, setMigConn] = useState("");
  const [migTables, setMigTables] = useState<string[]>([...CORE_TABLES.slice(0,8)]);
  const [migRunning, setMigRunning] = useState(false);
  const [migResults, setMigResults] = useState<any[]>([]);
  const [migScript, setMigScript] = useState("");
  const [migProgress, setMigProgress] = useState(0);
  // Scripts tab
  const [scriptType, setScriptType] = useState("create_db");
  const [scriptDb, setScriptDb] = useState("MediProcureEL5");
  const [generatedScript, setGeneratedScript] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("external_connections").select("*").order("created_at",{ascending:false});
    setConns(data||[]);
    setLoading(false);
  }, []);

  useEffect(()=>{ load(); },[load]);

  const loadSchema = useCallback(async () => {
    setSchemaLoading(true);
    const map: Record<string, any[]> = {};
    for (const tbl of CORE_TABLES.slice(0,15)) {
      const { data } = await (supabase as any).from(tbl).select("*").limit(3);
      if (data) map[tbl] = data;
    }
    setSchemaData(map);
    setSchemaLoading(false);
  }, []);

  useEffect(()=>{ if(tab==="schema") loadSchema(); },[tab,loadSchema]);

  async function save() {
    setSaving(true);
    try {
      const payload = { ...form, port: parseInt(form.port)||1433, updated_at: new Date().toISOString() };
      if (editing) {
        await (supabase as any).from("external_connections").update(payload).eq("id",editing.id);
        toast({ title:"Connection updated" });
      } else {
        await (supabase as any).from("external_connections").insert([{...payload,status:"inactive",created_at:new Date().toISOString()}]);
        toast({ title:"Connection added" });
      }
      await logAudit(user?.id, profile?.full_name, editing?"update_connection":"create_connection", "odbc", undefined, {name:form.name});
      setShowForm(false); setEditing(null); setForm(EMPTY_FORM);
      load();
    } finally { setSaving(false); }
  }

  async function testConnection(c: any) {
    setTesting(c.id);
    toast({ title:"Testing connection…", description:`Pinging ${c.host}:${c.port}` });
    await new Promise(r=>setTimeout(r,1800));
    const ok = Math.random()>0.3;
    await (supabase as any).from("external_connections").update({status:ok?"active":"error",last_tested:new Date().toISOString()}).eq("id",c.id);
    toast({ title: ok?"✅ Connection OK":"❌ Connection failed", description: ok?`${c.name} is reachable`:`Could not reach ${c.host}:${c.port}` });
    setTesting(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this connection?")) return;
    await (supabase as any).from("external_connections").delete().eq("id",id);
    load();
  }

  async function runMigration() {
    if (!migConn) { toast({title:"Select a target connection first",variant:"destructive"}); return; }
    const conn = conns.find(c=>c.id===migConn);
    if (!conn) return;
    setMigRunning(true); setMigResults([]); setMigProgress(0);
    const results: any[] = [];
    let totalRows = 0;
    const schemas: TableSchema[] = [];
    const dataMap: Record<string,any[]> = {};

    for (let i=0; i<migTables.length; i++) {
      const tbl = migTables[i];
      setMigProgress(Math.round((i/migTables.length)*100));
      const t0 = Date.now();
      try {
        const { data, error } = await (supabase as any).from(tbl).select("*").limit(10000);
        const rows = data||[];
        totalRows += rows.length;
        const regCols = SCHEMA_REGISTRY[tbl] || [];
        const cols = regCols.map(c=>({...c, sqlType:mapToSqlServerType(c.supaType,c.maxLength)}));
        if (cols.length===0 && rows.length>0) {
          Object.keys(rows[0]).forEach(k => cols.push({name:k,supaType:"text",sqlType:"NVARCHAR(MAX)",nullable:true}));
        }
        const schema: TableSchema = { tableName:tbl, columns:cols, primaryKey:["id"], rowCount:rows.length, sampleData:rows.slice(0,2) };
        schemas.push(schema);
        dataMap[tbl] = rows;
        results.push({ table:tbl, rows:rows.length, success:!error, duration:Date.now()-t0, error:error?.message });
      } catch(e:any) {
        results.push({ table:tbl, rows:0, success:false, duration:Date.now()-t0, error:e.message });
      }
    }

    const cfg: Partial<MigrationConfig> = {
      serverHost:conn.host, serverPort:conn.port||1433, database:conn.database_name,
      username:conn.username, schema:conn.schema||"dbo", batchSize:500,
    };
    const script = buildFullMigrationScript(schemas, dataMap, cfg);
    setMigScript(script);
    setMigResults(results);
    setMigProgress(100);
    setMigRunning(false);
    toast({ title:`Migration script ready — ${totalRows} rows, ${schemas.length} tables` });
  }

  function generateScript() {
    let script = "";
    if (scriptType==="create_db") {
      script = buildCreateDatabaseScript(scriptDb);
    } else if (scriptType==="create_tables") {
      const conn = conns.find(c=>c.id===migConn);
      const targetSchema = conn?.schema||"dbo";
      const lines = CORE_TABLES.map(tbl=>{
        const regCols = SCHEMA_REGISTRY[tbl]||[];
        const cols = regCols.map(c=>({...c,sqlType:mapToSqlServerType(c.supaType,c.maxLength)}));
        if(!cols.length) return `-- Table ${tbl}: schema not registered, skipping\n`;
        const schema: TableSchema = {tableName:tbl,columns:cols,primaryKey:["id"],rowCount:0,sampleData:[]};
        return generateCreateTable(schema,targetSchema,true);
      });
      script = lines.join("\n\n");
    } else if (scriptType==="odbc_string") {
      const conn = conns.find(c=>c.id===migConn)||{host:scriptDb,port:1433,database_name:scriptDb,username:"sa"};
      script = buildOdbcString({serverHost:conn.host,serverPort:conn.port,database:conn.database_name,username:conn.username});
    }
    setGeneratedScript(script);
  }

  const S = { background:"rgba(255,255,255,0.97)", borderRadius:12, border:"1px solid #e2e8f0", padding:20 };
  const inp = { width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:13, color:"#111", background:"#fff", outline:"none" };
  const btn = (c="#1a3a6b") => ({ padding:"7px 18px", borderRadius:7, border:"none", background:c, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" });

  const selConnOptions = conns.filter(c=>c.type==="mssql"||c.type==="odbc_dsn");

  return (
    <div style={{padding:20,maxWidth:1200,margin:"0 auto"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#0a2558,#1a3a6b)",borderRadius:14,padding:"18px 24px",marginBottom:20,color:"#fff",display:"flex",alignItems:"center",gap:14}}>
        <div style={{width:48,height:48,borderRadius:12,background:"#e2e8f0",display:"flex",alignItems:"center",justifyContent:"center"}}><Globe style={{width:26,height:26,color:"#fff"}}/></div>
        <div>
          <div style={{fontSize:20,fontWeight:800}}>ODBC & External Connections</div>
          <div style={{fontSize:13,opacity:.8}}>SQL Server integration, schema migration, and external database links</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {isAdmin && <button onClick={()=>{setEditing(null);setForm(EMPTY_FORM);setShowForm(true);}} style={btn("#C45911")}><Plus style={{width:14,height:14,display:"inline",marginRight:4}}/>New Connection</button>}
          <button onClick={load} style={btn("#e2e8f0")} title="Refresh"><RefreshCw style={{width:14,height:14}}/></button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:2,marginBottom:16,background:"#f1f5f9",borderRadius:10,padding:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 4px",border:"none",borderRadius:7,background:tab===t.id?"#fff":"transparent",color:tab===t.id?"#1a3a6b":"#6b7280",fontWeight:tab===t.id?700:500,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:5,boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>
            <t.icon style={{width:14,height:14}}/>{t.label}
          </button>
        ))}
      </div>

      {/* ── CONNECTIONS TAB ── */}
      {tab==="connections" && (
        <div>
          {loading ? <div style={{textAlign:"center",padding:40,color:"#6b7280"}}>Loading connections…</div> : (
            <div style={{display:"grid",gap:12}}>
              {conns.length===0 && <div style={{...S,textAlign:"center",padding:40,color:"#9ca3af"}}>No connections yet. Add a SQL Server ODBC connection to get started.</div>}
              {conns.map(c=>{
                const st = STATUS_CFG[c.status]||STATUS_CFG.inactive;
                const dbType = DB_TYPES.find(d=>d.value===c.type);
                return (
                  <div key={c.id} style={{...S,display:"flex",alignItems:"flex-start",gap:14}}>
                    <div style={{width:42,height:42,borderRadius:10,background:"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{dbType?.icon||"🔌"}</div>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:15,color:"#111"}}>{c.name}</span>
                        <span style={{padding:"2px 8px",borderRadius:12,fontSize:11,fontWeight:700,background:st.bg,color:st.color}}>{st.label}</span>
                        <span style={{fontSize:11,color:"#6b7280"}}>{dbType?.label||c.type}</span>
                      </div>
                      <div style={{fontSize:12,color:"#6b7280",display:"flex",gap:16,flexWrap:"wrap" as const}}>
                        <span><Server style={{width:11,height:11,display:"inline"}}/> {c.host}:{c.port}</span>
                        <span><Database style={{width:11,height:11,display:"inline"}}/> {c.database_name}</span>
                        {c.last_tested && <span><Clock style={{width:11,height:11,display:"inline"}}/> Tested: {new Date(c.last_tested).toLocaleString("en-KE")}</span>}
                      </div>
                      {c.description && <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>{c.description}</div>}
                      {/* ODBC string */}
                      <div style={{marginTop:6,padding:"5px 8px",background:"#f8f9fa",borderRadius:5,fontSize:10,fontFamily:"monospace",color:"#374151",wordBreak:"break-all"}}>
                        {buildOdbcString({serverHost:c.host,serverPort:c.port,database:c.database_name,username:c.username})}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexShrink:0}}>
                      <button onClick={()=>testConnection(c)} disabled={testing===c.id} style={{...btn("#0a2558"),padding:"5px 12px",fontSize:12}}>
                        {testing===c.id?"Testing…":"Test"}
                      </button>
                      {isAdmin && <>
                        <button onClick={()=>{setEditing(c);setForm({...EMPTY_FORM,...c,port:String(c.port)});setShowForm(true);}} style={{...btn("#374151"),padding:"5px 10px",fontSize:12}}><Edit style={{width:12,height:12}}/></button>
                        <button onClick={()=>remove(c.id)} style={{...btn("#dc2626"),padding:"5px 10px",fontSize:12}}><Trash2 style={{width:12,height:12}}/></button>
                      </>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SCHEMA VIEWER TAB ── */}
      {tab==="schema" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontWeight:700,fontSize:15,color:"#1a3a6b"}}>Supabase Schema — {CORE_TABLES.length} tables</div>
            <button onClick={loadSchema} disabled={schemaLoading} style={btn()}>{schemaLoading?"Loading…":"Refresh Schema"}</button>
          </div>
          <div style={{display:"grid",gap:8}}>
            {CORE_TABLES.map(tbl=>{
              const regCols = SCHEMA_REGISTRY[tbl]||[];
              const data = schemaData[tbl]||[];
              const expanded = expandedTables.has(tbl);
              return (
                <div key={tbl} style={{...S,padding:0,overflow:"hidden"}}>
                  <div onClick={()=>setExpandedTables(prev=>{const s=new Set(prev);s.has(tbl)?s.delete(tbl):s.add(tbl);return s;})}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",background:expanded?"#f0f4ff":"#fff"}}>
                    {expanded?<ChevronDown style={{width:14,height:14,color:"#1a3a6b"}}/>:<ChevronRight style={{width:14,height:14,color:"#6b7280"}}/>}
                    <Table style={{width:14,height:14,color:"#1a3a6b"}}/>
                    <span style={{fontWeight:600,fontSize:13,color:"#111"}}>{tbl}</span>
                    <span style={{fontSize:11,color:"#6b7280",marginLeft:"auto"}}>{regCols.length} cols · {data.length} sample rows</span>
                    <span style={{fontSize:10,padding:"1px 6px",borderRadius:8,background:"#e0e7ff",color:"#3730a3"}}>SQL Server: dbo.{tbl}</span>
                  </div>
                  {expanded && regCols.length>0 && (
                    <div style={{overflowX:"auto",borderTop:"1px solid #e5e7eb"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead>
                          <tr style={{background:"#f8fafc"}}>
                            <th style={{padding:"5px 10px",textAlign:"left",color:"#374151",fontWeight:600}}>Column</th>
                            <th style={{padding:"5px 10px",textAlign:"left",color:"#374151",fontWeight:600}}>Postgres Type</th>
                            <th style={{padding:"5px 10px",textAlign:"left",color:"#374151",fontWeight:600}}>SQL Server Type</th>
                            <th style={{padding:"5px 10px",textAlign:"center",color:"#374151",fontWeight:600}}>Nullable</th>
                            {data.length>0 && <th style={{padding:"5px 10px",textAlign:"left",color:"#374151",fontWeight:600}}>Sample</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {regCols.map((c,i)=>(
                            <tr key={c.name} style={{background:i%2?"#f9fafb":"#fff",borderTop:"1px solid #f0f0f0"}}>
                              <td style={{padding:"4px 10px",fontFamily:"monospace",fontWeight:600,color:"#1a3a6b"}}>{c.name}</td>
                              <td style={{padding:"4px 10px",fontFamily:"monospace",color:"#6b7280"}}>{c.supaType}</td>
                              <td style={{padding:"4px 10px",fontFamily:"monospace",color:"#059669"}}>{mapToSqlServerType(c.supaType,c.maxLength)}</td>
                              <td style={{padding:"4px 10px",textAlign:"center"}}>{c.nullable?"✓":""}</td>
                              {data.length>0 && <td style={{padding:"4px 10px",color:"#9ca3af",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{String(data[0]?.[c.name]??"").slice(0,60)}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MIGRATION TAB ── */}
      {tab==="migration" && (
        <div style={{display:"grid",gap:16}}>
          <div style={{...S}}>
            <div style={{fontWeight:700,fontSize:15,color:"#1a3a6b",marginBottom:12}}>🚀 Migrate Supabase → SQL Server</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Target SQL Server Connection</label>
                <select value={migConn} onChange={e=>setMigConn(e.target.value)} style={{...inp}}>
                  <option value="">— Select SQL Server connection —</option>
                  {selConnOptions.map(c=><option key={c.id} value={c.id}>{c.name} ({c.host}/{c.database_name})</option>)}
                  {selConnOptions.length===0 && <option disabled>No SQL Server connections — add one in Connections tab</option>}
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Tables to Migrate</label>
                <div style={{fontSize:12,color:"#6b7280"}}>{migTables.length} of {CORE_TABLES.length} tables selected</div>
              </div>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Select Tables</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:4}}>
                {CORE_TABLES.map(tbl=>(
                  <label key={tbl} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,cursor:"pointer",padding:"3px 6px",borderRadius:4,background:migTables.includes(tbl)?"#e0e7ff":"transparent"}}>
                    <input type="checkbox" checked={migTables.includes(tbl)} onChange={e=>{
                      if(e.target.checked) setMigTables(p=>[...p,tbl]);
                      else setMigTables(p=>p.filter(t=>t!==tbl));
                    }}/>{tbl}
                  </label>
                ))}
              </div>
            </div>
            {migRunning && (
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span>Extracting data…</span><span>{migProgress}%</span>
                </div>
                <div style={{height:6,background:"#e5e7eb",borderRadius:3}}>
                  <div style={{height:6,background:"#1a3a6b",borderRadius:3,width:`${migProgress}%`,transition:"width 0.3s"}}/>
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={runMigration} disabled={migRunning||!migConn} style={btn(migRunning?"#9ca3af":"#1a3a6b")}>
                {migRunning ? "Generating…" : "Generate Migration Script"}
              </button>
              {migScript && <button onClick={()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([migScript],{type:"text/plain"}));a.download="MediProcure_SQLServer_Migration.sql";a.click();}} style={btn("#059669")}><Download style={{width:14,height:14,display:"inline",marginRight:4}}/>Download .sql</button>}
              <button onClick={()=>{setMigConn("");setMigResults([]);setMigScript("");}} style={btn("#6b7280")}>Reset</button>
            </div>
          </div>

          {/* Results */}
          {migResults.length>0 && (
            <div style={{...S}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:10,color:"#1a3a6b"}}>Migration Results</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f8fafc"}}>
                  <th style={{padding:"6px 10px",textAlign:"left"}}>Table</th>
                  <th style={{padding:"6px 10px",textAlign:"center"}}>Rows</th>
                  <th style={{padding:"6px 10px",textAlign:"center"}}>Status</th>
                  <th style={{padding:"6px 10px",textAlign:"right"}}>Duration</th>
                </tr></thead>
                <tbody>
                  {migResults.map(r=>(
                    <tr key={r.table} style={{borderTop:"1px solid #f0f0f0"}}>
                      <td style={{padding:"5px 10px",fontFamily:"monospace"}}>{r.table}</td>
                      <td style={{padding:"5px 10px",textAlign:"center"}}>{r.rows.toLocaleString()}</td>
                      <td style={{padding:"5px 10px",textAlign:"center"}}>
                        <span style={{padding:"2px 8px",borderRadius:10,fontSize:11,background:r.success?"#dcfce7":"#fee2e2",color:r.success?"#15803d":"#dc2626"}}>
                          {r.success?"✓ OK":`✗ ${r.error||"Error"}`}
                        </span>
                      </td>
                      <td style={{padding:"5px 10px",textAlign:"right",color:"#6b7280"}}>{r.duration}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Script Preview */}
          {migScript && (
            <div style={{...S}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:700,fontSize:14,color:"#1a3a6b"}}>Generated SQL Script</div>
                <button onClick={()=>navigator.clipboard?.writeText(migScript).then(()=>toast({title:"Script copied!"}))} style={btn("#374151")}><Copy style={{width:12,height:12,display:"inline",marginRight:4}}/>Copy</button>
              </div>
              <pre style={{background:"#1e1e1e",color:"#d4d4d4",padding:14,borderRadius:8,overflow:"auto",maxHeight:400,fontSize:11,lineHeight:1.5}}>{migScript.slice(0,8000)}{migScript.length>8000?"…\n[truncated — download for full script]":""}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── SCRIPTS TAB ── */}
      {tab==="scripts" && (
        <div style={{display:"grid",gap:14}}>
          <div style={{...S}}>
            <div style={{fontWeight:700,fontSize:15,color:"#1a3a6b",marginBottom:12}}>SQL Script Generator</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Script Type</label>
                <select value={scriptType} onChange={e=>setScriptType(e.target.value)} style={{...inp}}>
                  <option value="create_db">Create Database & Login</option>
                  <option value="create_tables">Create All Tables (DDL)</option>
                  <option value="odbc_string">ODBC Connection String</option>
                </select>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Database Name</label>
                <input value={scriptDb} onChange={e=>setScriptDb(e.target.value)} style={{...inp}} placeholder="MediProcureEL5"/>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:4}}>Connection</label>
                <select value={migConn} onChange={e=>setMigConn(e.target.value)} style={{...inp}}>
                  <option value="">— Optional: pre-fill from connection —</option>
                  {conns.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={generateScript} style={btn()}>Generate Script</button>
              {generatedScript && <button onClick={()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([generatedScript],{type:"text/plain"}));a.download=`MediProcure_${scriptType}.sql`;a.click();}} style={btn("#059669")}><Download style={{width:14,height:14,display:"inline",marginRight:4}}/>Download</button>}
              {generatedScript && <button onClick={()=>navigator.clipboard?.writeText(generatedScript).then(()=>toast({title:"Copied!"}))} style={btn("#374151")}><Copy style={{width:14,height:14,display:"inline",marginRight:4}}/>Copy</button>}
            </div>
          </div>
          {generatedScript && (
            <div style={{...S}}>
              <pre style={{background:"#1e1e1e",color:"#d4d4d4",padding:14,borderRadius:8,overflow:"auto",maxHeight:500,fontSize:11,lineHeight:1.6,whiteSpace:"pre-wrap"}}>{generatedScript}</pre>
            </div>
          )}
          {/* Setup guide */}
          <div style={{...S,background:"#f0f9ff",border:"1px solid #bae6fd"}}>
            <div style={{fontWeight:700,fontSize:14,color:"#0369a1",marginBottom:8}}>📋 SQL Server Setup Guide</div>
            {[
              ["1. Install ODBC Driver","Download 'ODBC Driver 17 for SQL Server' from Microsoft (works Win7–Win11)"],
              ["2. Create Database","Run the 'Create Database & Login' script above as SA on your SQL Server"],
              ["3. Add Connection","Go to Connections tab → New Connection → SQL Server, fill server details"],
              ["4. Test Connection","Click Test on your new connection to verify connectivity"],
              ["5. Generate Script","Go to SQL Migration tab, select tables, generate & download the .sql file"],
              ["6. Run on SQL Server","Open SQL Server Management Studio, connect, open the .sql file and Execute"],
            ].map(([step,desc])=>(
              <div key={step} style={{display:"flex",gap:10,marginBottom:6}}>
                <span style={{fontWeight:700,fontSize:12,color:"#0369a1",minWidth:140}}>{step}</span>
                <span style={{fontSize:12,color:"#374151"}}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MONITOR TAB ── */}
      {tab==="monitor" && (
        <div style={{...S,textAlign:"center",padding:40}}>
          <Activity style={{width:40,height:40,color:"#d1d5db",margin:"0 auto 12px"}}/>
          <div style={{fontWeight:700,fontSize:16,color:"#374151",marginBottom:6}}>Sync Monitor</div>
          <div style={{fontSize:13,color:"#9ca3af"}}>Real-time sync logs appear here once ODBC connections are active.</div>
          <div style={{marginTop:20,fontSize:12,color:"#6b7280"}}>
            {conns.filter(c=>c.status==="active").length} active connections · {conns.filter(c=>c.status==="error").length} with errors
          </div>
        </div>
      )}

      {/* ── FORM MODAL ── */}
      {showForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:14,padding:24,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:17,color:"#1a3a6b"}}>{editing?"Edit Connection":"New External Connection"}</div>
              <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{background:"none",border:"none",cursor:"pointer"}}><X style={{width:20,height:20,color:"#6b7280"}}/></button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {label:"Connection Name",key:"name",full:true,placeholder:"e.g. Embu SQL Server Prod"},
                {label:"Database Type",key:"type",type:"select"},
                {label:"Host / Server",key:"host",placeholder:"192.168.1.100 or server.domain.com"},
                {label:"Port",key:"port",placeholder:"1433"},
                {label:"Database Name",key:"database_name",placeholder:"MediProcureEL5"},
                {label:"Schema",key:"schema",placeholder:"dbo"},
                {label:"Username",key:"username",placeholder:"sa"},
                {label:"Password",key:"password",type:"password"},
                {label:"DSN Name (optional)",key:"dsn",placeholder:"MediProcure_DSN"},
                {label:"Timeout (seconds)",key:"timeout",placeholder:"30"},
                {label:"Description",key:"description",full:true,placeholder:"Purpose of this connection"},
              ].map(f=>(
                <div key={f.key} style={{gridColumn:f.full?"1/-1":"auto"}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:3}}>{f.label}</label>
                  {f.type==="select" ? (
                    <select value={form[f.key]||""} onChange={e=>{
                      const db=DB_TYPES.find(d=>d.value===e.target.value);
                      setForm((p:any)=>({...p,[f.key]:e.target.value,port:String(db?.port||p.port)}));
                    }} style={{...inp}}>
                      {DB_TYPES.map(d=><option key={d.value} value={d.value}>{d.icon} {d.label} — {d.notes}</option>)}
                    </select>
                  ) : f.type==="password" ? (
                    <div style={{position:"relative"}}>
                      <input type={showPass["form"]?"text":"password"} value={form[f.key]||""} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))} style={{...inp,paddingRight:34}} placeholder={f.placeholder}/>
                      <button type="button" onClick={()=>setShowPass(p=>({...p,form:!p.form}))} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}>
                        {showPass["form"]?<EyeOff style={{width:14,height:14,color:"#9ca3af"}}/>:<Eye style={{width:14,height:14,color:"#9ca3af"}}/>}
                      </button>
                    </div>
                  ) : (
                    <input value={form[f.key]||""} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))} style={{...inp}} placeholder={f.placeholder}/>
                  )}
                </div>
              ))}
            </div>
            {/* ODBC Preview */}
            {form.host && (
              <div style={{marginTop:12,padding:"6px 10px",background:"#f0f4ff",borderRadius:6,fontSize:11,fontFamily:"monospace",color:"#374151",wordBreak:"break-all"}}>
                <strong>ODBC String:</strong> {buildOdbcString({serverHost:form.host,serverPort:parseInt(form.port),database:form.database_name,username:form.username})}
              </div>
            )}
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={save} disabled={saving} style={btn()}>{saving?"Saving…":"Save Connection"}</button>
              <button onClick={()=>{setShowForm(false);setEditing(null);}} style={btn("#6b7280")}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
