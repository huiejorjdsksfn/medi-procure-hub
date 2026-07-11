
CREATE TABLE IF NOT EXISTS public.crash_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  path TEXT,
  page_name TEXT,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  user_agent TEXT,
  correlation_id TEXT,
  session_id TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crash_reports TO authenticated;
GRANT INSERT ON public.crash_reports TO anon;
GRANT ALL ON public.crash_reports TO service_role;

ALTER TABLE public.crash_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_can_insert_crash" ON public.crash_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "admins_read_crash" ON public.crash_reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'database_admin'::app_role));

CREATE POLICY "admins_update_crash" ON public.crash_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins_delete_crash" ON public.crash_reports
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_crash_reports_created_at ON public.crash_reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crash_reports_resolved ON public.crash_reports (resolved);
