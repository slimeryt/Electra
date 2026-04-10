import { useState, useEffect } from 'react';
import { Minus, Square, Copy, X, RefreshCw } from 'lucide-react';
import { bridge, platform } from '../../env';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState<'min' | 'max' | 'close' | 'update' | null>(null);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (!bridge) return;
    bridge.isMaximized().then(setIsMaximized);
    const unsubMax = bridge.onMaximizeChange(setIsMaximized);
    const unsubUpdate = bridge.onUpdateReady((version) => setUpdateVersion(version));
    return () => { unsubMax(); unsubUpdate(); };
  }, []);

  const handleInstallUpdate = async () => {
    if (!bridge || isInstalling) return;
    setIsInstalling(true);
    await bridge.installUpdate();
    // If we're still here after a moment, reset (install failed)
    setTimeout(() => setIsInstalling(false), 5000);
  };

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

      {/* Right: update button + window controls */}
      <div style={{ display: 'flex', alignItems: 'center', WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {updateVersion && (
          <button
            onMouseEnter={() => setIsHovered('update')}
            onMouseLeave={() => setIsHovered(null)}
            onClick={handleInstallUpdate}
            disabled={isInstalling}
            title={`Update to v${updateVersion} — click to install`}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              height: 22, padding: '0 10px', marginRight: 8,
              border: 'none', borderRadius: 4,
              background: isHovered === 'update' ? '#22a85a' : '#2ecc71',
              color: '#fff',
              cursor: isInstalling ? 'wait' : 'pointer',
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              transition: 'background 120ms',
              WebkitAppRegion: 'no-drag',
              animation: isInstalling ? 'none' : 'update-pulse 2s ease-in-out infinite',
            } as React.CSSProperties}
          >
            <RefreshCw size={11} style={{ animation: isInstalling ? 'spin 0.8s linear infinite' : 'none' }} />
            {isInstalling ? 'Installing…' : `Update v${updateVersion}`}
          </button>
        )}
        {btn('min',   () => bridge!.minimizeWindow(), <Minus size={12} />)}
        {btn('max',   () => bridge!.maximizeWindow(), isMaximized ? <Copy size={12} /> : <Square size={12} />)}
        {btn('close', () => bridge!.closeWindow(),    <X size={12} />)}
      </div>
    </div>
  );
}
