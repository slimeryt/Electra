import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, MessagesSquare, Pencil, Trash2 } from 'lucide-react';
import { getSocket } from '../socket/client';
import { channelsApi } from '../api/channels';
import type { ForumPost } from '../types/models';
import { useChannelStore } from '../store/channelStore';
import { useAuthStore } from '../store/authStore';
import { useContextMenu } from '../context/ContextMenuContext';
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
  const { user } = useAuthStore();
  const { show } = useContextMenu();

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [createErr, setCreateErr] = useState('');
  const [creating, setCreating] = useState(false);
  const [editPost, setEditPost] = useState<ForumPost | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editErr, setEditErr] = useState('');
  const [editBusy, setEditBusy] = useState(false);

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
    const onUpdate = (payload: { channel_id: string; post: ForumPost }) => {
      if (payload.channel_id !== channelId) return;
      setPosts((prev) => prev.map((p) => (p.id === payload.post.id ? payload.post : p)));
    };
    const onDelete = (payload: { channel_id: string; post_id: string }) => {
      if (payload.channel_id !== channelId) return;
      setPosts((prev) => prev.filter((p) => p.id !== payload.post_id));
    };
    socket.on('forum_post_create', onCreate);
    socket.on('forum_post_update', onUpdate);
    socket.on('forum_post_delete', onDelete);
    return () => {
      socket.off('forum_post_create', onCreate);
      socket.off('forum_post_update', onUpdate);
      socket.off('forum_post_delete', onDelete);
      socket.emit('leave_channel', { channel_id: channelId });
    };
  }, [channelId]);

  const openPost = (postId: string) => {
    navigate(`/app/servers/${serverId}/channels/${channelId}/posts/${postId}`);
  };

  const openEdit = (p: ForumPost) => {
    setEditPost(p);
    setEditTitle(p.title);
    setEditBody(p.body || '');
    setEditErr('');
  };

  const handleEditSave = async () => {
    if (!channelId || !editPost || !editTitle.trim()) {
      setEditErr('Title is required');
      return;
    }
    setEditBusy(true);
    setEditErr('');
    try {
      const updated = await channelsApi.updateForumPost(channelId, editPost.id, {
        title: editTitle.trim(),
        body: editBody.trim() || null,
      });
      setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditPost(null);
    } catch (e: any) {
      setEditErr(e.response?.data?.error || 'Failed to update');
    } finally {
      setEditBusy(false);
    }
  };

  const handleDeletePost = async (p: ForumPost) => {
    if (!channelId || !confirm(`Delete post “${p.title}”? All replies will be removed.`)) return;
    try {
      await channelsApi.deleteForumPost(channelId, p.id);
      setPosts((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      /* ignore */
    }
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
                onContextMenu={(e) => {
                  if (p.author_id !== user?.id) return;
                  e.preventDefault();
                  show(
                    [
                      {
                        label: 'Edit post',
                        icon: <Pencil size={14} />,
                        onClick: () => openEdit(p),
                      },
                      {
                        label: 'Delete post',
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onClick: () => void handleDeletePost(p),
                      },
                    ],
                    e.clientX,
                    e.clientY,
                  );
                }}
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

      <Modal
        isOpen={!!editPost}
        onClose={() => { setEditPost(null); setEditErr(''); }}
        title="Edit post"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
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
            <Button onClick={() => void handleEditSave()} isLoading={editBusy} style={{ flex: 1 }}>Save</Button>
            <Button variant="secondary" onClick={() => setEditPost(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

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
