@echo off
title ProcurBosse System Check
color 0E
cls
echo.
echo  ============================================================
echo   ProcurBosse System Compatibility Check
echo   EL5 MediProcure — Embu Level 5 Hospital
echo  ============================================================
echo.

echo [1] Windows Version:
ver
echo.

echo [2] Architecture:
echo  PROCESSOR_ARCHITECTURE = %PROCESSOR_ARCHITECTURE%
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" echo  RESULT: 64-bit -> Use Win10-x64 installer (RECOMMENDED)
if "%PROCESSOR_ARCHITECTURE%"=="x86"   echo  RESULT: 32-bit -> Use Win7-ia32 installer
echo.

echo [3] Internet / Supabase DB:
ping -n 1 -w 4000 yvjfehnzbzjliizjvuhq.supabase.co >nul 2>&1
if %ERRORLEVEL%==0 (
    echo  OK: Supabase database is reachable
    echo  URL: https://yvjfehnzbzjliizjvuhq.supabase.co
) else (
    echo  WARNING: Cannot reach Supabase database
    echo  Check network connection — ProcurBosse is cloud-based
)
echo.

echo [4] Memory ^(RAM^):
wmic ComputerSystem get TotalPhysicalMemory /value 2>nul | find "="
echo  Recommended: 4GB+ for optimal performance
echo.

echo [5] ProcurBosse Install Status:
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    echo  INSTALLED: %LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe
) else if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    echo  INSTALLED: C:\Program Files\ProcurBosse\ProcurBosse.exe
) else (
    echo  NOT INSTALLED — Run INSTALL_ProcurBosse.bat
)
echo.

echo [6] Printer Check:
wmic printer get name,default,status 2>nul | head -8
echo.

echo  ============================================================
echo   System check complete. Press any key to exit.
echo  ============================================================
pause >nul
