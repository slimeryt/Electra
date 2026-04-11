import { useEffect } from 'react';
import clsx from 'clsx';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { ServerSidebar } from '../components/layout/ServerSidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { MemberList } from '../components/layout/MemberList';
import { DMList } from '../components/dm/DMList';
import { UserPanel } from '../components/layout/UserPanel';
import { MobileAppBar } from '../components/layout/MobileAppBar';
import { useServerStore } from '../store/serverStore';
import { useFriendStore } from '../store/friendStore';
import { useVoiceStore } from '../store/voiceStore';
import { usePhoneLayout } from '../hooks/useMediaQuery';
import { useMobileNavStore } from '../store/mobileNavStore';

export default function MainLayout() {
  const { activeServerId } = useServerStore();
  const { requests } = useFriendStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isPhone = usePhoneLayout();
  const leftOpen = useMobileNavStore((s) => s.leftOpen);
  const membersOpen = useMobileNavStore((s) => s.membersOpen);

  const pendingCount = requests.filter((r) => r.direction === 'incoming').length;
  const isFriendsActive = location.pathname === '/app/friends';
  const inVoice = useVoiceStore((s) => !!s.activeChannelId);

  const isFullscreen =
    location.pathname === '/app/settings' || location.pathname.startsWith('/app/discover');

  const showDmSidebar =
    !isFullscreen &&
    !activeServerId &&
    (location.pathname === '/app' ||
      location.pathname.startsWith('/app/dms') ||
      location.pathname === '/app/friends');

  const layoutPhoneNav = isPhone && !isFullscreen;

  useEffect(() => {
    if (isPhone) useMobileNavStore.getState().closeAll();
  }, [location.pathname, isPhone]);

  const dmSidebarCard = (
    <div
      style={{
        width: '100%',
        height: '100%',
        minHeight: 200,
        background: 'var(--bg-elevated)',
        borderRadius: layoutPhoneNav ? 0 : 'var(--radius-lg)',
        boxShadow: layoutPhoneNav ? 'none' : 'var(--shadow-panel)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0 14px',
          height: 50,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: 'var(--text-primary)',
            letterSpacing: '0.01em',
          }}
        >
          Messages
        </span>
      </div>

      <div style={{ padding: '8px 8px 0' }}>
        <button
          type="button"
          onClick={() => navigate('/app/friends')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '7px 10px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            background: isFriendsActive ? 'var(--bg-active)' : 'transparent',
            color: isFriendsActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: isFriendsActive ? 600 : 400,
            transition: 'all 150ms',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            if (!isFriendsActive) {
              e.currentTarget.style.background = 'var(--bg-hover)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isFriendsActive) {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }
          }}
        >
          <Users size={16} />
          <span style={{ flex: 1 }}>Friends</span>
          {pendingCount > 0 && (
            <span
              style={{
                background: 'var(--danger)',
                color: '#fff',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
                padding: '1px 5px',
                minWidth: 16,
                textAlign: 'center',
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <DMList />
      </div>
    </div>
  );

  const channelColumn =
    !isFullscreen && activeServerId ? (
      <div className="app-shell-channels">
        <ChannelSidebar serverId={activeServerId} />
      </div>
    ) : showDmSidebar ? (
      <div className="app-shell-channels">{dmSidebarCard}</div>
    ) : null;

  const shellBg = layoutPhoneNav
    ? ({ background: '#1e1f22', backgroundImage: 'none' } as const)
    : ({
        background: 'var(--bg-base)',
        backgroundImage: [
          'radial-gradient(ellipse 80% 60% at 10% 70%, rgba(88,101,242,0.09) 0%, transparent 55%)',
          'radial-gradient(ellipse 60% 45% at 90% 15%, rgba(124,58,237,0.07) 0%, transparent 50%)',
          'radial-gradient(ellipse 50% 60% at 50% 110%, rgba(88,101,242,0.07) 0%, transparent 60%)',
        ].join(', '),
      } as const);

  return (
    <div
      className={clsx(
        'app-shell',
        layoutPhoneNav && 'app-shell--phone',
        layoutPhoneNav && inVoice && 'app-shell--phone--voice',
        isPhone && isFullscreen && 'app-shell--phone-fs',
      )}
      style={shellBg}
    >
      {layoutPhoneNav && (
        <>
          {(leftOpen || membersOpen) && (
            <button
              type="button"
              className="mobile-nav-backdrop"
              aria-label="Close navigation"
              onClick={() => useMobileNavStore.getState().closeAll()}
            />
          )}
          <div
            className={clsx('mobile-nav-drawer mobile-nav-drawer--left', leftOpen && 'is-open')}
          >
            <div className="app-shell-rail mobile-nav-rail">
              <ServerSidebar />
            </div>
            {channelColumn}
          </div>
          <div
            className={clsx(
              'mobile-nav-drawer mobile-nav-drawer--right',
              membersOpen && 'is-open',
            )}
          >
            {activeServerId ? (
              <div className="mobile-nav-drawer__members-inner">
                <MemberList serverId={activeServerId} />
              </div>
            ) : null}
          </div>
          <MobileAppBar hasServerContext={!!activeServerId} />
        </>
      )}

      {!isPhone && (
        <>
          <div className="app-shell-rail">
            <ServerSidebar />
          </div>
          {channelColumn}
        </>
      )}

      <div
        className="app-shell-main"
        style={{
          background: layoutPhoneNav ? '#313338' : 'var(--bg-elevated)',
          borderRadius: layoutPhoneNav || (isPhone && isFullscreen) ? 0 : 'var(--radius-lg)',
          boxShadow: layoutPhoneNav ? 'none' : 'var(--shadow-panel)',
        }}
      >
        <Outlet />
      </div>

      {!isPhone && !isFullscreen && activeServerId && (
        <div className="app-shell-members">
          <MemberList serverId={activeServerId} />
        </div>
      )}

      {!(isPhone && isFullscreen) && <UserPanel />}
    </div>
  );
}
