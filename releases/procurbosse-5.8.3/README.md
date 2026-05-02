# ProcurBosse v5.8.3 — Stable — Full v3.2 Modules

**EL5 MediProcure** | Embu Level 5 Hospital | Embu County Government

## Quick Start

### Web Deployment (EdgeOne / Vercel / Netlify)
1. Deploy the `web/` folder to your CDN
2. Configure SPA routing (all paths → index.html)
3. Set environment variables:
   ```
   VITE_SUPABASE_URL=https://yvjfehnzbzjliizjvuhq.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
   ```

### Electron (Windows Desktop App)
```bash
npm run electron:build
```
Produces: `dist-electron/ProcurBosse Setup.exe`

## Demo Login Accounts
| Role | Email | Password |
|------|-------|----------|
| Administrator | samwise@gmail.com | samwise@gmail.com |
| Proc. Manager | manager@el5.co.ke | Manager@1234 |
| Accountant | accountant@el5.co.ke | Account@1234 |
| Proc. Officer | officer@el5.co.ke | Officer@1234 |
| Requisitioner | requisitioner@el5.co.ke | Req@12345 |
| Warehouse | warehouse@el5.co.ke | Warehouse@1234 |

## System Requirements
- Node.js 20+
- Windows 10/11 (for Electron), any browser (for web)
- Supabase account with database provisioned

## Version: 5.8.3
