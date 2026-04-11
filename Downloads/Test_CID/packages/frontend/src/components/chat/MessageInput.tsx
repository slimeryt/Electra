import {
  useState,
  useRef,
  useCallback,
  useEffect,
  KeyboardEvent,
  DragEvent,
  ChangeEvent,
} from 'react';
import { X, CornerUpLeft } from 'lucide-react';
import { filesApi } from '../../api/files';
import { getSocket } from '../../socket/client';
import { Spinner } from '../ui/Spinner';
import { Avatar } from '../ui/Avatar';
import { serversApi } from '../../api/servers';
import { useReplyStore } from '../../store/replyStore';
import { usePhoneLayout } from '../../hooks/useMediaQuery';

interface PendingFile {
  file: File;
  preview?: string;
  uploading: boolean;
  fileId?: string;
}

interface MemberSuggestion {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface MessageInputProps {
  placeholder?: string;
  onSend: (content: string, fileIds: string[], replyToId?: string) => Promise<void>;
  onTyping?: () => void;
  channelId?: string;
  dmId?: string;
  serverId?: string;
}

export function MessageInput({
  placeholder = 'Message...',
  onSend,
  onTyping,
  channelId,
  dmId,
  serverId,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [members, setMembers] = useState<MemberSuggestion[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { replyTo, close: closeReply } = useReplyStore();
  const isPhone = usePhoneLayout();

  // Fetch members once when serverId is available
  useEffect(() => {
    if (!serverId) return;
    serversApi.members(serverId).then((m: any[]) => setMembers(m)).catch(() => {});
  }, [serverId]);

  const suggestions: MemberSuggestion[] = mentionQuery !== null
    ? members.filter(m =>
        m.username.toLowerCase().startsWith(mentionQuery.toLowerCase()) ||
        m.display_name.toLowerCase().startsWith(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  const emitTyping = useCallback(() => {
    const socket = getSocket();
    if (channelId) {
      socket.emit('start_typing', { channel_id: channelId });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { channel_id: channelId });
      }, 3000);
    } else if (dmId) {
      socket.emit('start_dm_typing', { dm_id: dmId });
    }
    onTyping?.();
  }, [channelId, dmId, onTyping]);

  const handleContentChange = (val: string) => {
    setContent(val);
    emitTyping();
    // Detect @mention at cursor
    const match = val.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (member: MemberSuggestion) => {
    const replaced = content.replace(/@(\w*)$/, `@${member.username} `);
    setContent(replaced);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const handleFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const newEntries: PendingFile[] = arr.map(f => ({
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      uploading: true,
    }));
    setPendingFiles(prev => [...prev, ...newEntries]);

    for (const f of arr) {
      try {
        const uploaded = await filesApi.upload(f) as any;
        setPendingFiles(prev => {
          const next = [...prev];
          const idx = next.findIndex(e => e.file === f);
          if (idx >= 0) next[idx] = { ...next[idx], uploading: false, fileId: uploaded.id };
          return next;
        });
      } catch {
        setPendingFiles(prev => prev.filter(e => e.file !== f));
      }
    }
  };

  const handleSend = async () => {
    const text = content.trim();
    const fileIds = pendingFiles.filter(f => f.fileId).map(f => f.fileId!);
    if (!text && fileIds.length === 0) return;
    const savedContent = text;
    const savedReplyId = replyTo?.id;
    setContent('');
    setPendingFiles([]);
    setMentionQuery(null);
    closeReply();
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    try {
      await onSend(savedContent, fileIds, savedReplyId);
    } catch {
      setContent(savedContent);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && mentionQuery !== null)) {
        e.preventDefault();
        insertMention(suggestions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) { handleFiles(e.target.files); e.target.value = ''; }
  };

  const hasUploading = pendingFiles.some(f => f.uploading);
  const canSend = !hasUploading && (content.trim().length > 0 || pendingFiles.some(f => f.fileId));

  const barBackground = isDragOver
    ? 'rgba(88,101,242,0.10)'
    : isPhone
      ? '#383a40'
      : 'var(--bg-input)';
  const barBorder = isDragOver
    ? 'var(--accent)'
    : isPhone
      ? 'rgba(0,0,0,0.28)'
      : 'var(--border-strong)';
  const barRadius = isPhone ? 8 : undefined;
  const barShadow = isDragOver
    ? '0 0 0 3px rgba(88,101,242,0.15)'
    : isPhone
      ? 'none'
      : 'inset 0 1px 3px rgba(0,0,0,0.3)';

  return (
    <div
      className="message-input-wrap"
      style={{ padding: '0 16px 16px', position: 'relative' }}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* @mention autocomplete */}
      {mentionQuery !== null && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 16, right: 16, marginBottom: 4,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          boxShadow: 'var(--shadow-float)', zIndex: 100,
        }}>
          <div style={{ padding: '6px 10px 4px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Members
          </div>
          {suggestions.map((m, i) => (
            <div
              key={m.id}
              onMouseDown={e => { e.preventDefault(); insertMention(m); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                cursor: 'pointer', background: i === mentionIndex ? 'var(--bg-active)' : 'transparent',
                transition: 'background 80ms',
              }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <Avatar user={m} size={28} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.display_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{m.username}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
          {pendingFiles.map((pf, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {pf.preview ? (
                <img src={pf.preview} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', opacity: pf.uploading ? 0.5 : 1, display: 'block' }} />
              ) : (
                <div style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: pf.uploading ? 0.5 : 1 }}>📄</div>
              )}
              {pf.uploading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Spinner size={16} />
                </div>
              )}
              <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: 'var(--danger)', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Reply banner */}
      {replyTo && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', marginBottom: 4,
          background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <CornerUpLeft size={12} style={{ flexShrink: 0, color: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)' }}>Replying to</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              {(replyTo as any).author?.display_name || (replyTo as any).author?.username || 'Unknown'}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.7 }}>
              — {replyTo.content || '(attachment)'}
            </span>
          </div>
          <button onClick={closeReply} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <div
        className="message-input-bar"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: barBackground,
          border: `1px solid ${barBorder}`,
          borderRadius: barRadius !== undefined ? barRadius : 'var(--radius-lg)',
          padding: '4px 8px',
          transition: 'border-color var(--transition), background var(--transition)',
          boxShadow: barShadow,
        }}
      >
        <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 22, padding: '4px 6px', borderRadius: 'var(--radius-sm)', flexShrink: 0, transition: 'var(--transition)', alignSelf: 'flex-end', marginBottom: 4, lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
          title="Attach file">+</button>
        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileInputChange} />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => { handleContentChange(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, padding: '8px 4px', maxHeight: 200, overflowY: 'auto' }}
          onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 200)}px`; }}
        />

        <button onClick={handleSend} disabled={!canSend} style={{ background: canSend ? 'var(--accent)' : 'var(--bg-hover)', border: 'none', color: canSend ? '#fff' : 'var(--text-muted)', cursor: canSend ? 'pointer' : 'not-allowed', width: 32, height: 32, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, transition: 'var(--transition)', alignSelf: 'flex-end', marginBottom: 4 }}
          onMouseEnter={e => { if (canSend) e.currentTarget.style.background = 'var(--accent-hover)'; }}
          onMouseLeave={e => { if (canSend) e.currentTarget.style.background = 'var(--accent)'; }}>➤</button>
      </div>
    </div>
  );
}
