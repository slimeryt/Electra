import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { useMessages } from '../hooks/useMessages';
import { channelsApi } from '../api/channels';
import { useChannelStore } from '../store/channelStore';
import { getSocket } from '../socket/client';

interface TypingUser {
  user_id: string;
  display_name: string;
}

export default function ChannelPage() {
  const { channelId, serverId } = useParams<{ channelId: string; serverId: string }>();
  const { getChannels } = useChannelStore();
  const { messages, isLoading, hasMore, loadMessages, loadMore } = useMessages(channelId!);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const prevChannelRef = useRef<string>();

  const channels = getChannels(serverId || '');
  const channel = channels.find(c => c.id === channelId);

  useEffect(() => {
    if (!channelId) return;

    // Leave previous channel on change
    if (prevChannelRef.current && prevChannelRef.current !== channelId) {
      getSocket().emit('leave_channel', { channel_id: prevChannelRef.current });
    }
    prevChannelRef.current = channelId;

    setTypingUsers([]);
    loadMessages();

    const socket = getSocket();
    socket.emit('join_channel', { channel_id: channelId });

    const onTypingStart = (data: any) => {
      if (data.channel_id !== channelId) return;
      setTypingUsers(prev => {
        if (prev.some(u => u.user_id === data.user_id)) return prev;
        return [...prev, { user_id: data.user_id, display_name: data.display_name }];
      });
    };

    const onTypingStop = (data: any) => {
      if (data.channel_id !== channelId) return;
      setTypingUsers(prev => prev.filter(u => u.user_id !== data.user_id));
    };

    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
    };
  }, [channelId]);

  const handleSend = async (content: string, fileIds: string[]) => {
    await channelsApi.sendMessage(channelId!, content, fileIds);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Channel header */}
      <div style={{
        padding: '0 16px',
        height: 49,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, color: 'var(--text-muted)', fontWeight: 700, lineHeight: 1 }}>
          #
        </span>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
          {channel?.name || channelId}
        </span>
        {(channel as any)?.topic && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />
            <span style={{
              fontSize: 13, color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {(channel as any).topic}
            </span>
          </>
        )}
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
      />

      {/* Input */}
      <MessageInput
        placeholder={`Message #${channel?.name || ''}`}
        onSend={handleSend}
        channelId={channelId}
      />
    </div>
  );
}
