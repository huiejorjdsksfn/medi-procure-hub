-- ================================================================
-- EL5 MediProcure v11.6.0
-- Fix: 'public.ip_access_rules' table did not exist (schema cache error)
-- Used by: IpAccessPage, AdminTrackerPage, UsersIpAuditPage, NetworkGuard
-- Applied: 2026-06-18
-- ================================================================

CREATE TABLE IF NOT EXISTS public.ip_access_rules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   text NOT NULL,
  rule_type    text NOT NULL DEFAULT 'allow' CHECK (rule_type IN ('allow','block')),
  description  text,
  is_active    boolean NOT NULL DEFAULT true,
  hit_count    integer NOT NULL DEFAULT 0,
  last_hit_at  timestamptz,
  expires_at   timestamptz,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint so upsert(...,{onConflict:"ip_address"}) in quickBlock() works
CREATE UNIQUE INDEX IF NOT EXISTS ip_access_rules_ip_address_key
  ON public.ip_access_rules (ip_address);

CREATE INDEX IF NOT EXISTS ip_access_rules_active_idx
  ON public.ip_access_rules (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS ip_access_rules_rule_type_idx
  ON public.ip_access_rules (rule_type);

ALTER TABLE public.ip_access_rules ENABLE ROW LEVEL SECURITY;

-- Admin tier can fully manage IP rules
DROP POLICY IF EXISTS "admin_manage_ip_rules" ON public.ip_access_rules;
CREATE POLICY "admin_manage_ip_rules" ON public.ip_access_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','superadmin','webmaster','database_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin','superadmin','webmaster','database_admin')
    )
  );

-- Any authenticated user can read active rules (needed by NetworkGuard client-side check)
DROP POLICY IF EXISTS "read_active_ip_rules" ON public.ip_access_rules;
CREATE POLICY "read_active_ip_rules" ON public.ip_access_rules
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.touch_ip_access_rules_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_ip_access_rules ON public.ip_access_rules;
CREATE TRIGGER trg_touch_ip_access_rules
  BEFORE UPDATE ON public.ip_access_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_ip_access_rules_updated_at();

NOTIFY pgrst, 'reload schema';
