import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ServerMember } from '../../types/models';
import { serversApi } from '../../api/servers';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { UserPreview, useUserPreview, PreviewUser } from '../ui/UserPreview';

export function MemberList({ serverId }: { serverId: string }) {
  const [members, setMembers] = useState<ServerMember[]>([]);
  const { user: currentUser } = useAuthStore();
  const { previewUser, anchorRef, openPreview, closePreview } = useUserPreview();
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    serversApi.members(serverId).then(setMembers).catch(() => {});
  }, [serverId]);

  const handleMemberClick = (member: ServerMember, el: HTMLDivElement) => {
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

  const groups = members.reduce<Record<string, ServerMember[]>>((acc, m) => {
    const key = m.status === 'offline' ? 'Offline' : 'Online';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Sort: Online first
  const orderedKeys = ['Online', 'Offline'].filter(k => groups[k]?.length);

  return (
    <div style={{
      width: 224,
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
          {/* Group header */}
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
                {(member as any).role && (member as any).role !== 'member' && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'capitalize' }}>
                    {(member as any).role}
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
