import { useState, ReactNode, CSSProperties } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  placement?: 'top' | 'right' | 'bottom' | 'left';
}

const placementStyles: Record<string, CSSProperties> = {
  top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6 },
  right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 6 },
  bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 6 },
  left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: 6 },
};

export function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute',
          ...placementStyles[placement],
          zIndex: 9999,
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          padding: '4px 8px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: 'var(--shadow-md)',
        }}>
          {content}
        </div>
      )}
    </div>
  );
}
