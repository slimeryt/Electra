import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ArrowLeft } from 'lucide-react';
import { usePhoneLayout } from '../hooks/useMediaQuery';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useServerStore } from '../store/serverStore';
import { useChannelStore } from '../store/channelStore';
import client from '../api/client';

interface PublicServer {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  member_count: number;
  invite_code: string;
  owner_id: string;
  verified?: number;
}

function hashColor(name = '') {
  const colors = ['#5865f2','#eb459e','#57f287','#fee75c','#ed4245','#9b59b6','#3498db'];
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function ServerCard({ server, isMember, onJoin, joining }: {
  server: PublicServer;
  isMember: boolean;
  onJoin: () => void;
  joining: boolean;
}) {
  const color = hashColor(server.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
      }}
    >
      {/* Banner */}
      <div style={{
        height: 80,
        background: `linear-gradient(135deg, ${color}99, ${color}33)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        fontWeight: 800,
        color: '#fff',
        letterSpacing: '-0.02em',
        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}>
        {server.icon_url
          ? <img src={server.icon_url} alt="" style={{ width: 60, height: 60, borderRadius: 'var(--radius-md)', objectFit: 'cover' }} />
          : server.name.charAt(0).toUpperCase()
        }
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {server.name}
          </div>
          {!!server.verified && <BadgeCheck size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, lineHeight: 1.4, minHeight: 36 }}>
          {server.description || 'No description provided.'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            {server.member_count.toLocaleString()} {server.member_count === 1 ? 'member' : 'members'}
          </span>
          {isMember ? (
            <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>✓ Joined</span>
          ) : (
            <Button size="sm" onClick={onJoin} isLoading={joining}>Join</Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function DiscoveryPage() {
  const [servers, setServers] = useState<PublicServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const { servers: myServers, joinServer, setActiveServer } = useServerStore();
  const { fetchChannels, getChannels, setActiveChannel } = useChannelStore();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    client.get<PublicServer[]>('/servers/discover')
      .then(r => setServers(r.data))
      .catch(() => setServers([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleJoin = useCallback(async (server: PublicServer) => {
    setJoiningId(server.id);
    try {
      const joined = await joinServer(server.invite_code);
      setActiveServer(joined.id);
      await fetchChannels(joined.id);
      const chs = getChannels(joined.id);
      const first = chs.find(c => c.type === 'text');
      if (first) { setActiveChannel(first.id); navigate(`/app/servers/${joined.id}/channels/${first.id}`); }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to join');
    } finally {
      setJoiningId(null);
    }
  }, [joinServer, setActiveServer, fetchChannels, getChannels, setActiveChannel, navigate]);

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const myServerIds = new Set(myServers.map(s => s.id));
  const isPhone = usePhoneLayout();

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      {isPhone && (
        <header
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 52,
            padding: '8px 10px',
            paddingTop: 'max(8px, env(safe-area-inset-top, 0px))',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-elevated)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={22} strokeWidth={2} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Discover</span>
        </header>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, var(--bg-elevated) 0%, var(--bg-base) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: isPhone ? '16px 16px 20px' : '40px 48px 32px',
      }}>
        <h1 style={{ fontSize: isPhone ? 22 : 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 8 }}>
          Discover Servers
        </h1>
        <p style={{ fontSize: isPhone ? 13 : 15, color: 'var(--text-secondary)', marginBottom: isPhone ? 16 : 24, lineHeight: 1.45 }}>
          Find communities to join — from gaming to music to programming.
        </p>
        <div style={{ maxWidth: 480 }}>
          <Input
            placeholder="🔍  Search servers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: isPhone ? 14 : 15, padding: isPhone ? '10px 14px' : '12px 16px' }}
          />
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: isPhone ? '16px 14px calc(24px + env(safe-area-inset-bottom, 0px))' : '32px 48px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 64, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>
              {search ? 'No servers match your search' : 'No public servers yet'}
            </div>
            <div style={{ fontSize: 13 }}>
              {search ? 'Try a different search term' : 'Make your server public in Server Settings to appear here'}
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {filtered.length} server{filtered.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isPhone ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}
            >
              {filtered.map((server, i) => (
                <motion.div key={server.id} transition={{ delay: i * 0.04 }}>
                  <ServerCard
                    server={server}
                    isMember={myServerIds.has(server.id)}
                    onJoin={() => handleJoin(server)}
                    joining={joiningId === server.id}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
