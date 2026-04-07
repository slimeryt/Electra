import { app, BrowserWindow, shell, session, Menu, protocol, Tray, nativeImage, dialog, desktopCapturer } from 'electron';
import path from 'path';
import os from 'os';
import zlib from 'zlib';
import { autoUpdater } from 'electron-updater';
import { registerIpcHandlers } from './ipc/handlers';

// @ts-ignore
import Store from 'electron-store';

// ─── User data paths ─────────────────────────────────────────────────────────
// Store all user data in C:\Users\<username>\Electra\Data (visible, not hidden in AppData)
const userDataPath = path.join(os.homedir(), 'Electra', 'Data');
app.setPath('userData', userDataPath);
app.setPath('logs', path.join(os.homedir(), 'Electra', 'Logs'));

interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
}

const store = new Store<{ windowState: WindowState }>();
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Register app:// as a secure privileged scheme so crossorigin ES modules load correctly.
// Must be called before app is ready.
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } },
  ]);
}

// ─── Auto-updater ────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    // Notify splash if it's still open, otherwise notify main window
    const win = splashWindow ?? mainWindow;
    if (win && !win.isDestroyed()) {
      win.webContents.executeJavaScript(`
        try { document.getElementById('status').textContent = 'Downloading update v${info.version}...'; } catch {}
      `).catch(() => {});
    }
  });

  autoUpdater.on('update-downloaded', () => {
    // If the main window is visible, prompt to restart
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update ready',
        message: 'A new version of Electra has been downloaded.',
        detail: 'Restart now to apply the update.',
        buttons: ['Restart', 'Later'],
        defaultId: 0,
      }).then(({ response }) => {
        if (response === 0) {
          isQuitting = true;
          autoUpdater.quitAndInstall();
        }
      });
    } else {
      // No window visible — just install on next quit
    }
  });

  autoUpdater.on('error', () => {
    // Silently ignore update errors — don't crash the app
  });

  // Check for updates (only in packaged app)
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(() => {});
  }
}

// Deep link protocol
const PROTOCOL = 'electra';
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Windows: single instance lock
const gotLock = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    showMainWindow();
    const url = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (url && mainWindow) mainWindow.webContents.send('deep-link', url);
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getWindowState(): WindowState {
  return store.get('windowState', { width: 1280, height: 800 });
}

function saveWindowState(win: BrowserWindow) {
  if (!win.isMaximized() && !win.isMinimized()) {
    const bounds = win.getBounds();
    store.set('windowState', { ...bounds, isMaximized: false });
  } else {
    store.set('windowState', { ...getWindowState(), isMaximized: win.isMaximized() });
  }
}

function showMainWindow() {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

/** Generate a minimal valid PNG buffer — used for the tray icon. */
function makeSolidPNG(w: number, h: number, r: number, g: number, b: number): Buffer {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return ((c ^ 0xffffffff) >>> 0);
  };
  const chunk = (type: string, data: Buffer) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
    const crcBuf = Buffer.allocUnsafe(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, crcBuf]);
  };
  const rows = Buffer.allocUnsafe((1 + w * 3) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (1 + w * 3);
    rows[o] = 0;
    for (let x = 0; x < w; x++) { rows[o+1+x*3]=r; rows[o+2+x*3]=g; rows[o+3+x*3]=b; }
  }
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Tray ────────────────────────────────────────────────────────────────────

function createTray() {
  const iconBuf = makeSolidPNG(16, 16, 88, 101, 242);
  const icon = nativeImage.createFromBuffer(iconBuf);
  tray = new Tray(icon);
  tray.setToolTip('Electra');

  const menu = Menu.buildFromTemplate([
    { label: 'Open Electra', click: showMainWindow },
    { type: 'separator' },
    {
      label: 'Quit Electra', click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', showMainWindow);
}

// ─── Splash ──────────────────────────────────────────────────────────────────

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 340,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#1a1a2e',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const splashPath = app.isPackaged
    ? path.join(process.resourcesPath, 'splash.html')
    : path.join(__dirname, 'splash.html');

  splashWindow.loadFile(splashPath);
  splashWindow.on('closed', () => { splashWindow = null; });
}

// ─── Main window ─────────────────────────────────────────────────────────────

function createMainWindow() {
  const windowState = getWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 940,
    minHeight: 560,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0f0f0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  registerIpcHandlers(mainWindow);

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximize-change', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximize-change', false));

  // Intercept close — hide to tray instead of quitting (unless isQuitting)
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow!.hide();
      return;
    }
    saveWindowState(mainWindow!);
  });

  // Swap splash → main window when ready
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.executeJavaScript(`
        document.getElementById('progress').style.width = '100%';
        document.getElementById('status').textContent = 'Ready!';
      `).catch(() => {});
    }
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      mainWindow!.show();
      if (windowState.isMaximized) mainWindow!.maximize();
    }, 400);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // ── Load the app ──
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Use app:// protocol — avoids crossorigin ES module issues with file://
    mainWindow.loadURL('app:///index.html');
  }

  // ── Single onHeadersReceived handler: CSP + CORS in one pass ──
  // NOTE: Electron only allows one onHeadersReceived listener per session.
  // A second call silently replaces the first, so everything must be merged here.
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers: Record<string, string[]> = { ...details.responseHeaders };

    // Inject CSP for app:// pages
    if (!isDev) {
      headers['Content-Security-Policy'] = [
        "default-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob: mediastream:; connect-src 'self' http://localhost:* https://* ws://localhost:* wss://*",
      ];
    } else {
      headers['Content-Security-Policy'] = [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' ws://localhost:* http://localhost:*; img-src 'self' data: blob: http://localhost:*; media-src 'self' blob: mediastream:",
      ];
    }

    // Inject CORS headers for backend API responses
    if (!isDev && details.url.startsWith('http://localhost:3001/')) {
      headers['Access-Control-Allow-Origin'] = ['*'];
      headers['Access-Control-Allow-Credentials'] = ['true'];
      headers['Access-Control-Allow-Methods'] = ['GET,POST,PUT,PATCH,DELETE,OPTIONS'];
      headers['Access-Control-Allow-Headers'] = ['Content-Type,Authorization'];
    }

    callback({ responseHeaders: headers });
  });

  // ── Grant media/camera/microphone/screen permissions automatically ──
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['media', 'display-capture', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'openExternal', 'clipboard-read', 'clipboard-sanitized-write'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((_wc, permission) => {
    const allowed = ['media', 'display-capture', 'mediaKeySystem', 'fullscreen'];
    return allowed.includes(permission);
  });

  // Required in Electron 22+ — without this, getDisplayMedia() is silently rejected
  // even if setPermissionRequestHandler grants 'display-capture'.
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      // Return the first screen source; the renderer's getDisplayMedia constraints
      // (frameRate, width, height) are applied by Electron automatically.
      callback({ video: sources[0], audio: 'loopback' });
    } catch {
      callback({});
    }
  });
}

// ─── App lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // Register app:// → resources/frontend file server
  if (!isDev) {
    protocol.registerFileProtocol('app', (request, callback) => {
      let urlPath = new URL(request.url).pathname;
      if (!urlPath || urlPath === '/') urlPath = '/index.html';
      const frontendDir = app.isPackaged
        ? path.join(process.resourcesPath, 'frontend')
        : path.join(__dirname, '../../frontend/dist');
      callback({ path: path.join(frontendDir, decodeURIComponent(urlPath)) });
    });

    createSplashWindow();
    createTray();
  }

  createMainWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else showMainWindow();
  });

  app.on('open-url', (_event, url) => {
    if (mainWindow) mainWindow.webContents.send('deep-link', url);
  });
});

app.on('before-quit', () => { isQuitting = true; });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit — we're hiding to tray
  }
});
