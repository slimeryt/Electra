import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessagesSquare, Pencil, Trash2 } from 'lucide-react';
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
import { useAuthStore } from '../store/authStore';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

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
  const { user } = useAuthStore();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postLoadErr, setPostLoadErr] = useState('');
  const { messages, isLoading, hasMore, loadMessages, loadMore } = useForumThreadMessages(channelId!, postId!);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const prevPostRef = useRef<string>();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editBusy, setEditBusy] = useState(false);

  const isPostAuthor = post && user?.id === post.author_id;

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

    const onForumPostUpdate = (payload: { post?: ForumPost; channel_id?: string }) => {
      if (payload.post?.id === postId) setPost(payload.post);
    };
    const onForumPostDelete = (payload: { post_id?: string; channel_id?: string }) => {
      if (payload.post_id === postId) {
        navigate(`/app/servers/${serverId}/channels/${channelId}`);
      }
    };

    socket.on('typing_start', onTypingStart);
    socket.on('typing_stop', onTypingStop);
    socket.on('forum_post_update', onForumPostUpdate);
    socket.on('forum_post_delete', onForumPostDelete);

    return () => {
      socket.off('typing_start', onTypingStart);
      socket.off('typing_stop', onTypingStop);
      socket.off('forum_post_update', onForumPostUpdate);
      socket.off('forum_post_delete', onForumPostDelete);
      socket.emit('leave_forum_post', { post_id: postId });
    };
  }, [channelId, postId, loadMessages, navigate, serverId]);

  const openEdit = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditBody(post.body || '');
    setEditErr('');
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!channelId || !postId || !post || !editTitle.trim()) {
      setEditErr('Title required');
      return;
    }
    setEditBusy(true);
    setEditErr('');
    try {
      const updated = await channelsApi.updateForumPost(channelId, postId, {
        title: editTitle.trim(),
        body: editBody.trim() || null,
      });
      setPost(updated);
      setEditOpen(false);
    } catch (e: any) {
      setEditErr(e.response?.data?.error || 'Failed to save');
    } finally {
      setEditBusy(false);
    }
  };

  const deleteThread = async () => {
    if (!channelId || !postId || !confirm('Delete this post and all replies?')) return;
    try {
      await channelsApi.deleteForumPost(channelId, postId);
      navigate(`/app/servers/${serverId}/channels/${channelId}`);
    } catch {
      /* ignore */
    }
  };

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
          <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
            {post?.title || '…'}
          </span>
          {isPostAuthor && (
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              <button
                type="button"
                title="Edit post"
                onClick={openEdit}
                style={{
                  padding: 6,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                title="Delete post"
                onClick={() => void deleteThread()}
                style={{
                  padding: 6,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
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

      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); setEditErr(''); }} title="Edit post">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Message (optional)</label>
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: 10,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--bg-overlay)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 14,
                resize: 'vertical',
              }}
            />
          </div>
          {editErr ? <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{editErr}</p> : null}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => void saveEdit()} isLoading={editBusy} style={{ flex: 1 }}>Save</Button>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
