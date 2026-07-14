-- external_connections is the registry actually used by ODBCPage.tsx
-- (odbc_connections is a separate/legacy table). Add the same read-only
-- guard flag here so mysql-proxy's write guard checks the table that's
-- actually populated by the UI.
ALTER TABLE external_connections
  ADD COLUMN IF NOT EXISTS read_only boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN external_connections.read_only IS
  'When true (default), mysql-proxy refuses any INSERT/UPDATE/DELETE/RAW-write/MIGRATE action against this connection, regardless of caller role. Must be explicitly set false by an admin to permit writes.';
