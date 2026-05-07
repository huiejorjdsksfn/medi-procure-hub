@echo off
title Run ProcurBosse EXE
color 0B
echo.
echo  ProcurBosse EXE Runner
echo  Finds and runs ProcurBosse EXE in current folder
echo.

set FOUND=
:: Look for x64 first (preferred)
for %%F in (*Win10-x64*.exe *x64*.exe) do (
    if not defined FOUND set FOUND=%%F
)
:: Fall back to any EXE
if not defined FOUND (
    for /r "%~dp0" %%F in (*ProcurBosse*.exe) do (
        if not defined FOUND (
            echo  Found: %%F
            set FOUND=%%F
        )
    )
)
if not defined FOUND (
    for %%F in (*.exe) do (
        if not defined FOUND (
            echo  Found: %%F
            set FOUND=%%F
        )
    )
)
if not defined FOUND (
    echo  No ProcurBosse EXE found here.
    echo  Download from: https://github.com/huiejorjdsksfn/medi-procure-hub/releases
    pause
    exit /b 1
)
echo  Running: %FOUND%
echo.
"%FOUND%"
pause
