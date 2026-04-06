import client from './client';
import { Channel, Message } from '../types/models';

export const channelsApi = {
  update: (channelId: string, data: Partial<{ name: string; topic: string; position: number; category: string }>) =>
    client.patch<Channel>(`/channels/${channelId}`, data).then(r => r.data),

  delete: (channelId: string) =>
    client.delete(`/channels/${channelId}`).then(r => r.data),

  getMessages: (channelId: string, before?: string, limit = 50) =>
    client.get<Message[]>(`/channels/${channelId}/messages`, {
      params: { before, limit },
    }).then(r => r.data),

  sendMessage: (channelId: string, content?: string, fileIds?: string[]) =>
    client.post<Message>(`/channels/${channelId}/messages`, { content, file_ids: fileIds }).then(r => r.data),

  editMessage: (messageId: string, content: string) =>
    client.patch<Message>(`/messages/${messageId}`, { content }).then(r => r.data),

  deleteMessage: (messageId: string) =>
    client.delete(`/messages/${messageId}`).then(r => r.data),
};
