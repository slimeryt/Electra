import client from './client';
import { Channel, Message, ForumPost, ForumPostListResponse } from '../types/models';

export const channelsApi = {
  update: (channelId: string, data: Partial<{ name: string; topic: string; position: number; category: string }>) =>
    client.patch<Channel>(`/channels/${channelId}`, data).then(r => r.data),

  delete: (channelId: string) =>
    client.delete(`/channels/${channelId}`).then(r => r.data),

  getMessages: (channelId: string, before?: string, limit = 50, forumPostId?: string) =>
    client.get<Message[]>(`/channels/${channelId}/messages`, {
      params: {
        before,
        limit,
        ...(forumPostId ? { forum_post_id: forumPostId } : {}),
      },
    }).then(r => r.data),

  /** Preferred for forum threads (nested resource). */
  getForumPostMessages: (channelId: string, postId: string, before?: string, limit = 50) =>
    client.get<Message[]>(`/channels/${channelId}/forum/posts/${postId}/messages`, {
      params: { before, limit },
    }).then(r => r.data),

  listForumPosts: (channelId: string, before?: string, limit = 30) =>
    client
      .get<ForumPostListResponse>(`/channels/${channelId}/forum/posts`, { params: { before, limit } })
      .then(r => r.data),

  createForumPost: (channelId: string, title: string, body?: string) =>
    client.post<ForumPost>(`/channels/${channelId}/forum/posts`, { title, body }).then(r => r.data),

  getForumPost: (channelId: string, postId: string) =>
    client.get<ForumPost>(`/channels/${channelId}/forum/posts/${postId}`).then(r => r.data),

  sendMessage: (channelId: string, content?: string, fileIds?: string[]) =>
    client.post<Message>(`/channels/${channelId}/messages`, { content, file_ids: fileIds }).then(r => r.data),

  editMessage: (messageId: string, content: string) =>
    client.patch<Message>(`/messages/${messageId}`, { content }).then(r => r.data),

  deleteMessage: (messageId: string) =>
    client.delete(`/messages/${messageId}`).then(r => r.data),
};
