import { create } from 'zustand';

interface MobileNavState {
  leftOpen: boolean;
  membersOpen: boolean;
  setLeftOpen: (open: boolean) => void;
  toggleLeft: () => void;
  setMembersOpen: (open: boolean) => void;
  toggleMembers: () => void;
  closeAll: () => void;
}

export const useMobileNavStore = create<MobileNavState>((set) => ({
  leftOpen: false,
  membersOpen: false,
  setLeftOpen: (leftOpen) => set({ leftOpen, membersOpen: false }),
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen, membersOpen: false })),
  setMembersOpen: (membersOpen) => set({ membersOpen, leftOpen: false }),
  toggleMembers: () => set((s) => ({ membersOpen: !s.membersOpen, leftOpen: false })),
  closeAll: () => set({ leftOpen: false, membersOpen: false }),
}));
