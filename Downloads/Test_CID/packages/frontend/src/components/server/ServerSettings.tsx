import { useState } from 'react';
import { Server } from '../../types/models';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { serversApi } from '../../api/servers';
import { useServerStore } from '../../store/serverStore';

interface ServerSettingsProps {
  server: Server;
  onClose: () => void;
}

export function ServerSettings({ server, onClose }: ServerSettingsProps) {
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState((server as any).description || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const { updateServer, removeServer } = useServerStore();

  const handleSave = async () => {
    if (!name.trim()) { setError('Server name is required'); return; }
    setIsLoading(true);
    setError('');
    try {
      const updated = await serversApi.update(server.id, { name: name.trim(), description: description.trim() });
      updateServer(updated);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to update server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${server.name}"? This action cannot be undone and all channels and messages will be permanently lost.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await serversApi.delete(server.id);
      removeServer(server.id);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to delete server');
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Input
        label="Server Name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSave()}
      />
      <Input
        label="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Tell people what this server is about"
      />

      {error && (
        <p style={{
          color: 'var(--danger)',
          fontSize: 13,
          margin: 0,
          padding: '8px 12px',
          background: 'rgba(239,68,68,0.1)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Button onClick={handleSave} isLoading={isLoading} style={{ flex: 1 }}>
          Save Changes
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* Danger zone */}
      <div style={{
        borderTop: '1px solid var(--border)',
        paddingTop: 20,
        marginTop: 4,
      }}>
        <div style={{
          padding: 16,
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 'var(--radius-md)',
        }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', margin: '0 0 6px' }}>
            Danger Zone
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Deleting a server is permanent and cannot be undone. All channels, messages, and data will be lost.
          </p>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            Delete Server
          </Button>
        </div>
      </div>
    </div>
  );
}
