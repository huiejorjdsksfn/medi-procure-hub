@echo off
title Uninstall ProcurBosse
color 0C
echo.
echo  ProcurBosse Uninstaller - EL5 MediProcure
echo.
set /p CONFIRM=Uninstall ProcurBosse? (Y/N): 
if /i not "%CONFIRM%"=="Y" exit /b 0
set UNI=
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\Uninstall ProcurBosse.exe" (
    set UNI=%LOCALAPPDATA%\Programs\ProcurBosse\Uninstall ProcurBosse.exe
) else if exist "C:\Program Files\ProcurBosse\Uninstall ProcurBosse.exe" (
    set UNI=C:\Program Files\ProcurBosse\Uninstall ProcurBosse.exe
)
if defined UNI (
    echo Running uninstaller...
    start "" "%UNI%"
) else (
    echo Uninstaller not found. Delete manually:
    echo   %LOCALAPPDATA%\Programs\ProcurBosse
    echo   C:\Program Files\ProcurBosse
)
pause
