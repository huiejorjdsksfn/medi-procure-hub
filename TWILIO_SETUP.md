# Twilio SMS Setup — MediProcure Hub

## API Credentials

| Key | Value |
|-----|-------|
| **API Key SID** | `SET_IN_SUPABASE_SECRETS` |
| **Auth Secret** | Set as Supabase secret (see below) |

## Step-by-Step Configuration

### 1. Get your Twilio Account SID & Auth Token
- Log in to [Twilio Console](https://console.twilio.com/)
- Copy your **Account SID** (starts with `AC...`)
- Copy your **Auth Token**
- Note your **Twilio phone number** (e.g. `+12345678900`)

### 2. Set Supabase Edge Function Secrets
In your Supabase project dashboard:
1. Navigate to **Edge Functions** → **Secrets**
2. Add these three secrets:

```
TWILIO_ACCOUNT_SID   = AC...your-account-sid...
TWILIO_AUTH_TOKEN    = SET_IN_SUPABASE_SECRETS
TWILIO_FROM_NUMBER   = +12345678900
```

> ⚠️ The API Key SID `SET_IN_SUPABASE_SECRETS` is used for identification.
> The Auth Secret `SET_IN_SUPABASE_SECRETS` is used as your TWILIO_AUTH_TOKEN.

### 3. Deploy the Edge Function
```bash
supabase functions deploy send-sms
```

### 4. Test from Settings
Go to **Settings → Twilio SMS Configuration → Send Test SMS** and enter a phone number.

## SMS Templates

The `send-sms` edge function supports these event types:

| Event | Trigger |
|-------|---------|
| `requisition_submitted` | New requisition created |
| `requisition_approved` | Manager approves requisition |
| `requisition_rejected` | Requisition rejected with reason |
| `requisition_pending` | Reminder to pending approver |
| `po_raised` | Purchase Order created |
| `po_sent` | PO sent to supplier |
| `goods_received` | Goods received and GRN recorded |
| `low_stock_alert` | Item stock below threshold |
| `system_alert` | Custom system notification |
| `custom` | Free-form message |

## Example API Call

```typescript
await supabase.functions.invoke('send-sms', {
  body: {
    event: 'low_stock_alert',
    to: '+254712345678',
    templateData: {
      item: 'Surgical Gloves (L)',
      qty: '3',
      unit: 'boxes',
    },
  },
});
```

## Phone Number Format
Always use international format: `+254XXXXXXXXX` for Kenya.
