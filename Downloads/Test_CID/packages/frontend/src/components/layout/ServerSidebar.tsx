import { useEffect, useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Compass, Plus, Settings, Link, Clipboard, Trash2, LogOut, CheckCheck, BadgeCheck } from 'lucide-react';
import { useServerStore } from '../../store/serverStore';
import { useChannelStore } from '../../store/channelStore';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../ui/Avatar';
import { Tooltip } from '../ui/Tooltip';
import { CreateServerModal } from '../server/CreateServerModal';
import { useContextMenu } from '../../context/ContextMenuContext';
import { serversApi } from '../../api/servers';

interface ServerIconProps {
  server: { id: string; name: string; icon_url?: string | null; owner_id?: string; verified?: number };
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function ServerIcon({ server, isActive, onClick, onContextMenu }: ServerIconProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Tooltip content={server.name} placement="right">
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          cursor: 'pointer',
          padding: '3px 0',
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {/* Active pill */}
        <motion.div
          initial={false}
          animate={{ height: isActive ? 32 : hovered ? 10 : 0, opacity: isActive || hovered ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
            width: 3, background: 'var(--text-primary)', borderRadius: '0 3px 3px 0',
          }}
        />

        {/* Glow ring when active */}
        {isActive && (
          <div style={{
            position: 'absolute', inset: -3,
            borderRadius: 'var(--radius-xl)',
            background: 'var(--accent-glow)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }} />
        )}

        <motion.div
          animate={{
            borderRadius: isActive || hovered ? 'var(--radius-lg)' : '50%',
            background: isActive ? 'var(--accent)' : hovered ? 'var(--accent)' : 'var(--bg-overlay)',
            boxShadow: isActive
              ? '0 4px 20px rgba(88,101,242,0.5), 0 0 0 1px rgba(88,101,242,0.4)'
              : hovered ? '0 4px 16px rgba(88,101,242,0.3)' : '0 2px 8px rgba(0,0,0,0.4)',
          }}
          transition={{ duration: 0.18 }}
          style={{
            width: 44, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', cursor: 'pointer', position: 'relative',
          }}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt={server.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{
              fontSize: 17, fontWeight: 700,
              color: isActive || hovered ? '#fff' : 'var(--text-secondary)',
              userSelect: 'none', transition: 'color 0.15s',
            }}>
              {server.name.charAt(0).toUpperCase()}
            </span>
          )}
        </motion.div>

        {/* Verified badge */}
        {server.verified ? (
          <div style={{
            position: 'absolute', bottom: 0, right: 4,
            width: 16, height: 16, borderRadius: '50%',
            background: 'var(--bg-base)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BadgeCheck size={14} style={{ color: '#3b82f6' }} />
          </div>
        ) : null}
      </div>
    </Tooltip>
  );
}

export function ServerSidebar() {
  const { servers, activeServerId, setActiveServer, fetchServers, removeServer } = useServerStore();
  const { fetchChannels, getChannels, setActiveChannel } = useChannelStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { show } = useContextMenu();

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleSelectServer = async (serverId: string) => {
    setActiveServer(serverId);
    if (!getChannels(serverId).length) {
      await fetchChannels(serverId);
    }
    const channels = getChannels(serverId);
    const firstText = channels.find(c => c.type === 'text');
    if (firstText) {
      setActiveChannel(firstText.id);
      navigate(`/app/servers/${serverId}/channels/${firstText.id}`);
    }
  };

  const handleServerContextMenu = (e: React.MouseEvent, server: any) => {
    e.preventDefault();
    const isOwner = server.owner_id === user?.id;
    const isAdmin = user?.username === 'slimeryt';
    show([
      { label: 'Mark as Read', icon: <CheckCheck size={14} />, onClick: () => {} },
      { divider: true, label: '', onClick: () => {} },
      { label: 'Invite People', icon: <Link size={14} />, onClick: () => navigate(`/app/servers/${server.id}/settings`) },
      ...(isOwner || server.role === 'admin' ? [
        { label: 'Server Settings', icon: <Settings size={14} />, onClick: () => navigate(`/app/servers/${server.id}/settings`) },
      ] : []),
      { divider: true, label: '', onClick: () => {} },
      { label: 'Copy Server ID', icon: <Clipboard size={14} />, onClick: () => navigator.clipboard.writeText(server.id) },
      ...(isAdmin ? [
        { divider: true, label: '', onClick: () => {} },
        { label: server.verified ? 'Remove Verification' : 'Verify Server', icon: <BadgeCheck size={14} />, onClick: async () => {
          try {
            const { usersApi } = await import('../../api/users');
            if (server.verified) await usersApi.unverifyServer(server.id);
            else await usersApi.verifyServer(server.id);
            // Refresh servers
            await fetchServers();
          } catch {}
        }},
      ] : []),
      { divider: true, label: '', onClick: () => {} },
      isOwner
        ? { label: 'Delete Server', icon: <Trash2 size={14} />, danger: true, onClick: async () => {
            if (confirm(`Delete "${server.name}"?`)) {
              await serversApi.delete(server.id);
              removeServer(server.id);
              navigate('/app');
            }
          }}
        : { label: 'Leave Server', icon: <LogOut size={14} />, danger: true, onClick: async () => {
            if (confirm(`Leave "${server.name}"?`)) {
              await serversApi.leave(server.id);
              removeServer(server.id);
              navigate('/app');
            }
          }},
    ], e.clientX, e.clientY);
  };

  return (
    <div style={{
      width: 68,
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: 'var(--shadow-panel)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px 0',
      gap: 2,
      overflowY: 'auto',
      overflowX: 'hidden',
      flexShrink: 0,
    }}>
      {/* DM / Home icon */}
      <Tooltip content="Direct Messages" placement="right">
        <div
          onClick={() => { setActiveServer(null); navigate('/app'); }}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--bg-overlay)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginBottom: 6, color: 'var(--accent)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
            transition: 'var(--transition)', flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderRadius = 'var(--radius-lg)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(88,101,242,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-overlay)';
            e.currentTarget.style.color = 'var(--accent)';
            e.currentTarget.style.borderRadius = '50%';
            e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
          }}
        >
          <MessageSquare size={20} />
        </div>
      </Tooltip>

      {/* Separator */}
      <div style={{ width: 28, height: 1, background: 'var(--border-strong)', margin: '4px 0', flexShrink: 0, borderRadius: 99 }} />

      {/* Server icons */}
      <AnimatePresence>
        {servers.map(server => (
          <motion.div
            key={server.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <ServerIcon
              server={server}
              isActive={activeServerId === server.id}
              onClick={() => handleSelectServer(server.id)}
              onContextMenu={(e) => handleServerContextMenu(e, server)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Discover */}
      <Tooltip content="Discover Servers" placement="right">
        <button
          onClick={() => { setActiveServer(null); navigate('/app/discover'); }}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--bg-overlay)', border: 'none',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 4, transition: 'var(--transition)', flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--accent)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderRadius = 'var(--radius-lg)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(88,101,242,0.4)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-overlay)';
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderRadius = '50%';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          }}
        >
          <Compass size={20} />
        </button>
      </Tooltip>

      {/* Add server */}
      <Tooltip content="Add a Server" placement="right">
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: 'var(--bg-overlay)',
            border: '1.5px dashed var(--border-strong)',
            color: 'var(--success)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 4, transition: 'var(--transition)', flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--success)';
            e.currentTarget.style.color = '#fff';
            e.currentTarget.style.borderColor = 'var(--success)';
            e.currentTarget.style.borderRadius = 'var(--radius-lg)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(35,209,96,0.35)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'var(--bg-overlay)';
            e.currentTarget.style.color = 'var(--success)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.borderRadius = '50%';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <Plus size={22} />
        </button>
      </Tooltip>

      <div style={{ flex: 1 }} />

      <CreateServerModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
