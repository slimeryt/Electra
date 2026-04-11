import { Capacitor } from '@capacitor/core';
import { isElectron } from '../env';

/**
 * Backend origin with no trailing slash.
 * - Normal browser (Vite dev): empty → axios uses `/api` and Vite proxies to the backend.
 * - Electron & Capacitor (Android/iOS): absolute URL from `VITE_BACKEND_URL` (required for release APK/IPA).
 */
export function getBackendOrigin(): string {
  const needsAbsoluteUrl = isElectron || Capacitor.isNativePlatform();
  if (!needsAbsoluteUrl) return '';

  const raw = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.trim();
  const url = (raw && raw.length > 0 ? raw : 'http://localhost:3001').replace(/\/$/, '');
  return url;
}
