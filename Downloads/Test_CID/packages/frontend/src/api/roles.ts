import client from './client';
import { ServerRole } from '../types/models';

export const rolesApi = {
  list: (serverId: string) =>
    client.get<ServerRole[]>(`/servers/${serverId}/roles`).then(r => r.data),
  create: (serverId: string, data: { name: string; color?: string; permissions?: number }) =>
    client.post<ServerRole>(`/servers/${serverId}/roles`, data).then(r => r.data),
  update: (serverId: string, roleId: string, data: Partial<{ name: string; color: string; permissions: number; hoist: boolean }>) =>
    client.patch<ServerRole>(`/servers/${serverId}/roles/${roleId}`, data).then(r => r.data),
  delete: (serverId: string, roleId: string) =>
    client.delete(`/servers/${serverId}/roles/${roleId}`).then(r => r.data),
  assignToMember: (serverId: string, userId: string, roleId: string) =>
    client.post(`/servers/${serverId}/members/${userId}/roles/${roleId}`).then(r => r.data),
  removeFromMember: (serverId: string, userId: string, roleId: string) =>
    client.delete(`/servers/${serverId}/members/${userId}/roles/${roleId}`).then(r => r.data),
};
