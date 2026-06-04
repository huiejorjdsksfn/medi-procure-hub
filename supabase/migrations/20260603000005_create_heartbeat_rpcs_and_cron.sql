-- Health stats RPC
CREATE OR REPLACE FUNCTION public.get_db_health_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_version text; v_conns integer; v_counts jsonb; BEGIN
  SELECT version() INTO v_version;
  SELECT count(*) INTO v_conns FROM pg_stat_activity WHERE state = 'active';
  SELECT jsonb_build_object(
    'requisitions',    (SELECT COUNT(*) FROM public.requisitions     LIMIT 1),
    'purchase_orders', (SELECT COUNT(*) FROM public.purchase_orders  LIMIT 1),
    'documents',       (SELECT COUNT(*) FROM public.documents        LIMIT 1),
    'sms_log',         (SELECT COUNT(*) FROM public.sms_log          LIMIT 1),
    'notifications',   (SELECT COUNT(*) FROM public.notifications    LIMIT 1)
  ) INTO v_counts;
  RETURN jsonb_build_object('db_version',v_version,'active_conns',v_conns,'table_counts',v_counts,'checked_at',now());
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('db_version','error','active_conns',0,'table_counts','{}');
END; $$;
GRANT EXECUTE ON FUNCTION public.get_db_health_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_db_health_stats() TO authenticated;

-- Trim RPC
CREATE OR REPLACE FUNCTION public.trim_heartbeat(keep integer DEFAULT 10000)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE deleted integer; BEGIN
  DELETE FROM public.db_heartbeat WHERE id NOT IN (
    SELECT id FROM public.db_heartbeat ORDER BY pinged_at DESC LIMIT keep
  );
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END; $$;
GRANT EXECUTE ON FUNCTION public.trim_heartbeat(integer) TO service_role;

-- pg_cron + pg_net (already enabled in Supabase cloud)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule keepalive-bot every minute (loops internally for 55 seconds @ 1s intervals)
SELECT cron.schedule('el5-keepalive-bot','* * * * *',
  $cron$
  SELECT net.http_post(
    url     := 'https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/keepalive-bot',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 58000
  ) AS request_id;
  $cron$
);
