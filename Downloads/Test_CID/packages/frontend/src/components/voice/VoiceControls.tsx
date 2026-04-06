import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Settings } from 'lucide-react';
import { useVoiceChannel } from '../../webrtc/hooks/useVoiceChannel';
import { Tooltip } from '../ui/Tooltip';
import { StreamSettingsModal } from './StreamSettingsModal';

interface ControlButtonProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  danger?: boolean;
  tooltip: string;
}

function ControlButton({ icon, active, onClick, danger, tooltip }: ControlButtonProps) {
  return (
    <Tooltip content={tooltip} placement="top">
      <button
        onClick={onClick}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: active
            ? (danger ? 'var(--danger)' : 'var(--bg-active)')
            : 'var(--bg-elevated)',
          color: active
            ? (danger ? '#fff' : 'var(--text-primary)')
            : 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition)',
          outline: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = danger
            ? 'var(--danger)'
            : 'var(--bg-hover)';
          e.currentTarget.style.color = danger ? '#fff' : 'var(--text-primary)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = active
            ? (danger ? 'var(--danger)' : 'var(--bg-active)')
            : 'var(--bg-elevated)';
          e.currentTarget.style.color = active
            ? (danger ? '#fff' : 'var(--text-primary)')
            : 'var(--text-secondary)';
        }}
      >
        {icon}
      </button>
    </Tooltip>
  );
}

export function VoiceControls({ onLeave }: { onLeave?: () => void }) {
  const [showSettings, setShowSettings] = useState(false);
  const {
    isMuted,
    isDeafened,
    isVideoEnabled,
    isScreenSharing,
    toggleMute,
    toggleDeafen,
    toggleVideo,
    toggleScreenShare,
    leaveChannel,
  } = useVoiceChannel();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '16px 24px',
      background: 'var(--bg-elevated)',
      borderTop: '1px solid var(--border)',
    }}>
      <ControlButton
        label="mute"
        icon={isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        active={isMuted}
        onClick={toggleMute}
        tooltip={isMuted ? 'Unmute' : 'Mute'}
      />
      <ControlButton
        label="deafen"
        icon={isDeafened ? <VolumeX size={18} /> : <Volume2 size={18} />}
        active={isDeafened}
        onClick={toggleDeafen}
        tooltip={isDeafened ? 'Undeafen' : 'Deafen'}
      />
      <ControlButton
        label="video"
        icon={isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
        active={isVideoEnabled}
        onClick={toggleVideo}
        tooltip={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
      />
      <ControlButton
        label="screen"
        icon={isScreenSharing ? <Monitor size={18} /> : <MonitorOff size={18} />}
        active={isScreenSharing}
        onClick={toggleScreenShare}
        tooltip={isScreenSharing ? 'Stop sharing' : 'Share screen'}
      />

      <ControlButton
        label="settings"
        icon={<Settings size={18} />}
        active={false}
        onClick={() => setShowSettings(true)}
        tooltip="Stream settings"
      />

      <div style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 4px' }} />

      <ControlButton
        label="leave"
        icon={<PhoneOff size={18} />}
        active={true}
        onClick={onLeave ?? leaveChannel}
        danger
        tooltip="Leave channel"
      />

      {showSettings && <StreamSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
