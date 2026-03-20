@echo off
:: ProcurBosse Silent Install for IT Department
:: Run as Administrator. Logs to C:\ProcurBosse_Install.log
set LOG=C:\ProcurBosse_Install.log
echo [%date% %time%] Silent install started >> "%LOG%"
echo [%date% %time%] Source: %~dp0 >> "%LOG%"
set FOUND=
for /r "%~dp0" %%F in (*Win10-x64*.exe *-x64*.exe) do (
    if not defined FOUND set FOUND=%%F
)
if not defined FOUND (
    echo [%date% %time%] ERROR: No x64 installer found >> "%LOG%"
    echo ERROR: No x64 EXE found in %~dp0
    exit /b 1
)
echo [%date% %time%] Installing: %FOUND% >> "%LOG%"
echo Installing: %FOUND%
"%FOUND%" /S
if %ERRORLEVEL%==0 (
    echo [%date% %time%] SUCCESS >> "%LOG%"
    echo SUCCESS
) else (
    echo [%date% %time%] FAILED code=%ERRORLEVEL% >> "%LOG%"
    echo FAILED - see %LOG%
)
timeout /t 5 /nobreak >nul
if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    echo [%date% %time%] VERIFIED: EXE found >> "%LOG%"
    echo VERIFIED OK
) else (
    echo [%date% %time%] WARNING: EXE not found after install >> "%LOG%"
)
echo [%date% %time%] Done >> "%LOG%"
