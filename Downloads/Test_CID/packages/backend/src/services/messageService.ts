import db from '../db/connection';

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

export function getMessages(channelId: string, before?: string, limit = 50) {
  let query = `
    SELECT m.* FROM messages m
    WHERE m.channel_id = ?
  `;
  const params: unknown[] = [channelId];

  if (before) {
    const ref = db.prepare('SELECT created_at FROM messages WHERE id = ?').get(before) as { created_at: number } | undefined;
    if (ref) {
      query += ' AND m.created_at < ?';
      params.push(ref.created_at);
    }
  }

  query += ' ORDER BY m.created_at DESC LIMIT ?';
  params.push(Math.min(limit, 100));

  const messages = db.prepare(query).all(...params) as Message[];
  return messages.map(enrichMessage).reverse();
}

export function createMessage(channelId: string, authorId: string, content: string | undefined, fileIds: string[], replyToId?: string) {
  return db.transaction(() => {
    const msg = db.prepare(
      'INSERT INTO messages (channel_id, author_id, content, type, reply_to_id) VALUES (?, ?, ?, ?, ?) RETURNING *'
    ).get(channelId, authorId, content || null, fileIds.length > 0 ? 'file' : 'text', replyToId || null) as Message;

    for (const fileId of fileIds) {
      db.prepare('INSERT INTO attachments (message_id, file_id) VALUES (?, ?)').run(msg.id, fileId);
    }

    return enrichMessage(msg);
  })();
}

export function updateMessage(messageId: string, userId: string, content: string) {
  const msg = db.prepare('SELECT * FROM messages WHERE id = ?').get(messageId) as Message | undefined;
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
  if (msg.author_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });

  const updated = db.prepare(
    'UPDATE messages SET content = ?, edited_at = unixepoch() WHERE id = ? RETURNING *'
  ).get(content, messageId) as Message;

  return enrichMessage(updated);
}

export function deleteMessage(messageId: string, userId: string) {
  const msg = db.prepare(
    'SELECT m.*, c.server_id FROM messages m JOIN channels c ON c.id = m.channel_id WHERE m.id = ?'
  ).get(messageId) as (Message & { server_id: string }) | undefined;

  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });

  // Allow author or server admin/owner to delete
  if (msg.author_id !== userId) {
    const member = db.prepare(
      'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
    ).get(msg.server_id, userId) as { role: string } | undefined;

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
  }

  db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
}
