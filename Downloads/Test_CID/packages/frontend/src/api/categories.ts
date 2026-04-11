import client from './client';

export interface ServerCategory {
  id: string;
  server_id: string;
  name: string;
  position: number;
}

export const categoriesApi = {
  list: (serverId: string) =>
    client.get<ServerCategory[]>(`/servers/${serverId}/categories`).then(r => r.data),
  create: (serverId: string, name: string) =>
    client.post<ServerCategory>(`/servers/${serverId}/categories`, { name }).then(r => r.data),
  update: (serverId: string, catId: string, data: Partial<{ name: string; position: number }>) =>
    client.patch<ServerCategory>(`/servers/${serverId}/categories/${catId}`, data).then(r => r.data),
  delete: (serverId: string, catId: string) =>
    client.delete(`/servers/${serverId}/categories/${catId}`).then(r => r.data),
};
