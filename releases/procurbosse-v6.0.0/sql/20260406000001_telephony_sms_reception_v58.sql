-- ═══════════════════════════════════════════════════════════════
-- EL5 MediProcure v5.8 — Telephony, SMS & Reception Full Schema
-- ProcurBosse · Embu Level 5 Hospital
-- ═══════════════════════════════════════════════════════════════

-- ── Reception Visitors (enhanced) ─────────────────────────────
CREATE TABLE IF NOT EXISTS reception_visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  id_number TEXT,
  organization TEXT,
  purpose TEXT DEFAULT 'general',
  host_name TEXT,
  host_department TEXT,
  badge_number TEXT,
  temperature NUMERIC(4,1),
  symptoms TEXT[],
  notes TEXT,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','checked_in','with_host','checked_out','denied')),
  check_in_time TIMESTAMPTZ DEFAULT now(),
  check_out_time TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Reception Appointments ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reception_appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  host_name TEXT,
  host_department TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  purpose TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','confirmed','in_progress','completed','cancelled','no_show')),
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Reception Calls ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reception_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_name TEXT,
  caller_phone TEXT NOT NULL,
  purpose TEXT,
  department TEXT,
  staff_contacted TEXT,
  call_status TEXT DEFAULT 'incoming' CHECK (call_status IN ('incoming','outgoing','missed','voicemail','transferred')),
  duration_seconds INTEGER,
  notes TEXT,
  recording_url TEXT,
  called_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  handled_by UUID REFERENCES auth.users(id)
);

-- ── Reception Messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reception_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_name TEXT,
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  message_type TEXT DEFAULT 'sms' CHECK (message_type IN ('sms','whatsapp','email')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound','outbound')),
  department TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','received')),
  twilio_sid TEXT,
  error_code TEXT,
  error_message TEXT,
  segments INTEGER DEFAULT 1,
  cost NUMERIC(10,6) DEFAULT 0,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Phone Extensions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_extensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  extension_number TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  display_name TEXT NOT NULL,
  department TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','busy','offline','dnd','ringing')),
  forward_to TEXT,
  voicemail_enabled BOOLEAN DEFAULT true,
  sip_password TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Phone Calls (PBX) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS phone_calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_extension TEXT,
  caller_name TEXT,
  callee_extension TEXT,
  callee_name TEXT,
  direction TEXT DEFAULT 'inbound' CHECK (direction IN ('inbound','outbound','internal')),
  start_time TIMESTAMPTZ DEFAULT now(),
  answer_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing','connected','completed','missed','failed','transferred','voicemail')),
  recording_url TEXT,
  ivr_path TEXT[],
  transferred_to TEXT,
  department TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── IVR Menus ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ivr_menus (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  greeting_text TEXT NOT NULL,
  timeout_ms INTEGER DEFAULT 10000,
  max_retries INTEGER DEFAULT 3,
  fallback_action TEXT DEFAULT 'voicemail',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ivr_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID REFERENCES ivr_menus(id) ON DELETE CASCADE,
  digit TEXT NOT NULL,
  description TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('transfer','submenu','voicemail','repeat','hangup','play_message')),
  target TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  UNIQUE (menu_id, digit)
);

-- ── Call Queues ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS call_queues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  strategy TEXT DEFAULT 'round_robin' CHECK (strategy IN ('round_robin','least_recent','skill_based','priority')),
  max_wait_seconds INTEGER DEFAULT 300,
  hold_music_url TEXT,
  overflow_queue_id UUID REFERENCES call_queues(id),
  announce_position BOOLEAN DEFAULT true,
  wrap_up_seconds INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID REFERENCES call_queues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  extension TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 1,
  status TEXT DEFAULT 'available' CHECK (status IN ('available','busy','offline','paused')),
  calls_handled INTEGER DEFAULT 0,
  last_call_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (queue_id, extension)
);

-- ── SMS Templates ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general' CHECK (category IN ('appointment','alert','reminder','notification','general','procurement','finance')),
  is_active BOOLEAN DEFAULT true,
  use_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── SMS Bulk Operations ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_bulk_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  body TEXT NOT NULL,
  recipients_count INTEGER DEFAULT 0,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  template_id UUID REFERENCES sms_templates(id),
  created_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── SMS Conversations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  contact_name TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','assigned','resolved','closed')),
  assigned_to UUID REFERENCES auth.users(id),
  department TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Voicemails ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voicemails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  for_extension TEXT NOT NULL,
  from_number TEXT,
  from_name TEXT,
  audio_url TEXT,
  transcript TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'new' CHECK (status IN ('new','listened','archived')),
  received_at TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reception_visitors_status ON reception_visitors(status);
CREATE INDEX IF NOT EXISTS idx_reception_visitors_checkin ON reception_visitors(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_reception_calls_at ON reception_calls(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_reception_messages_created ON reception_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_phone_calls_start ON phone_calls(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_phone_calls_status ON phone_calls(status);
CREATE INDEX IF NOT EXISTS idx_phone_extensions_dept ON phone_extensions(department);
CREATE INDEX IF NOT EXISTS idx_sms_conversations_phone ON sms_conversations(phone_number);
CREATE INDEX IF NOT EXISTS idx_voicemails_extension ON voicemails(for_extension);

-- ── RLS ────────────────────────────────────────────────────────
ALTER TABLE reception_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE reception_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ivr_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voicemails ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read/write reception data
CREATE POLICY "reception_auth" ON reception_visitors FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "appointments_auth" ON reception_appointments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "calls_auth" ON reception_calls FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "messages_auth" ON reception_messages FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "phone_ext_auth" ON phone_extensions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "phone_calls_auth" ON phone_calls FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "ivr_read" ON ivr_menus FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "ivr_write" ON ivr_menus FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id=auth.uid() AND role IN ('admin')));
CREATE POLICY "sms_templates_auth" ON sms_templates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "sms_bulk_auth" ON sms_bulk_operations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "sms_conv_auth" ON sms_conversations FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "voicemail_own" ON voicemails FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Realtime ───────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE reception_visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE reception_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE reception_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE phone_calls;
ALTER PUBLICATION supabase_realtime ADD TABLE sms_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE voicemails;

-- ── Seed IVR Menus ─────────────────────────────────────────────
INSERT INTO ivr_menus (menu_key, name, greeting_text, timeout_ms, max_retries, fallback_action, sort_order) VALUES
('main', 'Main Menu', 'Welcome to Embu Level 5 Hospital ERP system. Press 1 for Procurement, 2 for Finance, 3 for Pharmacy, 4 for Patient Enquiries, 5 for Inventory, 0 for Operator or Reception.', 12000, 3, 'voicemail', 0),
('procurement', 'Procurement Menu', 'Procurement Department. Press 1 for Purchase Orders, 2 for Supplier Registration, 3 for Tender Enquiries, 4 for Requisitions, 0 to return to main menu.', 10000, 2, 'voicemail', 1),
('finance', 'Finance Menu', 'Finance Department. Press 1 for Payment Status, 2 for Voucher Enquiries, 3 for Budget, 0 to return to main menu.', 10000, 2, 'voicemail', 2),
('inventory', 'Inventory Menu', 'Inventory Department. Press 1 for Stock Enquiries, 2 for GRN Status, 3 for Warehouse, 0 to return to main menu.', 10000, 2, 'voicemail', 3)
ON CONFLICT (menu_key) DO NOTHING;

-- ── Seed SMS Templates ─────────────────────────────────────────
INSERT INTO sms_templates (name, content, variables, category) VALUES
('Visitor Arrival', 'Hello {{host_name}}, your visitor {{visitor_name}} has arrived at the reception of {{hospital_name}}. Please proceed to reception. Time: {{time}}', ARRAY['host_name','visitor_name','hospital_name','time'], 'notification'),
('Appointment Reminder', 'Reminder: You have an appointment at Embu Level 5 Hospital on {{date}} at {{time}} with {{host_name}}. Department: {{department}}. Please bring your ID.', ARRAY['date','time','host_name','department'], 'appointment'),
('Requisition Approved', 'Your requisition {{req_id}} has been approved by {{approver}}. Expected PO creation: {{expected_date}}. EL5 MediProcure.', ARRAY['req_id','approver','expected_date'], 'procurement'),
('PO Sent to Supplier', 'Dear {{supplier_name}}, Purchase Order {{po_number}} worth KES {{amount}} has been issued. Please confirm receipt and delivery date. EL5 Hospital Procurement.', ARRAY['supplier_name','po_number','amount'], 'procurement'),
('GRN Received', 'Goods Received Note {{grn_number}} recorded for PO {{po_number}}. Items: {{item_count}}. Received by: {{received_by}}. EL5 MediProcure.', ARRAY['grn_number','po_number','item_count','received_by'], 'procurement'),
('Low Stock Alert', 'ALERT: {{item_name}} stock is critically low ({{current_stock}} {{unit}}). Reorder level: {{reorder_level}}. Please initiate procurement. EL5 Inventory.', ARRAY['item_name','current_stock','unit','reorder_level'], 'alert'),
('Payment Approved', 'Payment voucher {{voucher_id}} for KES {{amount}} to {{payee}} has been approved. Reference: {{reference}}. EL5 Finance.', ARRAY['voucher_id','amount','payee','reference'], 'finance'),
('Budget Alert', 'BUDGET WARNING: {{department}} department has consumed {{percent}}% of budget for {{period}}. Remaining: KES {{remaining}}. EL5 Finance.', ARRAY['department','percent','period','remaining'], 'alert')
ON CONFLICT DO NOTHING;

-- ── Seed Phone Extensions ──────────────────────────────────────
INSERT INTO phone_extensions (extension_number, display_name, department, status, voicemail_enabled) VALUES
('100', 'Reception Main', 'Reception', 'available', true),
('101', 'Procurement Office', 'Procurement', 'available', true),
('102', 'Finance Department', 'Finance', 'available', true),
('103', 'Inventory/Warehouse', 'Inventory', 'available', true),
('104', 'Admin Office', 'Administration', 'available', true),
('105', 'ICT Department', 'ICT', 'available', true),
('200', 'Pharmacy', 'Pharmacy', 'available', true),
('201', 'Maternity Ward', 'Maternity', 'available', true),
('202', 'Casualty/A&E', 'Casualty', 'available', true),
('203', 'Laboratory', 'Laboratory', 'available', true),
('204', 'X-Ray/Radiology', 'X-Ray', 'available', true),
('205', 'Paediatrics', 'Paediatrics', 'available', true),
('300', 'Main Switchboard', 'Reception', 'available', true)
ON CONFLICT (extension_number) DO NOTHING;

COMMENT ON TABLE reception_visitors IS 'EL5 MediProcure v5.8 — Hospital visitor management';
COMMENT ON TABLE phone_calls IS 'EL5 MediProcure v5.8 — PBX call records';
COMMENT ON TABLE sms_templates IS 'EL5 MediProcure v5.8 — Reusable SMS message templates';
COMMENT ON TABLE sms_conversations IS 'EL5 MediProcure v5.8 — Two-way SMS conversation threads';
COMMENT ON TABLE ivr_menus IS 'EL5 MediProcure v5.8 — Interactive Voice Response menu system';
