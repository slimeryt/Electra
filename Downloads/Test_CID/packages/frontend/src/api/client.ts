import axios from 'axios';
import { isElectron } from '../env';
import { clearPersistedAuth, persistAuthTokens } from '../lib/electronAuthPersist';

const BASE = isElectron
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
  : '';

const client = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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

        refreshQueue.forEach((cb) => cb(data.accessToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return client(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (isElectron) void clearPersistedAuth();
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
