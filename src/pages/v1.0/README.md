# MediProcure Hub — Version 1.0 Archive

This folder contains snapshot backups of major module files before the v2.0 upgrade.

## Archived Files

| File | Description |
|------|-------------|
| DashboardPage.v1.tsx | Original full-page ERP wheel dashboard |
| ERPWheelButton.v1.tsx | Original ERPWheelButton component |
| AdminPanelPage.v1.tsx | Admin panel before real-time settings |
| SettingsPage.v1.tsx | Settings page before broadcast integration |
| EmailPage.v1.tsx | Email page before SMTP activation |
| AppLayout.v1.tsx | AppLayout before live module toggles |

## What Changed in v2.0

- Real-time system settings (useSystemSettings hook)
- Centralized black-font print utility (printDocument.ts)
- Live module toggles in sidebar via admin settings
- Role-based dashboard — segments/links filtered per user role
- Quick links filtered by role — no admin links shown to non-admins
- Activated SMTP email delivery with system_settings config
- All input fields use black font (#000) for legibility
- ERPWheelButton upgraded with role-aware outer segments
- Wheel dashboard: removed bottom nav buttons for role-restricted pages
- All modules upgraded to v2.0 with getSetting() real-time data
