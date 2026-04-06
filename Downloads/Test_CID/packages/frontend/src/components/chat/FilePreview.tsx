import { FileAttachment } from '../../types/models';
import { filesApi } from '../../api/files';

interface FilePreviewProps {
  file: FileAttachment;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function FilePreview({ file }: FilePreviewProps) {
  const isImage = file.mime_type?.startsWith('image/');
  const url = filesApi.getUrl(file.id);

  if (isImage) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
        <img
          src={url}
          alt={file.original_name}
          style={{
            maxWidth: Math.min((file as any).width || 400, 400),
            maxHeight: 300,
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'block',
            cursor: 'pointer',
            objectFit: 'contain',
          }}
        />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      download={file.original_name}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none',
        maxWidth: 320,
        transition: 'var(--transition)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <span style={{ fontSize: 24, flexShrink: 0 }}>📄</span>
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          fontSize: 13,
          color: 'var(--accent)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: 500,
        }}>
          {file.original_name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatSize(file.size_bytes)}
        </div>
      </div>
    </a>
  );
}
