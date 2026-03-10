-- ============================================================
-- EXTERNAL EMAIL SYSTEM — Full migration
-- Adds external email sending, email logs, contact book
-- ============================================================

-- Extended inbox_items with external email support
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS to_email      TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS from_email    TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS cc_email      TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS bcc_email     TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS is_external   BOOLEAN DEFAULT FALSE;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS send_status   TEXT DEFAULT 'pending';
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS sent_at       TIMESTAMPTZ;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS thread_id     UUID;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS has_attachment BOOLEAN DEFAULT FALSE;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS action_taken  TEXT;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS replied_at    TIMESTAMPTZ;
ALTER TABLE inbox_items ADD COLUMN IF NOT EXISTS reply_body    TEXT;

-- Email logs table — full audit trail of all outbound emails
CREATE TABLE IF NOT EXISTS email_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_item_id UUID REFERENCES inbox_items(id) ON DELETE SET NULL,
  sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_email    TEXT NOT NULL,
  from_name     TEXT,
  to_email      TEXT NOT NULL,
  to_name       TEXT,
  cc            TEXT,
  bcc           TEXT,
  subject       TEXT NOT NULL,
  body          TEXT,
  html_body     TEXT,
  priority      TEXT DEFAULT 'normal',
  status        TEXT DEFAULT 'pending',
  smtp_host     TEXT,
  smtp_response TEXT,
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  opened_at     TIMESTAMPTZ,
  clicked_at    TIMESTAMPTZ,
  module        TEXT DEFAULT 'general',
  template_id   TEXT,
  is_bulk       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- External contacts / address book
CREATE TABLE IF NOT EXISTS email_contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  company     TEXT,
  phone       TEXT,
  category    TEXT DEFAULT 'general',
  is_supplier BOOLEAN DEFAULT FALSE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  notes       TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Email templates library
CREATE TABLE IF NOT EXISTS email_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  body        TEXT NOT NULL,
  html_body   TEXT,
  category    TEXT DEFAULT 'general',
  tags        TEXT[],
  is_system   BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Email attachments
CREATE TABLE IF NOT EXISTS email_attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_item_id UUID REFERENCES inbox_items(id) ON DELETE CASCADE,
  email_log_id UUID REFERENCES email_logs(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  file_url     TEXT,
  file_data    TEXT,
  file_size    INTEGER,
  mime_type    TEXT DEFAULT 'application/octet-stream',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- SMTP configurations (multiple SMTP accounts)
CREATE TABLE IF NOT EXISTS smtp_configs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  host        TEXT NOT NULL,
  port        INTEGER DEFAULT 587,
  username    TEXT NOT NULL,
  password    TEXT,
  from_email  TEXT NOT NULL,
  from_name   TEXT DEFAULT 'EL5 MediProcure',
  encryption  TEXT DEFAULT 'tls',
  is_default  BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  last_tested TIMESTAMPTZ,
  test_status TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE email_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE smtp_configs     ENABLE ROW LEVEL SECURITY;

-- RLS Policies — admins + procurement managers see all
CREATE POLICY IF NOT EXISTS "Authenticated users can read email logs"
  ON email_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Authenticated users insert email logs"
  ON email_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Authenticated users update own email logs"
  ON email_logs FOR UPDATE USING (auth.uid() = sender_user_id);

CREATE POLICY IF NOT EXISTS "All users can read email contacts"
  ON email_contacts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Authenticated users manage email contacts"
  ON email_contacts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "All users can read templates"
  ON email_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY IF NOT EXISTS "Authenticated users manage templates"
  ON email_templates FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Authenticated users manage attachments"
  ON email_attachments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS "Admins manage SMTP configs"
  ON smtp_configs FOR ALL USING (auth.uid() IS NOT NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_logs_status     ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email   ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at    ON email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_email_contacts_email  ON email_contacts(email);
CREATE INDEX IF NOT EXISTS idx_inbox_items_external  ON inbox_items(is_external, send_status);
CREATE INDEX IF NOT EXISTS idx_inbox_items_thread    ON inbox_items(thread_id);

-- Seed default email templates
INSERT INTO email_templates (name, subject, body, category, is_system) VALUES
('Purchase Order Notice',
 'Purchase Order {{PO_NUMBER}} — Action Required',
 'Dear {{NAME}},\n\nPlease find attached Purchase Order {{PO_NUMBER}} for your review.\n\nSupplier: {{SUPPLIER}}\nTotal Amount: KES {{AMOUNT}}\nDelivery Date: {{DATE}}\nDelivery Address: Embu Level 5 Hospital, Embu Town\n\nKindly confirm receipt and provide the expected delivery timeline.\n\nBest regards,\n{{SENDER_NAME}}\nProcurement Department\nEmbu Level 5 Hospital\nEmbu County Government\nTel: +254 060 000000',
 'procurement', TRUE),
('Tender Invitation',
 'Invitation to Tender — {{TENDER_NUMBER}}',
 'Dear {{NAME}},\n\nEmbu Level 5 Hospital invites your company to submit a tender for the following:\n\nTender Reference: {{TENDER_NUMBER}}\nTitle: {{TENDER_TITLE}}\nCategory: {{CATEGORY}}\nEstimated Value: KES {{AMOUNT}}\nClosing Date: {{CLOSE_DATE}}\nOpening Date: {{OPEN_DATE}}\n\nBidding documents are available from the Procurement Office.\nSealed bids must be submitted before the closing date.\n\nBest regards,\n{{SENDER_NAME}}\nHead of Procurement',
 'procurement', TRUE),
('Goods Received Note',
 'Goods Received — LPO {{PO_NUMBER}}',
 'Dear {{NAME}},\n\nGoods for Purchase Order {{PO_NUMBER}} have been received at Embu Level 5 Hospital stores.\n\nGRN Number: {{GRN_NUMBER}}\nReceived By: {{RECEIVER}}\nDate: {{DATE}}\nCondition: {{CONDITION}}\nInspection Status: {{STATUS}}\n\nPlease confirm for further processing.\n\nBest regards,\n{{SENDER_NAME}}\nStores Department',
 'procurement', TRUE),
('Payment Notification',
 'Payment Processed — {{REFERENCE}}',
 'Dear {{NAME}},\n\nPayment has been processed and authorized for the following:\n\nReference: {{REFERENCE}}\nAmount: KES {{AMOUNT}}\nPayment Date: {{DATE}}\nPayment Mode: {{MODE}}\nBank: {{BANK}}\n\nPlease confirm receipt at your earliest convenience.\n\nBest regards,\n{{SENDER_NAME}}\nFinance Department',
 'finance', TRUE),
('Contract Award',
 'Contract Award Notification — {{CONTRACT_NUMBER}}',
 'Dear {{NAME}},\n\nWe are pleased to inform you that your company has been awarded Contract {{CONTRACT_NUMBER}}.\n\nContract Title: {{TITLE}}\nContract Value: KES {{AMOUNT}}\nStart Date: {{START_DATE}}\nEnd Date: {{END_DATE}}\n\nKindly visit the Procurement Office to sign the contract documents.\n\nBest regards,\n{{SENDER_NAME}}\nProcurement Manager',
 'procurement', TRUE),
('Meeting Invitation',
 'Meeting Invitation — {{SUBJECT}}',
 'Dear {{NAME}},\n\nYou are invited to attend a meeting as follows:\n\nSubject: {{SUBJECT}}\nDate: {{DATE}}\nTime: {{TIME}}\nVenue: {{VENUE}}\nAgenda: {{AGENDA}}\n\nKindly confirm your attendance by return email.\n\nBest regards,\n{{SENDER_NAME}}',
 'general', TRUE),
('Supplier Registration',
 'Supplier Registration Acknowledgement',
 'Dear {{NAME}},\n\nYour application for supplier registration with Embu Level 5 Hospital has been received.\n\nCompany: {{COMPANY}}\nRegistration Number: {{REG_NUMBER}}\nCategory: {{CATEGORY}}\n\nYour application will be reviewed within 14 working days.\n\nBest regards,\n{{SENDER_NAME}}\nSupplier Relations',
 'procurement', TRUE),
('Action Required',
 'Action Required — {{SUBJECT}}',
 'Dear {{NAME}},\n\nThis is an official notice requiring your attention regarding:\n\n{{SUBJECT}}\n\nDeadline: {{DATE}}\nPriority: {{PRIORITY}}\n\nDetails:\n{{DETAILS}}\n\nPlease take the necessary action and respond at your earliest convenience.\n\nBest regards,\n{{SENDER_NAME}}\nEmbu Level 5 Hospital',
 'general', TRUE)
ON CONFLICT DO NOTHING;

-- Seed default SMTP config (empty — user fills in settings)
INSERT INTO smtp_configs (name, host, port, username, from_email, from_name, is_default, is_active)
VALUES ('Primary SMTP', 'smtp.gmail.com', 587, '', 'noreply@embu-l5.go.ke', 'EL5 MediProcure', TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- Seed supplier contacts from existing suppliers
INSERT INTO email_contacts (name, email, company, category, is_supplier, supplier_id)
SELECT 
  COALESCE(s.contact_person, s.name),
  s.email,
  s.name,
  'supplier',
  TRUE,
  s.id
FROM suppliers s
WHERE s.email IS NOT NULL AND s.email != ''
ON CONFLICT (email) DO NOTHING;

-- Log migration
INSERT INTO audit_log (action, table_name, new_values, performed_by)
VALUES ('MIGRATION_APPLIED', 'system', '{"migration":"external_email_system","version":"3.0","tables_created":5}', 'System')
ON CONFLICT DO NOTHING;
