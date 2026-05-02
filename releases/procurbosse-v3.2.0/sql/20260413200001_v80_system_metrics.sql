-- ============================================================
-- EL5 MediProcure v8.0 -- system_metrics (C++ native agent)
-- Embu Level 5 Hospital | Kenya
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS system_metrics (
  id            bigserial   PRIMARY KEY,
  hostname      text,
  agent_version text,
  os_version    text,
  cpu_percent   numeric(5,2),
  ram_used_mb   numeric(10,2),
  ram_total_mb  numeric(10,2),
  ram_percent   numeric(5,2),
  disk_used_gb  numeric(10,2),
  disk_total_gb numeric(10,2),
  disk_percent  numeric(5,2),
  process_count int,
  reported_at   timestamptz DEFAULT now(),
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_reported_at ON system_metrics(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_hostname    ON system_metrics(hostname);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can read metrics
CREATE POLICY "admin_read_metrics" ON system_metrics FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
    AND ur.role IN ('superadmin','webmaster','admin','database_admin')
  )
);

-- Anon insert allowed so the C++ agent (using anon key) can POST
CREATE POLICY "agent_insert_metrics" ON system_metrics FOR INSERT WITH CHECK (true);

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE system_metrics; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Latest metrics view for the admin panel
CREATE OR REPLACE VIEW latest_system_metrics AS
SELECT DISTINCT ON (hostname) *
FROM system_metrics
ORDER BY hostname, reported_at DESC;

GRANT SELECT ON latest_system_metrics TO authenticated;

COMMIT;
