import { create } from 'zustand';
import { Channel } from '../types/models';
import { serversApi } from '../api/servers';

interface ChannelState {
  channelsByServer: Record<string, Channel[]>;
  /** After first fetchChannels(serverId) settles (ok or error); avoids routing forum as text before list exists. */
  channelListReadyByServer: Record<string, boolean>;
  activeChannelId: string | null;

  fetchChannels: (serverId: string) => Promise<void>;
  addChannel: (channel: Channel) => void;
  updateChannel: (channel: Partial<Channel> & { id: string }) => void;
  removeChannel: (channelId: string, serverId: string) => void;
  setActiveChannel: (id: string | null) => void;
  getChannels: (serverId: string) => Channel[];
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channelsByServer: {},
  channelListReadyByServer: {},
  activeChannelId: null,

  fetchChannels: async (serverId) => {
    try {
      const channels = await serversApi.getChannels(serverId);
      set(s => ({
        channelsByServer: { ...s.channelsByServer, [serverId]: channels },
        channelListReadyByServer: { ...s.channelListReadyByServer, [serverId]: true },
      }));
    } catch {
      set(s => ({
        channelsByServer: { ...s.channelsByServer, [serverId]: [] },
        channelListReadyByServer: { ...s.channelListReadyByServer, [serverId]: true },
      }));
    }
  },

  addChannel: (channel) => set(s => ({
    channelsByServer: {
      ...s.channelsByServer,
      [channel.server_id]: [...(s.channelsByServer[channel.server_id] || []), channel],
    },
  })),

  updateChannel: (update) => set(s => {
    const entry = Object.entries(s.channelsByServer).find(([, chs]) => chs.some(c => c.id === update.id));
    if (!entry) return s;
    const [serverId, channels] = entry;
    return {
      channelsByServer: {
        ...s.channelsByServer,
        [serverId]: channels.map(c => c.id === update.id ? { ...c, ...update } : c),
      },
    };
  }),

  removeChannel: (channelId, serverId) => set(s => ({
    channelsByServer: {
      ...s.channelsByServer,
      [serverId]: (s.channelsByServer[serverId] || []).filter(c => c.id !== channelId),
    },
    activeChannelId: s.activeChannelId === channelId ? null : s.activeChannelId,
  })),

  setActiveChannel: (id) => set({ activeChannelId: id }),

  getChannels: (serverId) => get().channelsByServer[serverId] || [],
}));
