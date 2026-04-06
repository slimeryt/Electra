import { create } from 'zustand';
import { User } from '../types/models';
import { authApi } from '../api/auth';
import { connectSocket, disconnectSocket } from '../socket/client';

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
    set({ user, isAuthenticated: true });
    connectSocket(accessToken);
  },

  register: async (data) => {
    const { user, accessToken, refreshToken } = await authApi.register(data);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
    connectSocket(accessToken);
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    disconnectSocket();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return set({ isLoading: false });

      const user = await authApi.me();
      set({ user, isAuthenticated: true });
      connectSocket(token);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
}));
