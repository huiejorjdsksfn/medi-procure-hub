# EL5 MediProcure — ProcurBosse v21.4

> **Health Procurement ERP System**  
> Embu Level 5 Hospital · Embu County Government · Kenya

[![Deploy Status](https://img.shields.io/badge/deploy-EdgeOne-0078d4?logo=tencentcloud)](https://procurbosse.edgeone.app)
[![Version](https://img.shields.io/badge/version-21.4-success)]()
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20Supabase-61dafb)]()

---

## 🌐 Live System

| Environment | URL |
|---|---|
| **Production** | https://procurbosse.edgeone.app |
| **Supabase** | https://yvjfehnzbzjliizjvuhq.supabase.co |
| **GitHub** | https://github.com/huiejorjdsksfn/medi-procure-hub |

---

## 📋 System Overview

ProcurBosse is a full-stack Health Procurement ERP built for **Embu Level 5 Hospital** covering the entire procurement lifecycle from requisition to payment, with integrated inventory, finance, quality control, communications, and system administration.

### Modules

| Module | Routes | Description |
|---|---|---|
| **Procurement** | `/requisitions`, `/purchase-orders`, `/goods-received`, `/suppliers`, `/tenders`, `/contracts` | Full P2P cycle |
| **Finance** | `/financials/*`, `/vouchers/*`, `/accountant` | Budgets, GL, payment vouchers |
| **Inventory** | `/items`, `/categories`, `/departments`, `/scanner` | Stock management |
| **Quality** | `/quality/*` | Inspections, non-conformance |
| **Communications** | `/sms`, `/telephony`, `/email`, `/inbox` | Twilio SMS/Voice, email |
| **Reports** | `/reports`, `/print-engine`, `/audit-log` | Live reports, print engine |
| **Administration** | `/users`, `/settings`, `/admin/*`, `/webmaster` | Full admin control |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite 5 |
| **UI** | Custom D365/Power BI design system (`src/lib/theme.ts`) |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Edge Functions) |
| **Hosting** | Tencent EdgeOne Pages (CDN) |
| **Desktop** | Electron (Windows x64/ia32 EXE via GitHub Actions) |
| **SMS/Voice** | Twilio (SMS, WhatsApp, Voice calls) |
| **Email** | Resend (SMTP fallback) |

---

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/huiejorjdsksfn/medi-procure-hub.git
cd medi-procure-hub

# Install (skip Electron binary for dev)
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install --legacy-peer-deps

# Create .env.local
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY

# Start dev server (port 8080)
npm run dev
```

### Build

```bash
npm run build          # Production build → dist/
npm run typecheck      # TypeScript check
```

---

## 🔐 GitHub Secrets Required

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `SUPABASE_URL` | `https://yvjfehnzbzjliizjvuhq.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase `anon` public key |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token (from supabase.com/dashboard/account/tokens) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for schema flush) |
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | SMS number e.g. `+16812972643` |
| `TWILIO_WA_NUMBER` | WhatsApp number e.g. `+14155238886` |
| `TWILIO_MESSAGING_SERVICE_SID` | Messaging service SID |

> **Note:** The build has hardcoded fallback values so it will not break if secrets are missing, but using secrets is strongly recommended for security.

---

## 🔄 CI/CD Workflows

| Workflow | Trigger | Action |
|---|---|---|
| `web-build-deploy.yml` | Push to `main` | Build Vite → push built `dist/` to `deploy` branch (EdgeOne reads this) |
| `supabase-deploy.yml` | Push to `main` (supabase paths) | Run DB migrations + deploy 13 Edge Functions |
| `windows-exe-build.yml` | Manual / tag | Build Windows EXE (x64 + ia32) → GitHub Releases |
| `native-builds.yml` | Manual | Alternative native build pipeline |

---

## 👥 User Roles

| Role | Description |
|---|---|
| `superadmin` | Full system access, all modules |
| `webmaster` | System config, users, webmaster panel |
| `admin` | All procurement + admin functions |
| `database_admin` | DB monitor, backup, ODBC |
| `procurement_manager` | Full procurement cycle |
| `procurement_officer` | Requisitions, POs, GRN |
| `accountant` | Finance, vouchers, reports |
| `inventory_manager` | Items, stock, scanner |
| `warehouse_officer` | GRN, goods received |
| `requisitioner` | Create/track requisitions only |

---

## 📁 Project Structure

```
src/
├── pages/           # 40+ page components
│   ├── vouchers/    # Payment, Receipt, Journal, Purchase, Sales vouchers
│   ├── financials/  # Dashboard, Budgets, Chart of Accounts, Fixed Assets
│   └── quality/     # QC Dashboard, Inspections, Non-Conformance
├── components/      # AppLayout, ProtectedRoute, RoleGuard, ErrorBoundary, ...
├── contexts/        # AuthContext (session + roles)
├── hooks/           # useSystemSettings, useSessionTracker, ...
├── lib/             # theme.ts (D365 design tokens), sessionEngine, api.ts
├── engines/db/      # LiveDatabaseEngine (42-table health monitor)
└── integrations/    # Supabase client + generated types

supabase/
├── functions/       # 16 Edge Functions (send-sms, send-email, make-call, ...)
└── migrations/      # Timestamped SQL migrations

.github/workflows/   # 4 CI/CD pipelines
```

---

## 🖥️ Edge Functions

| Function | Description |
|---|---|
| `send-sms` | Twilio SMS + WhatsApp + Africa's Talking fallback |
| `make-call` | Twilio voice calls |
| `send-email` | Resend email (Deno SMTP fallback) |
| `notify-requisition` | Procurement notification dispatcher |
| `track-session` | Session tracking + audit |
| `health-api` | System health endpoint |
| `audit-api` | Audit log API |
| `bulk-ops` | Bulk DB operations |
| `search-api` | Full-text search |
| `export-api` | Data export |
| `mysql-proxy` | MySQL/ODBC proxy |
| `concurrency-api` | Concurrency management |
| `rate-limiter` | Rate limiting |
| `data-integrity` | Data integrity checks |
| `notify-api` | Notification dispatch |
| `api-gateway` | API gateway |

---

## 📞 Support

- **ICT Admin**: tecnojin03@gmail.com  
- **System**: https://procurbosse.edgeone.app  
- **Hospital**: Embu Level 5 Hospital, P.O. Box 384-60100, Embu, Kenya
