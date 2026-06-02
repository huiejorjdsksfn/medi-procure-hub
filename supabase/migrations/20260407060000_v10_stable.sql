-- ================================================================
-- EL5 MediProcure v10.0 — Stable Production Migration
-- All credentials, indexes, roles, realtime publications
-- ================================================================

-- ── 1. System settings — full v10 credential seed ────────────────
INSERT INTO system_settings (key, value, description)
VALUES
  ('app_version',                  '10.0.0',                              'Application version'),
  ('app_name',                     'ProcurBosse',                         'Application name'),
  ('hospital_name',                'Embu Level 5 Hospital',               'Hospital name'),
  ('county',                       'Embu County Government',              'County'),
  ('twilio_enabled',               'true',                                'Twilio active'),
  ('twilio_account_sid',           'REDACTED_TWILIO_ACCOUNT_SID', 'Twilio Account SID'),
  ('twilio_auth_token',            'REDACTED_TWILIO_AUTH_TOKEN',    'Twilio Auth Token'),
  ('twilio_phone_number',          '+16812972643',                        'EL5H SMS number'),
  ('twilio_messaging_service_sid', 'REDACTED_TWILIO_MESSAGING_SID', 'Messaging Service SID (SMS)'),
  ('twilio_verify_service_sid',    'REDACTED_TWILIO_VERIFY_SID', 'Verify Service SID (OTP)'),
  ('twilio_whatsapp_number',       '+14155238886',                        'WhatsApp sandbox'),
  ('twilio_whatsapp_join_code',    'join bad-machine',                    'WhatsApp join code'),
  ('sms_on_req_approve',           'true',  'SMS on requisition approval'),
  ('sms_on_po_approve',            'true',  'SMS on PO approval'),
  ('sms_on_low_stock',             'true',  'SMS on low stock'),
  ('sms_on_payment',               'true',  'SMS on payment'),
  ('sms_on_grn',                   'true',  'SMS on GRN'),
  ('sms_provider',                 'twilio','Primary SMS provider'),
  ('email_notifications_enabled',  'true',  'Email notifications'),
  ('smtp_enabled',                 'true',  'SMTP active')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, description=EXCLUDED.description;

-- ── 2. Ensure critical tables exist ──────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT,
  type       TEXT DEFAULT 'info',
  is_read    BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  module     TEXT,
  priority   TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_number   TEXT NOT NULL,
  from_number TEXT,
  message     TEXT,
  status      TEXT DEFAULT 'pending',
  twilio_sid  TEXT,
  module      TEXT,
  error_msg   TEXT,
  cost        NUMERIC(10,4),
  sent_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    TEXT UNIQUE NOT NULL,
  contact_name    TEXT,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  status          TEXT DEFAULT 'open',
  unread_count    INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reception_appointments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name   TEXT,
  host_name      TEXT,
  department     TEXT,
  scheduled_time TIMESTAMPTZ,
  status         TEXT DEFAULT 'scheduled',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Add missing columns ────────────────────────────────────────
ALTER TABLE reception_messages ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE reception_messages ADD COLUMN IF NOT EXISTS segments   INT DEFAULT 1;
ALTER TABLE reception_messages ADD COLUMN IF NOT EXISTS cost       NUMERIC(10,4);
ALTER TABLE profiles           ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles           ADD COLUMN IF NOT EXISTS department TEXT;

-- ── 4. Performance indexes — all hot paths ────────────────────────
CREATE INDEX IF NOT EXISTS idx_ur_uid      ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_ur_uid_role ON user_roles(user_id, role);
CREATE INDEX IF NOT EXISTS idx_notif_uid   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unrd  ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notif_cat   ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_status  ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_req_cat     ON requisitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_by      ON requisitions(created_by);
CREATE INDEX IF NOT EXISTS idx_po_status   ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_cat      ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_sup      ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_grn_status  ON goods_received(status);
CREATE INDEX IF NOT EXISTS idx_grn_po      ON goods_received(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_items_qty   ON items(quantity_in_stock);
CREATE INDEX IF NOT EXISTS idx_items_cat   ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_sms_cat     ON sms_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_phone  ON sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_conv_cat    ON sms_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_rcpt_phone  ON reception_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_rcpt_cat    ON reception_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_cat   ON audit_logs(created_at DESC);

-- ── 5. Realtime publications ──────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications;      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE requisitions;       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE reception_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sms_conversations;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 6. Fix user_roles constraint ─────────────────────────────────
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check CHECK (
  role IN ('admin','superadmin','webmaster','database_admin',
           'procurement_manager','procurement_officer',
           'inventory_manager','warehouse_officer','requisitioner','accountant')
);

-- ── 7. Broadcast v10 announcement to all users ───────────────────
INSERT INTO notifications (user_id, title, message, type, is_read, module, priority)
SELECT id,
  '🏥 ProcurBosse v10.0 — New Version Deployed',
  'EL5 MediProcure has been updated to v10.0. New features: improved ERP wheel navigation, role-based Reception Desk, fixed SMS (MGd547 messaging service), OTP verification via Twilio Verify, enhanced dashboard with live KPIs, and a fully rebuilt professional interface.',
  'success', false, 'system', 'high'
FROM profiles
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
