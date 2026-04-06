const path = require('path');
const fs = require('fs');

exports.default = async function () {
  const root = path.resolve(__dirname, '..', '..', '..');
  const nm = path.join(root, 'node_modules');

  // ── Copy app-builder.exe ──────────────────────────────────────────────────
  const abSrc = path.join(nm, 'app-builder-bin', 'win', 'x64', 'app-builder.exe');
  const abDestDir = path.join(nm, 'builder-util', 'node_modules', 'app-builder-bin', 'win', 'x64');
  const abDest = path.join(abDestDir, 'app-builder.exe');
  if (fs.existsSync(abSrc)) {
    fs.mkdirSync(abDestDir, { recursive: true });
    fs.copyFileSync(abSrc, abDest);
    const pkgSrc = path.join(nm, 'app-builder-bin', 'package.json');
    if (fs.existsSync(pkgSrc)) {
      fs.copyFileSync(pkgSrc, path.join(nm, 'builder-util', 'node_modules', 'app-builder-bin', 'package.json'));
    }
    console.log('[beforePack] Copied app-builder.exe to builder-util nested path');
  }

  // ── Fix deduped deps that app-builder.exe scanner requires ───────────────
  // app-builder.exe scans every nested node_modules dir it finds.
  // When a dep is deduped to root the nested entry is missing → ENOENT crash.
  // Fix: for each root package that has a nested node_modules, junction any
  // missing deps from root. Only 1 level deep to avoid circular symlink loops.
  // Fill missing deps in a node_modules dir by junctioning from root.
  // depth: how many more levels we're allowed to recurse (avoids circular symlink loops)
  function fixNestedNm(nmDir, depth) {
    if (!fs.existsSync(nmDir) || depth < 0) return;

    // Collect all deps declared by the parent package
    const pkgJson = path.join(nmDir, '..', 'package.json');
    let allDeps = {};
    if (fs.existsSync(pkgJson)) {
      try {
        const p = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
        Object.assign(allDeps, p.dependencies, p.peerDependencies, p.optionalDependencies);
      } catch {}
    }

    for (const dep of Object.keys(allDeps)) {
      const dst = path.join(nmDir, dep);
      const src = path.join(nm, dep);
      if (!fs.existsSync(dst) && fs.existsSync(src)) {
        try { fs.symlinkSync(src, dst, 'junction'); } catch {}
      }
    }

    // Recurse into packages that already have their own node_modules
    if (depth > 0) {
      let entries = [];
      try { entries = fs.readdirSync(nmDir); } catch {}
      for (const entry of entries) {
        // Skip junction targets to avoid circular loops
        const entryPath = path.join(nmDir, entry);
        try {
          const stat = fs.lstatSync(entryPath);
          if (stat.isSymbolicLink()) continue; // already a junction we created — skip
        } catch { continue; }
        fixNestedNm(path.join(entryPath, 'node_modules'), depth - 1);
      }
    }
  }

  // Walk root-level packages with depth=2 (enough for conf → ajv-formats → fast-deep-equal)
  for (const pkg of fs.readdirSync(nm)) {
    try {
      if (pkg.startsWith('@')) {
        for (const sub of fs.readdirSync(path.join(nm, pkg))) {
          fixNestedNm(path.join(nm, pkg, sub, 'node_modules'), 2);
        }
      } else {
        fixNestedNm(path.join(nm, pkg, 'node_modules'), 2);
      }
    } catch {}
  }
  console.log('[beforePack] Filled nested node_modules gaps');
};
