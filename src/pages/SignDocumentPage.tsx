/**
 * SignDocumentPage — EL5 MediProcure
 * Public, unauthenticated document-signing page reached via a one-time
 * link (/#/sign/:token) sent by email or in-app notification. Lets a
 * signee review the document, draw or upload a signature image, and
 * submit it — updating document_signees + documents via SECURITY DEFINER
 * RPCs (get_signee_by_token / submit_signee_signature / decline_signee_signature).
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const BLUE = "#0e2a4a";
const TEAL = "#0e7490";

interface SigneeRow {
  signee_id: string; document_id: string; signee_name: string; signee_role: string;
  signee_email: string; status: string; due_date: string | null; signed_at: string | null;
  doc_name: string; doc_category: string; doc_html: string;
  doc_requires_signature: boolean; doc_signature_status: string;
}

export default function SignDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [row, setRow] = useState<SigneeRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<"signed" | "declined" | null>(null);

  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [sigData, setSigData] = useState("");
  const [drawing, setDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const load = useCallback(async () => {
    if (!token) { setError("Missing or invalid signing link."); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: err } = await db.rpc("get_signee_by_token", { p_token: token });
      if (err) throw err;
      const r: SigneeRow | undefined = Array.isArray(data) ? data[0] : data;
      if (!r) { setError("This signing link is invalid or has expired."); setLoading(false); return; }
      setRow(r);
      if (r.status === "signed") setDone("signed");
      if (r.status === "declined") setDone("declined");
    } catch {
      setError("Unable to load this document. Please check the link and try again.");
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  /* ── canvas draw ─────────────────────────────────────────────── */
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, type: "start"|"move"|"end") => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    if (!point) return;
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = BLUE; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (type === "start") { ctx.beginPath(); ctx.moveTo(x, y); setDrawing(true); }
    if (type === "move" && drawing) { ctx.lineTo(x, y); ctx.stroke(); }
    if (type === "end") { setDrawing(false); setSigData(canvas.toDataURL()); }
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setSigData("");
  };

  const fileToB64 = (file: File): Promise<string> =>
    new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });

  const submit = async () => {
    if (!sigData) { setError("Please draw or upload your signature first."); return; }
    if (!token) return;
    setSubmitting(true); setError("");
    try {
      const { data, error: err } = await db.rpc("submit_signee_signature", {
        p_token: token, p_signature_image: sigData, p_ip: null,
      });
      if (err) throw err;
      const res = Array.isArray(data) ? data[0] : data;
      if (!res?.ok) throw new Error("Could not submit signature — this link may have already been used.");
      setDone("signed");
    } catch (e: any) {
      setError(e.message || "Failed to submit signature. Please try again.");
    } finally { setSubmitting(false); }
  };

  const decline = async () => {
    if (!token) return;
    setSubmitting(true); setError("");
    try {
      const { error: err } = await db.rpc("decline_signee_signature", { p_token: token, p_reason: declineReason || null });
      if (err) throw err;
      setDone("declined");
    } catch {
      setError("Failed to decline. Please try again.");
    } finally { setSubmitting(false); }
  };

  const wrap: React.CSSProperties = { minHeight: "100vh", background: "#eef2f6", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", padding: "28px 16px" };
  const card: React.CSSProperties = { maxWidth: 760, margin: "0 auto", background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,.1)", overflow: "hidden" };
  const header: React.CSSProperties = { background: `linear-gradient(135deg,${BLUE} 0%,${TEAL} 100%)`, padding: "22px 28px", color: "#fff" };

  if (loading) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#64748b", fontWeight: 600 }}>Loading document…</div>
    </div>
  );

  if (error && !row) return (
    <div style={wrap}><div style={card}>
      <div style={header}><div style={{ fontWeight: 800, fontSize: 18 }}>🏥 EL5 MediProcure</div></div>
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, color: BLUE, marginBottom: 6 }}>Link unavailable</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>{error}</div>
      </div>
    </div></div>
  );

  if (done === "signed") return (
    <div style={wrap}><div style={card}>
      <div style={header}><div style={{ fontWeight: 800, fontSize: 18 }}>🏥 EL5 MediProcure</div></div>
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <div style={{ fontWeight: 800, color: "#166534", fontSize: 17, marginBottom: 6 }}>Signed successfully</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>Thank you, {row?.signee_name}. Your signature on "{row?.doc_name}" has been recorded and the document owner has been notified.</div>
      </div>
    </div></div>
  );

  if (done === "declined") return (
    <div style={wrap}><div style={card}>
      <div style={header}><div style={{ fontWeight: 800, fontSize: 18 }}>🏥 EL5 MediProcure</div></div>
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🚫</div>
        <div style={{ fontWeight: 800, color: "#991b1b", fontSize: 17, marginBottom: 6 }}>Signature declined</div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>You've declined to sign "{row?.doc_name}". The document owner has been notified.</div>
      </div>
    </div></div>
  );

  return (
    <div style={wrap}><div style={card}>
      <div style={header}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>🏥 EL5 MediProcure</div>
        <div style={{ fontSize: 11, opacity: .8, marginTop: 2 }}>Signature Request</div>
      </div>

      <div style={{ padding: "20px 28px 8px" }}>
        <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{row?.doc_category || "Document"}</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: BLUE, marginTop: 2 }}>{row?.doc_name}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
          Signing as <strong style={{ color: "#374151" }}>{row?.signee_name}</strong>
          {row?.signee_role ? <> · {row.signee_role}</> : null}
          {row?.due_date ? <> · Due {new Date(row.due_date).toLocaleDateString("en-KE")}</> : null}
        </div>
      </div>

      <div style={{ margin: "14px 28px", border: "1px solid #e5e7eb", borderRadius: 8, maxHeight: 340, overflowY: "auto", padding: "16px 20px", background: "#fafafa", fontSize: 12.5, lineHeight: 1.6, color: "#1f2937" }}
        dangerouslySetInnerHTML={{ __html: row?.doc_html || "<em style='color:#9ca3af'>No preview available for this document.</em>" }} />

      <div style={{ margin: "0 28px 8px", padding: "12px 16px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
        By signing below you confirm you have reviewed this document and agree to apply your signature to it.
      </div>

      <div style={{ margin: "14px 28px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => setMode("draw")} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${mode==="draw"?TEAL:"#e5e7eb"}`, background: mode==="draw"?`${TEAL}12`:"#fff", color: mode==="draw"?TEAL:"#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✏ Draw Signature</button>
          <button onClick={() => setMode("upload")} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${mode==="upload"?TEAL:"#e5e7eb"}`, background: mode==="upload"?`${TEAL}12`:"#fff", color: mode==="upload"?TEAL:"#6b7280", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>⬆ Upload Picture</button>
        </div>

        {mode === "draw" ? (
          <div>
            <canvas ref={canvasRef} width={680} height={160}
              style={{ width: "100%", maxWidth: 680, height: 160, border: "1.5px dashed #cbd5e1", borderRadius: 8, background: "#fff", touchAction: "none", cursor: "crosshair" }}
              onMouseDown={e=>draw(e,"start")} onMouseMove={e=>draw(e,"move")} onMouseUp={e=>draw(e,"end")} onMouseLeave={e=>drawing&&draw(e,"end")}
              onTouchStart={e=>draw(e,"start")} onTouchMove={e=>draw(e,"move")} onTouchEnd={e=>draw(e,"end")} />
            <button onClick={clearCanvas} style={{ marginTop: 6, fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Clear</button>
          </div>
        ) : (
          <div>
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) setSigData(await fileToB64(f)); }} style={{ fontSize: 12 }} />
            {sigData && <img src={sigData} alt="signature preview" style={{ display: "block", marginTop: 10, maxHeight: 100, border: "1px solid #e5e7eb", borderRadius: 6, padding: 6 }} />}
          </div>
        )}
      </div>

      {error && <div style={{ margin: "0 28px 10px", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, padding: "16px 28px 26px" }}>
        <button onClick={submit} disabled={submitting || !sigData}
          style={{ flex: 1, padding: "11px 0", background: submitting || !sigData ? "#94a3b8" : `linear-gradient(135deg,${TEAL} 0%,#0891b2 100%)`, color: "#fff", fontWeight: 800, fontSize: 13.5, border: "none", borderRadius: 7, cursor: submitting || !sigData ? "default" : "pointer" }}>
          {submitting ? "Submitting…" : "✍ Sign Document"}
        </button>
        {!showDecline ? (
          <button onClick={() => setShowDecline(true)} style={{ padding: "11px 18px", background: "#fff", color: "#991b1b", fontWeight: 700, fontSize: 12.5, border: "1.5px solid #fecaca", borderRadius: 7, cursor: "pointer" }}>Decline</button>
        ) : (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={declineReason} onChange={e=>setDeclineReason(e.target.value)} placeholder="Reason (optional)"
              style={{ fontSize: 12, padding: "9px 10px", border: "1px solid #e5e7eb", borderRadius: 6, width: 160 }} />
            <button onClick={decline} disabled={submitting} style={{ padding: "10px 14px", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 12, border: "none", borderRadius: 6, cursor: "pointer" }}>Confirm</button>
          </div>
        )}
      </div>
    </div></div>
  );
}
