-- Create sms_conversations table (used by all SMS/WhatsApp edge functions)
CREATE TABLE IF NOT EXISTS public.sms_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    text UNIQUE NOT NULL,
  contact_name    text,
  last_message    text,
  last_message_at timestamptz DEFAULT now(),
  status          text DEFAULT 'open',
  unread_count    int DEFAULT 0,
  department      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sms_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated manage sms_conversations" ON public.sms_conversations;
CREATE POLICY "Authenticated manage sms_conversations"
  ON public.sms_conversations FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.sms_conversations TO authenticated;
GRANT ALL ON public.sms_conversations TO service_role;

-- Create audit_logs table (used by whatsapp-webhook APPROVE/REJECT)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action     text NOT NULL,
  table_name text,
  record_id  text,
  changes    jsonb DEFAULT '{}',
  details    text,
  user_id    uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  BEGIN ALTER TABLE public.audit_logs ADD COLUMN details text; EXCEPTION WHEN duplicate_column THEN NULL; END;
END $$;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages audit_logs" ON public.audit_logs;
CREATE POLICY "Service role manages audit_logs"
  ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Admins view audit_logs" ON public.audit_logs;
CREATE POLICY "Admins view audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::public.app_role, 'database_admin'::public.app_role, 'webmaster'::public.app_role)
  ));
GRANT ALL ON public.audit_logs TO service_role;
GRANT SELECT ON public.audit_logs TO authenticated;

NOTIFY pgrst, 'reload schema';
