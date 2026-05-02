@echo off
title Build ProcurBosse EXE
echo Building ProcurBosse Windows EXE...
cd /d "%~dp0.."
call npm ci --ignore-scripts
call npx vite build
call npx electron-builder --win --x64 --config electron-builder.yml
echo.
echo EXE built in: dist-electronpause
