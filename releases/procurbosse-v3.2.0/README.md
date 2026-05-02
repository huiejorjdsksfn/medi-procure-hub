# ProcurBosse v3.2.0 — v3 Module Restore

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government | Kenya

> Status: **lts** | Built: 2026-05-02

## 🌐 Live URL
https://procurbosse.edgeone.app

## 🔐 Sample Login Accounts

| Role | Email | Password |
|------|-------|----------|
| Administrator | tecnojin03@gmail.com | Admin@1234 |
| Proc. Manager | manager@el5.co.ke | Manager@1234 |
| Accountant | accountant@el5.co.ke | Account@1234 |
| Proc. Officer | officer@el5.co.ke | Officer@1234 |
| Requisitioner | requisitioner@el5.co.ke | Req@12345 |
| Warehouse | warehouse@el5.co.ke | Warehouse@1234 |
| Inventory Mgr | inventory@el5.co.ke | Inventory@1234 |
| Reception | reception@el5.co.ke | Reception@1234 |
| DB Admin | dbadmin@el5.co.ke | DBAdmin@1234 |

## 📦 Package Contents

```
procurbosse-v3.2.0/
├── web/              ← Deploy this folder to EdgeOne/Vercel/Nginx
│   ├── index.html
│   ├── assets/
│   └── edgeone.json  ← SPA routing config
├── sql/              ← Run migrations in Supabase SQL Editor
│   └── *.sql
├── docs/             ← User manuals
├── installers/       ← Windows BAT scripts
│   ├── INSTALL.bat
│   └── LAUNCH.bat
├── RELEASE.json      ← Machine-readable release info
└── README.md         ← This file
```

## 🚀 Web Deployment

### EdgeOne (Current)
```bash
# Upload web/ folder contents to EdgeOne project
# edgeone.json handles SPA routing automatically
```

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

## 🖥️ Desktop App (Windows)

Build EXE locally:
```bash
npm ci --ignore-scripts
npx vite build
npx electron-builder --win --x64
```
Produces: `dist-electron/ProcurBosse-Setup.exe`

## 🗄️ Database Setup

1. Create Supabase project at supabase.com
2. Run migrations: paste each `sql/*.sql` in Supabase SQL Editor
3. Create demo users in Supabase > Auth > Users (see table above)
4. Run `sql/20260502100000_v583_demo_roles_seed.sql` to assign roles

## 📋 Version Notes
v3.1 modules restored, 14 previously missing pages wired, Communications & Accountant nav groups added

## 🔧 System Requirements
- **Web**: Any modern browser (Chrome 90+, Firefox 90+, Edge 90+)
- **Desktop**: Windows 10/11 x64, 4GB RAM, 500MB disk
- **Server**: Node.js 20+, Supabase account
