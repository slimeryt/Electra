import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
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
  { value: 'online',  label: 'Online',    color: 'var(--success)' },
  { value: 'idle',    label: 'Idle',      color: '#f0b232' },
  { value: 'dnd',     label: 'Do Not Disturb', color: 'var(--danger)' },
  { value: 'offline', label: 'Invisible', color: 'var(--text-muted)' },
] as const;

export default function UserSettingsPage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [status, setStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>(user?.status || 'online');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Display name is required'); return; }
    setIsSaving(true); setError('');
    try {
      const { data } = await client.patch('/users/me', {
        display_name: displayName.trim(),
        custom_status: customStatus.trim() || null,
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
          border: '1px solid var(--border)', padding: 24, marginBottom: 16,
        }}>
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
