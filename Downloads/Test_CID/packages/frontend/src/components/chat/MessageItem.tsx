import { useState } from 'react';
import { Pencil, Trash2, Clipboard, Link } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { FilePreview } from './FilePreview';
import { format } from 'date-fns';
import { channelsApi } from '../../api/channels';
import { dmsApi } from '../../api/dms';
import { getSocket } from '../../socket/client';
import { useContextMenu } from '../../context/ContextMenuContext';
import { useAuthStore } from '../../store/authStore';
import { useMessageStore } from '../../store/messageStore';
import type { Message, DmMessage } from '../../types/models';

interface MessageItemProps {
  message: Message | DmMessage;
  isGrouped?: boolean;
  isDm?: boolean;
}

function renderContent(text: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 600, cursor: 'default' }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

function formatTime(ts: number): string {
  const date = new Date(ts * 1000);
  const now = Date.now();
  const diff = now - date.getTime();
  if (diff < 24 * 60 * 60 * 1000) return format(date, 'HH:mm');
  return format(date, 'MMM d, yyyy HH:mm');
}

function ActionBtn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '3px 6px',
        borderRadius: 'var(--radius-sm)',
        fontSize: 13,
        transition: 'var(--transition)',
        display: 'flex',
        alignItems: 'center',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.15)' : 'var(--bg-hover)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
      }}
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
  const author = (message as any).author;
  const isOwn = author?.id === currentUser?.id;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const items = [
      ...(message.content ? [{ label: 'Copy Text', icon: <Clipboard size={14} />, onClick: () => navigator.clipboard.writeText(message.content!) }] : []),
      ...(message.content ? [{ divider: true, label: '', onClick: () => {} }] : []),
      ...(isOwn ? [
        { label: 'Edit Message', icon: <Pencil size={14} />, onClick: () => { setEditContent(message.content || ''); setIsEditing(true); } },
      ] : []),
      { label: 'Copy Message ID', icon: <Link size={14} />, onClick: () => navigator.clipboard.writeText(message.id) },
      ...(isOwn ? [
        { divider: true, label: '', onClick: () => {} },
        { label: 'Delete Message', icon: <Trash2 size={14} />, danger: true, onClick: handleDelete },
      ] : []),
    ];
    show(items, e.clientX, e.clientY);
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }
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
    } catch {
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (!isDm) {
      getSocket().emit('delete_message', {
        message_id: message.id,
        channel_id: (message as Message).channel_id,
      });
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={handleContextMenu}
      style={{
        display: 'flex',
        gap: 12,
        padding: `${isGrouped ? 2 : 10}px 16px`,
        position: 'relative',
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'background 120ms',
        borderRadius: 'var(--radius-sm)',
      }}
    >
      {/* Avatar or timestamp spacer */}
      <div style={{ width: 36, flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: isGrouped ? 'center' : 'flex-start' }}>
        {!isGrouped ? (
          <Avatar user={author} size={36} />
        ) : hovered ? (
          <span style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            userSelect: 'none',
            lineHeight: 1,
          }}>
            {format(new Date(message.created_at * 1000), 'HH:mm')}
          </span>
        ) : null}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row */}
        {!isGrouped && (
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 2,
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              {author?.display_name || 'Unknown'}
            </span>
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
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Enter to save · Esc to cancel
            </div>
          </div>
        ) : (
          <>
            {message.content && (
              <p style={{
                fontSize: 14,
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {renderContent(message.content)}
              </p>
            )}
            {(message as any).attachments?.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(message as any).attachments.map((att: any) => (
                  <FilePreview key={att.id} file={att} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Hover action buttons */}
      {hovered && !isEditing && (
        <div style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          gap: 2,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-md)',
          padding: '2px 4px',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 'var(--z-dropdown)',
        }}>
          <ActionBtn onClick={() => { setEditContent(message.content || ''); setIsEditing(true); }}>
            <Pencil size={14} />
          </ActionBtn>
          <ActionBtn onClick={handleDelete} danger>
            <Trash2 size={14} />
          </ActionBtn>
        </div>
      )}
    </div>
  );
}
