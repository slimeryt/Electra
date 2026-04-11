import db from '../db/connection';
import { httpError } from '../utils/httpError';
import { assertPostInChannel } from './forumService';

// One-time migration
try { db.exec('ALTER TABLE messages ADD COLUMN reply_to_id TEXT REFERENCES messages(id)'); } catch {}
try { db.exec('ALTER TABLE dm_messages ADD COLUMN reply_to_id TEXT REFERENCES dm_messages(id)'); } catch {}

interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string | null;
  type: string;
  edited_at: number | null;
  created_at: number;
  reply_to_id?: string | null;
  forum_post_id?: string | null;
}

function enrichMessage(msg: Message) {
  const author = db.prepare(
    'SELECT id, username, display_name, avatar_url, is_bot FROM users WHERE id = ?'
  ).get(msg.author_id);

  const attachments = db.prepare(`
    SELECT f.* FROM attachments a
    JOIN files f ON f.id = a.file_id
    WHERE a.message_id = ?
  `).all(msg.id);

  let reply_to = null;
  if (msg.reply_to_id) {
    const ref = db.prepare('SELECT * FROM messages WHERE id = ?').get(msg.reply_to_id) as Message | undefined;
    if (ref) {
      reply_to = {
        id: ref.id,
        content: ref.content,
        author: db.prepare('SELECT id, username, display_name, avatar_url, is_bot FROM users WHERE id = ?').get(ref.author_id),
      };
    }
  }

  return { ...msg, author, attachments, reply_to };
}

const MAX_MESSAGES_PAGE = 100;

export function getMessages(
  channelId: string,
  before?: string,
  limit = 50,
  forumPostId?: string | null,
  viewerUserId?: string | null,
) {
  const pageSize = Math.min(Math.max(1, limit), MAX_MESSAGES_PAGE);

  let query = `
    SELECT m.* FROM messages m
    WHERE m.channel_id = ?
  `;
  const params: unknown[] = [channelId];

  if (forumPostId != null && forumPostId !== '') {
    query += ' AND m.forum_post_id = ?';
    params.push(forumPostId);
  } else {
    query += ' AND m.forum_post_id IS NULL';
  }

  if (viewerUserId) {
    query += ` AND (m.author_id IS NULL OR m.author_id NOT IN (
      SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'blocked'
    ))`;
    params.push(viewerUserId);
  }

  if (before != null && before !== '') {
    const ref = db
      .prepare('SELECT created_at, channel_id, forum_post_id FROM messages WHERE id = ?')
      .get(before) as { created_at: number; channel_id: string; forum_post_id: string | null } | undefined;
    if (!ref) throw httpError('Invalid cursor', 400, 'INVALID_CURSOR');
    if (ref.channel_id !== channelId) throw httpError('Invalid cursor', 400, 'INVALID_CURSOR');
    const expectedFp = forumPostId != null && forumPostId !== '' ? forumPostId : null;
    const refFp = ref.forum_post_id ?? null;
    if (refFp !== expectedFp) throw httpError('Invalid cursor', 400, 'INVALID_CURSOR');
    query += ' AND m.created_at < ?';
    params.push(ref.created_at);
  }

  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(pageSize);

  const messages = db.prepare(query).all(...params) as Message[];
  return messages.map(enrichMessage).reverse();
}

export function createMessage(
  channelId: string,
  authorId: string,
  content: string | undefined,
  fileIds: string[],
  replyToId?: string,
  forumPostId?: string | null,
) {
  const ch = db.prepare('SELECT type FROM channels WHERE id = ?').get(channelId) as { type: string } | undefined;
  if (!ch) throw httpError('Channel not found', 404, 'CHANNEL_NOT_FOUND');
  if (ch.type === 'forum') {
    if (!forumPostId) {
      throw httpError('forum_post_id required for forum channels', 400, 'FORUM_POST_ID_REQUIRED');
    }
    assertPostInChannel(forumPostId, channelId);
  } else if (forumPostId) {
    throw httpError('forum_post_id is only valid for forum channels', 400, 'FORUM_POST_INVALID');
  }

  return db.transaction(() => {
    const msg = db.prepare(
      'INSERT INTO messages (channel_id, author_id, content, type, reply_to_id, forum_post_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
    ).get(
      channelId,
      authorId,
      content || null,
      fileIds.length > 0 ? 'file' : 'text',
      replyToId || null,
      forumPostId || null,
    ) as Message;

    for (const fileId of fileIds) {
      db.prepare('INSERT INTO attachments (message_id, file_id) VALUES (?, ?)').run(msg.id, fileId);
    }

    return enrichMessage(msg);
  })();
}

export function updateMessage(messageId: string, userId: string, content: string) {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as Message | undefined;
  if (!msg) throw httpError('Message not found', 404, 'MESSAGE_NOT_FOUND');
  if (msg.author_id !== userId) throw httpError('Forbidden', 403, 'FORBIDDEN');

  const updated = db.prepare(
    'UPDATE messages SET content = ?, edited_at = unixepoch() WHERE id = ? RETURNING *'
  ).get(content, messageId) as Message;

  return enrichMessage(updated);
}

export function deleteMessage(messageId: string, userId: string) {
  const msg = db.prepare(
    'SELECT m.*, c.server_id FROM messages m JOIN channels c ON c.id = m.channel_id WHERE m.id = ?'
  ).get(messageId) as (Message & { server_id: string }) | undefined;

  if (!msg) throw httpError('Message not found', 404, 'MESSAGE_NOT_FOUND');

  // Allow author or server admin/owner to delete
  if (msg.author_id !== userId) {
    const member = db.prepare(
      'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
    ).get(msg.server_id, userId) as { role: string } | undefined;

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw httpError('Forbidden', 403, 'FORBIDDEN');
    }
  }

  db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
}
