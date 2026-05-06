-- SMS Log table for MediProcure communication tracking
CREATE TABLE IF NOT EXISTS public.sms_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed
  event_type TEXT,
  twilio_sid TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add twilio_sid if table exists but column doesn't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_log' AND column_name = 'twilio_sid'
  ) THEN
    ALTER TABLE public.sms_log ADD COLUMN twilio_sid TEXT;
  END IF;
END $$;

-- Index for fast lookups by status and date
CREATE INDEX IF NOT EXISTS idx_sms_log_status ON public.sms_log(status);
CREATE INDEX IF NOT EXISTS idx_sms_log_created_at ON public.sms_log(created_at DESC);

-- RLS: authenticated users can read logs; edge functions can insert/update
ALTER TABLE public.sms_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read" ON public.sms_log;
CREATE POLICY "Allow authenticated read"
  ON public.sms_log FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow service role all" ON public.sms_log;
CREATE POLICY "Allow service role all"
  ON public.sms_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
