import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { serversApi } from '../../api/servers';
import { useChannelStore } from '../../store/channelStore';

type ChannelType = 'text' | 'voice';

interface ChannelCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
  defaultCategory?: string;
}

export function ChannelCreateModal({ isOpen, onClose, serverId, defaultCategory }: ChannelCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [category, setCategory] = useState(defaultCategory || 'Text Channels');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { addChannel } = useChannelStore();

  // Sync category when defaultCategory changes (modal re-opens for different category)
  useEffect(() => {
    if (isOpen) setCategory(defaultCategory || 'Text Channels');
  }, [isOpen, defaultCategory]);

  const handleClose = () => {
    setName('');
    setError('');
    setCategory(defaultCategory || 'Text Channels');
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Channel name is required'); return; }
    setIsLoading(true);
    setError('');
    try {
      const channel = await serversApi.createChannel(serverId, {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type,
        category: category.trim() || 'Text Channels',
      });
      addChannel(channel);
      handleClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create channel');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Channel">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Channel type selector */}
        <div>
          <label style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            display: 'block',
            marginBottom: 8,
          }}>
            Channel Type
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['text', 'voice'] as ChannelType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                style={{
                  flex: 1,
                  padding: '10px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${type === t ? 'var(--accent)' : 'var(--border)'}`,
                  background: type === t ? 'rgba(88,101,242,0.12)' : 'var(--bg-overlay)',
                  color: type === t ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  fontWeight: 500,
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {t === 'text' ? (
                  <><span style={{ fontWeight: 700 }}>#</span> Text</>
                ) : (
                  <><span>🔊</span> Voice</>
                )}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Channel Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={type === 'text' ? 'general' : 'General Voice'}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          autoFocus
        />

        <Input
          label="Category"
          value={category}
          onChange={e => setCategory(e.target.value)}
          placeholder="Text Channels"
        />

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={handleCreate} isLoading={isLoading} style={{ flex: 1 }}>
            Create Channel
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
