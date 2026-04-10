import client from './client';
import type { User } from '../types/models';

export const usersApi = {
  getProfile: async (userId: string): Promise<User> => {
    const { data } = await client.get(`/users/${userId}`);
    return data;
  },
};
