CREATE TABLE public.not_found_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  referrer TEXT,
  user_id UUID,
  user_role TEXT,
  user_agent TEXT,
  source TEXT NOT NULL DEFAULT 'client',
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_not_found_log_created_at ON public.not_found_log(created_at DESC);
CREATE INDEX idx_not_found_log_path ON public.not_found_log(path);

GRANT SELECT, INSERT ON public.not_found_log TO anon;
GRANT SELECT, INSERT, DELETE ON public.not_found_log TO authenticated;
GRANT ALL ON public.not_found_log TO service_role;

ALTER TABLE public.not_found_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log a 404"
  ON public.not_found_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view 404 log"
  ON public.not_found_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'database_admin'::public.app_role, 'webmaster'::public.app_role)
    )
  );

CREATE POLICY "Admins can clear 404 log"
  ON public.not_found_log FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::public.app_role, 'database_admin'::public.app_role, 'webmaster'::public.app_role)
    )
  );