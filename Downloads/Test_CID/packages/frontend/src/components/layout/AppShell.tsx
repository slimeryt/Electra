import { Outlet } from 'react-router-dom';
import { ServerSidebar } from './ServerSidebar';
import { ChannelSidebar } from './ChannelSidebar';
import { MemberList } from './MemberList';
import { useServerStore } from '../../store/serverStore';

export function AppShell() {
  const { activeServerId } = useServerStore();

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-base)',
      padding: 8,
      gap: 6,
    }}>
      {/* Server rail — narrow floating pill */}
      <ServerSidebar />

      {/* Channel sidebar — floating panel */}
      {activeServerId && <ChannelSidebar serverId={activeServerId} />}

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
    </div>
  );
}
