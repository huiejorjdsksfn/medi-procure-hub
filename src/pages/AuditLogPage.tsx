<<<<<<< HEAD
import { useState } from "react";
import { Search, Plus, Download, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AuditLogPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete audit trail of all system activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
          <Button size="sm" className="bg-slate-600 hover:bg-slate-700 text-white">
            <Plus className="w-4 h-4 mr-2" />New Audit Log
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search audit log..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter</Button>
          <Button variant="outline" size="sm"><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Timestamp</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">User</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Module</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Action</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Record</th> <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No records found. Click "New Audit Log" to get started.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
=======
import { useEffect, useState } from "react";
import { db } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, Search, FileText } from "lucide-react";
import { exportToPDF } from "@/lib/export";

const AuditLogPage = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");
  const [filterAction, setFilterAction] = useState("all");

  useEffect(() => { if (hasRole("admin")) fetchLogs(); }, []);

  const fetchLogs = async () => {
    const { data } = await (db as any).from("audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    setLogs(data || []);
  };

  if (!hasRole("admin")) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Admin access required</p></div>;

  const modules = [...new Set(logs.map(l => l.module))];
  const actions = [...new Set(logs.map(l => l.action))];
  const filtered = logs.filter(l => {
    const ms = (l.user_name || "").toLowerCase().includes(search.toLowerCase()) || (l.record_id || "").toLowerCase().includes(search.toLowerCase());
    return ms && (filterModule === "all" || l.module === filterModule) && (filterAction === "all" || l.action === filterAction);
  });

  const actionColor = (a: string) => a.includes("create") || a.includes("approve") ? "bg-emerald-500/10 text-emerald-600" : a.includes("reject") || a.includes("delete") || a.includes("deactivate") ? "bg-red-500/10 text-red-600" : a.includes("update") ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="w-6 h-6" /> Audit Trail</h1>
        <Button size="sm" variant="outline" onClick={() => exportToPDF(filtered.map(l => ({ user: l.user_name, action: l.action, module: l.module, record: l.record_id, details: JSON.stringify(l.details) })), "Audit Trail", ["user","action","module","record"])}><Download className="w-4 h-4 mr-1" /> PDF</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by user or record..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Modules</SelectItem>{modules.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Actions</SelectItem>{actions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="border border-border rounded-lg overflow-auto bg-card">
        <Table>
          <TableHeader><TableRow className="bg-muted/50">
            <TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Module</TableHead><TableHead>Record</TableHead><TableHead>Details</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No logs</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="data-table-row">
                <TableCell className="font-medium">{l.user_name || "—"}</TableCell>
                <TableCell><span className={`text-xs px-2 py-1 rounded-full capitalize ${actionColor(l.action)}`}>{l.action}</span></TableCell>
                <TableCell className="capitalize">{l.module}</TableCell>
                <TableCell className="font-mono text-xs">{l.record_id ? l.record_id.substring(0,8)+"…" : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{l.details ? JSON.stringify(l.details).substring(0,60) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} log(s)</p>
    </div>
  );
};

export default AuditLogPage;
>>>>>>> origin/main
