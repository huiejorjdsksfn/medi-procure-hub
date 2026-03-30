import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logAudit } from "@/lib/audit";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail, Send, Loader2, Users, User, X, Search,
  CheckCheck, Forward, ChevronDown, Shield, Package,
  Clipboard, Wrench, Info,
} from "lucide-react";

// ─── Role metadata ────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  admin:               { label: "Admin",             color: "#a4262c", bg: "#fde8e8" },
  procurement_manager: { label: "Proc. Manager",     color: "#ca5010", bg: "#fef3e2" },
  procurement_officer: { label: "Proc. Officer",     color: "#1565c0", bg: "#e3f2fd" },
  inventory_manager:   { label: "Inv. Manager",      color: "#107c10", bg: "#f0fdf4" },
  warehouse_officer:   { label: "Warehouse",         color: "#005b70", bg: "#e0f7fa" },
  requisitioner:       { label: "Requisitioner",     color: "#5c2d91", bg: "#f3e8ff" },
};

const GROUPS = [
  { label: "All Users",       roles: null,      desc: "Everyone in the system" },
  { label: "Admins",          roles: ["admin"],                                    desc: "System administrators only" },
  { label: "Procurement",     roles: ["procurement_manager","procurement_officer"], desc: "Procurement managers & officers" },
  { label: "Managers",        roles: ["admin","procurement_manager","inventory_manager"], desc: "All management roles" },
  { label: "Non-Admins",      roles: ["procurement_manager","procurement_officer","inventory_manager","warehouse_officer","requisitioner"], desc: "All staff except admins" },
  { label: "Warehouse & Inv", roles: ["inventory_manager","warehouse_officer"],    desc: "Inventory & warehouse staff" },
];

export interface FwdRecipient {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export interface ForwardEmailDialogProps {
  open: boolean;
  onClose: () => void;
  /** The record being forwarded */
  record: {
    id: string;
    number: string;
    type: "requisition" | "purchase_order" | "voucher" | "tender" | "contract";
    amount?: number;
    priority?: string;
    status?: string;
    justification?: string;
  };
  /** Also mark the DB record as forwarded after send */
  onForwardStatus?: (id: string) => Promise<void>;
}

export default function ForwardEmailDialog({
  open, onClose, record, onForwardStatus,
}: ForwardEmailDialogProps) {
  const { user, profile } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────
  const [allUsers, setAllUsers]         = useState<any[]>([]);
  const [loading,  setLoading]          = useState(false);
  const [sending,  setSending]          = useState(false);
  const [tab,      setTab]              = useState<"all"|"admins"|"nonAdmins">("all");
  const [search,   setSearch]           = useState("");
  const [recipients, setRecipients]     = useState<FwdRecipient[]>([]);
  const [subject,  setSubject]          = useState("");
  const [body,     setBody]             = useState("");
  const [priority, setPriority]         = useState(record.priority || "normal");
  const [ccSelf,   setCcSelf]           = useState(false);
  const [sent,     setSent]             = useState(false);

  // ── Fetch users on open ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setRecipients([]);
    setSearch("");
    setTab("all");
    setPriority(record.priority || "normal");
    setSubject(`FWD: ${record.type.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())} ${record.number} – Action Required`);
    setBody(buildDefaultBody());
    fetchUsers();
  }, [open, record.id]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [{ data: profiles }, { data: roleRows }] = await Promise.all([
        (supabase as any).from("profiles").select("id, full_name, email").order("full_name"),
        (supabase as any).from("user_roles").select("user_id, role"),
      ]);
      const roleMap: Record<string, string[]> = {};
      (roleRows || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });
      setAllUsers(
        (profiles || [])
          .filter((p: any) => p.email)
          .map((p: any) => ({ ...p, roles: roleMap[p.id] || [] }))
      );
    } finally { setLoading(false); }
  };

  const buildDefaultBody = () =>
    `Dear Colleague,\n\nThis is to inform you of the following ${record.type.replace("_"," ")} that requires your attention.\n\nReference No : ${record.number}\n${record.amount != null ? `Amount       : KSH ${Number(record.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}\n` : ""}${record.priority ? `Priority     : ${record.priority.toUpperCase()}\n` : ""}${record.status ? `Current Status: ${record.status.toUpperCase()}\n` : ""}${record.justification ? `\nJustification:\n${record.justification}\n` : ""}\nPlease review this ${record.type.replace("_"," ")} and take the necessary action at your earliest convenience.\n\nKind regards,\n${profile?.full_name || "MediProcure System"}\nEmbu Level 5 Hospital`;

  // ── Filtered user list ─────────────────────────────────────────────────
  const visibleUsers = allUsers
    .filter(u => !recipients.some(r => r.id === u.id))
    .filter(u => {
      if (tab === "admins")    return u.roles.includes("admin");
      if (tab === "nonAdmins") return !u.roles.includes("admin");
      return true;
    })
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (u.full_name || "").toLowerCase().includes(q)
          || (u.email || "").toLowerCase().includes(q)
          || u.roles.some((r: string) => r.toLowerCase().includes(q));
    });

  const addUser = (u: any) => {
    setRecipients(p => [...p, { id: u.id, name: u.full_name || u.email, email: u.email, roles: u.roles }]);
    setSearch("");
  };

  const removeRecipient = (id: string) =>
    setRecipients(p => p.filter(r => r.id !== id));

  const addGroup = (groupRoles: string[] | null) => {
    const toAdd = allUsers.filter(u => {
      if (recipients.some(r => r.id === u.id)) return false;
      if (groupRoles === null) return true; // All Users — everyone with an email
      return groupRoles.some(r => u.roles.includes(r));
    });
    setRecipients(p => [...p, ...toAdd.map((u: any) => ({ id: u.id, name: u.full_name || u.email, email: u.email, roles: u.roles }))]);
    toast({ title: `Added ${toAdd.length} recipient${toAdd.length !== 1 ? "s" : ""}` });
  };

  // ── Send ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (recipients.length === 0) {
      toast({ title: "No recipients", description: "Add at least one recipient.", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "Subject is required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const recipientIds = recipients.map(r => r.id);
      // Add self as CC if requested
      if (ccSelf && user?.id && !recipientIds.includes(user.id)) {
        recipientIds.push(user.id);
      }

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          sender_id: user?.id,
          sender_name: profile?.full_name || "System",
          subject,
          body,
          recipient_ids: recipientIds,
          module: record.type,
          record_id: record.id,
          record_type: record.type,
          record_number: record.number,
          priority,
        },
      });
      if (error) throw error;

      // Update record status
      if (onForwardStatus) await onForwardStatus(record.id);

      // Audit log
      await logAudit(
        user?.id, profile?.full_name, "forward_email",
        record.type + "s", record.id,
        { recipients: recipients.map(r => `${r.name} <${r.email}>`), subject, priority }
      );

      setSent(true);
      toast({
        title: "✅ Forwarded successfully",
        description: `Email sent to ${recipients.length} recipient${recipients.length !== 1 ? "s" : ""}.`,
      });
      setTimeout(() => { onClose(); setSent(false); }, 1200);
    } catch (e: any) {
      toast({ title: "Send failed", description: e.message || "Unknown error", variant: "destructive" });
    } finally { setSending(false); }
  };

  // ── UI helpers ─────────────────────────────────────────────────────────
  const RoleBadge = ({ role }: { role: string }) => {
    const m = ROLE_META[role] || { label: role, color: "#555", bg: "#f0f0f0" };
    return (
      <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold leading-none"
        style={{ background: m.bg, color: m.color }}>
        {m.label}
      </span>
    );
  };

  const Avatar = ({ name, size = 28 }: { name: string; size?: number }) => {
    const ch = (name || "?").charAt(0).toUpperCase();
    const colors = ["#1565c0","#107c10","#ca5010","#5c2d91","#005b70","#a4262c"];
    const bg = colors[ch.charCodeAt(0) % colors.length];
    return (
      <div className="rounded-full flex items-center justify-center shrink-0 font-bold text-white"
        style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
        {ch}
      </div>
    );
  };

  const typeLabel = record.type.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  const priorityColors: Record<string, string> = {
    low: "#5a9e6f", normal: "#1565c0", high: "#ca5010", urgent: "#a4262c",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        style={{
          maxWidth: 720, maxHeight: "92vh", display: "flex" as const,
          flexDirection: "column" as const, overflow: "hidden" as const,
          fontFamily: "Segoe UI, system-ui, sans-serif",
          padding: 0,
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 shrink-0"
          style={{ background: "linear-gradient(135deg,#f8faff,#fff)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow"
            style={{ background: "linear-gradient(135deg,#1565c0,#29b6f6)" }}>
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900">Forward {typeLabel}</h2>
            <p className="text-[11px] text-gray-500 truncate">
              {record.number}
              {record.amount != null && ` · KSH ${Number(record.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`}
              {record.status && ` · ${record.status.toUpperCase()}`}
            </p>
          </div>
          {/* Priority pills */}
          <div className="flex items-center gap-1.5 shrink-0">
            {["low","normal","high","urgent"].map(p => (
              <button key={p} type="button" onClick={() => setPriority(p)}
                className="px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all"
                style={{
                  background: priority === p ? priorityColors[p] : "#fff",
                  color: priority === p ? "#fff" : "#888",
                  borderColor: priority === p ? priorityColors[p] : "#e0e0e0",
                }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* LEFT: User picker */}
          <div className="w-72 border-r border-gray-100 flex flex-col min-h-0 shrink-0 bg-gray-50/50">
            {/* Tabs: All / Admins / Non-Admins */}
            <div className="flex border-b border-gray-200 bg-white shrink-0">
              {(["all","admins","nonAdmins"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-[10px] font-bold transition-colors ${tab === t ? "text-blue-700 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}>
                  {t === "all" ? "All Users" : t === "admins" ? "Admins" : "Non-Admins"}
                </button>
              ))}
            </div>

            {/* Quick-add groups */}
            <div className="px-2.5 py-2 border-b border-gray-200 bg-white shrink-0">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Quick Add Group</p>
              <div className="flex flex-wrap gap-1">
                {GROUPS.map(g => (
                  <button key={g.label} type="button" title={g.desc}
                    onClick={() => addGroup(g.roles)}
                    className="px-2 py-0.5 text-[9px] font-bold rounded-full border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-gray-600 transition-colors">
                    + {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="px-2.5 py-2 shrink-0 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email or role…"
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-blue-400"/>
              </div>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-400"/>
                </div>
              ) : visibleUsers.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  {search ? "No users match your search" : "All users already added"}
                </p>
              ) : visibleUsers.map(u => (
                <button key={u.id} type="button" onClick={() => addUser(u)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-0 group">
                  <Avatar name={u.full_name || u.email} size={28}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-blue-700">
                      {u.full_name || "Unknown"}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {u.roles.length > 0
                        ? u.roles.map((r: string) => <RoleBadge key={r} role={r}/>)
                        : <span className="text-[8px] text-gray-300 italic">no role</span>
                      }
                    </div>
                  </div>
                  <div className="text-blue-400 opacity-0 group-hover:opacity-100 text-xs font-bold">+Add</div>
                </button>
              ))}
            </div>

            {/* Count */}
            <div className="px-3 py-2 border-t border-gray-200 bg-white shrink-0">
              <p className="text-[10px] text-gray-400">
                {allUsers.length} total users · {visibleUsers.length} shown
                {tab === "admins" && ` (admins only)`}
                {tab === "nonAdmins" && ` (non-admins)`}
              </p>
            </div>
          </div>

          {/* RIGHT: Compose */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

            {/* To: chips */}
            <div className="px-4 py-3 border-b border-gray-100 shrink-0" style={{ minHeight: 60 }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 shrink-0">To:</span>
                {recipients.length === 0 && (
                  <span className="text-xs text-gray-300 italic">Select recipients from the left panel…</span>
                )}
              </div>
              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {recipients.map(r => (
                    <span key={r.id}
                      className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 rounded-full text-[10px] font-semibold border"
                      style={{ background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e40af" }}>
                      <Avatar name={r.name} size={16}/>
                      <span className="max-w-[80px] truncate">{r.name}</span>
                      <button type="button" onClick={() => removeRecipient(r.id)}
                        className="ml-0.5 text-blue-300 hover:text-red-500 transition-colors leading-none">
                        <X className="w-2.5 h-2.5"/>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="px-4 py-2 border-b border-gray-100 shrink-0 flex items-center gap-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-12 shrink-0">Subj:</span>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                className="flex-1 text-sm border-0 outline-none bg-transparent text-gray-800 placeholder-gray-300"
                placeholder="Email subject…"/>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden px-4 pt-3 pb-2">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                className="w-full h-full resize-none text-xs border-0 outline-none bg-transparent text-gray-700 leading-relaxed"
                style={{ fontFamily: "Segoe UI, system-ui, sans-serif" }}
                placeholder="Compose your message…"
              />
            </div>

            {/* CC self toggle + send bar */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0 gap-3">
              <div className="flex items-center gap-3">
                {/* CC self */}
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <div className="relative">
                    <input type="checkbox" checked={ccSelf} onChange={e => setCcSelf(e.target.checked)} className="sr-only peer"/>
                    <div className="w-8 h-4 rounded-full transition-colors peer-checked:bg-blue-600 bg-gray-200"
                      style={{ width: 32, height: 18 }}>
                      <div className="absolute top-[2px] rounded-full bg-white shadow-sm transition-all"
                        style={{ width: 14, height: 14, left: ccSelf ? 16 : 2 }}/>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">CC myself</span>
                </label>

                {/* Recipients count */}
                {recipients.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2.5 py-1">
                    <CheckCheck className="w-3 h-3"/>
                    <span><strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose}
                  className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                  Cancel
                </button>
                <button type="button"
                  onClick={async () => {
                    if (onForwardStatus) await onForwardStatus(record.id);
                    onClose();
                    toast({ title: "Forwarded (no email)", description: "Status updated to Forwarded." });
                  }}
                  className="px-4 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 flex items-center gap-1.5 transition-colors">
                  <Forward className="w-3.5 h-3.5"/> Status Only
                </button>
                <button type="button" onClick={handleSend}
                  disabled={sending || recipients.length === 0}
                  className="px-5 py-2 text-xs rounded-lg font-bold text-white flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: sent ? "#107c10" : (sending || recipients.length === 0) ? "#93c5fd" : "linear-gradient(135deg,#1143a8,#1e88e5)",
                    boxShadow: recipients.length > 0 && !sending ? "0 4px 16px rgba(17,67,168,0.35)" : "none",
                  }}>
                  {sent
                    ? <><CheckCheck className="w-3.5 h-3.5"/> Sent!</>
                    : sending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin"/> Sending…</>
                    : <><Send className="w-3.5 h-3.5"/> Forward & Email</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
