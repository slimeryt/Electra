import fs from 'fs';
import path from 'path';
import os from 'os';
import { safeStorage } from 'electron';

const sessionDir = path.join(os.homedir(), 'Electra', 'Credentials');
const sessionFile = path.join(sessionDir, 'session.store');

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

function ensureDir() {
  fs.mkdirSync(sessionDir, { recursive: true });
}

export function saveSessionTokens(accessToken: string, refreshToken: string): void {
  ensureDir();
  const payload = JSON.stringify({ accessToken, refreshToken });
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(sessionFile, safeStorage.encryptString(payload));
  } else {
    fs.writeFileSync(sessionFile, payload, 'utf8');
  }
}

export function loadSessionTokens(): SessionTokens | null {
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

export function clearSessionTokens(): void {
  try {
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
  } catch {
    /* ignore */
  }
}
