/**
 * ProcurBosse  -- PrintButton v1.0
 * Universal print button for all pages
 * Logs print to audit table * D365 styled
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Printer, Loader2 } from "lucide-react";
import { T } from "@/lib/theme";

interface PrintButtonProps {
  page: string;
  entityType?: string;
  entityId?: string;
  label?: string;
  style?: React.CSSProperties;
}

export function PrintButton({ page, entityType, entityId, label = "Print", style }: PrintButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const db = supabase as any;

  const handlePrint = async () => {
    setLoading(true);
    // Log print action
    try {
      await db.from("print_log").insert({
        page, entity_type: entityType || null, entity_id: entityId || null,
        printed_by: user?.id, created_at: new Date().toISOString(),
      });
    } catch {}
    // Trigger browser print
    window.print();
    setLoading(false);
  };

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "6px 14px", background: "#fff", color: T.fgMuted,
        border: `1px solid ${T.border}`, borderRadius: T.r,
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        fontFamily: "'Segoe UI','Inter',system-ui,sans-serif",
        ...style,
      }}
      onMouseEnter={e => { (e.currentTarget as any).style.background = T.bg; }}
      onMouseLeave={e => { (e.currentTarget as any).style.background = "#fff"; }}
    >
      {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Printer size={13} />}
      {label}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}} @media print{.no-print{display:none!important}}`}</style>
    </button>
  );
}
