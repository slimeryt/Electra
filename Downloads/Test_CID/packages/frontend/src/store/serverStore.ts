import { create } from 'zustand';
import { Server } from '../types/models';
import { serversApi } from '../api/servers';

interface ServerState {
  servers: Server[];
  activeServerId: string | null;

  fetchServers: () => Promise<void>;
  addServer: (server: Server) => void;
  updateServer: (server: Partial<Server> & { id: string }) => void;
  removeServer: (id: string) => void;
  setActiveServer: (id: string | null) => void;
  createServer: (name: string, description?: string) => Promise<Server>;
  joinServer: (inviteCode: string) => Promise<Server>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  activeServerId: null,

  fetchServers: async () => {
    const servers = await serversApi.list();
    set({ servers });
  },

  addServer: (server) => set(s => ({ servers: [...s.servers, server] })),

  updateServer: (update) => set(s => ({
    servers: s.servers.map(sv => sv.id === update.id ? { ...sv, ...update } : sv),
  })),

  removeServer: (id) => set(s => ({
    servers: s.servers.filter(sv => sv.id !== id),
    activeServerId: s.activeServerId === id ? null : s.activeServerId,
  })),

  setActiveServer: (id) => set({ activeServerId: id }),

  createServer: async (name, description) => {
    const server = await serversApi.create(name, description);
    set(s => ({ servers: [...s.servers, server] }));
    return server;
  },

  joinServer: async (inviteCode) => {
    const server = await serversApi.join(inviteCode);
    set(s => ({ servers: [...s.servers, server] }));
    return server;
  },
}));
