import client from './client';
import { Server, ServerMember, Channel } from '../types/models';

export const serversApi = {
  list: () => client.get<Server[]>('/servers').then(r => r.data),

  get: (serverId: string) => client.get<Server>(`/servers/${serverId}`).then(r => r.data),

  create: (name: string, description?: string) =>
    client.post<Server>('/servers', { name, description }).then(r => r.data),

  update: (serverId: string, data: Partial<{ name: string; description: string }>) =>
    client.patch<Server>(`/servers/${serverId}`, data).then(r => r.data),

  delete: (serverId: string) =>
    client.delete(`/servers/${serverId}`).then(r => r.data),

  members: (serverId: string) =>
    client.get<ServerMember[]>(`/servers/${serverId}/members`).then(r => r.data),

  join: (inviteCode: string) =>
    client.post<Server>('/servers/join', { invite_code: inviteCode }).then(r => r.data),

  leave: (serverId: string) =>
    client.delete(`/servers/${serverId}/members/me`).then(r => r.data),

  kick: (serverId: string, userId: string) =>
    client.delete(`/servers/${serverId}/members/${userId}`).then(r => r.data),

  // Channels
  getChannels: (serverId: string) =>
    client.get<Channel[]>(`/servers/${serverId}/channels`).then(r => r.data),

  createChannel: (serverId: string, data: { name: string; type?: string; category?: string }) =>
    client.post<Channel>(`/servers/${serverId}/channels`, data).then(r => r.data),
};
