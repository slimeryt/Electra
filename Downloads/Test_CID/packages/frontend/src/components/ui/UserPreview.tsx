import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { UserPlus, Check, X } from 'lucide-react';
import { Button } from './Button';
import { ProfileCardBody } from './ProfileCard';
import { dmsApi } from '../../api/dms';
import { usersApi } from '../../api/users';
import { useFriendStore } from '../../store/friendStore';
import type { User, ServerRole } from '../../types/models';

export interface PreviewUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  status?: string;
  created_at?: number;
  role?: string;
  roles?: ServerRole[];
}

interface UserPreviewProps {
  user: PreviewUser;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  currentUserId?: string;
}

export function UserPreview({ user, anchorRef, onClose, currentUserId }: UserPreviewProps) {
  const navigate = useNavigate();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, placed: false });
  const [dmLoading, setDmLoading] = useState(false);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { friends, requests, fetchFriends, fetchRequests, sendRequest, acceptRequest, declineRequest } = useFriendStore();

  const friendState = useMemo(() => {
    const uid = user.id;
    const isFriend = friends.some((f) => f.status === 'accepted' && f.user.id === uid);
    const outgoing = requests.find((r) => r.status === 'pending' && r.direction === 'outgoing' && r.user.id === uid);
    const incoming = requests.find((r) => r.status === 'pending' && r.direction === 'incoming' && r.user.id === uid);
    return { isFriend, outgoing, incoming };
  }, [friends, requests, user.id]);

  // Fetch the full profile so we get banner, bio, accent, badges, etc.
  useEffect(() => {
    setLoading(true);
    setProfile(null);
    setFriendError(null);
    usersApi.getProfile(user.id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [user.id]);

  useEffect(() => {
    if (!currentUserId || user.id === currentUserId) return;
    void fetchFriends();
    void fetchRequests();
  }, [user.id, currentUserId, fetchFriends, fetchRequests]);

  // Reposition every time the content height may have changed (on load finish)
  useEffect(() => {
    if (!anchorRef.current || !popoverRef.current) return;
    const anchor = anchorRef.current.getBoundingClientRect();
    const popH = popoverRef.current.offsetHeight || 380;
    let left = anchor.right + 12;
    let top = anchor.top;
    if (left + 300 > window.innerWidth) left = anchor.left - 312;
    if (top + popH > window.innerHeight - 8) top = window.innerHeight - popH - 8;
    setPosition({ top: Math.max(8, top), left: Math.max(8, left), placed: true });
  }, [anchorRef, loading]);

  // Close on outside click or Escape
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
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

  const targetUsername = profile?.username ?? user.username;

  const handleAddFriend = async () => {
    if (!targetUsername.trim()) return;
    setFriendError(null);
    setFriendLoading(true);
    try {
      await sendRequest(targetUsername.trim());
      onClose();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { error?: string } | undefined)?.error
        : null;
      setFriendError(msg || 'Could not send friend request');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleAcceptIncoming = async () => {
    const id = friendState.incoming?.id;
    if (!id) return;
    setFriendActionLoading(true);
    try {
      await acceptRequest(id);
      onClose();
    } finally {
      setFriendActionLoading(false);
    }
  };

  const handleDeclineIncoming = async () => {
    const id = friendState.incoming?.id;
    if (!id) return;
    setFriendActionLoading(true);
    try {
      await declineRequest(id);
      onClose();
    } finally {
      setFriendActionLoading(false);
    }
  };

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, scale: 0.95, x: -8 }}
      animate={{ opacity: position.placed ? 1 : 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -8 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 9999,
        width: 300,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}
    >
      <ProfileCardBody
        profile={profile}
        loading={loading}
        onClose={onClose}
      />
      {!loading && user.roles && user.roles.length > 0 && (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
            Roles
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {user.roles.map(r => (
              <span key={r.id} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 99,
                background: `${r.color}22`,
                border: `1px solid ${r.color}55`,
                color: r.color,
                fontWeight: 600,
              }}>
                {r.name}
              </span>
            ))}
          </div>
        </div>
      )}
      {!loading && user.id !== currentUserId && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button size="sm" onClick={handleDm} isLoading={dmLoading} style={{ width: '100%' }}>
            Message
          </Button>

          {friendState.isFriend ? (
            <Button size="sm" variant="secondary" disabled style={{ width: '100%' }}>
              Friends
            </Button>
          ) : friendState.incoming ? (
            <>
              <Button
                size="sm"
                onClick={handleAcceptIncoming}
                isLoading={friendActionLoading}
                style={{ width: '100%' }}
              >
                <Check size={14} style={{ marginRight: 4 }} />
                Accept friend request
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleDeclineIncoming}
                disabled={friendActionLoading}
                style={{ width: '100%' }}
              >
                <X size={14} style={{ marginRight: 4 }} />
                Decline
              </Button>
            </>
          ) : friendState.outgoing ? (
            <Button size="sm" variant="secondary" disabled style={{ width: '100%' }}>
              Request sent
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAddFriend}
                isLoading={friendLoading}
                style={{ width: '100%' }}
              >
                <UserPlus size={14} style={{ marginRight: 4 }} />
                Add friend
              </Button>
              {friendError && (
                <span style={{ fontSize: 11, color: 'var(--danger)', lineHeight: 1.35 }}>{friendError}</span>
              )}
            </>
          )}
        </div>
      )}
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
