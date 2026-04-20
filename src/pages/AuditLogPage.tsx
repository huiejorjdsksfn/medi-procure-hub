
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Activity, Search, X, RefreshCw, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useSystemSettings } from "@/hooks/useSystemSettings";

const ACTION_STYLE: Record<string,{bg:string;color:string}> = {
  create:  {bg:"#dcfce7",color:"#15803d"},
  update:  {bg:"#dbeafe",color:"#1d4ed8"},
  delete:  {bg:"#fee2e2",color:"#dc2626"},
  approve: {bg:"#d1fae5",color:"#065f46"},
  reject:  {bg:"#fef2f2",color:"#b91c1c"},
  login:   {bg:"#e0f2fe",color:"#0369a1"},
  logout:  {bg:"#f3f4f6",color:"#6b7280"},
  export:  {bg:"#fef3c7",color:"#92400e"},
  default: {bg:"#f3f4f6",color:"#6b7280"},
};

const spin: React.CSSProperties = {animation:"spin 1s linear infinite",display:"inline-block"};

export default function AuditLogPage() {
  const { hasRole } = useAuth();
  const { get: getSetting } = useSystemSettings();
  const [logs, setLogs]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [dateFrom, setDateFrom]   = useState(new Date(Date.now()-30*864e5).toISOString().slice(0,10));
  const [dateTo, setDateTo]       = useState(new Date().toISOString().slice(0,10));
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(async()=>{
    setLoading(true);
    try{
      const{data}=await(supabase as any).from("audit_log").select("*")
        .gte("created_at",dateFrom).lte("created_at",dateTo+"T23:59:59")
        .order("created_at",{ascending:false}).limit(2000);
      setLogs(data||[]);
    }catch(e:any){console.warn("[AuditLog]",e?.message);}
    finally{setLoading(false);}
  },[dateFrom,dateTo]);

  useEffect(()=>{ if(hasRole("admin")) fetchLogs(); },[fetchLogs]);

  if(!hasRole("admin")) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:200}}>
      <p style={{color:"#9ca3af",fontSize:14}}>Administrator access required to view audit trail.</p>
    </div>
  );

  const modules = [...new Set(logs.map(l=>l.module).filter(Boolean))];
  const actions = [...new Set(logs.map(l=>l.action).filter(Boolean))];

  const filtered = logs.filter(l=>{
    const q = search.toLowerCase();
    const ms = !search||(l.user_name||"").toLowerCase().includes(q)||(l.record_id||"").toLowerCase().includes(q)||(l.module||"").toLowerCase().includes(q);
    return ms&&(filterModule==="all"||l.module===filterModule)&&(filterAction==="all"||l.action===filterAction);
  });

  const paged = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length/PAGE_SIZE);

  const exportExcel = ()=>{
    const wb=XLSX.utils.book_new();
    const ws=XLSX.utils.json_to_sheet(filtered.map(l=>({
      "Date/Time":l.created_at?new Date(l.created_at).toLocaleString("en-KE"):"",
      "User":l.user_name||"","Action":l.action||"","Module":l.module||"",
      "Record ID":l.record_id||"","IP":l.ip_address||"",
      "Details":l.details?JSON.stringify(l.details):"",
    })));
    ws["!cols"]=[{wch:22},{wch:20},{wch:12},{wch:15},{wch:14},{wch:15},{wch:40}];
    XLSX.utils.book_append_sheet(wb,ws,"Audit Trail");
    XLSX.writeFile(wb,`Audit_Trail_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported",description:`${filtered.length} records exported`});
  };

  const inp: React.CSSProperties = {background:"#e2e8f0",border:"1px solid #e2e8f0",color:"#fff",borderRadius:8,padding:"5px 10px",fontSize:12,outline:"none"};
  const sel: React.CSSProperties = {...inp,cursor:"pointer"};

  return (
    <div style={{padding:"16px 20px",fontFamily:"'Segoe UI',system-ui,sans-serif",minHeight:"100%"}}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#374151,#4b5563)",borderRadius:14,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,boxShadow:"0 4px 16px rgba(55,65,81,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Activity style={{width:20,height:20,color:"#fff"}}/>
          <div>
            <h1 style={{fontSize:15,fontWeight:900,color:"#fff",margin:0}}>Audit Trail</h1>
            <p style={{fontSize:10,color:"rgba(255,255,255,0.5)",margin:0}}>{filtered.length.toLocaleString()} records matching filters</p>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={fetchLogs} disabled={loading}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#e2e8f0",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>
            <RefreshCw style={{width:13,height:13,...(loading?{animation:"spin 1s linear infinite"}:{})}}/>Refresh
          </button>
          <button onClick={exportExcel}
            style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",background:"#16a34a",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700}}>
            <FileSpreadsheet style={{width:13,height:13}}/>Export Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:"rgba(8,20,55,0.82)",backdropFilter:"blur(14px)",border:"1px solid #f1f5f9",borderRadius:12,padding:"10px 16px",display:"flex",flexWrap:"wrap" as const,gap:10,marginBottom:14,alignItems:"center"}}>
        <label style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>From</label>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
        <label style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase"}}>To</label>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp}/>
        <select value={filterModule} onChange={e=>{setFilterModule(e.target.value);setPage(1);}} style={sel}>
          <option value="all" style={{background:"#ffffff"}}>All Modules</option>
          {modules.map(m=><option key={m} value={m} style={{background:"#ffffff"}}>{m}</option>)}
        </select>
        <select value={filterAction} onChange={e=>{setFilterAction(e.target.value);setPage(1);}} style={sel}>
          <option value="all" style={{background:"#ffffff"}}>All Actions</option>
          {actions.map(a=><option key={a} value={a} style={{background:"#ffffff"}}>{a}</option>)}
        </select>
        <div style={{position:"relative",flex:1,minWidth:200}}>
          <Search style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",width:12,height:12,color:"rgba(255,255,255,0.3)"}}/>
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Search user, module, record..."
            style={{...inp,width:"100%",paddingLeft:28,boxSizing:"border-box"}}/>
          {search&&<button onClick={()=>setSearch("")} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}>
            <X style={{width:10,height:10,color:"rgba(255,255,255,0.4)"}}/>
          </button>}
        </div>
      </div>

      {/* Table */}
      <div style={{background:"rgba(8,20,55,0.82)",backdropFilter:"blur(14px)",border:"1px solid #f1f5f9",borderRadius:14,overflow:"hidden"}}>
        {loading?(
          <div style={{padding:40,textAlign:"center"}}>
            <RefreshCw style={{width:28,height:28,color:"rgba(255,255,255,0.3)",animation:"spin 1s linear infinite",display:"block",margin:"0 auto 10px"}}/>
            <p style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>Loading audit trail...</p>
          </div>
        ):(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:"rgba(10,25,70,0.9)"}}>
                  {["#","Date & Time","User","Action","Module","Record ID","IP Address","Details"].map(h=>(
                    <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:9,fontWeight:800,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:"0.07em",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.length===0?(
                  <tr><td colSpan={8} style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)"}}>No audit records found</td></tr>
                ):paged.map((l,i)=>{
                  const st=ACTION_STYLE[l.action]||ACTION_STYLE.default;
                  return(
                    <tr key={l.id||i} style={{borderBottom:"1px solid #f8fafc",background:i%2===0?"rgba(255,255,255,0.02)":"transparent"}}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(96,165,250,0.07)"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"rgba(255,255,255,0.02)":"transparent"}>
                      <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.3)"}}>{(page-1)*PAGE_SIZE+i+1}</td>
                      <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.6)",whiteSpace:"nowrap"}}>
                        {l.created_at?new Date(l.created_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):" --"}
                      </td>
                      <td style={{padding:"8px 12px",fontWeight:700,color:"rgba(255,255,255,0.85)",whiteSpace:"nowrap"}}>{l.user_name||"System"}</td>
                      <td style={{padding:"8px 12px"}}>
                        <span style={{padding:"2px 8px",borderRadius:20,fontSize:10,fontWeight:700,textTransform:"capitalize",background:st.bg,color:st.color}}>{l.action||" --"}</span>
                      </td>
                      <td style={{padding:"8px 12px",color:"rgba(255,255,255,0.6)",textTransform:"capitalize"}}>{l.module||" --"}</td>
                      <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.4)"}}>{l.record_id?l.record_id.slice(0,12)+"...":" --"}</td>
                      <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:10,color:"rgba(255,255,255,0.4)"}}>{l.ip_address||" --"}</td>
                      <td style={{padding:"8px 12px",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"rgba(255,255,255,0.35)"}}>
                        {l.details?JSON.stringify(l.details).slice(0,60):" --"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages>1&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",borderTop:"1px solid #e2e8f0"}}>
            <span style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>Showing {(page-1)*PAGE_SIZE+1}-{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</span>
            <div style={{display:"flex",gap:4}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{padding:"4px 10px",background:"#e2e8f0",border:"1px solid #e2e8f0",color:"rgba(255,255,255,0.6)",borderRadius:6,cursor:"pointer",fontSize:12,opacity:page===1?0.4:1}}></button>
              <span style={{padding:"4px 10px",background:"rgba(96,165,250,0.2)",border:"1px solid rgba(96,165,250,0.3)",color:"#93c5fd",borderRadius:6,fontSize:12,fontWeight:700}}>{page}/{totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{padding:"4px 10px",background:"#e2e8f0",border:"1px solid #e2e8f0",color:"rgba(255,255,255,0.6)",borderRadius:6,cursor:"pointer",fontSize:12,opacity:page===totalPages?0.4:1}}></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
