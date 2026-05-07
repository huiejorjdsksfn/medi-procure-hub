@echo off
setlocal EnableDelayedExpansion
title ProcurBosse v5.8 — EL5 MediProcure Installer
color 0A

echo.
echo  ========================================================
echo    ProcurBosse v5.8 — EL5 MediProcure Health ERP
echo    Embu Level 5 Hospital, Embu County Government
echo  ========================================================
echo.

:: ── Check Admin ─────────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo  [!] Run as Administrator. Re-launching...
  powershell Start-Process '"%~f0"' -Verb RunAs
  exit /b
)

echo  [OK] Running as Administrator
echo.

:: ── Detect Architecture ──────────────────────────────────
set ARCH=x64
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
  if "%PROCESSOR_ARCHITEW6432%"=="" set ARCH=ia32
)
echo  [INFO] Architecture: %ARCH%

:: ── Install Node.js (if missing) ─────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  [STEP] Installing Node.js 20 LTS...
  if "!ARCH!"=="x64" (
    set NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    set NODE_MSI=node-x64.msi
  ) else (
    set NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x86.msi
    set NODE_MSI=node-x86.msi
  )
  powershell -Command "Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_MSI!'"
  msiexec /i !NODE_MSI! /quiet /norestart ADDLOCAL=ALL
  del /f !NODE_MSI! 2>nul
  :: Refresh PATH
  for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set PATH=%%b
  echo  [OK] Node.js installed
) else (
  for /f "tokens=1" %%v in ('node --version 2^>nul') do echo  [OK] Node.js %%v found
)

:: ── Install Git (if missing) ─────────────────────────────
where git >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo  [STEP] Installing Git...
  powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe' -OutFile git-setup.exe"
  git-setup.exe /VERYSILENT /NORESTART /NOCANCEL
  del /f git-setup.exe 2>nul
  echo  [OK] Git installed
) else (
  echo  [OK] Git found
)

:: ── Install Required npm Globals ─────────────────────────
echo.
echo  [STEP] Installing global npm tools...
npm install -g electron electron-builder @supabase/cli vite typescript --legacy-peer-deps --quiet 2>nul
echo  [OK] Global tools installed

:: ── Set up app directory ─────────────────────────────────
set INSTALL_DIR=%PROGRAMFILES%\ProcurBosse
if "!ARCH!"=="ia32" set INSTALL_DIR=%PROGRAMFILES(X86)%\ProcurBosse

echo.
echo  [STEP] Creating install directory: !INSTALL_DIR!
mkdir "!INSTALL_DIR!" 2>nul

:: ── Download or locate installer ─────────────────────────
set EXE_FILE=
for %%f in ("%~dp0*.exe") do (
  if /i not "%%~nxf"=="%~nx0" set EXE_FILE=%%f
)

if defined EXE_FILE (
  echo  [INFO] Found installer: !EXE_FILE!
  echo  [STEP] Running EXE installer...
  "!EXE_FILE!" /S /allusers
) else (
  echo  [INFO] No EXE found in current directory.
  echo  [INFO] Attempting to build from source...
  
  where git >nul 2>&1
  if %errorlevel% equ 0 (
    echo  [STEP] Cloning ProcurBosse repository...
    cd /d "%TEMP%"
    git clone https://github.com/huiejorjdsksfn/medi-procure-hub.git procurbosse-src 2>nul
    cd procurbosse-src
    
    echo  [STEP] Installing dependencies...
    npm ci --legacy-peer-deps 2>nul || npm install --legacy-peer-deps
    
    echo  [STEP] Building web...
    set CI=false
    npm run build
    
    echo  [STEP] Installing electron-builder...
    npm install --no-save electron electron-builder --legacy-peer-deps
    
    echo  [STEP] Packaging EXE...
    npx electron-builder build --win --!ARCH! --publish never
    
    for %%f in (release\*.exe) do (
      copy /y "%%f" "!INSTALL_DIR!\" 2>nul
      set EXE_FILE=%%f
    )
    copy /y dist\* "!INSTALL_DIR!\" 2>nul
  )
)

:: ── Create Desktop Shortcut ──────────────────────────────
echo.
echo  [STEP] Creating desktop shortcut...
set SHORTCUT=%PUBLIC%\Desktop\ProcurBosse v5.8.lnk
set TARGET=
for %%f in ("!INSTALL_DIR!\*.exe") do set TARGET=%%f

if defined TARGET (
  powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('!SHORTCUT!'); $s.TargetPath='!TARGET!'; $s.WorkingDirectory='!INSTALL_DIR!'; $s.Description='ProcurBosse EL5 MediProcure v5.8'; $s.Save()"
  echo  [OK] Desktop shortcut created
) else (
  echo  [WARN] No EXE found for shortcut
)

:: ── Create Start Menu Entry ──────────────────────────────
set STARTMENU=%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\ProcurBosse
mkdir "!STARTMENU!" 2>nul
if defined TARGET (
  powershell -Command "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('!STARTMENU!\ProcurBosse v5.8.lnk'); $s.TargetPath='!TARGET!'; $s.WorkingDirectory='!INSTALL_DIR!'; $s.Save()"
  echo  [OK] Start menu entry created
)

:: ── Register App in Windows Apps ─────────────────────────
echo.
echo  [STEP] Registering in Windows...
set REG_KEY=HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ProcurBosse
reg add "!REG_KEY!" /v DisplayName /t REG_SZ /d "ProcurBosse v5.8 - EL5 MediProcure" /f >nul 2>&1
reg add "!REG_KEY!" /v DisplayVersion /t REG_SZ /d "5.8.0" /f >nul 2>&1
reg add "!REG_KEY!" /v Publisher /t REG_SZ /d "Embu County Government" /f >nul 2>&1
reg add "!REG_KEY!" /v InstallLocation /t REG_SZ /d "!INSTALL_DIR!" /f >nul 2>&1
if defined TARGET (
  reg add "!REG_KEY!" /v UninstallString /t REG_SZ /d "\"!TARGET!\" --uninstall" /f >nul 2>&1
)
echo  [OK] Registered in Windows

:: ── Optional: Windows Firewall Rule ─────────────────────
echo.
echo  [STEP] Adding firewall exception...
if defined TARGET (
  netsh advfirewall firewall add rule name="ProcurBosse EL5" program="!TARGET!" action=allow dir=in protocol=tcp >nul 2>&1
  echo  [OK] Firewall rule added
)

:: ── Done ─────────────────────────────────────────────────
echo.
echo  ========================================================
echo    Installation Complete!
echo    ProcurBosse v5.8 — EL5 MediProcure
echo    Embu Level 5 Hospital
echo  ========================================================
echo.
echo  Desktop shortcut created: ProcurBosse v5.8
echo  Start menu: Programs > ProcurBosse > ProcurBosse v5.8
echo.
echo  Twilio WhatsApp:  +14155238886
echo  Join code:        join bad-machine
echo  SMS Number:       +16812972643
echo.

set /p LAUNCH=  Launch ProcurBosse now? [Y/N]: 
if /i "!LAUNCH!"=="Y" (
  if defined TARGET start "" "!TARGET!"
)

pause
endlocal
