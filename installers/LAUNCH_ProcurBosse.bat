@echo off
title Launching ProcurBosse...
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    start "" "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe"
    exit
)
if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    start "" "C:\Program Files\ProcurBosse\ProcurBosse.exe"
    exit
)
if exist "C:\Program Files (x86)\ProcurBosse\ProcurBosse.exe" (
    start "" "C:\Program Files (x86)\ProcurBosse\ProcurBosse.exe"
    exit
)
echo ProcurBosse not found. Run INSTALL_ProcurBosse.bat first.
pause
