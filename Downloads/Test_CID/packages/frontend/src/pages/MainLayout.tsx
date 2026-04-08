import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { ServerSidebar } from '../components/layout/ServerSidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { MemberList } from '../components/layout/MemberList';
import { DMList } from '../components/dm/DMList';
import { UserPanel } from '../components/layout/UserPanel';
import { useServerStore } from '../store/serverStore';
import { useFriendStore } from '../store/friendStore';

export default function MainLayout() {
  const { activeServerId } = useServerStore();
  const { requests } = useFriendStore();
  const location = useLocation();
  const navigate = useNavigate();
  const pendingCount = requests.filter(r => r.direction === 'incoming').length;
  const isFriendsActive = location.pathname === '/app/friends';

  // Only show the DM sidebar when there's no active server AND we're on a home/DM/friends route
  const showDmSidebar = !activeServerId && (
    location.pathname === '/app' ||
    location.pathname.startsWith('/app/dms') ||
    location.pathname === '/app/friends'
  );

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      /* Atmospheric background — panels float above this */
      background: 'var(--bg-base)',
      backgroundImage: [
        'radial-gradient(ellipse 80% 60% at 10% 70%, rgba(88,101,242,0.09) 0%, transparent 55%)',
        'radial-gradient(ellipse 60% 45% at 90% 15%, rgba(124,58,237,0.07) 0%, transparent 50%)',
        'radial-gradient(ellipse 50% 60% at 50% 110%, rgba(88,101,242,0.07) 0%, transparent 60%)',
      ].join(', '),
      padding: 8,
      gap: 6,
    }}>
      {/* Server rail — narrow floating pill */}
      <ServerSidebar />

      {/* Second sidebar: channel list or DM list */}
      {activeServerId ? (
        <ChannelSidebar serverId={activeServerId} />
      ) : showDmSidebar ? (
        /* DM sidebar — floating panel */
        <div style={{
          width: 240,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-panel)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '0 14px',
            height: 50,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--text-primary)',
              letterSpacing: '0.01em',
            }}>
              Messages
            </span>
          </div>

          {/* Friends nav item */}
          <div style={{ padding: '8px 8px 0' }}>
            <button
              onClick={() => navigate('/app/friends')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '7px 10px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: isFriendsActive ? 'var(--bg-active)' : 'transparent',
                color: isFriendsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: isFriendsActive ? 600 : 400,
                transition: 'all 150ms', fontFamily: 'inherit', textAlign: 'left',
              }}
              onMouseEnter={e => { if (!isFriendsActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!isFriendsActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
            >
              <Users size={16} />
              <span style={{ flex: 1 }}>Friends</span>
              {pendingCount > 0 && (
                <span style={{
                  background: 'var(--danger)', color: '#fff', borderRadius: 99,
                  fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center',
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* DM list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <DMList />
          </div>
        </div>
      ) : null}

      {/* Main content — floating card */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-panel)',
      }}>
        <Outlet />
      </div>

      {/* Member list — floating right panel */}
      {activeServerId && <MemberList serverId={activeServerId} />}

      {/* User panel — fixed floating overlay at bottom-left */}
      <UserPanel />
    </div>
  );
}
