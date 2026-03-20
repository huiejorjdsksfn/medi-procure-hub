# ProcurBosse — Windows Installer Package
## EL5 MediProcure · Embu Level 5 Hospital

### BAT Files in This Folder

| File | Purpose |
|------|---------|
| `INSTALL_ProcurBosse.bat` | **Main installer** — auto-detects Windows version and runs correct EXE |
| `LAUNCH_ProcurBosse.bat` | Launch ProcurBosse after installation |
| `UNINSTALL_ProcurBosse.bat` | Remove ProcurBosse from this PC |
| `CHECK_System.bat` | Check system compatibility before installing |
| `SILENT_INSTALL_IT_Deploy.bat` | IT mass deployment — silent install with logging |
| `CHECK_Updates.bat` | Open GitHub releases page to check for updates |

### How to Install

1. **Download** the ZIP from: https://github.com/huiejorjdsksfn/medi-procure-hub/releases
2. **Extract** the ZIP to a folder
3. **Right-click** `INSTALL_ProcurBosse.bat` → **Run as Administrator**
4. Follow the setup wizard
5. Launch from **Desktop shortcut** or run `LAUNCH_ProcurBosse.bat`

### Which EXE is Right for Me?

| Your Windows | Architecture | Correct EXE |
|---|---|---|
| Windows 10 or 11 | 64-bit (most modern PCs) | `ProcurBosse-v2.*-Win10-x64-Setup.exe` |
| Windows 7, 8, or 8.1 | 32 or 64-bit | `ProcurBosse-v1.*-Win7-ia32-Setup.exe` |
| Windows 10 (old 32-bit PC) | 32-bit | `ProcurBosse-v1.*-Win7-ia32-Setup.exe` |

**Not sure?** Run `CHECK_System.bat` — it will detect and tell you.

### System Requirements

- Internet connection (required — connects to Supabase live database)
- Windows 7 SP1 or later
- 2–4 GB RAM
- 350–500 MB free disk space
- 1366×768 display or larger

### IT Department Mass Deployment

Use `SILENT_INSTALL_IT_Deploy.bat` for mass deployment across hospital workstations:
- Run as Administrator on each PC
- Installs silently to `C:\Program Files\ProcurBosse`
- Logs to `C:\ProcurBosse_Install.log`

### Support

- Repository: https://github.com/huiejorjdsksfn/medi-procure-hub
- IT Department: Embu Level 5 Hospital
- System: EL5 MediProcure v2.0 — All 40+ ERP Modules
