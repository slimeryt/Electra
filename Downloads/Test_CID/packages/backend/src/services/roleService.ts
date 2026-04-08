import db from '../db/connection';

// ─── Permission bitmask ───────────────────────────────────────────────────────
export const Permissions = {
  SEND_MESSAGES:    1 << 0,   // 1
  ATTACH_FILES:     1 << 1,   // 2
  MANAGE_MESSAGES:  1 << 2,   // 4
  MENTION_EVERYONE: 1 << 3,   // 8
  VIEW_CHANNELS:    1 << 4,   // 16
  MANAGE_CHANNELS:  1 << 5,   // 32
  MANAGE_ROLES:     1 << 6,   // 64
  KICK_MEMBERS:     1 << 7,   // 128
  BAN_MEMBERS:      1 << 8,   // 256
  MANAGE_SERVER:    1 << 9,   // 512
  ADMINISTRATOR:    1 << 30,  // 1073741824
} as const;

export const DEFAULT_PERMISSIONS = Permissions.SEND_MESSAGES | Permissions.ATTACH_FILES | Permissions.VIEW_CHANNELS; // 19

interface Role {
  id: string;
  server_id: string;
  name: string;
  color: string;
  position: number;
  permissions: number;
  hoist: number;
  is_default: number;
  created_at: number;
}

function requireAdminOrOwner(serverId: string, userId: string) {
  const member = db.prepare(
    'SELECT role FROM server_members WHERE server_id = ? AND user_id = ?'
  ).get(serverId, userId) as { role: string } | undefined;
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  }
}

// Creates default roles for a newly created server
export function createDefaultRoles(serverId: string) {
  db.prepare(
    `INSERT INTO server_roles (server_id, name, color, position, permissions, is_default)
     VALUES (?, '@everyone', '#99aab5', 0, ?, 1)`
  ).run(serverId, DEFAULT_PERMISSIONS);
}

export function getRoles(serverId: string) {
  return db.prepare(
    'SELECT * FROM server_roles WHERE server_id = ? ORDER BY position DESC'
  ).all(serverId) as Role[];
}

export function getRole(roleId: string) {
  return db.prepare('SELECT * FROM server_roles WHERE id = ?').get(roleId) as Role | undefined;
}

export function createRole(serverId: string, userId: string, data: { name: string; color?: string; permissions?: number }) {
  requireAdminOrOwner(serverId, userId);
  const maxPos = (db.prepare('SELECT MAX(position) as m FROM server_roles WHERE server_id = ?').get(serverId) as any)?.m ?? 0;
  return db.prepare(
    `INSERT INTO server_roles (server_id, name, color, position, permissions)
     VALUES (?, ?, ?, ?, ?) RETURNING *`
  ).get(serverId, data.name, data.color || '#99aab5', maxPos + 1, data.permissions ?? 0) as Role;
}

export function updateRole(roleId: string, userId: string, data: Partial<{ name: string; color: string; permissions: number; hoist: boolean; position: number }>) {
  const role = db.prepare('SELECT * FROM server_roles WHERE id = ?').get(roleId) as Role | undefined;
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
  requireAdminOrOwner(role.server_id, userId);

  const fields: string[] = [];
  const vals: any[] = [];
  if (data.name !== undefined)        { fields.push('name = ?');        vals.push(data.name); }
  if (data.color !== undefined)       { fields.push('color = ?');       vals.push(data.color); }
  if (data.permissions !== undefined) { fields.push('permissions = ?'); vals.push(data.permissions); }
  if (data.hoist !== undefined)       { fields.push('hoist = ?');       vals.push(data.hoist ? 1 : 0); }
  if (data.position !== undefined)    { fields.push('position = ?');    vals.push(data.position); }

  if (!fields.length) return role;
  vals.push(roleId);
  db.prepare(`UPDATE server_roles SET ${fields.join(', ')} WHERE id = ?`).run(...vals);
  return db.prepare('SELECT * FROM server_roles WHERE id = ?').get(roleId) as Role;
}

export function deleteRole(roleId: string, userId: string) {
  const role = db.prepare('SELECT * FROM server_roles WHERE id = ?').get(roleId) as Role | undefined;
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
  if (role.is_default) throw Object.assign(new Error('Cannot delete default role'), { status: 400 });
  requireAdminOrOwner(role.server_id, userId);
  db.prepare('DELETE FROM server_roles WHERE id = ?').run(roleId);
  return { ok: true };
}

// Assign/remove role from member
export function assignRole(serverId: string, roleId: string, targetUserId: string, requesterId: string) {
  requireAdminOrOwner(serverId, requesterId);
  const role = db.prepare('SELECT id FROM server_roles WHERE id = ? AND server_id = ?').get(roleId, serverId);
  if (!role) throw Object.assign(new Error('Role not found'), { status: 404 });
  try {
    db.prepare('INSERT INTO member_roles (role_id, user_id, server_id) VALUES (?, ?, ?)').run(roleId, targetUserId, serverId);
  } catch { /* already assigned */ }
  return { ok: true };
}

export function removeRole(serverId: string, roleId: string, targetUserId: string, requesterId: string) {
  requireAdminOrOwner(serverId, requesterId);
  db.prepare('DELETE FROM member_roles WHERE role_id = ? AND user_id = ? AND server_id = ?').run(roleId, targetUserId, serverId);
  return { ok: true };
}

// Get all role assignments for a server (for enriching member list)
export function getMemberRoles(serverId: string): Map<string, Role[]> {
  const rows = db.prepare(`
    SELECT mr.user_id, sr.*
    FROM member_roles mr
    JOIN server_roles sr ON sr.id = mr.role_id
    WHERE mr.server_id = ?
    ORDER BY sr.position DESC
  `).all(serverId) as (Role & { user_id: string })[];

  const map = new Map<string, Role[]>();
  for (const row of rows) {
    const { user_id, ...role } = row;
    if (!map.has(user_id)) map.set(user_id, []);
    map.get(user_id)!.push(role);
  }
  return map;
}

// Get roles for a single member
export function getUserRoles(serverId: string, userId: string): Role[] {
  return db.prepare(`
    SELECT sr.* FROM member_roles mr
    JOIN server_roles sr ON sr.id = mr.role_id
    WHERE mr.server_id = ? AND mr.user_id = ?
    ORDER BY sr.position DESC
  `).all(serverId, userId) as Role[];
}
