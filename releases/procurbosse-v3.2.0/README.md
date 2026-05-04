# 🏥 ProcurBosse v3.2.0 — v3 Module Restore

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government | Kenya

> **Status**: lts | Built: 2026-05-04 06:36 UTC

---

## 🌐 Live Application
**https://procurbosse.edgeone.app**

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
procurbosse-v3.2.0/
├── web/              ← Deploy to EdgeOne / Vercel / Nginx / Apache
│   ├── index.html    ← SPA entry point
│   ├── assets/       ← JS / CSS / images (13 optimized chunks)
│   └── edgeone.json  ← SPA routing (all paths → index.html)
│
├── src/              ← Full TypeScript source code
│   ├── pages/        ← 54 page components
│   ├── components/   ← Shared components
│   ├── contexts/     ← AuthContext, SettingsContext
│   ├── lib/          ← Business logic, engines
│   └── integrations/ ← Supabase client
│
├── electron/         ← Electron desktop app source
│   └── main.js       ← Main process
│
├── sql/              ← All Supabase DB migrations (50 files)
├── docs/             ← User manuals & technical guides
├── installers/       ← Windows BAT scripts
│   ├── SETUP.bat     ← Interactive setup
│   ├── LAUNCH.bat    ← Quick launch browser
│   └── BUILD_EXE.bat ← Build Windows EXE locally
│
├── package.json      ← NPM dependencies
├── vite.config.ts    ← Build config
├── electron-builder.yml ← EXE packaging config
├── RELEASE.json      ← Machine-readable release info
└── README.md         ← This file
```

---

## 🚀 Web Deployment

### EdgeOne (Production)
Upload contents of `web/` folder to your EdgeOne project. `edgeone.json` handles SPA routing.

### Vercel
```bash
cd web && vercel --prod
```

### Nginx
```nginx
server {
  root /var/www/procurbosse;
  location / { try_files $uri /index.html; }
}
```

### Apache
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /index.html [L]
```

---

## 🖥️ Desktop EXE Build (Windows)

**Requirements**: Node.js 20+, Windows 10/11

```cmd
cd procurbosse-v3.2.0
npm ci --ignore-scripts
npx vite build
npx electron-builder --win --x64 --config electron-builder.yml
```

Output: `dist-electron/ProcurBosse-v3.2.0-Windows-Setup.exe`

Or run: `installers\BUILD_EXE.bat`

---

## 🗄️ Database Setup

1. Create project at [supabase.com](https://supabase.com)
2. Run SQL migrations in **Supabase SQL Editor** (in order):
   - Run all files in `sql/` directory chronologically
   - Key file: `sql/20260502200000_samwise_admin.sql` — creates admin trigger
3. Create user in **Supabase > Authentication > Users**:
   - Email: `samwise@gmail.com`, Password: `samwise@gmail.com`
4. Run: `SELECT assign_role_by_email('samwise@gmail.com', 'admin');`

---

## 📋 Modules (54 pages, 9 roles)

| Module | Pages | Roles |
|--------|-------|-------|
| Procurement | Requisitions, POs, GRN, Suppliers, Tenders, Bid Eval, Contracts | admin, procurement_manager, procurement_officer, requisitioner |
| Finance | Dashboard, Budgets, Chart of Accounts, Fixed Assets | admin, accountant, procurement_manager |
| Vouchers | Payment, Receipt, Journal, Purchase, Sales | admin, accountant |
| Quality | Dashboard, Inspections, Non-Conformance | admin, warehouse_officer |
| Inventory | Items, Categories, Departments, Scanner | admin, inventory_manager |
| Communications | Email, SMS, Telephony, Notifications, Reception | all roles |
| Administration | Panel, DB, Users, Settings, Backup, Webmaster, ODBC, Facilities, IP, GUI, Changelog | admin, database_admin |
| Accountant Workspace | Full accountant module | admin, accountant |
| Reports | Analytics & reports | admin, procurement_manager |

---

*Built with React 18 · TypeScript · Vite 5 · Supabase · Tailwind CSS · Electron*
