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
import { Plus, Search, BookOpen, RefreshCw, Edit } from "lucide-react";

const typeColor = (t:string)=>({asset:"text-blue-700 border-blue-200 bg-blue-50",liability:"text-red-700 border-red-200 bg-red-50",equity:"text-purple-700 border-purple-200 bg-purple-50",revenue:"text-green-700 border-green-200 bg-green-50",expense:"text-orange-700 border-orange-200 bg-orange-50"}[t]??"text-slate-600 border-slate-200");

export default function ChartOfAccountsPage() {
  const { user, profile, hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("procurement_manager");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [typeFilter, setTypeFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({account_code:"",account_name:"",account_type:"expense",category:"",description:""});

  useEffect(()=>{ fetch(); },[]);
  useEffect(()=>{
    const ch=(supabase as any).channel("coa-rt").on("postgres_changes",{event:"*",schema:"public",table:"chart_of_accounts"},()=>fetch()).subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[]);

  const fetch = async () => { const {data}=await (supabase as any).from("chart_of_accounts").select("*").order("account_code"); setAccounts(data||[]); };

  const handleSubmit = async () => {
    if (!form.account_code||!form.account_name) { toast({title:"Fill required fields",variant:"destructive"}); return; }
    if (editing) {
      const {error}=await (supabase as any).from("chart_of_accounts").update(form).eq("id",editing.id);
      if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
      logAudit(user?.id,profile?.full_name,"update","chart_of_accounts",editing.id,{account_code:form.account_code}); toast({title:"Account updated"});
    } else {
      const {data,error}=await (supabase as any).from("chart_of_accounts").insert(form).select().single();
      if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
      logAudit(user?.id,profile?.full_name,"create","chart_of_accounts",data?.id,{account_code:form.account_code}); toast({title:"Account created"});
    }
    setShowNew(false); setEditing(null); setForm({account_code:"",account_name:"",account_type:"expense",category:"",description:""});
  };

  const filtered=accounts.filter(a=>(typeFilter==="all"||a.account_type===typeFilter)&&(a.account_name?.toLowerCase().includes(search.toLowerCase())||a.account_code?.includes(search)));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="w-6 h-6 text-blue-600" />Chart of Accounts</h1><p className="text-sm text-slate-500 mt-0.5">General ledger accounts · Live sync</p></div>
        {canEdit&&<Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={()=>setShowNew(true)}><Plus className="w-4 h-4 mr-2" />New Account</Button>}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search accounts..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{["all","asset","liability","equity","revenue","expense"].map(t=><SelectItem key={t} value={t} className="capitalize">{t==="all"?"All Types":t}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={fetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Code","Account Name","Type","Category","Balance","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-12">No accounts found.</TableCell></TableRow>
            :filtered.map(a=><TableRow key={a.id} className="hover:bg-slate-50">
              <TableCell className="font-mono font-bold text-slate-700">{a.account_code}</TableCell>
              <TableCell className="font-medium">{a.account_name}</TableCell>
              <TableCell><Badge variant="outline" className={`text-xs capitalize ${typeColor(a.account_type)}`}>{a.account_type}</Badge></TableCell>
              <TableCell className="text-slate-500">{a.category||"—"}</TableCell>
              <TableCell className="font-semibold">KES {Number(a.balance||0).toLocaleString()}</TableCell>
              <TableCell>{canEdit&&<Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>{setEditing(a);setForm({account_code:a.account_code,account_name:a.account_name,account_type:a.account_type,category:a.category||"",description:a.description||""});setShowNew(true);}}><Edit className="w-3.5 h-3.5" /></Button>}</TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>
      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v){setEditing(null);setForm({account_code:"",account_name:"",account_type:"expense",category:"",description:"";}}}}> 
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"New"} Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Account Code *</Label><Input className="mt-1" value={form.account_code} onChange={e=>setForm(f=>({...f,account_code:e.target.value}))} /></div>
            <div><Label>Account Type *</Label><Select value={form.account_type} onValueChange={v=>setForm(f=>({...f,account_type:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["asset","liability","equity","revenue","expense"].map(t=><SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-2"><Label>Account Name *</Label><Input className="mt-1" value={form.account_name} onChange={e=>setForm(f=>({...f,account_name:e.target.value}))} /></div>
            <div className="col-span-2"><Label>Category</Label><Input className="mt-1" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} placeholder="e.g. Current Assets, Operating Expenses" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>{setShowNew(false);setEditing(null);}}>Cancel</Button><Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmit}>{editing?"Save Changes":"Create Account"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
