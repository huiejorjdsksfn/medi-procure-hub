/**
 * FormsGatewayPage — ProcurBosse v12
 * Public entry point at /forms. Users browse published internal forms
 * (branded with the hospital's live logo/colors from `facilities`),
 * choose one, sign in with their MediProcure account if they aren't
 * already, and are then taken to /forms/:formId to answer it — with
 * their name/email pre-known so the answer page can attribute the
 * response to a real staff account instead of an anonymous one.
 */
import type React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

interface FormRow {
  form_id: string;
  title: string;
  description?: string;
  field_definitions?: { category?: string; questions?: any[] };
  response_count?: number;
  published_at?: string;
}

interface Brand {
  name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
}

const DEFAULT_BRAND: Brand = {
  name: "EL5 MediProcure · Embu Level 5 Hospital",
  logo_url: null,
  primary_color: "#0a2558",
  accent_color: "#C45911",
};

export default function FormsGatewayPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextFormId = searchParams.get("next");
  const { session, user, profile } = useAuth();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [search, setSearch] = useState("");
  const [pendingForm, setPendingForm] = useState<FormRow | null>(null);
  const [mySubmissions, setMySubmissions] = useState<Record<string, number>>({});

  // sign-in panel state (inline — no redirect away from the gateway)
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signingInGoogle, setSigningInGoogle] = useState(false);
  const [authError, setAuthError] = useState("");

  const loadBrand = useCallback(async () => {
    try {
      const { data } = await db.from("facilities").select("name,logo_url,primary_color,accent_color").eq("is_main", true).maybeSingle();
      if (data) setBrand({ name: data.name || DEFAULT_BRAND.name, logo_url: data.logo_url || null, primary_color: data.primary_color || DEFAULT_BRAND.primary_color, accent_color: data.accent_color || DEFAULT_BRAND.accent_color });
    } catch { /* keep default brand — never block the page on branding */ }
  }, []);

  const loadForms = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await db.from("google_forms").select("form_id,title,description,field_definitions,response_count,published_at").eq("is_active", true).order("published_at", { ascending: false });
      if (error) throw error;
      setForms(data || []);
    } catch {
      setForms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // form_responses has no top-level user_id column (only a metadata jsonb
  // blob) — respondent_email is the reliable real column to match against,
  // and PublicFormPage always sets it (from the form's own email field, or
  // falling back to the signed-in user's email).
  const loadMySubmissions = useCallback(async () => {
    if (!user?.email) { setMySubmissions({}); return; }
    try {
      const { data } = await db.from("form_responses").select("form_id").eq("respondent_email", user.email);
      const counts: Record<string, number> = {};
      for (const r of data || []) counts[r.form_id] = (counts[r.form_id] || 0) + 1;
      setMySubmissions(counts);
    } catch { /* non-critical — just skip the "already submitted" badge */ }
  }, [user?.email]);

  useEffect(() => { loadBrand(); loadForms(); }, [loadBrand, loadForms]);
  useEffect(() => { loadMySubmissions(); }, [loadMySubmissions]);

  // Deep link from PublicFormPage: /forms/:formId → (not signed in) → /forms?next=:formId.
  // Once forms are loaded, resolve it: skip straight through if already signed
  // in, otherwise open the sign-in panel pre-targeted at that form.
  useEffect(() => {
    if (!nextFormId || loading) return;
    if (session) { navigate(`/forms/${nextFormId}`, { replace: true }); return; }
    const target = forms.find(f => f.form_id === nextFormId);
    if (target) setPendingForm(target);
  }, [nextFormId, loading, forms, session, navigate]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return forms;
    return forms.filter(f => f.title?.toLowerCase().includes(s) || f.field_definitions?.category?.toLowerCase().includes(s) || f.description?.toLowerCase().includes(s));
  }, [forms, search]);

  const grouped = useMemo(() => {
    const g: Record<string, FormRow[]> = {};
    for (const f of filtered) {
      const cat = f.field_definitions?.category || "General";
      (g[cat] ||= []).push(f);
    }
    return g;
  }, [filtered]);

  const chooseForm = (f: FormRow) => {
    if (session) {
      navigate(`/forms/${f.form_id}`);
    } else {
      setAuthError("");
      setPendingForm(f);
    }
  };

  const doSignIn = async () => {
    if (!identifier.trim() || !password) { setAuthError("Enter your username/email and password."); return; }
    setSigningIn(true);
    setAuthError("");
    try {
      let email = identifier.trim();
      if (!email.includes("@")) {
        // Resolve username -> email via the pre-auth RPC added in the
        // 20260715120000 migration, same one LoginPage.tsx uses.
        const { data: resolved, error: rpcErr } = await db.rpc("get_email_by_username", { p_username: email });
        if (rpcErr || !resolved) { setAuthError("No account found for that username."); setSigningIn(false); return; }
        email = resolved;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthError(error.message || "Sign-in failed. Check your credentials."); setSigningIn(false); return; }
      // AuthContext's onAuthStateChange picks up the SIGNED_IN event and
      // populates `session` on its own — once it does, proceed to the form.
      if (pendingForm) navigate(`/forms/${pendingForm.form_id}`);
    } catch (e: any) {
      setAuthError(e?.message || "Sign-in failed.");
    } finally {
      setSigningIn(false);
    }
  };

  const doGoogleSignIn = async () => {
    setAuthError("");
    setSigningInGoogle(true);
    try {
      const formId = pendingForm?.form_id || nextFormId;
      // Land back on the gateway with ?next= set so the deep-link effect
      // above sends the user straight into the right form once the
      // OAuth redirect completes and AuthContext picks up the session.
      const redirectTo = `${window.location.origin}${window.location.pathname}#/forms${formId ? `?next=${encodeURIComponent(formId)}` : ""}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (error) { setAuthError(error.message || "Google sign-in failed."); setSigningInGoogle(false); }
      // On success the browser navigates away to Google, so nothing more to do here.
    } catch (e: any) {
      setAuthError(e?.message || "Google sign-in failed.");
      setSigningInGoogle(false);
    }
  };

  // If a sign-in completes (session appears) while a form choice is pending, continue automatically.
  useEffect(() => {
    if (session && pendingForm) navigate(`/forms/${pendingForm.form_id}`);
  }, [session, pendingForm, navigate]);

  const P = brand.primary_color, A = brand.accent_color;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <div style={{ background: `linear-gradient(135deg,${P},${A})`, color: "#fff", padding: "28px 20px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="" style={{ height: 44, width: 44, borderRadius: 10, objectFit: "cover", background: "#fff" }} />
          ) : (
            <div style={{ height: 44, width: 44, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800 }}>🏥</div>
          )}
          <div>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: "0.08em" }}>{brand.name.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Forms</div>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: "18px auto 0" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search forms…"
            style={{ width: "100%", padding: "11px 16px", borderRadius: 10, border: "none", fontSize: 14, boxSizing: "border-box" as const, outline: "none" }} />
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "-34px auto 40px", padding: "0 20px" }}>
        {session && (
          <div style={{ background: "#fff", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 12.5, color: "#334155", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
            Signed in as <b>{profile?.full_name || user?.email}</b>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b", fontSize: 13 }}>Loading forms…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: "#fff", borderRadius: 12, padding: 50, textAlign: "center", color: "#64748b", fontSize: 13, boxShadow: "0 2px 14px rgba(0,0,0,0.06)" }}>
            No forms are published yet.
          </div>
        ) : (
          Object.entries(grouped).map(([cat, list]) => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", letterSpacing: "0.04em", marginBottom: 10, textTransform: "uppercase" as const }}>{cat}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
                {list.map(f => {
                  const mySubs = mySubmissions[f.form_id] || 0;
                  return (
                  <button key={f.form_id} onClick={() => chooseForm(f)}
                    style={{ textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", transition: "box-shadow .15s", position: "relative" }}>
                    {mySubs > 0 && (
                      <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9.5, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 7px", borderRadius: 20 }}>
                        ✓ Submitted{mySubs > 1 ? ` ×${mySubs}` : ""}
                      </div>
                    )}
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 4, paddingRight: mySubs > 0 ? 70 : 0 }}>{f.title}</div>
                    {f.description && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>{f.description}</div>}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 11, color: A, fontWeight: 700 }}>{session ? "Continue →" : "Sign in to answer →"}</div>
                      {typeof f.response_count === "number" && f.response_count > 0 && (
                        <div style={{ fontSize: 10.5, color: "#94a3b8" }}>{f.response_count} response{f.response_count === 1 ? "" : "s"}</div>
                      )}
                    </div>
                  </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {pendingForm && !session && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) setPendingForm(null); }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 380, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Sign in to answer</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 18 }}>{pendingForm.title}</div>

            <button onClick={doGoogleSignIn} disabled={signingInGoogle}
              style={{ width: "100%", padding: 10, background: "#fff", color: "#3c4043", border: "1.5px solid #dadce0", borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: signingInGoogle ? 0.6 : 1, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.85.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
              </svg>
              {signingInGoogle ? "Redirecting…" : "Continue with Google"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>OR</div>
              <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 5 }}>Username or email</label>
            <input value={identifier} onChange={e => setIdentifier(e.target.value)} onKeyDown={e => e.key === "Enter" && doSignIn()}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, marginBottom: 12, boxSizing: "border-box" as const }} />

            <label style={{ fontSize: 12, fontWeight: 600, color: "#334155", display: "block", marginBottom: 5 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && doSignIn()}
              style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, marginBottom: 14, boxSizing: "border-box" as const }} />

            {authError && <div style={{ color: "#dc2626", fontSize: 12, marginBottom: 12 }}>{authError}</div>}

            <button onClick={doSignIn} disabled={signingIn}
              style={{ width: "100%", padding: 11, background: P, color: "#fff", border: "none", borderRadius: 8, fontSize: 13.5, fontWeight: 700, cursor: "pointer", opacity: signingIn ? 0.6 : 1, marginBottom: 8 }}>
              {signingIn ? "Signing in…" : "Sign In & Continue"}
            </button>
            <button onClick={() => setPendingForm(null)}
              style={{ width: "100%", padding: 10, background: "transparent", color: "#64748b", border: "none", fontSize: 12.5, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
