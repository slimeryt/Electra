import client from './client';
import { DirectMessage, DmMessage } from '../types/models';

export const dmsApi = {
  list: () => client.get<DirectMessage[]>('/dms').then(r => r.data),

  create: (userId: string) =>
    client.post<{ id: string }>('/dms', { user_id: userId }).then(r => r.data),

  getMessages: (dmId: string, before?: string, limit = 50) =>
    client.get<DmMessage[]>(`/dms/${dmId}/messages`, { params: { before, limit } }).then(r => r.data),

  sendMessage: (dmId: string, content?: string, fileIds?: string[]) =>
    client.post<DmMessage>(`/dms/${dmId}/messages`, { content, file_ids: fileIds }).then(r => r.data),

  editMessage: (dmId: string, messageId: string, content: string) =>
    client.patch<DmMessage>(`/dms/${dmId}/messages/${messageId}`, { content }).then(r => r.data),

  deleteMessage: (dmId: string, messageId: string) =>
    client.delete(`/dms/${dmId}/messages/${messageId}`).then(r => r.data),
};
