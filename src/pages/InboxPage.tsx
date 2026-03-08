import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Mail, CheckCircle, XCircle, Reply, Eye, Clock, Search, X, Send, Inbox, AlertTriangle, Archive, CornerUpLeft, ChevronRight } from "lucide-react";

const STATUS_STYLES: Record<string,{bg:string;color:string}> = {
  unread:   { bg:"#dbeafe", color:"#1d4ed8" },
  read:     { bg:"#f3f4f6", color:"#6b7280" },
  replied:  { bg:"#dcfce7", color:"#16a34a" },
  actioned: { bg:"#ede9fe", color:"#7c3aed" },
  archived: { bg:"#f3f4f6", color:"#9ca3af" },
};

const TYPE_ICONS: Record<string,string> = {
  forwarded_requisition:"📋", forwarded_po:"🛒", task:"✅", message:"💬", approval:"🔐",
};

const PRIORITY_COLORS: Record<string,string> = { high:"#ef4444", normal:"#6b7280", low:"#10b981", urgent:"#f59e0b" };

export default function InboxPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"inbox"|"sent">("inbox");

  const load = useCallback(async () => {
    setLoading(true);
    if (!user) { setLoading(false); return; }
    const col = tab === "inbox" ? "to_user_id" : "from_user_id";
    let q = (supabase as any).from("inbox_items").select("*").eq(col, user.id).order("created_at",{ascending:false});
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setItems(data || []);
    setLoading(false);
  },[user, filter, tab]);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{
    if (!user) return;
    const ch = (supabase as any).channel("inbox-live")
      .on("postgres_changes",{ event:"*", schema:"public", table:"inbox_items", filter:`to_user_id=eq.${user.id}` },()=>load())
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[user, load]);

  const openItem = async (item: any) => {
    setActiveItem(item);
    setReplyText("");
    if (item.status === "unread" && tab === "inbox") {
      await (supabase as any).from("inbox_items").update({ status:"read" }).eq("id", item.id);
      setItems(prev => prev.map(i => i.id===item.id ? {...i,status:"read"} : i));
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeItem) return;
    setSubmitting(true);
    try {
      await (supabase as any).from("inbox_items").update({
        reply_body: replyText.trim(),
        status: "replied",
        replied_at: new Date().toISOString(),
      }).eq("id", activeItem.id);
      // Send reply back to sender
      if (activeItem.from_user_id) {
        await (supabase as any).from("inbox_items").insert({
          type: "message",
          subject: `Re: ${activeItem.subject}`,
          body: replyText.trim(),
          from_user_id: user?.id,
          to_user_id: activeItem.from_user_id,
          priority: "normal",
          status: "unread",
          record_id: activeItem.record_id,
          record_type: activeItem.record_type,
          record_number: activeItem.record_number,
        });
      }
      toast({ title:"Reply sent", description:"Your reply has been sent" });
      setActiveItem((p:any)=>({...p,status:"replied",reply_body:replyText}));
      setReplyText("");
      load();
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setSubmitting(false);
  };

  const approveAction = async (action: "approve"|"reject") => {
    if (!activeItem) return;
    setSubmitting(true);
    try {
      const table = activeItem.record_type==="requisition"?"requisitions":
                    activeItem.record_type==="purchase_order"?"purchase_orders":"requisitions";
      const status = action==="approve" ? "approved" : "rejected";
      if (activeItem.record_id) {
        await (supabase as any).from(table).update({
          status,
          approved_by: user?.id,
          approved_by_name: profile?.full_name,
          ...(action==="approve" ? {approved_at: new Date().toISOString()} : {rejection_reason: replyText||"Rejected by admin"}),
        }).eq("id", activeItem.record_id);
      }
      await (supabase as any).from("inbox_items").update({
        status: "actioned",
        action_taken: action,
        reply_body: replyText||`${action}d by ${profile?.full_name}`,
        replied_at: new Date().toISOString(),
      }).eq("id", activeItem.id);
      // Notify sender
      if (activeItem.from_user_id) {
        await (supabase as any).from("inbox_items").insert({
          type: "message",
          subject: `${action==="approve"?"✅ Approved":"❌ Rejected"}: ${activeItem.record_number||activeItem.subject}`,
          body: `Your ${activeItem.record_type||"request"} (${activeItem.record_number||""}) has been ${action}d by ${profile?.full_name}.${replyText?`\n\nNote: ${replyText}`:""}`,
          from_user_id: user?.id,
          to_user_id: activeItem.from_user_id,
          priority: "high",
          status: "unread",
          record_id: activeItem.record_id,
          record_type: activeItem.record_type,
          record_number: activeItem.record_number,
        });
      }
      toast({title:`${action==="approve"?"Approved":"Rejected"}`, description:`${activeItem.record_number||"Record"} has been ${action}d`});
      setActiveItem((p:any)=>({...p,status:"actioned",action_taken:action}));
      setReplyText("");
      load();
    } catch(e:any){ toast({title:"Error",description:e.message,variant:"destructive"}); }
    setSubmitting(false);
  };

  const archiveItem = async (item: any) => {
    await (supabase as any).from("inbox_items").update({status:"archived"}).eq("id", item.id);
    setItems(prev => prev.filter(i=>i.id!==item.id));
    if (activeItem?.id===item.id) setActiveItem(null);
  };

  const filtered = items.filter(i=>{
    if (!search) return true;
    const s=search.toLowerCase();
    return (i.subject||"").toLowerCase().includes(s)||(i.body||"").toLowerCase().includes(s)||(i.record_number||"").toLowerCase().includes(s);
  });

  const unreadCount = items.filter(i=>i.status==="unread").length;

  return (
    <div className="flex h-[calc(100vh-120px)]" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Left panel */}
      <div className="w-80 shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100" style={{background:"linear-gradient(90deg,#1a3a6b,#1d4a87)"}}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Mail className="w-4 h-4" /> Inbox
              {unreadCount>0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">{unreadCount}</span>}
            </h2>
            <button onClick={load} disabled={loading} className="p-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25">
              <RefreshCw className={`w-3.5 h-3.5 ${loading?"animate-spin":""}`} />
            </button>
          </div>
          {/* Tabs */}
          <div className="flex gap-1">
            {(["inbox","sent"] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)}
                className="flex-1 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all"
                style={{background:tab===t?"rgba(255,255,255,0.2)":"transparent",color:"#fff"}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 border-b border-gray-100 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search messages…"
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs outline-none focus:border-blue-400" />
            {search && <button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-400"/></button>}
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all","unread","read","replied","actioned"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize transition-all"
                style={{background:filter===f?"#1a3a6b":"#f3f4f6",color:filter===f?"#fff":"#6b7280"}}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array(5).fill(0).map((_,i)=>(
              <div key={i} className="p-3 border-b border-gray-50 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5"/><div className="h-2 bg-gray-100 rounded w-1/2"/>
              </div>
            ))
          ) : filtered.length===0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Inbox className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No messages{filter!=="all"?` (${filter})`:""}
</p>
            </div>
          ) : filtered.map(item=>(
            <button key={item.id} onClick={()=>openItem(item)}
              className="w-full p-3 border-b border-gray-50 text-left transition-all hover:bg-blue-50/50"
              style={{background:activeItem?.id===item.id?"#eff6ff":"transparent"}}>
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0 mt-0.5">{TYPE_ICONS[item.type]||"📩"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-gray-800 truncate flex-1">{item.subject}</span>
                    {item.status==="unread" && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">{item.body?.slice(0,60)}{item.body?.length>60?"…":""}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                      style={{background:STATUS_STYLES[item.status]?.bg||"#f3f4f6",color:STATUS_STYLES[item.status]?.color||"#6b7280"}}>
                      {item.status}
                    </span>
                    {item.record_number && <span className="text-[9px] text-gray-400">{item.record_number}</span>}
                    <span className="text-[9px] text-gray-300 ml-auto">{item.created_at?new Date(item.created_at).toLocaleDateString("en-KE"):"—"}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!activeItem ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Mail className="w-14 h-14 text-gray-200 mb-3" />
            <p className="text-sm font-medium">Select a message to view</p>
            <p className="text-xs mt-1">{filtered.length} message{filtered.length!==1?"s":""} in {tab}</p>
          </div>
        ) : (
          <>
            {/* Message header */}
            <div className="px-5 py-4 bg-white border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TYPE_ICONS[activeItem.type]||"📩"}</span>
                  <div>
                    <h3 className="text-sm font-black text-gray-800">{activeItem.subject}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-gray-400">
                        {new Date(activeItem.created_at).toLocaleString("en-KE",{month:"long",day:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"})}
                      </span>
                      {activeItem.record_number && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">{activeItem.record_number}</span>
                      )}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{background:PRIORITY_COLORS[activeItem.priority]+"18",color:PRIORITY_COLORS[activeItem.priority]}}>
                        {activeItem.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>archiveItem(activeItem)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 bg-gray-100 hover:bg-gray-200">
                    <Archive className="w-3 h-3" /> Archive
                  </button>
                </div>
              </div>
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-2xl p-4 shadow-sm">
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{activeItem.body}</div>
              </div>

              {/* Previous reply */}
              {activeItem.reply_body && (
                <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CornerUpLeft className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[11px] font-bold text-green-700">Your Reply</span>
                    {activeItem.replied_at && <span className="text-[10px] text-green-500">{new Date(activeItem.replied_at).toLocaleString("en-KE")}</span>}
                  </div>
                  <div className="text-sm text-green-800 whitespace-pre-wrap">{activeItem.reply_body}</div>
                </div>
              )}

              {/* Action taken */}
              {activeItem.action_taken && (
                <div className={`rounded-2xl p-4 border ${activeItem.action_taken==="approve"?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`}>
                  <div className="flex items-center gap-2">
                    {activeItem.action_taken==="approve" ? <CheckCircle className="w-4 h-4 text-green-600"/> : <XCircle className="w-4 h-4 text-red-600"/>}
                    <span className="text-sm font-bold" style={{color:activeItem.action_taken==="approve"?"#16a34a":"#dc2626"}}>
                      {activeItem.action_taken==="approve"?"Approved":"Rejected"} by {profile?.full_name}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Reply / Action area */}
            {activeItem.status !== "actioned" && activeItem.status !== "archived" && tab==="inbox" && (
              <div className="bg-white border-t border-gray-200 p-4 space-y-3">
                <textarea value={replyText} onChange={e=>setReplyText(e.target.value)}
                  placeholder={activeItem.type==="forwarded_requisition"||activeItem.type==="approval"?"Add a note (optional)…":"Type your reply…"}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none" />
                <div className="flex items-center gap-2">
                  {/* Approve/Reject for forwarded items (admin/manager only) */}
                  {isAdmin && (activeItem.type==="forwarded_requisition"||activeItem.type==="forwarded_po"||activeItem.type==="approval") && (
                    <>
                      <button onClick={()=>approveAction("approve")} disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-all disabled:opacity-60">
                        <CheckCircle className="w-4 h-4" /> Approve
                      </button>
                      <button onClick={()=>approveAction("reject")} disabled={submitting}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
                        <XCircle className="w-4 h-4" /> Reject
                      </button>
                    </>
                  )}
                  <button onClick={sendReply} disabled={submitting||!replyText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 ml-auto">
                    <Send className="w-3.5 h-3.5" />
                    {submitting?"Sending…":"Send Reply"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
