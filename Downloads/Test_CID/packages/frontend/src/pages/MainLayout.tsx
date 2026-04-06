import { Outlet, useLocation } from 'react-router-dom';
import { ServerSidebar } from '../components/layout/ServerSidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { MemberList } from '../components/layout/MemberList';
import { DMList } from '../components/dm/DMList';
import { UserPanel } from '../components/layout/UserPanel';
import { useServerStore } from '../store/serverStore';

export default function MainLayout() {
  const { activeServerId } = useServerStore();
  const location = useLocation();

  // Only show the DM sidebar when there's no active server AND we're on a home/DM route
  const showDmSidebar = !activeServerId && (
    location.pathname === '/app' ||
    location.pathname.startsWith('/app/dms')
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
        'radial-gradient(ellipse 70% 55% at 12% 65%, rgba(88,101,242,0.07) 0%, transparent 55%)',
        'radial-gradient(ellipse 55% 40% at 88% 18%, rgba(88,101,242,0.045) 0%, transparent 50%)',
        'radial-gradient(ellipse 45% 55% at 50% 105%, rgba(88,101,242,0.05) 0%, transparent 60%)',
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
