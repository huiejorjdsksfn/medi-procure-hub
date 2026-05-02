@echo off
title ProcurBosse v5.8.3 Setup
color 0B
echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║   EL5 MediProcure — ProcurBosse v5.8.3       ║
echo  ║   Embu Level 5 Hospital                        ║
echo  ║   Embu County Government · Kenya               ║
echo  ╚═══════════════════════════════════════════════╝
echo.
echo  ADMIN LOGIN:
echo    Email:    samwise@gmail.com
echo    Password: samwise@gmail.com
echo.
echo  Live URL: https://procurbosse.edgeone.app
echo.
echo  [1] Open in browser (web app)
echo  [2] Build desktop EXE (requires Node.js 20)
echo  [3] Exit
echo.
set /p choice=Choose option (1-3):
if "%choice%"=="1" start https://procurbosse.edgeone.app
if "%choice%"=="2" call npm ci --ignore-scripts && call npm run build:exe
echo.
pause
