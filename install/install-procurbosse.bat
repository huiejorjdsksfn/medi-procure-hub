@echo off
title ProcurBosse v5.9 Installer
color 1F
echo.
echo  PROCURBOSSE v5.9 - EL5 MediProcure
echo  Embu Level 5 Hospital, Kenya
echo  =====================================
echo.
net session >nul 2>&1
if %errorlevel% neq 0 (echo [!] Run as Administrator & pause & exit /b 1)
echo [1] Checking Node.js...
where node >nul 2>&1 || (echo Node.js not found - visit nodejs.org & start https://nodejs.org & pause & exit /b 1)
echo [OK] Node.js ready
echo [2] Creating directory C:\ProcurBosse...
if not exist "C:\ProcurBosse" mkdir "C:\ProcurBosse"
echo [3] Creating desktop shortcut...
echo [InternetShortcut] > "%USERPROFILE%\Desktop\ProcurBosse EL5.url"
echo URL=https://procurbosse.edgeone.app >> "%USERPROFILE%\Desktop\ProcurBosse EL5.url"
echo [4] Opening ProcurBosse...
start https://procurbosse.edgeone.app
echo.
echo Installation complete! ProcurBosse is ready.
echo URL: https://procurbosse.edgeone.app
echo.
pause
