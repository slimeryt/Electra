import { Server as IoServer } from 'socket.io';
import db from '../db/connection';

// ─── Migrations ───────────────────────────────────────────────────────────────
try { db.exec('ALTER TABLE users ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0'); } catch {}
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS server_bots (
      server_id TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      type      TEXT NOT NULL,
      enabled   INTEGER NOT NULL DEFAULT 0,
      config    TEXT NOT NULL DEFAULT '{}',
      PRIMARY KEY (server_id, type)
    )
  `);
} catch {}

// ─── Bot user ─────────────────────────────────────────────────────────────────
const BOT_USERNAME = 'electra';
const BOT_DISPLAY  = 'Electra';

function getBotUserId(): string {
  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND is_bot = 1').get(BOT_USERNAME) as { id: string } | undefined;
  if (existing) return existing.id;
  const created = db.prepare(
    `INSERT INTO users (username, display_name, email, password_hash, is_bot)
     VALUES (?, ?, 'bot@electra.internal', '', 1) RETURNING id`
  ).get(BOT_USERNAME, BOT_DISPLAY) as { id: string };
  return created.id;
}

// Call once at startup to ensure the bot user exists
let _botUserId: string | null = null;
export function initBot() {
  _botUserId = getBotUserId();
}
function botId() {
  if (!_botUserId) _botUserId = getBotUserId();
  return _botUserId;
}

// ─── Config helpers ───────────────────────────────────────────────────────────
export type BotType = 'welcome' | 'autorole' | 'automod';

export interface BotConfig {
  enabled: boolean;
  config: Record<string, any>;
}

export function getBotConfigs(serverId: string): Record<BotType, BotConfig> {
  const rows = db.prepare('SELECT type, enabled, config FROM server_bots WHERE server_id = ?').all(serverId) as { type: string; enabled: number; config: string }[];
  const defaults: Record<BotType, BotConfig> = {
    welcome:  { enabled: false, config: { channel_id: '', message: 'Welcome to {server}, {user}! 👋' } },
    autorole: { enabled: false, config: { role_id: '' } },
    automod:  { enabled: false, config: { banned_words: [] } },
  };
  for (const row of rows) {
    const type = row.type as BotType;
    if (defaults[type]) {
      defaults[type] = { enabled: !!row.enabled, config: { ...defaults[type].config, ...JSON.parse(row.config || '{}') } };
    }
  }
  return defaults;
}

export function setBotConfig(serverId: string, type: BotType, enabled: boolean, config: Record<string, any>) {
  db.prepare(`
    INSERT INTO server_bots (server_id, type, enabled, config)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(server_id, type) DO UPDATE SET enabled = excluded.enabled, config = excluded.config
  `).run(serverId, type, enabled ? 1 : 0, JSON.stringify(config));
}

// ─── Send a message as the bot ────────────────────────────────────────────────
function sendBotMessage(io: IoServer, channelId: string, content: string) {
  const bid = botId();
  const msg = db.prepare(
    `INSERT INTO messages (channel_id, author_id, content, type) VALUES (?, ?, ?, 'text') RETURNING *`
  ).get(channelId, bid, content) as any;

  const author = db.prepare('SELECT id, username, display_name, avatar_url, is_bot FROM users WHERE id = ?').get(bid);
  const enriched = { ...msg, author, attachments: [], reply_to: null };

  io.to(`channel:${channelId}`).emit('message_create', enriched);
  return enriched;
}

// ─── Event hooks ─────────────────────────────────────────────────────────────

/** Called after a user joins a server. Triggers Welcome + Auto-role bots. */
export function handleMemberJoin(io: IoServer, serverId: string, userId: string) {
  const cfgs = getBotConfigs(serverId);

  // Welcome bot
  const wCfg = cfgs.welcome;
  if (wCfg.enabled && wCfg.config.channel_id && wCfg.config.message) {
    const channel = db.prepare('SELECT id FROM channels WHERE id = ? AND server_id = ?').get(wCfg.config.channel_id, serverId);
    if (channel) {
      const user   = db.prepare('SELECT display_name, username FROM users WHERE id = ?').get(userId) as any;
      const server = db.prepare('SELECT name FROM servers WHERE id = ?').get(serverId) as any;
      const text = (wCfg.config.message as string)
        .replace(/\{user\}/g,     user?.display_name || 'there')
        .replace(/\{username\}/g, `@${user?.username || 'unknown'}`)
        .replace(/\{server\}/g,   server?.name || 'the server');
      sendBotMessage(io, wCfg.config.channel_id, text);
    }
  }

  // Auto-role bot
  const aCfg = cfgs.autorole;
  if (aCfg.enabled && aCfg.config.role_id) {
    try {
      db.prepare(
        'INSERT OR IGNORE INTO member_roles (role_id, user_id, server_id) VALUES (?, ?, ?)'
      ).run(aCfg.config.role_id, userId, serverId);
    } catch {}
  }
}

/** Called before a message is broadcast. Returns true if the message was deleted by auto-mod. */
export function checkAutoMod(serverId: string, messageId: string, content: string | null): boolean {
  if (!content) return false;
  const cfg = getBotConfigs(serverId);
  const modCfg = cfg.automod;
  if (!modCfg.enabled) return false;

  const words: string[] = modCfg.config.banned_words || [];
  const lower = content.toLowerCase();
  const matched = words.some(w => w && lower.includes(w.toLowerCase()));
  if (matched) {
    db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
    return true;
  }
  return false;
}
