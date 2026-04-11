import { Menu, Megaphone, Users, Volume2, X } from 'lucide-react';
import { matchPath, useLocation } from 'react-router-dom';
import { useChannelStore } from '../../store/channelStore';
import { useServerStore } from '../../store/serverStore';
import { useMobileNavStore } from '../../store/mobileNavStore';
import { useActiveDmForBar } from '../../hooks/useActiveDmForBar';

interface MobileAppBarProps {
  /** Server is active (show members toggle when on a server view). */
  hasServerContext: boolean;
}

export function MobileAppBar({ hasServerContext }: MobileAppBarProps) {
  const location = useLocation();
  const { servers } = useServerStore();
  const { channelsByServer } = useChannelStore();
  const { toggleLeft, toggleMembers, membersOpen, leftOpen } = useMobileNavStore();

  const chMatch = matchPath('/app/servers/:serverId/channels/:channelId', location.pathname);
  const voiceMatch = matchPath('/app/servers/:serverId/voice/:channelId', location.pathname);
  const dmMatch = matchPath('/app/dms/:dmId', location.pathname);

  const serverId = chMatch?.params.serverId || voiceMatch?.params.serverId;
  const channelId = chMatch?.params.channelId || voiceMatch?.params.channelId;
  const dmId = dmMatch?.params.dmId;
  const dmBar = useActiveDmForBar(dmId);

  let title = 'Electra';
  let subtitle: string | null = null;
  /** Channel row icon: # text, speaker voice, megaphone announcements */
  let channelKind: 'text' | 'voice' | 'announcement' | null = null;

  if (serverId && channelId) {
    const server = servers.find((s) => s.id === serverId);
    const ch = channelsByServer[serverId]?.find((c) => c.id === channelId);
    if (voiceMatch || ch?.type === 'voice') channelKind = 'voice';
    else if (ch?.type === 'announcement') channelKind = 'announcement';
    else channelKind = 'text';
    title = ch?.name || (voiceMatch ? 'Voice' : 'Channel');
    subtitle = server?.name ?? null;
  } else if (dmMatch && dmBar) {
    title = dmBar.title;
    subtitle = dmBar.subtitle;
  } else if (dmMatch) {
    title = 'Direct messages';
  } else if (location.pathname === '/app/friends') {
    title = 'Friends';
  } else if (location.pathname === '/app') {
    title = 'Home';
  }

  const showMembers = hasServerContext && !!serverId;

  return (
    <header className="mobile-app-bar" role="banner">
      <button
        type="button"
        className="mobile-app-bar__icon-btn"
        aria-label={leftOpen ? 'Close menu' : 'Open menu'}
        onClick={toggleLeft}
      >
        {leftOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
      </button>
      <div className="mobile-app-bar__titles">
        <div className="mobile-app-bar__title">
          {channelKind === 'voice' ? (
            <span className="mobile-app-bar__title-row">
              <Volume2 size={16} strokeWidth={2} className="mobile-app-bar__ch-icon" aria-hidden />
              <span className="mobile-app-bar__title-text">{title}</span>
            </span>
          ) : channelKind === 'announcement' ? (
            <span className="mobile-app-bar__title-row">
              <Megaphone size={16} strokeWidth={2} className="mobile-app-bar__ch-icon" aria-hidden />
              <span className="mobile-app-bar__title-text">{title}</span>
            </span>
          ) : channelKind === 'text' ? (
            <span className="mobile-app-bar__title-row">
              <span className="mobile-app-bar__hash" aria-hidden>
                #
              </span>
              <span className="mobile-app-bar__title-text">{title}</span>
            </span>
          ) : (
            title
          )}
        </div>
        {subtitle ? <div className="mobile-app-bar__subtitle">{subtitle}</div> : null}
      </div>
      {showMembers ? (
        <button
          type="button"
          className="mobile-app-bar__icon-btn"
          aria-label={membersOpen ? 'Close member list' : 'Open member list'}
          onClick={toggleMembers}
          style={membersOpen ? { color: 'var(--accent)' } : undefined}
        >
          <Users size={20} strokeWidth={2} />
        </button>
      ) : (
        <span className="mobile-app-bar__icon-spacer" aria-hidden />
      )}
    </header>
  );
}
