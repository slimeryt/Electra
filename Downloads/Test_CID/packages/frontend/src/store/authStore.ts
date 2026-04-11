import { create } from 'zustand';
import axios from 'axios';
import { User } from '../types/models';
import { authApi } from '../api/auth';
import { connectSocket, disconnectSocket } from '../socket/client';
import { isElectron } from '../env';
import { clearPersistedAuth, hydrateAuthFromDisk, persistAuthTokens } from '../lib/electronAuthPersist';
import { clearNativeSession, persistNativeSession } from '../lib/nativePreferences';
import { useThemeStore, type Theme } from './themeStore';
import { upsertSavedAccount } from '../lib/savedAccounts';

function applyUserTheme(user: User) {
  if (user.theme) useThemeStore.getState().setTheme(user.theme as Theme);
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; display_name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: true }),

  login: async (email, password) => {
    const { user, accessToken, refreshToken } = await authApi.login(email, password);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (isElectron) await persistAuthTokens(accessToken, refreshToken);
    await persistNativeSession();
    upsertSavedAccount(user);
    set({ user, isAuthenticated: true });
    applyUserTheme(user);
    connectSocket(accessToken);
  },

  register: async (data) => {
    const { user, accessToken, refreshToken } = await authApi.register(data);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (isElectron) await persistAuthTokens(accessToken, refreshToken);
    await persistNativeSession();
    upsertSavedAccount(user);
    set({ user, isAuthenticated: true });
    applyUserTheme(user);
    connectSocket(accessToken);
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    if (isElectron) await clearPersistedAuth();
    await clearNativeSession();
    disconnectSocket();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    // Skip if already authenticated (e.g. just logged in) — avoids a redundant
    // round-trip that shows a loading flash and can cause a blank screen on failure.
    if (get().isAuthenticated) return;
    set({ isLoading: true });
    try {
      if (isElectron) await hydrateAuthFromDisk();

      if (!localStorage.getItem('accessToken')) return set({ isLoading: false });

      const user = await authApi.me();
      // Read tokens AFTER me() — the axios interceptor may have refreshed them.
      // Using the pre-me() variable would save an expired token back to disk.
      const token = localStorage.getItem('accessToken')!;
      const rt = localStorage.getItem('refreshToken');
      set({ user, isAuthenticated: true });
      applyUserTheme(user);
      connectSocket(token);
      if (isElectron && rt) await persistAuthTokens(token, rt);
      await persistNativeSession();
    } catch (e: unknown) {
      const status = axios.isAxiosError(e) ? e.response?.status : undefined;
      if (status === 401 || status === 403) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (isElectron) void clearPersistedAuth();
        void clearNativeSession();
      }
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
