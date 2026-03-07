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
import { Plus, Search, Building2, RefreshCw, Edit, Eye } from "lucide-react";
import { useRealtimeTable } from "@/hooks/useRealtimeTable";

const genNo = () => `AST/EL5H/${new Date().getFullYear()}/${Math.floor(100+Math.random()*9900)}`;
const statusColor = (s:string) => ({active:"text-green-700 border-green-200 bg-green-50",disposed:"text-red-700 border-red-200 bg-red-50",under_maintenance:"text-amber-700 border-amber-200 bg-amber-50",written_off:"text-slate-600 border-slate-200 bg-slate-50"}[s] ?? "text-slate-600 border-slate-200");
const CATEGORIES = ["Medical Equipment","ICT Equipment","Furniture & Fittings","Motor Vehicles","Buildings","Land","Office Equipment","Laboratory Equipment","Theatre Equipment","Radiology Equipment"];

export default function FixedAssetsPage() {
  const { user, profile, hasRole } = useAuth();
  const { data: assets, refetch } = useRealtimeTable("fixed_assets", { order:{ column:"created_at" } });
  const [departments, setDepartments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [showNew, setShowNew] = useState(false); const [detail, setDetail] = useState<any>(null); const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ description:"", category:"", location:"", department_id:"", acquisition_date:"", acquisition_cost:"", useful_life_years:"5", depreciation_method:"straight_line", salvage_value:"0", serial_number:"", model:"", manufacturer:"", warranty_expiry:"", supplier_id:"", status:"active" });

  useEffect(()=>{Promise.all([(supabase as any).from("departments").select("id,name"),supabase.from("suppliers").select("id,name")]).then(([d,s])=>{setDepartments(d.data||[]);setSuppliers(s.data||[]);});},[]);

  const openNew=(v?:any)=>{
    if(v){setEditing(v);setForm({description:v.description,category:v.category||"",location:v.location||"",department_id:v.department_id||"",acquisition_date:v.acquisition_date||"",acquisition_cost:String(v.acquisition_cost||0),useful_life_years:String(v.useful_life_years||5),depreciation_method:v.depreciation_method||"straight_line",salvage_value:String(v.salvage_value||0),serial_number:v.serial_number||"",model:v.model||"",manufacturer:v.manufacturer||"",warranty_expiry:v.warranty_expiry||"",supplier_id:v.supplier_id||"",status:v.status||"active"});}
    else{setEditing(null);setForm({description:"",category:"",location:"",department_id:"",acquisition_date:"",acquisition_cost:"",useful_life_years:"5",depreciation_method:"straight_line",salvage_value:"0",serial_number:"",model:"",manufacturer:"",warranty_expiry:"",supplier_id:"",status:"active"});}
    setShowNew(true);
  };

  const handleSave=async()=>{
    if(!form.description||!form.acquisition_cost){toast({title:"Fill required fields",variant:"destructive"});return;}
    const cost=Number(form.acquisition_cost); const salvage=Number(form.salvage_value||0);
    const payload={description:form.description,category:form.category,location:form.location,department_id:form.department_id||null,department_name:departments.find(d=>d.id===form.department_id)?.name||null,acquisition_date:form.acquisition_date||null,acquisition_cost:cost,useful_life_years:Number(form.useful_life_years||5),depreciation_method:form.depreciation_method,salvage_value:salvage,net_book_value:cost-salvage,serial_number:form.serial_number,model:form.model,manufacturer:form.manufacturer,warranty_expiry:form.warranty_expiry||null,supplier_id:form.supplier_id||null,status:form.status};
    if(editing){
      const{error}=await(supabase as any).from("fixed_assets").update(payload).eq("id",editing.id);
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"update","fixed_assets",editing.id,{});toast({title:"Asset updated"});
    } else {
      const{data,error}=await(supabase as any).from("fixed_assets").insert({...payload,asset_number:genNo()}).select().single();
      if(error){toast({title:"Error",description:error.message,variant:"destructive"});return;}
      logAudit(user?.id,profile?.full_name,"create","fixed_assets",data?.id,{number:data?.asset_number});toast({title:"Asset registered",description:data?.asset_number});
    }
    setShowNew(false);setEditing(null);
  };

  const totalCost=(assets as any[]).reduce((s:number,a:any)=>s+Number(a.acquisition_cost||0),0);
  const filtered=(assets as any[]).filter(a=>(statusFilter==="all"||a.status===statusFilter)&&(a.description?.toLowerCase().includes(search.toLowerCase())||a.asset_number?.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-6 h-6 text-orange-600" />Fixed Assets Register</h1><p className="text-sm text-slate-500">Asset management & depreciation · </p></div>
        <div className="flex gap-2"><Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={()=>openNew()}><Plus className="w-4 h-4 mr-2" />Register Asset</Button></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{label:"Total Assets",val:(assets as any[]).length},{label:"Active",val:(assets as any[]).filter((a:any)=>a.status==="active").length},{label:"Total Cost",val:`KES ${totalCost.toLocaleString()}`},{label:"Under Maintenance",val:(assets as any[]).filter((a:any)=>a.status==="under_maintenance").length}].map(k=>(
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm"><p className="text-xl font-bold text-slate-800">{k.val}</p><p className="text-xs text-slate-500 mt-1">{k.label}</p></div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Search assets..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)} /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{["all","active","disposed","under_maintenance","written_off"].map(s=><SelectItem key={s} value={s} className="capitalize">{s==="all"?"All Status":s.replace("_"," ")}</SelectItem>)}</SelectContent></Select>
          <Button variant="outline" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4" /></Button>
        </div>
        <Table><TableHeader><TableRow className="bg-slate-50">{["Asset No.","Description","Category","Location","Cost","Net Book Value","Status","Actions"].map(h=><TableHead key={h} className="text-xs font-semibold uppercase">{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{filtered.length===0?<TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-12">No assets registered yet.</TableCell></TableRow>
            :filtered.map((a:any)=><TableRow key={a.id} className="hover:bg-slate-50">
              <TableCell className="font-mono text-xs font-bold text-orange-600">{a.asset_number}</TableCell>
              <TableCell><p className="font-medium">{a.description}</p><p className="text-xs text-slate-400">{a.manufacturer} {a.model}</p></TableCell>
              <TableCell className="text-slate-500">{a.category||"—"}</TableCell>
              <TableCell className="text-slate-500">{a.location||"—"}</TableCell>
              <TableCell className="font-semibold">KES {Number(a.acquisition_cost||0).toLocaleString()}</TableCell>
              <TableCell className="font-semibold">KES {Number(a.net_book_value||0).toLocaleString()}</TableCell>
              <TableCell><Badge variant="outline" className={`capitalize ${statusColor(a.status)}`}>{a.status?.replace("_"," ")}</Badge></TableCell>
              <TableCell><div className="flex gap-1"><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>setDetail(a)}><Eye className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={()=>openNew(a)}><Edit className="w-3.5 h-3.5" /></Button></div></TableCell>
            </TableRow>)
          }</TableBody>
        </Table>
      </div>

      <Dialog open={showNew} onOpenChange={v=>{setShowNew(v);if(!v)setEditing(null);}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?"Edit":"Register"} Fixed Asset</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Description *</Label><Input className="mt-1" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
            <div><Label>Category</Label><Select value={form.category} onValueChange={v=>setForm(f=>({...f,category:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Location</Label><Input className="mt-1" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} /></div>
            <div><Label>Department</Label><Select value={form.department_id} onValueChange={v=>setForm(f=>({...f,department_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{departments.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["active","under_maintenance","disposed","written_off"].map(s=><SelectItem key={s} value={s} className="capitalize">{s.replace("_"," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Acquisition Date</Label><Input type="date" className="mt-1" value={form.acquisition_date} onChange={e=>setForm(f=>({...f,acquisition_date:e.target.value}))} /></div>
            <div><Label>Acquisition Cost (KES) *</Label><Input type="number" className="mt-1" value={form.acquisition_cost} onChange={e=>setForm(f=>({...f,acquisition_cost:e.target.value}))} min={0} /></div>
            <div><Label>Salvage Value (KES)</Label><Input type="number" className="mt-1" value={form.salvage_value} onChange={e=>setForm(f=>({...f,salvage_value:e.target.value}))} min={0} /></div>
            <div><Label>Useful Life (Years)</Label><Input type="number" className="mt-1" value={form.useful_life_years} onChange={e=>setForm(f=>({...f,useful_life_years:e.target.value}))} min={1} /></div>
            <div><Label>Depreciation Method</Label><Select value={form.depreciation_method} onValueChange={v=>setForm(f=>({...f,depreciation_method:v}))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{["straight_line","declining_balance"].map(m=><SelectItem key={m} value={m} className="capitalize">{m.replace("_"," ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Serial Number</Label><Input className="mt-1" value={form.serial_number} onChange={e=>setForm(f=>({...f,serial_number:e.target.value}))} /></div>
            <div><Label>Manufacturer</Label><Input className="mt-1" value={form.manufacturer} onChange={e=>setForm(f=>({...f,manufacturer:e.target.value}))} /></div>
            <div><Label>Model</Label><Input className="mt-1" value={form.model} onChange={e=>setForm(f=>({...f,model:e.target.value}))} /></div>
            <div><Label>Warranty Expiry</Label><Input type="date" className="mt-1" value={form.warranty_expiry} onChange={e=>setForm(f=>({...f,warranty_expiry:e.target.value}))} /></div>
            <div><Label>Supplier</Label><Select value={form.supplier_id} onValueChange={v=>setForm(f=>({...f,supplier_id:v}))}><SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{suppliers.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setShowNew(false)}>Cancel</Button><Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSave}><Building2 className="w-4 h-4 mr-2" />{editing?"Save Changes":"Register Asset"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {detail&&<Dialog open={!!detail} onOpenChange={()=>setDetail(null)}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{detail.asset_number}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2 text-sm">{[["Description",detail.description],["Category",detail.category||"—"],["Location",detail.location||"—"],["Manufacturer",detail.manufacturer||"—"],["Model",detail.model||"—"],["Serial No.",detail.serial_number||"—"],["Acquisition Cost",`KES ${Number(detail.acquisition_cost||0).toLocaleString()}`],["Net Book Value",`KES ${Number(detail.net_book_value||0).toLocaleString()}`],["Status",detail.status?.replace("_"," ")],["Warranty",detail.warranty_expiry||"—"]].map(([l,v])=><div key={l} className="bg-slate-50 rounded p-2"><p className="text-xs text-slate-500">{l}</p><p className="font-medium text-slate-800 capitalize">{v}</p></div>)}</div>
        <DialogFooter className="mt-4"><Button variant="outline" onClick={()=>setDetail(null)}>Close</Button><Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={()=>{setDetail(null);openNew(detail);}}><Edit className="w-4 h-4 mr-2" />Edit</Button></DialogFooter>
      </DialogContent></Dialog>}
    </div>
  );
}
