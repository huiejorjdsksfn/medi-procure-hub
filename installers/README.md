# ProcurBosse Windows Installers
## EL5 MediProcure — Embu Level 5 Hospital

### Quick Install
1. Download ZIP from: https://github.com/huiejorjdsksfn/medi-procure-hub/releases
2. Extract to a folder
3. Right-click `INSTALL_ProcurBosse.bat` → **Run as Administrator**
4. Follow wizard, then launch from Desktop shortcut

### BAT Files

| File | Purpose |
|------|---------|
| `INSTALL_ProcurBosse.bat` | Auto-detect arch + run correct EXE |
| `RUN_EXE.bat` | Find and run any EXE in the same folder |
| `LAUNCH_ProcurBosse.bat` | Launch already-installed app |
| `CHECK_System.bat` | Check Windows version, arch, internet |
| `UNINSTALL_ProcurBosse.bat` | Clean uninstall with confirmation |
| `SILENT_INSTALL_IT.bat` | IT mass deployment, logs to C:\ProcurBosse_Install.log |
| `CHECK_Updates.bat` | Open GitHub releases page |

### EXE Files

| File | Windows | Architecture |
|------|---------|------|
| `ProcurBosse-v2.*-Win10-x64.exe` | **10/11** | 64-bit — Recommended |
| `ProcurBosse-v1.*-Win7-ia32.exe` | **7/8/10** | 32-bit — Legacy |

### Requirements
- Internet connection (live Supabase database)
- Windows 7 SP1 or later
- 2–4 GB RAM
- 500 MB disk space
