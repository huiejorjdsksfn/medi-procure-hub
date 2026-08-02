-- ODBC / external BI tool connectivity: a dedicated, read-only Postgres
-- role external tools (Excel, Power BI, Crystal Reports, Access) can
-- connect through via a standard PostgreSQL ODBC driver — instead of
-- ever handing out the project's real database credentials for this.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'odbc_reader') THEN
    CREATE ROLE odbc_reader WITH LOGIN PASSWORD 'ChangeMe_SetFromAdminPanel!1' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION CONNECTION LIMIT 5;
  END IF;
END $$;

GRANT CONNECT ON DATABASE postgres TO odbc_reader;
GRANT USAGE ON SCHEMA public TO odbc_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO odbc_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO odbc_reader;

-- Row Level Security still applies to this role for any table that has
-- RLS enabled with policies scoped to authenticated/anon — since
-- odbc_reader is a plain login role (not in those groups), tables with
-- RLS enabled and no explicit policy for it will correctly return zero
-- rows rather than leaking data, which is the safe default.

-- Admin-only password rotation. Nothing above stores the password in a
-- queryable table — Postgres holds it as a SCRAM hash in pg_authid, the
-- normal mechanism for any DB role's password, not a plaintext capture.
CREATE OR REPLACE FUNCTION public.admin_set_odbc_password(new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can rotate the ODBC reader password';
  END IF;
  IF new_password IS NULL OR length(new_password) < 12 THEN
    RAISE EXCEPTION 'Password must be at least 12 characters';
  END IF;
  EXECUTE format('ALTER ROLE odbc_reader WITH PASSWORD %L', new_password);
  INSERT INTO audit_logs (action, details, created_at)
  VALUES ('odbc_password_rotated', 'ODBC reader role password was rotated from Admin Panel', now());
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_odbc_password(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_odbc_password(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
