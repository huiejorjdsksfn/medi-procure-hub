select cron.schedule(
  'el5-report-schedule-processor',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/process-report-schedules',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2amZlaG56YnpqbGlpemp2dWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwMDg0NjYsImV4cCI6MjA3NjU4NDQ2Nn0.mkDvC1s90bbRBRKYZI6nOTxEpFrGKMNmWgTENeMTSnc'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 55000
  ) AS request_id;
  $$
);
