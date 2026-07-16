-- Backfill: these two tables were applied live via MCP on 2026-07-14/15
-- but no migration file was ever committed for them (workflow gap).
-- Written as idempotent reconciliation so a fresh clone / `db reset`
-- ends up matching production. IF NOT EXISTS everywhere — safe to run
-- against the already-migrated production DB.

CREATE TABLE IF NOT EXISTS keepalive_records (
  id           text PRIMARY KEY,
  record_type  text,
  timestamp    timestamptz,
  random_value text,
  ping_target  text,
  is_active    boolean,
  expires_at   timestamptz,
  metadata     jsonb,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE keepalive_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS themes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  source           text NOT NULL DEFAULT 'manual',
  colors           jsonb NOT NULL DEFAULT '{}',
  typography       jsonb NOT NULL DEFAULT '{}',
  layout           jsonb NOT NULL DEFAULT '{}',
  logo_url         text,
  source_image_url text,
  is_active        boolean NOT NULL DEFAULT false,
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_themes" ON themes;
CREATE POLICY "admin_manage_themes" ON themes FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin')));

DROP POLICY IF EXISTS "authenticated_read_active_theme" ON themes;
CREATE POLICY "authenticated_read_active_theme" ON themes FOR SELECT
  USING (is_active = true OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin','database_admin','webmaster','superadmin')));

-- NOTE: two further live migrations from this window —
-- fix_profile_delete_fk_constraints (20260715094823) and
-- fix_audit_device_session_rls_gaps (20260715100831) — are already
-- applied to production but their exact original DDL wasn't
-- reconstructable from schema introspection alone (constraint-drop /
-- policy-tighten deltas, not new objects). Flagged for whoever touches
-- profiles FKs or audit/device/session RLS next to capture properly.
