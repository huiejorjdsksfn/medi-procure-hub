@echo off
title ProcurBosse System Check
color 0E
cls
echo.
echo  ProcurBosse System Compatibility Check
echo  EL5 MediProcure - Embu Level 5 Hospital
echo.
echo  [1] Windows Version:
ver
echo.
echo  [2] Architecture:
echo  %PROCESSOR_ARCHITECTURE%
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" echo  STATUS: 64-bit - use Win10-x64 installer
if "%PROCESSOR_ARCHITECTURE%"=="x86" echo  STATUS: 32-bit - use Win7-ia32 installer
echo.
echo  [3] Internet (Supabase DB):
ping -n 1 yvjfehnzbzjliizjvuhq.supabase.co >nul 2>&1
if errorlevel 1 (echo  WARNING: Cannot reach database!) else (echo  OK: Database reachable)
echo.
echo  [4] Installation Status:
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    echo  INSTALLED: %LOCALAPPDATA%\Programs\ProcurBosse\
) else if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    echo  INSTALLED: C:\Program Files\ProcurBosse\
) else (
    echo  NOT INSTALLED - run INSTALL_ProcurBosse.bat
)
echo.
pause
