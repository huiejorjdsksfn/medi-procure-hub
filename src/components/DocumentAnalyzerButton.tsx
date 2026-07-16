/**
 * DocumentAnalyzerButton — AI-powered "fill this form from a document"
 * Lets an admin upload a PDF or image (business cert, catalog page,
 * scanned invoice, etc.) and asks the analyze-document edge function
 * (Claude, vision/document input) to extract structured fields matching
 * a named target schema. Extracted fields are shown for review — the
 * admin picks which ones to apply — before anything touches form state.
 */
import { useRef, useState } from "react";
import { Sparkles, Upload, Loader2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { T } from "@/lib/theme";
import { toast } from "@/hooks/use-toast";

export type AnalyzerTarget = "supplier" | "item" | "requisition" | "purchase_order";

interface Props {
  target: AnalyzerTarget;
  onApply: (fields: Record<string, any>) => void;
  label?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(",")[1] || "");
    r.onerror = () => reject(new Error("Could not read file"));
    r.readAsDataURL(file);
  });
}

export default function DocumentAnalyzerButton({ target, onApply, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [extracted, setExtracted] = useState<Record<string, any> | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 15MB", variant: "destructive" });
      return;
    }
    const isPdf = file.type === "application/pdf";
    if (!isPdf && !file.type.startsWith("image/")) {
      toast({ title: "Unsupported file", description: "Upload a PDF or an image", variant: "destructive" });
      return;
    }
    setBusy(true); setError(null); setExtracted(null);
    try {
      const fileBase64 = await fileToBase64(file);
      const { data, error: fnErr } = await supabase.functions.invoke("analyze-document", {
        body: { target, fileBase64, mimeType: file.type, fileName: file.name },
      });
      if (fnErr) throw fnErr;
      if (!data?.ok) throw new Error(data?.error || "Analysis failed");
      const fields = data.extracted || {};
      if (!Object.keys(fields).length) {
        toast({ title: "Nothing found", description: "The AI couldn't find matching fields in this document." });
      } else {
        setExtracted(fields);
        setSelected(Object.fromEntries(Object.keys(fields).map(k => [k, true])));
      }
    } catch (e: any) {
      setError(e.message || "Analysis failed");
      toast({ title: "AI analysis failed", description: e.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const applySelected = () => {
    if (!extracted) return;
    const chosen: Record<string, any> = {};
    for (const k of Object.keys(extracted)) if (selected[k]) chosen[k] = extracted[k];
    onApply(chosen);
    toast({ title: `✓ Applied ${Object.keys(chosen).length} field(s)` });
    setExtracted(null);
  };

  return (
    <div style={{ display: "inline-block" }}>
      <input ref={inputRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
        style={{
          display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontFamily: T.font,
          border: `1px solid ${T.primary}`, background: busy ? T.bg2 : `${T.primary}12`, color: T.primary,
          padding: "5px 12px", borderRadius: 4, cursor: busy ? "wait" : "pointer", fontWeight: 600,
        }}>
        {busy ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={13} />}
        {busy ? "Analyzing…" : (label || "Fill from document (AI)")}
      </button>
      {error && <div style={{ fontSize: 10, color: T.error, marginTop: 4 }}>{error}</div>}

      {extracted && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(10,22,40,.55)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setExtracted(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, width: 420,
            maxHeight: "80vh", overflowY: "auto", padding: 16, fontFamily: T.font,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13 }}>
                <Sparkles size={14} color={T.primary} /> Review extracted fields
              </div>
              <button onClick={() => setExtracted(null)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 11, color: T.fgMuted, marginBottom: 10 }}>
              Uncheck anything you don't want applied to the form.
            </div>
            {Object.entries(extracted).map(([k, v]) => (
              <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer" }}>
                <input type="checkbox" checked={!!selected[k]} onChange={e => setSelected(s => ({ ...s, [k]: e.target.checked }))} style={{ marginTop: 3 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: T.fgMuted, textTransform: "uppercase", letterSpacing: .5 }}>{k.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 12, wordBreak: "break-word" }}>{typeof v === "object" ? JSON.stringify(v) : String(v)}</div>
                </div>
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button onClick={() => setExtracted(null)} style={{ padding: "6px 14px", fontSize: 11, border: `1px solid ${T.border}`, background: T.bg2, borderRadius: 4, cursor: "pointer" }}>Cancel</button>
              <button onClick={applySelected} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", fontSize: 11, fontWeight: 600, border: "none", background: T.primary, color: "#fff", borderRadius: 4, cursor: "pointer" }}>
                <Check size={12} /> Apply to form
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
