import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessagesSquare } from 'lucide-react';
import { getSocket } from '../socket/client';
import { channelsApi } from '../api/channels';
import type { ForumPost } from '../types/models';
import { useChannelStore } from '../store/channelStore';
import { useForumThreadMessages } from '../hooks/useMessages';
import { MessageList } from '../components/chat/MessageList';
import { MessageInput } from '../components/chat/MessageInput';
import { MarkdownContent } from '../components/chat/MarkdownContent';
import { Avatar } from '../components/ui/Avatar';
import { usePhoneLayout } from '../hooks/useMediaQuery';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';

interface TypingUser {
  user_id: string;
  display_name: string;
}

export default function ForumPostPage() {
  const { serverId, channelId, postId } = useParams<{ serverId: string; channelId: string; postId: string }>();
  const navigate = useNavigate();
  const isPhone = usePhoneLayout();
  const { getChannels, setActiveChannel } = useChannelStore();
  const channel = getChannels(serverId || '').find((c) => c.id === channelId);

  const [post, setPost] = useState<ForumPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postLoadErr, setPostLoadErr] = useState('');
  const { messages, isLoading, hasMore, loadMessages, loadMore } = useForumThreadMessages(channelId!, postId!);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const prevPostRef = useRef<string>();

  useEffect(() => {
    if (channelId) setActiveChannel(channelId);
  }, [channelId, setActiveChannel]);

  useEffect(() => {
    if (!channelId || !postId) return;
    setPostLoading(true);
    setPostLoadErr('');
    channelsApi
      .getForumPost(channelId, postId)
      .then(setPost)
      .catch(() => setPostLoadErr('Could not load post'))
      .finally(() => setPostLoading(false));
  }, [channelId, postId]);

  useEffect(() => {
    if (!channelId || !postId) return;

    if (prevPostRef.current && prevPostRef.current !== postId) {
      getSocket().emit('leave_forum_post', { post_id: prevPostRef.current });
    }
    prevPostRef.current = postId;

    setTypingUsers([]);
    loadMessages();

    const socket = getSocket();
    socket.emit('join_forum_post', { post_id: postId });

    const onTypingStart = (data: any) => {
      if (data.forum_post_id !== postId) return;
      setTypingUsers((prev) => {
        if (prev.some((u) => u.user_id === data.user_id)) return prev;
        return [...prev, { user_id: data.user_id, display_name: data.display_name }];
      });
    };

    const onTypingStop = (data: any) => {
      if (data.forum_post_id !== postId) return;
      setTypingUsers((prev) => prev.filter((u) => u.user_id !== data.user_id));
    };

    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);

    return () => {
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
      socket.emit('leave_forum_post', { post_id: postId });
    };
  }, [channelId, postId, loadMessages]);

  const handleSend = (content: string, fileIds: string[], replyToId?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      getSocket().emit(
        'send_message',
        {
          channel_id: channelId,
          content,
          file_ids: fileIds,
          reply_to_id: replyToId,
          forum_post_id: postId,
        },
        (res: any) => {
          if (res?.ok) resolve();
          else reject(new Error(res?.error || 'Failed to send'));
        },
      );
    });
  };

  if (postLoadErr) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }}>
        {postLoadErr}
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" onClick={() => navigate(`/app/servers/${serverId}/channels/${channelId}`)}>
            Back to forum
          </Button>
        </div>
      </div>
    );
  }

  if (postLoading) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading post…</div>
    );
  }

  if (!post) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)' }}>
        Post not found
        <div style={{ marginTop: 12 }}>
          <Button variant="secondary" onClick={() => navigate(`/app/servers/${serverId}/channels/${channelId}`)}>
            Back to forum
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {!isPhone && (
        <div
          style={{
            padding: '0 16px',
            minHeight: 49,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => navigate(`/app/servers/${serverId}/channels/${channelId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <ArrowLeft size={16} />
            Forum
          </button>
          <MessagesSquare size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {post?.title || '…'}
          </span>
        </div>
      )}

      {post && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: post.body ? 10 : 0 }}>
            <Avatar user={post.author as any} size={40} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{post.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {post.author?.display_name || post.author?.username} · {format(new Date(post.created_at * 1000), 'MMM d, yyyy HH:mm')}
              </div>
            </div>
          </div>
          {post.body ? (
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <MarkdownContent content={post.body} />
            </div>
          ) : null}
        </div>
      )}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        typingUsers={typingUsers}
      />

      <MessageInput
        placeholder="Reply to thread…"
        onSend={handleSend}
        channelId={channelId}
        forumPostId={postId}
        serverId={serverId}
      />
    </div>
  );
}
