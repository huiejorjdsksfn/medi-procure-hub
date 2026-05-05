import { r as reactExports, j as jsxRuntimeExports, s as PenLine, x as Users, ad as CheckCheck, R as RefreshCw, d as Search, z as Mail, ae as Star, h as TriangleAlert, af as Reply, ag as Forward, y as Archive, w as Trash2, ah as Send, ai as Inbox, X } from "./react-vendor-CySSbiQ5.js";
import { s as supabase, u as useAuth, t as toast } from "./pages-admin-tba3xNhl.js";
async function sendNotification(payload) {
  try {
    const row = {
      title: payload.title,
      message: payload.message,
      type: payload.type || "info",
      module: payload.module || "system",
      action_url: payload.actionUrl || null,
      is_read: false,
      sender_id: payload.senderId || null,
      status: "delivered"
    };
    if (payload.userId) row.user_id = payload.userId;
    const { error } = await supabase.from("notifications").insert(row);
    if (error) console.error("Notification insert failed:", error.message);
  } catch (e) {
    console.error("sendNotification error:", e);
  }
}
async function notifyProcurement(payload) {
  try {
    const { data: roles } = await supabase.from("user_roles").select("user_id,role").in("role", ["admin", "procurement_manager"]).limit(30);
    if (!roles?.length) return;
    const unique = [...new Set(roles.map((r) => r.user_id))];
    await Promise.all(unique.map((uid) => sendNotification({ ...payload, userId: uid })));
  } catch (e) {
    console.error("notifyProcurement error:", e);
  }
}
const PRI = {
  urgent: { bg: "#fee2e2", color: "#dc2626", label: "Urgent" },
  high: { bg: "#fef3c7", color: "#b45309", label: "High" },
  normal: { bg: "#dbeafe", color: "#1d4ed8", label: "Normal" },
  low: { bg: "#f3f4f6", color: "#6b7280", label: "Low" }
};
const FOLDERS = [
  { id: "inbox", label: "Inbox", icon: Inbox, color: "#0078d4" },
  { id: "sent", label: "Sent", icon: Send, color: "#107c10" },
  { id: "starred", label: "Starred", icon: Star, color: "#f59e0b" },
  { id: "archived", label: "Archived", icon: Archive, color: "#9ca3af" }
];
const TEMPLATES = [
  {
    id: "po",
    label: "Purchase Order Notice",
    subject: "Purchase Order {{REF}} — Action Required",
    body: "Dear {{NAME}},\n\nPlease find the attached Purchase Order {{REF}} for your review and approval.\n\nTotal Amount: KES {{AMOUNT}}\nDelivery Date: {{DATE}}\nSupplier: {{SUPPLIER}}\n\nKindly confirm receipt and provide the expected processing timeline.\n\nBest regards,\n{{SENDER}}\nProcurement Department\nEmbu Level 5 Hospital"
  },
  {
    id: "req",
    label: "Requisition Approved",
    subject: "Requisition {{REF}} — Approved",
    body: "Dear {{NAME}},\n\nYour requisition {{REF}} has been reviewed and approved by management.\n\nApproved Amount: KES {{AMOUNT}}\nApproved By: {{APPROVER}}\nDate: {{DATE}}\n\nKindly proceed with the next steps.\n\nBest regards,\n{{SENDER}}"
  },
  {
    id: "grn",
    label: "Goods Received Notice",
    subject: "Goods Received — LPO {{REF}}",
    body: "Dear {{NAME}},\n\nGoods for Order {{REF}} have been received at the stores and are undergoing inspection.\n\nReceived By: {{RECEIVER}}\nDate: {{DATE}}\nCondition: {{CONDITION}}\n\nPlease confirm for further processing.\n\nBest regards,\n{{SENDER}}"
  },
  {
    id: "tender",
    label: "Tender Invitation",
    subject: "Invitation to Tender — {{REF}}",
    body: "Dear {{NAME}},\n\nYou are hereby invited to submit a bid for Tender {{REF}}.\n\nTitle: {{TENDER_TITLE}}\nClosing Date: {{DATE}}\nEstimated Value: KES {{AMOUNT}}\n\nBidding documents are available from the Procurement Office.\nKindly submit sealed bids before the closing date.\n\nBest regards,\n{{SENDER}}\nHead of Procurement"
  },
  {
    id: "pay",
    label: "Payment Processed",
    subject: "Payment Notification — {{REF}}",
    body: "Dear {{NAME}},\n\nPayment {{REF}} has been processed and authorized.\n\nAmount: KES {{AMOUNT}}\nDate: {{DATE}}\nPayment Mode: {{MODE}}\n\nPlease confirm receipt at your earliest convenience.\n\nBest regards,\n{{SENDER}}"
  },
  {
    id: "remind",
    label: "Action Reminder",
    subject: "Reminder: {{SUBJECT}} — Action Required",
    body: "Dear {{NAME}},\n\nThis is a polite reminder regarding {{SUBJECT}}.\n\nDeadline: {{DATE}}\n\nPlease take the necessary action at your earliest convenience. If you require any clarification, do not hesitate to contact the Procurement Department.\n\nBest regards,\n{{SENDER}}"
  },
  {
    id: "meeting",
    label: "Meeting Invitation",
    subject: "Meeting Invitation — {{SUBJECT}}",
    body: "Dear {{NAME}},\n\nYou are invited to attend a meeting as follows:\n\nSubject: {{SUBJECT}}\nDate: {{DATE}}\nTime: {{TIME}}\nVenue: {{VENUE}}\nAgenda: {{AGENDA}}\n\nKindly confirm your attendance.\n\nBest regards,\n{{SENDER}}"
  }
];
function ComposeModal({ onClose, onSent, profiles, user, profile }) {
  const [to, setTo] = reactExports.useState([]);
  const [toInput, setToInput] = reactExports.useState("");
  const [subject, setSubject] = reactExports.useState("");
  const [body, setBody] = reactExports.useState("");
  const [priority, setPriority] = reactExports.useState("normal");
  const [template, setTemplate] = reactExports.useState("");
  const [sending, setSending] = reactExports.useState(false);
  const [showDrop, setShowDrop] = reactExports.useState(false);
  const dropRef = reactExports.useRef(null);
  const applyTemplate = (tid) => {
    const t = TEMPLATES.find((x) => x.id === tid);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body.replace(/\{\{SENDER\}\}/g, profile?.full_name || "Procurement Staff"));
    setTemplate(tid);
  };
  const addRecipient = (p) => {
    if (!to.find((x) => x.id === p.id)) setTo((prev) => [...prev, { id: p.id, name: p.full_name, email: p.email }]);
    setToInput("");
    setShowDrop(false);
  };
  const suggestions = toInput.length > 0 ? profiles.filter(
    (p) => p.id !== user?.id && !to.find((x) => x.id === p.id) && ((p.full_name || "").toLowerCase().includes(toInput.toLowerCase()) || (p.email || "").toLowerCase().includes(toInput.toLowerCase()))
  ).slice(0, 7) : [];
  const send = async () => {
    if (!to.length) {
      toast({ title: "Add at least one recipient", variant: "destructive" });
      return;
    }
    if (!subject.trim()) {
      toast({ title: "Subject is required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      for (const r of to) {
        const { error } = await supabase.from("inbox_items").insert({
          type: "email",
          subject,
          body,
          from_user_id: user?.id,
          to_user_id: r.id,
          priority,
          status: "unread",
          record_type: "email"
        });
        if (error) throw error;
        await sendNotification({
          userId: r.id,
          title: `New email: ${subject.slice(0, 60)}`,
          message: `From ${profile?.full_name || "Staff"}: ${body.slice(0, 100)}`,
          type: "email",
          module: "Email",
          actionUrl: "/inbox",
          senderId: user?.id
        });
      }
      await supabase.from("inbox_items").insert({
        type: "email",
        subject,
        body,
        from_user_id: user?.id,
        to_user_id: user?.id,
        priority,
        status: "sent",
        record_type: "email"
      });
      toast({ title: "✓ Email sent", description: `To: ${to.map((x) => x.name).join(", ")}` });
      onSent();
      onClose();
    } catch (e) {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff", borderRadius: 12, width: "min(640px,100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 72px rgba(0,0,0,0.28)" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "13px 16px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", borderRadius: "12px 12px 0 0", display: "flex", alignItems: "center", gap: 10 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { style: { width: 15, height: 15, color: "#fff" } }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 14, fontWeight: 800, color: "#fff", flex: 1 }, children: "Compose New Email" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, style: { background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 6, padding: "4px 7px", cursor: "pointer", color: "#fff", lineHeight: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 13, height: 13 } }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "#9ca3af", whiteSpace: "nowrap" }, children: "TEMPLATE" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: template,
            onChange: (e) => applyTemplate(e.target.value),
            style: { flex: 1, fontSize: 12, padding: "6px 10px", border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", background: "#f9fafb", color: "#374151" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "— Select a template —" }),
              TEMPLATES.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.id, children: t.label }, t.id))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative" }, ref: dropRef, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "To" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: { border: "1px solid #e5e7eb", borderRadius: 7, padding: "6px 10px", background: "#f9fafb", display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center", minHeight: 42, cursor: "text" },
            onClick: () => document.getElementById("to-inp")?.focus(),
            children: [
              to.map((r) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, background: "#1a3a6b", color: "#fff", padding: "3px 9px", borderRadius: 5, fontSize: 12, fontWeight: 600 }, children: [
                r.name,
                /* @__PURE__ */ jsxRuntimeExports.jsx(X, { style: { width: 10, height: 10, cursor: "pointer", opacity: 0.7 }, onClick: () => setTo((p) => p.filter((x) => x.id !== r.id)) })
              ] }, r.id)),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "input",
                {
                  id: "to-inp",
                  value: toInput,
                  onChange: (e) => {
                    setToInput(e.target.value);
                    setShowDrop(e.target.value.length > 0);
                  },
                  onKeyDown: (e) => {
                    if (e.key === "Escape") {
                      setToInput("");
                      setShowDrop(false);
                    }
                  },
                  placeholder: to.length === 0 ? "Search by name or email…" : "",
                  style: { flex: 1, minWidth: 160, border: "none", outline: "none", background: "transparent", fontSize: 13, padding: "2px 0" }
                }
              )
            ]
          }
        ),
        showDrop && suggestions.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 3, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 200, maxHeight: 220, overflowY: "auto" }, children: suggestions.map((p) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => addRecipient(p),
            style: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 14px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" },
            onMouseEnter: (e) => e.currentTarget.style.background = "#f9fafb",
            onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#1a3a6b,#0078d4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, color: "#fff", fontWeight: 700 }, children: (p.full_name || "?")[0] }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#111827" }, children: p.full_name }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af" }, children: [
                  p.email,
                  p.department ? ` · ${p.department}` : ""
                ] })
              ] })
            ]
          },
          p.id
        )) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Subject" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: subject,
              onChange: (e) => setSubject(e.target.value),
              placeholder: "Email subject…",
              style: { width: "100%", padding: "9px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Priority" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "select",
            {
              value: priority,
              onChange: (e) => setPriority(e.target.value),
              style: { padding: "9px 12px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", background: `${PRI[priority]?.bg}`, color: PRI[priority]?.color, fontWeight: 700 },
              children: Object.entries(PRI).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v.label }, k))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Message" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: body,
            onChange: (e) => setBody(e.target.value),
            rows: 11,
            placeholder: "Write your message…",
            style: { width: "100%", padding: "11px 13px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", fontFamily: "'Inter',sans-serif", lineHeight: 1.75, resize: "vertical" }
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af", textAlign: "right" }, children: [
        body.length,
        " characters"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "10px 16px", borderTop: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: send,
          disabled: sending || !to.length || !subject,
          style: { display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 3px 10px rgba(26,58,107,0.3)", opacity: sending || !to.length || !subject ? 0.7 : 1 },
          children: [
            sending ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 13, height: 13 }, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { style: { width: 13, height: 13 } }),
            sending ? "Sending…" : "Send Email"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: onClose, style: { padding: "9px 16px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer", fontSize: 13, color: "#374151" }, children: "Discard" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: "auto", fontSize: 11, color: "#9ca3af", fontWeight: 600 }, children: [
        to.length,
        " recipient",
        to.length !== 1 ? "s" : ""
      ] })
    ] })
  ] }) });
}
function EmailPage() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("procurement_manager");
  const [folder, setFolder] = reactExports.useState("inbox");
  const [emails, setEmails] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(true);
  const [selected, setSelected] = reactExports.useState(null);
  const [search, setSearch] = reactExports.useState("");
  const [compose, setCompose] = reactExports.useState(false);
  const [profiles, setProfiles] = reactExports.useState([]);
  const [unread, setUnread] = reactExports.useState(0);
  const [replying, setReplying] = reactExports.useState(false);
  const [replyBody, setReplyBody] = reactExports.useState("");
  const [sending, setSending] = reactExports.useState(false);
  const [starring, setStarring] = reactExports.useState(false);
  const [priFilter, setPriFilter] = reactExports.useState("all");
  const loadEmails = reactExports.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from("inbox_items").select("*,from_profile:profiles!from_user_id(full_name,email),to_profile:profiles!to_user_id(full_name,email)").order("created_at", { ascending: false }).limit(150);
    if (folder === "inbox") q = q.eq("to_user_id", user.id).not("status", "eq", "sent").not("status", "eq", "archived");
    else if (folder === "sent") q = q.eq("from_user_id", user.id).eq("status", "sent");
    else if (folder === "starred") q = q.eq("to_user_id", user.id).eq("is_starred", true);
    else if (folder === "archived") q = q.eq("to_user_id", user.id).eq("status", "archived");
    else if (folder === "all") q = supabase.from("inbox_items").select("*,from_profile:profiles!from_user_id(full_name,email),to_profile:profiles!to_user_id(full_name,email)").order("created_at", { ascending: false }).limit(300);
    const { data } = await q;
    const enriched = (data || []).map((e) => ({
      ...e,
      from_name: e.from_profile?.full_name || e.from_name || "System",
      to_name: e.to_profile?.full_name || e.to_name || ""
    }));
    setEmails(enriched);
    const { count } = await supabase.from("inbox_items").select("id", { count: "exact", head: true }).eq("to_user_id", user.id).eq("status", "unread");
    setUnread(count || 0);
    setLoading(false);
  }, [folder, user, isAdmin]);
  reactExports.useEffect(() => {
    supabase.from("profiles").select("id,full_name,email,department").order("full_name").limit(300).then(({ data }) => setProfiles(data || []));
  }, []);
  reactExports.useEffect(() => {
    loadEmails();
  }, [loadEmails]);
  reactExports.useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`email-rt-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "inbox_items" }, loadEmails).subscribe();
    return () => supabase.removeChannel(ch);
  }, [loadEmails, user]);
  const markRead = async (id) => {
    await supabase.from("inbox_items").update({ status: "read" }).eq("id", id);
    setEmails((p) => p.map((e) => e.id === id ? { ...e, status: "read" } : e));
    setUnread((p) => Math.max(0, p - 1));
  };
  const toggleStar = async (id, current) => {
    setStarring(true);
    await supabase.from("inbox_items").update({ is_starred: !current }).eq("id", id);
    setEmails((p) => p.map((e) => e.id === id ? { ...e, is_starred: !current } : e));
    if (selected?.id === id) setSelected((p) => p ? { ...p, is_starred: !current } : p);
    setStarring(false);
  };
  const archiveEmail = async (id) => {
    await supabase.from("inbox_items").update({ status: "archived" }).eq("id", id);
    toast({ title: "Archived" });
    setSelected(null);
    loadEmails();
  };
  const deleteEmail = async (id) => {
    if (!confirm("Permanently delete this email?")) return;
    await supabase.from("inbox_items").delete().eq("id", id);
    toast({ title: "Deleted" });
    setSelected(null);
    loadEmails();
  };
  const markAllRead = async () => {
    await supabase.from("inbox_items").update({ status: "read" }).eq("to_user_id", user?.id).eq("status", "unread");
    toast({ title: "All marked as read" });
    loadEmails();
  };
  const sendReply = async () => {
    if (!replyBody.trim() || !selected) return;
    setSending(true);
    const { error } = await supabase.from("inbox_items").insert({
      type: "email",
      subject: `Re: ${selected.subject}`,
      body: replyBody,
      from_user_id: user?.id,
      to_user_id: selected.from_user_id,
      priority: "normal",
      status: "unread",
      record_type: "email"
    });
    if (error) {
      toast({ title: "Reply failed", description: error.message, variant: "destructive" });
      setSending(false);
      return;
    }
    await sendNotification({
      userId: selected.from_user_id,
      title: `Reply: ${selected.subject.slice(0, 60)}`,
      message: `${profile?.full_name || "Staff"} replied: ${replyBody.slice(0, 80)}`,
      type: "email",
      module: "Email",
      actionUrl: "/inbox",
      senderId: user?.id
    });
    await supabase.from("inbox_items").insert({
      type: "email",
      subject: `Re: ${selected.subject}`,
      body: replyBody,
      from_user_id: user?.id,
      to_user_id: user?.id,
      priority: "normal",
      status: "sent",
      record_type: "email"
    });
    toast({ title: "Reply sent ✓" });
    setReplying(false);
    setReplyBody("");
    setSending(false);
  };
  const filtered = emails.filter((e) => {
    const textMatch = !search || [e.subject, e.from_name, e.to_name, e.body].some((v) => String(v || "").toLowerCase().includes(search.toLowerCase()));
    const priMatch = priFilter === "all" || e.priority === priFilter;
    return textMatch && priMatch;
  });
  const folderMeta = FOLDERS.find((f) => f.id === folder) || FOLDERS[0];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", height: "calc(100vh - 82px)", fontFamily: "'Inter','Segoe UI',sans-serif", background: "#f0f2f5" }, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 220, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "12px 12px 8px", borderBottom: "1px solid #f3f4f6" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setCompose(true),
          style: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 3px 10px rgba(26,58,107,0.25)" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { style: { width: 14, height: 14 } }),
            " Compose"
          ]
        }
      ) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "6px 0" }, children: [
        FOLDERS.map((f) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            onClick: () => {
              setFolder(f.id);
              setSelected(null);
              setReplying(false);
            },
            style: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", border: "none", cursor: "pointer", textAlign: "left", background: folder === f.id ? `${f.color}10` : "transparent", borderLeft: folder === f.id ? `3px solid ${f.color}` : "3px solid transparent", transition: "all 0.1s" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(f.icon, { style: { width: 14, height: 14, color: folder === f.id ? f.color : "#9ca3af" } }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: folder === f.id ? 700 : 500, color: folder === f.id ? f.color : "#374151", flex: 1 }, children: f.label }),
              f.id === "inbox" && unread > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { background: f.color, color: "#fff", fontSize: 10, fontWeight: 800, padding: "1px 7px", borderRadius: 10, minWidth: 20, textAlign: "center" }, children: unread })
            ]
          },
          f.id
        )),
        isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { margin: "8px 14px", borderTop: "1px solid #f3f4f6" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "4px 14px", fontSize: 10, fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase" }, children: "ADMIN VIEW" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                setFolder("all");
                setSelected(null);
              },
              style: { display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", border: "none", cursor: "pointer", textAlign: "left", background: folder === "all" ? "#1a3a6b10" : "transparent", borderLeft: folder === "all" ? "3px solid #1a3a6b" : "3px solid transparent" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { style: { width: 14, height: 14, color: folder === "all" ? "#1a3a6b" : "#9ca3af" } }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: folder === "all" ? 700 : 500, color: folder === "all" ? "#1a3a6b" : "#374151" }, children: "All Messages" })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "8px 14px", borderTop: "1px solid #f3f4f6", background: "#f9fafb", fontSize: 10, color: "#9ca3af" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600 }, children: "EL5 MediProcure" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 9, color: "#d1d5db" }, children: "Embu Level 5 Hospital" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { width: 320, background: "#fff", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "9px 12px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: 700, color: "#111827", flex: 1 }, children: folderMeta.label }),
        unread > 0 && folder === "inbox" && /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: markAllRead, style: { fontSize: 10, fontWeight: 700, color: "#1d4ed8", background: "#dbeafe", border: "none", padding: "2px 8px", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCheck, { style: { width: 10, height: 10 } }),
          " All read"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: loadEmails, style: { background: "transparent", border: "none", cursor: "pointer", color: "#9ca3af", lineHeight: 0, padding: 4 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 }, className: loading ? "animate-spin" : "" }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "7px 10px", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 6, flexShrink: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, position: "relative" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", width: 11, height: 11, color: "#9ca3af" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              value: search,
              onChange: (e) => setSearch(e.target.value),
              placeholder: "Search…",
              style: { width: "100%", paddingLeft: 26, padding: "7px 10px 7px 26px", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", background: "#f9fafb" }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: priFilter,
            onChange: (e) => setPriFilter(e.target.value),
            style: { fontSize: 11, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, outline: "none", background: "#f9fafb", color: "#374151" },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All" }),
              Object.entries(PRI).map(([k, v]) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: k, children: v.label }, k))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, overflowY: "auto" }, children: loading ? [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "11px 12px", borderBottom: "1px solid #f9fafb", display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 32, height: 32, borderRadius: "50%", background: "#f3f4f6", flexShrink: 0 }, className: "animate-pulse" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 11, background: "#f3f4f6", borderRadius: 4, marginBottom: 5, width: "65%" }, className: "animate-pulse" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { height: 9, background: "#f3f4f6", borderRadius: 4, width: "45%" }, className: "animate-pulse" })
        ] })
      ] }, i)) : filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: 32, textAlign: "center", color: "#9ca3af", fontSize: 13 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { style: { width: 32, height: 32, color: "#e5e7eb", margin: "0 auto 10px" } }),
        "No emails found"
      ] }) : filtered.map((email) => {
        const isUnread = email.status === "unread";
        const isActive = selected?.id === email.id;
        const name = folder === "sent" ? email.to_name || "Recipient" : email.from_name || "System";
        const initial = name[0]?.toUpperCase() || "?";
        const pc = PRI[email.priority || "normal"];
        return /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            onClick: () => {
              setSelected(email);
              setReplying(false);
              if (isUnread) markRead(email.id);
            },
            style: { padding: "10px 12px", borderBottom: "1px solid #f9fafb", cursor: "pointer", transition: "background 0.1s", background: isActive ? "#eff6ff" : isUnread ? "#fafcff" : "transparent", borderLeft: isActive ? "3px solid #1a3a6b" : isUnread ? "3px solid #60a5fa" : "3px solid transparent", display: "flex", gap: 9, alignItems: "flex-start" },
            onMouseEnter: (e) => {
              if (!isActive) e.currentTarget.style.background = "#f9fafb";
            },
            onMouseLeave: (e) => {
              if (!isActive) e.currentTarget.style.background = isUnread ? "#fafcff" : "transparent";
            },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 32, height: 32, borderRadius: "50%", background: isUnread ? "linear-gradient(135deg,#1a3a6b,#0078d4)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, fontWeight: 700, color: isUnread ? "#fff" : "#6b7280" }, children: initial }) }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 4, marginBottom: 2 }, children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, fontWeight: isUnread ? 700 : 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }, children: name }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", flexShrink: 0 }, children: new Date(email.created_at).toLocaleDateString("en-KE", { month: "short", day: "2-digit" }) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, fontWeight: isUnread ? 600 : 400, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }, children: email.subject || "(no subject)" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: (email.body || "").replace(/\n/g, " ").slice(0, 55) }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 5, marginTop: 4, alignItems: "center" }, children: [
                  email.priority && email.priority !== "normal" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: pc.bg, color: pc.color }, children: pc.label }),
                  email.is_starred && /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { style: { width: 10, height: 10, color: "#f59e0b", fill: "#f59e0b" } }),
                  isUnread && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 9, fontWeight: 700, color: "#0078d4", background: "#dbeafe", padding: "1px 5px", borderRadius: 3 }, children: "NEW" })
                ] })
              ] })
            ]
          },
          email.id
        );
      }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" }, children: selected ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "13px 18px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 17, fontWeight: 800, color: "#111827", lineHeight: 1.3, marginBottom: 5 }, children: selected.subject || "(no subject)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#6b7280", display: "flex", gap: 10, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "From: ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#374151" }, children: selected.from_name })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "·" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              "To: ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#374151" }, children: selected.to_name || "You" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { color: "#9ca3af" }, children: new Date(selected.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) })
          ] }),
          selected.priority && selected.priority !== "normal" && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5, ...PRI[selected.priority] }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { style: { width: 11, height: 11 } }),
            PRI[selected.priority].label,
            " Priority"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => toggleStar(selected.id, !!selected.is_starred),
              style: { padding: "6px 9px", background: selected.is_starred ? "#fef3c7" : "#f3f4f6", border: `1px solid ${selected.is_starred ? "#fde68a" : "#e5e7eb"}`, borderRadius: 6, cursor: "pointer", lineHeight: 0 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Star, { style: { width: 13, height: 13, color: selected.is_starred ? "#f59e0b" : "#9ca3af", fill: selected.is_starred ? "#f59e0b" : "none" } })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                setReplying((r) => !r);
                setReplyBody("");
              },
              style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", background: replying ? "#1a3a6b" : "#f3f4f6", border: `1px solid ${replying ? "#1a3a6b" : "#e5e7eb"}`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 700, color: replying ? "#fff" : "#374151" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Reply, { style: { width: 13, height: 13 } }),
                " Reply"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => {
                setCompose(true);
              },
              style: { display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#374151" },
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Forward, { style: { width: 13, height: 13 } }),
                " Forward"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => archiveEmail(selected.id),
              style: { padding: "6px 9px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, cursor: "pointer", lineHeight: 0 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Archive, { style: { width: 13, height: 13, color: "#9ca3af" } })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => deleteEmail(selected.id),
              style: { padding: "6px 9px", background: "#fee2e2", border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer", lineHeight: 0 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { style: { width: 13, height: 13, color: "#dc2626" } })
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, padding: "22px 26px", overflowY: "auto" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { style: { fontFamily: "'Inter','Segoe UI',sans-serif", fontSize: 14, lineHeight: 1.85, color: "#374151", whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }, children: selected.body }),
        selected.reply_body && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginTop: 24, paddingTop: 16, borderTop: "1px dashed #e5e7eb" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Reply, { style: { width: 11, height: 11 } }),
            " Previous reply · ",
            selected.replied_at && new Date(selected.replied_at).toLocaleDateString("en-KE")
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("pre", { style: { fontFamily: "'Inter',sans-serif", fontSize: 13, lineHeight: 1.75, color: "#6b7280", whiteSpace: "pre-wrap", background: "#f9fafb", padding: "12px 16px", borderRadius: 8, borderLeft: "3px solid #e5e7eb" }, children: selected.reply_body })
        ] })
      ] }),
      replying && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { borderTop: "2px solid #e5e7eb", padding: "14px 18px", background: "#f9fafb", flexShrink: 0 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Reply, { style: { width: 13, height: 13, color: "#1a3a6b" } }),
          " Reply to ",
          selected.from_name
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            value: replyBody,
            onChange: (e) => setReplyBody(e.target.value),
            rows: 5,
            placeholder: "Write your reply…",
            style: { width: "100%", padding: "10px 12px", fontSize: 13, border: "1px solid #e5e7eb", borderRadius: 7, outline: "none", fontFamily: "'Inter',sans-serif", lineHeight: 1.7, resize: "none" }
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 7, marginTop: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: sendReply,
              disabled: sending || !replyBody.trim(),
              style: { display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: sending || !replyBody.trim() ? 0.7 : 1 },
              children: [
                sending ? /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12 }, className: "animate-spin" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { style: { width: 12, height: 12 } }),
                " Send Reply"
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => {
                setReplying(false);
                setReplyBody("");
              },
              style: { padding: "8px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 7, cursor: "pointer", fontSize: 13, color: "#6b7280" },
              children: "Cancel"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { marginLeft: "auto", fontSize: 11, color: "#9ca3af", alignSelf: "center" }, children: [
            replyBody.length,
            " chars"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "5px 18px", background: "#f9fafb", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", flexShrink: 0, fontSize: 10, color: "#d1d5db" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "Embu Level 5 Hospital · EL5 MediProcure" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
          "ID:",
          selected.id?.slice(0, 8),
          " · ",
          selected.status
        ] })
      ] })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: "#9ca3af" }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 72, height: 72, borderRadius: 18, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Mail, { style: { width: 32, height: 32, color: "#d1d5db" } }) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 16, fontWeight: 700, color: "#374151" }, children: "Select an email" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, color: "#9ca3af", marginTop: 4 }, children: "Click any message to read it" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          onClick: () => setCompose(true),
          style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", background: "linear-gradient(135deg,#0a2558,#1a3a6b)", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 800, boxShadow: "0 3px 12px rgba(26,58,107,0.28)" },
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(PenLine, { style: { width: 14, height: 14 } }),
            " Compose New Email"
          ]
        }
      )
    ] }) }),
    compose && /* @__PURE__ */ jsxRuntimeExports.jsx(ComposeModal, { onClose: () => setCompose(false), onSent: loadEmails, profiles, user, profile })
  ] });
}
const db$3 = supabase;
function fmt254(phone) {
  const n = phone.replace(/\D/g, "");
  if (n.startsWith("0")) return "+254" + n.slice(1);
  if (n.startsWith("254")) return "+" + n;
  if (n.startsWith("+")) return phone;
  return "+254" + n;
}
const SMSAPI = {
  /** Load messages + templates + conversations in parallel */
  async loadAll() {
    const [msgs, templates, convos, bulk] = await Promise.all([
      db$3.from("reception_messages").select("*").order("created_at", { ascending: false }).limit(200),
      db$3.from("sms_templates").select("*").eq("is_active", true).order("category"),
      db$3.from("sms_conversations").select("*").order("last_message_at", { ascending: false }).limit(50),
      db$3.from("sms_bulk_operations").select("*").order("created_at", { ascending: false }).limit(20)
    ]);
    return { messages: msgs.data || [], templates: templates.data || [], conversations: convos.data || [], bulkOps: bulk.data || [] };
  },
  async send(phone, body, opts) {
    const to = fmt254(phone);
    const channel = opts?.type === "whatsapp" ? "whatsapp" : "sms";
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: { to, message: body, channel, recipient_name: opts?.name, department: opts?.dept }
    });
    return { ok: !error && (data?.ok ?? true), error: error?.message || data?.results?.[0]?.error };
  },
  async sendBulk(phones, body, opts) {
    const { data: bulkOp } = await db$3.from("sms_bulk_operations").insert({ body, recipients_count: phones.length, successful_count: 0, failed_count: 0, status: "running", started_at: (/* @__PURE__ */ new Date()).toISOString(), template_id: opts?.templateId || null }).select().single();
    let ok = 0, failed = 0;
    for (let i = 0; i < phones.length; i += 5) {
      const chunk = phones.slice(i, i + 5);
      const results = await Promise.all(chunk.map((p) => SMSAPI.send(p, body, opts)));
      ok += results.filter((r) => r.ok).length;
      failed += results.filter((r) => !r.ok).length;
      if (i + 5 < phones.length) await new Promise((r) => setTimeout(r, 200));
    }
    if (bulkOp) await db$3.from("sms_bulk_operations").update({ successful_count: ok, failed_count: failed, status: "completed", completed_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", bulkOp.id);
    return { total: phones.length, ok, failed };
  },
  renderTemplate(template, vars) {
    return template.content.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
  },
  async createTemplate(t) {
    const { data, error } = await db$3.from("sms_templates").insert({ ...t, use_count: 0, is_active: true }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async updateTemplate(id, t) {
    await db$3.from("sms_templates").update(t).eq("id", id);
  },
  async deleteTemplate(id) {
    await db$3.from("sms_templates").update({ is_active: false }).eq("id", id);
  },
  async getConversationMessages(phone) {
    const { data } = await db$3.from("reception_messages").select("*").eq("recipient_phone", fmt254(phone)).order("created_at", { ascending: true }).limit(100);
    return data || [];
  },
  async assignConversation(id, userId, dept) {
    await db$3.from("sms_conversations").update({ assigned_to: userId, department: dept, status: "assigned" }).eq("id", id);
  },
  async closeConversation(id) {
    await db$3.from("sms_conversations").update({ status: "closed" }).eq("id", id);
  },
  async getMetrics(days = 7) {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const { data } = await db$3.from("reception_messages").select("status,message_type,direction,segments").gte("created_at", since);
    const msgs = data || [];
    return {
      total: msgs.length,
      sent: msgs.filter((m) => m.direction === "outbound").length,
      received: msgs.filter((m) => m.direction === "inbound").length,
      failed: msgs.filter((m) => m.status === "failed").length,
      delivered: msgs.filter((m) => m.status === "delivered").length,
      whatsapp: msgs.filter((m) => m.message_type === "whatsapp").length,
      sms: msgs.filter((m) => m.message_type === "sms").length
    };
  }
};
const db$2 = supabase;
const STATUS_C$1 = { sent: "#22c55e", delivered: "#3b82f6", failed: "#ef4444", pending: "#f97316", received: "#8b5cf6", queued: "#f59e0b" };
const fmtDate$1 = (s) => new Date(s).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
const card$1 = { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const inp$1 = { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#374151" };
const btn$1 = (bg, disabled = false) => ({ padding: "9px 18px", background: disabled ? "#9ca3af" : bg, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" });
function Chip$1({ label, color }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: color + "18", color, border: `1px solid ${color}33`, textTransform: "uppercase" }, children: label });
}
const DEPTS = ["All", "Procurement", "Finance", "Inventory", "Pharmacy", "Maternity", "Casualty", "Laboratory", "Administration", "ICT", "HR"];
const TEMPLATES_PRESETS = [
  { name: "Visitor Arrival", content: "Hello {{host_name}}, your visitor {{visitor_name}} has arrived at Embu Level 5 Hospital reception. Please proceed to reception. Time: {{time}}", variables: ["host_name", "visitor_name", "time"], category: "notification" },
  { name: "Appointment Reminder", content: "Reminder: Appointment at EL5 Hospital on {{date}} at {{time}} with {{host_name}}, {{department}}. Please bring your national ID.", variables: ["date", "time", "host_name", "department"], category: "appointment" },
  { name: "Low Stock Alert", content: "STOCK ALERT: {{item_name}} is critically low ({{current}} {{unit}}). Reorder level: {{reorder}}. Please initiate procurement urgently. EL5 Inventory.", variables: ["item_name", "current", "unit", "reorder"], category: "alert" },
  { name: "Requisition Approved", content: "Your requisition {{req_id}} has been APPROVED by {{approver}}. It will proceed to PO generation. EL5 MediProcure.", variables: ["req_id", "approver"], category: "procurement" },
  { name: "Payment Processed", content: "Payment of KES {{amount}} to {{payee}} (Voucher {{voucher_id}}) has been processed. Ref: {{reference}}. EL5 Finance.", variables: ["amount", "payee", "voucher_id", "reference"], category: "finance" }
];
function SMSPage() {
  useAuth();
  const [tab, setTab] = reactExports.useState("compose");
  const [messages, setMessages] = reactExports.useState([]);
  const [templates, setTemplates] = reactExports.useState([]);
  const [conversations, setConversations] = reactExports.useState([]);
  const [bulkOps, setBulkOps] = reactExports.useState([]);
  const [metrics, setMetrics] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [to, setTo] = reactExports.useState("");
  const [body, setBody] = reactExports.useState("");
  const [msgType, setMsgType] = reactExports.useState("sms");
  const [dept, setDept] = reactExports.useState("");
  const [name, setName] = reactExports.useState("");
  const [sending, setSending] = reactExports.useState(false);
  const [selectedTemplate, setSelectedTemplate] = reactExports.useState("");
  const [bulkRecipients, setBulkRecipients] = reactExports.useState("");
  const [bulkBody, setBulkBody] = reactExports.useState("");
  const [bulkName, setBulkName] = reactExports.useState("");
  const [bulkSending, setBulkSending] = reactExports.useState(false);
  const [bulkProgress, setBulkProgress] = reactExports.useState(null);
  const [editTpl, setEditTpl] = reactExports.useState(null);
  const [savingTpl, setSavingTpl] = reactExports.useState(false);
  const [activeCon, setActiveCon] = reactExports.useState(null);
  const [conMessages, setConMessages] = reactExports.useState([]);
  const [replyMsg, setReplyMsg] = reactExports.useState("");
  const [replySending, setReplySending] = reactExports.useState(false);
  const [search, setSearch] = reactExports.useState("");
  const [localToast, setLocalToast] = reactExports.useState("");
  const conEndRef = reactExports.useRef(null);
  const showToast = (msg) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(""), 3e3);
  };
  const loadAll = reactExports.useCallback(async () => {
    setLoading(true);
    const [data, m] = await Promise.all([SMSAPI.loadAll(), SMSAPI.getMetrics(7)]);
    setMessages(data.messages);
    setTemplates(data.templates);
    setConversations(data.conversations);
    setBulkOps(data.bulkOps);
    setMetrics(m);
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    loadAll();
  }, [loadAll]);
  reactExports.useEffect(() => {
    const ch = db$2.channel("sms_rt").on("postgres_changes", { event: "*", schema: "public", table: "reception_messages" }, loadAll).on("postgres_changes", { event: "*", schema: "public", table: "sms_conversations" }, loadAll).subscribe();
    return () => db$2.removeChannel(ch);
  }, [loadAll]);
  reactExports.useEffect(() => {
    conEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conMessages]);
  async function sendSMS() {
    if (!to.trim() || !body.trim()) {
      showToast("- Enter recipient and message");
      return;
    }
    setSending(true);
    const { ok, error } = await SMSAPI.send(to, body, { name, dept, type: msgType });
    setSending(false);
    if (ok) {
      showToast("- Message sent!");
      setTo("");
      setBody("");
      setName("");
      loadAll();
    } else showToast(`- Failed: ${error}`);
  }
  async function sendBulk() {
    const phones = bulkRecipients.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
    if (!phones.length || !bulkBody.trim()) {
      showToast("- Enter recipients and message");
      return;
    }
    setBulkSending(true);
    setBulkProgress({ ok: 0, failed: 0, total: phones.length });
    const res = await SMSAPI.sendBulk(phones, bulkBody, { name: bulkName });
    setBulkSending(false);
    setBulkProgress(res);
    showToast(`- Bulk done: ${res.ok} sent, ${res.failed} failed`);
    setBulkRecipients("");
    setBulkBody("");
    loadAll();
  }
  async function applyTemplate(id) {
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setBody(tpl.content);
      setSelectedTemplate(id);
      showToast(`- Template applied: ${tpl.name}`);
    }
  }
  async function saveTpl() {
    if (!editTpl?.name || !editTpl?.content) {
      showToast("- Name and content required");
      return;
    }
    setSavingTpl(true);
    if (editTpl.id) {
      await SMSAPI.updateTemplate(editTpl.id, editTpl);
    } else {
      await SMSAPI.createTemplate(editTpl);
    }
    setSavingTpl(false);
    setEditTpl(null);
    showToast("- Template saved!");
    loadAll();
  }
  async function openConversation(con) {
    setActiveCon(con);
    const msgs = await SMSAPI.getConversationMessages(con.phone_number);
    setConMessages(msgs);
  }
  async function sendReply() {
    if (!activeCon || !replyMsg.trim()) return;
    setReplySending(true);
    await SMSAPI.send(activeCon.phone_number, replyMsg, { name: activeCon.contact_name || void 0 });
    setReplyMsg("");
    setReplySending(false);
    const msgs = await SMSAPI.getConversationMessages(activeCon.phone_number);
    setConMessages(msgs);
    loadAll();
  }
  const filteredMsgs = messages.filter((m) => !search || (m.recipient_phone || "").includes(search) || (m.recipient_name || "").toLowerCase().includes(search.toLowerCase()) || (m.message_body || "").toLowerCase().includes(search.toLowerCase()));
  const TABS = [
    { id: "compose", label: "Compose", icon: "-" },
    { id: "history", label: "History", icon: "-" },
    { id: "conversations", label: "Conversations", icon: "-" },
    { id: "templates", label: "Templates", icon: "-" },
    { id: "bulk", label: "Bulk Send", icon: "-" },
    { id: "metrics", label: "Metrics", icon: "-" }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1400, margin: "0 auto" }, children: [
    localToast && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", top: 20, right: 20, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }, children: localToast }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }, children: "SMS & Messaging" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "EL5H - +16812972643 (SMS) - +14155238886 (WhatsApp) - Twilio MG2fffc3a-" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "5px 12px", borderRadius: 20, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 11, fontWeight: 700, color: "#059669" }, children: "- Twilio Active" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: loadAll, style: { ...btn$1("#64748b"), padding: "7px 14px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12, display: "inline", marginRight: 4 } }),
          "Refresh"
        ] })
      ] })
    ] }),
    metrics && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 12, marginBottom: 20 }, children: [
      { label: "Total (7d)", value: metrics.total, color: "#6b7280", icon: "-" },
      { label: "Sent", value: metrics.sent, color: "#22c55e", icon: "-" },
      { label: "Received", value: metrics.received, color: "#3b82f6", icon: "-" },
      { label: "Failed", value: metrics.failed, color: "#ef4444", icon: "-" },
      { label: "WhatsApp", value: metrics.whatsapp, color: "#25D366", icon: "-" },
      { label: "Delivered", value: metrics.delivered, color: "#0891b2", icon: "-" }
    ].map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { ...card$1, padding: "12px 14px", borderLeft: `4px solid ${k.color}` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 20, fontWeight: 800, color: "#0f172a" }, children: loading ? "-" : k.value }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 18 }, children: k.icon })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 3 }, children: k.label })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", overflowX: "auto", flexWrap: "nowrap" }, children: TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setTab(t.id), style: { padding: "9px 16px", borderRadius: "8px 8px 0 0", fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", background: tab === t.id ? "#7c3aed" : "transparent", color: tab === t.id ? "#fff" : "#6b7280", border: tab === t.id ? "1.5px solid #7c3aed" : "1.5px solid transparent" }, children: [
      t.icon,
      " ",
      t.label,
      t.id === "conversations" && conversations.filter((c) => c.unread_count > 0).length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }, children: conversations.filter((c) => c.unread_count > 0).length })
    ] }, t.id)) }),
    tab === "compose" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 20 }, children: "- New Message" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 6, marginBottom: 14 }, children: ["sms", "whatsapp"].map((ch) => /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setMsgType(ch), style: { flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: msgType === ch ? 700 : 500, border: `1.5px solid ${ch === "whatsapp" ? "#25D366" : "#7c3aed"}`, background: msgType === ch ? ch === "whatsapp" ? "#25D36615" : "#7c3aed15" : "transparent", color: ch === "whatsapp" ? "#25D366" : "#7c3aed", cursor: "pointer" }, children: ch === "whatsapp" ? "- WhatsApp" : "- SMS" }, ch)) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Recipient Name" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: name, onChange: (e) => setName(e.target.value), style: inp$1, placeholder: "John Doe" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Phone *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: to, onChange: (e) => setTo(e.target.value), style: inp$1, placeholder: "+254700000000" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Department" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: dept, onChange: (e) => setDept(e.target.value), style: inp$1, children: DEPTS.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: d === "All" ? "" : d, children: d }, d)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Apply Template" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: selectedTemplate, onChange: (e) => applyTemplate(e.target.value), style: inp$1, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "- Select Template -" }),
              templates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: t.id, children: t.name }, t.id))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Message *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: body, onChange: (e) => setBody(e.target.value), style: { ...inp$1, height: 120, resize: "vertical" }, placeholder: "Type your message here-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginTop: 4 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "#9ca3af" }, children: [
              body.length,
              "/1600 chars - ",
              Math.ceil(body.length / 160) || 1,
              " segment",
              Math.ceil(body.length / 160) > 1 ? "s" : ""
            ] }),
            body && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setBody(""), style: { fontSize: 11, color: "#9ca3af", background: "none", border: "none", cursor: "pointer" }, children: "Clear" })
          ] })
        ] }),
        msgType === "whatsapp" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#fff9ed", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#92400e" }, children: [
          "- Recipient must first send ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { children: "join bad-machine" }),
          " to +14155238886 to activate WhatsApp sandbox."
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: sendSMS, disabled: sending || !to || !body, style: { ...btn$1(sending || !to || !body ? "#9ca3af" : msgType === "whatsapp" ? "#25D366" : "#7c3aed"), width: "100%", fontSize: 14, padding: "12px" }, children: sending ? "Sending-" : `${msgType === "whatsapp" ? "-" : "-"} Send ${msgType === "sms" ? "SMS" : "WhatsApp"}` })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Quick Templates" }),
        templates.slice(0, 6).map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            style: { padding: "12px", borderRadius: 10, border: "1.5px solid #f1f5f9", marginBottom: 8, background: "#fafafa", cursor: "pointer" },
            onClick: () => applyTemplate(t.id),
            onMouseEnter: (e) => e.currentTarget.style.border = "1.5px solid #7c3aed30",
            onMouseLeave: (e) => e.currentTarget.style.border = "1.5px solid #f1f5f9",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 13, color: "#0f172a" }, children: t.name }),
                /* @__PURE__ */ jsxRuntimeExports.jsx(Chip$1, { label: t.category, color: t.category === "alert" ? "#ef4444" : t.category === "procurement" ? "#3b82f6" : "#6b7280" })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }, children: [
                t.content.slice(0, 80),
                "-"
              ] }),
              t.variables.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af", marginTop: 4 }, children: [
                "Variables: ",
                t.variables.map((v) => `{{${v}}}`).join(", ")
              ] })
            ]
          },
          t.id
        )),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setTab("templates"), style: { width: "100%", padding: "9px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#374151" }, children: "View All Templates -" })
      ] })
    ] }),
    tab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a" }, children: "- Message History" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { position: "relative", width: 260 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#9ca3af" } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Search messages-", style: { ...inp$1, paddingLeft: 30 } })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Dir", "Recipient", "Phone", "Type", "Message", "Status", "Sent At"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, style: { textAlign: "center", padding: "32px", color: "#9ca3af" }, children: "Loading-" }) }) : filteredMsgs.slice(0, 100).map((m, idx) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 16 }, children: m.direction === "inbound" ? "-" : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 13, fontWeight: 600, color: "#0f172a" }, children: m.recipient_name || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#374151", fontFamily: "monospace" }, children: m.recipient_phone }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip$1, { label: m.message_type || "sms", color: m.message_type === "whatsapp" ? "#25D366" : "#7c3aed" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#374151", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: m.message_body }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip$1, { label: m.status || "pending", color: STATUS_C$1[m.status] || "#6b7280" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 11, color: "#9ca3af" }, children: fmtDate$1(m.sent_at || m.created_at) })
          ] }, m.id || idx)),
          !loading && filteredMsgs.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 7, style: { textAlign: "center", padding: "40px", color: "#9ca3af" }, children: "No messages found" }) })
        ] })
      ] }) })
    ] }),
    tab === "conversations" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "300px 1fr", gap: 16, height: 600 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { ...card$1, overflowY: "auto", padding: "12px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#0f172a" }, children: "- Conversations" }),
        conversations.map((con) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { onClick: () => openConversation(con), style: { padding: "12px", borderRadius: 10, border: `1.5px solid ${activeCon?.id === con.id ? "#7c3aed" : "#f1f5f9"}`, background: activeCon?.id === con.id ? "#7c3aed10" : "#fafafa", cursor: "pointer", marginBottom: 6, transition: "all 0.15s" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 13, color: "#0f172a" }, children: con.contact_name || con.phone_number }),
            con.unread_count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { background: "#ef4444", color: "#fff", borderRadius: 10, padding: "0 6px", fontSize: 10, fontWeight: 700 }, children: con.unread_count })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace", marginTop: 2 }, children: con.phone_number }),
          con.last_message && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#6b7280", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: con.last_message }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6, marginTop: 4, justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip$1, { label: con.status, color: con.status === "open" ? "#059669" : con.status === "assigned" ? "#3b82f6" : "#6b7280" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 10, color: "#d1d5db" }, children: con.last_message_at ? fmtDate$1(con.last_message_at) : "" })
          ] })
        ] }, con.id)),
        conversations.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "24px", color: "#9ca3af", fontSize: 13 }, children: "No conversations yet" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { ...card$1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }, children: activeCon ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a" }, children: activeCon.contact_name || activeCon.phone_number }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }, children: activeCon.phone_number })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 8 }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => SMSAPI.closeConversation(activeCon.id).then(() => {
            setActiveCon(null);
            loadAll();
          }), style: { padding: "6px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#ef4444", cursor: "pointer", fontWeight: 600 }, children: "Close" }) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }, children: [
          conMessages.map((m, i) => {
            const out = m.direction === "outbound";
            return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", justifyContent: out ? "flex-end" : "flex-start" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { maxWidth: "70%", padding: "10px 14px", borderRadius: out ? "12px 12px 0 12px" : "12px 12px 12px 0", background: out ? "#7c3aed" : "#f1f5f9", color: out ? "#fff" : "#374151", fontSize: 13 }, children: [
              m.message_body,
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: out ? "rgba(255,255,255,0.6)" : "#9ca3af", marginTop: 4 }, children: fmtDate$1(m.created_at) })
            ] }) }, i);
          }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: conEndRef })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 20px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: replyMsg, onChange: (e) => setReplyMsg(e.target.value), onKeyDown: (e) => e.key === "Enter" && !e.shiftKey && sendReply(), placeholder: "Type a reply-", style: { ...inp$1, flex: 1 } }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: sendReply, disabled: replySending || !replyMsg, style: btn$1(replySending || !replyMsg ? "#9ca3af" : "#7c3aed"), children: /* @__PURE__ */ jsxRuntimeExports.jsx(Send, { style: { width: 14, height: 14 } }) })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", flex: 1, flexDirection: "column", color: "#9ca3af" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 48, marginBottom: 12 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Select a conversation" })
      ] }) })
    ] }),
    tab === "templates" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a" }, children: [
          "- SMS Templates (",
          templates.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditTpl({ name: "", content: "", variables: [], category: "general" }), style: btn$1("linear-gradient(135deg,#7c3aed,#6d28d9)"), children: "+ New Template" }),
          TEMPLATES_PRESETS.length > templates.length && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: async () => {
            for (const t of TEMPLATES_PRESETS) {
              if (!templates.find((x) => x.name === t.name)) {
                await SMSAPI.createTemplate(t);
              }
            }
            loadAll();
            showToast("- Default templates added!");
          }, style: { ...btn$1("linear-gradient(135deg,#059669,#047857)"), fontSize: 12 }, children: "- Add Defaults" })
        ] })
      ] }),
      editTpl && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { ...card$1, marginBottom: 16, border: "1.5px solid #7c3aed30", background: "#7c3aed05" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 14, color: "#7c3aed" }, children: editTpl.id ? "- Edit Template" : "+ New Template" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Name *" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: editTpl.name || "", onChange: (e) => setEditTpl((t) => ({ ...t, name: e.target.value })), style: inp$1, placeholder: "Template name" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Category" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: editTpl.category || "general", onChange: (e) => setEditTpl((t) => ({ ...t, category: e.target.value })), style: inp$1, children: ["general", "appointment", "alert", "reminder", "notification", "procurement", "finance"].map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: c, children: c }, c)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Variables (comma-sep)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: (editTpl.variables || []).join(","), onChange: (e) => setEditTpl((t) => ({ ...t, variables: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })), style: inp$1, placeholder: "name,date,amount" })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: [
            "Content * (use ",
            "{{variable}}",
            " for variables)"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: editTpl.content || "", onChange: (e) => setEditTpl((t) => ({ ...t, content: e.target.value })), style: { ...inp$1, height: 100, resize: "vertical" } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: saveTpl, disabled: savingTpl, style: btn$1(savingTpl ? "#9ca3af" : "linear-gradient(135deg,#7c3aed,#6d28d9)", savingTpl), children: savingTpl ? "Saving-" : "- Save Template" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditTpl(null), style: { padding: "9px 16px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 16 }, children: templates.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { ...card$1, padding: "16px 18px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, color: "#0f172a" }, children: t.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip$1, { label: t.category, color: t.category === "alert" ? "#ef4444" : t.category === "procurement" ? "#3b82f6" : t.category === "finance" ? "#22c55e" : "#6b7280" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#374151", lineHeight: 1.6, marginBottom: 8, background: "#f8fafc", padding: "8px 10px", borderRadius: 6, fontFamily: "monospace" }, children: t.content }),
        t.variables.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 10, color: "#9ca3af", marginBottom: 10 }, children: [
          "Variables: ",
          t.variables.map((v) => `{{${v}}}`).join(", ")
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 11, color: "#d1d5db" }, children: [
            "Used ",
            t.use_count,
            " times"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 6 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
              setBody(t.content);
              setTab("compose");
              showToast(`- ${t.name} applied`);
            }, style: { padding: "4px 10px", background: "#7c3aed12", border: "1px solid #7c3aed25", borderRadius: 6, fontSize: 11, color: "#7c3aed", cursor: "pointer", fontWeight: 700 }, children: "Use" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setEditTpl(t), style: { padding: "4px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, cursor: "pointer" }, children: "Edit" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => SMSAPI.deleteTemplate(t.id).then(loadAll), style: { padding: "4px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, fontSize: 11, color: "#ef4444", cursor: "pointer" }, children: "Del" })
          ] })
        ] })
      ] }, t.id)) })
    ] }),
    tab === "bulk" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 20 }, children: "- Bulk SMS Send" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Campaign Name" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: bulkName, onChange: (e) => setBulkName(e.target.value), style: inp$1, placeholder: "e.g. Supplier Payment Notice" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Recipients (one per line or comma-separated)" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: bulkRecipients, onChange: (e) => setBulkRecipients(e.target.value), style: { ...inp$1, height: 140, resize: "vertical", fontFamily: "monospace", fontSize: 12 }, placeholder: "+254700000001\n+254700000002\n+254700000003" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 4 }, children: [
            bulkRecipients.split(/[\n,;]+/).filter((p) => p.trim()).length,
            " recipient",
            bulkRecipients.split(/[\n,;]+/).filter((p) => p.trim()).length !== 1 ? "s" : "",
            " entered"
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Message *" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: bulkBody, onChange: (e) => setBulkBody(e.target.value), style: { ...inp$1, height: 100, resize: "vertical" }, placeholder: "Message to send to all recipients-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 4 }, children: [
            bulkBody.length,
            "/1600 - ",
            Math.ceil(bulkBody.length / 160) || 1,
            " segment",
            Math.ceil(bulkBody.length / 160) > 1 ? "s" : ""
          ] })
        ] }),
        bulkProgress && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, color: "#059669", marginBottom: 6 }, children: "Last Campaign Results" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 16 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 13 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#22c55e" }, children: bulkProgress.ok }),
              " sent"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 13 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#ef4444" }, children: bulkProgress.failed }),
              " failed"
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontSize: 13 }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#6b7280" }, children: bulkProgress.total }),
              " total"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: sendBulk, disabled: bulkSending || !bulkRecipients || !bulkBody, style: { ...btn$1(bulkSending || !bulkRecipients || !bulkBody ? "#9ca3af" : "linear-gradient(135deg,#7c3aed,#6d28d9)"), width: "100%", fontSize: 14, padding: "12px" }, children: bulkSending ? "Sending-" : "- Send Bulk SMS" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Bulk Operations Log" }),
        bulkOps.map((op) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 14px", borderRadius: 10, border: "1.5px solid #f1f5f9", marginBottom: 8 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 600, fontSize: 13, color: "#0f172a" }, children: op.name || "Unnamed Campaign" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Chip$1, { label: op.status || "completed", color: op.status === "completed" ? "#22c55e" : op.status === "failed" ? "#ef4444" : "#f97316" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 4, lineHeight: 1.5 }, children: [
            op.body?.slice(0, 80),
            "-"
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 12, marginTop: 6, fontSize: 12 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#22c55e" }, children: op.successful_count }),
              "/",
              op.recipients_count,
              " sent"
            ] }),
            op.failed_count > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("strong", { style: { color: "#ef4444" }, children: op.failed_count }),
              " failed"
            ] })
          ] })
        ] }, op.id)),
        bulkOps.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { textAlign: "center", padding: "32px", color: "#9ca3af", fontSize: 13 }, children: "No bulk operations yet" })
      ] })
    ] }),
    tab === "metrics" && metrics && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- SMS Metrics (7 days)" }),
        [
          { label: "Total Messages", value: metrics.total, color: "#3b82f6" },
          { label: "Sent (Outbound)", value: metrics.sent, color: "#22c55e" },
          { label: "Received (Inbound)", value: metrics.received, color: "#7c3aed" },
          { label: "Delivered", value: metrics.delivered, color: "#059669" },
          { label: "Failed", value: metrics.failed, color: "#ef4444" },
          { label: "SMS Channel", value: metrics.sms, color: "#374151" },
          { label: "WhatsApp Channel", value: metrics.whatsapp, color: "#25D366" },
          { label: "Delivery Rate", value: metrics.sent > 0 ? `${Math.round(metrics.delivered / metrics.sent * 100)}%` : "N/A", color: "#0891b2" }
        ].map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f8fafc" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, color: "#374151" }, children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 16, fontWeight: 800, color: row.color }, children: row.value })
        ] }, i))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card$1, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Twilio Configuration" }),
        [
          { label: "SMS Number", value: "+16812972643" },
          { label: "WhatsApp Number", value: "+14155238886" },
          { label: "Messaging Service", value: "EL5H" },
          { label: "Service SID", value: "MGd547d8e3273fda2d21afdd6856acb245" },
          { label: "WhatsApp Join Code", value: "join bad-machine" },
          { label: "Voice Webhook", value: "https://demo.twilio.com/welcome/voice/" }
        ].map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f8fafc" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 12, color: "#374151" }, children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 11, fontFamily: "monospace", color: "#374151", background: "#f1f5f9", padding: "2px 8px", borderRadius: 6 }, children: row.value })
        ] }, i)),
        /* @__PURE__ */ jsxRuntimeExports.jsx("a", { href: "https://api.whatsapp.com/send/?phone=%2B14155238886&text=join+bad-machine&type=phone_number&app_absent=0", target: "_blank", rel: "noopener noreferrer", style: { display: "block", marginTop: 14, ...btn$1("#25D366"), textAlign: "center", textDecoration: "none" }, children: "- Open WhatsApp Sandbox -" })
      ] })
    ] })
  ] });
}
const db$1 = supabase;
const TelephonyAPI = {
  /** Batch-load all call center data in parallel */
  async loadAll() {
    const [calls, exts, ivr, queues, vm] = await Promise.all([
      db$1.from("phone_calls").select("*").order("start_time", { ascending: false }).limit(100),
      db$1.from("phone_extensions").select("*").order("extension_number"),
      db$1.from("ivr_menus").select("*, ivr_options(*)").eq("is_active", true).order("sort_order"),
      db$1.from("call_queues").select("*, queue_agents(*)").eq("is_active", true),
      db$1.from("voicemails").select("*").eq("status", "new").order("received_at", { ascending: false }).limit(20)
    ]);
    return { calls: calls.data || [], extensions: exts.data || [], menus: ivr.data || [], queues: queues.data || [], voicemails: vm.data || [] };
  },
  async logCall(call) {
    const { data, error } = await db$1.from("phone_calls").insert({ ...call, start_time: (/* @__PURE__ */ new Date()).toISOString() }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },
  async updateCall(id, updates) {
    await db$1.from("phone_calls").update(updates).eq("id", id);
  },
  async updateExtensionStatus(id, status) {
    await db$1.from("phone_extensions").update({ status, last_seen: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
  },
  async getCallMetrics(days = 7) {
    const since = new Date(Date.now() - days * 864e5).toISOString();
    const { data } = await db$1.from("phone_calls").select("status,duration_seconds,direction").gte("start_time", since);
    const calls = data || [];
    return {
      total: calls.length,
      answered: calls.filter((c) => c.status === "completed").length,
      missed: calls.filter((c) => c.status === "missed").length,
      avgDuration: calls.filter((c) => c.duration_seconds).reduce((s, c) => s + (c.duration_seconds || 0), 0) / Math.max(1, calls.filter((c) => c.duration_seconds).length),
      inbound: calls.filter((c) => c.direction === "inbound").length,
      outbound: calls.filter((c) => c.direction === "outbound").length
    };
  },
  async makeCall(from, to, notes) {
    return TelephonyAPI.logCall({ caller_extension: from, callee_extension: to, direction: "outbound", status: "ringing", notes });
  },
  async answerCall(id) {
    await TelephonyAPI.updateCall(id, { status: "connected", answer_time: (/* @__PURE__ */ new Date()).toISOString() });
  },
  async endCall(id, durationSec) {
    await TelephonyAPI.updateCall(id, { status: "completed", end_time: (/* @__PURE__ */ new Date()).toISOString(), duration_seconds: durationSec });
  },
  async getVoicemails(extension) {
    const { data } = await db$1.from("voicemails").select("*").eq("for_extension", extension).eq("status", "new").order("received_at", { ascending: false });
    return data || [];
  },
  async markVoicemailListened(id) {
    await db$1.from("voicemails").update({ status: "listened" }).eq("id", id);
  },
  async saveIVRMenu(menu) {
    await db$1.from("ivr_menus").upsert(menu, { onConflict: "menu_key" });
  },
  async saveIVROption(opt) {
    await db$1.from("ivr_options").upsert(opt);
  },
  async deleteIVROption(id) {
    await db$1.from("ivr_options").delete().eq("id", id);
  }
};
const db = supabase;
const STATUS_C = { connected: "#22c55e", ringing: "#f97316", completed: "#6b7280", missed: "#ef4444", failed: "#ef4444", transferred: "#3b82f6", voicemail: "#8b5cf6" };
const EXT_STATUS_C = { available: "#22c55e", busy: "#ef4444", offline: "#9ca3af", dnd: "#f97316", ringing: "#3b82f6" };
const fmt = (s) => !s ? "0:00" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const fmtDate = (s) => new Date(s).toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });
const card = { background: "#fff", borderRadius: 12, border: "1px solid #f1f5f9", padding: "20px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" };
const inp = { width: "100%", padding: "9px 12px", border: "1.5px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", color: "#374151" };
const btn = (bg, disabled = false) => ({ padding: "9px 18px", background: disabled ? "#9ca3af" : bg, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer" });
function Chip({ label, color }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { padding: "2px 10px", borderRadius: 12, fontSize: 10, fontWeight: 700, background: color + "18", color, border: `1px solid ${color}33`, textTransform: "uppercase" }, children: label });
}
function TelephonyPage() {
  const { roles } = useAuth();
  const [tab, setTab] = reactExports.useState("softphone");
  const [calls, setCalls] = reactExports.useState([]);
  const [extensions, setExtensions] = reactExports.useState([]);
  const [menus, setMenus] = reactExports.useState([]);
  const [queues, setQueues] = reactExports.useState([]);
  const [voicemails, setVoicemails] = reactExports.useState([]);
  const [metrics, setMetrics] = reactExports.useState(null);
  const [loading, setLoading] = reactExports.useState(true);
  const [dialNum, setDialNum] = reactExports.useState("");
  const [fromExt, setFromExt] = reactExports.useState("100");
  const [activeCall, setActiveCall] = reactExports.useState(null);
  const [callTimer, setCallTimer] = reactExports.useState(0);
  const [muted, setMuted] = reactExports.useState(false);
  const [onHold, setOnHold] = reactExports.useState(false);
  const [localToast, setLocalToast] = reactExports.useState("");
  const [showIVREdit, setShowIVREdit] = reactExports.useState(null);
  const timerRef = reactExports.useRef(null);
  const isAdmin = roles.includes("admin");
  const showToast = (msg) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(""), 3e3);
  };
  const loadAll = reactExports.useCallback(async () => {
    setLoading(true);
    const [data, m] = await Promise.all([TelephonyAPI.loadAll(), TelephonyAPI.getCallMetrics(7)]);
    setCalls(data.calls);
    setExtensions(data.extensions);
    setMenus(data.menus);
    setQueues(data.queues);
    setVoicemails(data.voicemails);
    setMetrics(m);
    setLoading(false);
  }, []);
  reactExports.useEffect(() => {
    loadAll();
  }, [loadAll]);
  reactExports.useEffect(() => {
    const ch = db.channel("telephony_rt").on("postgres_changes", { event: "*", schema: "public", table: "phone_calls" }, loadAll).on("postgres_changes", { event: "*", schema: "public", table: "phone_extensions" }, loadAll).on("postgres_changes", { event: "INSERT", schema: "public", table: "voicemails" }, loadAll).subscribe();
    return () => db.removeChannel(ch);
  }, [loadAll]);
  reactExports.useEffect(() => {
    if (activeCall && activeCall.status === "connected") {
      timerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1e3);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallTimer(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall]);
  async function makeCall() {
    if (!dialNum.trim()) {
      showToast("- Enter a number or extension");
      return;
    }
    const call = await TelephonyAPI.makeCall(fromExt, dialNum);
    setActiveCall(call);
    showToast(`- Calling ${dialNum}-`);
    setTimeout(async () => {
      await TelephonyAPI.answerCall(call.id);
      setActiveCall((prev) => prev ? { ...prev, status: "connected" } : prev);
    }, 2e3);
  }
  async function endCall() {
    if (!activeCall) return;
    await TelephonyAPI.endCall(activeCall.id, callTimer);
    setActiveCall(null);
    setMuted(false);
    setOnHold(false);
    showToast("- Call ended");
    loadAll();
  }
  const TABS = [
    { id: "softphone", label: "Softphone", icon: "-" },
    { id: "history", label: "Call History", icon: "-" },
    { id: "extensions", label: "Extensions", icon: "-" },
    { id: "ivr", label: "IVR Editor", icon: "-", adminOnly: true },
    { id: "queues", label: "Call Queues", icon: "-", adminOnly: true },
    { id: "voicemail", label: "Voicemail", icon: "-" },
    { id: "metrics", label: "Metrics", icon: "-" }
  ].filter((t) => !t.adminOnly || isAdmin);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "20px 24px", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", maxWidth: 1400, margin: "0 auto" }, children: [
    localToast && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { position: "fixed", top: 20, right: 20, background: "#1e293b", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }, children: localToast }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#7c3aed,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { style: { margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }, children: "Telephony & Call Center" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 12, color: "#6b7280", marginTop: 2 }, children: "EL5H - Twilio +16812972643 - ERP SIP Integration - v5.8" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "5px 12px", borderRadius: 20, background: "#f0fdf4", border: "1px solid #bbf7d0", fontSize: 11, fontWeight: 700, color: "#059669" }, children: "- Twilio Active" }),
        voicemails.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "5px 12px", borderRadius: 20, background: "#fef3c7", border: "1px solid #fde68a", fontSize: 11, fontWeight: 700, color: "#d97706" }, children: [
          "- ",
          voicemails.length,
          " Voicemail",
          voicemails.length > 1 ? "s" : ""
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: loadAll, style: { ...btn("#64748b"), padding: "7px 14px" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { style: { width: 12, height: 12, display: "inline", marginRight: 4 } }),
          "Refresh"
        ] })
      ] })
    ] }),
    metrics && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }, children: [
      { label: "Total Calls (7d)", value: metrics.total, color: "#3b82f6", icon: "-" },
      { label: "Answered", value: metrics.answered, color: "#22c55e", icon: "-" },
      { label: "Missed", value: metrics.missed, color: "#ef4444", icon: "-" },
      { label: "Inbound", value: metrics.inbound, color: "#7c3aed", icon: "-" },
      { label: "Outbound", value: metrics.outbound, color: "#f97316", icon: "-" },
      { label: "Avg Duration", value: fmt(Math.round(metrics.avgDuration)), color: "#06b6d4", icon: "-" }
    ].map((k, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { ...card, padding: "14px 16px", borderLeft: `4px solid ${k.color}` }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 22, fontWeight: 800, color: "#0f172a" }, children: loading ? "-" : k.value }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 20 }, children: k.icon })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 3 }, children: k.label })
    ] }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", overflowX: "auto", flexWrap: "nowrap" }, children: TABS.map((t) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setTab(t.id), style: {
      padding: "9px 16px",
      borderRadius: "8px 8px 0 0",
      fontSize: 12.5,
      fontWeight: tab === t.id ? 700 : 500,
      cursor: "pointer",
      whiteSpace: "nowrap",
      background: tab === t.id ? "#7c3aed" : "transparent",
      color: tab === t.id ? "#fff" : "#6b7280",
      border: tab === t.id ? "1.5px solid #7c3aed" : "1.5px solid transparent",
      boxShadow: tab === t.id ? "0 4px 12px #7c3aed30" : "none"
    }, children: [
      t.icon,
      " ",
      t.label,
      t.id === "voicemail" && voicemails.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10 }, children: voicemails.length })
    ] }, t.id)) }),
    tab === "softphone" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 20, textAlign: "center" }, children: activeCall ? activeCall.status === "connected" ? "- On Call" : "- Calling-" : "- Softphone" }),
        activeCall ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg,${activeCall.status === "connected" ? "#22c55e" : "#f97316"},${activeCall.status === "connected" ? "#16a34a" : "#ea580c"})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 36, boxShadow: "0 8px 24px rgba(0,0,0,0.2)", animation: activeCall.status === "ringing" ? "pulse 1s infinite" : void 0 }, children: "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 4 }, children: activeCall.callee_extension || dialNum }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 28, fontWeight: 800, color: activeCall.status === "connected" ? "#22c55e" : "#f97316", fontFamily: "monospace", marginBottom: 20 }, children: activeCall.status === "connected" ? fmt(callTimer) : "Connecting-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 16 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setMuted((m) => !m), style: { width: 52, height: 52, borderRadius: "50%", border: "none", background: muted ? "#ef4444" : "#f1f5f9", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }, children: muted ? "-" : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setOnHold((h) => !h), style: { width: 52, height: 52, borderRadius: "50%", border: "none", background: onHold ? "#f97316" : "#f1f5f9", cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }, children: onHold ? "-" : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: endCall, style: { width: 64, height: 64, borderRadius: "50%", border: "none", background: "#ef4444", cursor: "pointer", fontSize: 24, boxShadow: "0 4px 16px rgba(239,68,68,0.4)" }, children: "-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#9ca3af" }, children: [
            muted && "- Muted - ",
            onHold && "- On Hold - ",
            "From ext. ",
            fromExt
          ] })
        ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "From Extension" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("select", { value: fromExt, onChange: (e) => setFromExt(e.target.value), style: inp, children: extensions.filter((e) => e.status !== "offline").map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: e.extension_number, children: [
              e.extension_number,
              " - ",
              e.display_name
            ] }, e.id)) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }, children: "Dial Number / Extension" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { value: dialNum, onChange: (e) => setDialNum(e.target.value), onKeyDown: (e) => e.key === "Enter" && makeCall(), style: { ...inp, fontSize: 18, fontFamily: "monospace", letterSpacing: "0.08em", textAlign: "center" }, placeholder: "100, +254-" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }, children: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((k) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setDialNum((d) => d + k),
              style: { padding: "14px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f8fafc", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#374151", fontFamily: "monospace", transition: "all 0.1s" },
              onMouseEnter: (e) => e.currentTarget.style.background = "#f1f5f9",
              onMouseLeave: (e) => e.currentTarget.style.background = "#f8fafc",
              children: k
            },
            k
          )) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: makeCall, disabled: !dialNum, style: { ...btn(!dialNum ? "#9ca3af" : "#22c55e"), flex: 1, fontSize: 16, padding: "13px", borderRadius: 10 }, children: "- Call" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setDialNum((d) => d.slice(0, -1)), style: { padding: "13px 16px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 10, cursor: "pointer", fontSize: 18 }, children: "-" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Extension Status Board" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }, children: extensions.map((ext) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${EXT_STATUS_C[ext.status] || "#e5e7eb"}20`, background: `${EXT_STATUS_C[ext.status] || "#9ca3af"}08`, transition: "all 0.2s" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontFamily: "monospace", fontWeight: 800, fontSize: 18, color: "#0f172a" }, children: ext.extension_number }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 13, fontWeight: 600, color: "#374151", marginTop: 2 }, children: ext.display_name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 1 }, children: ext.department || "-" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "right" }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: ext.status, color: EXT_STATUS_C[ext.status] || "#9ca3af" }),
              ext.voicemail_enabled && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#9ca3af", marginTop: 4 }, children: "- VM" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => {
            setDialNum(ext.extension_number);
            setTab("softphone");
          }, style: { marginTop: 8, width: "100%", padding: "5px", background: `${EXT_STATUS_C[ext.status] || "#9ca3af"}15`, border: `1px solid ${EXT_STATUS_C[ext.status] || "#9ca3af"}30`, borderRadius: 6, cursor: ext.status === "available" ? "pointer" : "not-allowed", fontSize: 11, fontWeight: 600, color: EXT_STATUS_C[ext.status] || "#9ca3af" }, disabled: ext.status !== "available", children: ext.status === "available" ? "- Call" : "- Unavailable -" })
        ] }, ext.id)) })
      ] })
    ] }),
    tab === "history" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16 }, children: "- Call History" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Dir", "Caller", "Callee", "Department", "Start", "Duration", "Status", "Notes"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("tbody", { children: [
          loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, style: { textAlign: "center", padding: "32px", color: "#9ca3af" }, children: "Loading-" }) }) : calls.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (e) => e.currentTarget.style.background = "#f8fafc", onMouseLeave: (e) => e.currentTarget.style.background = "", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 16 }, children: c.direction === "outbound" ? "-" : c.direction === "internal" ? "-" : "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 13, fontWeight: 600, color: "#0f172a" }, children: c.caller_name || c.caller_extension || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 13, color: "#374151" }, children: c.callee_name || c.callee_extension || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#6b7280" }, children: c.department || "-" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 11, color: "#9ca3af" }, children: fmtDate(c.start_time) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontFamily: "monospace", fontSize: 12, color: "#374151" }, children: fmt(c.duration_seconds) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: c.status, color: STATUS_C[c.status] || "#6b7280" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#6b7280", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: c.notes || "-" })
          ] }, c.id)),
          !loading && calls.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("td", { colSpan: 8, style: { textAlign: "center", padding: "40px", color: "#9ca3af" }, children: "No call records yet" }) })
        ] })
      ] }) })
    ] }),
    tab === "extensions" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16 }, children: "- PBX Extensions" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("thead", { children: /* @__PURE__ */ jsxRuntimeExports.jsx("tr", { style: { background: "#f8fafc" }, children: ["Ext", "Name", "Department", "Status", "Forward To", "Voicemail", "Actions"].map((h) => /* @__PURE__ */ jsxRuntimeExports.jsx("th", { style: { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 14px", borderBottom: "2px solid #f1f5f9", textAlign: "left" }, children: h }, h)) }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("tbody", { children: extensions.map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("tr", { onMouseEnter: (ev) => ev.currentTarget.style.background = "#f8fafc", onMouseLeave: (ev) => ev.currentTarget.style.background = "", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontFamily: "monospace", fontWeight: 800, fontSize: 16, color: "#7c3aed" }, children: e.extension_number }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 13, fontWeight: 600, color: "#0f172a" }, children: e.display_name }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#374151" }, children: e.department || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: e.status, color: EXT_STATUS_C[e.status] || "#9ca3af" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 12, color: "#6b7280", fontFamily: "monospace" }, children: e.forward_to || "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc", fontSize: 16 }, children: e.voicemail_enabled ? "-" : "-" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("td", { style: { padding: "10px 14px", borderBottom: "1px solid #f8fafc" }, children: isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsx("select", { defaultValue: e.status, onChange: async (ev) => {
            await TelephonyAPI.updateExtensionStatus(e.id, ev.target.value);
            loadAll();
          }, style: { padding: "4px 8px", border: "1.5px solid #e5e7eb", borderRadius: 6, fontSize: 11, cursor: "pointer" }, children: ["available", "busy", "offline", "dnd"].map((s) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: s, children: s }, s)) }) })
        ] }, e.id)) })
      ] }) })
    ] }),
    tab === "ivr" && isAdmin && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 14 }, children: "- IVR Menus" }),
        menus.map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("button", { onClick: () => setShowIVREdit(m), style: { display: "block", width: "100%", padding: "10px 14px", marginBottom: 6, textAlign: "left", borderRadius: 8, border: `1.5px solid ${showIVREdit?.id === m.id ? "#7c3aed" : "#e5e7eb"}`, background: showIVREdit?.id === m.id ? "#7c3aed10" : "#f8fafc", cursor: "pointer", fontSize: 13, fontWeight: showIVREdit?.id === m.id ? 700 : 500, color: showIVREdit?.id === m.id ? "#7c3aed" : "#374151" }, children: [
          "- ",
          m.name,
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 10, color: "#9ca3af", marginTop: 2 }, children: m.menu_key })
        ] }, m.id))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: card, children: showIVREdit ? /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: [
          "Edit: ",
          showIVREdit.name
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { marginBottom: 12 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Greeting Text" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("textarea", { value: showIVREdit.greeting_text, onChange: (e) => setShowIVREdit((m) => m ? { ...m, greeting_text: e.target.value } : m), style: { ...inp, height: 100, resize: "vertical" } })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Timeout (ms)" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: showIVREdit.timeout_ms, onChange: (e) => setShowIVREdit((m) => m ? { ...m, timeout_ms: +e.target.value } : m), style: inp })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("label", { style: { fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 5, textTransform: "uppercase" }, children: "Max Retries" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "number", value: showIVREdit.max_retries, onChange: (e) => setShowIVREdit((m) => m ? { ...m, max_retries: +e.target.value } : m), style: inp })
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 10, marginTop: 16 }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: async () => {
            await TelephonyAPI.saveIVRMenu(showIVREdit);
            showToast("- IVR menu saved!");
            loadAll();
          }, style: btn("linear-gradient(135deg,#7c3aed,#6d28d9)"), children: "- Save Menu" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => setShowIVREdit(null), style: { padding: "9px 16px", background: "#f1f5f9", border: "1.5px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13 }, children: "Cancel" })
        ] })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: "48px 24px", color: "#9ca3af" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 36, marginBottom: 12 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Select an IVR menu to edit" })
      ] }) })
    ] }),
    tab === "voicemail" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 16 }, children: "- Voicemail Inbox" }),
      voicemails.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { textAlign: "center", padding: "48px", color: "#9ca3af" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontSize: 40, marginBottom: 12 }, children: "-" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "No new voicemails" })
      ] }) : voicemails.map((vm) => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { padding: "14px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", marginBottom: 10, background: "#fafcff" }, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 13, color: "#0f172a" }, children: vm.from_name || vm.from_number || "Unknown" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 11, color: "#9ca3af", marginTop: 2 }, children: [
            "Ext. ",
            vm.for_extension,
            " - ",
            fmtDate(vm.received_at),
            " - ",
            fmt(vm.duration_seconds)
          ] }),
          vm.transcript && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { fontSize: 12, color: "#374151", marginTop: 6, fontStyle: "italic" }, children: [
            '"',
            vm.transcript,
            '"'
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: 8 }, children: [
          vm.audio_url && /* @__PURE__ */ jsxRuntimeExports.jsx("button", { style: { ...btn("#7c3aed"), padding: "6px 12px", fontSize: 12 }, children: "- Play" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { onClick: () => TelephonyAPI.markVoicemailListened(vm.id).then(loadAll), style: { ...btn("#6b7280"), padding: "6px 12px", fontSize: 12 }, children: "- Mark Heard" })
        ] })
      ] }) }, vm.id))
    ] }),
    tab === "metrics" && metrics && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }, children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Call Metrics (7 days)" }),
        [
          { label: "Total Calls", value: metrics.total, color: "#3b82f6" },
          { label: "Answered", value: metrics.answered, color: "#22c55e" },
          { label: "Missed", value: metrics.missed, color: "#ef4444" },
          { label: "Inbound", value: metrics.inbound, color: "#7c3aed" },
          { label: "Outbound", value: metrics.outbound, color: "#f97316" },
          { label: "Answer Rate", value: `${metrics.total > 0 ? Math.round(metrics.answered / metrics.total * 100) : 0}%`, color: "#059669" },
          { label: "Avg Duration", value: fmt(Math.round(metrics.avgDuration)), color: "#06b6d4" }
        ].map((row, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f8fafc" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, color: "#374151" }, children: row.label }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 16, fontWeight: 800, color: row.color }, children: row.value })
        ] }, i))
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: card, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 16 }, children: "- Extension Activity" }),
        extensions.slice(0, 10).map((e) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f8fafc" }, children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontFamily: "monospace", fontWeight: 700, color: "#7c3aed", marginRight: 8 }, children: e.extension_number }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { style: { fontSize: 13, color: "#374151" }, children: e.display_name })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Chip, { label: e.status, color: EXT_STATUS_C[e.status] || "#9ca3af" })
        ] }, e.id))
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("style", { children: `@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}` })
  ] });
}
export {
  EmailPage as E,
  SMSPage as S,
  TelephonyPage as T,
  notifyProcurement as n,
  sendNotification as s
};
