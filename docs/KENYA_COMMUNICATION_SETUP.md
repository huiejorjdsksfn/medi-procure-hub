# Kenya Communication Services Setup Guide
## EL5 MediProcure - Embu Level 5 Hospital

This document describes the communication services configuration for EL5 MediProcure, optimized for Kenya.

---

## Overview

The system supports three communication channels:

| Channel | Primary Provider | Fallback | Status |
|---------|-----------------|----------|--------|
| **SMS** | Africa's Talking | Twilio | ✅ Ready |
| **Voice Calls** | Twilio | None | ✅ Ready |
| **WhatsApp** | Twilio WhatsApp | SMS fallback | ✅ Ready |
| **Email** | Resend | SMTP2GO | ✅ Ready |

---

## SMS Configuration (Primary: Africa's Talking)

### Why Africa's Talking?
- **#1 SMS provider in Kenya** with excellent deliverability
- Local presence and Kenyan telecom partnerships
- Bulk SMS pricing in KES
- Shortcodes available for high-volume campaigns

### Setup Steps

1. **Create Africa's Talking Account**
   - Visit: https://africastalking.com
   - Register and verify your business
   - Get your API key from the dashboard

2. **Configure in Supabase Edge Functions → Secrets**
   ```
   AT_API_KEY = your_api_key_here
   AT_USERNAME = your_username  (usually "sandbox" for dev)
   ```

3. **Update Edge Functions**
   ```bash
   supabase functions deploy send-sms
   ```

### Africa's Talking API Details
- **API Base**: https://api.africastalking.com
- **SMS Endpoint**: POST /version1/messaging
- **Headers**: `apiKey: YOUR_API_KEY`
- **Shortcode**: Available on request

---

## Voice Calls (Twilio)

### Why Twilio for Voice?
- Excellent global voice coverage
- TTS (Text-to-Speech) with Alice voice (en-GB)
- Programmable voice with IVR support
- Kenya-validated number available

### Setup Steps

1. **Twilio Account Setup**
   - Visit: https://twilio.com
   - Upgrade to paid account for Kenya calls (trial has limitations)
   - Verify Kenyan numbers for outbound calls

2. **Required Twilio Numbers**
   - SMS/voice sender: `+16812972643` (verified)
   - Verified Kenyan caller: `+254116647894`
   - WhatsApp sandbox: `whatsapp:+14155238886`

3. **Configure in Supabase Edge Functions → Secrets**
   ```
   TWILIO_ACCOUNT_SID = ACxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN = your_auth_token
   TWILIO_FROM_NUMBER = +16812972643
   ```

4. **For Kenya Calls**
   - Verify recipient numbers in Twilio console, OR
   - Upgrade to paid Twilio account (removes verification restrictions)

---

## WhatsApp (Twilio WhatsApp Sandbox)

### Setup

1. **Enable WhatsApp Sandbox**
   - Log in to Twilio Console
   - Navigate to Messaging → Try WhatsApp
   - Follow activation instructions

2. **Users Join Sandbox**
   - Send `join bad-machine` to `+14155238886`
   - This connects their number to receive WhatsApp messages

3. **WhatsApp FROM Configuration**
   ```
   TWILIO_WHATSAPP_FROM = whatsapp:+14155238886
   ```

### For Production WhatsApp Business
- Apply for WhatsApp Business API via Twilio
- Get your own WhatsApp Business number
- Update `TWILIO_WHATSAPP_FROM` accordingly

---

## Email Configuration (Primary: Resend)

### Why Resend?
- Modern transactional email API
- Excellent deliverability
- Developer-friendly with great SDKs
- Free tier available

### Setup Steps

1. **Create Resend Account**
   - Visit: https://resend.com
   - Create API key from dashboard
   - Verify your sending domain (recommended)

2. **Configure in Supabase Edge Functions → Secrets**
   ```
   RESEND_API_KEY = re_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **Default From Address**
   - Default: `noreply@embu.go.ke`
   - Configure via system_settings table:
     - `smtp_from_email`
     - `smtp_from_name`

### Fallback: SMTP2GO
If Resend is not configured, the system falls back to SMTP2GO:
```
SMTP2GO_API_KEY = your_smtp2go_api_key
```

---

## Supabase Edge Functions Secrets

All secrets must be configured in **Supabase Dashboard → Edge Functions → Secrets**.

### Required Secrets for Full Functionality

```bash
# SMS - Africa's Talking (Primary for Kenya)
AT_API_KEY=your_at_api_key
AT_USERNAME=your_at_username

# Twilio (Voice, WhatsApp, SMS Fallback)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+16812972643
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email - Resend (Primary)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email - SMTP2GO (Fallback)
SMTP2GO_API_KEY=your_smtp2go_api_key
```

### Deploy Edge Functions
```bash
supabase login
supabase link --project-ref yvjfehnzbzjliizjvuhq
supabase functions deploy send-sms
supabase functions deploy send-email
supabase functions deploy make-call
supabase functions deploy twilio-engine
```

---

## Testing the Configuration

### Test SMS Status
```bash
curl -X GET "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/send-sms?action=status" \
  -H "apikey: YOUR_ANON_KEY"
```

### Test Email Status
```bash
curl -X GET "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/send-email" \
  -H "apikey: YOUR_ANON_KEY"
```

### Test Voice Call Status
```bash
curl -X POST "https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/make-call" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"status"}'
```

---

## Phone Number Formatting (Kenya)

The system automatically formats Kenyan phone numbers to E.164 format:

| Input | Output |
|-------|--------|
| `0720425195` | `+254720425195` |
| `254720425195` | `+254720425195` |
| `+254720425195` | `+254720425195` |
| `07XX XXX XXX` | `+2547XXXXXXXX` |

### Valid Prefixes
- `+254` - International format
- `07` - Safaricom
- `01` - Safaricom (old format)
- `7` - Safaricom (short)

---

## Cost Estimates (Kenya)

### SMS
| Provider | Cost per SMS | Notes |
|----------|-------------|-------|
| Africa's Talking | ~KES 0.25-0.50 | Bulk pricing available |
| Twilio | ~$0.0075-0.02 | International rates |

### Voice Calls
| Provider | Cost per minute | Notes |
|----------|-----------------|-------|
| Twilio Kenya | ~$0.015-0.05 | Based on number type |

### Email
| Provider | Cost | Notes |
|----------|------|-------|
| Resend | Free up to 100/day | $20/month for unlimited |
| SMTP2GO | Free up to 25/month | Various paid plans |

---

## Troubleshooting

### SMS Not Sending
1. Check if Africa's Talking credentials are set
2. Verify AT_API_KEY and AT_USERNAME
3. Check Twilio if using fallback
4. Look at Edge Function logs in Supabase

### Voice Calls Failing
1. Ensure Twilio credentials are correct
2. Trial accounts cannot call unverified numbers
3. Upgrade to paid account or verify recipient numbers
4. Check Edge Function logs for specific errors

### WhatsApp Not Working
1. Users must send `join bad-machine` to sandbox
2. For production, need WhatsApp Business API
3. Check `TWILIO_WHATSAPP_FROM` is set correctly

### Email Delivery Issues
1. Verify RESEND_API_KEY is set
2. Check sending domain verification
3. Check spam folders
4. Review Edge Function logs

---

## Support Contacts

- **Africa's Talking**: https://support.africastalking.com
- **Twilio**: https://support.twilio.com
- **Resend**: https://resend.com/support
- **SMTP2GO**: https://support.smtp2go.com

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v15.0 | 2024-06-24 | Added Africa's Talking as primary SMS, Kenya phone formatting |
| v8.0 | 2024-06-24 | Email with Resend primary, SMTP2GO fallback |
| v7.0 | 2024-06-24 | Voice calls with Kenya number support |
