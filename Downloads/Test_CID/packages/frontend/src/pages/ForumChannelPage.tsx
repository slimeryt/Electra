import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MessagesSquare } from 'lucide-react';
import { getSocket } from '../socket/client';
import { channelsApi } from '../api/channels';
import type { ForumPost } from '../types/models';
import { useChannelStore } from '../store/channelStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { usePhoneLayout } from '../hooks/useMediaQuery';
import { format } from 'date-fns';

export default function ForumChannelPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const navigate = useNavigate();
  const isPhone = usePhoneLayout();
  const { getChannels, setActiveChannel } = useChannelStore();
  const channel = getChannels(serverId || '').find((c) => c.id === channelId);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (channelId) setActiveChannel(channelId);
  }, [channelId, setActiveChannel]);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    try {
      const { posts } = await channelsApi.listForumPosts(channelId);
      setPosts(posts);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!channelId) return;
    const socket = getSocket();
    socket.emit('join_channel', { channel_id: channelId });
    const onCreate = (payload: { channel_id: string; post: ForumPost }) => {
      if (payload.channel_id !== channelId) return;
      setPosts((prev) => {
        if (prev.some((p) => p.id === payload.post.id)) return prev;
        return [...prev, payload.post];
      });
    };
    socket.on('forum_post_create', onCreate);
    return () => {
      socket.off('forum_post_create', onCreate);
      socket.emit('leave_channel', { channel_id: channelId });
    };
  }, [channelId]);

  const openPost = (postId: string) => {
    navigate(`/app/servers/${serverId}/channels/${channelId}/posts/${postId}`);
  };

  const handleCreate = async () => {
    if (!channelId || !title.trim()) {
      setCreateErr('Title is required');
      return;
    }
    setCreating(true);
    setCreateErr('');
    try {
      const post = await channelsApi.createForumPost(channelId, title.trim(), body.trim() || undefined);
      setPosts((prev) => [...prev, post]);
      setCreateOpen(false);
      setTitle('');
      setBody('');
      openPost(post.id);
    } catch (e: any) {
      setCreateErr(e.response?.data?.error || 'Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {!isPhone && (
        <div
          style={{
            padding: '0 16px',
            height: 49,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <MessagesSquare size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {channel?.name || channelId}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Forum</span>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} style={{ marginRight: 4 }} /> New post
          </Button>
        </div>
      )}

      {isPhone && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <Button size="sm" onClick={() => setCreateOpen(true)} style={{ width: '100%' }}>
            <Plus size={14} style={{ marginRight: 4 }} /> New post
          </Button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 16 }}>Loading posts…</div>
        ) : posts.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, padding: 16, textAlign: 'center' }}>
            No posts yet. Start the conversation.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...posts].reverse().map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => openPost(p.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'var(--transition)',
                }}
              >
                <Avatar user={p.author as any} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{p.title}</div>
                  {p.body ? (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.body}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                    {p.author?.display_name || p.author?.username || 'User'} · {format(new Date(p.created_at * 1000), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); setCreateErr(''); }} title="Create forum post">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What’s this about?" autoFocus />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Message (optional)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional opening message…"
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
          {createErr ? <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{createErr}</p> : null}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCreate} isLoading={creating} style={{ flex: 1 }}>Create</Button>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
