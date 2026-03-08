import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, ArrowRight, Plus, ClipboardCheck } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

export default function QualityDashboardPage() {
  const navigate = useNavigate();
  const { data: inspections, refetch: ri } = useRealtimeTable("inspections",     { order: { column: "created_at" } });
  const { data: ncrs,        refetch: rn } = useRealtimeTable("non_conformance", { order: { column: "created_at" } });

  const insp    = inspections as any[];
  const ncrList = ncrs as any[];

  const passed      = insp.filter(i => i.result === "pass").length;
  const failed      = insp.filter(i => i.result === "fail").length;
  const pending     = insp.filter(i => i.result === "pending").length;
  const conditional = insp.filter(i => i.result === "conditional").length;
  const passRate    = insp.length > 0 ? Math.round(passed / insp.length * 100) : 0;

  const openNCR      = ncrList.filter(n => n.status === "open").length;
  const reviewNCR    = ncrList.filter(n => n.status === "under_review").length;
  const closedNCR    = ncrList.filter(n => n.status === "closed").length;
  const criticalNCR  = ncrList.filter(n => n.severity === "critical").length;

  const refetch = () => { ri(); rn(); };

  const recentInsp = insp.slice(0, 8);
  const recentNCR  = ncrList.slice(0, 5);

  const RC: Record<string,{bg:string,color:string}> = {
    pass:        {bg:"#d1fae5",color:"#065f46"},
    fail:        {bg:"#fee2e2",color:"#991b1b"},
    conditional: {bg:"#fef3c7",color:"#92400e"},
    pending:     {bg:"#f3f4f6",color:"#374151"},
  };
  const NS: Record<string,{bg:string,color:string}> = {
    open:         {bg:"#fee2e2",color:"#991b1b"},
    under_review: {bg:"#fef3c7",color:"#92400e"},
    closed:       {bg:"#d1fae5",color:"#065f46"},
    escalated:    {bg:"#ede9fe",color:"#5b21b6"},
  };

  return (
    <div style={{background:"transparent",minHeight:"calc(100vh-100px)",fontFamily:"'Segoe UI',system-ui"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(90deg,#134e4a,#0f766e)",padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{color:"#fff",fontWeight:900,fontSize:15,margin:0}}>Quality Control Dashboard</h1>
          <p style={{color:"rgba(255,255,255,0.5)",fontSize:10,margin:"2px 0 0"}}>{insp.length} inspections · {ncrList.length} NCRs</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={refetch} style={{background:"rgba(255,255,255,0.15)",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer"}}>
            <RefreshCw style={{width:12,height:12,display:"inline",marginRight:6}}/>Refresh
          </button>
          <button onClick={()=>navigate("/quality/inspections")} style={{background:"rgba(255,255,255,0.92)",color:"#134e4a",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            <Plus style={{width:12,height:12,display:"inline",marginRight:4}}/>New Inspection
          </button>
          <button onClick={()=>navigate("/quality/non-conformance")} style={{background:"#ef4444",color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            <Plus style={{width:12,height:12,display:"inline",marginRight:4}}/>Raise NCR
          </button>
        </div>
      </div>

      <div style={{padding:16,display:"flex",flexDirection:"column",gap:16}}>
        {/* KPI Row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            {label:"Pass Rate",    value:`${passRate}%`,   color:"#107c10", icon:CheckCircle, sub:`${passed} of ${insp.length} passed`},
            {label:"Failed",       value:String(failed),   color:"#dc2626", icon:XCircle,     sub:`${conditional} conditional`},
            {label:"Pending QC",   value:String(pending),  color:"#d97706", icon:Clock,       sub:"awaiting inspection"},
            {label:"Open NCRs",    value:String(openNCR),  color:criticalNCR>0?"#dc2626":"#d97706", icon:AlertTriangle, sub:`${criticalNCR} critical`},
          ].map(k => (
            <div key={k.label} style={{background:"rgba(255,255,255,0.92)",borderRadius:10,padding:"14px 16px",border:"1px solid #edebe9",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,fontWeight:700,color:"#605e5c",textTransform:"uppercase",letterSpacing:"0.05em"}}>{k.label}</span>
                <div style={{width:28,height:28,borderRadius:6,background:`${k.color}15`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <k.icon style={{width:14,height:14,color:k.color}}/>
                </div>
              </div>
              <div style={{fontSize:22,fontWeight:900,color:k.color,lineHeight:1}}>{k.value}</div>
              <div style={{fontSize:10,color:"#a19f9d",marginTop:4}}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Two column layout */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 380px",gap:16}}>
          {/* Recent Inspections */}
          <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,border:"1px solid #edebe9",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
            <div style={{padding:"10px 16px",background:"#134e4a",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{color:"#fff",fontWeight:800,fontSize:12}}>Recent Inspections</span>
              <button onClick={()=>navigate("/quality/inspections")} style={{color:"rgba(255,255,255,0.7)",background:"none",border:"none",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                View all <ArrowRight style={{width:12,height:12}}/>
              </button>
            </div>
            <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
              <thead><tr style={{background:"transparent"}}>
                {["Insp. No.","Item","Supplier","Qty Accepted","Qty Rejected","Result"].map(h=>(
                  <th key={h} style={{padding:"8px 14px",textAlign:"left",fontWeight:700,color:"#605e5c",fontSize:10,borderBottom:"1px solid #edebe9"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {recentInsp.length===0 ? (
                  <tr><td colSpan={6} style={{padding:"24px",textAlign:"center",color:"#a19f9d"}}>No inspections recorded</td></tr>
                ) : recentInsp.map((r:any,i:number)=>{
                  const rc = RC[r.result]||RC.pending;
                  return (
                    <tr key={r.id} style={{background:i%2===0?"#fff":"#f9fffe",borderBottom:"1px solid #f3f2f1",cursor:"pointer"}}
                      onClick={()=>navigate("/quality/inspections")}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#f0fdf4"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"#fff":"#f9fffe"}>
                      <td style={{padding:"8px 14px",fontWeight:700,color:"#134e4a"}}>{r.inspection_number}</td>
                      <td style={{padding:"8px 14px",color:"#323130"}}>{r.item_name||"—"}</td>
                      <td style={{padding:"8px 14px",color:"#605e5c"}}>{r.supplier_name||"—"}</td>
                      <td style={{padding:"8px 14px",color:"#107c10",fontWeight:600}}>{r.quantity_accepted??0}</td>
                      <td style={{padding:"8px 14px",color:"#dc2626",fontWeight:600}}>{r.quantity_rejected??0}</td>
                      <td style={{padding:"8px 14px"}}>
                        <span style={{background:rc.bg,color:rc.color,padding:"2px 8px",borderRadius:3,fontSize:10,fontWeight:600,textTransform:"capitalize"}}>{r.result}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* NCR Sidebar */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {/* NCR Stats */}
            <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,border:"1px solid #edebe9",overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 16px",background:"#92400e"}}>
                <span style={{color:"#fff",fontWeight:800,fontSize:12}}>NCR Summary</span>
              </div>
              <div style={{padding:14,display:"flex",flexDirection:"column",gap:8}}>
                {[
                  {label:"Open",       count:openNCR,   color:"#dc2626"},
                  {label:"Under Review",count:reviewNCR, color:"#d97706"},
                  {label:"Closed",     count:closedNCR, color:"#107c10"},
                  {label:"Critical",   count:criticalNCR,color:"#7c3aed"},
                ].map(s=>(
                  <div key={s.label} style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:11,color:"#605e5c"}}>{s.label}</span>
                    <span style={{fontSize:13,fontWeight:800,color:s.color}}>{s.count}</span>
                  </div>
                ))}
                <button onClick={()=>navigate("/quality/non-conformance")}
                  style={{marginTop:4,background:"#92400e",color:"#fff",border:"none",borderRadius:7,padding:"7px",fontSize:11,fontWeight:700,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                  Manage NCRs <ArrowRight style={{width:12,height:12}}/>
                </button>
              </div>
            </div>

            {/* Recent NCRs */}
            <div style={{background:"rgba(255,255,255,0.92)",borderRadius:10,border:"1px solid #edebe9",overflow:"hidden",flex:1,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{padding:"10px 16px",background:"#6b7280"}}>
                <span style={{color:"#fff",fontWeight:800,fontSize:12}}>Recent NCRs</span>
              </div>
              <div style={{padding:"4px 0"}}>
                {recentNCR.length===0 ? (
                  <p style={{padding:"16px",color:"#a19f9d",fontSize:11,textAlign:"center"}}>No non-conformances raised</p>
                ) : recentNCR.map((n:any)=>{
                  const ns = NS[n.status]||NS.open;
                  return (
                    <div key={n.id} style={{padding:"10px 14px",borderBottom:"1px solid #f3f2f1",cursor:"pointer"}}
                      onClick={()=>navigate("/quality/non-conformance")}
                      onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="#faf9f8"}
                      onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background="transparent"}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:10,fontWeight:700,color:"#92400e"}}>{n.ncr_number}</span>
                        <span style={{background:ns.bg,color:ns.color,padding:"1px 6px",borderRadius:3,fontSize:9,fontWeight:600,textTransform:"capitalize"}}>{n.status?.replace(/_/g," ")}</span>
                      </div>
                      <div style={{fontSize:11,color:"#323130",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.title}</div>
                      <div style={{fontSize:10,color:"#a19f9d"}}>{n.severity} severity</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
