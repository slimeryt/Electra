import { create } from 'zustand';
import { VoiceParticipant } from '../types/models';

interface VoiceState {
  activeChannelId: string | null;
  participants: VoiceParticipant[];
  // Global per-channel presence visible in the sidebar
  channelParticipants: Record<string, { userId: string; user?: VoiceParticipant['user'] }[]>;
  remoteStreams: Map<string, MediaStream>;
  localStream: MediaStream | null;
  isMuted: boolean;
  isDeafened: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  joiningChannelId: string | null;
  voiceJoinError: string | null;

  setActiveChannel: (id: string | null) => void;
  setParticipants: (participants: VoiceParticipant[]) => void;
  addParticipant: (participant: VoiceParticipant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<VoiceParticipant>) => void;
  setChannelParticipants: (channelId: string, participants: { userId: string; user?: any }[]) => void;
  addChannelParticipant: (channelId: string, participant: { userId: string; user?: any }) => void;
  removeChannelParticipant: (channelId: string, userId: string) => void;
  setRemoteStream: (userId: string, stream: MediaStream) => void;
  removeRemoteStream: (userId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setMuted: (muted: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  setVideoEnabled: (enabled: boolean) => void;
  setScreenSharing: (sharing: boolean) => void;
  setJoiningChannelId: (id: string | null) => void;
  setVoiceJoinError: (message: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  activeChannelId: null,
  participants: [],
  channelParticipants: {},
  remoteStreams: new Map(),
  localStream: null,
  isMuted: false,
  isDeafened: false,
  isVideoEnabled: false,
  isScreenSharing: false,
  joiningChannelId: null,
  voiceJoinError: null,

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

  setChannelParticipants: (channelId, participants) =>
    set(s => ({ channelParticipants: { ...s.channelParticipants, [channelId]: participants } })),

  addChannelParticipant: (channelId, participant) =>
    set(s => {
      const existing = s.channelParticipants[channelId] || [];
      return {
        channelParticipants: {
          ...s.channelParticipants,
          [channelId]: [...existing.filter(p => p.userId !== participant.userId), participant],
        },
      };
    }),

  removeChannelParticipant: (channelId, userId) =>
    set(s => ({
      channelParticipants: {
        ...s.channelParticipants,
        [channelId]: (s.channelParticipants[channelId] || []).filter(p => p.userId !== userId),
      },
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
  setJoiningChannelId: (joiningChannelId) => set({ joiningChannelId }),
  setVoiceJoinError: (voiceJoinError) => set({ voiceJoinError }),

  reset: () => set(s => ({
    activeChannelId: null,
    participants: [],
    // Clear just the active channel from global presence
    channelParticipants: s.activeChannelId
      ? { ...s.channelParticipants, [s.activeChannelId]: [] }
      : s.channelParticipants,
    remoteStreams: new Map(),
    localStream: null,
    isMuted: false,
    isDeafened: false,
    isVideoEnabled: false,
    isScreenSharing: false,
    joiningChannelId: null,
    voiceJoinError: null,
  })),
}));
