import { useEffect } from 'react';
import { getSocket } from '../socket/client';
import { useMessageStore, useVoiceStore, useAuthStore, useChannelStore } from '../store';

export function useSocketEvents() {
  const { addMessage, updateMessage, deleteMessage, addDmMessage } = useMessageStore();
  const { addParticipant, removeParticipant, setParticipants, updateParticipant, setRemoteStream } = useVoiceStore();
  const { setUser } = useAuthStore();
  const { addChannel, updateChannel, removeChannel } = useChannelStore();

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

    socket.on('voice_room_state', ({ participants }: any) => {
      setParticipants(participants);
    });

    socket.on('voice_user_join', ({ user_id, user }: any) => {
      addParticipant({ userId: user_id, muted: false, deafened: false, video: false, screen: false, user });
    });

    socket.on('voice_user_leave', ({ user_id }: any) => {
      removeParticipant(user_id);
    });

    socket.on('voice_state_update', ({ user_id, ...updates }: any) => {
      updateParticipant(user_id, updates);
    });

    socket.on('channel_create', addChannel);
    socket.on('channel_update', (ch: any) => updateChannel(ch));
    socket.on('channel_delete', ({ channel_id, server_id }: any) => removeChannel(channel_id, server_id));

    return () => {
      socket.off('message_create');
      socket.off('message_update');
      socket.off('message_delete');
      socket.off('dm_message_create');
      socket.off('voice_room_state');
      socket.off('voice_user_join');
      socket.off('voice_user_leave');
      socket.off('voice_state_update');
      socket.off('channel_create');
      socket.off('channel_update');
      socket.off('channel_delete');
    };
  }, []);
}
