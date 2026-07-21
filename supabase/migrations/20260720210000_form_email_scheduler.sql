-- ============================================================
--  EL5 MediProcure — Form email scheduler
--  Lets Admin Panel → Forms Builder schedule a "send to all
--  registered users" email blast for a future date/time instead
--  of only sending immediately. A cron job (every 2 minutes)
--  calls notification-hub's new `process_scheduled_form_emails`
--  action, which finds due rows and sends them with the full
--  branded HTML template (logo + hospital colors from
--  `facilities`), same as an immediate send now does.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.form_email_schedules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id          text NOT NULL REFERENCES public.google_forms(form_id) ON DELETE CASCADE,
  form_title       text NOT NULL,
  subject          text NOT NULL,
  message          text NOT NULL,
  scheduled_at     timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed','cancelled')),
  created_by       uuid,
  created_by_name  text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz,
  recipients_count integer DEFAULT 0,
  sent_count       integer DEFAULT 0,
  failed_count     integer DEFAULT 0,
  error            text
);

CREATE INDEX IF NOT EXISTS idx_form_email_schedules_due
  ON public.form_email_schedules (status, scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_form_email_schedules_form
  ON public.form_email_schedules (form_id);

ALTER TABLE public.form_email_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_form_email_schedules" ON public.form_email_schedules;
CREATE POLICY "admins_manage_form_email_schedules"
  ON public.form_email_schedules FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- service_role (used by the notification-hub edge function / cron) needs
-- unrestricted access to process and update rows regardless of RLS.
DROP POLICY IF EXISTS "service_role_all_form_email_schedules" ON public.form_email_schedules;
CREATE POLICY "service_role_all_form_email_schedules"
  ON public.form_email_schedules FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- pg_cron + pg_net are already enabled in this project (see
-- 20260603000005_create_heartbeat_rpcs_and_cron.sql). Fire every 2 minutes;
-- the edge function itself only acts on rows whose scheduled_at has passed,
-- so this is safe to run frequently without double-sending.
SELECT cron.unschedule('el5-form-email-scheduler') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'el5-form-email-scheduler'
);
SELECT cron.schedule('el5-form-email-scheduler','*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url     := 'https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/notification-hub',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc'),
    body    := '{"action":"process_scheduled_form_emails"}'::jsonb,
    timeout_milliseconds := 55000
  ) AS request_id;
  $cron$
);

NOTIFY pgrst, 'reload schema';
