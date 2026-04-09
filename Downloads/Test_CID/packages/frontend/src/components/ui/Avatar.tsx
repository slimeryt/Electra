import { useState, useEffect } from 'react';

interface AvatarUser {
  display_name?: string;
  username?: string;
  avatar_url?: string | null;
  status?: string;
}

interface AvatarProps {
  user?: AvatarUser;
  size?: number;
  showStatus?: boolean;
}

const statusColors: Record<string, string> = {
  online: 'var(--success)',
  idle: '#f0b232',
  dnd: 'var(--danger)',
  offline: 'var(--text-muted)',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

function hashColor(name = ''): string {
  const colors = ['#5865f2', '#eb459e', '#57f287', '#fee75c', '#ed4245', '#9b59b6', '#3498db'];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ user, size = 36, showStatus = false }: AvatarProps) {
  const name = user?.display_name || user?.username || '';
  const bg = hashColor(name);
  const [imgError, setImgError] = useState(false);

  // Reset error state whenever the URL changes so the new image gets a fresh attempt
  useEffect(() => { setImgError(false); }, [user?.avatar_url]);

  const showImage = !!user?.avatar_url && !imgError;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {showImage ? (
        <img
          src={user!.avatar_url!}
          alt={name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: size * 0.4,
          fontWeight: 600,
          userSelect: 'none',
          flexShrink: 0,
        }}>
          {getInitials(name)}
        </div>
      )}
      {showStatus && user?.status && (
        <span style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: Math.max(size * 0.3, 8),
          height: Math.max(size * 0.3, 8),
          borderRadius: '50%',
          background: statusColors[user.status] || statusColors.offline,
          border: '2px solid var(--bg-base)',
          boxSizing: 'content-box',
        }} />
      )}
    </div>
  );
}
