import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Volume2, Megaphone, ChevronDown, ChevronRight, Plus, CheckCheck, Clipboard, Pencil, Trash2 } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';
import { Channel } from '../../types/models';
import { ChannelCreateModal } from '../server/ChannelCreateModal';
import { useContextMenu } from '../../context/ContextMenuContext';
import { channelsApi } from '../../api/channels';

interface ChannelIconProps {
  type: string;
}

function ChannelIcon({ type }: ChannelIconProps) {
  if (type === 'voice') return <Volume2 size={15} style={{ opacity: 0.6, flexShrink: 0 }} />;
  if (type === 'announcement') return <Megaphone size={15} style={{ opacity: 0.6, flexShrink: 0 }} />;
  return <Hash size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
}

export function ChannelSidebar({ serverId }: { serverId: string }) {
  const { channelsByServer, activeChannelId, setActiveChannel, fetchChannels, removeChannel } = useChannelStore();
  const { servers } = useServerStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { show } = useContextMenu();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const channels = channelsByServer[serverId] || [];
  const server = servers.find(s => s.id === serverId);
  const isAdminOrOwner = server?.owner_id === user?.id;

  useEffect(() => {
    if (serverId) fetchChannels(serverId);
  }, [serverId, fetchChannels]);

  // Group channels by category
  const categories = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    const cat = (ch as any).category || 'Text Channels';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ch);
    return acc;
  }, {});

  const handleChannelContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    e.stopPropagation();
    const items = [
      { label: 'Mark as Read', icon: <CheckCheck size={14} />, onClick: () => {} },
      { divider: true, label: '', onClick: () => {} },
      { label: 'Copy Channel ID', icon: <Clipboard size={14} />, onClick: () => navigator.clipboard.writeText(channel.id) },
      ...(isAdminOrOwner ? [
        { divider: true, label: '', onClick: () => {} },
        { label: 'Edit Channel', icon: <Pencil size={14} />, onClick: () => navigate(`/app/servers/${serverId}/settings`) },
        { label: 'Delete Channel', icon: <Trash2 size={14} />, danger: true, onClick: async () => {
          if (confirm(`Delete #${channel.name}?`)) {
            await channelsApi.delete(channel.id);
            removeChannel(channel.id, serverId);
            if (activeChannelId === channel.id) navigate(`/app/servers/${serverId}`);
          }
        }},
      ] : []),
    ];
    show(items, e.clientX, e.clientY);
  };

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel.id);
    if (channel.type === 'voice') {
      navigate(`/app/servers/${serverId}/voice/${channel.id}`);
    } else {
      navigate(`/app/servers/${serverId}/channels/${channel.id}`);
    }
  };

  return (
    <div style={{
      width: 240,
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-panel)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
    }}>
      {/* Server header */}
      <div
        style={{
          padding: '0 14px',
          height: 50,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'var(--transition)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <span style={{
          fontWeight: 700, fontSize: 14,
          color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}>
          {server?.name || 'Server'}
        </span>
        <ChevronDown size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {Object.entries(categories).map(([category, chs]) => (
          <div key={category}>
            {/* Category header */}
            <div
              onClick={() => setCollapsed(s => ({ ...s, [category]: !s[category] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '10px 8px 4px 14px',
                cursor: 'pointer', color: 'var(--text-muted)',
                fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                userSelect: 'none', transition: 'var(--transition)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              {collapsed[category]
                ? <ChevronRight size={11} style={{ flexShrink: 0 }} />
                : <ChevronDown size={11} style={{ flexShrink: 0 }} />
              }
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {category}
              </span>
              {isAdminOrOwner && (
                <span
                  onClick={e => { e.stopPropagation(); setShowCreateModal(true); }}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px', opacity: 0.6 }}
                  title="Create Channel"
                >
                  <Plus size={13} />
                </span>
              )}
            </div>

            {/* Channel rows */}
            {!collapsed[category] && chs.map(channel => {
              const isActive = activeChannelId === channel.id;
              return (
                <div
                  key={channel.id}
                  onClick={() => handleChannelClick(channel)}
                  onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '5px 10px 5px 10px',
                    margin: '1px 6px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(88,101,242,0.2) 0%, rgba(88,101,242,0.1) 100%)'
                      : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 0 0 1px rgba(88,101,242,0.25), inset 0 0 20px rgba(88,101,242,0.05)' : 'none',
                    transition: 'all var(--transition)',
                    userSelect: 'none',
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
                  <ChannelIcon type={channel.type} />
                  <span style={{
                    fontSize: 13.5, fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                  }}>
                    {channel.name}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {isAdminOrOwner && (
        <ChannelCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          serverId={serverId}
        />
      )}
    </div>
  );
}
