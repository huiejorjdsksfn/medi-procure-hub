# Twilio SMS Setup — MediProcure Hub

## Current Configuration (v12.0)

| Setting | Current Value | Status |
|---------|---------------|--------|
| **Account SID** | Stored in Supabase Secrets | ✅ Configured |
| **Auth Token** | Stored in Supabase Secrets | ✅ Configured |
| **SMS FROM Number** | `+16812972643` (VERIFIED) | ✅ Correct |
| **WhatsApp FROM** | `whatsapp:+14155238886` | ✅ Sandbox |
| **Messaging Service** | Not configured | Optional |
| **Africa's Talking** | Not configured | Optional |

## Twilio Account Details

Your Twilio account has:

- **Verified SMS Number**: `+16812972643`
- **Verified Caller ID**: (Check in Twilio Console)
- **WhatsApp Sandbox**: `+14155238886` (code: `join bad-machine`)

## Step-by-Step Configuration

### 1. Verify Twilio Account Setup
Log in to [Twilio Console](https://console.twilio.com/) and confirm:
- Account SID is noted (starts with `AC...`)
- Phone number `+16812972643` is verified

### 2. Set Supabase Edge Function Secrets
In your Supabase project dashboard:
1. Navigate to **Edge Functions** → **Secrets**
2. Add these secrets (if not already present):

```
TWILIO_ACCOUNT_SID=<your_account_sid>
TWILIO_AUTH_TOKEN=<your_auth_token>
TWILIO_FROM_NUMBER=+16812972643
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

**Important**: Replace `<your_account_sid>` and `<your_auth_token>` with your actual Twilio credentials from the Twilio Console.

### 3. Deploy/Redeploy the Edge Function
```bash
supabase functions deploy send-sms
supabase functions deploy send-whatsapp
supabase functions deploy twilio-engine
supabase functions deploy whatsapp-bot
```

### 4. Test from Settings or Command Line
```bash
node scripts/test-twilio-integration.js
```

## Known Issues & Fixes

### Issue: FROM Number Mismatch (Error 21660)
**Symptom**: `Mismatch between the 'From' number +18777804236 and the account`

**Cause**: The edge function was using an old/free trial FROM number that doesn't belong to the current account.

**Fix**: Update `TWILIO_FROM_NUMBER` in Supabase secrets to `+16812972643`

### Issue: Africa's Talking Fallback Failing
**Symptom**: `Africa's Talking not configured`

**Cause**: Twilio SMS failed, so the function tried Africa's Talking as fallback.

**Fix**: Either configure Africa's Talking OR fix the Twilio configuration so it doesn't need fallback.

## SMS Templates

The `send-sms` edge function supports these event types (with template rendering):

| Event | Trigger | Variables |
|-------|---------|-----------|
| `requisition_submitted` | New requisition created | `num`, `dept`, `user` |
| `requisition_approved` | Manager approves requisition | `num`, `approver` |
| `requisition_rejected` | Requisition rejected with reason | `num`, `reason` |
| `requisition_pending` | Reminder to pending approver | `num` |
| `po_raised` | Purchase Order created | `num`, `supplier`, `total` |
| `po_sent` | PO sent to supplier | `num`, `supplier`, `eta` |
| `goods_received` | Goods received and GRN recorded | `num`, `po`, `items` |
| `inspection_passed` | Item inspection passed | `item` |
| `inspection_failed` | Item inspection failed | `item`, `action` |
| `low_stock_alert` | Item stock below threshold | `item`, `qty`, `unit`, `reorder` |
| `payment_voucher` | Payment voucher ready | `num`, `amount` |
| `payment_approved` | Payment approved | `num`, `amount`, `payee`, `date` |
| `payment_processed` | Payment processed | `amount`, `payee`, `num`, `ref` |
| `invoice_matched` | Invoice matched to PO | `inv`, `po`, `amount` |
| `budget_alert` | Budget threshold exceeded | `dept`, `pct`, `code` |
| `contract_expiring` | Contract expiry reminder | `num`, `supplier`, `date` |
| `system_alert` | Custom system notification | `message` |
| `custom` | Free-form message | `message` |

## Example API Call

```typescript
// Using the SMS library
import { sendSms } from "@/lib/sms";

await sendSms({
  to: "+254712345678",
  message: "Your requisition REQ-2026-001 has been approved",
  channel: "sms",
  module: "procurement"
});

// Using the SMS API with template
import { SMSAPI } from "@/lib/api/SMSAPI";

const template = { 
  key: "requisition_approved", 
  content: "REQ {{num}} APPROVED by {{approver}}",
  variables: ["num", "approver"]
};

const message = SMSAPI.renderTemplate(template, { 
  num: "REQ-2026-001", 
  approver: "Dr. Kimani" 
});

await SMSAPI.send("+254712345678", message, { type: "sms" });
```

## Phone Number Format
Always use international format: `+254XXXXXXXXX` for Kenya.

## Testing

Run the test scripts to verify configuration:
```bash
node scripts/test-twilio-integration.js   # Quick status check
node scripts/test-sms-templates.js         # Test all templates
node scripts/debug-twilio.js               # Detailed debugging
```
