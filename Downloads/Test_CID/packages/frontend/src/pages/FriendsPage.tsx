import { useState, useEffect } from 'react';
import { UserPlus, Users, Clock, ShieldOff, Check, X, MessageSquare, UserMinus, Search } from 'lucide-react';
import { useFriendStore } from '../store/friendStore';
import { Avatar } from '../components/ui/Avatar';
import { Friend } from '../types/models';

type Tab = 'all' | 'online' | 'pending' | 'blocked';

const STATUS_COLOR: Record<string, string> = {
  online: 'var(--online)', idle: 'var(--idle)', dnd: 'var(--dnd)', offline: 'var(--offline)',
};

function FriendCard({ friend, onAccept, onDecline, onRemove }: {
  friend: Friend;
  onAccept?: () => void;
  onDecline?: () => void;
  onRemove?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isPending = friend.status === 'pending';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 'var(--radius-md)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background var(--transition)',
        cursor: 'default',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar user={friend.user as any} size={38} />
        {!isPending && (
          <span style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 11, height: 11, borderRadius: '50%',
            background: STATUS_COLOR[friend.user.status] || 'var(--offline)',
            border: '2px solid var(--bg-elevated)',
          }} />
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {friend.user.display_name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
          {isPending
            ? friend.direction === 'incoming' ? 'Incoming request' : 'Outgoing request'
            : `@${friend.user.username}`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {isPending && friend.direction === 'incoming' && (
          <>
            <ActionBtn icon={<Check size={14} />} color="var(--success)" title="Accept" onClick={onAccept!} />
            <ActionBtn icon={<X size={14} />} color="var(--danger)" title="Decline" onClick={onDecline!} />
          </>
        )}
        {isPending && friend.direction === 'outgoing' && (
          <ActionBtn icon={<X size={14} />} color="var(--danger)" title="Cancel" onClick={onDecline!} />
        )}
        {friend.status === 'accepted' && (
          <>
            <ActionBtn icon={<MessageSquare size={14} />} color="var(--accent)" title="Message" onClick={() => {}} />
            <ActionBtn icon={<UserMinus size={14} />} color="var(--danger)" title="Remove Friend" onClick={onRemove!} />
          </>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ icon, color, title, onClick }: { icon: React.ReactNode; color: string; title: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: h ? `${color}22` : 'var(--bg-overlay)',
        color: h ? color : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms', flexShrink: 0,
      }}
    >
      {icon}
    </button>
  );
}

export default function FriendsPage() {
  const { friends, requests, isLoaded, fetchFriends, fetchRequests, sendRequest, acceptRequest, declineRequest, removeFriend } = useFriendStore();
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      fetchFriends();
      fetchRequests();
    }
  }, []);

  const incomingCount = requests.filter(r => r.direction === 'incoming').length;

  const handleAdd = async () => {
    if (!addUsername.trim()) return;
    setAdding(true); setAddError(''); setAddSuccess('');
    try {
      await sendRequest(addUsername.trim());
      setAddSuccess(`Request sent to ${addUsername.trim()}!`);
      setAddUsername('');
    } catch (e: any) {
      setAddError(e.response?.data?.error || 'Failed to send request');
    } finally {
      setAdding(false);
    }
  };

  const filteredFriends = friends.filter(f => {
    const q = search.toLowerCase();
    const match = !q || f.user.username.toLowerCase().includes(q) || f.user.display_name.toLowerCase().includes(q);
    if (tab === 'online') return match && f.user.status !== 'offline';
    return match;
  });

  const tabItems: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'all',     label: 'All',     icon: <Users size={15} /> },
    { id: 'online',  label: 'Online',  icon: <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--online)' }} /> },
    { id: 'pending', label: 'Pending', icon: <Clock size={15} />, count: incomingCount },
    { id: 'blocked', label: 'Blocked', icon: <ShieldOff size={15} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '0 20px', height: 50, display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '1px solid var(--border)', flexShrink: 0,
      }}>
        <Users size={18} color="var(--text-primary)" />
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15 }}>Friends</span>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        {tabItems.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: tab === t.id ? 'var(--bg-hover)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 500, transition: 'all 150ms',
            }}
          >
            {t.icon}
            {t.label}
            {t.count ? (
              <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 700, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>
                {t.count}
              </span>
            ) : null}
          </button>
        ))}
        {/* Add Friend button */}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => setTab('add' as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
              borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
              background: tab === ('add' as any) ? 'var(--accent)' : 'rgba(88,101,242,0.15)',
              color: tab === ('add' as any) ? '#fff' : 'var(--accent)',
              fontSize: 13, fontWeight: 600, transition: 'all 150ms',
            }}
          >
            <UserPlus size={14} /> Add Friend
          </button>
        </div>
      </div>

      {/* Add Friend panel */}
      {tab === ('add' as any) && (
        <div style={{ padding: 24, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Add Friend</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
            You can add friends by their exact username.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={addUsername}
              onChange={e => setAddUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Enter a Username"
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)', border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              }}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !addUsername.trim()}
              style={{
                padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none',
                background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13,
                cursor: adding || !addUsername.trim() ? 'not-allowed' : 'pointer',
                opacity: adding || !addUsername.trim() ? 0.6 : 1,
                transition: 'opacity 150ms',
              }}
            >
              {adding ? 'Sending...' : 'Send Request'}
            </button>
          </div>
          {addError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8 }}>{addError}</div>}
          {addSuccess && <div style={{ color: 'var(--success)', fontSize: 12, marginTop: 8 }}>{addSuccess}</div>}
        </div>
      )}

      {/* Search (for all/online tabs) */}
      {(tab === 'all' || tab === 'online') && (
        <div style={{ padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '7px 12px', border: '1px solid var(--border)' }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search"
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: 13, flex: 1 }}
            />
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {(tab === 'all' || tab === 'online') && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 0 6px' }}>
              {tab === 'online' ? 'Online' : 'All Friends'} — {filteredFriends.length}
            </div>
            {filteredFriends.length === 0 ? (
              <EmptyState text={tab === 'online' ? 'No friends online right now.' : "You don't have any friends yet."} />
            ) : (
              filteredFriends.map(f => (
                <FriendCard
                  key={f.id}
                  friend={f}
                  onRemove={() => removeFriend(f.user.id)}
                />
              ))
            )}
          </>
        )}

        {tab === 'pending' && (
          <>
            {requests.filter(r => r.direction === 'incoming').length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 0 6px' }}>
                  Incoming — {requests.filter(r => r.direction === 'incoming').length}
                </div>
                {requests.filter(r => r.direction === 'incoming').map(r => (
                  <FriendCard key={r.id} friend={r} onAccept={() => acceptRequest(r.id)} onDecline={() => declineRequest(r.id)} />
                ))}
              </>
            )}
            {requests.filter(r => r.direction === 'outgoing').length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '10px 0 6px', marginTop: 8 }}>
                  Outgoing — {requests.filter(r => r.direction === 'outgoing').length}
                </div>
                {requests.filter(r => r.direction === 'outgoing').map(r => (
                  <FriendCard key={r.id} friend={r} onDecline={() => declineRequest(r.id)} />
                ))}
              </>
            )}
            {requests.length === 0 && <EmptyState text="No pending friend requests." />}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
      <Users size={48} color="var(--text-muted)" strokeWidth={1} />
      <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>{text}</div>
    </div>
  );
}
