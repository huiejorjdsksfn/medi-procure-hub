/**
 * ProcurBosse — Email Page v5.0
 * Gmail-style layout (Image 2) — sidebar + list + reading pane
 * Uses Supabase inbox_items + send-email edge function
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

interface EmailItem {
  id: string; subject: string; body: string; sender_name: string;
  sender_email: string; recipient_email: string; is_read: boolean;
  created_at: string; thread_id?: string; labels?: string[];
  attachments?: string[]; starred?: boolean; category?: string;
}

const CAT = ["Primary","Social","Promotions"];
const SIDEBAR = [
  { icon:"✉", label:"Inbox",    key:"inbox"   },
  { icon:"⭐", label:"Starred",  key:"starred" },
  { icon:"🕐", label:"Snoozed",  key:"snoozed" },
  { icon:"➤", label:"Sent",     key:"sent"    },
  { icon:"📝", label:"Drafts",   key:"drafts"  },
  { icon:"⚠", label:"Spam",     key:"spam"    },
];

export default function EmailPage() {
  const { user, profile } = useAuth();
  const [emails, setEmails]   = useState<EmailItem[]>([]);
  const [sel, setSel]         = useState<EmailItem|null>(null);
  const [cat, setCat]         = useState("Primary");
  const [fold, setFold]       = useState("inbox");
  const [compose, setCompose] = useState(false);
  const [loading, setLoading] = useState(false);
  const [to, setTo]           = useState("");
  const [subj, setSubj]       = useState("");
  const [body, setBody]       = useState("");
  const [reply, setReply]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from("inbox_items")
      .select("*")
      .or(`recipient_email.eq.${user?.email},sender_email.eq.${user?.email}`)
      .order("created_at",{ascending:false})
      .limit(50);
    setEmails(data||[]);
    setLoading(false);
  },[user?.email]);

  useEffect(()=>{ load(); },[load]);

  // Realtime
  useEffect(()=>{
    const ch = db.channel("email:inbox")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"inbox_items"},()=>load())
      .subscribe();
    return ()=>{ db.removeChannel(ch); };
  },[load]);

  const sendEmail = async () => {
    if (!to.trim()||!subj.trim()) { toast({title:"Fill in To and Subject",variant:"destructive"}); return; }
    try {
      await supabase.functions.invoke("send-email",{
        body:{ to, subject:subj, text:body, from_name:profile?.full_name||"EL5 MediProcure" }
      });
      await db.from("inbox_items").insert({
        subject:subj, body, sender_email:user?.email,
        sender_name:profile?.full_name||user?.email,
        recipient_email:to, is_read:true, created_at:new Date().toISOString(),
      });
      toast({title:"Email sent ✓"});
      setCompose(false); setTo(""); setSubj(""); setBody("");
      load();
    } catch(e:any){ toast({title:"Send failed",description:e.message,variant:"destructive"}); }
  };

  const sendReply = async () => {
    if (!sel||!reply.trim()) return;
    try {
      await supabase.functions.invoke("send-email",{
        body:{ to:sel.sender_email, subject:`Re: ${sel.subject}`, text:reply }
      });
      setReply(""); toast({title:"Reply sent ✓"});
    } catch {}
  };

  const markRead = async (id:string) => {
    await db.from("inbox_items").update({is_read:true}).eq("id",id);
    setEmails(prev=>prev.map(e=>e.id===id?{...e,is_read:true}:e));
  };

  const fmtDate = (d:string) => {
    const dt = new Date(d), now = new Date();
    if (dt.toDateString()===now.toDateString()) return dt.toLocaleTimeString("en-KE",{hour:"2-digit",minute:"2-digit"});
    return dt.toLocaleDateString("en-KE",{month:"short",day:"numeric"});
  };

  const unread = emails.filter(e=>!e.is_read&&e.recipient_email===user?.email).length;

  return (
    <div style={{ display:"flex", height:"calc(100vh - 52px)", background:"#f6f8fc", fontFamily:"'Segoe UI',system-ui,sans-serif", overflow:"hidden" }}>

      {/* Compose modal */}
      {compose && (
        <div style={{ position:"fixed", bottom:0, right:24, zIndex:999, width:520, background:"#fff", borderRadius:"12px 12px 0 0", boxShadow:"0 -4px 32px rgba(0,0,0,0.2)", overflow:"hidden" }}>
          <div style={{ background:"#202124", color:"#fff", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:14 }}>New Message</span>
            <button onClick={()=>setCompose(false)} style={{ background:"none", border:"none", color:"#fff", fontSize:18, cursor:"pointer" }}>×</button>
          </div>
          {[{label:"To",val:to,set:setTo},{label:"Subject",val:subj,set:setSubj}].map(f=>(
            <input key={f.label} value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.label}
              style={{ width:"100%", boxSizing:"border-box", padding:"8px 16px", border:"none", borderBottom:"1px solid #e8eaed", fontSize:13, outline:"none" }}/>
          ))}
          <textarea value={body} onChange={e=>setBody(e.target.value)} rows={8}
            style={{ width:"100%", boxSizing:"border-box", padding:"12px 16px", border:"none", fontSize:13, resize:"none", outline:"none" }}/>
          <div style={{ padding:"8px 16px", display:"flex", gap:8, borderTop:"1px solid #e8eaed" }}>
            <button onClick={sendEmail} style={{ background:"#1a73e8", color:"#fff", border:"none", borderRadius:20, padding:"8px 22px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Send</button>
            <button onClick={()=>setCompose(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#666" }}>Discard</button>
          </div>
        </div>
      )}

      {/* Left sidebar */}
      <div style={{ width:240, background:"#fff", borderRight:"1px solid #e8eaed", display:"flex", flexDirection:"column", flexShrink:0 }}>
        {/* Compose */}
        <div style={{ padding:"16px 16px 8px" }}>
          <button onClick={()=>setCompose(true)} style={{
            display:"flex", alignItems:"center", gap:10, padding:"14px 20px",
            background:"#fff", border:"none", borderRadius:24,
            boxShadow:"0 1px 3px rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.1)",
            cursor:"pointer", fontSize:14, fontWeight:600, color:"#202124",
            transition:"box-shadow 0.2s", width:"100%",
          }}>
            <span style={{ fontSize:20 }}>✚</span> Compose
          </button>
        </div>

        {/* Nav items */}
        {SIDEBAR.map(s=>(
          <button key={s.key} onClick={()=>setFold(s.key)}
            style={{ display:"flex", alignItems:"center", gap:14, padding:"8px 16px 8px 22px",
              background: fold===s.key?"#fce8e6":"none", border:"none", cursor:"pointer",
              borderRadius:fold===s.key?"0 20px 20px 0":"0",
              fontSize:13, fontWeight: fold===s.key?700:400, color: fold===s.key?"#c5221f":"#202124",
              textAlign:"left", width:"100%",
            }}>
            <span style={{ fontSize:16 }}>{s.icon}</span>
            {s.label}
            {s.key==="inbox"&&unread>0&&<span style={{ marginLeft:"auto", background:"#1a73e8", color:"#fff", borderRadius:10, padding:"1px 7px", fontSize:11, fontWeight:700 }}>{unread}</span>}
          </button>
        ))}

        {/* Categories */}
        <div style={{ padding:"16px 24px 8px", fontSize:11, fontWeight:700, color:"#444746", letterSpacing:"0.05em" }}>CATEGORIES</div>
        {[{icon:"👥",label:"Social",count:50},{icon:"🏷️",label:"Promotion",count:90},{icon:"ℹ️",label:"Updates",count:15}].map(c=>(
          <button key={c.label} style={{ display:"flex", alignItems:"center", gap:14, padding:"6px 16px 6px 22px", background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#202124", textAlign:"left", width:"100%" }}>
            <span>{c.icon}</span>{c.label}
            <span style={{ marginLeft:"auto", fontSize:12, color:"#444746" }}>{c.count}</span>
          </button>
        ))}
        <div style={{ marginTop:"auto", borderTop:"1px solid #e8eaed", padding:"12px 16px" }}>
          <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#444746", display:"flex", alignItems:"center", gap:10 }}>⚙ Setting</button>
          <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#444746", display:"flex", alignItems:"center", gap:10, marginTop:6 }}>❓ Help &amp; Feedback</button>
        </div>
      </div>

      {/* Email list */}
      <div style={{ width:360, borderRight:"1px solid #e8eaed", display:"flex", flexDirection:"column", background:"#fff", flexShrink:0 }}>
        {/* Category tabs */}
        <div style={{ display:"flex", borderBottom:"1px solid #e8eaed", padding:"0 12px" }}>
          {CAT.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{
              padding:"12px 16px", border:"none", background:"none", cursor:"pointer",
              fontSize:13, fontWeight: cat===c?700:400,
              color: cat===c?"#1a73e8":"#444746",
              borderBottom: cat===c?"2px solid #1a73e8":"2px solid transparent",
            }}>{c}</button>
          ))}
        </div>
        {/* Controls */}
        <div style={{ padding:"8px 16px", display:"flex", alignItems:"center", gap:8, borderBottom:"1px solid #e8eaed" }}>
          <input type="checkbox" style={{ accentColor:"#1a73e8" }}/>
          <span style={{ fontSize:12, color:"#444746" }}>None</span>
          <div style={{ marginLeft:"auto" }}><button onClick={load} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#444746" }}>⟳</button></div>
        </div>
        {/* List */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading && <div style={{ padding:24, textAlign:"center", color:"#666" }}>Loading…</div>}
          {!loading && emails.length===0 && <div style={{ padding:24, textAlign:"center", color:"#999" }}>No emails yet. Click Compose to send one.</div>}
          {emails.map(e=>(
            <div key={e.id} onClick={()=>{setSel(e);markRead(e.id);}}
              style={{
                display:"flex", alignItems:"flex-start", gap:10, padding:"10px 16px",
                cursor:"pointer", borderBottom:"1px solid #f1f3f4",
                background: sel?.id===e.id?"#e8f0fe": e.is_read?"#fff":"#f8f9fa",
                borderLeft: sel?.id===e.id?"3px solid #1a73e8":"3px solid transparent",
              }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:e.is_read?"#9aa0a6":"#1a73e8", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:13, fontWeight:700, flexShrink:0, marginTop:2 }}>
                {(e.sender_name||e.sender_email||"?")[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                  <span style={{ fontSize:13, fontWeight:e.is_read?400:700, color:"#202124", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.sender_name||e.sender_email}</span>
                  <span style={{ fontSize:11, color:"#444746", flexShrink:0, marginLeft:8 }}>{fmtDate(e.created_at)}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:e.is_read?400:600, color:"#202124", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.subject}</div>
                <div style={{ fontSize:12, color:"#444746", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.body?.replace(/<[^>]+>/g,"")?.slice(0,80)}</div>
              </div>
              <span style={{ cursor:"pointer", fontSize:16, color:"#fbbc04", flexShrink:0, marginTop:4 }}>☆</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reading pane */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", background:"#fff" }}>
        {!sel ? (
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12, color:"#444746" }}>
            <span style={{ fontSize:48 }}>✉</span>
            <div style={{ fontSize:16, fontWeight:600 }}>Select an email to read</div>
            <div style={{ fontSize:13 }}>Or compose a new message</div>
          </div>
        ) : (
          <>
            {/* Email header */}
            <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #e8eaed" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div style={{ fontSize:11, color:"#444746" }}>🕐 {new Date(sel.created_at).toLocaleString("en-KE")}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#444746" }}>☆</button>
                  <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#444746" }}>🗑</button>
                  <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#444746" }}>⋮</button>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"#1a73e8", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, fontWeight:700 }}>
                  {(sel.sender_name||sel.sender_email||"?")[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#202124" }}>{sel.sender_name||sel.sender_email}</div>
                  <div style={{ fontSize:12, color:"#444746" }}>{sel.sender_email}</div>
                </div>
              </div>
              <h2 style={{ fontSize:20, fontWeight:700, color:"#202124", margin:0 }}>{sel.subject}</h2>
            </div>

            {/* Body */}
            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px", fontSize:14, color:"#202124", lineHeight:1.7 }}>
              <div dangerouslySetInnerHTML={{__html: sel.body?.replace(/\n/g,"<br>")||""}}/>
            </div>

            {/* Reply */}
            <div style={{ padding:"12px 24px", borderTop:"1px solid #e8eaed" }}>
              <div style={{ border:"1px solid #e8eaed", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,0.1)" }}>
                <div style={{ padding:"10px 16px", borderBottom:"1px solid #f1f3f4", display:"flex", gap:8, alignItems:"center" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:"#1a73e8", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:12, fontWeight:700 }}>
                    {(profile?.full_name||user?.email||"?")[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize:12, color:"#444746" }}>← Replying to {sel.sender_name||sel.sender_email}</span>
                </div>
                <textarea value={reply} onChange={e=>setReply(e.target.value)} rows={3}
                  placeholder="Click here to reply…"
                  style={{ width:"100%", boxSizing:"border-box", padding:"12px 16px", border:"none", fontSize:13, resize:"none", outline:"none", fontFamily:"inherit" }}/>
                <div style={{ padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <button onClick={sendReply} style={{ background:"#1a73e8", color:"#fff", border:"none", borderRadius:20, padding:"8px 22px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Send</button>
                  <div style={{ display:"flex", gap:12, fontSize:18, color:"#444746" }}>
                    <span style={{ cursor:"pointer" }}>A</span>
                    <span style={{ cursor:"pointer" }}>📎</span>
                    <span style={{ cursor:"pointer" }}>🔗</span>
                    <span style={{ cursor:"pointer" }}>😊</span>
                    <span style={{ cursor:"pointer" }}>🗑</span>
                    <span style={{ cursor:"pointer" }}>⋮</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

