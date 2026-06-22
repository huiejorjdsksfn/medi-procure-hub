import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  Activity, TrendingUp, AlertCircle, CheckCircle2, RefreshCw, Plus,
  LayoutGrid, Heart, Lightbulb, Boxes, Layers, Zap, Snowflake, Wifi,
  GitBranch, FileBarChart, Star, Users, Bell, Settings, BarChart3,
  Calendar, Printer, Play, Pause, X, Eye, Package, Truck, ShoppingCart,
  Database, Shield, Globe, Thermometer, Server, Monitor, CheckSquare,
  ChevronRight, ChevronLeft, List, Grid, Clock, AlertTriangle,
  TrendingDown, ArrowUp, ArrowDown, Minus, Save, Trash2, Edit,
  Download, Upload, Search, Filter, Building2, MapPin, Phone, Mail, ExternalLink,
  Cpu, HardDrive, Cloud, Signal, MessageSquare, Video, Mic, MailOpen,
  FileText, UsersRound, DollarSign, Pill, Stethoscope, Bed, Car,
  GraduationCap, UserCheck, Briefcase, Target, Gauge, Battery, WifiHigh,
} from "lucide-react";

// ─── Professional color palette ────────────────────────────────────────────
const COLORS = {
  primary: "#0a2558",      // Deep navy
  secondary: "#1e40af",     // Royal blue
  accent: "#3b82f6",        // Bright blue
  success: "#10b981",       // Emerald
  warning: "#f59e0b",       // Amber
  danger: "#ef4444",        // Red
  purple: "#8b5cf6",        // Violet
  cyan: "#06b6d4",          // Cyan
  orange: "#f97316",        // Orange
  pink: "#ec4899",           // Pink
  dark: "#0f172a",           // Slate 900
  darker: "#020617",         // Slate 950
  card: "#1e293b",          // Slate 800
  cardHover: "#334155",      // Slate 700
  text: "#f1f5f9",          // Slate 100
  textMuted: "#94a3b8",      // Slate 400
  border: "#334155",        // Slate 700
};

const PIE_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"];

// ─── Section definitions - Healthcare Enterprise ────────────────────────────
const SIDEBAR_SECTIONS = [
  { key:"overview",     icon:LayoutGrid,   label:"Hospital Overview" },
  { key:"procurement", icon:ShoppingCart, label:"Procurement" },
  { key:"finance",     icon:DollarSign,   label:"Finance & Budget" },
  { key:"inventory",    icon:Pill,         label:"Pharmacy & Inventory" },
  { key:"clinical",    icon:Stethoscope,  label:"Clinical Services" },
  { key:"hr",          icon:Users,        label:"HR & Staff" },
  { key:"facilities",  icon:Building2,    label:"Facilities" },
  { key:"communications",icon:MessageSquare,label:"Communications" },
  { key:"analytics",   icon:BarChart3,    label:"Analytics" },
  { key:"settings",    icon:Settings,     label:"System Settings" },
];

const TOP_TABS = ["Executive","Operations","Clinical","Finance","HR","Infrastructure","Communications","Reports","Settings"];

// ─── Mini badge ───────────────────────────────────────────────────────────────
const StatusDot = ({ok, size="sm"}:{ok:boolean, size?:string}) => (
  <span className={`inline-block rounded-full ${size==="sm"?"w-2 h-2":"w-3 h-3"} ${ok?"bg-emerald-400 animate-pulse":"bg-red-400"}`}/>
);

// ─── Trend indicator ───────────────────────────────────────────────────────────
const Trend = ({val, size="sm"}:{val:number, size?:string}) => val>0
  ? <span className={`${size==="sm"?"text-xs":"text-sm"} text-emerald-400 flex items-center gap-0.5`}><ArrowUp className={size==="sm"?"w-3 h-3":"w-4 h-4"}/>{val}%</span>
  : val<0
  ? <span className={`${size==="sm"?"text-xs":"text-sm"} text-red-400 flex items-center gap-0.5`}><ArrowDown className={size==="sm"?"w-3 h-3":"w-4 h-4"}/>{Math.abs(val)}%</span>
  : <span className={`${size==="sm"?"text-xs":"text-sm"} text-slate-400 flex items-center gap-0.5`}><Minus className={size==="sm"?"w-3 h-3":"w-4 h-4"}/>0%</span>;

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({label, value, icon:Icon, trend, color, subtitle}:{label:string,value:string|number,icon:any,trend?:number,color:string,subtitle?:string}) => (
  <Card className={`bg-gradient-to-br ${color} border-slate-700/50 backdrop-blur shadow-xl hover:shadow-2xl transition-all duration-300`}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white/10`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend !== undefined && <Trend val={trend} size="sm" />}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm font-medium text-white/80">{label}</div>
      {subtitle && <div className="text-xs text-white/60 mt-1">{subtitle}</div>}
    </CardContent>
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const EnterpriseDashboardPage = () => {
  const navigate = useNavigate();
  const slideshowRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // ── State ──────────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState("overview");
  const [activeTopTab, setActiveTopTab] = useState("Executive");
  const [slideshowOn, setSlideshowOn] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(["overview","inventory"]);
  const [dashboards, setDashboards] = useState<{id:string;name:string;section:string}[]>([
    {id:"d1",name:"Procurement Overview",section:"overview"},
    {id:"d2",name:"Inventory Watch",section:"inventory"},
    {id:"d3",name:"Health Monitor",section:"health"},
  ]);
  const [widgets, setWidgets] = useState<{id:string;type:string;title:string;section:string}[]>([
    {id:"w1",type:"kpi",title:"Total Spend",section:"overview"},
    {id:"w2",type:"chart",title:"Spend Trend",section:"overview"},
    {id:"w3",type:"table",title:"Low Stock Alert",section:"inventory"},
    {id:"w4",type:"kpi",title:"Active Suppliers",section:"overview"},
  ]);

  // Modals
  const [showAddDashboard, setShowAddDashboard]   = useState(false);
  const [showManageDashboard, setShowManageDashboard] = useState(false);
  const [showAddWidget, setShowAddWidget]         = useState(false);
  const [showSchedule, setShowSchedule]           = useState(false);
  const [showChangeForm, setShowChangeForm]       = useState(false);

  // Forms
  const [newDashName, setNewDashName] = useState("");
  const [newWidgetType, setNewWidgetType] = useState("kpi");
  const [newWidgetTitle, setNewWidgetTitle] = useState("");
  const [scheduleEmail, setScheduleEmail] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState("weekly");
  const [scheduleReport, setScheduleReport] = useState("overview");
  const [changeForm, setChangeForm] = useState({title:"",type:"maintenance",priority:"medium",description:""});
  const [searchQuery, setSearchQuery] = useState("");

  // Data
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({
    totalBeds:150, occupiedBeds:127, bedOccupancy:84.7,
    patientsToday:89, emergencyCases:12, surgeries:5,
    totalSpend:2845000, budgetUsed:68.4, budgetRemaining:1315000,
    spend:0, suppliers:0, openPOs:0, pendingApprovals:0,
    incidents:0, advisories:0, healthy:100, items:0, grns:0,
  });
  const [bySupplier, setBySupplier] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [perf, setPerf] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [pos, setPOs] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [changeLog, setChangeLog] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // ── Load Data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        {data:posData},{data:supsData},{data:reqsData},{data:itemsData},
        {data:grnsData},{data:auditData},
      ] = await Promise.all([
        supabase.from("purchase_orders").select("*").order("created_at",{ascending:false}),
        supabase.from("suppliers").select("*"),
        supabase.from("requisitions").select("*").order("created_at",{ascending:false}),
        supabase.from("items").select("*"),
        (supabase as any).from("goods_received").select("*").order("created_at",{ascending:false}).limit(50),
        (supabase as any).from("audit_log").select("*").order("created_at",{ascending:false}).limit(30),
      ]);

      setPOs(posData||[]);
      setSuppliers(supsData||[]);
      setRequisitions(reqsData||[]);
      setItems(itemsData||[]);
      setGrns(grnsData||[]);

      const auditItems = (auditData||[]).map((a:any,i:number)=>({
        ...a, id:a.id||`evt-${i}`,
        title: a.action||a.event_type||"System Event",
        time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : "—",
      }));
      setEvents(auditItems);

      const totalSpend = (posData||[]).reduce((s:number,p:any)=>s+Number(p.total_amount||0),0);
      const openPOs = (posData||[]).filter((p:any)=>p.status!=="closed"&&p.status!=="completed"&&p.status!=="cancelled").length;
      const pending = (reqsData||[]).filter((r:any)=>r.status==="pending").length;
      const lowStock = (itemsData||[]).filter((i:any)=>Number(i.quantity_in_stock||0)<Number(i.reorder_level||10)).length;
      setOverview({
        spend:totalSpend, suppliers:(supsData||[]).length, openPOs, pendingApprovals:pending,
        incidents:0, advisories:lowStock, healthy:Math.max(60,100-lowStock*2),
        items:(itemsData||[]).length, grns:(grnsData||[]).length,
      });

      // supplier spend chart
      const supMap:Record<string,number> = {};
      (posData||[]).forEach((p:any)=>{
        const name = (supsData||[]).find((s:any)=>s.id===p.supplier_id)?.name||p.supplier_name||"Unknown";
        supMap[name] = (supMap[name]||0) + Number(p.total_amount||0);
      });
      setBySupplier(Object.entries(supMap).slice(0,8).map(([name,value])=>({name:name.slice(0,13),value})));

      // monthly trend
      const months:Record<string,{spend:number,count:number}> = {};
      (posData||[]).forEach((p:any)=>{
        const m = new Date(p.created_at).toLocaleString("en",{month:"short"});
        if(!months[m]) months[m]={spend:0,count:0};
        months[m].spend += Number(p.total_amount||0);
        months[m].count++;
      });
      setTrend(Object.entries(months).map(([month,d])=>({month,...d})));

      // performance data
      setPerf(Array.from({length:24},(_,i)=>({
        h:`${i}:00`,
        response:80+Math.round(Math.random()*60),
        load:30+Math.round(Math.random()*50),
        errors:Math.round(Math.random()*3),
      })));

      setChangeLog([
        {id:"chg-001",title:"Drug Store HVAC Maintenance",type:"maintenance",priority:"high",status:"pending",created_at:new Date().toISOString()},
        {id:"chg-002",title:"Network Switch Upgrade — Ward B",type:"infrastructure",priority:"medium",status:"approved",created_at:new Date().toISOString()},
        {id:"chg-003",title:"Supabase Edge Function Deploy",type:"software",priority:"low",status:"completed",created_at:new Date().toISOString()},
      ]);
    } catch(e){ console.error(e); }
    setLoading(false);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  // ── Slideshow ──────────────────────────────────────────────────────────
  useEffect(()=>{
    if(slideshowOn){
      const keys = SIDEBAR_SECTIONS.map(s=>s.key);
      let idx = keys.indexOf(activeSection);
      slideshowRef.current = setInterval(()=>{
        idx = (idx+1) % keys.length;
        setActiveSection(keys[idx]);
      },5000);
    } else {
      if(slideshowRef.current) clearInterval(slideshowRef.current);
    }
    return ()=>{ if(slideshowRef.current) clearInterval(slideshowRef.current); };
  },[slideshowOn]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const addDashboard = () => {
    if(!newDashName.trim()) return;
    const id = `d${Date.now()}`;
    setDashboards(d=>[...d,{id,name:newDashName,section:activeSection}]);
    toast({title:"Dashboard added",description:newDashName});
    setNewDashName(""); setShowAddDashboard(false);
  };

  const deleteDashboard = (id:string) => {
    setDashboards(d=>d.filter(x=>x.id!==id));
    toast({title:"Dashboard removed"});
  };

  const addWidget = () => {
    if(!newWidgetTitle.trim()) return;
    const id = `w${Date.now()}`;
    setWidgets(w=>[...w,{id,type:newWidgetType,title:newWidgetTitle,section:activeSection}]);
    toast({title:"Widget added",description:newWidgetTitle});
    setNewWidgetTitle(""); setShowAddWidget(false);
  };

  const removeWidget = (id:string) => {
    setWidgets(w=>w.filter(x=>x.id!==id));
    toast({title:"Widget removed"});
  };

  const toggleFavorite = () => {
    const already = favorites.includes(activeSection);
    setFavorites(f=>already?f.filter(x=>x!==activeSection):[...f,activeSection]);
    toast({title:already?"Removed from favorites":"Added to favorites",description:SIDEBAR_SECTIONS.find(s=>s.key===activeSection)?.label});
  };

  const submitSchedule = () => {
    if(!scheduleEmail) return;
    toast({title:"Schedule saved",description:`${scheduleReport} report → ${scheduleEmail} (${scheduleFreq})`});
    setShowSchedule(false);
  };

  const submitChange = async () => {
    if(!changeForm.title) return;
    try {
      await (supabase as any).from("audit_log").insert({
        action:`Change Request: ${changeForm.title}`,
        table_name:"change_requests", event_type:"insert",
        new_data:JSON.stringify(changeForm),
        created_at:new Date().toISOString(),
      });
    } catch {}
    const newChg = {id:`chg-${Date.now()}`,title:changeForm.title,type:changeForm.type,priority:changeForm.priority,status:"pending",created_at:new Date().toISOString()};
    setChangeLog(c=>[newChg,...c]);
    toast({title:"Change request submitted",description:changeForm.title});
    setChangeForm({title:"",type:"maintenance",priority:"medium",description:""});
    setShowChangeForm(false);
  };

  // ── Chart helpers ─────────────────────────────────────────────────────────
  const stockByCategory = () => {
    const m:Record<string,number> = {};
    items.forEach((i:any)=>{ const c=i.category_name||"General"; m[c]=(m[c]||0)+Number(i.quantity_in_stock||0); });
    return Object.entries(m).slice(0,6).map(([name,value])=>({name,value}));
  };

  const reqStatusPie = () => {
    const m:Record<string,number> = {};
    requisitions.forEach((r:any)=>{ m[r.status||"unknown"]=(m[r.status||"unknown"]||0)+1; });
    return Object.entries(m).map(([name,value])=>({name,value}));
  };

  const lowStockItems = items.filter((i:any)=>Number(i.quantity_in_stock||0)<Number(i.reorder_level||10)).slice(0,10);

  const integrations = [
    {name:"Supabase DB",      ok:true,  latency:"12ms"},
    {name:"SMS Gateway",      ok:true,  latency:"220ms"},
    {name:"WhatsApp API",     ok:true,  latency:"185ms"},
    {name:"Email Service",    ok:true,  latency:"90ms"},
    {name:"HMIS Interface",   ok:false, latency:"—"},
    {name:"ODBC Bridge",      ok:true,  latency:"45ms"},
    {name:"Print Service",    ok:true,  latency:"32ms"},
    {name:"EdgeOne CDN",      ok:true,  latency:"8ms"},
  ];

  const coldChain = [
    {location:"Pharmacy Fridge A",temp:"4.2°C",status:"ok",lastCheck:"10 mins ago"},
    {location:"Vaccine Store",temp:"2.8°C",status:"ok",lastCheck:"8 mins ago"},
    {location:"Blood Bank",temp:"4.0°C",status:"ok",lastCheck:"5 mins ago"},
    {location:"Lab Reagents",temp:"6.1°C",status:"warning",lastCheck:"3 mins ago"},
    {location:"Mortuary",temp:"-18.5°C",status:"ok",lastCheck:"12 mins ago"},
  ];

  // ── Section content renderer ─────────────────────────────────────────────
  const renderSection = () => {
    switch(activeSection) {

      // ── ENTERPRISE OVERVIEW ────────────────────────────────────────────
      case "overview": return (
        <div className="space-y-5">
          {/* Health Status Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-red-900/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-red-500/30 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white"/>
                </div>
                <div>
                  <div className="text-xs text-red-200 font-medium">Incidents</div>
                  <div className="font-bold text-white text-2xl">{overview.incidents}</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-amber-900/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-amber-400/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white"/>
                </div>
                <div>
                  <div className="text-xs text-amber-100 font-medium">Advisories</div>
                  <div className="font-bold text-white text-2xl">{overview.advisories}</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 rounded-xl p-4 flex items-center justify-between shadow-lg shadow-emerald-900/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-emerald-400/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-white"/>
                </div>
                <div>
                  <div className="text-xs text-emerald-200 font-medium">Health Score</div>
                  <div className="font-bold text-white text-2xl">{overview.healthy}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:"Total Spend",val:`KSh ${overview.spend.toLocaleString()}`,icon:TrendingUp,trend:12,color:"text-blue-400",bg:"from-blue-600/20 to-blue-700/10"},
              {label:"Active Suppliers",val:overview.suppliers,icon:Users,trend:2,color:"text-emerald-400",bg:"from-emerald-600/20 to-emerald-700/10"},
              {label:"Open POs",val:overview.openPOs,icon:ShoppingCart,trend:-1,color:"text-amber-400",bg:"from-amber-600/20 to-amber-700/10"},
              {label:"Pending Approvals",val:overview.pendingApprovals,icon:Bell,trend:0,color:"text-violet-400",bg:"from-violet-600/20 to-violet-700/10"},
              {label:"Items in Stock",val:overview.items,icon:Package,trend:3,color:"text-cyan-400",bg:"from-cyan-600/20 to-cyan-700/10"},
              {label:"GRNs Processed",val:overview.grns,icon:Truck,trend:5,color:"text-pink-400",bg:"from-pink-600/20 to-pink-700/10"},
              {label:"Low Stock Alerts",val:overview.advisories,icon:AlertTriangle,trend:-8,color:"text-red-400",bg:"from-red-600/20 to-red-700/10"},
              {label:"System Uptime",val:"99.7%",icon:Heart,trend:1,color:"text-emerald-400",bg:"from-emerald-600/20 to-emerald-700/10"},
            ].map((k)=>(
              <Card key={k.label} className={`bg-gradient-to-br ${k.bg} border-slate-700/50 hover:border-slate-600 transition-all hover:shadow-lg`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-lg bg-slate-800/50 flex items-center justify-center`}>
                      <k.icon className={`w-5 h-5 ${k.color}`}/>
                    </div>
                    <Trend val={k.trend}/>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">{k.label}</div>
                  <div className="text-xl font-bold text-white mt-0.5">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur shadow-xl">
              <CardHeader className="pb-2 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    Monthly Spend Trend
                  </CardTitle>
                  <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-700/50 text-[10px]">KSh</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5}/>
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11}/>
                    <YAxis stroke="#64748b" fontSize={10}/>
                    <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:"8px"}} formatter={(v:any)=>[`KSh ${Number(v).toLocaleString()}`, "Spend"]}/>
                    <Area type="monotone" dataKey="spend" stroke="#10b981" fill="url(#colorSpend)" strokeWidth={2}/>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur shadow-xl">
              <CardHeader className="pb-2 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    Spend by Supplier
                  </CardTitle>
                  <Badge className="bg-blue-900/50 text-blue-300 border-blue-700/50 text-[10px]">Top 8</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={bySupplier}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5}/>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10}/>
                    <YAxis stroke="#64748b" fontSize={10}/>
                    <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:"8px"}} formatter={(v:any)=>[`KSh ${Number(v).toLocaleString()}`, "Spend"]}/>
                    <Bar dataKey="value" fill="#3b82f6" radius={[6,6,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur shadow-xl">
              <CardHeader className="pb-2 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-400" />
                    Requisition Status
                  </CardTitle>
                  <Badge className="bg-violet-900/50 text-violet-300 border-violet-700/50 text-[10px]">Distribution</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={reqStatusPie()} cx="50%" cy="50%" outerRadius={80} dataKey="value" stroke="none">
                      {reqStatusPie().map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{color:"#94a3b8",fontSize:11}}/>
                    <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:"8px"}}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur shadow-xl">
              <CardHeader className="pb-2 border-b border-slate-700/30">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-slate-200 flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    System Performance
                  </CardTitle>
                  <Badge className="bg-cyan-900/50 text-cyan-300 border-cyan-700/50 text-[10px]">24 Hours</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={perf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.5}/>
                    <XAxis dataKey="h" stroke="#64748b" fontSize={10}/>
                    <YAxis stroke="#64748b" fontSize={10}/>
                    <Tooltip contentStyle={{background:"#1e293b",border:"1px solid #334155",borderRadius:"8px"}}/>
                    <Legend wrapperStyle={{color:"#94a3b8",fontSize:11}}/>
                    <Line type="monotone" dataKey="response" stroke="#06b6d4" dot={false} name="Response (ms)" strokeWidth={2}/>
                    <Line type="monotone" dataKey="load" stroke="#f59e0b" dot={false} name="CPU (%)" strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      );

      // ── ENTERPRISE HEALTH ──────────────────────────────────────────────
      case "health": return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:"System Uptime",val:"99.7%",icon:Server,good:true},
              {label:"DB Health",val:"Excellent",icon:Database,good:true},
              {label:"API Response",val:"142ms",icon:Activity,good:true},
              {label:"Error Rate",val:"0.03%",icon:AlertCircle,good:true},
            ].map(k=>(
              <Card key={k.label} className="bg-[hsl(215_28%_14%)] border-sidebar-border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <k.icon className={`w-5 h-5 ${k.good?"text-emerald-400":"text-red-400"}`}/>
                    <StatusDot ok={k.good}/>
                  </div>
                  <div className="text-xs text-sidebar-foreground/50 mt-2">{k.label}</div>
                  <div className="text-2xl font-bold text-sidebar-foreground">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Integration Health</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {integrations.map(int=>(
                    <div key={int.name} className="flex items-center justify-between py-1.5 border-b border-sidebar-border/30">
                      <div className="flex items-center gap-2">
                        <StatusDot ok={int.ok}/>
                        <span className="text-sm text-sidebar-foreground/80">{int.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-sidebar-foreground/50">{int.latency}</span>
                        <Badge className={int.ok?"bg-emerald-900 text-emerald-300":"bg-red-900 text-red-300"}>
                          {int.ok?"Online":"Offline"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">24h Error & Load</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={perf.slice(0,12)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3547"/>
                    <XAxis dataKey="h" stroke="#667" fontSize={10}/>
                    <YAxis stroke="#667" fontSize={10}/>
                    <Tooltip contentStyle={{background:"#1c2433",border:"none",borderRadius:"8px"}}/>
                    <Legend wrapperStyle={{color:"#9aa",fontSize:11}}/>
                    <Line type="monotone" dataKey="load" stroke="#f59e0b" dot={false} name="Load %" strokeWidth={2}/>
                    <Line type="monotone" dataKey="errors" stroke="#ef4444" dot={false} name="Errors" strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      );

      // ── WHAT-IF ────────────────────────────────────────────────────────
      case "whatif": return (
        <div className="space-y-4">
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-sidebar-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400"/> Scenario Planning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-sidebar-foreground/60">Model procurement scenarios and forecast the impact on budget and stock levels.</p>
              {[
                {label:"If supplier prices rise 10%",impact:`+KSh ${Math.round(overview.spend*0.10).toLocaleString()}`,color:"text-red-400"},
                {label:"If demand doubles next quarter",impact:`+${overview.advisories*2} low-stock alerts`,color:"text-amber-400"},
                {label:"If 2 suppliers drop off",impact:`${Math.round(overview.suppliers*0.25)} fewer options`,color:"text-orange-400"},
                {label:"If budget cut by 20%",impact:`KSh ${Math.round(overview.spend*0.80).toLocaleString()} available`,color:"text-violet-400"},
                {label:"Optimal reorder at 60-day lead time",impact:`Save KSh ${Math.round(overview.spend*0.05).toLocaleString()} / year`,color:"text-emerald-400"},
              ].map(s=>(
                <div key={s.label} className="flex items-center justify-between py-2 border-b border-sidebar-border/30">
                  <span className="text-sm text-sidebar-foreground/80">{s.label}</span>
                  <span className={`text-sm font-bold ${s.color}`}>{s.impact}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Budget Scenario Model</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={[
                  {scenario:"Current",budget:overview.spend,spend:overview.spend},
                  {scenario:"+10% prices",budget:overview.spend,spend:Math.round(overview.spend*1.10)},
                  {scenario:"2x demand",budget:overview.spend,spend:Math.round(overview.spend*1.85)},
                  {scenario:"-20% budget",budget:Math.round(overview.spend*0.80),spend:overview.spend},
                  {scenario:"Optimised",budget:overview.spend,spend:Math.round(overview.spend*0.92)},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3547"/>
                  <XAxis dataKey="scenario" stroke="#667" fontSize={10}/>
                  <YAxis stroke="#667" fontSize={10}/>
                  <Tooltip contentStyle={{background:"#1c2433",border:"none",borderRadius:"8px"}} formatter={(v:any)=>`KSh ${Number(v).toLocaleString()}`}/>
                  <Legend wrapperStyle={{color:"#9aa",fontSize:11}}/>
                  <Bar dataKey="budget" name="Budget" fill="#3b82f6" radius={[4,4,0,0]}/>
                  <Bar dataKey="spend" name="Projected Spend" fill="#f59e0b" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );

      // ── INVENTORY ──────────────────────────────────────────────────────
      case "inventory": return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:"Total SKUs",val:items.length,icon:Package,color:"text-sky-400"},
              {label:"Total Stock Units",val:items.reduce((s:number,i:any)=>s+Number(i.quantity_in_stock||0),0).toLocaleString(),icon:Boxes,color:"text-emerald-400"},
              {label:"Stock Value",val:`KSh ${items.reduce((s:number,i:any)=>s+Number(i.quantity_in_stock||0)*Number(i.unit_price||0),0).toLocaleString()}`,icon:TrendingUp,color:"text-violet-400"},
              {label:"Low Stock",val:lowStockItems.length,icon:AlertTriangle,color:"text-amber-400"},
            ].map(k=>(
              <Card key={k.label} className="bg-[hsl(215_28%_14%)] border-sidebar-border">
                <CardContent className="p-3">
                  <k.icon className={`w-5 h-5 ${k.color}`}/>
                  <div className="text-xs text-sidebar-foreground/50 mt-2">{k.label}</div>
                  <div className="text-xl font-bold text-sidebar-foreground">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Stock by Category</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stockByCategory()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a3547"/>
                    <XAxis dataKey="name" stroke="#667" fontSize={10}/>
                    <YAxis stroke="#667" fontSize={10}/>
                    <Tooltip contentStyle={{background:"#1c2433",border:"none",borderRadius:"8px"}}/>
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-sidebar-foreground flex items-center justify-between">
                  <span>Low Stock Alerts</span>
                  <Button size="sm" onClick={()=>navigate("/items")} className="h-7 bg-amber-600 hover:bg-amber-700 text-xs">View All</Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead className="bg-[hsl(215_35%_10%)]">
                    <tr>
                      {["Item","Qty","Reorder","Status"].map(h=>(
                        <th key={h} className="px-3 py-2 text-left text-sidebar-foreground/60 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map((i:any,idx:number)=>{
                      const qty=Number(i.quantity_in_stock||0);
                      const crit=qty<5;
                      return (
                        <tr key={idx} className="border-b border-sidebar-border/30 hover:bg-[hsl(215_35%_12%)]">
                          <td className="px-3 py-1.5 text-sidebar-foreground/80">{i.item_name||"—"}</td>
                          <td className={`px-3 py-1.5 font-bold ${crit?"text-red-400":"text-amber-400"}`}>{qty}</td>
                          <td className="px-3 py-1.5 text-sidebar-foreground/50">{i.reorder_level||10}</td>
                          <td className="px-3 py-1.5"><Badge className={crit?"bg-red-900 text-red-300":"bg-amber-900 text-amber-300"}>{crit?"Critical":"Low"}</Badge></td>
                        </tr>
                      );
                    })}
                    {!lowStockItems.length&&<tr><td colSpan={4} className="text-center py-6 text-emerald-400">All stock levels healthy ✓</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      );

      // ── SPACE ──────────────────────────────────────────────────────────
      case "space": return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              {ward:"Pharmacy Store",capacity:100,used:72,color:"#3b82f6"},
              {ward:"Ward A Stores",capacity:100,used:45,color:"#10b981"},
              {ward:"ICU Supplies",capacity:100,used:88,color:"#ef4444"},
              {ward:"OPD Pharmacy",capacity:100,used:60,color:"#f59e0b"},
              {ward:"Theatre Stores",capacity:100,used:35,color:"#8b5cf6"},
              {ward:"Lab Supplies",capacity:100,used:54,color:"#06b6d4"},
            ].map(w=>(
              <Card key={w.ward} className="bg-[hsl(215_28%_14%)] border-sidebar-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-sidebar-foreground/70 font-medium">{w.ward}</span>
                    <span className="text-sm font-bold" style={{color:w.color}}>{w.used}%</span>
                  </div>
                  <div className="h-3 bg-[hsl(215_35%_10%)] rounded-full">
                    <div className="h-3 rounded-full transition-all" style={{width:`${w.used}%`,background:w.color}}/>
                  </div>
                  <div className="text-xs text-sidebar-foreground/40 mt-1">{w.used} / {w.capacity} cubic metres used</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Facility Space Utilisation</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  {ward:"Pharmacy",used:72,free:28},{ward:"Ward A",used:45,free:55},
                  {ward:"ICU",used:88,free:12},{ward:"OPD",used:60,free:40},
                  {ward:"Theatre",used:35,free:65},{ward:"Lab",used:54,free:46},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3547"/>
                  <XAxis dataKey="ward" stroke="#667" fontSize={10}/>
                  <YAxis stroke="#667" fontSize={10}/>
                  <Tooltip contentStyle={{background:"#1c2433",border:"none",borderRadius:"8px"}}/>
                  <Legend wrapperStyle={{color:"#9aa",fontSize:11}}/>
                  <Bar dataKey="used" name="Used %" fill="#3b82f6" stackId="a" radius={[0,0,0,0]}/>
                  <Bar dataKey="free" name="Free %" fill="#2a3547" stackId="a" radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );

      // ── POWER ──────────────────────────────────────────────────────────
      case "power": return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:"Total Power (kWh/day)",val:"842",icon:Zap,color:"text-yellow-400"},
              {label:"Generator Load",val:"34%",icon:Activity,color:"text-orange-400"},
              {label:"Solar Output",val:"0 kW",icon:Lightbulb,color:"text-sky-400"},
              {label:"Utility Bill (Est.)",val:"KSh 4,210",icon:TrendingUp,color:"text-violet-400"},
            ].map(k=>(
              <Card key={k.label} className="bg-[hsl(215_28%_14%)] border-sidebar-border">
                <CardContent className="p-3">
                  <k.icon className={`w-5 h-5 ${k.color}`}/>
                  <div className="text-xs text-sidebar-foreground/50 mt-2">{k.label}</div>
                  <div className="text-2xl font-bold text-sidebar-foreground">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Power Consumption (24h)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={perf.map(p=>({h:p.h,kWh:20+Math.round(Math.random()*40)}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3547"/>
                  <XAxis dataKey="h" stroke="#667" fontSize={10}/>
                  <YAxis stroke="#667" fontSize={10}/>
                  <Tooltip contentStyle={{background:"#1c2433",border:"none",borderRadius:"8px"}}/>
                  <Area type="monotone" dataKey="kWh" stroke="#f59e0b" fill="#f59e0b33" strokeWidth={2} name="kWh"/>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );

      // ── COOLING ────────────────────────────────────────────────────────
      case "cooling": return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {coldChain.map(c=>(
              <Card key={c.location} className={`border-sidebar-border ${c.status==="warning"?"bg-amber-900/20":"bg-[hsl(215_28%_14%)]"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className={`w-5 h-5 ${c.status==="warning"?"text-amber-400":"text-sky-400"}`}/>
                      <span className="text-sm font-medium text-sidebar-foreground">{c.location}</span>
                    </div>
                    <Badge className={c.status==="warning"?"bg-amber-900 text-amber-300":"bg-emerald-900 text-emerald-300"}>
                      {c.status==="warning"?"Warning":"OK"}
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold text-sidebar-foreground mt-2">{c.temp}</div>
                  <div className="text-xs text-sidebar-foreground/40 mt-1">Last checked: {c.lastCheck}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Cold Chain Temperature Log (simulated)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={Array.from({length:24},(_,i)=>({h:`${i}:00`,pharma:3.8+Math.random()*0.8,vaccine:2.5+Math.random()*0.7,blood:3.9+Math.random()*0.3}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3547"/>
                  <XAxis dataKey="h" stroke="#667" fontSize={10}/>
                  <YAxis stroke="#667" fontSize={10}/>
                  <Tooltip contentStyle={{background:"#1c2433",border:"none",borderRadius:"8px"}}/>
                  <Legend wrapperStyle={{color:"#9aa",fontSize:11}}/>
                  <Line type="monotone" dataKey="pharma" stroke="#06b6d4" dot={false} name="Pharmacy" strokeWidth={2}/>
                  <Line type="monotone" dataKey="vaccine" stroke="#10b981" dot={false} name="Vaccine" strokeWidth={2}/>
                  <Line type="monotone" dataKey="blood" stroke="#ef4444" dot={false} name="Blood Bank" strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );

      // ── CONNECTIVITY ───────────────────────────────────────────────────
      case "connectivity": return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:"Active Integrations",val:`${integrations.filter(i=>i.ok).length}/${integrations.length}`,icon:Globe,color:"text-sky-400"},
              {label:"Avg Latency",val:"121ms",icon:Activity,color:"text-emerald-400"},
              {label:"Uptime (30d)",val:"99.4%",icon:Shield,color:"text-violet-400"},
              {label:"Errors (24h)",val:"3",icon:AlertCircle,color:"text-amber-400"},
            ].map(k=>(
              <Card key={k.label} className="bg-[hsl(215_28%_14%)] border-sidebar-border">
                <CardContent className="p-3">
                  <k.icon className={`w-5 h-5 ${k.color}`}/>
                  <div className="text-xs text-sidebar-foreground/50 mt-2">{k.label}</div>
                  <div className="text-2xl font-bold text-sidebar-foreground">{k.val}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Integration Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {integrations.map(int=>(
                  <div key={int.name} className="flex items-center gap-3 py-2 border-b border-sidebar-border/20">
                    <StatusDot ok={int.ok}/>
                    <span className="flex-1 text-sm text-sidebar-foreground/80">{int.name}</span>
                    <span className="text-xs font-mono text-sidebar-foreground/50">{int.latency}</span>
                    <div className="w-24 h-1.5 bg-[hsl(215_35%_10%)] rounded-full">
                      <div className={`h-1.5 rounded-full ${int.ok?"bg-emerald-400":"bg-red-400"}`} style={{width:int.ok?"100%":"0%"}}/>
                    </div>
                    <Badge className={int.ok?"bg-emerald-900 text-emerald-300 text-[10px]":"bg-red-900 text-red-300 text-[10px]"}>
                      {int.ok?"Online":"Down"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );

      // ── CHANGE ─────────────────────────────────────────────────────────
      case "change": return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-3 gap-3 flex-1 mr-3">
              {[
                {label:"Pending",val:changeLog.filter(c=>c.status==="pending").length,color:"border-amber-500"},
                {label:"Approved",val:changeLog.filter(c=>c.status==="approved").length,color:"border-sky-500"},
                {label:"Completed",val:changeLog.filter(c=>c.status==="completed").length,color:"border-emerald-500"},
              ].map(k=>(
                <Card key={k.label} className={`bg-[hsl(215_28%_14%)] border-l-4 ${k.color} border-sidebar-border`}>
                  <CardContent className="p-3">
                    <div className="text-xs text-sidebar-foreground/50">{k.label}</div>
                    <div className="text-3xl font-bold text-sidebar-foreground">{k.val}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button onClick={()=>setShowChangeForm(true)} className="bg-sky-600 hover:bg-sky-700 gap-1">
              <Plus className="w-4 h-4"/> New Change
            </Button>
          </div>

          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-sidebar-foreground">Change Requests</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-[hsl(215_35%_10%)]">
                  <tr>
                    {["ID","Title","Type","Priority","Status","Date"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left text-sidebar-foreground/60 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {changeLog.map((c:any,i:number)=>(
                    <tr key={c.id||i} className="border-b border-sidebar-border/30 hover:bg-[hsl(215_35%_12%)]">
                      <td className="px-3 py-2 font-mono text-sky-400">{c.id||"—"}</td>
                      <td className="px-3 py-2 text-sidebar-foreground/80">{c.title||"—"}</td>
                      <td className="px-3 py-2 text-sidebar-foreground/60 capitalize">{c.type||"—"}</td>
                      <td className="px-3 py-2">
                        <Badge className={c.priority==="high"?"bg-red-900 text-red-300":c.priority==="medium"?"bg-amber-900 text-amber-300":"bg-slate-700 text-slate-300"}>
                          {c.priority||"low"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={c.status==="completed"?"bg-emerald-900 text-emerald-300":c.status==="approved"?"bg-sky-900 text-sky-300":"bg-amber-900 text-amber-300"}>
                          {c.status||"pending"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-sidebar-foreground/40">{c.created_at?new Date(c.created_at).toLocaleDateString():"—"}</td>
                    </tr>
                  ))}
                  {!changeLog.length&&<tr><td colSpan={6} className="text-center py-8 text-sidebar-foreground/30">No change requests yet</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      );

      // ── DATA REPORTS ───────────────────────────────────────────────────
      case "reports": return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {label:"Procurement Summary",desc:"POs, requisitions, suppliers summary",icon:ShoppingCart,action:()=>navigate("/reports")},
              {label:"Inventory Report",desc:"Stock levels, movements, expiry",icon:Package,action:()=>navigate("/items")},
              {label:"Financial Summary",desc:"Spend, vouchers, budget vs actuals",icon:TrendingUp,action:()=>navigate("/finance")},
              {label:"Audit Trail",desc:"All system actions and changes",icon:Shield,action:()=>navigate("/audit-log")},
              {label:"Supplier Performance",desc:"Delivery times, quality, spend",icon:Truck,action:()=>navigate("/suppliers")},
              {label:"GRN Report",desc:"Goods received, inspections, returns",icon:CheckSquare,action:()=>navigate("/goods-received")},
            ].map(r=>(
              <Card key={r.label} className="bg-[hsl(215_28%_14%)] border-sidebar-border hover:bg-[hsl(215_28%_17%)] cursor-pointer transition-colors"
                onClick={r.action}>
                <CardContent className="p-4">
                  <r.icon className="w-6 h-6 text-sky-400 mb-2"/>
                  <div className="text-sm font-medium text-sidebar-foreground">{r.label}</div>
                  <div className="text-xs text-sidebar-foreground/50 mt-1">{r.desc}</div>
                  <div className="flex items-center gap-1 mt-3 text-sky-400 text-xs">
                    <span>Generate report</span><ChevronRight className="w-3 h-3"/>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-[hsl(215_28%_14%)] border-sidebar-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-sidebar-foreground flex items-center justify-between">
                <span>Recent Events</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-xs">
                <thead className="bg-[hsl(215_35%_10%)]">
                  <tr>
                    {["Action","Table","Time"].map(h=>(
                      <th key={h} className="px-3 py-2 text-left text-sidebar-foreground/60 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0,12).map((e:any,i:number)=>(
                    <tr key={e.id||i} className="border-b border-sidebar-border/30 hover:bg-[hsl(215_35%_12%)]">
                      <td className="px-3 py-2 text-sidebar-foreground/80">{e.title||e.action||"—"}</td>
                      <td className="px-3 py-2 text-sidebar-foreground/50">{e.table_name||"system"}</td>
                      <td className="px-3 py-2 text-sidebar-foreground/40">{e.time||"—"}</td>
                    </tr>
                  ))}
                  {!events.length&&<tr><td colSpan={3} className="text-center py-6 text-sidebar-foreground/30">No events recorded</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      );

      // ── FAVORITES ──────────────────────────────────────────────────────
      case "favorites": return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SIDEBAR_SECTIONS.filter(s=>favorites.includes(s.key)).map(s=>(
              <Card key={s.key} className="bg-[hsl(215_28%_14%)] border-sidebar-border hover:bg-[hsl(215_28%_17%)] cursor-pointer transition-colors"
                onClick={()=>setActiveSection(s.key)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <s.icon className="w-6 h-6 text-yellow-400"/>
                    <div>
                      <div className="text-sm font-medium text-sidebar-foreground">{s.label}</div>
                      <div className="text-xs text-sidebar-foreground/40">Click to open</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!favorites.length && (
              <div className="col-span-3 text-center py-10 text-sidebar-foreground/30">
                <Star className="w-10 h-10 mx-auto mb-2 text-yellow-400/30"/>
                <p className="text-sm">No favorites yet — click ★ Favorite in the toolbar to pin a section.</p>
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-sidebar-foreground/40 mb-2">Saved Dashboards</div>
            <div className="space-y-2">
              {dashboards.map(d=>(
                <div key={d.id} className="flex items-center justify-between py-2 px-3 bg-[hsl(215_28%_14%)] rounded-lg border border-sidebar-border">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-sidebar-foreground/50"/>
                    <span className="text-sm text-sidebar-foreground/80">{d.name}</span>
                    <Badge className="text-[10px] bg-sidebar-accent text-sidebar-foreground">{d.section}</Badge>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={()=>setActiveSection(d.section)}>
                    <Eye className="w-3 h-3 mr-1"/>Open
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

      default: return (
        <div className="text-center py-20 text-sidebar-foreground/40">
          <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Section content loading…</p>
        </div>
      );
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-7rem)] -m-4 md:-m-6 text-foreground"
      style={{background:`linear-gradient(135deg, ${COLORS.darker} 0%, ${COLORS.dark} 50%, ${COLORS.primary} 100%)`}}>

      {/* Left sidebar - Professional dark sidebar */}
      <aside className="w-56 bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700/50 flex flex-col text-sm shrink-0 shadow-2xl">
        {/* Logo/Brand header */}
        <div className="p-4 border-b border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight">EL5 MediProcure</div>
              <div className="text-xs text-slate-400">Enterprise Suite</div>
            </div>
          </div>
        </div>
        
        {/* Organization info */}
        <div className="px-3 py-2 border-b border-slate-700/30 bg-blue-950/20">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span>Embu Level 5 Hospital</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>System Online</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {SIDEBAR_SECTIONS.map(s=>{
            const active = s.key===activeSection;
            const fav = favorites.includes(s.key);
            return (
              <button key={s.key} onClick={()=>setActiveSection(s.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-900/50"
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                }`}>
                <s.icon className={`w-4 h-4 shrink-0 ${active ? 'text-blue-200' : 'text-slate-400'}`}/>
                <span className="flex-1 truncate text-xs">{s.label}</span>
                {fav && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 shrink-0"/>}
              </button>
            );
          })}
        </nav>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50 bg-slate-900/50">
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span>MediProcure</span>
            <span className="bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded text-[9px]">v11.12.0</span>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
	
        {/* Top header bar */}
        <div className="bg-slate-900/80 backdrop-blur border-b border-slate-700/50 px-5 py-3 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <h1 className="text-white font-bold text-lg tracking-tight">
              {SIDEBAR_SECTIONS.find(s=>s.key===activeSection)?.label || 'Dashboard'}
            </h1>
            <Badge className="bg-emerald-900/50 text-emerald-300 border-emerald-700/50 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              Live
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={e=>setSearchQuery(e.target.value)}
                className="bg-slate-800/80 border border-slate-600/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-48 transition-all"
              />
            </div>
            
            {/* Notifications */}
            <button className="relative p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/80 transition-colors">
              <Bell className="w-4 h-4 text-slate-300" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">3</span>
            </button>
            
            {/* Settings */}
            <button className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 hover:bg-slate-700/80 transition-colors">
              <Settings className="w-4 h-4 text-slate-300" />
            </button>
          </div>
        </div>
        
        {/* Sub-tabs */}
        <div className="bg-slate-900/50 border-b border-slate-700/30 px-5 py-2 flex items-center gap-1 overflow-x-auto">
          {TOP_TABS.map(t=>{
            const active = t===activeTopTab;
            return (
              <button key={t} onClick={()=>setActiveTopTab(t)}
                className={`px-4 py-1.5 text-xs whitespace-nowrap rounded-lg transition-all ${
                  active
                    ? "bg-blue-600 text-white font-semibold shadow-lg shadow-blue-900/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                }`}>
                {t}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Badge className="bg-slate-800/80 text-slate-300 border-slate-600/50 text-[10px]">
              <Clock className="w-3 h-3 mr-1" />
              {new Date().toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
            </Badge>
          </div>
        </div>

        {/* Action bar */}
        <div className="bg-slate-900/40 border-b border-slate-700/30 px-5 py-2.5 flex flex-wrap gap-2 items-center">
          <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-xs gap-1.5 shadow-lg shadow-blue-900/30" onClick={()=>setShowAddDashboard(true)}>
            <Plus className="w-3.5 h-3.5"/> Add Dashboard
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700" onClick={()=>setShowManageDashboard(true)}>
            <List className="w-3.5 h-3.5"/> Manage
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700" onClick={()=>setShowAddWidget(true)}>
            <Plus className="w-3.5 h-3.5"/> Add Widget
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700"
            onClick={toggleFavorite}>
            <Star className={`w-3.5 h-3.5 ${favorites.includes(activeSection)?"text-yellow-400 fill-yellow-400":""}`}/>
            {favorites.includes(activeSection)?"Saved":"Save"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 w-8 p-0 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`}/>
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700" onClick={()=>window.print()}>
            <Printer className="w-3.5 h-3.5"/> Print
          </Button>
          <Button size="sm" variant={slideshowOn?"default":"outline"}
            className={`h-8 text-xs gap-1.5 ${slideshowOn?"bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-900/30":""}`}
            onClick={()=>setSlideshowOn(s=>!s)}>
            {slideshowOn?<Pause className="w-3.5 h-3.5"/>:<Play className="w-3.5 h-3.5"/>}
            {slideshowOn?"Stop":"Slideshow"}
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700" onClick={()=>setShowSchedule(true)}>
            <Calendar className="w-3.5 h-3.5"/> Schedule
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 bg-slate-800/50 border-slate-600/50 hover:bg-slate-700" onClick={()=>setShowChangeForm(true)}>
            <GitBranch className="w-3.5 h-3.5"/> Change Request
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {slideshowOn && (
              <Badge className="bg-violet-900/50 text-violet-300 border-violet-700/50 text-[10px] animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-1.5"></span>
                Slideshow Active
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {renderSection()}
        </div>
      </div>

      {/* ─── Add Dashboard Modal ──────────────────────────────────────── */}
      <Dialog open={showAddDashboard} onOpenChange={setShowAddDashboard}>
        <DialogContent className="bg-[hsl(215_28%_14%)] border-sidebar-border text-sidebar-foreground max-w-sm">
          <DialogHeader><DialogTitle className="text-sidebar-foreground">Add Dashboard</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Dashboard name…" value={newDashName} onChange={e=>setNewDashName(e.target.value)}
              className="bg-[hsl(215_35%_10%)] border-sidebar-border text-sidebar-foreground"/>
            <div className="text-xs text-sidebar-foreground/50">Will be pinned to: {SIDEBAR_SECTIONS.find(s=>s.key===activeSection)?.label}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAddDashboard(false)}>Cancel</Button>
            <Button onClick={addDashboard} className="bg-sky-600 hover:bg-sky-700">Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Manage Dashboards Modal ──────────────────────────────────── */}
      <Dialog open={showManageDashboard} onOpenChange={setShowManageDashboard}>
        <DialogContent className="bg-[hsl(215_28%_14%)] border-sidebar-border text-sidebar-foreground">
          <DialogHeader><DialogTitle className="text-sidebar-foreground">Manage Dashboards</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {dashboards.map(d=>(
              <div key={d.id} className="flex items-center justify-between bg-[hsl(215_35%_10%)] rounded px-3 py-2">
                <div>
                  <div className="text-sm text-sidebar-foreground">{d.name}</div>
                  <div className="text-xs text-sidebar-foreground/40">{d.section}</div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={()=>setActiveSection(d.section)}>
                    <Eye className="w-3 h-3"/>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400" onClick={()=>deleteDashboard(d.id)}>
                    <Trash2 className="w-3 h-3"/>
                  </Button>
                </div>
              </div>
            ))}
            {!dashboards.length&&<div className="text-center py-6 text-sidebar-foreground/30 text-sm">No dashboards yet</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowManageDashboard(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add Widget Modal ─────────────────────────────────────────── */}
      <Dialog open={showAddWidget} onOpenChange={setShowAddWidget}>
        <DialogContent className="bg-[hsl(215_28%_14%)] border-sidebar-border text-sidebar-foreground max-w-sm">
          <DialogHeader><DialogTitle className="text-sidebar-foreground">Add Widget</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-sidebar-foreground/60 mb-1">Widget Type</div>
              <div className="grid grid-cols-3 gap-2">
                {[{type:"kpi",label:"KPI Card",icon:TrendingUp},{type:"chart",label:"Chart",icon:BarChart3},{type:"table",label:"Table",icon:List}].map(w=>(
                  <button key={w.type} onClick={()=>setNewWidgetType(w.type)}
                    className={`flex flex-col items-center gap-1 py-3 rounded border transition-colors ${newWidgetType===w.type?"border-sky-500 bg-sky-900/30 text-sky-300":"border-sidebar-border text-sidebar-foreground/60 hover:border-sky-500/50"}`}>
                    <w.icon className="w-5 h-5"/>
                    <span className="text-xs">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <Input placeholder="Widget title…" value={newWidgetTitle} onChange={e=>setNewWidgetTitle(e.target.value)}
              className="bg-[hsl(215_35%_10%)] border-sidebar-border text-sidebar-foreground"/>
            <div className="text-xs text-sidebar-foreground/40">Section: {SIDEBAR_SECTIONS.find(s=>s.key===activeSection)?.label}</div>

            {/* Current widgets */}
            {widgets.filter(w=>w.section===activeSection).length>0 && (
              <div>
                <div className="text-xs text-sidebar-foreground/40 mb-1">Current widgets in this section:</div>
                <div className="space-y-1">
                  {widgets.filter(w=>w.section===activeSection).map(w=>(
                    <div key={w.id} className="flex items-center justify-between bg-[hsl(215_35%_10%)] rounded px-2 py-1.5">
                      <span className="text-xs text-sidebar-foreground/70">{w.title}</span>
                      <button onClick={()=>removeWidget(w.id)} className="text-red-400 hover:text-red-300">
                        <X className="w-3 h-3"/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowAddWidget(false)}>Cancel</Button>
            <Button onClick={addWidget} className="bg-sky-600 hover:bg-sky-700">Add Widget</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Schedule Modal ───────────────────────────────────────────── */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="bg-[hsl(215_28%_14%)] border-sidebar-border text-sidebar-foreground max-w-sm">
          <DialogHeader><DialogTitle className="text-sidebar-foreground flex items-center gap-2"><Calendar className="w-4 h-4"/>Schedule Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-sidebar-foreground/60 mb-1">Recipient Email</div>
              <Input type="email" placeholder="email@el5hospital.go.ke" value={scheduleEmail} onChange={e=>setScheduleEmail(e.target.value)}
                className="bg-[hsl(215_35%_10%)] border-sidebar-border text-sidebar-foreground"/>
            </div>
            <div>
              <div className="text-xs text-sidebar-foreground/60 mb-1">Report</div>
              <select value={scheduleReport} onChange={e=>setScheduleReport(e.target.value)}
                className="w-full bg-[hsl(215_35%_10%)] border border-sidebar-border rounded px-3 py-2 text-sm text-sidebar-foreground outline-none">
                {SIDEBAR_SECTIONS.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs text-sidebar-foreground/60 mb-1">Frequency</div>
              <div className="grid grid-cols-3 gap-2">
                {["daily","weekly","monthly"].map(f=>(
                  <button key={f} onClick={()=>setScheduleFreq(f)}
                    className={`py-2 rounded text-xs border capitalize transition-colors ${scheduleFreq===f?"border-sky-500 bg-sky-900/30 text-sky-300":"border-sidebar-border text-sidebar-foreground/60"}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowSchedule(false)}>Cancel</Button>
            <Button onClick={submitSchedule} className="bg-sky-600 hover:bg-sky-700">Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Change Request Form ──────────────────────────────────────── */}
      <Dialog open={showChangeForm} onOpenChange={setShowChangeForm}>
        <DialogContent className="bg-[hsl(215_28%_14%)] border-sidebar-border text-sidebar-foreground">
          <DialogHeader><DialogTitle className="text-sidebar-foreground">New Change Request</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-sidebar-foreground/60 mb-1">Title *</div>
              <Input placeholder="Short title…" value={changeForm.title} onChange={e=>setChangeForm(f=>({...f,title:e.target.value}))}
                className="bg-[hsl(215_35%_10%)] border-sidebar-border text-sidebar-foreground"/>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-sidebar-foreground/60 mb-1">Type</div>
                <select value={changeForm.type} onChange={e=>setChangeForm(f=>({...f,type:e.target.value}))}
                  className="w-full bg-[hsl(215_35%_10%)] border border-sidebar-border rounded px-2 py-1.5 text-sm text-sidebar-foreground outline-none">
                  {["maintenance","infrastructure","software","process","emergency"].map(t=><option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs text-sidebar-foreground/60 mb-1">Priority</div>
                <select value={changeForm.priority} onChange={e=>setChangeForm(f=>({...f,priority:e.target.value}))}
                  className="w-full bg-[hsl(215_35%_10%)] border border-sidebar-border rounded px-2 py-1.5 text-sm text-sidebar-foreground outline-none">
                  {["low","medium","high","critical"].map(p=><option key={p} value={p} className="capitalize">{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="text-xs text-sidebar-foreground/60 mb-1">Description</div>
              <textarea rows={3} placeholder="Describe the change…" value={changeForm.description}
                onChange={e=>setChangeForm(f=>({...f,description:e.target.value}))}
                className="w-full bg-[hsl(215_35%_10%)] border border-sidebar-border rounded px-3 py-2 text-sm text-sidebar-foreground outline-none resize-none focus:ring-1 focus:ring-sky-500"/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowChangeForm(false)}>Cancel</Button>
            <Button onClick={submitChange} className="bg-sky-600 hover:bg-sky-700">Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EnterpriseDashboardPage;
