const { app, BrowserWindow } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const GITHUB_OWNER = 'slimeryt';
const GITHUB_REPO = 'Electra';

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
      mod.get(u, { headers: { 'User-Agent': 'Electra-Installer' } }, res => {
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

    // Find the NSIS setup exe asset
    const exeAsset = release.assets && release.assets.find(a =>
      /ElectraSetup\.exe$/i.test(a.name)
    );
    if (!exeAsset) throw new Error('No installer found in latest release.\nExpected: ElectraSetup.exe');

    setStatus(`Downloading Electra ${version}...`);
    setProgress(10);

    // 2. Download the setup exe to temp
    const tmpExe = path.join(os.tmpdir(), `ElectraSetup-${version}.exe`);
    await downloadFile(exeAsset.browser_download_url, tmpExe, (pct) => {
      setProgress(10 + Math.round(pct * 80)); // 10 → 90
    });

    setStatus('Installing...');
    setProgress(92);

    // 3. Run the NSIS installer silently
    await new Promise((resolve, reject) => {
      const proc = spawn(tmpExe, ['/S'], { windowsHide: true, detached: false });
      proc.on('close', code => {
        if (code === 0 || code === null) resolve();
        else reject(new Error(`Installer exited with code ${code}`));
      });
      proc.on('error', reject);
    });

    // 4. Cleanup
    try { fs.rmSync(tmpExe, { force: true }); } catch {}

    setProgress(100);
    setStatus('Done! Launching Electra...');

    // 5. Launch the installed app
    await new Promise(r => setTimeout(r, 900));
    const installPath = path.join(
      process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
      'Programs', 'electra', 'Electra.exe'
    );
    try { spawn(installPath, [], { detached: true, stdio: 'ignore' }).unref(); } catch {}
    setTimeout(() => app.quit(), 400);

  } catch (err) {
    showError(err.message || String(err));
    console.error(err);
  }
}
