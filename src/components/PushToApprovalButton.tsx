/**
 * EL5 MediProcure — Push to Approvals Button
 * Shared component used across all document pages.
 * Inserts a record into approval_queue and shows
 * a queued-state badge when already pushed.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Send, Clock, CheckCircle2, ChevronDown } from "lucide-react";
import { T, d365Btn } from "@/lib/theme";

const db = supabase as any;

export type DocType =
  | "requisition" | "purchase_order" | "grn"
  | "voucher" | "tender" | "contract";

interface Props {
  documentType:   DocType;
  documentId:     string;
  documentNumber: string;
  documentTitle?: string;
  department?:    string;
  amount?:        number;
  currentStatus?: string;
  /** True once a manager/admin has applied the Official Stamp to this
   *  document (requisitions/purchase_orders/goods_received only, via
   *  the `stamped` column). Takes priority over the push/queue states
   *  below — a stamped document is a closed matter. */
  stamped?:        boolean;
  stampedByName?:  string;
  /** e.g. "Approved" / "Issued" / "Received" — defaults to "Approved" */
  stampLabel?:     string;
  size?:          "sm" | "md";
  onPushed?:      () => void;
}

const TYPE_LABEL: Record<DocType, string> = {
  requisition:    "Requisition",
  purchase_order: "Purchase Order",
  grn:            "GRN",
  voucher:        "Voucher",
  tender:         "Tender",
  contract:       "Contract",
};

const PRIORITY_OPTS = [
  { val: "urgent", label: "🔴 Urgent",  get color() { return T.error; } },
  { val: "high",   label: "🟠 High",    get color() { return T.warning; } },
  { val: "normal", label: "🟢 Normal",  get color() { return T.success; } },
  { val: "low",    label: "🔵 Low",     get color() { return T.primary; } },
];

export default function PushToApprovalButton({
  documentType, documentId, documentNumber,
  documentTitle, department, amount = 0, currentStatus,
  stamped = false, stampedByName, stampLabel,
  size = "md", onPushed,
}: Props) {
  const { user, profile } = useAuth();
  const { toast }         = useToast();

  const [queued,    setQueued]    = useState(false);
  const [queueId,   setQueueId]   = useState<string | null>(null);
  const [pushing,   setPushing]   = useState(false);
  const [showPrio,  setShowPrio]  = useState(false);
  const [priority,  setPriority]  = useState("normal");
  const [notes,     setNotes]     = useState("");
  const [showNotes, setShowNotes] = useState(false);

  /* Check if already queued — silent if table not yet created */
  useEffect(() => {
    if (!documentId) return;
    db.from("approval_queue")
      .select("id,queue_status")
      .eq("document_id", documentId)
      .eq("queue_status", "queued")
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (error) return; // table not ready yet — stay in unqueued state
        if (data) { setQueued(true); setQueueId(data.id); }
      });
  }, [documentId]);

  const push = async (prio: string) => {
    setPushing(true); setShowPrio(false);
    try {
      const { data, error } = await db.from("approval_queue").insert({
        document_type:   documentType,
        document_id:     documentId,
        document_number: documentNumber,
        document_title:  documentTitle || documentNumber,
        department:      department || "General",
        amount:          amount || 0,
        pushed_by_id:    user?.id,
        pushed_by_name:  profile?.full_name || "User",
        priority:        prio,
        notes:           notes || null,
        queue_status:    "queued",
      }).select("id").single();

      if (error) {
        // Detect missing table (schema cache miss — migration pending)
        if (error.message?.includes("approval_queue") || error.code === "42P01") {
          // Auto-create table inline if migration hasn't run yet
          await db.rpc("exec_sql", { query: `
            CREATE TABLE IF NOT EXISTS public.approval_queue (
              id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
              document_type text NOT NULL,
              document_id uuid NOT NULL,
              document_number text,
              document_title text,
              department text,
              amount numeric DEFAULT 0,
              pushed_by_id uuid,
              pushed_by_name text,
              pushed_at timestamptz DEFAULT now(),
              priority text DEFAULT 'normal',
              notes text,
              queue_status text DEFAULT 'queued',
              resolved_by_name text,
              resolved_at timestamptz,
              created_at timestamptz DEFAULT now()
            )` });
          // Retry insert
          const retry = await db.from("approval_queue").insert({
            document_type: documentType, document_id: documentId,
            document_number: documentNumber,
            document_title: documentTitle || documentNumber,
            department: department || "General", amount: amount || 0,
            pushed_by_id: user?.id, pushed_by_name: profile?.full_name || "User",
            priority: prio, notes: notes || null, queue_status: "queued",
          }).select("id").single();
          if (retry.error) throw retry.error;
          setQueued(true); setQueueId(retry.data.id);
        } else {
          throw error;
        }
      } else {
        setQueued(true); setQueueId(data.id);
      }
      toast({
        title: `📨 ${TYPE_LABEL[documentType]} pushed to Approvals`,
        description: `${documentNumber} — ${prio.toUpperCase()} priority`,
      });
      onPushed?.();
    } catch (e: any) {
      const msg = e.message || "Try again";
      const isSchemaMiss = msg.includes("schema cache") || msg.includes("approval_queue") || msg.includes("42P01");
      toast({
        title: isSchemaMiss ? "Database sync in progress" : "Push failed",
        description: isSchemaMiss
          ? "The approval queue table is initialising. Please try again in a few seconds."
          : msg,
        variant: "destructive",
      });
    }
    setPushing(false);
  };

  const withdraw = async () => {
    if (!queueId) return;
    setPushing(true);
    await db.from("approval_queue").update({ queue_status: "withdrawn" }).eq("id", queueId);
    setQueued(false); setQueueId(null);
    toast({ title: "Withdrawn from approval queue" });
    setPushing(false);
    onPushed?.();
  };

  const sm = size === "sm";
  const pad  = sm ? "3px 8px"  : "5px 12px";
  const fz   = sm ? 10         : 12;
  const iconSz = sm ? 10 : 12;

  /* A manager/admin has officially stamped this document — closed matter,
     takes priority over the push/queue states below */
  if (stamped) {
    return (
      <div title={stampedByName ? `${stampLabel || "Approved"} by ${stampedByName}` : (stampLabel || "Approved")}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: pad, background: T.successBg, border: `1px solid ${T.success}`,
          borderRadius: T.r, fontSize: fz, fontWeight: 700, color: T.success,
          whiteSpace: "nowrap",
        }}>
        <CheckCircle2 size={iconSz} /> {(stampLabel || "Approved").toUpperCase()}
      </div>
    );
  }

  /* Already in queue — show badge + withdraw option */
  if (queued) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: pad, background: T.successBg, border: `1px solid ${T.success}`,
          borderRadius: T.r, fontSize: fz, fontWeight: 700, color: T.success,
          whiteSpace: "nowrap",
        }}>
          <Clock size={iconSz} /> In Approval Queue
        </div>
        <button onClick={withdraw} disabled={pushing}
          style={{ padding: "3px 7px", background: T.errorBg, border: `1px solid ${T.error}`,
            borderRadius: T.r, fontSize: fz - 1, color: T.error, cursor: "pointer",
            fontWeight: 600, whiteSpace: "nowrap" }}>
          Withdraw
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 3 }}>
      {/* Notes toggle */}
      {showNotes && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0, zIndex: 200,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rMd,
          boxShadow: T.shadowMd, padding: 10, width: 230,
        }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional note for approver…"
            rows={2}
            style={{ width: "100%", padding: "6px 8px", border: `1px solid ${T.border}`,
              borderRadius: T.r, fontSize: 11, resize: "none", outline: "none",
              fontFamily: "inherit", boxSizing: "border-box", color: T.fg, background: T.card }}/>
        </div>
      )}

      {/* Priority dropdown */}
      {showPrio && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0, zIndex: 300,
          background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rMd,
          boxShadow: T.shadowMd, minWidth: 170, overflow: "hidden",
        }}>
          <div style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: T.fgDim,
            textTransform: "uppercase", letterSpacing: ".06em", borderBottom: `1px solid ${T.border}` }}>
            Select Priority
          </div>
          {PRIORITY_OPTS.map(p => (
            <button key={p.val} onClick={() => push(p.val)}
              style={{ display: "block", width: "100%", padding: "8px 12px",
                background: "none", border: "none", cursor: "pointer",
                textAlign: "left", fontSize: 12, fontWeight: 600, color: p.color,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = T.bg1; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setShowPrio(false)}
            style={{ display: "block", width: "100%", padding: "6px 12px",
              background: T.bg1, border: "none", borderTop: `1px solid ${T.border}`,
              cursor: "pointer", fontSize: 11, color: T.fgDim }}>
            Cancel
          </button>
        </div>
      )}

      {/* Main push button */}
      <button
        onClick={() => setShowPrio(p => !p)}
        disabled={pushing}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: pad,
          background: pushing ? T.fgDim : T.primary,
          color: "#fff", border: "none", borderRadius: `${T.r}px 0 0 ${T.r}px`,
          fontSize: fz, fontWeight: 700, cursor: pushing ? "default" : "pointer",
          whiteSpace: "nowrap", transition: "background .15s",
        }}
        onMouseEnter={e => { if (!pushing) (e.currentTarget as HTMLElement).style.background = T.primaryHov; }}
        onMouseLeave={e => { if (!pushing) (e.currentTarget as HTMLElement).style.background = T.primary; }}>
        <Send size={iconSz} />
        {pushing ? "Pushing…" : "Push to Approvals"}
      </button>

      {/* Chevron to open priority */}
      <button onClick={() => setShowPrio(p => !p)} disabled={pushing}
        style={{ padding: sm ? "3px 5px" : "5px 7px", background: T.primaryDark,
          color: "#fff", border: "none", borderRadius: `0 ${T.r}px ${T.r}px 0`,
          cursor: "pointer", display: "flex", alignItems: "center" }}>
        <ChevronDown size={iconSz} />
      </button>
    </div>
  );
}
