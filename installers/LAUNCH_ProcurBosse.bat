@echo off
title Launch ProcurBosse
set EXE=

:: Check all known install locations
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    set EXE=%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe
) else if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    set EXE=C:\Program Files\ProcurBosse\ProcurBosse.exe
) else if exist "C:\Program Files (x86)\ProcurBosse\ProcurBosse.exe" (
    set EXE=C:\Program Files (x86)\ProcurBosse\ProcurBosse.exe
) else if exist "%APPDATA%\Local\Programs\ProcurBosse\ProcurBosse.exe" (
    set EXE=%APPDATA%\Local\Programs\ProcurBosse\ProcurBosse.exe
)

if defined EXE (
    echo Launching: %EXE%
    start "" "%EXE%"
    exit /b 0
)

echo ProcurBosse not found. Run INSTALL_ProcurBosse.bat first.
echo Or check: C:\Program Files\ProcurBosse\
pause
