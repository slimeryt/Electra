import { useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  x: number;
  y: number;
  onClose: () => void;
}

export function ContextMenu({ items, x, y, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mouseHandler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', mouseHandler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', mouseHandler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{
          position: 'fixed',
          left: x,
          top: y,
          zIndex: 9999,
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          minWidth: 180,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {items.map((item, i) =>
          item.divider ? (
            <div
              key={i}
              style={{ height: 1, background: 'var(--border)', margin: '4px 0' }}
            />
          ) : (
            <button
              key={i}
              onClick={() => { item.onClick(); onClose(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 10px',
                background: 'none',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                color: item.danger ? 'var(--danger)' : 'var(--text-primary)',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = item.danger
                  ? 'rgba(239,68,68,0.15)'
                  : 'var(--bg-hover)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              {item.icon && (
                <span style={{ opacity: 0.7, display: 'flex', alignItems: 'center' }}>
                  {item.icon}
                </span>
              )}
              {item.label}
            </button>
          )
        )}
      </motion.div>
    </AnimatePresence>
  );
}
