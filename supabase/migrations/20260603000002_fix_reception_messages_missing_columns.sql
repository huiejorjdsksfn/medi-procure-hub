-- Fix: add direction, error_code, metadata to reception_messages
-- Fix: add provider to sms_log
-- Fix: add missing columns to notifications
DO $$ BEGIN
  BEGIN ALTER TABLE public.reception_messages ADD COLUMN direction  text DEFAULT 'outbound'; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.reception_messages ADD COLUMN error_code text;                    EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.reception_messages ADD COLUMN metadata   jsonb DEFAULT '{}';      EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE public.sms_log ADD COLUMN provider text DEFAULT 'twilio'; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE public.notifications ADD COLUMN recipient_id uuid;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.notifications ADD COLUMN module       text;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.notifications ADD COLUMN metadata     jsonb DEFAULT '{}';    EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.notifications ADD COLUMN is_read      boolean DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END;
  BEGIN ALTER TABLE public.notifications ADD COLUMN action_url   text;                  EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;

NOTIFY pgrst, 'reload schema';
