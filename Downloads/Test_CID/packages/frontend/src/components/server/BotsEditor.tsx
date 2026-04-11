import { useEffect, useState } from 'react';
import { Bot, Sparkles, Shield, UserPlus } from 'lucide-react';
import { botsApi, BotConfigs } from '../../api/bots';
import { rolesApi } from '../../api/roles';
import { useChannelStore } from '../../store/channelStore';
import { ServerRole, Channel } from '../../types/models';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface BotsEditorProps {
  serverId: string;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent)' : 'var(--bg-hover)',
        position: 'relative', transition: 'background 200ms', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 200ms', display: 'block',
      }} />
    </button>
  );
}

function BotCard({
  icon, name, description, enabled, onToggle, children,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--bg-overlay)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px',
        borderBottom: enabled && children ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 'var(--radius-md)',
          background: 'var(--accent)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#fff', flexShrink: 0,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{description}</div>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      {enabled && children && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function BotsEditor({ serverId }: BotsEditorProps) {
  const [configs, setConfigs] = useState<BotConfigs | null>(null);
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const { channelsByServer, fetchChannels } = useChannelStore();

  useEffect(() => {
    botsApi.getConfigs(serverId).then(setConfigs).catch(() => {});
    rolesApi.list(serverId).then(r => setRoles(r.filter(role => !role.is_default))).catch(() => {});
    fetchChannels(serverId);
  }, [serverId]);

  useEffect(() => {
    setChannels((channelsByServer[serverId] || []).filter(c => c.type === 'text'));
  }, [channelsByServer, serverId]);

  const save = async (type: string, enabled: boolean, config: Record<string, any>) => {
    setSaving(type);
    try {
      const updated = await botsApi.setConfig(serverId, type, enabled, config);
      setConfigs(updated);
    } catch {}
    finally { setSaving(null); }
  };

  if (!configs) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <div style={{ width: 24, height: 24, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  const welcome  = configs.welcome;
  const autorole = configs.autorole;
  const automod  = configs.automod;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Welcome Bot */}
      <BotCard
        icon={<Sparkles size={18} />}
        name="Welcome Bot"
        description="Sends a message to a channel when a new member joins the server."
        enabled={welcome.enabled}
        onToggle={v => save('welcome', v, welcome.config)}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Welcome Channel
          </div>
          <select
            value={welcome.config.channel_id || ''}
            onChange={e => setConfigs(c => c ? { ...c, welcome: { ...c.welcome, config: { ...c.welcome.config, channel_id: e.target.value } } } : c)}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-base)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
            }}
          >
            <option value="">— Select a channel —</option>
            {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Welcome Message
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-muted)' }}>
              Use {'{user}'}, {'{username}'}, {'{server}'}
            </span>
          </div>
          <textarea
            value={welcome.config.message || ''}
            onChange={e => setConfigs(c => c ? { ...c, welcome: { ...c.welcome, config: { ...c.welcome.config, message: e.target.value } } } : c)}
            rows={3}
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-base)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>
        <Button
          size="sm"
          isLoading={saving === 'welcome'}
          onClick={() => save('welcome', true, welcome.config)}
          style={{ alignSelf: 'flex-start' }}
        >
          Save
        </Button>
      </BotCard>

      {/* Auto-role Bot */}
      <BotCard
        icon={<UserPlus size={18} />}
        name="Auto-role"
        description="Automatically assigns a role to new members when they join."
        enabled={autorole.enabled}
        onToggle={v => save('autorole', v, autorole.config)}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Role to assign
          </div>
          {roles.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              No custom roles yet. Create roles in the Roles tab first.
            </p>
          ) : (
            <select
              value={autorole.config.role_id || ''}
              onChange={e => setConfigs(c => c ? { ...c, autorole: { ...c.autorole, config: { role_id: e.target.value } } } : c)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
              }}
            >
              <option value="">— Select a role —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id} style={{ color: r.color }}>{r.name}</option>
              ))}
            </select>
          )}
        </div>
        {roles.length > 0 && (
          <Button
            size="sm"
            isLoading={saving === 'autorole'}
            onClick={() => save('autorole', true, autorole.config)}
            style={{ alignSelf: 'flex-start' }}
          >
            Save
          </Button>
        )}
      </BotCard>

      {/* Auto-mod Bot */}
      <BotCard
        icon={<Shield size={18} />}
        name="Auto-mod"
        description="Automatically deletes messages containing banned words or phrases."
        enabled={automod.enabled}
        onToggle={v => save('automod', v, automod.config)}
      >
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
            Banned words / phrases
            <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-muted)' }}>one per line</span>
          </div>
          <textarea
            value={(automod.config.banned_words as string[] || []).join('\n')}
            onChange={e => {
              const words = e.target.value.split('\n').map(w => w.trim()).filter(Boolean);
              setConfigs(c => c ? { ...c, automod: { ...c.automod, config: { banned_words: words } } } : c);
            }}
            rows={5}
            placeholder="spam&#10;badword&#10;another phrase"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-base)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit',
              resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>
        <Button
          size="sm"
          isLoading={saving === 'automod'}
          onClick={() => save('automod', true, automod.config)}
          style={{ alignSelf: 'flex-start' }}
        >
          Save
        </Button>
      </BotCard>
    </div>
  );
}
