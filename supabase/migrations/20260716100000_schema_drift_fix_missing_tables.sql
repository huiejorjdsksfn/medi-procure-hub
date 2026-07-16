-- EL5 MediProcure — Schema drift fix (2026-07-16)
-- Audit of every table referenced across migrations/*.sql vs live schema found
-- these were actively queried by the app but never created on this database.
-- (Two other apparent "gaps" — goods_received_notes, inventory_items — were
-- just stale table names in DashboardPage/SystemReportPage; fixed in code to
-- point at the real goods_received/items tables instead of duplicating them.)

CREATE TABLE IF NOT EXISTS activity_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action      text NOT NULL,
  source      text,
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_created_idx ON activity_logs (created_at DESC);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_logs_read ON activity_logs;
CREATE POLICY activity_logs_read ON activity_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS activity_logs_service_write ON activity_logs;
CREATE POLICY activity_logs_service_write ON activity_logs FOR INSERT TO authenticated, anon, service_role WITH CHECK (true);

CREATE TABLE IF NOT EXISTS bank_statements (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id   uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  transaction_date  date NOT NULL DEFAULT CURRENT_DATE,
  description       text,
  reference         text,
  debit             numeric(14,2) DEFAULT 0,
  credit            numeric(14,2) DEFAULT 0,
  balance           numeric(14,2),
  reconciled        boolean DEFAULT false,
  reconciled_at     timestamptz,
  imported_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bank_statements_date_idx ON bank_statements (transaction_date DESC);
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bank_statements_auth ON bank_statements;
CREATE POLICY bank_statements_auth ON bank_statements FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS sms_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number      text NOT NULL,
  message_body   text,
  status         text DEFAULT 'sent',
  channel        text DEFAULT 'sms',
  module         text,
  record_id      text,
  sid            text,
  error_message  text,
  metadata       jsonb,
  sent_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_messages_sent_at_idx ON sms_messages (sent_at DESC);
CREATE INDEX IF NOT EXISTS sms_messages_channel_idx ON sms_messages (channel);
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_messages_auth ON sms_messages;
CREATE POLICY sms_messages_auth ON sms_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS sms_messages_service ON sms_messages;
CREATE POLICY sms_messages_service ON sms_messages FOR INSERT TO service_role, anon WITH CHECK (true);

CREATE TABLE IF NOT EXISTS email_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email      text NOT NULL,
  subject       text,
  status        text DEFAULT 'sent',
  provider      text,
  message_id    text,
  error_message text,
  sent_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON email_logs (sent_at DESC);
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_logs_auth ON email_logs;
CREATE POLICY email_logs_auth ON email_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS email_logs_service_write ON email_logs;
CREATE POLICY email_logs_service_write ON email_logs FOR INSERT TO service_role, anon, authenticated WITH CHECK (true);

CREATE TABLE IF NOT EXISTS email_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text UNIQUE NOT NULL,
  name         text,
  subject      text,
  html_content text,
  variables    jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS email_templates_read ON email_templates;
CREATE POLICY email_templates_read ON email_templates FOR SELECT TO authenticated, anon, service_role USING (true);
DROP POLICY IF EXISTS email_templates_admin_write ON email_templates;
CREATE POLICY email_templates_admin_write ON email_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS system_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id   text UNIQUE NOT NULL,
  label       text,
  is_enabled  boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS system_modules_read ON system_modules;
CREATE POLICY system_modules_read ON system_modules FOR SELECT TO authenticated, anon, service_role USING (true);
DROP POLICY IF EXISTS system_modules_admin_write ON system_modules;
CREATE POLICY system_modules_admin_write ON system_modules FOR ALL TO authenticated USING (true) WITH CHECK (true);
