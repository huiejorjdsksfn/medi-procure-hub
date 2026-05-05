# 🏥 ProcurBosse v6.0.0 — Pro Elite Release

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government | Kenya

> **Status**: stable | **Codename**: ProElite | Built: 2026-05-05 UTC

---

## 🌐 Live Application
**https://procurbosse.edgeone.app**

---

## 🆕 What's New in v6.0.0 Pro Elite

| Feature | Details |
|---------|---------|
| 🔵 **ERP Command Wheel v4** | 12 outer segments + 8 inner spokes, all modules, role-locked nodes, spin animation |
| 📊 **Dashboard Pro** | Live stats, activity feed (10 events), print button, refresh, offline DB panel |
| 🔒 **All 9 Roles Activated** | Per-role quick action maps, role chips panel (admin view) |
| 🗄️ **database_admin role** | DB, Backup, ODBC, DB Test, Audit Log |
| 💰 **accountant role** | Full vouchers + finance workspace |
| 🎫 **reception role** | Reception Desk, Notifications, Email, Documents |
| 🖨️ **Print Engine** | Dashboard print via window.print, print-safe CSS |
| 📡 **Offline DB Panel** | ODBC Setup + Backup quick links, live sync status |
| 📋 **Grid / List toggle** | Switch quick actions between card grid and list view |
| ♻️ **Live Refresh** | Re-fetches Supabase stats on demand |

---

## 🔐 Login Credentials

### Primary Admin
| Field | Value |
|-------|-------|
| Email | `samwise@gmail.com` |
| Password | `samwise@gmail.com` |
| Role | Administrator (full access) |

### All Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| 🔴 Administrator | `samwise@gmail.com` | `samwise@gmail.com` |
| 🟠 Proc. Manager | `manager@el5.co.ke` | `Manager@1234` |
| 🔵 Accountant | `accountant@el5.co.ke` | `Account@1234` |
| 🟢 Proc. Officer | `officer@el5.co.ke` | `Officer@1234` |
| 🟣 Requisitioner | `requisitioner@el5.co.ke` | `Req@12345` |
| 🔵 Warehouse | `warehouse@el5.co.ke` | `Warehouse@1234` |
| 🟤 Inventory | `inventory@el5.co.ke` | `Inventory@1234` |
| ⚪ Reception | `reception@el5.co.ke` | `Reception@1234` |
| ⚫ DB Admin | `dbadmin@el5.co.ke` | `DBAdmin@1234` |

---

## 📦 Package Contents

```
procurbosse-v6.0.0/
├── README.md              ← This file
├── RELEASE.json           ← Machine-readable release manifest
├── package.json           ← v6.0.0 package descriptor
├── index.html             ← Root HTML entry
├── vite.config.ts         ← Build configuration
├── tailwind.config.ts     ← Tailwind config
├── tsconfig.json          ← TypeScript config
├── electron-builder.yml   ← Desktop EXE build config
├── src/                   ← Full TypeScript source
├── web/                   ← Pre-built web assets (deploy this)
├── electron/              ← Electron desktop wrapper
├── installers/            ← Windows installer scripts
├── sql/                   ← Database migrations
└── docs/                  ← User & admin documentation
```

---

## 🚀 Deployment

### Web (EdgeOne / Vercel / Nginx)
```bash
# Upload contents of web/ to your host
# OR use Vercel CLI:
cd procurbosse-v6.0.0
vercel --prod

# OR nginx:
# Copy web/ to /var/www/html/
# Add: try_files $uri /index.html;
```

### Database Setup
Run SQL migrations in order in Supabase SQL Editor:
```
sql/20260502200000_samwise_admin.sql   ← Admin role setup
sql/20260502200001_user_roles_rls.sql  ← RLS policies
```

### Desktop App (Windows EXE)
Download from [GitHub Releases](https://github.com/huiejorjdsksfn/medi-procure-hub/releases/tag/v6.0.0):
- `ProcurBosse-v6.0.0-x64-Setup.exe` — Windows 10/11 installer
- `ProcurBosse-v6.0.0-x64-Portable.exe` — No-install portable
- `ProcurBosse-v6.0.0-ia32-Setup.exe` — Windows 7/8/10 32-bit

---

## 🛡️ All 9 Roles

| Role | Access Level |
|------|-------------|
| `admin` | Full system — 30 quick actions |
| `database_admin` | Database, Backup, ODBC, DB Test, Audit |
| `procurement_manager` | Procurement, Finance, Vouchers — 17 actions |
| `procurement_officer` | Procurement, Suppliers, Tenders — 10 actions |
| `accountant` | Vouchers, Finance Dashboard, Budgets — 10 actions |
| `inventory_manager` | Items, Categories, Departments, QC — 8 actions |
| `warehouse_officer` | GRN, Stock, Scanner, QC — 6 actions |
| `reception` | Reception Desk, Notifications, Email — 4 actions |
| `requisitioner` | New Requisition, Email, Documents — 3 actions |

---

## 🏗️ Tech Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **UI**: Tailwind CSS + Radix UI + Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Desktop**: Electron 28 (Windows x64/ia32)
- **Offline**: IndexedDB credential cache + ODBC bridge
- **SMS**: Africa's Talking / Twilio Edge Functions
- **Email**: SMTP / Resend Edge Functions
- **Deployment**: EdgeOne (primary) + Vercel (fallback)

---

*EL5 MediProcure Pro v6.0.0 — Embu County Government · Kenya*
