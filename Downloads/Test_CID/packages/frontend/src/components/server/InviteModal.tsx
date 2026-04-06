import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Server } from '../../types/models';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server | null;
}

export function InviteModal({ isOpen, onClose, server }: InviteModalProps) {
  const [copied, setCopied] = useState(false);

  const inviteLink = server
    ? `${window.location.origin}/app?invite=${server.invite_code}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyCode = () => {
    if (!server?.invite_code) return;
    navigator.clipboard.writeText(server.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite People">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Share this link to invite people to{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{server?.name}</strong>
        </p>

        {/* Link field */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '10px 12px',
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          alignItems: 'center',
        }}>
          <span style={{
            flex: 1,
            fontSize: 13,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
          }}>
            {inviteLink}
          </span>
          <Button size="sm" onClick={handleCopy} style={{ flexShrink: 0 }}>
            {copied ? '✓ Copied!' : 'Copy'}
          </Button>
        </div>

        {/* Invite code */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--bg-overlay)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
        }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
            Code:
          </span>
          <code style={{
            flex: 1,
            background: 'transparent',
            color: 'var(--accent)',
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '0.05em',
          }}>
            {server?.invite_code}
          </code>
          <Button size="sm" variant="secondary" onClick={handleCopyCode} style={{ flexShrink: 0 }}>
            Copy
          </Button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
          This link never expires. Anyone with the link can join the server.
        </p>
      </div>
    </Modal>
  );
}
