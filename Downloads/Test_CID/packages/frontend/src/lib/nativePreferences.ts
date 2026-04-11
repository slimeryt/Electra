import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const K = {
  access: 'electra_access_token',
  refresh: 'electra_refresh_token',
  theme: 'electra-theme',
} as const;

const VALID_THEMES = new Set(['dark', 'amoled', 'midnight', 'light']);

export function shouldUseNativePreferences(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Restore JWTs from SharedPreferences/UserDefaults into localStorage before React boots. */
export async function hydrateNativeSession(): Promise<void> {
  if (!shouldUseNativePreferences()) return;
  try {
    const [at, rt] = await Promise.all([
      Preferences.get({ key: K.access }),
      Preferences.get({ key: K.refresh }),
    ]);
    if (at.value) localStorage.setItem('accessToken', at.value);
    if (rt.value) localStorage.setItem('refreshToken', rt.value);
  } catch {
    /* plugin or storage unavailable */
  }
}

/** Mirror current localStorage tokens to native storage (survives WebView data clears better on some devices). */
export async function persistNativeSession(): Promise<void> {
  if (!shouldUseNativePreferences()) return;
  const at = localStorage.getItem('accessToken');
  const rt = localStorage.getItem('refreshToken');
  if (!at || !rt) return;
  try {
    await Preferences.set({ key: K.access, value: at });
    await Preferences.set({ key: K.refresh, value: rt });
  } catch {
    /* ignore */
  }
}

export async function clearNativeSession(): Promise<void> {
  if (!shouldUseNativePreferences()) return;
  try {
    await Promise.all([Preferences.remove({ key: K.access }), Preferences.remove({ key: K.refresh })]);
  } catch {
    /* ignore */
  }
}

/** Run before App import so themeStore reads the right localStorage default. */
export async function hydrateNativeTheme(): Promise<void> {
  if (!shouldUseNativePreferences()) return;
  try {
    const { value } = await Preferences.get({ key: K.theme });
    if (value && VALID_THEMES.has(value)) {
      localStorage.setItem(K.theme, value);
      document.documentElement.setAttribute('data-theme', value);
    }
  } catch {
    /* ignore */
  }
}

export async function persistNativeTheme(theme: string): Promise<void> {
  if (!shouldUseNativePreferences()) return;
  try {
    await Preferences.set({ key: K.theme, value: theme });
  } catch {
    /* ignore */
  }
}
