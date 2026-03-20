@echo off
:: Silent install for IT mass deployment
set LOG=C:\ProcurBosse_Install.log
echo [%date% %time%] Starting >> "%LOG%"
for /r "%~dp0" %%f in (*Win10-x64-Setup.exe) do (
    echo Installing: %%f
    "%%f" /S
    echo [%date% %time%] Done: %%f >> "%LOG%"
    goto :verify
)
echo No x64 installer found
goto :end
:verify
timeout /t 5 /nobreak >nul
if exist "C:\Program Files\ProcurBosse\ProcurBosse.exe" (
    echo SUCCESS - ProcurBosse installed
) else (
    echo WARNING - EXE not found after install
)
:end
echo [%date% %time%] End >> "%LOG%"
