; ProcurBosse NSIS Installer Script
; Includes Visual C++ Redistributable + Node.js check

!include "MUI2.nsh"
!include "x64.nsh"

; Install Visual C++ 2022 Redistributable if needed
Section "Visual C++ Runtime" SecVCRedist
  SetOutPath "$TEMP"
  ; Check if already installed
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  StrCmp $0 "1" VCRedistInstalled
  
  ; Download and install VC++ Redist
  NSISdl::download "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vc_redist.x64.exe"
  ExecWait '"$TEMP\vc_redist.x64.exe" /quiet /norestart' $1
  
  VCRedistInstalled:
SectionEnd

; WebView2 Runtime check (needed by Electron)
Section "WebView2 Runtime" SecWebView2
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  StrCmp $0 "" 0 WebView2Installed
  
  NSISdl::download "https://go.microsoft.com/fwlink/p/?LinkId=2124703" "$TEMP\MicrosoftEdgeWebview2Setup.exe"
  ExecWait '"$TEMP\MicrosoftEdgeWebview2Setup.exe" /silent /install' $1
  
  WebView2Installed:
SectionEnd
