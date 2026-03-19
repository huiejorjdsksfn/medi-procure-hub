/**
 * ProcurBosse — Electron Main Process
 * EL5 MediProcure Hospital ERP — Embu Level 5 Hospital
 * Compatible: Windows 7 SP1 → Windows 11 (x64 + ia32)
 *
 * Architecture:
 *  - Loads built React/Vite dist from app.asar
 *  - All data via Supabase (live cloud DB)
 *  - Auto-updates via GitHub Releases (electron-updater)
 *  - Secure preload bridge for native file/dialog APIs
 */

'use strict';

const { app, BrowserWindow, Menu, shell, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs   = require('fs');

// ── Constants ────────────────────────────────────────────────
const APP_NAME    = 'ProcurBosse';
const APP_VERSION = app.getVersion();
const IS_DEV      = process.env.ELECTRON_DEV === '1' || !app.isPackaged;
const IS_WIN7     = process.platform === 'win32' && parseInt(require('os').release()) < 10;

// ── Paths ─────────────────────────────────────────────────────
const DIST_PATH   = IS_DEV
  ? path.join(__dirname, '../dist')
  : path.join(process.resourcesPath, 'app.asar', 'dist');
const INDEX_HTML  = path.join(DIST_PATH, 'index.html');
const ICON_PATH   = IS_DEV
  ? path.join(__dirname, '../public/icon.png')
  : path.join(process.resourcesPath, 'icon.png');

// ── Single instance lock ──────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }

// ── Windows 7 compatibility flags ────────────────────────────
if (process.platform === 'win32') {
  // Disable GPU acceleration on Win7 (avoids d3d crashes)
  if (IS_WIN7) {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    app.commandLine.appendSwitch('disable-gpu-sandbox');
  }
  // SwiftShader for software rendering fallback
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
  app.commandLine.appendSwitch('use-angle', 'swiftshader');
}

// ── Main window ───────────────────────────────────────────────
let win = null;

function getIcon() {
  try {
    if (fs.existsSync(ICON_PATH)) return nativeImage.createFromPath(ICON_PATH);
  } catch { /* silent */ }
  return undefined;
}

function createWindow() {
  const icon = getIcon();

  win = new BrowserWindow({
    width:          1366,
    height:         768,
    minWidth:       1024,
    minHeight:      640,
    title:          `${APP_NAME} — EL5 MediProcure`,
    icon,
    show:           false,
    backgroundColor: '#0a2558',
    webPreferences: {
      nodeIntegration:            false,
      contextIsolation:           true,
      webSecurity:                true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
      // Windows 7 compatibility
      enableRemoteModule:         false,
      sandbox:                    false,
    },
  });

  // Load app
  if (IS_DEV) {
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(INDEX_HTML);
  }

  // Show after paint (no white flash)
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    // Check for updates after 3s (don't block startup)
    setTimeout(checkForUpdates, 3000);
  });

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Navigation guard — only allow local app routes
  win.webContents.on('will-navigate', (event, url) => {
    const allowed = [
      'http://localhost:8080',
      `file://${DIST_PATH}`,
      'https://yvjfehnzbzjliizjvuhq.supabase.co',
    ];
    if (!allowed.some(a => url.startsWith(a))) {
      event.preventDefault();
    }
  });

  win.on('closed', () => { win = null; });

  buildMenu();
}

// ── Application menu ──────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: APP_NAME,
      submenu: [
        {
          label: `Version ${APP_VERSION}`,
          enabled: false,
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => win && win.reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => win && win.webContents.reloadIgnoringCache(),
        },
        {
          label: 'Clear Cache & Reload',
          click: async () => {
            if (!win) return;
            await win.webContents.session.clearCache();
            win.webContents.reloadIgnoringCache();
            dialog.showMessageBox(win, { type: 'info', message: 'Cache cleared', buttons: ['OK'] });
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => checkForUpdates(true),
        },
        { type: 'separator' },
        {
          label: 'Quit ProcurBosse',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
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
        { label: 'Mail',            accelerator: 'CmdOrCtrl+7', click: () => navigate('/email') },
        { type: 'separator' },
        { label: 'Suppliers',     click: () => navigate('/suppliers') },
        { label: 'Contracts',     click: () => navigate('/contracts') },
        { label: 'Tenders',       click: () => navigate('/tenders') },
        { label: 'Vouchers',      click: () => navigate('/vouchers/payment') },
        { label: 'Financials',    click: () => navigate('/financials/dashboard') },
        { label: 'Quality',       click: () => navigate('/quality/dashboard') },
        { type: 'separator' },
        { label: 'Admin Panel',   click: () => navigate('/admin/panel') },
        { label: 'Settings',      click: () => navigate('/settings') },
        { label: 'Database',      click: () => navigate('/admin/database') },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => {
            if (!win) return;
            const z = win.webContents.getZoomLevel();
            win.webContents.setZoomLevel(Math.min(z + 0.5, 3));
          },
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (!win) return;
            const z = win.webContents.getZoomLevel();
            win.webContents.setZoomLevel(Math.max(z - 0.5, -3));
          },
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => win && win.webContents.setZoomLevel(0),
        },
        { type: 'separator' },
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => win && win.setFullScreen(!win.isFullScreen()),
        },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => win && win.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About ProcurBosse',
          click: () => showAbout(),
        },
        {
          label: 'System Information',
          click: () => showSysInfo(),
        },
        { type: 'separator' },
        {
          label: 'Open Log File',
          click: () => {
            const logPath = path.join(app.getPath('userData'), 'main.log');
            if (fs.existsSync(logPath)) shell.openPath(logPath);
            else dialog.showMessageBox(win, { type: 'info', message: 'No log file found.', buttons: ['OK'] });
          },
        },
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(app.getPath('userData')),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ── Navigation helper ─────────────────────────────────────────
function navigate(route) {
  if (!win) return;
  win.webContents.executeJavaScript(`
    (function() {
      const evt = new PopStateEvent('popstate', { state: {} });
      window.history.pushState({}, '', '${route}');
      window.dispatchEvent(evt);
      // Also dispatch a custom nav event that React Router picks up
      window.dispatchEvent(new CustomEvent('electron-navigate', { detail: '${route}' }));
    })();
  `).catch(() => {
    // Fallback: reload with hash
    const base = IS_DEV ? 'http://localhost:8080' : `file://${INDEX_HTML}`;
    win.loadURL(`${base}#${route}`);
  });
}

// ── About dialog ──────────────────────────────────────────────
function showAbout() {
  if (!win) return;
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'About ProcurBosse',
    icon: getIcon() || undefined,
    message: 'ProcurBosse — EL5 MediProcure',
    detail: [
      `Version: ${APP_VERSION}`,
      `Electron: ${process.versions.electron}`,
      `Chrome: ${process.versions.chrome}`,
      `Node.js: ${process.versions.node}`,
      `Platform: ${process.platform} ${process.arch}`,
      '',
      'Embu Level 5 Hospital',
      'Procurement & ERP Management System',
      'Embu County Government',
      '',
      `© ${new Date().getFullYear()} Embu County Government`,
    ].join('\n'),
    buttons: ['Close', 'Check for Updates'],
    defaultId: 0,
  }).then(result => {
    if (result.response === 1) checkForUpdates(true);
  });
}

function showSysInfo() {
  if (!win) return;
  const os = require('os');
  dialog.showMessageBox(win, {
    type: 'info',
    title: 'System Information',
    message: 'ProcurBosse System Info',
    detail: [
      `OS: ${os.type()} ${os.release()} ${os.arch()}`,
      `CPU: ${os.cpus()[0]?.model || 'Unknown'}`,
      `RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB total / ${Math.round(os.freemem() / 1024 / 1024 / 1024)}GB free`,
      `App Path: ${app.getAppPath()}`,
      `Data Path: ${app.getPath('userData')}`,
      `Supabase: yvjfehnzbzjliizjvuhq.supabase.co`,
    ].join('\n'),
    buttons: ['Close'],
  });
}

// ── Auto-update (GitHub Releases) ─────────────────────────────
async function checkForUpdates(manual = false) {
  if (IS_DEV) {
    if (manual) dialog.showMessageBox(win, { type: 'info', message: 'Updates disabled in dev mode', buttons: ['OK'] });
    return;
  }

  try {
    const https = require('https');
    const latestUrl = 'https://api.github.com/repos/huiejorjdsksfn/medi-procure-hub/releases/latest';

    const data = await new Promise((resolve, reject) => {
      const req = https.get(latestUrl, {
        headers: { 'User-Agent': `ProcurBosse/${APP_VERSION}` }
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('Parse failed')); }
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => req.destroy());
    });

    const latestTag   = (data.tag_name || '').replace(/^v/, '');
    const downloadUrl = data.assets?.find(a => a.name.includes('Setup.exe'))?.browser_download_url;

    if (!latestTag || !downloadUrl) {
      if (manual) dialog.showMessageBox(win, { type: 'info', message: 'No update available.', buttons: ['OK'] });
      return;
    }

    // Simple semver comparison
    const isNewer = latestTag.localeCompare(APP_VERSION, undefined, { numeric: true }) > 0;

    if (!isNewer) {
      if (manual) dialog.showMessageBox(win, { type: 'info', message: `You are on the latest version (${APP_VERSION}).`, buttons: ['OK'] });
      return;
    }

    // Notify user
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Available',
      message: `ProcurBosse ${latestTag} is available`,
      detail: `You are running v${APP_VERSION}.\n\nRelease notes:\n${(data.body || '').slice(0, 300)}`,
      buttons: ['Download Update', 'Later'],
      defaultId: 0,
    });

    if (response === 0) shell.openExternal(downloadUrl);

  } catch (err) {
    if (manual) {
      dialog.showMessageBox(win, {
        type: 'warning',
        message: 'Could not check for updates',
        detail: err.message,
        buttons: ['OK'],
      });
    }
  }
}

// ── IPC handlers ──────────────────────────────────────────────
ipcMain.handle('get-app-version',  () => APP_VERSION);
ipcMain.handle('get-platform',     () => process.platform);
ipcMain.handle('get-app-path',     () => app.getAppPath());
ipcMain.handle('get-user-data',    () => app.getPath('userData'));
ipcMain.handle('is-packaged',      () => app.isPackaged);
ipcMain.handle('is-win7',          () => IS_WIN7);

ipcMain.handle('show-save-dialog', async (_, opts) => {
  if (!win) return null;
  return dialog.showSaveDialog(win, opts);
});

ipcMain.handle('show-open-dialog', async (_, opts) => {
  if (!win) return null;
  return dialog.showOpenDialog(win, opts);
});

ipcMain.handle('check-updates', () => checkForUpdates(true));

ipcMain.handle('navigate', (_, route) => navigate(route));

ipcMain.handle('write-file', async (_, { filePath, data }) => {
  try {
    fs.writeFileSync(filePath, data);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ── App lifecycle ─────────────────────────────────────────────
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

// Crash reporter
process.on('uncaughtException', err => {
  const log = path.join(app.getPath('userData'), 'crash.log');
  fs.appendFileSync(log, `[${new Date().toISOString()}] ${err.stack}\n`);
});
