import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingCart, FileText, Package, ClipboardList, BarChart3,
  AlertTriangle, Clock, Database, CheckCircle2, XCircle,
  Stamp, Eye, Send, Check, X, RefreshCw, Download,
  Search, Plus, ChevronDown, ChevronRight, Users, Bell,
  MessageSquare, Mail, Phone, ArrowRight, ArrowLeft,
  CheckSquare, XSquare, List, Grid3X3, Filter,
  Printer, Share2, MoreHorizontal, User, Calendar,
  TrendingUp, TrendingDown, Minus, LayoutDashboard,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
  RadialBarChart, RadialBar,
} from "recharts";

// Tabs configuration
const TABS = [
  { key: "overview", icon: LayoutDashboard, label: "Overview" },
  { key: "requisitions", icon: ShoppingCart, label: "Requisitions" },
  { key: "pos", icon: FileText, label: "Purchase Orders" },
  { key: "grns", icon: Package, label: "GRNs" },
  { key: "bulk-actions", icon: Users, label: "Bulk Actions" },
  { key: "notifications", icon: Bell, label: "Notifications" },
  { key: "stock", icon: AlertTriangle, label: "Stock Alerts" },
  { key: "backup", icon: Database, label: "Backup" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200" },
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
  closed: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  partial: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200" },
  open: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200" },
};

const TrackingApprovalPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<"approve" | "reject" | "forward" | "notify">("approve");
  const [notificationChannels, setNotificationChannels] = useState<Set<"sms" | "whatsapp" | "email" | "call">>(new Set(["sms"]));
  const [customMessage, setCustomMessage] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [detailItem, setDetailItem] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [stampingId, setStampingId] = useState<string | null>(null);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  
  // Data state
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [goodsReceived, setGoodsReceived] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Admin",
        });
      }
    });
  }, []);

  // Load all data
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      
      const [reqRes, poRes, grnRes, itemRes, supRes] = await Promise.all([
        supabase.from("requisitions").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("goods_received").select("*").order("received_date", { ascending: false }).limit(200),
        supabase.from("items").select("*").limit(200),
        supabase.from("suppliers").select("*").limit(100),
      ]);
      
      setRequisitions(reqRes.data || []);
      setPurchaseOrders(poRes.data || []);
      setGoodsReceived(grnRes.data || []);
      setItems(itemRes.data || []);
      setSuppliers(supRes.data || []);
    } catch (err) {
      console.error("Load error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Actions
  const decide = async (id: string, verdict: "approved" | "rejected") => {
    setStampingId(id);
    const now = new Date().toISOString();
    const stamper = currentUser?.name || "Admin";
    
    await (supabase as any).from("requisitions").update({
      status: verdict,
      ...(verdict === "approved" 
        ? { approved_at: now, approved_by: currentUser?.id, approved_by_name: stamper }
        : { rejected_at: now, rejected_by: currentUser?.id, rejected_by_name: stamper }
      )
    }).eq("id", id);
    
    toast({
      title: verdict === "approved" ? "✅ Approved" : "❌ Rejected",
      description: `${verdict === "approved" ? "Approved" : "Rejected"} by ${stamper}`,
    });
    
    setTimeout(() => {
      setStampingId(null);
      loadAll();
    }, 800);
  };

  const forwardItem = async (id: string, recipient?: string) => {
    try {
      await supabase.functions.invoke("notification-hub", {
        body: {
          action: "send",
          channel: "sms",
          to: recipient || "+254700000000",
          message: `Requisition ${id} forwarded to you. Login: https://procurbosse.edgeone.app - EL5 MediProcure`,
        },
      });
      toast({ title: "✅ Forwarded", description: "Recipient notified" });
    } catch {
      toast({ title: "✅ Forwarded" });
    }
  };

  // Bulk operations
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllPending = () => {
    setSelectedItems(new Set(requisitions.filter((r: any) => r.status === "pending").map((r: any) => r.id)));
  };

  const clearSelection = () => setSelectedItems(new Set());

  const executeBulkAction = async () => {
    const ids = Array.from(selectedItems);
    if (ids.length === 0) return;
    
    const now = new Date().toISOString();
    const stamper = currentUser?.name || "Admin";
    
    if (bulkAction === "approve") {
      for (const id of ids) {
        await (supabase as any).from("requisitions").update({
          status: "approved", approved_at: now, approved_by: currentUser?.id, approved_by_name: stamper
        }).eq("id", id);
      }
      toast({ title: `✅ ${ids.length} Approved` });
    } else if (bulkAction === "reject") {
      for (const id of ids) {
        await (supabase as any).from("requisitions").update({
          status: "rejected", rejected_at: now, rejected_by: currentUser?.id, rejected_by_name: stamper
        }).eq("id", id);
      }
      toast({ title: `❌ ${ids.length} Rejected` });
    } else if (bulkAction === "forward") {
      for (const id of ids) {
        await forwardItem(id, recipientPhone);
      }
    } else if (bulkAction === "notify") {
      for (const channel of Array.from(notificationChannels)) {
        await supabase.functions.invoke("notification-hub", {
          body: { action: "send", channel, to: recipientPhone || "+254700000000", message: customMessage },
        });
      }
      setNotificationHistory(prev => [{
        id: Date.now(),
        to: recipientPhone,
        message: customMessage,
        channels: Array.from(notificationChannels),
        sentAt: new Date().toISOString(),
        sentBy: currentUser?.name,
      }, ...prev]);
      toast({ title: "✅ Notification Sent" });
    }
    
    setBulkDialogOpen(false);
    clearSelection();
    loadAll();
  };

  // Backup
  const runBackup = async () => {
    setBackupRunning(true);
    setBackupProgress(0);
    const TABLES = ["requisitions", "purchase_orders", "items", "suppliers", "goods_received"];
    const backup: Record<string, any[]> = {};
    
    for (let i = 0; i < TABLES.length; i++) {
      const { data } = await (supabase as any).from(TABLES[i]).select("*");
      backup[TABLES[i]] = data || [];
      setBackupProgress(Math.round(((i + 1) / TABLES.length) * 100));
    }
    
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), system: "EL5 MediProcure", tables: backup }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `EL5-Backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    
    toast({ title: "✅ Backup Complete", description: "JSON file downloaded" });
    setBackupRunning(false);
    setBackupProgress(100);
  };

  // Send notification
  const sendNotification = async (to: string, message: string, channels: string[]) => {
    try {
      for (const channel of channels) {
        await supabase.functions.invoke("notification-hub", {
          body: { action: "send", channel, to, message },
        });
      }
      toast({ title: "✅ Notification Sent" });
      setNotificationHistory(prev => [{
        id: Date.now(), to, message, channels,
        sentAt: new Date().toISOString(), sentBy: currentUser?.name,
      }, ...prev]);
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  // Filter
  const filterBySearch = (arr: any[]) => {
    if (!search) return arr;
    return arr.filter((item: any) => 
      JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
    );
  };

  // Date helpers for day-over-day trend comparisons
  const isOnDate = (iso: string | null | undefined, daysAgo: number) => {
    if (!iso) return false;
    const d = new Date(iso);
    const target = new Date(); target.setHours(0, 0, 0, 0); target.setDate(target.getDate() - daysAgo);
    const next = new Date(target); next.setDate(next.getDate() + 1);
    return d >= target && d < next;
  };
  const pctDelta = (today: number, yesterday: number): { dir: "up" | "down" | "neutral"; label: string } => {
    if (yesterday === 0) {
      if (today === 0) return { dir: "neutral", label: "0%" };
      return { dir: "up", label: "+100%" };
    }
    const pct = Math.round(((today - yesterday) / yesterday) * 100);
    if (pct > 0) return { dir: "up", label: `+${pct}%` };
    if (pct < 0) return { dir: "down", label: `${pct}%` };
    return { dir: "neutral", label: "0%" };
  };

  // KPI Stats
  const stats = {
    pendingReqs: requisitions.filter((r: any) => r.status === "pending").length,
    approvedReqs: requisitions.filter((r: any) => r.status === "approved").length,
    rejectedReqs: requisitions.filter((r: any) => r.status === "rejected").length,
    approvedTodayCount: requisitions.filter((r: any) => r.status === "approved" && isOnDate(r.approved_at, 0)).length,
    rejectedTodayCount: requisitions.filter((r: any) => r.status === "rejected" && isOnDate(r.rejected_at, 0)).length,
    openPOs: purchaseOrders.filter((p: any) => p.status === "open" || p.status === "pending").length,
    totalPOs: purchaseOrders.length,
    pendingGRNs: goodsReceived.filter((g: any) => g.status === "pending" || g.status === "partial").length,
    lowStock: items.filter((i: any) => (i.quantity_in_stock || 0) < (i.reorder_level || 10)).length,
    totalItems: items.length,
  };

  // Day-over-day trend deltas for the Overview KPI cards (real data, computed from loaded records)
  const trends = {
    pendingReqs: pctDelta(
      requisitions.filter((r: any) => r.status === "pending" && isOnDate(r.created_at, 0)).length,
      requisitions.filter((r: any) => r.status === "pending" && isOnDate(r.created_at, 1)).length,
    ),
    approvedToday: pctDelta(
      stats.approvedTodayCount,
      requisitions.filter((r: any) => r.status === "approved" && isOnDate(r.approved_at, 1)).length,
    ),
    rejectedToday: pctDelta(
      stats.rejectedTodayCount,
      requisitions.filter((r: any) => r.status === "rejected" && isOnDate(r.rejected_at, 1)).length,
    ),
    openPOs: pctDelta(
      purchaseOrders.filter((p: any) => (p.status === "open" || p.status === "pending") && isOnDate(p.created_at, 0)).length,
      purchaseOrders.filter((p: any) => (p.status === "open" || p.status === "pending") && isOnDate(p.created_at, 1)).length,
    ),
  };

  // Approval pipeline stages — real counts from loaded requisitions
  const pipelineStages = [
    { key: "submitted", label: "Submitted", count: requisitions.length },
    { key: "review", label: "Under Review", count: requisitions.filter((r: any) => r.status === "pending").length },
    { key: "approved", label: "Approved", count: requisitions.filter((r: any) => r.status === "approved").length },
    { key: "fulfilled", label: "Fulfilled", count: goodsReceived.filter((g: any) => g.status === "received" || g.status === "completed").length },
  ];
  const activeStageIdx = pipelineStages.reduce((best, s, i) => (s.count > pipelineStages[best].count ? i : best), 0);

  // Insights — radar of approval health across the three pipelines
  const reqApprovalPct = requisitions.length > 0 ? Math.round((stats.approvedReqs / requisitions.length) * 100) : 0;
  const poApprovalPct = stats.totalPOs > 0 ? Math.round((purchaseOrders.filter((p: any) => p.status === "approved").length / stats.totalPOs) * 100) : 0;
  const grnCompletionPct = goodsReceived.length > 0 ? Math.round(((goodsReceived.length - stats.pendingGRNs) / goodsReceived.length) * 100) : 0;
  const stockHealthPct = stats.totalItems > 0 ? Math.round(((stats.totalItems - stats.lowStock) / stats.totalItems) * 100) : 100;
  const supplierHealthPct = suppliers.length > 0 ? Math.round((suppliers.filter((s: any) => s.status === "active").length / suppliers.length) * 100) : 0;

  const radarData = [
    { metric: "Requisitions", value: reqApprovalPct },
    { metric: "Purchase Orders", value: poApprovalPct },
    { metric: "GRNs", value: grnCompletionPct },
    { metric: "Stock Health", value: stockHealthPct },
    { metric: "Suppliers", value: supplierHealthPct },
  ];
  const confidenceScore = Math.round(radarData.reduce((s, d) => s + d.value, 0) / radarData.length);
  const confidenceGaugeData = [{ name: "score", value: confidenceScore, fill: confidenceScore >= 70 ? "#10b981" : confidenceScore >= 40 ? "#f59e0b" : "#ef4444" }];

  // Department gantt-style comparison (top 5 by volume)
  const deptGroups: Record<string, { department: string; approved: number; pending: number; total: number }> = {};
  requisitions.forEach((r: any) => {
    const dept = r.department || "Unassigned";
    if (!deptGroups[dept]) deptGroups[dept] = { department: dept, approved: 0, pending: 0, total: 0 };
    deptGroups[dept].total++;
    if (r.status === "approved") deptGroups[dept].approved++;
    if (r.status === "pending") deptGroups[dept].pending++;
  });
  const deptGanttData = Object.values(deptGroups).sort((a, b) => b.total - a.total).slice(0, 5);

  // 7-day approval trend
  const trendDays: { day: string; submitted: number; approved: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const submitted = requisitions.filter((r: any) => isOnDate(r.created_at, i)).length;
    const approved = requisitions.filter((r: any) => r.status === "approved" && isOnDate(r.approved_at, i)).length;
    const d = new Date(); d.setDate(d.getDate() - i);
    trendDays.push({ day: d.toLocaleDateString("en-KE", { weekday: "short" }), submitted, approved });
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const colors = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colors.bg} ${colors.text} ${colors.border}`}>
        {status || "—"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Title Bar */}
      <div
        className="sticky top-0 z-40 text-white shadow-md"
        style={{ background: "linear-gradient(180deg, #2a4fa3 0%, #1a3580 100%)", borderBottom: "1px solid #1a3580" }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3 gap-3">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="w-5 h-5 text-white/90" />
              <div>
                <h1 className="text-base md:text-lg font-bold leading-tight">Tracking &amp; Approval Center</h1>
                <p className="text-[11px] text-white/75 mt-0.5">
                  {currentUser?.name ? `Logged in as ${currentUser.name}` : "Loading..."} · {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={loadAll} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                {viewMode === "grid" ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Toolbar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-2.5">
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap border ${
                  activeTab === tab.key
                    ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                    : "bg-white text-slate-600 hover:bg-slate-100 border-slate-200"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.key === "requisitions" && stats.pendingReqs > 0 && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5">{stats.pendingReqs}</Badge>
                )}
                {tab.key === "stock" && stats.lowStock > 0 && (
                  <Badge className="bg-red-500 text-white text-[10px] px-1.5">{stats.lowStock}</Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Approval Pipeline Stage Tracker — D365 process-bar style */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center">
            {pipelineStages.map((stage, i) => {
              const isActive = i === activeStageIdx;
              const isPast = i < activeStageIdx;
              return (
                <div key={stage.key} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border whitespace-nowrap ${
                    isActive ? "bg-sky-50 border-sky-400 shadow-sm" : isPast ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200"
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? "bg-sky-500" : isPast ? "bg-slate-400" : "bg-slate-200"}`} />
                    <span className={`text-xs font-semibold ${isActive ? "text-sky-700" : "text-slate-600"}`}>{stage.label}</span>
                    <Badge className={isActive ? "bg-sky-500 text-white" : "bg-slate-200 text-slate-600"}>{stage.count}</Badge>
                  </div>
                  {i < pipelineStages.length - 1 && <div className="flex-1 h-px bg-slate-200 mx-2" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Bulk Action Bar */}
        {selectedItems.size > 0 && (
          <Card className="bg-gradient-to-r from-sky-600 to-sky-700 border-sky-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5" />
                  <span className="font-bold">{selectedItems.size} selected</span>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={clearSelection}>
                    Clear
                  </Button>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20" onClick={selectAllPending}>
                    Select All Pending
                  </Button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 gap-1" onClick={() => { setBulkAction("approve"); setBulkDialogOpen(true); }}>
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600 gap-1" onClick={() => { setBulkAction("reject"); setBulkDialogOpen(true); }}>
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                  <Button size="sm" className="bg-orange-500 hover:bg-orange-600 gap-1" onClick={() => { setBulkAction("forward"); setBulkDialogOpen(true); }}>
                    <Send className="w-4 h-4" /> Forward
                  </Button>
                  <Button size="sm" className="bg-purple-500 hover:bg-purple-600 gap-1" onClick={() => { setBulkAction("notify"); setBulkDialogOpen(true); }}>
                    <Bell className="w-4 h-4" /> Notify
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Pending Requisitions", value: stats.pendingReqs, icon: Clock, color: "text-amber-600", bg: "bg-amber-100", trend: trends.pendingReqs },
                { label: "Approved Today", value: stats.approvedTodayCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100", trend: trends.approvedToday },
                { label: "Rejected Today", value: stats.rejectedTodayCount, icon: XCircle, color: "text-red-600", bg: "bg-red-100", trend: trends.rejectedToday },
                { label: "Open POs", value: stats.openPOs, icon: FileText, color: "text-sky-600", bg: "bg-sky-100", trend: trends.openPOs },
              ].map((kpi, i) => (
                <Card key={i} className="bg-white border-slate-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                        <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                      </div>
                      <div className={`flex items-center gap-0.5 ${kpi.trend.dir === "up" ? "text-emerald-600" : kpi.trend.dir === "down" ? "text-red-600" : "text-slate-400"}`}>
                        {kpi.trend.dir === "up" ? <TrendingUp className="w-4 h-4" /> : kpi.trend.dir === "down" ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                        <span className="text-xs font-bold">{kpi.trend.label}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
                      <div className="text-sm text-slate-500 mt-1">{kpi.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Insights Dashboard — D365-style 3-column layout: radar | expected vs actual | sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Approval Health Radar */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Approval Health Radar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
                      <Radar dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.35} />
                      <Tooltip formatter={(v: any) => `${v}%`} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Approved vs Pending by Department — Gantt-style */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">Approved vs Pending by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  {deptGanttData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">No requisitions yet</div>
                  ) : (
                    <div className="space-y-3">
                      {deptGanttData.map((row, i) => {
                        const maxTotal = Math.max(...deptGanttData.map((r) => r.total), 1);
                        return (
                          <div key={i}>
                            <div className="text-xs font-medium text-slate-600 mb-1 truncate">{row.department}</div>
                            <div className="flex gap-1 h-3">
                              <div className="bg-sky-500 rounded-sm" style={{ width: `${(row.approved / maxTotal) * 100}%`, minWidth: row.approved > 0 ? "4px" : 0 }} title={`Approved: ${row.approved}`} />
                              <div className="bg-amber-400 rounded-sm" style={{ width: `${(row.pending / maxTotal) * 100}%`, minWidth: row.pending > 0 ? "4px" : 0 }} title={`Pending: ${row.pending}`} />
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Approved</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Pending</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sidebar: Pending Approvers queue + 7-day trend + Confidence */}
              <div className="space-y-4">
                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Awaiting Approval</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {requisitions.filter((r: any) => r.status === "pending").length === 0 ? (
                      <div className="text-xs text-slate-400 py-4 text-center">Nothing pending — all caught up</div>
                    ) : (
                      <div className="space-y-2">
                        {requisitions.filter((r: any) => r.status === "pending").slice(0, 5).map((r: any) => (
                          <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                            <div className="min-w-0">
                              <div className="text-sm text-slate-700 truncate">{r.requisition_number || r.id?.slice(0, 8)}</div>
                              <div className="text-xs text-slate-400 truncate">{r.department || "Unassigned"}</div>
                            </div>
                            <Badge className="bg-amber-100 text-amber-700 flex-shrink-0">Pending</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">7-Day Approval Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={110}>
                      <AreaChart data={trendDays}>
                        <defs>
                          <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="approvedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="submitted" stroke="#0ea5e9" fill="url(#submittedGrad)" strokeWidth={2} name="Submitted" />
                        <Area type="monotone" dataKey="approved" stroke="#10b981" fill="url(#approvedGrad)" strokeWidth={2} name="Approved" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-slate-700">Confidence Score</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={130}>
                      <RadialBarChart data={confidenceGaugeData} startAngle={180} endAngle={0} innerRadius="70%" outerRadius="100%" barSize={14}>
                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#f1f5f9" }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="text-center -mt-10">
                      <div className="text-2xl font-bold text-slate-800">{confidenceScore}%</div>
                      <div className="text-xs text-slate-400">overall health</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Activity + Stats — main feed alongside a compact sidebar instead of stacked full-width blocks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Recent Activity — main panel */}
              <Card className="bg-white border-slate-200 lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {requisitions.slice(0, 6).map((r: any) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className={`p-2 rounded-full ${r.status === "approved" ? "bg-emerald-100" : r.status === "rejected" ? "bg-red-100" : "bg-amber-100"}`}>
                          {r.status === "approved" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : 
                           r.status === "rejected" ? <XCircle className="w-4 h-4 text-red-600" /> : 
                           <Clock className="w-4 h-4 text-amber-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-slate-800 text-sm">{r.requisition_number || r.id?.slice(0, 8)}</div>
                          <div className="text-xs text-slate-500">{r.department || "Unknown Department"} · {r.purpose || "No description"}</div>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                    ))}
                    {requisitions.length === 0 && (
                      <div className="text-center py-8 text-slate-400">No recent activity</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Compact stats sidebar */}
              <div className="space-y-4">
                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-600" />
                      Inventory Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total Items</span>
                        <span className="font-bold text-slate-800">{stats.totalItems}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Low Stock Alerts</span>
                        <span className="font-bold text-red-600">{stats.lowStock}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Pending GRNs</span>
                        <span className="font-bold text-amber-600">{stats.pendingGRNs}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-violet-600" />
                      Purchase Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total POs</span>
                        <span className="font-bold text-slate-800">{stats.totalPOs}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Open POs</span>
                        <span className="font-bold text-orange-600">{stats.openPOs}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Approved</span>
                        <span className="font-bold text-emerald-600">{purchaseOrders.filter((p: any) => p.status === "approved").length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white border-slate-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-sky-600" />
                      Requisitions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Total</span>
                        <span className="font-bold text-slate-800">{requisitions.length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Pending</span>
                        <span className="font-bold text-amber-600">{stats.pendingReqs}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Approved</span>
                        <span className="font-bold text-emerald-600">{stats.approvedReqs}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Requisitions Tab */}
        {activeTab === "requisitions" && (
          <div className="space-y-4">
            {/* Search & Filters */}
            <Card className="bg-white border-slate-200">
              <CardContent className="p-4">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search requisitions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/requisitions")}>
                    <Plus className="w-4 h-4 mr-1" /> New Requisition
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Requisitions List */}
            <Card className="bg-white border-slate-200 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-sky-600" />
                    Requisitions ({filterBySearch(requisitions).length})
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge className="bg-amber-100 text-amber-700">{stats.pendingReqs} Pending</Badge>
                    <Badge className="bg-emerald-100 text-emerald-700">{stats.approvedReqs} Approved</Badge>
                    <Badge className="bg-red-100 text-red-700">{stats.rejectedReqs} Rejected</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {filterBySearch(requisitions).slice(0, 50).map((r: any, i: number) => (
                    <div
                      key={r.id}
                      className={`p-4 hover:bg-sky-50/50 transition-all ${
                        stampingId === r.id ? "bg-amber-50 scale-[1.01]" : 
                        selectedItems.has(r.id) ? "bg-sky-100/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(r.id)}
                          onChange={() => toggleSelection(r.id)}
                          disabled={r.status !== "pending"}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-sky-700 text-sm">
                              {r.requisition_number || r.id?.slice(0, 8)}
                            </span>
                            <StatusBadge status={r.status} />
                          </div>
                          <div className="text-sm text-slate-600 truncate">
                            {r.department || "Unknown Department"} · {r.purpose || "No description"}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {new Date(r.created_at).toLocaleDateString("en-KE")} · KSh {Number(r.total_amount || r.amount || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {r.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-500 hover:bg-emerald-600 gap-1"
                                onClick={() => decide(r.id, "approved")}
                              >
                                <Check className="w-3 h-3" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                                onClick={() => decide(r.id, "rejected")}
                              >
                                <X className="w-3 h-3" /> Reject
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setSelectedItems(new Set([r.id]));
                                  setRecipientPhone("");
                                  setBulkAction("forward");
                                  setBulkDialogOpen(true);
                                }}
                              >
                                <Send className="w-3 h-3" /> Forward
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setDetailItem(r); setShowDetail(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filterBySearch(requisitions).length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      No requisitions found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Purchase Orders Tab */}
        {activeTab === "pos" && (
          <Card className="bg-white border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-violet-600" />
                Purchase Orders ({purchaseOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">PO Number</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.slice(0, 50).map((po: any, i: number) => (
                      <tr key={po.id} className="border-b border-slate-100 hover:bg-sky-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-sky-700">{po.po_number || po.id?.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-slate-700">{po.supplier_name || "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">KSh {Number(po.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={po.status} /></td>
                        <td className="px-4 py-3 text-slate-500">{new Date(po.created_at).toLocaleDateString("en-KE")}</td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="ghost" onClick={() => { setDetailItem(po); setShowDetail(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {purchaseOrders.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  No purchase orders found
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* GRNs Tab */}
        {activeTab === "grns" && (
          <Card className="bg-white border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                Goods Received ({goodsReceived.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">GRN Number</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsReceived.slice(0, 50).map((grn: any, i: number) => (
                      <tr key={grn.id} className="border-b border-slate-100 hover:bg-sky-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-sky-700">{grn.grn_number || grn.id?.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-slate-700">{grn.supplier_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-500">{new Date(grn.received_date || grn.created_at).toLocaleDateString("en-KE")}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={grn.status} /></td>
                        <td className="px-4 py-3 text-center">
                          <Button size="sm" variant="ghost" onClick={() => { setDetailItem(grn); setShowDetail(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {goodsReceived.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  No goods received found
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Bulk Actions Tab */}
        {activeTab === "bulk-actions" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Bulk Approve", icon: CheckCircle2, color: "emerald", desc: "Approve multiple requisitions", action: "approve" },
                { label: "Bulk Reject", icon: XCircle, color: "red", desc: "Reject multiple requisitions", action: "reject" },
                { label: "Bulk Forward", icon: Send, color: "orange", desc: "Forward to managers", action: "forward" },
                { label: "Bulk Notify", icon: Bell, color: "purple", desc: "Send notifications", action: "notify" },
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => {
                    selectAllPending();
                    setBulkAction(action.action as any);
                    setBulkDialogOpen(true);
                  }}
                  className={`p-6 bg-${action.color}-50 hover:bg-${action.color}-100 border-2 border-${action.color}-200 hover:border-${action.color}-400 rounded-xl text-left transition-all`}
                >
                  <action.icon className={`w-10 h-10 text-${action.color}-600 mb-3`} />
                  <div className="font-bold text-slate-800">{action.label}</div>
                  <div className="text-sm text-slate-500 mt-1">{action.desc}</div>
                  <div className="text-xs text-slate-400 mt-2">{stats.pendingReqs} pending</div>
                </button>
              ))}
            </div>

            {/* Quick Stats */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-slate-50 rounded-xl">
                    <div className="text-2xl font-bold text-slate-700">{requisitions.length}</div>
                    <div className="text-sm text-slate-500">Total Requisitions</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <div className="text-2xl font-bold text-amber-700">{stats.pendingReqs}</div>
                    <div className="text-sm text-amber-600">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-emerald-50 rounded-xl">
                    <div className="text-2xl font-bold text-emerald-700">{stats.approvedReqs}</div>
                    <div className="text-sm text-emerald-600">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-2xl font-bold text-red-700">{stats.rejectedReqs}</div>
                    <div className="text-sm text-red-600">Rejected</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-600" />
                  Send Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: "sms", label: "SMS", icon: MessageSquare, color: "sky" },
                    { key: "whatsapp", label: "WhatsApp", icon: MessageSquare, color: "green" },
                    { key: "email", label: "Email", icon: Mail, color: "purple" },
                    { key: "call", label: "Voice Call", icon: Phone, color: "orange" },
                  ].map((ch) => (
                    <button
                      key={ch.key}
                      onClick={() => setNotificationChannels(prev => {
                        const next = new Set(prev);
                        next.has(ch.key) ? next.delete(ch.key) : next.add(ch.key);
                        return next;
                      })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        notificationChannels.has(ch.key as any)
                          ? `border-${ch.color}-500 bg-${ch.color}-50`
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <ch.icon className={`w-6 h-6 mx-auto mb-1 text-${ch.color}-600`} />
                      <div className="text-xs font-medium text-center">{ch.label}</div>
                    </button>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Recipient Phone/Email</label>
                    <Input
                      placeholder="+254700000000 or email@example.com"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Message</label>
                    <Input
                      placeholder="Enter your message..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
                  </div>
                </div>
                
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!recipientPhone || !customMessage}
                  onClick={() => sendNotification(recipientPhone, customMessage, Array.from(notificationChannels))}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification via {Array.from(notificationChannels).join(", ")}
                </Button>
              </CardContent>
            </Card>

            {/* Notification History */}
            {notificationHistory.length > 0 && (
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-500" />
                    Recent Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {notificationHistory.slice(0, 10).map((n: any) => (
                      <div key={n.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-sm text-slate-800">{n.to}</div>
                            <div className="text-xs text-slate-500">{n.message}</div>
                          </div>
                          <div className="text-xs text-slate-400">{new Date(n.sentAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stock Alerts Tab */}
        {activeTab === "stock" && (
          <Card className="bg-white border-slate-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Stock Alerts ({stats.lowStock} items low)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Item</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">In Stock</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Reorder Level</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.filter((i: any) => (i.quantity_in_stock || 0) < (i.reorder_level || 10)).slice(0, 50).map((item: any, i: number) => (
                      <tr key={item.id} className="border-b border-slate-100 bg-amber-50/30 hover:bg-amber-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{item.item_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.category_name || item.category || "—"}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{item.quantity_in_stock || 0}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.reorder_level || 10}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className="bg-red-100 text-red-700">LOW STOCK</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stats.lowStock === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400" />
                  All items are well stocked!
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Backup Tab */}
        {activeTab === "backup" && (
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-slate-600" />
                Database Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Download a complete JSON backup of all system data including requisitions, purchase orders, items, suppliers, and goods received.
              </p>
              
              {backupRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-600 transition-all"
                      style={{ width: `${backupProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  className="gap-2 bg-sky-600 hover:bg-sky-700"
                  disabled={backupRunning}
                  onClick={runBackup}
                >
                  <Download className="w-4 h-4" />
                  {backupRunning ? "Backing up..." : "Download Backup (JSON)"}
                </Button>
                <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                  <Printer className="w-4 h-4" />
                  Print Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Action Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="bg-white rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkAction === "approve" && <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Bulk Approve</>}
              {bulkAction === "reject" && <><XCircle className="w-5 h-5 text-red-600" /> Bulk Reject</>}
              {bulkAction === "forward" && <><Send className="w-5 h-5 text-orange-600" /> Bulk Forward</>}
              {bulkAction === "notify" && <><Bell className="w-5 h-5 text-purple-600" /> Send Notification</>}
            </DialogTitle>
            <DialogDescription>{selectedItems.size} item(s) selected</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {(bulkAction === "forward" || bulkAction === "notify") && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Recipient</label>
                <Input
                  placeholder="+254700000000"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                />
              </div>
            )}
            {bulkAction === "notify" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Message</label>
                <textarea
                  className="w-full p-3 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Enter message..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <Button
              className={`${bulkAction === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : bulkAction === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-sky-600 hover:bg-sky-700"}`}
              disabled={
                selectedItems.size === 0 ||
                (bulkAction === "forward" && !recipientPhone) ||
                (bulkAction === "notify" && (!recipientPhone || !customMessage))
              }
              onClick={executeBulkAction}
            >
              Confirm ({selectedItems.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-white rounded-xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Record Details
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {Object.entries(detailItem)
                .filter(([k]) => !["id", "updated_at"].includes(k))
                .slice(0, 15)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-3 py-2 border-b border-slate-100">
                    <span className="text-slate-400 min-w-[120px] text-xs font-medium uppercase">{k.replace(/_/g, " ")}</span>
                    <span className="text-slate-800 text-sm font-medium">{String(v ?? "—")}</span>
                  </div>
                ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrackingApprovalPage;
