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
import { Plus, Search, Scale, RefreshCw, Star, Edit } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

export default function BidEvaluationsPage() {
  const { user, profile, hasRole } = useAuth();
  const canEvaluate = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer");
  const { data: evaluations, refetch } = useRealtimeTable("bid_evaluations", { order:{ column:"created_at" } });
  const [tenders, setTenders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [tenderFilter, setTenderFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ tender_id:"", supplier_id:"", bid_amount:"", technical_score:"", financial_score:"", recommendation:"", notes:"" });

  useEffect(()=>{
    Promise.all([(supabase as any).from("tenders").select("id,tender_number,title,status"),supabase.from("suppliers").select("id,name")]).then(([t,s])=>{setTenders(t.data||[]);setSuppliers(s.data||[]);});
  },[]);

  const totalScore=(t:number,f:number)=>Math.round(t*0.7+f*0.3*100)/100;

  const openNew=(v?:any)=>{
    if(v){setEditing(v);setForm({tender_id:v.tender_id||"",supplier_id:v.supplier_id||"",bid_amount:String(v.bid_amount||""),technical_score:String(v.technical_score||""),financial_score:String(v.financial_score||""),recommendation:v.recommendation||"",notes:v.notes||""});}
    else{setEditing(null);setForm({tender_id:"",supplier_id:"",bid_amount:"",technical_score:"",financial_score:"",recommendation:"",notes:""});}
    setShowNew(true);
  };

  const handleSave=async()=>{
    if(!form.tender_id||!form.supplier_id){toast({title:"Fill required fields",variant:"destructive"});return;}
    const tender=tenders.find(t=>t.id===form.tender_id); const supplier=suppliers.find(s=>s.id===form.supplier_id);
    const ts=Number(form.technical_score||0); const fs=Number(form.financial_score||0); const total=totalScore(ts,fs);
    const payload={tender_id:form.tender_id,tender_number:tender?.tender_number,supplier_id:form.supplier_id,supplier_name:supplier?.name,bid_amount:Number(form.bid_amount||0),technical_score:ts,financial_score:fs,total_score:total,recommendation:form.recommendation,notes:form.notes,evaluated_by:user?.id,evaluated_by_name:profile?.full_name,evaluated_at:new Date().toISOString(),status:"evaluated"};
    if(editing){
      const{error}=await(supabase as any).from("bid_evaluations").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      toast({title:"Evaluation updated"});
    } else {
      const{data,error}=await(supabase as any).from("bid_evaluations").insert(payload).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"create","bid_evaluations",data?.id,{});toast({title:"Bid evaluated"});
    }
    setShowNew(false);setEditing(null);
  };

  const recommend=async(v:any)=>{
    await(supabase as any).from("bid_evaluations").update({status:"recommended"}).eq("id",v.id);
    toast({title:"Supplier recommended for award"});
  };

  const filtered=(evaluations as any[]).filter(v=>(tenderFilter==="all"||v.tender_id===tenderFilter)&&(v.supplier_name?.toLowerCase().includes(search.toLowerCase())||v.tender_number?.toLowerCase().includes(search.toLowerCase())));
  const tenderOptions=[...new Set((evaluations as any[]).map((e:any)=>e.tender_id))].map(id=>({id,label:(evaluations as any[]).find((e:any)=>e.tender_id===id)?.tender_number||id}));

  return (
    <div className="p-6 space-y-6" style={{background:"transparent",minHeight:"calc(100vh-100px)"}}>
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Scale className="w-6 h-6 text-pink-600" />Bid Evaluations</h1><p className="text-sm text-slate-500">Tender bid scoring & recommendation · Realtime</p></div>
        {canEvaluate&&<Button size="sm" className="bg-pink-600 hover:bg-pink-700 text-white" onClick={()=>openNew()}><Plus className="w-4 h-4 mr-2" />Evaluate Bid</Button>}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={tenderFilter} onValueChange={setTenderFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Tenders</SelectItem>{tenderOptions.map(t=><SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Tender","Supplier","Bid Amount","Technical","Financial","Total Score","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-12">No bid evaluations yet.</TableCell></TableRow>
            :filtered.map((v:any)=><TableRow key={v.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-bold text-pink-600">{v.tender_number}</TableCell>
              <TableCell className="font-medium">{v.supplier_name}</TableCell>
              <TableCell>KES {Number(v.bid_amount||0).toLocaleString()}</TableCell>
              <TableCell><div className="flex items-center gap-1"><span className="font-semibold">{v.technical_score||0}</span><span className="text-slate-400 text-xs">/100</span></div></TableCell>
              <TableCell><div className="flex items-center gap-1"><span className="font-semibold">{v.financial_score||0}</span><span className="text-slate-400 text-xs">/100</span></div></TableCell>
              <TableCell><span className={`font-bold text-lg ${Number(v.total_score||0)>=70?"text-green-600":Number(v.total_score||0)>=50?"text-amber-600":"text-red-600"}`}>{Number(v.total_score||0).toFixed(1)}</span></TableCell>
              <TableCell><Badge variant="outline" className={`capitalize ${v.status==="recommended"?"text-green-700 border-green-200 bg-green-50":v.status==="awarded"?"text-blue-700 border-blue-200 bg-blue-50":"text-slate-600 border-slate-200"}`}>{v.status}</Badge></TableCell>
              <TableCell><div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>openNew(v)}><Edit className="w-3.5 h-3.5" /></Button>
                {canEvaluate&&v.status==="evaluated"&&<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600" onClick={()=>recommend(v)}><Star className="w-3.5 h-3.5 mr-1" />Recommend</Button>}
              </div></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v)setEditing(null);}}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editing?"Edit":"Evaluate"} Bid</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tender *</Label><Select value={form.tender_id} onValueChange={v=>setForm(f=>({...f,tender_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select tender..." /></SelectTrigger><SelectContent>{tenders.map(t=><SelectItem key={t.id} value={t.id}>{t.tender_number} — {t.title?.substring(0,30)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Supplier *</Label><Select value={form.supplier_id} onValueChange={v=>setForm(f=>({...f,supplier_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Bid Amount (KES)</Label><Input type="number" className="mt-1" value={form.bid_amount} onChange={e=>setForm(f=>({...f,bid_amount:e.target.value}))} min={0} /></div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div><Label>Technical Score (0-100) — 70%</Label><Input type="number" className="mt-1" value={form.technical_score} onChange={e=>setForm(f=>({...f,technical_score:e.target.value}))} min={0} max={100} /></div>
              <div><Label>Financial Score (0-100) — 30%</Label><Input type="number" className="mt-1" value={form.financial_score} onChange={e=>setForm(f=>({...f,financial_score:e.target.value}))} min={0} max={100} /></div>
            </div>
            {form.technical_score&&form.financial_score&&<div className="col-span-2 bg-blue-50 rounded-lg p-3 text-center"><p className="text-sm text-blue-700">Weighted Score: <span className="text-2xl font-bold">{totalScore(Number(form.technical_score),Number(form.financial_score)).toFixed(2)}</span>/100</p></div>}
            <div className="col-span-2"><Label>Recommendation</Label><textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 min-h-[60px]" value={form.recommendation} onChange={e=>setForm(f=>({...f,recommendation:e.target.value}))} /></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-pink-600 hover:bg-pink-700 text-white" onClick={handleSave}><Scale className="w-4 h-4 mr-2" />{editing?"Update":"Submit Evaluation"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
