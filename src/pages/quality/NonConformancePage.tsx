import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import { Plus, Search, AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";

const genNo = () => { const d=new Date(); return `NCR/EL5H/${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"00")}/${Math.floor(10+Math.random()*990)}`; };
const severityColor = (s:string)=>({minor:"text-amber-700 border-amber-200 bg-amber-50",major:"text-orange-700 border-orange-200 bg-orange-50",critical:"text-red-700 border-red-200 bg-red-50"}[s]??"text-slate-600 border-slate-200");
const statusColor = (s:string)=>({open:"text-red-700 border-red-200 bg-red-50",under_review:"text-amber-700 border-amber-200 bg-amber-50",resolved:"text-green-700 border-green-200 bg-green-50",closed:"text-slate-600 border-slate-200 bg-slate-50"}[s]??"text-slate-600 border-slate-200");

export default function NonConformancePage() {
  const { user, profile, hasRole } = useAuth();
  const canResolve = hasRole("admin") || hasRole("procurement_manager");
  const [ncrs, setNcrs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [detail, setDetail] = useState<any>(null);
  const [corrAction, setCorrAction] = useState("");
  const [form, setForm] = useState({supplier_id:"",item_name:"",issue_description:"",severity:"minor",root_cause:""});

  useEffect(()=>{ fetchAll(); },[]);
  useEffect(()=>{
    const ch=(supabase as any).channel("ncr-rt").on("postgres_changes",{event:"*",schema:"public",table:"non_conformance"},()=>fetchAll()).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[]);

  const fetchAll = async () => {
    const [n,s]=await Promise.all([(supabase as any).from("non_conformance").select("*").order("created_at",{ascending:false}),supabase.from("suppliers").select("id,name")]);
    setNcrs(n.data||[]); setSuppliers(s.data||[]);
  };

  const handleCreate = async () => {
    if (!form.issue_description) { toast({title:"Fill required fields",variant:"destructive"}); return; }
    const supplier=suppliers.find(s=>s.id===form.supplier_id);
    const payload={ncr_number:genNo(),supplier_id:form.supplier_id||null,supplier_name:supplier?.name||null,item_name:form.item_name,issue_description:form.issue_description,severity:form.severity,root_cause:form.root_cause,status:"open",raised_by:user?.id,raised_by_name:profile?.full_name};
    const {data,error}=await (supabase as any).from("non_conformance").insert(payload).select().single();
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"create","non_conformance",data?.id,{});
    toast({title:"NCR raised",description:data?.ncr_number}); setShowNew(false);
    setForm({supplier_id:"",item_name:"",issue_description:"",severity:"minor",root_cause:""});
  };

  const handleResolve = async () => {
    if (!detail||!corrAction) return;
    const {error}=await (supabase as any).from("non_conformance").update({status:"resolved",corrective_action:corrAction,resolved_by:user?.id,resolved_at:new Date().toISOString()}).eq("id",detail.id);
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"resolve","non_conformance",detail.id,{}); toast({title:"NCR resolved"}); setDetail(null); setCorrAction("");
  };

  const filtered=ncrs.filter(n=>(statusFilter==="all"||n.status===statusFilter)&&(n.ncr_number?.toLowerCase().includes(search.toLowerCase())||n.supplier_name?.toLowerCase().includes(search.toLowerCase())||n.item_name?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-red-600" />Non-Conformance Reports</h1><p className="text-sm text-slate-500 mt-0.5">Quality issues & corrective actions · Live sync</p></div>
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={()=>setShowNew(true)}><Plus className="w-4 h-4 mr-2" />Raise NCR</Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Open NCRs",val:ncrs.filter(n=>n.status==="open").length,col:"red"},{label:"Under Review",val:ncrs.filter(n=>n.status==="under_review").length,col:"amber"},{label:"Resolved",val:ncrs.filter(n=>n.status==="resolved").length,col:"green"},{label:"Total",val:ncrs.length,col:"slate"}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-2xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search NCRs..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{["all","open","under_review","resolved","closed"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All Status":s.replace("_"," ")}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["NCR No.","Item","Supplier","Issue","Severity","Status","Date"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-12">No NCRs recorded yet.</TableCell></TableRow>
            :filtered.map(n=><TableRow key={n.id} className="hover:bg-slate-50 cursor-pointer" onClick={()=>setDetail(n)}>
              <TableCell className="font-mono text-xs font-semibold text-red-600">{n.ncr_number}</TableCell>
              <TableCell className="font-medium">{n.item_name||"—"}</TableCell>
              <TableCell>{n.supplier_name||"—"}</TableCell>
              <TableCell className="max-w-[200px] truncate text-slate-600">{n.issue_description}</TableCell>
              <TableCell><Badge variant="outline" className={`text-xs capitalize ${severityColor(n.severity)}`}>{n.severity}</Badge></TableCell>
              <TableCell><Badge variant="outline" className={`text-xs capitalize ${statusColor(n.status)}`}>{n.status?.replace("_"," ")}</Badge></TableCell>
              <TableCell className="text-slate-500">{n.created_at?.split("T")[0]}</TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Raise Non-Conformance Report</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Supplier</Label><Select value={form.supplier_id} onValueChange={v=>setForm(f=>({...f,supplier_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Item / Product</Label><Input className="mt-1" value={form.item_name} onChange={e=>setForm(f=>({...f,item_name:e.target.value}))} /></div>
            <div><Label>Severity</Label><Select value={form.severity} onValueChange={v=>setForm(f=>({...f,severity:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["minor","major","critical"].map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Issue Description *</Label><textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[60px]" value={form.issue_description} onChange={e=>setForm(f=>({...f,issue_description:e.target.value}))} /></div>
            <div className="col-span-2"><Label>Root Cause</Label><textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none min-h-[60px]" value={form.root_cause} onChange={e=>setForm(f=>({...f,root_cause:e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCreate}><AlertTriangle className="w-4 h-4 mr-2" />Raise NCR</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{detail.ncr_number}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">{[["Supplier",detail.supplier_name||"—"],["Item",detail.item_name||"—"],["Severity",detail.severity],["Status",detail.status?.replace("_"," ")],["Issue",detail.issue_description],["Root Cause",detail.root_cause||"—"]].map(([l,v])=><div key={l} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{l}</p><p className="font-medium text-slate-800 capitalize">{v}</p></div>)}</div>
        {canResolve&&detail.status==="open"&&<div className="mt-3 space-y-2"><Label>Corrective Action *</Label><textarea className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]" value={corrAction} onChange={e=>setCorrAction(e.target.value)} /><Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleResolve}><CheckCircle className="w-4 h-4 mr-2" />Resolve NCR</Button></div>}
        <DialogFooter><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
