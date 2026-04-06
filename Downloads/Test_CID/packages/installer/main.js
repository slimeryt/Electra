const { app, BrowserWindow, shell } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

const GITHUB_OWNER = 'slimeryt';
const GITHUB_REPO = 'Electra';
const INSTALL_DIR = path.join(os.homedir(), 'AppData', 'Local', 'Electra');
const EXE_PATH = path.join(INSTALL_DIR, 'Electra.exe');

let win = null;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 300,
    height: 340,
    frame: false,
    transparent: false,
    resizable: false,
    center: true,
    skipTaskbar: false,
    alwaysOnTop: true,
    backgroundColor: '#08080f',
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  win.loadFile(path.join(__dirname, 'installer.html'));
  win.once('ready-to-show', () => {
    win.show();
    setTimeout(runInstall, 600);
  });
});

app.on('window-all-closed', () => app.quit());

// ── Helpers ──────────────────────────────────────────────────────────────────

function send(channel, data) {
  if (!win || win.isDestroyed()) return;
  win.webContents.executeJavaScript(
    `window.dispatchEvent(new CustomEvent('${channel}', { detail: ${JSON.stringify(data)} }))`
  ).catch(() => {});
}

function setStatus(text) { send('installer-status', { text }); }
function setProgress(pct) { send('installer-progress', { pct }); }
function showError(message) { send('installer-error', { message }); }

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: { 'User-Agent': 'Electra-Installer', Accept: 'application/vnd.github+json' },
    }, res => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return fetchJson(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
  });
}

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const doRequest = (u) => {
      const mod = u.startsWith('https') ? https : http;
      mod.get(u, {
        headers: { 'User-Agent': 'Electra-Installer' },
      }, res => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          return doRequest(res.headers.location);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let received = 0;
        const out = fs.createWriteStream(dest);
        res.on('data', chunk => {
          received += chunk.length;
          out.write(chunk);
          if (total > 0 && onProgress) onProgress(received / total);
        });
        res.on('end', () => out.end(() => resolve()));
        res.on('error', reject);
        out.on('error', reject);
      }).on('error', reject);
    };
    doRequest(url);
  });
}

function unzip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    // Use PowerShell's Expand-Archive — available on all modern Windows
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -Force -Path "${zipPath}" -DestinationPath "${destDir}"`,
    ], { windowsHide: true });
    ps.on('close', code => code === 0 ? resolve() : reject(new Error(`unzip failed: ${code}`)));
    ps.on('error', reject);
  });
}

function createShortcut(target, shortcutPath, description) {
  const ps = `
$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut('${shortcutPath}')
$s.TargetPath = '${target}'
$s.Description = '${description}'
$s.Save()
`.trim();
  try {
    execSync(`powershell.exe -NoProfile -NonInteractive -Command "${ps.replace(/\n/g, '; ')}"`, { windowsHide: true });
  } catch {}
}

function findExeInDir(dir) {
  // The zip may extract as Electra-win32-x64/Electra.exe or similar
  if (!fs.existsSync(dir)) return null;
  const top = fs.readdirSync(dir);
  for (const entry of top) {
    const full = path.join(dir, entry);
    if (entry.toLowerCase().endsWith('.exe')) return full;
    if (fs.statSync(full).isDirectory()) {
      const inner = fs.readdirSync(full);
      for (const f of inner) {
        if (f.toLowerCase().endsWith('.exe') && !f.toLowerCase().includes('uninstall')) {
          return path.join(full, f);
        }
      }
    }
  }
  return null;
}

// ── Main install flow ─────────────────────────────────────────────────────────

async function runInstall() {
  try {
    // 1. Fetch latest release from GitHub
    setStatus('Checking for latest version...');
    setProgress(5);
    const release = await fetchJson(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
    );
    const version = release.tag_name || 'unknown';
    send('installer-version', { version });

    // Find the zip asset (portable/win-unpacked zip)
    const zipAsset = release.assets && release.assets.find(a =>
      /\.zip$/i.test(a.name) && /win|electra/i.test(a.name)
    );
    if (!zipAsset) throw new Error('No Windows zip found in latest release.\nPlease upload a win-unpacked .zip to the GitHub release.');

    setStatus(`Downloading Electra ${version}...`);
    setProgress(10);

    // 2. Download zip
    const tmpZip = path.join(os.tmpdir(), `electra-${version}.zip`);
    await downloadFile(zipAsset.browser_download_url, tmpZip, (pct) => {
      setProgress(10 + Math.round(pct * 60)); // 10 → 70
    });

    setStatus('Installing...');
    setProgress(72);

    // 3. Extract
    const tmpExtract = path.join(os.tmpdir(), `electra-extract-${Date.now()}`);
    fs.mkdirSync(tmpExtract, { recursive: true });
    await unzip(tmpZip, tmpExtract);

    setProgress(85);

    // 4. Move to install dir (remove old first)
    if (fs.existsSync(INSTALL_DIR)) {
      fs.rmSync(INSTALL_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(INSTALL_DIR, { recursive: true });

    // Copy extracted contents into INSTALL_DIR
    const extracted = fs.readdirSync(tmpExtract);
    if (extracted.length === 1 && fs.statSync(path.join(tmpExtract, extracted[0])).isDirectory()) {
      // Single top-level folder — move its contents
      const inner = path.join(tmpExtract, extracted[0]);
      for (const f of fs.readdirSync(inner)) {
        fs.renameSync(path.join(inner, f), path.join(INSTALL_DIR, f));
      }
    } else {
      for (const f of extracted) {
        fs.renameSync(path.join(tmpExtract, f), path.join(INSTALL_DIR, f));
      }
    }

    setProgress(90);
    setStatus('Creating shortcuts...');

    // 5. Find the main exe
    let exePath = path.join(INSTALL_DIR, 'Electra.exe');
    if (!fs.existsSync(exePath)) {
      exePath = findExeInDir(INSTALL_DIR) || exePath;
    }

    // 6. Desktop shortcut
    const desktop = path.join(os.homedir(), 'Desktop', 'Electra.lnk');
    createShortcut(exePath, desktop, 'Electra');

    // 7. Start Menu shortcut
    const startMenu = path.join(
      os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Electra.lnk'
    );
    createShortcut(exePath, startMenu, 'Electra');

    // 8. Write uninstall info to registry
    try {
      execSync([
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Electra"',
        '/v DisplayName /t REG_SZ /d "Electra" /f',
      ].join(' '), { windowsHide: true });
      execSync([
        'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Electra"',
        `/v UninstallString /t REG_SZ /d "${exePath}" /f`,
      ].join(' '), { windowsHide: true });
    } catch {}

    // 9. Cleanup
    try { fs.rmSync(tmpZip, { force: true }); } catch {}
    try { fs.rmSync(tmpExtract, { recursive: true, force: true }); } catch {}

    setProgress(100);
    setStatus('Done! Launching Electra...');

    // 10. Launch the installed app
    await new Promise(r => setTimeout(r, 900));
    try { spawn(exePath, [], { detached: true, stdio: 'ignore' }).unref(); } catch {}
    setTimeout(() => app.quit(), 400);

  } catch (err) {
    showError(err.message || String(err));
    console.error(err);
  }
}
