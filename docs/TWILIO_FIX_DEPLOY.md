# Twilio Fix - Deployment Guide

## The Problem

The edge functions are returning the wrong FROM number `+18777804236` instead of the verified number `+16812972643`.

The code has been **fixed** in the repository but the **Supabase edge functions need to be redeployed** to pick up the changes.

## Quick Fix - Run These Commands

### Option 1: Using Supabase CLI

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref yvjfehnzbzjliizjvuhq

# Deploy the fixed edge functions
supabase functions deploy send-sms
supabase functions deploy send-whatsapp
supabase functions deploy twilio-engine
supabase functions deploy whatsapp-bot
```

### Option 2: Manual via Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq
2. Navigate to **Edge Functions**
3. For each function, click the function name and use the online editor to ensure the latest code is deployed
4. Or use the "Redeploy" option if available

### Option 3: Update Secrets Directly

1. Go to https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq
2. Navigate to **Edge Functions** → **Secrets**
3. Add/Update:
   ```
   TWILIO_FROM_NUMBER=+16812972643
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```
4. Redeploy edge functions

## Verify the Fix

After deployment, run:

```bash
node scripts/test-twilio-integration.js
```

Expected output for SMS Status:
```json
{
  "ok": true,
  "version": "12.0",
  "sms_from": "+16812972643",  // Should be this, not +18777804236
  "wa_from": "whatsapp:+14155238886",
  "acct_set": true,
  "auth_set": true
}
```

## What the Code Fix Does

The code now includes this logic in `send-sms/index.ts`:

```typescript
// CRITICAL: Verify FROM number is valid for this account
// The old +18777804236 does NOT belong to account AC9ce73d...
if (FROM === "+18777804236") {
  console.warn("[send-sms] WARNING: Detected old trial number +18777804236. Using verified +16812972643 instead.");
  FROM = "+16812972643";
}
```

This ensures that even if the old FROM number is somehow configured, it will be automatically replaced with the correct verified number.

## If SMS Still Fails After Fix

Check the Twilio Console for:
1. Account SID: `<TWILIO_ACCOUNT_SID>`
2. Verified numbers: `+16812972643` (SMS), `+254116647894` (calls)
3. WhatsApp Sandbox: `+14155238886`

Ensure the Auth Token in Supabase secrets matches the Twilio console.

## Contact

For issues, check:
- Twilio Console: https://console.twilio.com/
- Supabase Dashboard: https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq
- Edge Function Logs: Supabase Dashboard → Edge Functions → Logs