/**
 * EL5 MediProcure - Company Onboarding Wizard
 * Walks an admin through deploying the system for a new company/facility:
 *   1. Company info        -> creates a company_deployments record
 *   2. Database connection  -> external_connections (SQL Server/MySQL/Postgres) or "skip, I'll upload files"
 *   3. Import data          -> CSV/XLSX upload with column mapping -> batched insert,
 *                              or a live pull through the on-prem ODBC bridge (mssql-import) when configured
 *   4. Review & go live     -> creates the facilities record, marks the deployment completed
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { T } from "@/lib/theme";
import AdminBreadcrumb from "@/components/AdminBreadcrumb";
import Papa from "papaparse";
import * as XLSX from "@e965/xlsx";
import {
  Building2, Database, Upload, CheckCircle2, ArrowRight, ArrowLeft,
  Loader2, Wifi, FileSpreadsheet, Plus, X, AlertTriangle, Server,
} from "lucide-react";

const db = supabase as any;

/* ── styles ─────────────────────────────────────────────────────── */
const card: React.CSSProperties = { background: T.card, border: `1px solid ${T.border}`, borderRadius: T.rLg, boxShadow: "0 1px 4px rgba(0,0,0,.06)" };
const inp: React.CSSProperties = { width: "100%", border: `1px solid ${T.border}`, borderRadius: T.r, padding: "8px 12px", fontSize: 13, outline: "none", background: T.card, color: T.fg, boxSizing: "border-box" };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: T.fgMuted, marginBottom: 4, display: "block" };
const btnS = (bg: string, border?: string): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 18px",
  background: bg, color: border ? T.fgMuted : "#fff", border: `1px solid ${border || "transparent"}`,
  borderRadius: T.r, fontSize: 13, fontWeight: 700, cursor: "pointer",
});

/* ── steps ──────────────────────────────────────────────────────── */
const STEPS = [
  { id: "company", label: "Company Info" },
  { id: "connection", label: "Database" },
  { id: "import", label: "Import Data" },
  { id: "review", label: "Review & Go Live" },
] as const;
type StepId = typeof STEPS[number]["id"];

/* ── DB connection types (live-test only wired for SQL Server today) ── */
const DB_TYPES = [
  { value: "mssql", label: "SQL Server", port: "1433", testable: true, notes: "ODBC Driver 17/18 — testable via TCP+TDS probe" },
  { value: "mysql", label: "MySQL / MariaDB", port: "3306", testable: false, notes: "Save details now; live test coming soon" },
  { value: "postgresql", label: "PostgreSQL", port: "5432", testable: false, notes: "Save details now; live test coming soon" },
];

/* ── target tables available for mapped import ─────────────────── */
interface FieldDef { key: string; label: string; required?: boolean; type?: "number" }
const TARGET_TABLES: Record<string, { label: string; facilityScoped?: boolean; fields: FieldDef[] }> = {
  suppliers: {
    label: "Suppliers", facilityScoped: true,
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "contact_person", label: "Contact Person" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address", label: "Address" },
      { key: "category", label: "Category" },
      { key: "tax_id", label: "Tax / KRA PIN" },
      { key: "status", label: "Status" },
    ],
  },
  items: {
    label: "Items / Inventory", facilityScoped: true,
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "sku", label: "SKU" },
      { key: "description", label: "Description" },
      { key: "unit_of_measure", label: "Unit" },
      { key: "unit_price", label: "Unit Price", type: "number" },
      { key: "quantity_in_stock", label: "Qty in Stock", type: "number" },
      { key: "reorder_level", label: "Reorder Level", type: "number" },
      { key: "item_type", label: "Item Type" },
      { key: "category_name", label: "Category" },
      { key: "supplier_name", label: "Supplier" },
      { key: "department_name", label: "Department" },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "location", label: "Storage Location" },
    ],
  },
  departments: {
    label: "Departments",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "code", label: "Code" },
      { key: "head_name", label: "Head of Department" },
      { key: "head_email", label: "Head Email" },
      { key: "head_phone", label: "Head Phone" },
      { key: "budget", label: "Budget", type: "number" },
      { key: "description", label: "Description" },
    ],
  },
  item_categories: {
    label: "Item Categories",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
};

/* ── file parsing helpers ──────────────────────────────────────── */
async function parseFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        complete: (res) => {
          const data = (res.data as string[][]).filter(r => r.some(c => c && String(c).trim() !== ""));
          if (!data.length) return reject(new Error("File appears empty"));
          resolve({ headers: data[0].map(h => String(h).trim()), rows: data.slice(1) });
        },
        error: (err) => reject(err),
      });
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const filtered = data.filter(r => r.some(c => c !== "" && c != null));
  if (!filtered.length) throw new Error("File appears empty");
  return { headers: filtered[0].map((h: any) => String(h).trim()), rows: filtered.slice(1).map(r => r.map((c: any) => (c == null ? "" : String(c)))) };
}

function coerceValue(raw: string | undefined, field: FieldDef): any {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (v === "") return null;
  if (field.type === "number") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

export default function CompanyOnboardingPage() {
  const nav = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();

  const [step, setStep] = useState<StepId>("company");
  const [deployment, setDeployment] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  /* Step 1 form */
  const [form, setForm] = useState({
    company_name: "", facility_code: "", contact_name: "",
    contact_email: "", contact_phone: "", county: "", notes: "",
  });

  /* Step 2 form */
  const [skipDb, setSkipDb] = useState(false);
  const [connForm, setConnForm] = useState({
    name: "", type: "mssql", host: "", port: "1433", database_name: "",
    username: "", password: "", auth_mode: "sql", encrypt: true,
  });
  const [connection, setConnection] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  /* Step 3 */
  const [jobs, setJobs] = useState<any[]>([]);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importTable, setImportTable] = useState("suppliers");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: dep } = await db.from("company_deployments").select("*").eq("id", id).maybeSingle();
      if (!dep) { toast({ title: "Deployment not found", variant: "destructive" }); nav("/admin/deployments"); return; }
      setDeployment(dep);
      setForm({
        company_name: dep.company_name || "", facility_code: dep.facility_code || "",
        contact_name: dep.contact_name || "", contact_email: dep.contact_email || "",
        contact_phone: dep.contact_phone || "", county: dep.county || "", notes: dep.notes || "",
      });
      if (dep.external_connection_id) {
        const { data: conn } = await db.from("external_connections").select("*").eq("id", dep.external_connection_id).maybeSingle();
        if (conn) { setConnection(conn); setConnForm(p => ({ ...p, ...conn, password: "" })); }
      } else if (dep.status !== "draft") {
        setSkipDb(true);
      }
      const { data: jobRows } = await db.from("deployment_import_jobs").select("*").eq("deployment_id", id).order("created_at", { ascending: false });
      setJobs(jobRows || []);
      const stepOrder: StepId[] = ["company", "connection", "import", "review"];
      if (stepOrder.includes(dep.current_step)) setStep(dep.current_step);
    } catch (e: any) {
      toast({ title: "Failed to load deployment", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, nav]);

  useEffect(() => { load(); }, [load]);

  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const cf = (k: string, v: any) => setConnForm(p => ({ ...p, [k]: v }));

  /* ── Step 1: save company info ──────────────────────────────── */
  const saveCompanyInfo = async () => {
    if (!form.company_name.trim()) { toast({ title: "Company name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { ...form, current_step: "connection", updated_at: new Date().toISOString() };
      if (deployment) {
        await db.from("company_deployments").update(payload).eq("id", deployment.id);
        setDeployment((p: any) => ({ ...p, ...payload }));
      } else {
        const { data, error } = await db.from("company_deployments")
          .insert({ ...payload, status: "draft", created_by: user?.id })
          .select().single();
        if (error) throw error;
        setDeployment(data);
        nav(`/admin/deployments/${data.id}`, { replace: true });
      }
      setStep("connection");
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Step 2: connection ─────────────────────────────────────── */
  const onTypeChange = (type: string) => {
    const dt = DB_TYPES.find(d => d.value === type);
    cf("type", type);
    if (dt) cf("port", dt.port);
  };

  const saveConnection = async () => {
    if (!deployment) return;
    if (!connForm.name || !connForm.host || !connForm.database_name) {
      toast({ title: "Name, host and database are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: connForm.name, type: connForm.type, host: connForm.host,
        port: parseInt(connForm.port) || 1433, database_name: connForm.database_name,
        username: connForm.username, status: "inactive",
        config: { auth_mode: connForm.auth_mode, encrypt: connForm.encrypt },
        deployment_id: deployment.id, updated_at: new Date().toISOString(),
      };
      if (connForm.password) payload.password = connForm.password;
      let row;
      if (connection) {
        const { data, error } = await db.from("external_connections").update(payload).eq("id", connection.id).select().single();
        if (error) throw error; row = data;
      } else {
        const { data, error } = await db.from("external_connections").insert({ ...payload, created_at: new Date().toISOString() }).select().single();
        if (error) throw error; row = data;
      }
      setConnection(row);
      await db.from("company_deployments").update({ external_connection_id: row.id, status: "db_connected", current_step: "import" }).eq("id", deployment.id);
      setDeployment((p: any) => ({ ...p, external_connection_id: row.id, status: "db_connected", current_step: "import" }));
      toast({ title: "Connection saved" });
      setStep("import");
    } catch (e: any) {
      toast({ title: "Could not save connection", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (connForm.type !== "mssql") {
      toast({ title: "Live test not available for this type yet", description: "Save the details and use the CSV/XLSX import instead.", variant: "destructive" });
      return;
    }
    setTesting(true); setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("mssql-test", {
        body: {
          host: connForm.host, port: connForm.port, database: connForm.database_name,
          username: connForm.username, password: connForm.password, auth_mode: connForm.auth_mode, encrypt: connForm.encrypt,
        },
      });
      if (error) throw error;
      setTestResult(data);
      toast({ title: data?.ok ? "Reachable" : "Not reachable", description: data?.message, variant: data?.ok ? "default" : "destructive" });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const skipDatabase = async () => {
    if (!deployment) return;
    setSaving(true);
    try {
      await db.from("company_deployments").update({ status: "db_connected", current_step: "import" }).eq("id", deployment.id);
      setDeployment((p: any) => ({ ...p, status: "db_connected", current_step: "import" }));
      setSkipDb(true);
      setStep("import");
    } finally {
      setSaving(false);
    }
  };

  /* ── Step 3: import ─────────────────────────────────────────── */
  const onPickFile = async (f0: File | null) => {
    setFile(f0); setParsed(null); setMapping({});
    if (!f0) return;
    setParsing(true);
    try {
      const result = await parseFile(f0);
      setParsed(result);
      const fields = TARGET_TABLES[importTable].fields;
      const auto: Record<string, string> = {};
      fields.forEach(fld => {
        const idx = result.headers.findIndex(h => h.toLowerCase().replace(/[\s_]/g, "") === fld.key.toLowerCase().replace(/[\s_]/g, "") || h.toLowerCase() === fld.label.toLowerCase());
        if (idx >= 0) auto[fld.key] = result.headers[idx];
      });
      setMapping(auto);
    } catch (e: any) {
      toast({ title: "Could not read file", description: e.message, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const runImport = async () => {
    if (!deployment || !parsed || !file) return;
    const tableDef = TARGET_TABLES[importTable];
    const missingRequired = tableDef.fields.filter(fl => fl.required && !mapping[fl.key]);
    if (missingRequired.length) {
      toast({ title: "Map all required fields", description: missingRequired.map(f0 => f0.label).join(", "), variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const { data: jobRow, error: jobErr } = await db.from("deployment_import_jobs").insert({
        deployment_id: deployment.id, source_label: file.name, target_table: importTable,
        method: file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx",
        column_mapping: mapping, total_rows: parsed.rows.length, status: "running", started_at: new Date().toISOString(),
      }).select().single();
      if (jobErr) throw jobErr;

      const headerIdx: Record<string, number> = {};
      parsed.headers.forEach((h, i) => { headerIdx[h] = i; });

      const records = parsed.rows.map(row => {
        const rec: Record<string, any> = {};
        tableDef.fields.forEach(fl => {
          const srcCol = mapping[fl.key];
          if (!srcCol) return;
          const idx = headerIdx[srcCol];
          rec[fl.key] = coerceValue(row[idx], fl);
        });
        if (tableDef.facilityScoped && deployment.facility_id) rec.facility_id = deployment.facility_id;
        return rec;
      }).filter(r => tableDef.fields.find(fl => fl.required) ? r[tableDef.fields.find(fl => fl.required)!.key] : true);

      const BATCH = 200;
      let imported = 0, failed = 0;
      const errors: any[] = [];
      for (let i = 0; i < records.length; i += BATCH) {
        const batch = records.slice(i, i + BATCH);
        const { error } = await db.from(importTable).insert(batch);
        if (error) { failed += batch.length; errors.push({ batch: i / BATCH, message: error.message }); }
        else imported += batch.length;
      }

      const status = failed === 0 ? "completed" : (imported === 0 ? "failed" : "partial");
      await db.from("deployment_import_jobs").update({
        imported_rows: imported, failed_rows: failed, status,
        error_log: errors, completed_at: new Date().toISOString(),
      }).eq("id", jobRow.id);

      await db.from("audit_log").insert({
        action: "deployment_import", module: "deployments", user_id: user?.id,
        details: { deployment_id: deployment.id, target_table: importTable, imported, failed },
      }).catch(() => {});

      toast({
        title: status === "completed" ? "Import complete" : status === "partial" ? "Imported with some failures" : "Import failed",
        description: `${imported} imported, ${failed} failed of ${records.length} rows`,
        variant: status === "failed" ? "destructive" : "default",
      });

      setShowImportForm(false); setFile(null); setParsed(null); setMapping({});
      const { data: jobRows } = await db.from("deployment_import_jobs").select("*").eq("deployment_id", deployment.id).order("created_at", { ascending: false });
      setJobs(jobRows || []);
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const proceedToReview = async () => {
    if (!deployment) return;
    await db.from("company_deployments").update({ status: "review", current_step: "review" }).eq("id", deployment.id);
    setDeployment((p: any) => ({ ...p, status: "review", current_step: "review" }));
    setStep("review");
  };

  /* ── Step 4: review & go live ───────────────────────────────── */
  const goLive = async () => {
    if (!deployment) return;
    setSaving(true);
    try {
      let facilityId = deployment.facility_id;
      if (!facilityId) {
        const code = (deployment.facility_code || deployment.company_name.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "");
        const { data: fac, error } = await db.from("facilities").insert({
          code, name: deployment.company_name, short_name: deployment.company_name.slice(0, 30),
          location: deployment.county || "Unknown", county: deployment.county, is_active: true, is_main: false,
        }).select().single();
        if (error) throw error;
        facilityId = fac.id;
      }
      await db.from("company_deployments").update({ status: "completed", current_step: "review", facility_id: facilityId }).eq("id", deployment.id);
      setDeployment((p: any) => ({ ...p, status: "completed", facility_id: facilityId }));
      toast({ title: "Deployment complete", description: `${deployment.company_name} is now live as a facility.` });
    } catch (e: any) {
      toast({ title: "Could not complete deployment", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh" }}>
        <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <AdminBreadcrumb label="Company Onboarding" />
        <div style={{ padding: 60, textAlign: "center", color: T.fgMuted }}><Loader2 className="spin" size={20} /> Loading…</div>
      </div>
    );
  }

  const stepIdx = STEPS.findIndex(s => s.id === step);

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Segoe UI','Inter',sans-serif" }}>
      <style>{`.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <AdminBreadcrumb label="Company Onboarding" />
      <div style={{ padding: "20px 24px 50px", maxWidth: 880, margin: "0 auto" }}>
        <button onClick={() => nav("/admin/deployments")} style={{ ...btnS("transparent", T.border), marginBottom: 16, padding: "5px 12px", fontSize: 12 }}>
          <ArrowLeft size={13} /> Back to Deployment Center
        </button>

        <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700, color: T.fg }}>
          {deployment ? deployment.company_name : "New Company Onboarding"}
        </h1>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: T.fgMuted }}>Set up a new company deployment in four steps.</p>

        {/* Stepper */}
        <div style={{ display: "flex", marginBottom: 22, gap: 4 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 6,
                background: i <= stepIdx ? T.primary : T.border,
              }} />
              <span style={{ fontSize: 11, fontWeight: i === stepIdx ? 700 : 500, color: i <= stepIdx ? T.primary : T.fgMuted }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Step: Company Info ───────────────────────────────── */}
        {step === "company" && (
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Building2 size={16} color={T.primary} />
              <span style={{ fontWeight: 700, fontSize: 14, color: T.fg }}>Company Information</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><span style={label}>Company / Facility Name *</span><input style={inp} value={form.company_name} onChange={e => f("company_name", e.target.value)} placeholder="e.g. St. Mary's Mission Hospital" /></div>
              <div><span style={label}>Short Code</span><input style={inp} value={form.facility_code} onChange={e => f("facility_code", e.target.value.toUpperCase())} placeholder="e.g. SMMH" /></div>
              <div><span style={label}>Contact Name</span><input style={inp} value={form.contact_name} onChange={e => f("contact_name", e.target.value)} /></div>
              <div><span style={label}>Contact Email</span><input style={inp} value={form.contact_email} onChange={e => f("contact_email", e.target.value)} /></div>
              <div><span style={label}>Contact Phone</span><input style={inp} value={form.contact_phone} onChange={e => f("contact_phone", e.target.value)} /></div>
              <div><span style={label}>County</span><input style={inp} value={form.county} onChange={e => f("county", e.target.value)} placeholder="e.g. Embu" /></div>
            </div>
            <div style={{ marginTop: 12 }}><span style={label}>Notes</span><textarea style={{ ...inp, minHeight: 60 }} value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button onClick={saveCompanyInfo} disabled={saving} style={btnS(T.primary)}>
                {saving ? "Saving…" : "Continue"} <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Database Connection ────────────────────────── */}
        {step === "connection" && (
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Database size={16} color={T.primary} />
              <span style={{ fontWeight: 700, fontSize: 14, color: T.fg }}>Source Database Connection</span>
            </div>
            <p style={{ fontSize: 12, color: T.fgMuted, margin: "0 0 14px" }}>
              If this company already has a legacy system, point to it here. Fields below match what you'd use to
              create a connection in SSMS (server, port, database, login). You can skip this and import via
              CSV/Excel files instead.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {DB_TYPES.map(dt => (
                <button key={dt.value} onClick={() => onTypeChange(dt.value)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: T.r, cursor: "pointer", textAlign: "left",
                    border: `1.5px solid ${connForm.type === dt.value ? T.primary : T.border}`,
                    background: connForm.type === dt.value ? `${T.primary}0c` : T.card,
                  }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: T.fg }}>{dt.label}</div>
                  <div style={{ fontSize: 10, color: T.fgMuted, marginTop: 2 }}>{dt.notes}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div><span style={label}>Connection Name *</span><input style={inp} value={connForm.name} onChange={e => cf("name", e.target.value)} placeholder="e.g. SMMH Legacy SQL Server" /></div>
              <div><span style={label}>Auth Mode</span>
                <select style={inp} value={connForm.auth_mode} onChange={e => cf("auth_mode", e.target.value)}>
                  <option value="sql">SQL Login</option>
                  <option value="windows">Windows Auth</option>
                  <option value="azure_ad">Azure AD</option>
                </select>
              </div>
              <div><span style={label}>Server / Host *</span><input style={inp} value={connForm.host} onChange={e => cf("host", e.target.value)} placeholder="e.g. 192.168.1.50 or sqlserver.local" /></div>
              <div><span style={label}>Port</span><input style={inp} value={connForm.port} onChange={e => cf("port", e.target.value)} /></div>
              <div><span style={label}>Database *</span><input style={inp} value={connForm.database_name} onChange={e => cf("database_name", e.target.value)} /></div>
              <div><span style={label}>Encrypt</span>
                <select style={inp} value={connForm.encrypt ? "yes" : "no"} onChange={e => cf("encrypt", e.target.value === "yes")}>
                  <option value="yes">Yes (recommended)</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div><span style={label}>Username</span><input style={inp} value={connForm.username} onChange={e => cf("username", e.target.value)} /></div>
              <div><span style={label}>Password</span><input type="password" style={inp} value={connForm.password} onChange={e => cf("password", e.target.value)} placeholder={connection ? "Leave blank to keep existing" : ""} /></div>
            </div>

            {testResult && (
              <div style={{ marginTop: 12, padding: "8px 12px", borderRadius: T.r, fontSize: 12, background: testResult.ok ? T.successBg : T.errorBg, color: testResult.ok ? T.success : T.error }}>
                {testResult.message}
              </div>
            )}

            <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={skipDatabase} disabled={saving} style={btnS("transparent", T.border)}>Skip — I'll upload files</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={testConnection} disabled={testing || !connForm.host} style={btnS(T.bg2, T.border)}>
                  {testing ? <Loader2 size={13} className="spin" /> : <Wifi size={13} />} Test Connection
                </button>
                <button onClick={saveConnection} disabled={saving} style={btnS(T.primary)}>
                  {saving ? "Saving…" : "Save & Continue"} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Import Data ────────────────────────────────── */}
        {step === "import" && (
          <div>
            <div style={{ ...card, padding: 20, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileSpreadsheet size={16} color={T.primary} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: T.fg }}>Import Data</span>
                </div>
                {!showImportForm && (
                  <button onClick={() => setShowImportForm(true)} style={btnS(T.primary)}><Plus size={13} /> New Import</button>
                )}
              </div>
              <p style={{ fontSize: 12, color: T.fgMuted, margin: "6px 0 0" }}>
                Export each table from SSMS / Excel as CSV or XLSX, upload it, map the columns, and import. Repeat for every table you need.
              </p>
            </div>

            {showImportForm && (
              <div style={{ ...card, padding: 20, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: T.fg }}>New Import Job</span>
                  <button onClick={() => { setShowImportForm(false); setFile(null); setParsed(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.fgMuted }}><X size={16} /></button>
                </div>

                <span style={label}>Target Table</span>
                <select style={{ ...inp, marginBottom: 12 }} value={importTable} onChange={e => { setImportTable(e.target.value); setParsed(null); setMapping({}); setFile(null); }}>
                  {Object.entries(TARGET_TABLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>

                <span style={label}>File (CSV or XLSX)</span>
                <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={e => onPickFile(e.target.files?.[0] || null)} style={{ ...inp, padding: "6px 10px" }} />

                {parsing && <div style={{ marginTop: 10, fontSize: 12, color: T.fgMuted }}><Loader2 size={12} className="spin" /> Reading file…</div>}

                {parsed && (
                  <div style={{ marginTop: 16 }}>
                    <span style={{ ...label, marginBottom: 8 }}>Column Mapping — {parsed.rows.length} rows detected</span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {TARGET_TABLES[importTable].fields.map(fld => (
                        <div key={fld.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 12, width: 130, flexShrink: 0, color: T.fg }}>{fld.label}{fld.required && <span style={{ color: T.error }}> *</span>}</span>
                          <select style={inp} value={mapping[fld.key] || ""} onChange={e => setMapping(p => ({ ...p, [fld.key]: e.target.value }))}>
                            <option value="">— Skip —</option>
                            {parsed.headers.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 18, textAlign: "right" }}>
                      <button onClick={runImport} disabled={importing} style={btnS(T.success)}>
                        {importing ? <Loader2 size={13} className="spin" /> : <Upload size={13} />} {importing ? "Importing…" : `Import ${parsed.rows.length} rows`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* job list */}
            <div style={{ ...card, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ padding: "10px 16px", borderBottom: `1px solid ${T.border}`, fontWeight: 700, fontSize: 12, color: T.fg }}>Import Jobs</div>
              {jobs.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: T.fgMuted, fontSize: 12 }}>No imports yet.</div>
              ) : (
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                        <td style={{ padding: "8px 16px", fontWeight: 600, color: T.fg }}>{TARGET_TABLES[j.target_table]?.label || j.target_table}</td>
                        <td style={{ padding: "8px 16px", color: T.fgMuted }}>{j.source_label}</td>
                        <td style={{ padding: "8px 16px", color: T.success }}>{j.imported_rows} imported</td>
                        <td style={{ padding: "8px 16px", color: j.failed_rows ? T.error : T.fgMuted }}>{j.failed_rows} failed</td>
                        <td style={{ padding: "8px 16px", textTransform: "capitalize", color: T.fgMuted }}>{j.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <button onClick={proceedToReview} style={btnS(T.primary)}>Continue to Review <ArrowRight size={14} /></button>
            </div>
          </div>
        )}

        {/* ── Step: Review & Go Live ────────────────────────────── */}
        {step === "review" && deployment && (
          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <CheckCircle2 size={16} color={T.success} />
              <span style={{ fontWeight: 700, fontSize: 14, color: T.fg }}>Review & Go Live</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              <div>
                <div style={label}>Company</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.fg }}>{deployment.company_name}</div>
                <div style={{ fontSize: 12, color: T.fgMuted }}>{deployment.contact_name} {deployment.contact_email && `· ${deployment.contact_email}`}</div>
              </div>
              <div>
                <div style={label}>Database Source</div>
                <div style={{ fontSize: 13, color: T.fg }}>{connection ? `${connection.type.toUpperCase()} — ${connection.host}` : "File uploads only"}</div>
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <div style={label}>Import Summary</div>
              {jobs.length === 0 ? <div style={{ fontSize: 12, color: T.fgMuted }}>No data imported yet — you can still go live and import later.</div> : (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {jobs.map(j => (
                    <div key={j.id} style={{ ...card, padding: "10px 14px", minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: T.fgMuted }}>{TARGET_TABLES[j.target_table]?.label || j.target_table}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: T.success }}>{j.imported_rows}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {deployment.status === "completed" ? (
              <div style={{ padding: "12px 16px", borderRadius: T.r, background: T.successBg, color: T.success, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} /> This deployment is live{deployment.facility_id && " as a facility"}.
                <button onClick={() => nav("/users")} style={{ marginLeft: "auto", ...btnS(T.bg2, T.border), padding: "5px 12px", fontSize: 12 }}>Create their first user</button>
              </div>
            ) : (
              <div style={{ textAlign: "right" }}>
                <button onClick={goLive} disabled={saving} style={btnS(T.success)}>
                  <Server size={14} /> {saving ? "Going live…" : "Go Live"}
                </button>
              </div>
            )}
          </div>
        )}

        {(step === "review" || step === "import") && deployment?.status !== "completed" && (
          <p style={{ fontSize: 11, color: T.fgMuted, marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={12} /> You can leave and resume this onboarding any time from the Deployment Center.
          </p>
        )}
      </div>
    </div>
  );
}
