/**
 * ProcurBosse — EmailPage v6.0 NUCLEAR
 * Gmail-style 3-column layout (Image 2 reference)
 * Left sidebar · Message list · Reading pane
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/theme";
import {
  Mail, Star, Clock, Send, FileText, Trash2, Archive, AlertCircle,
  Tag, ChevronDown, Search, Settings, RefreshCw, Edit3,
  Paperclip, Reply, Forward, MoreHorizontal, Check, X, Bell, Users,
  ChevronRight, Inbox,
} from "lucide-react";

const db = supabase as any;

interface EmailMsg {
  id: string;
  from_name: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  body_html?: string;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  attachments?: string[];
  thread_id?: string;
  folder: "inbox"|"sent"|"drafts"|"spam"|"trash"|"starred";
}

const FOLDERS = [
  { id:"inbox",   label:"Inbox",   icon:Inbox,    color:"#d83b01" },
  { id:"starred", label:"Starred", icon:Star,     color:"#c19c00" },
  { id:"sent",    label:"Sent",    icon:Send,     color:"#038387" },
  { id:"drafts",  label:"Drafts",  icon:FileText, color:"#7719aa" },
  { id:"spam",    label:"Spam",    icon:AlertCircle, color:"#a4262c" },
  { id:"trash",   label:"Trash",  icon:Trash2,   color:"#605e5c" },
];

const CATS = [
  { id:"social",    label:"Social",    icon:Users, color:"#0072c6", count:50 },
  { id:"promotion", label:"Promotion", icon:Tag,   color:"#498205", count:90 },
  { id:"updates",   label:"Updates",   icon:Bell,  color:"#7719aa", count:15 },
];

function ago(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff/60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins/60);
  if (hrs < 24) return `${hrs}h`;
  return new Date(d).toLocaleDateString("en-KE",{month:"short",day:"numeric"});
}

function initials(name: string) {
  return name.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
}

const AVATAR_COLORS = ["#0078d4","#7719aa","#038387","#498205","#d83b01","#0072c6","#b4009e"];
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0)%AVATAR_COLORS.length]; }

export default function EmailPage() {
  const { user } = useAuth();
  const [folder,  setFolder]  = useState("inbox");
  const [msgs,    setMsgs]    = useState<EmailMsg[]>([]);
  const [sel,     setSel]     = useState<EmailMsg|null>(null);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(false);
  const [compose, setCompose] = useState(false);
  const [compTo,  setCompTo]  = useState("");
  const [compSub, setCompSub] = useState("");
  const [compBody,setCompBody]= useState("");
  const [sending, setSending] = useState(false);
  const [tab,     setTab]     = useState("primary"); // primary/social/promotions
  const [counts,  setCounts]  = useState<Record<string,number>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = db.from("emails").select("*").order("created_at",{ascending:false}).limit(100);
      if (folder === "starred") q = q.eq("is_starred", true);
      else q = q.eq("folder", folder);
      if (search.trim()) q = q.ilike("subject", `%${search}%`);
      const { data } = await q;
      setMsgs(data || []);
    } catch {
      /* silently fail — show empty */
      setMsgs([]);
    } finally { setLoading(false); }
  }, [folder, search]);

  useEffect(() => { load(); }, [load]);

  /* Counts */
  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [inbox, unread] = await Promise.allSettled([
          db.from("emails").select("id",{count:"exact",head:true}).eq("folder","inbox"),
          db.from("emails").select("id",{count:"exact",head:true}).eq("folder","inbox").eq("is_read",false),
        ]);
        setCounts({
          inbox: inbox.status==="fulfilled" ? inbox.value?.count??0 : 0,
          unread: unread.status==="fulfilled" ? unread.value?.count??0 : 0,
        });
      } catch {}
    };
    loadCounts();
  }, [msgs]);

  const markRead = async (msg: EmailMsg) => {
    setSel(msg);
    if (!msg.is_read) {
      try { await db.from("emails").update({is_read:true}).eq("id",msg.id); setMsgs(m=>m.map(x=>x.id===msg.id?{...x,is_read:true}:x)); } catch {}
    }
  };

  const toggleStar = async (msg: EmailMsg, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await db.from("emails").update({is_starred:!msg.is_starred}).eq("id",msg.id);
      setMsgs(m=>m.map(x=>x.id===msg.id?{...x,is_starred:!x.is_starred}:x));
    } catch {}
  };

  const deleteMsg = async (msg: EmailMsg) => {
    try { await db.from("emails").update({folder:"trash"}).eq("id",msg.id); setSel(null); load(); } catch {}
  };

  const sendEmail = async () => {
    if (!compTo.trim()||!compSub.trim()) return;
    setSending(true);
    try {
      await db.from("emails").insert({
        from_name: user?.email?.split("@")[0] || "User",
        from_email: user?.email || "",
        to_email: compTo.trim(),
        subject: compSub.trim(),
        body: compBody,
        is_read: true,
        is_starred: false,
        folder: "sent",
        created_at: new Date().toISOString(),
      });
      setCompose(false); setCompTo(""); setCompSub(""); setCompBody("");
      if (folder==="sent") load();
    } catch { alert("Failed to send. Check your connection."); }
    finally { setSending(false); }
  };

  const filteredMsgs = msgs.filter(m => !search || m.subject?.toLowerCase().includes(search.toLowerCase()) || m.from_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)", background:T.bg, fontFamily:"'Segoe UI','Inter',system-ui,sans-serif", overflow:"hidden" }}>

      {/* LEFT SIDEBAR */}
      <div style={{ width:220, flexShrink:0, background:"#fff", borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Compose */}
        <div style={{ padding:"16px 16px 8px" }}>
          <button onClick={() => setCompose(true)} style={{ display:"flex", alignItems:"center", gap:8, background:T.primary, color:"#fff", border:"none", borderRadius:T.rMd, padding:"10px 18px", width:"100%", cursor:"pointer", fontSize:14, fontWeight:600, boxShadow:`0 2px 8px ${T.primary}44` }}>
            <Edit3 size={15} />
            Compose
          </button>
        </div>

        {/* Folders */}
        <div style={{ padding:"8px 8px 4px", overflow:"auto", flex:1 }}>
          {FOLDERS.map(f => (
            <button key={f.id} onClick={() => { setFolder(f.id); setSel(null); }}
              style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"8px 10px", borderRadius:T.r, border:"none", cursor:"pointer", fontSize:13, fontWeight: folder===f.id ? 700 : 400, background: folder===f.id ? T.primaryBg : "transparent", color: folder===f.id ? T.primary : T.fg, textAlign:"left", marginBottom:2 }}>
              <f.icon size={15} color={folder===f.id ? T.primary : f.color} />
              <span style={{ flex:1 }}>{f.label}</span>
              {f.id==="inbox" && counts.unread>0 && (
                <span style={{ background:"#d83b01", color:"#fff", fontSize:10, fontWeight:700, borderRadius:10, minWidth:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{counts.unread>99?"99+":counts.unread}</span>
              )}
            </button>
          ))}

          {/* Categories */}
          <div style={{ marginTop:8, paddingTop:8, borderTop:`1px solid ${T.border}` }}>
            <div style={{ fontSize:11, color:T.fgDim, fontWeight:600, padding:"0 10px 6px", textTransform:"uppercase", letterSpacing:".06em" }}>Categories</div>
            {CATS.map(c => (
              <button key={c.id} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"7px 10px", borderRadius:T.r, border:"none", cursor:"pointer", fontSize:13, background:"transparent", color:T.fg, textAlign:"left", marginBottom:2 }}>
                <c.icon size={14} color={c.color} />
                <span style={{ flex:1 }}>{c.label}</span>
                <span style={{ fontSize:11, color:T.fgMuted }}>{c.count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={{ padding:"8px 16px 12px", borderTop:`1px solid ${T.border}` }}>
          <button style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", color:T.fgMuted, fontSize:13, padding:"6px 0" }}>
            <Settings size={14} /> Settings
          </button>
        </div>
      </div>

      {/* MESSAGE LIST */}
      <div style={{ width:340, flexShrink:0, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", background:"#fff", overflow:"hidden" }}>
        {/* Search + tabs */}
        <div style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.rMd, padding:"7px 12px", marginBottom:8 }}>
            <Search size={14} color={T.fgMuted} />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search mail" style={{ border:"none", background:"none", outline:"none", fontSize:13, flex:1, color:T.fg }} />
          </div>
          {/* Gmail-style tabs */}
          <div style={{ display:"flex", gap:0, borderBottom:`2px solid ${T.border}` }}>
            {["primary","social","promotions"].map(t => (
              <button key={t} onClick={()=>setTab(t)} style={{
                flex:1, padding:"7px 4px", border:"none", background:"none", cursor:"pointer",
                fontSize:12, fontWeight: tab===t ? 700 : 400,
                color: tab===t ? T.primary : T.fgMuted,
                borderBottom: tab===t ? `2px solid ${T.primary}` : "2px solid transparent",
                marginBottom:-2, textTransform:"capitalize",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Select all + refresh */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px", borderBottom:`1px solid ${T.border}`, flexShrink:0 }}>
          <button style={{ display:"flex", alignItems:"center", gap:4, background:"none", border:"none", cursor:"pointer", color:T.fgMuted, fontSize:12 }}>
            <Check size={12} /> None <ChevronDown size={12} />
          </button>
          <div style={{ display:"flex", gap:4 }}>
            <button onClick={load} style={{ background:"none", border:"none", cursor:"pointer", color:T.fgMuted, padding:4 }}><RefreshCw size={13} /></button>
            <button style={{ background:"none", border:"none", cursor:"pointer", color:T.fgMuted, padding:4 }}><MoreHorizontal size={13} /></button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ overflow:"auto", flex:1 }}>
          {loading ? (
            <div style={{ padding:32, textAlign:"center", color:T.fgMuted }}>
              <RefreshCw size={20} style={{ animation:"spin .8s linear infinite", display:"inline-block" }} />
            </div>
          ) : filteredMsgs.length === 0 ? (
            <div style={{ padding:40, textAlign:"center", color:T.fgMuted }}>
              <Inbox size={40} style={{ margin:"0 auto 12px", display:"block", opacity:.3 }} />
              <div style={{ fontSize:14 }}>No messages in {folder}</div>
            </div>
          ) : filteredMsgs.map(m => (
            <div key={m.id} onClick={() => markRead(m)}
              style={{ padding:"10px 12px", borderBottom:`1px solid ${T.border}`, cursor:"pointer", background: sel?.id===m.id ? T.primaryBg : m.is_read ? "#fff" : "#f8f9fb", transition:"background .1s", display:"flex", gap:10 }}>
              {/* Avatar */}
              <div style={{ width:36, height:36, borderRadius:"50%", background:avatarColor(m.from_name||"U"), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:700, flexShrink:0 }}>
                {initials(m.from_name||m.from_email||"U")}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:13, fontWeight: m.is_read ? 500 : 700, color:T.fg, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:150 }}>
                    {m.from_name || m.from_email}
                  </span>
                  <span style={{ fontSize:11, color:T.fgDim, flexShrink:0, marginLeft:4 }}>{ago(m.created_at)}</span>
                </div>
                <div style={{ fontSize:13, fontWeight: m.is_read ? 400 : 600, color: m.is_read ? T.fgMuted : T.fg, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:3 }}>
                  {m.subject}
                </div>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, color:T.fgDim, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {m.body?.slice(0,60)}
                  </span>
                  <button onClick={e => toggleStar(m,e)} style={{ background:"none", border:"none", cursor:"pointer", padding:"0 2px", flexShrink:0 }}>
                    <Star size={13} fill={m.is_starred?"#c19c00":"none"} color={m.is_starred?"#c19c00":T.fgDim} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* READING PANE */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#fff", overflow:"hidden" }}>
        {sel ? (
          <>
            {/* Toolbar */}
            <div style={{ padding:"10px 20px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
              <button onClick={() => deleteMsg(sel)} style={{ display:"flex", alignItems:"center", gap:5, background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"5px 10px", cursor:"pointer", fontSize:12, color:T.fg }}>
                <Trash2 size={13} /> Delete
              </button>
              <button style={{ display:"flex", alignItems:"center", gap:5, background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"5px 10px", cursor:"pointer", fontSize:12, color:T.fg }}>
                <Archive size={13} /> Archive
              </button>
              <button onClick={() => setSel(null)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:T.fgMuted, padding:4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Message content */}
            <div style={{ flex:1, overflow:"auto", padding:"24px 28px" }}>
              {/* Date */}
              <div style={{ fontSize:11, color:T.fgDim, display:"flex", alignItems:"center", gap:6, marginBottom:16 }}>
                <Clock size={11} />
                {new Date(sel.created_at).toLocaleString("en-KE",{dateStyle:"full",timeStyle:"short"})}
              </div>

              {/* From */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:avatarColor(sel.from_name||"U"), display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:700 }}>
                    {initials(sel.from_name||sel.from_email||"U")}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:T.fg }}>{sel.from_name || "Unknown"}</div>
                    <div style={{ fontSize:12, color:T.fgMuted }}>{sel.from_email}</div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={() => toggleStar(sel,{stopPropagation:()=>{}} as any)} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"5px 8px", cursor:"pointer" }}>
                    <Star size={14} fill={sel.is_starred?"#c19c00":"none"} color={sel.is_starred?"#c19c00":T.fgMuted} />
                  </button>
                  <button style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"5px 8px", cursor:"pointer" }}>
                    <MoreHorizontal size={14} color={T.fgMuted} />
                  </button>
                </div>
              </div>

              {/* Subject */}
              <h2 style={{ margin:"0 0 20px", fontSize:20, fontWeight:700, color:T.fg }}>{sel.subject}</h2>

              {/* Body */}
              <div style={{ fontSize:14, color:T.fg, lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"inherit" }}>
                {sel.body_html
                  ? <div dangerouslySetInnerHTML={{ __html: sel.body_html }} />
                  : sel.body || "(No message body)"}
              </div>

              {/* Attachments */}
              {sel.attachments && sel.attachments.length > 0 && (
                <div style={{ marginTop:24, paddingTop:16, borderTop:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.fgMuted, marginBottom:10 }}>
                    <Paperclip size={12} style={{ marginRight:4 }} />
                    Attachments ({sel.attachments.length})
                  </div>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                    {sel.attachments.map((a,i) => (
                      <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:T.r, padding:"8px 14px", fontSize:13, color:T.fg, cursor:"pointer" }}>
                        📎 {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reply area */}
              <div style={{ marginTop:24, border:`1px solid ${T.border}`, borderRadius:T.rMd, padding:16, background:T.bg }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, color:T.fgMuted, fontSize:13 }}>
                  <Reply size={14} />
                  <span>Reply to <strong style={{color:T.fg}}>{sel.from_name || sel.from_email}</strong></span>
                </div>
                <textarea placeholder="Write your reply..." rows={4} style={{ width:"100%", border:`1px solid ${T.border}`, borderRadius:T.r, padding:"10px 12px", fontSize:13, resize:"vertical", background:"#fff", color:T.fg, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={() => { setCompose(true); setCompTo(sel.from_email); setCompSub(`Re: ${sel.subject}`); }}
                    style={{ background:T.primary, color:"#fff", border:"none", borderRadius:T.r, padding:"8px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                    <Reply size={13} style={{ marginRight:5 }} />Send Reply
                  </button>
                  <button style={{ background:T.bg, border:`1px solid ${T.border}`, color:T.fg, borderRadius:T.r, padding:"8px 14px", fontSize:13, cursor:"pointer" }}>
                    <Forward size={13} style={{ marginRight:5 }} />Forward
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:T.fgMuted }}>
            <Mail size={64} style={{ opacity:.15, marginBottom:16 }} />
            <div style={{ fontSize:16, fontWeight:600 }}>Select a message to read</div>
            <div style={{ fontSize:13, marginTop:8 }}>Your messages will appear here</div>
          </div>
        )}
      </div>

      {/* COMPOSE MODAL */}
      {compose && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:9999, display:"flex", alignItems:"flex-end", justifyContent:"flex-end", padding:20 }}>
          <div style={{ background:"#fff", borderRadius:T.rLg, boxShadow:"0 16px 64px rgba(0,0,0,0.25)", width:520, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            {/* Header */}
            <div style={{ background:T.fg, color:"#fff", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:14, fontWeight:600 }}>New Message</span>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>setCompose(false)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
              </div>
            </div>
            <div style={{ padding:16, display:"flex", flexDirection:"column", gap:0 }}>
              <input value={compTo} onChange={e=>setCompTo(e.target.value)} placeholder="To" style={{ border:"none", borderBottom:`1px solid ${T.border}`, padding:"8px 0", fontSize:13, outline:"none", width:"100%", marginBottom:4, color:T.fg }} />
              <input value={compSub} onChange={e=>setCompSub(e.target.value)} placeholder="Subject" style={{ border:"none", borderBottom:`1px solid ${T.border}`, padding:"8px 0", fontSize:13, outline:"none", width:"100%", marginBottom:8, color:T.fg }} />
              <textarea value={compBody} onChange={e=>setCompBody(e.target.value)} placeholder="Compose email..." rows={10} style={{ border:"none", resize:"none", fontSize:13, outline:"none", width:"100%", color:T.fg, fontFamily:"inherit", lineHeight:1.6 }} />
            </div>
            <div style={{ padding:"10px 16px", borderTop:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={sendEmail} disabled={sending} style={{ background:T.primary, color:"#fff", border:"none", borderRadius:T.r, padding:"9px 22px", fontSize:14, fontWeight:700, cursor:sending?"not-allowed":"pointer", opacity:sending?.65:1 }}>
                {sending ? "Sending..." : "Send"}
              </button>
              <button style={{ background:"none", border:"none", cursor:"pointer", color:T.fgMuted, padding:"8px" }}><Paperclip size={16} /></button>
              <button onClick={()=>setCompose(false)} style={{ marginLeft:"auto", background:"none", border:"none", cursor:"pointer", color:T.fgMuted }}><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
