import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DirectMessage } from '../../types/models';
import { dmsApi } from '../../api/dms';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';

export function DMList() {
  const [dms, setDms] = useState<DirectMessage[]>([]);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { dmId: activeDmId } = useParams<{ dmId: string }>();

  useEffect(() => {
    dmsApi.list().then(setDms).catch(() => {});
  }, []);

  const getOtherParticipant = (dm: DirectMessage) => {
    return dm.participants?.find(p => p.id !== user?.id) || dm.participants?.[0];
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        padding: '6px 8px 4px 16px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Direct Messages</span>
        <span style={{ fontSize: 16, cursor: 'pointer', color: 'var(--text-muted)' }} title="New DM">+</span>
      </div>

      {dms.length === 0 && (
        <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          No direct messages yet
        </div>
      )}

      {dms.map(dm => {
        const other = getOtherParticipant(dm);
        if (!other) return null;
        const isActive = activeDmId === dm.id;

        return (
          <div
            key={dm.id}
            onClick={() => navigate(`/app/dms/${dm.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 8px 5px 16px',
              margin: '1px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: isActive ? 'var(--bg-active)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            <Avatar user={other as any} size={32} showStatus />
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? 'var(--text-primary)' : 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {(other as any).display_name || (other as any).username}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                @{(other as any).username}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
