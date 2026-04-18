/**
 * ProcurBosse Preload   secure IPC bridge
 * Exposed as window.procurBosse in the renderer
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('procurBosse', {
  // Identity
  appName:    'ProcurBosse',
  isElectron: true,

  // App info
  getVersion:  () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  getAppPath:  () => ipcRenderer.invoke('get-app-path'),
  getUserData: () => ipcRenderer.invoke('get-user-data'),
  isPackaged:  () => ipcRenderer.invoke('is-packaged'),
  isWin7:      () => ipcRenderer.invoke('is-win7'),

  // Navigation
  navigate: (route) => ipcRenderer.invoke('navigate', route),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-updates'),

  // File system (dialogs)
  showSaveDialog: (opts) => ipcRenderer.invoke('show-save-dialog', opts),
  showOpenDialog: (opts) => ipcRenderer.invoke('show-open-dialog', opts),
  writeFile:      (args) => ipcRenderer.invoke('write-file', args),
});
