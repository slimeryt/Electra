import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useProfileCardStore } from '../../store/profileCardStore';
import { usersApi } from '../../api/users';
import { Avatar } from './Avatar';
import type { User } from '../../types/models';

const STATUS_LABEL: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'Do Not Disturb',
  offline: 'Offline',
};

const STATUS_COLOR: Record<string, string> = {
  online: 'var(--success)',
  idle: '#f0b232',
  dnd: 'var(--danger)',
  offline: 'var(--text-muted)',
};

const CARD_W = 300;
const CARD_H = 340; // approx

export function ProfileCard() {
  const { userId, anchor, close } = useProfileCardStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Fetch profile whenever userId changes
  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    setLoading(true);
    usersApi.getProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  // Dismiss on click outside or Escape
  useEffect(() => {
    if (!userId) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [userId, close]);

  if (!userId || !anchor) return null;

  // Smart positioning: keep card within viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = anchor.x + 12;
  let top = anchor.y;
  if (left + CARD_W > vw - 8) left = anchor.x - CARD_W - 12;
  if (top + CARD_H > vh - 8) top = vh - CARD_H - 8;
  if (top < 8) top = 8;

  const accentColor = profile?.accent_color || 'var(--accent)';

  return createPortal(
    <div
      ref={cardRef}
      style={{
        position: 'fixed',
        left,
        top,
        width: CARD_W,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 9999,
        overflow: 'hidden',
        animation: 'profileCardIn 120ms ease-out',
      }}
    >
      <style>{`@keyframes profileCardIn { from { opacity:0; transform:scale(0.95) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>

      {/* Banner */}
      <div style={{
        height: 80,
        background: profile?.banner_url
          ? undefined
          : `linear-gradient(135deg, ${accentColor}55, ${accentColor}22)`,
        position: 'relative',
        flexShrink: 0,
      }}>
        {profile?.banner_url && (
          <img
            src={profile.banner_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {/* Accent bar at bottom of banner */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: accentColor,
        }} />
        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.4)', border: 'none',
            borderRadius: '50%', width: 24, height: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', padding: 0,
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Avatar overlapping banner */}
      <div style={{ padding: '0 16px 16px', position: 'relative' }}>
        <div style={{
          marginTop: -28,
          marginBottom: 10,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
        }}>
          <div style={{
            border: `3px solid var(--bg-elevated)`,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            flexShrink: 0,
          }}>
            {loading ? (
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--bg-overlay)',
              }} />
            ) : (
              <Avatar user={profile || undefined} size={56} showStatus />
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[120, 80, 160].map(w => (
              <div key={w} style={{
                height: 12, width: w, borderRadius: 6,
                background: 'var(--bg-overlay)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
          </div>
        ) : profile ? (
          <>
            {/* Name + username */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {profile.display_name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                @{profile.username}
              </div>
            </div>

            {/* Status */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10,
            }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: STATUS_COLOR[profile.status] || STATUS_COLOR.offline,
              }} />
              {profile.custom_status
                ? <span style={{ color: 'var(--text-secondary)' }}>{profile.custom_status}</span>
                : <span>{STATUS_LABEL[profile.status] || 'Offline'}</span>
              }
            </div>

            {/* Divider */}
            {(profile.bio) && (
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />
            )}

            {/* Bio */}
            {profile.bio && (
              <div style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                maxHeight: 80,
                overflowY: 'auto',
              }}>
                {profile.bio}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Could not load profile.</div>
        )}
      </div>
    </div>,
    document.body
  );
}
