import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, Volume2, Megaphone, ChevronDown, ChevronRight,
  Plus, CheckCheck, Clipboard, Pencil, Trash2, FolderPlus, Mic, MessagesSquare,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ChannelIcon({ type }: { type: string }) {
  if (type === 'voice') return <Volume2 size={15} style={{ opacity: 0.6, flexShrink: 0 }} />;
  if (type === 'announcement') return <Megaphone size={15} style={{ opacity: 0.6, flexShrink: 0 }} />;
  if (type === 'forum') return <MessagesSquare size={15} style={{ opacity: 0.75, color: 'var(--accent)', flexShrink: 0 }} />;
  return <Hash size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />;
}

// dnd-kit IDs are prefixed to avoid collisions between categories and channels
const CAT_PREFIX = 'cat-';
const CH_PREFIX = 'ch-';

function isCatId(id: string) { return id.startsWith(CAT_PREFIX); }
function rawCatId(id: string) { return id.slice(CAT_PREFIX.length); }
function rawChId(id: string) { return id.slice(CH_PREFIX.length); }

// ─── SortableCategory ────────────────────────────────────────────────────────

interface SortableCategoryProps {
  cat: ServerCategory;
  disabled: boolean;
  isCollapsed: boolean;
  isDragOverForChannel: boolean;
  onToggleCollapse: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onCreateChannel: () => void;
  isAdminOrOwner: boolean;
  children: React.ReactNode;
}

function SortableCategory({
  cat, disabled, isCollapsed, isDragOverForChannel,
  onToggleCollapse, onContextMenu, onCreateChannel,
  isAdminOrOwner, children,
}: SortableCategoryProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: `${CAT_PREFIX}${cat.id}`, disabled });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Category header */}
      <div
        onClick={onToggleCollapse}
        onContextMenu={onContextMenu}
        // drag handle: spread listeners/attributes on the header so only the
        // header row initiates category drags (not channel rows inside)
        {...(isAdminOrOwner ? { ...attributes, ...listeners } : {})}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '10px 8px 4px 14px',
          cursor: isAdminOrOwner ? 'grab' : 'pointer',
          color: isDragOverForChannel ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          userSelect: 'none', transition: 'var(--transition)',
          background: isDragOverForChannel ? 'rgba(88,101,242,0.08)' : 'transparent',
          borderRadius: isDragOverForChannel ? 'var(--radius-sm)' : 0,
        }}
        onMouseEnter={e => { if (!isDragOverForChannel) e.currentTarget.style.color = 'var(--text-secondary)'; }}
        onMouseLeave={e => { if (!isDragOverForChannel) e.currentTarget.style.color = 'var(--text-muted)'; }}
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
            onClick={e => { e.stopPropagation(); onCreateChannel(); }}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px', opacity: 0.6 }}
            title="Create Channel"
            // prevent the click from bubbling to the drag listeners
            onPointerDown={e => e.stopPropagation()}
          >
            <Plus size={13} />
          </span>
        )}
      </div>

      {/* Channel rows rendered by parent */}
      {!isCollapsed && children}
    </div>
  );
}

// ─── SortableChannel ─────────────────────────────────────────────────────────

interface SortableChannelProps {
  channel: Channel;
  disabled: boolean;
  isActive: boolean;
  activeVoiceChannelId: string | null | undefined;
  channelParticipants: Record<string, { userId: string; user?: any }[]>;
  userId: string | undefined;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function SortableChannel({
  channel, disabled, isActive,
  activeVoiceChannelId, channelParticipants,
  userId, onClick, onContextMenu,
}: SortableChannelProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: `${CH_PREFIX}${channel.id}`, disabled });

  const style: React.CSSProperties = {
    margin: '1px 6px',
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const participants = channelParticipants[channel.id] || [];

  return (
    <div ref={setNodeRef} style={style} {...(disabled ? {} : { ...attributes, ...listeners })}>
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        // stop pointer events from re-triggering sortable drag on inner click
        onPointerDown={e => e.stopPropagation()}
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
      {channel.type === 'voice' && participants.length > 0 && (
        <div style={{ paddingLeft: 28, paddingBottom: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {participants.map(p => (
            <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 6px', borderRadius: 'var(--radius-sm)', opacity: 0.85 }}>
              <Avatar user={p.user as any} size={16} />
              <span style={{ fontSize: 11.5, color: p.userId === userId ? 'var(--success)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.user?.display_name || p.user?.username || 'User'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CategoryDropZone ─────────────────────────────────────────────────────────
// An invisible droppable target that covers a category, used to detect when
// a channel is dragged over a different category. We use useSortable with
// disabled=true so it acts as a pure drop target with an id the DragOver
// handler can read.

function CategoryDropZone({ catId }: { catId: string }) {
  const { setNodeRef } = useSortable({ id: `zone-${catId}`, disabled: true });
  return <div ref={setNodeRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

// ─── ChannelSidebar ───────────────────────────────────────────────────────────

export function ChannelSidebar({ serverId }: { serverId: string }) {
  const { channelsByServer, activeChannelId, setActiveChannel, fetchChannels, removeChannel } = useChannelStore();
  const { servers } = useServerStore();
  const { user } = useAuthStore();
  const { activeChannelId: activeVoiceChannelId, channelParticipants } = useVoiceStore();
  const navigate = useNavigate();
  const { show } = useContextMenu();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalCategory, setCreateModalCategory] = useState<string | undefined>(undefined);
  const [createModalType, setCreateModalType] = useState<'text' | 'voice' | 'announcement' | 'forum' | undefined>(undefined);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Categories state
  const [categories, setCategories] = useState<ServerCategory[]>([]);
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const newCatInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);
  // catId that a channel is currently being dragged over (for highlight)
  const [dragOverCatId, setDragOverCatId] = useState<string | null>(null);

  const channels = channelsByServer[serverId] || [];
  const server = servers.find(s => s.id === serverId);
  const isAdminOrOwner = server?.owner_id === user?.id;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

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

  // ─── Context menus ────────────────────────────────────────────────────────

  const openCreate = (type: 'text' | 'voice' | 'announcement' | 'forum', catName?: string) => {
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
      { label: 'Create Forum Channel', icon: <MessagesSquare size={14} />, onClick: () => openCreate('forum') },
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
      { label: 'Create Forum Channel', icon: <MessagesSquare size={14} />, onClick: () => openCreate('forum', cat.name) },
      { divider: true, label: '', onClick: () => {} },
      { label: 'Delete Category', icon: <Trash2 size={14} />, danger: true, onClick: async () => {
        if (confirm(`Delete category "${cat.name}"? Channels inside will become uncategorized.`)) {
          await categoriesApi.delete(serverId, cat.id);
          setCategories(prev => prev.filter(c => c.id !== cat.id));
        }
      }},
    ], e.clientX, e.clientY);
  };

  const handleChannelContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    e.stopPropagation();
    show([
      { label: 'Mark as Read', icon: <CheckCheck size={14} />, onClick: async () => {
        try { await channelsApi.markChannelRead(channel.id); } catch { /* ignore */ }
      }},
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

  // ─── Create category ─────────────────────────────────────────────────────

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

  // ─── dnd-kit event handlers ───────────────────────────────────────────────

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setDragOverCatId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) { setDragOverCatId(null); return; }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Only care about channel-over-category moves here
    if (!activeIdStr.startsWith(CH_PREFIX)) return;

    const channelId = rawChId(activeIdStr);
    const draggedChannel = localChannels.find(c => c.id === channelId);
    if (!draggedChannel) return;

    const draggedCatName = (draggedChannel as any).category || '';

    // Over a category header
    if (overIdStr.startsWith(CAT_PREFIX)) {
      const targetCatId = rawCatId(overIdStr);
      const targetCat = categories.find(c => c.id === targetCatId);
      if (!targetCat) return;
      if (targetCat.name === draggedCatName) { setDragOverCatId(null); return; }
      setDragOverCatId(targetCatId);

      // Optimistically move the channel into the new category (at end)
      setLocalChannels(prev => {
        const arr = [...prev];
        const idx = arr.findIndex(c => c.id === channelId);
        if (idx === -1) return prev;
        arr[idx] = { ...arr[idx], category: targetCat.name } as any;
        return arr;
      });
      return;
    }

    // Over another channel — reorder within same category
    if (overIdStr.startsWith(CH_PREFIX)) {
      setDragOverCatId(null);
      const targetChannelId = rawChId(overIdStr);
      if (channelId === targetChannelId) return;

      setLocalChannels(prev => {
        const fromIdx = prev.findIndex(c => c.id === channelId);
        const toIdx = prev.findIndex(c => c.id === targetChannelId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        // Only reorder within same category
        const fromCat = (prev[fromIdx] as any).category || '';
        const toCat = (prev[toIdx] as any).category || '';
        if (fromCat !== toCat) return prev;
        return arrayMove(prev, fromIdx, toIdx);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverCatId(null);

    if (!over) return;

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // ── Category reorder ──
    if (activeIdStr.startsWith(CAT_PREFIX) && overIdStr.startsWith(CAT_PREFIX)) {
      const fromCatId = rawCatId(activeIdStr);
      const toCatId = rawCatId(overIdStr);
      if (fromCatId === toCatId) return;

      const fromIdx = categories.findIndex(c => c.id === fromCatId);
      const toIdx = categories.findIndex(c => c.id === toCatId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = arrayMove(categories, fromIdx, toIdx);
      setCategories(reordered);
      await Promise.all(reordered.map((c, i) => categoriesApi.update(serverId, c.id, { position: i })));
      return;
    }

    // ── Channel drag end ──
    if (activeIdStr.startsWith(CH_PREFIX)) {
      const channelId = rawChId(activeIdStr);
      const draggedChannel = localChannels.find(c => c.id === channelId);
      if (!draggedChannel) return;

      // Dropped on a category header — cross-category move
      if (overIdStr.startsWith(CAT_PREFIX)) {
        const targetCatId = rawCatId(overIdStr);
        const targetCat = categories.find(c => c.id === targetCatId);
        if (!targetCat) return;
        const catChannels = localChannels.filter(c => ((c as any).category || '') === targetCat.name);
        const newPos = catChannels.findIndex(c => c.id === channelId);
        const position = newPos === -1 ? catChannels.length : newPos;
        await channelsApi.update(channelId, { category: targetCat.name, position });
        return;
      }

      // Dropped on another channel — same-category reorder (local state already updated in DragOver)
      if (overIdStr.startsWith(CH_PREFIX)) {
        const cat = (draggedChannel as any).category || '';
        const catChannels = localChannels.filter(c => ((c as any).category || '') === cat);
        await Promise.all(catChannels.map((ch, i) => channelsApi.update(ch.id, { position: i })));
        return;
      }
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

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

  // The item being dragged (for DragOverlay preview)
  const activeChannel = activeId?.startsWith(CH_PREFIX)
    ? localChannels.find(c => c.id === rawChId(activeId))
    : null;
  const activeCat = activeId?.startsWith(CAT_PREFIX)
    ? categories.find(c => c.id === rawCatId(activeId))
    : null;

  // Sorted category ids for SortableContext
  const sortedCatIds = categories.map(c => `${CAT_PREFIX}${c.id}`);

  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-xl)',
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Sortable categories */}
          <SortableContext items={sortedCatIds} strategy={verticalListSortingStrategy}>
            {categories.map(cat => {
              const chs = channelsByCategory[cat.name] || [];
              const isCollapsed = collapsed[cat.id];
              const sortedChIds = chs.map(c => `${CH_PREFIX}${c.id}`);

              return (
                <SortableCategory
                  key={cat.id}
                  cat={cat}
                  disabled={!isAdminOrOwner}
                  isCollapsed={!!isCollapsed}
                  isDragOverForChannel={dragOverCatId === cat.id}
                  onToggleCollapse={() => setCollapsed(s => ({ ...s, [cat.id]: !s[cat.id] }))}
                  onContextMenu={e => handleCategoryContextMenu(e, cat)}
                  onCreateChannel={() => { setCreateModalCategory(cat.name); setShowCreateModal(true); }}
                  isAdminOrOwner={isAdminOrOwner}
                >
                  <SortableContext items={sortedChIds} strategy={verticalListSortingStrategy}>
                    {chs.map(channel => (
                      <SortableChannel
                        key={channel.id}
                        channel={channel}
                        disabled={!isAdminOrOwner}
                        isActive={activeChannelId === channel.id}
                        activeVoiceChannelId={activeVoiceChannelId}
                        channelParticipants={channelParticipants}
                        userId={user?.id}
                        onClick={() => handleChannelClick(channel)}
                        onContextMenu={e => handleChannelContextMenu(e, channel)}
                      />
                    ))}
                  </SortableContext>
                </SortableCategory>
              );
            })}
          </SortableContext>

          {/* Orphan channels (no category / unknown category) */}
          {orphanChannels.length > 0 && (
            <div>
              {orphanChannels.map(channel => {
                const isActive = activeChannelId === channel.id;
                return (
                  <div key={channel.id} style={{ margin: '1px 6px' }}>
                    <div
                      onClick={() => handleChannelClick(channel)}
                      onContextMenu={e => handleChannelContextMenu(e, channel)}
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

          {/* DragOverlay — lightweight preview that follows the cursor */}
          <DragOverlay>
            {activeChannel && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', margin: '0 6px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--accent)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                color: 'var(--text-primary)',
                fontSize: 13.5, fontWeight: 500,
                opacity: 0.92, cursor: 'grabbing',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
              }}>
                <ChannelIcon type={activeChannel.type} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {activeChannel.name}
                </span>
              </div>
            )}
            {activeCat && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--accent)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                color: 'var(--accent)',
                fontSize: 10.5, fontWeight: 700,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                opacity: 0.92, cursor: 'grabbing',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
              }}>
                {activeCat.name}
              </div>
            )}
          </DragOverlay>
        </DndContext>
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
