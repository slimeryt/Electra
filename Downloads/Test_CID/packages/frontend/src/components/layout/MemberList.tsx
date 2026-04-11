import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

  // Clamp role picker inside the viewport after it renders
  useLayoutEffect(() => {
    if (!rolePickerPos || !rolePickerRef.current) return;
    const el = rolePickerRef.current;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = rolePickerPos;
    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    if (x !== rolePickerPos.x || y !== rolePickerPos.y) {
      setRolePickerPos({ x, y });
    }
  }, [rolePickerPos]);

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

  // Highest-priority custom role (by position) — used for name color
  const topRole = (m: ServerMemberWithRoles) =>
    (m.roles || []).filter(r => !r.is_default).sort((a, b) => b.position - a.position)[0];

  // Highest hoisted role — used for group label
  const hoistRole = (m: ServerMemberWithRoles) =>
    (m.roles || []).filter(r => !r.is_default && r.hoist === 1).sort((a, b) => b.position - a.position)[0];

  const handleMemberClick = (member: ServerMemberWithRoles, el: HTMLDivElement) => {
    const previewData: PreviewUser = {
      id: member.id,
      username: member.username,
      display_name: member.display_name || member.username,
      avatar_url: member.avatar_url,
      status: member.status,
      role: (member as any).role,
      roles: (member.roles || []).filter(r => !r.is_default),
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

  // Build groups: hoisted roles first (sorted by position desc), then Online, then Offline
  const hoistRoleMap = new Map<string, { role: ServerRole; members: ServerMemberWithRoles[] }>();
  const onlineMembers: ServerMemberWithRoles[] = [];
  const offlineMembers: ServerMemberWithRoles[] = [];

  for (const m of members) {
    const hr = hoistRole(m);
    if (hr) {
      if (!hoistRoleMap.has(hr.id)) hoistRoleMap.set(hr.id, { role: hr, members: [] });
      hoistRoleMap.get(hr.id)!.members.push(m);
    } else if (m.status === 'offline') {
      offlineMembers.push(m);
    } else {
      onlineMembers.push(m);
    }
  }

  const hoistGroups = Array.from(hoistRoleMap.values()).sort((a, b) => b.role.position - a.role.position);

  type Group = { label: string; color?: string; members: ServerMemberWithRoles[] };
  const allGroups: Group[] = [
    ...hoistGroups.map(g => ({ label: g.role.name, color: g.role.color, members: g.members })),
    ...(onlineMembers.length ? [{ label: 'Online', members: onlineMembers }] : []),
    ...(offlineMembers.length ? [{ label: 'Offline', members: offlineMembers }] : []),
  ];

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

      {allGroups.map(group => (
        <div key={group.label} style={{ marginBottom: 18 }}>
          <div style={{
            padding: '0 8px 5px', fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            color: group.color || 'var(--text-muted)',
          }}>
            {group.label} — {group.members.length}
          </div>

          {group.members.map(member => {
            const nameColor = topRole(member)?.color;
            const isOffline = member.status === 'offline';
            return (
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
                    color: isOffline ? 'var(--text-muted)' : (nameColor || 'var(--text-primary)'),
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {member.display_name || member.username}
                  </div>
                </div>
              </div>
            );
          })}
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
