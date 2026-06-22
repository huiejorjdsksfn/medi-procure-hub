/**
 * EL5 MediProcure — Stamps Management v1.0
 * Microsoft Dynamics 365 Style - Official Stamps System
 * Yearly, Monthly, and Document Stamps
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Stamp, Calendar, Shield, CheckCircle2, AlertCircle, Clock,
  Plus, Edit3, Trash2, Download, Printer, Eye, Search,
  ChevronDown, RefreshCw, Building2, User, FileText, CalendarDays,
  CalendarRange, Award, BadgeCheck, Star, Check, X, Save, Copy
} from "lucide-react";

/* ─── Stamp Types ─────────────────────────────────────────────────────── */
type StampType = 'approved' | 'rejected' | 'pending' | 'verified' | 'official' | 'confidential' | 'urgent' | 'annual' | 'monthly';
type StampPeriod = 'annual' | 'monthly' | 'document';

interface StampConfig {
  id: string;
  name: string;
  type: StampType;
  period: StampPeriod;
  color: string;
  label: string;
  subLabel: string;
  isActive: boolean;
  year?: number;
  month?: number;
  createdAt: string;
  createdBy: string;
  useCount: number;
}

const STAMP_COLORS: Record<StampType, string> = {
  approved: '#15803d',
  rejected: '#dc2626',
  pending: '#b45309',
  verified: '#0891b2',
  official: '#4f46e5',
  confidential: '#7c3aed',
  urgent: '#ea580c',
  annual: '#0d9488',
  monthly: '#6366f1',
};

const STAMP_LABELS: Record<StampType, string> = {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  pending: 'PENDING APPROVAL',
  verified: 'VERIFIED',
  official: 'OFFICIAL USE',
  confidential: 'CONFIDENTIAL',
  urgent: 'URGENT',
  annual: 'ANNUAL',
  monthly: 'MONTHLY',
};

/* ─── Official Stamp SVG ─────────────────────────────────────────────── */
const OfficialStampSVG = ({ label, subLabel, color, size = 120, className = "" }: {
  label: string; subLabel?: string; color: string; size?: number; className?: string;
}) => {
  const r1 = size / 2 - 3;
  const r2 = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const textRadius = (r1 + r2) / 2;
  const chars = Array.from(label.toUpperCase());
  const arcDeg = Math.min(200, chars.length * 12);
  const startAngle = -90 - arcDeg / 2;
  const stepDeg = chars.length > 1 ? arcDeg / (chars.length - 1) : 0;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const letterPath = (angle: number) => {
    const rad = toRad(angle);
    return {
      x: cx + textRadius * Math.cos(rad),
      y: cy + textRadius * Math.sin(rad),
      rot: angle + 90
    };
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className}
      style={{ filter: `drop-shadow(0 2px 8px ${color}44)` }}>
      <circle cx={cx} cy={cy} r={r1} fill="none" stroke={color} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r2} fill="none" stroke={color} strokeWidth={1.5} />
      {chars.map((ch, i) => {
        const angle = startAngle + i * stepDeg;
        const { x, y, rot } = letterPath(angle);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            transform={`rotate(${rot}, ${x}, ${y})`} fill={color}
            fontSize={size * 0.11} fontWeight="900"
            fontFamily="'Arial Black', Arial, sans-serif">
            {ch}
          </text>
        );
      })}
      <line x1={cx - r2 * 0.6} y1={cy} x2={cx + r2 * 0.6} y2={cy} stroke={color} strokeWidth={1.5} />
      {subLabel && (
        <text x={cx} y={cy + 8} textAnchor="middle" fill={color}
          fontSize={size * 0.08} fontWeight="700">
          {subLabel}
        </text>
      )}
    </svg>
  );
};

/* ─── Stamp Card ──────────────────────────────────────────────────────── */
const StampCard = ({ stamp, onEdit, onDelete, onPrint }: {
  stamp: StampConfig;
  onEdit: () => void;
  onDelete: () => void;
  onPrint: () => void;
}) => {
  const color = STAMP_COLORS[stamp.type];
  const now = new Date();
  const yearStr = stamp.year?.toString() || now.getFullYear().toString();
  const monthStr = stamp.month ? new Date(2000, stamp.month - 1).toLocaleString('en', { month: 'short' }).toUpperCase() : '';
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-6 flex flex-col items-center">
        <div className="relative mb-4">
          <OfficialStampSVG
            label={stamp.label || STAMP_LABELS[stamp.type]}
            subLabel={stamp.period === 'annual' ? yearStr : stamp.period === 'monthly' ? `${monthStr} ${yearStr}` : stamp.subLabel}
            color={color}
            size={140}
          />
          {!stamp.isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-full">
              <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded">INACTIVE</span>
            </div>
          )}
        </div>
        
        <h3 className="font-bold text-slate-900 text-lg mb-1">{stamp.name}</h3>
        <p className="text-sm text-slate-500 mb-3">{STAMP_LABELS[stamp.type]}</p>
        
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <Calendar className="w-3 h-3" />
          <span>{stamp.period.charAt(0).toUpperCase() + stamp.period.slice(1)}</span>
          <span>•</span>
          <span>Used {stamp.useCount} times</span>
        </div>
        
        <div className="flex gap-2 w-full">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
          <button onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onDelete}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function StampsPage() {
  const { user, profile } = useAuth();
  const [stamps, setStamps] = useState<StampConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'annual' | 'monthly' | 'document'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingStamp, setEditingStamp] = useState<StampConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newStamp, setNewStamp] = useState({
    name: '',
    type: 'approved' as StampType,
    period: 'document' as StampPeriod,
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const loadStamps = useCallback(async () => {
    setLoading(true);
    try {
      // Load from system_settings or create demo stamps
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Demo stamps - in production, load from stamps table
      const demoStamps: StampConfig[] = [
        { id: '1', name: 'Annual Approval 2026', type: 'annual', period: 'annual', color: STAMP_COLORS.annual, label: 'ANNUAL APPROVED', subLabel: 'FY 2026', isActive: true, year: 2026, useCount: 45, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '2', name: 'Monthly Review June', type: 'monthly', period: 'monthly', color: STAMP_COLORS.monthly, label: 'MONTHLY REVIEWED', subLabel: 'JUN 2026', isActive: true, year: 2026, month: 6, useCount: 12, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '3', name: 'Approved Stamp', type: 'approved', period: 'document', color: STAMP_COLORS.approved, label: 'APPROVED', subLabel: 'PROCUREMENT', isActive: true, year: undefined, useCount: 128, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '4', name: 'Rejected Stamp', type: 'rejected', period: 'document', color: STAMP_COLORS.rejected, label: 'REJECTED', subLabel: 'NOT APPROVED', isActive: true, year: undefined, useCount: 23, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '5', name: 'Verified Stamp', type: 'verified', period: 'document', color: STAMP_COLORS.verified, label: 'VERIFIED', subLabel: 'QUALITY CHECK', isActive: true, year: undefined, useCount: 67, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '6', name: 'Official Use', type: 'official', period: 'document', color: STAMP_COLORS.official, label: 'OFFICIAL USE ONLY', subLabel: 'EL5 HOSPITAL', isActive: true, year: undefined, useCount: 89, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '7', name: 'Confidential', type: 'confidential', period: 'document', color: STAMP_COLORS.confidential, label: 'CONFIDENTIAL', subLabel: 'RESTRICTED', isActive: true, year: undefined, useCount: 34, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
        { id: '8', name: 'Urgent Action', type: 'urgent', period: 'document', color: STAMP_COLORS.urgent, label: 'URGENT ACTION REQUIRED', subLabel: 'IMMEDIATE', isActive: true, year: undefined, useCount: 15, createdAt: now.toISOString(), createdBy: profile?.full_name || 'Admin' },
      ];
      
      setStamps(demoStamps);
    } catch (e) {
      console.error('Error loading stamps:', e);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadStamps();
  }, [loadStamps]);

  const filteredStamps = stamps.filter(s => {
    if (activeTab !== 'all' && s.period !== activeTab) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCreateStamp = async () => {
    if (!newStamp.name) {
      toast({ title: 'Error', description: 'Please enter a stamp name', variant: 'destructive' });
      return;
    }

    const stamp: StampConfig = {
      id: Date.now().toString(),
      name: newStamp.name,
      type: newStamp.type,
      period: newStamp.period,
      color: STAMP_COLORS[newStamp.type],
      label: STAMP_LABELS[newStamp.type],
      subLabel: newStamp.period === 'annual' ? `FY ${newStamp.year}` : newStamp.period === 'monthly' ? `${new Date(2000, newStamp.month - 1).toLocaleString('en', { month: 'short' }).toUpperCase()} ${newStamp.year}` : 'DOCUMENT',
      isActive: true,
      year: newStamp.period !== 'document' ? newStamp.year : undefined,
      month: newStamp.period === 'monthly' ? newStamp.month : undefined,
      createdAt: new Date().toISOString(),
      createdBy: profile?.full_name || 'Admin',
      useCount: 0,
    };

    setStamps(prev => [...prev, stamp]);
    setShowCreate(false);
    setNewStamp({ name: '', type: 'approved', period: 'document', year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
    toast({ title: 'Stamp Created', description: `${stamp.name} has been created successfully` });
  };

  const handleDeleteStamp = (id: string) => {
    setStamps(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Stamp Deleted', description: 'Stamp has been removed' });
  };

  const handlePrintStamp = (stamp: StampConfig) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Print Stamp - ${stamp.name}</title></head>
          <body style="display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
            <div style="text-align:center;">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="95" fill="none" stroke="${stamp.color}" stroke-width="4"/>
                <circle cx="100" cy="100" r="85" fill="none" stroke="${stamp.color}" stroke-width="2"/>
                <text x="100" y="95" text-anchor="middle" fill="${stamp.color}" font-size="24" font-weight="900" font-family="Arial Black">${stamp.label}</text>
                <line x1="60" y1="100" x2="140" y2="100" stroke="${stamp.color}" stroke-width="2"/>
                <text x="100" y="120" text-anchor="middle" fill="${stamp.color}" font-size="16" font-weight="700">${stamp.subLabel}</text>
              </svg>
              <p style="margin-top:20px;font-family:Arial;">${stamp.name}</p>
              <p style="color:#666;font-size:12px;">EL5 MediProcure - ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Stamp className="w-5 h-5 text-white" />
              </div>
              Stamps Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">Manage official stamps - Annual, Monthly & Document</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => loadStamps()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-lg shadow-indigo-200">
              <Plus className="w-5 h-5" /> Create New Stamp
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Stamps', value: stamps.length, icon: Stamp, color: 'text-indigo-600', bg: 'bg-indigo-100' },
            { label: 'Annual Stamps', value: stamps.filter(s => s.period === 'annual').length, icon: CalendarDays, color: 'text-teal-600', bg: 'bg-teal-100' },
            { label: 'Monthly Stamps', value: stamps.filter(s => s.period === 'monthly').length, icon: CalendarRange, color: 'text-purple-600', bg: 'bg-purple-100' },
            { label: 'Total Uses', value: stamps.reduce((acc, s) => acc + s.useCount, 0), icon: Award, color: 'text-amber-600', bg: 'bg-amber-100' },
          ].map((stat, i) => (
            <div key={i} className={`${stat.bg} rounded-xl p-4 flex items-center gap-3`}>
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                <p className="text-xs font-medium text-slate-600">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="px-6 py-4 bg-white border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All Stamps' },
              { id: 'annual', label: 'Annual', icon: CalendarDays },
              { id: 'monthly', label: 'Monthly', icon: CalendarRange },
              { id: 'document', label: 'Document', icon: FileText },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {tab.icon && <tab.icon className="w-4 h-4" />}
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search stamps..."
              className="pl-10 pr-4 py-2 w-64 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Stamps Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : filteredStamps.length === 0 ? (
          <div className="text-center py-20">
            <Stamp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No stamps found</h3>
            <p className="text-slate-500 mb-4">Create your first stamp to get started</p>
            <button onClick={() => setShowCreate(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
              Create Stamp
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStamps.map(stamp => (
              <StampCard
                key={stamp.id}
                stamp={stamp}
                onEdit={() => setEditingStamp(stamp)}
                onDelete={() => handleDeleteStamp(stamp.id)}
                onPrint={() => handlePrintStamp(stamp)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-slate-900">Create New Stamp</h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Stamp Name</label>
                <input value={newStamp.name} onChange={e => setNewStamp(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g., Annual Budget Approval 2026"
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Stamp Period</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'annual', label: 'Annual', icon: CalendarDays },
                    { id: 'monthly', label: 'Monthly', icon: CalendarRange },
                    { id: 'document', label: 'Document', icon: FileText },
                  ].map(opt => (
                    <button key={opt.id}
                      onClick={() => setNewStamp(d => ({ ...d, period: opt.id as StampPeriod }))}
                      className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition ${
                        newStamp.period === opt.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {newStamp.period !== 'document' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                    <select value={newStamp.year} onChange={e => setNewStamp(d => ({ ...d, year: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  {newStamp.period === 'monthly' && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
                      <select value={newStamp.month} onChange={e => setNewStamp(d => ({ ...d, month: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Stamp Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(STAMP_COLORS) as StampType[]).filter(t => !['annual', 'monthly'].includes(t)).map(type => (
                    <button key={type}
                      onClick={() => setNewStamp(d => ({ ...d, type }))}
                      className={`py-2 px-3 rounded-lg text-xs font-medium transition border-2 ${
                        newStamp.type === type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      style={{ color: STAMP_COLORS[type] }}>
                      {STAMP_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 rounded-xl p-6 flex flex-col items-center">
                <p className="text-xs font-medium text-slate-500 mb-3">Preview</p>
                <OfficialStampSVG
                  label={STAMP_LABELS[newStamp.type]}
                  subLabel={newStamp.period === 'annual' ? `FY ${newStamp.year}` : newStamp.period === 'monthly' ? `${months.find(m => m.value === newStamp.month)?.label?.toUpperCase()} ${newStamp.year}` : 'DOCUMENT'}
                  color={STAMP_COLORS[newStamp.type]}
                  size={140}
                />
              </div>
            </div>
            <div className="p-6 border-t bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium">
                Cancel
              </button>
              <button onClick={handleCreateStamp}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                Create Stamp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
