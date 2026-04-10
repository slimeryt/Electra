import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImagePlus, X, RotateCcw, ArrowUpRight, ArrowRight, ArrowDownRight, ArrowDown } from 'lucide-react';
import { useThemeStore, THEMES, type Theme } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ProfileCardBody } from '../components/ui/ProfileCard';
import client from '../api/client';
import type { User } from '../types/models';

// ── Font options ──────────────────────────────────────────────────────────────
const FONTS: { value: string; label: string; css: string }[] = [
  { value: '',         label: 'Default',  css: 'inherit' },
  { value: 'serif',    label: 'Serif',    css: 'Georgia, "Times New Roman", serif' },
  { value: 'mono',     label: 'Mono',     css: '"Courier New", Courier, monospace' },
  { value: 'impact',   label: 'Impact',   css: 'Impact, Charcoal, fantasy' },
  { value: 'rounded',  label: 'Rounded',  css: '"Trebuchet MS", Helvetica, sans-serif' },
  { value: 'elegant',  label: 'Elegant',  css: '"Palatino Linotype", Palatino, serif' },
];

export function fontCss(value: string | null | undefined): string {
  return FONTS.find(f => f.value === (value ?? ''))?.css ?? 'inherit';
}

// ── Gradient helpers ──────────────────────────────────────────────────────────
const GRADIENT_PRESETS = [
  { label: 'Blurple',   c1: '#5865f2', c2: '#4752c4', angle: 135 },
  { label: 'Nitro',     c1: '#7289da', c2: '#eb459e', angle: 135 },
  { label: 'Sunset',    c1: '#f97316', c2: '#ec4899', angle: 135 },
  { label: 'Forest',    c1: '#22c55e', c2: '#06b6d4', angle: 135 },
  { label: 'Midnight',  c1: '#1e1b4b', c2: '#312e81', angle: 180 },
  { label: 'Fire',      c1: '#ef4444', c2: '#f59e0b', angle: 135 },
  { label: 'Ocean',     c1: '#0ea5e9', c2: '#6366f1', angle: 135 },
  { label: 'Rose',      c1: '#f43f5e', c2: '#a855f7', angle: 135 },
];

const SOLID_PRESETS = ['#5865f2', '#eb459e', '#57f287', '#fee75c', '#ed4245', '#9b59b6', '#3498db', '#e67e22', '#1abc9c', '#e74c3c'];

function buildGradient(c1: string, c2: string, angle: number) {
  return `linear-gradient(${angle}deg, ${c1}, ${c2})`;
}

function parseAccentColor(v: string | null | undefined): { mode: 'solid' | 'gradient'; c1: string; c2: string; angle: number } {
  if (!v) return { mode: 'solid', c1: '#5865f2', c2: '#4752c4', angle: 135 };
  if (v.startsWith('linear-gradient')) {
    const m = v.match(/linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,8}),\s*(#[0-9a-fA-F]{3,8})\)/);
    if (m) return { mode: 'gradient', angle: parseInt(m[1]), c1: m[2], c2: m[3] };
  }
  return { mode: 'solid', c1: v, c2: '#4752c4', angle: 135 };
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{title}</div>}
      {children}
    </div>
  );
}

// ── Status options ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'online',  label: 'Online',         color: 'var(--success)' },
  { value: 'idle',    label: 'Idle',            color: '#f0b232' },
  { value: 'dnd',     label: 'Do Not Disturb',  color: 'var(--danger)' },
  { value: 'offline', label: 'Invisible',       color: 'var(--text-muted)' },
] as const;

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UserSettingsPage() {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const { theme: currentTheme, setTheme } = useThemeStore();

  const handleThemeChange = async (t: Theme) => {
    setTheme(t);
    try {
      const { data } = await client.patch('/users/me', { theme: t });
      setUser(data.user || data);
    } catch { /* non-critical — localStorage already updated */ }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const parsed = parseAccentColor(user?.accent_color);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [customStatus, setCustomStatus] = useState(user?.custom_status || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [status, setStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>(user?.status || 'online');
  const [selectedFont, setSelectedFont] = useState(user?.username_font || '');

  // Banner / accent
  const [bannerTab, setBannerTab] = useState<'color' | 'image'>('color');
  const [colorMode, setColorMode] = useState<'solid' | 'gradient'>(parsed.mode);
  const [solidColor, setSolidColor] = useState(parsed.mode === 'solid' ? parsed.c1 : '#5865f2');
  const [gradColor1, setGradColor1] = useState(parsed.c1);
  const [gradColor2, setGradColor2] = useState(parsed.c2);
  const [gradAngle, setGradAngle] = useState(parsed.angle);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Derived accent color value to send to server / show in preview
  const accentValue = colorMode === 'gradient'
    ? buildGradient(gradColor1, gradColor2, gradAngle)
    : solidColor;

  // Live preview user object (merges current form state)
  const previewUser: User = {
    ...(user as User),
    display_name: displayName || user?.display_name || '',
    custom_status: customStatus || null,
    status,
    bio: bio || null,
    accent_color: accentValue,
    username_font: selectedFont || null,
    banner_url: user?.banner_url ?? null,
  };

  const handleSave = async () => {
    if (!displayName.trim()) { setError('Display name is required'); return; }
    setIsSaving(true); setError('');
    try {
      const { data } = await client.patch('/users/me', {
        display_name: displayName.trim(),
        custom_status: customStatus.trim() || null,
        bio: bio.trim() || null,
        accent_color: accentValue,
        username_font: selectedFont || null,
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
    } finally { setIsUploadingAvatar(false); }
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
    } finally { setIsUploadingBanner(false); }
  };

  const handleRemoveBanner = async () => {
    try {
      const { data } = await client.delete('/users/me/banner');
      setUser(data.user || data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to remove banner');
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.02em' }}>
          User Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28 }}>
          Customize how others see you on Electra
        </p>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>

          {/* ── Left: controls ──────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Avatar */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Avatar</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {/* Avatar with hover overlay */}
                  <div style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                    {user?.avatar_url
                      ? <img src={user.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                      : <div style={{ width: '100%', height: '100%', background: '#5865f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700 }}>
                          {(user?.display_name || user?.username || '?').charAt(0).toUpperCase()}
                        </div>
                    }
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: 0, transition: 'opacity 150ms', color: '#fff',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                  >
                    {isUploadingAvatar
                      ? <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <Camera size={20} />
                    }
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleAvatarUpload(e.target.files[0]); e.target.value = ''; }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>{user?.display_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>@{user?.username}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 6, opacity: 0.7 }}>Hover avatar to change · PNG, GIF supported</div>
                </div>
              </div>
            </div>

            {/* Profile Banner */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Profile Banner</div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 3 }}>
                {(['color', 'image'] as const).map(tab => (
                  <button key={tab} onClick={() => setBannerTab(tab)} style={{
                    flex: 1, padding: '6px 0', border: 'none', borderRadius: 'calc(var(--radius-md) - 2px)',
                    background: bannerTab === tab ? 'var(--bg-elevated)' : 'transparent',
                    color: bannerTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: bannerTab === tab ? 600 : 400, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: bannerTab === tab ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                    transition: 'all 150ms',
                  }}>
                    {tab === 'color' ? 'Color / Gradient' : 'Image'}
                  </button>
                ))}
              </div>

              {bannerTab === 'color' ? (
                <div>
                  {/* Solid / Gradient toggle */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {(['solid', 'gradient'] as const).map(m => (
                      <button key={m} onClick={() => setColorMode(m)} style={{
                        padding: '5px 14px', border: `1px solid ${colorMode === m ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', background: colorMode === m ? 'rgba(88,101,242,0.15)' : 'var(--bg-overlay)',
                        color: colorMode === m ? 'var(--accent)' : 'var(--text-secondary)',
                        fontSize: 12, fontWeight: colorMode === m ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                        {m === 'solid' ? 'Solid' : 'Gradient'}
                      </button>
                    ))}
                  </div>

                  {colorMode === 'solid' ? (
                    <>
                      {/* Solid color presets */}
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                        {SOLID_PRESETS.map(c => (
                          <button key={c} onClick={() => setSolidColor(c)} style={{
                            width: 30, height: 30, borderRadius: '50%', background: c, border: 'none',
                            outline: solidColor === c ? `3px solid #fff` : 'none',
                            outlineOffset: 2, cursor: 'pointer', padding: 0, flexShrink: 0,
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                            transition: 'transform 100ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                          />
                        ))}
                        {/* Custom color */}
                        <label style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, position: 'relative', cursor: 'pointer' }}>
                          <input type="color" value={solidColor.startsWith('#') ? solidColor : '#5865f2'} onChange={e => setSolidColor(e.target.value)} style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }} />
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, pointerEvents: 'none' }}>+</div>
                        </label>
                      </div>
                      {/* Selected preview */}
                      <div style={{ height: 36, borderRadius: 'var(--radius-md)', background: solidColor, border: '1px solid var(--border)' }} />
                    </>
                  ) : (
                    <>
                      {/* Gradient presets */}
                      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 14 }}>
                        {GRADIENT_PRESETS.map(p => (
                          <button key={p.label} onClick={() => { setGradColor1(p.c1); setGradColor2(p.c2); setGradAngle(p.angle); }} title={p.label} style={{
                            width: 30, height: 30, borderRadius: '50%', border: 'none',
                            background: buildGradient(p.c1, p.c2, p.angle),
                            cursor: 'pointer', padding: 0, flexShrink: 0,
                            outline: (gradColor1 === p.c1 && gradColor2 === p.c2) ? '3px solid #fff' : 'none',
                            outlineOffset: 2,
                            boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                            transition: 'transform 100ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                          />
                        ))}
                      </div>

                      {/* Custom color pickers */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Start color</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: gradColor1, border: '1px solid var(--border)', flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{gradColor1}</div>
                            <input type="color" value={gradColor1} onChange={e => setGradColor1(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                          </label>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>End color</div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: gradColor2, border: '1px solid var(--border)', flexShrink: 0 }} />
                            <div style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{gradColor2}</div>
                            <input type="color" value={gradColor2} onChange={e => setGradColor2(e.target.value)} style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} />
                          </label>
                        </div>
                      </div>

                      {/* Angle */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Direction</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[45, 90, 135, 180].map(a => (
                            <button key={a} onClick={() => setGradAngle(a)} style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '5px 10px', border: `1px solid ${gradAngle === a ? 'var(--accent)' : 'var(--border)'}`,
                              borderRadius: 'var(--radius-sm)', background: gradAngle === a ? 'rgba(88,101,242,0.15)' : 'var(--bg-overlay)',
                              color: gradAngle === a ? 'var(--accent)' : 'var(--text-secondary)',
                              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                              {a === 45 ? <ArrowUpRight size={13} /> : a === 90 ? <ArrowRight size={13} /> : a === 135 ? <ArrowDownRight size={13} /> : <ArrowDown size={13} />}
                              <span>{a}°</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Gradient preview */}
                      <div style={{ height: 36, borderRadius: 'var(--radius-md)', background: buildGradient(gradColor1, gradColor2, gradAngle), border: '1px solid var(--border)' }} />
                    </>
                  )}
                </div>
              ) : (
                /* Image tab */
                <div>
                  {user?.banner_url ? (
                    <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 10 }}>
                      <img src={user.banner_url} alt="Banner" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                      <button onClick={handleRemoveBanner} style={{
                        position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)',
                        border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                      }}>
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ height: 64, borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No banner set</span>
                    </div>
                  )}
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={isUploadingBanner}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px',
                      background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', cursor: 'pointer',
                      fontSize: 13, fontFamily: 'inherit',
                    }}
                  >
                    {isUploadingBanner
                      ? <div style={{ width: 14, height: 14, border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      : <ImagePlus size={14} />
                    }
                    {user?.banner_url ? 'Replace Banner' : 'Upload Banner'}
                  </button>
                  <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>PNG, GIF supported · Max 8 MB</div>
                  <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleBannerUpload(e.target.files[0]); e.target.value = ''; }} />
                </div>
              )}
            </div>

            {/* Display info */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Display</div>

              <div style={{ marginBottom: 14 }}>
                <Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} placeholder="Your display name" />
              </div>

              {/* Font picker */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Username Font</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {FONTS.map(f => (
                    <button key={f.value} onClick={() => setSelectedFont(f.value)} style={{
                      padding: '8px 6px', border: `1.5px solid ${selectedFont === f.value ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: selectedFont === f.value ? 'rgba(88,101,242,0.12)' : 'var(--bg-overlay)',
                      cursor: 'pointer', fontFamily: f.css, color: 'var(--text-primary)',
                      fontSize: 13, fontWeight: selectedFont === f.value ? 700 : 400,
                      transition: 'all 120ms', textAlign: 'center', lineHeight: 1.2,
                    }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* About */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>About Me</div>

              <div style={{ marginBottom: 14 }}>
                <Input label="Custom Status" value={customStatus} onChange={e => setCustomStatus(e.target.value)} placeholder="What are you up to?" maxLength={128} />
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Bio</div>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell others a bit about yourself…"
                  maxLength={300}
                  rows={3}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                    background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                    fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                    lineHeight: 1.5, transition: 'border-color 150ms',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 3 }}>{bio.length}/300</div>
              </div>
            </div>

            {/* Status */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Presence</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setStatus(opt.value)} style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 13px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${status === opt.value ? opt.color : 'var(--border)'}`,
                    background: status === opt.value ? `${opt.color}18` : 'var(--bg-overlay)',
                    color: status === opt.value ? opt.color : 'var(--text-secondary)',
                    cursor: 'pointer', fontSize: 13, fontWeight: status === opt.value ? 600 : 400,
                    transition: 'all 150ms', fontFamily: 'inherit',
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)', padding: 20, marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>App Theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {THEMES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => handleThemeChange(t.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${currentTheme === t.value ? 'var(--accent)' : 'var(--border)'}`,
                      background: currentTheme === t.value ? 'rgba(88,101,242,0.1)' : 'var(--bg-overlay)',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      transition: 'all 120ms',
                    }}
                  >
                    {/* Mini preview swatch */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      {t.preview.map((c, i) => (
                        <div key={i} style={{
                          width: i === 2 ? 10 : 14,
                          height: 24,
                          background: c,
                          borderRadius: i === 0 ? '3px 0 0 3px' : i === 1 ? '0' : '0 3px 3px 0',
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 13,
                      fontWeight: currentTheme === t.value ? 600 : 400,
                      color: currentTheme === t.value ? 'var(--accent)' : 'var(--text-primary)',
                    }}>{t.label}</span>
                    {currentTheme === t.value && (
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Error + Save */}
            {error && (
              <div style={{
                padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: 13, marginBottom: 12,
              }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button onClick={handleSave} isLoading={isSaving}>
                {saved ? '✓ Saved!' : 'Save Changes'}
              </Button>
              <Button variant="ghost" onClick={() => { logout(); navigate('/login'); }}>
                Sign Out
              </Button>
            </div>
          </div>

          {/* ── Right: live preview ──────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, textAlign: 'center' }}>Preview</div>
            <div style={{
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}>
              <ProfileCardBody profile={previewUser} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
