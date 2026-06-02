-- ================================================================
-- EL5 MediProcure v10.0 — Email + WhatsApp Bot Schema
-- ================================================================

-- ── Email logs table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email      TEXT NOT NULL,
  subject       TEXT NOT NULL,
  status        TEXT DEFAULT 'pending',
  provider      TEXT DEFAULT 'resend',
  message_id    TEXT,
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Email templates table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  subject      TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables    TEXT[],
  category     TEXT DEFAULT 'general',
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── WhatsApp bot conversations ────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_bot_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT UNIQUE NOT NULL,
  name       TEXT,
  context    JSONB DEFAULT '{}',
  last_query TEXT,
  last_reply TEXT,
  turn_count INT DEFAULT 0,
  active     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_email_logs_to    ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_cat   ON email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_sessions_phone ON wa_bot_sessions(phone);

-- ── Seed built-in email templates ────────────────────────────────
INSERT INTO email_templates (key, name, subject, html_content, variables, category)
VALUES
  ('requisition_approved',
   'Requisition Approved',
   'Your Requisition {{num}} has been Approved — EL5 MediProcure',
   '<p>Dear {{name}},</p><p>Requisition <strong>{{num}}</strong> has been <strong style="color:#059669">APPROVED</strong>.</p><p>Department: {{dept}}<br/>Approved by: {{approver}}<br/>Date: {{date}}</p><p>A Purchase Order will be raised shortly.</p>',
   ARRAY['num','name','dept','approver','date'],
   'procurement'),
  ('po_raised',
   'Purchase Order Raised',
   'Purchase Order {{num}} Raised — EL5 MediProcure',
   '<p>Dear {{name}},</p><p>Purchase Order <strong>{{num}}</strong> has been raised for <strong>{{supplier}}</strong>.</p><p>Amount: KES {{amount}}<br/>Expected Delivery: {{eta}}</p>',
   ARRAY['num','name','supplier','amount','eta'],
   'procurement'),
  ('low_stock_alert',
   'Low Stock Alert',
   '⚠️ Low Stock Alert: {{item}} — EL5 MediProcure',
   '<p>This is an automated low stock alert.</p><p>Item: <strong>{{item}}</strong><br/>Current Stock: {{qty}} {{unit}}<br/>Reorder Level: {{reorder}}</p><p>Please initiate a requisition immediately.</p>',
   ARRAY['item','qty','unit','reorder'],
   'inventory'),
  ('payment_processed',
   'Payment Processed',
   'Payment of KES {{amount}} Processed — EL5 MediProcure',
   '<p>Dear {{name}},</p><p>Payment Voucher <strong>{{num}}</strong> has been processed.</p><p>Amount: KES {{amount}}<br/>Payee: {{payee}}<br/>Reference: {{ref}}<br/>Date: {{date}}</p>',
   ARRAY['num','name','amount','payee','ref','date'],
   'finance'),
  ('welcome_user',
   'Welcome to EL5 MediProcure',
   'Welcome to ProcurBosse — EL5 MediProcure',
   '<p>Dear {{name}},</p><p>Welcome to <strong>EL5 MediProcure</strong> (ProcurBosse v10) — the Health Procurement ERP for Embu Level 5 Hospital.</p><p>Your account has been created with role: <strong>{{role}}</strong></p><p>Login at: <a href="{{url}}">{{url}}</a></p>',
   ARRAY['name','role','url'],
   'system')
ON CONFLICT (key) DO UPDATE
  SET name=EXCLUDED.name, subject=EXCLUDED.subject, html_content=EXCLUDED.html_content;

-- ── System settings for email ─────────────────────────────────────
INSERT INTO system_settings (key, value, description)
VALUES
  ('resend_api_key',          '',                     'Resend API key — set in Supabase secrets as RESEND_API_KEY'),
  ('smtp_from_email',         'noreply@embu.go.ke',   'From email address'),
  ('smtp_from_name',          'EL5 MediProcure',      'From display name'),
  ('email_bcc',               '',                     'BCC all emails to this address'),
  ('email_notifications_enabled','true',              'Email notifications active'),
  ('whatsapp_bot_enabled',    'true',                 'WhatsApp AI bot active'),
  ('whatsapp_bot_model',      'claude-haiku-4-5-20251001','AI model for WhatsApp bot')
ON CONFLICT (key) DO UPDATE SET description=EXCLUDED.description;

-- ── Realtime for email_logs ────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE email_logs; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
