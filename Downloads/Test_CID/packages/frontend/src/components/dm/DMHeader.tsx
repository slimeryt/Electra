import { Avatar } from '../ui/Avatar';
import { User } from '../../types/models';

interface DMHeaderProps {
  user: User | null;
}

export function DMHeader({ user }: DMHeaderProps) {
  return (
    <div style={{
      padding: '0 16px',
      height: 49,
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexShrink: 0,
    }}>
      {user ? (
        <>
          <Avatar user={user} size={32} showStatus />
          <div>
            <div style={{
              fontWeight: 600,
              fontSize: 15,
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}>
              {user.display_name || user.username}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              @{user.username}
            </div>
          </div>
        </>
      ) : (
        <div style={{
          width: 120,
          height: 16,
          background: 'var(--bg-hover)',
          borderRadius: 'var(--radius-sm)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}
