import { useState, useEffect } from 'react';
import { bridge, platform } from '../../env';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState<'min' | 'max' | 'close' | null>(null);

  useEffect(() => {
    if (!bridge) return;
    bridge.isMaximized().then(setIsMaximized);
    const unsub = bridge.onMaximizeChange(setIsMaximized);
    return unsub;
  }, []);

  // Only render on Windows in Electron (Mac has native traffic lights)
  if (!bridge || platform !== 'win32') return null;

  const btn = (
    type: 'min' | 'max' | 'close',
    onClick: () => void,
    icon: React.ReactNode,
  ) => {
    const isClose = type === 'close';
    const hovered = isHovered === type;
    return (
      <button
        onMouseEnter={() => setIsHovered(type)}
        onMouseLeave={() => setIsHovered(null)}
        onClick={onClick}
        style={{
          width: 46,
          height: 32,
          border: 'none',
          background: hovered
            ? isClose ? '#e81123' : 'rgba(255,255,255,0.1)'
            : 'transparent',
          color: hovered && isClose ? '#fff' : 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 100ms, color 100ms',
          flexShrink: 0,
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
      >
        {icon}
      </button>
    );
  };

  return (
    <div
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'var(--bg-base)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
        zIndex: 9999,
        position: 'relative',
      } as React.CSSProperties}
    >
      {/* Left: icon + app name */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingLeft: 10, pointerEvents: 'none',
      }}>
        <img
          src="/icon.png"
          style={{ width: 14, height: 14, borderRadius: 2, objectFit: 'cover' }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>
          Electra
        </span>
      </div>

      {/* Right: window controls */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {btn('min', () => bridge!.minimizeWindow(), <MinimizeIcon />)}
        {btn('max', () => bridge!.maximizeWindow(), isMaximized ? <RestoreIcon /> : <MaximizeIcon />)}
        {btn('close', () => bridge!.closeWindow(), <CloseIcon />)}
      </div>
    </div>
  );
}

function MinimizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect x="0" y="4.5" width="10" height="1" fill="currentColor" />
    </svg>
  );
}

function MaximizeIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="0" y="2" width="8" height="8" fill="var(--bg-base)" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
      <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
