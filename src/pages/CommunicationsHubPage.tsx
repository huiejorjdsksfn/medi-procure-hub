/**
 * EL5 MediProcure — Communications Hub v2.0
 * Complete Email, SMS, WhatsApp, Voice & Video Communications
 * Optimized for Kenya - Kenyan Phone Numbers & Email
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { netEngine, securityGuard } from "@/lib/networkEngine";
import {
  Mail, MessageSquare, Send, Phone, Video, PhoneCall, PhoneIncoming, PhoneOutgoing,
  MailOpen, Bell, Settings, RefreshCw, Users, Search, Plus, CheckCircle2,
  AlertCircle, Clock, SendHorizontal, MessageCircle, Hash, Megaphone,
  Paperclip, Image, Smile, MoreVertical, Star, Trash2, Reply, Forward,
  Volume2, VolumeX, Mic, MicOff, Video as VideoIcon, PhoneOff, User, Building2,
  Calendar, Clock3, CheckCheck, XCircle, Eye, Edit3, ChevronDown, Filter,
  Globe, MapPin
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface EmailMessage {
  id: string; from: string; fromName: string; to: string; toName: string;
  subject: string; body: string; date: string; read: boolean; starred: boolean;
  attachments?: { name: string; size: number }[]; priority: 'low' | 'normal' | 'high';
}
interface SMSMessage {
  id: string; to: string; toName: string; body: string; date: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending'; channel: 'sms' | 'whatsapp';
}
interface CallLog {
  id: string; contact: string; contactName: string; direction: 'inbound' | 'outbound';
  duration: number; date: string; status: 'completed' | 'missed' | 'voicemail';
  recording?: string;
}

/* ─── KENYA CONFIG ─────────────────────────────────────────────── */
const KENYA_CONFIG = {
  country: 'Kenya',
  countryCode: '+254',
  flag: '🇰🇪',
  timezone: 'Africa/Nairobi',
  currency: 'KES',
  currencySymbol: 'KSh',
  carriers: {
    '0710': 'Safaricom', '0711': 'Safaricom', '0712': 'Safaricom', '0713': 'Safaricom',
    '0714': 'Safaricom', '0715': 'Safaricom', '0716': 'Safaricom', '0717': 'Safaricom',
    '0718': 'Safaricom', '0719': 'Safaricom',
    '0100': 'Airtel', '0101': 'Airtel', '0102': 'Airtel',
    '0750': 'Airtel', '0751': 'Airtel', '0752': 'Airtel',
    '0770': 'Airtel', '0771': 'Airtel', '0772': 'Airtel',
    '0200': 'Telkom', '0201': 'Telkom',
  },
  hospitalDomain: 'embuhospital.go.ke',
  governmentDomains: ['go.ke', 'gov.ke', 'ac.ke', 'co.ke'],
};

/* ─── KENYA PHONE HELPERS ───────────────────────────────────────── */
const normalizeKenyaPhone = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Handle various formats
  if (digits.startsWith('254')) {
    return '+254' + digits.slice(3);
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '+254' + digits.slice(1);
  }
  if (digits.length === 9) {
    return '+254' + digits;
  }
  // Already in international format
  if (digits.startsWith('254') && digits.length === 12) {
    return '+' + digits;
  }
  return phone;
};

const formatKenyaPhone = (phone: string): string => {
  const normalized = normalizeKenyaPhone(phone);
  const digits = normalized.replace(/\D/g, '');
  
  if (digits.length === 12) {
    // +254 XXX XXX XXX
    return `+254 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
};

const getKenyaCarrier = (phone: string): string => {
  const normalized = normalizeKenyaPhone(phone);
  const prefix = normalized.slice(4, 8); // After +254
  
  if (KENYA_CONFIG.carriers[prefix as keyof typeof KENYA_CONFIG.carriers]) {
    return KENYA_CONFIG.carriers[prefix as keyof typeof KENYA_CONFIG.carriers];
  }
  return 'Unknown Carrier';
};

const isValidKenyaPhone = (phone: string): boolean => {
  const normalized = normalizeKenyaPhone(phone);
  const digits = normalized.replace(/\D/g, '');
  return digits.length === 12 && digits.startsWith('254');
};

/* ─── DATE/TIME HELPERS (Kenya Time) ────────────────────────────── */
const formatKenyaTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-KE', { 
    timeZone: KENYA_CONFIG.timezone,
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatKenyaDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-KE', { 
    timeZone: KENYA_CONFIG.timezone,
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  });
};

const formatKenyaDateTime = (date: string | Date): string => {
  return `${formatKenyaDate(date)} ${formatKenyaTime(date)}`;
};

const timeAgo = (d: string) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// Format phone using Kenya format
const formatPhone = (p: string) => formatKenyaPhone(p);
const initials = (n: string) => n.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

/* ─── Status Colors ──────────────────────────────────────────────── */
const STATUS_COLORS = {
  sent: '#6b7280', delivered: '#10b981', failed: '#ef4444', pending: '#f59e0b',
  completed: '#10b981', missed: '#ef4444', voicemail: '#8b5cf6',
  read: '#10b981', unread: '#3b82f6',
};
const CHANNEL_COLORS = { sms: '#3b82f6', whatsapp: '#25D366', email: '#0078d4', voice: '#8b5cf6' };
const CARRIER_COLORS: Record<string, string> = {
  'Safaricom': '#00A651',
  'Airtel': '#E60000',
  'Telkom': '#FF6900',
  'Unknown Carrier': '#6b7280',
};

/* ─── Main Component ─────────────────────────────────────────────── */
export default function CommunicationsHubPage() {
  const { user, profile } = useAuth();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'calls' | 'voice' | 'settings'>('email');
  
  // Email state
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [emailSearch, setEmailSearch] = useState('');
  const [composeEmail, setComposeEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ to: '', cc: '', subject: '', body: '', priority: 'normal' as const });
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // SMS state
  const [smsMessages, setSmsMessages] = useState<SMSMessage[]>([]);
  const [smsSearch, setSmsSearch] = useState('');
  const [composeSMS, setComposeSMS] = useState(false);
  const [smsDraft, setSmsDraft] = useState({ to: '', message: '', channel: 'sms' as const });
  const [sendingSMS, setSendingSMS] = useState(false);
  
  // Calls state
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [callSearch, setCallSearch] = useState('');
  const [showCallDialer, setShowCallDialer] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [activeCall, setActiveCall] = useState<{ number: string; status: 'calling' | 'connected' | 'ended' } | null>(null);
  
  // Voice state
  const [voiceActive, setVoiceActive] = useState(false);
  const [muted, setMuted] = useState(false);
  const [onVideo, setOnVideo] = useState(false);

  /* ─── Load Data ──────────────────────────────────────────────────── */
  const loadEmails = useCallback(async () => {
    // Demo data - in production, load from inbox_items table
    setEmails([
      { id: '1', from: 'admin@embuhospital.go.ke', fromName: 'Hospital Admin', to: user?.email || '', toName: profile?.full_name || 'Staff', subject: 'Weekly Procurement Report', body: 'Please find attached the weekly procurement summary...', date: new Date(Date.now() - 3600000).toISOString(), read: false, starred: true, priority: 'high' },
      { id: '2', from: 'pharmacy@embuhospital.go.ke', fromName: 'Pharmacy Department', to: user?.email || '', toName: profile?.full_name || 'Staff', subject: 'Low Stock Alert - Paracetamol 500mg', body: 'URGENT: Paracetamol 500mg stock is below reorder level...', date: new Date(Date.now() - 7200000).toISOString(), read: true, starred: false, priority: 'high' },
      { id: '3', from: 'finance@embuhospital.go.ke', fromName: 'Finance Office', to: user?.email || '', toName: profile?.full_name || 'Staff', subject: 'Budget Approval Required', body: 'PO-2024-089 requires your approval for KES 125,000...', date: new Date(Date.now() - 86400000).toISOString(), read: true, starred: false, priority: 'normal' },
      { id: '4', from: 'supplier@karispharma.com', fromName: 'Karis Pharmaceuticals Ltd', to: user?.email || '', toName: profile?.full_name || 'Staff', subject: 'Delivery Confirmation', body: 'Order #PO-2024-088 will be delivered tomorrow morning...', date: new Date(Date.now() - 172800000).toISOString(), read: true, starred: false, priority: 'low' },
    ]);
  }, [user, profile]);

  const loadSMS = useCallback(async () => {
    // Demo data - in production, load from sms_logs table
    setSmsMessages([
      { id: '1', to: '+254722123456', toName: 'John Kamau', body: 'Your requisition REQ-2024-045 has been approved.', date: new Date(Date.now() - 1800000).toISOString(), status: 'delivered', channel: 'sms' },
      { id: '2', to: '+254733987654', toName: 'Sarah Wanjiku', body: 'GRN for PO-2024-088 confirmed. 45 items received.', date: new Date(Date.now() - 3600000).toISOString(), status: 'delivered', channel: 'whatsapp' },
      { id: '3', to: '+254711555888', toName: 'Mike Ochieng', body: 'Reminder: Budget meeting at 2pm in Conference Room B', date: new Date(Date.now() - 7200000).toISOString(), status: 'sent', channel: 'sms' },
      { id: '4', to: '+254722333444', toName: 'Ann Njeri', body: 'Supplier quote received - KES 89,500 for medical supplies', date: new Date(Date.now() - 14400000).toISOString(), status: 'delivered', channel: 'whatsapp' },
    ]);
  }, []);

  const loadCalls = useCallback(async () => {
    // Demo data - in production, load from call_logs table
    setCalls([
      { id: '1', contact: '+254722123456', contactName: 'John Kamau', direction: 'inbound', duration: 245, date: new Date(Date.now() - 1800000).toISOString(), status: 'completed' },
      { id: '2', contact: '+254733987654', contactName: 'Sarah Wanjiku', direction: 'outbound', duration: 0, date: new Date(Date.now() - 3600000).toISOString(), status: 'missed' },
      { id: '3', contact: '+254711555888', contactName: 'Mike Ochieng', direction: 'outbound', duration: 180, date: new Date(Date.now() - 7200000).toISOString(), status: 'completed' },
      { id: '4', contact: '+254722333444', contactName: 'Ann Njeri', direction: 'inbound', duration: 0, date: new Date(Date.now() - 14400000).toISOString(), status: 'voicemail' },
      { id: '5', contact: '+254700111222', contactName: 'Dr. Peter Mutua', direction: 'inbound', duration: 420, date: new Date(Date.now() - 28800000).toISOString(), status: 'completed' },
    ]);
  }, []);

  useEffect(() => {
    loadEmails();
    loadSMS();
    loadCalls();
  }, [loadEmails, loadSMS, loadCalls]);

  /* ─── Send Email ────────────────────────────────────────────────── */
  const handleSendEmail = async () => {
    if (!emailDraft.to || !emailDraft.subject || !emailDraft.body) {
      toast({ title: 'Missing fields', description: 'Please fill in recipient, subject, and message body.', variant: 'destructive' });
      return;
    }
    setSendingEmail(true);
    try {
      // Call Supabase edge function to send email via external SMTP.
      // retries: 0 — never auto-retry a send action, that could double-send.
      // Still gets circuit breaking (fast-fail if SMTP is down) + adaptive timeout.
      const { error } = await netEngine.request(
        "comm:send-email",
        () => (supabase.functions as any).invoke('send-email', {
          headers: securityGuard.signRequest(),
          body: {
            to: emailDraft.to,
            cc: emailDraft.cc,
            subject: emailDraft.subject,
            body: emailDraft.body,
            from: profile?.email || user?.email,
            fromName: profile?.full_name,
            priority: emailDraft.priority,
          }
        }),
        { priority: "critical", retries: 0, label: "send email" }
      );
      
      if (error) throw error;
      
      toast({ title: 'Email Sent', description: `Message delivered to ${emailDraft.to}` });
      setComposeEmail(false);
      setEmailDraft({ to: '', cc: '', subject: '', body: '', priority: 'normal' });
      loadEmails();
    } catch (e: any) {
      toast({ title: 'Send Failed', description: e.message || 'Failed to send email', variant: 'destructive' });
    }
    setSendingEmail(false);
  };

  /* ─── Send SMS ─────────────────────────────────────────────────── */
  const handleSendSMS = async () => {
    if (!smsDraft.to || !smsDraft.message) {
      toast({ title: 'Missing fields', description: 'Please enter recipient and message.', variant: 'destructive' });
      return;
    }
    
    // Validate Kenya phone number
    const normalizedPhone = normalizeKenyaPhone(smsDraft.to);
    if (!isValidKenyaPhone(normalizedPhone)) {
      toast({ 
        title: 'Invalid Phone Number', 
        description: 'Please enter a valid Kenyan phone number (e.g., 0712 345 678 or +254 712 345 678)', 
        variant: 'destructive' 
      });
      return;
    }
    
    setSendingSMS(true);
    try {
      // Call Supabase edge function to send SMS via Twilio (retries:0, same reasoning)
      const { error } = await netEngine.request(
        "comm:send-sms",
        () => (supabase.functions as any).invoke('send-sms', {
          headers: securityGuard.signRequest(),
          body: {
            to: normalizedPhone,
            message: smsDraft.message,
            channel: smsDraft.channel,
            contactName: 'Unknown Contact',
          }
        }),
        { priority: "critical", retries: 0, label: "send SMS" }
      );
      
      if (error) throw error;
      
      toast({ title: 'SMS Sent', description: `Message sent to ${formatPhone(smsDraft.to)} via ${smsDraft.channel.toUpperCase()}` });
      setComposeSMS(false);
      setSmsDraft({ to: '', message: '', channel: 'sms' });
      loadSMS();
    } catch (e: any) {
      toast({ title: 'Send Failed', description: e.message || 'Failed to send SMS', variant: 'destructive' });
    }
    setSendingSMS(false);
  };

  /* ─── Make Call ────────────────────────────────────────────────── */
  const handleMakeCall = async () => {
    if (!dialNumber) return;
    setActiveCall({ number: dialNumber, status: 'calling' });
    
    try {
      // Call Supabase edge function to initiate call via Twilio (retries:0 — never auto-redial)
      const { error } = await netEngine.request(
        "comm:make-call",
        () => (supabase.functions as any).invoke('make-call', { headers: securityGuard.signRequest(), body: { to: dialNumber } }),
        { priority: "critical", retries: 0, label: "make call" }
      );
      
      if (error) throw error;
      
      // Simulate connection
      setTimeout(() => {
        setActiveCall({ number: dialNumber, status: 'connected' });
      }, 3000);
    } catch (e: any) {
      toast({ title: 'Call Failed', description: e.message || 'Failed to initiate call', variant: 'destructive' });
      setActiveCall(null);
    }
  };

  const handleEndCall = () => {
    setActiveCall({ number: activeCall?.number || '', status: 'ended' });
    setTimeout(() => setActiveCall(null), 1000);
  };

  /* ─── Filtered Data ─────────────────────────────────────────────── */
  const filteredEmails = emails.filter(e => 
    e.subject.toLowerCase().includes(emailSearch.toLowerCase()) ||
    e.fromName.toLowerCase().includes(emailSearch.toLowerCase()) ||
    e.body.toLowerCase().includes(emailSearch.toLowerCase())
  );

  const filteredSMS = smsMessages.filter(s =>
    s.toName.toLowerCase().includes(smsSearch.toLowerCase()) ||
    s.to.includes(smsSearch) ||
    s.body.toLowerCase().includes(smsSearch.toLowerCase())
  );

  const filteredCalls = calls.filter(c =>
    c.contactName.toLowerCase().includes(callSearch.toLowerCase()) ||
    c.contact.includes(callSearch)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communications Hub</h1>
          <p className="text-sm text-slate-500">Unified Email, SMS, WhatsApp, Voice & Video</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { loadEmails(); loadSMS(); loadCalls(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" /> All Systems Online
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tabs */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 space-y-1">
            {[
              { id: 'email', icon: Mail, label: 'Email', count: emails.filter(e => !e.read).length, color: '#0078d4' },
              { id: 'sms', icon: MessageSquare, label: 'SMS / WhatsApp', count: 2, color: '#25D366' },
              { id: 'calls', icon: Phone, label: 'Call Logs', count: calls.filter(c => c.status === 'missed').length, color: '#8b5cf6' },
              { id: 'voice', icon: Video, label: 'Voice / Video', count: 0, color: '#ec4899' },
            ].map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
                  activeTab === tab.id ? 'bg-slate-100 font-semibold text-slate-900' : 'hover:bg-slate-50 text-slate-600'
                }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${tab.color}15` }}>
                    <tab.icon className="w-4 h-4" style={{ color: tab.color }} />
                  </div>
                  <span>{tab.label}</span>
                </div>
                {tab.count > 0 && (
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: tab.color }}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="mt-auto p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {profile?.full_name ? initials(profile.full_name) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900 truncate">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{profile?.email || user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Kenya Status Bar */}
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{KENYA_CONFIG.flag}</span>
              <span className="text-sm font-medium text-emerald-800">Communications Hub</span>
              <span className="text-xs text-emerald-600">• Embu Level 5 Hospital</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-emerald-700">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Nairobi Time: {formatKenyaTime(new Date())}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3" /> {KENYA_CONFIG.timezone}
              </span>
            </div>
          </div>
          
          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="flex flex-1">
              {/* Email List */}
              <div className="w-96 border-r flex flex-col">
                <div className="p-4 border-b space-y-3">
                  <button onClick={() => setComposeEmail(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition">
                    <Mail className="w-4 h-4" /> Compose Email
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={emailSearch} onChange={e => setEmailSearch(e.target.value)}
                      placeholder="Search emails..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredEmails.map(email => (
                    <div key={email.id}
                      className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition ${!email.read ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {email.starred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                          <span className={`font-medium text-sm ${!email.read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {email.fromName}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">{timeAgo(email.date)}</span>
                      </div>
                      <p className={`text-sm mb-1 truncate ${!email.read ? 'font-medium' : 'text-slate-600'}`}>{email.subject}</p>
                      <p className="text-xs text-slate-400 truncate">{email.body}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {email.priority === 'high' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-medium rounded">High Priority</span>
                        )}
                        {email.attachments && email.attachments.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Paperclip className="w-3 h-3" /> {email.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredEmails.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No emails found</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Preview / Compose */}
              <div className="flex-1 flex flex-col">
                {composeEmail ? (
                  <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">New Email</h2>
                      <button onClick={() => setComposeEmail(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                        <XCircle className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">To (External Email)</label>
                        <input value={emailDraft.to} onChange={e => setEmailDraft(d => ({ ...d, to: e.target.value }))}
                          placeholder="recipient@external-domain.com"
                          className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">CC</label>
                        <input value={emailDraft.cc} onChange={e => setEmailDraft(d => ({ ...d, cc: e.target.value }))}
                          placeholder="cc@domain.com (optional)"
                          className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                        <input value={emailDraft.subject} onChange={e => setEmailDraft(d => ({ ...d, subject: e.target.value }))}
                          placeholder="Email subject"
                          className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                        <textarea value={emailDraft.body} onChange={e => setEmailDraft(d => ({ ...d, body: e.target.value }))}
                          placeholder="Write your message here..."
                          rows={10}
                          className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-500">Attach files</span>
                        </div>
                        <button onClick={handleSendEmail} disabled={sendingEmail}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50">
                          {sendingEmail ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="w-4 h-4" /> Send Email</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Select an email to preview</p>
                      <p className="text-sm mt-1">or compose a new email</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SMS Tab */}
          {activeTab === 'sms' && (
            <div className="flex flex-1">
              {/* SMS List */}
              <div className="w-96 border-r flex flex-col">
                <div className="p-4 border-b space-y-3">
                  <button onClick={() => setComposeSMS(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition">
                    <MessageSquare className="w-4 h-4" /> Compose SMS
                  </button>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input value={smsSearch} onChange={e => setSmsSearch(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition">All</button>
                    <button className="flex-1 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg">SMS</button>
                    <button className="flex-1 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg">WhatsApp</button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredSMS.map(sms => (
                    <div key={sms.id} className="p-4 border-b cursor-pointer hover:bg-slate-50 transition">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center text-white text-xs font-bold">
                            {initials(sms.toName)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{sms.toName}</p>
                            <p className="text-xs text-slate-400">{formatPhone(sms.to)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">{timeAgo(sms.date)}</span>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[sms.status] }} />
                            <span className="text-[10px]" style={{ color: STATUS_COLORS[sms.status] }}>{sms.status}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{sms.body}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded"
                          style={{ backgroundColor: `${CHANNEL_COLORS[sms.channel]}20`, color: CHANNEL_COLORS[sms.channel] }}>
                          {sms.channel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SMS Compose */}
              <div className="flex-1 flex flex-col">
                {composeSMS ? (
                  <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold">New Message</h2>
                      <button onClick={() => setComposeSMS(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                        <XCircle className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
                        <div className="flex gap-2">
                          <button onClick={() => setSmsDraft((d:any) => ({ ...d, channel: 'sms' }))}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${
                              smsDraft.channel === 'sms' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            <MessageSquare className="w-4 h-4 inline mr-2" />SMS
                          </button>
                          <button onClick={() => setSmsDraft((d:any) => ({ ...d, channel: 'whatsapp' }))}
                            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition ${
                              (smsDraft.channel as string) === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}>
                            <MessageCircle className="w-4 h-4 inline mr-2" />WhatsApp
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Recipient (Kenyan Phone Number) {KENYA_CONFIG.flag}
                        </label>
                        <div className="relative">
                          <input value={smsDraft.to} onChange={e => setSmsDraft(d => ({ ...d, to: e.target.value }))}
                            placeholder="0712 345 678 or +254 712 345 678"
                            className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none pr-20"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                            KE
                          </span>
                        </div>
                        {smsDraft.to && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-500">
                              {isValidKenyaPhone(normalizeKenyaPhone(smsDraft.to)) ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 inline text-emerald-500 mr-1" />
                                  Valid Kenyan number • {getKenyaCarrier(smsDraft.to)}
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3 h-3 inline text-red-500 mr-1" />
                                  Enter valid Kenyan number (07XX or +254)
                                </>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                        <textarea value={smsDraft.message} onChange={e => setSmsDraft(d => ({ ...d, message: e.target.value }))}
                          placeholder="Type your message..."
                          rows={8}
                          className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none" />
                        <p className="text-xs text-slate-400 mt-1">{smsDraft.message.length} / 160 characters</p>
                      </div>
                      <button onClick={handleSendSMS} disabled={sendingSMS}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition disabled:opacity-50">
                        {sendingSMS ? (
                          <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
                        ) : (
                          <><Send className="w-4 h-4" /> Send Message via {smsDraft.channel.toUpperCase()}</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">Select a conversation</p>
                      <p className="text-sm mt-1">or start a new message</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calls Tab */}
          {activeTab === 'calls' && (
            <div className="flex flex-1 flex-col">
              <div className="p-4 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Call Logs</h2>
                  <button onClick={() => setShowCallDialer(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition">
                    <PhoneCall className="w-4 h-4" /> New Call
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input value={callSearch} onChange={e => setCallSearch(e.target.value)}
                    placeholder="Search calls..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredCalls.map(call => (
                  <div key={call.id} className="p-4 border-b hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          call.direction === 'inbound' ? 'bg-violet-100' : 'bg-blue-100'
                        }`}>
                          {call.direction === 'inbound' ? (
                            <PhoneIncoming className="w-5 h-5 text-violet-600" />
                          ) : (
                            <PhoneOutgoing className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{call.contactName}</p>
                          <p className="text-sm text-slate-500">{formatPhone(call.contact)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[call.status] }} />
                          <span className="text-sm" style={{ color: STATUS_COLORS[call.status] }}>{call.status}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {call.status === 'missed' ? timeAgo(call.date) : `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}`}
                        </p>
                      </div>
                    </div>
                    {call.status !== 'missed' && (
                      <div className="flex gap-2 mt-3">
                        <button className="flex-1 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1">
                          <Phone className="w-3 h-3" /> Call Back
                        </button>
                        <button className="flex-1 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1">
                          <MessageSquare className="w-3 h-3" /> SMS
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voice / Video Tab */}
          {activeTab === 'voice' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center mx-auto mb-6">
                  <VideoIcon className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Voice & Video Calls</h2>
                <p className="text-slate-500 mb-6">Make HD voice and video calls directly from your browser. No app installation required.</p>
                <div className="space-y-3">
                  <button onClick={() => setVoiceActive(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition">
                    <PhoneCall className="w-5 h-5" /> Start Voice Call
                  </button>
                  <button onClick={() => { setVoiceActive(true); setOnVideo(true); }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition">
                    <VideoIcon className="w-5 h-5" /> Start Video Call
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-96 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold">{formatPhone(activeCall.number)}</h3>
            <p className="text-slate-500">
              {activeCall.status === 'calling' ? 'Calling...' : activeCall.status === 'connected' ? 'Connected' : 'Call Ended'}
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={() => setMuted(!muted)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  muted ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                {muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {activeCall.status === 'connected' && (
                <button onClick={() => setOnVideo(!onVideo)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                    onVideo ? 'bg-violet-500 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                  <VideoIcon className="w-5 h-5" />
                </button>
              )}
              <button onClick={handleEndCall}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition">
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialpad Modal */}
      {showCallDialer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCallDialer(false)}>
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold flex items-center justify-center gap-2">
                <Phone className="w-5 h-5 text-emerald-600" /> Kenya Dialer {KENYA_CONFIG.flag}
              </h3>
              <p className="text-xs text-slate-500">Africa/Nairobi • {KENYA_CONFIG.currencySymbol}</p>
            </div>
            <div className="relative">
              <input value={dialNumber} onChange={e => setDialNumber(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-4 py-3 text-center text-xl border-2 border-emerald-200 rounded-lg mb-2 bg-emerald-50" />
              {dialNumber && (
                <div className="text-xs text-center mb-3">
                  {isValidKenyaPhone(normalizeKenyaPhone(dialNumber)) ? (
                    <span className="text-emerald-600">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />
                      {formatPhone(dialNumber)} • {getKenyaCarrier(dialNumber)}
                    </span>
                  ) : (
                    <span className="text-slate-400">Enter Kenyan number</span>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['1','2','3','4','5','6','7','8','9','*','0','#'].map(key => (
                <button key={key} onClick={() => setDialNumber(d => d + key)}
                  className="py-3 text-lg font-medium bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg transition">
                  {key}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDialNumber(d => d.slice(0, -1))}
                className="flex-1 py-3 bg-slate-200 hover:bg-red-100 text-slate-700 hover:text-red-600 rounded-lg transition">
                <XCircle className="w-5 h-5 mx-auto" />
              </button>
              <button onClick={handleMakeCall} disabled={!dialNumber}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg flex items-center justify-center gap-2 transition">
                <PhoneCall className="w-5 h-5" /> Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
