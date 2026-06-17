-- ═══════════════════════════════════════════════════════════════════
-- EL5 MediProcure — Security Hardening: Session & Role Handler
-- Applied live to production on 2026-06-18. This file documents the
-- fixes for repo history / future environments restored from backup.
-- ═══════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────
-- FIX 1 (CRITICAL): Credential-harvesting vault purge + lockdown
--
-- passwordVault.ts captured every user's plaintext password on every
-- login/reset, "encoded" with a trivially-reversible XOR cipher whose
-- key was hardcoded in the public JS bundle, stored in system_settings
-- under category='password_vault'. That table's RLS (`settings_auth`,
-- qual=true) let ANY authenticated user read and decode every entry.
-- All captured entries were purged; the category is now permanently
-- blocked at the database level via RLS + a CHECK constraint so it
-- can never be repopulated even if the client code regresses.
-- ───────────────────────────────────────────────────────────────────
DELETE FROM public.system_settings WHERE key LIKE 'pvault_%';

DROP POLICY IF EXISTS "settings_auth" ON public.system_settings;

DROP POLICY IF EXISTS "ss_select" ON public.system_settings;
CREATE POLICY "ss_select" ON public.system_settings
  FOR SELECT TO authenticated
  USING (category IS DISTINCT FROM 'password_vault');

DROP POLICY IF EXISTS "ss_write" ON public.system_settings;
CREATE POLICY "ss_write" ON public.system_settings
  FOR ALL TO authenticated
  USING (is_admin() AND category IS DISTINCT FROM 'password_vault')
  WITH CHECK (is_admin() AND category IS DISTINCT FROM 'password_vault');

ALTER TABLE public.system_settings
  DROP CONSTRAINT IF EXISTS no_password_vault_category;
ALTER TABLE public.system_settings
  ADD CONSTRAINT no_password_vault_category
  CHECK (category IS DISTINCT FROM 'password_vault');

-- ───────────────────────────────────────────────────────────────────
-- FIX 2 (CRITICAL): user_roles self-escalation
--
-- "user_roles_all" (cmd ALL, qual=true, with_check=true) completely
-- overrode the correctly-scoped "user_roles_admin" policy sitting
-- next to it (RLS policies are OR'd / permissive). Any authenticated
-- user — even a brand-new requisitioner — could INSERT a row granting
-- themselves 'admin', 'superadmin', or any other role.
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "user_roles_all" ON public.user_roles;

-- ───────────────────────────────────────────────────────────────────
-- FIX 3 (CRITICAL): profiles self-escalation
--
-- "profiles_update" (qual=true, no with_check) let ANY authenticated
-- user UPDATE ANY other user's profile row, including the `role`
-- column. "profiles_insert" (with_check=true) let any user insert a
-- profile row for an arbitrary id, pre-seeding role='admin' before
-- that user's first real login. profiles.role directly gates real
-- authorization checks elsewhere (quotations, quotation_items,
-- role_permissions, password_reset_log, notifications).
-- ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- ───────────────────────────────────────────────────────────────────
-- FIX 4 (CRITICAL): profiles.role column-level guard
--
-- Even with the broad policies removed, the legitimate "users can
-- update their own profile" policy (auth.uid() = id) is correctly
-- scoped at the ROW level but RLS has no column-level granularity —
-- it could not stop a user from also changing `role` in that same
-- UPDATE call. A BEFORE UPDATE/INSERT trigger now blocks any change
-- to the `role` column unless the actor is verified admin via
-- user_roles (not via profiles.role itself, to avoid circular trust),
-- or the call comes from a trusted backend/service-role context
-- (auth.uid() IS NULL — no end-user JWT).
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NULL THEN
      RETURN NEW;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','superadmin','webmaster','database_admin')
    ) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only administrators can change a profile role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_escalation();

CREATE OR REPLACE FUNCTION public.prevent_self_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.role IS NOT NULL AND NEW.role NOT IN ('requisitioner') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','superadmin','webmaster','database_admin')
    ) THEN
      NEW.role := 'requisitioner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_on_insert ON public.profiles;
CREATE TRIGGER trg_prevent_self_role_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_self_role_on_insert();

NOTIFY pgrst, 'reload schema';

-- ───────────────────────────────────────────────────────────────────
-- NOTE: session-token and admin-create-user Edge Functions were also
-- hardened/updated in this pass (deployed directly, not via SQL):
--   - session-token v2: validate now requires JWT + ownership check;
--     refresh now rotates the opaque token value; GET-with-token-in-
--     querystring removed; CORS now configurable via ALLOWED_ORIGINS.
--   - admin-create-user v13: added finance_officer/finance_manager to
--     the valid-roles allowlist (still server-verified admin-only).
-- See supabase/functions/session-token/index.ts and
-- supabase/functions/admin-create-user/index.ts for the source.
--
-- NOTE: ~150 other RLS policies across ordinary business tables
-- (vouchers, purchase orders, GL entries, requisitions, etc.) still
-- use a broad "any authenticated user" pattern — this is a pre-
-- existing application-wide design choice (RBAC enforced at the UI
-- layer) and was intentionally left unchanged in this pass, since
-- re-architecting it requires a dedicated per-table role mapping
-- exercise to avoid breaking live functionality. Recommended as a
-- separate follow-up if DB-layer RBAC enforcement is desired.
-- ───────────────────────────────────────────────────────────────────
