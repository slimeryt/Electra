import client from './client';
import { Friend } from '../types/models';

export const friendsApi = {
  list: () => client.get<Friend[]>('/friends').then(r => r.data),
  listBlocked: () => client.get<Friend['user'][]>('/friends/blocked').then(r => r.data),
  requests: () => client.get<Friend[]>('/friends/requests').then(r => r.data),
  send: (username: string) => client.post<Friend>('/friends', { username }).then(r => r.data),
  accept: (friendshipId: string) => client.post(`/friends/${friendshipId}/accept`).then(r => r.data),
  decline: (friendshipId: string) => client.post(`/friends/${friendshipId}/decline`).then(r => r.data),
  remove: (targetUserId: string) => client.delete(`/friends/${targetUserId}`).then(r => r.data),
  block: (targetUserId: string) => client.post(`/friends/${targetUserId}/block`).then(r => r.data),
};
