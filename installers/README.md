# ProcurBosse Windows Installers
## EL5 MediProcure — Embu Level 5 Hospital

### Quick Start
1. **Download** ZIP from: https://github.com/huiejorjdsksfn/medi-procure-hub/releases
2. **Extract** to a folder
3. **Run** `INSTALL_ProcurBosse.bat` (right-click → Run as Administrator)
4. **Launch** from Desktop shortcut or `LAUNCH_ProcurBosse.bat`

### BAT Files

| File | Purpose |
|------|---------|
| `INSTALL_ProcurBosse.bat` | Auto-detect arch + install correct EXE |
| `RUN_EXE.bat` | Find and run EXE directly from folder |
| `LAUNCH_ProcurBosse.bat` | Launch already-installed app |
| `CHECK_System.bat` | Check Windows, arch, internet, printers |
| `SILENT_INSTALL_IT.bat` | IT mass deployment + logging |
| `UNINSTALL_ProcurBosse.bat` | Clean removal |
| `CHECK_Updates.bat` | Open GitHub releases |

### EXE Files

| File | OS | Architecture |
|------|-----|------|
| `ProcurBosse-v2.*-Win10-x64-Setup.exe` | Windows 10/11 | 64-bit ✅ Recommended |
| `ProcurBosse-v1.*-Win7-ia32-Setup.exe` | Windows 7/8/10 | 32-bit Legacy |

### Supported Printers
- **Kyocera ECOSYS** (laser, A4) — select "Kyocera ECOSYS" in Settings → Print
- **HP DeskJet** (inkjet, A4) — select "HP DeskJet" in Settings → Print
- **HP LaserJet** (laser, A4) — select "HP LaserJet" in Settings → Print
- **HP Color LaserJet** — select "HP Color LaserJet" in Settings → Print
- **Thermal 80mm** (Epson TM-T88, Star TSP100) — select "Thermal 80mm" in Settings
- **Thermal 58mm** (mobile) — select "Thermal 58mm" in Settings
- **Generic** — auto-detect (default)

### Database Connection
- Supabase: `yvjfehnzbzjliizjvuhq.supabase.co`
- Internet required for all operations (cloud database)

### System Requirements
- Windows 7 SP1 or later (x64 or ia32)
- 2–4 GB RAM minimum
- 500 MB disk space
- Active internet connection
