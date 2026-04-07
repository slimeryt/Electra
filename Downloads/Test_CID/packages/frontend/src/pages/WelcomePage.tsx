import { MessageSquare, Hash, Compass, Zap } from 'lucide-react';
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
      padding: '32px 40px',
      gap: 36,
      userSelect: 'none',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 500,
        height: 300,
        background: 'radial-gradient(ellipse, rgba(88,101,242,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Greeting */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        {/* Logo mark */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--gradient-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          boxShadow: '0 8px 32px rgba(88,101,242,0.4)',
        }}>
          <Zap size={28} color="#fff" fill="#fff" />
        </div>

        <div style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 32,
          fontWeight: 800,
          background: 'var(--gradient-text)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 10,
          letterSpacing: '-0.6px',
          lineHeight: 1.15,
        }}>
          Welcome back{user?.display_name ? `,\n${user.display_name}` : ''}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {servers.length > 0
            ? 'Pick up where you left off.'
            : 'Get started by joining or creating a server.'}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: 500,
      }}>
        <QuickAction
          icon={<Hash size={22} />}
          label="Browse channels"
          sub="Find a place to chat"
          onClick={() => navigate('/app/discover')}
        />
        <QuickAction
          icon={<MessageSquare size={22} />}
          label="Direct messages"
          sub="Chat with someone"
          onClick={() => {}}
        />
        <QuickAction
          icon={<Compass size={22} />}
          label="Discover"
          sub="Explore public servers"
          onClick={() => navigate('/app/discover')}
        />
      </div>

      {/* Recent servers */}
      {servers.length > 0 && (
        <div style={{ width: '100%', maxWidth: 500 }}>
          <div style={{
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 10,
            paddingLeft: 2,
            fontFamily: 'var(--font-heading)',
          }}>
            Your servers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(88,101,242,0.15)';
                  (e.currentTarget.querySelector('.server-name') as HTMLElement).style.color = 'var(--text-primary)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'var(--bg-overlay)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                  (e.currentTarget.querySelector('.server-name') as HTMLElement).style.color = 'var(--text-secondary)';
                }}
              >
                {server.icon_url ? (
                  <img
                    src={server.icon_url}
                    alt={server.name}
                    style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: 34, height: 34,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--gradient-brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
                    fontFamily: 'var(--font-heading)',
                  }}>
                    {server.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="server-name" style={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'color var(--transition)',
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

function QuickAction({ icon, label, sub, onClick }: {
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
        gap: 10,
        padding: '20px 22px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-overlay)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        minWidth: 138,
        transition: 'all var(--transition-slow)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(88,101,242,0.14) 0%, rgba(124,58,237,0.07) 100%)';
        e.currentTarget.style.borderColor = 'var(--border-accent)';
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(88,101,242,0.22)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-overlay)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        width: 44, height: 44,
        borderRadius: 'var(--radius-md)',
        background: 'var(--accent-subtle)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          color: 'var(--text-primary)',
        }}>
          {label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
      </div>
    </div>
  );
}
