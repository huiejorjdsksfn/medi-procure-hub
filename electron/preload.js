/**
 * ProcurBosse — Preload Script v22.6
 * Secure bridge between renderer and main process
 * EL5 MediProcure · Embu Level 5 Hospital
 */
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion:    () => ipcRenderer.invoke('app-version'),
  getName:       () => ipcRenderer.invoke('app-name'),
  isDev:         () => ipcRenderer.invoke('is-dev'),
  getPlatform:   () => ipcRenderer.invoke('platform'),

  // Shell
  openExternal:  (url)        => ipcRenderer.invoke('open-external', url),

  // File system
  saveFile:      (opts)       => ipcRenderer.invoke('show-save-dialog', opts),
  openFile:      (opts)       => ipcRenderer.invoke('show-open-dialog', opts),
  writeFile:     (path, data) => ipcRenderer.invoke('write-file', path, data),
  readFile:      (path)       => ipcRenderer.invoke('read-file', path),

  // Environment detection
  isElectron: true,
});
