import client from './client';
import type { User } from '../types/models';

export const usersApi = {
  getProfile: async (userId: string): Promise<User> => {
    const { data } = await client.get(`/users/${userId}`);
    return data;
  },
  verifyUser: (userId: string) => client.post(`/users/${userId}/verify`).then(r => r.data),
  unverifyUser: (userId: string) => client.delete(`/users/${userId}/verify`).then(r => r.data),
  verifyServer: (serverId: string) => client.post(`/users/servers/${serverId}/verify`).then(r => r.data),
  unverifyServer: (serverId: string) => client.delete(`/users/servers/${serverId}/verify`).then(r => r.data),
};
