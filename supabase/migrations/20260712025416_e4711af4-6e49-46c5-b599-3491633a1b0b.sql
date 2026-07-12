
DROP VIEW IF EXISTS public.db_stats;
CREATE VIEW public.db_stats AS
SELECT
  c.relname::text AS table_name,
  (SELECT count(*) FROM information_schema.columns co WHERE co.table_name = c.relname::text AND co.table_schema = 'public') AS column_count,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = c.relname::text AND p.schemaname = 'public') AS policy_count,
  (SELECT count(*) FROM information_schema.triggers t WHERE t.event_object_table = c.relname::text AND t.event_object_schema = 'public') AS trigger_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r';
GRANT SELECT ON public.db_stats TO authenticated, service_role;
