/**
 * Direct Supabase Admin API Fix for Twilio Configuration
 * This script uses the service role key to update system_settings
 */
const https = require('https');

// Configuration - using the service role key from environment
const SUPABASE_URL = 'https://yvjfehnzbzjliizjvuhq.supabase.co';

// Note: This script would need SUPABASE_SERVICE_ROLE_KEY to work
// For now, we create an SQL file that can be run in the Supabase SQL Editor

const FIX_SQL = `
-- ============================================
-- TWILIO CONFIGURATION FIX - Run in Supabase SQL Editor
-- ============================================

-- 1. Check current Twilio settings
SELECT * FROM system_settings WHERE key LIKE 'twilio%';

-- 2. Delete old/wrong Twilio settings
DELETE FROM system_settings WHERE key IN (
  'twilio_account_sid', 
  'twilio_auth_token', 
  'twilio_from_number',
  'twilio_whatsapp_from',
  'twilio_messaging_service_sid'
);

-- 3. Insert correct Twilio settings (Account SID from testing)
-- NOTE: Replace <ACCOUNT_SID> and <AUTH_TOKEN> with your actual values from Twilio Console
INSERT INTO system_settings (key, value) VALUES 
  ('twilio_from_number', '+16812972643'),
  ('twilio_whatsapp_from', 'whatsapp:+14155238886'),
  ('twilio_messaging_service_sid', '');

-- 4. Verify the fix
SELECT * FROM system_settings WHERE key LIKE 'twilio%';

-- 5. Then redeploy edge functions:
-- supabase functions deploy send-sms
-- supabase functions deploy send-whatsapp
-- supabase functions deploy twilio-engine
-- supabase functions deploy whatsapp-bot
`;

const FIX_SCRIPT = `#!/bin/bash
# Twilio Fix Script for EL5 MediProcure
# Run this after updating system_settings via SQL Editor

echo "Redeploying edge functions..."

supabase functions deploy send-sms
supabase functions deploy send-whatsapp  
supabase functions deploy twilio-engine
supabase functions deploy whatsapp-bot

echo "Done! Run: node scripts/test-twilio-integration.js"
`;

console.log('=== SQL FIX SCRIPT (Run in Supabase SQL Editor) ===');
console.log(FIX_SQL);
console.log('');
console.log('=== SHELL FIX SCRIPT (Run after SQL) ===');
console.log(FIX_SCRIPT);