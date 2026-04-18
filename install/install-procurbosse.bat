@echo off
title ProcurBosse ERP — Complete Installer
color 0A
echo.
echo  ================================================
echo  EL5 MediProcure ProcurBosse ERP v21.4
echo  Embu Level 5 Hospital - Embu County Government
echo  ================================================
echo.

:: Check Administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running as Administrator
) else (
    echo [ERROR] Please run as Administrator
    echo Right-click this file and select "Run as administrator"
    pause
    exit /b 1
)

:: Check Windows version
ver | findstr /i "10\. 11\." >nul
if %errorLevel% == 0 (
    echo [OK] Windows 10/11 detected
) else (
    echo [WARN] Older Windows detected - some features may not work
)

echo.
echo [1/6] Installing Visual C++ 2022 Redistributable...
:: x64
if not exist "%TEMP%\vc_redist.x64.exe" (
    curl -L "https://aka.ms/vs/17/release/vc_redist.x64.exe" -o "%TEMP%\vc_redist.x64.exe" --silent
)
"%TEMP%\vc_redist.x64.exe" /install /quiet /norestart >nul 2>&1
echo    [DONE] Visual C++ Redistributable

echo.
echo [2/6] Installing WebView2 Runtime (required by app)...
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" >nul 2>&1
if %errorLevel% NEQ 0 (
    curl -L "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -o "%TEMP%\WebView2Setup.exe" --silent
    "%TEMP%\WebView2Setup.exe" /silent /install >nul 2>&1
    echo    [DONE] WebView2 Runtime installed
) else (
    echo    [SKIP] WebView2 already installed
)

echo.
echo [3/6] Checking .NET Runtime...
dotnet --version >nul 2>&1
if %errorLevel% NEQ 0 (
    echo    Installing .NET 8 Runtime...
    curl -L "https://dot.net/v1/dotnet-install.bat" -o "%TEMP%\dotnet-install.bat" --silent
    call "%TEMP%\dotnet-install.bat" -Runtime dotnet -Version 8.0 >nul 2>&1
)
echo    [DONE] .NET Runtime

echo.
echo [4/6] Installing ProcurBosse ERP...
:: Find the setup exe in current directory
for %%f in (ProcurBosse-*.exe) do (
    echo    Installing %%f...
    "%%f" /S
    echo    [DONE] %%f
)

echo.
echo [5/6] Creating firewall rules...
netsh advfirewall firewall add rule name="ProcurBosse ERP" dir=in action=allow program="%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" >nul 2>&1
echo    [DONE] Firewall configured

echo.
echo [6/6] Setting up auto-start for IT Admin...
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ProcurBosseITAdmin" /t REG_SZ /d "\"%LOCALAPPDATA%\Programs\ProcurBosse IT Admin\ProcurBosse IT Admin.exe\" --autostart" /f >nul 2>&1
echo    [DONE] IT Admin auto-start configured

echo.
echo  ================================================
echo  Installation Complete!
echo.
echo  ProcurBosse ERP: Desktop shortcut created
echo  IT Admin App: Starts automatically at login
echo  Web App: https://procurbosse.edgeone.app
echo.
echo  Support: tecnojin03@gmail.com
echo  ================================================
echo.
pause
