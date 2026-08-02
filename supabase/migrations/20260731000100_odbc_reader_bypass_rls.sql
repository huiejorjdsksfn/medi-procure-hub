-- All 146 public tables have RLS enabled, with policies scoped to the
-- `authenticated` role (checking auth.uid()/is_admin()). odbc_reader is a
-- plain login role, not a member of `authenticated` — without this, every
-- query through the ODBC connection would silently return zero rows on
-- every table, making the whole feature look broken/non-functional.
-- BYPASSRLS is the correct, standard pattern for a dedicated reporting
-- role: paired with the SELECT-only grants already in place (no INSERT/
-- UPDATE/DELETE/DDL, NOSUPERUSER, 5-connection limit), this gives exactly
-- "read-only access to real data for BI tools" — not broader than that.
ALTER ROLE odbc_reader BYPASSRLS;
