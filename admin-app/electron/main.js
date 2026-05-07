/**
 * ProcurBosse IT Admin Application — Electron Main v1.0
 * Starts at system login (auto-start), shows live stats
 * Full control: Supabase, Tencent EdgeOne, GitHub, Frontend
 * EL5 MediProcure · Embu Level 5 Hospital · Kenya
 */
'use strict';

const {
  app, BrowserWindow, Tray, Menu, nativeImage,
  ipcMain, dialog, shell, Notification, powerMonitor
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const https = require('https');
const os    = require('os');

const APP_NAME    = 'ProcurBosse IT Admin';
const APP_VERSION = '1.0.0';
const IS_DEV      = process.env.ELECTRON_DEV === '1' || !app.isPackaged;
const ICON_PATH   = IS_DEV
  ? path.join(__dirname, '../assets/icon-48.png')
  : path.join(process.resourcesPath, 'icon.png');

// ── Auto-start at system login ──────────────────────────────────────
app.setLoginItemSettings({
  openAtLogin: true,
  openAsHidden: true,   // start minimized to tray
  name: APP_NAME,
  args: ['--autostart']
});

// ── Single instance lock ───────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let mainWindow = null;
let tray       = null;
let isQuitting = false;

// ── Create main window ─────────────────────────────────────────────
function createWindow() {
  const autostart = process.argv.includes('--autostart');
  
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    title: APP_NAME,
    icon:  ICON_PATH,
    show:  !autostart,   // hidden on autostart, show on manual open
    frame: true,
    titleBarStyle: 'default',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide(); // minimize to tray instead of close
    }
  });

  mainWindow.on('ready-to-show', () => {
    if (!autostart) mainWindow.show();
  });
}

// ── System tray ────────────────────────────────────────────────────
function createTray() {
  const trayIcon = nativeImage.createFromPath(ICON_PATH).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip(`${APP_NAME} v${APP_VERSION}`);
  
  const updateMenu = (stats) => {
    const ctx = Menu.buildFromTemplate([
      { label: `${APP_NAME} v${APP_VERSION}`, enabled: false },
      { type: 'separator' },
      { label: `🟢 Online Users: ${stats.online ?? '...'}`, enabled: false },
      { label: `📋 Pending Reqs: ${stats.reqs ?? '...'}`,  enabled: false },
      { label: `💳 Pending POs: ${stats.pos ?? '...'}`,    enabled: false },
      { label: `🖥️  CPU: ${stats.cpu ?? '...'}`,           enabled: false },
      { label: `💾 RAM: ${stats.ram ?? '...'}`,            enabled: false },
      { type: 'separator' },
      { label: '📊 Open Dashboard', click: () => { mainWindow.show(); mainWindow.focus(); } },
      { label: '🔄 Refresh Stats',  click: () => mainWindow.webContents.send('refresh-stats') },
      { label: '🌐 Open Web App',   click: () => shell.openExternal('https://procurbosse.edgeone.app') },
      { type: 'separator' },
      { label: '⚙️ Settings',       click: () => { mainWindow.show(); mainWindow.webContents.send('nav', '/settings'); } },
      { type: 'separator' },
      { label: '❌ Quit',           click: () => { isQuitting = true; app.quit(); } },
    ]);
    tray.setContextMenu(ctx);
  };

  updateMenu({});
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });

  // Update tray stats every 30s
  setInterval(() => {
    mainWindow.webContents.send('request-tray-stats');
  }, 30000);

  return updateMenu;
}

// ── IPC handlers ───────────────────────────────────────────────────
ipcMain.handle('get-system-info', () => ({
  platform:  process.platform,
  arch:      process.arch,
  hostname:  os.hostname(),
  cpus:      os.cpus().length,
  totalRam:  Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
  freeRam:   Math.round(os.freemem()  / 1024 / 1024 / 1024) + ' GB',
  uptime:    Math.round(os.uptime() / 3600) + 'h',
  nodeVer:   process.version,
  electronVer: process.versions.electron,
  appVer:    APP_VERSION,
}));

ipcMain.handle('get-app-version', () => APP_VERSION);

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

ipcMain.handle('show-notification', (_, { title, body }) => {
  new Notification({ title, body, icon: ICON_PATH }).show();
});

ipcMain.handle('restart-app', () => {
  app.relaunch();
  app.exit(0);
});

ipcMain.handle('open-logs', () => {
  shell.openPath(app.getPath('logs'));
});

ipcMain.on('tray-stats-update', (_, stats) => {
  if (tray) {
    const updateMenu = createTray.__updateMenu;
    if (updateMenu) updateMenu(stats);
  }
});

// ── Power events ───────────────────────────────────────────────────
powerMonitor.on('suspend', () => {
  mainWindow?.webContents.send('power-event', 'suspend');
});
powerMonitor.on('resume', () => {
  mainWindow?.webContents.send('power-event', 'resume');
  // Refresh all stats on wake
  setTimeout(() => mainWindow?.webContents.send('refresh-stats'), 2000);
});

// ── App lifecycle ──────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  const updateMenu = createTray();
  createTray.__updateMenu = updateMenu;

  app.on('second-instance', () => {
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
});

app.on('window-all-closed', (e) => {
  if (!isQuitting) e.preventDefault(); // stay in tray
});

app.on('before-quit', () => { isQuitting = true; });

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});
