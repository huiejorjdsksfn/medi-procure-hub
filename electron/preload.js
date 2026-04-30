/**
 * ProcurBosse Preload v9.6.0 — Secure IPC bridge
 * Exposed as window.procurBosse in the renderer
 * EL5 MediProcure | Embu Level 5 Hospital
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('procurBosse', {
  // Identity
  appName:    'ProcurBosse',
  version:    '9.6.0',
  isElectron: true,
  isDesktop:  true,

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
  readFile:       (args) => ipcRenderer.invoke('read-file', args),

  // Cache management
  clearCache:  () => ipcRenderer.invoke('clear-cache'),

  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),

  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

  // Print (native)
  printDocument: (options) => ipcRenderer.invoke('print-document', options),

  // Events from main process
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (_, info) => cb(info)),
  onUpdateProgress:  (cb) => ipcRenderer.on('update-progress', (_, p) => cb(p)),
  onNavigateTo:      (cb) => ipcRenderer.on('navigate-to', (_, route) => cb(route)),
  removeListener:    (ch) => ipcRenderer.removeAllListeners(ch),
});
