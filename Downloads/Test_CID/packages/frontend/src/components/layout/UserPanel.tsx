import { useNavigate } from 'react-router-dom';
import { Settings, Mic, Headphones } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';

export function UserPanel() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      left: 12,
      width: 306,
      zIndex: 200,
      background: 'rgba(10, 10, 18, 0.88)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      padding: '8px 10px',
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      userSelect: 'none',
    }}>
      {/* Avatar */}
      <div style={{ flexShrink: 0 }}>
        <Avatar user={user} size={34} showStatus />
      </div>

      {/* Name + username */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          {user.display_name || user.username}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>
          @{user.username}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <PanelBtn title="Mute" onClick={() => {}}>
          <Mic size={15} />
        </PanelBtn>
        <PanelBtn title="Deafen" onClick={() => {}}>
          <Headphones size={15} />
        </PanelBtn>
        <PanelBtn title="User Settings" onClick={() => navigate('/app/settings')}>
          <Settings size={15} />
        </PanelBtn>
      </div>
    </div>
  );
}

function PanelBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'var(--transition)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'none';
        e.currentTarget.style.color = 'var(--text-muted)';
      }}
    >
      {children}
    </button>
  );
}
