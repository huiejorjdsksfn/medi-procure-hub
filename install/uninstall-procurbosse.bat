@echo off
echo Uninstalling ProcurBosse...
if exist "C:\ProcurBosse" rmdir /s /q "C:\ProcurBosse"
if exist "%USERPROFILE%\Desktop\ProcurBosse EL5.url" del "%USERPROFILE%\Desktop\ProcurBosse EL5.url"
echo Done. Goodbye!
pause
