import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useProfileCardStore } from '../../store/profileCardStore';
import { usersApi } from '../../api/users';
import { Avatar } from './Avatar';
import type { User } from '../../types/models';

export const STATUS_LABEL: Record<string, string> = {
  online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', offline: 'Offline',
};
export const STATUS_COLOR: Record<string, string> = {
  online: 'var(--success)', idle: '#f0b232', dnd: 'var(--danger)', offline: 'var(--text-muted)',
};

/** Extract first hex/rgb color from a CSS background value (handles gradients). */
export function primaryColor(v: string | null | undefined): string {
  if (!v) return '#5865f2';
  const m = v.match(/#[0-9a-fA-F]{3,8}|rgb[a]?\([^)]+\)/);
  return m ? m[0] : '#5865f2';
}

/** Render the visual body of a profile card — used in both floating card and settings preview. */
export function ProfileCardBody({
  profile,
  loading,
  onClose,
}: {
  profile: User | null;
  loading?: boolean;
  onClose?: () => void;
}) {
  const accent = profile?.accent_color;
  const isGradient = accent?.startsWith('linear-gradient') || accent?.startsWith('radial-gradient');
  const bannerBg = accent ? (isGradient ? accent : accent) : 'linear-gradient(135deg, #5865f2, #4752c4)';
  const accentBarColor = primaryColor(accent);
  const nameFont = profile?.username_font || 'inherit';

  return (
    <>
      {/* Banner */}
      <div style={{ height: 92, position: 'relative', flexShrink: 0 }}>
        {profile?.banner_url ? (
          <img src={profile.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: bannerBg }} />
        )}
        {onClose && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 8, right: 8,
            background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', padding: 0,
          }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '0 16px 16px' }}>
        {/* Avatar row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -32, marginBottom: 12 }}>
          <div style={{ border: '4px solid var(--bg-elevated)', borderRadius: '50%', background: 'var(--bg-elevated)', flexShrink: 0 }}>
            {loading
              ? <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--bg-overlay)' }} />
              : <Avatar user={profile || undefined} size={60} showStatus />
            }
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[130, 80, 170].map(w => (
              <div key={w} style={{ height: 11, width: w, borderRadius: 6, background: 'var(--bg-overlay)', animation: 'pcPulse 1.4s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes pcPulse{0%,100%{opacity:.35}50%{opacity:.7}}`}</style>
          </div>
        ) : profile ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2, fontFamily: nameFont, letterSpacing: '-0.01em' }}>
              {profile.display_name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, marginBottom: 8 }}>
              @{profile.username}
            </div>

            {/* Accent divider */}
            <div style={{ height: 2, borderRadius: 1, background: isGradient ? accentBarColor : (accent || '#5865f2'), marginBottom: 10, opacity: 0.7 }} />

            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: profile.bio ? 10 : 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: STATUS_COLOR[profile.status] || STATUS_COLOR.offline }} />
              {profile.custom_status || STATUS_LABEL[profile.status] || 'Offline'}
            </div>

            {profile.bio && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '10px 0 8px' }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  About Me
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap', maxHeight: 80, overflowY: 'auto' }}>
                  {profile.bio}
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Could not load profile.</div>
        )}
      </div>
    </>
  );
}

const CARD_W = 300;
const CARD_H = 380;

export function ProfileCard() {
  const { userId, anchor, close } = useProfileCardStore();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    setLoading(true);
    usersApi.getProfile(userId).then(setProfile).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onClick = (e: MouseEvent) => { if (cardRef.current && !cardRef.current.contains(e.target as Node)) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [userId, close]);

  if (!userId || !anchor) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let left = anchor.x + 12;
  let top = anchor.y;
  if (left + CARD_W > vw - 8) left = anchor.x - CARD_W - 12;
  if (top + CARD_H > vh - 8) top = vh - CARD_H - 8;
  if (top < 8) top = 8;

  return createPortal(
    <div
      ref={cardRef}
      style={{
        position: 'fixed', left, top, width: CARD_W,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 9999, overflow: 'hidden',
        animation: 'profileCardIn 140ms cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <style>{`@keyframes profileCardIn{from{opacity:0;transform:scale(0.94) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <ProfileCardBody profile={profile} loading={loading} onClose={close} />
    </div>,
    document.body
  );
}
