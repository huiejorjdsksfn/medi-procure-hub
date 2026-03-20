@echo off
title Launching ProcurBosse...
set EXE=
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    set EXE=%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe
) else if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    set EXE=C:\Program Files\ProcurBosse\ProcurBosse.exe
) else if exist "C:\Program Files (x86)\ProcurBosse\ProcurBosse.exe" (
    set EXE=C:\Program Files (x86)\ProcurBosse\ProcurBosse.exe
)
if defined EXE (
    echo Launching: %EXE%
    start "" "%EXE%"
    exit /b 0
)
echo ProcurBosse not found. Run INSTALL_ProcurBosse.bat first.
pause
