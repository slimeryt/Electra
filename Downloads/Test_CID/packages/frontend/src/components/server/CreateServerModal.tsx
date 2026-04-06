import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useServerStore } from '../../store/serverStore';
import { useNavigate } from 'react-router-dom';
import { useChannelStore } from '../../store/channelStore';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'create' | 'join';

export function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [inviteCode, setInviteCode] = useState('');

  const { createServer, joinServer, setActiveServer } = useServerStore();
  const { fetchChannels, getChannels, setActiveChannel } = useChannelStore();
  const navigate = useNavigate();

  const resetForm = () => {
    setName('');
    setDescription('');
    setInviteCode('');
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Server name is required'); return; }
    setIsLoading(true);
    setError('');
    try {
      const server = await createServer(name.trim(), description.trim() || undefined);
      setActiveServer(server.id);
      await fetchChannels(server.id);
      const channels = getChannels(server.id);
      const first = channels.find(c => c.type === 'text');
      if (first) {
        setActiveChannel(first.id);
        navigate(`/app/servers/${server.id}/channels/${first.id}`);
      }
      handleClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to create server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) { setError('Invite code is required'); return; }
    setIsLoading(true);
    setError('');
    try {
      const server = await joinServer(inviteCode.trim());
      setActiveServer(server.id);
      await fetchChannels(server.id);
      const channels = getChannels(server.id);
      const first = channels.find(c => c.type === 'text');
      if (first) {
        setActiveChannel(first.id);
        navigate(`/app/servers/${server.id}/channels/${first.id}`);
      }
      handleClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Invalid invite code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add a Server">
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['create', 'join'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${mode === m ? 'var(--accent)' : 'var(--border)'}`,
              background: mode === m ? 'rgba(88,101,242,0.12)' : 'transparent',
              color: mode === m ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              transition: 'var(--transition)',
            }}
          >
            {m === 'create' ? 'Create Server' : 'Join Server'}
          </button>
        ))}
      </div>

      {mode === 'create' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Server Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="My awesome server"
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's this server about?"
          />
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>
          )}
          <Button onClick={handleCreate} isLoading={isLoading} style={{ width: '100%' }}>
            Create Server
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Invite Code"
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value)}
            placeholder="Enter an invite code or link"
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            autoFocus
          />
          {error && (
            <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{error}</p>
          )}
          <Button onClick={handleJoin} isLoading={isLoading} style={{ width: '100%' }}>
            Join Server
          </Button>
        </div>
      )}
    </Modal>
  );
}
