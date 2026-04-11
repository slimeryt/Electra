/**
 * Generates PWA + Android launcher assets from repo-root App_Icon.jpg (or public/app-icon.jpg).
 * Run: node scripts/gen-pwa-icons.mjs
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(__dirname, '..');
const repoRoot = join(frontendRoot, '..', '..');

const candidates = [
  join(repoRoot, 'App_Icon.jpg'),
  join(repoRoot, 'App_Icon.JPG'),
  join(repoRoot, 'app_icon.jpg'),
  join(frontendRoot, 'public', 'app-icon.jpg'),
];

const source = candidates.find((p) => existsSync(p));
if (!source) {
  console.error(
    'Icon source not found. Add App_Icon.jpg at the repo root (next to package.json workspaces) or public/app-icon.jpg',
  );
  process.exit(1);
}

async function squarePng(buf, size) {
  return sharp(buf)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
}

const sourceBuf = await sharp(source).toBuffer();

const publicIcons = join(frontendRoot, 'public', 'icons');
mkdirSync(publicIcons, { recursive: true });

const pwaSizes = [
  ['icon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];
for (const [name, size] of pwaSizes) {
  writeFileSync(join(publicIcons, name), await squarePng(sourceBuf, size));
  console.log('wrote', join('public/icons', name));
}

const androidRes = join(frontendRoot, 'android', 'app', 'src', 'main', 'res');
const legacy = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const foreground = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

for (const [folder, size] of Object.entries(legacy)) {
  const dir = join(androidRes, `mipmap-${folder}`);
  mkdirSync(dir, { recursive: true });
  const png = await squarePng(sourceBuf, size);
  writeFileSync(join(dir, 'ic_launcher.png'), png);
  writeFileSync(join(dir, 'ic_launcher_round.png'), png);
  console.log(`wrote android mipmap-${folder}/ic_launcher.png`);
}

for (const [folder, size] of Object.entries(foreground)) {
  const dir = join(androidRes, `mipmap-${folder}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), await squarePng(sourceBuf, size));
  console.log(`wrote android mipmap-${folder}/ic_launcher_foreground.png`);
}

console.log('source:', source);
