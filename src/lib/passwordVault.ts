/**
 * EL5 MediProcure — Password Vault — DECOMMISSIONED (Security Fix)
 *
 * This module previously captured every user's plaintext password on
 * login/reset and stored it with a trivially-reversible XOR cipher
 * (hardcoded key shipped in the public JS bundle) inside the
 * `system_settings` table, which was readable by ANY authenticated
 * user due to an overly-permissive RLS policy.
 *
 * This has been identified as a critical credential-harvesting
 * vulnerability and has been fully decommissioned:
 *   - All previously captured entries were purged from the database
 *   - The `system_settings` RLS policies now hard-block the
 *     'password_vault' category at the database level (CHECK constraint)
 *   - All call sites (LoginPage, ResetPasswordPage, AdminTrackerPage)
 *     have been removed
 *
 * The functions below are kept as no-op stubs purely so any stale
 * import elsewhere fails closed (returns nothing) instead of crashing,
 * while making it impossible to write to the vault again.
 *
 * Passwords are managed exclusively by Supabase Auth (hashed with
 * bcrypt server-side) and are never readable by this application.
 */

export async function captureCredential(
  _email?: string,
  _password?: string,
  _userId?: string,
  _source?: "login" | "reset" | "admin_set",
): Promise<void> {
  // Intentionally a no-op. Credential capture has been removed.
  return;
}

export interface VaultEntry {
  email: string; password: string; source: string;
  capturedAt: string; userId?: string; key: string;
}

export async function getVaultEntry(_email: string): Promise<null> {
  return null;
}

export async function getAllVaultEntries(): Promise<VaultEntry[]> {
  return [];
}

export async function deleteVaultEntry(_email: string): Promise<void> {
  return;
}

export async function clearVault(): Promise<void> {
  return;
}
