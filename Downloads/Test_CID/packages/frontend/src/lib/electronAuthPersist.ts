import { bridge, isElectron } from '../env';

export async function persistAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (!isElectron || !bridge?.saveAuthSession) return;
  await bridge.saveAuthSession({ accessToken, refreshToken });
}

export async function clearPersistedAuth(): Promise<void> {
  if (!isElectron || !bridge?.clearAuthSession) return;
  await bridge.clearAuthSession();
}

/** Always restore tokens from disk on startup.
 *  Electron can clear localStorage across updates (Chromium version bumps change
 *  the storage origin/partition). The session file in AppData survives updates,
 *  so we unconditionally hydrate from it — the axios interceptor will silently
 *  refresh an expired access token on the first API call. */
export async function hydrateAuthFromDisk(): Promise<void> {
  if (!isElectron || !bridge?.loadAuthSession) return;
  try {
    const t = await bridge.loadAuthSession();
    if (!t?.accessToken || !t?.refreshToken) return;
    localStorage.setItem('accessToken', t.accessToken);
    localStorage.setItem('refreshToken', t.refreshToken);
  } catch {
    /* ignore */
  }
}
