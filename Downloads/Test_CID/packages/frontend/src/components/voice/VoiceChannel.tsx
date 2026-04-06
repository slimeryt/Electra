import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useVoiceChannel } from '../../webrtc/hooks/useVoiceChannel';
import { useAuthStore } from '../../store/authStore';
import { ParticipantTile } from './ParticipantTile';
import { VoiceControls } from './VoiceControls';
import { Spinner } from '../ui/Spinner';
import { VoiceParticipant } from '../../types/models';

export function VoiceChannel() {
  const { channelId, serverId } = useParams<{ channelId: string; serverId: string }>();
  const { user } = useAuthStore();
  const { activeChannelId, participants, localStream, isVideoEnabled, isScreenSharing, joinChannel, leaveChannel } = useVoiceChannel();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);
  const [hasLeft, setHasLeft] = useState(false);

  useEffect(() => {
    if (hasLeft) return;
    if (channelId && activeChannelId !== channelId) {
      setTimedOut(false);
      joinChannel(channelId);
    }
  }, [channelId, joinChannel, activeChannelId, hasLeft]);

  // Show error if still connecting after 8 seconds
  useEffect(() => {
    if (activeChannelId) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [activeChannelId]);

  if (!activeChannelId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        {timedOut ? (
          <>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 600 }}>Failed to join voice channel</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Check your microphone permissions or server connection.</span>
            <button
              onClick={() => navigate(-1)}
              style={{ marginTop: 8, padding: '8px 20px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
            >
              Go back
            </button>
          </>
        ) : (
          <>
            <Spinner size={32} />
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Connecting...</span>
          </>
        )}
      </div>
    );
  }

  // Build participant list with local user first
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
      {/* Participant grid */}
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

      {/* Controls */}
      <VoiceControls onLeave={() => {
        setHasLeft(true);
        leaveChannel();
        navigate(serverId ? `/app/servers/${serverId}` : '/app');
      }} />
    </div>
  );
}
