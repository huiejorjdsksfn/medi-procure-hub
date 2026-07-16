/**
 * PublicFormPage — ProcurBosse v13
 * Form-fill page for forms created in the Admin Panel Forms Builder.
 * Reached at /forms/:formId (HashRouter), normally via FormsGatewayPage
 * (/forms) which handles the choose → sign-in step first.
 *
 * v13: now requires a signed-in MediProcure account — a direct link
 * visited while signed out is bounced to /forms (the gateway) which
 * handles sign-in and sends the user right back here. Responses are
 * now attributed to the real authenticated user, not left anonymous.
 * Branding (logo/colors) is pulled live from `facilities` instead of
 * a hardcoded navy gradient.
 */
import type React from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

interface QuestionDef {
  q: string;
  t: "text" | "email" | "tel" | "date" | "select" | "textarea" | "file" | "checkbox" | "radio";
  opts?: string;
  req?: boolean;
}

interface Brand {
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
}
const DEFAULT_BRAND: Brand = { name: "EL5 MEDIPROCURE · EMBU LEVEL 5 HOSPITAL", logo_url: null, primary_color: "#1a3a6b", accent_color: "#2a5fc3" };

export default function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { session, user, profile, loading: authLoading } = useAuth() as any;
  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionDef[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);

  useEffect(() => {
    if (!authLoading && !session && formId) {
      navigate(`/forms?next=${encodeURIComponent(formId)}`, { replace: true });
    }
  }, [authLoading, session, formId, navigate]);

  const loadBrand = useCallback(async () => {
    try {
      const { data } = await db.from("facilities").select("name,logo_url,primary_color,accent_color").eq("is_main", true).maybeSingle();
      if (data) setBrand({ name: (data.name || DEFAULT_BRAND.name).toUpperCase(), logo_url: data.logo_url || null, primary_color: data.primary_color || DEFAULT_BRAND.primary_color, accent_color: data.accent_color || DEFAULT_BRAND.accent_color });
    } catch { /* keep default brand */ }
  }, []);

  const load = useCallback(async () => {
    if (!formId) { setError("Missing form ID."); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: err } = await db
        .from("google_forms")
        .select("*")
        .eq("form_id", formId)
        .eq("is_active", true)
        .maybeSingle();
      if (err) throw err;
      if (!data) { setError("This form is no longer available or has not been published."); setLoading(false); return; }
      setForm(data);
      const fd = data.field_definitions;
      const qs: QuestionDef[] = Array.isArray(fd?.questions) ? fd.questions : Array.isArray(fd) ? fd : [];
      setQuestions(qs);
    } catch {
      setError("Unable to load this form. Please check the link and try again.");
    } finally {
      setLoading(false);
    }
  }, [formId]);

  useEffect(() => { loadBrand(); if (session) load(); }, [load, loadBrand, session]);

  useEffect(() => {
    if (!user?.email || !questions.length) return;
    const emailQ = questions.find(q => q.t === "email");
    if (emailQ && !answers[emailQ.q]) setAnswers(p => ({ ...p, [emailQ.q]: user.email }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, user]);

  const setAnswer = (q: string, v: string) => setAnswers(p => ({ ...p, [q]: v }));

  const validate = () => {
    for (const q of questions) {
      if (q.req && !answers[q.q]?.trim()) return `"${q.q}" is required.`;
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError("");
    setSubmitting(true);
    try {
      const emailField = questions.find(q => q.t === "email");
      await db.from("form_responses").insert({
        form_id: formId,
        respondent_email: (emailField ? answers[emailField.q] : null) || user?.email || null,
        responses: answers,
        metadata: {
          submitted_via: "forms_gateway",
          form_title: form?.title,
          user_id: user?.id || null,
          user_name: profile?.full_name || null,
        },
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong submitting your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !session) {
    return (
      <div style={page}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Checking sign-in…</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={page}>
        <div style={{ color: "#64748b", fontSize: 14 }}>Loading form…</div>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Form Unavailable</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={page}>
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>Response Submitted</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Thank you — your response to "{form?.title}" has been recorded.</div>
          <button onClick={() => navigate("/forms")} style={{ marginTop: 18, padding: "9px 18px", background: brand.primary_color, color: "#fff", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ background: `linear-gradient(135deg,${brand.primary_color},${brand.accent_color})`, padding: "20px 24px", color: "#fff", display: "flex", alignItems: "center", gap: 12 }}>
          {brand.logo_url && <img src={brand.logo_url} alt="" style={{ height: 34, width: 34, borderRadius: 8, objectFit: "cover", background: "#fff" }} />}
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>{brand.name}</div>
            <div style={{ fontSize: 19, fontWeight: 800 }}>{form?.title}</div>
            {form?.description && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>{form.description}</div>}
          </div>
        </div>

        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 16 }}>
            Answering as <b style={{ color: "#475569" }}>{profile?.full_name || user?.email}</b>
          </div>

          {questions.map((q, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
                {q.q}{q.req && <span style={{ color: "#dc2626" }}> *</span>}
              </label>
              {q.t === "textarea" ? (
                <textarea value={answers[q.q] || ""} onChange={e => setAnswer(q.q, e.target.value)}
                  style={{ ...input, minHeight: 80, resize: "vertical" as const }} />
              ) : q.t === "select" ? (
                <select value={answers[q.q] || ""} onChange={e => setAnswer(q.q, e.target.value)} style={input}>
                  <option value="">— Select —</option>
                  {(q.opts || "").split(",").map(o => o.trim()).filter(Boolean).map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : q.t === "radio" ? (
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                  {(q.opts || "").split(",").map(o => o.trim()).filter(Boolean).map(o => (
                    <label key={o} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                      <input type="radio" name={q.q} checked={answers[q.q] === o} onChange={() => setAnswer(q.q, o)} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : q.t === "checkbox" ? (
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#374151" }}>
                  <input type="checkbox" checked={answers[q.q] === "true"} onChange={e => setAnswer(q.q, e.target.checked ? "true" : "false")} />
                  Yes
                </label>
              ) : q.t === "file" ? (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 0" }}>
                  File uploads aren't supported on this form yet — please describe the attachment in a text answer or email it separately.
                </div>
              ) : (
                <input type={q.t === "date" ? "date" : q.t === "email" ? "email" : q.t === "tel" ? "tel" : "text"}
                  value={answers[q.q] || ""} onChange={e => setAnswer(q.q, e.target.value)} style={input} />
              )}
            </div>
          ))}

          {error && <div style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button onClick={submit} disabled={submitting}
            style={{ width: "100%", padding: "12px", background: brand.primary_color, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "#f1f5f9", padding: 20,
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 560, background: "#fff", borderRadius: 14,
  boxShadow: "0 10px 40px rgba(0,0,0,0.1)", overflow: "hidden",
};
const input: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
  fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
};
