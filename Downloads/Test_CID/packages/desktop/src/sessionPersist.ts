import fs from 'fs';
import path from 'path';
import os from 'os';
import { safeStorage } from 'electron';

/** OS app data (outside ~/Electra/Data) so sessions survive clearing that folder or certain updates. */
function getPrimarySessionFile(): string {
  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(roaming, 'Electra', 'session.store');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'Electra', 'session.store');
  }
  const cfg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(cfg, 'electra', 'session.store');
}

/** Legacy path (same tree as custom userData); still read for migration. */
function getLegacySessionFile(): string {
  return path.join(os.homedir(), 'Electra', 'Credentials', 'session.store');
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

function ensureDirFor(file: string) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function readTokensFromFile(sessionFile: string): SessionTokens | null {
  try {
    if (!fs.existsSync(sessionFile)) return null;
    const raw = fs.readFileSync(sessionFile);
    const text =
      raw.length > 0 && raw[0] === 0x7b
        ? raw.toString('utf8')
        : safeStorage.isEncryptionAvailable()
          ? safeStorage.decryptString(raw)
          : raw.toString('utf8');
    const data = JSON.parse(text) as SessionTokens;
    if (!data?.accessToken || !data?.refreshToken) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSessionTokens(accessToken: string, refreshToken: string): void {
  const primary = getPrimarySessionFile();
  ensureDirFor(primary);
  const payload = JSON.stringify({ accessToken, refreshToken });
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(primary, safeStorage.encryptString(payload));
  } else {
    fs.writeFileSync(primary, payload, 'utf8');
  }
  const legacy = getLegacySessionFile();
  try {
    if (fs.existsSync(legacy)) fs.unlinkSync(legacy);
  } catch {
    /* ignore */
  }
}

export function loadSessionTokens(): SessionTokens | null {
  const primary = readTokensFromFile(getPrimarySessionFile());
  if (primary) return primary;
  const legacy = readTokensFromFile(getLegacySessionFile());
  if (legacy) {
    try {
      saveSessionTokens(legacy.accessToken, legacy.refreshToken);
    } catch {
      /* still return legacy tokens for this load */
    }
    return legacy;
  }
  return null;
}

export function clearSessionTokens(): void {
  for (const f of [getPrimarySessionFile(), getLegacySessionFile()]) {
    try {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    } catch {
      /* ignore */
    }
  }
}
