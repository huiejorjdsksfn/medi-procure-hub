@echo off
title Uninstall ProcurBosse — EL5 MediProcure
color 0C
echo.
echo  Uninstall ProcurBosse — EL5 MediProcure
echo.
set /p CONFIRM=Are you sure you want to uninstall? (Y/N): 
if /i not "%CONFIRM%"=="Y" (
    echo  Cancelled.
    pause
    exit /b 0
)

set UNI=
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\Uninstall ProcurBosse.exe" (
    set UNI=%LOCALAPPDATA%\Programs\ProcurBosse\Uninstall ProcurBosse.exe
) else if exist "C:\Program Files\ProcurBosse\Uninstall ProcurBosse.exe" (
    set UNI=C:\Program Files\ProcurBosse\Uninstall ProcurBosse.exe
)

if defined UNI (
    echo  Running uninstaller...
    start "" "%UNI%"
) else (
    echo  Uninstaller not found.
    echo  Manually delete:
    echo    %LOCALAPPDATA%\Programs\ProcurBosse
    echo    C:\Program Files\ProcurBosse
)
pause
