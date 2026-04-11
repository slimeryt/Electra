import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Users, Hash, Link, AlertTriangle, ChevronLeft, Volume2, Megaphone, Trash2, Shield, Camera, Check } from 'lucide-react';
import { useServerStore } from '../store/serverStore';
import { useChannelStore } from '../store/channelStore';
import { useAuthStore } from '../store/authStore';
import { serversApi } from '../api/servers';
import { rolesApi } from '../api/roles';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ServerMemberWithRoles, ServerRole, Channel } from '../types/models';
import { RolesEditor } from '../components/server/RolesEditor';
import { isElectron } from '../env';

const BASE = isElectron
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
  : '';

type Tab = 'overview' | 'members' | 'roles' | 'channels' | 'invites' | 'danger';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview',  label: 'Overview',    icon: <Settings size={15} /> },
  { id: 'members',   label: 'Members',     icon: <Users size={15} /> },
  { id: 'roles',     label: 'Roles',       icon: <Shield size={15} /> },
  { id: 'channels',  label: 'Channels',    icon: <Hash size={15} /> },
  { id: 'invites',   label: 'Invites',     icon: <Link size={15} /> },
  { id: 'danger',    label: 'Danger Zone', icon: <AlertTriangle size={15} /> },
];

// ─── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ serverId }: { serverId: string }) {
  const { servers, updateServer } = useServerStore();
  const server = servers.find(s => s.id === serverId);
  const [name, setName] = useState(server?.name || '');
  const [description, setDescription] = useState(server?.description || '');
  const [isPublic, setIsPublic] = useState((server as any)?.is_public || false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleIconUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingIcon(true);
    try {
      const form = new FormData();
      form.append('icon', file);
      const { data } = await (await import('../api/client')).default.post(
        `/servers/${serverId}/icon`, form
      );
      updateServer({ id: serverId, icon_url: data.icon_url });
    } catch {} finally {
      setUploadingIcon(false);
    }
  };

  const handleBannerUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setUploadingBanner(true);
    try {
      const form = new FormData();
      form.append('banner', file);
      const { data } = await (await import('../api/client')).default.post(
        `/servers/${serverId}/banner`, form
      );
      updateServer({ id: serverId, banner_url: (data as any).banner_url });
    } catch {} finally {
      setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const updated = await serversApi.update(serverId, { name, description, is_public: isPublic } as any);
      updateServer(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Server icon + name preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {server?.icon_url ? (
            <img
              src={server.icon_url}
              alt={name}
              style={{ width: 72, height: 72, borderRadius: 'var(--radius-lg)', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: 'var(--radius-lg)',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#fff',
            }}>
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <button
            onClick={() => iconInputRef.current?.click()}
            disabled={uploadingIcon}
            title="Change server icon"
            style={{
              position: 'absolute', inset: 0, borderRadius: 'var(--radius-lg)',
              background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 150ms', color: '#fff',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
          >
            {uploadingIcon
              ? <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Camera size={20} />
            }
          </button>
          <input ref={iconInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleIconUpload(e.target.files[0]); e.target.value = ''; }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--text-primary)' }}>{name || 'Server Name'}</div>
          {description && <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{description}</div>}
        </div>
      </div>

      <Input label="Server Name" value={name} onChange={e => setName(e.target.value)} />
      <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this server about?" />

            {/* Banner */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Server Banner</div>
              <div style={{
                position: 'relative', height: 100, borderRadius: 'var(--radius-md)',
                background: server?.banner_url ? 'transparent' : 'var(--bg-overlay)',
                border: '1px solid var(--border)', overflow: 'hidden', cursor: 'pointer',
              }}
                onClick={() => bannerInputRef.current?.click()}
                onMouseEnter={e => { (e.currentTarget.querySelector('.banner-overlay') as HTMLElement | null)!.style.opacity = '1'; }}
                onMouseLeave={e => { (e.currentTarget.querySelector('.banner-overlay') as HTMLElement | null)!.style.opacity = '0'; }}
              >
                {server?.banner_url && (
                  <img src={server.banner_url} alt="Banner"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
                <div className="banner-overlay" style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: 'rgba(0,0,0,0.5)', opacity: server?.banner_url ? 0 : 1,
                  transition: 'opacity 150ms', color: '#fff',
                }}>
                  {uploadingBanner
                    ? <div style={{ width: 20, height: 20, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    : <><Camera size={18} /><span style={{ fontSize: 12, fontWeight: 500 }}>Upload Banner</span></>
                  }
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.[0]) handleBannerUpload(e.target.files[0]); e.target.value = ''; }} />
              </div>
            </div>

      {/* Public toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Public Server</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Allow anyone to find and join this server via Server Discovery</div>
        </div>
        <button
          onClick={() => setIsPublic(!isPublic)}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: isPublic ? 'var(--success)' : 'var(--bg-hover)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: isPublic ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', display: 'block',
          }} />
        </button>
      </div>

      {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
      <Button onClick={handleSave} isLoading={saving} style={{ alignSelf: 'flex-start' }}>
        {saved ? '✓ Saved!' : 'Save Changes'}
      </Button>
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────
function MembersTab({ serverId }: { serverId: string }) {
  const [members, setMembers] = useState<ServerMemberWithRoles[]>([]);
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [search, setSearch] = useState('');
  const [openPickerId, setOpenPickerId] = useState<string | null>(null);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const { servers } = useServerStore();
  const server = servers.find(s => s.id === serverId);
  const isOwner = server?.owner_id === user?.id;

  useEffect(() => {
    serversApi.members(serverId).then(setMembers).catch(() => {});
    rolesApi.list(serverId).then(setRoles).catch(() => {});
  }, [serverId]);

  // Close picker on outside click
  useEffect(() => {
    if (!openPickerId) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpenPickerId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openPickerId]);

  const handleKick = async (memberId: string) => {
    if (!confirm('Kick this member?')) return;
    try {
      await serversApi.kick(serverId, memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch {}
  };

  const handleToggleRole = async (member: ServerMemberWithRoles, role: ServerRole) => {
    const key = `${member.id}:${role.id}`;
    if (togglingRole === key) return;
    const hasRole = member.roles?.some(r => r.id === role.id);
    setTogglingRole(key);
    try {
      if (hasRole) {
        await rolesApi.removeFromMember(serverId, member.id, role.id);
        setMembers(prev => prev.map(m => m.id === member.id
          ? { ...m, roles: m.roles?.filter(r => r.id !== role.id) }
          : m
        ));
      } else {
        await rolesApi.assignToMember(serverId, member.id, role.id);
        setMembers(prev => prev.map(m => m.id === member.id
          ? { ...m, roles: [...(m.roles || []), role] }
          : m
        ));
      }
    } catch {} finally {
      setTogglingRole(null);
    }
  };

  const currentMember = members.find(m => m.id === user?.id);
  const canManageRoles = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const assignableRoles = roles.filter(r => !r.is_default);

  const filtered = members.filter(m =>
    m.display_name.toLowerCase().includes(search.toLowerCase()) ||
    m.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{members.length} members</span>
        <Input
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 200 }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(member => {
          const customRoles = member.roles?.filter(r => !r.is_default) ?? [];
          const isPickerOpen = openPickerId === member.id;
          return (
            <div key={member.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              borderRadius: 'var(--radius-md)', background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
            }}>
              <Avatar user={member} size={36} showStatus />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: 14 }}>{member.display_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{member.username}</div>
                {customRoles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    {customRoles.map(r => (
                      <span key={r.id} style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 99,
                        background: `${r.color}22`, border: `1px solid ${r.color}55`,
                        color: r.color, fontWeight: 600,
                      }}>
                        {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                background: member.role === 'owner' ? 'rgba(88,101,242,0.2)' : member.role === 'admin' ? 'rgba(250,166,26,0.15)' : 'var(--bg-hover)',
                color: member.role === 'owner' ? 'var(--accent)' : member.role === 'admin' ? '#faa61a' : 'var(--text-muted)',
                border: `1px solid ${member.role === 'owner' ? 'rgba(88,101,242,0.3)' : 'var(--border)'}`,
                textTransform: 'capitalize', flexShrink: 0,
              }}>
                {member.role}
              </span>

              {/* Role picker */}
              {canManageRoles && member.role !== 'owner' && assignableRoles.length > 0 && (
                <div style={{ position: 'relative' }} ref={isPickerOpen ? pickerRef : undefined}>
                  <button
                    onClick={() => setOpenPickerId(isPickerOpen ? null : member.id)}
                    title="Manage roles"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                      background: isPickerOpen ? 'var(--bg-active)' : 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                      fontFamily: 'inherit', fontWeight: 500, flexShrink: 0,
                    }}
                  >
                    <Shield size={12} style={{ marginRight: 2 }} /> Roles
                  </button>
                  {isPickerOpen && (
                    <div style={{
                      position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      minWidth: 200, zIndex: 100, overflow: 'hidden',
                    }}>
                      <div style={{ padding: '8px 12px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                        Assign Roles
                      </div>
                      {assignableRoles.map(role => {
                        const hasRole = member.roles?.some(r => r.id === role.id);
                        const key = `${member.id}:${role.id}`;
                        const isToggling = togglingRole === key;
                        return (
                          <button
                            key={role.id}
                            onClick={() => handleToggleRole(member, role)}
                            disabled={!!isToggling}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 12px', background: 'transparent', border: 'none',
                              cursor: isToggling ? 'wait' : 'pointer', color: 'var(--text-primary)',
                              fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                              transition: 'background 100ms',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                          >
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: role.color, flexShrink: 0 }} />
                            <span style={{ flex: 1 }}>{role.name}</span>
                            {isToggling
                              ? <span style={{ width: 14, height: 14, border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                              : hasRole
                                ? <Check size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                : null
                            }
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {isOwner && member.id !== user?.id && member.role !== 'owner' && (
                <Button variant="danger" size="sm" onClick={() => handleKick(member.id)}>Kick</Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Channels Tab ─────────────────────────────────────────────────────────────
function ChannelsTab({ serverId }: { serverId: string }) {
  const { channelsByServer, fetchChannels } = useChannelStore();
  const [deleting, setDeleting] = useState<string | null>(null);
  const channels = channelsByServer[serverId] || [];

  useEffect(() => { fetchChannels(serverId); }, [serverId]);

  const handleDelete = async (channelId: string, name: string) => {
    if (!confirm(`Delete #${name}? This cannot be undone.`)) return;
    setDeleting(channelId);
    try {
      const { channelsApi } = await import('../api/channels');
      await channelsApi.delete(channelId);
      fetchChannels(serverId);
    } finally {
      setDeleting(null);
    }
  };

  const byCategory = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    const cat = ch.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ch);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(byCategory).map(([cat, chs]) => (
        <div key={cat}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{cat}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {chs.map(ch => (
              <div key={ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              }}>
                <span style={{ color: 'var(--text-muted)', width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {ch.type === 'voice' ? <Volume2 size={15} /> : ch.type === 'announcement' ? <Megaphone size={15} /> : <Hash size={15} />}
                </span>
                <span style={{ flex: 1, fontSize: 14, color: 'var(--text-primary)' }}>{ch.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-full)' }}>{ch.type}</span>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={deleting === ch.id}
                  onClick={() => handleDelete(ch.id, ch.name)}
                >
                  <Trash2 size={13} style={{ marginRight: 4 }} /> Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Invites Tab ─────────────────────────────────────────────────────────────
function InvitesTab({ serverId }: { serverId: string }) {
  const { servers } = useServerStore();
  const server = servers.find(s => s.id === serverId);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const inviteLink = server ? `${window.location.origin}/app?invite=${server.invite_code}` : '';

  const copy = (text: string, which: 'link' | 'code') => {
    navigator.clipboard.writeText(text).then(() => {
      if (which === 'link') { setCopied(true); setTimeout(() => setCopied(false), 2000); }
      else { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Share your server's invite link or code to let others join.
      </p>
      <div style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6 }}>Invite Link</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, padding: '8px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: '1px solid var(--border)' }}>
              {inviteLink}
            </div>
            <Button size="sm" onClick={() => copy(inviteLink, 'link')}>{copied ? '✓ Copied' : 'Copy'}</Button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 6 }}>Invite Code</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <code style={{ padding: '6px 12px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', fontSize: 15, fontFamily: 'monospace', color: 'var(--accent)', letterSpacing: '0.1em', border: '1px solid var(--border)' }}>
              {server?.invite_code}
            </code>
            <Button size="sm" variant="secondary" onClick={() => copy(server?.invite_code || '', 'code')}>
              {copiedCode ? '✓ Copied' : 'Copy Code'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Danger Zone Tab ─────────────────────────────────────────────────────────
function DangerTab({ serverId }: { serverId: string }) {
  const navigate = useNavigate();
  const { servers, removeServer } = useServerStore();
  const { user } = useAuthStore();
  const server = servers.find(s => s.id === serverId);
  const isOwner = server?.owner_id === user?.id;
  const [deleting, setDeleting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${server?.name}"? This will permanently delete all channels, messages, and members. This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await serversApi.delete(serverId);
      removeServer(serverId);
      navigate('/app');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete server');
      setDeleting(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(`Leave "${server?.name}"?`)) return;
    setLeaving(true);
    try {
      await serversApi.leave(serverId);
      removeServer(serverId);
      navigate('/app');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to leave server');
      setLeaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {!isOwner && (
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Leave Server</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>You will need a new invite link to re-join.</div>
          <Button variant="danger" onClick={handleLeave} isLoading={leaving}>Leave Server</Button>
        </div>
      )}
      {isOwner && (
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Delete Server</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Permanently delete <strong style={{ color: 'var(--text-primary)' }}>{server?.name}</strong> and all of its data. This action cannot be undone.
          </div>
          <Button variant="danger" onClick={handleDelete} isLoading={deleting}>Delete Server</Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ServerSettingsPage() {
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { servers } = useServerStore();
  const { user } = useAuthStore();
  const server = servers.find(s => s.id === serverId);
  const isAdminOrOwner = server?.owner_id === user?.id;
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!server) return null;

  const visibleTabs = isAdminOrOwner ? tabs : tabs.filter(t => t.id !== 'danger' && t.id !== 'overview');

  return (
    <div style={{ flex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 220, background: 'var(--bg-elevated)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', padding: '24px 8px', flexShrink: 0,
      }}>
        <div style={{ padding: '0 8px 16px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
          {server.name}
        </div>
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              background: activeTab === tab.id ? 'var(--bg-active)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius-sm)',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', textAlign: 'left', width: '100%',
              fontWeight: activeTab === tab.id ? 500 : 400,
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => { if (activeTab !== tab.id) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
            onMouseLeave={e => { if (activeTab !== tab.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
          >
            <span style={{ width: 20, textAlign: 'center', fontSize: 15 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', width: '100%',
              background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', maxWidth: 740 }}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>
            {tabs.find(t => t.id === activeTab)?.label}
          </h1>
          {activeTab === 'overview'  && <OverviewTab serverId={serverId!} />}
          {activeTab === 'members'   && <MembersTab serverId={serverId!} />}
          {activeTab === 'roles'     && <RolesEditor serverId={serverId!} />}
          {activeTab === 'channels'  && <ChannelsTab serverId={serverId!} />}
          {activeTab === 'invites'   && <InvitesTab serverId={serverId!} />}
          {activeTab === 'danger'    && <DangerTab serverId={serverId!} />}
        </motion.div>
      </div>
    </div>
  );
}
