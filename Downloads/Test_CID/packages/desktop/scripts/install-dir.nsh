; Override the default install directory to C:\Users\<username>\Electra
; This hook runs before the installer shows any UI, setting $INSTDIR early.
!macro preInit
  StrCpy $INSTDIR "$PROFILE\Electra"
  SetRegView 64
  WriteRegStr HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation "$INSTDIR"
!macroend

!macro customInstall
  ; Create the Data subfolder so users can see it immediately
  CreateDirectory "$INSTDIR\Data"
  ; Shortcut creation is handled by electron-builder via the nsis config
!macroend
