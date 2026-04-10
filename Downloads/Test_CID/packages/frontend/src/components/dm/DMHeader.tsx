import { Avatar } from '../ui/Avatar';
import type { DirectMessage, User } from '../../types/models';

interface DMHeaderProps {
  dm: DirectMessage | null;
  currentUserId?: string;
}

export function DMHeader({ dm, currentUserId }: DMHeaderProps) {
  const isGroup = !!dm?.is_group;
  const otherUser: User | null = !isGroup
    ? (dm?.participants?.find((p: User) => p.id !== currentUserId) ?? null)
    : null;

  const groupName = dm?.name || dm?.participants?.map((p: User) => p.display_name || p.username).join(', ') || 'Group DM';

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
      {dm ? (
        isGroup ? (
          <>
            {/* Group DM: stacked avatars */}
            <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
              {(dm.participants || []).slice(0, 2).map((p: User, i: number) => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    width: 22, height: 22,
                    top: i === 0 ? 0 : 'auto',
                    bottom: i === 1 ? 0 : 'auto',
                    left: i === 0 ? 0 : 'auto',
                    right: i === 1 ? 0 : 'auto',
                    borderRadius: '50%',
                    border: '1.5px solid var(--bg-base)',
                    overflow: 'hidden',
                    zIndex: i === 0 ? 1 : 2,
                  }}
                >
                  <Avatar user={p} size={22} />
                </div>
              ))}
            </div>
            <div>
              <div style={{
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}>
                {groupName}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {dm.participants?.length ?? 0} members
              </div>
            </div>
          </>
        ) : (
          <>
            <Avatar user={otherUser ?? undefined} size={32} showStatus />
            <div>
              <div style={{
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}>
                {otherUser?.display_name || otherUser?.username || ''}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                @{otherUser?.username || ''}
              </div>
            </div>
          </>
        )
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
