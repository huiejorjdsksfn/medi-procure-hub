@echo off
title ProcurBosse Installer - EL5 MediProcure
color 0A
cls
echo.
echo  ============================================================
echo   ProcurBosse - EL5 MediProcure Installer
echo   Embu Level 5 Hospital, Embu County Government
echo  ============================================================
echo.
echo  Detecting system architecture...
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (set ARCH=x64) else (set ARCH=ia32)
echo  Windows:  %OS%
echo  Arch:     %PROCESSOR_ARCHITECTURE% [%ARCH%]
echo.
set FOUND=
if "%ARCH%"=="x64" (
    for /r "%~dp0" %%F in (*Win10-x64*.exe *-x64*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)
if not defined FOUND (
    for /r "%~dp0" %%F in (*ia32*.exe *Win7*.exe *Setup*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)
if not defined FOUND (
    echo  ERROR: No installer EXE found in this folder!
    echo.
    echo  Download from:
    echo  https://github.com/huiejorjdsksfn/medi-procure-hub/releases
    echo.
    pause
    exit /b 1
)
echo  Installer found: %FOUND%
echo  Starting installation...
echo  Click YES if Windows UAC prompt appears.
echo.
"%FOUND%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  WARNING: Installer returned error %ERRORLEVEL%
    echo  Try right-clicking this BAT and selecting Run as Administrator
) else (
    echo.
    echo  ============================================================
    echo   Installation complete!
    echo   - Desktop shortcut: ProcurBosse
    echo   - Start Menu: EL5 MediProcure
    echo   - Or run LAUNCH_ProcurBosse.bat
    echo  ============================================================
)
echo.
pause
