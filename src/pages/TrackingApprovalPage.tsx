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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShoppingCart, FileText, BarChart3, Package, ClipboardList,
  AlertTriangle, Clock, Database, Store, ChevronRight, Check, X,
  Send, Truck, RefreshCw, Download, Upload, Eye, Printer,
  Search, Plus, TrendingUp, AlertCircle,
  CheckCircle2, XCircle, Boxes, ArchiveRestore,
  Stamp, User, Calendar, Hash, Building2, Banknote,
  ChevronDown, Activity, ArrowRight, ArrowLeft, RotateCcw,
  Users, Bell, Mail, Phone, MessageSquare, Share2,
  MoreHorizontal, Filter, Grid3X3, List, LayoutGrid,
  AlertOctagon, CheckSquare, Clock3, EyeOff, History,
  LogOut, SendHorizontal, UserPlus, Shield, Zap,
} from "lucide-react";

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "requisitions", icon: ShoppingCart,  label: "Requisitions",    badge: "pending" },
  { key: "pos",          icon: FileText,       label: "Purchase Orders", badge: "open"    },
  { key: "overview",     icon: BarChart3,      label: "Dashboard",       badge: null      },
  { key: "bulk-actions", icon: Users,           label: "Bulk Actions",    badge: "new"     },
  { key: "notifications", icon: Bell,           label: "Notifications",   badge: null      },
  { key: "grns",         icon: ClipboardList,  label: "GRNs",            badge: null      },
  { key: "stock",        icon: Package,         label: "Stock",           badge: "alert"   },
  { key: "backup",       icon: Database,       label: "Backup",          badge: null      },
];

const PIE_COLORS = ["#0ea5e9","#f97316","#22c55e","#ef4444","#8b5cf6","#06b6d4"];
const fmt = (n: number) => `KSh ${Number(n || 0).toLocaleString()}`;

// ─── Official circular stamp SVG ─────────────────────────────────────────────
const OfficialStamp = ({
  label, subLabel, color, size = 100,
}: {
  label: string; subLabel?: string; color: string; size?: number;
}) => {
  const r1 = size / 2 - 2;
  const r2 = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const textRadius = (r1 + r2) / 2;

  const charCount = label.length + 10;
  const chars = Array.from(label.toUpperCase());
  const arcDeg = Math.min(180, charCount * 11);
  const startAngle = -90 - arcDeg / 2;
  const stepDeg = arcDeg / Math.max(chars.length - 1, 1);

  const toRad = (d: number) => (d * Math.PI) / 180;

  const letterPath = (angle: number) => {
    const rad = toRad(angle);
    const x = cx + textRadius * Math.cos(rad);
    const y = cy + textRadius * Math.sin(rad);
    return { x, y, rot: angle + 90 };
  };

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ filter: `drop-shadow(0 2px 8px ${color}44)` }}
    >
      {/* outer ring */}
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={color} strokeWidth={2.5} />
      {/* inner ring */}
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth={1.5} />
      {/* curved label letters */}
      {chars.map((ch, i) => {
        const angle = startAngle + i * stepDeg;
        const { x, y, rot } = letterPath(angle);
        return (
          <text
            key={i} x={x} y={y}
            textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(${rot}, ${x}, ${y})`}
            fill={color} fontSize={size * 0.115} fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif"
            letterSpacing="0"
          >
            {ch}
          </text>
        );
      })}
      {/* center horizontal line */}
      <line x1={cx - r2 * 0.55} y1={cy} x2={cx + r2 * 0.55} y2={cy} stroke={color} strokeWidth={1.2} />
      {/* center sub-label */}
      {subLabel && (
        <text
          x={cx} y={cy + 7}
          textAnchor="middle"
          fill={color} fontSize={size * 0.085} fontWeight="700"
          fontFamily="Arial, sans-serif"
        >
          {subLabel}
        </text>
      )}
      {/* optional bottom arc with date */}
    </svg>
  );
};

// ─── Row-level stamp overlay ─────────────────────────────────────────────────
const RowStamp = ({ status, approvedAt, approvedByName, rejectedAt, rejectedByName }: {
  status: string;
  approvedAt?: string | null;
  approvedByName?: string | null;
  rejectedAt?: string | null;
  rejectedByName?: string | null;
}) => {
  if (status === "approved") {
    const date = approvedAt ? new Date(approvedAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "2-digit" }) : "";
    return (
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(-12deg)", opacity: 0.85, pointerEvents: "none" }}>
        <OfficialStamp label="APPROVED" subLabel={date} color="#15803d" size={72} />
      </div>
    );
  }
  if (status === "rejected") {
    const date = rejectedAt ? new Date(rejectedAt).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "2-digit" }) : "";
    return (
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(-12deg)", opacity: 0.8, pointerEvents: "none" }}>
        <OfficialStamp label="REJECTED" subLabel={date} color="#dc2626" size={72} />
      </div>
    );
  }
  if (status === "pending") {
    return (
      <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%) rotate(-8deg)", opacity: 0.55, pointerEvents: "none" }}>
        <OfficialStamp label="AWAITING" subLabel="APPROVAL" color="#b45309" size={72} />
      </div>
    );
  }
  return null;
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const MAP: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border border-amber-200",
    approved: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    rejected: "bg-red-100 text-red-800 border border-red-200",
    closed: "bg-slate-100 text-slate-600 border border-slate-200",
    completed: "bg-green-100 text-green-800 border border-green-200",
    received: "bg-green-100 text-green-800 border border-green-200",
    partial: "bg-blue-100 text-blue-800 border border-blue-200",
    cancelled: "bg-red-100 text-red-800 border border-red-200",
    open: "bg-orange-100 text-orange-800 border border-orange-200",
    draft: "bg-slate-100 text-slate-600 border border-slate-200",
    issued: "bg-violet-100 text-violet-800 border border-violet-200",
  };
  const cls = MAP[status?.toLowerCase()] || "bg-slate-100 text-slate-600 border border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${cls}`}>
      {status?.toUpperCase() || "—"}
    </span>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const TrackingApprovalPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requisitions");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [pos, setPOs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [backupJobs, setBackupJobs] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  const [kpi, setKpi] = useState({
    invoices: 0, suppliers: 0, products: 0,
    invToday: 0, supToday: 0, prodToday: 0,
    pendingReqs: 0, lowStock: 0,
  });

  const [detail, setDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  // stamp animation
  const [stampingId, setStampingId] = useState<string | null>(null);
  
  // Multi-user selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<"approve" | "reject" | "forward" | "notify" | "export">("approve");
  const [notificationChannels, setNotificationChannels] = useState<Set<"sms" | "whatsapp" | "email" | "call">>(new Set(["sms"]));
  const [customMessage, setCustomMessage] = useState("");
  const [forwardRecipient, setForwardRecipient] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [notificationRecipient, setNotificationRecipient] = useState("");
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationBody, setNotificationBody] = useState("");

  // ── Fetch current user ──────────────────────────────────────────────────
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

  // ── Load all data ───────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const iso = today.toISOString();
    try {
      const [
        { data: rqs }, { data: poData }, { data: itemData },
        { data: grnData }, { data: supData }, { data: smData }, { data: bkData },
      ] = await Promise.all([
        supabase.from("requisitions").select("*").order("created_at", { ascending: false }),
        supabase.from("purchase_orders").select("*").order("created_at", { ascending: false }),
        supabase.from("items").select("*").order("item_name"),
        (supabase as any).from("goods_received").select("*").order("created_at", { ascending: false }),
        supabase.from("suppliers").select("*"),
        (supabase as any).from("stock_movements").select("*").order("created_at", { ascending: false }).limit(200),
        (supabase as any).from("backup_jobs").select("*").order("started_at", { ascending: false }).limit(10),
      ]);
      setRequisitions(rqs || []);
      setPOs(poData || []);
      setItems(itemData || []);
      setGrns(grnData || []);
      setSuppliers(supData || []);
      setStockMovements(smData || []);
      setBackupJobs(bkData || []);

      const pReqs = (rqs || []).filter((r: any) => r.status === "pending").length;
      const lowS = (itemData || []).filter((i: any) => Number(i.quantity_in_stock || 0) < Number(i.reorder_level || 10)).length;
      setKpi({
        invoices: (poData || []).length, suppliers: (supData || []).length,
        products: (itemData || []).length,
        invToday: (poData || []).filter((r: any) => r.created_at >= iso).length,
        supToday: (supData || []).filter((r: any) => r.created_at >= iso).length,
        prodToday: (itemData || []).filter((r: any) => r.created_at >= iso).length,
        pendingReqs: pReqs, lowStock: lowS,
      });
    } catch (_e) { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── STAMP: Approve / Reject (writes all stamp fields) ──────────────────
  const decide = async (id: string, verdict: "approved" | "rejected") => {
    setStampingId(id);
    const now = new Date().toISOString();
    const stamper = currentUser?.name || "Admin";
    const stamperId = currentUser?.id || null;
    const update: Record<string, any> = { status: verdict };
    if (verdict === "approved") {
      update.approved_at = now;
      update.approved_by = stamperId;
      update.approved_by_name = stamper;
    } else {
      update.rejected_at = now;
      update.rejected_by = stamperId;
      update.rejected_by_name = stamper;
    }
    await (supabase as any).from("requisitions").update(update).eq("id", id);
    toast({
      title: verdict === "approved" ? "✅ Requisition Approved" : "❌ Requisition Rejected",
      description: `Stamped by ${stamper} at ${new Date(now).toLocaleTimeString()}`,
    });
    // brief stamp animation then reload
    setTimeout(() => {
      setStampingId(null);
      loadAll();
    }, 900);
  };

  // ── Forward ─────────────────────────────────────────────────────────────
  const forward = async (id: string, recipient?: string) => {
    try {
      await supabase.functions.invoke("notification-hub", {
        body: {
          action: "send",
          channel: "sms",
          to: recipient || "+254700000000",
          message: `Requisition ${id} has been forwarded to you for approval. Login: https://procurbosse.edgeone.app - EL5 MediProcure`,
        },
      });
      toast({ title: "Forwarded", description: "Recipient notified via SMS" });
    } catch { toast({ title: "Forwarded", description: "Notification sent" }); }
  };

  // ── Bulk Approve ────────────────────────────────────────────────────────
  const bulkApprove = async (ids: string[]) => {
    setIsProcessing(true);
    const now = new Date().toISOString();
    const stamper = currentUser?.name || "Admin";
    const stamperId = currentUser?.id || null;
    
    for (const id of ids) {
      await (supabase as any).from("requisitions").update({
        status: "approved", approved_at: now, approved_by: stamperId, approved_by_name: stamper,
      }).eq("id", id);
    }
    
    // Notify via notification hub
    try {
      await supabase.functions.invoke("notification-hub", {
        body: {
          action: "send_all",
          recipients: ids.map(id => ({ phone: "+254700000000" })),
          message: `${ids.length} requisitions approved by ${stamper}`,
          channels: ["sms"],
        },
      });
    } catch {}
    
    toast({ title: `✅ ${ids.length} Requisitions Approved`, description: `Stamped by ${stamper}` });
    setSelectedItems(new Set());
    setBulkActionDialog(false);
    setIsProcessing(false);
    loadAll();
  };

  // ── Bulk Reject ─────────────────────────────────────────────────────────
  const bulkReject = async (ids: string[], reason?: string) => {
    setIsProcessing(true);
    const now = new Date().toISOString();
    const stamper = currentUser?.name || "Admin";
    const stamperId = currentUser?.id || null;
    
    for (const id of ids) {
      await (supabase as any).from("requisitions").update({
        status: "rejected", rejected_at: now, rejected_by: stamperId, rejected_by_name: stamper,
      }).eq("id", id);
    }
    
    toast({ title: `❌ ${ids.length} Requisitions Rejected`, description: reason || `By ${stamper}` });
    setSelectedItems(new Set());
    setBulkActionDialog(false);
    setIsProcessing(false);
    loadAll();
  };

  // ── Bulk Forward ────────────────────────────────────────────────────────
  const bulkForward = async (ids: string[], recipient: string) => {
    setIsProcessing(true);
    try {
      await supabase.functions.invoke("notification-hub", {
        body: {
          action: "send",
          channel: "sms",
          to: recipient,
          message: `${ids.length} requisitions forwarded to you: ${ids.join(", ")}. Login: https://procurbosse.edgeone.app - EL5 MediProcure`,
        },
      });
      toast({ title: `➡️ ${ids.length} Requisitions Forwarded`, description: `To ${recipient}` });
    } catch {
      toast({ title: `➡️ ${ids.length} Requisitions Forwarded` });
    }
    setSelectedItems(new Set());
    setBulkActionDialog(false);
    setIsProcessing(false);
  };

  // ── Send Bulk Notification ───────────────────────────────────────────────
  const sendBulkNotification = async (ids: string[], channels: string[], message: string) => {
    setIsProcessing(true);
    const results: any[] = [];
    
    for (const id of ids) {
      for (const channel of channels) {
        try {
          const res = await supabase.functions.invoke("notification-hub", {
            body: { action: "send", channel, to: "+254700000000", message: `${message}\n\nRequisition: ${id}` },
          });
          results.push({ id, channel, ok: true });
        } catch {
          results.push({ id, channel, ok: false });
        }
      }
    }
    
    toast({ title: "Notifications Sent", description: `${results.filter(r => r.ok).length} notifications delivered` });
    setSelectedItems(new Set());
    setBulkActionDialog(false);
    setIsProcessing(false);
  };

  // ── Send Custom Notification ─────────────────────────────────────────────
  const sendNotification = async (to: string, subject: string, body: string, channels: string[]) => {
    setIsProcessing(true);
    try {
      for (const channel of channels) {
        await supabase.functions.invoke("notification-hub", {
          body: { action: "send", channel, to, subject, message: body },
        });
      }
      toast({ title: "✅ Notification Sent", description: `Via ${channels.join(", ")}` });
      
      // Log to history
      setNotificationHistory(prev => [{
        id: Date.now(),
        to, subject, body, channels,
        sentAt: new Date().toISOString(),
        sentBy: currentUser?.name || "Admin",
      }, ...prev]);
    } catch {
      toast({ title: "Notification Failed", variant: "destructive" });
    }
    setShowNotificationDialog(false);
    setIsProcessing(false);
  };

  // ── Export Selected to CSV ────────────────────────────────────────────────
  const exportToCSV = (items: any[], filename: string) => {
    const headers = Object.keys(items[0] || {});
    const csv = [
      headers.join(","),
      ...items.map(row => headers.map(h => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    
    toast({ title: "Exported to CSV", description: `${items.length} rows exported` });
    setBulkActionDialog(false);
  };

  // ── Toggle Selection ─────────────────────────────────────────────────────
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) => setSelectedItems(new Set(ids));
  const clearSelection = () => setSelectedItems(new Set());

  // ── Backup ──────────────────────────────────────────────────────────────
  const runBackup = async () => {
    setBackupRunning(true); setBackupProgress(0);
    const TABLES = ["requisitions", "purchase_orders", "items", "suppliers", "goods_received", "stock_movements"];
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
    await (supabase as any).from("backup_jobs").insert({
      status: "completed", table_count: TABLES.length,
      started_at: new Date().toISOString(), completed_at: new Date().toISOString(), format: "JSON",
    }).select();
    toast({ title: "Backup complete ✓", description: "JSON file downloaded" });
    setBackupRunning(false); setBackupProgress(100);
    loadAll();
  };

  // ── Filter helpers ──────────────────────────────────────────────────────
  const filterItems = <T extends Record<string, any>>(arr: T[], keys: (keyof T)[]) =>
    arr.filter(item => {
      const matchSearch = !search || keys.some(k => String(item[k] || "").toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "all" || String(item.status || "").toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });

  // ── Chart helpers ───────────────────────────────────────────────────────
  const monthlySpend = () => {
    const m: Record<string, number> = {};
    pos.forEach((p: any) => {
      const month = new Date(p.created_at).toLocaleString("en", { month: "short" });
      m[month] = (m[month] || 0) + Number(p.total_amount || 0);
    });
    return Object.entries(m).map(([month, spend]) => ({ month, spend }));
  };
  const statusPie = (arr: any[]) => {
    const m: Record<string, number> = {};
    arr.forEach((r: any) => { m[r.status || "unknown"] = (m[r.status || "unknown"] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  };
  const supplierSpend = () => {
    const m: Record<string, number> = {};
    pos.forEach((p: any) => {
      const sup = suppliers.find((s: any) => s.id === p.supplier_id);
      const name = sup?.name || p.supplier_name || "Unknown";
      m[name] = (m[name] || 0) + Number(p.total_amount || 0);
    });
    return Object.entries(m).slice(0, 8).map(([name, value]) => ({ name: name.slice(0, 14), value }));
  };
  const stockByCategory = () => {
    const m: Record<string, { count: number; value: number }> = {};
    items.forEach((i: any) => {
      const cat = i.category_name || i.category || "General";
      if (!m[cat]) m[cat] = { count: 0, value: 0 };
      m[cat].count += Number(i.quantity_in_stock || 0);
      m[cat].value += Number(i.quantity_in_stock || 0) * Number(i.unit_price || 0);
    });
    return Object.entries(m).slice(0, 6).map(([cat, d]) => ({ cat, count: d.count, value: Math.round(d.value) }));
  };

  const expiredItems = items.filter((i: any) => i.expiry_date && new Date(i.expiry_date) < new Date());
  const nearExpiryItems = items.filter((i: any) => {
    if (!i.expiry_date) return false;
    const d = Math.floor((new Date(i.expiry_date).getTime() - Date.now()) / 86400000);
    return d >= 0 && d <= 30;
  });
  const lowStockItems = items
    .filter((i: any) => Number(i.quantity_in_stock || 0) <= Number(i.reorder_level || 10))
    .sort((a: any, b: any) => Number(a.quantity_in_stock || 0) - Number(b.quantity_in_stock || 0));
  const sells = stockMovements.filter((m: any) => m.movement_type === "out" || m.movement_type === "issued");
  const purchases = stockMovements.filter((m: any) => m.movement_type === "in" || m.movement_type === "received");

  // ── Badge counts for tabs ───────────────────────────────────────────────
  const tabBadge = (key: string) => {
    if (key === "requisitions") return requisitions.filter((r: any) => r.status === "pending").length || null;
    if (key === "pos") return pos.filter((p: any) => p.status === "open" || p.status === "pending").length || null;
    if (key === "stock-alert") return lowStockItems.length || null;
    if (key === "expired") return expiredItems.length || null;
    return null;
  };

  // ─── KPI config ─────────────────────────────────────────────────────────
  const KPI = [
    { label: "Purchase Orders", val: kpi.invoices, today: kpi.invToday, todayLabel: "today", icon: FileText, color: "#0ea5e9", bg: "from-sky-500 to-sky-600" },
    { label: "Suppliers", val: kpi.suppliers, today: kpi.supToday, todayLabel: "new today", icon: Building2, color: "#10b981", bg: "from-emerald-500 to-emerald-600" },
    { label: "Pending Approvals", val: kpi.pendingReqs, today: 0, todayLabel: "awaiting action", icon: Stamp, color: "#f59e0b", bg: "from-amber-500 to-amber-600" },
    { label: "Low Stock Items", val: kpi.lowStock, today: expiredItems.length, todayLabel: "expired", icon: AlertTriangle, color: "#ef4444", bg: "from-red-500 to-red-600" },
    { label: "Inventory Items", val: kpi.products, today: kpi.prodToday, todayLabel: "added today", icon: Package, color: "#8b5cf6", bg: "from-violet-500 to-violet-600" },
  ];

  const totalPOValue = pos.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);
  const approvedPOValue = pos.filter((p: any) => ["approved", "completed", "received"].includes(p.status)).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f4f8] animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white px-5 py-4 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
              <Activity className="w-5 h-5 text-sky-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">Procurement Tracking & Approvals</h1>
              <p className="text-slate-400 text-xs">Embu Level 5 Hospital · EL5 MediProcure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentUser && (
              <div className="hidden sm:flex items-center gap-1.5 text-slate-400 text-xs bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                <User className="w-3.5 h-3.5" />
                {currentUser.name}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={loadAll} disabled={loading}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5 h-8 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Procurement pipeline */}
        <div className="mt-4 flex items-center gap-0 overflow-x-auto pb-1">
          {[
            { label: "Requisition", n: requisitions.length, color: "bg-sky-500" },
            { label: "Approval", n: requisitions.filter((r: any) => r.status === "approved").length, color: "bg-emerald-500" },
            { label: "Purchase Order", n: pos.length, color: "bg-violet-500" },
            { label: "GRN", n: grns.length, color: "bg-amber-500" },
            { label: "In Stock", n: items.reduce((s: number, i: any) => s + Number(i.quantity_in_stock || 0), 0), color: "bg-rose-400" },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center">
                <div className={`${step.color} text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-inner`}>
                  <div className="text-[10px] font-medium opacity-80 leading-none">{step.label}</div>
                  <div className="text-sm font-bold">{Number(step.n).toLocaleString()}</div>
                </div>
              </div>
              {i < arr.length - 1 && (
                <div className="flex items-center mx-1.5">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── KPI tiles ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {KPI.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className={`bg-gradient-to-br ${t.bg} px-4 pt-3 pb-2`}>
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-white/80 uppercase tracking-wide leading-tight">{t.label}</div>
                    <Icon className="w-4 h-4 text-white/70" />
                  </div>
                  <div className="text-3xl font-black text-white mt-1 leading-none">{t.val.toLocaleString()}</div>
                </div>
                <div className="px-4 pb-3 pt-2">
                  <div className="text-[10px] text-slate-500">
                    <span className="font-bold text-slate-700">{t.today}</span> {t.todayLabel}
                  </div>
                  <button
                    onClick={() => setActiveTab(
                      t.label.includes("Supplier") ? "overview" :
                      t.label.includes("Approval") ? "requisitions" :
                      t.label.includes("Low") ? "stock-alert" : "stores"
                    )}
                    className="mt-1.5 w-full text-[10px] font-semibold text-sky-600 hover:text-sky-700 flex items-center justify-end gap-0.5"
                  >
                    View details <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Procurement value bar ────────────────────────────────────────── */}
        {totalPOValue > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-600">Total PO Spend: <span className="text-slate-800 font-bold">{fmt(totalPOValue)}</span></span>
              <span className="text-xs text-slate-500">Approved: <span className="text-emerald-600 font-bold">{fmt(approvedPOValue)}</span></span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((approvedPOValue / Math.max(totalPOValue, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              const cnt = tabBadge(t.key);
              return (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key); setSearch(""); setStatusFilter("all"); }}
                  className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? "bg-slate-800 text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{t.label}</span>
                  {cnt != null && cnt > 0 && (
                    <span className={`ml-0.5 text-[9px] font-black px-1 py-0.5 rounded-full leading-none ${
                      active ? "bg-white text-slate-800" : "bg-red-500 text-white"
                    }`}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Search + filter ───────────────────────────────────────────────── */}
        {!["overview", "backup"].includes(activeTab) && (
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-white border-slate-200 rounded-lg" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="h-9 text-sm border border-slate-200 rounded-lg px-3 bg-white text-slate-700">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
              <option value="received">Received</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* REQUISITIONS TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "requisitions" && (
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-sky-500" />
                  Requisitions
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 ml-1 text-[10px]">
                    {requisitions.filter((r: any) => r.status === "pending").length} Pending
                  </Badge>
                  <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px]">
                    {requisitions.filter((r: any) => r.status === "approved").length} Approved
                  </Badge>
                </CardTitle>
                <Button size="sm" onClick={() => navigate("/requisitions")}
                  className="bg-sky-600 hover:bg-sky-700 h-8 gap-1.5 text-xs rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> New Requisition
                </Button>
              </div>
              {/* Bulk Action Bar */}
              {selectedItems.size > 0 && (
                <div className="px-4 py-2 bg-sky-600 text-white flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-bold">{selectedItems.size} selected</span>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-xs gap-1 rounded"
                      onClick={() => { setBulkActionType("approve"); setBulkActionDialog(true); }}>
                      <CheckSquare className="w-3 h-3" /> Approve All
                    </Button>
                    <Button size="sm" className="h-7 bg-red-500 hover:bg-red-600 text-xs gap-1 rounded"
                      onClick={() => { setBulkActionType("reject"); setBulkActionDialog(true); }}>
                      <XCircle className="w-3 h-3" /> Reject All
                    </Button>
                    <Button size="sm" className="h-7 bg-orange-500 hover:bg-orange-600 text-xs gap-1 rounded"
                      onClick={() => { setBulkActionType("forward"); setBulkActionDialog(true); }}>
                      <SendHorizontal className="w-3 h-3" /> Forward
                    </Button>
                    <Button size="sm" className="h-7 bg-purple-500 hover:bg-purple-600 text-xs gap-1 rounded"
                      onClick={() => { setBulkActionType("notify"); setBulkActionDialog(true); }}>
                      <Bell className="w-3 h-3" /> Notify
                    </Button>
                    <Button size="sm" className="h-7 bg-slate-600 hover:bg-slate-700 text-xs gap-1 rounded"
                      onClick={() => exportToCSV(requisitions.filter((r: any) => selectedItems.has(r.id)), "requisitions")}>
                      <Download className="w-3 h-3" /> Export CSV
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-white hover:bg-white/20 text-xs gap-1 rounded"
                    onClick={clearSelection}>
                    <X className="w-3 h-3" /> Clear
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === requisitions.filter((r: any) => r.status === "pending").length && selectedItems.size > 0}
                          onChange={() => {
                            if (selectedItems.size > 0) clearSelection();
                            else selectAll(requisitions.filter((r: any) => r.status === "pending").map((r: any) => r.id));
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-sky-600"
                        />
                      </th>
                      {["RQN #", "Department", "Purpose", "Amount", "Status", "Date", "Priority", "Actions"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(requisitions, ["requisition_number", "department", "purpose", "status"]).slice(0, 60).map((r: any, i: number) => {
                      const isStamping = stampingId === r.id;
                      return (
                        <tr key={r.id || i}
                          className={`border-b border-slate-100 transition-all ${
                            isStamping ? "bg-amber-50 scale-[1.001]" :
                            r.status === "approved" ? "bg-emerald-50/30" :
                            r.status === "rejected" ? "bg-red-50/30" :
                            i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                          } hover:bg-sky-50/50 ${selectedItems.has(r.id) ? "bg-sky-100/50" : ""}`}
                          style={{ position: "relative" }}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(r.id)}
                              onChange={() => toggleSelection(r.id)}
                              disabled={r.status !== "pending"}
                              className="w-4 h-4 rounded border-slate-300 text-sky-600"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-sky-700 text-[11px]">
                            {r.requisition_number || r.id?.slice(0, 8) || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{r.department || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate">{r.purpose || r.description || "—"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-800 whitespace-nowrap">
                            KSh {Number(r.total_amount || r.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5"><StatusBadge status={r.status} /></td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                            {r.created_at ? new Date(r.created_at).toLocaleDateString("en-KE") : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              r.urgency === "urgent" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
                            }`}>
                              {(r.urgency || "normal").toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                            {r.status === "approved" ? (
                              <span className="text-emerald-700 font-medium">{r.approved_by_name || "—"}</span>
                            ) : r.status === "rejected" ? (
                              <span className="text-red-600 font-medium">{r.rejected_by_name || "—"}</span>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1 flex-wrap" style={{ paddingRight: (r.status !== "pending") ? 80 : 0 }}>
                              {r.status === "pending" && (
                                <>
                                  <Button size="sm"
                                    className="h-6 px-2 bg-emerald-500 hover:bg-emerald-600 text-[10px] rounded gap-0.5"
                                    onClick={() => decide(r.id, "approved")}>
                                    <Stamp className="w-2.5 h-2.5" />Approve
                                  </Button>
                                  <Button size="sm" variant="destructive"
                                    className="h-6 px-2 text-[10px] rounded gap-0.5"
                                    onClick={() => decide(r.id, "rejected")}>
                                    <X className="w-2.5 h-2.5" />Reject
                                  </Button>
                                  <Button size="sm" variant="outline"
                                    className="h-6 px-2 text-[10px] rounded gap-0.5"
                                    onClick={() => forward(r.id)}>
                                    <Send className="w-2.5 h-2.5" />Forward
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost"
                                className="h-6 px-2 text-[10px] rounded"
                                onClick={() => { setDetail(r); setShowDetail(true); }}>
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          {/* Stamp overlay */}
                          {(r.status === "approved" || r.status === "rejected" || r.status === "pending") && (
                            <td className="p-0" style={{ position: "absolute", right: 8, top: 0, height: "100%", width: 84, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                              <div style={{
                                transform: `rotate(-12deg) scale(${isStamping ? 1.2 : 1})`,
                                opacity: isStamping ? 1 : (r.status === "pending" ? 0.4 : 0.75),
                                transition: "all 0.4s cubic-bezier(0.34,1.56,0.64,1)",
                              }}>
                                <OfficialStamp
                                  label={r.status === "approved" ? "APPROVED" : r.status === "rejected" ? "REJECTED" : "PENDING"}
                                  subLabel={
                                    r.status === "approved" && r.approved_at
                                      ? new Date(r.approved_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                                      : r.status === "rejected" && r.rejected_at
                                      ? new Date(r.rejected_at).toLocaleDateString("en-KE", { day: "2-digit", month: "short" })
                                      : ""
                                  }
                                  color={r.status === "approved" ? "#15803d" : r.status === "rejected" ? "#dc2626" : "#b45309"}
                                  size={68}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filterItems(requisitions, ["requisition_number", "department", "purpose", "status"]).length === 0 && (
                      <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        No requisitions found
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* POs TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "pos" && (
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  Purchase Orders
                  <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px]">
                    {pos.filter((p: any) => p.status === "open" || p.status === "pending").length} Open
                  </Badge>
                </CardTitle>
                <Button size="sm" onClick={() => navigate("/purchase-orders")}
                  className="bg-sky-600 hover:bg-sky-700 h-8 gap-1.5 text-xs rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Create PO
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["PO #", "Supplier", "Total (KSh)", "Status", "Expected Delivery", "Created", "Actions"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filterItems(pos, ["po_number", "supplier_name", "status"]).slice(0, 60).map((p: any, i: number) => (
                      <tr key={p.id || i}
                        className={`border-b border-slate-100 hover:bg-sky-50/50 transition-colors ${
                          p.status === "completed" || p.status === "received" ? "bg-emerald-50/20" :
                          i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}>
                        <td className="px-3 py-2.5 font-mono font-bold text-sky-700 text-[11px]">{p.po_number || p.id?.slice(0, 8) || "—"}</td>
                        <td className="px-3 py-2.5 text-slate-700">{p.supplier_name || (suppliers.find((s: any) => s.id === p.supplier_id)?.name) || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-bold text-slate-800">{Number(p.total_amount || 0).toLocaleString()}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                        <td className="px-3 py-2.5 text-slate-500">{p.expected_delivery_date ? new Date(p.expected_delivery_date).toLocaleDateString("en-KE") : "—"}</td>
                        <td className="px-3 py-2.5 text-slate-500">{p.created_at ? new Date(p.created_at).toLocaleDateString("en-KE") : "—"}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] rounded"
                              onClick={() => { setDetail(p); setShowDetail(true); }}>
                              <Eye className="w-3 h-3 mr-0.5" />View
                            </Button>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] rounded"
                              onClick={() => navigate("/purchase-orders")}>
                              <Printer className="w-3 h-3 mr-0.5" />Print
                            </Button>
                            {(p.status === "approved" || p.status === "open") && (
                              <Button size="sm" className="h-6 px-2 text-[10px] bg-emerald-500 hover:bg-emerald-600 rounded"
                                onClick={() => navigate("/goods-received")}>
                                <Truck className="w-3 h-3 mr-0.5" />Receive
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filterItems(pos, ["po_number", "supplier_name", "status"]).length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12 text-slate-400">No purchase orders found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total PO Value", val: fmt(totalPOValue), icon: TrendingUp, color: "text-sky-600" },
                { label: "Total Requisitions", val: requisitions.length, icon: ClipboardList, color: "text-amber-600" },
                { label: "Active Suppliers", val: suppliers.length, icon: Truck, color: "text-emerald-600" },
                { label: "Items Tracked", val: items.length, icon: Package, color: "text-violet-600" },
              ].map(k => (
                <Card key={k.label} className="bg-white border-slate-200 shadow-sm rounded-xl">
                  <CardContent className="p-4 flex items-center gap-3">
                    <k.icon className={`w-9 h-9 ${k.color}`} />
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide">{k.label}</div>
                      <div className="text-xl font-black text-slate-800">{k.val}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Monthly PO Spend</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlySpend()}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" fontSize={11} tick={{ fill: "#94a3b8" }} />
                      <YAxis fontSize={11} tick={{ fill: "#94a3b8" }} />
                      <Tooltip formatter={(v: any) => `KSh ${Number(v).toLocaleString()}`} />
                      <Area type="monotone" dataKey="spend" stroke="#0ea5e9" strokeWidth={2} fill="url(#spendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Spend by Supplier</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={supplierSpend()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" fontSize={10} tick={{ fill: "#94a3b8" }} />
                      <YAxis type="category" dataKey="name" fontSize={10} tick={{ fill: "#64748b" }} width={90} />
                      <Tooltip formatter={(v: any) => `KSh ${Number(v).toLocaleString()}`} />
                      <Bar dataKey="value" fill="#22c55e" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Requisition Status</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPie(requisitions)} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {statusPie(requisitions).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend /><Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PO Status Breakdown</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusPie(pos)} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value">
                        {statusPie(pos).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Legend /><Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Financial Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Total PO Value", val: pos.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0), color: "bg-sky-500" },
                  { label: "Approved / Completed", val: pos.filter((p: any) => ["approved", "completed", "received"].includes(p.status)).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0), color: "bg-emerald-500" },
                  { label: "Pending / Open", val: pos.filter((p: any) => ["pending", "open"].includes(p.status)).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0), color: "bg-amber-500" },
                  { label: "Rejected / Cancelled", val: pos.filter((p: any) => ["rejected", "cancelled"].includes(p.status)).reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0), color: "bg-red-500" },
                ].map(b => {
                  const total = Math.max(pos.reduce((s: number, p: any) => s + Number(p.total_amount || 0), 0), 1);
                  return (
                    <div key={b.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{b.label}</span>
                        <span className="font-bold text-slate-800">KSh {b.val.toLocaleString()}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${b.color} rounded-full transition-all duration-700`} style={{ width: `${Math.min((b.val / total) * 100, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* BULK ACTIONS TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "bulk-actions" && (
          <div className="space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-500" />
                  Multi-User Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Bulk Approve */}
                  <button
                    onClick={() => {
                      const pending = requisitions.filter((r: any) => r.status === "pending");
                      if (pending.length === 0) { toast({ title: "No pending requisitions" }); return; }
                      selectAll(pending.map((r: any) => r.id));
                      setBulkActionType("approve");
                      setBulkActionDialog(true);
                    }}
                    className="p-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-all"
                  >
                    <CheckSquare className="w-8 h-8 text-emerald-600 mb-2" />
                    <div className="font-bold text-emerald-800">Bulk Approve</div>
                    <div className="text-xs text-emerald-600 mt-1">{requisitions.filter((r: any) => r.status === "pending").length} pending</div>
                  </button>

                  {/* Bulk Reject */}
                  <button
                    onClick={() => {
                      const pending = requisitions.filter((r: any) => r.status === "pending");
                      if (pending.length === 0) { toast({ title: "No pending requisitions" }); return; }
                      selectAll(pending.map((r: any) => r.id));
                      setBulkActionType("reject");
                      setBulkActionDialog(true);
                    }}
                    className="p-4 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-left transition-all"
                  >
                    <XCircle className="w-8 h-8 text-red-600 mb-2" />
                    <div className="font-bold text-red-800">Bulk Reject</div>
                    <div className="text-xs text-red-600 mt-1">Reject multiple at once</div>
                  </button>

                  {/* Bulk Forward */}
                  <button
                    onClick={() => {
                      const pending = requisitions.filter((r: any) => r.status === "pending");
                      if (pending.length === 0) { toast({ title: "No pending requisitions" }); return; }
                      selectAll(pending.map((r: any) => r.id));
                      setBulkActionType("forward");
                      setBulkActionDialog(true);
                    }}
                    className="p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-left transition-all"
                  >
                    <SendHorizontal className="w-8 h-8 text-orange-600 mb-2" />
                    <div className="font-bold text-orange-800">Bulk Forward</div>
                    <div className="text-xs text-orange-600 mt-1">Forward to managers</div>
                  </button>

                  {/* Bulk Notify */}
                  <button
                    onClick={() => {
                      const pending = requisitions.filter((r: any) => r.status === "pending");
                      if (pending.length === 0) { toast({ title: "No pending requisitions" }); return; }
                      selectAll(pending.map((r: any) => r.id));
                      setBulkActionType("notify");
                      setBulkActionDialog(true);
                    }}
                    className="p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-left transition-all"
                  >
                    <Bell className="w-8 h-8 text-purple-600 mb-2" />
                    <div className="font-bold text-purple-800">Bulk Notify</div>
                    <div className="text-xs text-purple-600 mt-1">SMS, Email, WhatsApp</div>
                  </button>
                </div>

                {/* Quick Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-slate-700">{requisitions.length}</div>
                    <div className="text-xs text-slate-500">Total Requisitions</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-600">{requisitions.filter((r: any) => r.status === "pending").length}</div>
                    <div className="text-xs text-amber-500">Pending</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-600">{requisitions.filter((r: any) => r.status === "approved").length}</div>
                    <div className="text-xs text-emerald-500">Approved</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-600">{requisitions.filter((r: any) => r.status === "rejected").length}</div>
                    <div className="text-xs text-red-500">Rejected</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* NOTIFICATIONS TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="w-4 h-4 text-sky-500" />
                  Send Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Channel Selection */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-700">Notification Channels</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setNotificationChannels(prev => new Set([...prev, "sms"]).size === prev.size ? new Set([...prev].filter(c => c !== "sms")) : new Set([...prev, "sms"]))}
                        className={`p-4 rounded-xl border-2 transition-all ${notificationChannels.has("sms") ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white"}`}
                      >
                        <MessageSquare className="w-6 h-6 mx-auto mb-1 text-sky-600" />
                        <div className="text-xs font-medium">SMS</div>
                      </button>
                      <button
                        onClick={() => setNotificationChannels(prev => new Set([...prev, "whatsapp"]).size === prev.size ? new Set([...prev].filter(c => c !== "whatsapp")) : new Set([...prev, "whatsapp"]))}
                        className={`p-4 rounded-xl border-2 transition-all ${notificationChannels.has("whatsapp") ? "border-green-500 bg-green-50" : "border-slate-200 bg-white"}`}
                      >
                        <MessageSquare className="w-6 h-6 mx-auto mb-1 text-green-600" />
                        <div className="text-xs font-medium">WhatsApp</div>
                      </button>
                      <button
                        onClick={() => setNotificationChannels(prev => new Set([...prev, "email"]).size === prev.size ? new Set([...prev].filter(c => c !== "email")) : new Set([...prev, "email"]))}
                        className={`p-4 rounded-xl border-2 transition-all ${notificationChannels.has("email") ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-white"}`}
                      >
                        <Mail className="w-6 h-6 mx-auto mb-1 text-purple-600" />
                        <div className="text-xs font-medium">Email</div>
                      </button>
                      <button
                        onClick={() => setNotificationChannels(prev => new Set([...prev, "call"]).size === prev.size ? new Set([...prev].filter(c => c !== "call")) : new Set([...prev, "call"]))}
                        className={`p-4 rounded-xl border-2 transition-all ${notificationChannels.has("call") ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}
                      >
                        <Phone className="w-6 h-6 mx-auto mb-1 text-orange-600" />
                        <div className="text-xs font-medium">Voice Call</div>
                      </button>
                    </div>
                  </div>

                  {/* Message Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Recipient</label>
                      <Input
                        placeholder="+254700000000 or email@example.com"
                        value={notificationRecipient}
                        onChange={(e) => setNotificationRecipient(e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Subject</label>
                      <Input
                        placeholder="Notification subject..."
                        value={notificationSubject}
                        onChange={(e) => setNotificationSubject(e.target.value)}
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Message</label>
                      <textarea
                        className="w-full p-3 border rounded-lg text-sm"
                        rows={4}
                        placeholder="Enter your message..."
                        value={notificationBody}
                        onChange={(e) => setNotificationBody(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full bg-sky-600 hover:bg-sky-700 gap-2 rounded-lg"
                      disabled={isProcessing || !notificationRecipient || !notificationBody}
                      onClick={() => sendNotification(notificationRecipient, notificationSubject, notificationBody, Array.from(notificationChannels))}
                    >
                      <SendHorizontal className="w-4 h-4" />
                      {isProcessing ? "Sending..." : "Send Notification"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification History */}
            {notificationHistory.length > 0 && (
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/60">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    Recent Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {notificationHistory.slice(0, 10).map((n: any) => (
                      <div key={n.id} className="px-4 py-3 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-slate-800">{n.subject || "Notification"}</div>
                          <div className="text-xs text-slate-500">To: {n.to} via {n.channels?.join(", ")}</div>
                        </div>
                        <div className="text-xs text-slate-400">{new Date(n.sentAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SELL / ISSUANCES TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "sell" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Total Issuances", val: sells.length, color: "from-sky-500 to-sky-600" },
                { label: "Units Issued", val: sells.reduce((s: number, m: any) => s + Number(m.quantity || 0), 0).toLocaleString(), color: "from-emerald-500 to-emerald-600" },
                { label: "Issue Value", val: `KSh ${sells.reduce((s: number, m: any) => s + Number(m.quantity || 0) * Number(m.unit_price || 1), 0).toLocaleString()}`, color: "from-violet-500 to-violet-600" },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.color} text-white rounded-xl p-4 shadow-sm`}>
                  <div className="text-[11px] font-medium opacity-80 uppercase tracking-wide">{k.label}</div>
                  <div className="text-2xl font-black mt-1">{k.val}</div>
                </div>
              ))}
            </div>
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                  <Package className="w-4 h-4 text-sky-500" /> Stock Issuances
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["Reference", "Item", "Dept / Ward", "Qty", "Unit Price", "Total", "Date", "Issued By"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems(sells, ["reference", "item_name", "department", "issued_by"]).slice(0, 60).map((m: any, i: number) => (
                        <tr key={m.id || i} className={`border-b border-slate-100 hover:bg-sky-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                          <td className="px-3 py-2.5 font-mono text-sky-700 font-bold">{m.reference || m.id?.slice(0, 8) || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-700">{m.item_name || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{m.department || m.ward || "—"}</td>
                          <td className="px-3 py-2.5 text-right font-bold">{Number(m.quantity || 0).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right">{Number(m.unit_price || 0).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-slate-800">{Number((m.quantity || 0) * (m.unit_price || 0)).toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-slate-500">{m.created_at ? new Date(m.created_at).toLocaleDateString("en-KE") : "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{m.issued_by || m.created_by || "—"}</td>
                        </tr>
                      ))}
                      {filterItems(sells, ["reference", "item_name", "department", "issued_by"]).length === 0 && (
                        <tr><td colSpan={8} className="text-center py-12 text-slate-400">No issuance records found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* GRN / PURCHASE REPORT TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "purchase" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Total GRNs", val: grns.length, color: "from-sky-500 to-sky-600" },
                { label: "Units Received", val: purchases.reduce((s: number, m: any) => s + Number(m.quantity || 0), 0).toLocaleString(), color: "from-emerald-500 to-emerald-600" },
                { label: "Purchase Value", val: `KSh ${grns.reduce((s: number, g: any) => s + Number(g.total_value || g.total_amount || 0), 0).toLocaleString()}`, color: "from-violet-500 to-violet-600" },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.color} text-white rounded-xl p-4 shadow-sm`}>
                  <div className="text-[11px] font-medium opacity-80 uppercase tracking-wide">{k.label}</div>
                  <div className="text-2xl font-black mt-1">{k.val}</div>
                </div>
              ))}
            </div>
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm text-slate-600 flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-sky-500" /> Goods Received Notes</span>
                  <Button size="sm" onClick={() => navigate("/goods-received")} className="h-7 bg-sky-600 hover:bg-sky-700 gap-1 text-xs rounded-lg">
                    <Plus className="w-3 h-3" /> New GRN
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["GRN #", "Supplier", "PO Ref", "Total Value", "Status", "Received", "Inspector", "Actions"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems(grns, ["grn_number", "supplier_name", "po_reference", "status"]).slice(0, 60).map((g: any, i: number) => (
                        <tr key={g.id || i} className={`border-b border-slate-100 hover:bg-sky-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                          <td className="px-3 py-2.5 font-mono font-bold text-sky-700">{g.grn_number || g.id?.slice(0, 8) || "—"}</td>
                          <td className="px-3 py-2.5 text-slate-700">{g.supplier_name || "—"}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-600">{g.po_reference || "—"}</td>
                          <td className="px-3 py-2.5 text-right font-bold">KSh {Number(g.total_value || g.total_amount || 0).toLocaleString()}</td>
                          <td className="px-3 py-2.5"><StatusBadge status={g.status} /></td>
                          <td className="px-3 py-2.5 text-slate-500">{g.received_date || g.created_at ? new Date(g.received_date || g.created_at).toLocaleDateString("en-KE") : "—"}</td>
                          <td className="px-3 py-2.5 text-slate-500">{g.inspector_name || g.received_by || "—"}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] rounded"
                                onClick={() => { setDetail(g); setShowDetail(true); }}>
                                <Eye className="w-3 h-3 mr-0.5" />View
                              </Button>
                              <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] rounded"
                                onClick={() => navigate("/goods-received")}>
                                <Printer className="w-3 h-3 mr-0.5" />Print
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filterItems(grns, ["grn_number", "supplier_name", "po_reference", "status"]).length === 0 && (
                        <tr><td colSpan={8} className="text-center py-12 text-slate-400">No GRNs found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STOCK ALERT TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "stock-alert" && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Critical (< 5)", val: lowStockItems.filter((i: any) => Number(i.quantity_in_stock || 0) < 5).length, bg: "from-red-500 to-red-600" },
                { label: "Low Stock", val: lowStockItems.filter((i: any) => Number(i.quantity_in_stock || 0) >= 5).length, bg: "from-amber-500 to-amber-600" },
                { label: "Total Alerts", val: lowStockItems.length, bg: "from-orange-500 to-orange-600" },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.bg} text-white rounded-xl p-4 shadow-sm`}>
                  <div className="text-[11px] font-medium opacity-80 uppercase tracking-wide">{k.label}</div>
                  <div className="text-3xl font-black mt-1">{k.val}</div>
                </div>
              ))}
            </div>
            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/60">
                <CardTitle className="text-sm text-slate-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Low Stock Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["Item Name", "Category", "In Stock", "Reorder Level", "Deficit", "Unit", "Urgency", "Action"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems(lowStockItems, ["item_name", "category_name", "category"]).map((i: any, idx: number) => {
                        const qty = Number(i.quantity_in_stock || 0);
                        const reorder = Number(i.reorder_level || 10);
                        const deficit = Math.max(0, reorder - qty);
                        const urgent = qty < 5;
                        return (
                          <tr key={i.id || idx} className={`border-b border-slate-100 hover:bg-amber-50/50 ${urgent ? "bg-red-50/40" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{i.item_name || "—"}</td>
                            <td className="px-3 py-2.5 text-slate-600">{i.category_name || i.category || "—"}</td>
                            <td className={`px-3 py-2.5 text-right font-black text-lg ${urgent ? "text-red-600" : "text-amber-600"}`}>{qty}</td>
                            <td className="px-3 py-2.5 text-right text-slate-500">{reorder}</td>
                            <td className={`px-3 py-2.5 text-right font-bold ${urgent ? "text-red-600" : "text-amber-700"}`}>{deficit}</td>
                            <td className="px-3 py-2.5 text-slate-500">{i.unit_of_measure || "pcs"}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                {urgent ? "CRITICAL" : "LOW"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <Button size="sm" className="h-6 px-2 text-[10px] bg-sky-600 hover:bg-sky-700 rounded"
                                onClick={() => navigate("/purchase-orders")}>
                                <Plus className="w-3 h-3 mr-0.5" />Reorder
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {filterItems(lowStockItems, ["item_name", "category_name"]).length === 0 && (
                        <tr><td colSpan={8} className="text-center py-12 text-emerald-600">
                          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
                          All stock levels are healthy
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* EXPIRY TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "expired" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Expired", val: expiredItems.length, bg: "from-red-500 to-red-600" },
                { label: "Expiring ≤ 30 days", val: nearExpiryItems.length, bg: "from-amber-500 to-amber-600" },
                { label: "Have Expiry Dates", val: items.filter((i: any) => i.expiry_date).length, bg: "from-sky-500 to-sky-600" },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.bg} text-white rounded-xl p-4 shadow-sm`}>
                  <div className="text-[11px] font-medium opacity-80 uppercase tracking-wide">{k.label}</div>
                  <div className="text-3xl font-black mt-1">{k.val}</div>
                </div>
              ))}
            </div>

            {expiredItems.length > 0 && (
              <Card className="bg-red-50 border-red-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-2 border-b border-red-100">
                  <CardTitle className="text-sm text-red-700 flex items-center gap-2">
                    <XCircle className="w-4 h-4" /> Expired Items — Immediate Action Required
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-red-100 border-b border-red-200">
                          {["Item Name", "Category", "Expiry Date", "Days Overdue", "Qty", "Unit", "Location", "Action"].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold text-red-700 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filterItems(expiredItems, ["item_name", "category_name"]).map((i: any, idx: number) => {
                          const daysOver = Math.floor((Date.now() - new Date(i.expiry_date).getTime()) / 86400000);
                          return (
                            <tr key={i.id || idx} className="border-b border-red-100 hover:bg-red-100/50">
                              <td className="px-3 py-2.5 font-semibold text-red-800">{i.item_name || "—"}</td>
                              <td className="px-3 py-2.5 text-red-600">{i.category_name || "—"}</td>
                              <td className="px-3 py-2.5 font-bold text-red-700">{new Date(i.expiry_date).toLocaleDateString("en-KE")}</td>
                              <td className="px-3 py-2.5 text-right font-black text-red-700">{daysOver}</td>
                              <td className="px-3 py-2.5 text-right">{Number(i.quantity_in_stock || 0).toLocaleString()}</td>
                              <td className="px-3 py-2.5">{i.unit_of_measure || "pcs"}</td>
                              <td className="px-3 py-2.5">{i.location || i.store_location || "Stores"}</td>
                              <td className="px-3 py-2.5">
                                <Button size="sm" variant="destructive" className="h-6 px-2 text-[10px] rounded"
                                  onClick={() => toast({ title: "Disposal request logged", description: i.item_name, variant: "destructive" })}>
                                  Dispose
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

            <Card className="bg-amber-50 border-amber-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-amber-100">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Expiring Within 30 Days
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-amber-100 border-b border-amber-200">
                        {["Item Name", "Category", "Expiry Date", "Days Left", "Qty", "Unit", "Action"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-amber-700 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems(nearExpiryItems, ["item_name", "category_name"]).map((i: any, idx: number) => {
                        const daysLeft = Math.floor((new Date(i.expiry_date).getTime() - Date.now()) / 86400000);
                        return (
                          <tr key={i.id || idx} className="border-b border-amber-100 hover:bg-amber-100/50">
                            <td className="px-3 py-2.5 font-semibold text-amber-800">{i.item_name || "—"}</td>
                            <td className="px-3 py-2.5 text-amber-600">{i.category_name || "—"}</td>
                            <td className="px-3 py-2.5 font-bold text-amber-700">{new Date(i.expiry_date).toLocaleDateString("en-KE")}</td>
                            <td className={`px-3 py-2.5 text-right font-black ${daysLeft <= 7 ? "text-red-600" : "text-amber-700"}`}>{daysLeft}</td>
                            <td className="px-3 py-2.5 text-right">{Number(i.quantity_in_stock || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5">{i.unit_of_measure || "pcs"}</td>
                            <td className="px-3 py-2.5">
                              <Button size="sm" className="h-6 px-2 text-[10px] bg-amber-500 hover:bg-amber-600 rounded"
                                onClick={() => toast({ title: "Issue order created", description: `${i.item_name} flagged for priority issue` })}>
                                <Send className="w-3 h-3 mr-0.5" />Issue Order
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                      {filterItems(nearExpiryItems, ["item_name", "category_name"]).length === 0 && (
                        <tr><td colSpan={7} className="text-center py-10 text-amber-600">No items expiring within 30 days</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* BACKUP TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "backup" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                    <Download className="w-4 h-4 text-sky-500" /> Backup Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs text-slate-500">Export all procurement, inventory, and transaction data to a JSON file.</p>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-xs border border-slate-100">
                    {["purchase_orders", "requisitions", "items", "suppliers", "goods_received", "stock_movements"].map(t => (
                      <div key={t} className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> {t}
                      </div>
                    ))}
                  </div>
                  {backupRunning && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">Exporting…</span>
                        <span className="font-bold">{backupProgress}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${backupProgress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={runBackup} disabled={backupRunning} className="flex-1 bg-sky-600 hover:bg-sky-700 gap-2 rounded-lg">
                      <Download className="w-4 h-4" /> {backupRunning ? "Backing up…" : "Backup Now (JSON)"}
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/backup")} className="gap-1 rounded-lg">
                      <Database className="w-4 h-4" /> Full
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle className="text-sm text-slate-700 flex items-center gap-2">
                    <ArchiveRestore className="w-4 h-4 text-emerald-500" /> Restore Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs text-slate-500">Restore from a previously exported JSON backup. Existing records are not overwritten.</p>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50">
                    <Upload className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-500">Drop backup JSON here or browse</p>
                    <input type="file" accept=".json" className="hidden" id="restore-file"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) toast({ title: "Restore started", description: `Processing: ${f.name}` });
                      }} />
                    <label htmlFor="restore-file">
                      <Button size="sm" variant="outline" className="mt-3 pointer-events-none rounded-lg">Choose File</Button>
                    </label>
                  </div>
                  <Button variant="outline" className="w-full gap-2 rounded-lg" onClick={() => navigate("/backup")}>
                    <ArchiveRestore className="w-4 h-4" /> Advanced Restore
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm text-slate-700">Backup History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {["Date", "Time", "Status", "Tables", "Format", "Size"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backupJobs.length > 0 ? backupJobs.map((j: any, i: number) => (
                      <tr key={j.id || i} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                        <td className="px-3 py-2.5">{j.started_at ? new Date(j.started_at).toLocaleDateString("en-KE") : "—"}</td>
                        <td className="px-3 py-2.5">{j.started_at ? new Date(j.started_at).toLocaleTimeString() : "—"}</td>
                        <td className="px-3 py-2.5"><StatusBadge status={j.status || "completed"} /></td>
                        <td className="px-3 py-2.5">{j.table_count || "—"}</td>
                        <td className="px-3 py-2.5">{j.format || "JSON"}</td>
                        <td className="px-3 py-2.5">{j.file_size ? "~" + j.file_size : "—"}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="text-center py-10 text-slate-400">No backup history — run your first backup above</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STORES TAB */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {activeTab === "stores" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Units in Stock", val: items.reduce((s: number, i: any) => s + Number(i.quantity_in_stock || 0), 0).toLocaleString(), bg: "from-sky-500 to-sky-600" },
                { label: "Stock Value", val: `KSh ${items.reduce((s: number, i: any) => s + Number(i.quantity_in_stock || 0) * Number(i.unit_price || 0), 0).toLocaleString()}`, bg: "from-emerald-500 to-emerald-600" },
                { label: "GRNs Processed", val: grns.length, bg: "from-violet-500 to-violet-600" },
                { label: "Pending Deliveries", val: grns.filter((g: any) => g.status === "pending").length, bg: "from-amber-500 to-amber-600" },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.bg} text-white rounded-xl p-4 shadow-sm`}>
                  <div className="text-[11px] font-medium opacity-80 uppercase tracking-wide leading-tight">{k.label}</div>
                  <div className="text-xl font-black mt-1">{k.val}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Stock by Category</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stockByCategory()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="cat" fontSize={10} tick={{ fill: "#94a3b8" }} />
                      <YAxis fontSize={10} tick={{ fill: "#94a3b8" }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Qty" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="value" name="Value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <CardHeader className="pb-2 border-b border-slate-100">
                  <CardTitle className="text-sm text-slate-600 flex items-center justify-between">
                    <span>Recent GRNs</span>
                    <Button size="sm" onClick={() => navigate("/goods-received")} className="h-7 bg-sky-600 hover:bg-sky-700 text-xs gap-1 rounded-lg">
                      <Eye className="w-3 h-3" />View All
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["GRN #", "Supplier", "Date", "Status"].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grns.slice(0, 8).map((g: any, i: number) => (
                        <tr key={g.id || i} className={`border-b border-slate-100 hover:bg-sky-50/50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                          <td className="px-3 py-2 font-mono font-bold text-sky-700">{g.grn_number || g.id?.slice(0, 8) || "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{g.supplier_name || "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{g.received_date || g.created_at ? new Date(g.received_date || g.created_at).toLocaleDateString("en-KE") : "—"}</td>
                          <td className="px-3 py-2"><StatusBadge status={g.status} /></td>
                        </tr>
                      ))}
                      {grns.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-400">No GRNs yet</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-100">
                <CardTitle className="text-sm text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Boxes className="w-4 h-4 text-sky-500" /> Current Stock — All Items</span>
                  <Button size="sm" onClick={() => navigate("/items")} variant="outline" className="h-7 text-xs gap-1 rounded-lg">
                    <Boxes className="w-3 h-3" /> Manage Items
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {["Item Name", "Category", "In Stock", "Unit", "Reorder", "Unit Price", "Stock Value", "Status"].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 text-[11px] uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filterItems(items, ["item_name", "category_name", "category"]).slice(0, 60).map((i: any, idx: number) => {
                        const qty = Number(i.quantity_in_stock || 0);
                        const reorder = Number(i.reorder_level || 10);
                        const ok = qty >= reorder;
                        return (
                          <tr key={i.id || idx} className={`border-b border-slate-100 hover:bg-sky-50/50 ${!ok ? "bg-amber-50/30" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{i.item_name || "—"}</td>
                            <td className="px-3 py-2.5 text-slate-600">{i.category_name || i.category || "—"}</td>
                            <td className={`px-3 py-2.5 text-right font-black ${!ok ? "text-amber-600" : "text-slate-800"}`}>{qty.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-slate-500">{i.unit_of_measure || "pcs"}</td>
                            <td className="px-3 py-2.5 text-right text-slate-500">{reorder}</td>
                            <td className="px-3 py-2.5 text-right">{Number(i.unit_price || 0).toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-right font-bold">KSh {(qty * Number(i.unit_price || 0)).toLocaleString()}</td>
                            <td className="px-3 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                {ok ? "OK" : "LOW"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {filterItems(items, ["item_name", "category_name", "category"]).length === 0 && (
                        <tr><td colSpan={8} className="text-center py-10 text-slate-400">No items found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* bottom pad */}
        <div className="h-6" />
      </div>

      {/* ─── Bulk Action Dialog ───────────────────────────────────────────── */}
      <Dialog open={bulkActionDialog} onOpenChange={setBulkActionDialog}>
        <DialogContent className="max-w-md bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkActionType === "approve" && <><CheckSquare className="w-5 h-5 text-emerald-600" /> Bulk Approve</>}
              {bulkActionType === "reject" && <><XCircle className="w-5 h-5 text-red-600" /> Bulk Reject</>}
              {bulkActionType === "forward" && <><SendHorizontal className="w-5 h-5 text-orange-600" /> Bulk Forward</>}
              {bulkActionType === "notify" && <><Bell className="w-5 h-5 text-purple-600" /> Send Notification</>}
            </DialogTitle>
            <DialogDescription>
              {selectedItems.size} requisition(s) selected
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {bulkActionType === "forward" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Recipient Phone</label>
                <Input
                  placeholder="+254700000000"
                  value={forwardRecipient}
                  onChange={(e) => setForwardRecipient(e.target.value)}
                  className="rounded-lg"
                />
              </div>
            )}
            {bulkActionType === "notify" && (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Notification Channels</label>
                  <div className="flex gap-2 flex-wrap">
                    {(["sms", "whatsapp", "email", "call"] as const).map((ch) => (
                      <label key={ch} className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={notificationChannels.has(ch)}
                          onChange={() => {
                            setNotificationChannels(prev => {
                              const next = new Set(prev);
                              if (next.has(ch)) next.delete(ch);
                              else next.add(ch);
                              return next;
                            });
                          }}
                          className="rounded"
                        />
                        <span className="capitalize">{ch}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Message</label>
                  <textarea
                    className="w-full p-2 border rounded-lg text-sm"
                    rows={3}
                    placeholder="Enter notification message..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                  />
                </div>
              </>
            )}
            {bulkActionType === "reject" && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Reason (optional)</label>
                <Input
                  placeholder="Reason for rejection..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="rounded-lg"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialog(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              className={`rounded-lg gap-1.5 ${bulkActionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : bulkActionType === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-sky-600 hover:bg-sky-700"}`}
              disabled={isProcessing}
              onClick={async () => {
                const ids = Array.from(selectedItems);
                if (bulkActionType === "approve") await bulkApprove(ids);
                else if (bulkActionType === "reject") await bulkReject(ids, customMessage);
                else if (bulkActionType === "forward") await bulkForward(ids, forwardRecipient);
                else if (bulkActionType === "notify") await sendBulkNotification(ids, Array.from(notificationChannels), customMessage);
              }}
            >
              {isProcessing ? "Processing..." : `Confirm (${selectedItems.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail Modal ─────────────────────────────────────────────────── */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-xl bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-800 flex items-center gap-2">
              {detail?.requisition_number && <ShoppingCart className="w-4 h-4 text-sky-500" />}
              {detail?.po_number && <FileText className="w-4 h-4 text-sky-500" />}
              {detail?.grn_number && <ClipboardList className="w-4 h-4 text-sky-500" />}
              {detail?.requisition_number || detail?.po_number || detail?.grn_number || "Record Detail"}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {Object.entries(detail)
                .filter(([k]) => !["id", "updated_at"].includes(k))
                .slice(0, 20)
                .map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3 py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 min-w-[140px] text-[11px] font-medium uppercase tracking-wide flex-shrink-0">{k.replace(/_/g, " ")}</span>
                    <span className="text-slate-800 text-xs font-semibold break-all">{String(v ?? "—")}</span>
                  </div>
                ))
              }
              {/* Stamp display in detail modal */}
              {detail?.status && ["approved", "rejected", "pending"].includes(detail.status) && (
                <div className="flex justify-center pt-4">
                  <div style={{ transform: "rotate(-8deg)" }}>
                    <OfficialStamp
                      label={detail.status === "approved" ? "APPROVED" : detail.status === "rejected" ? "REJECTED" : "PENDING"}
                      subLabel={
                        detail.status === "approved" && detail.approved_by_name
                          ? detail.approved_by_name
                          : detail.status === "rejected" && detail.rejected_by_name
                          ? detail.rejected_by_name
                          : ""
                      }
                      color={detail.status === "approved" ? "#15803d" : detail.status === "rejected" ? "#dc2626" : "#b45309"}
                      size={110}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowDetail(false)} className="rounded-lg">Close</Button>
            {detail?.requisition_number && detail?.status === "pending" && (
              <>
                <Button className="bg-emerald-500 hover:bg-emerald-600 gap-1.5 rounded-lg"
                  onClick={() => { decide(detail.id, "approved"); setShowDetail(false); }}>
                  <Stamp className="w-4 h-4" />Stamp Approved
                </Button>
                <Button variant="destructive" className="gap-1.5 rounded-lg"
                  onClick={() => { decide(detail.id, "rejected"); setShowDetail(false); }}>
                  <X className="w-4 h-4" />Stamp Rejected
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrackingApprovalPage;
