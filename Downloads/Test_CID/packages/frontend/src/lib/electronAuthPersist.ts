import { bridge, isElectron } from '../env';

export async function persistAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  if (!isElectron || !bridge?.saveAuthSession) return;
  await bridge.saveAuthSession({ accessToken, refreshToken });
}

export async function clearPersistedAuth(): Promise<void> {
  if (!isElectron || !bridge?.clearAuthSession) return;
  await bridge.clearAuthSession();
}

/** Restore tokens from disk when localStorage is missing either token (updates / profile reset). */
export async function hydrateAuthFromDisk(): Promise<void> {
  if (!isElectron || !bridge?.loadAuthSession) return;
  try {
    const t = await bridge.loadAuthSession();
    if (!t?.accessToken || !t?.refreshToken) return;
    const hasAccess = !!localStorage.getItem('accessToken');
    const hasRefresh = !!localStorage.getItem('refreshToken');
    if (!hasAccess || !hasRefresh) {
      localStorage.setItem('accessToken', t.accessToken);
      localStorage.setItem('refreshToken', t.refreshToken);
    }
  } catch {
    /* ignore */
  }
}
