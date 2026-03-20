@echo off
title Uninstall ProcurBosse
color 0C
set /p CONFIRM=Uninstall ProcurBosse? (Y/N): 
if /i not "%CONFIRM%"=="Y" exit
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\Uninstall ProcurBosse.exe" (
    start "" "%LOCALAPPDATA%\Programs\ProcurBosse\Uninstall ProcurBosse.exe"
) else if exist "C:\Program Files\ProcurBosse\Uninstall ProcurBosse.exe" (
    start "" "C:\Program Files\ProcurBosse\Uninstall ProcurBosse.exe"
) else (
    echo Uninstaller not found.
    echo Manually delete: C:\Program Files\ProcurBosse\
)
pause
