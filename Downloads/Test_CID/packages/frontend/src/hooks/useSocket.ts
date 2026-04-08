import { useEffect } from 'react';
import { getSocket } from '../socket/client';
import { useMessageStore, useVoiceStore, useAuthStore, useChannelStore, useFriendStore } from '../store';

export function useSocketEvents() {
  const { addMessage, updateMessage, deleteMessage, addDmMessage, updateDmMessage } = useMessageStore();
  const { addParticipant, removeParticipant, setParticipants, updateParticipant, setRemoteStream, setChannelParticipants, addChannelParticipant, removeChannelParticipant } = useVoiceStore();
  const { setUser } = useAuthStore();
  const { addChannel, updateChannel, removeChannel } = useChannelStore();
  const { onFriendRequest, onFriendAccepted, onFriendRemoved } = useFriendStore();

  useEffect(() => {
    const socket = getSocket();

    socket.on('message_create', addMessage);

    socket.on('message_update', ({ message_id, content, edited_at, channel_id }: any) => {
      updateMessage(message_id, channel_id, content, edited_at);
    });

    socket.on('message_delete', ({ message_id, channel_id }: any) => {
      deleteMessage(message_id, channel_id);
    });

    socket.on('dm_message_create', ({ message }: any) => {
      addDmMessage(message);
    });

    socket.on('dm_message_update', ({ dm_id, message_id, content, edited_at }: any) => {
      updateDmMessage(dm_id, message_id, content, edited_at);
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
      // Update global per-channel presence (visible in sidebar)
      if (channel_id) addChannelParticipant(channel_id, { userId: user_id, user });
      // Only update the active participants list if this is our current channel
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
    socket.on('mention_notification', ({ channel_id, server_id }: any) => {
      // TODO: surface as a badge — for now trigger a browser notification if available
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('You were mentioned', { body: 'Someone mentioned you in a channel.' });
      }
    });

    return () => {
      socket.off('message_create');
      socket.off('message_update');
      socket.off('message_delete');
      socket.off('dm_message_create');
      socket.off('dm_message_update');
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
