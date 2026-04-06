import { MessageSquare, Hash, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useServerStore } from '../store/serverStore';
import { useAuthStore } from '../store/authStore';

export default function WelcomePage() {
  const { servers } = useServerStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 32,
      userSelect: 'none',
    }}>
      {/* Greeting */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          background: 'linear-gradient(135deg, var(--text-primary) 30%, rgba(255,255,255,0.5))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8,
          letterSpacing: '-0.5px',
        }}>
          Welcome back{user?.display_name ? `, ${user.display_name}` : ''}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          {servers.length > 0
            ? 'Pick up where you left off.'
            : 'Get started by joining or creating a server.'}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 480,
      }}>
        <QuickAction
          icon={<Hash size={20} />}
          label="Browse channels"
          sub="Find a place to chat"
          onClick={() => navigate('/app/discover')}
        />
        <QuickAction
          icon={<MessageSquare size={20} />}
          label="Direct messages"
          sub="Chat with someone"
          onClick={() => {}}
        />
        <QuickAction
          icon={<Compass size={20} />}
          label="Discover"
          sub="Explore public servers"
          onClick={() => navigate('/app/discover')}
        />
      </div>

      {/* Recent servers */}
      {servers.length > 0 && (
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 10,
            paddingLeft: 4,
          }}>
            Your servers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {servers.slice(0, 5).map(server => (
              <div
                key={server.id}
                onClick={() => navigate(`/app/servers/${server.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  background: 'var(--bg-overlay)',
                  border: '1px solid var(--border)',
                  transition: 'all var(--transition)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                  e.currentTarget.style.borderColor = 'var(--border-accent)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(88,101,242,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-overlay)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {server.icon_url ? (
                  <img
                    src={server.icon_url}
                    alt={server.name}
                    style={{
                      width: 36, height: 36,
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                  }}>
                    {server.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {server.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        padding: '20px 24px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        minWidth: 130,
        transition: 'all var(--transition)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-hover)';
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(88,101,242,0.2)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-overlay)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ color: 'var(--accent)' }}>{icon}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}
