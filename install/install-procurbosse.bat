@echo off
setlocal enabledelayedexpansion
title ProcurBosse EL5 MediProcure — Setup
color 0B
cls

echo.
echo  ============================================================
echo   ProcurBosse EL5 MediProcure — ERP Setup
echo   Embu Level 5 Hospital :: Embu County Government
echo  ============================================================
echo.

:: ─── Check Admin rights ───────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERROR] Please run as Administrator.
    echo  Right-click this file and select "Run as Administrator".
    pause & exit /b 1
)

:: ─── Check system architecture ────────────────────────────────
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=x64
) else if "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
    set ARCH=x64
) else (
    set ARCH=ia32
)
echo  Detected architecture: %ARCH%
echo.

:: ─── Install Visual C++ Redistributables ──────────────────────
echo  [1/5] Checking Visual C++ Redistributables...

:: Check if VC++ 2015-2022 x64 is installed
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" /v Installed >nul 2>&1
if errorlevel 1 (
    echo        Installing Visual C++ 2015-2022 Redistributable x64...
    if exist "%~dp0vcredist_x64.exe" (
        "%~dp0vcredist_x64.exe" /install /quiet /norestart
    ) else (
        echo        Downloading from Microsoft...
        powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vc_redist.x64.exe' -OutFile '%TEMP%\vcredist_x64.exe'; Start-Process '%TEMP%\vcredist_x64.exe' -ArgumentList '/install /quiet /norestart' -Wait }"
        if !errorlevel! neq 0 echo        [WARN] VC++ download failed. App may still work.
    )
    echo        VC++ x64 installed.
) else (
    echo        VC++ Redistributable already installed.
)

:: ─── Check Node.js ────────────────────────────────────────────
echo.
echo  [2/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo        Node.js not found. Downloading Node.js 20 LTS...
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol='Tls12'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node-setup.msi'; Start-Process msiexec.exe -ArgumentList '/i %TEMP%\node-setup.msi /quiet' -Wait }"
    echo        Node.js installed. Please restart and re-run this installer.
    pause & exit /b 0
) else (
    for /f "tokens=*" %%v in ('node --version 2^>nul') do echo        Found: %%v
)

:: ─── Set install directory ────────────────────────────────────
echo.
echo  [3/5] Setting up installation directory...
set "INSTALL_DIR=%ProgramFiles%\ProcurBosse"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
echo        Install path: %INSTALL_DIR%

:: ─── Copy files ───────────────────────────────────────────────
echo.
echo  [4/5] Installing ProcurBosse files...
if exist "%~dp0ProcurBosse-Setup-x64.exe" (
    copy /Y "%~dp0ProcurBosse-Setup-x64.exe" "%INSTALL_DIR%\" >nul
    echo        Copied EXE installer.
)
if exist "%~dp0open-web.bat" (
    copy /Y "%~dp0open-web.bat" "%INSTALL_DIR%\" >nul
)

:: ─── Create Desktop + Start Menu shortcuts ────────────────────
echo.
echo  [5/5] Creating shortcuts...
set "SHORTCUT_NAME=ProcurBosse EL5 MediProcure"
set "APP_URL=https://procurbosse.edgeone.app"
set "KIOSK_URL=https://kiosk.procurbosse.edgeone.app"

:: Desktop shortcut (opens web app)
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\%SHORTCUT_NAME%.lnk'); $s.TargetPath='%SystemRoot%\system32\cmd.exe'; $s.Arguments='/c start chrome %APP_URL%'; $s.IconLocation='%SystemRoot%\system32\imageres.dll,20'; $s.Description='ProcurBosse EL5 MediProcure ERP'; $s.Save()"

:: Kiosk shortcut
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut([Environment]::GetFolderPath('Desktop')+'\ProcurBosse Request Station.lnk'); $s.TargetPath='%SystemRoot%\system32\cmd.exe'; $s.Arguments='/c start chrome %KIOSK_URL%'; $s.IconLocation='%SystemRoot%\system32\imageres.dll,14'; $s.Description='ProcurBosse Department Request Station'; $s.Save()"

:: Start Menu
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\ProcurBosse" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\ProcurBosse"
powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\ProcurBosse\ProcurBosse ERP.lnk'); $s.TargetPath='%SystemRoot%\system32\cmd.exe'; $s.Arguments='/c start chrome %APP_URL%'; $s.Save()"

:: ─── Done ─────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   INSTALLATION COMPLETE!
echo  ============================================================
echo.
echo   Main ERP:       %APP_URL%
echo   Request Station: %KIOSK_URL%
echo.
echo   Desktop shortcuts have been created.
echo   To uninstall, run uninstall-procurbosse.bat as Administrator.
echo.
echo   Support: Embu County ICT Department
echo  ============================================================
echo.
pause

:: Offer to open the app now
set /p OPEN="Open ProcurBosse now? (Y/N): "
if /i "%OPEN%"=="Y" start chrome %APP_URL%
exit /b 0
