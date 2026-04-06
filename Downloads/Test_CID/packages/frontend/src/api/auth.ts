import client from './client';
import { AuthResponse } from '../types/api';
import { User } from '../types/models';

export const authApi = {
  register: (data: { username: string; display_name: string; email: string; password: string }) =>
    client.post<AuthResponse>('/auth/register', data).then(r => r.data),

  login: (email: string, password: string) =>
    client.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),

  refresh: (refreshToken: string) =>
    client.post<AuthResponse>('/auth/refresh', { refresh_token: refreshToken }).then(r => r.data),

  logout: (refreshToken: string) =>
    client.post('/auth/logout', { refresh_token: refreshToken }).then(r => r.data),

  me: () =>
    client.get<{ user: User }>('/auth/me').then(r => r.data.user),
};
