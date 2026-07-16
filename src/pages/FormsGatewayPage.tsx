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
import { useNavigate } from "react-router-dom";
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
  const { session, user, profile } = useAuth();
  const [forms, setForms] = useState<FormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [search, setSearch] = useState("");
  const [pendingForm, setPendingForm] = useState<FormRow | null>(null);

  // sign-in panel state (inline — no redirect away from the gateway)
  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
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

  useEffect(() => { loadBrand(); loadForms(); }, [loadBrand, loadForms]);

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
                {list.map(f => (
                  <button key={f.form_id} onClick={() => chooseForm(f)}
                    style={{ textAlign: "left", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", transition: "box-shadow .15s" }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{f.title}</div>
                    {f.description && <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>{f.description}</div>}
                    <div style={{ fontSize: 11, color: A, fontWeight: 700 }}>{session ? "Continue →" : "Sign in to answer →"}</div>
                  </button>
                ))}
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
