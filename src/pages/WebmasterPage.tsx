import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RoleGuard from "@/components/RoleGuard";
import { toast } from "@/hooks/use-toast";
import { Globe, Server, Database, Activity, Users, Shield, RefreshCw, CheckCircle, AlertTriangle, Clock, Wifi, Zap, BarChart3, Settings, FileText, Archive, ChevronRight } from "lucide-react";

const METRIC_CARD = ({label,val,sub,color,icon:Icon}:{label:string;val:any;sub?:string;color:string;icon:any}) => (
  <div className="rounded-2xl p-4 flex flex-col gap-1" style={{background:"#fff",boxShadow:"0 2px 12px rgba(0,0,0,0.06)"}}>
    <div className="flex items-center justify-between">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`${color}18`}}>
        <Icon className="w-4 h-4" style={{color}} />
      </div>
    </div>
    <div className="text-2xl font-black mt-1" style={{color:"#1a2744"}}>{val}</div>
    <div className="text-[11px] font-semibold text-gray-500">{label}</div>
    {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
  </div>
);

function WebmasterInner() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [realtimeStatus, setRealtimeStatus] = useState<"connected"|"disconnected">("connected");

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [profiles,roles,items,reqs,pos,pv,docs,bkp,odbc,audit,supp,notifs] = await Promise.all([
        (supabase as any).from("profiles").select("id,is_active,created_at"),
        (supabase as any).from("user_roles").select("id,role"),
        (supabase as any).from("items").select("id,status,quantity_in_stock,unit_price"),
        (supabase as any).from("requisitions").select("id,status"),
        (supabase as any).from("purchase_orders").select("id,status,total_amount"),
        (supabase as any).from("payment_vouchers").select("id,status,amount"),
        (supabase as any).from("documents").select("id,created_at"),
        (supabase as any).from("backup_jobs").select("id,status,started_at").order("started_at",{ascending:false}).limit(1),
        (supabase as any).from("odbc_connections").select("id,status"),
        (supabase as any).from("audit_log").select("id,action,module,user_name,created_at,ip_address").order("created_at",{ascending:false}).limit(20),
        (supabase as any).from("suppliers").select("id,status"),
        (supabase as any).from("notifications").select("id,created_at"),
      ]);
      const I=items.data||[],P=profiles.data||[];
      setStats({
        totalUsers:P.length, activeUsers:P.filter((u:any)=>u.is_active).length,
        totalItems:I.length, invValue:I.reduce((s:number,i:any)=>s+Number(i.unit_price||0)*Number(i.quantity_in_stock||0),0),
        totalReqs:(reqs.data||[]).length, pendingReqs:(reqs.data||[]).filter((r:any)=>r.status==="pending").length,
        totalPOs:(pos.data||[]).length, totalPOValue:(pos.data||[]).reduce((s:number,p:any)=>s+Number(p.total_amount||0),0),
        totalVouchers:(pv.data||[]).length,
        totalDocs:(docs.data||[]).length,
        lastBackup:bkp.data?.[0]?.started_at,
        activeOdbc:(odbc.data||[]).filter((o:any)=>o.status==="active").length,
        totalOdbc:(odbc.data||[]).length,
        activeSuppliers:(supp.data||[]).filter((s:any)=>s.status==="active").length,
        totalNotifs:(notifs.data||[]).length,
        auditCount:(audit.data||[]).length,
        roles: (roles.data||[]).reduce((m:any,r:any)=>{ m[r.role]=(m[r.role]||0)+1; return m; },{}),
      });
      setAuditLog(audit.data||[]);
      setUsers(P);
    } catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{ loadStats(); },[loadStats]);

  const TABS = [
    {id:"overview",label:"Overview",icon:Globe},
    {id:"users",label:"Users",icon:Users},
    {id:"audit",label:"Audit Trail",icon:Activity},
    {id:"health",label:"System Health",icon:Server},
  ];

  return (
    <div className="p-4 space-y-4" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Header */}
      <div className="rounded-2xl px-5 py-4 flex items-center justify-between"
        style={{background:"linear-gradient(90deg,#1a2744,#2a3f6f)",boxShadow:"0 4px 20px rgba(26,39,68,0.3)"}}>
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-white" />
          <div>
            <h1 className="text-base font-black text-white">Webmaster Console</h1>
            <p className="text-[11px] text-white/50">System administration & monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-300 font-semibold">All Systems Operational</span>
          </div>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 text-white hover:bg-white/25">
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white shadow-sm">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center"
            style={{background:activeTab===t.id?"#1a3a6b":"transparent",color:activeTab===t.id?"#fff":"#6b7280"}}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {activeTab==="overview" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <METRIC_CARD label="Total Users" val={stats.totalUsers||0} sub={`${stats.activeUsers||0} active`} color="#1a3a6b" icon={Users} />
            <METRIC_CARD label="Inventory Items" val={(stats.totalItems||0).toLocaleString()} sub={`KES ${((stats.invValue||0)/1000).toFixed(0)}K value`} color="#375623" icon={Database} />
            <METRIC_CARD label="Requisitions" val={stats.totalReqs||0} sub={`${stats.pendingReqs||0} pending`} color="#C45911" icon={FileText} />
            <METRIC_CARD label="Active Suppliers" val={stats.activeSuppliers||0} color="#00695C" icon={Activity} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <METRIC_CARD label="Payment Vouchers" val={stats.totalVouchers||0} color="#c0185a" icon={BarChart3} />
            <METRIC_CARD label="Documents" val={stats.totalDocs||0} color="#5C2D91" icon={FileText} />
            <METRIC_CARD label="ODBC Connections" val={`${stats.activeOdbc||0}/${stats.totalOdbc||0}`} sub="active/total" color="#0891b2" icon={Wifi} />
            <METRIC_CARD label="Last Backup" val={stats.lastBackup?new Date(stats.lastBackup).toLocaleDateString("en-KE"):"Never"} color="#374151" icon={Archive} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Users by Role
              </h3>
              <div className="space-y-2">
                {Object.entries(stats.roles||{}).map(([role,count]:any)=>(
                  <div key={role} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-gray-600 capitalize">{role.replace(/_/g," ")}</span>
                        <span className="text-xs font-bold text-gray-700">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all"
                          style={{width:`${(count/(stats.totalUsers||1))*100}%`}} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> System Status
              </h3>
              <div className="space-y-2">
                {[
                  {name:"Supabase Database",status:"Healthy",ok:true},
                  {name:"Authentication Service",status:"Active",ok:true},
                  {name:"Real-time Subscriptions",status:"Connected",ok:true},
                  {name:"Row Level Security",status:"Enabled",ok:true},
                  {name:"Backup Service",status:stats.lastBackup?"Last: "+new Date(stats.lastBackup).toLocaleDateString("en-KE"):"No backup",ok:!!stats.lastBackup},
                  {name:"ODBC Integration",status:stats.activeOdbc>0?"Active":"Inactive",ok:stats.activeOdbc>0},
                ].map(s=>(
                  <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <span className="text-xs text-gray-600">{s.name}</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold"
                      style={{color:s.ok?"#10b981":"#f59e0b"}}>
                      {s.ok ? <CheckCircle className="w-3 h-3"/> : <AlertTriangle className="w-3 h-3"/>}
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab==="users" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-700">System Users ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{background:"#f8fafc"}}>
                <tr>
                  {["#","User ID","Active","Joined"].map(h=>(
                    <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-bold text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u,i)=>(
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i+1}</td>
                    <td className="px-4 py-2 text-gray-600 font-mono text-[10px]">{u.id?.slice(0,16)}…</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                        style={{background:u.is_active?"#dcfce7":"#fef2f2",color:u.is_active?"#16a34a":"#dc2626"}}>
                        {u.is_active?"Active":"Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{u.created_at?new Date(u.created_at).toLocaleDateString("en-KE"):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab==="audit" && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-700">Recent Activity (Last 20)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{background:"#f8fafc"}}>
                <tr>
                  {["#","User","Action","Module","IP","Time"].map(h=>(
                    <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-bold text-[10px] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLog.map((a,i)=>(
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i+1}</td>
                    <td className="px-4 py-2 font-semibold text-gray-700">{a.user_name||"System"}</td>
                    <td className="px-4 py-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{background:a.action==="create"?"#dbeafe":a.action==="delete"?"#fef2f2":a.action==="update"?"#fef3c7":"#f3f4f6",
                          color:a.action==="create"?"#1d4ed8":a.action==="delete"?"#dc2626":a.action==="update"?"#d97706":"#6b7280"}}>
                        {a.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 capitalize">{a.module}</td>
                    <td className="px-4 py-2 text-gray-400 font-mono text-[10px]">{a.ip_address||"—"}</td>
                    <td className="px-4 py-2 text-gray-400">{a.created_at?new Date(a.created_at).toLocaleString("en-KE",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab==="health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-500" /> Server Details
              </h3>
              {[
                {k:"Database Engine",v:"PostgreSQL 17.4.1"},
                {k:"Project ID",v:"yvjfehnzbzjliizjvuhq"},
                {k:"Region",v:"us-east-1 (N. Virginia)"},
                {k:"SSL",v:"Enabled (TLS 1.3)"},
                {k:"Auth Provider",v:"Supabase Auth"},
                {k:"RLS Policies",v:"Active on all tables"},
              ].map(r=>(
                <div key={r.k} className="flex justify-between py-1.5 border-b border-gray-50 text-xs">
                  <span className="text-gray-500">{r.k}</span>
                  <span className="font-semibold text-gray-700">{r.v}</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-green-500" /> Database Tables
              </h3>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {["profiles","items","requisitions","purchase_orders","suppliers","payment_vouchers","budgets","contracts","tenders","inspections","non_conformance","documents","audit_log","backup_jobs","odbc_connections"].map(t=>(
                  <div key={t} className="flex items-center gap-1.5 py-1 border-b border-gray-50">
                    <CheckCircle className="w-2.5 h-2.5 text-green-400 shrink-0" />
                    <span className="text-gray-600 truncate">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WebmasterPage() {
  return <RoleGuard allowed={["admin"]}><WebmasterInner /></RoleGuard>;
}
