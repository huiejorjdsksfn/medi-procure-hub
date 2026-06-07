/**
 * Users & IP Audit — unified search/filter/export over audit_log + ip_access_log + profiles
 * Filters: user, IP, date range, action/module. CSV + PDF export. Human-readable names only.
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { safeFetch } from "@/lib/safeFetch";
import { T } from "@/lib/theme";
import { Search, Download, Printer, RefreshCw, Filter, Users, Globe, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Row = {
  kind: "audit" | "ip";
  id: string;
  when: string;
  user: string;
  ip: string;
  action: string;
  module: string;
  details: string;
};

const card: React.CSSProperties = { background:T.card, border:`1px solid ${T.border}`, borderRadius:T.rLg, padding:16 };
const inp: React.CSSProperties  = { background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"7px 10px", color:T.fg, fontSize:13, outline:"none" };
const btn = (bg:string,fg="#fff"):React.CSSProperties => ({ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", background:bg, color:fg, border:"none", borderRadius:T.r, fontSize:12, fontWeight:700, cursor:"pointer" });

export default function UsersIpAuditPage() {
  const [rows, setRows]   = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ]         = useState("");
  const [userF, setUserF] = useState("");
  const [ipF, setIpF]     = useState("");
  const [from, setFrom]   = useState("");
  const [to, setTo]       = useState("");
  const [page, setPage]   = useState(1);
  const PAGE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const db = supabase as any;
    const [pRes, aRes, iRes] = await Promise.all([
      safeFetch(() => db.from("profiles").select("id,full_name,email,username").limit(2000), { timeoutMs:7000, label:"profiles" }),
      safeFetch(() => db.from("audit_log").select("id,user_id,user_name,action,module,details,ip_address,created_at").order("created_at",{ascending:false}).limit(1000), { timeoutMs:8000, label:"audit_log" }),
      safeFetch(() => db.from("ip_access_log").select("id,user_id,user_email,ip_address,allowed,reason,country,city,user_agent,path,created_at").order("created_at",{ascending:false}).limit(1000), { timeoutMs:8000, label:"ip_access" }),
    ]);
    const pMap: Record<string,string> = {};
    (pRes.data || []).forEach((p:any) => { pMap[p.id] = p.full_name || p.username || p.email || "Unknown User"; });
    setProfiles(pMap);
    const audit: Row[] = (aRes.data || []).map((r:any) => ({
      kind:"audit", id:r.id, when:r.created_at,
      user: r.user_name || pMap[r.user_id] || "System",
      ip: r.ip_address || "—",
      action: r.action || "—",
      module: r.module || "—",
      details: typeof r.details === "object" ? JSON.stringify(r.details).slice(0,160) : String(r.details||""),
    }));
    const ips: Row[] = (iRes.data || []).map((r:any) => ({
      kind:"ip", id:r.id, when:r.created_at,
      user: r.user_email || pMap[r.user_id] || "Anonymous",
      ip: r.ip_address || "—",
      action: r.allowed ? "access_allowed" : "access_blocked",
      module: "network",
      details: [r.country, r.city, r.path, r.reason].filter(Boolean).join(" · "),
    }));
    const all = [...audit, ...ips].sort((a,b) => (b.when||"").localeCompare(a.when||""));
    setRows(all);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const fromT = from ? new Date(from).getTime() : 0;
    const toT   = to   ? new Date(to).getTime() + 86399000 : Infinity;
    return rows.filter(r => {
      const t = new Date(r.when).getTime();
      if (t < fromT || t > toT) return false;
      if (userF && !r.user.toLowerCase().includes(userF.toLowerCase())) return false;
      if (ipF && !r.ip.toLowerCase().includes(ipF.toLowerCase())) return false;
      if (qq) {
        const hay = `${r.user} ${r.ip} ${r.action} ${r.module} ${r.details}`.toLowerCase();
        if (!hay.includes(qq)) return false;
      }
      return true;
    });
  }, [rows, q, userF, ipF, from, to]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page-1)*PAGE, page*PAGE);
  useEffect(() => { setPage(1); }, [q, userF, ipF, from, to]);

  const csv = () => {
    const head = ["When","User","IP","Action","Module","Details"];
    const lines = [head.join(",")].concat(filtered.map(r =>
      [r.when, r.user, r.ip, r.action, r.module, r.details].map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")
    ));
    const blob = new Blob([lines.join("\n")], { type:"text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `users-ip-audit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast({ title:"CSV exported", description:`${filtered.length} rows` });
  };

  const printPdf = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = `<html><head><title>Users & IP Audit</title>
      <style>body{font-family:Inter,Arial;color:#000;padding:24px}h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #ccc;padding:5px 7px;text-align:left;vertical-align:top}th{background:#f3f4f6}</style>
    </head><body>
      <h1>Users & IP Audit Report</h1>
      <div style="font-size:11px;margin-bottom:8px">Filters: user="${userF||"*"}", ip="${ipF||"*"}", date=${from||"*"}→${to||"*"}, q="${q||"*"}" — ${filtered.length} rows</div>
      <table><thead><tr><th>When</th><th>User</th><th>IP</th><th>Action</th><th>Module</th><th>Details</th></tr></thead>
      <tbody>${filtered.slice(0,2000).map(r=>`<tr><td>${new Date(r.when).toLocaleString()}</td><td>${r.user}</td><td>${r.ip}</td><td>${r.action}</td><td>${r.module}</td><td>${r.details}</td></tr>`).join("")}</tbody></table>
    </body></html>`;
    w.document.write(html); w.document.close();
    setTimeout(()=>w.print(), 350);
  };

  const resetSession = async (email: string) => {
    if (!email || !confirm(`Force re-login for ${email}? They will be signed out everywhere.`)) return;
    const { error } = await (supabase as any).from("audit_log").insert({
      action:"force_session_reset", module:"admin", user_name:email,
      details:{ target:email, requested_at:new Date().toISOString() },
    });
    if (error) toast({ title:"Failed", description:error.message, variant:"destructive" });
    else toast({ title:"Session reset requested", description:`${email} will need to re-login on next request` });
  };

  return (
    <div style={{ padding:24, background:T.bg, minHeight:"100vh" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.fg, margin:0 }}>Users & IP Audit</h1>
          <p style={{ fontSize:12, color:T.fgMuted, margin:"4px 0 0" }}>Unified search across audit log and IP access log</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button style={btn(T.bg2, T.fgMuted)} onClick={load}><RefreshCw size={14}/> Refresh</button>
          <button style={btn(T.primary)} onClick={csv}><Download size={14}/> CSV</button>
          <button style={btn(T.success)} onClick={printPdf}><Printer size={14}/> Print / PDF</button>
        </div>
      </div>

      <div style={{ ...card, marginBottom:14 }}>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 1fr", gap:10 }}>
          <div style={{ position:"relative" }}>
            <Search size={14} style={{ position:"absolute", left:9, top:10, color:T.fgDim }}/>
            <input style={{ ...inp, paddingLeft:28, width:"100%" }} placeholder="Search anything…" value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <input style={inp} placeholder="User contains…" value={userF} onChange={e=>setUserF(e.target.value)}/>
          <input style={inp} placeholder="IP contains…" value={ipF} onChange={e=>setIpF(e.target.value)}/>
          <input style={inp} type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
          <input style={inp} type="date" value={to}   onChange={e=>setTo(e.target.value)}/>
        </div>
      </div>

      <div style={card}>
        {loading ? (
          <div style={{ padding:40, textAlign:"center", color:T.fgMuted }}>
            <RefreshCw size={20} style={{ animation:"spin 1s linear infinite" }}/>
            <div style={{ marginTop:8, fontSize:13 }}>Loading audit data…</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, color:"#000" }}>
                <thead>
                  <tr style={{ background:T.bg2, color:T.fg, textAlign:"left" }}>
                    <th style={{ padding:"8px 10px" }}>When</th>
                    <th style={{ padding:"8px 10px" }}>User</th>
                    <th style={{ padding:"8px 10px" }}>IP</th>
                    <th style={{ padding:"8px 10px" }}>Action</th>
                    <th style={{ padding:"8px 10px" }}>Module</th>
                    <th style={{ padding:"8px 10px" }}>Details</th>
                    <th style={{ padding:"8px 10px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr key={r.kind+r.id} style={{ borderTop:`1px solid ${T.border}` }}>
                      <td style={{ padding:"7px 10px", color:"#111", whiteSpace:"nowrap" }}>{new Date(r.when).toLocaleString()}</td>
                      <td style={{ padding:"7px 10px", color:"#111", fontWeight:600 }}>{r.user}</td>
                      <td style={{ padding:"7px 10px", color:"#111", fontFamily:"monospace" }}>{r.ip}</td>
                      <td style={{ padding:"7px 10px", color:r.action.includes("block")||r.action.includes("fail")?"#b91c1c":"#111" }}>{r.action}</td>
                      <td style={{ padding:"7px 10px", color:"#444" }}>{r.module}</td>
                      <td style={{ padding:"7px 10px", color:"#444", maxWidth:380, overflow:"hidden", textOverflow:"ellipsis" }}>{r.details}</td>
                      <td style={{ padding:"7px 10px" }}>
                        <button style={btn(T.warning)} onClick={()=>resetSession(r.user)}>Reset</button>
                      </td>
                    </tr>
                  ))}
                  {!pageRows.length && (
                    <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:T.fgMuted }}>No records match filters</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:12, fontSize:12, color:T.fgMuted }}>
              <span>{filtered.length} rows · Page {page} of {totalPages}</span>
              <div style={{ display:"flex", gap:6 }}>
                <button style={btn(T.bg2, T.fgMuted)} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
                <button style={btn(T.bg2, T.fgMuted)} disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}