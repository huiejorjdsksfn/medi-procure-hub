# EL5 MediProcure ProcurBosse v21.4 — Technical Guide

> **For:** System Administrators / ICT Staff  
> **System:** https://procurbosse.edgeone.app  
> **Supabase:** https://supabase.com/dashboard/project/yvjfehnzbzjliizjvuhq  
> **GitHub:** https://github.com/huiejorjdsksfn/medi-procure-hub

---

## 1. ARCHITECTURE

```
Browser/Desktop App (Electron)
        ↓
EdgeOne CDN (deploy branch → dist/)
        ↓
React 18 + Vite 5 + TypeScript
        ↓
Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
        ↓ (SMS/Voice)
Twilio API → +16812972643 (SMS) / +14155238886 (WhatsApp)
```

## 2. DEPLOYMENT

### EdgeOne (Web)
- Branch: `deploy` (auto-built dist/)
- URL: https://procurbosse.edgeone.app
- Config: `edgeone.json` in deploy branch root
- SPA routing: `_redirects` → `/* /index.html 200`

### GitHub Actions
```
web-build-deploy.yml  → builds Vite → pushes dist/ to deploy branch
supabase-deploy.yml   → runs migrations + deploys 16 edge functions
windows-exe-build.yml → builds Windows EXE (x64 + ia32)
it-admin-build.yml    → builds IT Admin desktop app
releases-all-versions.yml → builds all 21 version EXEs
```

## 3. ENVIRONMENT VARIABLES (GitHub Secrets)

| Secret | Description |
|---|---|
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `TWILIO_ACCOUNT_SID` | `ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | `+16812972643` |
| `TWILIO_WA_NUMBER` | `+14155238886` |
| `TWILIO_MESSAGING_SERVICE_SID` | `MGd547d8e3273fda2d21afdd6856acb245` |

## 4. DATABASE MIGRATIONS

```bash
# Install Supabase CLI
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
sudo mv supabase /usr/local/bin/

# Link project
supabase link --project-ref yvjfehnzbzjliizjvuhq

# Push migrations
supabase db push --project-ref yvjfehnzbzjliizjvuhq

# Check migration status
supabase migration list --project-ref yvjfehnzbzjliizjvuhq
```

## 5. EDGE FUNCTIONS

```bash
# Deploy all 16 functions
supabase functions deploy --project-ref yvjfehnzbzjliizjvuhq --no-verify-jwt

# Set secrets
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACe96c6e0e5edd4de5f5a4c6d9cc7b7c5a \
  TWILIO_AUTH_TOKEN=YOUR_TOKEN \
  TWILIO_PHONE_NUMBER=+16812972643 \
  --project-ref yvjfehnzbzjliizjvuhq
```

## 6. WINDOWS EXE BUILD

```bash
# Install dependencies (skip Electron binary)
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install --legacy-peer-deps

# Build web app
npm run build

# Build Windows EXE (x64)
npx electron-builder --win --x64 --config electron-builder.yml

# Output: dist-electron/ProcurBosse-v21.4.0-x64-Setup.exe
```

## 7. TROUBLESHOOTING

### "Application failed to start"
1. Check deploy branch has matching bundle hash: `git show origin/deploy:index.html | grep assets/index-`
2. Verify that JS file exists: `git ls-tree origin/deploy assets/ | grep index-`
3. If mismatch: rebuild and push dist/ to deploy branch
4. Hard refresh browser: `Ctrl+Shift+R`

### White Screen / Login Not Loading
1. Check browser console (F12) for JavaScript errors
2. The `LiveDatabaseEngine` is now a dynamic import — cannot crash app
3. The login card is always `opacity:1` — only `transform` animates
4. Clear localStorage: `localStorage.clear()` then refresh

### SMS Not Sending
1. Go to `/telephony` — check Twilio status shows ✅
2. Verify E.164 format: `+254XXXXXXXXX`
3. WhatsApp: recipient must send `join bad-machine` to `+14155238886`
4. Check edge function logs: Supabase Dashboard → Functions → send-sms

## 8. KEY FILE LOCATIONS

```
src/
├── main.tsx                    ← App entry (LiveDB dynamic import)
├── App.tsx                     ← Router + all page imports  
├── pages/LoginPage.tsx         ← Blue gradient login (no password reset)
├── pages/DashboardPage.tsx     ← D365 style, role-based tiles
├── pages/EmailPage.tsx         ← Gmail-style email client
├── engines/db/LiveDatabaseEngine.ts  ← 42-table health monitor
├── contexts/AuthContext.tsx    ← Session + roles
├── lib/theme.ts                ← D365 design tokens
└── integrations/supabase/client.ts   ← Supabase client

supabase/
├── functions/                  ← 16 edge functions
└── migrations/                 ← SQL migration files

admin-app/                      ← IT Admin desktop app (separate)
kiosk-app/                      ← Department kiosk (no login)
```

---
*EL5 MediProcure ProcurBosse v21.4 · Embu Level 5 Hospital · April 2026*
