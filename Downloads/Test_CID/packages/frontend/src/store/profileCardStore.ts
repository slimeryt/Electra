import { create } from 'zustand';

interface ProfileCardState {
  userId: string | null;
  anchor: { x: number; y: number } | null;
  open: (userId: string, x: number, y: number) => void;
  close: () => void;
}

export const useProfileCardStore = create<ProfileCardState>((set) => ({
  userId: null,
  anchor: null,
  open: (userId, x, y) => set({ userId, anchor: { x, y } }),
  close: () => set({ userId: null, anchor: null }),
}));
