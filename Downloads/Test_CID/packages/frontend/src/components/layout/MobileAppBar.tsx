import { useEffect, useState } from 'react';
import { Menu, Megaphone, MessagesSquare, Users, Volume2, X } from 'lucide-react';
import { matchPath, useLocation } from 'react-router-dom';
import { useChannelStore } from '../../store/channelStore';
import { useServerStore } from '../../store/serverStore';
import { useMobileNavStore } from '../../store/mobileNavStore';
import { useActiveDmForBar } from '../../hooks/useActiveDmForBar';
import { channelsApi } from '../../api/channels';

interface MobileAppBarProps {
  /** Server is active (show members toggle when on a server view). */
  hasServerContext: boolean;
}

export function MobileAppBar({ hasServerContext }: MobileAppBarProps) {
  const location = useLocation();
  const { servers } = useServerStore();
  const { channelsByServer } = useChannelStore();
  const { toggleLeft, toggleMembers, membersOpen, leftOpen } = useMobileNavStore();

  const forumPostMatch = matchPath('/app/servers/:serverId/channels/:channelId/posts/:postId', location.pathname);
  const chMatch = matchPath('/app/servers/:serverId/channels/:channelId', location.pathname);
  const voiceMatch = matchPath('/app/servers/:serverId/voice/:channelId', location.pathname);
  const dmMatch = matchPath('/app/dms/:dmId', location.pathname);

  const serverId = forumPostMatch?.params.serverId || chMatch?.params.serverId || voiceMatch?.params.serverId;
  const channelId = forumPostMatch?.params.channelId || chMatch?.params.channelId || voiceMatch?.params.channelId;
  const forumPostId = forumPostMatch?.params.postId;
  const dmId = dmMatch?.params.dmId;
  const dmBar = useActiveDmForBar(dmId);

  const [forumPostTitle, setForumPostTitle] = useState<string | null>(null);
  useEffect(() => {
    if (!forumPostId || !channelId) {
      setForumPostTitle(null);
      return;
    }
    let cancelled = false;
    channelsApi
      .getForumPost(channelId, forumPostId)
      .then((p) => {
        if (!cancelled) setForumPostTitle(p.title);
      })
      .catch(() => {
        if (!cancelled) setForumPostTitle(null);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, forumPostId]);

  let title = 'Electra';
  let subtitle: string | null = null;
  /** Channel row icon: # text, speaker voice, megaphone announcements, forum */
  let channelKind: 'text' | 'voice' | 'announcement' | 'forum' | 'forum_thread' | null = null;

  if (serverId && channelId) {
    const server = servers.find((s) => s.id === serverId);
    const ch = channelsByServer[serverId]?.find((c) => c.id === channelId);
    if (forumPostMatch && forumPostId) {
      channelKind = 'forum_thread';
      title = forumPostTitle || 'Thread';
      subtitle = ch?.name ? `#${ch.name}` : (server?.name ?? null);
    } else if (voiceMatch || ch?.type === 'voice') {
      channelKind = 'voice';
      title = ch?.name || (voiceMatch ? 'Voice' : 'Channel');
      subtitle = server?.name ?? null;
    } else if (ch?.type === 'announcement') {
      channelKind = 'announcement';
      title = ch?.name || 'Channel';
      subtitle = server?.name ?? null;
    } else if (ch?.type === 'forum') {
      channelKind = 'forum';
      title = ch?.name || 'Forum';
      subtitle = server?.name ?? null;
    } else {
      channelKind = 'text';
      title = ch?.name || 'Channel';
      subtitle = server?.name ?? null;
    }
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
          ) : channelKind === 'forum' ? (
            <span className="mobile-app-bar__title-row">
              <MessagesSquare size={16} strokeWidth={2} className="mobile-app-bar__ch-icon" aria-hidden />
              <span className="mobile-app-bar__title-text">{title}</span>
            </span>
          ) : channelKind === 'forum_thread' ? (
            <span className="mobile-app-bar__title-row">
              <MessagesSquare size={16} strokeWidth={2} className="mobile-app-bar__ch-icon" aria-hidden />
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
