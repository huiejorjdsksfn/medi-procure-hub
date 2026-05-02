/**
 * ProcurBosse — Electron Main Process v5.8.3
 * EL5 MediProcure Hospital ERP — Embu Level 5 Hospital
 * Compatible: Windows 7 SP1+ → Windows 11 (x64 + ia32)
 *
 * FIXED v5.8.3:
 *  - navigate() now uses executeJavaScript + electron-navigate custom event
 *    which React Router intercepts via useEffect listener
 *  - setWindowOpenHandler called only once
 *  - DIST_PATH uses __dirname-relative path (works in asar + non-asar)
 *  - All IPC handlers present: read-file, get-system-info, clear-cache,
 *    print-document, show-notification
 *  - SPA did-fail-load handler prevents Electron 404
 *  - Full crash logging to userData/crash.log
 */

'use strict';

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, nativeImage, Notification } = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');

// ── Constants ──────────────────────────────────────────────────────────────
const APP_NAME    = 'ProcurBosse';
const APP_VERSION = app.getVersion();
const IS_DEV      = process.env.ELECTRON_DEV === '1' || !app.isPackaged;

// Windows 7 detection (NT 6.1)
const IS_WIN7 = process.platform === 'win32' && (() => {
  try {
    const parts = os.release().split('.').map(Number);
    return parts[0] < 10;
  } catch { return false; }
})();

// ── Paths ──────────────────────────────────────────────────────────────────
// Use __dirname relative path — works correctly both packaged (asar) and dev
const ELECTRON_DIR = __dirname;
const DIST_PATH    = IS_DEV
  ? path.resolve(ELECTRON_DIR, '..', 'dist')
  : path.resolve(ELECTRON_DIR, '..', 'dist');
const INDEX_HTML   = path.join(DIST_PATH, 'index.html');
const ICON_PATH    = path.join(
  IS_DEV ? path.resolve(ELECTRON_DIR, '..', 'public') : process.resourcesPath,
  'icon.png'
);

// ── Crash logging ──────────────────────────────────────────────────────────
function crashLog(msg) {
  try {
    const logFile = path.join(app.getPath('userData'), 'crash.log');
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
  } catch {}
}
process.on('uncaughtException', err => crashLog(`UNCAUGHT: ${err.stack || err}`));
process.on('unhandledRejection', (reason) => crashLog(`UNHANDLED_REJECTION: ${reason}`));

// ── Single instance lock ───────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

// ── Windows 7/8 compatibility ──────────────────────────────────────────────
if (process.platform === 'win32') {
  if (IS_WIN7) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
    app.commandLine.appendSwitch('no-sandbox');
  }
  // Software rendering fallback for all Windows
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
  app.commandLine.appendSwitch('disable-features', 'UseModernGLForCrBug1001971');
}

// ── Window ─────────────────────────────────────────────────────────────────
let win = null;

function getIcon() {
  try {
    if (fs.existsSync(ICON_PATH)) return nativeImage.createFromPath(ICON_PATH);
  } catch {}
  return undefined;
}

function createWindow() {
  const icon = getIcon();

  win = new BrowserWindow({
    width:  1366,
    height: 768,
    minWidth:  1024,
    minHeight: 640,
    title: `${APP_NAME} — EL5 MediProcure`,
    icon,
    show: false,
    backgroundColor: '#0a2558',
    webPreferences: {
      nodeIntegration:             false,
      contextIsolation:            true,
      webSecurity:                 true,
      allowRunningInsecureContent: false,
      enableRemoteModule:          false,
      sandbox:                     false,
      preload: path.join(ELECTRON_DIR, 'preload.js'),
    },
  });

  // ── Load app ───────────────────────────────────────────────────────────
  if (IS_DEV) {
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(INDEX_HTML).catch(err => {
      crashLog(`loadFile failed: ${err.message} — path: ${INDEX_HTML}`);
    });

    // SPA fix: if file not found (e.g. deep route), reload index.html
    win.webContents.on('did-fail-load', (e, errCode, errDesc) => {
      if (errCode === -6 || errCode === -105 || errDesc === 'ERR_FILE_NOT_FOUND' || errDesc === 'ERR_NAME_NOT_RESOLVED') {
        crashLog(`did-fail-load: ${errCode} ${errDesc} — reloading index.html`);
        win.loadFile(INDEX_HTML).catch(() => {});
      }
    });
  }

  // ── External link handler (single, definitive) ─────────────────────────
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });

  // ── Navigation guard ───────────────────────────────────────────────────
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = [
      'http://localhost:8080',
      `file://`,
      'https://yvjfehnzbzjliizjvuhq.supabase.co',
      'wss://yvjfehnzbzjliizjvuhq.supabase.co',
      'https://api.ipify.org',
      'https://api64.ipify.org',
      'https://ipapi.co',
    ];
    if (!allowed.some(a => url.startsWith(a))) {
      event.preventDefault();
      // Open external URLs in browser
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url).catch(() => {});
      }
    }
  });

  // ── Show window when ready ─────────────────────────────────────────────
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    setTimeout(() => { if (win) checkForUpdates(false); }, 4000);
  });

  win.on('closed', () => { win = null; });

  buildMenu();
}

// ── Navigation (FIXED: uses electron-navigate custom event) ───────────────
// React App.tsx listens to window event 'electron-navigate' via useEffect
function navigate(route) {
  if (!win) return;
  const safeRoute = route.replace(/'/g, "\\'");
  win.webContents.executeJavaScript(`
    (function(){
      try {
        window.dispatchEvent(new CustomEvent('electron-navigate', { detail: '${safeRoute}' }));
      } catch(e) {
        console.error('navigate error:', e);
      }
    })();
  `).catch(err => crashLog(`navigate error: ${err.message}`));
}

// ── Application menu ───────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: APP_NAME,
      submenu: [
        { label: `v${APP_VERSION}`, enabled: false },
        { type: 'separator' },
        { label: 'Reload',             accelerator: 'CmdOrCtrl+R',       click: () => win?.reload() },
        { label: 'Hard Reload',        accelerator: 'CmdOrCtrl+Shift+R', click: () => win?.webContents.reloadIgnoringCache() },
        {
          label: 'Clear Cache & Reload',
          click: async () => {
            if (!win) return;
            await win.webContents.session.clearCache();
            win.webContents.reloadIgnoringCache();
          },
        },
        { type: 'separator' },
        { label: 'Check for Updates', click: () => checkForUpdates(true) },
        { type: 'separator' },
        { label: `Quit ${APP_NAME}`,  accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    {
      label: 'Go To',
      submenu: [
        { label: 'Dashboard',       accelerator: 'CmdOrCtrl+1', click: () => navigate('/dashboard') },
        { label: 'Requisitions',    accelerator: 'CmdOrCtrl+2', click: () => navigate('/requisitions') },
        { label: 'Purchase Orders', accelerator: 'CmdOrCtrl+3', click: () => navigate('/purchase-orders') },
        { label: 'Goods Received',  accelerator: 'CmdOrCtrl+4', click: () => navigate('/goods-received') },
        { label: 'Inventory',       accelerator: 'CmdOrCtrl+5', click: () => navigate('/items') },
        { label: 'Reports',         accelerator: 'CmdOrCtrl+6', click: () => navigate('/reports') },
        { type: 'separator' },
        { label: 'Suppliers',   click: () => navigate('/suppliers') },
        { label: 'Contracts',   click: () => navigate('/contracts') },
        { label: 'Tenders',     click: () => navigate('/tenders') },
        { label: 'Vouchers',    click: () => navigate('/vouchers/payment') },
        { label: 'Financials',  click: () => navigate('/financials/dashboard') },
        { label: 'Quality',     click: () => navigate('/quality/dashboard') },
        { label: 'Changelog',   click: () => navigate('/changelog') },
        { type: 'separator' },
        { label: 'Admin Panel', click: () => navigate('/admin/panel') },
        { label: 'Settings',    click: () => navigate('/settings') },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',  accelerator: 'CmdOrCtrl+=',
          click: () => { if (!win) return; const z = win.webContents.getZoomLevel(); win.webContents.setZoomLevel(Math.min(z+0.5, 3)); },
        },
        {
          label: 'Zoom Out', accelerator: 'CmdOrCtrl+-',
          click: () => { if (!win) return; const z = win.webContents.getZoomLevel(); win.webContents.setZoomLevel(Math.max(z-0.5,-3)); },
        },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => win?.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Full Screen',    accelerator: 'F11', click: () => win?.setFullScreen(!win.isFullScreen()) },
        { label: 'Developer Tools',accelerator: 'F12', click: () => win?.webContents.toggleDevTools() },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About ProcurBosse',  click: () => showAbout() },
        { label: 'System Information', click: () => showSysInfo() },
        { type: 'separator' },
        { label: 'Open Log File',   click: () => { const p = path.join(app.getPath('userData'),'crash.log'); fs.existsSync(p) ? shell.openPath(p) : dialog.showMessageBox(win,{type:'info',message:'No log file.',buttons:['OK']}); } },
        { label: 'Open Data Folder',click: () => shell.openPath(app.getPath('userData')) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── About / SysInfo dialogs ────────────────────────────────────────────────
function showAbout() {
  if (!win) return;
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'About ProcurBosse',
    icon: getIcon() || undefined,
    message: `ProcurBosse — EL5 MediProcure`,
    detail: [
      `Version: ${APP_VERSION}`,
      `Electron: ${process.versions.electron}`,
      `Chrome: ${process.versions.chrome}`,
      `Node.js: ${process.versions.node}`,
      `OS: ${os.type()} ${os.release()} ${process.arch}`,
      '',
      'Embu Level 5 Hospital',
      'Procurement & ERP Management System',
      'Embu County Government | Kenya',
      `© ${new Date().getFullYear()} Embu County Government`,
    ].join('\n'),
    buttons: ['Close', 'Check for Updates'],
  }).then(r => { if (r.response === 1) checkForUpdates(true); });
}

function showSysInfo() {
  if (!win) return;
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'System Information',
    message: 'ProcurBosse System Info',
    detail: [
      `OS: ${os.type()} ${os.release()} ${os.arch()}`,
      `CPU: ${os.cpus()[0]?.model || 'Unknown'}`,
      `RAM: ${Math.round(os.totalmem()/1073741824)}GB / Free: ${Math.round(os.freemem()/1073741824)}GB`,
      `App Path: ${app.getAppPath()}`,
      `Data Path: ${app.getPath('userData')}`,
      `Win7 Mode: ${IS_WIN7}`,
      `Dev Mode: ${IS_DEV}`,
    ].join('\n'),
    buttons: ['Close'],
  });
}

// ── Auto-update (GitHub Releases API) ─────────────────────────────────────
async function checkForUpdates(manual = false) {
  if (IS_DEV) {
    if (manual) dialog.showMessageBox(win, { type:'info', message:'Updates disabled in dev mode', buttons:['OK'] });
    return;
  }
  try {
    const https = require('https');
    const data  = await new Promise((res, rej) => {
      const req = https.get(
        'https://api.github.com/repos/huiejorjdsksfn/medi-procure-hub/releases/latest',
        { headers: { 'User-Agent': `ProcurBosse/${APP_VERSION}` } },
        r => {
          let body = '';
          r.on('data', c => body += c);
          r.on('end', () => { try { res(JSON.parse(body)); } catch(e) { rej(e); } });
        }
      );
      req.on('error', rej);
      req.setTimeout(8000, () => req.destroy(new Error('timeout')));
    });

    const latest = (data.tag_name || '').replace(/^v/, '');
    const dlUrl  = data.assets?.find(a => a.name.includes('Setup.exe'))?.browser_download_url;
    if (!latest || !dlUrl) { if (manual) dialog.showMessageBox(win,{type:'info',message:'No update available.',buttons:['OK']}); return; }

    const isNewer = latest.localeCompare(APP_VERSION, undefined, { numeric:true }) > 0;
    if (!isNewer) { if (manual) dialog.showMessageBox(win,{type:'info',message:`v${APP_VERSION} is up to date.`,buttons:['OK']}); return; }

    const { response } = await dialog.showMessageBox(win, {
      type: 'info', title: 'Update Available',
      message: `ProcurBosse v${latest} is available`,
      detail: `Current: v${APP_VERSION}\n\n${(data.body||'').slice(0,400)}`,
      buttons: ['Download', 'Later'],
    });
    if (response === 0) shell.openExternal(dlUrl).catch(() => {});
  } catch(err) {
    if (manual) dialog.showMessageBox(win, { type:'warning', message:'Update check failed', detail: err.message, buttons:['OK'] });
    crashLog(`update check error: ${err.message}`);
  }
}

// ── IPC Handlers (ALL handlers — complete set) ─────────────────────────────
ipcMain.handle('get-app-version',  () => APP_VERSION);
ipcMain.handle('get-platform',     () => `${process.platform}-${process.arch}`);
ipcMain.handle('get-app-path',     () => app.getAppPath());
ipcMain.handle('get-user-data',    () => app.getPath('userData'));
ipcMain.handle('is-packaged',      () => app.isPackaged);
ipcMain.handle('is-win7',          () => IS_WIN7);
ipcMain.handle('navigate',   (_, route)  => navigate(route));
ipcMain.handle('check-updates',    ()    => checkForUpdates(true));

ipcMain.handle('get-system-info',  () => ({
  os:       `${os.type()} ${os.release()}`,
  arch:     process.arch,
  cpu:      os.cpus()[0]?.model || 'Unknown',
  ramTotal: Math.round(os.totalmem() / 1073741824),
  ramFree:  Math.round(os.freemem() / 1073741824),
  appPath:  app.getAppPath(),
  userData: app.getPath('userData'),
  version:  APP_VERSION,
  electron: process.versions.electron,
  isWin7:   IS_WIN7,
  isDev:    IS_DEV,
}));

ipcMain.handle('clear-cache', async () => {
  if (!win) return { ok: false };
  try {
    await win.webContents.session.clearCache();
    await win.webContents.session.clearStorageData({ storages: ['appcache','cookies','shadercache','websql','serviceworkers'] });
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('show-notification', (_, { title, body }) => {
  try {
    if (Notification.isSupported()) {
      new Notification({ title: title || APP_NAME, body: body || '' }).show();
    }
    return { ok: true };
  } catch(e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('print-document', async (_, options = {}) => {
  if (!win) return { ok: false };
  try {
    await new Promise((res, rej) => {
      win.webContents.print({
        silent: false,
        printBackground: true,
        color: true,
        margins: { marginType: 'printableArea' },
        pageSize: options.pageSize || 'A4',
        ...options,
      }, (success, failReason) => {
        if (success) res(true);
        else rej(new Error(failReason || 'print failed'));
      });
    });
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('show-save-dialog', async (_, opts) => {
  if (!win) return null;
  return dialog.showSaveDialog(win, opts);
});

ipcMain.handle('show-open-dialog', async (_, opts) => {
  if (!win) return null;
  return dialog.showOpenDialog(win, opts);
});

ipcMain.handle('write-file', async (_, { filePath, data }) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, data);
    return { ok: true, filePath };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('read-file', async (_, { filePath }) => {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, error: 'File not found' };
    const data = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, data };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

// ── App lifecycle ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
