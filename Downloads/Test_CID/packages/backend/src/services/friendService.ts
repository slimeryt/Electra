import db from '../db/connection';

interface FriendRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: number;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
}

function enrichFriendship(row: FriendRow & UserRow, selfId: string) {
  return {
    id: row.id,
    status: row.status,
    created_at: row.created_at,
    direction: row.requester_id === selfId ? 'outgoing' : 'incoming',
    user: {
      id: row.id.length > 32 ? (row.requester_id === selfId ? row.addressee_id : row.requester_id) : row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      status: row.status,
    },
  };
}

export function getFriends(userId: string) {
  // Accepted friends
  return db.prepare(`
    SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
      u.id as uid, u.username, u.display_name, u.avatar_url, u.status as user_status
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'accepted'
    ORDER BY u.display_name ASC
  `).all(userId, userId, userId).map((r: any) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    direction: 'accepted',
    user: { id: r.uid, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, status: r.user_status },
  }));
}

export function getPendingRequests(userId: string) {
  return db.prepare(`
    SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
      u.id as uid, u.username, u.display_name, u.avatar_url, u.status as user_status
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
    WHERE (f.requester_id = ? OR f.addressee_id = ?) AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(userId, userId, userId).map((r: any) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    direction: r.requester_id === userId ? 'outgoing' : 'incoming',
    user: { id: r.uid, username: r.username, display_name: r.display_name, avatar_url: r.avatar_url, status: r.user_status },
  }));
}

export function sendRequest(requesterId: string, targetUsername: string) {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(targetUsername) as UserRow | undefined;
  if (!target) throw Object.assign(new Error('User not found'), { status: 404 });
  if (target.id === requesterId) throw Object.assign(new Error('Cannot friend yourself'), { status: 400 });

  // Check for existing friendship
  const existing = db.prepare(
    'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)'
  ).get(requesterId, target.id, target.id, requesterId) as FriendRow | undefined;

  if (existing) {
    if (existing.status === 'accepted') throw Object.assign(new Error('Already friends'), { status: 409 });
    if (existing.status === 'pending') {
      if (existing.requester_id === requesterId) throw Object.assign(new Error('Request already sent'), { status: 409 });
      // They sent us one — auto-accept
      db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(existing.id);
      return { ...existing, status: 'accepted', auto_accepted: true };
    }
    if (existing.status === 'blocked') throw Object.assign(new Error('Cannot send request'), { status: 403 });
  }

  const row = db.prepare(
    "INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending') RETURNING *"
  ).get(requesterId, target.id) as FriendRow;

  return { ...row, target_id: target.id };
}

export function acceptRequest(userId: string, friendshipId: string) {
  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId) as FriendRow | undefined;
  if (!friendship) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (friendship.addressee_id !== userId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (friendship.status !== 'pending') throw Object.assign(new Error('Request not pending'), { status: 400 });

  db.prepare("UPDATE friendships SET status = 'accepted' WHERE id = ?").run(friendshipId);
  return { ok: true, requester_id: friendship.requester_id };
}

export function declineRequest(userId: string, friendshipId: string) {
  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId) as FriendRow | undefined;
  if (!friendship) throw Object.assign(new Error('Request not found'), { status: 404 });
  if (friendship.addressee_id !== userId && friendship.requester_id !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
  db.prepare('DELETE FROM friendships WHERE id = ?').run(friendshipId);
  return { ok: true };
}

export function removeFriend(userId: string, targetUserId: string) {
  db.prepare(
    'DELETE FROM friendships WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)) AND status = \'accepted\''
  ).run(userId, targetUserId, targetUserId, userId);
  return { ok: true };
}

/** User IDs you have blocked (you are requester, they are addressee). */
export function getBlockedTargetIds(userId: string): string[] {
  const rows = db
    .prepare(
      `SELECT addressee_id AS id FROM friendships WHERE requester_id = ? AND status = 'blocked'`,
    )
    .all(userId) as { id: string }[];
  return rows.map((r) => r.id);
}

export function getBlockedUsers(userId: string) {
  return db
    .prepare(
      `SELECT u.id, u.username, u.display_name, u.avatar_url, u.status
       FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = ? AND f.status = 'blocked'
       ORDER BY u.display_name ASC`,
    )
    .all(userId);
}

export function blockUser(userId: string, targetUserId: string) {
  const existing = db.prepare(
    'SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)'
  ).get(userId, targetUserId, targetUserId, userId) as FriendRow | undefined;

  if (existing) {
    db.prepare("UPDATE friendships SET status = 'blocked', requester_id = ?, addressee_id = ? WHERE id = ?")
      .run(userId, targetUserId, existing.id);
  } else {
    db.prepare("INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'blocked')")
      .run(userId, targetUserId);
  }
  return { ok: true };
}
