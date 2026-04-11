import { create } from 'zustand';
import type { Message, DmMessage } from '../types/models';

interface ReplyState {
  replyTo: (Message | DmMessage) | null;
  open: (msg: Message | DmMessage) => void;
  close: () => void;
}

export const useReplyStore = create<ReplyState>((set) => ({
  replyTo: null,
  open: (msg) => set({ replyTo: msg }),
  close: () => set({ replyTo: null }),
}));
