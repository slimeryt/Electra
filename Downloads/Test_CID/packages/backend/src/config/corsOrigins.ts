/**
 * Capacitor Android/iOS WebViews load the app from these origins.
 * They must be allowed when CORS_ORIGIN is a strict list (e.g. Railway + web app URL).
 */
export const NATIVE_APP_ORIGINS = [
  'https://localhost',
  'http://localhost',
  'capacitor://localhost',
] as const;

/** Comma-separated env list, or '*' — always merges native app origins unless wildcard. */
export function parseCorsOriginList(): string[] | '*' {
  const raw = process.env.CORS_ORIGIN || '*';
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  if (list.includes('*')) return '*';
  return [...new Set([...list, ...NATIVE_APP_ORIGINS])];
}
