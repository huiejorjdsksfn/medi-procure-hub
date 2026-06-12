@echo off
chcp 65001 >nul
title EL5 MediProcure - Installing...

color 0B
cls
echo.
echo  ██████╗ ███████╗██╗   ██╗███████╗███████╗███████╗
echo  ██╔══██╗██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝
echo  ██║  ██║█████╗  ██║   ██║█████╗  ███████╗███████╗
echo  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ╚════██║╚════██║
echo  ██████╔╝███████╗ ╚████╔╝ ███████╗███████║███████║
echo  ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝╚══════╝╚══════╝
echo.
echo  EL5 MediProcure Hub - Embu Level 5 Hospital
echo  ============================================
echo.

:: Installation paths
set "APP_DIR=%ProgramFiles%\EL5 MediProcure"
set "MAIN_EXE=ProcurBosse.exe"
set "ADMIN_EXE=ProcurBosse IT Admin.exe"

echo [INFO] System: %COMPUTERNAME%
echo [INFO] User: %USERNAME%
echo [INFO] Architecture: %PROCESSOR_ARCHITECTURE%
echo.

:: =============================================
:: INSTALL MAIN APPLICATION
:: =============================================
echo [1/4] Installing EL5 MediProcure (Main App)...
echo.

if not exist "%APP_DIR%" mkdir "%APP_DIR%"

:: Copy all files from ProcurBosse folder
if exist "%~dp0ProcurBosse\" (
    xcopy /E /Y /Q "%~dp0ProcurBosse\*" "%APP_DIR%\" >nul 2>&1
    echo   [OK] Main app files copied
) else (
    echo   [WARN] ProcurBosse folder not found, using root files
    xcopy /E /Y /Q "%~dp0*.dll" "%APP_DIR%\" >nul 2>&1
    xcopy /E /Y /Q "%~dp0*.pak" "%APP_DIR%\" >nul 2>&1
    if exist "%~dp0ProcurBosse.exe" copy /Y "%~dp0ProcurBosse.exe" "%APP_DIR%\" >nul 2>&1
)

:: =============================================
:: INSTALL ADMIN APPLICATION
:: =============================================
echo.
echo [2/4] Installing EL5 IT Admin App...
echo.

if exist "%~dp0ProcurBosse-IT-Admin\%ADMIN_EXE%" (
    copy /Y "%~dp0ProcurBosse-IT-Admin\%ADMIN_EXE%" "%APP_DIR%\" >nul 2>&1
    echo   [OK] IT Admin app copied
) else if exist "%~dp0%ADMIN_EXE%" (
    copy /Y "%~dp0%ADMIN_EXE%" "%APP_DIR%\" >nul 2>&1
    echo   [OK] IT Admin app copied
)

:: =============================================
:: CREATE SHORTCUTS
:: =============================================
echo.
echo [3/4] Creating shortcuts...
echo.

set "START_MENU=%ProgramData%\Microsoft\Windows\Start Menu\Programs"
set "DESKTOP=%PUBLIC%\Desktop"
set "DESKTOP_USER=%USERPROFILE%\Desktop"

:: Create PowerShell script for shortcuts
powershell -NoProfile -Command "
$ws = New-Object -ComObject WScript.Shell
$appDir = '%APP_DIR%'

# Main App - Start Menu
$s = $ws.CreateShortcut('%START_MENU%\EL5 MediProcure.lnk')
$s.TargetPath = \"$appDir\ProcurBosse.exe\"
$s.WorkingDirectory = $appDir
$s.Description = 'EL5 MediProcure Hub - Embu Level 5 Hospital'
$s.IconLocation = \"$appDir\resources\icon.png,0\"
$s.Save()

# Main App - Desktop
$s = $ws.CreateShortcut('%DESKTOP_USER%\EL5 MediProcure.lnk')
$s.TargetPath = \"$appDir\ProcurBosse.exe\"
$s.WorkingDirectory = $appDir
$s.Description = 'EL5 MediProcure Hub - Embu Level 5 Hospital'
$s.Save()

# IT Admin - Start Menu
$s = $ws.CreateShortcut('%START_MENU%\EL5 IT Admin.lnk')
$s.TargetPath = \"$appDir\ProcurBosse IT Admin.exe\"
$s.WorkingDirectory = $appDir
$s.Description = 'EL5 MediProcure IT Administration'
$s.Save()

Write-Host 'Shortcuts created successfully'
" 2>nul

if %ERRORLEVEL%==0 (
    echo   [OK] Shortcuts created
) else (
    echo   [WARN] Some shortcuts may not have been created
)

:: =============================================
:: REGISTRY ENTRIES
:: =============================================
echo.
echo [4/4] Registering applications...
echo.

reg add "HKLM\SOFTWARE\EL5MediProcure" /v "InstallPath" /t REG_SZ /d "%APP_DIR%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\EL5MediProcure" /v "Version" /t REG_SZ /d "11.4.0" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "DisplayName" /t REG_SZ /d "EL5 MediProcure Hub" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "Publisher" /t REG_SZ /d "Embu Level 5 Hospital" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "DisplayVersion" /t REG_SZ /d "11.4.0" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "InstallLocation" /t REG_SZ /d "%APP_DIR%" /f >nul 2>&1

echo   [OK] Registry entries added

:: =============================================
:: COMPLETION
:: =============================================
echo.
echo  ============================================
echo   INSTALLATION COMPLETE!
echo  ============================================
echo.
echo   Installation Directory:
echo   %APP_DIR%
echo.
echo   Installed Applications:
echo   - EL5 MediProcure (Main App)
echo   - EL5 IT Admin
echo.
echo   Shortcuts Created:
echo   - Start Menu: EL5 MediProcure
echo   - Start Menu: EL5 IT Admin  
echo   - Desktop: EL5 MediProcure
echo.
echo  ============================================
echo.

:: Ask to launch
set /p LAUNCH="Would you like to launch EL5 MediProcure now? (Y/N): "
if /i "%LAUNCH%"=="Y" (
    echo.
    echo  Launching EL5 MediProcure...
    start "" "%APP_DIR%\%MAIN_EXE%"
)

echo.
echo  Installation finished! Press any key to exit...
pause >nul