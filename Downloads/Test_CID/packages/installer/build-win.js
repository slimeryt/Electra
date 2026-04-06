const path = require('path');
const fs = require('fs');
const nm = path.join(__dirname, 'node_modules');

// ── Patch fs.chmod — Node.js v24 on Windows throws ENOENT from chmod ────────
const origChmod = fs.chmod.bind(fs);
const origChmodSync = fs.chmodSync.bind(fs);
fs.chmod = function (p, mode, cb) {
  if (process.platform === 'win32') return cb ? cb(null) : Promise.resolve();
  return origChmod(p, mode, cb);
};
fs.chmodSync = function (p, mode) {
  if (process.platform === 'win32') return;
  return origChmodSync(p, mode);
};
const fsp = require('fs/promises');
const origChmodP = fsp.chmod.bind(fsp);
fsp.chmod = function (p, mode) {
  if (process.platform === 'win32') return Promise.resolve();
  return origChmodP(p, mode);
};

// ── Ensure app-builder.exe is where builder-util expects it ──────────────────
const abSrc = path.join(nm, 'app-builder-bin', 'win', 'x64', 'app-builder.exe');
const abDest = path.join(nm, 'builder-util', 'node_modules', 'app-builder-bin', 'win', 'x64');
if (fs.existsSync(abSrc) && !fs.existsSync(path.join(abDest, 'app-builder.exe'))) {
  fs.mkdirSync(abDest, { recursive: true });
  fs.copyFileSync(abSrc, path.join(abDest, 'app-builder.exe'));
  const pkgSrc = path.join(nm, 'app-builder-bin', 'package.json');
  if (fs.existsSync(pkgSrc))
    fs.copyFileSync(pkgSrc, path.join(abDest, '..', 'package.json'));
}

// ── Fill sideways dep gaps for app-builder.exe's flat scandir ───────────────
function fillNm(nmDir) {
  if (!fs.existsSync(nmDir)) return;
  let pkgs = [];
  try { pkgs = fs.readdirSync(nmDir); } catch { return; }
  for (const pkg of pkgs) {
    const pkgJson = path.join(nmDir, pkg, 'package.json');
    let deps = {};
    try {
      const p = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
      Object.assign(deps, p.dependencies, p.peerDependencies);
    } catch { continue; }
    for (const dep of Object.keys(deps)) {
      const dst = path.join(nmDir, dep);
      const src = path.join(nm, dep);
      if (!fs.existsSync(dst) && fs.existsSync(src)) {
        try { fs.symlinkSync(src, dst, 'junction'); } catch {}
      }
    }
  }
}

for (const pkg of fs.readdirSync(nm)) {
  try {
    const pkgPath = path.join(nm, pkg);
    if (fs.lstatSync(pkgPath).isSymbolicLink()) continue;
    if (pkg.startsWith('@')) {
      for (const sub of fs.readdirSync(pkgPath)) {
        fillNm(path.join(pkgPath, sub, 'node_modules'));
      }
    } else {
      fillNm(path.join(pkgPath, 'node_modules'));
    }
  } catch {}
}

// ── Run electron-builder ─────────────────────────────────────────────────────
const ebCli = path.join(nm, 'electron-builder', 'out', 'cli', 'cli.js');
require(ebCli);
