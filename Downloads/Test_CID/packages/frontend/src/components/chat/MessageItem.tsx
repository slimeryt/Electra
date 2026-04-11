import { useState } from 'react';
import { Pencil, Trash2, Clipboard, Link, CornerUpLeft, MessageSquare, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { FilePreview } from './FilePreview';
import { MarkdownContent } from './MarkdownContent';
import { format } from 'date-fns';
import { channelsApi } from '../../api/channels';
import { dmsApi } from '../../api/dms';
import { getSocket } from '../../socket/client';
import { useContextMenu } from '../../context/ContextMenuContext';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import { useProfileCardStore } from '../../store/profileCardStore';
import { useReplyStore } from '../../store/replyStore';
import type { Message, DmMessage } from '../../types/models';

interface MessageItemProps {
  message: Message | DmMessage;
  isGrouped?: boolean;
  isDm?: boolean;
}

function formatTime(ts: number): string {
  const date = new Date(ts * 1000);
  const diff = Date.now() - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) return format(date, 'HH:mm');
  return format(date, 'MMM d, yyyy HH:mm');
}

function ActionBtn({ children, onClick, danger, title }: { children: React.ReactNode; onClick: () => void; danger?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', minWidth: 32, minHeight: 32, borderRadius: 'var(--radius-sm)', fontSize: 13, transition: 'var(--transition)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.15)' : 'var(--bg-hover)'; e.currentTarget.style.color = danger ? 'var(--danger)' : 'var(--text-primary)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = ''; }}
    >
      {children}
    </button>
  );
}

export function MessageItem({ message, isGrouped = false, isDm = false }: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [hovered, setHovered] = useState(false);
  const { show } = useContextMenu();
  const { user: currentUser } = useAuthStore();
  const openProfileCard = useProfileCardStore(s => s.open);
  const openReply = useReplyStore(s => s.open);
  const navigate = useNavigate();

  const author = (message as any).author;
  const isOwn = author?.id === currentUser?.id;
  const replyTo = (message as any).reply_to;

  const handleAuthorContextMenu = (e: React.MouseEvent) => {
    if (!author) return;
    e.preventDefault();
    e.stopPropagation();
    show([
      { label: 'View Profile', icon: <User size={14} />, onClick: () => openProfileCard(author.id, e.clientX, e.clientY) },
      ...(!isOwn ? [{
        label: 'Send Message',
        icon: <MessageSquare size={14} />,
        onClick: async () => {
          try {
            const dm = await dmsApi.create(author.id);
            navigate(`/app/dm/${dm.id}`);
          } catch {}
        },
      }] : []),
      { divider: true, label: '', onClick: () => {} },
      { label: 'Copy User ID', icon: <Clipboard size={14} />, onClick: () => navigator.clipboard.writeText(author.id) },
    ], e.clientX, e.clientY);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    show([
      ...(message.content ? [{ label: 'Copy Text', icon: <Clipboard size={14} />, onClick: () => navigator.clipboard.writeText(message.content!) }] : []),
      { label: 'Reply', icon: <CornerUpLeft size={14} />, onClick: () => openReply(message) },
      ...(message.content ? [{ divider: true, label: '', onClick: () => {} }] : []),
      ...(isOwn ? [{ label: 'Edit Message', icon: <Pencil size={14} />, onClick: () => { setEditContent(message.content || ''); setIsEditing(true); } }] : []),
      { label: 'Copy Message ID', icon: <Link size={14} />, onClick: () => navigator.clipboard.writeText(message.id) },
      ...(isOwn ? [{ divider: true, label: '', onClick: () => {} }, { label: 'Delete Message', icon: <Trash2 size={14} />, danger: true, onClick: handleDelete }] : []),
    ], e.clientX, e.clientY);
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) { setIsEditing(false); return; }
    try {
      if (isDm) {
        const dm = message as DmMessage;
        const updated = await dmsApi.editMessage(dm.dm_id, message.id, editContent);
        const editedAt = updated.edited_at ?? Math.floor(Date.now() / 1000);
        useMessageStore.getState().updateDmMessage(dm.dm_id, message.id, updated.content ?? editContent, editedAt);
      } else {
        const ch = message as Message;
        const updated = await channelsApi.editMessage(message.id, editContent);
        const editedAt = updated.edited_at ?? Math.floor(Date.now() / 1000);
        useMessageStore.getState().updateMessage(message.id, ch.channel_id, updated.content ?? editContent, editedAt);
      }
      setIsEditing(false);
    } catch { setIsEditing(false); }
  };

  const handleDelete = () => {
    if (!isDm) {
      getSocket().emit('delete_message', {
        message_id: message.id,
        channel_id: (message as Message).channel_id,
        forum_post_id: (message as Message).forum_post_id ?? undefined,
      });
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: `${isGrouped ? 2 : 8}px 16px`,
        position: 'relative',
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'background 120ms',
      }}
    >
      {/* Reply preview */}
      {replyTo && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginLeft: 48, marginBottom: 2,
          fontSize: 12, color: 'var(--text-muted)',
          cursor: 'default',
        }}>
          <CornerUpLeft size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>
            {replyTo.author?.display_name || replyTo.author?.username || 'Unknown'}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300, opacity: 0.8 }}>
            {replyTo.content || '(attachment)'}
          </span>
        </div>
      )}

      {/* Main message row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar / spacer */}
        <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: isGrouped ? 'center' : 'flex-start' }}>
          {!isGrouped ? (
            <Avatar
              user={author}
              size={36}
              onClick={author ? (e) => openProfileCard(author.id, e.clientX, e.clientY) : undefined}
              onContextMenu={author ? handleAuthorContextMenu : undefined}
            />
          ) : hovered ? (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', userSelect: 'none', lineHeight: 1 }}>
              {format(new Date(message.created_at * 1000), 'HH:mm')}
            </span>
          ) : null}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          {!isGrouped && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
              <span
                onContextMenu={author ? handleAuthorContextMenu : undefined}
                style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', cursor: author ? 'pointer' : 'default' }}
              >
                {author?.display_name || 'Unknown'}
              </span>
              {author?.is_bot === 1 && (
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                  padding: '1px 5px', borderRadius: 3,
                  background: 'var(--accent)', color: '#fff',
                  lineHeight: 1.6, alignSelf: 'center',
                }}>
                  BOT
                </span>
              )}
              <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
                {formatTime(message.created_at)}
              </span>
              {(message as any).edited_at && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(edited)</span>
              )}
            </div>
          )}

          {/* Content */}
          {isEditing ? (
            <div>
              <input
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); }
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--bg-overlay)', border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Enter to save · Esc to cancel</div>
            </div>
          ) : (
            <>
              {message.content && (
                <MarkdownContent
                  content={message.content}
                  style={{ fontSize: 14, color: 'var(--text-primary)' }}
                />
              )}
              {(message as any).attachments?.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(message as any).attachments.map((att: any) => <FilePreview key={att.id} file={att} />)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hovered && !isEditing && (
        <div style={{
          position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 2,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)', padding: '2px 4px',
          boxShadow: 'var(--shadow-lg)', zIndex: 'var(--z-dropdown)',
        }}>
          <ActionBtn onClick={() => openReply(message)} title="Reply">
            <CornerUpLeft size={14} />
          </ActionBtn>
          {isOwn && (
            <ActionBtn onClick={() => { setEditContent(message.content || ''); setIsEditing(true); }} title="Edit">
              <Pencil size={14} />
            </ActionBtn>
          )}
          {isOwn && (
            <ActionBtn onClick={handleDelete} danger title="Delete">
              <Trash2 size={14} />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}
