import db from '../db/connection';
import { httpError } from '../utils/httpError';

function assertChannelMember(channelId: string, userId: string) {
  const row = db
    .prepare(
      `SELECT 1 FROM channels c
       JOIN server_members sm ON sm.server_id = c.server_id AND sm.user_id = ?
       WHERE c.id = ?`,
    )
    .get(userId, channelId);
  if (!row) throw httpError('Forbidden', 403, 'FORBIDDEN');
}

/** Upsert last-read timestamp for a channel (text / forum / announcement). */
export function markChannelRead(channelId: string, userId: string) {
  assertChannelMember(channelId, userId);
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    `INSERT INTO channel_read_state (user_id, channel_id, last_read_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, channel_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  ).run(userId, channelId, now);
  return { ok: true, last_read_at: now };
}
