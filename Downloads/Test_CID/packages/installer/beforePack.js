const path = require('path');
const fs = require('fs');

exports.default = async function (context) {
  const nm = path.join(__dirname, 'node_modules');
  const abSrc = path.join(nm, 'app-builder-bin', 'win', 'x64', 'app-builder.exe');
  const abDestDir = path.join(nm, 'builder-util', 'node_modules', 'app-builder-bin', 'win', 'x64');

  if (fs.existsSync(abSrc)) {
    fs.mkdirSync(abDestDir, { recursive: true });
    fs.copyFileSync(abSrc, path.join(abDestDir, 'app-builder.exe'));
    const pkgSrc = path.join(nm, 'app-builder-bin', 'package.json');
    if (fs.existsSync(pkgSrc))
      fs.copyFileSync(pkgSrc, path.join(abDestDir, '..', 'package.json'));
  }

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
};
