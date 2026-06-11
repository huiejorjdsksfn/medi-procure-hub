# Twilio Integration Fix Guide - EL5 MediProcure

## Current Problem Identified

Testing revealed the following issues:

### 1. FROM Number Mismatch
```
Status: acct_set=true, auth_set=true
SMS From: +18777804236  ← WRONG (doesn't belong to this account)
Account SID: <stored in Supabase secrets>
```

The Twilio account has a verified number `+16812972643`, 
but the edge function is configured to use `+18777804236`.

### 2. Africa's Talking Fallback Fails
Since Twilio SMS fails (wrong FROM number), the function tries Africa's Talking as fallback, 
which is not configured.

## Required Fix

### Option 1: Update Supabase Edge Function Secrets (Recommended)

1. Log in to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project: `yvjfehnzbzjliizjvuhq`
3. Go to **Edge Functions** → **Secrets**
4. Update these secrets:

| Secret Name | Current Value | New Value |
|-------------|---------------|-----------|
| `TWILIO_FROM_NUMBER` | `+18777804236` | `+16812972643` |
| `TWILIO_WHATSAPP_FROM` | (check current) | `whatsapp:+14155238886` |

5. After updating, **Redeploy the edge functions**:
   ```bash
   supabase functions deploy send-sms
   supabase functions deploy send-whatsapp
   supabase functions deploy twilio-engine
   supabase functions deploy whatsapp-bot
   ```

### Option 2: Update via SQL (If you have database access)

```sql
-- Check current settings
SELECT * FROM system_settings WHERE key LIKE 'twilio%';

-- Update Twilio FROM number
INSERT INTO system_settings (key, value) 
VALUES ('twilio_from_number', '+16812972643')
ON CONFLICT (key) DO UPDATE SET value = '+16812972643';

-- Update WhatsApp FROM
INSERT INTO system_settings (key, value) 
VALUES ('twilio_whatsapp_from', 'whatsapp:+14155238886')
ON CONFLICT (key) DO UPDATE SET value = 'whatsapp:+14155238886';
```

## Test After Fix

After applying the fix, run the test script:

```bash
node scripts/test-twilio-integration.js
```

Expected successful response:
```json
{
  "ok": true,
  "sent": 1,
  "failed": 0,
  "results": [{ "ok": true, "provider": "twilio" }]
}
```

## Twilio Account Details (from testing)

| Setting | Value |
|---------|-------|
| Verified SMS Number | `+16812972643` |
| WhatsApp Sandbox | `+14155238886` |
| Join Code | `join bad-machine` |
| Verified Callers | Check in Twilio Console |

**Note**: Store Account SID in Supabase Edge Function Secrets, never in code.

## WhatsApp Sandbox Setup

To enable WhatsApp without a business account:

1. Enable Twilio WhatsApp Sandbox in your Twilio Console
2. Send `join bad-machine` from your phone to `+14155238886`
3. The number `+254720425195` should be connected

## Alternative: Use Twilio Messaging Service

If you have a Messaging Service SID:

1. Create a Messaging Service in Twilio Console
2. Add `+16812972643` as a sender number
3. Set `TWILIO_MESSAGING_SERVICE_SID` in Supabase secrets

## Verification Checklist

- [ ] `TWILIO_FROM_NUMBER` = `+16812972643`
- [ ] `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886`
- [ ] Edge functions redeployed
- [ ] SMS test succeeds (response: `ok: true`)
- [ ] WhatsApp test succeeds (response: `ok: true`)

## Support

For issues, check:
1. Twilio Console → Logs → Programmable SMS
2. Supabase Edge Function logs
3. Browser console network tab