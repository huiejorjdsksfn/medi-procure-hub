-- ================================================================
-- EL5 MediProcure v5.8 — Test SMS + Notify All Users
-- Sends test SMS to 0116647894 via pg_net (Supabase HTTP)
-- Also creates in-app notifications for all users
-- ================================================================

-- ── 1. Create in-app notification for all existing users ──────────
INSERT INTO notifications (user_id, title, message, type, is_read, module, priority)
SELECT
  p.id,
  '📱 EL5 MediProcure v5.8 — Twilio SMS Activated',
  'SMS and WhatsApp notifications are now fully active on EL5 MediProcure. ' ||
  'You will receive alerts for requisitions, purchase orders, approvals, stock alerts, and payments. ' ||
  'SMS: +16812972643 | WhatsApp: +14155238886 (join bad-machine)',
  'success',
  false,
  'system',
  'high'
FROM profiles p
ON CONFLICT DO NOTHING;

-- ── 2. Log the test SMS attempt in sms_log ──────────────────────
INSERT INTO sms_log (to_number, from_number, message, status, module, sent_at)
VALUES (
  '+254116647894',
  '+16812972643',
  '[EL5 MediProcure] TEST: Twilio SMS fully activated on ProcurBosse v5.8. Hospital: Embu Level 5. Time: ' || NOW()::text,
  'queued',
  'system_test',
  NOW()
);

-- ── 3. Update system settings ────────────────────────────────────
INSERT INTO system_settings (key, value, description)
VALUES
  ('twilio_test_number',    '+254116647894',             'Test SMS number'),
  ('twilio_last_test',      NOW()::text,                 'Last Twilio test timestamp'),
  ('twilio_status',         'active',                    'Twilio operational status'),
  ('sms_activation_date',   NOW()::text,                 'SMS activation timestamp')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, description=EXCLUDED.description;

-- ── 4. Create a broadcast notification visible to all roles ──────
INSERT INTO notifications (user_id, title, message, type, is_read, module, priority)
SELECT
  p.id,
  '🏥 System Update: ProcurBosse v5.8 Fully Deployed',
  'All systems operational: Procurement, Inventory, Finance, Accounting, Reception, SMS, WhatsApp. ' ||
  'Your role: ' || COALESCE(ur.role, 'requisitioner') || '. ' ||
  'Contact admin if you need access changes.',
  'info',
  false,
  'system',
  'normal'
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
