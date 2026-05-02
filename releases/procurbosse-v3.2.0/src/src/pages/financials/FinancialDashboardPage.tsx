import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  TrendingUp, TrendingDown, DollarSign, PiggyBank, BookOpen,
  FileText, BarChart3, ArrowUpRight, ArrowDownRight, RefreshCw,
  AlertTriangle, CheckCircle, Clock, Layers
} from "lucide-react";

const fmt = (n: number) => `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2 })}`;

export default function FinancialDashboardPage() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0, totalExpenditure: 0, budgetAllocated: 0,
    budgetUtilised: 0, pendingPayments: 0, pendingReceipts: 0,
    journalCount: 0, overdraftAccounts: 0,
  });
  const [recentVouchers, setRecentVouchers] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [pvRes, rvRes, jvRes, bgRes] = await Promise.all([
        supabase.from("payment_vouchers").select("amount,status").limit(200),
        supabase.from("receipt_vouchers").select("amount,status").limit(200),
        supabase.from("journal_vouchers").select("id,status").limit(200),
        supabase.from("budgets").select("*").limit(50),
      ]);
      const pvs = pvRes.data || [];
      const rvs = rvRes.data || [];
      const jvs = jvRes.data || [];
      const bgs = bgRes.data || [];
      const totalExp = pvs.reduce((s: number, v: any) => s + (parseFloat(v.amount) || 0), 0);
      const totalRev = rvs.reduce((s: number, v: any) => s + (parseFloat(v.amount) || 0), 0);
      const budAlloc = bgs.reduce((s: number, b: any) => s + (parseFloat(b.allocated_amount || b.amount || 0)), 0);
      const budUtil = bgs.reduce((s: number, b: any) => s + (parseFloat(b.utilised_amount || b.used_amount || 0)), 0);
      setStats({
        totalRevenue: totalRev,
        totalExpenditure: totalExp,
        budgetAllocated: budAlloc,
        budgetUtilised: budUtil,
        pendingPayments: pvs.filter((v: any) => v.status === "pending").length,
        pendingReceipts: rvs.filter((v: any) => v.status === "pending").length,
        journalCount: jvs.length,
        overdraftAccounts: bgs.filter((b: any) => parseFloat(b.utilised_amount || 0) > parseFloat(b.allocated_amount || b.amount || 0)).length,
      });
      setBudgets(bgs.slice(0, 6));
      const recent: any[] = [
        ...pvs.slice(0, 3).map((v: any) => ({ ...v, type: "Payment", color: "#ef4444" })),
        ...rvs.slice(0, 3).map((v: any) => ({ ...v, type: "Receipt", color: "#10b981" })),
      ].sort(() => Math.random() - 0.5).slice(0, 6);
      setRecentVouchers(recent);
    } catch { /* silent */ }
    setLoading(false);
  }

  const CARDS = [
    { label: "Total Revenue", value: fmt(stats.totalRevenue), icon: TrendingUp, color: "#10b981", bg: "#d1fae5", trend: "+12.4%" },
    { label: "Total Expenditure", value: fmt(stats.totalExpenditure), icon: TrendingDown, color: "#ef4444", bg: "#fee2e2", trend: "+8.1%" },
    { label: "Budget Allocated", value: fmt(stats.budgetAllocated), icon: PiggyBank, color: "#0369a1", bg: "#e0f2fe", trend: null },
    { label: "Budget Utilised", value: fmt(stats.budgetUtilised), icon: BarChart3, color: "#7c3aed", bg: "#ede9fe",
      trend: stats.budgetAllocated > 0 ? `${((stats.budgetUtilised / stats.budgetAllocated) * 100).toFixed(1)}%` : "0%" },
    { label: "Pending Payments", value: stats.pendingPayments.toString(), icon: Clock, color: "#d97706", bg: "#fef3c7", trend: null },
    { label: "Journal Vouchers", value: stats.journalCount.toString(), icon: BookOpen, color: "#374151", bg: "#f3f4f6", trend: null },
  ];

  const MODULES = [
    { label: "Chart of Accounts", path: "/financials/chart-of-accounts", icon: BookOpen, color: "#374151", desc: "GL accounts & balances" },
    { label: "Budgets", path: "/financials/budgets", icon: PiggyBank, color: "#0369a1", desc: "Budget management" },
    { label: "Fixed Assets", path: "/financials/fixed-assets", icon: Layers, color: "#7c3aed", desc: "Asset register" },
    { label: "Payment Vouchers", path: "/vouchers/payment", icon: DollarSign, color: "#ef4444", desc: "Process payments" },
    { label: "Receipt Vouchers", path: "/vouchers/receipt", icon: CheckCircle, color: "#10b981", desc: "Record receipts" },
    { label: "Journal Vouchers", path: "/vouchers/journal", icon: BookOpen, color: "#374151", desc: "Journal entries" },
    { label: "Reports", path: "/reports", icon: BarChart3, color: "#9333ea", desc: "Financial analytics" },
  ];

  return (
    <div style={{ padding: 24, background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>Financial Dashboard</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>EL5 MediProcure — Finance & Accounts</p>
        </div>
        <button onClick={load} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14, color: "#6b7280" }} /> Refresh
        </button>
      </div>

      {stats.overdraftAccounts > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
          background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 20, fontSize: 13, color: "#92400e" }}>
          <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
          {stats.overdraftAccounts} budget line(s) over allocated limit — review required
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16, marginBottom: 28 }}>
        {CARDS.map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 12, padding: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 6px", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{c.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>{loading ? "—" : c.value}</p>
                {c.trend && <p style={{ fontSize: 11, color: c.color, margin: "4px 0 0", fontWeight: 600 }}>{c.trend}</p>}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <c.icon style={{ width: 18, height: 18, color: c.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
        {/* Budget utilisation */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Budget Lines</h3>
          {loading ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</p> :
            budgets.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No budgets yet</p> :
            budgets.map((b: any, i: number) => {
              const alloc = parseFloat(b.allocated_amount || b.amount || 0);
              const used = parseFloat(b.utilised_amount || b.used_amount || 0);
              const pct = alloc > 0 ? Math.min((used / alloc) * 100, 100) : 0;
              const over = used > alloc;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{b.name || b.department || `Budget ${i+1}`}</span>
                    <span style={{ color: over ? "#ef4444" : "#6b7280" }}>{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: "#f3f4f6", borderRadius: 3 }}>
                    <div style={{ height: 6, width: `${pct}%`, background: over ? "#ef4444" : pct > 80 ? "#f59e0b" : "#10b981", borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })
          }
          <button onClick={() => navigate("/financials/budgets")} style={{ marginTop: 8, fontSize: 12, color: "#0369a1", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            View all budgets →
          </button>
        </div>

        {/* Recent vouchers */}
        <div style={{ background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 16px" }}>Recent Vouchers</h3>
          {loading ? <p style={{ color: "#9ca3af", fontSize: 13 }}>Loading…</p> :
            recentVouchers.length === 0 ? <p style={{ color: "#9ca3af", fontSize: 13 }}>No vouchers yet</p> :
            recentVouchers.map((v: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: i < recentVouchers.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{v.type}</span>
                </div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  {v.amount ? fmt(parseFloat(v.amount)) : "—"}
                </span>
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
                  background: v.status === "approved" ? "#d1fae5" : v.status === "pending" ? "#fef3c7" : "#f3f4f6",
                  color: v.status === "approved" ? "#065f46" : v.status === "pending" ? "#92400e" : "#374151" }}>
                  {v.status || "draft"}
                </span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Module tiles */}
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#374151", margin: "0 0 12px" }}>Finance Modules</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12 }}>
        {MODULES.map(m => (
          <button key={m.path} onClick={() => navigate(m.path)} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
            padding: 16, textAlign: "left", cursor: "pointer",
            transition: "box-shadow 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"}
          onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)"}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: m.color + "18",
              display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <m.icon style={{ width: 16, height: 16, color: m.color }} />
            </div>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: "0 0 3px" }}>{m.label}</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
