import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  divider?: boolean;
  disabled?: boolean;
}

interface ContextMenuState {
  items: ContextMenuItem[];
  x: number;
  y: number;
}

interface ContextMenuContextValue {
  show: (items: ContextMenuItem[], x: number, y: number) => void;
  hide: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue>({
  show: () => {},
  hide: () => {},
});

export function useContextMenu() {
  return useContext(ContextMenuContext);
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const show = useCallback((items: ContextMenuItem[], x: number, y: number) => {
    // Clamp to viewport
    const padding = 8;
    const menuWidth = 200;
    const menuHeight = items.length * 34 + 12;
    const clampedX = Math.min(x, window.innerWidth - menuWidth - padding);
    const clampedY = Math.min(y, window.innerHeight - menuHeight - padding);
    setMenu({ items, x: Math.max(padding, clampedX), y: Math.max(padding, clampedY) });
  }, []);

  const hide = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!menu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) hide();
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    const onScroll = () => hide();
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [menu, hide]);

  return (
    <ContextMenuContext.Provider value={{ show, hide }}>
      {children}
      <AnimatePresence>
        {menu && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.08 }}
            style={{
              position: 'fixed',
              left: menu.x,
              top: menu.y,
              zIndex: 99999,
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              padding: '4px',
              minWidth: 190,
              boxShadow: 'var(--shadow-lg)',
              userSelect: 'none',
            }}
          >
            {menu.items.map((item, i) =>
              item.divider ? (
                <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              ) : (
                <button
                  key={i}
                  disabled={item.disabled}
                  onClick={() => { if (!item.disabled) { item.onClick(); hide(); } }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '7px 10px',
                    background: 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: item.danger ? 'var(--danger)' : item.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontSize: 13,
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                    opacity: item.disabled ? 0.5 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!item.disabled) e.currentTarget.style.background = item.danger ? 'rgba(239,68,68,0.15)' : 'var(--bg-hover)';
                  }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                >
                  {item.icon && <span style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>}
                  {item.label}
                </button>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </ContextMenuContext.Provider>
  );
}
