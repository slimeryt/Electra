import { create } from 'zustand';

export type StreamQuality = '480p' | '720p' | '1080p';
export type StreamFps = 15 | 30 | 60;

interface StreamSettingsState {
  fps: StreamFps;
  quality: StreamQuality;
  setFps: (fps: StreamFps) => void;
  setQuality: (quality: StreamQuality) => void;
}

export const QUALITY_MAP: Record<StreamQuality, { width: number; height: number }> = {
  '480p':  { width: 854,  height: 480  },
  '720p':  { width: 1280, height: 720  },
  '1080p': { width: 1920, height: 1080 },
};

export const useStreamSettingsStore = create<StreamSettingsState>((set) => ({
  fps: 30,
  quality: '720p',
  setFps: (fps) => set({ fps }),
  setQuality: (quality) => set({ quality }),
}));
