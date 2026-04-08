import db from '../db/connection';
import { createDefaultRoles, getMemberRoles } from './roleService';

interface Server {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
  created_at: number;
}

export function getUserServers(userId: string) {
  return db.prepare(`
    SELECT s.*, sm.role,
      (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
    FROM servers s
    JOIN server_members sm ON sm.server_id = s.id AND sm.user_id = ?
    ORDER BY s.created_at ASC
  `).all(userId);
}

export function getServer(serverId: string, userId: string) {
  const server = db.prepare(`
    SELECT s.*, sm.role FROM servers s
    JOIN server_members sm ON sm.server_id = s.id AND sm.user_id = ?
    WHERE s.id = ?
  `).get(userId, serverId);
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 });
  return server;
}

export function createServer(name: string, description: string | undefined, ownerId: string) {
  const server = db.transaction(() => {
    const s = db.prepare(
      'INSERT INTO servers (name, description, owner_id) VALUES (?, ?, ?) RETURNING *'
    ).get(name, description || null, ownerId) as Server;

    db.prepare(
      "INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, 'owner')"
    ).run(s.id, ownerId);

    // Create default channels
    db.prepare(
      "INSERT INTO channels (server_id, name, type, category, position) VALUES (?, 'general', 'text', 'Text Channels', 0)"
    ).run(s.id);
    db.prepare(
      "INSERT INTO channels (server_id, name, type, category, position) VALUES (?, 'General', 'voice', 'Voice Channels', 1)"
    ).run(s.id);

    // Create default @everyone role
    createDefaultRoles(s.id);

    return s;
  })();
  return server;
}

export function getPublicServers(search?: string) {
  const base = `
    SELECT s.id, s.name, s.description, s.icon_url, s.invite_code, s.owner_id,
      (SELECT COUNT(*) FROM server_members WHERE server_id = s.id) as member_count
    FROM servers s
    WHERE s.is_public = 1
  `;
  if (search) {
    return db.prepare(base + " AND (s.name LIKE ? OR s.description LIKE ?) ORDER BY member_count DESC LIMIT 100")
      .all(`%${search}%`, `%${search}%`);
  }
  return db.prepare(base + ' ORDER BY member_count DESC LIMIT 100').all();
}

export function updateServer(serverId: string, userId: string, updates: Partial<{ name: string; description: string; icon_url: string; is_public: number }>) {
  const member = db.prepare(
    "SELECT role FROM server_members WHERE server_id = ? AND user_id = ?"
  ).get(serverId, userId) as { role: string } | undefined;

  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  // Coerce booleans to integers for SQLite compatibility
  const coerced: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    coerced[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }

  const fields = Object.entries(coerced)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`).join(', ');
  const values = Object.values(coerced).filter(v => v !== undefined);

  if (fields.length === 0) return db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);

  return db.prepare(`UPDATE servers SET ${fields} WHERE id = ? RETURNING *`)
    .get(...values, serverId);
}

export function deleteServer(serverId: string, userId: string) {
  const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId) as Server | undefined;
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 });
  if (server.owner_id !== userId) throw Object.assign(new Error('Only owner can delete server'), { status: 403 });
  db.prepare('DELETE FROM servers WHERE id = ?').run(serverId);
}

export function getServerMembers(serverId: string) {
  const members = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.status, sm.role, sm.joined_at
    FROM server_members sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.server_id = ?
    ORDER BY sm.joined_at ASC
  `).all(serverId) as any[];

  const rolesByUser = getMemberRoles(serverId);
  return members.map(m => ({
    ...m,
    roles: rolesByUser.get(m.id) ?? [],
  }));
}

export function joinServer(inviteCode: string, userId: string) {
  const server = db.prepare('SELECT * FROM servers WHERE invite_code = ?').get(inviteCode) as Server | undefined;
  if (!server) throw Object.assign(new Error('Invalid invite code'), { status: 404 });

  const existing = db.prepare(
    'SELECT 1 FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(server.id, userId);
  if (existing) throw Object.assign(new Error('Already a member'), { status: 409 });

  db.prepare(
    "INSERT INTO server_members (server_id, user_id, role) VALUES (?, ?, 'member')"
  ).run(server.id, userId);

  return server;
}

export function leaveServer(serverId: string, userId: string) {
  const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId) as Server | undefined;
  if (!server) throw Object.assign(new Error('Server not found'), { status: 404 });
  if (server.owner_id === userId) throw Object.assign(new Error('Owner cannot leave server'), { status: 400 });
  db.prepare('DELETE FROM server_members WHERE server_id = ? AND user_id = ?').run(serverId, userId);
}

export function kickMember(serverId: string, targetUserId: string, requesterId: string) {
  const requester = db.prepare(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(serverId, requesterId) as { role: string } | undefined;

  if (!requester || (requester.role !== 'owner' && requester.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }

  const server = db.prepare('SELECT owner_id FROM servers WHERE id = ?').get(serverId) as Server | undefined;
  if (server?.owner_id === targetUserId) throw Object.assign(new Error('Cannot kick owner'), { status: 400 });

  db.prepare('DELETE FROM server_members WHERE server_id = ? AND user_id = ?').run(serverId, targetUserId);
}
