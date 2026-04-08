import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { bridge, isElectron, type DisplayMediaPickerSource } from '../../env';

type Tab = 'screen' | 'window';

/**
 * Electron-only: main process opens this via IPC when getDisplayMedia runs.
 * Lets the user choose a full display or a single application window.
 */
export function ScreenSharePickerModal() {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<DisplayMediaPickerSource[]>([]);
  const [tab, setTab] = useState<Tab>('screen');
  const [picking, setPicking] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isElectron || !bridge?.onDisplayMediaPickerOpen) return;

    const unsubOpen = bridge.onDisplayMediaPickerOpen((data) => {
      const list = data.sources ?? [];
      setSources(list);
      const screens = list.filter((s) => s.kind === 'screen');
      const wins = list.filter((s) => s.kind === 'window');
      setTab(screens.length === 0 && wins.length > 0 ? 'window' : 'screen');
      setOpen(true);
    });
    const unsubClose = bridge.onDisplayMediaPickerClose(() => {
      setOpen(false);
      setSources([]);
      setPicking(false);
    });

    return () => {
      unsubOpen();
      unsubClose();
    };
  }, []);

  const filtered = useMemo(() => sources.filter((s) => s.kind === tab), [sources, tab]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open && !picking) {
        void bridge?.cancelDisplayPicker();
        setOpen(false);
        setSources([]);
      }
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, picking]);

  const onCancel = () => {
    if (picking) return;
    void bridge?.cancelDisplayPicker();
    setOpen(false);
    setSources([]);
  };

  const onPick = async (id: string) => {
    if (!bridge?.selectDisplaySource || picking) return;
    setPicking(true);
    try {
      await bridge.selectDisplaySource(id);
      setOpen(false);
      setSources([]);
    } finally {
      setPicking(false);
    }
  };

  if (!isElectron) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          role="dialog"
          aria-modal
          aria-labelledby="screen-share-picker-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (picking) return;
            if (e.target === overlayRef.current) onCancel();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'clamp(12px, 4vw, 24px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: 'min(820px, calc(100vw - 24px))',
              maxHeight: 'min(90dvh, 640px)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 20px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <h2
                id="screen-share-picker-title"
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                Share your screen
              </h2>
              <button
                type="button"
                disabled={picking}
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: picking ? 'default' : 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 20px', flexShrink: 0 }}>
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  background: 'var(--bg-base)',
                  padding: 4,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                }}
              >
                {(['screen', 'window'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={picking}
                    onClick={() => setTab(k)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: picking ? 'default' : 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      background: tab === k ? 'var(--bg-hover)' : 'transparent',
                      color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'var(--transition)',
                    }}
                  >
                    {k === 'screen' ? 'Entire screen' : 'Application window'}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '8px 20px 20px',
                overflowY: 'auto',
                flex: 1,
                minHeight: 200,
              }}
            >
              {filtered.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '24px 0', textAlign: 'center' }}>
                  No {tab === 'screen' ? 'displays' : 'windows'} available. Try the other tab.
                </p>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 12,
                  }}
                >
                  {filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      disabled={picking}
                      onClick={() => void onPick(s.id)}
                      style={{
                        textAlign: 'left',
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        background: 'var(--bg-base)',
                        cursor: picking ? 'wait' : 'pointer',
                        transition: 'var(--transition)',
                      }}
                    >
                      <div
                        style={{
                          aspectRatio: '16 / 9',
                          background: '#111',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {s.thumbnailDataUrl ? (
                          <img
                            src={s.thumbnailDataUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No preview</span>
                        )}
                      </div>
                      <div
                        style={{
                          padding: '10px 12px',
                          fontSize: 13,
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                          lineHeight: 1.35,
                          maxHeight: 44,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={s.name}
                      >
                        {s.name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
