import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, ChevronRight } from 'lucide-react';
import { ServerRole, Permissions } from '../../types/models';
import { rolesApi } from '../../api/roles';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

const PERMISSION_LABELS: { key: keyof typeof Permissions; label: string; description: string }[] = [
  { key: 'VIEW_CHANNELS',    label: 'View Channels',     description: 'Allows members to view text channels.' },
  { key: 'SEND_MESSAGES',    label: 'Send Messages',     description: 'Allows members to send messages in text channels.' },
  { key: 'ATTACH_FILES',     label: 'Attach Files',      description: 'Allows members to upload files.' },
  { key: 'MANAGE_MESSAGES',  label: 'Manage Messages',   description: 'Allows members to delete others\' messages.' },
  { key: 'MENTION_EVERYONE', label: 'Mention Everyone',  description: 'Allows members to use @everyone and @here.' },
  { key: 'MANAGE_CHANNELS',  label: 'Manage Channels',   description: 'Allows members to create, edit, and delete channels.' },
  { key: 'MANAGE_ROLES',     label: 'Manage Roles',      description: 'Allows members to create and assign roles below theirs.' },
  { key: 'KICK_MEMBERS',     label: 'Kick Members',      description: 'Allows members to kick other members from the server.' },
  { key: 'BAN_MEMBERS',      label: 'Ban Members',       description: 'Allows members to permanently ban members.' },
  { key: 'MANAGE_SERVER',    label: 'Manage Server',     description: 'Allows members to change the server name and settings.' },
  { key: 'ADMINISTRATOR',    label: 'Administrator',     description: 'Grants all permissions. Be careful who you give this to.' },
];

const PRESET_COLORS = ['#5865f2', '#57f287', '#fee75c', '#ed4245', '#eb459e', '#faa61a', '#2d2d2d', '#ffffff'];

function hasPermission(perms: number, flag: number): boolean {
  return (perms & flag) !== 0;
}

export function RolesEditor({ serverId }: { serverId: string }) {
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [selected, setSelected] = useState<ServerRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#5865f2');
  const [editPerms, setEditPerms] = useState(0);
  const [editHoist, setEditHoist] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    rolesApi.list(serverId).then(r => {
      setRoles(r);
      if (r.length > 0 && !selected) selectRole(r[0]);
    }).catch(() => {});
  }, [serverId]);

  const selectRole = (role: ServerRole) => {
    setSelected(role);
    setEditName(role.name);
    setEditColor(role.color || '#5865f2');
    setEditPerms(role.permissions);
    setEditHoist(!!role.hoist);
    setSaved(false);
    setError('');
  };

  const togglePerm = (flag: number) => {
    setEditPerms(prev => prev ^ flag);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true); setError(''); setSaved(false);
    try {
      const updated = await rolesApi.update(serverId, selected.id, {
        name: editName,
        color: editColor,
        permissions: editPerms,
        hoist: editHoist,
      });
      setRoles(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelected(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const role = await rolesApi.create(serverId, { name: 'New Role', color: '#5865f2' });
      setRoles(prev => [...prev, role]);
      selectRole(role);
    } catch {} finally {
      setCreating(false);
    }
  };

  const handleDelete = async (role: ServerRole) => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    try {
      await rolesApi.delete(serverId, role.id);
      const next = roles.filter(r => r.id !== role.id);
      setRoles(next);
      if (selected?.id === role.id) {
        if (next.length > 0) selectRole(next[0]);
        else setSelected(null);
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', minHeight: 400 }}>
      {/* Roles list */}
      <div style={{
        width: 200, flexShrink: 0, borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '0 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Roles — {roles.length}
          </span>
          <button
            onClick={handleCreate}
            disabled={creating}
            title="Create Role"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
          >
            <Plus size={15} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {roles.map(role => (
            <div
              key={role.id}
              onClick={() => selectRole(role)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                background: selected?.id === role.id ? 'var(--bg-active)' : 'transparent',
                transition: 'background 100ms',
              }}
              onMouseEnter={e => { if (selected?.id !== role.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { if (selected?.id !== role.id) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: role.color || '#5865f2', flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {role.name}
              </span>
              <ChevronRight size={12} color="var(--text-muted)" />
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      {selected ? (
        <div style={{ flex: 1, paddingLeft: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Name + Color */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="Role Name" value={editName} onChange={e => setEditName(e.target.value)} disabled={!!selected.is_default} />
            </div>
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Color</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 180 }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setEditColor(c)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', border: editColor === c ? '2px solid #fff' : '2px solid transparent',
                      background: c, cursor: 'pointer', outline: 'none', transition: 'border 100ms',
                      boxShadow: editColor === c ? '0 0 0 1px var(--accent)' : 'none',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hoist toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Display Separately</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Show this role separately in the member list</div>
            </div>
            <button
              onClick={() => setEditHoist(!editHoist)}
              style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                background: editHoist ? 'var(--success)' : 'var(--bg-hover)',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
              }}
            >
              <span style={{
                position: 'absolute', top: 2, left: editHoist ? 20 : 2,
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                transition: 'left 0.2s', display: 'block',
              }} />
            </button>
          </div>

          {/* Permissions */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Shield size={14} color="var(--text-muted)" />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Permissions
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PERMISSION_LABELS.map(({ key, label, description }) => {
                const flag = Permissions[key];
                const checked = hasPermission(editPerms, flag) || hasPermission(editPerms, Permissions.ADMINISTRATOR);
                const isAdmin = key === 'ADMINISTRATOR';
                return (
                  <div
                    key={key}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                      borderRadius: 'var(--radius-md)', background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                      opacity: !isAdmin && hasPermission(editPerms, Permissions.ADMINISTRATOR) ? 0.6 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>
                    </div>
                    <button
                      onClick={() => togglePerm(flag)}
                      disabled={!isAdmin && hasPermission(editPerms, Permissions.ADMINISTRATOR)}
                      style={{
                        width: 40, height: 22, borderRadius: 11, border: 'none',
                        cursor: (!isAdmin && hasPermission(editPerms, Permissions.ADMINISTRATOR)) ? 'default' : 'pointer',
                        background: checked ? 'var(--success)' : 'var(--bg-hover)',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: 2, left: checked ? 20 : 2,
                        width: 18, height: 18, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s', display: 'block',
                      }} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {error && <div style={{ color: 'var(--danger)', fontSize: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button onClick={handleSave} isLoading={saving}>
              {saved ? '✓ Saved!' : 'Save Changes'}
            </Button>
            {!selected.is_default && (
              <Button variant="danger" size="sm" onClick={() => handleDelete(selected)}>
                <Trash2 size={13} style={{ marginRight: 4 }} /> Delete Role
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Select a role to edit
        </div>
      )}
    </div>
  );
}
