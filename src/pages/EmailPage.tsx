import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Mail, Send, RefreshCw, Plus, Trash2, X, Paperclip, Eye,
  Inbox, CheckCircle, Clock, AlertTriangle, Users, Search,
  Star, Archive, Reply, Forward, Download, Filter, ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";

const STATUS_CFG: Record<string,{bg:string,color:string}> = {
  sent:     {bg:"#dcfce7",color:"#15803d"},
  pending:  {bg:"#fef3c7",color:"#92400e"},
  failed:   {bg:"#fee2e2",color:"#dc2626"},
  draft:    {bg:"#f3f4f6",color:"#6b7280"},
};

const PRIORITY_CFG: Record<string,{bg:string,color:string}> = {
  urgent: {bg:"#fee2e2",color:"#dc2626"},
  high:   {bg:"#fef3c7",color:"#b45309"},
  normal: {bg:"#e0f2fe",color:"#0369a1"},
  low:    {bg:"#f3f4f6",color:"#6b7280"},
};

const MODULES = ["general","procurement","vouchers","inventory","quality","finance","reports","system"];

const TEMPLATES = [
  { id:"po_notice",    label:"Purchase Order Notice",   subject:"Purchase Order {ref} — Action Required",   body:"Dear {name},\n\nPlease find the attached Purchase Order {ref} for your review and approval.\n\nTotal Amount: KES {amount}\nDelivery Date: {date}\n\nKindly confirm receipt and processing timeline.\n\nRegards,\n{sender}\nProcurement Department\n{hospital}" },
  { id:"req_approved", label:"Requisition Approved",    subject:"Requisition {ref} Approved",                body:"Dear {name},\n\nYour requisition {ref} has been approved by management.\n\nApproved Amount: KES {amount}\nApproved By: {approver}\nDate: {date}\n\nProceeding to procurement.\n\nRegards,\n{sender}\nProcurement Department" },
  { id:"grn_notice",   label:"GRN Notification",        subject:"Goods Received — {ref}",                   body:"Dear {name},\n\nGoods for Order {ref} have been received and are undergoing inspection.\n\nReceived By: {receiver}\nDate: {date}\n\nYou will be notified upon inspection completion.\n\nRegards,\n{sender}\nWarehouse Department" },
  { id:"tender_invite",label:"Tender Invitation",       subject:"Invitation to Tender — {ref}",              body:"Dear {name},\n\nYou are cordially invited to submit a bid for Tender {ref}.\n\nTender Description: {description}\nClosing Date: {date}\nEstimated Value: KES {amount}\n\nPlease submit your bid before the closing date.\n\nRegards,\n{sender}\nProcurement Department\n{hospital}" },
  { id:"payment_done", label:"Payment Processed",       subject:"Payment Voucher {ref} Processed",           body:"Dear {name},\n\nPayment Voucher {ref} has been processed successfully.\n\nAmount: KES {amount}\nPayment Method: {method}\nDate: {date}\n\nPlease confirm receipt.\n\nRegards,\n{sender}\nFinance Department" },
  { id:"reminder",     label:"Action Reminder",         subject:"Reminder: {subject} — Action Required",     body:"Dear {name},\n\nThis is a friendly reminder regarding {subject}.\n\nPlease take the necessary action at your earliest convenience.\n\nIf you have any questions, do not hesitate to contact us.\n\nRegards,\n{sender}" },
];

function ComposeModal({ onClose, onSent, profiles }: { onClose:()=>void; onSent:()=>void; profiles:any[] }) {
  const { user, profile } = useAuth();
  const [to, setTo]         = useState<string[]>([]);
  const [toInput, setToInput] = useState("");
  const [cc, setCc]         = useState("");
  const [bcc, setBcc]       = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody]     = useState("");
  const [priority, setPriority] = useState("normal");
  const [module, setModule] = useState("general");
  const [template, setTemplate] = useState("");
  const [sending, setSending]   = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);

  const applyTemplate = (tid: string) => {
    const t = TEMPLATES.find(x=>x.id===tid);
    if (!t) return;
    setSubject(t.subject.replace(/{[^}]+}/g,v=>`[${v.slice(1,-1)}]`));
    setBody(t.body.replace(/{hospital}/g, profile?.department||"Hospital").replace(/{sender}/g, profile?.full_name||"Staff"));
    setTemplate(tid);
  };

  const addTo = (email: string) => {
    const e = email.trim();
    if (e && !to.includes(e)) setTo(p=>[...p,e]);
    setToInput(""); setShowProfiles(false);
  };

  const send = async () => {
    if (to.length===0) { toast({title:"Add at least one recipient",variant:"destructive"}); return; }
    if (!subject.trim()) { toast({title:"Subject is required",variant:"destructive"}); return; }
    setSending(true);
    try {
      // Insert notification record
      const { data: notif, error: ne } = await (supabase as any).from("notifications").insert({
        sender_id: user?.id,
        subject, body,
        module,
        priority,
        send_email: true,
      }).select().single();
      if (ne) throw ne;

      // Insert recipients
      const recipients = to.map(email => {
        const p = profiles.find(x=>x.email===email);
        return { notification_id: notif.id, recipient_id: p?.id||null, recipient_email: email, recipient_name: p?.full_name||email };
      });
      await (supabase as any).from("notification_recipients").insert(recipients);

      // Also insert into inbox_items for each recipient
      for (const rec of recipients) {
        if (rec.recipient_id) {
          await (supabase as any).from("inbox_items").insert({
            type: "message", subject, body, from_user_id: user?.id, to_user_id: rec.recipient_id,
            priority, status: "unread",
          });
        }
      }

      toast({title:"Email sent ✓", description:`To ${to.length} recipient(s)`});
      onSent(); onClose();
    } catch(e:any) { toast({title:"Send failed",description:e.message,variant:"destructive"}); }
    setSending(false);
  };

  const filtered = toInput.length>=1 ? profiles.filter(p=>(p.email||"").includes(toInput)||(p.full_name||"").toLowerCase().includes(toInput.toLowerCase())) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col overflow-hidden" style={{maxHeight:"92vh"}}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{background:"linear-gradient(90deg,#1a3a6b,#0369a1)"}}>
          <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-white"/><span className="font-black text-sm text-white">New Email</span></div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70"><X className="w-4 h-4"/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {/* Template */}
          <div className="flex items-center gap-2">
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",width:60}}>Template</label>
            <select value={template} onChange={e=>applyTemplate(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl text-sm outline-none border border-gray-200 bg-gray-50">
              <option value="">— Select template —</option>
              {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>

          {/* To */}
          <div>
            <div className="flex items-start gap-2">
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",paddingTop:8,width:60}}>To</label>
              <div className="flex-1 relative">
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-gray-200 bg-white min-h-[38px]"
                  onClick={()=>document.getElementById("toInput")?.focus()}>
                  {to.map(email=>(
                    <span key={email} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{background:"#dbeafe",color:"#1d4ed8"}}>
                      {email}<button onClick={()=>setTo(p=>p.filter(e=>e!==email))}><X className="w-2.5 h-2.5"/></button>
                    </span>
                  ))}
                  <input id="toInput" value={toInput} onChange={e=>{setToInput(e.target.value);setShowProfiles(true);}}
                    onKeyDown={e=>{if(e.key==="Enter"||e.key===","){addTo(toInput);e.preventDefault();}}}
                    placeholder={to.length===0?"Email or name — press Enter to add":""}
                    className="flex-1 outline-none text-sm min-w-[120px]" style={{minWidth:120}}/>
                </div>
                {showProfiles && filtered.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 bg-white rounded-xl shadow-lg border border-gray-100 max-h-40 overflow-auto mt-1">
                    {filtered.slice(0,8).map(p=>(
                      <button key={p.id} onClick={()=>addTo(p.email||"")}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-blue-50 text-sm">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">{(p.full_name||"?")[0]}</div>
                        <div><p className="font-medium text-gray-800 text-xs">{p.full_name}</p><p className="text-gray-400 text-[10px]">{p.email}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={()=>setShowCcBcc(v=>!v)} className="px-3 py-1.5 rounded-xl text-xs text-gray-500 hover:bg-gray-100 whitespace-nowrap mt-0.5">CC/BCC</button>
            </div>
          </div>

          {showCcBcc && (
            <>
              <div className="flex items-center gap-2">
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",width:60}}>CC</label>
                <input value={cc} onChange={e=>setCc(e.target.value)} placeholder="cc@example.com" className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border border-gray-200"/>
              </div>
              <div className="flex items-center gap-2">
                <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",width:60}}>BCC</label>
                <input value={bcc} onChange={e=>setBcc(e.target.value)} placeholder="bcc@example.com" className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border border-gray-200"/>
              </div>
            </>
          )}

          {/* Subject */}
          <div className="flex items-center gap-2">
            <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",width:60}}>Subject</label>
            <input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Subject…"
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none border border-gray-200"/>
          </div>

          {/* Priority + Module */}
          <div className="flex gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",width:60}}>Priority</label>
              <select value={priority} onChange={e=>setPriority(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl text-sm outline-none border border-gray-200 bg-gray-50">
                <option value="low">Low</option><option value="normal">Normal</option>
                <option value="high">High</option><option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase",width:60}}>Module</label>
              <select value={module} onChange={e=>setModule(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl text-sm outline-none border border-gray-200 bg-gray-50">
                {MODULES.map(m=><option key={m} value={m} className="capitalize">{m}</option>)}
              </select>
            </div>
          </div>

          {/* Body */}
          <div>
            <label className="block mb-1" style={{fontSize:10,fontWeight:700,color:"#6b7280",textTransform:"uppercase"}}>Message</label>
            <textarea value={body} onChange={e=>setBody(e.target.value)} rows={10} placeholder="Compose your message…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none border border-gray-200 resize-none"
              style={{fontFamily:"'Segoe UI',system-ui",lineHeight:1.6}}/>
          </div>
        </div>

        <div className="px-5 py-3 border-t flex items-center gap-2">
          <button onClick={send} disabled={sending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold"
            style={{background:sending?"#6b7280":"#1a3a6b"}}>
            {sending?<RefreshCw className="w-3.5 h-3.5 animate-spin"/>:<Send className="w-3.5 h-3.5"/>}
            {sending?"Sending…":"Send Email"}
          </button>
          <div className="flex items-center gap-1.5 ml-2">
            {to.length>0&&<span style={{fontSize:11,color:"#9ca3af"}}>{to.length} recipient{to.length>1?"s":""}</span>}
            {priority!=="normal"&&<span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={PRIORITY_CFG[priority]}>{priority}</span>}
          </div>
          <button onClick={onClose} className="ml-auto px-4 py-2 rounded-xl border text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function EmailPage() {
  const { user, profile } = useAuth();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sent"|"inbox"|"notifications">("inbox");
  const [search, setSearch] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [priorityFilter, setPriorityFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [sentRes, inboxRes, profRes] = await Promise.all([
      (supabase as any).from("notifications").select("*,notification_recipients(*)").eq("sender_id", user?.id).order("created_at",{ascending:false}).limit(50),
      (supabase as any).from("inbox_items").select("*").eq("to_user_id", user?.id).order("created_at",{ascending:false}).limit(100),
      (supabase as any).from("profiles").select("id,full_name,email,department").order("full_name"),
    ]);
    setMsgs(sentRes.data||[]);
    setInbox(inboxRes.data||[]);
    setProfiles(profRes.data||[]);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  // Realtime for inbox
  useEffect(()=>{
    const ch = (supabase as any).channel("email-inbox-rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items",filter:`to_user_id=eq.${user?.id}`},()=>load())
      .subscribe();
    return ()=>{supabase.removeChannel(ch);};
  },[user?.id]);

  const markRead = async (id: string) => {
    await (supabase as any).from("inbox_items").update({status:"read"}).eq("id",id);
    load();
  };

  const deleteMsg = async (id: string, table: string) => {
    await (supabase as any).from(table).delete().eq("id",id);
    toast({title:"Deleted"}); load(); if(selected?.id===id) setSelected(null);
  };

  const exportAll = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(inbox.map(m=>({
      Subject:m.subject, From:m.from_user_id, Body:m.body, Priority:m.priority, Status:m.status, Date:m.created_at
    })));
    XLSX.utils.book_append_sheet(wb,ws,"Inbox");
    XLSX.writeFile(wb,`inbox_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast({title:"Exported"});
  };

  const unread = inbox.filter(m=>m.status==="unread").length;
  const curList = tab==="inbox" ? inbox : tab==="sent" ? msgs : [];
  const filtered = curList.filter(m=>{
    const matchSearch = !search || (m.subject||"").toLowerCase().includes(search.toLowerCase()) || (m.body||"").toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter==="all" || m.priority===priorityFilter;
    return matchSearch && matchPriority;
  });

  return (
    <div className="flex h-[calc(100vh-90px)]" style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* Sidebar */}
      <div className="w-48 shrink-0 flex flex-col" style={{background:"#1a1a2e",borderRight:"1px solid #2e2e4e"}}>
        <div className="p-3 border-b" style={{borderColor:"#2e2e4e"}}>
          <button onClick={()=>setShowCompose(true)}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-sm font-bold text-white"
            style={{background:"linear-gradient(90deg,#1a3a6b,#0369a1)"}}>
            <Plus className="w-4 h-4"/> Compose
          </button>
        </div>
        {[
          {id:"inbox",         label:"Inbox",          icon:Inbox,      badge:unread},
          {id:"sent",          label:"Sent",           icon:Send,       badge:0},
          {id:"notifications", label:"Notifications",  icon:CheckCircle,badge:0},
        ].map(({id,label,icon:Icon,badge})=>(
          <button key={id} onClick={()=>{setTab(id as any);setSelected(null);}}
            className="flex items-center gap-2.5 px-3 py-2 w-full text-left hover:bg-white/5 transition-all"
            style={{background:tab===id?"rgba(255,255,255,0.08)":"transparent"}}>
            <Icon className="w-3.5 h-3.5 shrink-0" style={{color:tab===id?"#60a5fa":"#64748b"}}/>
            <span style={{fontSize:11,color:tab===id?"#e2e8f0":"#94a3b8",fontWeight:tab===id?700:400,flex:1}}>{label}</span>
            {badge>0&&<span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">{badge>9?"9+":badge}</span>}
          </button>
        ))}
        <div className="mt-auto p-3 border-t" style={{borderColor:"#2e2e4e"}}>
          <div style={{fontSize:9,color:"#475569"}}>{profile?.full_name}</div>
          <div style={{fontSize:9,color:"#22c55e"}}>● Online</div>
        </div>
      </div>

      {/* Message list */}
      <div className="w-72 shrink-0 flex flex-col border-r" style={{background:"#f8fafc",borderColor:"#e5e7eb"}}>
        {/* Toolbar */}
        <div className="px-3 py-2.5 border-b" style={{borderColor:"#e5e7eb"}}>
          <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                className="w-full pl-6 pr-2 py-1.5 rounded-xl text-xs outline-none border border-gray-200"/>
            </div>
            <button onClick={load} disabled={loading} className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100">
              <RefreshCw className={`w-3 h-3 text-gray-500 ${loading?"animate-spin":""}`}/>
            </button>
            <button onClick={exportAll} className="p-1.5 rounded-xl border border-gray-200 hover:bg-gray-100" title="Export">
              <Download className="w-3 h-3 text-gray-500"/>
            </button>
          </div>
          <div className="flex gap-1">
            {["all","urgent","high","normal","low"].map(p=>(
              <button key={p} onClick={()=>setPriorityFilter(p)}
                className="flex-1 py-0.5 rounded-lg text-[9px] font-bold capitalize transition-all"
                style={{background:priorityFilter===p?"#1a3a6b":"#f3f4f6",color:priorityFilter===p?"#fff":"#6b7280"}}>
                {p}
              </button>
            ))}
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading?<div className="flex items-center justify-center py-8"><RefreshCw className="w-4 h-4 animate-spin text-gray-300"/></div>:
          filtered.length===0?<div className="px-4 py-8 text-center text-xs text-gray-400">No messages</div>:
          filtered.map(msg=>{
            const isUnread = msg.status==="unread";
            const pc = PRIORITY_CFG[msg.priority]||PRIORITY_CFG.normal;
            return (
              <div key={msg.id} onClick={()=>{setSelected(msg);if(isUnread&&tab==="inbox")markRead(msg.id);}}
                className="px-3 py-2.5 border-b cursor-pointer hover:bg-white transition-all"
                style={{borderColor:"#f3f4f6",background:selected?.id===msg.id?"#eff6ff":isUnread?"#fff":"#f8fafc"}}>
                <div className="flex items-center justify-between mb-0.5">
                  <span style={{fontSize:11,fontWeight:isUnread?800:600,color:"#1a1a2e"}} className="truncate flex-1">{msg.subject||"(No subject)"}</span>
                  <span style={{fontSize:9,color:"#9ca3af",whiteSpace:"nowrap",marginLeft:4}}>{new Date(msg.created_at).toLocaleDateString("en-KE",{month:"short",day:"2-digit"})}</span>
                </div>
                <p className="text-[10px] text-gray-400 truncate">{msg.body?.slice(0,60)||""}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={pc}>{msg.priority}</span>
                  {isUnread&&<span className="w-1.5 h-1.5 rounded-full bg-blue-500"/>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Message viewer */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{background:"#fff"}}>
        {!selected?(
          <div className="flex-1 flex flex-col items-center justify-center" style={{background:"#f8fafc"}}>
            <Mail className="w-16 h-16 text-gray-200 mb-4"/>
            <p className="text-gray-400 text-sm font-semibold">Select a message to read</p>
            <p className="text-gray-300 text-xs mt-1">Or compose a new email</p>
            <button onClick={()=>setShowCompose(true)}
              className="mt-4 flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold"
              style={{background:"linear-gradient(90deg,#1a3a6b,#0369a1)"}}>
              <Plus className="w-4 h-4"/>Compose New Email
            </button>
          </div>
        ):(
          <>
            <div className="px-5 py-3 border-b flex items-center gap-3" style={{borderColor:"#f3f4f6"}}>
              <div className="flex-1">
                <h2 className="font-bold text-gray-800">{selected.subject||"(No subject)"}</h2>
                <p className="text-xs text-gray-400">
                  {tab==="inbox"?"From: Colleague":""} · {new Date(selected.created_at).toLocaleString("en-KE")}
                  {" · "}<span className="font-semibold" style={{color:PRIORITY_CFG[selected.priority]?.color||"#6b7280"}}>{selected.priority} priority</span>
                </p>
              </div>
              <div className="flex gap-1.5">
                {tab==="inbox"&&(
                  <button onClick={()=>{setShowCompose(true);}} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"#e0f2fe",color:"#0369a1"}}>
                    <Reply className="w-3 h-3"/>Reply
                  </button>
                )}
                <button onClick={()=>deleteMsg(selected.id, tab==="inbox"?"inbox_items":"notifications")}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{background:"#fee2e2",color:"#dc2626"}}>
                  <Trash2 className="w-3 h-3"/>Delete
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <div className="max-w-2xl">
                <div className="p-4 rounded-2xl mb-4" style={{background:"#f8fafc",border:"1px solid #e5e7eb"}}>
                  {[
                    {l:"Module",   v:selected.module||selected.type||"general"},
                    {l:"Priority", v:selected.priority||"normal"},
                    {l:"Status",   v:selected.status||"—"},
                  ].map(({l,v})=>(
                    <div key={l} className="flex gap-4 text-xs">
                      <span className="w-16 text-gray-400 font-semibold">{l}:</span>
                      <span className="text-gray-700 font-medium capitalize">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap"
                  style={{fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
                  {selected.body||"(No content)"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showCompose&&<ComposeModal onClose={()=>setShowCompose(false)} onSent={load} profiles={profiles}/>}
    </div>
  );
}
