import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import client from '../api/client';

export default function UserSettingsPage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Display name is required'); return; }
    setIsSaving(true);
    setError('');
    try {
      const { data } = await client.patch('/users/me', { display_name: displayName.trim() });
      setUser(data.user || data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{
      flex: 1,
      overflowY: 'auto',
      padding: '40px',
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{
          fontSize: 24, fontWeight: 700, color: 'var(--text-primary)',
          marginBottom: 4, letterSpacing: '-0.01em',
        }}>
          User Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32 }}>
          Manage your Electra account and preferences
        </p>

        {/* Profile section */}
        <section style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: 24,
          marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, marginTop: 0 }}>
            Profile
          </h2>

          {/* Avatar + info row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
            padding: 16, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}>
            {user && <Avatar user={user} size={64} showStatus />}
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {user?.display_name}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                @{user?.username}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                {user?.email}
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

            {error && (
              <p style={{
                color: 'var(--danger)', fontSize: 13, margin: 0,
                padding: '8px 12px', background: 'rgba(239,68,68,0.1)',
                borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                {error}
              </p>
            )}

            <div>
              <Button
                onClick={handleSave}
                isLoading={isSaving}
                style={{ minWidth: 120 }}
              >
                {saved ? '✓ Saved!' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </section>

        {/* Account section */}
        <section style={{
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          padding: 24,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, marginTop: 0 }}>
            Account
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
            Sign out of your Electra account on this device.
          </p>
          <Button variant="danger" onClick={handleLogout}>
            Sign Out
          </Button>
        </section>
      </div>
    </div>
  );
}
