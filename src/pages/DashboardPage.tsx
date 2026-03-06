import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, Package, FileText, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, DollarSign, Truck, BarChart2,
  ArrowRight, Activity, Shield, Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const kpis = [
  { label: "Total Spend (MTD)", value: "KES 4,285,600", change: "+12%", up: true, icon: DollarSign, color: "blue", sub: "vs last month" },
  { label: "Open Requisitions", value: "34", change: "8 urgent", up: false, icon: FileText, color: "amber", sub: "awaiting approval" },
  { label: "Active POs", value: "127", change: "+5 this week", up: true, icon: ShoppingCart, color: "green", sub: "across suppliers" },
  { label: "Stock Value", value: "KES 12.4M", change: "98.2% accuracy", up: true, icon: Boxes, color: "indigo", sub: "all locations" },
  { label: "Pending Deliveries", value: "23", change: "3 overdue", up: false, icon: Truck, color: "orange", sub: "expected this week" },
  { label: "Low Stock Alerts", value: "17", change: "↑ 4 new", up: false, icon: AlertTriangle, color: "red", sub: "below reorder level" },
  { label: "Suppliers Active", value: "89", change: "+2 this month", up: true, icon: Shield, color: "teal", sub: "approved vendors" },
  { label: "Budget Utilization", value: "68.4%", change: "KES 2.9M remaining", up: true, icon: BarChart2, color: "purple", sub: "FY 2025/26" },
];

const recentActivity = [
  { time: "10 mins ago", action: "PO-EL5H-2026-0234 approved", user: "Dr. Kamau", type: "success" },
  { time: "1 hr ago", action: "GRN received: Medical Supplies batch #B-2341", user: "Store Keeper", type: "info" },
  { time: "2 hrs ago", action: "Payment Voucher PV/EL5H/202603/0089 — KES 145,000", user: "Finance Dept", type: "success" },
  { time: "3 hrs ago", action: "Low stock alert: Paracetamol 500mg (12 packs left)", user: "System", type: "warning" },
  { time: "5 hrs ago", action: "Tender T-2026-045 closed: 7 bids received", user: "Procurement", type: "info" },
  { time: "Yesterday", action: "Supplier PHARMALINK LTD contract renewed", user: "Admin", type: "success" },
  { time: "Yesterday", action: "Non-conformance NCR-045 resolved: Gloves batch rejected", user: "QC Dept", type: "warning" },
];

const quickLinks = [
  { label: "New Requisition", path: "/requisitions", color: "bg-blue-600", icon: FileText },
  { label: "Receive Goods", path: "/goods-received", color: "bg-green-600", icon: Package },
  { label: "Pay Supplier", path: "/vouchers/payment", color: "bg-indigo-600", icon: DollarSign },
  { label: "Quality Check", path: "/quality/inspections", color: "bg-teal-600", icon: CheckCircle },
  { label: "View Analytics", path: "/analytics", color: "bg-purple-600", icon: Activity },
  { label: "Scan Barcode", path: "/scanner", color: "bg-orange-600", icon: Shield },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Embu Level 5 Hospital — {today}</p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block mr-2 animate-pulse" />
          System Online
        </Badge>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg bg-${kpi.color}-50`}>
                <kpi.icon className={`w-4 h-4 text-${kpi.color}-600`} />
              </div>
              <span className={`text-xs font-medium flex items-center gap-1 ${kpi.up ? "text-green-600" : "text-amber-600"}`}>
                {kpi.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-3">{kpi.value}</p>
            <p className="text-xs font-medium text-slate-600 mt-0.5">{kpi.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className={`${link.color} text-white rounded-lg p-3 text-left hover:opacity-90 transition-opacity`}
              >
                <link.icon className="w-5 h-5 mb-2" />
                <p className="text-xs font-semibold">{link.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Recent Activity</h2>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600">View All <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  item.type === "success" ? "bg-green-500" :
                  item.type === "warning" ? "bg-amber-500" : "bg-blue-500"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">{item.action}</p>
                  <p className="text-xs text-slate-400">{item.user} · {item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Module Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">Module Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: "Procurement", status: "Operational", ok: true },
            { name: "Inventory", status: "Operational", ok: true },
            { name: "Financials", status: "Operational", ok: true },
            { name: "Quality Control", status: "1 Pending NCR", ok: false },
            { name: "Vendor Portal", status: "Operational", ok: true },
          ].map((mod) => (
            <div key={mod.name} className={`rounded-lg p-3 border ${mod.ok ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-2 mb-1">
                {mod.ok ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                <span className="text-xs font-semibold text-slate-700">{mod.name}</span>
              </div>
              <p className={`text-xs ${mod.ok ? "text-green-600" : "text-amber-600"}`}>{mod.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
