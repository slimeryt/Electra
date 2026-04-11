import axios from 'axios';
import { isElectron } from '../env';
import { clearPersistedAuth, persistAuthTokens } from '../lib/electronAuthPersist';
import { clearNativeSession, persistNativeSession } from '../lib/nativePreferences';
import { getBackendOrigin } from '../lib/backendOrigin';

const BASE = getBackendOrigin();

const client = axios.create({
  baseURL: `${BASE}/api`,
});

// Attach JWT + Content-Type to every request.
// Skip Content-Type for FormData — the browser must set it (with the boundary).
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Refresh on 401
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(client(original));
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refresh_token: refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        if (isElectron) void persistAuthTokens(data.accessToken, data.refreshToken);
        void persistNativeSession();

        refreshQueue.forEach((cb) => cb(data.accessToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(original);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        // Only wipe the persisted session when the server explicitly rejects the
        // refresh token (401/403). A network error means the backend is temporarily
        // unreachable — preserve the session.store so the next startup can recover.
        const isAuthRejected = axios.isAxiosError(refreshError) &&
          (refreshError.response?.status === 401 || refreshError.response?.status === 403);
        if (isElectron && isAuthRejected) void clearPersistedAuth();
        if (isAuthRejected) void clearNativeSession();
        // Use hash-less navigation so the SPA handles routing correctly in Electron
        window.dispatchEvent(new CustomEvent('auth:logout'));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default client;
