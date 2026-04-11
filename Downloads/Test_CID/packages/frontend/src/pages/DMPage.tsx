import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { DMHeader } from '../components/dm/DMHeader';
import { usePhoneLayout } from '../hooks/useMediaQuery';
import { useDmMessages } from '../hooks/useMessages';
import { dmsApi } from '../api/dms';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../socket/client';
import type { DirectMessage } from '../types/models';

interface TypingUser {
  user_id: string;
  display_name: string;
}

export default function DMPage() {
  const { dmId } = useParams<{ dmId: string }>();
  const isPhone = usePhoneLayout();
  const { user } = useAuthStore();
  const { messages, isLoading, hasMore, loadMessages, loadMore } = useDmMessages(dmId!);
  const [dm, setDm] = useState<DirectMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!dmId) return;
    loadMessages();

    dmsApi.list().then(dms => {
      const found = dms.find((d: any) => d.id === dmId);
      if (found) setDm(found);
    }).catch(() => {});

    const socket = getSocket();

    const onDmTypingStart = (data: any) => {
      if (data.dm_id !== dmId) return;
      setTypingUsers(prev => prev.some(u => u.user_id === data.user_id) ? prev : [...prev, { user_id: data.user_id, display_name: data.display_name }]);
    };
    const onDmTypingStop = (data: any) => {
      if (data.dm_id !== dmId) return;
      setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
    };

    socket.on('dm_typing_start', onDmTypingStart);
    socket.on('dm_typing_stop', onDmTypingStop);
    return () => {
      socket.off('dm_typing_start', onDmTypingStart);
      socket.off('dm_typing_stop', onDmTypingStop);
    };
  }, [dmId]);

  const handleSend = (content: string, fileIds: string[], replyToId?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit('send_dm', { dm_id: dmId, content, file_ids: fileIds, reply_to_id: replyToId }, (res: any) => {
        if (res?.ok) resolve();
        else reject(new Error(res?.error || 'Failed to send'));
      });
    });
  };

  const isGroup = !!dm?.is_group;
  const otherUser = !isGroup ? (dm?.participants?.find(p => p.id !== user?.id) ?? null) : null;
  const placeholder = isGroup
    ? `Message ${dm?.name || 'Group'}`
    : `Message ${otherUser?.display_name || otherUser?.username || ''}`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!isPhone && <DMHeader dm={dm} currentUserId={user?.id} />}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
        isDm
      />
      <MessageInput
        placeholder={placeholder}
        onSend={handleSend}
        dmId={dmId}
      />
    </div>
  );
}
