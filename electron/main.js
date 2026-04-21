/**
 * ProcurBosse — Electron Main v22.6 NUCLEAR
 * EL5 MediProcure | Embu Level 5 Hospital | Kenya
 * Windows 7 SP1 → Windows 11 (x64 + ia32)
 * Loads dist/index.html → /login on boot
 */
'use strict';

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, nativeImage, Tray } = require('electron');
const path = require('path');
const fs   = require('fs');

const APP_NAME    = 'ProcurBosse';
const APP_VERSION = app.getVersion();
const IS_DEV      = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

// Windows 7 detection
const IS_WIN7 = process.platform === 'win32' && (() => {
  try {
    const parts = require('os').release().split('.').map(Number);
    return parts[0] < 10;
  } catch { return false; }
})();

// Paths
const DIST_PATH  = IS_DEV
  ? path.join(__dirname, '../dist')
  : path.join(process.resourcesPath, 'app.asar', 'dist');
const INDEX_HTML = path.join(DIST_PATH, 'index.html');
const ICON_PATH  = IS_DEV
  ? path.join(__dirname, '../public/icons/icon-256.png')
  : path.join(process.resourcesPath, 'icon.png');

// Single instance
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// Windows 7 GPU fixes
if (IS_WIN7) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}

let win  = null;
let tray = null;

function getIcon() {
  try {
    if (fs.existsSync(ICON_PATH)) return nativeImage.createFromPath(ICON_PATH);
  } catch {}
  return undefined;
}

function createWindow() {
  const icon = getIcon();

  win = new BrowserWindow({
    width:           1366,
    height:          768,
    minWidth:        1024,
    minHeight:       600,
    title:           'ProcurBosse — EL5 MediProcure',
    icon,
    show:            false,
    backgroundColor: '#0d47a1',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      webSecurity:      true,
      sandbox:          false,
      preload:          path.join(__dirname, 'preload.js'),
    },
  });

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Load app
  if (IS_DEV) {
    win.loadURL('http://localhost:8080/login');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Load index.html — React router handles /login redirect
    win.loadFile(INDEX_HTML, { hash: '/login' }).catch(() => {
      // Fallback: try loading directly
      win.loadFile(INDEX_HTML);
    });
  }

  // Show when ready — no white flash
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (IS_DEV) console.log('[ProcurBosse] Dev mode — DevTools open');
  });

  // Handle failed load — retry once
  win.webContents.on('did-fail-load', (e, code, desc) => {
    console.warn('[ProcurBosse] Load failed:', code, desc);
    if (code !== -3) { // -3 = ERR_ABORTED (normal for redirect)
      setTimeout(() => {
        if (win && !win.isDestroyed()) win.loadFile(INDEX_HTML);
      }, 1500);
    }
  });

  // External links open in browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from app
  win.webContents.on('will-navigate', (e, url) => {
    const base = IS_DEV ? 'http://localhost:8080' : 'file://';
    if (!url.startsWith(base) && !url.startsWith('file://')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // Tray icon
  try {
    if (icon && !icon.isEmpty()) {
      tray = new Tray(icon.resize({ width: 16, height: 16 }));
      tray.setToolTip('ProcurBosse — EL5 MediProcure');
      tray.on('click', () => { if (win) { win.show(); win.focus(); } });
    }
  } catch {}

  win.on('closed', () => { win = null; });
}

// App events
app.whenReady().then(() => {
  createWindow();
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });
});

app.on('window-all-closed', () => {
  if (tray) { try { tray.destroy(); } catch {} }
  app.quit();
});

app.on('activate', () => {
  if (!win) createWindow();
});

// IPC handlers
ipcMain.handle('app-version',  () => APP_VERSION);
ipcMain.handle('app-name',     () => APP_NAME);
ipcMain.handle('is-dev',       () => IS_DEV);
ipcMain.handle('platform',     () => process.platform);

ipcMain.handle('open-external', (_, url) => {
  if (url && url.startsWith('http')) shell.openExternal(url);
});

ipcMain.handle('show-save-dialog', async (_, opts) => {
  if (!win) return null;
  const result = await dialog.showSaveDialog(win, opts);
  return result.canceled ? null : result.filePath;
});

ipcMain.handle('show-open-dialog', async (_, opts) => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, opts);
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('write-file', async (_, filePath, data) => {
  try {
    fs.writeFileSync(filePath, data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('read-file', async (_, filePath) => {
  try {
    return { ok: true, data: fs.readFileSync(filePath, 'utf8') };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
