import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import client from '../api/client';
import { isElectron } from '../env';

const BASE = isElectron
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
  : '';

const STATUS_OPTIONS = [
  { value: 'online',  label: 'Online',         color: 'var(--success)' },
  { value: 'idle',    label: 'Idle',            color: '#f0b232' },
  { value: 'dnd',     label: 'Do Not Disturb',  color: 'var(--danger)' },
  { value: 'offline', label: 'Invisible',       color: 'var(--text-muted)' },
] as const;

const ACCENT_PRESETS = [
  '#5865f2', '#eb459e', '#57f287', '#fee75c',
  '#ed4245', '#9b59b6', '#3498db', '#e67e22',
  '#1abc9c', '#e74c3c', '#f39c12', '#ffffff',
];

export default function UserSettingsPage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [accentColor, setAccentColor] = useState(user?.accent_color || '#5865f2');
  const [status, setStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>(user?.status || 'online');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Display name is required'); return; }
    setIsSaving(true); setError('');
    try {
      const { data } = await client.patch('/users/me', {
        display_name: displayName.trim(),
        custom_status: customStatus.trim() || null,
        bio: bio.trim() || null,
        accent_color: accentColor || null,
        status,
      });
      setUser(data.user || data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
    setIsUploadingAvatar(true); setError('');
    try {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await client.post('/users/me/avatar', form);
      setUser(data.user || data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
    setIsUploadingBanner(true); setError('');
    try {
      const form = new FormData();
      form.append('banner', file);
      const { data } = await client.post('/users/me/banner', form);
      setUser(data.user || data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to upload banner');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    try {
      const { data } = await client.delete('/users/me/banner');
      setUser(data.user || data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to remove banner');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
          User Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
          Manage your Electra account and preferences
        </p>

        {/* Profile section */}
        <section style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', marginBottom: 16, overflow: 'hidden',
        }}>
          {/* Banner preview + upload */}
          <div style={{ position: 'relative', height: 100, background: user?.banner_url ? undefined : `linear-gradient(135deg, ${accentColor}55, ${accentColor}22)` }}>
            {user?.banner_url && (
              <img
                src={user.banner_url}
                alt="Banner"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            )}
            {/* Accent bar */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: accentColor }} />
            {/* Banner actions */}
            <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
              <button
                onClick={() => bannerInputRef.current?.click()}
                disabled={isUploadingBanner}
                title="Upload banner (GIF supported)"
                style={{
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 'var(--radius-sm)',
                  color: '#fff', cursor: 'pointer', padding: '4px 8px',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                }}
              >
                {isUploadingBanner
                  ? <div style={{ width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <ImagePlus size={13} />
                }
                {user?.banner_url ? 'Change' : 'Add Banner'}
              </button>
              {user?.banner_url && (
                <button
                  onClick={handleRemoveBanner}
                  title="Remove banner"
                  style={{
                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 'var(--radius-sm)',
                    color: '#fff', cursor: 'pointer', padding: '4px 6px',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleBannerUpload(e.target.files[0]); e.target.value = ''; }}
            />
          </div>

          <div style={{ padding: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, marginTop: 0 }}>
              Profile
            </h2>

            {/* Avatar upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar user={user || undefined} size={72} showStatus />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 150ms',
                    color: '#fff',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                  title="Change avatar"
                >
                  {isUploadingAvatar
                    ? <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    : <Camera size={20} />
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ''; }}
                />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.display_name}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>@{user?.username}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4 }}>
                  Click the avatar to change it
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                label="Display Name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Your display name"
              />

              <Input
                label="Custom Status"
                value={customStatus}
                onChange={e => setCustomStatus(e.target.value)}
                placeholder="What are you up to?"
                maxLength={128}
              />

              {/* Bio */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  About Me
                </div>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell others a bit about yourself…"
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 12px',
                    background: 'var(--bg-overlay)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none',
                    lineHeight: 1.5,
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 3 }}>
                  {bio.length}/300
                </div>
              </div>

              {/* Accent color */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Profile Accent Color
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {ACCENT_PRESETS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      title={color}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: color,
                        border: accentColor === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                        outline: accentColor === color ? '2px solid var(--bg-elevated)' : 'none',
                        outlineOffset: 1,
                        cursor: 'pointer', padding: 0, flexShrink: 0,
                        transition: 'transform 100ms',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    />
                  ))}
                  {/* Custom hex input */}
                  <label title="Custom color" style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                    <input
                      type="color"
                      value={accentColor.startsWith('#') ? accentColor : '#5865f2'}
                      onChange={e => setAccentColor(e.target.value)}
                      style={{ opacity: 0, position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
                    />
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)`,
                      border: '2px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: '#fff', fontWeight: 700, pointerEvents: 'none',
                    }}>+</div>
                  </label>
                </div>
              </div>

              {/* Status picker */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Presence
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStatus(opt.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 'var(--radius-md)',
                        border: `1px solid ${status === opt.value ? opt.color : 'var(--border)'}`,
                        background: status === opt.value ? `${opt.color}18` : 'var(--bg-overlay)',
                        color: status === opt.value ? opt.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontSize: 13, fontWeight: status === opt.value ? 600 : 400,
                        transition: 'all 150ms', fontFamily: 'inherit',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p style={{
                  color: 'var(--danger)', fontSize: 13, margin: 0,
                  padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
                  borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  {error}
                </p>
              )}

              <Button onClick={handleSave} isLoading={isSaving} style={{ alignSelf: 'flex-start' }}>
                {saved ? '✓ Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </section>

        {/* Account section */}
        <section style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)', padding: 24,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, marginTop: 0 }}>
            Account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Sign out of your Electra account on this device.
          </p>
          <Button variant="danger" onClick={handleLogout}>Sign Out</Button>
        </section>
      </div>
    </div>
  );
}
