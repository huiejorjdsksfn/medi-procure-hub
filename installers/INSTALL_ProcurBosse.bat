@echo off
title ProcurBosse Installer — EL5 MediProcure
color 0A
cls
echo.
echo  ============================================================
echo   ProcurBosse EL5 MediProcure — Windows Installer
echo   Embu Level 5 Hospital  ^|  Embu County Government
echo  ============================================================
echo.

:: Detect architecture
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=x64
    set ARCH_LABEL=64-bit Windows 10/11
) else if "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
    set ARCH=x64
    set ARCH_LABEL=64-bit Windows 10/11
) else (
    set ARCH=ia32
    set ARCH_LABEL=32-bit Windows 7/8/10
)

echo  System:       %ARCH_LABEL% ^(%PROCESSOR_ARCHITECTURE%^)
echo  Install mode: Per-user ^(no admin required for AppData^)
echo.

:: Check internet connectivity
echo  Checking database connectivity...
ping -n 1 -w 3000 yvjfehnzbzjliizjvuhq.supabase.co >nul 2>&1
if %ERRORLEVEL%==0 (
    echo  Database: REACHABLE [OK]
) else (
    echo  WARNING: Cannot reach Supabase database
    echo  ProcurBosse requires internet. Check your connection.
    echo.
)
echo.

:: Find correct EXE
set FOUND=
if "%ARCH%"=="x64" (
    for /r "%~dp0" %%F in (*Win10-x64*.exe *-x64*.exe *x64*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)
if not defined FOUND (
    for /r "%~dp0" %%F in (*ia32*.exe *Win7*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)
if not defined FOUND (
    for /r "%~dp0" %%F in (*ProcurBosse*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)
if not defined FOUND (
    for %%F in (*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)

if not defined FOUND (
    echo  ERROR: No installer EXE found in this folder!
    echo.
    echo  Download from:
    echo  https://github.com/huiejorjdsksfn/medi-procure-hub/releases
    echo.
    echo  Files expected:
    echo    ProcurBosse-v2.*-Win10-x64-Setup.exe  (Windows 10/11)
    echo    ProcurBosse-v1.*-Win7-ia32-Setup.exe  (Windows 7/8)
    echo.
    pause
    exit /b 1
)

echo  Installer: %FOUND%
echo.
echo  Starting installation...
echo  Click YES on any security prompts.
echo.
"%FOUND%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  Warning: Installer exit code %ERRORLEVEL%
    echo  If app didn't install, right-click this file and choose
    echo  'Run as Administrator'
) else (
    echo.
    echo  ============================================================
    echo   ProcurBosse installed successfully!
    echo.
    echo   Launch methods:
    echo     1. Desktop shortcut: ProcurBosse
    echo     2. Start Menu: EL5 MediProcure ^> ProcurBosse
    echo     3. Run: LAUNCH_ProcurBosse.bat
    echo  ============================================================
)
echo.
pause
