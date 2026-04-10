import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Users, X, Check } from 'lucide-react';
import type { DirectMessage, User } from '../../types/models';
import { dmsApi } from '../../api/dms';
import { Avatar } from '../ui/Avatar';
import { useAuthStore } from '../../store/authStore';
import { useFriendStore } from '../../store/friendStore';
import { getSocket } from '../../socket/client';

// ── New DM modal ─────────────────────────────────────────────────────────────
function NewDmModal({ onClose, onCreated }: { onClose: () => void; onCreated: (dm: DirectMessage) => void }) {
  const { user } = useAuthStore();
  const { friends, fetchFriends, isLoaded } = useFriendStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) fetchFriends();
  }, []);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (selected.length === 0) return;
    setIsLoading(true);
    try {
      let dm: DirectMessage;
      if (selected.length === 1) {
        const friendUser = friends.find(f => f.id === selected[0])?.user;
        dm = await dmsApi.create(friendUser?.id ?? selected[0]);
      } else {
        const userIds = selected.map(fId => friends.find(f => f.id === fId)?.user?.id ?? fId);
        dm = await dmsApi.createGroup(userIds, groupName.trim() || undefined);
      }
      onCreated(dm);
    } catch {}
    finally { setIsLoading(false); }
  };

  const isGroup = selected.length > 1;

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-strong)',
        width: 420, maxHeight: '70vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>New Message</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Select {isGroup ? 'friends (group DM)' : 'a friend'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 4, borderRadius: 'var(--radius-sm)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Group name (shown when 2+ selected) */}
        {isGroup && (
          <div style={{ padding: '10px 20px 0' }}>
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                fontSize: 13, fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
        )}

        {/* Friend list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {friends.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No friends yet. Add friends first!
            </div>
          )}
          {friends.map(f => {
            const fUser = f.user;
            if (!fUser) return null;
            const isSelected = selected.includes(f.id);
            return (
              <div
                key={f.id}
                onClick={() => toggle(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 20px', cursor: 'pointer',
                  background: isSelected ? 'rgba(88,101,242,0.1)' : 'transparent',
                  transition: 'background 80ms',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar user={fUser} size={36} showStatus />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fUser.display_name || fUser.username}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{fUser.username}</div>
                </div>
                {isSelected && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#fff" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={selected.length === 0 || isLoading}
            style={{
              padding: '8px 18px', background: selected.length > 0 ? 'var(--accent)' : 'var(--bg-hover)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: selected.length > 0 ? '#fff' : 'var(--text-muted)',
              cursor: selected.length > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {isLoading ? (
              <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            ) : isGroup ? (
              <><Users size={14} /> Create Group</>
            ) : 'Open DM'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── DMList ────────────────────────────────────────────────────────────────────
export function DMList() {
  const [dms, setDms] = useState<DirectMessage[]>([]);
  const [showNewDm, setShowNewDm] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { dmId: activeDmId } = useParams<{ dmId: string }>();

  useEffect(() => {
    dmsApi.list().then(setDms).catch(() => {});

    // Refresh list and navigate when a new DM is pushed from socket
    const socket = getSocket();
    const onDmCreated = ({ dm }: any) => {
      if (dm?.id) {
        setDms(prev => prev.some(d => d.id === dm.id) ? prev : [dm, ...prev]);
      }
    };
    socket.on('dm_created', onDmCreated);
    return () => { socket.off('dm_created', onDmCreated); };
  }, []);

  const getDmLabel = (dm: DirectMessage) => {
    if (dm.is_group) {
      return dm.name || dm.participants?.map(p => p.display_name || p.username).join(', ') || 'Group DM';
    }
    const other = dm.participants?.find(p => p.id !== user?.id);
    return other?.display_name || other?.username || 'Unknown';
  };

  const getDmSubLabel = (dm: DirectMessage) => {
    if (dm.is_group) return `${dm.participants?.length ?? 0} members`;
    const other = dm.participants?.find(p => p.id !== user?.id);
    return other ? `@${other.username}` : '';
  };

  const handleCreated = (dm: DirectMessage) => {
    setShowNewDm(false);
    setDms(prev => prev.some(d => d.id === dm.id) ? prev : [dm, ...prev]);
    navigate(`/app/dms/${dm.id}`);
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        padding: '6px 8px 4px 16px',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>Direct Messages</span>
        <button
          onClick={() => setShowNewDm(true)}
          title="New DM or Group DM"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 4px', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >+</button>
      </div>

      {dms.length === 0 && (
        <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
          No direct messages yet
        </div>
      )}

      {dms.map(dm => {
        const isGroup = !!dm.is_group;
        const other = !isGroup ? dm.participants?.find(p => p.id !== user?.id) : null;
        const isActive = activeDmId === dm.id;
        const label = getDmLabel(dm);
        const sublabel = getDmSubLabel(dm);

        return (
          <div
            key={dm.id}
            onClick={() => navigate(`/app/dms/${dm.id}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '5px 8px 5px 16px',
              margin: '1px 8px',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              background: isActive ? 'var(--bg-active)' : 'transparent',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              transition: 'var(--transition)',
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }
            }}
          >
            {isGroup ? (
              /* Stacked avatars for group */
              <div style={{ position: 'relative', width: 32, height: 32, flexShrink: 0 }}>
                {(dm.participants || []).slice(0, 2).map((p, i) => (
                  <div
                    key={p.id}
                    style={{
                      position: 'absolute',
                      width: 20, height: 20,
                      top: i === 0 ? 0 : 'auto',
                      bottom: i === 1 ? 0 : 'auto',
                      left: i === 0 ? 0 : 'auto',
                      right: i === 1 ? 0 : 'auto',
                      borderRadius: '50%',
                      border: '1.5px solid var(--bg-base)',
                      overflow: 'hidden',
                      zIndex: i,
                    }}
                  >
                    <Avatar user={p} size={20} />
                  </div>
                ))}
              </div>
            ) : (
              <Avatar user={other as any} size={32} showStatus />
            )}
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? 'var(--text-primary)' : 'inherit',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {label}
              </div>
              {sublabel && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {sublabel}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {showNewDm && <NewDmModal onClose={() => setShowNewDm(false)} onCreated={handleCreated} />}
    </div>
  );
}
