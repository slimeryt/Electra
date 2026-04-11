import { useEffect } from 'react';
import { getSocket } from '../socket/client';
import { useMessageStore, useVoiceStore, useAuthStore, useChannelStore, useFriendStore } from '../store';

export function useSocketEvents() {
  const { addMessage, updateMessage, deleteMessage, addDmMessage, updateDmMessage } = useMessageStore();
  const { addParticipant, removeParticipant, setParticipants, updateParticipant, setRemoteStream, setChannelParticipants, addChannelParticipant, removeChannelParticipant } = useVoiceStore();
  const { setUser } = useAuthStore();
  const { addChannel, updateChannel, removeChannel } = useChannelStore();
  const { onFriendRequest, onFriendAccepted, onFriendRemoved } = useFriendStore();

  // Request notification permission once on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('message_create', addMessage);

    socket.on('message_update', ({ message_id, content, edited_at, channel_id, forum_post_id }: any) => {
      const key = forum_post_id ? `forum:${forum_post_id}` : channel_id;
      updateMessage(message_id, key, content, edited_at);
    });

    socket.on('message_delete', ({ message_id, channel_id, forum_post_id }: any) => {
      const key = forum_post_id ? `forum:${forum_post_id}` : channel_id;
      deleteMessage(message_id, key);
    });

    socket.on('dm_message_create', ({ message }: any) => {
      addDmMessage(message);
      // Desktop notification when window is not focused and message is not from self
      const currentUser = useAuthStore.getState().user;
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        !document.hasFocus() &&
        message?.author?.id !== currentUser?.id
      ) {
        const senderName = message.author?.display_name || message.author?.username || 'Someone';
        const body = message.content || '(attachment)';
        try {
          new Notification(`${senderName}`, {
            body,
            icon: message.author?.avatar_url || undefined,
            tag: `dm-${message.dm_id}`,
          });
        } catch {}
      }
    });

    socket.on('dm_message_update', ({ dm_id, message_id, content, edited_at }: any) => {
      updateDmMessage(dm_id, message_id, content, edited_at);
    });

    // When a new DM/group DM is created and we're a participant, join its room
    socket.on('dm_created', ({ dm }: any) => {
      if (dm?.id) {
        socket.emit('join_dm_room', { dm_id: dm.id });
      }
    });

    socket.on('voice_room_state', ({ channel_id, participants }: any) => {
      const { activeChannelId, joiningChannelId } = useVoiceStore.getState();
      if (
        channel_id
        && (channel_id === activeChannelId || channel_id === joiningChannelId)
      ) {
        setParticipants(participants);
      }
      if (channel_id) setChannelParticipants(channel_id, participants);
    });

    socket.on('voice_user_join', ({ channel_id, user_id, user }: any) => {
      if (channel_id) addChannelParticipant(channel_id, { userId: user_id, user });
      const active = useVoiceStore.getState().activeChannelId;
      if (!active || channel_id === active) {
        addParticipant({ userId: user_id, muted: false, deafened: false, video: false, screen: false, user });
      }
    });

    socket.on('voice_user_leave', ({ channel_id, user_id }: any) => {
      if (channel_id) removeChannelParticipant(channel_id, user_id);
      const active = useVoiceStore.getState().activeChannelId;
      if (!active || channel_id === active) {
        removeParticipant(user_id);
      }
    });

    socket.on('voice_state_update', ({ user_id, ...updates }: any) => {
      updateParticipant(user_id, updates);
    });

    socket.on('channel_create', addChannel);
    socket.on('channel_update', (ch: any) => updateChannel(ch));
    socket.on('channel_delete', ({ channel_id, server_id }: any) => removeChannel(channel_id, server_id));

    socket.on('friend_request', (req: any) => onFriendRequest(req));
    socket.on('friend_accepted', ({ friendship_id, user }: any) => onFriendAccepted(friendship_id, user));
    socket.on('friend_removed', ({ friendship_id }: any) => onFriendRemoved(friendship_id));

    socket.on('mention_notification', ({ channel_id, server_id, message }: any) => {
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        !document.hasFocus()
      ) {
        const senderName = message?.author?.display_name || message?.author?.username || 'Someone';
        try {
          new Notification(`${senderName} mentioned you`, {
            body: message?.content || 'You were mentioned in a channel.',
            icon: message?.author?.avatar_url || undefined,
            tag: `mention-${channel_id}`,
          });
        } catch {}
      }
    });

    return () => {
      socket.off('message_create');
      socket.off('message_update');
      socket.off('message_delete');
      socket.off('dm_message_create');
      socket.off('dm_message_update');
      socket.off('dm_created');
      socket.off('voice_room_state');
      socket.off('voice_user_join');
      socket.off('voice_user_leave');
      socket.off('voice_state_update');
      socket.off('channel_create');
      socket.off('channel_update');
      socket.off('channel_delete');
      socket.off('friend_request');
      socket.off('friend_accepted');
      socket.off('friend_removed');
      socket.off('mention_notification');
    };
  }, []);
}
