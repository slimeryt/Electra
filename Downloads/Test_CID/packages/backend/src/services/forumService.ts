import db from '../db/connection';
import { httpError } from '../utils/httpError';

export const MAX_FORUM_TITLE_LENGTH = 256;
export const MAX_FORUM_BODY_LENGTH = 10000;
export const MAX_FORUM_POSTS_PAGE = 50;

export interface ForumPostRow {
  id: string;
  channel_id: string;
  author_id: string;
  title: string;
  body: string | null;
  created_at: number;
  updated_at: number;
}

function enrichPost(row: ForumPostRow) {
  const author = db.prepare(
    'SELECT id, username, display_name, avatar_url, is_bot FROM users WHERE id = ?',
  ).get(row.author_id);
  return { ...row, author };
}

export function assertForumChannel(channelId: string) {
  const ch = db.prepare('SELECT id, type FROM channels WHERE id = ?').get(channelId) as
    | { id: string; type: string }
    | undefined;
  if (!ch) throw httpError('Channel not found', 404, 'CHANNEL_NOT_FOUND');
  if (ch.type !== 'forum') throw httpError('Not a forum channel', 400, 'NOT_FORUM_CHANNEL');
  return ch;
}

export function assertMember(serverId: string, userId: string) {
  const m = db.prepare(
    'SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?',
  ).get(serverId, userId);
  if (!m) throw httpError('Forbidden', 403, 'FORBIDDEN');
}

export function listPosts(
  channelId: string,
  userId: string,
  before?: string,
  limit = 30,
): { posts: ReturnType<typeof enrichPost>[]; has_more: boolean } {
  assertForumChannel(channelId);
  const ch = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as {
    server_id: string;
  };
  assertMember(ch.server_id, userId);

  let query = `SELECT * FROM forum_posts WHERE channel_id = ?
    AND author_id NOT IN (
      SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'blocked'
    )`;
  const params: unknown[] = [channelId, userId];

  if (before != null && before !== '') {
    const ref = db
      .prepare('SELECT created_at FROM forum_posts WHERE id = ? AND channel_id = ?')
      .get(before, channelId) as { created_at: number } | undefined;
    if (!ref) throw httpError('Invalid cursor', 400, 'INVALID_CURSOR');
    query += ' AND created_at < ?';
    params.push(ref.created_at);
  }

  const pageSize = Math.min(Math.max(1, limit), MAX_FORUM_POSTS_PAGE);
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(pageSize + 1);

  const rows = db.prepare(query).all(...params) as ForumPostRow[];
  const has_more = rows.length > pageSize;
  const slice = has_more ? rows.slice(0, pageSize) : rows;
  const posts = slice.map(enrichPost).reverse();
  return { posts, has_more };
}

/** Post must belong to the given forum channel (404 if not). */
export function getPostInChannel(channelId: string, postId: string, userId: string) {
  assertForumChannel(channelId);
  const ch = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as {
    server_id: string;
  };
  assertMember(ch.server_id, userId);

  const row = db
    .prepare(
      `SELECT fp.* FROM forum_posts fp
       WHERE fp.id = ? AND fp.channel_id = ?
       AND fp.author_id NOT IN (
         SELECT addressee_id FROM friendships WHERE requester_id = ? AND status = 'blocked'
       )`,
    )
    .get(postId, channelId, userId) as ForumPostRow | undefined;
  if (!row) throw httpError('Post not found', 404, 'FORUM_POST_NOT_FOUND');
  return enrichPost(row);
}

export function createPost(channelId: string, userId: string, title: string, body?: string | null) {
  assertForumChannel(channelId);
  const ch = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as {
    server_id: string;
  };
  assertMember(ch.server_id, userId);

  const t = title.trim();
  if (!t) throw httpError('Title required', 400, 'TITLE_REQUIRED');
  if (t.length > MAX_FORUM_TITLE_LENGTH) {
    throw httpError(`Title must be at most ${MAX_FORUM_TITLE_LENGTH} characters`, 400, 'INPUT_TOO_LONG');
  }

  const b = body?.trim() || null;
  if (b && b.length > MAX_FORUM_BODY_LENGTH) {
    throw httpError(`Body must be at most ${MAX_FORUM_BODY_LENGTH} characters`, 400, 'INPUT_TOO_LONG');
  }

  return db.transaction(() => {
    const post = db
      .prepare(
        `INSERT INTO forum_posts (channel_id, author_id, title, body, created_at, updated_at)
         VALUES (?, ?, ?, ?, unixepoch(), unixepoch()) RETURNING *`,
      )
      .get(channelId, userId, t, b) as ForumPostRow;

    return enrichPost(post);
  })();
}

export function assertPostInChannel(postId: string, channelId: string) {
  const row = db.prepare('SELECT id FROM forum_posts WHERE id = ? AND channel_id = ?').get(postId, channelId);
  if (!row) throw httpError('Post not found in channel', 404, 'FORUM_POST_NOT_FOUND');
}

function isServerAdminOrOwner(channelId: string, userId: string): boolean {
  const row = db
    .prepare(
      `SELECT sm.role FROM server_members sm
       JOIN channels c ON c.server_id = sm.server_id
       WHERE c.id = ? AND sm.user_id = ?`,
    )
    .get(channelId, userId) as { role: string } | undefined;
  return row?.role === 'owner' || row?.role === 'admin';
}

export function updatePostInChannel(
  channelId: string,
  postId: string,
  userId: string,
  title?: string,
  body?: string | null,
) {
  const row = db
    .prepare('SELECT * FROM forum_posts WHERE id = ? AND channel_id = ?')
    .get(postId, channelId) as ForumPostRow | undefined;
  if (!row) throw httpError('Post not found', 404, 'FORUM_POST_NOT_FOUND');

  const ch = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as { server_id: string };
  assertMember(ch.server_id, userId);

  if (row.author_id !== userId && !isServerAdminOrOwner(channelId, userId)) {
    throw httpError('Forbidden', 403, 'FORBIDDEN');
  }

  const t = title !== undefined ? title.trim() : row.title;
  if (!t) throw httpError('Title required', 400, 'TITLE_REQUIRED');
  if (t.length > MAX_FORUM_TITLE_LENGTH) {
    throw httpError(`Title must be at most ${MAX_FORUM_TITLE_LENGTH} characters`, 400, 'INPUT_TOO_LONG');
  }

  let b = row.body;
  if (body !== undefined) {
    const trimmed = (body ?? '').trim();
    b = trimmed || null;
  }
  if (b && b.length > MAX_FORUM_BODY_LENGTH) {
    throw httpError(`Body must be at most ${MAX_FORUM_BODY_LENGTH} characters`, 400, 'INPUT_TOO_LONG');
  }

  const updated = db
    .prepare(
      'UPDATE forum_posts SET title = ?, body = ?, updated_at = unixepoch() WHERE id = ? RETURNING *',
    )
    .get(t, b, postId) as ForumPostRow;
  return enrichPost(updated);
}

export function deletePostInChannel(channelId: string, postId: string, userId: string) {
  const row = db
    .prepare('SELECT author_id FROM forum_posts WHERE id = ? AND channel_id = ?')
    .get(postId, channelId) as { author_id: string } | undefined;
  if (!row) throw httpError('Post not found', 404, 'FORUM_POST_NOT_FOUND');

  const ch = db.prepare('SELECT server_id FROM channels WHERE id = ?').get(channelId) as { server_id: string };
  assertMember(ch.server_id, userId);

  if (row.author_id !== userId && !isServerAdminOrOwner(channelId, userId)) {
    throw httpError('Forbidden', 403, 'FORBIDDEN');
  }

  db.prepare('DELETE FROM forum_posts WHERE id = ?').run(postId);
  return { ok: true };
}
