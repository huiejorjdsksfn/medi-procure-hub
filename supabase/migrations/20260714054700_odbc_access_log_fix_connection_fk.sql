-- connection_id in odbc_access_log can reference either the legacy
-- odbc_connections registry or external_connections (the one actually
-- used by ODBCPage.tsx / mysql-proxy), so it can't carry a single FK.
ALTER TABLE odbc_access_log DROP CONSTRAINT IF EXISTS odbc_access_log_connection_id_fkey;
