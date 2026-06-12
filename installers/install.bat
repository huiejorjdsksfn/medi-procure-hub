@echo off
chcp 65001 >nul
title EL5 MediProcure - Installing...

echo.
echo  ██████╗ ███████╗██╗   ██╗███████╗███████╗███████╗
echo  ██╔══██╗██╔════╝██║   ██║██╔════╝██╔════╝██╔════╝
echo  ██║  ██║█████╗  ██║   ██║█████╗  ███████╗███████╗
echo  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══╝  ╚════██║╚════██║
echo  ██████╔╝███████╗ ╚████╔╝ ███████╗███████║███████║
echo  ╚═════╝ ╚══════╝  ╚═══╝  ╚══════╝╚══════╝╚══════╝
echo.
echo  MediProcure Hub - Embu Level 5 Hospital
echo  ============================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Running installer...
)

set "INSTALL_DIR=%ProgramFiles%\EL5 MediProcure"
set "START_MENU=%ProgramData%\Microsoft\Windows\Start Menu\Programs"
set "DESKTOP=%USERPROFILE%\Desktop"

echo [1/5] Creating installation directory...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [2/5] Copying application files...
xcopy /E /Y /Q "%~dp0ProcurBosse.exe" "%INSTALL_DIR%\" >nul 2>&1
xcopy /E /Y /Q "%~dp0resources" "%INSTALL_DIR%\resources\" >nul 2>&1
xcopy /E /Y /Q "%~dp0locales" "%INSTALL_DIR%\locales\" >nul 2>&1
xcopy /E /Y /Q "%~dp0*.dll" "%INSTALL_DIR%\" >nul 2>&1

echo [3/5] Creating shortcuts...

:: Start Menu shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\EL5 MediProcure.lnk'); $s.TargetPath = '%INSTALL_DIR%\ProcurBosse.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'EL5 MediProcure - ProcurBosse'; $s.Save()"

:: Desktop shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\EL5 MediProcure.lnk'); $s.TargetPath = '%INSTALL_DIR%\ProcurBosse.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'EL5 MediProcure - ProcurBosse'; $s.Save()"

:: Admin App shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%START_MENU%\EL5 IT Admin.lnk'); $s.TargetPath = '%INSTALL_DIR%\ProcurBosse IT Admin.exe'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Description = 'EL5 MediProcure - IT Admin'; $s.Save()"

echo [4/5] Registering application...

:: Add to Windows Registry for uninstaller
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "DisplayName" /t REG_SZ /d "EL5 MediProcure" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "InstallLocation" /t REG_SZ /d "%INSTALL_DIR%" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "Publisher" /t REG_SZ /d "Embu Level 5 Hospital" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "DisplayVersion" /t REG_SZ /d "11.4.0" /f >nul 2>&1
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\EL5MediProcure" /v "UninstallString" /t REG_SZ /d "cmd /c rmdir /s /q \"%INSTALL_DIR%\"" /f >nul 2>&1

echo [5/5] Installation complete!
echo.

echo  ============================================
echo  EL5 MediProcure has been installed!
echo.
echo  Installation Directory: %INSTALL_DIR%
echo.
echo  Shortcuts created:
echo    - Start Menu: EL5 MediProcure
echo    - Desktop: EL5 MediProcure
echo    - Start Menu: EL5 IT Admin
echo  ============================================
echo.

set /p LAUNCH="Would you like to launch EL5 MediProcure now? (Y/N): "
if /i "%LAUNCH%"=="Y" (
    start "" "%INSTALL_DIR%\ProcurBosse.exe"
)

echo Installation finished. Press any key to exit...
pause >nul