import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { DMHeader } from '../components/dm/DMHeader';
import { useDmMessages } from '../hooks/useMessages';
import { dmsApi } from '../api/dms';
import { useAuthStore } from '../store/authStore';
import { User } from '../types/models';
import { getSocket } from '../socket/client';

interface TypingUser {
  user_id: string;
  display_name: string;
}

export default function DMPage() {
  const { dmId } = useParams<{ dmId: string }>();
  const { user } = useAuthStore();
  const { messages, isLoading, hasMore, loadMessages, loadMore } = useDmMessages(dmId!);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    if (!dmId) return;
    loadMessages();

    // Load DM info to get other participant
    dmsApi.list().then(dms => {
      const dm = dms.find(d => d.id === dmId);
      if (dm) {
        const other = dm.participants?.find(p => p.id !== user?.id);
        if (other) setOtherUser(other as User);
      }
    }).catch(() => {});

    const socket = getSocket();

    const onDmTypingStart = (data: any) => {
      if (data.dm_id !== dmId) return;
      setTypingUsers(prev => {
        if (prev.some(u => u.user_id === data.user_id)) return prev;
        return [...prev, { user_id: data.user_id, display_name: data.display_name }];
      });
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

  const handleSend = async (content: string, fileIds: string[]) => {
    await dmsApi.sendMessage(dmId!, content, fileIds);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <DMHeader user={otherUser} />
      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
        isDm
      />
      <MessageInput
        placeholder={`Message ${otherUser?.display_name || otherUser?.username || ''}`}
        onSend={handleSend}
        dmId={dmId}
      />
    </div>
  );
}
