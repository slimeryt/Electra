import { create } from 'zustand';
import { Message, DmMessage } from '../types/models';

interface MessageState {
  messagesByChannel: Record<string, Message[]>;
  dmMessages: Record<string, DmMessage[]>;
  hasMoreByChannel: Record<string, boolean>;

  setMessages: (channelId: string, messages: Message[]) => void;
  prependMessages: (channelId: string, messages: Message[], hasMore: boolean) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, channelId: string, content: string, editedAt: number) => void;
  deleteMessage: (messageId: string, channelId: string) => void;
  getMessages: (channelId: string) => Message[];

  setDmMessages: (dmId: string, messages: DmMessage[]) => void;
  prependDmMessages: (dmId: string, messages: DmMessage[], hasMore: boolean) => void;
  addDmMessage: (message: DmMessage) => void;
  updateDmMessage: (dmId: string, messageId: string, content: string, editedAt: number) => void;
  deleteDmMessage: (dmId: string, messageId: string) => void;
  getDmMessages: (dmId: string) => DmMessage[];
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByChannel: {},
  dmMessages: {},
  hasMoreByChannel: {},

  setMessages: (channelId, messages) =>
    set(s => ({ messagesByChannel: { ...s.messagesByChannel, [channelId]: messages } })),

  prependMessages: (channelId, messages, hasMore) =>
    set(s => ({
      messagesByChannel: {
        ...s.messagesByChannel,
        [channelId]: [...messages, ...(s.messagesByChannel[channelId] || [])],
      },
      hasMoreByChannel: { ...s.hasMoreByChannel, [channelId]: hasMore },
    })),

  addMessage: (message) =>
    set(s => ({
      messagesByChannel: {
        ...s.messagesByChannel,
        [message.channel_id]: [...(s.messagesByChannel[message.channel_id] || []), message],
      },
    })),

  updateMessage: (messageId, channelId, content, editedAt) =>
    set(s => ({
      messagesByChannel: {
        ...s.messagesByChannel,
        [channelId]: (s.messagesByChannel[channelId] || []).map(m =>
          m.id === messageId ? { ...m, content, edited_at: editedAt } : m
        ),
      },
    })),

  deleteMessage: (messageId, channelId) =>
    set(s => ({
      messagesByChannel: {
        ...s.messagesByChannel,
        [channelId]: (s.messagesByChannel[channelId] || []).filter(m => m.id !== messageId),
      },
    })),

  getMessages: (channelId) => get().messagesByChannel[channelId] || [],

  setDmMessages: (dmId, messages) =>
    set(s => ({ dmMessages: { ...s.dmMessages, [dmId]: messages } })),

  prependDmMessages: (dmId, messages, hasMore) =>
    set(s => ({
      dmMessages: {
        ...s.dmMessages,
        [dmId]: [...messages, ...(s.dmMessages[dmId] || [])],
      },
      hasMoreByChannel: { ...s.hasMoreByChannel, [`dm:${dmId}`]: hasMore },
    })),

  addDmMessage: (message) =>
    set(s => ({
      dmMessages: {
        ...s.dmMessages,
        [message.dm_id]: [...(s.dmMessages[message.dm_id] || []), message],
      },
    })),

  updateDmMessage: (dmId, messageId, content, editedAt) =>
    set(s => ({
      dmMessages: {
        ...s.dmMessages,
        [dmId]: (s.dmMessages[dmId] || []).map(m =>
          m.id === messageId ? { ...m, content, edited_at: editedAt } : m
        ),
      },
    })),

  deleteDmMessage: (dmId, messageId) =>
    set(s => ({
      dmMessages: {
        ...s.dmMessages,
        [dmId]: (s.dmMessages[dmId] || []).filter(m => m.id !== messageId),
      },
    })),

  getDmMessages: (dmId) => get().dmMessages[dmId] || [],
}));
