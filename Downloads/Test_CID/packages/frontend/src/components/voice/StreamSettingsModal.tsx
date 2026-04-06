import { Monitor, X } from 'lucide-react';
import { useStreamSettingsStore, StreamFps, StreamQuality } from '../../store/streamSettingsStore';

interface Props {
  onClose: () => void;
}

export function StreamSettingsModal({ onClose }: Props) {
  const { fps, quality, setFps, setQuality } = useStreamSettingsStore();

  const fpsOptions: StreamFps[] = [15, 30, 60];
  const qualityOptions: StreamQuality[] = ['480p', '720p', '1080p'];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-float)',
        width: 380,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Monitor size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              Stream Settings
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', transition: 'var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Frame rate */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
            }}>
              Frame Rate
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {fpsOptions.map(f => (
                <button
                  key={f}
                  onClick={() => setFps(f)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${fps === f ? 'var(--accent)' : 'var(--border)'}`,
                    background: fps === f ? 'var(--accent-subtle)' : 'var(--bg-overlay)',
                    color: fps === f ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: fps === f ? 700 : 400,
                    transition: 'var(--transition)',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (fps !== f) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={e => { if (fps !== f) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10,
            }}>
              Resolution
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {qualityOptions.map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${quality === q ? 'var(--accent)' : 'var(--border)'}`,
                    background: quality === q ? 'var(--accent-subtle)' : 'var(--bg-overlay)',
                    color: quality === q ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: quality === q ? 700 : 400,
                    transition: 'var(--transition)',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (quality !== q) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={e => { if (quality !== q) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <div style={{
            padding: '10px 14px',
            background: 'var(--bg-overlay)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            Settings apply when you next start sharing your camera or screen. Higher quality uses more CPU and bandwidth.
          </div>
        </div>
      </div>
    </div>
  );
}
