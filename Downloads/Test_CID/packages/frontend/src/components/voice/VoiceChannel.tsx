import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useVoiceChannel } from '../../webrtc/hooks/useVoiceChannel';
import { useAuthStore } from '../../store/authStore';
import { useChannelStore } from '../../store/channelStore';
import { ParticipantTile } from './ParticipantTile';
import { VoiceControls } from './VoiceControls';
import { Spinner } from '../ui/Spinner';
import { VoiceParticipant } from '../../types/models';

export function VoiceChannel() {
  const { channelId, serverId } = useParams<{ channelId: string; serverId: string }>();
  const { user } = useAuthStore();
  const { channelsByServer } = useChannelStore();
  const {
    activeChannelId,
    joiningChannelId,
    voiceJoinError,
    clearJoinError,
    participants,
    localStream,
    isVideoEnabled,
    isScreenSharing,
    joinChannel,
    leaveChannel,
  } = useVoiceChannel();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  const channels = channelsByServer[serverId || ''] || [];
  const channelName = channels.find(c => c.id === channelId)?.name;

  useEffect(() => {
    setHasLeft(false);
  }, [channelId]);

  useEffect(() => {
    if (hasLeft) return;
    if (channelId && activeChannelId !== channelId) {
      setTimedOut(false);
      joinChannel(channelId);
    }
  }, [channelId, joinChannel, activeChannelId, hasLeft]);

  useEffect(() => {
    if (activeChannelId === channelId) setTimedOut(false);
  }, [activeChannelId, channelId]);

  useEffect(() => {
    if (!channelId || hasLeft || voiceJoinError) return;
    if (activeChannelId === channelId) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [channelId, hasLeft, voiceJoinError, activeChannelId]);

  const isConnecting = !!(channelId && !hasLeft && activeChannelId !== channelId);
  const isInCall = !!(channelId && activeChannelId === channelId);

  if (!channelId) {
    return null;
  }

  if (voiceJoinError && !isInCall) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <AlertTriangle size={36} style={{ color: 'var(--danger)', opacity: 0.9 }} />
        <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>Could not join voice</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', maxWidth: 320 }}>{voiceJoinError}</span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              clearJoinError();
              setTimedOut(false);
              joinChannel(channelId);
            }}
            style={{ padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{ padding: '8px 20px', background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (isConnecting || timedOut) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        {timedOut ? (
          <>
            <AlertTriangle size={36} style={{ color: 'var(--danger)', opacity: 0.9 }} />
            <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>Failed to join voice channel</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Check your microphone permissions or server connection.</span>
            <button
              type="button"
              onClick={() => {
                setTimedOut(false);
                joinChannel(channelId);
              }}
              style={{ marginTop: 8, padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{ marginTop: 4, padding: '8px 20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}
            >
              Go back
            </button>
          </>
        ) : (
          <>
            <Spinner size={32} />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {joiningChannelId === channelId ? `Joining${channelName ? ` ${channelName}` : ''}…` : 'Connecting…'}
            </span>
          </>
        )}
      </div>
    );
  }

  if (!isInCall) {
    return null;
  }

  const localParticipant: VoiceParticipant = {
    userId: user?.id || '',
    user: {
      id: user?.id || '',
      username: user?.username || '',
      display_name: user?.display_name || '',
      avatar_url: user?.avatar_url || null,
    },
    muted: false,
    deafened: false,
    video: isVideoEnabled,
    screen: isScreenSharing,
  };

  const allParticipants: VoiceParticipant[] = [
    localParticipant,
    ...participants.filter(p => p.userId !== user?.id),
  ];

  const count = allParticipants.length;
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        flex: 1,
        padding: 16,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
        alignContent: 'start',
        overflowY: 'auto',
      }}>
        {allParticipants.map(p => (
          <ParticipantTile
            key={p.userId}
            participant={p}
            isLocal={p.userId === user?.id}
            localStream={p.userId === user?.id ? localStream : undefined}
          />
        ))}
      </div>

      <VoiceControls onLeave={() => {
        setHasLeft(true);
        leaveChannel();
        navigate(serverId ? `/app/servers/${serverId}` : '/app');
      }} />
    </div>
  );
}
