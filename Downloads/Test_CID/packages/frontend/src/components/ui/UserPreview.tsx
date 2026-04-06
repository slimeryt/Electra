import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, Calendar, X } from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { dmsApi } from '../../api/dms';
import { format } from 'date-fns';

export interface PreviewUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  status?: string;
  created_at?: number;
  role?: string;
}

interface UserPreviewProps {
  user: PreviewUser;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  currentUserId?: string;
}

const statusColors: Record<string, string> = {
  online: 'var(--online)',
  idle: 'var(--idle)',
  dnd: 'var(--dnd)',
  offline: 'var(--offline)',
};

const statusLabels: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

function hashColor(name = '') {
  const colors = ['#5865f2','#eb459e','#57f287','#fee75c','#ed4245','#9b59b6','#3498db'];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function UserPreview({ user, anchorRef, onClose, currentUserId }: UserPreviewProps) {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [dmLoading, setDmLoading] = useState(false);

  useEffect(() => {
    if (anchorRef.current && popoverRef.current) {
      const anchor = anchorRef.current.getBoundingClientRect();
      const popover = popoverRef.current.getBoundingClientRect();
      let left = anchor.right + 12;
      let top = anchor.top;
      // Clamp to viewport
      if (left + 300 > window.innerWidth) left = anchor.left - 300 - 12;
      if (top + popover.height > window.innerHeight) top = window.innerHeight - popover.height - 8;
      setPosition({ top: Math.max(8, top), left: Math.max(8, left) });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose, anchorRef]);

  const handleDm = async () => {
    if (user.id === currentUserId) return;
    setDmLoading(true);
    try {
      const { id } = await dmsApi.create(user.id);
      navigate(`/app/dms/${id}`);
      onClose();
    } finally {
      setDmLoading(false);
    }
  };

  const bannerColor = hashColor(user.display_name);
  const status = user.status || 'offline';

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.95, x: -8 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -8 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        width: 290,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Banner */}
      <div style={{ height: 72, background: `linear-gradient(135deg, ${bannerColor}cc, ${bannerColor}44)`, position: 'relative' }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        ><X size={12} /></button>
      </div>

      {/* Avatar (overlapping banner) */}
      <div style={{ padding: '0 16px', marginTop: -28, marginBottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ padding: 3, background: 'var(--bg-elevated)', borderRadius: '50%', display: 'inline-block' }}>
            <Avatar user={user} size={56} />
          </div>
          <span style={{
            position: 'absolute', bottom: 3, right: 3,
            width: 16, height: 16, borderRadius: '50%',
            background: statusColors[status] || 'var(--offline)',
            border: '3px solid var(--bg-elevated)',
          }} />
        </div>
        {user.id !== currentUserId && (
          <Button size="sm" onClick={handleDm} isLoading={dmLoading} style={{ marginBottom: 4 }}>
            Message
          </Button>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          {user.display_name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          @{user.username}
        </div>

        <div style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[status] || 'var(--offline)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{statusLabels[status] || 'Offline'}</span>
          </div>
          {user.role && user.role !== 'member' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Crown size={13} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{user.role}</span>
            </div>
          )}
          {user.created_at && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Calendar size={13} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Member since {format(new Date(user.created_at * 1000), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Hook to manage UserPreview state
export function useUserPreview() {
  const [previewUser, setPreviewUser] = useState<PreviewUser | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);

  const openPreview = (user: PreviewUser, anchor: HTMLElement) => {
    anchorRef.current = anchor;
    setPreviewUser(user);
  };

  const closePreview = () => setPreviewUser(null);

  return { previewUser, anchorRef: anchorRef as React.RefObject<HTMLElement>, openPreview, closePreview };
}
