@echo off
:: ProcurBosse Silent Install — IT Department Mass Deployment
:: Run as Administrator
:: Log: C:\ProcurBosse_Install.log
set LOG=C:\ProcurBosse_Install.log
echo [%date% %time%] ProcurBosse silent install started >> "%LOG%"
echo [%date% %time%] Source: %~dp0 >> "%LOG%"
echo [%date% %time%] Computer: %COMPUTERNAME% User: %USERNAME% >> "%LOG%"

:: Find x64 installer
set FOUND=
for /r "%~dp0" %%F in (*Win10-x64*.exe *-x64*.exe *x64*.exe) do (
    if not defined FOUND set FOUND=%%F
)
:: Fall back to ia32
if not defined FOUND (
    for /r "%~dp0" %%F in (*ia32*.exe *Win7*.exe) do (
        if not defined FOUND set FOUND=%%F
    )
)
if not defined FOUND (
    echo [%date% %time%] ERROR: No installer found in %~dp0 >> "%LOG%"
    echo ERROR: No ProcurBosse installer found
    exit /b 1
)

echo [%date% %time%] Installer: %FOUND% >> "%LOG%"
echo Installing: %FOUND%

:: Silent install
"%FOUND%" /S

if %ERRORLEVEL%==0 (
    echo [%date% %time%] Install SUCCESS >> "%LOG%"
    echo SUCCESS
) else (
    echo [%date% %time%] Install FAILED exit=%ERRORLEVEL% >> "%LOG%"
    echo FAILED — see %LOG%
    exit /b %ERRORLEVEL%
)

:: Verify
timeout /t 5 /nobreak >nul
if exist "%LOCALAPPDATA%\Programs\ProcurBosse\ProcurBosse.exe" (
    echo [%date% %time%] VERIFIED: %LOCALAPPDATA%\Programs\ProcurBosse\ >> "%LOG%"
    echo VERIFIED: Installed OK
) else if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    echo [%date% %time%] VERIFIED: C:\Program Files\ProcurBosse\ >> "%LOG%"
    echo VERIFIED: Installed OK
) else (
    echo [%date% %time%] WARNING: EXE not found post-install >> "%LOG%"
)
echo [%date% %time%] Done >> "%LOG%"
