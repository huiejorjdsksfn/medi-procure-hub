; ProcurBosse NSIS installer script
; Handles Windows 7 SP1 → Windows 11 (x64 + ia32)

!macro customHeader
  ; Set installer properties
  RequestExecutionLevel user
!macroend

!macro customInit
  ; Windows version check — require Windows 7 SP1 or later
  ${IfNot} ${AtLeastWin7}
    MessageBox MB_OK|MB_ICONEXCLAMATION "ProcurBosse requires Windows 7 SP1 or later.$\nPlease update your Windows version."
    Abort
  ${EndIf}

  ; Check internet connectivity (ping Supabase)
  nsExec::ExecToStack 'ping -n 1 -w 3000 yvjfehnzbzjliizjvuhq.supabase.co'
  Pop $0
  ${If} $0 != "0"
    MessageBox MB_OKCANCEL|MB_ICONINFORMATION \
      "Warning: Cannot reach the ProcurBosse database.$\n$\nProcurBosse requires an internet connection.$\n$\nInstall anyway?" \
      IDOK +2
    Abort
  ${EndIf}
!macroend

!macro customInstall
  ; Create desktop shortcut with custom icon
  CreateShortCut "$DESKTOP\ProcurBosse.lnk" "$INSTDIR\ProcurBosse.exe" "" "$INSTDIR\resources\icon.png"
  
  ; Create Start Menu entry
  CreateDirectory "$SMPROGRAMS\EL5 MediProcure"
  CreateShortCut "$SMPROGRAMS\EL5 MediProcure\ProcurBosse.lnk" "$INSTDIR\ProcurBosse.exe"
  CreateShortCut "$SMPROGRAMS\EL5 MediProcure\Uninstall.lnk" "$INSTDIR\Uninstall ProcurBosse.exe"

  ; Write registry for uninstall
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProcurBosse" \
    "DisplayName" "ProcurBosse — EL5 MediProcure"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProcurBosse" \
    "Publisher" "Embu County Government"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProcurBosse" \
    "URLInfoAbout" "https://github.com/huiejorjdsksfn/medi-procure-hub"
!macroend

!macro customUnInstall
  ; Clean up shortcuts
  Delete "$DESKTOP\ProcurBosse.lnk"
  RMDir /r "$SMPROGRAMS\EL5 MediProcure"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ProcurBosse"
!macroend
