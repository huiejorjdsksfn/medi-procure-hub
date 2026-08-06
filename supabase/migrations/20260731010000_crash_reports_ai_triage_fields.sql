-- AI triage for crash reports: severity/category/summary populated by the
-- new crash-triage edge function after the client's initial insert.
ALTER TABLE public.crash_reports
  ADD COLUMN IF NOT EXISTS severity text CHECK (severity IN ('critical','high','medium','low')),
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS ai_summary text;

CREATE INDEX IF NOT EXISTS idx_crash_reports_severity ON public.crash_reports(severity) WHERE resolved = false;

NOTIFY pgrst, 'reload schema';
