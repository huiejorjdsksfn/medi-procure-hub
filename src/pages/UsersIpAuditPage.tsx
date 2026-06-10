import type React from "react";
/**
 * EL5 MediProcure — Users & IP Audit v10
 * Classic ERP style
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ERP, erpStyles } from "@/lib/erpTheme";

const db = supabase as any;

interface AuditLog {
  id: string; user_id?: string; user_email?: string; action: string;
  ip_address?: string; user_agent?: string; details?: any;
  created_at: string; resource_type?: string; resource_id?: string;
}
interface UserProfile {
  id: string; email?: string; full_name?: string; department?: string;
  is_active?: boolean; last_sign_in_at?: string; created_at?: string; roles?: string[];
}

function fmtDate(s: string) { if(!s) return "—"; return new Date(s).toLocaleDateString("en-KE",{day:"2-digit",month:"2-digit",year:"numeric"}); }
function fmtDateTime(s: string) { if(!s) return "—"; return new Date(s).toLocaleString("en-KE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }
function StatusChip({ status }: { status: string }) { return <span style={erpStyles.statusChip(status)}>{status}</span>; }

type AuditTab = "activity"|"users"|"ip_audit";

export default function UsersIpAuditPage() {
  const [tab, setTab] = useState<AuditTab>("activity");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [dateFrom] = useState("2025-01-01");
  const [dateTo] = useState(new Date().toISOString().split("T")[0]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, usersRes] = await Promise.allSettled([
        db.from("audit_logs").select("*").order("created_at",{ascending:false}).limit(200),
        db.from("profiles").select("*").order("created_at",{ascending:false}).limit(100),
      ]);
      setAuditLogs(logsRes.status==="fulfilled" ? (logsRes.value.data||[]) : []);
      setUsers(usersRes.status==="fulfilled" ? (usersRes.value.data||[]) : []);
    } catch(e){ console.error(e); }
    setLoading(false);
  }, []);

  useEffect(()=>{ fetchAll(); },[fetchAll]);

  function exportCSV() {
    const rows = ["User,Action,IP Address,Resource,Date",
      ...filteredLogs.map(l=>`${l.user_email||l.user_id||""},${l.action||""},${l.ip_address||""},${l.resource_type||""},${fmtDateTime(l.created_at)}`)
    ];
    const blob = new Blob([rows.join("\n")],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="audit_log.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({title:"✓ Exported"});
  }

  const filteredLogs = auditLogs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !search || [l.user_email,l.action,l.ip_address,l.resource_type].some(f=>f?.toLowerCase().includes(q));
    const matchAction = actionFilter==="ALL" || l.action?.toLowerCase().includes(actionFilter.toLowerCase());
    return matchSearch && matchAction;
  });

  // Unique IPs
  const uniqueIPs = [...new Set(auditLogs.map(l=>l.ip_address).filter(Boolean))];
  const ipStats = uniqueIPs.map(ip => ({
    ip,
    count: auditLogs.filter(l=>l.ip_address===ip).length,
    lastSeen: auditLogs.find(l=>l.ip_address===ip)?.created_at||"",
    users: [...new Set(auditLogs.filter(l=>l.ip_address===ip).map(l=>l.user_email||l.user_id))].filter(Boolean),
  })).sort((a,b)=>b.count-a.count);

  const kpiData = [
    {label:"AUDIT RECORDS",val:auditLogs.length},
    {label:"UNIQUE IPs",val:uniqueIPs.length},
    {label:"ACTIVE USERS",val:users.filter(u=>u.is_active!==false).length},
    {label:"TOTAL USERS",val:users.length},
    {label:"TODAY'S ACTIONS",val:auditLogs.filter(l=>new Date(l.created_at).toDateString()===new Date().toDateString()).length},
  ];

  const TABS = [
    {id:"activity" as AuditTab,label:"📋 User Activity"},
    {id:"users" as AuditTab,label:"👥 Users"},
    {id:"ip_audit" as AuditTab,label:"🌐 IP Audit"},
  ];

  const inp: React.CSSProperties = { ...erpStyles.inp };

  return (
    <div style={{ background:"#f0f0f0", minHeight:"100vh", fontFamily:ERP.fontFamily, fontSize:12 }}>
      {/* Title */}
      <div style={{ background:ERP.titleBar, color:"#fff", padding:"5px 10px", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:`1px solid ${ERP.titleBarBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:14 }}>🔐</span>
          <div>
            <div>EL5 MediProcure — Users &amp; IP Audit</div>
            <div style={{ fontSize:10, fontWeight:400, opacity:.85 }}>Embu Level 5 Hospital · Security &amp; Access Control</div>
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
          <span style={{ fontWeight:700, fontSize:11, color:"#1a3580" }}>Security &amp; Audit</span>
        </div>
        <button onClick={fetchAll} style={erpStyles.btn(false)}>↻ Refresh</button>
        <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ ...erpStyles.btn(tab===t.id), background:tab===t.id?ERP.tabActive:ERP.tabInactive, color:tab===t.id?"#fff":"#333", border:`1px solid ${tab===t.id?ERP.tabActiveBorder:ERP.toolbarBorder}` }}>
              {t.label}
            </button>
          ))}
          <button onClick={exportCSV} style={erpStyles.btn(false)}>- Export</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display:"flex", borderBottom:"1px solid #aaa" }}>
        {kpiData.map((k,i)=>(
          <div key={i} style={{ flex:1, padding:"10px 16px", borderRight:i<kpiData.length-1?"1px solid #aaa":"none", background:"#fff" }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
              <span style={{ color:"#c0392b", fontWeight:700, fontSize:11 }}>-</span>
              <span style={{ fontWeight:800, fontSize:20, color:"#1a1a1a" }}>{k.val}</span>
            </div>
            <div style={{ fontSize:10, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin:"6px 8px" }}>

        {/* Activity Tab */}
        {tab==="activity" && (
          <div>
            <div style={{ background:"#f5f5f5", border:"1px solid #ccc", padding:"5px 10px", marginBottom:4, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <span style={{ fontWeight:700, fontSize:11, color:"#555" }}>User Activity Log — Filter & Extract</span>
              <div style={{ display:"flex", gap:4 }}>
                <span style={{ fontSize:11 }}>Search:</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter by user, action, IP..." style={{ ...inp, width:220, fontSize:11 }}/>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <span style={{ fontSize:11 }}>Action:</span>
                <select value={actionFilter} onChange={e=>setActionFilter(e.target.value)} style={{ ...inp, fontSize:11 }}>
                  {["ALL","login","logout","create","update","delete","view","approve","reject"].map(a=><option key={a}>{a}</option>)}
                </select>
              </div>
              <span style={{ marginLeft:"auto", fontSize:11, color:"#888" }}>{filteredLogs.length} records</span>
              <button onClick={exportCSV} style={erpStyles.btn(true)}>Extract →</button>
            </div>

            <div style={{ background:"#fff", border:"1px solid #ccc", maxHeight:"calc(100vh - 240px)", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead style={{ position:"sticky", top:0, zIndex:10 }}>
                  <tr>
                    {["Date/Time","User","Action","IP Address","Resource","Details"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{ padding:30, textAlign:"center" }}>Loading...</td></tr> :
                  filteredLogs.map((l,i)=>(
                    <tr key={l.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11, color:"#555", whiteSpace:"nowrap" }}>{fmtDateTime(l.created_at)}</td>
                      <td style={erpStyles.gridTd}>{l.user_email||l.user_id?.slice(0,12)||"system"}</td>
                      <td style={erpStyles.gridTd}><StatusChip status={l.action}/></td>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontSize:11 }}>{l.ip_address||"—"}</td>
                      <td style={{ ...erpStyles.gridTd, fontSize:11 }}>{l.resource_type||"—"}{l.resource_id?" · "+l.resource_id.slice(-6):""}</td>
                      <td style={{ ...erpStyles.gridTd, fontSize:11, color:"#666", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {l.details ? JSON.stringify(l.details).slice(0,80) : "—"}
                      </td>
                    </tr>
                  ))}
                  {!loading && filteredLogs.length===0 && <tr><td colSpan={6} style={{ padding:30, textAlign:"center", color:"#888" }}>No audit records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab==="users" && (
          <div style={{ background:"#fff", border:"1px solid #ccc" }}>
            <div style={{ background:ERP.sidebarHeader, color:"#fff", padding:"5px 10px", fontSize:11, fontWeight:700 }}>👥 System Users</div>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                {["Full Name","Email","Department","Roles","Status","Last Login","Joined"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ padding:30, textAlign:"center" }}>Loading...</td></tr> :
                users.map((u,i)=>(
                  <tr key={u.id} style={{ background:i%2===0?"#fff":"#f7f7f7" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                    <td style={{ ...erpStyles.gridTd, fontWeight:600 }}>{u.full_name||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, color:"#2255cc" }}>{u.email||"—"}</td>
                    <td style={erpStyles.gridTd}>{u.department||"—"}</td>
                    <td style={{ ...erpStyles.gridTd, fontSize:11 }}>{(u.roles||[]).join(", ")||"—"}</td>
                    <td style={erpStyles.gridTd}><StatusChip status={u.is_active!==false?"active":"inactive"}/></td>
                    <td style={{ ...erpStyles.gridTd, color:"#555", fontSize:11 }}>{u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : "Never"}</td>
                    <td style={{ ...erpStyles.gridTd, color:"#555", fontSize:11 }}>{fmtDate(u.created_at||"")}</td>
                  </tr>
                ))}
                {!loading && users.length===0 && <tr><td colSpan={7} style={{ padding:30, textAlign:"center", color:"#888" }}>No users found</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* IP Audit Tab */}
        {tab==="ip_audit" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ background:"#fff", border:"1px solid #ccc" }}>
              <div style={{ background:ERP.sidebarHeader, color:"#fff", padding:"5px 10px", fontSize:11, fontWeight:700 }}>🌐 IP Address Activity</div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr>
                  {["IP Address","Requests","Unique Users","Last Seen"].map(h=><th key={h} style={erpStyles.gridTh}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ipStats.map((ip,i)=>(
                    <tr key={ip.ip} style={{ background:i%2===0?"#fff":"#f7f7f7" }} onMouseEnter={e=>(e.currentTarget.style.background="#dce9ff")} onMouseLeave={e=>(e.currentTarget.style.background=i%2===0?"#fff":"#f7f7f7")}>
                      <td style={{ ...erpStyles.gridTd, fontFamily:"monospace", fontWeight:700, color:"#2255cc" }}>{ip.ip}</td>
                      <td style={{ ...erpStyles.gridTd, fontWeight:700 }}>{ip.count}</td>
                      <td style={erpStyles.gridTd}>{ip.users.length}</td>
                      <td style={{ ...erpStyles.gridTd, fontSize:11, color:"#555" }}>{fmtDateTime(ip.lastSeen)}</td>
                    </tr>
                  ))}
                  {ipStats.length===0 && <tr><td colSpan={4} style={{ padding:20, textAlign:"center", color:"#888" }}>No IP data recorded yet</td></tr>}
                </tbody>
              </table>
            </div>

            <div style={{ background:"#fff", border:"1px solid #ccc", padding:12 }}>
              <div style={{ fontWeight:700, fontSize:12, color:"#1a3580", marginBottom:10, borderBottom:"1px solid #ddd", paddingBottom:6 }}>📊 Access Statistics</div>
              {[
                {label:"Total Log Entries",val:auditLogs.length,col:"#1a1a1a"},
                {label:"Unique IP Addresses",val:uniqueIPs.length,col:"#2255cc"},
                {label:"Today's Events",val:auditLogs.filter(l=>new Date(l.created_at).toDateString()===new Date().toDateString()).length,col:"#cc6600"},
                {label:"Login Events",val:auditLogs.filter(l=>l.action==="login"||l.action?.includes("sign_in")).length,col:"#007700"},
                {label:"Failed Actions",val:auditLogs.filter(l=>l.action?.includes("fail")||l.action?.includes("error")).length,col:"#cc0000"},
              ].map(r=>(
                <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f0f0f0", fontSize:12 }}>
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
        <span>Log Entries: {auditLogs.length}</span>
        <span>|</span>
        <span>Users: {users.length}</span>
        <span>|</span>
        <span>IPs: {uniqueIPs.length}</span>
        <span style={{ marginLeft:"auto" }}>EL5 MediProcure v10 · Users &amp; IP Audit</span>
      </div>
    </div>
  );
}

