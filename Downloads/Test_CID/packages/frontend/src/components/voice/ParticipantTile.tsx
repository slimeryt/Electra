import { useEffect, useRef, useState } from 'react';
import { MicOff, VolumeX, Monitor, Video, Play } from 'lucide-react';
import { VoiceParticipant } from '../../types/models';
import { Avatar } from '../ui/Avatar';
import { useVoiceStore } from '../../store/voiceStore';
import { MediaManager } from '../../webrtc/MediaManager';

interface ParticipantTileProps {
  participant: VoiceParticipant;
  isLocal?: boolean;
  localStream?: MediaStream | null;
}

export function ParticipantTile({ participant, isLocal, localStream }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { remoteStreams, isDeafened } = useVoiceStore();
  const [speaking, setSpeaking] = useState(false);
  // Remote streams require an explicit click to view
  const [watching, setWatching] = useState(false);

  const stream = isLocal ? localStream : remoteStreams.get(participant.userId);
  const hasVideo = (participant.video || participant.screen) && !!stream;
  // Local stream: always show. Remote: only show if user clicked "watch".
  const showVideo = hasVideo && (isLocal || watching);

  useEffect(() => {
    if (videoRef.current && stream && showVideo) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = isLocal || isDeafened;
    }
  }, [stream, showVideo, isLocal, isDeafened]);

  // Remote voice-only (or not watching video): play audio via <audio> — <video> is not mounted, so without this you hear nobody.
  useEffect(() => {
    if (isLocal || !stream) return;
    const el = audioRef.current;
    if (!el) return;
    if (showVideo) {
      el.srcObject = null;
      try { el.pause(); } catch { /* ignore */ }
      return;
    }
    el.srcObject = stream;
    el.muted = isDeafened;
    void el.play().catch(() => {});
    return () => {
      el.srcObject = null;
      try { el.pause(); } catch { /* ignore */ }
    };
  }, [isLocal, stream, showVideo, isDeafened]);

  // When remote participant stops streaming, reset watch state
  useEffect(() => {
    if (!hasVideo) setWatching(false);
  }, [hasVideo]);

  useEffect(() => {
    if (!stream) return;
    if (!isLocal && participant.muted) {
      setSpeaking(false);
      return;
    }
    const getVolume = MediaManager.createVolumeAnalyser(stream);
    const interval = setInterval(() => {
      setSpeaking(getVolume() > 0.05);
    }, 100);
    return () => clearInterval(interval);
  }, [stream, isLocal, participant.muted]);

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(160deg, var(--bg-elevated) 0%, var(--bg-overlay) 100%)',
      border: `1.5px solid ${speaking ? 'var(--success)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      aspectRatio: '16/9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'border-color 120ms',
      boxShadow: speaking ? '0 0 0 3px rgba(34,197,94,0.20)' : 'var(--shadow-md)',
    }}>
      {!isLocal && stream && (
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
          aria-hidden
        />
      )}
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal || isDeafened}
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : hasVideo && !isLocal ? (
        /* Remote is streaming — show click-to-watch overlay */
        <div
          onClick={() => setWatching(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          <div style={{ position: 'relative' }}>
            <Avatar user={participant.user} size={56} />
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: 'rgba(88,101,242,0.18)',
            border: '1px solid rgba(88,101,242,0.35)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--accent)',
            fontSize: 12,
            fontWeight: 600,
          }}>
            <Play size={12} fill="currentColor" />
            {participant.screen ? 'Watch screen' : 'Watch camera'}
          </div>
        </div>
      ) : (
        /* No stream — just avatar */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Avatar user={participant.user} size={56} />
        </div>
      )}

      {/* Name label + status icons */}
      <div style={{
        position: 'absolute',
        bottom: 8, left: 8, right: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        <span style={{
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '4px 9px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 11.5,
          color: 'rgba(255,255,255,0.92)',
          fontWeight: 600,
          fontFamily: 'var(--font-heading)',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          letterSpacing: '0.01em',
        }}>
          {participant.user?.display_name || 'User'}
          {isLocal && <span style={{ opacity: 0.6 }}> (you)</span>}
        </span>

        {/* Status icons */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {participant.screen && (
            <StatusBadge><Monitor size={11} /></StatusBadge>
          )}
          {participant.video && !participant.screen && (
            <StatusBadge><Video size={11} /></StatusBadge>
          )}
          {participant.deafened && (
            <StatusBadge danger><VolumeX size={11} /></StatusBadge>
          )}
          {participant.muted && (
            <StatusBadge danger><MicOff size={11} /></StatusBadge>
          )}
        </div>
      </div>

      {/* Speaking ring */}
      {speaking && (
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          boxShadow: 'inset 0 0 0 2px var(--success), inset 0 0 20px rgba(34,197,94,0.08)',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}

function StatusBadge({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span style={{
      background: danger ? 'rgba(240,71,71,0.75)' : 'rgba(0,0,0,0.65)',
      backdropFilter: 'blur(4px)',
      padding: '3px 5px',
      borderRadius: 'var(--radius-sm)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
    }}>
      {children}
    </span>
  );
}
