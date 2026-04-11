import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useChannelStore } from '../store/channelStore';
import ChannelPage from './ChannelPage';
import ForumChannelPage from './ForumChannelPage';

/** Picks text vs forum channel UI for `.../channels/:channelId`. */
export default function ChannelViewRouter() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const fetchChannels = useChannelStore((s) => s.fetchChannels);
  const listReady = useChannelStore((s) => (serverId ? s.channelListReadyByServer[serverId] : false));
  const channels = useChannelStore((s) => (serverId ? s.channelsByServer[serverId] ?? [] : []));
  const channel = channels.find((c) => c.id === channelId);

  useEffect(() => {
    if (!serverId || listReady) return;
    void fetchChannels(serverId);
  }, [serverId, listReady, fetchChannels]);

  if (!serverId || !channelId) {
    return null;
  }

  if (!listReady) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>
        Loading channel…
      </div>
    );
  }

  if (!channel) {
    return (
      <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>
        Channel not found.
      </div>
    );
  }

  if (channel.type === 'forum') {
    return <ForumChannelPage />;
  }
  return <ChannelPage />;
}
