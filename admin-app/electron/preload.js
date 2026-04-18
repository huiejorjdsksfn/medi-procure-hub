/**
 * ProcurBosse IT Admin — Preload Bridge
 * Secure IPC bridge between renderer and main process
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // System info
  getSystemInfo:    () => ipcRenderer.invoke('get-system-info'),
  getAppVersion:    () => ipcRenderer.invoke('get-app-version'),
  
  // Actions
  openExternal:     (url)          => ipcRenderer.invoke('open-external', url),
  showNotification: (title, body)  => ipcRenderer.invoke('show-notification', { title, body }),
  restartApp:       ()             => ipcRenderer.invoke('restart-app'),
  openLogs:         ()             => ipcRenderer.invoke('open-logs'),
  
  // Tray
  sendTrayStats:    (stats)        => ipcRenderer.send('tray-stats-update', stats),
  
  // Events from main
  onRefreshStats:   (cb) => ipcRenderer.on('refresh-stats',      (_, d) => cb(d)),
  onNavTo:          (cb) => ipcRenderer.on('nav',                (_, r) => cb(r)),
  onPowerEvent:     (cb) => ipcRenderer.on('power-event',        (_, e) => cb(e)),
  onTrayStatsReq:   (cb) => ipcRenderer.on('request-tray-stats', ()    => cb()),

  // Remove listeners
  removeAllListeners: (ch) => ipcRenderer.removeAllListeners(ch),
});
