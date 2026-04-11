import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { MessageSquare, Clipboard, UserMinus, Shield, Check, User } from 'lucide-react';
import { ServerMemberWithRoles, ServerRole } from '../../types/models';
import { serversApi } from '../../api/servers';
import { rolesApi } from '../../api/roles';
import { dmsApi } from '../../api/dms';
import { useAuthStore } from '../../store/authStore';
import { useServerStore } from '../../store/serverStore';
import { useContextMenu } from '../../context/ContextMenuContext';
import { Avatar } from '../ui/Avatar';
import { UserPreview, useUserPreview, PreviewUser } from '../ui/UserPreview';

export function MemberList({ serverId }: { serverId: string }) {
  const [members, setMembers] = useState<ServerMemberWithRoles[]>([]);
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [rolePickerPos, setRolePickerPos] = useState<{ x: number; y: number } | null>(null);
  const [rolePickerMemberId, setRolePickerMemberId] = useState<string | null>(null);
  const [togglingRole, setTogglingRole] = useState<string | null>(null);
  const { user: currentUser } = useAuthStore();
  const { servers } = useServerStore();
  const { show } = useContextMenu();
  const navigate = useNavigate();
  const { previewUser, anchorRef, openPreview, closePreview } = useUserPreview();
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rolePickerRef = useRef<HTMLDivElement>(null);

  const server = servers.find(s => s.id === serverId);

  useEffect(() => {
    serversApi.members(serverId).then(setMembers).catch(() => {});
    rolesApi.list(serverId).then(r => setRoles(r.filter(r => !r.is_default))).catch(() => {});
  }, [serverId]);

  // Close role picker on outside click
  useEffect(() => {
    if (!rolePickerPos) return;
    const handler = (e: MouseEvent) => {
      if (rolePickerRef.current && !rolePickerRef.current.contains(e.target as Node)) {
        setRolePickerPos(null);
        setRolePickerMemberId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [rolePickerPos]);

  const currentMember = members.find(m => m.id === currentUser?.id);
  const isAdminOrOwner =
    server?.owner_id === currentUser?.id ||
    currentMember?.role === 'admin';

  const rolePickerMember = members.find(m => m.id === rolePickerMemberId);

  const handleMemberClick = (member: ServerMemberWithRoles, el: HTMLDivElement) => {
    const previewData: PreviewUser = {
      id: member.id,
      username: member.username,
      display_name: member.display_name || member.username,
      avatar_url: member.avatar_url,
      status: member.status,
      role: (member as any).role,
    };
    openPreview(previewData, el);
  };

  const handleContextMenu = (e: React.MouseEvent, member: ServerMemberWithRoles) => {
    e.preventDefault();
    e.stopPropagation();
    const cx = e.clientX;
    const cy = e.clientY;
    const items = [
      {
        label: 'View Profile',
        icon: <User size={14} />,
        onClick: () => {
          const el = rowRefs.current.get(member.id);
          if (el) handleMemberClick(member, el);
        },
      },
      ...(member.id !== currentUser?.id ? [{
        label: 'Send Message',
        icon: <MessageSquare size={14} />,
        onClick: async () => {
          try {
            const dm = await dmsApi.create(member.id);
            navigate(`/app/dm/${dm.id}`);
          } catch {}
        },
      }] : []),
      { divider: true, label: '', onClick: () => {} },
      {
        label: 'Copy User ID',
        icon: <Clipboard size={14} />,
        onClick: () => navigator.clipboard.writeText(member.id),
      },
      ...(isAdminOrOwner && roles.length > 0 ? [
        { divider: true, label: '', onClick: () => {} },
        {
          label: 'Manage Roles',
          icon: <Shield size={14} />,
          onClick: () => {
            setRolePickerMemberId(member.id);
            setRolePickerPos({ x: cx, y: cy });
          },
        },
      ] : []),
      ...(isAdminOrOwner && member.id !== currentUser?.id && member.role !== 'owner' ? [
        { divider: true, label: '', onClick: () => {} },
        {
          label: 'Kick Member',
          icon: <UserMinus size={14} />,
          danger: true,
          onClick: async () => {
            if (confirm(`Kick ${member.display_name || member.username}?`)) {
              try {
                await serversApi.kick(serverId, member.id);
                setMembers(prev => prev.filter(m => m.id !== member.id));
              } catch {}
            }
          },
        },
      ] : []),
    ];
    show(items, cx, cy);
  };

  const handleToggleRole = async (member: ServerMemberWithRoles, role: ServerRole) => {
    const key = `${member.id}:${role.id}`;
    if (togglingRole === key) return;
    const hasRole = member.roles?.some(r => r.id === role.id);
    setTogglingRole(key);
    try {
      if (hasRole) {
        await rolesApi.removeFromMember(serverId, member.id, role.id);
        setMembers(prev => prev.map(m =>
          m.id === member.id ? { ...m, roles: m.roles?.filter(r => r.id !== role.id) } : m
        ));
      } else {
        await rolesApi.assignToMember(serverId, member.id, role.id);
        setMembers(prev => prev.map(m =>
          m.id === member.id ? { ...m, roles: [...(m.roles || []), role] } : m
        ));
      }
    } catch {} finally {
      setTogglingRole(null);
    }
  };

  const groups = members.reduce<Record<string, ServerMemberWithRoles[]>>((acc, m) => {
    const key = m.status === 'offline' ? 'Offline' : 'Online';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const orderedKeys = ['Online', 'Offline'].filter(k => groups[k]?.length);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-panel)',
      overflowY: 'auto',
      padding: '14px 8px',
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.07em', textTransform: 'uppercase',
        color: 'var(--text-muted)', padding: '0 8px 10px',
      }}>
        Members
      </div>

      {orderedKeys.map(status => (
        <div key={status} style={{ marginBottom: 18 }}>
          <div style={{
            padding: '0 8px 5px', fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}>
            {status} — {groups[status].length}
          </div>

          {groups[status].map(member => (
            <div
              key={member.id}
              ref={el => { if (el) rowRefs.current.set(member.id, el); }}
              onClick={() => {
                const el = rowRefs.current.get(member.id);
                if (el) handleMemberClick(member, el);
              }}
              onContextMenu={e => handleContextMenu(e, member)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '5px 8px', margin: '1px 0',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', transition: 'all var(--transition)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Avatar user={member} size={32} showStatus />
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{
                  fontSize: 13, fontWeight: 500,
                  color: member.status === 'offline' ? 'var(--text-muted)' : 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {member.display_name || member.username}
                </div>
                {member.roles && member.roles.length > 0 && !member.roles.every(r => r.is_default) && (
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 2 }}>
                    {member.roles.filter(r => !r.is_default).slice(0, 2).map(r => (
                      <span
                        key={r.id}
                        style={{
                          fontSize: 10, padding: '1px 5px', borderRadius: 3,
                          background: `${r.color}22`,
                          color: r.color || 'var(--accent)',
                          border: `1px solid ${r.color}44`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {r.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {members.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 8px' }}>
          No members found
        </div>
      )}

      {/* Role picker floating panel */}
      {rolePickerPos && rolePickerMember && (
        <div
          ref={rolePickerRef}
          style={{
            position: 'fixed',
            left: rolePickerPos.x,
            top: rolePickerPos.y,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            minWidth: 220,
            zIndex: 1001,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '8px 12px 4px', fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)',
          }}>
            Roles — {rolePickerMember.display_name || rolePickerMember.username}
          </div>
          {roles.map(role => {
            const hasRole = rolePickerMember.roles?.some(r => r.id === role.id);
            const key = `${rolePickerMember.id}:${role.id}`;
            const isToggling = togglingRole === key;
            return (
              <button
                key={role.id}
                onClick={() => handleToggleRole(rolePickerMember, role)}
                disabled={!!isToggling}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: 'transparent', border: 'none',
                  cursor: isToggling ? 'wait' : 'pointer', color: 'var(--text-primary)',
                  fontSize: 13, fontFamily: 'inherit', textAlign: 'left', transition: 'background 100ms',
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
          {roles.length === 0 && (
            <div style={{ padding: '8px 12px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
              No roles created yet.
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {previewUser && (
          <UserPreview
            user={previewUser}
            anchorRef={anchorRef}
            onClose={closePreview}
            currentUserId={currentUser?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
