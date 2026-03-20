@echo off
title ProcurBosse System Check
color 0E
cls
echo.
echo  ============================================================
echo   ProcurBosse System Compatibility Check
echo   EL5 MediProcure - Embu Level 5 Hospital
echo  ============================================================
echo.
echo [1] Windows Version:
ver
echo.
echo [2] Architecture:
echo  PROCESSOR_ARCHITECTURE = %PROCESSOR_ARCHITECTURE%
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" echo  RESULT: 64-bit - Use Win10-x64 installer (Recommended)
if "%PROCESSOR_ARCHITECTURE%"=="x86"   echo  RESULT: 32-bit - Use Win7-ia32 installer
echo.
echo [3] Database Connectivity:
ping -n 1 -w 3000 yvjfehnzbzjliizjvuhq.supabase.co >nul 2>&1
if %ERRORLEVEL%==0 (
    echo  OK: Supabase database is reachable
) else (
    echo  WARNING: Cannot reach Supabase database
    echo  Check internet connection - ProcurBosse requires network access
)
echo.
echo [4] Memory:
wmic ComputerSystem get TotalPhysicalMemory /value 2>nul | find "="
echo  Recommended: 4GB+ for v2, 2GB for v1
echo.
echo [5] Installation Status:
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    echo  INSTALLED: %LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe
) else if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    echo  INSTALLED: C:\Program Files\ProcurBosse\ProcurBosse.exe
) else (
    echo  NOT INSTALLED - Run INSTALL_ProcurBosse.bat to install
)
echo.
echo  ============================================================
echo   Check complete. Press any key to exit.
echo  ============================================================
pause > nul
