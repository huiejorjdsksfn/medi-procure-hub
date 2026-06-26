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
  { val: "urgent", label: "🔴 Urgent",  color: "#dc2626" },
  { val: "high",   label: "🟠 High",    color: "#ea580c" },
  { val: "normal", label: "🟢 Normal",  color: "#16a34a" },
  { val: "low",    label: "🔵 Low",     color: "#2563eb" },
];

export default function PushToApprovalButton({
  documentType, documentId, documentNumber,
  documentTitle, department, amount = 0, currentStatus,
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

  /* Already in queue — show badge + withdraw option */
  if (queued) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: pad, background: "#f0fdf4", border: "1px solid #86efac",
          borderRadius: 4, fontSize: fz, fontWeight: 700, color: "#15803d",
          whiteSpace: "nowrap",
        }}>
          <Clock size={iconSz} /> In Approval Queue
        </div>
        <button onClick={withdraw} disabled={pushing}
          style={{ padding: "3px 7px", background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 4, fontSize: fz - 1, color: "#dc2626", cursor: "pointer",
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
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,.13)", padding: 10, width: 230,
        }}>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional note for approver…"
            rows={2}
            style={{ width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb",
              borderRadius: 4, fontSize: 11, resize: "none", outline: "none",
              fontFamily: "inherit", boxSizing: "border-box" }}/>
        </div>
      )}

      {/* Priority dropdown */}
      {showPrio && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 4px)", left: 0, zIndex: 300,
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6,
          boxShadow: "0 4px 20px rgba(0,0,0,.15)", minWidth: 170, overflow: "hidden",
        }}>
          <div style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#9ca3af",
            textTransform: "uppercase", letterSpacing: ".06em", borderBottom: "1px solid #f3f4f6" }}>
            Select Priority
          </div>
          {PRIORITY_OPTS.map(p => (
            <button key={p.val} onClick={() => push(p.val)}
              style={{ display: "block", width: "100%", padding: "8px 12px",
                background: "none", border: "none", cursor: "pointer",
                textAlign: "left", fontSize: 12, fontWeight: 600, color: p.color,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#f9fafb"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; }}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setShowPrio(false)}
            style={{ display: "block", width: "100%", padding: "6px 12px",
              background: "#f9fafb", border: "none", borderTop: "1px solid #f3f4f6",
              cursor: "pointer", fontSize: 11, color: "#9ca3af" }}>
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
          background: pushing ? "#6b9e8b" : "#0078d4",
          color: "#fff", border: "none", borderRadius: "4px 0 0 4px",
          fontSize: fz, fontWeight: 700, cursor: pushing ? "default" : "pointer",
          whiteSpace: "nowrap", transition: "background .15s",
        }}
        onMouseEnter={e => { if (!pushing) (e.currentTarget as HTMLElement).style.background = "#106ebe"; }}
        onMouseLeave={e => { if (!pushing) (e.currentTarget as HTMLElement).style.background = "#0078d4"; }}>
        <Send size={iconSz} />
        {pushing ? "Pushing…" : "Push to Approvals"}
      </button>

      {/* Chevron to open priority */}
      <button onClick={() => setShowPrio(p => !p)} disabled={pushing}
        style={{ padding: sm ? "3px 5px" : "5px 7px", background: "#005a9e",
          color: "#fff", border: "none", borderRadius: "0 4px 4px 0",
          cursor: "pointer", display: "flex", alignItems: "center" }}>
        <ChevronDown size={iconSz} />
      </button>
    </div>
  );
}
