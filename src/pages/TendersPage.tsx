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
import { notifyProcurement } from "@/lib/notify";
import { Plus, Search, Download, Gavel, RefreshCw, Eye, CheckCircle } from "lucide-react";

const genNo = () => { const d=new Date(); return `T/EL5H/${d.getFullYear()}/${Math.floor(100+Math.random()*900)}`; };
const statusColor = (s:string)=>({draft:"text-slate-600 border-slate-200 bg-slate-50",published:"text-blue-700 border-blue-200 bg-blue-50",closed:"text-amber-700 border-amber-200 bg-amber-50",evaluated:"text-purple-700 border-purple-200 bg-purple-50",awarded:"text-green-700 border-green-200 bg-green-50",cancelled:"text-red-700 border-red-200 bg-red-50"}[s]??"text-slate-600 border-slate-200");
const CATEGORIES = ["Pharmaceuticals","Medical Supplies","Equipment","Laboratory","Construction & Renovation","ICT","General Supplies","Services"];

export default function TendersPage() {
  const { user, profile, hasRole } = useAuth();
  const canManage = hasRole("admin") || hasRole("procurement_manager") || hasRole("procurement_officer");
  const [tenders, setTenders] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({title:"",description:"",category:"",tender_type:"open",estimated_value:"",opening_date:"",closing_date:""});

  useEffect(()=>{fetch();},[]);
  useEffect(()=>{
    const ch=(supabase as any).channel("tenders-rt").on("postgres_changes",{event:"*",schema:"public",table:"tenders"},()=>fetch()).subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[]);

  const fetch = async () => { const {data}=await (supabase as any).from("tenders").select("*").order("created_at",{ascending:false}); setTenders(data||[]); };

  const handleCreate = async () => {
    if (!form.title||!form.closing_date) { toast({title:"Fill required fields",variant:"destructive"}); return; }
    const payload = {tender_number:genNo(),title:form.title,description:form.description,category:form.category,tender_type:form.tender_type,estimated_value:form.estimated_value?Number(form.estimated_value):null,opening_date:form.opening_date||null,closing_date:form.closing_date,status:"draft",created_by:user?.id,created_by_name:profile?.full_name};
    const {data,error} = await (supabase as any).from("tenders").insert(payload).select().single();
    if (error) { toast({title:"Error",description:error.message,variant:"destructive"}); return; }
    logAudit(user?.id,profile?.full_name,"create","tenders",data?.id,{title:form.title});
    toast({title:"Tender created",description:data?.tender_number});
    if(data) notifyProcurement({title:"New Tender Published",message:`Tender ${data.tender_number}: ${form.title}`,type:"tender",module:"Tenders",actionUrl:"/tenders"});
    setShowNew(false); setForm({title:"",description:"",category:"",tender_type:"open",estimated_value:"",opening_date:"",closing_date:""});
  };

  const updateStatus = async (id:string, status:string) => {
    await (supabase as any).from("tenders").update({status}).eq("id",id);
    logAudit(user?.id,profile?.full_name,`tender_${status}`,"tenders",id,{status});
    toast({title:`Tender ${status}`}); setDetail(null);
  };

  const filtered = tenders.filter(t=>(statusFilter==="all"||t.status===statusFilter)&&(t.title?.toLowerCase().includes(search.toLowerCase())||t.tender_number?.toLowerCase().includes(search.toLowerCase())));

  const glassCard = { background:"rgba(8,20,55,0.78)", backdropFilter:"blur(14px)", WebkitBackdropFilter:"blur(14px)", border:"1px solid rgba(255,255,255,0.12)" } as React.CSSProperties;

  return (
    <div className="p-4 space-y-4" style={{minHeight:"calc(100vh-100px)"}}>
      <div className="rounded-2xl px-5 py-3 flex items-center justify-between" style={{background:"linear-gradient(90deg,#3b1f73,#5b21b6,#7c3aed)",boxShadow:"0 4px 16px rgba(124,58,237,0.35)"}}>
        <div className="flex items-center gap-3"><Gavel className="w-5 h-5 text-white" /><div><h1 className="text-base font-black text-white">Tenders</h1><p className="text-[10px] text-white/50">Competitive tendering & procurement · Live sync</p></div></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20"><Download className="w-4 h-4 mr-2" />Export</Button>
          {canManage&&<Button size="sm" className="bg-white text-violet-800 hover:bg-violet-50 font-bold" onClick={()=>setShowNew(true)}><Plus className="w-4 h-4 mr-2" />New Tender</Button>}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[{label:"Published",val:tenders.filter(t=>t.status==="published").length,c:"#7c3aed"},{label:"Closed",val:tenders.filter(t=>t.status==="closed").length,c:"#f59e0b"},{label:"Awarded",val:tenders.filter(t=>t.status==="awarded").length,c:"#10b981"},{label:"Total",val:tenders.length,c:"#60a5fa"}].map(k=>(
          <div key={k.label} style={{...glassCard,borderRadius:12,padding:"14px 18px"}}>
            <p className="text-2xl font-black" style={{color:k.c}}>{k.val}</p>
            <p className="text-xs mt-1" style={{color:"rgba(255,255,255,0.5)"}}>{k.label}</p>
          </div>
        ))}
      </div>
      <div style={{...glassCard,borderRadius:12,overflow:"hidden"}}>
        <div className="p-3 flex gap-3 flex-wrap items-center" style={{borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div className="relative flex-1 min-w-44"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{color:"rgba(255,255,255,0.3)"}} /><Input placeholder="Search tenders..." className="pl-9" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff"}} value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36" style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"#fff"}}><SelectValue /></SelectTrigger><SelectContent>{["all","draft","published","closed","evaluated","awarded","cancelled"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All Status":s}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={fetch} className="bg-white/10 text-white border-white/15 hover:bg-white/20"><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow style={{background:"rgba(10,25,70,0.7)"}}>{["Tender No.","Title","Category","Closing Date","Est. Value","Status","Actions"].map(h=><TableHead key={h} style={{color:"rgba(255,255,255,0.45)",fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={7} style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:"32px"}}>No tenders found. Create the first one.</TableCell></TableRow>
            :filtered.map((t,i)=><TableRow key={t.id} style={{borderBottom:"1px solid rgba(255,255,255,0.05)",background:i%2===0?"rgba(255,255,255,0.02)":"transparent"}} onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background="rgba(124,58,237,0.1)"} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background=i%2===0?"rgba(255,255,255,0.02)":"transparent"}>
              <TableCell className="font-mono text-xs font-semibold" style={{color:"#a78bfa"}}>{t.tender_number}</TableCell>
              <TableCell><p className="font-medium" style={{color:"rgba(255,255,255,0.85)"}}>{t.title}</p><p className="text-xs capitalize" style={{color:"rgba(255,255,255,0.38)"}}>{t.tender_type} tender</p></TableCell>
              <TableCell style={{color:"rgba(255,255,255,0.55)"}}>{t.category||"—"}</TableCell>
              <TableCell style={{color:"rgba(255,255,255,0.55)"}}>{t.closing_date}</TableCell>
              <TableCell className="font-semibold" style={{color:"rgba(255,255,255,0.8)"}}>{t.estimated_value?`KES ${Number(t.estimated_value).toLocaleString()}`:"—"}</TableCell>
              <TableCell><Badge variant="outline" className={`text-xs capitalize ${statusColor(t.status)}`}>{t.status}</Badge></TableCell>
              <TableCell><Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-violet-600/30" style={{color:"#a78bfa"}} onClick={()=>setDetail(t)}><Eye className="w-3.5 h-3.5" /></Button></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Gavel className="w-5 h-5 text-violet-600" />New Tender</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Tender Title *</Label><Input className="mt-1" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Supply of Pharmaceuticals FY 2026/27" /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Tender Type</Label><Select value={form.tender_type} onValueChange={v=>setForm(f=>({...f,tender_type:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["open","restricted","direct","framework"].map(t=><SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Estimated Value (KES)</Label><Input type="number" className="mt-1" value={form.estimated_value} onChange={e=>setForm(f=>({...f,estimated_value:e.target.value}))} /></div>
            <div><Label>Opening Date</Label><Input type="date" className="mt-1" value={form.opening_date} onChange={e=>setForm(f=>({...f,opening_date:e.target.value}))} /></div>
            <div className="col-span-2"><Label>Closing Date *</Label><Input type="date" className="mt-1" value={form.closing_date} onChange={e=>setForm(f=>({...f,closing_date:e.target.value}))} /></div>
            <div className="col-span-2"><Label>Description</Label><textarea className="w-full mt-1 border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleCreate}><Gavel className="w-4 h-4 mr-2" />Create Tender</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-md">
        <DialogHeader><DialogTitle style={{color:"#a78bfa"}}>{detail.tender_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">{[["Title",detail.title],["Category",detail.category||"—"],["Type",detail.tender_type],["Closing",detail.closing_date],["Est. Value",detail.estimated_value?`KES ${Number(detail.estimated_value).toLocaleString()}`:"—"],["Status",detail.status]].map(([l,v])=><div key={l} style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:8,padding:"8px 12px"}}><p className="text-xs" style={{color:"rgba(255,255,255,0.4)"}}>{l}</p><p className="font-medium capitalize" style={{color:"rgba(255,255,255,0.9)"}}>{v}</p></div>)}</div>
        {canManage&&detail.status==="draft"&&<Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2" onClick={()=>updateStatus(detail.id,"published")}><CheckCircle className="w-4 h-4 mr-2" />Publish Tender</Button>}
        {canManage&&detail.status==="published"&&<Button className="w-full bg-amber-600 hover:bg-amber-700 text-white mt-2" onClick={()=>updateStatus(detail.id,"closed")}>Close Tender</Button>}
        {canManage&&detail.status==="closed"&&<Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-2" onClick={()=>updateStatus(detail.id,"evaluated")}>Mark Evaluated</Button>}
        <DialogFooter><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
