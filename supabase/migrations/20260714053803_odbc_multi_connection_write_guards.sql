-- Multi-ODBC guarded registry: per-connection read-only flag (defaults to
-- the safe option) + db_type so odbc_connections can host more than one
-- MySQL/MSSQL source, plus an audit trail of every guarded access attempt
-- so writes against an external legacy system are never silent.

ALTER TABLE odbc_connections
  ADD COLUMN IF NOT EXISTS read_only boolean NOT NULL DEFAULT true;

ALTER TABLE odbc_connections
  ADD COLUMN IF NOT EXISTS db_type text NOT NULL DEFAULT 'mysql';

COMMENT ON COLUMN odbc_connections.read_only IS
  'When true (default), mysql-proxy/mssql-import refuse any INSERT/UPDATE/DELETE/RAW-write/MIGRATE action against this connection, regardless of caller role. Must be explicitly set false by an admin to permit writes.';

CREATE TABLE IF NOT EXISTS odbc_access_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid REFERENCES odbc_connections(id) ON DELETE SET NULL,
  action        text NOT NULL,
  table_name    text,
  allowed       boolean NOT NULL,
  blocked_reason text,
  sql_snippet   text,
  requested_by  uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE odbc_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_odbc_access_log" ON odbc_access_log;
CREATE POLICY "admin_read_odbc_access_log" ON odbc_access_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','database_admin','webmaster'))
);

-- Only service-role (edge functions) inserts; no direct client insert policy
-- is created on purpose, so the audit trail can't be tampered with from the
-- browser.

CREATE INDEX IF NOT EXISTS idx_odbc_access_log_connection ON odbc_access_log(connection_id, created_at DESC);
