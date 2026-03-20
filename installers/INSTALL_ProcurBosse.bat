@echo off
title ProcurBosse Installer
color 0A
cls
echo.
echo  ProcurBosse - EL5 MediProcure Installer
echo  Embu Level 5 Hospital, Embu County Government
echo.
echo  Detecting Windows version...
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (set ARCH=x64) else (set ARCH=ia32)
echo  Architecture: %PROCESSOR_ARCHITECTURE% (%ARCH%)
echo.
if "%ARCH%"=="x64" (
    for %%f in (*Win10-x64-Setup.exe) do (
        echo  Installing: %%f
        "%%f"
        goto :done
    )
    for /r %%f in (*Win10-x64-Setup.exe) do (
        echo  Installing: %%f
        "%%f"
        goto :done
    )
)
for %%f in (*Win7-ia32-Setup.exe) do (
    echo  Installing ia32: %%f
    "%%f"
    goto :done
)
for /r %%f in (*-Setup.exe) do (
    echo  Installing: %%f
    "%%f"
    goto :done
)
echo  ERROR: No installer found. Download from:
echo  github.com/huiejorjdsksfn/medi-procure-hub/releases
goto :end
:done
echo.
echo  Install complete! Launch from Desktop shortcut.
:end
pause
