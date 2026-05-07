-- ================================================================
-- EL5 MediProcure v5.8 — Activate Twilio + Performance Fixes
-- ================================================================

-- ── 1. ACTIVATE TWILIO fully in system_settings ──────────────────
INSERT INTO system_settings (key, value, description)
VALUES
  ('twilio_enabled',               'true',                             'Twilio SMS/WhatsApp enabled'),
  ('twilio_account_sid',           'SUPABASE_SECRET', 'Twilio Account SID'),
  ('twilio_auth_token',            '',                                 'Twilio Auth Token — set via Supabase secrets TWILIO_AUTH_TOKEN'),
  ('twilio_phone_number',          '+16812972643',                     'Twilio SMS From number'),
  ('twilio_messaging_service_sid', 'MG2fffc3a381c44a202c316dcc6400707d', 'Twilio Messaging Service SID (EL5H)'),
  ('twilio_whatsapp_number',       '+14155238886',                     'Twilio WhatsApp sandbox number'),
  ('twilio_whatsapp_join_code',    'join bad-machine',                 'WhatsApp sandbox join code'),
  ('twilio_voice_webhook',         'https://demo.twilio.com/welcome/voice/', 'Twilio voice webhook'),
  ('twilio_service_name',          'EL5H',                            'Twilio messaging service name'),
  ('twilio_outbound_enabled',      'true',                            'Enable outbound calls'),
  ('whatsapp_sandbox_active',      'true',                            'WhatsApp sandbox active'),
  ('sms_provider',                 'twilio',                          'Primary SMS provider'),
  ('sms_hospital_name',            'EL5 MediProcure',                 'Hospital name in SMS prefix'),
  ('sms_on_req_approve',           'true',                            'SMS on requisition approval'),
  ('sms_on_po_approve',            'true',                            'SMS on PO approval'),
  ('sms_on_low_stock',             'true',                            'SMS on low stock alert'),
  ('sms_on_payment',               'true',                            'SMS on payment processed'),
  ('sms_on_grn',                   'true',                            'SMS on GRN created'),
  ('email_notifications_enabled',  'true',                            'Email notifications enabled'),
  ('smtp_enabled',                 'true',                            'SMTP enabled')
ON CONFLICT (key) DO UPDATE SET
  value = CASE
    -- Only update non-empty values; preserve manually set auth token
    WHEN system_settings.key = 'twilio_auth_token' AND system_settings.value != '' THEN system_settings.value
    WHEN EXCLUDED.value != '' THEN EXCLUDED.value
    ELSE system_settings.value
  END,
  description = EXCLUDED.description;

-- ── 2. Ensure notifications table exists with proper structure ────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info',
  is_read     BOOLEAN DEFAULT FALSE,
  action_url  TEXT,
  module      TEXT,
  priority    TEXT DEFAULT 'normal',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Ensure sms_log table exists ───────────────────────────────
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
  sent_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. Add missing columns to reception_messages if needed ────────
ALTER TABLE reception_messages
  ADD COLUMN IF NOT EXISTS error_code TEXT;

ALTER TABLE reception_messages
  ADD COLUMN IF NOT EXISTS segments INT DEFAULT 1;

ALTER TABLE reception_messages
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,4);

-- ── 5. Add unread_count to sms_conversations if missing ───────────
ALTER TABLE sms_conversations
  ADD COLUMN IF NOT EXISTS unread_count INT DEFAULT 0;

-- ── 6. Performance indexes — all critical query paths ─────────────

-- user_roles (login speed — most critical)
CREATE INDEX IF NOT EXISTS idx_user_roles_uid   ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_uid_r ON user_roles(user_id, role);

-- notifications (realtime, polling)
CREATE INDEX IF NOT EXISTS idx_notifications_uid       ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread    ON notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_created   ON notifications(created_at DESC);

-- requisitions
CREATE INDEX IF NOT EXISTS idx_req_status     ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_req_created_at ON requisitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_req_created_by ON requisitions(created_by);

-- purchase_orders
CREATE INDEX IF NOT EXISTS idx_po_status     ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_created_at ON purchase_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier   ON purchase_orders(supplier_id);

-- goods_received
CREATE INDEX IF NOT EXISTS idx_grn_status ON goods_received(status);
CREATE INDEX IF NOT EXISTS idx_grn_po_id  ON goods_received(purchase_order_id);

-- items (inventory)
CREATE INDEX IF NOT EXISTS idx_items_stock ON items(quantity_in_stock);
CREATE INDEX IF NOT EXISTS idx_items_cat   ON items(category_id);

-- sms
CREATE INDEX IF NOT EXISTS idx_sms_log_created   ON sms_log(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_conversations  ON sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_convos_updated ON sms_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_rcpt_msgs_phone    ON reception_messages(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_rcpt_msgs_created  ON reception_messages(created_at DESC);

-- audit
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── 7. Enable realtime on key tables ────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE notifications;    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE requisitions;     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE reception_messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE sms_conversations; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 8. Fix user_roles role constraint — include all roles ─────────
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check CHECK (
    role IN (
      'admin','database_admin','procurement_manager','procurement_officer',
      'inventory_manager','warehouse_officer','requisitioner','accountant'
    )
  );

-- ── 9. Reload schema ──────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
