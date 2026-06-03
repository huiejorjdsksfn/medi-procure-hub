# 🏥 EL5 MediProcure — ProcurBosse v11.0.0

**Hospital Procurement & ERP System — Embu Level 5 Hospital, Embu County Government, Kenya**

> Full procure-to-pay workflow · WhatsApp Business automation · Role-based access · Twilio integration · Supabase/PostgreSQL backend

[![Version](https://img.shields.io/badge/version-11.0.0-brightgreen)](https://github.com/huiejorjdsksfn/medi-procure-hub/releases)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/huiejorjdsksfn/medi-procure-hub/actions)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Electron-blue)](https://procurbosse.edgeone.app)
[![Stack](https://img.shields.io/badge/stack-React%2018%20%2B%20Supabase%20%2B%20Tailwind-blueviolet)](https://github.com/huiejorjdsksfn/medi-procure-hub)

---

## 🖥️ System Screenshots

### Dashboard — Live KPIs & Quick Actions
```
┌─────────────────────────────────────────────────────────────────────┐
│  🏥 EL5 MediProcure  v11.0.0          [🔔 3] [👤 Admin] [⚙️]      │
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
│  Role: Procurement Manager               EL5 MediProcure v11.0.0   │
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

## 🚀 What's New in v11.0.0

### 💬 Full WhatsApp Business Workflow Hub
- **8-tab WhatsApp page**: Sessions, Compose, Broadcast, Templates, Approvals, Workflows, History, Settings
- **16 procurement message templates** covering requisitions, POs, GRNs, payments, tenders, budgets, low stock
- **Reply-based approval automation**: Approvers reply `APPROVE` or `REJECT reason` on WhatsApp → system auto-updates status
- **Twilio webhook edge function** (`whatsapp-webhook`) handles all inbound WA messages
- **Broadcast** to multiple recipients with sandbox group management
- **Session management**: 72h window tracking, expired session re-invite, QR code join
- **Live message preview** with WhatsApp markdown rendering (*bold*, _italic_)
- **Procure-to-pay workflow diagram** inside Workflows tab
- **WhatsApp integrated** across: ERP Wheel (Comms segment), Dashboard quick actions, sidebar navigation

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

## 📦 Modules (50+ pages)

| Category | Modules |
|---|---|
| **Procurement** | Requisitions, Purchase Orders, GRN, Suppliers, Contracts, Tenders, Bid Evaluations, Procurement Planning |
| **Finance** | Financial Dashboard, Budgets, Chart of Accounts, Fixed Assets, Payment/Receipt/Journal/Purchase/Sales Vouchers, Accountant Workspace |
| **Inventory** | Items/Stock, Categories, Departments, Scanner |
| **Communications** | Email (Gmail-style), SMS, **WhatsApp Hub**, Telephony, Reception, Inbox, Notifications |
| **Quality** | QC Dashboard, Inspections, Non-Conformance |
| **Reports & BI** | 8 report types, CSV export, print, Audit Log, Documents |
| **Administration** | Users, Settings, Admin Panel (8 tabs), Webmaster, IP Access, ODBC, Backup, DB Monitor, GUI Editor, Facilities, HMIS Sync, Changelog |

## 👥 Roles (9)

`admin` · `procurement_manager` · `procurement_officer` · `requisitioner` · `inventory_manager` · `warehouse_officer` · `accountant` · `reception` · `viewer`

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

**Admin Login:** `samwise@gmail.com` / `samwise@gmail.com`

---

## 📋 Changelog

### v11.0.0 — WhatsApp Pro (2026-06-03)
- ✅ Full WhatsApp Business Workflow Hub (8 tabs)
- ✅ Twilio webhook for reply-based approvals
- ✅ 16 WhatsApp message templates
- ✅ Session management with QR code join
- ✅ Broadcast to multiple recipients
- ✅ Workflow automation (7 configurable rules)
- ✅ WhatsApp in ERP wheel, dashboard, sidebar nav

### v10.0.0 — Twilio & Docs
- Twilio templates v2, Document Editor print templates

### v9.6.0 — Resilience
- 404 tracker, Playwright e2e, release workflow

---

*EL5 MediProcure — Embu Level 5 Hospital · Embu County Government, Kenya*  
*Built with ❤️ using React + Supabase + Twilio*
