import { useParams } from 'react-router-dom';
import { useChannelStore } from '../store/channelStore';
import ChannelPage from './ChannelPage';
import ForumChannelPage from './ForumChannelPage';

/** Picks text vs forum channel UI for `.../channels/:channelId`. */
export default function ChannelViewRouter() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const { getChannels } = useChannelStore();
  const channel = getChannels(serverId || '').find((c) => c.id === channelId);

  if (channel?.type === 'forum') {
    return <ForumChannelPage />;
  }
  return <ChannelPage />;
}
