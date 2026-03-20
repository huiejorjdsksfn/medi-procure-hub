@echo off
title Run ProcurBosse EXE
color 0B
echo.
echo  Looking for ProcurBosse EXE in current folder...
echo.
set FOUND=
for %%F in (*.exe) do (
    echo  Found: %%F
    if not defined FOUND set FOUND=%%F
)
if not defined FOUND (
    for /r "%~dp0" %%F in (*ProcurBosse*.exe) do (
        if not defined FOUND (
            echo  Found: %%F
            set FOUND=%%F
        )
    )
)
if not defined FOUND (
    echo  ERROR: No ProcurBosse EXE found here.
    echo  Download: https://github.com/huiejorjdsksfn/medi-procure-hub/releases
    pause
    exit /b 1
)
echo.
echo  Running: %FOUND%
echo.
"%FOUND%"
pause
