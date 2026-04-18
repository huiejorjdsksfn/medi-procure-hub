# EL5 MediProcure — ProcurBosse v21.4
## User & System Administrator Manual

> **ProcurBosse ERP · Embu Level 5 Hospital · Embu County Government**  
> Health Procurement Division · Version 21.4  
> Live System: https://procurbosse.edgeone.app  
> Document Date: April 2026

---

## TABLE OF CONTENTS

1. [Introduction & System Overview](#1-introduction)
2. [Login & Authentication](#2-login)
3. [Dashboard & ERP Navigation Wheel](#3-dashboard)
4. [Roles & Permissions Matrix](#4-roles)
5. [Procurement Module](#5-procurement)
6. [Finance & Vouchers](#6-finance)
7. [Inventory Management](#7-inventory)
8. [Quality Control](#8-quality)
9. [Communications (SMS / Voice / Email)](#9-communications)
10. [Reports & Print Engine](#10-reports)
11. [System Administration](#11-administration)
12. [Webmaster & Superadmin Panel](#12-webmaster)
13. [Database Monitor & Backup](#13-database)
14. [Edge Functions Reference](#14-edge-functions)
15. [Troubleshooting & FAQ](#15-troubleshooting)

---

## 1. INTRODUCTION

EL5 MediProcure (ProcurBosse) is the official Health Procurement ERP system for **Embu Level 5 Hospital**, Embu County Government, Kenya. It manages the complete procurement lifecycle from requisition to payment, with integrated inventory, finance, quality control, and communications.

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EL5 MediProcure — System Architecture            │
├─────────────┬──────────────┬──────────────┬────────────────────────┤
│  FRONTEND   │   BACKEND    │  MESSAGING   │      HOSTING           │
│             │              │              │                        │
│  React 18   │  Supabase    │  Twilio SMS  │  EdgeOne Pages (CDN)   │
│  TypeScript │  PostgreSQL  │  Twilio WA   │  procurbosse.          │
│  Vite 5     │  Auth        │  Twilio Voice│  edgeone.app           │
│  D365 Theme │  Realtime    │  Resend Email│                        │
│             │  Edge Fns    │              │  GitHub Actions CI/CD  │
└─────────────┴──────────────┴──────────────┴────────────────────────┘
```

### Key Capabilities

- **Procurement**: Full P2P — Requisitions → Purchase Orders → GRN → Payment
- **Finance**: Budgets, GL, Payment/Receipt/Journal Vouchers, 3-way invoice match
- **Inventory**: Items, Stock levels, Barcode scanner, Stock movements
- **Quality**: QC Inspections, Non-Conformance tracking
- **Communications**: SMS/WhatsApp via Twilio, Voice calls, Internal email
- **Administration**: User management, IP access control, Audit logs, Backup

---

## 2. LOGIN & AUTHENTICATION

### 2.1 Accessing the System

Navigate to: **https://procurbosse.edgeone.app**

```
┌────────────────────────────────────────────────────┐
│  [==== DARK BLUE/TEAL BACKGROUND WITH PHOTO ====]  │
│                                                    │
│         ┌──────────────────────────────┐           │
│         │  [Embu Logo]  EL5 MediProcure│           │
│         │               ProcurBosse ERP│           │
│         │    [EMBU LEVEL 5 HOSPITAL]   │           │
│         │                              │           │
│         │        STAFF SIGN IN         │           │
│         │                              │           │
│         │  Email Address               │           │
│         │  ┌──────────────────────┐   │           │
│         │  │ ✉ you@embu.go.ke    │   │           │
│         │  └──────────────────────┘   │           │
│         │                              │           │
│         │  Password                    │           │
│         │  ┌──────────────────────┐   │           │
│         │  │ 🔒 ••••••••      👁 │   │           │
│         │  └──────────────────────┘   │           │
│         │                              │           │
│         │  [🛡 SIGN IN ────────────]  │           │
│         │                              │           │
│         │  🛡 Password issues?         │           │
│         │    Contact your sysadmin.    │           │
│         └──────────────────────────────┘           │
│   • Embu Level 5 Hospital • Embu County Gov • EL5  │
└────────────────────────────────────────────────────┘
```

### 2.2 Sign In Steps

1. Enter your **email address** (e.g. `jane.doe@embu.go.ke`)
2. Enter your **password**
3. Click **SIGN IN** or press `Enter`
4. You will be redirected to the Dashboard automatically

> **First login?** Your administrator will provide credentials and a temporary password. Use the Reset Password page (`/reset-password`) to set a permanent password.

### 2.3 Session Management

- Sessions persist for **8 hours** across page refreshes
- Stored securely in IndexedDB (primary) + localStorage (fallback)
- Auto token-refresh runs every 45 minutes in the background
- Role cache refreshes every 30 minutes

### 2.4 Sign Out

Click your **profile avatar** (top-right) → **Sign Out**, or use the Profile page.

---

## 3. DASHBOARD & ERP NAVIGATION WHEEL

After login you land on the **Dashboard** — the central navigation hub.

### 3.1 Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo] EL5 MediProcure      [Search 🔍] [🔔 3] [✉] [👤 Admin] [⏻] │
├──────────────────────────────────────────────────────────────────────┤
│  Home > Dashboard                                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│    │Pending  │ │Open POs │ │Vouchers │ │Low Stock│ │Active   │   │
│    │Reqs: 12 │ │    8    │ │  Due: 5 │ │   3    │ │Suppliers│   │
│    │  🟡     │ │  🔵     │ │   🟣    │ │  🔴    │ │  🟢 47  │   │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│                                                                      │
│              ┌────── ERP NAVIGATION WHEEL ──────┐                  │
│              │                                   │                  │
│         FINANCE ●─────────────────● PROCUREMENT  │                  │
│              │    ┌───────────┐    │             │                  │
│    INVENTORY ●    │ [EL5 Logo]│    ● QUALITY     │                  │
│              │    │ EL5 MEDI  │    │             │                  │
│       COMMS ●    │ PROCURE   │    ● REPORTS     │                  │
│              │    └───────────┘    │             │                  │
│         USERS ●─────────────────● ADMIN          │                  │
│              │                                   │                  │
│              └───────────────────────────────────┘                  │
│                                                                      │
│  [🔒 IP: 192.168.x.x]  [Active Connections] [🖨 Print Engine]      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 ERP Wheel Segments

Click any segment to expand its sub-links:

| Segment | Colour | Sub-pages |
|---|---|---|
| **PROCUREMENT** | Blue `#0078d4` | Requisitions, POs, GRN, Suppliers, Tenders, Contracts, Bid Evals, Planning |
| **FINANCE** | Purple `#7719aa` | Finance Dashboard, Budgets, Payment Vouchers, Receipt Vouchers, Chart of Accounts, Fixed Assets, Accountant Workspace |
| **INVENTORY** | Teal `#038387` | Items/Stock, Categories, Departments, Scanner, GRN, Reception |
| **QUALITY** | Amber `#d97706` | QC Dashboard, Inspections, Non-Conformance |
| **REPORTS** | Deep Purple `#6b21a8` | Reports & BI, Print Engine, Audit Log, Documents, Notifications |
| **COMMS** | Blue `#0369a1` | SMS, Telephony, Email, Inbox |
| **USERS** | Green `#059669` | User Management |
| **ADMIN** | Red `#b91c1c` | Admin Panel, Settings, Webmaster, IP Access, DB Monitor, Backup |

### 3.3 Top Navigation Bar

```
[Logo] [Module Tabs: Home | Procurement | Finance | Inventory | ...] [🔔] [✉] [👤]
       └── Sub-command bar changes per active module tab ──────────────────────────
```

The sub-command bar (blue ribbon under the tabs) shows quick-actions for the current module.

### 3.4 Global Search

Press the **Search** icon (top bar) or click anywhere in the search box. Type to instantly filter:
- Requisitions, Purchase Orders, Suppliers, Items by name or number

---

## 4. ROLES & PERMISSIONS MATRIX

```
Role                │ Procurement │ Finance │ Inventory │ Quality │ Admin │ Comms
────────────────────┼─────────────┼─────────┼───────────┼─────────┼───────┼──────
superadmin          │     ✅      │   ✅    │    ✅     │   ✅    │  ✅   │  ✅
webmaster           │     ✅      │   ✅    │    ✅     │   ✅    │  ✅   │  ✅
admin               │     ✅      │   ✅    │    ✅     │   ✅    │  ✅   │  ✅
database_admin      │     ❌      │   ❌    │    ❌     │   ❌    │ DB✅  │  ❌
procurement_manager │     ✅      │   ✅    │    ✅     │   ❌    │  ❌   │  ✅
procurement_officer │     ✅      │   ❌    │    ✅     │   ❌    │  ❌   │  ✅
accountant          │     ✅      │   ✅    │    ❌     │   ❌    │  ❌   │  ✅
inventory_manager   │     ✅      │   ❌    │    ✅     │   ❌    │  ❌   │  ✅
warehouse_officer   │    GRN✅    │   ❌    │   GRN✅   │   ❌    │  ❌   │  ✅
requisitioner       │   Req✅     │   ❌    │    ❌     │   ❌    │  ❌   │  ❌
```

> **Note:** `superadmin`, `webmaster`, and `admin` bypass all role guards and can access every page.

---

## 5. PROCUREMENT MODULE

### 5.1 Procurement Workflow

```
[Requisitioner]       [Procurement Officer]     [Procurement Manager]
      │                        │                         │
      ▼                        ▼                         ▼
 Create Req ──────► Review Req ──────────────► Approve Req
      │                                               │
      │                                               ▼
      │                                     Issue Purchase Order
      │                                               │
      │                                               ▼
      │                              Supplier Delivers → GRN (Goods Received Note)
      │                                               │
      │                                               ▼
      └──────────────────────────────────► 3-Way Match → Payment Voucher
```

### 5.2 Creating a Requisition

1. Navigate to **Procurement → Requisitions** (`/requisitions`)
2. Click **+ New Requisition**
3. Fill in:
   - **Title** — e.g. "Medical Supplies Q2"
   - **Department** — select from dropdown
   - **Items** — add line items with quantity and estimated unit price
   - **Justification** — reason for procurement
4. Click **Submit** to send for approval

```
┌──────────────────────────────────────────────────────────────┐
│  📋 REQUISITIONS          [+ New Requisition]  [🔄] [📥 XLSX]│
├──────────┬─────────────────┬────────────┬────────────────────┤
│ REQ NO.  │ TITLE           │ STATUS     │ AMOUNT      ACTIONS│
├──────────┼─────────────────┼────────────┼────────────────────┤
│REQ/001/26│ Medical Supplies│ ● Submitted│ KES 145,000 [View] │
│REQ/002/26│ Lab Equipment   │ ● Approved │ KES 280,000 [View] │
│REQ/003/26│ PPE Stock       │ ● Draft    │ KES  32,500 [Edit] │
└──────────┴─────────────────┴────────────┴────────────────────┘
```

### 5.3 Purchase Orders

- Auto-generated from approved requisitions or manually created
- Route: `/purchase-orders`
- Key fields: PO Number, Supplier, Line Items, Delivery Date, Terms
- Actions: **Approve**, **Send to Supplier**, **Mark Delivered**

### 5.4 Goods Received Notes (GRN)

- Created when goods arrive at the store
- Route: `/goods-received`
- Links to: Purchase Order → triggers 3-way match for payment

### 5.5 Tenders & Contracts

- **Tenders** (`/tenders`): Open/restricted tender management, closing dates
- **Bid Evaluations** (`/bid-evaluations`): Score suppliers against tender criteria
- **Contracts** (`/contracts`): Award contracts, track milestones, expiry alerts

---

## 6. FINANCE & VOUCHERS

### 6.1 Payment Vouchers

Route: `/vouchers/payment`

```
┌─────────────────────────────────────────────────────────────────┐
│  💳 PAYMENT VOUCHERS    [+ New Voucher]  [Approve Selected]     │
├──────────┬──────────────┬──────────┬──────────┬────────────────┤
│ VOUCHER  │ PAYEE        │ AMOUNT   │ STATUS   │ ACTIONS        │
├──────────┼──────────────┼──────────┼──────────┼────────────────┤
│PV/001/26 │ MedSupply Ltd│ 145,000  │ ●Pending │ [Approve][View]│
│PV/002/26 │ LabTech Kenya│ 280,000  │ ●Approved│ [Pay] [Print]  │
│PV/003/26 │ PPE Dealers  │  32,500  │ ●Draft   │ [Edit][Delete] │
└──────────┴──────────────┴──────────┴──────────┴────────────────┘
```

### 6.2 Voucher Types

| Type | Route | Purpose |
|---|---|---|
| Payment | `/vouchers/payment` | Payments to suppliers |
| Receipt | `/vouchers/receipt` | Money received |
| Journal | `/vouchers/journal` | Adjustments/corrections |
| Purchase | `/vouchers/purchase` | Purchase accounting |
| Sales | `/vouchers/sales` | Revenue entries |

### 6.3 Accountant Workspace

Route: `/accountant-workspace` — 6 tabs:

1. **Invoice Matching** — 3-way match (PO + GRN + Invoice)
2. **Payment Proposals** — Approve/schedule payments
3. **Budget Control** — Monitor budget vs actual spend
4. **GL Postings** — General ledger entries
5. **ERP Sync** — Sync queue status with Dynamics 365
6. **Reports** — Accountant-specific reports

### 6.4 Budgets

Route: `/financials/budgets`

- Set annual budgets by department/category
- Real-time budget utilisation monitoring
- Override approval workflow for over-budget items

---

## 7. INVENTORY MANAGEMENT

### 7.1 Items & Stock

Route: `/items`

```
┌──────────────────────────────────────────────────────────────────┐
│  📦 ITEMS / STOCK          [+ Add Item]  [📊 XLSX]  [🔍 Search]  │
├────────────┬────────────────┬──────┬───────────┬─────────────────┤
│ ITEM CODE  │ NAME           │ UNIT │ STOCK QTY │ VALUE   ACTIONS │
├────────────┼────────────────┼──────┼───────────┼─────────────────┤
│ MED-001    │ Paracetamol    │ Box  │    240    │ 12,000  [Edit]  │
│ MED-002    │ Latex Gloves   │ Box  │  ⚠️ 3    │  1,500  [Edit]  │
│ LAB-001    │ Test Tubes     │ Pack │     50    │  2,500  [Edit]  │
└────────────┴────────────────┴──────┴───────────┴─────────────────┘
                                    ⚠️ = Low stock alert (< 5 units)
```

### 7.2 Barcode Scanner

Route: `/scanner`

- Use device camera or USB barcode reader
- Scan items for quick stock lookup, GRN entry, or stock count
- Supports QR codes and barcodes (Code-128, Code-39, EAN)

### 7.3 Stock Movements

All stock in/out is tracked automatically:
- **In**: GRN receipt, manual adjustment
- **Out**: Requisition issue, manual adjustment
- View history in the Items page → select item → Stock History

---

## 8. QUALITY CONTROL

### 8.1 QC Dashboard

Route: `/quality/dashboard` — Overview of inspection pass/fail rates, open non-conformances

### 8.2 Inspections

Route: `/quality/inspections`

- Link inspections to GRN deliveries
- Record pass/fail, quantity rejected, notes
- Auto-notification to supplier on rejection

### 8.3 Non-Conformance

Route: `/quality/non-conformance`

- Raise NCRs against failed inspections
- Track corrective action status
- Escalate to procurement manager

---

## 9. COMMUNICATIONS

### 9.1 SMS (Twilio)

Route: `/sms`

```
┌────────────────────────────────────────────────────────────────┐
│  📱 SMS CENTRE              Twilio Account: Active ✅           │
├──────────────────────────────────┬─────────────────────────────┤
│  COMPOSE                         │  CONVERSATIONS              │
│  ┌────────────────────────────┐  │  ┌─────────────────────┐   │
│  │ To: +254 7XX XXX XXX       │  │  │ +254 722 XXX XXX    │   │
│  │                            │  │  │ "Delivery confirmed"│   │
│  │ Message:                   │  │  │ 2h ago  ✓✓         │   │
│  │ ┌──────────────────────┐   │  │  ├─────────────────────┤   │
│  │ │ Your PO has been...  │   │  │  │ +254 711 XXX XXX    │   │
│  │ └──────────────────────┘   │  │  │ "Invoice attached"  │   │
│  │                            │  │  │ 1d ago  ✓          │   │
│  │ Channel: [SMS ▼]           │  │  └─────────────────────┘   │
│  │ [📤 Send SMS]              │  │                             │
│  └────────────────────────────┘  │  [Renew WA Sessions]       │
└──────────────────────────────────┴─────────────────────────────┘
```

**Twilio Config:**
- SMS Number: `+16812972643`
- WhatsApp: `+14155238886` (join code: `join bad-machine`)
- Messaging Service SID: `MGd547d8e3273fda2d21afdd6856acb245`
- Fallback: Africa's Talking (if Twilio fails)

### 9.2 Telephony / Voice Calls

Route: `/telephony` — Make outbound calls to suppliers/contacts via Twilio Voice

### 9.3 Email

Route: `/email` — Compose and send emails via Resend API

### 9.4 Inbox

Route: `/inbox` — Internal message inbox, reply to notifications

---

## 10. REPORTS & PRINT ENGINE

### 10.1 Reports Page

Route: `/reports`

```
┌────────────────────────────────────────────────────────────────────┐
│ [Hospital Logo]  Embu Level 5 Hospital     Start: [2026-01-01]     │
│ Reports — Requisitions                     End:   [2026-04-18]     │
│                                            [Refresh] [▼ Report Type│
├──────────┬──────────┬──────────┬──────────┬──────────────────────  │
│KES 2.4M  │KES 2.0M  │KES 362K  │  1,284   │KES 2.4M              │
│Total Val │Received  │Balance   │Rec Count │Inventory               │
├──────────┴──────────┴──────────┴──────────┴──────────────────────  │
│ Available Stocks │              REQUISITIONS DATA                   │
│ ┌──────────────┐ │  ┌──────────────────────────────────────────┐  │
│ │Paracetamol240│ │  │ REQ NO │ TITLE  │ STATUS │ AMOUNT │ DATE │  │
│ │Latex Gloves 3│ │  │REQ/001 │ Meds.. │Approved│145,000 │Apr..  │  │
│ │Test Tubes  50│ │  │REQ/002 │ Lab... │Pending │280,000 │Apr..  │  │
│ └──────────────┘ │  └──────────────────────────────────────────┘  │
│ [Refresh][Extract]│  Show: (●)ALL ( )Latest 100 ( )This Month     │
│                   │  [🖨 Print Report]  [📊 Export Excel]          │
└───────────────────┴──────────────────────────────────────────────┘
```

**Available Report Types:**
Requisitions, Purchase Orders, GRN, Suppliers, Inventory Items, Payment Vouchers, Receipt Vouchers, Journal Vouchers, Purchase Vouchers, Contracts, Tenders, Bid Evaluations, Procurement Plans, Budgets, QC Inspections, Non-Conformance, Audit Log

### 10.2 Print Engine

Route: `/print-engine`

- Generate letterhead documents with dual logos (EL5 Hospital + Embu County)
- Print procurement documents, GRNs, vouchers
- Custom header/footer with hospital details

### 10.3 Audit Log

Route: `/audit-log`

- Full audit trail of all system actions
- Filter by user, date, action type, module
- Export to Excel

---

## 11. SYSTEM ADMINISTRATION

### 11.1 User Management

Route: `/users`

```
┌──────────────────────────────────────────────────────────────────┐
│  👥 USERS                    [+ New User]  [📊 Export]            │
├──────────────┬─────────────────┬──────────────────┬──────────────┤
│ NAME         │ EMAIL           │ ROLE             │ ACTIONS      │
├──────────────┼─────────────────┼──────────────────┼──────────────┤
│ John Kamau   │ j.kamau@embu... │ procurement_mgr  │[Edit][Roles] │
│ Jane Wanjiru │ j.wanjiru@...   │ accountant       │[Edit][Roles] │
│ Peter Mwangi │ p.mwangi@...    │ requisitioner    │[Edit][Reset] │
└──────────────┴─────────────────┴──────────────────┴──────────────┘
```

**Actions per user:**
- **Edit** — change name, department, phone
- **Roles** — assign/remove roles
- **Reset Password** — admin generates temp password
- **Suspend** — disable account access
- **Delete** — permanently remove (irreversible)

### 11.2 IP Access Control

Route: `/admin/ip-access`

Enable IP whitelisting to restrict system access to authorised networks only.

```
┌─────────────────────────────────────────────────────────────────┐
│  🔒 IP ACCESS CONTROL                                           │
│  IP Restriction: [ENABLED ●]    Allow All Private IPs: [ON ●]  │
├──────────────┬───────────────┬──────────┬───────────────────────┤
│ CIDR         │ LABEL         │ ACTIVE   │ ACTIONS               │
├──────────────┼───────────────┼──────────┼───────────────────────┤
│ 192.168.1.0/24│ Hospital LAN │ ✅ Active│ [Edit] [Disable]      │
│ 10.0.0.0/8   │ VPN Network   │ ✅ Active│ [Edit] [Disable]      │
│ 41.80.x.x/32 │ Admin Remote  │ ✅ Active│ [Edit] [Disable]      │
└──────────────┴───────────────┴──────────┴───────────────────────┘
│  [+ Add CIDR]                         [View Access Log]         │
└─────────────────────────────────────────────────────────────────┘
```

> **Warning:** If you enable IP restriction and your IP is not whitelisted, you will be locked out. Always add your IP first before enabling.

### 11.3 Settings

Route: `/settings`

- Hospital name, logo, contact details
- Currency, timezone, VAT rate
- Feature toggles (enable/disable modules)
- Notification settings, backup schedule

---

## 12. WEBMASTER & SUPERADMIN PANEL

Route: `/webmaster`

The Webmaster Panel gives superadmins a consolidated control centre:

```
┌──────────────────────────────────────────────────────────────────┐
│  🔧 WEBMASTER CONTROL CENTRE                    [← Dashboard]   │
├─────────────────────────┬────────────────────────────────────────┤
│  LIVE SESSIONS          │  SYSTEM BROADCAST                      │
│  ┌───────────────────┐  │  ┌──────────────────────────────────┐ │
│  │ 12 users online   │  │  │ Message: [                     ] │ │
│  │ j.kamau  Admin  🟢│  │  │ [📢 Send to All Users]           │ │
│  │ p.wanjiru Acct  🟢│  │  └──────────────────────────────────┘ │
│  │ [Kill Session]    │  │                                        │
│  └───────────────────┘  │  SQL QUERY RUNNER                     │
│                         │  ┌──────────────────────────────────┐ │
│  ALL USERS              │  │ SELECT * FROM requisitions        │ │
│  [Full User Page →]     │  │ WHERE status = 'pending'         │ │
│                         │  │ LIMIT 10;                        │ │
│  IP ACCESS STATS        │  └──────────────────────────────────┘ │
│  [Full IP Console →]    │  [▶ Run Query]                        │
└─────────────────────────┴────────────────────────────────────────┘
```

**Features:**
- **Live Sessions** — see all online users, kill sessions remotely
- **System Broadcast** — push a message banner to all logged-in users
- **SQL Runner** — run raw SQL queries (read-only recommended)
- **User Overview** — quick link to full Users page
- **IP Stats** — live access log

---

## 13. DATABASE MONITOR & BACKUP

### 13.1 LiveDatabaseEngine Monitor

Route: `/admin/db-test`

Continuously polls all 42+ database tables every 60 seconds:

```
┌──────────────────────────────────────────────────────────────────┐
│  🗄️ LIVE DATABASE ENGINE   Run #47 · Last: 12:34:02             │
│  ✅ 39 Healthy  ⚠️ 2 Slow  ❌ 1 Failed    Avg: 142ms            │
├──────────────────────────────────────────────────────────────────┤
│  GROUP          │ TABLE               │ STATUS │ LATENCY │ ROWS  │
├─────────────────┼─────────────────────┼────────┼─────────┼───────┤
│  Procurement    │ requisitions        │  ✅ OK │   98ms  │  284  │
│  Procurement    │ purchase_orders     │  ✅ OK │  112ms  │  156  │
│  Finance        │ payment_vouchers    │  ✅ OK │  134ms  │   89  │
│  Finance        │ budgets             │  ⚠️ SL │  890ms  │   12  │
│  System         │ audit_log           │  ✅ OK │  201ms  │ 4,821 │
└─────────────────┴─────────────────────┴────────┴─────────┴───────┘
│  Realtime: ✅ Connected   Twilio: ✅ Active                      │
└──────────────────────────────────────────────────────────────────┘
```

### 13.2 Backup

Route: `/backup`

- **Manual Backup** — trigger immediate full database backup
- **Restore** — restore from a previous backup (requires confirmation)
- **Scheduled** — configure automatic daily/weekly backups
- **Retention** — default 90 days

### 13.3 ODBC / Database Admin

Route: `/odbc` — MySQL proxy for external tools (Power BI, Excel, Crystal Reports)

---

## 14. EDGE FUNCTIONS REFERENCE

All 16 edge functions are deployed to Supabase and called by the frontend:

| Function | Endpoint | Description |
|---|---|---|
| `send-sms` | `/functions/v1/send-sms` | SMS + WhatsApp via Twilio, AT fallback |
| `make-call` | `/functions/v1/make-call` | Twilio voice calls |
| `send-email` | `/functions/v1/send-email` | Email via Resend, SMTP fallback |
| `notify-requisition` | `/functions/v1/notify-requisition` | Procurement notifications |
| `track-session` | `/functions/v1/track-session` | Session + audit tracking |
| `health-api` | `/functions/v1/health-api` | System health check |
| `audit-api` | `/functions/v1/audit-api` | Audit log API |
| `bulk-ops` | `/functions/v1/bulk-ops` | Bulk DB operations |
| `search-api` | `/functions/v1/search-api` | Full-text search |
| `export-api` | `/functions/v1/export-api` | Data export |
| `mysql-proxy` | `/functions/v1/mysql-proxy` | ODBC/MySQL proxy |
| `concurrency-api` | `/functions/v1/concurrency-api` | Multi-user concurrency |
| `rate-limiter` | `/functions/v1/rate-limiter` | Rate limiting |
| `data-integrity` | `/functions/v1/data-integrity` | Data validation |
| `notify-api` | `/functions/v1/notify-api` | Push notifications |
| `api-gateway` | `/functions/v1/api-gateway` | Central API gateway |

---

## 15. TROUBLESHOOTING & FAQ

### White / Blank Screen on Login

**Cause:** JavaScript bundle failed to load, or browser cache is stale.

**Fix:**
1. Press `Ctrl + Shift + R` (hard refresh)
2. Open DevTools → Application → Clear storage → Clear site data
3. Try incognito/private window
4. If still blank: check browser console for errors and report to ICT

### Stuck on Loading Spinner

**Cause:** SessionEngine (IndexedDB) initialisation took too long.

**Fix:**
1. Wait up to 10 seconds
2. If spinner persists: hard refresh (`Ctrl + Shift + R`)
3. If session is corrupted: open Console → type `localStorage.clear()` → refresh

### "Access Denied" After Login

**Cause:** Your IP address is not in the whitelist (IP restriction enabled).

**Fix:** Contact your system administrator to whitelist your IP at `/admin/ip-access`.

### Cannot See a Module/Page

**Cause:** Your role doesn't have access to that page.

**Fix:** Contact your administrator to update your role assignments at `/users`.

### SMS Not Sending

**Cause:** Twilio account balance, wrong number format, or edge function down.

**Fix:**
1. Check `/telephony` — verify Twilio status shows ✅ Active
2. Ensure phone number is in E.164 format: `+254XXXXXXXXX`
3. For WhatsApp: recipient must first send `join bad-machine` to `+14155238886`
4. Report to ICT with the error message from the SMS page

### Reports Showing No Data

**Cause:** Date range filter excludes all records, or table is empty.

**Fix:**
1. Widen the date range (Start Date: beginning of year)
2. Click **Refresh** or **Extract**
3. Try "ALL" in the Show Records radio

### Build / Deployment Failed

**Cause:** GitHub Actions workflow error.

**Fix:**
1. Check Actions tab at https://github.com/huiejorjdsksfn/medi-procure-hub/actions
2. Common cause: missing GitHub Secret (add `SUPABASE_ANON_KEY` etc.)
3. Build logs show exact error — share with ICT

---

## APPENDIX — KEYBOARD SHORTCUTS

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + R` | Hard refresh (clears cache) |
| `Enter` on login form | Submit sign in |
| `Esc` | Close modal dialogs |
| `Tab` | Navigate between form fields |

---

*EL5 MediProcure ProcurBosse v21.4 · Embu Level 5 Hospital · Embu County Government · April 2026*  
*Technical support: tecnojin03@gmail.com · System: https://procurbosse.edgeone.app*
