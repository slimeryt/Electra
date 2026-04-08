const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

// Skip code-sign tooling on Windows dev builds (avoids winCodeSign 7z symlink errors without admin/Developer Mode).
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
const root = path.resolve(__dirname, '..', '..');

// Ensure app-builder.exe is in the nested builder-util location electron-builder expects
const abSrc = path.join(root, 'node_modules', 'app-builder-bin', 'win', 'x64', 'app-builder.exe');
const abDest = path.join(root, 'node_modules', 'builder-util', 'node_modules', 'app-builder-bin', 'win', 'x64');
if (fs.existsSync(abSrc) && !fs.existsSync(path.join(abDest, 'app-builder.exe'))) {
  fs.mkdirSync(abDest, { recursive: true });
  fs.copyFileSync(abSrc, path.join(abDest, 'app-builder.exe'));
  const pkgSrc = path.join(root, 'node_modules', 'app-builder-bin', 'package.json');
  if (fs.existsSync(pkgSrc)) fs.copyFileSync(pkgSrc, path.join(root, 'node_modules', 'builder-util', 'node_modules', 'app-builder-bin', 'package.json'));
}

// Step 1: run tsc before electron-builder touches node_modules
// Note: electron-builder's "installing production dependencies" step wipes devDependencies
// (including TypeScript) from root node_modules. Re-install if missing.
const tsc = path.join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');
if (!fs.existsSync(tsc)) {
  console.log('[build] TypeScript missing (wiped by previous build) — running npm install...');
  execSync('npm install', { cwd: root, stdio: 'inherit' });
}
try {
  execSync(`node "${tsc}" -p tsconfig.json`, { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
  process.exit(1);
}

// Step 2: fix npm dedup — app-builder.exe's dep scanner fails when a package has
// a nested node_modules/ dir but some of its deps are deduped to root. It does a
// scandir on the nested path without falling back up the tree.
// Fix: for every package with a nested node_modules/, junction missing deps from root.
const rootNm = path.join(root, 'node_modules');

// For each nested node_modules dir, ensure every dep needed by its packages
// is present at that same level (junction from root if missing).
// This is the correct fix for app-builder.exe's flat scandir approach.
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
      const src = path.join(rootNm, dep);
      if (!fs.existsSync(dst) && fs.existsSync(src)) {
        try { fs.symlinkSync(src, dst, 'junction'); } catch {}
      }
    }
  }
}
// Walk only one level deep from root — no recursion into junctions
for (const pkg of fs.readdirSync(rootNm)) {
  try {
    const pkgPath = path.join(rootNm, pkg);
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

// Step 3: patch fs.chmod — Node.js v24 on Windows throws ENOENT from chmod
const origChmod = fs.chmod.bind(fs);
const origChmodSync = fs.chmodSync.bind(fs);
fs.chmod = function(p, mode, cb) {
  if (process.platform === 'win32') return cb ? cb(null) : Promise.resolve();
  return origChmod(p, mode, cb);
};
fs.chmodSync = function(p, mode) {
  if (process.platform === 'win32') return;
  return origChmodSync(p, mode);
};
const fsp = require('fs/promises');
const origChmodP = fsp.chmod.bind(fsp);
fsp.chmod = function(p, mode) {
  if (process.platform === 'win32') return Promise.resolve();
  return origChmodP(p, mode);
};

// Step 4: run electron-builder
const ebCli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');
require(ebCli);
