import axios from 'axios';
import { getBackendOrigin } from './backendOrigin';

/** User-visible message for login/register failures (network vs API body). */
export function formatAuthError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data;
    if (data && typeof data === 'object' && data !== null && 'error' in data) {
      const msg = (data as { error: unknown }).error;
      if (typeof msg === 'string' && msg.trim()) return msg;
    }
    if (!err.response) {
      const origin = getBackendOrigin();
      const tried = origin ? ` (${origin})` : '';
      const code = typeof err.code === 'string' && err.code ? ` [${err.code}]` : '';
      return `Can't reach the Electra server${tried}.${code} Check your connection and that the API is running (Railway / your host). For desktop dev, set VITE_BACKEND_URL in packages/frontend/.env.development.`;
    }
    const status = err.response.status;
    if (status >= 500) {
      return `Server error (${status}). The API may be down — check your host's logs.`;
    }
    return typeof data === 'string' && data
      ? `Request failed (${status})`
      : `Request failed (${status}). Please try again.`;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}
