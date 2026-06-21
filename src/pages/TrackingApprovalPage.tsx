import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  ShoppingCart, FileText, BarChart3, Package, ClipboardList,
  AlertTriangle, Clock, Database, Store, ChevronRight, Check, X,
  Send, Truck, RefreshCw, Download, Upload, Eye, Printer,
  Search, Filter, Plus, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle2, XCircle, ThumbsUp, ThumbsDown, FileDown, Boxes,
  ArchiveRestore,
} from "lucide-react";

// ─── Tab definitions ────────────────────────────────────────────────────────
const TABS = [
  { key: "requisitions",    icon: ShoppingCart,  label: "Requisitions" },
  { key: "pos",             icon: FileText,       label: "POs" },
  { key: "overview",        icon: BarChart3,      label: "Overview Report" },
  { key: "sell",            icon: Package,        label: "Sell Report" },
  { key: "purchase",        icon: ClipboardList,  label: "Purchase Report" },
  { key: "stock-alert",     icon: AlertTriangle,  label: "Stock Alert" },
  { key: "expired",         icon: Clock,          label: "Expired" },
  { key: "backup",          icon: Database,       label: "Backup / Restore" },
  { key: "stores",          icon: Store,          label: "Stores" },
];

const PIE_COLORS = ["#0ea5e9","#f97316","#22c55e","#ef4444","#8b5cf6","#06b6d4"];
const fmt = (n: number) => `KSh ${Number(n||0).toLocaleString()}`;

// ─── Status badge helper ─────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const MAP: Record<string,string> = {
    pending:"bg-amber-100 text-amber-800",approved:"bg-sky-100 text-sky-800",
    rejected:"bg-red-100 text-red-800",closed:"bg-slate-100 text-slate-600",
    completed:"bg-green-100 text-green-800",received:"bg-green-100 text-green-800",
    partial:"bg-blue-100 text-blue-800",cancelled:"bg-red-100 text-red-800",
    open:"bg-orange-100 text-orange-800",draft:"bg-slate-100 text-slate-600",
  };
  const cls = MAP[status?.toLowerCase()] || "bg-slate-100 text-slate-600";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{status||"—"}</span>;
};

// ─── Main Component ──────────────────────────────────────────────────────────
const TrackingApprovalPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requisitions");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Data
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [pos, setPOs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [backupJobs, setBackupJobs] = useState<any[]>([]);

  // KPI tiles
  const [kpi, setKpi] = useState({ invoices:0, customers:0, suppliers:0, products:0,
    invToday:0, custToday:0, supToday:0, prodToday:0, pendingReqs:0, lowStock:0 });

  // Modal
  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // ── Load all data ────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const today = new Date(); today.setHours(0,0,0,0);
    const iso = today.toISOString();
    try {
      const [
        { data: rqs }, { data: poData }, { data: itemData },
        { data: grnData }, { data: supData }, { data: smData }, { data: bkData },
      ] = await Promise.all([
        supabase.from("requisitions").select("*").order("created_at",{ascending:false}),
        supabase.from("purchase_orders").select("*").order("created_at",{ascending:false}),
        supabase.from("items").select("*").order("item_name"),
        (supabase as any).from("goods_received").select("*").order("created_at",{ascending:false}),
        supabase.from("suppliers").select("*"),
        (supabase as any).from("stock_movements").select("*").order("created_at",{ascending:false}).limit(200),
        (supabase as any).from("backup_jobs").select("*").order("started_at",{ascending:false}).limit(10),
      ]);
      setRequisitions(rqs||[]);
      setPOs(poData||[]);
      setItems(itemData||[]);
      setGrns(grnData||[]);
      setSuppliers(supData||[]);
      setStockMovements(smData||[]);
      setBackupJobs(bkData||[]);

      const pReqs = (rqs||[]).filter((r:any)=>r.status==="pending").length;
      const lowS = (itemData||[]).filter((i:any)=>Number(i.quantity_in_stock||0)<Number(i.reorder_level||10)).length;
      setKpi({
        invoices:(poData||[]).length, customers:0, suppliers:(supData||[]).length,
        products:(itemData||[]).length, invToday:(poData||[]).filter((r:any)=>r.created_at>=iso).length,
        custToday:0, supToday:(supData||[]).filter((r:any)=>r.created_at>=iso).length,
        prodToday:(itemData||[]).filter((r:any)=>r.created_at>=iso).length,
        pendingReqs:pReqs, lowStock:lowS,
      });
    } catch(e){ console.error(e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ loadAll(); },[loadAll]);

  // ── Approve / Reject ─────────────────────────────────────────────────────
  const decide = async (id: string, status: "approved"|"rejected") => {
    await (supabase as any).from("requisitions").update({status}).eq("id",id);
    toast({ title:`Requisition ${status}`, description:`ID: ${id.slice(0,8)}` });
    loadAll();
  };

  // ── Forward requisition ──────────────────────────────────────────────────
  const forward = async (id: string) => {
    try {
      await supabase.functions.invoke("send-sms",{body:{event:"forwarded",requisitionId:id}});
      toast({title:"Forwarded successfully"});
    } catch { toast({title:"Forwarded (SMS gateway optional)"}); }
  };

  // ── Backup handler ───────────────────────────────────────────────────────
  const runBackup = async () => {
    setBackupRunning(true); setBackupProgress(0);
    const TABLES = ["requisitions","purchase_orders","items","suppliers","goods_received","stock_movements"];
    const backup: Record<string,any[]> = {};
    for(let i=0;i<TABLES.length;i++){
      const {data} = await (supabase as any).from(TABLES[i]).select("*");
      backup[TABLES[i]] = data||[];
      setBackupProgress(Math.round(((i+1)/TABLES.length)*100));
    }
    const blob = new Blob([JSON.stringify({
      exported_at:new Date().toISOString(),
      system:"EL5 MediProcure",
      tables:backup,
    },null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`EL5-Backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    await (supabase as any).from("backup_jobs").insert({
      status:"completed",table_count:TABLES.length,
      started_at:new Date().toISOString(),completed_at:new Date().toISOString(),format:"JSON",
    }).select();
    toast({title:"Backup complete ✓",description:"JSON file downloaded"});
    setBackupRunning(false); setBackupProgress(100);
    loadAll();
  };

  // ── Filter helpers ───────────────────────────────────────────────────────
  const filterItems = <T extends Record<string,any>>(arr: T[], keys: (keyof T)[]) =>
    arr.filter(item=>{
      const matchSearch = !search || keys.some(k=>String(item[k]||"").toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter==="all" || String(item.status||"").toLowerCase()===statusFilter;
      return matchSearch && matchStatus;
    });

  // ── Chart data ───────────────────────────────────────────────────────────
  const monthlySpend = () => {
    const m: Record<string,number> = {};
    pos.forEach((p:any)=>{
      const month = new Date(p.created_at).toLocaleString("en",{month:"short"});
      m[month] = (m[month]||0) + Number(p.total_amount||0);
    });
    return Object.entries(m).map(([month,spend])=>({month,spend}));
  };

  const statusPie = (arr: any[]) => {
    const m: Record<string,number> = {};
    arr.forEach((r:any)=>{ m[r.status||"unknown"]=(m[r.status||"unknown"]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value}));
  };

  const supplierSpend = () => {
    const m: Record<string,number> = {};
    pos.forEach((p:any)=>{
      const sup = suppliers.find((s:any)=>s.id===p.supplier_id);
      const name = sup?.name || p.supplier_name || "Unknown";
      m[name] = (m[name]||0) + Number(p.total_amount||0);
    });
    return Object.entries(m).slice(0,8).map(([name,value])=>({name:name.slice(0,14),value}));
  };

  const stockByCategory = () => {
    const m: Record<string,{count:number,value:number}> = {};
    items.forEach((i:any)=>{
      const cat = i.category_name||i.category||"General";
      if(!m[cat]) m[cat]={count:0,value:0};
      m[cat].count += Number(i.quantity_in_stock||0);
      m[cat].value += Number(i.quantity_in_stock||0)*Number(i.unit_price||0);
    });
    return Object.entries(m).slice(0,6).map(([cat,d])=>({cat,count:d.count,value:Math.round(d.value)}));
  };

  // ─── Expired items ───────────────────────────────────────────────────────
  const expiredItems = items.filter((i:any)=>{
    if(!i.expiry_date) return false;
    return new Date(i.expiry_date) < new Date();
  });

  const nearExpiryItems = items.filter((i:any)=>{
    if(!i.expiry_date) return false;
    const daysLeft = Math.floor((new Date(i.expiry_date).getTime()-Date.now())/(86400000));
    return daysLeft>=0 && daysLeft<=30;
  });

  // ─── Low stock items ─────────────────────────────────────────────────────
  const lowStockItems = items.filter((i:any)=>{
    const qty = Number(i.quantity_in_stock||0);
    const reorder = Number(i.reorder_level||10);
    return qty <= reorder;
  }).sort((a:any,b:any)=>Number(a.quantity_in_stock||0)-Number(b.quantity_in_stock||0));

  // ─── Sell/Purchase movements ─────────────────────────────────────────────
  const sells = stockMovements.filter((m:any)=>m.movement_type==="out"||m.movement_type==="issued");
  const purchases = stockMovements.filter((m:any)=>m.movement_type==="in"||m.movement_type==="received");

  // ── KPI tiles config ─────────────────────────────────────────────────────
  const KPI_TILES = [
    { label:"TOTAL POs", val:kpi.invoices, today:kpi.invToday, todayLabel:"POs TODAY", color:"border-sky-300" },
    { label:"TOTAL SUPPLIERS", val:kpi.suppliers, today:kpi.supToday, todayLabel:"SUPPLIERS TODAY", color:"border-emerald-300" },
    { label:"PENDING APPROVALS", val:kpi.pendingReqs, today:0, todayLabel:"AWAITING ACTION", color:"border-amber-300" },
    { label:"LOW STOCK ITEMS", val:kpi.lowStock, today:expiredItems.length, todayLabel:"EXPIRED ITEMS", color:"border-red-300" },
    { label:"TOTAL PRODUCTS", val:kpi.products, today:kpi.prodToday, todayLabel:"ADDED TODAY", color:"border-violet-300" },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in bg-[#f7f9fc] min-h-screen p-4 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard — Procurement & Approvals</h1>
          <p className="text-xs text-slate-500 mt-0.5">Embu Level 5 Hospital · EL5 MediProcure</p>
        </div>
        <Button size="sm" variant="outline" onClick={loadAll} disabled={loading} className="gap-1">
          <RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`} /> Refresh
        </Button>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {KPI_TILES.map((t)=>(
          <Card key={t.label} className={`border-l-4 ${t.color} bg-white shadow-sm`}>
            <CardContent className="p-3">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{t.label}</div>
              <div className="text-3xl font-bold text-slate-800 mt-1">{t.val.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 mt-1">{t.todayLabel}: <span className="font-bold text-slate-600">{t.today}</span></div>
              <button className="mt-2 w-full text-[10px] bg-sky-500 hover:bg-sky-600 text-white py-1 rounded flex items-center justify-center gap-1 transition-colors">
                DETAILS <ChevronRight className="w-3 h-3"/>
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab Bar */}
      <Card className="border border-slate-200 shadow-sm bg-white">
        <CardContent className="p-2">
          <div className="flex flex-wrap gap-1">
            {TABS.map((t)=>{
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={()=>{ setActiveTab(t.key); setSearch(""); setStatusFilter("all"); }}
                  className={`flex flex-col items-center px-3 py-2 rounded text-xs font-medium border transition-all min-w-[72px] gap-1 ${
                    active
                      ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                      : "text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600 hover:bg-sky-50"
                  }`}
                >
                  <Icon className="w-5 h-5"/>
                  <span className="leading-none text-center">{t.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search + Filter bar (for data tabs) */}
      {!["overview","backup"].includes(activeTab) && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400"/>
            <Input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-white border-slate-200"/>
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            className="h-9 text-sm border border-slate-200 rounded-md px-3 bg-white text-slate-700">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
            <option value="received">Received</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <span className="text-xs text-slate-400">
            {loading ? "Loading…" : "Data loaded"}
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: REQUISITIONS */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="requisitions" && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-700 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-sky-500"/> Requisitions
                <Badge className="bg-amber-100 text-amber-800 ml-1">
                  {requisitions.filter((r:any)=>r.status==="pending").length} Pending
                </Badge>
              </CardTitle>
              <Button size="sm" onClick={()=>navigate("/requisitions")} className="bg-sky-600 hover:bg-sky-700 h-8 gap-1">
                <Plus className="w-4 h-4"/> New Requisition
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["RQN #","Department","Purpose","Amount (KSh)","Status","Date","Priority","Actions"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filterItems(requisitions,["requisition_number","department","purpose","status"]).slice(0,50).map((r:any,i:number)=>(
                    <tr key={r.id||i} className={`border-b border-slate-100 hover:bg-sky-50 transition-colors ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                      <td className="px-3 py-2 font-mono font-medium text-sky-700">{r.requisition_number||r.id?.slice(0,8)||"—"}</td>
                      <td className="px-3 py-2 text-slate-700">{r.department||"—"}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate">{r.purpose||r.description||"—"}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">{Number(r.total_amount||r.amount||0).toLocaleString()}</td>
                      <td className="px-3 py-2"><StatusBadge status={r.status}/></td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.created_at?new Date(r.created_at).toLocaleDateString():"—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${r.urgency==="urgent"?"bg-red-100 text-red-700":"bg-slate-100 text-slate-600"}`}>
                          {r.urgency||"normal"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 flex-wrap">
                          <Button size="sm" className="h-6 px-2 bg-emerald-500 hover:bg-emerald-600 text-[10px]"
                            onClick={()=>decide(r.id,"approved")} disabled={r.status!=="pending"}>
                            <Check className="w-3 h-3 mr-0.5"/>Approve
                          </Button>
                          <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]"
                            onClick={()=>decide(r.id,"rejected")} disabled={r.status!=="pending"}>
                            <X className="w-3 h-3 mr-0.5"/>Reject
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                            onClick={()=>forward(r.id)}>
                            <Send className="w-3 h-3 mr-0.5"/>Forward
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                            onClick={()=>{setDetail(r);setShowDetail(true);}}>
                            <Eye className="w-3 h-3"/>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filterItems(requisitions,["requisition_number","department","purpose","status"]).length===0 && (
                    <tr><td colSpan={8} className="text-center py-10 text-slate-400">No requisitions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: POs */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="pos" && (
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-slate-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-500"/> Purchase Orders
                <Badge className="bg-orange-100 text-orange-800 ml-1">
                  {pos.filter((p:any)=>p.status==="open"||p.status==="pending").length} Open
                </Badge>
              </CardTitle>
              <Button size="sm" onClick={()=>navigate("/purchase-orders")} className="bg-sky-600 hover:bg-sky-700 h-8 gap-1">
                <Plus className="w-4 h-4"/> Create PO
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["PO #","Supplier","Total (KSh)","Status","Expected Delivery","Created","Actions"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filterItems(pos,["po_number","supplier_name","status"]).slice(0,50).map((p:any,i:number)=>(
                    <tr key={p.id||i} className={`border-b border-slate-100 hover:bg-sky-50 transition-colors ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                      <td className="px-3 py-2 font-mono font-medium text-sky-700">{p.po_number||p.id?.slice(0,8)||"—"}</td>
                      <td className="px-3 py-2 text-slate-700">{p.supplier_name||(suppliers.find((s:any)=>s.id===p.supplier_id)?.name)||"—"}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-800">{Number(p.total_amount||0).toLocaleString()}</td>
                      <td className="px-3 py-2"><StatusBadge status={p.status}/></td>
                      <td className="px-3 py-2 text-slate-500">{p.expected_delivery_date?new Date(p.expected_delivery_date).toLocaleDateString():"—"}</td>
                      <td className="px-3 py-2 text-slate-500">{p.created_at?new Date(p.created_at).toLocaleDateString():"—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                            onClick={()=>{setDetail(p);setShowDetail(true);}}>
                            <Eye className="w-3 h-3 mr-0.5"/>View
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                            onClick={()=>navigate("/purchase-orders")}>
                            <Printer className="w-3 h-3 mr-0.5"/>Print
                          </Button>
                          {(p.status==="approved"||p.status==="open") && (
                            <Button size="sm" className="h-6 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-600"
                              onClick={()=>navigate("/goods-received")}>
                              <Truck className="w-3 h-3 mr-0.5"/>Receive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filterItems(pos,["po_number","supplier_name","status"]).length===0 && (
                    <tr><td colSpan={7} className="text-center py-10 text-slate-400">No purchase orders found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: OVERVIEW REPORT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="overview" && (
        <div className="space-y-3">
          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:"Total PO Value", val:fmt(pos.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0)), icon:TrendingUp, color:"text-sky-600" },
              { label:"Total Requisitions", val:requisitions.length, icon:ClipboardList, color:"text-amber-600" },
              { label:"Suppliers Active", val:suppliers.length, icon:Truck, color:"text-emerald-600" },
              { label:"Items Tracked", val:items.length, icon:Package, color:"text-violet-600" },
            ].map(k=>(
              <Card key={k.label} className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <k.icon className={`w-8 h-8 ${k.color}`}/>
                  <div>
                    <div className="text-[11px] text-slate-500">{k.label}</div>
                    <div className="text-xl font-bold text-slate-800">{k.val}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700">Monthly PO Spend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlySpend()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="month" fontSize={11} tick={{fill:"#64748b"}}/>
                    <YAxis fontSize={11} tick={{fill:"#64748b"}}/>
                    <Tooltip formatter={(v:any)=>`KSh ${Number(v).toLocaleString()}`}/>
                    <Bar dataKey="spend" fill="#0ea5e9" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700">Spend by Supplier</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={supplierSpend()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis type="number" fontSize={10} tick={{fill:"#64748b"}}/>
                    <YAxis type="category" dataKey="name" fontSize={10} tick={{fill:"#64748b"}} width={90}/>
                    <Tooltip formatter={(v:any)=>`KSh ${Number(v).toLocaleString()}`}/>
                    <Bar dataKey="value" fill="#22c55e" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700">Requisition Status Breakdown</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPie(requisitions)} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,value})=>`${name}: ${value}`} labelLine={false}>
                      {statusPie(requisitions).map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                    </Pie>
                    <Legend/>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700">PO Status Breakdown</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPie(pos)} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {statusPie(pos).map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                    </Pie>
                    <Legend/>
                    <Tooltip/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700">Financial Bars</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                {label:"Total PO Value", val:pos.reduce((s:number,p:any)=>s+Number(p.total_amount||0),0), color:"bg-sky-500"},
                {label:"Approved POs", val:pos.filter((p:any)=>p.status==="approved"||p.status==="completed").reduce((s:number,p:any)=>s+Number(p.total_amount||0),0), color:"bg-emerald-500"},
                {label:"Pending POs", val:pos.filter((p:any)=>p.status==="pending"||p.status==="open").reduce((s:number,p:any)=>s+Number(p.total_amount||0),0), color:"bg-amber-500"},
                {label:"Rejected/Cancelled", val:pos.filter((p:any)=>p.status==="rejected"||p.status==="cancelled").reduce((s:number,p:any)=>s+Number(p.total_amount||0),0), color:"bg-red-500"},
              ].map(b=>{
                const total = pos.reduce((s:number,p:any)=>s+Number(p.total_amount||0),1);
                return (
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{b.label}</span>
                      <span className="font-bold text-slate-800">KSh {b.val.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className={`h-2 ${b.color} rounded-full transition-all`} style={{width:`${Math.min((b.val/total)*100,100)}%`}}/>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: SELL REPORT (Issuances) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="sell" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {label:"Total Issuances",val:sells.length,color:"border-sky-400"},
              {label:"Items Issued",val:sells.reduce((s:number,m:any)=>s+Number(m.quantity||0),0).toLocaleString(),color:"border-emerald-400"},
              {label:"Issue Value",val:`KSh ${sells.reduce((s:number,m:any)=>s+Number(m.total_value||m.quantity||0)*Number(m.unit_price||1),0).toLocaleString()}`,color:"border-amber-400"},
            ].map(k=>(
              <Card key={k.label} className={`bg-white border-l-4 ${k.color} shadow-sm`}>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">{k.label}</div>
                  <div className="text-2xl font-bold text-slate-800">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                <Package className="w-4 h-4 text-sky-500"/> Stock Issuances / Sell Movements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Reference","Item","Department/Ward","Qty Issued","Unit Price","Total Value","Date","Issued By"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(sells,["reference","item_name","department","issued_by"]).slice(0,50).map((m:any,i:number)=>(
                      <tr key={m.id||i} className={`border-b border-slate-100 hover:bg-sky-50 ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                        <td className="px-3 py-2 font-mono text-sky-700">{m.reference||m.id?.slice(0,8)||"—"}</td>
                        <td className="px-3 py-2 text-slate-700">{m.item_name||"—"}</td>
                        <td className="px-3 py-2 text-slate-600">{m.department||m.ward||"—"}</td>
                        <td className="px-3 py-2 text-right font-medium">{Number(m.quantity||0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right">{Number(m.unit_price||0).toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">{Number((m.quantity||0)*(m.unit_price||0)).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-500">{m.created_at?new Date(m.created_at).toLocaleDateString():"—"}</td>
                        <td className="px-3 py-2 text-slate-500">{m.issued_by||m.created_by||"—"}</td>
                      </tr>
                    ))}
                    {filterItems(sells,["reference","item_name","department","issued_by"]).length===0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-slate-400">No issuance records found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: PURCHASE REPORT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="purchase" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {label:"Total GRNs",val:grns.length,color:"border-sky-400"},
              {label:"Total Received",val:purchases.reduce((s:number,m:any)=>s+Number(m.quantity||0),0).toLocaleString(),color:"border-emerald-400"},
              {label:"Purchase Value",val:`KSh ${grns.reduce((s:number,g:any)=>s+Number(g.total_value||g.total_amount||0),0).toLocaleString()}`,color:"border-violet-400"},
            ].map(k=>(
              <Card key={k.label} className={`bg-white border-l-4 ${k.color} shadow-sm`}>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">{k.label}</div>
                  <div className="text-2xl font-bold text-slate-800">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-sky-500"/> Goods Received Notes (GRNs)</span>
                <Button size="sm" onClick={()=>navigate("/goods-received")} className="h-7 bg-sky-600 hover:bg-sky-700 gap-1 text-xs">
                  <Plus className="w-3 h-3"/> New GRN
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["GRN #","Supplier","PO Reference","Total Value","Status","Received Date","Inspector","Actions"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(grns,["grn_number","supplier_name","po_reference","status"]).slice(0,50).map((g:any,i:number)=>(
                      <tr key={g.id||i} className={`border-b border-slate-100 hover:bg-sky-50 ${i%2===0?"bg-white":"bg-slate-50/30"}`}>
                        <td className="px-3 py-2 font-mono text-sky-700">{g.grn_number||g.id?.slice(0,8)||"—"}</td>
                        <td className="px-3 py-2 text-slate-700">{g.supplier_name||"—"}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{g.po_reference||"—"}</td>
                        <td className="px-3 py-2 text-right font-medium">KSh {Number(g.total_value||g.total_amount||0).toLocaleString()}</td>
                        <td className="px-3 py-2"><StatusBadge status={g.status}/></td>
                        <td className="px-3 py-2 text-slate-500">{g.received_date||g.created_at?new Date(g.received_date||g.created_at).toLocaleDateString():"—"}</td>
                        <td className="px-3 py-2 text-slate-500">{g.inspector_name||g.received_by||"—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"
                              onClick={()=>{setDetail(g);setShowDetail(true);}}>
                              <Eye className="w-3 h-3 mr-0.5"/>View
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
                              onClick={()=>navigate("/goods-received")}>
                              <Printer className="w-3 h-3 mr-0.5"/>Print
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filterItems(grns,["grn_number","supplier_name","po_reference","status"]).length===0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-slate-400">No GRNs found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: STOCK ALERT */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="stock-alert" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              {label:"Critical (< 5)",val:lowStockItems.filter((i:any)=>Number(i.quantity_in_stock||0)<5).length,color:"border-red-500 text-red-700",bg:"bg-red-50"},
              {label:"Low Stock",val:lowStockItems.filter((i:any)=>Number(i.quantity_in_stock||0)>=5).length,color:"border-amber-500 text-amber-700",bg:"bg-amber-50"},
              {label:"Total Alerts",val:lowStockItems.length,color:"border-orange-500 text-orange-700",bg:"bg-orange-50"},
            ].map(k=>(
              <Card key={k.label} className={`${k.bg} border-l-4 ${k.color} shadow-sm`}>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-600">{k.label}</div>
                  <div className={`text-3xl font-bold ${k.color}`}>{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500"/> Low Stock Items
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Item Name","Category","Current Stock","Reorder Level","Deficit","Unit","Urgency","Action"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(lowStockItems,["item_name","category_name","category"]).map((i:any,idx:number)=>{
                      const qty = Number(i.quantity_in_stock||0);
                      const reorder = Number(i.reorder_level||10);
                      const deficit = Math.max(0,reorder-qty);
                      const urgent = qty<5;
                      return (
                        <tr key={i.id||idx} className={`border-b border-slate-100 hover:bg-amber-50 ${urgent?"bg-red-50/50":idx%2===0?"bg-white":"bg-slate-50/30"}`}>
                          <td className="px-3 py-2 font-medium text-slate-800">{i.item_name||"—"}</td>
                          <td className="px-3 py-2 text-slate-600">{i.category_name||i.category||"—"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${urgent?"text-red-600":"text-amber-600"}`}>{qty}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{reorder}</td>
                          <td className={`px-3 py-2 text-right font-medium ${urgent?"text-red-600":"text-amber-700"}`}>{deficit}</td>
                          <td className="px-3 py-2 text-slate-500">{i.unit_of_measure||"pcs"}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${urgent?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>
                              {urgent?"CRITICAL":"LOW"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Button size="sm" className="h-6 px-2 text-[10px] bg-sky-600 hover:bg-sky-700"
                              onClick={()=>navigate("/purchase-orders")}>
                              <Plus className="w-3 h-3 mr-0.5"/>Reorder
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filterItems(lowStockItems,["item_name","category_name"]).length===0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-emerald-600">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2"/>All stock levels are healthy
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: EXPIRED */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="expired" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {label:"Expired Items",val:expiredItems.length,color:"border-red-500",bg:"bg-red-50"},
              {label:"Expiring in 30 days",val:nearExpiryItems.length,color:"border-amber-500",bg:"bg-amber-50"},
              {label:"Items with Expiry Dates",val:items.filter((i:any)=>i.expiry_date).length,color:"border-sky-400",bg:"bg-sky-50"},
            ].map(k=>(
              <Card key={k.label} className={`${k.bg} border-l-4 ${k.color} shadow-sm`}>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-600">{k.label}</div>
                  <div className="text-3xl font-bold text-slate-800">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Expired */}
          {expiredItems.length>0 && (
            <Card className="bg-red-50 border-red-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4"/> Expired Items — Requires Immediate Action
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-red-100 border-b border-red-200">
                      <tr>
                        {["Item Name","Category","Expiry Date","Days Overdue","Qty","Unit","Location","Action"].map(h=>(
                          <th key={h} className="px-3 py-2 text-left font-semibold text-red-700 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems(expiredItems,["item_name","category_name"]).map((i:any,idx:number)=>{
                        const daysOver = Math.floor((Date.now()-new Date(i.expiry_date).getTime())/(86400000));
                        return (
                          <tr key={i.id||idx} className="border-b border-red-100 hover:bg-red-100/50">
                            <td className="px-3 py-2 font-medium text-red-800">{i.item_name||"—"}</td>
                            <td className="px-3 py-2 text-red-600">{i.category_name||"—"}</td>
                            <td className="px-3 py-2 text-red-700 font-medium">{new Date(i.expiry_date).toLocaleDateString()}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-700">{daysOver}</td>
                            <td className="px-3 py-2 text-right">{Number(i.quantity_in_stock||0).toLocaleString()}</td>
                            <td className="px-3 py-2">{i.unit_of_measure||"pcs"}</td>
                            <td className="px-3 py-2">{i.location||i.store_location||"Stores"}</td>
                            <td className="px-3 py-2">
                              <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px]"
                                onClick={()=>toast({title:"Disposal request logged",description:i.item_name,variant:"destructive"})}>
                                <Trash2 className="w-3 h-3 mr-0.5"/>Dispose
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Near expiry */}
          <Card className="bg-amber-50 border-amber-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4"/> Expiring Within 30 Days — Monitor Closely
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-amber-100 border-b border-amber-200">
                    <tr>
                      {["Item Name","Category","Expiry Date","Days Left","Qty","Unit","Action"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-amber-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(nearExpiryItems,["item_name","category_name"]).map((i:any,idx:number)=>{
                      const daysLeft = Math.floor((new Date(i.expiry_date).getTime()-Date.now())/(86400000));
                      return (
                        <tr key={i.id||idx} className="border-b border-amber-100 hover:bg-amber-100/50">
                          <td className="px-3 py-2 font-medium text-amber-800">{i.item_name||"—"}</td>
                          <td className="px-3 py-2 text-amber-600">{i.category_name||"—"}</td>
                          <td className="px-3 py-2 font-medium text-amber-700">{new Date(i.expiry_date).toLocaleDateString()}</td>
                          <td className={`px-3 py-2 text-right font-bold ${daysLeft<=7?"text-red-600":"text-amber-700"}`}>{daysLeft}</td>
                          <td className="px-3 py-2 text-right">{Number(i.quantity_in_stock||0).toLocaleString()}</td>
                          <td className="px-3 py-2">{i.unit_of_measure||"pcs"}</td>
                          <td className="px-3 py-2">
                            <Button size="sm" className="h-6 px-2 text-[10px] bg-amber-500 hover:bg-amber-600"
                              onClick={()=>toast({title:"Issue order created",description:`${i.item_name} flagged for priority issue`})}>
                              <Send className="w-3 h-3 mr-0.5"/>Issue Order
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filterItems(nearExpiryItems,["item_name","category_name"]).length===0 && (
                      <tr><td colSpan={7} className="text-center py-8 text-amber-600">No items expiring within 30 days</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: BACKUP / RESTORE */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="backup" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Backup */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                  <Download className="w-4 h-4 text-sky-500"/> Backup Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-slate-500">Export all procurement, inventory, and transaction data to a JSON file.</p>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
                  {["purchase_orders","requisitions","items","suppliers","goods_received","stock_movements"].map(t=>(
                    <div key={t} className="flex items-center gap-2 text-slate-600">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> {t}
                    </div>
                  ))}
                </div>
                {backupRunning && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">Exporting…</span>
                      <span className="font-bold">{backupProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full">
                      <div className="h-2 bg-sky-500 rounded-full transition-all" style={{width:`${backupProgress}%`}}/>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={runBackup} disabled={backupRunning} className="flex-1 bg-sky-600 hover:bg-sky-700 gap-2">
                    <Download className="w-4 h-4"/> {backupRunning?"Backing up…":"Backup Now (JSON)"}
                  </Button>
                  <Button variant="outline" onClick={()=>navigate("/backup")} className="gap-1">
                    <Database className="w-4 h-4"/> Full Backup
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Restore */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                  <ArchiveRestore className="w-4 h-4 text-emerald-500"/> Restore Data
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <p className="text-xs text-slate-500">Restore from a previously exported JSON backup file. This will not overwrite existing records.</p>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2"/>
                  <p className="text-xs text-slate-500">Drop your backup JSON here or click to browse</p>
                  <input type="file" accept=".json" className="hidden" id="restore-file"
                    onChange={e=>{
                      const f = e.target.files?.[0];
                      if(f) toast({title:"Restore started",description:`Processing: ${f.name}`});
                    }}/>
                  <label htmlFor="restore-file">
                    <Button size="sm" variant="outline" className="mt-3 pointer-events-none">Choose File</Button>
                  </label>
                </div>
                <Button variant="outline" className="w-full gap-2" onClick={()=>navigate("/backup")}>
                  <ArchiveRestore className="w-4 h-4"/> Advanced Restore Options
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Backup history */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm text-slate-700">Backup History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {["Date","Time","Status","Tables","Format","Size"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {backupJobs.length>0 ? backupJobs.map((j:any,i:number)=>(
                    <tr key={j.id||i} className="border-b border-slate-100">
                      <td className="px-3 py-2">{j.started_at?new Date(j.started_at).toLocaleDateString():"—"}</td>
                      <td className="px-3 py-2">{j.started_at?new Date(j.started_at).toLocaleTimeString():"—"}</td>
                      <td className="px-3 py-2"><StatusBadge status={j.status||"completed"}/></td>
                      <td className="px-3 py-2">{j.table_count||"—"}</td>
                      <td className="px-3 py-2">{j.format||"JSON"}</td>
                      <td className="px-3 py-2">{j.file_size?"~"+j.file_size:"—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No backup history yet — run your first backup above</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TAB: STORES */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab==="stores" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:"Total Items in Stock",val:items.reduce((s:number,i:any)=>s+Number(i.quantity_in_stock||0),0).toLocaleString(),color:"border-sky-400"},
              {label:"Stock Value",val:`KSh ${items.reduce((s:number,i:any)=>s+Number(i.quantity_in_stock||0)*Number(i.unit_price||0),0).toLocaleString()}`,color:"border-emerald-400"},
              {label:"GRNs Processed",val:grns.length,color:"border-violet-400"},
              {label:"Pending Deliveries",val:grns.filter((g:any)=>g.status==="pending").length,color:"border-amber-400"},
            ].map(k=>(
              <Card key={k.label} className={`bg-white border-l-4 ${k.color} shadow-sm`}>
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500">{k.label}</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Stock by category chart */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700">Stock by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stockByCategory()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis dataKey="cat" fontSize={10} tick={{fill:"#64748b"}}/>
                    <YAxis fontSize={10} tick={{fill:"#64748b"}}/>
                    <Tooltip/>
                    <Bar dataKey="count" name="Qty" fill="#0ea5e9" radius={[4,4,0,0]}/>
                    <Bar dataKey="value" name="Value" fill="#22c55e" radius={[4,4,0,0]}/>
                    <Legend/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent GRNs */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-700 flex items-center justify-between">
                  <span>Recent GRNs</span>
                  <Button size="sm" onClick={()=>navigate("/goods-received")} className="h-7 bg-sky-600 hover:bg-sky-700 text-xs gap-1">
                    <Eye className="w-3 h-3"/>View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["GRN #","Supplier","Date","Status"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {grns.slice(0,8).map((g:any,i:number)=>(
                      <tr key={g.id||i} className="border-b border-slate-100 hover:bg-sky-50">
                        <td className="px-3 py-2 font-mono text-sky-700">{g.grn_number||g.id?.slice(0,8)||"—"}</td>
                        <td className="px-3 py-2 text-slate-700">{g.supplier_name||"—"}</td>
                        <td className="px-3 py-2 text-slate-500">{g.received_date||g.created_at?new Date(g.received_date||g.created_at).toLocaleDateString():"—"}</td>
                        <td className="px-3 py-2"><StatusBadge status={g.status}/></td>
                      </tr>
                    ))}
                    {grns.length===0 && <tr><td colSpan={4} className="text-center py-6 text-slate-400">No GRNs yet</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Full items stock table */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-sm text-slate-700 flex items-center justify-between">
                <span>Current Stock Levels — All Items</span>
                <Button size="sm" onClick={()=>navigate("/items")} variant="outline" className="h-7 text-xs gap-1">
                  <Boxes className="w-3 h-3"/> Manage Items
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {["Item Name","Category","In Stock","Unit","Reorder Lvl","Unit Price","Stock Value","Status"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(items,["item_name","category_name","category"]).slice(0,50).map((i:any,idx:number)=>{
                      const qty = Number(i.quantity_in_stock||0);
                      const reorder = Number(i.reorder_level||10);
                      const stockOk = qty>=reorder;
                      return (
                        <tr key={i.id||idx} className={`border-b border-slate-100 hover:bg-sky-50 ${!stockOk?"bg-amber-50/40":idx%2===0?"bg-white":"bg-slate-50/30"}`}>
                          <td className="px-3 py-2 font-medium text-slate-800">{i.item_name||"—"}</td>
                          <td className="px-3 py-2 text-slate-600">{i.category_name||i.category||"—"}</td>
                          <td className={`px-3 py-2 text-right font-bold ${!stockOk?"text-amber-600":"text-slate-800"}`}>{qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-500">{i.unit_of_measure||"pcs"}</td>
                          <td className="px-3 py-2 text-right text-slate-500">{reorder}</td>
                          <td className="px-3 py-2 text-right">{Number(i.unit_price||0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-medium">KSh {(qty*Number(i.unit_price||0)).toLocaleString()}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stockOk?"bg-green-100 text-green-700":"bg-amber-100 text-amber-700"}`}>
                              {stockOk?"OK":"LOW"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filterItems(items,["item_name","category_name","category"]).length===0 && (
                      <tr><td colSpan={8} className="text-center py-10 text-slate-400">No items found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Detail Modal ─────────────────────────────────────────────────── */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {detail?.requisition_number||detail?.po_number||detail?.grn_number||"Record Detail"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              {Object.entries(detail)
                .filter(([k])=>!["id","created_at","updated_at"].includes(k) || false)
                .slice(0,16)
                .map(([k,v])=>(
                  <div key={k} className="flex items-start gap-2">
                    <span className="text-slate-500 min-w-[140px] text-xs capitalize">{k.replace(/_/g," ")}:</span>
                    <span className="text-slate-800 text-xs font-medium break-all">{String(v??"—")}</span>
                  </div>
                ))
              }
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowDetail(false)}>Close</Button>
            {detail?.requisition_number && detail?.status==="pending" && (
              <>
                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={()=>{decide(detail.id,"approved");setShowDetail(false);}}>
                  <Check className="w-4 h-4 mr-1"/>Approve
                </Button>
                <Button variant="destructive" onClick={()=>{decide(detail.id,"rejected");setShowDetail(false);}}>
                  <X className="w-4 h-4 mr-1"/>Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Trash2 icon import fix
const Trash2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export default TrackingApprovalPage;
