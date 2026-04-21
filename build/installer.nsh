# ProcurBosse NSIS installer customization
# Adds Visual C++ Runtime check

!macro preInit
  SetRegView 64
!macroend

!macro customHeader
  !system "echo Installing ProcurBosse EL5 MediProcure"
!macroend

!macro customInstall
  # Create additional shortcuts
  CreateShortcut "$DESKTOP\ProcurBosse EL5 MediProcure.lnk" "$INSTDIR\ProcurBosse.exe"
!macroend
