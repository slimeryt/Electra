import {
  useState,
  useRef,
  useCallback,
  KeyboardEvent,
  DragEvent,
  ChangeEvent,
} from 'react';
import { filesApi } from '../../api/files';
import { getSocket } from '../../socket/client';
import { Spinner } from '../ui/Spinner';

interface PendingFile {
  file: File;
  preview?: string;
  uploading: boolean;
  fileId?: string;
}

interface MessageInputProps {
  placeholder?: string;
  onSend: (content: string, fileIds: string[]) => Promise<void>;
  onTyping?: () => void;
  channelId?: string;
  dmId?: string;
}

export function MessageInput({
  placeholder = 'Message...',
  onSend,
  onTyping,
  channelId,
  dmId,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setContent('');
    setPendingFiles([]);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await onSend(savedContent, fileIds);
    } catch {
      setContent(savedContent);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const hasUploading = pendingFiles.some(f => f.uploading);
  const canSend = !hasUploading && (content.trim().length > 0 || pendingFiles.some(f => f.fileId));

  return (
    <div
      style={{ padding: '0 16px 16px' }}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
      onDrop={handleDrop}
    >
      {/* Pending file previews */}
      {pendingFiles.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '8px 0',
          flexWrap: 'wrap',
        }}>
          {pendingFiles.map((pf, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {pf.preview ? (
                <img
                  src={pf.preview}
                  alt=""
                  style={{
                    width: 64,
                    height: 64,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    opacity: pf.uploading ? 0.5 : 1,
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-overlay)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  opacity: pf.uploading ? 0.5 : 1,
                }}>
                  📄
                </div>
              )}
              {pf.uploading && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Spinner size={16} />
                </div>
              )}
              <button
                onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'var(--danger)',
                  border: 'none',
                  color: '#fff',
                  fontSize: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        background: isDragOver ? 'rgba(88,101,242,0.10)' : 'var(--bg-input)',
        border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '4px 8px',
        transition: 'border-color var(--transition), background var(--transition)',
        boxShadow: isDragOver ? '0 0 0 3px rgba(88,101,242,0.15)' : 'inset 0 1px 3px rgba(0,0,0,0.3)',
      }}>
        {/* Attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: 22,
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)',
            flexShrink: 0,
            transition: 'var(--transition)',
            alignSelf: 'flex-end',
            marginBottom: 4,
            lineHeight: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'none';
          }}
          title="Attach file"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => {
            setContent(e.target.value);
            emitTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'none',
            lineHeight: 1.5,
            padding: '8px 4px',
            maxHeight: 200,
            overflowY: 'auto',
          }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: canSend ? 'var(--accent)' : 'var(--bg-hover)',
            border: 'none',
            color: canSend ? '#fff' : 'var(--text-muted)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
            transition: 'var(--transition)',
            alignSelf: 'flex-end',
            marginBottom: 4,
          }}
          onMouseEnter={e => {
            if (canSend) e.currentTarget.style.background = 'var(--accent-hover)';
          }}
          onMouseLeave={e => {
            if (canSend) e.currentTarget.style.background = 'var(--accent)';
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
