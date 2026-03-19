; ProcurBosse NSIS custom installer script
; Full Windows 7 SP1 → Windows 11 support

!macro customHeader
  SetCompressor /SOLID lzma
  SetCompressorDictSize 32
!macroend

!macro customInit
  ; Check Windows version — require Vista SP2 minimum (covers Win7 SP1+)
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentVersion"
!macroend

!macro customInstall
  ; Create shortcut on desktop
  CreateShortCut "$DESKTOP\ProcurBosse.lnk" "$INSTDIR\ProcurBosse.exe" "" "$INSTDIR\ProcurBosse.exe" 0
  ; Start menu
  CreateDirectory "$SMPROGRAMS\EL5 MediProcure"
  CreateShortCut "$SMPROGRAMS\EL5 MediProcure\ProcurBosse.lnk" "$INSTDIR\ProcurBosse.exe"
  CreateShortCut "$SMPROGRAMS\EL5 MediProcure\Uninstall.lnk" "$INSTDIR\Uninstall ProcurBosse.exe"
  ; Register app
  WriteRegStr HKCU "Software\EL5 MediProcure\ProcurBosse" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\EL5 MediProcure\ProcurBosse" "Version" "2.0.0"
!macroend

!macro customUnInstall
  Delete "$DESKTOP\ProcurBosse.lnk"
  RMDir /r "$SMPROGRAMS\EL5 MediProcure"
  DeleteRegKey HKCU "Software\EL5 MediProcure"
!macroend
