# EL5 MediProcure v5.8 — User & System Administrator Manual

> **ProcurBosse ERP · Embu Level 5 Hospital · Embu County Government**  
> Health Procurement Division · Version 5.8  
> Document Date: April 2026

---

## TABLE OF CONTENTS

1. [Introduction](#1-introduction)
2. [Getting Started — Login & Password Reset](#2-getting-started)
3. [Dashboard & Navigation](#3-dashboard--navigation)
4. [Roles & Permissions](#4-roles--permissions)
5. [Procurement Module](#5-procurement-module)
6. [Payment Vouchers](#6-payment-vouchers)
7. [Accountant Workspace](#7-accountant-workspace)
8. [Notifications](#8-notifications)
9. [System Administration](#9-system-administration)
10. [Supabase & Database Guide](#10-supabase--database-guide)
11. [API Reference](#11-api-reference)
12. [Troubleshooting & FAQ](#12-troubleshooting--faq)

---

## 1. INTRODUCTION

EL5 MediProcure (ProcurBosse) is a comprehensive Health Procurement ERP system built for Embu Level 5 Hospital under Embu County Government. It covers:

- **Procurement**: Requisitions, Purchase Orders, Goods Received Notes, Suppliers, Tenders, Contracts
- **Finance & Accounting**: Payment Vouchers, Invoice Matching (3-way), Budget Control, GL Ledger
- **ERP Integration**: Bidirectional sync with Microsoft Dynamics 365 via Azure Logic Apps
- **Inventory**: Items, Categories, Departments, Barcode Scanner
- **Quality**: Inspections, Non-Conformance, QC Dashboard
- **Administration**: Users, Roles, Settings, Audit Logs, Backup

**Tech Stack**: React + TypeScript + Vite · Supabase (PostgreSQL) · Tencent EdgeOne (CDN)  
**Version**: v5.8 | **Admin Email**: samwise@gmail.com

---

## 2. GETTING STARTED

### 2.1 Logging In

1. Navigate to the deployed URL (e.g. `https://your-domain.com` or `https://el5.edgeone.app`)
2. Enter your **email address** and **password**
3. Click **Sign In**

The system uses Supabase Auth — credentials are managed securely. Contact ICT for new accounts.

### 2.2 Forgot Password

Two methods to reset your password:

**Method A — From Login Screen:**
1. Click **"Forgot password?"** on the login form
2. Enter your registered email address
3. Click **Send Reset** — a reset link is emailed to you
4. Open the email and click the reset link (valid 1 hour)
5. Set your new password (min 8 chars, uppercase, number, special char)

**Method B — Reset Password Page:**
1. Navigate directly to `/reset-password`
2. Enter your email → click **Send Reset Link**
3. Follow the link in your email
4. Set a strong new password using the strength meter guide

> **Password Requirements**: 8+ characters · Uppercase letter · Number · Special character (!@#$)

### 2.3 First Login

After receiving credentials from ICT:
- You will be prompted to set your own password on first login via the reset link
- Your role (Accountant, Procurement Officer, etc.) is set by the Administrator
- Contact `samwise@gmail.com` for role changes or access issues

---

## 3. DASHBOARD & NAVIGATION

### 3.1 Top Navigation Bar (D365 Style)

The top bar follows a Microsoft Dynamics 365-inspired design:

| Element | Description |
|---------|-------------|
| **Logo + System Name** | EL5 MediProcure v5.8 — always visible |
| **Module Tiles** | Color-coded tiles for each module (Procurement, Finance, etc.) |
| **Search** | Global search across all pages and modules |
| **Notification Bell** | Real-time notification count with priority badges |
| **User Menu** | Profile, role indicator, sign out |
| **Facility Switcher** | Switch between hospital facilities (Admin only) |

### 3.2 Module Color Codes

| Module | Color | Role Access |
|--------|-------|-------------|
| Procurement | Blue (#0078d4) | Admin, Proc. Manager, Proc. Officer, Requisitioner |
| Vouchers | Burnt Orange | Admin, Proc. Manager, Proc. Officer, Accountant |
| Financials | Green (#107c10) | Admin, Proc. Manager, Accountant |
| Inventory | Purple | Admin, Inventory Mgr, Warehouse Officer |
| Quality | Olive | Admin, Proc. Officer, Inventory Mgr |
| Accountant | Teal (#059669) | Admin, Accountant, Proc. Manager |
| Reports & BI | Violet | Admin, Proc. Manager, Accountant, Inventory Mgr |
| Administration | Orange | Admin only |

### 3.3 Facility Switcher

- **Visible only to Admin** role
- Click the building icon in the top bar to switch between registered facilities
- All data is scoped to the selected facility

---

## 4. ROLES & PERMISSIONS

### 4.1 Available Roles

| Role | Label | Key Capabilities |
|------|-------|-----------------|
| `admin` | Administrator | Full system access, user management, all settings |
| `database_admin` | DB Administrator | Database panel, schema management |
| `procurement_manager` | Proc. Manager | All procurement + finance approval |
| `procurement_officer` | Proc. Officer | Create POs, GRNs, suppliers, tenders |
| `accountant` | Accountant | Invoice matching, payment approval, ERP sync, budget |
| `inventory_manager` | Inventory Mgr | Items, categories, departments, stock |
| `warehouse_officer` | Warehouse | GRN receiving, scanner, stock movements |
| `requisitioner` | Requisitioner | Create requisitions only |

### 4.2 Accountant Role — Detailed Permissions

The Accountant role has a dedicated **Accountant Workspace** (`/accountant-workspace`) with:

- ✅ Three-way invoice matching (PO + GRN + Invoice)
- ✅ Payment management & approval
- ✅ Budget monitoring & override approval
- ✅ ERP Sync to Dynamics 365 (manual & automated)
- ✅ GL / Journal ledger view
- ✅ Quotation creation & management
- ✅ Financial reports & CSV export
- ✅ View purchase orders & goods received
- ✅ Payment vouchers (create/approve/print)
- ✅ Financial dashboard & chart of accounts
- ✅ Audit log (read)
- ❌ User management (admin only)
- ❌ System settings (admin only)
- ❌ Facility management (admin only)

### 4.3 Managing User Roles (Admin)

1. Go to **Administration → Users** (`/users`)
2. Click on any user to open their profile
3. Change the **Role** dropdown to the desired role
4. Click **Save** — changes take effect on next login

---

## 5. PROCUREMENT MODULE

### 5.1 Requisitions

**Path**: `/requisitions`  
**Access**: All roles (role-gated approvals)

- Create purchase requisitions with line items, departments, urgency levels
- Track status: Draft → Submitted → Approved → PO Created
- Forward by email to managers
- Print professional government-grade requisition documents

### 5.2 Purchase Orders

**Path**: `/purchase-orders`  
**Access**: Admin, Proc. Manager, Proc. Officer, Accountant

- Generate POs from approved requisitions
- Attach supplier details, GL accounts, vote heads
- ERP sync to Dynamics 365 on approval
- Print PO documents with KES currency formatting

### 5.3 Goods Received Notes (GRN)

**Path**: `/goods-received`  
**Access**: Admin, Proc. Manager, Proc. Officer, Warehouse, Inventory Mgr, Accountant

- Record physical receipt of goods against PO
- Quantity vs ordered variance tracking
- Feeds into three-way invoice matching
- Barcode scanner integration (`/scanner`)

### 5.4 Suppliers

**Path**: `/suppliers`  
**Access**: Admin, Proc. Manager, Proc. Officer

- Supplier master data management
- Status: Active / Inactive / Blacklisted
- Synced to Dynamics 365 vendor master via ERP Sync

---

## 6. PAYMENT VOUCHERS

**Path**: `/vouchers/payment`  
**Access**: Admin, Proc. Manager, Proc. Officer, Accountant

### 6.1 Creating a Payment Voucher

1. Click **+ New Voucher**
2. Fill in all required fields:
   - **Payee** (required) — supplier or individual name
   - **Amount (KES)** (required) — total payment amount
   - **Payment Method**: bank_transfer, cheque, cash, mpesa, rtgs, swift
   - **Bank Name** & **Account Number** — payee banking details
   - **PO Reference** — link to the originating Purchase Order
   - **Invoice Reference** — supplier invoice number
   - **GL Account** — General Ledger account code (e.g. 2210100)
   - **Vote Head** — government budget vote head (e.g. 2210100)
   - **Due Date** — payment due date
   - **Description** — payment narration
3. Click **Create Voucher** — voucher is saved as **Draft**

### 6.2 Voucher Workflow

```
Draft → Submit → Pending → Approve → Approved → Mark Paid → Paid
                                  └→ Reject → Rejected
```

### 6.3 Printing Vouchers

- Click **🖨 Print** on any voucher row or in the detail view
- A professional payment voucher is generated with:
  - Embu County Government header
  - Full payment details
  - Three signature blocks (Prepared By / Approved By / Finance Officer)
  - EL5 MediProcure branding footer

### 6.4 Bulk Operations

- Select multiple vouchers using checkboxes
- Click **✓ Approve X Selected** to bulk approve

### 6.5 Export

- Click **📥 Export CSV** to download all filtered vouchers as a spreadsheet
- CSV includes: Voucher#, Payee, Amount, Method, Status, Vote Head, GL Account, Due Date

---

## 7. ACCOUNTANT WORKSPACE

**Path**: `/accountant-workspace`  
**Access**: Admin, Accountant, Proc. Manager

### 7.1 Dashboard Tab

The workspace home shows:
- **KPI Cards**: Pending matches, ERP sync queue, budget alerts, approved payments total
- **ERP Connection Status**: Live status of all Dynamics 365 connections
- **Approval Tasks**: Inline approve/reject for pending invoice matches and budget overrides
- **Quick Actions**: One-click shortcuts to all accountant functions
- **Recent ERP Syncs**: Last 6 sync events with status

### 7.2 Invoice Matching (Three-Way)

The heart of procurement-finance reconciliation:
1. System auto-creates match records when PO + GRN + Invoice are all present
2. Accountant reviews the match in the **Invoice Match** tab
3. Verify PO number, GRN number, invoice number, supplier, amount
4. If amounts match → Click **✓ Approve** → status becomes `matched`
5. If discrepancy → Click **✗ Reject** → investigate with procurement

### 7.3 ERP Synchronisation

**Direction**: Bidirectional with Dynamics 365

| Push to D365 | Pull from D365 |
|-------------|----------------|
| Purchase Orders | Vendor Master |
| GRN Receipts | GL Account Codes |
| Supplier Invoices | Payment Statuses |
| Journal Entries | Budget Balances |

**Manual Sync**: Click **🚀 Manual Sync** or use individual push/pull buttons.  
**Sync Queue**: All sync events are logged in `erp_sync_queue` table for auditability.

### 7.4 Budget Control

- Monitor budget consumption percentage per vote head
- View color-coded progress bars (green → orange → red as % increases)
- Over-budget requests appear as alerts requiring accountant override approval
- Click **Approve Override** to authorize over-budget expenditure

### 7.5 Journal & GL Ledger

- View all General Ledger entries in debit/credit format
- Filter by GL account, date range, reference
- Entries auto-created on voucher approval and ERP sync
- Export as CSV for external reconciliation

### 7.6 Quotations

- Create quotation requests (QT-YYYY-XXXXX numbering)
- Link to suppliers in the supplier master
- Set validity dates and terms
- Send quotations to suppliers (status: Draft → Sent → Accepted/Rejected)

### 7.7 Reports

Generate and export:
- Invoice Summary (all matching status)
- Payment Register (all vouchers with amounts)
- Budget Alerts Report
- GL Entries Report
- ERP Sync Log

---

## 8. NOTIFICATIONS

### 8.1 Notification Bell

The bell icon in the top bar shows:
- **Unread count badge** (blue for normal, red for critical)
- **Bell shake animation** when new notifications arrive
- Click to open the notification panel (400px wide)

### 8.2 Filtering Notifications

In the panel:
- **All / Unread / Critical** filter tabs
- **Category pills**: system, procurement, finance, erp, budget, invoice, approval, alert, sync
- Click any notification to mark it as read
- Click × to dismiss a notification

### 8.3 Full Notifications Page

**Path**: `/notifications`  
Full-page view with:
- Priority filter (Low/Normal/High/Critical)
- Category filter
- Read/Unread filter
- Full-text search
- Bulk select and mark read
- Sort by newest/oldest/priority
- Pagination (20 per page)

### 8.4 Notification Categories

| Category | Icon | Description |
|----------|------|-------------|
| system | ⚙️ | System events, maintenance |
| procurement | 📦 | PO approvals, requisition updates |
| finance | 💰 | Payment approvals, financial alerts |
| erp | 🔄 | ERP sync events |
| budget | 📊 | Budget threshold warnings |
| invoice | 📋 | Invoice matching events |
| approval | ✅ | Items awaiting approval |
| alert | ⚠️ | Critical system alerts |
| sync | 🔁 | Data synchronization events |

---

## 9. SYSTEM ADMINISTRATION

### 9.1 Admin Panel

**Path**: `/admin/panel`  
**Access**: Admin only

Central control panel with:
- System health metrics
- Active user sessions
- Module enable/disable toggles
- System broadcast messages
- Database maintenance tools

### 9.2 User Management

**Path**: `/users`  
**Access**: Admin only

- Create new user accounts (triggers password setup email)
- Change user roles
- Activate/deactivate users
- Reset user passwords
- View last login dates

**Primary Admin**: `samwise@gmail.com` — Full admin access, cannot be demoted via UI.

### 9.3 Settings

**Path**: `/settings`  
**Access**: Admin only

Key settings:
- **System Name & Hospital Name**: Displayed in UI and email headers
- **SMTP Configuration**: Email delivery settings (Resend API recommended)
- **Logo URL**: Custom hospital logo
- **Module Enable/Disable**: Toggle modules on/off by role
- **IP Access Control**: Restrict access to specific IP ranges

### 9.4 SMTP Email Configuration

1. Go to **Settings** → **Email / SMTP**
2. Configure:
   ```
   SMTP Host:   smtp.resend.com
   SMTP Port:   465
   SMTP User:   resend
   SMTP Pass:   [Your Resend API Key]
   From Name:   EL5 MediProcure
   From Email:  noreply@embu.go.ke
   ```
3. Click **Test Email** to verify delivery
4. Enable **Email Notifications**

### 9.5 Facility Management

**Path**: `/facilities`  
**Access**: Admin, Proc. Manager only — **Hidden from all other roles**

- Register hospital facilities (e.g. Main Hospital, MCH, Pharmacy)
- Each facility has its own data scope
- Admin can switch facilities using the top-bar facility switcher

### 9.6 Audit Log

**Path**: `/audit-log`  
**Access**: Admin, Proc. Manager, Accountant

- Full audit trail of all system actions
- Filter by user, action type, module, date range
- Export as CSV for compliance reporting
- Data retained for 7 years per government compliance

### 9.7 Backup & Recovery

**Path**: `/backup`  
**Access**: Admin only

- Manual database backup trigger
- Download backup files
- Restore from backup
- Backup schedule configuration

---

## 10. SUPABASE & DATABASE GUIDE

### 10.1 Connection Details

```
Project ID:  yvjfehnzbzjliizjvuhq
URL:         https://yvjfehnzbzjliizjvuhq.supabase.co
Anon Key:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DB Host:     db.yvjfehnzbzjliizjvuhq.supabase.co
DB Port:     5432
DB Name:     postgres
DB User:     postgres
```

### 10.2 Direct Database Access (PSQL)

```bash
psql -h db.yvjfehnzbzjliizjvuhq.supabase.co -p 5432 -d postgres -U postgres
```

### 10.3 Key Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with roles |
| `payment_vouchers` | Payment vouchers with full GL data |
| `erp_sync_queue` | Dynamics 365 sync events |
| `invoice_matching` | Three-way invoice match records |
| `budget_alerts` | Budget threshold alerts |
| `quotations` | Supplier quotation requests |
| `gl_entries` | General ledger journal entries |
| `notifications` | System notifications |
| `system_settings` | Key-value system configuration |
| `purchase_orders` | Purchase order records |
| `requisitions` | Purchase requisitions |
| `suppliers` | Supplier master data |
| `goods_received` | GRN records |

### 10.4 Row Level Security (RLS)

All tables have RLS enabled. Authenticated users have read/write access — role-based filtering is enforced at the application layer via `RoleGuard` components.

### 10.5 Real-time Subscriptions

The system uses Supabase Realtime for live updates on:
- Notifications (bell badge)
- Accountant workspace (KPIs)
- ERP sync queue
- Invoice matching status

### 10.6 Running Migrations

```bash
# From project root
npx supabase db push
# Or apply specific migration
psql [connection] < supabase/migrations/20250405000001_v58_tables.sql
```

### 10.7 Admin Account Setup

Ensure the admin account has full access:
```sql
UPDATE public.profiles 
SET role = 'admin', is_active = TRUE
WHERE email = 'samwise@gmail.com';
```

---

## 11. API REFERENCE

### 11.1 Supabase Client

```typescript
import { supabase } from "@/integrations/supabase/client";

// Fetch payment vouchers
const { data } = await supabase
  .from("payment_vouchers")
  .select("*")
  .order("created_at", { ascending: false });

// Create notification
await supabase.from("notifications").insert({
  title: "New PO Approved",
  message: "PO-2024-00123 has been approved",
  category: "procurement",
  priority: "normal",
  action_url: "/purchase-orders",
  action_label: "View PO"
});

// Trigger ERP sync
await supabase.from("erp_sync_queue").insert({
  sync_type: "purchase_orders_push",
  direction: "push",
  status: "pending",
  is_manual: true,
  payload: { po_ids: ["..."] }
});
```

### 11.2 Edge Functions

| Function | URL | Description |
|----------|-----|-------------|
| `send-email` | `/functions/v1/send-email` | Send branded emails via Resend/SMTP |
| `send-sms` | `/functions/v1/send-sms` | Twilio SMS via Reception module |
| `notify-requisition` | `/functions/v1/notify-requisition` | Auto-notify on requisition events |

**Invoke Edge Function**:
```typescript
const { data } = await supabase.functions.invoke("send-email", {
  body: {
    to: "recipient@embu.go.ke",
    subject: "Payment Voucher Approved",
    body: "Your payment voucher PV-2024-001234 has been approved.",
    action_url: "/vouchers/payment",
    action_label: "View Voucher"
  }
});
```

### 11.3 Environment Variables

```env
VITE_SUPABASE_URL=https://yvjfehnzbzjliizjvuhq.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Supabase Edge Function secrets (set via Supabase Dashboard → Settings → Edge Functions):
```
RESEND_API_KEY=re_xxxxxxxxxxxxx
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+1234567890
```

---

## 12. TROUBLESHOOTING & FAQ

### 12.1 Login Issues

**Q: I can't log in — "Invalid credentials"**  
A: Use the **Forgot Password** link to reset. Contact ICT if the email address is not recognized.

**Q: Page shows white screen after login**  
A: Clear browser cache (Ctrl+Shift+Delete). If persistent, report to ICT with browser console errors (F12).

**Q: I don't see certain modules**  
A: Modules are role-gated. Contact Admin to verify your role at `/users`.

### 12.2 Payment Vouchers

**Q: Voucher won't save — "Error"**  
A: Ensure Payee and Amount fields are filled. Check network connection.

**Q: Can't approve a voucher**  
A: Only Admin, Proc. Manager, and Accountant can approve. Check your assigned role.

**Q: Print window doesn't open**  
A: Allow pop-ups for this site in browser settings.

### 12.3 ERP Sync

**Q: Sync is stuck in "pending"**  
A: Check Azure Logic Apps connection. Use **Manual Sync** to retry. Review `erp_sync_queue` table for error messages.

**Q: "ERP Disconnected" status**  
A: Contact the IT administrator to verify Dynamics 365 credentials and Logic Apps endpoints.

### 12.4 Notifications

**Q: Not receiving email notifications**  
A: Check Settings → SMTP configuration. Verify Resend API key is active. Check spam folder.

**Q: Notification bell shows wrong count**  
A: Click the bell to force refresh. Real-time subscription reconnects automatically.

### 12.5 Database / Supabase

**Q: "relation does not exist" error**  
A: Run the v5.8 migration: `supabase/migrations/20250405000001_v58_tables.sql`

**Q: RLS policy blocking access**  
A: Verify the user is authenticated. Check `profiles` table for correct role assignment.

### 12.6 Performance

The system uses several caching strategies:
- **React Query** with 30-second stale time for API data
- **Supabase Realtime** for live updates (avoids polling)
- **CDN via Tencent EdgeOne** for static assets
- **Database indexes** on status, created_at, and foreign key columns

---

## APPENDIX A — KEYBOARD SHORTCUTS

| Key | Action |
|-----|--------|
| `Ctrl+K` | Open global search |
| `Esc` | Close modal/panel |

## APPENDIX B — GLOSSARY

| Term | Definition |
|------|------------|
| GRN | Goods Received Note |
| PO | Purchase Order |
| GL | General Ledger |
| ERP | Enterprise Resource Planning |
| D365 | Microsoft Dynamics 365 |
| RLS | Row Level Security |
| SMTP | Simple Mail Transfer Protocol |
| Vote Head | Government budget allocation code |
| Three-Way Match | Matching PO + GRN + Invoice for payment verification |

---

*EL5 MediProcure v5.8 · ProcurBosse · Embu Level 5 Hospital · Embu County Government*  
*Health Procurement Division · ICT Contact: samwise@gmail.com*
