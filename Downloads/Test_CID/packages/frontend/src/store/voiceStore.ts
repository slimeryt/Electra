import { create } from 'zustand';
import { VoiceParticipant } from '../types/models';

interface VoiceState {
  activeChannelId: string | null;
  participants: VoiceParticipant[];
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;

  setActiveChannel: (id: string | null) => void;
  setParticipants: (participants: VoiceParticipant[]) => void;
  addParticipant: (participant: VoiceParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<VoiceParticipant>) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeChannelId: null,
  participants: [],
  remoteStreams: new Map(),
  localStream: null,
  isMuted: false,
  isDeafened: false,
  isVideoEnabled: false,
  isScreenSharing: false,

  setActiveChannel: (id) => set({ activeChannelId: id }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set(s => ({ participants: [...s.participants.filter(p => p.userId !== participant.userId), participant] })),

  removeParticipant: (userId) =>
    set(s => ({ participants: s.participants.filter(p => p.userId !== userId) })),

  updateParticipant: (userId, updates) =>
    set(s => ({
      participants: s.participants.map(p => p.userId === userId ? { ...p, ...updates } : p),
    })),

  setRemoteStream: (userId, stream) =>
    set(s => { const m = new Map(s.remoteStreams); m.set(userId, stream); return { remoteStreams: m }; }),

  removeRemoteStream: (userId) =>
    set(s => { const m = new Map(s.remoteStreams); m.delete(userId); return { remoteStreams: m }; }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setMuted: (isMuted) => set({ isMuted }),
  setDeafened: (isDeafened) => set({ isDeafened }),
  setVideoEnabled: (isVideoEnabled) => set({ isVideoEnabled }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),

  reset: () => set({
    activeChannelId: null,
    participants: [],
    remoteStreams: new Map(),
    localStream: null,
    isMuted: false,
    isDeafened: false,
    isVideoEnabled: false,
    isScreenSharing: false,
  }),
}));
