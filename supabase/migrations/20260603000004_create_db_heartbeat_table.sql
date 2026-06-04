-- EL5 MediProcure — DB Heartbeat / Keep-Alive table
CREATE TABLE IF NOT EXISTS public.db_heartbeat (
  id            serial PRIMARY KEY,
  pinged_at     timestamptz NOT NULL DEFAULT now(),
  latency_ms    integer,
  status        text NOT NULL DEFAULT 'ok',
  source        text NOT NULL DEFAULT 'keepalive-bot',
  db_version    text,
  active_conns  integer,
  table_counts  jsonb DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_db_heartbeat_pinged_at ON public.db_heartbeat(pinged_at DESC);
ALTER TABLE public.db_heartbeat ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role writes heartbeat" ON public.db_heartbeat;
CREATE POLICY "Service role writes heartbeat"
  ON public.db_heartbeat FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated reads heartbeat" ON public.db_heartbeat;
CREATE POLICY "Authenticated reads heartbeat"
  ON public.db_heartbeat FOR SELECT TO authenticated USING (true);
GRANT ALL    ON public.db_heartbeat TO service_role;
GRANT SELECT ON public.db_heartbeat TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.db_heartbeat_id_seq TO service_role;
NOTIFY pgrst, 'reload schema';
