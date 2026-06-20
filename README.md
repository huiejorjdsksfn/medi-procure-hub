# 🏥 EL5 MediProcure — ProcurBosse v11.10.0

**Hospital Procurement & ERP System — Embu Level 5 Hospital, Embu County Government, Kenya**

> Full procure-to-pay workflow · WhatsApp Business automation · Role-based access · Twilio integration · Supabase/PostgreSQL backend

[![Version](https://img.shields.io/badge/version-11.10.0-brightgreen)](https://github.com/huiejorjdsksfn/medi-procure-hub/releases)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/huiejorjdsksfn/medi-procure-hub/actions)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Electron-blue)](https://procurbosse.edgeone.app)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Supabase%20%2B%20Tailwind-blueviolet)](https://github.com/huiejorjdsksfn/medi-procure-hub)

---

## 🖥️ System Screenshots

### Dashboard — Live KPIs & Quick Actions
```
┌─────────────────────────────────────────────────────────────────────┐
│  🏥 EL5 MediProcure  v11.10.0         [🔔 3] [👤 Admin] [⚙️]      │
├──────────┬──────────────────────────────────────────────────────────┤
│          │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ 📋 Proc  │  │ 12 Reqs  │ │ 5 POs   │ │ KES 2.4M │ │ 3 GRNs  │   │
│ 💳 Finance│  │ Pending  │ │ Active  │ │ Budget   │ │ Pending │   │
│ 📦 Inv   │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│ 💬 Comms │                                                          │
│   Email  │  Quick Actions                Activity Feed             │
│   SMS    │  ┌─────────────────────┐     ┌────────────────────────┐ │
│ ✅WhatsApp│  │ + New Requisition   │     │ ✓ PO-045 approved      │ │
│ ⚙️ Admin  │  │ 📦 Receive Goods    │     │ 📋 REQ-089 submitted   │ │
│          │  │ 💰 Record Payment   │     │ 💬 WhatsApp: 4 active  │ │
│          │  │ 📊 View Reports     │     │ ⚠️ Low stock: 3 items  │ │
│          │  │ 💬 WhatsApp Hub     │     └────────────────────────┘ │
└──────────┴──────────────────────────────────────────────────────────┘
```

### WhatsApp Business Hub — 8-Tab Full Workflow
```
┌─────────────────────────────────────────────────────────────────────┐
│  💬 WhatsApp Business Hub    +1 415 523 8886                        │
│  Sessions: 6  Sent(24h): 24  Delivered: 21  Failed: 1              │
├─────────────────────────────────────────────────────────────────────┤
│ [Sessions][Compose][Broadcast][Templates][Approvals][Workflows]...  │
├─────────────────────────────────────────────────────────────────────┤
│  ⚠️ Sandbox Mode: Send "join bad-machine" to +1 415 523 8886       │
├──────────────────────────────────┬──────────────────────────────────┤
│  Active Sessions                 │  📷 QR Code — Join Sandbox       │
│  ┌────────────────────────────┐  │                                  │
│  │ +254722xxx  ● Active       │  │  [██████████████████]           │
│  │ "PO approved, proceed..."  │  │  [██  ██  ████  ██]             │
│  │ [Message] [Re-invite]      │  │  Scan to join WhatsApp          │
│  └────────────────────────────┘  └──────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────┘
```

### WhatsApp Compose — Template-Driven Messaging
```
┌──────────────────────────────────┬──────────────────────────────────┐
│  ✏️ Compose WhatsApp Message     │  📱 Message Preview              │
│                                  │                                  │
│  Phone: [+254722000000        ]  │  ┌──────────────────────────┐   │
│  Name:  [John Doe             ]  │  │ 🏥 *EL5 MediProcure*     │   │
│                                  │  │ ✅ Requisition *REQ-089* │   │
│  Template Variables:             │  │ APPROVED by Dr. Kamau    │   │
│  {{num}}:  [REQ-089           ]  │  │ PO will be raised soon   │   │
│  {{approver}}: [Dr. Kamau     ]  │  │                 12:34 ✓✓ │   │
│                                  │  └──────────────────────────┘   │
│  [💬 Send WhatsApp] [📨 Invite]  │  ⚡ Quick Templates             │
└──────────────────────────────────┴──────────────────────────────────┘
```

### Procurement Workflow — Requisitions
```
┌─────────────────────────────────────────────────────────────────────┐
│  📋 Requisitions                    [+ New Requisition] [Export]    │
├─────────────────────────────────────────────────────────────────────┤
│  REQ-089  Pharmacy Dept    KES 45,000   ⏳ Pending   [Approve][❌] │
│  REQ-088  Theatre Dept     KES 12,500   ✅ Approved  [View PO]     │
│  REQ-087  Lab Dept         KES 8,200    ❌ Rejected  [Resubmit]    │
│  WhatsApp notification sent automatically on status change ✓        │
└─────────────────────────────────────────────────────────────────────┘
```

### Purchase Orders — Three-Way Match
```
┌─────────────────────────────────────────────────────────────────────┐
│  🛒 Purchase Orders                                [+ New PO]       │
├─────────────────────────────────────────────────────────────────────┤
│  PO-045  Karis Pharma  KES 125,000  ✅ Approved  🔗 Invoice Matched│
│  PO-044  MedEquip Ltd  KES 89,000   📦 GRN Done  ⏳ Match Pending  │
│  PO-043  Lab Supplies  KES 34,500   🚚 Ordered   Awaiting GRN      │
└─────────────────────────────────────────────────────────────────────┘
```

### WhatsApp Workflows — Automation Rules
```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚙️ WhatsApp Automation Workflows          4 active workflows       │
├─────────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐             │
│  │ Requisition Auto-Notify                 [ON ●]    │             │
│  │ Trigger: On requisition submit                     │             │
│  │ ✓ Notify HOD via WhatsApp                          │             │
│  │ ✓ Notify Procurement Manager                       │             │
│  │ ✓ Log to audit trail                               │             │
│  └────────────────────────────────────────────────────┘             │
│  ┌────────────────────────────────────────────────────┐             │
│  │ WhatsApp Reply Approval                 [ON ●]    │             │
│  │ Trigger: Incoming APPROVE/REJECT message            │             │
│  │ ✓ Parse reply · ✓ Update system status             │             │
│  └────────────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

### Role-Based Dashboard — 9 Roles
```
┌─────────────────────────────────────────────────────────────────────┐
│  Role: Procurement Manager               EL5 MediProcure v11.10.0  │
├─────────────────────────────────────────────────────────────────────┤
│  My Modules:                                                        │
│  [📋 Requisitions] [🛒 Purchase Orders] [📦 Inventory]             │
│  [📊 Reports]      [💬 WhatsApp Hub]    [💳 Finance]               │
│  [🏢 Suppliers]    [📝 Tenders]         [📜 Contracts]             │
└─────────────────────────────────────────────────────────────────────┘
```

### Admin Panel — 8 Tabs
```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚙️ Admin Panel                                                     │
│  [Overview][Database][Users][Config][Email][SMS][Cron][Security]    │
├─────────────────────────────────────────────────────────────────────┤
│  System Health: ● Online     DB: ● Connected    WA: ● Active       │
│  Users: 12 active   Sessions: 8 online   Uptime: 99.8%             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ SQL Console: SELECT * FROM requisitions LIMIT 10; [Run]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Recent Highlights (v11.5.0 → v11.10.0)

- **Schema reconciliation**: fixed a recurring class of bugs caused by duplicate, conflicting `CREATE TABLE IF NOT EXISTS` migrations across `payment_vouchers`, `receipt_vouchers`, `purchase_vouchers`, `sales_vouchers`, `budgets`, `fixed_assets`, and `gl_entries` — the first migration to run always won, silently dropping columns the frontend depended on
- **Numeric/date input hardening**: empty-string form fields no longer crash inserts on numeric/date columns across 8+ forms (vouchers, contracts, tenders, procurement planning, quality, items)
- **Auth resilience**: fixed user data blanking after a few seconds and role-flip-on-refresh bugs in `AuthContext`
- **Security**: resolved 35+ npm vulnerabilities (4 critical → 0), replaced the abandoned/vulnerable `xlsx` package with the patched `@e965/xlsx` mirror across 24 files, hardened PDF.js text extraction
- **Full coverage audit**: verified all 1,100+ onClick handlers across the app are wired to real functions; found and routed 4 previously-orphaned pages (Enterprise View, System Utilization Report, Print Engine, Tracking & Approval) that existed in code but had no route
- **Edge function resilience**: `send-sms` hardened against cold-start crashes with automatic client-side retry

See the in-app **Changelog** page (Admin → Changelog) for the full version-by-version history.

---

## 🏗️ Architecture

```
React 18 + TypeScript + Vite 5
        │
        ├── Supabase (PostgreSQL + Edge Functions + Realtime)
        │     ├── send-sms           (Twilio SMS + WhatsApp send)
        │     ├── whatsapp-webhook   (Inbound WA reply handler)
        │     ├── send-email         (SMTP + Resend fallback)
        │     └── verify-role        (OTP verification)
        │
        ├── Twilio (WhatsApp Business + SMS)
        │     ├── WA Number: +1 415 523 8886
        │     ├── SMS Number: +1 681 297 2643
        │     └── Messaging Service: MGd547...
        │
        └── Electron (Windows Desktop Wrapper)
```

## 📦 Modules (70+ pages)

| Category | Modules |
|---|---|
| **Procurement** | Requisitions, Purchase Orders, GRN, Suppliers, Contracts, Tenders, Bid Evaluations, Procurement Planning, Tracking & Approval |
| **Finance** | Financial Dashboard, Budgets, Chart of Accounts, Fixed Assets, Payment/Receipt/Journal/Purchase/Sales Vouchers, Accountant Workspace |
| **Inventory** | Items/Stock, Categories, Departments, Scanner |
| **Communications** | Email (Gmail-style), SMS, **WhatsApp Hub**, Telephony, Reception, Inbox, Notifications |
| **Quality** | QC Dashboard, Inspections, Non-Conformance |
| **Reports & BI** | Reports, System Utilization Report, Print Engine, CSV export, Audit Log, Documents |
| **Dashboards** | Standard Dashboard, Enterprise View |
| **Administration** | Users, Settings, Admin Panel, Webmaster, IP Access, ODBC, Backup, DB Monitor, GUI Editor, Facilities, HMIS Sync, Changelog |

## 👥 Roles (12)

`superadmin` · `admin` · `webmaster` · `database_admin` · `procurement_manager` · `procurement_officer` · `inventory_manager` · `warehouse_officer` · `requisitioner` · `accountant` · `finance_officer` · `finance_manager`

## 🔧 Setup

### Prerequisites
- Node.js 18+
- Supabase project
- Twilio account (WhatsApp sandbox or production)

### Web Development
```bash
git clone https://github.com/huiejorjdsksfn/medi-procure-hub.git
cd medi-procure-hub
npm install
npm run dev
```

### Build for Production
```bash
npm run build
# Output in ./web/
```

### Twilio WhatsApp Sandbox Setup
1. Join: Send `join bad-machine` to `+1 415 523 8886` on WhatsApp
2. Or scan the QR code in **WhatsApp Hub → Settings**
3. Configure webhook URL in Twilio console:
   ```
   https://yvjfehnzbzjliizjvuhq.supabase.co/functions/v1/whatsapp-webhook
   ```

## 💾 Windows Installer

Download the latest `.exe` from [Releases](https://github.com/huiejorjdsksfn/medi-procure-hub/releases):

| Installer | Architecture |
|---|---|
| `procurbosse-setup-x64.exe` | Windows 64-bit (recommended) |
| `procurbosse-setup-ia32.exe` | Windows 32-bit |
| `procurbosse-portable.exe` | No install required |

## 🌐 Live URL

**Web App:** https://procurbosse.edgeone.app

> Login credentials are provisioned per-user by a system administrator and are intentionally not published in this README. Contact your facility's database administrator for access.

---

## 📋 Changelog

Full version-by-version history (40+ releases) is maintained in-app at **Admin → Changelog** (`src/lib/version.ts`), updated with every release. Recent highlights:

| Version | Codename | Summary |
|---|---|---|
| 11.10.0 | Schema Reconciliation | Fixed budgets/fixed_assets/gl_entries missing columns, gl_entries.posted_by UUID bug, numeric/date empty-string crashes across 8 forms |
| 11.9.0 | Full Coverage | Routed 4 orphaned pages, exhaustive button-handler audit (zero dead buttons found) |
| 11.8.0 | Security Patch | npm audit (42→7 vulnerabilities, 4 critical→0), xlsx CVE fix, PDF.js hardening |
| 11.7.0 | Button Audit | purchase/sales_vouchers schema fix, 8 dead buttons fixed |
| 11.6.0 | Resilience Pass | ip_access_rules table created, user-data-blanking and role-flip-on-refresh fixed |
| 11.5.0 | Schema Fortress | payment_vouchers/receipt_vouchers gl_account column fix |
| 11.0.0 | WhatsApp Pro | Full WhatsApp Business Workflow Hub (8 tabs), Twilio reply-based approvals, 16 message templates |

---

*EL5 MediProcure — Embu Level 5 Hospital · Embu County Government, Kenya*  
*Built with ❤️ using React + Supabase + Twilio*
