import { create } from 'zustand';
import { Friend } from '../types/models';
import { friendsApi } from '../api/friends';

interface FriendState {
  friends: Friend[];
  requests: Friend[];
  isLoaded: boolean;

  fetchFriends: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  sendRequest: (username: string) => Promise<void>;
  acceptRequest: (friendshipId: string) => Promise<void>;
  declineRequest: (friendshipId: string) => Promise<void>;
  removeFriend: (targetUserId: string) => Promise<void>;

  // Real-time updates from socket
  onFriendRequest: (req: Friend) => void;
  onFriendAccepted: (friendshipId: string, user: Friend['user']) => void;
  onFriendRemoved: (friendshipId: string) => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  requests: [],
  isLoaded: false,

  fetchFriends: async () => {
    const friends = await friendsApi.list();
    set({ friends, isLoaded: true });
  },

  fetchRequests: async () => {
    const requests = await friendsApi.requests();
    set({ requests });
  },

  sendRequest: async (username) => {
    const result = await friendsApi.send(username);
    // If auto-accepted, move to friends list
    if ((result as any).status === 'accepted') {
      await get().fetchFriends();
    } else {
      await get().fetchRequests();
    }
  },

  acceptRequest: async (friendshipId) => {
    await friendsApi.accept(friendshipId);
    set(s => ({
      requests: s.requests.filter(r => r.id !== friendshipId),
    }));
    await get().fetchFriends();
  },

  declineRequest: async (friendshipId) => {
    await friendsApi.decline(friendshipId);
    set(s => ({ requests: s.requests.filter(r => r.id !== friendshipId) }));
  },

  removeFriend: async (targetUserId) => {
    await friendsApi.remove(targetUserId);
    set(s => ({ friends: s.friends.filter(f => f.user.id !== targetUserId) }));
  },

  // Socket-driven updates
  onFriendRequest: (req) => {
    set(s => ({ requests: [req, ...s.requests.filter(r => r.id !== req.id)] }));
  },

  onFriendAccepted: (friendshipId, user) => {
    set(s => ({
      requests: s.requests.filter(r => r.id !== friendshipId),
      friends: [
        ...s.friends.filter(f => f.id !== friendshipId),
        { id: friendshipId, status: 'accepted', direction: 'accepted', created_at: Date.now() / 1000, user },
      ],
    }));
  },

  onFriendRemoved: (friendshipId) => {
    set(s => ({
      friends: s.friends.filter(f => f.id !== friendshipId),
      requests: s.requests.filter(r => r.id !== friendshipId),
    }));
  },
}));
