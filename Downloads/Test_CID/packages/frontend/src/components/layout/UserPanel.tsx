import { useNavigate } from 'react-router-dom';
import { Settings, Mic, MicOff, Headphones, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useVoiceStore } from '../../store/voiceStore';
import { useVoiceChannel } from '../../webrtc/hooks/useVoiceChannel';
import { useChannelStore } from '../../store/channelStore';
import { useServerStore } from '../../store/serverStore';

export function UserPanel() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { activeServerId } = useServerStore();
  const { channelsByServer } = useChannelStore();
  const { activeChannelId: activeVoiceChannelId, isMuted, isDeafened } = useVoiceStore();
  const { leaveChannel, toggleMute, toggleDeafen } = useVoiceChannel();

  if (!user) return null;

  const inVoice = !!activeVoiceChannelId;
  const channels = activeServerId ? (channelsByServer[activeServerId] || []) : [];
  const voiceChannel = channels.find(c => c.id === activeVoiceChannelId);

  const handleDisconnect = () => {
    leaveChannel();
    if (activeServerId) navigate(`/app/servers/${activeServerId}`);
    else navigate('/app');
  };

  return (
    <div
      className="user-panel-dock"
      style={{
      position: 'fixed',
      bottom: 12,
      left: 12,
      width: inVoice ? 320 : 306,
      zIndex: 200,
      boxSizing: 'border-box',
      background: 'linear-gradient(var(--bg-base), var(--bg-base)) padding-box, var(--gradient-brand) border-box',
      border: '1px solid transparent',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 32px rgba(88,101,242,0.08)',
      backdropFilter: 'blur(28px)',
      WebkitBackdropFilter: 'blur(28px)',
      padding: inVoice ? '10px 10px 8px' : '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: inVoice ? 10 : 0,
      userSelect: 'none',
      transition: 'width 180ms ease, padding 180ms ease',
    }}
    >
      {inVoice && (
        <div style={{
          padding: '8px 10px',
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.18)',
          borderRadius: 'var(--radius-md)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', flexShrink: 0,
              boxShadow: '0 0 6px rgba(34,197,94,0.6)',
            }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', flex: 1, letterSpacing: '0.03em' }}>
              Voice Connected
            </span>
          </div>
          <div style={{
            fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 4,
            overflow: 'hidden',
          }}>
            <Volume2 size={11} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {voiceChannel?.name || 'Voice Channel'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleDisconnect}
            title="Disconnect"
            style={{
              width: '100%', height: 28, borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'rgba(240,71,71,0.15)', color: 'var(--danger)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 11, fontWeight: 600, transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,71,71,0.28)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(240,71,71,0.15)'; }}
          >
            <PhoneOff size={12} /> Disconnect
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        minHeight: 40,
      }}>
        <div style={{ flexShrink: 0 }}>
          <Avatar user={user} size={34} showStatus />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-heading)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {user.display_name || user.username}
          </div>
          <div style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.4,
            marginTop: 1,
          }}>
            {user.custom_status ? user.custom_status : `@${user.username}`}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <PanelBtn
            title={inVoice ? (isMuted ? 'Unmute' : 'Mute') : 'Mute'}
            active={inVoice && isMuted}
            activeTone="danger"
            onClick={() => { if (inVoice) toggleMute(); }}
            disabled={!inVoice}
          >
            {inVoice && isMuted ? <MicOff size={15} /> : <Mic size={15} />}
          </PanelBtn>
          <PanelBtn
            title={inVoice ? (isDeafened ? 'Undeafen' : 'Deafen') : 'Deafen'}
            active={inVoice && isDeafened}
            activeTone="accent"
            onClick={() => { if (inVoice) toggleDeafen(); }}
            disabled={!inVoice}
          >
            {inVoice && isDeafened ? <VolumeX size={15} /> : <Headphones size={15} />}
          </PanelBtn>
          <PanelBtn title="User Settings" onClick={() => navigate('/app/settings')}>
            <Settings size={15} />
          </PanelBtn>
        </div>
      </div>
    </div>
  );
}

const activeStyles = {
  danger: { bg: 'rgba(240,71,71,0.22)', color: 'var(--danger)' },
  accent: { bg: 'rgba(88,101,242,0.22)', color: 'var(--accent)' },
} as const;

function PanelBtn({
  children,
  title,
  onClick,
  active,
  activeTone = 'danger',
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
  activeTone?: keyof typeof activeStyles;
  disabled?: boolean;
}) {
  const tone = activeStyles[activeTone];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? tone.bg : 'none',
        border: 'none',
        color: active ? tone.color : 'var(--text-muted)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'var(--transition)',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (disabled) return;
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.09)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={e => {
        if (disabled) return;
        if (active) {
          e.currentTarget.style.background = tone.bg;
          e.currentTarget.style.color = tone.color;
        } else {
          e.currentTarget.style.background = 'none';
          e.currentTarget.style.color = 'var(--text-muted)';
        }
      }}
    >
      {children}
    </button>
  );
}
