import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Volume2, Megaphone, ChevronDown, ChevronRight, Plus, CheckCheck, Clipboard, Pencil, Trash2, FolderPlus, Mic } from 'lucide-react';
import { useChannelStore } from '../../store/channelStore';
import { useServerStore } from '../../store/serverStore';
import { useAuthStore } from '../../store/authStore';
import { useVoiceStore } from '../../store/voiceStore';
import { Channel } from '../../types/models';
import { ChannelCreateModal } from '../server/ChannelCreateModal';
import { useContextMenu } from '../../context/ContextMenuContext';
import { channelsApi } from '../../api/channels';
import { categoriesApi, ServerCategory } from '../../api/categories';
import { Avatar } from '../ui/Avatar';

function ChannelIcon({ type }: { type: string }) {
  if (type === 'voice') return <Volume2 size={15} style={{ opacity: 0.6, flexShrink: 0 }} />;
  if (type === 'announcement') return <Megaphone size={15} style={{ opacity: 0.6, flexShrink: 0 }} />;
  return <Hash size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
}

export function ChannelSidebar({ serverId }: { serverId: string }) {
  const { channelsByServer, activeChannelId, setActiveChannel, fetchChannels, removeChannel } = useChannelStore();
  const { servers } = useServerStore();
  const { user } = useAuthStore();
  const { activeChannelId: activeVoiceChannelId, channelParticipants } = useVoiceStore();
  const navigate = useNavigate();
  const { show } = useContextMenu();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalCategory, setCreateModalCategory] = useState<string | undefined>(undefined);
  const [createModalType, setCreateModalType] = useState<'text' | 'voice' | 'announcement' | undefined>(undefined);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Categories state
  const [categories, setCategories] = useState<ServerCategory[]>([]);
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const newCatInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const dragItem = useRef<{ type: 'channel' | 'category'; id: string } | null>(null);
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);
  const [dragOverChannelId, setDragOverChannelId] = useState<string | null>(null);

  const channels = channelsByServer[serverId] || [];
  const server = servers.find(s => s.id === serverId);
  const isAdminOrOwner = server?.owner_id === user?.id;

  useEffect(() => {
    if (!serverId) return;
    fetchChannels(serverId);
    categoriesApi.list(serverId).then(setCategories).catch(() => {});
  }, [serverId]);

  useEffect(() => {
    setLocalChannels(channels);
  }, [channels]);

  useEffect(() => {
    if (creatingCategory) newCatInputRef.current?.focus();
  }, [creatingCategory]);

  // ─── Category drag ───────────────────────────────────────────────────────────

  const handleCategoryDragStart = (catId: string) => {
    dragItem.current = { type: 'category', id: catId };
  };

  const handleCategoryDragOver = (e: React.DragEvent, targetCatId: string) => {
    e.preventDefault();
    if (!dragItem.current || dragItem.current.type !== 'category' || dragItem.current.id === targetCatId) return;
    setCategories(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(c => c.id === dragItem.current!.id);
      const toIdx = arr.findIndex(c => c.id === targetCatId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  const handleCategoryDrop = async (targetCatId: string) => {
    if (!dragItem.current || dragItem.current.type !== 'category') { dragItem.current = null; return; }
    dragItem.current = null;
    setDragOverCatId(null);
    await Promise.all(categories.map((c, i) => categoriesApi.update(serverId, c.id, { position: i })));
  };

  // ─── Channel drag ────────────────────────────────────────────────────────────

  const handleChannelDragStart = (channelId: string) => {
    dragItem.current = { type: 'channel', id: channelId };
  };

  // Drag over another channel: reorder within same category
  const handleChannelDragOver = (e: React.DragEvent, targetChannelId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem.current || dragItem.current.type !== 'channel') return;
    if (dragItem.current.id === targetChannelId) return;
    setDragOverChannelId(targetChannelId);

    setLocalChannels(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(c => c.id === dragItem.current!.id);
      const toIdx = arr.findIndex(c => c.id === targetChannelId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const fromCat = (arr[fromIdx] as any).category;
      const toCat = (arr[toIdx] as any).category;
      if (fromCat !== toCat) return prev; // cross-category handled by category drop zone
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  };

  // Drag over a category header: show it as a drop zone
  const handleCategoryDropZoneDragOver = (e: React.DragEvent, catName: string) => {
    e.preventDefault();
    if (!dragItem.current || dragItem.current.type !== 'channel') return;
    setDragOverCatId(catName);
    setDragOverChannelId(null);
  };

  // Drop on a category header: move channel to that category
  const handleCategoryDropZoneDrop = async (e: React.DragEvent, catName: string) => {
    e.preventDefault();
    if (!dragItem.current || dragItem.current.type !== 'channel') { dragItem.current = null; return; }
    const channelId = dragItem.current.id;
    dragItem.current = null;
    setDragOverCatId(null);

    // Move channel to the new category at the end
    const catChannels = localChannels.filter(c => ((c as any).category || '') === catName);
    const newPosition = catChannels.length;
    setLocalChannels(prev => prev.map(c => c.id === channelId
      ? { ...c, category: catName } as any
      : c
    ));
    await channelsApi.update(channelId, { category: catName, position: newPosition });
  };

  // Drop on channel (finalize same-category reorder)
  const handleChannelDrop = async (targetChannelId: string) => {
    if (!dragItem.current || dragItem.current.type !== 'channel') { dragItem.current = null; return; }
    dragItem.current = null;
    setDragOverChannelId(null);
    // Persist positions for channels in the same category
    const droppedChannel = localChannels.find(c => c.id === targetChannelId);
    if (!droppedChannel) return;
    const cat = (droppedChannel as any).category;
    const catChannels = localChannels.filter(c => ((c as any).category || '') === (cat || ''));
    await Promise.all(catChannels.map((ch, i) => channelsApi.update(ch.id, { position: i })));
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    setDragOverCatId(null);
    setDragOverChannelId(null);
  };

  // ─── Sidebar / category context menus ────────────────────────────────────────

  const openCreate = (type: 'text' | 'voice' | 'announcement', catName?: string) => {
    setCreateModalType(type);
    setCreateModalCategory(catName);
    setShowCreateModal(true);
  };

  const handleSidebarContextMenu = (e: React.MouseEvent) => {
    if (!isAdminOrOwner) return;
    e.preventDefault();
    show([
      { label: 'Create Text Channel', icon: <Hash size={14} />, onClick: () => openCreate('text') },
      { label: 'Create Voice Channel', icon: <Mic size={14} />, onClick: () => openCreate('voice') },
      { label: 'Create Announcement', icon: <Megaphone size={14} />, onClick: () => openCreate('announcement') },
      { divider: true, label: '', onClick: () => {} },
      { label: 'Create Category', icon: <FolderPlus size={14} />, onClick: () => setCreatingCategory(true) },
    ], e.clientX, e.clientY);
  };

  const handleCategoryContextMenu = (e: React.MouseEvent, cat: ServerCategory) => {
    if (!isAdminOrOwner) return;
    e.preventDefault();
    e.stopPropagation();
    show([
      { label: 'Create Text Channel', icon: <Hash size={14} />, onClick: () => openCreate('text', cat.name) },
      { label: 'Create Voice Channel', icon: <Mic size={14} />, onClick: () => openCreate('voice', cat.name) },
      { label: 'Create Announcement', icon: <Megaphone size={14} />, onClick: () => openCreate('announcement', cat.name) },
      { divider: true, label: '', onClick: () => {} },
      { label: 'Delete Category', icon: <Trash2 size={14} />, danger: true, onClick: async () => {
        if (confirm(`Delete category "${cat.name}"? Channels inside will become uncategorized.`)) {
          await categoriesApi.delete(serverId, cat.id);
          setCategories(prev => prev.filter(c => c.id !== cat.id));
        }
      }},
    ], e.clientX, e.clientY);
  };

  // ─── Channel context menu ────────────────────────────────────────────────────

  const handleChannelContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    e.stopPropagation();
    show([
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
    ], e.clientX, e.clientY);
  };

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel.id);
    if (channel.type === 'voice') {
      navigate(`/app/servers/${serverId}/voice/${channel.id}`);
    } else {
      navigate(`/app/servers/${serverId}/channels/${channel.id}`);
    }
  };

  // ─── Create category ─────────────────────────────────────────────────────────

  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) { setCreatingCategory(false); setNewCatName(''); return; }
    try {
      const cat = await categoriesApi.create(serverId, name);
      setCategories(prev => [...prev, cat]);
    } catch {}
    setCreatingCategory(false);
    setNewCatName('');
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  // Build ordered category list — categories with channels grouped, empty categories shown too
  const channelsByCategory = localChannels.reduce<Record<string, Channel[]>>((acc, ch) => {
    const cat = (ch as any).category || '';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ch);
    return acc;
  }, {});

  // Channels with no category or a category not in the categories list
  const knownCatNames = new Set(categories.map(c => c.name));
  const orphanChannels = localChannels.filter(ch => {
    const cat = (ch as any).category;
    return !cat || !knownCatNames.has(cat);
  });

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-panel)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflow: 'hidden',
    }}>
      {/* Server banner */}
      {server?.banner_url && (
        <div style={{ height: 60, flexShrink: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
          <img src={server.banner_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      {/* Server header */}
      <div
        style={{
          padding: '0 14px', height: 52,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', flexShrink: 0, transition: 'background var(--transition)',
          background: 'linear-gradient(180deg, rgba(88,101,242,0.06) 0%, transparent 100%)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(180deg, rgba(88,101,242,0.11) 0%, rgba(88,101,242,0.03) 100%)'}
        onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(180deg, rgba(88,101,242,0.06) 0%, transparent 100%)'}
      >
        <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
          {server?.name || 'Server'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isAdminOrOwner && (
            <span
              onClick={e => { e.stopPropagation(); setCreatingCategory(true); }}
              title="Create Category"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', opacity: 0.6, borderRadius: 'var(--radius-sm)', transition: 'opacity 150ms' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.6'}
            >
              <FolderPlus size={14} />
            </span>
          )}
          <ChevronDown size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>
      </div>

      {/* Channel list */}
      <div onContextMenu={handleSidebarContextMenu} style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>

        {/* New category input */}
        {creatingCategory && (
          <div style={{ padding: '6px 10px' }}>
            <input
              ref={newCatInputRef}
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') { setCreatingCategory(false); setNewCatName(''); }
              }}
              onBlur={handleCreateCategory}
              placeholder="Category name..."
              style={{
                width: '100%', padding: '5px 8px', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                background: 'var(--bg-overlay)', border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {/* Explicit categories */}
        {categories.map(cat => {
          const chs = channelsByCategory[cat.name] || [];
          const isCollapsed = collapsed[cat.id];
          const isDragTarget = dragOverCatId === cat.name;
          return (
            <div
              key={cat.id}
              draggable={isAdminOrOwner}
              onDragStart={() => handleCategoryDragStart(cat.id)}
              onDragOver={e => {
                if (dragItem.current?.type === 'category') handleCategoryDragOver(e, cat.id);
                else handleCategoryDropZoneDragOver(e, cat.name);
              }}
              onDrop={e => {
                if (dragItem.current?.type === 'category') handleCategoryDrop(cat.id);
                else handleCategoryDropZoneDrop(e, cat.name);
              }}
              onDragEnd={handleDragEnd}
            >
              {/* Category header */}
              <div
                onClick={() => setCollapsed(s => ({ ...s, [cat.id]: !s[cat.id] }))}
                onContextMenu={e => handleCategoryContextMenu(e, cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '10px 8px 4px 14px',
                  cursor: 'pointer', color: isDragTarget ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                  userSelect: 'none', transition: 'var(--transition)',
                  background: isDragTarget ? 'rgba(88,101,242,0.08)' : 'transparent',
                  borderRadius: isDragTarget ? 'var(--radius-sm)' : 0,
                }}
                onMouseEnter={e => { if (!isDragTarget) e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { if (!isDragTarget) e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                {isCollapsed
                  ? <ChevronRight size={11} style={{ flexShrink: 0 }} />
                  : <ChevronDown size={11} style={{ flexShrink: 0 }} />
                }
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cat.name}
                </span>
                {isAdminOrOwner && (
                  <span
                    onClick={e => { e.stopPropagation(); setCreateModalCategory(cat.name); setShowCreateModal(true); }}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px', opacity: 0.6 }}
                    title="Create Channel"
                  >
                    <Plus size={13} />
                  </span>
                )}
              </div>

              {/* Channel rows */}
              {!isCollapsed && chs.map(channel => {
                const isActive = activeChannelId === channel.id;
                const isDraggingThis = dragItem.current?.id === channel.id && dragItem.current?.type === 'channel';
                const isDragOverThis = dragOverChannelId === channel.id;
                return (
                  <div
                    key={channel.id}
                    draggable={isAdminOrOwner}
                    onDragStart={() => handleChannelDragStart(channel.id)}
                    onDragOver={e => handleChannelDragOver(e, channel.id)}
                    onDrop={() => handleChannelDrop(channel.id)}
                    onDragEnd={handleDragEnd}
                    style={{
                      margin: '1px 6px',
                      opacity: isDraggingThis ? 0.4 : 1,
                      transition: 'opacity 120ms',
                      borderTop: isDragOverThis ? '2px solid var(--accent)' : '2px solid transparent',
                    }}
                  >
                    <div
                      onClick={() => handleChannelClick(channel)}
                      onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '5px 10px', borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: isActive
                          ? 'linear-gradient(135deg, rgba(88,101,242,0.22) 0%, rgba(124,58,237,0.10) 100%)'
                          : 'transparent',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: isActive ? '0 0 0 1px rgba(88,101,242,0.28), inset 0 0 24px rgba(88,101,242,0.06)' : 'none',
                        transition: 'all var(--transition)', userSelect: 'none',
                      }}
                      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                    >
                      <ChannelIcon type={channel.type} />
                      <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {channel.name}
                      </span>
                      {channel.type === 'voice' && activeVoiceChannelId === channel.id && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', flexShrink: 0, boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
                      )}
                    </div>
                    {/* Voice participants */}
                    {channel.type === 'voice' && (channelParticipants[channel.id]?.length ?? 0) > 0 && (
                      <div style={{ paddingLeft: 28, paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {(channelParticipants[channel.id] || []).map(p => (
                          <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', borderRadius: 'var(--radius-sm)', opacity: 0.85 }}>
                            <Avatar user={p.user as any} size={16} />
                            <span style={{ fontSize: 11.5, color: p.userId === user?.id ? 'var(--success)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.user?.display_name || p.user?.username || 'User'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Orphan channels (no category / unknown category) */}
        {orphanChannels.length > 0 && (
          <div>
            {orphanChannels.map(channel => {
              const isActive = activeChannelId === channel.id;
              return (
                <div key={channel.id} style={{ margin: '1px 6px' }}>
                  <div
                    onClick={() => handleChannelClick(channel)}
                    onContextMenu={(e) => handleChannelContextMenu(e, channel)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      padding: '5px 10px', borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      background: isActive ? 'linear-gradient(135deg, rgba(88,101,242,0.22) 0%, rgba(124,58,237,0.10) 100%)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all var(--transition)', userSelect: 'none',
                    }}
                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  >
                    <ChannelIcon type={channel.type} />
                    <span style={{ fontSize: 13.5, fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {channel.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAdminOrOwner && (
        <ChannelCreateModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setCreateModalCategory(undefined); setCreateModalType(undefined); }}
          serverId={serverId}
          defaultCategory={createModalCategory}
          defaultType={createModalType}
        />
      )}
    </div>
  );
}
