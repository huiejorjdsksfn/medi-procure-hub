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
  version:    '11.0.0',
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

// Also expose as window.electronAPI for backward-compat with any code using that name
try {
  const { contextBridge: cb, ipcRenderer: ipc } = require('electron');
  cb.exposeInMainWorld('electronAPI', {
    isElectron: true,
    getVersion:  () => ipc.invoke('get-app-version'),
    getPlatform: () => ipc.invoke('get-platform'),
    navigate:    (r) => ipc.invoke('navigate', r),
    openExternal:(url) => { const { shell } = require('electron'); shell.openExternal(url); },
    getSystemInfo:() => ipc.invoke('get-system-info'),
    clearCache:  () => ipc.invoke('clear-cache'),
    printDocument:(o) => ipc.invoke('print-document', o),
    showNotification:(t,b) => ipc.invoke('show-notification',{title:t,body:b}),
    showSaveDialog:(o) => ipc.invoke('show-save-dialog', o),
    showOpenDialog:(o) => ipc.invoke('show-open-dialog', o),
    writeFile:   (a) => ipc.invoke('write-file', a),
    readFile:    (a) => ipc.invoke('read-file', a),
  });
} catch(e) { /* already exposed */ }
