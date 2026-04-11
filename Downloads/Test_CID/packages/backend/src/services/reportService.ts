import db from '../db/connection';
import { httpError } from '../utils/httpError';

const MAX_REASON = 500;

export function reportChannelMessage(
  reporterId: string,
  channelId: string,
  messageId: string,
  reason?: string | null,
) {
  const msg = db
    .prepare('SELECT id, channel_id, author_id FROM messages WHERE id = ?')
    .get(messageId) as { id: string; channel_id: string; author_id: string | null } | undefined;
  if (!msg) throw httpError('Message not found', 404, 'MESSAGE_NOT_FOUND');
  if (msg.channel_id !== channelId) throw httpError('Message not in channel', 400, 'INVALID_CHANNEL');

  const member = db
    .prepare(
      `SELECT 1 FROM channels c
       JOIN server_members sm ON sm.server_id = c.server_id AND sm.user_id = ?
       WHERE c.id = ?`,
    )
    .get(reporterId, channelId);
  if (!member) throw httpError('Forbidden', 403, 'FORBIDDEN');

  if (msg.author_id === reporterId) throw httpError('Cannot report own message', 400, 'INVALID_REPORT');

  const r = (reason || '').trim().slice(0, MAX_REASON);
  const row = db
    .prepare(
      `INSERT INTO message_reports (reporter_id, message_id, channel_id, reason, created_at)
       VALUES (?, ?, ?, ?, unixepoch()) RETURNING id`,
    )
    .get(reporterId, messageId, channelId, r || null) as { id: string };

  return { ok: true, id: row.id };
}
